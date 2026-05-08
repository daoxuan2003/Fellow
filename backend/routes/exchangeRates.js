// ============================================
// 汇率路由
// ============================================

const express = require('express');
const { authMiddleware } = require('../middleware');
const { fetchLatestRates } = require('../services/exchangeRate');

const router = express.Router();

router.get('/latest', authMiddleware, async (req, res) => {
  try {
    const base = (req.query.base || 'CNY').toUpperCase();
    const data = await fetchLatestRates(base);
    res.json({ success: true, data });
  } catch (e) {
    console.error('[ExchangeRate] 获取失败:', e);
    res.status(500).json({ success: false, message: e.message || '获取汇率失败' });
  }
});

module.exports = router;
