import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAchievementBook,
  buildAchievementDisplayItem
} from '../src/utils/achievement-display.js'

test('achievement display item replaces raw icon display with stable badge metadata', () => {
  const item = buildAchievementDisplayItem({
    id: 'both_week',
    title: '一周同框',
    description: '和 TA 连续 7 天共同完成',
    category: 'couple',
    rarity: 'rare',
    progress: 3,
    maxProgress: 7
  })

  assert.equal(item.badge, '一周')
  assert.equal(item.categoryLabel, '双人默契')
  assert.equal(item.rarityLabel, '进阶')
  assert.equal(item.rarityBadge, 'II')
  assert.equal(item.progressText, '3/7')
  assert.equal(item.progressPercent, 43)
  assert.equal(item.unlocked, false)
})

test('achievement display item formats unlocked records as collected entries', () => {
  const item = buildAchievementDisplayItem({
    title: '初见成效',
    rarity: 'common',
    unlockedAt: '2026-07-13T02:20:00.000Z',
    progress: 1,
    maxProgress: 1
  })

  assert.equal(item.unlocked, true)
  assert.equal(item.progressPercent, 100)
  assert.match(item.unlockedLabel, /^收录于 2026\.7\.13$/)
})

test('achievement book summarizes completion and next locked milestone', () => {
  const book = buildAchievementBook([
    { id: 'first', title: '初见成效', unlockedAt: '2026-07-13', maxProgress: 1 },
    { id: 'streak', title: '一周战士', progress: 4, maxProgress: 7 },
    { id: 'legend', title: '年复一年', progress: 0, maxProgress: 365 }
  ], 40)

  assert.equal(book.total, 3)
  assert.equal(book.unlocked, 1)
  assert.equal(book.completionPercent, 33)
  assert.equal(book.pointsLabel, '40 积分')
  assert.equal(book.items[0].unlockedLabel, '收录于 2026.7.13')
  assert.equal(book.nextItem.title, '一周战士')
})
