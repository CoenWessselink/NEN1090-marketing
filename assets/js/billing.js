(function () {
  const plans = {
    starter: {
      key: 'starter',
      name: 'Starter',
      badge: 'Voor kleine teams',
      subtitle: 'Basis voor gecertificeerde project- en lascontrole met een compacte inrichting.',
      monthlyPerSeat: 29,
      yearlyPerSeat: 24,
      minSeats: 3,
      recommendedSeats: 3,
      setupLabel: 'Snelle onboarding',
      cta: 'Kies Starter',
      features: ['Projectbasis en klantbeheer', 'NEN-1090 documentatie', 'Standaard onboarding'],
    },
    professional: {
      key: 'professional',
      name: 'Professional',
      badge: 'Meest gekozen',
      subtitle: 'Voor productiebedrijven die planning, lascontrole en CE-dossiers in één flow willen beheren.',
      monthlyPerSeat: 49,
      yearlyPerSeat: 42,
      minSeats: 5,
      recommendedSeats: 8,
      setupLabel: 'Implementatiebegeleiding',
      cta: 'Kies Professional',
      features: ['Volledige project- en lascontroleflow', 'CE-dossiers en audittrail', 'Snelle livegang voor meerdere teams'],
    },
    enterprise: {
      key: 'enterprise',
      name: 'Enterprise',
      badge: 'Voor grotere organisaties',
      subtitle: 'Voor meerdere vestigingen, zwaardere governance en uitrol op tenantniveau.',
      monthlyPerSeat: 69,
      yearlyPerSeat: 59,
      minSeats: 10,
      recommendedSeats: 15,
      setupLabel: 'Gefaseerde enterprise onboarding',
      cta: 'Kies Enterprise',
      features: ['Multi-team uitrol', 'Uitgebreide onboarding en afstemming', 'Prioritaire ondersteuning'],
    },
  };

  const currency = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
  const CHECKOUT_STORAGE_KEY = 'nen1090.checkout.intent';
  const PAYMENT_STORAGE_KEY = 'nen1090.checkout.payment';

  function getPlan(planKey) {
    return plans[String(planKey || '').trim()] || plans.professional;
  }

  function parseSearch() {
    const search = new URLSearchParams(window.location.search);
    return {
      plan: search.get('plan') || 'professional',
      billing: search.get('billing') === 'yearly' ? 'yearly' : 'monthly',
      seats: Math.max(1, Number(search.get('seats') || 0)) || null,
      paymentId: search.get('paymentId') || search.get('id') || search.get('orderId') || '',
      orderRef: search.get('orderRef') || search.get('reference') || '',
    };
  }

  function getPrice(plan, billing) {
    return billing === 'yearly' ? plan.yearlyPerSeat : plan.monthlyPerSeat;
  }

  function getSummary(planKey, billing, seats) {
    const plan = getPlan(planKey);
    const normalizedSeats = Math.max(plan.minSeats, Number(seats || plan.recommendedSeats));
    const seatPrice = getPrice(plan, billing);
    const subtotal = normalizedSeats * seatPrice;
    const discount = billing === 'yearly' ? (plan.monthlyPerSeat - plan.yearlyPerSeat) * normalizedSeats : 0;
    return {
      plan,
      billing,
      seats: normalizedSeats,
      seatPrice,
      subtotal,
      discount,
      billingLabel: billing === 'yearly' ? 'jaarbetaling' : 'maandbetaling',
      totalLabel: billing === 'yearly' ? `${currency.format(subtotal)} per maand, jaarlijks gefactureerd` : `${currency.format(subtotal)} per maand`,
    };
  }

  function setUrlState(planKey, billing, seats) {
    const url = new URL(window.location.href);
    url.searchParams.set('plan', planKey);
    url.searchParams.set('billing', billing);
    url.searchParams.set('seats', String(seats));
    history.replaceState({}, '', url.toString());
  }

  function setToggleButtons(container, billing) {
    container.querySelectorAll('[data-billing-toggle]').forEach((btn) => {
      const active = btn.getAttribute('data-billing-toggle') === billing;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function writeCheckoutIntent(intent) {
    try {
      sessionStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(intent));
    } catch (_) {}
  }

  function readCheckoutIntent() {
    try {
      return JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function writePaymentState(payment) {
    try {
      sessionStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payment));
    } catch (_) {}
  }

  function readPaymentState() {
    try {
      return JSON.parse(sessionStorage.getItem(PAYMENT_STORAGE_KEY) || 'null');
    } catch (_) {
      return null;
    }
  }

  function humanBilling(billing) {
    return billing === 'yearly' ? 'Jaarlijks' : 'Maandelijks';
  }

  function buildResumeUrl(intent) {
    const plan = intent?.plan || 'professional';
    const billing = intent?.billing === 'yearly' ? 'yearly' : 'monthly';
    const seats = Math.max(1, Number(intent?.seats || 0)) || getPlan(plan).recommendedSeats;
    return `/checkout.html?plan=${encodeURIComponent(plan)}&billing=${encodeURIComponent(billing)}&seats=${seats}`;
  }

  function mountPricing() {
    const root = document.querySelector('[data-billing-pricing]');
    if (!root) return;

    const state = parseSearch();
    let currentPlan = getPlan(state.plan).key;
    let currentBilling = state.billing;
    let currentSeats = state.seats || getPlan(currentPlan).recommendedSeats;

    const cards = Array.from(root.querySelectorAll('[data-plan-card]'));
    const preview = root.querySelector('[data-pricing-preview]');
    const previewPlan = root.querySelector('[data-preview-plan]');
    const previewText = root.querySelector('[data-preview-text]');
    const previewSeats = root.querySelector('[data-preview-seats]');
    const previewPrice = root.querySelector('[data-preview-price]');
    const previewCta = root.querySelector('[data-preview-cta]');
    const seatInput = root.querySelector('[data-pricing-seats]');
    const seatOutput = root.querySelector('[data-pricing-seats-output]');

    function render() {
      const summary = getSummary(currentPlan, currentBilling, currentSeats);
      currentSeats = summary.seats;
      setUrlState(currentPlan, currentBilling, currentSeats);
      setToggleButtons(root, currentBilling);

      cards.forEach((card) => {
        const key = card.getAttribute('data-plan-card');
        const plan = getPlan(key);
        const active = key === currentPlan;
        card.classList.toggle('is-selected', active);
        card.querySelector('[data-plan-badge]').textContent = plan.badge;
        card.querySelector('[data-plan-name]').textContent = plan.name;
        card.querySelector('[data-plan-subtitle]').textContent = plan.subtitle;
        card.querySelector('[data-plan-setup]').textContent = plan.setupLabel;
        card.querySelector('[data-plan-price]').textContent = currency.format(getPrice(plan, currentBilling));
        card.querySelector('[data-plan-price-note]').textContent = currentBilling === 'yearly' ? 'per gebruiker per maand, jaarlijks gefactureerd' : 'per gebruiker per maand';
        const features = card.querySelector('[data-plan-features]');
        features.innerHTML = plan.features.map((item) => `<li>${item}</li>`).join('');
        const action = card.querySelector('[data-plan-action]');
        action.href = `/checkout.html?plan=${encodeURIComponent(plan.key)}&billing=${encodeURIComponent(currentBilling)}&seats=${summary.seats}`;
        action.textContent = plan.cta;
      });

      if (seatInput) {
        seatInput.value = String(currentSeats);
        seatInput.min = String(summary.plan.minSeats);
      }
      if (seatOutput) seatOutput.textContent = String(currentSeats);
      if (preview) preview.dataset.plan = summary.plan.key;
      if (previewPlan) previewPlan.textContent = summary.plan.name;
      if (previewText) previewText.textContent = `${summary.seats} gebruikers · ${summary.billingLabel}`;
      if (previewSeats) previewSeats.textContent = `${summary.seats} gebruikers`;
      if (previewPrice) previewPrice.textContent = summary.totalLabel;
      if (previewCta) previewCta.href = `/checkout.html?plan=${encodeURIComponent(summary.plan.key)}&billing=${encodeURIComponent(summary.billing)}&seats=${summary.seats}`;
    }

    root.querySelectorAll('[data-billing-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentBilling = btn.getAttribute('data-billing-toggle') === 'yearly' ? 'yearly' : 'monthly';
        render();
      });
    });

    cards.forEach((card) => {
      const key = card.getAttribute('data-plan-card');
      card.addEventListener('click', (event) => {
        if (event.target.closest('a, button')) return;
        currentPlan = key;
        currentSeats = Math.max(getPlan(currentPlan).minSeats, currentSeats);
        render();
      });
      card.querySelector('[data-select-plan]').addEventListener('click', () => {
        currentPlan = key;
        currentSeats = Math.max(getPlan(currentPlan).minSeats, currentSeats);
        render();
      });
    });

    if (seatInput) {
      seatInput.addEventListener('input', () => {
        currentSeats = Number(seatInput.value || 0);
        render();
      });
    }

    render();
  }

  function mountCheckout() {
    const form = document.querySelector('[data-checkout-form]');
    if (!form) return;

    const state = parseSearch();
    let currentPlan = getPlan(state.plan).key;
    let currentBilling = state.billing;
    let currentSeats = state.seats || getPlan(currentPlan).recommendedSeats;

    const status = form.querySelector('[data-checkout-status]');
    const submitBtn = form.querySelector('[data-checkout-submit]');
    const seatInput = form.querySelector('[name="seats"]');
    const seatOutput = form.querySelector('[data-checkout-seat-output]');
    const summaryPlan = document.querySelector('[data-summary-plan]');
    const summaryBilling = document.querySelector('[data-summary-billing]');
    const summarySeats = document.querySelector('[data-summary-seats]');
    const summarySeatPrice = document.querySelector('[data-summary-seat-price]');
    const summaryDiscount = document.querySelector('[data-summary-discount]');
    const summaryDiscountRow = document.querySelector('[data-summary-discount-row]');
    const summaryTotal = document.querySelector('[data-summary-total]');
    const hiddenPlan = form.querySelector('[name="plan"]');
    const hiddenBilling = form.querySelector('[name="billing"]');
    const hiddenTurnstile = form.querySelector('[name="turnstileToken"]');

    function setStatus(message, type) {
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
      status.className = `billing-status${type ? ` is-${type}` : ''}`;
    }

    function clearStatus() {
      if (!status) return;
      status.hidden = true;
      status.textContent = '';
      status.className = 'billing-status';
    }

    function renderSummary() {
      const summary = getSummary(currentPlan, currentBilling, currentSeats);
      currentSeats = summary.seats;
      if (seatInput) {
        seatInput.min = String(summary.plan.minSeats);
        seatInput.value = String(summary.seats);
      }
      if (seatOutput) seatOutput.textContent = String(summary.seats);
      if (hiddenPlan) hiddenPlan.value = summary.plan.key;
      if (hiddenBilling) hiddenBilling.value = summary.billing;
      setToggleButtons(form, summary.billing);
      setUrlState(summary.plan.key, summary.billing, summary.seats);

      if (summaryPlan) summaryPlan.textContent = summary.plan.name;
      if (summaryBilling) summaryBilling.textContent = humanBilling(summary.billing);
      if (summarySeats) summarySeats.textContent = `${summary.seats} gebruikers`;
      if (summarySeatPrice) summarySeatPrice.textContent = `${currency.format(summary.seatPrice)} per gebruiker`;
      if (summaryTotal) summaryTotal.textContent = summary.totalLabel;
      if (summary.discount > 0) {
        if (summaryDiscountRow) summaryDiscountRow.hidden = false;
        if (summaryDiscount) summaryDiscount.textContent = `${currency.format(summary.discount)} voordeel per maand t.o.v. maandbetaling`;
      } else if (summaryDiscountRow) {
        summaryDiscountRow.hidden = true;
      }

      form.querySelectorAll('[data-checkout-plan-option]').forEach((button) => {
        const active = button.getAttribute('data-checkout-plan-option') === summary.plan.key;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    }

    function collectTurnstileToken() {
      const responseField = form.querySelector('[name="cf-turnstile-response"]');
      if (hiddenTurnstile && responseField) hiddenTurnstile.value = responseField.value || '';
    }

    form.querySelectorAll('[data-billing-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentBilling = btn.getAttribute('data-billing-toggle') === 'yearly' ? 'yearly' : 'monthly';
        renderSummary();
      });
    });

    form.querySelectorAll('[data-checkout-plan-option]').forEach((button) => {
      button.addEventListener('click', () => {
        currentPlan = button.getAttribute('data-checkout-plan-option') || 'professional';
        currentSeats = Math.max(getPlan(currentPlan).minSeats, Number(seatInput?.value || currentSeats));
        renderSummary();
      });
    });

    if (seatInput) {
      seatInput.addEventListener('input', () => {
        currentSeats = Number(seatInput.value || 0);
        renderSummary();
      });
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      collectTurnstileToken();
      clearStatus();

      const formData = new FormData(form);
      const accepted = formData.get('acceptTerms') === 'on';
      if (!accepted) {
        setStatus('Bevestig eerst dat u akkoord gaat met de voorwaarden en privacyverklaring.', 'error');
        return;
      }

      const payload = {
        company: String(formData.get('company') || '').trim(),
        contactName: String(formData.get('contactName') || '').trim(),
        email: String(formData.get('email') || '').trim(),
        phone: String(formData.get('phone') || '').trim(),
        seats: Number(formData.get('seats') || 0),
        plan: String(formData.get('plan') || currentPlan).trim(),
        billing: String(formData.get('billing') || currentBilling).trim(),
        notes: String(formData.get('notes') || '').trim(),
        source: 'marketing-checkout',
        turnstileToken: String(formData.get('turnstileToken') || '').trim(),
      };

      if (!payload.company || !payload.contactName || !payload.email) {
        setStatus('Vul bedrijfsnaam, contactpersoon en e-mailadres in om verder te gaan.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Bezig met doorsturen...';
      setStatus('Uw checkout wordt voorbereid. U gaat zo direct door naar de beveiligde betaalpagina.', 'info');

      writeCheckoutIntent({
        company: payload.company,
        contactName: payload.contactName,
        email: payload.email,
        phone: payload.phone,
        notes: payload.notes,
        plan: payload.plan,
        billing: payload.billing,
        seats: payload.seats,
      });

      try {
        const response = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || data?.message || 'CHECKOUT_FAILED');
        }

        if (data.paymentId) {
          writePaymentState({
            paymentId: data.paymentId,
            plan: payload.plan,
            billing: payload.billing,
            seats: payload.seats,
            email: payload.email,
            orderRef: data.orderRef || '',
          });
        }

        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }

        setStatus('De betaalomgeving is nog niet volledig geconfigureerd. De checkout-aanvraag is wel voorbereid.', 'warning');
      } catch (error) {
        const message = normalizeCheckoutError(error?.message || 'CHECKOUT_FAILED');
        setStatus(message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ga door naar betalen';
      }
    });

    renderSummary();
  }

  function mountSuccess() {
    const root = document.querySelector('[data-success-panel]');
    if (!root) return;

    const state = parseSearch();
    const payment = readPaymentState();
    const intent = readCheckoutIntent();
    const paymentId = state.paymentId || payment?.paymentId || '';
    const orderRef = state.orderRef || payment?.orderRef || '';
    const title = root.querySelector('[data-success-title]');
    const copy = root.querySelector('[data-success-copy]');
    const statusEl = root.querySelector('[data-success-status]');
    const paymentIdEl = root.querySelector('[data-success-payment-id]');
    const planEl = root.querySelector('[data-success-plan]');
    const billingEl = root.querySelector('[data-success-billing]');
    const seatsEl = root.querySelector('[data-success-seats]');
    const loginBtn = root.querySelector('[data-success-login]');
    const onboardingBtn = root.querySelector('[data-success-onboarding]');
    const refreshBtn = root.querySelector('[data-success-refresh]');

    if (paymentIdEl) paymentIdEl.textContent = paymentId || orderRef || 'Nog niet beschikbaar';
    if (planEl) planEl.textContent = getPlan(payment?.plan || intent?.plan || 'professional').name;
    if (billingEl) billingEl.textContent = humanBilling(payment?.billing || intent?.billing || 'monthly');
    if (seatsEl) seatsEl.textContent = `${Math.max(1, Number(payment?.seats || intent?.seats || 0) || getPlan(payment?.plan || intent?.plan || 'professional').recommendedSeats)} gebruikers`;

    function setState(type, message, heading, body) {
      if (statusEl) {
        statusEl.className = `billing-status is-${type}`;
        statusEl.textContent = message;
      }
      if (title && heading) title.textContent = heading;
      if (copy && body) copy.textContent = body;
      root.setAttribute('data-success-state', type || 'info');
    }

    function redirectToCancel(reason, data) {
      const params = new URLSearchParams();
      if (orderRef || data?.orderRef) params.set('orderRef', orderRef || data.orderRef);
      if (paymentId || data?.paymentId) params.set('paymentId', paymentId || data.paymentId);
      if (payment?.plan || intent?.plan || data?.metadata?.plan) params.set('plan', payment?.plan || intent?.plan || data.metadata?.plan);
      if (payment?.billing || intent?.billing || data?.metadata?.billing) params.set('billing', payment?.billing || intent?.billing || data.metadata?.billing);
      if (payment?.seats || intent?.seats || data?.metadata?.seats) params.set('seats', payment?.seats || intent?.seats || data.metadata?.seats);
      if (reason) params.set('reason', reason);
      window.location.href = `/cancel.html?${params.toString()}`;
    }

    async function poll() {
      if (!paymentId && !orderRef) {
        setState('warning', 'Geen bestelreferentie gevonden.', 'Controle handmatig afronden', 'We kunnen de status niet automatisch ophalen zonder orderRef of paymentId. Gebruik de link uit uw betaalbevestiging of start de checkout opnieuw.');
        if (loginBtn) loginBtn.hidden = false;
        if (onboardingBtn) onboardingBtn.hidden = true;
        return 'warning';
      }
      setState('info', 'Bezig met controleren…', 'Betaling wordt gecontroleerd', 'Een ogenblik. We halen de betaalstatus en activatie op.');
      refreshBtn.disabled = true;
      try {
        const refQuery = paymentId ? `paymentId=${encodeURIComponent(paymentId)}` : `orderRef=${encodeURIComponent(orderRef)}`;
        const res = await fetch(`/api/checkout/status?${refQuery}`, { headers: { 'Accept': 'application/json' } });
        const data = await res.json().catch(() => ({}));

        if (res.status === 401) {
          setState('warning', 'Sessie verlopen.', 'Log opnieuw in om verder te gaan', 'Uw sessie is verlopen tijdens het ophalen van de bestelstatus. Log opnieuw in en open daarna deze pagina nogmaals.');
          if (loginBtn) loginBtn.hidden = false;
          return 'warning';
        }

        if (!res.ok || !data?.ok) throw new Error(data?.error || 'STATUS_FAILED');

        if (data.metadata) {
          if (planEl && data.metadata.planLabel) planEl.textContent = data.metadata.planLabel;
          if (billingEl && data.metadata.billing) billingEl.textContent = humanBilling(data.metadata.billing);
          if (seatsEl && data.metadata.seats) seatsEl.textContent = `${data.metadata.seats} gebruikers`;
        }

        const normalizedStatus = String(data.status || '').toLowerCase();
        const activationStatus = String(data.activationStatus || '').toLowerCase();

        if (data.isPaid && data.activated) {
          setState('success', 'Uw omgeving is actief.', 'Bestelling afgerond', 'De betaling is bevestigd en de tenant is geactiveerd. U kunt nu verder met onboarding of direct inloggen.');
          if (loginBtn) loginBtn.hidden = false;
          if (onboardingBtn) {
            onboardingBtn.hidden = !data.onboardingUrl;
            onboardingBtn.href = data.onboardingUrl || '/app/set-password.html';
          }
          return 'success';
        }

        if (data.isPaid && ['pending_activation', 'queued', 'provisioning', 'processing'].includes(activationStatus)) {
          setState('warning', 'Betaling ontvangen, activatie loopt nog.', 'Betaling is gelukt', 'De betaling is bevestigd. We ronden nu de activatie en onboarding af. Controleer uw e-mail over enkele minuten opnieuw.');
          if (loginBtn) loginBtn.hidden = false;
          if (onboardingBtn && data.onboardingUrl) {
            onboardingBtn.hidden = false;
            onboardingBtn.href = data.onboardingUrl;
          }
          return 'warning';
        }

        if (data.isPaid && ['activation_failed', 'tenant_failed', 'failed'].includes(activationStatus)) {
          setState('error', 'Betaling ontvangen, maar activatie is nog niet afgerond.', 'Handmatige opvolging nodig', 'De betaling is ontvangen, maar de omgeving is nog niet volledig geactiveerd. Neem contact op zodat we dit direct kunnen afronden.');
          if (loginBtn) loginBtn.hidden = false;
          return 'error';
        }

        if (data.isPaid) {
          setState('warning', 'Betaling ontvangen, activatie loopt nog.', 'Betaling is gelukt', 'De betaling is bevestigd. We wachten nog op de laatste backend-bevestiging. Controleer deze pagina over enkele minuten opnieuw.');
          if (loginBtn) loginBtn.hidden = false;
          if (onboardingBtn && data.onboardingUrl) {
            onboardingBtn.hidden = false;
            onboardingBtn.href = data.onboardingUrl;
          }
          return 'warning';
        }

        if (['open', 'pending', 'authorized', 'pending_reference'].includes(normalizedStatus)) {
          setState('warning', 'Betaling nog niet afgerond.', 'Wachten op bevestiging', 'De betaalprovider heeft de betaling nog niet definitief afgerond. Probeer deze pagina straks opnieuw of rond de betaling af.');
          return 'warning';
        }

        if (['canceled', 'expired', 'failed'].includes(normalizedStatus)) {
          redirectToCancel(normalizedStatus, data);
          return 'error';
        }

        setState('warning', 'Status nog niet beschikbaar.', 'Controle nog niet afgerond', 'We hebben nog geen definitieve terugkoppeling ontvangen. Probeer deze pagina opnieuw.');
        return 'warning';
      } catch (error) {
        const code = String(error?.message || '').trim();
        if (code === 'PAYMENT_REFERENCE_REQUIRED') {
          setState('warning', 'Geen bestelreferentie gevonden.', 'Controle handmatig afronden', 'We kunnen de status niet ophalen zonder orderRef of paymentId. Gebruik de link uit uw betaalbevestiging of start de checkout opnieuw.');
          return 'warning';
        }
        setState('error', 'De status kon niet worden opgehaald.', 'Controle mislukt', 'We konden de betaalstatus nu niet uitlezen. Probeer het opnieuw of neem contact op als dit blijft voorkomen.');
        return 'error';
      } finally {
        refreshBtn.disabled = false;
      }
    }

    let autoRetryCount = 0;

    async function pollWithRetry() {
      const stateValue = await poll();
      if ((stateValue === 'info' || stateValue === 'warning') && autoRetryCount < 2) {
        autoRetryCount += 1;
        window.setTimeout(pollWithRetry, 5000);
      }
    }

    refreshBtn?.addEventListener('click', poll);
    pollWithRetry();
  }

  function mountCancel() {
    const resume = document.querySelector('[data-cancel-resume]');
    if (!resume) return;
    const pricing = document.querySelector('[data-cancel-pricing]');
    const planEl = document.querySelector('[data-cancel-plan]');
    const billingEl = document.querySelector('[data-cancel-billing]');
    const seatsEl = document.querySelector('[data-cancel-seats]');
    const reasonEl = document.querySelector('[data-cancel-reason]');
    const searchState = parseSearch();
    const intent = readCheckoutIntent() || {
      plan: searchState.plan || 'professional',
      billing: searchState.billing || 'monthly',
      seats: searchState.seats || getPlan(searchState.plan || 'professional').recommendedSeats,
    };
    const url = buildResumeUrl(intent);
    resume.href = url;
    if (pricing) pricing.href = `/pricing.html?plan=${encodeURIComponent(intent.plan)}&billing=${encodeURIComponent(intent.billing)}&seats=${Math.max(1, Number(intent.seats || 1))}`;
    if (planEl) planEl.textContent = getPlan(intent.plan).name;
    if (billingEl) billingEl.textContent = humanBilling(intent.billing);
    if (seatsEl) seatsEl.textContent = `${Math.max(1, Number(intent.seats || 1))} gebruikers`;
    if (reasonEl) {
      const reason = String(new URLSearchParams(window.location.search).get('reason') || '').trim().toLowerCase();
      const map = {
        canceled: 'De betaling is door de gebruiker afgebroken bij Mollie.',
        expired: 'De betaalpagina is verlopen voordat de betaling werd afgerond.',
        failed: 'De betaling is door de betaalprovider afgewezen of mislukt.',
      };
      reasonEl.textContent = map[reason] || 'De checkout is nog niet afgerond. U kunt dezelfde bestelling opnieuw openen of eerst de pakketkeuze aanpassen.';
    }
  }

  function normalizeCheckoutError(message) {
    switch (String(message || '').trim()) {
      case 'EMAIL_REQUIRED':
        return 'Voer een geldig e-mailadres in.';
      case 'TERMS_REQUIRED':
        return 'Accepteer de voorwaarden en privacyverklaring om verder te gaan.';
      case 'TURNSTILE_REQUIRED':
        return 'Bevestig eerst de beveiligingscontrole.';
      case 'TURNSTILE_NOT_CONFIGURED':
        return 'De beveiligingscontrole is nog niet actief ingesteld op deze omgeving.';
      case 'RATE_LIMIT':
        return 'Er zijn in korte tijd te veel checkout-aanvragen gedaan. Probeer het over enkele minuten opnieuw.';
      case 'MOLLIE_CREATE_FAILED':
        return 'De betaalomgeving kon niet worden gestart. Controleer de Mollie-configuratie in Cloudflare Pages.';
      case 'CHECKOUT_BASE_URL_REQUIRED':
        return 'De terugkeer-URL voor de checkout is nog niet ingesteld.';
      case 'CHECKOUT_ENV_MISSING':
        return 'De checkout-omgeving is niet volledig geconfigureerd. Controleer de vereiste Cloudflare Pages variabelen.';
      case 'MOLLIE_CONFIG_REQUIRED':
        return 'Mollie is nog niet volledig geconfigureerd in deze omgeving.';
      default:
        return 'Er ging iets mis bij het voorbereiden van de betaling. Controleer de ingevulde gegevens en probeer het opnieuw.';
    }
  }



  async function fetchJson(url, options) {
    const response = await fetch(url, options || {});
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      const err = new Error(data?.message || data?.error || 'REQUEST_FAILED');
      err.data = data;
      throw err;
    }
    return data;
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
  }

  function formatMoney(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return '—';
    return currency.format(num);
  }

  function billingLabel(value) {
    return String(value || '').trim() === 'yearly' ? 'Jaarlijks' : 'Maandelijks';
  }

  function planLabel(planKey) {
    return getPlan(planKey).name;
  }

  function updatePlanButtons(container, selector, attr, value) {
    container.querySelectorAll(selector).forEach((button) => {
      const active = button.getAttribute(attr) === value;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function normalizeSubscriptionError(error) {
    const code = String(error?.data?.error || error?.message || '').trim();
    switch (code) {
      case 'SUBSCRIPTION_FETCH_FAILED':
        return 'De abonnementsgegevens konden niet worden opgehaald. Controleer de backend-billingroute en je sessie.';
      case 'SUBSCRIPTION_UPDATE_FAILED':
        return 'Het abonnement kon niet worden bijgewerkt. Controleer of het backend-endpoint voor updates beschikbaar is.';
      case 'SUBSCRIPTION_CANCEL_FAILED':
        return 'Het abonnement kon niet worden stopgezet. Controleer de billing-configuratie of probeer het later opnieuw.';
      case 'SUBSCRIPTION_CONTRACT_INVALID':
        return 'De backend gaf geen geldig abonnementscontract terug. Controleer de responsevelden voor billing.';
      case 'BACKEND_API_BASE_REQUIRED':
        return 'De backend-URL voor billing is niet ingesteld in deze omgeving.';
      case 'PLAN_REQUIRED':
        return 'Kies eerst een pakket.';
      case 'SEATS_REQUIRED':
        return 'Geef een geldig aantal gebruikers op.';
      case 'SESSION_REQUIRED':
        return 'Uw sessie is verlopen. Log opnieuw in om het abonnement te beheren.';
      case 'FORBIDDEN':
        return 'Uw account heeft geen rechten om abonnementen te wijzigen.';
      case 'SUBSCRIPTION_CONFLICT':
        return 'Er loopt al een wijziging of opzegging. Wacht op backend-bevestiging voordat u opnieuw wijzigt.';
      case 'VALIDATION_ERROR':
        return 'De wijziging voldoet nog niet aan de contractregels voor seats of pakketkeuze.';
      default:
        return 'Er is iets misgegaan bij het verwerken van het abonnement. Probeer het opnieuw.';
    }
  }

  function mountSubscription() {
    const form = document.querySelector('[data-subscription-form]');
    if (!form) return;

    const status = document.querySelector('[data-subscription-status]');
    const companyInput = document.getElementById('subscriptionCompany');
    const emailInput = document.getElementById('subscriptionEmail');
    const seatsInput = document.querySelector('[data-subscription-seats]');
    const seatOutput = document.querySelector('[data-subscription-seat-output]');
    const seatPill = document.querySelector('[data-subscription-seat-pill]');
    const cancelButton = document.querySelector('[data-subscription-cancel]');
    const portalLink = document.querySelector('[data-subscription-portal]');
    const invoicesWrap = document.querySelector('[data-subscription-invoices-wrap]');
    const invoicesBody = document.querySelector('[data-subscription-invoices]');
    const invoicesEmpty = document.querySelector('[data-subscription-invoices-empty]');

    let state = {
      plan: 'professional',
      billing: 'monthly',
      seats: getPlan('professional').recommendedSeats,
      company: '',
      contactEmail: '',
      nextInvoiceDate: '',
      amount: null,
      status: 'active',
      portalUrl: '',
      invoices: [],
    };

    function showStatus(type, message) {
      if (!status) return;
      status.hidden = false;
      status.className = `billing-status is-${type}`;
      status.textContent = message;
    }

    function clearStatus() {
      if (!status) return;
      status.hidden = true;
      status.textContent = '';
      status.className = 'billing-status';
    }

    function renderInvoices() {
      if (!invoicesWrap || !invoicesBody || !invoicesEmpty) return;
      if (!state.invoices || !state.invoices.length) {
        invoicesWrap.hidden = true;
        invoicesEmpty.hidden = false;
        invoicesEmpty.textContent = 'Nog geen facturen beschikbaar voor deze tenant.';
        return;
      }
      invoicesWrap.hidden = false;
      invoicesEmpty.hidden = true;
      invoicesBody.innerHTML = state.invoices.map((invoice) => {
        const action = invoice.url ? `<a class="billing-inline-link" href="${invoice.url}" target="_blank" rel="noopener">Download</a>` : '<span class="billing-small">Geen link</span>';
        return `
          <tr>
            <td>${invoice.number || invoice.id}</td>
            <td>${formatDate(invoice.date)}</td>
            <td><span class="billing-status-chip is-${String(invoice.status || 'paid').toLowerCase()}">${invoice.status || 'paid'}</span></td>
            <td>${formatMoney(invoice.amount)}</td>
            <td>${action}</td>
          </tr>`;
      }).join('');
    }

    function renderSummary() {
      const summary = getSummary(state.plan, state.billing, state.seats);
      state.seats = summary.seats;
      if (companyInput) companyInput.value = state.company || '—';
      if (emailInput) emailInput.value = state.contactEmail || '—';
      if (seatsInput) {
        seatsInput.value = String(summary.seats);
        seatsInput.min = String(summary.plan.minSeats);
      }
      if (seatOutput) seatOutput.textContent = `${summary.seats} gebruikers`;
      if (seatPill) seatPill.textContent = `${summary.seats} seats`;
      const map = {
        '[data-subscription-current-plan]': planLabel(state.plan),
        '[data-subscription-current-seats]': `${summary.seats} gebruikers`,
        '[data-subscription-current-billing]': billingLabel(state.billing),
        '[data-subscription-next-invoice]': formatDate(state.nextInvoiceDate),
        '[data-subscription-summary-plan]': planLabel(state.plan),
        '[data-subscription-summary-billing]': billingLabel(state.billing),
        '[data-subscription-summary-seats]': `${summary.seats} gebruikers`,
        '[data-subscription-summary-seat-price]': `${currency.format(summary.seatPrice)} / seat`,
        '[data-subscription-summary-total]': summary.totalLabel,
      };
      Object.entries(map).forEach(([selector, value]) => {
        const el = document.querySelector(selector);
        if (el) el.textContent = value;
      });
      const overviewMeta = document.querySelector('[data-subscription-overview-meta]');
      if (overviewMeta) {
        const statusLabel = state.status === 'canceled' ? 'Stopgezet' : state.status === 'past_due' ? 'Achterstallig' : state.status === 'trialing' ? 'Trial' : state.status === 'incomplete' ? 'Nog niet afgerond' : 'Actief';
        const suffix = state.cancelAtPeriodEnd ? ' Het abonnement staat gemarkeerd om aan het einde van de huidige periode te stoppen.' : ' Wijzigingen worden via de bestaande backend-billingflow verwerkt.';
        overviewMeta.textContent = `Status: ${statusLabel}.${suffix}`;
      }
      if (portalLink) {
        portalLink.hidden = !state.portalUrl;
        if (state.portalUrl) portalLink.href = state.portalUrl;
      }
      if (cancelButton) {
        cancelButton.disabled = state.status === 'canceled';
        cancelButton.textContent = state.cancelAtPeriodEnd || state.status === 'canceled' ? 'Abonnement staat al op stopzetten' : 'Abonnement stopzetten';
      }
      updatePlanButtons(document, '[data-subscription-plan]', 'data-subscription-plan', state.plan);
      updatePlanButtons(document, '[data-subscription-billing]', 'data-subscription-billing', state.billing);
      renderInvoices();
    }

    async function load() {
      clearStatus();
      showStatus('info', 'Abonnementsgegevens laden...');
      try {
        if (window.NEN1090ApiAuth && window.NEN1090ApiAuth.getMe) {
          await window.NEN1090ApiAuth.getMe();
        }
        const data = await fetchJson('/api/billing/subscription');
        state = { ...state, ...(data.subscription || {}) };
        if (!state.seats) state.seats = getPlan(state.plan).recommendedSeats;
        renderSummary();
        showStatus(state.cancelAtPeriodEnd ? 'warning' : 'success', state.cancelAtPeriodEnd ? 'Abonnement geladen. Dit abonnement staat al op stopzetten aan het einde van de periode.' : 'Abonnementsgegevens geladen.');
      } catch (error) {
        showStatus('error', normalizeSubscriptionError(error));
      }
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      clearStatus();
      const saveBtn = form.querySelector('[data-subscription-save]');
      if (saveBtn) saveBtn.disabled = true;
      try {
        const result = await fetchJson('/api/billing/update-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: state.plan,
            billing: state.billing,
            seats: state.seats,
          }),
        });
        const resultStatus = String(result.result?.status || '').toLowerCase();
        const kind = ['pending', 'queued'].includes(resultStatus) ? 'warning' : 'success';
        showStatus(kind, result.result?.message || 'Abonnement bijgewerkt.');
        await load();
      } catch (error) {
        showStatus('error', normalizeSubscriptionError(error));
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });

    cancelButton?.addEventListener('click', async () => {
      const confirmed = window.confirm('Weet je zeker dat je het abonnement wilt stopzetten?');
      if (!confirmed) return;
      cancelButton.disabled = true;
      clearStatus();
      try {
        const result = await fetchJson('/api/billing/cancel-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ immediate: 0 }),
        });
        showStatus(result.result?.cancelAtPeriodEnd ? 'warning' : 'success', result.result?.message || 'Abonnement stopgezet.');
        await load();
      } catch (error) {
        showStatus('error', normalizeSubscriptionError(error));
      } finally {
        cancelButton.disabled = false;
      }
    });

    document.querySelectorAll('[data-subscription-plan]').forEach((button) => {
      button.addEventListener('click', () => {
        state.plan = button.getAttribute('data-subscription-plan') || 'professional';
        renderSummary();
      });
    });

    document.querySelectorAll('[data-subscription-billing]').forEach((button) => {
      button.addEventListener('click', () => {
        state.billing = button.getAttribute('data-subscription-billing') === 'yearly' ? 'yearly' : 'monthly';
        renderSummary();
      });
    });

    seatsInput?.addEventListener('input', () => {
      state.seats = Number(seatsInput.value || 0) || getPlan(state.plan).recommendedSeats;
      renderSummary();
    });

    renderSummary();
    load();
  }

  document.addEventListener('DOMContentLoaded', () => {
    mountPricing();
    mountCheckout();
    mountSuccess();
    mountCancel();
    mountSubscription();
  });
})();
