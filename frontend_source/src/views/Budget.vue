<template>
  <div class="budget-page">
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>

    <header class="header">
      <div class="header-content">
        <button class="icon-btn back" @click="$router.back()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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

      <!-- Tab 导航 -->
      <div class="tab-nav">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="tab-btn"
          :class="{ active: activeTab === t.key }"
          @click="activeTab = t.key"
        >
          <span class="tab-label">{{ t.label }}</span>
        </button>
      </div>
    </header>

    <main class="main">

      <!-- ==================== TAB 1: 资产 ==================== -->
      <div v-if="activeTab === 'assets'" class="tab-panel">
        <!-- 双人资产大屏 -->
        <div class="hero-grid" v-if="mySummary || partnerSummary">
          <div class="hero-card me" v-if="mySummary">
            <div class="hero-name">{{ mySummary.userName }}</div>
            <div class="hero-label">净资产</div>
            <div class="hero-amount">
              <span class="hero-number">{{ formatMoney(mySummary.netWorth) }}</span>
            </div>
            <div class="hero-row">
              <div class="hero-item">
                <span class="hi-label">资产</span>
                <span class="hi-value up">{{ formatMoney(mySummary.totalAsset) }}</span>
              </div>
              <div class="hero-divider"></div>
              <div class="hero-item">
                <span class="hi-label">负债</span>
                <span class="hi-value down">{{ formatMoney(mySummary.totalLiability) }}</span>
              </div>
            </div>
          </div>
          <div class="hero-card partner" v-if="partnerSummary">
            <div class="hero-name">{{ partnerSummary.userName }}</div>
            <div class="hero-label">净资产</div>
            <div class="hero-amount">
              <span class="hero-number">{{ formatMoney(partnerSummary.netWorth) }}</span>
            </div>
            <div class="hero-row">
              <div class="hero-item">
                <span class="hi-label">资产</span>
                <span class="hi-value up">{{ formatMoney(partnerSummary.totalAsset) }}</span>
              </div>
              <div class="hero-divider"></div>
              <div class="hero-item">
                <span class="hi-label">负债</span>
                <span class="hi-value down">{{ formatMoney(partnerSummary.totalLiability) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 账户列表 -->
        <div class="accounts-area">
          <div class="owner-switch">
            <button
              v-for="u in userSummaries"
              :key="u.userId"
              class="owner-btn"
              :class="{ active: selectedOwner === u.userId }"
              @click="selectedOwner = u.userId"
            >
              {{ u.userName }}的账户
            </button>
          </div>

          <div class="account-section" v-if="currentOwnerAssets.length">
            <div class="acc-label">资产 {{ formatMoney(currentOwnerSummary?.totalAsset || 0) }}</div>
            <div class="acc-list">
              <div class="acc-row" v-for="acc in currentOwnerAssets" :key="acc._id" @click="openAccountModal(acc)">
                <div class="acc-left">
                  <div class="acc-info">
                    <div class="acc-name">{{ acc.name }}</div>
                    <div class="acc-sub">{{ subTypeLabel(acc.subType) }} · {{ acc.currency }}</div>
                  </div>
                </div>
                <div class="acc-right">
                  <div class="acc-balance">{{ formatMoney(acc.balance) }}</div>
                  <div class="acc-converted" v-if="acc.converted !== null && acc.converted !== acc.balance">
                    ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="account-section" v-if="currentOwnerLiabilities.length">
            <div class="acc-label liability">负债 {{ formatMoney(currentOwnerSummary?.totalLiability || 0) }}</div>
            <div class="acc-list">
              <div class="acc-row liability" v-for="acc in currentOwnerLiabilities" :key="acc._id" @click="openAccountModal(acc)">
                <div class="acc-left">
                  <div class="acc-info">
                    <div class="acc-name">{{ acc.name }}</div>
                    <div class="acc-sub">{{ subTypeLabel(acc.subType) }} · {{ acc.currency }}</div>
                  </div>
                </div>
                <div class="acc-right">
                  <div class="acc-balance">{{ formatMoney(acc.balance) }}</div>
                  <div class="acc-converted" v-if="acc.converted !== null && acc.converted !== acc.balance">
                    ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button class="add-account-btn" @click="openAccountModal()">
            <span>+</span> 添加账户
          </button>
        </div>
      </div>

      <!-- ==================== TAB 2: 记账 ==================== -->
      <div v-if="activeTab === 'record'" class="tab-panel">
        <div class="record-card">
          <div class="record-type">
            <button :class="{ active: txnForm.type === 'expense' }" @click="txnForm.type = 'expense'">支出</button>
            <button :class="{ active: txnForm.type === 'income' }" @click="txnForm.type = 'income'">收入</button>
          </div>

          <div class="record-amount">
            <select v-model="txnForm.currency" class="ra-currency">
              <option value="CNY">¥</option>
              <option value="USD">$</option>
              <option value="KRW">₩</option>
              <option value="EUR">€</option>
              <option value="JPY">¥</option>
              <option value="HKD">$</option>
            </select>
            <input v-model="txnForm.amount" type="number" placeholder="0.00" step="0.01" class="ra-input" />
          </div>

          <div class="record-section">
            <div class="rs-label">选择账户</div>
            <div class="rs-accounts" v-if="accounts.length">
              <button
                v-for="acc in accounts"
                :key="acc._id"
                class="rs-account"
                :class="{ active: txnForm.accountId === acc._id }"
                @click="selectAccountForTxn(acc)"
              >
                <span class="rsa-name">{{ acc.name }}</span>
                <span class="rsa-currency">{{ acc.currency }}</span>
              </button>
              <button class="rs-account none" :class="{ active: !txnForm.accountId }" @click="txnForm.accountId = ''">
                <span class="rsa-name">不关联</span>
              </button>
            </div>
            <div v-else class="rs-empty">还没有账户，记账将不关联余额</div>
          </div>

          <div class="record-section">
            <div class="rs-label">选择分类</div>
            <div class="rs-categories" v-if="categories.length">
              <button
                v-for="c in categories"
                :key="c._id"
                class="rs-category"
                :class="{ active: txnForm.category === c.name }"
                @click="txnForm.category = c.name"
              >
                <span class="rsc-name">{{ c.name }}</span>
              </button>
            </div>
            <div v-else class="rs-empty">还没有分类，请先创建</div>
          </div>

          <div class="record-inline">
            <div class="ri-group">
              <label>日期</label>
              <DatePickerField v-model="txnForm.date" />
            </div>
            <div class="ri-group">
              <label>备注</label>
              <input v-model="txnForm.note" type="text" placeholder="可选" maxlength="100" />
            </div>
          </div>

          <button class="record-submit" :disabled="!txnValid || submitting" @click="submitTxn">
            {{ submitting ? '保存中...' : '记一笔' }}
          </button>
        </div>
      </div>

      <!-- ==================== TAB 3: 明细 ==================== -->
      <div v-if="activeTab === 'detail'" class="tab-panel">
        <!-- 月份选择 -->
        <div class="month-bar">
          <button class="month-arrow" @click="prevMonth">‹</button>
          <span class="month-title">{{ currentYearMonth }}</span>
          <button class="month-arrow" @click="nextMonth">›</button>
        </div>

        <!-- 收支结余 -->
        <div class="summary-bar" v-if="monthStats">
          <div class="sum-item income">
            <div class="sum-label">收入</div>
            <div class="sum-value">+{{ formatMoney(monthStats.income) }}</div>
          </div>
          <div class="sum-item expense">
            <div class="sum-label">支出</div>
            <div class="sum-value">-{{ formatMoney(monthStats.expense) }}</div>
          </div>
          <div class="sum-item balance">
            <div class="sum-label">结余</div>
            <div class="sum-value" :class="{ negative: monthStats.balance < 0 }">{{ monthStats.balance >= 0 ? '+' : '' }}{{ formatMoney(monthStats.balance) }}</div>
          </div>
        </div>

        <!-- 分类筛选 -->
        <div class="filter-pills" v-if="categories.length">
          <button
            v-for="c in categories"
            :key="c._id"
            class="fp-pill"
            :class="{ active: selectedCategory === c.name }"
            @click="toggleCategory(c.name)"
          >
            {{ c.name }}
          </button>
          <button class="fp-pill all" :class="{ active: !selectedCategory }" @click="selectedCategory = ''">全部</button>
        </div>

        <!-- 交易列表 -->
        <div class="txn-list" v-if="groupedTransactions.length">
          <div class="txn-day" v-for="day in groupedTransactions" :key="day.date">
            <div class="day-line">
              <span class="day-name">{{ day.label }}</span>
              <span class="day-nums">
                <span v-if="day.income > 0" class="d-income">+{{ formatMoney(day.income) }}</span>
                <span v-if="day.expense > 0" class="d-expense">-{{ formatMoney(day.expense) }}</span>
              </span>
            </div>
            <div class="day-txns">
              <div v-for="txn in day.items" :key="txn._id" class="txn-row" @click="editTransaction(txn)">
                <div class="txn-body">
                  <div class="txn-top">
                    <span class="txn-cat">{{ txn.category }}</span>
                    <span class="txn-amt" :class="txn.type">
                      {{ txn.type === 'income' ? '+' : '-' }}{{ txn.currency !== 'CNY' ? txn.currency : '¥' }}{{ formatMoney(txn.amount) }}
                    </span>
                  </div>
                  <div class="txn-bot">
                    <span v-if="txn.accountName" class="txn-acc">{{ txn.accountName }}</span>
                    <span v-if="txn.note" class="txn-note">{{ txn.note }}</span>
                    <span v-if="userMap[txn.creatorId]" class="txn-by">{{ userMap[txn.creatorId] }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-block">
          <p>本月暂无记录</p>
        </div>
      </div>
    </main>

    <!-- ========== 账户管理弹窗 ========== -->
    <div class="modal-overlay" v-if="showAccountModal" @click.self="showAccountModal = false">
      <div class="modal-content" @click.stop>
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

          <div class="divider" v-if="editingAccount"></div>
          <div v-if="editingAccount">
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

    <!-- ========== 设置弹窗 ========== -->
    <div class="modal-overlay" v-if="showSettingsModal" @click.self="showSettingsModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>账本设置</h3>
          <button class="btn-close" @click="showSettingsModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="settings-card" @click="activeTab = 'assets'; showSettingsModal = false; openAccountModal()">
            <div class="settings-info">
              <div class="settings-name">管理账户</div>
              <div class="settings-hint">添加或编辑资产/负债账户</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
          <div class="settings-card" @click="activeTab = 'record'; showSettingsModal = false; showCategoryModal = true">
            <div class="settings-info">
              <div class="settings-name">管理分类</div>
              <div class="settings-hint">添加或编辑收支分类</div>
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
                <div class="manage-info">
                  <div class="manage-name">{{ c.name }}</div>
                  <div class="manage-meta">
                    <span v-if="c.budget > 0">预算 ¥{{ c.budget }}</span>
                    <span v-if="c.quota > 0">{{ c.quotaType === 'count' ? '限次' : '限额' }} {{ c.quota }}/{{ periodLabel(c.period) }}</span>
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
            <input v-model="categoryForm.name" type="text" placeholder="分类名称" maxlength="20" />
          </div>
          <div class="form-group inline">
            <label>月度预算</label>
            <input v-model.number="categoryForm.budget" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>限制类型</label>
            <select v-model="categoryForm.quotaType"><option value="count">次数</option><option value="amount">金额</option></select>
          </div>
          <div class="form-group inline">
            <label>限制数量</label>
            <input v-model.number="categoryForm.quota" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>周期</label>
            <select v-model="categoryForm.period"><option value="weekly">每周</option><option value="monthly">每月</option><option value="yearly">每年</option></select>
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

    <!-- 编辑交易弹窗 -->
    <div class="modal-overlay" v-if="showTxnModal" @click.self="closeTxnModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑记录</h3>
          <button class="btn-close" @click="closeTxnModal">×</button>
        </div>
        <div class="modal-body">
          <div class="type-toggle">
            <button :class="{ active: txnForm.type === 'expense' }" @click="txnForm.type = 'expense'">支出</button>
            <button :class="{ active: txnForm.type === 'income' }" @click="txnForm.type = 'income'">收入</button>
          </div>
          <div class="form-group">
            <label>金额</label>
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
              <button v-for="acc in accounts" :key="acc._id" class="account-select-btn" :class="{ active: txnForm.accountId === acc._id }" @click="selectAccountForTxn(acc)">
                <span class="as-name">{{ acc.name }}</span>
                <span class="as-currency">{{ acc.currency }}</span>
              </button>
              <button class="account-select-btn none" :class="{ active: !txnForm.accountId }" @click="txnForm.accountId = ''">
                <span class="as-name">不关联</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>分类</label>
            <div class="category-grid" v-if="categories.length">
              <button v-for="c in categories" :key="c._id" class="category-btn" :class="{ active: txnForm.category === c.name }" @click="txnForm.category = c.name">
                <span class="c-name">{{ c.name }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>日期</label>
            <DatePickerField v-model="txnForm.date" />
          </div>
          <div class="form-group">
            <label>备注</label>
            <input v-model="txnForm.note" type="text" placeholder="可选" maxlength="100" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-danger" @click="deleteTransaction">删除</button>
          <button class="btn btn-secondary" @click="closeTxnModal">取消</button>
          <button class="btn btn-primary" :disabled="!txnValid || submitting" @click="submitTxn">保存</button>
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
import DatePickerField from '../components/DatePickerField.vue'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

const API_BUDGET = '/api/budget'
const API_ACCOUNT = '/api/accounts'

const tabs = [
  { key: 'assets', label: '资产' },
  { key: 'record', label: '记账' },
  { key: 'detail', label: '明细' }
]

// ========== 全局数据 ==========
const activeTab = ref('assets')
const stats = ref(null)
const categories = ref([])
const transactions = ref([])
const accounts = ref([])
const accountSummary = ref(null)
const selectedCategory = ref('')
const userMap = ref({})
const userList = ref([])
const submitting = ref(false)

// 资产页：选择查看谁的账户
const selectedOwner = ref('')

// 明细页：月份筛选
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// ========== 计算属性 ==========
const mySummary = computed(() => {
  if (!accountSummary.value?.byUser || !currentUserId.value) return null
  const me = accountSummary.value.byUser[currentUserId.value]
  if (me) return me
  // 后端没返回自己数据，兜底显示 0
  return {
    userId: currentUserId.value,
    userName: userMap.value[currentUserId.value] || '我',
    totalAsset: 0, totalLiability: 0, netWorth: 0,
    assetAccounts: [], liabilityAccounts: []
  }
})

const partnerSummary = computed(() => {
  if (!accountSummary.value?.byUser || !currentUserId.value) return null
  const pid = Object.keys(accountSummary.value.byUser).find(id => id !== currentUserId.value)
  if (pid) return accountSummary.value.byUser[pid]
  // 后端没返回对方数据，兜底显示 0
  const p = userList.value.find(u => u.id !== currentUserId.value)
  return {
    userId: p?.id || '',
    userName: p?.nickname || 'TA',
    totalAsset: 0, totalLiability: 0, netWorth: 0,
    assetAccounts: [], liabilityAccounts: []
  }
})

const userSummaries = computed(() => {
  if (!accountSummary.value?.byUser) return []
  const me = currentUserId.value
  const entries = Object.values(accountSummary.value.byUser)
  // 把自己放前面
  return entries.sort((a, b) => (a.userId === me ? -1 : b.userId === me ? 1 : 0))
})

const currentOwnerSummary = computed(() => {
  if (!selectedOwner.value || !accountSummary.value?.byUser) return null
  return accountSummary.value.byUser[selectedOwner.value] || null
})

const currentOwnerAssets = computed(() => {
  return currentOwnerSummary.value?.assetAccounts || []
})

const currentOwnerLiabilities = computed(() => {
  return currentOwnerSummary.value?.liabilityAccounts || []
})

const currentYearMonth = computed(() => `${currentYear.value}年${currentMonth.value}月`)

const monthFilteredTxns = computed(() => {
  const start = new Date(currentYear.value, currentMonth.value - 1, 1)
  const end = new Date(currentYear.value, currentMonth.value, 1)
  return transactions.value.filter(t => {
    const d = new Date(t.date)
    return d >= start && d < end
  })
})

const monthStats = computed(() => {
  const list = monthFilteredTxns.value
  const income = list.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = list.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, balance: income - expense }
})

const filteredTransactions = computed(() => {
  let list = monthFilteredTxns.value
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

function periodLabel(p) {
  return { weekly: '周', monthly: '月', yearly: '年' }[p] || '月'
}

function subTypeLabel(v) {
  const map = {
    wechat: '微信', alipay: '支付宝', bank: '银行卡', cash: '现金', investment: '投资',
    other_asset: '其他资产', huabei: '花呗', baitiao: '白条', credit_card: '信用卡', loan: '借款', other_liability: '其他负债'
  }
  return map[v] || v
}

function formatMoney(n) {
  if (n === undefined || n === null) return '0.00'
  return Number(n).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function prevMonth() {
  if (currentMonth.value === 1) { currentMonth.value = 12; currentYear.value-- }
  else currentMonth.value--
}

function nextMonth() {
  if (currentMonth.value === 12) { currentMonth.value = 1; currentYear.value++ }
  else currentMonth.value++
}

function toggleCategory(name) {
  selectedCategory.value = selectedCategory.value === name ? '' : name
}

// ========== 弹窗状态 ==========
const showTxnModal = ref(false)
const showCategoryModal = ref(false)
const showAccountModal = ref(false)
const showSettingsModal = ref(false)
const editingTxn = ref(null)
const editingCategory = ref(null)
const editingAccount = ref(null)

const txnForm = ref({ type: 'expense', amount: '', currency: 'CNY', category: '', accountId: '', date: getTodayStr(), note: '' })
const categoryForm = ref({ name: '', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' })
const accountForm = ref({ name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0 })
const settingsForm = ref({ monthlyBudget: 0 })

const txnValid = computed(() => txnForm.value.amount > 0 && txnForm.value.category && txnForm.value.date)
const categoryValid = computed(() => categoryForm.value.name?.trim())
const accountValid = computed(() => accountForm.value.name?.trim())

const presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6']

const subTypeOptions = [
  { value: 'wechat', label: '微信', types: ['asset'] },
  { value: 'alipay', label: '支付宝', types: ['asset'] },
  { value: 'bank', label: '银行卡', types: ['asset'] },
  { value: 'cash', label: '现金', types: ['asset'] },
  { value: 'investment', label: '投资', types: ['asset'] },
  { value: 'other_asset', label: '其他', types: ['asset'] },
  { value: 'huabei', label: '花呗', types: ['liability'] },
  { value: 'baitiao', label: '白条', types: ['liability'] },
  { value: 'credit_card', label: '信用卡', types: ['liability'] },
  { value: 'loan', label: '借款', types: ['liability'] },
  { value: 'other_liability', label: '其他', types: ['liability'] }
]

const availableSubTypes = computed(() => subTypeOptions.filter(st => st.types.includes(accountForm.value.type)))

// ========== 操作 ==========
function selectAccountForTxn(acc) {
  txnForm.value.accountId = acc._id
  txnForm.value.currency = acc.currency
}

function openAccountModal(acc = null) {
  editingAccount.value = acc
  if (acc) {
    accountForm.value = { name: acc.name, type: acc.type, subType: acc.subType, currency: acc.currency, balance: acc.balance }
  } else {
    accountForm.value = { name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0 }
  }
  showAccountModal.value = true
  showSettingsModal.value = false
}

function cancelAccountEdit() {
  editingAccount.value = null
  showAccountModal.value = false
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

function closeTxnModal() {
  showTxnModal.value = false
  editingTxn.value = null
}

function formatDateLocal(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function cancelCategoryEdit() {
  editingCategory.value = null
  categoryForm.value = { name: '', budget: 0, quota: 0, quotaType: 'count', period: 'monthly' }
}

function editCategory(c) {
  editingCategory.value = c
  categoryForm.value = { name: c.name, budget: c.budget, quota: c.quota, quotaType: c.quotaType, period: c.period }
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
    if (data.success) {
      closeTxnModal()
      txnForm.value = { type: 'expense', amount: '', currency: 'CNY', category: categories.value[0]?.name || '', accountId: '', date: getTodayStr(), note: '' }
      await fetchAll()
      activeTab.value = 'detail'
    } else alert(data.message || '保存失败')
  } catch (e) { console.error(e); alert('网络错误') }
  finally { submitting.value = false }
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
    if (data.success) { cancelCategoryEdit(); await fetchAll() }
    else alert(data.message || '保存失败')
  } catch (e) { console.error(e); alert('网络错误') }
  finally { submitting.value = false }
}

async function deleteCategory(c) {
  if (!confirm(`确定删除分类「${c.name}」吗？`)) return
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
    if (data.success) { cancelAccountEdit(); await fetchAll() }
    else alert(data.message || '保存失败')
  } catch (e) { console.error(e); alert('网络错误') }
  finally { submitting.value = false }
}

async function deleteAccount() {
  if (!editingAccount.value) return
  if (!confirm(`确定删除账户「${editingAccount.value.name}」吗？`)) return
  submitting.value = true
  try {
    const res = await fetch(`${API_ACCOUNT}/${editingAccount.value._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) { cancelAccountEdit(); await fetchAll() }
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
  } catch (e) { console.error(e); alert('网络错误') }
  finally { submitting.value = false }
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
    const [s, c, t, set, a, sum] = await Promise.all([statsRes.json(), catRes.json(), txnRes.json(), settingsRes.json(), accRes.json(), summaryRes.json()])
    if (s.success) stats.value = s.data
    if (c.success) categories.value = c.data
    if (t.success) {
      const accountMap = {}
      if (a.success) a.data.forEach(acc => { accountMap[acc._id] = acc.name })
      transactions.value = t.data.map(txn => ({ ...txn, accountName: txn.accountId ? accountMap[txn.accountId] : '' }))
    }
    if (set.success && set.data) settingsForm.value.monthlyBudget = set.data.monthlyBudget || 0
    if (a.success) accounts.value = a.data
    if (sum.success) {
      accountSummary.value = sum.data
      // 默认选中自己
      if (currentUserId.value && !selectedOwner.value) {
        selectedOwner.value = currentUserId.value
      }
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
    if (data.success && data.user) {
      const me = data.user
      const partner = data.user.partner
      const map = {}
      const list = []
      if (me) { map[me.id] = me.nickname || '我'; list.push({ id: me.id, nickname: me.nickname || '我', gender: me.gender }) }
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
  opacity: 0.25;
}
.orb-1 {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  top: -120px;
  right: -100px;
}
.orb-2 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  bottom: 10%;
  left: -100px;
}

.header {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: env(safe-area-inset-top, 0px) 0 0;
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
  padding: 8px 20px 12px;
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

/* Tab 导航 */
.tab-nav {
  display: flex;
  max-width: 480px;
  margin: 0 auto;
  padding: 0 20px;
  gap: 8px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-tertiary);
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.tab-btn.active {
  color: var(--text-primary);
}
.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 25%;
  width: 50%;
  height: 3px;
  border-radius: 3px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
}
.main {
  max-width: 480px;
  margin: 0 auto;
  padding: 16px 20px 20px;
  position: relative;
  z-index: 1;
}

/* ========== TAB: 资产 ========== */
.hero-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
}
.hero-card {
  border-radius: 24px;
  padding: 20px 12px 16px;
  text-align: center;
}
.hero-card.me {
  background: linear-gradient(145deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.08) 100%);
  border: 1px solid rgba(59,130,246,0.15);
}
.hero-card.partner {
  background: linear-gradient(145deg, rgba(236,72,153,0.12) 0%, rgba(168,85,247,0.08) 100%);
  border: 1px solid rgba(236,72,153,0.15);
}
.hero-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.hero-label {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 1px;
  margin-bottom: 4px;
}
.hero-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 6px;
  margin-bottom: 10px;
}
.hero-number {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -1px;
  background: linear-gradient(135deg, #1e3a5f 0%, #5e3a7a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.hero-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.hi-label { font-size: 10px; color: var(--text-tertiary); }
.hi-value { font-size: 13px; font-weight: 700; }
.hi-value.up { color: #22c55e; }
.hi-value.down { color: #f43f5e; }
.hero-divider { width: 1px; height: 24px; background: var(--border-color); }

/* 账户列表 */
.accounts-area {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 16px;
}
.owner-switch {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.owner-btn {
  flex: 1;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.owner-btn.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.account-section { margin-bottom: 16px; }
.account-section:last-child { margin-bottom: 0; }
.acc-label {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-tertiary);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.acc-label::before {
  content: '';
  width: 3px;
  height: 12px;
  border-radius: 2px;
  background: #22c55e;
}
.acc-label.liability::before { background: #f43f5e; }
.acc-list { display: flex; flex-direction: column; gap: 8px; }
.acc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: var(--bg-secondary);
  border-radius: 14px;
  cursor: pointer;
  transition: transform 0.2s;
}
.acc-row:active { transform: scale(0.98); }
.acc-left { display: flex; align-items: center; gap: 10px; }
.acc-info { flex: 1; min-width: 0; }
.acc-name { font-size: 14px; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.acc-sub { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.acc-right { text-align: right; }
.acc-balance { font-size: 16px; font-weight: 700; color: var(--text-primary); }
.acc-row.liability .acc-balance { color: #f43f5e; }
.acc-converted { font-size: 10px; color: var(--text-tertiary); margin-top: 2px; }
.add-account-btn {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 2px dashed var(--border-color);
  background: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}
.add-account-btn:active { transform: scale(0.98); border-color: #6366f1; color: #6366f1; }

/* ========== TAB: 记账 ========== */
.record-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 20px;
}
.record-type {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}
.record-type button {
  flex: 1;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}
.record-type button.active {
  color: white;
  border-color: transparent;
}
.record-type button:first-child.active { background: linear-gradient(135deg, #f43f5e 0%, #f97316 100%); }
.record-type button:last-child.active { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }

.record-amount {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}
.ra-currency {
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}
.ra-input {
  flex: 1;
  font-size: 36px;
  font-weight: 800;
  border: none;
  background: none;
  color: var(--text-primary);
  outline: none;
  letter-spacing: -0.5px;
}
.ra-input::placeholder { color: var(--text-tertiary); opacity: 0.4; }

.record-section { margin-bottom: 20px; }
.rs-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin-bottom: 10px; }
.rs-accounts {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  scrollbar-width: none;
}
.rs-accounts::-webkit-scrollbar { display: none; }
.rs-account {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 11px;
  min-width: 72px;
  transition: all 0.2s;
  color: var(--text-primary);
}
.rs-account.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.rs-account.none { opacity: 0.6; }
.rsa-name { font-size: 11px; font-weight: 500; }
.rsa-currency { font-size: 9px; opacity: 0.7; }
.rs-empty { font-size: 13px; color: var(--text-tertiary); padding: 12px; background: var(--bg-secondary); border-radius: 12px; }

.rs-categories {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.rs-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 4px;
  border-radius: 14px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text-primary);
}
.rs-category.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.rsc-name { font-size: 11px; }

.record-inline {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.ri-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.ri-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 14px;
  background: var(--bg-secondary);
  box-sizing: border-box;
  color: var(--text-primary);
}
.ri-group input:focus { outline: none; border-color: #6366f1; }

.record-submit {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(99,102,241,0.3);
  transition: opacity 0.2s;
}
.record-submit:disabled { opacity: 0.5; }
.record-submit:active { transform: scale(0.98); }

/* ========== TAB: 明细 ========== */
.month-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}
.month-arrow {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  font-size: 20px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.month-arrow:active { transform: scale(0.92); background: var(--bg-secondary); }
.month-title { font-size: 16px; font-weight: 700; color: var(--text-primary); min-width: 100px; text-align: center; }

.summary-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}
.sum-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 10px;
  text-align: center;
}
.sum-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 6px; }
.sum-value { font-size: 15px; font-weight: 700; }
.sum-item.income .sum-value { color: #22c55e; }
.sum-item.expense .sum-value { color: #f43f5e; }
.sum-item.balance .sum-value { color: var(--text-primary); }
.sum-item.balance .sum-value.negative { color: #f43f5e; }

.filter-pills {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 16px;
  scrollbar-width: none;
}
.filter-pills::-webkit-scrollbar { display: none; }
.fp-pill {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: 100px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  color: var(--text-primary);
}
.fp-pill.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.fp-pill.all { font-weight: 600; }

.txn-list { display: flex; flex-direction: column; gap: 16px; }
.txn-day { position: relative; }
.day-line {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}
.day-name { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.day-nums { display: flex; gap: 10px; font-size: 12px; font-weight: 600; }
.d-income { color: #22c55e; }
.d-expense { color: #f43f5e; }
.day-txns { display: flex; flex-direction: column; gap: 6px; }
.txn-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.txn-row:active { transform: scale(0.98); }
.txn-body { flex: 1; min-width: 0; }
.txn-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3px;
}
.txn-cat { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.txn-amt { font-size: 15px; font-weight: 700; }
.txn-amt.expense { color: #f43f5e; }
.txn-amt.income { color: #22c55e; }
.txn-bot {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: var(--text-tertiary);
}
.txn-acc {
  background: var(--bg-secondary);
  padding: 1px 8px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
}
.txn-note { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }

.empty-block {
  text-align: center;
  padding: 60px 20px;
}
.empty-block p { color: var(--text-secondary); font-size: 14px; }

/* ========== 弹窗公共样式 ========== */
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
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  max-height: calc(100vh - 40px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
}
.modal-header h3 { font-size: 17px; font-weight: 700; }
.btn-close {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: var(--bg-secondary); font-size: 20px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: var(--text-secondary);
}
.modal-body { padding: 18px 20px; }
.modal-footer {
  display: flex; gap: 10px;
  padding: 14px 20px 20px;
  border-top: 1px solid var(--border-color);
}
.modal-footer .btn {
  flex: 1; padding: 12px; border-radius: 14px; border: none;
  font-size: 15px; font-weight: 600; cursor: pointer; transition: opacity 0.2s;
}
.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); }
.btn-primary { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; }
.btn-primary:disabled { opacity: 0.5; }
.btn-danger { background: #fef2f2; color: #dc2626; }
.btn-block { width: 100%; }

/* 表单 */
.form-group { margin-bottom: 16px; }
.form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text-primary); }
.form-group .required { color: #f43f5e; }
.form-group input, .form-group select {
  width: 100%; padding: 12px; border: 1px solid var(--border-color);
  border-radius: 14px; font-size: 15px; background: var(--bg-secondary);
  box-sizing: border-box; color: var(--text-primary);
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: #6366f1; }

.type-toggle {
  display: flex; gap: 10px;
}
.type-toggle button {
  flex: 1; padding: 12px; border-radius: 14px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); font-size: 15px; font-weight: 600;
  cursor: pointer; color: var(--text-primary); transition: all 0.2s;
}
.type-toggle button.active { color: white; border-color: transparent; }
.type-toggle button:first-child.active { background: linear-gradient(135deg, #f43f5e 0%, #f97316 100%); }
.type-toggle button:last-child.active { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }

.amount-row { display: flex; gap: 10px; }
.currency-select { width: 100px; flex-shrink: 0; padding: 12px; border: 1px solid var(--border-color); border-radius: 14px; font-size: 15px; background: var(--bg-secondary); color: var(--text-primary); }
.amount-input { flex: 1; }

.account-select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.account-select-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 4px; border-radius: 14px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); cursor: pointer; font-size: 11px;
  transition: all 0.2s; color: var(--text-primary);
}
.account-select-btn.active { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-color: transparent; color: white; }
.as-name { font-size: 11px; }
.as-currency { font-size: 9px; opacity: 0.7; }

.sub-type-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sub-type-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 10px 2px; border-radius: 14px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); cursor: pointer; font-size: 11px;
  transition: all 0.2s; color: var(--text-primary);
}
.sub-type-btn.active { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-color: transparent; color: white; }
.st-name { font-size: 10px; }

.category-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.category-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 12px 4px; border-radius: 14px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); cursor: pointer; font-size: 11px;
  transition: all 0.2s; color: var(--text-primary);
}
.category-btn.active { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-color: transparent; color: white; }
.c-name { font-size: 11px; }

.inline-row { display: flex; gap: 10px; }
.inline-row input { flex: 1; }

.form-group.inline { display: flex; align-items: center; gap: 10px; }
.form-group.inline label { width: 70px; margin-bottom: 0; flex-shrink: 0; }
.form-group.inline input, .form-group.inline select { flex: 1; }

.divider { height: 1px; background: var(--border-color); margin: 16px 0; }

/* 分类管理 */
.category-manage-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.manage-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-secondary); border-radius: 12px; }
.manage-main { display: flex; align-items: center; gap: 10px; }
.manage-info { flex: 1; }
.manage-name { font-size: 14px; font-weight: 600; }
.manage-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; display: flex; gap: 8px; }
.manage-actions { display: flex; gap: 6px; }
.manage-btn { font-size: 12px; padding: 5px 10px; border-radius: 8px; border: none; background: var(--bg-card); color: var(--text-secondary); cursor: pointer; font-weight: 500; }
.manage-btn.danger { color: #f43f5e; }

/* 设置卡片 */
.settings-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; background: var(--bg-secondary); border-radius: 14px;
  margin-bottom: 14px; cursor: pointer; transition: all 0.2s;
}
.settings-card:active { transform: scale(0.98); }
.settings-info { flex: 1; }
.settings-name { font-size: 14px; font-weight: 600; }
.settings-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 2px; }
</style>
