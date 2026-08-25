<template>
  <div class="wallet-page">
    <FeatureHeader title="钱包" eyebrow="SHARED WALLET" chapter="08" kind="ledger" />

    <nav class="wallet-tabs" aria-label="钱包功能" role="tablist">
      <button v-for="tab in WALLET_TABS" :id="`wallet-tab-${tab.key}`" :key="tab.key" type="button" role="tab" :aria-selected="activeTab === tab.key" :aria-controls="`wallet-panel-${tab.key}`" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
    </nav>

    <main class="wallet-main" :aria-busy="loading">
      <section v-if="loading" class="state-panel loading-state" aria-live="polite">
        <span class="state-mark loading-mark" aria-hidden="true"></span><h1>正在把钱和计划对齐</h1><p>账户、欠款和本月安排马上就好。</p><div class="skeleton-lines" aria-hidden="true"><i></i><i></i><i></i></div>
      </section>
      <section v-else-if="loadError" class="state-panel error-state" role="alert">
        <span class="state-mark error-mark" aria-hidden="true"></span><h1>钱包暂时没打开</h1><p>{{ loadError }}</p><button class="primary-button" type="button" @click="loadWallet">重新加载</button>
      </section>

      <template v-else-if="overview">
        <div class="scope-row">
          <label for="wallet-scope">正在看</label>
          <select id="wallet-scope" v-model="scope"><option v-for="option in scopeOptions" :key="option.key" :value="option.key">{{ option.label }}</option></select>
          <p v-if="scope === 'couple'">合计只用于看全局，不代表资金已合并。</p>
          <p v-else-if="scope !== currentUserId">全部可见，但只有本人能修改自己的计划和账户。</p>
        </div>

        <div v-if="activeTab === 'wallet'" id="wallet-panel-wallet" role="tabpanel" aria-labelledby="wallet-tab-wallet" class="tab-panel">
          <section class="safe-panel" :class="{ deficit: scopeSummary?.safeToSpend < 0, 'long-values': hasLongSafeValue(scopeSummary) }">
            <div class="safe-heading"><div><span class="kicker">安心可用</span><h1 class="safe-amount wallet-number" :class="{ 'long-number': hasLongSafeValue(scopeSummary) }">{{ formatMoney(scopeSummary?.safeToSpend) }}</h1></div><span class="confidence-badge" :class="scopeSummary?.confidence">{{ scopeSummary?.confidence === 'complete' ? '已核对' : '待补全' }}</span></div>
            <p class="safe-copy">{{ walletConfidenceCopy(scopeSummary) }}</p>
            <dl class="safe-breakdown"><div><dt>流动资产</dt><dd class="wallet-number">{{ formatMoney(scopeSummary?.liquidAssets) }}</dd></div><div><dt>近期还款</dt><dd class="wallet-number">-{{ formatMoney(scopeSummary?.debtReserve) }}</dd></div><div><dt>生活与约定</dt><dd class="wallet-number">-{{ formatMoney((scopeSummary?.essentialReserve || 0) + (scopeSummary?.committedReserve || 0)) }}</dd></div></dl>
          </section>

          <section aria-labelledby="next-payment-heading">
            <div class="section-heading"><div><span class="section-index">01</span><h2 id="next-payment-heading">最近还款</h2></div><button v-if="nextDue" class="text-button" type="button" @click="activeTab = 'debts'">看全部</button></div>
            <div v-if="nextDue" class="next-payment-row"><span class="due-date"><b>{{ formatLocalDate(nextDue.date, overview.today) }}</b><small>{{ ownerLabel(nextDue.ownerId) }}</small></span><span class="due-copy"><strong>{{ nextDue.title }}</strong><small>到期前准备好这笔钱</small></span><span class="due-action"><b class="wallet-number">{{ formatMoney(nextDue.amount) }}</b><button type="button" @click="openPayment(nextDue)">去还款</button></span></div>
            <div v-else class="inline-empty"><span class="empty-stamp" aria-hidden="true"></span><div><strong>近期没有待还款</strong><p>新增欠款后，会自动在这里提醒。</p></div><button v-if="scope === currentUserId" class="text-button" type="button" @click="openDebt">录入欠款</button></div>
          </section>

          <section aria-labelledby="pocket-heading">
            <div class="section-heading"><div><span class="section-index">02</span><h2 id="pocket-heading">本月资金分仓</h2></div><button v-if="scope === currentUserId" class="text-button" type="button" @click="openPlan">调整</button></div>
            <div class="pocket-list"><div v-for="pocket in scopeSummary?.pockets || []" :key="pocket.key" class="pocket-row"><span class="pocket-shape" :class="`tone-${POCKET_META[pocket.key]?.tone}`" aria-hidden="true"></span><strong>{{ POCKET_META[pocket.key]?.label }}</strong><span class="wallet-number">{{ formatMoney(pocket.amount) }}</span></div></div>
            <p v-if="scopeSummary?.confidence !== 'complete'" class="section-note">先填本月计划，安心可用才会扣除真实预留。</p>
          </section>

          <section aria-labelledby="progress-heading">
            <div class="section-heading"><div><span class="section-index">03</span><h2 id="progress-heading">上岸进度</h2></div><strong class="progress-number wallet-number">{{ scopeSummary?.debtProgress || 0 }}%</strong></div>
            <div class="progress-track" role="progressbar" aria-label="债务还清进度" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="scopeSummary?.debtProgress || 0"><span :style="{ transform: `scaleX(${Math.min(100, scopeSummary?.debtProgress || 0) / 100})` }"></span></div>
            <p class="section-note">{{ scopeSummary?.originalDebt > 0 ? `已经还下 ${formatMoney(scopeSummary.paidDebt)}，每一笔都在把未来拿回来。` : '录入第一笔欠款后，这里会记录每一步减少。' }}</p>
          </section>

          <section v-if="paymentReceipt" class="payment-receipt" role="status"><span class="receipt-check" aria-hidden="true"><i></i></span><div><strong>这笔欠款又轻了一点</strong><p>{{ formatMoney(paymentReceipt.amount) }} 已完成还款，资产、负债和流水已同步。</p></div><button type="button" aria-label="关闭还款回执" @click="paymentReceipt = null">×</button></section>

          <section aria-labelledby="account-heading">
            <div class="section-heading"><div><span class="section-index">04</span><h2 id="account-heading">账户底账</h2></div><button class="text-button" type="button" @click="openAccount()">添加我的账户</button></div>
            <div v-if="visibleAccounts.length" class="account-list"><button v-for="account in visibleAccounts" :key="account._id" type="button" class="account-row" :disabled="String(account.userId) !== currentUserId" @click="openAccount(account)"><span class="account-letter" :class="account.type">{{ account.name.slice(0, 1) }}</span><span><strong>{{ account.name }}</strong><small>{{ ownerLabel(account.userId) }} · {{ subTypeLabel(account.subType) }}</small></span><b class="wallet-number">{{ account.type === 'liability' ? '-' : '' }}{{ formatMoney(account.balance, account.currency) }}</b></button></div>
            <div v-else class="inline-empty"><span class="empty-stamp" aria-hidden="true"></span><div><strong>还没有账户</strong><p>先添加银行卡或现金账户，钱包才有真实底数。</p></div></div>
          </section>
        </div>

        <div v-else-if="activeTab === 'plan'" id="wallet-panel-plan" role="tabpanel" aria-labelledby="wallet-tab-plan" class="tab-panel">
          <section class="plan-summary">
            <div class="section-heading"><div><span class="section-index">MONTH</span><h1>{{ monthLabel }}</h1></div><div class="month-controls"><button type="button" aria-label="上个月" @click="changeMonth(-1)">‹</button><button type="button" aria-label="下个月" @click="changeMonth(1)">›</button></div></div>
            <div v-if="visiblePlans.length" class="plan-owner-list"><article v-for="plan in visiblePlans" :key="plan._id" class="plan-owner-row"><span><strong>{{ ownerLabel(plan.ownerId) }}的安排</strong><small>{{ plan.expectedIncome?.date ? `${formatLocalDate(plan.expectedIncome.date)}预计到账` : '还没填写收入日' }}</small></span><b class="wallet-number">{{ formatMoney(plan.expectedIncome?.amount || 0) }}</b></article></div>
            <div v-else class="inline-empty"><span class="empty-stamp" aria-hidden="true"></span><div><strong>这个月还没分配</strong><p>预计收入只是未来现金流，不会提前算进安心可用。</p></div></div>
            <button v-if="scope === currentUserId" class="primary-button" type="button" @click="openPlan">安排我的这个月</button>
          </section>
          <section aria-labelledby="timeline-heading"><div class="section-heading"><div><span class="section-index">FLOW</span><h2 id="timeline-heading">未来现金流</h2></div></div><ol v-if="visibleTimeline.length" class="timeline-list"><li v-for="item in visibleTimeline" :key="item.id" :class="item.type"><span class="timeline-dot" aria-hidden="true"></span><time :datetime="item.date">{{ formatLocalDate(item.date, overview.today) }}</time><div><strong>{{ item.title }}</strong><small>{{ ownerLabel(item.ownerId) }}</small></div><b class="wallet-number">{{ item.type === 'expected_income' ? '+' : '-' }}{{ formatMoney(item.amount) }}</b></li></ol><div v-else class="state-panel compact-state"><h2>未来暂时很安静</h2><p>补上收入日或欠款计划后，会按日期排成时间轴。</p></div></section>
        </div>

        <div v-else-if="activeTab === 'debts'" id="wallet-panel-debts" role="tabpanel" aria-labelledby="wallet-tab-debts" class="tab-panel">
          <section class="debt-heading"><div><span class="kicker">DEBT FIRST</span><h1>先把欠款变成有尽头的路</h1><p>录入金额、首期日期和期数，后面的每一期自动排好。</p></div><button class="primary-button" type="button" @click="openDebt">录入我的欠款</button></section>
          <div v-if="visibleDebts.length" class="debt-list"><article v-for="debt in visibleDebts" :key="debt._id" class="debt-item" :class="{ paid: debt.status === 'paid' }"><header><span class="debt-provider">{{ providerLabel(debt.provider) }}</span><span class="debt-owner">{{ ownerLabel(debt.ownerId) }}</span></header><div class="debt-total"><div><h2>{{ debt.name }}</h2><p>{{ debt.status === 'paid' ? '已经还清' : `剩余 ${debt.schedule.filter(row => row.status !== 'paid').length} 期` }}</p></div><b class="wallet-number">{{ formatMoney(debt.outstandingAmount) }}</b></div><div class="debt-progress" role="progressbar" aria-label="单笔欠款还清进度" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="debtProgress(debt)"><span :style="{ transform: `scaleX(${debtProgress(debt) / 100})` }"></span></div><details><summary>查看 {{ debt.installmentCount }} 期计划</summary><ol class="installment-list"><li v-for="row in debt.schedule" :key="row._id" :class="row.status"><span><b>第 {{ row.sequence }} 期</b><small>{{ formatLocalDate(row.dueDate, overview.today) }}</small></span><strong class="wallet-number">{{ formatMoney(Math.max(0, row.plannedAmount - row.paidAmount)) }}</strong><span class="installment-actions"><button v-if="row.status !== 'paid'" type="button" @click="openPayment({ debtPlanId: debt._id, installmentId: row._id, amount: row.plannedAmount - row.paidAmount, title: debt.name })">还款</button><button v-if="row.status !== 'paid' && String(debt.ownerId) === currentUserId" type="button" class="quiet-button" @click="openInstallment(debt, row)">调整</button><em v-if="row.status === 'paid'">已完成</em></span></li></ol></details><button v-if="String(debt.ownerId) === currentUserId" class="archive-button" type="button" @click="archiveDebt(debt)">归档这笔计划</button></article></div>
          <section v-else class="state-panel"><span class="state-mark debt-mark" aria-hidden="true"></span><h2>还没有欠款计划</h2><p>如果确实没有欠款，这就是很好的空白；有的话，录入后才能真正开始上岸。</p></section>
        </div>

        <div v-else id="wallet-panel-transactions" role="tabpanel" aria-labelledby="wallet-tab-transactions" class="tab-panel">
          <section class="transaction-toolbar"><div class="section-heading"><div><span class="section-index">LEDGER</span><h1>{{ monthLabel }}流水</h1></div><div class="month-controls"><button type="button" aria-label="上个月" @click="changeMonth(-1)">‹</button><button type="button" aria-label="下个月" @click="changeMonth(1)">›</button></div></div><dl><div><dt>收入</dt><dd class="wallet-number income">+{{ formatMoney(transactionSummary.income) }}</dd></div><div><dt>消费</dt><dd class="wallet-number expense">-{{ formatMoney(transactionSummary.expense) }}</dd></div></dl><button class="primary-button" type="button" @click="openTransaction()">记一笔真实流水</button></section>
          <div v-if="transactionGroups.length" class="transaction-days"><section v-for="group in transactionGroups" :key="group.date" class="transaction-day"><h2>{{ formatLocalDate(group.date, overview.today) }}</h2><button v-for="transaction in group.items" :key="transaction._id" type="button" class="transaction-row" :disabled="transaction.kind === 'debt_payment' || String(transaction.creatorId) !== currentUserId" @click="openTransaction(transaction)"><span class="transaction-shape" :class="transaction.kind || transaction.type" aria-hidden="true"></span><span><strong>{{ transaction.category || transactionTypeLabel(transaction) }}</strong><small>{{ ownerLabel(transaction.creatorId) }}<template v-if="transaction.note"> · {{ transaction.note }}</template></small></span><b class="wallet-number">{{ transactionSign(transaction) }}{{ formatMoney(transaction.amount, transaction.currency) }}</b></button></section></div>
          <section v-else class="state-panel compact-state"><h2>这个月还没有流水</h2><p>还款会自动留下记录，普通收支也可以从这里补上。</p></section>
        </div>
      </template>
    </main>

    <Transition name="toast"><div v-if="toast.show" class="budget-toast" :class="toast.type" role="status" aria-live="polite" aria-atomic="true">{{ toast.message }}</div></Transition>
    <Transition name="sync"><div v-if="partnerSyncVisible" class="partner-sync" role="status">对方刚更新了钱包，已为你同步。</div></Transition>

    <div v-if="sheet" class="sheet-backdrop" @click.self="closeSheet">
      <section ref="sheetDialog" class="sheet" role="dialog" aria-modal="true" :aria-labelledby="`sheet-${sheet}-title`" @keydown="handleSheetKeydown">
        <header class="sheet-header"><div><span class="kicker">WALLET ACTION</span><h2 :id="`sheet-${sheet}-title`">{{ sheetTitle }}</h2></div><button type="button" aria-label="关闭" @click="closeSheet"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header>

        <form v-if="sheet === 'debt'" class="sheet-body" @submit.prevent="submitDebt">
          <label class="field"><span>欠款名称</span><input v-model.trim="debtForm.name" maxlength="40" placeholder="例如：花呗待还" required></label><label class="field"><span>类型</span><select v-model="debtForm.provider"><option v-for="option in providerOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><p class="form-note">额外手续费/利息只填“剩余欠款”之外还要支付的金额；账单待还已经包含的话填 0。</p><div class="field-pair"><label class="field"><span>剩余欠款</span><input v-model.number="debtForm.amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label class="field"><span>额外手续费/利息</span><input v-model.number="debtForm.feeAmount" type="number" min="0" step="0.01" inputmode="decimal"></label></div><div class="field-pair"><label class="field"><span>首期还款日</span><DatePickerField v-model="debtForm.firstDueDate" display-class="wallet-date-field"/></label><label class="field"><span>剩余期数</span><input v-model.number="debtForm.installmentCount" type="number" min="1" max="120" inputmode="numeric" required></label></div><label class="field"><span>关联负债账户</span><select v-model="debtForm.liabilityAccountId"><option value="">自动新建同名负债账户</option><option v-for="account in ownLiabilityAccounts" :key="account._id" :value="account._id">{{ account.name }} · {{ formatMoney(account.balance, account.currency) }}</option></select></label><p class="form-note">关联已有账户时会按这里填写的欠款总额校准其余额。系统按本地日历排期，月末会自动夹取合法日期，最多 120 期。</p><SheetActions :submitting="submitting" submit-label="生成还款计划" @cancel="closeSheet"/>
        </form>

        <form v-else-if="sheet === 'payment'" class="sheet-body" @submit.prevent="submitPayment">
          <div class="payment-callout"><span>本次还款</span><strong>{{ paymentForm.title }}</strong><p>付款只能使用你自己的资产账户；替对方还款不会自动生成情侣借款。</p></div><label class="field"><span>付款账户</span><select v-model="paymentForm.assetAccountId" required><option value="" disabled>选择我的资产账户</option><option v-for="account in ownAssetAccounts" :key="account._id" :value="account._id">{{ account.name }} · {{ formatMoney(account.balance, account.currency) }}</option></select></label><label class="field"><span>还款金额</span><input v-model.number="paymentForm.amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><label class="field"><span>备注（可选）</span><input v-model.trim="paymentForm.note" maxlength="200"></label><p v-if="!ownAssetAccounts.length" class="form-error">请先添加一个自己的资产账户。</p><footer class="sheet-actions"><button type="button" class="secondary-button" @click="closeSheet">取消</button><button type="submit" class="primary-button" :disabled="submitting || !ownAssetAccounts.length">{{ submitting ? '正在安全入账…' : '确认还款' }}</button></footer>
        </form>

        <form v-else-if="sheet === 'plan'" class="sheet-body" @submit.prevent="submitPlan">
          <p class="form-note">预计收入只放进未来时间轴，不会提前增加当前“安心可用”。</p><label class="field"><span>预计收入名称</span><input v-model.trim="planForm.expectedIncome.title" maxlength="30" placeholder="例如：工资到账"></label><div class="field-pair"><label class="field"><span>预计金额</span><input v-model.number="planForm.expectedIncome.amount" type="number" min="0" step="0.01" inputmode="decimal"></label><label class="field"><span>到账日期</span><DatePickerField v-model="planForm.expectedIncome.date" display-class="wallet-date-field"/></label></div><fieldset class="pocket-fields"><legend>本月资金分仓</legend><label v-for="pocket in planForm.pockets" :key="pocket.key"><span><i class="pocket-shape" :class="`tone-${POCKET_META[pocket.key].tone}`"></i>{{ POCKET_META[pocket.key].label }}</span><input v-model.number="pocket.amount" type="number" min="0" step="0.01" inputmode="decimal"></label></fieldset><SheetActions :submitting="submitting" submit-label="保存本月安排" @cancel="closeSheet"/>
        </form>

        <form v-else-if="sheet === 'account'" class="sheet-body" @submit.prevent="submitAccount">
          <label class="field"><span>账户名称</span><input v-model.trim="accountForm.name" maxlength="30" placeholder="例如：工资卡" required></label><div class="choice-row" role="group" aria-label="账户类型"><button type="button" :class="{ active: accountForm.type === 'asset' }" @click="setAccountType('asset')">资产</button><button type="button" :class="{ active: accountForm.type === 'liability' }" @click="setAccountType('liability')">负债</button></div><label class="field"><span>账户种类</span><select v-model="accountForm.subType"><option v-for="option in availableSubTypes" :key="option.value" :value="option.value">{{ option.label }}</option></select></label><div class="field-pair"><label class="field"><span>币种</span><input v-model.trim="accountForm.currency" maxlength="10"></label><label class="field"><span>{{ accountForm.type === 'asset' ? '当前余额' : '当前欠款' }}</span><input v-model.number="accountForm.balance" type="number" min="0" step="0.01" inputmode="decimal"></label></div><footer class="sheet-actions"><button v-if="editingAccount" type="button" class="danger-button" @click="deleteAccount">删除</button><button type="button" class="secondary-button" @click="closeSheet">取消</button><button type="submit" class="primary-button" :disabled="submitting">{{ submitting ? '正在保存…' : '保存账户' }}</button></footer>
        </form>

        <form v-else-if="sheet === 'transaction'" class="sheet-body" @submit.prevent="submitTransaction">
          <div class="choice-row three" role="group" aria-label="流水类型"><button type="button" :class="{ active: transactionForm.type === 'expense' }" @click="transactionForm.type = 'expense'">消费</button><button type="button" :class="{ active: transactionForm.type === 'income' }" @click="transactionForm.type = 'income'">收入</button><button type="button" :class="{ active: transactionForm.type === 'transfer' }" @click="transactionForm.type = 'transfer'">转账</button></div><label class="field"><span>金额</span><input v-model.number="transactionForm.amount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label>
          <template v-if="transactionForm.type === 'transfer'"><label class="field"><span>转出账户</span><select v-model="transactionForm.accountId" required><option value="" disabled>选择自己的资产账户</option><option v-for="account in ownAssetAccounts" :key="account._id" :value="account._id">{{ account.name }}</option></select></label><label class="field"><span>转入账户</span><select v-model="transactionForm.toAccountId" required><option value="" disabled>选择另一个资产账户</option><option v-for="account in transferTargetAccounts" :key="account._id" :value="account._id">{{ account.name }}</option></select></label></template>
          <template v-else><label class="field"><span>分类</span><input v-model.trim="transactionForm.category" list="wallet-category-options" maxlength="20" required><datalist id="wallet-category-options"><option v-for="category in transactionCategories" :key="category" :value="category"/></datalist></label><label class="field"><span>关联账户（可选）</span><select v-model="transactionForm.accountId"><option value="">不调整账户余额</option><option v-for="account in ownAccounts" :key="account._id" :value="account._id">{{ account.name }} · {{ account.type === 'liability' ? '负债' : '资产' }}</option></select></label><p v-if="selectedTransactionAccount?.type === 'liability' && transactionForm.type === 'expense'" class="form-note">这笔会记作负债消费：算入消费，同时增加该负债账户余额。</p></template>
          <label class="field"><span>发生日期</span><DatePickerField v-model="transactionForm.date" display-class="wallet-date-field"/></label><label class="field"><span>备注（可选）</span><input v-model.trim="transactionForm.note" maxlength="200"></label><footer class="sheet-actions"><button v-if="editingTransaction" type="button" class="danger-button" @click="deleteTransaction">删除</button><button type="button" class="secondary-button" @click="closeSheet">取消</button><button type="submit" class="primary-button" :disabled="submitting">{{ submitting ? '正在保存…' : '保存流水' }}</button></footer>
        </form>

        <form v-else-if="sheet === 'installment'" class="sheet-body" @submit.prevent="submitInstallment">
          <label class="field"><span>还款日期</span><DatePickerField v-model="installmentForm.dueDate" display-class="wallet-date-field"/></label><label class="field"><span>计划金额</span><input v-model.number="installmentForm.plannedAmount" type="number" min="0.01" step="0.01" inputmode="decimal" required></label><p class="form-note">已还金额不会被改小；修改本期金额后，差额会自动平衡到其他未还期次，剩余总欠款不变。</p><SheetActions :submitting="submitting" submit-label="保存调整" @cancel="closeSheet"/>
        </form>

      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, defineComponent, h, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import FeatureHeader from '../components/FeatureHeader.vue'
