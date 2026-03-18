/**
 * Cloudflare Pages Function: /logout
 * Clears auth cookies and redirects to the aligned logout/login experience.
 */

function baseCookieParts(url) {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0'];
  if (new URL(url).protocol === 'https:') parts.splice(2, 0, 'Secure');
  return parts;
}

function sanitizeNext(url, fallback) {
  const next = (url.searchParams.get('next') || '').trim();
  if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
  return next;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const domain = (env?.COOKIE_DOMAIN || '').trim();
  const fallback = '/app/login.html?logout=1';
  const target = new URL(sanitizeNext(url, fallback), url.origin);
  const res = Response.redirect(target.toString(), 302);

  const cookieNames = ['nen1090_access', 'nen1090_refresh', 'nen1090_token'];
  const base = baseCookieParts(request.url);

  cookieNames.forEach((name) => {
    const parts = [`${name}=`, ...base];
    if (domain) parts.push(`Domain=${domain}`);
    res.headers.append('Set-Cookie', parts.join('; '));
  });

  return res;
}
