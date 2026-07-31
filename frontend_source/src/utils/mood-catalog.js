export const MOOD_CATALOG = Object.freeze([
  { id: 'happy', label: '开心', color: '#ffd94a' },
  { id: 'calm', label: '平静', color: '#69cfee' },
  { id: 'missing', label: '想你', color: '#f77ea4' },
  { id: 'expectant', label: '期待', color: '#caa4f7' },
  { id: 'shy', label: '害羞', color: '#ffb184' },
  { id: 'bored', label: '无聊', color: '#a9dfc7' },
  { id: 'tired', label: '疲惫', color: '#cbd5e1' },
  { id: 'wronged', label: '委屈', color: '#caa4f7' },
  { id: 'sad', label: '难过', color: '#8dbcf4' },
  { id: 'anxious', label: '焦虑', color: '#a9dfc7' },
  { id: 'angry', label: '生气', color: '#ff8c82' },
  { id: 'overwhelmed', label: '崩溃', color: '#f3a0c2' }
])

const moodById = Object.freeze(Object.fromEntries(MOOD_CATALOG.map(item => [item.id, item])))

// Preserve existing records after the expanded mood vocabulary is released.
const legacyMoodAliases = Object.freeze({
  excited: 'expectant',
  sick: 'tired',
  loved: 'missing'
})

export function getMoodDefinition(mood) {
  return moodById[mood] || moodById[legacyMoodAliases[mood]] || moodById.calm
}

export function getMoodLabel(mood) {
  return getMoodDefinition(mood).label
}

export function getMoodColor(mood) {
  return getMoodDefinition(mood).color
}
