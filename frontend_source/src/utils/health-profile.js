export const HEALTH_BASIC_KEYS = ['height', 'weight', 'bodyFat']

export const HEALTH_MEASUREMENT_KEYS = [
  'chest',
  'chestUpper',
  'chestLower',
  'waist',
  'hip',
  'arm',
  'thigh',
  'calf',
  'shoulder'
]

export const HEALTH_FIELD_LABELS = {
  height: '身高',
  weight: '体重',
  bodyFat: '体脂',
  chest: '胸围',
  chestUpper: '上胸围',
  chestLower: '下胸围',
  waist: '腰围',
  hip: '臀围',
  arm: '臂围',
  thigh: '大腿围',
  calf: '小腿围',
  shoulder: '肩宽'
}

const MALE_MEASUREMENT_KEYS = ['chest', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder']
const FEMALE_MEASUREMENT_KEYS = ['chestUpper', 'chestLower', 'waist', 'hip', 'arm', 'thigh', 'calf', 'shoulder']

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
}

const padDatePart = (value) => String(value).padStart(2, '0')

function parseDateOnlyStrict(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

function formatDateObject(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

export function formatHealthDate(value = new Date()) {
  if (value === null || value === undefined || value === '') return ''

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return parseDateOnlyStrict(trimmed) ? trimmed : ''
    }
    const parsed = new Date(trimmed)
    return formatDateObject(parsed)
  }

  return formatDateObject(value instanceof Date ? value : new Date(value))
}

export function todayHealthDate() {
  return formatHealthDate(new Date())
}

export function hasHealthMetricValue(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

export function formatHealthMetricValue(value, unit = '') {
  if (!hasHealthMetricValue(value)) return '-'
  const rounded = Math.round(Number(value) * 10) / 10
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return unit ? `${text} ${unit}` : text
}

function normalizeHealthNumber(value) {
  if (!hasHealthMetricValue(value)) return null
  return Math.round(Number(value) * 10) / 10
}

function normalizeMeasurements(measurements = {}) {
  return HEALTH_MEASUREMENT_KEYS.reduce((result, key) => {
    result[key] = normalizeHealthNumber(measurements?.[key])
    return result
  }, {})
}

function localDateTime(value) {
  const dateString = formatHealthDate(value)
  const parsed = parseDateOnlyStrict(dateString)
  return parsed ? parsed.getTime() : 0
}

function calendarDayDiff(laterValue, earlierValue) {
  const later = parseDateOnlyStrict(formatHealthDate(laterValue))
  const earlier = parseDateOnlyStrict(formatHealthDate(earlierValue))
  if (!later || !earlier) return null

  const laterDay = Date.UTC(later.getFullYear(), later.getMonth(), later.getDate())
  const earlierDay = Date.UTC(earlier.getFullYear(), earlier.getMonth(), earlier.getDate())
  return Math.round((laterDay - earlierDay) / 86400000)
}

function formatFreshnessLabel(daysSince) {
  if (!Number.isFinite(daysSince)) return '尚未记录'
  if (daysSince <= 0) return '今天更新'
  if (daysSince === 1) return '昨天更新'
  return `${daysSince} 天前更新`
}

function secondaryRecordTime(record = {}) {
  const updated = Date.parse(record.updatedAt || '')
  if (Number.isFinite(updated)) return updated
  const created = Date.parse(record.createdAt || '')
  return Number.isFinite(created) ? created : 0
}

export function compareHealthRecordsDesc(a = {}, b = {}) {
  return localDateTime(b.recordedAt) - localDateTime(a.recordedAt) ||
    secondaryRecordTime(b) - secondaryRecordTime(a)
}

export function normalizeHealthRecords(records = []) {
  if (!Array.isArray(records)) return []
  return records
    .filter(record => record && typeof record === 'object')
    .map(record => ({
      ...record,
      recordedAt: formatHealthDate(record.recordedAt),
      measurements: normalizeMeasurements(record.measurements)
    }))
    .sort(compareHealthRecordsDesc)
}

export function buildLatestHealthSnapshot(records = []) {
  const snapshot = {
    height: null,
    weight: null,
    bodyFat: null,
    measurements: normalizeMeasurements()
  }

  normalizeHealthRecords(records).forEach(record => {
    HEALTH_BASIC_KEYS.forEach(key => {
      if (!hasHealthMetricValue(snapshot[key]) && hasHealthMetricValue(record[key])) {
        snapshot[key] = normalizeHealthNumber(record[key])
      }
    })
    HEALTH_MEASUREMENT_KEYS.forEach(key => {
      const currentValue = snapshot.measurements[key]
      const recordValue = record.measurements?.[key]
      if (!hasHealthMetricValue(currentValue) && hasHealthMetricValue(recordValue)) {
        snapshot.measurements[key] = normalizeHealthNumber(recordValue)
      }
    })
  })

  return snapshot
}

export function calculateHealthBmi(snapshot = {}) {
  const height = Number(snapshot.height)
  const weight = Number(snapshot.weight)
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height <= 0 || weight <= 0) {
    return null
  }
  const heightInM = height / 100
  return (weight / (heightInM * heightInM)).toFixed(1)
}

