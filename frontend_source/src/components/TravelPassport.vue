<template>
  <div class="space-y-4">
    <!-- ECharts 中国地图 -->
    <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-4 border-b border-gray-100">
        <h3 class="font-semibold text-gray-800">足迹地图</h3>
        <p class="text-sm text-gray-500 mt-0.5">已点亮 {{ visitedProvinceCount }} 个省份 · 点击地图可缩放</p>
      </div>
      
      <!-- 真实中国地图 -->
      <div class="p-4">
        <div class="aspect-[4/3] bg-blue-50/30 rounded-xl overflow-hidden">
          <ChinaMap :visited-provinces="visitedCities" />
        </div>
        
        <!-- 统计 -->
        <div class="flex gap-3 mt-4">
          <div class="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ travels.length }}</div>
            <div class="text-xs text-gray-500">次旅行</div>
          </div>
          <div class="flex-1 bg-blue-50 rounded-xl p-3 text-center">
            <div class="text-2xl font-bold text-blue-600">{{ uniqueCities.length }}</div>
            <div class="text-xs text-gray-500">个城市</div>
          </div>
          <div v-if="favoriteTravels.length > 0" class="flex-1 bg-pink-50 rounded-xl p-3 text-center">
            <div class="text-2xl font-bold text-pink-600">{{ favoriteTravels.length }}</div>
            <div class="text-xs text-gray-500">最爱</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2列卡片式旅行记录 -->
    <div class="grid grid-cols-2 gap-3">
      <div 
        v-for="record in travels" 
        :key="record._id"
        class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer active:scale-95 transition-transform"
        @click="setSelectedRecord(record)"
      >
        <!-- 图片 -->
        <div class="relative aspect-[4/3]">
          <img 
            :src="record.photos?.[0] || 'https://picsum.photos/seed/travel/400/300'" 
            :alt="record.city"
            class="w-full h-full object-cover"
          />
          
          <!-- 收藏标记 -->
          <div v-if="record.isFavorite" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center shadow-sm">
            <Heart class="w-3 h-3 text-white fill-white" />
          </div>
          
          <!-- 多图标记 -->
          <div v-if="record.photos?.length > 1" class="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-black/40 text-white text-[10px]">
            {{ record.photos.length }}张
          </div>
        </div>
        
        <!-- 信息 -->
        <div class="p-3">
          <div class="flex items-start justify-between">
            <div>
              <h4 class="font-bold text-gray-800 text-sm">{{ record.city }}</h4>
              <p v-if="record.spot" class="text-xs text-gray-500 mt-0.5">{{ record.spot }}</p>
            </div>
            <span class="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">
              {{ getProvinceShort(record.city) }}
            </span>
          </div>
          
          <div class="flex items-center gap-3 mt-2 text-gray-400 text-[10px]">
            <span class="flex items-center gap-1">
              <Calendar class="w-3 h-3" />
              {{ formatDateShort(record.date) }}
            </span>
            <span v-if="record.weather">{{ record.weather }}</span>
          </div>
          
          <!-- 精彩瞬间标签 -->
          <div v-if="record.highlights?.length" class="flex flex-wrap gap-1 mt-2">
            <span 
              v-for="(tag, i) in record.highlights.slice(0, 2)" 
              :key="i"
              class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full"
            >
              {{ tag }}
            </span>
            <span v-if="record.highlights.length > 2" class="text-[10px] text-gray-400">+{{ record.highlights.length - 2 }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="travels.length === 0" class="text-center py-12 text-gray-400">
      <div class="text-5xl mb-3">✈️</div>
      <p>还没有旅行记录</p>
      <p class="text-sm text-gray-300 mt-1">点击下方按钮开始你们的旅程~</p>
    </div>

    <!-- 添加弹窗 -->
    <div 
      v-if="showAddDialog" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="closeAddDialog"
    >
      <div class="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 class="font-semibold">添加旅行记录</h3>
          <button @click="closeAddDialog" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="p-4 overflow-y-auto flex-1 space-y-4">
          <div>
            <label class="block text-sm text-gray-500 mb-2">城市 <span class="text-red-500">*</span></label>
            <input 
              v-model="newTravel.city" 
              placeholder="如：杭州"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">具体地点（选填）</label>
            <input 
              v-model="newTravel.spot" 
              placeholder="如：西湖、灵隐寺"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">日期</label>
            <input 
              v-model="newTravel.date" 
              type="date"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">天气</label>
            <input 
              v-model="newTravel.weather" 
              placeholder="如：晴朗 18°C"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                class="w-16 h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
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
              class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label class="block text-sm text-gray-500 mb-2">精彩瞬间（用空格分隔）</label>
            <input 
              v-model="highlightsInput" 
              placeholder="如：西湖日落 断桥漫步 龙井茶"
              class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
          </div>
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="newTravel.isFavorite" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500">
            <span class="text-sm text-gray-700">特别喜欢的旅行</span>
          </label>
        </div>
        
        <div class="p-4 border-t border-gray-100 flex gap-3">
          <button 
            @click="closeAddDialog"
            class="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium active:scale-95 transition-transform"
          >
            取消
          </button>
          <button 
            :disabled="submitting || !newTravel.city"
            class="flex-1 py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
            @click="submitTravel"
          >
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情/编辑弹窗 -->
    <div 
      v-if="selectedTravel" 
      class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      @click.self="closeDetail"
    >
      <div 
        class="absolute inset-x-0 top-0 bottom-0 bg-white overflow-y-auto"
        @click="e => e.stopPropagation()"
      >
        <!-- 顶部导航 -->
        <div class="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-100 p-4">
          <div class="flex items-center justify-between">
            <button @click="closeDetail" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform">
              <X class="w-5 h-5" />
            </button>
            <span class="font-medium">{{ isEditing ? '编辑旅行' : '旅行详情' }}</span>
            <button 
              v-if="!isEditing"
              @click="startEdit" 
              class="text-sm text-blue-600 font-medium px-2 py-1"
            >
              编辑
            </button>
            <button 
              v-else
              @click="cancelEdit" 
              class="text-sm text-gray-500 font-medium px-2 py-1"
            >
              取消
            </button>
          </div>
        </div>

        <div class="pb-8">
          <!-- 查看模式 -->
          <template v-if="!isEditing">
            <!-- 大图 -->
            <div class="aspect-[4/3] relative">
              <img 
                :src="selectedTravel.photos?.[0] || 'https://picsum.photos/seed/travel/400/300'" 
                :alt="selectedTravel.city"
                class="w-full h-full object-cover"
              />
              <div v-if="selectedTravel.isFavorite" class="absolute top-4 right-4 w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center shadow-lg">
                <Heart class="w-5 h-5 text-white fill-white" />
              </div>
            </div>

            <div class="p-4 space-y-4">
              <!-- 标题信息 -->
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h2 class="text-2xl font-bold text-gray-800">{{ selectedTravel.city }}</h2>
                  <span class="text-sm text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    {{ getProvinceName(selectedTravel.city) }}
                  </span>
                </div>
                <p v-if="selectedTravel.spot" class="text-gray-500">{{ selectedTravel.spot }}</p>
              </div>

              <!-- 元信息 -->
              <div class="flex items-center gap-4 text-sm text-gray-500">
                <span class="flex items-center gap-1">
                  <Calendar class="w-4 h-4" />
                  {{ formatDateFull(selectedTravel.date) }}
                </span>
                <span v-if="selectedTravel.weather">{{ selectedTravel.weather }}</span>
              </div>

              <!-- 照片画廊 -->
              <div v-if="selectedTravel.photos?.length > 1" class="flex gap-2 overflow-x-auto pb-2">
                <img 
                  v-for="(photo, i) in selectedTravel.photos" 
                  :key="i"
                  :src="photo" 
                  class="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              </div>

              <!-- 美好回忆 -->
              <div v-if="selectedTravel.memory" class="bg-gray-50 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-2">
                  <Heart class="w-4 h-4 text-pink-500 fill-pink-500" />
                  <span class="font-medium text-gray-700">美好回忆</span>
                </div>
                <p class="text-gray-600 leading-relaxed">{{ selectedTravel.memory }}</p>
              </div>

              <!-- 精彩瞬间 -->
              <div v-if="selectedTravel.highlights?.length">
                <h4 class="font-medium text-gray-700 mb-2">精彩瞬间</h4>
                <div class="flex flex-wrap gap-2">
                  <span 
                    v-for="(tag, i) in selectedTravel.highlights" 
                    :key="i"
                    class="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <!-- 删除按钮 -->
              <button 
                @click="deleteTravel(selectedTravel._id)"
                class="w-full py-3 bg-red-50 text-red-500 rounded-xl font-medium flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Trash2 class="w-4 h-4" />
                删除此记录
              </button>
            </div>
          </template>

          <!-- 编辑模式 -->
          <template v-else>
            <div class="p-4 space-y-4">
              <div>
                <label class="block text-sm text-gray-500 mb-2">城市</label>
                <input 
                  v-model="editForm.city" 
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-2">具体地点</label>
                <input 
                  v-model="editForm.spot" 
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-2">日期</label>
                <input 
                  v-model="editForm.date" 
                  type="date"
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-2">天气</label>
                <input 
                  v-model="editForm.weather" 
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
              </div>
              
              <!-- 照片管理 -->
              <div>
                <label class="block text-sm text-gray-500 mb-2">照片</label>
                <div class="flex gap-2 flex-wrap">
                  <div v-for="(photo, index) in editForm.photos" :key="index" class="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img :src="photo" class="w-full h-full object-cover" />
                    <button 
                      @click="removeEditPhoto(index)"
                      class="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                  <button 
                    @click="selectEditPhotos"
                    class="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
                  >
                    <Plus class="w-6 h-6" />
                  </button>
                  <input 
                    ref="editPhotoInput" 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    class="hidden" 
                    @change="handleEditPhotoSelect"
                  >
                </div>
              </div>
              
              <div>
                <label class="block text-sm text-gray-500 mb-2">美好回忆</label>
                <textarea 
                  v-model="editForm.memory" 
                  rows="4"
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-500 mb-2">精彩瞬间（用空格分隔）</label>
                <input 
                  v-model="editHighlightsInput" 
                  class="w-full p-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input v-model="editForm.isFavorite" type="checkbox" class="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500">
                <span class="text-sm text-gray-700">特别喜欢的旅行</span>
              </label>

              <!-- 保存按钮 -->
              <button 
                :disabled="updating"
                class="w-full py-3 bg-blue-500 text-white rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-transform"
                @click="saveEdit"
              >
                {{ updating ? '保存中...' : '保存修改' }}
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Heart, Plus, X, Calendar, Trash2 } from 'lucide-vue-next'
import { CONFIG } from '../utils/config.js'
import ChinaMap from './ChinaMap.vue'