import DatePickerField from '../components/DatePickerField.vue'
import { useWebSocket } from '../composables/useWebSocket.js'
import { useUserStore } from '../stores/user.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { POCKET_META, WALLET_TABS, formatLocalDate, formatMoney, groupTransactionsByDay, makeRequestId, nextDebtDue, ownerOptions, scopeRows, selectedOwnerIds, summaryForScope, transactionSign, walletConfidenceCopy } from '../utils/wallet.js'

const SheetActions = defineComponent({
  props: { submitting: Boolean, submitLabel: { type: String, required: true } },
  emits: ['cancel'],
  setup(props, { emit }) {
    return () => h('footer', { class: 'sheet-actions' }, [
      h('button', { type: 'button', class: 'secondary-button', onClick: () => emit('cancel') }, '取消'),
      h('button', { type: 'submit', class: 'primary-button', disabled: props.submitting }, props.submitting ? '正在保存…' : props.submitLabel)
    ])
  }
})

const userStore = useUserStore()
const { onMessage } = useWebSocket()
const overview = ref(null)
const currentUserId = computed(() => String(overview.value?.viewerId || resolveCurrentUserId(userStore) || ''))
const authToken = () => localStorage.getItem('token') || ''
const todayString = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const defaultPockets = () => Object.keys(POCKET_META).map(key => ({ key, amount: 0 }))

