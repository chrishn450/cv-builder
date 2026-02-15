// app.js
(function () {
  const qs = (id) => document.getElementById(id);

  const preview = qs("preview");
  const printBtn = qs("printBtn");
  const downloadHtmlBtn = qs("downloadHtmlBtn");

  const FIELD_IDS = [
    "name",
    "title",
    "email",
    "phone",
    "location",
    "linkedin",
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

  // Viktig: behold defaults, men bullets kan være med "- " eller "• " – preview stripper uansett.
  const DEFAULT_DATA = {
    name: "Sarah Johnson",
    title: "Registered Nurse · BSN, RN",
    phone: "(555) 123-4567",
    email: "sarah.johnson@email.com",
    location: "Austin, TX 78701",
    linkedin: "linkedin.com/in/sarahjohnsonrn",
    summary:
      "Compassionate and detail-oriented Registered Nurse with 7+ years of progressive experience in acute care, emergency, and critical care settings.",
    education:
      "Master of Science in Nursing\nThe University of Texas at Austin\n2016 – 2018\n\nBachelor of Science in Nursing\nThe University of Texas at Austin\n2012 – 2016\nMagna Cum Laude · GPA 3.85",
    licenses:
      "Registered Nurse (RN)\nTexas Board of Nursing · #TX-892341\nCCRN – Critical Care\nAACN · Expires March 2026",
    clinicalSkills:
      "Patient Assessment & Triage\nIV Therapy & Venipuncture\nWound Care & Dressing Changes",
    coreCompetencies: "Team Leadership & Mentoring\nCritical Thinking\nTime Management",
    languages: "English — Native\nSpanish — Conversational",
    experience:
      "Senior Registered Nurse – ICU\nSt. David's Medical Center, Austin, TX | January 2021 – Present\n- Provide direct care for 4–6 critically ill patients per shift\n- Maintain 98% patient satisfaction scores",
    achievements: "Spearheaded ICU sepsis screening protocol\nDeveloped new-hire orientation program",
    volunteer:
      "Volunteer Nurse | 2019 – Present\nAustin Free Clinic · Community Health Outreach\n- Provide free health screenings",
    custom1: "",
    custom2: "",
  };

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

  const state = { data: {}, sections: {} };

  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
    });
  }

  function loadState() {
    try {
      const raw = localStorage.getItem("cv_builder_state_v1");
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        state.data = parsed.data || {};
        state.sections = parsed.sections || {};
        return true;
      }
    } catch (_) {}
    return false;
  }

  function saveState() {
    try {
      localStorage.setItem(
        "cv_builder_state_v1",
        JSON.stringify({ data: state.data, sections: state.sections })
      );
    } catch (_) {}
  }

  function hydrateInputsFromState() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      el.value = state.data[id] != null ? String(state.data[id]) : "";
    });

    SECTION_KEYS.forEach((k) => {
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      if (en) en.checked = state.sections?.[k]?.enabled !== false;
      if (ti) ti.value = state.sections?.[k]?.title ?? ti.value;
    });
  }

  function ensureDefaultsIfEmpty() {
    FIELD_IDS.forEach((id) => {
      const cur = state.data[id];
      if (cur == null || String(cur).trim() === "") {
        state.data[id] = DEFAULT_DATA[id] ?? "";
      }
    });

    SECTION_KEYS.forEach((k) => {
      if (!state.sections[k]) state.sections[k] = {};
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);
      state.sections[k].enabled = en ? !!en.checked : true;
      state.sections[k].title = ti ? ti.value : k;
    });
  }

  function bindInputs() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      el.addEventListener("input", () => {
        state.data[id] = el.value;
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
        ti.addEventListener("input", () => {
          if (!state.sections[k]) state.sections[k] = {};
          state.sections[k].title = ti.value;
          saveState();
          render();
        });
      }
    });
  }

  // ---- Toolbar helpers ----
  function wrapSelectionWith(el, left, right) {
    const v = el.value || "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const before = v.slice(0, start);
    const sel = v.slice(start, end);
    const after = v.slice(end);

    el.value = before + left + sel + right + after;

    const newStart = start + left.length;
    const newEnd = end + left.length;
    el.setSelectionRange(newStart, newEnd);
  }

  // Bullet mode per textarea
  const bulletMode = {}; // fieldId -> boolean
  const BULLET = "• ";   // <-- samme "dot"-type som du vil ha

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

    const newPos = pos + insert.length;
    el.setSelectionRange(newPos, newPos);
  }

  function removeEmptyBulletLine(el) {
    const v = el.value || "";
    const pos = el.selectionStart ?? v.length;
    const lineStart = getLineStart(v, pos);

    const lineEndIdx = v.indexOf("\n", lineStart);
    const lineEnd = lineEndIdx === -1 ? v.length : lineEndIdx;
    const line = v.slice(lineStart, lineEnd);

    // Hvis linja er kun "• " eller "- " (evt spaces) -> fjern prefix
    if ((line.startsWith("• ") && line.trim() === "•") || (line.startsWith("- ") && line.trim() === "-")) {
      el.value = v.slice(0, lineStart) + v.slice(lineStart + 2);
      const newPos = Math.max(lineStart, pos - 2);
      el.setSelectionRange(newPos, newPos);
    }
  }

  function bindBulletEnter(el, fieldId) {
    el.addEventListener("keydown", (e) => {
      if (!bulletMode[fieldId]) return;

      if (e.key === "Enter") {
        e.preventDefault();
        insertBulletNewline(el);
        state.data[fieldId] = el.value;
        saveState();
        render();
        return;
      }

      if (e.key === "Backspace") {
        setTimeout(() => {
          removeEmptyBulletLine(el);
          state.data[fieldId] = el.value;
          saveState();
          render();
        }, 0);
      }
    });

    el.addEventListener("mouseup", () => {
      if (!bulletMode[fieldId]) return;
      setTimeout(() => {
        ensureBulletPrefixAtCurrentLine(el);
        state.data[fieldId] = el.value;
        saveState();
        render();
      }, 0);
    });

    el.addEventListener("keyup", (e) => {
      if (!bulletMode[fieldId]) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        setTimeout(() => {
          ensureBulletPrefixAtCurrentLine(el);
          state.data[fieldId] = el.value;
          saveState();
          render();
        }, 0);
      }
    });
  }

  function bindToolbars() {
    document.querySelectorAll(".toolbar").forEach((tb) => {
      const fieldId = tb.getAttribute("data-for");
      const target = qs(fieldId);
      if (!target) return;

      bulletMode[fieldId] = false;
      setBulletButtonState(tb, false);

      bindBulletEnter(target, fieldId);

      tb.querySelectorAll(".tbtn").forEach((btn) => {
        btn.addEventListener("click", () => {
          const action = btn.getAttribute("data-action");
          target.focus();

          if (action === "bold") {
            wrapSelectionWith(target, "**", "**");
            state.data[fieldId] = target.value;
            saveState();
            render();
            return;
          }

          if (action === "bullets") {
            bulletMode[fieldId] = !bulletMode[fieldId];
            setBulletButtonState(tb, bulletMode[fieldId]);

            // Nøkkelen: når du slår på, sett bullet med en gang
            if (bulletMode[fieldId]) {
              ensureBulletPrefixAtCurrentLine(target);
              state.data[fieldId] = target.value;
              saveState();
              render();
            }
            return;
          }
        });
      });
    });
  }

  if (printBtn) printBtn.addEventListener("click", () => window.print());

  if (downloadHtmlBtn) {
    downloadHtmlBtn.addEventListener("click", () => {
      const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>CV</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
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
    });
  }

  // INIT
  const app = qs("app");
  const locked = qs("locked");
  if (app) app.style.display = "block";
  if (locked) locked.style.display = "none";

  loadState();
  ensureDefaultsIfEmpty();
  hydrateInputsFromState();
  bindInputs();
  bindToolbars();
  saveState();
  render();
})();
