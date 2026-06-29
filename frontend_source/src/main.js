import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './style.css'
import { getVersion, getChangelog } from './utils/version.js'

if (import.meta.env.PROD) {
  const noop = () => {}
  console.debug = noop
  console.info = noop
  console.log = noop
}

// ============================================
// 版本检测与强制更新
// ============================================
let isUpdating = false

// 创建更新弹窗（美观版）
function createUpdateDialog(version, onConfirm, onCancel) {
  // 移除已存在的弹窗
  const existing = document.getElementById('update-dialog-overlay')
  if (existing) existing.remove()

  const overlay = document.createElement('div')
  overlay.id = 'update-dialog-overlay'
  overlay.innerHTML = `
    <div class="update-dialog">
      <div class="update-dialog-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <h3 class="update-dialog-title">发现新版本</h3>
      <p class="update-dialog-version">v${version}</p>
      <p class="update-dialog-desc">新版本已准备好，点击更新获取最新功能和优化~</p>
      <div class="update-dialog-buttons">
        <button class="update-btn-cancel">稍后再说</button>
        <button class="update-btn-confirm">立即更新</button>
      </div>
    </div>
  `

  // 添加样式
  const style = document.createElement('style')
  style.textContent = `
    #update-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .update-dialog {
      background: white;
      border-radius: 20px;
      padding: 32px 24px;
      width: 85%;
      max-width: 320px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .update-dialog-icon {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      color: white;
    }
    .update-dialog-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin: 0 0 8px;
    }
    .update-dialog-version {
      font-size: 14px;
      color: #667eea;
      font-weight: 500;
      margin: 0 0 16px;
      background: #f0f4ff;
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
    }
    .update-dialog-desc {
      font-size: 14px;
      color: #666;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .update-dialog-buttons {
      display: flex;
      gap: 12px;
    }
    .update-dialog-buttons button {
      flex: 1;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    .update-btn-cancel {
      background: #f5f5f5;
      color: #666;
    }
    .update-btn-cancel:hover {
      background: #eee;
    }
    .update-btn-confirm {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .update-btn-confirm:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .update-btn-confirm:active {
      transform: translateY(0);
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(overlay)

  // 绑定事件
  overlay.querySelector('.update-btn-confirm').addEventListener('click', () => {
    overlay.remove()
    onConfirm()
  })
  overlay.querySelector('.update-btn-cancel').addEventListener('click', () => {
    overlay.remove()
    onCancel()
  })
}

// 创建更新日志弹窗
async function createChangelogDialog() {
  const changelog = await getChangelog()
  const currentVersion = localStorage.getItem('app_version') || ''
  const currentLog = changelog.find(log => log.version === currentVersion) || changelog[0]

  if (!currentLog) return

  const overlay = document.createElement('div')
  overlay.id = 'changelog-dialog-overlay'
  overlay.innerHTML = `
    <div class="changelog-dialog">
      <div class="changelog-header">
        <div class="changelog-header-icon">🎉</div>
        <h3>更新成功</h3>
        <p class="changelog-version">v${currentLog.version}</p>
        <button class="changelog-close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="changelog-content">
        <div class="changelog-section">
          <h4>本次更新内容</h4>
          <ul>
            ${currentLog.changes.map(change => `<li>${change}</li>`).join('')}
          </ul>
        </div>
        <div class="changelog-date">发布日期：${currentLog.date}</div>
      </div>
      <div class="changelog-footer">
        <button class="changelog-btn">开始使用</button>
        <p class="changelog-hint">更多日志请前往「我的-关于共赴-版本更新日志」中查看</p>
      </div>
    </div>
  `

  // 添加样式
  const style = document.createElement('style')
  style.textContent = `
    #changelog-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    }
    .changelog-dialog {
      background: white;
      border-radius: 20px;
      width: 90%;
      max-width: 360px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }
    .changelog-header {
      position: relative;
      padding: 24px 24px 16px;
      text-align: center;
      border-bottom: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .changelog-header-icon {
      font-size: 48px;
      margin-bottom: 8px;
    }
    .changelog-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin: 0 0 4px;
    }
    .changelog-version {
      font-size: 13px;
      color: #667eea;
      font-weight: 500;
      margin: 0;
      background: #f0f4ff;
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
    }
    .changelog-close {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 32px;
      height: 32px;
      border: none;
      background: #f5f5f5;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      transition: all 0.2s;
    }
    .changelog-close:hover {
      background: #eee;
      color: #333;
    }
    .changelog-content {
      padding: 20px 24px;
      overflow-y: auto;
      flex: 1;
    }
    .changelog-section h4 {
      font-size: 14px;
      color: #333;
      margin: 0 0 12px;
      font-weight: 600;
    }
    .changelog-section ul {
      margin: 0;
      padding-left: 18px;
    }
    .changelog-section li {
      font-size: 14px;
      color: #555;
      line-height: 1.8;
      margin-bottom: 4px;
    }
    .changelog-date {
      font-size: 12px;
      color: #999;
      margin-top: 16px;
      text-align: center;
    }
    .changelog-footer {
      padding: 16px 24px 24px;
      border-top: 1px solid #f0f0f0;
      flex-shrink: 0;
    }
    .changelog-btn {
      width: 100%;
      padding: 14px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .changelog-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .changelog-btn:active {
      transform: translateY(0);
    }
    .changelog-hint {
      font-size: 12px;
      color: #999;
      text-align: center;
      margin: 12px 0 0;
      line-height: 1.5;
    }
  `
  document.head.appendChild(style)
  document.body.appendChild(overlay)

  // 绑定关闭事件
  const closeDialog = () => overlay.remove()
  overlay.querySelector('.changelog-close').addEventListener('click', closeDialog)
  overlay.querySelector('.changelog-btn').addEventListener('click', closeDialog)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeDialog()
  })
}

function showUpdateFailureNotice() {
  const existing = document.getElementById('update-failure-notice')
  if (existing) existing.remove()

  const notice = document.createElement('div')
  notice.id = 'update-failure-notice'
  notice.textContent = '更新失败，请手动刷新页面'
  notice.style.cssText = `
    position: fixed;
    left: max(18px, env(safe-area-inset-left));
    right: max(18px, env(safe-area-inset-right));
    bottom: calc(22px + env(safe-area-inset-bottom));
    z-index: 10000;
    max-width: 440px;
    margin: 0 auto;
    padding: 12px 16px;
    border-radius: 12px;
    background: rgba(190, 64, 58, 0.94);
    color: #fff;
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
    font-size: 14px;
    line-height: 1.45;
    text-align: center;
    backdrop-filter: blur(14px);
    pointer-events: none;
  `
  document.body.appendChild(notice)
  window.setTimeout(() => notice.remove(), 4200)
}

async function forceUpdate() {
  if (isUpdating) return
  isUpdating = true
  
  console.log('[Update] 开始强制更新...')
  
  try {
    // 获取新版本号并标记即将更新
    const res = await fetch('/version.json', { cache: 'no-store' })
    const data = await res.json()
    localStorage.setItem('app_version', data.version)
    localStorage.setItem('just_updated', 'true')
    
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
    showUpdateFailureNotice()
  }
}

async function checkUpdate() {
  try {
    // 从本地存储获取上次记录的版本
    const cachedVersion = localStorage.getItem('app_version')
    // 直接获取最新版本（不依赖缓存）
    const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) {
      console.warn('[Update] 获取版本文件失败')
      return
    }
    const data = await res.json()
    const latestVersion = data.version
    
    console.log('[Update] 服务器版本:', latestVersion, '本地版本:', cachedVersion)
    
    // 首次运行或版本变化时更新本地记录
    if (!cachedVersion) {
      localStorage.setItem('app_version', latestVersion)
    } else if (latestVersion !== cachedVersion) {
      console.log('[Update] 发现新版本:', latestVersion)
      
      // 显示美观的更新弹窗
      createUpdateDialog(latestVersion, 
        () => forceUpdate(),
        () => console.log('[Update] 用户取消更新')
      )
    }
  } catch (e) {
    console.error('[Update] 检查更新失败:', e)
  }
}

// 检查是否需要显示更新日志（刚更新完）
async function checkJustUpdated() {
  const justUpdated = localStorage.getItem('just_updated')
  if (justUpdated === 'true') {
    localStorage.removeItem('just_updated')
    // 延迟一点显示，等页面完全加载
    setTimeout(() => {
      createChangelogDialog()
    }, 500)
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
  // 页面加载后检测是否刚更新完
  checkJustUpdated()
  
  // 页面加载后检测更新
  setTimeout(checkUpdate, 3000)
  // 每5分钟检测一次
  setInterval(checkUpdate, 5 * 60 * 1000)
}
