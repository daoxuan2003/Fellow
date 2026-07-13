function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function percent(completed, total) {
  const safeTotal = Math.max(0, toNumber(total))
  if (safeTotal === 0) return 0
  return Math.max(0, Math.min(100, Math.round(toNumber(completed) / safeTotal * 100)))
}

function formatMoney(value) {
  return toNumber(value).toFixed(0)
}

function normalizeStats(stats = {}) {
  return {
    express: { pending: 0, urgent: 0, ...(stats.express || {}) },
    habits: { total: 0, completed: 0, pending: 0, ...(stats.habits || {}) },
    wishes: { total: 0, completed: 0, pending: 0, ...(stats.wishes || {}) },
    mood: { today: false, partnerToday: false, myMood: '', partnerMood: '', ...(stats.mood || {}) },
    budget: { expense: 0, monthlyBudget: 0, remainingBudget: 0, ...(stats.budget || {}) },
    cosmetics: { total: 0, expiring: 0, expired: 0, ...(stats.cosmetics || {}) },
    health: { latestWeight: null, ...(stats.health || {}) },
    shopping: { pending: 0, ...(stats.shopping || {}) },
    album: { photos: 0, ...(stats.album || {}) }
  }
}

function budgetTone(budget) {
  if (!budget.monthlyBudget) return 'neutral'
  return budget.remainingBudget < budget.monthlyBudget * 0.2 ? 'danger' : 'steady'
}

export function buildHomeCommandStats(stats = {}, context = {}) {
  const normalized = normalizeStats(stats)
  const days = Math.max(0, toNumber(context.togetherDays))
  const pendingActions = normalized.habits.pending + normalized.express.pending + normalized.shopping.pending
  const moodSynced = normalized.mood.today && normalized.mood.partnerToday
  const riskCount = normalized.express.urgent + normalized.cosmetics.expired + normalized.cosmetics.expiring

  return [
    {
      id: 'days',
      label: '相爱',
      value: days > 0 ? `${days}天` : '待记录',
      meta: days > 0 ? '一起走到今天' : '设置纪念日',
      tone: 'rose'
    },
    {
      id: 'actions',
      label: '今日照顾',
      value: `${pendingActions}项`,
      meta: pendingActions > 0 ? '顺手照看一下' : '今天很轻',
      tone: pendingActions > 0 ? 'warning' : 'steady'
    },
    {
      id: 'mood',
      label: '心情回应',
      value: moodSynced ? '已回应' : normalized.mood.today || normalized.mood.partnerToday ? '差一句' : '未写',
      meta: moodSynced ? '两个人都写了' : '补一句会更完整',
      tone: moodSynced ? 'steady' : 'neutral'
    },
    {
      id: 'risk',
      label: '要留意',
      value: `${riskCount}项`,
      meta: riskCount > 0 ? '急件/临期别漏' : '都安稳',
      tone: riskCount > 0 ? 'danger' : 'steady'
    }
  ]
}

