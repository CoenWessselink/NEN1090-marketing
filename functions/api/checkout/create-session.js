import { ensureRequiredEnv, getBillingPath, requireBackendBase } from '../../_shared/backend-auth.js';

const PLAN_MATRIX = {
  starter: { monthlyPerSeat: 29, yearlyPerSeat: 24, minSeats: 3, label: 'Starter' },
  professional: { monthlyPerSeat: 49, yearlyPerSeat: 42, minSeats: 5, label: 'Professional' },
  enterprise: { monthlyPerSeat: 69, yearlyPerSeat: 59, minSeats: 10, label: 'Enterprise' },
};

function createOrderRef() {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `nen1090_${stamp}_${random}`;
}

async function persistPaymentReference(orderRef, payload) {
  if (!orderRef) return;
  try {
    const cacheKey = new Request(`https://nen1090.local/checkout/ref/${encodeURIComponent(orderRef)}`);
    await caches.default.put(cacheKey, new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=86400',
      },
    }));
  } catch (_) {}
}

async function verifyTurnstile(env, token, ip) {
  const secret = String(env?.TURNSTILE_SECRET || '').trim();
  const requireTurnstile = String(env?.REQUIRE_TURNSTILE || '1').trim() !== '0';
  if (!secret) {
    return requireTurnstile ? { ok: false, error: 'TURNSTILE_NOT_CONFIGURED' } : { ok: true, skipped: true };
  }
  if (requireTurnstile && !token) return { ok: false, error: 'TURNSTILE_REQUIRED' };
  const form = new FormData();
  form.append('secret', secret);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const json = await res.json().catch(() => ({}));
  return { ok: !!json.success, detail: json };
}

async function rateLimit({ request, env, keyPrefix }) {
  const limit = Math.max(1, Number(env?.RATE_LIMIT_PER_MIN || 20));
  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const bucket = Math.floor(Date.now() / 60000);
  const key = new Request(`https://rate.limit/${keyPrefix}/${ip}/${bucket}`);
  const cache = caches.default;
  const existing = await cache.match(key);
  const count = existing ? Number(await existing.text()) : 0;
  const next = count + 1;
  await cache.put(key, new Response(String(next), { headers: { 'Cache-Control': 'max-age=60' } }));
  return { ok: next <= limit, ip, count: next, limit };
}

function getPlanConfig(planKey) {
  return PLAN_MATRIX[String(planKey || '').trim()] || PLAN_MATRIX.professional;
}

function normalizeBilling(billing) {
  return String(billing || '').trim() === 'yearly' ? 'yearly' : 'monthly';
}

function buildPricing(planKey, billing, seats) {
  const config = getPlanConfig(planKey);
  const normalizedSeats = Math.max(config.minSeats, Math.max(1, Number(seats || 0) || config.minSeats));
  const normalizedBilling = normalizeBilling(billing);
  const seatPrice = normalizedBilling === 'yearly' ? config.yearlyPerSeat : config.monthlyPerSeat;
  const monthlySubtotal = normalizedSeats * seatPrice;
  const total = normalizedBilling === 'yearly' ? monthlySubtotal * 12 : monthlySubtotal;
  return {
    planKey: Object.keys(PLAN_MATRIX).find((key) => PLAN_MATRIX[key] === config) || 'professional',
    planLabel: config.label,
    billing: normalizedBilling,
    seats: normalizedSeats,
    seatPrice,
    monthlySubtotal,
    total,
    currency: 'EUR',
  };
}

