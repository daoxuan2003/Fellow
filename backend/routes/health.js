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

// ============================================
// 月经周期预测算法
// ============================================

function toLocalDateStr(d) {
  if (!d) return '';
  const date = new Date(d);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateMenstrualPrediction(records) {
  if (!records || records.length === 0) return null;

  // 只使用已完成的周期，按开始日期倒序
  const completed = records
    .filter(r => r.status === 'completed' && r.cycleStart)
    .sort((a, b) => new Date(b.cycleStart) - new Date(a.cycleStart));

  if (completed.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. 计算周期长度（start to start）
  const cycleLengths = [];
  for (let i = 0; i < completed.length - 1; i++) {
    const curr = new Date(completed[i].cycleStart);
    const next = new Date(completed[i + 1].cycleStart);
    const diff = Math.round((curr - next) / 86400000);
    if (diff >= 21 && diff <= 40) {
      cycleLengths.push(diff);
    }
  }

  // 2. 计算经期长度（不包含结束日本身）
  const periodLengths = completed
    .filter(r => r.cycleEnd)
    .map(r => {
      const s = new Date(r.cycleStart);
      const e = new Date(r.cycleEnd);
      return Math.max(1, Math.round((e - s) / 86400000));
    })
    .filter(len => len >= 1 && len <= 10);

  // 3. 加权平均周期（近期周期权重更高）
  let avgCycle = 28;
  let cycleStd = 2;
  if (cycleLengths.length > 0) {
    const weights = cycleLengths.map((_, i) => Math.max(1, cycleLengths.length - i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    avgCycle = cycleLengths.reduce((sum, len, i) => sum + len * weights[i], 0) / totalWeight;

    // 标准差
    const variance = cycleLengths.reduce((sum, len) => sum + Math.pow(len - avgCycle, 2), 0) / cycleLengths.length;
    cycleStd = Math.sqrt(variance);
  }

  // 4. 平均经期长度
  const avgPeriod = periodLengths.length > 0
    ? periodLengths.reduce((a, b) => a + b, 0) / periodLengths.length
    : 5;

  // 5. 预测下次月经开始
  const lastStart = new Date(completed[0].cycleStart);
  lastStart.setHours(0, 0, 0, 0);

  const predictedStart = new Date(lastStart);
  predictedStart.setDate(predictedStart.getDate() + Math.round(avgCycle));

  const rangeDays = Math.max(1, Math.round(cycleStd));
  const predictedStartMin = new Date(predictedStart);
  predictedStartMin.setDate(predictedStartMin.getDate() - rangeDays);
  const predictedStartMax = new Date(predictedStart);
  predictedStartMax.setDate(predictedStartMax.getDate() + rangeDays);

  // 6. 当前周期阶段
  let phase = 'unknown';
  let phaseDay = 0;
  const ongoing = records.find(r => r.status === 'ongoing');

  if (ongoing) {
    phase = 'menstrual';
    phaseDay = Math.round((today - lastStart) / 86400000) + 1;
  } else {
    const daysSinceLast = Math.round((today - lastStart) / 86400000);
    const ovulationDay = Math.round(avgCycle) - 14;

    if (daysSinceLast <= avgPeriod) {
      phase = 'menstrual';
      phaseDay = daysSinceLast + 1;
    } else if (daysSinceLast < ovulationDay - 3) {
      phase = 'follicular';
      phaseDay = daysSinceLast - Math.round(avgPeriod) + 1;
    } else if (daysSinceLast <= ovulationDay + 2) {
      phase = 'ovulation';
      phaseDay = daysSinceLast - ovulationDay + 14;
    } else {
      phase = 'luteal';
      phaseDay = daysSinceLast - ovulationDay - 2;
    }
  }

  // 7. 流量模式分析
  const flowPatterns = {};
  completed.forEach(record => {
    if (!record.flowRecords) return;
    record.flowRecords.forEach(flow => {
      if (!flow.flowLevel || !flow.date) return;
      const flowDate = new Date(flow.date);
      const startDate = new Date(record.cycleStart);
      const dayNum = Math.round((flowDate - startDate) / 86400000) + 1;
      if (dayNum < 1 || dayNum > 10) return;
      if (!flowPatterns[dayNum]) {
        flowPatterns[dayNum] = { total: 0, count: 0 };
      }
      flowPatterns[dayNum].total += flow.flowLevel;
      flowPatterns[dayNum].count += 1;
    });
  });

  const flowPattern = Object.entries(flowPatterns)
    .map(([day, data]) => ({
      day: parseInt(day),
      avgLevel: data.count > 0 ? +(data.total / data.count).toFixed(1) : 0,
      frequency: data.count
    }))
    .sort((a, b) => a.day - b.day);

  // 找出流量最高的一天
  let heaviestDay = null;
  let maxAvgLevel = 0;
  flowPattern.forEach(fp => {
    if (fp.avgLevel > maxAvgLevel) {
      maxAvgLevel = fp.avgLevel;
      heaviestDay = fp.day;
    }
  });

  // 8. 症状模式分析
  const symptomPatterns = {};
  const symptomRegex = /症状[：:](.+)/;
  completed.forEach(record => {
    if (!record.flowRecords) return;
    record.flowRecords.forEach(flow => {
      if (!flow.note) return;
      const match = flow.note.match(symptomRegex);
      if (match) {
        const symptoms = match[1].split(/[、,，]\s*/).filter(Boolean);
        const flowDate = new Date(flow.date);
        const startDate = new Date(record.cycleStart);
        const dayNum = Math.round((flowDate - startDate) / 86400000) + 1;

        symptoms.forEach(symptom => {
          const key = symptom.trim();
          if (!key) return;
          if (!symptomPatterns[key]) {
            symptomPatterns[key] = { count: 0, byDay: {} };
          }
          symptomPatterns[key].count++;
          if (!symptomPatterns[key].byDay[dayNum]) {
            symptomPatterns[key].byDay[dayNum] = 0;
          }
          symptomPatterns[key].byDay[dayNum]++;
        });
      }
    });
  });

  const symptomInsights = Object.entries(symptomPatterns)
    .map(([name, data]) => {
      const totalCycles = completed.length;
      const mostCommonDay = Object.entries(data.byDay)
        .sort((a, b) => b[1] - a[1])[0];
      return {
        name,
        frequency: data.count,
        occurrenceRate: totalCycles > 0 ? Math.round((data.count / totalCycles) * 100) : 0,
        mostCommonDay: mostCommonDay ? parseInt(mostCommonDay[0]) : null
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  // 9. 规律性评分
  let regularity = 'unknown';
  let regularityScore = 0;
  let regularityLabel = '未知';
  if (cycleLengths.length >= 3) {
    const cv = avgCycle > 0 ? cycleStd / avgCycle : 0;
    if (cv < 0.05) {
      regularity = 'very_regular'; regularityScore = 95; regularityLabel = '非常规律';
    } else if (cv < 0.10) {
      regularity = 'regular'; regularityScore = 80; regularityLabel = '规律';
    } else if (cv < 0.15) {
      regularity = 'somewhat_regular'; regularityScore = 60; regularityLabel = '一般';
    } else {
      regularity = 'irregular'; regularityScore = 40; regularityLabel = '不规律';
    }
  } else if (cycleLengths.length >= 1) {
    regularity = 'insufficient_data';
    regularityScore = 50;
    regularityLabel = '数据不足';
  }

  // 10. 预测排卵和易孕期
  const ovulationDate = new Date(predictedStart);
  ovulationDate.setDate(ovulationDate.getDate() - 14);

  const fertileStart = new Date(ovulationDate);
  fertileStart.setDate(fertileStart.getDate() - 3);
  const fertileEnd = new Date(ovulationDate);
  fertileEnd.setDate(fertileEnd.getDate() + 2);

  return {
    nextPeriod: {
      predictedDate: toLocalDateStr(predictedStart),
      dateRange: {
        min: toLocalDateStr(predictedStartMin),
        max: toLocalDateStr(predictedStartMax)
      },
      confidence: cycleLengths.length >= 3 ? 'medium' : 'low',
      daysUntil: Math.round((predictedStart - today) / 86400000)
    },
    cycle: {
      avgLength: Math.round(avgCycle),
      stdDeviation: Math.round(cycleStd * 10) / 10,
      avgPeriodLength: Math.round(avgPeriod * 10) / 10,
      regularity,
      regularityScore,
      regularityLabel,
      totalCycles: completed.length
    },
    currentPhase: {
      phase,
      phaseDay,
      phaseName: {
        menstrual: '月经期',
        follicular: '卵泡期',
        ovulation: '排卵期',
        luteal: '黄体期',
        unknown: '未知'
      }[phase],
      daysUntilNext: Math.max(0, Math.round((predictedStart - today) / 86400000))
    },
    flowPattern,
    heaviestDay,
    symptomInsights: symptomInsights.slice(0, 5),
    ovulation: {
      predictedDate: toLocalDateStr(ovulationDate),
      fertileWindow: {
        start: toLocalDateStr(fertileStart),
        end: toLocalDateStr(fertileEnd)
      },
      daysUntil: Math.round((ovulationDate - today) / 86400000)
    }
  };
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

    // 合并所有记录用于预测计算
    const allRecords = [];
    if (current) allRecords.push(current);
    if (history && history.length > 0) allRecords.push(...history);
    const prediction = calculateMenstrualPrediction(allRecords);

    res.json({
      success: true,
      data: {
        current: current || null,
        history: history || [],
        prediction
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
