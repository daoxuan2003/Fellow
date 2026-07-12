<template>
  <div class="album-page">
    <header class="album-topbar">
      <div class="topbar-copy">
        <span class="eyebrow">共同相册</span>
        <h1>我们的生活档案</h1>
      </div>
      <button class="topbar-action" type="button" @click="showUploadSheet = true" aria-label="添加照片">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </header>

    <nav class="album-tabs" aria-label="相册分类">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        :class="['tab-btn', { active: currentTab === tab.key }]"
        @click="currentTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <small>{{ tab.desc }}</small>
      </button>
    </nav>

    <main v-if="currentTab === 'photos'" class="album-content">
      <section v-if="loading && photos.length === 0" class="state-panel loading-panel">
        <div class="state-image-skeleton"></div>
        <div class="state-line wide"></div>
        <div class="state-line"></div>
      </section>

      <section v-else-if="errorMessage && photos.length === 0" class="state-panel">
        <span class="state-kicker">同步失败</span>
        <h2>相册暂时没有加载出来</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="state-action" @click="fetchPhotos()">重新加载</button>
      </section>

      <template v-else>
        <section v-if="photos.length" class="memory-hero">
          <button class="hero-photo" type="button" @click="openLightbox(featuredPhoto)">
            <img :src="featuredPhoto.url" :alt="featuredPhoto.caption || '精选回忆'" loading="eager">
            <span class="hero-badge">{{ getPhotoTypeTone(featuredPhoto.type) }}</span>
          </button>
          <div class="hero-copy">
            <span class="eyebrow">最近的共同记忆</span>
            <h2>{{ featuredPhoto.caption || '最近的一张生活片段' }}</h2>
            <p>{{ formatAlbumDate(featuredPhoto.date || featuredPhoto.createdAt) }} · {{ latestDistanceText }}</p>
            <div v-if="featuredPhoto.tags?.length" class="hero-tags">
              <button
                v-for="tag in featuredPhoto.tags.slice(0, 3)"
                :key="tag"
                type="button"
                @click="selectedTag = tag"
              >
                #{{ tag }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="photos.length" class="insight-row" aria-label="相册统计">
          <div class="insight-item">
            <span>{{ albumStats.total }}</span>
            <small>张照片</small>
          </div>
          <div class="insight-item">
            <span>{{ albumStats.monthCount }}</span>
            <small>个月份</small>
          </div>
          <div class="insight-item">
            <span>{{ albumStats.dayCount }}</span>
            <small>个日子</small>
          </div>
          <div class="insight-item">
            <span>{{ albumStats.topTag?.name || getPhotoTypeLabel(albumStats.topType) }}</span>
            <small>高频记忆</small>
          </div>
        </section>

        <section v-if="photos.length" class="memory-board" :class="albumStory.rhythm.tone" aria-label="生活叙事看板">
          <div class="board-main">
            <span class="eyebrow">生活章节</span>
            <h2>{{ albumStory.headline }}</h2>
            <p>{{ albumStory.subline }}</p>
            <div class="board-rhythm">
              <strong>{{ albumStory.rhythm.title }}</strong>
              <span>{{ albumStory.rhythm.copy }}</span>
            </div>
          </div>
          <button class="board-prompt" type="button" @click="startPromptUpload(albumStory.nextPrompt.type)">
            <span>{{ albumStory.nextPrompt.title }}</span>
            <strong>{{ albumStory.nextPrompt.cta }}</strong>
          </button>
          <div class="life-lanes">
            <button
              v-for="lane in albumStory.lanes"
              :key="lane.type"
              type="button"
              class="life-lane"
              :class="{ active: selectedType === lane.type }"
              @click="focusLifeLane(lane.type)"
            >
              <span>{{ lane.label }}</span>
              <strong>{{ lane.count }} 张</strong>
              <small>{{ lane.status }}</small>
              <i><b :style="{ width: lane.share + '%' }"></b></i>
            </button>
          </div>
          <button
            v-if="albumStory.chapter"
            class="chapter-card"
            type="button"
            @click="selectedMonth = albumStory.chapter.key"
          >
            <span>当前章节</span>
            <strong>{{ albumStory.chapter.summary }}</strong>
          </button>
        </section>

        <section v-if="photos.length" class="album-controls">
          <div class="control-group">
            <button
              v-for="type in photoTypeFilters"
              :key="type.key"
              type="button"
              :class="['filter-chip', { active: selectedType === type.key }]"
              @click="selectedType = type.key"
            >
              {{ type.label }}
            </button>
          </div>
          <div class="view-switcher">
            <button
              v-for="view in viewModes"
              :key="view.key"
              type="button"
              :class="['view-btn', { active: currentView === view.key }]"
              @click="currentView = view.key"
            >
              {{ view.label }}
            </button>
          </div>
        </section>

        <section v-if="photos.length && archiveMonths.length" class="archive-rail" aria-label="月份归档">
          <button
            type="button"
            :class="['archive-chip', { active: selectedMonth === 'all' }]"
            @click="selectedMonth = 'all'"
          >
            全部月份
          </button>
          <button
            v-for="month in archiveMonths"
            :key="month.key"
            type="button"
            :class="['archive-chip', { active: selectedMonth === month.key }]"
            @click="selectedMonth = month.key"
          >
            <span>{{ month.label }}</span>
            <small>{{ month.count }}</small>
          </button>
        </section>

        <section v-if="photos.length && visibleTags.length" class="tag-rail" aria-label="标签筛选">
          <button
            type="button"
            :class="['tag-chip', { active: selectedTag === 'all' }]"
            @click="selectedTag = 'all'"
          >
            全部标签
          </button>
          <button
            v-for="tag in visibleTags"
            :key="tag.name"
            type="button"
            :class="['tag-chip', { active: selectedTag === tag.name }]"
            @click="selectedTag = tag.name"
          >
            #{{ tag.name }} <span>{{ tag.count }}</span>
          </button>
        </section>

        <div v-if="errorMessage && photos.length" class="inline-error">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="fetchPhotos({ silent: true })">重试</button>
        </div>

        <section v-if="photos.length === 0" class="state-panel empty-panel">
          <span class="state-kicker">第一张照片</span>
          <h2>给你们的生活开一个专属档案</h2>
          <p>从日常、旅行、餐桌开始，慢慢沉淀成只属于你们的回忆索引。</p>
          <button type="button" class="state-action" @click="showUploadSheet = true">添加第一张照片</button>
        </section>

        <section v-else-if="filteredPhotos.length === 0" class="state-panel empty-panel">
          <span class="state-kicker">没有匹配</span>
          <h2>这个筛选下还没有照片</h2>
          <p>换一个月份、标签或分类，或者上传新的生活片段。</p>
          <button type="button" class="state-action" @click="resetPhotoFilters">清除筛选</button>
        </section>

        <section v-else-if="currentView === 'story'" class="story-feed" aria-label="月度回忆">
          <article v-for="group in filteredMonthGroups" :key="group.key" class="month-section">
            <div class="month-heading">
              <div>
                <span class="eyebrow">月份章节</span>
                <h2>{{ group.label }}</h2>
              </div>
              <span>{{ group.count }} 张</span>
            </div>
            <div class="month-story">
              <button v-if="group.hero" class="month-hero" type="button" @click="openLightbox(group.hero)">
                <img :src="group.hero.url" :alt="group.hero.caption || group.label" loading="lazy">
                <span>{{ group.hero.caption || '这个月的第一眼' }}</span>
              </button>
              <div class="month-stack">
                <button
                  v-for="photo in group.photos.slice(1, 5)"
                  :key="photo._id || photo.url"
                  class="stack-photo"
                  type="button"
                  @click="openLightbox(photo)"
                >
                  <img :src="photo.url" :alt="photo.caption || group.label" loading="lazy">
                </button>
                <div class="month-tags" v-if="group.tags.length">
                  <button
                    v-for="tag in group.tags"
                    :key="tag.name"
                    type="button"
                    @click="selectedTag = tag.name"
                  >
                    #{{ tag.name }}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </section>

        <section v-else-if="currentView === 'masonry'" class="masonry-grid" aria-label="瀑布流照片">
          <div
            v-for="(column, colIndex) in masonryColumns"
            :key="colIndex"
            class="masonry-column"
          >
            <button
              v-for="(photo, index) in column"
              :key="photo._id || photo.url"
              class="masonry-item"
              type="button"
              :style="{ animationDelay: `${(colIndex * column.length + index) * 0.05}s` }"
              @click="openLightbox(photo)"
            >
              <span class="photo-wrapper" :style="{ aspectRatio: photo.aspectRatio || 1 }">
                <img
                  :src="photo.url"
                  :alt="photo.caption || '相册照片'"
                  loading="lazy"
                  @load="onImageLoad(photo._id || photo.url)"
                >
                <span v-if="!loadedImages.has(photo._id || photo.url)" class="img-skeleton"></span>
                <span class="photo-overlay">
                  <strong>{{ photo.caption || getPhotoTypeTone(photo.type) }}</strong>
                  <small>{{ formatAlbumDate(photo.date || photo.createdAt) }}</small>
                </span>
              </span>
            </button>
          </div>
        </section>

        <section v-else class="grid-view" aria-label="网格照片">
          <button
            v-for="(photo, index) in filteredPhotos"
            :key="photo._id || photo.url"
            class="grid-item"
            type="button"
            :style="{ animationDelay: `${index * 0.03}s` }"
            @click="openLightbox(photo)"
          >
            <img :src="photo.url" :alt="photo.caption || '相册照片'" loading="lazy">
            <span>{{ getPhotoTypeLabel(photo.type) }}</span>
          </button>
        </section>
      </template>

      <button class="fab-upload" type="button" @click="showUploadSheet = true" aria-label="添加照片">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </main>

    <main v-else-if="currentTab === 'travel'" class="tab-content">
      <TravelPassport
        :travels="travels"
        @update:travels="travels = $event"
      />
    </main>

    <main v-else-if="currentTab === 'food'" class="tab-content">
      <FoodDiary
        :foods="foods"
        :wishes="foodWishes"
        @update:foods="foods = $event"
        @update:wishes="foodWishes = $event"
      />
    </main>

    <div
      class="upload-sheet-overlay"
      :class="{ show: showUploadSheet }"
      @click.self="showUploadSheet = false"
    >
      <div class="upload-sheet" :class="{ show: showUploadSheet }">
        <div class="sheet-header">
          <div class="sheet-handle"></div>
          <h3>添加到生活档案</h3>
          <p>一次可以上传多张，统一写入同一段回忆。</p>
        </div>
        <div class="sheet-content">
          <button
            v-for="intent in uploadIntents"
            :key="intent.type"
            class="upload-single-btn"
            type="button"
            @click="selectType(intent.type)"
          >
            <span class="upload-symbol">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <circle cx="8.5" cy="10.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </span>
            <span>
              <strong>{{ intent.title }}</strong>
              <small>{{ intent.desc }}</small>
            </span>
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            hidden
            @change="handleFileSelect"
          >
        </div>
      </div>
    </div>

    <div v-if="showUploadPreview" class="preview-overlay" @click.self="closeUpload">
      <div class="preview-dialog">
        <div class="preview-header">
          <div>
            <span class="eyebrow">准备发布</span>
            <h3>发布{{ activeUploadIntent.title }}</h3>
          </div>
          <button class="preview-close" type="button" @click="closeUpload" aria-label="关闭">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="preview-content">
          <div class="preview-images">
            <div v-for="(file, index) in uploadFiles" :key="file.preview" class="preview-item">
              <img :src="file.preview" alt="预览">
              <button class="preview-remove" type="button" @click="removeUploadFile(index)" aria-label="移除">×</button>
            </div>
          </div>
          <div class="preview-form">
            <div class="intent-segment" aria-label="记录类型">
              <button
                v-for="intent in uploadIntents"
                :key="intent.type"
                type="button"
                :class="{ active: uploadType === intent.type }"
                @click="uploadType = intent.type"
              >
                {{ intent.title }}
              </button>
            </div>
            <div class="form-group">
              <label>这一组照片想怎么命名</label>
              <textarea v-model="uploadCaption" :placeholder="activeUploadIntent.placeholder" rows="2" maxlength="120"></textarea>
            </div>
            <div class="form-group">
              <label>标签</label>
              <input v-model="uploadTags" :placeholder="activeUploadIntent.tagHint" type="text" maxlength="80">
            </div>
            <div class="form-group">
              <label>发生日期</label>
              <DatePickerField v-model="uploadDate" placeholder="请选择日期" />
            </div>
          </div>
        </div>
        <div class="preview-footer">
          <button class="preview-submit" type="button" :disabled="uploading || uploadFiles.length === 0" @click="submitUpload">
            {{ uploading ? '上传中...' : `发布 ${uploadFiles.length} 张` }}
          </button>
        </div>
      </div>
    </div>

    <Lightbox
      v-model:visible="lightboxVisible"
      :photos="lightboxPhotos"
      :current-index="lightboxIndex"
      @update:current-index="lightboxIndex = $event"
      @close="closeLightbox"
    />

    <div v-if="toastMessage" class="toast">{{ toastMessage }}</div>

    <BottomNav />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONFIG } from '../utils/config.js'
