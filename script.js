// ── Constants ──
const MULT = { sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725, extra: 1.9 };
const ALBL = { sedentary: 'Sedentary', light: 'Lightly Active', moderate: 'Moderately Active', very: 'Very Active', extra: 'Extra Active' };
const GOAL_DEFS = [
  { lbl: 'Extreme Weight Loss', rate: '−1 kg/week', off: -1000, col: '#dc2626', bg: 'rgba(254,242,242,.8)', ico: 'trending-down' },
  { lbl: 'Weight Loss', rate: '−0.5 kg/week', off: -500, col: '#ef4444', bg: 'rgba(254,242,242,.45)', ico: 'trending-down' },
  { lbl: 'Mild Weight Loss', rate: '−0.25 kg/week', off: -250, col: '#f97316', bg: 'rgba(255,247,237,.5)', ico: 'trending-down' },
  { lbl: 'Maintain Weight', rate: '0 kg/week', off: 0, col: '#059669', bg: 'rgba(236,253,245,.8)', ico: 'scale' },
  { lbl: 'Mild Weight Gain', rate: '+0.25 kg/week', off: 250, col: '#60a5fa', bg: 'rgba(239,246,255,.4)', ico: 'trending-up' },
  { lbl: 'Weight Gain', rate: '+0.5 kg/week', off: 500, col: '#3b82f6', bg: 'rgba(239,246,255,.65)', ico: 'trending-up' },
  { lbl: 'Fast Weight Gain', rate: '+1 kg/week', off: 1000, col: '#2563eb', bg: 'rgba(239,246,255,.9)', ico: 'trending-up' },
];
const HINT_MAP = { '-1000': 'Reduces 1,000 cal/day.', '-500': 'Reduces 500 cal/day.', '-250': 'Reduces 250 cal/day.', '0': 'Maintains your current weight.', '250': 'Adds 250 cal/day.', '500': 'Adds 500 cal/day.', '1000': 'Adds 1,000 cal/day.' };

// ── State ──
let S = { unit: 'metric', sex: 'female', formula: 'mifflin', activity: 'moderate', energy: 'kcal', bmr: null, tdee: null };

// ── Utils ──
const $ = id => document.getElementById(id);
function fmt(k) { return S.energy === 'kJ' ? Math.round(k * 4.184).toLocaleString() : Math.round(k).toLocaleString() }
function el() { return S.energy === 'kJ' ? 'kJ' : 'kcal' }
function showErr(m) { $('err-box').classList.add('show'); $('err-txt').textContent = m }
function clearErr() { $('err-box').classList.remove('show') }

// ── Unit toggle ──
function setUnit(u) {
  if (u === S.unit) return;
  if (u === 'imperial') {
    const w = parseFloat($('inp-weight').value); if (!isNaN(w)) $('inp-weight').value = Math.round(w * 2.20462);
    const h = parseFloat($('inp-cm').value); if (!isNaN(h)) { const ti = h / 2.54; $('inp-ft').value = Math.floor(ti / 12); $('inp-in').value = Math.round(ti % 12); }
  } else {
    const w = parseFloat($('inp-weight').value); if (!isNaN(w)) $('inp-weight').value = Math.round(w * 0.453592);
    const ft = parseFloat($('inp-ft').value) || 0, inn = parseFloat($('inp-in').value) || 0;
    const ti = ft * 12 + inn; if (ti > 0) $('inp-cm').value = Math.round(ti * 2.54);
  }
  S.unit = u;
  $('hm').style.display = u === 'metric' ? '' : 'none';
  $('hi').style.display = u === 'imperial' ? 'grid' : 'none';
  $('wt-unit').textContent = u === 'metric' ? 'kg' : 'lbs';
  $('tab-metric').classList.toggle('active', u === 'metric');
  $('tab-imperial').classList.toggle('active', u === 'imperial');
}

// ── Sex ──
function setSex(s) {
  S.sex = s;
  $('btn-male').className = 'gender-btn' + (s === 'male' ? ' male-on' : '');
  $('btn-female').className = 'gender-btn' + (s === 'female' ? ' female-on' : '');
}

// ── Formula ──
function setFormula(f) {
  S.formula = f;
  document.querySelectorAll('.f-pill').forEach(b => b.classList.toggle('active', b.dataset.f === f));
  $('f-sel').value = f;
  $('bf-field').classList.toggle('open', f === 'katch');
  $('s-formula').textContent = f === 'mifflin' ? 'Mifflin-St Jeor' : f === 'harris' ? 'Harris-Benedict' : 'Katch-McArdle';
}

// ── Activity ──
function setAct(a) {
  S.activity = a;
  document.querySelectorAll('.a-btn').forEach(b => b.classList.toggle('active', b.dataset.a === a));
  $('a-sel').value = a;
}

// ── Energy unit ──
function setEnergy(u) {
  S.energy = u;
  $('e-kcal').classList.toggle('active', u === 'kcal');
  $('e-kj').classList.toggle('active', u === 'kJ');
  if (S.tdee !== null) renderResults();
}

