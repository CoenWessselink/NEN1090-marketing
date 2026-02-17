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

export async function onRequestPost(ctx) {
  try {
    const body = await ctx.request.json().catch(() => ({}));
    const token = String(body.token || '').trim();
    const password = String(body.password || '');

    if (!token || !password || password.length < 12) {
      return json({ ok: false, error: 'token en wachtwoord (min 12 tekens) zijn verplicht' }, 400);
    }

    const apiBase = (ctx.env && ctx.env.BACKEND_API_BASE) ? String(ctx.env.BACKEND_API_BASE) : '';
    const path = (ctx.env && ctx.env.BACKEND_ONBOARDING_SET_PASSWORD_PATH)
      ? String(ctx.env.BACKEND_ONBOARDING_SET_PASSWORD_PATH)
      : '/api/v1/auth/set-password';

    if (!apiBase) {
      // Placeholder: store nothing, just pretend success.
      return json({ ok: true, loginUrl: './app/login.html', note: 'BACKEND_API_BASE niet gezet; placeholder.' });
    }

    const r = await fetch(joinUrl(apiBase, path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const data = await r.json().catch(() => ({}));
    return json({ ok: r.ok && !!data.ok, ...data }, r.ok ? 200 : (r.status || 500));
  } catch (_e) {
    return json({ ok: false, error: 'server_error' }, 500);
  }
}

function joinUrl(base, path) {
  const b = base.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : '/' + path;
  return b + p;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
