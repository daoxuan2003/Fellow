<template>
  <div class="space-y-3">
    <!-- 统计栏 -->
    <div class="flex gap-3">
      <div class="flex-1 bg-amber-50 rounded-xl p-3 text-center border border-amber-100">
        <div class="text-2xl font-bold text-amber-600">{{ foods.length }}</div>
        <div class="text-xs text-gray-500">家店</div>
      </div>
      <div v-if="favorites.length > 0" class="flex-1 bg-pink-50 rounded-xl p-3 text-center border border-pink-100">
        <div class="text-2xl font-bold text-pink-600">{{ favorites.length }}</div>
        <div class="text-xs text-gray-500">最爱</div>
      </div>
      <div v-if="wantAgain.length > 0" class="flex-1 bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
        <div class="text-2xl font-bold text-orange-600">{{ wantAgain.length }}</div>
        <div class="text-xs text-gray-500">想再去</div>
      </div>
    </div>

    <!-- 记录按钮 -->
    <button 
      @click="showAddDialog = true"
      class="w-full py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
    >
      <Plus class="w-5 h-5" />
      记录美食
    </button>

    <!-- 美食列表 -->
    <div class="grid grid-cols-2 gap-2">
      <div 
        v-for="food in foods" 
        :key="food._id"
        class="relative bg-white rounded-xl shadow-sm border border-amber-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        @click="selectedFood = food"
      >
        <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-12 h-5 bg-amber-200/60 transform -rotate-2 z-10" />
          <div class="aspect-[4/3] relative">
            <img :src="food.photos[0]" :alt="food.restaurant" class="w-full h-full object-cover" />
            <div class="absolute top-2 left-2 flex flex-col gap-1">
              <div v-if="food.isOurFavorite" class="px-2 py-0.5 rounded-full bg-pink-500 text-white text-[10px] flex items-center gap-1">
                <Heart class="w-3 h-3 fill-white" />
                我们的最爱
              </div>
              <div v-else-if="food.wantToGoAgain" class="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] flex items-center gap-1">
                <Heart class="w-3 h-3 fill-white" />
                想再去
              </div>
            </div>
            <div v-if="food.photos.length > 1" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
              {{ food.photos.length }}张
            </div>
          </div>
          <div class="p-3">
            <h4 class="font-bold text-gray-800 text-sm truncate">{{ food.restaurant }}</h4>
            <div v-if="food.whatWeAte.length > 0" class="flex flex-wrap gap-1 mt-1.5">
              <span 
                v-for="(item, i) in food.whatWeAte.slice(0, 2)" 
                :key="i"
                class="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full"
              >
                {{ item }}
              </span>
              <span v-if="food.whatWeAte.length > 2" class="text-[10px] text-gray-400">+{{ food.whatWeAte.length - 2 }}</span>
            </div>
            <div class="flex items-center gap-1 mt-2 text-gray-400 text-[10px]">
              <Calendar class="w-3 h-3" />
              <span>{{ formatDateShort(food.date) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 想吃清单 -->
    <div class="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-3 border border-pink-100">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <Bookmark class="w-4 h-4 text-pink-500" />
          <h4 class="font-medium text-gray-700 text-sm">想吃清单</h4>
        </div>
        <span class="text-xs text-gray-400">{{ wishes.length }}家</span>
      </div>

      <div v-if="wishes.length === 0" class="text-gray-400 text-xs text-center py-3">
        还没有想吃的，快去添加吧~
      </div>
      <div v-else class="space-y-2">
        <div 
          v-for="wish in wishes.slice(0, 3)" 
          :key="wish._id" 
          class="bg-white rounded-lg p-2 flex items-center gap-2"
        >
          <div class="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center text-sm">🍽️</div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-800 text-xs truncate">{{ wish.restaurant }}</p>
            <p class="text-[10px] text-gray-400 truncate">{{ wish.whyWeWant }}</p>
          </div>
          <button 
            @click.stop="deleteWish(wish._id)"
            class="w-5 h-5 rounded-full bg-pink-50 text-pink-500 text-xs flex items-center justify-center hover:bg-pink-100"
          >
            ×
          </button>
        </div>
        <p v-if="wishes.length > 3" class="text-center text-xs text-gray-400">+{{ wishes.length - 3 }} 更多</p>
      </div>
      
      <button 
        @click="showWishDialog = true"
        class="w-full mt-3 py-2 bg-white border border-dashed border-pink-300 rounded-lg text-pink-500 text-xs flex items-center justify-center gap-1 hover:bg-pink-50 transition-colors"
      >
        <Plus class="w-3 h-3" />
        添加想吃的店
      </button>
    </div>

    <!-- 添加美食弹窗 -->
    <div 
      v-if="showAddDialog"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeAddDialog"
    >
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold">记录美食</h3>
          <button @click="closeAddDialog" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label class="block text-sm text-gray-500 mb-2">餐厅名</label>
            <input 
              v-model="newFood.restaurant" 
              placeholder="如：海底捞"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">日期</label>
            <input 
              v-model="newFood.date" 
              type="date"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">位置</label>
            <input 
              v-model="newFood.location" 
              placeholder="如：万达广场"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">照片</label>
            <div class="flex gap-2 flex-wrap">
              <div v-for="(photo, index) in newFood.photos" :key="index" class="relative w-16 h-16 rounded-lg overflow-hidden">
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
                class="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-orange-300 hover:text-orange-500 transition-colors"
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
            <label class="block text-sm text-gray-500 mb-2">吃了什么（用空格分隔）</label>
            <input 
              v-model="whatWeAteInput" 
              placeholder="如：火锅 毛肚 鸭肠"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">感受如何</label>
            <textarea 
              v-model="newFood.howWasIt" 
              placeholder="记录这次用餐的感受..."
              rows="3"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="newFood.isOurFavorite" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500">
              <span class="text-sm text-gray-700 flex items-center gap-1">
                <Heart class="w-3 h-3 text-pink-500" /> 我们的最爱
              </span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="newFood.wantToGoAgain" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500">
              <span class="text-sm text-gray-700 flex items-center gap-1">
                <Heart class="w-3 h-3 text-orange-500" /> 还想再去
              </span>
            </label>
          </div>
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
            class="flex-1 py-3 bg-gradient-to-r from-orange-400 to-amber-500 text-white rounded-xl font-medium disabled:opacity-50"
            @click="submitFood"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 添加想吃弹窗 -->
    <div 
      v-if="showWishDialog"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="showWishDialog = false"
    >
      <div class="bg-white rounded-2xl w-full max-w-sm p-4">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-semibold">添加想吃清单</h3>
          <button @click="showWishDialog = false" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-500 mb-2">餐厅名</label>
            <input 
              v-model="newWish.restaurant" 
              placeholder="如：米其林日料"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">为什么想吃</label>
            <textarea 
              v-model="newWish.whyWeWant" 
              placeholder="听说服务超好，想体验一下..."
              rows="3"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/20"
            />
          </div>
        </div>
        <div class="flex gap-3 mt-6">
          <button 
            @click="showWishDialog = false"
            class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
          >
            取消
          </button>
          <button 
            class="flex-1 py-3 bg-gradient-to-r from-pink-400 to-purple-400 text-white rounded-xl font-medium"
            @click="submitWish"
          >
            添加
          </button>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <div 
      v-if="selectedFood"
      class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
      @click.self="closeDetail"
    >
      <div 
        class="absolute inset-x-0 top-0 bottom-0 bg-amber-50 overflow-y-auto"
        @click="e => e.stopPropagation()"
        style="background-image: repeating-linear-gradient(transparent, transparent 31px, #e5e5e5 31px, #e5e5e5 32px); background-size: 100% 32px;"
      >
        <!-- 手账头部 -->
        <div class="sticky top-0 z-10 bg-white border-b border-amber-100 p-4 flex items-center justify-between shadow-sm">
          <span class="font-medium text-amber-800">美食手账</span>
          <button @click="closeDetail" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
            <X class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div class="p-4 pb-20">
          <!-- 日期 -->
          <div class="flex items-center gap-2 text-amber-600/60 text-sm mb-3">
            <Calendar class="w-4 h-4" />
            <span>{{ formatDateFull(selectedFood.date) }}</span>
          </div>

          <!-- 店名和标签 -->
          <div class="mb-4">
            <h2 class="text-2xl font-bold text-gray-800">{{ selectedFood.restaurant }}</h2>
            <div class="flex gap-2 mt-2">
              <span v-if="selectedFood.isOurFavorite" class="px-2 py-1 rounded-full bg-pink-100 text-pink-600 text-xs flex items-center gap-1">
                <Heart class="w-3 h-3 fill-pink-500" />
                我们的最爱
              </span>
              <span v-if="selectedFood.wantToGoAgain" class="px-2 py-1 rounded-full bg-orange-100 text-orange-600 text-xs flex items-center gap-1">
                <Heart class="w-3 h-3 fill-orange-500" />
                还想再去
              </span>
            </div>
          </div>

          <!-- 照片画廊 -->
          <div class="mb-6">
            <PhotoGallery :photos="selectedFood.photos" theme="orange" />
          </div>

          <!-- 吃了什么 -->
          <div v-if="selectedFood.whatWeAte.length > 0" class="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-orange-400 rounded-full" />
              我们吃了
            </h4>
            <div class="flex flex-wrap gap-2">
              <span 
                v-for="(item, i) in selectedFood.whatWeAte" 
                :key="i"
                class="px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm"
              >
                {{ item }}
              </span>
            </div>
          </div>

          <!-- 感受 -->
          <div v-if="selectedFood.howWasIt" class="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h4 class="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-1 h-4 bg-pink-400 rounded-full" />
              感受如何
            </h4>
            <p class="text-gray-700 leading-relaxed">{{ selectedFood.howWasIt }}</p>
          </div>

          <!-- 位置 -->
          <div v-if="selectedFood.location" class="flex items-center gap-2 text-gray-400 text-sm mb-6">
            <MapPin class="w-4 h-4" />
            <span>{{ selectedFood.location }}</span>
          </div>

          <!-- 删除按钮 -->
          <button 
            @click="deleteFood(selectedFood._id)"
            class="w-full py-3 bg-red-50 text-red-500 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
          >
            <Trash2 class="w-4 h-4" />
            删除记录
          </button>
        </div>
      </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Heart, Plus, X, Calendar, Bookmark, MapPin, Trash2 } from 'lucide-vue-next'
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

const showAddDialog = ref(false)
const showWishDialog = ref(false)
const selectedFood = ref(null)
const submitting = ref(false)
const photoInput = ref(null)
const whatWeAteInput = ref('')

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

const newWish = ref({
  restaurant: '',
  whyWeWant: ''
})

const favorites = computed(() => props.foods.filter(f => f.isOurFavorite))
const wantAgain = computed(() => props.foods.filter(f => f.wantToGoAgain && !f.isOurFavorite))
const uniqueDishesCount = computed(() => {
  const allDishes = props.foods.flatMap(f => f.whatWeAte)
  return new Set(allDishes).size
})

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

function closeDetail() {
  selectedFood.value = null
}

function closeAddDialog() {
  showAddDialog.value = false
  resetForm()
}

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
        newFood.value.photos.push(data.data.url)
      }
    } catch (e) {
      console.error('上传照片失败:', e)
    }
  }
}

function removePhoto(index) {
  newFood.value.photos.splice(index, 1)
}

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
      // 同步到照片库
      for (const photoUrl of newFood.value.photos) {
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
              date: newFood.value.date,
              caption: `${newFood.value.restaurant} · ${whatWeAte.slice(0, 2).join('、') || '美食记录'}`,
              tags: ['美食', newFood.value.restaurant, ...(whatWeAte || [])].filter(Boolean),
              aspectRatio,
              type: 'food',
              foodId: data.data._id
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
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