export function getHealthFieldLabel(key) {
  return HEALTH_FIELD_LABELS[key] || key
}

export function getHealthMeasurementKeysForGender(gender = 'female') {
  return gender === 'male' ? MALE_MEASUREMENT_KEYS : FEMALE_MEASUREMENT_KEYS
}

export function getHealthBmiStatus(bmi) {
  if (!hasHealthMetricValue(bmi)) return null
  const value = Number(bmi)
  if (!Number.isFinite(value)) return null
  if (value < 18.5) return { label: '偏瘦', tone: 'low', detail: '可结合饮食和力量训练观察，不单独作为判断。' }
  if (value < 24) return { label: '标准', tone: 'steady', detail: '身高体重比例处在常见参考区间。' }
  if (value < 28) return { label: '偏高', tone: 'attention', detail: '建议结合腰围、体脂和近期变化一起看。' }
  return { label: '较高', tone: 'alert', detail: '建议结合医生或专业建议判断，不靠单一数值下结论。' }
}

export function buildHealthProfileBoard(records = [], options = {}) {
  const normalized = normalizeHealthRecords(records)
  const gender = options.gender || 'female'
  const actorLabel = options.actorLabel || '我'
  const today = formatHealthDate(options.today) || todayHealthDate()
  const measurementKeys = getHealthMeasurementKeysForGender(gender)
  const metricKeys = [...HEALTH_BASIC_KEYS, ...measurementKeys]
  const snapshot = buildLatestHealthSnapshot(normalized)
  const latestMetricRecord = normalized.find(record => hasAnyHealthMetric(record)) || null
  const latestRecord = normalized[0] || null

  const getSnapshotValue = (key) => (
    HEALTH_BASIC_KEYS.includes(key) ? snapshot[key] : snapshot.measurements?.[key]
  )
  const filledKeys = metricKeys.filter(key => hasHealthMetricValue(getSnapshotValue(key)))
  const missingKeys = metricKeys.filter(key => !hasHealthMetricValue(getSnapshotValue(key)))
  const total = metricKeys.length
  const completionPercent = total > 0 ? Math.round((filledKeys.length / total) * 100) : 0
  const rawDaysSince = latestMetricRecord ? calendarDayDiff(today, latestMetricRecord.recordedAt) : null
  const daysSince = Number.isFinite(rawDaysSince) ? Math.max(0, rawDaysSince) : null
  const bmi = calculateHealthBmi(snapshot)
  const bmiStatus = getHealthBmiStatus(bmi)

  let mode = 'ready'
  let statusLabel = '可参考'
  let headline = `${actorLabel}的身体档案保持可用`
  let detail = '基础数据和围度已经形成可参考基线，后续按变化频率补记即可。'
  let primaryAction = '更新一次'

  if (!normalized.length) {
    mode = 'empty'
    statusLabel = '待建立'
    headline = '先建立身体档案'
    detail = '记录身高、体重和一项围度，趋势才会有可信基线。'
    primaryAction = '建立档案'
  } else if (!latestMetricRecord) {
    mode = 'note-only'
    statusLabel = '缺关键数据'
    headline = '身体档案还缺关键数据'
    detail = '目前只有备注或日期记录，补一项身体数据后才能形成趋势。'
    primaryAction = '补身体数据'
  } else if (daysSince > 45) {
    mode = 'stale'
    statusLabel = '需要更新'
    headline = '身体档案需要更新'
    detail = `最近一次身体数据是 ${formatFreshnessLabel(daysSince)}，建议重新量一次关键指标。`
    primaryAction = '更新数据'
  } else if (completionPercent < 50) {
    mode = 'partial'
    statusLabel = '正在建立'
    headline = '身体档案正在建立'
    detail = '已经有可用记录，但关键项还不完整，先补齐基础指标和常看围度。'
    primaryAction = '补全档案'
  }

  return {
    mode,
    statusLabel,
    headline,
    detail,
    primaryAction,
    latestRecordDate: latestRecord?.recordedAt || '',
    latestMetricDate: latestMetricRecord?.recordedAt || '',
    freshness: {
      daysSince,
      label: formatFreshnessLabel(daysSince)
    },
    completion: {
      filled: filledKeys.length,
      total,
      percent: completionPercent,
      label: `${filledKeys.length}/${total} 项`
    },
    bmi: {
      value: bmi,
      label: bmi ? `${bmi} · ${bmiStatus?.label || '参考'}` : '需身高体重',
      status: bmiStatus
    },
    missingFields: missingKeys.map(key => ({ key, label: getHealthFieldLabel(key) })),
    filledFields: filledKeys.map(key => ({ key, label: getHealthFieldLabel(key) })),
    metrics: [
      {
        key: 'freshness',
        label: '最近更新',
        value: latestMetricRecord ? formatFreshnessLabel(daysSince) : '未记录',
        detail: latestMetricRecord?.recordedAt || '没有身体数据'
      },
      {
        key: 'completion',
        label: '完整度',
        value: `${completionPercent}%`,
        detail: `${filledKeys.length}/${total} 项可用`
      },
      {
        key: 'bmi',
        label: 'BMI参考',
        value: bmi || '-',
        detail: bmiStatus?.label || '需身高体重'
      }
    ]
  }
}

