<template>
  <div class="space-y-3">
    <!-- 主图 -->
    <div class="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
      <img 
        :src="photos[currentIndex]" 
        alt="" 
        class="w-full h-full object-cover"
      />
      
      <!-- 切换按钮 -->
      <template v-if="photos.length > 1">
        <button 
          v-if="currentIndex > 0"
          @click.stop="prevPhoto"
          class="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <ChevronLeft class="w-5 h-5" />
        </button>
        <button 
          v-if="currentIndex < photos.length - 1"
          @click.stop="nextPhoto"
          class="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center text-white hover:bg-black/50 transition-colors"
        >
          <ChevronRight class="w-5 h-5" />
        </button>
        
        <!-- 指示器 -->
        <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
          <div 
            v-for="(_, i) in photos" 
            :key="i"
            :class="[
              'rounded-full transition-all',
              i === currentIndex ? 'bg-white w-3 h-1.5' : 'bg-white/50 w-1.5 h-1.5'
            ]"
          />
        </div>
      </template>
      
      <!-- 照片计数 -->
      <div class="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/30 text-white text-xs">
        {{ currentIndex + 1 }} / {{ photos.length }}
      </div>
    </div>

    <!-- 缩略图 -->
    <div v-if="photos.length > 1" class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        v-for="(photo, i) in photos"
        :key="i"
        @click.stop="setCurrentIndex(i)"
        :class="[
          'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all',
          i === currentIndex ? 'border-pink-500' : 'border-transparent'
        ]"
      >
        <img :src="photo" alt="" class="w-full h-full object-cover" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  photos: {
    type: Array,
    required: true
  },
  theme: {
    type: String,
    default: 'pink'
  }
})

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
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
</style>
