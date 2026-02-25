<template>
  <div class="food-diary">
    <!-- 统计 -->
    <div class="diary-stats">
      <div class="stat-item">
        <span class="stat-number">{{ foods.length }}</span>
        <span class="stat-label">家店</span>
      </div>
      <div class="stat-item" v-if="favorites.length > 0">
        <span class="stat-number">{{ favorites.length }}</span>
        <span class="stat-label">最爱</span>
      </div>
      <div class="stat-item" v-if="wantAgain.length > 0">
        <span class="stat-number">{{ wantAgain.length }}</span>
        <span class="stat-label">想再去</span>
      </div>
    </div>

    <!-- 添加按钮 -->
    <button class="add-btn" @click="showAddDialog = true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      记录美食
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
          <div class="card-tape"></div>
          <div class="card-photo">
            <img :src="food.photos[0]" :alt="food.restaurant">
            <div class="card-badges">
              <span v-if="food.isOurFavorite" class="badge favorite">❤️ 最爱</span>
              <span v-else-if="food.wantToGoAgain" class="badge want">💛 想再去</span>
            </div>
            <div class="photo-count" v-if="food.photos.length > 1">{{ food.photos.length }}张</div>
          </div>
          <div class="card-content">
            <h4>{{ food.restaurant }}</h4>
            <div class="card-foods" v-if="food.whatWeAte.length > 0">
              <span v-for="(item, idx) in food.whatWeAte.slice(0, 2)" :key="idx" class="food-tag">
                {{ item }}
              </span>
              <span v-if="food.whatWeAte.length > 2" class="more">+{{ food.whatWeAte.length - 2 }}</span>
            </div>
            <div class="card-date">{{ formatDateShort(food.date) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 想吃清单 -->
    <div class="wish-list">
      <div class="wish-header">
        <div class="wish-title">
          <span>🔖</span>
          <span>想吃清单</span>
        </div>
        <span class="wish-count">{{ wishes.length }}家</span>
      </div>
      <div class="wish-items" v-if="wishes.length > 0">
        <div v-for="wish in wishes.slice(0, 3)" :key="wish._id" class="wish-item">
          <div class="wish-icon">🍽️</div>
          <div class="wish-info">
            <p class="wish-name">{{ wish.restaurant }}</p>
            <p class="wish-reason">{{ wish.whyWeWant }}</p>
          </div>
          <button class="wish-delete" @click.stop="deleteWish(wish._id)">×</button>
        </div>
        <p v-if="wishes.length > 3" class="wish-more">+{{ wishes.length - 3 }} 更多</p>
      </div>
      <button class="add-wish-btn" @click="showWishDialog = true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加想吃的店
      </button>
    </div>

    <!-- 添加美食弹窗 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>记录美食</h3>
          <button class="close-btn" @click="closeAddDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>餐厅名</label>
            <input v-model="newFood.restaurant" placeholder="如：海底捞" type="text">
          </div>
          <div class="form-group">
            <label>日期</label>
            <input v-model="newFood.date" type="date">
          </div>
          <div class="form-group">
            <label>位置</label>
            <input v-model="newFood.location" placeholder="如：万达广场" type="text">
          </div>
          <div class="form-group">
            <label>照片</label>
            <div class="photo-upload">
              <div v-for="(photo, index) in newFood.photos" :key="index" class="photo-preview">
                <img :src="photo" alt="预览">
                <button class="remove-photo" @click="removePhoto(index)">×</button>
              </div>
              <button class="add-photo-btn" @click="selectPhotos">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <input ref="photoInput" type="file" accept="image/*" multiple style="display: none" @change="handlePhotoSelect">
            </div>
          </div>
          <div class="form-group">
            <label>吃了什么（用空格分隔）</label>
            <input v-model="whatWeAteInput" placeholder="如：火锅 毛肚 鸭肠" type="text">
          </div>
          <div class="form-group">
            <label>感受如何</label>
            <textarea v-model="newFood.howWasIt" placeholder="记录这次用餐的感受..." rows="3"></textarea>
          </div>
          <div class="form-group checkbox-group">
            <label class="checkbox">
              <input v-model="newFood.isOurFavorite" type="checkbox">
              <span>❤️ 我们的最爱</span>
            </label>
            <label class="checkbox">
              <input v-model="newFood.wantToGoAgain" type="checkbox">
              <span>💛 还想再去</span>
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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>餐厅名</label>
            <input v-model="newWish.restaurant" placeholder="如：米其林日料" type="text">
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
          <div class="header-left">
            <div class="header-icon">🍽️</div>
            <span>美食手账</span>
          </div>
          <button class="close-btn" @click="closeDetail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <div class="detail-body">
          <div class="detail-date">
            <span>📅 {{ formatDate(selectedFood.date) }}</span>
          </div>

          <h2 class="restaurant-name">{{ selectedFood.restaurant }}</h2>
          
          <div class="detail-badges">
            <span v-if="selectedFood.isOurFavorite" class="badge favorite">❤️ 我们的最爱</span>
            <span v-if="selectedFood.wantToGoAgain" class="badge want">💛 还想再去</span>
          </div>

          <!-- 照片画廊 -->
          <div class="photo-gallery" v-if="selectedFood.photos.length > 0">
            <div class="main-photo">
              <img :src="selectedFood.photos[currentPhotoIndex]" alt="">
              <button v-if="currentPhotoIndex > 0" class="nav-btn prev" @click="prevPhoto">‹</button>
              <button v-if="currentPhotoIndex < selectedFood.photos.length - 1" class="nav-btn next" @click="nextPhoto">›</button>
              <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ selectedFood.photos.length }}</div>
            </div>
            <div class="thumbnails" v-if="selectedFood.photos.length > 1">
              <img 
                v-for="(photo, index) in selectedFood.photos" 
                :key="index"
                :src="photo" 
                :class="{ active: index === currentPhotoIndex }"
                @click="currentPhotoIndex = index"
              >
            </div>
          </div>

          <!-- 吃了什么 -->
          <div class="section" v-if="selectedFood.whatWeAte.length > 0">
            <h4><span class="section-bar"></span>我们吃了</h4>
            <div class="food-tags">
              <span v-for="(item, index) in selectedFood.whatWeAte" :key="index" class="food-tag">
                {{ item }}
              </span>
            </div>
          </div>

          <!-- 感受 -->
          <div class="section" v-if="selectedFood.howWasIt">
            <h4><span class="section-bar pink"></span>感受如何</h4>
            <p class="section-text">{{ selectedFood.howWasIt }}</p>
          </div>

          <!-- 位置 -->
          <div class="section location" v-if="selectedFood.location">
            <span>📍 {{ selectedFood.location }}</span>
          </div>
        </div>

        <div class="detail-footer">
          <button class="delete-btn" @click="deleteFood(selectedFood._id)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CONFIG } from '../utils/config.js'

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

