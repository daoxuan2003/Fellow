import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  CHANGELOG_CACHE_KEY,
  FALLBACK_CHANGELOG,
  FALLBACK_VERSION,
  LATEST_VERSION_CACHE_KEY,
  VERSION_CACHE_KEY,
  checkUpdate,
  getChangelog,
  getVersion,
  getVersionSync,
  resetVersionCacheForTests
} from '../src/utils/version.js'

const testDir = dirname(fileURLToPath(import.meta.url))
const publicDir = join(testDir, '..', 'public')
const originalFetch = globalThis.fetch
const originalLocalStorage = globalThis.localStorage
const originalWarn = console.warn

class MemoryStorage {
  constructor(initial = {}) {
    this.map = new Map(Object.entries(initial))
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null
  }

  setItem(key, value) {
    this.map.set(key, String(value))
  }

  removeItem(key) {
    this.map.delete(key)
  }

  clear() {
    this.map.clear()
  }
}

function installStorage(initial) {
  const storage = new MemoryStorage(initial)
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  })
  return storage
}

function installVersionFetch(data) {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => data
  })
}

afterEach(() => {
  resetVersionCacheForTests()
  globalThis.fetch = originalFetch
  console.warn = originalWarn
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage
  })
})

test('version fallback stays aligned with the public version file', async () => {
  const raw = await readFile(join(publicDir, 'version.json'), 'utf8')
  const publicVersion = JSON.parse(raw)

  assert.equal(FALLBACK_VERSION, publicVersion.version)
  assert.deepEqual(FALLBACK_CHANGELOG[0], publicVersion.changelog[0])
})

test('version fetch caches latest metadata without overwriting the confirmed running version', async () => {
  const storage = installStorage({ [VERSION_CACHE_KEY]: '5.9.7' })
  installVersionFetch({
    version: '5.9.8',
    changelog: [{ version: '5.9.8', date: '2026-06-29', changes: ['ready'] }]
  })

  assert.equal(await getVersion(), '5.9.8')
  assert.deepEqual(await getChangelog(), [{ version: '5.9.8', date: '2026-06-29', changes: ['ready'] }])
  assert.equal(storage.getItem(VERSION_CACHE_KEY), '5.9.7')
  assert.equal(storage.getItem(LATEST_VERSION_CACHE_KEY), '5.9.8')
})

test('version utilities fall back to cached metadata while offline', async () => {
  installStorage({
    [LATEST_VERSION_CACHE_KEY]: '5.9.8',
    [CHANGELOG_CACHE_KEY]: JSON.stringify([{ version: '5.9.8', date: '2026-06-29', changes: ['cached'] }])
  })
  globalThis.fetch = async () => {
    throw new Error('offline')
  }
  console.warn = () => {}

  assert.equal(await getVersion(), '5.9.8')
  assert.equal(getVersionSync(), '5.9.8')
  assert.deepEqual(await getChangelog(), [{ version: '5.9.8', date: '2026-06-29', changes: ['cached'] }])
})

test('checkUpdate compares the confirmed running version against the fetched latest version', async () => {
  installStorage({ [VERSION_CACHE_KEY]: '5.9.7' })
  installVersionFetch({
    version: '5.9.8',
    changelog: [{ version: '5.9.8', date: '2026-06-29', changes: ['ready'] }]
  })

  assert.deepEqual(await checkUpdate(), {
    hasUpdate: true,
    currentVersion: '5.9.7',
    latestVersion: '5.9.8'
  })
})
