/**
 * GET /api/onboarding/status
 * Returns hints for onboarding UI (company/email/seats) and next step URLs.
 *
 * Env:
 * - BACKEND_API_BASE (recommended)
 * - BACKEND_ONBOARDING_STATUS_PATH (optional; default /api/v1/tenant/status)
 * - BACKEND_AUTH_ME_PATH (optional; default /api/v1/auth/me or /api/v1/users/me depending on backend)
 */
function json(data, status=200){
  return new Response(JSON.stringify(data), {status, headers: {"content-type":"application/json; charset=utf-8"}});
}

export async function onRequestGet({request, env}) {
  const backend = String(env?.BACKEND_API_BASE || "").trim();
  if (!backend) {
    // fallback: use localStorage-driven onboarding
    return json({ ok:true, mode:"local", hint:{} });
  }

  const cookies = request.headers.get("cookie") || "";
  // pass-through cookie to backend (if backend uses session cookie) OR bearer token cookie; keep generic.
  const statusPath = String(env?.BACKEND_ONBOARDING_STATUS_PATH || "/api/v1/tenant/status").trim();
  const mePath = String(env?.BACKEND_AUTH_ME_PATH || "/api/v1/auth/me").trim();

  // Try status first, then me
  const tryFetch = async (path) => {
    const url = backend.replace(/\/$/, "") + path;
    const r = await fetch(url, {
      headers: {
        "accept":"application/json",
        "cookie": cookies,
      },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(()=>null);
    return j;
  };

  const status = await tryFetch(statusPath);
  const me = status ? null : await tryFetch(mePath);

  const hint = {};
  if (status) {
    const reasons = status.reasons || status.read_only_reasons || status.readOnlyReasons || [];
    hint.tenant = status.tenant || status;
    hint.status = (status.status || '').toString();
    hint.read_only = status.read_only ?? status.readOnly ?? false;
    hint.reasons = Array.isArray(reasons) ? reasons : [];
    hint.company = (status.company || status.tenant_name || status.name || '').toString();
    hint.seats = Number(status.seats_purchased || status.seats || status.seatsPurchased || 0) || undefined;
    hint.seatsPurchased = hint.seats;
    hint.trialUntil = (status.trial_until || status.trialUntil || '').toString() || undefined;
    hint.validUntil = (status.valid_until || status.validUntil || '').toString() || undefined;
    hint.subscriptionStatus = (status.mollie_subscription_status || status.subscription_status || '').toString() || undefined;
  }
  if (me) {
    hint.user = me.user || me;
    hint.email = (me.email || me.user?.email || "").toString();
    hint.company = hint.company || (me.tenant?.name || me.tenant_name || "").toString();
  }

  return json({ ok:true, mode:"backend", hint });
}
