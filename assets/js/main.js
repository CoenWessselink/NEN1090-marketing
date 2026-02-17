(() => {
  const y = new Date().getFullYear();
  const el = document.querySelector('[data-year]');
  if (el) el.textContent = y;

  // smooth scroll for same-page anchors
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({behavior:'smooth', block:'start'});
      history.replaceState(null, '', id);
    });
  });

  // Minimal auth stub for static demo:
  // - Stores a session object in localStorage
  // - Guards /app pages that declare data-requires-auth="1"
  const AUTH_KEY = "nen1090_demo_session_v1";
  function getSession(){
    try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch { return null; }
  }
  function setSession(s){ localStorage.setItem(AUTH_KEY, JSON.stringify(s)); }
  function clearSession(){ localStorage.removeItem(AUTH_KEY); }

  // Expose tiny helper for /app pages
  window.NEN1090Auth = { getSession, setSession, clearSession };

  // API helper (cookie-based via Pages proxy)
  // - base defaults to /api/v1
  // - Authorization header is handled server-side in the proxy
  async function apiFetch(path, options){
    const base = (window.NEN1090Config?.getApiBase?.() || "/api/v1").trim();
    const p = String(path || "");
    const url = base.replace(/\/$/, "") + (p.startsWith("/") ? p : ("/" + p));
    const headers = new Headers((options && options.headers) || {});
    return fetch(url, { ...(options||{}), headers, credentials: 'include' });
  }

  async function apiJson(path, options){
    const res = await apiFetch(path, options);
    const txt = await res.text().catch(()=>"");
    let json = null;
    try { json = JSON.parse(txt || "{}"); } catch { json = null; }
    return { res, json, text: txt };
  }
  window.NEN1090Api = { apiFetch, apiJson };

  // Guard
  const requires = document.documentElement.getAttribute("data-requires-auth") === "1";
  if (requires){
    const here = location.pathname + location.search;

    (async () => {
      // 1) If we already have a local UI-session, keep it for role display.
      // 2) Always verify server session via /auth/me (cookie).
      const s = getSession();
      try {
        const out = await apiJson('/auth/me', { method: 'GET' });
        if (out.res.ok && out.json){
          const email = out.json.email || out.json.user?.email || (s && s.email) || '';
          const role = out.json.role || (Array.isArray(out.json.roles) ? out.json.roles[0] : '') || (s && s.role) || 'QC';
          setSession({ ...(s||{}), email, role, mode: 'cookie', checkedAt: new Date().toISOString() });
          document.querySelectorAll("[data-user-email]").forEach(n => n.textContent = email || "user");
          document.querySelectorAll("[data-user-role]").forEach(n => n.textContent = role || "QC");
          return;
        }
      } catch (e) {}

      // Not authenticated
      clearSession();
      location.replace("./login.html?next=" + encodeURIComponent(here));
    })();
  }
})();
