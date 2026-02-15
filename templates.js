// templates.js – exposes window.renderCV(data) → HTML string
(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Render **bold** while keeping everything else escaped.
  // Steps:
  // 1) Split on **...** patterns
  // 2) Escape each piece
  // 3) Wrap bold parts in <strong>
  function fmtInline(text) {
    const t = String(text ?? "");
    if (!t) return "";
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts
      .map((p) => {
        const m = p.match(/^\*\*([^*]+)\*\*$/);
        if (m) return `<strong>${esc(m[1])}</strong>`;
        return esc(p);
      })
      .join("");
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

  function parseExperience(s) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        title: ls[0] || "",
        meta: ls[1] || "",
        bullets: ls.slice(2),
      };
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

  // mode: "bullets" | "paragraph"
  function renderSimpleSection({ title, content, mode, boldFirstLine }) {
    const items = lines(content);
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
        const inner = fmtInline(t);
        if (boldFirstLine && idx === 0) return `<li><strong>${inner}</strong></li>`;
        return `<li>${inner}</li>`;
      })
      .join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <ul class="skill-list">${lis}</ul>
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
    const licLines = lines(licensesText);
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
    const volLines = lines(volunteerText);
    if (!volLines.length) return "";

    let volTitle = volLines[0] || "";
    let volDate = "";
    const m = volTitle.match(/^(.+?)\s*\|\s*(.+)$/);
    if (m) {
      volTitle = m[1];
      volDate = m[2];
    }
    const volSub = volLines[1] || "";
    const volBullets = volLines.slice(2);

    const bulletsHTML = volBullets.length
      ? `<ul class="exp-bullets">${volBullets.map((b) => `<li>${fmtInline(b)}</li>`).join("")}</ul>`
      : "";

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <div class="vol-header">
          <h3>${fmtInline(volTitle)}</h3>
          ${volDate ? `<span class="date">${fmtInline(volDate)}</span>` : ""}
        </div>
        ${volSub ? `<p class="vol-sub">${fmtInline(volSub)}</p>` : ""}
        ${bulletsHTML}
      </section>
    `;
  }

  window.renderCV = function renderCV(data) {
    const raw = data || {};

    const defaults = {
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
      coreCompetencies:
        "Team Leadership & Mentoring\nCritical Thinking\nTime Management",
      languages: "English — Native\nSpanish — Conversational",
      experience:
        "Senior Registered Nurse – ICU\nSt. David's Medical Center, Austin, TX | January 2021 – Present\n- Provide direct care for 4–6 critically ill patients per shift\n- Maintain 98% patient satisfaction scores",
      achievements:
        "Spearheaded ICU sepsis screening protocol\nDeveloped new-hire orientation program",
      volunteer:
        "Volunteer Nurse | 2019 – Present\nAustin Free Clinic · Community Health Outreach\n- Provide free health screenings",
      custom1: "",
      custom2: "",
    };

    const d = {};
    for (const k in defaults) d[k] = hasText(raw[k]) ? raw[k] : defaults[k];

    const defaultSections = {
      summary: { enabled: true, title: "Professional Summary" },
      education: { enabled: true, title: "Education" },
      licenses: { enabled: true, title: "Licenses & Certifications" },
      clinicalSkills: { enabled: true, title: "Clinical Skills", mode: "bullets", boldFirstLine: false },
      coreCompetencies: { enabled: true, title: "Core Competencies", mode: "bullets", boldFirstLine: false },
      languages: { enabled: true, title: "Languages", mode: "paragraph", boldFirstLine: false },
      experience: { enabled: true, title: "Professional Experience" },
      achievements: { enabled: true, title: "Clinical Achievements", mode: "bullets", boldFirstLine: false },
      volunteer: { enabled: true, title: "Volunteer Experience" },
      custom1: { enabled: false, title: "Custom Section 1", mode: "bullets", boldFirstLine: false, column: "right" },
      custom2: { enabled: false, title: "Custom Section 2", mode: "bullets", boldFirstLine: false, column: "right" },
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
            <h2 class="section-title">${esc(sections.summary.title || "Professional Summary")}</h2>
            <p class="body-text">${fmtInline(d.summary)}</p>
          </section>
        `
        : "";

    function renderCustom(key) {
      const cfg = sections[key];
      if (!cfg?.enabled) return "";
      return renderSimpleSection({
        title: cfg.title || "Custom Section",
        content: d[key] || "",
        mode: cfg.mode || "bullets",
        boldFirstLine: !!cfg.boldFirstLine,
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
          })
        : "",
      sections.coreCompetencies?.enabled
        ? renderSimpleSection({
            title: sections.coreCompetencies.title,
            content: d.coreCompetencies,
            mode: sections.coreCompetencies.mode || "bullets",
            boldFirstLine: !!sections.coreCompetencies.boldFirstLine,
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
