export function getCosmeticStatus(item = {}) {
  if (item.status === 'empty') {
    return {
      key: 'empty',
      label: '已用完',
      tone: 'neutral',
      priority: 4
    }
  }

  if (item.isExpired || Number(item.daysLeft) <= 0) {
    return {
      key: 'expired',
      label: '已过期',
      tone: 'danger',
      priority: 1
    }
  }

  if (item.isExpiringSoon) {
    return {
      key: 'expiring',
      label: `${Number(item.daysLeft)}天`,
      tone: 'warning',
      priority: 2
    }
  }

  return {
    key: 'active',
    label: '使用中',
    tone: 'active',
    priority: 3
  }
}

export function getCosmeticProgress(item = {}) {
  if (item.status === 'empty') return 100
  const totalDays = Number(item.shelfLifeMonths || 0) * 30
  if (!Number.isFinite(totalDays) || totalDays <= 0) return 0
  const passedDays = totalDays - Number(item.daysLeft || 0)
  return Math.min(Math.max(Math.round((passedDays / totalDays) * 100), 0), 100)
}

export function getCosmeticTimeCopy(item = {}) {
  const status = getCosmeticStatus(item)
  const daysLeft = Number(item.daysLeft)

  if (status.key === 'empty') return '已归入空瓶'
  if (status.key === 'expired') return `已过期 ${Math.abs(daysLeft || 0)} 天`
  if (status.key === 'expiring') return `还剩 ${daysLeft} 天，建议优先使用`
  return `还剩 ${daysLeft} 天`
}

export function buildCosmeticDashboard(items = []) {
  const total = items.length
  const active = items.filter(item => getCosmeticStatus(item).key === 'active').length
  const expired = items.filter(item => getCosmeticStatus(item).key === 'expired').length
  const expiring = items.filter(item => getCosmeticStatus(item).key === 'expiring').length
  const empty = items.filter(item => item.status === 'empty').length
  const urgent = items
    .filter(item => ['expired', 'expiring'].includes(getCosmeticStatus(item).key))
    .sort((a, b) => Number(a.daysLeft || 0) - Number(b.daysLeft || 0))
    .slice(0, 3)
  const next = items
    .filter(item => {
      const status = getCosmeticStatus(item).key
      return status !== 'empty' && status !== 'expired'
    })
    .sort((a, b) => Number(a.daysLeft || 0) - Number(b.daysLeft || 0))[0] || null

  let focusTitle = '化妆台状态稳定'
  let focusDetail = '没有临期或过期产品，继续保持开封记录。'
  let focusTone = 'active'

  if (expired > 0) {
    focusTitle = `${expired} 件已经过期`
    focusDetail = '建议先确认是否停用或删除，避免继续误用。'
    focusTone = 'danger'
  } else if (expiring > 0) {
    focusTitle = `${expiring} 件即将到期`
    focusDetail = '把临期产品放到优先使用区，减少浪费。'
    focusTone = 'warning'
  } else if (total === 0) {
    focusTitle = '还没有建立化妆台'
    focusDetail = '添加第一件产品后，会自动追踪开封和到期。'
    focusTone = 'neutral'
  }

  return {
    total,
    active,
    expired,
    expiring,
    empty,
    urgent,
    next,
    focusTitle,
    focusDetail,
    focusTone
  }
}


export function filterAndSortCosmetics(items = [], filter = 'all') {
  return [...items]
    .filter(item => {
      const status = getCosmeticStatus(item).key
      if (filter === 'all') return true
      if (filter === 'active') return status === 'active'
      if (filter === 'expiring') return status === 'expiring'
      if (filter === 'expired') return status === 'expired'
      if (filter === 'empty') return status === 'empty'
      return true
    })
    .sort((a, b) => {
      const statusA = getCosmeticStatus(a)
      const statusB = getCosmeticStatus(b)
      if (statusA.priority !== statusB.priority) return statusA.priority - statusB.priority
      return Number(a.daysLeft || 0) - Number(b.daysLeft || 0)
    })
}
