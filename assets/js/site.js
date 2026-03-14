
(function(){
  const topbar = document.querySelector('.site-topbar');
  const toggle = document.querySelector('.mobile-nav-toggle');
  if(toggle && topbar){
    toggle.addEventListener('click', ()=> topbar.classList.toggle('open'));
  }

  const pricingSeats = document.querySelector('[data-pricing-seats]');
  const pricingPlan = document.querySelector('[data-pricing-plan]');
  const pricingOutput = document.querySelector('[data-pricing-output]');
  const pricingAnnual = document.querySelector('[data-pricing-annual]');
  const pricingMonthly = document.querySelector('[data-pricing-monthly]');
  const rates = {starter:149, professional:279, enterprise:499};

  function updatePricing(){
    if(!pricingSeats || !pricingPlan || !pricingOutput) return;
    const seats = Math.max(1, Number(pricingSeats.value || 1));
    const plan = pricingPlan.value || 'professional';
    const total = seats * (rates[plan] || rates.professional);
    pricingOutput.textContent = '€ ' + total.toLocaleString('nl-NL') + ' / maand';
    if(pricingAnnual) pricingAnnual.textContent = '€ ' + (total * 12).toLocaleString('nl-NL') + ' / jaar';
    if(pricingMonthly) pricingMonthly.textContent = 'Bij ' + seats + ' gebruiker(s), plan ' + plan + '.';
  }
  [pricingSeats, pricingPlan].forEach(el=> el && el.addEventListener('input', updatePricing));
  updatePricing();

  async function postJson(url, body){
    const res = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = {};
    try{ data = JSON.parse(text); }catch(e){ data = {raw:text}; }
    if(!res.ok) throw new Error(data.error || ('HTTP_' + res.status));
    return data;
  }

  const contactForm = document.querySelector('[data-contact-form]');
  const contactMsg = document.querySelector('[data-contact-msg]');
  if(contactForm){
    contactForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(contactForm);
      const body = Object.fromEntries(fd.entries());
      const payload = {
        email: String(body.email || '').trim(),
        company: String(body.company || '').trim(),
        trialDays: 14
      };
      contactMsg.className = 'status-msg';
      contactMsg.textContent = 'Bezig met versturen…';
      try{
        const data = await postJson('/api/demo/start', payload);
        contactMsg.className = 'status-msg success';
        contactMsg.textContent = data.mode === 'backend'
          ? 'Bedankt. Je aanvraag is verzonden en gekoppeld aan de backend-flow.'
          : 'Bedankt. Je aanvraag is ontvangen. In deze preview draait de demo-flow in fallback-modus.';
        contactForm.reset();
      }catch(err){
        contactMsg.className = 'status-msg error';
        contactMsg.textContent = 'Verzenden lukte niet via de API. In een lokale preview zonder Functions kan dit verwacht zijn.';
      }
    });
  }

  const demoForm = document.querySelector('[data-demo-form]');
  const demoMsg = document.querySelector('[data-demo-msg]');
  if(demoForm){
    demoForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(demoForm);
      const body = Object.fromEntries(fd.entries());
      demoMsg.className = 'status-msg';
      demoMsg.textContent = 'Demo-omgeving wordt voorbereid…';
      try{
        localStorage.setItem('nen1090.checkout.company', String(body.company || '').trim());
        localStorage.setItem('nen1090.checkout.email', String(body.email || '').trim());
        localStorage.setItem('nen1090.checkout.seats', String(body.seats || '5').trim());
      }catch(e){}
      try{
        const data = await postJson('/api/demo/start', {
          email: body.email,
          company: body.company,
          trialDays: 14
        });
        demoMsg.className = 'status-msg success';
        demoMsg.textContent = data.mode === 'backend'
          ? 'Demo-aanvraag verstuurd. Je kunt nu doorgaan naar onboarding.'
          : 'Demo-aanvraag verwerkt in preview-modus. Je kunt nu doorgaan naar onboarding.';
        setTimeout(()=>{ window.location.href = '/checkout.html?plan=professional&seats=' + encodeURIComponent(body.seats || '5'); }, 900);
      }catch(err){
        demoMsg.className = 'status-msg error';
        demoMsg.textContent = 'De API was niet bereikbaar. Je kunt in deze preview alsnog door naar checkout.';
        setTimeout(()=>{ window.location.href = '/checkout.html?plan=professional&seats=' + encodeURIComponent(body.seats || '5'); }, 1100);
      }
    });
  }

  const checkoutForm = document.querySelector('[data-checkout-form]');
  const checkoutMsg = document.querySelector('[data-checkout-msg]');
  if(checkoutForm){
    try{
      const qp = new URLSearchParams(location.search);
      const plan = qp.get('plan');
      const seats = qp.get('seats');
      if(plan && checkoutForm.plan) checkoutForm.plan.value = plan;
      if(seats && checkoutForm.seats) checkoutForm.seats.value = seats;
      if(localStorage.getItem('nen1090.checkout.company')) checkoutForm.company.value = localStorage.getItem('nen1090.checkout.company');
      if(localStorage.getItem('nen1090.checkout.email')) checkoutForm.email.value = localStorage.getItem('nen1090.checkout.email');
    }catch(e){}
    checkoutForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fd = new FormData(checkoutForm);
      const body = Object.fromEntries(fd.entries());
      checkoutMsg.className = 'status-msg';
      checkoutMsg.textContent = 'Checkout wordt voorbereid…';
      try{
        const data = await postJson('/api/checkout/create-session', body);
        if(data.checkoutUrl){
          checkoutMsg.className = 'status-msg success';
          checkoutMsg.textContent = 'Je wordt doorgestuurd naar de betaalpagina…';
          setTimeout(()=>{ location.href = data.checkoutUrl; }, 700);
        }else{
          checkoutMsg.className = 'status-msg success';
          checkoutMsg.textContent = 'Previewmodus actief: geen echte betaalprovider geconfigureerd. De checkout-flow is functioneel aangesloten.';
        }
      }catch(err){
        checkoutMsg.className = 'status-msg error';
        checkoutMsg.textContent = 'De checkout-API was niet bereikbaar. In deze preview kan dat normaal zijn.';
      }
    });
  }
})();
