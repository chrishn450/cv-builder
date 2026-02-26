import bcrypt from "bcryptjs";
import { json, readJsonBody, env, supabaseFetch, setCookie, signJwtHS256 } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { email, password } = await readJsonBody(req);
    const e = String(email || "").trim().toLowerCase();
    if (!e || !password || String(password).length < 8) {
      return json(res, 400, { error: "Email + password (min 8 chars) required" });
    }

    // finnes bruker?
    const existing = await supabaseFetch(
      `/rest/v1/users?email=eq.${encodeURIComponent(e)}&select=email`,
      { method: "GET" }
    );
    if (Array.isArray(existing) && existing.length) {
      return json(res, 409, { error: "Account already exists. Please log in." });
    }

    // opprett user
    const password_hash = await bcrypt.hash(String(password), 12);
    await supabaseFetch("/rest/v1/users", {
      method: "POST",
      body: { email: e, password_hash },
    });

    // sørg for at customers-rad finnes (uten access)
    const cust = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(e)}&select=email`,
      { method: "GET" }
    );
    if (!Array.isArray(cust) || cust.length === 0) {
      await supabaseFetch("/rest/v1/customers", {
        method: "POST",
        body: { email: e, has_access: false, access_expires_at: null },
      });
    }

    // logg inn med cookie
    const secret = env("JWT_SECRET");
    const jwt = signJwtHS256({ email: e }, secret, 60 * 60 * 24 * 30);
    setCookie(res, "cv_session", jwt, { maxAge: 60 * 60 * 24 * 30, path: "/" });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("signup error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
