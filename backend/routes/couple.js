// ============================================
// 情侣绑定路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const { logError } = require('../utils/safeLogger');
const {
  RelationshipStateError,
  commitCoupleUnbound
} = require('../utils/relationshipMutations');

const router = express.Router();

/**
 * @route   POST /api/bind
 * @desc    旧版直接绑定接口（已停用，改用双方确认邀请）
 * @access  Private
 */
router.post('/bind', authMiddleware, (_req, res) => {
  res.status(410).json({
    success: false,
    message: '直接绑定已停用，请通过邀请并由对方确认绑定'
  });
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
    
    await commitCoupleUnbound(self, partner, new Date(), { clearAnniversary: true });
    
    res.json({
      success: true,
      message: '已解除伴侣关系'
    });
  } catch (error) {
    logError('解除绑定出错：', error);
    if (error instanceof RelationshipStateError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
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
    await commitCoupleUnbound(self, partner, new Date(), { clearAnniversary: false });
    
    res.json({
      success: true,
      message: '已解除绑定'
    });
  } catch (error) {
    logError('解除绑定出错：', error);
    if (error instanceof RelationshipStateError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