const activeTab = ref('wallet'), transactions = ref([]), scope = ref('')
const currentMonth = ref(todayString().slice(0, 7)), loading = ref(true), loadError = ref(''), submitting = ref(false), sheet = ref('')
const toast = ref({ show: false, message: '', type: 'info' }), partnerSyncVisible = ref(false), paymentReceipt = ref(null)
const editingAccount = ref(null), editingTransaction = ref(null)
const sheetDialog = ref(null)
let toastTimer, syncTimer, unsubscribeWS, sheetTrigger, previousBodyOverflow = ''

const providerOptions = [{ value: 'huabei', label: '花呗' }, { value: 'baitiao', label: '白条' }, { value: 'credit_card', label: '信用卡' }, { value: 'loan', label: '借款' }, { value: 'other', label: '其他欠款' }]
const subTypeOptions = [{ value: 'wechat', label: '微信', type: 'asset' }, { value: 'alipay', label: '支付宝', type: 'asset' }, { value: 'bank', label: '银行卡', type: 'asset' }, { value: 'cash', label: '现金', type: 'asset' }, { value: 'investment', label: '投资', type: 'asset' }, { value: 'other_asset', label: '其他资产', type: 'asset' }, { value: 'huabei', label: '花呗', type: 'liability' }, { value: 'baitiao', label: '白条', type: 'liability' }, { value: 'credit_card', label: '信用卡', type: 'liability' }, { value: 'loan', label: '借款', type: 'liability' }, { value: 'other_liability', label: '其他负债', type: 'liability' }]
const expenseDefaults = ['餐饮', '交通', '购物', '娱乐', '住房', '医疗', '教育', '通讯', '人情', '宠物', '其他'], incomeDefaults = ['工资', '奖金', '兼职', '理财', '红包', '退款', '其他']

