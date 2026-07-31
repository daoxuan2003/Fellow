<template>
  <div class="budget-page">
    <div class="bg-container">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
    </div>

    <header class="header">
      <FeatureHeader title="账本 · 记账" eyebrow="SHARED LEDGER" chapter="08" kind="ledger">
        <template #action>
        <button class="icon-btn" @click="showSettingsModal = true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        </template>
      </FeatureHeader>

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
              <span>{{ u.userName }}的账户</span>
              <small>净资产 {{ formatMoney(u.netWorth || 0) }}</small>
            </button>
          </div>

          <div class="account-section" v-if="currentOwnerAssets.length">
            <div class="acc-label">资产 {{ formatMoney(currentOwnerSummary?.totalAsset || 0) }}</div>
            <div class="acc-list">
              <div class="acc-row" v-for="acc in currentOwnerAssets" :key="acc._id" :class="{ locked: !canManageAccount(acc) }">
                <div class="acc-left" @click="openAccountModal(acc)">
                  <div class="acc-info">
                    <div class="acc-name">{{ acc.name }}</div>
                    <div class="acc-sub">{{ subTypeLabel(acc.subType) }} · {{ acc.currency }}</div>
                  </div>
                </div>
                <div class="acc-right">
                  <div class="acc-balance" @click="openAccountModal(acc)">{{ formatCurrency(acc.balance, acc.currency) }}</div>
                  <div class="acc-converted" v-if="acc.converted !== null && acc.converted !== acc.balance" @click="openAccountModal(acc)">
                    ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
                  </div>
                  <button v-if="canManageAccount(acc)" class="acc-transfer-btn" @click.stop="openTransfer(acc)">转账</button>
                </div>
              </div>
            </div>
          </div>

          <div class="account-section" v-if="currentOwnerLiabilities.length">
            <div class="acc-label liability">负债 {{ formatMoney(currentOwnerSummary?.totalLiability || 0) }}</div>
            <div class="acc-list">
              <div class="acc-row liability" v-for="acc in currentOwnerLiabilities" :key="acc._id" :class="{ locked: !canManageAccount(acc) }">
                <div class="acc-left" @click="openAccountModal(acc)">
                  <div class="acc-info">
                    <div class="acc-name">{{ acc.name }}</div>
                    <div class="acc-sub">{{ subTypeLabel(acc.subType) }} · {{ acc.currency }}</div>
                  </div>
                </div>
                <div class="acc-right">
                  <div class="acc-balance" @click="openAccountModal(acc)">{{ formatCurrency(acc.balance, acc.currency) }}</div>
                  <div class="acc-converted" v-if="acc.converted !== null && acc.converted !== acc.balance" @click="openAccountModal(acc)">
                    ≈ {{ accountSummary?.baseCurrency }} {{ formatMoney(acc.converted) }}
                  </div>
                  <button v-if="canManageAccount(acc)" class="acc-transfer-btn" @click.stop="openTransfer(acc)">转账</button>
                </div>
              </div>
            </div>
          </div>

          <p v-if="!currentOwnerAssets.length && !currentOwnerLiabilities.length" class="account-empty-copy">
            这里还没有账户。账户按创建者分别管理，双方都可以查看。
          </p>

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
            <button :class="{ active: txnForm.type === 'transfer' }" @click="txnForm.type = 'transfer'">转账</button>
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

          <!-- 转账：转出账户 -->
          <div class="record-section" v-if="txnForm.type === 'transfer'">
            <div class="rs-label">转出账户</div>
            <div class="rs-accounts" v-if="ownAccounts.length">
              <button
                v-for="acc in ownAccounts"
                :key="acc._id"
                class="rs-account"
                :class="{ active: txnForm.accountId === acc._id }"
                @click="selectAccountForTxn(acc)"
              >
                <span class="rsa-name">{{ acc.name }}</span>
                <span class="rsa-currency">{{ acc.currency }}</span>
              </button>
            </div>
            <div v-else class="rs-empty">还没有自己的账户</div>
          </div>

          <!-- 转账：转入账户 -->
          <div class="record-section" v-if="txnForm.type === 'transfer'">
            <div class="rs-label">转入账户</div>
            <div class="rs-accounts" v-if="ownAccounts.length">
              <button
                v-for="acc in availableToAccounts"
                :key="acc._id"
                class="rs-account"
                :class="{ active: txnForm.toAccountId === acc._id }"
                @click="txnForm.toAccountId = acc._id"
              >
                <span class="rsa-name">{{ acc.name }}</span>
                <span class="rsa-currency">{{ acc.currency }}</span>
              </button>
            </div>
          </div>

          <!-- 收支：选择账户 -->
          <div class="record-section" v-if="txnForm.type !== 'transfer'">
            <div class="rs-label">选择账户</div>
            <div class="rs-accounts" v-if="ownAccounts.length">
              <button
                v-for="acc in ownAccounts"
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
            <div v-else class="rs-empty">还没有自己的账户，记账将不关联余额</div>
          </div>

          <!-- 收支：选择分类 -->
          <div class="record-section" v-if="txnForm.type !== 'transfer'">
            <div class="rs-label">选择分类</div>
            <div class="rs-categories">
              <button
                v-for="c in currentTypeCategories"
                :key="c._id"
                class="rs-category"
                :class="{ active: txnForm.category === c.name, preset: c.isPreset }"
                @click="txnForm.category = c.name"
              >
                <span class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></span>
                <span class="rsc-name">{{ c.name }}</span>
              </button>
            </div>
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
        <div class="filter-pills" v-if="allCategories.length">
          <button
            v-for="c in allCategories"
            :key="c._id"
            class="fp-pill"
            :class="{ active: selectedCategory === c.name }"
            @click="toggleCategory(c.name)"
          >
            <span class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></span>{{ c.name }}
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
              <div v-for="txn in day.items" :key="txn._id" class="txn-row" :class="{ transfer: txn.type === 'transfer', locked: !canManageTransaction(txn) }" @click="editTransaction(txn)">
                <div class="txn-body">
                  <div class="txn-top">
                    <span v-if="txn.type === 'transfer'" class="txn-cat">{{ txn.accountName }} → {{ txn.toAccountName }}</span>
                    <span v-else class="txn-cat">{{ txn.category }}</span>
                    <span class="txn-amt" :class="txn.type">
                      <template v-if="txn.type === 'transfer'">⇄ {{ txn.currency !== 'CNY' ? txn.currency : '¥' }}{{ formatMoney(txn.amount) }}</template>
                      <template v-else>{{ txn.type === 'income' ? '+' : '-' }}{{ txn.currency !== 'CNY' ? txn.currency : '¥' }}{{ formatMoney(txn.amount) }}</template>
                    </span>
                  </div>
                  <div class="txn-bot">
                    <span v-if="txn.type === 'transfer'" class="txn-acc">转账</span>
                    <span v-else-if="txn.accountName" class="txn-acc">{{ txn.accountName }}</span>
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

      <!-- ==================== TAB 4: 预算 ==================== -->
      <div v-if="activeTab === 'budget'" class="tab-panel">
        <!-- 月度总预算卡片 -->
        <div class="budget-hero">
          <div class="budget-hero-header">
            <span class="budget-hero-label">本月总预算</span>
            <button class="budget-hero-edit" @click="showMonthlyBudgetModal = true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              设置
            </button>
          </div>
          <div class="budget-hero-amount" v-if="settingsForm.monthlyBudget > 0">
            <span class="bha-number">{{ formatMoney(settingsForm.monthlyBudget) }}</span>
            <span class="bha-currency">元</span>
          </div>
          <div class="budget-hero-amount" v-else>
            <span class="bha-empty">未设置月度总预算</span>
          </div>

          <!-- 预算进度 -->
          <div class="budget-progress-wrap" v-if="settingsForm.monthlyBudget > 0">
            <div class="budget-progress-bar">
              <div class="budget-progress-fill" :style="{ transform: `scaleX(${Math.min(monthExpenseRatio, 100) / 100})`, background: monthExpenseRatio > 100 ? '#f43f5e' : monthExpenseRatio > 80 ? '#f97316' : '#6366f1' }"></div>
            </div>
            <div class="budget-progress-meta">
              <span>已用 ¥{{ formatMoney(monthStats?.expense || 0) }}</span>
              <span :class="{ alert: (settingsForm.monthlyBudget - (monthStats?.expense || 0)) < 0 }">
                剩余 ¥{{ formatMoney(settingsForm.monthlyBudget - (monthStats?.expense || 0)) }}
              </span>
            </div>
          </div>
        </div>

        <!-- 本月收支概览 -->
        <div class="mini-summary-bar">
          <div class="mini-sum-item">
            <div class="mini-sum-label">本月收入</div>
            <div class="mini-sum-value income">+{{ formatMoney(monthStats?.income || 0) }}</div>
          </div>
          <div class="mini-sum-item">
            <div class="mini-sum-label">本月支出</div>
            <div class="mini-sum-value expense">-{{ formatMoney(monthStats?.expense || 0) }}</div>
          </div>
          <div class="mini-sum-item">
            <div class="mini-sum-label">本月结余</div>
            <div class="mini-sum-value" :class="{ negative: (monthStats?.balance || 0) < 0 }">{{ (monthStats?.balance || 0) >= 0 ? '+' : '' }}{{ formatMoney(monthStats?.balance || 0) }}</div>
          </div>
        </div>

        <!-- 分类预算列表 -->
        <div class="category-budget-section">
          <div class="section-title">
            <span>分类预算</span>
            <button class="section-action" @click="showCategoryModal = true">管理分类</button>
          </div>

          <div class="category-budget-list" v-if="categoriesWithBudget.length">
            <div class="cb-item" v-for="c in categoriesWithBudget" :key="c._id">
              <div class="cb-top">
                <div class="cb-info">
                  <span class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></span>
                  <span class="cb-name">{{ c.name }}</span>
                  <span v-if="c.quota > 0" class="cb-quota">{{ c.quotaType === 'count' ? '限' + c.quota + '次' : '限¥' + c.quota }}/{{ periodLabel(c.period) }}</span>
                </div>
                <div class="cb-numbers">
                  <span class="cb-used" :class="{ alert: c.used > c.budget && c.budget > 0 }">¥{{ formatMoney(c.used) }}</span>
                  <span v-if="c.budget > 0" class="cb-divider">/</span>
                  <span v-if="c.budget > 0" class="cb-total">¥{{ formatMoney(c.budget) }}</span>
                </div>
              </div>
              <div class="cb-bar" v-if="c.budget > 0">
                <div class="cb-fill" :style="{ transform: `scaleX(${Math.min(c.ratio, 100) / 100})`, background: c.ratio > 100 ? '#f43f5e' : c.ratio > 80 ? '#f97316' : '#6366f1' }"></div>
              </div>
            </div>
          </div>
          <div v-else class="empty-block small">
            <p>还没有分类设置预算</p>
            <button class="empty-action" @click="showCategoryModal = true">去管理分类</button>
          </div>
        </div>

        <!-- 无预算分类 -->
        <div class="category-budget-section" v-if="categoriesWithoutBudget.length">
          <div class="section-title">
            <span>其他分类</span>
          </div>
          <div class="category-budget-list">
            <div class="cb-item plain" v-for="c in categoriesWithoutBudget" :key="c._id">
              <div class="cb-top">
                <div class="cb-info">
                  <span class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></span>
                  <span class="cb-name">{{ c.name }}</span>
                </div>
                <div class="cb-numbers">
                  <span class="cb-used">¥{{ formatMoney(c.used) }}</span>
                </div>
              </div>
            </div>
          </div>
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
              <div class="settings-hint">编辑分类预算与限制，或新建分类</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showSettingsModal = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- ========== 分类管理弹窗 ========== -->
    <div class="modal-overlay" v-if="showCategoryModal" @click.self="closeCategoryModal">
      <div class="modal-content category-modal" @click.stop>
        <div class="modal-header">
          <h3>管理分类</h3>
          <button class="btn-close" @click="closeCategoryModal">×</button>
        </div>
        <div class="modal-body">
          <div class="category-manage-list">
            <div v-for="c in allCategories" :key="c._id" class="manage-item" :class="{ preset: c.isPreset }">
              <div class="manage-main">
                <div class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></div>
                <div class="manage-info">
                  <div class="manage-name">{{ c.name }} <span v-if="c.isPreset" class="preset-tag">预设</span></div>
                  <div class="manage-meta">
                    <span v-if="c.budget > 0">预算 ¥{{ c.budget }}</span>
                    <span v-if="c.quota > 0">{{ c.quotaType === 'count' ? '限次' : '限额' }} {{ c.quota }}/{{ periodLabel(c.period) }}</span>
                    <span v-if="c.budget === 0 && c.quota === 0" class="no-limit">未设限制</span>
                  </div>
                </div>
              </div>
              <div class="manage-actions">
                <button class="manage-btn" @click="openEditCategory(c)">编辑</button>
                <button v-if="!c.isPreset" class="manage-btn danger" @click="deleteCategory(c)">删除</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeCategoryModal">关闭</button>
          <button class="btn btn-primary" @click="openNewCategoryModal">
            <span style="margin-right:4px">+</span>新建分类
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 新建分类弹窗 ========== -->
    <div class="modal-overlay" v-if="showNewCategoryModal" @click.self="showNewCategoryModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>新建分类</h3>
          <button class="btn-close" @click="showNewCategoryModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>分类名称 <span class="required">*</span></label>
            <input v-model="newCategoryForm.name" type="text" placeholder="如：健身" maxlength="20" />
          </div>
          <div class="form-group inline">
            <label>月度预算</label>
            <input v-model.number="newCategoryForm.budget" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>限制类型</label>
            <select v-model="newCategoryForm.quotaType"><option value="">不限制</option><option value="count">次数</option><option value="amount">金额</option></select>
          </div>
          <div class="form-group inline" v-if="newCategoryForm.quotaType">
            <label>限制数量</label>
            <input v-model.number="newCategoryForm.quota" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline" v-if="newCategoryForm.quotaType">
            <label>周期</label>
            <select v-model="newCategoryForm.period"><option value="weekly">每周</option><option value="monthly">每月</option><option value="yearly">每年</option></select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNewCategoryModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!newCategoryValid || submitting" @click="submitNewCategory">
            {{ submitting ? '保存中...' : '添加' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 编辑分类弹窗 ========== -->
    <div class="modal-overlay" v-if="showEditCategoryModal" @click.self="showEditCategoryModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>编辑分类</h3>
          <button class="btn-close" @click="showEditCategoryModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>分类名称</label>
            <input v-model="editCategoryForm.name" type="text" placeholder="分类名称" maxlength="20" :disabled="editingCategoryItem?.isPreset" />
            <div v-if="editingCategoryItem?.isPreset" class="form-hint">预设分类名称不可修改</div>
          </div>
          <div class="form-group inline">
            <label>月度预算</label>
            <input v-model.number="editCategoryForm.budget" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline">
            <label>限制类型</label>
            <select v-model="editCategoryForm.quotaType">
              <option value="">不限制</option>
              <option value="count">次数</option>
              <option value="amount">金额</option>
            </select>
          </div>
          <div class="form-group inline" v-if="editCategoryForm.quotaType">
            <label>限制数量</label>
            <input v-model.number="editCategoryForm.quota" type="number" placeholder="0 = 不限" min="0" />
          </div>
          <div class="form-group inline" v-if="editCategoryForm.quotaType">
            <label>周期</label>
            <select v-model="editCategoryForm.period"><option value="weekly">每周</option><option value="monthly">每月</option><option value="yearly">每年</option></select>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditCategoryModal = false">取消</button>
          <button class="btn btn-primary" :disabled="!editCategoryValid || submitting" @click="submitEditCategory">
            {{ submitting ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ========== 月度总预算弹窗 ========== -->
    <div class="modal-overlay" v-if="showMonthlyBudgetModal" @click.self="showMonthlyBudgetModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>设置月度总预算</h3>
          <button class="btn-close" @click="showMonthlyBudgetModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>月度总预算</label>
            <input v-model.number="monthlyBudgetForm.value" type="number" placeholder="0 = 不设置" min="0" />
            <div class="form-hint">设为 0 表示不限制月度总预算</div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showMonthlyBudgetModal = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="saveMonthlyBudget">
            {{ submitting ? '保存中...' : '保存' }}
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
            <button :class="{ active: txnForm.type === 'transfer' }" @click="txnForm.type = 'transfer'">转账</button>
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
          <div class="form-group" v-if="txnForm.type === 'transfer'">
            <label>转出账户</label>
            <div class="account-select-grid" v-if="ownAccounts.length">
              <button v-for="acc in ownAccounts" :key="acc._id" class="account-select-btn" :class="{ active: txnForm.accountId === acc._id }" @click="selectAccountForTxn(acc)">
                <span class="as-name">{{ acc.name }}</span>
                <span class="as-currency">{{ acc.currency }}</span>
              </button>
            </div>
          </div>
          <div class="form-group" v-if="txnForm.type === 'transfer'">
            <label>转入账户</label>
            <div class="account-select-grid" v-if="ownAccounts.length">
              <button v-for="acc in availableToAccounts" :key="acc._id" class="account-select-btn" :class="{ active: txnForm.toAccountId === acc._id }" @click="txnForm.toAccountId = acc._id">
                <span class="as-name">{{ acc.name }}</span>
                <span class="as-currency">{{ acc.currency }}</span>
              </button>
            </div>
          </div>
          <div class="form-group" v-if="txnForm.type !== 'transfer'">
            <label>账户</label>
            <div class="account-select-grid" v-if="ownAccounts.length">
              <button v-for="acc in ownAccounts" :key="acc._id" class="account-select-btn" :class="{ active: txnForm.accountId === acc._id }" @click="selectAccountForTxn(acc)">
                <span class="as-name">{{ acc.name }}</span>
                <span class="as-currency">{{ acc.currency }}</span>
              </button>
              <button class="account-select-btn none" :class="{ active: !txnForm.accountId }" @click="txnForm.accountId = ''">
                <span class="as-name">不关联</span>
              </button>
            </div>
          </div>
          <div class="form-group" v-if="txnForm.type !== 'transfer'">
            <label>分类</label>
            <div class="category-grid">
              <button v-for="c in currentTypeCategories" :key="c._id" class="category-btn" :class="{ active: txnForm.category === c.name }" @click="txnForm.category = c.name">
                <span class="category-mark" :class="categoryTone(c.name)" aria-hidden="true"></span>
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
          <button v-if="editingTxn && canManageTransaction(editingTxn)" class="btn btn-danger" @click="deleteTransaction">删除</button>
          <button class="btn btn-secondary" @click="closeTxnModal">取消</button>
          <button class="btn btn-primary" :disabled="!txnValid || submitting || (editingTxn && !canManageTransaction(editingTxn))" @click="submitTxn">保存</button>
        </div>
      </div>
    </div>


    <div
      v-if="toast.show"
      class="budget-toast"
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
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUserStore } from '../stores/user.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import DatePickerField from '../components/DatePickerField.vue'
import { canManageCreatedRecord } from '../utils/ownership.js'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userId || userStore.user?.id)

const API_BUDGET = '/api/budget'
const API_ACCOUNT = '/api/accounts'

const tabs = [
  { key: 'assets', label: '资产' },
  { key: 'record', label: '记账' },
  { key: 'detail', label: '明细' }
]

// ========== 预设分类 ==========
const PRESET_EXPENSE = [
  { name: '餐饮' },
  { name: '交通' },
  { name: '购物' },
  { name: '娱乐' },
  { name: '住房' },
  { name: '医疗' },
  { name: '教育' },
  { name: '通讯' },
  { name: '人情' },
  { name: '宠物' },
  { name: '其他' }
]

const PRESET_INCOME = [
  { name: '工资' },
  { name: '奖金' },
  { name: '兼职' },
  { name: '理财' },
  { name: '红包' },
  { name: '退款' },
  { name: '其他' }
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
const toast = ref({
  show: false,
  message: '',
  type: 'info'
})
const pendingDestructiveAction = ref('')
let toastTimer = null
let destructiveTimer = null

// 资产页：选择查看谁的账户
const selectedOwner = ref('')

// 明细页：月份筛选
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)

// ========== 计算属性 ==========
const userSummaries = computed(() => {
  if (!accountSummary.value?.byUser) return []
  const me = currentUserId.value
  const entries = Object.values(accountSummary.value.byUser)
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

const ownAccounts = computed(() => {
  if (!currentUserId.value) return []
  return accounts.value.filter(acc => String(acc.userId) === String(currentUserId.value))
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

const monthExpenseRatio = computed(() => {
  if (!settingsForm.value.monthlyBudget || settingsForm.value.monthlyBudget <= 0) return 0
  return ((monthStats.value?.expense || 0) / settingsForm.value.monthlyBudget) * 100
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
    else if (txn.type === 'expense') groups[key].expense += txn.amount
  })
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date))
})

// 合并预设分类与后端自定义分类
const allCategories = computed(() => {
  const presetList = [...PRESET_EXPENSE, ...PRESET_INCOME]
  const presetMap = {}
  presetList.forEach(p => {
    presetMap[p.name] = { ...p, _id: `preset-${p.name}`, isPreset: true, budget: 0, quota: 0, quotaType: '', period: 'monthly' }
  })
  // 用后端数据覆盖预设（如果有）
  categories.value.forEach(c => {
    if (presetMap[c.name]) {
      presetMap[c.name] = { ...presetMap[c.name], ...c, isPreset: true }
    }
  })
  // 自定义分类
  const custom = categories.value.filter(c => !presetMap[c.name]).map(c => ({ ...c, isPreset: false }))
  return [...Object.values(presetMap), ...custom]
})

// 记账时按类型过滤
const currentTypeCategories = computed(() => {
  const presets = txnForm.value.type === 'expense' ? PRESET_EXPENSE : PRESET_INCOME
  const presetNames = new Set(presets.map(p => p.name))
  const custom = allCategories.value.filter(c => !c.isPreset)
  const typePresets = allCategories.value.filter(c => c.isPreset && presetNames.has(c.name))
  return [...typePresets, ...custom]
})

// 预算页：分类预算使用情况
const categoryUsageMap = computed(() => {
  const map = {}
  monthFilteredTxns.value.forEach(t => {
    if (t.type !== 'expense') return
    if (!map[t.category]) map[t.category] = 0
    map[t.category] += t.amount
  })
  return map
})

const categoriesWithBudget = computed(() => {
  return allCategories.value
    .filter(c => c.budget > 0 || c.quota > 0)
    .map(c => {
      const used = categoryUsageMap.value[c.name] || 0
      const ratio = c.budget > 0 ? (used / c.budget) * 100 : 0
      return { ...c, used, ratio }
    })
    .sort((a, b) => (b.budget || 0) - (a.budget || 0))
})

const categoriesWithoutBudget = computed(() => {
  const withBudgetIds = new Set(categoriesWithBudget.value.map(c => c._id))
  return allCategories.value
    .filter(c => !withBudgetIds.has(c._id))
    .map(c => {
      const used = categoryUsageMap.value[c.name] || 0
      return { ...c, used }
    })
    .sort((a, b) => b.used - a.used)
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

function formatCurrency(value, currency = 'CNY') {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return `${currency} 0.00`
  try {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currency || 'CNY',
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue)
  } catch {
    return `${currency || 'CNY'} ${formatMoney(numericValue)}`
  }
}

function categoryTone(name = '') {
  const tones = ['tone-blue', 'tone-mint', 'tone-yellow', 'tone-pink', 'tone-orange']
  const score = Array.from(String(name)).reduce((sum, character) => sum + character.codePointAt(0), 0)
  return tones[score % tones.length]
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
const showNewCategoryModal = ref(false)
const showEditCategoryModal = ref(false)
const showAccountModal = ref(false)
const showSettingsModal = ref(false)
const showMonthlyBudgetModal = ref(false)
const editingTxn = ref(null)
const editingAccount = ref(null)
const editingCategoryItem = ref(null)

const txnForm = ref({ type: 'expense', amount: '', currency: 'CNY', category: '', accountId: '', toAccountId: '', date: getTodayStr(), note: '' })
const accountForm = ref({ name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0 })
const settingsForm = ref({ monthlyBudget: 0 })
const monthlyBudgetForm = ref({ value: 0 })

const newCategoryForm = ref({ name: '', budget: 0, quota: 0, quotaType: '', period: 'monthly' })
const editCategoryForm = ref({ name: '', budget: 0, quota: 0, quotaType: '', period: 'monthly' })

const availableToAccounts = computed(() => ownAccounts.value.filter(a => a._id !== txnForm.value.accountId))

const txnValid = computed(() => {
  const base = txnForm.value.amount > 0 && txnForm.value.date
  if (txnForm.value.type === 'transfer') {
    return base && txnForm.value.accountId && txnForm.value.toAccountId
  }
  return base && txnForm.value.category
})
const accountValid = computed(() => accountForm.value.name?.trim())
const newCategoryValid = computed(() => newCategoryForm.value.name?.trim())
const editCategoryValid = computed(() => editCategoryForm.value.name?.trim())

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
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer)
  toast.value = { show: true, message, type }
  toastTimer = setTimeout(() => {
    toast.value = { ...toast.value, show: false }
    toastTimer = null
  }, 2800)
}

function requireSecondAction(actionKey, message) {
  if (pendingDestructiveAction.value === actionKey) {
    pendingDestructiveAction.value = ''
    if (destructiveTimer) clearTimeout(destructiveTimer)
    destructiveTimer = null
    return true
  }

  pendingDestructiveAction.value = actionKey
  showToast(message, 'warning')
  if (destructiveTimer) clearTimeout(destructiveTimer)
  destructiveTimer = setTimeout(() => {
    pendingDestructiveAction.value = ''
    destructiveTimer = null
  }, 4200)
  return false
}

function canManageTransaction(txn) {
  return canManageCreatedRecord({ createdBy: txn?.creatorId }, currentUserId.value)
}

function canManageAccount(acc) {
  return acc?.userId && currentUserId.value && String(acc.userId) === String(currentUserId.value)
}

function selectAccountForTxn(acc) {
  if (!canManageAccount(acc)) {
    showToast('只能使用自己的账户记账', 'warning')
    return
  }
  txnForm.value.accountId = acc._id
  txnForm.value.currency = acc.currency
  if (txnForm.value.toAccountId === acc._id) txnForm.value.toAccountId = ''
}

function openAccountModal(acc = null) {
  if (acc && !canManageAccount(acc)) {
    showToast('只能编辑自己的账户', 'warning')
    return
  }
  editingAccount.value = acc
  if (acc) {
    accountForm.value = { name: acc.name, type: acc.type, subType: acc.subType, currency: acc.currency, balance: acc.balance }
  } else {
    accountForm.value = { name: '', type: 'asset', subType: 'other_asset', currency: 'CNY', balance: 0 }
  }
  showAccountModal.value = true
  showSettingsModal.value = false
}

function openTransfer(acc) {
  if (!canManageAccount(acc)) {
    showToast('只能使用自己的账户转账', 'warning')
    return
  }
  txnForm.value = { type: 'transfer', amount: '', currency: acc.currency, category: '', accountId: acc._id, toAccountId: '', date: getTodayStr(), note: '' }
  activeTab.value = 'record'
}

function cancelAccountEdit() {
  editingAccount.value = null
  showAccountModal.value = false
}

function editTransaction(txn) {
  if (!canManageTransaction(txn)) {
    showToast('只能编辑自己创建的记录', 'warning')
    return
  }
  editingTxn.value = txn
  txnForm.value = {
    type: txn.type, amount: txn.amount, currency: txn.currency || 'CNY',
    category: txn.category || '', accountId: txn.accountId || '',
    toAccountId: txn.toAccountId || '', date: formatDateLocal(txn.date), note: txn.note || ''
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

function closeCategoryModal() {
  showCategoryModal.value = false
}

function openNewCategoryModal() {
  newCategoryForm.value = { name: '', budget: 0, quota: 0, quotaType: '', period: 'monthly' }
  showNewCategoryModal.value = true
}

function openEditCategory(c) {
  editingCategoryItem.value = c
  editCategoryForm.value = {
    name: c.name,
    budget: c.budget || 0,
    quota: c.quota || 0,
    quotaType: c.quotaType || '',
    period: c.period || 'monthly'
  }
  showEditCategoryModal.value = true
}

// ========== API ==========
async function submitTxn() {
  if (!txnValid.value) return
  const isEditing = Boolean(editingTxn.value)
  if (isEditing && !canManageTransaction(editingTxn.value)) {
    showToast('只能编辑自己创建的记录', 'error')
    return
  }
  if (txnForm.value.accountId && !ownAccounts.value.some(acc => acc._id === txnForm.value.accountId)) {
    showToast('只能使用自己的账户记账', 'error')
    return
  }
  if (txnForm.value.toAccountId && !ownAccounts.value.some(acc => acc._id === txnForm.value.toAccountId)) {
    showToast('只能转入自己的账户', 'error')
    return
  }
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
      txnForm.value = { type: 'expense', amount: '', currency: 'CNY', category: currentTypeCategories.value[0]?.name || '', accountId: '', toAccountId: '', date: getTodayStr(), note: '' }
      await fetchAll()
      activeTab.value = 'detail'
      showToast(isEditing ? '记录已更新' : '记录已保存', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
  finally { submitting.value = false }
}

async function deleteTransaction() {
  if (!editingTxn.value) return
  if (!canManageTransaction(editingTxn.value)) {
    showToast('只能删除自己创建的记录', 'error')
    return
  }
  if (!requireSecondAction(`txn:${editingTxn.value._id}`, '再次点击删除，确认移除这条记录')) return
  submitting.value = true
  try {
    const res = await fetch(`${API_BUDGET}/transactions/${editingTxn.value._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      closeTxnModal()
      await fetchAll()
      showToast('记录已删除', 'success')
    } else {
      showToast(data.message || '删除失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  } finally { submitting.value = false }
}

async function submitNewCategory() {
  if (!newCategoryValid.value) return
  submitting.value = true
  try {
    const body = {
      name: newCategoryForm.value.name.trim(),
      budget: newCategoryForm.value.budget || 0,
      quota: newCategoryForm.value.quotaType ? (newCategoryForm.value.quota || 0) : 0,
      quotaType: newCategoryForm.value.quotaType || 'count',
      period: newCategoryForm.value.period || 'monthly'
    }
    const res = await fetch(`${API_BUDGET}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.success) {
      showNewCategoryModal.value = false
      await fetchAll()
      showToast('分类已添加', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
  finally { submitting.value = false }
}

async function submitEditCategory() {
  if (!editCategoryValid.value) return
  submitting.value = true
  try {
    const c = editingCategoryItem.value
    const url = c.isPreset ? `${API_BUDGET}/categories` : `${API_BUDGET}/categories/${c._id}`
    const method = c.isPreset ? 'POST' : 'PUT'
    const body = {
      name: editCategoryForm.value.name.trim(),
      budget: editCategoryForm.value.budget || 0,
      quota: editCategoryForm.value.quotaType ? (editCategoryForm.value.quota || 0) : 0,
      quotaType: editCategoryForm.value.quotaType || 'count',
      period: editCategoryForm.value.period || 'monthly'
    }
    // 预设分类如果后端不存在，需要 POST 创建；如果已存在，需要 PUT 更新
    // 简化处理：预设分类调用 POST（后端可以 upsert），自定义分类调用 PUT
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.success) {
      showEditCategoryModal.value = false
      await fetchAll()
      showToast('分类已保存', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
  finally { submitting.value = false }
}

async function deleteCategory(c) {
  if (!requireSecondAction(`category:${c._id}`, `再次点击删除分类「${c.name}」`)) return
  try {
    const res = await fetch(`${API_BUDGET}/categories/${c._id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const data = await res.json()
    if (data.success) {
      await fetchAll()
      showToast('分类已删除', 'success')
    } else {
      showToast(data.message || '删除失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
}

async function submitAccount() {
  if (!accountValid.value) return
  const isEditing = Boolean(editingAccount.value)
  if (isEditing && !canManageAccount(editingAccount.value)) {
    showToast('只能修改自己的账户', 'error')
    return
  }
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
      showToast(isEditing ? '账户已保存' : '账户已添加', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
  finally { submitting.value = false }
}

async function deleteAccount() {
  if (!editingAccount.value) return
  if (!canManageAccount(editingAccount.value)) {
    showToast('只能删除自己的账户', 'error')
    return
  }
  if (!requireSecondAction(`account:${editingAccount.value._id}`, `再次点击删除账户「${editingAccount.value.name}」`)) return
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
      showToast('账户已删除', 'success')
    } else {
      showToast(data.message || '删除失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  } finally { submitting.value = false }
}

async function saveMonthlyBudget() {
  submitting.value = true
  try {
    const res = await fetch(`${API_BUDGET}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify({ monthlyBudget: monthlyBudgetForm.value.value || 0 })
    })
    const data = await res.json()
    if (data.success) {
      showMonthlyBudgetModal.value = false
      settingsForm.value.monthlyBudget = monthlyBudgetForm.value.value || 0
      await fetchAll()
      showToast('月预算已保存', 'success')
    } else {
      showToast(data.message || '保存失败', 'error')
    }
  } catch (e) {
    console.error(e)
    showToast('网络错误，请稍后再试', 'error')
  }
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
      transactions.value = t.data.map(txn => ({
        ...txn,
        accountName: txn.accountId ? accountMap[txn.accountId] : '',
        toAccountName: txn.toAccountId ? accountMap[txn.toAccountId] : ''
      }))
    }
    if (set.success && set.data) {
      settingsForm.value.monthlyBudget = set.data.monthlyBudget || 0
      monthlyBudgetForm.value.value = set.data.monthlyBudget || 0
    }
    if (a.success) accounts.value = a.data
    if (sum.success) {
      accountSummary.value = sum.data
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
      if (typeof userStore.updateUserData === 'function') {
        userStore.updateUserData(me, partner)
      }
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

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
  if (destructiveTimer) clearTimeout(destructiveTimer)
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

/* 账户列表 */
.accounts-area {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 16px;
}
.account-empty-copy {
  margin: 4px 0 14px;
  padding: 14px;
  color: var(--text-secondary);
  background: var(--fellow-paper, #FFFAF5);
  border: 2px solid var(--fellow-ink, #20202A);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.55;
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
.acc-row.locked {
  cursor: default;
}
.acc-row.locked:active {
  transform: none;
}
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
  gap: 10px;
}
.rs-category {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 14px 4px 12px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
  color: var(--text-primary);
  aspect-ratio: 1;
  justify-content: center;
}
.rs-category.active {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-color: transparent;
  color: white;
}
.rsc-name { font-size: 10px; font-weight: 500; }

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
.txn-row.locked {
  cursor: default;
}
.txn-row.locked:active {
  transform: none;
}
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
.empty-block.small { padding: 30px 20px; }
.empty-action {
  margin-top: 12px;
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* ========== TAB: 预算 ========== */
.budget-hero {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 24px;
  padding: 24px 20px;
  color: white;
  margin-bottom: 16px;
}
.budget-hero-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.budget-hero-label {
  font-size: 13px;
  opacity: 0.9;
  font-weight: 500;
}
.budget-hero-edit {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  background: rgba(255,255,255,0.2);
  border: none;
  border-radius: 8px;
  padding: 5px 10px;
  color: white;
  cursor: pointer;
  font-weight: 500;
}
.budget-hero-amount {
  margin-bottom: 16px;
}
.bha-number {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1px;
}
.bha-currency {
  font-size: 16px;
  font-weight: 600;
  margin-left: 4px;
  opacity: 0.9;
}
.bha-empty {
  font-size: 16px;
  opacity: 0.8;
  font-weight: 500;
}
.budget-progress-wrap { margin-top: 8px; }
.budget-progress-bar {
  height: 8px;
  background: rgba(255,255,255,0.25);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}
.budget-progress-fill {
  width: 100%;
  height: 100%;
  border-radius: 4px;
  transform-origin: left center;
  transition: transform 0.4s ease;
}
.budget-progress-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 500;
  opacity: 0.9;
}
.budget-progress-meta .alert { color: #fef08a; font-weight: 700; }

.mini-summary-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.mini-sum-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 8px;
  text-align: center;
}
.mini-sum-label { font-size: 11px; color: var(--text-tertiary); margin-bottom: 6px; }
.mini-sum-value { font-size: 14px; font-weight: 700; }
.mini-sum-value.income { color: #22c55e; }
.mini-sum-value.expense { color: #f43f5e; }
.mini-sum-value.negative { color: #f43f5e; }

.category-budget-section { margin-bottom: 20px; }
.section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.section-action {
  font-size: 12px;
  font-weight: 600;
  color: #6366f1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}

.category-budget-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cb-item {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 14px 16px;
}
.cb-item.plain { padding: 12px 16px; }
.cb-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.cb-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}
.cb-name { font-size: 14px; font-weight: 600; color: var(--text-primary); }
.cb-quota {
  font-size: 10px;
  color: var(--text-tertiary);
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 100px;
  white-space: nowrap;
}
.cb-numbers {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
}
.cb-used { color: var(--text-primary); }
.cb-used.alert { color: #f43f5e; }
.cb-divider { color: var(--text-tertiary); font-weight: 400; }
.cb-total { color: var(--text-secondary); }
.cb-bar {
  height: 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  overflow: hidden;
}
.cb-fill {
  width: 100%;
  height: 100%;
  border-radius: 3px;
  transform-origin: left center;
  transition: transform 0.4s ease;
}

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
.form-hint { font-size: 12px; color: var(--text-tertiary); margin-top: 6px; }

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
  padding: 10px 4px; border-radius: 14px; border: 1px solid var(--border-color);
  background: var(--bg-secondary); cursor: pointer; font-size: 11px;
  transition: all 0.2s; color: var(--text-primary);
}
.category-btn.active { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-color: transparent; color: white; }
.c-name { font-size: 11px; }


.form-group.inline { display: flex; align-items: center; gap: 10px; }
.form-group.inline label { width: 70px; margin-bottom: 0; flex-shrink: 0; }
.form-group.inline input, .form-group.inline select { flex: 1; }

.divider { height: 1px; background: var(--border-color); margin: 16px 0; }

/* 分类管理 */
.category-manage-list { display: flex; flex-direction: column; gap: 8px; }
.manage-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: var(--bg-secondary); border-radius: 12px; }
.manage-main { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.manage-info { flex: 1; min-width: 0; }
.manage-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.preset-tag {
  font-size: 9px;
  font-weight: 500;
  color: #6366f1;
  background: rgba(99,102,241,0.1);
  padding: 1px 6px;
  border-radius: 4px;
}
.manage-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; display: flex; gap: 8px; flex-wrap: wrap; }
.manage-meta .no-limit { color: var(--text-tertiary); opacity: 0.6; }
.manage-actions { display: flex; gap: 6px; flex-shrink: 0; }
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

.category-mark {
  display: inline-block;
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  background: #58c8f5;
  border: 2px solid #20202a;
  border-radius: 6px;
}
.category-mark.tone-mint { background: #75dfc1; border-radius: 50%; }
.category-mark.tone-yellow { background: #ffd94a; transform: rotate(45deg) scale(.8); }
.category-mark.tone-pink { background: #ff7fa5; border-radius: 50% 50% 5px 5px; }
.category-mark.tone-orange { background: #ff8b4a; border-radius: 3px 9px 3px 9px; }

/* 账户卡片转账按钮 */
.acc-transfer-btn {
  margin-top: 6px;
  padding: 3px 10px;
  font-size: 11px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
  color: #6366f1;
  cursor: pointer;
  transition: all 0.2s;
}
.acc-transfer-btn:active {
  background: #f3f4f6;
  transform: scale(0.95);
}

/* 转账记录样式 */
.txn-row.transfer .txn-amt {
  color: #6366f1;
}

.budget-toast {
  position: fixed;
  left: max(18px, env(safe-area-inset-left));
  right: max(18px, env(safe-area-inset-right));
  bottom: calc(92px + env(safe-area-inset-bottom));
  z-index: 4000;
  max-width: 440px;
  margin: 0 auto;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(31, 41, 55, 0.94);
  color: white;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.22);
  font-size: 14px;
  line-height: 1.45;
  text-align: center;
  backdrop-filter: blur(14px);
  pointer-events: none;
}

.budget-toast.success {
  background: rgba(16, 135, 95, 0.94);
}

.budget-toast.warning {
  background: rgba(151, 103, 26, 0.94);
}

.budget-toast.error {
  background: rgba(196, 65, 57, 0.94);
}

/* Approved home-brand finish */
.budget-page {
  background: #FFFAF5;
  color: #20202A;
}

.bg-container {
  display: none;
}

.header {
  background: #FFFAF5;
  border-bottom: 3px solid #20202A;
  backdrop-filter: none;
}

.icon-btn {
  border: 2px solid #20202A;
  border-radius: 10px;
  background: #FFFFFF;
  color: #20202A;
  box-shadow: 3px 3px 0 #20202A;
}

.tab-nav {
  margin: 14px 16px 0;
  padding: 6px;
  gap: 6px;
  border: 3px solid #20202A;
  border-radius: 14px;
  background: #FFFFFF;
  box-shadow: 4px 4px 0 #20202A;
}

.tab-btn {
  min-height: 40px;
  padding: 8px 10px;
  border: 0;
  border-radius: 8px;
  color: #20202A;
  font-weight: 900;
}

.tab-btn.active {
  background: #FFD94A;
  color: #20202A;
}

.tab-btn.active::after {
  display: none;
}

.main {
  padding: 20px 16px 24px;
}

.accounts-area,
.record-card,
.empty-block {
  border: 3px solid #20202A;
  border-radius: 16px;
  background: #FFFFFF;
  box-shadow: 6px 6px 0 #20202A;
}

.owner-btn,
.record-type button,
.type-toggle button,
.rs-account,
.account-select-btn,
.sub-type-btn,
.category-btn {
  border: 2px solid #20202A;
  border-radius: 10px;
  background: #FFFFFF;
  color: #20202A;
  box-shadow: 2px 2px 0 #20202A;
}

.owner-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  text-align: left;
}

.owner-btn small {
  color: #6F6C74;
  font-size: 10px;
  font-weight: 700;
}

.owner-btn.active small {
  color: #20202A;
}

.owner-btn.active,
.rs-account.active,
.account-select-btn.active,
.sub-type-btn.active,
.category-btn.active {
  border-color: #20202A;
  background: #FFD94A;
  color: #20202A;
}

.record-type button:first-child.active,
.type-toggle button:first-child.active {
  border-color: #20202A;
  background: #FF7FA5;
  color: #20202A;
}

.record-type button:last-child.active,
.type-toggle button:last-child.active {
  border-color: #20202A;
  background: #75DFC1;
  color: #20202A;
}

.acc-row,
.txn-row,
.settings-card,
.manage-item {
  border: 2px solid #20202A;
  border-radius: 10px;
  background: #FFFFFF;
}

.add-account-btn {
  min-height: 48px;
  border: 3px solid #20202A;
  border-radius: 10px;
  background: #FFD94A;
  color: #20202A;
  box-shadow: 4px 4px 0 #20202A;
  font-weight: 900;
}

.acc-transfer-btn {
  border: 2px solid #20202A;
  border-radius: 8px;
  background: #58C8F5;
  color: #20202A;
}

.txn-row.transfer .txn-amt {
  color: #167BA3;
}
</style>
