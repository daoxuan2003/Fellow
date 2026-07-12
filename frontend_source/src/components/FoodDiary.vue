<template>
  <div class="food-diary">
    <!-- 优雅头部 -->
    <div class="diary-header">
      <div class="header-content">
        <div class="header-title-row">
          <h3>美食手账</h3>
          <span class="food-count">{{ foods.length }} 家店</span>
        </div>
        <p class="header-desc">记录我们的味蕾之旅</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-bar">
      <div class="stat-block" v-if="favorites.length > 0">
        <span class="stat-value">{{ favorites.length }}</span>
        <span class="stat-label">最爱</span>
      </div>
      <div class="stat-block" v-if="wantAgain.length > 0">
        <span class="stat-value">{{ wantAgain.length }}</span>
        <span class="stat-label">想再去</span>
      </div>
      <div class="stat-block wish-count" v-if="wishes.length > 0">
        <span class="stat-value">{{ wishes.length }}</span>
        <span class="stat-label">想吃</span>
      </div>
    </div>

    <!-- 添加按钮 -->
    <button class="add-btn" @click="showAddDialog = true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>记录美食</span>
    </button>

    <!-- 美食列表 -->
    <div class="food-list">
      <div class="food-grid">
        <div 
          v-for="food in foods" 
          :key="food._id"
          class="food-card"
          @click="openDetail(food)"
        >
          <div class="card-image">
            <img :src="food.photos[0]" :alt="food.restaurant">
            <div class="card-badges">
              <span v-if="food.isOurFavorite" class="badge favorite">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
              </span>
              <span v-else-if="food.wantToGoAgain" class="badge want">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
              </span>
            </div>
            <div v-if="food.photos.length > 1" class="photo-indicator">
              <span>{{ food.photos.length }}</span>
            </div>
          </div>
          <div class="card-content">
            <h4>{{ food.restaurant }}</h4>
            <div class="food-tags" v-if="food.whatWeAte.length > 0">
              <span v-for="(item, idx) in food.whatWeAte.slice(0, 2)" :key="idx" class="tag">
                {{ item }}
              </span>
              <span v-if="food.whatWeAte.length > 2" class="tag more">+{{ food.whatWeAte.length - 2 }}</span>
            </div>
            <span class="card-date">{{ formatDateShort(food.date) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 想吃清单 -->
    <div class="wish-section" v-if="wishes.length > 0">
      <div class="wish-header">
        <div class="wish-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <span>想吃清单</span>
        </div>
        <button class="add-wish-icon" @click="showWishDialog = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>
      <div class="wish-list">
        <div v-for="wish in wishes.slice(0, 3)" :key="wish._id" class="wish-item">
          <div class="wish-dot"></div>
          <div class="wish-info">
            <span class="wish-name">{{ wish.restaurant }}</span>
            <span class="wish-reason">{{ wish.whyWeWant }}</span>
          </div>
          <button v-if="canDeleteFoodWish(wish)" class="wish-delete" @click.stop="deleteWish(wish)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div v-if="wishes.length > 3" class="wish-more">+{{ wishes.length - 3 }} 更多</div>
      </div>
    </div>

    <!-- 添加美食弹窗 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>记录美食</h3>
          <button class="close-btn" @click="closeAddDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>餐厅名</label>
            <input v-model="newFood.restaurant" placeholder="例如：海底捞火锅" type="text">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>日期</label>
              <DatePickerField v-model="newFood.date" placeholder="请选择日期" />
            </div>
            <div class="form-group">
              <label>位置</label>
              <input v-model="newFood.location" placeholder="例如：万达广场" type="text">
            </div>
          </div>
          <div class="form-group">
            <label>照片</label>
            <div class="photo-upload">
              <div v-for="(photo, index) in newFood.photos" :key="index" class="photo-preview">
                <img :src="photoPreviewSrc(photo)" alt="预览">
                <button class="remove-photo" @click="removePhoto(index)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <button class="add-photo-btn" @click="selectPhotos">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <input ref="photoInput" type="file" accept="image/*" multiple style="display: none" @change="handlePhotoSelect">
            </div>
          </div>
          <div class="form-group">
            <label>吃了什么（空格分隔）</label>
            <input v-model="whatWeAteInput" placeholder="例如：火锅 毛肚 鸭肠" type="text">
          </div>
          <div class="form-group">
            <label>感受如何</label>
            <textarea v-model="newFood.howWasIt" placeholder="记录这次用餐的感受..." rows="3"></textarea>
          </div>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input v-model="newFood.isOurFavorite" type="checkbox">
              <span class="checkmark"></span>
              <span>标记为最爱</span>
            </label>
            <label class="checkbox-label">
              <input v-model="newFood.wantToGoAgain" type="checkbox">
              <span class="checkmark"></span>
              <span>还想再去</span>
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="closeAddDialog">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submitFood">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 添加想吃弹窗 -->
    <div v-if="showWishDialog" class="dialog-overlay" @click.self="showWishDialog = false">
      <div class="dialog-content wish-dialog">
        <div class="dialog-header">
          <h3>添加想吃清单</h3>
          <button class="close-btn" @click="showWishDialog = false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>餐厅名</label>
            <input v-model="newWish.restaurant" placeholder="例如：米其林日料" type="text">
          </div>
          <div class="form-group">
            <label>为什么想吃</label>
            <textarea v-model="newWish.whyWeWant" placeholder="听说服务超好，想体验一下..." rows="3"></textarea>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="showWishDialog = false">取消</button>
          <button class="btn-primary" @click="submitWish">添加</button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedFood" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-content">
        <div class="detail-header">
          <button class="back-btn" @click="closeDetail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="header-actions">
            <button v-if="canDeleteFoodRecord(selectedFood)" class="action-btn" @click="deleteFood(selectedFood)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="detail-body">
          <!-- 照片画廊 -->
          <div class="photo-gallery" v-if="selectedFood.photos.length > 0">
            <div class="main-photo">
              <img :src="selectedFood.photos[currentPhotoIndex]" alt="">
              <button v-if="currentPhotoIndex > 0" class="nav-btn prev" @click="prevPhoto">‹</button>
              <button v-if="currentPhotoIndex < selectedFood.photos.length - 1" class="nav-btn next" @click="nextPhoto">›</button>
              <div class="photo-dots" v-if="selectedFood.photos.length > 1">
                <span 
                  v-for="(photo, index) in selectedFood.photos" 
                  :key="index"
                  :class="{ active: index === currentPhotoIndex }"
                ></span>
              </div>
            </div>
          </div>

          <!-- 信息区 -->
          <div class="detail-info">
            <h2 class="restaurant-name">{{ selectedFood.restaurant }}</h2>
            
            <div class="detail-badges">
              <span v-if="selectedFood.isOurFavorite" class="detail-badge favorite">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                </svg>
                我们的最爱
              </span>
              <span v-if="selectedFood.wantToGoAgain" class="detail-badge want">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                </svg>
                还想再去
              </span>
            </div>

            <div class="meta-info">
              <span>{{ formatDate(selectedFood.date) }}</span>
              <span v-if="selectedFood.location">· {{ selectedFood.location }}</span>
            </div>

            <!-- 吃了什么 -->
            <div v-if="selectedFood.whatWeAte.length > 0" class="section">
              <h4>我们吃了</h4>
              <div class="food-tags-large">
                <span v-for="(item, index) in selectedFood.whatWeAte" :key="index" class="food-tag">
                  {{ item }}
                </span>
              </div>
            </div>

            <!-- 感受 -->
            <div v-if="selectedFood.howWasIt" class="section">
              <h4>感受如何</h4>
              <p class="section-text">{{ selectedFood.howWasIt }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="feedback.visible"
      class="feedback-toast"
      :class="feedback.type"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ feedback.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import { todayLocalDate } from '../utils/date.js'
import { canManageCreatedRecord } from '../utils/ownership.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import DatePickerField from './DatePickerField.vue'

const props = defineProps({
  foods: {
    type: Array,
    default: () => []
  },
  wishes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:foods', 'update:wishes'])

const userStore = useUserStore()

// 状态
const showAddDialog = ref(false)
const showWishDialog = ref(false)
const selectedFood = ref(null)
const currentPhotoIndex = ref(0)
const submitting = ref(false)
const photoInput = ref(null)
const feedback = ref({
  visible: false,
  message: '',
  type: 'info'
})
const pendingFoodDeleteId = ref('')
let feedbackTimer = null
let deleteConfirmTimer = null

// 新美食数据
const newFood = ref({
  restaurant: '',
  date: todayLocalDate(),
  whatWeAte: [],
  howWasIt: '',
  wantToGoAgain: false,
  isOurFavorite: false,
  location: '',
  photos: []
})

const whatWeAteInput = ref('')

// 新想吃数据
const newWish = ref({
  restaurant: '',
  whyWeWant: ''
})

// 计算属性
const favorites = computed(() => props.foods.filter(f => f.isOurFavorite))
const wantAgain = computed(() => props.foods.filter(f => f.wantToGoAgain && !f.isOurFavorite))
const currentUserId = computed(() => resolveCurrentUserId(userStore))

async function ensureCurrentUserId() {
  if (currentUserId.value || !localStorage.getItem('token')) return

  try {
    const res = await fetch(CONFIG.API_URL + '/me', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      userStore.updateUserData(data.data, data.data.partner)
    }
  } catch (e) {
    console.error('获取用户信息失败:', e)
  }
}

function canDeleteFoodWish(wish) {
  return canManageCreatedRecord(wish, currentUserId.value)
}

function canDeleteFoodRecord(food) {
  return canManageCreatedRecord(food, currentUserId.value)
}

function showFeedback(message, type = 'info') {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  feedback.value = { visible: true, message, type }
  feedbackTimer = setTimeout(() => {
    feedback.value = { ...feedback.value, visible: false }
    feedbackTimer = null
  }, 2800)
}

function requireSecondDeleteClick(id) {
  if (pendingFoodDeleteId.value === id) {
    pendingFoodDeleteId.value = ''
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = null
    return true
  }

  pendingFoodDeleteId.value = id
  showFeedback('再次点击删除按钮确认删除', 'warning')
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
  deleteConfirmTimer = setTimeout(() => {
    pendingFoodDeleteId.value = ''
    deleteConfirmTimer = null
  }, 4200)
  return false
}

onUnmounted(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
})

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// 打开详情
function openDetail(food) {
  selectedFood.value = food
  currentPhotoIndex.value = 0
}

// 关闭详情
function closeDetail() {
  selectedFood.value = null
}

// 照片导航
function prevPhoto() {
  if (currentPhotoIndex.value > 0) currentPhotoIndex.value--
}

function nextPhoto() {
  if (selectedFood.value && currentPhotoIndex.value < selectedFood.value.photos.length - 1) {
    currentPhotoIndex.value++
  }
}

function photoPreviewSrc(photo) {
  return typeof photo === 'string' ? photo : photo?.url || ''
}

function photoSubmitPath(photo) {
  return typeof photo === 'string' ? photo : photo?.path || ''
}

// 关闭添加弹窗
function closeAddDialog() {
  showAddDialog.value = false
  resetForm()
}

// 重置表单
function resetForm() {
  newFood.value = {
    restaurant: '',
    date: todayLocalDate(),
    whatWeAte: [],
    howWasIt: '',
    wantToGoAgain: false,
    isOurFavorite: false,
    location: '',
    photos: []
  }
  whatWeAteInput.value = ''
}

// 选择照片
function selectPhotos() {
  photoInput.value?.click()
}

// 处理照片选择
async function handlePhotoSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return

  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${CONFIG.API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const data = await res.json()
      if (data.success) {
        newFood.value.photos.push({ path: data.data.path, url: data.data.url })
      } else {
        showFeedback(data.message || '照片上传失败，请稍后再试', 'error')
      }
    } catch (e) {
      console.error('上传照片失败:', e)
      showFeedback('照片上传失败，请稍后再试', 'error')
    }
  }
}

// 移除照片
function removePhoto(index) {
  newFood.value.photos.splice(index, 1)
}

// 提交美食记录
async function submitFood() {
  if (!newFood.value.restaurant.trim()) {
    showFeedback('请输入餐厅名', 'warning')
    return
  }

  submitting.value = true

  try {
    const whatWeAte = whatWeAteInput.value.split(/\s+/).filter(i => i)
    
    const res = await fetch(`${CONFIG.API_URL}/foods`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ...newFood.value,
        photos: newFood.value.photos.map(photoSubmitPath).filter(Boolean),
        whatWeAte
      })
    })

    const data = await res.json()
    if (data.success) {
      emit('update:foods', [data.data, ...props.foods])
      closeAddDialog()
      showFeedback('美食记录已保存', 'success')
    } else {
      showFeedback(data.message || '保存失败，请稍后再试', 'error')
    }
  } catch (e) {
    console.error('保存失败:', e)
    showFeedback('保存失败，请稍后再试', 'error')
  } finally {
    submitting.value = false
  }
}

// 删除美食记录
async function deleteFood(food) {
  if (!canDeleteFoodRecord(food)) {
    showFeedback('只能删除自己创建的美食记录', 'warning')
    return
  }

  const id = food._id
  if (!requireSecondDeleteClick(id)) return

  try {
    const res = await fetch(`${CONFIG.API_URL}/foods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()

    if (data.success) {
      emit('update:foods', props.foods.filter(f => f._id !== id))
      closeDetail()
      showFeedback('美食记录已删除', 'success')
    } else {
      showFeedback(data.message || '删除失败，请稍后再试', 'error')
    }
  } catch (e) {
    console.error('删除失败:', e)
    showFeedback('删除失败，请稍后再试', 'error')
  }
}

// 提交想吃
async function submitWish() {
  if (!newWish.value.restaurant.trim()) {
    showFeedback('请输入餐厅名', 'warning')
    return
  }

  try {
    const res = await fetch(`${CONFIG.API_URL}/food-wishes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(newWish.value)
    })

    const data = await res.json()
    if (data.success) {
      emit('update:wishes', [data.data, ...props.wishes])
      showWishDialog.value = false
      newWish.value = { restaurant: '', whyWeWant: '' }
      showFeedback('想吃清单已添加', 'success')
    } else {
      showFeedback(data.message || '添加失败，请稍后再试', 'error')
    }
  } catch (e) {
    console.error('添加失败:', e)
    showFeedback('添加失败，请稍后再试', 'error')
  }
}

// 删除想吃
async function deleteWish(wish) {
  if (!canDeleteFoodWish(wish)) {
    showFeedback('只能移除自己添加的想吃', 'warning')
    return
  }

  const id = wish._id
  try {
    const res = await fetch(`${CONFIG.API_URL}/food-wishes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()

    if (data.success) {
      emit('update:wishes', props.wishes.filter(w => w._id !== id))
      showFeedback('想吃清单已移除', 'success')
    } else {
      showFeedback(data.message || '删除失败，请稍后再试', 'error')
    }
  } catch (e) {
    console.error('删除失败:', e)
    showFeedback('删除失败，请稍后再试', 'error')
  }
}

onMounted(() => {
  ensureCurrentUserId()
})
</script>

<style scoped>
.food-diary {
  background: linear-gradient(180deg, #fafafa 0%, #f5f5f5 100%);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0,0,0,0.06);
}

/* 优雅头部 */
.diary-header {
  background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
  padding: 24px 20px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.diary-header h3 {
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  letter-spacing: 0.5px;
}

.food-count {
  color: rgba(255,255,255,0.6);
  font-size: 13px;
  font-weight: 400;
}

.header-desc {
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  margin: 0;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 1px;
  background: rgba(0,0,0,0.05);
}

.stat-block {
  flex: 1;
  background: white;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #2d3436;
}

.stat-label {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-block.wish-count .stat-value {
  color: #e17055;
}

/* 添加按钮 */
.add-btn {
  width: calc(100% - 40px);
  margin: 20px auto 0;
  padding: 14px;
  background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(45, 52, 54, 0.2);
}

.add-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(45, 52, 54, 0.3);
}

/* 美食列表 */
.food-list {
  padding: 20px;
}

.food-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.food-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: all 0.3s ease;
}

.food-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}

.card-image {
  position: relative;
  aspect-ratio: 4/3;
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badges {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 6px;
}

.badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}

.badge.favorite {
  background: white;
  color: #e84393;
}

.badge.want {
  background: white;
  color: #fdcb6e;
}

.photo-indicator {
  position: absolute;
  bottom: 10px;
  right: 10px;
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 11px;
  font-weight: 500;
}

.card-content {
  padding: 14px;
}

.card-content h4 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: #2d3436;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.food-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.tag {
  padding: 4px 10px;
  background: #f8f9fa;
  border-radius: 12px;
  font-size: 11px;
  color: #636e72;
}

