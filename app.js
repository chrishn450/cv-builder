import { templateHTML } from './templates.js';

function normalize(s) {
  return String(s ?? "").replace(/\u00A0/g, " ").trim();
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("activateBtn");
  const resetBtn = document.getElementById("resetBtn");
  const input = document.getElementById("licenseInput");
  const status = document.getElementById("status");
  const builder = document.getElementById("builder");

  function setUnlocked(v) {
    localStorage.setItem("cv_unlocked", v ? "true" : "false");
  }

  function isUnlocked() {
    return localStorage.getItem("cv_unlocked") === "true";
  }

  function updateUI() {
    builder.innerHTML = isUnlocked() ? templateHTML : "";
    document.body.classList.toggle("unlocked", isUnlocked());
  }

  btn.onclick = async () => {
    status.className = "status";
    status.textContent = "Verifiserer…";
    const key = normalize(input.value);

    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: key }),
    });

    const data = await res.json().catch(() => ({}));
    console.log("verify response:", data);

    if (data.ok) {
      setUnlocked(true);
      status.classList.add("ok");
      status.textContent = "Låst opp ✅";
      updateUI();
    } else {
      setUnlocked(false);
      status.classList.add("err");
      const extra = data.rawText ? ` | ${data.rawText}` : "";
      const code = data.payhip_status ? `${data.payhip_status} ` : "";
      status.textContent = `${code}${data.error || "Ugyldig kode"}${extra}`;
      updateUI();
    }
  };

  resetBtn.onclick = () => {
    setUnlocked(false);
    status.className = "status";
    status.textContent = "Nullstilt.";
    updateUI();
  };

  updateUI();
});
