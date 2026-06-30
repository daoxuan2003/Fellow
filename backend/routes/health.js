// ============================================
// 健康档案路由
// ============================================

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { HealthRecord, MenstrualRecord, User } = require('../models');
const { getPushPayload } = require('../config/notifications');
const { formatDate: formatDateForZone, getTodayString } = require('../utils/helpers');
const { logError } = require('../utils/safeLogger');

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

const emptyMenstrualData = () => ({ current: null, history: [], prediction: null });

async function resolveMenstrualReadTarget(userId, user, requestedTargetUserId) {
  const selfId = String(userId);
  const partnerId = user.partnerId ? String(user.partnerId) : null;
  const requestedId = requestedTargetUserId ? String(requestedTargetUserId) : selfId;

  if (requestedId === selfId) {
    return user.gender === 'male'
      ? { empty: true }
      : { targetUserId: selfId };
  }

  if (!partnerId || requestedId !== partnerId) {
    return { error: { status: 403, message: '无权查看该月经记录' } };
  }

  const partner = await User.findById(partnerId).lean();
  if (!partner) {
    return { error: { status: 404, message: '伴侣不存在' } };
  }

  if (partner.gender !== 'female') {
    return { empty: true };
  }

  return { targetUserId: partnerId };
}

async function resolveMenstrualWriteTarget(userId, user, requestedTargetUserId) {
  const selfId = String(userId);
  const partnerId = user.partnerId ? String(user.partnerId) : null;
  const requestedId = requestedTargetUserId ? String(requestedTargetUserId) : selfId;

  if (requestedId === selfId) {
    if (user.gender === 'male') {
      return { error: { status: 403, message: '当前账号不能记录月经周期' } };
    }
    return { targetUserId: selfId };
  }

  if (!partnerId || requestedId !== partnerId) {
    return { error: { status: 403, message: '无权操作该月经记录' } };
  }

  const partner = await User.findById(partnerId).lean();
  if (!partner) {
    return { error: { status: 404, message: '伴侣不存在' } };
  }

  if (user.gender !== 'male' || partner.gender !== 'female') {
    return { error: { status: 403, message: '无权为伴侣记录月经周期' } };
  }

  return { targetUserId: partnerId };
}

// ============================================
// 月经周期预测算法
// ============================================

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_LENGTH = 28;
const DEFAULT_PERIOD_LENGTH = 5;
const MIN_VALID_CYCLE_DAYS = 15;
const MAX_VALID_CYCLE_DAYS = 60;
const MIN_TYPICAL_CYCLE_DAYS = 24;
const MAX_TYPICAL_CYCLE_DAYS = 38;
const MIN_TYPICAL_PERIOD_DAYS = 2;
const MAX_TYPICAL_PERIOD_DAYS = 8;

