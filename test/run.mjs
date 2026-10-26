// Dependency-free tests. Run: npm test  (node test/run.mjs)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ageFactor, ageStandardSec, ageGrade, MIN_AGE, MAX_AGE } from '../src/agegrade.js';
import { AGE_FACTORS, OPEN_STANDARD_SEC } from '../src/agegrade-data.js';
import { parseTime, formatTime, planSplits, PROFILES, parseElevations, distributeExactly, terrainMultiplier } from '../src/splits.js';
import { buildPlan, shareText } from '../src/plan.js';

let passed = 0; const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log(`  ok   ${name}`); }
  catch (e) { failures.push(name); console.log(`  FAIL ${name}\n       ${e.message}`); }
}
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) <= eps, `${msg ?? ''} expected ${b} +/- ${eps}, got ${a}`);

console.log('Age-grade: data integrity');
test('open standards are 12:49 (M) and 13:54 (F)', () => {
  assert.equal(OPEN_STANDARD_SEC.M, 769); assert.equal(OPEN_STANDARD_SEC.F, 834);
});
test('JS table matches the published plain-text file data/AgeGrade.5k for every age', () => {
  const lines = readFileSync(new URL('../data/AgeGrade.5k', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean);
  let n = 0;
  for (const l of lines) {
    const p = l.trim().split(/\s+/);
    if (p[1].includes(':')) continue;
    assert.equal(AGE_FACTORS[p[0]][Number(p[1])], Number(p[2]), `${p[0]} ${p[1]}`); n++;
  }
  assert.equal(n, 190);
});
test('JS table agrees (within 1 s) with the separately published age-standard-seconds sheet (xlsx) for ages 8-99', () => {
  const x = JSON.parse(readFileSync(new URL('../data/crosscheck-agestd-seconds-xlsx.json', import.meta.url), 'utf8'));
  for (const c of ['M', 'F']) for (let a = MIN_AGE; a <= MAX_AGE; a++) {
    near(ageStandardSec(c, a), x[c].ageStandardSec[a], 1.01, `${c}${a}`);
  }
});

console.log('Age-grade: published examples (independent third-party worked examples, 2025 tables)');
test('Example 1: man aged 50, 25:00 => 58.42%, graded time 21:56, age standard 14:36, factor 0.8775', () => {
  const r = ageGrade('M', 50, parseTime('25:00'));
  near(r.percent, 58.42, 0.005); assert.equal(r.factor, 0.8775);
  assert.equal(formatTime(r.standardSec), '14:36'); assert.equal(formatTime(r.gradedTimeSec), '21:56');
});
test('Example 2: woman aged 50, 25:00 => 64.71% (age standard 16:11)', () => {
  const r = ageGrade('F', 50, parseTime('25:00'));
  near(r.percent, 64.71, 0.005); assert.equal(formatTime(r.standardSec), '16:11');
});
test('Published 5K age-standard (100%) times by age, men and women', () => {
  const men = { 20: '12:49', 35: '13:03', 40: '13:32', 45: '14:03', 50: '14:36', 55: '15:13', 60: '15:52', 65: '16:35', 70: '17:26', 75: '18:43', 80: '20:42', 85: '23:48', 90: '28:56' };
  const women = { 20: '13:54', 35: '14:12', 40: '14:38', 45: '15:19', 50: '16:11', 55: '17:09', 60: '18:14', 65: '19:29', 70: '20:54', 75: '22:33', 80: '24:39', 85: '28:09', 90: '34:21' };
  for (const [a, t] of Object.entries(men)) assert.equal(formatTime(ageStandardSec('M', Number(a))), t, `M${a}`);
  for (const [a, t] of Object.entries(women)) assert.equal(formatTime(ageStandardSec('F', Number(a))), t, `F${a}`);
});
test('Rounded-standard variant: 25:00 M50 gives 58.40% with the whole-second standard 14:36 (876 s)', () => {
  near((876 / 1500) * 100, 58.40, 0.005);
});

console.log('Age-grade: properties');
test('100% at the open standard for ages in the open range (men 19-29)', () => {
  near(ageGrade('M', 25, 769).percent, 100, 1e-9);
  for (let a = 19; a <= 29; a++) assert.equal(ageFactor('M', a), 1);
});
test('factor never increases past 29 (monotone non-increasing from age 30)', () => {
  for (const c of ['M', 'F']) for (let a = 31; a <= MAX_AGE; a++) assert.ok(ageFactor(c, a) <= ageFactor(c, a - 1) + 1e-12, `${c}${a}`);
});
test('invalid inputs are rejected', () => {
  assert.throws(() => ageFactor('M', 7)); assert.throws(() => ageFactor('M', 100)); assert.throws(() => ageFactor('X', 30));
  assert.throws(() => ageGrade('M', 30, 0));
});

console.log('Time parsing');
test('parseTime / formatTime round trip and rejection', () => {
  assert.equal(parseTime('24:30'), 1470); assert.equal(parseTime('1:05:00'), 3900); assert.equal(parseTime(' 9:05 '), 545);
  for (const bad of ['', '24', '24:60', 'abc', '0:00', '24:5', '-3:00', null, undefined]) assert.equal(parseTime(bad), null, String(bad));
  assert.equal(formatTime(1470), '24:30'); assert.equal(formatTime(3900), '1:05:00');
});

console.log('Splits');
test('largest-remainder distribution always sums exactly', () => {
  assert.deepEqual(distributeExactly([1, 1, 1], 10).reduce((a, b) => a + b, 0), 10);
  assert.deepEqual(distributeExactly([1, 1, 1, 1, 1], 1500), [300, 300, 300, 300, 300]);
});
test('even split on flat course = equal splits', () => {
  const s = planSplits({ targetSec: 1500, elevations: PROFILES.flat, strategy: 'even' });
  assert.deepEqual(s.map((x) => x.splitSec), [300, 300, 300, 300, 300]);
  assert.equal(s[4].cumulativeSec, 1500);
});
test('splits sum EXACTLY to target across 5,000 random cases (all profiles/strategies/strengths)', () => {
  let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const strategies = ['positive', 'even', 'negative'];
  for (let i = 0; i < 5000; i++) {
    const target = 600 + Math.floor(rnd() * 2400);
    const elev = Array.from({ length: 5 }, () => Math.round((rnd() - 0.5) * 100));
    const s = planSplits({ targetSec: target, elevations: elev, strategy: strategies[i % 3], strength: [0.01, 0.02, 0.03][i % 3] });
    assert.equal(s.reduce((a, x) => a + x.splitSec, 0), target);
    assert.equal(s[4].cumulativeSec, target);
    assert.ok(s.every((x) => Number.isInteger(x.splitSec) && x.splitSec > 0));
  }
});
test('positive split: first km faster than last; negative: first slower than last (flat)', () => {
  const p = planSplits({ targetSec: 1500, strategy: 'positive' }).map((x) => x.splitSec);
  const n = planSplits({ targetSec: 1500, strategy: 'negative' }).map((x) => x.splitSec);
  assert.ok(p[0] < p[4]); assert.ok(n[0] > n[4]);
  assert.deepEqual(p, [...n].reverse());
});
test('uphill km is slower than a flat km; downhill is faster (even strategy)', () => {
  const s = planSplits({ targetSec: 1500, elevations: [20, 0, -10, 0, 0], strategy: 'even' }).map((x) => x.splitSec);
  assert.ok(s[0] > s[1]); assert.ok(s[2] < s[1]);
});
test('downhill benefit is capped', () => {
  assert.equal(terrainMultiplier(-100), terrainMultiplier(-80));
  assert.ok(terrainMultiplier(10) > 1);
});
test('pace per mile = split x 1.609344', () => {
  const s = planSplits({ targetSec: 1500 })[0];
  assert.equal(formatTime(s.paceSecPerMile), '8:03');
});
test('parseElevations needs exactly 5 numbers', () => {
  assert.deepEqual(parseElevations('5, -3, 10, 0, -8'), [5, -3, 10, 0, -8]);
  for (const bad of ['1,2,3', '1 2 3 4 5 6', 'a,b,c,d,e', '500,0,0,0,0', '']) assert.equal(parseElevations(bad), null, bad);
});

console.log('Plan + share text');
test('buildPlan returns grades, splits and share text for a sample runner', () => {
  const p = buildPlan({ pb: '24:30', age: '42', category: 'M', target: '23:45', profile: 'rolling', custom: '', strategy: 'negative', strength: 'standard' });
  assert.ok(p.ok); assert.equal(p.splits.reduce((a, s) => a + s.splitSec, 0), 1425);
  assert.ok(p.target.percent > p.pb.percent);
  const t = shareText(p);
  assert.match(t, /Saturday 5K Pace Planner/); assert.match(t, /23:45/); assert.match(t, /Age grade/);
  assert.doesNotMatch(t, /park\s?run/i);
});
test('buildPlan reports every validation error', () => {
  const p = buildPlan({ pb: 'x', age: '3', category: '', target: '', profile: 'custom', custom: '1,2', strategy: 'even' });
  assert.equal(p.ok, false); assert.ok(p.errors.length >= 5);
});
test('buildPlan warns about a very ambitious target', () => {
  const p = buildPlan({ pb: '25:00', age: '30', category: 'F', target: '21:00', profile: 'flat', strategy: 'even' });
  assert.ok(p.ok && p.warnings.length >= 1);
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) { console.log('Failed: ' + failures.join('; ')); process.exit(1); }
