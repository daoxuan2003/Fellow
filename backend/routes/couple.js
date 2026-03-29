// ============================================
// 情侣绑定路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');

const router = express.Router();

/**
 * @route   POST /api/bind
 * @desc    通过配对码绑定情侣
 * @access  Private
 */
router.post('/bind', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { pairCode } = req.body;
    
    // 查找自己
    const self = await User.findById(userId);
    if (!self) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否已绑定
    if (self.partnerId) {
      return res.status(400).json({
        success: false,
        message: '你已经绑定过伴侣了，一个人只能有一个伴侣哦'
      });
    }
    
    // 根据配对码查找对方
    const partner = await User.findOne({ pairCode });
    
    if (!partner) {
      return res.status(404).json({
        success: false,
        message: '找不到这个配对码，请检查是否输入正确'
      });
    }
    
    // 检查对方是不是自己
    if (partner._id.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: '不能和自己绑定哦'
      });
    }
    
    // 检查对方是否已经被绑定了
    if (partner.partnerId) {
      return res.status(400).json({
        success: false,
        message: '对方已经有伴侣了'
      });
    }
    
    // 双向绑定
    const now = new Date();
    
    self.partnerId = partner._id.toString();
    self.boundAt = now;
    await self.save();
    
    partner.partnerId = self._id.toString();
    partner.boundAt = now;
    await partner.save();
    
    res.json({
      success: true,
      message: '绑定成功！恭喜你们成为情侣',
      data: {
        partner: {
          id: partner._id,
          nickname: partner.nickname,
          pairCode: partner.pairCode
        },
        boundAt: now
      }
    });
  } catch (error) {
    console.log('绑定出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了，请稍后再试'
    });
  }
});

/**
 * @route   POST /api/couple/unbind
 * @desc    解除伴侣关系
 * @access  Private
 */
router.post('/unbind', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const self = await User.findById(userId);
    
    if (!self || !self.partnerId) {
      return res.status(400).json({
        success: false,
        message: '你还没有伴侣'
      });
    }
    
    const partnerId = self.partnerId.toString();
    const partner = await User.findById(partnerId);
    
    // 清除双方绑定和共同信息
    self.partnerId = null;
    self.boundAt = null;
    self.anniversary = null;
    self.inviteStatus = 'idle';
    self.invitingTo = null;
    await self.save();
    
    if (partner) {
      partner.partnerId = null;
      partner.boundAt = null;
      partner.anniversary = null;
      partner.inviteStatus = 'idle';
      partner.invitingTo = null;
      await partner.save();
    }
    
    res.json({
      success: true,
      message: '已解除伴侣关系'
    });
  } catch (error) {
    console.log('解除绑定出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/unbind
 * @desc    解除绑定（旧版接口，保持兼容）
 * @access  Private
 */
router.post('/unbind-legacy', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    const self = await User.findById(userId);
    if (!self || !self.partnerId) {
      return res.status(400).json({
        success: false,
        message: '你还没有伴侣'
      });
    }
    
    const partner = await User.findById(self.partnerId);
    
    // 清除双方的绑定关系
    self.partnerId = null;
    self.boundAt = null;
    self.inviteStatus = 'idle';
    self.invitingTo = null;
    await self.save();
    
    if (partner) {
      partner.partnerId = null;
      partner.boundAt = null;
      partner.inviteStatus = 'idle';
      partner.invitingTo = null;
      await partner.save();
    }
    
    res.json({
      success: true,
      message: '已解除绑定'
    });
  } catch (error) {
    console.log('解除绑定出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
