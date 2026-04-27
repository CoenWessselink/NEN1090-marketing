document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-year]').forEach(el => el.textContent = new Date().getFullYear());
  const toggle = document.querySelector('[data-menu-toggle]');
  const panel = document.querySelector('[data-mobile-panel]');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }
  document.querySelectorAll('form[data-api]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const status = form.querySelector('.form-status');
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch(form.dataset.api, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
        if (!res.ok) throw new Error('Verzenden mislukt');
        const json = await res.json();
        if (status) status.textContent = json.message || 'Verzonden.';
        form.reset();
      } catch (err) {
        if (status) status.textContent = 'Verzenden niet gelukt. Probeer het later opnieuw.';
      }
    });
  });
});
