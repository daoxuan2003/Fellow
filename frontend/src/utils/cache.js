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
    // 获取所有缓存
    const cacheNames = await caches.keys()
    
    // 删除包含头像的缓存
    for (const name of cacheNames) {
      const cache = await caches.open(name)
      const requests = await cache.keys()
      
      // 删除所有头像相关的缓存
      for (const request of requests) {
        const url = request.url
        // 匹配头像路径
        if (url.includes('avatar') || 
            (url.includes('/api/') && url.includes('user'))) {
          await cache.delete(request)
          console.log('[Cache] 已清除:', url)
        }
      }
    }
    
    console.log('[Cache] 头像缓存已清除，新头像将在下次加载时缓存')
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
