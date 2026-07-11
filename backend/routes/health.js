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

const MEASUREMENT_KEYS = ['chest', 'chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder'];
const HEALTH_FIELD_LIMITS = {
  height: { label: '身高', min: 30, max: 260 },
  weight: { label: '体重', min: 2, max: 500 },
  bodyFat: { label: '体脂率', min: 0, max: 80 },
  chest: { label: '胸围', min: 10, max: 260 },
  chestUpper: { label: '上胸围', min: 10, max: 260 },
  chestLower: { label: '下胸围', min: 10, max: 260 },
  waist: { label: '腰围', min: 10, max: 260 },
  hip: { label: '臀围', min: 10, max: 260 },
  arm: { label: '臂围', min: 5, max: 120 },
  thigh: { label: '大腿围', min: 10, max: 160 },
  calf: { label: '小腿围', min: 5, max: 120 },
  shoulder: { label: '肩宽', min: 10, max: 160 }
};
const BASIC_HEALTH_KEYS = ['height', 'weight', 'bodyFat'];
const TREND_METRICS = new Set([...BASIC_HEALTH_KEYS, ...MEASUREMENT_KEYS]);

function hasOwnValue(source, key) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

function normalizeHealthNumber(value, limit) {
  if (value === undefined) {
    return { present: false };
  }

  if (value === null || (typeof value === 'string' && value.trim() === '')) {
    return { present: true, value: null };
  }

  const number = Number(value);
  if (!Number.isFinite(number)) {
    return { error: `${limit.label}格式不正确` };
  }
  if (number < limit.min || number > limit.max) {
    return { error: `${limit.label}超出合理范围` };
  }

  return { present: true, value: round1(number) };
}

function normalizeHealthPayload(rawPayload) {
  const payload = rawPayload && typeof rawPayload === 'object' && !Array.isArray(rawPayload)
    ? rawPayload
    : {};
  const dateResult = parseDateOnlyField(payload.recordedAt, '记录日期');
  if (dateResult.error) return { error: dateResult.error };
  const futureError = futureDateError(dateResult.date, '记录日期');
  if (futureError) return { error: futureError };

  const normalized = {
    recordedAt: dateResult.date,
    recordedAtPresent: hasOwnValue(payload, 'recordedAt') && payload.recordedAt !== undefined && payload.recordedAt !== null && payload.recordedAt !== '',
    values: {},
    measurements: {},
    presentFields: new Set(),
    presentMeasurements: new Set(),
    notePresent: hasOwnValue(payload, 'note'),
    note: hasOwnValue(payload, 'note') ? String(payload.note || '').trim().slice(0, 300) : undefined
  };

  for (const key of BASIC_HEALTH_KEYS) {
    const result = normalizeHealthNumber(payload[key], HEALTH_FIELD_LIMITS[key]);
    if (result.error) return { error: result.error };
    if (result.present) {
      normalized.presentFields.add(key);
      normalized.values[key] = result.value;
    }
  }

  if (payload.measurements !== undefined && payload.measurements !== null) {
    if (typeof payload.measurements !== 'object' || Array.isArray(payload.measurements)) {
      return { error: '围度数据格式不正确' };
    }
    for (const key of MEASUREMENT_KEYS) {
      const result = normalizeHealthNumber(payload.measurements[key], HEALTH_FIELD_LIMITS[key]);
      if (result.error) return { error: result.error };
      if (result.present) {
        normalized.presentMeasurements.add(key);
        normalized.measurements[key] = result.value;
      }
    }
  }

  return normalized;
}

function buildMeasurements(normalized) {
  return MEASUREMENT_KEYS.reduce((result, key) => {
    result[key] = normalized.measurements[key] ?? null;
    return result;
  }, {});
}

function applyHealthPayload(record, normalized, options = {}) {
  for (const key of BASIC_HEALTH_KEYS) {
    if (normalized.presentFields.has(key)) {
      record[key] = normalized.values[key];
    }
  }
  if (normalized.notePresent) {
    record.note = normalized.note;
  }
  if (normalized.presentMeasurements.size > 0) {
    if (!record.measurements) record.measurements = {};
    for (const key of MEASUREMENT_KEYS) {
      if (normalized.presentMeasurements.has(key)) {
        record.measurements[key] = normalized.measurements[key];
      }
    }
  }
  if (options.allowRecordedAt && normalized.recordedAtPresent) {
    record.recordedAt = normalized.recordedAt;
  }
}

function buildHealthSyncPayload(record) {
  return {
    recordId: record._id,
    userId: record.userId,
    height: record.height,
    weight: record.weight,
    bodyFat: record.bodyFat,
    note: record.note,
    measurements: record.measurements,
    menstrual: record.menstrual,
    recordedAt: toLocalDateStr(record.recordedAt)
  };
}

