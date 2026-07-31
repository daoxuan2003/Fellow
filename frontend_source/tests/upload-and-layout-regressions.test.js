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

test('绑定首页保留内容页脚，认证页面共享一个安全区自适应底部导航', async () => {
  const [app, home, profile, bottomNav, globalStyle, referenceTheme] = await Promise.all([
    readSource('App.vue'),
    readSource('views/Home.vue'),
    readSource('views/Profile.vue'),
    readSource('components/BottomNav.vue'),
    readSource('style.css'),
    readSource('styles/reference-ui-v8.css')
  ])

  assert.match(home, /<footer class="pop-home-foot">/)
  assert.match(app, /<BottomNav v-if="showBottomNav"/)
  assert.match(app, /!route\.meta\.public && !route\.meta\.hideBottomNav/)
  assert.doesNotMatch(home, /<BottomNav/)
  assert.doesNotMatch(profile, /<BottomNav/)
  assert.match(bottomNav, /min-height: 58px/)
  assert.match(bottomNav, /class="bottom-nav-shell"/)
  assert.match(bottomNav, /padding-bottom: max\(0px, env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(bottomNav, /bottom: 0/)
  assert.doesNotMatch(bottomNav, /visualViewport|innerHeight|--bottom-nav-viewport-offset/)
  assert.match(globalStyle, /--bottom-nav-height: calc\(74px \+ env\(safe-area-inset-bottom, 0px\)\)/)
  assert.match(globalStyle, /html,\s*body,\s*#app \{[\s\S]*?min-height: max\(100vh, 100dvh\)/)
  assert.doesNotMatch(globalStyle, /-webkit-fill-available/)

  const globalPageInset = globalStyle.match(/#app :is\(([\s\S]*?)\) \{\s*padding-bottom: var\(--page-bottom-inset\)/)
  assert.ok(globalPageInset)
  assert.doesNotMatch(globalPageInset[1], /\.profile-page/)
  assert.match(referenceTheme, /#app \.profile-paper-app \{[\s\S]*?calc\(104px \+ env\(safe-area-inset-bottom, 0px\)\)/)
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
