import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')

const toastSurfaces = [
  ['App.vue', 'class="toast"'],
  ['views/Login.vue', 'class="toast"'],
  ['views/Home.vue', 'class="toast"'],
  ['views/Profile.vue', 'class="toast"'],
  ['views/Express.vue', 'class="toast"'],
  ['views/Album.vue', 'class="toast"'],
  ['views/Plans.vue', 'class="toast"'],
  ['views/Wish.vue', 'class="toast"'],
  ['views/Budget.vue', 'class="budget-toast"'],
  ['views/Cosmetics.vue', 'class="cosmetics-toast"'],
  ['views/Shopping.vue', 'class="toast"'],
  ['views/Health.vue', 'class="toast"'],
  ['views/Postgraduate.vue', 'class="pg-toast"'],
  ['components/FoodDiary.vue', 'class="feedback-toast"'],
  ['components/TravelPassport.vue', 'class="feedback-toast"']
]

function findOpeningTag(source, marker) {
  const markerIndex = source.indexOf(marker)
  assert.notEqual(markerIndex, -1, `missing ${marker}`)

  const tagStart = source.lastIndexOf('<div', markerIndex)
  const tagEnd = source.indexOf('>', markerIndex)
  assert.notEqual(tagStart, -1, `missing opening div for ${marker}`)
  assert.notEqual(tagEnd, -1, `missing closing bracket for ${marker}`)

  return source.slice(tagStart, tagEnd + 1)
}

test('toast feedback is announced to assistive technology', async () => {
  await Promise.all(toastSurfaces.map(async ([filePath, marker]) => {
    const source = await readFile(join(sourceDir, filePath), 'utf8')
    const openingTag = findOpeningTag(source, marker)

    assert.match(openingTag, /role="status"/, `${filePath} toast needs role=status`)
    assert.match(openingTag, /aria-live="polite"/, `${filePath} toast needs polite live region`)
    assert.match(openingTag, /aria-atomic="true"/, `${filePath} toast needs atomic announcements`)
  }))
})
