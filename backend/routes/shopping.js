// ============================================
// 购物清单路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, ShoppingItem, ShoppingList } = require('../models');
const { getPushPayload } = require('../config/notifications');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

// ============================================
// 强实时同步辅助函数
// ============================================

/**
 * 统一发送购物清单同步消息
 * @param {object} app - Express app（用于获取 broadcastToCouple）
 * @param {string} coupleId - 情侣ID
 * @param {object} options - 同步选项
 *   @param {string} options.action - 操作类型: create|update|delete|complete|uncomplete|batchComplete|listCreate|listDelete
 *   @param {string} options.entity - 实体类型: item|list
 *   @param {object} options.payload - 数据负载
 *   @param {string} options.actor - 操作者用户ID
 *   @param {string} options.requestId - 前端请求ID（用于去重）
 */
function emitShoppingSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;

  const { action, entity, payload, actor, requestId } = options;

  broadcastToCouple(coupleId, {
    type: 'shoppingSync',
    data: {
      action,
      entity,
      payload,
      actor,
      requestId: requestId || null,
      timestamp: Date.now()
    }
  });
}

function getCoupleId(userId, partnerId) {
  return partnerId ? [userId, partnerId].sort().join('_') : null;
}

/**
 * @route   POST /api/shopping
 * @desc    创建购物项
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, quantity, note, image, ownership, listName, listOwnership } = req.body;

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
    const finalListOwnership = ['self', 'partner', 'both'].includes(listOwnership) ? listOwnership : 'self';
    const item = new ShoppingItem({
      createdBy: userId,
      coupleId,
      name: name.trim(),
      quantity: quantity?.trim() || '1',
      note: note?.trim() || '',
      image: image || null,
      listName: listName?.trim() || '',
      listOwnership: finalListOwnership,
      ownership: finalListOwnership,
      status: 'pending'
    });

    await item.save();

    // 强实时同步：广播完整数据给情侣双方
    emitShoppingSync(req.app, coupleId, {
      action: 'create',
      entity: 'item',
      payload: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        listName: item.listName,
        listOwnership: item.listOwnership,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // Push 通知（仅通知伴侣）
    const sendNotification = req.app.locals.sendNotification;
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
        listName: item.listName,
        listOwnership: item.listOwnership,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      }
    });
  } catch (error) {
    logError('创建购物项出错', error);
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
    const { status, listName } = req.query;

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
    if (listName !== undefined) {
      query.listName = listName.trim();
    }

    const items = await ShoppingItem.find(query).sort({ createdAt: -1 });

    // 从 ShoppingList 表中获取清单列表
    const dbLists = await ShoppingList.find({ coupleId });
    const listNameMap = new Map();
    dbLists.forEach(list => {
      const key = `${list.ownership}|${list.name}`;
      listNameMap.set(key, { id: list._id, name: list.name, ownership: list.ownership, createdBy: list.createdBy });
    });

    // 兼容旧数据：从物品中补充清单（如果物品关联的清单不在 ShoppingList 中）
    items.forEach(item => {
      if (item.listName && item.listName.trim() !== '') {
        const key = `${item.listOwnership || 'self'}|${item.listName}`;
        if (!listNameMap.has(key)) {
          listNameMap.set(key, { name: item.listName, ownership: item.listOwnership || 'self', createdBy: item.createdBy });
        }
      }
    });

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
        listName: item.listName,
        listOwnership: item.listOwnership,
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
        completed: result.filter(i => i.status === 'completed'),
        listNames: Array.from(listNameMap.values())
      }
    });
  } catch (error) {
    logError('获取购物清单出错', error);
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

    // 强实时同步：广播完整状态给情侣双方
    emitShoppingSync(req.app, item.coupleId, {
      action: isCompleted ? 'complete' : 'uncomplete',
      entity: 'item',
      payload: {
        id: item._id,
        status: item.status,
        completedBy: item.completedBy,
        completedAt: item.completedAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // Push 通知（仅通知创建者，如果自己不是创建者）
    const sendNotification = req.app.locals.sendNotification;
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
    logError('标记购物项出错', error);
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
    const { name, quantity, note, image, ownership, listName, listOwnership } = req.body;

    const item = await ShoppingItem.findById(req.params.id);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: '购物项不存在'
      });
    }

    const user = await User.findById(userId);
    const coupleId = getCoupleId(userId, user?.partnerId);
    if (!user || item.coupleId !== coupleId) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
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
    if (listName !== undefined) item.listName = listName.trim();
    if (listOwnership !== undefined && ['self', 'partner', 'both'].includes(listOwnership)) {
      item.listOwnership = listOwnership;
    }
    // 物品归属始终跟随清单归属
    item.ownership = item.listOwnership;

    await item.save();

    // 强实时同步：广播更新后的完整数据【覆盖遗漏场景】
    emitShoppingSync(req.app, item.coupleId, {
      action: 'update',
      entity: 'item',
      payload: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        listName: item.listName,
        listOwnership: item.listOwnership,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: item._id,
        name: item.name,
        quantity: item.quantity,
        note: item.note,
        image: item.image,
        listName: item.listName,
        listOwnership: item.listOwnership,
        ownership: item.ownership,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: item.createdAt
      }
    });
  } catch (error) {
    logError('编辑购物项出错', error);
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

    const user = await User.findById(userId);
    const coupleId = user?.partnerId ? [userId, user.partnerId].sort().join('_') : null;
    if (!user || item.coupleId !== coupleId) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }

    if (String(item.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }

    const deleteResult = await ShoppingItem.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '购物项不存在'
      });
    }

    // 强实时同步：数据库删除成功后再广播，避免失败写入产生幽灵更新
    emitShoppingSync(req.app, item.coupleId, {
      action: 'delete',
      entity: 'item',
      payload: {
        id: item._id,
        listName: item.listName,
        listOwnership: item.listOwnership
      },
      actor: userId,
      requestId: req.body.requestId
    });

    // Push 通知
    const sendNotification = req.app.locals.sendNotification;
    if (sendNotification && user.partnerId) {
      const payload = getPushPayload('shoppingDeleted', { item: item.name }, { url: '/shopping' });
      sendNotification(user.partnerId, payload);
    }

    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除购物项出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/shopping/lists
 * @desc    创建购物清单
 * @access  Private
 */
