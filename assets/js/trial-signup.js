(function () {
  const ENDPOINTS = [
    "/api/onboarding/trial-signup",
    "/api/v1/onboarding/trial-signup"
  ];

  function qs(sel) { return document.querySelector(sel); }
  function pick(...selectors) { for (const s of selectors) { const el = qs(s); if (el) return el; } return null; }
  function value(...selectors) { const el = pick(...selectors); return el ? String(el.value || "").trim() : ""; }

  function escapeHtml(input) {
    return String(input || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showMessage(target, kind, message, html) {
    if (!target) return;
    target.className = `message ${kind} visible`;
    if (html) target.innerHTML = html;
    else target.textContent = message || "";
  }

  function clearMessage(target) {
    if (!target) return;
    target.className = "message";
    target.textContent = "";
    target.innerHTML = "";
  }

  function isResendSuccess(delivery) {
    if (!delivery) return false;
    const mode = String(delivery.mode || "").toLowerCase();
    const ok = delivery.ok === true;
    const status = Number(delivery.provider_status_code || 0);
    return ok && mode === "resend" && (status === 0 || (status >= 200 && status < 300));
  }

  function mailWasActuallySent(data) {
    return data?.mail_ok === true || isResendSuccess(data?.delivery) || isResendSuccess(data?.confirmation_delivery);
  }

  function buildTechnicalDetails(data) {
    const runtime = data?.mail_runtime || {};
    const delivery = data?.delivery || {};
    return `
      <details class="technical-details">
        <summary>Show technical details</summary>
        <div class="trial-debug-list">
          <div><strong>provider:</strong> ${escapeHtml(runtime.provider)}</div>
          <div><strong>sender:</strong> ${escapeHtml(runtime.sender)}</div>
          <div><strong>activation.mode:</strong> ${escapeHtml(delivery.mode)}</div>
          <div><strong>activation.status:</strong> ${escapeHtml(delivery.provider_status_code)}</div>
          <div><strong>activation.error:</strong> ${escapeHtml(delivery.error)}</div>
        </div>
      </details>
    `;
  }

  function buildActivationAction(data) {
    if (!data?.activation_url) return "";
    return `<a class="secondary-btn" href="${escapeHtml(data.activation_url)}">Open activation link</a>`;
  }

  async function postWithFallback(payload) {
    let lastError = null;
    for (const endpoint of ENDPOINTS) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.status === 404 || res.status === 405) {
          lastError = new Error(`Endpoint unavailable: ${endpoint}`);
          continue;
        }
        const data = await res.json().catch(() => null);
        return { res, data, endpoint };
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error("No onboarding endpoint available");
  }

  async function submitTrialSignup(evt) {
    evt.preventDefault();

    const form = evt.currentTarget;
    const errorBox = pick("#formMessage");
    const successBox = pick("#successMessage");
    const submitBtn = pick("#submitButton");

    clearMessage(errorBox);
    clearMessage(successBox);

    const payload = {
      company_name: value("#company_name"),
      contact_name: value("#contact_name"),
      email: value("#email"),
      seat_count: Number(value("#seat_count") || 1),
      notes: value("#notes"),
      source: "marketing-onboarding"
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Creating trial...";
      }

      const { res, data } = await postWithFallback(payload);

      if (!res.ok || !data?.success) {
        showMessage(errorBox, "error", data?.message || data?.detail || "Trial request failed. Please try again.");
        return;
      }

      const mailOk = mailWasActuallySent(data);

      if (mailOk) {
        showMessage(successBox, "success", "", `
          <strong>Activation email sent</strong><br>
          Check your inbox and follow the activation link.
          <div class="success-actions">
            <a class="secondary-btn" href="https://nen-1090-app.pages.dev/login">Login</a>
          </div>
        `);
        form.reset();
        return;
      }

      showMessage(errorBox, "error", "", `
        <strong>Trial created, but email was not confirmed as sent.</strong><br>
        Use the activation link below or check the email provider configuration.
        <div class="success-actions">
          ${buildActivationAction(data)}
        </div>
        ${buildTechnicalDetails(data)}
      `);

    } catch (e) {
      showMessage(errorBox, "error", "Network error while creating the trial. Please try again.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Start free trial";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("trialForm");
    if (form) form.addEventListener("submit", submitTrialSignup);
  });
})();
