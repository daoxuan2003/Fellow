<template>
  <div 
    class="relative cursor-pointer transform hover:scale-105 hover:-rotate-1 transition-all duration-300"
    :style="{ transform: `rotate(${randomRotation}deg)` }"
    @click="$emit('click')"
  >
    <!-- 邮票齿孔边框 -->
    <div class="relative bg-white p-1 shadow-lg">
      <!-- 齿孔效果 -->
      <div class="absolute -inset-1 flex flex-wrap content-start gap-1 opacity-40">
        <div v-for="i in 16" :key="i" class="w-1.5 h-1.5 rounded-full bg-gray-100" />
      </div>
      
      <!-- 邮票内容 -->
      <div class="relative aspect-square overflow-hidden">
        <img 
          :src="record.photos[0]" 
          :alt="record.city"
          class="w-full h-full object-cover"
        />
        
        <!-- 收藏标记 -->
        <div v-if="record.isFavorite" class="absolute top-1 right-1 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
          <Heart class="w-3 h-3 text-white fill-white" />
        </div>
        
        <!-- 邮戳 -->
        <div class="absolute bottom-1 right-1 w-10 h-10 rounded-full border-2 border-red-500/70 flex items-center justify-center transform rotate-12 bg-white/80">
          <div class="text-center">
            <p class="text-[8px] text-red-500 font-bold leading-tight">
              {{ formatDate(record.date) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 城市名 -->
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap shadow-md">
        {{ record.city }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Heart } from 'lucide-vue-next'

const props = defineProps({
  record: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const randomRotation = computed(() => -2 + Math.random() * 2)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}
</script>
