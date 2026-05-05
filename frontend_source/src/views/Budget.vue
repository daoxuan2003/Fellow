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
      <!-- 顶部统计卡片 -->
      <div class="stats-cards" v-if="stats">
        <div class="stat-card expense">
          <div class="stat-label">本月支出</div>
          <div class="stat-value">¥{{ formatMoney(stats.expense) }}</div>
          <div class="stat-bar">
            <div class="stat-bar-fill" :style="{ width: Math.min(100, (stats.expense / stats.monthlyBudget) * 100) + '%' }"></div>
          </div>
          <div class="stat-hint">预算 ¥{{ formatMoney(stats.monthlyBudget) }}</div>
        </div>
        <div class="stat-card remaining" :class="{ danger: stats.remainingBudget < stats.monthlyBudget * 0.2 }">
          <div class="stat-label">剩余预算</div>
          <div class="stat-value">¥{{ formatMoney(stats.remainingBudget) }}</div>
          <div class="stat-hint" v-if="stats.remainingBudget < stats.monthlyBudget * 0.2">⚠️ 预算紧张</div>
        </div>
        <div class="stat-card travel">
          <div class="stat-label">出行次数</div>
          <div class="stat-value">{{ stats.travel.used }}/{{ stats.travel.limit }}</div>
          <div class="stat-bar">
            <div class="stat-bar-fill" :style="{ width: Math.min(100, (stats.travel.used / (stats.travel.limit || 1)) * 100) + '%' }"></div>
          </div>
          <div class="stat-hint">{{ stats.travel.period === 'weekly' ? '本周' : '本月' }}限制</div>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="filter-tabs">
        <button v-for="tab in tabs" :key="tab.value" class="filter-tab" :class="{ active: currentTab === tab.value }" @click="currentTab = tab.value">
          {{ tab.label }}
        </button>
      </div>

      <!-- 概览页 -->
      <div v-if="currentTab === 'overview'" class="tab-content">
        <div class="section-title">分类预算</div>
        <div class="category-list" v-if="stats">
          <div v-for="(item, key) in categoryList" :key="key" class="category-item">
            <div class="category-info">
              <span class="category-emoji">{{ item.emoji }}</span>
              <span class="category-name">{{ item.name }}</span>
              <span class="category-amount">¥{{ formatMoney(item.expense) }}/¥{{ formatMoney(item.budget) }}</span>
            </div>
            <div class="category-bar">
              <div class="category-bar-fill" :class="{ warning: item.ratio > 0.8, danger: item.ratio > 1 }" :style="{ width: Math.min(100, item.ratio * 100) + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="section-title">近期交易</div>
        <div class="transaction-list">
          <div v-for="txn in recentTransactions" :key="txn._id" class="txn-item" @click="editTransaction(txn)">
            <div class="txn-icon">{{ categoryMap[txn.category]?.emoji || '📝' }}</div>
            <div class="txn-info">
              <div class="txn-name">{{ txn.note || categoryMap[txn.category]?.name || txn.category }}</div>
              <div class="txn-date">{{ formatDate(txn.date) }}</div>
            </div>
            <div class="txn-amount" :class="txn.type">{{ txn.type === 'income' ? '+' : '-' }}¥{{ formatMoney(txn.amount) }}</div>
          </div>
          <div v-if="recentTransactions.length === 0" class="empty-mini">
            <span>还没有记账记录</span>
          </div>
        </div>
      </div>

      <!-- 记账页 -->
      <div v-if="currentTab === 'transactions'" class="tab-content">
        <div class="txn-filters">
          <select v-model="filterType" class="filter-select">
            <option value="">全部类型</option>
            <option value="expense">支出</option>
            <option value="income">收入</option>
          </select>
          <select v-model="filterCategory" class="filter-select">
            <option value="">全部分类</option>
            <option v-for="(c, k) in categoryMap" :key="k" :value="k">{{ c.name }}</option>
          </select>
        </div>
        <div class="transaction-list">
          <div v-for="txn in filteredTransactions" :key="txn._id" class="txn-item" @click="editTransaction(txn)">
            <div class="txn-icon">{{ categoryMap[txn.category]?.emoji || '📝' }}</div>
            <div class="txn-info">
              <div class="txn-name">{{ txn.note || categoryMap[txn.category]?.name || txn.category }}</div>
              <div class="txn-date">{{ formatDate(txn.date) }} · {{ categoryMap[txn.category]?.name }}</div>
            </div>
            <div class="txn-amount" :class="txn.type">{{ txn.type === 'income' ? '+' : '-' }}¥{{ formatMoney(txn.amount) }}</div>
          </div>
          <div v-if="filteredTransactions.length === 0" class="empty-state">
            <div class="empty-icon">📝</div>
            <p class="empty-text">暂无记录，点击右下角添加</p>
          </div>
        </div>
      </div>

      <!-- 资产页 -->
      <div v-if="currentTab === 'assets'" class="tab-content">
        <div class="asset-total" v-if="stats">
          <div class="asset-total-label">总资产</div>
          <div class="asset-total-value">¥{{ formatMoney(stats.totalAssets) }}</div>
        </div>
        <div class="asset-list">
          <div v-for="asset in assets" :key="asset._id" class="asset-card" @click="editAsset(asset)">
            <div class="asset-icon">{{ assetTypeMap[asset.type]?.emoji || '💰' }}</div>
            <div class="asset-info">
              <div class="asset-name">{{ asset.name }}</div>
              <div class="asset-type">{{ assetTypeMap[asset.type]?.name }}</div>
            </div>
            <div class="asset-balance">¥{{ formatMoney(asset.balance) }}</div>
          </div>
          <div v-if="assets.length === 0" class="empty-state">
            <div class="empty-icon">💰</div>
            <p class="empty-text">还没有资产账户，点击右下角添加</p>
          </div>
        </div>
      </div>

      <!-- 出行页 -->
      <div v-if="currentTab === 'travel'" class="tab-content">
        <div class="travel-card" v-if="stats">
          <div class="travel-ring">
            <svg viewBox="0 0 100 100">
              <circle class="ring-bg" cx="50" cy="50" r="42"/>
              <circle class="ring-fill" cx="50" cy="50" r="42" :stroke-dasharray="travelRingDash"/>
            </svg>
            <div class="ring-text">
              <div class="ring-value">{{ stats.travel.used }}</div>
              <div class="ring-limit">/{{ stats.travel.limit }}</div>
            </div>
          </div>
          <div class="travel-info">
            <div class="travel-title">{{ stats.travel.period === 'weekly' ? '本周' : '本月' }}出行次数</div>
            <div class="travel-hint" v-if="stats.travel.used >= stats.travel.limit" style="color:#ff4444">已达上限，控制一下哦</div>
            <div class="travel-hint" v-else-if="stats.travel.used >= stats.travel.limit * 0.8" style="color:#ff9800">接近上限啦</div>
            <div class="travel-hint" v-else>还有 {{ stats.travel.limit - stats.travel.used }} 次机会</div>
          </div>
        </div>
        <div class="section-title">出行记录</div>
        <div class="transaction-list">
          <div v-for="txn in travelTransactions" :key="txn._id" class="txn-item">
            <div class="txn-icon">🚗</div>
            <div class="txn-info">
              <div class="txn-name">{{ txn.note || '出行' }}</div>
              <div class="txn-date">{{ formatDate(txn.date) }}</div>
            </div>
            <div class="txn-amount expense">-¥{{ formatMoney(txn.amount) }}</div>
          </div>
          <div v-if="travelTransactions.length === 0" class="empty-state">
            <div class="empty-icon">🚗</div>
            <p class="empty-text">还没有出行记录</p>
          </div>
        </div>
      </div>
    </main>

    <!-- 添加按钮 -->
    <button class="fab-btn" @click="openAddModal">
      <span>+</span>
    </button>

    <!-- 添加/编辑交易弹窗 -->
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
            <div class="category-grid">
              <button v-for="(c, k) in categoryMap" :key="k" class="category-btn" :class="{ active: txnForm.category === k }" @click="txnForm.category = k">
                <span class="c-emoji">{{ c.emoji }}</span>
                <span class="c-name">{{ c.name }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>关联账户</label>
            <select v-model="txnForm.accountId">
              <option value="">不关联</option>
              <option v-for="a in assets" :key="a._id" :value="a._id">{{ a.name }} (¥{{ formatMoney(a.balance) }})</option>
            </select>
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
          <button class="btn btn-secondary" @click="closeTxnModal">取消</button>
          <button class="btn btn-primary" :disabled="!txnValid || submitting" @click="submitTxn">{{ submitting ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑资产弹窗 -->
    <div class="modal-overlay" v-if="showAssetModal" @click.self="closeAssetModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ editingAsset ? '编辑账户' : '添加账户' }}</h3>
          <button class="btn-close" @click="closeAssetModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>账户名称 <span class="required">*</span></label>
            <input v-model="assetForm.name" type="text" placeholder="例如：微信零钱" maxlength="50" />
          </div>
          <div class="form-group">
            <label>账户类型</label>
            <div class="category-grid">
              <button v-for="(t, k) in assetTypeMap" :key="k" class="category-btn" :class="{ active: assetForm.type === k }" @click="assetForm.type = k">
                <span class="c-emoji">{{ t.emoji }}</span>
                <span class="c-name">{{ t.name }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>当前余额</label>
            <input v-model="assetForm.balance" type="number" placeholder="0.00" step="0.01" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger" v-if="editingAsset" @click="deleteAsset">删除</button>
          <button class="btn btn-secondary" @click="closeAssetModal">取消</button>
          <button class="btn btn-primary" :disabled="!assetValid || submitting" @click="submitAsset">{{ submitting ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <!-- 预算设置弹窗 -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>预算设置</h3>
          <button class="btn-close" @click="showSettingsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>月度总预算</label>
            <input v-model.number="settingsForm.monthlyBudget" type="number" placeholder="3000" />
          </div>
          <div class="form-group">
            <label>出行限制周期</label>
            <select v-model="settingsForm.travelQuota.period">
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          <div class="form-group">
            <label>出行次数上限</label>
            <input v-model.number="settingsForm.travelQuota.limit" type="number" placeholder="4" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSettingsModal = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="saveSettings">{{ submitting ? '保存中...' : '保存' }}</button>
        </div>
      </div>
    </div>

    <BottomNav />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useUserStore } from '../stores/user.js'
import BottomNav from '../components/BottomNav.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

const tabs = [
  { value: 'overview', label: '概览' },
  { value: 'transactions', label: '记账' },
  { value: 'assets', label: '资产' },
  { value: 'travel', label: '出行' }
]
const currentTab = ref('overview')

const stats = ref(null)
const assets = ref([])
const transactions = ref([])
const travelTransactions = ref([])
const recentTransactions = computed(() => transactions.value.slice(0, 8))

const filterType = ref('')
const filterCategory = ref('')
const filteredTransactions = computed(() => {
  let list = transactions.value
  if (filterType.value) list = list.filter(t => t.type === filterType.value)
  if (filterCategory.value) list = list.filter(t => t.category === filterCategory.value)
  return list
})

const categoryMap = {
  dining: { name: '餐饮', emoji: '🍔' },
  transport: { name: '交通', emoji: '🚌' },
  shopping: { name: '购物', emoji: '🛍️' },
  entertainment: { name: '娱乐', emoji: '🎮' },
  study: { name: '学习', emoji: '📚' },
  living: { name: '生活', emoji: '🏠' },
  medical: { name: '医疗', emoji: '💊' },
  gift: { name: '礼物', emoji: '🎁' },
  travel: { name: '出行', emoji: '🚗' },
  other: { name: '其他', emoji: '📝' }
}

const assetTypeMap = {
  cash: { name: '现金', emoji: '💵' },
  wechat: { name: '微信', emoji: '💬' },
  alipay: { name: '支付宝', emoji: '🔵' },
  bank: { name: '银行卡', emoji: '💳' },
  other: { name: '其他', emoji: '💰' }
}

const categoryList = computed(() => {
  if (!stats.value) return []
  return Object.entries(categoryMap).map(([key, info]) => {
    const item = stats.value.categoryStats[key] || { expense: 0, budget: 0 }
    return { key, name: info.name, emoji: info.emoji, expense: item.expense, budget: item.budget, ratio: item.budget > 0 ? item.expense / item.budget : 0 }
  })
})

const travelRingDash = computed(() => {
  if (!stats.value) return '0 264'
  const ratio = Math.min(1, stats.value.travel.used / (stats.value.travel.limit || 1))
  return `${ratio * 264} 264`
})

// 弹窗状态
const showTxnModal = ref(false)
const showAssetModal = ref(false)
const showSettingsModal = ref(false)
const editingTxn = ref(null)
const editingAsset = ref(null)
const submitting = ref(false)

const txnForm = ref({ type: 'expense', amount: '', category: 'dining', accountId: '', date: getTodayStr(), note: '' })
const assetForm = ref({ name: '', type: 'cash', balance: 0 })
const settingsForm = ref({ monthlyBudget: 3000, travelQuota: { period: 'monthly', limit: 4 } })

const txnValid = computed(() => txnForm.value.amount > 0 && txnForm.value.category && txnForm.value.date)
const assetValid = computed(() => assetForm.value.name?.trim())

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(n) {
  if (n === undefined || n === null) return '0.00'
  return Number(n).toFixed(2)
}

function formatDate(iso) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return '今天'
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function openAddModal() {
  if (currentTab.value === 'assets') {
    editingAsset.value = null
    assetForm.value = { name: '', type: 'cash', balance: 0 }
    showAssetModal.value = true
  } else {
    editingTxn.value = null
    txnForm.value = { type: 'expense', amount: '', category: 'dining', accountId: '', date: getTodayStr(), note: '' }
    showTxnModal.value = true
  }
}

function closeTxnModal() { showTxnModal.value = false; editingTxn.value = null }
function closeAssetModal() { showAssetModal.value = false; editingAsset.value = null }

function editTransaction(txn) {
  editingTxn.value = txn
  txnForm.value = {
    type: txn.type,
    amount: txn.amount,
    category: txn.category,
    accountId: txn.accountId || '',
    date: formatDateLocal(txn.date),
    note: txn.note || ''
  }
  showTxnModal.value = true
}

function editAsset(asset) {
  editingAsset.value = asset
  assetForm.value = { name: asset.name, type: asset.type, balance: asset.balance }
  showAssetModal.value = true
}

function formatDateLocal(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function submitTxn() {
  if (!txnValid.value) return
  submitting.value = true
  try {
    const url = editingTxn.value ? `/api/budget/transactions/${editingTxn.value._id}` : '/api/budget/transactions'
    const method = editingTxn.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(txnForm.value)
    })
    const data = await res.json()
    if (data.success) {
      closeTxnModal()
      await fetchAll()
    } else {
      alert(data.message || '保存失败')
    }
  } catch (e) {
    console.error(e)
    alert('网络错误')
  } finally {
    submitting.value = false
  }
}

async function submitAsset() {
  if (!assetValid.value) return
  submitting.value = true
  try {
    const url = editingAsset.value ? `/api/budget/assets/${editingAsset.value._id}` : '/api/budget/assets'
    const method = editingAsset.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(assetForm.value)
    })
    const data = await res.json()
    if (data.success) {
      closeAssetModal()
      await fetchAll()
    } else {
      alert(data.message || '保存失败')
    }
  } catch (e) {
    console.error(e)
    alert('网络错误')
  } finally {
    submitting.value = false
  }
}

async function deleteAsset() {
  if (!editingAsset.value) return
  if (!confirm('确定删除这个账户吗？关联记录将不再影响余额。')) return
  submitting.value = true
  try {
    const res = await fetch(`/api/budget/assets/${editingAsset.value._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      closeAssetModal()
      await fetchAll()
    }
  } catch (e) {
    console.error(e)
  } finally {
    submitting.value = false
  }
}

async function saveSettings() {
  submitting.value = true
  try {
    const res = await fetch('/api/budget/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(settingsForm.value)
    })
    const data = await res.json()
    if (data.success) {
      showSettingsModal.value = false
      await fetchAll()
    } else {
      alert(data.message || '保存失败')
    }
  } catch (e) {
    console.error(e)
    alert('网络错误')
  } finally {
    submitting.value = false
  }
}

async function fetchAll() {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const [statsRes, assetsRes, txnRes, settingsRes] = await Promise.all([
      fetch('/api/budget/stats', { headers: { Authorization: 'Bearer ' + token } }),
      fetch('/api/budget/assets', { headers: { Authorization: 'Bearer ' + token } }),
      fetch('/api/budget/transactions', { headers: { Authorization: 'Bearer ' + token } }),
      fetch('/api/budget/settings', { headers: { Authorization: 'Bearer ' + token } })
    ])
    const [s, a, t, set] = await Promise.all([statsRes.json(), assetsRes.json(), txnRes.json(), settingsRes.json()])
    if (s.success) stats.value = s.data
    if (a.success) assets.value = a.data
    if (t.success) {
      transactions.value = t.data
      travelTransactions.value = t.data.filter(x => x.category === 'travel' && x.type === 'expense')
    }
    if (set.success && set.data) {
      settingsForm.value.monthlyBudget = set.data.monthlyBudget || 3000
      settingsForm.value.travelQuota = set.data.travelQuota || { period: 'monthly', limit: 4 }
    }
  } catch (e) {
    console.error('[Budget] 加载失败:', e)
  }
}

onMounted(() => {
  fetchAll()
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

.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 20px;
  position: relative;
  z-index: 1;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px 10px;
  text-align: center;
}
.stat-card.expense {
  border-top: 3px solid #ff6b6b;
}
.stat-card.remaining {
  border-top: 3px solid #4cd964;
}
.stat-card.remaining.danger {
  border-top-color: #ff3b30;
}
.stat-card.travel {
  border-top: 3px solid #5ac8fa;
}
.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}
.stat-bar {
  height: 4px;
  background: var(--bg-secondary);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 6px;
}
.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #FED0D6, #FF97AF);
  border-radius: 2px;
  transition: width 0.5s ease;
}
.stat-card.remaining .stat-bar-fill {
  background: linear-gradient(90deg, #4cd964, #34c759);
}
.stat-card.remaining.danger .stat-bar-fill {
  background: linear-gradient(90deg, #ff3b30, #ff6b6b);
}
.stat-card.travel .stat-bar-fill {
  background: linear-gradient(90deg, #5ac8fa, #007aff);
}
.stat-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

/* Tab */
.filter-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.filter-tab {
  flex: 1;
  padding: 10px 6px;
  text-align: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  color: var(--text-primary);
}
.filter-tab.active {
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  border-color: transparent;
  color: white;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 20px 0 12px;
  color: var(--text-primary);
}

/* 分类预算 */
.category-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.category-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 12px 14px;
}
.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.category-emoji {
  font-size: 18px;
}
.category-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}
.category-amount {
  font-size: 12px;
  color: var(--text-secondary);
}
.category-bar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}
.category-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #4cd964, #34c759);
  border-radius: 3px;
  transition: width 0.5s ease;
}
.category-bar-fill.warning {
  background: linear-gradient(90deg, #ffcc00, #ff9500);
}
.category-bar-fill.danger {
  background: linear-gradient(90deg, #ff3b30, #ff6b6b);
}

/* 交易列表 */
.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.txn-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}
.txn-item:active {
  transform: scale(0.98);
}
.txn-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.txn-info {
  flex: 1;
  min-width: 0;
}
.txn-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.txn-date {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.txn-amount {
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}
.txn-amount.expense {
  color: #ff3b30;
}
.txn-amount.income {
  color: #34c759;
}

/* 空状态 */
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
.empty-mini {
  text-align: center;
  padding: 30px;
  color: var(--text-tertiary);
  font-size: 13px;
}

/* 资产 */
.asset-total {
  text-align: center;
  padding: 24px;
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
  color: white;
}
.asset-total-label {
  font-size: 13px;
  opacity: 0.9;
  margin-bottom: 8px;
}
.asset-total-value {
  font-size: 28px;
  font-weight: 700;
}
.asset-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.asset-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px;
  cursor: pointer;
}
.asset-icon {
  font-size: 24px;
}
.asset-info {
  flex: 1;
}
.asset-name {
  font-size: 14px;
  font-weight: 500;
}
.asset-type {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}
.asset-balance {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

/* 出行 */
.travel-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 16px;
}
.travel-ring {
  position: relative;
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}
.travel-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: var(--bg-secondary);
  stroke-width: 8;
}
.ring-fill {
  fill: none;
  stroke: url(#travelGradient);
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}
.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-value {
  font-size: 28px;
  font-weight: 700;
}
.ring-limit {
  font-size: 14px;
  color: var(--text-secondary);
}
.travel-info {
  flex: 1;
}
.travel-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 6px;
}
.travel-hint {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 筛选 */
.txn-filters {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.filter-select {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-card);
  font-size: 13px;
  color: var(--text-primary);
}

/* 浮动按钮 */
.fab-btn {
  position: fixed;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 50;
}
.fab-btn:hover {
  transform: scale(1.1);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
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
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(100%); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
}
.btn-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: var(--bg-secondary);
  font-size: 20px;
  cursor: pointer;
}
.modal-body {
  padding: 20px;
}
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 16px 20px 20px;
  border-top: 1px solid var(--border-color);
}
.modal-footer .btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.btn-primary {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
  color: white;
}
.btn-primary:disabled {
  opacity: 0.6;
}
.btn-danger {
  background: #ffebee;
  color: #c62828;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
}
.form-group .required {
  color: #ff4444;
}
.form-group input,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  background: var(--bg-secondary);
  box-sizing: border-box;
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.type-toggle button {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
}
.type-toggle button.active {
  background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
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
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.category-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 4px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 12px;
}
.category-btn.active {
  background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
  border-color: transparent;
  color: white;
}
.c-emoji {
  font-size: 20px;
}
.c-name {
  font-size: 11px;
}
</style>
