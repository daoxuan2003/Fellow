const { offsetDateOnly } = require('./fitnessPlan');
const crypto = require('node:crypto');
const MEALS = ['breakfast', 'lunch', 'dinner', 'snack'];
const NUTRIENTS = ['calories', 'protein', 'carbs', 'fat', 'fiber'];
const PRIVACY = ['completion', 'calories', 'foods', 'weight', 'waist', 'thigh'];
const fail = (message, status = 400) => { const error = new Error(message); error.status = status; throw error; };
function number(value, min, max, label) {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim()) || !Number.isFinite(Number(value)) || Number(value) < min || Number(value) > max) fail(`${label}须在 ${min}–${max} 之间`);
  return Number(value);
}
function text(value, max, label) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(`请填写${label}（最多 ${max} 字）`);
  return value.trim();
}
function choice(value, choices, label) { if (!choices.includes(value)) fail(`请选择有效的${label}`); return value; }
function dateOnly(value, today) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(`${value}T12:00:00Z`)) || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value || value > today || value < offsetDateOnly(today, -365)) fail('请选择过去一年内的有效日期');
  return value;
}
function validateProfile(body) {
  const value = {
    sex: choice(body.sex, ['male', 'female'], '生理性别'), age: number(body.age, 1, 110, '年龄'),
    height: number(body.height, 100, 230, '身高'), baselineWeight: number(body.baselineWeight, 25, 300, '当前体重'),
    waist: number(body.waist, 35, 250, '腰围'), goal: choice(body.goal, ['fat_loss', 'maintain', 'gain', 'recomp'], '目标'),
    protein: number(body.protein, 30, 250, '蛋白质目标'), fiber: number(body.fiber, 10, 60, '纤维目标')
  };
  for (const [key, max] of [['thigh', 150], ['hip', 250], ['bodyFat', 70]]) value[key] = body[key] == null || body[key] === '' ? null : number(body[key], 1, max, key);
  if (typeof body.needsClinicalAdvice !== 'boolean' || typeof body.allowSharedMeals !== 'boolean') fail('请确认健康情况与共享餐设置');
  value.needsClinicalAdvice = body.needsClinicalAdvice;
  value.allowSharedMeals = body.allowSharedMeals;
  value.allowPartnerAiMeals = body.allowPartnerAiMeals === true;
  value.privacy = Object.fromEntries(PRIVACY.map(key => {
    if (typeof body.privacy?.[key] !== 'boolean') fail('请确认每项隐私设置');
    return [key, body.privacy[key]];
  }));
  return value;
}
function validateFood(body) {
  return {
    name: text(body.name, 60, '食物名称'), unit: choice(body.unit, ['g', 'ml'], '单位'),
    category: choice(body.category, ['protein', 'staple', 'vegetable', 'fruit', 'fat', 'other'], '分类'),
    weightType: choice(body.weightType, ['raw', 'cooked', 'ready'], '称量状态'),
    per100: Object.fromEntries(NUTRIENTS.map(key => [key, number(body.per100?.[key], 0, key === 'calories' ? 1000 : 100, `每 100 ${body.unit} ${key}`)])),
    source: '本人填写 · 请核对包装营养表', sourceUrl: ''
  };
}
function snapshot(food, amount) {
  return { foodId: String(food.id || food._id), name: food.name, category: food.category, unit: food.unit, weightType: food.weightType,
    per100: Object.fromEntries(NUTRIENTS.map(key => [key, food.per100[key] ?? null])), source: food.source, sourceUrl: food.sourceUrl || '', amount: number(amount, 0.1, 3000, '份量') };
}
function totals(foods) {
  const result = Object.fromEntries(NUTRIENTS.map(key => [key, 0]));
  result.fiberKnown = true;
  for (const food of foods) for (const key of NUTRIENTS) {
    if (food.per100[key] == null) { if (key === 'fiber') result.fiberKnown = false; continue; }
    result[key] += food.per100[key] * food.amount / 100;
  }
  for (const key of NUTRIENTS) result[key] = Math.round(result[key] * 10) / 10;
  return result;
}
function serializeEntry(entry, userId) {
  const portion = entry.portions.find(part => String(part.userId) === String(userId));
  if (!portion || entry.deleted) return null;
  return { id: String(entry._id), date: entry.date, meal: entry.meal, name: entry.name, shared: entry.shared,
    aiManaged: Boolean(entry.ai), pendingFoods: entry.ai?.foods?.filter(food => !food.snapshot && (food.consumed > 0 || (food.label && !food.labelConfirmed && !food.excluded))).length || 0,
    canEdit: String(entry.creatorId) === String(userId), revision: entry.revision, foods: portion.foods, totals: totals(portion.foods),
    ...(entry.shared && String(entry.creatorId) === String(userId) ? { sharedAmounts: entry.portions.find(part => String(part.userId) !== String(userId))?.foods.map(food => food.amount) } : {}) };
}
function trainingState(log) {
  if (!log) return { state: 'unrecorded', label: '训练待记录' };
  if (log.workoutKey === 'rest') return { state: 'rest', label: '今天休息 / 忙碌' };
  if (log.sessionFinishedAt) return { state: 'finished', label: `${log.workoutKey} 训练已结束` };
  if (Object.values(log.exerciseLogs || {}).some(item => item.completed)) return { state: 'started', label: `${log.workoutKey} 训练进行中` };
  return { state: 'unrecorded', label: '训练待记录' };
}
function summarize(date, userId, days, entries, training = []) {
  const day = days.find(item => item.date === date) || {};
  const related = entries.filter(item => item.date === date && item.portions.some(part => String(part.userId) === String(userId)));
  const visible = related.map(entry => serializeEntry(entry, userId)).filter(Boolean);
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(related.map(item => [String(item._id), item.revision || 0, Boolean(item.deleted)]).sort((a, b) => a[0].localeCompare(b[0])))).digest('hex');
  return { date, weight: day.weight ?? null, waist: day.waist ?? null, thigh: day.thigh ?? null, recovery: day.recovery || 'unknown',
    fingerprint, complete: Boolean(visible.length && day.fullDayConfirmedAt && day.confirmedFingerprint === fingerprint),
    entries: visible, totals: totals(visible.flatMap(entry => entry.foods)), walks: day.walks || [],
    training: trainingState(training.find(item => item.date === date)) };
}
const average = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
const rounded = value => value == null ? null : Math.round(value * 10) / 10;
function period(rows, from, until) {
  const selected = rows.filter(row => row.date >= from && row.date <= until);
  const complete = selected.filter(row => row.complete);
  return { from, until, completeDays: complete.length, weightDays: selected.filter(row => row.weight != null).length,
    weight: rounded(average(selected.filter(row => row.weight != null).map(row => row.weight))),
    calories: rounded(average(complete.map(row => row.totals.calories))), protein: rounded(average(complete.map(row => row.totals.protein))),
    fiber: rounded(average(complete.map(row => row.totals.fiber))), fiberKnown: complete.every(row => row.totals.fiberKnown),
    walks: selected.reduce((sum, row) => sum + row.walks.filter(walk => walk.completedAt).length, 0),
    trainings: selected.filter(row => row.training.state === 'finished').length };
}
function eligible(profile) { return profile.age >= 18 && !profile.needsClinicalAdvice; }
function safeTarget(profile, value) { return Number.isFinite(value) && value >= (profile.sex === 'female' ? 1400 : 1600) && value <= 4500; }
function calibration(profile, rows, today) {
  const end = offsetDateOnly(profile.calibrationStart, profile.calibrationDays - 1);
  const sample = rows.filter(row => row.date >= profile.calibrationStart && row.date <= end);
  const report = period(sample, profile.calibrationStart, end);
  const first = sample.filter(row => row.date <= offsetDateOnly(profile.calibrationStart, 2) && row.weight != null);
  const last = sample.filter(row => row.date >= offsetDateOnly(end, -2) && row.weight != null);
  const change = first.length >= 2 && last.length >= 2 ? average(last.map(row => row.weight)) - average(first.map(row => row.weight)) : null;
  const enough = report.completeDays >= (profile.calibrationDays === 7 ? 7 : 12) && report.weightDays >= (profile.calibrationDays === 7 ? 5 : 10) && change != null;
  const stable = enough && Math.abs(change) / average(first.map(row => row.weight)) <= 0.005;
  const maintenance = stable ? Math.round(report.calories) : null;
  const target = maintenance == null ? null : maintenance + ({ fat_loss: -500, maintain: 0, recomp: 0, gain: 100 }[profile.goal]);
  const ready = today >= end && stable && eligible(profile) && safeTarget(profile, target);
  return { ...report, days: profile.calibrationDays, change: rounded(change), maintenance, target: ready ? target : null,
    ready, canExtend: profile.calibrationDays === 7, reason: !eligible(profile) ? '未成年人、孕哺期或需医疗饮食管理时，仅提供记录，不自动建议热量。' : today < end ? '继续记录完整饮食日与晨重，先不设固定热量。' : !enough ? '完整饮食或两端晨重不足，请延长或重新校准；缺失天数不会按零计算。' : !stable ? '体重仍在变化，这段摄入不能作为稳定维持热量；请重新校准。' : !safeTarget(profile, target) ? '估算超出自动建议范围，请保留记录并向专业人员确认目标。' : '体重相对稳定：这是本次记录的参考估算，建议记录满 14 天再采用。' };
}
function strengthTrend(logs, from, until) {
  const samples = new Map();
  for (const log of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    if (log.date < from || log.date > until) continue;
    for (const [key, value] of Object.entries(log.exerciseLogs || {})) {
      if (!value.completed || !Number.isFinite(value.weightKg) || !value.actualReps?.length || !value.actualReps.some(n => n > 0)) continue;
      const list = samples.get(key) || []; list.push({ date: log.date, weight: value.weightKg, reps: value.actualReps.reduce((a, b) => a + b, 0), sets: value.actualReps.length }); samples.set(key, list);
    }
  }
  const comparisons = [...samples.values()].filter(list => list.length >= 2 && list[0].date !== list.at(-1).date && list[0].sets === list.at(-1).sets);
  if (!comparisons.length) return 'unknown';
  if (comparisons.some(list => list.at(-1).weight >= list[0].weight && list.at(-1).reps >= list[0].reps && (list.at(-1).weight > list[0].weight || list.at(-1).reps > list[0].reps))) return 'up';
  return 'not_up';
}
function adjustment(profile, rows, today, logs = []) {
  const from = offsetDateOnly(today, -21), end = offsetDateOnly(today, -1);
  const current = period(rows, offsetDateOnly(today, -7), end);
  const previous = period(rows, offsetDateOnly(today, -14), offsetDateOnly(today, -8));
  const older = period(rows, from, offsetDateOnly(today, -15));
  const strength = strengthTrend(logs, from, end);
  const base = { action: 'hold', target: profile.targetCalories, strength, reason: '先保持当前安排；建议只基于足够的完整记录。' };
  if (!eligible(profile) || !profile.targetCalories || !profile.targetSince || profile.targetSince > from || [current, previous, older].some(week => week.completeDays < 5 || week.weightDays < 5)) return base;
  const sample = rows.filter(row => row.date >= from && row.date <= end && row.complete);
  if (sample.filter(row => Math.abs(row.totals.calories - profile.targetCalories) <= profile.targetCalories * 0.15).length / sample.length < 0.8) return { ...base, reason: '先核对份量和记录习惯，暂不调整热量。' };
  const plateau = Math.abs(current.weight - previous.weight) < 0.2 && Math.abs(previous.weight - older.weight) < 0.2;
  let target = profile.targetCalories;
  if (profile.goal === 'fat_loss' && plateau) target -= 125;
  const poor = sample.filter(row => row.recovery === 'poor').length >= 5;
  if (['gain', 'recomp'].includes(profile.goal) && current.weight < previous.weight - 0.2 && previous.weight < older.weight - 0.2 && strength === 'not_up' && poor) target += 125;
  if (target !== profile.targetCalories && safeTarget(profile, target)) return { action: target < profile.targetCalories ? 'reduce' : 'increase', target, strength,
    reason: target < profile.targetCalories ? '连续三周均重变化小且记录较完整。可选择每天少 125 kcal，或保持摄入、增加适量日常活动。' : '连续均重下降，训练未见进步，且多次记录恢复较差。可尝试每天增加 125 kcal。' };
  return { ...base, reason: strength === 'up' ? '训练表现有提升，继续当前安排，结合腰围观察，不因单日体重改目标。' : '目前没有足够依据调整热量，继续观察趋势。' };
}
function partnerView(profile, row) {
  if (!profile) return { initialized: false, allowSharedMeals: false };
  const view = { initialized: true, allowSharedMeals: profile.allowSharedMeals, privacy: profile.privacy };
  for (const key of ['weight', 'waist', 'thigh']) if (profile.privacy?.[key]) view[key] = row[key];
  if (profile.privacy?.completion) view.complete = row.complete;
  if (profile.privacy?.calories) view.calories = row.totals.calories;
  if (profile.privacy?.foods) view.entries = row.entries.map(({ id, meal, name, foods, shared }) => ({ id, meal, name, foods, shared }));
  return view;
}
module.exports = { MEALS, NUTRIENTS, PRIVACY, fail, number, text, choice, dateOnly, validateProfile, validateFood, snapshot, totals, serializeEntry, summarize, period, calibration, adjustment, strengthTrend, partnerView, offsetDateOnly, rounded };
