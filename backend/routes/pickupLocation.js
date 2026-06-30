// ============================================
// 取件地点路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, PickupLocation } = require('../models');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

/**
 * @route   GET /api/pickup-locations
 * @desc    获取取件地点列表
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
    
    const locations = await PickupLocation.find({ coupleId })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: locations.map(loc => ({
        id: loc._id,
        name: loc.name,
        createdBy: loc.createdBy
      }))
    });
  } catch (error) {
    logError('获取取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/pickup-locations
 * @desc    添加取件地点
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '地点名称不能为空'
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
    const locationName = name.trim();
    
    // 检查是否已存在
    const existing = await PickupLocation.findOne({ coupleId, name: locationName });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该地点已存在'
      });
    }
    
    const newLocation = new PickupLocation({
      coupleId,
      name: locationName,
      createdBy: userId
    });
    
    await newLocation.save();
    
    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: newLocation._id,
        name: newLocation.name,
        createdBy: newLocation.createdBy
      }
    });
  } catch (error) {
    logError('添加取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/pickup-locations/:id
 * @desc    修改取件地点
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '地点名称不能为空'
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
    const newName = name.trim();
    
    // 检查新名称是否已存在
    const existing = await PickupLocation.findOne({ 
      coupleId, 
      name: newName,
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '该地点名称已存在'
      });
    }
    
    const location = await PickupLocation.findOne({ _id: req.params.id, coupleId });

    if (!location) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    if (String(location.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能修改自己创建的地点'
      });
    }

    const updatedLocation = await PickupLocation.findOneAndUpdate(
      { _id: req.params.id, coupleId, createdBy: userId },
      { name: newName },
      { new: true }
    );
    
    if (!updatedLocation) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }
    
    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: updatedLocation._id,
        name: updatedLocation.name,
        createdBy: updatedLocation.createdBy
      }
    });
  } catch (error) {
    logError('修改取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/pickup-locations/:id
 * @desc    删除取件地点
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
    
    const location = await PickupLocation.findOne({
      _id: req.params.id,
      coupleId
    });
    
    if (!location) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }

    if (String(location.createdBy) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: '只能删除自己创建的地点'
      });
    }

    const deleteResult = await PickupLocation.deleteOne({ _id: req.params.id, coupleId, createdBy: userId });
    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: '地点不存在'
      });
    }
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    logError('删除取件地点出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
