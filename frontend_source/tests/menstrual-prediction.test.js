import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCycleCalibrationPlan,
  buildCycleForecastBoard,
  buildCycleReliabilityRhythm,
  buildCycleRegularitySummary,
  buildMenstrualCarePlan,
  buildNextPeriodPrediction,
  buildOvulationWindow
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
    window: null,
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

test('buildNextPeriodPrediction keeps late-but-inside-window predictions distinct from overdue', () => {
  const result = buildNextPeriodPrediction({
    nextPeriod: {
      predictedDate: '2026-07-01',
      dateRange: { min: '2026-06-28', max: '2026-07-04' },
      daysUntil: -1,
      status: 'late',
      urgencyLabel: '仍在预测窗口',
      window: {
        start: '2026-06-28',
        peak: '2026-07-01',
        end: '2026-07-04',
        status: 'inside_after_peak',
        label: '窗口第 5/7 天',
        detail: '已过预计日 1 天，仍在预测窗口内',
        progressPercent: 67,
        dayIndex: 5,
        totalDays: 7,
        daysUntilPeak: -1
      }
    }
  }, fmt)

  assert.equal(result.text, '已过预计日 1 天')
  assert.equal(result.status, 'window')
  assert.equal(result.urgencyLabel, '仍在预测窗口')
  assert.deepEqual(result.window, {
    start: '06/28',
    peak: '07/01',
    end: '07/04',
    status: 'inside_after_peak',
    label: '窗口第 5/7 天',
    detail: '已过预计日 1 天，仍在预测窗口内',
    progressPercent: 67,
    dayIndex: 5,
    totalDays: 7,
    timingLabel: '5/7',
    daysUntilStart: undefined,
    daysUntilPeak: -1,
    daysUntilEnd: undefined
  })
})

