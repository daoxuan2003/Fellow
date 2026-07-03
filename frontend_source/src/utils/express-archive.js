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

export function formatExpressArchiveDate(value) {
  const date = parseDeliveryDate(value)
  if (!date) return '未标注时间'
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = padDatePart(date.getHours())
  const minute = padDatePart(date.getMinutes())
  return `${month}月${day}日 ${hour}:${minute}`
}
