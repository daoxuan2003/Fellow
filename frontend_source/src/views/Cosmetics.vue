<template>
  <div class="cosmetics-page">
    <!-- 顶部导航 -->
    <FeatureHeader title="保质期管理" eyebrow="VANITY SHELF" chapter="07" kind="cosmetics" />
    
    <!-- 主内容 -->
    <main class="main">
      <section v-if="loading && cosmetics.length === 0" class="cosmetic-state loading-state" aria-live="polite">
        <div class="state-photo-skeleton"></div>
        <div class="state-line wide"></div>
        <div class="state-line"></div>
      </section>

      <section v-else-if="loadError && cosmetics.length === 0" class="cosmetic-state error-state">
        <span>同步失败</span>
        <h2>化妆台加载失败</h2>
        <p>{{ loadError }}</p>
        <button type="button" @click="fetchCosmetics()">重新加载</button>
      </section>

      <template v-else>
      <div v-if="loadError && cosmetics.length" class="inline-error">
        <span>{{ loadError }}</span>
        <button type="button" @click="fetchCosmetics({ silent: true })">重试</button>
      </div>

      <!-- 筛选标签 -->
      <div class="filter-bar" role="tablist" aria-label="化妆品筛选">
        <button 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-btn"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          <span>{{ tab.label }}</span>
          <strong>{{ tab.count }}</strong>
        </button>
      </div>

      <div class="shelf-toolbar">
        <span>{{ filteredCosmetics.length }} 件当前显示</span>
        <button class="text-action" @click="openAddModal">添加</button>
      </div>

      <!-- 化妆品列表 -->
      <div class="cosmetics-list" v-if="filteredCosmetics.length > 0">
        <article
          v-for="item in filteredCosmetics" 
          :key="item.id"
          class="cosmetic-card"
          :class="{ 
            'is-expiring': item.isExpiringSoon && !item.isExpired,
            'is-expired': item.isExpired,
            'is-empty': item.status === 'empty',
            ['tone-' + getStatusMeta(item).tone]: true
          }"
          @click="viewDetail(item)"
        >
          <div class="card-photo">
            <img :src="item.photoUrl" :alt="item.name" />
            <div class="card-badge" :class="getStatusMeta(item).tone">
              <span>{{ getStatusMeta(item).label }}</span>
            </div>
          </div>
          <div class="card-content">
            <div class="card-topline">
              <span>{{ canManageCosmetic(item) ? '我添加' : '伴侣添加' }}</span>
              <strong :class="getStatusMeta(item).tone">{{ getTimeCopy(item) }}</strong>
            </div>
            <h3 class="card-name">{{ item.name }}</h3>
            <div class="card-meta-grid">
              <div>
                <span>开封</span>
                <strong>{{ formatDate(item.openDate) }}</strong>
              </div>
              <div>
                <span>到期</span>
                <strong :class="{ 'is-expired': item.isExpired, 'is-warning': item.isExpiringSoon }">{{ formatDate(item.expireDate) }}</strong>
              </div>
            </div>
            <div class="card-progress" v-if="item.status !== 'empty'">
              <div class="progress-track">
                <div 
                  class="progress-bar" 
                  :style="{ width: getProgressPercent(item) + '%' }"
                  :class="{ 'is-warning': item.isExpiringSoon, 'is-expired': item.isExpired }"
                ></div>
              </div>
              <span class="progress-text">{{ getProgressPercent(item) }}%</span>
            </div>
          </div>
        </article>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon" aria-hidden="true"></div>
        <p class="empty-text">{{ currentFilter === 'all' ? '还没有化妆品记录' : '这个筛选下暂无记录' }}</p>
        <button class="empty-action" @click="openAddModal">添加第一件</button>
      </div>

      <!-- 添加按钮 -->
      <button class="fab-btn" @click="openAddModal" aria-label="添加化妆品">
        <span>+</span>
      </button>

      </template>
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
                <span class="upload-icon" aria-hidden="true">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h2.2l1.1-1.4A1.5 1.5 0 0 1 11 3h2a1.5 1.5 0 0 1 1.2.6L15.3 5h2.2A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-9Z"/>
                    <circle cx="12" cy="12" r="3.2"/>
                  </svg>
                </span>
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
          <div class="detail-insight" :class="'tone-' + getStatusMeta(viewingItem).tone">
            <strong>{{ getStatusMeta(viewingItem).label }}</strong>
            <span>{{ getTimeCopy(viewingItem) }}</span>
          </div>
          
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
            <div class="shelf-icon">PAO</div>
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
            <div class="note-icon">备注</div>
            <p>{{ viewingItem.note }}</p>
          </div>
          
          <div class="detail-actions">
            <button 
              v-if="canManageCosmetic(viewingItem) && viewingItem.status !== 'empty'"
              class="action-btn secondary"
              @click="markEmpty(viewingItem.id)"
            >
              <span>标记已用完</span>
            </button>
            <button 
              v-else-if="canManageCosmetic(viewingItem)"
              class="action-btn secondary"
              @click="markActive(viewingItem.id)"
            >
              <span>恢复使用</span>
            </button>
            <button 
              v-if="canManageCosmetic(viewingItem)"
              class="action-btn primary"
              @click="editItem(viewingItem)"
            >
              <span>编辑</span>
            </button>
            <button 
              v-if="canManageCosmetic(viewingItem)"
              class="action-btn danger"
              @click="deleteItem(viewingItem.id)"
            >
              <span>删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部导航 -->

    <div
      v-if="toast.show"
      class="cosmetics-toast"
      :class="toast.type"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { createClientLogger } from '../utils/client-logger.js'
