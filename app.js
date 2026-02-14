// ===== Access control (Payhip license keys) =====
const ACCESS_STORAGE_KEY = 'cv_builder_license_key_v1';

function setLinks(){
  const buy = window.CV_BUY || {};
  const payhip = document.getElementById('buyPayhip');
  const etsy = document.getElementById('buyEtsy');
  if (payhip) payhip.href = buy.payhipCheckoutUrl || '#';
  if (etsy) etsy.href = buy.etsyListingUrl || '#';
}

function lockUI(message){
  const paywall = document.getElementById('paywall');
  const builder = document.getElementById('builderUI');
  if (paywall) paywall.hidden = false;
  if (builder) builder.hidden = true;
  const badge = document.getElementById('badgeState');
  if (badge){
    badge.textContent = message || 'låst';
    badge.classList.remove('ok');
  }
}

function unlockUI(){
  const paywall = document.getElementById('paywall');
  const builder = document.getElementById('builderUI');
  if (paywall) paywall.hidden = true;
  if (builder) builder.hidden = false;
  const badge = document.getElementById('badgeState');
  if (badge){
    badge.textContent = 'klar';
    badge.classList.add('ok');
  }
}

async function verifyLicenseKey(key){
  const resp = await fetch('/api/verify', {
    method:'POST',
    headers:{'content-type':'application/json'},
    body: JSON.stringify({ license_key: key })
  });
  const data = await resp.json().catch(()=>({}));
  if(!resp.ok) return { ok:false, ...data };
  return data;
}

async function tryAutoUnlock(){
  const saved = localStorage.getItem(ACCESS_STORAGE_KEY);
  if(!saved) return false;
  const result = await verifyLicenseKey(saved);
  if(result?.ok && result.valid && !result.disabled){
    unlockUI();
    return true;
  }
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  return false;
}

function bindRedeem(){
  const input = document.getElementById('licenseKey');
  const btn = document.getElementById('btnRedeem');
  const clr = document.getElementById('btnClear');

  if (btn){
    btn.addEventListener('click', async ()=>{
      const key = (input?.value || '').trim();
      if(!key){ lockUI('mangler kode'); return; }
      lockUI('verifiserer...');
      const result = await verifyLicenseKey(key);
      if(result?.ok && result.valid && !result.disabled){
        localStorage.setItem(ACCESS_STORAGE_KEY, key);
        unlockUI();
        render(); // render now that unlocked
      } else {
        lockUI('ugyldig kode');
      }
    });
  }
  if (clr){
    clr.addEventListener('click', ()=>{
      localStorage.removeItem(ACCESS_STORAGE_KEY);
      if(input) input.value = '';
      lockUI('låst');
    });
  }
}


// UI glue: form -> state -> render -> export.
const $ = (sel) => document.querySelector(sel);

const defaultState = {
  template: 'nurse',
  theme: 'bw',
  paper: 'a4',
  name: 'S A R A H  J O H N S O N',
  title: 'REGISTERED NURSE · BSN, RN',
  contactLine: '(555) 123-4567 | sarah.johnson@email.com | Oslo | linkedin.com/in/sarahjohnson',
  summary: 'Compassionate and detail-oriented professional with quantified impact and strong collaboration.',
  skills: 'Patient Assessment & Triage, IV Therapy & Venipuncture, Wound Care, Medication Administration, Epic EHR',
  core: 'Team Leadership, Critical Thinking, Patient Education, Time Management, Interdisciplinary Collaboration',
  languages: 'English — Native, Norwegian — Fluent',
  achievements: 'Reduced hospital-acquired infection rates by 18%\nMaintained 98% patient satisfaction scores',
  volunteer: 'Volunteer Nurse — Community outreach — 2019–Present',
  experience: [
    { role:'SENIOR REGISTERED NURSE – ICU', org:"Hospital", loc:'Oslo', dates:'2021 – Present',
      bullets:[
        'Provide direct care for 4–6 patients per shift in ICU settings',
        'Implemented protocol improving response time by 15%',
      ]
    }
  ],
  education: [
    { degree:'Bachelor of Science in Nursing', school:'University', dates:'2012 – 2016', notes:'GPA / honors (optional)' }
  ],
  certs: [
    { name:'Registered Nurse (RN)', issuer:'Board of Nursing', extra:'#ID / status' },
    { name:'ACLS', issuer:'American Heart Association', extra:'Exp. Aug 2026' }
  ],
};

let state = structuredClone(defaultState);

