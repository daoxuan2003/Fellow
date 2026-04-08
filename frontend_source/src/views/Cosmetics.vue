<template>
  <div class="cosmetics-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">化妆品管理</h1>
      <p class="page-subtitle">记录开封日期，告别过期烦恼</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-bar">
      <div class="stat-item" :class="{ warning: expiringCount > 0 }">
        <span class="stat-number">{{ expiringCount }}</span>
        <span class="stat-label">即将过期</span>
      </div>
      <div class="stat-item" :class="{ danger: expiredCount > 0 }">
        <span class="stat-number">{{ expiredCount }}</span>
        <span class="stat-label">已过期</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ activeCount }}</span>
        <span class="stat-label">使用中</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">{{ emptyCount }}</span>
        <span class="stat-label">已用完</span>
      </div>
    </div>

    <!-- 状态筛选 -->
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

    <!-- 化妆品列表 -->
    <div class="cosmetics-grid" v-if="filteredCosmetics.length > 0">
      <div 
        v-for="item in filteredCosmetics" 
        :key="item.id"
        class="cosmetic-card"
        :class="{ 
          'expiring-soon': item.isExpiringSoon && !item.isExpired,
          'expired': item.isExpired,
          'empty': item.status === 'empty'
        }"
        @click="viewDetail(item)"
      >
        <div class="cosmetic-image">
          <img :src="item.photoUrl" :alt="item.name" />
          <div class="status-badge" v-if="item.isExpired">已过期</div>
          <div class="status-badge warning" v-else-if="item.isExpiringSoon">剩{{ item.daysLeft }}天</div>
        </div>
        <div class="cosmetic-info">
          <h3 class="cosmetic-name">{{ item.name }}</h3>
          <div class="cosmetic-meta">
            <span class="expire-date">过期: {{ formatDate(item.expireDate) }}</span>
          </div>
          <div class="progress-bar" v-if="item.status !== 'empty'">
            <div 
              class="progress-fill" 
              :style="{ width: getProgressPercent(item) + '%' }"
              :class="{ warning: item.isExpiringSoon, danger: item.isExpired }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div class="empty-state" v-else>
      <div class="empty-icon">💄</div>
      <p class="empty-text">还没有化妆品记录，添加一个吧</p>
    </div>

    <!-- 添加按钮 -->
    <button class="fab-btn" @click="showAddModal = true">
      <span>+</span>
    </button>

    <!-- 添加/编辑弹窗 -->
    <div class="modal-overlay" v-if="showAddModal || editingItem" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingItem ? '编辑化妆品' : '添加化妆品' }}</h3>
          <button class="btn-close" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <!-- 照片上传 -->
          <div class="form-group">
            <label>照片 <span class="required">*</span></label>
            <div class="photo-upload" @click="triggerFileInput">
              <img v-if="photoPreview" :src="photoPreview" class="photo-preview" />
              <div v-else class="upload-placeholder">
                <span class="upload-icon">📷</span>
                <span>点击上传照片</span>
              </div>
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*" 
                style="display: none"
                @change="handleFileChange"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>产品名称 <span class="required">*</span></label>
            <input 
              v-model="form.name"
              type="text"
              placeholder="例如：SK-II 神仙水"
              maxlength="100"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group flex-1">
              <label>开封日期 <span class="required">*</span></label>
              <input 
                v-model="form.openDate"
                type="date"
              />
            </div>
            <div class="form-group flex-1">
              <label>保质期 <span class="required">*</span></label>
              <select v-model="form.shelfLifeMonths">
                <option v-for="m in shelfLifeOptions" :key="m.value" :value="m.value">
                  {{ m.label }}
                </option>
              </select>
            </div>
          </div>
          
          <div class="form-group">
            <label>提前提醒天数</label>
            <div class="remind-options">
              <button
                v-for="days in [7, 15, 30, 60]"
                :key="days"
                class="remind-btn"
                :class="{ active: form.remindDaysBefore === days }"
                @click="form.remindDaysBefore = days"
              >
                {{ days }}天
              </button>
              <input 
                v-model.number="form.remindDaysBefore"
                type="number"
                class="remind-input"
                placeholder="自定义"
                min="1"
                max="365"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>备注（可选）</label>
            <textarea 
              v-model="form.note"
              placeholder="添加备注信息..."
              maxlength="200"
              rows="2"
            ></textarea>
          </div>
          
          <!-- 预览过期日期 -->
          <div class="preview-box" v-if="form.openDate && form.shelfLifeMonths">
            <span class="preview-label">预计过期日期：</span>
            <span class="preview-date">{{ calculatedExpireDate }}</span>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button 
            class="btn btn-primary" 
            :disabled="!canSubmit || submitting"
            @click="submitForm"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div class="modal-overlay" v-if="viewingItem" @click="viewingItem = null">
      <div class="modal-content detail-modal" @click.stop>
        <button class="btn-close detail-close" @click="viewingItem = null">×</button>
        
        <div class="detail-image">
          <img :src="viewingItem.photoUrl" :alt="viewingItem.name" />
        </div>
        
        <div class="detail-info">
          <h2 class="detail-name">{{ viewingItem.name }}</h2>
          
          <div class="detail-dates">
            <div class="date-item">
              <span class="date-label">开封日期</span>
              <span class="date-value">{{ formatDate(viewingItem.openDate) }}</span>
            </div>
            <div class="date-item">
              <span class="date-label">过期日期</span>
              <span class="date-value" :class="{ danger: viewingItem.isExpired, warning: viewingItem.isExpiringSoon }">
                {{ formatDate(viewingItem.expireDate) }}
              </span>
            </div>
            <div class="date-item">
              <span class="date-label">保质期</span>
              <span class="date-value">{{ viewingItem.shelfLifeMonths }}个月</span>
            </div>
          </div>
          
          <div class="detail-status" v-if="viewingItem.status !== 'empty'">
            <div class="status-header">
              <span>剩余时间</span>
              <span :class="{ danger: viewingItem.isExpired, warning: viewingItem.isExpiringSoon }">
                {{ viewingItem.isExpired ? `已过期 ${Math.abs(viewingItem.daysLeft)} 天` : `还剩 ${viewingItem.daysLeft} 天` }}
              </span>
            </div>
            <div class="progress-bar large">
              <div 
                class="progress-fill" 
                :style="{ width: getProgressPercent(viewingItem) + '%' }"
                :class="{ warning: viewingItem.isExpiringSoon, danger: viewingItem.isExpired }"
              ></div>
            </div>
          </div>
          
          <p v-if="viewingItem.note" class="detail-note">{{ viewingItem.note }}</p>
          
          <div class="detail-actions">
            <button 
              v-if="viewingItem.status !== 'empty'"
              class="btn btn-secondary"
              @click="markEmpty(viewingItem.id)"
            >
              标记已用完
            </button>
            <button 
              v-else
              class="btn btn-secondary"
              @click="markActive(viewingItem.id)"
            >
              恢复使用
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="btn btn-primary"
              @click="editItem(viewingItem)"
            >
              编辑
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="btn btn-danger"
              @click="deleteItem(viewingItem.id)"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

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
const cosmetics = ref([])
const currentFilter = ref('all')
const showAddModal = ref(false)
const editingItem = ref(null)
const viewingItem = ref(null)
const submitting = ref(false)
const photoPreview = ref('')
const photoFile = ref(null)
const fileInput = ref(null)

