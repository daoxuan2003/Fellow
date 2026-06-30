// ============================================
// 想吃清单路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, FoodWish } = require('../models');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

function emitFoodWishSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'foodWishSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

/**
 * @route   GET /api/food-wishes
 * @desc    获取想吃清单
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
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
    const wishes = await FoodWish.find({ coupleId }).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: wishes
    });
  } catch (error) {
    logError('获取想吃清单出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/food-wishes
 * @desc    添加想吃
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { restaurant, whyWeWant } = req.body;
    
    if (!restaurant) {
      return res.status(400).json({
        success: false,
        message: '餐厅名不能为空'
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
    
    const wish = new FoodWish({
      coupleId,
      createdBy: userId,
      restaurant,
      whyWeWant: whyWeWant || ''
    });
    
    await wish.save();

    emitFoodWishSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: wish._id,
        restaurant: wish.restaurant,
        whyWeWant: wish.whyWeWant,
        createdBy: wish.createdBy,
        createdAt: wish.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '添加成功',
      data: wish
    });
  } catch (error) {
    logError('添加想吃清单出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/food-wishes/:id
 * @desc    删除想吃
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
    
    const wish = await FoodWish.findOne({ _id: req.params.id, coupleId });
    if (!wish) {
      return res.status(404).json({
        success: false,
        message: '想吃记录不存在'
      });
    }

    if (String(wish.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己添加的想吃'
      });
    }
    
    const deleteResult = await FoodWish.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '想吃记录不存在'
      });
    }

    emitFoodWishSync(req.app, coupleId, {
      action: 'delete',
      payload: {
        id: wish._id
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除想吃清单出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