test('buildNextPeriodPrediction stays readable when backend omits daysUntil', () => {
  const result = buildNextPeriodPrediction({
    nextPeriod: {
      predictedDate: '2026-07-01',
      dateRange: { min: '2026-06-28', max: '2026-07-04' },
      confidence: 'low'
    }
  }, fmt)

  assert.equal(result.text, '日期已预测')
  assert.equal(result.status, 'future')
  assert.equal(result.date, '07/01')
  assert.equal(result.range, '06/28~07/04')
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

test('buildCycleRegularitySummary explains calibrated likely missed cycles', () => {
  const result = buildCycleRegularitySummary({
    cycle: {
      avgLength: 28,
      minLength: 28,
      maxLength: 56,
      avgPeriodLength: 5,
      measuredCycleCount: 5,
      predictionSampleCount: 5,
      totalCycles: 6,
      stdDeviation: 11.2,
      adjustedStdDeviation: 0,
      regularity: 'somewhat_regular',
      regularityScore: 72,
      regularityLabel: '规律但有漏记',
      anomalySummary: { possibleMissingCycleCount: 1 },
      evidence: {
        qualityLabel: '已校准',
        possibleMissingCycleCount: 1,
        predictionSampleCount: 5,
        scoreReason: '发现疑似漏记周期，预测已按校准后的个人周期计算'
      }
    }
  })

  assert.equal(result.title, '规律但有漏记')
  assert.equal(result.level, 'balanced')
  assert.equal(result.qualityLabel, '已校准')
  assert.match(result.description, /疑似漏记周期/)
  assert.match(result.scoreReason, /校准后的个人周期/)
  assert.deepEqual(result.metrics[3], { label: '可用样本', value: '5/5' })
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

test('buildOvulationWindow formats ovulation and fertile window as reference-only data', () => {
  const result = buildOvulationWindow({
    ovulation: {
      predictedDate: '2026-06-15',
      fertileWindow: { start: '2026-06-10', end: '2026-06-16' },
      daysUntil: 1
    }
  }, fmt)

  assert.deepEqual(result, {
    date: '06/15',
    text: '1 天后',
    status: 'near',
    fertileWindow: '06/10~06/16',
    chip: '易孕窗口 06/10~06/16',
    disclaimer: '仅健康记录参考，不用于避孕或诊断'
  })
})

test('buildMenstrualCarePlan appends near ovulation window after backend recommendations', () => {
  const result = buildMenstrualCarePlan({
    carePlan: [
      { type: 'stable_reminder', title: '固定提醒', detail: '按预计日前后两天提醒', level: 'normal' }
    ],
    ovulation: {
      predictedDate: '2026-06-15',
      fertileWindow: { start: '2026-06-10', end: '2026-06-16' },
      daysUntil: 1
    }
  }, fmt)

  assert.equal(result[0].type, 'stable_reminder')
  assert.equal(result[1].type, 'ovulation_window')
  assert.equal(result[1].level, 'primary')
  assert.match(result[1].detail, /06\/10~06\/16/)
  assert.match(result[1].detail, /仅作健康记录参考/)
  assert.match(result[1].detail, /不用于避孕或诊断/)
})

test('buildMenstrualCarePlan falls back to urgency and irregularity', () => {
  const result = buildMenstrualCarePlan({
    nextPeriod: { daysUntil: -2, status: 'late' },
    cycle: { regularity: 'irregular' }
  })

  assert.equal(result[0].type, 'overdue_check')
  assert.ok(result.some(item => item.type === 'range_focus'))
})

test('buildCycleForecastBoard turns empty state into a concrete recording plan', () => {
  const board = buildCycleForecastBoard()

  assert.equal(board.state, 'empty')
  assert.equal(board.tone, 'building')
  assert.equal(board.primary.value, '0/3')
  assert.equal(board.progressPercent, 0)
  assert.equal(board.actions[0].type, 'start')
  assert.equal(board.calibration.statusLabel, '继续校准')
  assert.equal(board.calibration.checkpoints[0].value, '0/3')
  assert.equal(board.forecastSupport.title, '先建立个人节奏')
  assert.match(board.forecastSupport.note, /不用于诊断/)
})

test('buildCycleForecastBoard uses read-only copy when viewer cannot edit', () => {
  const board = buildCycleForecastBoard({ canEdit: false })

  assert.equal(board.actions[0].type, 'wait_record')
  assert.match(board.subtitle, /对方开始记录/)
})

test('buildCycleForecastBoard highlights ongoing cycle day and daily action', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-06-20', cycleEnd: null },
    records: [{ cycleStart: '2026-06-20', cycleEnd: null }],
    today: '2026-06-23',
    prediction: {
      nextPeriod: {
        predictedDate: '2026-07-18',
        dateRange: { min: '2026-07-13', max: '2026-07-23' },
        daysUntil: 25,
        uncertaintyDays: 5,
        confidenceLabel: '低'
      },
      cycle: {
        measuredCycleCount: 1,
        avgLength: 28,
        regularity: 'insufficient_data',
        regularityScore: 50
      }
    },
    formatDate: fmt
  })

  assert.equal(board.state, 'ongoing')
  assert.equal(board.tone, 'ongoing')
  assert.equal(board.primary.value, '第4天')
  assert.match(board.subtitle, /下次窗口/)
  assert.ok(board.progressPercent > 0)
})

test('buildCycleForecastBoard surfaces overdue prediction as warning', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    records: [
      { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
      { cycleStart: '2026-04-20', cycleEnd: '2026-04-24' },
      { cycleStart: '2026-03-20', cycleEnd: '2026-03-24' },
      { cycleStart: '2026-02-20', cycleEnd: '2026-02-24' }
    ],
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-18',
        dateRange: { min: '2026-06-16', max: '2026-06-20' },
        daysUntil: -5,
        confidence: 'medium',
        urgencyLabel: '已超出预测窗口',
        urgencyTone: 'warning',
        reason: '本次已经超过预测窗口'
      },
      cycle: {
        avgLength: 29,
        minLength: 28,
        maxLength: 30,
        avgPeriodLength: 5,
        measuredCycleCount: 3,
        totalCycles: 4,
        regularity: 'regular',
        regularityScore: 82,
        regularityLabel: '规律',
        evidence: { qualityLabel: '可用于提醒' }
      }
    },
    formatDate: fmt
  })

  assert.equal(board.state, 'forecast')
  assert.equal(board.tone, 'warning')
  assert.equal(board.primary.label, '需要核对')
  assert.match(board.primary.meta, /窗口/)
})

