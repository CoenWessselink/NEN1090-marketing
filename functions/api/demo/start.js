/**
 * Cloudflare Pages Function: POST /api/demo/start
 * Purpose: start a demo/trial funnel.
 *
 * Modes:
 * - If BACKEND_API_BASE is configured, this function can call your FastAPI
 *   endpoint to create a demo tenant and return a login token/URL.
 * - Otherwise it returns a demo session token (for static preview only).
 *
 * Env:
 * - BACKEND_API_BASE (e.g. https://api.yourdomain.tld)
 * - TURNSTILE_SECRET (optional)
 * - RATE_LIMIT_PER_MIN (optional, default 30)
 */

async function verifyTurnstile(env, token, ip) {
  const secret = String(env?.TURNSTILE_SECRET || "").trim();
  const require = String(env?.REQUIRE_TURNSTILE || "1").trim() !== "0";
  if (!secret) {
    return require ? { ok: false, error: "TURNSTILE_NOT_CONFIGURED" } : { ok: true, skipped: true };
  }
  if (require && !token) return { ok: false, error: "TURNSTILE_REQUIRED" };
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const j = await r.json().catch(() => ({}));
  return { ok: !!j.success, detail: j };
}

async function rateLimit({ request, env, keyPrefix }) {
  const limit = Math.max(1, Number(env?.RATE_LIMIT_PER_MIN || 30));
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const bucket = Math.floor(Date.now() / 60000);
  const key = new Request(`https://rate.limit/${keyPrefix}/${ip}/${bucket}`);
  const cache = caches.default;
  const existing = await cache.match(key);
  const n = existing ? Number(await existing.text()) : 0;
  const next = n + 1;
  await cache.put(key, new Response(String(next), { headers: { "Cache-Control": "max-age=60" } }));
  return { ok: next <= limit, ip, count: next, limit };
}

export async function onRequestPost({ request, env }) {
  const rl = await rateLimit({ request, env, keyPrefix: "demo" });
  if (!rl.ok) {
    return new Response(JSON.stringify({ ok: false, error: "RATE_LIMIT", limit: rl.limit }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const company = String(body.company || "").trim();
  const trialDays = Number(body.trialDays || 14);
  const turnstileToken = String(body.turnstileToken || "").trim();

  if (!email) {
    return new Response(JSON.stringify({ ok: false, error: "EMAIL_REQUIRED" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const ts = await verifyTurnstile(env, turnstileToken, rl.ip);
  if (!ts.ok) {
    return new Response(JSON.stringify({ ok: false, error: ts.error || "TURNSTILE_FAILED" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const base = String(env?.BACKEND_API_BASE || "").trim();
  if (base) {
    // OPTIONAL: integrate with your backend demo creation endpoint.
    // You can replace the endpoint path below with your real implementation.
    const url = base.replace(/\/$/, "") + "/api/v1/platform/tenants";
    const payload = {
      name: company || (email.split("@")[0] + " (demo)"),
      trial_days: trialDays,
      admin_email: email,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const txt = await res.text();
    if (!res.ok) {
      return new Response(JSON.stringify({ ok: false, error: "BACKEND_DEMO_CREATE_FAILED", detail: txt.slice(0, 400) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Expected: backend returns tenant + maybe a login token.
    let data;
    try { data = JSON.parse(txt); } catch { data = { raw: txt }; }
    return new Response(JSON.stringify({ ok: true, mode: "backend", data }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Static fallback demo token
  const token = "demo_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  return new Response(JSON.stringify({ ok: true, mode: "static", token }), {
    headers: { "Content-Type": "application/json" },
  });
}
