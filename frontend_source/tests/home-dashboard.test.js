import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildHomeCommandStats,
  buildHomeFocusSummary,
  buildHomeLifeCards,
  buildHomePriorityCards
} from '../src/utils/home-dashboard.js'

const stats = {
  express: { pending: 3, urgent: 1 },
  habits: { total: 4, completed: 2, pending: 2 },
  wishes: { total: 5, completed: 3, pending: 2 },
  mood: { today: true, partnerToday: false, myMood: 'happy' },
  budget: { expense: 1880, monthlyBudget: 2000, remainingBudget: 120 },
  cosmetics: { total: 8, expiring: 2, expired: 1 },
  health: { latestWeight: 52.5 },
  shopping: { pending: 4 },
  album: { photos: 36 }
}

test('home command stats summarize relationship, actions and risks', () => {
  const commandStats = buildHomeCommandStats(stats, { togetherDays: 520 })

  assert.deepEqual(commandStats.map(item => item.id), ['days', 'actions', 'mood', 'risk'])
  assert.equal(commandStats[0].value, '520天')
  assert.equal(commandStats[1].value, '9项')
  assert.equal(commandStats[2].value, '差一人')
  assert.equal(commandStats[3].tone, 'danger')
})

test('home priority cards keep postgraduate and operational actions prominent', () => {
  const cards = buildHomePriorityCards(stats)
  const ids = cards.map(card => card.id)

  assert.deepEqual(ids, ['postgraduate', 'plans', 'express', 'health'])
  assert.equal(cards[0].size, 'wide')
  assert.equal(cards[1].progressPercent, 50)
  assert.equal(cards[2].tone, 'danger')
  assert.equal(cards[3].metric, '52.5kg')
})

test('home life cards expose quieter features with useful status copy', () => {
  const cards = buildHomeLifeCards(stats)
  const cosmetics = cards.find(card => card.id === 'cosmetics')
  const budget = cards.find(card => card.id === 'budget')
  const album = cards.find(card => card.id === 'album')

  assert.equal(cards.length, 6)
  assert.equal(cosmetics.badge, '过期')
  assert.equal(budget.badge, '预算紧张')
  assert.equal(album.metric, '36张')
})

test('home focus summary picks the most urgent next action', () => {
  assert.equal(buildHomeFocusSummary(stats).route, '/express')
  assert.equal(buildHomeFocusSummary({ habits: { pending: 2 } }).route, '/plans')
  assert.equal(buildHomeFocusSummary({ cosmetics: { expiring: 1 } }).route, '/cosmetics')
  assert.equal(buildHomeFocusSummary({}).route, '/postgraduate')
})
