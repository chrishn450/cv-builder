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

    const html = parts.map(p => {
      const m = p.match(/^\*\*([^*]+)\*\*$/);
      if (m) return `<strong>${esc(m[1])}</strong>`;
      return esc(p);
    }).join("");

    if (!preserveNewlines) return html;

    return html.replace(/\n/g, "<br>");
  }

  function hasText(v){
    return v != null && String(v).trim().length > 0;
  }

  function lines(s){
    if (!s) return [];
    return String(s)
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
  }

  function blocks(s){
    if (!s) return [];
    return String(s)
      .split(/\n\s*\n/)
      .map(b => b.trim())
      .filter(Boolean);
  }

  function mergeWrappedLinesIntoBullets(rawLines){

    const out = [];

    rawLines.forEach(ln => {

      let line = String(ln || "").trim();

      if (!line) return;

      const m = line.match(/^([•\-·])\s+/);

      const isExplicitBullet = !!m;

      if (isExplicitBullet){

        line = line.replace(/^([•\-·])\s+/, "");

        out.push(line);

        return;
      }

      if (out.length > 0){

        out[out.length-1] = (out[out.length-1] + " " + line)
          .replace(/\s+/g, " ")
          .trim();

      } else {

        out.push(line);

      }

    });

    return out;

  }

  function parseExperience(s,{ mergeWrapped = true }={}){

    return blocks(s).map(block => {

      const ls = block.split("\n").map(l=>l.trim()).filter(Boolean);

      const title = ls[0] || "";

      const meta = ls[1] || "";

      const rawBullets = ls.slice(2);

      const bullets = mergeWrapped
        ? mergeWrappedLinesIntoBullets(rawBullets)
        : rawBullets;

      return { title, meta, bullets };

    });

  }

  function parseEducation(s){

    return blocks(s).map(block => {

      const ls = block.split("\n").map(l=>l.trim()).filter(Boolean);

      return {
        degree: ls[0] || "",
        school: ls[1] || "",
        date: ls[2] || "",
        honors: ls.slice(3).join(" ")
      };

    });

  }

  function parseVolunteer(s,{ presentWord="Present", mergeWrapped=true }={}){

    return blocks(s).map(block => {

      const ls = block.split("\n").map(l=>l.trim()).filter(Boolean);

      let volTitle = ls[0] || "";

      let volDate = "";

      const m = volTitle.match(/^(.+?)\s*\|\s*(.+)$/);

      if (m){
        volTitle = m[1];
        volDate = m[2];
      }

      const volSub = ls[1] || "";

      const rawBullets = ls.slice(2);

      const volBullets = mergeWrapped
        ? mergeWrappedLinesIntoBullets(rawBullets)
        : rawBullets;

      return { volTitle, volDate, volSub, volBullets };

    });

  }

  function renderSimpleSection({
    title,
    content,
    mode,
    boldFirstLine,
    autoDots
  }){

    const items = lines(content);

    if (!items.length) return "";

    if (mode === "paragraph"){

      const ps = items.map((t,idx)=>{

        const inner = fmtInline(t);

        if (boldFirstLine && idx===0)
          return `<p><strong>${inner}</strong></p>`;

        return `<p>${inner}</p>`;

      }).join("");

      return `
        <section>
          <h2 class="section-title">${esc(title)}</h2>
          <div class="lang-list">${ps}</div>
        </section>
      `;

    }

    const cls = autoDots ? "auto-dots" : "no-auto-dots";

    const lis = items.map((t,idx)=>{

      const inner = fmtInline(t,true);

      if (boldFirstLine && idx===0)
        return `<li><strong>${inner}</strong></li>`;

      return `<li>${inner}</li>`;

    }).join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        <ul class="skill-list ${cls}">${lis}</ul>
      </section>
    `;

  }

  function renderEducationSection(title, educationText){

    const edu = parseEducation(educationText);

    if (!edu.length) return "";

    const eduHTML = edu.map(e=>`
      <div class="edu-block">
        <h3>${fmtInline(e.degree)}</h3>
        ${e.school?`<p>${fmtInline(e.school)}</p>`:""}
        ${e.date?`<p class="date">${fmtInline(e.date)}</p>`:""}
        ${e.honors?`<p class="honors">${fmtInline(e.honors)}</p>`:""}
      </div>
    `).join("");

    return `
      <section>
        <h2 class="section-title">${esc(title)}</h2>
        ${eduHTML}
      </section>
    `;

  }

  function renderLicensesSection(title, licensesText){

    const licLines = lines(licensesText);

    if (!licLines.length) return "";

    let licHTML="";

    for(let i=0;i<licLines.length;i+=2){

      licHTML += `
        <div class="cert-item">
          <h3>${fmtInline(licLines[i]||"")}</h3>
          ${licLines[i+1]?`<p>${fmtInline(licLines[i+1])}</p>`:""}
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

  window.renderCV = function renderCV(raw){

    const data = raw || {};

    const lang = data.lang || "en";

    const CVI = window.CV_I18N || {};

    const getDefaultTitle =
      (key)=>CVI.getSectionDefaultTitle
        ? CVI.getSectionDefaultTitle(lang,key)
        : key;

    const defaults = {

      name:"Sarah Johnson",

      title:"Registered Nurse · BSN, RN",

      phone:"(555) 123-4567",

      email:"sarah@email.com",

      location:"Austin, TX",

      linkedin:"linkedin.com/in/sarah",

      summary:"Compassionate Registered Nurse with extensive ICU and emergency experience.",

      education:
        "Master of Science in Nursing\n"+
        "University of Texas\n"+
        "2018\n\n"+
        "Bachelor of Science in Nursing\n"+
        "University of Texas\n"+
        "2016",

      licenses:
        "Registered Nurse (RN)\n"+
        "State Board of Nursing · License active through 2028\n"+
        "Critical Care Certification (CCRN)\n"+
        "National Certification Authority · Renewal 2026\n"+
        "ACLS\n"+
        "American Heart Association · Valid until 2027\n"+
        "Basic Life Support (BLS)\n"+
        "American Heart Association · Valid until 2027",

      clinicalSkills:
        "Patient assessment\n"+
        "Medication administration\n"+
        "Ventilator management\n"+
        "IV therapy",

      coreCompetencies:
        "Leadership\n"+
        "Communication\n"+
        "Clinical judgment",

      languages:"English (Native)",

      experience:"",
      achievements:"",
      volunteer:""
    };

    const d={};

    const isDefault={};

    Object.keys(defaults).forEach(k=>{

      if (hasText(data[k])){

        d[k]=data[k];
        isDefault[k]=false;

      } else {

        d[k]=defaults[k];
        isDefault[k]=true;

      }

    });

    const sections = {

      summary:{enabled:true},

      education:{enabled:true},

      licenses:{enabled:true},

      clinicalSkills:{enabled:true},

      coreCompetencies:{enabled:false},   // unchecked default

      languages:{enabled:true},

      experience:{enabled:true},

      achievements:{enabled:false},      // unchecked default

      volunteer:{enabled:false},         // unchecked default

      ...(data.sections||{})

    };

    const leftHTML=[

      sections.education.enabled
        ? renderEducationSection(
            getDefaultTitle("education"),
            d.education
          )
        : "",

      sections.licenses.enabled
        ? renderLicensesSection(
            getDefaultTitle("licenses"),
            d.licenses
          )
        : "",

      sections.clinicalSkills.enabled
        ? renderSimpleSection({
            title:getDefaultTitle("clinicalSkills"),
            content:d.clinicalSkills,
            mode:"bullets",
            autoDots:isDefault.clinicalSkills
          })
        : "",

      sections.coreCompetencies.enabled
        ? renderSimpleSection({
            title:getDefaultTitle("coreCompetencies"),
            content:d.coreCompetencies,
            mode:"bullets",
            autoDots:isDefault.coreCompetencies
          })
        : ""

    ].join("");

    const rightHTML=[

      sections.summary.enabled
        ? renderSimpleSection({
            title:getDefaultTitle("summary"),
            content:d.summary,
            mode:"paragraph"
          })
        : ""

    ].join("");

    return `
      <div class="cv">
        <header class="cv-header">
          <h1 class="cv-name">${esc(d.name)}</h1>
          <p class="cv-title">${esc(d.title)}</p>
        </header>
        <div class="cv-body">
          <div class="cv-left">${leftHTML}</div>
          <div class="cv-right">${rightHTML}</div>
        </div>
      </div>
    `;

  };

})();
