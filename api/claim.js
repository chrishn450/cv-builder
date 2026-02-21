import bcrypt from "bcryptjs";
import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  setCookie,
  signJwtHS256,
} from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { token, password, confirmPassword } = await readJsonBody(req);

    if (!token) return json(res, 400, { error: "Missing token" });
    if (!password || password.length < 8) return json(res, 400, { error: "Password must be at least 8 characters" });
    if (password !== confirmPassword) return json(res, 400, { error: "Passwords do not match" });

    const tokenHash = sha256Hex(token);

    // 1) Hent magic-link
    const rows = await supabaseFetch(
      `/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}&select=customer_email,expires_at,used_at`,
      { method: "GET" }
    );
    const ml = Array.isArray(rows) ? rows[0] : null;

    if (!ml) return json(res, 400, { error: "Invalid token" });
    if (ml.used_at) return json(res, 409, { error: "Already claimed. Please log in." });

    const expired = Date.now() > new Date(ml.expires_at).getTime();
    if (expired) return json(res, 400, { error: "Token expired. Request a new link." });

    const email = String(ml.customer_email || "").trim().toLowerCase();
    if (!email) return json(res, 400, { error: "Missing email on token" });

    // 2) Sjekk tilgang (30 dager)
    const custRows = await supabaseFetch(
      `/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=has_access,access_expires_at`,
      { method: "GET" }
    );
    const c = Array.isArray(custRows) ? custRows[0] : null;
    if (!c) return json(res, 403, { error: "No customer access" });

    const hasAccess = Boolean(c.has_access);
    const exp = c.access_expires_at ? new Date(c.access_expires_at).getTime() : NaN;
    if (!hasAccess || !Number.isFinite(exp) || Date.now() > exp) {
      return json(res, 403, { error: "Access expired" });
    }

    // 3) Opprett bruker (kun én gang)
    const existingUser = await supabaseFetch(
      `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email`,
      { method: "GET" }
    );
    if (Array.isArray(existingUser) && existingUser.length) {
      // Hvis bruker finnes, markér token brukt og be om login (forhindrer deling)
      await supabaseFetch(`/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
        method: "PATCH",
        body: { used_at: new Date().toISOString() },
      });
      return json(res, 409, { error: "Account already exists. Please log in." });
    }

    const password_hash = await bcrypt.hash(password, 12);

    await supabaseFetch("/rest/v1/users", {
      method: "POST",
      body: { email, password_hash },
    });

    // 4) Marker token brukt (så link ikke kan deles)
    await supabaseFetch(`/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}`, {
      method: "PATCH",
      body: { used_at: new Date().toISOString() },
    });

    // 5) Sett session-cookie
    const secret = env("JWT_SECRET");
    const jwt = signJwtHS256({ email }, secret, 60 * 60 * 24 * 30);
    setCookie(res, "cv_session", jwt, { maxAge: 60 * 60 * 24 * 30, path: "/" });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("claim error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