test('buildCycleForecastBoard keeps irregular predictions range-first with health boundaries', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-05-10', cycleEnd: '2026-05-18' },
    records: [
      { cycleStart: '2026-05-10', cycleEnd: '2026-05-18' },
      { cycleStart: '2026-03-24', cycleEnd: '2026-03-31' },
      { cycleStart: '2026-03-02', cycleEnd: '2026-03-08' },
      { cycleStart: '2026-01-20', cycleEnd: '2026-01-28' }
    ],
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-18',
        dateRange: { min: '2026-06-09', max: '2026-06-27' },
        daysUntil: 6,
        confidence: 'low',
        uncertaintyDays: 9,
        reason: '近期波动较大，本次按 ±9 天范围提醒'
      },
      cycle: {
        avgLength: 36,
        minLength: 22,
        maxLength: 47,
        avgPeriodLength: 9,
        measuredCycleCount: 3,
        totalCycles: 4,
        regularity: 'irregular',
        regularityScore: 42,
        regularityLabel: '不规律',
        typicalRange: { min: 24, max: 38 },
        periodTypicalRange: { min: 2, max: 8 },
        evidence: {
          qualityLabel: '只看范围',
          scoreReason: '近期周期差异较大，系统已放宽预测窗口'
        }
      },
      disclaimer: '预测仅用于健康记录参考，不用于诊断、治疗或避孕决策。'
    },
    today: '2026-06-12',
    formatDate: fmt
  })

  assert.equal(board.tone, 'warning')
  assert.equal(board.forecastSupport.title, '本次按范围提醒')
  assert.equal(board.forecastSupport.signals.find(item => item.id === 'method').value, '范围优先')
  assert.match(board.forecastSupport.detail, /06\/09~06\/27/)
  assert.match(board.forecastSupport.detail, /不要只盯单日/)
  assert.equal(board.forecastSupport.boundary.title, '需要留意')
  assert.ok(board.forecastSupport.boundary.items.some(item => item.includes('短于 24 天')))
  assert.ok(board.forecastSupport.boundary.items.some(item => item.includes('长于 38 天')))
  assert.ok(board.forecastSupport.boundary.items.some(item => item.includes('超过 8 天')))
  assert.match(board.forecastSupport.boundary.detail, /带记录咨询医生/)
})

test('buildCycleForecastBoard includes ovulation and fertile window context', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    records: [
      { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
      { cycleStart: '2026-04-22', cycleEnd: '2026-04-26' },
      { cycleStart: '2026-03-25', cycleEnd: '2026-03-29' },
      { cycleStart: '2026-02-25', cycleEnd: '2026-03-01' }
    ],
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-17',
        dateRange: { min: '2026-06-15', max: '2026-06-19' },
        daysUntil: 3,
        confidence: 'high',
        confidenceLabel: '高'
      },
      cycle: {
        avgLength: 28,
        minLength: 27,
        maxLength: 29,
        avgPeriodLength: 5,
        measuredCycleCount: 3,
        totalCycles: 4,
        regularity: 'very_regular',
        regularityScore: 95,
        regularityLabel: '非常规律',
        evidence: { qualityLabel: '可信度高', trend: { label: '近期稳定' } }
      },
      carePlan: [
        { type: 'stable_reminder', title: '固定提醒', detail: '按预计日前后两天提醒', level: 'normal' }
      ],
      ovulation: {
        predictedDate: '2026-06-03',
        fertileWindow: { start: '2026-05-29', end: '2026-06-04' },
        daysUntil: 1
      }
    },
    today: '2026-06-02',
    formatDate: fmt
  })

  assert.deepEqual(board.metrics.map(metric => metric.label), ['规律', '样本', '平均周期', '排卵', '可信度'])
  assert.equal(board.metrics.find(metric => metric.label === '排卵').value, '06/03')
  assert.ok(board.actions.some(action => action.type === 'ovulation_window'))
  assert.ok(board.actions.find(action => action.type === 'ovulation_window').detail.includes('仅作健康记录参考'))
  assert.ok(board.actions.find(action => action.type === 'ovulation_window').detail.includes('不用于避孕或诊断'))
  assert.ok(board.chips.includes('易孕窗口 05/29~06/04'))
})

test('buildCycleForecastBoard carries phase and symptom clues into board chips', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    records: [
      { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
      { cycleStart: '2026-04-22', cycleEnd: '2026-04-26' },
      { cycleStart: '2026-03-25', cycleEnd: '2026-03-29' }
    ],
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-17',
        daysUntil: 10,
        confidenceLabel: '中'
      },
      cycle: {
        measuredCycleCount: 3,
        regularity: 'regular',
        regularityScore: 82,
        regularityLabel: '规律',
        evidence: { qualityLabel: '可用于提醒' }
      },
      currentPhase: { phase: 'luteal', phaseName: '黄体期', phaseDay: 4 },
      heaviestDay: 2,
      symptomInsights: [{ name: '腰酸', rateLabel: '常伴' }]
    },
    today: '2026-06-07',
    formatDate: fmt
  })

  assert.ok(board.chips.includes('黄体期 · 第4天'))
  assert.ok(board.chips.includes('通常第2天量最大'))
})

