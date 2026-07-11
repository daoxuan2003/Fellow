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

function buildFormattedWindow(nextPeriod, formatDate) {
  const window = nextPeriod?.window
  if (!window) return null

  const progressPercent = clampPercent(Number(window.progressPercent || 0))
  const dayIndex = Number(window.dayIndex)
  const totalDays = Number(window.totalDays)
  const hasWindowPosition = Number.isFinite(dayIndex) && Number.isFinite(totalDays) && dayIndex > 0 && totalDays > 0

  return {
    start: formatDate(window.start),
    peak: formatDate(window.peak || nextPeriod.predictedDate),
    end: formatDate(window.end),
    status: window.status || 'unknown',
    label: window.label || '预测窗口',
    detail: window.detail || '',
    progressPercent,
    dayIndex: hasWindowPosition ? dayIndex : null,
    totalDays: hasWindowPosition ? totalDays : null,
    timingLabel: hasWindowPosition ? `${dayIndex}/${totalDays}` : '',
    daysUntilStart: window.daysUntilStart,
    daysUntilPeak: window.daysUntilPeak,
    daysUntilEnd: window.daysUntilEnd
  }
}

export function buildNextPeriodPrediction(prediction, formatDate = value => value || '-') {
  if (!prediction?.nextPeriod) return null

  const nextPeriod = prediction.nextPeriod
  const daysUntil = nextPeriod.daysUntil
  const forecastWindow = buildFormattedWindow(nextPeriod, formatDate)
  let text = ''
  let status = ''
  if (forecastWindow?.status === 'after') {
    text = forecastWindow.label || `已超出窗口 ${Math.abs(Number(forecastWindow.daysUntilEnd || 0))} 天`
    status = 'overdue'
  } else if (daysUntil < 0) {
    const stillInWindow = forecastWindow || nextPeriod.status === 'late' || nextPeriod.status === 'window'
    text = stillInWindow ? `已过预计日 ${Math.abs(daysUntil)} 天` : `已逾期 ${Math.abs(daysUntil)} 天`
    status = stillInWindow ? 'window' : 'overdue'
  } else if (daysUntil === 0) {
    text = '就在今天'
    status = 'today'
  } else {
    text = `还有 ${daysUntil} 天`
    status = prediction.nextPeriod.status === 'window' ? 'window' : 'future'
  }

  return {
    date: formatDate(nextPeriod.predictedDate),
    text,
    status,
    range: nextPeriod.dateRange
      ? `${formatDate(nextPeriod.dateRange.min)}~${formatDate(nextPeriod.dateRange.max)}`
      : null,
    windowLabel: nextPeriod.windowLabel || (
      Number.isFinite(Number(nextPeriod.uncertaintyDays))
        ? `±${Number(nextPeriod.uncertaintyDays)}天`
        : ''
    ),
    window: forecastWindow,
    confidenceLabel: nextPeriod.confidenceLabel ||
      (CONFIDENCE_LABELS[nextPeriod.confidence] || ''),
    basis: nextPeriod.basis || '',
    reason: nextPeriod.reason || '',
    urgencyLabel: nextPeriod.urgencyLabel || '',
    urgencyTone: nextPeriod.urgencyTone || 'normal'
  }
}

