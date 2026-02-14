/**
 * POST /api/seed
 * Body: { secret: "...", codes: ["XXXX-....", ...] }
 *
 * Requires env:
 *  - KV_REST_API_URL
 *  - KV_REST_API_TOKEN
 *  - SEED_SECRET
 *
 * Stores each code as key `code:<CODE>` with value "0" (unused).
 * Uses SET NX so re-seeding is safe.
 */
import { upstash, normalize } from "./_kv.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  const expected = (process.env.SEED_SECRET || "").trim();
  if (!expected) return res.status(500).json({ ok: false, error: "Missing SEED_SECRET" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  if (String(body.secret || "") !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  const codes = Array.isArray(body.codes) ? body.codes : [];
  if (codes.length === 0) return res.status(400).json({ ok: false, error: "No codes provided" });

  // Pipeline SET NX in batches (caller should batch to ~500)
  const commands = codes.map(c => {
    const code = normalize(c);
    return ["SET", `code:${code}`, "0", "NX"];
  });

  try {
    const out = await upstash("/pipeline", commands);
    return res.status(200).json({ ok: true, count: codes.length, result: out?.result?.length ?? null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message, details: e.details || null });
  }
}
