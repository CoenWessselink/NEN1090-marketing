/**
 * Cloudflare Pages Function: POST /api/mollie/webhook
 *
 * Mollie sends webhooks as form-urlencoded: id=<payment_id>
 * We fetch the payment details and (optionally) forward them to the backend
 * so the backend can:
 *  - activate tenant
 *  - set seats_purchased/valid_until
 *  - store payment record
 *
 * Env:
 * - MOLLIE_API_KEY (required)
 * - BACKEND_API_BASE (optional)
 * - BACKEND_MOLLIE_WEBHOOK_PATH (optional, default /api/v1/billing/mollie/webhook)
 */

export async function onRequestPost({ request, env }) {
  const apiKey = String(env?.MOLLIE_API_KEY || "").trim();
  if (!apiKey) {
    return new Response("missing MOLLIE_API_KEY", { status: 500 });
  }

  const ct = request.headers.get("content-type") || "";
  let paymentId = "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    paymentId = String(form.get("id") || "").trim();
  } else {
    const body = await request.json().catch(() => ({}));
    paymentId = String(body.id || "").trim();
  }
  if (!paymentId) {
    return new Response("missing payment id", { status: 400 });
  }

  // Fetch payment from Mollie
  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  const mollieTxt = await mollieRes.text();
  if (!mollieRes.ok) {
    return new Response("mollie fetch failed", { status: 502 });
  }
  let payment;
  try { payment = JSON.parse(mollieTxt); } catch { payment = { raw: mollieTxt }; }

  // Best-effort cache of the latest payment state so the success page can poll quickly.
  // This is NOT a database; it may be evicted.
  try {
    const cacheKey = new Request(`https://nen1090.local/checkout/status/${encodeURIComponent(paymentId)}`);
    const cached = {
      ok: true,
      source: "webhook",
      paymentId,
      status: payment?.status || "unknown",
      isPaid: payment?.status === "paid",
      updatedAt: new Date().toISOString(),
      metadata: payment?.metadata || null,
    };
    await caches.default.put(cacheKey, new Response(JSON.stringify(cached), {
      headers: { "Content-Type": "application/json", "Cache-Control": "max-age=300" },
    }));
  } catch (_) {}

  // Optionally forward to backend (raw payment)
  const backendBase = String(env?.BACKEND_API_BASE || "").replace(/\/$/, "");
  const path = String(env?.BACKEND_MOLLIE_WEBHOOK_PATH || "/api/v1/billing/mollie/webhook");
  if (backendBase) {
    try {
      await fetch(backendBase + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: "cloudflare-pages", payment }),
      });
    } catch {
      // Swallow errors: webhook retries are handled by Mollie.
    }
  }

  // Optional: try to confirm/activate subscription in backend immediately.
  // This makes the paid→active path deterministic even if the backend webhook handler is not used.
  // Env:
  // - BACKEND_PAYMENT_CONFIRM_PATH (default: /api/v1/tenant/billing/confirm)
  // - BACKEND_PAYMENT_CONFIRM_TOKEN (optional shared secret header)
  if (backendBase && payment?.status === "paid") {
    try {
      const confirmPath = String(env?.BACKEND_PAYMENT_CONFIRM_PATH || "/api/v1/tenant/billing/confirm");
      const token = String(env?.BACKEND_PAYMENT_CONFIRM_TOKEN || "").trim();
      const headers = { "Content-Type": "application/json" };
      if (token) headers["X-Webhook-Token"] = token;
      await fetch(backendBase + confirmPath, {
        method: "POST",
        headers,
        body: JSON.stringify({ provider: "mollie", payment }),
      });
    } catch (_) {}
  }

  // Mollie expects 200 OK quickly
  return new Response("ok");
}
