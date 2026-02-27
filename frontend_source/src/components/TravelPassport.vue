<template>
  <div class="travel-passport">
    <!-- 顶部大图区 -->
    <div class="hero-section">
      <div class="hero-bg" v-if="featuredTravel">
        <img :src="featuredTravel.photos[0]" alt="">
        <div class="hero-overlay"></div>
      </div>
      <div class="hero-content">
        <span class="hero-label">旅行护照</span>
        <h2 class="hero-title">我们的足迹</h2>
        <p class="hero-stats">{{ travels.length }} 个目的地 · {{ favoriteTravels.length }} 个最爱</p>
      </div>
      <button class="add-btn" @click="showAddDialog = true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>

    <!-- 最爱旅程 -->
    <div class="favorites-section" v-if="favoriteTravels.length > 0">
      <div class="section-header">
        <h3>最爱旅程</h3>
        <span class="count">{{ favoriteTravels.length }}</span>
      </div>
      <div class="favorites-scroll">
        <div 
          v-for="travel in favoriteTravels" 
          :key="travel._id"
          class="favorite-card"
          @click="openDetail(travel)"
        >
          <div class="card-image">
            <img :src="travel.photos[0]" :alt="travel.city">
            <div class="card-gradient"></div>
            <div class="card-info">
              <span class="city">{{ travel.city }}</span>
              <span class="country">{{ travel.country }}</span>
            </div>
            <svg class="heart-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 全部旅程 -->
    <div class="all-travels">
      <div class="section-header">
        <h3>全部旅程</h3>
        <span class="count">{{ travels.length }}</span>
      </div>
      <div class="travel-list">
        <div 
          v-for="travel in travels" 
          :key="travel._id"
          class="travel-item"
          @click="openDetail(travel)"
        >
          <div class="item-image">
            <img :src="travel.photos[0]" :alt="travel.city">
          </div>
          <div class="item-content">
            <div class="item-main">
              <h4>{{ travel.city }}</h4>
              <p>{{ travel.country }}</p>
            </div>
            <div class="item-meta">
              <span class="date">{{ formatDateShort(travel.date) }}</span>
              <svg v-if="travel.isFavorite" class="fav-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加弹窗 -->
    <div v-if="showAddDialog" class="modal-overlay" @click.self="closeAddDialog">
      <div class="modal-content">
        <div class="modal-header">
          <h3>记录旅程</h3>
          <button class="close-btn" @click="closeAddDialog">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <div class="form-field">
              <label>城市</label>
              <input v-model="newTravel.city" placeholder="例如：巴黎" type="text">
            </div>
            <div class="form-field">
              <label>国家</label>
              <input v-model="newTravel.country" placeholder="例如：法国" type="text">
            </div>
          </div>
          <div class="form-row">
            <div class="form-field">
              <label>日期</label>
              <input v-model="newTravel.date" type="date">
            </div>
            <div class="form-field">
              <label>天气</label>
              <input v-model="newTravel.weather" placeholder="例如：晴朗" type="text">
            </div>
          </div>
          <div class="form-field">
            <label>照片</label>
            <div class="photo-uploader">
              <div v-for="(photo, index) in newTravel.photos" :key="index" class="uploaded-photo">
                <img :src="photo" alt="">
                <button @click="removePhoto(index)">×</button>
              </div>
              <button class="upload-btn" @click="selectPhotos">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <input ref="photoInput" type="file" accept="image/*" multiple style="display: none" @change="handlePhotoSelect">
            </div>
          </div>
          <div class="form-field">
            <label>回忆</label>
            <textarea v-model="newTravel.memory" placeholder="写下这次旅行的美好回忆..." rows="3"></textarea>
          </div>
          <div class="form-field">
            <label>标签（空格分隔）</label>
            <input v-model="highlightsInput" placeholder="例如：日落 美食 漫步" type="text">
          </div>
          <label class="toggle-label">
            <input type="checkbox" v-model="newTravel.isFavorite">
            <span class="toggle"></span>
            <span>标记为最爱</span>
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-cancel" @click="closeAddDialog">取消</button>
          <button class="btn-save" :disabled="submitting" @click="submitTravel">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 详情页 -->
    <div v-if="selectedTravel" class="detail-page" @click.self="closeDetail">
      <div class="detail-container">
        <div class="detail-hero">
          <img :src="selectedTravel.photos[currentPhotoIndex]" alt="">
          <button class="detail-close" @click="closeDetail">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <button v-if="currentPhotoIndex > 0" class="photo-nav prev" @click="prevPhoto">‹</button>
          <button v-if="currentPhotoIndex < selectedTravel.photos.length - 1" class="photo-nav next" @click="nextPhoto">›</button>
          <div class="photo-dots" v-if="selectedTravel.photos.length > 1">
            <span v-for="(p, i) in selectedTravel.photos" :key="i" :class="{ active: i === currentPhotoIndex }"></span>
          </div>
        </div>
        <div class="detail-scroll">
          <div class="detail-content">
            <div class="detail-header-text">
              <h2>{{ selectedTravel.city }}</h2>
              <span class="detail-country">{{ selectedTravel.country }}</span>
            </div>
            <div class="detail-meta">
              <span>{{ formatDate(selectedTravel.date) }}</span>
              <span v-if="selectedTravel.weather">· {{ selectedTravel.weather }}</span>
              <span v-if="selectedTravel.isFavorite" class="detail-fav">最爱</span>
            </div>
            <div class="detail-tags" v-if="selectedTravel.highlights.length">
              <span v-for="tag in selectedTravel.highlights" :key="tag">{{ tag }}</span>
            </div>
            <div class="detail-memory" v-if="selectedTravel.memory">
              <p>{{ selectedTravel.memory }}</p>
            </div>
            <button class="detail-delete" @click="deleteTravel(selectedTravel._id)">删除记录</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { CONFIG } from '../utils/config.js'

