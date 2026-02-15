import crypto from "crypto";

export function json(res, status, obj){
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

export function sha256Hex(input){
  return crypto.createHash("sha256").update(input).digest("hex");
}

function b64url(buf){
  return Buffer.from(buf).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}

export function signJwtHS256(payload, secret, expiresInSeconds){
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now()/1000);
  const body = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const data = `${h}.${p}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyJwtHS256(token, secret){
  const parts = String(token||"").split(".");
  if (parts.length !== 3) return null;
  const [h,p,s] = parts;
  const data = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", secret).update(data).digest();
  const got = Buffer.from(s.replace(/-/g,"+").replace(/_/g,"/") + "==".slice(0,(4 - (s.length % 4)) % 4), "base64");
  // timing-safe compare
  if (got.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(got, expected)) return null;

  const payloadJson = Buffer.from(p.replace(/-/g,"+").replace(/_/g,"/") + "==".slice(0,(4 - (p.length % 4)) % 4), "base64").toString("utf8");
  const payload = JSON.parse(payloadJson);
  const now = Math.floor(Date.now()/1000);
  if (payload.exp && now > payload.exp) return null;
  return payload;
}

export function parseCookies(req){
  const header = req.headers?.cookie || "";
  const out = {};
  header.split(";").map(v=>v.trim()).filter(Boolean).forEach(pair=>{
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const k = pair.slice(0, idx).trim();
    const v = decodeURIComponent(pair.slice(idx+1));
    out[k] = v;
  });
  return out;
}

export function setCookie(res, name, value, options = {}){
  const opts = {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
    secure: true,
    maxAge: 60*60*24*30,
    ...options
  };

  let cookie = `${name}=${encodeURIComponent(value)}; Path=${opts.path}`;
  if (opts.httpOnly) cookie += "; HttpOnly";
  if (opts.secure) cookie += "; Secure";
  if (opts.sameSite) cookie += `; SameSite=${opts.sameSite}`;
  if (opts.maxAge != null) cookie += `; Max-Age=${opts.maxAge}`;
  res.setHeader("Set-Cookie", cookie);
}

export async function readJsonBody(req){
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export function env(name, required=true){
  const v = process.env[name];
  if (required && !v) throw new Error(`Missing env: ${name}`);
  return v;
}

export async function supabaseFetch(path, { method="GET", headers={}, body } = {}){
  const url = env("SUPABASE_URL") + path;
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  const res = await fetch(url, {
    method,
    headers: {
      "apikey": key,
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = null; }
  if (!res.ok){
    const msg = json?.message || json?.error || text || `Supabase error ${res.status}`;
    throw new Error(msg);
  }
  return json;
}

export async function sendEmail({ to, subject, html }){
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html
    })
  });
  const text = await res.text();
  if (!res.ok){
    throw new Error(`Resend error: ${res.status} ${text}`);
  }
  return text ? JSON.parse(text) : {};
}

export function nowIso(){
  return new Date().toISOString();
}

export function addHoursIso(hours){
  return new Date(Date.now() + hours*3600*1000).toISOString();
}
