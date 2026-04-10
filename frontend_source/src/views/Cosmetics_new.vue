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
        <span class="header-title">化妆品管�?/span>
        <div class="icon-placeholder"></div>
      </div>
    </header>
    
    <!-- 主内�?-->
    <main class="main">
      <!-- 统计卡片 - 精致设计 -->
    <div class="cosmetics-stats-panel">
      <div class="cosmetics-stats-header">
        <span class="cosmetics-stats-title">我的化妆�?/span>
        <span class="cosmetics-total">{{ cosmetics.length }}件商�?/span>
      </div>
      <div class="cosmetics-stats-grid">
        <div class="cosmetics-stat-card active">
          <div class="cosmetics-stat-icon">�?/div>
          <div class="cosmetics-stat-info">
            <span class="cosmetics-stat-value">{{ activeCount }}</span>
            <span class="cosmetics-stat-name">使用�?/span>
          </div>
        </div>
        <div class="cosmetics-stat-card warning" v-if="expiringCount > 0">
          <div class="cosmetics-stat-icon">⚠️</div>
          <div class="cosmetics-stat-info">
            <span class="cosmetics-stat-value">{{ expiringCount }}</span>
            <span class="cosmetics-stat-name">即将过期</span>
          </div>
        </div>
        <div class="cosmetics-stat-card danger" v-if="expiredCount > 0">
          <div class="cosmetics-stat-icon">🚫</div>
          <div class="cosmetics-stat-info">
            <span class="cosmetics-stat-value">{{ expiredCount }}</span>
            <span class="cosmetics-stat-name">已过�?/span>
          </div>
        </div>
        <div class="cosmetics-stat-card empty" v-if="emptyCount > 0">
          <div class="cosmetics-stat-icon">📥</div>
          <div class="cosmetics-stat-info">
            <span class="cosmetics-stat-value">{{ emptyCount }}</span>
            <span class="cosmetics-stat-name">已用�?/span>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态筛�?- 精致样式 -->
    <div class="cosmetics-filter">
      <button 
        v-for="tab in filterTabs" 
        :key="tab.value"
        class="cosmetics-filter-btn"
        :class="{ active: currentFilter === tab.value }"
        @click="currentFilter = tab.value"
      >
        <span class="filter-dot" v-if="tab.value === 'expiring'"></span>
        {{ tab.label }}
      </button>
    </div>

    <!-- 化妆品列�?- 精致卡片设计 -->
    <div class="cosmetics-list" v-if="filteredCosmetics.length > 0">
      <div 
        v-for="item in filteredCosmetics" 
        :key="item.id"
        class="cosmetic-item"
        :class="{ 
          'is-expiring': item.isExpiringSoon && !item.isExpired,
          'is-expired': item.isExpired,
          'is-empty': item.status === 'empty'
        }"
        @click="viewDetail(item)"
      >
        <div class="cosmetic-item-photo">
          <img :src="item.photoUrl" :alt="item.name" />
          <div class="cosmetic-item-status" v-if="item.isExpired">
            <span class="status-icon">🚫</span>
            <span>已过�?/span>
          </div>
          <div class="cosmetic-item-status is-warning" v-else-if="item.isExpiringSoon">
            <span class="status-icon">⚠️</span>
            <span>{{ item.daysLeft }}�?/span>
          </div>
          <div class="cosmetic-item-status is-empty" v-else-if="item.status === 'empty'">
            <span class="status-icon">📥</span>
            <span>已用�?/span>
          </div>
        </div>
        <div class="cosmetic-item-content">
          <h3 class="cosmetic-item-name">{{ item.name }}</h3>
          <div class="cosmetic-item-date">
            <span class="date-label">过期日期</span>
            <span class="date-value" :class="{ 'is-expired': item.isExpired, 'is-warning': item.isExpiringSoon }">
              {{ formatDate(item.expireDate) }}
            </span>
          </div>
          <div class="cosmetic-item-progress" v-if="item.status !== 'empty'">
            <div class="item-progress-track">
              <div 
                class="item-progress-fill" 
                :style="{ width: getProgressPercent(item) + '%' }"
                :class="{ 'is-warning': item.isExpiringSoon, 'is-expired': item.isExpired }"
              ></div>
            </div>
            <span class="item-progress-text">{{ item.daysLeft > 0 ? '�? + item.daysLeft + '�? : '已过�? }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状�?-->
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
          <h3>{{ editingItem ? '编辑化妆�? : '添加化妆�? }}</h3>
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
              placeholder="例如：SK-II 神仙�?
              maxlength="100"
            />
          </div>
          
          <div class="form-row">
            <div class="form-group flex-1">
              <label>开封日�?<span class="required">*</span></label>
              <DatePickerField v-model="form.openDate" display-class="date-input" placeholder="请选择日期" />
            </div>
            <div class="form-group flex-1">
              <label>保质�?�? <span class="required">*</span></label>
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
                {{ days }}�?
              </button>
              <input 
                v-model.number="form.remindDaysBefore"
                type="number"
                class="remind-input"
                placeholder="自定�?
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
            <span class="preview-label">预计过期日期�?/span>
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
            {{ submitting ? '保存�?..' : '保存' }}
          </button>
        </div>
        <div v-if="!canSubmit && !submitting" class="form-hint">
          <span v-if="!form?.value?.name">请填写产品名�?/span>
          <span v-else-if="!form?.value?.openDate">请选择开封日�?/span>
          <span v-else-if="!form?.value?.shelfLifeMonths">请填写保质期</span>
          <span v-else-if="!photoPreview && !editingItem">请上传产品照�?/span>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 - 精致设计 -->
    <div class="modal-overlay cosmetic-detail-overlay" v-if="viewingItem" @click="viewingItem = null">
      <div class="cosmetic-detail-modal" @click.stop>
        <!-- 关闭按钮 -->
        <button class="cosmetic-detail-close" @click="viewingItem = null">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
        
        <!-- 照片区域 -->
        <div class="cosmetic-detail-photo">
          <img :src="viewingItem.photoUrl" :alt="viewingItem.name" />
          <div class="cosmetic-detail-status" 
               :class="{ 
                 'is-expired': viewingItem.isExpired, 
                 'is-warning': viewingItem.isExpiringSoon && !viewingItem.isExpired,
                 'is-empty': viewingItem.status === 'empty'
               }">
            <span v-if="viewingItem.isExpired">已过�?/span>
            <span v-else-if="viewingItem.status === 'empty'">已用�?/span>
            <span v-else-if="viewingItem.isExpiringSoon">即将过期</span>
            <span v-else>使用�?/span>
          </div>
        </div>
        
        <!-- 信息区域 -->
        <div class="cosmetic-detail-content">
          <h2 class="cosmetic-detail-name">{{ viewingItem.name }}</h2>
          
          <!-- 时间轴展�?-->
          <div class="cosmetic-detail-timeline">
            <div class="timeline-item">
              <div class="timeline-dot"></div>
              <div class="timeline-info">
                <span class="timeline-label">开封日�?/span>
                <span class="timeline-value">{{ formatDate(viewingItem.openDate) }}</span>
              </div>
            </div>
            <div class="timeline-line"></div>
            <div class="timeline-item">
              <div class="timeline-dot is-end" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }"></div>
              <div class="timeline-info">
                <span class="timeline-label">过期日期</span>
                <span class="timeline-value" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }">
                  {{ formatDate(viewingItem.expireDate) }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- 保质期信�?-->
          <div class="cosmetic-detail-shelf">
            <div class="shelf-icon">📋</div>
            <div class="shelf-info">
              <span class="shelf-label">保质�?/span>
              <span class="shelf-value">{{ viewingItem.shelfLifeMonths }}个月</span>
            </div>
          </div>
          
          <!-- 进度�?-->
          <div class="cosmetic-detail-progress" v-if="viewingItem.status !== 'empty'">
            <div class="progress-header">
              <span class="progress-label">使用进度</span>
              <span class="progress-days" :class="{ 'is-expired': viewingItem.isExpired, 'is-warning': viewingItem.isExpiringSoon }">
                {{ viewingItem.isExpired ? `已过�?${Math.abs(viewingItem.daysLeft)} 天` : `还剩 ${viewingItem.daysLeft} 天` }}
              </span>
            </div>
            <div class="detail-progress-track">
              <div 
                class="detail-progress-fill" 
                :style="{ width: getProgressPercent(viewingItem) + '%' }"
                :class="{ 'is-warning': viewingItem.isExpiringSoon, 'is-expired': viewingItem.isExpired }"
              ></div>
            </div>
          </div>
          
          <!-- 备注 -->
          <div v-if="viewingItem.note" class="cosmetic-detail-note">
            <div class="note-icon">📝</div>
            <p>{{ viewingItem.note }}</p>
          </div>
          
          <!-- 操作按钮 -->
          <div class="cosmetic-detail-actions">
            <button 
              v-if="viewingItem.status !== 'empty'"
              class="action-btn is-secondary"
              @click="markEmpty(viewingItem.id)"
            >
              <span class="btn-icon">📥</span>
              <span>标记已用�?/span>
            </button>
            <button 
              v-else
              class="action-btn is-secondary"
              @click="markActive(viewingItem.id)"
            >
              <span class="btn-icon">🔄</span>
              <span>恢复使用</span>
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="action-btn is-primary"
              @click="editItem(viewingItem)"
            >
              <span class="btn-icon">✏️</span>
              <span>编辑</span>
            </button>
            <button 
              v-if="viewingItem.ownerId === currentUserId"
              class="action-btn is-danger"
              @click="deleteItem(viewingItem.id)"
            >
              <span class="btn-icon">🗑�?/span>
              <span>删除</span>
            </button>
          </div>
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
import DatePickerField from '../components/DatePickerField.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

// 状�?
const cosmetics = ref([])
const currentFilter = ref('all')
const showAddModal = ref(false)
const editingItem = ref(null)
const viewingItem = ref(null)
const submitting = ref(false)
const photoPreview = ref('')
const photoFile = ref(null)
const fileInput = ref(null)

// 筛选标�?
const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'active', label: '使用�? },
  { value: 'expiring', label: '即将过期' },
  { value: 'expired', label: '已过�? },
  { value: 'empty', label: '已用�? }
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
  openDate: getTodayStr(),
  shelfLifeMonths: 12,
  remindDaysBefore: 30,
  note: ''
})

// 获取今天日期字符串（本地时区�?
function getTodayStr() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 计算属�?
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
  return form?.value?.name && form?.value?.openDate && form?.value?.shelfLifeMonths && (photoPreview.value || editingItem.value)
})

