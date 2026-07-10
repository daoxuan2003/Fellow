const padDatePart = (value) => String(value).padStart(2, '0')

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

function toMonthKey(value) {
  const date = parseDeliveryDate(value)
  if (!date) return 'unknown'
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}`
}

function toDateKey(value) {
  const date = parseDeliveryDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
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

function getDeliveryRole(delivery, currentUserId) {
  return sameUser(delivery?.requesterId, currentUserId) ? 'me' : 'partner'
}

function isUrgent(delivery) {
  return delivery?.priority === 'urgent'
}

export function sortPickedDeliveries(deliveries = []) {
  return [...deliveries].sort((a, b) => deliveryTime(b) - deliveryTime(a))
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
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = padDatePart(date.getHours())
  const minute = padDatePart(date.getMinutes())
  return `${month}月${day}日 ${hour}:${minute}`
}