import {
  buildCosmeticDashboard,
  filterAndSortCosmetics,
  getCosmeticProgress,
  getCosmeticStatus,
  getCosmeticTimeCopy
} from '../utils/cosmetics.js'
import { formatLocalDate } from '../utils/date.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import DatePickerField from '../components/DatePickerField.vue'
import ImageCropper from '../components/ImageCropper.vue'

const userStore = useUserStore()
const currentUserId = computed(() => resolveCurrentUserId(userStore))
const logger = createClientLogger('Cosmetics')

// 状态
const cosmetics = ref([])
const currentFilter = ref('all')
const loading = ref(false)
const loadError = ref('')
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

const dashboard = computed(() => buildCosmeticDashboard(cosmetics.value))

// 筛选标签
const filterTabs = computed(() => [
  { value: 'all', label: '全部', count: dashboard.value.total },
  { value: 'active', label: '使用中', count: dashboard.value.active },
  { value: 'expiring', label: '临期', count: dashboard.value.expiring },
  { value: 'expired', label: '过期', count: dashboard.value.expired },
  { value: 'empty', label: '空瓶', count: dashboard.value.empty }
])

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
  return filterAndSortCosmetics(cosmetics.value, currentFilter.value)
})

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
  return getCosmeticProgress(item)
}

function getStatusMeta(item) {
  return getCosmeticStatus(item)
}

function getTimeCopy(item) {
  return getCosmeticTimeCopy(item)
}

