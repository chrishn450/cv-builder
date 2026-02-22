import crypto from "crypto";
import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  addHoursIso,
  addDaysIso,
  etsyFetch,
} from "./_utils.js";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const { email, orderNumber } = await readJsonBody(req);
    const e = normalizeEmail(email);
    const receiptId = String(orderNumber || "").trim();

    if (!e) return json(res, 400, { error: "Missing email" });
    if (!receiptId || !/^\d+$/.test(receiptId)) {
      return json(res, 400, { error: "Invalid order number" });
    }

    const shopId = env("ETSY_SHOP_ID");

    // 1) Hent receipt fra Etsy
    const receipt = await etsyFetch(
      `/v3/application/shops/${encodeURIComponent(shopId)}/receipts/${encodeURIComponent(receiptId)}`
    );

    // 2) Verifiser betalt + email match
    const buyerEmail = normalizeEmail(receipt?.buyer_email);
    const isPaid =
      Boolean(receipt?.is_paid) ||
      String(receipt?.status || "").toLowerCase() === "paid";

    if (!isPaid) return json(res, 403, { error: "Order not paid" });

    if (!buyerEmail) {
      return json(res, 500, {
        error: "Could not read buyer email from Etsy. Check token scopes (transactions_r).",
      });
    }

    if (buyerEmail !== e) return json(res, 403, { error: "Email does not match order" });

    // 3) Gi 30 dager tilgang
    const accessExpiresAt = addDaysIso(30);
    await supabaseFetch("/rest/v1/customers?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { email: e, has_access: true, access_expires_at: accessExpiresAt },
    });

    // 4) Lagre kjøpet (idempotent)
    const existingPurchase = await supabaseFetch(
      `/rest/v1/purchases?etsy_receipt_id=eq.${encodeURIComponent(receiptId)}&select=id`,
      { method: "GET" }
    );

    if (!(Array.isArray(existingPurchase) && existingPurchase.length)) {
      await supabaseFetch("/rest/v1/purchases", {
        method: "POST",
        body: {
          payhip_transaction_id: null,
          etsy_receipt_id: receiptId,
          customer_email: e,
          product_id: null,
        },
      });
    }

    // 5) Lag magic link (24 timer)
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expiresAt = addHoursIso(24);

    await supabaseFetch("/rest/v1/magic_links", {
      method: "POST",
      body: {
        customer_email: e,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const baseUrl = env("APP_BASE_URL");
    const claimUrl = `${String(baseUrl).replace(/\/$/, "")}/claim.html?token=${token}`;

    return json(res, 200, { ok: true, claimUrl });
  } catch (err) {
    console.error("request-access error:", err);
    return json(res, 500, { error: err?.message || "Server error" });
  }
}
