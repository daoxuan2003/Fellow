// ============================================
// 旅行记录路由
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { User, Travel } = require('../models');
const { normalizeOwnedPhotoPaths, serializeStoredPhotoUrls } = require('../utils/mediaPaths');
const { pickAllowedFields } = require('../utils/payload');
const { logError } = require('../utils/safeLogger');

const router = express.Router();
const TRAVEL_UPDATE_FIELDS = [
  'city',
  'country',
  'date',
  'photos',
  'memory',
  'highlights',
  'weather',
  'isFavorite'
];

function emitTravelSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'travelSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

async function serializeTravelRecord(travel, req, context) {
  const data = typeof travel.toObject === 'function' ? travel.toObject() : { ...travel };
  data.photos = await serializeStoredPhotoUrls(data.photos, req, context);
  return data;
}

/**
 * @route   GET /api/travels
 * @desc    获取旅行记录列表
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
    const travels = await Travel.find({ coupleId }).sort({ date: -1 });
    const serializedTravels = await Promise.all(
      travels.map(travel => serializeTravelRecord(travel, req, { userId, partnerId: user.partnerId, coupleId }))
    );
    
    res.json({
      success: true,
      data: serializedTravels
    });
  } catch (error) {
    logError('获取旅行记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/travels
 * @desc    创建旅行记录
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { city, country, date, photos, memory, highlights, weather, isFavorite } = req.body;
    
    if (!city || !date) {
      return res.status(400).json({
        success: false,
        message: '城市和日期不能为空'
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
    
    const travel = new Travel({
      coupleId,
      createdBy: userId,
      city,
      country: country || '中国',
      date,
      photos: photoResult.photos,
      memory: memory || '',
      highlights: highlights || [],
      weather: weather || '',
      isFavorite: isFavorite || false
    });
    
    await travel.save();
    const serializedTravel = await serializeTravelRecord(travel, req, { userId, partnerId: user.partnerId, coupleId });

    emitTravelSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: serializedTravel._id,
        city: serializedTravel.city,
        country: serializedTravel.country,
        date: serializedTravel.date,
        photos: serializedTravel.photos,
        memory: serializedTravel.memory,
        highlights: serializedTravel.highlights,
        weather: serializedTravel.weather,
        isFavorite: serializedTravel.isFavorite,
        createdBy: serializedTravel.createdBy,
        createdAt: serializedTravel.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '旅行记录添加成功',
      data: serializedTravel
    });
  } catch (error) {
    logError('添加旅行记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/travels/:id
 * @desc    更新旅行记录
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const updateData = pickAllowedFields(req.body, TRAVEL_UPDATE_FIELDS);
    
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
        message: '旅行记录不存在'
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
    
    const existingTravel = await Travel.findOne({ _id: req.params.id, coupleId });

    if (!existingTravel) {
      return res.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }

    if (String(existingTravel.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己创建的旅行记录'
      });
    }

    const travel = await Travel.findOneAndUpdate(
      { _id: req.params.id, coupleId, createdBy: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }

    const serializedTravel = await serializeTravelRecord(travel, req, { userId, partnerId: user.partnerId, coupleId });
    const syncPayload = {
      id: serializedTravel._id,
      ...updateData
    };
    if (updatesPhotos) {
      syncPayload.photos = serializedTravel.photos;
    }

    emitTravelSync(req.app, coupleId, {
      action: 'update',
      payload: syncPayload,
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '更新成功',
      data: serializedTravel
    });
  } catch (error) {
    logError('更新旅行记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/travels/:id
 * @desc    删除旅行记录
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
        message: '旅行记录不存在'
      });
    }
    
    const travel = await Travel.findOne({ _id: req.params.id, coupleId });

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }

    if (String(travel.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的旅行记录'
      });
    }

    const deleteResult = await Travel.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }

    emitTravelSync(req.app, coupleId, {
      action: 'delete',
      payload: {
        id: travel._id
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除旅行记录出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
