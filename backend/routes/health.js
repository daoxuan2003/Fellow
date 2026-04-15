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

// 新增记录（同一天自动覆盖）
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const payload = req.body;
    // 支持 targetUserId（如男生帮伴侣记录月经）
    const targetUserId = payload.targetUserId && payload.targetUserId === String(user.partnerId)
      ? payload.targetUserId
      : userId;
    
    // 检查是否已有同一天的记录
    const recordDate = payload.recordedAt ? new Date(payload.recordedAt) : new Date();
    const startOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
    const endOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate() + 1);
    
    const existingRecord = await HealthRecord.findOne({
      userId: targetUserId,
      coupleId,
      recordedAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    if (existingRecord) {
      // 更新已有记录
      const fields = ['height', 'weight', 'bodyFat', 'note'];
      fields.forEach(k => {
        if (payload[k] !== undefined) existingRecord[k] = payload[k];
      });
      if (payload.measurements) {
        const mKeys = ['chest', 'chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'];
        mKeys.forEach(k => {
          if (payload.measurements[k] !== undefined) existingRecord.measurements[k] = payload.measurements[k];
        });
      }
      if (payload.menstrual) {
        existingRecord.menstrual = {
          cycleStart: payload.menstrual.cycleStart || null,
          cycleEnd: payload.menstrual.cycleEnd || null,
          flowLevel: payload.menstrual.flowLevel ?? null,
          note: payload.menstrual.note || ''
        };
      }
      await existingRecord.save();
      return res.json({ success: true, data: existingRecord, updated: true });
    }
    
    // 新建记录
    const record = new HealthRecord({
      userId: targetUserId,
      coupleId,
      height: payload.height ?? null,
      weight: payload.weight ?? null,
      bodyFat: payload.bodyFat ?? null,
      measurements: {
        chest: payload.measurements?.chest ?? null,
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
      recordedAt: recordDate
    });
    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('新增健康记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改记录（情侣双方可互相修改）
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const payload = req.body;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const record = await HealthRecord.findOne({ _id: id, coupleId });
    if (!record) {
      return res.status(404).json({ success: false, message: '记录不存在' });
    }
    const fields = ['height', 'weight', 'bodyFat', 'note'];
    fields.forEach(k => {
      if (payload[k] !== undefined) record[k] = payload[k];
    });
    if (payload.measurements) {
      const mKeys = ['chest', 'chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'];
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

// 删除记录（情侣双方可互相删除）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }
    const coupleId = getCoupleId(userId, user.partnerId);
    const record = await HealthRecord.findOneAndDelete({ _id: id, coupleId });
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
      if (['chest', 'chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'].includes(metric)) {
        return r.measurements?.[metric] ?? null;
      }
      return r[metric] ?? null;
    };

    // 返回本地日期字符串 (YYYY-MM-DD)
    // 注意：前端会正确处理这个字符串
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
