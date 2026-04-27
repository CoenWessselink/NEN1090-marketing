// Pricing calculator (client-side)
// - Uses sensible defaults, but allows overriding via window.__NEN1090_PRICING__
// - VAT: NL 21% default; EU reverse charge (0%) option.

(function(){
  function euro(n){
    try{ return new Intl.NumberFormat('nl-NL', {style:'currency', currency:'EUR', maximumFractionDigits:0}).format(n); }
    catch(_){ return '€ ' + Math.round(n); }
  }

  const cfg = window.__NEN1090_PRICING__ || {
    standard: { perSeatYear: 299 },
    pro: { perSeatYear: 399 }
  };

  const els = {
    plan: document.getElementById('calcPlan'),
    seats: document.getElementById('calcSeats'),
    seatsOut: document.getElementById('calcSeatsOut'),
    vat: document.getElementById('calcVat'),
    net: document.getElementById('calcNet'),
    vatAmt: document.getElementById('calcVatAmt'),
    gross: document.getElementById('calcGross'),
    cta: document.getElementById('calcCta')
  };

  if(!els.plan || !els.seats) return;

  function getPerSeat(){
    const p = String(els.plan.value || 'standard');
    return (cfg[p] && cfg[p].perSeatYear) ? Number(cfg[p].perSeatYear) : 0;
  }

  function getVatRate(){
    const v = String(els.vat.value || 'nl21');
    if(v === 'eu0') return 0;
    return 0.21;
  }

  function render(){
    const seats = Math.max(1, Number(els.seats.value || 1));
    els.seats.value = String(seats);
    if(els.seatsOut) els.seatsOut.textContent = String(seats);
    const net = seats * getPerSeat();
    const vat = Math.round(net * getVatRate());
    const gross = net + vat;
    if(els.net) els.net.textContent = euro(net);
    if(els.vatAmt) els.vatAmt.textContent = euro(vat);
    if(els.gross) els.gross.textContent = euro(gross);
    if(els.cta){
      const url = new URL('./checkout.html', location.href);
      url.searchParams.set('plan', String(els.plan.value||'standard'));
      url.searchParams.set('seats', String(seats));
      els.cta.href = url.toString();
    }
  }

  ['change','input'].forEach(evt => {
    els.plan.addEventListener(evt, render);
    els.seats.addEventListener(evt, render);
    if(els.vat) els.vat.addEventListener(evt, render);
  });
  render();
})();
