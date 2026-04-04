// ============================================
// 成就系统路由
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { checkAchievements, getUserAchievements, migrateAchievements } = require('../services/achievementService');
const { User } = require('../models');

/**
 * @route   GET /api/achievements
 * @desc    获取当前用户的成就列表
 * @access  Private
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { total: 0, unlocked: 0, points: 0, achievements: [] } });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const achievements = await getUserAchievements(userId, coupleId);
    
    const unlocked = achievements.filter(a => a.unlockedAt).length;
    const points = achievements.filter(a => a.unlockedAt).reduce((sum, a) => sum + a.points, 0);
    
    res.json({
      success: true,
      data: {
        total: achievements.length,
        unlocked,
        points,
        achievements
      }
    });
  } catch (error) {
    console.error('获取成就列表出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/achievements/check
 * @desc    手动触发成就检查
 * @access  Private
 */
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { newUnlocks: [] } });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const { newUnlocks } = await checkAchievements(userId, coupleId);
    
    // 发送通知给伴侣（如果有新解锁的双人成就）
    if (newUnlocks.length > 0) {
      const coupleAchievements = newUnlocks.filter(a => a.category === 'couple');
      if (coupleAchievements.length > 0) {
        const notifyPartner = req.app.locals.notifyPartner;
        if (notifyPartner && user.partnerId) {
          notifyPartner(user.partnerId, {
            type: 'achievementUnlocked',
            data: {
              userName: user.nickname || '我',
              achievements: coupleAchievements.map(a => ({ id: a.id, title: a.title, icon: a.icon }))
            }
          });
        }
      }
    }
    
    res.json({ success: true, data: { newUnlocks } });
  } catch (error) {
    console.error('检查成就出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   POST /api/achievements/migrate
 * @desc    迁移 localStorage 中的成就数据（一次性）
 * @access  Private
 */
router.post('/migrate', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { unlockedMap } = req.body; // { achievementId: unlockedAtISOString }
    
    if (!unlockedMap || typeof unlockedMap !== 'object') {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { migrated: [] } });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const migrated = await migrateAchievements(userId, coupleId, unlockedMap);
    
    res.json({ success: true, data: { migrated } });
  } catch (error) {
    console.error('迁移成就出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

/**
 * @route   GET /api/achievements/couple-comparison
 * @desc    获取情侣双方的成就对比
 * @access  Private
 */
router.get('/couple-comparison', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: null });
    }
    
    const coupleId = [userId, user.partnerId].sort().join('_');
    const partnerId = user.partnerId;
    
    const myAchievements = await getUserAchievements(userId, coupleId);
    const partnerAchievements = await getUserAchievements(partnerId, coupleId);
    
    const myUnlocked = myAchievements.filter(a => a.unlockedAt).length;
    const partnerUnlocked = partnerAchievements.filter(a => a.unlockedAt).length;
    const myPoints = myAchievements.filter(a => a.unlockedAt).reduce((sum, a) => sum + a.points, 0);
    const partnerPoints = partnerAchievements.filter(a => a.unlockedAt).reduce((sum, a) => sum + a.points, 0);
    
    res.json({
      success: true,
      data: {
        me: { unlocked: myUnlocked, points: myPoints },
        partner: { unlocked: partnerUnlocked, points: partnerPoints }
      }
    });
  } catch (error) {
    console.error('获取成就对比出错:', error);
    res.status(500).json({ success: false, message: '服务器出错了' });
  }
});

module.exports = router;
