const state = {
  data: {
    name: "Sarah Johnson",
    title: "Registered Nurse · BSN, RN",
    email: "sarah.johnson@email.com",
    phone: "(555) 123-4567",
    location: "Austin, TX 78701",
    linkedin: "linkedin.com/in/sarahjohnsonrn",
    summary: "",
    education: "",
    licenses: "",
    clinicalSkills: "",
    coreCompetencies: "",
    languages: "",
    experience: "",
    achievements: "",
    volunteer: "",
    sections: {} // keep for template features
  }
};

function qs(id){ return document.getElementById(id); }

function render(){
  if (typeof window.renderCV !== "function") {
    qs("preview").innerHTML = "<p>Template not loaded (renderCV missing).</p>";
    return;
  }
  qs("preview").innerHTML = window.renderCV(state.data);
}

async function checkAccess(){
  const res = await fetch("/api/me");
  if (!res.ok) return null;
  return res.json();
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
    el.value = state.data[id] || "";
    el.addEventListener("input", () => {
      state.data[id] = el.value;
      render();
    });
  }

  qs("printBtn")?.addEventListener("click", () => window.print());

  qs("downloadHtmlBtn")?.addEventListener("click", () => {
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

  qs("logoutBtn")?.addEventListener("click", async () => {
    await fetch("/api/logout", { method: "POST" }).catch(()=>{});
    location.reload();
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