const debtForm = ref({ name: '', provider: 'huabei', amount: '', feeAmount: 0, firstDueDate: todayString(), installmentCount: 1, liabilityAccountId: '', requestId: makeRequestId('debt-create') })
const paymentForm = ref({ debtPlanId: '', installmentId: '', assetAccountId: '', amount: '', title: '', note: '', requestId: '' })
const planForm = ref({ expectedIncome: { title: '预计收入', amount: 0, date: '' }, pockets: defaultPockets() })
const accountForm = ref({ name: '', type: 'asset', subType: 'bank', currency: 'CNY', balance: 0 })
const transactionForm = ref({ type: 'expense', amount: '', category: '餐饮', accountId: '', toAccountId: '', date: todayString(), note: '', currency: 'CNY' })
const installmentForm = ref({ debtId: '', installmentId: '', dueDate: '', plannedAmount: 0 })

const scopeOptions = computed(() => ownerOptions(overview.value)), scopeSummary = computed(() => summaryForScope(scope.value, overview.value))
const visibleAccounts = computed(() => scopeRows(overview.value?.accounts, scope.value, overview.value, 'userId'))
const ownAccounts = computed(() => (overview.value?.accounts || []).filter(a => String(a.userId) === currentUserId.value))
const ownAssetAccounts = computed(() => ownAccounts.value.filter(a => a.type === 'asset' && !a.isArchived)), ownLiabilityAccounts = computed(() => ownAccounts.value.filter(a => a.type === 'liability' && !a.isArchived))
const visibleDebts = computed(() => scopeRows(overview.value?.debts, scope.value, overview.value)), visiblePlans = computed(() => scopeRows(overview.value?.monthlyPlans, scope.value, overview.value)), visibleTimeline = computed(() => scopeRows(overview.value?.timeline, scope.value, overview.value)), nextDue = computed(() => nextDebtDue(overview.value?.timeline, scope.value, overview.value))
const monthLabel = computed(() => { const [year, month] = currentMonth.value.split('-'); return `${year}年${Number(month)}月` })
const monthTransactions = computed(() => transactions.value.filter(t => selectedOwnerIds(scope.value, overview.value).includes(String(t.creatorId)) && localDateKey(t.date).startsWith(currentMonth.value)))
const transactionGroups = computed(() => groupTransactionsByDay(monthTransactions.value.map(t => ({ ...t, date: localDateKey(t.date) }))))
const transactionSummary = computed(() => ({ income: monthTransactions.value.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0), expense: monthTransactions.value.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0) }))
const availableSubTypes = computed(() => subTypeOptions.filter(o => o.type === accountForm.value.type)), transferTargetAccounts = computed(() => ownAssetAccounts.value.filter(a => a._id !== transactionForm.value.accountId)), selectedTransactionAccount = computed(() => ownAccounts.value.find(a => a._id === transactionForm.value.accountId))
const transactionCategories = computed(() => transactionForm.value.type === 'income' ? incomeDefaults : expenseDefaults)
const sheetTitle = computed(() => ({ debt: '录入欠款', payment: '确认还款', plan: `${monthLabel.value}安排`, account: editingAccount.value ? '编辑账户' : '添加账户', transaction: editingTransaction.value ? '编辑流水' : '新增流水', installment: '调整分期' }[sheet.value] || '钱包'))
watch(overview, value => { if (!scope.value && value?.viewerId) scope.value = String(value.viewerId) })
watch(sheet, async (value, previous) => {
  if (value) {
    if (!previous) {
      sheetTrigger = document.activeElement
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    await nextTick()
    const preferredControl = sheetDialog.value?.querySelector('.sheet-body input:not(:disabled),.sheet-body select:not(:disabled),.sheet-body textarea:not(:disabled),.sheet-body button:not(:disabled)')
    const fallbackControl = sheetDialog.value?.querySelector('.sheet-header button:not(:disabled)')
    ;(preferredControl || fallbackControl)?.focus()
    return
  }
  if (previous) {
    document.body.style.overflow = previousBodyOverflow
    sheetTrigger?.focus?.()
    sheetTrigger = null
  }
})

function localDateKey(value) { if (!value) return ''; const d = new Date(value); if (Number.isNaN(d.getTime())) return String(value).slice(0, 10); const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d); const map = Object.fromEntries(parts.map(p => [p.type, p.value])); return `${map.year}-${map.month}-${map.day}` }
function ownerLabel(id) { return String(id) === currentUserId.value ? '我' : overview.value?.identities?.find(i => String(i.userId) === String(id))?.nickname || '伴侣' }
function providerLabel(value) { return providerOptions.find(o => o.value === value)?.label || '其他欠款' }
function subTypeLabel(value) { return subTypeOptions.find(o => o.value === value)?.label || '其他' }
function transactionTypeLabel(t) { return t.kind === 'debt_payment' ? '债务还款' : t.kind === 'debt_purchase' ? '负债消费' : t.type === 'transfer' ? '账户转账' : t.type === 'income' ? '收入' : '消费' }
function hasLongSafeValue(summary) { return ['safeToSpend', 'liquidAssets', 'debtReserve', 'essentialReserve', 'committedReserve'].some(key => Math.abs(Number(summary?.[key] || 0)) >= 1000000) }
function debtProgress(debt) { const total = Number(debt.originalAmount || 0) + Number(debt.feeAmount || 0); return total > 0 ? Math.min(100, Math.round(((total - Number(debt.outstandingAmount || 0)) / total) * 100)) : 0 }
function showToast(message, type = 'info') { clearTimeout(toastTimer); toast.value = { show: true, message, type }; toastTimer = setTimeout(() => { toast.value.show = false }, 3000) }
function handleSheetKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); closeSheet(); return }
  if (event.key !== 'Tab') return
  const controls = [...sheetDialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
    .filter(element => element.getClientRects().length)
  if (!controls.length) return
  const first = controls[0], last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
}

