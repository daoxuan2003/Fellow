<template>
  <section class="express-page">
    <FeatureHeader title="快递代取" eyebrow="PICKUP LIST" chapter="06" kind="parcel" />

    <nav class="express-tabs" aria-label="快递状态">
      <button v-for="tab in statusTabs" :key="tab.key" type="button" :class="{ active: activeStatus === tab.key }" @click="activeStatus = tab.key">
        <span>{{ tab.label }}</span><strong>{{ loading ? '—' : tab.count }}</strong>
      </button>
    </nav>

    <div class="location-filter" aria-label="取件地点筛选">
      <div class="location-filter__rail">
        <button type="button" :class="{ active: activeLocation === 'all' }" @click="activeLocation = 'all'">全部地点</button>
        <button v-for="location in locationNames" :key="location" type="button" :class="{ active: activeLocation === location }" @click="activeLocation = location">{{ location }}</button>
      </div>
      <button type="button" class="location-filter__manage" aria-label="管理取件地点" @click="showLocationManager = true">＋ 地点</button>
    </div>

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
        <button type="button" @click="loadAll">重新加载</button>
      </section>

      <section v-else-if="visibleDeliveries.length === 0" class="express-state">
        <span class="state-box" aria-hidden="true"></span>
        <h2>{{ emptyTitle }}</h2><p>{{ emptyCopy }}</p>
        <button v-if="activeStatus === 'pending'" type="button" @click="openCreate">添加快递</button>
      </section>

      <section v-else class="express-list" :aria-label="activeListLabel">
        <article v-for="delivery in visibleDeliveries" :key="deliveryId(delivery)" class="express-card" :class="{ 'is-urgent': delivery.priority === 'urgent', 'is-archived': delivery.archivedAt }">
          <header class="express-card__header">
            <span class="location-badge">{{ delivery.pickupLocation }}</span>
            <span class="status-badge" :class="delivery.archivedAt ? 'archived' : delivery.status">{{ statusLabel(delivery) }}</span>
          </header>
          <div class="express-card__body">
            <span class="delivery-mark" aria-hidden="true"><i></i></span>
            <div>
              <small>取件码</small>
              <h2>{{ delivery.trackingNo }}</h2>
              <p v-if="delivery.description">{{ delivery.description }}</p>
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

    <button v-if="!loading && !error && !(activeStatus === 'pending' && visibleDeliveries.length === 0)" class="reference-fab" type="button" aria-label="添加快递" @click="openCreate">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>加快递</span>
    </button>

    <div v-if="showForm" class="modal-overlay" @click.self="closeForm">
      <section class="modal-dialog" role="dialog" aria-modal="true" :aria-labelledby="editingDelivery ? 'express-edit-title' : 'express-add-title'">
        <header class="modal-header">
          <div><span>{{ editingDelivery ? 'EDIT DELIVERY' : 'NEW DELIVERY' }}</span><h2 :id="editingDelivery ? 'express-edit-title' : 'express-add-title'">{{ editingDelivery ? '编辑快递' : '添加快递' }}</h2></div>
          <button type="button" aria-label="关闭" @click="closeForm"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </header>

        <div class="modal-body">
          <label v-if="!editingDelivery" class="smart-message">
            <span>粘贴取件消息（自动识别）</span>
            <textarea v-model="smartMessage" rows="3" maxlength="500" placeholder="粘贴短信或通知，自动识别取件码和已保存地点" @input="recognizeMessage"></textarea>
            <small v-if="recognitionText">{{ recognitionText }}</small>
          </label>

          <label><span>取件码</span><input v-model="form.trackingNo" maxlength="80" autocomplete="off" placeholder="例如 8-2-1234"></label>

          <fieldset class="location-picker">
            <legend>取件地点</legend>
            <button v-for="location in formLocationNames" :key="location" type="button" :class="{ active: form.pickupLocation === location }" @click="form.pickupLocation = location">{{ location }}</button>
            <button type="button" class="location-picker__add" @click="showInlineLocation = !showInlineLocation">＋ 新地点</button>
          </fieldset>

          <div v-if="showInlineLocation || formLocationNames.length === 0" class="inline-location">
            <input v-model="newLocationName" maxlength="40" autocomplete="off" placeholder="输入新取件地点">
            <button type="button" :disabled="locationSaving || !newLocationName.trim()" @click="addLocation({ selectAfterCreate: true })">{{ locationSaving ? '添加中' : '添加并选中' }}</button>
          </div>

          <label><span>物品说明（可选）</span><input v-model="form.description" maxlength="120" autocomplete="off" placeholder="方便彼此辨认"></label>
          <fieldset><legend>优先级</legend><button type="button" :class="{ active: form.priority === 'normal' }" @click="form.priority = 'normal'">普通</button><button type="button" :class="{ active: form.priority === 'urgent' }" @click="form.priority = 'urgent'">紧急</button></fieldset>
        </div>

        <footer class="modal-footer"><button type="button" class="button-secondary" @click="closeForm">取消</button><button type="button" class="button-primary" :disabled="saving || !formValid" @click="saveDelivery">{{ saving ? '保存中' : '保存' }}</button></footer>
      </section>
    </div>

    <div v-if="showLocationManager" class="modal-overlay" @click.self="closeLocationManager">
      <section class="modal-dialog modal-dialog--small" role="dialog" aria-modal="true" aria-labelledby="express-location-title">
        <header class="modal-header"><div><span>LOCATIONS</span><h2 id="express-location-title">取件地点</h2></div><button type="button" aria-label="关闭" @click="closeLocationManager"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></header>
        <div class="modal-body">
          <div class="location-create"><input v-model="newLocationName" maxlength="40" placeholder="添加一个常用地点"><button type="button" :disabled="locationSaving || !newLocationName.trim()" @click="addLocation()">添加</button></div>
          <p v-if="locations.length === 0" class="location-empty">还没有地点，先添加你们常去的驿站或快递柜。</p>
          <ul v-else class="location-list">
            <li v-for="location in locations" :key="location.id">
              <template v-if="editingLocationId === location.id">
                <input v-model="editingLocationName" maxlength="40" aria-label="新的地点名称" @keyup.enter="saveLocationRename(location)">
                <span class="location-list__actions"><button type="button" :disabled="locationSaving || !editingLocationName.trim()" @click="saveLocationRename(location)">保存</button><button type="button" @click="cancelLocationRename">取消</button></span>
              </template>
              <template v-else>
                <strong>{{ location.name }}</strong>
                <span v-if="canManageLocation(location)" class="location-list__actions"><button type="button" :disabled="locationSaving" @click="startLocationRename(location)">改名</button><button type="button" :class="{ confirming: confirmingLocationId === location.id }" :disabled="locationSaving" @click="requestLocationDelete(location)">{{ confirmingLocationId === location.id ? '再次确认' : '删除' }}</button></span>
              </template>
            </li>
          </ul>
        </div>
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
import { recognizePickupDetails } from '../utils/pickup-code.js'
import { useUserStore } from '../stores/user.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'

