<template>
  <div class="cosmetics-page">
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
        <span class="header-title">化妆台</span>
        <div class="icon-placeholder"></div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <main class="main">
      <!-- 统计面板 -->
      <div class="stats-panel">
        <div class="stats-header">
          <span class="stats-title">我们的化妆品</span>
          <span class="stats-total">{{ cosmetics.length }} 件商品</span>
        </div>
        <div class="stats-grid">
          <div class="stat-box active">
            <div class="stat-icon">✨</div>
            <div class="stat-info">
              <span class="stat-value">{{ activeCount }}</span>
              <span class="stat-name">使用中</span>
            </div>
          </div>
          <div class="stat-box warning" v-if="expiringCount > 0">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <span class="stat-value">{{ expiringCount }}</span>
              <span class="stat-name">即将过期</span>
            </div>
          </div>
          <div class="stat-box danger" v-if="expiredCount > 0">
            <div class="stat-icon">🚫</div>
            <div class="stat-info">
              <span class="stat-value">{{ expiredCount }}</span>
              <span class="stat-name">已过期</span>
            </div>
          </div>
          <div class="stat-box empty" v-if="emptyCount > 0">
            <div class="stat-icon">📥</div>
            <div class="stat-info">
              <span class="stat-value">{{ emptyCount }}</span>
              <span class="stat-name">已用完</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-bar">
        <button 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-btn"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- 化妆品列表 -->
      <div class="cosmetics-list" v-if="filteredCosmetics.length > 0">
        <div 
          v-for="item in filteredCosmetics" 
          :key="item.id"
          class="cosmetic-card"
          :class="{ 
            'is-expiring': item.isExpiringSoon && !item.isExpired,
            'is-expired': item.isExpired,
            'is-empty': item.status === 'empty'
          }"
          @click="viewDetail(item)"
        >
          <div class="card-photo">
            <img :src="item.photoUrl" :alt="item.name" />
            <div class="card-badge" v-if="item.isExpired">
              <span>已过期</span>
            </div>
            <div class="card-badge warning" v-else-if="item.isExpiringSoon">
              <span>{{ item.daysLeft }}天</span>
            </div>
            <div class="card-badge empty" v-else-if="item.status === 'empty'">
              <span>已用完</span>
            </div>
          </div>
          <div class="card-content">
            <h3 class="card-name">{{ item.name }}</h3>
            <div class="card-date">
              <span class="date-label">过期</span>
              <span class="date-value" :class="{ 'is-expired': item.isExpired, 'is-warning': item.isExpiringSoon }">
                {{ formatDate(item.expireDate) }}
              </span>
            </div>
            <div class="card-progress" v-if="item.status !== 'empty'">
              <div class="progress-track">
                <div 
                  class="progress-bar" 
                  :style="{ width: getProgressPercent(item) + '%' }"
                  :class="{ 'is-warning': item.isExpiringSoon, 'is-expired': item.isExpired }"
                ></div>
              </div>
              <span class="progress-text">{{ item.daysLeft > 0 ? '剩' + item.daysLeft + '天' : '已过期' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">💄</div>
        <p class="empty-text">还没有化妆品，添加一个吧</p>
      </div>

      <!-- 添加按钮 -->
      <button class="fab-btn" @click="showAddModal = true">
        <span>+</span>
      </button>

    </main>
    
    <!-- 添加/编辑弹窗 - 移到main外面确保层级正确 -->
    <div class="modal-overlay" v-if="showAddModal || editingItem" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingItem ? '编辑化妆品' : '添加化妆品' }}</h3>
          <button class="btn-close" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
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
              <DatePickerField v-model="form.openDate" display-class="date-input" placeholder="请选择日期" />
            </div>
            <div class="form-group flex-1">
              <label>保质期(月) <span class="required">*</span></label>
              <input 
                v-model="form.shelfLifeMonths"
                type="number"
                step="0.1"
                min="0.1"
                max="120"
                placeholder="输入月数"
              />
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
        <div v-if="!canSubmit && !submitting" class="form-hint">
          <span v-if="!form?.name">请填写产品名称</span>
          <span v-else-if="!form?.openDate">请选择开封日期</span>
          <span v-else-if="!form?.shelfLifeMonths">请填写保质期</span>
          <span v-else-if="!photoPreview && !editingItem">请上传产品照片</span>
        </div>
      </div>
    </div>

    <!-- 图片裁剪弹窗 -->
    <ImageCropper
      v-if="showCropper"
      :image-src="cropperImageSrc"
      @confirm="onCropConfirm"
      @cancel="onCropCancel"
    />

    <!-- 详情弹窗 -->
    <div class="detail-overlay" v-if="viewingItem" @click="viewingItem = null">
      <div class="detail-modal" @click.stop>
        <button class="detail-close" @click="viewingItem = null">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <div class="detail-photo">
          <img :src="viewingItem.photoUrl" :alt="viewingItem.name" />
          <div class="detail-status" 
               :class="{ 
                 'is-expired': viewingItem.isExpired, 
                 'is-warning': viewingItem.isExpiringSoon && !viewingItem.isExpired,
                 'is-empty': viewingItem.status === 'empty'
               }">
            <span v-if="viewingItem.isExpired">已过期</span>
            <span v-else-if="viewingItem.status === 'empty'">已用完</span>
            <span v-else-if="viewingItem.isExpiringSoon">即将过期</span>
            <span v-else>使用中</span>
          </div>
        </div>
        
        <div class="detail-content">
          <h2 class="detail-name">{{ viewingItem.name }}</h2>
          
          <div class="detail-timeline">
            <div class="timeline-row">
              <div class="timeline-dot"></div>
              <div class="timeline-info">
                <span class="timeline-label">开封日期</span>
                <span class="timeline-value">{{ formatDate(viewingItem.openDate) }}</span>
              </div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-row">
              <div class="timeline-dot end" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }"></div>
              <div class="timeline-info">
                <span class="timeline-label">过期日期</span>
                <span class="timeline-value" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }">
                  {{ formatDate(viewingItem.expireDate) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="detail-shelf">
            <div class="shelf-icon">📋</div>
            <div class="shelf-info">
              <span class="shelf-label">保质期</span>
              <span class="shelf-value">{{ viewingItem.shelfLifeMonths }}个月</span>
            </div>
          </div>
          
          <div class="detail-progress" v-if="viewingItem.status !== 'empty'">
            <div class="progress-header">
              <span class="progress-label">使用进度</span>
              <span class="progress-days" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }">
                {{ viewingItem.isExpired ? `已过期 ${Math.abs(viewingItem.daysLeft)} 天` : `还剩 ${viewingItem.daysLeft} 天` }}
              </span>
            </div>
            <div class="progress-track">
              <div 
                class="progress-fill" 
                :style="{ width: getProgressPercent(viewingItem) + '%' }"
                :class="{ 'is-warning': viewingItem.isExpiringSoon, 'is-expired': viewingItem.isExpired }"
              ></div>
            </div>
          </div>
          
          <div v-if="viewingItem.note" class="detail-note">
            <div class="note-icon">📝</div>
            <p>{{ viewingItem.note }}</p>
          </div>
          
          <div class="detail-actions">
            <button 
              v-if="viewingItem.status !== 'empty'"
              class="action-btn secondary"
              @click="markEmpty(viewingItem.id)"
            >
              <span class="btn-icon">📥</span>
              <span>标记已用完</span>
            </button>
            <button 
              v-else
              class="action-btn secondary"
              @click="markActive(viewingItem.id)"
            >
              <span class="btn-icon">🔄</span>
              <span>恢复使用</span>
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="action-btn primary"
              @click="editItem(viewingItem)"
            >
              <span class="btn-icon">✏️</span>
              <span>编辑</span>
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="action-btn danger"
              @click="deleteItem(viewingItem.id)"
            >
              <span class="btn-icon">🗑️</span>
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航 -->
    <BottomNav />

    <div
      v-if="toast.show"
      class="cosmetics-toast"
      :class="toast.type"
      role="status"
      aria-live="polite"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { formatLocalDate } from '../utils/date.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import BottomNav from '../components/BottomNav.vue'
import DatePickerField from '../components/DatePickerField.vue'
import ImageCropper from '../components/ImageCropper.vue'

const userStore = useUserStore()
const currentUserId = computed(() => resolveCurrentUserId(userStore))

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
const showCropper = ref(false)
const cropperImageSrc = ref('')
const toast = ref({
  show: false,
  message: '',
  type: 'info'
})
const pendingDeleteId = ref('')
let toastTimer = null
let deleteConfirmTimer = null

// 筛选标签
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '使用中' },
  { value: 'expiring', label: '即将过期' },
  { value: 'expired', label: '已过期' },
  { value: 'empty', label: '已用完' }
]

