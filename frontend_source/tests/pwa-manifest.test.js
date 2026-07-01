import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const testDir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(testDir, '..', 'public')

async function loadManifest() {
  const raw = await readFile(join(publicDir, 'manifest.json'), 'utf8')
  return JSON.parse(raw)
}

test('PWA manifest exposes install-ready metadata and real icon files', async () => {
  const manifest = await loadManifest()

  assert.equal(manifest.id, '/')
  assert.equal(manifest.scope, '/')
  assert.equal(manifest.display, 'standalone')
  assert.equal(manifest.lang, 'zh-CN')
  assert.ok(Array.isArray(manifest.icons))
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'any'))
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'))
  assert.ok(manifest.icons.every(icon => !icon.src.startsWith('data:')))

  await Promise.all(
    manifest.icons.map(icon => access(join(publicDir, icon.src.replace(/^\//, ''))))
  )
})

test('PWA shortcuts point to existing app routes', async () => {
  const manifest = await loadManifest()
  const routes = new Set(['/plans', '/health', '/shopping'])

  assert.ok(Array.isArray(manifest.shortcuts))
  assert.equal(manifest.shortcuts.length, 3)
  manifest.shortcuts.forEach(shortcut => {
    assert.ok(shortcut.name)
    assert.ok(shortcut.short_name)
    assert.ok(routes.has(shortcut.url))
  })
})
