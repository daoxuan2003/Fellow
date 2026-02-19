<template>
  <div class="wheel-picker">
    <!-- 显示区域 -->
    <div 
      class="wheel-display" 
      :class="{ active: isOpen, readonly: !editable }"
      @click="togglePicker"
    >
      <span v-if="modelValue">{{ displayText }}</span>
      <span v-else class="placeholder">请选择日期</span>
      <svg class="arrow" :class="{ open: isOpen }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </div>
    
    <!-- 滚轮选择区域 -->
    <transition name="slide">
      <div v-if="isOpen && editable" class="wheel-container" @touchmove.prevent>
        <div class="picker-header">
          <span>选择日期</span>
          <button class="done-btn" @click="closePicker">完成</button>
        </div>
        <div class="picker-body">
          <div class="wheel-mask-top"></div>
          <div class="wheel-mask-bottom"></div>
          <div class="wheels">
            <!-- 年 -->
            <div class="wheel-wrapper">
              <div class="wheel" ref="yearWheel" @touchstart="handleTouchStart($event, 'year')" @touchmove="handleTouchMove($event, 'year')" @touchend="handleTouchEnd('year')">
                <div class="wheel-item" v-for="year in years" :key="year" :class="{ active: selectedYear === year }">
                  {{ year }}
                </div>
              </div>
              <div class="wheel-label">年</div>
            </div>
            
            <!-- 月 -->
            <div class="wheel-wrapper">
              <div class="wheel" ref="monthWheel" @touchstart="handleTouchStart($event, 'month')" @touchmove="handleTouchMove($event, 'month')" @touchend="handleTouchEnd('month')">
                <div class="wheel-item" v-for="month in 12" :key="month" :class="{ active: selectedMonth === month }">
                  {{ String(month).padStart(2, '0') }}
                </div>
              </div>
              <div class="wheel-label">月</div>
            </div>
            
            <!-- 日 -->
            <div class="wheel-wrapper">
              <div class="wheel" ref="dayWheel" @touchstart="handleTouchStart($event, 'day')" @touchmove="handleTouchMove($event, 'day')" @touchend="handleTouchEnd('day')">
                <div class="wheel-item" v-for="day in daysInMonth" :key="day" :class="{ active: selectedDay === day }">
                  {{ String(day).padStart(2, '0') }}
                </div>
              </div>
              <div class="wheel-label">日</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  editable: {
    type: Boolean,
    default: true
  },
  maxDate: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const itemHeight = 44
const visibleItems = 5

const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref(new Date().getMonth() + 1)
const selectedDay = ref(new Date().getDate())

const currentYear = new Date().getFullYear()
const years = computed(() => {
  const maxYear = props.maxDate ? new Date(props.maxDate).getFullYear() : currentYear
  return Array.from({ length: 100 }, (_, i) => maxYear - 99 + i)
})

const daysInMonth = computed(() => {
  return new Date(selectedYear.value, selectedMonth.value, 0).getDate()
})

const displayText = computed(() => {
  if (!props.modelValue) return ''
  const date = new Date(props.modelValue)
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月${String(date.getDate()).padStart(2, '0')}日`
})

watch(() => props.modelValue, (val) => {
  if (val) {
    const date = new Date(val)
    selectedYear.value = date.getFullYear()
    selectedMonth.value = date.getMonth() + 1
    selectedDay.value = date.getDate()
  }
}, { immediate: true })

watch([selectedYear, selectedMonth, selectedDay], () => {
  const maxDay = daysInMonth.value
  if (selectedDay.value > maxDay) {
    selectedDay.value = maxDay
  }
  const dateStr = `${selectedYear.value}-${String(selectedMonth.value).padStart(2, '0')}-${String(selectedDay.value).padStart(2, '0')}`
  emit('update:modelValue', dateStr)
})

const togglePicker = () => {
  if (!props.editable) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      scrollToSelected()
    })
  }
}

const closePicker = () => {
  isOpen.value = false
}

const scrollToSelected = () => {
  const yearWheel = document.querySelector('.wheel-wrapper:nth-child(1) .wheel')
  const monthWheel = document.querySelector('.wheel-wrapper:nth-child(2) .wheel')
  const dayWheel = document.querySelector('.wheel-wrapper:nth-child(3) .wheel')
  
  if (yearWheel) {
    const yearIndex = years.value.indexOf(selectedYear.value)
    yearWheel.scrollTop = yearIndex * itemHeight
  }
  if (monthWheel) {
    monthWheel.scrollTop = (selectedMonth.value - 1) * itemHeight
  }
  if (dayWheel) {
    dayWheel.scrollTop = (selectedDay.value - 1) * itemHeight
  }
}

let touchStartY = 0
let touchStartScrollTop = 0
let currentWheel = null
let currentType = null

const handleTouchStart = (e, type) => {
  touchStartY = e.touches[0].clientY
  const wheels = {
    year: document.querySelector('.wheel-wrapper:nth-child(1) .wheel'),
    month: document.querySelector('.wheel-wrapper:nth-child(2) .wheel'),
    day: document.querySelector('.wheel-wrapper:nth-child(3) .wheel')
  }
  currentWheel = wheels[type]
  currentType = type
  if (currentWheel) {
    touchStartScrollTop = currentWheel.scrollTop
  }
}

const handleTouchMove = (e) => {
  if (!currentWheel) return
  e.preventDefault()
  e.stopPropagation()
  const deltaY = touchStartY - e.touches[0].clientY
  currentWheel.scrollTop = touchStartScrollTop + deltaY
}

const handleTouchEnd = () => {
  if (!currentWheel) return
  
  const index = Math.round(currentWheel.scrollTop / itemHeight)
  currentWheel.scrollTo({ top: index * itemHeight, behavior: 'smooth' })
  
  if (currentType === 'year') {
    selectedYear.value = years.value[index] || years.value[0]
  } else if (currentType === 'month') {
    selectedMonth.value = Math.min(Math.max(index + 1, 1), 12)
  } else if (currentType === 'day') {
    selectedDay.value = Math.min(Math.max(index + 1, 1), daysInMonth.value)
  }
  
  currentWheel = null
  currentType = null
}
</script>

<style scoped>
.wheel-picker {
  position: relative;
}

.wheel-display {
  width: 100%;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 15px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.3s ease;
}

.wheel-display.active {
  border-color: var(--border-focus);
}

.wheel-display.readonly {
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: default;
}

.wheel-display .placeholder {
  color: var(--text-tertiary);
}

.wheel-display .arrow {
  color: var(--text-secondary);
  transition: transform 0.3s ease;
}

.wheel-display .arrow.open {
  transform: rotate(180deg);
}

.wheel-container {
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.98);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.done-btn {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.picker-body {
  position: relative;
  height: 220px;
  overflow: hidden;
}

.wheel-mask-top,
.wheel-mask-bottom {
  position: absolute;
  left: 0;
  right: 0;
  height: 88px;
  z-index: 2;
  pointer-events: none;
}

.wheel-mask-top {
  top: 0;
  background: linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);
}

.wheel-mask-bottom {
  bottom: 0;
  background: linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%);
}

.wheels {
  display: flex;
  justify-content: center;
  height: 100%;
  padding: 88px 0;
}

.wheel-wrapper {
  flex: 1;
  max-width: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.wheel {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
}

.wheel::-webkit-scrollbar {
  display: none;
}

.wheel-item {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.wheel-item.active {
  color: var(--text-primary);
  font-weight: 600;
  font-size: 24px;
}

.wheel-label {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--text-tertiary);
  margin-top: -2px;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
