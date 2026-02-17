/**
 * Web Push 通知管理
 * 
 * iOS PWA 支持原生通知（iOS 16.4+）
 * 需要先请求用户权限，然后订阅 Push Service
 */

import CONFIG from '../config.js'

/**
 * VAPID 公钥 - 用于浏览器订阅 Push 服务
 * 
 * VAPID 密钥对（公钥 + 私钥）的作用：
 * - 公钥（前端）：浏览器用它向推送服务器订阅，标识你的应用
 * - 私钥（后端）：发送推送通知时签名，证明消息来自你的服务器
 * 
 * 配对原理：推送服务器用公钥验证私钥签名，确保只有你的服务器能发通知
 * 
 * 注意：电脑浏览器在本地开发时可能不支持 Push（需要 HTTPS 或特定配置）
 */
const VAPID_PUBLIC_KEY = 'BD21mnBYXEjhCtTn_DlP7jWceQNyUpBvMWxNR6tfn79jxxZOR8cI-B5TkWEWAJXIVcLKcZRlU-PfHBkxEmPFh_U'

/**
 * 检查浏览器是否支持通知
 */
export function isNotificationSupported() {
  const hasNotification = 'Notification' in window
  const hasServiceWorker = 'serviceWorker' in navigator
  const hasPushManager = 'PushManager' in window
  
  console.log('[Notification] 支持检测:', {
    Notification: hasNotification,
    ServiceWorker: hasServiceWorker,
    PushManager: hasPushManager,
    isSecureContext: window.isSecureContext,
    protocol: window.location.protocol
  })
  
  return hasNotification && hasServiceWorker && hasPushManager
}

/**
 * 获取当前通知权限状态
 * @returns {'granted' | 'denied' | 'default'} 
 */
export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

/**
 * 请求通知权限
 * @returns {Promise<boolean>} 是否获得权限
 */
export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.log('[Notification] 浏览器不支持通知')
    return false
  }

  try {
    console.log('[Notification] 调用 requestPermission()...')
    const permission = await Notification.requestPermission()
    console.log('[Notification] 用户选择:', permission)
    return permission === 'granted'
  } catch (e) {
    console.error('[Notification] 请求权限失败:', e.name, e.message)
    return false
  }
}

/**
 * 订阅 Push 服务（用于接收服务器推送）
 * @returns {Promise<{success: boolean, subscription?: PushSubscription, error?: string}>}
 */
export async function subscribePush() {
  if (!isNotificationSupported()) {
    return { success: false, error: '浏览器不支持 Push 通知' }
  }

  try {
    const registration = await navigator.serviceWorker.ready
    
    // 检查是否已订阅
    let subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      console.log('[Notification] 已订阅 Push:', subscription.endpoint)
      return { success: true, subscription }
    }

    console.log('[Notification] 正在订阅 Push...')

    // 新建订阅
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    } catch (subscribeError) {
      console.error('[Notification] subscribe() 失败:', subscribeError.name, subscribeError.message)
      
      // 返回具体错误原因
      if (subscribeError.name === 'NotAllowedError') {
        return { success: false, error: '用户拒绝了推送权限' }
      } else if (subscribeError.name === 'AbortError') {
        return { success: false, error: '网络连接失败，请检查网络' }
      } else if (subscribeError.message?.includes('applicationServerKey')) {
        return { success: false, error: '服务器配置错误 (VAPID Key 无效)' }
      } else {
        return { success: false, error: `订阅失败: ${subscribeError.message}` }
      }
    }

    console.log('[Notification] Push 订阅成功:', subscription.endpoint)
    
    // 将订阅信息发送到后端
    try {
      await sendSubscriptionToServer(subscription)
      console.log('[Notification] 订阅信息已保存到服务器')
    } catch (serverError) {
      console.error('[Notification] 保存到服务器失败:', serverError)
      // 返回警告，但订阅本身是成功的
    }
    
    return { success: true, subscription }
  } catch (e) {
    console.error('[Notification] Push 订阅失败:', e)
    return { success: false, error: '未知错误，请刷新重试' }
  }
}

/**
 * 取消 Push 订阅
 */
export async function unsubscribePush() {
  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      await subscription.unsubscribe()
      console.log('[Notification] Push 已取消订阅')
      
      // 通知后端删除订阅
      await deleteSubscriptionFromServer(subscription)
    }
  } catch (e) {
    console.error('[Notification] 取消订阅失败:', e)
  }
}

/**
 * 发送本地通知（测试用或即时通知）
 * @param {string} title 标题
 * @param {object} options 选项
 */
export async function showLocalNotification(title, options = {}) {
  if (!isNotificationSupported()) return
  if (Notification.permission !== 'granted') return

  try {
    const registration = await navigator.serviceWorker.ready
    await registration.showNotification(title, {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      ...options
    })
  } catch (e) {
    console.error('[Notification] 显示通知失败:', e)
  }
}

/**
 * 将订阅信息发送到后端
 */
async function sendSubscriptionToServer(subscription) {
  try {
    const res = await fetch(`${CONFIG.API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    })
    
    if (!res.ok) {
      throw new Error('保存订阅失败')
    }
  } catch (e) {
    console.error('[Notification] 发送订阅到服务器失败:', e)
  }
}

/**
 * 从后端删除订阅
 */
async function deleteSubscriptionFromServer(subscription) {
  try {
    await fetch(`${CONFIG.API_URL}/notifications/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })
  } catch (e) {
    console.error('[Notification] 删除订阅失败:', e)
  }
}

/**
 * Base64 转 Uint8Array（用于 VAPID key）
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

/**
 * 获取订阅状态（用于 UI 显示）
 */
export async function getSubscriptionStatus() {
  if (!isNotificationSupported()) {
    return { supported: false, permission: 'denied', subscribed: false }
  }

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  return {
    supported: true,
    permission: Notification.permission,
    subscribed: !!subscription
  }
}
