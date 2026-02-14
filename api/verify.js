/**
 * Vercel Serverless Function
 * POST /api/verify
 * Body: { "license_key": "XXXX-...." }
 *
 * Env required:
 *   PRODUCT_SECRET_KEY = Payhip Product Secret Key
 */

export default async function handler(req, res) {
  // CORS (valgfritt, men greit)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const secret = process.env.PRODUCT_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ ok: false, error: "Missing PRODUCT_SECRET_KEY env var" });
  }

  // Body kan komme som object eller string avhengig av runtime
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  body = body || {};

  // Godta flere felt-navn (så frontend mismatch ikke knekker alt)
  const licenseKeyRaw =
    body.license_key ||
    body.licenseKey ||
    body.key ||
    body.code ||
    "";

  const license_key = String(licenseKeyRaw).replace(/\u00A0/g, " ").trim();

  if (!license_key) {
    return res.status(400).json({ ok: false, error: "Missing license key in request body" });
  }

  try {
    // Payhip Public API v2 - license verification
    // NB: Endepunktet kan variere litt etter Payhip-oppsett, men dette er den som ofte brukes i slike repos.
    const payhipRes = await fetch("https://payhip.com/api/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_secret: secret,
        license_key,
      }),
    });

    const data = await payhipRes.json().catch(() => ({}));

    // Payhip svar varierer, så vi tolker litt defensivt:
    // - Noen svarer { success: true, ... }
    // - Andre kan ha { valid: true, ... }
    // - Eller { error: "..."}
    const valid = Boolean(data.success || data.valid || data.verified);

    if (!payhipRes.ok || !valid) {
      const errMsg =
        data.error ||
        data.message ||
        "License verification failed";
      return res.status(401).json({ ok: false, error: errMsg, payhip: data });
    }

    return res.status(200).json({ ok: true, payhip: data });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error verifying license",
      details: String(e?.message || e),
    });
  }
}
