import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

import {
  buildHealthProfileBoard,
  buildHealthMonthOptions,
  buildLatestHealthSnapshot,
  calculateHealthBmi,
  filterHealthRecordsByMonth,
  formatHealthDate,
  sanitizeHealthPayload
} from '../src/utils/health-profile.js'

function runHealthDateInTimezone(timeZone, value) {
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      `import { formatHealthDate } from './src/utils/health-profile.js'; console.log(formatHealthDate(${JSON.stringify(value)}))`
    ],
    {
      cwd: new URL('..', import.meta.url),
      env: { ...process.env, TZ: timeZone },
      encoding: 'utf8'
    }
  )

  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test('health date formatting preserves exact date-only values and converts ISO by local day', () => {
  assert.equal(formatHealthDate('2026-06-29'), '2026-06-29')
  assert.equal(formatHealthDate('2026-02-31'), '')
  assert.equal(runHealthDateInTimezone('Asia/Shanghai', '2026-06-28T16:00:00.000Z'), '2026-06-29')
  assert.equal(runHealthDateInTimezone('UTC', '2026-06-28T16:00:00.000Z'), '2026-06-28')
})

test('latest health snapshot combines newest available values per metric', () => {
  const snapshot = buildLatestHealthSnapshot([
    {
      recordedAt: '2026-07-03',
      weight: 62,
      bodyFat: null,
      measurements: { waist: 65 }
    },
    {
      recordedAt: '2026-07-02',
      height: 170,
      weight: 60,
      bodyFat: 22.26,
      measurements: { waist: 66, hip: 90 }
    }
  ])

  assert.equal(snapshot.height, 170)
  assert.equal(snapshot.weight, 62)
  assert.equal(snapshot.bodyFat, 22.3)
  assert.equal(snapshot.measurements.waist, 65)
  assert.equal(snapshot.measurements.hip, 90)
  assert.equal(calculateHealthBmi(snapshot), '21.5')
})

test('health archive month options and filters use normalized local dates', () => {
  const records = [
    { recordedAt: '2026-06-28T16:00:00.000Z', weight: 60 },
    { recordedAt: '2026-07-02', weight: 61 },
    { recordedAt: 'bad-date', weight: 62 }
  ]

  assert.deepEqual(buildHealthMonthOptions(records), [
    { value: '2026-07', label: '2026年7月' },
    { value: '2026-06', label: '2026年6月' }
  ])
  assert.deepEqual(
    filterHealthRecordsByMonth(records, '2026-07').map(record => record.recordedAt),
    ['2026-07-02']
  )
})

test('health profile board explains empty archives with actionable missing fields', () => {
  const board = buildHealthProfileBoard([], { today: '2026-07-13', gender: 'female' })

  assert.equal(board.mode, 'empty')
  assert.equal(board.statusLabel, '待建立')
  assert.equal(board.freshness.label, '尚未记录')
  assert.equal(board.completion.label, '0/11 项')
  assert.equal(board.metrics.find(metric => metric.key === 'bmi').detail, '需身高体重')
  assert.deepEqual(
    board.missingFields.slice(0, 4).map(field => field.label),
    ['身高', '体重', '体脂', '上胸围']
  )
})

test('health profile board marks partial but fresh archives and preserves latest per metric', () => {
  const board = buildHealthProfileBoard([
    {
      recordedAt: '2026-07-12',
      weight: 55.4,
      measurements: { waist: 64.2 }
    },
    {
      recordedAt: '2026-06-20',
      height: 168
    }
  ], { today: '2026-07-13', gender: 'female', actorLabel: '她' })

  assert.equal(board.mode, 'partial')
  assert.equal(board.freshness.label, '昨天更新')
  assert.equal(board.completion.filled, 3)
  assert.equal(board.completion.total, 11)
  assert.equal(board.bmi.value, '19.6')
  assert.equal(board.metrics.find(metric => metric.key === 'completion').detail, '3/11 项可用')
  assert.deepEqual(
    board.missingFields.slice(0, 3).map(field => field.key),
    ['bodyFat', 'chestUpper', 'chestLower']
  )
})

test('health profile board flags stale archives before completion status', () => {
  const board = buildHealthProfileBoard([
    {
      recordedAt: '2026-05-01',
      height: 182,
      weight: 72,
      bodyFat: 18,
      measurements: {
        chest: 96,
        waist: 78,
        hip: 94,
        arm: 32,
        thigh: 56,
        calf: 37,
        shoulder: 46
      }
    }
  ], { today: '2026-07-13', gender: 'male' })

  assert.equal(board.mode, 'stale')
  assert.equal(board.statusLabel, '需要更新')
  assert.equal(board.freshness.daysSince, 73)
  assert.equal(board.completion.label, '10/10 项')
  assert.equal(board.bmi.label, '21.7 · 标准')
})

test('health profile board treats fresh complete archives as ready', () => {
  const board = buildHealthProfileBoard([
    {
      recordedAt: '2026-07-13',
      height: 182,
      weight: 72,
      bodyFat: 18,
      measurements: {
        chest: 96,
        waist: 78,
        hip: 94,
        arm: 32,
        thigh: 56,
        calf: 37,
        shoulder: 46
      }
    }
  ], { today: '2026-07-13', gender: 'male' })

  assert.equal(board.mode, 'ready')
  assert.equal(board.statusLabel, '可参考')
  assert.equal(board.freshness.label, '今天更新')
  assert.equal(board.completion.percent, 100)
  assert.deepEqual(board.missingFields, [])
})

test('health payload sanitizer validates dates, ranges and rounds metric values', () => {
  const { payload, error } = sanitizeHealthPayload({
    recordedAt: '2026-06-29',
    height: '170.24',
    weight: '',
    bodyFat: '22.26',
    measurements: { waist: '64.24', hip: 'bad' },
    note: '  训练后  '
  })

  assert.equal(error, '臀围格式不正确')
  assert.equal(payload, undefined)

  const valid = sanitizeHealthPayload({
    recordedAt: '2026-06-29',
    height: '170.24',
    weight: '',
    bodyFat: '22.26',
    measurements: { waist: '64.24' },
    note: '  训练后  '
  })

  assert.equal(valid.error, undefined)
  assert.equal(valid.payload.height, 170.2)
  assert.equal(valid.payload.weight, null)
  assert.equal(valid.payload.bodyFat, 22.3)
  assert.equal(valid.payload.measurements.waist, 64.2)
  assert.equal(valid.payload.note, '训练后')
})