export function buildOvulationWindow(prediction, formatDate = defaultFormatDate) {
  const ovulation = prediction?.ovulation
  if (!ovulation?.predictedDate) return null

  const daysUntil = Number(ovulation.daysUntil)
  let text = ''
  let status = 'unknown'

  if (Number.isFinite(daysUntil)) {
    if (daysUntil < 0) {
      text = `已过 ${Math.abs(daysUntil)} 天`
      status = 'past'
    } else if (daysUntil === 0) {
      text = '预计今天'
      status = 'today'
    } else {
      text = `${daysUntil} 天后`
      status = daysUntil <= 2 ? 'near' : 'future'
    }
  }

  const fertileWindow = ovulation.fertileWindow?.start && ovulation.fertileWindow?.end
    ? `${formatDate(ovulation.fertileWindow.start)}~${formatDate(ovulation.fertileWindow.end)}`
    : ''

  return {
    date: formatDate(ovulation.predictedDate),
    text,
    status,
    fertileWindow,
    chip: fertileWindow ? `易孕窗口 ${fertileWindow}` : '',
    disclaimer: '仅健康记录参考，不用于避孕或诊断'
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

export function buildMenstrualCarePlan(prediction, formatDate = defaultFormatDate) {
  if (!prediction) return []

  const ovulation = buildOvulationWindow(prediction, formatDate)
  const ovulationDaysUntil = Number(prediction.ovulation?.daysUntil)
  const ovulationAction = ovulation && Number.isFinite(ovulationDaysUntil) && ovulationDaysUntil >= 0 && ovulationDaysUntil <= 3
    ? {
      type: 'ovulation_window',
      title: '关注排卵窗口',
      detail: `${ovulation.text || '临近'} · 易孕窗口 ${ovulation.fertileWindow || '会随周期校准'}，仅作健康记录参考，不用于避孕或诊断。`,
      level: ovulationDaysUntil <= 1 ? 'primary' : 'normal'
    }
    : null

  const appendOvulationAction = (plan) => {
    if (ovulationAction && !plan.some(item => item.type === ovulationAction.type)) {
      plan.push(ovulationAction)
    }
    return plan.slice(0, 4)
  }

  if (Array.isArray(prediction.carePlan) && prediction.carePlan.length > 0) {
    const plan = prediction.carePlan.slice(0, 4).map((item, index) => ({
      type: item.type || `care_${index}`,
      title: item.title || '本次建议',
      detail: item.detail || '',
      level: item.level || 'normal'
    }))
    return appendOvulationAction(plan)
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

  return appendOvulationAction(plan)
}

function getFlowRecords(record = {}) {
  return Array.isArray(record?.flowRecords) ? record.flowRecords : []
}

function sameDateOnly(left, right) {
  const leftDate = parseLocalDate(left)
  const rightDate = parseLocalDate(right)
  if (!leftDate || !rightDate) return false
  return leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
}

function countFlowRecordDays(records = []) {
  const days = new Set()
  records.forEach(record => {
    getFlowRecords(record).forEach(flow => {
      const date = parseLocalDate(flow?.date)
      if (!date) return
      days.add(`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`)
    })
  })
  return days.size
}

export function buildCycleCalibrationPlan({
  prediction,
  records = [],
  latestPeriod = null,
  today = new Date(),
  canEdit = true
} = {}) {
  const normalizedRecords = Array.isArray(records) ? records : []
  const cycle = prediction?.cycle || {}
  const nextPeriod = prediction?.nextPeriod || {}
  const measuredCount = Number(cycle.measuredCycleCount || 0)
  const sampleTarget = 3
  const completeSampleCount = Math.min(measuredCount, sampleTarget)
  const latestFlowRecords = getFlowRecords(latestPeriod)
  const flowDayCount = countFlowRecordDays(normalizedRecords)
  const latestIsOngoing = !!(latestPeriod?.cycleStart && !latestPeriod?.cycleEnd)
  const latestHasBoundary = !!(latestPeriod?.cycleStart && latestPeriod?.cycleEnd)
  const hasTodayFlow = latestFlowRecords.some(flow => sameDateOnly(flow?.date, today))
  const hasFlowPattern = flowDayCount >= 3 || !!prediction?.heaviestDay
  const confidence = nextPeriod.confidence || ''
  const uncertaintyDays = Number(nextPeriod.uncertaintyDays)
  const irregular = cycle.regularity === 'irregular'
  const calibratedMissing = Number(cycle.anomalySummary?.possibleMissingCycleCount || 0) > 0

  const sampleScore = (completeSampleCount / sampleTarget) * 44
  const confidenceScore = confidence === 'high' ? 26 : (confidence === 'medium' ? 18 : (confidence === 'low' ? 8 : 0))
  const boundaryScore = latestHasBoundary ? 14 : (latestIsOngoing ? 7 : 0)
  const flowScore = hasFlowPattern ? 16 : Math.min(12, flowDayCount * 4)
  const progressPercent = clampPercent(sampleScore + confidenceScore + boundaryScore + flowScore)

  let level = 'building'
  let statusLabel = '继续校准'
  if (irregular) {
    level = 'watch'
    statusLabel = '按范围观察'
  } else if (confidence === 'high' && measuredCount >= 5) {
    level = 'stable'
    statusLabel = '可信度高'
  } else if (measuredCount >= 3 && confidence !== 'low') {
    level = 'usable'
    statusLabel = calibratedMissing ? '已校准漏记' : '可用于提醒'
  }

  let nextStep = {
    title: canEdit ? '记录下一次开始日' : '等待对方继续记录',
    detail: canEdit ? '下一次开始时立即记录第一天，预测会继续收窄。' : '对方补足开始日、结束日和流量后，预测会自动校准。'
  }

  if (!latestPeriod) {
    nextStep = {
      title: canEdit ? '先记录本次开始日' : '等待第一条周期记录',
      detail: canEdit ? '先有开始日，系统才能从默认估算转向个人周期。' : '对方开始记录后，这里会出现校准进度。'
    }
  } else if (latestIsOngoing && !hasTodayFlow) {
    nextStep = {
      title: canEdit ? '补今天的流量和症状' : '提醒对方补今日状态',
      detail: canEdit ? '当天信号越完整，后续经期长度和照顾建议越准确。' : '今天的流量/症状会影响本次照顾重点。'
    }
  } else if (latestIsOngoing) {
    nextStep = {
      title: canEdit ? '结束当天补结束日' : '关注本次结束日',
      detail: canEdit ? '结束日会决定经期长度，也会进入下一轮预测校准。' : '结束日补齐后，下一次窗口会更可信。'
    }
  } else if (measuredCount < sampleTarget) {
    const remaining = Math.max(0, sampleTarget - measuredCount)
    nextStep = {
      title: `还差 ${remaining} 个完整周期`,
      detail: '完整周期指连续两次开始日都被记录，满 3 个后个人规律会更稳。'
    }
  } else if (irregular) {
    nextStep = {
      title: '核对漏记和异常周期',
      detail: '周期波动较大时优先看预测窗口，避免只盯某一天。'
    }
  } else if (!hasFlowPattern) {
    nextStep = {
      title: canEdit ? '补充每日流量' : '等待更多每日信号',
      detail: canEdit ? '连续几天的流量会帮助识别通常第几天最重。' : '有每日流量后，照顾重点会更具体。'
    }
  }

  const checkpoints = [
    {
      id: 'sample',
      label: '完整周期',
      value: `${completeSampleCount}/${sampleTarget}`,
      detail: measuredCount >= sampleTarget ? '已进入个人规律判断' : '开始日连续记录越多越稳',
      state: measuredCount >= sampleTarget ? 'done' : (measuredCount > 0 ? 'active' : 'pending')
    },
    {
      id: 'boundary',
      label: '本次边界',
      value: latestHasBoundary ? '已闭合' : (latestIsOngoing ? '进行中' : '待开始'),
      detail: latestHasBoundary ? '开始日和结束日完整' : '结束日会校准经期长度',
      state: latestHasBoundary ? 'done' : (latestIsOngoing ? 'active' : 'pending')
    },
    {
      id: 'daily',
      label: '每日信号',
      value: flowDayCount > 0 ? `${flowDayCount}天` : '待补',
      detail: hasFlowPattern ? '已能识别流量/症状线索' : '补流量和症状会让建议更具体',
      state: hasFlowPattern ? 'done' : (latestIsOngoing || flowDayCount > 0 ? 'active' : 'pending')
    },
    {
      id: 'window',
      label: '预测窗口',
      value: Number.isFinite(uncertaintyDays) ? `±${uncertaintyDays}天` : statusLabel,
      detail: nextPeriod.reason || cycle.evidence?.scoreReason || '随记录自动收窄',
      state: confidence === 'high' || confidence === 'medium' ? 'done' : (measuredCount > 0 ? 'active' : 'pending')
    }
  ]

  return {
    level,
    statusLabel,
    progressPercent,
    nextStep,
    checkpoints
  }
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
  const ovulation = buildOvulationWindow(prediction, formatDate)
  const summary = buildCycleRegularitySummary(prediction)
  const carePlan = buildMenstrualCarePlan(prediction, formatDate)
  const measuredCount = Number(prediction?.cycle?.measuredCycleCount || 0)
  const sampleTarget = 3
  const sampleProgress = clampPercent((Math.min(measuredCount, sampleTarget) / sampleTarget) * 100)
  const latestIsOngoing = !!(latestPeriod?.cycleStart && !latestPeriod?.cycleEnd)
  const calibration = buildCycleCalibrationPlan({ prediction, records: normalizedRecords, latestPeriod, today, canEdit })
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
      calibration,
      disclaimer: '预测仅用于健康记录参考。'
    }
  }

  let tone = 'balanced'
  if (latestIsOngoing) tone = 'ongoing'
  else if (nextPeriod?.status === 'overdue') tone = 'warning'
  else if (nextPeriod?.status === 'today' || nextPeriod?.window?.status === 'peak' || ovulation?.status === 'today') tone = 'today'
  else if (nextPeriod?.status === 'window') tone = 'balanced'
  else if (summary?.level === 'irregular') tone = 'warning'
  else if (summary?.level === 'stable') tone = 'stable'
  else if (summary?.level === 'building') tone = 'building'

  const title = latestIsOngoing
    ? `本次第 ${ongoingDay} 天`
    : (nextPeriod?.window?.status === 'after'
      ? '已超出预测窗口'
      : (nextPeriod?.window?.status === 'peak'
        ? '预计日就在今天'
        : (nextPeriod?.status === 'window'
          ? '已进入预测窗口'
          : (nextPeriod ? `下次预计 ${nextPeriod.date}` : (summary ? `周期${summary.title}` : '周期规律建立中')))))

  const subtitle = latestIsOngoing
    ? (nextPeriod
      ? `本次开始日已纳入预测，下次窗口 ${nextPeriod.range || nextPeriod.windowLabel || '会继续校准'}。`
      : '持续记录流量和症状，结束当天补上结束日。')
    : (nextPeriod?.window?.detail || nextPeriod?.reason || summary?.description || '继续记录完整周期，系统会自动校准预测。')

  const primary = latestIsOngoing
    ? {
      label: '进行中',
      value: `第${ongoingDay}天`,
      meta: nextPeriod?.windowLabel ? `预测误差 ${nextPeriod.windowLabel}` : '每天打卡'
    }
    : {
      label: nextPeriod?.status === 'overdue' ? '需要核对' : (nextPeriod?.status === 'window' ? '窗口' : '下次'),
      value: nextPeriod?.window?.label || nextPeriod?.text || summary?.title || '建立中',
      meta: nextPeriod?.range ? `窗口 ${nextPeriod.range}` : (nextPeriod?.windowLabel || summary?.qualityLabel || '')
    }

  const metrics = [
    { label: '规律', value: summary?.title || '建立中' },
    nextPeriod?.window
      ? { label: '窗口', value: nextPeriod.window.timingLabel || nextPeriod.window.label }
      : { label: '样本', value: `${measuredCount}/${sampleTarget}` },
    {
      label: '平均周期',
      value: prediction?.cycle?.avgLength ? `${prediction.cycle.avgLength}天` : '-'
    }
  ]
  if (ovulation) {
    metrics.push({ label: '排卵', value: ovulation.date })
  }
  metrics.push(
    {
      label: '可信度',
      value: nextPeriod?.confidenceLabel || summary?.qualityLabel || '-'
    }
  )

  const fallbackActions = latestIsOngoing
    ? [{ type: 'daily_flow', title: '今天完成一次打卡', detail: '记录流量和症状，结束时补结束日。', level: 'primary' }]
    : [{ type: 'keep_recording', title: '保持完整记录', detail: '开始日和结束日越完整，预测窗口越窄。', level: 'normal' }]

  const readonlyActions = [{ type: 'watch_window', title: '关注预测窗口', detail: '看到临近或超出窗口时，优先提醒对方核对是否已经开始。', level: tone === 'warning' ? 'warning' : 'normal' }]
  const actions = (canEdit ? (carePlan.length ? carePlan : fallbackActions) : readonlyActions).slice(0, 3)
  const chips = [
    summary?.qualityLabel,
    summary?.trend?.label,
    nextPeriod?.urgencyLabel,
    ovulation?.chip,
    ...(prediction?.insights || []).map(item => item.message)
  ].filter(Boolean).slice(0, 4)

  return {
    state: latestIsOngoing ? 'ongoing' : 'forecast',
    tone,
    title,
    subtitle,
    progressPercent: nextPeriod?.window
      ? nextPeriod.window.progressPercent
      : (measuredCount < sampleTarget ? sampleProgress : (summary?.scorePercent || 0)),
    primary,
    metrics,
    actions,
    chips,
    window: nextPeriod?.window || null,
    calibration,
    disclaimer: prediction?.disclaimer || '预测仅用于健康记录参考。'
  }
}
