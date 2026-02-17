/**
 * Cloudflare Pages Function: /logout
 * Clears the auth cookie and redirects to homepage.
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const domain = (env?.COOKIE_DOMAIN || "").trim();

  const res = Response.redirect(new URL("/", url.origin).toString(), 302);

  // Clear both new cookies + legacy cookie.
  const base = ["Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (url.protocol === 'https:') base.splice(2, 0, 'Secure');
  const cookies = [
    [`nen1090_access=`, ...base],
    [`nen1090_refresh=`, ...base],
    [`nen1090_token=`, ...base],
  ];
  cookies.forEach(parts => {
    if (domain) parts.push(`Domain=${domain}`);
    res.headers.append('Set-Cookie', parts.join('; '));
  });
  return res;
}
