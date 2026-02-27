<template>
  <div class="food-diary">
    <!-- 手账封面 + 统计 -->
    <div class="diary-header">
      <div class="diary-cover-wrapper">
        <div class="diary-cover" @click="isExpanded = true">
          <!-- 手账装饰 -->
          <div class="cover-binding"></div>
          
          <!-- 标题 -->
          <div class="cover-title">
            <div class="cover-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <h3>美食手账</h3>
            <p>记录一起吃过的美味</p>
          </div>

          <!-- 统计 -->
          <div class="cover-stats">
            <div class="stats-number">{{ foods.length }}</div>
            <div class="stats-label">家店</div>
          </div>

          <!-- 装饰 -->
          <div class="cover-decoration deco-1">🍜</div>
          <div class="cover-decoration deco-2">🍰</div>
        </div>
      </div>

      <div class="diary-stats">
        <!-- 我们的最爱 -->
        <div v-if="favorites.length > 0" class="stat-card favorite-card">
          <div class="stat-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>我们的最爱</span>
          </div>
          <div class="stat-tags">
            <span v-for="f in favorites.slice(0, 3)" :key="f._id" class="stat-tag">
              {{ f.restaurant }}
            </span>
          </div>
        </div>
        
        <!-- 想再去 -->
        <div v-if="wantAgain.length > 0" class="stat-card want-card">
          <div class="stat-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span>想再去</span>
          </div>
          <div class="stat-tags">
            <span v-for="f in wantAgain.slice(0, 3)" :key="f._id" class="stat-tag">
              {{ f.restaurant }}
            </span>
          </div>
        </div>

        <!-- 探索了多少道菜 -->
        <div class="stat-card explore-card">
          <span>一起探索了 <strong>{{ uniqueDishesCount }}</strong> 道美食</span>
        </div>
      </div>
    </div>

    <!-- 记录按钮 -->
    <button class="add-food-btn" @click="showAddDialog = true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      记录美食
    </button>

    <!-- 美食记录列表 -->
    <div class="food-list">
      <!-- 未展开 -->
      <div v-if="!isExpanded" class="food-grid">
        <div 
          v-for="food in foods.slice(0, 4)" 
          :key="food._id"
          class="food-entry-card"
          @click="openDetail(food)"
        >
          <!-- 胶带装饰 -->
          <div class="entry-tape"></div>
          
          <!-- 照片 -->
          <div class="entry-photo">
            <img :src="food.photos[0]" :alt="food.restaurant">
            
            <!-- 标签 -->
            <div class="entry-badges">
              <span v-if="food.isOurFavorite" class="badge favorite-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                我们的最爱
              </span>
              <span v-else-if="food.wantToGoAgain" class="badge want-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                想再去
              </span>
            </div>

            <!-- 多照片标记 -->
            <div v-if="food.photos.length > 1" class="photo-count">
              {{ food.photos.length }}张
            </div>
          </div>

          <!-- 内容 -->
          <div class="entry-content">
            <h4>{{ food.restaurant }}</h4>
            
            <!-- 吃了什么 -->
            <div v-if="food.whatWeAte.length > 0" class="ate-tags">
              <span v-for="(item, i) in food.whatWeAte.slice(0, 2)" :key="i" class="ate-tag">
                {{ item }}
              </span>
              <span v-if="food.whatWeAte.length > 2" class="ate-more">+{{ food.whatWeAte.length - 2 }}</span>
            </div>

            <!-- 日期 -->
            <div class="entry-date">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ formatDateShort(food.date) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 展开状态 -->
      <div v-else class="food-expanded">
        <div class="expanded-header">
          <h4>所有记录</h4>
          <button class="collapse-btn" @click="isExpanded = false">收起</button>
        </div>
        <div class="food-grid">
          <div 
            v-for="food in foods" 
            :key="food._id"
            class="food-entry-card"
            @click="openDetail(food)"
          >
            <div class="entry-tape"></div>
            <div class="entry-photo">
              <img :src="food.photos[0]" :alt="food.restaurant">
              <div class="entry-badges">
                <span v-if="food.isOurFavorite" class="badge favorite-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  我们的最爱
                </span>
                <span v-else-if="food.wantToGoAgain" class="badge want-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  想再去
                </span>
              </div>
              <div v-if="food.photos.length > 1" class="photo-count">
                {{ food.photos.length }}张
              </div>
            </div>
            <div class="entry-content">
              <h4>{{ food.restaurant }}</h4>
              <div v-if="food.whatWeAte.length > 0" class="ate-tags">
                <span v-for="(item, i) in food.whatWeAte.slice(0, 2)" :key="i" class="ate-tag">
                  {{ item }}
                </span>
                <span v-if="food.whatWeAte.length > 2" class="ate-more">+{{ food.whatWeAte.length - 2 }}</span>
              </div>
              <div class="entry-date">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{{ formatDateShort(food.date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 想吃清单 -->
    <div class="wish-list-card">
      <div class="wish-header">
        <div class="wish-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          <span>想吃清单</span>
        </div>
        <span class="wish-count">{{ wishes.length }}家</span>
      </div>

      <div v-if="wishes.length === 0" class="wish-empty">
        还没有想吃的，快去添加吧~
      </div>
      <div v-else class="wish-items">
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
            <label class="checkbox-label">
              <input v-model="newFood.isOurFavorite" type="checkbox">
              <span class="checkbox-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                我们的最爱
              </span>
            </label>
            <label class="checkbox-label">
              <input v-model="newFood.wantToGoAgain" type="checkbox">
              <span class="checkbox-text">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                还想再去
              </span>
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
        <!-- 头部 -->
        <div class="detail-header">
          <div class="header-brand">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <span>美食手账</span>
          </div>
          <button class="header-close" @click="closeDetail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        
        <!-- 内容 -->
        <div class="detail-scrollable">
          <!-- 日期 -->
          <div class="detail-date">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ formatDateFull(selectedFood.date) }}</span>
          </div>

          <!-- 店名和标签 -->
          <div class="detail-title-section">
            <h2>{{ selectedFood.restaurant }}</h2>
            <div class="detail-badges">
              <span v-if="selectedFood.isOurFavorite" class="detail-badge favorite">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                我们的最爱
              </span>
              <span v-if="selectedFood.wantToGoAgain" class="detail-badge want">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                还想再去
              </span>
            </div>
          </div>

          <!-- 照片画廊 -->
          <div class="photo-gallery" v-if="selectedFood.photos.length > 0">
            <PhotoGallery :photos="selectedFood.photos" theme="orange" />
          </div>

          <!-- 吃了什么 -->
          <div class="section-card" v-if="selectedFood.whatWeAte.length > 0">
            <h4 class="section-title orange">
              <span class="section-bar"></span>
              我们吃了
            </h4>
            <div class="food-tags">
              <span v-for="(item, index) in selectedFood.whatWeAte" :key="index" class="food-tag">
                {{ item }}
              </span>
            </div>
          </div>

          <!-- 感受 -->
          <div class="section-card" v-if="selectedFood.howWasIt">
            <h4 class="section-title pink">
              <span class="section-bar"></span>
              感受如何
            </h4>
            <p class="section-text">{{ selectedFood.howWasIt }}</p>
          </div>

          <!-- 位置 -->
          <div class="location-info" v-if="selectedFood.location">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>{{ selectedFood.location }}</span>
          </div>

          <!-- 删除按钮 -->
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
import PhotoGallery from './PhotoGallery.vue'

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
const isExpanded = ref(false)
const showAddDialog = ref(false)
const showWishDialog = ref(false)
const selectedFood = ref(null)
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
function formatDateFull(dateStr) {
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
}

// 关闭详情
function closeDetail() {
  selectedFood.value = null
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
    
    // 1. 先提交美食记录
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
      // 2. 同时将照片添加到照片库
      for (const photoUrl of newFood.value.photos) {
        try {
          // 获取图片尺寸
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = photoUrl
          })
          const aspectRatio = img.width / img.height
          
          // 添加到照片库
          await fetch(`${CONFIG.API_URL}/photos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              url: photoUrl,
              date: newFood.value.date,
              caption: `${newFood.value.restaurant} · ${whatWeAte.slice(0, 2).join('、') || '美食记录'}`,
              tags: ['美食', newFood.value.restaurant, ...(whatWeAte || [])].filter(Boolean),
              aspectRatio,
              type: 'food',
              foodId: data.data._id // 关联美食记录
            })
          })
        } catch (e) {
          console.error('同步到照片库失败:', e)
        }
      }
      
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

/* 手账头部 */
.diary-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.diary-cover-wrapper {
  width: 96px;
  flex-shrink: 0;
}

.diary-cover {
  position: relative;
  background: linear-gradient(135deg, #ffedd5 0%, #fef3c7 50%, #fef9c3 100%);
  border-radius: 12px;
  padding: 16px 12px;
  aspect-ratio: 3/4;
  cursor: pointer;
  transition: transform 0.3s;
  border: 2px solid #fed7aa;
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);
}

.diary-cover:hover {
  transform: scale(1.02);
}

.diary-cover:active {
  transform: scale(0.98);
}

/* 装订装饰 */
.cover-binding {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 12px;
  background: rgba(146, 64, 14, 0.2);
  border-radius: 6px;
}

/* 标题 */
.cover-title {
  text-align: center;
  padding-top: 20px;
  padding-bottom: 12px;
}

.cover-icon {
  width: 40px;
  height: 40px;
  background: #fb923c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  color: white;
}

.cover-title h3 {
  font-size: 15px;
  font-weight: 700;
  color: #92400e;
  margin: 0 0 2px;
}

.cover-title p {
  font-size: 10px;
  color: rgba(146, 64, 14, 0.6);
  margin: 0;
}

/* 统计 */
.cover-stats {
  text-align: center;
}

.stats-number {
  font-size: 28px;
  font-weight: 700;
  color: #b45309;
}

.stats-label {
  font-size: 10px;
  color: rgba(146, 64, 14, 0.6);
}

/* 装饰 */
.cover-decoration {
  position: absolute;
  opacity: 0.3;
}

.deco-1 {
  bottom: 8px;
  right: 8px;
  font-size: 20px;
}

.deco-2 {
  top: 24px;
  left: 8px;
  font-size: 16px;
}

/* 统计卡片区域 */
.diary-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-card {
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
}

.stat-card.favorite-card {
  background: #fdf2f8;
  border: 1px solid #fce7f3;
}

.stat-card.want-card {
  background: #fff7ed;
  border: 1px solid #ffedd5;
}

.stat-card.explore-card {
  background: #fffbeb;
  border: 1px solid #fef3c7;
  color: #b45309;
}

.stat-header {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-weight: 500;
}

.stat-card.favorite-card .stat-header {
  color: #db2777;
}

.stat-card.want-card .stat-header {
  color: #ea580c;
}

.stat-header svg {
  flex-shrink: 0;
}

.stat-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.stat-tag {
  background: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  white-space: nowrap;
}

.stat-card.favorite-card .stat-tag {
  color: #db2777;
}

.stat-card.want-card .stat-tag {
  color: #ea580c;
}

.stat-card strong {
  font-size: 15px;
}

/* 添加按钮 */
.add-food-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 16px;
}

.add-food-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.add-food-btn:active {
  transform: scale(0.98);
}

/* 美食列表 */
.food-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

/* 美食记录卡片 */
.food-entry-card {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  border: 1px solid #fef3c7;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.food-entry-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.food-entry-card:active {
  transform: scale(0.98);
}

/* 胶带装饰 */
.entry-tape {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(-2deg);
  width: 32px;
  height: 14px;
  background: rgba(245, 158, 11, 0.4);
  z-index: 2;
}

/* 照片 */
.entry-photo {
  position: relative;
  aspect-ratio: 4/3;
}

.entry-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.entry-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.badge {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.badge.favorite-badge {
  background: #ec4899;
  color: white;
}

.badge.want-badge {
  background: #f97316;
  color: white;
}

.photo-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 2px 8px;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 10px;
  font-size: 10px;
}

/* 内容 */
.entry-content {
  padding: 12px;
}

.entry-content h4 {
  font-size: 14px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ate-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.ate-tag {
  background: #fffbeb;
  color: #b45309;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
}

.ate-more {
  color: #9ca3af;
  font-size: 10px;
}

.entry-date {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #9ca3af;
  font-size: 11px;
}

/* 展开状态 */
.food-expanded {
  animation: fadeIn 0.3s ease;
}

.expanded-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.expanded-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.collapse-btn {
  font-size: 12px;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
}

.collapse-btn:hover {
  color: #6b7280;
}

.collapse-btn:active {
  transform: scale(0.95);
}

/* 想吃清单卡片 */
.wish-list-card {
  margin-top: 16px;
  padding: 12px;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-radius: 12px;
  border: 1px solid #fbcfe8;
}

.wish-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.wish-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #831843;
}

.wish-title svg {
  color: #ec4899;
}

.wish-count {
  font-size: 12px;
  color: #db2777;
}

.wish-empty {
  color: #9ca3af;
  font-size: 12px;
  text-align: center;
  padding: 12px 0;
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
  width: 28px;
  height: 28px;
  background: #fce7f3;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.wish-info {
  flex: 1;
  min-width: 0;
}

.wish-name {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wish-reason {
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
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
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.wish-more {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  margin: 4px 0 0;
}

.add-wish-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: white;
  border: 1px dashed #f9a8d4;
  border-radius: 10px;
  color: #db2777;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-wish-btn:hover {
  background: rgba(255,255,255,0.8);
}

.add-wish-btn:active {
  transform: scale(0.98);
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.dialog-content {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-content.wish-dialog {
  max-width: 340px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #111827;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.dialog-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 6px;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  box-sizing: border-box;
}

.checkbox-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.checkbox-text {
  display: flex;
  align-items: center;
  gap: 4px;
}

.checkbox-text svg {
  color: #ec4899;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-photo-btn {
  width: 60px;
  height: 60px;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  background: none;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f3f4f6;
}

.btn-secondary, .btn-primary {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}

.btn-secondary {
  background: #f3f4f6;
  color: #6b7280;
}

.btn-primary {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 详情弹窗 */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
}

.detail-content {
  position: absolute;
  inset: 0;
  background: #fffbeb;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  background: white;
  border-bottom: 1px solid #fef3c7;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 500;
  color: #92400e;
}

.brand-icon {
  width: 36px;
  height: 36px;
  background: #fb923c;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.detail-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 详情日期 */
.detail-date {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d97706;
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.7;
}

/* 详情标题 */
.detail-title-section {
  margin-bottom: 20px;
}

.detail-title-section h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 10px;
}

.detail-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.detail-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.detail-badge.favorite {
  background: #fce7f3;
  color: #db2777;
}

.detail-badge.want {
  background: #fff7ed;
  color: #ea580c;
}

.detail-badge svg {
  flex-shrink: 0;
}

/* 照片画廊 */
.photo-gallery {
  margin-bottom: 20px;
}

/* 详情卡片 */
.section-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin: 0 0 12px;
}

.section-bar {
  width: 4px;
  height: 16px;
  border-radius: 2px;
}

.section-title.orange .section-bar {
  background: #fb923c;
}

.section-title.pink .section-bar {
  background: #f472b6;
}

.food-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.food-tag {
  padding: 6px 14px;
  background: #fff7ed;
  color: #c2410c;
  border-radius: 20px;
  font-size: 13px;
}

.section-text {
  margin: 0;
  color: #374151;
  line-height: 1.7;
  font-size: 14px;
}

/* 位置信息 */
.location-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9ca3af;
  font-size: 13px;
  margin-bottom: 20px;
}

/* 删除按钮 */
.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 14px;
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 40px;
}

.delete-btn:hover {
  background: #fecaca;
}

.delete-btn:active {
  transform: scale(0.98);
}
</style>