.tag.more {
  background: #dfe6e9;
  color: #2d3436;
}

.card-date {
  font-size: 11px;
  color: #b2bec3;
}

/* 想吃清单 */
.wish-section {
  margin: 0 20px 20px;
  padding: 16px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.wish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.wish-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #2d3436;
}

.wish-title svg {
  color: #e17055;
}

.add-wish-icon {
  width: 28px;
  height: 28px;
  border: none;
  background: #f8f9fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #e17055;
  transition: all 0.2s;
}

.add-wish-icon:hover {
  background: #e17055;
  color: white;
}

.wish-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.wish-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
  transition: all 0.2s;
}

.wish-item:hover {
  background: #f1f2f6;
}

.wish-dot {
  width: 8px;
  height: 8px;
  background: #e17055;
  border-radius: 50%;
  flex-shrink: 0;
}

.wish-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.wish-name {
  font-size: 13px;
  font-weight: 500;
  color: #2d3436;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-reason {
  font-size: 11px;
  color: #b2bec3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #b2bec3;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.wish-item:hover .wish-delete {
  opacity: 1;
}

.wish-delete:hover {
  background: #fee;
  color: #e74c3c;
}

.wish-more {
  text-align: center;
  font-size: 12px;
  color: #b2bec3;
  padding: 8px;
}

