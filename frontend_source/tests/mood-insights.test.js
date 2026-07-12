import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMoodConnectionSummary,
  buildMoodDailyQuest,
  buildMoodNudge,
  buildMoodPromptOptions,
  buildMoodRitualBoard,
  buildMoodResponsePlan,
  getLatestMoodForUser
} from '../src/utils/mood-insights.js'

const me = '111'
const partner = '222'

const record = (overrides) => ({
  id: `${overrides.userId}-${overrides.recordDate}`,
  mood: 'happy',
  recordDate: overrides.recordDate,
  createdAt: `${overrides.recordDate}T20:00:00.000Z`,
  user: { id: overrides.userId, nickname: overrides.userId === me ? '我' : 'TA' },
  ...overrides
})

test('getLatestMoodForUser returns the newest record for the requested local day', () => {
  const result = getLatestMoodForUser([
    record({ userId: me, mood: 'calm', recordDate: '2026-06-20', createdAt: '2026-06-20T08:00:00.000Z' }),
    record({ userId: me, mood: 'loved', recordDate: '2026-06-20', createdAt: '2026-06-20T21:00:00.000Z' }),
    record({ userId: partner, mood: 'sad', recordDate: '2026-06-20', createdAt: '2026-06-20T22:00:00.000Z' })
  ], '2026-06-20', me)

  assert.equal(result.mood, 'loved')
})

test('buildMoodConnectionSummary counts streaks, paired days and dominant mood', () => {
  const summary = buildMoodConnectionSummary({
    currentUserId: me,
    partnerId: partner,
    partnerName: '小赴',
    today: '2026-06-22',
    dailyMoods: [
      { date: '2026-06-22', records: [record({ userId: me, mood: 'calm', recordDate: '2026-06-22' })] },
      { date: '2026-06-21', records: [
        record({ userId: me, mood: 'happy', recordDate: '2026-06-21' }),
        record({ userId: partner, mood: 'tired', recordDate: '2026-06-21' })
      ] },
      { date: '2026-06-20', records: [record({ userId: me, mood: 'happy', recordDate: '2026-06-20' })] }
    ],
    statsData: {
      myStats: { happy: 2, calm: 1 }
    }
  })

  assert.equal(summary.currentStreak, 3)
  assert.equal(summary.myRecordedDays, 3)
  assert.equal(summary.partnerRecordedDays, 1)
  assert.equal(summary.pairedDays, 1)
  assert.equal(summary.dominantMood.mood, 'happy')
  assert.equal(summary.nudge.tone, 'waiting')
  assert.equal(summary.dailyQuest.tone, 'waiting')
  assert.equal(summary.dailyQuest.progressPercent, 64)
  assert.equal(summary.dailyQuest.steps[0].state, 'done')
})

test('buildMoodConnectionSummary detects partner-only today and care prompts', () => {
  const summary = buildMoodConnectionSummary({
    currentUserId: me,
    partnerId: partner,
    partnerName: '小赴',
    today: '2026-06-22',
    dailyMoods: [
      { date: '2026-06-22', records: [record({ userId: partner, mood: 'sad', recordDate: '2026-06-22' })] }
    ]
  })

  assert.equal(summary.todayMine, null)
  assert.equal(summary.todayPartner.mood, 'sad')
  assert.equal(summary.nudge.tone, 'care')
  assert.equal(summary.responsePlan.tone, 'care')
  assert.equal(summary.responsePlan.suggestedMood, 'calm')
  assert.match(summary.responsePlan.noteDraft, /我在/)
  assert.match(summary.nudge.title, /小赴/)
  assert.match(summary.promptOptions[0], /我在/)
  assert.equal(summary.dailyQuest.tone, 'care')
  assert.equal(summary.dailyQuest.rewardLabel, '差我的回应')
  assert.equal(summary.dailyQuest.steps[0].state, 'active')
  assert.equal(summary.dailyQuest.steps[1].state, 'done')
})

test('buildMoodNudge returns synced state when both users recorded today', () => {
  const nudge = buildMoodNudge({
    todayMine: record({ userId: me, recordDate: '2026-06-22' }),
    todayPartner: record({ userId: partner, recordDate: '2026-06-22' })
  })

  assert.equal(nudge.tone, 'synced')
  assert.equal(nudge.actionLabel, '补一句今天的尾声')
})

