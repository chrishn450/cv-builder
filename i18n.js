// i18n.js
(function () {
  const LANGS = [
    { code: "en", name: "English" },
    { code: "no", name: "Norsk" },
    { code: "de", name: "Deutsch" },
    { code: "sv", name: "Svenska" },
    { code: "da", name: "Dansk" },
    { code: "fr", name: "Français" },
    { code: "es", name: "Español" },
    { code: "it", name: "Italiano" },
    { code: "nl", name: "Nederlands" },
    { code: "pl", name: "Polski" },
    { code: "pt", name: "Português" }
  ];

  // UI + editor + AI + dynamiske labels
  const I18N = {
    en: {
      "app.title": "CV Builder",
      "topbar.panels": "Panels",
      "topbar.logout": "Log out",
      "editor.title": "Edit content",
      "preview.title": "Preview",
      "ai.title": "AI Coach",
      "ai.helptext":
        "Ask for review, improvements, new bullet points, or layout changes. You must approve suggestions before they are applied.",
      "hint.send": "Tip: Ctrl/Cmd + Enter to send.",
      "hint.toolbar":
        "Tip: Select text and press B for **bold**. Use • to toggle bullet typing.",

      "common.show": "Show",
      "common.hide": "Hide",
      "common.fullscreen": "Fullscreen",
      "common.clear": "Clear",
      "common.send": "Send",
      "common.cancel": "Cancel",
      "common.remove": "Remove",

      "btn.print": "Print",
      "btn.downloadPdf": "Download PDF",
      "btn.downloadHtml": "Download HTML",
      "btn.addEducation": "+ Add education",
      "btn.addLicense": "+ Add license",
      "btn.addJob": "+ Add job",
      "btn.addVolunteer": "+ Add volunteer",

      "contact.fullName": "Full name",
      "contact.title": "Title / Credentials",
      "contact.email": "Email",
      "contact.phone": "Phone",
      "contact.location": "Location",
      "contact.linkedin": "LinkedIn",

      "lang.title": "Choose language",

      "locked.title": "Access required",
      "locked.body1": "You need access to use the CV Builder.",
      "locked.body2":
        "If you just purchased: you will receive an email shortly with your secure login link.",
      "locked.buy": "Buy access",
      "locked.body3":
        "After purchase, you’ll receive an email shortly with your secure login link. Your access is valid for 30 days.",

      // Structured blocks (dynamic)
      "edu.blockTitle": "Education",
      "edu.degree": "Degree",
      "edu.school": "School",
      "edu.dates": "Dates",
      "edu.honors": "Honors (optional)",

      "lic.blockTitle": "License",
      "lic.title": "Title",
      "lic.detail": "Detail",

      "exp.blockTitle": "Job",
      "exp.role": "Role / Title",
      "exp.meta": "Company, Location | Dates",
      "exp.bullets": "Bullets (one per line)",
      "exp.placeholderRole": "SENIOR REGISTERED NURSE – ICU",
      "exp.placeholderMeta": "St. David's Medical Center, Austin, TX | January 2021 – Present",
      "exp.placeholderBullets": "One per line...",

      "vol.blockTitle": "Volunteer",
      "vol.header": "Header (Title + Date)",
      "vol.sub": "Sub line",
      "vol.bullets": "Bullets (one per line)",
      "vol.placeholderHeader": "Volunteer Nurse 2019 – Present",
      "vol.placeholderSub": "Austin Free Clinic · Community Health Outreach",
      "vol.placeholderBullets": "One per line...",

      // AI (dynamic)
      "ai.thinking": "AI is analyzing your CV and preparing suggestions...",
      "ai.suggestionTitle": "Suggestion",
      "ai.choose": "Choose which suggestions to apply:",
      "ai.accept": "Accept",
      "ai.reject": "Reject",
      "ai.applied": "Applied ✓",
      "ai.rejected": "Rejected",
      "ai.you": "You"
    },

    no: {
      "app.title": "CV-bygger",
      "topbar.panels": "Paneler",
      "topbar.logout": "Logg ut",
      "editor.title": "Rediger innhold",
      "preview.title": "Forhåndsvisning",
      "ai.title": "AI Coach",
      "ai.helptext":
        "Be om gjennomgang, forbedringer, nye punkter eller layout. Du må godkjenne forslag før de brukes.",
      "hint.send": "Tips: Ctrl/Cmd + Enter for å sende.",
      "hint.toolbar":
        "Tips: Marker tekst og trykk B for **fet**. Bruk • for bullet-modus.",

      "common.show": "Vis",
      "common.hide": "Skjul",
      "common.fullscreen": "Fullskjerm",
      "common.clear": "Tøm",
      "common.send": "Send",
      "common.cancel": "Avbryt",
      "common.remove": "Fjern",

      "btn.print": "Skriv ut",
      "btn.downloadPdf": "Last ned PDF",
      "btn.downloadHtml": "Last ned HTML",
      "btn.addEducation": "+ Legg til utdanning",
      "btn.addLicense": "+ Legg til lisens",
      "btn.addJob": "+ Legg til jobb",
      "btn.addVolunteer": "+ Legg til frivillig",

      "contact.fullName": "Fullt navn",
      "contact.title": "Tittel / Kompetanse",
      "contact.email": "E-post",
      "contact.phone": "Telefon",
      "contact.location": "Sted",
      "contact.linkedin": "LinkedIn",

      "lang.title": "Velg språk",

      "locked.title": "Tilgang kreves",
      "locked.body1": "Du trenger tilgang for å bruke CV-byggeren.",
      "locked.body2":
        "Hvis du nettopp kjøpte: du får en e-post snart med sikker innloggingslenke.",
      "locked.buy": "Kjøp tilgang",
      "locked.body3":
        "Etter kjøp får du en e-post snart med sikker innloggingslenke. Tilgangen varer i 30 dager.",

      "edu.blockTitle": "Utdanning",
      "edu.degree": "Grad",
      "edu.school": "Skole",
      "edu.dates": "Datoer",
      "edu.honors": "Utmerkelser (valgfritt)",

      "lic.blockTitle": "Lisens",
      "lic.title": "Tittel",
      "lic.detail": "Detalj",

      "exp.blockTitle": "Jobb",
      "exp.role": "Rolle / Tittel",
      "exp.meta": "Bedrift, sted | Datoer",
      "exp.bullets": "Punkter (én per linje)",
      "exp.placeholderRole": "SYKEPLEIER – INTENSIV",
      "exp.placeholderMeta": "St. David's Medical Center, Austin, TX | Januar 2021 – Nå",
      "exp.placeholderBullets": "Én per linje...",

      "vol.blockTitle": "Frivillig",
      "vol.header": "Header (tittel + dato)",
      "vol.sub": "Underlinje",
      "vol.bullets": "Punkter (én per linje)",
      "vol.placeholderHeader": "Frivillig sykepleier 2019 – Nå",
      "vol.placeholderSub": "Austin Free Clinic · Community Health Outreach",
      "vol.placeholderBullets": "Én per linje...",

      "ai.thinking": "AI analyserer CV-en din og forbereder forslag...",
      "ai.suggestionTitle": "Forslag",
      "ai.choose": "Velg hvilke forslag du vil bruke:",
      "ai.accept": "Bruk",
      "ai.reject": "Avvis",
      "ai.applied": "Brukt ✓",
      "ai.rejected": "Avvist",
      "ai.you": "Du"
    },

    de: {
      "app.title": "CV Builder",
      "topbar.panels": "Panels",
      "topbar.logout": "Abmelden",
      "editor.title": "Inhalte bearbeiten",
      "preview.title": "Vorschau",
      "ai.title": "KI-Coach",
      "ai.helptext":
        "Bitte um Review, Verbesserungen, neue Bulletpoints oder Layout. Vorschläge müssen bestätigt werden.",
      "hint.send": "Tipp: Strg/Cmd + Enter zum Senden.",
      "hint.toolbar": "Tipp: Text markieren und B für **fett**. • für Bullet-Modus.",

      "common.show": "Anzeigen",
      "common.hide": "Ausblenden",
      "common.fullscreen": "Vollbild",
      "common.clear": "Leeren",
      "common.send": "Senden",
      "common.cancel": "Abbrechen",
      "common.remove": "Entfernen",

      "btn.print": "Drucken",
      "btn.downloadPdf": "PDF herunterladen",
      "btn.downloadHtml": "HTML herunterladen",
      "btn.addEducation": "+ Ausbildung hinzufügen",
      "btn.addLicense": "+ Lizenz hinzufügen",
      "btn.addJob": "+ Job hinzufügen",
      "btn.addVolunteer": "+ Ehrenamt hinzufügen",

      "contact.fullName": "Vollständiger Name",
      "contact.title": "Titel / Qualifikation",
      "contact.email": "E-Mail",
      "contact.phone": "Telefon",
      "contact.location": "Ort",
      "contact.linkedin": "LinkedIn",

      "lang.title": "Sprache wählen",

      "edu.blockTitle": "Ausbildung",
      "edu.degree": "Abschluss",
      "edu.school": "Schule",
      "edu.dates": "Zeitraum",
      "edu.honors": "Auszeichnungen (optional)",

      "lic.blockTitle": "Lizenz",
      "lic.title": "Titel",
      "lic.detail": "Details",

      "exp.blockTitle": "Job",
      "exp.role": "Rolle / Titel",
      "exp.meta": "Firma, Ort | Zeitraum",
      "exp.bullets": "Bulletpoints (eine pro Zeile)",
      "exp.placeholderRole": "SENIOR REGISTERED NURSE – ICU",
      "exp.placeholderMeta": "St. David's Medical Center, Austin, TX | Januar 2021 – Heute",
      "exp.placeholderBullets": "Eine pro Zeile...",

      "vol.blockTitle": "Ehrenamt",
      "vol.header": "Header (Titel + Datum)",
      "vol.sub": "Unterzeile",
      "vol.bullets": "Bulletpoints (eine pro Zeile)",
      "vol.placeholderHeader": "Volunteer Nurse 2019 – Heute",
      "vol.placeholderSub": "Austin Free Clinic · Community Health Outreach",
      "vol.placeholderBullets": "Eine pro Zeile...",

      "ai.thinking": "Die KI analysiert deinen Lebenslauf und erstellt Vorschläge...",
      "ai.suggestionTitle": "Vorschlag",
      "ai.choose": "Wähle aus, welche Vorschläge du anwenden möchtest:",
      "ai.accept": "Annehmen",
      "ai.reject": "Ablehnen",
      "ai.applied": "Angewendet ✓",
      "ai.rejected": "Abgelehnt",
      "ai.you": "Du"
    }
  };

  // Standard seksjonstitler (for preview/template og for editor-titler hvis tomme)
  const SECTION_DEFAULTS = {
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
      custom2: "Custom Section 2"
    },
    no: {
      summary: "Profesjonell oppsummering",
      education: "Utdanning",
      licenses: "Lisenser og sertifiseringer",
      clinicalSkills: "Kliniske ferdigheter",
      coreCompetencies: "Kjernekompetanse",
      languages: "Språk",
      experience: "Arbeidserfaring",
      achievements: "Resultater / Utmerkelser",
      volunteer: "Frivillig erfaring",
      custom1: "Egendefinert seksjon 1",
      custom2: "Egendefinert seksjon 2"
    },
    de: {
      summary: "Profil",
      education: "Ausbildung",
      licenses: "Lizenzen & Zertifikate",
      clinicalSkills: "Fachliche Fähigkeiten",
      coreCompetencies: "Kernkompetenzen",
      languages: "Sprachen",
      experience: "Berufserfahrung",
      achievements: "Erfolge",
      volunteer: "Ehrenamt",
      custom1: "Benutzerdefiniert 1",
      custom2: "Benutzerdefiniert 2"
    }
  };

  function t(lang, key) {
    const L = lang || "en";
    return (I18N[L] && I18N[L][key]) || (I18N.en && I18N.en[key]) || key;
  }

  function getSectionDefaultTitle(lang, sectionKey) {
    const L = lang || "en";
    const m = SECTION_DEFAULTS[L] || SECTION_DEFAULTS.en;
    return m[sectionKey] || sectionKey;
  }

  // eksponer
  window.CV_I18N = {
    LANGS,
    I18N,
    SECTION_DEFAULTS,
    t,
    getSectionDefaultTitle
  };
})();
