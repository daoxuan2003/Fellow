<template>
  <div class="mood-page">
    <!-- 顶部导航 -->
    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" type="button" aria-label="返回" @click="$router.back()">
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
      <section
        class="mood-ritual-card"
        :class="[moodRitualBoard.tone, { syncing: loadingDashboard }]"
        aria-labelledby="mood-ritual-title"
      >
        <div class="ritual-head">
          <div>
            <span class="hero-kicker">今日情绪交换</span>
            <h1 id="mood-ritual-title">{{ moodRitualBoard.title }}</h1>
            <p>{{ moodRitualBoard.body }}</p>
          </div>
          <button type="button" class="ritual-primary" @click="applyResponsePlan">
            {{ moodRitualBoard.actionLabel }}
          </button>
        </div>

        <div class="ritual-people" aria-label="今天双方心情状态">
          <article
            v-if="moodRitualBoard.participants[0]"
            class="ritual-person"
            :class="moodRitualBoard.participants[0].state"
          >
            <span class="person-badge">{{ moodRitualBoard.participants[0].badge }}</span>
            <span class="big-mood-emoji" :class="{ empty: !moodRitualBoard.participants[0].mood }">
              {{ moodRitualBoard.participants[0].mood ? getMoodEmoji(moodRitualBoard.participants[0].mood) : '?' }}
            </span>
            <strong>{{ moodRitualBoard.participants[0].name }}</strong>
            <small>{{ moodRitualBoard.participants[0].label }}</small>
            <p>{{ moodRitualBoard.participants[0].note }}</p>
          </article>
          <div class="ritual-bridge">
            <strong>{{ moodRitualBoard.bridge.label }}</strong>
            <span>{{ moodRitualBoard.bridge.detail }}</span>
          </div>
          <article
            v-if="moodRitualBoard.participants[1]"
            class="ritual-person"
            :class="moodRitualBoard.participants[1].state"
          >
            <span class="person-badge">{{ moodRitualBoard.participants[1].badge }}</span>
            <span class="big-mood-emoji" :class="{ empty: !moodRitualBoard.participants[1].mood }">
              {{ moodRitualBoard.participants[1].mood ? getMoodEmoji(moodRitualBoard.participants[1].mood) : '?' }}
            </span>
            <strong>{{ moodRitualBoard.participants[1].name }}</strong>
            <small>{{ moodRitualBoard.participants[1].label }}</small>
            <p>{{ moodRitualBoard.participants[1].note }}</p>
          </article>
        </div>

        <div class="ritual-progress-block">
          <div class="ritual-progress-head">
            <div>
              <span>{{ moodRitualBoard.quest.rewardLabel }}</span>
              <strong>{{ moodRitualBoard.quest.title }}</strong>
            </div>
            <em>{{ moodRitualBoard.quest.progressPercent }}%</em>
          </div>
          <div class="quest-progress" aria-hidden="true">
            <span :style="{ width: moodRitualBoard.quest.progressPercent + '%' }"></span>
          </div>
          <div class="ritual-steps">
            <div
              v-for="step in moodRitualBoard.quest.steps"
              :key="step.id"
              class="quest-step"
              :class="step.state"
            >
              <span class="quest-step-dot"></span>
              <div>
                <strong>{{ step.label }}</strong>
                <small>{{ step.detail }}</small>
              </div>
            </div>
          </div>
        </div>

        <div class="ritual-response">
          <div class="response-plan-main">
            <span class="hero-kicker">给 TA 的回应</span>
            <h2>{{ moodRitualBoard.response.title }}</h2>
            <p>{{ moodRitualBoard.response.body }}</p>
          </div>
          <div class="response-checklist">
            <span
              v-for="item in moodRitualBoard.response.checklist"
              :key="item"
            >
              {{ item }}
            </span>
          </div>
        </div>

        <div class="ritual-stats" aria-label="心情连接统计">
          <div
            v-for="item in moodRitualBoard.stats"
            :key="item.id"
            class="ritual-stat"
          >
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </div>
        </div>
      </section>

      <div v-if="loadError" class="mood-inline-error">
        <span>{{ loadError }}</span>
        <button type="button" @click="refreshMoodData()">重试</button>
      </div>

      <!-- 今日心情快速记录 -->
      <div class="card mood-input-card ritual-input-card">
        <div class="card-title-row">
          <h3 class="card-title">把这一格补上</h3>
          <span v-if="selectedMood" class="selected-mood-pill">{{ getMoodEmoji(selectedMood) }} {{ getMoodLabel(selectedMood) }}</span>
        </div>
      <div class="mood-options">
        <button
          v-for="mood in moodOptions"
          :key="mood.value"
          type="button"
          class="mood-item"
          :class="{ active: selectedMood === mood.value }"
          :aria-pressed="selectedMood === mood.value"
          @click="selectedMood = mood.value"
        >
          <span class="mood-emoji">{{ mood.emoji }}</span>
          <span class="mood-label">{{ mood.label }}</span>
        </button>
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
      <h3 class="card-title">这个月的心情痕迹</h3>
      <div class="calendar-header">
        <button class="btn-icon" @click="changeMonth(-1)">‹</button>
        <span class="current-month">{{ currentYearMonth }}</span>
        <button class="btn-icon" @click="changeMonth(1)">›</button>
      </div>
      <div class="calendar-grid">
        <div class="weekday-header" v-for="day in weekdays" :key="day">{{ day }}</div>
        <button
          v-for="(day, index) in calendarDays"
          :key="index"
          type="button"
          class="calendar-day"
          :class="{ 
            'other-month': !day.isCurrentMonth,
            'today': day.isToday,
            'has-record': day.records.length > 0
          }"
          :aria-label="`${day.date.getMonth() + 1}月${day.date.getDate()}日，${day.records.length > 0 ? '有心情记录' : '无心情记录'}`"
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
        </button>
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
            type="button"
            aria-label="删除这条心情记录"
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
      <h3 class="card-title">这个月的互相看见</h3>
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
      aria-atomic="true"
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
import { buildMoodConnectionSummary, buildMoodRitualBoard, getLatestMoodForUser } from '../utils/mood-insights.js'
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

