<template>
  <div class="bg-white rounded-2xl shadow-lg overflow-hidden">
    <!-- 头部 -->
    <div class="p-4 bg-gradient-to-r from-red-500 to-pink-500 text-white">
      <h3 class="font-semibold">我们的旅行足迹</h3>
      <p class="text-white/80 text-sm mt-1">记录我们一起走过的每一步</p>
    </div>

    <!-- 统计栏 -->
    <div class="flex gap-3 p-4 border-b border-gray-100">
      <div class="flex-1 bg-red-50 rounded-xl p-3 text-center">
        <div class="text-2xl font-bold text-red-600">{{ travels.length }}</div>
        <div class="text-xs text-gray-500">次打卡</div>
      </div>
      <div v-if="travels.length > 0" class="flex-1 bg-red-50 rounded-xl p-3 text-center">
        <div class="text-2xl font-bold text-red-600">{{ new Set(travels.map(t => t.city)).size }}</div>
        <div class="text-xs text-gray-500">个城市</div>
      </div>
      <div v-if="favoriteTravels.length > 0" class="flex-1 bg-pink-50 rounded-xl p-3 text-center">
        <div class="text-2xl font-bold text-pink-600">{{ favoriteTravels.length }}</div>
        <div class="text-xs text-gray-500">特别喜爱</div>
      </div>
    </div>

    <!-- 邮票墙 -->
    <div class="p-4">
      <div v-if="travels.length === 0" class="text-center py-10 text-gray-400">
        <div class="text-5xl mb-3">✈️</div>
        <p>还没有旅行记录</p>
        <p class="text-sm text-gray-300 mt-1">点击下方按钮添加你们的第一次旅行~</p>
      </div>
      <div v-else class="grid grid-cols-4 gap-4">
        <div 
          v-for="record in travels" 
          :key="record._id"
          class="cursor-pointer"
          @click="setSelectedRecord(record)"
        >
          <TravelStamp :record="record" />
        </div>
      </div>
    </div>

    <!-- 添加按钮 -->
    <button 
      @click="showAddDialog = true"
      class="w-[calc(100%-32px)] mx-4 mb-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
    >
      <Plus class="w-5 h-5" />
      记录新旅行
    </button>

    <!-- 添加弹窗 -->
    <div 
      v-if="showAddDialog" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeAddDialog"
    >
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold">添加旅行记录</h3>
          <button @click="closeAddDialog" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label class="block text-sm text-gray-500 mb-2">城市</label>
            <input 
              v-model="newTravel.city" 
              placeholder="如：杭州"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">国家</label>
            <input 
              v-model="newTravel.country" 
              placeholder="如：中国"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">日期</label>
            <input 
              v-model="newTravel.date" 
              type="date"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">天气</label>
            <input 
              v-model="newTravel.weather" 
              placeholder="如：晴朗 18°C"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">照片</label>
            <div class="flex gap-2 flex-wrap">
              <div v-for="(photo, index) in newTravel.photos" :key="index" class="relative w-16 h-16 rounded-lg overflow-hidden">
                <img :src="photo" class="w-full h-full object-cover" />
                <button 
                  @click="removePhoto(index)"
                  class="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
              <button 
                @click="selectPhotos"
                class="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-red-300 hover:text-red-500 transition-colors"
              >
                <Plus class="w-6 h-6" />
              </button>
              <input 
                ref="photoInput" 
                type="file" 
                accept="image/*" 
                multiple 
                class="hidden" 
                @change="handlePhotoSelect"
              >
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">美好回忆</label>
            <textarea 
              v-model="newTravel.memory" 
              placeholder="记录这次旅行的美好回忆..."
              rows="3"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">精彩瞬间（用空格分隔）</label>
            <input 
              v-model="highlightsInput" 
              placeholder="如：西湖日落 断桥漫步 龙井茶"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20"
            >
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="newTravel.isFavorite" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500">
            <span class="text-sm text-gray-700">特别喜欢的旅行</span>
          </label>
        </div>
        
        <div class="p-4 border-t border-gray-100 flex gap-3">
          <button 
            @click="closeAddDialog"
            class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
          >
            取消
          </button>
          <button 
            :disabled="submitting"
            class="flex-1 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl font-medium disabled:opacity-50"
            @click="submitTravel"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div 
      v-if="selectedTravel" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      @click.self="closeDetail"
    >
      <div 
        class="absolute inset-x-0 top-0 bottom-0 bg-amber-50 overflow-y-auto"
        @click="e => e.stopPropagation()"
        style="background-image: repeating-linear-gradient(transparent, transparent 31px, #e8e8e8 31px, #e8e8e8 32px); background-size: 100% 32px;"
      >
        <!-- 护照页眉 -->
        <div class="sticky top-0 z-10 bg-gradient-to-r from-red-600 to-pink-600 text-white p-4 shadow-lg">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Plane class="w-5 h-5" />
              <span class="text-sm tracking-wider">旅行纪念</span>
            </div>
            <button @click="closeDetail" class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="p-4 pb-20">
          <!-- 目的地标题 -->
          <div class="text-center mb-4">
            <p class="text-gray-400 text-sm">{{ selectedTravel.country }}</p>
            <h2 class="text-3xl font-bold text-gray-800">{{ selectedTravel.city }}</h2>
            <div class="flex items-center justify-center gap-2 mt-2 text-gray-500 text-sm">
              <Calendar class="w-4 h-4" />
              <span>{{ formatDateFull(selectedTravel.date) }}</span>
              <span v-if="selectedTravel.weather">· {{ selectedTravel.weather }}</span>
            </div>
            <div v-if="selectedTravel.isFavorite" class="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-pink-100 text-pink-600 text-sm">
              <Heart class="w-4 h-4 fill-pink-500" />
              特别喜欢的旅行
            </div>
          </div>

          <!-- 照片画廊 -->
          <div class="mb-6">
            <PhotoGallery :photos="selectedTravel.photos" />
          </div>

          <!-- 美好回忆 -->
          <div v-if="selectedTravel.memory" class="bg-white rounded-xl p-4 shadow-sm mb-4">
            <div class="flex items-center gap-2 mb-3">
              <Heart class="w-5 h-5 text-pink-500 fill-pink-500" />
              <h3 class="font-semibold text-gray-800">美好回忆</h3>
            </div>
            <p class="text-gray-600 leading-relaxed">{{ selectedTravel.memory }}</p>
          </div>

          <!-- 精彩瞬间 -->
          <div v-if="selectedTravel.highlights?.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="font-semibold text-gray-800 mb-3">精彩瞬间</h3>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="(highlight, i) in selectedTravel.highlights" 
                :key="i"
                class="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm"
              >
                {{ highlight }}
              </span>
            </div>
          </div>

          <!-- 删除按钮 -->
          <button 
            @click="deleteTravel(selectedTravel._id)"
            class="w-full mt-6 py-3 bg-red-50 text-red-500 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <Trash2 class="w-4 h-4" />
            删除此记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plane, Heart, Plus, X, Calendar, Trash2 } from 'lucide-vue-next'
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

