// templates.js (FULL) – exposes window.renderCV(data) → HTML string
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

  function stripBulletPrefix(t) {
    const s = String(t ?? "").trim();
    return s.replace(/^([•\-·]\s+)/, "");
  }

  // FIX Nr1: merge "wrapped lines" (template defaults) into previous bullet
  function isBulletLine(line) {
    return /^([•\-·]\s+)/.test(String(line || "").trim());
  }

  function mergeWrappedLinesIntoBullets(linesArr) {
    const out = [];
    for (const raw of (linesArr || [])) {
      const line = String(raw || "").trim();
      if (!line) continue;

      if (isBulletLine(line)) {
        out.push(stripBulletPrefix(line));
        continue;
      }

      // continuation line
      if (out.length) {
        out[out.length - 1] = (out[out.length - 1] + " " + line).replace(/\s+/g, " ").trim();
      } else {
        out.push(line);
      }
    }
    return out;
  }

  function parseExperience(s) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
      return {
        title: ls[0] || "",
        meta: ls[1] || "",
        bullets: mergeWrappedLinesIntoBullets(ls.slice(2)),
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

  function parseVolunteer(s) {
    // Multiple blocks separated by blank line
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

      // Or "Title 2019 – Present" / "Title 2019-2020" (dash variants)
      if (!volDate) {
        const m2 = volTitle.match(/^(.*?)(\b\d{4}\s*[-–—]\s*(?:Present|\d{4})\b)$/);
        if (m2) {
          volTitle = m2[1].trim();
          volDate = m2[2].trim();
        }
      }

      const volSub = ls[1] || "";
      const volBullets = mergeWrappedLinesIntoBullets(ls.slice(2));

      return { volTitle, volDate, volSub, volBullets };
    });
  }

  // mode: "bullets" | "paragraph"
  function renderSimpleSection({ title, content, mode, boldFirstLine }) {
    const items = mergeWrappedLinesIntoBullets(lines(content));
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
    const vols = parseVolunteer(volunteerText);
    if (!vols.length) return "";

    const volHTML = vols.map((v) => {
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
    }).join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${volHTML}
      </section>
    `;
  }

  const defaultsByLang = {
    en: {
      name: "Sarah Johnson",
      title: "Registered Nurse · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",
      summary:
        "Compassionate and detail-oriented Registered Nurse with 7+ years of progressive experience in acute care, emergency, and critical care settings. Proven ability to manage\n" +
        "4–6 critically ill patients per shift while maintaining 98% patient satisfaction scores. Skilled in patient assessment, evidence-based care planning, and interdisciplinary\n" +
        "collaboration. Committed to delivering measurable outcomes and continuous quality improvement in fast-paced hospital environments.",
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
        "Provide direct care for 4–6 critically ill patients per shift in a 32-bed ICU, including post-surgical, cardiac,\n" +
        "and respiratory cases\n" +
        "Reduced hospital-acquired infection rates by 18% through implementation of enhanced hygiene and\n" +
        "monitoring protocols\n" +
        "Mentor and precept 12+ new graduate nurses annually on unit protocols, charting standards, and clinical\n" +
        "best practices\n" +
        "Maintain 98% patient satisfaction scores consistently across quarterly Press Ganey surveys\n" +
        "Collaborate with multidisciplinary teams including physicians, pharmacists, and respiratory therapists on\n" +
        "individualized care plans\n\n" +
        "REGISTERED NURSE – EMERGENCY DEPARTMENT\n" +
        "Seton Medical Center, Austin, TX | June 2018 – December 2020\n" +
        "Triaged and assessed 30+ patients daily in a high-volume Level I trauma center serving 85,000+ annual visits\n" +
        "Administered medications, IV therapy, and emergency interventions with zero medication errors over 2.5\n" +
        "years\n" +
        "Recognized as Employee of the Quarter (Q3 2019) for exceptional patient care and team collaboration\n" +
        "Maintained accurate real-time documentation using Epic EHR system for all patient encounters\n\n" +
        "STAFF NURSE – MEDICAL-SURGICAL UNIT\n" +
        "Dell Children's Medical Center, Austin, TX | August 2016 – May 2018\n" +
        "Delivered compassionate care to 20+ pediatric patients daily aged 2–17 across medical and surgical units\n" +
        "Monitored and documented vital signs, lab results, and medication responses with 100% charting\n" +
        "compliance\n" +
        "Educated 500+ families on post-discharge care plans, medication schedules, and follow-up procedures",
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
    },
    no: {
      name: "Sarah Johnson",
      title: "Sykepleier · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",
      summary:
        "Resultatorientert og omsorgsfull sykepleier med 7+ års erfaring fra akuttmottak og intensiv. Dokumentert evne til å håndtere 4–6 kritisk syke pasienter per vakt og samtidig opprettholde høy pasienttilfredshet. Sterk på klinisk vurdering, evidensbasert pleieplanlegging og tverrfaglig samarbeid. Motiveres av målbare forbedringer og kvalitetsarbeid i et høyt tempo.",
      education:
        "Master i sykepleie\n" +
        "The University of Texas at Austin\n" +
        "2016 – 2018\n\n" +
        "Bachelor i sykepleie\n" +
        "The University of Texas at Austin\n" +
        "2012 – 2016\n" +
        "Magna Cum Laude · GPA 3.85",
      licenses:
        "Autorisasjon (RN)\n" +
        "Texas Board of Nursing · #TX-892341\n" +
        "CCRN – Intensiv\n" +
        "AACN · Utløper mars 2026\n" +
        "ACLS\n" +
        "American Heart Association · Utløper aug 2026\n" +
        "BLS / CPR\n" +
        "American Heart Association · Utløper aug 2026",
      clinicalSkills:
        "Pasientvurdering og triage\n" +
        "IV-behandling og venepunksjon\n" +
        "Sårbehandling\n" +
        "Medikamentadministrasjon\n" +
        "Ventilatorhåndtering\n" +
        "Hemodynamisk monitorering\n" +
        "EHR (Epic)\n" +
        "Pleieplan og dokumentasjon\n" +
        "Infeksjonsforebygging",
      coreCompetencies:
        "Veiledning og opplæring\n" +
        "Kritisk tenkning\n" +
        "Pasient- og pårørendeundervisning\n" +
        "Prioritering og tidsstyring\n" +
        "Tverrfaglig samarbeid",
      languages:
        "Engelsk — Morsmål\n" +
        "Spansk — Samtalenivå",
      experience:
        "SENIOR SYKEPLEIER – INTENSIV\n" +
        "St. David's Medical Center, Austin, TX | Jan 2021 – Nå\n" +
        "Direkte pasientbehandling for 4–6 kritisk syke pasienter per vakt i en 32-sengs intensiv\n" +
        "Reduserte sykehusinfeksjoner med 18% gjennom forbedrede hygiene- og monitoreringsrutiner\n" +
        "Veiledet 12+ nyutdannede årlig i rutiner, dokumentasjon og klinisk beste praksis\n" +
        "Opprettholdt 98% pasienttilfredshet (Press Ganey)\n" +
        "Samarbeidet tett med leger, farmasøyter og respiratorterapeuter om individuelle behandlingsplaner",
      achievements:
        "Innførte sepsis-screening som ga 22% raskere identifisering og 15% lavere mortalitet\n" +
        "Utviklet opplæringsprogram som reduserte onboarding med 3 uker\n" +
        "Publiserte fagartikkel om sykepleierledet ventilatoravvenning (2022)",
      volunteer:
        "Frivillig sykepleier | 2019 – Nå\n" +
        "Austin Free Clinic · Community Health Outreach\n" +
        "Gjennomførte gratis helsesjekk og vaksinasjon for 200+ personer årlig",
      custom1: "",
      custom2: "",
    },
    de: {
      name: "Sarah Johnson",
      title: "Gesundheits- und Krankenpflegerin · BSN, RN",
      phone: "(555) 123-4567",
      email: "sarah.johnson@email.com",
      location: "Austin, TX 78701",
      linkedin: "linkedin.com/in/sarahjohnsonrn",
      summary:
        "Engagierte und detailorientierte Pflegefachkraft mit 7+ Jahren Erfahrung in Akut-, Notfall- und Intensivpflege. Nachweisliche Fähigkeit, 4–6 kritisch kranke Patient:innen pro Schicht zu betreuen und dabei sehr hohe Patientenzufriedenheit zu erreichen. Stark in klinischer Einschätzung, evidenzbasierter Pflegeplanung und interdisziplinärer Zusammenarbeit.",
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
        "CCRN – Intensiv\n" +
        "AACN · Gültig bis März 2026\n" +
        "ACLS\n" +
        "AHA · Gültig bis Aug 2026",
      clinicalSkills:
        "Klinische Einschätzung & Triage\n" +
        "IV-Therapie\n" +
        "Wundversorgung\n" +
        "Medikamentengabe\n" +
        "Beatmungsmanagement\n" +
        "Hämodynamisches Monitoring\n" +
        "EHR (Epic)\n" +
        "Pflegeplanung\n" +
        "Infektionsprävention",
      coreCompetencies:
        "Teamführung & Mentoring\n" +
        "Kritisches Denken\n" +
        "Patienten- & Angehörigenedukation\n" +
        "Zeitmanagement\n" +
        "Interdisziplinäre Zusammenarbeit",
      languages:
        "Englisch — Muttersprache\n" +
        "Spanisch — Konversationssicher",
      experience:
        "SENIOR REGISTERED NURSE – ICU\n" +
        "St. David's Medical Center, Austin, TX | Jan 2021 – Heute\n" +
        "Betreuung von 4–6 kritisch kranken Patient:innen pro Schicht auf einer 32-Betten-ICU\n" +
        "Reduzierung nosokomialer Infektionen um 18% durch verbesserte Hygiene- und Monitoring-Protokolle\n" +
        "Mentoring von 12+ Berufsanfänger:innen pro Jahr\n" +
        "Konstant 98% Patientenzufriedenheit (Press Ganey)\n" +
        "Enge Zusammenarbeit mit Ärzt:innen, Apotheke und Respiratory Therapy",
      achievements:
        "Sepsis-Screening-Protokoll: 22% schnellere Identifikation und 15% niedrigere Mortalität\n" +
        "Onboarding-Programm: Einarbeitungszeit um 3 Wochen reduziert",
      volunteer:
        "Ehrenamtliche Pflegekraft | 2019 – Heute\n" +
        "Austin Free Clinic · Community Health Outreach\n" +
        "Kostenlose Screenings und Impfungen für 200+ Personen pro Jahr",
      custom1: "",
      custom2: "",
    }
  };

  window.renderCV = function renderCV(data) {
    const raw = data || {};
    const lang = raw.uiLang || "en";

    // Defaults by language
    const defaults = defaultsByLang[lang] || defaultsByLang.en;

    const d = {};
    for (const k in defaults) d[k] = hasText(raw[k]) ? raw[k] : defaults[k];

    const defaultSectionsByLang = {
      en: {
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
      },
      no: {
        summary: { enabled: true, title: "Profesjonell profil" },
        education: { enabled: true, title: "Utdanning" },
        licenses: { enabled: true, title: "Lisenser og sertifiseringer" },
        clinicalSkills: { enabled: true, title: "Kliniske ferdigheter", mode: "bullets", boldFirstLine: false },
        coreCompetencies: { enabled: true, title: "Kjernekompetanse", mode: "bullets", boldFirstLine: false },
        languages: { enabled: true, title: "Språk", mode: "paragraph", boldFirstLine: false },
        experience: { enabled: true, title: "Erfaring" },
        achievements: { enabled: true, title: "Resultater", mode: "bullets", boldFirstLine: false },
        volunteer: { enabled: true, title: "Frivillig erfaring" },
        custom1: { enabled: false, title: "Egendefinert seksjon 1", mode: "bullets", boldFirstLine: false, column: "right" },
        custom2: { enabled: false, title: "Egendefinert seksjon 2", mode: "bullets", boldFirstLine: false, column: "right" },
      },
      de: {
        summary: { enabled: true, title: "Profil" },
        education: { enabled: true, title: "Ausbildung" },
        licenses: { enabled: true, title: "Lizenzen & Zertifikate" },
        clinicalSkills: { enabled: true, title: "Klinische Fähigkeiten", mode: "bullets", boldFirstLine: false },
        coreCompetencies: { enabled: true, title: "Kernkompetenzen", mode: "bullets", boldFirstLine: false },
        languages: { enabled: true, title: "Sprachen", mode: "paragraph", boldFirstLine: false },
        experience: { enabled: true, title: "Berufserfahrung" },
        achievements: { enabled: true, title: "Erfolge", mode: "bullets", boldFirstLine: false },
        volunteer: { enabled: true, title: "Ehrenamt" },
        custom1: { enabled: false, title: "Benutzerdefiniert 1", mode: "bullets", boldFirstLine: false, column: "right" },
        custom2: { enabled: false, title: "Benutzerdefiniert 2", mode: "bullets", boldFirstLine: false, column: "right" },
      }
    };

    const sections = { ...(defaultSectionsByLang[lang] || defaultSectionsByLang.en), ...(raw.sections || {}) };

    // Contact visibility (Nr 4)
    const vis = raw.contactVisibility || {};
    const contactParts = [
      vis.phone === false ? "" : d.phone,
      vis.email === false ? "" : d.email,
      vis.location === false ? "" : d.location,
      vis.linkedin === false ? "" : d.linkedin,
    ].filter(Boolean);

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
            <h2 class="section-title">${esc(sections.summary.title || (defaultSectionsByLang[lang]?.summary?.title || "Professional Summary"))}</h2>
            <p class="body-text">${fmtInline(d.summary, { preserveNewlines: true })}</p>
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