const moodRitualBoard = computed(() => buildMoodRitualBoard({
  connection: moodConnection.value,
  myName: myNickname.value,
  partnerName: partnerName.value,
  getMoodLabel
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
  background: linear-gradient(180deg, #FFF9FC 0%, #F7FBFF 48%, #F7FBF6 100%);
  --mood-surface: rgba(255, 255, 255, 0.72);
  --mood-soft: rgba(126, 58, 85, 0.08);
  --mood-border: rgba(126, 58, 85, 0.12);
  --mood-ink: #2B2430;
  --mood-rose: #7E3A55;
}

/* 顶部导航 */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(255, 251, 253, 0.92);
  backdrop-filter: blur(18px);
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
  background: rgba(255, 255, 255, 0.74);
  border: 0;
  border-radius: 12px;
  padding: 18px;
  margin-bottom: 14px;
}

.mood-ritual-card {
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
  padding: 18px;
  border-radius: 12px;
  background:
    linear-gradient(180deg, rgba(255, 252, 254, 0.96) 0%, rgba(246, 239, 244, 0.9) 54%, rgba(230, 240, 233, 0.82) 100%);
  color: var(--mood-ink);
}

.mood-ritual-card.care {
  background:
    linear-gradient(180deg, rgba(255, 250, 251, 0.98) 0%, rgba(255, 242, 245, 0.88) 100%);
}

.mood-ritual-card.reply,
.mood-ritual-card.waiting {
  background:
    linear-gradient(180deg, rgba(255, 253, 249, 0.98) 0%, rgba(255, 245, 232, 0.86) 100%);
}

.mood-ritual-card.synced {
  background:
    linear-gradient(180deg, rgba(250, 251, 255, 0.98) 0%, rgba(240, 244, 255, 0.9) 100%);
}

.mood-ritual-card.syncing {
  opacity: 0.78;
}

.ritual-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}

.ritual-head h1 {
  margin: 0;
  color: var(--mood-ink);
  font-size: 24px;
  line-height: 1.16;
  font-weight: 900;
  text-wrap: balance;
}

.ritual-head p {
  max-width: 38em;
  margin: 8px 0 0;
  color: #5f535b;
  font-size: 14px;
  line-height: 1.55;
}

.ritual-primary {
  min-height: 44px;
  border: none;
  border-radius: 10px;
  padding: 0 14px;
  background: var(--mood-rose);
  color: #fff7fa;
  font: inherit;
  font-size: 13px;
  font-weight: 850;
  cursor: pointer;
  white-space: nowrap;
}

.ritual-people {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(120px, 0.72fr) minmax(0, 1fr);
  gap: 10px;
  align-items: stretch;
  margin-top: 16px;
}

.ritual-person {
  min-width: 0;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.58);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 7px;
}

.ritual-person.empty {
  background: rgba(255, 255, 255, 0.42);
}

.person-badge {
  max-width: 100%;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(126, 58, 85, 0.1);
  color: var(--mood-rose);
  font-size: 11px;
  line-height: 1;
  font-weight: 800;
}

.ritual-person .big-mood-emoji {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  font-size: 34px;
  filter: none;
}

