import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildTrendPath,
  buildTrendPoints,
  buildTrendChartState,
  buildTrendSummary,
  formatTrendValue,
  getTrendChartRange,
  getTrendDateDomain,
  getTrendXAxisTickItems,
  getTrendXAxisTicks,
  hasTrendData,
  normalizeTrendData,
  shouldRenderTrendLine
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

test('health trend data keeps one daily value when records share a date', () => {
  const normalized = normalizeTrendData({
    mine: [
      { date: '2026-07-01T02:00:00.000Z', value: 52.1 },
      { date: '2026-07-01T12:00:00.000Z', value: 52.4 },
      { date: '2026-07-02', value: 52.6 }
    ],
    partner: []
  })

  assert.deepEqual(normalized.mine, [
    { date: '2026-07-01', value: 52.4 },
    { date: '2026-07-02', value: 52.6 }
  ])
})

test('health trend x axis uses a shared date domain for compared series', () => {
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

  assert.deepEqual(getTrendXAxisTicks(data, 'partner'), [
    '2026-07-01',
    '2026-07-02',
    '2026-07-04',
    '2026-07-05',
    '2026-07-06'
  ])
  assert.deepEqual(getTrendXAxisTicks(data, 'mine'), [
    '2026-07-01',
    '2026-07-02',
    '2026-07-04',
    '2026-07-05',
    '2026-07-06'
  ])
})

test('health trend points align to real dates instead of per-series indexes', () => {
  const data = {
    mine: [
      { date: '2026-07-01', value: 52 },
      { date: '2026-07-04', value: 53 }
    ],
    partner: [
      { date: '2026-07-02', value: 60 }
    ]
  }
  const range = getTrendChartRange(data)
  const domain = getTrendDateDomain(data)
  const minePoints = buildTrendPoints(data.mine, range, domain)
  const partnerPoints = buildTrendPoints(data.partner, range, domain)

  assert.equal(minePoints[0].style.left, '5%')
  assert.equal(minePoints[0].tooltipAlign, 'right')
  assert.equal(minePoints[1].style.left, '95%')
  assert.equal(minePoints[1].tooltipAlign, 'left')
  assert.equal(partnerPoints[0].style.left, '35%')
  assert.equal(partnerPoints[0].tooltipAlign, 'center')
})

test('health trend x axis tick items align labels to the same real date scale as points', () => {
  const data = {
    mine: [
      { date: '2026-07-01', value: 52 },
      { date: '2026-07-02', value: 52.2 },
      { date: '2026-07-31', value: 53 }
    ],
    partner: []
  }
  const ticks = getTrendXAxisTickItems(data, 'mine')

  assert.deepEqual(ticks.map(tick => tick.displayLabel), ['7/1', '7/2', '7/31'])
  assert.deepEqual(ticks.map(tick => tick.style.left), ['5%', '8%', '95%'])
  assert.deepEqual(ticks.map(tick => tick.align), ['right', 'right', 'left'])
})

test('health trend summary explains latest value change and comparison', () => {
  const summary = buildTrendSummary({
    mine: [
      { date: '2026-07-01', value: 52.1 },
      { date: '2026-07-10', value: 53.35 }
    ],
    partner: [
      { date: '2026-07-08', value: 61.8 }
    ]
  }, 'mine', {
    metricLabel: '体重',
    unit: 'kg',
    partnerLabel: '伴侣'
  })

  assert.equal(summary.actorLabel, '我')
  assert.equal(summary.metricLabel, '体重')
  assert.equal(summary.latestText, '53.4kg')
  assert.equal(summary.latestDateLabel, '7/10')
  assert.equal(summary.changeText, '较首日 +1.25kg')
  assert.equal(summary.sampleText, '2 个记录点')
  assert.equal(summary.comparisonText, '伴侣最近 61.8kg')
  assert.equal(summary.direction, 'up')
  assert.match(summary.ariaLabel, /我体重最近值 53.4kg/)
})

test('health trend summary falls back to available partner series', () => {
  const summary = buildTrendSummary({
    mine: [],
    partner: [{ date: '2026-07-08', value: 22 }]
  }, 'mine', {
    metricLabel: '体脂',
    unit: '%',
    partnerLabel: 'TA'
  })

  assert.equal(summary.actorKey, 'partner')
  assert.equal(summary.actorLabel, 'TA')
  assert.equal(summary.latestText, '22%')
  assert.equal(summary.changeText, '只有 1 次记录')
  assert.equal(summary.direction, 'flat')
})

test('formatTrendValue keeps compact units for chart labels', () => {
  assert.equal(formatTrendValue(120.4, 'cm'), '120cm')
  assert.equal(formatTrendValue(52.34, 'kg'), '52.3kg')
  assert.equal(formatTrendValue(1.256, 'kg'), '1.26kg')
  assert.equal(formatTrendValue('bad', 'kg'), '-')
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

test('health trend chart state avoids trend line before enough samples', () => {
  const single = buildTrendChartState({
    mine: [{ date: '2026-07-01', value: 50 }],
    partner: [{ date: '2026-07-02', value: 62 }]
  }, 'mine', {
    metricLabel: '体重',
    unit: 'kg',
    partnerLabel: '伴侣'
  })

  assert.equal(single.mode, 'single')
  assert.equal(single.statusLabel, '只有 1 次记录')
  assert.equal(single.showActiveLine, false)
  assert.equal(single.coverageLabel, '1 个记录点 · 覆盖 1 天')
  assert.deepEqual(single.latestRows.map(row => row.actorLabel), ['我', '伴侣'])
  assert.deepEqual(single.latestRows.map(row => row.valueText), ['50kg', '62kg'])

  const sparse = buildTrendChartState({
    mine: [
      { date: '2026-07-01', value: 50 },
      { date: '2026-07-03', value: 51 },
      { date: '2026-07-04', value: 50.8 }
    ],
    partner: []
  }, 'mine')

  assert.equal(sparse.mode, 'sparse')
  assert.equal(sparse.showActiveLine, false)
  assert.match(sparse.guidance, /满 4 次后/)
})

test('health trend chart state marks trend line ready from four samples', () => {
  const series = [
    { date: '2026-07-01', value: 50 },
    { date: '2026-07-02', value: 51 },
    { date: '2026-07-03', value: 50.8 },
    { date: '2026-07-06', value: 52 }
  ]
  const state = buildTrendChartState({ mine: series, partner: [] }, 'mine')

  assert.equal(state.mode, 'trend')
  assert.equal(state.statusLabel, '趋势可信')
  assert.equal(state.showActiveLine, true)
  assert.equal(state.coverageLabel, '4 个记录点 · 覆盖 6 天')
  assert.equal(shouldRenderTrendLine(series), true)
  assert.equal(shouldRenderTrendLine(series.slice(0, 3)), false)
})

test('health trend chart state promotes partner series when selected user has no data', () => {
  const state = buildTrendChartState({
    mine: [],
    partner: [
      { date: '2026-07-01', value: 61 },
      { date: '2026-07-02', value: 61.2 },
      { date: '2026-07-03', value: 61.3 },
      { date: '2026-07-04', value: 61.5 }
    ]
  }, 'mine', {
    partnerLabel: '伴侣'
  })

  assert.equal(state.activeKey, 'partner')
  assert.equal(state.actorLabel, '伴侣')
  assert.equal(state.mode, 'trend')
  assert.equal(state.showActiveLine, true)
  assert.equal(state.latestRows[0].key, 'partner')
})
