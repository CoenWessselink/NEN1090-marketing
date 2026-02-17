/**
 * Cloudflare Pages Function: POST /api/checkout/create-session
 * Purpose: create a payment checkout session.
 *
 * This is a production-ready integration point.
 * - If MOLLIE_API_KEY is configured, it creates a Mollie payment and returns the checkout URL.
 * - Otherwise it returns a placeholder response.
 *
 * Env:
 * - MOLLIE_API_KEY
 * - CHECKOUT_RETURN_BASE (e.g. https://nen1090.pages.dev)
 * - WEBHOOK_URL (optional)
 * - TURNSTILE_SECRET (optional)
 * - RATE_LIMIT_PER_MIN (optional, default 20)
 * - BACKEND_API_BASE (optional, used to pre-create tenant/order)
 */

async function verifyTurnstile(env, token, ip) {
  const secret = String(env?.TURNSTILE_SECRET || "").trim();
  const require = String(env?.REQUIRE_TURNSTILE || "1").trim() !== "0";
  if (!secret) {
    return require ? { ok: false, error: "TURNSTILE_NOT_CONFIGURED" } : { ok: true, skipped: true };
  }
  if (requireTurnstile && !token) return { ok: false, error: "TURNSTILE_REQUIRED" };
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const j = await r.json().catch(() => ({}));
  return { ok: !!j.success, detail: j };
}

async function rateLimit({ request, env, keyPrefix }) {
  const limit = Math.max(1, Number(env?.RATE_LIMIT_PER_MIN || 20));
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
  const rl = await rateLimit({ request, env, keyPrefix: "checkout" });
  if (!rl.ok) {
    return new Response(JSON.stringify({ ok: false, error: "RATE_LIMIT", limit: rl.limit }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const company = String(body.company || "").trim();
  const seats = Math.max(1, Number(body.seats || 1));
  const plan = String(body.plan || "standard").trim();
  const turnstileToken = String(body.turnstileToken || "").trim();
  const currency = "EUR";

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

  // Pricing placeholder: replace with your definitive pricing model.
  const pricePerSeatYear = plan === "pro" ? 499 : 299; // EUR
  const total = seats * pricePerSeatYear;

  const apiKey = String(env?.MOLLIE_API_KEY || "").trim();
  const returnBase = String(env?.CHECKOUT_RETURN_BASE || "").trim();
  const webhookUrlEnv = String(env?.WEBHOOK_URL || "").trim();
  const webhookUrl = webhookUrlEnv || (returnBase ? returnBase.replace(/\/$/, "") + "/api/mollie/webhook" : "");

  if (apiKey && returnBase) {
    const description = `NEN1090 ${plan} – ${seats} seat(s) – ${company || email}`;
    const redirectUrl = returnBase.replace(/\/$/, "") + "/success.html";
    const cancelUrl = returnBase.replace(/\/$/, "") + "/cancel.html";

    // Optional: pre-create order/tenant intent in backend
    const backend = String(env?.BACKEND_API_BASE || "").trim().replace(/\/$/, "");
    let orderRef = "";
    if (backend) {
      try {
        const pre = await fetch(backend + "/api/v1/tenant/billing/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seats, plan, email, company, source: "website" }),
        });
        if (pre.ok) {
          const pj = await pre.json().catch(() => ({}));
          orderRef = String(pj.order_ref || pj.orderRef || "");
        }
      } catch (_) {}
    }

    // Mollie Payment create
    const mollieRes = await fetch("https://api.mollie.com/v2/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: { currency, value: total.toFixed(2) },
        description,
        redirectUrl,
        webhookUrl: webhookUrl || undefined,
        metadata: { email, company, seats, plan, orderRef },
      }),
    });

    const mollieTxt = await mollieRes.text();
    if (!mollieRes.ok) {
      return new Response(JSON.stringify({ ok: false, error: "MOLLIE_CREATE_FAILED", detail: mollieTxt.slice(0, 500) }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    let mollie;
    try { mollie = JSON.parse(mollieTxt); } catch { mollie = { raw: mollieTxt }; }
    const checkoutUrl = mollie?._links?.checkout?.href || "";
    return new Response(JSON.stringify({ ok: true, mode: "mollie", checkoutUrl, paymentId: mollie?.id, total, currency, cancelUrl }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Placeholder mode
  return new Response(JSON.stringify({
    ok: true,
    mode: "placeholder",
    message: "Mollie keys not configured. Set MOLLIE_API_KEY and CHECKOUT_RETURN_BASE in Cloudflare Pages environment variables.",
    total,
    currency,
  }), { headers: { "Content-Type": "application/json" } });
}
