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
    custom1: "",
    custom2: "",
    sections: {
      summary: { enabled: true, title: "Professional Summary" },
      education: { enabled: true, title: "Education" },
      licenses: { enabled: true, title: "Licenses & Certifications" },
      clinicalSkills: { enabled: true, title: "Clinical Skills", mode: "bullets", boldFirstLine: false },
      coreCompetencies: { enabled: true, title: "Core Competencies", mode: "bullets", boldFirstLine: false },
      languages: { enabled: true, title: "Languages", mode: "paragraph", boldFirstLine: false },
      experience: { enabled: true, title: "Professional Experience" },
      achievements: { enabled: true, title: "Clinical Achievements", mode: "bullets", boldFirstLine: false },
      volunteer: { enabled: true, title: "Volunteer Experience" },

      custom1: { enabled: false, title: "Custom Section 1", mode: "bullets", boldFirstLine: false, column: "right" },
      custom2: { enabled: false, title: "Custom Section 2", mode: "bullets", boldFirstLine: false, column: "right" },
    }
  }
};

function qs(id) { return document.getElementById(id); }

async function checkAccess() {
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function render() {
  qs("preview").innerHTML = window.renderCV(state.data);
}

function bindInputs() {
  const map = [
    "name","title","email","phone","location","linkedin",
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer",
    "custom1","custom2"
  ];

  for (const k of map) {
    const el = qs(k);
    if (!el) continue;
    el.value = state.data[k] || "";
    el.addEventListener("input", () => {
      state.data[k] = el.value;
      render();
    });
  }

  qs("printBtn").addEventListener("click", () => window.print());

  qs("downloadHtmlBtn").addEventListener("click", () => {
    const blob = new Blob(
      [`<!doctype html><html><head><meta charset="utf-8"><title>CV</title><link rel="stylesheet" href="./styles.css"></head><body>${qs("preview").innerHTML}</body></html>`],
      { type: "text/html" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cv.html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  qs("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(()=>{});
    location.reload();
  });
}

function makeRow({ idPrefix, label, sectionKey, supportsMode, supportsBold, supportsColumn }) {
  const s = state.data.sections[sectionKey] || {};

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.padding = "12px";
  wrap.style.marginTop = "10px";

  const top = document.createElement("div");
  top.className = "row";

  const enabled = document.createElement("input");
  enabled.type = "checkbox";
  enabled.checked = !!s.enabled;
  enabled.id = `${idPrefix}_enabled`;

  const enabledLbl = document.createElement("label");
  enabledLbl.className = "muted small";
  enabledLbl.style.display = "inline-flex";
  enabledLbl.style.alignItems = "center";
  enabledLbl.style.gap = "8px";
  enabledLbl.appendChild(enabled);
  enabledLbl.appendChild(document.createTextNode(`Show ${label}`));

  const title = document.createElement("input");
  title.className = "input";
  title.style.maxWidth = "360px";
  title.value = s.title || label;
  title.placeholder = "Section title";

  top.appendChild(enabledLbl);
  top.appendChild(title);

  wrap.appendChild(top);

  const options = document.createElement("div");
  options.className = "row";
  options.style.marginTop = "10px";

  let modeSel = null;
  if (supportsMode) {
    modeSel = document.createElement("select");
    modeSel.className = "input";
    modeSel.style.maxWidth = "200px";
    const opt1 = document.createElement("option");
    opt1.value = "bullets";
    opt1.textContent = "Bullets";
    const opt2 = document.createElement("option");
    opt2.value = "paragraph";
    opt2.textContent = "Paragraph";
    modeSel.appendChild(opt1);
    modeSel.appendChild(opt2);
    modeSel.value = s.mode || "bullets";
    options.appendChild(modeSel);
  }

  let boldChk = null;
  if (supportsBold) {
    boldChk = document.createElement("input");
    boldChk.type = "checkbox";
    boldChk.checked = !!s.boldFirstLine;

    const boldLbl = document.createElement("label");
    boldLbl.className = "muted small";
    boldLbl.style.display = "inline-flex";
    boldLbl.style.alignItems = "center";
    boldLbl.style.gap = "8px";
    boldLbl.appendChild(boldChk);
    boldLbl.appendChild(document.createTextNode("Bold first line"));

    options.appendChild(boldLbl);
  }

  let colSel = null;
  if (supportsColumn) {
    colSel = document.createElement("select");
    colSel.className = "input";
    colSel.style.maxWidth = "200px";
    const l = document.createElement("option");
    l.value = "left";
    l.textContent = "Left column";
    const r = document.createElement("option");
    r.value = "right";
    r.textContent = "Right column";
    colSel.appendChild(l);
    colSel.appendChild(r);
    colSel.value = s.column || "right";
    options.appendChild(colSel);
  }

  wrap.appendChild(options);

  function sync() {
    state.data.sections[sectionKey] = {
      ...state.data.sections[sectionKey],
      enabled: enabled.checked,
      title: title.value || label,
      ...(supportsMode ? { mode: modeSel.value } : {}),
      ...(supportsBold ? { boldFirstLine: boldChk.checked } : {}),
      ...(supportsColumn ? { column: colSel.value } : {}),
    };
    render();
  }

  enabled.addEventListener("change", sync);
  title.addEventListener("input", sync);
  if (modeSel) modeSel.addEventListener("change", sync);
  if (boldChk) boldChk.addEventListener("change", sync);
  if (colSel) colSel.addEventListener("change", sync);

  return wrap;
}

function buildSectionsUI() {
  const root = qs("sectionsUI");
  root.innerHTML = "";

  // Standard sections
  root.appendChild(makeRow({ idPrefix:"sec_summary", label:"Summary", sectionKey:"summary", supportsMode:false, supportsBold:false, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_education", label:"Education", sectionKey:"education", supportsMode:false, supportsBold:false, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_licenses", label:"Licenses", sectionKey:"licenses", supportsMode:false, supportsBold:false, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_clin", label:"Clinical Skills", sectionKey:"clinicalSkills", supportsMode:true, supportsBold:true, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_core", label:"Core Competencies", sectionKey:"coreCompetencies", supportsMode:true, supportsBold:true, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_lang", label:"Languages", sectionKey:"languages", supportsMode:true, supportsBold:true, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_exp", label:"Experience", sectionKey:"experience", supportsMode:false, supportsBold:false, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_ach", label:"Achievements", sectionKey:"achievements", supportsMode:true, supportsBold:true, supportsColumn:false }));
  root.appendChild(makeRow({ idPrefix:"sec_vol", label:"Volunteer", sectionKey:"volunteer", supportsMode:false, supportsBold:false, supportsColumn:false }));

  // Custom sections
  const h = document.createElement("h3");
  h.textContent = "Custom Sections";
  h.style.marginTop = "14px";
  root.appendChild(h);

  root.appendChild(makeRow({ idPrefix:"sec_custom1", label:"Custom 1", sectionKey:"custom1", supportsMode:true, supportsBold:true, supportsColumn:true }));
  root.appendChild(makeRow({ idPrefix:"sec_custom2", label:"Custom 2", sectionKey:"custom2", supportsMode:true, supportsBold:true, supportsColumn:true }));
}

async function init() {
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  const buyLink = qs("buyLink");
  buyLink.href = "https://payhip.com/b/AeoVP"; // <-- your Payhip link

  const me = await checkAccess().catch(() => null);

  if (!me || !me.has_access) {
    locked.style.display = "block";
    app.style.display = "none";
    logoutBtn.style.display = "none";
    return;
  }

  locked.style.display = "none";
  app.style.display = "block";
  logoutBtn.style.display = "inline-flex";

  buildSectionsUI();
  bindInputs();
  render();
}

init();
