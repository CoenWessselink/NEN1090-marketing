// NEN1090 Website/App config helper
// Doel (2026): alles via Cloudflare Pages Functions proxy.
// - Frontend spreekt ALLEEN relatief: /api/v1/...
// - Geen CORS-afhankelijkheid richting Azure
//
// Je kunt nog steeds overschrijven via localStorage (handig voor lokale tests),
// maar de standaard is: "/api/v1".

(function(){
  const KEY1 = "API_BASE_URL";
  const KEY2 = "nen1090.api.baseUrl";

  function getApiBase(){
    const fromLS = (localStorage.getItem(KEY1) || localStorage.getItem(KEY2) || "").trim();
    const fallback = (window.__NEN1090_DEFAULT_API__ || "").trim();
    // Default: Pages proxy (same-origin)
    return fromLS || fallback || "/api/v1";
  }

  function setApiBase(url){
    const v = String(url||"").trim();
    if (!v){
      localStorage.removeItem(KEY1);
      localStorage.removeItem(KEY2);
      return;
    }
    localStorage.setItem(KEY1, v);
    localStorage.setItem(KEY2, v);
  }

  function getTurnstileSiteKey(){
    const meta = document.querySelector('meta[name="turnstile-sitekey"]');
    return (meta && meta.getAttribute('content') || '').trim();
  }

  window.NEN1090Config = { getApiBase, setApiBase, getTurnstileSiteKey };
})();
