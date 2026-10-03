const crypto = require('node:crypto');
const n = require('./nutrition');
const INTENTS = ['ADD_MEAL', 'ADD_FOOD', 'MODIFY_FOOD', 'REMOVE_FOOD', 'MODIFY_PORTION', 'QUESTION', 'HYPOTHETICAL', 'SWITCH_PERSON'];
const clone = value => JSON.parse(JSON.stringify(value));
const optionalText = (value, max = 300) => value == null || value === '' ? '' : n.text(value, max, '识别说明');
const rounded = v => Math.round(v * 10) / 10;

function labelFood(label, name) {
  const unit = n.choice(label.unit, ['g', 'ml'], '标签单位');
  const basis = n.number(label.basisAmount, 0.1, 3000, '标签每份重量');
  const energy = n.number(label.energy, 0, 30000, '标签能量');
  const factor = n.choice(label.energyUnit, ['kcal', 'kJ'], '能量单位') === 'kJ' ? 1 / 4.184 : 1;
  const per100 = { calories: energy * factor * 100 / basis };
  for (const key of ['protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodium']) {
    per100[key] = label[key] == null && ['fiber', 'sugar', 'sodium'].includes(key) ? null : n.number(label[key], 0, key === 'sodium' ? 100000 : 3000, key) * 100 / basis;
  }
  if (per100.calories > 1000 || ['protein', 'fat', 'carbs', 'fiber', 'sugar'].some(k => per100[k] > 100) || per100.protein + per100.fat + per100.carbs > 105) n.fail('标签数值不合理，请核对每份重量与单位');
  for (const key of Object.keys(per100)) if (per100[key] != null) per100[key] = Math.round(per100[key] * 10000) / 10000;
  return { foodId: 'label', name, unit, weightType: 'ready', category: 'other', per100,
    source: '包装营养表 · 用户核对', sourceUrl: '' };
}
function normalizeFood(raw, catalog, options = {}) {
  const name = n.text(raw.name, 60, '食物名称');
  const served = n.number(raw.served, 0.1, 3000, '可食份量');
  const consumed = n.number(raw.consumed, 0, served, '实际摄入');
  const range = Array.isArray(raw.range) && raw.range.length === 2 ? raw.range.map(v => n.number(v, 0, 4000, '份量范围')) : [served, served];
  if (range[0] > served || range[1] < served) n.fail('份量范围不一致，请重新识别');
  const food = catalog.find(f => String(f.id || f._id) === raw.foodId);
  const value = { id: options.id || crypto.randomUUID(), name, foodId: food ? String(food.id || food._id) : null,
    served, consumed, range, foodConfidence: n.choice(raw.foodConfidence, ['high', 'medium', 'low'], '识别置信度'),
    portionConfidence: n.choice(raw.portionConfidence, ['high', 'medium', 'low'], '份量置信度'),
    candidates: Array.isArray(raw.candidates) ? raw.candidates.slice(0, 5).map(v => n.text(v, 60, '候选食物')) : [],
    cooking: optionalText(raw.cooking, 60), basis: n.choice(raw.basis, ['visual', 'user', 'label', 'assumption'], '估重方式'),
    note: optionalText(raw.note), label: null, labelConfirmed: false, excluded: options.excluded === true, snapshot: null };
  if (value.basis === 'visual' && /^(Oil,|Butter,|Salad dressing,)/i.test(food?.sourceDescription || '')) {
    value.basis = 'assumption';
    value.note = '油和酱料无法仅凭照片量出；此份量为假设估计，可按实际情况修改。';
    value.portionConfidence = 'low';
  }
  if (raw.label && options.allowLabel) {
    const candidate = labelFood(raw.label, name);
    value.label = Object.fromEntries(['basisAmount', 'unit', 'energy', 'energyUnit', 'protein', 'fat', 'carbs', 'fiber', 'sugar', 'sodium', 'netAmount', 'servingAmount'].map(key => [key, raw.label[key] ?? null]));
    for (const key of ['netAmount', 'servingAmount']) if (value.label[key] != null) value.label[key] = n.number(value.label[key], 0.1, 10000, '包装重量');
    value.foodId = null;
    value.labelConfirmed = options.labelConfirmed === true;
    if (value.labelConfirmed) value.snapshot = { ...candidate, amount: consumed };
  } else if (food) {
    value.snapshot = { ...n.snapshot(food, Math.max(0.1, consumed)), amount: consumed };
  }
  return value;
}
// The snapshot uses percent units: per100 is one whole dish, amount is its eaten percentage.
// This keeps historical meal/day/template readers compatible without inventing gram weights.
function normalizeDish(raw, id) {
  if (raw.estimate?.calories == null) return null;
  const name = n.text(raw.name, 60, '菜名');
  const estimate = Object.fromEntries(n.NUTRIENTS.map(key => [key, raw.estimate[key] == null ? null :
    n.number(raw.estimate[key], 0, key === 'calories' ? 20000 : 3000, 'AI 估计值')]));
  const ratio = n.number(raw.ratio ?? 1, 0, 1, '食用比例');
  return { id: id || crypto.randomUUID(), name, estimate, ratio, served: 100, consumed: ratio * 100,
    range: [100, 100], excluded: ratio === 0, note: optionalText(raw.note),
    snapshot: { foodId: 'ai-estimate', name, unit: '%', weightType: 'ready', category: 'other',
      per100: estimate, amount: ratio * 100, source: 'AI 粗估', sourceUrl: '' } };
}
function currentDish(food) {
  if (food.estimate) return { id: food.id, name: food.name, estimate: food.estimate, ratio: food.consumed / food.served, note: food.note || '' };
  return { id: food.id, name: food.name, ratio: food.consumed / food.served,
    estimate: food.snapshot ? Object.fromEntries(n.NUTRIENTS.map(key => [key, food.snapshot.per100[key] == null ? null : food.snapshot.per100[key] * food.served / 100])) : null };
}
function applyDishInterpretation(result, state, { target = 'self' } = {}) {
  n.choice(result.intent, INTENTS, '识别意图');
  const resultTarget = n.choice(result.target, ['self', 'partner'], '记录对象');
  const answer = optionalText(result.answer, 600);
  if (['QUESTION', 'HYPOTHETICAL', 'SWITCH_PERSON'].includes(result.intent) || resultTarget !== target) {
    return { readOnly: true, intent: resultTarget !== target ? 'SWITCH_PERSON' : result.intent, target: resultTarget, answer };
  }
  if (!Array.isArray(result.operations) || result.operations.length > 40) n.fail('识别结果无效，请重试', 502);
  const next = clone(state);
  for (const operation of result.operations) {
    const op = n.choice(operation.op, ['add', 'update', 'remove'], '菜品操作');
    const index = next.foods.findIndex(food => food.id === operation.id);
    if (op !== 'add' && index < 0) n.fail('AI 未找到要修改的菜，原记录已保留', 502);
    if (op === 'remove') {
      const food = next.foods[index]; food.consumed = 0; food.ratio = 0; food.excluded = true;
      if (food.snapshot) food.snapshot.amount = 0;
      continue;
    }
    if (!operation.food || typeof operation.food !== 'object') n.fail('AI 菜品信息不完整', 502);
    const raw = op === 'update' ? { ...currentDish(next.foods[index]), ...operation.food } : operation.food;
    const food = normalizeDish(raw, op === 'update' ? next.foods[index].id : undefined);
    if (!food) continue; // Unrecognizable dishes do not become pending database matches.
    if (op === 'add') next.foods.push(food); else next.foods[index] = food;
  }
  if (next.foods.length > 40) n.fail('这餐菜品较多，请分餐记录', 502);
  next.mode = 'estimate'; next.question = null; next.answer = answer; next.weightCheck = '';
  return { state: next, name: optionalText(result.name, 60), intent: result.intent };
}
function applyInterpretation(result, state, catalog, { allowLabel = false, target = 'self' } = {}) {
  n.choice(result.intent, INTENTS, '识别意图');
  const resultTarget = n.choice(result.target, ['self', 'partner'], '记录对象');
  const answer = optionalText(result.answer, 600);
  if (['QUESTION', 'HYPOTHETICAL', 'SWITCH_PERSON'].includes(result.intent) || resultTarget !== target) {
    return { readOnly: true, intent: resultTarget !== target ? 'SWITCH_PERSON' : result.intent, target: resultTarget, answer };
  }
  if (!Array.isArray(result.operations) || result.operations.length > 40) n.fail('识别结果无效，请重试', 502);
  const next = clone(state);
  for (const operation of result.operations) {
    const op = n.choice(operation.op, ['add', 'update', 'remove'], '食物操作');
    const index = next.foods.findIndex(food => food.id === operation.id);
    if (op !== 'add' && index < 0) n.fail('AI 未找到要修改的食物，原餐次已保留', 502);
    if (op === 'remove') { next.foods[index].consumed = 0; next.foods[index].excluded = true; if (next.foods[index].snapshot) next.foods[index].snapshot.amount = 0; continue; }
    const old = index >= 0 ? next.foods[index] : null;
    const raw = op === 'update' ? { ...old, ...operation.food } : operation.food;
    if (!raw || typeof raw !== 'object') n.fail('AI 食物信息不完整', 502);
    // Labels are evidence extracted from this image or an already saved label, never model knowledge.
    const unchangedLabel = old?.label && JSON.stringify(old.label) === JSON.stringify(raw.label);
    const food = normalizeFood(raw, catalog, { id: op === 'update' ? old.id : undefined,
      allowLabel: allowLabel || Boolean(unchangedLabel), labelConfirmed: Boolean(unchangedLabel && old.labelConfirmed),
      excluded: op === 'update' && (operation.food?.consumed === 0 || (old.excluded && operation.food?.consumed == null)) });
    if (op === 'add') next.foods.push(food); else next.foods[index] = food;
  }
  if (next.foods.length > 40 || next.foods.reduce((s, f) => s + f.served, 0) > 10000) n.fail('这餐估计总量过大，请核对份量', 502);
  next.question = null;
  if (result.question && next.questionCount < 2 && Number(result.question.impactKcal) >= 50) {
    next.question = { text: n.text(result.question.text, 160, '追问'), options: (result.question.options || []).slice(0, 4).map(v => n.text(v, 30, '选项')) };
    next.questionCount++;
  }
  next.answer = answer; next.weightCheck = optionalText(result.weightCheck, 300);
  return { state: next, name: optionalText(result.name, 60), intent: result.intent };
}
function portions(state, userId) {
  if (!state.foods.some(f => f.snapshot)) return [];
  return [{ userId, foods: state.foods.filter(f => f.snapshot && f.consumed > 0).map(f => ({ ...f.snapshot, amount: f.consumed })) }];
}
function view(entry, userId) {
  const ai = entry.ai;
  const foods = ai.foods.map(({ snapshot, ...f }) => ({ ...f, unit: snapshot?.unit || f.label?.unit || 'g',
    source: snapshot?.source || null, matchedName: snapshot?.name || null, totals: snapshot ? n.totals([{ ...snapshot, amount: f.consumed }]) : null }));
  const known = ai.foods.filter(f => f.snapshot).map(f => ({ ...f.snapshot, amount: f.consumed }));
  const low = known.map(f => ({ ...f, amount: f.amount })); const high = clone(low);
  ai.foods.filter(f => f.snapshot).forEach((f, i) => { const ratio = f.consumed / f.served; low[i].amount = f.range[0] * ratio; high[i].amount = f.range[1] * ratio; });
  return { id: String(entry._id), date: entry.date, meal: entry.meal, name: entry.name, revision: entry.revision,
    target: ai.ownerId === userId ? 'self' : 'partner', status: 'editing', foods: foods.filter(f => f.totals),
    question: ai.question, questionCount: ai.questionCount, answer: ai.answer, weightCheck: ai.weightCheck, hasBeforeImage: Boolean(ai.hasBeforeImage),
    totals: n.totals(known), calorieRange: [n.totals(low).calories, n.totals(high).calories],
    servedGrams: rounded(foods.filter(f => f.unit === 'g').reduce((s, f) => s + f.served, 0)),
    servedMl: rounded(foods.filter(f => f.unit === 'ml').reduce((s, f) => s + f.served, 0)) };
}
module.exports = { applyInterpretation, applyDishInterpretation, currentDish, normalizeDish, normalizeFood, labelFood, portions, view };
