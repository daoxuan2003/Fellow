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
              <img v-if="editForm.avatar" :src="editForm.avatar" alt="头像">
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
            <div class="date-picker-wrapper">
              <input type="date" v-model="editForm.loveDate" :max="today" :readonly="!isEditing" :class="{ readonly: !isEditing }">
            </div>
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
                <h4>纪念日提醒</h4>
                <p>重要日子提前通知</p>
              </div>
            </div>
            <div class="switch" :class="{ active: settings.notify }" @click="settings.notify = !settings.notify"></div>
          </div>
          
          <div class="setting-item">
            <div class="setting-left">
              <div class="setting-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <div class="setting-info">
                <h4>相册自动同步</h4>
                <p>分享到相册时自动保存</p>
              </div>
            </div>
            <div class="switch" :class="{ active: settings.autoSync }" @click="settings.autoSync = !settings.autoSync"></div>
          </div>
          
          <div class="setting-item" @click="showToast('功能开发中')">
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
                <p>版本 {{ appVersion }}</p>
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
      
    </div>
    
    <!-- 底部导航 -->
    <BottomNav @toast="showToast" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import CONFIG from '../config'
import BottomNav from '../components/BottomNav.vue'

const router = useRouter()
const avatarInput = ref(null)

const appVersion = CONFIG.VERSION

const user = reactive({
  nickname: '',
  pairCode: '',
  partnerId: null,
  inviteStatus: 'idle'
})

const editForm = reactive({
  nickname: '',
  bio: '',
  gender: '',
  account: '',
  newPassword: '',
  loveDate: '',
  partnerNote: '',
  avatar: ''
})

const settings = reactive({
  notify: true,
  autoSync: false
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

const today = new Date().toISOString().split('T')[0]

const showToast = (message, type = 'success') => {
  toast.message = message
  toast.type = type
  toast.show = true
  if (toast.timer) clearTimeout(toast.timer)
  toast.timer = setTimeout(() => toast.show = false, 3000)
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

const fetchUserInfo = async () => {
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
        partnerNote: '',
        avatar: data.user.avatar || ''
      })
      user.inviteStatus = data.user.connected ? 'bound' : 'idle'
    }
  } catch (e) {
    showToast('获取用户信息失败', 'error')
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
  editForm.nickname = user.nickname
  editForm.bio = user.bio || ''
  editForm.gender = user.gender || ''
  editForm.newPassword = ''
  editForm.loveDate = user.anniversary ? user.anniversary.split('T')[0] : ''
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
        anniversary: editForm.loveDate
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

const handleAvatarChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  const formData = new FormData()
  formData.append('avatar', file)
  
  try {
    const res = await fetch(`${CONFIG.API_URL}/user/avatar`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    })
    const data = await res.json()
    if (data.success) {
      editForm.avatar = data.avatarUrl
      user.avatar = data.avatarUrl
      showToast('头像更新成功')
    } else {
      showToast(data.message || '上传失败', 'error')
    }
  } catch (e) {
    showToast('上传失败', 'error')
  }
}

const confirmLogout = () => {
  showConfirm({
    title: '退出登录',
    message: '确定要退出登录吗？',
    confirmText: '退出',
    isDanger: true,
    action: () => {
      localStorage.removeItem('token')
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

onMounted(fetchUserInfo)
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
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
  top: -150px;
  right: -150px;
  animation: float 25s ease-in-out infinite;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);
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
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
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
  padding: calc(16px + env(safe-area-inset-top, 0px)) 20px 16px;
  background: rgba(10, 10, 15, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* iOS PWA 顶部适配 */
@supports (-webkit-touch-callout: none) {
  .header {
    padding-top: max(16px, calc(12px + env(safe-area-inset-top, 44px)));
  }
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
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
}

.header-edit-btn.save {
  background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%);
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
  background: linear-gradient(135deg, #FF6B6B 0%, #764BA2 100%);
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
  background: rgba(255, 255, 255, 0.08);
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
  background: rgba(255, 107, 107, 0.15);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.gender-option.disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: var(--bg-card);
}

.gender-option.disabled.active {
  background: rgba(255, 107, 107, 0.08);
  border-color: rgba(255, 107, 107, 0.3);
}

/* 日期选择器 */
.date-picker-wrapper {
  position: relative;
}

.date-picker-wrapper input[type="date"] {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  outline: none;
  transition: all 0.3s ease;
  font-family: inherit;
}

.date-picker-wrapper input[type="date"].readonly {
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: default;
  border-color: transparent;
}

.date-picker-wrapper input[type="date"]:focus:not(.readonly) {
  border-color: var(--border-focus);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.date-picker-wrapper input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
  opacity: 0.6;
  cursor: pointer;
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
  background: rgba(239, 68, 68, 0.1);
  color: #EF4444;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-logout:hover {
  background: rgba(239, 68, 68, 0.2);
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
  background: rgba(30, 30, 35, 0.95);
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
  background: rgba(34, 197, 94, 0.15);
}

.toast.success svg {
  color: #22C55E;
}

.toast.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.15);
}

.toast.error svg {
  color: #EF4444;
}

/* 确认对话框 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
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
  background: linear-gradient(135deg, rgba(30, 30, 35, 0.95) 0%, rgba(20, 20, 25, 0.95) 100%);
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
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
  color: white;
}

.confirm-btn.danger {
  background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}
</style>
