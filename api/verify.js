/**
 * Vercel Serverless Function
 * POST /api/verify
 * Body: { "license_key": "XXXX-...." }
 *
 * Env required on Vercel:
 *   PRODUCT_SECRET_KEY = Payhip Product Secret Key
 */

export default async function handler(req, res) {
  // (Valgfritt) CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const productSecret = process.env.PRODUCT_SECRET_KEY;
  if (!productSecret) {
    return res.status(500).json({ ok: false, error: "Missing PRODUCT_SECRET_KEY env var" });
  }

  // Parse body (kan være object eller string)
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const license_key =
    String(body.license_key || body.licenseKey || body.key || body.code || "")
      .replace(/\u00A0/g, " ")
      .trim();

  if (!license_key) {
    return res.status(400).json({ ok: false, error: "Missing license_key" });
  }

  try {
    // Payhip v2: GET /api/v2/license/verify?license_key=...
    const url = new URL("https://payhip.com/api/v2/license/verify");
    url.searchParams.set("license_key", license_key);

    const payhipRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "product-secret-key": productSecret,
      },
    });

    const data = await payhipRes.json().catch(() => null);

    // Payhip doc: suksess -> { data: { enabled: true/false, ... } }
    const ok = Boolean(data && data.data && typeof data.data.enabled === "boolean");

    if (!payhipRes.ok || !ok) {
      return res.status(401).json({
        ok: false,
        error: data?.error || data?.message || "License verification failed",
        payhip_status: payhipRes.status,
      });
    }

    // NB: Om du vil kreve at lisensen er aktiv:
    if (data.data.enabled !== true) {
      return res.status(401).json({ ok: false, error: "License key is disabled" });
    }

    return res.status(200).json({ ok: true, data: data.data });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error verifying license",
      details: String(e?.message || e),
    });
  }
}
