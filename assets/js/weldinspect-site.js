(function(){
  const page = document.body.dataset.page || '';
  const APP_LOGIN = '/app/login.html';
  const START_TRIAL = '/onboarding.html';
  const DEMO = '/contact.html';
  const nav = [
    ['/', 'Home', 'home'],
    ['/software.html', 'Features', 'features'],
    ['/pricing.html', 'Pricing', 'pricing'],
    ['/weld-inspection-software.html', 'Use cases', 'seo'],
    ['/contact.html', 'Contact', 'contact']
  ];
  function navHtml(){
    return `<header class="topbar"><div class="container topbar-row"><a class="brand" href="/"><span class="brand-mark"></span><span>WeldInspect</span></a><nav class="nav">${nav.map(([href,label,key])=>`<a href="${href}"${page===key? ' class="active"':''}>${label}</a>`).join('')}</nav><div class="nav-actions"><a class="btn btn-secondary" href="${APP_LOGIN}">Login</a><a class="btn btn-primary" href="${START_TRIAL}">Start trial</a></div><button class="mobile-toggle" type="button" aria-label="Open menu">☰</button></div><div class="mobile-panel"><div class="container"><div class="nav-stack">${nav.map(([href,label])=>`<a href="${href}">${label}</a>`).join('')}</div><div class="mobile-actions" style="margin-top:12px"><a class="btn btn-secondary" href="${APP_LOGIN}">Login</a><a class="btn btn-primary" href="${START_TRIAL}">Start trial</a><a class="btn btn-dark" href="${DEMO}">Book demo</a></div></div></div></header>`;
  }
  function footerHtml(){
    return `<footer class="footer"><div class="container footer-grid"><div><div class="brand"><span class="brand-mark"></span><span>WeldInspect</span></div><p>The easiest way to manage weld inspections and compliance. Built for QA/QC managers, inspectors and project teams that need one workflow from weld to report.</p></div><div><strong>Product</strong><a href="/software.html">Features</a><a href="/pricing.html">Pricing</a><a href="/onboarding.html">Start trial</a><a href="/contact.html">Book demo</a></div><div><strong>Workflows</strong><a href="/weld-inspection-software.html">Weld inspection software</a><a href="/welding-compliance.html">Welding compliance</a><a href="/inspection-reporting.html">Inspection reporting</a><a href="/app/forgot-password.html">Forgot password</a></div><div><strong>Company</strong><a href="/contact.html">Contact</a><a href="/legal/privacy.html">Privacy</a><a href="/legal/terms.html">Terms</a><a href="/legal/security.html">Security</a></div></div><div class="container footer-bottom"><span>© 2026 WeldInspect</span><span>Inspectie-first · Compliance reports · Multi-tenant SaaS</span></div></footer>`;
  }
  document.querySelectorAll('[data-site-nav]').forEach(el=>el.outerHTML = navHtml());
  document.querySelectorAll('[data-site-footer]').forEach(el=>el.outerHTML = footerHtml());
  const topbar = document.querySelector('.topbar');
  const toggle = document.querySelector('.mobile-toggle');
  if(toggle && topbar){toggle.addEventListener('click',()=>topbar.classList.toggle('open'));}
})();
