<template>
  <div class="travel-passport">
    <!-- 头部 -->
    <div class="passport-header">
      <div class="header-icon">✈️</div>
      <div class="header-content">
        <h3>旅行护照</h3>
        <p class="header-desc">记录我们一起走过的每一步</p>
      </div>
      <button class="header-add" @click="showAddDialog = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 统计信息 -->
    <div class="passport-stats">
      <div class="stat-item">
        <span class="stat-number">{{ travels.length }}</span>
        <span class="stat-label">个足迹</span>
      </div>
      <div class="stat-item" v-if="favoriteTravels.length > 0">
        <span class="stat-number">{{ favoriteTravels.length }}</span>
        <span class="stat-label">特别喜欢</span>
      </div>
    </div>

    <!-- 特别喜欢的旅行 -->
    <div class="favorite-travels" v-if="favoriteTravels.length > 0">
      <p class="section-label">特别喜欢的旅行</p>
      <div class="stamps-row">
        <div 
          v-for="travel in favoriteTravels" 
          :key="travel._id"
          class="travel-stamp"
          @click="openDetail(travel)"
        >
          <div class="stamp-inner">
            <img :src="travel.photos[0]" :alt="travel.city">
            <div class="stamp-postmark">{{ formatDateShort(travel.date) }}</div>
            <div class="stamp-city">{{ travel.city }}</div>
            <div class="stamp-favorite">❤️</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 所有旅行 -->
    <div class="all-travels">
      <p class="section-label">所有旅行</p>
      <div class="stamps-grid">
        <div 
          v-for="travel in travels" 
          :key="travel._id"
          class="travel-stamp"
          @click="openDetail(travel)"
        >
          <div class="stamp-inner">
            <img :src="travel.photos[0]" :alt="travel.city">
            <div class="stamp-postmark">{{ formatDateShort(travel.date) }}</div>
            <div class="stamp-city">{{ travel.city }}</div>
            <div class="stamp-favorite" v-if="travel.isFavorite">❤️</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加旅行弹窗 -->
    <div v-if="showAddDialog" class="dialog-overlay" @click.self="closeAddDialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h3>添加旅行记录</h3>
          <button class="close-btn" @click="closeAddDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label>城市</label>
            <input v-model="newTravel.city" placeholder="如：杭州" type="text">
          </div>
          <div class="form-group">
            <label>国家</label>
            <input v-model="newTravel.country" placeholder="如：中国" type="text">
          </div>
          <div class="form-group">
            <label>日期</label>
            <input v-model="newTravel.date" type="date">
          </div>
          <div class="form-group">
            <label>天气</label>
            <input v-model="newTravel.weather" placeholder="如：晴朗 18°C" type="text">
          </div>
          <div class="form-group">
            <label>照片</label>
            <div class="photo-upload">
              <div v-for="(photo, index) in newTravel.photos" :key="index" class="photo-preview">
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
            <label>美好回忆</label>
            <textarea v-model="newTravel.memory" placeholder="记录这次旅行的美好回忆..." rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>精彩瞬间（用空格分隔）</label>
            <input v-model="highlightsInput" placeholder="如：西湖日落 断桥漫步 龙井茶" type="text">
          </div>
          <div class="form-group checkbox">
            <label>
              <input v-model="newTravel.isFavorite" type="checkbox">
              <span>特别喜欢的旅行</span>
            </label>
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" @click="closeAddDialog">取消</button>
          <button class="btn-primary" :disabled="submitting" @click="submitTravel">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div v-if="selectedTravel" class="detail-overlay" @click.self="closeDetail">
      <div class="detail-content">
        <div class="detail-header">
          <button class="back-btn" @click="closeDetail">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="header-center">
            <span class="country">{{ selectedTravel.country }}</span>
            <h2>{{ selectedTravel.city }}</h2>
          </div>
          <button class="delete-btn" @click="deleteTravel(selectedTravel._id)">🗑️</button>
        </div>
        
        <div class="detail-body">
          <div class="date-weather">
            <span class="date">{{ formatDate(selectedTravel.date) }}</span>
            <span v-if="selectedTravel.weather" class="weather">· {{ selectedTravel.weather }}</span>
            <span v-if="selectedTravel.isFavorite" class="favorite-tag">❤️ 特别喜欢的旅行</span>
          </div>

          <!-- 照片画廊 -->
          <div class="photo-gallery" v-if="selectedTravel.photos.length > 0">
            <div class="main-photo">
              <img :src="selectedTravel.photos[currentPhotoIndex]" alt="">
              <button v-if="currentPhotoIndex > 0" class="nav-btn prev" @click="prevPhoto">‹</button>
              <button v-if="currentPhotoIndex < selectedTravel.photos.length - 1" class="nav-btn next" @click="nextPhoto">›</button>
              <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ selectedTravel.photos.length }}</div>
            </div>
            <div class="thumbnails" v-if="selectedTravel.photos.length > 1">
              <img 
                v-for="(photo, index) in selectedTravel.photos" 
                :key="index"
                :src="photo" 
                :class="{ active: index === currentPhotoIndex }"
                @click="currentPhotoIndex = index"
              >
            </div>
          </div>

          <!-- 美好回忆 -->
          <div class="memory-section" v-if="selectedTravel.memory">
            <h4>💕 美好回忆</h4>
            <p>{{ selectedTravel.memory }}</p>
          </div>

          <!-- 精彩瞬间 -->
          <div class="highlights-section" v-if="selectedTravel.highlights.length > 0">
            <h4>✨ 精彩瞬间</h4>
            <div class="highlights-tags">
              <span v-for="(highlight, index) in selectedTravel.highlights" :key="index" class="highlight-tag">
                {{ highlight }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CONFIG } from '../utils/config.js'

