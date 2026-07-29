// ============================================
// 心愿墙路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, Wish } = require('../models');
const { getPushPayload } = require('../config/notifications');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

function emitWishSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'wishSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

/**
 * @route   GET /api/wishes
 * @desc    获取心愿列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const query = { coupleId };
    if (req.query.archived === 'true') query.archivedAt = { $ne: null };
    else if (req.query.archived !== 'all') query.archivedAt = null;
    const wishes = await Wish.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: wishes
    });
  } catch (error) {
    logError('获取心愿列表出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/wishes
 * @desc    创建心愿
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { title, description, type, priority, targetDate } = req.body;
    
    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: '心愿标题不能为空'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const wish = new Wish({
      coupleId,
      createdBy: userId,
      title: title.trim(),
      description: description?.trim() || '',
      type: type || 'want',
      priority: priority || 'normal',
      targetDate: targetDate || null,
      status: 'pending'
    });
    
    await wish.save();
    
    // 强实时同步：广播完整数据给情侣双方
    emitWishSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: wish._id,
        title: wish.title,
        description: wish.description,
        type: wish.type,
        priority: wish.priority,
        targetDate: wish.targetDate,
        status: wish.status,
        createdBy: wish.createdBy,
        createdAt: wish.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给伴侣
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('wishCreated', {
        nickname: user.nickname,
        wishTitle: wish.title
      }, { url: '/wish' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({
      success: true,
      message: '心愿创建成功',
      data: wish
    });
  } catch (error) {
    logError('创建心愿出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/wishes/:id/complete
 * @desc    完成心愿
 * @access  Private
 */
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { completionNote } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const wish = await Wish.findOne({ _id: req.params.id, coupleId });
    if (!wish) {
      return res.status(404).json({
        success: false,
        message: '心愿不存在'
      });
    }
    
    if (wish.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: '该心愿已完成'
      });
    }
    
    wish.status = 'completed';
    wish.completedAt = new Date();
    wish.completedBy = userId;
    wish.completionNote = completionNote?.trim() || '';
    
    await wish.save();
    
    // 强实时同步：广播完成状态给情侣双方
    emitWishSync(req.app, coupleId, {
      action: 'complete',
      payload: {
        id: wish._id,
        status: wish.status,
        completedAt: wish.completedAt,
        completedBy: wish.completedBy,
        completionNote: wish.completionNote
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // 推送通知只发给创建者（如果不是自己完成的）
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && wish.createdBy !== userId) {
      const payload = getPushPayload('wishCompleted', {
        nickname: user.nickname,
        wishTitle: wish.title,
        completionNote: wish.completionNote
      }, { url: '/wish' });
      sendNotification(wish.createdBy, payload);
    }
    
    res.json({
      success: true,
      message: '心愿完成',
      data: wish
    });
  } catch (error) {
    logError('完成心愿出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/wishes/:id/archive
 * @desc    归档已完成心愿
 * @access  Private
 */
router.post('/:id/archive', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: '心愿不存在' });
    }
    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.status(400).json({ success: false, message: '请先绑定伴侣' });
    }
    const coupleId = [userId, user.partnerId].sort().join('_');
    const existing = await Wish.findOne({ _id: req.params.id, coupleId });
    if (!existing) {
      return res.status(404).json({ success: false, message: '心愿不存在' });
    }
    if (existing.status !== 'completed') {
      return res.status(400).json({ success: false, message: '请先完成心愿再归档' });
    }

    const archivedAt = new Date();
    const wish = await Wish.findOneAndUpdate(
      { _id: req.params.id, coupleId, status: 'completed', archivedAt: null },
      { $set: { archivedAt, archivedBy: userId } },
      { new: true }
    );
    if (!wish) {
      return res.status(409).json({ success: false, message: '心愿已归档或状态已变化' });
    }

    emitWishSync(req.app, coupleId, {
      action: 'archive',
      payload: { id: wish._id, archivedAt: wish.archivedAt, archivedBy: wish.archivedBy },
      actor: userId,
      requestId: req.body.requestId
    });
    res.json({ success: true, message: '已归档', data: wish });
  } catch (error) {
    logError('归档心愿出错', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   DELETE /api/wishes/:id
 * @desc    删除心愿
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');

    const wish = await Wish.findOne({ _id: req.params.id, coupleId });

    if (!wish) {
      return res.status(404).json({
        success: false,
        message: '心愿不存在'
      });
    }

    if (String(wish.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的心愿'
      });
    }

    const deleteResult = await Wish.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '心愿不存在'
      });
    }

    // 强实时同步：数据库删除成功后再广播
    emitWishSync(req.app, coupleId, {
      action: 'delete',
      payload: {
        id: wish._id
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '心愿已删除'
    });
  } catch (error) {
    logError('删除心愿出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
