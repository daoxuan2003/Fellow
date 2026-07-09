import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildTrendPath,
  buildTrendPoints,
  getTrendChartRange,
  getTrendXAxisTicks,
  hasTrendData,
  normalizeTrendData
} from '../src/utils/health-trends.js'

test('health trend data treats mine and partner series as chart content', () => {
  const data = {
    mine: [{ date: '2026-07-01', value: 52.3 }],
    partner: []
  }

  assert.equal(hasTrendData(data), true)
  assert.equal(hasTrendData({ mine: [], partner: [] }), false)
})

test('health trend data filters invalid numeric values before charting', () => {
  const normalized = normalizeTrendData({
    mine: [
      { date: '2026-07-01', value: '52.3' },
      { date: '2026-07-02', value: '' },
      { date: '2026-07-03', value: 'bad' }
    ],
    partner: [{ date: '2026-07-01', value: null }]
  })

  assert.deepEqual(normalized.mine, [{ date: '2026-07-01', value: 52.3 }])
  assert.deepEqual(normalized.partner, [])
})

test('health trend x axis follows the active partner series when available', () => {
  const data = {
    mine: [
      { date: '2026-07-01', value: 52 },
      { date: '2026-07-02', value: 52.4 }
    ],
    partner: [
      { date: '2026-07-04', value: 63 },
      { date: '2026-07-05', value: 63.2 },
      { date: '2026-07-06', value: 63.4 }
    ]
  }

  assert.deepEqual(getTrendXAxisTicks(data, 'partner'), ['2026-07-04', '2026-07-05', '2026-07-06'])
  assert.deepEqual(getTrendXAxisTicks(data, 'mine'), ['2026-07-01', '2026-07-02'])
})

test('health trend path and points stay finite for flat single-value charts', () => {
  const data = { mine: [{ date: '2026-07-01', value: 50 }, { date: '2026-07-02', value: 50 }], partner: [] }
  const range = getTrendChartRange(data)
  const path = buildTrendPath(data.mine, range)
  const points = buildTrendPoints([{ date: '2026-07-01', value: 50 }], range)

  assert.match(path, /^M /)
  assert.equal(points.length, 1)
  assert.equal(points[0].style.left, '50%')
  assert.match(points[0].style.top, /%$/)
})
