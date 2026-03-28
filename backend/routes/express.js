// ============================================
// 代取快递路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, ExpressDelivery } = require('../models');

const router = express.Router();

// 辅助函数：获取称呼
function getPronoun(gender) {
  if (gender === 'male') return '他';
  if (gender === 'female') return '她';
  return 'TA';
}

/**
 * @route   POST /api/express
 * @desc    创建快递请求
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { trackingNo, pickupLocation, description, priority } = req.body;
    
    if (!trackingNo || !pickupLocation) {
      return res.status(400).json({
        success: false,
        message: '取件码和取件地点不能为空'
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
    const delivery = new ExpressDelivery({
      requesterId: userId,
      coupleId,
      trackingNo: trackingNo.trim(),
      pickupLocation: pickupLocation.trim(),
      description: description?.trim() || '',
      priority: priority === 'urgent' ? 'urgent' : 'normal'
    });
    
    await delivery.save();
    
    res.json({
      success: true,
      message: '添加成功',
      data: {
        id: delivery._id,
        trackingNo: delivery.trackingNo,
        pickupLocation: delivery.pickupLocation,
        description: delivery.description,
        status: delivery.status,
        requesterId: delivery.requesterId,
        pickerId: null,
        createdAt: delivery.createdAt
      }
    });
  } catch (error) {
    console.log('创建快递请求出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   GET /api/express
 * @desc    获取快递列表
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
          picked: []
        }
      });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    
    const query = { coupleId };
    if (status) {
      query.status = status;
    }
    
    const deliveries = await ExpressDelivery.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    
    // 获取创建者和取件人信息
    const userIds = [...new Set([
      ...deliveries.map(e => e.requesterId),
      ...deliveries.map(e => e.pickerId).filter(Boolean)
    ])];
    
    const users = await User.find({ _id: { $in: userIds } });
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = {
        id: u._id,
        nickname: u.nickname,
        gender: u.gender,
        avatar: u.avatar
      };
    });
    
    const result = deliveries.map(d => ({
      id: d._id,
      trackingNo: d.trackingNo,
      pickupLocation: d.pickupLocation,
      description: d.description,
      priority: d.priority || 'normal',
      status: d.status,
      requesterId: d.requesterId,
      pickerId: d.pickerId,
      requester: userMap[d.requesterId] || null,
      picker: d.pickerId ? (userMap[d.pickerId] || null) : null,
      createdAt: d.createdAt,
      pickedAt: d.pickedAt
    }));
    
    res.json({
      success: true,
      data: {
        list: result,
        pending: result.filter(e => e.status === 'pending'),
        picked: result.filter(e => e.status === 'picked')
      }
    });
  } catch (error) {
    console.log('获取快递列表出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id/pick
 * @desc    标记取件
 * @access  Private
 */
router.put('/:id/pick', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const delivery = await ExpressDelivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || delivery.coupleId !== [userId, user.partnerId].sort().join('_')) {
      return res.status(403).json({
        success: false,
        message: '无权操作'
      });
    }
    
    if (delivery.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该快递已被取件'
      });
    }
    
    delivery.status = 'picked';
    delivery.pickerId = userId;
    delivery.pickedAt = new Date();
    await delivery.save();
    
    res.json({
      success: true,
      message: '取件成功',
      data: {
        id: delivery._id,
        status: delivery.status,
        pickerId: delivery.pickerId,
        pickedAt: delivery.pickedAt
      }
    });
  } catch (error) {
    console.log('取件出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id/unpick
 * @desc    撤销取件
 * @access  Private
 */
router.put('/:id/unpick', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const delivery = await ExpressDelivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    if (delivery.pickerId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有取件人才能撤销'
      });
    }
    
    if (delivery.status !== 'picked') {
      return res.status(400).json({
        success: false,
        message: '该快递未在已取状态'
      });
    }
    
    delivery.status = 'pending';
    delivery.pickerId = null;
    delivery.pickedAt = null;
    await delivery.save();
    
    res.json({
      success: true,
      message: '撤销成功',
      data: {
        id: delivery._id,
        status: delivery.status,
        pickerId: null,
        pickedAt: null
      }
    });
  } catch (error) {
    console.log('撤销取件出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   DELETE /api/express/:id
 * @desc    删除快递请求
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const delivery = await ExpressDelivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    if (delivery.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能删除'
      });
    }
    
    if (delivery.status === 'picked') {
      return res.status(400).json({
        success: false,
        message: '已取件的快递不能删除'
      });
    }
    
    await ExpressDelivery.deleteOne({ _id: req.params.id });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.log('删除快递出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   PUT /api/express/:id
 * @desc    编辑快递请求
 * @access  Private
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { trackingNo, pickupLocation, description, priority } = req.body;
    
    const delivery = await ExpressDelivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: '快递不存在'
      });
    }
    
    if (delivery.requesterId !== userId) {
      return res.status(403).json({
        success: false,
        message: '只有创建者才能编辑'
      });
    }
    
    if (delivery.status === 'picked') {
      return res.status(400).json({
        success: false,
        message: '已取件的快递不能编辑'
      });
    }
    
    if (trackingNo !== undefined) delivery.trackingNo = trackingNo.trim();
    if (pickupLocation !== undefined) delivery.pickupLocation = pickupLocation.trim();
    if (description !== undefined) delivery.description = description.trim();
    if (priority !== undefined) delivery.priority = priority === 'urgent' ? 'urgent' : 'normal';
    
    await delivery.save();
    
    res.json({
      success: true,
      message: '修改成功',
      data: {
        id: delivery._id,
        trackingNo: delivery.trackingNo,
        pickupLocation: delivery.pickupLocation,
        description: delivery.description,
        priority: delivery.priority,
        status: delivery.status,
        requesterId: delivery.requesterId,
        pickerId: delivery.pickerId,
        createdAt: delivery.createdAt
      }
    });
  } catch (error) {
    console.log('编辑快递出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
