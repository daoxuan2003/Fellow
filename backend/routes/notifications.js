// ============================================
// 推送通知路由
// ============================================

const express = require('express');
const webpush = require('web-push');
const { authMiddleware } = require('../middleware');
const { User } = require('../models');
const { getPushPayload } = require('../config/notifications');
const { logDebug, logError } = require('../utils/safeLogger');

const router = express.Router();

// VAPID 配置
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

function blockProductionTestPush(req, res, next) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      message: '接口不存在'
    });
  }

  return next();
}

// 注意：/vapid-public-key 路由已在 routes/index.js 中定义
// 不要在当前文件重复添加，因为当前文件被挂载到 /notifications 路径下

/**
 * @route   POST /api/notifications/subscribe
 * @desc    订阅 Push 通知
 * @access  Private
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: '订阅信息不完整'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 检查是否已存在相同的订阅
    const exists = user.pushSubscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (!exists) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        createdAt: new Date()
      });
      
      await user.save();
      logDebug('[Notification] Push 订阅已保存', { userId });
    }
    
    res.json({
      success: true,
      message: '订阅成功'
    });
  } catch (error) {
    logError('订阅 Push 出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/notifications/unsubscribe
 * @desc    取消订阅 Push 通知
 * @access  Private
 */
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { endpoint } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    // 删除匹配的订阅
    user.pushSubscriptions = user.pushSubscriptions.filter(
      sub => sub.endpoint !== endpoint
    );
    
    await user.save();
    logDebug('[Notification] Push 订阅已取消', { userId });
    
    res.json({
      success: true,
      message: '取消订阅成功'
    });
  } catch (error) {
    logError('取消订阅 Push 出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

/**
 * @route   POST /api/notifications/test
 * @desc    测试推送（仅开发使用）
 * @access  Private
 */
router.post('/test', blockProductionTestPush, authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    
    if (!VAPID_PRIVATE_KEY) {
      return res.status(500).json({
        success: false,
        message: '服务器未配置 VAPID 私钥'
      });
    }
    
    const user = await User.findById(userId);
    if (!user || !user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return res.status(400).json({
        success: false,
        message: '您还没有订阅推送通知'
      });
    }
    
    const pushPayload = JSON.stringify(getPushPayload('test'));
    
    // 向所有订阅的设备发送测试推送
    const sendTasks = user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.keys.p256dh,
            auth: sub.keys.auth
          }
        }, pushPayload);
      } catch (err) {
        logError('推送发送失败:', err);
      }
    });
    
    await Promise.all(sendTasks);
    
    res.json({
      success: true,
      message: '测试推送已发送'
    });
  } catch (error) {
    logError('测试推送失败:', error);
    res.status(500).json({
      success: false,
      message: '发送失败，请稍后再试'
    });
  }
});

module.exports = router;