function openAddModal() {
  resetForm()
  showAddModal.value = true
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

function canManageCosmetic(item) {
  return !!item?.ownerId && !!currentUserId.value && String(item.ownerId) === String(currentUserId.value)
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
    logger.error('保存化妆品失败', error)
    showToast(error.message || '网络错误，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

async function markEmpty(id) {
  const item = viewingItem.value?.id === id ? viewingItem.value : cosmetics.value.find(c => c.id === id)
  if (!canManageCosmetic(item)) {
    showToast('只有添加者才能更新状态', 'error')
    return
  }

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
    logger.error('标记已用完失败', error)
    showToast('网络错误，请重试', 'error')
  }
}

async function markActive(id) {
  const item = viewingItem.value?.id === id ? viewingItem.value : cosmetics.value.find(c => c.id === id)
  if (!canManageCosmetic(item)) {
    showToast('只有添加者才能更新状态', 'error')
    return
  }

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
    logger.error('恢复使用失败', error)
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
    logger.error('删除化妆品失败', error)
    showToast('网络错误，请重试', 'error')
  }
}

async function fetchCosmetics(options = {}) {
  const { silent = false } = options
  if (!silent || cosmetics.value.length === 0) loading.value = true
  try {
    const response = await fetch('/api/cosmetics', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    if (!response.ok) {
      throw new Error('暂时无法同步，请稍后重试')
    }
    
    const data = await response.json()
    if (data.success) {
      cosmetics.value = data.data
      loadError.value = ''
    } else {
      throw new Error('暂时无法同步，请稍后重试')
    }
  } catch (error) {
    logger.error('获取化妆品列表失败', error)
    loadError.value = error.message || '网络连接失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCosmetics()
  
  if (window.eventBus) {
    window.eventBus.on('cosmeticAdded', () => fetchCosmetics({ silent: true }))
    window.eventBus.on('cosmeticStatusChanged', () => fetchCosmetics({ silent: true }))
  }
})

// WebSocket 监听
const { onMessage } = useWebSocket()
const handleWSMessage = (data) => {
  if (data.type?.startsWith('cosmetic')) {
    logger.debug('收到 WebSocket 消息', { type: data.type })
    fetchCosmetics({ silent: true })
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
  background:
    linear-gradient(180deg, rgba(255, 252, 250, 0.98) 0%, rgba(246, 250, 247, 0.96) 58%, rgba(242, 234, 228, 0.92) 100%),
    linear-gradient(135deg, rgba(143, 61, 90, 0.08), rgba(72, 104, 86, 0.08));
  color: #261F24;
}

/* 顶部导航 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(255, 252, 250, 0.94);
  backdrop-filter: none;
  border-bottom: 1px solid rgba(50, 27, 38, 0.08);
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
  font-weight: 800;
  letter-spacing: 0;
  color: #261F24;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid rgba(50, 27, 38, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #382D34;
}

.icon-btn.add-top {
  color: #8F3D5A;
}

.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.cosmetic-state {
  display: grid;
  gap: 10px;
  min-height: 220px;
  align-content: center;
  padding: 24px 18px;
  margin-bottom: 16px;
  border-radius: 8px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  background: rgba(255, 255, 255, 0.76);
}

.cosmetic-state span {
  color: #8F3D5A;
  font-size: 12px;
  font-weight: 900;
}

.cosmetic-state h2 {
  margin: 0;
  color: #261F24;
  font-size: 24px;
  line-height: 1.2;
}

.cosmetic-state p {
  margin: 0;
  color: #5F535B;
  font-size: 14px;
  line-height: 1.55;
}

.cosmetic-state button {
  width: fit-content;
  min-height: 44px;
  border: 3px solid #20202A;
  border-radius: 10px;
  padding: 0 16px;
  background: #FFD94A;
  color: #20202A;
  box-shadow: 4px 4px 0 #20202A;
  font-weight: 900;
  cursor: pointer;
}

.state-photo-skeleton,
.state-line {
  border-radius: 8px;
  background: linear-gradient(90deg, #F2EAE4 25%, #F7FBF8 50%, #F2EAE4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.state-photo-skeleton {
  height: 190px;
}

.state-line {
  width: 62%;
  height: 16px;
}

.state-line.wide {
  width: 84%;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ========== 今日梳妆台 ========== */
.vanity-cover {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 128px;
  gap: 14px;
  padding: 16px;
  margin-bottom: 14px;
  border-radius: 8px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 252, 250, 0.96), rgba(246, 250, 247, 0.9)),
    linear-gradient(135deg, rgba(143, 61, 90, 0.1), rgba(72, 104, 86, 0.1));
}

.vanity-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: end;
}

.vanity-kicker {
  color: #8F3D5A;
  font-size: 11px;
  font-weight: 900;
}

.vanity-copy h2 {
  margin: 5px 0 7px;
  color: #261F24;
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 700;
  line-height: 1.15;
  word-break: break-word;
}

.vanity-copy p {
  margin: 0;
  color: #5F535B;
  font-size: 13px;
  line-height: 1.55;
}

