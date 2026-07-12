import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildHomeCommandStats,
  buildHomeFocusSummary,
  buildHomeLaunchCards,
  buildHomeLifeCards,
  buildHomePriorityCards,
  buildHomeQuickActions,
  buildHomeRelationshipMoment
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

test('home relationship moment turns couple memories into first-screen actions', () => {
  const moment = buildHomeRelationshipMoment(stats, { togetherDays: 520 })

  assert.equal(moment.eyebrow, '今日小纸条')
  assert.equal(moment.stampLabel, '我们的今天')
  assert.equal(moment.stamp, '第 520 天')
  assert.equal(moment.title, '这里等你补上一句回应')
  assert.deepEqual(moment.keepsakes.map(item => item.id), ['mood', 'album', 'wish'])
  assert.equal(moment.primaryAction.route, '/mood')
  assert.equal(moment.primaryAction.label, '补上我的回应')
  assert.equal(moment.keepsakes.find(item => item.id === 'mood').value, '差你一句')
  assert.equal(moment.keepsakes.find(item => item.id === 'album').value, '36张照片')

  const syncedMoment = buildHomeRelationshipMoment({
    mood: { today: true, partnerToday: true },
    wishes: { pending: 0 },
    habits: { pending: 0 },
    album: { photos: 8 }
  }, { togetherDays: 12 })

  assert.equal(syncedMoment.title, '今天已经互相回应了')
  assert.equal(syncedMoment.primaryAction.route, '/album')
  assert.equal(syncedMoment.primaryAction.label, '翻看我们的相册')
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

test('home launch cards expose every core function in the first dashboard group', () => {
  const cards = buildHomeLaunchCards(stats)
  const ids = cards.map(card => card.id)
  const mood = cards.find(card => card.id === 'mood')
  const express = cards.find(card => card.id === 'express')

  assert.deepEqual(ids, [
    'postgraduate',
    'plans',
    'mood',
    'album',
    'health',
    'express',
    'cosmetics',
    'budget',
    'shopping',
    'wish'
  ])
  assert.equal(mood.status, '差一人')
  assert.equal(mood.attention, true)
  assert.equal(express.status, '1急件')
})

test('home quick actions keep the most-used routes visible before detailed cards', () => {
  const actions = buildHomeQuickActions(stats)

  assert.deepEqual(actions.map(action => action.id), [
    'postgraduate',
    'plans',
    'mood',
    'album',
    'health',
    'express'
  ])
  assert.deepEqual(actions.map(action => action.rank), [1, 2, 3, 4, 5, 6])
  assert.equal(actions[0].emphasis, 'primary')
  assert.equal(actions[1].emphasis, 'primary')
  assert.equal(actions[2].emphasis, 'secondary')
  assert.equal(actions.find(action => action.id === 'express').status, '1急件')
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
  assert.equal(buildHomeFocusSummary({ mood: { today: true, partnerToday: false }, cosmetics: { expiring: 1 } }).route, '/mood')
  assert.equal(buildHomeFocusSummary({ mood: { today: true, partnerToday: true }, cosmetics: { expiring: 1 } }).route, '/cosmetics')
  assert.equal(buildHomeFocusSummary({}).route, '/postgraduate')
})