import { todayLocalDate } from '../utils/date.js'
import {
  buildAlbumStats,
  buildAlbumMonthGroups,
  buildAlbumStoryBoard,
  buildMasonryColumns,
  filterAlbumPhotos,
  formatAlbumDate,
  getPhotoTypeLabel,
  getPhotoTypeTone
} from '../utils/album-memory.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'
import Lightbox from '../components/Lightbox.vue'
import TravelPassport from '../components/TravelPassport.vue'
import FoodDiary from '../components/FoodDiary.vue'
import DatePickerField from '../components/DatePickerField.vue'

const tabs = [
  { key: 'photos', label: '照片', desc: '生活回忆' },
  { key: 'travel', label: '旅行', desc: '城市足迹' },
  { key: 'food', label: '美食', desc: '餐桌清单' }
]

const photoTypeFilters = [
  { key: 'all', label: '全部' },
  { key: 'normal', label: '日常' },
  { key: 'travel', label: '旅行' },
  { key: 'food', label: '美食' }
]

const viewModes = [
  { key: 'story', label: '故事' },
  { key: 'masonry', label: '瀑布' },
  { key: 'grid', label: '网格' }
]

const uploadIntents = [
  {
    type: 'normal',
    title: '日常片段',
    desc: '约会、散步、家里的一角，适合沉淀生活质感。',
    placeholder: '例如：下班后一起去吃的那家小店',
    tagHint: '约会 日落 生日'
  },
  {
    type: 'travel',
    title: '出行足迹',
    desc: '城市、车票、街景和短途出逃，形成你们的路线。',
    placeholder: '例如：周末去了海边，风很大但很开心',
    tagHint: '海边 城市 周末'
  },
  {
    type: 'food',
    title: '餐桌记忆',
    desc: '一起吃过的味道、店名和想再去的瞬间。',
    placeholder: '例如：她说这家蛋糕下次还要来',
    tagHint: '火锅 甜品 夜宵'
  }
]

