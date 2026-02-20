<template>
  <div class="profile-page">
    <!-- 背景 -->
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>
    
    <!-- 主应用 -->
    <div class="app">
      <!-- 编辑模式标签 -->
      <div class="edit-mode-badge" :class="{ show: isEditing }">编辑模式</div>
      
      <!-- 顶部导航 -->
      <header class="header">
        <div class="header-back" @click="goBack">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </div>
        <div class="header-title">个人资料</div>
        <div class="header-actions">
          <button v-if="!isEditing" class="header-edit-btn" @click="startEdit">编辑</button>
          <template v-else>
            <button class="header-edit-btn cancel" @click="cancelEdit">取消</button>
            <button class="header-edit-btn save" @click="saveProfile" :disabled="saving">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </template>
        </div>
      </header>
      
      <!-- 主内容 -->
      <main class="main">
        <!-- 头像区域 -->
        <div class="profile-header">
          <div class="avatar-wrapper">
            <div class="avatar-large" @click="selectAvatar">
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像" crossorigin="anonymous">
              <span v-else>{{ editForm.nickname ? editForm.nickname.charAt(0).toUpperCase() : '?' }}</span>
            </div>
            <div class="avatar-edit" @click="selectAvatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <input type="file" ref="avatarInput" accept="image/*" style="display: none" @change="handleAvatarChange">
          </div>
          <div class="profile-name">{{ user.nickname || '加载中...' }}</div>
          <div class="profile-id">配对码: {{ user.pairCode || '...' }}</div>
        </div>
        
        <!-- 基本信息 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            基本信息
          </div>
          
          <div class="form-item">
            <label class="form-label">昵称</label>
            <input type="text" class="form-input" v-model="editForm.nickname" placeholder="输入昵称" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">个人简介</label>
            <input type="text" class="form-input" v-model="editForm.bio" placeholder="一句话介绍自己" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">性别</label>
            <div class="gender-select">
              <div class="gender-option" :class="{ active: editForm.gender === 'male', disabled: !isEditing }" @click="isEditing && (editForm.gender = 'male')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 16v-4M12 8h.01"/>
                </svg>
                男生
              </div>
              <div class="gender-option" :class="{ active: editForm.gender === 'female', disabled: !isEditing }" @click="isEditing && (editForm.gender = 'female')">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                女生
              </div>
            </div>
          </div>
        </div>
        
        <!-- 账号信息 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            账号信息
          </div>
          
          <div class="form-item">
            <label class="form-label">邮箱 / 手机号</label>
            <input type="text" class="form-input" v-model="editForm.account" placeholder="用于登录" readonly>
          </div>
          
          <div class="form-item" v-if="isEditing">
            <label class="form-label">修改密码</label>
            <input type="password" class="form-input" v-model="editForm.newPassword" placeholder="不修改请留空">
          </div>
        </div>
        
        <!-- 恋爱信息 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            恋爱信息
          </div>
          
          <div class="form-item" v-if="user.partnerId">
            <label class="form-label">相爱纪念日</label>
            <WheelPicker v-model="editForm.loveDate" :editable="isEditing" :max-date="today" />
          </div>
          
          <div class="form-item" v-else>
            <label class="form-label">相爱纪念日</label>
            <div class="form-input" style="color: var(--text-tertiary); cursor: not-allowed;">
              绑定情侣后即可设置
            </div>
          </div>
          
          <div class="form-item">
            <label class="form-label">对TA的备注</label>
            <input type="text" class="form-input" v-model="editForm.partnerNote" placeholder="给TA起个专属昵称" :readonly="!isEditing">
          </div>
          
          <div class="form-item">
            <label class="form-label">我的生日</label>
            <WheelPicker v-model="editForm.birthday" :editable="isEditing" />
          </div>
          
          <div class="form-item" v-if="user.partnerId">
            <label class="form-label">对方的生日</label>
            <div class="form-input" style="color: var(--text-tertiary); cursor: not-allowed;">
              {{ partnerBirthday || '对方未设置生日' }}
            </div>
          </div>
        </div>
        
        <!-- 设置 -->
        <div class="card">
          <div class="card-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            设置
          </div>
          
          <div class="setting-item">
            <div class="setting-left">
              <div class="setting-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div class="setting-info">
                <h4>开启通知</h4>
                <p>{{ notificationStatusText }}</p>
              </div>
            </div>
            <div class="switch" :class="{ active: settings.notifications }" @click="toggleNotifications"></div>
          </div>
          
          <div class="setting-item" @click="showAbout = true">
            <div class="setting-left">
              <div class="setting-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="16" x2="12" y2="12"/>
                  <line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
              </div>
              <div class="setting-info">
                <h4>关于共赴</h4>
                <p>{{ appVersion }}</p>
              </div>
            </div>
            <div class="setting-right">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          </div>
        </div>
        
        <!-- 退出登录 -->
        <div class="logout-section">
          <button class="btn-logout" @click="confirmLogout">
            退出登录
          </button>
          
          <!-- 解绑按钮 - 低调设计，仅在已绑定时显示 -->
          <button 
            v-if="user.inviteStatus === 'bound'" 
            class="btn-unbind" 
            @click="confirmUnbind"
          >
            解除绑定关系
          </button>
        </div>
      </main>
      
      <!-- Toast -->
      <div class="toast" :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }">
        <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
      
      <!-- 确认对话框 -->
      <div class="confirm-overlay" :class="{ show: confirm.show }" @click.self="cancelConfirm">
        <div class="confirm-dialog">
          <div class="confirm-title">{{ confirm.title }}</div>
          <div class="confirm-message">{{ confirm.message }}</div>
          <div class="confirm-actions">
            <button class="confirm-btn cancel" @click="cancelConfirm">{{ confirm.cancelText }}</button>
            <button class="confirm-btn confirm" :class="{ danger: confirm.isDanger }" @click="doConfirm">{{ confirm.confirmText }}</button>
          </div>
        </div>
      </div>
      
      <!-- 头像裁剪模态框 -->
      <div class="crop-overlay" :class="{ show: cropper.show }" v-if="cropper.show">
        <div class="crop-header">
          <button class="crop-btn" @click="closeCropper">取消</button>
          <span class="crop-title">调整头像</span>
          <button class="crop-btn confirm" @click="confirmCrop" :disabled="cropper.loading">
            <span v-if="cropper.loading" class="spinner"></span>
            <span v-else>确认</span>
          </button>
        </div>
        <div class="crop-preview-area">
          <div class="crop-image-container">
            <img ref="cropImage" class="crop-image" :src="cropper.imageUrl" alt="裁剪图片">
          </div>
        </div>
        <div class="crop-footer">拖动调整，双指缩放，将在圆形区域内裁剪</div>
      </div>
      
      <!-- 关于共赴弹窗 -->
      <div class="about-overlay" :class="{ show: showAbout }" @click.self="showAbout = false">
        <div class="about-dialog">
          <div class="about-header">
            <h3>关于共赴</h3>
            <button class="about-close" @click="showAbout = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <div class="about-content">
            <div class="about-brand">
              <h2>💕 共赴</h2>
              <p class="about-version">版本 {{ appVersion }}</p>
              <p class="about-slogan">两个人的私密空间</p>
            </div>
            
            <div class="about-menu">
              <div class="about-item" @click="loadVersionInfo(); showChangelog = true">
                <span>版本更新日志</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="showToast('功能开发中')">
                <span>用户协议</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="showToast('功能开发中')">
                <span>隐私政策</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
              <div class="about-item" @click="showToast('功能开发中')">
                <span>联系我们</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>
            </div>
            
            <div class="about-footer">
              <a href="https://beian.miit.gov.cn/" target="_blank" class="about-icp">吉ICP备2026000987号-1</a>
              <p class="about-copyright">2026 金道炫</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 版本更新日志弹窗 -->
      <div class="about-overlay" :class="{ show: showChangelog }" @click.self="showChangelog = false">
        <div class="about-dialog" style="max-height: 70vh; overflow-y: auto;">
          <div class="about-header">
            <h3>版本更新日志</h3>
            <button class="about-close" @click="showChangelog = false">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          <div class="about-content">
            <div v-if="changelogLoading" class="changelog-loading">加载中...</div>
            <template v-else>
              <div v-for="(log, index) in changelog" :key="index" class="changelog-item">
                <h4>v{{ log.version }} <span class="changelog-date">{{ log.date }}</span></h4>
                <ul>
                  <li v-for="(change, idx) in log.changes" :key="idx">{{ change }}</li>
                </ul>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航 -->
    <BottomNav @toast="showToast" />
  </div>
</template>

<script setup>
// 定义组件名称，用于 keep-alive 匹配
defineOptions({ name: 'Profile' })
import { ref, reactive, computed, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'

import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { useUserStore } from '../stores/user.js'
import { clearAvatarCache } from '../utils/cache.js'
import { 
  isNotificationSupported, 
  requestNotificationPermission,
  getNotificationPermission,
  subscribePush,
  unsubscribePush,
  getSubscriptionStatus
} from '../utils/notification.js'
import BottomNav from '../components/BottomNav.vue'
import WheelPicker from '../components/WheelPicker.vue'
import Cropper from 'cropperjs'
import 'cropperjs/dist/cropper.css'

const router = useRouter()
const { onMessage } = useWebSocket()
const userStore = useUserStore()
const avatarInput = ref(null)
const cropImage = ref(null)
let cropperInstance = null
let unsubscribeWS = null

// 初始化用户数据（切换账号时必须清空）
const user = reactive({
  nickname: '',
  pairCode: '',
  partnerId: null,
  inviteStatus: 'idle',
  birthday: null,
  avatar: '',
  // 编辑模式需要的字段
  bio: '',
  gender: '',
  account: '',
  anniversary: '',  // 纪念日（恋爱日期）
  partnerNote: ''
})

const partnerBirthday = ref('')

// 初始化表单（切换账号时必须清空）
const editForm = reactive({
  nickname: '',
  bio: '',
  gender: '',
  account: '',
  newPassword: '',
  loveDate: '',
  partnerNote: '',
  birthday: '',
  avatar: ''
})

// 标记是否已初始化（防止显示旧数据）
const isInitialized = ref(false)

// 清空所有用户数据
const clearUserData = () => {
  Object.assign(user, {
    nickname: '',
    pairCode: '',
    partnerId: null,
    inviteStatus: 'idle',
    birthday: null,
    avatar: '',
    bio: '',
    gender: '',
    account: '',
    anniversary: '',
    partnerNote: ''
  })
  
  Object.assign(editForm, {
    nickname: '',
    bio: '',
    gender: '',
    account: '',
    newPassword: '',
    loveDate: '',
    partnerNote: '',
    birthday: '',
    avatar: ''
  })
  
  partnerBirthday.value = ''
  isInitialized.value = false
}

// 初始化数据函数
const initUserData = () => {
  const storeUser = userStore.currentUser
  
  // 如果 store 中没有用户数据，不初始化（保持空状态）
  if (!storeUser) {
    clearUserData()
    return
  }
  
  const initialUser = {
    nickname: storeUser.nickname || '',
    pairCode: storeUser.pairCode || '',
    partnerId: storeUser.partnerId || null,
    inviteStatus: storeUser.inviteStatus || (storeUser.connected ? 'bound' : 'idle'),
    birthday: storeUser.birthday || null,
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    anniversary: storeUser.anniversary || '',
    partnerNote: storeUser.partnerNote || ''
  }
  
  Object.assign(user, initialUser)
  
  Object.assign(editForm, {
    nickname: storeUser.nickname || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    newPassword: '',
    loveDate: storeUser.anniversary ? storeUser.anniversary.split('T')[0] : '',
    partnerNote: storeUser.partnerNote || '',
    birthday: storeUser.birthday ? storeUser.birthday.split('T')[0] : '',
    avatar: storeUser.avatarUrl || storeUser.avatar || ''
  })
  
  // 同步对方的生日
  const storePartner = userStore.currentPartner
  if (storePartner?.birthday) {
    partnerBirthday.value = String(storePartner.birthday).split('T')[0]
  } else {
    partnerBirthday.value = ''
  }
  
  isInitialized.value = true
}

const settings = reactive({
  notifications: false  // 通知总开关
})

const isEditing = ref(false)
const saving = ref(false)

const toast = reactive({
  show: false,
  message: '',
  type: 'success',
  timer: null
})

const confirm = reactive({
  show: false,
  title: '',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  isDanger: false,
  action: null
})

const cropper = reactive({
  show: false,
  imageUrl: '',
  loading: false
})

const showAbout = ref(false)
const showChangelog = ref(false)
const appVersion = ref('1.0.0')
const changelog = ref([])
const changelogLoading = ref(false)

// 从 version.json 加载版本和日志
const loadVersionInfo = async () => {
  changelogLoading.value = true
  try {
    const res = await fetch('/version.json')
    const data = await res.json()
    appVersion.value = data.version || '1.0.0'
    changelog.value = data.changelog || []
  } catch (e) {
    console.error('加载版本信息失败:', e)
  } finally {
    changelogLoading.value = false
  }
}

const today = new Date().toISOString().split('T')[0]

const showToast = (message, type = 'success') => {
  toast.message = message
  toast.type = type
  toast.show = true
  if (toast.timer) clearTimeout(toast.timer)
  toast.timer = setTimeout(() => toast.show = false, 3000)
}

// 通知状态文本
const notificationStatusText = computed(() => {
  if (!isNotificationSupported()) {
    return '当前设备不支持'
  }
  const permission = getNotificationPermission()
  if (permission === 'denied') {
    return '请在系统设置中开启'
  }
  return settings.notifications ? '已开启' : '接收纪念日等提醒'
})

// 切换通知开关
const toggleNotifications = async () => {
  console.log('[Profile] 点击通知开关')
  
  if (!isNotificationSupported()) {
    console.log('[Profile] 不支持通知')
    showToast('当前浏览器不支持通知功能（需要 HTTPS 或 localhost）', 'error')
    return
  }
  
  const permission = getNotificationPermission()
  console.log('[Profile] 当前权限:', permission)
  
  if (permission === 'denied') {
    showToast('请在系统设置中开启通知权限', 'error')
    return
  }
  
  if (!settings.notifications) {
    // 开启通知
    console.log('[Profile] 请求通知权限...')
    const granted = await requestNotificationPermission()
    console.log('[Profile] 权限结果:', granted)
    
    if (!granted) {
      showToast('需要通知权限才能开启', 'error')
      return
    }
    
    // 权限已获取，尝试订阅 Push
    console.log('[Profile] 开始订阅 Push...')
    showToast('正在订阅推送服务...')
    
    const result = await subscribePush()
    console.log('[Profile] 订阅结果:', result)
    
    if (result.success) {
      settings.notifications = true
      saveNotificationSettings(true)  // 保存到 localStorage（按用户）
      showToast('通知已开启')
    } else {
      // Push 订阅失败，显示具体错误原因
      showToast(result.error || '通知订阅失败', 'error')
      settings.notifications = false
      saveNotificationSettings(false)
    }
  } else {
    // 关闭通知
    console.log('[Profile] 关闭通知')
    await unsubscribePush()
    settings.notifications = false
    saveNotificationSettings(false)  // 保存到 localStorage（按用户）
    showToast('通知已关闭')
  }
}

const showConfirm = (options) => {
  confirm.title = options.title
  confirm.message = options.message
  confirm.confirmText = options.confirmText || '确认'
  confirm.cancelText = options.cancelText || '取消'
  confirm.isDanger = options.isDanger || false
  confirm.action = options.action
  confirm.show = true
}

const cancelConfirm = () => {
  confirm.show = false
}

const doConfirm = () => {
  if (confirm.action) confirm.action()
  confirm.show = false
}

const fetchUserInfo = async (force = false) => {
  // 如果不是强制刷新，且数据未过期，则使用缓存
  if (!force && !userStore.isDataStale && userStore.currentUser) {
    console.log('[Profile] 使用缓存数据')
    // 确保数据同步
    syncFromStore()
    return
  }
  
  // 如果已经在加载中，跳过
  if (userStore.isLoading) return
  
  userStore.setLoading(true)
  try {
    const res = await fetch(`${CONFIG.API_URL}/user/profile`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      Object.assign(user, data.user)
      Object.assign(editForm, {
        nickname: data.user.nickname || '',
        bio: data.user.bio || '',
        gender: data.user.gender || '',
        account: data.user.account || '',
        loveDate: data.user.anniversary ? data.user.anniversary.split('T')[0] : '',
        partnerNote: data.user.partnerNote || '',
        birthday: data.user.birthday ? data.user.birthday.split('T')[0] : '',
        avatar: data.user.avatar || ''
      })
      user.inviteStatus = data.user.connected ? 'bound' : 'idle'
      user.birthday = data.user.birthday
      // 获取对方的生日
      if (data.user.partner?.birthday) {
        partnerBirthday.value = data.user.partner.birthday.split('T')[0]
      } else {
        partnerBirthday.value = ''
      }
      // 更新 store
      userStore.updateUserData(data.user, data.user.partner)
    }
  } catch (e) {
    showToast('获取用户信息失败', 'error')
  } finally {
    userStore.setLoading(false)
  }
}

// 从 store 同步数据到本地
const syncFromStore = () => {
  const storeUser = userStore.currentUser
  if (!storeUser) return
  
  Object.assign(user, {
    nickname: storeUser.nickname || '',
    pairCode: storeUser.pairCode || '',
    partnerId: storeUser.partnerId || null,
    inviteStatus: storeUser.inviteStatus || (storeUser.connected ? 'bound' : 'idle'),
    birthday: storeUser.birthday || null,
    avatar: storeUser.avatarUrl || storeUser.avatar || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    anniversary: storeUser.anniversary || '',
    partnerNote: storeUser.partnerNote || ''
  })
  
  Object.assign(editForm, {
    nickname: storeUser.nickname || '',
    bio: storeUser.bio || '',
    gender: storeUser.gender || '',
    account: storeUser.account || '',
    loveDate: storeUser.anniversary ? String(storeUser.anniversary).split('T')[0] : '',
    partnerNote: storeUser.partnerNote || '',
    birthday: storeUser.birthday ? String(storeUser.birthday).split('T')[0] : '',
    avatar: storeUser.avatarUrl || storeUser.avatar || ''
  })
  
  // 同步对方的生日
  const storePartner = userStore.currentPartner
  if (storePartner?.birthday) {
    partnerBirthday.value = String(storePartner.birthday).split('T')[0]
  } else {
    partnerBirthday.value = ''
  }
}

const goBack = () => {
  router.push('/')
}

const startEdit = () => {
  isEditing.value = true
}

const cancelEdit = () => {
  isEditing.value = false
  // 从 user 对象恢复 editForm（user 对象存储的是原始数据）
  editForm.nickname = user.nickname || ''
  editForm.bio = user.bio || ''
  editForm.gender = user.gender || ''
  editForm.newPassword = ''
  // 纪念日存储在 user.anniversary，但 editForm 中使用 loveDate
  editForm.loveDate = user.anniversary ? String(user.anniversary).split('T')[0] : ''
  editForm.partnerNote = user.partnerNote || ''
  editForm.birthday = user.birthday ? String(user.birthday).split('T')[0] : ''
}

const saveProfile = async () => {
  if (!editForm.nickname.trim()) {
    showToast('请输入昵称', 'error')
    return
  }
  saving.value = true
  try {
    const res = await fetch(`${CONFIG.API_URL}/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        name: editForm.nickname,
        gender: editForm.gender,
        bio: editForm.bio,
        anniversary: editForm.loveDate,
        partnerNote: editForm.partnerNote,
        birthday: editForm.birthday
      })
    })
    const data = await res.json()
    if (data.success) {
      Object.assign(user, data.user)
      isEditing.value = false
      showToast('保存成功')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    showToast('保存失败', 'error')
  } finally {
    saving.value = false
  }
}

const selectAvatar = () => {
  avatarInput.value?.click()
}

const handleAvatarChange = (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error')
    return
  }
  
  // 读取文件并打开裁剪模态框
  const reader = new FileReader()
  reader.onload = (e) => {
    cropper.imageUrl = e.target.result
    cropper.show = true
    
    // 等待 DOM 更新后初始化 Cropper
    nextTick(() => {
      if (cropperInstance) {
        cropperInstance.destroy()
      }
      
      cropperInstance = new Cropper(cropImage.value, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: false,
        center: false,
        highlight: false,
        cropBoxMovable: false,
        cropBoxResizable: false,
        toggleDragModeOnDblclick: false,
        background: false
      })
    })
  }
  reader.readAsDataURL(file)
  
  // 清空 input 以便重复选择同一文件
  e.target.value = ''
}

const closeCropper = () => {
  if (cropperInstance) {
    cropperInstance.destroy()
    cropperInstance = null
  }
  cropper.show = false
  cropper.imageUrl = ''
}

const confirmCrop = async () => {
  if (!cropperInstance || cropper.loading) return
  
  cropper.loading = true
  try {
    // 获取裁剪后的画布
    const canvas = cropperInstance.getCroppedCanvas({
      width: 400,
      height: 400,
      fillColor: '#fff'
    })
    
    // 转换为 Blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9)
    })
    
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
    const formData = new FormData()
    formData.append('avatar', file)
    
    const res = await fetch(`${CONFIG.API_URL}/user/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    })
    
    const data = await res.json()
    if (data.success) {
      editForm.avatar = data.avatarUrl
      user.avatar = data.avatarUrl
      // 更新 store 中的头像
      userStore.updateAvatar(data.avatarUrl)
      showToast('头像更新成功')
      closeCropper()
      // 清除头像缓存（后台执行，不阻塞）
      clearAvatarCache().catch(() => {})
    } else {
      showToast(data.message || '上传失败', 'error')
    }
  } catch (e) {
    console.error('裁剪上传失败:', e)
    showToast('上传失败', 'error')
  } finally {
    cropper.loading = false
  }
}

const confirmLogout = () => {
  showConfirm({
    title: '退出登录',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    isDanger: true,
    action: () => {
      // 断开 WebSocket 连接
      const { disconnect } = useWebSocket()
      disconnect()
      userStore.clearUser()
      router.replace('/')
    }
  })
}

const confirmUnbind = () => {
  showConfirm({
    title: '解除绑定关系',
    message: '确定要解除与伴侣的绑定关系吗？此操作不可撤销。',
    confirmText: '解除',
    isDanger: true,
    action: async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/couple/unbind`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const data = await res.json()
        if (data.success) {
          showToast('已解除伴侣关系')
          fetchUserInfo()
        } else {
          showToast(data.message || '解除失败', 'error')
        }
      } catch (e) {
        showToast('解除失败', 'error')
      }
    }
  })
}

// 获取通知设置的 storage key（按用户ID）
const getNotificationSettingsKey = () => {
  const userId = userStore.currentUserId || localStorage.getItem('currentUserId')
  return userId ? `notifications_enabled_${userId}` : null
}

// 加载当前用户的通知设置
const loadNotificationSettings = async () => {
  const settingsKey = getNotificationSettingsKey()
  if (!settingsKey) {
    settings.notifications = false
    return
  }
  
  // 从 localStorage 读取该用户的通知设置
  const savedSetting = localStorage.getItem(settingsKey)
  if (savedSetting !== null) {
    settings.notifications = savedSetting === 'true'
  } else {
    // 如果没有保存过，检查实际的订阅状态
    const status = await getSubscriptionStatus()
    settings.notifications = status.subscribed && status.permission === 'granted'
    // 保存到 localStorage
    localStorage.setItem(settingsKey, settings.notifications.toString())
  }
}

// 保存通知设置（按用户）
const saveNotificationSettings = (enabled) => {
  const settingsKey = getNotificationSettingsKey()
  if (settingsKey) {
    localStorage.setItem(settingsKey, enabled.toString())
  }
}

// 页面挂载时初始化
onMounted(() => {
  // 初始化通知状态（按当前登录用户）
  loadNotificationSettings()
  
  // 订阅 WebSocket 消息
  unsubscribeWS = onMessage((data) => {
    if (data.type === 'partnerUpdated' && data.data) {
      // 刷新用户信息以获取最新状态
      fetchUserInfo(true)
    } else if (data.type === 'unbound') {
      // 对方解除绑定，刷新状态
      showToast('对方已解除伴侣关系', 'error')
      fetchUserInfo(true)
    }
  })
})

// 页面激活时重新初始化（keep-alive 缓存后重新显示）
onActivated(() => {
  console.log('[Profile] 页面激活，检查用户...')
  
  // 检查当前缓存是否属于当前登录用户
  const storedUserId = localStorage.getItem('currentUserId')
  const token = localStorage.getItem('token')
  
  // 如果没有 token，清空数据
  if (!token) {
    clearUserData()
    router.replace('/')
    return
  }
  
  // 关键修复：如果用户ID不匹配，先清空数据，绝不从旧store读取
  if (storedUserId && userStore.currentUserId && userStore.currentUserId !== storedUserId) {
    console.log('[Profile] 用户切换，清空旧数据，等待新数据')
    clearUserData()
    userStore.invalidateCache()
    // 强制重新获取，不要从store初始化
    fetchUserInfo(true)
    // 重新加载新用户的通知设置
    loadNotificationSettings()
    return
  }
  
  // 正常情况：从store初始化或获取数据
  if (userStore.currentUser && !isInitialized.value) {
    initUserData()
  } else if (!userStore.currentUser) {
    fetchUserInfo(false)
  }
  
  // 重新加载当前用户的通知设置
  loadNotificationSettings()
})

// 监听 store 变化，保持同步
watch(() => userStore.currentUser, (newUser) => {
  if (newUser) {
    syncFromStore()
  }
}, { deep: true })

onUnmounted(() => {
  if (unsubscribeWS) {
    unsubscribeWS()
  }
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background: var(--bg-dark);
}

/* 背景 */
.bg-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.35;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #D5EAE3 0%, #FFFFFF 100%);
  top: -150px;
  right: -150px;
  animation: float 25s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #FFFFFF 0%, #D5EAE3 100%);
  bottom: 100px;
  left: -150px;
  animation: float 20s ease-in-out infinite reverse;
  opacity: 0.25;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -30px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

