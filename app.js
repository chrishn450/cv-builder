// app.js (FULL)
(function () {
  const qs = (id) => document.getElementById(id);

  const preview = qs("preview");
  const printBtn = qs("printBtn");
  const downloadHtmlBtn = qs("downloadHtmlBtn");

  // Only these are "simple" fields. Structured sections are handled separately.
  const FIELD_IDS = [
    "name","title","email","phone","location","linkedin",
    "summary","clinicalSkills","coreCompetencies","languages",
    "achievements","custom1","custom2",
  ];

  const SECTION_KEYS = [
    "summary","education","licenses","clinicalSkills","coreCompetencies",
    "languages","experience","achievements","volunteer","custom1","custom2",
  ];

  const state = { data: {}, sections: {} };

  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
    });
  }

  // Store only user overrides (so preview can stay "original" until user types)
  const STORAGE_KEY = "cv_builder_user_overrides_structured_v3";
  const UI_KEY = "cv_builder_ui_layout_v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      state.data = parsed.data || {};
      state.sections = parsed.sections || {};
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state.data, sections: state.sections }));
    } catch (_) {}
  }

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

      // Keep empty unless user override exists
      if (state.data[id] != null && String(state.data[id]).length > 0) el.value = String(state.data[id]);
      else el.value = "";

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

  // ---- Simple toolbars for textareas (summary/skills/etc)
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

  // ----- Education blocks -> education text (blocks separated by blank line)
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

  // ----- Licenses blocks -> lines in pairs (title + detail)
  function licToText(items) {
    const lines = [];
    (items || []).forEach((it) => {
      const t = (it.title || "").trim();
      const d = (it.detail || "").trim();
      if (!t && !d) return;
      if (t) lines.push(t);
      if (d) lines.push(d);
      else lines.push(""); // keep pairing
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

  // ----- Experience jobs -> blocks with title/meta + bullets
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
          <button class="tbtn tdot" data-action="bullets" type="button"></button>
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

  // ----- Volunteer blocks (multiple blocks)
  function volToText(vols) {
    return (vols || [])
      .map((v) => {
        const header = (v.header || "").trim(); // "Volunteer Nurse 2019 – Present" OR "Title | Date"
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
          <button class="tbtn tdot" data-action="bullets" type="button"></button>
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

  // ---- Print
  if (printBtn) {
    printBtn.addEventListener("click", () => window.print());
  }

  // ---- Download HTML (standalone + identical)
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

  // ──────────────────────────────────────────────
  // 3-pane layout builder + resizers
  // (Editor card + Preview card already exist in your HTML)
  // We'll wrap them into .workspace and add AI pane.
  // ──────────────────────────────────────────────
  function buildWorkspace() {
    const grid = document.querySelector("#app .grid");
    if (!grid) return;

    const cards = grid.querySelectorAll(":scope > .card");
    if (cards.length < 2) return;

    const editorCard = cards[0];
    const previewCard = cards[1];

    // Create workspace wrapper
    const workspace = document.createElement("div");
    workspace.className = "workspace";

    // Make panes
    const paneEditor = document.createElement("div");
    paneEditor.className = "pane";
    paneEditor.id = "paneEditor";

    const panePreview = document.createElement("div");
    panePreview.className = "pane pane-grow";
    panePreview.id = "panePreview";

    const paneAI = document.createElement("div");
    paneAI.className = "pane";
    paneAI.id = "paneAI";

    // Resizers
    const r1 = document.createElement("div");
    r1.className = "vresizer";
    r1.id = "resizer1";

    const r2 = document.createElement("div");
    r2.className = "vresizer";
    r2.id = "resizer2";

    // Move existing cards into panes
    paneEditor.appendChild(editorCard);
    panePreview.appendChild(previewCard);

    // Build AI card (if not already exists)
    const aiCard = document.createElement("div");
    aiCard.className = "card";
    aiCard.id = "aiCoachCard";
    aiCard.innerHTML = `
      <div class="ai-head">
        <h2 style="margin:0;">AI Coach</h2>
        <button id="aiClear" class="btn ghost" type="button">Clear</button>
      </div>
      <div class="muted small" style="margin-top:6px;">
        Ask for review, improvements, new bullet points, or layout changes.
        You must always approve suggestions before they are applied.
      </div>

      <div id="aiChat" class="ai-chat" aria-live="polite"></div>

      <div class="ai-actions">
        <textarea id="aiInput" class="textarea" rows="3"
          placeholder="e.g. 'Improve my summary and make it more results-driven'"></textarea>
        <button id="aiSend" class="btn" type="button">Send</button>
      </div>
      <div class="muted small" style="margin-top:6px;">
        Tip: You can ask in any language — the coach should reply in the same language.
      </div>
    `;
    paneAI.appendChild(aiCard);

    // Replace grid with workspace
    grid.innerHTML = "";
    workspace.appendChild(paneEditor);
    workspace.appendChild(r1);
    workspace.appendChild(panePreview);
    workspace.appendChild(r2);
    workspace.appendChild(paneAI);
    grid.appendChild(workspace);

    // Restore widths
    try {
      const s = JSON.parse(localStorage.getItem(UI_KEY) || "{}");
      if (s.editorW) paneEditor.style.width = s.editorW;
      if (s.aiW) paneAI.style.width = s.aiW;
    } catch(_) {}
  }

  function setupResizers() {
    const paneEditor = qs("paneEditor");
    const paneAI = qs("paneAI");
    const resizer1 = qs("resizer1");
    const resizer2 = qs("resizer2");
    const workspace = document.querySelector(".workspace");
    if (!paneEditor || !paneAI || !workspace || !resizer1 || !resizer2) return;

    const isColumnMode = () => window.matchMedia("(max-width: 1180px)").matches;

    function saveUI() {
      try {
        localStorage.setItem(UI_KEY, JSON.stringify({
          editorW: paneEditor.style.width || "",
          aiW: paneAI.style.width || "",
        }));
      } catch(_) {}
    }

    function dragResizer(resizer, which) {
      let startX = 0, startY = 0;
      let startEditorW = 0, startAIW = 0;
      let startPreviewW = 0;

      const onMove = (e) => {
        const dx = (e.clientX || 0) - startX;
        const dy = (e.clientY || 0) - startY;

        if (!isColumnMode()) {
          // horizontal drag
          if (which === 1) {
            const newW = Math.max(280, startEditorW + dx);
            paneEditor.style.width = `${newW}px`;
          } else if (which === 2) {
            const newW = Math.max(280, startAIW - dx);
            paneAI.style.width = `${newW}px`;
          }
        } else {
          // stacked mode: resize heights (optional)
          // simple: ignore or you can add later
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        saveUI();
      };

      resizer.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        startX = e.clientX || 0;
        startY = e.clientY || 0;
        startEditorW = paneEditor.getBoundingClientRect().width;
        startAIW = paneAI.getBoundingClientRect().width;
        startPreviewW = (qs("panePreview") || {}).getBoundingClientRect?.().width || 0;

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    dragResizer(resizer1, 1);
    dragResizer(resizer2, 2);
  }

  // ──────────────────────────────────────────────
  // AI Coach logic (English UI + thinking bubble)
  // Endpoint expected: POST /api/ai
  // Returns JSON: { message: "...", changes?: [...] }
  // changes are applied only after user clicks "Accept".
  // ──────────────────────────────────────────────
  function detectLanguageFromText(t) {
    const s = String(t || "");
    // very simple heuristic
    if (/[æøåÆØÅ]/.test(s) || /\b(hvordan|kan du|jeg|ikke|dette|endre)\b/i.test(s)) return "no";
    return "en";
  }

  function snapshotForAI() {
    return {
      data: state.data,
      sections: state.sections
    };
  }

  function addMsg(role, title, text) {
    const chat = qs("aiChat");
    if (!chat) return;
    const div = document.createElement("div");
    div.className = `msg ${role}`;
    div.innerHTML = `
      <div class="msg-title">${title}</div>
      <div>${String(text || "").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div>
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

  // very safe apply (only known top-level text fields + section titles/enabled)
  const ALLOWED_SET_PATHS = new Set([
    "data.name","data.title","data.email","data.phone","data.location","data.linkedin",
    "data.summary","data.education","data.licenses","data.clinicalSkills","data.coreCompetencies",
    "data.languages","data.experience","data.achievements","data.volunteer","data.custom1","data.custom2",
    // sections
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

  function applyChanges(changes) {
    if (!Array.isArray(changes)) return;
    changes.forEach((c) => {
      if (!c || c.op !== "set" || typeof c.path !== "string") return;
      if (!ALLOWED_SET_PATHS.has(c.path)) return;

      // route path
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
  }

  function renderSuggestionCard(message, changes) {
    const chat = qs("aiChat");
    if (!chat) return;

    const div = document.createElement("div");
    div.className = "msg assistant";
    div.innerHTML = `
      <div class="msg-title">Suggestion</div>
      <div>${String(message || "").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div>

      ${Array.isArray(changes) && changes.length ? `
        <div class="sugg">
          <div class="muted small">Proposed changes (you must accept to apply):</div>
          <pre>${String(JSON.stringify(changes, null, 2)).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
          <div class="sugg-buttons">
            <button class="btn" type="button" data-accept>Accept</button>
            <button class="btn ghost" type="button" data-reject>Reject</button>
          </div>
        </div>
      ` : ``}
    `;

    chat.prepend(div);

    const accept = div.querySelector("[data-accept]");
    const reject = div.querySelector("[data-reject]");
    if (accept) {
      accept.addEventListener("click", () => {
        applyChanges(changes || []);
        accept.disabled = true;
        if (reject) reject.disabled = true;
        accept.textContent = "Applied ✓";
      });
    }
    if (reject) {
      reject.addEventListener("click", () => {
        accept && (accept.disabled = true);
        reject.disabled = true;
        reject.textContent = "Rejected";
      });
    }
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
          snapshot: snapshotForAI()
        })
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error || "AI request failed");
      }

      thinking && thinking.remove();

      // expected payload: { message: "...", changes: [...] }
      const msg = payload?.message || "Here are my suggestions.";
      const changes = payload?.changes || payload?.patches || payload?.actions || [];

      renderSuggestionCard(msg, changes);

    } catch (err) {
      thinking && thinking.remove();
      console.error(err);
      renderSuggestionCard("Sorry — something went wrong while contacting AI. Please try again.", []);
    }
  }

  function setupAIUI() {
    const aiSend = qs("aiSend");
    const aiClear = qs("aiClear");
    const aiInput = qs("aiInput");
    const chat = qs("aiChat");

    if (aiClear && chat) {
      aiClear.addEventListener("click", () => {
        chat.innerHTML = "";
      });
    }

    if (aiSend && aiInput) {
      const go = () => {
        const text = String(aiInput.value || "").trim();
        if (!text) return;
        addMsg("user", "You", text);
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
  }

  // INIT show app (auth kan kobles tilbake hos deg)
  const app = qs("app");
  const locked = qs("locked");
  if (app) app.style.display = "block";
  if (locked) locked.style.display = "none";

  // Boot
  loadState();
  initSectionsFromUI();

  // Build 3-pane layout + resizers + AI UI
  buildWorkspace();
  setupResizers();
  setupAIUI();

  // Bind UI after workspace created
  bindSimpleInputs();
  bindSimpleToolbars();

  renderEducation();
  renderLicenses();
  renderExperience();
  renderVolunteer();

  saveState();
  render();
})();
