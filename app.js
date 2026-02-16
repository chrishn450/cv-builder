// app.js (FULL) — with AI Coach panel (right), suggestions + accept/reject
(function () {
  const qs = (id) => document.getElementById(id);

  const preview = qs("preview");
  const printBtn = qs("printBtn");
  const downloadHtmlBtn = qs("downloadHtmlBtn");
  const aiReviewBtn = qs("aiReviewBtn");

  // AI chat UI
  const aiChatLog = qs("aiChatLog");
  const aiChatInput = qs("aiChatInput");
  const aiSendBtn = qs("aiSendBtn");
  const aiClearBtn = qs("aiClearBtn");
  const aiSuggestions = qs("aiSuggestions");

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

  const state = {
    data: {},
    sections: {},
    layout: {
      padX: 40,     // px
      gap: 30,      // px
      leftWidth: 34 // percent
    }
  };

  function applyLayoutToPreview() {
    // apply CSS vars on the preview container so exported HTML/print stays consistent
    const root = preview?.querySelector(".cv");
    const target = root || preview; // fallback
    if (!target) return;

    target.style.setProperty("--cv-pad-x", `${state.layout.padX}px`);
    target.style.setProperty("--cv-gap", `${state.layout.gap}px`);
    target.style.setProperty("--cv-left-width", `${state.layout.leftWidth}%`);
  }

  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
    });
    applyLayoutToPreview();
  }

  // Store only user overrides (so preview can stay "original" until user types)
  const STORAGE_KEY = "cv_builder_user_overrides_structured_v3";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      state.data = parsed.data || {};
      state.sections = parsed.sections || {};
      state.layout = parsed.layout || state.layout;
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: state.data, sections: state.sections, layout: state.layout }));
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

  // ──────────────────────────────────────────────
  // AI helpers
  // ──────────────────────────────────────────────
  function detectLanguageFromText(t) {
    // very light: if contains norwegian letters or common words, treat as NO
    const s = String(t || "");
    if (/[æøå]/i.test(s)) return "no";
    if (/\b(ikke|og|jeg|du|kan|vil|må|skal)\b/i.test(s)) return "no";
    return "en";
  }

  function getCVSnapshotForAI() {
    // send structured + rendered text
    return {
      text: (preview?.innerText || "").trim(),
      data: state.data,
      sections: state.sections,
      layout: state.layout
    };
  }

  function addChatMsg(role, text) {
    if (!aiChatLog) return;
    const div = document.createElement("div");
    div.className = `ai-msg ${role}`;
    div.textContent = text;
    aiChatLog.appendChild(div);
    aiChatLog.scrollTop = aiChatLog.scrollHeight;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  // Apply AI patch ops safely
  // Supports:
  // - set on: data.<field>, sections.<key>.<prop>, layout.<padX|gap|leftWidth>
  function applyChanges(changes) {
    (changes || []).forEach((c) => {
      if (!c || c.op !== "set") return;

      const path = String(c.path || "");
      const value = c.value;

      // data.field
      if (path.startsWith("data.")) {
        const key = path.slice("data.".length);
        state.data[key] = value;
        const el = qs(key);
        if (el) el.value = value;
        return;
      }

      // direct field alias (summary, clinicalSkills, etc.)
      if (FIELD_IDS.includes(path) || ["education","licenses","experience","volunteer"].includes(path)) {
        state.data[path] = value;
        const el = qs(path);
        if (el) el.value = value;
        return;
      }

      // sections.key.prop
      if (path.startsWith("sections.")) {
        const parts = path.split(".");
        const key = parts[1];
        const prop = parts[2];
        if (!key || !prop) return;
        if (!state.sections[key]) state.sections[key] = {};
        state.sections[key][prop] = value;

        if (prop === "title") {
          const ti = qs(`sec_${key}_title`);
          if (ti) ti.value = value;
        }
        if (prop === "enabled") {
          const en = qs(`sec_${key}_enabled`);
          if (en) en.checked = !!value;
        }
        return;
      }

      // layout.padX / layout.gap / layout.leftWidth
      if (path.startsWith("layout.")) {
        const k = path.slice("layout.".length);
        if (k === "padX" || k === "gap" || k === "leftWidth") {
          state.layout[k] = Number(value);
          return;
        }
      }
    });

    saveState();
    render();
  }

  function renderSuggestions(list) {
    if (!aiSuggestions) return;
    aiSuggestions.innerHTML = "";

    if (!list || !list.length) return;

    list.forEach((s) => {
      const card = document.createElement("div");
      card.className = "sugg-card";

      const before = s.preview?.before ?? "";
      const after = s.preview?.after ?? "";

      card.innerHTML = `
        <div class="row" style="justify-content:space-between; margin-top:0;">
          <div>
            <b>${escapeHtml(s.title || "Forslag")}</b>
            <div class="muted small">${escapeHtml(s.why || "")}</div>
          </div>
          <div class="row" style="margin-top:0;">
            <button class="btn ghost" type="button" data-acc="${escapeHtml(s.id)}">Accept</button>
            <button class="btn ghost" type="button" data-rej="${escapeHtml(s.id)}">Reject</button>
          </div>
        </div>

        ${(before || after) ? `
          <div class="diff">
            <div>
              <div class="muted small">Before</div>
              <div class="diffbox">${escapeHtml(before)}</div>
            </div>
            <div>
              <div class="muted small">After</div>
              <div class="diffbox">${escapeHtml(after)}</div>
            </div>
          </div>
        ` : ""}
      `;

      aiSuggestions.appendChild(card);

      const acc = card.querySelector(`[data-acc="${CSS.escape(s.id)}"]`);
      const rej = card.querySelector(`[data-rej="${CSS.escape(s.id)}"]`);

      if (acc) {
        acc.addEventListener("click", () => {
          applyChanges(s.changes || []);
          card.remove();
        });
      }
      if (rej) {
        rej.addEventListener("click", () => card.remove());
      }
    });
  }

  async function callAI(userMessage, mode) {
    const snap = getCVSnapshotForAI();
    const language = detectLanguageFromText(userMessage || snap.text);

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: mode || "chat",
        language,
        message: userMessage || "",
        cv: snap
      })
    });

    const payload = await res.json();
    if (!res.ok) throw new Error(payload?.error || "AI request failed");
    return payload;
  }

  // AI Review button → asks AI for review + suggestions
  async function runReview() {
    if (!aiReviewBtn) return;
    aiReviewBtn.disabled = true;
    aiReviewBtn.textContent = "AI…";

    try {
      addChatMsg("user", "Gi meg en review av CV-en og forslag til forbedringer.");
      const payload = await callAI("Gi meg en review av CV-en og forslag til forbedringer.", "review");

      addChatMsg("assistant", payload.reply || "");
      renderSuggestions(payload.suggestions || []);
    } catch (e) {
      console.error(e);
      alert("AI review failed. Check Vercel logs.");
    } finally {
      aiReviewBtn.disabled = false;
      aiReviewBtn.textContent = "AI Review";
    }
  }

  // Chat send
  async function sendChat() {
    const msg = String(aiChatInput?.value || "").trim();
    if (!msg) return;

    if (aiSendBtn) {
      aiSendBtn.disabled = true;
      aiSendBtn.textContent = "…";
    }

    try {
      addChatMsg("user", msg);
      aiChatInput.value = "";

      const payload = await callAI(msg, "chat");
      addChatMsg("assistant", payload.reply || "");
      renderSuggestions(payload.suggestions || []);
    } catch (e) {
      console.error(e);
      alert("AI chat failed. Check Vercel logs.");
    } finally {
      if (aiSendBtn) {
        aiSendBtn.disabled = false;
        aiSendBtn.textContent = "Send";
      }
    }
  }

  if (aiSendBtn) aiSendBtn.addEventListener("click", sendChat);
  if (aiChatInput) {
    aiChatInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        sendChat();
      }
    });
  }
  if (aiClearBtn) {
    aiClearBtn.addEventListener("click", () => {
      if (aiChatLog) aiChatLog.innerHTML = "";
      if (aiSuggestions) aiSuggestions.innerHTML = "";
    });
  }
  if (aiReviewBtn) aiReviewBtn.addEventListener("click", runReview);

  // INIT show app
  const app = qs("app");
  const locked = qs("locked");
  if (app) app.style.display = "block";
  if (locked) locked.style.display = "none";

  // Boot
  loadState();
  initSectionsFromUI();
  bindSimpleInputs();
  bindSimpleToolbars();

  renderEducation();
  renderLicenses();
  renderExperience();
  renderVolunteer();

  saveState();
  render();
})();
