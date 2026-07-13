// 版本管理 - 统一从 version.json 读取
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('Version')

export const VERSION_CACHE_KEY = 'app_version'
export const LATEST_VERSION_CACHE_KEY = 'app_latest_version_cache'
export const CHANGELOG_CACHE_KEY = 'app_changelog'
export const FALLBACK_VERSION = '6.0.2'
export const FALLBACK_CHANGELOG = [
  {
    version: '6.0.2',
    date: '2026-07-13',
    changes: [
      '💄 首页首屏重排为关系封面，名字同排显示，并移除小纸条、今日照顾按钮和我们/今日分页块',
      '🎨 第二屏删除今日卡片，只保留差异化文字入口，心情、计划、考研等入口文案全面缩短',
      '📱 首页首屏锁定外层滚动，第二屏保留内部滚动，改善窄屏入口挤压'
    ]
  },
  {
    version: '6.0.1',
    date: '2026-07-13',
    changes: [
      '💄 首页改为两屏：第一屏只放关系，第二屏承载今日行动和全部功能入口',
      '🎨 第二屏功能入口改为差异化马赛克，考研、计划、心情、相册、健康、快递等拥有不同构图',
      '📱 修复底部导航遮挡，统一主要页面的底部安全区',
      '✂️ 压缩首页和功能页概览文案，减少首屏文字负担',
      '🌸 调整全局配色为更明确的情侣感玫瑰与低饱和青绿体系'
    ]
  }
]

let cachedVersion = null
let cachedChangelog = null

function getStorage() {
  try {
    return globalThis.localStorage || null
  } catch (e) {
    return null
  }
}

function readStoredVersion() {
  const storage = getStorage()
  if (!storage) return ''
  return storage.getItem(LATEST_VERSION_CACHE_KEY) || storage.getItem(VERSION_CACHE_KEY) || ''
}

function readCurrentVersion() {
  const storage = getStorage()
  if (!storage) return ''
  return storage.getItem(VERSION_CACHE_KEY) || ''
}

function readStoredChangelog() {
  const storage = getStorage()
  if (!storage) return null

  try {
    const stored = JSON.parse(storage.getItem(CHANGELOG_CACHE_KEY) || 'null')
    return Array.isArray(stored) && stored.length > 0 ? stored : null
  } catch (e) {
    return null
  }
}

function writeVersionCache(data) {
  if (!data || typeof data.version !== 'string') return

  cachedVersion = data.version
  cachedChangelog = Array.isArray(data.changelog) ? data.changelog : cachedChangelog

  const storage = getStorage()
  if (!storage) return

  storage.setItem(LATEST_VERSION_CACHE_KEY, data.version)
  if (Array.isArray(data.changelog)) {
    storage.setItem(CHANGELOG_CACHE_KEY, JSON.stringify(data.changelog))
  }
}

async function fetchVersionData() {
  const res = await fetch(`/version.json?t=${Date.now()}`, {
    cache: 'no-store'
  })

  if (!res.ok) {
    throw new Error(`version.json ${res.status}`)
  }

  const data = await res.json()
  if (!data || typeof data.version !== 'string') {
    throw new Error('version.json 格式无效')
  }

  writeVersionCache(data)
  return data
}

/**
 * 获取当前版本号
 * 优先从 version.json 读取，失败则使用缓存和当前内置版本
 */
export async function getVersion() {
  if (cachedVersion) return cachedVersion
  
  try {
    const data = await fetchVersionData()
    return data.version
  } catch (e) {
    logger.warn('获取版本失败', e)
  }
  
  // 降级顺序：内存缓存 -> 本地缓存 -> 当前内置版本
  const storedVersion = readStoredVersion()
  if (storedVersion) {
    cachedVersion = storedVersion
    return storedVersion
  }

  return FALLBACK_VERSION
}

/**
 * 获取版本更新日志
 */
export async function getChangelog() {
  if (cachedChangelog) return cachedChangelog
  
  try {
    const data = await fetchVersionData()
    return Array.isArray(data.changelog) ? data.changelog : FALLBACK_CHANGELOG
  } catch (e) {
    logger.warn('获取日志失败', e)
  }
  
  const storedChangelog = readStoredChangelog()
  if (storedChangelog) {
    cachedChangelog = storedChangelog
    return storedChangelog
  }

  return FALLBACK_CHANGELOG
}

/**
 * 同步获取版本（用于非异步场景，返回缓存值或默认值）
 */
export function getVersionSync() {
  return cachedVersion || readStoredVersion() || FALLBACK_VERSION
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string}>}
 */
export async function checkUpdate() {
  const latestVersion = await getVersion()
  // 从本地存储获取当前已确认运行版本，避免最新版本缓存掩盖更新提示
  const currentVersion = readCurrentVersion() || latestVersion
  
  return {
    hasUpdate: latestVersion !== currentVersion,
    currentVersion,
    latestVersion
  }
}

export function resetVersionCacheForTests() {
  cachedVersion = null
  cachedChangelog = null
}
