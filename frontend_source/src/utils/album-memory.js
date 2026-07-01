const TYPE_LABELS = {
  normal: '日常',
  travel: '旅行',
  food: '美食'
}

const TYPE_TONES = {
  normal: '生活切片',
  travel: '出发与抵达',
  food: '一起吃过'
}

const TYPE_ORDER = ['normal', 'travel', 'food']

function typeOrderValue(type) {
  const index = TYPE_ORDER.indexOf(type)
  return index === -1 ? TYPE_ORDER.length : index
}

function parsePhotoDate(value) {
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

function padDatePart(value) {
  return String(value).padStart(2, '0')
}

function toDateKey(value) {
  const date = parsePhotoDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

function toMonthKey(value) {
  const date = parsePhotoDate(value)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') return '未标注日期'
  const [year, month] = monthKey.split('-')
  return `${year}年${Number(month)}月`
}

function monthSortValue(monthKey) {
  if (monthKey === 'unknown') return -Infinity
  const [year, month] = monthKey.split('-').map(Number)
  return year * 12 + month
}

function photoTime(photo) {
  const date = parsePhotoDate(photo?.date)
  if (date) return date.getTime()
  const createdAt = parsePhotoDate(photo?.createdAt)
  return createdAt ? createdAt.getTime() : 0
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return []
  return [...new Set(tags.map(tag => String(tag || '').trim()).filter(Boolean))]
}

export function getPhotoTypeLabel(type) {
  return TYPE_LABELS[type] || TYPE_LABELS.normal
}

export function getPhotoTypeTone(type) {
  return TYPE_TONES[type] || TYPE_TONES.normal
}

export function formatAlbumDate(value) {
  const key = toDateKey(value)
  if (!key) return '未标注日期'
  const [, month, day] = key.split('-')
  return `${Number(month)}月${Number(day)}日`
}

export function sortPhotosByMemoryDate(photos = []) {
  return [...photos].sort((a, b) => photoTime(b) - photoTime(a))
}

export function buildAlbumTags(photos = []) {
  const tagMap = new Map()
  photos.forEach(photo => {
    normalizeTags(photo.tags).forEach(tag => {
      tagMap.set(tag, (tagMap.get(tag) || 0) + 1)
    })
  })
  return [...tagMap.entries()]
    .map(([name, count], index) => ({ name, count, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ name, count }) => ({ name, count }))
}

export function buildAlbumMonthGroups(photos = []) {
  const groups = new Map()
  sortPhotosByMemoryDate(photos).forEach(photo => {
    const key = toMonthKey(photo.date || photo.createdAt)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatMonthLabel(key),
        photos: [],
        tags: []
      })
    }
    groups.get(key).photos.push(photo)
  })

  return [...groups.values()]
    .sort((a, b) => monthSortValue(b.key) - monthSortValue(a.key))
    .map(group => ({
      ...group,
      count: group.photos.length,
      hero: group.photos[0] || null,
      tags: buildAlbumTags(group.photos).slice(0, 4)
    }))
}

export function buildAlbumStats(photos = [], now = new Date()) {
  const sorted = sortPhotosByMemoryDate(photos)
  const monthGroups = buildAlbumMonthGroups(sorted)
  const tags = buildAlbumTags(sorted)
  const dayCount = new Set(sorted.map(photo => toDateKey(photo.date || photo.createdAt)).filter(Boolean)).size
  const typeCounts = sorted.reduce((acc, photo) => {
    const type = photo.type || 'normal'
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const topType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1] || typeOrderValue(a[0]) - typeOrderValue(b[0]))[0]?.[0] || 'normal'
  const latest = sorted[0] || null
  const latestDate = latest ? parsePhotoDate(latest.date || latest.createdAt) : null
  const daysSinceLatest = latestDate
    ? Math.max(0, Math.floor((parsePhotoDate(now).getTime() - latestDate.getTime()) / 86400000))
    : null

  return {
    total: sorted.length,
    dayCount,
    monthCount: monthGroups.length,
    latest,
    topType,
    topTag: tags[0] || null,
    typeCounts,
    monthGroups,
    tags,
    daysSinceLatest
  }
}

export function filterAlbumPhotos(photos = [], filters = {}) {
  const { type = 'all', tag = 'all', month = 'all' } = filters
  return sortPhotosByMemoryDate(photos).filter(photo => {
    if (type !== 'all' && (photo.type || 'normal') !== type) return false
    if (tag !== 'all' && !normalizeTags(photo.tags).includes(tag)) return false
    if (month !== 'all' && toMonthKey(photo.date || photo.createdAt) !== month) return false
    return true
  })
}

export function buildMasonryColumns(photos = [], columnCount = 2) {
  const safeCount = Math.max(1, Number(columnCount) || 1)
  const columns = Array.from({ length: safeCount }, () => [])
  const heights = Array(safeCount).fill(0)

  photos.forEach(photo => {
    const target = heights.indexOf(Math.min(...heights))
    columns[target].push(photo)
    const ratio = Number(photo.aspectRatio) || 1
    heights[target] += ratio < 1 ? 1.45 : ratio > 1.25 ? 0.78 : 1
  })

  return columns
}
