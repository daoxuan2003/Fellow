// 版本管理 - 统一从 version.json 读取
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('Version')

export const VERSION_CACHE_KEY = 'app_version'
export const LATEST_VERSION_CACHE_KEY = 'app_latest_version_cache'
export const CHANGELOG_CACHE_KEY = 'app_changelog'
export const FALLBACK_VERSION = '7.0.3'
export const FALLBACK_CHANGELOG = [
  {
    version: '7.0.3',
    date: '2026-07-15',
    changes: [
      '📱 首页增加状态栏安全区，单屏会随不同手机尺寸完整缩放且不再遮挡顶部内容',
      '💬 首页留言改为独立弹窗，双方消息统一使用带方向尾巴的聊天气泡',
      '👫 根据伴侣性别显示他或她，未知性别使用对方；我的页展示昵称、性别与伴侣备注',
      '💞 红蓝连线重构为可复用的连续闭合爱心，并同步到首页、登录页与我的页',
      '🎨 登录页和我的页同步青春配色，小事卡片改用统一线性图标并优化内部排版',
      '✍️ 手写字体换为更清楚的自托管马善政楷体',
      '✅ 通过 133 项前端测试、Vue 编译、移动端截图与 Impeccable 扫描'
    ]
  },
  {
    version: '7.0.2',
    date: '2026-07-14',
    changes: [
      '🎨 首页由米黄棕灰纸感调整为亮珊瑚、清蓝、薄荷与浅柠檬组成的青春清透配色',
      '💞 头像连线不再叠放两个完整爱心，改为从参考图像素轨迹拟合的红蓝开放曲线与共享心形',
      '✍️ 合照文案和心愿墙接入自托管中文手写字体，跨手机保持明确的自然笔迹效果',
      '📝 心愿预览稳定排成两行并保留真实后端内容，过长标题使用省略号诚实截断',
      '🔎 通过 Impeccable 独立字体审查、机械扫描、Vue 编译和 133 项前端测试'
    ]
  },
  {
    version: '7.0.1',
    date: '2026-07-14',
    changes: [
      '🎨 首页、登录页与“我们”页按暖白纸感参考图统一重制，并保留原有功能入口',
      '🧹 首页彻底删除第二屏、旧分页结构与遗留轮播，只保留可随手机尺寸整体缩放的单屏画布',
      '💞 头像连线爱心按双方性别分别使用橙、蓝或中性色，一起生活天数改为重点信息',
      '🖼️ 合照与去年今天加入真实空白方案，首页手写文案按日期轮换且不再伪造照片内容',
      '💬 新增可编辑并实时同步的首页小留言，优化心情未记录时的友好表达',
      '🔌 九个生活小事窗口全部读取真实接口数据或展示明确空状态，移除示例账单、日期和心愿',
      '🫀 按参考图重绘双色心电图，并通过 Impeccable 字体、布局与反模式审查'
    ]
  },
  {
    version: '7.0.0',
    date: '2026-07-14',
    changes: [
      '🎨 首页按暖色纸感参考图重制为关系封面、共同照片、去年今天与生活小事拼贴',
      '📱 使用 430×932 单画布等比缩放，标准屏与窄屏保持同一构图且完整收进一页',
      '🧹 删除旧版首页第二屏、左右翻页控件与分页状态，首页只保留单屏画布',
      '🖼️ 首页合照与纪念缩略图直接使用情侣相册数据，无照片时保留双人关系占位',
      '🧭 保留心情、相册、考研、计划、健康、快递、化妆品、账本与心愿入口和实时状态',
      '✨ 底部导航改为今天、一起、记录、我们四项轻量线性视觉',
      '💞 头像连线改为橙蓝双色交叠爱心，并按参考图调整轮廓、角度与汇合位置'
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
