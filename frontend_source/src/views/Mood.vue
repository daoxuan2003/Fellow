<template>
  <div class="mood-page">
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
      <section class="mood-hero-card" :class="[moodConnection.nudge.tone, { syncing: loadingDashboard }]">
        <div class="hero-copy">
          <span class="hero-kicker">Mood Signal</span>
          <h1>{{ moodConnection.nudge.title }}</h1>
          <p>{{ moodConnection.nudge.body }}</p>
        </div>
        <div class="hero-metrics">
          <div class="hero-metric">
            <strong>{{ moodConnection.currentStreak }}</strong>
            <span>连续记录</span>
          </div>
          <div class="hero-metric">
            <strong>{{ moodConnection.pairedDays }}</strong>
            <span>同日回应</span>
          </div>
          <div class="hero-metric">
            <strong>{{ moodConnection.completionRate }}%</strong>
            <span>情绪闭环</span>
          </div>
        </div>
      </section>

      <div v-if="loadError" class="mood-inline-error">
        <span>{{ loadError }}</span>
        <button type="button" @click="refreshMoodData()">重试</button>
      </div>

      <section class="response-plan-card" :class="moodConnection.responsePlan.tone">
        <div class="response-plan-main">
          <span class="hero-kicker">Today Reply</span>
          <h2>{{ moodConnection.responsePlan.title }}</h2>
          <p>{{ moodConnection.responsePlan.body }}</p>
        </div>
        <button class="response-plan-action" type="button" @click="applyResponsePlan">
          {{ moodConnection.responsePlan.actionLabel }}
        </button>
        <div class="response-checklist">
          <span
            v-for="item in moodConnection.responsePlan.checklist"
            :key="item"
          >
            {{ item }}
          </span>
        </div>
      </section>

      <!-- 今日双方心情展示 -->
      <div class="card today-mood-card">
        <div class="card-title-row">
          <h3 class="card-title">今天的心情</h3>
          <span class="sync-pill" :class="moodConnection.nudge.tone">{{ moodConnection.nudge.actionLabel }}</span>
        </div>
        <div class="today-mood-display">
          <!-- 我的心情（左边） -->
          <div class="mood-side">
            <span class="big-mood-emoji" :class="{ empty: !todayMyMood }">{{ todayMyMood ? getMoodEmoji(todayMyMood.mood) : '?' }}</span>
            <span class="mood-name">{{ myNickname }}</span>
            <span class="mood-label" v-if="todayMyMood">{{ getMoodLabel(todayMyMood.mood) }}</span>
            <span class="mood-label empty" v-else>未记录</span>
            <p v-if="todayMyMood?.note" class="mood-note-preview">{{ todayMyMood.note }}</p>
          </div>
          
          <!-- 中间虚线 -->
          <div class="mood-divider">
            <div class="divider-line"></div>
            <span class="divider-heart">💕</span>
            <div class="divider-line"></div>
          </div>
          
          <!-- 伴侣心情（右边） -->
          <div class="mood-side">
            <span class="big-mood-emoji" :class="{ empty: !todayPartnerMood }">{{ todayPartnerMood ? getMoodEmoji(todayPartnerMood.mood) : '?' }}</span>
            <span class="mood-name">{{ partnerName || 'TA' }}</span>
            <span class="mood-label" v-if="todayPartnerMood">{{ getMoodLabel(todayPartnerMood.mood) }}</span>
            <span class="mood-label empty" v-else>未记录</span>
            <p v-if="todayPartnerMood?.note" class="mood-note-preview">{{ todayPartnerMood.note }}</p>
          </div>
        </div>
      </div>

      <!-- 今日心情快速记录 -->
      <div class="card mood-input-card">
        <div class="card-title-row">
          <h3 class="card-title">记录今天的心情</h3>
          <span v-if="selectedMood" class="selected-mood-pill">{{ getMoodEmoji(selectedMood) }} {{ getMoodLabel(selectedMood) }}</span>
        </div>
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
        :placeholder="moodNotePlaceholder"
        maxlength="500"
        rows="3"
      ></textarea>
      <div class="prompt-rail" v-if="moodPromptOptions.length">
        <button
          v-for="prompt in moodPromptOptions"
          :key="prompt"
          type="button"
          class="prompt-chip"
          @click="applyMoodPrompt(prompt)"
        >
          {{ prompt }}
        </button>
      </div>
      <button 
        class="btn btn-primary btn-full" 
        :disabled="!selectedMood || submitting"
        @click="submitMood"
      >
        {{ submitting ? '记录中...' : moodConnection.nudge.actionLabel }}
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
              :key="record.user?.id || record.id"
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
          <img :src="record.user.avatar || record.user.avatarUrl || '/default-avatar.png'" class="user-avatar" />
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
            v-if="record.user?.id === currentUserId"
            class="btn-icon-delete"
            @click="deleteMood(record.id)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
    <div class="card selected-date-empty" v-else-if="selectedDate">
      <h3 class="card-title">{{ selectedDateStr }} 的心情</h3>
      <p>这一天还没有留下记录。</p>
    </div>

    <!-- 月度统计 -->
    <div class="card stats-card" v-if="statsData">
      <h3 class="card-title">本月心情动力</h3>
      <div class="momentum-grid">
        <div class="momentum-item">
          <strong>{{ moodConnection.myRecordedDays }}</strong>
          <span>我的记录日</span>
        </div>
        <div class="momentum-item">
          <strong>{{ moodConnection.partnerRecordedDays }}</strong>
          <span>TA 的记录日</span>
        </div>
        <div class="momentum-item">
          <strong>{{ moodConnection.dominantMood ? getMoodEmoji(moodConnection.dominantMood.mood) : '—' }}</strong>
          <span>主导心情</span>
        </div>
      </div>
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

    <div
      v-if="toast.show"
      class="mood-toast"
      :class="toast.type"
      role="status"
      aria-live="polite"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { buildMoodConnectionSummary, getLatestMoodForUser } from '../utils/mood-insights.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'

