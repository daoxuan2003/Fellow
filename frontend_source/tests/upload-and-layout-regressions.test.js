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

test('首页和我的页共用同高底部导航且我的页不叠加全局底部空白', async () => {
  const [home, profile, bottomNav, globalStyle] = await Promise.all([
    readSource('views/Home.vue'),
    readSource('views/Profile.vue'),
    readSource('components/BottomNav.vue'),
    readSource('style.css')
  ])

  assert.match(home, /<BottomNav :accent="homeNavAccent"/)
  assert.match(profile, /<BottomNav v-show="!hideBottomNav"/)
  assert.match(bottomNav, /height: var\(--bottom-nav-height, 81px\)/)
  assert.match(globalStyle, /--bottom-nav-height: 81px/)

  const globalPageInset = globalStyle.match(/#app :is\(([\s\S]*?)\) \{\s*padding-bottom: var\(--page-bottom-inset\)/)
  assert.ok(globalPageInset)
  assert.doesNotMatch(globalPageInset[1], /\.profile-page/)
  assert.match(profile, /calc\(var\(--bottom-nav-height\) \+ 12px\)/)
})

test('我的页使用与首页相同的无拉伸爱心关系线尺寸', async () => {
  const [home, profile, coupleThread] = await Promise.all([
    readSource('views/Home.vue'),
    readSource('views/Profile.vue'),
    readSource('components/CoupleThread.vue')
  ])

  assert.match(home, /\.v7-thread \{[\s\S]*?width: 250px;[\s\S]*?height: 42px;/)
  assert.match(profile, /\.profile-heart-thread \{[\s\S]*?width: 250px;[\s\S]*?height: 42px;/)
  assert.match(coupleThread, /preserveAspectRatio="xMidYMid meet"/)
})

test('资料页不再把客户端提供的数据直接广播给伴侣', async () => {
  const profile = await readSource('views/Profile.vue')

  assert.doesNotMatch(profile, /send\(\{\s*type: ['"]update['"]/)
})
