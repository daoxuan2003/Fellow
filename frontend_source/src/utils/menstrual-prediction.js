const REGULARITY_LABELS = {
  very_regular: '非常规律',
  regular: '规律',
  somewhat_regular: '一般',
  irregular: '不规律',
  insufficient_data: '规律建立中',
  unknown: '规律建立中'
}

const CONFIDENCE_LABELS = {
  high: '高',
  medium: '中',
  low: '低'
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatRange(min, max) {
  if (min === null || min === undefined || max === null || max === undefined) return '-'
  if (min === max) return `${min}天`
  return `${min}-${max}天`
}

export function buildNextPeriodPrediction(prediction, formatDate = value => value || '-') {
  if (!prediction?.nextPeriod) return null

  const daysUntil = prediction.nextPeriod.daysUntil
  let text = ''
  let status = ''
  if (daysUntil < 0) {
    text = `已逾期 ${Math.abs(daysUntil)} 天`
    status = 'overdue'
  } else if (daysUntil === 0) {
    text = '就在今天'
    status = 'today'
  } else {
    text = `还有 ${daysUntil} 天`
    status = 'future'
  }

  return {
    date: formatDate(prediction.nextPeriod.predictedDate),
    text,
    status,
    range: prediction.nextPeriod.dateRange
      ? `${formatDate(prediction.nextPeriod.dateRange.min)}~${formatDate(prediction.nextPeriod.dateRange.max)}`
      : null,
    confidenceLabel: prediction.nextPeriod.confidenceLabel ||
      (CONFIDENCE_LABELS[prediction.nextPeriod.confidence] || ''),
    basis: prediction.nextPeriod.basis || ''
  }
}

export function buildCycleRegularitySummary(prediction) {
  const cycle = prediction?.cycle
  if (!cycle) return null

  const measuredCount = Number(cycle.measuredCycleCount || 0)
  const totalCycles = Number(cycle.totalCycles || 0)
  const score = Number(cycle.regularityScore || 0)
  const regularity = cycle.regularity || 'unknown'
  const label = cycle.regularityLabel || REGULARITY_LABELS[regularity] || REGULARITY_LABELS.unknown
  const scorePercent = clampPercent(score)

  let level = 'building'
  if (regularity === 'irregular' || scorePercent < 50) {
    level = 'irregular'
  } else if (scorePercent >= 85) {
    level = 'stable'
  } else if (scorePercent >= 65) {
    level = 'balanced'
  }

  let description = ''
  if (measuredCount < 3) {
    const remaining = Math.max(0, 3 - measuredCount)
    description = remaining > 0
      ? `还差 ${remaining} 个完整周期即可建立更稳的个人规律`
      : '正在建立个人规律'
  } else if (regularity === 'irregular') {
    description = `最近周期波动约 ${cycle.stdDeviation || 0} 天，预测窗口已放宽`
  } else if (regularity === 'very_regular' || regularity === 'regular') {
    description = `最近周期波动约 ${cycle.stdDeviation || 0} 天，预测可信度更高`
  } else {
    description = `最近周期在 ${formatRange(cycle.minLength, cycle.maxLength)} 之间`
  }

  return {
    title: label,
    level,
    scoreLabel: scorePercent > 0 ? `${scorePercent}分` : '--',
    scorePercent,
    description,
    metrics: [
      { label: '平均周期', value: cycle.avgLength ? `${cycle.avgLength}天` : '-' },
      { label: '波动范围', value: formatRange(cycle.minLength, cycle.maxLength) },
      { label: '平均经期', value: cycle.avgPeriodLength ? `${cycle.avgPeriodLength}天` : '-' },
      { label: '样本', value: totalCycles ? `${totalCycles}次` : '-' }
    ],
    disclaimer: prediction.disclaimer || '预测仅用于健康记录参考。'
  }
}
