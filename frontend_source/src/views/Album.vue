<template>
  <div class="album-page bg-gray-50 min-h-screen pb-20">
    <!-- 顶部导航 - 参考设计样式 -->
    <div class="sticky top-0 z-50 px-4 pt-3 pb-2">
      <div class="bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border border-gray-100 p-1.5 flex gap-1">
        <button 
          v-for="tab in tabs" 
          :key="tab.key"
          :class="[
            'flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300',
            currentTab === tab.key 
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md' 
              : 'text-gray-500 hover:text-gray-700'
          ]"
          @click="currentTab = tab.key"
        >
          <component :is="tab.icon" class="w-4 h-4" />
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- 照片相册 -->
    <div v-if="currentTab === 'photos'" class="px-2 pt-4">
      <!-- 瀑布流 -->
      <div class="flex gap-2">
        <div 
          v-for="(column, colIndex) in masonryColumns" 
          :key="colIndex" 
          class="flex-1 flex flex-col gap-2"
        >
          <div 
            v-for="(photo, index) in column" 
            :key="photo._id"
            class="relative group cursor-pointer overflow-hidden rounded-xl bg-gray-100 masonry-item"
            :style="{ 
              aspectRatio: `${photo.aspectRatio || 1}`,
              animationDelay: `${(colIndex * column.length + index) * 0.08}s`
            }"
            @click="openLightbox(photo)"
          >
            <!-- 加载占位 -->
            <div v-if="!loadedImages.has(photo._id)" class="absolute inset-0 img-placeholder" />
            
            <!-- 图片 -->
            <img 
              :src="photo.url"
              :alt="photo.caption || '照片'"
              class="w-full h-full object-cover transition-all duration-500 opacity-0"
              :class="{ 'opacity-100': loadedImages.has(photo._id), 'group-hover:scale-110': loadedImages.has(photo._id) }"
              @load="onImageLoad(photo._id)"
            />

            <!-- 渐变遮罩 -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <!-- 类型标记 -->
            <div 
              v-if="photo.type !== 'normal'"
              :class="[
                'absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-white',
                photo.type === 'travel' ? 'bg-blue-500' : 'bg-orange-500'
              ]"
            >
              <MapPin v-if="photo.type === 'travel'" class="w-3 h-3" />
              <Utensils v-else class="w-3 h-3" />
            </div>

            <!-- 悬浮信息 -->
            <div class="absolute bottom-0 left-0 right-0 p-3 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <p v-if="photo.caption" class="text-white text-sm font-medium truncate mb-1">
                {{ photo.caption }}
              </p>
              <span class="text-white/60 text-xs">
                {{ formatDate(photo.date) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="photos.length === 0 && !loading" class="text-center py-20 text-gray-400">
        <div class="text-6xl mb-4">📷</div>
        <p>还没有照片哦</p>
        <p class="text-sm text-gray-300 mt-2">点击右下角按钮添加美好回忆~</p>
      </div>
    </div>

    <!-- 旅行足迹 -->
    <div v-else-if="currentTab === 'travel'" class="px-4 pt-4">
      <TravelPassport 
        ref="travelRef"
        :travels="travels" 
        @update:travels="travels = $event"
      />
    </div>

    <!-- 美食手账 -->
    <div v-else-if="currentTab === 'food'" class="px-4 pt-4">
      <FoodDiary 
        ref="foodRef"
        :foods="foods"
        :wishes="foodWishes"
        @update:foods="foods = $event"
        @update:wishes="foodWishes = $event"
      />
    </div>

    <!-- 灯箱 -->
    <Teleport to="body">
      <div 
        v-if="lightboxVisible" 
        class="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl"
        @click.self="closeLightbox"
      >
        <!-- 关闭按钮 -->
        <button 
          @click="closeLightbox"
          class="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <X class="w-6 h-6" />
        </button>

        <!-- 导航按钮 -->
        <button 
          v-if="lightboxIndex > 0"
          @click.stop="navigateLightbox(-1)"
          class="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft class="w-6 h-6" />
        </button>
        <button 
          v-if="lightboxIndex < photos.length - 1"
          @click.stop="navigateLightbox(1)"
          class="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronRight class="w-6 h-6" />
        </button>

        <!-- 照片 -->
        <div class="h-full flex items-center justify-center p-4">
          <img 
            :src="currentLightboxPhoto?.url"
            :alt="currentLightboxPhoto?.caption || '照片'"
            class="max-w-full max-h-[70vh] object-contain rounded-lg"
            draggable="false"
          />
        </div>

        <!-- 底部信息 -->
        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
          <div class="space-y-3">
            <p v-if="currentLightboxPhoto?.caption" class="text-white text-lg font-medium">
              {{ currentLightboxPhoto.caption }}
            </p>
            
            <!-- 旅行信息 -->
            <div v-if="currentLightboxPhoto?.type === 'travel'" class="flex items-center gap-2 text-white/80">
              <MapPin class="w-5 h-5 text-blue-400" />
              <span>旅行照片</span>
            </div>

            <!-- 美食信息 -->
            <div v-if="currentLightboxPhoto?.type === 'food'" class="flex items-center gap-2 text-white/80">
              <Utensils class="w-5 h-5 text-orange-400" />
              <span>美食照片</span>
            </div>

            <div class="flex items-center gap-4 text-white/60 text-sm">
              <span class="flex items-center gap-1">
                <Calendar class="w-4 h-4" />
                {{ formatDateFull(currentLightboxPhoto?.date) }}
              </span>
            </div>
          </div>

          <!-- 进度指示器 -->
          <div class="flex justify-center gap-2 mt-4">
            <button
              v-for="(_, index) in photos"
              :key="index"
              @click.stop="lightboxIndex = index"
              :class="[
                'h-1 rounded-full transition-all duration-300',
                index === lightboxIndex ? 'w-8 bg-pink-500' : 'w-2 bg-white/30'
              ]"
            />
          </div>
        </div>

        <!-- 照片计数 -->
        <div class="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/10 text-white text-sm">
          {{ lightboxIndex + 1 }} / {{ photos.length }}
        </div>
      </div>
    </Teleport>

    <!-- 添加按钮 -->
    <button 
      class="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40"
      @click="showUploadSheet = true"
    >
      <Plus class="w-6 h-6" />
    </button>

    <!-- 上传选择弹窗 -->
    <div 
      v-if="showUploadSheet"
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      @click.self="showUploadSheet = false"
    >
      <div class="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6">
        <div class="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
        <h3 class="text-lg font-semibold text-center mb-6">记录美好</h3>
        
        <div class="grid grid-cols-3 gap-4">
          <!-- 添加照片 -->
          <button 
            class="flex flex-col items-center gap-3 p-4 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
            @click="selectUploadType('photo')"
          >
            <div class="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <Camera class="w-6 h-6" />
            </div>
            <span class="text-sm font-medium">添加照片</span>
          </button>
          
          <!-- 记录旅行 -->
          <button 
            class="flex flex-col items-center gap-3 p-4 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            @click="selectUploadType('travel')"
          >
            <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <Plane class="w-6 h-6" />
            </div>
            <span class="text-sm font-medium">记录旅行</span>
          </button>
          
          <!-- 记录美食 -->
          <button 
            class="flex flex-col items-center gap-3 p-4 rounded-2xl bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
            @click="selectUploadType('food')"
          >
            <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Utensils class="w-6 h-6" />
            </div>
            <span class="text-sm font-medium">记录美食</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <div 
      v-if="showUploadPreview"
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeUpload"
    >
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold">发布照片</h3>
          <button @click="closeUpload" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto flex-1">
          <!-- 预览图片 -->
          <div class="flex gap-2 overflow-x-auto pb-4 mb-4">
            <div v-for="(file, index) in uploadFiles" :key="index" class="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
              <img :src="file.preview" class="w-full h-full object-cover" />
              <button 
                @click="removeUploadFile(index)"
                class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>
          
          <!-- 表单 -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm text-gray-500 mb-2">描述</label>
              <textarea 
                v-model="uploadCaption" 
                placeholder="添加照片描述..."
                rows="2"
                class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-2">标签</label>
              <input 
                v-model="uploadTags" 
                placeholder="用空格分隔，如：浪漫 旅行 美食"
                class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-500 mb-2">日期</label>
              <input 
                v-model="uploadDate" 
                type="date"
                class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
        </div>
        
        <div class="p-4 border-t border-gray-100">
          <button 
            :disabled="uploading"
            class="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium disabled:opacity-50"
            @click="submitUpload"
          >
            {{ uploading ? '上传中...' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div 
      v-if="toastMessage" 
      class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-xl text-sm z-[60]"
    >
      {{ toastMessage }}
    </div>

    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  Camera, Plus, X, ChevronLeft, ChevronRight, 
  MapPin, Utensils, Calendar, Plane, Heart 
} from 'lucide-vue-next'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'
import TravelPassport from '../components/TravelPassport.vue'
import FoodDiary from '../components/FoodDiary.vue'

// 标签页
const tabs = [
  { key: 'photos', label: '照片', icon: Camera },
  { key: 'travel', label: '足迹', icon: Plane },
  { key: 'food', label: '美食', icon: Utensils }
]

const currentTab = ref('photos')

// 照片相关
const loading = ref(false)
const photos = ref([])
const loadedImages = ref(new Set())
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

// 灯箱相关
const lightboxVisible = ref(false)
const lightboxIndex = ref(0)
const currentLightboxPhoto = computed(() => photos.value[lightboxIndex.value])

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
const travelRef = ref(null)
const foodRef = ref(null)

// 旅行和美食数据
const travels = ref([])
const foods = ref([])
const foodWishes = ref([])

// Toast
const toastMessage = ref('')

function showToast(msg) {
  toastMessage.value = msg
  setTimeout(() => toastMessage.value = '', 2000)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`
}

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function onImageLoad(id) {
  loadedImages.value.add(id)
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

function navigateLightbox(direction) {
  const newIndex = lightboxIndex.value + direction
  if (newIndex >= 0 && newIndex < photos.value.length) {
    lightboxIndex.value = newIndex
  }
}

// 上传选择
function selectUploadType(type) {
  showUploadSheet.value = false
  
  if (type === 'photo') {
    uploadType.value = 'normal'
    setTimeout(() => fileInput.value?.click(), 100)
  } else if (type === 'travel') {
    currentTab.value = 'travel'
    setTimeout(() => travelRef.value?.openAddDialog(), 100)
  } else if (type === 'food') {
    currentTab.value = 'food'
    setTimeout(() => foodRef.value?.openAddDialog(), 100)
  }
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

// 获取数据
async function fetchPhotos() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/photos`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      photos.value = data.data
      // 逐个加载动画
      photos.value.forEach((photo, index) => {
        setTimeout(() => {
          loadedImages.value.add(photo._id)
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

onMounted(() => {
  fetchPhotos()
  fetchTravels()
  fetchFoods()
  fetchFoodWishes()
})
</script>

<style scoped>
/* 瀑布流动画 */
.masonry-item {
  opacity: 0;
  animation: fadeIn 0.5s ease-out forwards;
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

/* 骨架屏 */
.img-placeholder {
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
