import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createExerciseForm,
  fitnessDateDay,
  fitnessExerciseAssessment,
  fitnessExerciseLogSummary,
  fitnessExerciseTarget,
  fitnessExerciseWeight,
  fitnessProgressPercent,
  fitnessWeekDayLabel
} from '../src/utils/fitness-plan.js'

test('fitness targets always render exact sets and repetitions', () => {
  assert.equal(
    fitnessExerciseTarget({ tracking: 'reps', sets: 3, reps: 12, note: '每侧固定12次' }),
    '3组 × 12次 · 每侧固定12次'
  )
  assert.equal(fitnessExerciseTarget({ tracking: 'seconds', sets: 2, seconds: 30 }), '2组 × 30秒')
  assert.equal(fitnessExerciseTarget({ tracking: 'minutes', minutes: 30 }), '30分钟')
  assert.doesNotMatch(fitnessExerciseTarget({ tracking: 'reps', sets: 3, reps: 10 }), /\d+[-–]\d+/)
})

test('new exercise entries require actual values and only reuse a previous weight', () => {
  assert.deepEqual(
    createExerciseForm({ tracking: 'reps', sets: 3, reps: 10 }),
    { completed: true, weightKg: '', actualReps: ['', '', ''], actualSeconds: [], durationMinutes: '' }
  )
  assert.deepEqual(createExerciseForm(
    { tracking: 'reps', sets: 3, reps: 10 },
    null,
    { completed: true, actualReps: [10, 12, 10], weightKg: 12.5 }
  ), { completed: true, weightKg: 12.5, actualReps: ['', '', ''], actualSeconds: [], durationMinutes: '' })
  assert.deepEqual(createExerciseForm(
    { tracking: 'seconds', sets: 2, seconds: 30 },
    null,
    { completed: true, actualSeconds: [30, 30] }
  ).actualSeconds, ['', ''])
  assert.equal(createExerciseForm(
    { tracking: 'minutes', minutes: 30 },
    null,
    { completed: true, durationMinutes: 30 }
  ).durationMinutes, '')
})

test('editing preserves zero and partial actual values without inventing missing records', () => {
  const saved = createExerciseForm(
    { tracking: 'reps', sets: 3, reps: 10 },
    { completed: true, actualReps: [10, 0], weightKg: 12.5 }
  )
  assert.deepEqual(saved.actualReps, [10, 0, ''])
  assert.equal(saved.weightKg, 12.5)
  assert.deepEqual(createExerciseForm(
    { tracking: 'seconds', sets: 3, seconds: 30 },
    { completed: true, actualSeconds: [0, null, ''], weightKg: 0 }
  ).actualSeconds, [0, '', ''])
  assert.equal(createExerciseForm(
    { tracking: 'minutes', minutes: 30 },
    { completed: true, durationMinutes: 0 }
  ).durationMinutes, 0)
  assert.equal(createExerciseForm(
    { tracking: 'minutes', minutes: 30 },
    { completed: true, durationMinutes: null }
  ).durationMinutes, '')
  assert.equal(createExerciseForm(
    { tracking: 'reps', sets: 2, reps: 10 },
    { completed: true, actualReps: [10, 10], weightKg: null },
    { completed: true, weightKg: 25 }
  ).weightKg, '')
  assert.equal(createExerciseForm(
    { tracking: 'reps', sets: 2, reps: 10 },
    { completed: true, actualReps: [10, 10], weightKg: 0 },
    { completed: true, weightKg: 25 }
  ).weightKg, 0)
  assert.equal(createExerciseForm(
    { tracking: 'reps', sets: 2, reps: 10 },
    { completed: false, weightKg: 5 },
    { completed: true, weightKg: 25 }
  ).weightKg, 5)
  assert.equal(createExerciseForm(
    { tracking: 'reps', sets: 2, reps: 10 },
    { completed: false, weightKg: null },
    { completed: true, weightKg: 25 }
  ).weightKg, '')
})

test('exercise summaries show units and keep zero distinct from missing values', () => {
  assert.equal(
    fitnessExerciseLogSummary(
      { tracking: 'reps' },
      { completed: true, actualReps: [10, 9, 8], weightKg: 12.5 }
    ),
    '10 / 9 / 8次 · 12.5 kg'
  )
  assert.equal(fitnessExerciseLogSummary(
    { tracking: 'reps' },
    { completed: true, actualReps: [0, 0], weightKg: null }
  ), '0 / 0次')
  assert.equal(fitnessExerciseLogSummary(
    { tracking: 'seconds' },
    { completed: true, actualSeconds: [30, 0, null] }
  ), '30 / 0 / —秒')
  assert.equal(fitnessExerciseLogSummary(
    { tracking: 'minutes' }, { completed: true, durationMinutes: 0 }
  ), '0分钟')
  assert.equal(fitnessExerciseLogSummary(
    { tracking: 'minutes' }, { completed: true, durationMinutes: null }
  ), '实际时长未记录')
  assert.equal(fitnessExerciseLogSummary(
    { tracking: 'reps' }, { completed: true, actualReps: [] }
  ), '实际次数未记录')
  assert.equal(fitnessExerciseLogSummary({ tracking: 'reps' }, null), '待记录')
})

