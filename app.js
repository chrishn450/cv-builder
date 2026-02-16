// app.js (FULL)
(function () {
  const qs = (id) => document.getElementById(id);

  const preview = qs("preview");
  const printBtn = qs("printBtn");
  const downloadPdfBtn = qs("downloadPdfBtn");
  const downloadHtmlBtn = qs("downloadHtmlBtn");

  const FIELD_IDS = [
    "name","title","email","phone","location","linkedin",
    "summary","clinicalSkills","coreCompetencies","languages",
    "achievements","custom1","custom2",
  ];

  const SECTION_KEYS = [
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer","custom1","custom2",
  ];

  const CONTACT_SHOW_IDS = ["show_title","show_email","show_phone","show_location","show_linkedin"];

  const state = { data: {}, sections: {}, ui: { lang: "en" } };

  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
    });
  }

  const STORAGE_KEY = "cv_builder_user_overrides_structured_v3";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      state.data = parsed.data || {};
      state.sections = parsed.sections || {};
      state.ui = parsed.ui || state.ui;
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state.data, sections: state.sections, ui: state.ui }));
    } catch (_) {}
  }

  function ensureContactSection() {
    if (!state.sections.contact) state.sections.contact = {};
    // defaults true
    CONTACT_SHOW_IDS.forEach((k) => {
      if (state.sections.contact[k] == null) state.sections.contact[k] = true;
    });
  }

  function initSectionsFromUI() {
    SECTION_KEYS.forEach((k) => {
      if (!state.sections[k]) state.sections[k] = {};
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      if (en) state.sections[k].enabled = !!en.checked;
      if (ti) state.sections[k].title = ti.value;
    });

    ensureContactSection();
    CONTACT_SHOW_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      state.sections.contact[id] = !!el.checked;
    });
  }

  function syncUIFromState() {
    // simple fields
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      const val = state.data[id];
      el.value = val != null ? String(val) : "";
    });

    // section toggles + titles
    SECTION_KEYS.forEach((k) => {
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      if (en && state.sections?.[k]?.enabled != null) en.checked = !!state.sections[k].enabled;
      if (ti && state.sections?.[k]?.title) ti.value = state.sections[k].title;
    });

    ensureContactSection();
    CONTACT_SHOW_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      el.checked = state.sections.contact[id] !== false;
    });
  }

  function bindSimpleInputs() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;

      // initial
      if (state.data[id] != null && String(state.data[id]).length > 0) el.value = String(state.data[id]);
      else el.value = "";

      el.addEventListener("input", () => {
        state.data[id] = el.value;
        if (String(el.value).trim() === "") delete state.data[id];
        saveState();
        render();
      });
    });

    // section toggles
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

    // contact show/hide
    ensureContactSection();
    CONTACT_SHOW_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      // initial from state
      el.checked = state.sections.contact[id] !== false;

      el.addEventListener("change", () => {
        ensureContactSection();
        state.sections.contact[id] = !!el.checked;
        saveState();
        render();
      });
    });
  }

  // ---------- Toolbar helpers (Bold + Bullet) ----------
  function wrapSelectionWith(el, left, right) {
    const v = el.value || "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    el.value = v.slice(0, start) + left + v.slice(start, end) + right + v.slice(end);
    el.setSelectionRange(start + left.length, end + left.length);
  }

  const BULLET = "• ";

  function setBulletButtonState(tb, on) {
    const btn = tb.querySelector('[data-action="bullets"]');
    if (!btn) return;
    btn.classList.toggle("active", !!on);
    btn.setAttribute("aria-pressed", String(!!on));
  }

  function getLineStart(v, pos) {
    return v.lastIndexOf("\n", pos - 1) + 1;
  }

  function lineHasBulletPrefix(v, lineStart) {
    const head2 = v.slice(lineStart, lineStart + 2);
    return head2 === "• " || head2 === "- ";
  }

  function ensureBulletPrefixAtCurrentLine(el) {
    const v = el.value || "";
    const pos = el.selectionStart ?? v.length;
    const lineStart = getLineStart(v, pos);
    if (lineHasBulletPrefix(v, lineStart)) return;

    el.value = v.slice(0, lineStart) + BULLET + v.slice(lineStart);
    const newPos = pos + BULLET.length;
    el.setSelectionRange(newPos, newPos);
  }

  function insertBulletNewline(el) {
    const v = el.value || "";
    const pos = el.selectionStart ?? v.length;
    const insert = "\n" + BULLET;
    el.value = v.slice(0, pos) + insert + v.slice(pos);
    el.setSelectionRange(pos + insert.length, pos + insert.length);
  }

  function removeEmptyBulletLine(el) {
    const v = el.value || "";
    const pos = el.selectionStart ?? v.length;
    const lineStart = getLineStart(v, pos);
    const lineEndIdx = v.indexOf("\n", lineStart);
    const lineEnd = lineEndIdx === -1 ? v.length : lineEndIdx;
    const line = v.slice(lineStart, lineEnd);

    if ((line.startsWith("• ") && line.trim() === "•") || (line.startsWith("- ") && line.trim() === "-")) {
      el.value = v.slice(0, lineStart) + v.slice(lineStart + 2);
      const newPos = Math.max(lineStart, pos - 2);
      el.setSelectionRange(newPos, newPos);
    }
  }

  function bindToolbar(tb, target, onChange) {
    if (!tb || !target) return;
    target.dataset.bulletOn = target.dataset.bulletOn || "";
    setBulletButtonState(tb, target.dataset.bulletOn === "1");

    target.addEventListener("keydown", (e) => {
      // Only intercept Enter when bullet mode is on
      if (target.dataset.bulletOn !== "1") return;

      if (e.key === "Enter") {
        e.preventDefault();
        insertBulletNewline(target);
        onChange();
        return;
      }
      if (e.key === "Backspace") {
        setTimeout(() => {
          removeEmptyBulletLine(target);
          onChange();
        }, 0);
      }
    });

    tb.querySelectorAll(".tbtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = btn.getAttribute("data-action");
        target.focus();

        if (action === "bold") {
          wrapSelectionWith(target, "**", "**");
          onChange();
          return;
        }

        if (action === "bullets") {
          const on = target.dataset.bulletOn === "1" ? "" : "1";
          target.dataset.bulletOn = on;
          setBulletButtonState(tb, on === "1");

          if (on === "1") {
            ensureBulletPrefixAtCurrentLine(target);
            onChange();
          }
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

  // ---------- Structured sections ----------
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
    ensureArray("experienceJobs", 3, () => ({ title: "", meta: "", bullets: [] }));
    const txt = expToText(state.data.experienceJobs);
    if (expHidden) expHidden.value = txt;
    setOverrideField("experience", txt);
  }

  function renderExperience() {
    if (!expRoot) return;
    ensureArray("experienceJobs", 3, () => ({ title: "", meta: "", bullets: [] }));
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
          <button class="tbtn tdot" data-action="bullets" type="button" title="Toggle bullets"></button>
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
      ensureArray("experienceJobs", 3, () => ({ title: "", meta: "", bullets: [] }));
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
    ensureArray("volunteerBlocks", 3, () => ({ header: "", sub: "", bullets: [] }));
    const txt = volToText(state.data.volunteerBlocks);
    if (volHidden) volHidden.value = txt;
    setOverrideField("volunteer", txt);
  }

  function renderVolunteer() {
    if (!volRoot) return;
    ensureArray("volunteerBlocks", 3, () => ({ header: "", sub: "", bullets: [] }));
    volRoot.innerHTML = "";

    state.data.volunteerBlocks.forEach((v, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "subcard";
      wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">Volunteer ${idx + 1}</div>
          <button class="btn ghost" type="button" data-vol-remove="${idx}" style="padding:6px 10px;">Remove</button>
        </div>

        <label class="label">Header (Title + Date)</label>
        <input class="input" data-vol-header="${idx}" placeholder="Volunteer Nurse 2019 – Present" />

        <label class="label">Sub line</label>
        <input class="input" data-vol-sub="${idx}" placeholder="Austin Free Clinic · Community Health Outreach" />

        <div class="toolbar" data-vol-toolbar="${idx}">
          <button class="tbtn" data-action="bold" type="button"><b>B</b></button>
          <button class="tbtn tdot" data-action="bullets" type="button" title="Toggle bullets"></button>
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
      ensureArray("volunteerBlocks", 3, () => ({ header: "", sub: "", bullets: [] }));
      state.data.volunteerBlocks.push({ header: "", sub: "", bullets: [] });
      syncVolunteer();
      saveState();
      renderVolunteer();
      render();
    });
  }

  // ---- Export helpers (FIX: reliable PDF/print)
  async function exportToPrintWindow({ autoPrint = true } = {}) {
    const cssText = await fetch("/styles.css", { cache: "no-store" }).then(r => r.text());
    const cvHtml = preview ? preview.innerHTML : "";

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
  <div id="preview">${cvHtml}</div>
  <script>
    window.onload = () => {
      ${autoPrint ? "setTimeout(() => window.print(), 50);" : ""}
    };
  </script>
</body>
</html>`;

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) {
      alert("Pop-up blocked. Please allow pop-ups for export.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  if (printBtn) printBtn.addEventListener("click", () => exportToPrintWindow({ autoPrint: true }));
  if (downloadPdfBtn) downloadPdfBtn.addEventListener("click", () => exportToPrintWindow({ autoPrint: true }));

  // ---- Download HTML
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
  // Layout controls: hide + fullscreen + resizers
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
    if (v.editor && v.preview && v.ai) {
      setGridColumns("1.25fr 10px 1fr 10px 0.85fr");
      return;
    }
    if (v.editor && v.preview && !v.ai) { setGridColumns("1.25fr 10px 1fr"); return; }
    if (v.editor && !v.preview && v.ai) { setGridColumns("1.25fr 10px 1fr"); return; }
    if (!v.editor && v.preview && v.ai) { setGridColumns("1fr 10px 0.85fr"); return; }
    setGridColumns("1fr");
  }

  function setupPanelButtons() {
    const showPanelsBtn = qs("showPanelsBtn");

    function setBodyLocked(on){
      document.body.style.overflow = on ? "hidden" : "";
    }

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

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll(".panel.is-fullscreen").forEach(p => p.classList.remove("is-fullscreen"));
        document.querySelectorAll(".fullscreen-backdrop").forEach(b => b.remove());
        document.body.style.overflow = "";
      }
    });

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
  // i18n (UI language)
  // ---------------------------
  const I18N = {
    en: {
      "app.title":"CV Builder",
      "topbar.panels":"Panels",
      "topbar.logout":"Log out",
      "editor.title":"Edit content",
      "preview.title":"Preview",
      "ai.title":"AI Coach",
      "ai.helptext":"Ask for review, improvements, new bullet points, or layout changes. You must approve suggestions before they are applied.",
      "hint.send":"Tip: Ctrl/Cmd + Enter to send.",
      "hint.toolbar":"Tip: Select text and press B for **bold**. Use • to toggle bullet typing.",
      "common.show":"Show",
      "common.hide":"Hide",
      "common.fullscreen":"Fullscreen",
      "common.clear":"Clear",
      "common.send":"Send",
      "common.cancel":"Cancel",
      "btn.print":"Print",
      "btn.downloadPdf":"Download PDF",
      "btn.downloadHtml":"Download HTML",
      "btn.addEducation":"+ Add education",
      "btn.addLicense":"+ Add license",
      "btn.addJob":"+ Add job",
      "btn.addVolunteer":"+ Add volunteer",
      "contact.fullName":"Full name",
      "contact.title":"Title / Credentials",
      "contact.email":"Email",
      "contact.phone":"Phone",
      "contact.location":"Location",
      "contact.linkedin":"LinkedIn",
      "lang.title":"Choose language",
      "locked.title":"Access required",
      "locked.body1":"You need access to use the CV Builder.",
      "locked.body2":"If you just purchased: you will receive an email shortly with your secure login link.",
      "locked.buy":"Buy access",
      "locked.body3":"After purchase, you’ll receive an email shortly with your secure login link. Your access is valid for 30 days."
    },
    no: {
      "app.title":"CV-bygger",
      "topbar.panels":"Paneler",
      "topbar.logout":"Logg ut",
      "editor.title":"Rediger innhold",
      "preview.title":"Forhåndsvisning",
      "ai.title":"AI Coach",
      "ai.helptext":"Be om gjennomgang, forbedringer, nye punkter eller layout. Du må godkjenne forslag før de brukes.",
      "hint.send":"Tips: Ctrl/Cmd + Enter for å sende.",
      "hint.toolbar":"Tips: Marker tekst og trykk B for **fet**. Bruk • for bullet-modus.",
      "common.show":"Vis",
      "common.hide":"Skjul",
      "common.fullscreen":"Fullskjerm",
      "common.clear":"Tøm",
      "common.send":"Send",
      "common.cancel":"Avbryt",
      "btn.print":"Skriv ut",
      "btn.downloadPdf":"Last ned PDF",
      "btn.downloadHtml":"Last ned HTML",
      "btn.addEducation":"+ Legg til utdanning",
      "btn.addLicense":"+ Legg til lisens",
      "btn.addJob":"+ Legg til jobb",
      "btn.addVolunteer":"+ Legg til frivillig",
      "contact.fullName":"Fullt navn",
      "contact.title":"Tittel / Kompetanse",
      "contact.email":"E-post",
      "contact.phone":"Telefon",
      "contact.location":"Sted",
      "contact.linkedin":"LinkedIn",
      "lang.title":"Velg språk",
      "locked.title":"Tilgang kreves",
      "locked.body1":"Du trenger tilgang for å bruke CV-byggeren.",
      "locked.body2":"Hvis du nettopp kjøpte: du får en e-post snart med sikker innloggingslenke.",
      "locked.buy":"Kjøp tilgang",
      "locked.body3":"Etter kjøp får du en e-post snart med sikker innloggingslenke. Tilgangen varer i 30 dager."
    },
    de: {
      "app.title":"CV Builder",
      "topbar.panels":"Panels",
      "topbar.logout":"Abmelden",
      "editor.title":"Inhalte bearbeiten",
      "preview.title":"Vorschau",
      "ai.title":"KI-Coach",
      "ai.helptext":"Bitte um Review, Verbesserungen, neue Bulletpoints oder Layout. Vorschläge müssen bestätigt werden.",
      "hint.send":"Tipp: Strg/Cmd + Enter zum Senden.",
      "hint.toolbar":"Tipp: Text markieren und B für **fett**. • für Bullet-Modus.",
      "common.show":"Anzeigen",
      "common.hide":"Ausblenden",
      "common.fullscreen":"Vollbild",
      "common.clear":"Leeren",
      "common.send":"Senden",
      "common.cancel":"Abbrechen",
      "btn.print":"Drucken",
      "btn.downloadPdf":"PDF herunterladen",
      "btn.downloadHtml":"HTML herunterladen",
      "btn.addEducation":"+ Ausbildung hinzufügen",
      "btn.addLicense":"+ Lizenz hinzufügen",
      "btn.addJob":"+ Job hinzufügen",
      "btn.addVolunteer":"+ Ehrenamt hinzufügen",
      "contact.fullName":"Vollständiger Name",
      "contact.title":"Titel / Qualifikation",
      "contact.email":"E-Mail",
      "contact.phone":"Telefon",
      "contact.location":"Ort",
      "contact.linkedin":"LinkedIn",
      "lang.title":"Sprache wählen"
    }
  };

  const LANGS = [
    { code: "en", name: "English" },
    { code: "no", name: "Norsk" },
    { code: "de", name: "Deutsch" },
    { code: "sv", name: "Svenska" },
    { code: "da", name: "Dansk" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "it", name: "Italiano" },
    { code: "nl", name: "Nederlands" },
    { code: "pl", name: "Polski" },
    { code: "pt", name: "Português" }
  ];

  function t(key) {
    const lang = state.ui.lang || "en";
    return (I18N[lang] && I18N[lang][key]) || (I18N.en[key]) || key;
  }

  function applyI18n() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const txt = t(key);
      el.textContent = txt;
    });

    // update language pill
    const pill = qs("langPill");
    const current = LANGS.find(x => x.code === (state.ui.lang || "en"));
    if (pill) pill.textContent = current ? current.name : "English";
  }

  // language modal
  function setupLanguageModal() {
    const btn = qs("langBtn");
    const modal = qs("langModal");
    const close = qs("langClose");
    const cancel = qs("langCancel");
    const search = qs("langSearch");
    const list = qs("langList");

    function open() {
      if (!modal) return;
      modal.style.display = "flex";
      document.body.style.overflow = "hidden";
      if (search) {
        search.value = "";
        search.focus();
      }
      renderList("");
    }

    function hide() {
      if (!modal) return;
      modal.style.display = "none";
      document.body.style.overflow = "";
    }

    function renderList(filter) {
      if (!list) return;
      const q = String(filter || "").toLowerCase().trim();
      const items = LANGS.filter(l =>
        !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q)
      );

      list.innerHTML = items.map(l => {
        const active = l.code === state.ui.lang ? "active" : "";
        return `<div class="lang-item ${active}" data-lang="${l.code}">
          <div>${l.name}</div>
          <div class="code">${l.code}</div>
        </div>`;
      }).join("");

      list.querySelectorAll("[data-lang]").forEach((row) => {
        row.addEventListener("click", () => {
          const code = row.getAttribute("data-lang");
          if (!code) return;
          state.ui.lang = code;
          saveState();
          applyI18n();
          // also set default section titles if user hasn't customized them:
          applyDefaultSectionTitlesForLanguage();
          render();
          hide();
        });
      });
    }

    if (btn) btn.addEventListener("click", open);
    if (close) close.addEventListener("click", hide);
    if (cancel) cancel.addEventListener("click", hide);
    if (modal) modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
    if (search) search.addEventListener("input", () => renderList(search.value));
  }

  function applyDefaultSectionTitlesForLanguage() {
    // Only overwrite if user hasn't changed it (we store a marker)
    // If you want always-translate, remove these checks.
    const lang = state.ui.lang || "en";

    const defaults = {
      en: {
        summary: "Professional Summary",
        education: "Education",
        licenses: "Licenses & Certifications",
        clinicalSkills: "Clinical Skills",
        coreCompetencies: "Core Competencies",
        languages: "Languages",
        experience: "Professional Experience",
        achievements: "Clinical Achievements",
        volunteer: "Volunteer Experience",
        custom1: "Custom Section 1",
        custom2: "Custom Section 2",
      },
      no: {
        summary: "Profesjonell oppsummering",
        education: "Utdanning",
        licenses: "Lisenser og sertifiseringer",
        clinicalSkills: "Kliniske ferdigheter",
        coreCompetencies: "Kjernekompetanse",
        languages: "Språk",
        experience: "Arbeidserfaring",
        achievements: "Resultater / Utmerkelser",
        volunteer: "Frivillig erfaring",
        custom1: "Egendefinert seksjon 1",
        custom2: "Egendefinert seksjon 2",
      },
      de: {
        summary: "Profil",
        education: "Ausbildung",
        licenses: "Lizenzen & Zertifikate",
        clinicalSkills: "Fachliche Fähigkeiten",
        coreCompetencies: "Kernkompetenzen",
        languages: "Sprachen",
        experience: "Berufserfahrung",
        achievements: "Erfolge",
        volunteer: "Ehrenamt",
        custom1: "Benutzerdefiniert 1",
        custom2: "Benutzerdefiniert 2",
      }
    };

    const map = defaults[lang] || defaults.en;

    SECTION_KEYS.forEach((k) => {
      if (!state.sections[k]) state.sections[k] = {};
      // only set if empty
      if (!state.sections[k].title || String(state.sections[k].title).trim() === "") {
        state.sections[k].title = map[k] || state.sections[k].title || k;
      }
      // also update UI input fields
      const ti = qs(`sec_${k}_title`);
      if (ti && map[k]) ti.value = state.sections[k].title;
    });

    saveState();
    render();
  }

  // ---------------------------
  // AI Coach (per-suggestion accept + sync to UI)
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
    "sections.custom2.enabled","sections.custom2.title",

    // contact show/hide
    "sections.contact.show_title",
    "sections.contact.show_email",
    "sections.contact.show_phone",
    "sections.contact.show_location",
    "sections.contact.show_linkedin"
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

  function applyChangePatch(patch) {
    if (!patch || patch.op !== "set" || typeof patch.path !== "string") return;
    if (!ALLOWED_SET_PATHS.has(patch.path)) return;

    if (patch.path.startsWith("data.")) {
      const p = patch.path.replace(/^data\./, "");
      state.data[p] = patch.value;
      if (String(patch.value ?? "").trim() === "") delete state.data[p];
    } else if (patch.path.startsWith("sections.")) {
      const p = patch.path.replace(/^sections\./, "");
      setByPath(state.sections, p, patch.value);
    }

    // After applying patches: sync UI inputs + structured blocks + preview
    saveState();
    syncUIFromState();

    // Re-render structured blocks from current state (so left panel matches)
    renderEducation();
    renderLicenses();
    renderExperience();
    renderVolunteer();

    render();
  }

  function renderSuggestionCard(payload) {
    const chat = qs("aiChat");
    if (!chat) return;

    const message = payload?.message || "";
    const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];

    const div = document.createElement("div");
    div.className = "msg assistant";
    div.innerHTML = `
      <div class="msg-title">Suggestion</div>
      <div>${escapeHtml(message).replace(/\n/g,"<br>")}</div>
      ${suggestions.length ? `<div class="sugg">
        <div class="muted small">Choose which suggestions to apply:</div>
        ${suggestions.map((s, idx) => `
          <div class="sugg-item" data-sugg="${idx}">
            <div class="topic">${escapeHtml(s.topic || "Suggestion")}</div>
            <div>${escapeHtml(String(s.preview || "")).replace(/\n/g,"<br>")}</div>
            <div class="sugg-buttons">
              <button class="btn" type="button" data-accept="${idx}">Accept</button>
              <button class="btn ghost" type="button" data-reject="${idx}">Reject</button>
            </div>
          </div>
        `).join("")}
      </div>` : ``}
    `;
    chat.prepend(div);

    suggestions.forEach((s, idx) => {
      const accept = div.querySelector(`[data-accept="${idx}"]`);
      const reject = div.querySelector(`[data-reject="${idx}"]`);
      accept?.addEventListener("click", () => {
        // Apply all patches for this single suggestion
        const patches = Array.isArray(s.patches) ? s.patches : [];
        patches.forEach(applyChangePatch);
        accept.disabled = true;
        if (reject) reject.disabled = true;
        accept.textContent = "Applied ✓";
      });
      reject?.addEventListener("click", () => {
        if (accept) accept.disabled = true;
        reject.disabled = true;
        reject.textContent = "Rejected";
      });
    });
  }

  function snapshotForAI() {
    return { data: state.data, sections: state.sections, ui: state.ui };
  }

  async function sendToAI(userText) {
    const thinking = addThinking();
    const uiLang = state.ui.lang || "en";

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          language: uiLang,
          snapshot: snapshotForAI(),
          history: aiHistory
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "AI request failed");

      thinking?.remove();

      aiHistory.push({ role: "assistant", content: payload?.message || "" });
      saveAIHistory(aiHistory);

      renderSuggestionCard(payload);

    } catch (err) {
      thinking?.remove();
      console.error(err);

      const fallback = uiLang === "no"
        ? "Beklager — noe gikk galt. Prøv igjen."
        : (uiLang === "de" ? "Entschuldigung — etwas ist schiefgelaufen. Bitte erneut versuchen." : "Sorry — something went wrong. Please try again.");

      aiHistory.push({ role: "assistant", content: fallback });
      saveAIHistory(aiHistory);

      renderSuggestionCard({ message: fallback, suggestions: [] });
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

  // Boot
  loadState();
  initSectionsFromUI();
  syncUIFromState();
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

  // Language
  if (!state.ui.lang) state.ui.lang = "en";
  setupLanguageModal();
  applyI18n();

  saveState();
  render();
})();
