// 版本管理 - 统一从 version.json 读取
let cachedVersion = null
let cachedChangelog = null

/**
 * 获取当前版本号
 * 优先从 version.json 读取，失败则使用硬编码默认值
 */
export async function getVersion() {
  if (cachedVersion) return cachedVersion
  
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store'
    })
    if (res.ok) {
      const data = await res.json()
      cachedVersion = data.version
      cachedChangelog = data.changelog
      return cachedVersion
    }
  } catch (e) {
    console.warn('[Version] 获取版本失败:', e)
  }
  
  // 降级方案：返回硬编码版本
  return '1.1.0'
}

/**
 * 获取版本更新日志
 */
export async function getChangelog() {
  if (cachedChangelog) return cachedChangelog
  
  try {
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store'
    })
    if (res.ok) {
      const data = await res.json()
      cachedVersion = data.version
      cachedChangelog = data.changelog
      return cachedChangelog
    }
  } catch (e) {
    console.warn('[Version] 获取日志失败:', e)
  }
  
  // 降级方案
  return [{
    version: '1.1.0',
    date: '2025-02-22',
    changes: ['📦 新增代取快递功能']
  }]
}

/**
 * 同步获取版本（用于非异步场景，返回缓存值或默认值）
 */
export function getVersionSync() {
  return cachedVersion || '1.1.0'
}

/**
 * 检查更新
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string}>}
 */
export async function checkUpdate() {
  const latestVersion = await getVersion()
  // 从本地存储或硬编码获取当前运行的版本
  const currentVersion = localStorage.getItem('app_version') || latestVersion
  
  return {
    hasUpdate: latestVersion !== currentVersion,
    currentVersion,
    latestVersion
  }
}
