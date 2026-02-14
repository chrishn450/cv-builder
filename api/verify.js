export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const productSecret = (process.env.PRODUCT_SECRET_KEY || "").trim();
  if (!productSecret) {
    return res.status(500).json({ ok: false, error: "Missing PRODUCT_SECRET_KEY" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const license_key = String(body.license_key || body.licenseKey || "").trim();
  if (!license_key) {
    return res.status(400).json({ ok: false, error: "Missing license_key" });
  }

  try {
    const url = new URL("https://payhip.com/api/v2/license/verify");
    url.searchParams.set("license_key", license_key);

    const payhipRes = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "product-secret-key": productSecret,
      },
    });

    const rawText = await payhipRes.text();
    let data = null;
    try { data = rawText ? JSON.parse(rawText) : null; } catch {}

    if (!payhipRes.ok) {
      return res.status(401).json({
        ok: false,
        error: data?.error || "Payhip rejected request",
        payhip_status: payhipRes.status,
        rawText
      });
    }

    const enabled = data?.data?.enabled ?? data?.enabled;
    if (!enabled) {
      return res.status(401).json({
        ok: false,
        error: "License not enabled",
        payhip_status: payhipRes.status,
        rawText
      });
    }

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Server error", details: String(e) });
  }
}