// ── Calculate ──
function calculate() {
  clearErr();
  const age = parseFloat($('inp-age').value);
  let wkg, hcm;
  if (S.unit === 'imperial') {
    wkg = parseFloat($('inp-weight').value) * 0.453592;
    hcm = (parseFloat($('inp-ft').value || 0) * 12 + parseFloat($('inp-in').value || 0)) * 2.54;
  } else {
    wkg = parseFloat($('inp-weight').value);
    hcm = parseFloat($('inp-cm').value);
  }
  const bfs = $('inp-bf').value;
  if (isNaN(age) || age < 1 || age > 120) { showErr('Please enter a valid age (1–120).'); return; }
  if (isNaN(wkg) || wkg < 1 || wkg > 500) { showErr('Please enter a valid weight.'); return; }
  if (isNaN(hcm) || hcm < 50 || hcm > 300) { showErr('Please enter a valid height.'); return; }
  if (S.formula === 'katch' && bfs === '') { showErr('Body fat % is required for Katch-McArdle.'); return; }
  if (bfs !== '') { const bf = parseFloat(bfs); if (isNaN(bf) || bf < 1 || bf > 100) { showErr('Enter a valid body fat % (1–100).'); return; } }

  let bmr = 0;
  if (S.formula === 'katch') {
    const bf = parseFloat(bfs);
    bmr = !isNaN(bf) ? 370 + 21.6 * (wkg * (1 - bf / 100)) : (S.sex === 'male' ? 10 * wkg + 6.25 * hcm - 5 * age + 5 : 10 * wkg + 6.25 * hcm - 5 * age - 161);
  } else if (S.formula === 'harris') {
    bmr = S.sex === 'male' ? 13.397 * wkg + 4.799 * hcm - 5.677 * age + 88.362 : 9.247 * wkg + 3.098 * hcm - 4.330 * age + 447.593;
  } else {
    bmr = S.sex === 'male' ? 10 * wkg + 6.25 * hcm - 5 * age + 5 : 10 * wkg + 6.25 * hcm - 5 * age - 161;
  }
  S.bmr = Math.round(bmr); S.tdee = Math.round(bmr * MULT[S.activity]);
  renderResults(); updateMacros(); renderGoals(); renderActivity();
}

// ── Render results ──
function renderResults() {
  const { bmr, tdee } = S; const e = el();
  // gauge
  const lo = bmr * 1.2, hi = bmr * 1.9, pct = Math.max(0, Math.min(1, (tdee - lo) / (hi - lo)));
  $('g-fill').style.strokeDashoffset = 251.327 * (1 - pct);
  const angle = Math.PI * (1 - pct);
  $('g-dot').setAttribute('cx', 100 + 80 * Math.cos(angle));
  $('g-dot').setAttribute('cy', 100 - 80 * Math.sin(angle));
  $('g-val').textContent = fmt(tdee); $('g-unit').textContent = e + ' / day';
  // stats
  $('s-bmr').textContent = fmt(bmr); $('s-bmr-u').textContent = e;
  $('s-tdee').textContent = fmt(tdee); $('s-tdee-u').textContent = e;
  $('s-week').textContent = fmt(tdee * 7); $('s-week-u').textContent = e;
  // quick goals
  const qgu = e;
  $('qg-lose').innerHTML = fmt(tdee - 500) + '<br><span style="font-size:.625rem;font-weight:600;color:var(--slate-400)">' + qgu + '</span>';
  $('qg-maint').innerHTML = fmt(tdee) + '<br><span style="font-size:.625rem;font-weight:600;color:var(--slate-400)">' + qgu + '</span>';
  $('qg-gain').innerHTML = fmt(tdee + 500) + '<br><span style="font-size:.625rem;font-weight:600;color:var(--slate-400)">' + qgu + '</span>';
}

// ── Macros ──
function updateMacros() {
  if (S.tdee === null) return;
  const off = parseInt($('mg-sel').value);
  const [p, c, f] = $('mp-sel').value.split(',').map(Number);
  const target = S.tdee + off; const e = el();
  $('mg-hint').textContent = HINT_MAP[String(off)] || '';
  $('mp-hint').textContent = p + '% Protein / ' + c + '% Carbs / ' + f + '% Fat';
  $('mt-val').textContent = fmt(target); $('mt-unit').textContent = e;
  $('bp').style.width = p + '%'; $('bc').style.width = c + '%'; $('bf2').style.width = f + '%';
  $('bl-p').textContent = 'Protein ' + p + '%'; $('bl-c').textContent = 'Carbs ' + c + '%'; $('bl-f').textContent = 'Fat ' + f + '%';
  const pg = Math.round(target * (p / 100) / 4), cg = Math.round(target * (c / 100) / 4), fg = Math.round(target * (f / 100) / 9);
  $('mc-p').textContent = pg + 'g'; $('mc-pk').textContent = fmt(pg * 4) + ' ' + e;
  $('mc-c').textContent = cg + 'g'; $('mc-ck').textContent = fmt(cg * 4) + ' ' + e;
  $('mc-f').textContent = fg + 'g'; $('mc-fk').textContent = fmt(fg * 9) + ' ' + e;
}

