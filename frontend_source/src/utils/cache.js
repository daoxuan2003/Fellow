/**
 * PWA 缓存管理工具
 * 
 * 注意：这是浏览器端缓存，用于离线访问和加速加载
 * 服务端缓存（Redis）需要在后端配置
 */

/**
 * 清除头像缓存
 * 在头像更新后调用，确保新头像立即显示
 * 
 * 策略：头像长期缓存，但修改后主动清除
 */
export async function clearAvatarCache() {
  if (!('caches' in window)) return
  
  try {
    // 1. 清理 workbox 缓存
    const cacheNames = await caches.keys()
    
    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      
      for (const request of requests) {
        const url = request.url
        if (url.includes('avatar') || 
            (url.includes('/api/') && url.includes('user'))) {
          await cache.delete(request)
          console.log('[Cache] 已清除:', url)
        }
      }
    }
    
    // 2. 通知 Service Worker 清理头像缓存（带超时保护）
    if ('serviceWorker' in navigator) {
      try {
        // 使用 Promise.race 添加 2 秒超时
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SW ready timeout')), 2000)
        )
        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          timeout
        ])
        if (registration.active) {
          const channel = new MessageChannel()
          registration.active.postMessage('CLEAR_AVATAR_CACHE', [channel.port2])
        }
      } catch (swError) {
        // Service Worker 通信失败不影响主流程
        console.log('[Cache] SW 通信跳过:', swError.message)
      }
    }
    
    console.log('[Cache] 头像缓存已清除')
  } catch (e) {
    console.error('[Cache] 清除缓存失败:', e)
  }
}

/**
 * 清除所有 API 缓存
 */
export async function clearApiCache() {
  if (!('caches' in window)) return
  
  try {
    const cacheNames = await caches.keys()
    
    for (const name of cacheNames) {
      if (name.includes('api')) {
        await caches.delete(name)
        console.log('[Cache] 已删除缓存:', name)
      }
    }
  } catch (e) {
    console.error('[Cache] 清除 API 缓存失败:', e)
  }
}

/**
 * 清除所有缓存（用于调试）
 */
export async function clearAllCaches() {
  if (!('caches' in window)) return
  
  try {
    const cacheNames = await caches.keys()
    await Promise.all(cacheNames.map(name => caches.delete(name)))
    console.log('[Cache] 所有缓存已清除')
  } catch (e) {
    console.error('[Cache] 清除所有缓存失败:', e)
  }
}

/**
 * 跳过等待并激活新的 Service Worker
 */
export async function skipWaitingAndReload() {
  if (!('serviceWorker' in navigator)) return
  
  const registration = await navigator.serviceWorker.ready
  
  // 检查是否有等待中的 SW
  if (registration.waiting) {
    // 发送消息让 waiting SW 激活
    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
    
    // 等待新的 SW 控制页面后刷新
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })
  }
}
