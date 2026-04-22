/**
 * Cloudflare Pages Function: /auth
 * Token bridge for magic links and onboarding/reset flows.
 *
 * Redirects altijd naar de app-origin in plaats van relatieve /app/* routes op marketing.
 * Hierdoor landen set-password/reset-password/login niet meer per ongeluk op marketing zelf.
 */

function getAppOrigin(env) {
  const origin = String(env?.APP_ORIGIN || '').trim();
  if (!origin) {
    return 'https://nen-1090-app.pages.dev';
  }
  return origin.replace(/\/+$/, '');
}

function buildCookie(token, requestUrl, domain) {
  const url = new URL(requestUrl);
  const parts = [
    `nen1090_access=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=604800',
  ];

  if (url.protocol === 'https:') {
    parts.splice(3, 0, 'Secure');
  }

  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  return parts.join('; ');
}

function sanitizeNext(next) {
  const fallback = '/dashboard';
  const value = String(next || '').trim();

  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  return value;
}

function redirectWithToken(appOrigin, pathname, token) {
  const target = new URL(pathname, appOrigin);
  target.searchParams.set('token', token);
  return Response.redirect(target.toString(), 302);
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const appOrigin = getAppOrigin(env);
  const token = (url.searchParams.get('token') || '').trim();
  const mode = (url.searchParams.get('mode') || '').trim();
  const domain = (env?.COOKIE_DOMAIN || '').trim();

  if (!token) {
    const target = new URL('/login', appOrigin);
    target.searchParams.set('message', 'Sessie niet beschikbaar');
    return Response.redirect(target.toString(), 302);
  }

  if (mode === 'set-password') {
    return redirectWithToken(appOrigin, '/set-password', token);
  }

  if (mode === 'reset-password') {
    return redirectWithToken(appOrigin, '/reset-password', token);
  }

  const destination = sanitizeNext(url.searchParams.get('next'));
  const response = Response.redirect(new URL(destination, appOrigin).toString(), 302);
  response.headers.append('Set-Cookie', buildCookie(token, request.url, domain));
  return response;
}
