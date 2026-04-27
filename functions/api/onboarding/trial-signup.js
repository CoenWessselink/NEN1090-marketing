const DEFAULT_BACKEND_API_BASE = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

function corsHeaders(request) {
  return {
    "access-control-allow-origin": request.headers.get("origin") || "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
  };
}

function jsonResponse(request, payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders(request),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function joinUrl(base, path) {
  return `${String(base || "").replace(/\/+$/, "")}/${String(path || "").replace(/^\//, "")}`;
}

function looksLikeHtml(value) {
  return /<\s*(html|div|h1|p|!doctype|body|head|a)\b/i.test(String(value || ""));
}

function safeApiMessage(payload, status) {
  const candidate = payload && (payload.message || payload.detail || payload.error);
  if (candidate && !looksLikeHtml(candidate)) return String(candidate);
  if (status === 503) return "The API is temporarily unavailable. Please try again shortly.";
  if (status === 502 || status === 504) return "The API did not respond in time. Please try again shortly.";
  return `Trial API returned ${status}.`;
}

export async function onRequestOptions(context) {
  return new Response(null, { status: 204, headers: corsHeaders(context.request) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let body = {};
  try {
    body = await request.json();
  } catch (error) {
    return jsonResponse(request, { success: false, message: "Invalid JSON payload." }, 400);
  }

  const required = ["company_name", "contact_name", "email"];
  const missing = required.filter((key) => !String(body[key] || "").trim());
  if (missing.length) {
    return jsonResponse(request, { success: false, message: `Missing required fields: ${missing.join(", ")}` }, 400);
  }

  const apiBase = env.BACKEND_API_BASE || DEFAULT_BACKEND_API_BASE;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);

  try {
    const resp = await fetch(joinUrl(apiBase, "api/v1/onboarding/trial-signup"), {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const contentType = resp.headers.get("content-type") || "";
    const text = await resp.text();
    let payload;
    try {
      payload = text && contentType.includes("application/json") ? JSON.parse(text) : JSON.parse(text || "{}");
    } catch {
      payload = { success: false, message: looksLikeHtml(text) ? "The API returned a non-JSON application error." : (text || "Invalid response from API.") };
    }

    if (!resp.ok) {
      return jsonResponse(request, {
        success: false,
        message: safeApiMessage(payload, resp.status),
        api_status: resp.status,
        api_error: payload && !looksLikeHtml(JSON.stringify(payload)) ? payload : undefined,
      }, resp.status >= 500 ? 502 : resp.status);
    }

    return jsonResponse(request, payload, 200);
  } catch (error) {
    const message = error && error.name === "AbortError"
      ? "Trial API timed out. Please try again."
      : `Trial API proxy failed: ${String(error && error.message ? error.message : error)}`;
    return jsonResponse(request, { success: false, message }, 502);
  } finally {
    clearTimeout(timer);
  }
}
