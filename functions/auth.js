/**
 * Cloudflare Pages Function: /auth
 * Legacy bridge (compat):
 * - Accepts token via querystring (?token=...)
 * - Sets HttpOnly cookie
 * - Redirects to `next` (default /app/dashboard.html)
 *
 * Let op: Nieuwe flow gebruikt /api/v1/auth/login via de universele proxy.
 *
 * Env (optional):
 * - COOKIE_DOMAIN (leave empty for default)
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const next = url.searchParams.get("next") || "/app/dashboard.html";

  if (!token) {
    // No token: send to login
    const login = new URL("/app/login.html", url.origin);
    login.searchParams.set("next", next);
    return Response.redirect(login.toString(), 302);
  }

  const domain = (env?.COOKIE_DOMAIN || "").trim();

  const cookie = [
    `nen1090_access=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    // 7 days default
    "Max-Age=604800",
  ];
  if (domain) cookie.push(`Domain=${domain}`);
  // Secure only on https
  if (url.protocol === 'https:') cookie.splice(3, 0, 'Secure');

  const res = Response.redirect(new URL(next, url.origin).toString(), 302);
  res.headers.append("Set-Cookie", cookie.join("; "));
  return res;
}