function serializeHealthRecord(record) {
  const source = record && typeof record.toObject === 'function' ? record.toObject() : record;
  if (!source || typeof source !== 'object') return source;
  return {
    ...source,
    userId: String(source.userId),
    coupleId: String(source.coupleId),
    recordedAt: toLocalDateStr(source.recordedAt)
  };
}

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
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function addCalendarDays(value, days) {
  const date = parseDateOnly(value);
  if (!date) return null;
  date.setDate(date.getDate() + days);
  return date;
}

function parseDateOnlyField(value, label, fallbackValue = getTodayString()) {
  const source = value === undefined || value === null || value === '' ? fallbackValue : value;
  const date = parseDateOnly(source);
  if (!date) {
    return { error: `${label}格式不正确，请使用 YYYY-MM-DD` };
  }
  return { date, dateString: toLocalDateStr(date) };
}

function futureDateError(date, label) {
  const diffFromToday = diffCalendarDays(date, getTodayString());
  if (diffFromToday !== null && diffFromToday > 0) {
    return `${label}不能晚于今天`;
  }
  return '';
}

function hasFlowRecordOnOrAfter(record, date) {
  return (record.flowRecords || []).some(flow => {
    const diff = diffCalendarDays(flow.date, date);
    return diff !== null && diff >= 0;
  });
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

function weightedAverageRecentFirst(values, weightMultipliers = []) {
  if (!values.length) return 0;
  const weights = values.map((_, index) => {
    const multiplier = Number(weightMultipliers[index]);
    return (values.length - index) * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
  });
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) return average(values);
  return values.reduce((sum, value, index) => sum + value * weights[index], 0) / totalWeight;
}

function standardDeviation(values) {
  if (values.length <= 1) return 0;
  const avg = average(values);
  const variance = average(values.map(value => Math.pow(value - avg, 2)));
  return Math.sqrt(variance);
}

