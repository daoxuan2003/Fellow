const padDatePart = (value) => String(value).padStart(2, '0')
const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'
const shanghaiDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SHANGHAI_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})
const shanghaiHourFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHANGHAI_TIME_ZONE,
  hour: '2-digit',
  hourCycle: 'h23'
})
const shanghaiClockFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHANGHAI_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

function parseDeliveryDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function deliveryTime(delivery) {
  const picked = parseDeliveryDate(delivery?.pickedAt)
  if (picked) return picked.getTime()
  const created = parseDeliveryDate(delivery?.createdAt)
  return created ? created.getTime() : 0
}

function getShanghaiDateParts(value) {
  const date = parseDeliveryDate(value)
  if (!date) return null
  return shanghaiDateFormatter.formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value)
    return result
  }, {})
}

function toMonthKey(value) {
  const parts = getShanghaiDateParts(value)
  if (!parts) return 'unknown'
  return `${parts.year}-${padDatePart(parts.month)}`
}

function toDateKey(value) {
  const parts = getShanghaiDateParts(value)
  if (!parts) return ''
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`
}

function formatMonthLabel(monthKey) {
  if (!monthKey || monthKey === 'unknown') return '未标注月份'
  const [year, month] = monthKey.split('-')
  return `${year}年${Number(month)}月`
}

function monthSortValue(monthKey) {
  if (monthKey === 'unknown') return -Infinity
  const [year, month] = monthKey.split('-').map(Number)
  return year * 12 + month
}

function sameUser(left, right) {
  if (!left || !right) return false
  return String(left) === String(right)
}

function percentValue(part, total) {
  const safeTotal = Number(total)
  if (!Number.isFinite(safeTotal) || safeTotal <= 0) return 0
  return Math.max(0, Math.min(100, Math.round(Number(part || 0) / safeTotal * 100)))
}

function countByLocation(deliveries = []) {
  const counts = new Map()
  deliveries.forEach(delivery => {
    const location = String(delivery?.pickupLocation || '').trim()
    if (!location) return
    counts.set(location, (counts.get(location) || 0) + 1)
  })

  return [...counts.entries()]
    .map(([name, count], index) => ({ name, count, index }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ name, count }) => ({ name, count }))
}

const WEEKDAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const TIME_SLOTS = [
  { id: 'early', label: '清晨', range: '06:00-09:00', start: 6, end: 9 },
  { id: 'morning', label: '上午', range: '09:00-12:00', start: 9, end: 12 },
  { id: 'noon', label: '午间', range: '12:00-14:00', start: 12, end: 14 },
  { id: 'afternoon', label: '下午', range: '14:00-18:00', start: 14, end: 18 },
  { id: 'evening', label: '晚间', range: '18:00-24:00', start: 18, end: 24 },
  { id: 'late', label: '深夜', range: '00:00-06:00', start: 0, end: 6 }
]

function rankedCounts(items = [], getKey) {
  const counts = new Map()
  items.forEach((item, index) => {
    const key = getKey(item)
    if (!key) return
    const current = counts.get(key.id) || { ...key, count: 0, firstIndex: index }
    current.count += 1
    current.firstIndex = Math.min(current.firstIndex, index)
    counts.set(key.id, current)
  })

  return [...counts.values()].sort((a, b) => b.count - a.count || a.firstIndex - b.firstIndex)
}

function getPickedDate(delivery) {
  return parseDeliveryDate(delivery?.pickedAt || delivery?.createdAt)
}

function getWeekdayKey(delivery) {
  const parts = getShanghaiDateParts(getPickedDate(delivery))
  if (!parts) return null
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  return { id: String(weekday), label: WEEKDAY_LABELS[weekday] }
}

function getTimeSlotKey(delivery) {
  const date = getPickedDate(delivery)
  if (!date) return null
  const hour = Number(shanghaiHourFormatter.format(date))
  const slot = TIME_SLOTS.find(item => hour >= item.start && hour < item.end) || TIME_SLOTS[TIME_SLOTS.length - 1]
  return { id: slot.id, label: slot.label, range: slot.range }
}

function getDeliveryRole(delivery, currentUserId) {
  return sameUser(delivery?.requesterId, currentUserId) ? 'me' : 'partner'
}

function isUrgent(delivery) {
  return delivery?.priority === 'urgent'
}

export function sortPickedDeliveries(deliveries = []) {
  return [...deliveries].sort((a, b) => deliveryTime(b) - deliveryTime(a))
}

export function isDeliveryPickedToday(delivery, now = new Date()) {
  if (delivery?.status !== 'picked' || delivery?.archivedAt) return false
  const pickedDateKey = toDateKey(delivery?.pickedAt)
  return Boolean(pickedDateKey && pickedDateKey === toDateKey(now))
}

export function partitionExpressDeliveries(deliveries = [], now = new Date()) {
  const pending = deliveries.filter(delivery => delivery?.status === 'pending' && !delivery?.archivedAt)
  const pickedToday = deliveries.filter(delivery => isDeliveryPickedToday(delivery, now))
  const archived = deliveries.filter(delivery => Boolean(delivery?.archivedAt) || (delivery?.status === 'picked' && !isDeliveryPickedToday(delivery, now)))

  return {
    pending,
    pickedToday: sortPickedDeliveries(pickedToday),
    archived: sortPickedDeliveries(archived)
  }
}

export function filterPickedDeliveries(deliveries = [], filter = 'all', currentUserId = '') {
  const sorted = sortPickedDeliveries(deliveries)
  if (filter === 'me') return sorted.filter(delivery => getDeliveryRole(delivery, currentUserId) === 'me')
  if (filter === 'partner') return sorted.filter(delivery => getDeliveryRole(delivery, currentUserId) === 'partner')
  if (filter === 'urgent') return sorted.filter(isUrgent)
  return sorted
}

export function buildExpressMonthGroups(deliveries = [], currentUserId = '') {
  const groups = new Map()

  sortPickedDeliveries(deliveries).forEach(delivery => {
    const key = toMonthKey(delivery.pickedAt || delivery.createdAt)
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: formatMonthLabel(key),
        items: []
      })
    }
    groups.get(key).items.push(delivery)
  })

  return [...groups.values()]
    .sort((a, b) => monthSortValue(b.key) - monthSortValue(a.key))
    .map(group => {
      const mine = group.items.filter(delivery => getDeliveryRole(delivery, currentUserId) === 'me').length
      const partner = group.items.length - mine
      const urgent = group.items.filter(isUrgent).length
      return {
        ...group,
        count: group.items.length,
        mine,
        partner,
        urgent,
        latestAt: group.items[0]?.pickedAt || group.items[0]?.createdAt || null,
        locations: countByLocation(group.items).slice(0, 3)
      }
    })
}

export function buildExpressArchive(deliveries = [], currentUserId = '', now = new Date()) {
  const sorted = sortPickedDeliveries(deliveries)
  const nowDate = parseDeliveryDate(now) || new Date()
  const thirtyDaysAgo = new Date(nowDate)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const currentMonthKey = toMonthKey(nowDate)
  const pickedDays = new Set(sorted.map(delivery => toDateKey(delivery.pickedAt || delivery.createdAt)).filter(Boolean))
  const mine = sorted.filter(delivery => getDeliveryRole(delivery, currentUserId) === 'me').length
  const partner = sorted.length - mine

  return {
    total: sorted.length,
    mine,
    partner,
    urgent: sorted.filter(isUrgent).length,
    helpedPartner: sorted.filter(delivery => getDeliveryRole(delivery, currentUserId) === 'partner' && sameUser(delivery?.pickerId, currentUserId)).length,
    thisMonth: sorted.filter(delivery => toMonthKey(delivery.pickedAt || delivery.createdAt) === currentMonthKey).length,
    recent30Days: sorted.filter(delivery => {
      const date = parseDeliveryDate(delivery.pickedAt || delivery.createdAt)
      return date ? date >= thirtyDaysAgo && date <= nowDate : false
    }).length,
    pickedDayCount: pickedDays.size,
    latest: sorted[0] || null,
    topLocations: countByLocation(sorted).slice(0, 4),
    monthGroups: buildExpressMonthGroups(sorted, currentUserId)
  }
}

export function buildExpressArchiveStory(deliveries = [], currentUserId = '', now = new Date()) {
  const archive = buildExpressArchive(deliveries, currentUserId, now)
  const topLocation = archive.topLocations[0] || null
  const busiestMonth = archive.monthGroups.reduce((best, group) => {
    if (!best || group.count > best.count) return group
    return best
  }, null)
  const helpRatio = percentValue(archive.helpedPartner, archive.total)

  return [
    {
      id: 'span',
      title: '归档跨度',
      value: archive.monthGroups.length > 0 ? `${archive.monthGroups.length}个月` : '待沉淀',
      detail: archive.pickedDayCount > 0
        ? `${archive.pickedDayCount}个取件日，近30天${archive.recent30Days}件`
        : '完成取件后自动进入归档',
      tone: 'slate'
    },
    {
      id: 'route',
      title: '高频路线',
      value: topLocation?.name || '暂无地点',
      detail: topLocation ? `${topLocation.count}次经过这里` : '常用地点会形成路线记忆',
      tone: 'logistics'
    },
    {
      id: 'support',
      title: '互助证据',
      value: archive.helpedPartner > 0 ? `${archive.helpedPartner}次` : '待解锁',
      detail: archive.total > 0 ? `帮对方取件占比${helpRatio}%` : '替对方取件会沉淀在这里',
      tone: archive.helpedPartner > 0 ? 'support' : 'neutral'
    },
    {
      id: 'peak',
      title: '最忙月份',
      value: busiestMonth?.label || '暂无月份',
      detail: busiestMonth
        ? `${busiestMonth.count}件，${busiestMonth.locations[0]?.name || '多地点'}最常见`
        : '归档后按月份自动折叠',
      tone: 'month'
    }
  ]
}

export function buildExpressArchiveReview(deliveries = [], currentUserId = '', now = new Date()) {
  const archive = buildExpressArchive(deliveries, currentUserId, now)
  const sorted = sortPickedDeliveries(deliveries)
  const total = archive.total
  const topLocation = archive.topLocations[0] || null
  const weekday = rankedCounts(sorted, getWeekdayKey)[0] || null
  const timeSlot = rankedCounts(sorted, getTimeSlotKey)[0] || null
  const helpRatio = percentValue(archive.helpedPartner, total)
  const route = archive.topLocations.slice(0, 3).map((location, index) => ({
    ...location,
    rank: index + 1,
    share: percentValue(location.count, total)
  }))

  if (total === 0) {
    return {
      title: '等待第一条归档',
      subtitle: '取件完成后会自动形成路线、时段和互助复盘。',
      route,
      rhythm: [
        { id: 'weekday', label: '高发星期', value: '待观察', detail: '有归档后识别星期节奏' },
        { id: 'time', label: '常取时段', value: '待观察', detail: '取件时间会形成高峰时段' },
        { id: 'support', label: '互助比例', value: '0%', detail: '帮对方取件会沉淀在这里' }
      ],
      nextStep: {
        title: '先完成一次取件',
        detail: '归档会自动记录地点、时间、发起人和取件人。'
      }
    }
  }

  let nextStep = {
    title: '每月底复盘取件路线',
    detail: '用归档记录判断常用地点、取件时段和谁更适合顺路处理。'
  }

  if (archive.urgent > 0) {
    nextStep = {
      title: '给紧急件保留清晰备注',
      detail: '紧急件占比越高，越需要写清楼栋、柜号或截止时间。'
    }
  } else if (topLocation?.count >= 3) {
    nextStep = {
      title: '把高频地点做成默认取件点',
      detail: `${topLocation.name}已经出现${topLocation.count}次，适合固定命名和备注格式。`
    }
  } else if (archive.helpedPartner === 0 && archive.partner > 0) {
    nextStep = {
      title: '下一次试着替对方处理一件',
      detail: '互助记录会让归档不只是物流流水，也能看见关系里的照顾。'
    }
  }

  return {
    title: topLocation ? `${topLocation.name}是主要取件路线` : '取件路线开始成形',
    subtitle: `${archive.pickedDayCount}个取件日，${archive.monthGroups.length}个月份，近30天${archive.recent30Days}件。`,
    route,
    rhythm: [
      {
        id: 'weekday',
        label: '高发星期',
        value: weekday?.label || '待观察',
        detail: weekday ? `${weekday.count}件，占${percentValue(weekday.count, total)}%` : '更多归档后识别星期节奏'
      },
      {
        id: 'time',
        label: '常取时段',
        value: timeSlot?.label || '待观察',
        detail: timeSlot ? `${timeSlot.range} · ${timeSlot.count}件` : '取件时间会形成高峰时段'
      },
      {
        id: 'support',
        label: '互助比例',
        value: `${helpRatio}%`,
        detail: archive.helpedPartner > 0 ? `我帮对方取 ${archive.helpedPartner}/${total} 件` : '帮对方取件会沉淀在这里'
      }
    ],
    nextStep
  }
}

export function buildExpressArchiveTimeline(deliveries = [], currentUserId = '', limit = 5) {
  return sortPickedDeliveries(deliveries)
    .slice(0, Math.max(0, limit))
    .map((delivery, index) => {
      const pickedAt = delivery?.pickedAt || delivery?.createdAt || null
      return {
        id: delivery?.id || delivery?._id || `${delivery?.trackingNo || 'delivery'}-${index}`,
        trackingNo: String(delivery?.trackingNo || '未标注取件码'),
        location: String(delivery?.pickupLocation || '未标注地点'),
        description: String(delivery?.description || ''),
        priority: delivery?.priority || 'normal',
        requesterRole: getDeliveryRole(delivery, currentUserId),
        actor: sameUser(delivery?.pickerId, currentUserId)
          ? '我完成取件'
          : `${delivery?.picker?.nickname || '对方'}完成取件`,
        pickedAt,
        timeLabel: formatExpressArchiveDate(pickedAt)
      }
    })
}

export function formatExpressArchiveDate(value) {
  const date = parseDeliveryDate(value)
  if (!date) return '未标注时间'
  const parts = getShanghaiDateParts(date)
  const clock = shanghaiClockFormatter.format(date)
  return `${parts.month}月${parts.day}日 ${clock}`
}
