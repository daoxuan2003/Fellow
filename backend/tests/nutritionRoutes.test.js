const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/auth');
const models = require('../models');
const helpers = require('../utils/helpers');
const router = require('../routes/nutrition');
const n = require('../services/nutrition');
const catalog = require('../data/nutrition-foods.json');
const userId = '111111111111111111111111', partnerId = '222222222222222222222222', outsider = '333333333333333333333333';
const coupleId = [userId, partnerId].sort().join('_');
let db, events, server, base, originals = [], idCounter, reciprocal;
const clone = value => structuredClone(value);
function valuesAt(object, path) {
  if (!path.length) return [object];
  if (Array.isArray(object)) return object.flatMap(item => valuesAt(item, path));
  return valuesAt(object?.[path[0]], path.slice(1));
}
function matches(row, filter) {
  return Object.entries(filter).every(([key, expected]) => {
    if (key === '$or') return expected.some(part => matches(row, part));
    const values = valuesAt(row, key.split('.'));
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) return Object.entries(expected).every(([op, value]) => {
      if (op === '$gte') return values.some(v => v >= value);
      if (op === '$lte') return values.some(v => v <= value);
      if (op === '$in') return values.some(v => value.includes(v));
      if (op === '$ne') return values.every(v => v !== value);
      if (op === '$elemMatch') return values.some(v => Array.isArray(v) && v.some(item => matches(item, value)));
      throw new Error(`Unsupported fixture operator ${op}`);
    });
    return values.some(value => expected === null ? value == null : value === expected);
  });
}
function query(read) {
  let sorting, limit;
  return { select() { return this; }, sort(value) { sorting = value; return this; }, limit(value) { limit = value; return this; },
    async lean() { let value = clone(read()); if (Array.isArray(value)) { if (sorting) value.sort((a, b) => { const [key, dir] = Object.entries(sorting)[0]; return a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0; }); if (limit) value = value.slice(0, limit); } return value; },
    then(resolve, reject) { return this.lean().then(resolve, reject); } };
}
function setField(row, path, value, filter) {
  const parts = path.split('.'); let cursor = row;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part === '$') { cursor = cursor.find(item => matches(item, filter.walks.$elemMatch)); continue; }
    cursor[part] ??= {}; cursor = cursor[part];
  }
  cursor[parts.at(-1)] = clone(value);
}
function apply(row, update, filter, fresh = false) {
  if (fresh) for (const [key, value] of Object.entries(update.$setOnInsert || {})) setField(row, key, value, filter);
  for (const [key, value] of Object.entries(update.$set || {})) setField(row, key, value, filter);
  for (const [key, value] of Object.entries(update.$inc || {})) row[key] = (row[key] || 0) + value;
  for (const [key, value] of Object.entries(update.$push || {})) (row[key] ||= []).push(clone(value));
  for (const [key, value] of Object.entries(update.$addToSet || {})) { row[key] ||= []; if (!row[key].includes(value)) row[key].push(value); }
  for (const [key, value] of Object.entries(update.$pull || {})) row[key] = (row[key] || []).filter(item => item !== value);
  row.updatedAt = new Date();
}
function mock(object, key, fn) { originals.push(() => { object[key] = original; }); const original = object[key]; object[key] = fn; }
function installStore() {
  for (const name of ['NutritionProfile', 'NutritionDay', 'NutritionEntry', 'NutritionFood', 'NutritionTemplate', 'FitnessDailyLog', 'HealthRecord']) {
    const model = models[name];
    mock(model, 'find', filter => query(() => db[name].filter(row => matches(row, filter))));
    mock(model, 'findOne', filter => query(() => db[name].find(row => matches(row, filter)) || null));
    mock(model, 'countDocuments', async filter => db[name].filter(row => matches(row, filter)).length);
    mock(model, 'create', async data => {
      const identity = name === 'NutritionEntry' ? ['coupleId', 'creatorId', 'requestId'] : name === 'NutritionProfile' ? ['coupleId', 'userId'] : null;
      if (identity && db[name].some(row => identity.every(key => row[key] === data[key]))) throw Object.assign(new Error('duplicate'), { code: 11000 });
      const row = { _id: (++idCounter).toString(16).padStart(24, '0'), revision: 0, deleted: false, createdAt: new Date(), updatedAt: new Date(), ...clone(data) };
      db[name].push(row); return clone(row);
    });
    mock(model, 'updateOne', async (filter, update, options = {}) => {
      let row = db[name].find(row => matches(row, filter));
      let fresh = false;
      if (!row && options.upsert) { row = { ...clone(filter), _id: (++idCounter).toString(16).padStart(24, '0'), walks: [] }; db[name].push(row); fresh = true; }
      if (!row) return { modifiedCount: 0 };
      apply(row, update, filter, fresh); return { modifiedCount: 1 };
    });
    mock(model, 'findOneAndUpdate', async (filter, update) => { const row = db[name].find(row => matches(row, filter)); if (!row) return null; apply(row, update, filter); return clone(row); });
    mock(model, 'findOneAndDelete', async filter => { const index = db[name].findIndex(row => matches(row, filter)); return index < 0 ? null : db[name].splice(index, 1)[0]; });
  }
  mock(models.User, 'findById', id => query(() => ({ _id: id, nickname: id === userId ? '我' : 'TA', gender: id === userId ? 'female' : 'male', birthday: new Date('1996-04-01'), partnerId: id === userId ? partnerId : reciprocal ? userId : outsider })));
  mock(helpers, 'getTodayString', () => '2026-09-28');
}
const makeProfile = id => ({ _id: id, coupleId, userId: id, sex: id === userId ? 'female' : 'male', age: 30, height: 160, baselineWeight: 80, waist: 90, thigh: null, hip: null, bodyFat: null, goal: 'fat_loss', protein: 115, fiber: 25, needsClinicalAdvice: false, allowSharedMeals: true, calibrationStart: '2026-09-22', calibrationDays: 7, revision: 0, targetCalories: null, favorites: [], privacy: { completion: true, calories: true, foods: false, weight: false, waist: false, thigh: false } });
const mealBody = (extra = {}) => ({ date: '2026-09-28', meal: 'dinner', requestId: 'request-123456789', name: '晚餐', items: [{ foodId: catalog[0].id, amount: 150, partnerAmount: 250 }], ...extra });
async function request(path = '', method = 'GET', body, actor = userId) {
  const headers = { 'Content-Type': 'application/json' };
  if (actor) headers.Authorization = `Bearer ${jwt.sign({ userId: actor }, JWT_SECRET, { expiresIn: '5m' })}`;
  const response = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: response.status, body: await response.json() };
}
test.before(async () => {
  installStore(); const app = express(); app.use(express.json()); app.locals.broadcastToCouple = (id, event) => events.push({ id, event, writes: db.NutritionEntry.length }); app.use('/api/nutrition', router);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve)); base = `http://127.0.0.1:${server.address().port}/api/nutrition`;
});
test.beforeEach(() => {
  db = Object.fromEntries(['NutritionProfile', 'NutritionDay', 'NutritionEntry', 'NutritionFood', 'NutritionTemplate', 'FitnessDailyLog', 'HealthRecord'].map(name => [name, []]));
  db.NutritionProfile = [makeProfile(userId), makeProfile(partnerId)]; events = []; reciprocal = true; idCounter = 100;
});
test.after(async () => { originals.reverse().forEach(restore => restore()); await new Promise(resolve => server.close(resolve)); });