const currentTab = ref('photos')
const loading = ref(false)
const errorMessage = ref('')
const photos = ref([])
const currentView = ref('story')
const selectedType = ref('all')
const selectedTag = ref('all')
const selectedMonth = ref('all')
const loadedImages = ref(new Set())

const travels = ref([])
const foods = ref([])
const foodWishes = ref([])

const showUploadSheet = ref(false)
const showUploadPreview = ref(false)
const uploadFiles = ref([])
const uploadCaption = ref('')
const uploadTags = ref('')
const uploadDate = ref(todayLocalDate())
const uploadType = ref('normal')
const uploading = ref(false)
const fileInput = ref(null)

const lightboxVisible = ref(false)
const lightboxIndex = ref(0)
const toastMessage = ref('')

const albumStats = computed(() => buildAlbumStats(photos.value))
const albumStory = computed(() => buildAlbumStoryBoard(photos.value))
const featuredPhoto = computed(() => albumStats.value.latest || photos.value[0] || null)
const filteredPhotos = computed(() => filterAlbumPhotos(photos.value, {
  type: selectedType.value,
  tag: selectedTag.value,
  month: selectedMonth.value
}))
const filteredMonthGroups = computed(() => buildAlbumMonthGroups(filteredPhotos.value))
const masonryColumns = computed(() => buildMasonryColumns(filteredPhotos.value, 2))
const archiveMonths = computed(() => albumStats.value.monthGroups)
const visibleTags = computed(() => albumStats.value.tags.slice(0, 10))
const lightboxPhotos = computed(() => filteredPhotos.value.length ? filteredPhotos.value : photos.value)
const latestDistanceText = computed(() => {
  const value = albumStats.value.daysSinceLatest
  if (value === null) return '等待第一次记录'
  if (value === 0) return '今天刚刚记录'
  if (value === 1) return '昨天留下'
  return `${value} 天前留下`
})
const activeUploadIntent = computed(() => uploadIntents.find(intent => intent.type === uploadType.value) || uploadIntents[0])