// 状态
const showAddDialog = ref(false)
const showWishDialog = ref(false)
const selectedFood = ref(null)
const currentPhotoIndex = ref(0)
const submitting = ref(false)
const photoInput = ref(null)

// 新美食数据
const newFood = ref({
  restaurant: '',
  date: new Date().toISOString().split('T')[0],
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
const uniqueDishesCount = computed(() => {
  const allDishes = props.foods.flatMap(f => f.whatWeAte)
  return new Set(allDishes).size
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
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
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

// 关闭添加弹窗
function closeAddDialog() {
  showAddDialog.value = false
  resetForm()
}

// 重置表单
function resetForm() {
  newFood.value = {
    restaurant: '',
    date: new Date().toISOString().split('T')[0],
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
        newFood.value.photos.push(data.data.url)
      }
    } catch (e) {
      console.error('上传照片失败:', e)
    }
  }
}

// 移除照片
function removePhoto(index) {
  newFood.value.photos.splice(index, 1)
}

// 提交美食记录
async function submitFood() {
  if (!newFood.value.restaurant) {
    alert('请输入餐厅名')
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
        whatWeAte
      })
    })

    const data = await res.json()
    if (data.success) {
      emit('update:foods', [data.data, ...props.foods])
      closeAddDialog()
    }
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    submitting.value = false
  }
}

// 删除美食记录
async function deleteFood(id) {
  if (!confirm('确定要删除这条美食记录吗？')) return

  try {
    const res = await fetch(`${CONFIG.API_URL}/foods/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })

    if (res.ok) {
      emit('update:foods', props.foods.filter(f => f._id !== id))
      closeDetail()
    }
  } catch (e) {
    console.error('删除失败:', e)
  }
}

// 提交想吃
async function submitWish() {
  if (!newWish.value.restaurant) {
    alert('请输入餐厅名')
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
    }
  } catch (e) {
    console.error('添加失败:', e)
  }
}

// 删除想吃
async function deleteWish(id) {
  try {
    const res = await fetch(`${CONFIG.API_URL}/food-wishes/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })

    if (res.ok) {
      emit('update:wishes', props.wishes.filter(w => w._id !== id))
    }
  } catch (e) {
    console.error('删除失败:', e)
  }
}
</script>