const userStore = useUserStore()
const { onMessage } = useWebSocket()
const deliveries = ref([])
const locations = ref([])
const loading = ref(true)
const error = ref('')
const activeStatus = ref('pending')
const activeLocation = ref('all')
const showForm = ref(false)
const showLocationManager = ref(false)
const showInlineLocation = ref(false)
const editingDelivery = ref(null)
const deletingDelivery = ref(null)
const saving = ref(false)
const locationSaving = ref(false)
const busyId = ref('')
const toast = ref('')
const smartMessage = ref('')
const recognitionText = ref('')
const newLocationName = ref('')
const confirmingLocationId = ref('')
const editingLocationId = ref('')
const editingLocationName = ref('')
const form = ref(createEmptyForm())
let unsubscribe = null
let toastTimer = null
let locationConfirmTimer = null

const currentUserId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const pending = computed(() => deliveries.value.filter(delivery => !delivery.archivedAt && delivery.status === 'pending'))
const picked = computed(() => deliveries.value.filter(delivery => !delivery.archivedAt && delivery.status === 'picked'))
const archived = computed(() => deliveries.value.filter(delivery => Boolean(delivery.archivedAt)))
const statusTabs = computed(() => [
  { key: 'pending', label: '待取', count: pending.value.length },
  { key: 'picked', label: '已取', count: picked.value.length },
  { key: 'archived', label: '归档', count: archived.value.length }
])
const locationNames = computed(() => Array.from(new Set([
  ...locations.value.map(location => location.name),
  ...deliveries.value.map(delivery => String(delivery.pickupLocation || '').trim())
].filter(Boolean))).sort((left, right) => left.localeCompare(right, 'zh-CN')))
const formLocationNames = computed(() => Array.from(new Set([...locationNames.value, form.value.pickupLocation].filter(Boolean))))
const deliveriesForStatus = computed(() => activeStatus.value === 'pending' ? pending.value : activeStatus.value === 'picked' ? picked.value : archived.value)
const visibleDeliveries = computed(() => deliveriesForStatus.value
  .filter(delivery => activeLocation.value === 'all' || delivery.pickupLocation === activeLocation.value)
  .slice()
  .sort((a, b) => new Date(b.archivedAt || b.pickedAt || b.createdAt) - new Date(a.archivedAt || a.pickedAt || a.createdAt)))
