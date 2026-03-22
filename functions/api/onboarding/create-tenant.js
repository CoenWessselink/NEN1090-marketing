const DEFAULT_BACKEND_API_BASE = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

function joinUrl(base, path) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\//, "");
  return `${b}/${p}`;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiBase = env.BACKEND_API_BASE || DEFAULT_BACKEND_API_BASE;

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const url = joinUrl(apiBase, "api/v1/onboarding/create-tenant");
  const resp = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const text = await resp.text();
  return new Response(text, { status: resp.status, headers: { "content-type": resp.headers.get("content-type") || "application/json" } });
}