.vanity-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.vanity-primary,
.vanity-secondary {
  min-height: 44px;
  border-radius: 8px;
  padding: 0 13px;
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;
}

.vanity-primary {
  border: none;
  background: #321B26;
  color: #FFFFFF;
}

.vanity-secondary {
  border: 1px solid rgba(50, 27, 38, 0.12);
  background: rgba(255, 255, 255, 0.74);
  color: #321B26;
}

.vanity-tray {
  min-width: 0;
  min-height: 178px;
  display: grid;
  grid-template-rows: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.tray-item {
  position: relative;
  min-width: 0;
  min-height: 52px;
  overflow: hidden;
  border: none;
  border-radius: 8px;
  padding: 0;
  background: #F2EAE4;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
}

.tray-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tray-item span {
  position: absolute;
  left: 6px;
  bottom: 6px;
  max-width: calc(100% - 12px);
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 252, 250, 0.92);
  color: #321B26;
  font-size: 10px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-tray {
  border: 1px dashed rgba(143, 61, 90, 0.24);
  padding: 12px;
  background: rgba(255, 255, 255, 0.64);
  color: #321B26;
  align-content: end;
  cursor: pointer;
  text-align: left;
}

.tray-empty-mark {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #F7DDE8;
  color: #8F3D5A;
  font-size: 12px;
  font-weight: 950;
}

.empty-tray strong,
.empty-tray small {
  display: block;
  min-width: 0;
}

.empty-tray strong {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 900;
}

.empty-tray small {
  margin-top: 3px;
  color: #5F535B;
  font-size: 11px;
}

.vanity-ritual-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid rgba(50, 27, 38, 0.08);
  padding-top: 12px;
}

.ritual-card {
  min-width: 0;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
  border: 1px solid rgba(50, 27, 38, 0.08);
}

.ritual-card span,
.ritual-card strong,
.ritual-card small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ritual-card span {
  color: #756872;
  font-size: 11px;
  font-weight: 850;
}

.ritual-card strong {
  margin-top: 4px;
  color: #261F24;
  font-family: var(--font-number);
  font-size: 22px;
  font-weight: 850;
}

.ritual-card small {
  margin-top: 2px;
  color: #5F535B;
  font-size: 11px;
}

.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(154, 51, 42, 0.18);
  border-radius: 8px;
  background: rgba(254, 242, 242, 0.82);
  color: #9A332A;
  font-size: 12px;
}

.inline-error button {
  min-height: 44px;
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: #9A332A;
  font-weight: 900;
  cursor: pointer;
}

/* ========== 整理策略与陈列 ========== */
.vanity-playbook {
  display: grid;
  gap: 8px;
  margin-bottom: 16px;
}

.playbook-card {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 11px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(50, 27, 38, 0.09);
}

.playbook-mark {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  background: #486856;
}

.playbook-card strong {
  display: block;
  color: #261F24;
  font-size: 14px;
  line-height: 1.25;
  font-weight: 850;
}

.playbook-card p {
  margin: 4px 0 0;
  color: #5F535B;
  font-size: 12px;
  line-height: 1.45;
}

.playbook-card.tone-warning .playbook-mark {
  background: #8A4B16;
}

.playbook-card.tone-danger .playbook-mark {
  background: #9A332A;
}

.playbook-card.tone-neutral .playbook-mark {
  background: #5F535B;
}

.vanity-shelves {
  display: grid;
  gap: 10px;
  margin-bottom: 16px;
}

.vanity-section-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.vanity-section-head span {
  display: block;
  color: #5F535B;
  font-size: 11px;
  font-weight: 800;
}

.vanity-section-head h2 {
  margin: 3px 0 0;
  color: #261F24;
  font-size: 18px;
  line-height: 1.25;
  font-weight: 850;
  letter-spacing: 0;
}

.shelf-section-grid {
  display: grid;
  gap: 10px;
}

.shelf-section-card {
  padding: 14px;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid rgba(50, 27, 38, 0.09);
}

.shelf-section-card.tone-warning {
  background: #FFF4DB;
  border-color: rgba(138, 75, 22, 0.18);
}

