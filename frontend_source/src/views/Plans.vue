<template>
  <div class="plans-page">
    <div class="bg-container"><div class="gradient-orb orb-1"></div><div class="gradient-orb orb-2"></div></div>
    <div v-if="loading" class="loading-screen">
      <svg class="loading-heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      <div class="loading-text">加载中...</div>
    </div>
    <div v-else class="app">
      <header class="header">
        <div class="header-content">
          <button class="icon-btn" @click="goBack">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span class="header-title">坚持计划</span>
          <div style="width:40px"></div>
        </div>
      </header>
      <main class="main">
        <div class="progress-card">
          <div class="progress-header">
            <div>
              <p class="progress-label">今日完成度</p>
              <p class="progress-value">{{ progress.completed }}/{{ progress.total }}</p>
            </div>
            <div class="progress-heart">
              <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
          </div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" :style="{ width: progress.percent + '%' }"/></div>
          <div class="progress-footer">
            <div class="avatar-group">
              <img :src="currentUser.avatar" class="avatar" />
              <img :src="partner.avatar" class="avatar avatar-second" />
            </div>
            <p class="progress-text">{{ progress.completed === progress.total ? '太棒了！全部完成 🎉' : '一起加油 💪' }}</p>
          </div>
        </div>
        <div class="filter-tabs">
          <button v-for="tab in filterTabs" :key="tab.id" @click="filterType = tab.id" :class="['filter-tab', { active: filterType === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="main-tabs">
          <button v-for="tab in mainTabs" :key="tab.id" @click="activeTab = tab.id" :class="['main-tab', { active: activeTab === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="tab-content">
          <div v-if="activeTab === 'plans'" class="plans-list">
            <div v-for="habit in filteredHabits" :key="habit.id || habit._id" :class="['habit-card', { complete: getHabitStatus(habit).isComplete }]">
              <div class="habit-header">
                <div class="habit-icon-wrap" :style="{ backgroundColor: habit.color + '20' }"><span class="habit-icon-text">{{ habit.icon }}</span></div>
                <div class="habit-info">
                  <div class="habit-title-row">
                    <h3 class="habit-title">{{ habit.title }}</h3>
                    <span class="participation-badge" :style="participationStyle(habit.participation)">{{ participationLabel(habit.participation) }}</span>
                    <span v-if="habit.type === 'subtasks'" class="type-badge subtasks">子任务</span>
                    <span v-if="habit.type === 'numeric'" class="type-badge numeric">数值</span>
                  </div>
                  <p class="habit-desc">{{ habit.description }}</p>
                  <div class="habit-status-row">
                    <template v-if="habit.participation === 'both'">
                      <span :class="['status-dot', getHabitStatus(habit).selfChecked ? 'done' : 'pending']"><span class="dot" :style="{ backgroundColor: getHabitStatus(habit).selfChecked ? '#10B981' : '#9CA3AF' }"/>我{{ getHabitStatus(habit).selfChecked ? '已完成' : '未完成' }}</span>
                      <span :class="['status-dot', getHabitStatus(habit).partnerChecked ? 'done' : 'pending']"><span class="dot" :style="{ backgroundColor: getHabitStatus(habit).partnerChecked ? '#10B981' : '#9CA3AF' }"/>TA{{ getHabitStatus(habit).partnerChecked ? '已完成' : '未完成' }}</span>
                      <span v-if="getHabitStatus(habit).isComplete" class="both-complete">💑 双方都完成了！</span>
                    </template>
                    <template v-else-if="habit.participation === 'self'">
                      <span :class="['status-dot', getHabitStatus(habit).selfChecked ? 'done' : 'pending']"><span class="dot" :style="{ backgroundColor: getHabitStatus(habit).selfChecked ? '#10B981' : '#9CA3AF' }"/>{{ getHabitStatus(habit).selfChecked ? '已完成' : '未完成' }}</span>
                    </template>
                    <template v-else>
                      <span :class="['status-dot', getHabitStatus(habit).partnerChecked ? 'done' : 'pending']"><span class="dot" :style="{ backgroundColor: getHabitStatus(habit).partnerChecked ? '#10B981' : '#9CA3AF' }"/>TA{{ getHabitStatus(habit).partnerChecked ? '已完成' : '未完成' }}</span>
                    </template>
                    <span v-if="getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id) > 0" class="streak">🔥 {{ getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id) }}天</span>
                  </div>
                </div>
                <div class="habit-actions">
                  <button v-if="canCheckIn(habit) && !getHabitStatus(habit).selfChecked" @click="openCheckIn(habit)" class="action-btn checkin">✓</button>
                  <div v-else-if="getHabitStatus(habit).isComplete" class="action-btn done">✓</div>
                  <div v-else-if="habit.participation === 'partner'" class="action-btn disabled" title="仅对方可打卡">👤</div>
                  <div v-else class="action-btn done">✓</div>
                  <button @click="openDetail(habit)" class="action-btn detail">›</button>
                </div>
              </div>
              <div v-if="habit.type === 'subtasks' && habit.subTasks && habit.subTasks.length" class="habit-preview">
                <div class="preview-tags">
                  <span v-for="task in habit.subTasks.slice(0, 3)" :key="task.id" class="preview-tag">{{ task.title }}</span>
                  <span v-if="habit.subTasks.length > 3" class="preview-tag more">+{{ habit.subTasks.length - 3 }}</span>
                </div>
              </div>
              <div v-if="habit.type === 'numeric' && habit.numericRecords && habit.numericRecords.length" class="habit-preview">
                <div class="numeric-preview">
                  <div class="numeric-left">
                    <span class="numeric-value" :style="{ color: habit.color }">{{ habit.numericRecords[habit.numericRecords.length - 1].value }}</span>
                    <span class="numeric-unit">{{ habit.numericConfig?.unit }}</span>
                    <span v-if="getTrend(habit)" :class="['numeric-trend', getTrend(habit).isGood ? 'good' : 'bad']">{{ getTrend(habit).direction === 'up' ? '↗' : '↘' }} {{ getTrend(habit).change }}</span>
                  </div>
                  <div class="numeric-target">🎯 目标: {{ habit.numericConfig?.targetValue }}{{ habit.numericConfig?.unit }}</div>
                </div>
              </div>
              <div v-if="habit.participation === 'both'" class="habit-progress">
                <div class="habit-progress-fill" :style="{ width: (((getHabitStatus(habit).selfChecked ? 1 : 0) + (getHabitStatus(habit).partnerChecked ? 1 : 0)) / 2 * 100) + '%', backgroundColor: getHabitStatus(habit).isComplete ? '#10B981' : habit.color }" />
              </div>
            </div>
            <div v-if="filteredHabits.length === 0" class="empty-state">
              <div class="empty-icon">📝</div>
              <div class="empty-text">暂无此类计划</div>
            </div>
            <button @click="showAddDialog = true" class="add-habit-btn">+ 添加新计划</button>
          </div>
          <div v-else-if="activeTab === 'calendar'" class="calendar-card">
            <div class="calendar-header"><h3>近30天打卡</h3><div class="calendar-legend"><span class="legend-item"><span class="legend-dot me"/>我</span><span class="legend-item"><span class="legend-dot partner"/>TA</span></div></div>
            <div class="calendar-grid">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="calendar-weekday">{{ d }}</div>
              <div v-for="(date, i) in calendarDays" :key="i" :class="['calendar-day', { today: formatDateIso(date) === today }]">
                <span :class="['day-number', { today: formatDateIso(date) === today }]">{{ date.getDate() }}</span>
                <div class="day-dots">
                  <span v-if="getDayCheckIns(date, currentUser.id) > 0" class="day-dot me"/>
                  <span v-if="getDayCheckIns(date, partner.id) > 0" class="day-dot partner"/>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="achievements">
            <div class="achievement-summary">
              <div><p class="summary-label">已解锁成就</p><p class="summary-value">{{ unlockedCount }}/{{ achievements.length }}</p></div>
              <span class="trophy-icon">🏆</span>
            </div>
            <div class="achievement-grid">
              <div v-for="ach in achievements" :key="ach.id" :class="['achievement-card', { unlocked: !!ach.unlockedAt }]">
                <div :class="['achievement-icon', { unlocked: !!ach.unlockedAt }]"><span v-if="ach.unlockedAt">{{ ach.icon }}</span><span v-else>🔒</span></div>
                <h4 :class="['achievement-title', { unlocked: !!ach.unlockedAt }]">{{ ach.title }}</h4>
                <p class="achievement-desc">{{ ach.description }}</p>
                <p v-if="ach.unlockedAt" class="achievement-date">⭐ {{ new Date(ach.unlockedAt).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <teleport to="body">
        <div v-if="showCheckInDialog" class="modal-overlay" @click.self="showCheckInDialog = false">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3><span class="modal-icon">{{ selectedHabit?.icon }}</span> 打卡 - {{ selectedHabit?.title }}</h3>
              <button class="close-btn" @click="showCheckInDialog = false">×</button>
            </div>
            <div class="modal-body">
              <div v-if="selectedHabit?.type === 'subtasks' && selectedHabit.subTasks" class="form-group">
                <label class="form-label">完成的任务</label>
                <div class="subtask-checklist">
                  <label v-for="task in selectedHabit.subTasks" :key="task.id" class="subtask-check-item">
                    <input type="checkbox" :checked="completedSubTasks.includes(task.id)" @change="toggleSubTask(task.id)" class="subtask-checkbox" />
                    <span class="subtask-check-text">{{ task.title }}</span>
                  </label>
                </div>
                <p class="form-hint">已完成 {{ completedSubTasks.length }}/{{ selectedHabit.subTasks.length }} 项</p>
              </div>
              <div v-if="selectedHabit?.type === 'numeric'" class="form-group">
                <label class="form-label">记录数值 ({{ selectedHabit.numericConfig?.unit }})</label>
                <div class="numeric-input-wrap">
                  <input type="number" step="0.1" v-model="numericValue" :placeholder="'输入' + selectedHabit.numericConfig?.unit" class="form-input numeric-large" />
                  <span class="numeric-unit-label">{{ selectedHabit.numericConfig?.unit }}</span>
                </div>
                <p class="form-hint">目标: {{ selectedHabit.numericConfig?.targetValue }}{{ selectedHabit.numericConfig?.unit }}</p>
              </div>
              <div class="form-group">
                <label class="form-label">今天的心情</label>
                <div class="mood-selector">
                  <button v-for="mood in MOODS" :key="mood.value" @click="selectedMood = mood.value" :class="['mood-btn', { active: selectedMood === mood.value }]"><span>{{ mood.emoji }}</span><span>{{ mood.label }}</span></button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">打卡笔记（可选）</label>
                <textarea v-model="checkInNote" placeholder="记录下今天的心情..." class="form-textarea" rows="3" />
              </div>
              <button @click="handleCheckIn" class="btn-primary w-full" :style="{ backgroundColor: selectedHabit?.color || '#EC4899' }" :disabled="selectedHabit?.type === 'numeric' && !numericValue">确认打卡</button>
            </div>
          </div>
        </div>
      </teleport>
      <teleport to="body">
        <div v-if="showDetailDialog" class="modal-overlay" @click.self="showDetailDialog = false">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3><span class="modal-icon">{{ selectedHabit?.icon }}</span> {{ selectedHabit?.title }}</h3>
              <button class="close-btn" @click="showDetailDialog = false">×</button>
            </div>
            <div class="modal-body">
              <template v-if="selectedHabit?.type === 'numeric' && selectedHabit.numericRecords && selectedHabit.numericRecords.length">
                <div class="stats-grid">
                  <div class="stat-box"><p class="stat-label">最新</p><p class="stat-value" :style="{ color: selectedHabit.color }">{{ selectedHabit.numericRecords[selectedHabit.numericRecords.length - 1].value }}</p><p class="stat-unit">{{ selectedHabit.numericConfig?.unit }}</p></div>
                  <div class="stat-box"><p class="stat-label">最高</p><p class="stat-value">{{ Math.max(...selectedHabit.numericRecords.map(r => r.value)) }}</p><p class="stat-unit">{{ selectedHabit.numericConfig?.unit }}</p></div>
                  <div class="stat-box"><p class="stat-label">最低</p><p class="stat-value">{{ Math.min(...selectedHabit.numericRecords.map(r => r.value)) }}</p><p class="stat-unit">{{ selectedHabit.numericConfig?.unit }}</p></div>
                </div>
                <div class="form-group">
                  <label class="form-label">趋势图</label>
                  <div class="trend-chart">
                    <svg class="trend-svg" viewBox="0 0 300 150" preserveAspectRatio="none">
                      <line x1="30" y1="10" x2="290" y2="10" stroke="#eee" stroke-width="1"/>
                      <line x1="30" y1="50" x2="290" y2="50" stroke="#eee" stroke-width="1"/>
                      <line x1="30" y1="90" x2="290" y2="90" stroke="#eee" stroke-width="1"/>
                      <line x1="30" y1="130" x2="290" y2="130" stroke="#eee" stroke-width="1"/>
                      <line v-if="selectedHabit.numericConfig?.targetValue && chartData.length" :x1="30" :y1="getChartY(selectedHabit.numericConfig.targetValue)" :x2="290" :y2="getChartY(selectedHabit.numericConfig.targetValue)" stroke="#10B981" stroke-width="1" stroke-dasharray="4,4" />
                      <polyline v-if="chartData.length > 1" fill="none" :stroke="selectedHabit.color" stroke-width="2" :points="chartPoints" />
                      <circle v-for="(point, i) in chartData" :key="i" :cx="30 + (chartData.length > 1 ? i / (chartData.length - 1) : 0) * 260" :cy="getChartY(point.value)" r="3" :fill="selectedHabit.color" />
                    </svg>
                    <div class="trend-labels">
                      <span v-for="(point, i) in chartData" :key="i" class="trend-x-label">{{ point.date }}</span>
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">历史记录</label>
                  <div class="history-list">
                    <div v-for="(record, i) in [...selectedHabit.numericRecords].reverse()" :key="i" class="history-item">
                      <span class="history-date">{{ new Date(record.date).toLocaleDateString() }}</span>
                      <span class="history-value" :style="{ color: selectedHabit.color }">{{ record.value }} {{ selectedHabit.numericConfig?.unit }}</span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-if="selectedHabit?.type === 'subtasks' && selectedHabit.subTasks">
                <div class="form-group">
                  <label class="form-label">任务清单</label>
                  <div class="task-list">
                    <div v-for="(task, i) in selectedHabit.subTasks" :key="task.id" class="task-item"><span class="task-number">{{ i + 1 }}</span><span class="task-title">{{ task.title }}</span></div>
                  </div>
                </div>
                <div class="tip-box">💡 完成所有子任务后打卡，可以获得更高的完成度哦！</div>
              </template>
            </div>
          </div>
        </div>
      </teleport>
      <teleport to="body">
        <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
          <div class="modal-dialog">
            <div class="modal-header"><h3>添加新计划</h3><button class="close-btn" @click="showAddDialog = false">×</button></div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">参与方式 *</label>
                <div class="participation-options">
                  <button v-for="opt in PARTICIPATION_OPTIONS" :key="opt.value" @click="newHabitParticipation = opt.value" :class="['participation-option', { active: newHabitParticipation === opt.value }]">
                    <span class="participation-icon">{{ opt.icon }}</span>
                    <div><p class="participation-name">{{ opt.label }}</p><p class="participation-desc">{{ opt.desc }}</p></div>
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">计划类型</label>
                <div class="type-options">
                  <button v-for="t in habitTypes" :key="t.value" @click="newHabitType = t.value" :class="['type-option', { active: newHabitType === t.value }]">
                    <p class="type-name">{{ t.label }}</p><p class="type-desc">{{ t.desc }}</p>
                  </button>
                </div>
              </div>
              <div class="form-group"><label class="form-label">计划名称</label><input v-model="newHabitTitle" placeholder="例如：每日健身" class="form-input" /></div>
              <div class="form-group"><label class="form-label">描述</label><input v-model="newHabitDesc" placeholder="添加一些说明..." class="form-input" /></div>
              <div v-if="newHabitType === 'subtasks'" class="form-group">
                <label class="form-label">子任务</label>
                <div class="subtask-inputs">
                  <div v-for="(task, i) in newSubTasks" :key="i" class="subtask-input-row">
                    <input v-model="newSubTasks[i]" :placeholder="'任务 ' + (i + 1)" class="form-input" />
                    <button v-if="newSubTasks.length > 1" @click="newSubTasks.splice(i, 1)" class="btn-icon">−</button>
                  </div>
                  <button @click="newSubTasks.push('')" class="btn-text">+ 添加任务</button>
                </div>
              </div>
              <div v-if="newHabitType === 'numeric'" class="form-group">
                <label class="form-label">单位</label><input v-model="newNumericUnit" placeholder="例如：kg、km、分钟" class="form-input" />
                <label class="form-label" style="margin-top:12px">目标值</label><input v-model="newNumericTarget" type="number" placeholder="目标数值" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">选择图标</label>
                <div class="icon-grid">
                  <button v-for="icon in HABIT_ICONS" :key="icon" @click="newHabitIcon = icon" :class="['icon-btn-select', { active: newHabitIcon === icon }]">{{ icon }}</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">选择颜色</label>
                <div class="color-row">
                  <button v-for="color in COLORS" :key="color" @click="newHabitColor = color" :class="['color-btn-select', { active: newHabitColor === color }]" :style="{ backgroundColor: color }" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">目标天数</label>
                <div class="target-days">
                  <button v-for="days in [7, 14, 21, 30, 60, 90, 100]" :key="days" @click="newHabitTarget = days" :class="['day-btn', { active: newHabitTarget === days }]">{{ days }}天</button>
                </div>
              </div>
              <button @click="handleAddHabit" class="btn-primary w-full" :disabled="!newHabitTitle.trim() || (newHabitType === 'numeric' && !newNumericUnit)">添加计划</button>
            </div>
          </div>
        </div>
      </teleport>
      <div class="toast" :class="{ show: toast.show, [toast.type]: true }"><span>{{ toast.message }}</span></div>
    </div>
    <BottomNav />
  </div>
</template>
<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

const MOODS = [
  { value: 'happy', label: '开心', emoji: '😊', color: '#FCD34D' },
  { value: 'love', label: '甜蜜', emoji: '🥰', color: '#F472B6' },
  { value: 'excited', label: '兴奋', emoji: '🤩', color: '#FB923C' },
  { value: 'peaceful', label: '平静', emoji: '😌', color: '#6EE7B7' },
  { value: 'tired', label: '疲惫', emoji: '😴', color: '#9CA3AF' },
]

const HABIT_ICONS = ['💧', '🏃', '📖', '😴', '🌅', '🥗', '🧘', '💊', '🎸', '✍️', '💑', '💌', '📞', '🎮', '🍳', '🧹', '☀️', '🌙', '❤️', '💪', '🏋️', '📚', '🎯', '⚖️']
const COLORS = ['#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#F97316']

const PARTICIPATION_OPTIONS = [
  { value: 'both', label: '两人一起', desc: '需要两人都完成', icon: '💑' },
  { value: 'self', label: '仅自己', desc: '只有你能打卡', icon: '👤' },
  { value: 'partner', label: '仅对方', desc: '只有TA能打卡', icon: '👤' },
]

const habitTypes = [
  { value: 'simple', label: '简单打卡', desc: '每日一键打卡' },
  { value: 'subtasks', label: '子任务', desc: '含多个小任务' },
  { value: 'numeric', label: '数值记录', desc: '记录数据趋势' },
]

export default {
  name: 'Plans',
  components: { BottomNav },
  setup() {
    const router = useRouter()
    const loading = ref(true)
    const habits = ref([])
    const checkIns = ref([])
    const currentUser = ref({ id: '', name: '我', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf' })
    const partner = ref({ id: '', name: 'TA', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede' })

    const activeTab = ref('plans')
    const filterType = ref('all')
    const showCheckInDialog = ref(false)
    const showAddDialog = ref(false)
    const showDetailDialog = ref(false)
    const selectedHabit = ref(null)
    const selectedMood = ref('happy')
    const checkInNote = ref('')
    const numericValue = ref('')
    const completedSubTasks = ref([])

    const newHabitTitle = ref('')
    const newHabitDesc = ref('')
    const newHabitIcon = ref(HABIT_ICONS[0])
    const newHabitColor = ref(COLORS[0])
    const newHabitType = ref('simple')
    const newHabitParticipation = ref('both')
    const newHabitTarget = ref(21)
    const newSubTasks = ref(['', ''])
    const newNumericUnit = ref('')
    const newNumericTarget = ref('')

    const toast = ref({ show: false, message: '', type: 'info' })
    const today = new Date().toISOString().split('T')[0]

    const achievements = ref([
      { id: '1', title: '初次打卡', description: '完成第一次打卡', icon: '🌟', unlockedAt: null },
      { id: '2', title: '坚持一周', description: '连续打卡7天', icon: '🔥', unlockedAt: null },
      { id: '3', title: '默契搭档', description: '双方共同完成10次', icon: '💑', unlockedAt: null },
      { id: '4', title: '监督达人', description: '为对方设置3个计划', icon: '👀', unlockedAt: null },
    ])

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      setTimeout(() => toast.value.show = false, 2500)
    }

    const getToken = () => localStorage.getItem('token')

    const fetchUserInfo = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/me', { headers: { Authorization: 'Bearer ' + getToken() } })
        const data = await res.json()
        if (data.success) {
          currentUser.value.id = data.data._id || data.data.id
          currentUser.value.name = data.data.nickname
          if (data.data.avatar) currentUser.value.avatar = data.data.avatar
          if (data.data.partnerId) partner.value.id = data.data.partnerId
        }
      } catch (e) { console.error(e) }
    }

    const fetchHabits = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/habits', { headers: { Authorization: 'Bearer ' + getToken() } })
        const data = await res.json()
        if (data.success) habits.value = data.data.map(h => ({ ...h, id: h._id || h.id }))
      } catch (e) { console.error(e) }
    }

    const fetchCheckIns = async () => {
      try {
        const all = []
        for (const h of habits.value) {
          const res = await fetch(`${CONFIG.API_URL}/habits/${h.id}/checkins`, { headers: { Authorization: 'Bearer ' + getToken() } })
          const data = await res.json()
          if (data.success) all.push(...data.data.map(c => ({ ...c, habitId: h.id })))
        }
        checkIns.value = all
      } catch (e) { console.error(e) }
    }

    const fetchAchievements = () => {
      const myCheckIns = checkIns.value.filter(c => c.userId === currentUser.value.id)
      const bothHabits = habits.value.filter(h => h.participation === 'both')
      let bothCount = 0
      bothHabits.forEach(h => {
        const myDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === currentUser.value.id).map(c => c.date))
        const partnerDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === partner.value.id).map(c => c.date))
        myDates.forEach(d => { if (partnerDates.has(d)) bothCount++ })
      })
      const partnerHabits = habits.value.filter(h => h.participation === 'partner')
      achievements.value[0].unlockedAt = myCheckIns.length > 0 ? today : null
      achievements.value[1].unlockedAt = getMaxStreak(currentUser.value.id) >= 7 ? today : null
      achievements.value[2].unlockedAt = bothCount >= 10 ? today : null
      achievements.value[3].unlockedAt = partnerHabits.length >= 3 ? today : null
    }

    const getMaxStreak = (userId) => {
      let max = 0
      habits.value.forEach(h => { const s = getStreak(h.id, userId); if (s > max) max = s })
      return max
    }

    const unlockedCount = computed(() => achievements.value.filter(a => a.unlockedAt).length)

    const hasCheckedInToday = (habitId, userId) => checkIns.value.some(ci => ci.habitId === habitId && ci.userId === userId && ci.date === today)

    const getStreak = (habitId, userId) => {
      const dates = [...new Set(checkIns.value.filter(ci => ci.habitId === habitId && ci.userId === userId).map(ci => ci.date))].sort((a, b) => b.localeCompare(a))
      if (dates.length === 0) return 0
      let streak = 0
      const checkDate = new Date()
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        if (dates.includes(dateStr)) streak++
        else if (i > 0) break
        checkDate.setDate(checkDate.getDate() - 1)
      }
      return streak
    }

    const canCheckIn = (habit) => {
      if (habit.participation === 'self') return habit.createdBy === currentUser.value.id
      if (habit.participation === 'both') return true
      if (habit.participation === 'partner') return habit.createdBy !== currentUser.value.id
      return false
    }

    const getHabitStatus = (habit) => {
      const selfChecked = hasCheckedInToday(habit.id, currentUser.value.id)
      const partnerChecked = hasCheckedInToday(habit.id, partner.value.id)
      switch (habit.participation) {
        case 'both': return { canCheckIn: !selfChecked, isComplete: selfChecked && partnerChecked, selfChecked, partnerChecked, showBoth: true }
        case 'self': return { canCheckIn: !selfChecked, isComplete: selfChecked, selfChecked, partnerChecked: false, showBoth: false }
        case 'partner': return { canCheckIn: false, isComplete: partnerChecked, selfChecked: false, partnerChecked, showBoth: false }
      }
      return { canCheckIn: false, isComplete: false, selfChecked: false, partnerChecked: false, showBoth: false }
    }

    const progress = computed(() => {
      let total = 0, completed = 0
      habits.value.forEach(habit => {
        const status = getHabitStatus(habit)
        if (habit.participation === 'both') { total += 2; completed += (status.selfChecked ? 1 : 0) + (status.partnerChecked ? 1 : 0) }
        else if (habit.participation === 'self') { total += 1; completed += status.selfChecked ? 1 : 0 }
        else if (habit.participation === 'partner') { total += 1; completed += status.partnerChecked ? 1 : 0 }
      })
      return { completed, total, percent: total > 0 ? (completed / total) * 100 : 0 }
    })

    const filteredHabits = computed(() => filterType.value === 'all' ? habits.value : habits.value.filter(h => h.participation === filterType.value))
    const filterTabs = [{ id: 'all', label: '全部' }, { id: 'both', label: '两人一起' }, { id: 'self', label: '仅自己' }, { id: 'partner', label: '仅对方' }]
    const mainTabs = [{ id: 'plans', label: '今日打卡' }, { id: 'calendar', label: '打卡日历' }, { id: 'achievements', label: '成就徽章' }]

    const participationLabel = (p) => ({ both: '两人一起', self: '仅自己', partner: '仅对方' }[p] || '')
    const participationStyle = (p) => {
      if (p === 'both') return { backgroundColor: '#FCE7F3', color: '#EC4899' }
      if (p === 'self') return { backgroundColor: '#DBEAFE', color: '#3B82F6' }
      return { backgroundColor: '#F3E8FF', color: '#8B5CF6' }
    }

    const getTrend = (habit) => {
      const targetUserId = habit.participation === 'partner' ? partner.value.id : currentUser.value.id
      const records = habit.numericRecords?.filter(r => r.userId === targetUserId) || []
      if (records.length < 2) return null
      const recent = records.slice(-7)
      const first = recent[0].value
      const last = recent[recent.length - 1].value
      const change = last - first
      const isGood = habit.numericConfig?.lowerIsBetter ? change < 0 : change > 0
      return { change: Math.abs(change).toFixed(1), percent: Math.abs(first !== 0 ? (change / first) * 100 : 0).toFixed(1), isGood, direction: change > 0 ? 'up' : 'down' }
    }

    const calendarDays = computed(() => {
      const days = []
      const t = new Date()
      for (let i = 29; i >= 0; i--) { const d = new Date(t); d.setDate(d.getDate() - i); days.push(d) }
      return days
    })

    const formatDateIso = (date) => date.toISOString().split('T')[0]
    const getDayCheckIns = (date, userId) => checkIns.value.filter(ci => ci.date === formatDateIso(date) && ci.userId === userId).length

    const openCheckIn = (habit) => {
      selectedHabit.value = habit
      completedSubTasks.value = habit.subTasks?.map(s => s.id) || []
      numericValue.value = ''
      selectedMood.value = 'happy'
      checkInNote.value = ''
      showCheckInDialog.value = true
    }

    const openDetail = (habit) => { selectedHabit.value = habit; showDetailDialog.value = true }

    const toggleSubTask = (taskId) => {
      if (completedSubTasks.value.includes(taskId)) completedSubTasks.value = completedSubTasks.value.filter(id => id !== taskId)
      else completedSubTasks.value.push(taskId)
    }

    const handleCheckIn = async () => {
      if (!selectedHabit.value) return
      try {
        const body = {
          date: today,
          mood: selectedMood.value,
          note: checkInNote.value,
          completedSubTasks: selectedHabit.value.type === 'subtasks' ? completedSubTasks.value : undefined,
          numericValue: selectedHabit.value.type === 'numeric' ? parseFloat(numericValue.value) : undefined,
        }
        const res = await fetch(`${CONFIG.API_URL}/habits/${selectedHabit.value.id}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.success) {
          checkIns.value.push({ ...data.data, habitId: selectedHabit.value.id })
          if (selectedHabit.value.type === 'numeric' && numericValue.value) {
            const h = habits.value.find(h => h.id === selectedHabit.value.id)
            if (h) { h.numericRecords = h.numericRecords || []; h.numericRecords.push({ date: today, value: parseFloat(numericValue.value), userId: currentUser.value.id, note: checkInNote.value }) }
          }
          showCheckInDialog.value = false
          if (selectedHabit.value.participation === 'both' && hasCheckedInToday(selectedHabit.value.id, partner.value.id)) showToast('🎉 双方都完成了！', 'success')
          else showToast('打卡成功！继续保持哦 💪', 'success')
          fetchAchievements()
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const handleAddHabit = async () => {
      if (!newHabitTitle.value.trim()) return
      try {
        const body = {
          title: newHabitTitle.value,
          description: newHabitDesc.value,
          icon: newHabitIcon.value,
          color: newHabitColor.value,
          type: newHabitType.value,
          participation: newHabitParticipation.value,
          targetDays: newHabitTarget.value,
          subTasks: newHabitType.value === 'subtasks' ? newSubTasks.value.filter(s => s.trim()).map((s, i) => ({ id: 'st-' + Date.now() + '-' + i, title: s, completed: false })) : undefined,
          numericConfig: newHabitType.value === 'numeric' && newNumericUnit.value ? { unit: newNumericUnit.value, targetValue: parseFloat(newNumericTarget.value) || 0, lowerIsBetter: false } : undefined,
        }
        const res = await fetch(CONFIG.API_URL + '/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.success) {
          habits.value.unshift({ ...data.data, id: data.data._id || data.data.id })
          showAddDialog.value = false
          resetNewHabitForm()
          showToast('计划添加成功！', 'success')
          fetchAchievements()
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const resetNewHabitForm = () => {
      newHabitTitle.value = ''; newHabitDesc.value = ''; newHabitIcon.value = HABIT_ICONS[0]; newHabitColor.value = COLORS[0]
      newHabitType.value = 'simple'; newHabitParticipation.value = 'both'; newHabitTarget.value = 21
      newSubTasks.value = ['', '']; newNumericUnit.value = ''; newNumericTarget.value = ''
    }

    const chartData = computed(() => {
      if (!selectedHabit.value?.numericRecords) return []
      const targetUserId = selectedHabit.value.participation === 'partner' ? partner.value.id : currentUser.value.id
      return selectedHabit.value.numericRecords.filter(r => r.userId === targetUserId).slice(-14).map(r => ({ date: new Date(r.date).getDate() + '日', value: r.value }))
    })

    const chartPoints = computed(() => {
      if (chartData.value.length < 2) return ''
      const min = Math.min(...chartData.value.map(d => d.value))
      const max = Math.max(...chartData.value.map(d => d.value))
      const range = max - min || 1
      return chartData.value.map((d, i) => {
        const x = 30 + (i / (chartData.value.length - 1)) * 260
        const y = 130 - ((d.value - min) / range) * 120
        return `${x},${y}`
      }).join(' ')
    })

    const getChartY = (value) => {
      if (chartData.value.length === 0) return 75
      const min = Math.min(...chartData.value.map(d => d.value))
      const max = Math.max(...chartData.value.map(d => d.value))
      const range = max - min || 1
      return 130 - ((value - min) / range) * 120
    }

    const goBack = () => router.push('/home')

    onMounted(async () => {
      const token = getToken()
      if (token) { try { currentUser.value.id = JSON.parse(atob(token.split('.')[1])).userId } catch (e) {} }
      await fetchUserInfo()
      await fetchHabits()
      await fetchCheckIns()
      fetchAchievements()
      loading.value = false
    })

    return {
      loading, habits, currentUser, partner, activeTab, filterType,
      showCheckInDialog, showAddDialog, showDetailDialog, selectedHabit,
      selectedMood, checkInNote, numericValue, completedSubTasks,
      newHabitTitle, newHabitDesc, newHabitIcon, newHabitColor, newHabitType,
      newHabitParticipation, newHabitTarget, newSubTasks, newNumericUnit, newNumericTarget,
      toast, today, achievements, unlockedCount, progress, filteredHabits,
      filterTabs, mainTabs, calendarDays, chartData, chartPoints,
      MOODS, HABIT_ICONS, COLORS, PARTICIPATION_OPTIONS, habitTypes,
      participationLabel, participationStyle, getHabitStatus, getStreak, canCheckIn,
      getTrend, formatDateIso, getDayCheckIns, openCheckIn, openDetail, toggleSubTask,
      handleCheckIn, handleAddHabit, getChartY, goBack,
    }
  }
}
</script>
<style scoped>
.plans-page { min-height: 100vh; position: relative; }
.app { position: relative; z-index: 1; min-height: 100vh; padding-bottom: 100px; }
.header { position: sticky; top: 0; z-index: 100; padding: env(safe-area-inset-top, 0px) 16px 12px; background: rgba(253, 253, 245, 0.95); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); }
.header-content { display: flex; justify-content: space-between; align-items: center; max-width: 480px; margin: 0 auto; }
.header-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.icon-btn { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; color: var(--text-secondary); }
.icon-btn:hover { background: var(--bg-card-hover); border-color: var(--border-focus); color: var(--text-primary); }
.main { max-width: 480px; margin: 0 auto; padding: 16px; }

.progress-card { margin: 0 0 16px; padding: 20px; background: linear-gradient(135deg, #f472b6 0%, #db2777 100%); border-radius: 24px; color: white; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.progress-label { opacity: 0.9; font-size: 13px; }
.progress-value { font-size: 32px; font-weight: 800; margin-top: 4px; }
.progress-heart { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.heart-icon { width: 28px; height: 28px; animation: pulse 1.5s ease-in-out infinite; }
.progress-bar-bg { height: 8px; background: rgba(255,255,255,0.25); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: white; border-radius: 4px; transition: width 0.5s ease; }
.progress-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.avatar-group { display: flex; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; object-fit: cover; }
.avatar-second { margin-left: -10px; }
.progress-text { font-size: 13px; opacity: 0.95; }

.filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; }
.filter-tab { flex-shrink: 0; padding: 8px 14px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.filter-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }

.main-tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
.main-tab { flex-shrink: 0; padding: 10px 18px; border-radius: 24px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.main-tab.active { background: var(--color-primary); color: white; border-color: var(--color-primary); box-shadow: 0 4px 14px rgba(233,30,99,0.25); }

.tab-content { padding-bottom: 20px; }

.habit-card { background: var(--bg-card); border-radius: 20px; padding: 16px; margin-bottom: 12px; border: 2px solid transparent; transition: all 0.2s; }
.habit-card.complete { border-color: #86efac; background: rgba(134, 239, 172, 0.08); }
.habit-header { display: flex; align-items: flex-start; gap: 14px; }
.habit-icon-wrap { width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.habit-icon-text { font-size: 24px; }
.habit-info { flex: 1; min-width: 0; }
.habit-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.habit-title { font-size: 15px; font-weight: 600; color: var(--text-primary); }
.participation-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.type-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500; }
.type-badge.subtasks { background: #f3e8ff; color: #9333ea; }
.type-badge.numeric { background: #dbeafe; color: #2563eb; }
.habit-desc { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
.habit-status-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; flex-wrap: wrap; }
.status-dot { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #9ca3af; }
.status-dot.done { color: #10b981; }
.dot { width: 6px; height: 6px; border-radius: 50%; }
.both-complete { font-size: 12px; color: #ec4899; }
.streak { display: flex; align-items: center; gap: 2px; font-size: 12px; color: #f97316; }
.habit-actions { display: flex; flex-direction: column; gap: 8px; }
.action-btn { width: 36px; height: 36px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; transition: all 0.2s; }
.action-btn.checkin { background: #f3f4f6; color: #9ca3af; }
.action-btn.checkin:hover { background: #ec4899; color: white; }
.action-btn.done { background: #10b981; color: white; }
.action-btn.disabled { background: #f3f4f6; color: #d1d5db; cursor: not-allowed; }
.action-btn.detail { background: #f3f4f6; color: #6b7280; }

.habit-preview { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.05); }
.preview-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.preview-tag { padding: 4px 10px; background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #4b5563; }
.preview-tag.more { color: #9ca3af; }
.numeric-preview { display: flex; justify-content: space-between; align-items: center; }
.numeric-left { display: flex; align-items: baseline; gap: 6px; }
.numeric-value { font-size: 22px; font-weight: 700; }
.numeric-unit { font-size: 13px; color: #6b7280; }
.numeric-trend { font-size: 12px; font-weight: 500; }
.numeric-trend.good { color: #10b981; }
.numeric-trend.bad { color: #ef4444; }
.numeric-target { font-size: 12px; color: #9ca3af; }
.habit-progress { margin-top: 12px; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.habit-progress-fill { height: 100%; border-radius: 3px; transition: all 0.3s; }

.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 14px; color: var(--text-secondary); }
.add-habit-btn { width: 100%; padding: 16px; border: 2px dashed var(--border-color); border-radius: 16px; background: transparent; color: var(--text-secondary); font-size: 15px; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 8px; }
.add-habit-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

.calendar-card { background: var(--bg-card); border-radius: 20px; padding: 16px; }
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.calendar-header h3 { font-size: 15px; font-weight: 600; }
.calendar-legend { display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary); }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.me { background: #ec4899; }
.legend-dot.partner { background: #8b5cf6; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-weekday { text-align: center; font-size: 12px; color: #9ca3af; padding: 8px 0; }
.calendar-day { aspect-ratio: 1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.calendar-day.today { background: #fce7f3; }
.day-number { font-size: 12px; color: #4b5563; }
.day-number.today { color: #db2777; font-weight: 600; }
.day-dots { display: flex; gap: 2px; }
.day-dot { width: 5px; height: 5px; border-radius: 50%; }
.day-dot.me { background: #ec4899; }
.day-dot.partner { background: #8b5cf6; }

.achievement-summary { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 20px; padding: 16px 20px; margin-bottom: 16px; border: 1px solid #fcd34d; }
.summary-label { font-size: 13px; color: #92400e; }
.summary-value { font-size: 24px; font-weight: 700; color: #78350f; margin-top: 2px; }
.trophy-icon { font-size: 36px; }
.achievement-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.achievement-card { border-radius: 20px; padding: 16px; border: 2px solid transparent; transition: all 0.2s; background: #f3f4f6; border-color: #e5e7eb; opacity: 0.7; }
.achievement-card.unlocked { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-color: #fcd34d; opacity: 1; }
.achievement-icon { width: 44px; height: 44px; border-radius: 14px; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 20px; margin-bottom: 10px; }
.achievement-icon.unlocked { background: #fbbf24; }
.achievement-title { font-size: 14px; font-weight: 600; color: #6b7280; }
.achievement-title.unlocked { color: #78350f; }
.achievement-desc { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.achievement-card.unlocked .achievement-desc { color: #92400e; }
.achievement-date { font-size: 11px; color: #d97706; margin-top: 8px; display: flex; align-items: center; gap: 2px; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: flex-end; justify-content: center; }
.modal-dialog { width: 100%; max-width: 480px; max-height: 85vh; background: var(--bg-card); border-radius: 24px 24px 0 0; overflow: hidden; display: flex; flex-direction: column; animation: slideUp 0.25s ease; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); }
.modal-header h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.modal-icon { font-size: 22px; }
.close-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: #f3f4f6; color: #6b7280; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 16px 20px 24px; overflow-y: auto; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; transition: all 0.2s; }
.form-input:focus { border-color: var(--border-focus); background: white; }
.form-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; resize: none; transition: all 0.2s; font-family: inherit; }
.form-textarea:focus { border-color: var(--border-focus); background: white; }
.form-hint { font-size: 12px; color: #9ca3af; margin-top: 6px; }

.subtask-checklist { display: flex; flex-direction: column; gap: 8px; }
.subtask-check-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f9fafb; border-radius: 12px; cursor: pointer; }
.subtask-checkbox { width: 20px; height: 20px; accent-color: #ec4899; }
.subtask-check-text { font-size: 14px; }

.numeric-input-wrap { display: flex; align-items: center; gap: 8px; }
.numeric-large { font-size: 22px; font-weight: 700; text-align: center; flex: 1; }
.numeric-unit-label { font-size: 16px; color: #6b7280; }

.mood-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.mood-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid transparent; background: #f3f4f6; font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; }
.mood-btn.active { background: #fce7f3; border-color: #f472b6; }

.participation-options { display: flex; flex-direction: column; gap: 8px; }
.participation-option { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 14px; border: 2px solid #e5e7eb; background: white; text-align: left; cursor: pointer; transition: all 0.2s; }
.participation-option.active { border-color: #f472b6; background: #fdf2f8; }
.participation-icon { font-size: 22px; }
.participation-name { font-size: 14px; font-weight: 500; }
.participation-desc { font-size: 12px; color: #9ca3af; margin-top: 1px; }

.type-options { display: flex; gap: 8px; }
.type-option { flex: 1; padding: 12px; border-radius: 14px; border: 2px solid #e5e7eb; background: white; text-align: left; cursor: pointer; transition: all 0.2s; }
.type-option.active { border-color: #f472b6; background: #fdf2f8; }
.type-name { font-size: 14px; font-weight: 500; }
.type-desc { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.subtask-inputs { display: flex; flex-direction: column; gap: 8px; }
.subtask-input-row { display: flex; gap: 8px; align-items: center; }
.btn-icon { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f3f4f6; color: #6b7280; font-size: 18px; cursor: pointer; }
.btn-text { display: flex; align-items: center; gap: 4px; padding: 8px 0; background: transparent; border: none; color: #ec4899; font-size: 13px; cursor: pointer; }

.icon-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.icon-btn-select { aspect-ratio: 1; border-radius: 12px; border: 1px solid transparent; background: #f3f4f6; font-size: 20px; cursor: pointer; transition: all 0.2s; }
.icon-btn-select.active { background: #fce7f3; border-color: #f472b6; }

.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
.color-btn-select { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; }
.color-btn-select.active { box-shadow: 0 0 0 2px white, 0 0 0 4px #374151; transform: scale(1.1); }

.target-days { display: flex; gap: 8px; flex-wrap: wrap; }
.day-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #f3f4f6; color: #4b5563; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.day-btn.active { background: #ec4899; color: white; border-color: #ec4899; }

.btn-primary { padding: 14px; border-radius: 14px; border: none; color: white; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.w-full { width: 100%; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.stat-box { background: #f9fafb; border-radius: 14px; padding: 14px; text-align: center; }
.stat-label { font-size: 11px; color: #9ca3af; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
.stat-unit { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.trend-chart { background: #f9fafb; border-radius: 14px; padding: 10px; }
.trend-svg { width: 100%; height: 150px; }
.trend-labels { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 4px; }
.trend-x-label { font-size: 10px; color: #9ca3af; }

.history-list { display: flex; flex-direction: column; gap: 8px; max-height: 160px; overflow-y: auto; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 12px; }
.history-date { font-size: 13px; color: #6b7280; }
.history-value { font-size: 14px; font-weight: 600; }

.task-list { display: flex; flex-direction: column; gap: 8px; }
.task-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f9fafb; border-radius: 12px; }
.task-number { width: 24px; height: 24px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.task-title { font-size: 14px; }
.tip-box { padding: 14px; background: #fdf2f8; border-radius: 12px; color: #db2777; font-size: 13px; margin-top: 8px; }

.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px); padding: 12px 20px; background: rgba(0,0,0,0.8); color: white; border-radius: 24px; font-size: 14px; opacity: 0; pointer-events: none; transition: all 0.3s; z-index: 300; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }

@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
</style>