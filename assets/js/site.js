const APP_LOGIN_URL = 'https://app.weldinspectpro.com/login';

document.querySelectorAll('a[href="https://app.weldinspectapp.com/login"], a[href="https://app.weldinspectpro.com/login"], a[href="https://nen-1090-app.pages.dev/login"]').forEach((link) => {
  link.setAttribute('href', APP_LOGIN_URL);
});

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('#mobileMenu');
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

const LEAD_ENDPOINTS = {
  trial: '/api/v1/onboarding/trial-signup',
  demo: '/api/v1/demo-request'
};

function parseSeatCount(value) {
  const raw = String(value || '').trim();
  if (!raw) return 3;
  const firstNumber = raw.match(/\d+/);
  return firstNumber ? Number(firstNumber[0]) : 3;
}

function formToPayload(form) {
  const data = new FormData(form);
  const firstName = String(data.get('firstName') || '').trim();
  const lastName = String(data.get('lastName') || '').trim();
  const company = String(data.get('company') || '').trim();
  const email = String(data.get('email') || '').trim().toLowerCase();
  const name = [firstName, lastName].filter(Boolean).join(' ');
  const leadType = form.dataset.leadType || 'lead';

  if (leadType === 'trial') {
    return {
      company_name: company,
      contact_name: name || email,
      email,
      seat_count: parseSeatCount(data.get('teamSize')),
      notes: [
        String(data.get('message') || '').trim(),
        String(data.get('standard') || '').trim() ? `Primary standard: ${String(data.get('standard')).trim()}` : '',
        String(data.get('teamSize') || '').trim() ? `Team size: ${String(data.get('teamSize')).trim()}` : '',
        'Source: weldinspect-marketing'
      ].filter(Boolean).join('\n')
    };
  }

  return {
    source: 'weldinspect-marketing',
    product: 'WeldInspect Pro',
    type: leadType,
    first_name: firstName,
    last_name: lastName,
    name,
    email,
    company,
    company_name: company,
    team_size: String(data.get('teamSize') || '').trim(),
    primary_standard: String(data.get('standard') || '').trim(),
    message: String(data.get('message') || '').trim(),
    requested_at: new Date().toISOString()
  };
}

function extractErrorMessage(errorBody) {
  if (!errorBody) return 'Request failed. Please try again.';
  if (typeof errorBody === 'string') return errorBody;
  if (Array.isArray(errorBody?.detail)) return errorBody.detail.map((item) => item?.msg || item?.message || String(item)).join(', ');
  if (typeof errorBody?.detail === 'object' && errorBody.detail?.message) return errorBody.detail.message;
  return errorBody?.error?.message || errorBody?.message || errorBody?.detail || 'Request failed. Please try again.';
}

async function submitLeadForm(form) {
  const type = form.dataset.leadType || 'lead';
  const endpoint = LEAD_ENDPOINTS[type] || form.getAttribute('action') || '/api/v1/lead';
  const successBox = form.querySelector('.success-box');
  const errorBox = form.querySelector('.error-box');
  const submitButton = form.querySelector('button[type="submit"]');
  successBox?.classList.remove('is-visible');
  if (errorBox) { errorBox.textContent = ''; errorBox.classList.remove('is-visible'); }
  const originalLabel = submitButton ? submitButton.textContent : '';
  if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Sending...'; }
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(formToPayload(form))
    });
    const contentType = response.headers.get('content-type') || '';
    const body = contentType.includes('application/json') ? await response.json().catch(() => null) : await response.text().catch(() => '');
    if (!response.ok) throw new Error(extractErrorMessage(body));
    form.reset();
    successBox?.classList.add('is-visible');
  } catch (error) {
    if (errorBox) { errorBox.textContent = error?.message || 'Request failed. Please try again.'; errorBox.classList.add('is-visible'); }
  } finally {
    if (submitButton) { submitButton.disabled = false; submitButton.textContent = originalLabel; }
  }
}

document.querySelectorAll('.js-lead-form').forEach((form) => {
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }
    submitLeadForm(form);
  });
});
