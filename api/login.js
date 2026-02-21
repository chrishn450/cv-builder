import bcrypt from "bcryptjs";
import { json, readJsonBody, env, supabaseFetch, setCookie, signJwtHS256 } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { email, password } = await readJsonBody(req);
    const e = String(email || "").trim().toLowerCase();
    if (!e || !password) return json(res, 400, { error: "Missing email or password" });

    // 1) sjekk bruker finnes
    const userRows = await supabaseFetch(
      `/rest/v1/users?email=eq.${encodeURIComponent(e)}&select=email,password_hash`,
      { method: "GET" }
    );
    const u = Array.isArray(userRows) ? userRows[0] : null;
    if (!u) return json(res, 401, { error: "Invalid login" });

    const ok = await bcrypt.compare(String(password), String(u.password_hash));
    if (!ok) return json(res, 401, { error: "Invalid login" });

    // 2) sjekk at 30-dagers access fortsatt er gyldig
    const custRows = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(e)}&select=has_access,access_expires_at`,
      { method: "GET" }
    );
    const c = Array.isArray(custRows) ? custRows[0] : null;
    if (!c) return json(res, 403, { error: "No access" });

    const hasAccess = Boolean(c.has_access);
    const exp = c.access_expires_at ? new Date(c.access_expires_at).getTime() : NaN;
    if (!hasAccess || !Number.isFinite(exp) || Date.now() > exp) {
      return json(res, 403, { error: "Access expired" });
    }

    // 3) sett session-cookie
    const secret = env("JWT_SECRET");
    const jwt = signJwtHS256({ email: e }, secret, 60 * 60 * 24 * 30);
    setCookie(res, "cv_session", jwt, { maxAge: 60 * 60 * 24 * 30, path: "/" });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("login error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
