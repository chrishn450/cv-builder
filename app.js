const state = {
  data: {
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    summary: "",
    education: "",
    licenses: "",
    clinicalSkills: "",
    coreCompetencies: "",
    languages: "",
    experience: "",
    achievements: "",
    volunteer: "",
    sections: {} // config for template toggles
  }
};

function qs(id){ return document.getElementById(id); }

async function checkAccess(){
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function ensureSectionDefaults(){
  // Defaults should match your templates.js expectations
  const d = state.data.sections;

  const def = (key, patch) => {
    d[key] = { ...(d[key] || {}), ...patch };
  };

  def("summary", { enabled: true, title: "Professional Summary" });
  def("education", { enabled: true, title: "Education" });
  def("licenses", { enabled: true, title: "Licenses & Certifications" });
  def("clinicalSkills", { enabled: true, title: "Clinical Skills", mode: "bullets", boldFirstLine: false });
  def("coreCompetencies", { enabled: true, title: "Core Competencies", mode: "bullets", boldFirstLine: false });
  def("languages", { enabled: true, title: "Languages", mode: "paragraph", boldFirstLine: false });
  def("experience", { enabled: true, title: "Professional Experience" });
  def("achievements", { enabled: true, title: "Clinical Achievements", mode: "bullets", boldFirstLine: false });
  def("volunteer", { enabled: true, title: "Volunteer Experience" });
}

function render(){
  if (typeof window.renderCV !== "function"){
    qs("preview").innerHTML = "<p>Missing template (renderCV not loaded).</p>";
    return;
  }
  ensureSectionDefaults();
  qs("preview").innerHTML = window.renderCV(state.data);
  syncToolUI();
}

function bindInputs(){
  const ids = [
    "name","title","email","phone","location","linkedin",
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer"
  ];

  for (const id of ids){
    const el = qs(id);
    if (!el) continue;
    el.addEventListener("input", () => {
      state.data[id] = el.value;
      render();
    });
  }

  // tools near labels (👁, dot, B)
  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const key = btn.getAttribute("data-key");
      ensureSectionDefaults();

      const cfg = state.data.sections[key] || (state.data.sections[key] = {});

      if (action === "toggle-section") {
        cfg.enabled = !cfg.enabled;
      }

      if (action === "toggle-mode") {
        // dot toggles bullets <-> paragraph
        cfg.mode = (cfg.mode === "bullets") ? "paragraph" : "bullets";
      }

      if (action === "toggle-bold-first") {
        cfg.boldFirstLine = !cfg.boldFirstLine;
      }

      render();
    });
  });

  qs("printBtn")?.addEventListener("click", () => window.print());

  qs("downloadHtmlBtn")?.addEventListener("click", () => {
    const html =
      `<!doctype html><html><head><meta charset="utf-8"><title>CV</title>` +
      `<link rel="stylesheet" href="/styles.css"></head><body>${qs("preview").innerHTML}</body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cv.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });

  qs("logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(()=>{});
    location.reload();
  });
}

function syncToolUI(){
  // make dot show ON when bullets, OFF when paragraph
  const secs = state.data.sections || {};
  document.querySelectorAll("[data-action='toggle-mode']").forEach(btn => {
    const key = btn.getAttribute("data-key");
    const mode = secs[key]?.mode || "bullets";
    btn.classList.toggle("is-on", mode === "bullets");
  });

  // bold first line active state
  document.querySelectorAll("[data-action='toggle-bold-first']").forEach(btn => {
    const key = btn.getAttribute("data-key");
    const on = !!secs[key]?.boldFirstLine;
    btn.classList.toggle("is-on", on);
  });

  // section enabled state
  document.querySelectorAll("[data-action='toggle-section']").forEach(btn => {
    const key = btn.getAttribute("data-key");
    const on = secs[key]?.enabled !== false;
    btn.classList.toggle("is-on", on);
  });
}

async function init(){
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  const buyLink = qs("buyLink");
  if (buyLink) buyLink.href = "https://payhip.com/b/AeoVP";

  const me = await checkAccess().catch(()=>null);

  if (!me || !me.has_access){
    locked.style.display = "block";
    app.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "none";
    return;
  }

  locked.style.display = "none";
  app.style.display = "block";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";

  bindInputs();
  render();
}

init();
