import { json, env, parseCookies, verifyJwtHS256, supabaseFetch } from "./_utils.js";

export default async function handler(req, res){
  try{
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

    const cookies = parseCookies(req);
    const token = cookies.cv_session;
    if (!token) return json(res, 401, { error: "Not logged in" });

    const payload = verifyJwtHS256(token, env("JWT_SECRET"));
    if (!payload?.email) return json(res, 401, { error: "Invalid session" });

    const email = String(payload.email).toLowerCase();
    const rows = await supabaseFetch(`/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=email,has_access`, { method: "GET" });
    const c = Array.isArray(rows) ? rows[0] : null;

    return json(res, 200, { email, hasAccess: !!c?.has_access });
  } catch (e){
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
