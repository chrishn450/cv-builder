function upstashUrl() {
  const u = (process.env.KV_REST_API_URL || "").trim().replace(/\/$/, "");
  if (!u) throw new Error("Missing KV_REST_API_URL");
  return u;
}
function upstashToken() {
  const t = (process.env.KV_REST_API_TOKEN || "").trim();
  if (!t) throw new Error("Missing KV_REST_API_TOKEN");
  return t;
}
async function upstash(path, payload) {
  const res = await fetch(`${upstashUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${upstashToken()}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok || json?.error) {
    const msg = json?.error || `Upstash error (${res.status})`;
    const details = json?.details || text;
    const err = new Error(msg);
    err.details = details;
    err.status = res.status;
    throw err;
  }
  return json;
}
function normalize(s) {
  return String(s ?? "").replace(/\u00A0/g, " ").trim().toUpperCase();
}
export { upstash, normalize };
