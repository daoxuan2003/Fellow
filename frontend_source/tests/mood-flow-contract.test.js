import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')

test('mood redesign keeps the five-screen navigation contract', async () => {
  const [dashboard, picker, composer, timeline, catalog] = await Promise.all([
    readFile(join(sourceDir, 'views', 'Mood.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodPicker.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodComposer.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'MoodTimeline.vue'), 'utf8'),
    readFile(join(sourceDir, 'utils', 'mood-catalog.js'), 'utf8')
  ])

  assert.match(dashboard, /<BottomNav active-key="together"\s*\/>/)
  for (const [name, source] of [['picker', picker], ['composer', composer], ['timeline', timeline]]) {
    assert.doesNotMatch(source, /BottomNav/, `${name} must stay a full-screen flow without bottom navigation`)
  }
  assert.match(picker, /v-for="item in MOOD_CATALOG"/)
  assert.match(composer, /maxlength="300"/)
  assert.match(timeline, /const tab = ref\('all'\)/)
  assert.equal((catalog.match(/id: '/g) || []).length, 12, 'the mood picker needs the twelve designed characters')
})