function render(){
  const paper = $('#paper');
  paper.classList.toggle('a4', state.paper === 'a4');
  paper.classList.toggle('letter', state.paper === 'letter');
  paper.classList.toggle('theme-bw', state.theme === 'bw');
  paper.classList.toggle('theme-beige', state.theme === 'beige');
  paper.classList.toggle('template-nurse', state.template === 'nurse');
  paper.classList.toggle('template-engineering', state.template === 'engineering');

  paper.innerHTML = renderTemplate(state);

  // badge
  const badge = $('#badgeState');
  badge.textContent = 'oppdatert';
  badge.classList.add('ok');
  setTimeout(()=>{ badge.textContent='klar'; badge.classList.add('ok'); }, 300);
}

function bindBasics(){
  $('#templateSelect').addEventListener('change', (e)=>{ state.template = e.target.value; render(); });
  $('#themeSelect').addEventListener('change', (e)=>{ state.theme = e.target.value; render(); });
  $('#paperSelect').addEventListener('change', (e)=>{ state.paper = e.target.value; render(); });

  const map = [
    ['#name','name'],
    ['#title','title'],
    ['#contactLine','contactLine'],
    ['#summary','summary'],
    ['#skills','skills'],
    ['#core','core'],
    ['#languages','languages'],
    ['#achievements','achievements'],
    ['#volunteer','volunteer'],
  ];
  for(const [sel,key] of map){
    $(sel).addEventListener('input', (e)=>{ state[key]=e.target.value; render(); });
  }

  // accordions
  document.querySelectorAll('.acc-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const target = document.querySelector(btn.dataset.target);
      if(!target) return;
      target.classList.toggle('open');
    });
  });
}

function makeRow(fields, onRemove){
  const wrap = document.createElement('div');
  wrap.className = 'rowCard';
  wrap.innerHTML = `
    <div class="card">
      <div class="rowGrid"></div>
      <div class="rowActions">
        <button class="btn small danger">Fjern</button>
      </div>
    </div>
  `;
  const grid = wrap.querySelector('.rowGrid');
  for(const f of fields){
    const div = document.createElement('div');
    div.className = 'group';
    div.innerHTML = `<label>${f.label}</label><input type="text" value="${(f.value??'').replaceAll('"','&quot;')}" />`;
    const input = div.querySelector('input');
    input.addEventListener('input', (e)=>f.onInput(e.target.value));
    grid.appendChild(div);
  }
  wrap.querySelector('.danger').addEventListener('click', ()=>{
    onRemove?.();
    wrap.remove();
    render();
  });
  return wrap;
}

function makeBulletsEditor(arrRef, idx){
  const div = document.createElement('div');
  div.className = 'group';
  div.innerHTML = `<label>Bullet points (én per linje)</label><textarea rows="4"></textarea>`;
  const ta = div.querySelector('textarea');
  ta.value = (state.experience[idx].bullets||[]).join('\n');
  ta.addEventListener('input', ()=>{
    state.experience[idx].bullets = ta.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    render();
  });
  return div;
}

function rebuildExperience(){
  const root = $('#expWrap');
  root.innerHTML = '';
  state.experience.forEach((e, idx)=>{
    const row = makeRow([
      {label:'Rolle', value:e.role, onInput:(v)=>{ state.experience[idx].role=v; render(); }},
      {label:'Arbeidsgiver', value:e.org, onInput:(v)=>{ state.experience[idx].org=v; render(); }},
      {label:'Sted', value:e.loc, onInput:(v)=>{ state.experience[idx].loc=v; render(); }},
      {label:'Datoer', value:e.dates, onInput:(v)=>{ state.experience[idx].dates=v; render(); }},
    ], ()=>{
      state.experience.splice(idx,1);
      rebuildExperience();
    });
    row.querySelector('.rowGrid').appendChild(makeBulletsEditor(state.experience, idx));
    root.appendChild(row);
  });
}

function rebuildEducation(){
  const root = $('#eduWrap');
  root.innerHTML = '';
  state.education.forEach((ed, idx)=>{
    const row = makeRow([
      {label:'Grad', value:ed.degree, onInput:(v)=>{ state.education[idx].degree=v; render(); }},
      {label:'Skole', value:ed.school, onInput:(v)=>{ state.education[idx].school=v; render(); }},
      {label:'Datoer', value:ed.dates, onInput:(v)=>{ state.education[idx].dates=v; render(); }},
      {label:'Notat', value:ed.notes, onInput:(v)=>{ state.education[idx].notes=v; render(); }},
    ], ()=>{
      state.education.splice(idx,1);
      rebuildEducation();
    });
    root.appendChild(row);
  });
}

