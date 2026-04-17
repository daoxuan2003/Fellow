// ============================================
// 购物清单路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, ShoppingItem } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   POST /api/shopping
 * @desc    创建购物项
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, quantity, note, image, ownership } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '物品名称不能为空'
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
    const item = new ShoppingItem({
      createdBy: userId,
      coupleId,
      name: name.trim(),
      quantity: quantity?.trim() || '1',
      note: note?.trim() || '',
      image: image || null,
      ownership: ['self', 'partner', 'both'].includes(ownership) ? ownership : 'both',
      status: 'pending'
    });
    
    await item.save();
    
    // 通知情侣双方
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    
    const messageData = {
      type: 'shoppingCreated',
      data: {
        itemId: item._id,
        name: item.name,
        ownership: item.ownership,
        createdBy: userId,
        createdAt: item.createdAt
      }
    };
    
    if (broadcastToCouple) {
      broadcastToCouple(coupleId, messageData);
    } else if (notifyPartner && user.partnerId) {
      notifyPartner(user.partnerId, messageData);
    }
    
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('shoppingCreated', {
        nickname: user.nickname,
        item: item.name
      }, { url: '/shopping' });
      sendNotification(user.partnerId, payload);
    }
    
    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      }
    });
  } catch (error) {
    console.log('创建购物项出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/shopping
 * @desc    获取购物清单
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.json({
        success: true,
        data: {
          pending: [],
          completed: []
        }
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const query = { coupleId };
    if (status) {
      query.status = status;
    }
    
    const items = await ShoppingItem.find(query).sort({ createdAt: -1 });
    
    // 获取创建者和完成者信息
    const userIds = [...new Set([
      ...items.map(i => i.createdBy),
      ...items.map(i => i.completedBy).filter(Boolean)
    ])];
    
    const users = await User.find({ _id: { $in: userIds } });
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
        avatarUrl
      };
    }));
    
    // 生成图片预签名 URL
    const result = await Promise.all(items.map(async (item) => {
      let imageUrl = null;
      if (item.image) {
        imageUrl = await storageService.getUrl(item.image, 86400, baseUrl);
      }
      return {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        imageUrl,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        completedBy: item.completedBy,
        creator: userMap[item.createdBy] || null,
        completer: item.completedBy ? (userMap[item.completedBy] || null) : null,
        createdAt: item.createdAt,
        completedAt: item.completedAt
      };
    }));
    
    res.json({
      success: true,
      data: {
        list: result,
        pending: result.filter(i => i.status === 'pending'),
        completed: result.filter(i => i.status === 'completed')
      }
    });
  } catch (error) {
    console.log('获取购物清单出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/shopping/:id/complete
 * @desc    标记完成/取消完成
 * @access  Private
 */
router.put('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { completed } = req.body;
    
    const item = await ShoppingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '购物项不存在'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || item.coupleId !== [userId, user.partnerId].sort().join('_')) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }
    
    const isCompleted = completed === true || completed === 'true';
    
    if (isCompleted) {
      item.status = 'completed';
      item.completedBy = userId;
      item.completedAt = new Date();
    } else {
      item.status = 'pending';
      item.completedBy = null;
      item.completedAt = null;
    }
    
    await item.save();
    
    // 通知情侣双方
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    
    const messageData = {
      type: isCompleted ? 'shoppingCompleted' : 'shoppingUncompleted',
      data: {
        itemId: item._id,
        name: item.name,
        completedBy: userId,
        requesterId: item.createdBy
      }
    };
    
    if (broadcastToCouple) {
      broadcastToCouple(item.coupleId, messageData);
    } else if (notifyPartner && item.createdBy !== userId) {
      notifyPartner(item.createdBy, messageData);
    }
    
    if (sendNotification && item.createdBy !== userId) {
      const payload = getPushPayload(
        isCompleted ? 'shoppingCompleted' : 'shoppingUncompleted',
        { nickname: user.nickname, item: item.name },
        { url: '/shopping' }
      );
      sendNotification(item.createdBy, payload);
    }
    
    res.json({
      success: true,
      message: isCompleted ? '已标记为已购' : '已取消标记',
      data: {
        id: item._id,
        status: item.status,
        completedBy: item.completedBy,
        completedAt: item.completedAt
      }
    });
  } catch (error) {
    console.log('标记购物项出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/shopping/:id
 * @desc    编辑购物项
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, quantity, note, image, ownership } = req.body;
    
    const item = await ShoppingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '购物项不存在'
      });
    }
    
    if (item.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能编辑'
      });
    }
    
    if (name !== undefined) item.name = name.trim();
    if (quantity !== undefined) item.quantity = quantity.trim();
    if (note !== undefined) item.note = note.trim();
    if (image !== undefined) item.image = image || null;
    if (ownership !== undefined && ['self', 'partner', 'both'].includes(ownership)) {
      item.ownership = ownership;
    }
    
    await item.save();
    
    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      }
    });
  } catch (error) {
    console.log('编辑购物项出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/shopping/:id
 * @desc    删除购物项
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const item = await ShoppingItem.findById(req.params.id);
    
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '购物项不存在'
      });
    }
    
    if (item.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }
    
    const user = await User.findById(userId);
    
    // 通知情侣双方
    const broadcastToCouple = req.app.locals.broadcastToCouple;
    const notifyPartner = req.app.locals.notifyPartner;
    const sendNotification = req.app.locals.sendNotification;
    
    const deleteMessage = {
      type: 'shoppingDeleted',
      data: {
        itemId: item._id,
        name: item.name,
        requesterId: item.createdBy
      }
    };
    
    if (broadcastToCouple) {
      broadcastToCouple(item.coupleId, deleteMessage);
    } else if (notifyPartner && user.partnerId) {
      notifyPartner(user.partnerId, deleteMessage);
    }
    
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('shoppingDeleted', { item: item.name }, { url: '/shopping' });
      sendNotification(user.partnerId, payload);
    }
    
    await ShoppingItem.deleteOne({ _id: req.params.id });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.log('删除购物项出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
