import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCycleRegularitySummary,
  buildMenstrualCarePlan,
  buildNextPeriodPrediction
} from '../src/utils/menstrual-prediction.js'

const fmt = value => value ? value.slice(5).replace('-', '/') : '-'

test('buildNextPeriodPrediction formats future dates, range and confidence', () => {
  assert.deepEqual(buildNextPeriodPrediction({
    nextPeriod: {
      predictedDate: '2026-07-01',
      dateRange: { min: '2026-06-29', max: '2026-07-03' },
      daysUntil: 4,
      confidence: 'medium',
      basis: '基于最近 4 个完整周期'
    }
  }, fmt), {
    date: '07/01',
    text: '还有 4 天',
    status: 'future',
    range: '06/29~07/03',
    windowLabel: '',
    confidenceLabel: '中',
    basis: '基于最近 4 个完整周期',
    reason: '',
    urgencyLabel: '',
    urgencyTone: 'normal'
  })
})

test('buildNextPeriodPrediction marks overdue predictions clearly', () => {
  const result = buildNextPeriodPrediction({
    nextPeriod: {
      predictedDate: '2026-06-20',
      daysUntil: -3,
      confidenceLabel: '低'
    }
  }, fmt)

  assert.equal(result.text, '已逾期 3 天')
  assert.equal(result.status, 'overdue')
})

test('buildCycleRegularitySummary surfaces stable cycle evidence', () => {
  const result = buildCycleRegularitySummary({
    cycle: {
      avgLength: 28,
      minLength: 27,
      maxLength: 29,
      avgPeriodLength: 5,
      measuredCycleCount: 6,
      totalCycles: 7,
      stdDeviation: 1.2,
      regularity: 'very_regular',
      regularityScore: 95,
      regularityLabel: '非常规律',
      evidence: {
        qualityLabel: '可信度高',
        scoreReason: '样本集中且大多落在常见周期范围',
        trend: { direction: 'stable', label: '近期稳定' },
        anchors: [
          { label: '周期样本', value: '6个', hint: '已进入个人规律判断' }
        ]
      }
    },
    disclaimer: '预测仅用于健康记录参考。'
  })

  assert.equal(result.title, '非常规律')
  assert.equal(result.level, 'stable')
  assert.equal(result.scoreLabel, '95分')
  assert.equal(result.metrics[1].value, '27-29天')
  assert.equal(result.qualityLabel, '可信度高')
  assert.equal(result.scoreReason, '样本集中且大多落在常见周期范围')
  assert.equal(result.trend.direction, 'stable')
  assert.equal(result.evidence[0].label, '周期样本')
  assert.match(result.description, /预测可信度更高/)
})

test('buildCycleRegularitySummary asks for more data when samples are insufficient', () => {
  const result = buildCycleRegularitySummary({
    cycle: {
      avgLength: 30,
      avgPeriodLength: 4,
      measuredCycleCount: 1,
      totalCycles: 2,
      regularity: 'insufficient_data',
      regularityScore: 50
    }
  })

  assert.equal(result.level, 'building')
  assert.equal(result.scoreLabel, '50分')
  assert.match(result.description, /还差 2 个完整周期/)
})

test('buildMenstrualCarePlan uses backend recommendations first', () => {
  const result = buildMenstrualCarePlan({
    carePlan: [
      { type: 'prepare', title: '提前准备', detail: '准备低负担安排', level: 'primary' }
    ]
  })

  assert.deepEqual(result, [
    { type: 'prepare', title: '提前准备', detail: '准备低负担安排', level: 'primary' }
  ])
})

test('buildMenstrualCarePlan falls back to urgency and irregularity', () => {
  const result = buildMenstrualCarePlan({
    nextPeriod: { daysUntil: -2, status: 'late' },
    cycle: { regularity: 'irregular' }
  })

  assert.equal(result[0].type, 'overdue_check')
  assert.ok(result.some(item => item.type === 'range_focus'))
})
