const form = document.getElementById('trialForm');
const result = document.getElementById('result');

if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      company_name: form.elements['company']?.value?.trim() || '',
      contact_name: form.elements['contact_name']?.value?.trim() || '',
      email: form.elements['email']?.value?.trim() || form.elements['work_email']?.value?.trim() || '',
      seat_count: Number(form.elements['seats']?.value || 3),
      plan_code: form.elements['plan']?.value || 'trial',
      phone: form.elements['phone']?.value?.trim() || '',
      notes: form.elements['notes']?.value?.trim() || '',
    };

    if (result) result.textContent = 'Trial wordt aangemaakt...';

    try {
      const response = await fetch('/api/onboarding/trial-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.detail || data?.message || 'Trial signup mislukt.');
      }

      if (result) result.textContent = JSON.stringify(data, null, 2);

      if (data?.activation_url) {
        window.location.href = data.activation_url;
      }
    } catch (error) {
      if (result) result.textContent = String(error instanceof Error ? error.message : error);
    }
  });
}
