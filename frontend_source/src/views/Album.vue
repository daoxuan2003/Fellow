<template>
  <div class="album-page">
    <FeatureHeader title="我们的相册" eyebrow="MEMORY ARCHIVE" chapter="02" kind="album" />

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
        <h2>相册加载失败</h2>
        <p>{{ errorMessage }}</p>
        <button type="button" class="state-action" @click="fetchPhotos()">重新加载</button>
      </section>

      <template v-else>
        <section v-if="photos.length" class="memory-cover" :class="albumStory.rhythm.tone" aria-label="生活档案封面">
          <button class="cover-photo" type="button" @click="openLightbox(albumStory.cover.photo)">
            <img :src="albumStory.cover.photo.url" :alt="albumStory.cover.title" loading="eager">
            <span class="cover-photo-tone">{{ albumStory.cover.tone }}</span>
          </button>

          <div class="cover-copy">
            <span class="eyebrow">共同相册</span>
            <h2>{{ albumStory.cover.title }}</h2>
            <p>共同回忆，按真实记录留存。</p>
            <small>{{ albumStory.cover.meta }}</small>
            <div class="cover-actions">
              <button class="cover-primary" type="button" @click="startPromptUpload(albumStory.nextPrompt.type)">
                <span>{{ albumStory.nextPrompt.title }}</span>
                <strong>{{ albumStory.nextPrompt.cta }}</strong>
              </button>
              <button
                v-if="albumStory.chapter"
                class="cover-secondary"
                type="button"
                @click="selectedMonth = albumStory.chapter.key"
              >
                <span>当前章节</span>
                <strong>{{ albumStory.chapter.label }}</strong>
              </button>
            </div>
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

        <div v-if="errorMessage && photos.length" class="inline-error">
          <span>{{ errorMessage }}</span>
          <button type="button" @click="fetchPhotos({ silent: true })">重试</button>
        </div>

        <section v-if="photos.length === 0" class="state-panel empty-panel">
          <span class="state-kicker">第一张照片</span>
          <h2>给你们的生活开一个专属档案</h2>
          <p>上传一张真实照片，作为共同回忆的开始。</p>
          <button type="button" class="state-action" @click="showUploadSheet = true">添加第一张照片</button>
        </section>

        <section v-else-if="filteredPhotos.length === 0" class="state-panel empty-panel">
          <span class="state-kicker">没有匹配</span>
          <h2>这个筛选下还没有照片</h2>
          <p>换一个月份、标签或分类，或者上传新的生活片段。</p>
          <button type="button" class="state-action" @click="resetPhotoFilters">清除筛选</button>
        </section>

        <section v-else class="story-feed" aria-label="月度回忆">
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

      </template>

      <button v-if="photos.length > 0" class="fab-upload" type="button" @click="showUploadSheet = true" aria-label="添加照片">
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
      <div class="upload-sheet" :class="{ show: showUploadSheet }" role="dialog" aria-modal="true" aria-labelledby="album-upload-title">
        <div class="sheet-header">
          <div>
            <span>ADD MEMORY</span>
            <h3 id="album-upload-title">添加到生活档案</h3>
            <p>一次可以上传多张，统一写入同一段回忆。</p>
          </div>
          <button type="button" aria-label="关闭" @click="showUploadSheet = false">×</button>
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

    <div
      v-if="toastMessage"
      class="toast"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >{{ toastMessage }}</div>

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
  filterAlbumPhotos
} from '../utils/album-memory.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import Lightbox from '../components/Lightbox.vue'
import TravelPassport from '../components/TravelPassport.vue'
import FoodDiary from '../components/FoodDiary.vue'
import DatePickerField from '../components/DatePickerField.vue'

