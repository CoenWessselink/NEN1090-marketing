export async function onRequestPost({ request, env }) {
  const apiBase = (env && env.BACKEND_API_BASE) || "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";
  const url = apiBase.replace(/\/+$/,"") + "/api/v1/auth/login";

  let body;
  try { body = await request.json(); }
  catch { return new Response(JSON.stringify({ detail: "Invalid JSON" }), { status: 400, headers: { "Content-Type": "application/json" } }); }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("content-type") || "application/json" }
  });
}
