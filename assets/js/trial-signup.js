(function () {
  const form = document.getElementById('trialForm');
  const formMessage = document.getElementById('formMessage');
  const successMessage = document.getElementById('successMessage');
  const submitButton = document.getElementById('submitButton');

  if (!form) return;

  function setMessage(target, type, html) {
    target.className = 'message visible ' + type;
    target.innerHTML = html;
  }

  function clearMessage(target) {
    target.className = 'message';
    target.innerHTML = '';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function normalizeError(payload, fallbackText) {
    if (!payload) return fallbackText;
    if (typeof payload === 'string') return payload;
    if (payload.error && typeof payload.error.message === 'string') return payload.error.message;
    if (typeof payload.detail === 'string') return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map(function (item) {
          if (typeof item === 'string') return item;
          if (item && typeof item.msg === 'string') {
            const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : '';
            return field ? field + ': ' + item.msg : item.msg;
          }
          return JSON.stringify(item);
        })
        .join('<br>');
    }
    if (typeof payload.message === 'string') return payload.message;
    return fallbackText;
  }

  async function parseResponse(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : null;
    } catch (_) {
      return text || null;
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clearMessage(formMessage);
    clearMessage(successMessage);

    const payload = {
      company_name: form.elements['company_name'].value.trim(),
      contact_name: form.elements['contact_name'].value.trim(),
      email: form.elements['email'].value.trim(),
      plan_code: form.elements['plan_code'].value || 'trial',
      seat_count: Number(form.elements['seat_count'].value || 3),
      notes: form.elements['notes'].value.trim() || null,
      phone: null
    };

    submitButton.disabled = true;
    submitButton.textContent = 'Bezig met aanvragen...';

    try {
      const response = await fetch('/api/onboarding/trial-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await parseResponse(response);

      if (!response.ok) {
        const message = normalizeError(result, 'De trial kon niet worden aangevraagd. Controleer de ingevulde gegevens en probeer het opnieuw.');
        setMessage(formMessage, 'error', escapeHtml(message));
        return;
      }

      const activationUrl = result && result.activation_url ? String(result.activation_url) : '';
      const loginUrl = result && result.login_url ? String(result.login_url) : 'https://nen-1090-app.pages.dev/login';
      const message = result && result.message
        ? String(result.message)
        : 'Je proefperiode is gestart. Controleer je e-mail of activeer direct je account.';

      let actions = '<div class="success-actions">';
      if (activationUrl) {
        actions += '<a class="secondary-btn" href="' + escapeHtml(activationUrl) + '">Activeer account</a>';
      }
      actions += '<a class="secondary-btn" href="' + escapeHtml(loginUrl) + '">Naar login</a>';
      actions += '</div>';

      setMessage(successMessage, 'success', escapeHtml(message) + actions);
      form.reset();
      form.elements['seat_count'].value = '3';
    } catch (error) {
      setMessage(formMessage, 'error', escapeHtml(error && error.message ? error.message : 'Er ging iets mis tijdens het versturen van de aanvraag.'));
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Start gratis proefperiode';
    }
  });
})();
