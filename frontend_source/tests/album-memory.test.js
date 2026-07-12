import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAlbumMonthGroups,
  buildAlbumStats,
  buildAlbumStoryBoard,
  buildAlbumTags,
  buildMasonryColumns,
  filterAlbumPhotos,
  formatAlbumDate
} from '../src/utils/album-memory.js'

const photos = [
  {
    _id: 'p1',
    url: '/a.jpg',
    date: '2026-05-01',
    caption: '五月天台',
    tags: ['约会', '日落'],
    type: 'normal',
    aspectRatio: 0.75
  },
  {
    _id: 'p2',
    url: '/b.jpg',
    date: '2026-06-12',
    caption: '周末小旅行',
    tags: ['旅行', '约会'],
    type: 'travel',
    aspectRatio: 1.6
  },
  {
    _id: 'p3',
    url: '/c.jpg',
    date: '2026-06-20T00:00:00.000Z',
    caption: '新餐厅',
    tags: ['美食'],
    type: 'food',
    aspectRatio: 1
  }
]

test('buildAlbumMonthGroups creates newest-first monthly memory sections', () => {
  const groups = buildAlbumMonthGroups(photos)

  assert.equal(groups.length, 2)
  assert.equal(groups[0].key, '2026-06')
  assert.equal(groups[0].label, '2026年6月')
  assert.equal(groups[0].count, 2)
  assert.equal(groups[0].hero._id, 'p3')
  assert.deepEqual(groups[0].tags.map(tag => tag.name), ['美食', '旅行', '约会'])
})

test('buildAlbumStats summarizes archive size, top tag and latest distance', () => {
  const stats = buildAlbumStats(photos, new Date(2026, 5, 22))

  assert.equal(stats.total, 3)
  assert.equal(stats.dayCount, 3)
  assert.equal(stats.monthCount, 2)
  assert.equal(stats.latest._id, 'p3')
  assert.equal(stats.topTag.name, '约会')
  assert.equal(stats.topType, 'normal')
  assert.equal(stats.daysSinceLatest, 2)

  assert.equal(buildAlbumStats(photos, 'bad-now').daysSinceLatest, null)
})

test('buildAlbumStoryBoard turns photos into life lanes and a current chapter', () => {
  const board = buildAlbumStoryBoard(photos, new Date(2026, 5, 22))

  assert.equal(board.coverage, 3)
  assert.equal(board.headline, '2 个月份，3/3 条生活线已点亮')
  assert.equal(board.cover.photo._id, 'p3')
  assert.equal(board.cover.title, '新餐厅')
  assert.equal(board.cover.archiveSentence, '用 3 张照片，收住 2 个月、3 个日子。')
  assert.deepEqual(board.metrics.map(metric => metric.key), ['photos', 'months', 'days', 'theme'])
  assert.deepEqual(board.chapterStrip.map(chapter => chapter.key), ['2026-06', '2026-05'])
  assert.equal(board.chapter.key, '2026-06')
  assert.equal(board.chapter.count, 2)
  assert.equal(board.lanes.find(lane => lane.type === 'food').status, '6月20日 · 1 张')
  assert.equal(board.rhythm.tone, 'steady')
})

test('buildAlbumStoryBoard returns an upload-ready empty cover', () => {
  const board = buildAlbumStoryBoard([], new Date(2026, 5, 22))

  assert.equal(board.cover.photo, null)
  assert.equal(board.cover.title, '等待第一张照片')
  assert.equal(board.cover.tone, '第一张照片')
  assert.equal(board.nextPrompt.type, 'normal')
  assert.equal(board.chapterStrip.length, 0)
  assert.equal(board.metrics[0].value, '0')
})

test('buildAlbumStoryBoard prompts the missing lane and stale archive rhythm', () => {
  const board = buildAlbumStoryBoard(
    photos.filter(photo => photo.type !== 'travel'),
    new Date(2026, 6, 20)
  )

  assert.equal(board.coverage, 2)
  assert.equal(board.nextPrompt.type, 'travel')
  assert.equal(board.nextPrompt.cta, '记录旅行')
  assert.equal(board.rhythm.tone, 'quiet')
  assert.match(board.rhythm.copy, /30 天/)
})

test('filterAlbumPhotos keeps memory order while applying type, tag and month filters', () => {
  const result = filterAlbumPhotos(photos, {
    type: 'travel',
    tag: '约会',
    month: '2026-06'
  })

  assert.deepEqual(result.map(photo => photo._id), ['p2'])
})

test('buildAlbumTags normalizes duplicate and empty tags', () => {
  const result = buildAlbumTags([
    { tags: ['  夜市 ', '夜市', '', null] },
    { tags: ['约会'] }
  ])

  assert.deepEqual(result, [
    { name: '夜市', count: 1 },
    { name: '约会', count: 1 }
  ])
})

test('buildMasonryColumns distributes photos into stable columns', () => {
  const columns = buildMasonryColumns(photos, 2)

  assert.equal(columns.length, 2)
  assert.equal(columns.flat().length, 3)
  assert.deepEqual(columns.flat().map(photo => photo._id), ['p1', 'p2', 'p3'])
})

test('formatAlbumDate handles invalid and date-only values', () => {
  assert.equal(formatAlbumDate('2026-06-20'), '6月20日')
  assert.equal(formatAlbumDate('not-a-date'), '未标注日期')
})
