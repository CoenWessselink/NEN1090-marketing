import { forwardWithAuth, json, readJsonSafe, resolveBillingCandidates } from '../../_shared/backend-auth.js';

function normalizeUpdateResult(payload = {}) {
  return {
    message: String(payload.message || payload.detail || 'Abonnement bijgewerkt.').trim(),
    status: String(payload.status || payload.subscriptionStatus || payload.subscription_status || 'updated').trim().toLowerCase(),
    effectiveAt: String(payload.effectiveAt || payload.effective_at || '').trim() || null,
    portalUrl: String(payload.portalUrl || payload.portal_url || '').trim() || null,
  };
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const plan = String(body.plan || '').trim();
  const billing = String(body.billing || '').trim() === 'yearly' ? 'yearly' : 'monthly';
  const seats = Math.max(1, Number(body.seats || 0) || 0);

  if (!plan) return json(400, { ok: false, error: 'PLAN_REQUIRED' });
  if (!seats) return json(400, { ok: false, error: 'SEATS_REQUIRED' });

  const res = await forwardWithAuth({
    ...context,
    method: 'POST',
    body: { plan, billing, seats },
    pathCandidates: resolveBillingCandidates(context.env, 'updateSubscription', 'BACKEND_BILLING_UPDATE_PATH', [
      '/api/v1/billing/update-subscription',
      '/api/v1/account/billing/update-subscription',
    ]),
  });

  const parsed = await readJsonSafe(res);
  if (!res.ok) {
    const mapped = res.status === 401 ? 'SESSION_REQUIRED' : res.status === 403 ? 'FORBIDDEN' : res.status === 409 ? 'SUBSCRIPTION_CONFLICT' : res.status === 422 ? 'VALIDATION_ERROR' : 'SUBSCRIPTION_UPDATE_FAILED';
    return json(res.status, { ok: false, error: mapped, detail: parsed.text.slice(0, 600) });
  }

  return json(200, { ok: true, result: normalizeUpdateResult(parsed.json || {}) });
}
