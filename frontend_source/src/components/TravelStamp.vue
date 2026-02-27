<template>
  <div class="travel-stamp" :style="stampStyle" @click="$emit('click')">
    <!-- 邮票齿孔边框 -->
    <div class="stamp-border">
      <!-- 齿孔效果 -->
      <div class="perforations">
        <div v-for="i in 16" :key="i" class="perforation-dot"></div>
      </div>
      
      <!-- 邮票内容 -->
      <div class="stamp-content">
        <img :src="record.photos[0]" :alt="record.city">
        
        <!-- 收藏标记 -->
        <div v-if="record.isFavorite" class="favorite-mark">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        </div>
        
        <!-- 邮戳 -->
        <div class="postmark">
          <div class="postmark-inner">
            <p class="postmark-date">{{ formatDate(record.date) }}</p>
          </div>
        </div>
      </div>

      <!-- 城市名 -->
      <div class="city-label">
        {{ record.city }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const stampStyle = computed(() => ({
  transform: `rotate(${-2 + Math.random() * 2}deg)`
}))

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
</script>

<style scoped>
.travel-stamp {
  position: relative;
  cursor: pointer;
  transition: transform 0.3s;
}

.travel-stamp:hover {
  transform: rotate(0deg) scale(1.05) !important;
}

.stamp-border {
  position: relative;
  background: white;
  padding: 3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* 齿孔效果 */
.perforations {
  position: absolute;
  inset: -4px;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  opacity: 0.4;
  pointer-events: none;
}

.perforation-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f3f4f6;
}

/* 邮票内容 */
.stamp-content {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
}

.stamp-content img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 收藏标记 */
.favorite-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: #ec4899;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* 邮戳 */
.postmark {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 40px;
  height: 40px;
  border: 2px solid rgba(220, 38, 38, 0.7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(12deg);
  background: rgba(255,255,255,0.9);
}

.postmark-inner {
  text-align: center;
}

.postmark-date {
  font-size: 10px;
  font-weight: 700;
  color: #dc2626;
  margin: 0;
  line-height: 1;
}

/* 城市名 */
.city-label {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  background: #dc2626;
  color: white;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
</style>