// 表单
const form = ref({
  name: '',
  openDate: getTodayStr(),
  shelfLifeMonths: 12,
  remindDaysBefore: 30,
  note: ''
})

// 获取今天日期字符串
function getTodayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

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
  return form?.value?.name && form?.value?.openDate && form?.value?.shelfLifeMonths && (photoPreview.value || editingItem.value)
})

const calculatedExpireDate = computed(() => {
  if (!form.value.openDate || !form.value.shelfLifeMonths) return ''
  const date = new Date(form.value.openDate + 'T00:00:00')
  const months = parseFloat(form.value.shelfLifeMonths)
  date.setMonth(date.getMonth() + Math.floor(months))
  date.setDate(date.getDate() + Math.round((months % 1) * 30))
  return formatDate(formatLocalDate(date))
})

// 方法
function formatDate(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateForInput(date) {
  return formatLocalDate(date)
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
  
  // 打开裁剪界面
  cropperImageSrc.value = URL.createObjectURL(file)
  showCropper.value = true
  
  // 清空 input，允许重复选择同一文件
  e.target.value = ''
}

function onCropConfirm(croppedBlob) {
  // 将裁剪后的 blob 转换为文件
  const fileName = `cropped_${Date.now()}.jpg`
  const croppedFile = new File([croppedBlob], fileName, { type: 'image/jpeg' })
  
  photoPreview.value = URL.createObjectURL(croppedBlob)
  photoFile.value = croppedFile
  showCropper.value = false
  cropperImageSrc.value = ''
}

function onCropCancel() {
  showCropper.value = false
  cropperImageSrc.value = ''
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

function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => {
    toast.value = { ...toast.value, show: false }
    toastTimer = null
  }, 2800)
}