let toastTimer = null
let unsubscribeWS = null

function showToast(msg) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2200)
}

function onImageLoad(id) {
  const next = new Set(loadedImages.value)
  next.add(id)
  loadedImages.value = next
}

function resetPhotoFilters() {
  selectedType.value = 'all'
  selectedTag.value = 'all'
  selectedMonth.value = 'all'
}

function focusLifeLane(type) {
  selectedType.value = type
  selectedTag.value = 'all'
  selectedMonth.value = 'all'
  currentView.value = 'story'
}

async function readJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

async function fetchPhotos(options = {}) {
  const { silent = false } = options
  if (!silent || photos.value.length === 0) loading.value = true
  try {
    const res = await fetch(`${CONFIG.API_URL}/photos`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await readJsonResponse(res)
    if (!res.ok || !data.success) throw new Error(data.message || '照片同步失败')
    photos.value = Array.isArray(data.data) ? data.data : []
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message || '照片同步失败'
  } finally {
    loading.value = false
  }
}

async function fetchTravels() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/travels`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await readJsonResponse(res)
    if (data.success) travels.value = data.data
  } catch {
    travels.value = []
  }
}

async function fetchFoods() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/foods`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await readJsonResponse(res)
    if (data.success) foods.value = data.data
  } catch {
    foods.value = []
  }
}

async function fetchFoodWishes() {
  try {
    const res = await fetch(`${CONFIG.API_URL}/food-wishes`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await readJsonResponse(res)
    if (data.success) foodWishes.value = data.data
  } catch {
    foodWishes.value = []
  }
}

function selectType(type) {
  uploadType.value = type
  showUploadSheet.value = false
  fileInput.value?.click()
}

function startPromptUpload(type) {
  selectType(type || 'normal')
}

function revokeUploadPreviews() {
  uploadFiles.value.forEach(file => URL.revokeObjectURL(file.preview))
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files || [])
  if (files.length === 0) return

  revokeUploadPreviews()
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
  revokeUploadPreviews()
  uploadFiles.value = []
  uploadCaption.value = ''
  uploadTags.value = ''
  uploadDate.value = todayLocalDate()
  showUploadPreview.value = false
  if (fileInput.value) fileInput.value.value = ''
}

