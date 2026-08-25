import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')

test('v8 feature routes use the supplied site detail masthead and keep real page implementations', async () => {
  const cases = [
    ['Album.vue', '我们的相册', 'MEMORY ARCHIVE', '02', 'album'],
    ['Mood.vue', '心情日记', 'MOOD DIARY', '01', 'mood'],
    ['Postgraduate.vue', '考研计划', 'STUDY COMPANION', '03', 'study'],
    ['Plans.vue', '计划清单', 'SHARED PLANS', '04', 'plan'],
    ['Health.vue', '健康档案', 'HEALTH RECORDS', '05', 'health'],
    ['Express.vue', '快递代取', 'PICKUP LIST', '06', 'parcel'],
    ['Cosmetics.vue', '保质期管理', 'VANITY SHELF', '07', 'cosmetics'],
    ['Budget.vue', '钱包', 'SHARED WALLET', '08', 'ledger'],
    ['Wish.vue', '心愿墙', 'OUR WISHES', '09', 'wishes']
  ]

  for (const [file, title, eyebrow, chapter, kind] of cases) {
    const source = await readFile(join(sourceDir, 'views', file), 'utf8')
    assert.match(source, new RegExp(`<FeatureHeader title="${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" eyebrow="${eyebrow}" chapter="${chapter}" kind="${kind}"`), `${file} must use its target detail header`)
    assert.doesNotMatch(source, /<BottomNav/, `${file} must not mix the target detail surface with the main tab bar`)
  }
})

test('v8 reference theme is loaded after legacy tokens and preserves the global main navigation', async () => {
  const [main, theme, app, profile, header] = await Promise.all([
    readFile(join(sourceDir, 'main.js'), 'utf8'),
    readFile(join(sourceDir, 'styles', 'reference-ui-v8.css'), 'utf8'),
    readFile(join(sourceDir, 'App.vue'), 'utf8'),
    readFile(join(sourceDir, 'views', 'Profile.vue'), 'utf8'),
    readFile(join(sourceDir, 'components', 'FeatureHeader.vue'), 'utf8')
  ])

  assert.ok(main.indexOf("./styles/reference-ui-v8.css") > main.indexOf("./styles/fellow-semantic-tokens.css"))
  assert.match(theme, /--gf-blue:\s*#69cfee/)
  assert.match(theme, /\.album-page[\s\S]*--chapter-accent:\s*#4fa981/)
  assert.match(theme, /\.wish-page[\s\S]*--chapter-accent:\s*#b36bc2/)
  assert.match(app, /<BottomNav v-if="showBottomNav"/)
  assert.doesNotMatch(profile, /<BottomNav/)
  assert.match(header, /router\.push\('\/home'\)/)
})
