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

  function stripBulletPrefix(t) {
    const s = String(t ?? "").trim();
    return s.replace(/^([•\-·]\s+)/, "");
  }

  // Fix Nr1: merge wrapped lines into single bullet items (for pasted/templated text)
  // - If a line doesn't look like a new bullet, we append it to previous line
  function mergeWrappedLinesIntoBullets(bulletLines) {
    const out = [];
    for (const rawLine of (bulletLines || [])) {
      const line = String(rawLine || "").trim();
      if (!line) continue;

      const looksLikeBullet = /^([•\-·]\s+)/.test(line);
      const looksLikeHeader = /^[A-ZÆØÅÜÄÖ0-9][A-ZÆØÅÜÄÖ0-9\s\-–—·|()]+$/.test(line) && line.length < 80;

      if (out.length === 0) {
        out.push(stripBulletPrefix(line));
        continue;
      }

      // If the line starts with bullet, it's a new bullet
      if (looksLikeBullet) {
        out.push(stripBulletPrefix(line));
        continue;
      }

      // If it's a header-like line, treat as new bullet (rare)
      if (looksLikeHeader) {
        out.push(stripBulletPrefix(line));
        continue;
      }

      // Otherwise, it's likely a wrapped continuation of previous bullet
      out[out.length - 1] = (out[out.length - 1] + " " + stripBulletPrefix(line)).trim();
    }
    return out;
  }

  function parseExperience(s) {
    return blocks(s).map((block) => {
      const ls = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const rawBullets = ls.slice(2);
      const bullets = mergeWrappedLinesIntoBullets(rawBullets);
      return {
        title: ls[0] || "",
        meta: ls[1] || "",
        bullets,
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

      // Or "Title 2019 – Present"
      if (!volDate) {
        const m2 = volTitle.match(/^(.*?)(\b\d{4}\s*–\s*(?:Present|Nåværende|\d{4})\b)$/);
        if (m2) {
          volTitle = m2[1].trim();
          volDate = m2[2].trim();
        }
      }

      const volSub = ls[1] || "";
      const rawBullets = ls.slice(2);
      const volBullets = mergeWrappedLinesIntoBullets(rawBullets);

      return { volTitle, volDate, volSub, volBullets };
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

  // Language defaults for the entire template content
  function defaultsByLang(lang) {
    const L = String(lang || "en").toLowerCase();

    if (L === "no" || L === "nb" || L === "nn") {
      return {
        name: "Sarah Johnson",
        title: "Sykepleier · BSN, RN",
        phone: "(555) 123-4567",
        email: "sarah.johnson@email.com",
        location: "Austin, TX 78701",
        linkedin: "linkedin.com/in/sarahjohnsonrn",

        summary:
          "Omsorgsfull og detaljorientert sykepleier med 7+ års erfaring fra akuttmottak og intensiv/akuttmedisin. " +
          "Dokumentert evne til å håndtere 4–6 kritisk syke pasienter per vakt og samtidig oppnå 98% pasienttilfredshet. " +
          "Sterk på klinisk vurdering, evidensbasert pleieplanlegging og tverrfaglig samarbeid. " +
          "Motiveres av målbare resultater og kontinuerlig kvalitetsforbedring.",

        education:
          "Master i sykepleie\n" +
          "The University of Texas at Austin\n" +
          "2016 – 2018\n\n" +
          "Bachelor i sykepleie\n" +
          "The University of Texas at Austin\n" +
          "2012 – 2016\n" +
          "Magna Cum Laude · GPA 3.85",

        licenses:
          "Autorisasjon som sykepleier (RN)\n" +
          "Texas Board of Nursing · #TX-892341\n" +
          "CCRN – Intensiv\n" +
          "AACN · Utløper mars 2026\n" +
          "ACLS\n" +
          "American Heart Association · Utløper aug 2026\n" +
          "BLS / HLR\n" +
          "American Heart Association · Utløper aug 2026\n" +
          "TNCC\n" +
          "Emergency Nurses Association",

        clinicalSkills:
          "Klinisk vurdering & triage\n" +
          "IV-behandling & venepunksjon\n" +
          "Sårbehandling\n" +
          "Legemiddelhåndtering\n" +
          "Ventilatorbehandling\n" +
          "Hemodynamisk monitorering\n" +
          "Elektronisk journal (Epic)\n" +
          "Pleieplaner\n" +
          "Infeksjonskontroll",

        coreCompetencies:
          "Teamarbeid & veiledning\n" +
          "Kritisk tenkning\n" +
          "Pasient- og pårørendeopplæring\n" +
          "Prioritering & tidsstyring\n" +
          "Tverrfaglig samarbeid",

        languages:
          "Norsk — Morsmål\n" +
          "Engelsk — Flytende",

        experience:
          "SENIOR SYKEPLEIER – INTENSIV\n" +
          "St. David's Medical Center, Austin, TX | Januar 2021 – Nåværende\n" +
          "Gi direkte pasientbehandling til 4–6 kritisk syke pasienter per vakt i en 32-sengs intensiv\n" +
          "Reduserte sykehuservervede infeksjoner med 18% gjennom forbedrede hygiene- og monitoreringsrutiner\n" +
          "Veileder og følger opp 12+ nyutdannede sykepleiere årlig på rutiner, dokumentasjon og beste praksis\n" +
          "Opprettholder 98% pasienttilfredshet i Press Ganey-målinger\n" +
          "Samarbeider tett med leger, farmasøyter og respiratoriske terapeuter om individualiserte tiltak\n\n" +
          "SYKEPLEIER – AKUTTMOTTAK\n" +
          "Seton Medical Center, Austin, TX | Juni 2018 – Desember 2020\n" +
          "Triagerte og vurderte 30+ pasienter daglig i et høyt volum akuttmottak\n" +
          "Gjennomførte medikamentadministrasjon og akuttintervensjoner uten medikamentfeil over 2,5 år\n" +
          "Kåret til Employee of the Quarter (Q3 2019) for sterk pasientbehandling og samarbeid\n" +
          "Dokumenterte alle pasientforløp løpende i Epic EHR\n\n" +
          "SYKEPLEIER – MEDISINSK/KIRURGISK POST\n" +
          "Dell Children's Medical Center, Austin, TX | August 2016 – Mai 2018\n" +
          "Gav omsorg til 20+ pediatriske pasienter daglig på medisinsk og kirurgisk avdeling\n" +
          "Overvåket vitale tegn, lab og respons på behandling med 100% dokumentasjonscompliance\n" +
          "Underviste 500+ familier i utskrivningsplaner og oppfølging",

        achievements:
          "Ledet sepsisscreening på intensiv som ga 22% raskere identifisering og 15% lavere mortalitet\n" +
          "Utviklet introduksjonsprogram for nyansatte som ble tatt i bruk på tvers av sykehuset\n" +
          "Publiserte forskning på sykepleierledet ventilatoravvenning i Journal of Critical Care Nursing (2022)\n" +
          "Tildelt Daisy Award (2021) — nominert av pasienter og pårørende",

        volunteer:
          "Frivillig sykepleier 2019 – Nåværende\n" +
          "Austin Free Clinic · Community Health Outreach\n" +
          "Utfører gratis helsesjekker og vaksinasjon for 200+ personer årlig",

        custom1: "",
        custom2: "",
      };
    }

    if (L === "de") {
      return {
        name: "Sarah Johnson",
        title: "Gesundheits- und Krankenpflegerin · BSN, RN",
        phone: "(555) 123-4567",
        email: "sarah.johnson@email.com",
        location: "Austin, TX 78701",
        linkedin: "linkedin.com/in/sarahjohnsonrn",

        summary:
          "Engagierte und detailorientierte Pflegefachkraft mit 7+ Jahren Erfahrung in Akutversorgung, Notaufnahme und Intensivpflege. " +
          "Nachweislich in der Lage, 4–6 kritisch kranke Patient:innen pro Schicht zu versorgen und gleichzeitig 98% Patientenzufriedenheit zu halten. " +
          "Stark in klinischer Einschätzung, evidenzbasierter Pflegeplanung und interdisziplinärer Zusammenarbeit. " +
          "Fokussiert auf messbare Ergebnisse und kontinuierliche Qualitätsverbesserung.",

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
          "AACN · Ablauf März 2026\n" +
          "ACLS\n" +
          "American Heart Association · Ablauf Aug 2026\n" +
          "BLS / CPR\n" +
          "American Heart Association · Ablauf Aug 2026\n" +
          "TNCC\n" +
          "Emergency Nurses Association",

        clinicalSkills:
          "Klinische Einschätzung & Triage\n" +
          "IV-Therapie & Venenpunktion\n" +
          "Wundversorgung\n" +
          "Medikamentengabe\n" +
          "Beatmungsmanagement\n" +
          "Hämodynamisches Monitoring\n" +
          "Elektronische Patientenakte (Epic)\n" +
          "Pflegeplanung\n" +
          "Infektionsprävention",

        coreCompetencies:
          "Teamführung & Mentoring\n" +
          "Kritisches Denken\n" +
          "Patienten-/Angehörigenberatung\n" +
          "Zeitmanagement\n" +
          "Interdisziplinäre Zusammenarbeit",

        languages:
          "Deutsch — Muttersprache\n" +
          "Englisch — Fließend",

        experience:
          "SENIOR REGISTERED NURSE – ICU\n" +
          "St. David's Medical Center, Austin, TX | Januar 2021 – Heute\n" +
          "Direkte Versorgung von 4–6 kritisch kranken Patient:innen pro Schicht auf einer 32-Betten-ICU\n" +
          "Reduktion nosokomialer Infektionen um 18% durch verbesserte Hygiene- und Monitoring-Protokolle\n" +
          "Mentoring von 12+ Berufseinsteiger:innen pro Jahr zu Standards, Dokumentation und Best Practices\n" +
          "Konstant 98% Patientenzufriedenheit in Press-Ganey-Erhebungen\n" +
          "Interdisziplinäre Zusammenarbeit mit Ärzt:innen, Pharmazeut:innen und Atemtherapeut:innen\n\n" +
          "REGISTERED NURSE – EMERGENCY DEPARTMENT\n" +
          "Seton Medical Center, Austin, TX | Juni 2018 – Dezember 2020\n" +
          "Triage und Einschätzung von 30+ Patient:innen täglich in einer Level-I-Trauma-Notaufnahme\n" +
          "Medikamentengabe und Notfallinterventionen ohne Medikationsfehler über 2,5 Jahre\n" +
          "Auszeichnung Employee of the Quarter (Q3 2019)\n" +
          "Dokumentation in Epic EHR in Echtzeit\n\n" +
          "STAFF NURSE – MEDICAL-SURGICAL UNIT\n" +
          "Dell Children's Medical Center, Austin, TX | August 2016 – Mai 2018\n" +
          "Versorgung von 20+ pädiatrischen Patient:innen täglich\n" +
          "Monitoring von Vitalparametern/Labor und 100% Dokumentations-Compliance\n" +
          "Schulung von 500+ Familien zu Entlassung und Nachsorge",

        achievements:
          "Einführung eines Sepsis-Screenings: 22% schnellere Identifikation und 15% geringere Mortalität\n" +
          "Entwicklung eines Onboarding-Programms: 3 Wochen kürzere Einarbeitung\n" +
          "Publikation zu Beatmungsweaning-Protokollen (2022)\n" +
          "Daisy Award (2021) — nominiert von Patient:innen und Angehörigen",

        volunteer:
          "Volunteer Nurse 2019 – Heute\n" +
          "Austin Free Clinic · Community Health Outreach\n" +
          "Kostenlose Gesundheitschecks und Impfungen für 200+ Menschen pro Jahr",

        custom1: "",
        custom2: "",
      };
    }

    // EN default
    return {
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
        "Spearheaded ICU sepsis screening protocol resulting in 22% faster identification and 15% reduction in\n" +
        "mortality\n" +
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
  }

  window.renderCV = function renderCV(data) {
    const raw = data || {};
    const lang = raw.lang || "en";

    const defaults = defaultsByLang(lang);

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
      contact: { enabled: true },
      titleLine: { enabled: true },
      emailLine: { enabled: true },
      phoneLine: { enabled: true },
      locationLine: { enabled: true },
      linkedinLine: { enabled: true },
    };

    const sections = { ...defaultSections, ...(raw.sections || {}) };

    // Contact show/hide
    const contactParts = [];
    if (sections.contact?.enabled !== false) {
      if (sections.phoneLine?.enabled !== false && d.phone) contactParts.push(d.phone);
      if (sections.emailLine?.enabled !== false && d.email) contactParts.push(d.email);
      if (sections.locationLine?.enabled !== false && d.location) contactParts.push(d.location);
      if (sections.linkedinLine?.enabled !== false && d.linkedin) contactParts.push(d.linkedin);
    }

    const contactHTML = contactParts
      .map((p, i) => {
        const sep = i < contactParts.length - 1 ? ' <span class="sep">|</span> ' : "";
        return "<span>" + fmtInline(p) + "</span>" + sep;
      })
      .join("");

    const titleHTML = (sections.titleLine?.enabled === false) ? "" : `<p class="cv-title">${fmtInline(d.title)}</p>`;

    const summaryHTML =
      sections.summary?.enabled
        ? `
          <section class="cv-summary">
            <h2 class="section-title">${esc(sections.summary.title || "Professional Summary")}</h2>
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
          ${titleHTML}
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
