import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')
const read = relativePath => readFile(join(sourceDir, relativePath), 'utf8')

test('login keeps one current-brand form and remains mobile and keyboard safe', async () => {
  const login = await read('views/Login.vue')

  assert.equal((login.match(/<form class="login-form"/g) || []).length, 1)
  assert.doesNotMatch(login, /class="app"|class="card"|login-paper/)
  for (const token of ['--fellow-blue', '--fellow-mint', '--fellow-yellow', '--fellow-pink', '--fellow-ink']) {
    assert.match(login, new RegExp(token))
  }
  assert.match(login, /min-height:\s*100dvh/)
  assert.match(login, /overflow-y:\s*auto/)
  assert.match(login, /font-size:\s*16px/)
})

test('bottom navigation paints one full-width safe-area shell on initial and restored viewports', async () => {
  const [bottomNav, globalStyle] = await Promise.all([
    read('components/BottomNav.vue'),
    read('style.css')
  ])

  assert.match(bottomNav, /class="bottom-nav-shell"/)
  assert.match(bottomNav, /padding-bottom:\s*max\(0px, env\(safe-area-inset-bottom/)
  assert.match(bottomNav, /window\.addEventListener\('pageshow', refreshViewportDock\)/)
  assert.match(bottomNav, /window\.addEventListener\('resize', refreshViewportDock\)/)
  assert.match(bottomNav, /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/)
  assert.match(bottomNav, /window\.visualViewport\?\.addEventListener\('resize', refreshViewportDock\)/)
  assert.match(bottomNav, /window\.visualViewport\?\.addEventListener\('scroll', refreshViewportDock\)/)
  assert.match(bottomNav, /\[80, 240, 600\]/)
  assert.match(bottomNav, /--bottom-nav-viewport-offset/)
  assert.doesNotMatch(bottomNav, /contain:\s*layout paint/)
  assert.match(bottomNav, /translate3d\(0, 0, 0\)/)
  assert.match(globalStyle, /#app \{[\s\S]*?min-height:\s*100dvh;[\s\S]*?background:\s*var\(--fellow-paper/)
})

test('home footer no longer duplicates the mood record entry', async () => {
  const home = await read('views/Home.vue')
  const footerStart = home.indexOf('<footer class="pop-home-foot">')
  const footerEnd = home.indexOf('</footer>', footerStart)
  const footer = home.slice(footerStart, footerEnd)

  assert.notEqual(footerStart, -1)
  assert.doesNotMatch(footer, /<button|记录|navigateTo\('\/mood'\)/)
  assert.match(home, /class="pop-avatar-mood"/)
  assert.match(home, /class="pop-feature pop-feature-1"/)
})

test('all twelve moods map to unique, explicit character artwork', async () => {
  const [catalogSource, character] = await Promise.all([
    read('utils/mood-catalog.js'),
    read('components/MoodCharacter.vue')
  ])
  const catalogModule = await import(`${new URL('../src/utils/mood-catalog.js', import.meta.url).href}?test=${Date.now()}`)
  const arts = catalogModule.MOOD_CATALOG.map(item => item.art)

  assert.equal(catalogModule.MOOD_CATALOG.length, 12)
  assert.equal(new Set(arts).size, 12)
  assert.equal((catalogSource.match(/art: '/g) || []).length, 12)
  for (const mood of catalogModule.MOOD_CATALOG.map(item => item.id)) {
    assert.match(character, new RegExp(`mood === '${mood}'|v-else class="mood-character__features mood-art--spiral-burst"`))
  }
  for (const art of arts) assert.match(character, new RegExp(art))
  assert.doesNotMatch(character, /mood === 'sad' \|\| mood === 'wronged'/)
})

test('mood today and day history render shared per-record comment threads without identity filters', async () => {
  const [mood, timeline, commentThread] = await Promise.all([
    read('views/Mood.vue'),
    read('views/MoodTimeline.vue'),
    read('components/MoodCommentThread.vue')
  ])

  for (const source of [mood, timeline]) {
    assert.match(source, /class="mood-(?:dialog|timeline__dialog)"/)
    assert.match(source, /:class="\{ 'is-mine':/)
    assert.match(source, /<MoodCommentThread/)
    assert.match(source, /entry\.note|record\.note/)
  }
  assert.doesNotMatch(timeline, /mood-timeline__tabs|我说的|const tab = ref/)
  assert.match(commentThread, /record\.partnerResponse/)
  assert.match(commentThread, /record\.comments/)
  assert.ok(commentThread.includes('mood/${props.record.id}/comments'))
  assert.match(commentThread, /method: 'POST'/)
  assert.match(commentThread, /maxlength="120"/)
})
