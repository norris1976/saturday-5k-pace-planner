// Age grading for the 5 km road distance using the published 2025 road age-grade tables
// (Alan Jones with Tom Bernhard; CC0 1.0). See README for source, licence and caveats.
//
//   age standard (s)   = open standard (s) / age factor
//   age-graded %       = age standard / actual time * 100
//   age-graded time(s) = actual time * age factor
import { AGE_FACTORS, OPEN_STANDARD_SEC } from './agegrade-data.js';

export const MIN_AGE = 8;
export const MAX_AGE = 99;

export function ageFactor(category, age) {
  const table = AGE_FACTORS[category];
  if (!table) throw new RangeError(`Unknown category "${category}" (use "M" or "F")`);
  if (!Number.isInteger(age) || age < MIN_AGE || age > MAX_AGE) {
    throw new RangeError(`Age must be a whole number from ${MIN_AGE} to ${MAX_AGE}`);
  }
  return table[age];
}

export function ageStandardSec(category, age) {
  return OPEN_STANDARD_SEC[category] / ageFactor(category, age);
}

export function ageGrade(category, age, timeSec) {
  if (!(timeSec > 0)) throw new RangeError('Time must be greater than zero');
  const factor = ageFactor(category, age);
  const standard = OPEN_STANDARD_SEC[category] / factor;
  return {
    percent: (standard / timeSec) * 100,
    factor,
    standardSec: standard,
    openStandardSec: OPEN_STANDARD_SEC[category],
    gradedTimeSec: timeSec * factor,
  };
}

// Rough, widely used descriptive bands (WMA 2010 road standards guidance). Labels only.
export function gradeBand(percent) {
  if (percent >= 100) return 'record level';
  if (percent >= 90) return 'world class';
  if (percent >= 80) return 'national class';
  if (percent >= 70) return 'regional class';
  if (percent >= 60) return 'local class';
  return 'under 60%';
}
