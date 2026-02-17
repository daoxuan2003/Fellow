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

console.log('[SW] 自定义 Service Worker 已加载')