export function buildHomeRelationshipMoment(stats = {}, context = {}) {
  const normalized = normalizeStats(stats)
  const days = Math.max(0, toNumber(context.togetherDays))
  const moodSynced = normalized.mood.today && normalized.mood.partnerToday
  const oneSideMood = normalized.mood.today || normalized.mood.partnerToday
  const albumPhotos = Math.max(0, toNumber(normalized.album.photos))
  const pendingWishes = Math.max(0, toNumber(normalized.wishes.pending))
  const pendingPlans = Math.max(0, toNumber(normalized.habits.pending))

  let primaryAction = {
    route: '/album',
    label: albumPhotos > 0 ? '翻看我们的相册' : '存下第一张照片',
    tone: 'album'
  }

  if (!moodSynced) {
    primaryAction = {
      route: '/mood',
      label: oneSideMood ? '补上我的回应' : '写下今天的一句',
      tone: 'mood'
    }
  } else if (pendingWishes > 0) {
    primaryAction = {
      route: '/wish',
      label: '约定一个心愿',
      tone: 'wish'
    }
  } else if (pendingPlans > 0) {
    primaryAction = {
      route: '/plans',
      label: '完成今日约定',
      tone: 'action'
    }
  }

  return {
    eyebrow: '关系小纸条',
    stampLabel: '在一起',
    stamp: days > 0 ? `第 ${days} 天` : '第一天',
    title: moodSynced
      ? '今天已经互相回应了'
      : oneSideMood
        ? '这里等你补上一句回应'
        : '给今天留一句话',
    subtitle: moodSynced
      ? albumPhotos > 0
        ? `${albumPhotos} 张照片，挑一张回看。`
        : '写完心情，存一张照片。'
      : oneSideMood
        ? '补一句，今天就完整。'
        : '一句话也算共同记忆。',
    primaryAction,
    keepsakes: [
      {
        id: 'mood',
        route: '/mood',
        label: '今日回应',
        value: moodSynced ? '两个人都写了' : oneSideMood ? '待回应' : '还没开始',
        tone: moodSynced ? 'steady' : 'mood',
        attention: !moodSynced
      },
      {
        id: 'album',
        route: '/album',
        label: '相册',
        value: albumPhotos > 0 ? `${albumPhotos}张照片` : '等第一张',
        tone: 'album',
        attention: albumPhotos === 0
      },
      {
        id: 'wish',
        route: '/wish',
        label: '心愿',
        value: pendingWishes > 0 ? `${pendingWishes}个待约` : '都完成了',
        tone: 'wish',
        attention: pendingWishes > 0
      }
    ]
  }
}

export function buildHomePriorityCards(stats = {}) {
  const normalized = normalizeStats(stats)
  const habitProgress = percent(normalized.habits.completed, normalized.habits.total)

  return [
    {
      id: 'postgraduate',
      route: '/postgraduate',
      title: '考研陪跑',
      kicker: '今天的学习',
      mark: '研',
      metric: '数学/英语/化学/政治',
      meta: '讲、题、课、背',
      action: '进入陪跑',
      badge: '陪跑',
      tone: 'study',
      size: 'wide',
      progressPercent: null,
      attention: true
    },
    {
      id: 'plans',
      route: '/plans',
      title: '坚持计划',
      kicker: '今日打卡',
      mark: '计',
      metric: normalized.habits.total > 0 ? `${normalized.habits.completed}/${normalized.habits.total}` : '未配置',
      meta: normalized.habits.pending > 0 ? `剩 ${normalized.habits.pending} 项` : normalized.habits.total > 0 ? '今日完成' : '拆成步骤',
      action: '查看计划',
      badge: normalized.habits.pending > 0 ? `${normalized.habits.pending}待打` : '计划',
      tone: normalized.habits.pending > 0 ? 'action' : 'steady',
      size: 'normal',
      progressPercent: normalized.habits.total > 0 ? habitProgress : null,
      attention: normalized.habits.pending > 0
    },
    {
      id: 'express',
      route: '/express',
      title: '取件清单',
      kicker: '代取协作',
      mark: '件',
      metric: normalized.express.pending > 0 ? `${normalized.express.pending}件待取` : '暂无待取',
      meta: normalized.express.urgent > 0 ? `${normalized.express.urgent} 件急取` : '取件归档',
      action: '去取件',
      badge: normalized.express.urgent > 0 ? `${normalized.express.urgent}急取` : '清单',
      tone: normalized.express.urgent > 0 ? 'danger' : 'logistics',
      size: 'normal',
      progressPercent: null,
      attention: normalized.express.pending > 0
    },
    {
      id: 'health',
      route: '/health',
      title: '身体档案',
      kicker: '健康趋势',
      mark: '体',
      metric: normalized.health.latestWeight ? `${normalized.health.latestWeight}kg` : '待记录',
      meta: normalized.health.latestWeight ? '趋势已更新' : '周期/体重',
      action: '查看档案',
      badge: '趋势',
      tone: 'health',
      size: 'normal',
      progressPercent: null,
      attention: !normalized.health.latestWeight
    }
  ]
}

