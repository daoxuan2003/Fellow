<template>
  <div class="travel-passport">
    <!-- 头部 -->
    <div class="passport-header-gradient">
      <div class="header-content">
        <div class="header-icon-wrapper">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 12h20M2 12l5-5m-5 5l5 5"/>
          </svg>
        </div>
        <div class="header-text">
          <h3>我们的旅行护照</h3>
          <p>记录我们一起走过的每一步</p>
        </div>
      </div>
    </div>

    <!-- 统计栏 -->
    <div class="travel-stats">
      <div class="stat-box">
        <span class="stat-value">{{ travels.length }}</span>
        <span class="stat-name">个足迹</span>
      </div>
      <div class="stat-box" v-if="favoriteTravels.length > 0">
        <span class="stat-value">{{ favoriteTravels.length }}</span>
        <span class="stat-name">特别喜爱</span>
      </div>
      <div class="stat-box" v-if="travels.length > 0">
        <span class="stat-value">{{ new Set(travels.map(t => t.country)).size }}</span>
        <span class="stat-name">个国家</span>
      </div>
    </div>

    <!-- 旅行邮票墙 -->
    <div class="stamps-wall">
      <!-- 空状态 -->
      <div v-if="travels.length === 0" class="empty-wall">
        <div class="empty-icon">✈️</div>
        <p>还没有旅行记录</p>
        <p class="empty-hint">点击下方按钮添加你们的第一次旅行~</p>
      </div>

      <!-- 邮票网格 -->
      <div v-else class="stamps-grid">
        <div 
          v-for="travel in travels" 
          :key="travel._id"
          class="stamp-cell"
          @click="openDetail(travel)"
        >
          <TravelStamp :record="travel" />
        </div>
      </div>
    </div>

    <!-- 添加按钮 -->
    <button class="add-travel-btn" @click="showAddDialog = true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      记录新旅行
    </button>

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
        <!-- 头部 -->
        <div class="detail-header-gradient">
          <div class="header-actions">
            <div class="header-left">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M2 12h20M2 12l5-5m-5 5l5 5"/>
              </svg>
              <span>旅行纪念</span>
            </div>
            <button class="header-close" @click="closeDetail">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 内容 -->
        <div class="detail-scrollable">
          <!-- 目的地标题 -->
          <div class="destination-header">
            <p class="country">{{ selectedTravel.country }}</p>
            <h2 class="city">{{ selectedTravel.city }}</h2>
            <div class="meta-info">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ formatDateFull(selectedTravel.date) }}</span>
              <span v-if="selectedTravel.weather" class="weather">· {{ selectedTravel.weather }}</span>
            </div>
            <div v-if="selectedTravel.isFavorite" class="favorite-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              特别喜欢的旅行
            </div>
          </div>

          <!-- 照片画廊 -->
          <div class="photo-gallery" v-if="selectedTravel.photos.length > 0">
            <PhotoGallery :photos="selectedTravel.photos" />
          </div>

          <!-- 美好回忆 -->
          <div class="memory-card" v-if="selectedTravel.memory">
            <div class="card-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
              <h3>美好回忆</h3>
            </div>
            <p class="memory-text">{{ selectedTravel.memory }}</p>
          </div>

          <!-- 精彩瞬间 -->
          <div class="highlights-card" v-if="selectedTravel.highlights && selectedTravel.highlights.length > 0">
            <h3>精彩瞬间</h3>
            <div class="highlights-tags">
              <span v-for="(highlight, index) in selectedTravel.highlights" :key="index" class="highlight-tag">
                {{ highlight }}
              </span>
            </div>
          </div>

          <!-- 删除按钮 -->
          <button class="delete-btn" @click="deleteTravel(selectedTravel._id)">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除此记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CONFIG } from '../utils/config.js'
import TravelStamp from './TravelStamp.vue'
import PhotoGallery from './PhotoGallery.vue'

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
function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 打开详情
function openDetail(travel) {
  selectedTravel.value = travel
}

// 关闭详情
function closeDetail() {
  selectedTravel.value = null
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
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  overflow: hidden;
}

/* 头部渐变 */
.passport-header-gradient {
  background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
  padding: 16px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon-wrapper {
  width: 36px;
  height: 36px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.header-text h3 {
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.header-text p {
  color: rgba(255,255,255,0.8);
  font-size: 12px;
  margin: 2px 0 0;
}

/* 统计栏 */
.travel-stats {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-bottom: 1px solid #f3f4f6;
}

.stat-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: #fef2f2;
  border-radius: 12px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #dc2626;
}

.stat-name {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 2px;
}

/* 邮票墙 */
.stamps-wall {
  padding: 16px;
  min-height: 200px;
}

.empty-wall {
  text-align: center;
  padding: 40px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-hint {
  font-size: 13px;
  color: #d1d5db;
  margin-top: 4px;
}

.stamps-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.stamp-cell {
  cursor: pointer;
  transition: transform 0.2s;
}

.stamp-cell:hover {
  transform: translateY(-4px);
}

@media (max-width: 400px) {
  .stamps-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  }
}

/* 添加按钮 */
.add-travel-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: calc(100% - 32px);
  margin: 0 16px 16px;
  padding: 12px;
  background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.add-travel-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
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

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
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
  background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
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
  background: rgba(0,0,0,0.8);
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

.detail-header-gradient {
  background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
  padding: 12px 16px;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
}

.header-close {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.detail-scrollable {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* 目的地标题 */
.destination-header {
  text-align: center;
  margin-bottom: 24px;
}

.country {
  color: #9ca3af;
  font-size: 14px;
  margin: 0 0 4px;
}

.city {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 12px;
}

.meta-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6b7280;
  font-size: 13px;
}

.weather {
  color: #9ca3af;
}

.favorite-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 12px;
  padding: 6px 14px;
  background: #fce7f3;
  color: #db2777;
  border-radius: 20px;
  font-size: 13px;
}

.favorite-badge svg {
  color: #ec4899;
}

/* 照片画廊 */
.photo-gallery {
  margin-bottom: 20px;
}

/* 回忆卡片 */
.memory-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.card-header svg {
  color: #ec4899;
}

.card-header h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.memory-text {
  margin: 0;
  color: #4b5563;
  line-height: 1.7;
  font-size: 14px;
}

/* 精彩瞬间卡片 */
.highlights-card {
  background: white;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.highlights-card h3 {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.highlights-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.highlight-tag {
  padding: 6px 14px;
  background: #fef3c7;
  color: #b45309;
  border-radius: 20px;
  font-size: 13px;
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
</style>
