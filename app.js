// app.js (FULL) — FREE editor + paywall-on-export (Payhip opens in NEW TAB) + auto-export after access
// Assumes:
// - index.html has: <link id="templateCss" rel="stylesheet" href="" />
// - index.html has: <select id="templateSelect"></select>
// - index.html includes: <script src="/templates/manifest.js?v=1"></script> BEFORE app.js
// - manifest.js defines: window.CV_TEMPLATES = [{ id, name, css, render, default?, free? }, ...]
// - /api/me returns (when logged in): { ok:true, email, has_access:true, access_expires_at, templates:["nurse", ...] }

(function () {
  // --- UI NODES (guard layer) ---
  const lockedEl = document.getElementById("locked");
  const appEl = document.getElementById("app");
  const logoutBtn = document.getElementById("logoutBtn");

  function showLocked() {
    if (appEl) appEl.style.display = "none";
    if (lockedEl) lockedEl.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  function showApp() {
    if (lockedEl) lockedEl.style.display = "none";
    if (appEl) appEl.style.display = "block";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
  }

  // ✅ NEW: optional auth (app is FREE to use; /api/me only enables export & entitlements)
  async function getMeOptional() {
    try {
      const r = await fetch("/api/me", { credentials: "include" });
      if (!r.ok) return null;
      const me = await r.json().catch(() => null);
      if (!me?.ok) return null;
      return me;
    } catch {
      return null;
    }
  }

  (async function boot() {
    const me = await getMeOptional();
    showApp();          // ✅ always show editor
    startApp(me);       // me may be null
  })();

  // ---------------------------
  // APP (runs for everyone; export gated)
  // ---------------------------
  function startApp(me) {
    const qs = (id) => document.getElementById(id);

    // NOTE: state.ui.template added
    const state = { data: {}, sections: {}, ui: { lang: "en", template: "" } };

    // ---- i18n from external file ----
    const CVI = window.CV_I18N || {};
    const LANGS = CVI.LANGS || [{ code: "en", name: "English" }];
    const t = (key) => (CVI.t ? CVI.t(state.ui.lang || "en", key) : key);

    const preview = qs("preview");
    const printBtn = qs("printBtn");
    const downloadPdfBtn = qs("downloadPdfBtn");
    const downloadHtmlBtn = qs("downloadHtmlBtn");

    // Template UI hooks
    const templateSelect = qs("templateSelect");
    const templateCssLink = qs("templateCss");

    // ---------------------------
    // ✅ Paywall on export (Payhip NEW TAB) + pending export
    // ---------------------------
    const PAYHIP_URL = "https://payhip.com/b/AeoVP";
    const PENDING_EXPORT_KEY = "pending_export_kind";

    function setPendingExport(kind) {
      try {
        localStorage.setItem(PENDING_EXPORT_KEY, String(kind || ""));
      } catch {}
    }

    function getPendingExport() {
      try {
        return localStorage.getItem(PENDING_EXPORT_KEY);
      } catch {
        return null;
      }
    }

    function clearPendingExport() {
      try {
        localStorage.removeItem(PENDING_EXPORT_KEY);
      } catch {}
    }

    function openPayhipNewTab() {
      const w = window.open(PAYHIP_URL, "_blank", "noopener,noreferrer");
      if (!w) window.location.href = PAYHIP_URL; // popup-blocker fallback
    }

    function requirePaidForExport(kind) {
      // not logged in -> login first
      if (!me?.ok) {
        setPendingExport(kind);
        window.location.href = "/login.html";
        return false;
      }

      // logged in but no access -> payhip in new tab
      if (!me?.has_access) {
        setPendingExport(kind);
        openPayhipNewTab();
        alert("Checkout opened in a new tab. After purchase, come back here and export again (or refresh).");
        return false;
      }

      // paid
      return true;
    }

    const FIELD_IDS = [
      "name",
      "title",
      "email",
      "phone",
      "location",
      "linkedin",
      "summary",
      "clinicalSkills",
      "coreCompetencies",
      "languages",
      "achievements",
      "custom1",
      "custom2",
    ];

    const SECTION_KEYS = [
      "summary",
      "education",
      "licenses",
      "clinicalSkills",
      "coreCompetencies",
      "languages",
      "experience",
      "achievements",
      "volunteer",
      "custom1",
      "custom2",
    ];

    const CONTACT_SHOW_IDS = [
      "show_title",
      "show_email",
      "show_phone",
      "show_location",
      "show_linkedin",
    ];

    function getTemplateDefaults(lang) {
      return (
        window.CV_DEFAULTS?.[lang] ||
        window.CV_DEFAULTS?.en ||
        window.TEMPLATES?.[lang] ||
        window.TEMPLATES?.en ||
        window.DEFAULT_TEMPLATE ||
        {}
      );
    }

    // ---------------------------
    // Templates (manifest + entitlements)
    // ---------------------------
    function getManifestTemplates() {
      const arr = window.CV_TEMPLATES;
      return Array.isArray(arr) ? arr : [];
    }

    function normalizeId(x) {
      return String(x || "").trim().toLowerCase();
    }

    function getAllowedTemplateIdsFromMe() {
      const ids = Array.isArray(me?.templates) ? me.templates : [];
      return ids.map(normalizeId).filter(Boolean);
    }

    function computeAllowedTemplates() {
      const manifest = getManifestTemplates();

      // ✅ NEW: anonymous users get "free" templates (fallback: first template)
      if (!me?.ok) {
        const free = manifest.filter((tpl) => tpl && (tpl.free === true || tpl.tier === "free"));
        if (free.length) return free;
        return manifest.length ? [manifest[0]] : [];
      }

      const allowedIds = new Set(getAllowedTemplateIdsFromMe());

      // If backend doesn't send templates list, fallback to "all"
      if (allowedIds.size === 0) return manifest;

      return manifest.filter((tpl) => allowedIds.has(normalizeId(tpl.id)));
    }

    function pickDefaultTemplateId(allowedTemplates) {
      // Prefer manifest default, else first
      const byDefault = allowedTemplates.find((t0) => !!t0.default);
      return normalizeId(byDefault?.id || allowedTemplates[0]?.id || "");
    }

    function getTemplateById(allowedTemplates, id) {
      const tid = normalizeId(id);
      return allowedTemplates.find((t0) => normalizeId(t0.id) === tid) || null;
    }

    function setTemplateCssHref(cssPath) {
      if (!templateCssLink) return;
      templateCssLink.href = cssPath ? `${cssPath}?v=1` : "";
    }

    function removeExistingTemplateRenderScript() {
      const old = document.getElementById("templateRenderScript");
      if (old) old.remove();
    }

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.id = "templateRenderScript";
        s.src = src.includes("?") ? src : `${src}?v=1`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Failed to load " + src));
        document.head.appendChild(s);
      });
    }

    async function loadTemplateAssets(tpl) {
      if (!tpl) return;

      // 1) CSS
      setTemplateCssHref(tpl.css || "");

      // 2) Render JS (defines window.renderCV)
      removeExistingTemplateRenderScript();

      // Clear old renderer
      try {
        delete window.renderCV;
      } catch (_) {
        window.renderCV = undefined;
      }

      if (tpl.render) {
        await loadScript(tpl.render);
      }
    }

    function fillTemplateSelect(allowedTemplates) {
      if (!templateSelect) return;

      templateSelect.innerHTML = "";
      allowedTemplates.forEach((tpl) => {
        const opt = document.createElement("option");
        opt.value = normalizeId(tpl.id);
        opt.textContent = String(tpl.name || tpl.id);
        templateSelect.appendChild(opt);
      });

      // UX: hide selector if only one template
      if (allowedTemplates.length <= 1) {
        templateSelect.style.display = "none";
      } else {
        templateSelect.style.display = "";
      }
    }

    // ---------------------------
    // Render
    // ---------------------------
    function render() {
      if (!preview || typeof window.renderCV !== "function") return;

      const lang = state.ui.lang || "en";
      const defaults = getTemplateDefaults(lang);
      const merged = { ...(defaults || {}), ...(state.data || {}) };

      preview.innerHTML = window.renderCV({
        ...merged,
        sections: state.sections,
        lang,
      });
    }

    // ---------------------------
    // Storage
    // ---------------------------
    const STORAGE_KEY = "cv_builder_user_overrides_structured_v4"; // includes template in ui

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
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ data: state.data, sections: state.sections, ui: state.ui })
        );
      } catch (_) {}
    }

    function ensureContactSection() {
      if (!state.sections.contact) state.sections.contact = {};
      CONTACT_SHOW_IDS.forEach((k) => {
        if (state.sections.contact[k] == null) state.sections.contact[k] = true;
      });
    }

    // ✅ init sections + default OFF only if no saved choice yet
    function initSectionsFromUI() {
      const defaultOff = new Set(["coreCompetencies", "achievements", "volunteer"]);

      SECTION_KEYS.forEach((k) => {
        if (!state.sections[k]) state.sections[k] = {};

        const en = qs(`sec_${k}_enabled`);
        const ti = qs(`sec_${k}_title`);

        if (en) {
          if (state.sections[k].enabled == null) {
            state.sections[k].enabled = defaultOff.has(k) ? false : !!en.checked;
          }
          en.checked = !!state.sections[k].enabled;
        }

        if (ti) {
          if (state.sections[k].title != null) ti.value = state.sections[k].title;
          else ti.value = ti.value || "";
        }
      });

      ensureContactSection();
      CONTACT_SHOW_IDS.forEach((id) => {
        const el = qs(id);
        if (!el) return;

        if (state.sections.contact[id] == null) {
          state.sections.contact[id] = !!el.checked;
        }
        el.checked = state.sections.contact[id] !== false;
      });
    }

    function syncUIFromState() {
      FIELD_IDS.forEach((id) => {
        const el = qs(id);
        if (!el) return;
        const val = state.data[id];
        el.value = val != null ? String(val) : "";
      });

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

      ensureContactSection();
      CONTACT_SHOW_IDS.forEach((id) => {
        const el = qs(id);
        if (!el) return;

        el.checked = state.sections.contact[id] !== false;

        el.addEventListener("change", () => {
          ensureContactSection();
          state.sections.contact[id] = !!el.checked;
          saveState();
          render();
        });
      });
    }

    // ---------- Toolbar helpers ----------
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
      const tval = String(value || "").trim();
      if (tval === "") delete state.data[fieldKey];
      else state.data[fieldKey] = value;
    }

    // ---- Education
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
          <div class="muted small">${t("edu.blockTitle")} ${idx + 1}</div>
          <button class="btn ghost" type="button" data-edu-remove="${idx}" style="padding:6px 10px;">${t("common.remove")}</button>
        </div>

        <label class="label">${t("edu.degree")}</label>
        <textarea class="textarea" rows="2" data-edu-degree="${idx}"></textarea>

        <label class="label">${t("edu.school")}</label>
        <textarea class="textarea" rows="2" data-edu-school="${idx}"></textarea>

        <label class="label">${t("edu.dates")}</label>
        <textarea class="textarea" rows="1" data-edu-date="${idx}"></textarea>

        <label class="label">${t("edu.honors")}</label>
        <textarea class="textarea" rows="2" data-edu-honors="${idx}"></textarea>
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

    // ---- Licenses
    function licToText(items) {
      const lines = [];
      (items || []).forEach((it) => {
        const t1 = (it.title || "").trim();
        const d = (it.detail || "").trim();
        if (!t1 && !d) return;
        if (t1) lines.push(t1);
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
          <div class="muted small">${t("lic.blockTitle")} ${idx + 1}</div>
          <button class="btn ghost" type="button" data-lic-remove="${idx}" style="padding:6px 10px;">${t("common.remove")}</button>
        </div>

        <label class="label">${t("lic.title")}</label>
        <textarea class="textarea" rows="2" data-lic-title="${idx}"></textarea>

        <label class="label">${t("lic.detail")}</label>
        <textarea class="textarea" rows="2" data-lic-detail="${idx}"></textarea>
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

    // ---- Experience
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
          <div class="muted small">${t("exp.blockTitle")} ${idx + 1}</div>
          <button class="btn ghost" type="button" data-exp-remove="${idx}" style="padding:6px 10px;">${t("common.remove")}</button>
        </div>

        <label class="label">${t("exp.role")}</label>
        <textarea class="textarea" rows="2" data-exp-title="${idx}"></textarea>

        <label class="label">${t("exp.meta")}</label>
        <textarea class="textarea" rows="2" data-exp-meta="${idx}"></textarea>

        <div class="toolbar" data-exp-toolbar="${idx}">
          <button class="tbtn" data-action="bold" type="button"><b>B</b></button>
          <button class="tbtn tdot" data-action="bullets" type="button" title="Toggle bullets"></button>
        </div>

        <textarea class="textarea" rows="5" data-exp-bullets="${idx}"></textarea>
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

    // ---- Volunteer
    function normalizeVolunteerBlock(v) {
      const out = { title: "", date: "", sub: "", bullets: [] };
      const header = String(v?.header ?? v?.title ?? "").trim();
      const date = String(v?.date ?? "").trim();

      if (header && !date) {
        const m = header.match(/^(.+?)\s*\|\s*(.+)$/);
        if (m) {
          out.title = m[1].trim();
          out.date = m[2].trim();
        } else {
          out.title = header;
        }
      } else {
        out.title = header;
        out.date = date;
      }

      out.sub = String(v?.sub ?? "").trim();
      out.bullets = Array.isArray(v?.bullets) ? v.bullets : [];
      return out;
    }

    function volToText(vols) {
      return (vols || [])
        .map((v0) => {
          const v = normalizeVolunteerBlock(v0);
          const title = (v.title || "").trim();
          const date = (v.date || "").trim();
          const sub = (v.sub || "").trim();
          const bullets = (v.bullets || []).map((x) => String(x || "").trim()).filter(Boolean);

          const firstLine = [title, date].filter(Boolean).join(" | ");
          return [firstLine, sub, ...bullets].filter(Boolean).join("\n");
        })
        .filter((x) => x.trim().length > 0)
        .join("\n\n");
    }

    function syncVolunteer() {
      ensureArray("volunteerBlocks", 3, () => ({ title: "", date: "", sub: "", bullets: [] }));
      state.data.volunteerBlocks = (state.data.volunteerBlocks || []).map(normalizeVolunteerBlock);

      const txt = volToText(state.data.volunteerBlocks);
      if (volHidden) volHidden.value = txt;
      setOverrideField("volunteer", txt);
    }

    function renderVolunteer() {
      if (!volRoot) return;

      ensureArray("volunteerBlocks", 3, () => ({ title: "", date: "", sub: "", bullets: [] }));
      state.data.volunteerBlocks = (state.data.volunteerBlocks || []).map(normalizeVolunteerBlock);

      volRoot.innerHTML = "";

      state.data.volunteerBlocks.forEach((v0, idx) => {
        const v = normalizeVolunteerBlock(v0);

        const wrap = document.createElement("div");
        wrap.className = "subcard";
        wrap.innerHTML = `
        <div class="row" style="justify-content:space-between; align-items:center; margin-top:0;">
          <div class="muted small">${t("vol.blockTitle")} ${idx + 1}</div>
          <button class="btn ghost" type="button" data-vol-remove="${idx}" style="padding:6px 10px;">${t("common.remove")}</button>
        </div>

        <label class="label">${t("vol.title")}</label>
        <textarea class="textarea" rows="2" data-vol-title="${idx}"></textarea>

        <label class="label">${t("vol.date")}</label>
        <textarea class="textarea" rows="1" data-vol-date="${idx}"></textarea>

        <label class="label">${t("vol.sub")}</label>
        <textarea class="textarea" rows="2" data-vol-sub="${idx}"></textarea>

        <div class="toolbar" data-vol-toolbar="${idx}">
          <button class="tbtn" data-action="bold" type="button"><b>B</b></button>
          <button class="tbtn tdot" data-action="bullets" type="button" title="Toggle bullets"></button>
        </div>

        <textarea class="textarea" rows="4" data-vol-bullets="${idx}"></textarea>
      `;
        volRoot.appendChild(wrap);

        const titleEl = wrap.querySelector(`[data-vol-title="${idx}"]`);
        const dateEl = wrap.querySelector(`[data-vol-date="${idx}"]`);
        const subEl = wrap.querySelector(`[data-vol-sub="${idx}"]`);
        const bulletsEl = wrap.querySelector(`[data-vol-bullets="${idx}"]`);

        titleEl.value = v.title || "";
        dateEl.value = v.date || "";
        subEl.value = v.sub || "";
        bulletsEl.value = (v.bullets || []).join("\n");

        const parseBullets = () =>
          String(bulletsEl.value || "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);

        const update = () => {
          state.data.volunteerBlocks[idx] = normalizeVolunteerBlock({
            title: titleEl.value,
            date: dateEl.value,
            sub: subEl.value,
            bullets: parseBullets(),
          });

          syncVolunteer();
          saveState();
          render();
        };

        titleEl.addEventListener("input", update);
        dateEl.addEventListener("input", update);
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
        ensureArray("volunteerBlocks", 3, () => ({ title: "", date: "", sub: "", bullets: [] }));
        state.data.volunteerBlocks.push({ title: "", date: "", sub: "", bullets: [] });
        syncVolunteer();
        saveState();
        renderVolunteer();
        render();
      });
    }

    // ---------------------------
    // Export helpers (PDF/print) ✅ popup-safe via hidden iframe
    // Includes current template CSS
    // ---------------------------
    async function exportToPrintIframe({ autoPrint = true } = {}) {
      const cssText = await fetch("/styles.css", { cache: "no-store" }).then((r) => r.text());

      const allowedTemplates = computeAllowedTemplates();
      const tpl = getTemplateById(allowedTemplates, state.ui.template) || allowedTemplates[0] || null;
      const templateCssText = tpl?.css
        ? await fetch(tpl.css, { cache: "no-store" }).then((r) => r.text())
        : "";

      const cvHtml = preview ? preview.innerHTML : "";

      const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Source+Sans+3:wght@300;400;600&display=swap" rel="stylesheet">

  <style>${cssText}\n\n${templateCssText}</style>

  <style>
    @page { size: A4; margin: 0; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    body { display:block !important; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
  ${cvHtml}
</body>
</html>`;

      const old = document.getElementById("printFrame");
      if (old) old.remove();

      const iframe = document.createElement("iframe");
      iframe.id = "printFrame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.setAttribute("aria-hidden", "true");
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) return;

      doc.open();
      doc.write(html);
      doc.close();

      const waitForIframeReady = async () => {
        try {
          const w = iframe.contentWindow;
          const d = iframe.contentDocument;

          if (d?.fonts?.ready) await d.fonts.ready;

          const imgs = Array.from(d?.images || []);
          await Promise.all(
            imgs.map(
              (img) =>
                new Promise((res) => {
                  if (img.complete) return res();
                  img.addEventListener("load", res, { once: true });
                  img.addEventListener("error", res, { once: true });
                })
            )
          );

          await new Promise((r) => setTimeout(r, 250));
          if (d && d.body) void d.body.offsetHeight;
          await new Promise((r) => setTimeout(r, 150));
          return w;
        } catch {
          return iframe.contentWindow;
        }
      };

      iframe.onload = async () => {
        if (!autoPrint) return;

        const w = await waitForIframeReady();
        await new Promise((r) => requestAnimationFrame(r));

        try {
          w?.focus();
          w?.print();
        } catch (e) {
          console.error("Print failed:", e);
        }
      };
    }

    // ✅ HTML export as function (so we can auto-run pending export)
    async function exportHtmlNow() {
      const cssText = await fetch("/styles.css", { cache: "no-store" }).then((r) => r.text());

      const allowedTemplates = computeAllowedTemplates();
      const tpl = getTemplateById(allowedTemplates, state.ui.template) || allowedTemplates[0] || null;
      const templateCssText = tpl?.css
        ? await fetch(tpl.css, { cache: "no-store" }).then((r) => r.text())
        : "";

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>CV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600&family=Source+Sans+3:wght@300;400;600&display=swap" rel="stylesheet">
  <style>${cssText}\n\n${templateCssText}</style>
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
    }

    // ✅ PDF button = open print dialog (user selects "Save as PDF") — gated
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener("click", async () => {
        if (!requirePaidForExport("pdf")) return;
        try {
          await exportToPrintIframe({ autoPrint: true });
        } catch (err) {
          console.error("PDF/Print failed:", err);
          alert("PDF/Print failed. Check console.");
        }
      });
    }

    // ✅ HTML export — gated
    if (downloadHtmlBtn) {
      downloadHtmlBtn.addEventListener("click", async () => {
        if (!requirePaidForExport("html")) return;
        try {
          await exportHtmlNow();
        } catch (err) {
          console.error("Export failed:", err);
          alert("Export failed. Check console.");
        }
      });
    }

    // keep print button handling (if you still use it somewhere)
    if (printBtn) {
      const clone = printBtn.cloneNode(true);
      printBtn.parentNode?.replaceChild(clone, printBtn);
    }

    // ---------------------------
    // Layout controls: hide + fullscreen + resizers
    // ---------------------------
    const grid = qs("grid3");

    function setGridColumns(cols) {
      if (!grid) return;
      grid.style.gridTemplateColumns = cols;
      try {
        localStorage.setItem("cv_grid_cols_v1", cols);
      } catch {}
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
      if (v.editor && v.preview && !v.ai) {
        setGridColumns("1.25fr 10px 1fr");
        return;
      }
      if (v.editor && !v.preview && v.ai) {
        setGridColumns("1.25fr 10px 1fr");
        return;
      }
      if (!v.editor && v.preview && v.ai) {
        setGridColumns("1fr 10px 0.85fr");
        return;
      }
      setGridColumns("1fr");
    }

    function setupPanelButtons() {
      const showPanelsBtn = qs("showPanelsBtn");

      function setBodyLocked(on) {
        document.body.style.overflow = on ? "hidden" : "";
      }

      function closeAnyFullscreen() {
        document.querySelectorAll(".panel.is-fullscreen").forEach((p) => p.classList.remove("is-fullscreen"));
        document.querySelectorAll(".fullscreen-backdrop").forEach((b) => b.remove());
        setBodyLocked(false);
      }

      function openFullscreen(panel) {
        closeAnyFullscreen();
        const bd = document.createElement("div");
        bd.className = "fullscreen-backdrop";
        bd.addEventListener("click", closeAnyFullscreen);
        document.body.appendChild(bd);

        panel.classList.add("is-fullscreen");
        setBodyLocked(true);
      }

      document.querySelectorAll('[data-action="hide"]').forEach((btn) => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-target");
          const panel = qs(`panel-${target}`);
          if (!panel) return;

          if (panel.classList.contains("is-fullscreen")) closeAnyFullscreen();

          panel.classList.toggle("is-hidden");
          normalizeGridForVisibility();
        });
      });

      document.querySelectorAll('[data-action="fullscreen"]').forEach((btn) => {
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
        if (e.key === "Escape") closeAnyFullscreen();
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
          const afterEditorPx = x - total * (editorPct / 100);
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

        if (previewPct < minPct) {
          previewPct = minPct;
          aiPct = remaining - previewPct;
        }
        if (aiPct < minPct) {
          aiPct = minPct;
          previewPct = remaining - aiPct;
        }

        setGridColumns(`${editorPct}fr 10px ${previewPct}fr 10px ${aiPct}fr`);
      };

      resizer.addEventListener("mousedown", startDrag);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", stopDrag);
    }

    // ---------------------------
    // i18n apply
    // ---------------------------
    function applyI18n() {
      document.querySelectorAll("[data-i18n]").forEach((el) => {
        const key = el.getAttribute("data-i18n");
        if (!key) return;
        el.textContent = t(key);
      });

      document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.setAttribute("placeholder", t(key));
      });

      document.querySelectorAll("[data-i18n-title]").forEach((el) => {
        const key = el.getAttribute("data-i18n-title");
        if (!key) return;
        el.setAttribute("title", t(key));
      });

      document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
        const key = el.getAttribute("data-i18n-aria");
        if (!key) return;
        el.setAttribute("aria-label", t(key));
      });

      const pill = qs("langPill");
      const current = LANGS.find((x) => x.code === (state.ui.lang || "en"));
      if (pill) pill.textContent = current ? current.name : "English";
    }

    function applyDefaultSectionTitlesForLanguage(lang) {
      const L = lang || state.ui.lang || "en";
      const CVI2 = window.CV_I18N || {};
      const defs =
        (CVI2.SECTION_DEFAULTS && (CVI2.SECTION_DEFAULTS[L] || CVI2.SECTION_DEFAULTS.en)) || null;
      if (!defs) return;

      if (!state.sections) state.sections = {};

      Object.keys(defs).forEach((key) => {
        if (!state.sections[key]) state.sections[key] = {};

        const current = state.sections[key].title;

        if (!current || !String(current).trim()) {
          state.sections[key].title = defs[key];
          return;
        }

        if (L === "en") {
          const cur = String(current).trim().toLowerCase();
          if (key === "clinicalSkills" && cur === "clinical skills") {
            state.sections[key].title = defs[key];
          }
          if (key === "achievements" && cur === "clinical achievements") {
            state.sections[key].title = defs[key];
          }
        }
      });

      saveState();
      syncUIFromState();
      render();
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
        const items = LANGS.filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q));

        list.innerHTML = items
          .map((l) => {
            const active = l.code === state.ui.lang ? "active" : "";
            return `<div class="lang-item ${active}" data-lang="${l.code}">
          <div>${l.name}</div>
          <div class="code">${l.code}</div>
        </div>`;
          })
          .join("");

        list.querySelectorAll("[data-lang]").forEach((row) => {
          row.addEventListener("click", () => {
            const code = row.getAttribute("data-lang");
            if (!code) return;

            state.ui.lang = code;
            saveState();

            applyI18n();
            applyDefaultSectionTitlesForLanguage(code);

            renderEducation();
            renderLicenses();
            renderExperience();
            renderVolunteer();

            render();
            hide();
          });
        });
      }

      if (btn) btn.addEventListener("click", open);
      if (close) close.addEventListener("click", hide);
      if (cancel) cancel.addEventListener("click", hide);
      if (modal)
        modal.addEventListener("click", (e) => {
          if (e.target === modal) hide();
        });
      if (search) search.addEventListener("input", () => renderList(search.value));
    }

    // ---------------------------
    // AI Coach (unchanged)
    // ---------------------------
    const AI_HISTORY_KEY = "cv_builder_ai_history_v2";

    function loadAIHistory() {
      try {
        const raw = localStorage.getItem(AI_HISTORY_KEY);
        const arr = JSON.parse(raw || "[]");
        if (!Array.isArray(arr)) return [];
        return arr
          .filter((x) => x && (x.role === "user" || x.role === "assistant") && typeof x.content === "string")
          .slice(-20);
      } catch {
        return [];
      }
    }

    function saveAIHistory(hist) {
      try {
        localStorage.setItem(AI_HISTORY_KEY, JSON.stringify(hist.slice(-20)));
      } catch {}
    }

    let aiHistory = loadAIHistory();

    function escapeHtml(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function addMsg(role, title, text) {
      const chat = qs("aiChat");
      if (!chat) return;
      const div = document.createElement("div");
      div.className = `msg ${role}`;
      div.innerHTML = `
      <div class="msg-title">${escapeHtml(title)}</div>
      <div>${escapeHtml(text).replace(/\n/g, "<br>")}</div>
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
        <span>${escapeHtml(t("ai.thinking"))}</span>
      </div>
    `;
      chat.prepend(div);
      return div;
    }

    const ALLOWED_SET_PATHS = new Set([
      "data.name",
      "data.title",
      "data.email",
      "data.phone",
      "data.location",
      "data.linkedin",
      "data.summary",
      "data.education",
      "data.licenses",
      "data.clinicalSkills",
      "data.coreCompetencies",
      "data.languages",
      "data.experience",
      "data.achievements",
      "data.volunteer",
      "data.custom1",
      "data.custom2",

      "sections.summary.enabled",
      "sections.summary.title",
      "sections.education.enabled",
      "sections.education.title",
      "sections.licenses.enabled",
      "sections.licenses.title",
      "sections.clinicalSkills.enabled",
      "sections.clinicalSkills.title",
      "sections.coreCompetencies.enabled",
      "sections.coreCompetencies.title",
      "sections.languages.enabled",
      "sections.languages.title",
      "sections.experience.enabled",
      "sections.experience.title",
      "sections.achievements.enabled",
      "sections.achievements.title",
      "sections.volunteer.enabled",
      "sections.volunteer.title",
      "sections.custom1.enabled",
      "sections.custom1.title",
      "sections.custom2.enabled",
      "sections.custom2.title",

      "sections.contact.show_title",
      "sections.contact.show_email",
      "sections.contact.show_phone",
      "sections.contact.show_location",
      "sections.contact.show_linkedin",
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

      saveState();
      syncUIFromState();

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
      <div class="msg-title">${escapeHtml(t("ai.suggestionTitle"))}</div>
      <div>${escapeHtml(message).replace(/\n/g, "<br>")}</div>
      ${
        suggestions.length
          ? `<div class="sugg">
        <div class="muted small">${escapeHtml(t("ai.choose"))}</div>
        ${suggestions
          .map(
            (s, idx) => `
          <div class="sugg-item" data-sugg="${idx}">
            <div class="topic">${escapeHtml(s.topic || t("ai.suggestionTitle"))}</div>
            <div>${escapeHtml(String(s.preview || "")).replace(/\n/g, "<br>")}</div>
            <div class="sugg-buttons">
              <button class="btn" type="button" data-accept="${idx}">${escapeHtml(t("ai.accept"))}</button>
              <button class="btn ghost" type="button" data-reject="${idx}">${escapeHtml(t("ai.reject"))}</button>
            </div>
          </div>
        `
          )
          .join("")}
      </div>`
          : ``
      }
    `;
      chat.prepend(div);

      suggestions.forEach((s, idx) => {
        const accept = div.querySelector(`[data-accept="${idx}"]`);
        const reject = div.querySelector(`[data-reject="${idx}"]`);
        accept?.addEventListener("click", () => {
          const patches = Array.isArray(s.patches) ? s.patches : [];
          patches.forEach(applyChangePatch);
          accept.disabled = true;
          if (reject) reject.disabled = true;
          accept.textContent = t("ai.applied");
        });
        reject?.addEventListener("click", () => {
          if (accept) accept.disabled = true;
          reject.disabled = true;
          reject.textContent = t("ai.rejected");
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
            history: aiHistory,
          }),
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

        const fallback =
          uiLang === "no"
            ? "Beklager — noe gikk galt. Prøv igjen."
            : uiLang === "de"
            ? "Entschuldigung — etwas ist schiefgelaufen. Bitte erneut versuchen."
            : "Sorry — something went wrong. Please try again.";

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

        addMsg("user", t("ai.you"), text);
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
    // Template selector setup
    // ---------------------------
    async function setupTemplatesAndLoadInitial() {
      const allowedTemplates = computeAllowedTemplates();

      if (!allowedTemplates.length) {
        console.warn("No allowed templates for this user.");
        showLocked();
        return false;
      }

      fillTemplateSelect(allowedTemplates);

      const saved = normalizeId(state.ui.template);
      const savedOk = !!getTemplateById(allowedTemplates, saved);

      const initialId = savedOk ? saved : pickDefaultTemplateId(allowedTemplates);
      state.ui.template = initialId;
      saveState();

      if (templateSelect) templateSelect.value = initialId;

      const tpl = getTemplateById(allowedTemplates, initialId) || allowedTemplates[0];
      await loadTemplateAssets(tpl);

      if (templateSelect) {
        templateSelect.addEventListener("change", async () => {
          const nextId = normalizeId(templateSelect.value);
          const nextTpl = getTemplateById(allowedTemplates, nextId);
          if (!nextTpl) {
            templateSelect.value = state.ui.template;
            return;
          }

          state.ui.template = nextId;
          saveState();

          try {
            await loadTemplateAssets(nextTpl);
            render();
          } catch (e) {
            console.error(e);
            alert("Failed to load template assets. Check console.");
          }
        });
      }

      return true;
    }

    // ---------------------------
    // BOOT
    // ---------------------------
    loadState();
    initSectionsFromUI();
    syncUIFromState();
    bindSimpleInputs();
    bindSimpleToolbars();

    renderEducation();
    renderLicenses();
    renderExperience();
    renderVolunteer();

    // Panels / resizers
    setupPanelButtons();
    restoreGridColumns();
    normalizeGridForVisibility();
    setupResizer("resizer-1", false);
    setupResizer("resizer-2", true);

    // AI
    setupAIUI();

    // Language
    if (!state.ui.lang) state.ui.lang = "en";
    setupLanguageModal();
    applyI18n();
    applyDefaultSectionTitlesForLanguage(state.ui.lang || "en");

    // Templates: must load renderer BEFORE first render
    (async () => {
      const ok = await setupTemplatesAndLoadInitial();
      if (!ok) return;

      saveState();
      render();

      // ✅ auto-run pending export after login/payment
      const pending = getPendingExport();
      if (pending && me?.has_access) {
        clearPendingExport();
        try {
          await new Promise((r) => setTimeout(r, 150));
          if (pending === "pdf") await exportToPrintIframe({ autoPrint: true });
          if (pending === "html") await exportHtmlNow();
        } catch (e) {
          console.error("Auto-export failed:", e);
        }
      }
    })();
  }
})();
