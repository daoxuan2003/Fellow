// ============================================
// 化妆品保质期路由（简化版）
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { photoUpload } = require('../middleware/upload');
const { User, Cosmetic } = require('../models');
const storageService = require('../services/storage');
const { getPushPayload } = require('../config/notifications');
const { formatDate } = require('../utils/helpers');

const router = express.Router();

function emitCosmeticSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'cosmeticSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function getCoupleId(userId, partnerId) {
  return partnerId ? [userId, partnerId].sort().join('_') : null;
}

/**
 * @route   POST /api/cosmetics/upload
 * @desc    上传化妆品照片
 * @access  Private
 */
router.post('/upload', authMiddleware, photoUpload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '请选择照片'
      });
    }

    // 获取用户信息用于路径组织
    const user = await User.findById(req.userId);
    const userId = req.userId;
    const partnerId = user?.partnerId || req.userId;
    const filename = req.file.originalname || `photo_${Date.now()}.jpg`;

    // 上传文件: buffer, type, userId, partnerId, filename
    const filePath = await storageService.upload(
      req.file.buffer,
      'cosmetics',
      userId,
      partnerId,
      filename
    );

    res.json({
      success: true,
      data: {
        key: filePath
      }
    });
  } catch (error) {
    console.error('[Cosmetic] 上传照片出错:', error);
    res.status(500).json({
      success: false,
      message: '上传失败: ' + error.message
    });
  }
});

