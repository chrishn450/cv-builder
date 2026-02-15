// api/me.js
import {
  json,
  env,
  parseCookies,
  verifyJwtHS256,
  supabaseFetch,
} from "./_utils.js";

/**
 * Assumes you set a JWT cookie named "session" in magic-exchange.
 * JWT payload should include: { email: "user@example.com" }
 * And you have JWT_SECRET in Vercel.
 */
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return json(res, 405, { error: "Method not allowed" });
    }

    const cookies = parseCookies(req);
    const token = cookies.session; // <-- if your cookie name differs, change here

    if (!token) {
      return json(res, 401, { error: "Not authenticated" });
    }

    const secret = env("JWT_SECRET"); // <-- if your env name differs, change here
    const claims = verifyJwtHS256(token, secret);

    if (!claims?.email) {
      return json(res, 401, { error: "Invalid session" });
    }

    const email = String(claims.email).trim().toLowerCase();

    // Fetch customer row
    const rows = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=email,has_access,access_expires_at`,
      { method: "GET" }
    );

    const customer = Array.isArray(rows) ? rows[0] : null;
    if (!customer) {
      return json(res, 403, { error: "No access" });
    }

    const hasAccess = Boolean(customer.has_access);
    const expiresAt = customer.access_expires_at ? new Date(customer.access_expires_at) : null;
    const now = new Date();

    const accessValid = hasAccess && expiresAt && expiresAt.getTime() > now.getTime();

    if (!accessValid) {
      return json(res, 403, {
        error: "Access expired",
        access_expires_at: customer.access_expires_at || null,
      });
    }

    return json(res, 200, {
      ok: true,
      email,
      has_access: true,
      access_expires_at: customer.access_expires_at,
    });
  } catch (e) {
    console.error("me error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
