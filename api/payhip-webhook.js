import crypto from "crypto";
import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  sendEmail,
  addHoursIso,
} from "./_utils.js";

function addDaysIso(days) {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const payload = await readJsonBody(req);

    // Webhook verification (Payhip)
    const apiKey = env("PAYHIP_API_KEY");
    const expectedSig = sha256Hex(apiKey);
    const gotSig = String(payload.signature || "").trim();
    if (!gotSig || gotSig !== expectedSig) {
      return json(res, 401, { error: "Invalid signature" });
    }

    // Only handle paid events
    if (payload.type !== "paid") {
      return json(res, 200, { ok: true, ignored: true, reason: "not_paid" });
    }

    const email = normalizeEmail(payload.email || payload.customer_email);
    if (!email) return json(res, 400, { error: "Missing customer email" });

    const transactionId = String(payload.id || payload.transaction_id || "").trim();
    if (!transactionId) return json(res, 400, { error: "Missing transaction id" });

    // Product id from payload
    const item = Array.isArray(payload.items) ? payload.items[0] : null;
    const productId = String(item?.product_id || payload.product_id || "").trim() || null;

    // Idempotency: don’t process same transaction twice
    const existing = await supabaseFetch(
      `/rest/v1/purchases?payhip_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id`,
      { method: "GET" }
    );
    if (Array.isArray(existing) && existing.length) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    // 1) 30 days access
    const accessExpiresAt = addDaysIso(30);
    await supabaseFetch("/rest/v1/customers?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { email, has_access: true, access_expires_at: accessExpiresAt },
    });

    // 2) store purchase
    await supabaseFetch("/rest/v1/purchases", {
      method: "POST",
      body: {
        payhip_transaction_id: transactionId,
        customer_email: email,
        product_id: productId,
      },
    });

    // ✅ 3) map product -> template and grant entitlement
    // provider_product_id is the "b/XXXXX" id like AeoVP
    if (productId) {
      const mapRows = await supabaseFetch(
        `/rest/v1/product_templates?provider=eq.payhip&provider_product_id=eq.${encodeURIComponent(
          productId
        )}&select=template_key`,
        { method: "GET" }
      );

      const mapping = Array.isArray(mapRows) ? mapRows[0] : null;
      const templateKey = String(mapping?.template_key || "").trim();

      if (templateKey) {
        await supabaseFetch("/rest/v1/customer_templates?on_conflict=email,template_key", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates" },
          body: { email, template_key: templateKey },
        });
      }
    }

    // 4) create magic link (24h)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expiresAt = addHoursIso(24);

    await supabaseFetch("/rest/v1/magic_links", {
      method: "POST",
      body: { customer_email: email, token_hash: tokenHash, expires_at: expiresAt },
    });

    // 5) email claim link
    const baseUrl = env("APP_BASE_URL");
    const link = `${String(baseUrl).replace(/\/$/, "")}/claim.html?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Your CV Builder access",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>You now have access ✅</h2>
          <p>Your access is valid for <b>30 days</b> from purchase.</p>
          <p>Click the button below to open CV Builder:</p>
          <p>
            <a href="${link}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600">
              Open CV Builder
            </a>
          </p>
          <p style="color:#555">This login link can be used once and expires in 24 hours.</p>
        </div>
      `,
    });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("payhip-webhook error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
