import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// ============================================
// 版本检测与强制更新（动态读取 version.json）
// ============================================
let APP_VERSION = ''
let isUpdating = false

async function forceUpdate() {
  if (isUpdating) return
  isUpdating = true
  
  console.log('[Update] 开始强制更新...')
  
  try {
    // 1. 注销所有 Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      await Promise.all(registrations.map(reg => reg.unregister()))
      console.log('[Update] Service Worker 已注销')
    }
    
    // 2. 清空所有缓存
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map(name => caches.delete(name)))
      console.log('[Update] 缓存已清空')
    }
    
    // 3. 强制刷新
    window.location.reload(true)
  } catch (e) {
    console.error('[Update] 更新失败:', e)
    isUpdating = false
    alert('更新失败，请手动刷新页面')
  }
}

async function checkUpdate() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    
    if (!res.ok) throw new Error('获取版本失败')
    
    const data = await res.json()
    
    // 首次运行，记录版本
    if (!APP_VERSION) {
      APP_VERSION = data.version
      console.log('[Update] 当前版本:', APP_VERSION)
      return
    }
    
    // 检测版本变化
    if (data.version !== APP_VERSION) {
      console.log(`[Update] 发现新版本: ${APP_VERSION} -> ${data.version}`)
      
      const confirmed = confirm(`发现新版本 ${data.version}，是否立即更新？`)
      if (confirmed) {
        forceUpdate()
      }
    }
  } catch (e) {
    console.error('[Update] 检查更新失败:', e)
  }
}

// 初始化应用
async function initApp() {
  // 先获取当前版本
  try {
    const res = await fetch('/version.json', { cache: 'no-store' })
    const data = await res.json()
    APP_VERSION = data.version
    console.log('[App] 版本:', APP_VERSION)
  } catch (e) {
    console.error('[App] 获取版本失败:', e)
    APP_VERSION = 'unknown'
  }
  
  // 创建 Vue 应用
  const app = createApp(App)
  const pinia = createPinia()
  app.use(pinia)
  app.use(router)
  app.mount('#app')
  
  // 生产环境启动检测
  if (import.meta.env.PROD) {
    setTimeout(() => {
      checkUpdate() // 首次检测
      setInterval(checkUpdate, 5 * 60 * 1000) // 每5分钟检测
    }, 3000)
  }
}

initApp()
