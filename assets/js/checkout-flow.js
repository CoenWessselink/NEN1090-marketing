(() => {
  const API_BASE = window.WELDINSPECT_API_BASE || '';
  const PLAN_PRICES = { monthly: 5900, yearly: 4900 };
  const MIN_SEATS = 1;
  const VAT_RATE = 0.21;
  const euro = cents => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format((Number(cents)||0)/100);
  const qs = new URLSearchParams(window.location.search);
  const initialPlan = ['monthly','yearly'].includes(qs.get('plan')) ? qs.get('plan') : 'yearly';
  const form = document.querySelector('[data-checkout-form]');
  if (!form) return;
  const steps = [...document.querySelectorAll('[data-step-panel]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  let step = 1;
  const show = n => { step = n; steps.forEach(el => el.hidden = Number(el.dataset.stepPanel) !== step); indicators.forEach(el => el.classList.toggle('active', Number(el.dataset.stepIndicator) === step)); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const data = () => Object.fromEntries(new FormData(form).entries());
  const pricing = () => { const d=data(); const cycle=d.billing_cycle || initialPlan; const seats=Math.max(MIN_SEATS, parseInt(d.seats || MIN_SEATS,10)||MIN_SEATS); const unit=PLAN_PRICES[cycle]||PLAN_PRICES.yearly; const subtotal=unit*seats; const vat=Math.round(subtotal*VAT_RATE); return {cycle,seats,unit,subtotal,vat,total:subtotal+vat}; };
  const render = () => { const p=pricing(); document.querySelectorAll('[data-price-seats]').forEach(e=>e.textContent=p.seats); document.querySelectorAll('[data-price-cycle]').forEach(e=>e.textContent=p.cycle==='monthly'?'maand':'jaar'); document.querySelectorAll('[data-price-unit]').forEach(e=>e.textContent=euro(p.unit)); document.querySelectorAll('[data-price-subtotal]').forEach(e=>e.textContent=euro(p.subtotal)); document.querySelectorAll('[data-price-vat]').forEach(e=>e.textContent=euro(p.vat)); document.querySelectorAll('[data-price-total]').forEach(e=>e.textContent=euro(p.total)); };
  form.querySelector('[name=billing_cycle]').value = initialPlan;
  form.addEventListener('input', render); render(); show(1);
  document.querySelectorAll('[data-next-step]').forEach(btn=>btn.addEventListener('click',()=>{ if(form.reportValidity()) show(Math.min(4, step+1)); }));
  document.querySelectorAll('[data-prev-step]').forEach(btn=>btn.addEventListener('click',()=>show(Math.max(1, step-1))));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const submit = form.querySelector('[type=submit]');
    const status = document.querySelector('[data-checkout-status]');
    submit.disabled = true; status.className='status-box'; status.textContent='Checkout wordt aangemaakt...';
    const d=data();
    const payload = {
      account: { first_name:d.first_name, last_name:d.last_name, email:d.email, password:d.password, phone:d.phone || null },
      company: { legal_name:d.legal_name, trade_name:d.trade_name||null, street:d.street, house_number:d.house_number, address_extra:d.address_extra||null, postal_code:d.postal_code, city:d.city, country:d.country || 'NL', billing_email:d.billing_email, kvk_number:d.kvk_number||null, vat_number:d.vat_number||null, po_reference:d.po_reference||null },
      billing_cycle:d.billing_cycle, seats:parseInt(d.seats,10)||MIN_SEATS,
      accepted_terms:!!form.querySelector('[name=accepted_terms]').checked,
      accepted_direct_debit:!!form.querySelector('[name=accepted_direct_debit]').checked,
      success_url:'https://app.weldinspectpro.com/login?billing=success',
      cancel_url:window.location.href
    };
    try {
      const res = await fetch(`${API_BASE}/api/v1/billing/checkout/direct`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
      const body = await res.json().catch(()=>({}));
      if (!res.ok || !body.checkout_url) throw new Error(body.detail || body.message || 'Checkout kon niet worden aangemaakt.');
      status.textContent='Je wordt doorgestuurd naar Mollie...';
      window.location.href = body.checkout_url;
    } catch (err) {
      status.className='status-box error'; status.textContent=err.message || String(err); submit.disabled=false;
    }
  });
})();