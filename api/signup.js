import bcrypt from "bcryptjs";
import { json, readJsonBody, env, supabaseFetch, setCookie, signJwtHS256 } from "./_utils.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = await readJsonBody(req);

    const e = normalizeEmail(body?.email);
    const password = String(body?.password || "");
    const passwordConfirm =
      String(body?.passwordConfirm ?? body?.password2 ?? body?.confirmPassword ?? "");

    if (!e) return json(res, 400, { error: "Email required" });

    if (!password || password.length < 8) {
      return json(res, 400, { error: "Password must be at least 8 characters" });
    }

    if (!passwordConfirm) {
      return json(res, 400, { error: "Please confirm your password" });
    }

    if (password !== passwordConfirm) {
      return json(res, 400, { error: "Passwords do not match" });
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
    const password_hash = await bcrypt.hash(password, 12);
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
        body: { email: e, has_access: false, access_expires_at: null, templates: [] },
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
