import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildExpressArchive,
  buildExpressArchiveReview,
  buildExpressArchiveStory,
  buildExpressArchiveTimeline,
  buildExpressMonthGroups,
  filterPickedDeliveries,
  formatExpressArchiveDate,
  isDeliveryPickedToday,
  partitionExpressDeliveries
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

test('buildExpressArchiveStory turns archive history into review cards', () => {
  const story = buildExpressArchiveStory(deliveries, me, new Date('2026-06-23T12:00:00.000+08:00'))

  assert.deepEqual(story.map(item => item.id), ['span', 'route', 'support', 'peak'])
  assert.equal(story[0].value, '2个月')
  assert.equal(story[0].detail, '3个取件日，近30天2件')
  assert.equal(story[1].value, '菜鸟驿站')
  assert.equal(story[2].value, '1次')
  assert.equal(story[2].detail, '帮对方取件占比33%')
  assert.equal(story[3].value, '2026年6月')
})

test('buildExpressArchiveReview summarizes route rhythm and next archive action', () => {
  const review = buildExpressArchiveReview(deliveries, me, new Date('2026-06-23T12:00:00.000+08:00'))

  assert.equal(review.title, '菜鸟驿站是主要取件路线')
  assert.equal(review.subtitle, '3个取件日，2个月份，近30天2件。')
  assert.deepEqual(review.route, [
    { name: '菜鸟驿站', count: 2, rank: 1, share: 67 },
    { name: '宿舍楼下', count: 1, rank: 2, share: 33 }
  ])
  assert.deepEqual(review.rhythm.map(item => item.id), ['weekday', 'time', 'support'])
  assert.equal(review.rhythm.find(item => item.id === 'weekday').value, '周一')
  assert.equal(review.rhythm.find(item => item.id === 'time').value, '上午')
  assert.equal(review.rhythm.find(item => item.id === 'support').value, '33%')
  assert.equal(review.nextStep.title, '给紧急件保留清晰备注')
})

test('buildExpressArchiveTimeline creates newest picked delivery activity', () => {
  const timeline = buildExpressArchiveTimeline(deliveries, me, 2)

  assert.deepEqual(timeline.map(item => item.id), ['latest', 'urgent'])
  assert.equal(timeline[0].trackingNo, 'C-3')
  assert.equal(timeline[0].requesterRole, 'me')
  assert.equal(timeline[0].actor, '我完成取件')
  assert.equal(timeline[1].priority, 'urgent')
  assert.equal(timeline[1].actor, '我完成取件')
})

test('filterPickedDeliveries keeps archive order while filtering role and urgent deliveries', () => {
  assert.deepEqual(filterPickedDeliveries(deliveries, 'me', me).map(item => item.id), ['latest', 'old'])
  assert.deepEqual(filterPickedDeliveries(deliveries, 'partner', me).map(item => item.id), ['urgent'])
  assert.deepEqual(filterPickedDeliveries(deliveries, 'urgent', me).map(item => item.id), ['urgent'])
})

test('formatExpressArchiveDate handles valid and missing timestamps', () => {
  assert.equal(formatExpressArchiveDate('2026-06-22T09:05:00+08:00'), '6月22日 09:05')
  assert.equal(formatExpressArchiveDate('not-a-date'), '未标注时间')
})

test('isDeliveryPickedToday only keeps unarchived records from the same local day', () => {
  const now = new Date('2026-07-31T18:00:00+08:00')

  assert.equal(isDeliveryPickedToday({ status: 'picked', pickedAt: '2026-07-31T00:05:00+08:00' }, now), true)
  assert.equal(isDeliveryPickedToday({ status: 'picked', pickedAt: '2026-07-30T23:59:00+08:00' }, now), false)
  assert.equal(isDeliveryPickedToday({ status: 'picked', pickedAt: '2026-07-31T12:00:00+08:00', archivedAt: '2026-07-31T13:00:00+08:00' }, now), false)
  assert.equal(isDeliveryPickedToday({ status: 'picked', pickedAt: null }, now), false)
})

test('partitionExpressDeliveries keeps only today in picked and treats legacy old picks as archive', () => {
  const now = new Date('2026-07-31T18:00:00+08:00')
  const result = partitionExpressDeliveries([
    { id: 'pending', status: 'pending', createdAt: '2026-07-30T08:00:00+08:00' },
    { id: 'today', status: 'picked', pickedAt: '2026-07-31T09:00:00+08:00' },
    { id: 'old', status: 'picked', pickedAt: '2026-07-30T20:00:00+08:00' },
    { id: 'legacy', status: 'picked', pickedAt: null },
    { id: 'archived', status: 'picked', pickedAt: '2026-07-31T11:00:00+08:00', archivedAt: '2026-07-31T12:00:00+08:00' }
  ], now)

  assert.deepEqual(result.pending.map(item => item.id), ['pending'])
  assert.deepEqual(result.pickedToday.map(item => item.id), ['today'])
  assert.deepEqual(result.archived.map(item => item.id), ['archived', 'old', 'legacy'])
})