const userStore = useUserStore()
const currentUserId = computed(() => resolveCurrentUserId(userStore))
const partnerId = computed(() => userStore.partner?.id || '')

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
const loadingDashboard = ref(false)
const loadError = ref('')
const toast = ref({
  show: false,
  message: '',
  type: 'info'
})
const pendingDeleteId = ref('')
let toastTimer = null
let deleteConfirmTimer = null
let unsubscribeWS = null

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
  // 显式声明依赖，确保 dailyMoods 变化时重新计算日历
  const _ = dailyMoods.value
  
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

// 获取今天日期字符串
const getTodayStr = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 今天我的心情
const todayMyMood = computed(() => {
  const today = getTodayStr()
  const myId = currentUserId.value
  return getLatestMoodForUser(moodRecords.value, today, myId)
})

// 今天伴侣心情
const todayPartnerMood = computed(() => {
  const today = getTodayStr()
  const currentPartnerId = String(partnerId.value)
  if (!currentPartnerId) return null
  return getLatestMoodForUser(moodRecords.value, today, currentPartnerId)
})

// 伴侣头像
const myNickname = computed(() => {
  return userStore.user?.nickname || '我'
})

// 伴侣名字
const partnerName = computed(() => {
  return userStore.partner?.nickname || 'TA'
})

const moodConnection = computed(() => buildMoodConnectionSummary({
  dailyMoods: dailyMoods.value,
  moodRecords: moodRecords.value,
  statsData: statsData.value,
  currentUserId: currentUserId.value,
  partnerId: partnerId.value,
  today: getTodayStr(),
  partnerName: partnerName.value
}))

const moodPromptOptions = computed(() => moodConnection.value.promptOptions)

const moodNotePlaceholder = computed(() => {
  if (todayPartnerMood.value) {
    return `回应 ${partnerName.value}，也写下你的此刻...`
  }
  return '写下此刻的想法...（可选）'
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
    const recordUserId = r.user?.id || r.userId
    if (!recordUserId) return
    if (!userMap[recordUserId] || new Date(r.createdAt) > new Date(userMap[recordUserId].createdAt)) {
      userMap[recordUserId] = r
    }
  })
  return Object.values(userMap)
}

