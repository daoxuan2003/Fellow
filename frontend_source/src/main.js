import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// ============================================
// 版本检测与强制更新
// ============================================
const APP_VERSION = '1.0.0'
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
    
    // 3. 强制刷新（true = 从服务器重新加载，不使用缓存）
    window.location.reload(true)
  } catch (e) {
    console.error('[Update] 更新失败:', e)
    isUpdating = false
    alert('更新失败，请手动刷新页面')
  }
}

async function checkUpdate() {
  try {
    // 加时间戳防止缓存
    const res = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    })
    
    if (!res.ok) throw new Error('获取版本失败')
    
    const data = await res.json()
    console.log('[Update] 服务器版本:', data.version, '本地版本:', APP_VERSION)
    
    if (data.version !== APP_VERSION) {
      console.log('[Update] 发现新版本:', data.version)
      
      // 显示更新提示（可选，或者直接强制更新）
      const confirmed = confirm(`发现新版本 ${data.version}，是否立即更新？`)
      if (confirmed) {
        forceUpdate()
      }
    }
  } catch (e) {
    console.error('[Update] 检查更新失败:', e)
  }
}

// 页面加载后检查更新
if (import.meta.env.PROD) {
  // 延迟3秒检查，避免影响首屏加载
  setTimeout(checkUpdate, 3000)
  // 每5分钟检查一次
  setInterval(checkUpdate, 5 * 60 * 1000)
}

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')