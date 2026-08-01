<template>
  <section class="express-page">
    <FeatureHeader title="快递代取" eyebrow="PICKUP LIST" chapter="06" kind="parcel">
      <template #action>
        <button type="button" class="archive-gift-button" :aria-label="`打开取件礼盒，共 ${archived.length} 件`" @click="showArchive = true">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 10h16v10H4zM3 7h18v4H3zM12 7v13M7.5 7C5.7 7 5 5.9 5 4.8S5.9 3 7 3c2.2 0 5 4 5 4M16.5 7c1.8 0 2.5-1.1 2.5-2.2S18.1 3 17 3c-2.2 0-5 4-5 4" />
          </svg>
          <span v-if="archived.length" aria-hidden="true">{{ archived.length > 99 ? '99+' : archived.length }}</span>
        </button>
      </template>
    </FeatureHeader>

    <nav class="express-tabs" aria-label="快递状态">
      <button v-for="tab in statusTabs" :key="tab.key" type="button" :class="{ active: activeStatus === tab.key }" :aria-pressed="activeStatus === tab.key" @click="selectStatus(tab.key)">
        <span>{{ tab.label }}</span><strong>{{ loading ? '—' : tab.count }}</strong>
      </button>
    </nav>

    <div class="location-filter" aria-label="取件地点筛选">
      <div class="location-filter__rail">
        <button type="button" :class="{ active: activeLocation === 'all' }" :aria-pressed="activeLocation === 'all'" @click="activeLocation = 'all'">全部地点</button>
        <button v-for="location in activeLocationNames" :key="location" type="button" :class="{ active: activeLocation === location }" :aria-pressed="activeLocation === location" @click="activeLocation = location">{{ location }}</button>
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
        <article v-for="delivery in visibleDeliveries" :key="deliveryId(delivery)" class="express-card" :class="[{ 'is-urgent': delivery.priority === 'urgent', 'is-normal': delivery.priority !== 'urgent' }, ownerClass(delivery)]">
          <header class="express-card__header">
            <span class="owner-badge">
              <img v-if="ownerAvatar(delivery)" :src="ownerAvatar(delivery)" alt="">
              <i v-else aria-hidden="true">{{ ownerInitial(delivery) }}</i>
              <b>{{ ownerLabel(delivery) }}</b>
            </span>
            <span class="express-card__flags">
              <span class="priority-badge" :class="delivery.priority === 'urgent' ? 'urgent' : 'normal'">{{ priorityLabel(delivery) }}</span>
              <span v-if="delivery.status === 'picked'" class="status-badge picked">今日已取</span>
            </span>
          </header>
          <div class="express-card__body">
            <span class="delivery-mark" aria-hidden="true"><i></i></span>
            <div>
              <small>取件码</small>
              <h2>{{ delivery.trackingNo }}</h2>
              <p v-if="delivery.description">{{ delivery.description }}</p>
            </div>
          </div>
          <div class="pickup-place"><span>取件地点</span><strong>{{ delivery.pickupLocation }}</strong></div>
          <dl class="express-card__meta">
            <div><dt>创建</dt><dd>{{ formatTime(delivery.createdAt) }}</dd></div>
            <div v-if="delivery.pickedAt"><dt>{{ pickerLabel(delivery) }}</dt><dd>{{ formatTime(delivery.pickedAt) }}</dd></div>
          </dl>
          <footer class="express-card__actions">
            <button v-if="delivery.status === 'pending'" type="button" class="action-primary" :disabled="busyId === deliveryId(delivery)" @click="pickDelivery(delivery)">标记已取</button>
            <button v-else-if="canUnpick(delivery)" type="button" class="action-secondary" :disabled="busyId === deliveryId(delivery)" @click="unpickDelivery(delivery)">撤销取件</button>
            <button v-if="delivery.status === 'pending' && isMine(delivery)" type="button" class="action-secondary" @click="openEdit(delivery)">编辑</button>
            <button v-if="delivery.status === 'pending' && isMine(delivery)" type="button" class="action-quiet" @click="deletingDelivery = delivery">删除</button>
          </footer>
        </article>
      </section>
    </main>

    <Teleport to="body">
      <div v-if="showArchive" class="modal-overlay archive-overlay" @click.self="showArchive = false">
        <section class="modal-dialog archive-dialog" role="dialog" aria-modal="true" aria-labelledby="express-archive-title">
        <header class="modal-header archive-header">
          <div>
            <span>OUR PICKUP BOX</span>
            <h2 id="express-archive-title">取件礼盒</h2>
            <p>隔天的已取件会自动收进这里。</p>
          </div>
          <button type="button" aria-label="关闭取件礼盒" @click="showArchive = false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </header>

        <div v-if="archived.length === 0" class="archive-empty">
          <span class="archive-empty__gift" aria-hidden="true"><i></i></span>
          <h3>礼盒还是空的</h3>
          <p>今天取完的快递会留在主界面，明天再自动收好。</p>
        </div>

        <div v-else class="archive-months">
          <section v-for="group in archiveGroups" :key="group.key" class="archive-month">
            <header><h3>{{ group.label }}</h3><span>{{ group.count }} 件</span></header>
            <ul>
              <li v-for="delivery in group.items" :key="deliveryId(delivery)" :class="ownerClass(delivery)">
                <span class="archive-owner">
                  <img v-if="ownerAvatar(delivery)" :src="ownerAvatar(delivery)" alt="">
                  <i v-else aria-hidden="true">{{ ownerInitial(delivery) }}</i>
                </span>
                <div class="archive-copy">
                  <strong>{{ delivery.trackingNo }}</strong>
                  <span>{{ ownerLabel(delivery) }} · {{ delivery.pickupLocation }}</span>
                  <small>{{ pickerLabel(delivery) }} · {{ formatArchiveDate(delivery.pickedAt || delivery.archivedAt || delivery.createdAt) }}</small>
                </div>
                <span v-if="delivery.priority === 'urgent'" class="archive-urgent">紧急</span>
              </li>
            </ul>
          </section>
        </div>
        </section>
      </div>
    </Teleport>

    <button v-if="!loading && !error && !(activeStatus === 'pending' && visibleDeliveries.length === 0)" class="reference-fab" type="button" aria-label="添加快递" @click="openCreate">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg><span>加快递</span>
    </button>

    <Teleport to="body">
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
            <button v-for="location in formLocationNames" :key="location" type="button" :class="{ active: form.pickupLocation === location }" :aria-pressed="form.pickupLocation === location" @click="form.pickupLocation = location">{{ location }}</button>
            <button type="button" class="location-picker__add" @click="showInlineLocation = !showInlineLocation">＋ 新地点</button>
          </fieldset>

          <div v-if="showInlineLocation || formLocationNames.length === 0" class="inline-location">
            <input v-model="newLocationName" maxlength="40" autocomplete="off" placeholder="输入新取件地点">
            <button type="button" :disabled="locationSaving || !newLocationName.trim()" @click="addLocation({ selectAfterCreate: true })">{{ locationSaving ? '添加中' : '添加并选中' }}</button>
          </div>

          <label><span>物品说明（可选）</span><input v-model="form.description" maxlength="120" autocomplete="off" placeholder="方便彼此辨认"></label>
          <fieldset><legend>优先级</legend><button type="button" :class="{ active: form.priority === 'normal' }" :aria-pressed="form.priority === 'normal'" @click="form.priority = 'normal'">普通</button><button type="button" :class="{ active: form.priority === 'urgent' }" :aria-pressed="form.priority === 'urgent'" @click="form.priority = 'urgent'">紧急</button></fieldset>
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
    </Teleport>

    <div v-if="toast" class="toast" role="status" aria-live="polite" aria-atomic="true">{{ toast }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { recognizePickupDetails } from '../utils/pickup-code.js'
import { buildExpressMonthGroups, formatExpressArchiveDate, isDeliveryPickedToday, partitionExpressDeliveries } from '../utils/express-archive.js'
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
const showArchive = ref(false)
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
const currentUser = computed(() => userStore.currentUser || userStore.user || {})
const currentPartner = computed(() => userStore.currentPartner || userStore.partner || userStore.currentUser?.partner || {})
const deliveryPartitions = computed(() => partitionExpressDeliveries(deliveries.value))
const pending = computed(() => deliveryPartitions.value.pending)
const picked = computed(() => deliveryPartitions.value.pickedToday)
const archived = computed(() => deliveryPartitions.value.archived)
const statusTabs = computed(() => [
  { key: 'pending', label: '待取', count: pending.value.length },
  { key: 'picked', label: '今日已取', count: picked.value.length }
])
const savedLocationNames = computed(() => Array.from(new Set([
  ...locations.value.map(location => location.name),
  ...deliveries.value.map(delivery => String(delivery.pickupLocation || '').trim())
].filter(Boolean))).sort((left, right) => left.localeCompare(right, 'zh-CN')))
const formLocationNames = computed(() => Array.from(new Set([...savedLocationNames.value, form.value.pickupLocation].filter(Boolean))))
const deliveriesForStatus = computed(() => activeStatus.value === 'picked' ? picked.value : pending.value)
const activeLocationNames = computed(() => Array.from(new Set(deliveriesForStatus.value
  .map(delivery => String(delivery.pickupLocation || '').trim())
  .filter(Boolean)))
  .sort((left, right) => left.localeCompare(right, 'zh-CN')))
const visibleDeliveries = computed(() => deliveriesForStatus.value
  .filter(delivery => activeLocation.value === 'all' || delivery.pickupLocation === activeLocation.value)
  .slice()
  .sort((a, b) => new Date(b.pickedAt || b.createdAt) - new Date(a.pickedAt || a.createdAt)))
const archiveGroups = computed(() => buildExpressMonthGroups(archived.value, currentUserId.value))
const activeListLabel = computed(() => `${activeStatus.value === 'pending' ? '待取' : '今日已取'}快递${activeLocation.value === 'all' ? '' : ` · ${activeLocation.value}`}`)
const emptyTitle = computed(() => activeLocation.value === 'all' ? `${statusTabs.value.find(tab => tab.key === activeStatus.value)?.label || ''}列表还是空的` : `${activeLocation.value}没有${statusTabs.value.find(tab => tab.key === activeStatus.value)?.label || ''}快递`)
const emptyCopy = computed(() => activeStatus.value === 'picked' ? '今天取完的快递会暂时留在这里，方便发现误操作后撤销。' : '快递属于你们共同的取件清单，按地点查看会更快。')
const formValid = computed(() => Boolean(form.value.trackingNo.trim() && form.value.pickupLocation.trim()))

function createEmptyForm() { return { trackingNo: '', pickupLocation: '', description: '', priority: 'normal' } }
function token() { return localStorage.getItem('token') || '' }
function deliveryId(delivery) { return String(delivery?.id || delivery?._id || '') }
function isMine(delivery) { return String(delivery?.requesterId || '') === currentUserId.value }
function canUnpick(delivery) { return isDeliveryPickedToday(delivery) && String(delivery.pickerId || '') === currentUserId.value }
function canManageLocation(location) { return String(location?.createdBy || '') === currentUserId.value }
function ownerClass(delivery) { return isMine(delivery) ? 'is-mine' : 'is-partner' }
function personPronoun(person) { return person?.gender === 'female' ? '她' : person?.gender === 'male' ? '他' : '伴侣' }
function ownerPerson(delivery) { return delivery?.requester || (isMine(delivery) ? currentUser.value : currentPartner.value) || null }
function ownerLabel(delivery) { return isMine(delivery) ? '我的快递' : `${personPronoun(ownerPerson(delivery))}的快递` }
function ownerAvatar(delivery) { const person = ownerPerson(delivery); return person?.avatarUrl || person?.avatar || '' }
function ownerInitial(delivery) { return String(ownerPerson(delivery)?.nickname || (isMine(delivery) ? '我' : personPronoun(ownerPerson(delivery)))).trim().slice(0, 1) }
function pickerLabel(delivery) {
  if (!delivery?.pickerId) return '已取件'
  if (String(delivery.pickerId) === currentUserId.value) return '我取件'
  return `${delivery?.picker?.nickname || personPronoun(delivery?.picker || userStore.partner)}取件`
}
function priorityLabel(delivery) { return delivery.priority === 'urgent' ? '紧急' : '普通' }
function formatArchiveDate(value) { return formatExpressArchiveDate(value) }
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
    if (activeLocation.value !== 'all' && !activeLocationNames.value.includes(activeLocation.value)) activeLocation.value = 'all'
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
function selectStatus(status) { activeStatus.value = status; activeLocation.value = 'all' }
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
    selectStatus('pending')
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
.express-page {
  min-height: 100dvh;
  color: var(--fellow-ink);
  background: var(--fellow-paper);
}
.main { display: grid; gap: var(--fellow-space-4); }
.archive-gift-button.archive-gift-button { position: relative; background: var(--fellow-yellow); }
.archive-gift-button > span { position: absolute; top: -7px; right: -7px; display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 4px; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); box-sizing: border-box; color: var(--fellow-ink); background: var(--fellow-pink); font-size: 9px; font-weight: 950; }
.express-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; margin: 14px 16px 0; padding: 5px; border: 3px solid var(--fellow-ink); border-radius: 12px; background: var(--fellow-white); box-shadow: var(--fellow-shadow-soft); }
.express-tabs button { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: var(--fellow-touch-target-min); padding: 6px; border: 0; border-radius: 8px; color: var(--fellow-ink); background: transparent; font: inherit; font-size: 12px; font-weight: 900; cursor: pointer; }
.express-tabs button.active { background: var(--fellow-yellow); box-shadow: inset 0 0 0 2px var(--fellow-ink); }
.express-tabs strong { display: grid; min-width: 20px; height: 20px; place-items: center; border: 2px solid var(--fellow-ink); border-radius: 50%; background: var(--fellow-white); font-size: 10px; }
.location-filter { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin: 10px 16px 0; }
.location-filter__rail { display: flex; min-width: 0; gap: 7px; overflow-x: auto; padding: 2px 2px 5px; scrollbar-width: none; }
.location-filter__rail::-webkit-scrollbar { display: none; }
.location-filter button { flex: none; min-height: var(--fellow-touch-target-min); padding: 7px 11px; border: 2px solid var(--fellow-ink); border-radius: 9px; color: var(--fellow-ink); background: var(--fellow-white); font: inherit; font-size: 11px; font-weight: 900; white-space: nowrap; cursor: pointer; }
.location-filter button.active { background: var(--fellow-mint); box-shadow: 2px 2px 0 var(--fellow-ink); }
.location-filter button.location-filter__manage { background: var(--fellow-blue); }
.express-list { display: grid; gap: 13px; }
.express-card { --owner-accent: var(--fellow-yellow); --owner-soft: color-mix(in srgb, var(--owner-accent) 18%, var(--fellow-white)); display: grid; gap: 12px; padding: 16px; border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); box-shadow: var(--fellow-shadow-soft); }
.express-card.is-partner { --owner-accent: var(--fellow-blue); }
.express-card.is-urgent { background: color-mix(in srgb, var(--fellow-pink) 10%, var(--fellow-white)); }
.express-card__header,
.express-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.owner-badge { display: inline-flex; min-width: 0; min-height: 34px; align-items: center; gap: 7px; padding: 2px 9px 2px 3px; border-radius: var(--fellow-radius-pill); background: var(--owner-soft); }
.owner-badge img,
.owner-badge i { width: 28px; height: 28px; flex: 0 0 28px; border: 2px solid var(--fellow-ink); border-radius: 50%; box-sizing: border-box; object-fit: cover; }
.owner-badge i { display: grid; place-items: center; background: var(--owner-accent); font-size: 11px; font-style: normal; font-weight: 950; }
.owner-badge b { overflow: hidden; font-size: 11px; font-weight: 950; text-overflow: ellipsis; white-space: nowrap; }
.express-card__flags { display: flex; flex: none; align-items: center; gap: 5px; }
.priority-badge,
.status-badge { display: inline-flex; min-height: 28px; align-items: center; padding: 0 8px; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); font-size: 9px; font-weight: 950; }
.priority-badge.normal { background: var(--fellow-white); }
.priority-badge.urgent { background: var(--fellow-pink); }
.status-badge.picked { background: var(--fellow-mint); }
.express-card__body { display: grid; grid-template-columns: 58px minmax(0, 1fr); align-items: center; gap: 12px; }
.delivery-mark { position: relative; width: 50px; height: 44px; border: 3px solid var(--fellow-ink); box-sizing: border-box; background: var(--owner-accent); }
.delivery-mark::after { position: absolute; inset: -3px auto -3px 19px; width: 8px; border: solid var(--fellow-ink); border-width: 0 2px; content: ''; background: var(--fellow-orange); }
.delivery-mark i { position: absolute; top: 16px; left: -3px; width: 50px; height: 3px; background: var(--fellow-ink); }
.express-card__body small { display: block; color: var(--fellow-text-secondary); font-size: 10px; font-weight: 900; }
.express-card h2 { margin: 1px 0 0; font-size: 23px; font-weight: 950; letter-spacing: -.04em; overflow-wrap: anywhere; }
.express-card__body p { margin: 4px 0 0; color: var(--fellow-text-secondary); font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }
.pickup-place { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 9px; padding: 9px 10px; border-radius: 9px; background: var(--owner-soft); }
.pickup-place span { color: var(--fellow-text-secondary); font-size: 9px; font-weight: 850; }
.pickup-place strong { min-width: 0; overflow-wrap: anywhere; font-size: 12px; font-weight: 950; text-align: right; }
.express-card__meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding-top: 10px; border-top: 2px solid var(--fellow-ink); }
.express-card__meta div { display: flex; gap: 5px; }
.express-card__meta dt { color: var(--fellow-text-secondary); font-size: 10px; font-weight: 800; }
.express-card__meta dd { margin: 0; font-size: 10px; font-weight: 900; }
.express-card__actions { justify-content: flex-start; flex-wrap: wrap; }
.express-card__actions:empty { display: none; }
.express-card__actions button { min-height: var(--fellow-touch-target-min); padding: 7px 11px; border: 2px solid var(--fellow-ink); border-radius: 8px; color: var(--fellow-ink); font: inherit; font-size: 11px; font-weight: 950; cursor: pointer; }
.action-primary { background: var(--fellow-yellow); box-shadow: 2px 2px 0 var(--fellow-ink); }
.action-secondary,
.action-quiet { background: var(--fellow-white); }
.action-quiet { margin-left: auto; }
.is-loading { min-height: 116px; animation: none; background: var(--fellow-white); }
.loading-card__badges { display: flex; justify-content: space-between; }
.loading-card__badges span { width: 66px; height: 28px; border-radius: var(--fellow-radius-pill); background: var(--fellow-surface-input); }
.loading-card__parcel { display: grid; grid-template-columns: 48px 1fr; align-items: center; gap: 12px; }
.loading-card__parcel i { width: 44px; height: 38px; border: 3px solid var(--fellow-ink); background: var(--fellow-yellow); }
.loading-card__parcel span,
.loading-card__line { height: 12px; border-radius: 4px; background: var(--fellow-surface-input); }
.loading-card__line { width: 72%; }
.express-state { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 9px; padding: 24px; border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); box-shadow: var(--fellow-shadow-soft); text-align: center; }
.state-box { width: 56px; height: 50px; border: 3px solid var(--fellow-ink); background: var(--fellow-mint); }
.state-box.is-error { background: var(--fellow-pink); }
.express-state h2 { margin: 3px 0 0; font-size: 20px; font-weight: 950; }
.express-state p { max-width: 280px; margin: 0; color: var(--fellow-text-secondary); font-size: 12px; line-height: 1.55; }
.express-state button { min-height: var(--fellow-touch-target-min); padding: 8px 14px; border: 3px solid var(--fellow-ink); border-radius: 9px; color: var(--fellow-ink); background: var(--fellow-yellow); box-shadow: 3px 3px 0 var(--fellow-ink); font: inherit; font-weight: 900; cursor: pointer; }
.modal-overlay { position: fixed; inset: 0; z-index: var(--fellow-z-modal); display: grid; place-items: center; padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px)); background: color-mix(in srgb, var(--fellow-ink) 58%, transparent); backdrop-filter: blur(5px); }
.modal-dialog { width: min(100%, 410px); max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); overflow-y: auto; padding: 17px; border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); box-sizing: border-box; color: var(--fellow-ink); background: var(--fellow-paper); box-shadow: 7px 8px 0 var(--fellow-ink); }
.modal-dialog--small { max-width: 370px; }
.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 13px; border-bottom: 3px solid var(--fellow-ink); }
.modal-header > div { min-width: 0; }
.modal-header > div > span { font-size: 9px; font-weight: 950; letter-spacing: .14em; }
.modal-header h2 { margin: 2px 0 0; font-size: 23px; font-weight: 950; }
.modal-header button { display: grid; width: 44px; height: 44px; flex: none; place-items: center; padding: 0; border: 3px solid var(--fellow-ink); border-radius: 9px; color: var(--fellow-ink); background: var(--fellow-white); cursor: pointer; }
.modal-header svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; }
.modal-body { display: grid; gap: 14px; padding: 16px 0; }
.modal-body label { display: grid; gap: 6px; }
.modal-body label span,
.modal-body legend { font-size: 12px; font-weight: 950; }
.modal-body input,
.modal-body textarea { width: 100%; min-height: var(--fellow-touch-target-min); padding: 9px 10px; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); box-sizing: border-box; color: var(--fellow-ink); background: var(--fellow-white); font: inherit; font-size: 16px; }
.modal-body input::placeholder,
.modal-body textarea::placeholder { color: var(--fellow-text-secondary); opacity: 1; }
.smart-message textarea { min-height: 80px; resize: vertical; }
.smart-message small { color: var(--fellow-text-secondary); font-size: 11px; font-weight: 800; }
.modal-body fieldset { display: flex; flex-wrap: wrap; gap: 7px; margin: 0; padding: 0; border: 0; }
.modal-body legend { width: 100%; margin-bottom: 1px; }
.modal-body fieldset button { min-height: var(--fellow-touch-target-min); padding: 6px 12px; border: 2px solid var(--fellow-ink); border-radius: 8px; color: var(--fellow-ink); background: var(--fellow-white); font: inherit; font-size: 11px; font-weight: 900; cursor: pointer; }
.modal-body fieldset button.active { background: var(--fellow-yellow); box-shadow: 2px 2px 0 var(--fellow-ink); }
.modal-body fieldset button.location-picker__add { background: color-mix(in srgb, var(--fellow-mint) 42%, var(--fellow-white)); }
.inline-location,
.location-create { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; }
.inline-location button,
.location-create button { min-height: var(--fellow-touch-target-min); padding: 0 11px; border: 2px solid var(--fellow-ink); border-radius: 9px; color: var(--fellow-ink); background: var(--fellow-blue); font: inherit; font-size: 11px; font-weight: 950; }
.location-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.location-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 48px; padding: 7px 9px; border: 2px solid var(--fellow-ink); border-radius: 9px; background: var(--fellow-white); }
.location-list strong { min-width: 0; overflow-wrap: anywhere; font-size: 13px; }
.location-list__actions { display: flex; gap: 5px; }
.location-list button { flex: none; min-height: 36px; padding: 0 8px; border: 2px solid var(--fellow-ink); border-radius: 7px; color: var(--fellow-ink); background: var(--fellow-white); font: inherit; font-size: 10px; font-weight: 900; }
.location-list button.confirming { background: var(--fellow-pink); }
.location-empty { margin: 0; color: var(--fellow-text-secondary); font-size: 12px; line-height: 1.5; }
.delete-copy { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.5; overflow-wrap: anywhere; }
.modal-footer { display: grid; grid-template-columns: 1fr 1.4fr; gap: 9px; padding: 13px 0 0; border-top: 3px solid var(--fellow-ink); }
.modal-footer button { min-height: var(--fellow-touch-target-min); border: 3px solid var(--fellow-ink); border-radius: 9px; color: var(--fellow-ink); font: inherit; font-weight: 950; }
.button-secondary { background: var(--fellow-white); }
.button-primary { background: var(--fellow-yellow); box-shadow: 3px 3px 0 var(--fellow-ink); }
.button-danger { background: var(--fellow-pink); box-shadow: 3px 3px 0 var(--fellow-ink); }
.archive-dialog { display: flex; max-height: min(760px, calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))); flex-direction: column; overflow: hidden; padding-bottom: 0; }
.archive-header { flex: none; }
.archive-header p { margin: 4px 0 0; color: var(--fellow-text-secondary); font-size: 10px; font-weight: 750; }
.archive-empty { display: grid; min-height: 330px; place-items: center; place-content: center; gap: 7px; padding-bottom: 17px; text-align: center; }
.archive-empty__gift { position: relative; width: 66px; height: 54px; border: 3px solid var(--fellow-ink); background: var(--fellow-yellow); }
.archive-empty__gift::before { position: absolute; top: 15px; right: -3px; left: -3px; height: 3px; content: ''; background: var(--fellow-ink); }
.archive-empty__gift::after { position: absolute; top: -3px; bottom: -3px; left: 27px; width: 8px; border: solid var(--fellow-ink); border-width: 0 2px; content: ''; background: var(--fellow-pink); }
.archive-empty h3 { margin: 3px 0 0; font-size: 18px; }
.archive-empty p { max-width: 260px; margin: 0; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.5; }
.archive-months { display: grid; gap: 20px; min-height: 0; overflow-y: auto; margin: 0 -5px; padding: 16px 5px calc(17px + env(safe-area-inset-bottom, 0px)); }
.archive-month > header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding: 0 2px 8px; border-bottom: 2px solid var(--fellow-ink); }
.archive-month h3 { margin: 0; font-size: 15px; font-weight: 950; }
.archive-month > header span { color: var(--fellow-text-secondary); font-size: 10px; font-weight: 850; }
.archive-month ul { display: grid; gap: 7px; margin: 8px 0 0; padding: 0; list-style: none; }
.archive-month li { --owner-accent: var(--fellow-yellow); --owner-soft: color-mix(in srgb, var(--owner-accent) 18%, var(--fellow-white)); display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; align-items: center; gap: 9px; min-height: 58px; padding: 8px 9px; border-radius: 10px; background: var(--owner-soft); }
.archive-month li.is-partner { --owner-accent: var(--fellow-blue); }
.archive-owner img,
.archive-owner i { display: grid; width: 36px; height: 36px; place-items: center; border: 2px solid var(--fellow-ink); border-radius: 50%; box-sizing: border-box; object-fit: cover; background: var(--owner-accent); font-size: 12px; font-style: normal; font-weight: 950; }
.archive-copy { display: grid; min-width: 0; gap: 1px; }
.archive-copy strong { overflow-wrap: anywhere; font-size: 12px; font-weight: 950; }
.archive-copy span { overflow: hidden; font-size: 10px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.archive-copy small { color: var(--fellow-text-secondary); font-size: 9px; }
.archive-urgent { align-self: start; padding: 3px 6px; border-radius: var(--fellow-radius-pill); background: var(--fellow-pink); font-size: 9px; font-weight: 950; }
.toast { position: fixed; right: 18px; bottom: calc(86px + env(safe-area-inset-bottom, 0px)); left: 18px; z-index: var(--fellow-z-toast); width: fit-content; max-width: calc(100% - 36px); margin: auto; padding: 10px 14px; border-radius: 9px; color: var(--fellow-white); background: var(--fellow-ink); font-size: 12px; font-weight: 850; }
button:focus-visible,
input:focus-visible,
textarea:focus-visible { outline: 3px solid var(--fellow-blue); outline-offset: 2px; }
button:disabled { cursor: default; opacity: .55; }
@media (max-width: 340px) {
  .express-tabs button { font-size: 10px; }
  .location-filter { margin-right: 12px; margin-left: 12px; }
  .owner-badge b { max-width: 88px; }
  .express-card__header { align-items: flex-start; }
  .express-card__flags { flex-direction: column; align-items: flex-end; }
  .modal-overlay { padding-right: 12px; padding-left: 12px; }
  .archive-month li { grid-template-columns: 34px minmax(0, 1fr); }
  .archive-owner img,
  .archive-owner i { width: 34px; height: 34px; }
  .archive-urgent { grid-column: 2; justify-self: start; }
}
@media (prefers-reduced-motion: reduce) { .modal-dialog { scroll-behavior: auto; } }
</style>
