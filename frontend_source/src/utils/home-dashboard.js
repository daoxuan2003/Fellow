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
      meta: days > 0 ? '共同空间运行中' : '设置纪念日',
      tone: 'rose'
    },
    {
      id: 'actions',
      label: '今日待办',
      value: `${pendingActions}项`,
      meta: pendingActions > 0 ? '需要处理' : '今日清爽',
      tone: pendingActions > 0 ? 'warning' : 'steady'
    },
    {
      id: 'mood',
      label: '心情同步',
      value: moodSynced ? '已同步' : normalized.mood.today || normalized.mood.partnerToday ? '差一人' : '未记录',
      meta: moodSynced ? '两人都记录了' : '补一次会更完整',
      tone: moodSynced ? 'steady' : 'neutral'
    },
    {
      id: 'risk',
      label: '预警',
      value: `${riskCount}项`,
      meta: riskCount > 0 ? '优先看急件/临期' : '暂无风险',
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
      label: oneSideMood ? '补上我的回应' : '写下今日心情',
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
    eyebrow: '今日小纸条',
    stampLabel: '我们的今天',
    stamp: days > 0 ? `第 ${days} 天` : '第一天',
    title: moodSynced
      ? '今天已经互相回应了'
      : oneSideMood
        ? '这里等你补上一句回应'
        : '先把今天的心情放进来',
    subtitle: moodSynced
      ? albumPhotos > 0
        ? `相册里已经存下 ${albumPhotos} 张照片，挑一张回看今天。`
        : '写完心情后，可以存下今天第一张照片。'
      : oneSideMood
        ? '一方已经留下心情，再补一次，今天就变成两个人共同记下的一天。'
        : '不用写很多，一句话也可以成为今天的共同记忆。',
    primaryAction,
    keepsakes: [
      {
        id: 'mood',
        route: '/mood',
        label: '今日回应',
        value: moodSynced ? '两个人都写了' : oneSideMood ? '差你一句' : '还没开始',
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
      title: '考研督学',
      kicker: '每日推进',
      mark: '研',
      metric: '数学/英语/化学/政治',
      meta: '按讲数、题量、课程和背诵量报到',
      action: '进入督学台',
      badge: '重点',
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
      meta: normalized.habits.pending > 0 ? `还有 ${normalized.habits.pending} 项待打卡` : normalized.habits.total > 0 ? '今日计划已闭环' : '创建健身、学习或生活计划',
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
      meta: normalized.express.urgent > 0 ? `${normalized.express.urgent} 件急件要先处理` : '取件与归档从这里进入',
      action: '处理取件',
      badge: normalized.express.urgent > 0 ? `${normalized.express.urgent}急` : '清单',
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
      meta: normalized.health.latestWeight ? '最新体重已同步到趋势' : '记录体重、围度与身体变化',
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
      id: 'postgraduate',
      route: '/postgraduate',
      title: '考研',
      mark: '研',
      status: '每日督学',
      tone: 'study',
      attention: true
    },
    {
      id: 'plans',
      route: '/plans',
      title: '计划',
      mark: '计',
      status: normalized.habits.pending > 0 ? `${normalized.habits.pending}待打` : normalized.habits.total > 0 ? '已闭环' : '待创建',
      tone: normalized.habits.pending > 0 ? 'action' : 'steady',
      attention: normalized.habits.pending > 0
    },
    {
      id: 'mood',
      route: '/mood',
      title: '心情',
      mark: '心',
      status: moodSynced ? '已同步' : normalized.mood.today || normalized.mood.partnerToday ? '差一人' : '未记录',
      tone: moodSynced ? 'steady' : 'mood',
      attention: !moodSynced
    },
    {
      id: 'album',
      route: '/album',
      title: '相册',
      mark: '相',
      status: normalized.album.photos > 0 ? `${normalized.album.photos}张` : '待上传',
      tone: 'album',
      attention: normalized.album.photos === 0
    },
    {
      id: 'health',
      route: '/health',
      title: '健康',
      mark: '体',
      status: normalized.health.latestWeight ? `${normalized.health.latestWeight}kg` : '待记录',
      tone: 'health',
      attention: !normalized.health.latestWeight
    },
    {
      id: 'express',
      route: '/express',
      title: '快递',
      mark: '件',
      status: normalized.express.urgent > 0 ? `${normalized.express.urgent}急件` : normalized.express.pending > 0 ? `${normalized.express.pending}待取` : '已清空',
      tone: normalized.express.urgent > 0 ? 'danger' : 'logistics',
      attention: normalized.express.pending > 0
    },
    {
      id: 'cosmetics',
      route: '/cosmetics',
      title: '化妆品',
      mark: '妆',
      status: normalized.cosmetics.expired > 0 ? `${normalized.cosmetics.expired}过期` : normalized.cosmetics.expiring > 0 ? `${normalized.cosmetics.expiring}临期` : normalized.cosmetics.total > 0 ? `${normalized.cosmetics.total}件` : '待添加',
      tone: normalized.cosmetics.expired > 0 ? 'danger' : normalized.cosmetics.expiring > 0 ? 'warning' : 'beauty',
      attention: normalized.cosmetics.expired > 0 || normalized.cosmetics.expiring > 0
    },
    {
      id: 'budget',
      route: '/budget',
      title: '账本',
      mark: '账',
      status: budget.monthlyBudget > 0 ? `余¥${formatMoney(budget.remainingBudget)}` : '待预算',
      tone: budgetRisk === 'danger' ? 'danger' : 'budget',
      attention: budgetRisk === 'danger'
    },
    {
      id: 'shopping',
      route: '/shopping',
      title: '购物',
      mark: '购',
      status: normalized.shopping.pending > 0 ? `${normalized.shopping.pending}待买` : '已清空',
      tone: 'shopping',
      attention: normalized.shopping.pending > 0
    },
    {
      id: 'wish',
      route: '/wish',
      title: '心愿',
      mark: '愿',
      status: normalized.wishes.pending > 0 ? `${normalized.wishes.pending}待实现` : normalized.wishes.total > 0 ? '已完成' : '待添加',
      tone: 'wish',
      attention: normalized.wishes.pending > 0
    }
  ]
}

