/**
 * Cloudflare Pages Function: /auth
 * Canonieke marketing token bridge voor onboarding, activatie en reset.
 *
 * Regels:
 * - redirect altijd naar de app-origin
 * - geen relatieve /app/* routes op marketing
 * - activate/set-password landen op /activate-account
 * - reset-password landt op /reset-password
 * - normale token-login zet HttpOnly cookie en gaat naar volgende app-route
 */

const DEFAULT_APP_ORIGIN = "https://app.weldinspectpro.com";

function getAppOrigin(env) {
  const origin = String(env?.APP_ORIGIN || env?.FRONTEND_URL || env?.APP_URL || "").trim();
  return (origin || DEFAULT_APP_ORIGIN).replace(/\/+$/, "");
}

function buildCookie(token, requestUrl, domain) {
  const url = new URL(requestUrl);
  const parts = [
    `nen1090_access=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800"
  ];

  if (url.protocol === "https:") {
    parts.push("Secure");
  }

  if (domain) {
    parts.push(`Domain=${domain}`);
  }

  return parts.join("; ");
}

function sanitizeNext(nextValue) {
  const fallback = "/dashboard";
  const value = String(nextValue || "").trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

function redirectResponse(location, cookieValue) {
  const headers = new Headers();
  headers.set("Location", location);

  if (cookieValue) {
    headers.append("Set-Cookie", cookieValue);
  }

  return new Response(null, { status: 302, headers });
}

function redirectWithToken(appOrigin, pathname, token) {
  const target = new URL(pathname, appOrigin);
  target.searchParams.set("token", token);
  return redirectResponse(target.toString());
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const appOrigin = getAppOrigin(env);
  const token = (url.searchParams.get("token") || "").trim();
  const mode = (url.searchParams.get("mode") || "").trim();
  const domain = (env?.COOKIE_DOMAIN || "").trim();

  if (!token) {
    const target = new URL("/login", appOrigin);
    target.searchParams.set("message", "Sessie niet beschikbaar");
    return redirectResponse(target.toString());
  }

  if (mode === "activate" || mode === "set-password") {
    return redirectWithToken(appOrigin, "/activate-account", token);
  }

  if (mode === "reset-password") {
    return redirectWithToken(appOrigin, "/reset-password", token);
  }

  const destination = sanitizeNext(url.searchParams.get("next"));
  const target = new URL(destination, appOrigin);
  const cookieValue = buildCookie(token, request.url, domain);

  return redirectResponse(target.toString(), cookieValue);
}
