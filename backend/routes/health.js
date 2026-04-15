// ============================================
// 健康档案路由
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { HealthRecord, User } = require('../models');

// 生成 coupleId
const getCoupleId = (a, b) => [a, b].sort().join('_');

// 获取双方健康记录
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { mine: [], partner: [] } });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const records = await HealthRecord.find({ coupleId })
      .sort({ recordedAt: -1 })
      .lean();
    const mine = records.filter(r => r.userId === String(userId));
    const partner = records.filter(r => r.userId === String(user.partnerId));
    res.json({ success: true, data: { mine, partner } });
  } catch (error) {
    console.error('获取健康档案失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 新增记录
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const payload = req.body;
    const record = new HealthRecord({
      userId,
      coupleId,
      height: payload.height ?? null,
      weight: payload.weight ?? null,
      bodyFat: payload.bodyFat ?? null,
      measurements: {
        chestUpper: payload.measurements?.chestUpper ?? null,
        chestLower: payload.measurements?.chestLower ?? null,
        waist: payload.measurements?.waist ?? null,
        hip: payload.measurements?.hip ?? null,
        arm: payload.measurements?.arm ?? null,
        thigh: payload.measurements?.thigh ?? null,
        calf: payload.measurements?.calf ?? null,
        shoulder: payload.measurements?.shoulder ?? null
      },
      menstrual: payload.menstrual ? {
        cycleStart: payload.menstrual.cycleStart || null,
        cycleEnd: payload.menstrual.cycleEnd || null,
        flowLevel: payload.menstrual.flowLevel ?? null,
        note: payload.menstrual.note || ''
      } : undefined,
      note: payload.note || '',
      recordedAt: payload.recordedAt ? new Date(payload.recordedAt) : new Date()
    });
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('新增健康记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改记录
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const payload = req.body;
    const record = await HealthRecord.findOne({ _id: id, userId });
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const fields = ['height', 'weight', 'bodyFat', 'note'];
    fields.forEach(k => {
      if (payload[k] !== undefined) record[k] = payload[k];
    });
    if (payload.measurements) {
      const mKeys = ['chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'];
      mKeys.forEach(k => {
        if (payload.measurements[k] !== undefined) record.measurements[k] = payload.measurements[k];
      });
    }
    if (payload.menstrual) {
      record.menstrual = {
        cycleStart: payload.menstrual.cycleStart || null,
        cycleEnd: payload.menstrual.cycleEnd || null,
        flowLevel: payload.menstrual.flowLevel ?? null,
        note: payload.menstrual.note || ''
      };
    }
    if (payload.recordedAt) {
      record.recordedAt = new Date(payload.recordedAt);
    }
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('修改健康记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除记录
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const record = await HealthRecord.findOneAndDelete({ _id: id, userId });
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除健康记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 趋势数据
router.get('/trends', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { mine: [], partner: [] } });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const metric = req.query.metric || 'weight';
    const days = Math.min(parseInt(req.query.days || '30', 10), 365);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await HealthRecord.find({ coupleId, recordedAt: { $gte: since } })
      .sort({ recordedAt: 1 })
      .lean();

    const getValue = (r) => {
      if (['chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'].includes(metric)) {
        return r.measurements?.[metric] ?? null;
      }
      return r[metric] ?? null;
    };

    const toDateStr = (d) => {
      const date = new Date(d);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const mine = [];
    const partner = [];
    records.forEach(r => {
      const v = getValue(r);
      if (v === null) return;
      const item = { date: toDateStr(r.recordedAt), value: v };
      if (r.userId === String(userId)) mine.push(item);
      else partner.push(item);
    });

    res.json({ success: true, data: { metric, mine, partner } });
  } catch (error) {
    console.error('获取健康趋势失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