// 方法
async function changeMonth(delta) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1)
  await refreshMoodData({ silent: true })
}

function selectDate(day) {
  selectedDate.value = day.date
}

function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => {
    toast.value = { ...toast.value, show: false }
    toastTimer = null
  }, 2800)
}

function requireSecondDeleteClick(id) {
  if (pendingDeleteId.value === id) {
    pendingDeleteId.value = ''
    if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
    deleteConfirmTimer = null
    return true
  }

  pendingDeleteId.value = id
  showToast('再次点击删除这条心情记录', 'warning')
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
  deleteConfirmTimer = setTimeout(() => {
    pendingDeleteId.value = ''
    deleteConfirmTimer = null
  }, 4200)
  return false
}

function applyMoodPrompt(prompt) {
  moodNote.value = prompt
}

function applyResponsePlan() {
  const plan = moodConnection.value.responsePlan
  if (plan.suggestedMood) selectedMood.value = plan.suggestedMood
  if (plan.noteDraft && !moodNote.value.trim()) {
    moodNote.value = plan.noteDraft
  }
}

async function readApiJson(response, fallbackMessage = '同步失败') {
  let data = {}
  try {
    data = await response.json()
  } catch {
    data = {}
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || fallbackMessage)
  }
  return data
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    Authorization: `Bearer ${localStorage.getItem('token')}`
  }
}

async function refreshMoodData({ silent = false } = {}) {
  if (!silent) loadingDashboard.value = true
  try {
    await Promise.all([
      fetchMoodRecords(),
      fetchDailyMoods(),
      fetchStats()
    ])
    loadError.value = ''
  } catch (error) {
    loadError.value = error.message || '心情数据同步失败'
  } finally {
    loadingDashboard.value = false
  }
}

async function submitMood() {
  if (!selectedMood.value) return
  
  submitting.value = true
  try {
    const response = await fetch(CONFIG.API_URL + '/mood', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        mood: selectedMood.value,
        note: moodNote.value,
        recordDate: formatDate(new Date())
      })
    })
    
    const data = await readApiJson(response, '记录失败')
    if (data.success) {
      selectedMood.value = ''
      moodNote.value = ''
      await refreshMoodData({ silent: true })
      showToast('心情已记录，今天的连接又多了一格', 'success')
    }
  } catch (error) {
    showToast(error.message || '网络错误，请重试', 'error')
  } finally {
    submitting.value = false
  }
}