.ritual-person strong,
.ritual-person small,
.ritual-person p {
  display: block;
  min-width: 0;
  max-width: 100%;
}

.ritual-person strong {
  color: var(--mood-ink);
  font-size: 15px;
  line-height: 1.2;
  font-weight: 850;
}

.ritual-person small {
  color: var(--mood-rose);
  font-size: 12px;
  font-weight: 800;
}

.ritual-person p {
  margin: 0;
  color: #625862;
  font-size: 12px;
  line-height: 1.42;
  overflow-wrap: anywhere;
}

.ritual-bridge {
  min-width: 0;
  border-radius: 10px;
  padding: 12px 10px;
  background: rgba(47, 23, 36, 0.86);
  color: #fff7fa;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  text-align: center;
}

.ritual-bridge strong,
.ritual-bridge span {
  display: block;
  min-width: 0;
}

.ritual-bridge strong {
  font-size: 14px;
  line-height: 1.22;
  font-weight: 900;
}

.ritual-bridge span {
  color: rgba(255, 247, 250, 0.78);
  font-size: 11px;
  line-height: 1.4;
}

.ritual-progress-block,
.ritual-response,
.ritual-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(47, 23, 36, 0.1);
}

.ritual-progress-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}

.ritual-progress-head span,
.ritual-progress-head em {
  display: block;
  color: #756872;
  font-size: 11px;
  line-height: 1.2;
  font-style: normal;
  font-weight: 800;
}

.ritual-progress-head strong {
  display: block;
  margin-top: 3px;
  color: var(--mood-ink);
  font-size: 14px;
  line-height: 1.25;
  font-weight: 900;
}

.ritual-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}

.ritual-response {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 10px;
}

.ritual-response .response-plan-main h2 {
  font-size: 17px;
}

.ritual-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.ritual-stat {
  min-width: 0;
}

.ritual-stat span,
.ritual-stat strong,
.ritual-stat small {
  display: block;
  min-width: 0;
}

.ritual-stat span {
  color: #756872;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
}

.ritual-stat strong {
  margin-top: 4px;
  color: var(--mood-ink);
  font-size: 16px;
  line-height: 1.15;
  font-weight: 900;
  overflow-wrap: anywhere;
}

.ritual-stat small {
  margin-top: 4px;
  color: #625862;
  font-size: 10px;
  line-height: 1.35;
}

.ritual-input-card {
  background: rgba(255, 255, 255, 0.8);
}

.mood-hero-card {
  position: relative;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  background:
    radial-gradient(circle at 12% 8%, rgba(255, 214, 226, 0.72), transparent 34%),
    linear-gradient(135deg, rgba(255, 251, 253, 0.96), rgba(241, 247, 255, 0.86) 58%, rgba(246, 253, 245, 0.82));
  box-shadow: none;
}

.mood-hero-card.care {
  border-color: rgba(212, 91, 122, 0.24);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(255, 240, 242, 0.8)),
    linear-gradient(135deg, rgba(212, 91, 122, 0.14), rgba(108, 99, 183, 0.08));
}

.mood-hero-card.synced {
  border-color: rgba(108, 99, 183, 0.24);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.94), rgba(241, 244, 255, 0.82)),
    linear-gradient(135deg, rgba(108, 99, 183, 0.14), rgba(245, 158, 11, 0.08));
}

.mood-hero-card.syncing {
  opacity: 0.78;
}

.hero-copy {
  min-width: 0;
}

.hero-kicker {
  display: block;
  color: #7E3A55;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 8px;
}

