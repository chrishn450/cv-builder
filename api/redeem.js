import { upstash, normalize } from "./_kv.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ ok: false, error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const code = normalize(body.code);
  if (!code)
    return res.status(400]json({ ok: false, error: "Missing code" });

  const key = `code:${code}`;

  try {
    // Check if code exists
    const exists = await upstash("/get", [key]);

    if (!exists?.result) {
      return res.status(401).json({ ok: false, error: "Invalid code" });
    }

    if (exists.result === "1") {
      return res.status(409).json({ ok: false, error: "Code already used" });
    }

    // Mark as used
    await upstash("/set", [key, "1"]);

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: e.message,
      details: e.details || null,
    });
  }
}