const props = defineProps({
  travels: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:travels'])

// 访问过的城市列表（用于地图）
const visitedCities = computed(() => props.travels.map(t => t.city))

// 计算访问过的省份数量（简化计算）
const visitedProvinceCount = computed(() => {
  const provinceMap = {
    '北京': 1, '上海': 1, '天津': 1, '重庆': 1,
    '石家庄': '河北', '太原': '山西', '呼和浩特': '内蒙古',
    '沈阳': '辽宁', '大连': '辽宁', '长春': '吉林', '哈尔滨': '黑龙江',
    '南京': '江苏', '苏州': '江苏', '无锡': '江苏', '徐州': '江苏',
    '杭州': '浙江', '宁波': '浙江', '温州': '浙江', '绍兴': '浙江', '嘉兴': '浙江', '台州': '浙江', '金华': '浙江', '湖州': '浙江', '衢州': '浙江', '丽水': '浙江', '舟山': '浙江',
    '合肥': '安徽', '芜湖': '安徽',
    '福州': '福建', '厦门': '福建', '泉州': '福建',
    '南昌': '江西', '赣州': '江西',
    '济南': '山东', '青岛': '山东', '烟台': '山东', '威海': '山东',
    '郑州': '河南', '洛阳': '河南',
    '武汉': '湖北', '宜昌': '湖北',
    '长沙': '湖南', '张家界': '湖南',
    '广州': '广东', '深圳': '广东', '珠海': '广东', '佛山': '广东', '东莞': '广东',
    '南宁': '广西', '桂林': '广西', '北海': '广西',
    '海口': '海南', '三亚': '海南',
    '成都': '四川', '绵阳': '四川',
    '贵阳': '贵州',
    '昆明': '云南', '大理': '云南', '丽江': '云南',
    '拉萨': '西藏',
    '西安': '陕西',
    '兰州': '甘肃', '嘉峪关': '甘肃', '敦煌': '甘肃',
    '西宁': '青海',
    '银川': '宁夏',
    '乌鲁木齐': '新疆',
    '台北': '台湾', '高雄': '台湾',
    '香港': '香港', '澳门': '澳门'
  }
  
  const provinces = new Set()
  props.travels.forEach(travel => {
    const prov = provinceMap[travel.city]
    if (prov) {
      if (prov === 1) {
        provinces.add(travel.city + '市')
      } else {
        provinces.add(prov)
      }
    }
  })
  return provinces.size
})

const showAddDialog = ref(false)
const selectedTravel = ref(null)
const submitting = ref(false)
const photoInput = ref(null)
const highlightsInput = ref('')

// 编辑相关
const isEditing = ref(false)
const updating = ref(false)
const editForm = ref({
  city: '',
  spot: '',
  date: '',
  weather: '',
  memory: '',
  highlights: [],
  isFavorite: false
})
const editHighlightsInput = ref('')

const newTravel = ref({
  city: '',
  spot: '',
  country: '中国',
  date: new Date().toISOString().split('T')[0],
  photos: [],
  memory: '',
  highlights: [],
  weather: '',
  isFavorite: false
})

const uniqueCities = computed(() => [...new Set(props.travels.map(t => t.city))])
const favoriteTravels = computed(() => props.travels.filter(t => t.isFavorite))

// 城市到省份简称的映射
const cityToProvinceShort = {
  '北京': '京', '上海': '沪', '天津': '津', '重庆': '渝',
  '石家庄': '冀', '太原': '晋', '呼和浩特': '蒙',
  '沈阳': '辽', '大连': '辽', '长春': '吉', '哈尔滨': '黑',
  '南京': '苏', '苏州': '苏', '无锡': '苏', '徐州': '苏',
  '杭州': '浙', '宁波': '浙', '温州': '浙', '绍兴': '浙', '嘉兴': '浙', '台州': '浙', '金华': '浙', '湖州': '浙', '衢州': '浙', '丽水': '浙', '舟山': '浙',
  '合肥': '皖', '芜湖': '皖',
  '福州': '闽', '厦门': '闽', '泉州': '闽',
  '南昌': '赣', '赣州': '赣',
  '济南': '鲁', '青岛': '鲁', '烟台': '鲁', '威海': '鲁',
  '郑州': '豫', '洛阳': '豫',
  '武汉': '鄂', '宜昌': '鄂',
  '长沙': '湘', '张家界': '湘',
  '广州': '粤', '深圳': '粤', '珠海': '粤', '佛山': '粤', '东莞': '粤',
  '南宁': '桂', '桂林': '桂', '北海': '桂',
  '海口': '琼', '三亚': '琼',
  '成都': '川', '绵阳': '川',
  '贵阳': '贵',
  '昆明': '云', '大理': '云', '丽江': '云',
  '拉萨': '藏',
  '西安': '陕',
  '兰州': '甘', '嘉峪关': '甘', '敦煌': '甘',
  '西宁': '青',
  '银川': '宁',
  '乌鲁木齐': '新',
  '台北': '台', '高雄': '台',
  '香港': '港', '澳门': '澳'
}

// 城市到省份全称的映射
const cityToProvinceFull = {
  '北京': '北京市', '上海': '上海市', '天津': '天津市', '重庆': '重庆市',
  '石家庄': '河北省', '太原': '山西省', '呼和浩特': '内蒙古',
  '沈阳': '辽宁省', '大连': '辽宁省', '长春': '吉林省', '哈尔滨': '黑龙江省',
  '南京': '江苏省', '苏州': '江苏省', '无锡': '江苏省', '徐州': '江苏省',
  '杭州': '浙江省', '宁波': '浙江省', '温州': '浙江省', '绍兴': '浙江省', '嘉兴': '浙江省', '台州': '浙江省', '金华': '浙江省', '湖州': '浙江省', '衢州': '浙江省', '丽水': '浙江省', '舟山': '浙江省',
  '合肥': '安徽省', '芜湖': '安徽省',
  '福州': '福建省', '厦门': '福建省', '泉州': '福建省',
  '南昌': '江西省', '赣州': '江西省',
  '济南': '山东省', '青岛': '山东省', '烟台': '山东省', '威海': '山东省',
  '郑州': '河南省', '洛阳': '河南省',
  '武汉': '湖北省', '宜昌': '湖北省',
  '长沙': '湖南省', '张家界': '湖南省',
  '广州': '广东省', '深圳': '广东省', '珠海': '广东省', '佛山': '广东省', '东莞': '广东省',
  '南宁': '广西', '桂林': '广西', '北海': '广西',
  '海口': '海南省', '三亚': '海南省',
  '成都': '四川省', '绵阳': '四川省',
  '贵阳': '贵州省',
  '昆明': '云南省', '大理': '云南省', '丽江': '云南省',
  '拉萨': '西藏',
  '西安': '陕西省',
  '兰州': '甘肃省', '嘉峪关': '甘肃省', '敦煌': '甘肃省',
  '西宁': '青海省',
  '银川': '宁夏',
  '乌鲁木齐': '新疆',
  '台北': '台湾省', '高雄': '台湾省',
  '香港': '香港', '澳门': '澳门'
}

function getProvinceShort(city) {
  return cityToProvinceShort[city] || ''
}

function getProvinceName(city) {
  return cityToProvinceFull[city] || ''
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`
}

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
  isEditing.value = false
}

// 开始编辑
function startEdit() {
  if (!selectedTravel.value) return
  editForm.value = {
    city: selectedTravel.value.city || '',
    spot: selectedTravel.value.spot || '',
    date: selectedTravel.value.date ? selectedTravel.value.date.split('T')[0] : '',
    weather: selectedTravel.value.weather || '',
    memory: selectedTravel.value.memory || '',
    highlights: selectedTravel.value.highlights || [],
    isFavorite: selectedTravel.value.isFavorite || false,
    photos: [...(selectedTravel.value.photos || [])]
  }
  editHighlightsInput.value = (selectedTravel.value.highlights || []).join(' ')
  isEditing.value = true
}

// 取消编辑
function cancelEdit() {
  isEditing.value = false
}

// 编辑照片相关
const editPhotoInput = ref(null)

function selectEditPhotos() {
  editPhotoInput.value?.click()
}

async function handleEditPhotoSelect(e) {
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
        editForm.value.photos.push(data.data.url)
      }
    } catch (e) {
      console.error('上传照片失败:', e)
    }
  }
  // 清空 input 以便可以重复选择相同文件
  e.target.value = ''
}

function removeEditPhoto(index) {
  editForm.value.photos.splice(index, 1)
}

// 保存编辑
async function saveEdit() {
  if (!selectedTravel.value || !editForm.value.city) return
  
  updating.value = true
  
  try {
    const highlights = editHighlightsInput.value.split(/\s+/).filter(h => h)
    
    const res = await fetch(`${CONFIG.API_URL}/travels/${selectedTravel.value._id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        ...editForm.value,
        highlights
      })
    })

    const data = await res.json()
    if (data.success) {
      // 更新本地数据
      const index = props.travels.findIndex(t => t._id === selectedTravel.value._id)
      if (index !== -1) {
        const updatedTravels = [...props.travels]
        updatedTravels[index] = { ...updatedTravels[index], ...data.data }
        emit('update:travels', updatedTravels)
        selectedTravel.value = { ...selectedTravel.value, ...data.data }
      }
      isEditing.value = false
    }
  } catch (e) {
    console.error('更新失败:', e)
    alert('保存失败，请重试')
  } finally {
    updating.value = false
  }
}

function openAddDialog() {
  showAddDialog.value = true
}

function closeAddDialog() {
  showAddDialog.value = false
  resetForm()
}

function resetForm() {
  newTravel.value = {
    city: '',
    spot: '',
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
              caption: `${newTravel.value.city}${newTravel.value.spot ? ' · ' + newTravel.value.spot : ''}`,
              tags: ['旅行', newTravel.value.city, ...(highlights || [])].filter(Boolean),
              aspectRatio,
              type: 'travel',
              isFavorite: newTravel.value.isFavorite,
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

defineExpose({ openAddDialog })
</script>