.mood-hero-card h1 {
  margin: 0;
  color: var(--mood-ink);
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
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.hero-metrics {
  margin-top: 18px;
  padding-top: 15px;
  border-top: 1px solid rgba(126, 58, 85, 0.12);
}

.hero-metric,
.momentum-item {
  min-width: 0;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.hero-metric strong,
.momentum-item strong {
  display: block;
  overflow: hidden;
  color: var(--mood-ink);
  font-size: 20px;
  font-weight: 800;
  line-height: 1.1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hero-metric small {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 700;
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

.mood-quest-card {
  margin-bottom: 16px;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 252, 0.9);
  box-shadow: none;
}

.mood-quest-card.care {
  border-color: rgba(190, 18, 60, 0.18);
  background: #fff6f7;
}

.mood-quest-card.reply,
.mood-quest-card.waiting {
  border-color: rgba(154, 90, 26, 0.18);
  background: #FFF3DF;
}

.mood-quest-card.synced {
  border-color: rgba(108, 99, 183, 0.18);
  background: #F1F4FF;
}

.quest-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.quest-head h2 {
  margin: 0;
  color: #2B2430;
  font-size: 19px;
  line-height: 1.22;
  font-weight: 900;
  letter-spacing: 0;
}

.quest-head strong {
  flex: 0 0 auto;
  max-width: 42%;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(126, 58, 85, 0.1);
  color: var(--mood-rose);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  line-height: 1;
  font-weight: 850;
  white-space: nowrap;
}

.mood-quest-card p {
  margin: 8px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.quest-progress {
  height: 7px;
  margin-top: 12px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(31, 42, 49, 0.08);
}

.quest-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: #6C63B7;
}

.mood-quest-card.care .quest-progress span {
  background: #D45B7A;
}

.mood-quest-card.waiting .quest-progress span,
.mood-quest-card.reply .quest-progress span {
  background: #9A5A1A;
}

.quest-steps {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.quest-step {
  min-width: 0;
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 9px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.quest-step-dot {
  display: block;
  width: 8px;
  height: 8px;
  margin-top: 4px;
  border-radius: 50%;
  background: rgba(31, 42, 49, 0.2);
}

.quest-step.done .quest-step-dot {
  background: #6C63B7;
}

.quest-step.active {
  color: var(--mood-rose);
}

.quest-step.active .quest-step-dot {
  background: #D45B7A;
}

.quest-step strong,
.quest-step small {
  display: block;
  min-width: 0;
}

.quest-step strong {
  color: #2B2430;
  font-size: 12px;
  line-height: 1.25;
  font-weight: 850;
}

.quest-step small {
  margin-top: 4px;
  color: #667085;
  font-size: 11px;
  line-height: 1.35;
}

.quest-action {
  width: 100%;
  min-height: 44px;
  margin-top: 12px;
  border: none;
  border-radius: 10px;
  background: var(--mood-rose);
  color: #FFF7FA;
  font: inherit;
  font-size: 13px;
  line-height: 1;
  font-weight: 850;
  cursor: pointer;
}

.response-plan-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  border: 0;
  border-radius: 12px;
  background: rgba(255, 255, 252, 0.9);
  box-shadow: none;
}

.response-plan-card.care {
  border-color: rgba(190, 18, 60, 0.18);
  background: #fff6f7;
}

.response-plan-card.synced {
  border-color: rgba(108, 99, 183, 0.18);
  background: #F1F4FF;
}

.response-plan-card.waiting {
  border-color: rgba(154, 90, 26, 0.18);
  background: #FFF3DF;
}

.response-plan-main {
  min-width: 0;
}

.response-plan-main h2 {
  margin: 0;
  color: #2B2430;
  font-size: 19px;
  line-height: 1.22;
  font-weight: 900;
  letter-spacing: 0;
}

.response-plan-main p {
  margin: 7px 0 0;
  color: #667085;
  font-size: 13px;
  line-height: 1.5;
}

.response-plan-action {
  align-self: start;
  min-height: 44px;
  border: none;
  border-radius: 10px;
  padding: 0 13px;
  background: var(--mood-rose);
  color: #FFF7FA;
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
  background: rgba(126, 58, 85, 0.1);
  color: #7E3A55;
  font-size: 11px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-pill.care {
  background: rgba(212, 91, 122, 0.12);
  color: #7E2147;
}

.sync-pill.synced {
  background: rgba(108, 99, 183, 0.12);
  color: #3F3A94;
}

.selected-mood-pill {
  background: rgba(245, 158, 11, 0.12);
  color: #9A5A1A;
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
  filter: drop-shadow(0 4px 12px rgba(126, 58, 85, 0.08));
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
  color: var(--text-primary);
  font: inherit;
}

.mood-item:hover {
  transform: translateY(-2px);
}

.mood-item.active {
  background: var(--mood-rose);
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
  background: var(--mood-rose);
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
  border: 1px solid rgba(126, 58, 85, 0.16);
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
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-primary);
  cursor: pointer;
  font: inherit;
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
  background: var(--mood-rose);
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
  background: rgba(108, 99, 183, 0.94);
}

.mood-toast.warning {
  background: rgba(151, 103, 26, 0.94);
}

.mood-toast.error {
  background: rgba(190, 64, 58, 0.94);
}

@media (max-width: 400px) {
  .ritual-head {
    grid-template-columns: 1fr;
  }

  .ritual-primary {
    width: 100%;
  }

  .ritual-people {
    grid-template-columns: 1fr;
  }

  .ritual-bridge {
    order: 3;
    text-align: left;
  }

  .ritual-steps,
  .ritual-stats {
    grid-template-columns: 1fr;
  }

  .quest-head {
    flex-direction: column;
  }

  .quest-head strong {
    max-width: 100%;
  }

  .quest-steps {
    grid-template-columns: 1fr;
  }

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
