// ============================================
// 数据同步路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

/**
 * @route   GET /api/sync
 * @desc    检查数据同步状态（用于实时更新）
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const lastSync = req.query.lastSync;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否有更新
    const hasUpdate = !lastSync || new Date(user.lastUpdate) > new Date(lastSync);
    
    // 获取伴侣信息
    let partnerInfo = null;
    let partnerHasUpdate = false;
    
    // 生成头像预签名 URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    if (user.partnerId) {
      const partner = await User.findById(user.partnerId);
      if (partner) {
        let partnerAvatarUrl = null;
        if (partner.avatar) {
          partnerAvatarUrl = await storageService.getUrl(partner.avatar, 86400, baseUrl);
        }
        
        partnerInfo = {
          id: partner._id,
          nickname: partner.nickname,
          avatar: partner.avatar,
          avatarUrl: partnerAvatarUrl,
          gender: partner.gender,
          bio: partner.bio,
          lastUpdate: partner.lastUpdate
        };
        
        partnerHasUpdate = !lastSync || new Date(partner.lastUpdate) > new Date(lastSync);
      }
    }
    
    // 生成当前用户头像预签名 URL
    let userAvatarUrl = null;
    if (user.avatar) {
      userAvatarUrl = await storageService.getUrl(user.avatar, 86400, baseUrl);
    }
    
    res.json({
      success: true,
      hasUpdate: hasUpdate || partnerHasUpdate,
      userUpdate: hasUpdate,
      partnerUpdate: partnerHasUpdate,
      lastUpdate: user.lastUpdate,
      data: hasUpdate ? {
        id: user._id,
        nickname: user.nickname,
        account: user.account,
        gender: user.gender,
        bio: user.bio,
        avatar: user.avatar,
        avatarUrl: userAvatarUrl,
        partnerId: user.partnerId,
        partnerNote: user.partnerNote,
        boundAt: user.boundAt,
        lastUpdate: user.lastUpdate
      } : null,
      partner: partnerInfo
    });
  } catch (error) {
    logError('同步检查出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