/* 主容器 */
.app {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-bottom: 100px;
}

/* 编辑模式标签 */
.edit-mode-badge {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  z-index: 99;
  box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.edit-mode-badge.show {
  opacity: 1;
  visibility: visible;
}

/* 顶部导航 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(253, 253, 245, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.header-back {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 12px;
  transition: all 0.3s ease;
}

.header-back:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-edit-btn {
  padding: 8px 16px;
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.header-edit-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(241, 101, 137, 0.25);
}

.header-edit-btn.save {
  background: linear-gradient(135deg, #F06292 0%, #E91E63 100%);
  color: white;
  min-width: 64px;
}

.header-edit-btn.save:hover {
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.header-edit-btn.save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.header-edit-btn.cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.header-edit-btn.cancel:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--text-tertiary);
}

/* 主内容 */
.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 20px;
}

/* 头像区域 */
.profile-header {
  text-align: center;
  padding: 20px 0 32px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.avatar-large {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%);
  border: 3px solid transparent;
  background-clip: padding-box;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 600;
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.avatar-large {
  cursor: pointer;
}

.avatar-large:hover {
  transform: scale(1.02);
  box-shadow: 0 0 20px rgba(255, 107, 107, 0.2);
}

.avatar-large::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.avatar-large img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  background: var(--color-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  border: 3px solid var(--bg-dark);
  transition: all 0.3s ease;
}

.avatar-edit:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 16px rgba(255, 107, 107, 0.4);
}



