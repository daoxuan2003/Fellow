const test = require('node:test');
const assert = require('node:assert/strict');
const ai = require('../services/nutritionAi');
const n = require('../services/nutrition');
const catalog = require('../data/nutrition-foods.json');
const provider = require('../services/doubao');
const food = extra => ({ name: '米饭', foodId: catalog[0].id, served: 120, consumed: 120, range: [90, 150], foodConfidence: 'high', portionConfidence: 'medium', basis: 'visual', candidates: [], ...extra });
const initial = () => ({ ownerId: 'me', foods: [], questionCount: 0, requests: [] });
const result = (operations, extra = {}) => ({ intent: 'ADD_MEAL', target: 'self', name: '午餐', answer: '', operations, ...extra });
test('model nutrient numbers never control totals; portions update the same food id', () => {
  const added = ai.applyInterpretation(result([{ op: 'add', food: food({ calories: 9999, per100: { calories: 1 } }) }]), initial(), catalog).state;
  assert.equal(n.totals(ai.portions(added, 'me')[0].foods).calories, 156);
  const id = added.foods[0].id;
  const modified = ai.applyInterpretation(result([{ op: 'update', id, food: { consumed: 60 } }], { intent: 'MODIFY_PORTION' }), added, catalog).state;
  assert.equal(modified.foods.length, 1); assert.equal(modified.foods[0].id, id);
  assert.equal(n.totals(ai.portions(modified, 'me')[0].foods).calories, 78);
  const removed = ai.applyInterpretation(result([{ op: 'remove', id }]), modified, catalog).state;
  assert.equal(ai.portions(removed, 'me')[0].foods.length, 0);
});
test('hypotheticals, questions, and different actors ignore even malicious operations', () => {
  for (const intent of ['QUESTION', 'HYPOTHETICAL', 'SWITCH_PERSON']) assert.equal(ai.applyInterpretation(result([{ op: 'add', food: food() }], { intent }), initial(), catalog).readOnly, true);
  assert.equal(ai.applyInterpretation(result([{ op: 'add', food: food() }], { target: 'partner' }), initial(), catalog).readOnly, true);
});
test('unknown matches stay unresolved; confidence and edible range are independent', () => {
  const state = ai.applyInterpretation(result([{ op: 'add', food: food({ foodId: 'invented', name: '鱼豆腐 / 千页豆腐', candidates: ['鱼豆腐', '千页豆腐'] }) }]), initial(), catalog).state;
  assert.equal(state.foods[0].snapshot, null); assert.equal(ai.portions(state, 'me').length, 0);
  const view = ai.view({ _id: 'meal', ai: state, revision: 1 }, 'me'); assert.equal(view.status, 'editing'); assert.equal(view.foods.length, 0); assert.equal(state.foods[0].foodConfidence, 'high'); assert.equal(state.foods[0].portionConfidence, 'medium');
  assert.throws(() => ai.normalizeFood(food({ consumed: 121 }), catalog));
  assert.throws(() => ai.normalizeFood(food({ range: [130, 150] }), catalog));
  assert.throws(() => ai.applyInterpretation(result([{ op: 'update', id: 'foreign', food: {} }]), initial(), catalog));
});
test('only one question per response, max two per meal, insignificant variables suppressed', () => {
  let state = initial();
  for (let i = 0; i < 3; i++) state = ai.applyInterpretation(result([], { question: { text: '油量如何？', options: ['少油', '正常', '偏油'], impactKcal: 150 } }), state, catalog).state;
  assert.equal(state.questionCount, 2); assert.equal(state.question, null);
  assert.equal(ai.applyInterpretation(result([], { question: { text: '盐呢？', impactKcal: 5 } }), initial(), catalog).state.question, null);
});
test('label per-serving kJ converts deterministically, extracted labels require confirmation', () => {
  const label = { basisAmount: 25, unit: 'g', energy: 418.4, energyUnit: 'kJ', protein: 2, fat: 3, carbs: 15, sugar: 5, sodium: 120 };
  const f = ai.normalizeFood(food({ foodId: null, label, served: 100, consumed: 25 }), catalog, { allowLabel: true });
  assert.equal(f.snapshot, null); assert.equal(f.labelConfirmed, false);
  const confirmed = ai.normalizeFood({ ...f, label }, catalog, { allowLabel: true, labelConfirmed: true });
  assert.equal(confirmed.snapshot.per100.calories, 400); assert.equal(confirmed.snapshot.per100.sodium, 480);
  assert.equal(n.totals([confirmed.snapshot]).calories, 100);
  assert.equal(ai.normalizeFood(food({ foodId: null, label }), catalog).label, null);
  assert.throws(() => ai.labelFood({ ...label, basisAmount: 1 }, 'bad'));
});
test('provider explicitly disables thinking, sends only approved endpoint and rejects incomplete/error content', async () => {
  const original = global.fetch, oldKey = process.env.ARK_API_KEY;
  process.env.ARK_API_KEY = 'synthetic-not-a-real-key'; let sent;
  global.fetch = async (url, options) => { sent = { url, body: JSON.parse(options.body) }; return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: '{"intent":"QUESTION"}' } }] }) }; };
  try {
    assert.equal((await provider.interpret({ text: '假设', current: {}, catalog: [], mode: 'text', target: 'self' })).intent, 'QUESTION');
    assert.equal(JSON.parse(sent.body.messages[1].content[0].text).foodCatalog, undefined); assert.equal(sent.body.thinking.type, 'disabled'); assert.equal(sent.body.response_format.type, 'json_object');
    assert.equal(sent.url, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
    global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ secret: 'must not leak' }) });
    await assert.rejects(provider.interpret({ catalog: [] }), error => error.status === 502 && !error.message.includes('secret'));
    delete process.env.ARK_API_KEY;
    await assert.rejects(provider.interpret({ catalog: [] }), error => error.status === 503);
  } finally { global.fetch = original; if (oldKey === undefined) delete process.env.ARK_API_KEY; else process.env.ARK_API_KEY = oldKey; }
});