/* 弹窗 */
.dialog-overlay, .detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-content {
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 420px;
  max-height: 85vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.dialog-content.wish-dialog {
  max-width: 360px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #2d3436;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f8f9fa;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #f1f2f6;
}

.dialog-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #636e72;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #dfe6e9;
  border-radius: 12px;
  font-size: 14px;
  background: #f8f9fa;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #2d3436;
  background: white;
}

.checkbox-group {
  display: flex;
  gap: 20px;
  margin-top: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 14px;
  color: #2d3436;
}

.checkbox-label input {
  display: none;
}

.checkmark {
  width: 20px;
  height: 20px;
  border: 2px solid #dfe6e9;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.checkbox-label input:checked + .checkmark {
  background: #2d3436;
  border-color: #2d3436;
}

.checkbox-label input:checked + .checkmark::after {
  content: '✓';
  color: white;
  font-size: 12px;
}

.photo-upload {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.photo-preview {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-photo {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-photo-btn {
  width: 70px;
  height: 70px;
  border: 2px dashed #dfe6e9;
  border-radius: 12px;
  background: #f8f9fa;
  color: #b2bec3;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.add-photo-btn:hover {
  border-color: #2d3436;
  color: #2d3436;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f8f9fa;
  color: #636e72;
}

.btn-secondary:hover {
  background: #f1f2f6;
}

.btn-primary {
  background: linear-gradient(135deg, #2d3436 0%, #636e72 100%);
  color: white;
}

.btn-primary:hover {
  opacity: 0.95;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 详情页 */
.detail-content {
  background: white;
  width: 100%;
  height: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
}

.detail-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 10;
  background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 100%);
}

.back-btn, .action-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.9);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #2d3436;
  backdrop-filter: blur(10px);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
}

.photo-gallery {
  width: 100%;
}

.main-photo {
  position: relative;
  width: 100%;
  height: 45vh;
  background: #f0f0f0;
}

.main-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border: none;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #2d3436;
  font-size: 24px;
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.nav-btn.prev { left: 16px; }
.nav-btn.next { right: 16px; }

.photo-dots {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
}

.photo-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  transition: all 0.3s;
}

