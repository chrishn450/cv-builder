/**
 * POST /api/redeem
 * Body: { code: "XXXX-XXXX-XXXX-XXXX" }
 *
 * Requires env:
 *  - KV_REST_API_URL
 *  - KV_REST_API_TOKEN
 *
 * Keys:
 *  - code:<CODE> = "0" unused, "1" used
 *
 * Atomic redeem via Lua EVAL:
 *  - return  1 if redeemed now
 *  - return  0 if already used
 *  - return -1 if invalid (not found)
 */
import { upstash, normalize } from "./_kv.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const code = normalize(body.code || body.license_code || body.licenseCode);
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  const key = `code:${code}`;
  const script = [
    "local v = redis.call('GET', KEYS[1])",
    "if not v then return -1 end",
    "if v == '1' then return 0 end",
    "redis.call('SET', KEYS[1], '1')",
    "return 1"
  ].join("\n");

  try {
    const out = await upstash("/eval", { script, keys: [key], args: [] });
    const r = out?.result;
    if (r === 1) return res.status(200).json({ ok: true });
    if (r === 0) return res.status(409).json({ ok: false, error: "Code already used" });
    return res.status(401).json({ ok: false, error: "Invalid code" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, details: e.details || null });
  }
}
