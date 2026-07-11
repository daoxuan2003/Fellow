/**
 * Web Push 通知管理
 * 
 * iOS PWA 支持原生通知（iOS 16.4+）
 * 需要先请求用户权限，然后订阅 Push Service
 */

import { CONFIG } from '../utils/config.js'
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('Notification')

// VAPID 公钥（从后端获取）
let VAPID_PUBLIC_KEY = ''

/**
 * 从后端获取 VAPID 公钥
 */
export async function getVapidPublicKey() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/vapid-public-key`)
    const data = await res.json()
    if (data.success) {
      VAPID_PUBLIC_KEY = data.publicKey
      return data.publicKey
    }
  } catch (e) {
    logger.error('获取公钥失败', e)
  }
  return null
}

/**
 * 检查浏览器是否支持通知
 */
export function isNotificationSupported() {
  const hasNotification = 'Notification' in window
  const hasServiceWorker = 'serviceWorker' in navigator
  const hasPushManager = 'PushManager' in window
  
  logger.debug('支持检测', {
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
    logger.debug('浏览器不支持通知')
    return false
  }

  try {
    logger.debug('调用 requestPermission')
    const permission = await Notification.requestPermission()
    logger.debug('用户选择', permission)
    return permission === 'granted'
  } catch (e) {
    logger.error('请求权限失败', e)
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
    // 确保有公钥
    if (!VAPID_PUBLIC_KEY) {
      await getVapidPublicKey()
      if (!VAPID_PUBLIC_KEY) {
        return { success: false, error: '无法获取服务器公钥' }
      }
    }

    // 先检查 Service Worker 状态
    let registration = null
    
    // 如果已有 registration，直接使用
    if (navigator.serviceWorker.controller) {
      registration = await navigator.serviceWorker.ready
    } else {
      // 等待 Service Worker 安装完成（最长10秒）
      logger.debug('等待 Service Worker 安装')
      registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker 安装超时，请刷新页面后重试')), 10000)
        )
      ])
    }
    
    if (!registration) {
      return { success: false, error: 'Service Worker 未注册' }
    }
    
    logger.debug('Service Worker 就绪', { scope: registration.scope })
    
    // 检查是否已订阅
    let subscription = await registration.pushManager.getSubscription()
    
    if (subscription) {
      logger.debug('已有订阅，准备重新订阅', subscription)
      // 取消旧订阅，重新订阅（避免过期问题）
      await subscription.unsubscribe()
      logger.debug('已取消旧订阅')
    }

    logger.debug('正在订阅 Push')

    // 新建订阅
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      })
    } catch (subscribeError) {
      logger.error('subscribe 失败', subscribeError)
      
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

    logger.debug('Push 订阅成功', subscription)
    
    // 将订阅信息发送到后端
    try {
      await sendSubscriptionToServer(subscription)
      logger.debug('订阅信息已保存到服务器')
    } catch (serverError) {
      logger.error('保存到服务器失败', serverError)
      try {
        await subscription.unsubscribe()
      } catch (unsubscribeError) {
        logger.error('保存失败后撤销订阅失败', unsubscribeError)
      }
      return { success: false, error: '推送服务保存失败，请稍后重试' }
    }
    
    return { success: true, subscription }
  } catch (e) {
    logger.error('Push 订阅失败', e)
    if (e.message?.includes('超时')) {
      return { success: false, error: e.message }
    }
    return { success: false, error: '订阅失败: ' + (e.message || '未知错误') }
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
      logger.debug('Push 已取消订阅')
      
      // 通知后端删除订阅
      await deleteSubscriptionFromServer(subscription)
    }
  } catch (e) {
    logger.error('取消订阅失败', e)
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
      icon: '/heart.svg',
      badge: '/heart.svg',
      ...options
    })
  } catch (e) {
    logger.error('显示通知失败', e)
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
    logger.error('发送订阅到服务器失败', e)
    throw e
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
    logger.error('删除订阅失败', e)
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
