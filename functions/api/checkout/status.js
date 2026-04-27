/**
 * Cloudflare Pages Function: GET /api/checkout/status?paymentId=tr_... or ?orderRef=...
 */

import { getBillingPath, normalizeBillingStatus, requireBackendBase } from '../../_shared/backend-auth.js';

function json(status, obj, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

async function resolveOrderRef(orderRef, env) {
  if (!orderRef) return { orderRef: '' };

  try {
    const cacheKey = new Request(`https://nen1090.local/checkout/ref/${encodeURIComponent(orderRef)}`);
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      const data = await cached.json().catch(() => ({}));
      if (data && (data.paymentId || data.previewReference)) {
        return {
          orderRef,
          paymentId: String(data.paymentId || '').trim(),
          previewReference: String(data.previewReference || '').trim(),
          snapshot: data,
        };
      }
    }
  } catch (_) {}

  const lookupPath = getBillingPath(env, 'paymentLookup', 'BACKEND_BILLING_PAYMENT_LOOKUP_PATH');
  if (!lookupPath) return { orderRef };

  try {
    const r = await fetch(`${requireBackendBase(env)}${lookupPath.startsWith('/') ? lookupPath : `/${lookupPath}`}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ order_ref: orderRef, orderRef, reference: orderRef }),
    });
    const text = await r.text();
    let payload = {};
    try { payload = JSON.parse(text || '{}'); } catch {}
    if (r.ok) {
      return {
        orderRef,
        paymentId: String(payload.paymentId || payload.payment_id || '').trim(),
        previewReference: String(payload.previewReference || payload.preview_reference || '').trim(),
        backendStatus: normalizeBillingStatus(payload.status),
        snapshot: payload,
      };
    }
  } catch (_) {}

  return { orderRef };
}

async function loadMolliePayment(paymentId, env) {
  const apiKey = String(env?.MOLLIE_API_KEY || '').trim();
  if (!paymentId) return { ok: false, error: 'PAYMENT_ID_REQUIRED' };
  if (!apiKey) return { ok: false, error: 'MOLLIE_API_KEY_MISSING' };

  const mollieRes = await fetch(`https://api.mollie.com/v2/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const text = await mollieRes.text();
  let payment = {};
  try { payment = JSON.parse(text || '{}'); } catch { payment = { raw: text }; }
  if (!mollieRes.ok) return { ok: false, error: 'MOLLIE_STATUS_FAILED', detail: text.slice(0, 400), payment };
  return { ok: true, payment };
}

function normalizeConfirmPayload(payload = {}) {
  return {
    activated: !!(payload.activated || payload.isActivated || payload.is_activated || payload.tenantCreated || payload.tenant_created),
    needsOnboarding: !!(payload.needsOnboarding || payload.needs_onboarding),
    onboardingUrl: String(payload.onboardingUrl || payload.onboarding_url || '').trim() || null,
    activationStatus: String(payload.activationStatus || payload.activation_status || '').trim() || '',
    message: String(payload.message || '').trim() || '',
  };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const rawPaymentId = String(url.searchParams.get('paymentId') || url.searchParams.get('id') || '').trim();
  const orderRef = String(url.searchParams.get('orderRef') || url.searchParams.get('reference') || url.searchParams.get('orderId') || '').trim();
  if (!rawPaymentId && !orderRef) return json(400, { ok: false, error: 'PAYMENT_REFERENCE_REQUIRED' });

  const cacheKey = new Request(`https://nen1090.local/checkout/status/${encodeURIComponent(rawPaymentId || orderRef)}`);
  try {
    const cached = await caches.default.match(cacheKey);
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }
  } catch (_) {}

  const resolved = rawPaymentId ? { paymentId: rawPaymentId, orderRef } : await resolveOrderRef(orderRef, env);
  const paymentId = String(resolved.paymentId || rawPaymentId || '').trim();
  if (!paymentId) {
    return json(202, {
      ok: true,
      orderRef,
      paymentId: '',
      status: 'pending_reference',
      isPaid: false,
      activated: false,
      activationStatus: 'pending_reference',
      note: 'Betalingsreferentie nog niet gekoppeld aan deze bestelling.',
      backendLookup: resolved.snapshot || null,
      updatedAt: new Date().toISOString(),
    });
  }

  const mollie = await loadMolliePayment(paymentId, env);
  if (!mollie.ok) {
    if (mollie.error === 'MOLLIE_API_KEY_MISSING') {
      return json(500, { ok: false, error: 'MOLLIE_CONFIG_REQUIRED', orderRef, paymentId });
    }
    return json(502, { ok: false, error: mollie.error, detail: mollie.detail || null, orderRef, paymentId });
  }

  const payment = mollie.payment || {};
  const status = normalizeBillingStatus(payment?.status || resolved.backendStatus || 'unknown');
  const isPaid = status === 'paid';
  const confirmPath = getBillingPath(env, 'paymentConfirm', 'BACKEND_PAYMENT_CONFIRM_PATH');
  let backendResult = null;

  if (isPaid && confirmPath) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      const token = String(env?.BACKEND_PAYMENT_CONFIRM_TOKEN || '').trim();
      if (token) headers['X-Webhook-Token'] = token;
      const r = await fetch(`${requireBackendBase(env)}${confirmPath.startsWith('/') ? confirmPath : `/${confirmPath}`}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ provider: 'mollie', payment, order_ref: orderRef || payment?.metadata?.orderRef || '' }),
      });
      const text = await r.text();
      if (r.ok) {
        try { backendResult = JSON.parse(text || '{}'); } catch { backendResult = {}; }
      } else {
        backendResult = { status: r.status, message: text.slice(0, 400) };
      }
    } catch (error) {
      backendResult = { status: 500, message: String(error?.message || 'BACKEND_CONFIRM_FAILED') };
    }
  }

  const confirm = normalizeConfirmPayload(backendResult || {});
  const activationStatus = confirm.activationStatus || (confirm.activated ? 'activated' : isPaid ? 'pending_activation' : status);
  const out = {
    ok: true,
    orderRef: orderRef || payment?.metadata?.orderRef || '',
    paymentId,
    status,
    isPaid,
    activated: confirm.activated,
    activationStatus,
    needsOnboarding: confirm.needsOnboarding,
    onboardingUrl: confirm.onboardingUrl,
    message: confirm.message || null,
    metadata: payment?.metadata || null,
    checkoutUrl: payment?._links?.checkout?.href || null,
    dashboardUrl: '/app/login',
    backend: backendResult,
    updatedAt: new Date().toISOString(),
  };

  try {
    const maxAge = isPaid ? 300 : 60;
    await caches.default.put(cacheKey, new Response(JSON.stringify(out), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${maxAge}` },
    }));
  } catch (_) {}

  return json(200, out);
}
