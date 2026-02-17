/**
 * Cloudflare Pages Function: GET /api/checkout/status?paymentId=tr_...
 *
 * Purpose:
 * - Provide a single endpoint the success page can poll.
 * - Fetches Mollie payment status (if MOLLIE_API_KEY is set).
 * - If payment is PAID, it can (optionally) call the backend confirm endpoint
 *   to activate the tenant + seats and return a login URL.
 * - Uses short-lived edge cache to reduce Mollie API calls.
 *
 * Env:
 * - MOLLIE_API_KEY (required for Mollie status)
 * - BACKEND_API_BASE (optional)
 * - BACKEND_PAYMENT_CONFIRM_PATH (optional, default /api/v1/tenant/billing/confirm)
 * - BACKEND_PAYMENT_CONFIRM_TOKEN (optional shared secret header)
 */

function json(status, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const paymentId = String(url.searchParams.get("paymentId") || "").trim();
  if (!paymentId) return json(400, { ok: false, error: "PAYMENT_ID_REQUIRED" });

  // Try cache first
  try {
    const cacheKey = new Request(`https://nen1090.local/checkout/status/${encodeURIComponent(paymentId)}`);
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const cj = await cached.json().catch(() => null);
      if (cj && cj.ok) return json(200, { ...cj, cached: true });
    }
  } catch (_) {}

  const apiKey = String(env?.MOLLIE_API_KEY || "").trim();
  if (!apiKey) {
    return json(200, { ok: true, paymentId, status: "unknown", isPaid: false, activated: false, note: "MOLLIE_API_KEY not configured" });
  }

  // Fetch payment from Mollie
  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });
  const mollieTxt = await mollieRes.text();
  if (!mollieRes.ok) return json(502, { ok: false, error: "MOLLIE_FETCH_FAILED", detail: mollieTxt.slice(0, 400) });

  let payment;
  try { payment = JSON.parse(mollieTxt); } catch { payment = { raw: mollieTxt }; }

  const status = payment?.status || "unknown";
  const isPaid = status === "paid";

  const backendBase = String(env?.BACKEND_API_BASE || "").trim().replace(/\/$/, "");
  const confirmPath = String(env?.BACKEND_PAYMENT_CONFIRM_PATH || "/api/v1/tenant/billing/confirm");
  const token = String(env?.BACKEND_PAYMENT_CONFIRM_TOKEN || "").trim();

  let activated = false;
  let backendResult = null;
  // If paid and backend available, attempt activation/confirmation.
  if (isPaid && backendBase) {
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["X-Webhook-Token"] = token;
      const r = await fetch(backendBase + confirmPath, {
        method: "POST",
        headers,
        body: JSON.stringify({ provider: "mollie", payment }),
      });
      const t = await r.text();
      if (r.ok) {
        activated = true;
        try { backendResult = JSON.parse(t); } catch { backendResult = { raw: t }; }
      } else {
        backendResult = { ok: false, status: r.status, detail: t.slice(0, 400) };
      }
    } catch (e) {
      backendResult = { ok: false, error: "BACKEND_CONFIRM_FAILED" };
    }
  }

  const out = {
    ok: true,
    paymentId,
    status,
    isPaid,
    activated,
    // Optional: backend can return a signal that onboarding (admin creation / set password) is required.
    needsOnboarding: !!(backendResult && (backendResult.needs_onboarding || backendResult.needsOnboarding)),
    onboardingUrl: (backendResult && (backendResult.onboarding_url || backendResult.onboardingUrl)) || null,
    metadata: payment?.metadata || null,
    backend: backendResult,
    updatedAt: new Date().toISOString(),
  };

  // Cache for 60s if not paid, 5m if paid.
  try {
    const cacheKey = new Request(`https://nen1090.local/checkout/status/${encodeURIComponent(paymentId)}`);
    const maxAge = isPaid ? 300 : 60;
    await caches.default.put(cacheKey, new Response(JSON.stringify(out), {
      headers: { "Content-Type": "application/json", "Cache-Control": `max-age=${maxAge}` },
    }));
  } catch (_) {}

  return json(200, out);
}