async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { Authorization: `Bearer ${authToken()}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } }); const body = await response.json().catch(() => ({})); if (!response.ok || !body.success) throw new Error(body.message || '请求失败，请稍后再试'); return body }
async function loadWallet(options = {}) { if (!options.silent) loading.value = true; loadError.value = ''; try { const [wallet, txns] = await Promise.all([api(`/api/wallet/overview?month=${currentMonth.value}`), api('/api/wallet/transactions')]); overview.value = wallet.data; transactions.value = txns.data || [] } catch (error) { if (!options.silent) loadError.value = error.message || '网络开小差了，请再试一次'; else showToast('同步失败，稍后会再试', 'error') } finally { loading.value = false } }
async function runMutation(operation, copy) { submitting.value = true; try { const result = await operation(); closeSheet(true); await loadWallet({ silent: true }); showToast(copy, 'success'); return result } catch (error) { showToast(error.message || '操作失败，请再试一次', 'error'); return null } finally { submitting.value = false } }
function closeSheet(force = false) { if (submitting.value && !force) return; sheet.value = ''; editingAccount.value = null; editingTransaction.value = null }

function openDebt() { debtForm.value = { name: '', provider: 'huabei', amount: '', feeAmount: 0, firstDueDate: todayString(), installmentCount: 1, liabilityAccountId: '', requestId: makeRequestId('debt-create') }; sheet.value = 'debt' }
async function submitDebt() { await runMutation(() => api('/api/wallet/debts', { method: 'POST', body: JSON.stringify(debtForm.value) }), '还款计划已经排好了') }
function openPayment(item) { paymentForm.value = { debtPlanId: item.debtPlanId, installmentId: item.installmentId || '', assetAccountId: ownAssetAccounts.value[0]?._id || '', amount: Number(item.amount || 0), title: item.title || '欠款计划', note: '', requestId: makeRequestId('debt-payment') }; sheet.value = 'payment' }
async function submitPayment() { const snapshot = { amount: Number(paymentForm.value.amount) }; const result = await runMutation(() => api(`/api/wallet/debts/${paymentForm.value.debtPlanId}/payments`, { method: 'POST', body: JSON.stringify(paymentForm.value) }), '还款完成，离上岸又近了一步'); if (result) paymentReceipt.value = snapshot }
function openPlan() { if (scope.value !== currentUserId.value) return showToast('只能安排自己的资金分仓', 'warning'); const plan = overview.value?.monthlyPlans?.find(p => String(p.ownerId) === currentUserId.value); planForm.value = { expectedIncome: { title: plan?.expectedIncome?.title || '预计收入', amount: plan?.expectedIncome?.amount || 0, date: plan?.expectedIncome?.date || '' }, pockets: defaultPockets().map(row => ({ ...row, amount: plan?.pockets?.find(p => p.key === row.key)?.amount || 0 })) }; sheet.value = 'plan' }
async function submitPlan() { await runMutation(() => api(`/api/wallet/monthly-plan/${currentMonth.value}`, { method: 'PUT', body: JSON.stringify(planForm.value) }), '本月安排已经放进钱包') }
function setAccountType(type) { accountForm.value.type = type; accountForm.value.subType = type === 'asset' ? 'bank' : 'other_liability' }
function openAccount(account = null) { if (account && String(account.userId) !== currentUserId.value) return; editingAccount.value = account; accountForm.value = account ? { name: account.name, type: account.type, subType: account.subType, currency: account.currency, balance: account.balance } : { name: '', type: 'asset', subType: 'bank', currency: 'CNY', balance: 0 }; sheet.value = 'account' }
async function submitAccount() { await runMutation(() => api(editingAccount.value ? `/api/accounts/${editingAccount.value._id}` : '/api/accounts', { method: editingAccount.value ? 'PUT' : 'POST', body: JSON.stringify(accountForm.value) }), editingAccount.value ? '账户已经更新' : '账户已经加入钱包') }
async function deleteAccount() { if (!editingAccount.value || !window.confirm(`确认删除账户“${editingAccount.value.name}”？`)) return; await runMutation(() => api(`/api/accounts/${editingAccount.value._id}`, { method: 'DELETE' }), '账户已经删除') }
function openTransaction(t = null) { if (t?.kind === 'debt_payment' || (t && String(t.creatorId) !== currentUserId.value)) return; editingTransaction.value = t; transactionForm.value = t ? { type: t.type, amount: t.amount, category: t.category || '', accountId: t.accountId || '', toAccountId: t.toAccountId || '', date: localDateKey(t.date), note: t.note || '', currency: t.currency || 'CNY' } : { type: 'expense', amount: '', category: '餐饮', accountId: '', toAccountId: '', date: todayString(), note: '', currency: 'CNY' }; sheet.value = 'transaction' }
async function submitTransaction() { const body = { ...transactionForm.value }; if (body.type === 'expense' && selectedTransactionAccount.value?.type === 'liability') body.kind = 'debt_purchase'; await runMutation(() => api(editingTransaction.value ? `/api/wallet/transactions/${editingTransaction.value._id}` : '/api/wallet/transactions', { method: editingTransaction.value ? 'PUT' : 'POST', body: JSON.stringify(body) }), editingTransaction.value ? '流水已经更新' : '流水已经记下') }
async function deleteTransaction() { if (!editingTransaction.value || !window.confirm('确认删除这条流水？账户余额会同步回滚。')) return; await runMutation(() => api(`/api/wallet/transactions/${editingTransaction.value._id}`, { method: 'DELETE' }), '流水已经删除') }
function openInstallment(debt, row) { installmentForm.value = { debtId: debt._id, installmentId: row._id, dueDate: row.dueDate, plannedAmount: row.plannedAmount }; sheet.value = 'installment' }
async function submitInstallment() { await runMutation(() => api(`/api/wallet/debts/${installmentForm.value.debtId}/installments/${installmentForm.value.installmentId}`, { method: 'PUT', body: JSON.stringify({ dueDate: installmentForm.value.dueDate, plannedAmount: installmentForm.value.plannedAmount }) }), '这一期已经调整') }
async function archiveDebt(debt) { if (!window.confirm(`确认归档“${debt.name}”？账户余额不会改变。`)) return; await runMutation(() => api(`/api/wallet/debts/${debt._id}`, { method: 'PUT', body: JSON.stringify({ status: 'archived' }) }), '欠款计划已经归档') }
async function changeMonth(delta) { const [year, month] = currentMonth.value.split('-').map(Number); const target = new Date(year, month - 1 + delta, 1); currentMonth.value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}`; await loadWallet() }
function handleSync(data) { loadWallet({ silent: true }); if (String(data?.data?.actor || '') !== currentUserId.value) { partnerSyncVisible.value = true; clearTimeout(syncTimer); syncTimer = setTimeout(() => { partnerSyncVisible.value = false }, 3000) } }
onMounted(() => {
  loadWallet()
  unsubscribeWS = onMessage(message => {
    if (['walletSync', 'accountSync'].includes(message.type)) handleSync(message)
  })
})
onUnmounted(() => { unsubscribeWS?.(); clearTimeout(toastTimer); clearTimeout(syncTimer); if (sheet.value) document.body.style.overflow = previousBodyOverflow })
</script>

