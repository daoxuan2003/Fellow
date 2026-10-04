const crypto = require('node:crypto');
const multer = require('multer');
const { rateLimit } = require('express-rate-limit');
const { NutritionEntry: Entry, NutritionProfile: Profile, NutritionFood: Food } = require('../models');
const catalog = require('../data/nutrition-foods.json');
const n = require('../services/nutrition');
const ai = require('../services/nutritionAi');
const provider = require('../services/doubao');
const active = new Set();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 4, fields: 10, fieldSize: 8000 } }).array('image', 4);
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const scope = (ctx, id) => ({ _id: id, coupleId: ctx.coupleId, creatorId: ctx.userId, deleted: false });
const requestId = body => { const id = n.text(body.requestId, 80, '请求标识'); if (!/^[\w-]{16,80}$/.test(id)) n.fail('请求标识无效'); return id; };
const limit = rateLimit({ windowMs: 60000, limit: 12, keyGenerator: req => String(req.userId), standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: '本分钟识别次数较多，请稍后重试' } });

module.exports = function register(router, { context, route, notify }) {
  async function authorize(ctx, target) {
    const ownerId = target === 'partner' ? ctx.partnerId : ctx.userId;
    const profile = await Profile.findOne({ coupleId: ctx.coupleId, userId: ownerId }).lean();
    if (!profile) n.fail('请先建立记录对象的饮食档案', 409);
    if (target === 'partner' && !profile.allowPartnerAiMeals) n.fail('TA 尚未允许你代记 AI 餐次，请让 TA 在饮食档案中开启', 403);
    return ownerId;
  }
  async function getEntry(ctx, id) {
    if (!/^[a-f\d]{24}$/i.test(id || '')) n.fail('餐次不存在', 404);
    const entry = await Entry.findOne(scope(ctx, id)).select('+aiBeforeImage +aiBeforeImages').lean();
    if (!entry?.ai || ![ctx.userId, ctx.partnerId].includes(entry.ai.ownerId)) n.fail('餐次不存在或不可编辑', 404);
    return entry;
  }
  async function foods(ctx, state) {
    const current = [...catalog, ...await Food.find({ coupleId: ctx.coupleId, userId: ctx.userId }).limit(200).lean()];
    // Immutable snapshots remain usable after a custom food is removed from the library.
    for (const food of state?.foods || []) if (food.foodId && food.snapshot && !current.some(f => String(f.id || f._id) === food.foodId)) current.push({ ...food.snapshot, id: food.foodId });
    return current;
  }
  async function save(req, ctx, entry, state, { id, digest, name, beforeImages } = {}) {
    // Relationship/consent may have changed while the model was responding.
    const fresh = await context(req);
    if (fresh.coupleId !== ctx.coupleId) n.fail('情侣关系已变化，未保存识别结果', 409);
    await authorize(fresh, state.ownerId === fresh.userId ? 'self' : 'partner');
    if (id) state.requests = [...(state.requests || []), { id, hash: digest }].slice(-20);
    const updated = await Entry.findOneAndUpdate({ ...scope(ctx, String(entry._id)), revision: entry.revision }, {
      $set: { ai: state, name: name || entry.name, portions: ai.portions(state, state.ownerId), ...(beforeImages ? { aiBeforeImages: beforeImages, aiBeforeImage: null } : {}) }, $inc: { revision: 1 }
    }, { new: true });
    if (!updated) n.fail('这餐已在其他窗口更新，请重新加载后再修改', 409);
    notify(req, ctx);
    return { meal: ai.view(updated, ctx.userId) };
  }
  router.get('/ai/meals', route(async (req, ctx) => {
    const date = n.dateOnly(req.query.date || ctx.today, ctx.today);
    const entries = await Entry.find({ coupleId: ctx.coupleId, creatorId: ctx.userId, date, deleted: false }).lean();
    return { configured: provider.configured(), meals: entries.filter(e => e.ai && [ctx.userId, ctx.partnerId].includes(e.ai.ownerId)).map(e => ai.view(e, ctx.userId)) };
  }));
  router.post('/ai/import/:id', route(async (req, ctx) => {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) n.fail('餐次不存在', 404);
    const entry = await Entry.findOne(scope(ctx, req.params.id)).lean();
    if (!entry) n.fail('餐次不存在或不可编辑', 404);
    if (entry.ai) return { meal: ai.view(entry, ctx.userId) };
    if (entry.portions.length !== 1 || entry.portions[0].userId !== ctx.userId) n.fail('双人共享餐请继续使用份量编辑，或分别建立 AI 餐次');
    const state = { ownerId: ctx.userId, questionCount: 0, question: null, answer: '已接入原餐次，可继续补充或修改。', weightCheck: '', requests: [], hasBeforeImage: false,
      foods: entry.portions[0].foods.map(snapshot => ({ id: crypto.randomUUID(), name: snapshot.name, foodId: snapshot.foodId, served: snapshot.amount, consumed: snapshot.amount,
        range: [snapshot.amount, snapshot.amount], foodConfidence: 'high', portionConfidence: 'high', candidates: [], cooking: '', basis: 'user', note: '来自已有手动记录', label: null, labelConfirmed: false, snapshot })) };
    return save(req, ctx, entry, state);
  }));
  router.post('/ai/meals', route(async (req, ctx) => {
    const target = n.choice(req.body.target, ['self', 'partner'], '记录对象');
    const ownerId = await authorize(ctx, target);
    const date = n.dateOnly(req.body.date, ctx.today), meal = n.choice(req.body.meal, n.MEALS, '餐次');
    const id = requestId(req.body), digest = hash(JSON.stringify({ target, date, meal }));
    const identity = { coupleId: ctx.coupleId, creatorId: ctx.userId, requestId: id };
    let entry = await Entry.findOne(identity).lean();
    if (!entry) {
      if (await Entry.countDocuments({ coupleId: ctx.coupleId, creatorId: ctx.userId, date, deleted: false }) >= 40) n.fail('当天记录较多，请继续编辑已有餐次');
      try { entry = await Entry.create({ ...identity, requestHash: digest, date, meal, name: '待记录的一餐', shared: target === 'partner', portions: [],
        ai: { ownerId, foods: [], questionCount: 0, question: null, answer: '', weightCheck: '', requests: [], hasBeforeImage: false } }); }
      catch (error) { if (error.code !== 11000) throw error; entry = await Entry.findOne(identity).lean(); }
    }
    if (entry.requestHash !== digest || entry.deleted || !entry.ai) n.fail('请求已用于其他餐次，请重新开始', 409);
    return { meal: ai.view(entry, ctx.userId) };
  }, true));
  router.post('/ai/meals/:id/interpret', limit, (req, res, next) => upload(req, res, error => {
    if (error) return res.status(400).json({ success: false, message: '每次最多上传 4 张图片，每张不超过 2MB，文字不超过 2000 字' });
    next();
  }), route(async (req, ctx) => {
    const entry = await getEntry(ctx, req.params.id);
    const target = entry.ai.ownerId === ctx.userId ? 'self' : 'partner';
    await authorize(ctx, target);
    const id = requestId(req.body);
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (text.length > 2000 || (!text && !req.files?.length)) n.fail('请添加餐食照片或文字描述（最多 2000 字）');
    const mode = n.choice(req.body.mode || 'text', ['text', 'before', 'after', 'package'], '图片用途');
    const beforeImages = entry.aiBeforeImages?.length ? entry.aiBeforeImages : entry.aiBeforeImage ? [entry.aiBeforeImage] : [];
    if (mode === 'after' && (!beforeImages.length || !entry.ai.foods.length)) n.fail('请先添加吃前照片和食物，再比较吃后照片');
    const uploaded = [];
    for (const file of req.files || []) {
      const { fileTypeFromBuffer } = await import('file-type');
      let detected; try { detected = await fileTypeFromBuffer(file.buffer); } catch { /* invalid bytes */ }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(detected?.mime)) n.fail('请选择有效的 JPG、PNG 或 WebP 图片');
      uploaded.push(`data:${detected.mime};base64,${file.buffer.toString('base64')}`);
    }
    if (mode !== 'text' && !uploaded.length) n.fail('请添加照片');
    const digest = hash(JSON.stringify({ text, mode, images: uploaded.map(hash) }));
    const previous = entry.ai.requests.find(r => r.id === id);
    if (previous) { if (previous.hash !== digest) n.fail('请求标识重复，请重新发送', 409); return { meal: ai.view(entry, ctx.userId), replayed: true }; }
    if (n.number(req.body.revision, 0, Number.MAX_SAFE_INTEGER, '版本') !== entry.revision) n.fail('这餐已更新，请重新加载后再发送', 409);
    if (active.has(ctx.userId)) n.fail('上一条识别仍在处理，请稍候', 409);
    active.add(ctx.userId);
    try {
      const images = [...(mode === 'after' ? beforeImages.map((data, i) => ({ label: '吃前照片 ' + (i + 1), data })) : []),
        ...uploaded.map((data, i) => ({ label: (mode === 'after' ? '吃后照片 ' : '当前餐食或包装图片 ') + (i + 1), data }))];
      const interpreted = await provider.interpret({ text, mode, target, images,
        current: { foods: entry.ai.foods.map(ai.currentDish) } });
      const result = ai.applyDishInterpretation(interpreted, entry.ai, { target });
      if (result.readOnly) return result;
      if (mode === 'before' && uploaded.length) result.state.hasBeforeImage = true;
      return await save(req, ctx, entry, result.state, { id, digest, name: result.name, beforeImages: mode === 'before' && uploaded.length ? uploaded : undefined });
    } finally { active.delete(ctx.userId); }
  }));
  router.patch('/ai/meals/:id', route(async (req, ctx) => {
    const entry = await getEntry(ctx, req.params.id);
    if (n.number(req.body.revision, 0, Number.MAX_SAFE_INTEGER, '版本') !== entry.revision) n.fail('这餐已更新，请重新加载后再修改', 409);
    const state = JSON.parse(JSON.stringify(entry.ai));
    if (req.body.action === 'portion') {
      const ratio = n.number(req.body.ratio, 0, 1, '摄入比例');
      const selected = req.body.foodId ? state.foods.filter(f => f.id === req.body.foodId) : state.foods;
      if (!selected.length) n.fail('请先记录食物');
      selected.forEach(f => { f.consumed = Math.round(f.served * ratio * 10) / 10; f.excluded = ratio === 0; if (f.estimate) f.ratio = ratio; if (f.snapshot) f.snapshot.amount = f.consumed; });
      state.answer = '已按实际食用比例更新，今日累计同步重算。';
    } else if (req.body.action === 'food') {
      const index = state.foods.findIndex(f => f.id === req.body.foodId);
      if (index < 0) n.fail('食物不存在');
      const old = state.foods[index];
      const raw = { ...old, consumed: req.body.consumed, ...(req.body.served != null ? { served: req.body.served, range: [req.body.served, req.body.served], basis: 'user', portionConfidence: 'high' } : {}),
        ...(req.body.catalogId ? { foodId: req.body.catalogId, label: null } : {}), ...(req.body.label ? { label: req.body.label, foodId: null } : {}) };
      state.foods[index] = ai.normalizeFood(raw, await foods(ctx, state), { id: old.id, allowLabel: Boolean(old.label), labelConfirmed: req.body.confirmLabel === true || (old.labelConfirmed && !req.body.label), excluded: Number(req.body.consumed) === 0 });
      state.answer = '已保存核对后的食物和份量。';
    } else if (req.body.action === 'skip-question') { state.question = null; state.answer = '保留当前估计，你可以随时修改实际份量。'; }
    else n.fail('请选择有效操作');
    return save(req, ctx, entry, state);
  }));
};
// Server-side handle for isolated tests; no HTTP reset endpoint is exposed.
module.exports.limiter = limit;