const tabs = [
  { key: 'photos', label: '日常', desc: '生活回忆' },
  { key: 'travel', label: '旅行', desc: '城市足迹' },
  { key: 'food', label: '美食', desc: '餐桌清单' }
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
const selectedType = ref('normal')
const selectedTag = ref('all')
const selectedMonth = ref('all')

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
const filteredPhotos = computed(() => filterAlbumPhotos(photos.value, {
  type: selectedType.value,
  tag: selectedTag.value,
  month: selectedMonth.value
}))
const filteredMonthGroups = computed(() => buildAlbumMonthGroups(filteredPhotos.value))
const archiveMonths = computed(() => albumStats.value.monthGroups)
const lightboxPhotos = computed(() => filteredPhotos.value.length ? filteredPhotos.value : photos.value)
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

function resetPhotoFilters() {
  selectedType.value = 'all'
  selectedTag.value = 'all'
  selectedMonth.value = 'all'
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
  } catch {
    errorMessage.value = '暂时无法同步，请稍后重试'
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

      const uploadedPath = uploadData.data?.path
      const uploadedUrl = uploadData.data?.url
      if (!uploadedPath || !uploadedUrl) {
        throw new Error('服务器没有返回完整的照片存储信息，请稍后重试')
      }

      const aspectRatio = await getImageAspectRatio(fileData.preview)
      const res = await fetch(`${CONFIG.API_URL}/photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          // path 供当前安全接口校验归属；url 兼容滚动发布期间仍在运行的旧接口。
          path: uploadedPath,
          url: uploadedUrl,
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
    linear-gradient(180deg, rgba(255, 252, 250, 0.98) 0%, rgba(246, 250, 247, 0.96) 54%, rgba(238, 245, 247, 0.94) 100%),
    linear-gradient(135deg, rgba(143, 61, 90, 0.08), rgba(72, 104, 86, 0.08));
  color: #261F24;
}



.eyebrow {
  display: block;
  color: #8F3D5A;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
}


.fab-upload {
  border: none;
  background: #321B26;
  color: #FFFFFF;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 24px rgba(50, 27, 38, 0.18);
  touch-action: manipulation;
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
  border: 1px solid rgba(50, 27, 38, 0.09);
  border-radius: 8px;
  padding: 10px 8px;
  background: rgba(255, 255, 255, 0.82);
  color: #261F24;
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
  color: #756872;
}

.tab-btn.active {
  border-color: rgba(143, 61, 90, 0.26);
  background: #F7DDE8;
  color: #321B26;
}

.tab-btn.active small {
  color: #8F3D5A;
}

.album-content,
.tab-content {
  padding: 10px 14px 0;
}

.memory-cover {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: 14px;
  margin: 0 -14px 16px;
  padding: 16px 14px 18px;
  border-top: 1px solid rgba(50, 27, 38, 0.08);
  border-bottom: 1px solid rgba(50, 27, 38, 0.1);
  background:
    linear-gradient(180deg, rgba(255, 252, 250, 0.96), rgba(246, 250, 247, 0.9)),
    linear-gradient(135deg, rgba(143, 61, 90, 0.09), rgba(72, 104, 86, 0.1));
}

.cover-photo,
.month-hero,
.stack-photo {
  border: none;
  padding: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
}

.cover-photo {
  position: relative;
  min-height: 318px;
  overflow: hidden;
  border-radius: 8px;
  background: #F2EAE4;
}

.cover-photo img,
.month-hero img,
.stack-photo img,
.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-photo-tone {
  position: absolute;
  left: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  padding: 7px 10px;
  border-radius: 999px;
  background: rgba(255, 252, 250, 0.92);
  color: #321B26;
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 10px;
  padding: 8px 0 4px;
}

.cover-copy h2 {
  margin: 0;
  color: #261F24;
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  line-height: 1.16;
  word-break: break-word;
}

.cover-copy p {
  margin: 0;
  color: #5F535B;
  font-size: 13px;
  line-height: 1.55;
}

.cover-copy > small {
  color: #756872;
  font-size: 12px;
  line-height: 1.35;
}

.cover-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 8px;
  margin-top: 4px;
}

.cover-primary,
.cover-secondary {
  min-width: 0;
  min-height: 58px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  border-radius: 8px;
  padding: 10px 11px;
  cursor: pointer;
  text-align: left;
  touch-action: manipulation;
}

.cover-primary {
  background: #321B26;
  color: #FFFFFF;
}

.cover-secondary {
  background: rgba(255, 255, 255, 0.76);
  color: #321B26;
}

.cover-primary span,
.cover-primary strong,
.cover-secondary span,
.cover-secondary strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cover-primary span,
.cover-secondary span {
  font-size: 11px;
  font-weight: 800;
  opacity: 0.76;
}

.cover-primary strong,
.cover-secondary strong {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 900;
}


.month-tags,
.archive-rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}

.month-tags::-webkit-scrollbar,
.archive-rail::-webkit-scrollbar {
  display: none;
}

.month-tags button,
.archive-chip {
  flex: 0 0 auto;
  min-height: 44px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  color: #382D34;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  touch-action: manipulation;
}

.month-tags button {
  padding: 6px 9px;
}

.archive-chip {
  padding: 8px 11px;
}

.archive-chip.active {
  border-color: #321B26;
  background: #321B26;
  color: #FFFFFF;
}

.archive-rail {
  margin: 0 -14px 10px;
  padding: 0 14px 4px;
}

.archive-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.archive-chip small {
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
  color: #261F24;
}

.month-heading > span {
  flex: 0 0 auto;
  color: #756872;
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
  background: #F2EAE4;
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
  background: #F2EAE4;
}

.month-tags {
  grid-column: 1 / -1;
  min-width: 0;
  align-items: center;
}


.state-panel {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
  padding: 26px 18px;
  border: 1px solid rgba(50, 27, 38, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
}

.state-kicker {
  color: #8F3D5A;
  font-size: 12px;
  font-weight: 900;
}

.state-panel h2 {
  margin: 0;
  color: #261F24;
  font-size: 24px;
  line-height: 1.2;
}

.state-panel p {
  margin: 0;
  color: #5F535B;
  font-size: 14px;
  line-height: 1.55;
}

.state-action {
  margin-top: 8px;
  border: none;
  border-radius: 8px;
  padding: 11px 14px;
  background: #321B26;
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
  background: linear-gradient(90deg, #F2EAE4 25%, #F7FBF8 50%, #F2EAE4 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.state-image-skeleton {
  width: 100%;
  height: 132px;
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
  background: rgba(37, 36, 45, 0.56);
  backdrop-filter: blur(5px);
}

.upload-sheet-overlay {
  display: grid;
  place-items: center;
  padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.upload-sheet-overlay.show {
  opacity: 1;
  visibility: visible;
}

.upload-sheet {
  width: min(100%, 398px);
  max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  padding: 16px;
  box-sizing: border-box;
  color: var(--fellow-ink, #25242d);
  background: var(--fellow-paper, #fffaf5);
  border: 3px solid var(--fellow-ink, #25242d);
  border-radius: 16px;
  box-shadow: 7px 8px 0 var(--fellow-ink, #25242d);
  opacity: 0;
  transform: scale(.96);
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.upload-sheet.show {
  opacity: 1;
  transform: scale(1);
}

.sheet-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 13px;
  border-bottom: 3px solid var(--fellow-ink, #25242d);
}

.sheet-header > div { min-width: 0; }
.sheet-header > div > span { display: block; margin-bottom: 3px; font-size: 9px; font-weight: 950; letter-spacing: .14em; }
.sheet-header > button { display: grid; width: 44px; height: 44px; flex: none; place-items: center; padding: 0; color: var(--fellow-ink, #25242d); background: #fff; border: 3px solid var(--fellow-ink, #25242d); border-radius: 9px; font: 950 24px/1 system-ui; }

.sheet-header h3,
.preview-header h3 {
  margin: 0;
  color: var(--fellow-ink, #25242d);
  font-size: 22px;
  font-weight: 950;
  letter-spacing: -.03em;
}

.sheet-header p {
  margin: 5px 0 0;
  color: #686772;
  font-size: 12px;
  font-weight: 700;
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
  min-height: 76px;
  padding: 12px;
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 10px;
  background: var(--fellow-mint, #c8f6e8);
  color: var(--fellow-ink, #25242d);
  cursor: pointer;
  text-align: left;
}

.upload-single-btn:nth-child(2) { background: var(--fellow-blue, #69cfee); }
.upload-single-btn:nth-child(3) { background: var(--fellow-yellow, #fff1a8); }

.upload-symbol {
  flex: 0 0 auto;
  width: 46px;
  height: 46px;
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  color: var(--fellow-ink, #25242d);
}

.upload-single-btn span:last-child {
  min-width: 0;
}

.upload-single-btn strong,
.upload-single-btn small {
  display: block;
}

.upload-single-btn strong {
  font-size: 14px;
  font-weight: 950;
}

.upload-single-btn small {
  margin-top: 3px;
  color: #55545d;
  font-size: 11px;
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
  color: var(--fellow-ink, #25242d);
  background: var(--fellow-paper, #fffaf5);
  border: 3px solid var(--fellow-ink, #25242d);
  border-radius: 16px;
  box-shadow: 7px 8px 0 var(--fellow-ink, #25242d);
}

.preview-header,
.preview-footer {
  padding: 16px;
  border-color: rgba(50, 27, 38, 0.1);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 3px solid var(--fellow-ink, #25242d);
}

.preview-close {
  width: 44px;
  height: 44px;
  color: var(--fellow-ink, #25242d);
  background: #fff;
  border: 3px solid var(--fellow-ink, #25242d);
  border-radius: 9px;
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
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 8px;
  background: #F2EAE4;
}

.preview-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 44px;
  height: 44px;
  color: var(--fellow-ink, #25242d);
  background: var(--fellow-pink, #f77ea4);
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 8px;
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
  background: #fff;
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 10px;
}

.intent-segment button {
  min-width: 0;
  min-height: 44px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--fellow-ink, #25242d);
  font-size: 12px;
  font-weight: 850;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  touch-action: manipulation;
}

.intent-segment button.active {
  color: var(--fellow-ink, #25242d);
  background: var(--fellow-yellow, #fff1a8);
  box-shadow: inset 0 0 0 2px var(--fellow-ink, #25242d);
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--fellow-ink, #25242d);
  font-size: 13px;
  font-weight: 800;
}

.form-group input,
.form-group textarea {
  width: 100%;
  border: 2px solid var(--fellow-ink, #25242d);
  border-radius: 10px;
  padding: 11px 12px;
  background: white;
  color: var(--fellow-ink, #25242d);
  font-size: 16px;
  line-height: 1.45;
}

.form-group textarea {
  resize: vertical;
}

.preview-footer {
  border-top: 3px solid var(--fellow-ink, #25242d);
}

.preview-submit {
  width: 100%;
  color: var(--fellow-ink, #25242d);
  background: var(--fellow-yellow, #fff1a8);
  border: 3px solid var(--fellow-ink, #25242d);
  border-radius: 10px;
  box-shadow: 3px 4px 0 var(--fellow-ink, #25242d);
  padding: 14px;
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
  .memory-cover,
  .month-story {
    grid-template-columns: 1fr;
  }

  .cover-photo,
  .month-hero {
    min-height: 260px;
  }

  .cover-copy {
    padding: 0 2px 4px;
  }

  .cover-copy h2 {
    font-size: 26px;
  }

  .cover-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .archive-rail {
    margin-left: -20px;
    margin-right: -20px;
    padding-left: 20px;
    padding-right: 20px;
  }
}
</style>
