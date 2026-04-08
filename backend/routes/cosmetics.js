// ============================================
// 化妆品保质期路由（简化版）
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { photoUpload } = require('../middleware/upload');
const { User, Cosmetic } = require('../models');
const { storageService } = require('../services/storage');
const { getPushPayload } = require('../config/notifications');

const router = express.Router();

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
    
    const result = await storageService.upload(req.file, 'cosmetics');
    
    res.json({
      success: true,
      data: {
        url: result.url,
        key: result.key
      }
    });
  } catch (error) {
    console.error('[Cosmetic] 上传照片出错:', error);
    res.status(500).json({
      success: false,
      message: '上传失败'
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
      photoUrl,
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
    
    if (!photoUrl) {
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
    
    if (!shelfLifeMonths || shelfLifeMonths < 1) {
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
    
    // 计算过期日期
    const open = new Date(openDate);
    const expire = new Date(open);
    expire.setMonth(expire.getMonth() + parseInt(shelfLifeMonths));
    const expireDate = expire.toISOString().split('T')[0];
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const cosmetic = new Cosmetic({
      ownerId: userId,
      coupleId,
      name: name.trim(),
      photoUrl,
      aspectRatio: aspectRatio || 1,
      openDate,
      shelfLifeMonths: parseInt(shelfLifeMonths),
      expireDate,
      remindDaysBefore: parseInt(remindDaysBefore) || 30,
      note: note?.trim() || ''
    });
    
    await cosmetic.save();
    
    // 通知情侣双方
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const sendNotification = req.app.locals.sendNotification;
    
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, {
        type: 'cosmeticAdded',
        data: {
          cosmeticId: cosmetic._id,
          name: cosmetic.name
        }
      });
    }
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('cosmeticAdded', {
        nickname: user.nickname,
        name: cosmetic.name
      }, { url: '/cosmetics' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: cosmetic._id,
        name: cosmetic.name,
        photoUrl: cosmetic.photoUrl,
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
    
    const result = cosmetics.map(c => {
      const expire = new Date(c.expireDate);
      expire.setHours(0, 0, 0, 0);
      const daysLeft = Math.ceil((expire - today) / (1000 * 60 * 60 * 24));
      
      return {
        id: c._id,
        name: c.name,
        photoUrl: c.photoUrl,
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
    });
    
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
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const sendNotification = req.app.locals.sendNotification;
    
    if (broadcastToCouple) {
      broadcastToCouple(cosmetic.coupleId, {
        type: 'cosmeticStatusChanged',
        data: {
          cosmeticId: cosmetic._id,
          name: cosmetic.name,
          status
        }
      });
    }
    
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
        ? parseInt(shelfLifeMonths) 
        : cosmetic.shelfLifeMonths;
      
      const open = new Date(newOpenDate);
      const expire = new Date(open);
      expire.setMonth(expire.getMonth() + newShelfLife);
      
      cosmetic.openDate = newOpenDate;
      cosmetic.shelfLifeMonths = newShelfLife;
      cosmetic.expireDate = expire.toISOString().split('T')[0];
      
      // 重置提醒状态
      cosmetic.reminderSent = false;
    }
    
    cosmetic.updatedAt = new Date();
    await cosmetic.save();
    
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
    
    // 只有拥有者可以删除
    if (cosmetic.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有添加者才能删除'
      });
    }
    
    await Cosmetic.deleteOne({ _id: req.params.id });
    
    // 删除照片
    if (cosmetic.photoUrl) {
      try {
        await storageService.delete(cosmetic.photoUrl);
      } catch (e) {
        console.error('[Cosmetic] 删除照片失败:', e);
      }
    }
    
    // 通知
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    if (broadcastToCouple) {
      broadcastToCouple(cosmetic.coupleId, {
        type: 'cosmeticDeleted',
        data: {
          cosmeticId: cosmetic._id,
          name: cosmetic.name
        }
      });
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
