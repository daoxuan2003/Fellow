import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const sourceDir = fileURLToPath(new URL('../src/', import.meta.url))

async function readSource(path) {
  return readFile(join(sourceDir, path), 'utf8')
}

test('相册发布兼容新旧后端并使用本地预览读取图片比例', async () => {
  const source = await readSource('views/Album.vue')

  assert.match(source, /const uploadedPath = uploadData\.data\?\.path/)
  assert.match(source, /const uploadedUrl = uploadData\.data\?\.url/)
  assert.match(source, /getImageAspectRatio\(fileData\.preview\)/)
  assert.match(source, /path: uploadedPath/)
  assert.match(source, /url: uploadedUrl/)
})

test('绑定首页使用目标内联页脚，其他页面共享安全区自适应底部导航', async () => {
  const [home, profile, bottomNav, globalStyle] = await Promise.all([
    readSource('views/Home.vue'),
    readSource('views/Profile.vue'),
    readSource('components/BottomNav.vue'),
    readSource('style.css')
  ])

  assert.match(home, /<footer class="pop-home-foot">/)
  assert.match(home, /<BottomNav v-if="loading \|\| user\.inviteStatus !== 'bound'"/)
  assert.match(profile, /<BottomNav v-show="!hideBottomNav"/)
  assert.match(bottomNav, /min-height: 54px/)
  assert.match(bottomNav, /calc\(10px \+ env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(globalStyle, /--bottom-nav-height: calc\(74px \+ env\(safe-area-inset-bottom, 0px\)\)/)

  const globalPageInset = globalStyle.match(/#app :is\(([\s\S]*?)\) \{\s*padding-bottom: var\(--page-bottom-inset\)/)
  assert.ok(globalPageInset)
  assert.doesNotMatch(globalPageInset[1], /\.profile-page/)
  assert.match(profile, /calc\(var\(--bottom-nav-height\) \+ 12px\)/)
})

test('我的页关系线继续使用无拉伸尺寸，目标首页不混入旧关系线', async () => {
  const [home, profile, coupleThread] = await Promise.all([
    readSource('views/Home.vue'),
    readSource('views/Profile.vue'),
    readSource('components/CoupleThread.vue')
  ])

  assert.match(profile, /\.profile-heart-thread \{[\s\S]*?width: 250px;[\s\S]*?height: 42px;/)
  assert.match(coupleThread, /preserveAspectRatio="xMidYMid meet"/)
  const boundTemplate = home.slice(home.indexOf('class="home-pop-shell"'), home.indexOf('<!-- 主应用 -->'))
  assert.doesNotMatch(boundTemplate, /CoupleThread|v7-thread/)
})

test('资料页不再把客户端提供的数据直接广播给伴侣', async () => {
  const profile = await readSource('views/Profile.vue')

  assert.doesNotMatch(profile, /send\(\{\s*type: ['"]update['"]/)
})
