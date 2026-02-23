// api/payhip-webhook.js
// Krever: PAYHIP_API_KEY, APP_BASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (og evt EMAIL_FROM)

import crypto from "crypto";
import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  sendEmail,
  addHoursIso,
  addDaysIso,
} from "./_utils.js";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

// ✅ Viktig: Vi vil ha Payhip "product_key" (AeoVP) – ikke product_id (7024679)
function extractPayhipProductKey(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const first = items[0] || {};

  // Payhip sender ofte dette:
  // first.product_key: "AeoVP"
  // first.product_permalink: "https://payhip.com/b/AeoVP"
  const candidates = [
    first.product_key,
    payload.product_key,

    first.product_permalink,
    payload.product_permalink,

    // fallback
    first.product_id,
    payload.product_id,
  ];

  let raw = candidates.find((x) => x != null && String(x).trim() !== "");
  if (!raw) return null;

  raw = String(raw).trim();

  // Hvis det er en URL eller "b/AeoVP" eller "/b/AeoVP", normaliser til "AeoVP"
  raw = raw.replace(/^https?:\/\/payhip\.com\//i, ""); // fjerner domene hvis URL
  raw = raw.replace(/^\/?b\//i, "");                  // fjerner "b/" eller "/b/"
  raw = raw.trim();

  return raw || null;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const payload = await readJsonBody(req);

    // --- verify signature (som du hadde) ---
    const apiKey = env("PAYHIP_API_KEY");
    const expectedSig = sha256Hex(apiKey);
    const gotSig = String(payload.signature || "").trim();
    if (!gotSig || gotSig !== expectedSig) {
      return json(res, 401, { error: "Invalid signature" });
    }

    // only paid
    if (String(payload.type || "").toLowerCase() !== "paid") {
      return json(res, 200, { ok: true, ignored: true, reason: "not_paid" });
    }

    const email = normalizeEmail(payload.email || payload.customer_email);
    if (!email) return json(res, 400, { error: "Missing customer email" });

    const transactionId = String(payload.id || payload.transaction_id || "").trim();
    if (!transactionId) return json(res, 400, { error: "Missing transaction id" });

    // Idempotency
    const existing = await supabaseFetch(
      `/rest/v1/purchases?payhip_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id`,
      { method: "GET" }
    );
    if (Array.isArray(existing) && existing.length) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    // 1) 30 dager access (fornyes ved nytt kjøp)
    const accessExpiresAt = addDaysIso(30);
    await supabaseFetch("/rest/v1/customers?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { email, has_access: true, access_expires_at: accessExpiresAt },
    });

    // 2) lagre purchase
    const providerProductId = extractPayhipProductKey(payload); // ✅ forventet "AeoVP"
    console.log("PAYHIP payload.items:", payload.items);
    console.log("Extracted providerProductId:", providerProductId);

    await supabaseFetch("/rest/v1/purchases", {
      method: "POST",
      body: {
        payhip_transaction_id: transactionId,
        customer_email: email,
        product_id: providerProductId, // vi lagrer "AeoVP" her (mer nyttig for deg)
      },
    });

    // 3) map product -> template_key i supabase, og grant entitlement
    if (providerProductId) {
      // Bruk ilike for case-insensitive match mot "AeoVP"
      const mapRows = await supabaseFetch(
        `/rest/v1/product_templates?provider=eq.payhip&provider_product_id=ilike.${encodeURIComponent(
          providerProductId
        )}&select=template_key`,
        { method: "GET" }
      );

      console.log("Mapping rows:", mapRows);

      const mapping = Array.isArray(mapRows) ? mapRows[0] : null;
      const templateKey = String(mapping?.template_key || "").trim();

      console.log("Resolved templateKey:", templateKey);

      if (templateKey) {
        await supabaseFetch("/rest/v1/customer_templates?on_conflict=email,template_key", {
          method: "POST",
          headers: { Prefer: "resolution=ignore-duplicates" },
          body: { email, template_key: templateKey },
        });
      } else {
        console.warn("No product_templates mapping found for:", providerProductId);
      }
    } else {
      console.warn("Could not extract providerProductId from Payhip payload.");
    }

    // 4) magic link (24t)
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