function errorResponse(error, status = 400, extra = {}) {
  return new Response(JSON.stringify({ ok: false, error, ...extra }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ request, env }) {
  const rl = await rateLimit({ request, env, keyPrefix: 'checkout' });
  if (!rl.ok) return errorResponse('RATE_LIMIT', 429, { limit: rl.limit });

  const body = await request.json().catch(() => ({}));
  const company = String(body.company || '').trim();
  const contactName = String(body.contactName || '').trim();
  const email = String(body.email || '').trim();
  const phone = String(body.phone || '').trim();
  const notes = String(body.notes || '').trim();
  const source = String(body.source || 'marketing-checkout').trim();
  const turnstileToken = String(body.turnstileToken || '').trim();
  const acceptedTerms = String(body.acceptedTerms || body.acceptTerms || '1').trim() !== '0';

  if (!company) return errorResponse('COMPANY_REQUIRED');
  if (!contactName) return errorResponse('CONTACT_NAME_REQUIRED');
  if (!email) return errorResponse('EMAIL_REQUIRED');
  if (!acceptedTerms) return errorResponse('TERMS_REQUIRED');

  const ts = await verifyTurnstile(env, turnstileToken, rl.ip);
  if (!ts.ok) return errorResponse(ts.error || 'TURNSTILE_FAILED');

  const required = ensureRequiredEnv(env, ['CHECKOUT_RETURN_BASE']);
  if (!required.ok) return errorResponse('CHECKOUT_ENV_MISSING', 500, { missing: required.missing });

  const pricing = buildPricing(body.plan, body.billing, body.seats);
  const returnBase = String(env?.CHECKOUT_RETURN_BASE || '').trim().replace(/\/$/, '');
  const webhookUrl = String(env?.WEBHOOK_URL || '').trim() || `${returnBase}/api/mollie/webhook`;
  const orderRef = createOrderRef();
  const successUrl = `${returnBase}/success.html?orderRef=${encodeURIComponent(orderRef)}`;
  const cancelUrl = `${returnBase}/cancel.html?orderRef=${encodeURIComponent(orderRef)}&plan=${encodeURIComponent(pricing.planKey)}&billing=${encodeURIComponent(pricing.billing)}&seats=${pricing.seats}`;

  const mollieRequired = ensureRequiredEnv(env, ['MOLLIE_API_KEY']);
  const allowPlaceholder = String(env?.ALLOW_CHECKOUT_PLACEHOLDER || '').trim() === '1';
  if (!mollieRequired.ok && !allowPlaceholder) {
    return errorResponse('MOLLIE_CONFIG_REQUIRED', 500, { missing: mollieRequired.missing });
  }

  const backendPreviewPath = getBillingPath(env, 'preview', 'BACKEND_BILLING_PREVIEW_PATH');
  let previewReference = '';
  if (backendPreviewPath) {
    try {
      const backendBase = requireBackendBase(env);
      const previewRes = await fetch(`${backendBase}${backendPreviewPath.startsWith('/') ? backendPreviewPath : `/${backendPreviewPath}`}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          contact_name: contactName,
          email,
          phone,
          notes,
          source,
          plan: pricing.planKey,
          billing: pricing.billing,
          seats: pricing.seats,
          total: pricing.total,
          currency: pricing.currency,
          order_ref: orderRef,
        }),
      });
      if (previewRes.ok) {
        const previewJson = await previewRes.json().catch(() => ({}));
        previewReference = String(previewJson.orderRef || previewJson.order_ref || '').trim();
      }
    } catch (_) {}
  }

  if (!String(env?.MOLLIE_API_KEY || '').trim()) {
    return new Response(JSON.stringify({
      ok: true,
      mode: 'placeholder',
      checkoutReady: false,
      message: 'Mollie is nog niet geconfigureerd in deze omgeving.',
      orderRef,
      successUrl,
      cancelUrl,
      summary: pricing,
    }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  }

  const description = `CWS NEN-1090 ${pricing.planLabel} · ${pricing.seats} gebruiker(s) · ${company}`;
  const mollieRes = await fetch('https://api.mollie.com/v2/payments', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${String(env.MOLLIE_API_KEY).trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: { currency: pricing.currency, value: pricing.total.toFixed(2) },
      description,
      redirectUrl: successUrl,
      webhookUrl,
      metadata: {
        provider: 'mollie',
        source,
        company,
        contactName,
        email,
        phone,
        notes,
        orderRef,
        previewReference,
        plan: pricing.planKey,
        planLabel: pricing.planLabel,
        billing: pricing.billing,
        seats: pricing.seats,
        monthlySubtotal: pricing.monthlySubtotal,
        cancelUrl,
      },
    }),
  });

  const mollieText = await mollieRes.text();
  if (!mollieRes.ok) return errorResponse('MOLLIE_CREATE_FAILED', 502, { detail: mollieText.slice(0, 500) });

  let mollieJson = {};
  try {
    mollieJson = JSON.parse(mollieText);
  } catch {
    return errorResponse('MOLLIE_INVALID_RESPONSE', 502);
  }

  await persistPaymentReference(orderRef, {
    orderRef,
    paymentId: mollieJson?.id || '',
    previewReference,
    plan: pricing.planKey,
    billing: pricing.billing,
    seats: pricing.seats,
    createdAt: new Date().toISOString(),
  });

  return new Response(JSON.stringify({
    ok: true,
    mode: 'mollie',
    checkoutReady: true,
    checkoutUrl: mollieJson?._links?.checkout?.href || '',
    paymentId: mollieJson?.id || '',
    orderRef,
    successUrl,
    cancelUrl,
    summary: pricing,
  }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
