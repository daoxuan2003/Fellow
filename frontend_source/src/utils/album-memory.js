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

const TYPE_PROMPTS = {
  normal: {
    title: '补一段日常',
    copy: '拍下今天最普通但只属于你们的瞬间。',
    cta: '记录日常'
  },
  travel: {
    title: '补一段出行',
    copy: '把城市、车票、街景或一次散步放进足迹里。',
    cta: '记录旅行'
  },
  food: {
    title: '补一顿饭',
    copy: '给一起吃过的味道留下照片和标签。',
    cta: '记录美食'
  }
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
  const nowDate = parsePhotoDate(now)
  const daysSinceLatest = latestDate && nowDate
    ? Math.max(0, Math.floor((nowDate.getTime() - latestDate.getTime()) / 86400000))
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

export function buildAlbumStoryBoard(photos = [], now = new Date()) {
  const stats = buildAlbumStats(photos, now)
  const sorted = sortPhotosByMemoryDate(photos)
  const lanes = TYPE_ORDER.map(type => {
    const lanePhotos = sorted.filter(photo => (photo.type || 'normal') === type)
    const latest = lanePhotos[0] || null
    const latestDate = latest ? formatAlbumDate(latest.date || latest.createdAt) : '等待记录'
    const share = stats.total ? Math.round(lanePhotos.length / stats.total * 100) : 0
    return {
      type,
      label: getPhotoTypeLabel(type),
      tone: getPhotoTypeTone(type),
      count: lanePhotos.length,
      latest,
      latestDate,
      share,
      status: lanePhotos.length ? `${latestDate} · ${lanePhotos.length} 张` : TYPE_PROMPTS[type].copy
    }
  })

  const missingLane = lanes.find(lane => lane.count === 0)
  const lightestLane = [...lanes].sort((a, b) => a.count - b.count || typeOrderValue(a.type) - typeOrderValue(b.type))[0]
  const nextLane = missingLane || lightestLane || lanes[0]
  const recentChapter = stats.monthGroups[0] || null
  const topTags = stats.tags.slice(0, 3).map(tag => `#${tag.name}`).join(' ')
  const coverage = lanes.filter(lane => lane.count > 0).length

  let rhythm = {
    tone: 'empty',
    title: '从第一张照片开始建档',
    copy: '先留下一个生活片段，后面会自动形成月份、主题和回忆线索。'
  }
  if (stats.total > 0) {
    if (stats.daysSinceLatest === null) {
      rhythm = {
        tone: 'steady',
        title: '已有照片，等待补齐日期',
        copy: '给旧照片补上发生日期后，月份章节会更准确。'
      }
    } else if (stats.daysSinceLatest <= 1) {
      rhythm = {
        tone: 'fresh',
        title: '最近仍在记录',
        copy: recentChapter ? `${recentChapter.label} 已经留下 ${recentChapter.count} 张，故事还在继续。` : '最近刚刚补充了新的生活片段。'
      }
    } else if (stats.daysSinceLatest > 14) {
      rhythm = {
        tone: 'quiet',
        title: '生活档案需要续上',
        copy: `距离上次记录已经 ${stats.daysSinceLatest} 天，可以补一张最近的日常。`
      }
    } else {
      rhythm = {
        tone: 'steady',
        title: '记录节奏稳定',
        copy: `最近一次记录在 ${stats.daysSinceLatest} 天前，继续保持轻量沉淀。`
      }
    }
  }

  const chapterSummary = recentChapter
    ? `${recentChapter.label} · ${recentChapter.count} 张${recentChapter.tags.length ? ` · ${recentChapter.tags.map(tag => `#${tag.name}`).join(' ')}` : ''}`
    : '还没有月份章节'
  const coverPhoto = sorted[0] || null
  const coverTitle = coverPhoto?.caption?.trim() || (coverPhoto ? `${getPhotoTypeTone(coverPhoto.type)} · ${formatAlbumDate(coverPhoto.date || coverPhoto.createdAt)}` : '等待第一张照片')
  const coverMeta = coverPhoto
    ? `${formatAlbumDate(coverPhoto.date || coverPhoto.createdAt)} · ${stats.monthCount} 个月份 · ${stats.dayCount} 个日子`
    : '上传第一张照片后，会自动生成你们的回忆章节。'
  const archiveSentence = stats.total
    ? `用 ${stats.total} 张照片，收住 ${stats.monthCount} 个月、${stats.dayCount} 个日子。`
    : '还没有照片，先把今天的一小段生活放进来。'
  const chapterStrip = stats.monthGroups.slice(0, 4).map(group => ({
    key: group.key,
    label: group.label,
    count: group.count,
    hero: group.hero,
    tags: group.tags,
    summary: `${group.count} 张${group.tags.length ? ` · ${group.tags.map(tag => `#${tag.name}`).join(' ')}` : ''}`
  }))
  const metrics = [
    { key: 'photos', label: '照片', value: String(stats.total), meta: '共同片段' },
    { key: 'months', label: '月份', value: String(stats.monthCount), meta: recentChapter?.label || '等待章节' },
    { key: 'days', label: '日子', value: String(stats.dayCount), meta: '被记住' },
    { key: 'theme', label: '主题', value: stats.topTag?.name || getPhotoTypeLabel(stats.topType), meta: '高频线索' }
  ]

  return {
    lanes,
    coverage,
    rhythm,
    cover: {
      photo: coverPhoto,
      title: coverTitle,
      meta: coverMeta,
      tone: coverPhoto ? getPhotoTypeTone(coverPhoto.type) : '第一张照片',
      archiveSentence
    },
    metrics,
    chapterStrip,
    chapter: recentChapter ? {
      key: recentChapter.key,
      label: recentChapter.label,
      count: recentChapter.count,
      hero: recentChapter.hero,
      tags: recentChapter.tags,
      summary: chapterSummary
    } : null,
    nextPrompt: {
      type: nextLane?.type || 'normal',
      lane: nextLane?.label || '日常',
      title: TYPE_PROMPTS[nextLane?.type || 'normal'].title,
      copy: TYPE_PROMPTS[nextLane?.type || 'normal'].copy,
      cta: TYPE_PROMPTS[nextLane?.type || 'normal'].cta
    },
    headline: stats.total
      ? `${stats.monthCount} 个月份，${coverage}/3 条生活线已点亮`
      : '还没有生活档案',
    subline: stats.total
      ? (topTags ? `高频主题 ${topTags}` : '继续用标签把回忆串起来。')
      : '上传第一张照片后，会自动生成你们的回忆章节。'
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
