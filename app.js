const state = {
  template: "classic",
  data: {
    name: "",
    title: "",
    email: "",
    phone: "",
    summary: "",
    experience: "",
    education: "",
    skills: ""
  }
};

function qs(id){ return document.getElementById(id); }

async function checkAccess(){
  const res = await fetch("/api/me", { method: "GET" });
  if (!res.ok) return null;
  return res.json();
}

function render(){
  const tplFn = window.CVTemplates?.[state.template];
  qs("preview").innerHTML = tplFn ? tplFn(state.data) : "<p>Mangler template</p>";
}

function bindInputs(){
  const map = ["name","title","email","phone","summary","experience","education","skills"];
  for (const k of map){
    const el = qs(k);
    el.value = state.data[k] || "";
    el.addEventListener("input", () => {
      state.data[k] = el.value;
      render();
    });
  }

  qs("printBtn").addEventListener("click", () => {
    // Print only the preview
    const w = window.open("", "_blank");
    const html = `
      <html>
        <head>
          <title>CV</title>
          <style>
            body{font-family: Arial, sans-serif; margin:24px;}
            h1{margin:0}
            h2{font-size:12px; letter-spacing:.08em; text-transform:uppercase; color:#334; margin-top:18px}
            .muted{color:#667}
            .topline{display:flex; gap:10px; flex-wrap:wrap; margin-top:6px}
            .pill{display:inline-block; background:#eef2ff; padding:4px 8px; border-radius:999px; font-size:12px}
            ul{padding-left:18px}
            li{margin:6px 0}
          </style>
        </head>
        <body>${qs("preview").innerHTML}</body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  });

  qs("downloadHtmlBtn").addEventListener("click", () => {
    const blob = new Blob([`<!doctype html><html><head><meta charset="utf-8"><title>CV</title></head><body>${qs("preview").innerHTML}</body></html>`], {type:"text/html"});
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

async function init(){
  const locked = qs("locked");
  const app = qs("app");
  const logoutBtn = qs("logoutBtn");

  // Optional: put your Payhip product URL here (or set it in the DOM server-side)
  const buyLink = qs("buyLink");
  buyLink.href = "https://payhip.com/"; // <-- sett inn din Payhip product link

  const me = await checkAccess().catch(()=>null);

  if (!me || !me.hasAccess){
    locked.style.display = "block";
    app.style.display = "none";
    logoutBtn.style.display = "none";
    return;
  }

  locked.style.display = "none";
  app.style.display = "block";
  logoutBtn.style.display = "inline-flex";

  render();
  bindInputs();
}

init();
