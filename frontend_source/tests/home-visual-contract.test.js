import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDir = fileURLToPath(new URL('../src/', import.meta.url))

test('首页使用目标站流式壳与内部滚动，不再整体缩放固定画布', async () => {
  const source = await readFile(join(sourceDir, 'views/Home.vue'), 'utf8')

  assert.match(source, /class="home-pop-shell"/)
  assert.match(source, /\.home-pop-shell \{[\s\S]*?width: min\(100%, 460px\);[\s\S]*?height: 100dvh;[\s\S]*?min-height: 640px;/)
  assert.match(source, /\.pop-home \{[\s\S]*?height: 100%;[\s\S]*?overflow: auto;/)
  assert.match(source, /padding: max\(18px, env\(safe-area-inset-top\)\) 15px max\(14px, env\(safe-area-inset-bottom\)\)/)
  assert.doesNotMatch(source, /HOME_STAGE_WIDTH/)
  assert.doesNotMatch(source, /HOME_STAGE_HEIGHT/)
  assert.doesNotMatch(source, /updateHomeScale/)
})

test('九个生活入口逐项匹配目标站结构并接入 Fellow 真实路由', async () => {
  const source = await readFile(join(sourceDir, 'views/Home.vue'), 'utf8')

  assert.equal((source.match(/class="pop-feature pop-feature-\d"/g) || []).length, 9)
  for (const glyph of [
    'glyph-mood',
    'glyph-album',
    'glyph-study',
    'glyph-plan',
    'glyph-health',
    'glyph-parcel',
    'glyph-cosmetics',
    'glyph-ledger',
    'glyph-wishes'
  ]) {
    assert.match(source, new RegExp(`class="brand-glyph ${glyph}"`))
  }

  for (const route of ['/mood', '/album', '/postgraduate', '/plans', '/health', '/express', '/cosmetics', '/budget', '/wish']) {
    assert.match(source, new RegExp(`navigateTo\\('${route}'\\)`))
  }

  assert.match(source, /我们的小宇宙/)
  assert.doesNotMatch(source, /9 个生活入口/)
  assert.doesNotMatch(source, /小金豆|小小公主|1\/4 今日进度|2 个愿望/)
})

test('首页关系卡和九入口只展示真实状态并保留实时刷新', async () => {
  const [source, app] = await Promise.all([
    readFile(join(sourceDir, 'views/Home.vue'), 'utf8'),
    readFile(join(sourceDir, 'App.vue'), 'utf8')
  ])

  assert.match(source, /<MoodCharacter v-if="homeStats\.mood\.loaded && homeStats\.mood\.today"/)
  assert.match(source, /<MoodCharacter v-if="homeStats\.mood\.loaded && homeStats\.mood\.partnerToday"/)
  assert.match(source, /mood: \{ loaded: false, today: false, partnerToday: false \}/)
  assert.match(source, /homeStats\.value\.mood = \{\s*loaded: true,/)
  assert.match(source, /\['mood-placeholder', homeStats\.mood\.loaded \? 'mood-empty' : 'mood-loading'\]/)
  assert.match(source, /homeStats\.value\.mood\.loaded/)
  assert.match(source, /:src="userAvatarUrl"/)
  assert.match(source, /:src="partnerAvatarUrl"/)
  assert.match(source, /<b v-else aria-hidden="true">\{\{ userInitial \}\}<\/b>/)
  assert.match(source, /<b v-else aria-hidden="true">\{\{ partnerInitial \}\}<\/b>/)
  assert.equal((source.match(/class="pop-avatar-mood"/g) || []).length, 2)
  assert.match(source, /\{\{ user\.nickname \|\| '我' \}\}/)
  assert.match(source, /\{\{ partner\?\.nickname \|\| '伴侣资料同步中' \}\}/)
  assert.match(source, /\{\{ user\.anniversary \? `\$\{togetherDays\} 天` : '—' \}\}/)
  assert.match(source, /\{\{ moodFeatureStatus \}\}/)
  assert.match(source, /\{\{ albumFeatureStatus \}\}/)
  assert.match(source, /\{\{ cosmeticsFeatureStatus \}\}/)
  assert.match(source, /\{\{ budgetFeatureStatus \}\}/)
  assert.match(source, /\{\{ wishFeatureStatus \}\}/)
  assert.match(source, /v-if="homeStatsError" class="pop-sync-state"/)
  assert.match(source, /@click="fetchHomeStats\(true\)"/)
  assert.match(source, /case 'partnerUpdated'/)
  assert.match(source, /fetchHomeStats\(true\)/)

  for (const endpoint of [
    '/express',
    '/habits/today',
    '/wishes',
    '/mood?date=',
    '/budget/stats',
    '/cosmetics',
    '/health',
    '/photos',
    '/postgraduate'
  ]) {
    assert.match(source, new RegExp(endpoint.replace(/[?/.]/g, '\\$&')))
  }

  assert.match(source, /Authorization['"]?:?\s*['"]Bearer/)
  assert.match(source, /<footer class="pop-home-foot">/)
  assert.match(app, /<BottomNav v-if="showBottomNav"/)
  assert.doesNotMatch(source, /<BottomNav/)

  const boundTemplate = source.slice(source.indexOf('class="home-pop-shell"'), source.indexOf('<!-- 主应用 -->'))
  assert.doesNotMatch(boundTemplate, /BottomNav|v7-|home-v7/)
})

test('首页目标字号不会再被视口缩放，完整动态文本进入无障碍名称', async () => {
  const [home, index] = await Promise.all([
    readFile(join(sourceDir, 'views/Home.vue'), 'utf8'),
    readFile(fileURLToPath(new URL('../index.html', import.meta.url)), 'utf8')
  ])

  assert.match(home, /\.pop-avatar \{[\s\S]*?width: 72px;[\s\S]*?height: 72px;/)
  assert.match(home, /\.pop-avatar-mood \{[\s\S]*?min-height: var\(--fellow-touch-target-min\);/)
  assert.match(home, /\.pop-connection b \{[\s\S]*?font-size: 18px;[\s\S]*?font-weight: 950;/)
  assert.match(home, /\.pop-feature strong \{[\s\S]*?font-size: 13px;[\s\S]*?font-weight: 950;/)
  assert.match(home, /\.pop-feature small \{[\s\S]*?font-size: 10px;[\s\S]*?font-weight: 750;/)
  assert.match(home, /:aria-label="`心情日记：\$\{moodFeatureStatus\}`"/)
  assert.match(home, /:aria-label="`账本 · 记账：\$\{budgetFeatureStatus\}`"/)
  assert.doesNotMatch(index, /user-scalable=no|maximum-scale=/)
})
