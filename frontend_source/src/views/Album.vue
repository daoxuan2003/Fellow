<template>
  <div class="album-page">
    <!-- 悬浮标签栏 -->
    <div class="floating-tabs">
      <div class="tabs-container">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="['tab-btn', { active: currentTab === tab.key }]"
          @click="currentTab = tab.key"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- 照片相册 -->
    <div v-if="currentTab === 'photos'" class="tab-content">
      <!-- 照片瀑布流 -->
      <div class="masonry-grid">
        <div 
          v-for="(column, colIndex) in masonryColumns" 
          :key="colIndex" 
          class="masonry-column"
        >
          <div 
            v-for="(photo, index) in column" 
            :key="photo._id"
            :class="['masonry-item', { 
              show: visibleItems.has(photo._id),
              touched: touchedItem === photo._id 
            }]"
            :style="{ transitionDelay: `${Math.min((colIndex * column.length + index) * 0.05, 0.6)}s` }"
            @click="handlePhotoClick(photo)"
            @touchstart="touchedItem = photo._id"
            @touchend="touchedItem = null"
          >
            <div class="photo-wrapper" :style="{ aspectRatio: photo.aspectRatio || 1 }">
              <img 
                :src="photo.url" 
                :alt="photo.caption"
                loading="lazy"
                @load="onImageLoad(photo._id)"
                :class="['photo-img', { loaded: loadedImages.has(photo._id) }]"
              >
              <div v-if="!loadedImages.has(photo._id)" class="img-skeleton">
                <div class="skeleton-shimmer"></div>
              </div>
              <div class="photo-overlay">
                <div class="photo-info">
                  <p v-if="photo.caption" class="photo-caption">{{ photo.caption }}</p>
                  <p class="photo-date">{{ formatDate(photo.date) }}</p>
                </div>
                <div v-if="photo.type !== 'normal'" class="photo-type">
                  <span v-if="photo.type === 'travel'">✈️</span>
                  <span v-else-if="photo.type === 'food'">🍽️</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="photos.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📷</div>
        <p>还没有照片哦</p>
        <p class="empty-hint">点击右下角按钮添加美好回忆~</p>
      </div>

      <!-- 上传按钮 -->
      <button class="fab-upload" @click="showUploadSheet = true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 旅行护照 -->
    <div v-else-if="currentTab === 'travel'" class="tab-content">
      <TravelPassport 
        :travels="travels" 
        @update:travels="travels = $event"
      />
    </div>

    <!-- 美食手账 -->
    <div v-else-if="currentTab === 'food'" class="tab-content">
      <FoodDiary 
        :foods="foods"
        :wishes="foodWishes"
        @update:foods="foods = $event"
        @update:wishes="foodWishes = $event"
      />
    </div>

    <!-- 上传弹窗 -->
    <div 
      class="upload-sheet-overlay" 
      :class="{ show: showUploadSheet }"
      @click.self="showUploadSheet = false"
    >
      <div class="upload-sheet" :class="{ show: showUploadSheet }">
        <div class="sheet-header">
          <div class="sheet-handle"></div>
          <h3>添加照片</h3>
        </div>
        <div class="sheet-content">
          <p class="upload-hint">记录日常生活中的美好瞬间</p>
          <button class="upload-single-btn" @click="selectType('normal')">
            <span class="upload-icon">📷</span>
            <span>添加照片</span>
          </button>
          <input 
            ref="fileInput"
            type="file" 
            accept="image/*" 
            multiple
            style="display: none"
            @change="handleFileSelect"
          >
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div v-if="showUploadPreview" class="preview-overlay" @click.self="closeUpload">
      <div class="preview-dialog">
        <div class="preview-header">
          <h3>发布照片</h3>
          <button class="preview-close" @click="closeUpload">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="preview-content">
          <div class="preview-images">
            <div v-for="(file, index) in uploadFiles" :key="index" class="preview-item">
              <img :src="file.preview" alt="预览">
              <button class="preview-remove" @click="removeUploadFile(index)">×</button>
            </div>
          </div>
          <div class="preview-form">
            <div class="form-group">
              <label>描述</label>
              <textarea v-model="uploadCaption" placeholder="添加照片描述..." rows="2"></textarea>
            </div>
            <div class="form-group">
              <label>标签</label>
              <input v-model="uploadTags" placeholder="用空格分隔，如：浪漫 旅行 美食" type="text">
            </div>
            <div class="form-group">
              <label>日期</label>
              <input v-model="uploadDate" type="date">
            </div>
          </div>
        </div>
        <div class="preview-footer">
          <button class="preview-submit" :disabled="uploading" @click="submitUpload">
            {{ uploading ? '上传中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 灯箱 -->
    <Lightbox
      v-model:visible="lightboxVisible"
      :photos="photos"
      :current-index="lightboxIndex"
      @close="closeLightbox"
    />

    <!-- Toast -->
    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'
import Lightbox from '../components/Lightbox.vue'
import TravelPassport from '../components/TravelPassport.vue'
import FoodDiary from '../components/FoodDiary.vue'

// 标签页
const tabs = [
  { key: 'photos', label: '照片', icon: '📷' },
  { key: 'travel', label: '足迹', icon: '✈️' },
  { key: 'food', label: '美食', icon: '🍜' }
]

const currentTab = ref('photos')

// 照片相关
const loading = ref(false)
const photos = ref([])
const loadedImages = ref(new Set())
const visibleItems = ref(new Set())
const touchedItem = ref(null)
const columnCount = 2

// 瀑布流布局
const masonryColumns = computed(() => {
  const columns = Array.from({ length: columnCount }, () => [])
  const colHeights = Array(columnCount).fill(0)
  
  photos.value.forEach((photo) => {
    const minHeightIndex = colHeights.indexOf(Math.min(...colHeights))
    columns[minHeightIndex].push(photo)
    const ratio = photo.aspectRatio || 1
    const heightContribution = ratio < 1 ? 1.5 : ratio > 1 ? 0.7 : 1
    colHeights[minHeightIndex] += heightContribution
  })
  
  return columns
})

// 旅行相关
const travels = ref([])

// 美食相关
const foods = ref([])
const foodWishes = ref([])

// 上传相关
const showUploadSheet = ref(false)
const showUploadPreview = ref(false)
const uploadFiles = ref([])
const uploadCaption = ref('')
const uploadTags = ref('')
const uploadDate = ref(new Date().toISOString().split('T')[0])
const uploadType = ref('normal')
const uploading = ref(false)
const fileInput = ref(null)

// 灯箱相关
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)

// Toast
const toastMessage = ref('')

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => toastMessage.value = '', 2000)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

