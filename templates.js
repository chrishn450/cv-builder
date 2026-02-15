// templates.js – exposes window.renderCV(data) → HTML string
(function () {
  function esc(s) {
    if (!s) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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
    // Groups separated by blank line.
    // Each group can be 2–5 lines: degree, school, date, optional honors.
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

  window.renderCV = function renderCV(data) {
    const d = data || {};

    // Contact line
    const contactParts = [d.phone, d.email, d.location, d.linkedin].filter(Boolean);
    const contactHTML = contactParts
      .map((p, i) => {
        const sep = i < contactParts.length - 1 ? ' <span class="sep">|</span> ' : "";
        return "<span>" + esc(p) + "</span>" + sep;
      })
      .join("");

    // Education
    const edu = parseEducation(d.education);
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

    // Licenses (pairs of lines)
    const licLines = lines(d.licenses);
    let licHTML = "";
    for (let j = 0; j < licLines.length; j += 2) {
      licHTML += `
        <div class="cert-item">
          <h3>${esc(licLines[j] || "")}</h3>
          ${licLines[j + 1] ? `<p>${esc(licLines[j + 1])}</p>` : ""}
        </div>`;
    }

    function listHTML(field, cls) {
      const items = lines(field);
      if (!items.length) return "";
      return `<ul class="${cls}">` + items.map((s) => `<li>${esc(s)}</li>`).join("") + `</ul>`;
    }

    const langHTML =
      `<div class="lang-list">` +
      lines(d.languages).map((l) => `<p>${esc(l)}</p>`).join("") +
      `</div>`;

    const exps = parseExperience(d.experience);
    const expHTML = exps
      .map((e) => {
        const bullets = e.bullets.map((b) => `<li>${esc(b)}</li>`).join("");
        return `
          <div class="exp-entry">
            <h3>${esc(e.title)}</h3>
            ${e.meta ? `<p class="meta">${esc(e.meta)}</p>` : ""}
            ${bullets ? `<ul class="exp-bullets">${bullets}</ul>` : ""}
          </div>`;
      })
      .join("");

    const achHTML = listHTML(d.achievements, "achievement-list");

    // Volunteer
    const volLines = lines(d.volunteer);
    let volHTML = "";
    if (volLines.length) {
      let volTitle = volLines[0] || "";
      let volDate = "";
      const m = volTitle.match(/^(.+?)\s*\|\s*(.+)$/);
      if (m) {
        volTitle = m[1];
        volDate = m[2];
      }
      const volSub = volLines[1] || "";
      const volBullets = volLines.slice(2);
      volHTML = `
        <div class="vol-header">
          <h3>${esc(volTitle)}</h3>
          ${volDate ? `<span class="date">${esc(volDate)}</span>` : ""}
        </div>
        ${volSub ? `<p class="vol-sub">${esc(volSub)}</p>` : ""}
        ${volBullets.length ? `<ul class="exp-bullets">${volBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}
      `;
    }

    return `
      <div class="cv">
        <header class="cv-header">
          <h1 class="cv-name">${esc(d.name || "")}</h1>
          <p class="cv-title">${esc(d.title || "")}</p>
          <div class="cv-contact">${contactHTML}</div>
        </header>

        <section class="cv-summary">
          <h2 class="section-title">Professional Summary</h2>
          <p class="body-text">${esc(d.summary || "")}</p>
        </section>

        <div class="cv-body">
          <div class="cv-left">
            <section>
              <h2 class="section-title">Education</h2>
              ${eduHTML}
            </section>

            <section>
              <h2 class="section-title">Licenses &amp; Certifications</h2>
              ${licHTML}
            </section>

            <section>
              <h2 class="section-title">Clinical Skills</h2>
              ${listHTML(d.clinicalSkills, "skill-list")}
            </section>

            <section>
              <h2 class="section-title">Core Competencies</h2>
              ${listHTML(d.coreCompetencies, "skill-list")}
            </section>

            <section>
              <h2 class="section-title">Languages</h2>
              ${langHTML}
            </section>
          </div>

          <div class="cv-right">
            <section>
              <h2 class="section-title">Professional Experience</h2>
              ${expHTML}
            </section>

            <section>
              <h2 class="section-title">Clinical Achievements</h2>
              ${achHTML}
            </section>

            <section>
              <h2 class="section-title">Volunteer Experience</h2>
              ${volHTML}
            </section>
          </div>
        </div>
      </div>
    `;
  };
})();