test('weight labels preserve explicit zero and never label missing weight as bodyweight', () => {
  for (const value of [null, undefined, '', ' ', false, -1, NaN, Infinity]) {
    assert.equal(fitnessExerciseWeight({ weightKg: value }), '未记录重量')
  }
  assert.equal(fitnessExerciseWeight(null), '未记录重量')
  assert.equal(fitnessExerciseWeight({ weightKg: 0 }), '0 kg')
  assert.equal(fitnessExerciseWeight({ weightKg: '12.5' }), '12.5 kg')
})

test('target assessment checks every set without compensating with extra repetitions', () => {
  const exercise = { tracking: 'reps', sets: 3, reps: 10 }
  assert.deepEqual(fitnessExerciseAssessment(exercise, null), {
    recorded: false, metTarget: false, metSets: 0, totalSets: 3,
    label: '待记录', detail: '3组 × 10次'
  })
  assert.deepEqual(fitnessExerciseAssessment(exercise, { completed: true, actualReps: [20, 10, 0] }), {
    recorded: true, metTarget: false, metSets: 2, totalSets: 3,
    label: '未达目标', detail: '2/3组达到10次'
  })
  assert.deepEqual(fitnessExerciseAssessment(exercise, { completed: true, actualReps: [10, 10, 12] }), {
    recorded: true, metTarget: true, metSets: 3, totalSets: 3,
    label: '已达目标', detail: '3/3组达到10次'
  })
  assert.equal(fitnessExerciseAssessment(exercise, {
    completed: true, actualReps: [10, 10, 0, 10]
  }).metTarget, false)
})

test('missing actual values cannot be assessed as achieved targets', () => {
  const exercise = { tracking: 'reps', sets: 3, reps: 10 }
  for (const actualReps of [[], [10, 10], [null, '', undefined], '999']) {
    const assessment = fitnessExerciseAssessment(exercise, { completed: true, actualReps })
    assert.equal(assessment.recorded, true)
    assert.equal(assessment.metTarget, false)
    assert.equal(assessment.label, '未达目标')
  }
  assert.equal(fitnessExerciseAssessment(exercise, {
    completed: false, actualReps: [10, 10, 10]
  }).recorded, false)
  assert.equal(fitnessExerciseAssessment({ tracking: 'reps' }, {
    completed: true, actualReps: [10, 10, 10]
  }).metTarget, false)
})

test('time assessments distinguish zero, missing and completed durations', () => {
  const seconds = { tracking: 'seconds', sets: 2, seconds: 30 }
  assert.deepEqual(fitnessExerciseAssessment(seconds, { completed: true, actualSeconds: [60, 0] }), {
    recorded: true, metTarget: false, metSets: 1, totalSets: 2,
    label: '未达目标', detail: '1/2组达到30秒'
  })
  assert.equal(fitnessExerciseAssessment(seconds, { completed: true, actualSeconds: [30, 35] }).metTarget, true)
  const minutes = { tracking: 'minutes', minutes: 30 }
  for (const durationMinutes of [null, '', undefined, 0, 29]) {
    assert.equal(fitnessExerciseAssessment(minutes, { completed: true, durationMinutes }).metTarget, false)
  }
  assert.deepEqual(fitnessExerciseAssessment(minutes, { completed: true, durationMinutes: 30 }), {
    recorded: true, metTarget: true, metSets: 1, totalSets: 1,
    label: '已达目标', detail: '实际30分钟 / 目标30分钟'
  })
  assert.equal(fitnessExerciseAssessment(minutes, { completed: true, durationMinutes: 0 }).detail, '实际0分钟 / 目标30分钟')
  assert.equal(fitnessExerciseAssessment(minutes, { completed: true, durationMinutes: null }).detail, '实际未记录 / 目标30分钟')
})

test('fitness progress and date labels clamp and validate values', () => {
  assert.equal(fitnessProgressPercent(3, 4), 75)
  assert.equal(fitnessProgressPercent(8, 4), 100)
  assert.equal(fitnessProgressPercent(1, 0), 0)
  assert.equal(fitnessWeekDayLabel('2026-09-02'), '三')
  assert.equal(fitnessDateDay('2026-09-02'), '2')
  assert.equal(fitnessWeekDayLabel('2026-02-31'), '')
})

test('fitness flow stays inside health and exposes truthful interactive states', async () => {
  const [fitnessView, healthView, router] = await Promise.all([
    readFile(new URL('../src/views/Fitness.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/views/Health.vue', import.meta.url), 'utf8'),
    readFile(new URL('../src/router/index.js', import.meta.url), 'utf8')
  ])

  assert.match(router, /path:\s*['"]\/health\/fitness['"]/)
  assert.match(healthView, /训练与减脂/)
  assert.match(healthView, /openFitness/)
  assert.match(fitnessView, /今日/)
  assert.match(fitnessView, /计划/)
  assert.match(fitnessView, /进展/)
  assert.match(fitnessView, /fitnessSync/)
  assert.match(fitnessView, /role="dialog"/)
  assert.match(fitnessView, /handleSheetKeydown/)
  assert.match(fitnessView, /document\.body\.style\.overflow = 'hidden'/)
  assert.match(fitnessView, /sheetInvoker\?\.focus/)
  assert.match(fitnessView, /aria-live="assertive"/)
  assert.match(fitnessView, /还没有身体数据/)
  assert.match(fitnessView, /网络连接失败，请检查后重试/)
})
