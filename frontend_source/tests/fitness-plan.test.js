import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import {
  createExerciseForm,
  fitnessDateDay,
  fitnessExerciseLogSummary,
  fitnessExerciseTarget,
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

test('fitness exercise form defaults to exact plan but preserves real saved values', () => {
  assert.deepEqual(
    createExerciseForm({ tracking: 'reps', sets: 3, reps: 10 }),
    { completed: true, weightKg: '', actualReps: [10, 10, 10], actualSeconds: [], durationMinutes: '' }
  )
  const saved = createExerciseForm(
    { tracking: 'reps', sets: 3, reps: 10 },
    { completed: true, actualReps: [10, 9, 8], weightKg: 12.5 }
  )
  assert.deepEqual(saved.actualReps, [10, 9, 8])
  assert.equal(saved.weightKg, 12.5)
  assert.equal(
    fitnessExerciseLogSummary(
      { tracking: 'reps' },
      { completed: true, actualReps: [10, 9, 8], weightKg: 12.5 }
    ),
    '10 / 9 / 8 · 12.5kg'
  )
  assert.equal(createExerciseForm(
    { tracking: 'reps', sets: 2, reps: 10 },
    { completed: true, actualReps: [10, 10], weightKg: null }
  ).weightKg, '')
  assert.doesNotMatch(
    fitnessExerciseLogSummary(
      { tracking: 'reps' },
      { completed: true, actualReps: [10, 10], weightKg: null }
    ),
    /0kg/
  )
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