const activeListLabel = computed(() => `${activeStatus.value === 'pending' ? '待取' : activeStatus.value === 'picked' ? '已取' : '归档'}快递${activeLocation.value === 'all' ? '' : ` · ${activeLocation.value}`}`)
const emptyTitle = computed(() => activeLocation.value === 'all' ? `${statusTabs.value.find(tab => tab.key === activeStatus.value)?.label || ''}列表还是空的` : `${activeLocation.value}没有${statusTabs.value.find(tab => tab.key === activeStatus.value)?.label || ''}快递`)
const emptyCopy = computed(() => activeStatus.value === 'archived' ? '已取件的快递可以由添加者归档。' : '快递属于你们共同的取件清单，按地点查看会更快。')
const formValid = computed(() => Boolean(form.value.trackingNo.trim() && form.value.pickupLocation.trim()))

function createEmptyForm() { return { trackingNo: '', pickupLocation: '', description: '', priority: 'normal' } }
function token() { return localStorage.getItem('token') || '' }
function deliveryId(delivery) { return String(delivery?.id || delivery?._id || '') }
function isMine(delivery) { return String(delivery?.requesterId || '') === currentUserId.value }
function canUnpick(delivery) { return delivery.status === 'picked' && String(delivery.pickerId || '') === currentUserId.value }
function canManageLocation(location) { return String(location?.createdBy || '') === currentUserId.value }
function statusLabel(delivery) { return delivery.archivedAt ? '已归档' : delivery.status === 'picked' ? '已取' : delivery.priority === 'urgent' ? '紧急待取' : '待取' }
function formatTime(value) {
  if (!value) return '未记录'
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}
function notify(message) { toast.value = message; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.value = '' }, 2400) }

async function readJson(response) {
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.success) throw new Error(body.message || '请求失败')
  return body
}

async function fetchDeliveries() {
  const response = await fetch(`${CONFIG.API_URL}/express?archived=all`, { headers: { Authorization: `Bearer ${token()}` } })
  const body = await readJson(response)
  deliveries.value = Array.isArray(body.data?.list) ? body.data.list : [...(body.data?.pending || []), ...(body.data?.picked || []), ...(body.data?.archived || [])]
}

async function fetchLocations() {
  const response = await fetch(`${CONFIG.API_URL}/pickup-locations`, { headers: { Authorization: `Bearer ${token()}` } })
  const body = await readJson(response)
  locations.value = Array.isArray(body.data) ? body.data.map(location => ({ ...location, id: String(location.id || location._id || '') })) : []
}

async function loadAll({ silent = false } = {}) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    await Promise.all([fetchDeliveries(), fetchLocations()])
    if (activeLocation.value !== 'all' && !locationNames.value.includes(activeLocation.value)) activeLocation.value = 'all'
  } catch (requestError) {
    error.value = requestError.message || '快递加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.value = createEmptyForm()
  smartMessage.value = ''
  recognitionText.value = ''
  showInlineLocation.value = locations.value.length === 0
  newLocationName.value = ''
}
function openCreate() { editingDelivery.value = null; resetForm(); showForm.value = true }
function openEdit(delivery) {
  editingDelivery.value = delivery
  form.value = { trackingNo: delivery.trackingNo || '', pickupLocation: delivery.pickupLocation || '', description: delivery.description || '', priority: delivery.priority === 'urgent' ? 'urgent' : 'normal' }
  smartMessage.value = ''
  recognitionText.value = ''
  showInlineLocation.value = false
  showForm.value = true
}
function closeForm() { showForm.value = false; editingDelivery.value = null; resetForm() }
function closeLocationManager() { showLocationManager.value = false; confirmingLocationId.value = ''; editingLocationId.value = ''; editingLocationName.value = ''; newLocationName.value = '' }

