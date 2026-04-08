<template>
  <div class="mood-page">
    <!-- 背景 -->
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>
    
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" @click="$router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="header-title">心情记录</span>
        <div class="icon-placeholder"></div>
      </div>
    </header>
    
    <!-- 主内容 -->
    <main class="main">
      <!-- 页面标题 -->
      <div class="page-header">
      <h1 class="page-title">心情记录</h1>
      <p class="page-subtitle">记录每一天的心情，分享喜怒哀乐</p>
    </div>

    <!-- 今日心情快速记录 -->
    <div class="card mood-input-card">
      <h3 class="card-title">今天心情怎么样？</h3>
      <div class="mood-options">
        <div
          v-for="mood in moodOptions"
          :key="mood.value"
          class="mood-item"
          :class="{ active: selectedMood === mood.value }"
          @click="selectedMood = mood.value"
        >
          <span class="mood-emoji">{{ mood.emoji }}</span>
          <span class="mood-label">{{ mood.label }}</span>
        </div>
      </div>
      <textarea
        v-model="moodNote"
        class="mood-note-input"
        placeholder="写下此刻的想法...（可选）"
        maxlength="500"
        rows="3"
      ></textarea>
      <button 
        class="btn btn-primary btn-full" 
        :disabled="!selectedMood || submitting"
        @click="submitMood"
      >
        {{ submitting ? '记录中...' : '记录心情' }}
      </button>
    </div>

    <!-- 心情日历 -->
    <div class="card mood-calendar-card">
      <h3 class="card-title">心情日历</h3>
      <div class="calendar-header">
        <button class="btn-icon" @click="changeMonth(-1)">‹</button>
        <span class="current-month">{{ currentYearMonth }}</span>
        <button class="btn-icon" @click="changeMonth(1)">›</button>
      </div>
      <div class="calendar-grid">
        <div class="weekday-header" v-for="day in weekdays" :key="day">{{ day }}</div>
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="calendar-day"
          :class="{ 
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'has-record': day.records.length > 0
          }"
          @click="selectDate(day)"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <div class="day-moods" v-if="day.records.length > 0">
            <span 
              v-for="record in getDayLatestRecords(day.records)" 
              :key="record.user.id"
              class="day-mood-emoji"
            >
              {{ getMoodEmoji(record.mood) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 选中日期的心情列表 -->
    <div class="card" v-if="selectedDateRecords.length > 0">
      <h3 class="card-title">{{ selectedDateStr }} 的心情</h3>
      <div class="mood-list">
        <div 
          v-for="record in selectedDateRecords" 
          :key="record.id"
          class="mood-record-item"
        >
          <img :src="record.user.avatar || '/default-avatar.png'" class="user-avatar" />
          <div class="record-content">
            <div class="record-header">
              <span class="user-name">{{ record.user.nickname }}</span>
              <span class="record-time">{{ formatTime(record.createdAt) }}</span>
            </div>
            <div class="record-body">
              <span class="record-mood-emoji">{{ getMoodEmoji(record.mood) }}</span>
              <span class="record-mood-label">{{ getMoodLabel(record.mood) }}</span>
              <p v-if="record.note" class="record-note">{{ record.note }}</p>
            </div>
          </div>
          <button 
            v-if="record.user.id === currentUserId"
            class="btn-icon-delete"
            @click="deleteMood(record.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- 月度统计 -->
    <div class="card stats-card" v-if="statsData">
      <h3 class="card-title">本月心情统计</h3>
      <div class="stats-grid">
        <div class="stat-item" v-for="(count, mood) in statsData.myStats" :key="mood">
          <span class="stat-emoji">{{ getMoodEmoji(mood) }}</span>
          <span class="stat-count">{{ count }}天</span>
        </div>
      </div>
      <p v-if="Object.keys(statsData.myStats).length === 0" class="empty-text">
        本月还没有心情记录
      </p>
    </div>

    </main>
    
    <!-- 底部导航 -->
    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/user.js'
import BottomNav from '../components/BottomNav.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

// 心情选项
const moodOptions = [
  { value: 'happy', emoji: '😊', label: '开心', color: '#FFD93D' },
  { value: 'excited', emoji: '🤩', label: '兴奋', color: '#FF6B6B' },
  { value: 'calm', emoji: '😌', label: '平静', color: '#95E1D3' },
  { value: 'tired', emoji: '😴', label: '疲惫', color: '#B4A7D6' },
  { value: 'sad', emoji: '😢', label: '难过', color: '#74B9FF' },
  { value: 'angry', emoji: '😠', label: '生气', color: '#FF7675' },
  { value: 'sick', emoji: '🤒', label: '不舒服', color: '#A29BFE' },
  { value: 'loved', emoji: '🥰', label: '被爱', color: '#FD79A8' }
]

// 获取 emoji 和 label
const getMoodEmoji = (mood) => moodOptions.find(m => m.value === mood)?.emoji || '💭'
const getMoodLabel = (mood) => moodOptions.find(m => m.value === mood)?.label || '未知'

// 状态
const selectedMood = ref('')
const moodNote = ref('')
const submitting = ref(false)
const currentMonth = ref(new Date())
const selectedDate = ref(null)
const moodRecords = ref([])
const dailyMoods = ref([])
const statsData = ref(null)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

// 计算属性
const currentYearMonth = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth() + 1
  return `${year}年${month}月`
})

