// ============================================
// 系统接口路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const storageService = require('../services/storage');

const router = express.Router();

/**
 * @route   GET /api/storage/status
 * @desc    检查存储状态（调试用）
 * @access  Private
 */
router.get('/storage/status', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        mode: storageService.STORAGE_MODE,
        s3Available: storageService.s3Available,
        bucket: storageService.S3_BUCKET,
        endpoint: storageService.S3_CONFIG?.endpoint,
        region: storageService.S3_CONFIG?.region,
        hasAccessKey: !!process.env.S3_ACCESS_KEY,
        hasSecretKey: !!process.env.S3_SECRET_KEY
      }
    });
  } catch (error) {
    console.log('获取存储状态出错：', error);
    res.status(500).json({
      success: false,
      message: '服务器出错了'
    });
  }
});

module.exports = router;
