// Time parsing/formatting and per-km split planning for a 5 km race.
// All times are whole seconds so the splits can add up EXACTLY to the target.

export const KM = 5;
export const MILE_KM = 1.609344;

export function parseTime(text) {
  const t = String(text ?? '').trim();
  const m = /^(?:(\d{1,2}):)?(\d{1,3}):([0-5]\d)$/.exec(t);
  if (!m) return null;
  const h = m[1] === undefined ? 0 : Number(m[1]);
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (h > 0 && min > 59) return null;
  const total = h * 3600 + min * 60 + sec;
  return total > 0 ? total : null;
}

export function formatTime(totalSec) {
  const s = Math.round(totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// Net elevation change per km, in metres (positive = climb, negative = descent). Illustrative shapes.
export const PROFILES = {
  flat: [0, 0, 0, 0, 0],
  rolling: [8, -8, 8, -8, 0],
  hilly: [20, -10, 25, -20, -15],
};

export function parseElevations(text) {
  const parts = String(text ?? '').split(/[\s,;]+/).filter(Boolean);
  if (parts.length !== KM) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n) || Math.abs(n) > 100)) return null;
  return nums;
}

// Terrain effort model (documented approximation, NOT physiological science):
// pace multiplier for a km with grade g (%, 10 m per km = 1%):
//   uphill:   +3.3% time per 1% grade
//   downhill: -1.8% time per 1% grade, benefit capped at 8% (steep descents are not free speed)
// This mirrors the shape of common grade-adjusted-pace rules of thumb.
export const UP_COST = 0.033;
export const DOWN_GAIN = 0.018;
export const DOWN_CAP = 0.08;

export function terrainMultiplier(netMetresPerKm) {
  const grade = netMetresPerKm / 10; // percent
  if (grade >= 0) return 1 + UP_COST * grade;
  return 1 - Math.min(DOWN_CAP, DOWN_GAIN * -grade);
}

// Split strategy: relative pace drift across the 5 km. strength = fractional deviation of the first and
// last km from the mean (0.02 => km 1 is 2% faster than average-effort pace, km 5 is 2% slower, for positive).
export const STRATEGIES = ['positive', 'even', 'negative'];

export function strategyMultiplier(strategy, kmIndex, strength) {
  const centred = (kmIndex - (KM - 1) / 2) / ((KM - 1) / 2); // -1 .. +1
  if (strategy === 'even') return 1;
  if (strategy === 'positive') return 1 + strength * centred;
  if (strategy === 'negative') return 1 - strength * centred;
  throw new RangeError(`Unknown strategy "${strategy}"`);
}

// Largest-remainder rounding: integer seconds that sum to exactly `total`.
export function distributeExactly(weights, total) {
  const sum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / sum) * total);
  const floors = raw.map(Math.floor);
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; k < order.length && remainder > 0; k++, remainder--) floors[order[k].i] += 1;
  return floors;
}

export function planSplits({ targetSec, elevations = PROFILES.flat, strategy = 'even', strength = 0.02 }) {
  if (!Number.isInteger(targetSec) || targetSec <= 0) throw new RangeError('Target must be a positive whole number of seconds');
  if (elevations.length !== KM) throw new RangeError(`Need ${KM} per-km elevation values`);
  const weights = elevations.map((e, i) => terrainMultiplier(e) * strategyMultiplier(strategy, i, strength));
  const secs = distributeExactly(weights, targetSec);
  let cum = 0;
  return secs.map((s, i) => {
    cum += s;
    return { km: i + 1, splitSec: s, paceSecPerKm: s, paceSecPerMile: s * MILE_KM, cumulativeSec: cum, elevation: elevations[i] };
  });
}
