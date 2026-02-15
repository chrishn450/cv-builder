import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  setCookie,
  signJwtHS256,
  nowIso,
} from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { token } = await readJsonBody(req);
    if (!token || typeof token !== "string") return json(res, 400, { error: "Missing token" });

    const tokenHash = sha256Hex(token);

    const rows = await supabaseFetch(
      `/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,customer_email,expires_at,used_at`,
      { method: "GET" }
    );

    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row) return json(res, 400, { error: "Invalid token" });
    if (row.used_at) return json(res, 400, { error: "Token already used" });

    const exp = new Date(row.expires_at).getTime();
    if (Number.isFinite(exp) && Date.now() > exp) return json(res, 400, { error: "Token expired" });

    const email = String(row.customer_email || "").toLowerCase();

    // ✅ Ensure customer has active (not expired) access
    const cust = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=email,has_access,access_expires_at`,
      { method: "GET" }
    );
    const c = Array.isArray(cust) ? cust[0] : null;

    const expiresAt = c?.access_expires_at ? new Date(c.access_expires_at).getTime() : NaN;
    const valid = Boolean(c?.has_access) && Number.isFinite(expiresAt) && Date.now() < expiresAt;

    if (!valid) return json(res, 403, { error: "Access expired" });

    // Mark token used
    await supabaseFetch(`/rest/v1/magic_links?id=eq.${row.id}`, {
      method: "PATCH",
      body: { used_at: nowIso() },
    });

    // Issue session JWT cookie (30 days)
    const jwtSecret = env("JWT_SECRET");
    const session = signJwtHS256({ email }, jwtSecret, 60 * 60 * 24 * 30);

    setCookie(res, "cv_session", session, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("magic-exchange error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
