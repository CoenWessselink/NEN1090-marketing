/**
 * Cloudflare Pages Function: POST /api/mollie/webhook
 * Purpose: accept Mollie webhook calls and forward them to the existing backend.
 *
 * Env:
 * - BACKEND_API_BASE
 * - BACKEND_MOLLIE_WEBHOOK_PATH (optional, default /api/v1/tenant/billing/webhook)
 * - BACKEND_PAYMENT_CONFIRM_TOKEN (optional shared secret header)
 */

function text(status, body) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const backendBase = String(env?.BACKEND_API_BASE || '').trim().replace(/\/$/, '');
  const path = String(env?.BACKEND_MOLLIE_WEBHOOK_PATH || '/api/v1/tenant/billing/webhook');
  const token = String(env?.BACKEND_PAYMENT_CONFIRM_TOKEN || '').trim();
  const bodyText = await request.text();

  if (!backendBase) {
    return text(202, 'BACKEND_API_BASE_NOT_CONFIGURED');
  }

  const headers = {
    'Content-Type': request.headers.get('Content-Type') || 'application/x-www-form-urlencoded',
  };
  if (token) headers['X-Webhook-Token'] = token;
  const mollieSignature = request.headers.get('Mollie-Signature');
  if (mollieSignature) headers['Mollie-Signature'] = mollieSignature;

  try {
    const response = await fetch(`${backendBase}${path}`, {
      method: 'POST',
      headers,
      body: bodyText,
    });
    const textBody = await response.text();
    return text(response.ok ? 200 : 202, textBody || 'OK');
  } catch (_) {
    return text(202, 'FORWARD_FAILED');
  }
}
