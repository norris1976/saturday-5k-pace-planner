// Draws the shareable result card on a <canvas>. Browser only. No external fonts or images.
import { formatTime } from './splits.js';

const W = 1080, H = 1350;

export function drawCard(canvas, plan) {
  canvas.width = W; canvas.height = H;
  const c = canvas.getContext('2d');
  const font = 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

  const g = c.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0c0c0b'); g.addColorStop(1, '#1d1c18');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.fillStyle = '#f4c430'; c.fillRect(0, 0, W, 10);   // gold top rule

  c.textBaseline = 'alphabetic';
  c.fillStyle = '#f4c430'; c.font = `700 30px ${font}`; c.fillText('SPORT BUILDS', 70, 100);
  c.fillStyle = '#f4f1e8'; c.font = `800 64px ${font}`; c.fillText('Saturday 5K Pace Planner', 70, 180);

  // target time
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `600 30px ${font}`; c.fillText('TARGET', 70, 275);
  c.fillStyle = '#f4f1e8'; c.font = `800 150px ${font}`; c.fillText(formatTime(plan.input.targetSec), 70, 410);
  c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `500 32px ${font}`;
  c.fillText(`${formatTime(plan.averagePaceSec)} /km average  |  5 km`, 70, 460);

  // age grade panel
  c.fillStyle = 'rgba(255,255,255,.12)'; roundRect(c, 70, 500, W - 140, 190, 24); c.fill();
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `600 26px ${font}`;
  c.fillText('AGE GRADE (TARGET)', 100, 548);
  c.fillStyle = '#f4c430'; c.font = `800 100px ${font}`; c.fillText(`${plan.target.percent.toFixed(1)}%`, 100, 650);
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `600 26px ${font}`; c.fillText('PB / RECENT', 560, 548);
  c.fillStyle = '#f4f1e8'; c.font = `800 64px ${font}`; c.fillText(`${plan.pb.percent.toFixed(1)}%`, 560, 620);
  c.fillStyle = 'rgba(255,255,255,.8)'; c.font = `500 26px ${font}`;
  c.fillText(`${formatTime(plan.input.pbSec)}  |  ${plan.categoryLabel}, age ${plan.input.age}`, 560, 662);

  // splits table
  let y = 760;
  c.fillStyle = 'rgba(255,255,255,.7)'; c.font = `600 26px ${font}`;
  c.fillText(`${plan.profileLabel.toUpperCase()} COURSE  |  ${plan.strategyLabel.toUpperCase()}`, 70, y);
  y += 30;
  const cols = [70, 250, 560, 900]; // km, split, pace, total (right aligned for last)
  c.font = `600 24px ${font}`; c.fillStyle = 'rgba(255,255,255,.6)';
  c.fillText('KM', cols[0], y + 36); c.fillText('SPLIT (PACE /KM)', cols[1], y + 36); c.fillText('PACE /MILE', cols[2] + 60, y + 36);
  c.textAlign = 'right'; c.fillText('TOTAL', W - 70, y + 36); c.textAlign = 'left';
  y += 50;
  plan.splits.forEach((s, i) => {
    const rowY = y + i * 72;
    c.fillStyle = i % 2 ? 'rgba(255,255,255,.04)' : 'rgba(255,255,255,.09)';
    roundRect(c, 60, rowY, W - 120, 62, 14); c.fill();
    c.fillStyle = '#f4f1e8'; c.font = `700 40px ${font}`;
    c.fillText(String(s.km), cols[0] + 10, rowY + 44);
    c.fillText(formatTime(s.splitSec), cols[1], rowY + 44);
    c.fillText(formatTime(s.paceSecPerMile), cols[2] + 60, rowY + 44);
    c.textAlign = 'right'; c.fillStyle = '#f4c430'; c.fillText(formatTime(s.cumulativeSec), W - 80, rowY + 44); c.textAlign = 'left';
  });

  c.fillStyle = 'rgba(255,255,255,.65)'; c.font = `500 24px ${font}`;
  c.fillText('Works for any 5K, including weekly timed runs.', 70, H - 100);
  c.fillText('Planning aid, not coaching or medical advice.', 70, H - 66);
  c.fillText('Age grades: 2025 road age-grade tables (Jones/Bernhard, CC0).', 70, H - 32);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath(); c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

export function downloadCard(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }, 'image/png');
}
