import crypto from "crypto";
import {
  json,
  sha256Hex,
  env,
  supabaseFetch,
  sendEmail,
  addHoursIso,
} from "./_utils.js";

/**
 * Payhip webhooks kan komme som JSON eller application/x-www-form-urlencoded.
 * Denne leser raw body og parser basert på Content-Type.
 */
async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");

  const ct = String(req.headers["content-type"] || "").toLowerCase();

  // JSON
  if (ct.includes("application/json")) {
    return raw ? JSON.parse(raw) : {};
  }

  // Form-urlencoded
  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const obj = Object.fromEntries(params.entries());

    // Payhip kan sende enkelte felt som JSON-strenger (f.eks. items)
    if (typeof obj.items === "string") {
      try {
        obj.items = JSON.parse(obj.items);
      } catch {
        // ignore
      }
    }

    return obj;
  }

  // Fallback: prøv JSON, ellers returner tomt objekt
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const payload = await readBody(req);

    // Debug ved behov (kan kommenteres ut etterpå)
    // console.log("payhip content-type:", req.headers["content-type"]);
    // console.log("payhip payload keys:", Object.keys(payload || {}));

    // 1) Verify webhook (din nåværende metode)
    const apiKey = env("PAYHIP_API_KEY");
    const expectedSig = sha256Hex(apiKey);

    if (!payload.signature || payload.signature !== expectedSig) {
      return json(res, 401, { error: "Invalid signature" });
    }

    // 2) Only handle paid events
    if (payload.type !== "paid") {
      return json(res, 200, { ok: true, ignored: true, reason: "not_paid" });
    }

    const email = String(payload.email || payload.customer_email || "")
      .trim()
      .toLowerCase();
    if (!email) return json(res, 400, { error: "Missing customer email" });

    const transactionId = String(payload.id || payload.transaction_id || "").trim();
    if (!transactionId) return json(res, 400, { error: "Missing transaction id" });

    // Optional: ensure correct product
    const requiredProductId = process.env.PAYHIP_PRODUCT_ID;
    const item = Array.isArray(payload.items) ? payload.items[0] : null;
    const productId = (String(item?.product_id || payload.product_id || "").trim() || null);

    if (requiredProductId && productId && requiredProductId !== productId) {
      return json(res, 200, { ok: true, ignored: true, reason: "wrong_product" });
    }

    // 3) Idempotency: if purchase exists, do nothing (but return 200)
    const existing = await supabaseFetch(
      `/rest/v1/purchases?payhip_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id`,
      { method: "GET" }
    );

    if (Array.isArray(existing) && existing.length) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    // 4) Upsert customer (grant access)
    await supabaseFetch("/rest/v1/customers", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: { email, has_access: true },
    });

    // 5) Insert purchase record
    await supabaseFetch("/rest/v1/purchases", {
      method: "POST",
      body: {
        payhip_transaction_id: transactionId,
        customer_email: email,
        product_id: productId,
      },
    });

    // 6) Create magic token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(token);
    const expiresAt = addHoursIso(24);

    await supabaseFetch("/rest/v1/magic_links", {
      method: "POST",
      body: {
        customer_email: email,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    // 7) Send email with magic link
    const baseUrl = env("APP_BASE_URL");
    const link = `${String(baseUrl).replace(/\/$/, "")}/magic.html?token=${token}`;

    await sendEmail({
      to: email,
      subject: "Din tilgang til CV Builder",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Du har nå tilgang ✅</h2>
          <p>Klikk knappen under for å åpne CV-builderen:</p>
          <p>
            <a href="${link}" style="display:inline-block;background:#2f6bff;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-weight:600">
              Åpne CV Builder
            </a>
          </p>
          <p style="color:#555">Lenken kan brukes én gang og utløper om 24 timer.</p>
        </div>
      `,
    });

    return json(res, 200, { ok: true });
  } catch (e) {
    console.error("payhip-webhook error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
