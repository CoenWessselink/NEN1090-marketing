import { forwardWithAuth, json, readJsonSafe, resolveBillingCandidates } from '../../_shared/backend-auth.js';

function normalizeCancelResult(payload = {}) {
  return {
    message: String(payload.message || payload.detail || 'Abonnement wordt stopgezet volgens backend-instellingen.').trim(),
    status: String(payload.status || payload.subscriptionStatus || payload.subscription_status || 'cancel_pending').trim().toLowerCase(),
    effectiveAt: String(payload.effectiveAt || payload.effective_at || '').trim() || null,
    cancelAtPeriodEnd: !!(payload.cancelAtPeriodEnd || payload.cancel_at_period_end),
  };
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => ({}));
  const reason = String(body.reason || '').trim();
  const immediate = String(body.immediate || '0').trim() === '1';

  const res = await forwardWithAuth({
    ...context,
    method: 'POST',
    body: { reason, immediate },
    pathCandidates: resolveBillingCandidates(context.env, 'cancelSubscription', 'BACKEND_BILLING_CANCEL_PATH', [
      '/api/v1/billing/cancel-subscription',
      '/api/v1/account/billing/cancel-subscription',
    ]),
  });

  const parsed = await readJsonSafe(res);
  if (!res.ok) {
    const mapped = res.status === 401 ? 'SESSION_REQUIRED' : res.status === 403 ? 'FORBIDDEN' : res.status === 409 ? 'SUBSCRIPTION_CONFLICT' : res.status === 422 ? 'VALIDATION_ERROR' : 'SUBSCRIPTION_CANCEL_FAILED';
    return json(res.status, { ok: false, error: mapped, detail: parsed.text.slice(0, 600) });
  }

  return json(200, { ok: true, result: normalizeCancelResult(parsed.json || {}) });
}
