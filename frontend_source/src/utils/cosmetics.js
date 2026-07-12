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

export function buildCosmeticCarePlan(items = []) {
  const dashboard = buildCosmeticDashboard(items)
  const actions = []

  if (dashboard.expired > 0) {
    actions.push({
      type: 'expired',
      title: '先停用过期品',
      detail: `${dashboard.expired} 件需要确认是否停用、空瓶或删除`,
      tone: 'danger'
    })
  }

  if (dashboard.expiring > 0) {
    actions.push({
      type: 'expiring',
      title: '临期优先摆到前排',
      detail: `${dashboard.expiring} 件进入提醒窗口，适合放进本周使用区`,
      tone: 'warning'
    })
  }

  if (dashboard.next && dashboard.expiring === 0 && dashboard.expired === 0) {
    actions.push({
      type: 'next',
      title: '下一件到期已锁定',
      detail: `${dashboard.next.name} 还有 ${dashboard.next.daysLeft} 天`,
      tone: 'active'
    })
  }

  if (dashboard.empty > 0) {
    actions.push({
      type: 'empty',
      title: '空瓶可复盘',
      detail: `${dashboard.empty} 件已归档，适合对比回购价值`,
      tone: 'neutral'
    })
  }

  if (dashboard.total === 0) {
    actions.push({
      type: 'setup',
      title: '先建第一层库存',
      detail: '上传产品照片、开封日和保质期后自动生成提醒',
      tone: 'neutral'
    })
  }

  return actions.slice(0, 3)
}

function uniqueItems(items = []) {
  const seen = new Set()
  return items.filter(item => {
    const key = item?.id || item?._id || item?.photoUrl || item?.name
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCosmeticVanityBoard(items = []) {
  const dashboard = buildCosmeticDashboard(items)
  const sorted = filterAndSortCosmetics(items, 'all')
  const daily = sorted.filter(item => getCosmeticStatus(item).key === 'active')
  const archive = sorted.filter(item => getCosmeticStatus(item).key === 'empty')
  const spotlightItems = uniqueItems([
    ...dashboard.urgent,
    dashboard.next,
    ...daily,
    ...archive
  ].filter(Boolean)).slice(0, 3)

  let stage = 'steady'
  let headline = '梳妆台状态干净'
  let detail = '当前没有过期或临期产品，可以按平常节奏使用。'
  let primaryAction = { type: 'filter', label: '查看在用', filter: 'active' }
  let secondaryAction = { type: 'add', label: '添加产品', filter: 'all' }

  if (dashboard.total === 0) {
    stage = 'empty'
    headline = '先放进第一件在用产品'
    detail = '拍照记录开封日和保质期，之后会自动提醒临期、过期和空瓶。'
    primaryAction = { type: 'add', label: '添加第一件', filter: 'all' }
    secondaryAction = { type: 'filter', label: '查看全部', filter: 'all' }
  } else if (dashboard.expired > 0) {
    stage = 'danger'
    headline = `今天先处理 ${dashboard.expired} 件过期品`
    detail = '把过期产品从日常区移开，确认停用、空瓶或删除，避免继续误用。'
    primaryAction = { type: 'filter', label: '查看过期', filter: 'expired' }
    secondaryAction = { type: 'filter', label: '查看空瓶', filter: 'empty' }
  } else if (dashboard.expiring > 0) {
    stage = 'warning'
    headline = `${dashboard.expiring} 件进入优先使用区`
    detail = '把临期产品摆到前排，本周先用它们，减少浪费。'
    primaryAction = { type: 'filter', label: '查看临期', filter: 'expiring' }
    secondaryAction = { type: 'add', label: '补充记录', filter: 'all' }
  } else if (dashboard.empty > 0) {
    stage = 'archive'
    headline = `${dashboard.empty} 件空瓶已归档`
    detail = '空瓶记录适合复盘使用速度、回购价值和下一次补货节奏。'
    primaryAction = { type: 'filter', label: '查看空瓶', filter: 'empty' }
    secondaryAction = { type: 'filter', label: '查看在用', filter: 'active' }
  }

  return {
    stage,
    headline,
    detail,
    primaryAction,
    secondaryAction,
    spotlightItems,
    ritual: [
      {
        key: 'front',
        label: '前排处理',
        value: String(dashboard.expired + dashboard.expiring),
        copy: dashboard.expired + dashboard.expiring > 0 ? '过期与临期先处理' : '暂无风险'
      },
      {
        key: 'daily',
        label: '日常在用',
        value: String(dashboard.active),
        copy: dashboard.next ? `${dashboard.next.name} 最近到期` : '等待添加在用品'
      },
      {
        key: 'archive',
        label: '空瓶复盘',
        value: String(dashboard.empty),
        copy: dashboard.empty ? '可回看回购价值' : '用完后归档'
      }
    ]
  }
}

export function buildCosmeticShelfSections(items = []) {
  const sorted = filterAndSortCosmetics(items, 'all')
  const risk = sorted.filter(item => ['expired', 'expiring'].includes(getCosmeticStatus(item).key)).slice(0, 4)
  const daily = sorted.filter(item => getCosmeticStatus(item).key === 'active').slice(0, 4)
  const archive = sorted.filter(item => getCosmeticStatus(item).key === 'empty').slice(0, 4)

  return [
    {
      id: 'risk',
      title: '风险前排',
      caption: risk.length ? '先处理过期和临期品' : '暂时没有过期或临期',
      tone: risk.length === 0 ? 'neutral' : (risk.some(item => getCosmeticStatus(item).key === 'expired') ? 'danger' : 'warning'),
      items: risk,
      empty: '没有需要立刻处理的产品'
    },
    {
      id: 'daily',
      title: '日常在用',
      caption: daily.length ? '保质期健康的当前库存' : '添加或恢复使用中的产品',
      tone: 'active',
      items: daily,
      empty: '暂无健康在用产品'
    },
    {
      id: 'archive',
      title: '空瓶归档',
      caption: archive.length ? '留下使用完的真实记录' : '用完后标记为空瓶',
      tone: 'neutral',
      items: archive,
      empty: '还没有空瓶记录'
    }
  ]
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
