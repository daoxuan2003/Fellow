// ============================================
// 健康档案路由
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { HealthRecord, MenstrualRecord, User } = require('../models');
const { getPushPayload } = require('../config/notifications');

// 生成 coupleId
const getCoupleId = (a, b) => [a, b].sort().join('_');

function emitHealthSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'healthSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

function emitMenstrualSync(app, coupleId, options) {
  const broadcastToCouple = app.locals.broadcastToCouple;
  if (!broadcastToCouple || !coupleId) return;
  const { action, payload, actor, requestId } = options;
  broadcastToCouple(coupleId, {
    type: 'menstrualSync',
    data: { action, payload, actor, requestId: requestId || null, timestamp: Date.now() }
  });
}

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
      
      // 通知情侣双方
      const sendNotification = req.app.locals.sendNotification;
      emitHealthSync(req.app, coupleId, { action: 'update', payload: { recordId: existingRecord._id, userId: targetUserId, height: existingRecord.height, weight: existingRecord.weight, bodyFat: existingRecord.bodyFat, note: existingRecord.note, measurements: existingRecord.measurements, menstrual: existingRecord.menstrual, recordedAt: existingRecord.recordedAt }, actor: userId, requestId: req.body.requestId });
      
      // 推送通知给伴侣
      if (sendNotification && user.partnerId && targetUserId !== String(user.partnerId)) {
        const notifyUser = await User.findById(targetUserId).lean();
        const payloadPush = getPushPayload('healthRecordUpdated', {
          nickname: notifyUser?.nickname || 'TA'
        }, { url: '/health' });
        sendNotification(user.partnerId, payloadPush);
      }
      
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
    
    // 通知情侣双方
    const sendNotification = req.app.locals.sendNotification;
    emitHealthSync(req.app, coupleId, { action: 'create', payload: { recordId: record._id, userId: targetUserId, height: record.height, weight: record.weight, bodyFat: record.bodyFat, note: record.note, measurements: record.measurements, menstrual: record.menstrual, recordedAt: record.recordedAt }, actor: userId, requestId: req.body.requestId });
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId && targetUserId !== String(user.partnerId)) {
      const notifyUser = await User.findById(targetUserId).lean();
      const payloadPush = getPushPayload('healthRecordCreated', {
        nickname: notifyUser?.nickname || 'TA'
      }, { url: '/health' });
      sendNotification(user.partnerId, payloadPush);
    }
    
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
    
    // 通知情侣双方
    const sendNotification = req.app.locals.sendNotification;
    emitHealthSync(req.app, coupleId, { action: 'update', payload: { recordId: record._id, userId: record.userId, height: record.height, weight: record.weight, bodyFat: record.bodyFat, note: record.note, measurements: record.measurements, menstrual: record.menstrual, recordedAt: record.recordedAt }, actor: userId, requestId: req.body.requestId });
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId && String(record.userId) !== String(user.partnerId)) {
      const notifyUser = await User.findById(record.userId).lean();
      const payloadPush = getPushPayload('healthRecordUpdated', {
        nickname: notifyUser?.nickname || 'TA'
      }, { url: '/health' });
      sendNotification(user.partnerId, payloadPush);
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('修改健康记录失败:', error);
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

// ============================================
// 月经打卡独立 API
// ============================================

// 获取月经记录（当前周期 + 历史）
router.get('/menstrual', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.json({ success: true, data: { current: null, history: [] } });
    }

    const targetUserId = req.query.targetUserId === String(user.partnerId)
      ? req.query.targetUserId
      : userId;
    const coupleId = getCoupleId(userId, user.partnerId);

    // 获取当前进行中的周期
    const current = await MenstrualRecord.findOne({
      userId: targetUserId,
      coupleId,
      status: 'ongoing'
    }).sort({ createdAt: -1 });

    // 获取历史周期（最近 12 条）
    const history = await MenstrualRecord.find({
      userId: targetUserId,
      coupleId,
      status: 'completed'
    }).sort({ cycleStart: -1 }).limit(12);

    res.json({
      success: true,
      data: {
        current: current || null,
        history: history || []
      }
    });
  } catch (error) {
    console.error('获取月经记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 开始月经（新建周期）
router.post('/menstrual/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }

    const { cycleStart } = req.body;
    const targetUserId = req.body.targetUserId === String(user.partnerId)
      ? req.body.targetUserId
      : userId;
    const coupleId = getCoupleId(userId, user.partnerId);
    const startDate = cycleStart ? new Date(cycleStart) : new Date();

    // 如果当前有进行中的周期，先自动结束它
    const ongoing = await MenstrualRecord.findOne({
      userId: targetUserId,
      coupleId,
      status: 'ongoing'
    });
    if (ongoing) {
      ongoing.status = 'completed';
      ongoing.cycleEnd = new Date(startDate.getTime() - 24 * 60 * 60 * 1000); // 新周期开始前一天
      await ongoing.save();
    }

    // 创建新周期
    const record = new MenstrualRecord({
      userId: targetUserId,
      coupleId,
      cycleStart: startDate,
      cycleEnd: null,
      flowRecords: [],
      status: 'ongoing'
    });
    await record.save();

    // 实时同步
    emitMenstrualSync(req.app, coupleId, {
      action: 'start',
      payload: { recordId: record._id, userId: targetUserId, cycleStart: record.cycleStart },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({ success: true, message: '月经开始记录成功', data: record });
  } catch (error) {
    console.error('开始月经记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 结束月经
router.put('/menstrual/end', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }

    const { cycleEnd } = req.body;
    const targetUserId = req.body.targetUserId === String(user.partnerId)
      ? req.body.targetUserId
      : userId;
    const coupleId = getCoupleId(userId, user.partnerId);

    const record = await MenstrualRecord.findOne({
      userId: targetUserId,
      coupleId,
      status: 'ongoing'
    }).sort({ createdAt: -1 });

    if (!record) {
      return res.status(404).json({ success: false, message: '没有找到进行中的月经周期' });
    }

    record.cycleEnd = cycleEnd ? new Date(cycleEnd) : new Date();
    record.status = 'completed';
    await record.save();

    // 实时同步
    emitMenstrualSync(req.app, coupleId, {
      action: 'end',
      payload: { recordId: record._id, userId: targetUserId, cycleEnd: record.cycleEnd },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({ success: true, message: '月经结束记录成功', data: record });
  } catch (error) {
    console.error('结束月经记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 每日流量打卡
router.post('/menstrual/flow', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).lean();
    if (!user || !user.partnerId) {
      return res.status(400).json({ success: false, message: '未绑定伴侣' });
    }

    const { flowLevel, note } = req.body;
    const targetUserId = req.body.targetUserId === String(user.partnerId)
      ? req.body.targetUserId
      : userId;
    const coupleId = getCoupleId(userId, user.partnerId);
    const date = req.body.date || new Date().toISOString().split('T')[0];

    if (!flowLevel || flowLevel < 1 || flowLevel > 5) {
      return res.status(400).json({ success: false, message: '请选择流量等级（1-5）' });
    }

    // 查找进行中的周期
    let record = await MenstrualRecord.findOne({
      userId: targetUserId,
      coupleId,
      status: 'ongoing'
    }).sort({ createdAt: -1 });

    // 如果没有进行中的周期，自动开始一个新周期（今天）
    if (!record) {
      record = new MenstrualRecord({
        userId: targetUserId,
        coupleId,
        cycleStart: new Date(),
        cycleEnd: null,
        flowRecords: [],
        status: 'ongoing'
      });
    }

    // 查找当天是否已有流量记录
    const existingIndex = record.flowRecords.findIndex(f => f.date === date);
    if (existingIndex >= 0) {
      // 更新
      record.flowRecords[existingIndex].flowLevel = flowLevel;
      record.flowRecords[existingIndex].note = note || '';
    } else {
      // 新增
      record.flowRecords.push({ date, flowLevel, note: note || '' });
      record.flowRecords.sort((a, b) => a.date.localeCompare(b.date));
    }

    await record.save();

    // 实时同步
    emitMenstrualSync(req.app, coupleId, {
      action: 'flow',
      payload: {
        recordId: record._id,
        userId: targetUserId,
        date,
        flowLevel,
        flowRecords: record.flowRecords
      },
      actor: userId,
      requestId: req.body.requestId
    });

    res.json({
      success: true,
      message: existingIndex >= 0 ? '流量记录已更新' : '流量打卡成功',
      data: record
    });
  } catch (error) {
    console.error('流量打卡失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
