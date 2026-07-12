// 版本管理 - 统一从 version.json 读取
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('Version')

export const VERSION_CACHE_KEY = 'app_version'
export const LATEST_VERSION_CACHE_KEY = 'app_latest_version_cache'
export const CHANGELOG_CACHE_KEY = 'app_changelog'
export const FALLBACK_VERSION = '6.0.0'
export const FALLBACK_CHANGELOG = [
  {
    version: '6.0.0',
    date: '2026-07-13',
    changes: [
      '✨ 商业级情侣体验升级：重塑首页关系分页、相册、心情、计划、考研、健康、化妆台和取件归档',
      '🔐 加固情侣数据权限、媒体来源校验、敏感日志脱敏和生产环境配置边界',
      '📅 强化月经规律分析、预测窗口、健康趋势和身体档案可信记录',
      '📚 考研陪跑改为科目任务配额、打卡督促和考后全过程归档',
      '♿ 统一关键反馈提示的可访问性，并补齐 PWA、发布链路和核心工具测试',
      '🧹 移除 AI 功能入口与旧成就迁移入口，保留成就系统本体'
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
