document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('trialForm');
  if (!form) return;

  var button = document.getElementById('submitButton');
  var errorBox = document.getElementById('formMessage');
  var successBox = document.getElementById('successMessage');
  var ENDPOINT = '/api/onboarding/trial-signup';

  function val(id) {
    var el = document.getElementById(id);
    return el ? String(el.value || '').trim() : '';
  }

  function looksLikeHtml(value) {
    return /<\s*(html|div|h1|p|body|head|script|!doctype)\b/i.test(String(value || '')) || String(value || '').indexOf('cloudflare') !== -1;
  }

  function cleanMessage(value, fallback) {
    var text = String(value || '').trim();
    if (!text || looksLikeHtml(text)) return fallback || 'Trial request failed. Please try again shortly.';
    return text.length > 360 ? text.slice(0, 360) + '…' : text;
  }

  function show(el, type, text) {
    if (!el) return;
    el.className = 'message ' + type + ' visible';
    el.textContent = cleanMessage(text, type === 'success' ? 'Activation email sent.' : 'Trial request failed. Please try again shortly.');
  }

  function clear(el) {
    if (!el) return;
    el.className = 'message';
    el.textContent = '';
    el.innerHTML = '';
  }

  async function postTrial(payload) {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 25000);
    try {
      var res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store'
      });
      var contentType = res.headers.get('content-type') || '';
      var text = await res.text();
      var data = null;
      try {
        data = text && contentType.indexOf('application/json') !== -1 ? JSON.parse(text) : JSON.parse(text || '{}');
      } catch (_) {
        data = {
          success: false,
          message: looksLikeHtml(text) ? 'Trial service is temporarily unavailable. Please try again shortly.' : (text || 'Invalid response from trial endpoint.')
        };
      }
      if (data && typeof data.detail === 'object' && data.detail !== null) {
        data = Object.assign({}, data.detail, data);
      }
      return { res: res, data: data };
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    clear(errorBox);
    clear(successBox);

    var payload = {
      company_name: val('company_name'),
      contact_name: val('contact_name'),
      email: val('email'),
      seat_count: Number(val('seat_count') || 1),
      notes: val('notes'),
      source: 'weldinspectpro-onboarding'
    };

    if (!payload.company_name || !payload.contact_name || !payload.email) {
      show(errorBox, 'error', 'Please fill in company name, contact person and email.');
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Creating trial...';
    }

    try {
      var result = await postTrial(payload);
      var data = result.data || {};

      if (!result.res.ok || data.success !== true) {
        show(errorBox, 'error', data.message || data.detail || data.error || 'Trial request failed. Please try again shortly.');
        return;
      }

      show(successBox, 'success', 'Activation email sent. Check your inbox and follow the activation link.');
      form.reset();
    } catch (err) {
      show(errorBox, 'error', err && err.name === 'AbortError' ? 'Trial request timed out. Please try again.' : 'Trial request failed. Please try again shortly.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = 'Start free trial';
      }
    }
  });
});
