/**
 * POST /api/onboarding/set-password
 * Sets password using an invite/onboarding token.
 *
 * Expected JSON body:
 * { token: string, password: string }
 *
 * Env:
 * - BACKEND_API_BASE
 * - BACKEND_ONBOARDING_SET_PASSWORD_PATH (default: /api/v1/auth/set-password)
 */

const DEFAULT_BACKEND_API_BASE = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

export async function onRequestPost(ctx) {
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const password = String(body.password || '');

    if (!token || !password || password.length < 12) {
      return json({ ok: false, error: 'token en wachtwoord (minimaal 12 tekens) zijn verplicht' }, 400);
    }

    const apiBase = String(ctx.env?.BACKEND_API_BASE || DEFAULT_BACKEND_API_BASE).trim();
    const path = String(ctx.env?.BACKEND_ONBOARDING_SET_PASSWORD_PATH || '/api/v1/auth/set-password').trim();

    const upstream = await fetch(joinUrl(apiBase, path), {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'accept': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    const text = await upstream.text().catch(() => '');
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { detail: text }; }

    const ok = upstream.ok && (data.ok !== false);
    return json({ ok, ...data }, upstream.status || (ok ? 200 : 500));
  } catch (_error) {
    return json({ ok: false, error: 'server_error' }, 500);
  }
}

function joinUrl(base, path) {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return b + p;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