function recognizeMessage() {
  const recognized = recognizePickupDetails(smartMessage.value, locations.value)
  if (recognized.code) form.value.trackingNo = recognized.code
  if (recognized.location) form.value.pickupLocation = recognized.location
  recognitionText.value = recognized.code || recognized.location
    ? `已识别${recognized.code ? `取件码 ${recognized.code}` : ''}${recognized.code && recognized.location ? ' · ' : ''}${recognized.location ? `地点 ${recognized.location}` : ''}`
    : smartMessage.value.trim() ? '还没识别到明确取件码，可继续手动填写。' : ''
}

async function addLocation({ selectAfterCreate = false } = {}) {
  const name = newLocationName.value.trim()
  if (!name || locationSaving.value) return
  locationSaving.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/pickup-locations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const body = await readJson(response)
    const created = { ...body.data, id: String(body.data?.id || body.data?._id || '') }
    locations.value = [created, ...locations.value.filter(location => location.id !== created.id)]
    if (selectAfterCreate) form.value.pickupLocation = body.data.name
    newLocationName.value = ''
    showInlineLocation.value = false
    notify('取件地点已添加')
  } catch (requestError) {
    notify(requestError.message || '地点添加失败')
  } finally {
    locationSaving.value = false
  }
}

function startLocationRename(location) {
  editingLocationId.value = location.id
  editingLocationName.value = location.name
  confirmingLocationId.value = ''
}

function cancelLocationRename() {
  editingLocationId.value = ''
  editingLocationName.value = ''
}

async function saveLocationRename(location) {
  const name = editingLocationName.value.trim()
  if (!name || name === location.name || locationSaving.value) {
    if (name === location.name) cancelLocationRename()
    return
  }
  locationSaving.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/pickup-locations/${location.id}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    const body = await readJson(response)
    const previousName = location.name
    locations.value = locations.value.map(item => item.id === location.id ? { ...item, ...body.data, id: location.id } : item)
    deliveries.value = deliveries.value.map(delivery => delivery.pickupLocation === previousName ? { ...delivery, pickupLocation: name } : delivery)
    if (activeLocation.value === previousName) activeLocation.value = name
    if (form.value.pickupLocation === previousName) form.value.pickupLocation = name
    cancelLocationRename()
    notify('取件地点已改名')
  } catch (requestError) {
    notify(requestError.message || '地点改名失败')
  } finally {
    locationSaving.value = false
  }
}

async function requestLocationDelete(location) {
  if (confirmingLocationId.value !== location.id) {
    confirmingLocationId.value = location.id
    clearTimeout(locationConfirmTimer)
    locationConfirmTimer = setTimeout(() => { confirmingLocationId.value = '' }, 3000)
    return
  }
  locationSaving.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/pickup-locations/${location.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    await readJson(response)
    locations.value = locations.value.filter(item => item.id !== location.id)
    if (activeLocation.value === location.name) activeLocation.value = 'all'
    if (form.value.pickupLocation === location.name) form.value.pickupLocation = ''
    confirmingLocationId.value = ''
    notify('取件地点已删除')
  } catch (requestError) {
    notify(requestError.message || '地点删除失败')
  } finally {
    locationSaving.value = false
  }
}

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
    await readJson(response)
    closeForm()
    await fetchDeliveries()
    activeStatus.value = 'pending'
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
    await readJson(response)
    await fetchDeliveries()
    notify(action === 'archive' ? '快递已归档' : action === 'unpick' ? '已撤销取件' : '已标记取件')
  } catch (requestError) {
    notify(requestError.message || '操作失败')
  } finally {
    busyId.value = ''
  }
}
function pickDelivery(delivery) { return mutate(delivery, 'pick') }
function unpickDelivery(delivery) { return mutate(delivery, 'unpick') }
async function archiveDelivery(delivery) { await mutate(delivery, 'archive'); activeStatus.value = 'archived' }

async function deleteDelivery() {
  if (!deletingDelivery.value || saving.value) return
  saving.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/express/${deliveryId(deletingDelivery.value)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    await readJson(response)
    deletingDelivery.value = null
    await fetchDeliveries()
    notify('快递已删除')
  } catch (requestError) {
    notify(requestError.message || '删除失败')
  } finally {
    saving.value = false
  }
}

function handleVisibility() { if (document.visibilityState === 'visible') loadAll({ silent: true }) }
onMounted(() => {
  loadAll()
  unsubscribe = onMessage(message => { if (message.type === 'expressSync' || message.type === 'pickupLocationSync') loadAll({ silent: true }) })
  document.addEventListener('visibilitychange', handleVisibility)
})
onUnmounted(() => { unsubscribe?.(); document.removeEventListener('visibilitychange', handleVisibility); clearTimeout(toastTimer); clearTimeout(locationConfirmTimer) })
</script>

