const APP_LOGIN_URL = 'https://app.weldinspectpro.com/login';
const TRIAL_ENDPOINT = '/api/v1/onboarding/trial-signup';

function safeUuid() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `visitor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getVisitor() {
  try {
    let v = localStorage.getItem('wip_visitor');
    if (!v) {
      v = safeUuid();
      localStorage.setItem('wip_visitor', v);
    }
    return v;
  } catch {
    return safeUuid();
  }
}

function normalizeLoginLinks() {
  document
    .querySelectorAll('a[href*="nen-1090-app.pages.dev/login"], a[href*="app.weldinspectpro.com/login"]')
    .forEach((link) => link.setAttribute('href', APP_LOGIN_URL));
}

function normalizeBranding() {
  const isDutch = String(document.documentElement.lang || '').toLowerCase().startsWith('nl');
  const tagline = isDutch ? 'Digitale lasinspectie &amp; dossieropbouw' : 'Weld inspection &amp; documentation';
  const canonicalBrand = `<span class="brand-mark" aria-hidden="true">W</span><span><strong>WELDINSPECT <em>PRO</em></strong><small>${tagline}</small></span>`;
  document.querySelectorAll('.brand').forEach((brand) => {
    brand.innerHTML = canonicalBrand;
    if (!brand.getAttribute('aria-label')) {
      brand.setAttribute('aria-label', brand.tagName === 'A' ? 'WeldInspect Pro home' : 'WeldInspect Pro');
    }
  });
}

function ensureVisualPremiumStyles() {
  if (document.querySelector('link[href^="/assets/css/home-performance.css"]')) return;
  const href = '/assets/css/visual-premium.css?v=20260531';
  if (document.querySelector(`link[href="${href}"]`) || document.querySelector('link[href^="/assets/css/visual-premium.css"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function ensureLoginActions() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const isDutch = String(document.documentElement.lang || '').toLowerCase().startsWith('nl');
  const label = isDutch ? 'Inloggen' : 'Login';
  const containers = [header.querySelector('.nav-actions'), header.querySelector('#mobileMenu')];

  containers.forEach((container) => {
    if (!container || container.querySelector(`a[href="${APP_LOGIN_URL}"]`)) return;
    const login = document.createElement('a');
    login.className = 'btn btn-ghost';
    login.href = APP_LOGIN_URL;
    login.textContent = label;
    const primary = container.querySelector('.btn-primary');
    if (primary) container.insertBefore(login, primary);
    else container.appendChild(login);
  });
}

function setGlobalPricingSubscriptionLinks() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (path !== '/pricing.html') return;

  const plans = document.querySelectorAll('.price-grid .price-box');
  const monthly = plans[0] && plans[0].querySelector('a.btn');
  const yearly = plans[1] && plans[1].querySelector('a.btn');

  if (monthly) {
    monthly.setAttribute('href', '/nl/checkout.html?cycle=monthly');
    monthly.textContent = 'Continue to payment';
  }
  if (yearly) {
    yearly.setAttribute('href', '/nl/checkout.html?cycle=yearly');
    yearly.textContent = 'Continue to payment';
  }
}

function parseSeatCount(value) {
  const raw = String(value || '').trim();
  if (!raw) return 3;
  const firstNumber = raw.match(/\d+/);
  if (!firstNumber) return 3;
  const parsed = Number(firstNumber[0]);
  if (!Number.isFinite(parsed) || parsed < 1) return 3;
  return parsed;
}

function buildTrialPayload(form) {
  const data = new FormData(form);
  const firstName = String(data.get('firstName') || data.get('first_name') || '').trim();
  const lastName = String(data.get('lastName') || data.get('last_name') || '').trim();
  const contactName = String(data.get('contact_name') || `${firstName} ${lastName}`.trim() || data.get('name') || '').trim();
  const companyName = String(data.get('company_name') || data.get('company') || data.get('organization') || '').trim();
  const email = String(data.get('email') || '').trim().toLowerCase();
  const standard = String(data.get('standard') || '').trim();
  const message = String(data.get('message') || data.get('notes') || '').trim();
  const teamSize = String(data.get('teamSize') || data.get('seat_count') || '').trim();
  const notes = [standard ? `Primary standard: ${standard}` : '', teamSize ? `Team size: ${teamSize}` : '', message].filter(Boolean).join('\n');

  return {
    company_name: companyName,
    contact_name: contactName,
    email,
    seat_count: parseSeatCount(teamSize),
    notes
  };
}

function showFormMessage(form, type, message) {
  const successBox = form.querySelector('.success-box');
  const errorBox = form.querySelector('.error-box');
  if (successBox) successBox.style.display = type === 'success' ? 'block' : 'none';
  if (errorBox) {
    errorBox.style.display = type === 'error' ? 'block' : 'none';
    errorBox.textContent = type === 'error' ? message : '';
  }
  if (successBox && type === 'success') successBox.textContent = message;
}

function getApiErrorText(payload, fallback) {
  if (!payload || typeof payload !== 'object') return fallback;
  return payload.message || payload.detail || payload.error?.message || payload.error || fallback;
}

function bindLeadForms() {
  document.querySelectorAll('form.js-lead-form').forEach((form) => {
    if (form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';
    form.setAttribute('action', TRIAL_ENDPOINT);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit ? submit.textContent : '';
      showFormMessage(form, 'idle', '');
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Sending request...';
      }
      try {
        const payload = buildTrialPayload(form);
        if (!payload.company_name || !payload.contact_name || !payload.email) {
          throw new Error('Enter company name, contact person and email address.');
        }
        const response = await fetch(TRIAL_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-wip-visitor': getVisitor()
          },
          body: JSON.stringify(payload)
        });
        let body = null;
        try { body = await response.json(); } catch { body = null; }
        if (!response.ok) throw new Error(getApiErrorText(body, `Trial request failed (${response.status}).`));
        showFormMessage(form, 'success', 'Trial request sent. Check your inbox for the activation or follow-up email.');
        form.reset();
        track('trial_signup_submitted', { source: location.pathname, status: response.status });
      } catch (error) {
        showFormMessage(form, 'error', error && error.message ? error.message : 'Trial request failed. Try again or book a demo.');
        track('trial_signup_failed', { source: location.pathname, message: String(error && error.message ? error.message : error) });
      } finally {
        if (submit) {
          submit.disabled = false;
          submit.textContent = originalText || 'Send';
        }
      }
    });
  });
}

async function fetchExperiment() {
  const path = window.location.pathname.replace(/\/+$/, '');
  if (!['/pricing', '/pricing.html', '/nl/prijzen', '/nl/prijzen.html'].includes(path)) return null;
  try {
    const res = await fetch('/api/v1/growth/experiments/pricing', {
      headers: { 'x-wip-visitor': getVisitor(), 'Accept': 'application/json' }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function track(event, metadata = {}) {
  const payload = JSON.stringify({ event_name: event, metadata });
  const send = () => {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      if (navigator.sendBeacon('/api/v1/analytics/events', blob)) return Promise.resolve();
    }
    return fetch('/api/v1/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wip-visitor': getVisitor() },
      body: payload,
      keepalive: true
    }).catch(() => {});
  };
  if (document.visibilityState === 'hidden') return send();
  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1800));
  return new Promise((resolve) => {
    schedule(() => send().finally(resolve), { timeout: 3500 });
  });
}

function setMobileMenuState(button, menu, isOpen) {
  button.setAttribute('aria-expanded', String(isOpen));
  menu.classList.toggle('is-open', isOpen);
  menu.classList.toggle('open', isOpen);
  document.documentElement.classList.toggle('mobile-menu-open', isOpen);
}

function bindMobileMenu() {
  const button = document.querySelector('.menu-button');
  const menu = document.querySelector('#mobileMenu');
  if (!button || !menu || button.dataset.bound === 'true') return;

  button.dataset.bound = 'true';
  button.setAttribute('aria-controls', menu.id || 'mobileMenu');
  button.setAttribute('aria-expanded', 'false');

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextState = button.getAttribute('aria-expanded') !== 'true';
    setMobileMenuState(button, menu, nextState);
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMobileMenuState(button, menu, false));
  });

  document.addEventListener('click', (event) => {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    const target = event.target;
    if (button.contains(target) || menu.contains(target)) return;
    setMobileMenuState(button, menu, false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setMobileMenuState(button, menu, false);
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 1180) setMobileMenuState(button, menu, false);
  });
}

function ensureMobileMenuFallback() {
  const sourceButton = document.querySelector('.menu-button');
  const menu = document.querySelector('#mobileMenu');
  if (!sourceButton || !menu || document.querySelector('.mobile-fixed-menu-button')) return;

  const fallback = document.createElement('button');
  fallback.type = 'button';
  fallback.className = 'mobile-fixed-menu-button';
  fallback.setAttribute('aria-label', sourceButton.getAttribute('aria-label') || 'Open menu');
  fallback.innerHTML = '<span></span><span></span><span></span>';
  fallback.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    const nextState = sourceButton.getAttribute('aria-expanded') !== 'true';
    setMobileMenuState(sourceButton, menu, nextState);
  });
  document.body.appendChild(fallback);
}

window.addEventListener('DOMContentLoaded', () => {
  ensureVisualPremiumStyles();
  normalizeBranding();
  normalizeLoginLinks();
  ensureLoginActions();
  setGlobalPricingSubscriptionLinks();
  bindMobileMenu();
  ensureMobileMenuFallback();
  bindLeadForms();
});

window.addEventListener('load', async () => {
  track('page_view', { path: location.pathname });
  const runExperiment = async () => {
    const exp = await fetchExperiment();
    if (!exp || !exp.config || !exp.monthly_cents) return;
    document.querySelectorAll('.price-card.featured strong').forEach((el) => {
      el.textContent = '€' + (exp.monthly_cents / 100);
    });
  };
  const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 2200));
  schedule(runExperiment, { timeout: 4500 });
});
