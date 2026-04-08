<template>
  <div class="reminders-page">
    <!-- 背景 -->
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>
    
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" @click="$router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="header-title">提醒事项</span>
        <div class="icon-placeholder"></div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <main class="main">
      <!-- 筛选标签 -->
    <div class="filter-tabs">
      <button 
        v-for="tab in filterTabs" 
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentFilter === tab.value }"
        @click="currentFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 提醒列表 -->
    <div class="reminders-list" v-if="filteredReminders.length > 0">
      <div 
        v-for="reminder in filteredReminders" 
        :key="reminder.id"
        class="reminder-card"
        :class="{ 
          'priority-high': reminder.priority === 'high',
          'priority-low': reminder.priority === 'low',
          'completed': reminder.status === 'completed'
        }"
      >
        <div class="reminder-header">
          <div class="reminder-priority" :class="reminder.priority">
            {{ priorityLabels[reminder.priority] }}
          </div>
          <div class="reminder-actions">
            <button 
              v-if="reminder.status !== 'completed'"
              class="btn-icon"
              @click="completeReminder(reminder.id)"
              title="完成"
            >
              ✓
            </button>
            <button 
              v-if="reminder.creator?.id === currentUserId"
              class="btn-icon"
              @click="editReminder(reminder)"
              title="编辑"
            >
              ✎
            </button>
            <button 
              v-if="reminder.creator?.id === currentUserId"
              class="btn-icon delete"
              @click="deleteReminder(reminder.id)"
              title="删除"
            >
              ×
            </button>
          </div>
        </div>
        
        <div class="reminder-content">
          <h3 class="reminder-title">{{ reminder.title }}</h3>
          <p v-if="reminder.description" class="reminder-desc">
            {{ reminder.description }}
          </p>
        </div>
        
        <div class="reminder-footer">
          <div class="reminder-time">
            <span class="time-icon">⏰</span>
            <span>{{ formatDateTime(reminder.remindAt) }}</span>
            <span v-if="reminder.repeatType !== 'once'" class="repeat-badge">
              {{ repeatLabels[reminder.repeatType] }}
            </span>
          </div>
          <div class="reminder-creator" v-if="reminder.creator">
            <img :src="reminder.creator.avatar || '/default-avatar.png'" class="creator-avatar" />
            <span v-if="reminder.completedBy">
              已完成 by {{ reminder.completedBy.nickname }}
            </span>
            <span v-else>{{ reminder.creator.nickname }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">📋</div>
      <p class="empty-text">{{ emptyText }}</p>
    </div>

    <!-- 添加按钮 -->
    <button class="fab-btn" @click="showAddModal = true">
      <span>+</span>
    </button>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAddModal || editingReminder" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingReminder ? '编辑提醒' : '添加提醒' }}</h3>
          <button class="btn-close" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>提醒内容 <span class="required">*</span></label>
            <input 
              v-model="form.title"
              type="text"
              placeholder="例如：记得取快递"
              maxlength="100"
            />
          </div>
          
          <div class="form-group">
            <label>详细描述（可选）</label>
            <textarea 
              v-model="form.description"
              placeholder="添加更多细节..."
              maxlength="500"
              rows="3"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label>提醒时间 <span class="required">*</span></label>
            <input 
              v-model="form.remindAt"
              type="datetime-local"
            />
          </div>
          
          <div class="form-group">
            <label>重复设置</label>
            <select v-model="form.repeatType">
              <option value="once">不重复</option>
              <option value="daily">每天</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          
          <!-- 每周选择 -->
          <div class="form-group" v-if="form.repeatType === 'weekly'">
            <label>选择星期</label>
            <div class="weekday-selector">
              <button
                v-for="(day, index) in weekDays"
                :key="index"
                class="weekday-btn"
                :class="{ active: form.repeatData.includes(index + 1) }"
                @click="toggleWeekday(index + 1)"
              >
                {{ day }}
              </button>
            </div>
          </div>
          
          <!-- 每月选择 -->
          <div class="form-group" v-if="form.repeatType === 'monthly'">
            <label>选择日期（可多选）</label>
            <div class="monthday-selector">
              <button
                v-for="date in 31"
                :key="date"
                class="monthday-btn"
                :class="{ active: form.repeatData.includes(date) }"
                @click="toggleMonthday(date)"
              >
                {{ date }}
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label>优先级</label>
            <div class="priority-selector">
              <button
                v-for="p in priorities"
                :key="p.value"
                class="priority-btn"
                :class="{ active: form.priority === p.value }"
                @click="form.priority = p.value"
              >
                {{ p.label }}
              </button>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button 
            class="btn btn-primary" 
            :disabled="!form.title || !form.remindAt || submitting"
            @click="submitForm"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    </main>
    
    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import BottomNav from '../components/BottomNav.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

// 状态
const reminders = ref([])
const currentFilter = ref('all')
const showAddModal = ref(false)
const editingReminder = ref(null)
const submitting = ref(false)

// 筛选标签
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'pending', label: '待处理' },
  { value: 'completed', label: '已完成' },
  { value: 'mine', label: '我创建的' }
]