// 筛选标签
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '使用中' },
  { value: 'expiring', label: '即将过期' },
  { value: 'expired', label: '已过期' },
  { value: 'empty', label: '已用完' }
]

// 保质期选项
const shelfLifeOptions = [
  { value: 3, label: '3个月' },
  { value: 6, label: '6个月' },
  { value: 12, label: '12个月' },
  { value: 18, label: '18个月' },
  { value: 24, label: '24个月' },
  { value: 36, label: '36个月' }
]

// 表单
const form = ref({
  name: '',
  openDate: formatDateForInput(new Date()),
  shelfLifeMonths: 12,
  remindDaysBefore: 30,
  note: ''
})

// 计算属性
const filteredCosmetics = computed(() => {
  let list = cosmetics.value
  
  switch (currentFilter.value) {
    case 'active':
      list = list.filter(c => c.status === 'active')
      break
    case 'expiring':
      list = list.filter(c => c.isExpiringSoon && !c.isExpired)
      break
    case 'expired':
      list = list.filter(c => c.isExpired)
      break
    case 'empty':
      list = list.filter(c => c.status === 'empty')
      break
  }
  
  // 排序：临期的在前
  return list.sort((a, b) => {
    if (a.status === 'empty' && b.status !== 'empty') return 1
    if (a.status !== 'empty' && b.status === 'empty') return -1
    return a.daysLeft - b.daysLeft
  })
})

