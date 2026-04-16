function getPublicApiBase() {
  const apiBase = window.NEN1090Config?.getApiBase?.() || '/api/v1';
  if (/\/api\/v1\/?$/i.test(apiBase)) return apiBase.replace(/\/api\/v1\/?$/i, '/api/public');
  if (/\/api\/?$/i.test(apiBase)) return apiBase.replace(/\/api\/?$/i, '/api/public');
  return '/api/public';
}

function setStatus(node, message, kind = '') {
  if (!node) return;
  if (!message) {
    node.textContent = '';
    node.className = 'trial-status';
    return;
  }
  node.textContent = message;
  node.className = `trial-status is-visible${kind ? ` is-${kind}` : ''}`;
}

function getQueryParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || '';
  } catch {
    return '';
  }
}

async function parseResponse(response) {
  const text = await response.text().catch(() => '');
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function setBusy(button, busy) {
  if (!button) return;
  if (!button.dataset.label) button.dataset.label = button.textContent.trim();
  button.disabled = !!busy;
  button.textContent = busy ? 'Creating trial...' : button.dataset.label;
}

function renderResult(root, data) {
  if (!root) return;
  root.classList.add('is-visible');
  root.querySelector('[data-result-message]').textContent = data.message || 'Trial created.';
  root.querySelector('[data-result-tenant]').textContent = data.tenant || '';
  const activate = root.querySelector('[data-result-activate]');
  const login = root.querySelector('[data-result-login]');
  activate.href = data.activate_url || '#';
  login.href = data.login_url || '#';
  const delivery = root.querySelector('[data-result-delivery]');
  if (delivery) delivery.textContent = data.delivery_mode || 'preview';
  const outboxWrap = root.querySelector('[data-result-outbox-wrap]');
  const outbox = root.querySelector('[data-result-outbox]');
  if (data.delivery_outbox_path) {
    outboxWrap.hidden = false;
    outbox.textContent = data.delivery_outbox_path;
  } else {
    outboxWrap.hidden = true;
    outbox.textContent = '';
  }
}

const form = document.querySelector('[data-trial-signup-form]');
if (form) {
  const statusNode = document.querySelector('[data-trial-status]');
  const resultNode = document.querySelector('[data-trial-result]');
  const submitButton = document.querySelector('[data-trial-submit]');

  const planInput = form.querySelector('[name="plan"]');
  const seatsInput = form.querySelector('[name="seats"]');
  const planFromQuery = getQueryParam('plan');
  if (planFromQuery && planInput) planInput.value = planFromQuery;
  const seatsFromQuery = getQueryParam('seats');
  if (seatsFromQuery && seatsInput) seatsInput.value = seatsFromQuery;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus(statusNode, '');
    resultNode?.classList.remove('is-visible');
    setBusy(submitButton, true);

    const payload = {
      company: String(form.company.value || '').trim(),
      contact_name: String(form.contactName.value || '').trim(),
      email: String(form.email.value || '').trim(),
      plan: String(form.plan.value || 'professional').trim(),
      seats: Number(form.seats.value || 1),
      phone: String(form.phone.value || '').trim() || null,
    };

    if (!payload.company || !payload.contact_name || !payload.email) {
      setBusy(submitButton, false);
      setStatus(statusNode, 'Please complete company, contact name and email first.', 'error');
      return;
    }

    try {
      const response = await fetch(`${getPublicApiBase()}/trial/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(response);
      if (!response.ok) {
        const message = data?.detail || data?.message || data?.error?.message || 'Trial signup failed.';
        throw new Error(message);
      }
      setStatus(statusNode, 'Trial created successfully. Use the activation link below to set the first password.', 'success');
      renderResult(resultNode, data);
      form.reset();
      if (planInput && payload.plan) planInput.value = payload.plan;
      if (seatsInput) seatsInput.value = String(payload.seats || 1);
    } catch (error) {
      setStatus(statusNode, error?.message || 'Trial signup failed.', 'error');
    } finally {
      setBusy(submitButton, false);
    }
  });
}