// 优先级
const priorities = [
  { value: 'low', label: '低' },
  { value: 'normal', label: '中' },
  { value: 'high', label: '高' }
]

const priorityLabels = {
  low: '低',
  normal: '中',
  high: '高'
}

// 重复类型
const repeatLabels = {
  once: '一次',
  daily: '每天',
  weekly: '每周',
  monthly: '每月'
}

const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 表单
const form = ref({
  title: '',
  description: '',
  remindAt: '',
  repeatType: 'once',
  repeatData: [],
  priority: 'normal'
})

// 计算属性
const filteredReminders = computed(() => {
  let list = reminders.value
  
  switch (currentFilter.value) {
    case 'pending':
      list = list.filter(r => r.status === 'pending')
      break
    case 'completed':
      list = list.filter(r => r.status === 'completed')
      break
    case 'mine':
      list = list.filter(r => r.creator?.id === currentUserId.value)
      break
  }
  
  // 排序：高优先级在前，然后按时间
  return list.sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1
    }
    const priorityOrder = { high: 0, normal: 1, low: 2 }
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    }
    return new Date(a.remindAt) - new Date(b.remindAt)
  })
})

const emptyText = computed(() => {
  const texts = {
    all: '还没有提醒事项，点击 + 添加一个吧',
    pending: '没有待处理的提醒',
    completed: '还没有已完成的提醒',
    mine: '你还没有创建过提醒'
  }
  return texts[currentFilter.value]
})

// 方法
function formatDateTime(isoString) {
  const date = new Date(isoString)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const isTomorrow = new Date(now.setDate(now.getDate() + 1)).toDateString() === date.toDateString()
  
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`
  
  if (isToday) return `今天 ${timeStr}`
  if (isTomorrow) return `明天 ${timeStr}`
  return `${dateStr} ${timeStr}`
}

function toggleWeekday(day) {
  const index = form.value.repeatData.indexOf(day)
  if (index > -1) {
    form.value.repeatData.splice(index, 1)
  } else {
    form.value.repeatData.push(day)
  }
  form.value.repeatData.sort((a, b) => a - b)
}

function toggleMonthday(date) {
  const index = form.value.repeatData.indexOf(date)
  if (index > -1) {
    form.value.repeatData.splice(index, 1)
  } else {
    form.value.repeatData.push(date)
  }
  form.value.repeatData.sort((a, b) => a - b)
}

function resetForm() {
  form.value = {
    title: '',
    description: '',
    remindAt: '',
    repeatType: 'once',
    repeatData: [],
    priority: 'normal'
  }
}

function editReminder(reminder) {
  editingReminder.value = reminder
  form.value = {
    title: reminder.title,
    description: reminder.description || '',
    remindAt: formatDateTimeLocal(reminder.remindAt),
    repeatType: reminder.repeatType,
    repeatData: [...(reminder.repeatData || [])],
    priority: reminder.priority
  }
}

function formatDateTimeLocal(isoString) {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function closeModal() {
  showAddModal.value = false
  editingReminder.value = null
  resetForm()
}

async function submitForm() {
  if (!form.value.title || !form.value.remindAt) return
  
  submitting.value = true
  try {
    const url = editingReminder.value 
      ? `/api/reminders/${editingReminder.value.id}`
      : '/api/reminders'
    const method = editingReminder.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(form.value)
    })
    
    const data = await response.json()
    if (data.success) {
      closeModal()
      await fetchReminders()
    } else {
      alert(data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存提醒失败:', error)
    alert('网络错误，请重试')
  } finally {
    submitting.value = false
  }
}

async function completeReminder(id) {
  try {
    const response = await fetch(`/api/reminders/${id}/complete`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      await fetchReminders()
    } else {
      alert(data.message || '操作失败')
    }
  } catch (error) {
    console.error('完成提醒失败:', error)
    alert('网络错误，请重试')
  }
}

async function deleteReminder(id) {
  if (!confirm('确定要删除这个提醒吗？')) return
  
  try {
    const response = await fetch(`/api/reminders/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      await fetchReminders()
    } else {
      alert(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除提醒失败:', error)
    alert('网络错误，请重试')
  }
}