.shelf-section-card.tone-danger {
  background: #FFF1F1;
  border-color: rgba(154, 51, 42, 0.18);
}

.shelf-section-card.tone-active {
  background: #E6F0E9;
  border-color: rgba(72, 104, 86, 0.15);
}

.shelf-section-card.tone-neutral {
  background: #F6F1F4;
}

.shelf-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.shelf-section-header h3 {
  margin: 0;
  color: #261F24;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 850;
}

.shelf-section-header p {
  margin: 4px 0 0;
  color: #5F535B;
  font-size: 12px;
  line-height: 1.35;
}

.shelf-section-header strong {
  min-width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(23, 32, 38, 0.08);
  color: #261F24;
  font-size: 13px;
  font-weight: 850;
}

.shelf-strip {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.shelf-mini-item {
  min-width: 0;
  min-height: 70px;
  padding: 8px;
  font: inherit;
  border: 1px solid rgba(50, 27, 38, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #261F24;
  cursor: pointer;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 4px 9px;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}

.shelf-mini-item:active {
  transform: scale(0.99);
  border-color: rgba(72, 104, 86, 0.24);
  background: #E6F0E9;
}

.shelf-mini-item img {
  grid-row: 1 / span 2;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  object-fit: cover;
  background: #EFE7EC;
}

.shelf-mini-item span {
  min-width: 0;
  color: #261F24;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 850;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shelf-mini-item strong {
  min-width: 0;
  color: #5F535B;
  font-size: 10px;
  line-height: 1.2;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shelf-empty {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px dashed rgba(100, 116, 139, 0.26);
  color: #5F535B;
  font-size: 12px;
  font-weight: 750;
}

/* ========== 筛选栏 ========== */
.filter-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.filter-btn {
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  background: #ffffff;
  color: #5F535B;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.filter-btn span {
  font-size: 13px;
  font-weight: 700;
}

.filter-btn strong {
  min-width: 20px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #F2EAE4;
  font-size: 11px;
  color: #5F535B;
}

.filter-btn.active {
  background: #261F24;
  color: #ffffff;
  border-color: #261F24;
}

.filter-btn.active strong {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.shelf-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  color: #5F535B;
  font-size: 12px;
}

.text-action {
  border: none;
  background: transparent;
  color: #486856;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
}

/* ========== 化妆品列表 ========== */
.cosmetics-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cosmetic-card {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  padding: 20px;
  background: #ffffff;
  border: 3px solid #20202A;
  border-radius: 14px;
  box-shadow: 3px 4px 0 #20202A;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.cosmetic-card:hover {
  transform: translateY(-2px);
  border-color: #20202A;
}

.cosmetic-card.is-expiring {
  border-color: rgba(138, 75, 22, 0.34);
}

.cosmetic-card.is-expired {
  border-color: rgba(154, 51, 42, 0.3);
}

.cosmetic-card.is-empty {
  opacity: 0.7;
}

.card-photo {
  position: relative;
  width: 92px;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #F2EAE4;
}

.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badge {
  position: absolute;
  left: 7px;
  bottom: 7px;
  max-width: calc(100% - 14px);
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(72, 104, 86, 0.92);
  color: #ffffff;
  font-size: 10px;
  font-weight: 800;
  text-align: center;
  backdrop-filter: blur(10px);
}

.card-badge.warning,
.card-badge.danger {
  background: rgba(180, 83, 9, 0.94);
}

.card-badge.danger {
  background: rgba(185, 28, 28, 0.94);
}

.card-badge.neutral {
  background: rgba(71, 85, 105, 0.9);
}

.card-content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-topline {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 5px;
}

.card-topline span,
.card-topline strong {
  font-size: 11px;
  color: #756872;
}

.card-topline strong {
  flex-shrink: 0;
  color: #486856;
}

.card-topline strong.warning {
  color: #8A4B16;
}

.card-topline strong.danger {
  color: #9A332A;
}

.card-topline strong.neutral {
  color: #5F535B;
}

.card-name {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 850;
  color: #261F24;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 10px;
}

.card-meta-grid div {
  min-width: 0;
  padding: 7px 8px;
  border-radius: 8px;
  background: #F6F1F4;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.card-meta-grid span {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  color: #756872;
}

.card-meta-grid strong {
  display: block;
  font-size: 11px;
  line-height: 1.25;
  color: #382D34;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta-grid strong.is-warning {
  color: #8A4B16;
}

.card-meta-grid strong.is-expired {
  color: #9A332A;
}

.card-progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-track {
  flex: 1;
  height: 5px;
  background: #EFE7EC;
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #486856;
  border-radius: 3px;
  transition: opacity 0.2s ease;
}

.progress-bar.is-warning {
  background: #8A4B16;
}

.progress-bar.is-expired {
  background: #9A332A;
}

.progress-text {
  font-size: 11px;
  font-weight: 800;
  color: #5F535B;
  white-space: nowrap;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 72px 20px;
  background: #ffffff;
  border: 1px dashed rgba(100, 116, 139, 0.28);
  border-radius: 8px;
}

.empty-icon {
  position: relative;
  width: 58px;
  height: 58px;
  margin: 0 auto 20px;
  border-radius: 14px;
  border: 1px solid rgba(72, 104, 86, 0.2);
  background: #E6F0E9;
}

.empty-icon::before,
.empty-icon::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 24px;
  height: 2px;
  border-radius: 999px;
  background: #486856;
  transform: translate(-50%, -50%);
}

.empty-icon::after {
  transform: translate(-50%, -50%) rotate(90deg);
}

.empty-text {
  color: #5F535B;
  font-size: 15px;
  font-weight: 700;
}

.empty-action {
  margin-top: 14px;
  min-height: 44px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: #261F24;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
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
  background: #261F24;
  color: white;
  font-size: 28px;
  cursor: pointer;
  box-shadow: 0 16px 36px rgba(23, 32, 38, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 50;
}

.fab-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 20px 42px rgba(23, 32, 38, 0.28);
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
  background: #ffffff;
  border: 1px solid rgba(50, 27, 38, 0.1);
  border-radius: 12px;
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
  border-radius: 8px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  background: #F6F1F4;
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
  border: 1px solid rgba(50, 27, 38, 0.12);
  border-radius: 8px;
  font-size: 14px;
  background: #F6F1F4;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #486856;
}

.photo-upload {
  width: 100%;
  aspect-ratio: 1;
  max-height: 200px;
  border: 2px dashed rgba(100, 116, 139, 0.28);
  border-radius: 8px;
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
  border-radius: 8px;
  border: 1px solid rgba(50, 27, 38, 0.12);
  background: #F6F1F4;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.remind-btn.active {
  background: #486856;
  color: white;
  border-color: transparent;
}

.remind-input {
  width: 80px !important;
  text-align: center;
}

.preview-box {
  background: #F6F1F4;
  padding: 16px;
  border-radius: 8px;
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
  border-radius: 8px;
  border: none;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: #F6F1F4;
  color: var(--text-primary);
}

.btn-primary {
  background: #261F24;
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
  border-radius: 12px;
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
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: white;
  background: #486856;
  box-shadow: 0 4px 12px rgba(72, 104, 86, 0.24);
}

.detail-status.is-warning {
  background: #8A4B16;
  box-shadow: 0 4px 12px rgba(138, 75, 22, 0.24);
}

.detail-status.is-expired {
  background: #9A332A;
  box-shadow: 0 4px 12px rgba(154, 51, 42, 0.24);
}

.detail-status.is-empty {
  background: #5F535B;
}

.detail-content {
  padding: 24px;
}

.detail-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 12px;
  line-height: 1.3;
}

.detail-insight {
  display: grid;
  gap: 4px;
  padding: 12px 14px;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #E6F0E9;
  border: 1px solid rgba(72, 104, 86, 0.14);
}

.detail-insight strong {
  color: #486856;
  font-size: 13px;
  line-height: 1.2;
  font-weight: 850;
}

.detail-insight span {
  color: #5F535B;
  font-size: 12px;
  line-height: 1.4;
  font-weight: 700;
}

.detail-insight.tone-warning {
  background: #FFF4DB;
  border-color: rgba(138, 75, 22, 0.2);
}

.detail-insight.tone-warning strong {
  color: #8A4B16;
}

.detail-insight.tone-danger {
  background: #FFF1F1;
  border-color: rgba(154, 51, 42, 0.18);
}

.detail-insight.tone-danger strong {
  color: #9A332A;
}

.detail-insight.tone-neutral {
  background: #F6F1F4;
  border-color: rgba(100, 116, 139, 0.18);
}

.detail-insight.tone-neutral strong {
  color: #5F535B;
}

.detail-timeline {
  background: #F6F1F4;
  border-radius: 8px;
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
  background: #cbd5e1;
  margin-left: 7px;
  border-radius: 1px;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #486856;
  border: 3px solid #ffffff;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.timeline-dot.end {
  background: #9A332A;
  box-shadow: 0 2px 8px rgba(154, 51, 42, 0.22);
}

.timeline-dot.end.is-warning {
  background: #8A4B16;
  box-shadow: 0 2px 8px rgba(138, 75, 22, 0.22);
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
  color: #9A332A;
}

.timeline-value.is-warning {
  color: #8A4B16;
}

.detail-shelf {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: #FFF4DB;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid rgba(255, 152, 0, 0.15);
}

.shelf-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #8A4B16;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 12px;
  font-weight: 850;
  box-shadow: 0 4px 12px rgba(138, 75, 22, 0.22);
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
  background: #F6F1F4;
  border-radius: 8px;
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
  color: #486856;
}

