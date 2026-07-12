import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCosmeticCarePlan,
  buildCosmeticDashboard,
  buildCosmeticShelfSections,
  buildCosmeticVanityBoard,
  filterAndSortCosmetics,
  getCosmeticProgress,
  getCosmeticStatus,
  getCosmeticTimeCopy
} from '../src/utils/cosmetics.js'

const items = [
  { id: 'a', name: '洁面', status: 'active', daysLeft: 120, shelfLifeMonths: 12 },
  { id: 'b', name: '精华', status: 'active', daysLeft: 5, shelfLifeMonths: 6, isExpiringSoon: true },
  { id: 'c', name: '面霜', status: 'active', daysLeft: -2, shelfLifeMonths: 3, isExpired: true },
  { id: 'd', name: '空瓶口红', status: 'empty', daysLeft: 60, shelfLifeMonths: 12 }
]

test('getCosmeticStatus prioritizes empty, expired and expiring states', () => {
  assert.equal(getCosmeticStatus(items[3]).key, 'empty')
  assert.equal(getCosmeticStatus(items[2]).key, 'expired')
  assert.equal(getCosmeticStatus(items[1]).key, 'expiring')
  assert.equal(getCosmeticStatus(items[0]).key, 'active')
})

test('buildCosmeticDashboard summarizes risk and urgent shelf items', () => {
  const dashboard = buildCosmeticDashboard(items)

  assert.equal(dashboard.total, 4)
  assert.equal(dashboard.active, 1)
  assert.equal(dashboard.expired, 1)
  assert.equal(dashboard.expiring, 1)
  assert.equal(dashboard.empty, 1)
  assert.equal(dashboard.focusTone, 'danger')
  assert.equal(dashboard.urgent[0].id, 'c')
  assert.equal(dashboard.next.id, 'b')
})

test('buildCosmeticCarePlan turns shelf state into concrete actions', () => {
  const plan = buildCosmeticCarePlan(items)

  assert.deepEqual(plan.map(action => action.type), ['expired', 'expiring', 'empty'])
  assert.equal(plan[0].tone, 'danger')
  assert.match(plan[1].detail, /进入提醒窗口/)
})

test('buildCosmeticVanityBoard creates a vanity tray with the right next action', () => {
  const board = buildCosmeticVanityBoard(items)

  assert.equal(board.stage, 'danger')
  assert.equal(board.headline, '今天先处理 1 件过期品')
  assert.deepEqual(board.spotlightItems.map(item => item.id), ['c', 'b', 'a'])
  assert.deepEqual(board.ritual.map(item => item.key), ['front', 'daily', 'archive'])
  assert.equal(board.ritual[0].value, '2')
  assert.deepEqual(board.primaryAction, { type: 'filter', label: '查看过期', filter: 'expired' })
})

test('buildCosmeticVanityBoard gives empty shelves a setup action', () => {
  const board = buildCosmeticVanityBoard([])

  assert.equal(board.stage, 'empty')
  assert.equal(board.headline, '先放进第一件在用产品')
  assert.equal(board.spotlightItems.length, 0)
  assert.deepEqual(board.primaryAction, { type: 'add', label: '添加第一件', filter: 'all' })
  assert.equal(board.ritual[1].copy, '等待添加在用品')
})

test('buildCosmeticShelfSections groups risk daily and empty products', () => {
  const sections = buildCosmeticShelfSections(items)
  const risk = sections.find(section => section.id === 'risk')
  const daily = sections.find(section => section.id === 'daily')
  const archive = sections.find(section => section.id === 'archive')

  assert.deepEqual(sections.map(section => section.id), ['risk', 'daily', 'archive'])
  assert.deepEqual(risk.items.map(item => item.id), ['c', 'b'])
  assert.deepEqual(daily.items.map(item => item.id), ['a'])
  assert.deepEqual(archive.items.map(item => item.id), ['d'])
  assert.equal(buildCosmeticShelfSections([items[0]])[0].tone, 'neutral')
})

test('filterAndSortCosmetics keeps risk items first and supports tabs', () => {
  const all = filterAndSortCosmetics(items, 'all')
  const expiring = filterAndSortCosmetics(items, 'expiring')

  assert.deepEqual(all.map(item => item.id), ['c', 'b', 'a', 'd'])
  assert.deepEqual(expiring.map(item => item.id), ['b'])
})

test('getCosmeticProgress and getCosmeticTimeCopy produce stable shelf copy', () => {
  assert.equal(getCosmeticProgress({ status: 'active', shelfLifeMonths: 10, daysLeft: 150 }), 50)
  assert.equal(getCosmeticProgress({ status: 'empty', shelfLifeMonths: 10, daysLeft: 150 }), 100)
  assert.equal(getCosmeticTimeCopy(items[1]), '还剩 5 天，建议优先使用')
  assert.equal(getCosmeticTimeCopy(items[3]), '已归入空瓶')
})