.profile-name {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 4px;
}

.profile-id {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 卡片 */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 20px;
  margin-bottom: 16px;
  backdrop-filter: blur(10px);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-title svg {
  color: var(--color-primary);
}

/* 表单项 */
.form-item {
  margin-bottom: 20px;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 8px;
  padding-left: 4px;
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  transition: all 0.3s ease;
}

.form-input:focus {
  border-color: var(--border-focus);
  background: rgba(254, 208, 214, 0.3);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.form-input[readonly] {
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: default;
  border-color: transparent;
}

.form-input[readonly]:focus {
  box-shadow: none;
  border-color: transparent;
}

.form-input::placeholder {
  color: var(--text-tertiary);
}

/* 性别选择 */
.gender-select {
  display: flex;
  gap: 12px;
}

.gender-option {
  flex: 1;
  padding: 14px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  color: var(--text-secondary);
}

.gender-option.active {
  background: rgba(241, 101, 137, 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.gender-option.disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--bg-card);
}

.gender-option.disabled.active {
  background: rgba(241, 101, 137, 0.1);
  border-color: rgba(255, 107, 107, 0.3);
}

/* 设置列表 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: all 0.3s ease;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item:hover {
  opacity: 0.8;
}

.setting-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-icon {
  width: 36px;
  height: 36px;
  background: var(--bg-input);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.setting-info h4 {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 2px;
}

.setting-info p {
  font-size: 12px;
  color: var(--text-tertiary);
}

.setting-right {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-tertiary);
}

/* 开关 */
.switch {
  width: 48px;
  height: 26px;
  background: var(--bg-input);
  border-radius: 13px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
}

.switch.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.switch::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all 0.3s ease;
}

.switch.active::after {
  left: 24px;
}

/* 底部退出 */
.logout-section {
  margin-top: 32px;
  padding-top: 16px;
}

.btn-logout {
  width: 100%;
  padding: 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: var(--radius-md);
  background: rgba(254, 208, 214, 0.5);
  color: #EF4444;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: rgba(254, 208, 214, 0.7);
}

/* 解绑按钮 - 低调设计 */
.btn-unbind {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0.6;
}

.btn-unbind:hover {
  color: #EF4444;
  opacity: 1;
}

/* Toast */
.toast {
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%) translateY(-30px);
  background: rgba(253, 253, 245, 0.98);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--text-primary);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
  z-index: 9999;
  max-width: 90%;
  width: max-content;
}

.toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}

.toast.success {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(219, 237, 156, 0.3);
}

.toast.success svg {
  color: #22C55E;
}

.toast.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(241, 101, 137, 0.15);
}

.toast.error svg {
  color: #EF4444;
}

/* 确认对话框 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(51, 51, 51, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.confirm-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.confirm-dialog {
  background: linear-gradient(135deg, rgba(253, 253, 245, 0.98) 0%, rgba(254, 208, 214, 0.95) 100%);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 28px;
  width: 320px;
  max-width: 90%;
  text-align: center;
  transform: scale(0.9) translateY(20px);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.confirm-overlay.show .confirm-dialog {
  transform: scale(1) translateY(0);
}

.confirm-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}

.confirm-message {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 12px;
}

.confirm-btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-btn.cancel {
  background: var(--bg-input);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.confirm-btn.confirm {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
}

.confirm-btn.danger {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
}

/* 头像裁剪模态框 */
.crop-overlay {
  position: fixed;
  inset: 0;
  background: rgba(253, 253, 245, 0.98);
  backdrop-filter: blur(20px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.crop-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.crop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(12px + env(safe-area-inset-top, 0px)) 20px 12px;
  border-bottom: 1px solid var(--border-color);
  background: rgba(253, 253, 245, 0.95);
}

.crop-title {
  font-size: 17px;
  font-weight: 600;
}

.crop-btn {
  padding: 8px 16px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  background: transparent;
  color: var(--text-secondary);
}

.crop-btn:hover {
  color: var(--text-primary);
  background: var(--bg-card);
}

.crop-btn.confirm {
  background: var(--color-primary);
  color: white;
  min-width: 64px;
}

.crop-btn.confirm:hover {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.crop-btn.confirm:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.crop-preview-area {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.crop-image-container {
  width: 100%;
  max-width: 400px;
  aspect-ratio: 1;
}

.crop-image {
  max-width: 100%;
  display: block;
}

/* Cropper.js 圆形裁剪框样式 */
:deep(.cropper-view-box),
:deep(.cropper-face) {
  border-radius: 50%;
}

:deep(.cropper-view-box) {
  outline: 2px solid var(--color-primary);
  outline-color: var(--color-primary);
}

:deep(.cropper-point) {
  background-color: var(--color-primary);
}

.crop-footer {
  padding: 20px;
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  text-align: center;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 加载动画 */
.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 关于共赴弹窗 */
.about-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
}

.about-overlay.show {
  opacity: 1;
  visibility: visible;
}

.about-dialog {
  width: 85%;
  max-width: 320px;
  max-height: 70vh;
  background: var(--bg-dark);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s ease;
}

.about-overlay.show .about-dialog {
  transform: scale(1);
  opacity: 1;
}

.about-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.about-header h3 {
  font-size: 18px;
  font-weight: 600;
  flex: 1;
  text-align: center;
}

.about-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: none;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.about-close:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
}

.about-content {
  padding: 24px 20px;
  overflow-y: auto;
  max-height: calc(80vh - 70px);
}

.about-brand {
  text-align: center;
  margin-bottom: 32px;
}

.about-brand h2 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.about-version {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.about-slogan {
  font-size: 13px;
  color: var(--text-tertiary);
}

.about-menu {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 24px;
}

.about-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.about-item:last-child {
  border-bottom: none;
}

.about-item:hover {
  background: var(--bg-card-hover);
}

.about-item span {
  font-size: 15px;
  color: var(--text-primary);
}

.about-item svg {
  color: var(--text-tertiary);
}

.about-footer {
  text-align: center;
  padding-top: 8px;
}

.about-icp {
  font-size: 12px;
  color: var(--text-tertiary);
  text-decoration: none;
  display: block;
  margin-bottom: 8px;
}

.about-icp:hover {
  color: var(--text-secondary);
}

.about-copyright {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 版本更新日志样式 */
.changelog-item {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.changelog-item:last-child {
  border-bottom: none;
}

.changelog-item h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--color-primary);
}

.changelog-date {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: normal;
  margin-left: 8px;
}

.changelog-item ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.changelog-item li {
  font-size: 14px;
  color: var(--text-secondary);
  padding: 6px 0;
  padding-left: 20px;
  position: relative;
}

.changelog-item li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: var(--color-primary);
}

.changelog-loading {
  text-align: center;
  padding: 40px;
  color: var(--text-tertiary);
  font-size: 14px;
}
</style>
