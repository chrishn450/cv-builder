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

  function blocks(s) {
    if (!s) return [];
    return String(s)
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter(Boolean);
  }

  function stripBulletPrefix(t) {
    const s = String(t ?? "").trim();
    return s.replace(/^([•\-·]\s+)/, "");
  }

  // Merge hard-wrapped lines so we DON'T create new bullets mid sentence.
  // Heuristic: if a line does not start with bullet prefix and previous exists -> append to previous.
  function mergeWrappedLines(linesArr) {
    const out = [];
    for (const raw of linesArr) {
      const line = String(raw || "").trim();
      if (!line) continue;

      const isBullet = /^([•\-·]\s+)/.test(line);

      if (!isBullet && out.length > 0) {
        out[out.length - 1] = (out[out.length - 1] + " " + line).trim();
      } else {
        out.push(line);
      }
    }
    return out;
  }

  function parseExperience(s) {
    return blocks(s).map((block) => {
      let ls = block.split("\n").map((l) => l.trim());
      ls = ls.filter(Boolean);

      const title = ls[0] || "";
      const meta = ls[1] || "";
      const rest = ls.slice(2);

      const merged = mergeWrappedLines(rest).map(stripBulletPrefix);
      return { title, meta, bullets: merged };
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

  function parseVolunteer(s) {
    return blocks(s).map((block) => {
      const lsRaw = block.split("\n").map((l) => l.trim()).filter(Boolean);

      let volTitle = lsRaw[0] || "";
      let volDate = "";

      // Support "Title | Date"
      const m = volTitle.match(/^(.+?)\s*\|\s*(.+)$/);
      if (m) {
        volTitle = m[1];
        volDate = m[2];
      }

      // Or "Title 2019 – Present"
      if (!volDate) {
        const m2 = volTitle.match(/^(.*?)(\b\d{4}\s*–\s*(?:Present|\d{4})\b)$/);
        if (m2) {
          volTitle = m2[1].trim();
          volDate = m2[2].trim();
        }
      }

      const volSub = lsRaw[1] || "";
      const rest = lsRaw.slice(2);
      const merged = mergeWrappedLines(rest).map(stripBulletPrefix);

      return { volTitle, volDate, volSub, volBullets: merged };
    });
  }

  function linesSmart(s) {
    if (!s) return [];
    const raw = String(s).split("\n").map((l) => l.trim());
    return mergeWrappedLines(raw).filter(Boolean);
  }

  // mode: "bullets" | "paragraph"
  function renderSimpleSection({ title, content, mode, boldFirstLine, ulClass }) {
    const items = linesSmart(content);
    if (!items.length) return "";

    if (mode === "paragraph") {
      const ps = items
        .map((t, idx) => {
          const inner = fmtInline(t);
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

    const lis = items
      .map((t, idx) => {
        const inner = fmtInline(stripBulletPrefix(t));
        if (boldFirstLine && idx === 0) return `<li><strong>${inner}</strong></li>`;
        return `<li>${inner}</li>`;
      })
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <ul class="${esc(ulClass || "skill-list")}">${lis}</ul>
      </section>
    `;
  }

  function renderExperienceSection(title, experienceText) {
    const exps = parseExperience(experienceText);
    if (!exps.length) return "";

    const expHTML = exps
      .map((e) => {
        const bullets = (e.bullets || [])
          .map((b) => `<li>${fmtInline(b)}</li>`)
          .join("");

        return `
          <div class="exp-entry">
            <h3>${fmtInline(e.title)}</h3>
            ${e.meta ? `<p class="meta">${fmtInline(e.meta)}</p>` : ""}
            ${bullets ? `<ul class="exp-bullets">${bullets}</ul>` : ""}
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
        </div>`
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
    const licLines = linesSmart(licensesText);
    if (!licLines.length) return "";

    let licHTML = "";
    for (let j = 0; j < licLines.length; j += 2) {
      licHTML += `
        <div class="cert-item">
          <h3>${fmtInline(licLines[j] || "")}</h3>
          ${licLines[j + 1] ? `<p>${fmtInline(licLines[j + 1])}</p>` : ""}
        </div>`;
    }

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${licHTML}
      </section>
    `;
  }

  function renderVolunteerSection(title, volunteerText) {
    const vols = parseVolunteer(volunteerText);
    if (!vols.length) return "";

    const volHTML = vols
      .map((v) => {
        const bulletsHTML = v.volBullets.length
          ? `<ul class="exp-bullets">${v.volBullets.map((b) => `<li>${fmtInline(b)}</li>`).join("")}</ul>`
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

  const I18N_SECTION_DEFAULTS = {
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
      summary: "Profesjonell Profil",
      education: "Utdanning",
      licenses: "Lisenser & Sertifiseringer",
      clinicalSkills: "Kliniske Ferdigheter",
      coreCompetencies: "Kjernekompetanse",
      languages: "Språk",
      experience: "Arbeidserfaring",
      achievements: "Resultater",
      volunteer: "Frivillig Erfaring",
      custom1: "Egendefinert Seksjon 1",
      custom2: "Egendefinert Seksjon 2",
    },
    de: {
      summary: "Berufsprofil",
      education: "Ausbildung",
      licenses: "Lizenzen & Zertifikate",
      clinicalSkills: "Klinische Fähigkeiten",
      coreCompetencies: "Kernkompetenzen",
      languages: "Sprachen",
      experience: "Berufserfahrung",
      achievements: "Erfolge",
      volunteer: "Ehrenamt",
      custom1: "Eigener Abschnitt 1",
      custom2: "Eigener Abschnitt 2",
    },
  };

  window.renderCV = function renderCV(data) {
    const raw = data || {};
    const uiLang = raw.uiLang || "en";
    const T = I18N_SECTION_DEFAULTS[uiLang] || I18N_SECTION_DEFAULTS.en;

    // FULL defaults (original-ish)
    const defaults = {
      name: "Sarah Johnson",
      title: "Registered Nurse · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",

      summary:
        "Compassionate and detail-oriented Registered Nurse with 7+ years of progressive experience in acute care, emergency, and critical care settings.\n" +
        "Proven ability to manage 4–6 critically ill patients per shift while maintaining 98% patient satisfaction scores.\n" +
        "Skilled in patient assessment, evidence-based care planning, and interdisciplinary collaboration.\n" +
        "Committed to delivering measurable outcomes and continuous quality improvement in fast-paced hospital environments.",

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
        "IV Therapy & Venipuncture\n" +
        "Wound Care & Dressing Changes\n" +
        "Medication Administration\n" +
        "Ventilator Management\n" +
        "Hemodynamic Monitoring\n" +
        "Electronic Health Records (Epic)\n" +
        "Care Plan Development\n" +
        "Infection Control Protocols",

      coreCompetencies:
        "Team Leadership & Mentoring\n" +
        "Critical Thinking\n" +
        "Patient & Family Education\n" +
        "Time Management\n" +
        "Interdisciplinary Collaboration",

      languages:
        "English — Native\n" +
        "Spanish — Conversational",

      experience:
        "SENIOR REGISTERED NURSE – ICU\n" +
        "St. David's Medical Center, Austin, TX | January 2021 – Present\n" +
        "Provide direct care for 4–6 critically ill patients per shift in a 32-bed ICU, including post-surgical, cardiac, and respiratory cases\n" +
        "Reduced hospital-acquired infection rates by 18% through implementation of enhanced hygiene and monitoring protocols\n" +
        "Mentor and precept 12+ new graduate nurses annually on unit protocols, charting standards, and clinical best practices\n" +
        "Maintain 98% patient satisfaction scores consistently across quarterly Press Ganey surveys\n" +
        "Collaborate with multidisciplinary teams including physicians, pharmacists, and respiratory therapists on individualized care plans\n\n" +
        "REGISTERED NURSE – EMERGENCY DEPARTMENT\n" +
        "Seton Medical Center, Austin, TX | June 2018 – December 2020\n" +
        "Triaged and assessed 30+ patients daily in a high-volume Level I trauma center serving 85,000+ annual visits\n" +
        "Administered medications, IV therapy, and emergency interventions with zero medication errors over 2.5 years\n" +
        "Recognized as Employee of the Quarter (Q3 2019) for exceptional patient care and team collaboration\n" +
        "Maintained accurate real-time documentation using Epic EHR system for all patient encounters",

      achievements:
        "Spearheaded ICU sepsis screening protocol resulting in 22% faster identification and 15% reduction in mortality\n" +
        "Developed new-hire orientation program adopted hospital-wide, reducing onboarding time by 3 weeks\n" +
        "Published research on nurse-led ventilator weaning protocols in the Journal of Critical Care Nursing (2022)\n" +
        "Awarded Daisy Award for Extraordinary Nurses (2021) — nominated by patients and families",

      volunteer:
        "Volunteer Nurse | 2019 – Present\n" +
        "Austin Free Clinic · Community Health Outreach\n" +
        "Provide free health screenings and vaccinations to 200+ underserved community members annually",

      custom1: "",
      custom2: "",
    };

    const d = {};
    for (const k in defaults) d[k] = hasText(raw[k]) ? raw[k] : defaults[k];

    const defaultSections = {
      summary: { enabled: true, title: T.summary },
      education: { enabled: true, title: T.education },
      licenses: { enabled: true, title: T.licenses },
      clinicalSkills: { enabled: true, title: T.clinicalSkills, mode: "bullets", boldFirstLine: false },
      coreCompetencies: { enabled: true, title: T.coreCompetencies, mode: "bullets", boldFirstLine: false },
      languages: { enabled: true, title: T.languages, mode: "paragraph", boldFirstLine: false },
      experience: { enabled: true, title: T.experience },
      achievements: { enabled: true, title: T.achievements, mode: "bullets", boldFirstLine: false },
      volunteer: { enabled: true, title: T.volunteer },
      custom1: { enabled: false, title: T.custom1, mode: "bullets", boldFirstLine: false, column: "right" },
      custom2: { enabled: false, title: T.custom2, mode: "bullets", boldFirstLine: false, column: "right" },
    };

    const sections = { ...defaultSections, ...(raw.sections || {}) };

    const contactParts = [d.phone, d.email, d.location, d.linkedin].filter(Boolean);
    const contactHTML = contactParts
      .map((p, i) => {
        const sep = i < contactParts.length - 1 ? ' <span class="sep">|</span> ' : "";
        return "<span>" + fmtInline(p) + "</span>" + sep;
      })
      .join("");

    const summaryHTML =
      sections.summary?.enabled
        ? `
          <section class="cv-summary">
            <h2 class="section-title">${esc(sections.summary.title || T.summary)}</h2>
            <p class="body-text">${fmtInline(d.summary, { preserveNewlines: true })}</p>
          </section>
        `
        : "";

    function renderCustom(key) {
      const cfg = sections[key];
      if (!cfg?.enabled) return "";
      return renderSimpleSection({
        title: cfg.title || T[key] || "Custom Section",
        content: d[key] || "",
        mode: cfg.mode || "bullets",
        boldFirstLine: !!cfg.boldFirstLine,
        ulClass: "skill-list",
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
      sections.education?.enabled ? renderEducationSection(sections.education.title, d.education) : "",
      sections.licenses?.enabled ? renderLicensesSection(sections.licenses.title, d.licenses) : "",
      sections.clinicalSkills?.enabled
        ? renderSimpleSection({
            title: sections.clinicalSkills.title,
            content: d.clinicalSkills,
            mode: sections.clinicalSkills.mode || "bullets",
            boldFirstLine: !!sections.clinicalSkills.boldFirstLine,
            ulClass: "skill-list",
          })
        : "",
      sections.coreCompetencies?.enabled
        ? renderSimpleSection({
            title: sections.coreCompetencies.title,
            content: d.coreCompetencies,
            mode: sections.coreCompetencies.mode || "bullets",
            boldFirstLine: !!sections.coreCompetencies.boldFirstLine,
            ulClass: "skill-list",
          })
        : "",
      sections.languages?.enabled
        ? renderSimpleSection({
            title: sections.languages.title,
            content: d.languages,
            mode: sections.languages.mode || "paragraph",
            boldFirstLine: !!sections.languages.boldFirstLine,
          })
        : "",
      leftCustomHTML,
    ].join("");

    const rightHTML = [
      sections.experience?.enabled ? renderExperienceSection(sections.experience.title, d.experience) : "",
      sections.achievements?.enabled
        ? renderSimpleSection({
            title: sections.achievements.title,
            content: d.achievements,
            mode: sections.achievements.mode || "bullets",
            boldFirstLine: !!sections.achievements.boldFirstLine,
            ulClass: "achievement-list",
          })
        : "",
      sections.volunteer?.enabled ? renderVolunteerSection(sections.volunteer.title, d.volunteer) : "",
      rightCustomHTML,
    ].join("");

    return `
      <div class="cv">
        <header class="cv-header">
          <h1 class="cv-name">${fmtInline(d.name)}</h1>
          <p class="cv-title">${fmtInline(d.title)}</p>
          <div class="cv-contact">${contactHTML}</div>
        </header>

        ${summaryHTML}

        <div class="cv-body">
          <div class="cv-left">${leftHTML}</div>
          <div class="cv-right">${rightHTML}</div>
        </div>
      </div>
    `;
  };
})();
