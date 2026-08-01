// ============================================
// 代取快递路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, ExpressDelivery } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

// 辅助函数：获取称呼
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

function emitExpressSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'expressSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function getCoupleId(userId, partnerId) {
  return partnerId ? [userId, partnerId].sort().join('_') : null;
}

function getShanghaiDayStart(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day) - 8 * 60 * 60 * 1000);
}

async function archivePickedBeforeToday(app, coupleId, now = new Date()) {
  const todayStart = getShanghaiDayStart(now);
  const archivedAt = now;
  const result = await ExpressDelivery.updateMany(
    {
      coupleId,
      status: 'picked',
      archivedAt: null,
      $or: [
        { pickedAt: { $lt: todayStart } },
        { pickedAt: null }
      ]
    },
    { $set: { archivedAt, archivedBy: null } }
  );

  if (Number(result?.modifiedCount || 0) > 0) {
    emitExpressSync(app, coupleId, {
      action: 'autoArchive',
      payload: { before: todayStart, archivedAt },
      actor: null
    });
  }

  return todayStart;
}

/**
 * @route   POST /api/express
 * @desc    创建快递请求
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { trackingNo, pickupLocation, description, priority } = req.body;

    if (!trackingNo || !pickupLocation) {
      return res.status(400).json({
        success: false,
        message: '取件码和取件地点不能为空'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    if (!user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    const delivery = new ExpressDelivery({
      requesterId: userId,
      coupleId,
      trackingNo: trackingNo.trim(),
      pickupLocation: pickupLocation.trim(),
      description: description?.trim() || '',
      priority: priority === 'urgent' ? 'urgent' : 'normal'
    });

    await delivery.save();

    // 强实时同步：广播完整数据给情侣双方
    emitExpressSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: delivery._id,
        trackingNo: delivery.trackingNo,
        pickupLocation: delivery.pickupLocation,
        description: delivery.description,
        priority: delivery.priority,
        status: delivery.status,
        requesterId: delivery.requesterId,
        createdAt: delivery.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给伴侣
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload(
        delivery.priority === 'urgent' ? 'expressNewUrgent' : 'expressNew',
        {
          nickname: user.nickname,
          item: delivery.description,
          location: delivery.pickupLocation
        },
        { url: '/express' }
      );
      sendNotification(user.partnerId, payload);
    }

    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: delivery._id,
        trackingNo: delivery.trackingNo,
        pickupLocation: delivery.pickupLocation,
        description: delivery.description,
        status: delivery.status,
        requesterId: delivery.requesterId,
        pickerId: null,
        createdAt: delivery.createdAt
      }
    });
  } catch (error) {
    logError('创建快递请求出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/express
 * @desc    获取快递列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, archived } = req.query;

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.json({
        success: true,
        data: {
          pending: [],
          picked: [],
          archived: []
        }
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    // “已取”只承担当天纠错；跨天记录在双方任意一人打开清单时自动归档。
    await archivePickedBeforeToday(req.app, coupleId);

    const query = { coupleId };
    if (status) {
      query.status = status;
    }
    if (archived === 'true') query.archivedAt = { $ne: null };
    else if (archived !== 'all') query.archivedAt = null;

    const deliveries = await ExpressDelivery.find(query)
      .sort({ createdAt: -1 });

    // 获取创建者和取件人信息
    const userIds = [...new Set([
      ...deliveries.map(e => e.requesterId),
      ...deliveries.map(e => e.pickerId).filter(Boolean)
    ])];

    const users = await User.find({ _id: { $in: userIds } });

    // 生成头像预签名 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const userMap = {};
    await Promise.all(users.map(async (u) => {
      let avatarUrl = null;
      if (u.avatar) {
        avatarUrl = await storageService.getUrl(u.avatar, 86400, baseUrl);
      }
      userMap[u._id.toString()] = {
        id: u._id,
        nickname: u.nickname,
        gender: u.gender,
        avatar: u.avatar,
        avatarUrl
      };
    }));

    const result = deliveries.map(d => ({
      id: d._id,
      trackingNo: d.trackingNo,
      pickupLocation: d.pickupLocation,
      description: d.description,
      priority: d.priority || 'normal',
      status: d.status,
      requesterId: d.requesterId,
      pickerId: d.pickerId,
      requester: userMap[d.requesterId] || null,
      picker: d.pickerId ? (userMap[d.pickerId] || null) : null,
      createdAt: d.createdAt,
      pickedAt: d.pickedAt,
      archivedAt: d.archivedAt || null,
      archivedBy: d.archivedBy || null
    }));

    res.json({
      success: true,
      data: {
        list: result,
        pending: result.filter(e => e.status === 'pending' && !e.archivedAt),
        picked: result.filter(e => e.status === 'picked' && !e.archivedAt),
        archived: result.filter(e => Boolean(e.archivedAt))
      }
    });
  } catch (error) {
    logError('获取快递列表出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id/pick
 * @desc    标记取件
 * @access  Private
 */