<style scoped>
.food-diary {
  background: white;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

/* 统计 */
.diary-stats {
  display: flex;
  gap: 24px;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #f59e0b;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-card {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.stat-card.favorites {
  background: #fce7f3;
  border: 1px solid #fbcfe8;
}

.stat-card.want-again {
  background: #ffedd5;
  border: 1px solid #fed7aa;
}

.stat-card.total {
  background: #fef3c7;
  border: 1px solid #fde68a;
  color: #92400e;
}

.stat-card strong {
  font-size: 16px;
}

.stat-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-tags .tag {
  background: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  white-space: nowrap;
}

.favorites .tag {
  color: #db2777;
}

.want-again .tag {
  color: #ea580c;
}

/* 添加按钮 */
.add-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
  cursor: pointer;
}

/* 美食卡片 */
.food-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.food-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  border: 1px solid #fef3c7;
  cursor: pointer;
  position: relative;
}

.card-tape {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 32px;
  height: 14px;
  background: rgba(245, 158, 11, 0.4);
  z-index: 2;
}

.card-photo {
  position: relative;
  aspect-ratio: 4/3;
}

.card-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.badge.favorite {
  background: #ec4899;
  color: white;
}

.badge.want {
  background: #f97316;
  color: white;
}

.photo-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.5);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
}

.card-content {
  padding: 12px;
}

.card-content h4 {
  margin: 0 0 6px;
  font-size: 14px;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-foods {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.food-tag {
  background: #fffbeb;
  color: #b45309;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 10px;
}

.more {
  color: #999;
  font-size: 10px;
}

.card-date {
  color: #999;
  font-size: 11px;
}

/* 想吃清单 */
.wish-list {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-radius: 12px;
  border: 1px solid #fbcfe8;
}

.wish-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.wish-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #831843;
}

.wish-count {
  font-size: 12px;
  color: #db2777;
}

.wish-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 10px;
}

.wish-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 10px;
}

.wish-icon {
  width: 32px;
  height: 32px;
  background: #fce7f3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.wish-info {
  flex: 1;
  min-width: 0;
}

.wish-name {
  margin: 0;
  font-size: 13px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-reason {
  margin: 2px 0 0;
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-delete {
  width: 24px;
  height: 24px;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  border-radius: 50%;
  font-size: 16px;
  cursor: pointer;
}

.wish-more {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 0;
}

.add-wish-btn {
  width: 100%;
  padding: 10px;
  background: white;
  border: 1px dashed #f9a8d4;
  border-radius: 10px;
  color: #db2777;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
}

/* 弹窗 */
.dialog-overlay, .detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog-content {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-content.wish-dialog {
  max-width: 340px;
}

.detail-content {
  background: #fffbeb;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.dialog-header, .detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.detail-header {
  background: white;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: #f59e0b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
}

.dialog-body, .detail-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #666;
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
}

.checkbox-group {
  display: flex;
  gap: 16px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox input {
  width: auto;
}

.photo-upload {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.photo-preview {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-photo {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 18px;
  height: 18px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
}

.add-photo-btn {
  width: 60px;
  height: 60px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  background: none;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  cursor: pointer;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
}

.btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
}

/* 详情页 */
.detail-date {
  color: #d97706;
  font-size: 13px;
  margin-bottom: 8px;
}

.restaurant-name {
  margin: 0 0 12px;
  font-size: 22px;
  color: #333;
}

.detail-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

/* 照片画廊 */
.photo-gallery {
  margin-bottom: 20px;
}

.main-photo {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 12px;
  overflow: hidden;
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
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0,0,0,0.3);
  color: white;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
}

.nav-btn.prev { left: 8px; }
.nav-btn.next { right: 8px; }

.photo-counter {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0,0,0,0.4);
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
}

.thumbnails {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  overflow-x: auto;
}

.thumbnails img {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  object-fit: cover;
  border: 2px solid transparent;
  cursor: pointer;
}

.thumbnails img.active {
  border-color: #f59e0b;
}

/* 详情分区 */
.section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  font-size: 14px;
  color: #333;
}

.section-bar {
  width: 4px;
  height: 16px;
  background: #f59e0b;
  border-radius: 2px;
}

.section-bar.pink {
  background: #ec4899;
}

.food-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.food-tags .food-tag {
  background: #fffbeb;
  color: #b45309;
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 13px;
}

.section-text {
  margin: 0;
  color: #666;
  line-height: 1.6;
  font-size: 14px;
}

.section.location {
  color: #999;
  font-size: 13px;
}

/* 详情页脚 */
.detail-footer {
  padding: 16px;
  background: white;
  border-top: 1px solid #f0f0f0;
}

.delete-btn {
  width: 100%;
  padding: 14px;
  background: #fee2e2;
  color: #ef4444;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}
</style>
