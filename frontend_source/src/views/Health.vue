<template>
  <div class="health-page">
    <!-- 头部 -->
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="page-title">健康档案</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-item" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
        <span class="tab-avatar">{{ mineAvatar }}</span>
        <span class="tab-name">我</span>
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'partner' }" @click="activeTab = 'partner'">
        <span class="tab-avatar">{{ partnerAvatar }}</span>
        <span class="tab-name">TA</span>
      </div>
    </div>

    <main class="page-body" v-if="currentUser">
      <!-- 人体图 -->
      <div class="body-map-section">
        <div class="body-map-card">
          <div class="body-map-title">点击部位快速记录</div>
          <div class="body-map-wrapper">
            <!-- SVG 人体轮廓 -->
            <svg class="body-svg" viewBox="0 0 200 360" preserveAspectRatio="xMidYMid meet">
              <!-- 头部 -->
              <circle cx="100" cy="35" r="22" fill="none" stroke="#cbd5e1" stroke-width="2"/>
              <!-- 脖子 -->
              <line x1="100" y1="57" x2="100" y2="75" stroke="#cbd5e1" stroke-width="2"/>
              <!-- 躯干 -->
              <path :d="bodyPath" fill="rgba(255,107,138,0.06)" stroke="#cbd5e1" stroke-width="2"/>
              <!-- 手臂 -->
              <path d="M65 90 Q45 130 40 190" fill="none" stroke="#cbd5e1" stroke-width="2"/>
              <path d="M135 90 Q155 130 160 190" fill="none" stroke="#cbd5e1" stroke-width="2"/>
              <!-- 腿 -->
              <path d="M85 220 Q80 280 78 340" fill="none" stroke="#cbd5e1" stroke-width="2"/>
              <path d="M115 220 Q120 280 122 340" fill="none" stroke="#cbd5e1" stroke-width="2"/>

              <!-- 标记点与连线 -->
              <g v-for="(pt, key) in bodyPoints" :key="key" class="body-point-group" @click="openQuickEdit(key)">
                <line :x1="pt.x" :y1="pt.y" :x2="pt.lx" :y2="pt.ly" stroke="#FF6B8A" stroke-width="1" stroke-dasharray="3,2"/>
                <circle :cx="pt.x" :cy="pt.y" r="5" fill="#FF6B8A"/>
                <text :x="pt.tx" :y="pt.ty" font-size="11" fill="#475569" text-anchor="start" dominant-baseline="middle">{{ pt.label }} {{ formatBodyValue(key) }}</text>
              </g>
            </svg>
          </div>

          <!-- 基础信息卡片 -->
          <div class="base-stats">
            <div class="base-stat" @click="openQuickEdit('height')">
              <span class="base-label">身高</span>
              <span class="base-value">{{ displayLatest.height ? displayLatest.height + ' cm' : '-' }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('weight')">
              <span class="base-label">体重</span>
              <span class="base-value">{{ displayLatest.weight ? displayLatest.weight + ' kg' : '-' }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('bodyFat')">
              <span class="base-label">体脂</span>
              <span class="base-value">{{ displayLatest.bodyFat ? displayLatest.bodyFat + ' %' : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 月经周期（仅女性显示） -->
      <div class="menstrual-section" v-if="currentUser.gender === 'female' && activeTab === 'mine'">
        <div class="section-header">
          <span class="section-icon">🩸</span>
          <span class="section-title">月经周期</span>
        </div>
        <div class="menstrual-card">
          <div v-if="latestMenstrual" class="menstrual-info">
            <div class="menstrual-dates">
              <div class="menstrual-date">
                <span class="date-label">开始</span>
                <span class="date-value">{{ formatDate(latestMenstrual.cycleStart) }}</span>
              </div>
              <div class="menstrual-arrow">→</div>
              <div class="menstrual-date">
                <span class="date-label">结束</span>
                <span class="date-value">{{ formatDate(latestMenstrual.cycleEnd) }}</span>
              </div>
              <div class="menstrual-days">
                <span class="days-num">{{ menstrualDays }}</span>
                <span class="days-label">天</span>
              </div>
            </div>
            <div class="menstrual-note" v-if="latestMenstrual.note">{{ latestMenstrual.note }}</div>
          </div>
          <div v-else class="menstrual-empty">暂无月经记录</div>
        </div>
      </div>

      <!-- 趋势图 -->
      <div class="trends-section">
        <div class="section-header">
          <span class="section-icon">📈</span>
          <span class="section-title">趋势变化</span>
        </div>
        <div class="trend-metric-tabs">
          <div
            v-for="m in trendMetrics"
            :key="m.key"
            class="trend-metric-tab"
            :class="{ active: currentMetric === m.key }"
            @click="switchMetric(m.key)"
          >{{ m.label }}</div>
        </div>
        <div class="trend-chart-card">
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="(tick, i) in yAxisTicks" :key="'y'+i" class="y-tick">{{ tick.formatted }}</span>
            </div>
            <div class="chart-main">
              <svg v-if="trendData.length > 0" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line v-for="i in 5" :key="'grid'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <!-- 自己 -->
                <path v-if="minePath" fill="none" stroke="#FF6B8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="minePath"/>
                <!-- 伴侣 -->
                <path v-if="partnerPath && showPartnerTrend" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="partnerPath"/>
              </svg>
              <div v-if="trendData.length === 0" class="chart-empty">暂无数据</div>
              <!-- 数据点 -->
              <div v-if="minePoints.length > 0" class="chart-points">
                <div v-for="(p, i) in minePoints" :key="'mp'+i" class="chart-point mine" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
              <div v-if="partnerPoints.length > 0 && showPartnerTrend" class="chart-points">
                <div v-for="(p, i) in partnerPoints" :key="'pp'+i" class="chart-point partner" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-x-axis">
            <span v-for="(tick, i) in xAxisTicks" :key="'x'+i" class="x-tick">{{ tick }}</span>
          </div>
          <div class="trend-legend">
            <span class="legend-item"><i class="legend-dot mine"></i>我</span>
            <span class="legend-item"><i class="legend-dot partner"></i>TA</span>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section">
        <div class="section-header">
          <span class="section-icon">📋</span>
          <span class="section-title">历史记录</span>
        </div>
        <div class="history-list">
          <div v-for="item in displayHistory" :key="item._id" class="history-item" @click="openEdit(item)">
            <div class="history-date">{{ formatDate(item.recordedAt) }}</div>
            <div class="history-tags">
              <span v-if="item.weight" class="history-tag">体重 {{ item.weight }}kg</span>
              <span v-if="item.bodyFat" class="history-tag">体脂 {{ item.bodyFat }}%</span>
              <span v-if="item.measurements?.chestUpper" class="history-tag">上胸围 {{ item.measurements.chestUpper }}cm</span>
              <span v-if="item.measurements?.chestLower" class="history-tag">下胸围 {{ item.measurements.chestLower }}cm</span>
              <span v-if="item.measurements?.waist" class="history-tag">腰围 {{ item.measurements.waist }}cm</span>
              <span v-if="item.measurements?.hip" class="history-tag">臀围 {{ item.measurements.hip }}cm</span>
              <span v-if="item.menstrual?.cycleStart" class="history-tag menstrual-tag">月经</span>
            </div>
          </div>
          <div v-if="displayHistory.length === 0" class="history-empty">暂无记录</div>
        </div>
      </div>

      <div class="page-bottom-spacer"></div>
    </main>

    <!-- 悬浮按钮 -->
    <button class="fab" @click="openFullForm">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>记一笔</span>
    </button>

    <!-- 快速编辑 / 完整记录弹窗 -->
    <teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog health-modal">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="close-btn" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">记录日期</label>
              <input type="date" class="form-input" v-model="form.recordedAt">
            </div>

            <div class="form-row">
              <div class="form-group small">
                <label class="form-label">身高 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.height" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">体重 (kg)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.weight" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">体脂 (%)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.bodyFat" placeholder="-">
              </div>
            </div>

            <div class="form-section-title">围度 (cm)</div>
            <div class="form-row">
              <div class="form-group small">
                <label class="form-label">上胸围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestUpper" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">下胸围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestLower" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">腰围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.waist" placeholder="-">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group small">
                <label class="form-label">臀围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.hip" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">臂围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.arm" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">大腿围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.thigh" placeholder="-">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group small">
                <label class="form-label">小腿围</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.calf" placeholder="-">
              </div>
              <div class="form-group small">
                <label class="form-label">肩宽</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.shoulder" placeholder="-">
              </div>
              <div class="form-group small"></div>
            </div>

            <!-- 月经周期 -->
            <div class="form-section-title" v-if="currentUser?.gender === 'female' && activeTab === 'mine'">月经周期</div>
            <div class="form-row" v-if="currentUser?.gender === 'female' && activeTab === 'mine'">
              <div class="form-group small">
                <label class="form-label">开始日期</label>
                <input type="date" class="form-input" v-model="form.menstrual.cycleStart">
              </div>
              <div class="form-group small">
                <label class="form-label">结束日期</label>
                <input type="date" class="form-input" v-model="form.menstrual.cycleEnd">
              </div>
              <div class="form-group small">
                <label class="form-label">流量 (1-5)</label>
                <input type="number" min="1" max="5" class="form-input" v-model.number="form.menstrual.flowLevel" placeholder="-">
              </div>
            </div>
            <div class="form-group" v-if="currentUser?.gender === 'female' && activeTab === 'mine'">
              <label class="form-label">月经备注</label>
              <input type="text" class="form-input" v-model="form.menstrual.note" placeholder="可选">
            </div>

            <div class="form-group">
              <label class="form-label">备注</label>
              <input type="text" class="form-input" v-model="form.note" placeholder="可选">
            </div>
          </div>
          <div class="modal-footer">
            <button v-if="editingId" class="btn-danger" @click="deleteRecord">删除</button>
            <div class="footer-spacer"></div>
            <button class="btn-secondary" @click="closeModal">取消</button>
            <button class="btn-primary" @click="saveRecord" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Toast -->
    <div class="toast" :class="{ show: toast.show, [toast.type]: true }">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { CONFIG } from '../utils/config.js'

export default {
  name: 'Health',
  setup() {
    const activeTab = ref('mine')
    const mineRecords = ref([])
    const partnerRecords = ref([])
    const currentUser = ref(null)
    const partner = ref(null)
    const loading = ref(false)
    const saving = ref(false)

    const showModal = ref(false)
    const editingId = ref(null)
    const quickField = ref(null)

    const currentMetric = ref('weight')
    const trendData = ref({ mine: [], partner: [] })

    const toast = ref({ show: false, message: '', type: 'info' })

    const trendMetrics = [
      { key: 'weight', label: '体重' },
      { key: 'bodyFat', label: '体脂' },
      { key: 'chestUpper', label: '上胸围' },
      { key: 'chestLower', label: '下胸围' },
      { key: 'waist', label: '腰围' },
      { key: 'hip', label: '臀围' },
      { key: 'arm', label: '臂围' },
      { key: 'thigh', label: '大腿围' },
      { key: 'calf', label: '小腿围' },
      { key: 'shoulder', label: '肩宽' }
    ]

    const getToken = () => localStorage.getItem('token')

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      setTimeout(() => { toast.value.show = false }, 2500)
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/me', {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          currentUser.value = data.data.user
          partner.value = data.data.partner
        }
      } catch (e) {
        console.error('获取用户信息失败:', e)
      }
    }

    const fetchRecords = async () => {
      loading.value = true
      try {
        const res = await fetch(CONFIG.API_URL + '/health', {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          mineRecords.value = data.data.mine || []
          partnerRecords.value = data.data.partner || []
        }
      } catch (e) {
        console.error('获取健康档案失败:', e)
      } finally {
        loading.value = false
      }
    }

    const fetchTrends = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/health/trends?metric=${currentMetric.value}&days=30`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          trendData.value = data.data
        }
      } catch (e) {
        console.error('获取趋势失败:', e)
      }
    }

    const switchMetric = (key) => {
      currentMetric.value = key
      fetchTrends()
    }

    onMounted(async () => {
      await fetchUser()
      await fetchRecords()
      await fetchTrends()
    })

    watch(activeTab, () => {
      // 切换tab时无需重新拉数据，已按用户分组
    })

    const mineAvatar = computed(() => currentUser.value?.nickname?.[0] || '我')
    const partnerAvatar = computed(() => partner.value?.nickname?.[0] || 'TA')

    const displayRecords = computed(() => activeTab.value === 'mine' ? mineRecords.value : partnerRecords.value)
    const displayLatest = computed(() => {
      const rec = displayRecords.value[0]
      if (!rec) return {}
      return {
        height: rec.height,
        weight: rec.weight,
        bodyFat: rec.bodyFat,
        measurements: rec.measurements || {}
      }
    })

    const latestMenstrual = computed(() => {
      const list = activeTab.value === 'mine' ? mineRecords.value : partnerRecords.value
      for (const r of list) {
        if (r.menstrual && r.menstrual.cycleStart) return r.menstrual
      }
      return null
    })

    const menstrualDays = computed(() => {
      if (!latestMenstrual.value || !latestMenstrual.value.cycleEnd || !latestMenstrual.value.cycleStart) return '-'
      const s = new Date(latestMenstrual.value.cycleStart)
      const e = new Date(latestMenstrual.value.cycleEnd)
      return Math.max(1, Math.round((e - s) / 86400000) + 1)
    })

    const displayHistory = computed(() => displayRecords.value.slice(0, 30))

    const formatDate = (d) => {
      if (!d) return '-'
      const date = new Date(d)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    const bodyPath = computed(() => {
      // 简化站立人体轮廓
      return 'M65 85 Q55 110 60 140 Q65 180 80 220 L120 220 Q135 180 140 140 Q145 110 135 85 Q120 75 100 75 Q80 75 65 85 Z'
    })

    const bodyPoints = {
      chestUpper: { x: 100, y: 100, lx: 155, ly: 95, tx: 160, ty: 95, label: '上胸围' },
      chestLower: { x: 100, y: 118, lx: 155, ly: 118, tx: 160, ty: 118, label: '下胸围' },
      waist: { x: 100, y: 145, lx: 155, ly: 145, tx: 160, ty: 145, label: '腰围' },
      hip: { x: 100, y: 175, lx: 155, ly: 175, tx: 160, ty: 175, label: '臀围' },
      arm: { x: 42, y: 140, lx: 10, ly: 135, tx: 10, ty: 135, label: '臂围' },
      thigh: { x: 82, y: 250, lx: 45, ly: 250, tx: 10, ty: 250, label: '大腿围' },
      calf: { x: 80, y: 310, lx: 45, ly: 310, tx: 10, ty: 310, label: '小腿围' },
      shoulder: { x: 68, y: 85, lx: 30, ly: 80, tx: 10, ty: 80, label: '肩宽' }
    }

    const formatBodyValue = (key) => {
      const val = displayLatest.value.measurements?.[key]
      return val ? val + 'cm' : '-'
    }

    const showPartnerTrend = computed(() => partnerRecords.value.length > 0)

    // 趋势图计算（复用 Plans.vue 逻辑）
    const makeChartData = (list) => {
      if (!list || list.length === 0) return []
      return list.map(r => ({ date: r.date, value: r.value }))
    }

    const allTrendValues = computed(() => {
      const arr = [...(trendData.value.mine || []), ...(trendData.value.partner || [])]
      return arr.map(d => d.value)
    })

    const chartRange = computed(() => {
      if (allTrendValues.value.length === 0) return { min: 0, max: 100, range: 100 }
      const values = allTrendValues.value
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const padding = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 1
      const min = Math.max(0, minVal - padding)
      const max = maxVal + padding
      return { min, max, range: max - min || 1 }
    })

    const yAxisTicks = computed(() => {
      const { min, max } = chartRange.value
      const ticks = []
      for (let i = 4; i >= 0; i--) {
        const value = min + (max - min) * (i / 4)
        let formatted
        if (value >= 10000) formatted = (value / 1000).toFixed(0) + 'k'
        else if (value >= 1000) formatted = (value / 1000).toFixed(1) + 'k'
        else if (value >= 100) formatted = Math.round(value).toString()
        else if (value >= 10) formatted = value.toFixed(1)
        else formatted = value.toFixed(2)
        ticks.push({ value, formatted })
      }
      return ticks
    })

    const buildPath = (list) => {
      if (!list || list.length < 2) return ''
      const { min, max } = chartRange.value
      const range = max - min || 1
      const points = list.map((d, i) => {
        const x = list.length === 1 ? 50 : 5 + (i / (list.length - 1)) * 90
        const ratio = (d.value - min) / range
        const y = 95 - ratio * 90
        return { x, y: Math.max(5, Math.min(95, y)) }
      })
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      return d
    }

    const buildPoints = (list) => {
      if (!list || list.length === 0) return []
      const { min, max } = chartRange.value
      const range = max - min || 1
      return list.map((d, i) => {
        const x = list.length === 1 ? 50 : 5 + (i / (list.length - 1)) * 90
        const ratio = (d.value - min) / range
        const y = 95 - ratio * 90
        return { value: d.value, style: { left: x + '%', top: Math.max(5, Math.min(95, y)) + '%' } }
      })
    }

    const minePath = computed(() => buildPath(trendData.value.mine))
    const partnerPath = computed(() => buildPath(trendData.value.partner))
    const minePoints = computed(() => buildPoints(trendData.value.mine))
    const partnerPoints = computed(() => buildPoints(trendData.value.partner))

    const xAxisTicks = computed(() => {
      const list = trendData.value.mine && trendData.value.mine.length > 0 ? trendData.value.mine : trendData.value.partner
      if (!list || list.length === 0) return []
      const total = list.length
      const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
      const ticks = []
      for (let i = 0; i < maxTicks; i++) {
        const index = Math.round((i / (maxTicks - 1)) * (total - 1))
        ticks.push(list[index]?.date || '')
      }
      return ticks
    })

    const emptyForm = () => ({
      recordedAt: new Date().toISOString().split('T')[0],
      height: null,
      weight: null,
      bodyFat: null,
      measurements: {
        chestUpper: null,
        chestLower: null,
        waist: null,
        hip: null,
        arm: null,
        thigh: null,
        calf: null,
        shoulder: null
      },
      menstrual: {
        cycleStart: '',
        cycleEnd: '',
        flowLevel: null,
        note: ''
      },
      note: ''
    })

    const form = ref(emptyForm())

    const modalTitle = computed(() => {
      if (editingId.value) return '编辑记录'
      if (quickField.value) {
        const map = {
          height: '更新身高',
          weight: '更新体重',
          bodyFat: '更新体脂率',
          chestUpper: '更新上胸围',
          chestLower: '更新下胸围',
          waist: '更新腰围',
          hip: '更新臀围',
          arm: '更新臂围',
          thigh: '更新大腿围',
          calf: '更新小腿围',
          shoulder: '更新肩宽'
        }
        return map[quickField.value] || '快速记录'
      }
      return '记一笔'
    })

    const openFullForm = () => {
      if (activeTab.value !== 'mine') {
        showToast('只能记录自己的数据哦', 'info')
        return
      }
      editingId.value = null
      quickField.value = null
      form.value = emptyForm()
      showModal.value = true
    }

    const openQuickEdit = (field) => {
      if (activeTab.value !== 'mine') {
        showToast('只能编辑自己的数据哦', 'info')
        return
      }
      editingId.value = null
      quickField.value = field
      form.value = emptyForm()
      showModal.value = true
    }

    const openEdit = (item) => {
      if (activeTab.value !== 'mine') {
        showToast('只能编辑自己的数据哦', 'info')
        return
      }
      editingId.value = item._id
      quickField.value = null
      form.value = {
        recordedAt: item.recordedAt ? new Date(item.recordedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        height: item.height ?? null,
        weight: item.weight ?? null,
        bodyFat: item.bodyFat ?? null,
        measurements: {
          chestUpper: item.measurements?.chestUpper ?? null,
          chestLower: item.measurements?.chestLower ?? null,
          waist: item.measurements?.waist ?? null,
          hip: item.measurements?.hip ?? null,
          arm: item.measurements?.arm ?? null,
          thigh: item.measurements?.thigh ?? null,
          calf: item.measurements?.calf ?? null,
          shoulder: item.measurements?.shoulder ?? null
        },
        menstrual: {
          cycleStart: item.menstrual?.cycleStart ? new Date(item.menstrual.cycleStart).toISOString().split('T')[0] : '',
          cycleEnd: item.menstrual?.cycleEnd ? new Date(item.menstrual.cycleEnd).toISOString().split('T')[0] : '',
          flowLevel: item.menstrual?.flowLevel ?? null,
          note: item.menstrual?.note || ''
        },
        note: item.note || ''
      }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      editingId.value = null
      quickField.value = null
    }

    const saveRecord = async () => {
      saving.value = true
      try {
        const payload = {
          recordedAt: form.value.recordedAt,
          height: form.value.height,
          weight: form.value.weight,
          bodyFat: form.value.bodyFat,
          measurements: { ...form.value.measurements },
          note: form.value.note
        }
        if (currentUser.value?.gender === 'female') {
          payload.menstrual = {
            cycleStart: form.value.menstrual.cycleStart || null,
            cycleEnd: form.value.menstrual.cycleEnd || null,
            flowLevel: form.value.menstrual.flowLevel,
            note: form.value.menstrual.note
          }
        }
        const url = editingId.value ? `${CONFIG.API_URL}/health/${editingId.value}` : `${CONFIG.API_URL}/health`
        const method = editingId.value ? 'PUT' : 'POST'
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + getToken()
          },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
          showToast(editingId.value ? '修改成功' : '记录成功', 'success')
          closeModal()
          await fetchRecords()
          await fetchTrends()
        } else {
          showToast(data.message || '保存失败', 'error')
        }
      } catch (e) {
        showToast('保存失败', 'error')
      } finally {
        saving.value = false
      }
    }

    const deleteRecord = async () => {
      if (!editingId.value) return
      if (!confirm('确定删除这条记录吗？')) return
      try {
        const res = await fetch(`${CONFIG.API_URL}/health/${editingId.value}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          showToast('删除成功', 'success')
          closeModal()
          await fetchRecords()
          await fetchTrends()
        } else {
          showToast(data.message || '删除失败', 'error')
        }
      } catch (e) {
        showToast('删除失败', 'error')
      }
    }

    return {
      activeTab,
      currentUser,
      mineAvatar,
      partnerAvatar,
      displayLatest,
      displayHistory,
      latestMenstrual,
      menstrualDays,
      formatDate,
      bodyPath,
      bodyPoints,
      formatBodyValue,
      openQuickEdit,
      openFullForm,
      openEdit,
      showModal,
      modalTitle,
      form,
      saveRecord,
      deleteRecord,
      closeModal,
      editingId,
      saving,
      toast,
      trendMetrics,
      currentMetric,
      switchMetric,
      trendData,
      minePath,
      partnerPath,
      minePoints,
      partnerPoints,
      yAxisTicks,
      xAxisTicks,
      showPartnerTrend
    }
  }
}
</script>

