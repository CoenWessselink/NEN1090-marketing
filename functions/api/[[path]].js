const DEFAULT_API_BASE_URL = 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net';

function getApiBase(env) {
  const value = env.API_BASE_URL || env.VITE_API_BASE_URL || env.WELDINSPECT_API_BASE_URL || DEFAULT_API_BASE_URL;
  return String(value).replace(/\/+$/, '');
}

function buildTargetUrl(request, env, pathSegments) {
  const apiBase = getApiBase(env);
  const incomingUrl = new URL(request.url);
  const path = Array.isArray(pathSegments) ? pathSegments.join('/') : String(pathSegments || '');
  const normalizedPath = path.startsWith('api/') ? path : `api/${path}`;
  return `${apiBase}/${normalizedPath}${incomingUrl.search}`;
}

function copyRequestHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('cf-connecting-ip');
  headers.delete('cf-ipcountry');
  headers.delete('cf-ray');
  headers.delete('cf-visitor');
  headers.delete('x-forwarded-proto');
  headers.delete('x-real-ip');
  return headers;
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'Authorization,Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const targetUrl = buildTargetUrl(request, env, params.path || []);
  const init = { method: request.method, headers: copyRequestHeaders(request), redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(request.method)) init.body = await request.arrayBuffer();

  try {
    const upstream = await fetch(targetUrl, init);
    const headers = new Headers(upstream.headers);
    Object.entries(corsHeaders(request)).forEach(([key, value]) => headers.set(key, value));
    headers.delete('content-encoding');
    return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers });
  } catch (error) {
    return Response.json({ error: { code: 'API_PROXY_FAILED', message: 'The marketing site could not reach the WeldInspect API.', detail: String(error && error.message ? error.message : error) } }, { status: 502, headers: corsHeaders(request) });
  }
}
