document.getElementById("trialForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;

    const payload = {
        company_name: form.elements["company"]?.value?.trim() || "",
        email: form.elements["work_email"]?.value?.trim() || "",
        contact_name: form.elements["contact_name"]?.value?.trim() || "",
        seats: Number(form.elements["seats"]?.value || 1),
        plan_code: form.elements["plan"]?.value || "professional",
        trial_days: Number(form.elements["trial_days"]?.value || 14),
        notes: form.elements["notes"]?.value?.trim() || ""
    };

    console.log("Payload:", payload);
});