<style scoped>
.health-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 120px);
  padding-bottom: 100px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top, 0px));
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}
.header-spacer {
  width: 36px;
}

/* Tab */
.tab-bar {
  display: flex;
  gap: 12px;
  padding: 0 16px 12px;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.8);
  color: #64748b;
  font-weight: 500;
}
.tab-item.active {
  background: #ffffff;
  border-color: #FF6B8A;
  color: #FF6B8A;
  box-shadow: 0 2px 8px rgba(255, 107, 138, 0.12);
}
.tab-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 人体图 */
.page-body {
  padding: 0 16px;
}
.body-map-section {
  margin-bottom: 16px;
}
.body-map-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.body-map-title {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 8px;
}
.body-map-wrapper {
  display: flex;
  justify-content: center;
}
.body-svg {
  width: 220px;
  height: 340px;
}
.body-point-group {
  cursor: pointer;
}
.body-point-group:hover circle {
  r: 7;
}
.body-point-group:hover text {
  fill: #FF6B8A;
}

.base-stats {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.base-stat {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
}
.base-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 2px;
}
.base-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

/* Section */
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 20px 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}

/* 月经 */
.menstrual-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.menstrual-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menstrual-dates {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menstrual-date {
  text-align: center;
}
.date-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
}
.date-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}
.menstrual-arrow {
  color: #cbd5e1;
  font-size: 14px;
}
.menstrual-days {
  margin-left: auto;
  text-align: center;
}
.days-num {
  font-size: 18px;
  font-weight: 700;
  color: #FF6B8A;
}
.days-label {
  font-size: 12px;
  color: #94a3b8;
}
.menstrual-note {
  font-size: 13px;
  color: #64748b;
  background: #fef2f4;
  padding: 8px 10px;
  border-radius: 10px;
}
.menstrual-empty {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 10px 0;
}

