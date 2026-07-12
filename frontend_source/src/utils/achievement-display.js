const RARITY_META = {
  common: { label: '日常', shortLabel: '日常', badge: 'I' },
  rare: { label: '进阶', shortLabel: '进阶', badge: 'II' },
  epic: { label: '深层', shortLabel: '深层', badge: 'III' },
  legendary: { label: '长久', shortLabel: '长久', badge: 'IV' }
}

const CATEGORY_META = {
  milestone: '个人节奏',
  couple: '双人默契',
  explorer: '计划探索',
  special: '特别时刻'
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function formatLocalDateLabel(value) {
  if (!value) return ''
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (dateOnly) {
    return `${Number(dateOnly[1])}.${Number(dateOnly[2])}.${Number(dateOnly[3])}`
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`
}

function getTitleBadge(title = '', fallback = '') {
  const cleanTitle = String(title || '').trim()
  if (cleanTitle) return cleanTitle.slice(0, 2)
  return String(fallback || '').slice(0, 2).toUpperCase() || '徽章'
}

export function buildAchievementDisplayItem(achievement = {}) {
  const rarityKey = achievement.rarity || 'common'
  const rarity = RARITY_META[rarityKey] || RARITY_META.common
  const maxProgress = Math.max(1, Number(achievement.maxProgress) || 1)
  const progress = Math.max(0, Math.min(maxProgress, Number(achievement.progress) || 0))
  const unlocked = Boolean(achievement.unlockedAt)
  const progressPercent = unlocked ? 100 : clampPercent((progress / maxProgress) * 100)
  const unlockedDate = formatLocalDateLabel(achievement.unlockedAt)

  return {
    id: achievement.id || achievement.achievementId || achievement.title || '',
    title: achievement.title || '未命名成就',
    description: achievement.description || '',
    category: achievement.category || 'milestone',
    categoryLabel: CATEGORY_META[achievement.category] || '计划记录',
    rarity: rarityKey,
    rarityLabel: rarity.label,
    rarityShortLabel: rarity.shortLabel,
    rarityBadge: rarity.badge,
    badge: getTitleBadge(achievement.title, achievement.id || achievement.achievementId),
    unlocked,
    unlockedDate,
    unlockedLabel: unlockedDate ? `收录于 ${unlockedDate}` : '已收录',
    progress,
    maxProgress,
    progressPercent,
    progressText: `${progress}/${maxProgress}`
  }
}

export function buildAchievementBook(achievements = [], points = 0) {
  const source = Array.isArray(achievements) ? achievements : []
  const items = source.map(buildAchievementDisplayItem)
  const total = items.length
  const unlocked = items.filter(item => item.unlocked).length
  const completionPercent = total > 0 ? clampPercent((unlocked / total) * 100) : 0
  const nextItem = items.find(item => !item.unlocked && item.maxProgress > 1) ||
    items.find(item => !item.unlocked) ||
    null

  return {
    items,
    total,
    unlocked,
    points: Number(points) || 0,
    completionPercent,
    headline: total > 0 ? '把认真坚持过的日子收进册子里' : '完成一次计划后会生成第一枚徽章',
    pointsLabel: `${Number(points) || 0} 积分`,
    nextItem
  }
}
