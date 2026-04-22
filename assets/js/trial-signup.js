(function () {
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

  function setMessage(kind, message) {
    const box =
      pick("[data-trial-message]", "#trial-message") ||
      (() => {
        const form = pick("[data-trial-form]", "#trial-form", "form");
        const div = document.createElement("div");
        div.id = "trial-message";
        div.setAttribute("data-trial-message", "1");
        div.style.marginBottom = "16px";
        div.style.padding = "14px 18px";
        div.style.borderRadius = "16px";
        div.style.fontSize = "16px";
        div.style.lineHeight = "1.5";
        form?.prepend(div);
        return div;
      })();

    box.textContent = message;
    box.style.display = "block";
    box.style.background = kind === "error" ? "#fef2f2" : "#ecfdf3";
    box.style.color = kind === "error" ? "#b42318" : "#027a48";
    box.style.border = kind === "error" ? "1px solid #fecdca" : "1px solid #abefc6";
  }

  async function submitTrialSignup(evt) {
    evt.preventDefault();

    const company = value(
      'input[name="company"]',
      'input[name="company_name"]',
      "#company",
      "#company_name"
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
      'input[name="seats"]',
      'input[name="seat_count"]',
      "#seats",
      "#seat_count"
    );
    const notes = value('textarea[name="notes"]', "#notes");
    const phone = value('input[name="phone"]', "#phone");

    const seats = Number.parseInt(seatRaw || "1", 10);
    const submitBtn = pick('button[type="submit"]', "#trial-submit");

    if (!company) {
      setMessage("error", "Bedrijfsnaam is verplicht.");
      return;
    }
    if (!contactName) {
      setMessage("error", "Contactpersoon is verplicht.");
      return;
    }
    if (!email) {
      setMessage("error", "Zakelijk e-mailadres is verplicht.");
      return;
    }

    const payload = {
      // legacy/public endpoint compatibility
      company: company,
      seats: Number.isFinite(seats) ? seats : 1,

      // newer/canonical endpoint compatibility
      company_name: company,
      contact_name: contactName,
      email: email,
      work_email: email,
      seat_count: Number.isFinite(seats) ? seats : 1,
      notes: notes,
      phone: phone,
      plan_code: "trial",
      source: "marketing-onboarding"
    };

    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent || "Start trial";
        submitBtn.textContent = "Bezig...";
      }

      const candidateEndpoints = [
        "/api/v1/onboarding/trial-signup",
        "/api/public/trial/signup",
      ];

      let res = null;
      let data = null;
      for (const endpoint of candidateEndpoints) {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        try {
          data = await res.json();
        } catch (_) {
          data = null;
        }

        if (res.ok) {
          break;
        }

        if (![404, 405].includes(res.status)) {
          break;
        }
      }

      if (!res || !res.ok) {
        const detail =
          data?.error?.message ||
          data?.detail?.message ||
          data?.detail ||
          data?.message ||
          "Trialaanvraag kon niet worden verwerkt.";
        setMessage("error", String(detail));
        return;
      }

      setMessage(
        "success",
        "Je trialaanvraag is ontvangen. Controleer je e-mail voor de activatiestap."
      );
    } catch (err) {
      setMessage("error", "Netwerkfout bij het versturen van de trialaanvraag.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitBtn.dataset.originalText || "Start trial";
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = pick("[data-trial-form]", "#trial-form", "form");
    if (form && !form.dataset.trialBound) {
      form.addEventListener("submit", submitTrialSignup);
      form.dataset.trialBound = "1";
    }
  });
})();