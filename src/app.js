import { buildPlan, shareText } from './plan.js';
import { formatTime, PROFILES } from './splits.js';
import { drawCard, downloadCard } from './card.js';

const $ = (id) => document.getElementById(id);
const form = $('form');
let current = null;

function readInput() {
  return {
    pb: $('pb').value, target: $('target').value, age: $('age').value, category: $('category').value,
    profile: $('profile').value, custom: $('custom').value, strategy: $('strategy').value, strength: $('strength').value,
  };
}

function syncControls() {
  $('custom-wrap').hidden = $('profile').value !== 'custom';
  $('strength-wrap').hidden = $('strategy').value === 'even';
  const p = $('profile').value;
  $('profile-note').textContent = p === 'custom'
    ? 'Enter the net climb (metres) for each km. 10 m in a km is a 1% grade.'
    : `Net elevation per km (m): ${PROFILES[p].map((n) => (n > 0 ? '+' + n : n)).join(', ')}. Illustrative shape; pick Custom for your real course.`;
}

function render(plan) {
  $('ag-target').textContent = `${plan.target.percent.toFixed(1)}%`;
  $('band-target').textContent = plan.target.band;
  $('ag-pb').textContent = `${plan.pb.percent.toFixed(1)}%`;
  $('band-pb').textContent = plan.pb.band;
  $('ag-detail').textContent =
    `${plan.categoryLabel}, age ${plan.input.age}: age standard ${formatTime(plan.target.standardSec)} (factor ${plan.target.factor.toFixed(4)}). ` +
    `Target equals an open-class ${formatTime(plan.target.gradedTimeSec)}.`;
  const w = $('warnings');
  w.hidden = plan.warnings.length === 0;
  w.innerHTML = '';
  plan.warnings.forEach((t) => { const p = document.createElement('div'); p.textContent = t; w.appendChild(p); });

  const tb = $('splits').querySelector('tbody');
  tb.innerHTML = '';
  for (const s of plan.splits) {
    const tr = document.createElement('tr');
    const el = s.elevation > 0 ? `+${s.elevation}` : `${s.elevation}`;
    [s.km, formatTime(s.splitSec), formatTime(s.paceSecPerMile), formatTime(s.cumulativeSec), el + ' m'].forEach((v, i) => {
      const td = document.createElement('td'); td.textContent = v; if (i === 4) td.className = 'elev'; tr.appendChild(td);
    });
    tb.appendChild(tr);
  }
  $('splits-detail').textContent =
    `Average ${formatTime(plan.averagePaceSec)} /km. Splits are whole seconds and add up exactly to ${formatTime(plan.input.targetSec)}. ` +
    `Target is ${Math.abs(plan.improvementPercent).toFixed(1)}% ${plan.improvementPercent >= 0 ? 'faster' : 'slower'} than your PB / recent time.`;

  drawCard($('card'), plan);
  $('share-text').value = shareText(plan);
  $('copy-status').textContent = '';
  $('results').hidden = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const plan = buildPlan(readInput());
  const err = $('errors');
  if (!plan.ok) {
    err.hidden = false; err.innerHTML = '';
    const ul = document.createElement('ul');
    plan.errors.forEach((t) => { const li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    err.appendChild(ul);
    $('results').hidden = true; current = null;
    return;
  }
  err.hidden = true; current = plan;
  render(plan);
  $('results').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

$('profile').addEventListener('change', syncControls);
$('strategy').addEventListener('change', syncControls);

$('download').addEventListener('click', () => {
  if (!current) return;
  downloadCard($('card'), `saturday-5k-plan-${formatTime(current.input.targetSec).replace(':', 'm')}s.png`);
});

$('copy').addEventListener('click', async () => {
  const text = $('share-text').value;
  const status = $('copy-status');
  try {
    await navigator.clipboard.writeText(text);
    status.textContent = 'Copied to clipboard.';
  } catch {
    const ta = $('share-text'); ta.focus(); ta.select();
    try { status.textContent = document.execCommand('copy') ? 'Copied to clipboard.' : 'Select the text below and copy it.'; }
    catch { status.textContent = 'Select the text below and copy it.'; }
  }
});

syncControls();

// Time fields: phone numeric keypads have no colon, so format digits as m:ss / mm:ss / h:mm:ss while typing.
export function formatTimeDigits(raw) {
  const d = String(raw).replace(/\D/g, '').slice(0, 5);
  if (d.length <= 2) return d;
  const ss = d.slice(-2), mm = d.slice(-4, -2), h = d.slice(0, -4);
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
document.querySelectorAll('.time-input').forEach((el) => {
  el.addEventListener('input', () => { el.value = formatTimeDigits(el.value); });
});