async function getImageAspectRatio(url) {
  const image = new Image()
  await new Promise((resolve, reject) => {
    image.onload = resolve
    image.onerror = reject
    image.src = url
  })
  return image.width && image.height ? image.width / image.height : 1
}

async function submitUpload() {
  if (uploadFiles.value.length === 0) return

  uploading.value = true
  try {
    const tags = uploadTags.value.split(/\s+/).map(tag => tag.trim()).filter(Boolean)
    for (const fileData of uploadFiles.value) {
      const formData = new FormData()
      formData.append('file', fileData.file)

      const uploadRes = await fetch(`${CONFIG.API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      })
      const uploadData = await readJsonResponse(uploadRes)
      if (!uploadRes.ok || !uploadData.success) throw new Error(uploadData.message || '文件上传失败')

      const aspectRatio = await getImageAspectRatio(uploadData.data.url)
      const res = await fetch(`${CONFIG.API_URL}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          path: uploadData.data.path,
          date: uploadDate.value,
          caption: uploadCaption.value.trim(),
          tags,
          aspectRatio,
          type: uploadType.value
        })
      })
      const data = await readJsonResponse(res)
      if (!res.ok || !data.success) throw new Error(data.message || '照片发布失败')
    }

    showToast('已写入生活档案')
    closeUpload()
    await fetchPhotos({ silent: true })
  } catch (error) {
    showToast(error.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

function openLightbox(photo) {
  if (!photo) return
  const index = lightboxPhotos.value.findIndex(item => (item._id || item.url) === (photo._id || photo.url))
  lightboxIndex.value = index >= 0 ? index : 0
  lightboxVisible.value = true
}

function closeLightbox() {
  lightboxVisible.value = false
}

function handleWSMessage(data) {
  if (data.type === 'photoSync') {
    fetchPhotos({ silent: true })
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    fetchPhotos({ silent: true })
  }
}

const { onMessage } = useWebSocket()

onMounted(() => {
  fetchPhotos()
  fetchTravels()
  fetchFoods()
  fetchFoodWishes()
  unsubscribeWS = onMessage(handleWSMessage)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  if (unsubscribeWS) unsubscribeWS()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  revokeUploadPreviews()
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.album-page {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  padding-bottom: calc(88px + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, rgba(255, 247, 250, 0.98) 0%, rgba(249, 252, 255, 0.98) 48%, rgba(255, 248, 234, 0.94) 100%),
    linear-gradient(135deg, rgba(212, 91, 122, 0.16), rgba(108, 99, 183, 0.1));
  color: #2B2430;
}

.album-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: calc(14px + env(safe-area-inset-top)) 18px 12px;
  background: rgba(255, 247, 250, 0.9);
  border-bottom: 1px solid rgba(126, 58, 85, 0.14);
  backdrop-filter: blur(18px);
}

.topbar-copy {
  min-width: 0;
}

.eyebrow {
  display: block;
  color: #7E3A55;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}

.album-topbar h1 {
  margin: 2px 0 0;
  color: #2B2430;
  font-size: 22px;
  line-height: 1.15;
}

.topbar-action,
.fab-upload {
  border: none;
  background: #7E3A55;
  color: #FFFFFF;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px rgba(126, 58, 85, 0.22);
  touch-action: manipulation;
}

.topbar-action {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex: 0 0 auto;
}

.album-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 14px 8px;
}

.tab-btn {
  min-width: 0;
  min-height: 54px;
  border: 1px solid rgba(126, 58, 85, 0.13);
  border-radius: 8px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #2B2430;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
}

.tab-btn span,
.tab-btn small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-btn span {
  font-size: 14px;
  font-weight: 800;
}

.tab-btn small {
  margin-top: 3px;
  font-size: 11px;
  color: #667085;
}

.tab-btn.active {
  border-color: rgba(212, 91, 122, 0.34);
  background: #F8DDE8;
  color: #7E2147;
}

.tab-btn.active small {
  color: #7E2147;
}

.album-content,
.tab-content {
  padding: 10px 14px 0;
}

.memory-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 12px;
  min-height: 220px;
  margin-bottom: 14px;
}

.hero-photo,
.month-hero,
.stack-photo,
.masonry-item,
.grid-item {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
}

.hero-photo {
  position: relative;
  min-height: 220px;
  overflow: hidden;
  border-radius: 8px;
  background: #F3EAF2;
}

.hero-photo img,
.month-hero img,
.stack-photo img,
.photo-wrapper img,
.grid-item img,
.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hero-badge {
  position: absolute;
  left: 10px;
  bottom: 10px;
  max-width: calc(100% - 20px);
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(255, 247, 250, 0.92);
  color: #7E2147;
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 0;
}

.hero-copy h2 {
  margin: 0;
  color: #2B2430;
  font-size: 24px;
  line-height: 1.18;
  word-break: break-word;
}

.hero-copy p {
  margin: 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.45;
}

.hero-tags,
.month-tags,
.tag-rail,
.archive-rail,
.control-group,
.view-switcher {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.hero-tags::-webkit-scrollbar,
.month-tags::-webkit-scrollbar,
.tag-rail::-webkit-scrollbar,
.archive-rail::-webkit-scrollbar,
.control-group::-webkit-scrollbar,
.view-switcher::-webkit-scrollbar {
  display: none;
}

.hero-tags button,
.month-tags button,
.tag-chip,
.archive-chip,
.filter-chip,
.view-btn {
  flex: 0 0 auto;
  min-height: 44px;
  border: 1px solid rgba(126, 58, 85, 0.14);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: #4B3B45;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  touch-action: manipulation;
}

.hero-tags button,
.month-tags button {
  padding: 6px 9px;
}

.insight-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}

.insight-item {
  min-width: 0;
  padding: 12px 10px;
  border: 1px solid rgba(126, 58, 85, 0.13);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
}

.insight-item span,
.insight-item small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.insight-item span {
  color: #2B2430;
  font-size: 19px;
  font-weight: 900;
}

.insight-item small {
  margin-top: 3px;
  color: #667085;
  font-size: 11px;
}

.memory-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 132px;
  gap: 10px;
  margin: 0 -14px 14px;
  padding: 14px;
  border-top: 1px solid rgba(212, 91, 122, 0.16);
  border-bottom: 1px solid rgba(108, 99, 183, 0.14);
  background:
    linear-gradient(135deg, rgba(255, 238, 245, 0.76), rgba(239, 247, 255, 0.8) 62%, rgba(255, 241, 214, 0.5)),
    rgba(255, 255, 255, 0.72);
}

.board-main {
  min-width: 0;
}

.board-main h2 {
  margin: 4px 0 6px;
  color: #2B2430;
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: 0;
}

.board-main p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.board-rhythm {
  margin-top: 10px;
  padding: 10px 0 0;
  border-top: 1px solid rgba(126, 58, 85, 0.1);
}

.board-rhythm strong,
.board-rhythm span {
  display: block;
  min-width: 0;
}

.board-rhythm strong {
  color: #2B2430;
  font-size: 13px;
  font-weight: 900;
}

.board-rhythm span {
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
  line-height: 1.42;
}

.board-prompt {
  min-width: 0;
  border: 1px solid rgba(212, 91, 122, 0.24);
  border-radius: 8px;
  padding: 12px;
  background: #F8DDE8;
  color: #7E2147;
  cursor: pointer;
  text-align: left;
}

.board-prompt span,
.board-prompt strong {
  display: block;
}

.board-prompt span {
  font-size: 12px;
  line-height: 1.3;
  color: #7E3A55;
  font-weight: 800;
}

.board-prompt strong {
  margin-top: 5px;
  font-size: 16px;
  line-height: 1.2;
  font-weight: 950;
}

.memory-board.fresh .board-prompt {
  background: #EAF2FF;
  color: #254B8F;
}

.memory-board.fresh .board-prompt span {
  color: #254B8F;
}

.memory-board.quiet .board-prompt {
  background: #FFF1D6;
  color: #7A4215;
}

.memory-board.quiet .board-prompt span {
  color: #7A4215;
}

.life-lanes {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.life-lane,
.chapter-card {
  min-width: 0;
  border: 1px solid rgba(126, 58, 85, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #2B2430;
  cursor: pointer;
  text-align: left;
}

.life-lane {
  padding: 11px;
}

.life-lane span,
.life-lane strong,
.life-lane small {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.life-lane span {
  color: #7E3A55;
  font-size: 11px;
  font-weight: 900;
}

.life-lane strong {
  margin-top: 5px;
  font-size: 17px;
  font-weight: 950;
}

.life-lane small {
  margin-top: 4px;
  color: #667085;
  font-size: 11px;
}

.life-lane i {
  display: block;
  height: 5px;
  margin-top: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(126, 58, 85, 0.1);
}

.life-lane b {
  display: block;
  height: 100%;
  min-width: 6px;
  border-radius: inherit;
  background: linear-gradient(90deg, #D45B7A, #6C63B7);
}

.life-lane.active {
  border-color: rgba(212, 91, 122, 0.32);
  background: #F8DDE8;
}

.chapter-card {
  grid-column: 1 / -1;
  padding: 11px 12px;
}

.chapter-card span,
.chapter-card strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chapter-card span {
  color: #7E3A55;
  font-size: 11px;
  font-weight: 900;
}

.chapter-card strong {
  margin-top: 4px;
  color: #2B2430;
  font-size: 13px;
  font-weight: 850;
}

.album-controls {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.control-group {
  min-width: 0;
  flex: 1;
}

.view-switcher {
  flex: 0 0 auto;
  padding: 3px;
  border-radius: 999px;
  background: rgba(126, 58, 85, 0.08);
}

.filter-chip,
.view-btn,
.tag-chip,
.archive-chip {
  padding: 8px 11px;
}

.filter-chip.active,
.view-btn.active,
.tag-chip.active,
.archive-chip.active {
  border-color: #7E3A55;
  background: #7E3A55;
  color: #FFFFFF;
}

.archive-rail,
.tag-rail {
  margin: 0 -14px 10px;
  padding: 0 14px 4px;
}

.archive-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.archive-chip small,
.tag-chip span {
  opacity: 0.72;
}

.inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 4px 0 12px;
  padding: 10px 12px;
  border: 1px solid rgba(190, 18, 60, 0.18);
  border-radius: 8px;
  background: #fff1f2;
  color: #9f1239;
  font-size: 13px;
}

.inline-error span {
  min-width: 0;
}

.inline-error button {
  flex: 0 0 auto;
  min-height: 44px;
  border: none;
  background: transparent;
  color: #9f1239;
  font-weight: 900;
  cursor: pointer;
  touch-action: manipulation;
}

.story-feed {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.month-section {
  padding: 0 0 4px;
}

.month-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  gap: 12px;
  margin-bottom: 8px;
}

.month-heading h2 {
  margin: 2px 0 0;
  font-size: 19px;
  color: #2B2430;
}

.month-heading > span {
  flex: 0 0 auto;
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.month-story {
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(0, 0.9fr);
  gap: 8px;
}

.month-hero {
  position: relative;
  min-height: 236px;
  overflow: hidden;
  border-radius: 8px;
  background: #F3EAF2;
}

.month-hero span {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-width: 0;
  padding: 36px 10px 10px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.68));
  color: white;
  font-size: 13px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.month-stack {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.stack-photo {
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 8px;
  background: #F3EAF2;
}

.month-tags {
  grid-column: 1 / -1;
  min-width: 0;
  align-items: center;
}

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

.masonry-item,
.grid-item {
  opacity: 0;
  animation: fadeIn 0.45s ease forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.photo-wrapper {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 8px;
  background: #F3EAF2;
}

.photo-wrapper img {
  transition: transform 0.45s ease;
}

.masonry-item:hover .photo-wrapper img,
.grid-item:hover img,
.month-hero:hover img,
.stack-photo:hover img,
.hero-photo:hover img {
  transform: scale(1.035);
}

.img-skeleton {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #F5EAF1 25%, #F8FBFF 50%, #F5EAF1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.photo-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 34px 10px 10px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.62));
  color: #fff;
}

.photo-overlay strong,
.photo-overlay small {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.photo-overlay strong {
  font-size: 13px;
}

.photo-overlay small {
  opacity: 0.82;
  font-size: 11px;
}

.grid-view {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 5px;
}

.grid-item {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 6px;
  background: #F3EAF2;
}

.grid-item span {
  position: absolute;
  top: 6px;
  left: 6px;
  max-width: calc(100% - 12px);
  padding: 3px 6px;
  border-radius: 999px;
  background: rgba(255, 247, 250, 0.92);
  color: #7E2147;
  font-size: 10px;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.state-panel {
  min-height: 360px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
  padding: 26px 18px;
  border: 1px solid rgba(126, 58, 85, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
}

.state-kicker {
  color: #7E3A55;
  font-size: 12px;
  font-weight: 900;
}

.state-panel h2 {
  margin: 0;
  color: #2B2430;
  font-size: 24px;
  line-height: 1.2;
}

.state-panel p {
  margin: 0;
  color: #667085;
  font-size: 14px;
  line-height: 1.55;
}

.state-action {
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  padding: 11px 14px;
  background: #7E3A55;
  color: #FFFFFF;
  font-weight: 900;
  cursor: pointer;
}

.loading-panel {
  overflow: hidden;
}

.state-image-skeleton,
.state-line {
  border-radius: 8px;
  background: linear-gradient(90deg, #F5EAF1 25%, #F8FBFF 50%, #F5EAF1 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.state-image-skeleton {
  width: 100%;
  height: 190px;
}

.state-line {
  height: 16px;
  width: 62%;
}

.state-line.wide {
  width: 84%;
}

.fab-upload {
  position: fixed;
  right: 18px;
  bottom: calc(84px + env(safe-area-inset-bottom));
  z-index: 30;
  width: 56px;
  height: 56px;
  border-radius: 50%;
}

.upload-sheet-overlay,
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(43, 36, 48, 0.52);
}

.upload-sheet-overlay {
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.24s ease, visibility 0.24s ease;
}

.upload-sheet-overlay.show {
  opacity: 1;
  visibility: visible;
}

.upload-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 12px 18px calc(24px + env(safe-area-inset-bottom));
  border-radius: 16px 16px 0 0;
  background: #FFF7FA;
  transform: translateY(100%);
  transition: transform 0.24s ease;
}

.upload-sheet.show {
  transform: translateY(0);
}

.sheet-header {
  text-align: center;
  margin-bottom: 14px;
}

.sheet-handle {
  width: 42px;
  height: 4px;
  margin: 0 auto 12px;
  border-radius: 999px;
  background: rgba(126, 58, 85, 0.18);
}

.sheet-header h3,
.preview-header h3 {
  margin: 0;
  color: #2B2430;
}

.sheet-header p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 13px;
}

.sheet-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-single-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(212, 91, 122, 0.24);
  border-radius: 8px;
  background: #F8DDE8;
  color: #2B2430;
  cursor: pointer;
  text-align: left;
}

.upload-symbol {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #7E3A55;
  color: #FFFFFF;
}

.upload-single-btn span:last-child {
  min-width: 0;
}

.upload-single-btn strong,
.upload-single-btn small {
  display: block;
}

.upload-single-btn strong {
  font-size: 15px;
}

.upload-single-btn small {
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
  line-height: 1.35;
}

.preview-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.preview-dialog {
  width: min(430px, 100%);
  max-height: min(92vh, 760px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 12px;
  background: #FFF7FA;
}

.preview-header,
.preview-footer {
  padding: 16px;
  border-color: rgba(126, 58, 85, 0.12);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(126, 58, 85, 0.12);
}

.preview-close {
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(126, 58, 85, 0.1);
  color: #7E3A55;
  cursor: pointer;
  touch-action: manipulation;
}

.preview-content {
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}

.preview-images {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.preview-item {
  position: relative;
  flex: 0 0 auto;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: 8px;
  background: #F3EAF2;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: rgba(43, 36, 48, 0.72);
  color: #fff;
  cursor: pointer;
  touch-action: manipulation;
}

.form-group {
  margin-bottom: 14px;
}

.intent-segment {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 14px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(126, 58, 85, 0.08);
}

.intent-segment button {
  min-width: 0;
  min-height: 44px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #667085;
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  touch-action: manipulation;
}

.intent-segment button.active {
  background: #FFFFFF;
  color: #7E3A55;
  box-shadow: 0 6px 14px rgba(126, 58, 85, 0.1);
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: #4B3B45;
  font-size: 13px;
  font-weight: 800;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 1px solid rgba(126, 58, 85, 0.14);
  border-radius: 8px;
  padding: 11px 12px;
  background: white;
  color: #2B2430;
  font-size: 14px;
  line-height: 1.45;
}

.form-group textarea {
  resize: vertical;
}

.preview-footer {
  border-top: 1px solid rgba(126, 58, 85, 0.12);
}

.preview-submit {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 14px;
  background: #7E3A55;
  color: #FFFFFF;
  font-size: 15px;
  font-weight: 900;
  cursor: pointer;
}

.preview-submit:disabled {
  opacity: 0.56;
  cursor: not-allowed;
}

.toast {
  position: fixed;
  left: 50%;
  bottom: calc(118px + env(safe-area-inset-bottom));
  z-index: 400;
  max-width: calc(100vw - 48px);
  transform: translateX(-50%);
  padding: 11px 14px;
  border-radius: 999px;
  background: rgba(43, 36, 48, 0.92);
  color: #FFFFFF;
  font-size: 13px;
  font-weight: 800;
  box-shadow: 0 14px 32px rgba(43, 36, 48, 0.22);
}

@media (max-width: 430px) {
  .album-topbar {
    padding-left: 14px;
    padding-right: 14px;
  }

  .memory-hero,
  .month-story {
    grid-template-columns: 1fr;
  }

  .hero-photo,
  .month-hero {
    min-height: 260px;
  }

  .hero-copy {
    padding: 0 2px 4px;
  }

  .hero-copy h2 {
    font-size: 22px;
  }

  .insight-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .memory-board {
    grid-template-columns: 1fr;
  }

  .board-prompt {
    min-height: 78px;
  }

  .life-lanes {
    grid-template-columns: 1fr;
  }

  .album-controls {
    flex-direction: column;
  }

  .view-switcher {
    width: fit-content;
  }
}

@media (min-width: 760px) {
  .album-page {
    max-width: 920px;
    margin: 0 auto;
  }

  .album-content,
  .tab-content {
    padding-left: 20px;
    padding-right: 20px;
  }

  .archive-rail,
  .tag-rail {
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
  }

  .grid-view {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
