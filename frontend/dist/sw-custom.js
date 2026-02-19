/**
 * 自定义 Service Worker - 处理 Web Push 通知
 * 此文件会被 vite-plugin-pwa 注入到主 SW 中
 */

// ============================================
// Push 事件处理 - 接收服务器推送并显示通知
// ============================================
self.addEventListener('push', (event) => {
  console.log('[SW] 收到 Push 消息:', event)

  let data = {}
  try {
    // 尝试解析推送数据
    data = event.data ? event.data.json() : {}
  } catch (e) {
    console.error('[SW] 解析推送数据失败:', e)
    data = {
      title: '新消息',
      body: event.data ? event.data.text() : '您有一条新通知'
    }
  }

  // 默认通知选项
  const options = {
    body: data.body || '',
    icon: data.icon || '/heart.svg',
    badge: data.badge || '/heart.svg',
    tag: data.tag || 'default',
    data: data.data || {},
    requireInteraction: false,
    // iOS 需要 vibrate 才能触发震动
    vibrate: [200, 100, 200],
    // 通知行为按钮（部分浏览器支持）
    actions: data.actions || []
  }

  // 显示通知
  const notificationPromise = self.registration.showNotification(
    data.title || '共赴',
    options
  )

  event.waitUntil(notificationPromise)
})

// ============================================
// 通知点击事件处理
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 通知被点击:', event.notification)

  event.notification.close()

  // 获取通知数据
  const notificationData = event.notification.data || {}
  const action = event.action

  // 根据点击的按钮或通知本身执行不同操作
  let targetUrl = '/'

  // 根据通知类型决定跳转页面
  switch (notificationData.type) {
    case 'inviteReceived':
      targetUrl = '/?tab=invitation'
      break
    case 'inviteAccepted':
      targetUrl = '/home'
      break
    case 'inviteRejected':
    case 'unbound':
      targetUrl = '/'
      break
    case 'partnerUpdated':
      targetUrl = '/profile'
      break
    case 'test':
    default:
      targetUrl = '/'
  }

  // 查找或打开窗口
  const promiseChain = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((windowClients) => {
    // 检查是否已有窗口打开
    let matchingClient = null
    for (let i = 0; i < windowClients.length; i++) {
      const client = windowClients[i]
      if (client.url.includes(self.location.origin)) {
        matchingClient = client
        break
      }
    }

    if (matchingClient) {
      // 聚焦到已有窗口并导航
      return matchingClient.focus().then((client) => {
        return client.navigate(targetUrl)
      })
    } else {
      // 打开新窗口
      return self.clients.openWindow(targetUrl)
    }
  })

  event.waitUntil(promiseChain)
})

// ============================================
// Service Worker 安装/激活
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...')
  // 立即激活，跳过等待
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...')
  // 立即接管所有客户端
  event.waitUntil(self.clients.claim())
})

// ============================================
// 头像图片缓存 - 使用 StaleWhileRevalidate 策略
// 即使URL有签名参数，也能正确缓存
// ============================================

const AVATAR_CACHE_NAME = 'avatar-cache-v2'

// 判断是否是头像请求
function isAvatarRequest(url) {
  return url.pathname.includes('avatar') || 
         url.pathname.includes('lifesync/avatars')
}

// 获取缓存键（去掉查询参数）
function getCacheKey(url) {
  // 只保留路径部分，去掉S3签名参数
  return url.origin + url.pathname
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  
  // 只处理头像请求
  if (!isAvatarRequest(url)) return
  
  event.respondWith(
    (async () => {
      const cacheKey = getCacheKey(url)
      const cache = await caches.open(AVATAR_CACHE_NAME)
      
      // 1. 先尝试从缓存获取
      const cachedResponse = await cache.match(cacheKey)
      
      if (cachedResponse) {
        // 缓存命中，立即返回
        console.log('[SW] 头像缓存命中:', cacheKey)
        
        // 后台更新缓存（如果网络可用）
        event.waitUntil(
          fetch(event.request).then(async (networkResponse) => {
            if (networkResponse.ok) {
              await cache.put(cacheKey, networkResponse.clone())
              console.log('[SW] 头像缓存已更新:', cacheKey)
            }
          }).catch(() => {
            // 网络失败，使用缓存也没关系
          })
        )
        
        return cachedResponse
      }
      
      // 2. 缓存未命中，从网络获取
      try {
        const networkResponse = await fetch(event.request)
        
        if (networkResponse.ok) {
          // 存入缓存（使用去掉参数的版本作为key）
          await cache.put(cacheKey, networkResponse.clone())
          console.log('[SW] 头像已缓存:', cacheKey)
        }
        
        return networkResponse
      } catch (error) {
        console.error('[SW] 头像获取失败:', error)
        // 返回一个默认头像或错误响应
        return new Response('头像加载失败', { status: 503 })
      }
    })()
  )
})

// 定期清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.open(AVATAR_CACHE_NAME).then(cache => {
      // 清理超过30天的缓存
      // 实际由浏览器根据缓存配额自动管理
      console.log('[SW] 头像缓存已激活')
    })
  )
})

// 清理所有头像缓存（供前端调用）
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_AVATAR_CACHE') {
    caches.delete(AVATAR_CACHE_NAME).then(() => {
      console.log('[SW] 头像缓存已清除')
      event.ports[0].postMessage({ success: true })
    })
  }
})

console.log('[SW] 自定义 Service Worker 已加载（含头像缓存）')
