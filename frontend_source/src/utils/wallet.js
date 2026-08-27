export const WALLET_TABS = Object.freeze([
  { key: 'wallet', label: '钱包' },
  { key: 'plan', label: '计划' },
  { key: 'debts', label: '欠款' },
  { key: 'transactions', label: '流水' }
])

export const POCKET_META = Object.freeze({
  debt: { label: '还债', tone: 'pink' },
  living: { label: '吃饭生活', tone: 'yellow' },
  travel: { label: '出行', tone: 'blue' },
  couple: { label: '恋爱约会', tone: 'mint' },
  flexible: { label: '自由使用', tone: 'orange' }
})

export function formatMoney(value, currency = 'CNY') {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '¥0.00'
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatLocalDate(value, today = '') {
  if (!value) return '日期未定'
  if (today && value === today) return '今天'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return String(value)
  return `${Number(match[2])}月${Number(match[3])}日`
}

function shiftMonth(month, delta) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) throw new Error('INVALID_MONTH')
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function paydayCycleKey(localDate) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(String(localDate || ''))) throw new Error('INVALID_LOCAL_DATE')
  const month = localDate.slice(0, 7)
  return Number(localDate.slice(8, 10)) >= 25 ? month : shiftMonth(month, -1)
}

export function paydayCycleForMonth(month) {
  const nextMonth = shiftMonth(month, 1)
  return { key: month, startDate: `${month}-25`, endDate: `${nextMonth}-24` }
}

export function formatPaydayCycleLabel(month) {
  const cycle = paydayCycleForMonth(month)
  const [startYear, startMonth] = cycle.startDate.split('-').map(Number)
  const [endYear, endMonth] = cycle.endDate.split('-').map(Number)
  return startYear === endYear
    ? `${startYear}年${startMonth}月25日—${endMonth}月24日`
    : `${startYear}年${startMonth}月25日—${endYear}年${endMonth}月24日`
}

export function isDateInPaydayCycle(value, month) {
  const date = String(value || '').slice(0, 10)
  const cycle = paydayCycleForMonth(month)
  return date >= cycle.startDate && date <= cycle.endDate
}

export function ownerOptions(overview) {
  const identities = overview?.identities || []
  const viewerId = String(overview?.viewerId || '')
  const partnerId = String(overview?.partnerId || '')
  const nickname = id => identities.find(item => String(item.userId) === id)?.nickname
  return [
    { key: viewerId, label: '我的钱包', shortLabel: '我' },
    { key: partnerId, label: `${nickname(partnerId) || '伴侣'}的钱包`, shortLabel: nickname(partnerId) || '伴侣' },
    { key: 'couple', label: '我们两人的全景', shortLabel: '两人' }
  ].filter(item => item.key)
}

export function selectedOwnerIds(scope, overview) {
  if (scope === 'couple') return [String(overview?.viewerId || ''), String(overview?.partnerId || '')].filter(Boolean)
  return scope ? [String(scope)] : []
}

