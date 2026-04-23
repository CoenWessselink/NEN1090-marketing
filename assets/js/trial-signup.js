(function () {
  const CANONICAL_ENDPOINT = "/api/v1/onboarding/trial-signup";

  function qs(sel) {
    return document.querySelector(sel);
  }

  function pick(...selectors) {
    for (const sel of selectors) {
      const el = qs(sel);
      if (el) return el;
    }
    return null;
  }

  function value(...selectors) {
    const el = pick(...selectors);
    return el ? String(el.value || "").trim() : "";
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

  function readErrorMessage(data) {
    return (
      data?.error?.message ||
      data?.detail?.message ||
      data?.detail ||
      data?.message ||
      "Trialaanvraag kon niet worden verwerkt."
    );
  }

  async function submitTrialSignup(evt) {
    evt.preventDefault();

    const form = evt.currentTarget;
    const errorBox = pick("#formMessage", "[data-trial-message]", "#trial-message");
    const successBox = pick("#successMessage");
    const submitBtn = pick("#submitButton", 'button[type="submit"]', "#trial-submit");

    clearMessage(errorBox);
    clearMessage(successBox);

    const company = value(
      'input[name="company_name"]',
      'input[name="company"]',
      "#company_name",
      "#company"
    );
    const contactName = value(
      'input[name="contact_name"]',
      'input[name="full_name"]',
      "#contact_name",
      "#full_name"
    );
    const email = value(
      'input[name="email"]',
      'input[name="work_email"]',
      "#email",
      "#work_email"
    );
    const seatRaw = value(
      'input[name="seat_count"]',
      'input[name="seats"]',
      "#seat_count",
      "#seats"
    );
    const notes = value('textarea[name="notes"]', "#notes");
    const phone = value('input[name="phone"]', "#phone");
    const planCode = value('input[name="plan_code"]') || "trial";

    const seatCount = Number.parseInt(seatRaw || "1", 10);

    if (!company) {
      showMessage(errorBox, "error", "Bedrijfsnaam is verplicht.");
      return;
    }
    if (!contactName) {
      showMessage(errorBox, "error", "Contactpersoon is verplicht.");
      return;
    }
    if (!email) {
      showMessage(errorBox, "error", "Zakelijk e-mailadres is verplicht.");
      return;
    }
    if (!Number.isFinite(seatCount) || seatCount < 1) {
      showMessage(errorBox, "error", "Aantal gebruikers moet minimaal 1 zijn.");
      return;
    }

    const payload = {
      company_name: company,
      contact_name: contactName,
      email,
      seat_count: seatCount,
      notes,
      phone,
      plan_code: planCode,
      source: "marketing-onboarding",

      // tijdelijke compatibiliteit richting oudere API-contracten
      company,
      work_email: email,
      seats: seatCount
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent || "Start gratis proefperiode";
        submitBtn.textContent = "Bezig...";
      }

      const res = await fetch(CANONICAL_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }

      if (!res.ok) {
        showMessage(errorBox, "error", readErrorMessage(data));
        return;
      }

      form.reset();

      showMessage(
        successBox,
        "success",
        "",
        `
          <strong>Je trialaanvraag is ontvangen.</strong><br>
          Controleer je e-mail voor de activatiestap van je eerste beheeraccount.
          <div class="success-actions">
            <a class="secondary-btn" href="https://nen-1090-app.pages.dev/login">Naar login</a>
            <a class="secondary-btn" href="/contact.html">Demo of vragen</a>
          </div>
        `
      );
    } catch (_) {
      showMessage(errorBox, "error", "Netwerkfout bij het versturen van de trialaanvraag.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || "Start gratis proefperiode";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = pick("#trialForm", "[data-trial-form]", "#trial-form", "form");
    if (form && !form.dataset.trialBound) {
      form.addEventListener("submit", submitTrialSignup);
      form.dataset.trialBound = "1";
    }
  });
})();