const dish = extra => ({ name: '番茄炒蛋', estimate: { calories: 420, protein: 20, fat: 28, carbs: 18 }, ratio: 1, ...extra });
test('dish estimates scale absolute fractions without database matching or repeated halving', () => {
 let state=ai.applyDishInterpretation(result([{op:'add',food:dish()},{op:'add',food:dish({name:'米饭',estimate:{calories:200}})}]),initial()).state;
 const id=state.foods[0].id;
 assert.equal(n.totals(ai.portions(state,'me')[0].foods).calories,620);
 for(let i=0;i<2;i++)state=ai.applyDishInterpretation(result([{op:'update',id,food:{ratio:.5}}]),state).state;
 assert.equal(state.foods.length,2); assert.equal(state.foods[0].id,id);
 assert.equal(n.totals(ai.portions(state,'me')[0].foods).calories,410);
 assert.equal(n.totals(ai.portions(state,'me')[0].foods).proteinKnown,false);
 state=ai.applyDishInterpretation(result([{op:'remove',id}]),state).state;
 assert.equal(n.totals(ai.portions(state,'me')[0].foods).calories,200);
});
test('unknown dishes omitted; invalid estimates fail; readonly intents ignore model mutations',()=>{
 assert.equal(ai.applyDishInterpretation(result([{op:'add',food:{name:'未知',estimate:null}}]),initial()).state.foods.length,0);
 for(const calories of [-1,Infinity,'bad',20001])assert.throws(()=>ai.normalizeDish(dish({estimate:{calories}})));
 assert.throws(()=>ai.normalizeDish(dish({ratio:2})));
 for(const intent of ['QUESTION','HYPOTHETICAL','SWITCH_PERSON'])assert.equal(ai.applyDishInterpretation(result([{op:'add',food:dish()}],{intent}),initial()).readOnly,true);
 assert.equal(ai.applyDishInterpretation(result([],{target:'partner'}),initial()).readOnly,true);
 assert.throws(()=>ai.applyDishInterpretation(result([{op:'update',id:'foreign',food:dish()}]),initial()));
});
test('legacy snapshots convert to whole-dish estimates with unchanged nutrition basis',()=>{
 const old=ai.normalizeFood(food(),catalog),state={...initial(),foods:[old]};
 const next=ai.applyDishInterpretation(result([{op:'update',id:old.id,food:{ratio:.5}}]),state).state;
 assert.equal(n.totals(ai.portions(next,'me')[0].foods).calories,78);
 assert.equal(next.foods[0].snapshot.unit,'%');assert.equal(next.foods[0].id,old.id);assert.equal(state.foods[0].consumed,120);
});
