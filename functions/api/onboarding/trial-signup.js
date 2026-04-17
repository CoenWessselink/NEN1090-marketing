const DEFAULT_BACKEND_API_BASE = "https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net";

function joinUrl(base, path) {
  const b = (base || "").replace(/\/+$/, "");
  const p = (path || "").replace(/^\//, "");
  return `${b}/${p}`;
}

async function readJson(response) {
  const text = await response.text().catch(() => "");
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiBase = env.BACKEND_API_BASE || DEFAULT_BACKEND_API_BASE;

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const company = String(body.company || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  if (!company || !email) {
    return new Response(JSON.stringify({ message: 'Company en work email zijn verplicht.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const tenantResp = await fetch(joinUrl(apiBase, 'api/v1/onboarding/create-tenant'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      company,
      plan: String(body.plan || 'professional'),
      seats: Number(body.seats || 3),
      trial_days: Number(body.trial_days || 14),
      contact_name: String(body.contact_name || ''),
      phone: String(body.phone || ''),
      notes: String(body.notes || ''),
    }),
  });
  const tenantJson = await readJson(tenantResp);
  if (!tenantResp.ok || !tenantJson?.tenant_id) {
    return new Response(JSON.stringify({
      message: tenantJson?.detail || tenantJson?.message || 'Tenant creation failed.',
      step: 'create-tenant',
      details: tenantJson,
    }), {
      status: tenantResp.status || 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const adminResp = await fetch(joinUrl(apiBase, 'api/v1/onboarding/create-admin'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      tenant_id: tenantJson.tenant_id,
      email,
      name: String(body.contact_name || ''),
      role: 'tenant_admin',
      send_email: true,
    }),
  });
  const adminJson = await readJson(adminResp);
  if (!adminResp.ok) {
    return new Response(JSON.stringify({
      message: adminJson?.detail || adminJson?.message || 'Admin creation failed.',
      step: 'create-admin',
      tenant: tenantJson,
      details: adminJson,
    }), {
      status: adminResp.status || 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    ok: true,
    message: 'Tenant en eerste admin zijn aangemaakt.',
    tenant_id: tenantJson.tenant_id,
    tenant: tenantJson.tenant,
    trial_until: tenantJson.trial_until,
    billing_warning: tenantJson.billing_warning || null,
    email: adminJson.email || email,
    activation_url: adminJson.activation_url || adminJson.reset_url || null,
    reset_url: adminJson.reset_url || adminJson.activation_url || null,
    login_url: adminJson.login_url || tenantJson.login_url || null,
    delivery_mode: adminJson.delivery_mode || 'disabled',
    delivery_outbox_path: adminJson.delivery_outbox_path || null,
  }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}
