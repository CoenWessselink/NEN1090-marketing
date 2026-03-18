const COOKIE_ACCESS = 'nen1090_access';
const COOKIE_REFRESH = 'nen1090_refresh';
const LEGACY_DEFAULT_AZURE_ORIGIN = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

const DEFAULT_BILLING_PATHS = {
  preview: '/api/v1/tenant/billing/preview',
  paymentLookup: '/api/v1/tenant/billing/payment-reference',
  paymentConfirm: '/api/v1/tenant/billing/confirm-payment',
  subscription: '/api/v1/tenant/billing/subscription',
  updateSubscription: '/api/v1/tenant/billing/update-subscription',
  cancelSubscription: '/api/v1/tenant/billing/cancel-subscription',
};

export function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach((part) => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(v.join('=') || '');
  });
  return out;
}

export function getBackendBase(env) {
  const explicit = String(env?.AZURE_API_ORIGIN || env?.BACKEND_API_BASE || '').trim().replace(/\/$/, '');
  if (explicit) return explicit;
  const allowLegacyDefault = String(env?.ALLOW_LEGACY_BACKEND_DEFAULT || '').trim() === '1';
  return allowLegacyDefault ? LEGACY_DEFAULT_AZURE_ORIGIN : '';
}

export function requireBackendBase(env) {
  const base = getBackendBase(env);
  if (!base) throw new Error('BACKEND_API_BASE_REQUIRED');
  return base;
}

export function getBillingPath(env, key, envName) {
  const preferred = String(env?.[envName] || '').trim();
  if (preferred) return preferred;
  return DEFAULT_BILLING_PATHS[key] || '';
}

export function resolveBillingCandidates(env, key, envName, legacyFallbacks = []) {
  const preferred = getBillingPath(env, key, envName);
  const candidates = preferred ? [preferred] : [];
  const allowLegacy = String(env?.ALLOW_BILLING_FALLBACK || '').trim() === '1';
  if (allowLegacy) {
    legacyFallbacks.filter(Boolean).forEach((path) => {
      if (!candidates.includes(path)) candidates.push(path);
    });
  }
  return candidates;
}

export async function readJsonSafe(res) {
  const text = await res.text().catch(() => '');
  try {
    return { ok: true, json: JSON.parse(text || '{}'), text };
  } catch {
    return { ok: false, json: null, text };
  }
}

export function ensureRequiredEnv(env, names = []) {
  const missing = names.filter((name) => !String(env?.[name] || '').trim());
  return { ok: missing.length === 0, missing };
}

export function normalizeBillingStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['paid', 'open', 'pending', 'authorized', 'failed', 'expired', 'canceled'].includes(status)) return status;
  return 'unknown';
}

export function normalizeSubscriptionStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (['active', 'trialing', 'past_due', 'canceled', 'incomplete'].includes(status)) return status;
  return 'active';
}

export async function refreshTokens(env, refreshToken) {
  if (!refreshToken) return null;
  const base = getBackendBase(env);
  if (!base) return null;
  const target = `${base}/api/v1/auth/refresh`;
  const res = await fetch(target, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;
  const { json } = await readJsonSafe(res);
  const access = json?.access_token || '';
  const refresh = json?.refresh_token || refreshToken;
  if (!access) return null;
  return { access, refresh };
}

export async function forwardWithAuth({ request, env, method = 'GET', body, pathCandidates = [] }) {
  const backendBase = getBackendBase(env);
  if (!backendBase) {
    return new Response(JSON.stringify({ ok: false, error: 'BACKEND_API_BASE_REQUIRED' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  const cookies = parseCookies(request.headers.get('Cookie') || '');
  let access = cookies[COOKIE_ACCESS] || '';
  const refresh = cookies[COOKIE_REFRESH] || '';
  const paths = pathCandidates.filter(Boolean);
  if (!paths.length) throw new Error('NO_PATH_CANDIDATES');

  async function attempt(path, accessToken) {
    const headers = new Headers({ Accept: 'application/json' });
    if (body !== undefined) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(backendBase + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  for (const path of paths) {
    let res = await attempt(path, access);
    if (res.status === 401 && refresh) {
      const tokens = await refreshTokens(env, refresh);
      if (tokens?.access) {
        access = tokens.access;
        res = await attempt(path, access);
      }
    }
    if (res.status !== 404) return res;
  }

  return new Response(JSON.stringify({ ok: false, error: 'BACKEND_BILLING_ROUTE_NOT_FOUND' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
