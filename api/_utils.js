import crypto from "crypto";

export function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

export function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signJwtHS256(payload, secret, expiresInSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyJwtHS256(token, secret) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest();

  const got = Buffer.from(
    s.replace(/-/g, "+").replace(/_/g, "/") +
      "==".slice(0, (4 - (s.length % 4)) % 4),
    "base64"
  );

  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;

  const payloadJson = Buffer.from(
    p.replace(/-/g, "+").replace(/_/g, "/") +
      "==".slice(0, (4 - (p.length % 4)) % 4),
    "base64"
  ).toString("utf8");

  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return null;
  return payload;
}

export function parseCookies(req) {
  const header = req.headers?.cookie || "";
  const out = {};
  header
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return;
      const k = pair.slice(0, idx).trim();
      const v = decodeURIComponent(pair.slice(idx + 1));
      out[k] = v;
    });
  return out;
}

export function setCookie(res, name, value, options = {}) {
  const opts = {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
    maxAge: 60 * 60 * 24 * 30,
    ...options,
  };

  let cookie = `${name}=${encodeURIComponent(value)}; Path=${opts.path}`;
  if (opts.httpOnly) cookie += "; HttpOnly";
  if (opts.secure) cookie += "; Secure";
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.maxAge != null) cookie += `; Max-Age=${opts.maxAge}`;
  res.setHeader("Set-Cookie", cookie);
}

/**
 * Robust body reader:
 * - application/json -> JSON.parse
 * - application/x-www-form-urlencoded -> Object
 * - fallback: try JSON, else {}
 */
export async function readJsonBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  const ct = String(req.headers?.["content-type"] || "").toLowerCase();

  if (ct.includes("application/json")) {
    return JSON.parse(raw);
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const obj = Object.fromEntries(params.entries());

    // Payhip sender ofte "items" som en JSON-string
    if (typeof obj.items === "string") {
      try {
        obj.items = JSON.parse(obj.items);
      } catch {
        // ignore
      }
    }
    return obj;
  }

  // Fallback
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function env(name, required = true) {
  const v = process.env[name];
  if (required && !v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function supabaseFetch(path, { method = "GET", headers = {}, body } = {}) {
  const url = env("SUPABASE_URL") + path;
  const key = env("SUPABASE_SERVICE_ROLE_KEY");

  const res = await fetch(url, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || text || `Supabase error ${res.status}`;
    throw new Error(msg);
  }

  return data;
}

export async function sendEmail({ to, subject, html }) {
  const apiKey = env("RESEND_API_KEY");

  // Fallback i test hvis EMAIL_FROM mangler
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Resend error: ${res.status} ${text}`);
  }

  return text ? JSON.parse(text) : {};
}

export function nowIso() {
  return new Date().toISOString();
}

export function addHoursIso(hours) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}
export async function etsyFetch(path, { method = "GET", headers = {}, body } = {}) {
  const keystring = env("ETSY_API_KEYSTRING");
  const shared = env("ETSY_SHARED_SECRET");
  const userId = env("ETSY_USER_ID");         // kommer senere
  const accessToken = env("ETSY_ACCESS_TOKEN"); // kommer senere

  const url = path.startsWith("http")
    ? path
    : `https://api.etsy.com${path.startsWith("/") ? "" : "/"}${path}`;

  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": `${keystring}:${shared}`,
      "authorization": `Bearer ${userId}.${accessToken}`,
      "content-type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }

  if (!res.ok) {
    const msg = data?.error || data?.message || text || `Etsy error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export function addDaysIso(days) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}