const props = defineProps({
  travels: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:travels'])

const showAddDialog = ref(false)
const selectedTravel = ref(null)
const currentPhotoIndex = ref(0)
const submitting = ref(false)
const photoInput = ref(null)

const newTravel = ref({
  city: '', country: '中国', date: new Date().toISOString().split('T')[0],
  photos: [], memory: '', highlights: [], weather: '', isFavorite: false
})
const highlightsInput = ref('')

const favoriteTravels = computed(() => props.travels.filter(t => t.isFavorite))
const featuredTravel = computed(() => favoriteTravels.value[0] || props.travels[0])

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function openDetail(t) { selectedTravel.value = t; currentPhotoIndex.value = 0 }
function closeDetail() { selectedTravel.value = null }
function prevPhoto() { if (currentPhotoIndex.value > 0) currentPhotoIndex.value-- }
function nextPhoto() { if (selectedTravel.value && currentPhotoIndex.value < selectedTravel.value.photos.length - 1) currentPhotoIndex.value++ }

function closeAddDialog() { showAddDialog.value = false; resetForm() }
function resetForm() {
  newTravel.value = { city: '', country: '中国', date: new Date().toISOString().split('T')[0], photos: [], memory: '', highlights: [], weather: '', isFavorite: false }
  highlightsInput.value = ''
}

function selectPhotos() { photoInput.value?.click() }
async function handlePhotoSelect(e) {
  const files = Array.from(e.target.files)
  for (const file of files) {
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch(`${CONFIG.API_URL}/upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }, body: formData
      })
      const data = await res.json()
      if (data.success) newTravel.value.photos.push(data.data.url)
    } catch (e) { console.error('上传失败:', e) }
  }
}
function removePhoto(i) { newTravel.value.photos.splice(i, 1) }

async function submitTravel() {
  if (!newTravel.value.city) { alert('请输入城市'); return }
  submitting.value = true
  try {
    const highlights = highlightsInput.value.split(/\s+/).filter(h => h)
    const res = await fetch(`${CONFIG.API_URL}/travels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ ...newTravel.value, highlights })
    })
    const data = await res.json()
    if (data.success) { emit('update:travels', [data.data, ...props.travels]); closeAddDialog() }
  } catch (e) { console.error('保存失败:', e) }
  finally { submitting.value = false }
}

