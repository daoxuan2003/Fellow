<template>
  <div class="album-page">
    <!-- 顶部导航 -->
    <div class="album-header">
      <h1>相册</h1>
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
    </div>

    <!-- 分类标签 -->
    <div class="category-tabs">
      <button 
        v-for="tab in categories" 
        :key="tab.key"
        :class="['tab-btn', { active: currentCategory === tab.key }]"
        @click="currentCategory = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 照片列表 -->
    <div class="photos-container" ref="photosContainer">
      <!-- 瀑布流视图 -->
      <div v-if="currentView === 'masonry'" class="masonry-grid">
        <div 
          v-for="(column, colIndex) in masonryColumns" 
          :key="colIndex" 
          class="masonry-column"
        >
          <div 
            v-for="(photo, index) in column" 
            :key="photo.id"
            class="masonry-item"
            :style="{ animationDelay: `${(colIndex * column.length + index) * 0.08}s` }"
            @click="openLightbox(photo)"
          >
            <div class="photo-wrapper" :style="{ aspectRatio: photo.aspectRatio || 1 }">
              <img 
                :src="photo.url" 
                :alt="photo.caption"
                loading="lazy"
                @load="onImageLoad(photo.id)"
              >
              <div v-if="!loadedImages.has(photo.id)" class="img-skeleton"></div>
              <!-- 悬浮遮罩 -->
              <div class="photo-overlay">
                <div class="photo-info">
                  <p v-if="photo.caption" class="photo-caption">{{ photo.caption }}</p>
                  <p class="photo-date">{{ formatDate(photo.date) }}</p>
                </div>
                <!-- 类型标记 -->
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
          v-for="(photo, index) in filteredPhotos" 
          :key="photo.id"
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

      <!-- 拼贴视图 -->
      <div v-else-if="currentView === 'collage'" class="collage-view">
        <div class="collage-grid">
          <div 
            v-for="(photo, index) in collagePhotos" 
            :key="photo.id"
            :class="['collage-item', `collage-item-${index % 5}`]"
            @click="openLightbox(photo)"
          >
            <img :src="photo.url" :alt="photo.caption">
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredPhotos.length === 0 && !loading" class="empty-state">
        <div class="empty-icon">📷</div>
        <p>还没有照片哦</p>
        <p class="empty-hint">点击右下角按钮添加美好回忆~</p>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 上传按钮 -->
    <button class="fab-upload" @click="showUploadSheet = true">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>

    <!-- 上传底部 Sheet -->
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
          <div class="upload-type-grid">
            <button class="upload-type-btn" @click="selectType('normal')">
              <span class="type-icon">📷</span>
              <span class="type-label">普通照片</span>
            </button>
            <button class="upload-type-btn" @click="selectType('travel')">
              <span class="type-icon">✈️</span>
              <span class="type-label">旅行</span>
            </button>
            <button class="upload-type-btn" @click="selectType('food')">
              <span class="type-icon">🍽️</span>
              <span class="type-label">美食</span>
            </button>
          </div>
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

    <!-- 照片预览/编辑弹窗 -->
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
              <textarea 
                v-model="uploadCaption" 
                placeholder="添加照片描述..."
                rows="2"
              ></textarea>
            </div>
            <div class="form-group">
              <label>标签</label>
              <input 
                v-model="uploadTags" 
                placeholder="用空格分隔，如：浪漫 旅行 美食"
                type="text"
              >
            </div>
            <div class="form-group">
              <label>日期</label>
              <input 
                v-model="uploadDate" 
                type="date"
              >
            </div>
          </div>
        </div>
        <div class="preview-footer">
          <button 
            class="preview-submit" 
            :disabled="uploading"
            @click="submitUpload"
          >
            {{ uploading ? '上传中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 灯箱 -->
    <Lightbox
      v-model:visible="lightboxVisible"
      :photos="filteredPhotos"
      :current-index="lightboxIndex"
      @close="closeLightbox"
    />

    <!-- Toast 提示 -->
    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'
import Lightbox from '../components/Lightbox.vue'

const userStore = useUserStore()

// 状态
const loading = ref(false)
const photos = ref([])
const currentView = ref('masonry') // masonry, grid, collage
const currentCategory = ref('all') // all, travel, food
const loadedImages = ref(new Set())

// 视图模式
const viewModes = [
  { key: 'masonry', label: '瀑布流' },
  { key: 'grid', label: '网格' },
  { key: 'collage', label: '拼贴' }
]

// 分类
const categories = [
  { key: 'all', label: '全部' },
  { key: 'travel', label: '旅行' },
  { key: 'food', label: '美食' }
]

// 瀑布流列数
const columnCount = 2

// 过滤后的照片
const filteredPhotos = computed(() => {
  if (currentCategory.value === 'all') {
    return photos.value
  }
  return photos.value.filter(p => p.type === currentCategory.value)
})

// 瀑布流布局计算
const masonryColumns = computed(() => {
  const columns = Array.from({ length: columnCount }, () => [])
  const colHeights = Array(columnCount).fill(0)
  
  filteredPhotos.value.forEach((photo) => {
    const minHeightIndex = colHeights.indexOf(Math.min(...colHeights))
    columns[minHeightIndex].push(photo)
    
    const ratio = photo.aspectRatio || 1
    const heightContribution = ratio < 1 ? 1.5 : ratio > 1 ? 0.7 : 1
    colHeights[minHeightIndex] += heightContribution
  })
  
  return columns
})

// 拼贴照片（最多显示 10 张）
const collagePhotos = computed(() => {
  return filteredPhotos.value.slice(0, 10)
})

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

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

// 显示 Toast
function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => toastMessage.value = '', 2000)
}

