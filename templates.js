// templates.js – exposes window.renderCV(data) → HTML string
(function () {
  function esc(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  // Generic section renderer: title + content (bullets or paragraphs)
  function renderSimpleSection({ title, content, mode, boldFirstLine }) {
    const items = lines(content);

    if (!items.length) return "";

    // paragraph mode: join as <p> lines
    if (mode === "paragraph") {
      const ps = items
        .map((t, idx) => {
          if (boldFirstLine && idx === 0) {
            return `<p><strong>${esc(t)}</strong></p>`;
          }
          return `<p>${esc(t)}</p>`;
        })
        .join("");
      return `
        <section>
          <h2 class="section-title">${esc(title)}</h2>
          <div class="lang-list">${ps}</div>
        </section>
      `;
    }

    // bullets mode
    const lis = items
      .map((t, idx) => {
        if (boldFirstLine && idx === 0) {
          return `<li><strong>${esc(t)}</strong></li>`;
        }
        return `<li>${esc(t)}</li>`;
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
        const bullets = (e.bullets || []).map((b) => `<li>${esc(b)}</li>`).join("");
        return `
          <div class="exp-entry">
            <h3>${esc(e.title)}</h3>
            ${e.meta ? `<p class="meta">${esc(e.meta)}</p>` : ""}
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
          <h3>${esc(e.degree)}</h3>
          ${e.school ? `<p>${esc(e.school)}</p>` : ""}
          ${e.date ? `<p class="date">${esc(e.date)}</p>` : ""}
          ${e.honors ? `<p class="honors">${esc(e.honors)}</p>` : ""}
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
          <h3>${esc(licLines[j] || "")}</h3>
          ${licLines[j + 1] ? `<p>${esc(licLines[j + 1])}</p>` : ""}
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
      ? `<ul class="exp-bullets">${volBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`
      : "";

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <div class="vol-header">
          <h3>${esc(volTitle)}</h3>
          ${volDate ? `<span class="date">${esc(volDate)}</span>` : ""}
        </div>
        ${volSub ? `<p class="vol-sub">${esc(volSub)}</p>` : ""}
        ${bulletsHTML}
      </section>
    `;
  }

  window.renderCV = function renderCV(data) {
    const raw = data || {};

    // Demo/default content (shown until user types)
    const defaults = {
      name: "Sarah Johnson",
      title: "Registered Nurse · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",
      summary:
        "Compassionate and detail-oriented Registered Nurse with 7+ years of progressive experience in acute care, emergency, and critical care settings. Proven ability to manage 4–6 critically ill patients per shift while maintaining 98% patient satisfaction scores. Skilled in patient assessment, evidence-based care planning, and interdisciplinary collaboration. Committed to delivering measurable outcomes and continuous quality improvement in fast-paced hospital environments.",
      education:
        "Master of Science in Nursing\nThe University of Texas at Austin\n2016 – 2018\n\nBachelor of Science in Nursing\nThe University of Texas at Austin\n2012 – 2016\nMagna Cum Laude · GPA 3.85",
      licenses:
        "Registered Nurse (RN)\nTexas Board of Nursing · #TX-892341\nCCRN – Critical Care\nAACN · Expires March 2026\nACLS\nAmerican Heart Association · Exp. Aug 2026\nBLS / CPR\nAmerican Heart Association · Exp. Aug 2026\nTNCC\nEmergency Nurses Association",
      clinicalSkills:
        "Patient Assessment & Triage\nIV Therapy & Venipuncture\nWound Care & Dressing Changes\nMedication Administration\nVentilator Management\nHemodynamic Monitoring\nElectronic Health Records (Epic)\nCare Plan Development\nInfection Control Protocols",
      coreCompetencies:
        "Team Leadership & Mentoring\nCritical Thinking\nPatient & Family Education\nTime Management\nInterdisciplinary Collaboration",
      languages: "English — Native\nSpanish — Conversational",
      experience:
        "Senior Registered Nurse – ICU\nSt. David's Medical Center, Austin, TX | January 2021 – Present\nProvide direct care for 4–6 critically ill patients per shift in a 32-bed ICU, including post-surgical, cardiac, and respiratory cases\nReduced hospital-acquired infection rates by 18% through implementation of enhanced hygiene and monitoring protocols\nMentor and precept 12+ new graduate nurses annually on unit protocols, charting standards, and clinical best practices\nMaintain 98% patient satisfaction scores consistently across quarterly Press Ganey surveys\nCollaborate with multidisciplinary teams including physicians, pharmacists, and respiratory therapists on individualized care plans\n\nRegistered Nurse – Emergency Department\nSeton Medical Center, Austin, TX | June 2018 – December 2020\nTriaged and assessed 30+ patients daily in a high-volume Level I trauma center serving 85,000+ annual visits\nAdministered medications, IV therapy, and emergency interventions with zero medication errors over 2.5 years\nRecognized as Employee of the Quarter (Q3 2019) for exceptional patient care and team collaboration\nMaintained accurate real-time documentation using Epic EHR system for all patient encounters\n\nStaff Nurse – Medical-Surgical Unit\nDell Children's Medical Center, Austin, TX | August 2016 – May 2018\nDelivered compassionate care to 20+ pediatric patients daily aged 2–17 across medical and surgical units\nMonitored and documented vital signs, lab results, and medication responses with 100% charting compliance\nEducated 500+ families on post-discharge care plans, medication schedules, and follow-up procedures",
      achievements:
        "Spearheaded ICU sepsis screening protocol resulting in 22% faster identification and 15% reduction in mortality\nDeveloped new-hire orientation program adopted hospital-wide, reducing onboarding time by 3 weeks\nPublished research on nurse-led ventilator weaning protocols in the Journal of Critical Care Nursing (2022)\nAwarded Daisy Award for Extraordinary Nurses (2021) — nominated by patients and families",
      volunteer:
        "Volunteer Nurse | 2019 – Present\nAustin Free Clinic · Community Health Outreach\nProvide free health screenings and vaccinations to 200+ underserved community members annually",
    };

    // Merge: empty field -> default
    const d = {};
    for (const k in defaults) {
      d[k] = hasText(raw[k]) ? raw[k] : defaults[k];
    }

    // 🔧 Sections config (editable via app.js/index.html if you add fields)
    // You can pass raw.sections as JSON (string or object). If missing, use defaults.
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
    };

    let sections = defaultSections;
    try {
      if (raw.sections && typeof raw.sections === "string") {
        sections = { ...defaultSections, ...JSON.parse(raw.sections) };
      } else if (raw.sections && typeof raw.sections === "object") {
        sections = { ...defaultSections, ...raw.sections };
      }
    } catch {
      sections = defaultSections;
    }

    // Contact line
    const contactParts = [d.phone, d.email, d.location, d.linkedin].filter(Boolean);
    const contactHTML = contactParts
      .map((p, i) => {
        const sep = i < contactParts.length - 1 ? ' <span class="sep">|</span> ' : "";
        return "<span>" + esc(p) + "</span>" + sep;
      })
      .join("");

    // Left column sections
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
    ].join("");

    // Right column sections
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
    ].join("");

    const summaryHTML = sections.summary?.enabled
      ? `
        <section class="cv-summary">
          <h2 class="section-title">${esc(sections.summary.title || "Professional Summary")}</h2>
          <p class="body-text">${esc(d.summary)}</p>
        </section>
      `
      : "";

    return `
      <div class="cv">
        <header class="cv-header">
          <h1 class="cv-name">${esc(d.name)}</h1>
          <p class="cv-title">${esc(d.title)}</p>
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
