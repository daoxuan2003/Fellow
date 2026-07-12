// ============================================
// 美食记录路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, Food } = require('../models');
const { normalizeOwnedPhotoPaths, serializeStoredPhotoUrls } = require('../utils/mediaPaths');
const { pickAllowedFields } = require('../utils/payload');
const { logError } = require('../utils/safeLogger');

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

async function serializeFoodRecord(food, req, context) {
  const data = typeof food.toObject === 'function' ? food.toObject() : { ...food };
  data.photos = await serializeStoredPhotoUrls(data.photos, req, context);
  return data;
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
    const serializedFoods = await Promise.all(
      foods.map(food => serializeFoodRecord(food, req, { userId, partnerId: user.partnerId, coupleId }))
    );
    
    res.json({
      success: true,
      data: serializedFoods
    });
  } catch (error) {
    logError('获取美食记录出错：', error);
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
    const photoResult = normalizeOwnedPhotoPaths(photos, { userId, partnerId: user.partnerId, coupleId });
    if (photoResult.error) {
      return res.status(photoResult.status || 400).json({
        success: false,
        message: photoResult.error
      });
    }
    
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
      photos: photoResult.photos
    });
    
    await food.save();
    const serializedFood = await serializeFoodRecord(food, req, { userId, partnerId: user.partnerId, coupleId });

    emitFoodSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: serializedFood._id,
        restaurant: serializedFood.restaurant,
        date: serializedFood.date,
        whatWeAte: serializedFood.whatWeAte,
        howWasIt: serializedFood.howWasIt,
        wantToGoAgain: serializedFood.wantToGoAgain,
        isOurFavorite: serializedFood.isOurFavorite,
        location: serializedFood.location,
        photos: serializedFood.photos,
        createdBy: serializedFood.createdBy,
        createdAt: serializedFood.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '美食记录添加成功',
      data: serializedFood
    });
  } catch (error) {
    logError('添加美食记录出错：', error);
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }
    const updatesPhotos = Object.prototype.hasOwnProperty.call(updateData, 'photos');
    if (updatesPhotos) {
      const photoResult = normalizeOwnedPhotoPaths(updateData.photos, { userId, partnerId: user.partnerId, coupleId });
      if (photoResult.error) {
        return res.status(photoResult.status || 400).json({
          success: false,
          message: photoResult.error
        });
      }
      updateData.photos = photoResult.photos;
    }
    
    const existingFood = await Food.findOne({ _id: req.params.id, coupleId });

    if (!existingFood) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }

    if (String(existingFood.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己创建的美食记录'
      });
    }

    const food = await Food.findOneAndUpdate(
      { _id: req.params.id, coupleId, createdBy: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!food) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }

    const serializedFood = await serializeFoodRecord(food, req, { userId, partnerId: user.partnerId, coupleId });
    const syncPayload = {
      id: serializedFood._id,
      ...updateData
    };
    if (updatesPhotos) {
      syncPayload.photos = serializedFood.photos;
    }

    emitFoodSync(req.app, coupleId, {
      action: 'update',
      payload: syncPayload,
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '更新成功',
      data: serializedFood
    });
  } catch (error) {
    logError('更新美食记录出错：', error);
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
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }
    
    const food = await Food.findOne({ _id: req.params.id, coupleId });

    if (!food) {
      return res.status(404).json({
        success: false,
        message: '美食记录不存在'
      });
    }

    if (String(food.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的美食记录'
      });
    }

    const deleteResult = await Food.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
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
    logError('删除美食记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