test('JWT required and reciprocal current relationship is enforced before reads/writes', async () => {
  assert.equal((await request('', 'GET', undefined, null)).status, 401);
  reciprocal = false; assert.equal((await request('/entries', 'POST', mealBody())).status, 409);
  assert.equal(db.NutritionEntry.length, 0); assert.equal(events.length, 0);
});
test('shared meal atomically stores different portions, derives both actors and ignores submitted nutrient totals', async () => {
  const response = await request('/entries', 'POST', mealBody({ shared: true, userId: outsider, partnerId: outsider, coupleId: 'forged', calories: 1 }));
  assert.equal(response.status, 200); assert.equal(db.NutritionEntry.length, 1);
  const entry = db.NutritionEntry[0]; assert.equal(entry.coupleId, coupleId); assert.equal(entry.creatorId, userId);
  assert.deepEqual(entry.portions.map(p => p.userId), [userId, partnerId]); assert.equal(n.totals(entry.portions[0].foods).calories, 195); assert.equal(n.totals(entry.portions[1].foods).calories, 325);
  assert.equal(events[0].writes, 1); assert.deepEqual(events[0].event, { type: 'nutritionSync' });
});
test('shared meal rejects missing consent and invalid second portion without partial write', async () => {
  db.NutritionProfile[1].allowSharedMeals = false;
  assert.equal((await request('/entries', 'POST', mealBody({ shared: true }))).status, 403);
  db.NutritionProfile[1].allowSharedMeals = true;
  assert.equal((await request('/entries', 'POST', mealBody({ shared: true, items: [{ foodId: catalog[0].id, amount: 150, partnerAmount: 0 }] }))).status, 400);
  assert.equal(db.NutritionEntry.length, 0); assert.equal(events.length, 0);
});
test('concurrent retries create only one meal and conflicting idempotency key is rejected', async () => {
  const responses = await Promise.all([request('/entries', 'POST', mealBody({ shared: true })), request('/entries', 'POST', mealBody({ shared: true }))]);
  assert.ok(responses.every(r => r.status === 200)); assert.equal(db.NutritionEntry.length, 1);
  assert.equal((await request('/entries', 'POST', mealBody({ name: 'changed' }))).status, 409);
});
test('partner view honors privacy, own weights never enter shared health and food libraries are private', async () => {
  db.NutritionDay.push({ coupleId, userId: partnerId, date: '2026-09-28', weight: 79, waist: 88, recovery: 'poor', walks: [] });
  db.NutritionFood.push({ _id: outsider, coupleId, userId: partnerId, name: 'private custom food' });
  await request('/entries', 'POST', mealBody({ shared: true }));
  const response = await request(); assert.equal(response.status, 200);
  assert.equal(response.body.partner.calories, 325); assert.equal(response.body.partner.weight, undefined); assert.equal(response.body.partner.entries, undefined); assert.equal(response.body.partner.recovery, undefined);
  assert.equal(response.body.foods.some(f => f.id === outsider), false); assert.equal(response.body.profile.userId, undefined);
  assert.equal((await request('/day', 'PATCH', { date: '2026-09-28', weight: 77, userId: partnerId })).status, 200);
  assert.equal(db.NutritionDay.find(d => d.userId === userId).weight, 77); assert.equal(db.HealthRecord.length, 0);
});
test('only creator can change shared meal, revisions prevent lost update and ownership survives identity spoof', async () => {
  const created = await request('/entries', 'POST', mealBody({ shared: true })); const path = `/entries/${created.body.id}`;
  assert.equal((await request(path, 'PATCH', { revision: 0, deleted: true, creatorId: userId }, partnerId)).status, 403);
  const edits = await Promise.all([request(path, 'PATCH', { revision: 0, amounts: [{ mine: 100, partner: 200 }] }), request(path, 'PATCH', { revision: 0, amounts: [{ mine: 50, partner: 100 }] })]);
  assert.deepEqual(edits.map(r => r.status).sort(), [200, 409]); assert.equal(db.NutritionEntry[0].revision, 1);
});
test('complete-day confirmation rejects stale content and edits invalidate previous confirmation', async () => {
  await request('/entries', 'POST', mealBody());
  assert.equal((await request('/day', 'PATCH', { date: '2026-09-28', confirm: true, fingerprint: 'stale' })).status, 409);
  const read = await request();
  assert.equal((await request('/day', 'PATCH', { date: '2026-09-28', confirm: true, fingerprint: read.body.day.fingerprint })).status, 200);
  assert.equal((await request()).body.day.complete, true);
  await request(`/entries/${db.NutritionEntry[0]._id}`, 'PATCH', { revision: 0, deleted: true });
  assert.equal((await request()).body.day.complete, false);
});
test('private food, cross-couple copy and template IDs cannot be used by another actor', async () => {
  db.NutritionFood.push({ _id: outsider, coupleId, userId: partnerId, ...n.validateFood({ name: 'private', category: 'other', weightType: 'ready', unit: 'g', per100: { calories: 100, protein: 10, carbs: 10, fat: 2, fiber: 0 } }) });
  assert.equal((await request('/entries', 'POST', mealBody({ items: [{ foodId: outsider, amount: 100 }] }))).status, 400);
  db.NutritionTemplate.push({ _id: outsider, coupleId: 'old-couple', userId, foods: [n.snapshot(catalog[0], 100)] });
  assert.equal((await request('/entries', 'POST', mealBody({ templateId: outsider }))).status, 404);
  assert.equal((await request(`/foods/${outsider}`, 'DELETE')).status, 404);
});
test('copy/template preserve immutable nutrition after source custom food deletion', async () => {
  const created = await request('/entries', 'POST', mealBody());
  assert.equal((await request('/templates', 'POST', { entryId: created.body.id, name: 'my meal' })).status, 200);
  const template = db.NutritionTemplate[0];
  assert.equal((await request('/entries', 'POST', mealBody({ requestId: 'template-123456789', templateId: template._id }))).status, 200);
  assert.deepEqual(db.NutritionEntry[0].portions[0].foods, db.NutritionEntry[1].portions[0].foods);
});
test('walk cannot be finished early or auto-completed and repeated starts are idempotent', async () => {
  const body = { date: '2026-09-28', meal: 'dinner', action: 'start' };
  await Promise.all([request('/walk', 'POST', body), request('/walk', 'POST', body)]);
  assert.equal(db.NutritionDay[0].walks.length, 1);
  assert.equal((await request('/walk', 'POST', { ...body, action: 'finish' })).status, 400);
  db.NutritionDay[0].walks[0].startedAt = new Date(Date.now() - 601000);
  assert.equal((await request('/walk', 'POST', { ...body, action: 'finish' })).status, 200);
  assert.equal((await request('/walk', 'POST', { ...body, action: 'finish' })).status, 200);
});
test('profile CAS protects another device and ineligible profiles cannot adopt forged targets', async () => {
  const body = { ...makeProfile(userId), revision: 0, userId: partnerId, targetCalories: 500 };
  assert.equal((await request('/profile', 'PUT', body)).status, 200);
  assert.equal(db.NutritionProfile[0].targetCalories, null); assert.equal(db.NutritionProfile[1].revision, 0);
  assert.equal((await request('/profile', 'PUT', body)).status, 409);
  assert.equal((await request('/plan', 'POST', { revision: 1, action: 'adopt', target: 500 })).status, 409);
});
test('storage failure emits no realtime success event', async () => {
  const original = models.NutritionEntry.create;
  models.NutritionEntry.create = async () => { throw new Error('synthetic write failure'); };
  try { assert.equal((await request('/entries', 'POST', mealBody())).status, 500); assert.equal(events.length, 0); }
  finally { models.NutritionEntry.create = original; }
});

test('calibration adoption rechecks shown target and persists only the accepted estimate', async () => {
  for(let i=0;i<7;i++) {
    const date=n.offsetDateOnly('2026-09-22',i);
    const entry={_id:String(i),coupleId,creatorId:userId,date,meal:'dinner',revision:0,deleted:false,portions:[{userId,foods:[n.snapshot(catalog[0],2000)]}]};
    db.NutritionEntry.push(entry);
    db.NutritionDay.push({coupleId,userId,date,weight:80,walks:[],fullDayConfirmedAt:new Date(),confirmedFingerprint:n.summarize(date,userId,[],[entry]).fingerprint});
  }
  assert.equal((await request()).body.calibration.target,2100);
  assert.equal((await request('/plan','POST',{action:'adopt',revision:0,target:1800})).status,409);
  assert.equal((await request('/plan','POST',{action:'adopt',revision:0,target:2100})).status,200);
  assert.equal(db.NutritionProfile[0].targetCalories,2100);
  assert.equal(db.NutritionProfile[0].targetSince,'2026-09-28');
});