function onImageLoad(id) {
  loadedImages.value.add(id)
  // 图片加载完成后显示 item
  setTimeout(() => {
    visibleItems.value.add(id)
  }, 50)
}

function handlePhotoClick(photo) {
  // 移动端先显示 overlay，再打开 lightbox
  if (window.matchMedia('(hover: none)').matches) {
    if (touchedItem.value === photo._id) {
      openLightbox(photo)
      touchedItem.value = null
    } else {
      touchedItem.value = photo._id
      // 2秒后自动隐藏
      setTimeout(() => {
        if (touchedItem.value === photo._id) {
          touchedItem.value = null
        }
      }, 2000)
    }
  } else {
    openLightbox(photo)
  }
}

// 获取数据
async function fetchPhotos() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/photos`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      photos.value = data.data
      // 逐个显示 items
      photos.value.forEach((photo, index) => {
        setTimeout(() => {
          visibleItems.value.add(photo._id)
        }, index * 80)
      })
    }
  } catch (e) {
    console.error('获取照片失败:', e)
  }
}

async function fetchTravels() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/travels`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) travels.value = data.data
  } catch (e) {
    console.error('获取旅行记录失败:', e)
  }
}

async function fetchFoods() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/foods`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) foods.value = data.data
  } catch (e) {
    console.error('获取美食记录失败:', e)
  }
}

async function fetchFoodWishes() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/food-wishes`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) foodWishes.value = data.data
  } catch (e) {
    console.error('获取想吃清单失败:', e)
  }
}

// 上传
function selectType(type) {
  uploadType.value = type
  showUploadSheet.value = false
  fileInput.value?.click()
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return
  
  uploadFiles.value = files.map(file => ({
    file,
    preview: URL.createObjectURL(file)
  }))
  showUploadPreview.value = true
}

function removeUploadFile(index) {
  URL.revokeObjectURL(uploadFiles.value[index].preview)
  uploadFiles.value.splice(index, 1)
  if (uploadFiles.value.length === 0) closeUpload()
}

function closeUpload() {
  uploadFiles.value.forEach(f => URL.revokeObjectURL(f.preview))
  uploadFiles.value = []
  uploadCaption.value = ''
  uploadTags.value = ''
  showUploadPreview.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function submitUpload() {
  if (uploadFiles.value.length === 0) return
  
  uploading.value = true
  try {
    for (const fileData of uploadFiles.value) {
      const formData = new FormData()
      formData.append('file', fileData.file)
      
      const uploadRes = await fetch(`${CONFIG.API_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const uploadData = await uploadRes.json()
      
      if (!uploadData.success) throw new Error('文件上传失败')
      
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = uploadData.data.url
      })
      const aspectRatio = img.width / img.height
      
      const tags = uploadTags.value.split(/\s+/).filter(t => t)
      const res = await fetch(`${CONFIG.API_URL}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: uploadData.data.url,
          date: uploadDate.value,
          caption: uploadCaption.value,
          tags,
          aspectRatio,
          type: uploadType.value
        })
      })
      
      const data = await res.json()
      if (!data.success) throw new Error(data.message)
    }
    
    showToast('上传成功！')
    closeUpload()
    fetchPhotos()
  } catch (e) {
    console.error('上传失败:', e)
    showToast('上传失败')
  } finally {
    uploading.value = false
  }
}

