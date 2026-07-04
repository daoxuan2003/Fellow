// ============================================
// 系统接口路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const storageService = require('../services/storage');
const { logError } = require('../utils/safeLogger');

const router = express.Router();

/**
 * @route   GET /api/storage/status
 * @desc    检查存储健康状态
 * @access  Private
 */
router.get('/storage/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: storageService.getPublicStatus()
    });
  } catch (error) {
    logError('获取存储状态出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
