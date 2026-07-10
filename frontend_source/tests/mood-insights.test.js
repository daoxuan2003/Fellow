import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMoodConnectionSummary,
  buildMoodNudge,
  buildMoodPromptOptions,
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

test('buildMoodPromptOptions changes tone according to partner mood', () => {
  assert.match(buildMoodPromptOptions('tired')[1], /最累/)
  assert.match(buildMoodPromptOptions('excited')[0], /最亮/)
  assert.match(buildMoodPromptOptions('calm')[0], /安静/)
  assert.match(buildMoodPromptOptions()[0], /今天/)
})