.photo-dots span.active {
  width: 20px;
  border-radius: 3px;
  background: white;
}

.detail-info {
  padding: 24px;
}

.restaurant-name {
  margin: 0 0 12px;
  font-size: 24px;
  font-weight: 700;
  color: #2d3436;
}

.detail-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.detail-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.detail-badge.favorite {
  background: #ffeef8;
  color: #e84393;
}

.detail-badge.want {
  background: #fff8e7;
  color: #f39c12;
}

.meta-info {
  font-size: 14px;
  color: #b2bec3;
  margin-bottom: 24px;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #636e72;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.food-tags-large {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.food-tag {
  padding: 10px 18px;
  background: #f8f9fa;
  border-radius: 20px;
  font-size: 14px;
  color: #2d3436;
}

.section-text {
  margin: 0;
  font-size: 15px;
  line-height: 1.8;
  color: #636e72;
}

.feedback-toast {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(22px + env(safe-area-inset-bottom));
  z-index: 3000;
  max-width: 440px;
  margin: 0 auto;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(45, 52, 54, 0.94);
  color: #fff;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.22);
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  backdrop-filter: blur(14px);
  pointer-events: none;
}

.feedback-toast.success {
  background: rgba(32, 131, 91, 0.94);
}

.feedback-toast.warning {
  background: rgba(151, 103, 26, 0.94);
}

.feedback-toast.error {
  background: rgba(190, 64, 58, 0.94);
}
</style>
