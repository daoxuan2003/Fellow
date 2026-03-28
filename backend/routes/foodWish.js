// ============================================
// 想吃清单路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User, FoodWish } = require('../models');

const router = express.Router();

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
    console.log('获取想吃清单出错：', error);
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
    
    res.json({
      success: true,
      message: '添加成功',
      data: wish
    });
  } catch (error) {
    console.log('添加想吃清单出错：', error);
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
    
    await FoodWish.findOneAndDelete({ _id: req.params.id, coupleId });
    
    res.json({
      success: true,
      message: '删除成功'
    });
  } catch (error) {
    console.log('删除想吃清单出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
