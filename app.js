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
      clinicalSkills: { enabled: true, title: "Clinical Skills" },
      coreCompetencies: { enabled: true, title: "Core Competencies" },
      languages: { enabled: true, title: "Languages" },
      experience: { enabled: true, title: "Professional Experience" },
      achievements: { enabled: true, title: "Clinical Achievements" },
      volunteer: { enabled: true, title: "Volunteer Experience" },
      custom1: { enabled: false, title: "Custom Section 1" },
      custom2: { enabled: false, title: "Custom Section 2" }
    }
  }
};

function qs(id){ return document.getElementById(id); }

async function checkAccess(){
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function render(){
  qs("preview").innerHTML = window.renderCV(state.data);
}

function bindBasicInputs(){
  const map = [
    "name","title","email","phone","location","linkedin",
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer","custom1","custom2"
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
}

function bindSectionControls(){
  const keys = [
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer","custom1","custom2"
  ];

  for (const key of keys){
    const enabledEl = qs(`sec_${key}_enabled`);
    const titleEl   = qs(`sec_${key}_title`);
    if (!enabledEl || !titleEl) continue;

    enabledEl.checked = !!state.data.sections[key]?.enabled;
    titleEl.value = state.data.sections[key]?.title || "";

    const sync = () => {
      state.data.sections[key] = {
        ...state.data.sections[key],
        enabled: !!enabledEl.checked,
        title: titleEl.value || state.data.sections[key]?.title || key
      };
      render();
    };

    enabledEl.addEventListener("change", sync);
    titleEl.addEventListener("input", sync);
  }
}

function wrapSelectionWith(el, left, right){
  const start = el.selectionStart ?? 0;
  const end   = el.selectionEnd ?? 0;
  const v = el.value || "";
  const selected = v.slice(start, end);
  const out = v.slice(0, start) + left + selected + right + v.slice(end);
  el.value = out;

  const newStart = start + left.length;
  const newEnd = newStart + selected.length;
  el.setSelectionRange(newStart, newEnd);
}

function getSelectedLineRange(el){
  const v = el.value || "";
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;

  const lineStart = v.lastIndexOf("\n", start - 1) + 1;
  const lineEndIdx = v.indexOf("\n", end);
  const lineEnd = lineEndIdx === -1 ? v.length : lineEndIdx;

  return { v, lineStart, lineEnd };
}

function toggleBulletsOnSelection(el){
  const { v, lineStart, lineEnd } = getSelectedLineRange(el);
  const chunk = v.slice(lineStart, lineEnd);
  const ls = chunk.split("\n");

  const allBulleted = ls
    .filter(l => l.trim().length)
    .every(l => l.trimStart().startsWith("- "));

  const newLines = ls.map(l => {
    if (!l.trim().length) return l;
    if (allBulleted) return l.replace(/^(\s*)-\s+/, "$1");
    if (l.trimStart().startsWith("- ")) return l;
    return l.replace(/^(\s*)/, "$1- ");
  });

  const out = v.slice(0, lineStart) + newLines.join("\n") + v.slice(lineEnd);
  el.value = out;
  el.setSelectionRange(lineStart, lineStart + newLines.join("\n").length);
}

function bindToolbars(){
  document.querySelectorAll(".toolbar").forEach(tb => {
    const fieldId = tb.getAttribute("data-for");
    const target = qs(fieldId);
    if (!target) return;

    tb.querySelectorAll(".tbtn").forEach(btn => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        target.focus();

        if (action === "bold") {
          wrapSelectionWith(target, "**", "**");
        } else if (action === "bullets") {
          toggleBulletsOnSelection(target);
        }

        state.data[fieldId] = target.value;
        render();
      });
    });
  });
}

function bindButtons(){
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

async function init(){
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  qs("buyLink").href = "https://payhip.com/b/AeoVP";

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

  bindBasicInputs();
  bindSectionControls();
  bindToolbars();
  bindButtons();

  render();
}

init();
