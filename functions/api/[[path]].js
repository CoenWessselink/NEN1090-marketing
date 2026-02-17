// Cloudflare Pages Function - universal API proxy for NEN1090
// - Frontend calls: /api/v1/... (same origin)
// - Proxy forwards 1:1 to Azure backend
// - Handles HttpOnly cookie auth (access + refresh)
//
// Cookie names
const COOKIE_ACCESS = 'nen1090_access';
const COOKIE_REFRESH = 'nen1090_refresh';

// Azure backend base (no trailing slash)
// You can override in Wrangler/Pages env as AZURE_API_ORIGIN
// (BACKEND_API_BASE is kept for backward compatibility)
const DEFAULT_AZURE_ORIGIN = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

function parseCookies(cookieHeader = '') {
  const out = {};
  cookieHeader.split(';').forEach(part => {
    const [k, ...v] = part.trim().split('=');
    if (!k) return;
    out[k] = decodeURIComponent(v.join('=') || '');
  });
  return out;
}

function isHttps(url) {
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}

function cookieAttrs(reqUrl) {
  // Secure only when running on https (Pages). Wrangler dev is usually http.
  const secure = isHttps(reqUrl) ? '; Secure' : '';
  return `; HttpOnly; SameSite=Lax; Path=/${secure}`;
}

function setCookieHeader(name, value, reqUrl, maxAgeSeconds) {
  const base = `${name}=${encodeURIComponent(value || '')}${cookieAttrs(reqUrl)}`;
  if (typeof maxAgeSeconds === 'number') return `${base}; Max-Age=${maxAgeSeconds}`;
  return base;
}

async function readJsonSafe(res) {
  const txt = await res.text().catch(() => '');
  try { return { ok: true, json: JSON.parse(txt || '{}'), text: txt }; } catch {
    return { ok: false, json: null, text: txt };
  }
}

async function forward(req, env, extraHeaders = {}) {
  const u = new URL(req.url);
  const azureOrigin = (env && (env.AZURE_API_ORIGIN || env.BACKEND_API_BASE)) || DEFAULT_AZURE_ORIGIN;
  const target = new URL(u.pathname + u.search, azureOrigin);

  // Clone headers, but avoid forwarding hop-by-hop headers.
  const h = new Headers(req.headers);
  h.delete('host');
  h.delete('connection');
  h.delete('content-length');

  // Apply any extra headers (e.g., Authorization)
  for (const [k, v] of Object.entries(extraHeaders || {})) {
    if (v === null || typeof v === 'undefined' || v === '') h.delete(k);
    else h.set(k, v);
  }

  // Keep method/body 1:1
  const init = {
    method: req.method,
    headers: h,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
    redirect: 'manual'
  };

  return fetch(target.toString(), init);
}

async function refreshTokens(req, env, refreshToken) {
  if (!refreshToken) return null;
  const u = new URL(req.url);
  const azureOrigin = (env && (env.AZURE_API_ORIGIN || env.BACKEND_API_BASE)) || DEFAULT_AZURE_ORIGIN;
  const target = new URL('/api/v1/auth/refresh', azureOrigin);

  const res = await fetch(target.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  if (!res.ok) return null;
  const { json } = await readJsonSafe(res);
  const access = json?.access_token;
  const refresh = json?.refresh_token || refreshToken;
  if (!access) return null;
  return { access, refresh };
}

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get('Cookie') || '');
  const access = cookies[COOKIE_ACCESS] || '';
  const refresh = cookies[COOKIE_REFRESH] || '';

  // Provide a local logout that just clears cookies.
  if (url.pathname === '/api/v1/auth/logout') {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': [
          setCookieHeader(COOKIE_ACCESS, '', request.url, 0),
          setCookieHeader(COOKIE_REFRESH, '', request.url, 0)
        ].join(', ')
      }
    });
  }

  // For login: forward to Azure, then set HttpOnly cookies based on the JSON response.
  if (url.pathname === '/api/v1/auth/login' && request.method === 'POST') {
    const res = await forward(request, env);
    const clone = res.clone();
    const parsed = await readJsonSafe(clone);
    if (!res.ok || !parsed.ok) {
      // pass-through error response
      return res;
    }
    const token = parsed.json?.access_token || parsed.json?.token || parsed.json?.jwt || '';
    const rtoken = parsed.json?.refresh_token || '';
    if (!token) return res;

    const headers = new Headers(res.headers);
    // Set cookies (access + refresh)
    const setCookies = [setCookieHeader(COOKIE_ACCESS, token, request.url)];
    if (rtoken) setCookies.push(setCookieHeader(COOKIE_REFRESH, rtoken, request.url));
    // Cloudflare requires separate Set-Cookie headers; but Pages Functions merges them.
    // We append in a safe way.
    headers.append('Set-Cookie', setCookies[0]);
    if (setCookies[1]) headers.append('Set-Cookie', setCookies[1]);

    return new Response(parsed.text, { status: res.status, headers });
  }

  // For refresh: read refresh cookie if client didn't provide a refresh_token.
  if (url.pathname === '/api/v1/auth/refresh' && request.method === 'POST') {
    let body = {};
    try { body = await request.clone().json(); } catch { body = {}; }
    const rt = body.refresh_token || refresh;
    if (!rt) return new Response(JSON.stringify({ error: 'no_refresh_token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    // Call Azure refresh
    const azureRes = await refreshTokens(request, env, rt);
    if (!azureRes) return new Response(JSON.stringify({ error: 'refresh_failed' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const headers = new Headers({ 'Content-Type': 'application/json' });
    headers.append('Set-Cookie', setCookieHeader(COOKIE_ACCESS, azureRes.access, request.url));
    headers.append('Set-Cookie', setCookieHeader(COOKIE_REFRESH, azureRes.refresh, request.url));
    return new Response(JSON.stringify({ access_token: azureRes.access, refresh_token: azureRes.refresh }), { status: 200, headers });
  }

  // For all other requests: attach Authorization when cookie exists.
  let authHeader = null;
  if (access) authHeader = `Bearer ${access}`;

  let res = await forward(request, env, authHeader ? { Authorization: authHeader } : {});

  // If unauthorized and refresh cookie exists: try refresh once, then retry.
  if (res.status === 401 && refresh) {
    const tokens = await refreshTokens(request, env, refresh);
    if (tokens?.access) {
      res = await forward(request, env, { Authorization: `Bearer ${tokens.access}` });
      // Add updated cookies to the response
      const headers = new Headers(res.headers);
      headers.append('Set-Cookie', setCookieHeader(COOKIE_ACCESS, tokens.access, request.url));
      headers.append('Set-Cookie', setCookieHeader(COOKIE_REFRESH, tokens.refresh || refresh, request.url));
      return new Response(res.body, { status: res.status, headers });
    }
  }

  return res;
}