<style scoped>
.express-page { min-height: 100dvh; color: #20202a; background: #fffaf5; }.main { display: grid; gap: 16px; }.express-tabs { display: grid; grid-template-columns: repeat(3,1fr); gap: 7px; margin: 14px 16px 0; padding: 5px; background: #fff; border: 3px solid #20202a; border-radius: 12px; box-shadow: 3px 4px 0 #20202a; }.express-tabs button { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: 44px; padding: 6px; color: #20202a; background: transparent; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 900; }.express-tabs button.active { background: #ffd94a; box-shadow: inset 0 0 0 2px #20202a; }.express-tabs strong { display: grid; min-width: 20px; height: 20px; place-items: center; background: #fff; border: 2px solid #20202a; border-radius: 50%; font-size: 10px; }
.location-filter { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; margin: 10px 16px 0; }.location-filter__rail { display: flex; gap: 7px; min-width: 0; overflow-x: auto; padding: 2px 2px 5px; scrollbar-width: none; }.location-filter__rail::-webkit-scrollbar { display: none; }.location-filter button { flex: none; min-height: 42px; padding: 7px 11px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 9px; font: inherit; font-size: 11px; font-weight: 900; white-space: nowrap; }.location-filter button.active { background: #75dfc1; box-shadow: 2px 2px 0 #20202a; }.location-filter__manage { background: #69cfee !important; }
.express-list { display: grid; gap: 13px; }.express-card { display: grid; gap: 12px; padding: 16px; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }.express-card.is-urgent { background: #fff0f5; }.express-card.is-archived { background: #f4f1eb; }.express-card__header,.express-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.location-badge,.status-badge { padding: 4px 8px; border: 2px solid #20202a; border-radius: 999px; font-size: 10px; font-weight: 950; }.location-badge { max-width: 68%; overflow: hidden; background: #75dfc1; text-overflow: ellipsis; white-space: nowrap; }.status-badge.pending { background: #ffd94a; }.status-badge.picked { background: #ff7fa5; }.status-badge.archived { background: #fff; }.express-card__body { display: grid; grid-template-columns: 58px 1fr; align-items: center; gap: 12px; }.delivery-mark { position: relative; width: 50px; height: 44px; box-sizing: border-box; background: #ffd94a; border: 3px solid #20202a; }.delivery-mark::after { position: absolute; inset: -3px auto -3px 19px; width: 8px; content: ''; background: #ff8b4a; border: solid #20202a; border-width: 0 2px; }.delivery-mark i { position: absolute; top: 16px; left: -3px; width: 50px; height: 3px; background: #20202a; }.express-card__body small { display: block; color: #686772; font-size: 10px; font-weight: 900; }.express-card h2 { margin: 1px 0 0; font-size: 23px; font-weight: 950; letter-spacing: -.04em; overflow-wrap: anywhere; }.express-card__body p { margin: 4px 0 0; color: #62616b; font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }.express-card__meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding-top: 10px; border-top: 2px solid #20202a; }.express-card__meta div { display: flex; gap: 5px; }.express-card__meta dt { color: #686772; font-size: 10px; font-weight: 800; }.express-card__meta dd { margin: 0; font-size: 10px; font-weight: 900; }.express-card__actions { justify-content: flex-start; flex-wrap: wrap; }.express-card__actions button { min-height: 44px; padding: 7px 11px; color: #20202a; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 950; }.action-primary { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; }.action-secondary { background: #fff; }.action-quiet { margin-left: auto; background: #fff; }
.is-loading { min-height: 116px; background: #fff; animation: none; }.loading-card__badges { display: flex; justify-content: space-between; }.loading-card__badges span { width: 56px; height: 20px; border: 2px solid #20202a; border-radius: 999px; background: #ece8e2; }.loading-card__parcel { display: grid; grid-template-columns: 48px 1fr; align-items: center; gap: 12px; }.loading-card__parcel i { width: 44px; height: 38px; border: 3px solid #20202a; background: #ffd94a; }.loading-card__parcel span,.loading-card__line { height: 12px; border-radius: 4px; background: #ece8e2; }.loading-card__line { width: 72%; }
.express-state { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 9px; padding: 24px; text-align: center; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }.state-box { width: 56px; height: 50px; background: #75dfc1; border: 3px solid #20202a; }.state-box.is-error { background: #ff7fa5; }.express-state h2 { margin: 3px 0 0; font-size: 20px; font-weight: 950; }.express-state p { max-width: 280px; margin: 0; color: #62616b; font-size: 12px; line-height: 1.55; }.express-state button { min-height: 44px; padding: 8px 14px; color: #20202a; background: #ffd94a; border: 3px solid #20202a; border-radius: 9px; box-shadow: 3px 3px 0 #20202a; font: inherit; font-weight: 900; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; padding: max(16px,env(safe-area-inset-top,0px)) 16px max(16px,env(safe-area-inset-bottom,0px)); background: rgba(32,32,42,.58); backdrop-filter: blur(5px); }.modal-dialog { width: min(100%,410px); max-height: calc(100dvh - 32px - env(safe-area-inset-top,0px) - env(safe-area-inset-bottom,0px)); overflow-y: auto; padding: 17px; box-sizing: border-box; background: #fffaf5; border: 3px solid #20202a; border-radius: 16px; box-shadow: 7px 8px 0 #20202a; }.modal-dialog--small { max-width: 370px; }.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 13px; border-bottom: 3px solid #20202a; }.modal-header span { font-size: 9px; font-weight: 950; letter-spacing: .14em; }.modal-header h2 { margin: 2px 0 0; font-size: 23px; font-weight: 950; }.modal-header button { display: grid; width: 44px; height: 44px; place-items: center; padding: 0; color: #20202a; background: #fff; border: 3px solid #20202a; border-radius: 9px; }.modal-header svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; }.modal-body { display: grid; gap: 14px; padding: 16px 0; }.modal-body label { display: grid; gap: 6px; }.modal-body label span,.modal-body legend { font-size: 12px; font-weight: 950; }.modal-body input,.modal-body textarea { width: 100%; padding: 9px 10px; box-sizing: border-box; }.smart-message textarea { resize: vertical; min-height: 80px; font-size: 16px; }.smart-message small { color: #4a6261; font-size: 11px; font-weight: 800; }.modal-body fieldset { display: flex; flex-wrap: wrap; gap: 7px; margin: 0; padding: 0; border: 0; }.modal-body legend { width: 100%; margin-bottom: 1px; }.modal-body fieldset button { min-height: 44px; padding: 6px 12px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 900; }.modal-body fieldset button.active { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; }.location-picker__add { background: #c8f6e8 !important; }.inline-location,.location-create { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 8px; }.inline-location button,.location-create button { min-height: 44px; padding: 0 11px; color: #20202a; background: #69cfee; border: 2px solid #20202a; border-radius: 9px; font: inherit; font-size: 11px; font-weight: 950; }.location-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }.location-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; padding: 7px 9px; background: #fff; border: 2px solid #20202a; border-radius: 9px; }.location-list strong { min-width: 0; overflow-wrap: anywhere; font-size: 13px; }.location-list button { flex: none; min-height: 36px; padding: 0 9px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 7px; font: inherit; font-size: 10px; font-weight: 900; }.location-list button.confirming { background: #ff7fa5; }.location-empty { margin: 0; color: #686772; font-size: 12px; line-height: 1.5; }.delete-copy { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.5; overflow-wrap: anywhere; }.modal-footer { display: grid; grid-template-columns: 1fr 1.4fr; gap: 9px; padding: 13px 0 0; border-top: 3px solid #20202a; }.modal-footer button { min-height: 44px; color: #20202a; border: 3px solid #20202a; border-radius: 9px; font: inherit; font-weight: 950; }.button-secondary { background: #fff; }.button-primary { background: #ffd94a; box-shadow: 3px 3px 0 #20202a; }.button-danger { background: #ff7fa5; box-shadow: 3px 3px 0 #20202a; }.toast { position: fixed; right: 18px; bottom: calc(86px + env(safe-area-inset-bottom,0px)); left: 18px; z-index: 1200; width: fit-content; max-width: calc(100% - 36px); margin: auto; padding: 10px 14px; color: #fff; background: #20202a; border-radius: 9px; font-size: 12px; font-weight: 850; }
.location-list li { display: grid; grid-template-columns: minmax(0,1fr) auto; gap: 10px; }
.location-list__actions { display: flex; gap: 5px; }
.location-list__actions button { padding-right: 8px; padding-left: 8px; }
@media (max-width:340px) { .express-tabs button { font-size: 10px; }.location-filter { margin-right:12px;margin-left:12px; }.modal-overlay { padding-right:12px;padding-left:12px; } }@media (prefers-reduced-motion:reduce) { .modal-dialog { scroll-behavior:auto; } }
</style>