async function fetchReminders() {
  try {
    const response = await fetch('/api/reminders', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      reminders.value = data.data
    }
  } catch (error) {
    console.error('获取提醒列表失败:', error)
  }
}

onMounted(() => {
  fetchReminders()
  
  // WebSocket 监听
  if (window.eventBus) {
    window.eventBus.on('reminderCreated', () => fetchReminders())
    window.eventBus.on('reminderCompleted', () => fetchReminders())
    window.eventBus.on('reminderDeleted', () => fetchReminders())
  }
})
</script>

<style scoped>
.reminders-page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
}

/* 背景 */
.bg-container {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  top: -100px;
  right: -100px;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #DBED9C 0%, #B8D96A 100%);
  bottom: 10%;
  left: -80px;
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
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 480px;
  margin: 0 auto;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
}

.icon-placeholder {
  width: 40px;
}

/* 主内容 */
.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-tab {
  flex: 1;
  padding: 12px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
}

.filter-tab.active {
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  border-color: transparent;
  color: white;
}

/* 提醒卡片 */
.reminders-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 16px;
  border-left: 4px solid var(--primary-color);
}

.reminder-card.priority-high {
  border-left-color: #ff6b6b;
}

.reminder-card.priority-low {
  border-left-color: #74b9ff;
}

.reminder-card.completed {
  opacity: 0.6;
  border-left-color: #95a5a6;
}

.reminder-card.completed .reminder-title {
  text-decoration: line-through;
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.reminder-priority {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.reminder-priority.high {
  background: #ffebee;
  color: #c62828;
}

.reminder-priority.normal {
  background: #fff3e0;
  color: #ef6c00;
}

.reminder-priority.low {
  background: #e3f2fd;
  color: #1565c0;
}

.reminder-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--primary-color);
  color: white;
}

.btn-icon.delete:hover {
  background: #ff4444;
}

.reminder-content {
  margin-bottom: 12px;
}

.reminder-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.reminder-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.reminder-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.reminder-time {
  display: flex;
  align-items: center;
  gap: 6px;
}

.time-icon {
  font-size: 14px;
}

.repeat-badge {
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.reminder-creator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.creator-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: white;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 100;
}

.fab-btn:hover {
  transform: scale(1.1);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.form-group .required {
  color: #ff4444;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  background: var(--bg-secondary);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* 星期选择器 */
.weekday-selector {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.weekday-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.weekday-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 日期选择器 */
.monthday-selector {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.monthday-btn {
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.monthday-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

/* 优先级选择器 */
.priority-selector {
  display: flex;
  gap: 12px;
}

.priority-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.priority-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.modal-footer .btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
