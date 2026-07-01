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
    windowLabel: prediction.nextPeriod.windowLabel || (
      Number.isFinite(Number(prediction.nextPeriod.uncertaintyDays))
        ? `±${Number(prediction.nextPeriod.uncertaintyDays)}天`
        : ''
    ),
    confidenceLabel: prediction.nextPeriod.confidenceLabel ||
      (CONFIDENCE_LABELS[prediction.nextPeriod.confidence] || ''),
    basis: prediction.nextPeriod.basis || '',
    reason: prediction.nextPeriod.reason || '',
    urgencyLabel: prediction.nextPeriod.urgencyLabel || '',
    urgencyTone: prediction.nextPeriod.urgencyTone || 'normal'
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
    qualityLabel: cycle.evidence?.qualityLabel || '',
    scoreReason: cycle.evidence?.scoreReason || '',
    trend: cycle.evidence?.trend || null,
    evidence: Array.isArray(cycle.evidence?.anchors)
      ? cycle.evidence.anchors.slice(0, 6)
      : [],
    metrics: [
      { label: '平均周期', value: cycle.avgLength ? `${cycle.avgLength}天` : '-' },
      { label: '波动范围', value: formatRange(cycle.minLength, cycle.maxLength) },
      { label: '平均经期', value: cycle.avgPeriodLength ? `${cycle.avgPeriodLength}天` : '-' },
      { label: '样本', value: totalCycles ? `${totalCycles}次` : '-' }
    ],
    disclaimer: prediction.disclaimer || '预测仅用于健康记录参考。'
  }
}

export function buildMenstrualCarePlan(prediction) {
  if (!prediction) return []

  if (Array.isArray(prediction.carePlan) && prediction.carePlan.length > 0) {
    return prediction.carePlan.slice(0, 4).map((item, index) => ({
      type: item.type || `care_${index}`,
      title: item.title || '本次建议',
      detail: item.detail || '',
      level: item.level || 'normal'
    }))
  }

  const plan = []
  const status = prediction.nextPeriod?.status
  const daysUntil = Number(prediction.nextPeriod?.daysUntil)
  const regularity = prediction.cycle?.regularity

  if (status === 'overdue' || daysUntil < 0) {
    plan.push({
      type: 'overdue_check',
      title: '核对是否漏记',
      detail: '如果已经开始，先补记开始日期，让后续预测自动校准。',
      level: 'warning'
    })
  } else if (daysUntil <= 2) {
    plan.push({
      type: 'prepare',
      title: '提前准备',
      detail: '把卫生用品、热敷和低负担安排准备好。',
      level: 'primary'
    })
  }

  if (regularity === 'irregular') {
    plan.push({
      type: 'range_focus',
      title: '按范围看待',
      detail: '近期周期波动较大，优先参考预测窗口。',
      level: 'warning'
    })
  }

  return plan.slice(0, 4)
}