// 灯箱
function openLightbox(photo) {
  const index = photos.value.findIndex(p => p._id === photo._id)
  if (index !== -1) {
    lightboxIndex.value = index
    lightboxVisible.value = true
  }
}

function closeLightbox() {
  lightboxVisible.value = false
}

onMounted(() => {
  fetchPhotos()
  fetchTravels()
  fetchFoods()
  fetchFoodWishes()
})
</script>

<style scoped>
.album-page {
  min-height: 100vh;
  background: #f8f9fa;
  padding-bottom: 80px;
}

/* 悬浮标签栏 */
.floating-tabs {
  position: sticky;
  top: 12px;
  z-index: 100;
  padding: 0 16px;
  margin-bottom: 8px;
}

.tabs-container {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  padding: 6px;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  background: transparent;
  color: #9ca3af;
  font-size: 14px;
  border-radius: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn .tab-icon {
  font-size: 16px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.tab-btn .tab-label {
  font-weight: 500;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  transform: translateY(-1px);
}

.tab-btn.active .tab-icon {
  opacity: 1;
}

.tab-content {
  padding: 12px;
}

/* 瀑布流 */
.masonry-grid {
  display: flex;
  gap: 8px;
}

.masonry-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.masonry-item {
  opacity: 0;
  transform: translateY(20px);
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  cursor: pointer;
  will-change: transform, opacity;
}

.masonry-item.show {
  opacity: 1;
  transform: translateY(0);
}

.photo-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;
}

.photo-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s;
  display: block;
}

.masonry-item:hover img {
  transform: scale(1.05);
}

.masonry-item:active img {
  transform: scale(0.98);
}

/* 移动端触摸反馈 */
@media (hover: none) {
  .masonry-item .photo-overlay {
    opacity: 0;
    transition: opacity 0.2s;
  }
  
  .masonry-item:active .photo-overlay {
    opacity: 1;
  }
  
  .masonry-item.touched .photo-overlay {
    opacity: 1;
  }
}

/* 图片加载优化 */
.photo-img {
  opacity: 0;
  transition: opacity 0.4s ease;
}

.photo-img.loaded {
  opacity: 1;
}

.img-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
  overflow: hidden;
}

.skeleton-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.photo-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px 12px 12px;
  background: linear-gradient(transparent, rgba(0,0,0,0.6));
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.masonry-item:hover .photo-overlay {
  opacity: 1;
}

.photo-info {
  color: white;
}

.photo-caption {
  font-size: 13px;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.photo-date {
  font-size: 11px;
  opacity: 0.8;
  margin: 0;
}

.photo-type {
  font-size: 16px;
}



/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 14px;
  color: #bbb;
}

/* 上传按钮 */
.fab-upload {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  z-index: 100;
}

/* 上传 Sheet */
.upload-sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s;
  z-index: 200;
}

.upload-sheet-overlay.show {
  opacity: 1;
  visibility: visible;
}

.upload-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  padding: 16px 20px 30px;
  transform: translateY(100%);
  transition: transform 0.3s;
}

.upload-sheet.show {
  transform: translateY(0);
}

.sheet-header {
  text-align: center;
  margin-bottom: 20px;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
  margin: 0 auto 12px;
}

.upload-hint {
  text-align: center;
  color: #999;
  font-size: 14px;
  margin-bottom: 20px;
}

.upload-single-btn {
  width: 100%;
  padding: 40px;
  border: 2px dashed #ddd;
  border-radius: 16px;
  background: #f8f9fa;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #667eea;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-single-btn:hover {
  border-color: #667eea;
  background: #f0f4ff;
}

.upload-single-btn:active {
  transform: scale(0.98);
  background: #e0e7ff;
}

.upload-icon {
  font-size: 48px;
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300;
  padding: 20px;
}

.preview-dialog {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
}

.preview-content {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}

.preview-images {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.preview-item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 14px;
  cursor: pointer;
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

.preview-footer {
  padding: 16px;
  border-top: 1px solid #f0f0f0;
}

.preview-submit {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 15px;
  cursor: pointer;
}

.preview-submit:disabled {
  opacity: 0.6;
}

/* Toast */
.toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0,0,0,0.8);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 400;
}
</style>