export function summaryForScope(scope, overview) {
  const ownerIds = selectedOwnerIds(scope, overview)
  const rows = (overview?.summaries || []).filter(row => ownerIds.includes(String(row.ownerId)))
  if (rows.length === 1) return rows[0]
  const sum = key => rows.reduce((total, row) => total + Number(row[key] || 0), 0)
  const safeToSpend = sum('safeToSpend')
  const projectedSafeToSpend = rows.reduce((total, row) => total + Number(row.projectedSafeToSpend ?? row.safeToSpend ?? 0), 0)
  const forecastDates = [...new Set(rows.map(row => row.forecastDate).filter(Boolean))]
  const expectedIncomeStates = rows.map(row => row.expectedIncomeState).filter(Boolean)
  return {
    ownerId: 'couple',
    liquidAssets: sum('liquidAssets'),
    liabilities: sum('liabilities'),
    upcomingDebt: sum('upcomingDebt'),
    debtReserve: sum('debtReserve'),
    essentialReserve: sum('essentialReserve'),
    committedReserve: sum('committedReserve'),
    safeToSpend,
    deficit: safeToSpend < 0 ? Math.abs(safeToSpend) : 0,
    projectedSafeToSpend,
    projectedDeficit: projectedSafeToSpend < 0 ? Math.abs(projectedSafeToSpend) : 0,
    forecastIncome: sum('forecastIncome'),
    forecastDate: forecastDates.length === 1 ? forecastDates[0] : '',
    expectedIncomeState: expectedIncomeStates.some(state => ['today', 'future'].includes(state)) ? 'future'
      : expectedIncomeStates.includes('past') ? 'past' : 'none',
    sameDayDebtAmount: sum('sameDayDebtAmount'),
    confidence: rows.length > 0 && rows.every(row => row.confidence === 'complete') ? 'complete' : 'incomplete',
    missing: [...new Set(rows.flatMap(row => row.missing || []))],
    pockets: Object.keys(POCKET_META).map(key => ({
      key,
      amount: rows.reduce((total, row) => total + Number(row.pockets?.find(item => item.key === key)?.amount || 0), 0),
      spent: rows.reduce((total, row) => total + Number(row.pockets?.find(item => item.key === key)?.spent || 0), 0),
      remaining: rows.reduce((total, row) => total + Number(row.pockets?.find(item => item.key === key)?.remaining || 0), 0),
      overspent: rows.reduce((total, row) => total + Number(row.pockets?.find(item => item.key === key)?.overspent || 0), 0)
    })).map(pocket => ({
      ...pocket,
      usagePercent: pocket.amount > 0 ? Math.round((pocket.spent / pocket.amount) * 100) : pocket.spent > 0 ? 100 : 0,
      progress: pocket.amount > 0 ? Math.min(100, Math.round((pocket.spent / pocket.amount) * 100)) : pocket.spent > 0 ? 100 : 0
    })),
    plannedTotal: sum('plannedTotal'),
    spentTotal: sum('spentTotal'),
    remainingTotal: sum('remainingTotal'),
    overspentTotal: sum('overspentTotal'),
    unassignedSpent: sum('unassignedSpent'),
    unassignedCount: sum('unassignedCount'),
    nonLiquidSpent: sum('nonLiquidSpent'),
    originalDebt: sum('originalDebt'),
    paidDebt: sum('paidDebt'),
    debtProgress: sum('originalDebt') > 0 ? Math.round((sum('paidDebt') / sum('originalDebt')) * 100) : 0
  }
}

export function scopeRows(rows, scope, overview, ownerField = 'ownerId') {
  const ownerIds = selectedOwnerIds(scope, overview)
  return (rows || []).filter(row => ownerIds.includes(String(row?.[ownerField])))
}

export function nextDebtDue(timeline, scope, overview) {
  return scopeRows(
    (timeline || []).filter(item => item.type === 'debt_due' && Number(item.amount) > 0),
    scope,
    overview
  )[0] || null
}

export function groupTransactionsByDay(transactions = []) {
  const groups = new Map()
  for (const transaction of transactions) {
    const day = String(transaction.date || '').slice(0, 10)
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day).push(transaction)
  }
  return [...groups.entries()]
    .sort(([left], [right]) => right.localeCompare(left))
    .map(([date, items]) => ({ date, items }))
}

export function transactionSign(transaction) {
  if (transaction?.kind === 'debt_payment' || transaction?.type === 'transfer') return ''
  return transaction?.type === 'income' ? '+' : '-'
}

export function walletConfidenceCopy(summary) {
  if (!summary) return '正在核对账户与计划'
  if (summary.confidence !== 'complete') {
    const missing = []
    if (summary.missing?.includes('asset_account')) missing.push('可用账户')
    if (summary.missing?.includes('monthly_plan')) missing.push('本周期分仓')
    if (summary.missing?.includes('unassigned_transactions')) missing.push('待归类流水')
    return `还差${missing.join('、') || '一些资料'}，金额仅供参考`
  }
  if (summary.safeToSpend < 0) {
    if (summary.forecastIncome > 0 && summary.projectedSafeToSpend >= 0) {
      return `当前还款准备金缺口 ${formatMoney(summary.deficit)}；预计收入到账后可以覆盖`
    }
    if (summary.forecastIncome > 0 && summary.projectedSafeToSpend < 0) {
      return `当前还款准备金缺口 ${formatMoney(summary.deficit)}；预计收入到账后仍缺 ${formatMoney(summary.projectedDeficit)}`
    }
    if (summary.expectedIncomeState === 'past') {
      return `当前还款准备金缺口 ${formatMoney(summary.deficit)}；若工资已到账，请先记入对应账户`
    }
    return `当前还款准备金缺口 ${formatMoney(summary.deficit)}，先补足再安排自由支出`
  }
  return '已按本资金周期的还款和必要预留计算'
}

export function makeRequestId(prefix = 'wallet') {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}
