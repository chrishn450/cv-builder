// app.js (FULL)
(function () {
  const qs = (id) => document.getElementById(id);

  const preview = qs("preview");
  const printBtn = qs("printBtn");
  const downloadHtmlBtn = qs("downloadHtmlBtn");
  const downloadPdfBtn = qs("downloadPdfBtn");

  const FIELD_IDS = [
    "name","title","email","phone","location","linkedin",
    "summary","clinicalSkills","coreCompetencies","languages",
    "achievements","custom1","custom2",
  ];

  const SECTION_KEYS = [
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer","custom1","custom2",
  ];

  const state = { data: {}, sections: {}, uiLang: "en" };

  // ---------------------------
  // Storage
  // ---------------------------
  const STORAGE_KEY = "cv_builder_user_overrides_structured_v3";
  const LANG_KEY = "cv_builder_ui_lang_v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          state.data = parsed.data || {};
          state.sections = parsed.sections || {};
        }
      }
    } catch (_) {}

    try {
      const l = localStorage.getItem(LANG_KEY);
      if (l) state.uiLang = l;
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state.data, sections: state.sections }));
    } catch (_) {}
    try {
      localStorage.setItem(LANG_KEY, state.uiLang);
    } catch (_) {}
  }

  // ---------------------------
  // Render
  // ---------------------------
  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
      uiLang: state.uiLang,
    });
  }

  // Keep UI inputs in sync after AI applies patches
  function refreshInputsFromState() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      el.value = state.data[id] != null ? String(state.data[id]) : "";
    });

    SECTION_KEYS.forEach((k) => {
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      if (en && state.sections?.[k]?.enabled != null) en.checked = !!state.sections[k].enabled;
      if (ti && state.sections?.[k]?.title) ti.value = state.sections[k].title;
    });

    // re-render structured blocks so left menu matches data
    renderEducation();
    renderLicenses();
    renderExperience();
    renderVolunteer();
  }

  // ---------------------------
  // Sections init
  // ---------------------------
  function initSectionsFromUI() {
    SECTION_KEYS.forEach((k) => {
      if (!state.sections[k]) state.sections[k] = {};
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      if (en) state.sections[k].enabled = !!en.checked;
      if (ti) state.sections[k].title = ti.value;
    });
  }

  function bindSimpleInputs() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;

      el.value = state.data[id] != null ? String(state.data[id]) : "";

      el.addEventListener("input", () => {
        state.data[id] = el.value;
        if (String(el.value).trim() === "") delete state.data[id];
        saveState();
        render();
      });
    });

    SECTION_KEYS.forEach((k) => {
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);

      if (en) {
        en.addEventListener("change", () => {
          if (!state.sections[k]) state.sections[k] = {};
          state.sections[k].enabled = !!en.checked;
          saveState();
          render();
        });
      }

      if (ti) {
        if (state.sections?.[k]?.title) ti.value = state.sections[k].title;
        ti.addEventListener("input", () => {
          if (!state.sections[k]) state.sections[k] = {};
          state.sections[k].title = ti.value;
          saveState();
          render();
        });
      }
    });
  }

  // ---------------------------
  // Toolbar helpers (BOLD only)
  // NOTE: No auto-bullets now. Enter is normal.
  // ---------------------------
  function wrapSelectionWith(el, left, right) {
    const v = el.value || "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    el.value = v.slice(0, start) + left + v.slice(start, end) + right + v.slice(end);
    el.setSelectionRange(start + left.length, end + left.length);
  }

  function bindToolbar(tb, target, onChange) {
    if (!tb || !target) return;

    tb.querySelectorAll(".tbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        target.focus();

        if (action === "bold") {
          wrapSelectionWith(target, "**", "**");
          onChange();
          return;
        }

        // Bullet button: inserts "• " at cursor, BUT does NOT auto-bullet on Enter.
        if (action === "bullets") {
          const pos = target.selectionStart ?? (target.value || "").length;
          const v = target.value || "";
          target.value = v.slice(0, pos) + "• " + v.slice(pos);
          const np = pos + 2;
          target.setSelectionRange(np, np);
          onChange();
          return;
        }
      });
    });
  }

  function bindSimpleToolbars() {
    document.querySelectorAll(".toolbar[data-for]").forEach((tb) => {
      const fieldId = tb.getAttribute("data-for");
      const target = qs(fieldId);
      if (!target) return;

      bindToolbar(tb, target, () => {
        state.data[fieldId] = target.value;
        if (String(target.value).trim() === "") delete state.data[fieldId];
        saveState();
        render();
      });
    });
  }

  // ---------------------------
  // Structured sections
  // ---------------------------
  const eduRoot = qs("educationBlocks");
  const addEduBtn = qs("addEducationBlock");
  const eduHidden = qs("education");

  const licRoot = qs("licenseBlocks");
  const addLicBtn = qs("addLicenseBlock");
  const licHidden = qs("licenses");

  const expRoot = qs("experienceJobs");
  const addExpBtn = qs("addExperienceJob");
  const expHidden = qs("experience");

  const volRoot = qs("volunteerBlocks");
  const addVolBtn = qs("addVolunteerBlock");
  const volHidden = qs("volunteer");

  function ensureArray(key, defaultCount, factory) {
    if (!Array.isArray(state.data[key])) state.data[key] = [];
    if (state.data[key].length === 0) {
      state.data[key] = Array.from({ length: defaultCount }, () => factory());
    }
  }

  function setOverrideField(fieldKey, value) {
    const t = String(value || "").trim();
    if (t === "") delete state.data[fieldKey];
    else state.data[fieldKey] = value;
  }

  function eduToText(blocks) {
    return (blocks || [])
      .map((b) => {
        const degree = (b.degree || "").trim();
        const school = (b.school || "").trim();
        const date = (b.date || "").trim();
        const honors = (b.honors || "").trim();
        return [degree, school, date, honors].filter(Boolean).join("\n");
      })
      .filter((x) => x.trim().length > 0)
      .join("\n\n");
  }

  function syncEducation() {
    ensureArray("educationBlocks", 2, () => ({ degree: "", school: "", date: "", honors: "" }));
    const txt = eduToText(state.data.educationBlocks);
    if (eduHidden) eduHidden.value = txt;
    setOverrideField("education", txt);
  }

  function renderEducation() {
    if (!eduRoot) return;
    ensureArray("educationBlocks", 2, () => ({ degree: "", school: "", date: "", honors: "" }));
    eduRoot.innerHTML = "";

    state.data.educationBlocks.forEach((b, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "subcard";
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">Education ${idx + 1}</div>
          <button class="btn ghost" type="button" data-edu-remove="${idx}" style="padding:6px 10px;">Remove</button>
        </div>

        <label class="label">Degree</label>
        <input class="input" data-edu-degree="${idx}" placeholder="Master of Science in Nursing" />

        <label class="label">School</label>
        <input class="input" data-edu-school="${idx}" placeholder="The University of Texas at Austin" />

        <label class="label">Dates</label>
        <input class="input" data-edu-date="${idx}" placeholder="2016 – 2018" />

        <label class="label">Honors (optional)</label>
        <input class="input" data-edu-honors="${idx}" placeholder="Magna Cum Laude · GPA 3.85" />
      `;
      eduRoot.appendChild(wrap);

      const degreeEl = wrap.querySelector(`[data-edu-degree="${idx}"]`);
      const schoolEl = wrap.querySelector(`[data-edu-school="${idx}"]`);
      const dateEl = wrap.querySelector(`[data-edu-date="${idx}"]`);
      const honorsEl = wrap.querySelector(`[data-edu-honors="${idx}"]`);

      degreeEl.value = b.degree || "";
      schoolEl.value = b.school || "";
      dateEl.value = b.date || "";
      honorsEl.value = b.honors || "";

      const update = () => {
        state.data.educationBlocks[idx] = {
          degree: degreeEl.value,
          school: schoolEl.value,
          date: dateEl.value,
          honors: honorsEl.value,
        };
        syncEducation();
        saveState();
        render();
      };

      degreeEl.addEventListener("input", update);
      schoolEl.addEventListener("input", update);
      dateEl.addEventListener("input", update);
      honorsEl.addEventListener("input", update);

      wrap.querySelector(`[data-edu-remove="${idx}"]`).addEventListener("click", () => {
        state.data.educationBlocks.splice(idx, 1);
        syncEducation();
        saveState();
        renderEducation();
        render();
      });
    });

    syncEducation();
  }

  if (addEduBtn) {
    addEduBtn.addEventListener("click", () => {
      ensureArray("educationBlocks", 2, () => ({ degree: "", school: "", date: "", honors: "" }));
      state.data.educationBlocks.push({ degree: "", school: "", date: "", honors: "" });
      syncEducation();
      saveState();
      renderEducation();
      render();
    });
  }

  function licToText(items) {
    const lines = [];
    (items || []).forEach((it) => {
      const t = (it.title || "").trim();
      const d = (it.detail || "").trim();
      if (!t && !d) return;
      if (t) lines.push(t);
      if (d) lines.push(d);
      else lines.push("");
    });
    while (lines.length && String(lines[lines.length - 1]).trim() === "") lines.pop();
    return lines.join("\n");
  }

  function syncLicenses() {
    ensureArray("licenseBlocks", 2, () => ({ title: "", detail: "" }));
    const txt = licToText(state.data.licenseBlocks);
    if (licHidden) licHidden.value = txt;
    setOverrideField("licenses", txt);
  }

  function renderLicenses() {
    if (!licRoot) return;
    ensureArray("licenseBlocks", 2, () => ({ title: "", detail: "" }));
    licRoot.innerHTML = "";

    state.data.licenseBlocks.forEach((b, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "subcard";
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">License ${idx + 1}</div>
          <button class="btn ghost" type="button" data-lic-remove="${idx}" style="padding:6px 10px;">Remove</button>
        </div>

        <label class="label">Title</label>
        <input class="input" data-lic-title="${idx}" placeholder="Registered Nurse (RN)" />

        <label class="label">Detail</label>
        <input class="input" data-lic-detail="${idx}" placeholder="Texas Board of Nursing · #TX-892341" />
      `;
      licRoot.appendChild(wrap);

      const titleEl = wrap.querySelector(`[data-lic-title="${idx}"]`);
      const detailEl = wrap.querySelector(`[data-lic-detail="${idx}"]`);

      titleEl.value = b.title || "";
      detailEl.value = b.detail || "";

      const update = () => {
        state.data.licenseBlocks[idx] = { title: titleEl.value, detail: detailEl.value };
        syncLicenses();
        saveState();
        render();
      };

      titleEl.addEventListener("input", update);
      detailEl.addEventListener("input", update);

      wrap.querySelector(`[data-lic-remove="${idx}"]`).addEventListener("click", () => {
        state.data.licenseBlocks.splice(idx, 1);
        syncLicenses();
        saveState();
        renderLicenses();
        render();
      });
    });

    syncLicenses();
  }

  if (addLicBtn) {
    addLicBtn.addEventListener("click", () => {
      ensureArray("licenseBlocks", 2, () => ({ title: "", detail: "" }));
      state.data.licenseBlocks.push({ title: "", detail: "" });
      syncLicenses();
      saveState();
      renderLicenses();
      render();
    });
  }

  function expToText(jobs) {
    return (jobs || [])
      .map((j) => {
        const title = (j.title || "").trim();
        const meta = (j.meta || "").trim();
        const bullets = (j.bullets || []).map((x) => String(x || "").trim()).filter(Boolean);
        return [title, meta, ...bullets].filter(Boolean).join("\n");
      })
      .filter((x) => x.trim().length > 0)
      .join("\n\n");
  }

  function syncExperience() {
    ensureArray("experienceJobs", 2, () => ({ title: "", meta: "", bullets: [] }));
    const txt = expToText(state.data.experienceJobs);
    if (expHidden) expHidden.value = txt;
    setOverrideField("experience", txt);
  }

  function renderExperience() {
    if (!expRoot) return;
    ensureArray("experienceJobs", 2, () => ({ title: "", meta: "", bullets: [] }));
    expRoot.innerHTML = "";

    state.data.experienceJobs.forEach((job, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "subcard";
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">Job ${idx + 1}</div>
          <button class="btn ghost" type="button" data-exp-remove="${idx}" style="padding:6px 10px;">Remove</button>
        </div>

        <label class="label">Role / Title</label>
        <input class="input" data-exp-title="${idx}" placeholder="SENIOR REGISTERED NURSE – ICU" />

        <label class="label">Company, Location | Dates</label>
        <input class="input" data-exp-meta="${idx}" placeholder="St. David's Medical Center, Austin, TX | January 2021 – Present" />

        <div class="toolbar" data-exp-toolbar="${idx}">
          <button class="tbtn" data-action="bold" type="button"><b>B</b></button>
          <button class="tbtn tdot" data-action="bullets" type="button" title="Insert bullet"></button>
        </div>

        <label class="label">Bullets (one per line)</label>
        <textarea class="textarea" rows="5" data-exp-bullets="${idx}" placeholder="One per line..."></textarea>
      `;
      expRoot.appendChild(wrap);

      const titleEl = wrap.querySelector(`[data-exp-title="${idx}"]`);
      const metaEl = wrap.querySelector(`[data-exp-meta="${idx}"]`);
      const bulletsEl = wrap.querySelector(`[data-exp-bullets="${idx}"]`);

      titleEl.value = job.title || "";
      metaEl.value = job.meta || "";
      bulletsEl.value = (job.bullets || []).join("\n");

      const parseBullets = () =>
        String(bulletsEl.value || "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

      const update = () => {
        state.data.experienceJobs[idx] = {
          title: titleEl.value,
          meta: metaEl.value,
          bullets: parseBullets(),
        };
        syncExperience();
        saveState();
        render();
      };

      titleEl.addEventListener("input", update);
      metaEl.addEventListener("input", update);
      bulletsEl.addEventListener("input", update);

      const tb = wrap.querySelector(`[data-exp-toolbar="${idx}"]`);
      bindToolbar(tb, bulletsEl, update);

      wrap.querySelector(`[data-exp-remove="${idx}"]`).addEventListener("click", () => {
        state.data.experienceJobs.splice(idx, 1);
        syncExperience();
        saveState();
        renderExperience();
        render();
      });
    });

    syncExperience();
  }

  if (addExpBtn) {
    addExpBtn.addEventListener("click", () => {
      ensureArray("experienceJobs", 2, () => ({ title: "", meta: "", bullets: [] }));
      state.data.experienceJobs.push({ title: "", meta: "", bullets: [] });
      syncExperience();
      saveState();
      renderExperience();
      render();
    });
  }

  function volToText(vols) {
    return (vols || [])
      .map((v) => {
        const header = (v.header || "").trim();
        const sub = (v.sub || "").trim();
        const bullets = (v.bullets || []).map((x) => String(x || "").trim()).filter(Boolean);
        return [header, sub, ...bullets].filter(Boolean).join("\n");
      })
      .filter((x) => x.trim().length > 0)
      .join("\n\n");
  }

  function syncVolunteer() {
    ensureArray("volunteerBlocks", 1, () => ({ header: "", sub: "", bullets: [] }));
    const txt = volToText(state.data.volunteerBlocks);
    if (volHidden) volHidden.value = txt;
    setOverrideField("volunteer", txt);
  }

  function renderVolunteer() {
    if (!volRoot) return;
    ensureArray("volunteerBlocks", 1, () => ({ header: "", sub: "", bullets: [] }));
    volRoot.innerHTML = "";

    state.data.volunteerBlocks.forEach((v, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "subcard";
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">Volunteer ${idx + 1}</div>
          <button class="btn ghost" type="button" data-vol-remove="${idx}" style="padding:6px 10px;">Remove</button>
        </div>

        <label class="label">Header (Title | Dates)</label>
        <input class="input" data-vol-header="${idx}" placeholder="Volunteer Nurse | 2019 – Present" />

        <label class="label">Sub line</label>
        <input class="input" data-vol-sub="${idx}" placeholder="Austin Free Clinic · Community Health Outreach" />

        <div class="toolbar" data-vol-toolbar="${idx}">
          <button class="tbtn" data-action="bold" type="button"><b>B</b></button>
          <button class="tbtn tdot" data-action="bullets" type="button" title="Insert bullet"></button>
        </div>

        <label class="label">Bullets (one per line)</label>
        <textarea class="textarea" rows="4" data-vol-bullets="${idx}" placeholder="One per line..."></textarea>
      `;
      volRoot.appendChild(wrap);

      const headerEl = wrap.querySelector(`[data-vol-header="${idx}"]`);
      const subEl = wrap.querySelector(`[data-vol-sub="${idx}"]`);
      const bulletsEl = wrap.querySelector(`[data-vol-bullets="${idx}"]`);

      headerEl.value = v.header || "";
      subEl.value = v.sub || "";
      bulletsEl.value = (v.bullets || []).join("\n");

      const parseBullets = () =>
        String(bulletsEl.value || "")
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

      const update = () => {
        state.data.volunteerBlocks[idx] = {
          header: headerEl.value,
          sub: subEl.value,
          bullets: parseBullets(),
        };
        syncVolunteer();
        saveState();
        render();
      };

      headerEl.addEventListener("input", update);
      subEl.addEventListener("input", update);
      bulletsEl.addEventListener("input", update);

      const tb = wrap.querySelector(`[data-vol-toolbar="${idx}"]`);
      bindToolbar(tb, bulletsEl, update);

      wrap.querySelector(`[data-vol-remove="${idx}"]`).addEventListener("click", () => {
        state.data.volunteerBlocks.splice(idx, 1);
        syncVolunteer();
        saveState();
        renderVolunteer();
        render();
      });
    });

    syncVolunteer();
  }

  if (addVolBtn) {
    addVolBtn.addEventListener("click", () => {
      ensureArray("volunteerBlocks", 1, () => ({ header: "", sub: "", bullets: [] }));
      state.data.volunteerBlocks.push({ header: "", sub: "", bullets: [] });
      syncVolunteer();
      saveState();
      renderVolunteer();
      render();
    });
  }

  // ---------------------------
  // Print (popup-free)
  // ---------------------------
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  // ---------------------------
  // Download HTML
  // ---------------------------
  if (downloadHtmlBtn) {
    downloadHtmlBtn.addEventListener("click", async () => {
      try {
        const cssText = await fetch("/styles.css", { cache: "no-store" }).then(r => r.text());
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Inter:wght@300;400;600&display=swap" rel="stylesheet">
  <style>${cssText}</style>
</head>
<body style="margin:0; padding:0; background:white;">
  ${preview ? preview.innerHTML : ""}
</body>
</html>`;
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "cv.html";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Export failed:", err);
        alert("Export failed. Check console.");
      }
    });
  }

  // ---------------------------
  // Download PDF (NO POPUP, NO BLANK PAGE)
  // Uses html2pdf.bundle.min.js loaded in index.html
  // ---------------------------
  async function waitFonts() {
    try {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
    } catch (_) {}
  }

  function buildPrintRootFromCV() {
    const cv = document.querySelector(".cv");
    if (!cv) return null;

    const root = document.createElement("div");
    root.style.background = "white";
    root.style.padding = "0";
    root.style.margin = "0";

    const clone = cv.cloneNode(true);
    clone.style.margin = "0";
    root.appendChild(clone);

    // offscreen mount (required for canvas render)
    const mount = document.createElement("div");
    mount.style.position = "fixed";
    mount.style.left = "-99999px";
    mount.style.top = "0";
    mount.style.width = "210mm";
    mount.style.background = "white";
    mount.appendChild(root);

    document.body.appendChild(mount);
    return { mount, node: mount };
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", async () => {
      if (!window.html2pdf) {
        alert("PDF library not loaded.");
        return;
      }

      const built = buildPrintRootFromCV();
      if (!built) {
        alert("No CV found to export.");
        return;
      }

      downloadPdfBtn.disabled = true;
      downloadPdfBtn.textContent = "Generating…";

      try {
        await waitFonts();

        const opt = {
          margin: 0,
          filename: "cv.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        await window.html2pdf().set(opt).from(built.node).save();
      } catch (e) {
        console.error(e);
        alert("PDF export failed.");
      } finally {
        built.mount?.remove();
        downloadPdfBtn.disabled = false;
        downloadPdfBtn.textContent = "Download PDF";
      }
    });
  }

  // ---------------------------
  // Layout controls (unchanged from your working version)
  // ---------------------------
  const grid = qs("grid3");

  function setGridColumns(cols) {
    if (!grid) return;
    grid.style.gridTemplateColumns = cols;
    try { localStorage.setItem("cv_grid_cols_v1", cols); } catch {}
  }

  function restoreGridColumns() {
    if (!grid) return;
    try {
      const saved = localStorage.getItem("cv_grid_cols_v1");
      if (saved) grid.style.gridTemplateColumns = saved;
    } catch {}
  }

  function computeVisiblePanels() {
    const editor = qs("panel-editor");
    const previewP = qs("panel-preview");
    const ai = qs("panel-ai");
    return {
      editor: editor && !editor.classList.contains("is-hidden"),
      preview: previewP && !previewP.classList.contains("is-hidden"),
      ai: ai && !ai.classList.contains("is-hidden"),
    };
  }

  function normalizeGridForVisibility() {
    const v = computeVisiblePanels();
    if (v.editor && v.preview && v.ai) { setGridColumns("1.25fr 10px 1fr 10px 0.85fr"); return; }
    if (v.editor && v.preview && !v.ai) { setGridColumns("1.25fr 10px 1fr"); return; }
    if (v.editor && !v.preview && v.ai) { setGridColumns("1.25fr 10px 1fr"); return; }
    if (!v.editor && v.preview && v.ai) { setGridColumns("1fr 10px 0.85fr"); return; }
    setGridColumns("1fr");
  }

  function setupPanelButtons() {
    const showPanelsBtn = qs("showPanelsBtn");

    function setBodyLocked(on){ document.body.style.overflow = on ? "hidden" : ""; }

    function closeAnyFullscreen(){
      document.querySelectorAll(".panel.is-fullscreen").forEach(p => p.classList.remove("is-fullscreen"));
      document.querySelectorAll(".fullscreen-backdrop").forEach(b => b.remove());
      setBodyLocked(false);
    }

    function openFullscreen(panel){
      closeAnyFullscreen();
      const bd = document.createElement("div");
      bd.className = "fullscreen-backdrop";
      bd.addEventListener("click", closeAnyFullscreen);
      document.body.appendChild(bd);
      panel.classList.add("is-fullscreen");
      setBodyLocked(true);
    }

    document.querySelectorAll('[data-action="hide"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        const panel = qs(`panel-${target}`);
        if (!panel) return;
        if (panel.classList.contains("is-fullscreen")) closeAnyFullscreen();
        panel.classList.toggle("is-hidden");
        normalizeGridForVisibility();
      });
    });

    document.querySelectorAll('[data-action="fullscreen"]').forEach(btn => {
      btn.addEventListener("click", () => {
        const target = btn.getAttribute("data-target");
        const panel = qs(`panel-${target}`);
        if (!panel) return;
        panel.classList.remove("is-hidden");
        if (panel.classList.contains("is-fullscreen")) closeAnyFullscreen();
        else openFullscreen(panel);
        normalizeGridForVisibility();
      });
    });

    window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAnyFullscreen(); });

    if (showPanelsBtn) {
      showPanelsBtn.addEventListener("click", () => {
        qs("panel-editor")?.classList.remove("is-hidden");
        qs("panel-preview")?.classList.remove("is-hidden");
        qs("panel-ai")?.classList.remove("is-hidden");
        normalizeGridForVisibility();
      });
    }
  }

  function setupResizer(resizerId, isSecond) {
    const resizer = qs(resizerId);
    if (!resizer || !grid) return;

    let dragging = false;

    const startDrag = (e) => {
      dragging = true;
      e.preventDefault();
      document.body.style.cursor = "col-resize";
    };

    const stopDrag = () => {
      dragging = false;
      document.body.style.cursor = "";
    };

    const onMove = (e) => {
      if (!dragging) return;

      const rect = grid.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const total = rect.width;

      const v = computeVisiblePanels();
      if (!(v.editor && v.preview && v.ai)) return;

      const minPct = 18;
      let editorPct = Math.max(minPct, Math.min(60, (x / total) * 100));
      let remaining = 100 - editorPct;

      let previewPct, aiPct;

      if (isSecond) {
        const afterEditorPx = x - (total * (editorPct / 100));
        const afterEditorPct = (afterEditorPx / total) * 100;
        previewPct = Math.max(minPct, Math.min(remaining - minPct, afterEditorPct));
        aiPct = remaining - previewPct;
      } else {
        const ratioPreview = 1;
        const ratioAi = 0.85;
        const sum = ratioPreview + ratioAi;
        previewPct = remaining * (ratioPreview / sum);
        aiPct = remaining * (ratioAi / sum);
      }

      if (previewPct < minPct) { previewPct = minPct; aiPct = remaining - previewPct; }
      if (aiPct < minPct) { aiPct = minPct; previewPct = remaining - aiPct; }

      setGridColumns(`${editorPct}fr 10px ${previewPct}fr 10px ${aiPct}fr`);
    };

    resizer.addEventListener("mousedown", startDrag);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stopDrag);
  }

  // ---------------------------
  // AI Coach (individual suggestions + accept updates UI)
  // ---------------------------
  const AI_HISTORY_KEY = "cv_builder_ai_history_v2";

  function loadAIHistory() {
    try {
      const raw = localStorage.getItem(AI_HISTORY_KEY);
      const arr = JSON.parse(raw || "[]");
      if (!Array.isArray(arr)) return [];
      return arr.filter(x => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string").slice(-20);
    } catch {
      return [];
    }
  }

  function saveAIHistory(hist) {
    try { localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(hist.slice(-20))); } catch {}
  }

  let aiHistory = loadAIHistory();

  function detectLanguageFromText(t) {
    const s = String(t || "");
    if (state.uiLang) return state.uiLang;
    if (/[æøåÆØÅ]/.test(s) || /\b(hvordan|kan du|jeg|ikke|dette|endre|hvor)\b/i.test(s)) return "no";
    return "en";
  }

  function snapshotForAI() {
    return { data: state.data, sections: state.sections, uiLang: state.uiLang };
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function addMsg(role, title, text) {
    const chat = qs("aiChat");
    if (!chat) return;
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `
      <div class="msg-title">${escapeHtml(title)}</div>
      <div>${escapeHtml(text).replace(/\n/g,"<br>")}</div>
    `;
    chat.prepend(div);
  }

  function addThinking() {
    const chat = qs("aiChat");
    if (!chat) return null;
    const div = document.createElement("div");
    div.className = "msg assistant";
    div.innerHTML = `
      <div class="thinking-row">
        <span class="spinner"></span>
        <span>AI is analyzing your CV and preparing suggestions...</span>
      </div>
    `;
    chat.prepend(div);
    return div;
  }

  function applyChanges(changes) {
    if (!Array.isArray(changes)) return;

    const ALLOWED_SET_PATHS = new Set([
      "data.name","data.title","data.email","data.phone","data.location","data.linkedin",
      "data.summary","data.education","data.licenses","data.clinicalSkills","data.coreCompetencies",
      "data.languages","data.experience","data.achievements","data.volunteer","data.custom1","data.custom2",
      "sections.summary.enabled","sections.summary.title",
      "sections.education.enabled","sections.education.title",
      "sections.licenses.enabled","sections.licenses.title",
      "sections.clinicalSkills.enabled","sections.clinicalSkills.title",
      "sections.coreCompetencies.enabled","sections.coreCompetencies.title",
      "sections.languages.enabled","sections.languages.title",
      "sections.experience.enabled","sections.experience.title",
      "sections.achievements.enabled","sections.achievements.title",
      "sections.volunteer.enabled","sections.volunteer.title",
      "sections.custom1.enabled","sections.custom1.title",
      "sections.custom2.enabled","sections.custom2.title"
    ]);

    function setByPath(obj, path, value) {
      const parts = path.split(".");
      let cur = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        const k = parts[i];
        if (cur[k] == null || typeof cur[k] !== "object") cur[k] = {};
        cur = cur[k];
      }
      cur[parts[parts.length - 1]] = value;
    }

    changes.forEach((c) => {
      if (!c || c.op !== "set" || typeof c.path !== "string") return;
      if (!ALLOWED_SET_PATHS.has(c.path)) return;

      if (c.path.startsWith("data.")) {
        const p = c.path.replace(/^data\./, "");
        state.data[p] = c.value;
        if (String(c.value ?? "").trim() === "") delete state.data[p];
      } else if (c.path.startsWith("sections.")) {
        const p = c.path.replace(/^sections\./, "");
        setByPath(state.sections, p, c.value);
      }
    });

    saveState();
    render();
    refreshInputsFromState(); // IMPORTANT: updates left menu too
  }

  function renderSuggestionItemCard(item) {
    const chat = qs("aiChat");
    if (!chat) return;

    const title = item?.title || "Suggestion";
    const message = item?.message || "";
    const changes = Array.isArray(item?.changes) ? item.changes : [];

    const div = document.createElement("div");
    div.className = "msg assistant";

    const hasChanges = changes.length > 0;

    div.innerHTML = `
      <div class="msg-title">${escapeHtml(title)}</div>
      <div>${escapeHtml(message).replace(/\n/g,"<br>")}</div>

      ${hasChanges ? `
        <div class="sugg">
          <div class="muted small">Proposed changes (accept applies only this suggestion):</div>
          <div class="sugg-buttons">
            <button class="btn" type="button" data-accept>Accept</button>
            <button class="btn ghost" type="button" data-reject>Reject</button>
          </div>
        </div>
      ` : ``}
    `;
    chat.prepend(div);

    if (!hasChanges) return;

    const accept = div.querySelector("[data-accept]");
    const reject = div.querySelector("[data-reject]");

    accept?.addEventListener("click", () => {
      applyChanges(changes);
      accept.disabled = true;
      if (reject) reject.disabled = true;
      accept.textContent = "Applied ✓";
    });

    reject?.addEventListener("click", () => {
      if (accept) accept.disabled = true;
      reject.disabled = true;
      reject.textContent = "Rejected";
    });
  }

  async function sendToAI(userText) {
    const thinking = addThinking();
    const language = detectLanguageFromText(userText);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          language,
          snapshot: snapshotForAI(),
          history: aiHistory
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "AI request failed");

      thinking?.remove();

      // New: payload.suggestions preferred
      if (Array.isArray(payload?.suggestions) && payload.suggestions.length) {
        payload.suggestions.forEach((s) => renderSuggestionItemCard(s));
      } else {
        // Backward compatible
        renderSuggestionItemCard({
          title: "Suggestion",
          message: payload?.message || "Here are my suggestions.",
          changes: payload?.changes || []
        });
      }

      const histMsg = payload?.message || "OK";
      aiHistory.push({ role: "assistant", content: histMsg });
      saveAIHistory(aiHistory);

    } catch (err) {
      thinking?.remove();
      console.error(err);

      const fallback = language === "no"
        ? "Beklager — noe gikk galt. Prøv igjen."
        : "Sorry — something went wrong. Please try again.";

      aiHistory.push({ role: "assistant", content: fallback });
      saveAIHistory(aiHistory);

      renderSuggestionItemCard({ title: "Error", message: fallback, changes: [] });
    }
  }

  function setupAIUI() {
    const aiSend = qs("aiSend");
    const aiClear = qs("aiClear");
    const aiInput = qs("aiInput");
    const chat = qs("aiChat");

    if (!aiSend || !aiInput || !chat) {
      console.warn("AI UI elements missing. Check IDs: aiSend, aiInput, aiChat, aiClear");
      return;
    }

    aiClear?.addEventListener("click", () => {
      chat.innerHTML = "";
      aiHistory = [];
      saveAIHistory(aiHistory);
    });

    const go = () => {
      const text = String(aiInput.value || "").trim();
      if (!text) return;

      addMsg("user", "You", text);
      aiHistory.push({ role: "user", content: text });
      saveAIHistory(aiHistory);

      aiInput.value = "";
      sendToAI(text);
    };

    aiSend.addEventListener("click", go);

    aiInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        go();
      }
    });
  }

  // ---------------------------
  // INIT show app
  // ---------------------------
  const app = qs("app");
  const locked = qs("locked");
  if (app) app.style.display = "block";
  if (locked) locked.style.display = "none";

  loadState();
  initSectionsFromUI();
  bindSimpleInputs();
  bindSimpleToolbars();

  renderEducation();
  renderLicenses();
  renderExperience();
  renderVolunteer();

  setupPanelButtons();
  restoreGridColumns();
  normalizeGridForVisibility();
  setupResizer("resizer-1", false);
  setupResizer("resizer-2", true);

  setupAIUI();

  saveState();
  render();
})();
