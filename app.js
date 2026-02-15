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

  // NB: Vi fyller IKKE inputs med defaults.
  // Preview blir full fra templates.js defaults når state.data har tomme felt.
  const state = { data: {}, sections: {} };

  function render() {
    if (!preview || typeof window.renderCV !== "function") return;
    preview.innerHTML = window.renderCV({
      ...state.data,
      sections: state.sections,
    });
  }

  // Lagre bare det brukeren faktisk har skrevet
  const STORAGE_KEY = "cv_builder_user_overrides_v1";

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
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ data: state.data, sections: state.sections })
      );
    } catch (_) {}
  }

  function initSectionsFromUI() {
    SECTION_KEYS.forEach((k) => {
      if (!state.sections[k]) state.sections[k] = {};
      const en = qs(`sec_${k}_enabled`);
      const ti = qs(`sec_${k}_title`);

      // bruk UI som kilde
      if (en) state.sections[k].enabled = !!en.checked;
      if (ti) state.sections[k].title = ti.value;
    });
  }

  function bindInputs() {
    FIELD_IDS.forEach((id) => {
      const el = qs(id);
      if (!el) return;

      // Hvis vi har lagret override, sett den inn – ellers la feltet være tomt
      if (state.data[id] != null && String(state.data[id]).length > 0) {
        el.value = String(state.data[id]);
      } else {
        el.value = ""; // behold grå placeholder
      }

      el.addEventListener("input", () => {
        // Brukerens tekst overstyrer defaults
        state.data[id] = el.value;

        // Hvis bruker sletter alt: fjern override så defaults kommer tilbake i preview
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
        // behold som i UI (du hadde disse ferdig utfylt allerede)
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

  // ---- Toolbar: bullet mode som setter "• " direkte (men preview stripper den) ----
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

  const bulletMode = {}; // fieldId -> boolean
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
        if (String(el.value).trim() === "") delete state.data[fieldId];

        saveState();
        render();
        return;
      }

      if (e.key === "Backspace") {
        setTimeout(() => {
          removeEmptyBulletLine(el);

          state.data[fieldId] = el.value;
          if (String(el.value).trim() === "") delete state.data[fieldId];

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
            if (String(target.value).trim() === "") delete state.data[fieldId];

            saveState();
            render();
            return;
          }

          if (action === "bullets") {
            bulletMode[fieldId] = !bulletMode[fieldId];
            setBulletButtonState(tb, bulletMode[fieldId]);

            if (bulletMode[fieldId]) {
              // Nøkkelen du manglet: sett bullet med en gang
              ensureBulletPrefixAtCurrentLine(target);

              state.data[fieldId] = target.value;
              if (String(target.value).trim() === "") delete state.data[fieldId];

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

  // INIT: vis app (hvis du ikke bruker auth-flow her)
  const app = qs("app");
  const locked = qs("locked");
  if (app) app.style.display = "block";
  if (locked) locked.style.display = "none";

  loadState();
  initSectionsFromUI();   // bruker checkbox/title i UI
  bindInputs();           // inputs forblir tomme hvis ingen override
  bindToolbars();

  // Preview FULL fra templates defaults
  render();
})();
