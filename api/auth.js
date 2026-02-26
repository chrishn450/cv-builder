import bcrypt from "bcryptjs";
import {
  json,
  readJsonBody,
  env,
  supabaseFetch,
  setCookie,
  signJwtHS256,
  // Du må ha en måte å lese cv_session JWT på. Hvis du allerede har i _utils.js: bruk den.
  // Hvis ikke, legg til helperen under i _utils.js (se punkt 1b).
  readSessionEmailFromReq,
} from "./_utils.js";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function setSession(res, email) {
  const secret = env("JWT_SECRET");
  const jwt = signJwtHS256({ email }, secret, 60 * 60 * 24 * 30);
  setCookie(res, "cv_session", jwt, { maxAge: 60 * 60 * 24 * 30, path: "/" });
}

async function getCustomerByEmail(email) {
  const rows = await supabaseFetch(
    `/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=email,has_access,access_expires_at,templates`,
    { method: "GET" }
  );
  return Array.isArray(rows) ? rows[0] : null;
}

function computeHasAccess(c) {
  const has = Boolean(c?.has_access);
  const expMs = c?.access_expires_at ? new Date(c.access_expires_at).getTime() : NaN;
  if (!has) return false;
  if (!Number.isFinite(expMs)) return false;
  return Date.now() <= expMs;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const body = await readJsonBody(req);
    const action = String(body?.action || "").trim();

    // --- LOGOUT ---
    if (action === "logout") {
      setCookie(res, "cv_session", "", { maxAge: 0, path: "/" });
      return json(res, 200, { ok: true });
    }

    // --- ME ---
    if (action === "me") {
      const email = readSessionEmailFromReq(req); // må finnes i _utils.js
      if (!email) return json(res, 200, { ok: false });

      const c = await getCustomerByEmail(email);
      const has_access = computeHasAccess(c);

      return json(res, 200, {
        ok: true,
        email,
        has_access,
        access_expires_at: c?.access_expires_at || null,
        templates: Array.isArray(c?.templates) ? c.templates : [], // hvis du bruker template-entitlements
      });
    }

    // --- SIGNUP ---
    if (action === "signup") {
      const email = normalizeEmail(body?.email);
      const password = String(body?.password || "");
      if (!email) return json(res, 400, { error: "Missing email" });
      if (!password || password.length < 8) {
        return json(res, 400, { error: "Password must be at least 8 characters" });
      }

      // user exists?
      const existing = await supabaseFetch(
        `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email`,
        { method: "GET" }
      );
      if (Array.isArray(existing) && existing.length) {
        return json(res, 409, { error: "Account already exists. Please log in." });
      }

      const password_hash = await bcrypt.hash(password, 12);
      await supabaseFetch("/rest/v1/users", { method: "POST", body: { email, password_hash } });

      // ensure customer row exists (no access initially)
      const c = await getCustomerByEmail(email);
      if (!c) {
        await supabaseFetch("/rest/v1/customers", {
          method: "POST",
          body: { email, has_access: false, access_expires_at: null, templates: [] },
        });
      }

      await setSession(res, email);
      return json(res, 200, { ok: true });
    }

    // --- LOGIN ---
    if (action === "login") {
      const email = normalizeEmail(body?.email);
      const password = String(body?.password || "");
      if (!email || !password) return json(res, 400, { error: "Missing email or password" });

      const userRows = await supabaseFetch(
        `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email,password_hash`,
        { method: "GET" }
      );
      const u = Array.isArray(userRows) ? userRows[0] : null;
      if (!u) return json(res, 401, { error: "Invalid login" });

      const ok = await bcrypt.compare(password, String(u.password_hash));
      if (!ok) return json(res, 401, { error: "Invalid login" });

      // ensure customer row exists (just in case)
      const c = await getCustomerByEmail(email);
      if (!c) {
        await supabaseFetch("/rest/v1/customers", {
          method: "POST",
          body: { email, has_access: false, access_expires_at: null, templates: [] },
        });
      }

      await setSession(res, email);
      return json(res, 200, { ok: true });
    }

    return json(res, 400, { error: "Unknown action" });
  } catch (e) {
    console.error("auth error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
