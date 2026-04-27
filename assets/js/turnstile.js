// Cloudflare Turnstile helper
// Renders the widget when a site key is present in <meta name="turnstile-sitekey" content="...">.
// Usage: add <div class="turnstile" data-turnstile></div> inside your form.

(function(){
  function getKey(){
    try{ return (window.NEN1090Config?.getTurnstileSiteKey?.() || '').trim(); }catch(_){ return ''; }
  }

  let loading = false;
  let loaded = false;
  const waiting = [];

  function loadScript(){
    if(loaded) return Promise.resolve();
    if(loading) return new Promise(res => waiting.push(res));
    loading = true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      s.async = true;
      s.defer = true;
      s.onload = () => {
        loaded = true;
        loading = false;
        resolve();
        while(waiting.length) try{ waiting.shift()(); }catch(_){ }
      };
      s.onerror = () => {
        loading = false;
        resolve(); // fail-open: do not block UI
        while(waiting.length) try{ waiting.shift()(); }catch(_){ }
      };
      document.head.appendChild(s);
    });
  }

  async function renderAll(){
    const key = getKey();
    if(!key) return;
    await loadScript();
    if(!window.turnstile || typeof window.turnstile.render !== 'function') return;
    document.querySelectorAll('[data-turnstile]')
      .forEach((el) => {
        if(el.getAttribute('data-rendered') === '1') return;
        try{
          window.turnstile.render(el, { sitekey: key, theme: 'light' });
          el.setAttribute('data-rendered','1');
        }catch(_){ /* ignore */ }
      });
  }

  document.addEventListener('DOMContentLoaded', renderAll);
})();