router.post('/lists', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, ownership } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '清单名称不能为空'
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
    const listOwnership = ['self', 'partner', 'both'].includes(ownership) ? ownership : 'self';

    const list = new ShoppingList({
      createdBy: userId,
      coupleId,
      name: name.trim(),
      ownership: listOwnership
    });

    await list.save();

    // 强实时同步
    emitShoppingSync(req.app, coupleId, {
      action: 'listCreate',
      entity: 'list',
      payload: {
        id: list._id,
        name: list.name,
        ownership: list.ownership,
        createdBy: list.createdBy,
        createdAt: list.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: '清单创建成功',
      data: {
        id: list._id,
        name: list.name,
        ownership: list.ownership,
        createdBy: list.createdBy,
        createdAt: list.createdAt
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: '该清单名称已存在'
      });
    }
    logError('创建购物清单出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/shopping/lists/:id
 * @desc    删除整个清单（及其下所有物品）
 * @access  Private
 */
router.delete('/lists/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const listId = req.params.id;

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');

    // 查找清单
    const list = await ShoppingList.findOne({ _id: listId, coupleId });
    if (!list) {
      return res.status(404).json({
        success: false,
        message: '清单不存在'
      });
    }

    if (String(list.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除清单'
      });
    }

    // 先查出该清单下所有物品ID（用于精准同步）
    const itemsToDelete = await ShoppingItem.find({
      coupleId,
      listName: list.name,
      listOwnership: list.ownership
    }).select('_id');
    const deletedItemIds = itemsToDelete.map(i => i._id.toString());

    // 删除该清单下所有物品
    const deleteResult = await ShoppingItem.deleteMany({
      coupleId,
      listName: list.name,
      listOwnership: list.ownership
    });

    // 删除清单
    const listDeleteResult = await ShoppingList.deleteOne({ _id: listId, coupleId, createdBy: userId });
    if (listDeleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '清单不存在'
      });
    }

    // 强实时同步：广播清单删除及被删物品ID列表
    emitShoppingSync(req.app, coupleId, {
      action: 'listDelete',
      entity: 'list',
      payload: {
        listId: listId,
        listName: list.name,
        listOwnership: list.ownership,
        deletedItemIds,
        deletedCount: deleteResult.deletedCount
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: `清单「${list.name}」及 ${deleteResult.deletedCount} 个物品已删除`,
      data: { deletedCount: deleteResult.deletedCount }
    });
  } catch (error) {
    logError('删除清单出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/shopping/list/:listName
 * @desc    删除整个清单（按名称，兼容旧数据）
 * @access  Private
 */
router.delete('/list/:listName', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const listName = req.params.listName;
    const listOwnership = req.query.ownership || 'self';

    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }

    const coupleId = [userId, user.partnerId].sort().join('_');
    const list = await ShoppingList.findOne({ coupleId, name: listName, ownership: listOwnership });

    if (list && String(list.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除清单'
      });
    }

    if (!list) {
      const partnerCreatedItem = await ShoppingItem.findOne({
        coupleId,
        listName,
        listOwnership,
        createdBy: { $ne: userId }
      });
      if (partnerCreatedItem) {
        return res.status(403).json({
          success: false,
          message: '只有创建者才能删除清单'
        });
      }
    }

    // 先查出该清单下所有物品ID（用于精准同步）
    const itemDeleteQuery = {
      coupleId,
      listName,
      listOwnership
    };
    if (!list) {
      itemDeleteQuery.createdBy = userId;
    }

    const itemsToDelete = await ShoppingItem.find(itemDeleteQuery).select('_id');
    const deletedItemIds = itemsToDelete.map(i => i._id.toString());

    // 删除该清单下所有物品
    const deleteResult = await ShoppingItem.deleteMany(itemDeleteQuery);

    // 同时删除 ShoppingList 中的记录（如果存在）
    await ShoppingList.deleteOne({ coupleId, name: listName, ownership: listOwnership, createdBy: userId });

    // 强实时同步
    emitShoppingSync(req.app, coupleId, {
      action: 'listDelete',
      entity: 'list',
      payload: {
        listName,
        listOwnership,
        deletedItemIds,
        deletedCount: deleteResult.deletedCount
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: `清单「${listName}」及 ${deleteResult.deletedCount} 个物品已删除`,
      data: { deletedCount: deleteResult.deletedCount }
    });
  } catch (error) {
    logError('删除清单出错', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