<style scoped>
.wallet-page { min-height: 100vh; padding-bottom: var(--fellow-page-bottom-inset); color: var(--fellow-ink); background: var(--fellow-paper); font: 400 1rem/1.55 var(--fellow-font-body); }
.wallet-number { font: 700 1em/normal var(--fellow-font-number); font-variant-numeric: tabular-nums lining-nums; font-feature-settings: "tnum" 1, "lnum" 1; }
button,input,select { font: inherit; } button { color: inherit; cursor: pointer; }
.sheet-header svg { width: var(--fellow-space-6); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.wallet-tabs { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: var(--fellow-space-1); max-width: var(--fellow-content-max-width); margin: var(--fellow-space-3) auto 0; padding: var(--fellow-space-1); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); box-shadow: var(--fellow-shadow-soft); }
.wallet-tabs button { min-width: 0; min-height: var(--fellow-touch-target-min); padding: var(--fellow-space-2) var(--fellow-space-1); border: 0; border-radius: calc(var(--fellow-radius-control) - 2px); background: transparent; font: 600 .875rem/normal var(--fellow-font-ui); }
.wallet-tabs button.active { background: var(--fellow-yellow); font-weight: 700; }
.wallet-main { display: grid; gap: var(--fellow-space-section); width: min(calc(100% - (var(--fellow-space-page) * 2)),var(--fellow-content-max-width)); margin: 0 auto; padding: var(--fellow-space-5) 0 var(--fellow-space-6); }
.scope-row { display: grid; grid-template-columns: auto minmax(0,1fr); align-items: center; gap: var(--fellow-space-2); }
.scope-row label { font-size: .875rem; font-weight: 700; }
.scope-row select { min-width: 0; min-height: var(--fellow-touch-target-min); padding: 0 var(--fellow-space-3); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); font-size: 1rem; font-weight: 600; }
.scope-row p { grid-column: 1/-1; max-width: 32ch; margin: 0; color: var(--fellow-text-secondary); font-size: .875rem; line-height: 1.4; }
.tab-panel { display: grid; gap: var(--fellow-space-section); }

.safe-panel { padding: var(--fellow-space-card); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); background: var(--fellow-yellow); box-shadow: var(--fellow-shadow-raised); }
.safe-panel.deficit { background: var(--fellow-pink); }
.safe-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--fellow-space-3); }
.kicker,.section-index { display: block; font: 700 .875rem/1.4 var(--fellow-font-ui); letter-spacing: .08em; }
.safe-amount { max-width: 100%; margin: var(--fellow-space-1) 0 0; overflow-wrap: anywhere; font-size: 2.25rem; font-weight: 800; letter-spacing: -.025em; line-height: 1; }
.safe-amount.long-number { overflow-wrap: normal; font-size: clamp(1.75rem,7vw,2.5rem); letter-spacing: -.045em; white-space: nowrap; }
.confidence-badge { flex: none; padding: var(--fellow-space-1) var(--fellow-space-2); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); background: var(--fellow-white); font-size: .875rem; font-weight: 700; }
.confidence-badge.incomplete { background: var(--fellow-blue); }
.safe-copy { max-width: 32ch; margin: var(--fellow-space-3) 0 0; font-size: 1rem; line-height: 1.55; }
.safe-breakdown { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: var(--fellow-space-2); margin: var(--fellow-space-4) 0 0; padding-top: var(--fellow-space-3); border-top: 2px solid var(--fellow-ink); }
.safe-breakdown div { min-width: 0; }.safe-breakdown dt { font-size: .875rem; font-weight: 600; }.safe-breakdown dd { margin: var(--fellow-space-1) 0 0; overflow-wrap: anywhere; font-size: 1rem; font-weight: 700; line-height: 1.35; }
.safe-panel.long-values .safe-breakdown { grid-template-columns: 1fr; }
.safe-panel.long-values .safe-breakdown div { display: flex; align-items: baseline; justify-content: space-between; gap: var(--fellow-space-3); }
.safe-panel.long-values .safe-breakdown dd { margin: 0; overflow-wrap: normal; text-align: right; white-space: nowrap; }

.section-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--fellow-space-3); margin-bottom: var(--fellow-space-3); }
.section-heading>div:first-child { display: flex; align-items: baseline; gap: var(--fellow-space-2); min-width: 0; }
.section-heading h1,.section-heading h2 { margin: 0; font: 800 1.3125rem/1.2 var(--fellow-font-display); }
.section-index { color: var(--fellow-text-secondary); }
.text-button,.archive-button,.danger-link { min-height: var(--fellow-touch-target-min); padding: 0 var(--fellow-space-2); border: 0; background: transparent; font-size: .875rem; font-weight: 700; text-decoration: underline; text-underline-offset: var(--fellow-space-1); }
.next-payment-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); padding: var(--fellow-space-3); border-block: 2px solid var(--fellow-ink); background: color-mix(in srgb,var(--fellow-blue) 28%,var(--fellow-white)); }
.due-date,.due-copy,.due-action { display: grid; gap: var(--fellow-space-1); }.due-date { min-width: var(--fellow-space-10); text-align: center; }.due-date b,.due-copy strong { font-size: 1rem; font-weight: 700; line-height: 1.35; }.due-date small,.due-copy small { color: var(--fellow-text-secondary); font-size: .875rem; line-height: 1.4; }.due-action { justify-items: end; }.due-action b { font-size: 1.125rem; }
.due-action button,.installment-actions button { min-height: var(--fellow-touch-target-min); padding: 0 var(--fellow-space-3); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-pink); font-size: .875rem; font-weight: 700; }

.pocket-list,.account-list { border-block: 2px solid var(--fellow-ink); }
.pocket-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); min-height: var(--fellow-touch-target-min); padding: var(--fellow-space-2) 0; }
.pocket-row+.pocket-row,.account-row+.account-row { border-top: 1px solid color-mix(in srgb,var(--fellow-ink) 24%,transparent); }
.pocket-row strong { font-size: 1rem; font-weight: 600; }.pocket-row>span:last-child { font-size: 1rem; font-weight: 700; }
.pocket-shape { display: inline-block; flex: none; width: var(--fellow-space-5); height: var(--fellow-space-5); border: 2px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-white); }
.pocket-shape.tone-pink { background: var(--fellow-pink); border-radius: var(--fellow-space-1); }.pocket-shape.tone-yellow { background: var(--fellow-yellow); transform: rotate(45deg) scale(.78); }.pocket-shape.tone-blue { background: var(--fellow-blue); border-radius: var(--fellow-space-1) var(--fellow-space-3); }.pocket-shape.tone-mint { background: var(--fellow-mint); }.pocket-shape.tone-orange { background: var(--fellow-orange); border-radius: var(--fellow-space-1); transform: rotate(-8deg); }
.section-note,.debt-heading p,.form-note,.form-error { max-width: 32ch; margin: var(--fellow-space-2) 0 0; color: var(--fellow-text-secondary); font-size: .875rem; line-height: 1.4; }
.progress-number { font-size: 1.125rem; }
.progress-track,.debt-progress { height: var(--fellow-space-3); overflow: hidden; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); background: var(--fellow-white); }
.progress-track span,.debt-progress span { display: block; width: 100%; height: 100%; transform-origin: left; background: var(--fellow-mint); transition: transform var(--fellow-motion-slow) var(--fellow-ease-emphasized); }

.payment-receipt { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); padding: var(--fellow-space-4); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-mint); box-shadow: var(--fellow-shadow-soft); }
.receipt-check { position: relative; width: var(--fellow-space-10); height: var(--fellow-space-10); border: 3px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-white); }.receipt-check i { position: absolute; inset: 25% 20% 32% 25%; border-width: 0 0 3px 3px; border-style: solid; transform: rotate(-45deg); }
.payment-receipt strong { font: 700 1.125rem/1.35 var(--fellow-font-display); }.payment-receipt p { margin: var(--fellow-space-1) 0 0; font-size: 1rem; line-height: 1.55; }.payment-receipt>button { width: var(--fellow-touch-target-min); height: var(--fellow-touch-target-min); padding: 0; border: 0; background: transparent; font-size: 1.3125rem; }

