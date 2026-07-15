import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDir = fileURLToPath(new URL('../src/', import.meta.url))

test('首页保持 430 × 932 单画布并按整屏等比缩放', async () => {
  const source = await readFile(join(sourceDir, 'views/Home.vue'), 'utf8')

  assert.match(source, /const HOME_STAGE_WIDTH = 430/)
  assert.match(source, /const HOME_STAGE_HEIGHT = 932/)
  assert.match(source, /viewportWidth \/ HOME_STAGE_WIDTH/)
  assert.match(source, /viewportHeight \/ HOME_STAGE_HEIGHT/)
  assert.doesNotMatch(source, /HOME_FRAME_HEIGHT/)
  assert.doesNotMatch(source, /HOME_SAFE_TOP/)
  assert.doesNotMatch(source, /class="v7-memory-strip"/)
})

test('九张小事卡片使用独立材质物件而不是通用功能图标', async () => {
  const source = await readFile(join(sourceDir, 'views/Home.vue'), 'utf8')

  for (const asset of [
    'study-books.png',
    'parcel-box.png',
    'cosmetics-set.png',
    'plan-paperclip.png',
    'wish-thumbtack.png'
  ]) {
    assert.match(source, new RegExp(asset.replace('.', '\\.')))
  }

  assert.doesNotMatch(source, /BookOpenCheck/)
  assert.doesNotMatch(source, /PackageOpen/)
  assert.doesNotMatch(source, /Sparkles/)

  for (const card of [
    'mood-card',
    'album-card',
    'study-card',
    'plan-card',
    'health-card',
    'express-card',
    'cosmetics-card',
    'budget-card',
    'wish-card'
  ]) {
    assert.match(source, new RegExp(`class="v7-life-card ${card}"`))
  }
})

test('首页保留真实数据、关系线和弹窗留言交互层', async () => {
  const source = await readFile(join(sourceDir, 'views/Home.vue'), 'utf8')

  assert.match(source, /<CoupleThread class="v7-thread"/)
  assert.match(source, /v-if="heroPhoto\?\.url"/)
  assert.match(source, /\{\{ moodCardStatus \}\}/)
  assert.match(source, /\{\{ planStatus \}\}/)
  assert.match(source, /\{\{ healthStatus \}\}/)
  assert.match(source, /\{\{ expressStatus \}\}/)
  assert.match(source, /class="v7-message-dialog"/)
  assert.match(source, /@submit\.prevent="saveHomeMessage"/)
  assert.match(source, /\.v7-chat-stack button\.v7-message \{[^}]*font: 400 10\.5px\/1\.25/)
  assert.match(source, /<BottomNav :accent="homeNavAccent"/)
  assert.doesNotMatch(source, /class="v7-bottom-nav"/)
  assert.doesNotMatch(source, /send\(\{ type: 'update'/)

  for (const endpoint of [
    '/user/profile',
    '/express',
    '/habits/today',
    '/wishes',
    '/mood?date=',
    '/budget/stats',
    '/budget/transactions',
    '/cosmetics',
    '/health',
    '/photos',
    '/postgraduate'
  ]) {
    assert.match(source, new RegExp(endpoint.replace(/[?/.]/g, '\\$&')))
  }

  assert.match(source, /Authorization['"]?:?\s*['"]Bearer/)
  assert.match(source, /case 'partnerUpdated'/)
  assert.match(source, /fetchHomeStats\(true\)/)
})