async function deleteTravel(id) {
  if (!confirm('确定删除？')) return
  try {
    const res = await fetch(`${CONFIG.API_URL}/travels/${id}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    if (res.ok) { emit('update:travels', props.travels.filter(t => t._id !== id)); closeDetail() }
  } catch (e) { console.error('删除失败:', e) }
}
</script>

<style scoped>
.travel-passport {
  background: #faf9f7;
  min-height: 100%;
}

/* Hero Section */
.hero-section {
  position: relative;
  height: 240px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 24px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
}

.hero-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.6) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  color: white;
}

.hero-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.8;
}

.hero-title {
  font-size: 28px;
  font-weight: 300;
  margin: 4px 0 8px;
  letter-spacing: 1px;
}

.hero-stats {
  font-size: 13px;
  opacity: 0.7;
  margin: 0;
}

.add-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
  transition: all 0.3s;
}

.add-btn:hover {
  background: rgba(255,255,255,0.3);
  transform: scale(1.05);
}

/* Favorites */
.favorites-section {
  padding: 24px 20px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 15px;
  font-weight: 500;
  color: #2c2c2c;
  margin: 0;
}

.count {
  font-size: 13px;
  color: #999;
}

.favorites-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
  scrollbar-width: none;
}

.favorites-scroll::-webkit-scrollbar { display: none; }

.favorite-card {
  flex-shrink: 0;
  width: 130px;
}

.card-image {
  position: relative;
  width: 130px;
  height: 170px;
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s;
}

.card-image:hover {
  transform: scale(1.02);
}

.card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.7) 100%);
}

.card-info {
  position: absolute;
  bottom: 14px;
  left: 14px;
  color: white;
  display: flex;
  flex-direction: column;
}

.city {
  font-size: 16px;
  font-weight: 500;
}

.country {
  font-size: 11px;
  opacity: 0.7;
}

.heart-icon {
  position: absolute;
  top: 12px;
  right: 12px;
  color: #ff6b6b;
}

/* All Travels */
.all-travels {
  padding: 0 20px 24px;
}

.travel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.travel-item {
  display: flex;
  gap: 14px;
  padding: 12px;
  background: white;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.travel-item:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}

.item-image {
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.item-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.item-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.item-main h4 {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 500;
  color: #2c2c2c;
}

.item-main p {
  margin: 0;
  font-size: 13px;
  color: #999;
}

.item-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.date {
  font-size: 12px;
  color: #bbb;
}

.fav-icon {
  color: #ff6b6b;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.modal-content {
  background: white;
  width: 100%;
  max-width: 480px;
  border-radius: 24px 24px 0 0;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 500;
  color: #2c2c2c;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.modal-body {
  padding: 20px 24px;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-field {
  margin-bottom: 16px;
}

.form-field label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-field input,
.form-field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  font-size: 15px;
  background: #fafafa;
  transition: all 0.2s;
}

.form-field input:focus,
.form-field textarea:focus {
  outline: none;
  border-color: #2c2c2c;
  background: white;
}

.photo-uploader {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.uploaded-photo {
  position: relative;
  width: 70px;
  height: 70px;
  border-radius: 12px;
  overflow: hidden;
}

.uploaded-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.uploaded-photo button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(0,0,0,0.5);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
}

.upload-btn {
  width: 70px;
  height: 70px;
  border: 2px dashed #ddd;
  border-radius: 12px;
  background: #fafafa;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  font-size: 14px;
  color: #2c2c2c;
}

.toggle-label input { display: none; }

.toggle {
  width: 44px;
  height: 24px;
  background: #ddd;
  border-radius: 12px;
  position: relative;
  transition: background 0.3s;
}

.toggle::after {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.toggle-label input:checked + .toggle {
  background: #2c2c2c;
}

.toggle-label input:checked + .toggle::after {
  transform: translateX(20px);
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f0f0f0;
}

.btn-cancel, .btn-save {
  flex: 1;
  padding: 14px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-save {
  background: #2c2c2c;
  color: white;
}

.btn-save:disabled {
  opacity: 0.5;
}

/* Detail Page */
.detail-page {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-hero {
  position: relative;
  height: 50vh;
  background: #f0f0f0;
}

.detail-hero img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #2c2c2c;
  backdrop-filter: blur(10px);
}

.photo-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  color: #2c2c2c;
  backdrop-filter: blur(10px);
}

.photo-nav.prev { left: 16px; }
.photo-nav.next { right: 16px; }

.photo-dots {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.photo-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
}

.photo-dots span.active {
  background: white;
}

.detail-scroll {
  flex: 1;
  overflow-y: auto;
}

.detail-content {
  padding: 24px;
}

.detail-header-text {
  margin-bottom: 12px;
}

.detail-header-text h2 {
  margin: 0 0 4px;
  font-size: 28px;
  font-weight: 400;
  color: #2c2c2c;
}

.detail-country {
  font-size: 14px;
  color: #999;
}

.detail-meta {
  display: flex;
  gap: 8px;
  font-size: 13px;
  color: #999;
  margin-bottom: 16px;
}

.detail-fav {
  color: #ff6b6b;
  font-weight: 500;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}

.detail-tags span {
  padding: 6px 14px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 13px;
  color: #666;
}

.detail-memory {
  padding: 20px;
  background: #fafafa;
  border-radius: 16px;
  margin-bottom: 20px;
}

.detail-memory p {
  margin: 0;
  font-size: 15px;
  line-height: 1.7;
  color: #555;
}

.detail-delete {
  width: 100%;
  padding: 14px;
  border: 1px solid #ff6b6b;
  background: transparent;
  color: #ff6b6b;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
}
</style>
