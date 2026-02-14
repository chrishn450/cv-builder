// Two templates: nurse + engineering. Keep output as real text (ATS-friendly).
function esc(s){ return (s ?? '').toString()
  .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function linesToLis(text){
  const lines = (text||'').split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
  if(!lines.length) return '<div class="meta">—</div>';
  return '<ul class="list">' + lines.map(l=>`<li class="item">${esc(l)}</li>`).join('') + '</ul>';
}

function csvToTags(text){
  const items = (text||'').split(',').map(s=>s.trim()).filter(Boolean);
  if(!items.length) return '<div class="meta">—</div>';
  return '<div class="meta">' + items.map(esc).join('<br/>') + '</div>';
}

function renderTemplate(state){
  const t = state.template || 'nurse';
  if(t === 'engineering') return renderEngineering(state);
  return renderNurse(state);
}

function renderHeader(state){
  return `
    <h1 class="name">${esc(state.name || 'S A R A H  J O H N S O N')}</h1>
    <div class="role">${esc(state.title || 'REGISTERED NURSE · BSN, RN')}</div>
    <div class="contact">${esc(state.contactLine || '(555) 123-4567 | email | Oslo | LinkedIn')}</div>
    <div class="rule"></div>
  `;
}

function renderNurse(state){
  const expHtml = (state.experience||[]).map(e => `
    <div class="sec">
      <div class="kicker">${esc(e.role || 'REGISTERED NURSE')}</div>
      <div class="meta"><span class="where">${esc(e.org || 'Hospital / Clinic')}</span> · ${esc(e.loc || 'City')} | ${esc(e.dates || '2021 – Present')}</div>
      <ul class="bullets">
        ${(e.bullets||['Achievement with metric (e.g., treated 20+ patients daily)']).map(b=>`<li>${esc(b)}</li>`).join('')}
      </ul>
    </div>
  `).join('') || '<div class="meta">Legg til erfaring.</div>';

  const eduHtml = (state.education||[]).map(ed => `
    <div class="sec">
      <div class="kicker">${esc(ed.degree || 'Bachelor of Science in Nursing')}</div>
      <div class="meta"><span class="where">${esc(ed.school || 'University')}</span> · ${esc(ed.dates || '2016 – 2020')}</div>
      <div class="meta">${esc(ed.notes || 'Honors / GPA (optional)')}</div>
    </div>
  `).join('') || '<div class="meta">Legg til utdanning.</div>';

  const certHtml = (state.certs||[]).map(c => `
    <div class="sec">
      <div class="kicker">${esc(c.name || 'ACLS')}</div>
      <div class="meta">${esc(c.issuer || 'American Heart Association')} · ${esc(c.extra || 'Exp. Aug 2026')}</div>
    </div>
  `).join('') || '<div class="meta">Legg til sertifiseringer.</div>';

  return `
  <div class="cv">
    ${renderHeader(state)}
    <div class="grid">
      <div>
        <div class="sec">
          <div class="sec-title">Education</div>
          ${eduHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Licenses & Certifications</div>
          ${certHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Clinical Skills</div>
          ${csvToTags(state.skills)}
        </div>
        <div class="sec">
          <div class="sec-title">Core Competencies</div>
          ${csvToTags(state.core)}
        </div>
        <div class="sec">
          <div class="sec-title">Languages</div>
          ${csvToTags(state.languages)}
        </div>
        <div class="small-note">Tip: Keep text simple for ATS. Avoid icons/graphics.</div>
      </div>
      <div>
        <div class="sec">
          <div class="sec-title">Professional Summary</div>
          <p class="p">${esc(state.summary || 'Compassionate and detail-oriented Registered Nurse with experience...')}</p>
        </div>
        <div class="sec">
          <div class="sec-title">Professional Experience</div>
          ${expHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Clinical Achievements</div>
          ${linesToLis(state.achievements)}
        </div>
        <div class="sec">
          <div class="sec-title">Volunteer Experience</div>
          ${linesToLis(state.volunteer)}
        </div>
      </div>
    </div>
  </div>
  `;
}

function renderEngineering(state){
  const expHtml = (state.experience||[]).map(e => `
    <div class="sec">
      <div class="kicker">${esc(e.role || 'PROCESS ENGINEER')}</div>
      <div class="meta"><span class="where">${esc(e.org || 'Company')}</span> · ${esc(e.loc || 'City')} | ${esc(e.dates || '2022 – Present')}</div>
      <ul class="bullets">
        ${(e.bullets||['Reduced energy consumption by 12% by optimizing ...']).map(b=>`<li>${esc(b)}</li>`).join('')}
      </ul>
    </div>
  `).join('') || '<div class="meta">Legg til erfaring.</div>';

  const eduHtml = (state.education||[]).map(ed => `
    <div class="sec">
      <div class="kicker">${esc(ed.degree || 'MSc Mechanical Engineering')}</div>
      <div class="meta"><span class="where">${esc(ed.school || 'University')}</span> · ${esc(ed.dates || '2020 – 2025')}</div>
      <div class="meta">${esc(ed.notes || 'Thesis / specialization (optional)')}</div>
    </div>
  `).join('') || '<div class="meta">Legg til utdanning.</div>';

  const certHtml = (state.certs||[]).map(c => `
    <div class="sec">
      <div class="kicker">${esc(c.name || 'CSWA / AWS / GWO')}</div>
      <div class="meta">${esc(c.issuer || 'Issuer')} · ${esc(c.extra || 'Year / status')}</div>
    </div>
  `).join('') || '<div class="meta">Legg til sertifiseringer.</div>';

  return `
  <div class="cv">
    ${renderHeader(state)}
    <div class="grid">
      <div>
        <div class="sec">
          <div class="sec-title">Education</div>
          ${eduHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Certifications</div>
          ${certHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Technical Skills</div>
          ${csvToTags(state.skills)}
        </div>
        <div class="sec">
          <div class="sec-title">Tools</div>
          ${csvToTags(state.core)}
        </div>
        <div class="sec">
          <div class="sec-title">Languages</div>
          ${csvToTags(state.languages)}
        </div>
        <div class="small-note">Tip: Keep layout clean for ATS. Avoid tables/icons.</div>
      </div>
      <div>
        <div class="sec">
          <div class="sec-title">Professional Summary</div>
          <p class="p">${esc(state.summary || 'Results-driven engineer with experience in CFD, process optimization...')}</p>
        </div>
        <div class="sec">
          <div class="sec-title">Experience</div>
          ${expHtml}
        </div>
        <div class="sec">
          <div class="sec-title">Key Achievements</div>
          ${linesToLis(state.achievements)}
        </div>
        <div class="sec">
          <div class="sec-title">Projects / Volunteer</div>
          ${linesToLis(state.volunteer)}
        </div>
      </div>
    </div>
  </div>
  `;
}
