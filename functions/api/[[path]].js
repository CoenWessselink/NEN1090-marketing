const API_BASE_URL = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

function apiBase(env = {}) {
  return String(env.API_BASE_URL || env.VITE_API_BASE_URL || env.WELDINSPECT_API_BASE_URL || API_BASE_URL).replace(/\/+$/, '');
}

function routePath(paramsPath) {
  const raw = Array.isArray(paramsPath) ? paramsPath.filter(Boolean).join('/') : String(paramsPath || '').replace(/^\/+/, '');
  return raw.startsWith('api/') ? raw : `api/${raw}`;
}

function cors(request) {
  const origin = request.headers.get('Origin') || 'https://weldinspectpro.com';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Authorization,Content-Type,Accept,X-WIP-Visitor',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(request, status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...cors(request),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'X-WIP-Proxy-Version': '2026-04-30-hard-buffered'
    }
  });
}

function forwardHeaders(request) {
  const headers = new Headers(request.headers);
  for (const name of [
    'host', 'connection', 'content-length', 'content-encoding', 'transfer-encoding',
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor', 'x-real-ip', 'x-forwarded-proto'
  ]) headers.delete(name);
  headers.set('Accept', request.headers.get('Accept') || 'application/json');
  headers.set('X-Forwarded-Host', new URL(request.url).host);
  headers.set('X-Forwarded-Proto', 'https');
  return headers;
}

async function fetchUpstream(url, init, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('proxy_timeout'), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function onRequest(context) {
  const { request, env, params } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(request) });
  }

  const url = new URL(request.url);
  const targetUrl = `${apiBase(env)}/${routePath(params.path || [])}${url.search}`;

  let upstream;
  try {
    upstream = await fetchUpstream(targetUrl, {
      method: request.method,
      headers: forwardHeaders(request),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: 'manual'
    });
  } catch (error) {
    return jsonResponse(request, 502, {
      ok: false,
      success: false,
      error: {
        code: 'API_PROXY_FETCH_FAILED',
        message: 'Cloudflare kon de WeldInspect API niet bereiken.',
        detail: String(error && error.message ? error.message : error),
        target_url: targetUrl
      }
    });
  }

  let body;
  try {
    body = await upstream.arrayBuffer();
  } catch (error) {
    return jsonResponse(request, 502, {
      ok: false,
      success: false,
      error: {
        code: 'API_PROXY_INCOMPLETE_ORIGIN_RESPONSE',
        message: 'De WeldInspect API gaf een incomplete response terug.',
        detail: String(error && error.message ? error.message : error),
        target_url: targetUrl,
        upstream_status: upstream.status
      }
    });
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(cors(request))) headers.set(key, value);
  headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8');
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('X-WIP-Proxy-Target', apiBase(env));
  headers.set('X-WIP-Proxy-Version', '2026-04-30-hard-buffered');
  headers.set('X-WIP-Proxy-Buffered', '1');

  return new Response(body, { status: upstream.status, statusText: upstream.statusText, headers });
}
