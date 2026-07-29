<template>
  <section class="express-page">
    <FeatureHeader title="快递代取" eyebrow="PICKUP LIST" chapter="06" kind="parcel" />

    <nav class="express-tabs" aria-label="快递归属">
      <button v-for="tab in tabs" :key="tab.key" type="button" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">
        <span>{{ tab.label }}</span><strong>{{ loading ? '—' : tab.count }}</strong>
      </button>
    </nav>

    <main class="main">
      <section v-if="loading" class="express-list" aria-label="正在加载快递">
        <article v-for="index in 2" :key="index" class="express-card is-loading" aria-hidden="true">
          <div class="loading-card__badges"><span></span><span></span></div>
          <div class="loading-card__parcel"><i></i><span></span></div>
          <div class="loading-card__line"></div>
        </article>
      </section>

      <section v-else-if="error" class="express-state" role="alert">
        <span class="state-box is-error" aria-hidden="true"></span>
        <h2>快递暂时没有同步好</h2><p>{{ error }}</p>
        <button type="button" @click="loadDeliveries">重新加载</button>
      </section>

      <section v-else-if="visibleDeliveries.length === 0" class="express-state">
        <span class="state-box" aria-hidden="true"></span>
        <h2>{{ emptyTitle }}</h2><p>{{ emptyCopy }}</p>
        <button v-if="activeTab !== 'archived'" type="button" @click="openCreate">添加快递</button>
      </section>

      <section v-else class="express-list" :aria-label="activeTabLabel">
        <article v-for="delivery in visibleDeliveries" :key="deliveryId(delivery)" class="express-card" :class="{ 'is-urgent': delivery.priority === 'urgent', 'is-archived': delivery.archivedAt }">
          <header class="express-card__header">
            <span class="owner-badge" :class="isMine(delivery) ? 'is-mine' : 'is-partner'">{{ isMine(delivery) ? '我的' : `${partnerPronoun}的` }}</span>
            <span class="status-badge" :class="delivery.archivedAt ? 'archived' : delivery.status">{{ statusLabel(delivery) }}</span>
          </header>
          <div class="express-card__body">
            <span class="delivery-mark" aria-hidden="true"><i></i></span>
            <div>
              <h2>{{ delivery.trackingNo }}</h2>
              <p>{{ delivery.pickupLocation }}</p>
              <small v-if="delivery.description">{{ delivery.description }}</small>
            </div>
          </div>
          <dl class="express-card__meta">
            <div><dt>创建</dt><dd>{{ formatTime(delivery.createdAt) }}</dd></div>
            <div v-if="delivery.pickedAt"><dt>取件</dt><dd>{{ formatTime(delivery.pickedAt) }}</dd></div>
            <div v-if="delivery.archivedAt"><dt>归档</dt><dd>{{ formatTime(delivery.archivedAt) }}</dd></div>
          </dl>
          <footer v-if="!delivery.archivedAt" class="express-card__actions">
            <button v-if="delivery.status === 'pending'" type="button" class="action-primary" :disabled="busyId === deliveryId(delivery)" @click="pickDelivery(delivery)">标记已取</button>
            <button v-else-if="canUnpick(delivery)" type="button" class="action-secondary" :disabled="busyId === deliveryId(delivery)" @click="unpickDelivery(delivery)">撤销取件</button>
            <button v-if="delivery.status === 'picked' && isMine(delivery)" type="button" class="action-primary" :disabled="busyId === deliveryId(delivery)" @click="archiveDelivery(delivery)">归档</button>
            <button v-if="delivery.status === 'pending' && isMine(delivery)" type="button" class="action-secondary" @click="openEdit(delivery)">编辑</button>
            <button v-if="delivery.status === 'pending' && isMine(delivery)" type="button" class="action-quiet" @click="deletingDelivery = delivery">删除</button>
          </footer>
        </article>
      </section>
    </main>

    <button class="reference-fab" type="button" aria-label="添加快递" @click="openCreate">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>加快递</span>
    </button>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <section class="modal-dialog" role="dialog" aria-modal="true" :aria-labelledby="editingDelivery ? 'express-edit-title' : 'express-add-title'">
        <header class="modal-header">
          <div><span>{{ editingDelivery ? 'EDIT DELIVERY' : 'NEW DELIVERY' }}</span><h2 :id="editingDelivery ? 'express-edit-title' : 'express-add-title'">{{ editingDelivery ? '编辑快递' : '添加快递' }}</h2></div>
          <button type="button" aria-label="关闭" @click="closeForm"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </header>
        <div class="modal-body">
          <label><span>取件码</span><input v-model="form.trackingNo" maxlength="80" autocomplete="off" placeholder="输入取件码"></label>
          <label><span>取件地点</span><input v-model="form.pickupLocation" maxlength="80" autocomplete="off" placeholder="例如校门口驿站"></label>
          <label><span>物品说明（可选）</span><input v-model="form.description" maxlength="120" autocomplete="off" placeholder="方便彼此辨认"></label>
          <fieldset><legend>优先级</legend><button type="button" :class="{ active: form.priority === 'normal' }" @click="form.priority = 'normal'">普通</button><button type="button" :class="{ active: form.priority === 'urgent' }" @click="form.priority = 'urgent'">紧急</button></fieldset>
        </div>
        <footer class="modal-footer"><button type="button" class="button-secondary" @click="closeForm">取消</button><button type="button" class="button-primary" :disabled="saving || !formValid" @click="saveDelivery">{{ saving ? '保存中' : '保存' }}</button></footer>
      </section>
    </div>

    <div v-if="deletingDelivery" class="modal-overlay" @click.self="deletingDelivery = null">
      <section class="modal-dialog modal-dialog--small" role="dialog" aria-modal="true" aria-labelledby="express-delete-title">
        <header class="modal-header"><div><span>DELETE</span><h2 id="express-delete-title">删除快递</h2></div></header>
        <div class="modal-body"><p class="delete-copy">删除后无法恢复取件码“{{ deletingDelivery.trackingNo }}”。</p></div>
        <footer class="modal-footer"><button type="button" class="button-secondary" @click="deletingDelivery = null">取消</button><button type="button" class="button-danger" :disabled="saving" @click="deleteDelivery">确认删除</button></footer>
      </section>
    </div>

    <div v-if="toast" class="toast" role="status" aria-live="polite" aria-atomic="true">{{ toast }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { getPartnerPronoun } from '../utils/partner-pronoun.js'
import { useUserStore } from '../stores/user.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'

const userStore = useUserStore()
const { onMessage } = useWebSocket()
const deliveries = ref([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('mine')
const showForm = ref(false)
const editingDelivery = ref(null)
const deletingDelivery = ref(null)
const saving = ref(false)
const busyId = ref('')
const toast = ref('')
const form = ref({ trackingNo: '', pickupLocation: '', description: '', priority: 'normal' })
let unsubscribe = null
let toastTimer = null

const currentUserId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const partner = computed(() => userStore.currentPartner || userStore.partner || userStore.currentUser?.partner || userStore.user?.partner || null)
const partnerPronoun = computed(() => getPartnerPronoun(partner.value?.gender))
const activeDeliveries = computed(() => deliveries.value.filter(delivery => !delivery.archivedAt))
const mine = computed(() => activeDeliveries.value.filter(isMine))
const partners = computed(() => activeDeliveries.value.filter(delivery => !isMine(delivery)))
const archived = computed(() => deliveries.value.filter(delivery => Boolean(delivery.archivedAt)))
const tabs = computed(() => [
  { key: 'mine', label: '我的', count: mine.value.length },
  { key: 'partner', label: partnerPronoun.value, count: partners.value.length },
  { key: 'archived', label: '归档', count: archived.value.length }
])
const visibleDeliveries = computed(() => (activeTab.value === 'mine' ? mine.value : activeTab.value === 'partner' ? partners.value : archived.value)
  .slice().sort((a, b) => new Date(b.archivedAt || b.pickedAt || b.createdAt) - new Date(a.archivedAt || a.pickedAt || a.createdAt)))
const activeTabLabel = computed(() => tabs.value.find(tab => tab.key === activeTab.value)?.label || '快递')
const emptyTitle = computed(() => activeTab.value === 'mine' ? '我还没有快递' : activeTab.value === 'partner' ? `${partnerPronoun.value}还没有快递` : '归档还是空的')
const emptyCopy = computed(() => activeTab.value === 'archived' ? '已取件的快递可以由创建者归档。' : '添加后双方都能看见并更新取件状态。')
const formValid = computed(() => Boolean(form.value.trackingNo.trim() && form.value.pickupLocation.trim()))

function token() { return localStorage.getItem('token') || '' }
function deliveryId(delivery) { return String(delivery?.id || delivery?._id || '') }
function isMine(delivery) { return String(delivery?.requesterId || '') === currentUserId.value }
function canUnpick(delivery) { return delivery.status === 'picked' && String(delivery.pickerId || '') === currentUserId.value }
function statusLabel(delivery) { return delivery.archivedAt ? '已归档' : delivery.status === 'picked' ? '已取' : '待取' }
function formatTime(value) {
  if (!value) return '未记录'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}
function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 2400) }

async function loadDeliveries() {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${CONFIG.API_URL}/express?archived=all`, { headers: { Authorization: `Bearer ${token()}` } })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '快递加载失败')
    deliveries.value = Array.isArray(body.data?.list) ? body.data.list : [...(body.data?.pending || []), ...(body.data?.picked || []), ...(body.data?.archived || [])]
  } catch (requestError) {
    error.value = requestError.message || '快递加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function resetForm() { form.value = { trackingNo: '', pickupLocation: '', description: '', priority: 'normal' } }
function openCreate() { editingDelivery.value = null; resetForm(); showForm.value = true }
function openEdit(delivery) {
  editingDelivery.value = delivery
  form.value = { trackingNo: delivery.trackingNo || '', pickupLocation: delivery.pickupLocation || '', description: delivery.description || '', priority: delivery.priority === 'urgent' ? 'urgent' : 'normal' }
  showForm.value = true
}
function closeForm() { showForm.value = false; editingDelivery.value = null; resetForm() }

async function saveDelivery() {
  if (!formValid.value || saving.value) return
  saving.value = true
  try {
    const id = deliveryId(editingDelivery.value)
    const response = await fetch(`${CONFIG.API_URL}/express${id ? `/${id}` : ''}`, {
      method: id ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value)
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '保存失败')
    closeForm()
    await loadDeliveries()
    notify(id ? '快递已更新' : '快递已添加')
  } catch (requestError) {
    notify(requestError.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function mutate(delivery, action, method = 'PUT') {
  const id = deliveryId(delivery)
  if (!id || busyId.value) return
  busyId.value = id
  try {
    const response = await fetch(`${CONFIG.API_URL}/express/${id}/${action}`, { method, headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '操作失败')
    await loadDeliveries()
    notify(action === 'archive' ? '快递已归档' : action === 'unpick' ? '已撤销取件' : '已标记取件')
  } catch (requestError) {
    notify(requestError.message || '操作失败')
  } finally {
    busyId.value = ''
  }
}
function pickDelivery(delivery) { return mutate(delivery, 'pick') }
function unpickDelivery(delivery) { return mutate(delivery, 'unpick') }
async function archiveDelivery(delivery) { await mutate(delivery, 'archive'); activeTab.value = 'archived' }

async function deleteDelivery() {
  if (!deletingDelivery.value || saving.value) return
  saving.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/express/${deliveryId(deletingDelivery.value)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '删除失败')
    deletingDelivery.value = null
    await loadDeliveries()
    notify('快递已删除')
  } catch (requestError) {
    notify(requestError.message || '删除失败')
  } finally {
    saving.value = false
  }
}

function handleVisibility() { if (document.visibilityState === 'visible') loadDeliveries() }
onMounted(() => {
  loadDeliveries()
  unsubscribe = onMessage(message => { if (message.type === 'expressSync') loadDeliveries() })
  document.addEventListener('visibilitychange', handleVisibility)
})
onUnmounted(() => { unsubscribe?.(); document.removeEventListener('visibilitychange', handleVisibility); clearTimeout(toastTimer) })
</script>

<style scoped>
.express-page { min-height: 100dvh; color: #20202a; background: #fffaf5; }.main { display: grid; gap: 16px; }.express-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; margin: 14px 16px 0; padding: 5px; background: #fff; border: 3px solid #20202a; border-radius: 12px; box-shadow: 3px 4px 0 #20202a; }.express-tabs button { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: 44px; padding: 6px; color: #20202a; background: transparent; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 900; }.express-tabs button.active { background: #ffd94a; box-shadow: inset 0 0 0 2px #20202a; }.express-tabs strong { display: grid; min-width: 20px; height: 20px; place-items: center; background: #fff; border: 2px solid #20202a; border-radius: 50%; font-size: 10px; }
.stats-panel { display: grid; grid-template-columns: 1fr 82px; gap: 12px; padding: 22px 18px; background: #ffd94a !important; }.express-kicker { font-size: 9px; font-weight: 950; letter-spacing: .13em; }.stats-panel h1 { max-width: 250px; margin: 6px 0 8px; font-size: clamp(25px,7.5vw,34px); font-weight: 950; line-height: 1.04; letter-spacing: -.065em; }.stats-panel p { margin: 0; font-size: 12px; font-weight: 700; line-height: 1.55; }.parcel-shape { position: relative; align-self: center; width: 74px; height: 66px; background: #ff8b4a; border: 3px solid #20202a; transform: rotate(3deg); }.parcel-shape::after { position: absolute; top: -3px; bottom: -3px; left: 29px; width: 12px; content: ''; background: #fff; border: solid #20202a; border-width: 0 3px; }.parcel-shape i,.parcel-shape b { position: absolute; z-index: 1; background: #20202a; }.parcel-shape i { top: 23px; left: 0; width: 100%; height: 3px; }.parcel-shape b { top: 7px; left: 12px; width: 16px; height: 3px; }
.express-list { display: grid; gap: 13px; }.express-card { display: grid; gap: 12px; padding: 16px; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }.express-card.is-urgent { background: #fff0f5; }.express-card.is-archived { background: #f4f1eb; }.express-card__header,.express-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.owner-badge,.status-badge { padding: 4px 8px; border: 2px solid #20202a; border-radius: 999px; font-size: 10px; font-weight: 950; }.owner-badge.is-mine { background: #58c8f5; }.owner-badge.is-partner { background: #75dfc1; }.status-badge.pending { background: #ffd94a; }.status-badge.picked { background: #ff7fa5; }.status-badge.archived { background: #fff; }.express-card__body { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 12px; }.delivery-mark { position: relative; width: 50px; height: 44px; box-sizing: border-box; background: #ffd94a; border: 3px solid #20202a; }.delivery-mark::after { position: absolute; inset: -3px auto -3px 19px; width: 8px; content: ''; background: #ff8b4a; border: solid #20202a; border-width: 0 2px; }.delivery-mark i { position: absolute; top: 16px; left: -3px; width: 50px; height: 3px; background: #20202a; }.express-card h2 { margin: 0; font-size: 23px; font-weight: 950; letter-spacing: -.04em; overflow-wrap: anywhere; }.express-card__body p { margin: 3px 0 0; font-size: 13px; font-weight: 850; }.express-card__body small { display: block; margin-top: 4px; color: #62616b; font-size: 11px; overflow-wrap: anywhere; }.express-card__meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding-top: 10px; border-top: 2px solid #20202a; }.express-card__meta div { display: flex; gap: 5px; }.express-card__meta dt { color: #686772; font-size: 10px; font-weight: 800; }.express-card__meta dd { margin: 0; font-size: 10px; font-weight: 900; }.express-card__actions { justify-content: flex-start; flex-wrap: wrap; }.express-card__actions button { min-height: 44px; padding: 7px 11px; color: #20202a; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 950; }.action-primary { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; }.action-secondary { background: #fff; }.action-quiet { margin-left: auto; background: #fff; }.is-loading { min-height: 116px; border-color: #20202a; box-shadow: 3px 4px 0 #20202a; background: #fff; animation: none; }.loading-card__badges { display: flex; justify-content: space-between; }.loading-card__badges span { width: 56px; height: 20px; border: 2px solid #20202a; border-radius: 999px; background: #ece8e2; }.loading-card__parcel { display: grid; grid-template-columns: 48px 1fr; align-items: center; gap: 12px; }.loading-card__parcel i { width: 44px; height: 38px; border: 3px solid #20202a; background: #ffd94a; }.loading-card__parcel span,.loading-card__line { height: 12px; border-radius: 4px; background: linear-gradient(100deg,#ece8e2 25%,#fff 45%,#ece8e2 65%); background-size: 220% 100%; animation: loading 1.3s linear infinite; }.loading-card__line { width: 72%; }
.express-state { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 9px; padding: 24px; text-align: center; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }.state-box { width: 56px; height: 50px; background: #75dfc1; border: 3px solid #20202a; }.state-box.is-error { background: #ff7fa5; }.express-state h2 { margin: 3px 0 0; font-size: 20px; font-weight: 950; }.express-state p { max-width: 280px; margin: 0; color: #62616b; font-size: 12px; line-height: 1.55; }.express-state button { min-height: 44px; padding: 8px 14px; color: #20202a; background: #ffd94a; border: 3px solid #20202a; border-radius: 9px; box-shadow: 3px 3px 0 #20202a; font: inherit; font-weight: 900; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; align-items: end; padding: 16px 16px max(16px, env(safe-area-inset-bottom, 0px)); background: rgba(32,32,42,.58); }.modal-dialog { width: min(100%,430px); max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); margin: 0 auto; overflow-y: auto; padding: 17px; box-sizing: border-box; background: #fffaf5; border: 3px solid #20202a; border-radius: 16px; box-shadow: 7px 8px 0 #20202a; }.modal-dialog--small { align-self: center; }.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 13px; border-bottom: 3px solid #20202a; }.modal-header span { font-size: 9px; font-weight: 950; letter-spacing: .14em; }.modal-header h2 { margin: 2px 0 0; font-size: 23px; font-weight: 950; }.modal-header button { display: grid; width: 44px; height: 44px; place-items: center; padding: 0; color: #20202a; background: #fff; border: 3px solid #20202a; border-radius: 9px; }.modal-header svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; }.modal-body { display: grid; gap: 14px; padding: 16px 0; }.modal-body label { display: grid; gap: 6px; }.modal-body label span,.modal-body legend { font-size: 12px; font-weight: 950; }.modal-body input { width: 100%; padding: 0 10px; box-sizing: border-box; }.modal-body fieldset { display: flex; gap: 7px; margin: 0; padding: 0; border: 0; }.modal-body legend { width: 100%; margin-bottom: 6px; }.modal-body fieldset button { min-height: 44px; padding: 6px 12px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-weight: 900; }.modal-body fieldset button.active { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; }.delete-copy { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.5; overflow-wrap: anywhere; }.modal-footer { display: grid; grid-template-columns: 1fr 1.4fr; gap: 9px; padding: 13px 0 env(safe-area-inset-bottom, 0px); border-top: 3px solid #20202a; }.modal-footer button { min-height: 44px; color: #20202a; border: 3px solid #20202a; border-radius: 9px; font: inherit; font-weight: 950; }.button-secondary { background: #fff; }.button-primary { background: #ffd94a; box-shadow: 3px 3px 0 #20202a; }.button-danger { background: #ff7fa5; box-shadow: 3px 3px 0 #20202a; }.toast { position: fixed; right: 18px; bottom: calc(82px + env(safe-area-inset-bottom,0px)); left: 18px; z-index: 1200; width: fit-content; max-width: calc(100% - 36px); margin: auto; padding: 10px 14px; color: #fff; background: #20202a; border-radius: 9px; font-size: 12px; font-weight: 850; }
@keyframes loading { to { background-position: -220% 0; } }@media (max-width:340px) { .stats-panel { grid-template-columns: 1fr 58px; }.parcel-shape { width: 54px; height: 50px; }.parcel-shape::after { left: 20px; }.express-tabs button { font-size: 10px; } }@media (prefers-reduced-motion:reduce) { .is-loading { animation: none; } }
</style>
