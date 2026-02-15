window.CVTemplates = {
  classic: function(data){
    const esc = (s="") => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const lines = (s="") => String(s).split("\n").map(x=>x.trim()).filter(Boolean);

    const skills = (data.skills||"").split(",").map(x=>x.trim()).filter(Boolean);

    return `
      <div>
        <h1>${esc(data.name||"Ditt navn")}</h1>
        <div class="muted">${esc(data.title||"Din tittel")}</div>

        <div class="topline">
          ${data.email ? `<span class="pill">${esc(data.email)}</span>` : ``}
          ${data.phone ? `<span class="pill">${esc(data.phone)}</span>` : ``}
        </div>

        ${data.summary ? `<h2>Profil</h2><p>${esc(data.summary)}</p>` : ``}

        ${lines(data.experience).length ? `
          <h2>Erfaring</h2>
          <ul>
            ${lines(data.experience).map(x=>`<li>${esc(x)}</li>`).join("")}
          </ul>
        ` : ``}

        ${lines(data.education).length ? `
          <h2>Utdanning</h2>
          <ul>
            ${lines(data.education).map(x=>`<li>${esc(x)}</li>`).join("")}
          </ul>
        ` : ``}

        ${skills.length ? `
          <h2>Ferdigheter</h2>
          <div class="topline">
            ${skills.map(s=>`<span class="pill">${esc(s)}</span>`).join("")}
          </div>
        ` : ``}
      </div>
    `;
  }
};
