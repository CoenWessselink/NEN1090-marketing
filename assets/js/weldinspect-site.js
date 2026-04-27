(function () {
  const APP_LOGIN = 'https://app.weldinspectpro.com/login';
  const START_TRIAL = '/onboarding.html';
  const DEMO = '/contact.html';
  const current = (window.location.pathname || '/').replace('/index.html', '/');
  const nav = [
    ['/', 'Home'],
    ['/software.html', 'Platform'],
    ['/inspection-software.html', 'Inspection'],
    ['/inspection-reporting.html', 'Reports'],
    ['/standards.html', 'Standards'],
    ['/pricing.html', 'Pricing'],
    ['/contact.html', 'Demo'],
  ];
  const logoMark = '<span class="brand-mark shield-logo" aria-hidden="true"><svg viewBox="0 0 48 56" role="img"><path d="M24 3 43 10v15c0 13.8-7.8 23.6-19 28C12.8 48.6 5 38.8 5 25V10L24 3Z"/><path d="M16 18h5l3 13 4-13h5l-6 20h-6l-5-20Z"/></svg></span>';
  function links() {
    return nav.map(([href, label]) => `<a href="${href}"${current === href ? ' class="active"' : ''}>${label}</a>`).join('');
  }
  function navHtml() {
    return `<header class="topbar"><div class="container topbar-row"><a class="brand" href="/">${logoMark}<span><strong>WeldInspect Pro</strong><small>Welding Compliance Platform</small></span></a><nav class="nav" id="siteNav">${links()}</nav><div class="nav-actions"><a class="btn btn-secondary" href="${APP_LOGIN}">Login</a><a class="btn btn-primary" href="${START_TRIAL}">Start free trial</a></div><button class="mobile-toggle" type="button" aria-controls="siteNav" aria-label="Open menu">☰</button></div><div class="mobile-panel"><div class="container"><div class="nav-stack">${links()}</div><div class="mobile-actions"><a class="btn btn-secondary" href="${APP_LOGIN}">Login</a><a class="btn btn-primary" href="${START_TRIAL}">Start free trial</a><a class="btn btn-dark" href="${DEMO}">Book demo</a></div></div></div></header>`;
  }
  function footerHtml() {
    return `<footer class="site-footer-lite"><div class="container cols"><div><div class="brand">${logoMark}<span><strong>WeldInspect Pro</strong><small>Welding Compliance Platform</small></span></div><p>Enterprise SaaS for weld inspection, standards traceability and CE dossier output.</p></div><div><strong>Platform</strong><a href="/software.html">Platform</a><a href="/standards.html">Standards</a><a href="/pricing.html">Pricing</a><a href="/onboarding.html">Trial</a></div><div><strong>Use cases</strong><a href="/inspection-software.html">Weld inspection</a><a href="/inspection-reporting.html">Reports</a><a href="/standards.html">Standards</a></div><div><strong>Start</strong><a href="/contact.html">Book demo</a><a href="${APP_LOGIN}">Login</a></div></div></footer>`;
  }
  function init() {
    document.querySelectorAll('[data-site-nav]').forEach((el) => { el.outerHTML = navHtml(); });
    document.querySelectorAll('[data-site-footer]').forEach((el) => { el.outerHTML = footerHtml(); });
    document.querySelectorAll('a[href*="nen-1090-app.pages.dev"],a[href*="weldinspectapp.com/login"]').forEach((el) => el.setAttribute('href', APP_LOGIN));
    const topbar = document.querySelector('.topbar');
    const toggle = document.querySelector('.mobile-toggle');
    if (topbar && toggle) toggle.addEventListener('click', () => topbar.classList.toggle('open'));
  }
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
