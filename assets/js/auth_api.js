(function(){
  const DEFAULT_APP_ORIGIN = 'https://nen-1090-app.pages.dev';
  const DEFAULT_LOGIN_REDIRECT = '/dashboard';
  const DEFAULT_LOGIN_PAGE = '/app/login';
  const ENDPOINTS = Object.freeze({
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    me: '/auth/me',
    forgotPassword: '/auth/reset-password/request',
    resetPassword: '/auth/reset-password/confirm',
    setPassword: '/api/onboarding/set-password',
    changePassword: ['/auth/change-password', '/auth/password/change']
  });

  function join(base, path){
    const b = String(base || '').replace(/\/$/, '');
    const p = String(path || '').startsWith('/') ? path : '/' + path;
    return b + p;
  }

  function getApiBase(){
    return window.NEN1090Config?.getApiBase?.() || '/api/v1';
  }

  function getAppOrigin(){
    const explicit =
      window.NEN1090Config?.APP_BASE_URL ||
      window.APP_BASE_URL ||
      DEFAULT_APP_ORIGIN;
    return String(explicit || DEFAULT_APP_ORIGIN).replace(/\/$/, '');
  }

  function query(name){
    try { return new URLSearchParams(window.location.search).get(name) || ''; }
    catch { return ''; }
  }

  function pick(obj, keys){
    for (const key of keys) {
      const value = obj?.[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  }

  function sanitizeNextUrl(value, fallback = DEFAULT_LOGIN_REDIRECT){
    const next = String(value || '').trim();
    if (!next || !next.startsWith('/')) return fallback;
    if (next.startsWith('//')) return fallback;
    return next;
  }

  function getAbsoluteAppUrl(path){
    return `${getAppOrigin()}${sanitizeNextUrl(path, DEFAULT_LOGIN_REDIRECT)}`;
  }

  async function parseResponse(res){
    const text = await res.text().catch(() => '');
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
    return { ok: res.ok, status: res.status, data, text };
  }

  function inferAuthErrorCode(raw){
    const value = String(raw || '').toLowerCase();
    if (!value) return '';
    if (/(expired|verlopen)/.test(value)) return 'expired';
    if (/(invalid|ongeldig|incorrect|not valid)/.test(value)) return 'invalid';
    if (/(missing|ontbreekt|required|verplicht)/.test(value)) return 'missing';
    if (/(unauthorized|forbidden|niet ingelogd|niet bevoegd|sessie)/.test(value)) return 'session';
    if (/(already used|used|al gebruikt)/.test(value)) return 'used';
    return '';
  }

  function getErrorMessage(payload, fallback){
    const detail = payload?.data?.detail ?? payload?.data?.error ?? payload?.data?.message ?? payload?.text ?? '';
    const normalized = String(detail || '').trim();
    return normalized || fallback;
  }

  function getFriendlyTokenMessage(error, fallback){
    const message = String(error?.message || error || '').trim();
    const code = inferAuthErrorCode(message);
    if (code === 'expired') return 'Deze link is verlopen. Vraag een nieuwe e-mail of activatielink aan.';
    if (code === 'invalid') return 'Deze link is ongeldig. Controleer of je de volledige link hebt geopend.';
    if (code === 'missing') return 'De benodigde tokeninformatie ontbreekt in deze link.';
    if (code === 'used') return 'Deze link is al gebruikt. Vraag een nieuwe link aan als dat nodig is.';
    if (code === 'session') return 'Je sessie is niet meer geldig. Log opnieuw in en probeer het nogmaals.';
    return fallback || message || 'De link kon niet worden verwerkt.';
  }

  function getTokenStateFromQuery(){
    const error = query('error') || query('reason') || query('state') || '';
    const code = inferAuthErrorCode(error);
    if (!code) return null;
    return {
      code,
      message: getFriendlyTokenMessage(error)
    };
  }

  async function request(path, options){
    const url = join(getApiBase(), path);
    const response = await fetch(url, {
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      ...options,
    });
    return parseResponse(response);
  }

  async function requestWithCandidates(candidates, payload, fallbackMessage){
    let last = null;
    for (const item of candidates) {
      const method = item.method || 'POST';
      const body = item.mapBody ? item.mapBody(payload) : payload;
      const res = await request(item.path, {
        method,
        body: method === 'GET' ? undefined : JSON.stringify(body),
      });
      if (res.ok) return { ...res, endpoint: item.path };
      if (![404, 405].includes(res.status)) {
        throw new Error(getErrorMessage(res, fallbackMessage));
      }
      last = res;
    }
    throw new Error(getErrorMessage(last, fallbackMessage));
  }

  function readTokenFromQuery(){
    return pick(Object.fromEntries(new URLSearchParams(window.location.search).entries()), ['token', 'code', 'reset_token', 'invite', 'invite_token']);
  }

  function getNextUrl(){
    return getAbsoluteAppUrl(query('next') || DEFAULT_LOGIN_REDIRECT);
  }

  function passwordStrength(password){
    const value = String(password || '');
    let score = 0;
    if (value.length >= 12) score += 1;
    if (value.length >= 16) score += 1;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    const pct = Math.max(0, Math.min(100, score * 20));
    let label = 'Te zwak';
    let tone = 'error';
    if (score >= 5) { label = 'Sterk'; tone = 'success'; }
    else if (score >= 4) { label = 'Goed'; tone = 'info'; }
    else if (score >= 3) { label = 'Redelijk'; tone = 'warning'; }
    return { score, pct, label, tone };
  }

  function applyPasswordMeter(input, meterRoot){
    if (!input || !meterRoot) return;
    const fill = meterRoot.querySelector('[data-password-meter-fill]');
    const text = meterRoot.querySelector('[data-password-meter-text]');
    const render = () => {
      const state = passwordStrength(input.value);
      if (fill) {
        fill.style.width = `${state.pct}%`;
        fill.style.background = state.tone === 'success'
          ? 'linear-gradient(90deg,#12b76a,#039855)'
          : state.tone === 'info'
            ? 'linear-gradient(90deg,#2d76ff,#1f5bd6)'
            : state.tone === 'warning'
              ? 'linear-gradient(90deg,#f59e0b,#f79009)'
              : 'linear-gradient(90deg,#ef4444,#f97316)';
      }
      if (text) text.textContent = `Wachtwoordsterkte: ${state.label}`;
    };
    render();
    input.addEventListener('input', render);
  }

  function wireToggle(button){
    if (!button) return;
    const selector = button.getAttribute('data-toggle-password');
    const input = selector ? document.querySelector(selector) : null;
    if (!input) return;
    button.addEventListener('click', () => {
      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');
      button.textContent = isPassword ? 'Verberg' : 'Toon';
      button.setAttribute('aria-pressed', String(isPassword));
    });
  }

  function createStatusController(node){
    return {
      clear(){
        if (!node) return;
        node.className = 'auth-status';
        node.textContent = '';
      },
      show(kind, message){
        if (!node) return;
        node.className = `auth-status ${kind} is-visible`;
        node.textContent = message;
      }
    };
  }

  function setBusy(form, busy, label){
    if (!form) return;
    form.classList.toggle('auth-loading', !!busy);
    const submit = form.querySelector('[type="submit"]');
    if (submit) {
      if (!submit.dataset.defaultLabel) submit.dataset.defaultLabel = submit.textContent.trim();
      submit.disabled = !!busy;
      submit.textContent = busy ? (label || 'Bezig...') : submit.dataset.defaultLabel;
    }
    form.querySelectorAll('input, button, select').forEach((el) => {
      if (submit && el === submit) return;
      if (busy) el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
    });
  }

  function setFormEnabled(form, enabled){
    if (!form) return;
    form.querySelectorAll('input, button, select, textarea').forEach((el) => {
      el.disabled = !enabled;
    });
  }

  function normalizeResetRequestPayload(payload){
    return {
      email: String(payload?.email || '').trim(),
      ...(payload?.tenant ? { tenant: String(payload.tenant).trim() } : {})
    };
  }

  function normalizeResetConfirmPayload(payload){
    const token = String(payload?.token || '').trim();
    const password = String(payload?.password || '');
    return {
      token,
      password,
      password_confirm: String(payload?.password_confirm || payload?.passwordConfirm || payload?.password_confirmation || password || ''),
    };
  }

  function normalizeChangePasswordPayload(payload){
    const currentPassword = String(payload?.current_password || payload?.currentPassword || '').trim();
    const newPassword = String(payload?.new_password || payload?.newPassword || '').trim();
    const newPasswordConfirm = String(payload?.new_password_confirm || payload?.newPasswordConfirm || payload?.new_password_confirmation || payload?.password_confirm || newPassword).trim();
    return {
      current_password: currentPassword,
      currentPassword,
      new_password: newPassword,
      newPassword,
      new_password_confirm: newPasswordConfirm,
      newPasswordConfirm
    };
  }

  async function login(payload){
    const res = await request(ENDPOINTS.login, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(getErrorMessage(res, 'Controleer je inloggegevens.'));
    return res;
  }

  async function logout(){
    const res = await request(ENDPOINTS.logout, { method: 'POST', body: JSON.stringify({}) });
    if (!res.ok) throw new Error(getErrorMessage(res, 'Uitloggen is niet gelukt.'));
    return res;
  }

  async function refresh(payload = {}){
    const res = await request(ENDPOINTS.refresh, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(getErrorMessage(res, 'Je sessie kon niet worden vernieuwd.'));
    return res;
  }

  async function forgotPassword(payload){
    const res = await request(ENDPOINTS.forgotPassword, {
      method: 'POST',
      body: JSON.stringify(normalizeResetRequestPayload(payload))
    });
    if (!res.ok) throw new Error(getErrorMessage(res, 'Het versturen van de resetlink is niet gelukt.'));
    return res;
  }

  async function resetPassword(payload){
    const res = await request(ENDPOINTS.resetPassword, {
      method: 'POST',
      body: JSON.stringify(normalizeResetConfirmPayload(payload))
    });
    if (!res.ok) throw new Error(getFriendlyTokenMessage(getErrorMessage(res, ''), 'Het opnieuw instellen van het wachtwoord is niet gelukt.'));
    return res;
  }

  async function setPassword(payload){
    const token = String(payload?.token || '').trim();
    const password = String(payload?.password || '');
    if (!token || password.length < 12) {
      throw new Error('Token en wachtwoord zijn verplicht.');
    }
    const res = await fetch(ENDPOINTS.setPassword, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });
    const parsed = await parseResponse(res);
    if (!parsed.ok) throw new Error(getFriendlyTokenMessage(getErrorMessage(parsed, ''), 'Je wachtwoord kon niet worden ingesteld.'));
    return parsed;
  }

  async function changePassword(payload){
    return requestWithCandidates(
      ENDPOINTS.changePassword.map((path) => ({ path, mapBody: normalizeChangePasswordPayload })),
      payload,
      'Het wijzigen van het wachtwoord is niet gelukt.'
    );
  }

  async function me(){
    const res = await request(ENDPOINTS.me, { method: 'GET' });
    if (!res.ok) throw new Error(getErrorMessage(res, 'Je bent niet ingelogd.'));
    return res;
  }

  function getLogoutUrl(options = {}){
    const target = sanitizeNextUrl(options.next, `${DEFAULT_LOGIN_PAGE}?logout=1`);
    const asPath = target.startsWith('/') ? target : `${DEFAULT_LOGIN_PAGE}?logout=1`;
    return `/logout?next=${encodeURIComponent(asPath)}`;
  }

  async function logoutAndRedirect(options = {}){
    try { await logout(); } catch (_error) {}
    redirectTo(getLogoutUrl(options));
  }

  function applyPageStateBanner(statusController, messages = {}){
    const tokenState = getTokenStateFromQuery();
    if (tokenState && statusController) {
      statusController.show(tokenState.code === 'session' ? 'warning' : 'error', tokenState.message);
      return tokenState;
    }
    const success = query('success');
    if (success === '1' && messages.success) statusController.show('success', messages.success);
    return null;
  }

  function bindGlobalHelpers(){
    document.querySelectorAll('[data-toggle-password]').forEach(wireToggle);
    document.querySelectorAll('[data-password-input]').forEach((input) => {
      const target = document.querySelector(input.getAttribute('data-password-meter-target'));
      applyPasswordMeter(input, target);
    });
  }

  function redirectTo(url){ window.location.assign(url); }

  window.NEN1090ApiAuth = {
    join,
    query,
    readTokenFromQuery,
    getNextUrl,
    sanitizeNextUrl,
    getFriendlyTokenMessage,
    getTokenStateFromQuery,
    createStatusController,
    setBusy,
    setFormEnabled,
    wireToggle,
    applyPasswordMeter,
    passwordStrength,
    bindGlobalHelpers,
    applyPageStateBanner,
    redirectTo,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    setPassword,
    changePassword,
    me,
    getLogoutUrl,
    logoutAndRedirect,
    constants: { DEFAULT_LOGIN_REDIRECT, DEFAULT_LOGIN_PAGE, ENDPOINTS }
  };
})();