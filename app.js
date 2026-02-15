function qs(id){ return document.getElementById(id); }

async function checkAccess(){
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function gatherData(){
  // Support both old and new field sets (if some inputs don't exist, it's fine)
  const get = (id) => (qs(id) ? qs(id).value : "");

  return {
    name: get("name"),
    title: get("title"),
    email: get("email"),
    phone: get("phone"),
    summary: get("summary"),

    // New template fields
    location: get("location"),
    linkedin: get("linkedin"),
    education: get("education"),
    licenses: get("licenses"),
    clinicalSkills: get("clinicalSkills"),
    coreCompetencies: get("coreCompetencies"),
    languages: get("languages"),
    experience: get("experience"),
    achievements: get("achievements"),
    volunteer: get("volunteer"),

    // Keep backwards compat (unused by new template, but harmless)
    skills: get("skills"),
  };
}

function render(){
  const preview = qs("preview");
  if (!preview) return;

  if (typeof window.renderCV !== "function") {
    preview.innerHTML = `<p style="padding:16px">Missing template function: window.renderCV</p>`;
    return;
  }

  preview.innerHTML = window.renderCV(gatherData());
}

function bindLiveInputs(){
  // Live update on every input/textarea
  const handler = (e) => {
    const t = e.target;
    if (!t) return;
    const tag = String(t.tagName || "").toUpperCase();
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
      render();
    }
  };

  document.addEventListener("input", handler);
  document.addEventListener("change", handler);

  const printBtn = qs("printBtn");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      // Print the current page using your CSS @media print
      window.print();
    });
  }

  const downloadHtmlBtn = qs("downloadHtmlBtn");
  if (downloadHtmlBtn) {
    downloadHtmlBtn.addEventListener("click", () => {
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>CV</title>
  <link rel="stylesheet" href="${location.origin}/styles.css">
</head>
<body>
  ${qs("preview") ? qs("preview").outerHTML : ""}
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "cv.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  const logoutBtn = qs("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await fetch("/api/logout", { method: "POST" }).catch(() => {});
      location.reload();
    });
  }
}

async function init(){
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  // Set Payhip URL
  const buyLink = qs("buyLink");
  if (buyLink) buyLink.href = "https://payhip.com/b/AeoVP";

  const me = await checkAccess().catch(() => null);

  // Support different response shapes:
  // - { has_access: true } (my suggested /api/me)
  // - { hasAccess: true }  (your old code)
  // - { ok: true, has_access: true }
  const hasAccess =
    Boolean(me?.has_access) ||
    Boolean(me?.hasAccess) ||
    (Boolean(me?.ok) && Boolean(me?.has_access));

  if (!hasAccess){
    if (locked) locked.style.display = "block";
    if (app) app.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    return;
  }

  if (locked) locked.style.display = "none";
  if (app) app.style.display = "block";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";

  // Initial render + bind live updates
  render();
  bindLiveInputs();
}

init();
