/**
 * POST /api/redeem
 * Body: { code: "XXXX-XXXX-XXXX-XXXX" }
 *
 * Env (Vercel):
 *  SUPABASE_URL
 *  SUPABASE_SERVICE_ROLE_KEY   (server-only)
 *
 * Behavior:
 *  - Validates code exists and is unused
 *  - Atomically marks as used (used=true, used_at=now)
 *  - Returns {ok:true} on success
 *  - Returns {ok:false, error:"..."} on failure
 */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalize(s) {
  return String(s ?? "").replace(/\u00A0/g, " ").trim().toUpperCase();
}

export default async function handler(req, res) {
  // CORS (optional)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "Method not allowed" });

  if (!SB_URL || !SB_KEY) {
    return res.status(500).json({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const code = normalize(body.code || body.license_code || body.licenseCode);
  if (!code) return res.status(400).json({ ok: false, error: "Missing code" });

  // Fetch row
  const selectRes = await fetch(`${SB_URL}/rest/v1/license_codes?code=eq.${encodeURIComponent(code)}&select=code,used`, {
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
    },
  });

  if (!selectRes.ok) {
    const txt = await selectRes.text().catch(() => "");
    return res.status(500).json({ ok: false, error: "Supabase select failed", details: txt });
  }

  const rows = await selectRes.json().catch(() => []);
  if (!rows || rows.length === 0) return res.status(401).json({ ok: false, error: "Invalid code" });
  if (rows[0].used) return res.status(409).json({ ok: false, error: "Code already used" });

  // Atomic update: update only if used=false
  const patchRes = await fetch(`${SB_URL}/rest/v1/license_codes?code=eq.${encodeURIComponent(code)}&used=is.false`, {
    method: "PATCH",
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      used: true,
      used_at: new Date().toISOString(),
      used_by: normalize(body.used_by || ""), // optional (email/order id); empty ok
    }),
  });

  if (!patchRes.ok) {
    const txt = await patchRes.text().catch(() => "");
    return res.status(500).json({ ok: false, error: "Supabase update failed", details: txt });
  }

  const updated = await patchRes.json().catch(() => []);
  if (!updated || updated.length === 0) {
    // Means someone used it between select and update
    return res.status(409).json({ ok: false, error: "Code already used" });
  }

  return res.status(200).json({ ok: true });
}