.progress-days.is-warning {
  color: #8A4B16;
}

.progress-days.is-expired {
  color: #9A332A;
}

.detail-progress .progress-track {
  height: 10px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 5px;
  overflow: hidden;
}

.detail-progress .progress-fill {
  height: 100%;
  background: #486856;
  border-radius: 5px;
  transition: opacity 0.2s ease;
}

.detail-progress .progress-fill.is-warning {
  background: #8A4B16;
}

.detail-progress .progress-fill.is-expired {
  background: #9A332A;
}

.detail-note {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: #E5F0F4;
  border-radius: 8px;
  margin-bottom: 20px;
  border: 1px solid rgba(33, 150, 243, 0.15);
}

.note-icon {
  width: 36px;
  height: 32px;
  border-radius: 8px;
  background: #486856;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 11px;
  font-weight: 850;
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
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding: 14px 8px;
  min-height: 44px;
  border-radius: 8px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.action-btn.secondary {
  background: #F6F1F4;
  color: var(--text-secondary);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.action-btn.secondary:hover {
  background: #F2EAE4;
  transform: translateY(-2px);
}

.action-btn.primary {
  background: #261F24;
  color: white;
  box-shadow: 0 4px 12px rgba(23, 32, 38, 0.18);
}

.action-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(23, 32, 38, 0.24);
}

.action-btn.danger {
  background: #9A332A;
  color: white;
  box-shadow: 0 4px 12px rgba(154, 51, 42, 0.22);
}

.action-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(154, 51, 42, 0.28);
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
  .main {
    padding: 16px 14px 20px;
  }

  .cosmetic-state h2 {
    font-size: 20px;
    line-height: 1.3;
  }

  .vanity-cover {
    grid-template-columns: 1fr;
  }

  .vanity-tray {
    min-height: 132px;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: 1fr;
  }

  .vanity-copy h2 {
    font-size: 25px;
  }

  .vanity-ritual-grid {
    grid-template-columns: 1fr;
  }

  .cosmetic-card {
    grid-template-columns: 76px minmax(0, 1fr);
    padding: 14px;
  }

  .card-photo {
    width: 76px;
  }

  .detail-actions {
    grid-template-columns: repeat(3, 1fr);
  }

  .action-btn {
    padding: 12px 4px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .state-photo-skeleton,
  .state-line {
    animation: none;
  }

  .modal-content,
  .detail-modal {
    animation: none;
  }

  .cosmetic-card,
  .shelf-mini-item,
  .action-btn,
  .fab-btn {
    transition: none;
  }
}
</style>
