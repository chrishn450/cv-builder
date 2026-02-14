document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("activateBtn");
  const resetBtn = document.getElementById("resetBtn");
  const input = document.getElementById("licenseInput");
  const status = document.getElementById("status");

  function setUnlocked(v) {
    localStorage.setItem("cv_unlocked", v ? "true" : "false");
  }

  function isUnlocked() {
    return localStorage.getItem("cv_unlocked") === "true";
  }

  function updateUI() {
    document.getElementById("builder").style.display =
      isUnlocked() ? "block" : "none";
  }

  btn.onclick = async () => {
    status.textContent = "Verifying...";
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ license_key: input.value.trim() }),
    });
    const data = await res.json();
    if (data.ok) {
      setUnlocked(true);
      status.textContent = "Unlocked ✅";
      updateUI();
    } else {
      status.textContent = data.error || "Invalid code";
    }
  };

  resetBtn.onclick = () => {
    setUnlocked(false);
    updateUI();
    status.textContent = "Reset.";
  };

  updateUI();
});
