const express = require('express');
const crypto = require('node:crypto');
const auth = require('../middleware/auth');
const { User, HealthRecord, FitnessDailyLog, NutritionProfile: Profile, NutritionDay: Day, NutritionEntry: Entry, NutritionFood: Food, NutritionTemplate: Template } = require('../models');
const helpers = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');
const n = require('../services/nutrition');
const catalog = require('../data/nutrition-foods.json');
const router = express.Router();
router.use(auth);

async function context(req) {
  const userId = String(req.userId || '');
  const user = await User.findById(userId).select('_id nickname gender birthday partnerId').lean();
  if (!user?.partnerId) n.fail('请先绑定伴侣', 400);
  const partnerId = String(user.partnerId);
  const partner = await User.findById(partnerId).select('_id nickname partnerId').lean();
  if (!partner || String(partner.partnerId || '') !== userId) n.fail('情侣关系已变化，请刷新后重试', 409);
  return { userId, partnerId, coupleId: [userId, partnerId].sort().join('_'), user, partner, today: helpers.getTodayString() };
}
const own = ctx => ({ coupleId: ctx.coupleId, userId: ctx.userId });
const entryScope = ctx => ({ coupleId: ctx.coupleId, 'portions.userId': ctx.userId });
function notify(req, ctx) {
  try { req.app.locals.broadcastToCouple?.(ctx.coupleId, { type: 'nutritionSync' }); }
  catch (error) { logError('nutrition sync notification failed', error); }
}
function route(handler, mutation = false) {
  return async (req, res) => {
    try {
      const ctx = await context(req);
      const data = await handler(req, ctx);
      if (mutation) notify(req, ctx);
      res.json({ success: true, ...data });
    } catch (error) {
      if (!error.status && error.code !== 11000) logError('nutrition request failed', error);
      const status = error.status || (error.code === 11000 ? 409 : 500);
      res.status(status).json({ success: false, message: error.status ? error.message : status === 409 ? '记录刚刚发生变化，请刷新后重试' : '饮食记录暂时无法同步，请稍后重试' });
    }
  };
}
async function requireProfile(ctx) { const p = await Profile.findOne(own(ctx)).lean(); if (!p) n.fail('请先确认你的饮食档案', 409); return p; }
async function readRows(ctx, profile, until = ctx.today) {
  const from = n.offsetDateOnly(until, -89);
  const [days, entries, logs] = await Promise.all([
    Day.find({ ...own(ctx), date: { $gte: from, $lte: until } }).lean(),
    Entry.find({ ...entryScope(ctx), date: { $gte: from, $lte: until } }).lean(),
    FitnessDailyLog.find({ ...own(ctx), date: { $gte: from, $lte: until } }).lean()
  ]);
  const rows = Array.from({ length: 90 }, (_, i) => n.summarize(n.offsetDateOnly(from, i), ctx.userId, days, entries, logs));
  return { rows, logs };
}
async function readCalibrationRows(ctx, profile, rows) {
  if (!profile || profile.calibrationStart >= rows[0].date) return rows;
  const range = { $gte: profile.calibrationStart, $lte: n.offsetDateOnly(profile.calibrationStart, profile.calibrationDays - 1) };
  const [days, entries] = await Promise.all([Day.find({ ...own(ctx), date: range }).lean(), Entry.find({ ...entryScope(ctx), date: range }).lean()]);
  return Array.from({ length: profile.calibrationDays }, (_, i) => n.summarize(n.offsetDateOnly(profile.calibrationStart, i), ctx.userId, days, entries));
}
function publicFood(food) {
  return { id: String(food.id || food._id), name: food.name, category: food.category, unit: food.unit, weightType: food.weightType, per100: food.per100, source: food.source, sourceUrl: food.sourceUrl || '', custom: Boolean(food._id) };
}
router.get('/', route(async (req, ctx) => {
  const date = n.dateOnly(req.query.date || ctx.today, ctx.today);
  const [profile, partnerProfile, health, foods, templates] = await Promise.all([
    Profile.findOne(own(ctx)).lean(), Profile.findOne({ coupleId: ctx.coupleId, userId: ctx.partnerId }).lean(),
    HealthRecord.findOne({ ...own(ctx) }).sort({ recordedAt: -1 }).lean(),
    Food.find(own(ctx)).sort({ createdAt: -1 }).limit(200).lean(), Template.find(own(ctx)).sort({ createdAt: -1 }).limit(50).lean()
  ]);
  const { rows, logs } = await readRows(ctx, profile, date);
  const calibrationRows = await readCalibrationRows(ctx, profile, rows);
  const [partnerDay, partnerEntries] = await Promise.all([
    Day.find({ coupleId: ctx.coupleId, userId: ctx.partnerId, date }).lean(),
    Entry.find({ coupleId: ctx.coupleId, 'portions.userId': ctx.partnerId, date }).lean()
  ]);
  let age = null;
  if (ctx.user.birthday) {
    const birth = helpers.formatDate(ctx.user.birthday);
    if (/^\d{4}-\d{2}-\d{2}$/.test(birth)) age = Number(ctx.today.slice(0, 4)) - Number(birth.slice(0, 4)) - (ctx.today.slice(5) < birth.slice(5) ? 1 : 0);
  }
  const seed = { sex: ctx.user.gender || null, age, height: health?.height ?? null, baselineWeight: health?.weight ?? null, waist: health?.measurements?.waist ?? null, thigh: health?.measurements?.thigh ?? null, hip: health?.measurements?.hip ?? null, bodyFat: health?.bodyFat ?? null };
  // Only this explicit projection crosses the partner boundary.
  const partner = { allowPartnerAiMeals: partnerProfile?.allowPartnerAiMeals === true, nickname: ctx.partner.nickname || 'TA', ...n.partnerView(partnerProfile, n.summarize(date, ctx.partnerId, partnerDay, partnerEntries)) };
  const week = n.period(rows, n.offsetDateOnly(date, -7), n.offsetDateOnly(date, -1));
  const previousWeek = n.period(rows, n.offsetDateOnly(date, -14), n.offsetDateOnly(date, -8));
  const trend = rows.slice(-28).map(row => ({ date: row.date, weight: row.weight, calories: row.entries.length ? row.totals.calories : null, protein: row.entries.length ? row.totals.protein : null, complete: row.complete,
    averageWeight: n.period(rows, n.offsetDateOnly(row.date, -6), row.date).weight, weightDays: n.period(rows, n.offsetDateOnly(row.date, -6), row.date).weightDays }));
  return { today: ctx.today, date, profile: profile ? { ...profile, _id: undefined, userId: undefined, coupleId: undefined, __v: undefined } : null, seed, partner,
    day: rows.at(-1), yesterday: rows.at(-2).entries, foods: [...catalog.map(publicFood), ...foods.map(publicFood)], templates: templates.map(t => ({ id: String(t._id), name: t.name, foods: t.foods })),
    recentFoodIds: [...new Set(rows.slice().reverse().flatMap(row => row.entries.flatMap(e => e.foods.map(f => f.foodId))))].slice(0, 20),
    trend, week, previousWeek, calibration: profile ? n.calibration(profile, calibrationRows, date) : null, suggestion: profile ? n.adjustment(profile, rows, date, logs) : null };
}));
router.put('/profile', route(async (req, ctx) => {
  const value = n.validateProfile(req.body);
  const existing = await Profile.findOne(own(ctx)).lean();
  if (!existing) {
    await Profile.create({ ...own(ctx), ...value, calibrationStart: ctx.today, calibrationDays: 7 });
  } else {
    const revision = n.number(req.body.revision, 0, Number.MAX_SAFE_INTEGER, '档案版本');
    if (revision !== existing.revision) n.fail('档案已在其他设备更新，请刷新再保存', 409);
    // A changed goal or eligibility invalidates the old prescription, but never erases logs.
    const reset = ['goal', 'sex', 'needsClinicalAdvice', 'age'].some(key => value[key] !== existing[key]);
    const result = await Profile.findOneAndUpdate({ ...own(ctx), revision }, { $set: { ...value, ...(reset ? { targetCalories: null, maintenance: null, targetSince: null, calibrationStart: ctx.today, calibrationDays: 7 } : {}) }, $inc: { revision: 1 } });
    if (!result) n.fail('档案已变化，请刷新后重试', 409);
  }
  return {};
}, true));
router.post('/plan', route(async (req, ctx) => {
  const profile = await requireProfile(ctx);
  const revision = n.number(req.body.revision, 0, Number.MAX_SAFE_INTEGER, '档案版本');
  if (revision !== profile.revision) n.fail('计划已更新，请刷新后重试', 409);
  const { rows, logs } = await readRows(ctx, profile);
  let update;
  switch (req.body.action) {
    case 'extend': update = { calibrationDays: 14 }; break;
    case 'restart': update = { calibrationStart: ctx.today, calibrationDays: 7, targetCalories: null, maintenance: null, targetSince: null }; break;
    case 'adopt': {
      const result = n.calibration(profile, await readCalibrationRows(ctx, profile, rows), ctx.today);
      if (profile.targetCalories || !result.ready) n.fail('当前校准尚不能生成目标，请继续记录', 409);
      if (req.body.target !== result.target) n.fail('校准结果已变化，请刷新查看后再采用', 409);
      update = { maintenance: result.maintenance, targetCalories: result.target, targetSince: ctx.today }; break;
    }
    case 'adjust': {
      const suggestion = n.adjustment(profile, rows, ctx.today, logs);
      if (suggestion.action === 'hold' || req.body.target !== suggestion.target) n.fail('建议已变化，请刷新查看', 409);
      update = { targetCalories: suggestion.target, targetSince: ctx.today }; break;
    }
    default: n.fail('请选择有效的计划操作');
  }
  if (!await Profile.findOneAndUpdate({ ...own(ctx), revision }, { $set: update, $inc: { revision: 1 } })) n.fail('计划已更新，请刷新后重试', 409);
  return {};
}, true));
async function ensureDay(ctx, date) {
  try { await Day.updateOne({ ...own(ctx), date }, { $setOnInsert: { ...own(ctx), date } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
}
router.patch('/day', route(async (req, ctx) => {
  await requireProfile(ctx);
  const date = n.dateOnly(req.body.date, ctx.today);
  const update = {};
  for (const [key, min, max] of [['weight', 25, 300], ['waist', 35, 250], ['thigh', 15, 150]]) if (Object.hasOwn(req.body, key)) update[key] = req.body[key] === null ? null : n.number(req.body[key], min, max, key);
  if (Object.hasOwn(req.body, 'recovery')) update.recovery = n.choice(req.body.recovery, ['normal', 'poor', 'unknown'], '恢复状态');
  if (req.body.confirm === true) {
    const entries = await Entry.find({ ...entryScope(ctx), date }).lean();
    const summary = n.summarize(date, ctx.userId, [], entries);
    if (summary.entries.some(entry => entry.pendingFoods)) n.fail('请先补全 AI 餐次中待确认的食物，再确认完整饮食日');
    if (!summary.entries.length) n.fail('请先记录当天食物，再确认完整饮食日');
    if (req.body.fingerprint !== summary.fingerprint) n.fail('当天餐食已变化，请刷新查看后再确认', 409);
    // Content identity, rather than a wall clock comparison, invalidates every concurrent edit.
    update.confirmedFingerprint = summary.fingerprint;
    update.fullDayConfirmedAt = new Date();
  } else if (req.body.confirm === false) { update.fullDayConfirmedAt = null; update.confirmedFingerprint = null; }
  if (!Object.keys(update).length) n.fail('没有需要保存的记录');
  await ensureDay(ctx, date);
  await Day.updateOne({ ...own(ctx), date }, { $set: update });
  return {};
}, true));
router.post('/walk', route(async (req, ctx) => {
  await requireProfile(ctx);
  const meal = n.choice(req.body.meal, n.MEALS, '餐次');
  const date = n.dateOnly(req.body.date, ctx.today);
  if (req.body.action === 'start') {
    if (date !== ctx.today) n.fail('只能开始今天的饭后活动');
    await ensureDay(ctx, date);
    await Day.updateOne({ ...own(ctx), date, 'walks.meal': { $ne: meal } }, { $push: { walks: { meal, startedAt: new Date(), completedAt: null } } });
  } else if (req.body.action === 'finish') {
    const result = await Day.updateOne({ ...own(ctx), date, walks: { $elemMatch: { meal, startedAt: { $lte: new Date(Date.now() - 600000) }, completedAt: null } } }, { $set: { 'walks.$.completedAt': new Date() } });
    if (!result.modifiedCount) {
      const day = await Day.findOne({ ...own(ctx), date }).lean();
      if (!day?.walks.some(walk => walk.meal === meal && walk.completedAt)) n.fail('活动满 10 分钟后，由你确认完成');
    }
  } else n.fail('请选择开始或完成');
  return {};
}, true));
async function resolveFoods(ctx, items) {
  if (!Array.isArray(items) || !items.length || items.length > 30) n.fail('每餐请选择 1–30 种食物');
  if (items.some(item => !item || typeof item !== 'object' || typeof item.foodId !== 'string')) n.fail('请选择有效食物');
  const customIds = items.map(item => item.foodId).filter(id => typeof id === 'string' && /^[a-f\d]{24}$/i.test(id));
  const foods = [...catalog, ...await Food.find({ ...own(ctx), _id: { $in: customIds } }).lean()];
  return items.map(item => {
    const food = foods.find(f => String(f.id || f._id) === item.foodId);
    if (!food) n.fail('食物已不可用，请重新选择');
    return n.snapshot(food, item.amount);
  });
}
router.post('/entries', route(async (req, ctx) => {
  await requireProfile(ctx);
  const date = n.dateOnly(req.body.date, ctx.today), meal = n.choice(req.body.meal, n.MEALS, '餐次');
  const requestId = n.text(req.body.requestId, 80, '请求标识');
  if (!/^[\w-]{16,80}$/.test(requestId)) n.fail('请求标识无效');
  const shared = req.body.shared === true;
  const name = req.body.name ? n.text(req.body.name, 60, '餐名') : '饮食记录';
  const payload = { date, meal, shared, name, items: req.body.items, copyId: req.body.copyId, templateId: req.body.templateId };
  const requestHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const identity = { coupleId: ctx.coupleId, creatorId: ctx.userId, requestId };
  const existing = await Entry.findOne(identity).lean();
  if (existing) { if (existing.requestHash !== requestHash) n.fail('请为新的记录重新提交', 409); return { id: String(existing._id), replayed: true }; }
  let foods;
  if (req.body.copyId || req.body.templateId) {
    if (shared) n.fail('复制记录只加入自己的餐次；共享餐请分别填写份量');
    const id = req.body.copyId || req.body.templateId;
    if (!/^[a-f\d]{24}$/i.test(id)) n.fail('记录不存在', 404);
    if (req.body.copyId) {
      const source = await Entry.findOne({ ...entryScope(ctx), _id: id, deleted: false }).lean();
      if (!source) n.fail('原记录已不可用', 404);
      if (n.serializeEntry(source, ctx.userId)?.pendingFoods) n.fail('请先核对原餐次的待确认食物，再复制');
      foods = source.portions.find(part => part.userId === ctx.userId).foods;
    } else {
      const source = await Template.findOne({ ...own(ctx), _id: id }).lean();
      if (!source) n.fail('整餐模板已不可用', 404);
      foods = source.foods;
    }
  } else foods = await resolveFoods(ctx, req.body.items);
  const portions = [{ userId: ctx.userId, foods }];
  if (shared) {
    const partnerProfile = await Profile.findOne({ coupleId: ctx.coupleId, userId: ctx.partnerId }).lean();
    if (!partnerProfile?.allowSharedMeals) n.fail('TA 尚未允许你为其加入共享餐', 403);
    portions.push({ userId: ctx.partnerId, foods: foods.map((food, i) => ({ ...food, amount: n.number(req.body.items[i].partnerAmount, 0.1, 3000, 'TA 的份量') })) });
  }
  let entry;
  try { entry = await Entry.create({ ...identity, requestHash, date, meal, name, shared, portions }); }
  catch (error) {
    if (error.code !== 11000) throw error;
    entry = await Entry.findOne(identity).lean();
    if (!entry || entry.requestHash !== requestHash) n.fail('提交冲突，请刷新后重试', 409);
  }
  return { id: String(entry._id) };
}, true));
router.patch('/entries/:id', route(async (req, ctx) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) n.fail('记录不存在', 404);
  const filter = { coupleId: ctx.coupleId, creatorId: ctx.userId, _id: req.params.id, deleted: false };
  const entry = await Entry.findOne(filter).lean();
  if (!entry) n.fail('只能修改自己创建的餐食', 403);
  const revision = n.number(req.body.revision, 0, Number.MAX_SAFE_INTEGER, '记录版本');
  let update;
  if (entry.ai && req.body.deleted !== true) n.fail('请在 AI 餐次中修改食物和份量');
  if (req.body.deleted === true) update = { deleted: true, aiBeforeImage: null };
  else {
    if (!Array.isArray(req.body.amounts) || req.body.amounts.length !== entry.portions[0].foods.length || req.body.amounts.some(item => !item || typeof item !== 'object')) n.fail('请填写所有食物份量');
    if (entry.shared) {
      const partnerProfile = await Profile.findOne({ coupleId: ctx.coupleId, userId: ctx.partnerId }).lean();
      if (!partnerProfile?.allowSharedMeals) n.fail('TA 已关闭共享餐修改，请删除后分别记录', 403);
    }
    update = { portions: entry.portions.map(part => ({ userId: part.userId, foods: part.foods.map((food, i) => ({ ...food, amount: n.number(req.body.amounts[i][part.userId === ctx.userId ? 'mine' : 'partner'], 0.1, 3000, '份量') })) })) };
  }
  if (!await Entry.findOneAndUpdate({ ...filter, revision }, { $set: update, $inc: { revision: 1 } })) n.fail('这餐已被修改，请刷新后重试', 409);
  return {};
}, true));
router.post('/foods', route(async (req, ctx) => {
  await requireProfile(ctx);
  if (await Food.countDocuments(own(ctx)) >= 200) n.fail('自定义食物已达 200 种，请删除不再使用的食物');
  const food = await Food.create({ ...own(ctx), ...n.validateFood(req.body) });
  return { food: publicFood(food) };
}, true));
router.delete('/foods/:id', route(async (req, ctx) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) n.fail('食物不存在', 404);
  if (!await Food.findOneAndDelete({ ...own(ctx), _id: req.params.id })) n.fail('食物不存在', 404);
  return {};
}, true));
router.put('/favorites', route(async (req, ctx) => {
  await requireProfile(ctx);
  await resolveFoods(ctx, [{ foodId: req.body.foodId, amount: 1 }]);
  if (typeof req.body.favorite !== 'boolean') n.fail('请选择是否常用');
  const update = req.body.favorite ? { $addToSet: { favorites: req.body.foodId } } : { $pull: { favorites: req.body.foodId } };
  await Profile.updateOne(own(ctx), update);
  return {};
}, true));
router.post('/templates', route(async (req, ctx) => {
  await requireProfile(ctx);
  if (await Template.countDocuments(own(ctx)) >= 50) n.fail('最多保留 50 个整餐模板');
  const name = n.text(req.body.name, 60, '整餐名称');
  if (!/^[a-f\d]{24}$/i.test(req.body.entryId || '')) n.fail('请先保存一餐');
  const entry = await Entry.findOne({ ...entryScope(ctx), _id: req.body.entryId, deleted: false }).lean();
  if (!entry) n.fail('餐食记录不存在', 404);
  if (n.serializeEntry(entry, ctx.userId)?.pendingFoods) n.fail('请先核对待确认食物，再保存整餐');
  await Template.create({ ...own(ctx), name, foods: entry.portions.find(part => part.userId === ctx.userId).foods });
  return {};
}, true));
router.delete('/templates/:id', route(async (req, ctx) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) n.fail('模板不存在', 404);
  if (!await Template.findOneAndDelete({ ...own(ctx), _id: req.params.id })) n.fail('模板不存在', 404);
  return {};
}, true));
require('./nutritionAi')(router, { context, route, notify });
module.exports = router;