const calculatedExpireDate = computed(() => {
  if (!form.value.openDate || !form.value.shelfLifeMonths) return ''
  const date = new Date(form.value.openDate + 'T00:00:00')
  const months = parseFloat(form.value.shelfLifeMonths)
  date.setMonth(date.getMonth() + Math.floor(months))
  date.setDate(date.getDate() + Math.round((months % 1) * 30)) // 小数部分�?0�?月换�?
  return formatDate(date.toISOString().split('T')[0])
})

// 方法
function formatDate(dateStr) {
  // 加上时间部分避免 UTC 时区问题
  const date = new Date(dateStr + 'T00:00:00')
  return `${date.getFullYear()}�?{date.getMonth() + 1}�?{date.getDate()}日`
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
  return data.data.key  // 返回 photoKey 而不是 url
}

async function submitForm() {
  if (!canSubmit.value) return
  
  submitting.value = true
  try {
    let photoKey = editingItem.value?.photoKey || ''
    
    // 如果有新上传的照片
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
    } else {
      alert(data.message || '保存失败')
    }
  } catch (error) {
    console.error('保存化妆品失�?', error)
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
    console.error('标记已用完失�?', error)
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
    console.error('删除化妆品失�?', error)
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
    console.error('获取化妆品列表失�?', error)
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
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
}

/* ========== ������ʽ ========== */
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

/* �������� */
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