export function hasAnyHealthMetric(record = {}) {
  return HEALTH_BASIC_KEYS.some(key => hasHealthMetricValue(record[key])) ||
    HEALTH_MEASUREMENT_KEYS.some(key => hasHealthMetricValue(record.measurements?.[key]))
}

export function getHealthMonthKey(recordOrDate) {
  const rawDate = recordOrDate && typeof recordOrDate === 'object' && 'recordedAt' in recordOrDate
    ? recordOrDate.recordedAt
    : recordOrDate
  const date = formatHealthDate(rawDate)
  return date ? date.slice(0, 7) : ''
}

export function buildHealthMonthOptions(records = []) {
  const map = new Map()
  normalizeHealthRecords(records).forEach(record => {
    const value = getHealthMonthKey(record)
    if (!value || map.has(value)) return
    const [, month] = value.split('-')
    map.set(value, {
      value,
      label: `${value.slice(0, 4)}年${Number(month)}月`
    })
  })
  return Array.from(map.values())
}

export function filterHealthRecordsByMonth(records = [], selectedMonth = '') {
  const normalized = normalizeHealthRecords(records)
  if (!selectedMonth) return normalized
  return normalized.filter(record => getHealthMonthKey(record) === selectedMonth)
}

function sanitizeHealthNumber(value, key) {
  if (value === null || value === undefined || value === '') {
    return { value: null }
  }
  if (typeof value === 'string' && value.trim() === '') {
    return { value: null }
  }

  const limit = HEALTH_FIELD_LIMITS[key]
  const number = Number(value)
  if (!Number.isFinite(number)) {
    return { error: `${limit.label}格式不正确` }
  }
  if (number < limit.min || number > limit.max) {
    return { error: `${limit.label}超出合理范围` }
  }

  return { value: normalizeHealthNumber(number) }
}

export function sanitizeHealthPayload(form = {}) {
  const recordedAt = formatHealthDate(form.recordedAt)
  if (!recordedAt) {
    return { error: '请选择有效的记录日期' }
  }
  if (recordedAt > todayHealthDate()) {
    return { error: '记录日期不能晚于今天' }
  }

  const payload = {
    recordedAt,
    measurements: {},
    note: String(form.note || '').trim()
  }

  for (const key of HEALTH_BASIC_KEYS) {
    const result = sanitizeHealthNumber(form[key], key)
    if (result.error) return { error: result.error }
    payload[key] = result.value
  }

  for (const key of HEALTH_MEASUREMENT_KEYS) {
    const result = sanitizeHealthNumber(form.measurements?.[key], key)
    if (result.error) return { error: result.error }
    payload.measurements[key] = result.value
  }

  const hasMetric = HEALTH_BASIC_KEYS.some(key => hasHealthMetricValue(payload[key])) ||
    HEALTH_MEASUREMENT_KEYS.some(key => hasHealthMetricValue(payload.measurements[key]))

  if (!hasMetric && !payload.note) {
    return { error: '请至少填写一项身体数据或备注' }
  }

  return { payload }
}
