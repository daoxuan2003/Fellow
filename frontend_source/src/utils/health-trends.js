export function normalizeTrendSeries(list = []) {
  if (!Array.isArray(list)) return []
  return list
    .map(item => {
      if (item?.value === null || item?.value === undefined || item?.value === '') return null
      const value = Number(item?.value)
      if (!Number.isFinite(value)) return null
      return {
        ...item,
        value
      }
    })
    .filter(Boolean)
}

export function normalizeTrendData(data = {}) {
  return {
    mine: normalizeTrendSeries(data?.mine),
    partner: normalizeTrendSeries(data?.partner)
  }
}

export function hasTrendData(data = {}) {
  const normalized = normalizeTrendData(data)
  return normalized.mine.length > 0 || normalized.partner.length > 0
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
  const list = selectTrendAxisList(data, activeTab)
  if (list.length === 0) return []
  const total = list.length
  const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
  const ticks = []
  if (maxTicks === 1) {
    return [list[0]?.date || '']
  }
  for (let i = 0; i < maxTicks; i += 1) {
    const index = Math.round((i / (maxTicks - 1)) * (total - 1))
    ticks.push(list[index]?.date || '')
  }
  return ticks
}

export function buildTrendPath(list = [], rangeObj = { min: 0, max: 100 }) {
  const series = normalizeTrendSeries(list)
  if (series.length < 2) return ''
  const { min, max } = rangeObj
  const range = max - min || 1
  const points = series.map((item, index) => {
    const x = series.length === 1 ? 50 : 5 + (index / (series.length - 1)) * 90
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

export function buildTrendPoints(list = [], rangeObj = { min: 0, max: 100 }) {
  const series = normalizeTrendSeries(list)
  if (series.length === 0) return []
  const { min, max } = rangeObj
  const range = max - min || 1
  return series.map((item, index) => {
    const x = series.length === 1 ? 50 : 5 + (index / (series.length - 1)) * 90
    const ratio = (item.value - min) / range
    const y = 95 - ratio * 90
    return {
      value: item.value,
      style: {
        left: `${x}%`,
        top: `${Math.max(5, Math.min(95, y))}%`
      }
    }
  })
}
