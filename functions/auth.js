/**
 * Cloudflare Pages Function: /auth
 * Simpele en robuuste token bridge voor magic links, onboarding en reset flows.
 *
 * Belangrijk:
 * - redirect responses worden handmatig opgebouwd
 * - Set-Cookie wordt direct in de response headers gezet
 * - voorkomt 1101 door mutatie van Response.redirect()
 */

function getAppOrigin(env) {
  const origin = String(env?.APP_ORIGIN || "").trim();
  if (!origin) {
    return "https://nen-1090-app.pages.dev";
  }
  return origin.replace(/\/+$/, "");
}

function buildCookie(token, requestUrl, domain) {
  const url = new URL(requestUrl);
  const parts = [
    `nen1090_access=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=604800",
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

  return new Response(null, {
    status: 302,
    headers,
  });
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

  if (mode === "set-password") {
    const target = new URL("/set-password", appOrigin);
    target.searchParams.set("token", token);
    return redirectResponse(target.toString());
  }

  if (mode === "reset-password") {
    const target = new URL("/reset-password", appOrigin);
    target.searchParams.set("token", token);
    return redirectResponse(target.toString());
  }

  const destination = sanitizeNext(url.searchParams.get("next"));
  const target = new URL(destination, appOrigin);
  const cookieValue = buildCookie(token, request.url, domain);

  return redirectResponse(target.toString(), cookieValue);
}