const expiringCount = computed(() => cosmetics.value.filter(c => c.isExpiringSoon && !c.isExpired).length)
const expiredCount = computed(() => cosmetics.value.filter(c => c.isExpired).length)
const activeCount = computed(() => cosmetics.value.filter(c => c.status === 'active').length)
const emptyCount = computed(() => cosmetics.value.filter(c => c.status === 'empty').length)

const canSubmit = computed(() => {
  return form.value.name && form.value.openDate && form.value.shelfLifeMonths && (photoPreview.value || editingItem.value)
})

const calculatedExpireDate = computed(() => {
  if (!form.value.openDate || !form.value.shelfLifeMonths) return ''
  const date = new Date(form.value.openDate)
  date.setMonth(date.getMonth() + parseInt(form.value.shelfLifeMonths))
  return formatDate(date.toISOString().split('T')[0])
})

// 方法
function formatDate(dateStr) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateForInput(date) {
  return date.toISOString().split('T')[0]
}

function getProgressPercent(item) {
  if (item.status === 'empty') return 100
  const totalDays = item.shelfLifeMonths * 30
  const passedDays = totalDays - item.daysLeft
  const percent = (passedDays / totalDays) * 100
  return Math.min(Math.max(percent, 0), 100)
}

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  
  // 预览
  photoPreview.value = URL.createObjectURL(file)
  photoFile.value = file
}

function resetForm() {
  form.value = {
    name: '',
    openDate: formatDateForInput(new Date()),
    shelfLifeMonths: 12,
    remindDaysBefore: 30,
    note: ''
  }
  photoPreview.value = ''
  photoFile.value = null
}

function closeModal() {
  showAddModal.value = false
  editingItem.value = null
  resetForm()
}

function viewDetail(item) {
  viewingItem.value = item
}

function editItem(item) {
  viewingItem.value = null
  editingItem.value = item
  form.value = {
    name: item.name,
    openDate: item.openDate,
    shelfLifeMonths: item.shelfLifeMonths,
    remindDaysBefore: item.remindDaysBefore,
    note: item.note || ''
  }
  photoPreview.value = item.photoUrl
}

async function uploadPhoto(file) {
  const formData = new FormData()
  formData.append('photo', file)
  
  const response = await fetch('/api/cosmetics/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: formData
  })
  
  const data = await response.json()
  if (!data.success) {
    throw new Error(data.message || '上传失败')
  }
  return data.data.url
}

async function submitForm() {
  if (!canSubmit.value) return
  
  submitting.value = true
  try {
    let photoUrl = photoPreview.value
    
    // 如果有新上传的照片
    if (photoFile.value && !editingItem.value) {
      photoUrl = await uploadPhoto(photoFile.value)
    }
    
    const payload = {
      ...form.value,
      photoUrl
    }
    
    const url = editingItem.value 
      ? `/api/cosmetics/${editingItem.value.id}`
      : '/api/cosmetics'
    const method = editingItem.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })
    
    const data = await response.json()
    if (data.success) {
      closeModal()
      await fetchCosmetics()
    } else {
      alert(data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存化妆品失败:', error)
    alert(error.message || '网络错误，请重试')
  } finally {
    submitting.value = false
  }
}