router.put('/:id/pick', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    const coupleId = getCoupleId(userId, user.partnerId);
    const existingDelivery = await ExpressDelivery.findOne({ _id: req.params.id, coupleId });

    if (!existingDelivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    if (existingDelivery.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该快递已被取件'
      });
    }

    const pickedAt = new Date();
    const delivery = await ExpressDelivery.findOneAndUpdate(
      { _id: req.params.id, coupleId, status: 'pending' },
      { $set: { status: 'picked', pickerId: userId, pickedAt } },
      { new: true }
    );

    if (!delivery) {
      return res.status(400).json({
        success: false,
        message: '该快递已被取件'
      });
    }

    // 强实时同步：广播取件状态给情侣双方
    emitExpressSync(req.app, delivery.coupleId, {
      action: 'pick',
      payload: {
        id: delivery._id,
        status: delivery.status,
        pickerId: delivery.pickerId,
        pickedAt: delivery.pickedAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给创建者（如果不是自己取的）
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && delivery.requesterId !== userId) {
      const payload = getPushPayload(
        'expressPicked',
        {
          nickname: user.nickname,
          item: delivery.description
        },
        { url: '/express' }
      );
      sendNotification(delivery.requesterId, payload);
    }

    res.json({
      success: true,
      message: '取件成功',
      data: {
        id: delivery._id,
        status: delivery.status,
        pickerId: delivery.pickerId,
        pickedAt: delivery.pickedAt
      }
    });
  } catch (error) {
    logError('取件出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id/unpick
 * @desc    撤销取件
 * @access  Private
 */
router.put('/:id/unpick', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    const coupleId = getCoupleId(userId, user.partnerId);
    const existingDelivery = await ExpressDelivery.findOne({ _id: req.params.id, coupleId });

    if (!existingDelivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    if (String(existingDelivery.pickerId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只有取件人才能撤销'
      });
    }

    if (existingDelivery.status !== 'picked') {
      return res.status(400).json({
        success: false,
        message: '该快递未在已取状态'
      });
    }

    const todayStart = getShanghaiDayStart();
    const pickedAt = existingDelivery.pickedAt ? new Date(existingDelivery.pickedAt) : null;
    if (existingDelivery.archivedAt || !pickedAt || Number.isNaN(pickedAt.getTime()) || pickedAt < todayStart) {
      return res.status(400).json({
        success: false,
        message: '只能撤销今天完成的取件'
      });
    }

    const delivery = await ExpressDelivery.findOneAndUpdate(
      {
        _id: req.params.id,
        coupleId,
        pickerId: userId,
        status: 'picked',
        archivedAt: null,
        pickedAt: { $gte: todayStart }
      },
      { $set: { status: 'pending', pickerId: null, pickedAt: null, archivedAt: null, archivedBy: null } },
      { new: true }
    );

    if (!delivery) {
      return res.status(400).json({
        success: false,
        message: '该快递未在已取状态'
      });
    }

    // 强实时同步：广播撤销取件状态给情侣双方
    emitExpressSync(req.app, delivery.coupleId, {
      action: 'unpick',
      payload: {
        id: delivery._id,
        status: delivery.status,
        pickerId: null,
        pickedAt: null
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给创建者（如果不是自己撤销的）
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && delivery.requesterId !== userId) {
      const payload = getPushPayload(
        'expressUnpicked',
        {
          nickname: user.nickname,
          item: delivery.description
        },
        { url: '/express' }
      );
      sendNotification(delivery.requesterId, payload);
    }

    res.json({
      success: true,
      message: '撤销成功',
      data: {
        id: delivery._id,
        status: delivery.status,
        pickerId: null,
        pickedAt: null
      }
    });
  } catch (error) {
    logError('撤销取件出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id/archive
 * @desc    创建者归档已取件快递
 * @access  Private
 */
router.put('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣才能使用此功能' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '快递不存在' });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const existing = await ExpressDelivery.findOne({ _id: req.params.id, coupleId });
    if (!existing) {
      return res.status(404).json({ success: false, message: '快递不存在' });
    }
    if (String(existing.requesterId) !== String(userId)) {
      return res.status(403).json({ success: false, message: '只有创建者才能归档' });
    }
    if (existing.status !== 'picked') {
      return res.status(400).json({ success: false, message: '请先完成取件再归档' });
    }

    const archivedAt = new Date();
    const delivery = await ExpressDelivery.findOneAndUpdate(
      { _id: req.params.id, coupleId, requesterId: userId, status: 'picked', archivedAt: null },
      { $set: { archivedAt, archivedBy: userId } },
      { new: true }
    );
    if (!delivery) {
      return res.status(409).json({ success: false, message: '快递已归档或状态已变化' });
    }

    emitExpressSync(req.app, coupleId, {
      action: 'archive',
      payload: { id: delivery._id, archivedAt: delivery.archivedAt, archivedBy: delivery.archivedBy },
      actor: userId,
      requestId: req.body.requestId
    });
    res.json({ success: true, message: '已归档', data: { id: delivery._id, archivedAt: delivery.archivedAt, archivedBy: delivery.archivedBy } });
  } catch (error) {
    logError('归档快递出错：', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   DELETE /api/express/:id
 * @desc    删除快递请求
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    const coupleId = getCoupleId(userId, user.partnerId);
    const delivery = await ExpressDelivery.findOne({ _id: req.params.id, coupleId });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    if (delivery.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }

    if (delivery.status === 'picked') {
      return res.status(400).json({
        success: false,
        message: '已取件的快递不能删除'
      });
    }

    const deleteResult = await ExpressDelivery.deleteOne({ _id: req.params.id, coupleId, requesterId: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    // 强实时同步：数据库删除成功后再广播
    emitExpressSync(req.app, delivery.coupleId, {
      action: 'delete',
      payload: {
        id: delivery._id
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给伴侣
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload(
        'expressDeleted',
        { item: delivery.description },
        { url: '/express' }
      );
      sendNotification(user.partnerId, payload);
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除快递出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id
 * @desc    编辑快递请求
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { trackingNo, pickupLocation, description, priority } = req.body;

    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣才能使用此功能'
      });
    }
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    const coupleId = getCoupleId(userId, user.partnerId);
    const delivery = await ExpressDelivery.findOne({ _id: req.params.id, coupleId });

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    if (delivery.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能编辑'
      });
    }

    if (delivery.status === 'picked') {
      return res.status(400).json({
        success: false,
        message: '已取件的快递不能编辑'
      });
    }

    const updateData = {};
    if (trackingNo !== undefined) updateData.trackingNo = trackingNo.trim();
    if (pickupLocation !== undefined) updateData.pickupLocation = pickupLocation.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (priority !== undefined) updateData.priority = priority === 'urgent' ? 'urgent' : 'normal';

    const updatedDelivery = await ExpressDelivery.findOneAndUpdate(
      { _id: req.params.id, coupleId, requesterId: userId, status: 'pending' },
      { $set: updateData },
      { new: true }
    );

    if (!updatedDelivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }

    // 强实时同步：广播更新后的完整数据
    emitExpressSync(req.app, updatedDelivery.coupleId, {
      action: 'update',
      payload: {
        id: updatedDelivery._id,
        trackingNo: updatedDelivery.trackingNo,
        pickupLocation: updatedDelivery.pickupLocation,
        description: updatedDelivery.description,
        priority: updatedDelivery.priority,
        status: updatedDelivery.status
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: updatedDelivery._id,
        trackingNo: updatedDelivery.trackingNo,
        pickupLocation: updatedDelivery.pickupLocation,
        description: updatedDelivery.description,
        priority: updatedDelivery.priority,
        status: updatedDelivery.status,
        requesterId: updatedDelivery.requesterId,
        pickerId: updatedDelivery.pickerId,
        createdAt: updatedDelivery.createdAt
      }
    });
  } catch (error) {
    logError('编辑快递出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