/**
 * @route   POST /api/cosmetics
 * @desc    添加化妆品
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      photoKey,
      aspectRatio,
      openDate,
      shelfLifeMonths,
      remindDaysBefore,
      note
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: '请输入化妆品名称'
      });
    }

    if (!photoKey) {
      return res.status(400).json({
        success: false,
        message: '请上传照片'
      });
    }

    if (!openDate) {
      return res.status(400).json({
        success: false,
        message: '请选择开封日期'
      });
    }

    if (!shelfLifeMonths || shelfLifeMonths < 0.1) {
      return res.status(400).json({
        success: false,
        message: '请输入保质期'
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

    // 计算过期日期（支持小数月份）
    const open = new Date(openDate);
    const expire = new Date(open);
    const months = parseFloat(shelfLifeMonths);
    expire.setMonth(expire.getMonth() + Math.floor(months));
    expire.setDate(expire.getDate() + Math.round((months % 1) * 30)); // 小数部分按30天/月换算
    const expireDate = formatDate(expire);

    const coupleId = [userId, user.partnerId].sort().join('_');

    const cosmetic = new Cosmetic({
      ownerId: userId,
      coupleId,
      name: name.trim(),
      photoKey,
      aspectRatio: aspectRatio || 1,
      openDate,
      shelfLifeMonths: parseFloat(shelfLifeMonths),
      expireDate,
      remindDaysBefore: parseInt(remindDaysBefore) || 30,
      note: note?.trim() || ''
    });

    await cosmetic.save();

    // 通知情侣双方
    const sendNotification = req.app.locals.sendNotification;

    emitCosmeticSync(req.app, coupleId, { action: 'create', payload: { id: cosmetic._id, name: cosmetic.name, photoKey: cosmetic.photoKey, aspectRatio: cosmetic.aspectRatio, openDate: cosmetic.openDate, expireDate: cosmetic.expireDate, shelfLifeMonths: cosmetic.shelfLifeMonths, remindDaysBefore: cosmetic.remindDaysBefore, status: cosmetic.status, note: cosmetic.note, ownerId: cosmetic.ownerId, createdAt: cosmetic.createdAt }, actor: userId, requestId: req.body.requestId });

    // 推送通知给伴侣
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('cosmeticAdded', {
        nickname: user.nickname,
        name: cosmetic.name
      }, { url: '/cosmetics' });
      sendNotification(user.partnerId, payload);
    }

    // 生成图片访问 URL
    const photoUrl = await storageService.getUrl(cosmetic.photoKey, 86400, `${req.protocol}://${req.get('host')}`);

    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: cosmetic._id,
        name: cosmetic.name,
        photoUrl,
        photoKey: cosmetic.photoKey,
        openDate: cosmetic.openDate,
        expireDate: cosmetic.expireDate,
        shelfLifeMonths: cosmetic.shelfLifeMonths,
        status: cosmetic.status,
        createdAt: cosmetic.createdAt
      }
    });
  } catch (error) {
    console.error('[Cosmetic] 添加化妆品出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/cosmetics
 * @desc    获取化妆品列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;

    const user = await User.findById(userId);
    if (!user?.partnerId) {
      return res.json({
        success: true,
        data: []
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    const query = { coupleId };

    if (status) {
      query.status = status;
    }

    const cosmetics = await Cosmetic.find(query)
      .sort({ expireDate: 1 });

    // 计算剩余天数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 生成图片访问 URL（新的预签名 URL）
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const result = await Promise.all(cosmetics.map(async (c) => {
      const expire = new Date(c.expireDate);
      expire.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));

      // 生成新的预签名 URL（24小时有效）
      const photoUrl = await storageService.getUrl(c.photoKey, 86400, baseUrl);

      return {
        id: c._id,
        name: c.name,
        photoUrl,
        photoKey: c.photoKey,
        aspectRatio: c.aspectRatio,
        openDate: c.openDate,
        expireDate: c.expireDate,
        shelfLifeMonths: c.shelfLifeMonths,
        daysLeft,
        isExpiringSoon: daysLeft <= c.remindDaysBefore && daysLeft > 0,
        isExpired: daysLeft <= 0,
        remindDaysBefore: c.remindDaysBefore,
        reminderSent: c.reminderSent,
        status: c.status,
        note: c.note,
        ownerId: c.ownerId,
        createdAt: c.createdAt
      };
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Cosmetic] 获取化妆品列表出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/cosmetics/:id/status
 * @desc    更新化妆品状态（用完/过期/恢复使用）
 * @access  Private
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.body;

    if (!['active', 'expired', 'empty'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '无效的状态'
      });
    }

    const cosmetic = await Cosmetic.findById(req.params.id);
    if (!cosmetic) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    const user = await User.findById(userId);
    if (!user || cosmetic.coupleId !== [userId, user.partnerId].sort().join('_')) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }

    cosmetic.status = status;
    if (status === 'empty') {
      cosmetic.emptiedAt = new Date();
    } else {
      cosmetic.emptiedAt = null;
    }
    cosmetic.updatedAt = new Date();

    await cosmetic.save();

    // 通知
    const sendNotification = req.app.locals.sendNotification;

    emitCosmeticSync(req.app, cosmetic.coupleId, { action: 'statusChange', payload: { id: cosmetic._id, status: cosmetic.status, emptiedAt: cosmetic.emptiedAt }, actor: userId, requestId: req.body.requestId });

    // 推送通知
    if (sendNotification && status === 'empty') {
      const userIds = cosmetic.coupleId.split('_').filter(id => id !== userId);
      for (const uid of userIds) {
        const payload = getPushPayload('cosmeticStatusChanged', {
          nickname: user.nickname,
          name: cosmetic.name,
          status
        }, { url: '/cosmetics' });
        sendNotification(uid, payload);
      }
    }

    res.json({
      success: true,
      message: '状态更新成功',
      data: {
        id: cosmetic._id,
        status: cosmetic.status,
        emptiedAt: cosmetic.emptiedAt
      }
    });
  } catch (error) {
    console.error('[Cosmetic] 更新状态出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/cosmetics/:id
 * @desc    编辑化妆品信息
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      name,
      openDate,
      shelfLifeMonths,
      remindDaysBefore,
      note
    } = req.body;

    const cosmetic = await Cosmetic.findById(req.params.id);
    if (!cosmetic) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    const user = await User.findById(userId);
    if (!user || cosmetic.coupleId !== getCoupleId(userId, user.partnerId)) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }

    // 只有拥有者可以编辑
    if (cosmetic.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有添加者才能编辑'
      });
    }

    if (name !== undefined) cosmetic.name = name.trim();
    if (note !== undefined) cosmetic.note = note.trim();
    if (remindDaysBefore !== undefined) {
      cosmetic.remindDaysBefore = parseInt(remindDaysBefore) || 30;
    }

    // 如果修改了日期或保质期，重新计算过期日期
    if (openDate !== undefined || shelfLifeMonths !== undefined) {
      const newOpenDate = openDate || cosmetic.openDate;
      const newShelfLife = shelfLifeMonths !== undefined
        ? parseFloat(shelfLifeMonths)
        : cosmetic.shelfLifeMonths;

      const open = new Date(newOpenDate);
      const expire = new Date(open);
      expire.setMonth(expire.getMonth() + Math.floor(newShelfLife));
      expire.setDate(expire.getDate() + Math.round((newShelfLife % 1) * 30));

      cosmetic.openDate = newOpenDate;
      cosmetic.shelfLifeMonths = newShelfLife;
      cosmetic.expireDate = formatDate(expire);

      // 重置提醒状态
      cosmetic.reminderSent = false;
    }

    cosmetic.updatedAt = new Date();
    await cosmetic.save();

    emitCosmeticSync(req.app, cosmetic.coupleId, { action: 'update', payload: { id: cosmetic._id, name: cosmetic.name, openDate: cosmetic.openDate, expireDate: cosmetic.expireDate, shelfLifeMonths: cosmetic.shelfLifeMonths, remindDaysBefore: cosmetic.remindDaysBefore, note: cosmetic.note, reminderSent: cosmetic.reminderSent }, actor: userId, requestId: req.body.requestId });

    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: cosmetic._id,
        name: cosmetic.name,
        openDate: cosmetic.openDate,
        expireDate: cosmetic.expireDate,
        shelfLifeMonths: cosmetic.shelfLifeMonths,
        remindDaysBefore: cosmetic.remindDaysBefore,
        note: cosmetic.note
      }
    });
  } catch (error) {
    console.error('[Cosmetic] 编辑化妆品出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/cosmetics/:id
 * @desc    删除化妆品记录
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const cosmetic = await Cosmetic.findById(req.params.id);

    if (!cosmetic) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    const user = await User.findById(userId);
    const coupleId = getCoupleId(userId, user?.partnerId);
    if (!user || cosmetic.coupleId !== coupleId) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }

    // 只有拥有者可以删除
    if (cosmetic.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有添加者才能删除'
      });
    }

    const deleteResult = await Cosmetic.deleteOne({ _id: req.params.id, coupleId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '记录不存在'
      });
    }

    emitCosmeticSync(req.app, cosmetic.coupleId, { action: 'delete', payload: { id: cosmetic._id }, actor: userId, requestId: req.body.requestId });

    // 删除照片
    if (cosmetic.photoKey) {
      try {
        await storageService.delete(cosmetic.photoKey);
      } catch (e) {
        console.error('[Cosmetic] 删除照片失败:', e);
      }
    }

    // 推送通知给伴侣
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && cosmetic.ownerId !== userId) {
      const userIds = cosmetic.coupleId.split('_').filter(id => id !== userId);
      for (const uid of userIds) {
        const payload = getPushPayload('cosmeticDeleted', {
          name: cosmetic.name
        }, { url: '/cosmetics' });
        sendNotification(uid, payload);
      }
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('[Cosmetic] 删除化妆品出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
