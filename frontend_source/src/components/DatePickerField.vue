<template>
  <div class="date-picker-field" @click="openPicker">
    <div
      :class="['date-picker-display', displayClass, { empty: !modelValue }]"
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
          <div class="title-group">
            <span class="year-text">{{ currentYear }}年</span>
            <span class="month-text">{{ currentMonth + 1 }}月</span>
          </div>
          <button class="nav-btn today-btn" @click.stop="goToday">今天</button>
          <button class="nav-btn" @click.stop="changeMonth(1)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        <!-- 星期 -->
        <div class="weekday-row">
          <span v-for="w in weekdays" :key="w" class="weekday-cell">{{ w }}</span>
        </div>

        <!-- 日期网格 -->
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
import { ref, computed, watch } from 'vue'
import { Popup as VanPopup } from 'vant'
import 'vant/es/popup/style'

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  placeholder: { type: String, default: '请选择日期' },
  title: { type: String, default: '选择日期' },
  displayClass: { type: String, default: 'form-input' },
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)
const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth())
const tempSelected = ref(null) // 临时选中的 Date 对象

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

const openPicker = () => {
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
  showPicker.value = true
}

const changeMonth = (delta) => {
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
  const startWeekday = firstDay.getDay() // 0 = 周日
  const daysInMonth = lastDay.getDate()

  const days = []

  // 上月补位
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

  // 当月
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

  // 下月补位，凑够 42 格（6行）
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
}
.date-picker-display.empty {
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
  align-items: baseline;
  gap: 6px;
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