test('buildMoodResponsePlan creates concrete reply and review actions', () => {
  const carePlan = buildMoodResponsePlan({
    todayPartner: record({ userId: partner, mood: 'tired', recordDate: '2026-06-22' }),
    partnerName: '小赴'
  })

  assert.equal(carePlan.tone, 'care')
  assert.equal(carePlan.actionLabel, '使用关心回应')
  assert.equal(carePlan.checklist.length, 3)

  const reviewPlan = buildMoodResponsePlan({
    todayMine: record({ userId: me, mood: 'happy', recordDate: '2026-06-22' }),
    todayPartner: record({ userId: partner, mood: 'calm', recordDate: '2026-06-22' }),
    partnerName: '小赴'
  })

  assert.equal(reviewPlan.tone, 'synced')
  assert.equal(reviewPlan.suggestedMood, 'happy')
  assert.match(reviewPlan.title, /3 分钟复盘/)
})

test('buildMoodDailyQuest turns today state into a clear progress loop', () => {
  const emptyQuest = buildMoodDailyQuest({ partnerName: '小赴' })
  assert.equal(emptyQuest.tone, 'start')
  assert.equal(emptyQuest.progressPercent, 0)
  assert.equal(emptyQuest.steps.map(step => step.state).join(','), 'active,pending,pending')

  const partnerFirstQuest = buildMoodDailyQuest({
    todayPartner: record({ userId: partner, mood: 'excited', recordDate: '2026-06-22' }),
    partnerName: '小赴'
  })
  assert.equal(partnerFirstQuest.tone, 'reply')
  assert.equal(partnerFirstQuest.progressPercent, 48)
  assert.match(partnerFirstQuest.title, /小赴/)
  assert.equal(partnerFirstQuest.actionLabel, '补上我')

  const syncedQuest = buildMoodDailyQuest({
    todayMine: record({ userId: me, mood: 'calm', recordDate: '2026-06-22' }),
    todayPartner: record({ userId: partner, mood: 'happy', recordDate: '2026-06-22' }),
    currentStreak: 5,
    pairedDays: 3
  })
  assert.equal(syncedQuest.tone, 'synced')
  assert.equal(syncedQuest.progressPercent, 100)
  assert.equal(syncedQuest.rewardLabel, '3 个同日回应')
  assert.ok(syncedQuest.steps.every(step => step.state === 'done'))
})

test('buildMoodRitualBoard frames the next emotional action', () => {
  const partnerOnly = buildMoodConnectionSummary({
    currentUserId: me,
    partnerId: partner,
    partnerName: '小赴',
    today: '2026-06-22',
    dailyMoods: [
      { date: '2026-06-22', records: [record({ userId: partner, mood: 'tired', recordDate: '2026-06-22', note: '今天很累' })] }
    ]
  })
  const board = buildMoodRitualBoard({
    connection: partnerOnly,
    myName: '我',
    partnerName: '小赴',
    getMoodLabel: mood => ({ tired: '疲惫' })[mood] || mood
  })

  assert.equal(board.tone, 'care')
  assert.equal(board.bridge.label, '先接住 TA')
  assert.match(board.bridge.detail, /低电量/)
  assert.equal(board.participants[0].state, 'empty')
  assert.equal(board.participants[1].label, '疲惫')
  assert.equal(board.actionLabel, '使用关心回应')
  assert.equal(board.stats.map(item => item.id).join(','), 'streak,paired,completion')
})

test('buildMoodRitualBoard rewards completed daily connection', () => {
  const synced = buildMoodConnectionSummary({
    currentUserId: me,
    partnerId: partner,
    partnerName: '小赴',
    today: '2026-06-22',
    dailyMoods: [
      { date: '2026-06-22', records: [
        record({ userId: me, mood: 'calm', recordDate: '2026-06-22' }),
        record({ userId: partner, mood: 'happy', recordDate: '2026-06-22' })
      ] }
    ]
  })
  const board = buildMoodRitualBoard({ connection: synced, partnerName: '小赴' })

  assert.equal(board.tone, 'synced')
  assert.equal(board.bridge.label, '今天已闭环')
  assert.equal(board.quest.progressPercent, 100)
  assert.ok(board.quest.steps.every(step => step.state === 'done'))
  assert.equal(board.participants.every(item => item.state === 'recorded'), true)
})

test('buildMoodPromptOptions changes tone according to partner mood', () => {
  assert.match(buildMoodPromptOptions('tired')[1], /最累/)
  assert.match(buildMoodPromptOptions('excited')[0], /最亮/)
  assert.match(buildMoodPromptOptions('calm')[0], /安静/)
  assert.match(buildMoodPromptOptions()[0], /今天/)
})