test('buildCycleForecastBoard turns prediction windows into the primary progress signal', () => {
  const board = buildCycleForecastBoard({
    latestPeriod: { cycleStart: '2026-06-01', cycleEnd: '2026-06-05' },
    records: [
      { cycleStart: '2026-06-01', cycleEnd: '2026-06-05' },
      { cycleStart: '2026-05-04', cycleEnd: '2026-05-08' },
      { cycleStart: '2026-04-06', cycleEnd: '2026-04-10' },
      { cycleStart: '2026-03-09', cycleEnd: '2026-03-13' }
    ],
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-29',
        dateRange: { min: '2026-06-27', max: '2026-07-01' },
        daysUntil: 1,
        status: 'window',
        confidenceLabel: '高',
        urgencyLabel: '进入预测窗口',
        window: {
          start: '2026-06-27',
          peak: '2026-06-29',
          end: '2026-07-01',
          status: 'inside_before_peak',
          label: '窗口第 2/5 天',
          detail: '距预计日还有 1 天，开始后及时记录第一天',
          progressPercent: 25,
          dayIndex: 2,
          totalDays: 5
        }
      },
      cycle: {
        avgLength: 28,
        measuredCycleCount: 3,
        totalCycles: 4,
        regularity: 'very_regular',
        regularityScore: 95,
        regularityLabel: '非常规律',
        evidence: { qualityLabel: '可信度高' }
      }
    },
    today: '2026-06-28',
    formatDate: fmt
  })

  assert.equal(board.title, '已进入预测窗口')
  assert.equal(board.primary.label, '窗口')
  assert.equal(board.primary.value, '窗口第 2/5 天')
  assert.equal(board.progressPercent, 25)
  assert.equal(board.window.start, '06/27')
  assert.equal(board.window.timingLabel, '2/5')
  assert.ok(board.metrics.some(metric => metric.label === '窗口' && metric.value === '2/5'))
})

test('buildCycleReliabilityRhythm explains low-sample prediction limits', () => {
  const rhythm = buildCycleReliabilityRhythm({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-18',
        dateRange: { min: '2026-06-12', max: '2026-06-24' },
        daysUntil: 8,
        confidence: 'low',
        uncertaintyDays: 6,
        reason: '样本不足，先按宽窗口提醒'
      },
      cycle: {
        measuredCycleCount: 1,
        totalCycles: 2,
        regularity: 'insufficient_data',
        regularityScore: 50
      }
    },
    today: '2026-06-10',
    formatDate: fmt
  })

  assert.equal(rhythm.level, 'building')
  assert.equal(rhythm.label, '建立中')
  assert.match(rhythm.summary, /还差 2 个完整周期/)
  assert.equal(rhythm.signals.find(item => item.id === 'samples').value, '1/3')
  assert.equal(rhythm.signals.find(item => item.id === 'window').value, '06/12~06/24')
  assert.match(rhythm.nextAction.title, /下一次开始/)
})

test('buildCycleReliabilityRhythm turns stable cycles into a concrete care cadence', () => {
  const rhythm = buildCycleReliabilityRhythm({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-17',
        dateRange: { min: '2026-06-15', max: '2026-06-19' },
        daysUntil: 2,
        confidence: 'high',
        uncertaintyDays: 2,
        reason: '样本集中且规律稳定'
      },
      cycle: {
        measuredCycleCount: 5,
        predictionSampleCount: 5,
        regularity: 'very_regular',
        regularityScore: 95,
        adjustedStdDeviation: 1.2
      }
    },
    today: '2026-06-15',
    formatDate: fmt
  })

  assert.equal(rhythm.level, 'steady')
  assert.equal(rhythm.label, '较稳定')
  assert.match(rhythm.summary, /固定节奏/)
  assert.match(rhythm.scoreLabel, /\d+分/)
  assert.equal(rhythm.signals.find(item => item.id === 'samples').value, '5个可用')
  assert.match(rhythm.nextAction.title, /照顾包/)
})