/* 趋势图 */
.trends-section {
  margin-bottom: 16px;
}
.trend-metric-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 10px;
  scrollbar-width: none;
}
.trend-metric-tabs::-webkit-scrollbar {
  display: none;
}
.trend-metric-tab {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}
.trend-metric-tab.active {
  background: #FF6B8A;
  color: #fff;
  border-color: #FF6B8A;
}
.trend-chart-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.chart-container {
  display: flex;
  height: 160px;
  gap: 8px;
}
.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
  text-align: right;
  width: 28px;
}
.chart-main {
  flex: 1;
  position: relative;
}
.chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #94a3b8;
}
.chart-points {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.chart-point {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.chart-point.mine {
  background: #FF6B8A;
}
.chart-point.partner {
  background: #60a5fa;
}
.point-tooltip {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.9);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.chart-point:hover .point-tooltip {
  opacity: 1;
}
.chart-x-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding-left: 36px;
  font-size: 10px;
  color: #94a3b8;
}
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.mine {
  background: #FF6B8A;
}
.legend-dot.partner {
  background: #60a5fa;
}

/* 历史记录 */
.history-section {
  margin-bottom: 16px;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-item {
  background: #ffffff;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.history-date {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.history-tag {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 8px;
}
.history-tag.menstrual-tag {
  background: #fef2f4;
  color: #FF6B8A;
}
.history-empty {
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  padding: 20px 0;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 30px;
  border: none;
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(255, 107, 138, 0.35);
  z-index: 50;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}
.modal-dialog {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  font-size: 20px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}
.form-group {
  margin-bottom: 14px;
}
.form-label {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  color: #334155;
  background: #ffffff;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #FF6B8A;
}
.form-row {
  display: flex;
  gap: 10px;
}
.form-row .form-group.small {
  flex: 1;
  margin-bottom: 12px;
}
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin: 6px 0 8px;
}
.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 20px;
  border-top: 1px solid #f1f5f9;
}
.footer-spacer {
  flex: 1;
}
.btn-secondary {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}
.btn-primary {
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.btn-danger {
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  background: #fef2f2;
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
}

/* Toast */
.toast {
  position: fixed;
  top: max(20px, env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  background: rgba(30, 41, 59, 0.95);
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
  z-index: 300;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast.success {
  background: rgba(34, 197, 94, 0.95);
}
.toast.error {
  background: rgba(239, 68, 68, 0.95);
}
</style>
