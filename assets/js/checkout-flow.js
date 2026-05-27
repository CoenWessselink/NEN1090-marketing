(() => {
  const API_BASE = window.WELDINSPECT_API_BASE || '';
  const DEFAULT_PRICES = { monthly: 5900, yearly: 49000 };
  const VAT_RATE = 0.21;
  const MIN_SEATS = 1;
  const MAX_SEATS = 100;
  const euro = (cents) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((Number(cents) || 0) / 100);
  const safeUuid = () => (crypto && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const visitorKey = (() => {
    try {
      let v = localStorage.getItem('wip_visitor');
      if (!v) { v = safeUuid(); localStorage.setItem('wip_visitor', v); }
      return v;
    } catch (_) { return safeUuid(); }
  })();
  const form = document.querySelector('[data-checkout-form]') || document.getElementById('checkoutForm');
  if (!form) return;

  const params = new URLSearchParams(location.search);
  const requestedCycle = params.get('cycle');
  let cycle = requestedCycle === 'monthly' || requestedCycle === 'yearly'
    ? requestedCycle
    : (form.querySelector('[name="billing_cycle"]')?.value || 'yearly');
  let seats = Number(params.get('seats') || form.querySelector('[name="seats"]')?.value || 1);
  let prices = { ...DEFAULT_PRICES };
  let experiment = null;

  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => Array.from(document.querySelectorAll(selector));
  const field = (name) => form.querySelector(`[name="${name}"]`);
  const text = (selector, value) => qa(selector).forEach((el) => { el.textContent = value; });
  const val = (name, fallback = '') => String(field(name)?.value || fallback).trim();

  function ensureHidden(name, value) {
    let input = field(name);
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = String(value);
  }

  async function track(eventName, metadata = {}) {
    try {
      await fetch(`${API_BASE}/api/v1/analytics/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-wip-visitor': visitorKey },
        body: JSON.stringify({ event_name: eventName, path: location.pathname, variant: experiment?.variant, metadata }),
      });
    } catch (_) {}
  }

  async function loadExperiment() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/growth/experiments/pricing`, { headers: { 'x-wip-visitor': visitorKey } });
      if (res.ok) experiment = await res.json();
    } catch (_) {}
  }

  async function loadPrices() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/plans`);
      if (!res.ok) return;
      const body = await res.json();
      const plans = body.plans || [];
      const monthly = plans.find((p) => p.billing_cycle === 'monthly' || p.code === 'monthly');
      const yearly = plans.find((p) => p.billing_cycle === 'yearly' || p.code === 'yearly');
      if (monthly?.price_per_seat_cents) prices.monthly = Number(monthly.price_per_seat_cents);
      if (yearly?.price_per_seat_cents) prices.yearly = Number(yearly.price_per_seat_cents);
    } catch (_) {}
  }

  function calc() {
    seats = Math.max(MIN_SEATS, Math.min(MAX_SEATS, Number(seats) || MIN_SEATS));
    cycle = cycle === 'monthly' ? 'monthly' : 'yearly';
    const unit = prices[cycle] || prices.yearly;
    const subtotal = unit * seats;
    const vat = Math.round(subtotal * VAT_RATE);
    return { unit, subtotal, vat, total: subtotal + vat };
  }

  function status(message, type = '') {
    const el = q('[data-checkout-status]') || q('#checkoutStatus');
    if (!el) return;
    el.textContent = message || '';
    el.className = type ? `status-box ${type}` : 'status-box';
  }

  function render() {
    const c = calc();
    ensureHidden('billing_cycle', cycle);
    ensureHidden('seats', seats);
    qa('[data-plan]').forEach((el) => el.classList.toggle('active', el.dataset.plan === cycle));
    text('[data-plan-label]', cycle === 'monthly' ? 'Maandelijks' : 'Jaarlijks');
    text('[data-seat-label]', `${seats} gebruiker${seats > 1 ? 's' : ''}`);
    text('[data-seat-count]', String(seats));
    text('[data-price-unit]', euro(c.unit));
    text('[data-price-subtotal]', euro(c.subtotal));
    text('[data-price-vat]', euro(c.vat));
    text('[data-price-total]', euro(c.total));
    const yearlySave = Math.max(0, (prices.monthly * 12 - prices.yearly) * seats);
    text('[data-price-saving]', yearlySave ? `${euro(yearlySave)} voordeel per jaar` : 'Flexibel maandelijks');
  }

  function payload() {
    const email = val('email').toLowerCase();
    return {
      account: {
        first_name: val('first_name'),
        last_name: val('last_name'),
        email,
        password: val('password'),
        phone: val('phone') || null,
      },
      company: {
        legal_name: val('legal_name'),
        trade_name: val('trade_name') || null,
        street: val('street'),
        house_number: val('house_number'),
        address_extra: val('address_extra') || null,
        postal_code: val('postal_code'),
        city: val('city'),
        country: val('country', 'NL') || 'NL',
        billing_email: val('billing_email', email).toLowerCase() || email,
        kvk_number: val('kvk_number') || null,
        vat_number: val('vat_number') || null,
        po_reference: val('po_reference') || null,
      },
      billing_cycle: cycle,
      seats,
      accepted_terms: true,
      accepted_direct_debit: true,
      success_url: 'https://app.weldinspectpro.com/login?billing=success',
      cancel_url: location.href,
    };
  }

  function readError(body, fallback) {
    if (!body) return fallback;
    if (typeof body.detail === 'string') return body.detail;
    if (body.detail?.message) return body.detail.message;
    if (Array.isArray(body.detail?.errors) && body.detail.errors.length) return body.detail.errors.map((e) => e.msg || e.message || e.loc?.join('.') || 'Ongeldig veld').join(' | ');
    return body.message || body.error?.message || fallback;
  }

  qa('[data-plan]').forEach((el) => el.addEventListener('click', () => { cycle = el.dataset.plan || 'yearly'; render(); track('click_pricing', { cycle, seats }); }));
  q('[data-seat-minus]')?.addEventListener('click', () => { seats -= 1; render(); track('seat_change', { seats, cycle }); });
  q('[data-seat-plus]')?.addEventListener('click', () => { seats += 1; render(); track('seat_change', { seats, cycle }); });
  q('[data-seat-3]')?.addEventListener('click', () => { seats = 3; render(); track('seat_suggestion', { seats, cycle }); });
  q('[data-seat-5]')?.addEventListener('click', () => { seats = 5; render(); track('seat_suggestion', { seats, cycle }); });

  form.addEventListener('input', () => track('checkout_field_input', { cycle, seats }).catch(() => {}), { once: true });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    render();
    if (!form.reportValidity()) return;
    const btn = form.querySelector('button[type="submit"]');
    const original = btn?.textContent || 'Start abonnement via Mollie';
    if (btn) { btn.disabled = true; btn.textContent = 'Mollie checkout wordt aangemaakt...'; }
    status('Even geduld...');
    await track('start_checkout', { cycle, seats });
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/public-checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload()),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.checkout_url) throw new Error(readError(body, `Checkout kon niet worden aangemaakt (${res.status})`));
      await track('checkout_redirect', { cycle, seats, payment_id: body.payment_id });
      status('Je wordt doorgestuurd naar Mollie...', 'success');
      location.href = body.checkout_url;
    } catch (err) {
      await track('checkout_error', { cycle, seats, message: err?.message || String(err) });
      status(err?.message || String(err), 'error');
      if (btn) { btn.disabled = false; btn.textContent = original; }
    }
  });

  (async () => { await Promise.all([loadExperiment(), loadPrices()]); render(); track('page_view', { page: 'checkout_full_fields', cycle, seats }); })();
})();