async function deleteMood(id) {
  if (!requireSecondDeleteClick(id)) return
  
  try {
    const response = await fetch(CONFIG.API_URL + `/mood/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    
    const data = await readApiJson(response, '删除失败')
    if (data.success) {
      await refreshMoodData({ silent: true })
      showToast('心情记录已删除', 'success')
    }
  } catch (error) {
    showToast(error.message || '网络错误，请重试', 'error')
  }
}

async function fetchMoodRecords() {
  const response = await fetch(CONFIG.API_URL + '/mood?limit=100', {
    headers: authHeaders()
  })
  const data = await readApiJson(response, '获取心情记录失败')
  moodRecords.value = data.data || []
}

async function fetchDailyMoods() {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const startDate = formatDate(new Date(year, month, 1))
  const endDate = formatDate(new Date(year, month + 1, 0))

  const response = await fetch(CONFIG.API_URL + `/mood/daily?startDate=${startDate}&endDate=${endDate}`, {
    headers: authHeaders()
  })
  const data = await readApiJson(response, '获取每日心情失败')
  dailyMoods.value = data.data || []
}

async function fetchStats() {
  const year = currentMonth.value.getFullYear()
  const month = String(currentMonth.value.getMonth() + 1).padStart(2, '0')

  const response = await fetch(CONFIG.API_URL + `/mood/stats?month=${year}-${month}`, {
    headers: authHeaders()
  })
  const data = await readApiJson(response, '获取心情统计失败')
  statsData.value = data.data
}

async function fetchUser() {
  try {
    const response = await fetch(CONFIG.API_URL + '/me', {
      headers: authHeaders()
    })
    const data = await readApiJson(response, '获取用户数据失败')
    if (data.success) {
      userStore.updateUserData(data.data, data.data.partner)
    }
  } catch (error) {
    loadError.value = error.message || '获取用户数据失败'
  }
}

const { onMessage } = useWebSocket()

function handleWSMessage(data) {
  if (data.type === 'moodSync' || data.type?.startsWith('mood')) {
    refreshMoodData({ silent: true })
  }
}

onMounted(async () => {
  // 先获取用户数据（如果 store 中没有）
  if (!userStore.user?.id) {
    await fetchUser()
  }
  await refreshMoodData()
  
  // 默认选中今天，显示当天的心情记录
  selectedDate.value = new Date()
  unsubscribeWS = onMessage(handleWSMessage)
})

onUnmounted(() => {
  if (unsubscribeWS) unsubscribeWS()
  if (toastTimer) clearTimeout(toastTimer)
  if (deleteConfirmTimer) clearTimeout(deleteConfirmTimer)
})
</script>

<style scoped>
.mood-page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
  background: linear-gradient(180deg, #F7F8F3 0%, #EFF5F2 48%, #F8F3F4 100%);
  --mood-surface: rgba(255, 255, 255, 0.86);
  --mood-soft: rgba(23, 107, 104, 0.08);
  --mood-border: rgba(31, 42, 49, 0.12);
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
  max-width: 560px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 16px;
}

.mood-hero-card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(23, 107, 104, 0.18);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(231, 241, 238, 0.82)),
    linear-gradient(135deg, rgba(23, 107, 104, 0.15), rgba(194, 65, 95, 0.08));
  box-shadow: 0 18px 44px rgba(31, 42, 49, 0.1);
}

.mood-hero-card.care {
  border-color: rgba(194, 65, 95, 0.22);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 240, 242, 0.8)),
    linear-gradient(135deg, rgba(194, 65, 95, 0.12), rgba(23, 107, 104, 0.08));
}

.mood-hero-card.synced {
  border-color: rgba(32, 131, 91, 0.24);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(236, 253, 245, 0.82)),
    linear-gradient(135deg, rgba(32, 131, 91, 0.14), rgba(245, 158, 11, 0.08));
}

.mood-hero-card.syncing {
  opacity: 0.78;
}

.hero-copy {
  min-width: 0;
}

.hero-kicker {
  display: block;
  color: #176B68;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.mood-hero-card h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 24px;
  line-height: 1.18;
}

.mood-hero-card p {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.55;
}

.hero-metrics,
.momentum-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.hero-metrics {
  margin-top: 18px;
}

.hero-metric,
.momentum-item {
  min-width: 0;
  padding: 12px 10px;
  border: 1px solid var(--mood-border);
  border-radius: 10px;
  background: var(--mood-surface);
}

.hero-metric strong,
.momentum-item strong {
  display: block;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-metric span,
.momentum-item span {
  display: block;
  margin-top: 5px;
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mood-inline-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(190, 64, 58, 0.22);
  border-radius: 10px;
  background: rgba(254, 242, 242, 0.92);
  color: #9f1239;
  font-size: 13px;
}

.mood-inline-error button {
  flex: 0 0 auto;
  border: none;
  background: transparent;
  color: #9f1239;
  font-weight: 800;
  cursor: pointer;
}

.response-plan-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid rgba(31, 42, 49, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 252, 0.9);
  box-shadow: 0 14px 36px rgba(31, 42, 49, 0.08);
}

.response-plan-card.care {
  border-color: rgba(190, 18, 60, 0.18);
  background: #fff6f7;
}

.response-plan-card.synced {
  border-color: rgba(15, 118, 110, 0.18);
  background: #f2faf7;
}

.response-plan-card.waiting {
  border-color: rgba(125, 93, 59, 0.2);
  background: #fffaf0;
}

.response-plan-main {
  min-width: 0;
}

.response-plan-main h2 {
  margin: 0;
  color: #16201d;
  font-size: 19px;
  line-height: 1.22;
  font-weight: 900;
  letter-spacing: 0;
}

.response-plan-main p {
  margin: 7px 0 0;
  color: #5f6b66;
  font-size: 13px;
  line-height: 1.5;
}

.response-plan-action {
  align-self: start;
  min-height: 38px;
  border: none;
  border-radius: 8px;
  padding: 0 13px;
  background: #16201d;
  color: #fffaf4;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}

.response-checklist {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
}

.response-checklist span {
  min-width: 0;
  padding: 8px 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: #47524d;
  font-size: 11px;
  font-weight: 750;
  line-height: 1.3;
}

.card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 16px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.card-title-row .card-title {
  margin-bottom: 0;
}

.sync-pill,
.selected-mood-pill {
  flex: 0 0 auto;
  max-width: 46%;
  overflow: hidden;
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(23, 107, 104, 0.1);
  color: #176B68;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-pill.care {
  background: rgba(194, 65, 95, 0.1);
  color: #C2415F;
}

.sync-pill.synced {
  background: rgba(32, 131, 91, 0.12);
  color: #20835B;
}

.selected-mood-pill {
  background: rgba(245, 158, 11, 0.12);
  color: #8A5A12;
}

/* 心情选择 */
/* 今日心情展示区 */
.today-mood-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 12px;
}

.mood-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.big-mood-emoji {
  font-size: 48px;
  line-height: 1;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.1));
  animation: float 3s ease-in-out infinite;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%);
}

.big-mood-emoji.empty {
  font-size: 32px;
  color: var(--text-tertiary);
  font-weight: 400;
  background: linear-gradient(135deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.02) 100%);
}

.mood-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.mood-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
}

.mood-label.empty {
  color: var(--text-tertiary);
  font-style: italic;
}

.mood-note-preview {
  font-size: 12px;
  color: var(--text-tertiary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mood-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
}

.divider-line {
  width: 2px;
  height: 28px;
  border-left: 2px dashed var(--border-color);
  opacity: 0.5;
}

.divider-heart {
  font-size: 20px;
  animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.1); }
  50% { transform: scale(1); }
  75% { transform: scale(1.1); }
}

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
  background: var(--mood-soft);
  border: 1px solid transparent;
}

.mood-item:hover {
  transform: translateY(-2px);
}

.mood-item.active {
  background: linear-gradient(135deg, #176B68 0%, #C2415F 100%);
  color: white;
  border-color: transparent;
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
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.74);
}

.mood-note-input:focus {
  outline: none;
  border-color: var(--color-primary);
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
  background: linear-gradient(135deg, #176B68 0%, #C2415F 100%);
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
  background: var(--mood-soft);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.prompt-rail {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  margin-bottom: 2px;
  scrollbar-width: none;
}

.prompt-rail::-webkit-scrollbar {
  display: none;
}

.prompt-chip {
  flex: 0 0 auto;
  max-width: 78%;
  overflow: hidden;
  border: 1px solid rgba(23, 107, 104, 0.16);
  border-radius: 999px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  background: var(--mood-soft);
}

.calendar-day.other-month {
  opacity: 0.4;
}

.calendar-day.today {
  background: linear-gradient(135deg, #176B68 0%, #C2415F 100%);
  color: white;
}

/* 移除反色滤镜，让 emoji 正常显示 */
.calendar-day.today .day-mood-emoji {
  /* filter: brightness(0) invert(1); */
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
  background: var(--mood-soft);
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
  background: var(--mood-soft);
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

.selected-date-empty p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.5;
}

.momentum-grid {
  margin-bottom: 14px;
}

.mood-toast {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(92px + env(safe-area-inset-bottom));
  z-index: 3000;
  max-width: 440px;
  margin: 0 auto;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.94);
  color: white;
  box-shadow: 0 14px 36px rgba(55, 48, 84, 0.22);
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  backdrop-filter: blur(14px);
  pointer-events: none;
}

.mood-toast.success {
  background: rgba(32, 131, 91, 0.94);
}

.mood-toast.warning {
  background: rgba(151, 103, 26, 0.94);
}

.mood-toast.error {
  background: rgba(190, 64, 58, 0.94);
}

@media (max-width: 400px) {
  .response-plan-card {
    grid-template-columns: 1fr;
  }

  .response-plan-action {
    width: 100%;
  }

  .response-checklist {
    grid-template-columns: 1fr;
  }

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