test('buildCycleReliabilityRhythm marks corrected missing cycles as calibrated', () => {
  const rhythm = buildCycleReliabilityRhythm({
    latestPeriod: { cycleStart: '2026-05-20', cycleEnd: '2026-05-24' },
    prediction: {
      nextPeriod: {
        predictedDate: '2026-06-18',
        dateRange: { min: '2026-06-13', max: '2026-06-23' },
        daysUntil: 6,
        confidence: 'medium',
        uncertaintyDays: 5,
        reason: '已按疑似漏记放宽窗口'
      },
      cycle: {
        measuredCycleCount: 4,
        predictionSampleCount: 3,
        regularity: 'somewhat_regular',
        regularityScore: 72,
        adjustedStdDeviation: 2.4,
        anomalySummary: { possibleMissingCycleCount: 1 },
        evidence: { possibleMissingCycleCount: 1 }
      }
    },
    today: '2026-06-12',
    formatDate: fmt
  })

  assert.equal(rhythm.level, 'calibrating')
  assert.equal(rhythm.label, '已校准')
  assert.match(rhythm.summary, /疑似漏记周期/)
  assert.equal(rhythm.signals.find(item => item.id === 'spread').value, '约2.4天')
  assert.match(rhythm.signals.find(item => item.id === 'spread').detail, /疑似漏记/)
})

test('buildCycleCalibrationPlan explains what makes prediction reliable', () => {
  const calibration = buildCycleCalibrationPlan({
    latestPeriod: {
      cycleStart: '2026-06-01',
      cycleEnd: '2026-06-05',
      flowRecords: [
        { date: '2026-06-01', flowLevel: 2 },
        { date: '2026-06-02', flowLevel: 3 },
        { date: '2026-06-03', flowLevel: 2 }
      ]
    },
    records: [
      {
        cycleStart: '2026-06-01',
        cycleEnd: '2026-06-05',
        flowRecords: [
          { date: '2026-06-01', flowLevel: 2 },
          { date: '2026-06-02', flowLevel: 3 },
          { date: '2026-06-03', flowLevel: 2 }
        ]
      },
      { cycleStart: '2026-05-04', cycleEnd: '2026-05-08', flowRecords: [] },
      { cycleStart: '2026-04-06', cycleEnd: '2026-04-10', flowRecords: [] },
      { cycleStart: '2026-03-09', cycleEnd: '2026-03-13', flowRecords: [] }
    ],
    prediction: {
      nextPeriod: {
        confidence: 'high',
        uncertaintyDays: 2,
        reason: '样本集中且规律稳定'
      },
      heaviestDay: 2,
      cycle: {
        measuredCycleCount: 5,
        regularity: 'very_regular',
        evidence: { scoreReason: '样本集中且大多落在常见周期范围' }
      }
    },
    today: '2026-06-07'
  })

  assert.equal(calibration.level, 'stable')
  assert.equal(calibration.statusLabel, '可信度高')
  assert.equal(calibration.progressPercent, 100)
  assert.deepEqual(calibration.checkpoints.map(item => item.state), ['done', 'done', 'done', 'done'])
  assert.equal(calibration.checkpoints.find(item => item.id === 'window').value, '±2天')
})

test('buildCycleCalibrationPlan points ongoing records to the next useful check-in', () => {
  const calibration = buildCycleCalibrationPlan({
    latestPeriod: {
      cycleStart: '2026-06-20',
      cycleEnd: null,
      flowRecords: [{ date: '2026-06-20', flowLevel: 2 }]
    },
    records: [
      { cycleStart: '2026-06-20', cycleEnd: null, flowRecords: [{ date: '2026-06-20', flowLevel: 2 }] },
      { cycleStart: '2026-05-21', cycleEnd: '2026-05-25', flowRecords: [] }
    ],
    prediction: {
      nextPeriod: { confidence: 'low', uncertaintyDays: 7 },
      cycle: { measuredCycleCount: 1, regularity: 'insufficient_data' }
    },
    today: '2026-06-21'
  })

  assert.equal(calibration.level, 'building')
  assert.equal(calibration.checkpoints.find(item => item.id === 'boundary').state, 'active')
  assert.equal(calibration.checkpoints.find(item => item.id === 'daily').state, 'active')
  assert.match(calibration.nextStep.title, /今天/)
  assert.ok(calibration.progressPercent > 0)
})
