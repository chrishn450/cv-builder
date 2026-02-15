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
    sections: {
      // defaults (dot = bullets ON by default for these)
      clinicalSkills: { mode: "bullets", boldFirstLine: false },
      coreCompetencies: { mode: "bullets", boldFirstLine: false },
      achievements: { mode: "bullets", boldFirstLine: false },
      languages: { mode: "paragraph", boldFirstLine: false }, // languages usually looks best as paragraph
      summary: { mode: "paragraph", boldFirstLine: false },
    }
  }
};

function qs(id){ return document.getElementById(id); }

async function checkAccess(){
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function ensureSections(){
  state.data.sections = state.data.sections || {};
}

function ensureSection(key){
  ensureSections();
  state.data.sections[key] = state.data.sections[key] || {};
  return state.data.sections[key];
}

function isBulletsOn(key){
  const sec = ensureSection(key);
  // treat missing as bullets for list-type fields
  return (sec.mode || "bullets") === "bullets";
}

function setBullets(key, on){
  const sec = ensureSection(key);
  sec.mode = on ? "bullets" : "paragraph"; // no ¶ button, but "off" is paragraph
  render();
  syncToolbarUI(key);
}

function toggleBoldFirstLine(key){
  const sec = ensureSection(key);
  sec.boldFirstLine = !sec.boldFirstLine;
  render();
  syncToolbarUI(key);
}

function render(){
  // templates.js exposes window.renderCV(data)
  qs("preview").innerHTML = window.renderCV(state.data);
}

function bindInputs(){
  const map = [
    "name","title","email","phone","location","linkedin",
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer"
  ];

  for (const k of map){
    const el = qs(k);
    if (!el) continue;
    el.value = state.data[k] || "";
    el.addEventListener("input", () => {
      state.data[k] = el.value;
      render();
    });
  }

  qs("printBtn").addEventListener("click", () => {
    window.print();
  });

  qs("downloadHtmlBtn").addEventListener("click", () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>CV</title><link rel="stylesheet" href="/styles.css"></head><body>${qs("preview").innerHTML}</body></html>`;
    const blob = new Blob([html], {type:"text/html"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cv.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
  });

  qs("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(()=>{});
    location.reload();
  });
}

function syncToolbarUI(key){
  document.querySelectorAll(`.toolbar[data-key="${key}"]`).forEach((bar)=>{
    const sec = ensureSection(key);

    const boldBtn = bar.querySelector(`button[data-action="bold"]`);
    const bulletBtn = bar.querySelector(`button[data-action="bullets"]`);

    if (boldBtn) boldBtn.classList.toggle("active", !!sec.boldFirstLine);

    const bulletsOn = (sec.mode || "bullets") === "bullets";
    if (bulletBtn) bulletBtn.classList.toggle("active", bulletsOn);
  });
}

function syncAllToolbars(){
  document.querySelectorAll(".toolbar[data-key]").forEach((bar)=>{
    const key = bar.getAttribute("data-key");
    // Default modes if not set yet
    const sec = ensureSection(key);
    if (!sec.mode){
      // sensible defaults
      if (key === "languages" || key === "summary") sec.mode = "paragraph";
      else sec.mode = "bullets";
    }
    if (sec.boldFirstLine == null) sec.boldFirstLine = false;
    syncToolbarUI(key);
  });
}

function bindToolbars(){
  document.querySelectorAll(".toolbar[data-key]").forEach((bar)=>{
    const key = bar.getAttribute("data-key");

    bar.addEventListener("click", (e)=>{
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "bold"){
        toggleBoldFirstLine(key);
      }

      if (action === "bullets"){
        const on = !isBulletsOn(key);
        setBullets(key, on);
      }
    });
  });
}

async function init(){
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  // Put your Payhip product URL here
  const buyLink = qs("buyLink");
  buyLink.href = "https://payhip.com/b/AeoVP";

  const me = await checkAccess().catch(()=>null);

  if (!me || !me.has_access){
    locked.style.display = "block";
    app.style.display = "none";
    logoutBtn.style.display = "none";
    return;
  }

  locked.style.display = "none";
  app.style.display = "block";
  logoutBtn.style.display = "inline-flex";

  bindInputs();
  bindToolbars();
  syncAllToolbars();
  render();
}

init();
