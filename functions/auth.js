/**
 * Cloudflare Pages Function: /auth
 * Token bridge for magic links and onboarding/reset flows.
 *
 * Supported behaviour:
 * - ?token=...&mode=set-password   -> redirect to /set-password.html?token=...
 * - ?token=...&mode=reset-password -> redirect to /app/reset-password?token=...
 * - ?token=...&next=/app/...       -> set HttpOnly auth cookie and continue
 * - without token                  -> redirect to canonical marketing login with clear message
 */

function buildCookie(token, requestUrl, domain) {
  const url = new URL(requestUrl);
  const parts = [
    `nen1090_access=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800',
  ];
  if (url.protocol === 'https:') parts.splice(3, 0, 'Secure');
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}

function sanitizeNext(next) {
  const fallback = '/dashboard';
  const value = String(next || '').trim();
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

function redirectWithToken(origin, pathname, token) {
  const target = new URL(pathname, origin);
  target.searchParams.set('token', token);
  return Response.redirect(target.toString(), 302);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = (url.searchParams.get('token') || '').trim();
  const mode = (url.searchParams.get('mode') || '').trim();
  const domain = (env?.COOKIE_DOMAIN || '').trim();

  if (!token) {
    return Response.redirect(new URL('/app/login?message=Sessie%20niet%20beschikbaar', url.origin).toString(), 302);
  }

  if (mode === 'set-password') {
    return redirectWithToken(url.origin, '/app/set-password', token);
  }

  if (mode === 'reset-password') {
    return redirectWithToken(url.origin, '/app/reset-password', token);
  }

  const destination = sanitizeNext(url.searchParams.get('next'));
  const response = Response.redirect(new URL(destination, url.origin).toString(), 302);
  response.headers.append('Set-Cookie', buildCookie(token, request.url, domain));
  return response;
}
