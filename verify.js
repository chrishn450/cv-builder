/**
 * Vercel Serverless Function
 * Verifies a Payhip license key using Payhip Public API v2.
 *
 * Env var required on Vercel:
 *   PRODUCT_SECRET_KEY = your Payhip product secret key
 *
 * Client calls:
 *   POST /api/verify  { "license_key": "XXXX-...." }
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ ok:false, error:'Method not allowed' });
      return;
    }

    const secret = process.env.PRODUCT_SECRET_KEY;
    if (!secret) {
      res.status(500).json({ ok:false, error:'Missing PRODUCT_SECRET_KEY env var' });
      return;
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const licenseKey = (body.license_key || '').toString().trim();
    if (!licenseKey) {
      res.status(400).json({ ok:false, error:'Missing license_key' });
      return;
    }

    const url = `https://payhip.com/api/v2/license/verify?license_key=${encodeURIComponent(licenseKey)}`;
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'product-secret-key': secret,
        'accept': 'application/json'
      }
    });

    const data = await resp.json().catch(() => ({}));

    // Payhip returns fields like: valid, disabled, usage, etc. Shape may evolve.
    if (!resp.ok) {
      res.status(resp.status).json({ ok:false, error:'Payhip API error', details:data });
      return;
    }

    const valid = Boolean(data?.valid ?? data?.is_valid ?? data?.success);
    const disabled = Boolean(data?.disabled);

    res.status(200).json({
      ok: true,
      valid,
      disabled,
      data
    });
  } catch (e) {
    res.status(500).json({ ok:false, error:'Server error', message: e?.message || String(e) });
  }
}
