<template>
  <div class="budget-page">
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" @click="$router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <span class="header-title">资产管理</span>
        <button class="icon-btn" @click="showSettingsModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </header>

    <main class="main">
      <!-- ========== 资产总览 ========== -->
      <div class="wealth-hero" v-if="accountSummary">
        <div class="net-worth-card">
          <div class="net-worth-label">净资产</div>
          <div class="net-worth-amount">
            <span class="currency">{{ accountSummary.baseCurrency }}</span>
            <span class="number">{{ formatMoney(accountSummary.netWorth) }}</span>
          </div>
          <div class="net-worth-sub">
            <span>汇率更新于 {{ accountSummary.rateDate || '今日' }}</span>
          </div>
        </div>

        <div class="wealth-mini-row">
          <div class="wealth-mini asset">
            <div class="mini-icon">📈</div>
            <div class="mini-info">
              <div class="mini-label">总资产</div>
              <div class="mini-value">{{ formatMoney(accountSummary.totalAsset) }}</div>
            </div>
          </div>
          <div class="wealth-mini liability">
            <div class="mini-icon">📉</div>
            <div class="mini-info">
              <div class="mini-label">总负债</div>
              <div class="mini-value">{{ formatMoney(accountSummary.totalLiability) }}</div>
            </div>
          </div>
        </div>

        <!-- 多币种原始金额 -->
        <div class="currency-row" v-if="accountSummary.byCurrency?.length">
          <div class="currency-chip" v-for="c in accountSummary.byCurrency" :key="c.currency">
            <span class="chip-currency">{{ c.currency }}</span>
            <span class="chip-net" :class="{ negative: c.net < 0 }">{{ c.net >= 0 ? '+' : '' }}{{ formatMoney(c.net) }}</span>
          </div>
        </div>
      </div>

      <!-- ========== 账户列表 ========== -->
      <div class="accounts-section">
        <div class="section-header">
          <span class="section-title">我的账户</span>
          <button class="section-action" @click="openAccountModal()">管理</button>
        </div>

        <!-- 资产账户 -->
        <div class="account-group" v-if="assetAccounts.length">
          <div class="group-label">资产</div>
          <div class="account-cards">
            <div class="account-card" v-for="acc in assetAccounts" :key="acc._id" :style="{ borderLeftColor: acc.color }">
              <div class="account-card-top">
                <span class="account-icon">{{ acc.icon }}</span>
                <span class="account-currency">{{ acc.currency }}</span>
              </div>
              <div class="account-card-name">{{ acc.name }}</div>
              <div class="account-card-balance">{{ formatMoney(acc.balance) }}</div>
              <div class="account-card-converted" v-if="acc.converted !== null && acc.converted !== acc.balance">
                ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 负债账户 -->
        <div class="account-group" v-if="liabilityAccounts.length">
          <div class="group-label">负债</div>
          <div class="account-cards">
            <div class="account-card liability" v-for="acc in liabilityAccounts" :key="acc._id" :style="{ borderLeftColor: acc.color }">
              <div class="account-card-top">
                <span class="account-icon">{{ acc.icon }}</span>
                <span class="account-currency">{{ acc.currency }}</span>
              </div>
              <div class="account-card-name">{{ acc.name }}</div>
              <div class="account-card-balance">{{ formatMoney(acc.balance) }}</div>
              <div class="account-card-converted" v-if="acc.converted !== null && acc.converted !== acc.balance">
                ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="!accounts.length" class="account-empty" @click="openAccountModal()">
          <div class="empty-icon">🏦</div>
          <p>还没有账户，点击添加</p>
        </div>
      </div>

      <!-- ========== 本月收支 mini ========== -->
      <div class="month-summary" v-if="stats">
        <div class="month-card income">
          <div class="month-label">本月收入</div>
          <div class="month-value">+¥{{ formatMoney(stats.income || 0) }}</div>
        </div>
        <div class="month-card expense">
          <div class="month-label">本月支出</div>
          <div class="month-value">-¥{{ formatMoney(stats.expense || 0) }}</div>
        </div>
        <div class="month-card balance">
          <div class="month-label">结余</div>
          <div class="month-value" :class="{ negative: (stats.balance || 0) < 0 }">
            {{ (stats.balance || 0) >= 0 ? '+' : '' }}¥{{ formatMoney(stats.balance || 0) }}
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
                    <div class="item-left">
                      <span class="item-category">{{ txn.category }}</span>
                      <span class="item-account" v-if="txn.accountName">{{ txn.accountName }}</span>
                    </div>
                    <span class="item-amount" :class="txn.type">
                      {{ txn.type === 'income' ? '+' : '-' }}{{ txn.currency !== 'CNY' ? txn.currency : '¥' }}{{ formatMoney(txn.amount) }}
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
            <div class="amount-row">
              <select v-model="txnForm.currency" class="currency-select">
                <option value="CNY">¥ CNY</option>
                <option value="USD">$ USD</option>
                <option value="KRW">₩ KRW</option>
                <option value="EUR">€ EUR</option>
                <option value="JPY">¥ JPY</option>
                <option value="HKD">$ HKD</option>
              </select>
              <input v-model="txnForm.amount" type="number" placeholder="0.00" step="0.01" class="amount-input" />
            </div>
          </div>
          <div class="form-group">
            <label>账户</label>
            <div class="account-select-grid" v-if="accounts.length">
              <button
                v-for="acc in accounts"
                :key="acc._id"
                class="account-select-btn"
                :class="{ active: txnForm.accountId === acc._id }"
                @click="selectAccountForTxn(acc)"
              >
                <span class="as-icon">{{ acc.icon }}</span>
                <span class="as-name">{{ acc.name }}</span>
                <span class="as-currency">{{ acc.currency }}</span>
              </button>
              <button class="account-select-btn none" :class="{ active: !txnForm.accountId }" @click="txnForm.accountId = ''">
                <span class="as-icon">📝</span>
                <span class="as-name">不关联</span>
              </button>
            </div>
            <div v-else class="account-empty-hint">
              还没有账户，记账将不关联账户余额
            </div>
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

    <!-- ========== 账户管理弹窗 ========== -->
    <div class="modal-overlay" v-if="showAccountModal" @click.self="showAccountModal = false">
      <div class="modal-content account-modal" @click.stop>
        <div class="modal-header">
          <h3>{{ editingAccount ? '编辑账户' : '添加账户' }}</h3>
          <button class="btn-close" @click="showAccountModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>类型</label>
            <div class="type-toggle">
              <button :class="{ active: accountForm.type === 'asset' }" @click="accountForm.type = 'asset'">资产</button>
              <button :class="{ active: accountForm.type === 'liability' }" @click="accountForm.type = 'liability'">负债</button>
            </div>
          </div>
          <div class="form-group">
            <label>账户名称 <span class="required">*</span></label>
            <input v-model="accountForm.name" type="text" placeholder="如：招商银行" maxlength="30" />
          </div>
          <div class="form-group">
            <label>子类型</label>
            <div class="sub-type-grid">
              <button
                v-for="st in availableSubTypes"
                :key="st.value"
                class="sub-type-btn"
                :class="{ active: accountForm.subType === st.value }"
                @click="accountForm.subType = st.value"
              >
                <span class="st-icon">{{ st.icon }}</span>
                <span class="st-name">{{ st.label }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>币种</label>
            <select v-model="accountForm.currency">
              <option value="CNY">人民币 CNY</option>
              <option value="USD">美元 USD</option>
              <option value="KRW">韩元 KRW</option>
              <option value="EUR">欧元 EUR</option>
              <option value="JPY">日元 JPY</option>
              <option value="HKD">港币 HKD</option>
              <option value="GBP">英镑 GBP</option>
            </select>
          </div>
          <div class="form-group">
            <label>当前余额</label>
            <input v-model="accountForm.balance" type="number" placeholder="0.00" step="0.01" />
          </div>
          <div class="form-group inline">
            <label>图标</label>
            <input v-model="accountForm.icon" type="text" class="emoji-input" placeholder="💰" maxlength="10" />
          </div>
          <div class="form-group inline">
            <label>主题色</label>
            <div class="color-picker">
              <button
                v-for="c in presetColors"
                :key="c"
                class="color-dot"
                :class="{ active: accountForm.color === c }"
                :style="{ background: c }"
                @click="accountForm.color = c"
              ></button>
            </div>
          </div>

          <div class="divider" v-if="editingAccount"></div>
          <div v-if="editingAccount" class="account-manage-actions">
            <button class="btn btn-danger btn-block" @click="deleteAccount">删除此账户</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="cancelAccountEdit">取消</button>
          <button class="btn btn-primary" :disabled="!accountValid || submitting" @click="submitAccount">
            {{ submitting ? '保存中...' : (editingAccount ? '更新' : '添加') }}
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

    <!-- ========== 设置弹窗 ========== -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>账本设置</h3>
          <button class="btn-close" @click="showSettingsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-card" @click="openAccountModal()">
            <div class="settings-icon">🏦</div>
            <div class="settings-info">
              <div class="settings-name">管理账户</div>
              <div class="settings-hint">添加或编辑资产/负债账户</div>
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

const API_BUDGET = '/api/budget'
const API_ACCOUNT = '/api/accounts'
const API_RATE = '/api/exchange-rates'

// ========== 数据 ==========
const stats = ref(null)
const categories = ref([])
const transactions = ref([])
const accounts = ref([])
const accountSummary = ref(null)
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

const assetAccounts = computed(() => {
  if (!accountSummary.value?.details) return []
  return accountSummary.value.details.filter(a => a.type === 'asset')
})

const liabilityAccounts = computed(() => {
  if (!accountSummary.value?.details) return []
  return accountSummary.value.details.filter(a => a.type === 'liability')
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
const showAccountModal = ref(false)
const showSettingsModal = ref(false)
const editingTxn = ref(null)
const editingCategory = ref(null)
const editingAccount = ref(null)
const submitting = ref(false)

const txnForm = ref({ type: 'expense', amount: '', currency: 'CNY', category: '', accountId: '', date: getTodayStr(), note: '' })
const categoryForm = ref({ name: '', emoji: '📦', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' })
const accountForm = ref({ name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0, icon: '💰', color: '#6366f1' })
const settingsForm = ref({ monthlyBudget: 0 })

const txnValid = computed(() => txnForm.value.amount > 0 && txnForm.value.category && txnForm.value.date)
const categoryValid = computed(() => categoryForm.value.name?.trim())
const accountValid = computed(() => accountForm.value.name?.trim())

const presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6']

const subTypeOptions = [
  { value: 'wechat', label: '微信', icon: '💬', types: ['asset'] },
  { value: 'alipay', label: '支付宝', icon: '🔷', types: ['asset'] },
  { value: 'bank', label: '银行卡', icon: '🏦', types: ['asset'] },
  { value: 'cash', label: '现金', icon: '💵', types: ['asset'] },
  { value: 'investment', label: '投资', icon: '📈', types: ['asset'] },
  { value: 'other_asset', label: '其他资产', icon: '💰', types: ['asset'] },
  { value: 'huabei', label: '花呗', icon: '🌸', types: ['liability'] },
  { value: 'baitiao', label: '白条', icon: '🧾', types: ['liability'] },
  { value: 'credit_card', label: '信用卡', icon: '💳', types: ['liability'] },
  { value: 'loan', label: '借款', icon: '📉', types: ['liability'] },
  { value: 'other_liability', label: '其他负债', icon: '⚠️', types: ['liability'] }
]

const availableSubTypes = computed(() => {
  return subTypeOptions.filter(st => st.types.includes(accountForm.value.type))
})

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatMoney(n) {
  if (n === undefined || n === null) return '0.00'
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function toggleCategory(name) {
  selectedCategory.value = selectedCategory.value === name ? '' : name
}

// ========== 弹窗操作 ==========
function openTxnModal() {
  editingTxn.value = null
  txnForm.value = { type: 'expense', amount: '', currency: 'CNY', category: categories.value[0]?.name || '', accountId: '', date: getTodayStr(), note: '' }
  showTxnModal.value = true
}

function closeTxnModal() {
  showTxnModal.value = false
  editingTxn.value = null
}

function editTransaction(txn) {
  editingTxn.value = txn
  txnForm.value = {
    type: txn.type, amount: txn.amount, currency: txn.currency || 'CNY',
    category: txn.category, accountId: txn.accountId || '',
    date: formatDateLocal(txn.date), note: txn.note || ''
  }
  showTxnModal.value = true
}

function formatDateLocal(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function selectAccountForTxn(acc) {
  txnForm.value.accountId = acc._id
  txnForm.value.currency = acc.currency
}

function cancelCategoryEdit() {
  editingCategory.value = null
  categoryForm.value = { name: '', emoji: '📦', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' }
}

function editCategory(c) {
  editingCategory.value = c
  categoryForm.value = { name: c.name, emoji: c.emoji, budget: c.budget, quota: c.quota, quotaType: c.quotaType, period: c.period }
}

// ========== 账户弹窗 ==========
function openAccountModal(acc = null) {
  editingAccount.value = acc
  if (acc) {
    accountForm.value = {
      name: acc.name, type: acc.type, subType: acc.subType,
      currency: acc.currency, balance: acc.balance,
      icon: acc.icon, color: acc.color
    }
  } else {
    accountForm.value = { name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0, icon: '💰', color: '#6366f1' }
  }
  showAccountModal.value = true
  showSettingsModal.value = false
}

function cancelAccountEdit() {
  editingAccount.value = null
  accountForm.value = { name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0, icon: '💰', color: '#6366f1' }
  showAccountModal.value = false
}

// ========== API ==========
async function submitTxn() {
  if (!txnValid.value) return
  submitting.value = true
  try {
    const url = editingTxn.value ? `${API_BUDGET}/transactions/${editingTxn.value._id}` : `${API_BUDGET}/transactions`
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
    const res = await fetch(`${API_BUDGET}/transactions/${editingTxn.value._id}`, {
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
    const url = editingCategory.value ? `${API_BUDGET}/categories/${editingCategory.value._id}` : `${API_BUDGET}/categories`
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
    const res = await fetch(`${API_BUDGET}/categories/${c._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) await fetchAll()
  } catch (e) { console.error(e) }
}

async function submitAccount() {
  if (!accountValid.value) return
  submitting.value = true
  try {
    const url = editingAccount.value ? `${API_ACCOUNT}/${editingAccount.value._id}` : `${API_ACCOUNT}`
    const method = editingAccount.value ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(accountForm.value)
    })
    const data = await res.json()
    if (data.success) {
      cancelAccountEdit()
      await fetchAll()
    } else alert(data.message || '保存失败')
  } catch (e) {
    console.error(e); alert('网络错误')
  } finally { submitting.value = false }
}

async function deleteAccount() {
  if (!editingAccount.value) return
  if (!confirm(`确定删除账户「${editingAccount.value.name}」吗？账户余额将被移除，但历史交易记录保留。`)) return
  submitting.value = true
  try {
    const res = await fetch(`${API_ACCOUNT}/${editingAccount.value._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      cancelAccountEdit()
      await fetchAll()
    }
  } catch (e) { console.error(e) } finally { submitting.value = false }
}

async function saveSettings() {
  submitting.value = true
  try {
    const res = await fetch(`${API_BUDGET}/settings`, {
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
    const [statsRes, catRes, txnRes, settingsRes, accRes, summaryRes] = await Promise.all([
      fetch(`${API_BUDGET}/stats`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API_BUDGET}/categories`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API_BUDGET}/transactions`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API_BUDGET}/settings`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API_ACCOUNT}`, { headers: { Authorization: 'Bearer ' + token } }),
      fetch(`${API_ACCOUNT}/summary`, { headers: { Authorization: 'Bearer ' + token } })
    ])
    const [s, c, t, set, a, sum] = await Promise.all([
      statsRes.json(), catRes.json(), txnRes.json(), settingsRes.json(), accRes.json(), summaryRes.json()
    ])
    if (s.success) stats.value = s.data
    if (c.success) categories.value = c.data
    if (t.success) {
      // 为交易补充账户名称
      const accountMap = {}
      if (a.success) {
        a.data.forEach(acc => { accountMap[acc._id] = acc.name })
      }
      transactions.value = t.data.map(txn => ({ ...txn, accountName: txn.accountId ? accountMap[txn.accountId] : '' }))
    }
    if (set.success && set.data) {
      settingsForm.value.monthlyBudget = set.data.monthlyBudget || 0
    }
    if (a.success) accounts.value = a.data
    if (sum.success) accountSummary.value = sum.data
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
    if (data.success && data.user) {
      const me = data.user
      const partner = data.user.partner
      const map = {}
      const list = []
      if (me) { map[me.id] = me.nickname || '我'; list.push({ id: me.id, nickname: me.nickname || '我' }) }
      if (partner) {
        const pPronoun = partner.gender === 'male' ? '他' : partner.gender === 'female' ? '她' : 'TA'
        map[partner.id] = partner.nickname || pPronoun
        list.push({ id: partner.id, nickname: partner.nickname || pPronoun, gender: partner.gender })
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
    window.eventBus.on('accountSync', () => fetchAll())
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
  opacity: 0.3;
}
.orb-1 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  top: -180px;
  right: -120px;
}
.orb-2 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  bottom: 10%;
  left: -140px;
}
.orb-3 {
  width: 280px;
  height: 280px;
  background: linear-gradient(135deg, #f43f5e 0%, #f97316 100%);
  top: 40%;
  right: -100px;
  opacity: 0.15;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 20px 16px;
  background: rgba(253, 253, 245, 0.8);
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

/* ========== 资产总览 ========== */
.wealth-hero {
  margin-bottom: 24px;
}
.net-worth-card {
  background: linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 28px;
  padding: 32px 24px 28px;
  text-align: center;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(10px);
}
.net-worth-card::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 50% 0%, rgba(99,102,241,0.06) 0%, transparent 60%);
  pointer-events: none;
}
.net-worth-label {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  margin-bottom: 8px;
  text-transform: uppercase;
}
.net-worth-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 8px;
}
.net-worth-amount .currency {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-secondary);
}
.net-worth-amount .number {
  font-size: 40px;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #1e3a5f 0%, #5e3a7a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.net-worth-sub {
  font-size: 11px;
  color: var(--text-tertiary);
}

.wealth-mini-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 14px;
}
.wealth-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  transition: transform 0.2s;
}
.wealth-mini:active { transform: scale(0.97); }
.mini-icon { font-size: 24px; }
.mini-info { flex: 1; }
.mini-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 4px; }
.mini-value { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.wealth-mini.asset .mini-value { color: #22c55e; }
.wealth-mini.liability .mini-value { color: #f43f5e; }

.currency-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.currency-row::-webkit-scrollbar { display: none; }
.currency-chip {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
}
.chip-currency { font-size: 11px; color: var(--text-tertiary); font-weight: 600; }
.chip-net { font-size: 13px; font-weight: 700; color: #22c55e; }
.chip-net.negative { color: #f43f5e; }

/* ========== 账户列表 ========== */
.accounts-section {
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

.account-group {
  margin-bottom: 16px;
}
.group-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-left: 4px;
}
.account-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.account-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 16px;
  border-left-width: 4px;
  transition: transform 0.2s, box-shadow 0.2s;
  cursor: pointer;
}
.account-card:active { transform: scale(0.97); }
.account-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.account-icon { font-size: 22px; }
.account-currency {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 100px;
}
.account-card-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.account-card-balance {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.3px;
}
.account-card-converted {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-top: 4px;
}
.account-card.liability .account-card-balance { color: #f43f5e; }

.account-empty {
  text-align: center;
  padding: 40px 20px;
  background: var(--bg-card);
  border: 2px dashed var(--border-color);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}
.account-empty:active { transform: scale(0.98); }
.account-empty .empty-icon { font-size: 40px; margin-bottom: 8px; }
.account-empty p { font-size: 13px; color: var(--text-tertiary); }

/* ========== 本月收支 ========== */
.month-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 24px;
}
.month-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 18px;
  padding: 14px 10px;
  text-align: center;
  transition: transform 0.2s;
}
.month-card:active { transform: scale(0.97); }
.month-label {
  font-size: 11px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}
.month-value {
  font-size: 15px;
  font-weight: 700;
}
.month-card.income .month-value { color: #22c55e; }
.month-card.expense .month-value { color: #f43f5e; }
.month-card.balance .month-value { color: var(--text-primary); }
.month-card.balance .month-value.negative { color: #f43f5e; }

/* ========== 分类 ========== */
.category-section {
  margin-bottom: 24px;
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
  box-shadow: 0 4px 12px rgba(99,102,241,0.25);
}
.category-pill.all { font-weight: 600; }
.pill-emoji { font-size: 15px; }
.pill-name { font-weight: 500; }
.pill-amount { font-size: 11px; opacity: 0.7; }
.pill-quota {
  font-size: 10px;
  background: #f43f5e;
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
.timeline-section { margin-bottom: 24px; }
.timeline {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.timeline-day { position: relative; }
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
.day-income { color: #22c55e; }
.day-expense { color: #f43f5e; }

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
  border-radius: 18px;
  padding: 14px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.timeline-item:active { transform: scale(0.98); }
.item-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.item-body { flex: 1; min-width: 0; }
.item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.item-category {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}
.item-account {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 1px 8px;
  border-radius: 100px;
  flex-shrink: 0;
}
.item-amount {
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
}
.item-amount.expense { color: #f43f5e; }
.item-amount.income { color: #22c55e; }
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 32px;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(99,102,241,0.35);
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
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(10px);
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
  border-radius: 28px;
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
  border-radius: 16px;
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
}
.btn-primary:disabled { opacity: 0.5; }
.btn-danger {
  background: #fef2f2;
  color: #dc2626;
}
.btn-block { width: 100%; }

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
.form-group .required { color: #f43f5e; }
.form-group input,
.form-group select {
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 15px;
  background: var(--bg-secondary);
  box-sizing: border-box;
  color: var(--text-primary);
}
.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #6366f1;
}

.type-toggle {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.type-toggle button {
  flex: 1;
  padding: 14px;
  border-radius: 16px;
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
  background: linear-gradient(135deg, #f43f5e 0%, #f97316 100%);
}
.type-toggle button.active:last-child {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
}

.amount-row {
  display: flex;
  gap: 10px;
}
.currency-select {
  width: 110px;
  flex-shrink: 0;
  padding: 14px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  font-size: 15px;
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.amount-input {
  flex: 1;
}

/* 账户选择 */
.account-select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.account-select-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 16px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text-primary);
}
.account-select-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.account-select-btn.none { opacity: 0.7; }
.as-icon { font-size: 20px; }
.as-name { font-size: 11px; font-weight: 500; }
.as-currency { font-size: 9px; opacity: 0.7; }
.account-empty-hint {
  text-align: center;
  padding: 16px;
  color: var(--text-tertiary);
  font-size: 13px;
  background: var(--bg-secondary);
  border-radius: 16px;
}

/* 子类型 */
.sub-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sub-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 2px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text-primary);
}
.sub-type-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.st-icon { font-size: 20px; }
.st-name { font-size: 10px; }

/* 颜色选择 */
.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.color-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.2s;
}
.color-dot.active {
  border-color: var(--text-primary);
  transform: scale(1.15);
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
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
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
.manage-btn.danger { color: #f43f5e; }

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
