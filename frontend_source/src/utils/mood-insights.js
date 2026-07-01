const MOOD_ORDER = ['happy', 'excited', 'calm', 'loved', 'tired', 'sad', 'angry', 'sick']
const CARE_MOODS = new Set(['tired', 'sad', 'angry', 'sick'])
const BRIGHT_MOODS = new Set(['happy', 'excited', 'loved'])

function normalizeId(value) {
  return value === undefined || value === null ? '' : String(value)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function parseDateOnly(value) {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate())
  }
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateOnly(value) {
  const date = parseDateOnly(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(value, delta) {
  const date = parseDateOnly(value)
  if (!date) return null
  date.setDate(date.getDate() + delta)
  return date
}

function compareCreatedAtDesc(a, b) {
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
}

function groupDailyRecords(dailyMoods = [], moodRecords = []) {
  const byDate = new Map()

  dailyMoods.forEach(day => {
    if (!day?.date) return
    const date = formatDateOnly(day.date)
    if (!date) return
    if (!byDate.has(date)) byDate.set(date, [])
    byDate.get(date).push(...(Array.isArray(day.records) ? day.records : []))
  })

  if (byDate.size === 0) {
    moodRecords.forEach(record => {
      const date = formatDateOnly(record.recordDate)
      if (!date) return
      if (!byDate.has(date)) byDate.set(date, [])
      byDate.get(date).push(record)
    })
  }

  byDate.forEach((records, date) => {
    const latestByUser = new Map()
    records
      .filter(record => record?.user?.id || record?.userId)
      .sort(compareCreatedAtDesc)
      .forEach(record => {
        const userId = normalizeId(record.user?.id || record.userId)
        if (!latestByUser.has(userId)) latestByUser.set(userId, record)
      })
    byDate.set(date, [...latestByUser.values()])
  })

  return byDate
}

function getRecordForUser(records = [], userId) {
  const targetId = normalizeId(userId)
  return records.find(record => normalizeId(record?.user?.id || record?.userId) === targetId) || null
}

function countCurrentStreak(recordedDates, today) {
  let cursor = parseDateOnly(today)
  let streak = 0

  while (cursor && recordedDates.has(formatDateOnly(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }

  return streak
}

function getDominantMood(stats = {}, fallbackRecords = []) {
  const entries = Object.entries(stats || {}).filter(([, count]) => Number(count) > 0)
  if (entries.length > 0) {
    const [mood, count] = entries.sort((a, b) => {
      const diff = Number(b[1]) - Number(a[1])
      return diff || MOOD_ORDER.indexOf(a[0]) - MOOD_ORDER.indexOf(b[0])
    })[0]
    return { mood, count: Number(count) }
  }

  const fallback = fallbackRecords.reduce((acc, record) => {
    if (record?.mood) acc[record.mood] = (acc[record.mood] || 0) + 1
    return acc
  }, {})

  const [mood, count] = Object.entries(fallback).sort((a, b) => Number(b[1]) - Number(a[1]))[0] || []
  return mood ? { mood, count: Number(count) } : null
}

export function getLatestMoodForUser(records = [], date, userId) {
  const dateKey = formatDateOnly(date)
  const targetId = normalizeId(userId)
  return [...records]
    .filter(record => formatDateOnly(record.recordDate) === dateKey)
    .filter(record => normalizeId(record?.user?.id || record?.userId) === targetId)
    .sort(compareCreatedAtDesc)[0] || null
}

export function buildMoodPromptOptions(partnerMood) {
  if (CARE_MOODS.has(partnerMood)) {
    return ['我在，今晚慢一点。', '想听你说说哪里最累。', '先抱一下，别硬撑。']
  }

  if (BRIGHT_MOODS.has(partnerMood)) {
    return ['想听你讲今天最亮的一幕。', '把这份开心也分我一点。', '今晚一起庆祝一下。']
  }

  if (partnerMood === 'calm') {
    return ['今天适合安静靠近。', '我也想把节奏放慢。', '晚点一起散散步。']
  }

  return ['今天最占据我的情绪是...', '有件小事想让你知道。', '希望今晚我们都轻一点。']
}

export function buildMoodNudge({ todayMine, todayPartner, partnerName = 'TA' } = {}) {
  if (todayMine && todayPartner) {
    return {
      tone: 'synced',
      title: '今天已经同频',
      body: '双方都留下了情绪信号，晚点可以顺着这条线聊下去。',
      actionLabel: '补一句今天的尾声'
    }
  }

  if (!todayMine && todayPartner) {
    return {
      tone: CARE_MOODS.has(todayPartner.mood) ? 'care' : 'reply',
      title: `${partnerName} 已经留下心情`,
      body: CARE_MOODS.has(todayPartner.mood)
        ? '先记录你的状态，再给对方一个稳定回应。'
        : '把你的今天也放进来，情绪连接才会完整。',
      actionLabel: '回应今天'
    }
  }

  if (todayMine && !todayPartner) {
    return {
      tone: 'waiting',
      title: '你已发出今日信号',
      body: '等对方补上心情后，今天的情绪拼图就完整了。',
      actionLabel: '再补一条细节'
    }
  }

  return {
    tone: 'start',
    title: '先给今天一个情绪坐标',
    body: '不用写长，把此刻的状态留下来就足够形成连续感。',
    actionLabel: '记录此刻'
  }
}

export function buildMoodConnectionSummary({
  dailyMoods = [],
  moodRecords = [],
  statsData = null,
  currentUserId = '',
  partnerId = '',
  today = new Date(),
  partnerName = 'TA'
} = {}) {
  const todayKey = formatDateOnly(today)
  const mineId = normalizeId(currentUserId)
  const otherId = normalizeId(partnerId)
  const byDate = groupDailyRecords(dailyMoods, moodRecords)
  const todayRecords = byDate.get(todayKey) || []
  const todayMine = getRecordForUser(todayRecords, mineId) || getLatestMoodForUser(moodRecords, todayKey, mineId)
  const todayPartner = getRecordForUser(todayRecords, otherId) || getLatestMoodForUser(moodRecords, todayKey, otherId)

  const myRecordedDates = new Set()
  const partnerRecordedDates = new Set()
  let pairedDays = 0

  byDate.forEach((records, date) => {
    const hasMine = !!getRecordForUser(records, mineId)
    const hasPartner = !!getRecordForUser(records, otherId)
    if (hasMine) myRecordedDates.add(date)
    if (hasPartner) partnerRecordedDates.add(date)
    if (hasMine && hasPartner) pairedDays += 1
  })

  const fallbackMineRecords = moodRecords.filter(record => normalizeId(record?.user?.id || record?.userId) === mineId)
  const dominantMood = getDominantMood(statsData?.myStats, fallbackMineRecords)
  const nudge = buildMoodNudge({ todayMine, todayPartner, partnerName })

  return {
    todayMine,
    todayPartner,
    currentStreak: countCurrentStreak(myRecordedDates, todayKey),
    myRecordedDays: myRecordedDates.size,
    partnerRecordedDays: partnerRecordedDates.size,
    pairedDays,
    dominantMood,
    nudge,
    promptOptions: buildMoodPromptOptions(todayPartner?.mood),
    completionRate: myRecordedDates.size ? Math.round(pairedDays / myRecordedDates.size * 100) : 0
  }
}