.account-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); width: 100%; min-height: calc(var(--fellow-touch-target-min) + var(--fellow-space-3)); padding: var(--fellow-space-2) 0; border: 0; background: transparent; text-align: left; }.account-row:disabled { opacity: 1; }
.account-letter { display: grid; width: var(--fellow-space-10); height: var(--fellow-space-10); place-items: center; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-blue); font: 800 1rem/normal var(--fellow-font-display); }.account-letter.liability { background: var(--fellow-pink); }
.account-row>span:nth-child(2) { display: grid; gap: var(--fellow-space-1); min-width: 0; }.account-row strong { overflow-wrap: anywhere; font-size: 1rem; line-height: 1.35; }.account-row small { color: var(--fellow-text-secondary); font-size: .875rem; line-height: 1.4; }.account-row>b { max-width: 16ch; overflow-wrap: anywhere; font-size: 1rem; text-align: right; }
.inline-empty { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); min-height: calc(var(--fellow-touch-target-min) + var(--fellow-space-6)); padding-block: var(--fellow-space-3); border-block: 2px dashed var(--fellow-ink); }
.empty-stamp,.state-mark { display: block; width: var(--fellow-space-10); height: var(--fellow-space-10); border: 3px solid var(--fellow-ink); border-radius: 50% 45% 52% 48%; background: var(--fellow-blue); transform: rotate(-8deg); }.inline-empty strong { font-size: 1rem; }.inline-empty p { margin: var(--fellow-space-1) 0 0; color: var(--fellow-text-secondary); font-size: .875rem; line-height: 1.4; }

.plan-summary,.transaction-toolbar { padding-bottom: var(--fellow-space-4); border-bottom: 3px solid var(--fellow-ink); }
.month-controls { display: flex; gap: var(--fellow-space-2); }.month-controls button { width: var(--fellow-touch-target-min); height: var(--fellow-touch-target-min); padding: 0; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); font-size: 1.3125rem; font-weight: 700; }
.plan-owner-list { margin-bottom: var(--fellow-space-4); border-block: 2px solid var(--fellow-ink); }.plan-owner-row { display: flex; align-items: center; justify-content: space-between; gap: var(--fellow-space-3); padding: var(--fellow-space-3) 0; }.plan-owner-row+.plan-owner-row { border-top: 1px solid color-mix(in srgb,var(--fellow-ink) 24%,transparent); }.plan-owner-row span { display: grid; gap: var(--fellow-space-1); }.plan-owner-row strong,.plan-owner-row b { font-size: 1rem; }.plan-owner-row small { color: var(--fellow-text-secondary); font-size: .875rem; }
.timeline-list { position: relative; display: grid; gap: var(--fellow-space-4); margin: 0; padding: 0 0 0 var(--fellow-space-5); list-style: none; }.timeline-list::before { position: absolute; top: var(--fellow-space-2); bottom: var(--fellow-space-2); left: var(--fellow-space-1); width: 2px; background: var(--fellow-ink); content: ""; }
.timeline-list li { position: relative; display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); min-height: var(--fellow-touch-target-min); }.timeline-dot { position: absolute; left: calc(var(--fellow-space-5) * -1); width: var(--fellow-space-2); height: var(--fellow-space-2); border: 2px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-pink); }.expected_income .timeline-dot { background: var(--fellow-mint); }
.timeline-list time,.timeline-list small { color: var(--fellow-text-secondary); font-size: .875rem; }.timeline-list div { display: grid; gap: var(--fellow-space-1); min-width: 0; }.timeline-list strong { overflow-wrap: anywhere; font-size: 1rem; }.timeline-list>li>b { font-size: 1rem; }

.debt-heading { display: grid; gap: var(--fellow-space-4); padding: var(--fellow-space-4); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); background: var(--fellow-blue); box-shadow: var(--fellow-shadow-soft); }.debt-heading h1 { margin: var(--fellow-space-1) 0 0; font: 800 1.3125rem/1.2 var(--fellow-font-display); }.debt-heading p { color: var(--fellow-ink); }.debt-list { display: grid; gap: var(--fellow-space-section); }.debt-item { padding-bottom: var(--fellow-space-4); border-bottom: 3px solid var(--fellow-ink); }
.debt-item>header { display: flex; align-items: center; gap: var(--fellow-space-2); }.debt-provider,.debt-owner { padding: var(--fellow-space-1) var(--fellow-space-2); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); background: var(--fellow-pink); font-size: .875rem; font-weight: 700; }.debt-owner { background: var(--fellow-white); }.debt-item.paid .debt-provider { background: var(--fellow-mint); }
.debt-total { display: flex; align-items: end; justify-content: space-between; gap: var(--fellow-space-3); margin: var(--fellow-space-3) 0; }.debt-total h2 { margin: 0; overflow-wrap: anywhere; font: 800 1.3125rem/1.2 var(--fellow-font-display); }.debt-total p { margin: var(--fellow-space-1) 0 0; color: var(--fellow-text-secondary); font-size: .875rem; }.debt-total>b { max-width: 14ch; overflow-wrap: anywhere; font-size: 1.125rem; text-align: right; }
.debt-item details { margin-top: var(--fellow-space-3); }.debt-item summary { min-height: var(--fellow-touch-target-min); padding: var(--fellow-space-2) 0; font-size: 1rem; font-weight: 700; }.installment-list { margin: 0; padding: 0; border-top: 2px solid var(--fellow-ink); list-style: none; }.installment-list li { display: grid; grid-template-columns: minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-2) var(--fellow-space-3); padding: var(--fellow-space-3) 0; border-bottom: 1px solid color-mix(in srgb,var(--fellow-ink) 24%,transparent); }.installment-list li>span:first-child { display: grid; gap: var(--fellow-space-1); }.installment-list b,.installment-list strong { font-size: 1rem; }.installment-list small { color: var(--fellow-text-secondary); font-size: .875rem; }.installment-actions { grid-column: 1/-1; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--fellow-space-2); }.installment-actions .quiet-button { background: var(--fellow-white); }.installment-actions em { align-self: center; font-size: .875rem; font-style: normal; font-weight: 700; }.archive-button { display: block; margin: var(--fellow-space-2) 0 0 auto; color: var(--fellow-text-secondary); }

.transaction-toolbar dl { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--fellow-space-3); margin: 0 0 var(--fellow-space-4); }.transaction-toolbar dl div { padding: var(--fellow-space-3); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); }.transaction-toolbar dt { font-size: .875rem; font-weight: 600; }.transaction-toolbar dd { margin: var(--fellow-space-1) 0 0; font-size: 1.125rem; font-weight: 700; }.income { color: var(--fellow-color-success); }.expense { color: var(--fellow-color-danger); }
.transaction-days { display: grid; gap: var(--fellow-space-section); }.transaction-day h2 { margin: 0 0 var(--fellow-space-2); font: 700 1.125rem/1.35 var(--fellow-font-display); }.transaction-row { display: grid; grid-template-columns: auto minmax(0,1fr) auto; align-items: center; gap: var(--fellow-space-3); width: 100%; min-height: calc(var(--fellow-touch-target-min) + var(--fellow-space-2)); padding: var(--fellow-space-2) 0; border: 0; border-top: 1px solid color-mix(in srgb,var(--fellow-ink) 24%,transparent); background: transparent; text-align: left; }.transaction-row:disabled { opacity: 1; }
.transaction-shape { width: var(--fellow-space-6); height: var(--fellow-space-6); border: 2px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-pink); }.transaction-shape.income { background: var(--fellow-mint); }.transaction-shape.transfer,.transaction-shape.asset_transfer,.transaction-shape.debt_payment { background: var(--fellow-blue); border-radius: var(--fellow-space-1); }.transaction-shape.debt_purchase { background: var(--fellow-orange); border-radius: var(--fellow-space-1); transform: rotate(6deg); }
.transaction-row>span:nth-child(2) { display: grid; gap: var(--fellow-space-1); min-width: 0; }.transaction-row strong { overflow-wrap: anywhere; font-size: 1rem; }.transaction-row small { overflow: hidden; color: var(--fellow-text-secondary); font-size: .875rem; text-overflow: ellipsis; white-space: nowrap; }.transaction-row b { font-size: 1rem; }

