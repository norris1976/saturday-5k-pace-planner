// Pure glue: validate user input, compute age grades and splits. No DOM, so it can be unit-tested.
import { ageGrade, gradeBand, MIN_AGE, MAX_AGE } from './agegrade.js';
import { parseTime, parseElevations, planSplits, PROFILES, formatTime } from './splits.js';

export const CATEGORY_LABEL = { M: "Men's category", F: "Women's category" };
export const PROFILE_LABEL = { flat: 'Flat', rolling: 'Rolling', hilly: 'Hilly', custom: 'Custom' };
export const STRATEGY_LABEL = { positive: 'Positive split', even: 'Even split', negative: 'Negative split' };
export const STRENGTHS = { subtle: 0.01, standard: 0.02, bold: 0.03 };

export function buildPlan(input) {
  const errors = [];
  const pbSec = parseTime(input.pb);
  const targetSec = parseTime(input.target);
  const age = Number(input.age);
  if (pbSec === null) errors.push('PB / recent time: use mm:ss, for example 24:30.');
  if (targetSec === null) errors.push('Target time: use mm:ss, for example 23:45.');
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) errors.push(`Age: enter a whole number from ${MIN_AGE} to ${MAX_AGE}.`);
  if (!['M', 'F'].includes(input.category)) errors.push("Category: choose Men's or Women's.");

  let elevations = PROFILES[input.profile];
  if (input.profile === 'custom') {
    elevations = parseElevations(input.custom);
    if (!elevations) errors.push('Custom elevation: enter 5 numbers (metres climbed per km, negative for descent), e.g. 5, -3, 10, 0, -8. Max 100 m per km.');
  } else if (!elevations) {
    errors.push('Course profile: choose flat, rolling, hilly or custom.');
  }
  const strength = STRENGTHS[input.strength] ?? STRENGTHS.standard;
  if (!['positive', 'even', 'negative'].includes(input.strategy)) errors.push('Split style: choose positive, even or negative.');
  if (errors.length) return { ok: false, errors };

  const warnings = [];
  const pb = ageGrade(input.category, age, pbSec);
  const target = ageGrade(input.category, age, targetSec);
  const improvement = (1 - targetSec / pbSec) * 100;
  if (improvement > 5) warnings.push(`Target is ${improvement.toFixed(1)}% faster than your PB / recent time. That is a big step, so treat the plan as a stretch.`);
  if (target.percent > 100) warnings.push('Target age grade is above 100%, which would be a record-level run for your age. Double-check the times.');
  if (targetSec < 600) warnings.push('Target is under 10:00 for 5 km; check you entered mm:ss.');

  const splits = planSplits({ targetSec, elevations, strategy: input.strategy, strength });
  return {
    ok: true,
    warnings,
    input: { ...input, age, pbSec, targetSec },
    categoryLabel: CATEGORY_LABEL[input.category],
    profileLabel: PROFILE_LABEL[input.profile],
    strategyLabel: STRATEGY_LABEL[input.strategy],
    elevations,
    pb: { ...pb, band: gradeBand(pb.percent) },
    target: { ...target, band: gradeBand(target.percent) },
    improvementPercent: improvement,
    splits,
    averagePaceSec: targetSec / 5,
  };
}

const f1 = (n) => n.toFixed(1);

export function shareText(plan) {
  const lines = [];
  lines.push('Saturday 5K Pace Planner');
  lines.push(`Target ${formatTime(plan.input.targetSec)} for 5 km (${plan.categoryLabel}, age ${plan.input.age})`);
  lines.push(`Age grade: target ${f1(plan.target.percent)}% | PB/recent ${formatTime(plan.input.pbSec)} = ${f1(plan.pb.percent)}%`);
  lines.push(`${plan.profileLabel} course, ${plan.strategyLabel.toLowerCase()}`);
  lines.push('');
  lines.push('Km  Split (pace/km)  Pace/mile  Total');
  for (const s of plan.splits) {
    lines.push(`${String(s.km).padEnd(3)} ${formatTime(s.splitSec).padEnd(16)} ${formatTime(s.paceSecPerMile).padEnd(10)} ${formatTime(s.cumulativeSec)}`);
  }
  lines.push('');
  lines.push('Planning aid only, not coaching or medical advice. Age grades use the 2025 road age-grade tables (CC0).');
  return lines.join('\n');
}
