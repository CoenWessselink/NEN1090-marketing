const DEFAULT_BACKEND_API_BASE = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (!k) return;
    cookies[k] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

export async function onRequestGet({ request, env }) {
  const apiBase = (env && env.BACKEND_API_BASE) ? env.BACKEND_API_BASE : DEFAULT_BACKEND_API_BASE;
  const authHeader = request.headers.get("Authorization");
  const cookies = parseCookies(request);
  const cookieToken = cookies.nen1090_access;
  const bearer = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null);

  if (!bearer) {
    return json({ authenticated: false }, 200);
  }

  const url = new URL("/api/v1/auth/me", apiBase);
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: bearer,
    },
  });

  if (!res.ok) {
    return json({ authenticated: false }, 200);
  }

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = {}; }

  return json({
    authenticated: true,
    user: data,
  }, 200);
}
