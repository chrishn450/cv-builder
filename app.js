import { templateHTML } from "./templates.js";

function normalize(s) {
  return String(s ?? "").replace(/\u00A0/g, " ").trim().toUpperCase();
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("activateBtn");
  const resetBtn = document.getElementById("resetBtn");
  const input = document.getElementById("codeInput");
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
    status.textContent = "Sjekker kode…";

    const code = normalize(input.value);
    if (!code) {
      status.classList.add("err");
      status.textContent = "Skriv inn en kode.";
      return;
    }

    const res = await fetch("/api/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      setUnlocked(true);
      status.classList.add("ok");
      status.textContent = "Låst opp ✅";
      updateUI();
      return;
    }

    setUnlocked(false);
    status.classList.add("err");
    status.textContent = data.error || "Ugyldig kode";
    updateUI();
  };

  resetBtn.onclick = () => {
    setUnlocked(false);
    status.className = "status";
    status.textContent = "Nullstilt.";
    updateUI();
  };

  updateUI();
});
