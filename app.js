// app.js (Overlay-integrated version)

function qs(id){ return document.getElementById(id); }

function showGlobalLoading(title, desc){
  const overlay = qs("globalLoadingOverlay");
  if(!overlay) return;
  qs("loadingTitle").textContent = title || "Working…";
  qs("loadingDesc").textContent = desc || "Please wait.";
  overlay.style.display = "flex";
}

function hideGlobalLoading(){
  const overlay = qs("globalLoadingOverlay");
  if(!overlay) return;
  overlay.style.display = "none";
}

// Example hook for upload button inside template
async function handleTemplateUpload(file){
  try{
    showGlobalLoading("Parsing PDF…","Extracting text from your CV.");
    const fd = new FormData();
    fd.append("file", file);

    const r = await fetch("/api/parse-cv",{method:"POST",body:fd});
    const j = await r.json();
    if(!r.ok) throw new Error(j.error||"Parse failed");

    showGlobalLoading("Prefilling your CV…","Asking AI to structure your content.");
    const ai = await fetch("/api/ai",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        message: "IMPORT_OLD_CV\n\n"+j.text,
        language: "en",
        snapshot:{},
        history:[]
      })
    });

    const out = await ai.json();
    if(!ai.ok) throw new Error(out.error||"AI failed");

    console.log("AI response:",out);

    hideGlobalLoading();
    alert("Import complete ✓");

  }catch(e){
    hideGlobalLoading();
    alert(e.message||"Import failed");
  }
}

document.addEventListener("DOMContentLoaded",()=>{
  const uploadBtn = document.getElementById("uploadOldCvBtn");
  const uploadInput = document.getElementById("uploadOldCvInput");

  if(uploadBtn && uploadInput){
    uploadBtn.addEventListener("click",()=>{
      uploadInput.value="";
      uploadInput.click();
    });

    uploadInput.addEventListener("change",()=>{
      const file = uploadInput.files?.[0];
      if(file) handleTemplateUpload(file);
    });
  }
});
