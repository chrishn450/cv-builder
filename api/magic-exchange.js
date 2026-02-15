import { json, readJsonBody, sha256Hex, env, supabaseFetch, setCookie, signJwtHS256, nowIso } from "./_utils.js";

export default async function handler(req, res){
  try{
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { token } = await readJsonBody(req);
    if (!token || typeof token !== "string") return json(res, 400, { error: "Missing token" });

    const tokenHash = sha256Hex(token);

    // Find magic link
    const rows = await supabaseFetch(`/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,customer_email,expires_at,used_at`, { method: "GET" });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return json(res, 400, { error: "Invalid token" });
    if (row.used_at) return json(res, 400, { error: "Token already used" });

    const exp = new Date(row.expires_at).getTime();
    if (Number.isFinite(exp) && Date.now() > exp) return json(res, 400, { error: "Token expired" });

    const email = String(row.customer_email||"").toLowerCase();

    // Ensure customer has access
    const cust = await supabaseFetch(`/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=email,has_access`, { method: "GET" });
    const c = Array.isArray(cust) ? cust[0] : null;
    if (!c?.has_access) return json(res, 403, { error: "No access" });

    // Mark token used (idempotent-ish)
    await supabaseFetch(`/rest/v1/magic_links?id=eq.${row.id}`, {
      method: "PATCH",
      body: { used_at: nowIso() }
    });

    // Issue session JWT cookie
    const jwtSecret = env("JWT_SECRET");
    const session = signJwtHS256({ email }, jwtSecret, 60*60*24*30); // 30 days
    setCookie(res, "cv_session", session, { httpOnly: true, secure: true, sameSite: "Lax", path: "/", maxAge: 60*60*24*30 });

    return json(res, 200, { ok: true });
  } catch (e){
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