export function buildHomeLaunchCards(stats = {}) {
  const normalized = normalizeStats(stats)
  const budget = normalized.budget
  const budgetRisk = budgetTone(budget)
  const moodSynced = normalized.mood.today && normalized.mood.partnerToday

  return [
    {
      id: 'mood',
      route: '/mood',
      title: '心情',
      mark: '心',
      status: moodSynced ? '已写' : normalized.mood.today || normalized.mood.partnerToday ? '回应' : '一句',
      tone: moodSynced ? 'steady' : 'mood',
      attention: !moodSynced
    },
    {
      id: 'album',
      route: '/album',
      title: '相册',
      mark: '相',
      status: normalized.album.photos > 0 ? `${normalized.album.photos}张` : '回看',
      tone: 'album',
      attention: normalized.album.photos === 0
    },
    {
      id: 'postgraduate',
      route: '/postgraduate',
      title: '考研',
      mark: '研',
      status: '陪跑',
      tone: 'study',
      attention: true
    },
    {
      id: 'plans',
      route: '/plans',
      title: '计划',
      mark: '计',
      status: normalized.habits.pending > 0 ? `${normalized.habits.pending}项` : normalized.habits.total > 0 ? '完成' : '开始',
      tone: normalized.habits.pending > 0 ? 'action' : 'steady',
      attention: normalized.habits.pending > 0
    },
    {
      id: 'health',
      route: '/health',
      title: '健康',
      mark: '体',
      status: normalized.health.latestWeight ? `${normalized.health.latestWeight}kg` : '记录',
      tone: 'health',
      attention: !normalized.health.latestWeight
    },
    {
      id: 'express',
      route: '/express',
      title: '快递',
      mark: '件',
      status: normalized.express.urgent > 0 ? `${normalized.express.urgent}急` : normalized.express.pending > 0 ? `${normalized.express.pending}件` : '清空',
      tone: normalized.express.urgent > 0 ? 'danger' : 'logistics',
      attention: normalized.express.pending > 0
    },
    {
      id: 'cosmetics',
      route: '/cosmetics',
      title: '妆台',
      mark: '妆',
      status: normalized.cosmetics.expired > 0 ? `${normalized.cosmetics.expired}过` : normalized.cosmetics.expiring > 0 ? `${normalized.cosmetics.expiring}临` : normalized.cosmetics.total > 0 ? `${normalized.cosmetics.total}件` : '整理',
      tone: normalized.cosmetics.expired > 0 ? 'danger' : normalized.cosmetics.expiring > 0 ? 'warning' : 'beauty',
      attention: normalized.cosmetics.expired > 0 || normalized.cosmetics.expiring > 0
    },
    {
      id: 'budget',
      route: '/budget',
      title: '账本',
      mark: '账',
      status: budget.monthlyBudget > 0 ? `¥${formatMoney(budget.remainingBudget)}` : '收支',
      tone: budgetRisk === 'danger' ? 'danger' : 'budget',
      attention: budgetRisk === 'danger'
    },
    {
      id: 'shopping',
      route: '/shopping',
      title: '购物',
      mark: '购',
      status: normalized.shopping.pending > 0 ? `${normalized.shopping.pending}件` : '补货',
      tone: 'shopping',
      attention: normalized.shopping.pending > 0
    },
    {
      id: 'wish',
      route: '/wish',
      title: '心愿',
      mark: '愿',
      status: normalized.wishes.pending > 0 ? `${normalized.wishes.pending}个` : normalized.wishes.total > 0 ? '完成' : '约定',
      tone: 'wish',
      attention: normalized.wishes.pending > 0
    }
  ]
}

export function buildHomeQuickActions(stats = {}) {
  const cards = buildHomeLaunchCards(stats)
  const coreIds = ['mood', 'plans', 'postgraduate', 'health', 'album', 'express']
  const cardMap = new Map(cards.map(card => [card.id, card]))

  return coreIds
    .map((id, index) => {
      const card = cardMap.get(id)
      if (!card) return null
      return {
        ...card,
        rank: index + 1,
        emphasis: index < 2 ? 'primary' : 'secondary'
      }
    })
    .filter(Boolean)
}

