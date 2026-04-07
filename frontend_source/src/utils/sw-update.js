/**
 * Service Worker 更新管理
 * 解决 PWA 缓存和实时更新问题
 */

let updateCallbacks = []
let isUpdatePending = false

/**
 * 注册 SW 更新监听
 */
export function registerSWUpdate(callback) {
  updateCallbacks.push(callback)
  
  // 如果已经有待更新，立即触发
  if (isUpdatePending) {
    callback()
  }
}

/**
 * 触发更新提示
 */
function triggerUpdate() {
  isUpdatePending = true
  updateCallbacks.forEach(cb => cb())
}

/**
 * 检查 SW 更新
 * 通过向新 SW 发送消息，确认是否有更新
 */
export async function checkSWUpdate() {
  if (!('serviceWorker' in navigator)) return false
  
  const registration = await navigator.serviceWorker.ready
  
  // 监听新的 SW 安装
  registration.addEventListener('updatefound', () => {
    const newWorker = registration.installing
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // 有新的 SW 等待激活
        console.log('[SW] 发现新版本，等待激活')
        triggerUpdate()
      }
    })
  })
  
  // 主动检查更新
  try {
    await registration.update()
  } catch (e) {
    console.error('[SW] 检查更新失败:', e)
  }
}

/**
 * 跳过等待，立即激活新 SW
 */
export async function skipWaiting() {
  if (!('serviceWorker' in navigator)) return
  
  const registration = await navigator.serviceWorker.ready
  
  if (registration.waiting) {
    // 发送消息给新的 SW，让它跳过等待
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
  }
}

/**
 * 刷新页面以使用新版本的 SW
 */
export function refreshPage() {
  window.location.reload()
}

/**
 * 初始化 SW 更新管理
 */
export function initSWUpdateManager() {
  if (!('serviceWorker' in navigator)) return
  
  // 监听来自 SW 的消息
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'UPDATE_AVAILABLE') {
      console.log('[SW] 收到更新通知')
      triggerUpdate()
    }
  })
  
  // 页面加载时检查
  checkSWUpdate()
  
  // 页面重新可见时检查
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkSWUpdate()
    }
  })
}
