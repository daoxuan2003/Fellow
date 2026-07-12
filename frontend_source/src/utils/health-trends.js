export function normalizeTrendSeries(list = []) {
  if (!Array.isArray(list)) return []
  const normalized = list
    .map(item => {
      if (item?.value === null || item?.value === undefined || item?.value === '') return null
      const value = Number(item?.value)
      if (!Number.isFinite(value)) return null
      return {
        ...item,
        date: normalizeTrendDate(item.date),
        value
      }
    })
    .filter(Boolean)

  const byDate = new Map()
  const undated = []
  normalized.forEach(item => {
    if (Number.isFinite(dateLabelToTime(item.date))) {
      byDate.set(item.date, item)
    } else {
      undated.push(item)
    }
  })
  return [...byDate.values(), ...undated]
}

export function normalizeTrendData(data = {}) {
  return {
    mine: normalizeTrendSeries(data?.mine),
    partner: normalizeTrendSeries(data?.partner)
  }
}

function normalizeTrendDate(value) {
  if (!value) return ''
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  return String(value)
}

function dateLabelToTime(label) {
  const match = normalizeTrendDate(label).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return Number.NaN
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

function getSortedSeries(list = []) {
  return normalizeTrendSeries(list)
    .map((item, index) => ({
      ...item,
      date: normalizeTrendDate(item.date),
      _index: index,
      _time: dateLabelToTime(item.date)
    }))
    .sort((a, b) => {
      const aFinite = Number.isFinite(a._time)
      const bFinite = Number.isFinite(b._time)
      if (aFinite && bFinite && a._time !== b._time) return a._time - b._time
      return a._index - b._index
    })
}

export function hasTrendData(data = {}) {
  const normalized = normalizeTrendData(data)
  return normalized.mine.length > 0 || normalized.partner.length > 0
}

export function getTrendDateDomain(data = {}) {
  const normalized = normalizeTrendData(data)
  const dateEntries = [...normalized.mine, ...normalized.partner]
    .map(item => {
      const label = normalizeTrendDate(item.date)
      const time = dateLabelToTime(label)
      return Number.isFinite(time) ? { label, time } : null
    })
    .filter(Boolean)

  if (dateEntries.length === 0) return null

  const byLabel = new Map()
  dateEntries.forEach(entry => {
    byLabel.set(entry.label, entry.time)
  })
  const labels = Array.from(byLabel.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([label]) => label)
  const times = dateEntries.map(entry => entry.time)
  return {
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    labels
  }
}

export function getTrendChartRange(data = {}) {
  const normalized = normalizeTrendData(data)
  const values = [...normalized.mine, ...normalized.partner].map(item => item.value)
  if (values.length === 0) return { min: 0, max: 100, range: 100 }

  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const padding = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 1
  const min = Math.max(0, minVal - padding)
  const max = maxVal + padding
  return { min, max, range: max - min || 1 }
}

export function formatTrendTick(value) {
  if (value >= 10000) return `${(value / 1000).toFixed(0)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  if (value >= 100) return Math.round(value).toString()
  if (value >= 10) return value.toFixed(1)
  return value.toFixed(2)
}

export function getTrendYAxisTicks(data = {}) {
  const { min, max } = getTrendChartRange(data)
  const ticks = []
  for (let i = 4; i >= 0; i -= 1) {
    const value = min + (max - min) * (i / 4)
    ticks.push({ value, formatted: formatTrendTick(value) })
  }
  return ticks
}

export function selectTrendAxisList(data = {}, activeTab = 'mine') {
  const normalized = normalizeTrendData(data)
  const preferred = activeTab === 'partner' ? normalized.partner : normalized.mine
  if (preferred.length > 0) return preferred
  return normalized.mine.length > 0 ? normalized.mine : normalized.partner
}

export function getTrendXAxisTicks(data = {}, activeTab = 'mine') {
  const dateDomain = getTrendDateDomain(data)
  const list = dateDomain?.labels?.length ? dateDomain.labels : selectTrendAxisList(data, activeTab).map(item => item.date || '')
  const labels = Array.from(new Set(list.filter(Boolean).map(normalizeTrendDate)))
  if (labels.length === 0) return []
  const total = labels.length
  const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
  const ticks = []
  if (maxTicks === 1) {
    return [labels[0]]
  }
  for (let i = 0; i < maxTicks; i += 1) {
    const index = Math.round((i / (maxTicks - 1)) * (total - 1))
    ticks.push(labels[index] || '')
  }
  return ticks
}

function getTrendX(item, index, seriesLength, dateDomain) {
  if (dateDomain) {
    const time = dateLabelToTime(item.date)
    if (Number.isFinite(time)) {
      if (dateDomain.maxTime === dateDomain.minTime) return 50
      return 5 + ((time - dateDomain.minTime) / (dateDomain.maxTime - dateDomain.minTime)) * 90
    }
  }
  return seriesLength === 1 ? 50 : 5 + (index / (seriesLength - 1)) * 90
}

function formatPercent(value) {
  const rounded = Math.round(value * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

function getAxisAlign(x) {
  if (x <= 12) return 'right'
  if (x >= 88) return 'left'
  return 'center'
}

export function formatTrendAxisLabel(label) {
  const normalized = normalizeTrendDate(label)
  const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return normalized
  return `${Number(match[2])}/${Number(match[3])}`
}

export function formatTrendValue(value, unit = '') {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  const abs = Math.abs(number)
  let formatted
  if (abs >= 100) {
    formatted = Math.round(number).toString()
  } else if (abs >= 10) {
    const rounded = Math.round(number * 10) / 10
    formatted = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1)
  } else {
    const rounded = Math.round(number * 100) / 100
    formatted = Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(2)
  }
  return unit ? `${formatted}${unit}` : formatted
}

export function buildTrendSummary(data = {}, activeTab = 'mine', options = {}) {
  const normalized = normalizeTrendData(data)
  const preferredKey = activeTab === 'partner' ? 'partner' : 'mine'
  const fallbackKey = preferredKey === 'mine' ? 'partner' : 'mine'
  const activeKey = normalized[preferredKey].length > 0 ? preferredKey : fallbackKey
  const series = getSortedSeries(normalized[activeKey])

  if (series.length === 0) return null

  const unit = options.unit || ''
  const metricLabel = options.metricLabel || '指标'
  const actorLabel = activeKey === 'partner'
    ? (options.partnerLabel || 'TA')
    : (options.mineLabel || '我')
  const otherKey = activeKey === 'mine' ? 'partner' : 'mine'
  const otherLabel = otherKey === 'partner'
    ? (options.partnerLabel || 'TA')
    : (options.mineLabel || '我')
  const latest = series[series.length - 1]
  const first = series[0]
  const change = latest.value - first.value
  const hasChange = series.length > 1
  const direction = !hasChange || Math.abs(change) < 0.005
    ? 'flat'
    : (change > 0 ? 'up' : 'down')
  const changeText = hasChange
    ? `较首日 ${change > 0 ? '+' : ''}${formatTrendValue(change, unit)}`
    : '只有 1 次记录'

  const otherSeries = getSortedSeries(normalized[otherKey])
  const otherLatest = otherSeries[otherSeries.length - 1]
  const comparisonText = otherLatest
    ? `${otherLabel}最近 ${formatTrendValue(otherLatest.value, unit)}`
    : ''

  const latestDateLabel = formatTrendAxisLabel(latest.date)
  const latestText = formatTrendValue(latest.value, unit)
  const sampleText = `${series.length} 个记录点`

  return {
    actorKey: activeKey,
    actorLabel,
    metricLabel,
    latestDate: latest.date,
    latestDateLabel,
    latestText,
    changeText,
    sampleText,
    comparisonText,
    direction,
    ariaLabel: `${actorLabel}${metricLabel}最近值 ${latestText}${latestDateLabel ? `，日期 ${latestDateLabel}` : ''}，${changeText}，${sampleText}`
  }
}

export function shouldRenderTrendLine(list = [], minPoints = 4) {
  return getSortedSeries(list).length >= minPoints
}

export function buildTrendChartState(data = {}, activeTab = 'mine', options = {}) {
  const normalized = normalizeTrendData(data)
  const preferredKey = activeTab === 'partner' ? 'partner' : 'mine'
  const fallbackKey = preferredKey === 'mine' ? 'partner' : 'mine'
  const activeKey = normalized[preferredKey].length > 0 ? preferredKey : fallbackKey
  const activeSeries = getSortedSeries(normalized[activeKey])
  const otherKey = activeKey === 'mine' ? 'partner' : 'mine'
  const otherSeries = getSortedSeries(normalized[otherKey])
  const actorLabel = activeKey === 'partner'
    ? (options.partnerLabel || 'TA')
    : (options.mineLabel || '我')
  const metricLabel = options.metricLabel || '指标'
  const unit = options.unit || ''

  if (activeSeries.length === 0) {
    return {
      activeKey,
      actorLabel,
      metricLabel,
      mode: 'empty',
      statusLabel: '还没有数据',
      coverageLabel: '0 个记录点',
      guidance: `记录一次${metricLabel}后先展示最近值，满 4 次后显示趋势线。`,
      showActiveLine: false,
      sampleCount: 0,
      latestRows: []
    }
  }

  const first = activeSeries[0]
  const latest = activeSeries[activeSeries.length - 1]
  const firstTime = dateLabelToTime(first.date)
  const latestTime = dateLabelToTime(latest.date)
  const spanDays = Number.isFinite(firstTime) && Number.isFinite(latestTime)
    ? Math.max(1, Math.round((latestTime - firstTime) / 86400000) + 1)
    : null
  const coverageLabel = spanDays
    ? `${activeSeries.length} 个记录点 · 覆盖 ${spanDays} 天`
    : `${activeSeries.length} 个记录点`

  let mode = 'trend'
  let statusLabel = '趋势可信'
  let guidance = '样本已足够看方向变化，仍建议结合记录日期和备注判断。'

  if (activeSeries.length === 1) {
    mode = 'single'
    statusLabel = '只有 1 次记录'
    guidance = '先把最近值固定展示，再记录 3 次后生成趋势线。'
  } else if (activeSeries.length < 4) {
    mode = 'sparse'
    statusLabel = '趋势建立中'
    guidance = `已有 ${activeSeries.length} 次记录，先看最近变化，满 4 次后再判断走势。`
  }

  const latestRows = [
    {
      key: activeKey,
      actorLabel,
      date: latest.date,
      dateLabel: formatTrendAxisLabel(latest.date),
      valueText: formatTrendValue(latest.value, unit)
    }
  ]

  const otherLatest = otherSeries[otherSeries.length - 1]
  if (otherLatest) {
    latestRows.push({
      key: otherKey,
      actorLabel: otherKey === 'partner' ? (options.partnerLabel || 'TA') : (options.mineLabel || '我'),
      date: otherLatest.date,
      dateLabel: formatTrendAxisLabel(otherLatest.date),
      valueText: formatTrendValue(otherLatest.value, unit)
    })
  }

  return {
    activeKey,
    actorLabel,
    metricLabel,
    mode,
    statusLabel,
    coverageLabel,
    guidance,
    showActiveLine: activeSeries.length >= 4,
    sampleCount: activeSeries.length,
    latestRows
  }
}

export function getTrendXAxisTickItems(data = {}, activeTab = 'mine') {
  const labels = getTrendXAxisTicks(data, activeTab)
  if (labels.length === 0) return []

  const dateDomain = getTrendDateDomain(data)
  const total = labels.length
  return labels.map((label, index) => {
    const time = dateLabelToTime(label)
    let x
    if (dateDomain && Number.isFinite(time)) {
      x = dateDomain.maxTime === dateDomain.minTime
        ? 50
        : 5 + ((time - dateDomain.minTime) / (dateDomain.maxTime - dateDomain.minTime)) * 90
    } else {
      x = total === 1 ? 50 : 5 + (index / (total - 1)) * 90
    }

    return {
      label,
      displayLabel: formatTrendAxisLabel(label),
      align: getAxisAlign(x),
      style: { left: `${formatPercent(x)}%` }
    }
  })
}

export function buildTrendPath(list = [], rangeObj = { min: 0, max: 100 }, dateDomain = null) {
  const series = getSortedSeries(list)
  if (series.length < 2) return ''
  const { min, max } = rangeObj
  const range = max - min || 1
  const points = series.map((item, index) => {
    const x = getTrendX(item, index, series.length, dateDomain)
    const ratio = (item.value - min) / range
    const y = 95 - ratio * 90
    return { x, y: Math.max(5, Math.min(95, y)) }
  })

  let path = `M ${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]
    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }
  return path
}

export function buildTrendPoints(list = [], rangeObj = { min: 0, max: 100 }, dateDomain = null) {
  const series = getSortedSeries(list)
  if (series.length === 0) return []
  const { min, max } = rangeObj
  const range = max - min || 1
  return series.map((item, index) => {
    const x = getTrendX(item, index, series.length, dateDomain)
    const ratio = (item.value - min) / range
    const y = 95 - ratio * 90
    return {
      date: item.date,
      value: item.value,
      tooltipAlign: x <= 12 ? 'right' : (x >= 88 ? 'left' : 'center'),
      style: {
        left: `${x}%`,
        top: `${Math.max(5, Math.min(95, y))}%`
      }
    }
  })
}
