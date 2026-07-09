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

function parseLocalDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const raw = String(value)
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    const date = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function diffCalendarDays(later, earlier) {
  const laterDate = parseLocalDate(later)
  const earlierDate = parseLocalDate(earlier)
  if (!laterDate || !earlierDate) return null

  const laterDay = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate())
  const earlierDay = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate())
  return Math.round((laterDay - earlierDay) / 86400000)
}

function defaultFormatDate(value) {
  if (!value) return '-'
  const date = parseLocalDate(value)
  if (!date) return '-'
  return `${date.getMonth() + 1}/${date.getDate()}`
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
  const evidence = cycle.evidence || {}
  const possibleMissingCycleCount = Number(
    cycle.anomalySummary?.possibleMissingCycleCount ||
    evidence.possibleMissingCycleCount ||
    0
  )
  const adjustedStdDeviation = Number.isFinite(Number(cycle.adjustedStdDeviation))
    ? Number(cycle.adjustedStdDeviation)
    : Number(cycle.stdDeviation || 0)
  const predictionSampleCount = Number(cycle.predictionSampleCount || evidence.predictionSampleCount || measuredCount)

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
  } else if (possibleMissingCycleCount > 0) {
    description = `发现 ${possibleMissingCycleCount} 个疑似漏记周期，校准后波动约 ${adjustedStdDeviation} 天`
  } else if (regularity === 'irregular') {
    description = `最近周期波动约 ${cycle.stdDeviation || 0} 天，预测窗口已放宽`
  } else if (regularity === 'very_regular' || regularity === 'regular') {
    description = `最近周期波动约 ${adjustedStdDeviation} 天，预测可信度更高`
  } else {
    description = `最近周期在 ${formatRange(cycle.minLength, cycle.maxLength)} 之间`
  }

  return {
    title: label,
    level,
    scoreLabel: scorePercent > 0 ? `${scorePercent}分` : '--',
    scorePercent,
    description,
    qualityLabel: evidence.qualityLabel || '',
    scoreReason: evidence.scoreReason || '',
    trend: evidence.trend || null,
    evidence: Array.isArray(evidence.anchors)
      ? evidence.anchors.slice(0, 6)
      : [],
    metrics: [
      { label: '平均周期', value: cycle.avgLength ? `${cycle.avgLength}天` : '-' },
      { label: '波动范围', value: formatRange(cycle.minLength, cycle.maxLength) },
      { label: '平均经期', value: cycle.avgPeriodLength ? `${cycle.avgPeriodLength}天` : '-' },
      {
        label: possibleMissingCycleCount > 0 ? '可用样本' : '样本',
        value: possibleMissingCycleCount > 0
          ? `${predictionSampleCount}/${measuredCount}`
          : (totalCycles ? `${totalCycles}次` : '-')
      }
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

export function buildCycleForecastBoard({
  prediction,
  records = [],
  latestPeriod = null,
  today = new Date(),
  formatDate = defaultFormatDate,
  canEdit = true
} = {}) {
  const normalizedRecords = Array.isArray(records) ? records : []
  const nextPeriod = buildNextPeriodPrediction(prediction, formatDate)
  const summary = buildCycleRegularitySummary(prediction)
  const carePlan = buildMenstrualCarePlan(prediction)
  const measuredCount = Number(prediction?.cycle?.measuredCycleCount || 0)
  const sampleTarget = 3
  const sampleProgress = clampPercent((Math.min(measuredCount, sampleTarget) / sampleTarget) * 100)
  const latestIsOngoing = !!(latestPeriod?.cycleStart && !latestPeriod?.cycleEnd)
  const ongoingDay = latestIsOngoing
    ? Math.max(1, (diffCalendarDays(today, latestPeriod.cycleStart) || 0) + 1)
    : null

  if (!latestPeriod && normalizedRecords.length === 0) {
    return {
      state: 'empty',
      tone: 'building',
      title: '从第一天开始建立个人规律',
      subtitle: canEdit
        ? '记录开始日、结束日和每日流量后，满 3 个完整周期会形成更稳定的预测。'
        : '对方开始记录后，这里会同步预测窗口、规律评分和照顾重点。',
      progressPercent: 0,
      primary: { label: '样本', value: '0/3', meta: '还未开始' },
      metrics: [
        { label: '第一步', value: '记录开始日' },
        { label: '第二步', value: '结束时补日期' },
        { label: '第三步', value: '每日流量' }
      ],
      actions: [
        canEdit
          ? { type: 'start', title: '今天开始就记录第一天', detail: '哪怕只记录开始日，也能让预测从默认估算转向个人周期。', level: 'primary' }
          : { type: 'wait_record', title: '等待对方补充记录', detail: '有完整周期后，系统会自动生成更清晰的预测窗口。', level: 'normal' }
      ],
      chips: ['开始日', '结束日', '流量与症状'],
      disclaimer: '预测仅用于健康记录参考。'
    }
  }

  let tone = 'balanced'
  if (latestIsOngoing) tone = 'ongoing'
  else if (nextPeriod?.status === 'overdue') tone = 'warning'
  else if (nextPeriod?.status === 'today') tone = 'today'
  else if (summary?.level === 'irregular') tone = 'warning'
  else if (summary?.level === 'stable') tone = 'stable'
  else if (summary?.level === 'building') tone = 'building'

  const title = latestIsOngoing
    ? `本次第 ${ongoingDay} 天`
    : (nextPeriod ? `下次预计 ${nextPeriod.date}` : (summary ? `周期${summary.title}` : '周期规律建立中'))

  const subtitle = latestIsOngoing
    ? (nextPeriod
      ? `本次开始日已纳入预测，下次窗口 ${nextPeriod.range || nextPeriod.windowLabel || '会继续校准'}。`
      : '持续记录流量和症状，结束当天补上结束日。')
    : (nextPeriod?.reason || summary?.description || '继续记录完整周期，系统会自动校准预测。')

  const primary = latestIsOngoing
    ? {
      label: '进行中',
      value: `第${ongoingDay}天`,
      meta: nextPeriod?.windowLabel ? `预测误差 ${nextPeriod.windowLabel}` : '每天打卡'
    }
    : {
      label: nextPeriod?.status === 'overdue' ? '需要核对' : '下次',
      value: nextPeriod?.text || summary?.title || '建立中',
      meta: nextPeriod?.range ? `窗口 ${nextPeriod.range}` : (nextPeriod?.windowLabel || summary?.qualityLabel || '')
    }

  const metrics = [
    { label: '规律', value: summary?.title || '建立中' },
    { label: '样本', value: `${measuredCount}/${sampleTarget}` },
    {
      label: '平均周期',
      value: prediction?.cycle?.avgLength ? `${prediction.cycle.avgLength}天` : '-'
    },
    {
      label: '可信度',
      value: nextPeriod?.confidenceLabel || summary?.qualityLabel || '-'
    }
  ]

  const fallbackActions = latestIsOngoing
    ? [{ type: 'daily_flow', title: '今天完成一次打卡', detail: '记录流量和症状，结束时补结束日。', level: 'primary' }]
    : [{ type: 'keep_recording', title: '保持完整记录', detail: '开始日和结束日越完整，预测窗口越窄。', level: 'normal' }]

  const readonlyActions = [{ type: 'watch_window', title: '关注预测窗口', detail: '看到临近或超出窗口时，优先提醒对方核对是否已经开始。', level: tone === 'warning' ? 'warning' : 'normal' }]
  const actions = (canEdit ? (carePlan.length ? carePlan : fallbackActions) : readonlyActions).slice(0, 3)
  const chips = [
    summary?.qualityLabel,
    summary?.trend?.label,
    nextPeriod?.urgencyLabel,
    ...(prediction?.insights || []).map(item => item.message)
  ].filter(Boolean).slice(0, 4)

  return {
    state: latestIsOngoing ? 'ongoing' : 'forecast',
    tone,
    title,
    subtitle,
    progressPercent: measuredCount < sampleTarget ? sampleProgress : (summary?.scorePercent || 0),
    primary,
    metrics,
    actions,
    chips,
    disclaimer: prediction?.disclaimer || '预测仅用于健康记录参考。'
  }
}
