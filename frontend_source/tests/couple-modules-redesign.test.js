import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const sourceDir = join(testDir, '..', 'src')
const targetViews = ['Mood.vue', 'Album.vue', 'Postgraduate.vue', 'Plans.vue', 'Health.vue', 'Express.vue', 'Cosmetics.vue', 'Budget.vue', 'Wish.vue']

async function read(relativePath) {
  return readFile(join(sourceDir, relativePath), 'utf8')
}

test('nine redesigned modules share the approved home-brand visual primitives without Emoji artwork', async () => {
  const [tokens, header, theme, ...views] = await Promise.all([
    read('styles/fellow-semantic-tokens.css'),
    read('components/FeatureHeader.vue'),
    read('styles/reference-ui-v8.css'),
    ...targetViews.map(file => read(join('views', file)))
  ])

  for (const color of ['#20202a', '#58c8f5', '#75dfc1', '#ffd94a', '#ff7fa5', '#ff8b4a', '#fffaf5']) {
    assert.match(tokens, new RegExp(color), `missing approved token ${color}`)
  }
  assert.match(header, /border:\s*3px solid/)
  assert.match(header, /box-shadow:\s*3px 3px 0/)
  assert.match(theme, /Strict home-brand detail contract/)

  const pictographic = /\p{Extended_Pictographic}/u
  views.forEach((source, index) => {
    assert.doesNotMatch(source, pictographic, `${targetViews[index]} must not use Emoji as functional artwork`)
  })
})

test('mood combines paired records, calendar history and shared authenticated comments', async () => {
  const [source, timeline, commentThread] = await Promise.all([
    read('views/Mood.vue'),
    read('views/MoodTimeline.vue'),
    read('components/MoodCommentThread.vue')
  ])
  assert.match(source, /class="mood-calendar"/)
  assert.match(source, /<MoodCommentThread/)
  assert.match(timeline, /<MoodCommentThread/)
  assert.doesNotMatch(timeline, /mood-timeline__tabs|我说的/)
  assert.ok(commentThread.includes('mood/${props.record.id}/comments'))
  assert.match(commentThread, /method: 'POST'/)
  assert.match(commentThread, /maxlength="120"/)
  assert.match(commentThread, /record\.partnerResponse/)
  assert.doesNotMatch(commentThread, /commenterId:\s*|userId:\s*|coupleId:\s*/)
})

