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
  return {
    ownerId: 'couple',
    liquidAssets: sum('liquidAssets'),
    liabilities: sum('liabilities'),
    upcomingDebt: sum('upcomingDebt'),
    debtReserve: sum('debtReserve'),
    essentialReserve: sum('essentialReserve'),
    committedReserve: sum('committedReserve'),
    safeToSpend: sum('safeToSpend'),
    deficit: sum('deficit'),
    confidence: rows.length > 0 && rows.every(row => row.confidence === 'complete') ? 'complete' : 'incomplete',
    missing: [...new Set(rows.flatMap(row => row.missing || []))],
    pockets: Object.keys(POCKET_META).map(key => ({
      key,
      amount: rows.reduce((total, row) => total + Number(row.pockets?.find(item => item.key === key)?.amount || 0), 0)
    })),
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
    if (summary.missing?.includes('monthly_plan')) missing.push('本月分仓')
    return `还差${missing.join('、') || '一些资料'}，金额仅供参考`
  }
  if (summary.safeToSpend < 0) return `本期还差 ${formatMoney(summary.deficit)}，先把缺口补上`
  return '已扣除近期还款与必要预留，可以安心安排'
}

export function makeRequestId(prefix = 'wallet') {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${prefix}-${random}`
}