function buildCycleLengthProfile(cycleLengths) {
  const validLengths = cycleLengths.filter(length =>
    Number.isFinite(length) && length >= MIN_VALID_CYCLE_DAYS && length <= MAX_VALID_CYCLE_DAYS
  );
  const typicalLengths = validLengths.filter(length =>
    length >= MIN_TYPICAL_CYCLE_DAYS && length <= MAX_TYPICAL_CYCLE_DAYS
  );
  const baselineLength = typicalLengths.length >= 2
    ? median(typicalLengths)
    : (validLengths.length ? median(validLengths) : DEFAULT_CYCLE_LENGTH);

  const observations = cycleLengths.map((length, index) => {
    const isTypical = length >= MIN_TYPICAL_CYCLE_DAYS && length <= MAX_TYPICAL_CYCLE_DAYS;
    const observation = {
      index,
      length,
      adjustedLength: length,
      predictionWeight: 1,
      anomalyType: null,
      anomalyLabel: '',
      missedCycleCount: 0,
      isTypical
    };

    if (length < MIN_TYPICAL_CYCLE_DAYS) {
      observation.anomalyType = 'short_cycle';
      observation.anomalyLabel = '偏短周期';
      observation.predictionWeight = 0.5;
      return observation;
    }

    if (length <= MAX_TYPICAL_CYCLE_DAYS) {
      return observation;
    }

    const segmentCount = baselineLength > 0 ? Math.round(length / baselineLength) : 1;
    const adjustedLength = segmentCount >= 2 ? length / segmentCount : length;
    const looksLikeMissingCycle = segmentCount >= 2 &&
      adjustedLength >= MIN_TYPICAL_CYCLE_DAYS &&
      adjustedLength <= MAX_TYPICAL_CYCLE_DAYS &&
      Math.abs(adjustedLength - baselineLength) <= Math.max(4, baselineLength * 0.18);

    if (looksLikeMissingCycle) {
      observation.adjustedLength = round1(adjustedLength);
      observation.predictionWeight = 0.55;
      observation.anomalyType = 'possible_missing_cycle';
      observation.anomalyLabel = '疑似漏记周期';
      observation.missedCycleCount = Math.max(1, segmentCount - 1);
      return observation;
    }

    observation.anomalyType = 'long_cycle';
    observation.anomalyLabel = '偏长周期';
    observation.predictionWeight = 0.45;
    return observation;
  });

  const adjustedCycleLengths = observations.map(item => item.adjustedLength);
  const predictionWeights = observations.map(item => item.predictionWeight);
  const anomalies = observations.filter(item => item.anomalyType);
  const possibleMissingCycleCount = anomalies.filter(item => item.anomalyType === 'possible_missing_cycle').length;
  const hardAnomalyCount = anomalies.length - possibleMissingCycleCount;

  return {
    baselineLength,
    observations,
    adjustedCycleLengths,
    predictionWeights,
    anomalySummary: {
      anomalyCount: anomalies.length,
      possibleMissingCycleCount,
      hardAnomalyCount,
      missedCycleCount: anomalies.reduce((sum, item) => sum + (item.missedCycleCount || 0), 0),
      baselineLength: round1(baselineLength),
      labels: anomalies.map(item => item.anomalyLabel)
    }
  };
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
  daysUntil,
  anomalySummary = {}
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

  if (anomalySummary.possibleMissingCycleCount > 0) {
    insights.push({
      type: 'possible_missing_cycle',
      severity: 'caution',
      message: '发现疑似漏记周期，预测已按个人节奏校准'
    });
  }

  if (anomalySummary.hardAnomalyCount > 0 && regularity !== 'irregular') {
    insights.push({
      type: 'cycle_outlier',
      severity: 'caution',
      message: '近期有偏长或偏短周期，建议补充备注'
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

function buildCycleTrend(cycleLengths) {
  if (cycleLengths.length < 4) {
    return {
      direction: 'unknown',
      label: '趋势建立中',
      deltaDays: 0,
      description: '至少 4 个完整周期后可判断周期是否变长或变短'
    };
  }

  const recentCount = Math.min(3, Math.floor(cycleLengths.length / 2));
  const recentAvg = average(cycleLengths.slice(0, recentCount));
  const previousAvg = average(cycleLengths.slice(recentCount, recentCount * 2));
  const deltaDays = round1(recentAvg - previousAvg);

  if (Math.abs(deltaDays) < 2) {
    return {
      direction: 'stable',
      label: '近期稳定',
      deltaDays,
      description: '最近几次周期长度变化不大'
    };
  }

  return deltaDays > 0
    ? {
      direction: 'lengthening',
      label: '近期变长',
      deltaDays,
      description: `最近周期平均比之前长约 ${Math.abs(deltaDays)} 天`
    }
    : {
      direction: 'shortening',
      label: '近期变短',
      deltaDays,
      description: `最近周期平均比之前短约 ${Math.abs(deltaDays)} 天`
    };
}

function buildRegularityScoreReason(regularityScore, regularity, possibleMissingCycleCount) {
  if (regularityScore >= 85) {
    return '样本集中且大多落在常见周期范围';
  }
  if (possibleMissingCycleCount > 0) {
    return '发现疑似漏记周期，预测已按校准后的个人周期计算';
  }
  if (regularity === 'irregular') {
    return '近期周期差异较大，系统已放宽预测窗口';
  }
  return '样本仍在累积，预测会随记录自动校准';
}

function buildCycleEvidence({
  recentCycleLengths,
  adjustedCycleLengths,
  periodLengths,
  cycleStd,
  adjustedCycleStd,
  medianCycle,
  avgPeriod,
  regularity,
  regularityScore,
  confidence,
  anomalySummary = {}
}) {
  const sampleSize = recentCycleLengths.length;
  const predictionSampleCount = adjustedCycleLengths.length;
  const typicalCount = recentCycleLengths.filter(length =>
    length >= MIN_TYPICAL_CYCLE_DAYS && length <= MAX_TYPICAL_CYCLE_DAYS
  ).length;
  const anomalyCount = anomalySummary.anomalyCount || 0;
  const possibleMissingCycleCount = anomalySummary.possibleMissingCycleCount || 0;
  const volatilityLabel = sampleSize < 2
    ? '样本不足'
    : (possibleMissingCycleCount > 0
      ? (adjustedCycleStd <= 3 ? '校准后低波动' : '校准后仍波动')
      : (cycleStd <= 2 ? '低波动' : (cycleStd <= 5 ? '可接受波动' : '高波动')));
  const qualityLevel = confidence === 'high'
    ? 'strong'
    : (confidence === 'medium' ? 'usable' : (regularity === 'irregular' ? 'watch' : 'building'));

  let qualityLabel = '继续记录';
  if (confidence === 'high') qualityLabel = '可信度高';
  else if (confidence === 'medium') qualityLabel = '可用于提醒';
  else if (regularity === 'irregular') qualityLabel = '只看范围';
  if (possibleMissingCycleCount > 0 && confidence !== 'high') {
    qualityLabel = '已校准';
  }

  const trend = buildCycleTrend(possibleMissingCycleCount > 0 ? adjustedCycleLengths : recentCycleLengths);

  return {
    sampleSize,
    predictionSampleCount,
    anomalyCount,
    possibleMissingCycleCount,
    hardAnomalyCount: anomalySummary.hardAnomalyCount || 0,
    qualityLevel,
    qualityLabel,
    volatilityDays: round1(cycleStd),
    adjustedVolatilityDays: round1(adjustedCycleStd),
    volatilityLabel,
    typicalHitRate: sampleSize ? Math.round((typicalCount / sampleSize) * 100) : 0,
    trend,
    anchors: [
      {
        label: '周期样本',
        value: sampleSize ? `${sampleSize}个` : '不足',
        hint: sampleSize >= 3 ? '已进入个人规律判断' : '满 3 个后更稳'
      },
      {
        label: possibleMissingCycleCount > 0 ? '可用样本' : '常见范围',
        value: possibleMissingCycleCount > 0
          ? `${predictionSampleCount}个`
          : (sampleSize ? `${typicalCount}/${sampleSize}` : '-'),
        hint: possibleMissingCycleCount > 0
          ? `校准${possibleMissingCycleCount}个疑似漏记`
          : `${MIN_TYPICAL_CYCLE_DAYS}-${MAX_TYPICAL_CYCLE_DAYS}天`
      },
      {
        label: '中位周期',
        value: sampleSize ? `${Math.round(medianCycle)}天` : '-',
        hint: '抗单次异常干扰'
      },
      {
        label: '经期样本',
        value: periodLengths.length ? `${periodLengths.length}次` : '不足',
        hint: periodLengths.length ? `平均${round1(avgPeriod)}天` : '结束记录后生成'
      },
      {
        label: '波动',
        value: sampleSize >= 2 ? `±${round1(adjustedCycleStd)}天` : '-',
        hint: volatilityLabel
      },
      {
        label: '趋势',
        value: trend.label,
        hint: trend.description
      }
    ],
    scoreReason: buildRegularityScoreReason(regularityScore, regularity, possibleMissingCycleCount)
  };
}

function buildPredictionUrgency(daysUntil, uncertaintyDays, regularity) {
  if (daysUntil < -uncertaintyDays) {
    return { status: 'overdue', label: '已超出预测窗口', tone: 'warning' };
  }
  if (daysUntil < 0) {
    return { status: 'late', label: '仍在预测窗口', tone: 'caution' };
  }
  if (daysUntil <= 2) {
    return { status: 'imminent', label: '临近开始', tone: 'caution' };
  }
  if (daysUntil <= uncertaintyDays) {
    return { status: 'window', label: '进入预测窗口', tone: 'normal' };
  }
  if (regularity === 'irregular') {
    return { status: 'range_only', label: '按范围提醒', tone: 'caution' };
  }
  return { status: 'future', label: '未临近', tone: 'normal' };
}

function buildPredictionWindow({ today, predictedStartMin, predictedStart, predictedStartMax }) {
  const start = toLocalDateStr(predictedStartMin);
  const peak = toLocalDateStr(predictedStart);
  const end = toLocalDateStr(predictedStartMax);
  const daysUntilStart = diffCalendarDays(predictedStartMin, today);
  const daysUntilPeak = diffCalendarDays(predictedStart, today);
  const daysUntilEnd = diffCalendarDays(predictedStartMax, today);
  const daysFromStart = diffCalendarDays(today, predictedStartMin);
  const totalDays = Math.max(1, inclusiveCalendarDays(predictedStartMin, predictedStartMax) || 1);

  if ([daysUntilStart, daysUntilPeak, daysUntilEnd].some(value => !Number.isFinite(value))) {
    return {
      start,
      peak,
      end,
      status: 'unknown',
      label: '预测窗口',
      detail: `预计窗口 ${start} 至 ${end}`,
      progressPercent: 0,
      dayIndex: null,
      totalDays,
      daysUntilStart: null,
      daysUntilPeak: null,
      daysUntilEnd: null
    };
  }

  if (daysUntilStart > 0) {
    return {
      start,
      peak,
      end,
      status: 'before',
      label: `距窗口 ${daysUntilStart} 天`,
      detail: `预计窗口 ${start} 至 ${end}`,
      progressPercent: 0,
      dayIndex: null,
      totalDays,
      daysUntilStart,
      daysUntilPeak,
      daysUntilEnd
    };
  }

  if (daysUntilEnd < 0) {
    const daysAfterEnd = Math.abs(daysUntilEnd);
    return {
      start,
      peak,
      end,
      status: 'after',
      label: `超出窗口 ${daysAfterEnd} 天`,
      detail: `窗口已在 ${end} 结束，先核对是否漏记`,
      progressPercent: 100,
      dayIndex: totalDays,
      totalDays,
      daysUntilStart,
      daysUntilPeak,
      daysUntilEnd
    };
  }

  const dayIndex = clamp((daysFromStart || 0) + 1, 1, totalDays);
  const progressPercent = totalDays === 1
    ? 100
    : clamp(Math.round(((dayIndex - 1) / (totalDays - 1)) * 100), 0, 100);
  let status = 'inside_before_peak';
  let label = `窗口第 ${dayIndex}/${totalDays} 天`;
  let detail = `距预计日还有 ${daysUntilPeak} 天，开始后及时记录第一天`;

  if (daysUntilPeak === 0) {
    status = 'peak';
    label = '预计日当天';
    detail = `今天是本轮预计开始日，窗口 ${start} 至 ${end}`;
  } else if (daysUntilPeak < 0) {
    status = 'inside_after_peak';
    detail = `已过预计日 ${Math.abs(daysUntilPeak)} 天，仍在预测窗口内`;
  }

  return {
    start,
    peak,
    end,
    status,
    label,
    detail,
    progressPercent,
    dayIndex,
    totalDays,
    daysUntilStart,
    daysUntilPeak,
    daysUntilEnd
  };
}

function buildPredictionReason({
  confidence,
  regularity,
  recentCycleLengths,
  uncertaintyDays,
  anomalySummary = {}
}) {
  if (recentCycleLengths.length === 0) {
    return '还没有可用完整周期，先按默认 28 天估算';
  }
  if (anomalySummary.possibleMissingCycleCount > 0) {
    return `检测到 ${anomalySummary.possibleMissingCycleCount} 个疑似漏记周期，已按个人中位周期校准，本次按 ±${uncertaintyDays} 天范围提醒`;
  }
  if (anomalySummary.hardAnomalyCount > 0 && regularity !== 'irregular') {
    return `近期有 ${anomalySummary.hardAnomalyCount} 个偏长或偏短周期，本次按 ±${uncertaintyDays} 天范围提醒`;
  }
  if (confidence === 'high') {
    return `最近 ${recentCycleLengths.length} 个周期集中，适合按单日提醒`;
  }
  if (regularity === 'irregular') {
    return `近期波动较大，本次按 ±${uncertaintyDays} 天范围提醒`;
  }
  return `基于最近 ${recentCycleLengths.length} 个完整周期，后续会随记录自动校准`;
}

function buildMenstrualCarePlan({
  ongoing,
  daysUntil,
  uncertaintyDays,
  regularity,
  confidence,
  completedCount,
  heaviestDay,
  symptomInsights
}) {
  const actions = [];
  const pushAction = (type, title, detail, level = 'normal') => {
    if (!actions.some(action => action.type === type)) {
      actions.push({ type, title, detail, level });
    }
  };

  if (ongoing) {
    pushAction('daily_flow', '连续打卡', '每天记录流量和症状，结束当天及时点“结束月经”', 'primary');
    if (heaviestDay) {
      pushAction('heavy_day', '关注高峰日', `历史上第 ${heaviestDay} 天量更大，提前安排轻松一点的节奏`, 'normal');
    }
  } else if (daysUntil < -uncertaintyDays) {
    pushAction('overdue_check', '核对是否漏记', '已经超过预测窗口，先确认是否已经开始但没有记录', 'warning');
  } else if (daysUntil < 0) {
    pushAction('window_check', '窗口内核对', '已过预计日但仍在预测窗口内，留意是否已经开始并及时记录', 'primary');
  } else if (daysUntil <= 2) {
    pushAction('prepare', '提前准备', '把卫生用品、热敷和低负担安排准备好', 'primary');
  } else if (daysUntil <= uncertaintyDays) {
    pushAction('window_watch', '进入窗口', '这几天关注身体信号，开始后马上记录第一天', 'normal');
  }

  if (regularity === 'irregular') {
    pushAction('range_focus', '按范围看待', '周期波动较大，优先看预测窗口，不要只盯单一天', 'warning');
  } else if (confidence === 'high') {
    pushAction('stable_reminder', '固定提醒', '规律较稳定，可以按预计日前后两天安排提醒', 'normal');
  }

  if (completedCount < 3) {
    pushAction('data_building', '补足样本', `还需要 ${Math.max(0, 3 - completedCount)} 个完整周期来建立更稳的个人规律`, 'normal');
  }

  const recurringSymptom = (symptomInsights || []).find(item => item.occurrenceRate >= 50);
  if (recurringSymptom) {
    pushAction('symptom_prepare', '症状预案', `${recurringSymptom.name} ${recurringSymptom.rateLabel}，提前准备舒缓方案`, 'normal');
  }

  return actions.slice(0, 4);
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
  const cycleProfile = buildCycleLengthProfile(recentCycleLengths);
  const predictionCycleLengths = cycleProfile.adjustedCycleLengths.length
    ? cycleProfile.adjustedCycleLengths
    : recentCycleLengths;
  const predictionWeights = cycleProfile.predictionWeights;
  const anomalySummary = cycleProfile.anomalySummary;

  // 2. 经期长度按开始日和结束日都计入，过滤明显由漏记导致的超长周期。
  const periodLengths = completed
    .map(record => record.cycleEnd ? inclusiveCalendarDays(record.cycleStart, record.cycleEnd) : null)
    .filter(length => length !== null && length >= 1 && length <= 12)
    .slice(0, 8);

  const avgCycle = predictionCycleLengths.length > 0
    ? (predictionCycleLengths.length >= 3
      ? (
        weightedAverageRecentFirst(predictionCycleLengths, predictionWeights) * 0.65 +
        median(predictionCycleLengths) * 0.35
      )
      : weightedAverageRecentFirst(predictionCycleLengths, predictionWeights))
    : DEFAULT_CYCLE_LENGTH;
  const medianCycle = predictionCycleLengths.length > 0 ? median(predictionCycleLengths) : DEFAULT_CYCLE_LENGTH;
  const cycleStd = recentCycleLengths.length > 1 ? standardDeviation(recentCycleLengths) : 0;
  const adjustedCycleStd = predictionCycleLengths.length > 1 ? standardDeviation(predictionCycleLengths) : cycleStd;
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
  const adjustedCycleSpread = predictionCycleLengths.length > 1
    ? Math.max(...predictionCycleLengths) - Math.min(...predictionCycleLengths)
    : 0;

  let regularity = 'unknown';
  let regularityScore = 0;
  let regularityLabel = '';
  if (recentCycleLengths.length >= 3) {
    const hasCorrectedMissingCycle = anomalySummary.possibleMissingCycleCount > 0 &&
      anomalySummary.hardAnomalyCount === 0 &&
      adjustedCycleStd <= 3;

    if (
      anomalySummary.hardAnomalyCount >= 2 ||
      (cycleSpread > 20 && adjustedCycleSpread > 10) ||
      (cycleStd >= 8 && adjustedCycleStd >= 6)
    ) {
      regularity = 'irregular';
      regularityScore = Math.max(32, 45 - anomalySummary.hardAnomalyCount * 3);
      regularityLabel = '不规律';
    } else if (hasCorrectedMissingCycle) {
      regularity = 'somewhat_regular';
      regularityScore = 72;
      regularityLabel = '规律但有漏记';
    } else if (adjustedCycleStd <= 2 && outOfTypicalCount === 0) {
      regularity = 'very_regular';
      regularityScore = 95;
      regularityLabel = '非常规律';
    } else if (adjustedCycleStd <= 4 && anomalySummary.hardAnomalyCount <= 1) {
      regularity = 'regular';
      regularityScore = anomalySummary.anomalyCount > 0 ? 76 : 82;
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

  let uncertaintyDays = predictionCycleLengths.length === 0
    ? 7
    : Math.ceil(Math.max(adjustedCycleStd * 1.25, 2));
  if (recentCycleLengths.length > 0 && recentCycleLengths.length < 3) {
    uncertaintyDays = Math.max(uncertaintyDays, 5);
  }
  if (anomalySummary.possibleMissingCycleCount > 0) {
    uncertaintyDays = Math.max(uncertaintyDays + 2, 5);
  } else if (anomalySummary.hardAnomalyCount > 0) {
    uncertaintyDays += Math.min(4, anomalySummary.hardAnomalyCount * 2);
  }
  if (regularity === 'irregular') {
    uncertaintyDays = Math.max(uncertaintyDays, 7);
  }
  uncertaintyDays = clamp(uncertaintyDays, 2, 12);

  const predictedStartMin = addCalendarDays(predictedStart, -uncertaintyDays);
  const predictedStartMax = addCalendarDays(predictedStart, uncertaintyDays);
  const daysUntil = diffCalendarDays(predictedStart, today);
  const predictionWindow = buildPredictionWindow({
    today,
    predictedStartMin,
    predictedStart,
    predictedStartMax
  });

  let confidence = 'low';
  if (
    predictionCycleLengths.length >= 5 &&
    ['very_regular', 'regular'].includes(regularity) &&
    anomalySummary.anomalyCount === 0
  ) {
    confidence = 'high';
  } else if (predictionCycleLengths.length >= 3 && regularity !== 'irregular') {
    confidence = 'medium';
  }

  const urgency = buildPredictionUrgency(daysUntil, uncertaintyDays, regularity);
  const predictionReason = buildPredictionReason({
    confidence,
    regularity,
    recentCycleLengths,
    uncertaintyDays,
    anomalySummary
  });
  const cycleEvidence = buildCycleEvidence({
    recentCycleLengths,
    adjustedCycleLengths: predictionCycleLengths,
    periodLengths,
    cycleStd,
    adjustedCycleStd,
    medianCycle,
    avgPeriod,
    regularity,
    regularityScore,
    confidence,
    anomalySummary
  });

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
    daysUntil,
    anomalySummary
  });
  const carePlan = buildMenstrualCarePlan({
    ongoing,
    daysUntil,
    uncertaintyDays,
    regularity,
    confidence,
    completedCount: completed.length,
    heaviestDay,
    symptomInsights
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
      windowLabel: `±${uncertaintyDays}天`,
      window: predictionWindow,
      status: urgency.status,
      urgencyLabel: urgency.label,
      urgencyTone: urgency.tone,
      reason: predictionReason,
      basis: recentCycleLengths.length > 0
        ? (anomalySummary.possibleMissingCycleCount > 0
          ? `基于最近 ${recentCycleLengths.length} 个完整周期，校准 ${anomalySummary.possibleMissingCycleCount} 个疑似漏记`
          : `基于最近 ${recentCycleLengths.length} 个完整周期`)
        : '基于默认 28 天周期'
    },
    cycle: {
      avgLength: roundedAvgCycle,
      medianLength: Math.round(medianCycle),
      minLength: recentCycleLengths.length ? Math.min(...recentCycleLengths) : null,
      maxLength: recentCycleLengths.length ? Math.max(...recentCycleLengths) : null,
      stdDeviation: round1(cycleStd),
      adjustedStdDeviation: round1(adjustedCycleStd),
      avgPeriodLength: round1(avgPeriod),
      regularity,
      regularityScore,
      regularityLabel,
      totalCycles: completed.length,
      measuredCycleCount: recentCycleLengths.length,
      predictionSampleCount: predictionCycleLengths.length,
      anomalySummary,
      evidence: cycleEvidence,
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
    carePlan,
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
      .sort({ recordedAt: -1, updatedAt: -1, createdAt: -1 })
      .lean();
    const serializedRecords = records.map(serializeHealthRecord);
    const mine = serializedRecords.filter(r => r.userId === String(userId));
    const partner = serializedRecords.filter(r => r.userId === String(user.partnerId));
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
    const normalized = normalizeHealthPayload(payload);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }
    const targetUserId = userId;
    
    // 检查是否已有同一天的记录
    const recordDate = normalized.recordedAt;
    const startOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate());
    const endOfDay = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate() + 1);
    
    const existingRecord = await HealthRecord.findOne({
      userId: targetUserId,
      coupleId,
      recordedAt: { $gte: startOfDay, $lt: endOfDay }
    });
    
    if (existingRecord) {
      // 更新已有记录
      applyHealthPayload(existingRecord, normalized);
      await existingRecord.save();
      
      // 通知情侣双方
      const sendNotification = req.app.locals.sendNotification;
      emitHealthSync(req.app, coupleId, { action: 'update', payload: buildHealthSyncPayload(existingRecord), actor: userId, requestId: payload && payload.requestId });
      
      // 推送通知给伴侣
      if (sendNotification && user.partnerId && targetUserId !== String(user.partnerId)) {
        const notifyUser = await User.findById(targetUserId).lean();
        const payloadPush = getPushPayload('healthRecordUpdated', {
          nickname: notifyUser?.nickname || 'TA'
        }, { url: '/health' });
        sendNotification(user.partnerId, payloadPush);
      }
      
      return res.json({ success: true, data: serializeHealthRecord(existingRecord), updated: true });
    }
    
    // 新建记录
    const record = new HealthRecord({
      userId: targetUserId,
      coupleId,
      height: normalized.values.height ?? null,
      weight: normalized.values.weight ?? null,
      bodyFat: normalized.values.bodyFat ?? null,
      measurements: buildMeasurements(normalized),
      note: normalized.notePresent ? normalized.note : '',
      recordedAt: normalized.recordedAt
    });
    await record.save();
    
    // 通知情侣双方
    const sendNotification = req.app.locals.sendNotification;
    emitHealthSync(req.app, coupleId, { action: 'create', payload: buildHealthSyncPayload(record), actor: userId, requestId: payload && payload.requestId });
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId && targetUserId !== String(user.partnerId)) {
      const notifyUser = await User.findById(targetUserId).lean();
      const payloadPush = getPushPayload('healthRecordCreated', {
        nickname: notifyUser?.nickname || 'TA'
      }, { url: '/health' });
      sendNotification(user.partnerId, payloadPush);
    }
    
    res.json({ success: true, data: serializeHealthRecord(record) });
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
    const normalized = normalizeHealthPayload(payload);
    if (normalized.error) {
      return res.status(400).json({ success: false, message: normalized.error });
    }
    applyHealthPayload(record, normalized, { allowRecordedAt: true });
    await record.save();
    
    // 通知情侣双方
    const sendNotification = req.app.locals.sendNotification;
    emitHealthSync(req.app, coupleId, { action: 'update', payload: buildHealthSyncPayload(record), actor: userId, requestId: payload && payload.requestId });
    
    // 推送通知给伴侣
    if (sendNotification && user.partnerId && String(record.userId) !== String(user.partnerId)) {
      const notifyUser = await User.findById(record.userId).lean();
      const payloadPush = getPushPayload('healthRecordUpdated', {
        nickname: notifyUser?.nickname || 'TA'
      }, { url: '/health' });
      sendNotification(user.partnerId, payloadPush);
    }
    
    res.json({ success: true, data: serializeHealthRecord(record) });
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
    const metric = typeof req.query.metric === 'string' ? req.query.metric : 'weight';
    if (!TREND_METRICS.has(metric)) {
      return res.status(400).json({ success: false, message: '不支持的趋势指标' });
    }
    const parsedDays = Number.parseInt(req.query.days || '30', 10);
    const days = Number.isFinite(parsedDays) ? Math.max(1, Math.min(parsedDays, 365)) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await HealthRecord.find({ coupleId, recordedAt: { $gte: since } })
      .sort({ recordedAt: 1 })
      .lean();

    const getValue = (r) => {
      if (MEASUREMENT_KEYS.includes(metric)) {
        return r.measurements?.[metric] ?? null;
      }
      return r[metric] ?? null;
    };

    const mine = [];
    const partner = [];
    records.forEach(r => {
      const v = getValue(r);
      if (v === null || v === undefined) return;
      const value = Number(v);
      if (!Number.isFinite(value)) return;
      const item = { date: toLocalDateStr(r.recordedAt), value };
      if (String(r.userId) === String(userId)) mine.push(item);
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
    const parsedStart = parseDateOnlyField(cycleStart, '开始日期');
    if (parsedStart.error) {
      return res.status(400).json({ success: false, message: parsedStart.error });
    }
    const futureError = futureDateError(parsedStart.date, '开始日期');
    if (futureError) {
      return res.status(400).json({ success: false, message: futureError });
    }
    const startDate = parsedStart.date;

    // 如果当前有进行中的周期，先自动结束它
    const ongoing = await MenstrualRecord.findOne({
      userId: targetUserId,
      coupleId,
      status: 'ongoing'
    });
    if (ongoing) {
      const daysAfterOngoingStart = diffCalendarDays(startDate, ongoing.cycleStart);
      if (daysAfterOngoingStart === null || daysAfterOngoingStart <= 0) {
        return res.status(400).json({ success: false, message: '新周期开始日期必须晚于当前周期开始日期' });
      }
      if (hasFlowRecordOnOrAfter(ongoing, startDate)) {
        return res.status(400).json({ success: false, message: '新周期开始日期不能早于已记录的出血日期' });
      }
      ongoing.status = 'completed';
      ongoing.cycleEnd = addCalendarDays(startDate, -1); // 新周期开始前一天
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

    const parsedEnd = parseDateOnlyField(cycleEnd, '结束日期');
    if (parsedEnd.error) {
      return res.status(400).json({ success: false, message: parsedEnd.error });
    }
    const futureError = futureDateError(parsedEnd.date, '结束日期');
    if (futureError) {
      return res.status(400).json({ success: false, message: futureError });
    }
    const daysSinceStart = diffCalendarDays(parsedEnd.date, record.cycleStart);
    if (daysSinceStart === null || daysSinceStart < 0) {
      return res.status(400).json({ success: false, message: '结束日期不能早于开始日期' });
    }

    record.cycleEnd = parsedEnd.date;
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
    const parsedFlowDate = parseDateOnlyField(req.body.date, '打卡日期');
    if (parsedFlowDate.error) {
      return res.status(400).json({ success: false, message: parsedFlowDate.error });
    }
    const futureError = futureDateError(parsedFlowDate.date, '打卡日期');
    if (futureError) {
      return res.status(400).json({ success: false, message: futureError });
    }
    const date = parsedFlowDate.dateString;
    const normalizedFlowLevel = Number(flowLevel);

    if (!Number.isInteger(normalizedFlowLevel) || normalizedFlowLevel < 1 || normalizedFlowLevel > 5) {
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
        cycleStart: parsedFlowDate.date,
        cycleEnd: null,
        flowRecords: [],
        status: 'ongoing'
      });
    } else {
      const daysSinceStart = diffCalendarDays(parsedFlowDate.date, record.cycleStart);
      if (daysSinceStart === null || daysSinceStart < 0) {
        return res.status(400).json({ success: false, message: '打卡日期不能早于当前周期开始日期' });
      }
    }

    // 查找当天是否已有流量记录
    const existingIndex = record.flowRecords.findIndex(f => f.date === date);
    if (existingIndex >= 0) {
      // 更新
      record.flowRecords[existingIndex].flowLevel = normalizedFlowLevel;
      record.flowRecords[existingIndex].note = note || '';
    } else {
      // 新增
      record.flowRecords.push({ date, flowLevel: normalizedFlowLevel, note: note || '' });
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
        flowLevel: normalizedFlowLevel,
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
