/**
 * Cloudflare Pages Function: /auth
 * Simpele en robuuste token bridge voor magic links, onboarding en reset flows.
 *
 * Doel:
 * - Altijd redirecten naar de echte app-origin
 * - Geen relatieve /app/* routes op marketing
 * - Minimale Cloudflare Pages runtime-complexiteit
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

function redirect(url, status = 302) {
  return Response.redirect(url, status);
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
    return redirect(target.toString());
  }

  if (mode === "set-password") {
    const target = new URL("/set-password", appOrigin);
    target.searchParams.set("token", token);
    return redirect(target.toString());
  }

  if (mode === "reset-password") {
    const target = new URL("/reset-password", appOrigin);
    target.searchParams.set("token", token);
    return redirect(target.toString());
  }

  const destination = sanitizeNext(url.searchParams.get("next"));
  const target = new URL(destination, appOrigin);

  const response = redirect(target.toString());
  response.headers.append("Set-Cookie", buildCookie(token, request.url, domain));
  return response;
}