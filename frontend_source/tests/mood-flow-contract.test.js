import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')

test('mood redesign keeps the reference detail navigation contract', async () => {
  const [dashboard, picker, composer, timeline, commentThread, catalog] = await Promise.all([
    readFile(join(sourceDir, 'views', 'Mood.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodPicker.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodComposer.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodTimeline.vue'), 'utf8'),
    readFile(join(sourceDir, 'components', 'MoodCommentThread.vue'), 'utf8'),
    readFile(join(sourceDir, 'utils', 'mood-catalog.js'), 'utf8')
  ])

  assert.match(dashboard, /<FeatureHeader title="心情日记" eyebrow="MOOD DIARY" chapter="01" kind="mood"\s*\/>/)
  assert.doesNotMatch(dashboard, /BottomNav/, 'feature detail pages return through the reference header instead of the main tab bar')
  for (const [name, source] of [['picker', picker], ['composer', composer], ['timeline', timeline]]) {
    assert.doesNotMatch(source, /BottomNav/, `${name} must stay a full-screen flow without bottom navigation`)
  }
  assert.match(picker, /v-for="item in MOOD_CATALOG"/)
  assert.match(composer, /maxlength="300"/)
  assert.doesNotMatch(timeline, /const tab = ref|mood-timeline__tabs|我说的|说的<\/button>/)
  assert.match(dashboard, /<MoodCommentThread/)
  assert.match(timeline, /<MoodCommentThread/)
  assert.ok(commentThread.includes('mood/${props.record.id}/comments'))
  assert.match(commentThread, /method: 'POST'/)
  assert.equal((catalog.match(/id: '/g) || []).length, 12, 'the mood picker needs the twelve designed characters')
  for (const [name, source] of [['dashboard', dashboard], ['composer', composer], ['timeline', timeline]]) {
    assert.doesNotMatch(source, /TA/, `${name} must derive the partner label from their gender instead of rendering TA`)
  }
  assert.doesNotMatch(dashboard, /查看这个月的心情痕迹/)
  assert.doesNotMatch(dashboard, /只属于我们的心情/)
  assert.doesNotMatch(dashboard, /\|\| \{ mood: 'calm' \}/, 'a missing record must not render a fake calm mood')
  assert.match(dashboard, /entry\.note/, 'today changes must show the recorded note when one exists')
})
