
const SITE = {
  name: 'CWS NEN-1090',
  apiBase: 'https://nen1090-api-prod-f5ddagedbrftb4ew.westeurope-01.azurewebsites.net/api',
  loginUrl: '/app/login.html',
  demoSuccessUrl: '/success.html',
  checkoutPage: '/checkout.html'
};
function normalize(path) { return path.startsWith('/') ? path : '/' + path; }
function navHtml() {
  return `
  <div class="topbar">
    <div class="container nav">
      <a href="/index.html" class="brand"><span class="brand-mark"></span><span>CWS NEN-1090</span></a>
      <nav class="nav-links">
        <a href="/index.html">Home</a><a href="/software.html">Software</a><a href="/lascontrole.html">Lascontrole</a><a href="/planning.html">Planning</a><a href="/documentatie.html">Documentatie</a><a href="/pricing.html">Prijzen</a><a href="/contact.html">Contact</a>
      </nav>
      <div class="nav-actions">
        <a class="btn btn-secondary" href="/app/login.html">Login</a>
        <a class="btn btn-primary" href="/onboarding.html">Demo aanvragen</a>
      </div>
    </div>
  </div>`;
}
function footerHtml() {
  return `
  <footer class="footer">
    <div class="container footer-grid">
      <div>
        <div class="brand" style="color:#fff;margin-bottom:12px"><span class="brand-mark"></span><span>CWS NEN-1090</span></div>
        <p>Enterprise SaaS-platform voor projectbeheer, lascontrole, CE-dossiers, auditlog en documentatie in de staalbouw. Ontwikkeld voor bedrijven die overzicht, snelheid en aantoonbare kwaliteit nodig hebben.</p>
      </div>
      <div><h4>Product</h4><a href="/software.html">Software</a><a href="/lascontrole.html">Lascontrole</a><a href="/planning.html">Planning</a><a href="/ce-dossier.html">CE-dossier</a><a href="/auditlog-staalbouw.html">Auditlog</a></div><div><h4>Normen</h4><a href="/nen-en-1090.html">NEN-EN 1090</a><a href="/iso-3834.html">ISO 3834</a><a href="/iso-5817.html">ISO 5817</a><a href="/ce-markering.html">CE-markering</a><a href="/lasdocumentatie.html">Lasdocumentatie</a></div><div><h4>Bedrijf</h4><a href="/over-ons.html">Over ons</a><a href="/faq.html">Veelgestelde vragen</a><a href="/contact.html">Contact</a><a href="/onboarding.html">Demo aanvragen</a></div><div><h4>Juridisch</h4><a href="/privacy.html">Privacy</a><a href="/security.html">Security</a><a href="/checkout.html">Checkout</a></div>
    </div>
    <div class="container footer-bottom"><span>© 2026 CWS NEN-1090</span><span>NEN-EN 1090 · ISO 3834 · ISO 5817 · CE-markering</span></div>
  </footer>`;
}
function mountShell() {
  const nav = document.querySelector('[data-site-nav]'); if(nav) nav.innerHTML = navHtml();
  const footer = document.querySelector('[data-site-footer]'); if(footer) footer.innerHTML = footerHtml();
}
async function postJson(url, body) {
  const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body)});
  let data = null; try { data = await res.json(); } catch (e) {}
  if(!res.ok) throw new Error(data?.detail || data?.message || 'Er ging iets mis.');
  return data;
}
function bindForms() {
  document.querySelectorAll('[data-demo-form]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const status = form.querySelector('.status');
      status.style.display = 'block'; status.classList.remove('error'); status.textContent = 'Demo wordt aangevraagd...';
      const body = Object.fromEntries(new FormData(form).entries());
      try {
        const data = await postJson(SITE.apiBase + '/public/demo/start', body);
        status.textContent = 'Demo aangemaakt. U kunt direct inloggen met de toegestuurde gegevens.';
        setTimeout(()=>location.href = '/success.html', 900);
      } catch(err) { status.classList.add('error'); status.textContent = err.message; }
    });
  });
  document.querySelectorAll('[data-contact-form]').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const status = form.querySelector('.status');
      status.style.display = 'block'; status.classList.remove('error'); status.textContent = 'Bericht wordt verstuurd...';
      const body = Object.fromEntries(new FormData(form).entries());
      try { await postJson(SITE.apiBase + '/public/contact', body); status.textContent = 'Bedankt. We nemen snel contact met u op.'; form.reset(); }
      catch(err) { status.classList.add('error'); status.textContent = err.message; }
    });
  });
  document.querySelectorAll('[data-checkout-plan]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.preventDefault();
      const plan = btn.getAttribute('data-checkout-plan');
      try {
        const data = await postJson(SITE.apiBase + '/public/checkout/create-session', {plan, users: 5});
        location.href = data.checkout_url || ('/checkout.html?plan=' + plan);
      } catch(err) { location.href = '/checkout.html?plan=' + plan; }
    });
  });
}
document.addEventListener('DOMContentLoaded', () => { mountShell(); bindForms(); });
