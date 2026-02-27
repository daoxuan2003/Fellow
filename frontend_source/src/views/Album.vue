<template>
  <div class="album-page">
    <!-- 顶部导航 -->
    <div class="album-header">
      <h1>📷 我们的回忆</h1>
      <div class="view-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="['tab-btn', { active: currentTab === tab.key }]"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 照片相册 -->
    <div v-if="currentTab === 'photos'" class="tab-content">
      <!-- 视图切换 -->
      <div class="view-switcher">
        <button 
          v-for="view in viewModes" 
          :key="view.key"
          :class="['view-btn', { active: currentView === view.key }]"
          @click="currentView = view.key"
        >
          {{ view.label }}
        </button>
      </div>

      <!-- 照片列表 -->
      <div class="photos-container">
        <!-- 瀑布流视图 -->
        <div v-if="currentView === 'masonry'" class="masonry-grid">
          <div 
            v-for="(column, colIndex) in masonryColumns" 
            :key="colIndex" 
            class="masonry-column"
          >
            <div 
              v-for="(photo, index) in column" 
              :key="photo._id"
              class="masonry-item"
              :style="{ animationDelay: `${(colIndex * column.length + index) * 0.08}s` }"
              @click="openLightbox(photo)"
            >
              <div class="photo-wrapper" :style="{ aspectRatio: photo.aspectRatio || 1 }">
                <img 
                  :src="photo.url" 
                  :alt="photo.caption"
                  loading="lazy"
                  @load="onImageLoad(photo._id)"
                >
                <div v-if="!loadedImages.has(photo._id)" class="img-skeleton"></div>
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

        <!-- 网格视图 -->
        <div v-else-if="currentView === 'grid'" class="grid-view">
          <div 
            v-for="(photo, index) in photos" 
            :key="photo._id"
            class="grid-item"
            :style="{ animationDelay: `${index * 0.05}s` }"
            @click="openLightbox(photo)"
          >
            <img :src="photo.url" :alt="photo.caption" loading="lazy">
            <div v-if="photo.type !== 'normal'" class="grid-type-badge">
              <span v-if="photo.type === 'travel'">✈️</span>
              <span v-else-if="photo.type === 'food'">🍽️</span>
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
  { key: 'photos', label: '照片' },
  { key: 'travel', label: '旅行' },
  { key: 'food', label: '美食' }
]

const currentTab = ref('photos')

// 照片相关
const loading = ref(false)
const photos = ref([])
const currentView = ref('masonry')
const loadedImages = ref(new Set())
const columnCount = 2

const viewModes = [
  { key: 'masonry', label: '瀑布流' },
  { key: 'grid', label: '网格' }
]

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
}

// 获取数据
async function fetchPhotos() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/photos`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) photos.value = data.data
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

/* 顶部导航 */
.album-header {
  background: white;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.album-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px;
}

.view-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tab-content {
  padding: 12px;
}

/* 视图切换 */
.view-switcher {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  background: #f5f5f5;
  padding: 4px;
  border-radius: 8px;
  width: fit-content;
}

.view-btn {
  padding: 6px 14px;
  border: none;
  background: transparent;
  color: #666;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.view-btn.active {
  background: white;
  color: #333;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
  animation: fadeIn 0.5s ease forwards;
  cursor: pointer;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
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

.img-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
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

/* 网格视图 */
.grid-view {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.grid-item {
  aspect-ratio: 1;
  position: relative;
  overflow: hidden;
  opacity: 0;
  animation: fadeIn 0.5s ease forwards;
  cursor: pointer;
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.grid-type-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 12px;
  background: rgba(255,255,255,0.9);
  padding: 2px 4px;
  border-radius: 4px;
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
