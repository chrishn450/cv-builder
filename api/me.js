// api/me.js
import { json, env, parseCookies, verifyJwtHS256, supabaseFetch } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const cookies = parseCookies(req);

    // Must match magic-exchange cookie name:
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

    // 1) Check general access (same logic as you had)
    const rows = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(
        email
      )}&select=email,has_access,access_expires_at`,
      { method: "GET" }
    );

    const customer = Array.isArray(rows) ? rows[0] : null;
    if (!customer) {
      return json(res, 403, { error: "No access" });
    }

    const hasAccess = Boolean(customer.has_access);
    const expiresAt = customer.access_expires_at
      ? new Date(customer.access_expires_at).getTime()
      : NaN;

    const accessValid =
      hasAccess && Number.isFinite(expiresAt) && Date.now() < expiresAt;

    if (!accessValid) {
      return json(res, 403, {
        error: "Access expired",
        access_expires_at: customer.access_expires_at || null,
      });
    }

    // 2) Fetch templates user owns
    // Table: customer_templates (email, template_id)
    const tplRows = await supabaseFetch(
      `/rest/v1/customer_templates?email=eq.${encodeURIComponent(
        email
      )}&select=template_id`,
      { method: "GET" }
    );

    const templates = Array.isArray(tplRows)
      ? tplRows
          .map((r) => String(r?.template_id || "").trim())
          .filter(Boolean)
      : [];

    // If you require owning at least one template to use the app:
    if (templates.length === 0) {
      return json(res, 403, {
        error: "No templates purchased",
      });
    }

    return json(res, 200, {
      ok: true,
      email,
      has_access: true,
      access_expires_at: customer.access_expires_at,
      templates, // ✅ IMPORTANT: used by frontend to filter template picker
    });
  } catch (e) {
    console.error("me error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
