import { json, readJsonBody, sha256Hex, supabaseFetch } from "./_utils.js";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { token } = await readJsonBody(req);
    if (!token) return json(res, 400, { error: "Missing token" });

    const tokenHash = sha256Hex(token);

    const rows = await supabaseFetch(
      `/rest/v1/magic_links?token_hash=eq.${encodeURIComponent(tokenHash)}&select=customer_email,expires_at,used_at`,
      { method: "GET" }
    );

    const ml = Array.isArray(rows) ? rows[0] : null;
    if (!ml) return json(res, 200, { ok: true, state: "invalid" });

    const expired = Date.now() > new Date(ml.expires_at).getTime();
    if (expired) return json(res, 200, { ok: true, state: "expired" });

    if (ml.used_at) return json(res, 200, { ok: true, state: "claimed" });

    return json(res, 200, {
      ok: true,
      state: "new",
      email: String(ml.customer_email || "").toLowerCase(),
    });
  } catch (e) {
    console.error("claim-status error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
