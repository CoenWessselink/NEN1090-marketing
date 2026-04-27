
(function(){
  const page = (document.body && document.body.dataset && document.body.dataset.page) || '';
  const navItems = [
    {href:'/#platform', label:'Platform', key:'platform'},
    {href:'/nen-en-1090.html', label:'NEN-EN 1090', key:'nen-en-1090'},
    {href:'/iso-3834.html', label:'ISO 3834', key:'iso-3834'},
    {href:'/iso-5817.html', label:'ISO 5817', key:'iso-5817'},
    {href:'/pricing.html', label:'Prijzen', key:'pricing'},
    {href:'/contact.html', label:'Contact', key:'contact'}
  ];
  const footerCols = [
    {title:'Product', links:[['/','Home'],['/pricing.html','Prijzen'],['/lascontrole.html','Lascontrole'],['/ce-dossier.html','CE-dossier']]},
    {title:'Normen', links:[['/nen-en-1090.html','NEN-EN 1090'],['/iso-3834.html','ISO 3834'],['/iso-5817.html','ISO 5817'],['/ce-markering.html','CE-markering']]},
    {title:'Flow', links:[['/onboarding.html','Demo aanvragen'],['/contact.html','Contact'],['/checkout.html','Checkout'],['/app/login','App login']]},
    {title:'Veiligheid', links:[['/security.html','Security'],['/privacy.html','Privacy'],['/auditlog-staalbouw.html','Auditlog'],['/legal/terms.html','Voorwaarden']]}
  ];

  function renderNav(){
    return `
<div class="site-topbar">
  <div class="container">
    <div class="row">
      <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><b>CWS NEN-1090</b></a>
      <button class="mobile-nav-toggle" type="button" aria-label="Menu openen">☰</button>
      <nav class="nav" aria-label="Hoofdnavigatie">
        ${navItems.map(item => `<a href="${item.href}"${page===item.key?' class="active"':''}>${item.label}</a>`).join('')}
        <a href="/app/login" class="pill${page==='app-login'?' active':''}">Login</a>
        <a href="/onboarding.html" class="pill cta${page==='onboarding' || page==='demo' ? ' active' : ''}">Demo aanvragen</a>
      </nav>
    </div>
  </div>
</div>`;
  }

  function renderFooter(){
    return `
<footer class="footer">
  <div class="container">
    <div class="footer-columns">
      <div class="footer-col">
        <strong>CWS NEN-1090</strong>
        <p style="margin:0;color:rgba(255,255,255,.72);line-height:1.75">Enterprise SaaS-platform voor projectbeheer, lascontrole, CE-dossiers, auditlog en oplevering binnen staalbouw en kwaliteitsborging.</p>
      </div>
      ${footerCols.map(col => `<div class="footer-col"><strong>${col.title}</strong>${col.links.map(([href,label]) => `<a href="${href}">${label}</a>`).join('')}</div>`).join('')}
    </div>
    <div class="footer-meta">
      <div>© 2026 CWS NEN-1090</div>
      <div>Marketing build – linkfix + componentized nav</div>
    </div>
  </div>
</footer>`;
  }

  document.querySelectorAll('[data-site-nav]').forEach(el => { el.outerHTML = renderNav(); });
  document.querySelectorAll('[data-site-footer]').forEach(el => { el.outerHTML = renderFooter(); });

  const topbar = document.querySelector('.site-topbar');
  const toggle = document.querySelector('.mobile-nav-toggle');
  if(toggle && topbar){
    toggle.addEventListener('click', ()=> topbar.classList.toggle('open'));
  }
})();
