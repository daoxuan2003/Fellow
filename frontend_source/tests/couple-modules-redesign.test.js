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

test('mood combines paired records, calendar history and one authenticated partner response', async () => {
  const source = await read('views/Mood.vue')
  assert.match(source, /class="mood-calendar"/)
  assert.match(source, /class="mood-response"/)
  assert.ok(source.includes('mood/${partnerLatestMood.value.id}/response'))
  assert.match(source, /\{ kind: 'hug', label: '抱抱你' \}/)
  assert.match(source, /maxlength="60"/)
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

test('parcel and wish views use explicit archived state and authenticated mutation routes', async () => {
  const [expressView, wish] = await Promise.all([read('views/Express.vue'), read('views/Wish.vue')])
  assert.match(expressView, /\{ key: 'mine', label: '我的'/)
  assert.match(expressView, /\{ key: 'archived', label: '归档'/)
  assert.match(expressView, /express\?archived=all/)
  assert.match(expressView, /mutate\(delivery, 'archive'\)/)
  assert.doesNotMatch(expressView, /<section[^>]*stats-panel/)
  assert.match(wish, /\{ key: 'archived', label: '已归档'/)
  assert.match(wish, /wishes\/\$\{id}\/archive/)
  assert.match(wish, /archivedBy/)
})