.state-panel { display: grid; min-height: 36vh; align-content: center; justify-items: start; gap: var(--fellow-space-3); padding: var(--fellow-space-6); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); background: var(--fellow-white); box-shadow: var(--fellow-shadow-soft); }.state-panel h1,.state-panel h2 { max-width: 24ch; margin: 0; font: 800 1.3125rem/1.2 var(--fellow-font-display); }.state-panel p { max-width: 32ch; margin: 0; color: var(--fellow-text-secondary); font-size: 1rem; line-height: 1.55; }.compact-state { min-height: 0; box-shadow: none; }.loading-mark { background: var(--fellow-yellow); animation: wobble 1s ease-in-out infinite alternate; }.error-mark { border-radius: var(--fellow-space-1); background: var(--fellow-pink); transform: rotate(8deg); }.debt-mark { background: var(--fellow-mint); }
.skeleton-lines { display: grid; gap: var(--fellow-space-2); width: 100%; }.skeleton-lines i { height: var(--fellow-space-4); border-radius: var(--fellow-radius-pill); background: color-mix(in srgb,var(--fellow-ink) 12%,transparent); }.skeleton-lines i:nth-child(2) { width: 72%; }.skeleton-lines i:nth-child(3) { width: 48%; }
.primary-button,.secondary-button,.danger-button { min-height: var(--fellow-touch-target-min); padding: var(--fellow-space-2) var(--fellow-space-4); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-yellow); box-shadow: var(--fellow-shadow-soft); font-size: 1rem; font-weight: 700; }.secondary-button { background: var(--fellow-white); box-shadow: none; }.danger-button { background: var(--fellow-pink); box-shadow: none; } button:disabled { cursor: not-allowed; opacity: .55; }

.budget-toast,.partner-sync { position: fixed; right: var(--fellow-space-page); bottom: calc(var(--fellow-bottom-nav-height) + var(--fellow-space-4) + env(safe-area-inset-bottom,0px)); left: var(--fellow-space-page); z-index: var(--fellow-z-toast); width: fit-content; max-width: calc(100% - (var(--fellow-space-page) * 2)); margin: auto; padding: var(--fellow-space-3) var(--fellow-space-4); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); color: var(--fellow-white); background: var(--fellow-ink); font-size: 1rem; line-height: 1.55; text-align: center; }.budget-toast.success { color: var(--fellow-ink); background: var(--fellow-mint); }.budget-toast.error { color: var(--fellow-ink); background: var(--fellow-pink); }.budget-toast.warning { color: var(--fellow-ink); background: var(--fellow-yellow); }.partner-sync { bottom: calc(var(--fellow-bottom-nav-height) + var(--fellow-space-10) + var(--fellow-space-6) + env(safe-area-inset-bottom,0px)); color: var(--fellow-ink); background: var(--fellow-blue); }

.sheet-backdrop { position: fixed; inset: 0; z-index: var(--fellow-z-modal); display: flex; align-items: flex-end; justify-content: center; padding: var(--fellow-space-4) var(--fellow-space-page) calc(var(--fellow-space-4) + env(safe-area-inset-bottom,0px)); background: color-mix(in srgb,var(--fellow-ink) 54%,transparent); }.sheet { width: min(100%,var(--fellow-content-max-width)); max-height: min(88dvh,calc(100vh - var(--fellow-space-8))); overflow-y: auto; border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); background: var(--fellow-paper); box-shadow: var(--fellow-shadow-overlay); }.sheet-header { position: sticky; top: 0; z-index: var(--fellow-z-raised); display: flex; align-items: center; justify-content: space-between; gap: var(--fellow-space-3); padding: var(--fellow-space-4); border-bottom: 3px solid var(--fellow-ink); background: var(--fellow-yellow); }.sheet-header h2 { margin: var(--fellow-space-1) 0 0; font: 800 1.3125rem/1.2 var(--fellow-font-display); }.sheet-header button { display: grid; width: var(--fellow-touch-target-min); height: var(--fellow-touch-target-min); place-items: center; padding: 0; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); }
.sheet-body { display: grid; gap: var(--fellow-space-4); padding: var(--fellow-space-4); }.field { display: grid; gap: var(--fellow-space-2); min-width: 0; }.field>span,.pocket-fields legend { font-size: .875rem; font-weight: 700; }.field input,.field select,:deep(.wallet-date-field) { width: 100%; min-width: 0; min-height: var(--fellow-touch-target-min); box-sizing: border-box; padding: var(--fellow-space-2) var(--fellow-space-3); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); color: var(--fellow-ink); background: var(--fellow-white); font-size: 1rem; }.field-pair { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--fellow-space-3); }
.choice-row { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: var(--fellow-space-2); }.choice-row.three { grid-template-columns: repeat(3,minmax(0,1fr)); }.choice-row button { min-height: var(--fellow-touch-target-min); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); font-size: 1rem; font-weight: 600; }.choice-row button.active { background: var(--fellow-mint); font-weight: 700; }
.pocket-fields { display: grid; gap: var(--fellow-space-2); margin: 0; padding: var(--fellow-space-4); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); }.pocket-fields legend { padding: 0 var(--fellow-space-2); }.pocket-fields label { display: grid; grid-template-columns: minmax(0,1fr) minmax(7rem,.55fr); align-items: center; gap: var(--fellow-space-3); }.pocket-fields label>span { display: flex; align-items: center; gap: var(--fellow-space-2); font-size: 1rem; }.pocket-fields input { min-width: 0; min-height: var(--fellow-touch-target-min); padding: var(--fellow-space-2); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); font-size: 1rem; }
.payment-callout { padding: var(--fellow-space-4); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-blue); }.payment-callout span { display: block; font-size: .875rem; font-weight: 700; }.payment-callout strong { display: block; margin-top: var(--fellow-space-1); overflow-wrap: anywhere; font: 700 1.125rem/normal var(--fellow-font-display); }.payment-callout p { margin: var(--fellow-space-2) 0 0; font-size: 1rem; line-height: 1.55; }.form-error { color: var(--fellow-color-danger); font-weight: 700; }.sheet-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--fellow-space-2); padding-top: var(--fellow-space-2); }
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible { outline: 3px solid var(--fellow-blue); outline-offset: var(--fellow-space-1); } button:active:not(:disabled) { transform: translate(1px,1px); }
.toast-enter-active,.toast-leave-active,.sync-enter-active,.sync-leave-active { transition: opacity var(--fellow-motion-standard) var(--fellow-ease-standard),transform var(--fellow-motion-standard) var(--fellow-ease-standard); }.toast-enter-from,.toast-leave-to,.sync-enter-from,.sync-leave-to { opacity: 0; transform: translateY(var(--fellow-space-3)); }
@keyframes wobble { from { transform: rotate(-8deg); } to { transform: rotate(8deg); } }
@media (max-width:340px) { .safe-amount { font-size: 2rem; }.safe-breakdown { grid-template-columns: 1fr; }.next-payment-row { grid-template-columns: auto minmax(0,1fr); }.due-action { grid-column: 1/-1; grid-template-columns: minmax(0,1fr) auto; align-items: center; justify-items: start; }.field-pair { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion:reduce) { .loading-mark { animation: none; }.progress-track span,.debt-progress span,.toast-enter-active,.toast-leave-active,.sync-enter-active,.sync-leave-active { transition: none; } }
</style>