function rebuildCerts(){
  const root = $('#certWrap');
  root.innerHTML = '';
  state.certs.forEach((c, idx)=>{
    const row = makeRow([
      {label:'Navn', value:c.name, onInput:(v)=>{ state.certs[idx].name=v; render(); }},
      {label:'Utsteder', value:c.issuer, onInput:(v)=>{ state.certs[idx].issuer=v; render(); }},
      {label:'Ekstra', value:c.extra, onInput:(v)=>{ state.certs[idx].extra=v; render(); }},
    ], ()=>{
      state.certs.splice(idx,1);
      rebuildCerts();
    });
    root.appendChild(row);
  });
}

function addButtons(){
  $('#addExp').addEventListener('click', ()=>{
    state.experience.push({ role:'', org:'', loc:'', dates:'', bullets:[] });
    rebuildExperience();
    render();
    $('#expWrap').classList.add('open');
  });
  $('#addEdu').addEventListener('click', ()=>{
    state.education.push({ degree:'', school:'', dates:'', notes:'' });
    rebuildEducation();
    render();
    $('#eduWrap').classList.add('open');
  });
  $('#addCert').addEventListener('click', ()=>{
    state.certs.push({ name:'', issuer:'', extra:'' });
    rebuildCerts();
    render();
    $('#certWrap').classList.add('open');
  });
}

async function exportPDF(){
  const badge = $('#badgeState');
  badge.textContent = 'eksporterer...';
  badge.classList.remove('ok');

  const paper = $('#paper');
  const scale = 2; // higher = sharper PDF
  const canvas = await html2canvas(paper, { scale, backgroundColor: null, useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const { jsPDF } = window.jspdf;
  const isA4 = state.paper === 'a4';
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: isA4 ? 'a4' : 'letter'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Fit image to page
  const imgWidth = pageWidth;
  const imgHeight = canvas.height * (pageWidth / canvas.width);

  pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
  // If content exceeds one page, naive split (rare for 1 page CV). You can extend later.

  pdf.save((state.template || 'cv') + '.pdf');

  badge.textContent = 'klar';
  badge.classList.add('ok');
}

function printPDF(){
  window.print();
}

function hydrateInputs(){
  $('#templateSelect').value = state.template;
  $('#themeSelect').value = state.theme;
  $('#paperSelect').value = state.paper;

  $('#name').value = state.name;
  $('#title').value = state.title;
  $('#contactLine').value = state.contactLine;
  $('#summary').value = state.summary;
  $('#skills').value = state.skills;
  $('#core').value = state.core;
  $('#languages').value = state.languages;
  $('#achievements').value = state.achievements;
  $('#volunteer').value = state.volunteer;

  rebuildExperience();
  rebuildEducation();
  rebuildCerts();

  // open first accordion blocks
  $('#expWrap').classList.add('open');
  $('#eduWrap').classList.add('open');
}

function extraStyles(){
  // add a few styles for dynamic cards
  const css = document.createElement('style');
  css.textContent = `
  .rowCard{margin-bottom:10px}
  .rowGrid{display:grid; grid-template-columns: 1fr 1fr; gap:10px}
  .rowActions{margin-top:8px; display:flex; justify-content:flex-end}
  .danger{border-color: rgba(255,90,90,.5)}
  .danger:hover{border-color: rgba(255,90,90,.9)}
  @media (max-width: 520px){ .rowGrid{grid-template-columns: 1fr} }
  @media print{
    body{background:#fff}
    .topbar,.panel,.footer,.preview-head{display:none !important}
    .preview{border:0; padding:0; box-shadow:none}
    .paper{box-shadow:none; border-radius:0}
  }
  `;
  document.head.appendChild(css);
}

window.addEventListener('DOMContentLoaded', async ()=>{
  setLinks();
  bindRedeem();
  lockUI('låst');
  const unlocked = await tryAutoUnlock();
  // Builder can initialize even if locked; UI is hidden.

  extraStyles();
  bindBasics();
  addButtons();
  hydrateInputs();
  render();

  $('#btnExport').addEventListener('click', exportPDF);
  $('#btnPrint').addEventListener('click', printPDF);
});

// ===== Optional AI hook (you add your own API key) =====
// If you want: create a serverless function on Vercel to call an LLM securely.
// Then call it from here. Do NOT put secret keys in client-side JS.