export function buildHomeQuickActions(stats = {}) {
  const cards = buildHomeLaunchCards(stats)
  const coreIds = ['postgraduate', 'plans', 'mood', 'album', 'health', 'express']
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
      meta: '让记录有反馈，而不是只填表',
      badge: normalized.mood.today && normalized.mood.partnerToday ? '已同步' : '补记',
      tone: 'mood',
      attention: !(normalized.mood.today && normalized.mood.partnerToday)
    },
    {
      id: 'album',
      route: '/album',
      title: '相册',
      mark: '相',
      metric: normalized.album.photos > 0 ? `${normalized.album.photos}张` : '待上传',
      meta: '按生活片段沉淀你们的共同记忆',
      badge: '记忆',
      tone: 'album',
      attention: false
    },
    {
      id: 'cosmetics',
      route: '/cosmetics',
      title: '化妆品台',
      mark: '妆',
      metric: normalized.cosmetics.total > 0 ? `${normalized.cosmetics.total}件` : '待添加',
      meta: normalized.cosmetics.expired > 0 ? `${normalized.cosmetics.expired} 件已过期` : normalized.cosmetics.expiring > 0 ? `${normalized.cosmetics.expiring} 件临期` : '库存、开封和临期提醒',
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
      meta: normalized.shopping.pending > 0 ? '待购清单需要确认' : '暂无待买事项',
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
      meta: budget.monthlyBudget > 0 ? `本月剩余 ¥${formatMoney(budget.remainingBudget)}` : '记录共同支出和预算',
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
      meta: normalized.wishes.pending > 0 ? `${normalized.wishes.pending} 个心愿待实现` : normalized.wishes.total > 0 ? '心愿已全部完成' : '把想做的事先放进来',
      badge: '愿望池',
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
      title: '先处理急件',
      body: `${normalized.express.urgent} 件急件正在等待取件`,
      tone: 'danger'
    }
  }
  if (normalized.habits.pending > 0) {
    return {
      route: '/plans',
      title: '今天还有计划未打卡',
      body: `${normalized.habits.pending} 项坚持计划需要闭环`,
      tone: 'action'
    }
  }
  if ((normalized.mood.today || normalized.mood.partnerToday) && !(normalized.mood.today && normalized.mood.partnerToday)) {
    return {
      route: '/mood',
      title: '今天的心情还没对齐',
      body: '已有一方记录，补齐后生成双向回应',
      tone: 'mood'
    }
  }
  if (normalized.cosmetics.expired + normalized.cosmetics.expiring > 0) {
    return {
      route: '/cosmetics',
      title: '化妆品需要整理',
      body: `${normalized.cosmetics.expired + normalized.cosmetics.expiring} 件存在过期或临期风险`,
      tone: 'warning'
    }
  }
  return {
    route: '/postgraduate',
    title: '今天从考研督学开始',
    body: '把每日讲数、题量、课程和背诵量先确认',
    tone: 'study'
  }
}
