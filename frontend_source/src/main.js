import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { getVersion, getChangelog } from './utils/version.js'

// ============================================
// 版本检测与强制更新
// ============================================
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
    localStorage.setItem('app_version', data.version)
    
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
    // 从本地存储获取上次记录的版本
    const cachedVersion = localStorage.getItem('app_version')
    // 获取最新版本（从 version.json）
    const latestVersion = await getVersion()
    
    console.log('[Update] 服务器版本:', latestVersion, '本地版本:', cachedVersion)
    
    // 首次运行或版本变化时更新本地记录
    if (!cachedVersion) {
      localStorage.setItem('app_version', latestVersion)
    } else if (latestVersion !== cachedVersion) {
      console.log('[Update] 发现新版本:', latestVersion)
      
      // 显示更新提示
      const confirmed = confirm(`发现新版本 ${latestVersion}，是否立即更新？`)
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
