// api/payhip-webhook.js
// Krever: PAYHIP_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY (og evt EMAIL_FROM)

import {
  json,
  readJsonBody,
  sha256Hex,
  env,
  supabaseFetch,
  sendEmail,
  addDaysIso,
} from "./_utils.js";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

// ✅ Vi vil ha Payhip "product_key" (f.eks. AeoVP) – ikke product_id
function extractPayhipProductKey(payload) {
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const first = items[0] || {};

  const candidates = [
    first.product_key,
    payload.product_key,
    first.product_permalink,
    payload.product_permalink,
    // fallback (noen payloads kan være rare):
    first.product_id,
    payload.product_id,
  ];

  let raw = candidates.find((x) => x != null && String(x).trim() !== "");
  if (!raw) return null;

  raw = String(raw).trim();
  raw = raw.replace(/^https?:\/\/payhip\.com\//i, "");
  raw = raw.replace(/^\/?b\//i, "");
  raw = raw.trim();

  // hvis det ligger querystring e.l.
  raw = raw.split("?")[0].split("#")[0].trim();

  return raw || null;
}

async function getCustomerTemplatesArray(email) {
  const rows = await supabaseFetch(
    `/rest/v1/customers?email=eq.${encodeURIComponent(email)}&select=templates`,
    { method: "GET" }
  );
  const c = Array.isArray(rows) ? rows[0] : null;
  return Array.isArray(c?.templates) ? c.templates : [];
}

async function resolveTemplateKeyForPayhipProduct(providerProductId) {
  if (!providerProductId) return "";

  // Prøv først eksakt match
  const exactRows = await supabaseFetch(
    `/rest/v1/product_templates?provider=eq.payhip&provider_product_id=eq.${encodeURIComponent(
      providerProductId
    )}&select=template_key`,
    { method: "GET" }
  );
  const exact = Array.isArray(exactRows) ? exactRows[0] : null;
  const exactKey = String(exact?.template_key || "").trim();
  if (exactKey) return exactKey;

  // Fallback: case-insensitive match via ilike
  const ilikeRows = await supabaseFetch(
    `/rest/v1/product_templates?provider=eq.payhip&provider_product_id=ilike.${encodeURIComponent(
      providerProductId
    )}&select=template_key`,
    { method: "GET" }
  );
  const mapping = Array.isArray(ilikeRows) ? ilikeRows[0] : null;
  return String(mapping?.template_key || "").trim();
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed" });

    const payload = await readJsonBody(req);

    // --- verify signature ---
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

    // --- Idempotency ---
    const existing = await supabaseFetch(
      `/rest/v1/purchases?payhip_transaction_id=eq.${encodeURIComponent(transactionId)}&select=id`,
      { method: "GET" }
    );
    if (Array.isArray(existing) && existing.length) {
      return json(res, 200, { ok: true, duplicate: true });
    }

    // 1) Lagre purchase
    const providerProductId = extractPayhipProductKey(payload); // f.eks. "AeoVP"
    await supabaseFetch("/rest/v1/purchases", {
      method: "POST",
      body: {
        payhip_transaction_id: transactionId,
        customer_email: email,
        product_id: providerProductId || null,
      },
    });

    // 2) Finn templateKey fra mapping-tabellen
    const templateKey = await resolveTemplateKeyForPayhipProduct(providerProductId);

    // 3) Oppdater customers: access 30 dager + templates-array
    const accessExpiresAt = addDaysIso(30);

    // 3a) hent eksisterende templates og merge (ikke overskriv)
    const existingTemplates = await getCustomerTemplatesArray(email);

    const nextTemplates = templateKey
      ? Array.from(new Set([...existingTemplates.map(String), String(templateKey)]))
      : existingTemplates;

    // 3b) upsert customers (merge duplicates)
    await supabaseFetch("/rest/v1/customers?on_conflict=email", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: {
        email,
        has_access: true,
        access_expires_at: accessExpiresAt,
        templates: nextTemplates,
      },
    });

    // 3c) (ANBEFALT) skriv også til customer_templates for bakoverkompatibilitet
    if (templateKey) {
      await supabaseFetch("/rest/v1/customer_templates?on_conflict=email,template_key", {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates" },
        body: { email, template_key: templateKey },
      });
    }

    // 4) Send e-post
    await sendEmail({
      to: email,
      subject: "Payment received ✅",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6">
          <h2 style="margin:0 0 10px">Payment received ✅</h2>
          <p style="margin:0 0 10px">You have export access for <b>30 days</b>.</p>
          ${
            templateKey
              ? `<p style="margin:0">Template unlocked: <b>${templateKey}</b></p>`
              : `<p style="margin:0">Template unlocked: <b>(not mapped)</b></p>`
          }
        </div>
      `,
    });

    return json(res, 200, {
      ok: true,
      email,
      providerProductId: providerProductId || null,
      templateKey: templateKey || null,
      access_expires_at: accessExpiresAt,
      templates: nextTemplates,
    });
  } catch (e) {
    console.error("payhip-webhook error:", e);
    return json(res, 500, { error: e?.message || "Server error" });
  }
}