test('album, study and plans expose only the approved core workflows', async () => {
  const [album, study, plans] = await Promise.all([
    read('views/Album.vue'), read('views/Postgraduate.vue'), read('views/Plans.vue')
  ])
  assert.match(album, /\{ key: 'photos', label: '日常'/)
  assert.match(album, /\{ key: 'travel', label: '旅行'/)
  assert.match(album, /\{ key: 'food', label: '美食'/)
  assert.doesNotMatch(study, /<section class="pg-command-card"/)
  assert.doesNotMatch(study, /postgraduate\/notify|postgraduate\/archive|<[^>]*pg-archive-section|<[^>]*pg-notify-section/)
  assert.match(study, /overallProgress/)
  assert.match(study, /今日执行清单/)
  assert.match(study, /class="pg-list-actions"/)
  assert.match(plans, /class="plan-list-heading"/)
  assert.doesNotMatch(plans, /<section[^>]*plan-command-card/)
  assert.doesNotMatch(plans, /CONFIG\.API_URL}\/achievements|habits\/weekly-report|activeTab === 'stats'|class="achievements"|<[^>]*checkin-coach-panel|<[^>]*checkin-receipt|selectedMood|mood:\s*selectedMood/)
  assert.match(plans, /完成于/)
  assert.match(plans, /selectedDateSubTaskGroups/)
})

test('health, cosmetics and ledger remain compact while preserving real records', async () => {
  const [health, cycle, cosmetics, budget] = await Promise.all([
    read('views/Health.vue'), read('components/CycleForecastBoard.vue'), read('views/Cosmetics.vue'), read('views/Budget.vue')
  ])
  assert.match(health, /\{ key: 'height', label: '身高' \}/)
  assert.match(health, /\{ key: 'bmi', label: 'BMI' \}/)
  assert.doesNotMatch(health, /TrendState\.guidance|TrendSummary\.comparisonText/)
  assert.doesNotMatch(cycle, /carePlan|forecastSupport|reliability|照顾建议/)
  assert.match(cosmetics, /class="cosmetics-list"/)
  assert.match(cosmetics, /class="card-photo"/)
  assert.doesNotMatch(cosmetics, /<section[^>]*vanity-cover/)
  assert.doesNotMatch(cosmetics, /<section[^>]*vanity-playbook/)
  assert.match(budget, /const tabs = \[[\s\S]*资产[\s\S]*记账[\s\S]*明细[\s\S]*\]/)
  assert.doesNotMatch(budget, /const emojiOptions/)
  assert.match(budget, /categoryTone/)
  assert.doesNotMatch(budget, /<div[^>]*hero-grid/)
})

test('parcel uses shared status and location tabs with recognition; wish keeps explicit archived state', async () => {
  const [expressView, wish] = await Promise.all([read('views/Express.vue'), read('views/Wish.vue')])
  assert.match(expressView, /\{ key: 'pending', label: '待取'/)
  assert.match(expressView, /\{ key: 'picked', label: '已取'/)
  assert.match(expressView, /\{ key: 'archived', label: '归档'/)
  assert.match(expressView, /全部地点/)
  assert.match(expressView, /pickup-locations/)
  assert.match(expressView, /recognizePickupDetails/)
  assert.match(expressView, /express\?archived=all/)
  assert.match(expressView, /mutate\(delivery, 'archive'\)/)
  assert.doesNotMatch(expressView, /<section[^>]*stats-panel/)
  assert.match(wish, /\{ key: 'archived', label: '已归档'/)
  assert.match(wish, /wishes\/\$\{id}\/archive/)
  assert.match(wish, /archivedBy/)
})

test('redesigned modules do not retain unreachable dashboard-era surfaces or styles', async () => {
  const [viewEntries, referenceTheme, globalTheme] = await Promise.all([
    Promise.all(targetViews.map(async file => [file, await read(join('views', file))])),
    read('styles/reference-ui-v8.css'),
    read('style.css')
  ])
  const sources = Object.fromEntries(viewEntries)

  const removedSurfacePatterns = {
    'Album.vue': /album-controls|memory-metrics|cover-lanes|chapter-strip|masonry-grid|view-switcher/,
    'Postgraduate.vue': /pg-command-card|pg-archive-section|pg-notify-section|pg-template-rail/,
    'Plans.vue': /plan-command-card|achievement-summary|weekly-report|checkin-coach|checkin-receipt|habit-rank/,
    'Health.vue': /health-cover|time-range-tabs|menstrual-current-status|daily-checkin-section/,
    'Express.vue': /stats-panel|express-kicker|parcel-shape/,
    'Cosmetics.vue': /vanity-cover|vanity-playbook|vanity-shelves|vanity-ritual-grid/,
    'Budget.vue': /hero-grid|hero-card|hero-number|detail-summary/,
    'Wish.vue': /wall-intro|wish-kicker|wish-mark/
  }

  for (const [file, pattern] of Object.entries(removedSurfacePatterns)) {
    assert.doesNotMatch(sources[file], pattern, `${file} still contains an unreachable dashboard-era surface`)
  }

  const staleGlobalSelectors = /album-controls|tag-rail|pg-command-card|pg-archive-section|plan-command-card|execution-card|health-cover|stats-panel|vanity-cover|shelf-section|hero-grid|wall-intro|playbook-card|cover-rhythm|checkin-coach-panel|pg-command-copy/
  assert.doesNotMatch(referenceTheme, staleGlobalSelectors)
  assert.doesNotMatch(globalTheme, staleGlobalSelectors)
})

test('authenticated pages share one global bottom navigation and keep detail flows focused', async () => {
  const [app, bottomNav, home, profile, shopping, router, globalTheme] = await Promise.all([
    read('App.vue'),
    read('components/BottomNav.vue'),
    read('views/Home.vue'),
    read('views/Profile.vue'),
    read('views/Shopping.vue'),
    read('router/index.js'),
    read('style.css')
  ])

  assert.match(app, /<BottomNav v-if="showBottomNav"/)
  assert.match(app, /!route\.meta\.public && !route\.meta\.hideBottomNav/)
  for (const source of [home, profile, shopping]) assert.doesNotMatch(source, /<BottomNav/)
  for (const label of ['首页', '相册', '心情', '我的']) assert.match(bottomNav, new RegExp(`<small>${label}<\\/small>`))
  assert.match(router, /path: '\/mood\/select',[\s\S]*?hideBottomNav: true/)
  assert.match(router, /path: '\/mood\/write',[\s\S]*?hideBottomNav: true/)
  assert.match(router, /path: '\/mood\/day\/:date',[\s\S]*?hideBottomNav: true/)
  assert.doesNotMatch(globalTheme, /^\.bottom-nav\s*\{/m)
})
