<template>
  <div class="date-picker-field" @click="openPicker">
    <div
      :class="['date-picker-display', displayClass, { empty: !modelValue, 'is-disabled': disabled }]"
    >
      {{ displayText }}
    </div>

    <van-popup
      v-model:show="showPicker"
      position="bottom"
      round
      :safe-area-inset-bottom="true"
      teleport="body"
      class="custom-date-popup"
    >
      <div class="picker-panel">
        <!-- 头部 -->
        <div class="picker-header">
          <button class="nav-btn" @click.stop="changeMonth(-1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div class="title-group" @click.stop="toggleYearMonthPicker">
            <span class="year-text">{{ currentYear }}年</span>
            <span class="month-text">{{ currentMonth + 1 }}月</span>
            <svg class="title-arrow" :class="{ open: showYearMonthPicker }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          <button class="nav-btn today-btn" @click.stop="goToday">今天</button>
          <button class="nav-btn" @click.stop="changeMonth(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <!-- 年月快速选择 -->
        <div v-if="showYearMonthPicker" class="year-month-panel">
          <div class="ym-section year-section">
            <div class="ym-label">年份</div>
            <div class="year-list" ref="yearListRef">
              <div
                v-for="y in yearRange"
                :key="y"
                :class="['year-item', { active: y === currentYear }]"
                @click.stop="selectYear(y)"
              >
                {{ y }}
              </div>
            </div>
          </div>
          <div class="ym-section month-section">
            <div class="ym-label">月份</div>
            <div class="month-grid">
              <div
                v-for="m in 12"
                :key="m"
                :class="['month-item', { active: m === currentMonth + 1 }]"
                @click.stop="selectMonth(m)"
              >
                {{ m }}月
              </div>
            </div>
          </div>
        </div>

        <!-- 星期 + 日期（年月选择时隐藏） -->
        <template v-else>
          <div class="weekday-row">
            <span v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</span>
          </div>

          <div class="days-grid">
            <div
              v-for="(day, idx) in calendarDays"
              :key="idx"
              :class="[
                'day-cell',
                {
                  'other-month': !day.isCurrentMonth,
                  'is-today': day.isToday,
                  'is-selected': day.isSelected,
                  'is-disabled': day.isDisabled,
                },
              ]"
              @click.stop="selectDay(day)"
            >
              <span class="day-num">{{ day.date.getDate() }}</span>
            </div>
          </div>
        </template>

        <!-- 底部操作 -->
        <div class="picker-footer">
          <button class="action-btn cancel" @click.stop="showPicker = false">取消</button>
          <button class="action-btn confirm" @click.stop="confirm">确定</button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Popup as VanPopup } from 'vant'
import 'vant/es/popup/style'

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  placeholder: { type: String, default: '请选择日期' },
  title: { type: String, default: '选择日期' },
  displayClass: { type: String, default: 'form-input' },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const showYearMonthPicker = ref(false)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const tempSelected = ref(null)
const yearListRef = ref(null)

const displayText = computed(() => {
  return props.modelValue || props.placeholder
})

const parseDateStr = (str) => {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatDateStr = (date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const isSameDay = (d1, d2) => {
  if (!d1 || !d2) return false
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

const minDate = computed(() => parseDateStr(props.min))
const maxDate = computed(() => parseDateStr(props.max))

const yearRange = computed(() => {
  const end = today.getFullYear() + 10
  const start = end - 119
  return Array.from({ length: 120 }, (_, i) => start + i)
})

const openPicker = () => {
  if (props.disabled) return
  const val = parseDateStr(props.modelValue)
  if (val) {
    currentYear.value = val.getFullYear()
    currentMonth.value = val.getMonth()
    tempSelected.value = new Date(val)
  } else {
    currentYear.value = today.getFullYear()
    currentMonth.value = today.getMonth()
    tempSelected.value = null
  }
  showYearMonthPicker.value = false
  showPicker.value = true
}

const toggleYearMonthPicker = () => {
  showYearMonthPicker.value = !showYearMonthPicker.value
  if (showYearMonthPicker.value) {
    nextTick(() => {
      const list = yearListRef.value
      if (list) {
        const activeItem = list.querySelector('.year-item.active')
        if (activeItem) {
          activeItem.scrollIntoView({ block: 'center', behavior: 'instant' })
        }
      }
    })
  }
}

const selectYear = (y) => {
  currentYear.value = y
}

const selectMonth = (m) => {
  currentMonth.value = m - 1
  showYearMonthPicker.value = false
}

const changeMonth = (delta) => {
  if (showYearMonthPicker.value) return
  let m = currentMonth.value + delta
  let y = currentYear.value
  if (m > 11) {
    m = 0
    y++
  } else if (m < 0) {
    m = 11
    y--
  }
  currentYear.value = y
  currentMonth.value = m
}

const goToday = () => {
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
  tempSelected.value = new Date(today)
  showYearMonthPicker.value = false
}

const selectDay = (day) => {
  if (day.isDisabled) return
  tempSelected.value = new Date(day.date)
}

const confirm = () => {
  if (tempSelected.value) {
    emit('update:modelValue', formatDateStr(tempSelected.value))
  }
  showPicker.value = false
}

const calendarDays = computed(() => {
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startWeekday = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const days = []

  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(tempSelected.value, new Date(year, month - 1, prevMonthLastDay - i)),
      isDisabled: false,
    })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const disabled =
      (minDate.value && date < new Date(minDate.value.getTime())) ||
      (maxDate.value && date > new Date(maxDate.value.getTime()))
    days.push({
      date,
      isCurrentMonth: true,
      isToday: isSameDay(date, today),
      isSelected: isSameDay(tempSelected.value, date),
      isDisabled: disabled,
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      isToday: false,
      isSelected: isSameDay(tempSelected.value, new Date(year, month + 1, i)),
      isDisabled: false,
    })
  }

  return days
})
</script>

