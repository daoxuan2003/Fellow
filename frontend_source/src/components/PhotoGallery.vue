<template>
  <div class="photo-gallery">
    <!-- 主图 -->
    <div class="main-photo">
      <img :src="photos[currentIndex]" alt="">
      
      <!-- 切换按钮 -->
      <template v-if="photos.length > 1">
        <button 
          v-if="currentIndex > 0"
          class="nav-btn prev" 
          @click.stop="prevPhoto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <button 
          v-if="currentIndex < photos.length - 1"
          class="nav-btn next" 
          @click.stop="nextPhoto"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
        
        <!-- 指示器 -->
        <div class="indicators">
          <div 
            v-for="(_, i) in photos" 
            :key="i"
            :class="['indicator', { active: i === currentIndex }]"
          />
        </div>
      </template>
      
      <!-- 照片计数 -->
      <div class="photo-counter">{{ currentIndex + 1 }} / {{ photos.length }}</div>
    </div>

    <!-- 缩略图 -->
    <div v-if="photos.length > 1" class="thumbnails">
      <button
        v-for="(photo, i) in photos"
        :key="i"
        @click.stop="setCurrentIndex(i)"
        :class="['thumbnail', { active: i === currentIndex }]"
      >
        <img :src="photo" alt="">
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  photos: {
    type: Array,
    required: true
  },
  theme: {
    type: String,
    default: 'pink' // 'pink' or 'orange'
  }
})

const activeColor = props.theme === 'orange' ? '#f97316' : '#ec4899'

const currentIndex = ref(0)

function nextPhoto() {
  if (currentIndex.value < props.photos.length - 1) {
    currentIndex.value++
  }
}

function prevPhoto() {
  if (currentIndex.value > 0) {
    currentIndex.value--
  }
}

function setCurrentIndex(index) {
  currentIndex.value = index
}
</script>

<style scoped>
.photo-gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.main-photo {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 16px;
  overflow: hidden;
  background: #f3f4f6;
}

.main-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0,0,0,0.4);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s;
}

.nav-btn:hover {
  background: rgba(0,0,0,0.6);
}

.nav-btn.prev { left: 12px; }
.nav-btn.next { right: 12px; }

.indicators {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
}

.indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  transition: all 0.3s;
}

.indicator.active {
  width: 18px;
  border-radius: 3px;
  background: white;
}

.photo-counter {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(0,0,0,0.4);
  color: white;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 缩略图 */
.thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}

.thumbnails::-webkit-scrollbar {
  display: none;
}

.thumbnail {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid transparent;
  padding: 0;
  background: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.thumbnail.active {
  border-color: v-bind(activeColor);
}

.thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