// ── Detailed goals ──
function renderGoals() {
  const c = $('goal-rows'); c.innerHTML = ''; const e = el();
  GOAL_DEFS.forEach(g => {
    const v = S.tdee + g.off;
    const d = document.createElement('div'); d.className = 'gr'; d.style.background = g.bg;
    d.innerHTML = `<div class="gr-left">
      <div class="gr-ico" style="color:${g.col}"><i data-lucide="${g.ico}" width="16" height="16"></i></div>
      <div><div class="gr-name" style="color:${g.col}">${g.lbl}</div><div class="gr-rate">${g.rate}</div></div>
    </div>
    <div class="gr-cals" style="color:${g.col}">${fmt(v)} <span class="gr-unit">${e}</span></div>`;
    c.appendChild(d);
  });
  lucide.createIcons();
  fixIconSizes();
}

// ── Activity breakdown ──
function renderActivity() {
  const c = $('act-rows'); c.innerHTML = ''; const e = el();
  const maxC = Math.round(S.bmr * MULT.extra);
  $('act-unit-lbl').textContent = el().toUpperCase() + ' / DAY';
  Object.entries(MULT).forEach(([lv, m]) => {
    const on = lv === S.activity, cv = Math.round(S.bmr * m), pct = (cv / maxC) * 100;
    const d = document.createElement('div'); d.className = 'ar ' + (on ? 'on' : 'off');
    d.innerHTML = `<div class="ar-top">
      <div class="ar-left"><div class="ar-dot"></div><span class="ar-name">${ALBL[lv]}</span></div>
      <div class="ar-val">${fmt(cv)} <span style="font-size:.75rem;font-weight:600;color:var(--slate-500)">${e}</span></div>
    </div>
    <div class="ar-track"><div class="ar-prog" style="width:${pct}%"></div></div>`;
    c.appendChild(d);
  });
}

// ── Reset ──
function resetForm() {
  $('inp-age').value = 28; $('inp-weight').value = 63; $('inp-cm').value = 165; $('inp-ft').value = 5; $('inp-in').value = 5; $('inp-bf').value = '';
  setUnit('metric'); setSex('female'); setFormula('mifflin'); setAct('moderate'); clearErr();
}

// ── Save / Share ──
function savePrint() { window.print() }
function shareResult() {
  if (S.tdee === null) return;
  const txt = `TDEE: ${fmt(S.tdee)} ${el()}/day — ${window.location.href}`;
  if (navigator.share) { navigator.share({ title: 'My Calorie Results', text: txt, url: window.location.href }) }
  else { navigator.clipboard.writeText(txt).then(() => alert('Copied to clipboard!')) }
}

// ── Fix Lucide SVG sizes ──
function fixIconSizes() {
  const map = [['.a-ico', 18], ['.sel-arrow', 16], ['.faq-ico', 16], ['.gr-ico', 16], ['.btn-reset', 18], ['.ic-ico', 20], ['.cc-ico', 20], ['.nav-btn', 16], ['.ico16', 16], ['.ico18', 18], ['.ico20', 20], ['.err-box', 16], ['.qg-icon', 18]];
  map.forEach(([sel, sz]) => document.querySelectorAll(sel + ' svg[data-lucide]').forEach(s => { s.setAttribute('width', sz); s.setAttribute('height', sz) }));
}

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  fixIconSizes();
  setSex('female');
  setFormula('mifflin');
  setAct('moderate');
  calculate();

  // ── Carousel Navigation Logic ──
function initCarousels() {
  // Find every section that contains a carousel
  const carouselSections = document.querySelectorAll('.cc-sec');

  carouselSections.forEach(section => {
    const scrollContainer = section.querySelector('.cc-scroll');
    const navButtons = section.querySelectorAll('.nav-btn');

    // Ensure we have the container and exactly two buttons (left and right)
    if (scrollContainer && navButtons.length === 2) {
      const btnLeft = navButtons[0];
      const btnRight = navButtons[1];

      // Define how far it should scroll per click (roughly one card width + gap)
      const scrollAmount = 280; 

      btnLeft.addEventListener('click', () => {
        scrollContainer.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth'
        });
      });

      btnRight.addEventListener('click', () => {
        scrollContainer.scrollBy({
          left: scrollAmount,
          behavior: 'smooth'
        });
      });
    }
  });
}

// Ensure it runs when the DOM is ready (you can drop this into your existing DOMContentLoaded block)
document.addEventListener('DOMContentLoaded', () => {
  // ... your existing initialization code ...
  initCarousels(); 
});
});

// Clear error message when the user types in any input field
  document.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', clearErr);
  });