function toLocalDateStr(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) return `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const isUtcDateOnly = date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0;

  if (isUtcDateOnly) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return formatDateForZone(date);
}

function parseDateOnly(value) {
  const valueStr = toLocalDateStr(value);
  const match = valueStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function addCalendarDays(value, days) {
  const date = parseDateOnly(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

function utcDayNumber(value) {
  const date = parseDateOnly(value);
  if (!date) return null;
  return Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);
}

function diffCalendarDays(later, earlier) {
  const laterDay = utcDayNumber(later);
  const earlierDay = utcDayNumber(earlier);
  if (laterDay === null || earlierDay === null) return null;
  return laterDay - earlierDay;
}

function inclusiveCalendarDays(start, end) {
  const diff = diffCalendarDays(end, start);
  return diff === null ? null : diff + 1;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function weightedAverageRecentFirst(values) {
  if (!values.length) return 0;
  const weights = values.map((_, index) => values.length - index);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight;
}

function standardDeviation(values) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance = average(values.map(value => Math.pow(value - avg, 2)));
  return Math.sqrt(variance);
}

function normalizeMenstrualRecord(record) {
  const cycleStart = parseDateOnly(record.cycleStart);
  const cycleEnd = record.cycleEnd ? parseDateOnly(record.cycleEnd) : null;
  if (!cycleStart) return null;
  return {
    status: record.status,
    cycleStart,
    cycleEnd,
    flowRecords: Array.isArray(record.flowRecords) ? record.flowRecords : []
  };
}

function buildMenstrualInsights({
  cycleLengths,
  completedCount,
  avgCycle,
  avgPeriod,
  regularity,
  uncertaintyDays,
  daysUntil
}) {
  const insights = [];
  const recentMin = cycleLengths.length ? Math.min(...cycleLengths) : null;
  const recentMax = cycleLengths.length ? Math.max(...cycleLengths) : null;

  if (cycleLengths.length < 3) {
    insights.push({
      type: 'data_needed',
      severity: 'info',
      message: completedCount >= 2 ? '继续记录 1 个周期后预测会更稳' : '记录满 3 个周期后可建立个人规律'
    });
  }

  if (regularity === 'irregular') {
    insights.push({
      type: 'irregular_cycle',
      severity: 'warning',
      message: '近期周期波动较大，预测窗口已放宽'
    });
  }

  if (recentMin !== null && recentMin < MIN_TYPICAL_CYCLE_DAYS) {
    insights.push({
      type: 'short_cycle',
      severity: 'caution',
      message: `最近有短于 ${MIN_TYPICAL_CYCLE_DAYS} 天的周期`
    });
  }

  if (recentMax !== null && recentMax > MAX_TYPICAL_CYCLE_DAYS) {
    insights.push({
      type: 'long_cycle',
      severity: 'caution',
      message: `最近有长于 ${MAX_TYPICAL_CYCLE_DAYS} 天的周期`
    });
  }

  if (avgPeriod < MIN_TYPICAL_PERIOD_DAYS) {
    insights.push({
      type: 'short_period',
      severity: 'caution',
      message: `平均经期少于 ${MIN_TYPICAL_PERIOD_DAYS} 天`
    });
  } else if (avgPeriod > MAX_TYPICAL_PERIOD_DAYS) {
    insights.push({
      type: 'long_period',
      severity: 'caution',
      message: `平均经期超过 ${MAX_TYPICAL_PERIOD_DAYS} 天`
    });
  }

  if (daysUntil < -uncertaintyDays) {
    insights.push({
      type: 'overdue_window',
      severity: 'warning',
      message: '已超过本次预测窗口'
    });
  }

  if (cycleLengths.length >= 3 && regularity === 'very_regular') {
    insights.push({
      type: 'stable_cycle',
      severity: 'positive',
      message: `近期平均周期约 ${Math.round(avgCycle)} 天`
    });
  }

  return insights.slice(0, 5);
}

function calculateMenstrualPrediction(records) {
  if (!records || records.length === 0) return null;

  const normalizedRecords = records
    .map(normalizeMenstrualRecord)
    .filter(Boolean)
    .sort((a, b) => b.cycleStart - a.cycleStart);

  const ongoing = normalizedRecords.find(record => record.status === 'ongoing');
  const completed = normalizedRecords
    .filter(record => record.status === 'completed')
    .sort((a, b) => b.cycleStart - a.cycleStart);

  const referenceRecord = ongoing || completed[0];
  if (!referenceRecord) return null;

  const today = parseDateOnly(getTodayString());

  // 1. 计算周期长度（从一次开始日到下一次开始日），保留异常但可信的波动用于规律识别。
  const cycleLengths = [];
  for (let i = 0; i < completed.length - 1; i += 1) {
    const diff = diffCalendarDays(completed[i].cycleStart, completed[i + 1].cycleStart);
    if (diff !== null && diff >= MIN_VALID_CYCLE_DAYS && diff <= MAX_VALID_CYCLE_DAYS) {
      cycleLengths.push(diff);
    }
  }
  const recentCycleLengths = cycleLengths.slice(0, 6);

  // 2. 经期长度按开始日和结束日都计入，过滤明显由漏记导致的超长周期。
  const periodLengths = completed
    .map(record => record.cycleEnd ? inclusiveCalendarDays(record.cycleStart, record.cycleEnd) : null)
    .filter(length => length !== null && length >= 1 && length <= 12)
    .slice(0, 8);

  const avgCycle = recentCycleLengths.length > 0
    ? (recentCycleLengths.length >= 3
      ? (weightedAverageRecentFirst(recentCycleLengths) * 0.65 + median(recentCycleLengths) * 0.35)
      : weightedAverageRecentFirst(recentCycleLengths))
    : DEFAULT_CYCLE_LENGTH;
  const medianCycle = recentCycleLengths.length > 0 ? median(recentCycleLengths) : DEFAULT_CYCLE_LENGTH;
  const cycleStd = recentCycleLengths.length > 1 ? standardDeviation(recentCycleLengths) : 0;
  const avgPeriod = periodLengths.length > 0
    ? average(periodLengths)
    : DEFAULT_PERIOD_LENGTH;

  // 3. 规律性评分：同时看标准差、最大最小差和常见范围外的周期数量。
  const outOfTypicalCount = recentCycleLengths.filter(length =>
    length < MIN_TYPICAL_CYCLE_DAYS || length > MAX_TYPICAL_CYCLE_DAYS
  ).length;
  const cycleSpread = recentCycleLengths.length > 1
    ? Math.max(...recentCycleLengths) - Math.min(...recentCycleLengths)
    : 0;

  let regularity = 'unknown';
  let regularityScore = 0;
  let regularityLabel = '';
  if (recentCycleLengths.length >= 3) {
    if (cycleSpread > 20 || cycleStd >= 8 || outOfTypicalCount >= 2) {
      regularity = 'irregular';
      regularityScore = 40;
      regularityLabel = '不规律';
    } else if (cycleStd <= 2 && outOfTypicalCount === 0) {
      regularity = 'very_regular';
      regularityScore = 95;
      regularityLabel = '非常规律';
    } else if (cycleStd <= 4 && outOfTypicalCount <= 1) {
      regularity = 'regular';
      regularityScore = 82;
      regularityLabel = '规律';
    } else {
      regularity = 'somewhat_regular';
      regularityScore = 62;
      regularityLabel = '一般';
    }
  } else if (recentCycleLengths.length >= 1 || completed.length >= 1 || ongoing) {
    regularity = 'insufficient_data';
    regularityScore = 50;
    regularityLabel = '规律建立中';
  }

  // 4. 预测下次月经开始。进行中的周期按本次开始日向后推，避免仍用上个完成周期。
  const roundedAvgCycle = Math.round(avgCycle);
  const predictedStart = addCalendarDays(referenceRecord.cycleStart, roundedAvgCycle);
  if (!predictedStart || !today) return null;

  let uncertaintyDays = recentCycleLengths.length === 0
    ? 7
    : Math.ceil(Math.max(cycleStd * 1.25, 2));
  if (recentCycleLengths.length > 0 && recentCycleLengths.length < 3) {
    uncertaintyDays = Math.max(uncertaintyDays, 5);
  }
  if (regularity === 'irregular') {
    uncertaintyDays = Math.max(uncertaintyDays, 7);
  }
  uncertaintyDays = clamp(uncertaintyDays, 2, 12);

  const predictedStartMin = addCalendarDays(predictedStart, -uncertaintyDays);
  const predictedStartMax = addCalendarDays(predictedStart, uncertaintyDays);
  const daysUntil = diffCalendarDays(predictedStart, today);

  let confidence = 'low';
  if (recentCycleLengths.length >= 5 && ['very_regular', 'regular'].includes(regularity)) {
    confidence = 'high';
  } else if (recentCycleLengths.length >= 3 && regularity !== 'irregular') {
    confidence = 'medium';
  }

  // 5. 当前周期阶段。
  const daysSinceLast = diffCalendarDays(today, referenceRecord.cycleStart);
  const periodEndIndex = Math.max(1, Math.round(avgPeriod)) - 1;
  const ovulationDayIndex = Math.max(8, roundedAvgCycle - 14);
  const ovulationStartIndex = Math.max(periodEndIndex + 1, ovulationDayIndex - 2);
  const ovulationEndIndex = ovulationDayIndex + 1;
  let phase = 'unknown';
  let phaseDay = 0;

  if (ongoing) {
    phase = 'menstrual';
    phaseDay = Math.max(1, (diffCalendarDays(today, ongoing.cycleStart) || 0) + 1);
  } else if (daysSinceLast !== null) {
    if (daysSinceLast <= periodEndIndex) {
      phase = 'menstrual';
      phaseDay = daysSinceLast + 1;
    } else if (daysSinceLast < ovulationStartIndex) {
      phase = 'follicular';
      phaseDay = daysSinceLast - periodEndIndex;
    } else if (daysSinceLast <= ovulationEndIndex) {
      phase = 'ovulation';
      phaseDay = daysSinceLast - ovulationStartIndex + 1;
    } else {
      phase = 'luteal';
      phaseDay = daysSinceLast - ovulationEndIndex;
    }
  }

  // 6. 流量模式分析。
  const flowPatterns = {};
  completed.forEach(record => {
    record.flowRecords.forEach(flow => {
      if (!flow.flowLevel || !flow.date) return;
      const flowOffset = diffCalendarDays(flow.date, record.cycleStart);
      if (flowOffset === null) return;
      const dayNum = flowOffset + 1;
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

  let heaviestDay = null;
  let maxAvgLevel = 0;
  flowPattern.forEach(fp => {
    if (fp.avgLevel > maxAvgLevel) {
      maxAvgLevel = fp.avgLevel;
      heaviestDay = fp.day;
    }
  });

  // 7. 症状模式分析。
  const symptomPatterns = {};
  const symptomCycles = {};
  const symptomRegex = /症状[：:](.+)/;
  completed.forEach(record => {
    const seenInCycle = new Set();
    record.flowRecords.forEach(flow => {
      if (!flow.note) return;
      const match = flow.note.match(symptomRegex);
      if (!match) return;

      const symptoms = match[1].split(/[、,，]\s*/).filter(Boolean);
      const flowOffset = diffCalendarDays(flow.date, record.cycleStart);
      if (flowOffset === null) return;
      const dayNum = flowOffset + 1;

      symptoms.forEach(symptom => {
        const key = symptom.trim();
        if (!key) return;
        if (!symptomPatterns[key]) {
          symptomPatterns[key] = { count: 0, byDay: {} };
        }
        symptomPatterns[key].count += 1;
        if (!symptomPatterns[key].byDay[dayNum]) {
          symptomPatterns[key].byDay[dayNum] = 0;
        }
        symptomPatterns[key].byDay[dayNum] += 1;

        if (!seenInCycle.has(key)) {
          seenInCycle.add(key);
          if (!symptomCycles[key]) symptomCycles[key] = 0;
          symptomCycles[key] += 1;
        }
      });
    });
  });

  const symptomInsights = Object.entries(symptomPatterns)
    .map(([name, data]) => {
      const totalCycles = completed.length;
      const mostCommonDay = Object.entries(data.byDay)
        .sort((a, b) => b[1] - a[1])[0];
      const occurrenceRate = totalCycles > 0 ? Math.round((symptomCycles[name] || 0) / totalCycles * 100) : 0;
      let rateLabel = '';
      if (totalCycles <= 1) {
        rateLabel = '本次出现';
      } else if (occurrenceRate >= 80) {
        rateLabel = '常伴';
      } else if (occurrenceRate >= 50) {
        rateLabel = `${occurrenceRate}%周期出现`;
      } else {
        rateLabel = `偶发·${occurrenceRate}%`;
      }
      return {
        name,
        frequency: data.count,
        occurrenceRate,
        rateLabel,
        mostCommonDay: mostCommonDay ? parseInt(mostCommonDay[0]) : null
      };
    })
    .sort((a, b) => b.frequency - a.frequency);

  // 8. 预测排卵和易孕窗口。仅作为健康记录提示，不作为避孕或诊断依据。
  const ovulationDate = addCalendarDays(predictedStart, -14);
  const fertileStart = addCalendarDays(ovulationDate, -5);
  const fertileEnd = addCalendarDays(ovulationDate, 1);
  const ovulationDaysUntil = diffCalendarDays(ovulationDate, today);

  const insights = buildMenstrualInsights({
    cycleLengths: recentCycleLengths,
    completedCount: completed.length,
    avgCycle,
    avgPeriod,
    regularity,
    uncertaintyDays,
    daysUntil
  });

  return {
    nextPeriod: {
      predictedDate: toLocalDateStr(predictedStart),
      dateRange: {
        min: toLocalDateStr(predictedStartMin),
        max: toLocalDateStr(predictedStartMax)
      },
      confidence,
      confidenceLabel: { high: '高', medium: '中', low: '低' }[confidence],
      daysUntil,
      uncertaintyDays,
      basis: recentCycleLengths.length > 0
        ? `基于最近 ${recentCycleLengths.length} 个完整周期`
        : '基于默认 28 天周期'
    },
    cycle: {
      avgLength: roundedAvgCycle,
      medianLength: Math.round(medianCycle),
      minLength: recentCycleLengths.length ? Math.min(...recentCycleLengths) : null,
      maxLength: recentCycleLengths.length ? Math.max(...recentCycleLengths) : null,
      stdDeviation: round1(cycleStd),
      avgPeriodLength: round1(avgPeriod),
      regularity,
      regularityScore,
      regularityLabel,
      totalCycles: completed.length,
      measuredCycleCount: recentCycleLengths.length,
      typicalRange: { min: MIN_TYPICAL_CYCLE_DAYS, max: MAX_TYPICAL_CYCLE_DAYS },
      periodTypicalRange: { min: MIN_TYPICAL_PERIOD_DAYS, max: MAX_TYPICAL_PERIOD_DAYS }
    },
    currentPhase: {
      phase,
      phaseDay: Math.max(0, phaseDay),
      phaseName: {
        menstrual: '月经期',
        follicular: '卵泡期',
        ovulation: '排卵期',
        luteal: '黄体期',
        unknown: '未知'
      }[phase],
      daysUntilNext: Math.max(0, daysUntil)
    },
    flowPattern,
    heaviestDay,
    symptomInsights: symptomInsights.slice(0, 5),
    insights,
    disclaimer: '预测仅用于健康记录参考，不用于诊断、治疗或避孕决策。',
    ovulation: {
      predictedDate: toLocalDateStr(ovulationDate),
      fertileWindow: {
        start: toLocalDateStr(fertileStart),
        end: toLocalDateStr(fertileEnd)
      },
      daysUntil: ovulationDaysUntil
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
    logError('获取健康档案失败:', error);
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
    const targetUserId = userId;
    
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
    logError('新增健康记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 修改记录（只能修改自己的通用健康记录）
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
    if (String(record.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: '只能修改自己的健康记录' });
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
    logError('修改健康记录失败:', error);
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
    logError('获取健康趋势失败:', error);
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

    const target = await resolveMenstrualReadTarget(userId, user, req.query.targetUserId);
    if (target.error) {
      return res.status(target.error.status).json({ success: false, message: target.error.message });
    }
    if (target.empty) {
      return res.json({ success: true, data: emptyMenstrualData() });
    }
    const targetUserId = target.targetUserId;
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
    logError('获取月经记录失败:', error);
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
    const target = await resolveMenstrualWriteTarget(userId, user, req.body.targetUserId);
    if (target.error) {
      return res.status(target.error.status).json({ success: false, message: target.error.message });
    }
    const targetUserId = target.targetUserId;
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
    logError('开始月经记录失败:', error);
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
    const target = await resolveMenstrualWriteTarget(userId, user, req.body.targetUserId);
    if (target.error) {
      return res.status(target.error.status).json({ success: false, message: target.error.message });
    }
    const targetUserId = target.targetUserId;
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
    logError('结束月经记录失败:', error);
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
    const target = await resolveMenstrualWriteTarget(userId, user, req.body.targetUserId);
    if (target.error) {
      return res.status(target.error.status).json({ success: false, message: target.error.message });
    }
    const targetUserId = target.targetUserId;
    const coupleId = getCoupleId(userId, user.partnerId);
    const date = req.body.date || getTodayString();

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
    logError('流量打卡失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
