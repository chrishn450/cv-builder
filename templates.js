// templates.js – exposes window.renderCV(data) → HTML string
(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function fmtInline(text, { preserveNewlines = false } = {}) {
    const t = String(text ?? "");
    if (!t) return "";

    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    const html = parts
      .map((p) => {
        const m = p.match(/^\*\*([^*]+)\*\*$/);
        if (m) return `<strong>${esc(m[1])}</strong>`;
        return esc(p);
      })
      .join("");

    if (!preserveNewlines) return html;
    return html.replace(/\n/g, "<br>");
  }

  function hasText(v) {
    return v != null && String(v).trim().length > 0;
  }

  function lines(s) {
    if (!s) return [];
    return String(s)
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  function blocks(s) {
    if (!s) return [];
    return String(s)
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
  }

  // Merge wrapped lines into previous "bullet line" (only for DEFAULT text)
  function mergeWrappedLinesIntoBullets(rawLines) {
    const out = [];
    rawLines.forEach((ln) => {
      let line = String(ln || "").trim();
      if (!line) return;

      const m = line.match(/^([•\-·])\s+/);
      const isExplicitBullet = !!m;

      if (isExplicitBullet) {
        // ✅ fjern bullet-tegnet så du ikke får "dobbel bullet"
        line = line.replace(/^([•\-·])\s+/, "");
        out.push(line);
        return;
      }

      // ellers: treat som wrapped continuation
      if (out.length > 0) {
        out[out.length - 1] = (out[out.length - 1] + " " + line)
          .replace(/\s+/g, " ")
          .trim();
      } else {
        out.push(line);
      }
    });
    return out;
  }

  function parseExperience(s, { mergeWrapped = true } = {}) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const title = ls[0] || "";
      const meta = ls[1] || "";
      const rawBullets = ls.slice(2);
      const bullets = mergeWrapped ? mergeWrappedLinesIntoBullets(rawBullets) : rawBullets;
      return { title, meta, bullets };
    });
  }

  function parseEducation(s) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        degree: ls[0] || "",
        school: ls[1] || "",
        date: ls[2] || "",
        honors: ls.slice(3).join(" "),
      };
    });
  }

  function parseVolunteer(s, { presentWord = "Present", mergeWrapped = true } = {}) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);

      let volTitle = ls[0] || "";
      let volDate = "";

      // Support "Title | Date"
      const m = volTitle.match(/^(.+?)\s*\|\s*(.+)$/);
      if (m) {
        volTitle = m[1];
        volDate = m[2];
      }

      // Or "Title 2019 – Present"
      if (!volDate) {
        const pw = String(presentWord || "Present").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`^(.*?)(\\b\\d{4}\\s*–\\s*(?:${pw}|\\d{4})\\b)$`);
        const m2 = volTitle.match(re);
        if (m2) {
          volTitle = m2[1].trim();
          volDate = m2[2].trim();
        }
      }

      const volSub = ls[1] || "";
      const rawBullets = ls.slice(2);
      const volBullets = mergeWrapped ? mergeWrappedLinesIntoBullets(rawBullets) : rawBullets;

      return { volTitle, volDate, volSub, volBullets };
    });
  }

  // mode: "bullets" | "paragraph"
  function renderSimpleSection({ title, content, mode, boldFirstLine, autoDots }) {
    const items = lines(content);
    if (!items.length) return "";

    if (mode === "paragraph") {
      const ps = items
        .map((t, idx) => {
          const inner = fmtInline(t, { preserveNewlines: false });
          if (boldFirstLine && idx === 0) return `<p><strong>${inner}</strong></p>`;
          return `<p>${inner}</p>`;
        })
        .join("");

      return `
        <section>
          <h2 class="section-title">${esc(title)}</h2>
          <div class="lang-list">${ps}</div>
        </section>
      `;
    }

    const cls = autoDots ? "auto-dots" : "no-auto-dots";
    const lis = items
      .map((t, idx) => {
        const inner = fmtInline(t, { preserveNewlines: true });
        if (boldFirstLine && idx === 0) return `<li><strong>${inner}</strong></li>`;
        return `<li>${inner}</li>`;
      })
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <ul class="skill-list ${cls}" style="list-style:none; padding-left:0; margin:0;">${lis}</ul>
      </section>
    `;
  }

  function renderExperienceSection(title, experienceText, { mergeWrapped, autoDots } = {}) {
    const exps = parseExperience(experienceText, { mergeWrapped });
    if (!exps.length) return "";

    const cls = autoDots ? "auto-dots" : "no-auto-dots";

    const expHTML = exps
      .map((e) => {
        const bullets = (e.bullets || [])
          .map((b) => `<li>${fmtInline(b, { preserveNewlines: true })}</li>`)
          .join("");

        return `
          <div class="exp-entry">
            <h3>${fmtInline(e.title)}</h3>
            ${e.meta ? `<p class="meta">${fmtInline(e.meta, { preserveNewlines: true })}</p>` : ""}
            ${bullets ? `<ul class="exp-bullets ${cls}" style="list-style:none; padding-left:0; margin:0;">${bullets}</ul>` : ""}
          </div>
        `;
      })
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${expHTML}
      </section>
    `;
  }

  function renderEducationSection(title, educationText) {
    const edu = parseEducation(educationText);
    if (!edu.length) return "";

    const eduHTML = edu
      .map(
        (e) => `
          <div class="edu-block">
            <h3>${fmtInline(e.degree)}</h3>
            ${e.school ? `<p>${fmtInline(e.school)}</p>` : ""}
            ${e.date ? `<p class="date">${fmtInline(e.date)}</p>` : ""}
            ${e.honors ? `<p class="honors">${fmtInline(e.honors)}</p>` : ""}
          </div>
        `
      )
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${eduHTML}
      </section>
    `;
  }

  function renderLicensesSection(title, licensesText) {
    const licLines = lines(licensesText);
    if (!licLines.length) return "";

    let licHTML = "";
    for (let j = 0; j < licLines.length; j += 2) {
      licHTML += `
        <div class="cert-item">
          <h3>${fmtInline(licLines[j] || "")}</h3>
          ${licLines[j + 1] ? `<p>${fmtInline(licLines[j + 1])}</p>` : ""}
        </div>
      `;
    }

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${licHTML}
      </section>
    `;
  }

  function renderVolunteerSection(title, volunteerText, { presentWord, mergeWrapped, autoDots } = {}) {
    const vols = parseVolunteer(volunteerText, { presentWord, mergeWrapped });
    if (!vols.length) return "";

    const cls = autoDots ? "auto-dots" : "no-auto-dots";

    const volHTML = vols
      .map((v) => {
        const bulletsHTML =
          v.volBullets && v.volBullets.length
            ? `<ul class="exp-bullets ${cls}" style="list-style:none; padding-left:0; margin:0;">
                 ${v.volBullets.map((b) => `<li>${fmtInline(b, { preserveNewlines: true })}</li>`).join("")}
               </ul>`
            : "";

        return `
          <div class="exp-entry">
            <div class="vol-header">
              <h3>${fmtInline(v.volTitle)}</h3>
              ${v.volDate ? `<span class="date">${fmtInline(v.volDate)}</span>` : ""}
            </div>
            ${v.volSub ? `<p class="vol-sub">${fmtInline(v.volSub)}</p>` : ""}
            ${bulletsHTML}
          </div>
        `;
      })
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${volHTML}
      </section>
    `;
  }

  window.renderCV = function renderCV(data) {
    const raw = data || {};
    const lang = raw.lang || raw?.ui?.lang || "en";

    // i18n hooks
    const CVI = window.CV_I18N || {};
    const getDefaultTitle = (key) =>
      CVI.getSectionDefaultTitle ? CVI.getSectionDefaultTitle(lang, key) : key;

    const presentWordByLang = {
      en: "Present",
      no: "Nå",
      de: "Heute",
      fr: "Présent",
      es: "Actualidad",
    };
    const presentWord = presentWordByLang[lang] || "Present";

    const defaults = {
      name: "Sarah Johnson",
      title: "Registered Nurse · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",

      summary:
        "Compassionate and detail-oriented Registered Nurse with over 7 years of experience in acute care, emergency, and critical care settings. Proven ability to manage multiple high-acuity patients per shift while maintaining high standards of patient safety and care quality. Skilled in patient assessment, evidence-based care planning, and interdisciplinary collaboration. Dedicated to improving patient outcomes and contributing to efficient, high-performing healthcare teams in fast-paced hospital environments.",

      education:
        "Master of Science in Nursing\n" +
        "The University of Texas at Austin\n" +
        "2016 – 2018\n\n" +
        "Bachelor of Science in Nursing\n" +
        "The University of Texas at Austin\n" +
        "2012 – 2016\n" +
        "Magna Cum Laude · GPA 3.85",

      licenses:
        "Registered Nurse (RN)\n" +
        "Texas Board of Nursing · #TX-892341\n" +
        "CCRN – Critical Care\n" +
        "AACN · Expires March 2026\n" +
        "ACLS\n" +
        "American Heart Association · Exp. Aug 2026\n" +
        "BLS / CPR\n" +
        "American Heart Association · Exp. Aug 2026\n" +
        "TNCC\n" +
        "Emergency Nurses Association",

      clinicalSkills:
        "Patient Assessment & Triage\n" +
        "Critical Care Monitoring & Hemodynamic Assessment\n" +
        "IV Therapy & Venipuncture\n" +
        "Medication Administration & Dosage Calculation\n" +
        "Ventilator Management & Respiratory Support\n" +
        "Cardiac Monitoring (ECG Interpretation)\n" +
        "Electronic Health Records (Epic)\n" +
        "Care Plan Development & Patient Evaluation\n" +
        "Infection Control & Clinical Safety Protocols",

      coreCompetencies:
        "Team Leadership & Mentoring\n" +
        "Critical Thinking\n" +
        "Patient & Family Education\n" +
        "Time Management\n" +
        "Interdisciplinary Collaboration",

      languages: "English — Native\nSpanish — Conversational",

      experience:
        "SENIOR REGISTERED NURSE – ICU\n" +
        "St. David's Medical Center, Austin, TX | January 2021 – Present\n" +
        "• Provide direct care for 1–3 critically ill patients per shift in a 32-bed ICU, including post-surgical, cardiac, and respiratory cases\n" +
        "• Monitor ventilated patients and manage advanced life-support equipment, including arterial lines and central venous catheters\n" +
        "• Mentor and precept new graduate nurses on unit protocols, documentation standards, and clinical best practices\n" +
        "• Collaborate with multidisciplinary teams including physicians, pharmacists, and respiratory therapists to develop and implement individualized care plans\n" +
        "• Ensure accurate and timely documentation using Epic EHR while maintaining high standards of patient safety and care quality\n\n" +
        "REGISTERED NURSE – EMERGENCY DEPARTMENT\n" +
        "Seton Medical Center, Austin, TX | June 2018 – December 2020\n" +
        "• Triaged and assessed high-acuity patients in a fast-paced Level I trauma center with over 85,000 annual visits\n" +
        "• Administered medications, IV therapy, and emergency interventions in accordance with hospital safety protocols\n" +
        "• Recognized for strong clinical performance, teamwork, and patient-centered care\n" +
        "• Maintained accurate real-time documentation using Epic EHR system\n\n" +
        "STAFF NURSE – MEDICAL-SURGICAL UNIT\n" +
        "Dell Children's Medical Center, Austin, TX | August 2016 – May 2018\n" +
        "• Provided direct patient care in a pediatric medical-surgical unit, including medication administration and clinical monitoring\n" +
        "• Monitored vital signs, laboratory results, and patient responses to treatment\n" +
        "• Educated patients and families on discharge instructions, medications, and follow-up care",

      achievements:
        "Spearheaded ICU sepsis screening protocol resulting in 22% faster identification and 15% reduction in mortality\n" +
        "Developed new-hire orientation program adopted hospital-wide, reducing onboarding time by 3 weeks\n" +
        "Published research on nurse-led ventilator weaning protocols in the Journal of Critical Care Nursing (2022)\n" +
        "Awarded Daisy Award for Extraordinary Nurses (2021) — nominated by patients and families",

      volunteer:
        "Volunteer Nurse 2019 – Present\n" +
        "Austin Free Clinic · Community Health Outreach\n" +
        "Provide free health screenings and vaccinations to 200+ underserved community members annually",

      custom1: "",
      custom2: "",
    };

    // Track which fields are default vs user-provided
    const isDefault = {};
    const d = {};
    for (const k in defaults) {
      const userHas = hasText(raw[k]);
      d[k] = userHas ? raw[k] : defaults[k];
      isDefault[k] = !userHas;
    }

    const defaultSections = {
      summary: { enabled: true, title: getDefaultTitle("summary") },
      education: { enabled: true, title: getDefaultTitle("education") },
      licenses: { enabled: true, title: getDefaultTitle("licenses") },
      clinicalSkills: {
        enabled: true,
        title: getDefaultTitle("clinicalSkills"),
        mode: "bullets",
        boldFirstLine: false,
      },

      // ✅ ENDRET (var true)
      coreCompetencies: {
        enabled: false,
        title: getDefaultTitle("coreCompetencies"),
        mode: "bullets",
        boldFirstLine: false,
      },

      languages: {
        enabled: true,
        title: getDefaultTitle("languages"),
        mode: "paragraph",
        boldFirstLine: false,
      },
      experience: { enabled: true, title: getDefaultTitle("experience") },

      // ✅ ENDRET (var true)
      achievements: {
        enabled: false,
        title: getDefaultTitle("achievements"),
        mode: "bullets",
        boldFirstLine: false,
      },

      // ✅ ENDRET (var true)
      volunteer: { enabled: false, title: getDefaultTitle("volunteer") },

      custom1: {
        enabled: false,
        title: getDefaultTitle("custom1"),
        mode: "bullets",
        boldFirstLine: false,
        column: "right",
      },
      custom2: {
        enabled: false,
        title: getDefaultTitle("custom2"),
        mode: "bullets",
        boldFirstLine: false,
        column: "right",
      },

      contact: {
        show_title: true,
        show_email: true,
        show_phone: true,
        show_location: true,
        show_linkedin: true,
      },
    };

    const sections = { ...defaultSections, ...(raw.sections || {}) };

    const sectionTitle = (key, fallbackKeyForCustom) => {
      const t0 = sections?.[key]?.title;
      if (t0 && String(t0).trim()) return String(t0).trim();
      return getDefaultTitle(fallbackKeyForCustom || key);
    };

    const contactCfg = sections.contact || defaultSections.contact;

    const ICONS = {
      phone: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6.6 10.8c1.6 3.2 4.4 6 7.6 7.6l2.5-2.5c.3-.3.8-.4 1.2-.2 1 .3 2.1.5 3.2.5.7 0 1.2.5 1.2 1.2V21c0 .7-.5 1.2-1.2 1.2C10.4 22.2 1.8 13.6 1.8 3c0-.7.5-1.2 1.2-1.2h3.7c.7 0 1.2.5 1.2 1.2 0 1.1.2 2.2.5 3.2.1.4 0 .9-.3 1.2l-2.5 2.4z"/></svg>`,
      email: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
      location: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c-3.9 0-7 3.1-7 7 0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5 14.5 7.6 14.5 9 13.4 11.5 12 11.5z"/></svg>`,
      linkedin: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0.5 8.5H4.5V23H0.5V8.5zM8.5 8.5H12.3V10.4h.1c.5-1 1.9-2.1 3.9-2.1 4.2 0 5 2.8 5 6.4V23h-4v-7.3c0-1.7 0-3.9-2.4-3.9-2.4 0-2.8 1.9-2.8 3.8V23h-4V8.5z"/></svg>`,
    };

    function contactChip(iconSvg, text) {
      return `<span class="citem">${iconSvg}<span>${fmtInline(text)}</span></span>`;
    }

    const contactParts = [];
    if (contactCfg.show_phone && d.phone) contactParts.push(contactChip(ICONS.phone, d.phone));
    if (contactCfg.show_email && d.email) contactParts.push(contactChip(ICONS.email, d.email));
    if (contactCfg.show_location && d.location) contactParts.push(contactChip(ICONS.location, d.location));
    if (contactCfg.show_linkedin && d.linkedin) contactParts.push(contactChip(ICONS.linkedin, d.linkedin));
    const contactHTML = contactParts.join("");

    const showTitle = contactCfg.show_title !== false;

    // ✅ Summary flyttes til høyre kolonne (som referansen)
    const summaryInRight = sections.summary?.enabled
      ? `
        <section>
          <h2 class="section-title">${esc(sectionTitle("summary"))}</h2>
          <p class="body-text">${fmtInline(d.summary, { preserveNewlines: true })}</p>
        </section>
      `
      : "";

    function renderCustom(key) {
      const cfg = sections[key];
      if (!cfg?.enabled) return "";
      return renderSimpleSection({
        title: cfg.title && String(cfg.title).trim() ? cfg.title : sectionTitle(key, "custom1"),
        content: d[key] || "",
        mode: cfg.mode || "bullets",
        boldFirstLine: !!cfg.boldFirstLine,
        autoDots: isDefault[key],
      });
    }

    const leftCustomHTML = ["custom1", "custom2"]
      .filter((k) => sections[k]?.enabled && (sections[k].column || "right") === "left")
      .map((k) => renderCustom(k))
      .join("");

    const rightCustomHTML = ["custom1", "custom2"]
      .filter((k) => sections[k]?.enabled && (sections[k].column || "right") === "right")
      .map((k) => renderCustom(k))
      .join("");

    const leftHTML = [
      sections.education?.enabled ? renderEducationSection(sectionTitle("education"), d.education) : "",
      sections.licenses?.enabled ? renderLicensesSection(sectionTitle("licenses"), d.licenses) : "",
      sections.clinicalSkills?.enabled
        ? renderSimpleSection({
            title: sectionTitle("clinicalSkills"),
            content: d.clinicalSkills,
            mode: sections.clinicalSkills.mode || "bullets",
            boldFirstLine: !!sections.clinicalSkills.boldFirstLine,
            autoDots: isDefault.clinicalSkills,
          })
        : "",
      sections.coreCompetencies?.enabled
        ? renderSimpleSection({
            title: sectionTitle("coreCompetencies"),
            content: d.coreCompetencies,
            mode: sections.coreCompetencies.mode || "bullets",
            boldFirstLine: !!sections.coreCompetencies.boldFirstLine,
            autoDots: isDefault.coreCompetencies,
          })
        : "",
      sections.languages?.enabled
        ? renderSimpleSection({
            title: sectionTitle("languages"),
            content: d.languages,
            mode: sections.languages.mode || "paragraph",
            boldFirstLine: !!sections.languages.boldFirstLine,
            autoDots: false,
          })
        : "",
      leftCustomHTML,
    ].join("");

    const rightHTML = [
      summaryInRight,
      sections.experience?.enabled
        ? renderExperienceSection(sectionTitle("experience"), d.experience, {
            mergeWrapped: isDefault.experience,
            autoDots: isDefault.experience,
          })
        : "",
      sections.achievements?.enabled
        ? renderSimpleSection({
            title: sectionTitle("achievements"),
            content: d.achievements,
            mode: sections.achievements.mode || "bullets",
            boldFirstLine: !!sections.achievements.boldFirstLine,
            autoDots: isDefault.achievements,
          })
        : "",
      sections.volunteer?.enabled
        ? renderVolunteerSection(sectionTitle("volunteer"), d.volunteer, {
            presentWord,
            mergeWrapped: isDefault.volunteer,
            autoDots: isDefault.volunteer,
          })
        : "",
      rightCustomHTML,
    ].join("");

    return `
      <div class="cv">
        <header class="cv-header">
          <h1 class="cv-name">${fmtInline(d.name)}</h1>
          ${showTitle ? `<p class="cv-title">${fmtInline(d.title)}</p>` : ""}
          <div class="cv-contact-wrap">
            <div class="cv-contact">${contactHTML}</div>
          </div>
        </header>

        <div class="cv-body">
          <div class="cv-left">${leftHTML}</div>
          <div class="cv-right">${rightHTML}</div>
        </div>
      </div>
    `;
  };
})();