<style>
.date-picker-field {
  width: 100%;
}
.date-picker-display {
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color, rgba(233, 30, 99, 0.2));
  background: var(--bg-input, rgba(255, 255, 255, 0.7));
  font-size: 14px;
  color: #111827;
  outline: none;
  transition: all 0.2s;
  min-height: 42px;
  display: flex;
  align-items: center;
}
.date-picker-display:hover:not(.is-disabled) {
  border-color: rgba(233, 30, 99, 0.35);
}
.date-picker-display.is-disabled {
  cursor: not-allowed;
  background: var(--bg-card, rgba(255, 255, 255, 0.95));
  color: #9ca3af;
}

/* 覆盖 Vant Popup 圆角 */
.custom-date-popup.van-popup--round {
  border-radius: 24px 24px 0 0 !important;
  overflow: hidden;
}

.picker-panel {
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  padding: 20px 16px calc(20px + env(safe-area-inset-bottom, 0px));
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 0 4px;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}

.title-group:hover {
  background: #fdf2f8;
}

.year-text {
  font-size: 15px;
  color: #9ca3af;
  font-weight: 500;
}

.month-text {
  font-size: 20px;
  font-weight: 700;
  color: #111827;
}

.title-arrow {
  color: #9ca3af;
  margin-left: 2px;
  transition: transform 0.2s ease;
}

.title-arrow.open {
  transform: rotate(180deg);
}

.nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(233, 30, 99, 0.15);
  background: #fff;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.nav-btn:hover {
  background: #fdf2f8;
  color: #db2777;
  border-color: rgba(233, 30, 99, 0.3);
}

.nav-btn.today-btn {
  width: auto;
  padding: 0 12px;
  font-size: 13px;
  font-weight: 500;
  margin: 0 8px;
}

/* 年月快速选择面板 */
.year-month-panel {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  height: 300px;
}

.ym-section {
  display: flex;
  flex-direction: column;
}

.ym-section.year-section {
  width: 110px;
  flex-shrink: 0;
}

.ym-section.month-section {
  flex: 1;
  min-width: 0;
}

.ym-label {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
  margin-bottom: 10px;
  text-align: center;
}

.year-list {
  flex: 1;
  overflow-y: auto;
  background: #f9fafb;
  border-radius: 14px;
  padding: 10px 0;
  scrollbar-width: none;
}

.year-list::-webkit-scrollbar {
  display: none;
}

.year-item {
  padding: 12px 0;
  text-align: center;
  font-size: 15px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 10px;
  margin: 2px 8px;
  white-space: nowrap;
}

.year-item:hover {
  background: #fdf2f8;
  color: #db2777;
}

.year-item.active {
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(255, 107, 138, 0.3);
}

.month-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: #f9fafb;
  border-radius: 14px;
  padding: 14px;
  align-content: center;
  justify-items: center;
}

.month-item {
  width: 100%;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
  background: #ffffff;
  border: 1px solid transparent;
}

.month-item:hover {
  border-color: rgba(233, 30, 99, 0.25);
  color: #db2777;
}

.month-item.active {
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 3px 10px rgba(255, 107, 138, 0.3);
}

.weekday-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.weekday-cell {
  text-align: center;
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  line-height: 32px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.day-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  position: relative;
}

.day-cell:hover:not(.is-disabled) {
  background: #fdf2f8;
}

.day-cell .day-num {
  font-size: 15px;
  font-weight: 500;
  color: #374151;
}

.day-cell.other-month .day-num {
  color: #d1d5db;
}

.day-cell.is-today {
  border: 2px solid #FF6B8A;
}

.day-cell.is-today .day-num {
  color: #FF6B8A;
  font-weight: 600;
}

.day-cell.is-selected {
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
  box-shadow: 0 4px 12px rgba(255, 107, 138, 0.35);
  transform: scale(1.05);
}

.day-cell.is-selected .day-num {
  color: #ffffff;
  font-weight: 600;
}

.day-cell.is-disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.day-cell.is-disabled .day-num {
  color: #9ca3af;
}

.picker-footer {
  display: flex;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.action-btn {
  flex: 1;
  padding: 14px 0;
  border-radius: 16px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.cancel {
  background: #f3f4f6;
  color: #6b7280;
}

.action-btn.cancel:hover {
  background: #e5e7eb;
}

.action-btn.confirm {
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
  color: #ffffff;
  box-shadow: 0 4px 14px rgba(123, 104, 238, 0.3);
}

.action-btn.confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(123, 104, 238, 0.4);
}

.action-btn.confirm:active {
  transform: translateY(0);
}
</style>