const props = defineProps({
  travels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:travels'])

// 状态
const showAddDialog = ref(false)
const selectedTravel = ref(null)
const currentPhotoIndex = ref(0)
const submitting = ref(false)
const photoInput = ref(null)

// 新旅行数据
const newTravel = ref({
  city: '',
  country: '中国',
  date: new Date().toISOString().split('T')[0],
  photos: [],
  memory: '',
  highlights: [],
  weather: '',
  isFavorite: false
})

const highlightsInput = ref('')

// 计算属性
const favoriteTravels = computed(() => {
  return props.travels.filter(t => t.isFavorite)
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
function openDetail(travel) {
  selectedTravel.value = travel
  currentPhotoIndex.value = 0
}

// 关闭详情
function closeDetail() {
  selectedTravel.value = null
}

// 照片导航
function prevPhoto() {
  if (currentPhotoIndex.value > 0) {
    currentPhotoIndex.value--
  }
}

function nextPhoto() {
  if (selectedTravel.value && currentPhotoIndex.value < selectedTravel.value.photos.length - 1) {
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
  newTravel.value = {
    city: '',
    country: '中国',
    date: new Date().toISOString().split('T')[0],
    photos: [],
    memory: '',
    highlights: [],
    weather: '',
    isFavorite: false
  }
  highlightsInput.value = ''
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
        newTravel.value.photos.push(data.data.url)
      }
    } catch (e) {
      console.error('上传照片失败:', e)
    }
  }
}

// 移除照片
function removePhoto(index) {
  newTravel.value.photos.splice(index, 1)
}

// 提交旅行记录
async function submitTravel() {
  if (!newTravel.value.city) {
    alert('请输入城市名')
    return
  }

  submitting.value = true

  try {
    const highlights = highlightsInput.value.split(/\s+/).filter(h => h)
    
    const res = await fetch(`${CONFIG.API_URL}/travels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ...newTravel.value,
        highlights
      })
    })

    const data = await res.json()
    if (data.success) {
      emit('update:travels', [data.data, ...props.travels])
      closeAddDialog()
    }
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    submitting.value = false
  }
}

// 删除旅行记录
async function deleteTravel(id) {
  if (!confirm('确定要删除这条旅行记录吗？')) return

  try {
    const res = await fetch(`${CONFIG.API_URL}/travels/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })

    if (res.ok) {
      emit('update:travels', props.travels.filter(t => t._id !== id))
      closeDetail()
    }
  } catch (e) {
    console.error('删除失败:', e)
  }
}
</script>

<style scoped>
.travel-passport {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.passport-header {
  background: linear-gradient(135deg, #ef4444 0%, #ec4899 100%);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 28px;
}

.header-content {
  flex: 1;
}

.header-content h3 {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-desc {
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  margin: 2px 0 0;
}

.header-add {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 统计信息 */
.passport-stats {
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
  color: #dc2626;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.favorite-travels, .all-travels {
  padding: 16px;
}

.section-label {
  font-size: 12px;
  color: #999;
  margin: 0 0 8px;
}

.stamps-row {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.travel-stamp {
  flex-shrink: 0;
  width: 80px;
  cursor: pointer;
  transform: rotate(-2deg);
  transition: transform 0.2s;
}

.travel-stamp:hover {
  transform: rotate(0deg) scale(1.05);
}

.stamp-inner {
  background: white;
  padding: 3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  position: relative;
}

.stamp-inner::before {
  content: '';
  position: absolute;
  inset: -4px;
  background: radial-gradient(circle, transparent 30%, #ddd 30%);
  background-size: 8px 8px;
  z-index: -1;
}

.stamp-inner img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
}

.stamp-postmark {
  position: absolute;
  bottom: 20px;
  right: 4px;
  width: 36px;
  height: 36px;
  border: 2px solid #dc2626;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #dc2626;
  background: rgba(255,255,255,0.9);
  transform: rotate(12deg);
}

.stamp-city {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  white-space: nowrap;
}

.stamp-favorite {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 14px;
}

.all-travels {
  flex: 1;
}

.stamps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

/* 弹窗样式 */
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

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
}

.dialog-body {
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

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group.checkbox input {
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
  background: linear-gradient(135deg, #ef4444 0%, #ec4899 100%);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
}

/* 详情页 */
.detail-content {
  background: #fffbeb;
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.detail-header {
  background: linear-gradient(135deg, #ef4444 0%, #ec4899 100%);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: white;
}

.back-btn, .delete-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.delete-btn {
  font-size: 18px;
}

.header-center {
  flex: 1;
  text-align: center;
}

.header-center .country {
  font-size: 12px;
  opacity: 0.8;
}

.header-center h2 {
  margin: 0;
  font-size: 20px;
}

.detail-body {
  padding: 16px;
}

.date-weather {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.date {
  color: #666;
  font-size: 14px;
}

.weather {
  color: #999;
  font-size: 14px;
}

.favorite-tag {
  background: #fce7f3;
  color: #ec4899;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
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
  border-color: #ec4899;
}

.memory-section, .highlights-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.memory-section h4, .highlights-section h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #333;
}

.memory-section p {
  margin: 0;
  color: #666;
  line-height: 1.6;
  font-size: 14px;
}

.highlights-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.highlight-tag {
  background: #fef3c7;
  color: #d97706;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 13px;
}
</style>
