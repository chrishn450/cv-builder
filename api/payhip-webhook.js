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

function getProductId(payload) {
  const item = Array.isArray(payload.items) ? payload.items[0] : null;
  return String(item?.product_id || payload.product_id || "").trim() || null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const payload = await readJsonBody(req);

    // 0) Verify webhook (Payhip-style signature you already use)
    const apiKey = env("PAYHIP_API_KEY");
    const expectedSig = sha256Hex(apiKey);
    const gotSig = String(payload.signature || "").trim();
    if (!gotSig || gotSig !== expectedSig) {
      return json(res, 401, { error: "Invalid signature" });
    }

    // 1) Only handle paid events
    if (payload.type !== "paid") {
      return json(res, 200, { ok: true, ignored: true, reason: "not_paid" });
    }

    const email = normalizeEmail(payload.email || payload.customer_email);
    if (!email) return json(res, 400, { error: "Missing customer email" });

    const transactionId = String(payload.id || payload.transaction_id || "").trim();
    if (!transactionId) return json(res, 400, { error: "Missing transaction id" });

    const productId = getProductId(payload);

    // 2) Idempotency (avoid double processing)
    const existing = await supabaseFetch(
      `/rest/v1/purchases?payhip_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id`,
      { method: "GET" }
    );
    if (Array.isArray(existing) && existing.length) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    // 3) Always renew access to 30 days from NOW (last purchase wins)
    const accessExpiresAt = addDaysIso(30);
    await supabaseFetch("/rest/v1/customers?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { email, has_access: true, access_expires_at: accessExpiresAt },
    });

    // 4) Store purchase
    await supabaseFetch("/rest/v1/purchases", {
      method: "POST",
      body: {
        payhip_transaction_id: transactionId,
        customer_email: email,
        product_id: productId,
      },
    });

    // 5) Map product -> template and grant entitlement (ADDITIVE: keep old templates)
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

    // 6) Only send claim link if the user account does NOT exist yet
    const userRows = await supabaseFetch(
      `/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=email`,
      { method: "GET" }
    );
    const hasUser = Array.isArray(userRows) && userRows.length > 0;

    if (!hasUser) {
      // Create magic link (24h), 1-time use is enforced by /api/claim marking used_at
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = sha256Hex(token);
      const expiresAt = addHoursIso(24);

      await supabaseFetch("/rest/v1/magic_links", {
        method: "POST",
        body: { customer_email: email, token_hash: tokenHash, expires_at: expiresAt },
      });

      const baseUrl = env("APP_BASE_URL");
      const link = `${String(baseUrl).replace(/\/$/, "")}/claim.html?token=${token}`;

      await sendEmail({
        to: email,
        subject: "Set your password for CV Builder",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2>You're in ✅</h2>
            <p>Your access is valid for <b>30 days</b> from your latest purchase.</p>
            <p>Create your password using the button below:</p>
            <p>
              <a href="${link}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600">
                Create password
              </a>
            </p>
            <p style="color:#555">This link expires in 24 hours and can only be used once.</p>
          </div>
        `,
      });
    }

    // If user exists: we silently renew access + add template. No password reset needed.

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("payhip-webhook error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