export function buildHomeLifeCards(stats = {}) {
  const normalized = normalizeStats(stats)
  const budget = normalized.budget
  const budgetRisk = budgetTone(budget)

  return [
    {
      id: 'mood',
      route: '/mood',
      title: '心情',
      mark: '心',
      metric: normalized.mood.today && normalized.mood.partnerToday ? '双向同步' : normalized.mood.today ? '等对方' : normalized.mood.partnerToday ? '对方已记' : '未记录',
      meta: '互相看见',
      badge: normalized.mood.today && normalized.mood.partnerToday ? '已回应' : '补记',
      tone: 'mood',
      attention: !(normalized.mood.today && normalized.mood.partnerToday)
    },
    {
      id: 'album',
      route: '/album',
      title: '相册',
      mark: '相',
      metric: normalized.album.photos > 0 ? `${normalized.album.photos}张` : '待上传',
      meta: '生活片段',
      badge: '记忆',
      tone: 'album',
      attention: false
    },
    {
      id: 'cosmetics',
      route: '/cosmetics',
      title: '化妆品',
      mark: '妆',
      metric: normalized.cosmetics.total > 0 ? `${normalized.cosmetics.total}件` : '待添加',
      meta: normalized.cosmetics.expired > 0 ? `${normalized.cosmetics.expired} 过期` : normalized.cosmetics.expiring > 0 ? `${normalized.cosmetics.expiring} 临期` : '库存提醒',
      badge: normalized.cosmetics.expired > 0 ? '过期' : normalized.cosmetics.expiring > 0 ? '临期' : '库存',
      tone: normalized.cosmetics.expired > 0 ? 'danger' : normalized.cosmetics.expiring > 0 ? 'warning' : 'beauty',
      attention: normalized.cosmetics.expired > 0 || normalized.cosmetics.expiring > 0
    },
    {
      id: 'shopping',
      route: '/shopping',
      title: '购物',
      mark: '购',
      metric: normalized.shopping.pending > 0 ? `${normalized.shopping.pending}件` : '已清空',
      meta: normalized.shopping.pending > 0 ? '待确认' : '暂无待买',
      badge: normalized.shopping.pending > 0 ? '待购' : '清单',
      tone: 'shopping',
      attention: normalized.shopping.pending > 0
    },
    {
      id: 'budget',
      route: '/budget',
      title: '账本',
      mark: '账',
      metric: `¥${formatMoney(budget.expense)}`,
      meta: budget.monthlyBudget > 0 ? `余 ¥${formatMoney(budget.remainingBudget)}` : '共同支出',
      badge: budgetRisk === 'danger' ? '预算紧张' : '本月',
      tone: budgetRisk === 'danger' ? 'danger' : 'budget',
      attention: budgetRisk === 'danger'
    },
    {
      id: 'wish',
      route: '/wish',
      title: '心愿',
      mark: '愿',
      metric: normalized.wishes.total > 0 ? `${normalized.wishes.completed}/${normalized.wishes.total}` : '待添加',
      meta: normalized.wishes.pending > 0 ? `${normalized.wishes.pending} 待实现` : normalized.wishes.total > 0 ? '已完成' : '先放进来',
      badge: '心愿',
      tone: 'wish',
      attention: normalized.wishes.pending > 0
    }
  ]
}

export function buildHomeFocusSummary(stats = {}) {
  const normalized = normalizeStats(stats)
  if (normalized.express.urgent > 0) {
    return {
      route: '/express',
      title: '急件先取',
      body: `${normalized.express.urgent} 件`,
      tone: 'danger'
    }
  }
  if (normalized.habits.pending > 0) {
    return {
      route: '/plans',
      title: '计划未打卡',
      body: `剩 ${normalized.habits.pending} 项`,
      tone: 'action'
    }
  }
  if ((normalized.mood.today || normalized.mood.partnerToday) && !(normalized.mood.today && normalized.mood.partnerToday)) {
    return {
      route: '/mood',
      title: '心情差一句',
      body: '补上回应',
      tone: 'mood'
    }
  }
  if (normalized.cosmetics.expired + normalized.cosmetics.expiring > 0) {
    return {
      route: '/cosmetics',
      title: '整理化妆台',
      body: `${normalized.cosmetics.expired + normalized.cosmetics.expiring} 件临期/过期`,
      tone: 'warning'
    }
  }
  return {
    route: '/postgraduate',
    title: '确认陪跑节奏',
    body: '讲、题、课、背',
    tone: 'study'
  }
}
