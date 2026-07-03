import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildExpressArchive,
  buildExpressMonthGroups,
  filterPickedDeliveries,
  formatExpressArchiveDate
} from '../src/utils/express-archive.js'

const me = 'user-a'
const partner = 'user-b'

const deliveries = [
  {
    id: 'old',
    trackingNo: 'A-1',
    pickupLocation: '菜鸟驿站',
    requesterId: me,
    pickerId: partner,
    priority: 'normal',
    pickedAt: '2026-05-18T10:20:00.000+08:00'
  },
  {
    id: 'urgent',
    trackingNo: 'B-2',
    pickupLocation: '宿舍楼下',
    requesterId: partner,
    pickerId: me,
    priority: 'urgent',
    pickedAt: '2026-06-20T18:30:00.000+08:00'
  },
  {
    id: 'latest',
    trackingNo: 'C-3',
    pickupLocation: '菜鸟驿站',
    requesterId: me,
    pickerId: me,
    priority: 'normal',
    pickedAt: '2026-06-22T09:05:00.000+08:00'
  }
]

test('buildExpressArchive summarizes role, urgency and location archive metrics', () => {
  const archive = buildExpressArchive(deliveries, me, new Date('2026-06-23T12:00:00.000+08:00'))

  assert.equal(archive.total, 3)
  assert.equal(archive.mine, 2)
  assert.equal(archive.partner, 1)
  assert.equal(archive.urgent, 1)
  assert.equal(archive.helpedPartner, 1)
  assert.equal(archive.thisMonth, 2)
  assert.equal(archive.recent30Days, 2)
  assert.equal(archive.pickedDayCount, 3)
  assert.equal(archive.latest.id, 'latest')
  assert.deepEqual(archive.topLocations, [
    { name: '菜鸟驿站', count: 2 },
    { name: '宿舍楼下', count: 1 }
  ])
})

test('buildExpressMonthGroups creates newest-first monthly archive sections', () => {
  const groups = buildExpressMonthGroups(deliveries, me)

  assert.equal(groups.length, 2)
  assert.equal(groups[0].key, '2026-06')
  assert.equal(groups[0].label, '2026年6月')
  assert.equal(groups[0].count, 2)
  assert.equal(groups[0].mine, 1)
  assert.equal(groups[0].partner, 1)
  assert.equal(groups[0].urgent, 1)
  assert.deepEqual(groups[0].items.map(item => item.id), ['latest', 'urgent'])
})

test('filterPickedDeliveries keeps archive order while filtering role and urgent deliveries', () => {
  assert.deepEqual(filterPickedDeliveries(deliveries, 'me', me).map(item => item.id), ['latest', 'old'])
  assert.deepEqual(filterPickedDeliveries(deliveries, 'partner', me).map(item => item.id), ['urgent'])
  assert.deepEqual(filterPickedDeliveries(deliveries, 'urgent', me).map(item => item.id), ['urgent'])
})

test('formatExpressArchiveDate handles valid and missing timestamps', () => {
  assert.equal(formatExpressArchiveDate('2026-06-22T09:05:00'), '6月22日 09:05')
  assert.equal(formatExpressArchiveDate('not-a-date'), '未标注时间')
})