// 图片加载完成
function onImageLoad(id) {
  loadedImages.value.add(id)
}

// 获取照片列表
async function fetchPhotos() {
  loading.value = true
  try {
    const res = await fetch(`${CONFIG.API_BASE}/api/photos?type=${currentCategory.value}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      photos.value = data.data
    }
  } catch (e) {
    console.error('获取照片失败:', e)
    showToast('获取照片失败')
  } finally {
    loading.value = false
  }
}

// 选择上传类型
function selectType(type) {
  uploadType.value = type
  showUploadSheet.value = false
  fileInput.value?.click()
}

// 处理文件选择
function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length === 0) return
  
  uploadFiles.value = files.map(file => ({
    file,
    preview: URL.createObjectURL(file)
  }))
  showUploadPreview.value = true
}

// 移除上传文件
function removeUploadFile(index) {
  URL.revokeObjectURL(uploadFiles.value[index].preview)
  uploadFiles.value.splice(index, 1)
  if (uploadFiles.value.length === 0) {
    closeUpload()
  }
}

// 关闭上传
function closeUpload() {
  uploadFiles.value.forEach(f => URL.revokeObjectURL(f.preview))
  uploadFiles.value = []
  uploadCaption.value = ''
  uploadTags.value = ''
  showUploadPreview.value = false
  if (fileInput.value) fileInput.value.value = ''
}

// 提交上传
async function submitUpload() {
  if (uploadFiles.value.length === 0) return
  
  uploading.value = true
  try {
    // 逐张上传
    for (const fileData of uploadFiles.value) {
      // 1. 上传文件到存储
      const formData = new FormData()
      formData.append('file', fileData.file)
      
      const uploadRes = await fetch(`${CONFIG.API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const uploadData = await uploadRes.json()
      
      if (!uploadData.success) {
        throw new Error('文件上传失败')
      }
      
      // 2. 获取图片尺寸计算宽高比
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = uploadData.url
      })
      const aspectRatio = img.width / img.height
      
      // 3. 创建照片记录
      const tags = uploadTags.value.split(/\s+/).filter(t => t)
      const res = await fetch(`${CONFIG.API_BASE}/api/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: uploadData.url,
          date: uploadDate.value,
          caption: uploadCaption.value,
          tags,
          aspectRatio,
          type: uploadType.value
        })
      })
      
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message)
      }
    }
    
    showToast('上传成功！')
    closeUpload()
    fetchPhotos()
  } catch (e) {
    console.error('上传失败:', e)
    showToast('上传失败: ' + e.message)
  } finally {
    uploading.value = false
  }
}

// 打开灯箱
function openLightbox(photo) {
  const index = filteredPhotos.value.findIndex(p => p._id === photo._id)
  if (index !== -1) {
    lightboxIndex.value = index
    lightboxVisible.value = true
  }
}

// 关闭灯箱
function closeLightbox() {
  lightboxVisible.value = false
}

// 监听分类变化
watch(currentCategory, fetchPhotos)

onMounted(fetchPhotos)
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f0f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

.album-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.view-switcher {
  display: flex;
  gap: 4px;
  background: #f5f5f5;
  padding: 2px;
  border-radius: 8px;
}

.view-btn {
  padding: 6px 12px;
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

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  padding: 6px 16px;
  border: none;
  background: #f5f5f5;
  color: #666;
  font-size: 14px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 照片容器 */
.photos-container {
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
  animation: fadeIn 0.5s ease forwards;
  cursor: pointer;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

/* 拼贴视图 */
.collage-view {
  padding: 4px;
}

.collage-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 120px);
  gap: 4px;
}

.collage-item {
  overflow: hidden;
  border-radius: 8px;
  cursor: pointer;
}

.collage-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.collage-item-0 { grid-column: span 2; grid-row: span 2; }
.collage-item-1 { grid-column: span 2; }
.collage-item-2 { grid-column: span 1; }
.collage-item-3 { grid-column: span 1; }
.collage-item-4 { grid-column: span 2; grid-row: span 1; }

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

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
}

.empty-hint {
  font-size: 14px;
  color: #bbb;
}

/* 加载状态 */
.loading-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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
  transition: all 0.2s;
  z-index: 100;
}

.fab-upload:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
}

.fab-upload:active {
  transform: translateY(0);
}

/* 上传 Sheet */
.upload-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.sheet-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.upload-type-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.upload-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-type-btn:hover {
  background: #f8f9fa;
  border-color: #667eea;
}

.type-icon {
  font-size: 32px;
}

.type-label {
  font-size: 14px;
  color: #666;
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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

.preview-header h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.preview-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
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
  width: 100px;
  height: 100px;
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
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}

.preview-form .form-group {
  margin-bottom: 16px;
}

.preview-form label {
  display: block;
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
}

.preview-form input,
.preview-form textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  resize: none;
}

.preview-form input:focus,
.preview-form textarea:focus {
  outline: none;
  border-color: #667eea;
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
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