const selectedDateStr = computed(() => {
  if (!selectedDate.value) return ''
  const month = selectedDate.value.getMonth() + 1
  const date = selectedDate.value.getDate()
  return `${month}月${date}日`
})

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const prevLastDay = new Date(year, month, 0)
  
  const days = []
  const startWeekday = firstDay.getDay()
  
  // 上个月的日期
  for (let i = startWeekday - 1; i >= 0; i--) {
    const date = new Date(year, month, -i)
    days.push(createDayObj(date, false))
  }
  
  // 当月日期
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    days.push(createDayObj(date, true))
  }
  
  // 下个月的日期
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push(createDayObj(date, false))
  }
  
  return days
})

const selectedDateRecords = computed(() => {
  if (!selectedDate.value) return []
  const dateStr = formatDate(selectedDate.value)
  return moodRecords.value.filter(r => r.recordDate === dateStr)
})

function createDayObj(date, isCurrentMonth) {
  const today = new Date()
  const dateStr = formatDate(date)
  const records = dailyMoods.value.filter(d => d.date === dateStr).flatMap(d => d.records)
  
  return {
    date,
    isCurrentMonth,
    isToday: formatDate(date) === formatDate(today),
    records
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(isoString) {
  const date = new Date(isoString)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function getDayLatestRecords(records) {
  // 按用户分组，取每个用户当天的最后一条
  const userMap = {}
  records.forEach(r => {
    if (!userMap[r.user.id] || new Date(r.createdAt) > new Date(userMap[r.user.id].createdAt)) {
      userMap[r.user.id] = r
    }
  })
  return Object.values(userMap)
}

// 方法
function changeMonth(delta) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1)
  fetchDailyMoods()
  fetchStats()
}

function selectDate(day) {
  selectedDate.value = day.date
}

async function submitMood() {
  if (!selectedMood.value) return
  
  submitting.value = true
  try {
    const response = await fetch('/api/mood', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        mood: selectedMood.value,
        note: moodNote.value,
        recordDate: formatDate(new Date())
      })
    })
    
    const data = await response.json()
    if (data.success) {
      selectedMood.value = ''
      moodNote.value = ''
      await fetchMoodRecords()
      await fetchDailyMoods()
      await fetchStats()
    } else {
      alert(data.message || '记录失败')
    }
  } catch (error) {
    console.error('记录心情失败:', error)
    alert('网络错误，请重试')
  } finally {
    submitting.value = false
  }
}

