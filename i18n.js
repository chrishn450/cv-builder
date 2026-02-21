// i18n.js
(function () {
  const LANGS = [
    { code: "en", name: "English" },
    { code: "no", name: "Norsk" },
    { code: "de", name: "Deutsch" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" }
  ];

  const I18N = {
    en: {
      // App UI
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

      // Editor section labels (these fix the “sec.summary.label” issue)
      "sec.summary.label": "Summary",
      "sec.education.label": "Education",
      "sec.licenses.label": "Licenses",
      "sec.clinicalSkills.label": "Skills", // ✅ CHANGED
      "sec.coreCompetencies.label": "Core Competencies",
      "sec.languages.label": "Languages",
      "sec.experience.label": "Experience",
      "sec.achievements.label": "Achievements",
      "sec.volunteer.label": "Volunteer",
      "sec.custom1.label": "Custom 1",
      "sec.custom2.label": "Custom 2",

      // Placeholders (faded text)
      "ph.summary": "Write your summary...",
      "ph.ai": "Write a message to AI...",

      // Structured blocks (dynamic UI)
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

      // AI (dynamic UI)
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

      "sec.summary.label": "Oppsummering",
      "sec.education.label": "Utdanning",
      "sec.licenses.label": "Lisenser",
      "sec.clinicalSkills.label": "Ferdigheter", // ✅ CHANGED
      "sec.coreCompetencies.label": "Kjernekompetanse",
      "sec.languages.label": "Språk",
      "sec.experience.label": "Erfaring",
      "sec.achievements.label": "Resultater",
      "sec.volunteer.label": "Frivillig",
      "sec.custom1.label": "Egendefinert 1",
      "sec.custom2.label": "Egendefinert 2",

      "ph.summary": "Skriv oppsummeringen din...",
      "ph.ai": "Skriv en melding til AI...",

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

      "sec.summary.label": "Profil",
      "sec.education.label": "Ausbildung",
      "sec.licenses.label": "Lizenzen",
      "sec.clinicalSkills.label": "Skills", // ✅ CHANGED (was Fähigkeiten)
      "sec.coreCompetencies.label": "Kernkompetenzen",
      "sec.languages.label": "Sprachen",
      "sec.experience.label": "Berufserfahrung",
      "sec.achievements.label": "Erfolge",
      "sec.volunteer.label": "Ehrenamt",
      "sec.custom1.label": "Benutzerdefiniert 1",
      "sec.custom2.label": "Benutzerdefiniert 2",

      "ph.summary": "Schreibe deine Zusammenfassung...",
      "ph.ai": "Schreibe eine Nachricht an die KI...",

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
    },

    es: {
      "app.title": "Creador de CV",
      "topbar.panels": "Paneles",
      "topbar.logout": "Cerrar sesión",
      "editor.title": "Editar contenido",
      "preview.title": "Vista previa",
      "ai.title": "Coach IA",
      "ai.helptext":
        "Pide revisión, mejoras, nuevos puntos o cambios de diseño. Debes aprobar las sugerencias antes de aplicarlas.",
      "hint.send": "Consejo: Ctrl/Cmd + Enter para enviar.",
      "hint.toolbar": "Consejo: Selecciona texto y pulsa B para **negrita**. Usa • para modo viñetas.",

      "common.show": "Mostrar",
      "common.hide": "Ocultar",
      "common.fullscreen": "Pantalla completa",
      "common.clear": "Limpiar",
      "common.send": "Enviar",
      "common.cancel": "Cancelar",
      "common.remove": "Eliminar",

      "btn.print": "Imprimir",
      "btn.downloadPdf": "Descargar PDF",
      "btn.downloadHtml": "Descargar HTML",
      "btn.addEducation": "+ Añadir educación",
      "btn.addLicense": "+ Añadir licencia",
      "btn.addJob": "+ Añadir trabajo",
      "btn.addVolunteer": "+ Añadir voluntariado",

      "contact.fullName": "Nombre completo",
      "contact.title": "Título / Credenciales",
      "contact.email": "Email",
      "contact.phone": "Teléfono",
      "contact.location": "Ubicación",
      "contact.linkedin": "LinkedIn",

      "lang.title": "Elegir idioma",

      "sec.summary.label": "Resumen",
      "sec.education.label": "Educación",
      "sec.licenses.label": "Licencias",
      "sec.clinicalSkills.label": "Skills", // ✅ CHANGED
      "sec.coreCompetencies.label": "Competencias clave",
      "sec.languages.label": "Idiomas",
      "sec.experience.label": "Experiencia",
      "sec.achievements.label": "Logros",
      "sec.volunteer.label": "Voluntariado",
      "sec.custom1.label": "Personalizado 1",
      "sec.custom2.label": "Personalizado 2",

      "ph.summary": "Escribe tu resumen...",
      "ph.ai": "Escribe un mensaje a la IA...",

      "edu.blockTitle": "Educación",
      "edu.degree": "Título",
      "edu.school": "Centro",
      "edu.dates": "Fechas",
      "edu.honors": "Honores (opcional)",

      "lic.blockTitle": "Licencia",
      "lic.title": "Título",
      "lic.detail": "Detalle",

      "exp.blockTitle": "Trabajo",
      "exp.role": "Puesto / Título",
      "exp.meta": "Empresa, lugar | Fechas",
      "exp.bullets": "Puntos (uno por línea)",
      "exp.placeholderRole": "ENFERMERA/O – UCI",
      "exp.placeholderMeta": "Hospital, Ciudad | Enero 2021 – Actualidad",
      "exp.placeholderBullets": "Uno por línea...",

      "vol.blockTitle": "Voluntariado",
      "vol.header": "Encabezado (título + fecha)",
      "vol.sub": "Línea secundaria",
      "vol.bullets": "Puntos (uno por línea)",
      "vol.placeholderHeader": "Enfermera voluntaria 2019 – Actualidad",
      "vol.placeholderSub": "Clínica · Programa comunitario",
      "vol.placeholderBullets": "Uno por línea...",

      "ai.thinking": "La IA está analizando tu CV y preparando sugerencias...",
      "ai.suggestionTitle": "Sugerencia",
      "ai.choose": "Elige qué sugerencias aplicar:",
      "ai.accept": "Aceptar",
      "ai.reject": "Rechazar",
      "ai.applied": "Aplicado ✓",
      "ai.rejected": "Rechazado",
      "ai.you": "Tú"
    },

    fr: {
      "app.title": "Créateur de CV",
      "topbar.panels": "Panneaux",
      "topbar.logout": "Se déconnecter",
      "editor.title": "Modifier le contenu",
      "preview.title": "Aperçu",
      "ai.title": "Coach IA",
      "ai.helptext":
        "Demande une relecture, des améliorations, de nouveaux points ou des changements de mise en page. Tu dois approuver les suggestions avant application.",
      "hint.send": "Astuce : Ctrl/Cmd + Entrée pour envoyer.",
      "hint.toolbar": "Astuce : Sélectionne du texte puis B pour **gras**. • pour le mode puces.",

      "common.show": "Afficher",
      "common.hide": "Masquer",
      "common.fullscreen": "Plein écran",
      "common.clear": "Effacer",
      "common.send": "Envoyer",
      "common.cancel": "Annuler",
      "common.remove": "Supprimer",

      "btn.print": "Imprimer",
      "btn.downloadPdf": "Télécharger PDF",
      "btn.downloadHtml": "Télécharger HTML",
      "btn.addEducation": "+ Ajouter formation",
      "btn.addLicense": "+ Ajouter licence",
      "btn.addJob": "+ Ajouter poste",
      "btn.addVolunteer": "+ Ajouter bénévolat",

      "contact.fullName": "Nom complet",
      "contact.title": "Titre / Diplômes",
      "contact.email": "E-mail",
      "contact.phone": "Téléphone",
      "contact.location": "Lieu",
      "contact.linkedin": "LinkedIn",

      "lang.title": "Choisir la langue",

      "sec.summary.label": "Résumé",
      "sec.education.label": "Formation",
      "sec.licenses.label": "Licences",
      "sec.clinicalSkills.label": "Skills", // ✅ CHANGED
      "sec.coreCompetencies.label": "Compétences clés",
      "sec.languages.label": "Langues",
      "sec.experience.label": "Expérience",
      "sec.achievements.label": "Réalisations",
      "sec.volunteer.label": "Bénévolat",
      "sec.custom1.label": "Personnalisé 1",
      "sec.custom2.label": "Personnalisé 2",

      "ph.summary": "Écris ton résumé...",
      "ph.ai": "Écris un message à l’IA...",

      "edu.blockTitle": "Formation",
      "edu.degree": "Diplôme",
      "edu.school": "Établissement",
      "edu.dates": "Dates",
      "edu.honors": "Mentions (optionnel)",

      "lic.blockTitle": "Licence",
      "lic.title": "Titre",
      "lic.detail": "Détail",

      "exp.blockTitle": "Poste",
      "exp.role": "Rôle / Titre",
      "exp.meta": "Entreprise, lieu | Dates",
      "exp.bullets": "Puces (une par ligne)",
      "exp.placeholderRole": "INFIRMIER/ÈRE – RÉANIMATION",
      "exp.placeholderMeta": "Hôpital, Ville | Janvier 2021 – Présent",
      "exp.placeholderBullets": "Une par ligne...",

      "vol.blockTitle": "Bénévolat",
      "vol.header": "En-tête (titre + date)",
      "vol.sub": "Sous-ligne",
      "vol.bullets": "Puces (une par ligne)",
      "vol.placeholderHeader": "Infirmier/ère bénévole 2019 – Présent",
      "vol.placeholderSub": "Clinique · Programme communautaire",
      "vol.placeholderBullets": "Une par ligne...",

      "ai.thinking": "L’IA analyse ton CV et prépare des suggestions...",
      "ai.suggestionTitle": "Suggestion",
      "ai.choose": "Choisis quelles suggestions appliquer :",
      "ai.accept": "Accepter",
      "ai.reject": "Refuser",
      "ai.applied": "Appliqué ✓",
      "ai.rejected": "Refusé",
      "ai.you": "Toi"
    }
  };

  const SECTION_DEFAULTS = {
    en: {
      summary: "Professional Summary",
      education: "Education",
      licenses: "Licenses & Certifications",
      clinicalSkills: "Skills", // ✅ CHANGED
      coreCompetencies: "Core Competencies",
      languages: "Languages",
      experience: "Professional Experience",
      achievements: "Achievements", // ✅ CHANGED (was Clinical Achievements)
      volunteer: "Volunteer Experience",
      custom1: "Custom Section 1",
      custom2: "Custom Section 2"
    },
    no: {
      summary: "Profesjonell oppsummering",
      education: "Utdanning",
      licenses: "Lisenser og sertifiseringer",
      clinicalSkills: "Ferdigheter", // ✅ CHANGED
      coreCompetencies: "Kjernekompetanse",
      languages: "Språk",
      experience: "Arbeidserfaring",
      achievements: "Prestasjoner", // ✅ CHANGED (was Resultater / Utmerkelser)
      volunteer: "Frivillig erfaring",
      custom1: "Egendefinert seksjon 1",
      custom2: "Egendefinert seksjon 2"
    },
    de: {
      summary: "Profil",
      education: "Ausbildung",
      licenses: "Lizenzen & Zertifikate",
      clinicalSkills: "Skills", // ✅ CHANGED
      coreCompetencies: "Kernkompetenzen",
      languages: "Sprachen",
      experience: "Berufserfahrung",
      achievements: "Erfolge",
      volunteer: "Ehrenamt",
      custom1: "Benutzerdefiniert 1",
      custom2: "Benutzerdefiniert 2"
    },
    es: {
      summary: "Resumen profesional",
      education: "Educación",
      licenses: "Licencias y certificaciones",
      clinicalSkills: "Skills", // ✅ CHANGED
      coreCompetencies: "Competencias clave",
      languages: "Idiomas",
      experience: "Experiencia profesional",
      achievements: "Logros",
      volunteer: "Voluntariado",
      custom1: "Sección personalizada 1",
      custom2: "Sección personalizada 2"
    },
    fr: {
      summary: "Résumé professionnel",
      education: "Formation",
      licenses: "Licences & certifications",
      clinicalSkills: "Skills", // ✅ CHANGED
      coreCompetencies: "Compétences clés",
      languages: "Langues",
      experience: "Expérience professionnelle",
      achievements: "Réalisations",
      volunteer: "Bénévolat",
      custom1: "Section personnalisée 1",
      custom2: "Section personnalisée 2"
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

  window.CV_I18N = {
    LANGS,
    I18N,
    SECTION_DEFAULTS,
    t,
    getSectionDefaultTitle
  };
})();
