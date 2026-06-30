// ============================================
// 旅行记录路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, Travel } = require('../models');
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
    
    res.json({
      success: true,
      data: travels
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
    
    const travel = new Travel({
      coupleId,
      createdBy: userId,
      city,
      country: country || '中国',
      date,
      photos: photos || [],
      memory: memory || '',
      highlights: highlights || [],
      weather: weather || '',
      isFavorite: isFavorite || false
    });
    
    await travel.save();

    emitTravelSync(req.app, coupleId, {
      action: 'create',
      payload: {
        id: travel._id,
        city: travel.city,
        country: travel.country,
        date: travel.date,
        photos: travel.photos,
        memory: travel.memory,
        highlights: travel.highlights,
        weather: travel.weather,
        isFavorite: travel.isFavorite,
        createdBy: travel.createdBy,
        createdAt: travel.createdAt
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '旅行记录添加成功',
      data: travel
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
      { new: true }
    );

    if (!travel) {
      return res.status(404).json({
        success: false,
        message: '旅行记录不存在'
      });
    }

    emitTravelSync(req.app, coupleId, {
      action: 'update',
      payload: {
        id: travel._id,
        ...updateData
      },
      actor: userId,
      requestId: req.body.requestId
    });
    
    res.json({
      success: true,
      message: '更新成功',
      data: travel
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
