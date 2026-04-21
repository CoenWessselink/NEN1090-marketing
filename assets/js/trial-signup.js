const form = document.getElementById("trialForm");

async function submitTrialSignup(event) {
  event.preventDefault();
  if (!form) return;

  const submitButton = form.querySelector('[type="submit"]');
  const statusNode = document.getElementById('trialFormStatus') || document.getElementById('formStatus');
  const originalLabel = submitButton?.textContent || 'Versturen';

  const payload = {
    company_name: form.elements["company"]?.value?.trim() || "",
    contact_name: form.elements["contact_name"]?.value?.trim() || "",
    email: form.elements["work_email"]?.value?.trim() || "",
    seat_count: Number(form.elements["seats"]?.value || 1),
    plan_code: form.elements["plan"]?.value || "trial",
    phone: form.elements["phone"]?.value?.trim() || "",
    notes: form.elements["notes"]?.value?.trim() || "",
  };

  if (statusNode) statusNode.textContent = '';
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Bezig...';
  }

  try {
    const response = await fetch('/api/onboarding/trial-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || data?.detail || 'Trial-aanvraag mislukt.';
      throw new Error(String(message));
    }

    if (statusNode) {
      statusNode.textContent = String(data?.message || 'Je trial is aangemaakt. Controleer je e-mail voor de activatielink.');
    }

    form.reset();

    if (data?.activation_url) {
      form.dataset.activationUrl = String(data.activation_url);
    }
  } catch (error) {
    if (statusNode) {
      statusNode.textContent = error instanceof Error ? error.message : 'Trial-aanvraag mislukt.';
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
}

if (form) {
  form.addEventListener('submit', submitTrialSignup);
}
