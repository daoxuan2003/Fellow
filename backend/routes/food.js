// ============================================
// 美食记录路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, Food } = require('../models');
const { pickAllowedFields } = require('../utils/payload');

const router = express.Router();
const FOOD_UPDATE_FIELDS = [
  'restaurant',
  'date',
  'whatWeAte',
  'howWasIt',
  'wantToGoAgain',
  'isOurFavorite',
  'location',
  'photos'
];

function emitFoodSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'foodSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

/**
 * @route   GET /api/foods
 * @desc    获取美食记录列表
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
    const foods = await Food.find({ coupleId }).sort({ date: -1 });
    
    res.json({
      success: true,
      data: foods
    });
  } catch (error) {
    console.log('获取美食记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/foods
 * @desc    创建美食记录
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { restaurant, date, whatWeAte, howWasIt, wantToGoAgain, isOurFavorite, location, photos } = req.body;
    
    if (!restaurant || !date) {
      return res.status(400).json({
        success: false,
        message: '餐厅名和日期不能为空'
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
    
    const food = new Food({
      coupleId,
      createdBy: userId,
      restaurant,
      date,
      whatWeAte: whatWeAte || [],
      howWasIt: howWasIt || '',
      wantToGoAgain: wantToGoAgain || false,
      isOurFavorite: isOurFavorite || false,
      location: location || '',
      photos: photos || []
    });
    
    await food.save();

    emitFoodSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: food._id,
        restaurant: food.restaurant,
        date: food.date,
        whatWeAte: food.whatWeAte,
        howWasIt: food.howWasIt,
        wantToGoAgain: food.wantToGoAgain,
        isOurFavorite: food.isOurFavorite,
        location: food.location,
        photos: food.photos,
        createdBy: food.createdBy,
        createdAt: food.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '美食记录添加成功',
      data: food
    });
  } catch (error) {
    console.log('添加美食记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/foods/:id
 * @desc    更新美食记录
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = pickAllowedFields(req.body, FOOD_UPDATE_FIELDS);
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.status(400).json({
        success: false,
        message: '请先绑定伴侣'
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const food = await Food.findOneAndUpdate(
      { _id: req.params.id, coupleId },
      { $set: updateData },
      { new: true }
    );
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }

    emitFoodSync(req.app, coupleId, {
      action: 'update',
      payload: {
        id: food._id,
        ...updateData
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '更新成功',
      data: food
    });
  } catch (error) {
    console.log('更新美食记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/foods/:id
 * @desc    删除美食记录
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
    
    const food = await Food.findOneAndDelete({ _id: req.params.id, coupleId });
    
    if (!food) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }

    emitFoodSync(req.app, coupleId, {
      action: 'delete',
      payload: {
        id: food._id
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.log('删除美食记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
