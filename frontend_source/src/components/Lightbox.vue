<template>
  <Teleport to="body">
    <div v-if="visible" class="lightbox-overlay" @click.self="close">
      <!-- 关闭按钮 -->
      <button class="lightbox-close" @click="close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <!-- 导航按钮 -->
      <button 
        v-if="photos.length > 1" 
        class="lightbox-nav lightbox-prev" 
        @click="prev"
        :disabled="currentIndex === 0"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15,18 9,12 15,6"/>
        </svg>
      </button>
      <button 
        v-if="photos.length > 1" 
        class="lightbox-nav lightbox-next" 
        @click="next"
        :disabled="currentIndex === photos.length - 1"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>

      <!-- 主图区域 -->
      <div 
        class="lightbox-content"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div 
          class="lightbox-image-wrapper"
          :style="imageTransform"
          @dblclick="toggleZoom"
        >
          <img 
            :src="currentPhoto?.url" 
            :alt="currentPhoto?.caption"
            @load="onImageLoad"
          >
        </div>
      </div>

      <!-- 指示器 -->
      <div v-if="photos.length > 1" class="lightbox-indicator">
        {{ currentIndex + 1 }} / {{ photos.length }}
      </div>

      <!-- 底部信息 -->
      <div class="lightbox-info">
        <div class="lightbox-info-content">
          <p v-if="currentPhoto?.caption" class="lightbox-caption">{{ currentPhoto.caption }}</p>
          <p v-if="currentPhoto?.date" class="lightbox-date">
            {{ formatDate(currentPhoto.date) }}
            <span v-if="currentPhoto?.type !== 'normal'" class="lightbox-type">
              {{ currentPhoto.type === 'travel' ? '· 旅行' : '· 美食' }}
            </span>
          </p>
          <div v-if="currentPhoto?.tags?.length" class="lightbox-tags">
            <span v-for="tag in currentPhoto.tags" :key="tag" class="lightbox-tag">#{{ tag }}</span>
          </div>
        </div>
      </div>

      <!-- 缩略图列表 -->
      <div v-if="photos.length > 1" class="lightbox-thumbnails">
        <div 
          v-for="(photo, index) in photos" 
          :key="photo._id || photo.id"
          :class="['thumbnail-item', { active: index === currentIndex }]"
          @click="goTo(index)"
        >
          <img :src="photo.url" :alt="photo.caption">
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  visible: Boolean,
  photos: {
    type: Array,
    default: () => []
  },
  currentIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:visible', 'update:currentIndex', 'close'])

// 当前照片
const currentPhoto = computed(() => {
  return props.photos[props.currentIndex] || null
})

// 触摸相关
const touchStart = ref(0)
const touchEnd = ref(0)
const minSwipeDistance = 50

// 缩放相关
const isZoomed = ref(false)
const imageTransform = computed(() => {
  return isZoomed.value ? 'transform: scale(1.5); cursor: zoom-out;' : 'transform: scale(1); cursor: zoom-in;'
})

// 格式化日期
function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

// 导航方法
function next() {
  if (props.currentIndex < props.photos.length - 1) {
    emit('update:currentIndex', props.currentIndex + 1)
    isZoomed.value = false
  }
}

function prev() {
  if (props.currentIndex > 0) {
    emit('update:currentIndex', props.currentIndex - 1)
    isZoomed.value = false
  }
}

function goTo(index) {
  emit('update:currentIndex', index)
  isZoomed.value = false
}

function close() {
  emit('update:visible', false)
  emit('close')
  isZoomed.value = false
}

// 缩放
function toggleZoom() {
  isZoomed.value = !isZoomed.value
}

// 触摸滑动
function onTouchStart(e) {
  touchStart.value = e.targetTouches[0].clientX
}

function onTouchMove(e) {
  touchEnd.value = e.targetTouches[0].clientX
}

function onTouchEnd() {
  if (!touchStart.value || !touchEnd.value) return
  
  const distance = touchStart.value - touchEnd.value
  
  if (Math.abs(distance) > minSwipeDistance) {
    if (distance > 0) {
      next() // 左滑，下一张
    } else {
      prev() // 右滑，上一张
    }
  }
  
  touchStart.value = 0
  touchEnd.value = 0
}

// 键盘快捷键
function onKeyDown(e) {
  if (!props.visible) return
  
  switch (e.key) {
    case 'Escape':
      close()
      break
    case 'ArrowLeft':
      prev()
      break
    case 'ArrowRight':
      next()
      break
  }
}

// 图片加载
function onImageLoad() {
  // 可以在这里添加加载动画结束逻辑
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})

// 阻止背景滚动
watch(() => props.visible, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.lightbox-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.95);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 关闭按钮 */
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* 导航按钮 */
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.2s;
}

.lightbox-nav:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
}

.lightbox-nav:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.lightbox-prev {
  left: 16px;
}

.lightbox-next {
  right: 16px;
}

/* 主图区域 */
.lightbox-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  padding: 60px 20px 20px;
}

.lightbox-image-wrapper {
  max-width: 100%;
  max-height: 100%;
  transition: transform 0.3s;
}

.lightbox-image-wrapper img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
  border-radius: 4px;
  user-select: none;
}

/* 指示器 */
.lightbox-indicator {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 14px;
  opacity: 0.8;
  background: rgba(0, 0, 0, 0.5);
  padding: 4px 12px;
  border-radius: 12px;
}

/* 底部信息 */
.lightbox-info {
  padding: 16px 20px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
}

.lightbox-info-content {
  text-align: center;
  color: white;
}

.lightbox-caption {
  font-size: 16px;
  margin: 0 0 8px;
  line-height: 1.5;
}

.lightbox-date {
  font-size: 13px;
  opacity: 0.7;
  margin: 0 0 8px;
}

.lightbox-type {
  color: #667eea;
}

.lightbox-tags {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.lightbox-tag {
  font-size: 12px;
  color: #aaa;
}

/* 缩略图列表 */
.lightbox-thumbnails {
  display: flex;
  gap: 8px;
  padding: 12px 20px 20px;
  overflow-x: auto;
  scrollbar-width: none;
  background: rgba(0, 0, 0, 0.5);
}

.lightbox-thumbnails::-webkit-scrollbar {
  display: none;
}

.thumbnail-item {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: all 0.2s;
}

.thumbnail-item.active {
  border-color: #667eea;
  opacity: 1;
}

.thumbnail-item:hover {
  opacity: 1;
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .lightbox-nav {
    width: 40px;
    height: 40px;
  }
  
  .lightbox-prev {
    left: 8px;
  }
  
  .lightbox-next {
    right: 8px;
  }
  
  .lightbox-content {
    padding: 50px 10px 10px;
  }
  
  .lightbox-thumbnails {
    padding: 8px 10px 16px;
  }
  
  .thumbnail-item {
    width: 48px;
    height: 48px;
  }
}
</style>
