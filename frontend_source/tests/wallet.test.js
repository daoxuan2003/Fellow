import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  WALLET_TABS,
  formatPaydayCycleLabel,
  groupTransactionsByDay,
  isDateInPaydayCycle,
  nextDebtDue,
  ownerOptions,
  paydayCycleForMonth,
  paydayCycleKey,
  summaryForScope,
  transactionSign,
  walletConfidenceCopy
} from '../src/utils/wallet.js'

const overview = {
  viewerId: 'mine',
  partnerId: 'partner',
  identities: [
    { userId: 'mine', nickname: '小赴' },
    { userId: 'partner', nickname: '小大王' }
  ],
  summaries: [
    {
      ownerId: 'mine', liquidAssets: 1000, safeToSpend: 300, originalDebt: 600, paidDebt: 200,
      projectedSafeToSpend: 1300, forecastIncome: 1000, forecastDate: '2026-08-25', expectedIncomeState: 'today',
      confidence: 'complete', missing: [], pockets: [{ key: 'debt', amount: 400 }]
    },
    {
      ownerId: 'partner', liquidAssets: 500, safeToSpend: -100, deficit: 100, originalDebt: 400, paidDebt: 100,
      projectedSafeToSpend: 400, forecastIncome: 500, forecastDate: '2026-08-25', expectedIncomeState: 'today',
      confidence: 'incomplete', missing: ['monthly_plan'], pockets: [{ key: 'debt', amount: 200 }]
    }
  ]
}

test('wallet exposes the approved four-tab information architecture', () => {
  assert.deepEqual(WALLET_TABS.map(tab => tab.label), ['钱包', '计划', '欠款', '流水'])
});

test('owner options keep personal money boundaries while providing a couple view', () => {
  assert.deepEqual(ownerOptions(overview).map(option => option.label), ['我的钱包', '小大王的钱包', '我们两人的全景'])
  const combined = summaryForScope('couple', overview)
  assert.equal(combined.liquidAssets, 1500)
  assert.equal(combined.safeToSpend, 200)
  assert.equal(combined.projectedSafeToSpend, 1700)
  assert.equal(combined.forecastIncome, 1500)
  assert.equal(combined.forecastDate, '2026-08-25')
  assert.equal(combined.confidence, 'incomplete')
  assert.equal(combined.debtProgress, 30)
});

test('payday cycle helpers keep the 25th through following 24th on the local calendar', () => {
  assert.equal(paydayCycleKey('2026-08-24'), '2026-07')
  assert.equal(paydayCycleKey('2026-08-25'), '2026-08')
  assert.deepEqual(paydayCycleForMonth('2026-12'), {
    key: '2026-12', startDate: '2026-12-25', endDate: '2027-01-24'
  })
  assert.equal(formatPaydayCycleLabel('2026-12'), '2026年12月25日—2027年1月24日')
  assert.equal(isDateInPaydayCycle('2026-09-24', '2026-08'), true)
  assert.equal(isDateInPaydayCycle('2026-09-25', '2026-08'), false)
});

test('next repayment respects the selected owner scope', () => {
  const timeline = [
    { id: 'mine-1', type: 'debt_due', ownerId: 'mine', date: '2026-08-28', amount: 100 },
    { id: 'partner-1', type: 'debt_due', ownerId: 'partner', date: '2026-08-27', amount: 200 }
  ]
  assert.equal(nextDebtDue(timeline, 'mine', overview).id, 'mine-1')
  assert.equal(nextDebtDue(timeline, 'partner', overview).id, 'partner-1')
});

test('transaction groups sort by day and debt repayment is not shown as another expense', () => {
  const groups = groupTransactionsByDay([
    { date: '2026-08-24T10:00:00.000Z', type: 'expense' },
    { date: '2026-08-25T10:00:00.000Z', type: 'transfer', kind: 'debt_payment' }
  ])
  assert.equal(groups[0].date, '2026-08-25')
  assert.equal(transactionSign(groups[0].items[0]), '')
  assert.equal(transactionSign(groups[1].items[0]), '-')
});

test('incomplete and deficit calculations have explicit explanatory copy', () => {
  assert.match(walletConfidenceCopy({ confidence: 'incomplete', missing: ['monthly_plan'] }), /本周期分仓/)
  assert.match(walletConfidenceCopy({ confidence: 'complete', safeToSpend: -88, deficit: 88 }), /当前还款准备金缺口/)
  assert.match(walletConfidenceCopy({ confidence: 'complete', safeToSpend: -88, deficit: 88, forecastIncome: 100, projectedSafeToSpend: 12 }), /预计收入到账后可以覆盖/)
  assert.match(walletConfidenceCopy({ confidence: 'complete', safeToSpend: -88, deficit: 88, forecastIncome: 0, expectedIncomeState: 'past' }), /若工资已到账/)
});

test('wallet subscribes to the real websocket channel and removes the listener', async () => {
  const source = await readFile(new URL('../src/views/Budget.vue', import.meta.url), 'utf8')
  assert.match(source, /const \{ onMessage \} = useWebSocket\(\)/)
  assert.match(source, /\['walletSync', 'accountSync'\]\.includes\(message\.type\)/)
  assert.doesNotMatch(source, /\/api\/budget/)
  assert.doesNotMatch(source, /旧预算兼容|分类管理/)
  assert.match(source, /unsubscribeWS\?\.\(\)/)
  assert.doesNotMatch(source, /window\.eventBus/)
  assert.match(source, /现在安心可用/)
  assert.match(source, /25日至次月24日/)
  assert.match(source, /按计划收入到账后测算，不会自动写入账户余额/)
  assert.doesNotMatch(source, /本期还差/)
});

test('wallet sheets trap keyboard focus and restore page scrolling', async () => {
  const source = await readFile(new URL('../src/views/Budget.vue', import.meta.url), 'utf8')
  assert.match(source, /@keydown="handleSheetKeydown"/)
  assert.match(source, /event\.key === 'Escape'/)
  assert.match(source, /event\.key !== 'Tab'/)
  assert.match(source, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(source, /sheetTrigger\?\.focus\?\.\(\)/)
});

test('debt creation keeps one request id while a failed sheet remains open', async () => {
  const source = await readFile(new URL('../src/views/Budget.vue', import.meta.url), 'utf8')
  assert.match(source, /requestId: makeRequestId\('debt-create'\)/)
  assert.match(source, /api\('\/api\/wallet\/debts', \{ method: 'POST', body: JSON\.stringify\(debtForm\.value\) \}\)/)
  assert.doesNotMatch(source, /submitDebt\(\).*makeRequestId\('debt-create'\)/s)
  assert.match(source, /额外手续费\/利息只填“剩余欠款”之外还要支付的金额；账单待还已经包含的话填 0。/)
  assert.doesNotMatch(source, /<span>剩余费用<\/span>/)
});
