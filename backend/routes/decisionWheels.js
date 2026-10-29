const express = require('express');
const { randomInt } = require('node:crypto');
const auth = require('../middleware/auth');
const { User } = require('../models');
const Wheel = require('../models/DecisionWheel');
const { logError } = require('../utils/safeLogger');
const router = express.Router();
const categories = [
  { id: 'special', label: '吃点好的' },
  { id: 'everyday', label: '随便吃点' },
  { id: 'outing', label: '出去玩时想做的事' }
];
const validId = value => typeof value === 'string' && /^[a-zA-Z0-9-]{16,64}$/.test(value);
function present(wheel, userId) {
  return {
    category: wheel.category, revision: wheel.revision,
    entries: wheel.entries.map(entry => ({ id: entry.id, label: entry.label, canManage: entry.createdBy === userId })),
    lastDraw: wheel.lastDraw ? {
      entryId: wheel.lastDraw.entryId, label: wheel.lastDraw.label,
      drawnAt: wheel.lastDraw.drawnAt, isMine: wheel.lastDraw.drawnBy === userId
    } : null
  };
}
async function relationship(req, res, next) {
  try {
    const user = await User.findById(req.userId).select('_id partnerId').lean();
    const partner = user?.partnerId ? await User.findById(user.partnerId).select('_id partnerId').lean() : null;
    if (!partner || String(partner.partnerId) !== String(req.userId)) {
      return res.status(403).json({ success: false, message: '绑定伴侣后，就能一起添加转盘选项。' });
    }
    req.wheelCoupleId = [String(req.userId), String(partner._id)].sort().join('_');
    next();
  } catch (error) { next(error); }
}
router.use(auth, relationship);
router.get('/', async (req, res, next) => {
  try {
    const wheels = await Wheel.find({ coupleId: req.wheelCoupleId }).lean();
    res.json({ success: true, data: { categories, wheels: categories.map(category => present(
      wheels.find(wheel => wheel.category === category.id) || { category: category.id, entries: [], revision: 0 }, req.userId
    )) } });
  } catch (error) { next(error); }
});
router.use('/:category', (req, res, next) => {
  if (!categories.some(category => category.id === req.params.category)) {
    return res.status(400).json({ success: false, message: '请选择已有的转盘分类。' });
  }
  next();
});
function conflict(res) {
  return res.status(409).json({ success: false, message: '选项刚刚有更新，已为你保留输入，请同步后再试。' });
}
async function readOrCreate(req) {
  const filter = { coupleId: req.wheelCoupleId, category: req.params.category };
  try {
    return await Wheel.findOneAndUpdate(filter, { $setOnInsert: { ...filter, entries: [], revision: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Wheel.findOne(filter).lean();
  }
}
function reply(req, res, wheel, action) {
  // Persist first. A disconnected listener must not turn a saved write into an error.
  try {
    req.app.locals.broadcastToCouple?.(req.wheelCoupleId, {
      type: 'wheelSync', data: { category: wheel.category, action, actor: req.userId }
    });
  } catch (error) { logError('转盘同步通知失败', error); }
  res.json({ success: true, data: present(wheel, req.userId) });
}
router.patch('/:category', async (req, res, next) => {
  try {
    const { action, id, revision } = req.body;
    const label = typeof req.body.label === 'string' ? req.body.label.trim() : '';
    if (!['add', 'edit', 'remove'].includes(action) || !validId(id) || !Number.isSafeInteger(revision) || revision < 0 ||
      (action !== 'remove' && (!label || label.length > 40 || /[\u0000-\u001f]/.test(label)))) {
      return res.status(400).json({ success: false, message: '请填写 1–40 个字的选项，再重新保存。' });
    }
    const wheel = await readOrCreate(req);
    const entry = wheel.entries.find(item => item.id === id);
    // Stable client IDs make a retried add safe even if its success response was lost.
    if (action === 'add' && entry?.createdBy === req.userId && entry.label === label) return reply(req, res, wheel, 'unchanged');
    if (wheel.revision !== revision) return conflict(res);
    if (action !== 'add' && (!entry || entry.createdBy !== req.userId)) {
      return res.status(403).json({ success: false, message: '只能修改或删除自己添加的选项。' });
    }
    if (action === 'add' && (entry || wheel.entries.length >= 30)) {
      return res.status(400).json({ success: false, message: '每个转盘最多 30 个选项，请先整理已有选项。' });
    }
    if (action !== 'remove' && wheel.entries.some(item => item.id !== id && item.label === label)) {
      return res.status(400).json({ success: false, message: '这个选项已经在转盘里了。' });
    }
    const entries = action === 'add' ? [...wheel.entries, { id, label, createdBy: req.userId }]
      : action === 'remove' ? wheel.entries.filter(item => item.id !== id)
        : wheel.entries.map(item => item.id === id ? { ...item, label } : item);
    const saved = await Wheel.findOneAndUpdate(
      { coupleId: req.wheelCoupleId, category: req.params.category, revision },
      { $set: { entries }, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean();
    if (!saved) return conflict(res);
    reply(req, res, saved, action);
  } catch (error) { next(error); }
});
router.post('/:category/spin', async (req, res, next) => {
  try {
    const { requestId, revision } = req.body;
    if (!validId(requestId) || !Number.isSafeInteger(revision) || revision < 0) {
      return res.status(400).json({ success: false, message: '转盘请求无效，请刷新后重试。' });
    }
    const filter = { coupleId: req.wheelCoupleId, category: req.params.category };
    const wheel = await Wheel.findOne(filter).lean();
    if (wheel?.lastDraw?.requestId === requestId && wheel.lastDraw.drawnBy === req.userId) return reply(req, res, wheel, 'unchanged');
    if (!wheel || !wheel.entries.length) return res.status(400).json({ success: false, message: '先添加一个选项，再转一转吧。' });
    if (wheel.revision !== revision) return conflict(res);
    const entry = wheel.entries[randomInt(wheel.entries.length)];
    const saved = await Wheel.findOneAndUpdate({ ...filter, revision }, { $set: {
      lastDraw: { requestId, entryId: entry.id, label: entry.label, drawnBy: req.userId, drawnAt: new Date() }
    }, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean();
    if (!saved) return conflict(res);
    reply(req, res, saved, 'spin');
  } catch (error) { next(error); }
});
router.use((error, req, res, next) => {
  logError('转盘请求失败', error);
  res.status(500).json({ success: false, message: '转盘暂时没有同步好，请稍后重试。' });
});
module.exports = router;