const showAddDialog = ref(false)
const selectedTravel = ref(null)
const submitting = ref(false)
const photoInput = ref(null)
const highlightsInput = ref('')

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

const favoriteTravels = computed(() => props.travels.filter(t => t.isFavorite))

function formatDateFull(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function setSelectedRecord(record) {
  selectedTravel.value = record
}

function closeDetail() {
  selectedTravel.value = null
}

function closeAddDialog() {
  showAddDialog.value = false
  resetForm()
}

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

function selectPhotos() {
  photoInput.value?.click()
}

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

function removePhoto(index) {
  newTravel.value.photos.splice(index, 1)
}

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
      // 同步到照片库
      for (const photoUrl of newTravel.value.photos) {
        try {
          const img = new Image()
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = reject
            img.src = photoUrl
          })
          const aspectRatio = img.width / img.height
          
          await fetch(`${CONFIG.API_URL}/photos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              url: photoUrl,
              date: newTravel.value.date,
              caption: `${newTravel.value.city} · ${newTravel.value.memory?.slice(0, 20) || '旅行记录'}`,
              tags: ['旅行', newTravel.value.city, ...(highlights || [])].filter(Boolean),
              aspectRatio,
              type: 'travel',
              travelId: data.data._id
            })
          })
        } catch (e) {
          console.error('同步到照片库失败:', e)
        }
      }
      
      emit('update:travels', [data.data, ...props.travels])
      closeAddDialog()
    }
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    submitting.value = false
  }
}

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
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
