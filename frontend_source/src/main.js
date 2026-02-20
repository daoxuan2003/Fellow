import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'

// ============================================
// 版本检测与强制更新
// ============================================
const VERSION_KEY = 'app_version'
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
    
    // 3. 保存新版本号到 localStorage
    const res = await fetch('/version.json', { cache: 'no-store' })
    const data = await res.json()
    localStorage.setItem(VERSION_KEY, data.version)
    
    // 4. 强制刷新
    window.location.reload(true)
  } catch (e) {
    console.error('[Update] 更新失败:', e)
    isUpdating = false
    alert('更新失败，请手动刷新页面')
  }
}

async function checkUpdate() {
  try {
    // 获取服务器最新版本
    const res = await fetch('/version.json', { cache: 'no-store' })
    if (!res.ok) throw new Error('获取版本失败')
    
    const data = await res.json()
    const serverVersion = data.version
    
    // 获取本地保存的版本
    const localVersion = localStorage.getItem(VERSION_KEY) || ''
    
    console.log('[Update] 本地版本:', localVersion, '服务器版本:', serverVersion)
    
    // 首次使用，保存版本
    if (!localVersion) {
      localStorage.setItem(VERSION_KEY, serverVersion)
      return
    }
    
    // 版本不一致，提示更新
    if (serverVersion !== localVersion) {
      console.log(`[Update] 发现新版本: ${localVersion} -> ${serverVersion}`)
      
      const confirmed = confirm(`发现新版本 ${serverVersion}，是否立即更新？`)
      if (confirmed) {
        forceUpdate()
      }
    }
  } catch (e) {
    console.error('[Update] 检查更新失败:', e)
  }
}

// 创建 Vue 应用
const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.mount('#app')

// 生产环境检测更新
if (import.meta.env.PROD) {
  // 页面加载后检测
  setTimeout(checkUpdate, 3000)
  // 每5分钟检测一次
  setInterval(checkUpdate, 5 * 60 * 1000)
}