async function deleteMood(id) {
  if (!confirm('确定要删除这条心情记录吗？')) return
  
  try {
    const response = await fetch(`/api/mood/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      await fetchMoodRecords()
      await fetchDailyMoods()
    } else {
      alert(data.message || '删除失败')
    }
  } catch (error) {
    console.error('删除心情失败:', error)
    alert('网络错误，请重试')
  }
}

async function fetchMoodRecords() {
  try {
    const response = await fetch('/api/mood?limit=100', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      moodRecords.value = data.data
    }
  } catch (error) {
    console.error('获取心情记录失败:', error)
  }
}

async function fetchDailyMoods() {
  try {
    const year = currentMonth.value.getFullYear()
    const month = currentMonth.value.getMonth()
    const startDate = formatDate(new Date(year, month, 1))
    const endDate = formatDate(new Date(year, month + 1, 0))
    
    const response = await fetch(`/api/mood/daily?startDate=${startDate}&endDate=${endDate}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      dailyMoods.value = data.data
    }
  } catch (error) {
    console.error('获取每日心情失败:', error)
  }
}

async function fetchStats() {
  try {
    const year = currentMonth.value.getFullYear()
    const month = String(currentMonth.value.getMonth() + 1).padStart(2, '0')
    
    const response = await fetch(`/api/mood/stats?month=${year}-${month}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const data = await response.json()
    if (data.success) {
      statsData.value = data.data
    }
  } catch (error) {
    console.error('获取心情统计失败:', error)
  }
}

onMounted(() => {
  fetchMoodRecords()
  fetchDailyMoods()
  fetchStats()
  
  // WebSocket 监听
  if (window.eventBus) {
    window.eventBus.on('moodUpdated', () => {
      fetchMoodRecords()
      fetchDailyMoods()
      fetchStats()
    })
  }
})
</script>

<style scoped>
.mood-page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
}

/* 背景 */
.bg-container {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.4;
}

.orb-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  top: -100px;
  right: -100px;
}

.orb-2 {
  width: 250px;
  height: 250px;
  background: linear-gradient(135deg, #DBED9C 0%, #B8D96A 100%);
  bottom: 10%;
  left: -80px;
}

/* 顶部导航 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(253, 253, 245, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 480px;
  margin: 0 auto;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-secondary);
}

.icon-placeholder {
  width: 40px;
}

/* 主内容 */
.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.page-subtitle {
  font-size: 14px;
  color: var(--text-secondary);
}

.card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

/* 心情选择 */
.mood-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.mood-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-secondary);
}

.mood-item:hover {
  transform: translateY(-2px);
}

.mood-item.active {
  background: var(--primary-color);
  color: white;
}

.mood-emoji {
  font-size: 28px;
  margin-bottom: 4px;
}

.mood-label {
  font-size: 12px;
}

.mood-note-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  resize: none;
  margin-bottom: 12px;
  background: var(--bg-secondary);
}

.mood-note-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-full {
  width: 100%;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 日历 */
.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.current-month {
  font-weight: 600;
  font-size: 16px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.weekday-header {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  padding: 8px 0;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  padding: 4px;
}

.calendar-day:hover {
  background: var(--bg-secondary);
}

.calendar-day.other-month {
  opacity: 0.4;
}

.calendar-day.today {
  background: var(--primary-color);
  color: white;
}

.calendar-day.today .day-mood-emoji {
  filter: brightness(0) invert(1);
}

.day-number {
  font-size: 14px;
  font-weight: 500;
}

.day-moods {
  display: flex;
  gap: 2px;
  margin-top: 2px;
}

.day-mood-emoji {
  font-size: 12px;
}

/* 心情列表 */
.mood-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mood-record-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.record-content {
  flex: 1;
}

.record-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.user-name {
  font-weight: 500;
  font-size: 14px;
}

.record-time {
  font-size: 12px;
  color: var(--text-secondary);
}

.record-body {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.record-mood-emoji {
  font-size: 20px;
}

.record-mood-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.record-note {
  width: 100%;
  font-size: 14px;
  color: var(--text-primary);
  margin-top: 4px;
  line-height: 1.5;
}

.btn-icon-delete {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-delete:hover {
  background: rgba(255, 0, 0, 0.1);
  color: #ff4444;
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 12px;
}

.stat-emoji {
  font-size: 24px;
  margin-bottom: 4px;
}

.stat-count {
  font-size: 12px;
  color: var(--text-secondary);
}

.empty-text {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  padding: 20px;
}

@media (max-width: 400px) {
  .mood-options {
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  
  .mood-emoji {
    font-size: 24px;
  }
  
  .mood-label {
    font-size: 11px;
  }
}
</style>
