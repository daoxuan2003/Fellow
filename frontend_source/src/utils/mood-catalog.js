import happySprite from '../assets/moods/happy.png'
import calmSprite from '../assets/moods/calm.png'
import missingSprite from '../assets/moods/missing.png'
import expectantSprite from '../assets/moods/expectant.png'
import shySprite from '../assets/moods/shy.png'
import boredSprite from '../assets/moods/bored.png'
import tiredSprite from '../assets/moods/tired.png'
import wrongedSprite from '../assets/moods/wronged.png'
import sadSprite from '../assets/moods/sad.png'
import anxiousSprite from '../assets/moods/anxious.png'
import angrySprite from '../assets/moods/angry.png'
import overwhelmedSprite from '../assets/moods/overwhelmed.png'

export const MOOD_CATALOG = Object.freeze([
  { id: 'happy', label: '开心', color: '#f4ba45', src: happySprite },
  { id: 'calm', label: '平静', color: '#78aaff', src: calmSprite },
  { id: 'missing', label: '想你', color: '#f47c88', src: missingSprite },
  { id: 'expectant', label: '期待', color: '#a586d5', src: expectantSprite },
  { id: 'shy', label: '害羞', color: '#e59d7d', src: shySprite },
  { id: 'bored', label: '无聊', color: '#8baa92', src: boredSprite },
  { id: 'tired', label: '疲惫', color: '#8494aa', src: tiredSprite },
  { id: 'wronged', label: '委屈', color: '#9e82c7', src: wrongedSprite },
  { id: 'sad', label: '难过', color: '#6899df', src: sadSprite },
  { id: 'anxious', label: '焦虑', color: '#80a08e', src: anxiousSprite },
  { id: 'angry', label: '生气', color: '#ed716b', src: angrySprite },
  { id: 'overwhelmed', label: '崩溃', color: '#c67ca8', src: overwhelmedSprite }
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
