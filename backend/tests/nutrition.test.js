const test = require('node:test');
const assert = require('node:assert/strict');
const n = require('../services/nutrition');
const catalog = require('../data/nutrition-foods.json');
const profile = { sex: 'female', age: 30, goal: 'fat_loss', calibrationStart: '2026-09-01', calibrationDays: 7, needsClinicalAdvice: false };
function rows(count = 7, intake = 2200) {
  return Array.from({ length: count }, (_, i) => ({ date: n.offsetDateOnly('2026-09-01', i), complete: true, weight: 80, recovery: 'normal', totals: { calories: intake, protein: 120, fiber: 25, fiberKnown: true }, walks: [], training: { state: 'unrecorded' } }));
}
test('USDA library preserves per100 unit, raw/cooked identity and unknown fiber', () => {
  assert.equal(catalog.length, 49);
  assert.equal(catalog.find(f => f.id === 'usda-169757').per100.calories, 130);
  assert.equal(catalog.find(f => f.id === 'usda-169756').weightType, 'raw');
  assert.ok(catalog.every(f => f.sourceUrl.includes(f.id.slice(5)) && f.unit === 'g'));
  const shrimp = n.snapshot(catalog.find(f => f.id === 'usda-175180'), 100);
  assert.equal(n.totals([shrimp]).fiberKnown, false);
  assert.equal(n.totals([n.snapshot(catalog[0], 150)]).calories, 195);
});
test('numeric, food and date validation rejects coercion, impossible dates and future days', () => {
  for (const value of [null, false, {}, [], '', 'NaN', Infinity, -1]) assert.throws(() => n.number(value, 0, 100, '量'));
  for (const value of ['2026-02-30', '2026-09-29', '2024-01-01', 'bad']) assert.throws(() => n.dateOnly(value, '2026-09-28'));
  assert.equal(n.dateOnly('2026-09-28', '2026-09-28'), '2026-09-28');
  assert.throws(() => n.validateFood({ name: 'oil', unit: 'g', category: 'fat', weightType: 'raw', per100: { calories: -1 } }));
});
test('incomplete days never become zero intake, and missing weights never become zero weights', () => {
  const sample = rows(); sample[0].complete = false; sample[0].totals.calories = 0; sample[1].weight = null;
  const report = n.period(sample, '2026-09-01', '2026-09-07');
  assert.equal(report.calories, 2200); assert.equal(report.weight, 80); assert.equal(report.completeDays, 6); assert.equal(report.weightDays, 6);
  assert.equal(n.period([], '2026-09-01', '2026-09-07').calories, null);
});
test('calibration requires complete logs, sufficient endpoint weights, stability and explicit adoption', () => {
  const sample = rows(); const ready = n.calibration(profile, sample, '2026-09-07');
  assert.equal(ready.ready, true); assert.equal(ready.maintenance, 2200); assert.equal(ready.target, 1700);
  assert.equal(profile.targetCalories, undefined);
  assert.equal(n.calibration(profile, sample, '2026-09-06').ready, false);
  sample[0].complete = false; assert.equal(n.calibration(profile, sample, '2026-09-07').ready, false);
  sample[0].complete = true; sample[0].weight = null; sample[1].weight = null; assert.equal(n.calibration(profile, sample, '2026-09-07').change, null);
  const moving = rows(); moving[4].weight = 78; moving[5].weight = 78; moving[6].weight = 78;
  assert.equal(n.calibration(profile, moving, '2026-09-07').maintenance, null);
});
test('14-day calibration allows two incomplete days but requires ten weights', () => {
  const sample = rows(14); sample[4].complete = false; sample[6].complete = false;
  assert.equal(n.calibration({ ...profile, calibrationDays: 14 }, sample, '2026-09-14').ready, true);
  sample[7].complete = false;
  assert.equal(n.calibration({ ...profile, calibrationDays: 14 }, sample, '2026-09-14').ready, false);
});
test('automated target suppressed for minors, clinical diets and targets outside guardrails', () => {
  for (const p of [{ ...profile, age: 17 }, { ...profile, needsClinicalAdvice: true }]) assert.equal(n.calibration(p, rows(), '2026-09-07').target, null);
  assert.equal(n.calibration(profile, rows(7, 1400), '2026-09-07').target, null);
});
test('three-week plateau suggestions require adherence and respect observation interval', () => {
  const p = { ...profile, targetCalories: 1800, targetSince: '2026-09-01' };
  const sample = rows(21, 1800);
  assert.equal(n.adjustment(p, sample, '2026-09-22').target, 1675);
  assert.equal(n.adjustment({ ...p, targetSince: '2026-09-05' }, sample, '2026-09-22').action, 'hold');
  sample.forEach(row => { row.totals.calories = 2500; });
  assert.equal(n.adjustment(p, sample, '2026-09-22').action, 'hold');
});
test('recomp increase needs falling weekly means, actual strength comparisons and poor recovery', () => {
  const p = { ...profile, sex: 'male', goal: 'recomp', targetCalories: 2200, targetSince: '2026-09-01' };
  const sample = rows(21); sample.forEach((row, i) => { row.weight = 80 - Math.floor(i / 7) * .4; row.recovery = 'poor'; });
  assert.equal(n.adjustment(p, sample, '2026-09-22').action, 'hold');
  const logs = ['2026-09-02', '2026-09-18'].map(date => ({ date, exerciseLogs: { press: { completed: true, weightKg: 20, actualReps: [10, 10] } } }));
  assert.equal(n.adjustment(p, sample, '2026-09-22', logs).target, 2325);
  logs[1].exerciseLogs.press.weightKg = 25;
  assert.equal(n.adjustment(p, sample, '2026-09-22', logs).action, 'hold');
});
test('partner projection never exposes private body values, targets, recovery or own entry permissions', () => {
  const row = { complete: true, weight: 80, waist: 90, thigh: 55, totals: { calories: 1800 }, entries: [{ id: 'x', meal: 'lunch', foods: [], canEdit: true, sharedAmounts: [100] }] };
  assert.deepEqual(n.partnerView({ allowSharedMeals: false, privacy: {} }, row), { initialized: true, allowSharedMeals: false, privacy: {} });
  const exposed = n.partnerView({ allowSharedMeals: true, privacy: { calories: true, foods: true } }, row);
  assert.equal(exposed.calories, 1800); assert.equal(exposed.weight, undefined); assert.equal(exposed.entries[0].canEdit, undefined); assert.equal(exposed.entries[0].sharedAmounts, undefined);
});
test('day completeness fingerprint invalidated by any concurrent add, edit or soft delete', () => {
  const entry = { _id: '1', date: '2026-09-01', creatorId: 'mine', revision: 0, portions: [{ userId: 'mine', foods: [n.snapshot(catalog[0], 100)] }] };
  const initial = n.summarize(entry.date, 'mine', [], [entry]);
  const day = { date: entry.date, fullDayConfirmedAt: new Date(), confirmedFingerprint: initial.fingerprint };
  assert.equal(n.summarize(entry.date, 'mine', [day], [entry]).complete, true);
  assert.equal(n.summarize(entry.date, 'mine', [day], [{ ...entry, revision: 1 }]).complete, false);
  assert.equal(n.summarize(entry.date, 'mine', [day], [entry, { ...entry, _id: '2' }]).complete, false);
  assert.equal(n.summarize(entry.date, 'mine', [day], [{ ...entry, deleted: true }]).complete, false);
});
