<template>
  <div class="budget-page">
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>

    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" @click="$router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="header-title">情侣账本</span>
        <button class="icon-btn" @click="showSettingsModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="main">
      <!-- ========== 资产大屏 ========== -->
      <div class="wealth-hero" v-if="stats">
        <div class="wealth-cards">
          <div class="wealth-card mine" v-if="myNetWorth" @click="openNetWorthModal('mine')">
            <div class="wealth-card-inner">
              <div class="wealth-card-label">{{ myNetWorth.nickname || '我的资产' }}</div>
              <div class="wealth-card-amount">
                <span class="currency">¥</span>
                <span class="number">{{ formatMoney(myNetWorth.amount || 0) }}</span>
              </div>
              <div class="wealth-card-hint" v-if="myNetWorth.date">
                更新于 {{ formatDateShort(myNetWorth.date) }}
              </div>
              <div class="wealth-card-hint" v-else>
                点击设置更新资产
              </div>
            </div>
          </div>
          <div class="wealth-card partner" v-if="partnerNetWorth" @click="openNetWorthModal('partner')">
            <div class="wealth-card-inner">
              <div class="wealth-card-label">{{ partnerNetWorth.nickname ? partnerNetWorth.nickname + '的资产' : partnerPronoun + '的资产' }}</div>
              <div class="wealth-card-amount">
                <span class="currency">¥</span>
                <span class="number">{{ formatMoney(partnerNetWorth.amount || 0) }}</span>
              </div>
              <div class="wealth-card-hint" v-if="partnerNetWorth.date">
                更新于 {{ formatDateShort(partnerNetWorth.date) }}
              </div>
              <div class="wealth-card-hint" v-else>
                对方尚未更新
              </div>
            </div>
          </div>
        </div>

        <!-- 本月收支 mini 卡片 -->
        <div class="month-mini">
          <div class="mini-card income">
            <div class="mini-label">本月收入</div>
            <div class="mini-value">+¥{{ formatMoney(stats.income || 0) }}</div>
          </div>
          <div class="mini-card expense">
            <div class="mini-label">本月支出</div>
            <div class="mini-value">-¥{{ formatMoney(stats.expense || 0) }}</div>
          </div>
          <div class="mini-card balance">
            <div class="mini-label">结余</div>
            <div class="mini-value" :class="{ negative: (stats.balance || 0) < 0 }">
              {{ (stats.balance || 0) >= 0 ? '+' : '' }}¥{{ formatMoney(stats.balance || 0) }}
            </div>
          </div>
        </div>
      </div>

      <!-- ========== 自定义分类 ========== -->
      <div class="category-section">
        <div class="section-header">
          <span class="section-title">分类</span>
          <button class="section-action" @click="showCategoryModal = true">管理</button>
        </div>
        <div class="category-pills" v-if="categories.length">
          <button
            v-for="c in categories"
            :key="c._id"
            class="category-pill"
            :class="{ active: selectedCategory === c.name }"
            @click="toggleCategory(c.name)"
          >
            <span class="pill-emoji">{{ c.emoji }}</span>
            <span class="pill-name">{{ c.name }}</span>
            <span class="pill-amount" v-if="categorySpend[c.name]">¥{{ formatMoney(categorySpend[c.name]) }}</span>
            <span class="pill-quota" v-if="quotaBadge(c)">{{ quotaBadge(c) }}</span>
          </button>
          <button class="category-pill all" :class="{ active: !selectedCategory }" @click="selectedCategory = ''">
            <span class="pill-name">全部</span>
          </button>
        </div>
        <div v-else class="category-empty">
          <span>还没有分类，点击管理创建</span>
        </div>
      </div>

      <!-- ========== 交易时间线 ========== -->
      <div class="timeline-section">
        <div class="section-header">
          <span class="section-title">收支明细</span>
          <span class="section-hint" v-if="filteredTransactions.length">{{ filteredTransactions.length }} 笔</span>
        </div>
        <div class="timeline" v-if="groupedTransactions.length">
          <div class="timeline-day" v-for="day in groupedTransactions" :key="day.date">
            <div class="day-header">
              <span class="day-date">{{ day.label }}</span>
              <span class="day-summary">
                <span v-if="day.income > 0" class="day-income">+¥{{ formatMoney(day.income) }}</span>
                <span v-if="day.expense > 0" class="day-expense">-¥{{ formatMoney(day.expense) }}</span>
              </span>
            </div>
            <div class="day-items">
              <div
                v-for="txn in day.items"
                :key="txn._id"
                class="timeline-item"
                @click="editTransaction(txn)"
              >
                <div class="item-icon">{{ categoryEmoji(txn.category) }}</div>
                <div class="item-body">
                  <div class="item-top">
                    <span class="item-category">{{ txn.category }}</span>
                    <span class="item-amount" :class="txn.type">
                      {{ txn.type === 'income' ? '+' : '-' }}¥{{ formatMoney(txn.amount) }}
                    </span>
                  </div>
                  <div class="item-bottom">
                    <span class="item-note" v-if="txn.note">{{ txn.note }}</span>
                    <span class="item-creator" v-if="userMap[txn.creatorId]">{{ userMap[txn.creatorId] }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">📝</div>
          <p class="empty-text">暂无记录，点击右下角添加</p>
        </div>
      </div>
    </main>

    <!-- 浮动按钮 -->
    <button class="fab-btn" @click="openTxnModal">
      <span>+</span>
    </button>

    <!-- ========== 记账弹窗 ========== -->
    <div class="modal-overlay" v-if="showTxnModal" @click.self="closeTxnModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingTxn ? '编辑记录' : '记一笔' }}</h3>
          <button class="btn-close" @click="closeTxnModal">×</button>
        </div>
        <div class="modal-body">
          <div class="type-toggle">
            <button :class="{ active: txnForm.type === 'expense' }" @click="txnForm.type = 'expense'">支出</button>
            <button :class="{ active: txnForm.type === 'income' }" @click="txnForm.type = 'income'">收入</button>
          </div>
          <div class="form-group">
            <label>金额 <span class="required">*</span></label>
            <input v-model="txnForm.amount" type="number" placeholder="0.00" step="0.01" />
          </div>
          <div class="form-group">
            <label>分类 <span class="required">*</span></label>
            <div class="category-grid" v-if="categories.length">
              <button
                v-for="c in categories"
                :key="c._id"
                class="category-btn"
                :class="{ active: txnForm.category === c.name }"
                @click="txnForm.category = c.name"
              >
                <span class="c-emoji">{{ c.emoji }}</span>
                <span class="c-name">{{ c.name }}</span>
              </button>
            </div>
            <div v-else class="category-empty-hint">
              还没有分类，请先创建分类
            </div>
          </div>
          <div class="form-group">
            <label>日期 <span class="required">*</span></label>
            <input v-model="txnForm.date" type="date" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <input v-model="txnForm.note" type="text" placeholder="可选" maxlength="100" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger" v-if="editingTxn" @click="deleteTransaction">删除</button>
          <button class="btn btn-secondary" @click="closeTxnModal">取消</button>
          <button class="btn btn-primary" :disabled="!txnValid || submitting" @click="submitTxn">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 分类管理弹窗 ========== -->
    <div class="modal-overlay" v-if="showCategoryModal" @click.self="showCategoryModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>管理分类</h3>
          <button class="btn-close" @click="showCategoryModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="category-manage-list">
            <div v-for="c in categories" :key="c._id" class="manage-item">
              <div class="manage-main">
                <span class="manage-emoji">{{ c.emoji }}</span>
                <div class="manage-info">
                  <div class="manage-name">{{ c.name }}</div>
                  <div class="manage-meta">
                    <span v-if="c.budget > 0">预算 ¥{{ c.budget }}</span>
                    <span v-if="c.quota > 0">
                      {{ c.quotaType === 'count' ? '限次' : '限额' }} {{ c.quota }}/{{ periodLabel(c.period) }}
                    </span>
                  </div>
                </div>
              </div>
              <div class="manage-actions">
                <button class="manage-btn" @click="editCategory(c)">编辑</button>
                <button class="manage-btn danger" @click="deleteCategory(c)">删除</button>
              </div>
            </div>
          </div>

          <div class="divider" v-if="categories.length"></div>

          <div class="form-group">
            <label>{{ editingCategory ? '编辑分类' : '新建分类' }}</label>
            <div class="inline-row">
              <input v-model="categoryForm.emoji" type="text" class="emoji-input" placeholder="📦" maxlength="10" />
              <input v-model="categoryForm.name" type="text" placeholder="分类名称" maxlength="20" />
            </div>
          </div>
          <div class="form-group inline">
            <label>月度预算</label>
            <input v-model.number="categoryForm.budget" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>限制类型</label>
            <select v-model="categoryForm.quotaType">
              <option value="count">次数</option>
              <option value="amount">金额</option>
            </select>
          </div>
          <div class="form-group inline">
            <label>限制数量</label>
            <input v-model.number="categoryForm.quota" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>周期</label>
            <select v-model="categoryForm.period">
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
              <option value="yearly">每年</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelCategoryEdit">取消</button>
          <button class="btn btn-primary" :disabled="!categoryValid || submitting" @click="submitCategory">
            {{ submitting ? '保存中...' : (editingCategory ? '更新' : '添加') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 净资产弹窗 ========== -->
    <div class="modal-overlay" v-if="showNetWorthModal" @click.self="showNetWorthModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>更新净资产</h3>
          <button class="btn-close" @click="showNetWorthModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>当前净资产 <span class="required">*</span></label>
            <input v-model="netWorthForm.amount" type="number" placeholder="0.00" step="0.01" />
          </div>
          <div class="form-group">
            <label>日期</label>
            <input v-model="netWorthForm.date" type="date" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <input v-model="netWorthForm.note" type="text" placeholder="可选" maxlength="100" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNetWorthModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!netWorthValid || submitting" @click="submitNetWorth">
            {{ submitting ? '保存中...' : '更新' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 设置弹窗 ========== -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>账本设置</h3>
          <button class="btn-close" @click="showSettingsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-card" @click="showNetWorthModal = true">
            <div class="settings-icon">💰</div>
            <div class="settings-info">
              <div class="settings-name">更新净资产</div>
              <div class="settings-hint">记录你当前的资产状况</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="form-group">
            <label>月度总预算</label>
            <input v-model.number="settingsForm.monthlyBudget" type="number" placeholder="0 = 不设置" min="0" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSettingsModal = false">关闭</button>
          <button class="btn btn-primary" :disabled="submitting" @click="saveSettings">
            {{ submitting ? '保存中...' : '保存设置' }}
          </button>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../stores/user.js'
import BottomNav from '../components/BottomNav.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

const API = '/api/budget'

// ========== 数据 ==========
const stats = ref(null)
const categories = ref([])
const transactions = ref([])
const selectedCategory = ref('')
const userMap = ref({})
const userList = ref([])

const categorySpend = computed(() => {
  const map = {}
  if (!stats.value?.categoryStats) return map
  for (const [name, info] of Object.entries(stats.value.categoryStats)) {
    map[name] = info.expense || 0
  }
  return map
})

const myNetWorth = computed(() => {
  const me = userList.value.find(u => u.id === currentUserId.value)
  const amount = stats.value?.netWorthMap?.[currentUserId.value]?.amount || 0
  const date = stats.value?.netWorthMap?.[currentUserId.value]?.date
  return { ...me, amount, date }
})

const partnerNetWorth = computed(() => {
  const partner = userList.value.find(u => u.id !== currentUserId.value)
  const pid = partner?.id
  const amount = pid ? (stats.value?.netWorthMap?.[pid]?.amount || 0) : 0
  const date = pid ? stats.value?.netWorthMap?.[pid]?.date : null
  return { ...partner, amount, date }
})

const partnerPronoun = computed(() => {
  const p = userList.value.find(u => u.id !== currentUserId.value)
  if (p?.gender === 'male') return '他'
  if (p?.gender === 'female') return '她'
  return 'TA'
})

const filteredTransactions = computed(() => {
  let list = transactions.value
  if (selectedCategory.value) list = list.filter(t => t.category === selectedCategory.value)
  return list
})

const groupedTransactions = computed(() => {
  const groups = {}
  filteredTransactions.value.forEach(txn => {
    const d = new Date(txn.date)
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    if (!groups[key]) {
      const now = new Date()
      const isToday = d.toDateString() === now.toDateString()
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      groups[key] = {
        date: key,
        label: isToday ? '今天' : `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`,
        items: [], income: 0, expense: 0
      }
    }
    groups[key].items.push(txn)
    if (txn.type === 'income') groups[key].income += txn.amount
    else groups[key].expense += txn.amount
  })
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

function categoryEmoji(name) {
  const c = categories.value.find(x => x.name === name)
  return c?.emoji || '📝'
}

function quotaBadge(c) {
  if (!stats.value?.quotaUsage) return ''
  const q = stats.value.quotaUsage[c.name]
  if (!q || q.limit <= 0) return ''
  const pct = q.used / q.limit
  if (pct >= 1) return '已满'
  if (pct >= 0.8) return '预警'
  return ''
}

function periodLabel(p) {
  return { weekly: '周', monthly: '月', yearly: '年' }[p] || '月'
}

function formatDateShort(iso) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return '今天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// ========== 弹窗状态 ==========
const showTxnModal = ref(false)
const showCategoryModal = ref(false)
const showNetWorthModal = ref(false)
const showSettingsModal = ref(false)
const editingTxn = ref(null)
const editingCategory = ref(null)
const submitting = ref(false)

const txnForm = ref({ type: 'expense', amount: '', category: '', date: getTodayStr(), note: '' })
const categoryForm = ref({ name: '', emoji: '📦', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' })
const netWorthForm = ref({ amount: '', date: getTodayStr(), note: '' })
const settingsForm = ref({ monthlyBudget: 0 })

const txnValid = computed(() => txnForm.value.amount > 0 && txnForm.value.category && txnForm.value.date)
const categoryValid = computed(() => categoryForm.value.name?.trim())
const netWorthValid = computed(() => netWorthForm.value.amount !== '' && netWorthForm.value.amount !== null)

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(n) {
  if (n === undefined || n === null) return '0.00'
  return Number(n).toFixed(2)
}

function toggleCategory(name) {
  selectedCategory.value = selectedCategory.value === name ? '' : name
}

// ========== 弹窗操作 ==========
function openTxnModal() {
  editingTxn.value = null
  txnForm.value = { type: 'expense', amount: '', category: categories.value[0]?.name || '', date: getTodayStr(), note: '' }
  showTxnModal.value = true
}

function openNetWorthModal(target) {
  netWorthForm.value = { amount: '', date: getTodayStr(), note: '' }
  showNetWorthModal.value = true
}

function closeTxnModal() {
  showTxnModal.value = false
  editingTxn.value = null
}

function editTransaction(txn) {
  editingTxn.value = txn
  txnForm.value = {
    type: txn.type, amount: txn.amount, category: txn.category,
    date: formatDateLocal(txn.date), note: txn.note || ''
  }
  showTxnModal.value = true
}

function formatDateLocal(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cancelCategoryEdit() {
  editingCategory.value = null
  categoryForm.value = { name: '', emoji: '📦', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' }
}

function editCategory(c) {
  editingCategory.value = c
  categoryForm.value = { name: c.name, emoji: c.emoji, budget: c.budget, quota: c.quota, quotaType: c.quotaType, period: c.period }
}

// ========== API ==========
async function submitTxn() {
  if (!txnValid.value) return
  submitting.value = true
  try {
    const url = editingTxn.value ? `${API}/transactions/${editingTxn.value._id}` : `${API}/transactions`
    const method = editingTxn.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(txnForm.value)
    })
    const data = await res.json()
    if (data.success) { closeTxnModal(); await fetchAll() }
    else alert(data.message || '保存失败')
  } catch (e) {
    console.error(e); alert('网络错误')
  } finally { submitting.value = false }
}

async function deleteTransaction() {
  if (!editingTxn.value) return
  if (!confirm('确定删除这条记录吗？')) return
  submitting.value = true
  try {
    const res = await fetch(`${API}/transactions/${editingTxn.value._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) { closeTxnModal(); await fetchAll() }
  } catch (e) { console.error(e) } finally { submitting.value = false }
}

async function submitCategory() {
  if (!categoryValid.value) return
  submitting.value = true
  try {
    const url = editingCategory.value ? `${API}/categories/${editingCategory.value._id}` : `${API}/categories`
    const method = editingCategory.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(categoryForm.value)
    })
    const data = await res.json()
    if (data.success) {
      cancelCategoryEdit()
      await fetchAll()
    } else alert(data.message || '保存失败')
  } catch (e) {
    console.error(e); alert('网络错误')
  } finally { submitting.value = false }
}

async function deleteCategory(c) {
  if (!confirm(`确定删除分类「${c.name}」吗？该分类下的交易记录不会删除，但将不再显示分类信息。`)) return
  try {
    const res = await fetch(`${API}/categories/${c._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) await fetchAll()
  } catch (e) { console.error(e) }
}

async function submitNetWorth() {
  if (!netWorthValid.value) return
  submitting.value = true
  try {
    const res = await fetch(`${API}/networth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(netWorthForm.value)
    })
    const data = await res.json()
    if (data.success) {
      showNetWorthModal.value = false
      netWorthForm.value = { amount: '', date: getTodayStr(), note: '' }
      await fetchAll()
    } else alert(data.message || '保存失败')
  } catch (e) {
    console.error(e); alert('网络错误')
  } finally { submitting.value = false }
}

async function saveSettings() {
  submitting.value = true
  try {
    const res = await fetch(`${API}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(settingsForm.value)
    })
    const data = await res.json()
    if (data.success) { showSettingsModal.value = false; await fetchAll() }
    else alert(data.message || '保存失败')
  } catch (e) {
    console.error(e); alert('网络错误')
  } finally { submitting.value = false }
}

// ========== 加载 ==========
async function fetchAll() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const [statsRes, catRes, txnRes, settingsRes] = await Promise.all([
      fetch(`${API}/stats`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API}/categories`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API}/transactions`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API}/settings`, { headers: { Authorization: 'Bearer ' + token } })
    ])
    const [s, c, t, set] = await Promise.all([statsRes.json(), catRes.json(), txnRes.json(), settingsRes.json()])
    if (s.success) stats.value = s.data
    if (c.success) categories.value = c.data
    if (t.success) transactions.value = t.data
    if (set.success && set.data) {
      settingsForm.value.monthlyBudget = set.data.monthlyBudget || 0
    }
  } catch (e) {
    console.error('[Budget] 加载失败:', e)
  }
}

async function fetchUsers() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const res = await fetch('/api/user/profile', { headers: { Authorization: 'Bearer ' + token } })
    const data = await res.json()
    if (data.success && data.data) {
      const me = data.data
      const partner = data.data.partner
      const map = {}
      const list = []
      if (me) { map[me._id] = me.nickname || '我'; list.push({ id: me._id, nickname: me.nickname || '我' }) }
      if (partner) {
        const pPronoun = partner.gender === 'male' ? '他' : partner.gender === 'female' ? '她' : 'TA'
        map[partner._id] = partner.nickname || pPronoun
        list.push({ id: partner._id, nickname: partner.nickname || pPronoun, gender: partner.gender })
      }
      userMap.value = map
      userList.value = list
    }
  } catch (e) { console.error(e) }
}

onMounted(() => {
  fetchAll()
  fetchUsers()
  if (window.eventBus) {
    window.eventBus.on('budgetSync', () => fetchAll())
  }
})
</script>

<style scoped>
.budget-page {
  min-height: 100vh;
  position: relative;
  padding-bottom: 100px;
  background: var(--bg-primary);
}
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
  filter: blur(100px);
  opacity: 0.35;
}
.orb-1 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  top: -120px;
  right: -120px;
}
.orb-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #0f3460 0%, #533483 100%);
  bottom: 5%;
  left: -100px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(253, 253, 245, 0.85);
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
  font-weight: 700;
  letter-spacing: 0.5px;
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
  transition: all 0.2s;
}
.icon-btn:active { transform: scale(0.95); }

.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

/* ========== 资产大屏 ========== */
.wealth-hero {
  margin-bottom: 24px;
}
.wealth-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.wealth-card {
  border-radius: 24px;
  padding: 28px 16px 20px;
  color: white;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.wealth-card:active { transform: scale(0.97); }
.wealth-card.mine {
  background: linear-gradient(145deg, #1e3a5f 0%, #2d5a87 50%, #1e3a5f 100%);
  box-shadow: 0 16px 40px rgba(30, 58, 95, 0.25);
}
.wealth-card.partner {
  background: linear-gradient(145deg, #2d1b4e 0%, #5e3a7a 50%, #2d1b4e 100%);
  box-shadow: 0 16px 40px rgba(45, 27, 78, 0.25);
}
.wealth-card::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -40%;
  width: 180%;
  height: 180%;
  background: radial-gradient(circle at 70% 20%, rgba(255,255,255,0.07) 0%, transparent 50%);
  pointer-events: none;
}
.wealth-card-label {
  font-size: 13px;
  opacity: 0.65;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
}
.wealth-card-amount {
  display: flex;
  align-items: baseline;
  gap: 2px;
  position: relative;
  z-index: 1;
}
.wealth-card-amount .currency {
  font-size: 18px;
  font-weight: 300;
  opacity: 0.7;
}
.wealth-card-amount .number {
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
  font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}
.wealth-card-hint {
  font-size: 11px;
  opacity: 0.5;
  position: relative;
  z-index: 1;
}

/* 本月收支 mini */
.month-mini {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 16px;
}
.mini-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 10px;
  text-align: center;
  transition: transform 0.2s;
}
.mini-card:active { transform: scale(0.97); }
.mini-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.mini-value {
  font-size: 15px;
  font-weight: 700;
}
.mini-card.income .mini-value { color: #34c759; }
.mini-card.expense .mini-value { color: #ff3b30; }
.mini-card.balance .mini-value { color: var(--text-primary); }
.mini-card.balance .mini-value.negative { color: #ff3b30; }

/* ========== 分类 ========== */
.category-section {
  margin-bottom: 24px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.section-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
}
.section-action {
  font-size: 13px;
  color: var(--color-primary);
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
}
.section-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}
.category-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.category-pills::-webkit-scrollbar { display: none; }
.category-pill {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 100px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}
.category-pill.active {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(30, 58, 95, 0.2);
}
.category-pill.all {
  font-weight: 600;
}
.pill-emoji { font-size: 15px; }
.pill-name { font-weight: 500; }
.pill-amount { font-size: 11px; opacity: 0.7; }
.pill-quota {
  font-size: 10px;
  background: #ff3b30;
  color: white;
  padding: 1px 6px;
  border-radius: 100px;
  font-weight: 600;
}
.category-empty {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
  background: var(--bg-card);
  border-radius: 16px;
  border: 1px dashed var(--border-color);
}

/* ========== 时间线 ========== */
.timeline-section {
  margin-bottom: 24px;
}
.timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.timeline-day {
  position: relative;
}
.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 4px;
}
.day-date {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}
.day-summary {
  display: flex;
  gap: 10px;
  font-size: 12px;
  font-weight: 600;
}
.day-income { color: #34c759; }
.day-expense { color: #ff3b30; }

.day-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.timeline-item:active { transform: scale(0.98); }
.item-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.item-body {
  flex: 1;
  min-width: 0;
}
.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.item-category {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.item-amount {
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}
.item-amount.expense { color: #ff3b30; }
.item-amount.income { color: #34c759; }
.item-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.item-note {
  font-size: 12px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-creator {
  font-size: 11px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* ========== 空状态 ========== */
.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 12px;
}
.empty-text {
  color: var(--text-secondary);
  font-size: 14px;
}

/* ========== 浮动按钮 ========== */
.fab-btn {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%);
  color: white;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(30, 58, 95, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 50;
}
.fab-btn:active { transform: scale(0.92); }

/* ========== 弹窗 ========== */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  padding-top: calc(20px + env(safe-area-inset-top, 0px));
  padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
}
.modal-content {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  animation: slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
}
.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}
.modal-body {
  padding: 20px 24px;
}
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 24px 24px;
  border-top: 1px solid var(--border-color);
}
.modal-footer .btn {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.btn-primary {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%);
  color: white;
}
.btn-primary:disabled { opacity: 0.5; }
.btn-danger {
  background: #ffebee;
  color: #c62828;
}

/* ========== 表单 ========== */
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.form-group .required { color: #ff4444; }
.form-group input,
.form-group select {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  font-size: 15px;
  background: var(--bg-secondary);
  box-sizing: border-box;
  color: var(--text-primary);
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #1e3a5f;
}

.type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.type-toggle button {
  flex: 1;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}
.type-toggle button.active {
  color: white;
  border-color: transparent;
}
.type-toggle button.active:first-child {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3b30 100%);
}
.type-toggle button.active:last-child {
  background: linear-gradient(135deg, #34c759 0%, #30b350 100%);
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  color: var(--text-primary);
}
.category-btn.active {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d1b4e 100%);
  border-color: transparent;
  color: white;
}
.c-emoji { font-size: 22px; }
.c-name { font-size: 11px; }
.category-empty-hint {
  text-align: center;
  padding: 20px;
  color: var(--text-tertiary);
  font-size: 13px;
  background: var(--bg-secondary);
  border-radius: 14px;
}

/* 分类管理 */
.category-manage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.manage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-radius: 14px;
}
.manage-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.manage-emoji { font-size: 22px; }
.manage-info { flex: 1; }
.manage-name { font-size: 14px; font-weight: 600; }
.manage-meta {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 2px;
  display: flex;
  gap: 8px;
}
.manage-actions {
  display: flex;
  gap: 8px;
}
.manage-btn {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;
}
.manage-btn.danger { color: #ff3b30; }

.divider {
  height: 1px;
  background: var(--border-color);
  margin: 20px 0;
}

.inline-row {
  display: flex;
  gap: 10px;
}
.inline-row .emoji-input {
  width: 60px;
  text-align: center;
  flex-shrink: 0;
}
.inline-row input {
  flex: 1;
}

.form-group.inline {
  display: flex;
  align-items: center;
  gap: 10px;
}
.form-group.inline label {
  width: 80px;
  margin-bottom: 0;
  flex-shrink: 0;
}
.form-group.inline input,
.form-group.inline select {
  flex: 1;
}

/* 设置卡片 */
.settings-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 16px;
  margin-bottom: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.settings-card:active { transform: scale(0.98); }
.settings-icon { font-size: 28px; }
.settings-info { flex: 1; }
.settings-name { font-size: 15px; font-weight: 600; }
.settings-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
</style>