async function markEmpty(id) {
  try {
    const response = await fetch(`/api/cosmetics/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: 'empty' })
    })
    
    const data = await response.json()
    if (data.success) {
      viewingItem.value = null
      await fetchCosmetics()
    } else {
      alert(data.message || '操作失败')
    }
  } catch (error) {
    console.error('标记已用完失败:', error)
    alert('网络错误，请重试')
  }
}

async function markActive(id) {
  try {
    const response = await fetch(`/api/cosmetics/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: 'active' })
    })
    
    const data = await response.json()
    if (data.success) {
      viewingItem.value = null
      await fetchCosmetics()
    } else {
      alert(data.message || '操作失败')
    }
  } catch (error) {
    console.error('恢复使用失败:', error)
    alert('网络错误，请重试')
  }
}

async function deleteItem(id) {
  if (!confirm('确定要删除这个化妆品记录吗？')) return
  
  try {
    const response = await fetch(`/api/cosmetics/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      viewingItem.value = null
      await fetchCosmetics()
    } else {
      alert(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除化妆品失败:', error)
    alert('网络错误，请重试')
  }
}

async function fetchCosmetics() {
  try {
    const response = await fetch('/api/cosmetics', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      cosmetics.value = data.data
    }
  } catch (error) {
    console.error('获取化妆品列表失败:', error)
  }
}

onMounted(() => {
  fetchCosmetics()
  
  // WebSocket 监听
  if (window.eventBus) {
    window.eventBus.on('cosmeticAdded', () => fetchCosmetics())
    window.eventBus.on('cosmeticStatusChanged', () => fetchCosmetics())
  }
})
</script>

<style scoped>
.cosmetics-page {
  padding: 20px;
  padding-bottom: 80px;
  max-width: 600px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  justify-content: space-around;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-item.warning .stat-number {
  color: #ff9800;
}

.stat-item.danger .stat-number {
  color: #f44336;
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* 筛选标签 */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-tab {
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.filter-tab.active {
  background: var(--primary-color);
  color: white;
}

/* 化妆品网格 */
.cosmetics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.cosmetic-card {
  background: var(--card-bg);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.cosmetic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cosmetic-card.expiring-soon {
  border-color: #ff9800;
}

.cosmetic-card.expired {
  border-color: #f44336;
}

.cosmetic-card.empty {
  opacity: 0.6;
}

.cosmetic-image {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.cosmetic-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #f44336;
  color: white;
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.status-badge.warning {
  background: #ff9800;
}

.cosmetic-info {
  padding: 12px;
}

.cosmetic-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cosmetic-meta {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.progress-bar {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-color);
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-fill.warning {
  background: #ff9800;
}

.progress-fill.danger {
  background: #f44336;
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
  background: var(--card-bg);
  border-radius: 20px 20px 0 0;
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

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 {
  flex: 1;
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

/* 照片上传 */
.photo-upload {
  width: 100%;
  aspect-ratio: 1;
  max-height: 200px;
  border: 2px dashed var(--border-color);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  overflow: hidden;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--text-secondary);
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 提醒选项 */
.remind-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.remind-btn {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.remind-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.remind-input {
  width: 80px !important;
  text-align: center;
}

/* 预览 */
.preview-box {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 12px;
  text-align: center;
}

.preview-label {
  color: var(--text-secondary);
  font-size: 14px;
}

.preview-date {
  font-weight: 600;
  color: var(--text-primary);
  margin-left: 8px;
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

.btn-danger {
  background: #ff4444;
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 详情弹窗 */
.detail-modal {
  padding: 0;
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
}

.detail-image {
  width: 100%;
  aspect-ratio: 1;
  max-height: 300px;
}

.detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-info {
  padding: 20px;
}

.detail-name {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 20px;
}

.detail-dates {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.date-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
}

.date-label {
  color: var(--text-secondary);
}

.date-value {
  font-weight: 500;
}

.date-value.warning {
  color: #ff9800;
}

.date-value.danger {
  color: #f44336;
}

.detail-status {
  background: var(--bg-secondary);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.status-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 14px;
}

.progress-bar.large {
  height: 8px;
}

.detail-note {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.detail-actions {
  display: flex;
  gap: 12px;
}

.detail-actions .btn {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

@media (max-width: 400px) {
  .cosmetics-grid {
    grid-template-columns: 1fr;
  }
}
</style>
