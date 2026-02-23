// api/me.js
import { json, env, parseCookies, verifyJwtHS256, supabaseFetch } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const cookies = parseCookies(req);
    const token = cookies.cv_session;
    if (!token) {
      return json(res, 401, { error: "Not authenticated" });
    }

    const secret = env("JWT_SECRET");
    const claims = verifyJwtHS256(token, secret);

    if (!claims?.email) {
      return json(res, 401, { error: "Invalid session" });
    }

    const email = String(claims.email).trim().toLowerCase();

    // ✅ Fetch templates user owns
    // Table: customer_templates (email, template_key)
    const tplRows = await supabaseFetch(
      `/rest/v1/customer_templates?email=eq.${encodeURIComponent(email)}&select=template_key`,
      { method: "GET" }
    );

    const templates = Array.isArray(tplRows)
      ? tplRows
          .map((r) => String(r?.template_key || "").trim())
          .filter(Boolean)
      : [];

    if (templates.length === 0) {
      return json(res, 403, { error: "No templates purchased" });
    }

    return json(res, 200, {
      ok: true,
      email,
      templates, // ["nurse", ...]
    });
  } catch (e) {
    console.error("me error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