function requireSecondDeleteClick(id) {
  if (pendingDeleteId.value === id) {
    pendingDeleteId.value = ''
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = null
    return true
  }

  pendingDeleteId.value = id
  showToast('再次点击删除这个化妆品记录', 'warning')
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
  deleteConfirmTimer = setTimeout(() => {
    pendingDeleteId.value = ''
    deleteConfirmTimer = null
  }, 4200)
  return false
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
  return data.data.key  // 返回 photoKey 而不是 url
}

async function submitForm() {
  if (!canSubmit.value) return
  
  const isEditing = Boolean(editingItem.value)
  submitting.value = true
  try {
    let photoKey = editingItem.value?.photoKey || ''
    
    if (photoFile.value && !editingItem.value) {
      photoKey = await uploadPhoto(photoFile.value)
    }
    
    const payload = {
      ...form.value,
      photoKey
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
      showToast(isEditing ? '化妆品记录已保存' : '化妆品已添加', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (error) {
    console.error('保存化妆品失败:', error)
    showToast(error.message || '网络错误，请重试', 'error')
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
      showToast('已标记为用完', 'success')
    } else {
      showToast(data.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('标记已用完失败:', error)
    showToast('网络错误，请重试', 'error')
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
      showToast('已恢复为使用中', 'success')
    } else {
      showToast(data.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('恢复使用失败:', error)
    showToast('网络错误，请重试', 'error')
  }
}

async function deleteItem(id) {
  if (!requireSecondDeleteClick(id)) return
  
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
      showToast('化妆品记录已删除', 'success')
    } else {
      showToast(data.message || '删除失败', 'error')
    }
  } catch (error) {
    console.error('删除化妆品失败:', error)
    showToast('网络错误，请重试', 'error')
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
  
  if (window.eventBus) {
    window.eventBus.on('cosmeticAdded', () => fetchCosmetics())
    window.eventBus.on('cosmeticStatusChanged', () => fetchCosmetics())
  }
})

// WebSocket 监听
const { onMessage } = useWebSocket()
const handleWSMessage = (data) => {
  if (data.type?.startsWith('cosmetic')) {
    console.log('[Cosmetics] 收到 WebSocket 消息:', data.type)
    fetchCosmetics()
  }
}

const unsubscribe = onMessage(handleWSMessage)
onUnmounted(() => {
  unsubscribe()
  if (toastTimer) clearTimeout(toastTimer)
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
})
</script>

<style scoped>
/* ========== 基础样式 ========== */
.cosmetics-page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
}

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
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
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
  font-weight: 700;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
}

.icon-placeholder {
  width: 40px;
}

.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

/* ========== 统计面板 ========== */
.stats-panel {
  background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.stats-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.stats-total {
  font-size: 13px;
  color: var(--text-secondary);
  background: rgba(233, 30, 99, 0.08);
  padding: 4px 12px;
  border-radius: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(145deg, #f5f7fa 0%, #ffffff 100%);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.stat-box.active {
  background: linear-gradient(145deg, #E8F5E9 0%, #ffffff 100%);
}

.stat-box.warning {
  background: linear-gradient(145deg, #FFF3E0 0%, #ffffff 100%);
  border-color: rgba(255, 152, 0, 0.2);
}

.stat-box.danger {
  background: linear-gradient(145deg, #FFEBEE 0%, #ffffff 100%);
  border-color: rgba(244, 67, 54, 0.2);
}

.stat-box.empty {
  background: linear-gradient(145deg, #F5F5F5 0%, #ffffff 100%);
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1;
}

.stat-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* ========== 筛选栏 ========== */
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.filter-btn {
  flex-shrink: 0;
  padding: 10px 18px;
  border-radius: 24px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-btn.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, #F48FB1 100%);
  color: white;
  border-color: transparent;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

/* ========== 化妆品列表 ========== */
.cosmetics-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cosmetic-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.cosmetic-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.cosmetic-card.is-expiring {
  border-color: rgba(255, 152, 0, 0.3);
  background: linear-gradient(145deg, #FFFBF0 0%, #ffffff 100%);
}

.cosmetic-card.is-expired {
  border-color: rgba(244, 67, 54, 0.3);
  background: linear-gradient(145deg, #FFF5F5 0%, #ffffff 100%);
}

.cosmetic-card.is-empty {
  opacity: 0.7;
}

.card-photo {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 16px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 0;
  background: rgba(76, 175, 80, 0.9);
  color: white;
  font-size: 10px;
  font-weight: 600;
  text-align: center;
}

.card-badge.warning {
  background: rgba(255, 152, 0, 0.9);
}

.card-badge.empty {
  background: rgba(158, 158, 158, 0.9);
}

.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
}

.card-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-date {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}

.date-label {
  font-size: 11px;
  color: var(--text-tertiary);
}

.date-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
}

.date-value.is-warning {
  color: #FF9800;
}

.date-value.is-expired {
  color: #F44336;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track {
  flex: 1;
  height: 5px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-bar.is-warning {
  background: linear-gradient(90deg, #FF9800 0%, #FFC107 100%);
}

.progress-bar.is-expired {
  background: linear-gradient(90deg, #F44336 0%, #FF5722 100%);
}

.progress-text {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  width: 100px;
  height: 100px;
  margin: 0 auto 20px;
  background: linear-gradient(145deg, #FFE4EC 0%, #FFD4E5 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
  box-shadow: 0 8px 24px rgba(255, 107, 157, 0.2);
}

.empty-text {
  color: var(--text-secondary);
  font-size: 15px;
  font-weight: 500;
}

/* ========== 浮动按钮 ========== */
.fab-btn {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #E91E63 0%, #F48FB1 100%);
  color: white;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(233, 30, 99, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 50;
}

.fab-btn:hover {
  transform: scale(1.08) rotate(90deg);
  box-shadow: 0 8px 28px rgba(233, 30, 99, 0.5);
}

/* ========== 弹窗基础样式 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
}

.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
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
  border-color: var(--color-primary);
}

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
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
  border-color: transparent;
}

.remind-input {
  width: 80px !important;
  text-align: center;
}

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

.form-hint {
  text-align: center;
  padding: 0 20px 16px;
  font-size: 13px;
  color: var(--text-tertiary);
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
  background: var(--color-primary);
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

/* ========== 详情弹窗 ========== */
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
}

.detail-modal {
  background: #ffffff;
  border-radius: 28px;
  width: 100%;
  max-width: 420px;
  max-height: calc(100vh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow: hidden;
  position: relative;
  animation: slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
}

.detail-modal .detail-photo {
  flex-shrink: 0;
}

.detail-modal .detail-content {
  overflow-y: auto;
  flex: 1;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}

.detail-close:hover {
  transform: scale(1.1);
  background: #ffffff;
}

.detail-photo {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-height: 320px;
  overflow: hidden;
}

.detail-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-status {
  position: absolute;
  top: 16px;
  left: 16px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.detail-status.is-warning {
  background: linear-gradient(135deg, #FF9800 0%, #FFC107 100%);
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
}

.detail-status.is-expired {
  background: linear-gradient(135deg, #F44336 0%, #FF5722 100%);
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.detail-status.is-empty {
  background: linear-gradient(135deg, #9E9E9E 0%, #BDBDBD 100%);
}

.detail-content {
  padding: 24px;
}

.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 20px;
  line-height: 1.3;
}

.detail-timeline {
  background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.timeline-line {
  width: 2px;
  height: 30px;
  background: linear-gradient(180deg, #E0E0E0 0%, #BDBDBD 100%);
  margin-left: 7px;
  border-radius: 1px;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.timeline-dot.end {
  background: linear-gradient(135deg, #F44336 0%, #FF5722 100%);
  box-shadow: 0 2px 8px rgba(244, 67, 54, 0.3);
}

.timeline-dot.end.is-warning {
  background: linear-gradient(135deg, #FF9800 0%, #FFC107 100%);
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
}

.timeline-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.timeline-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.timeline-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.timeline-value.is-expired {
  color: #F44336;
}

.timeline-value.is-warning {
  color: #FF9800;
}

.detail-shelf {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #FFF3E0 0%, #ffffff 100%);
  border-radius: 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 152, 0, 0.15);
}

.shelf-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #FF9800 0%, #FFC107 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(255, 152, 0, 0.25);
}

.shelf-info {
  display: flex;
  flex-direction: column;
}

.shelf-label {
  font-size: 12px;
  color: var(--text-tertiary);
}

.shelf-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-progress {
  background: linear-gradient(145deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  border: 1px solid rgba(0, 0, 0, 0.04);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
}

.progress-days {
  font-size: 14px;
  font-weight: 700;
  color: #4CAF50;
}

.progress-days.is-warning {
  color: #FF9800;
}

.progress-days.is-expired {
  color: #F44336;
}

.detail-progress .progress-track {
  height: 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 5px;
  overflow: hidden;
}

.detail-progress .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50 0%, #8BC34A 100%);
  border-radius: 5px;
  transition: width 0.4s ease;
}

.detail-progress .progress-fill.is-warning {
  background: linear-gradient(90deg, #FF9800 0%, #FFC107 100%);
}

.detail-progress .progress-fill.is-expired {
  background: linear-gradient(90deg, #F44336 0%, #FF5722 100%);
}

.detail-note {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(145deg, #E3F2FD 0%, #ffffff 100%);
  border-radius: 16px;
  margin-bottom: 20px;
  border: 1px solid rgba(33, 150, 243, 0.15);
}

.note-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(135deg, #2196F3 0%, #64B5F6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.detail-note p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
}

.detail-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 16px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.action-btn .btn-icon {
  font-size: 20px;
}

.action-btn.secondary {
  background: linear-gradient(145deg, #f5f5f5 0%, #ffffff 100%);
  color: var(--text-secondary);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.action-btn.secondary:hover {
  background: linear-gradient(145deg, #eeeeee 0%, #f5f5f5 100%);
  transform: translateY(-2px);
}

.action-btn.primary {
  background: linear-gradient(135deg, #E91E63 0%, #F48FB1 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(233, 30, 99, 0.4);
}

.action-btn.danger {
  background: linear-gradient(135deg, #F44336 0%, #FF5722 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.action-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(244, 67, 54, 0.4);
}

.cosmetics-toast {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(92px + env(safe-area-inset-bottom));
  z-index: 3000;
  max-width: 440px;
  margin: 0 auto;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(45, 52, 65, 0.94);
  color: white;
  box-shadow: 0 14px 36px rgba(73, 39, 72, 0.22);
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  backdrop-filter: blur(14px);
  pointer-events: none;
}

.cosmetics-toast.success {
  background: rgba(32, 131, 91, 0.94);
}

.cosmetics-toast.warning {
  background: rgba(151, 103, 26, 0.94);
}

.cosmetics-toast.error {
  background: rgba(190, 64, 58, 0.94);
}

@media (max-width: 400px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .card-photo {
    width: 70px;
    height: 70px;
  }
  
  .detail-actions {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .action-btn {
    padding: 12px 4px;
  }
}
</style>
