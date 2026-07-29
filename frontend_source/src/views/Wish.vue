<template>
  <section class="wish-page">
    <FeatureHeader title="心愿墙" eyebrow="OUR WISHES" chapter="09" kind="wishes" />

    <nav v-if="partner" class="wish-status" aria-label="心愿状态">
      <button
        v-for="tab in statusTabs"
        :key="tab.key"
        type="button"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        <span>{{ tab.label }}</span>
        <strong>{{ tab.count }}</strong>
      </button>
    </nav>

    <main class="main">
      <section v-if="!partner" class="wish-state" aria-live="polite">
        <span class="wish-state__shape" aria-hidden="true"></span>
        <h2>绑定伴侣后一起写心愿</h2>
        <p>绑定后，你们可以一起写下想完成的事。</p>
        <button type="button" @click="router.push('/home')">返回首页</button>
      </section>

      <template v-else>
        <nav class="wish-types" aria-label="心愿分类">
          <button
            v-for="option in typeOptions"
            :key="option.value"
            type="button"
            :class="{ active: filterType === option.value }"
            @click="filterType = option.value"
          >
            <i :class="`type-shape type-shape--${option.value}`" aria-hidden="true"></i>
            {{ option.label }}
          </button>
        </nav>

        <section v-if="loading" class="wish-list" aria-label="正在加载心愿">
          <article v-for="index in 3" :key="index" class="wish-card wish-card--loading"></article>
        </section>

        <section v-else-if="error" class="wish-state" role="alert">
          <span class="wish-state__shape is-error" aria-hidden="true"></span>
          <h2>心愿暂时没有同步好</h2>
          <p>{{ error }}</p>
          <button type="button" @click="fetchWishes">重新加载</button>
        </section>

        <section v-else-if="filteredWishes.length === 0" class="wish-state">
          <span class="wish-state__shape" aria-hidden="true"></span>
          <h2>{{ emptyTitle }}</h2>
          <p>{{ emptyCopy }}</p>
          <button v-if="activeTab !== 'archived'" type="button" @click="showAddModal = true">写下一个心愿</button>
        </section>

        <section v-else class="wish-list" :aria-label="activeTabLabel">
          <article
            v-for="wish in filteredWishes"
            :key="wishId(wish)"
            class="wish-card"
            :class="[`wish-card--${wish.type || 'want'}`, { 'is-archived': wish.archivedAt }]"
          >
            <header class="wish-card__header">
              <span class="wish-card__type">
                <i :class="`type-shape type-shape--${wish.type || 'want'}`" aria-hidden="true"></i>
                {{ typeLabel(wish.type) }}
              </span>
              <span v-if="wish.priority === 'high'" class="wish-card__priority">优先</span>
            </header>

            <h2>{{ wish.title }}</h2>
            <p v-if="wish.description">{{ wish.description }}</p>

            <dl class="wish-card__meta">
              <div>
                <dt>写下</dt>
                <dd>{{ actorLabel(wish.createdBy) }}</dd>
              </div>
              <div v-if="wish.targetDate">
                <dt>目标</dt>
                <dd>{{ formatDate(wish.targetDate) }}</dd>
              </div>
              <div v-if="wish.completedAt">
                <dt>完成</dt>
                <dd>{{ formatDate(wish.completedAt) }}</dd>
              </div>
            </dl>

            <p v-if="wish.completionNote" class="wish-card__completion">{{ wish.completionNote }}</p>

            <footer class="wish-card__actions">
              <button v-if="wish.status === 'pending'" type="button" class="action-primary" @click="openComplete(wish)">标记完成</button>
              <button v-else-if="!wish.archivedAt" type="button" class="action-primary" :disabled="archivingId === wishId(wish)" @click="archiveWish(wish)">
                {{ archivingId === wishId(wish) ? '归档中' : '收进回忆' }}
              </button>
              <span v-else class="wish-card__archived">由{{ actorLabel(wish.archivedBy) }}归档 · {{ formatDate(wish.archivedAt) }}</span>
              <button v-if="canCurrentUserDeleteWish(wish)" type="button" class="action-quiet" @click="openDelete(wish)">删除</button>
            </footer>
          </article>
        </section>
      </template>
    </main>

    <button v-if="partner" class="reference-fab" type="button" aria-label="添加心愿" @click="showAddModal = true">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      <span>写心愿</span>
    </button>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeAddModal">
      <section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="wish-add-title">
        <header class="modal-header">
          <div><span>NEW WISH</span><h2 id="wish-add-title">写下心愿</h2></div>
          <button type="button" aria-label="关闭" @click="closeAddModal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </header>
        <div class="modal-body">
          <label class="field"><span>心愿内容</span><textarea v-model="newWish.title" rows="2" maxlength="50" placeholder="想一起完成什么"></textarea></label>
          <label class="field"><span>补充说明</span><textarea v-model="newWish.description" rows="2" maxlength="100" placeholder="需要记住的细节"></textarea></label>
          <fieldset class="choice-field">
            <legend>类型</legend>
            <button v-for="option in typeOptions.slice(1)" :key="option.value" type="button" :class="{ active: newWish.type === option.value }" @click="newWish.type = option.value">
              <i :class="`type-shape type-shape--${option.value}`" aria-hidden="true"></i>{{ option.label }}
            </button>
          </fieldset>
          <fieldset class="choice-field">
            <legend>优先级</legend>
            <button v-for="option in priorityOptions" :key="option.value" type="button" :class="{ active: newWish.priority === option.value }" @click="newWish.priority = option.value">{{ option.label }}</button>
          </fieldset>
          <label class="field"><span>目标日期（可选）</span><DatePickerField v-model="newWish.targetDate" display-class="wish-date-input" placeholder="选择日期" /></label>
        </div>
        <footer class="modal-footer">
          <button type="button" class="button-secondary" @click="closeAddModal">取消</button>
          <button type="button" class="button-primary" :disabled="submitting || !newWish.title.trim()" @click="addWish">{{ submitting ? '保存中' : '保存心愿' }}</button>
        </footer>
      </section>
    </div>

    <div v-if="showCompleteModal" class="modal-overlay" @click.self="closeCompleteModal">
      <section class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="wish-complete-title">
        <header class="modal-header">
          <div><span>DONE TOGETHER</span><h2 id="wish-complete-title">完成心愿</h2></div>
          <button type="button" aria-label="关闭" @click="closeCompleteModal"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </header>
        <div class="modal-body">
          <p class="modal-prompt">{{ completingWish?.title }}</p>
          <label class="field"><span>留一句完成记录（可选）</span><textarea v-model="completionNote" rows="3" maxlength="200" placeholder="这次实现最想记住什么"></textarea></label>
        </div>
        <footer class="modal-footer">
          <button type="button" class="button-secondary" @click="closeCompleteModal">取消</button>
          <button type="button" class="button-primary" :disabled="completing" @click="completeWish">{{ completing ? '保存中' : '确认完成' }}</button>
        </footer>
      </section>
    </div>

    <div v-if="deletingWish" class="modal-overlay" @click.self="deletingWish = null">
      <section class="modal-dialog modal-dialog--small" role="dialog" aria-modal="true" aria-labelledby="wish-delete-title">
        <header class="modal-header"><div><span>DELETE</span><h2 id="wish-delete-title">删除心愿</h2></div></header>
        <div class="modal-body"><p class="modal-prompt">删除后无法恢复“{{ deletingWish.title }}”。</p></div>
        <footer class="modal-footer">
          <button type="button" class="button-secondary" @click="deletingWish = null">取消</button>
          <button type="button" class="button-danger" :disabled="deleting" @click="deleteWish">{{ deleting ? '删除中' : '确认删除' }}</button>
        </footer>
      </section>
    </div>

    <div v-if="toast" class="toast" role="status" aria-live="polite" aria-atomic="true">{{ toast }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { canDeleteWish } from '../utils/wish-permissions.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import DatePickerField from '../components/DatePickerField.vue'

const router = useRouter()
const { onMessage } = useWebSocket()
const currentUserId = ref('')
const partner = ref(null)
const wishes = ref([])
const archivedWishes = ref([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('pending')
const filterType = ref('all')
const showAddModal = ref(false)
const submitting = ref(false)
const showCompleteModal = ref(false)
const completing = ref(false)
const completingWish = ref(null)
const completionNote = ref('')
const deletingWish = ref(null)
const deleting = ref(false)
const archivingId = ref('')
const toast = ref('')
let toastTimer = null
let unsubscribe = null

const newWish = ref({ title: '', description: '', type: 'want', priority: 'normal', targetDate: '' })
const typeOptions = [
  { value: 'all', label: '全部' },
  { value: 'want', label: '想要' },
  { value: 'travel', label: '旅行' },
  { value: 'experience', label: '体验' },
  { value: 'eat', label: '想吃' }
]
const priorityOptions = [
  { value: 'low', label: '慢慢来' },
  { value: 'normal', label: '普通' },
  { value: 'high', label: '优先' }
]

const pendingCount = computed(() => wishes.value.filter(wish => wish.status === 'pending').length)
const completedCount = computed(() => wishes.value.filter(wish => wish.status === 'completed').length)
const statusTabs = computed(() => [
  { key: 'pending', label: '进行中', count: pendingCount.value },
  { key: 'completed', label: '已完成', count: completedCount.value },
  { key: 'archived', label: '已归档', count: archivedWishes.value.length }
])
const activeTabLabel = computed(() => statusTabs.value.find(tab => tab.key === activeTab.value)?.label || '心愿')
const selectedList = computed(() => activeTab.value === 'archived'
  ? archivedWishes.value
  : wishes.value.filter(wish => wish.status === activeTab.value))
const filteredWishes = computed(() => selectedList.value
  .filter(wish => filterType.value === 'all' || wish.type === filterType.value)
  .slice()
  .sort((a, b) => new Date(b.archivedAt || b.completedAt || b.createdAt) - new Date(a.archivedAt || a.completedAt || a.createdAt)))
const emptyTitle = computed(() => activeTab.value === 'pending' ? '还没有进行中的心愿' : activeTab.value === 'completed' ? '还没有等待归档的心愿' : '归档回忆还是空的')
const emptyCopy = computed(() => activeTab.value === 'pending' ? '从一件真正想一起完成的小事开始。' : activeTab.value === 'completed' ? '完成心愿后会先留在这里，确认后再归档。' : '完成并归档的心愿会在这里保留。')

function token() { return localStorage.getItem('token') || '' }
function wishId(wish) { return String(wish?._id || wish?.id || '') }
function typeLabel(type) { return typeOptions.find(option => option.value === type)?.label || '想要' }
function actorLabel(actorId) {
  if (!actorId) return '未记录'
  return String(actorId) === String(currentUserId.value) ? '我' : (partner.value?.gender === 'male' ? '他' : partner.value?.gender === 'female' ? '她' : '伴侣')
}
function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value))
}
function notify(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2400)
}
function canCurrentUserDeleteWish(wish) { return canDeleteWish(wish, currentUserId.value) }

async function fetchUser() {
  const response = await fetch(`${CONFIG.API_URL}/me`, { headers: { Authorization: `Bearer ${token()}` } })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.message || '用户信息加载失败')
  currentUserId.value = String(body.data.id || body.data._id || '')
  partner.value = body.data.partner || null
}

async function requestWishes(query = '') {
  const response = await fetch(`${CONFIG.API_URL}/wishes${query}`, { headers: { Authorization: `Bearer ${token()}` } })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(body.message || '心愿加载失败')
  return Array.isArray(body.data) ? body.data : []
}

async function fetchWishes() {
  loading.value = true
  error.value = ''
  try {
    if (!currentUserId.value) await fetchUser()
    if (!partner.value) return
    const [active, archived] = await Promise.all([requestWishes(), requestWishes('?archived=true')])
    wishes.value = active
    archivedWishes.value = archived
  } catch (requestError) {
    error.value = requestError.message || '心愿加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function resetNewWish() { newWish.value = { title: '', description: '', type: 'want', priority: 'normal', targetDate: '' } }
function closeAddModal() { showAddModal.value = false; resetNewWish() }
async function addWish() {
  if (!newWish.value.title.trim() || submitting.value) return
  submitting.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/wishes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(newWish.value)
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '添加失败')
    closeAddModal()
    await fetchWishes()
    notify('心愿已保存')
  } catch (requestError) {
    notify(requestError.message || '添加失败')
  } finally {
    submitting.value = false
  }
}

function openComplete(wish) { completingWish.value = wish; completionNote.value = ''; showCompleteModal.value = true }
function closeCompleteModal() { showCompleteModal.value = false; completingWish.value = null; completionNote.value = '' }
async function completeWish() {
  if (!completingWish.value || completing.value) return
  completing.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/wishes/${wishId(completingWish.value)}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ completionNote: completionNote.value.trim() })
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '完成失败')
    closeCompleteModal()
    await fetchWishes()
    activeTab.value = 'completed'
    notify('心愿已完成')
  } catch (requestError) {
    notify(requestError.message || '完成失败')
  } finally {
    completing.value = false
  }
}

async function archiveWish(wish) {
  const id = wishId(wish)
  if (!id || archivingId.value) return
  archivingId.value = id
  try {
    const response = await fetch(`${CONFIG.API_URL}/wishes/${id}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '归档失败')
    await fetchWishes()
    activeTab.value = 'archived'
    notify('已收进回忆')
  } catch (requestError) {
    notify(requestError.message || '归档失败')
  } finally {
    archivingId.value = ''
  }
}

function openDelete(wish) {
  if (!canCurrentUserDeleteWish(wish)) return notify('只能删除自己创建的心愿')
  deletingWish.value = wish
}
async function deleteWish() {
  if (!deletingWish.value || deleting.value) return
  deleting.value = true
  try {
    const response = await fetch(`${CONFIG.API_URL}/wishes/${wishId(deletingWish.value)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '删除失败')
    deletingWish.value = null
    await fetchWishes()
    notify('心愿已删除')
  } catch (requestError) {
    notify(requestError.message || '删除失败')
  } finally {
    deleting.value = false
  }
}

function handleVisibility() { if (document.visibilityState === 'visible') fetchWishes() }

onMounted(async () => {
  await fetchWishes()
  unsubscribe = onMessage(message => { if (message.type === 'wishSync') fetchWishes() })
  document.addEventListener('visibilitychange', handleVisibility)
})
onUnmounted(() => {
  unsubscribe?.()
  document.removeEventListener('visibilitychange', handleVisibility)
  clearTimeout(toastTimer)
})
</script>

<style scoped>
.wish-page { min-height: 100dvh; color: #20202a; background: #fffaf5; }
.main { display: grid; gap: 16px; }
.wish-status { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; margin: 14px 16px 0; padding: 5px; background: #fff; border: 3px solid #20202a; border-radius: 12px; box-shadow: 3px 4px 0 #20202a; }
.wish-status button { display: flex; align-items: center; justify-content: center; gap: 6px; min-width: 0; min-height: 44px; padding: 6px; color: #20202a; background: transparent; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 900; }
.wish-status button.active { background: #ffd94a; box-shadow: inset 0 0 0 2px #20202a; }
.wish-status strong { display: grid; min-width: 20px; height: 20px; place-items: center; background: #fff; border: 2px solid #20202a; border-radius: 50%; font-size: 10px; }
.wall-intro { display: grid; grid-template-columns: 1fr 78px; gap: 12px; padding: 22px 18px; background: #ffd94a !important; }
.wish-kicker { font-size: 9px; font-weight: 950; letter-spacing: .13em; }
.wall-intro h1 { max-width: 240px; margin: 6px 0 8px; font-size: clamp(25px, 7.5vw, 34px); font-weight: 950; line-height: 1.04; letter-spacing: -.065em; }
.wall-intro p { margin: 0; font-size: 12px; font-weight: 700; line-height: 1.55; }
.wish-mark { position: relative; align-self: center; width: 70px; height: 70px; background: #ff7fa5; border: 3px solid #20202a; border-radius: 50% 50% 46% 54%; transform: rotate(7deg); }
.wish-mark i,.wish-mark b { position: absolute; top: 24px; width: 8px; height: 12px; background: #20202a; border-radius: 50%; }
.wish-mark i { left: 18px; }.wish-mark b { right: 18px; }
.wish-types { display: flex; gap: 7px; overflow-x: auto; padding: 2px 2px 5px; scrollbar-width: none; }
.wish-types::-webkit-scrollbar { display: none; }
.wish-types button { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 6px; min-height: 44px; padding: 7px 11px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 9px; font: inherit; font-size: 12px; font-weight: 900; }
.wish-types button.active { background: #75dfc1; box-shadow: 2px 2px 0 #20202a; }
.type-shape { display: inline-block; width: 15px; height: 15px; box-sizing: border-box; background: #58c8f5; border: 2px solid #20202a; border-radius: 4px; }
.type-shape--all { border-radius: 50%; background: #ffd94a; }
.type-shape--travel { border-radius: 50% 50% 3px 3px; background: #75dfc1; }
.type-shape--experience { border-radius: 50%; background: #ff7fa5; }
.type-shape--eat { transform: rotate(45deg); background: #ff8b4a; }
.wish-list { display: grid; gap: 13px; }
.wish-card { position: relative; display: grid; gap: 11px; padding: 17px; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }
.wish-card--travel { background: #eafff8; }.wish-card--experience { background: #fff0f5; }.wish-card--eat { background: #fff5ec; }.wish-card.is-archived { background: #f4f1eb; }
.wish-card__header,.wish-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.wish-card__type { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 950; }
.wish-card__priority { padding: 4px 8px; background: #ff7fa5; border: 2px solid #20202a; border-radius: 999px; font-size: 10px; font-weight: 950; }
.wish-card h2 { margin: 0; font-size: 22px; font-weight: 950; line-height: 1.18; letter-spacing: -.045em; overflow-wrap: anywhere; }
.wish-card > p { margin: 0; font-size: 13px; line-height: 1.55; overflow-wrap: anywhere; }
.wish-card__meta { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 0; padding-top: 10px; border-top: 2px solid #20202a; }
.wish-card__meta div { display: flex; gap: 5px; }.wish-card__meta dt { color: #686772; font-size: 10px; font-weight: 800; }.wish-card__meta dd { margin: 0; font-size: 11px; font-weight: 900; }
.wish-card__completion { padding: 10px; background: #ffd94a; border: 2px solid #20202a; border-radius: 8px; font-weight: 750; }
.wish-card__actions { justify-content: flex-start; }.wish-card__actions button { min-height: 44px; padding: 7px 12px; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 950; }
.action-primary { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; }.action-quiet { margin-left: auto; background: #fff; }.wish-card__archived { font-size: 10px; font-weight: 800; }
.wish-card--loading { min-height: 140px; border-color: #d8d4cd; box-shadow: none; background: linear-gradient(100deg,#f2eee8 25%,#fff 45%,#f2eee8 65%); background-size: 220% 100%; animation: loading 1.3s linear infinite; }
.wish-state { display: grid; min-height: 220px; place-items: center; align-content: center; gap: 9px; padding: 24px; text-align: center; background: #fff; border: 3px solid #20202a; border-radius: 14px; box-shadow: 3px 4px 0 #20202a; }
.wish-state__shape { width: 56px; height: 56px; background: #75dfc1; border: 3px solid #20202a; border-radius: 50% 45% 48% 52%; }.wish-state__shape.is-error { background: #ff7fa5; }
.wish-state h2 { margin: 3px 0 0; font-size: 20px; font-weight: 950; }.wish-state p { max-width: 280px; margin: 0; color: #62616b; font-size: 12px; line-height: 1.55; }.wish-state button { min-height: 44px; padding: 8px 14px; color: #20202a; background: #ffd94a; border: 3px solid #20202a; border-radius: 9px; box-shadow: 3px 3px 0 #20202a; font: inherit; font-weight: 900; }
.modal-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; align-items: end; padding: 16px 16px max(16px, env(safe-area-inset-bottom, 0px)); background: rgba(32,32,42,.58); }
.modal-dialog { width: min(100%,430px); max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); margin: 0 auto; overflow-y: auto; padding: 17px; box-sizing: border-box; background: #fffaf5; border: 3px solid #20202a; border-radius: 16px; box-shadow: 7px 8px 0 #20202a; }
.modal-dialog--small { align-self: center; }.modal-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 13px; border-bottom: 3px solid #20202a; }.modal-header span { font-size: 9px; font-weight: 950; letter-spacing: .14em; }.modal-header h2 { margin: 2px 0 0; font-size: 23px; font-weight: 950; }.modal-header button { display: grid; width: 44px; height: 44px; place-items: center; padding: 0; color: #20202a; background: #fff; border: 3px solid #20202a; border-radius: 9px; }.modal-header svg { width: 18px; fill: none; stroke: currentColor; stroke-width: 2.5; }
.modal-body { display: grid; gap: 14px; padding: 16px 0; }.field { display: grid; gap: 6px; }.field > span,.choice-field legend { font-size: 12px; font-weight: 950; }.field textarea { width: 100%; padding: 10px; box-sizing: border-box; resize: vertical; }.choice-field { display: flex; flex-wrap: wrap; gap: 7px; margin: 0; padding: 0; border: 0; }.choice-field legend { width: 100%; margin-bottom: 1px; }.choice-field button { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 6px 10px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 900; }.choice-field button.active { background: #75dfc1; box-shadow: 2px 2px 0 #20202a; }.modal-prompt { margin: 0; font-size: 16px; font-weight: 850; line-height: 1.5; overflow-wrap: anywhere; }
.modal-footer { display: grid; grid-template-columns: 1fr 1.4fr; gap: 9px; padding: 13px 0 env(safe-area-inset-bottom, 0px); border-top: 3px solid #20202a; }.modal-footer button { min-height: 44px; color: #20202a; border: 3px solid #20202a; border-radius: 9px; font: inherit; font-weight: 950; }.button-secondary { background: #fff; }.button-primary { background: #ffd94a; box-shadow: 3px 3px 0 #20202a; }.button-danger { background: #ff7fa5; box-shadow: 3px 3px 0 #20202a; }
.toast { position: fixed; right: 18px; bottom: calc(82px + env(safe-area-inset-bottom,0px)); left: 18px; z-index: 1200; width: fit-content; max-width: calc(100% - 36px); margin: auto; padding: 10px 14px; color: #fff; background: #20202a; border-radius: 9px; font-size: 12px; font-weight: 850; }
@keyframes loading { to { background-position: -220% 0; } }
@media (max-width: 340px) { .wall-intro { grid-template-columns: 1fr 58px; }.wish-mark { width: 52px; height: 52px; }.wish-mark i,.wish-mark b { top: 18px; }.wish-mark i { left: 13px; }.wish-mark b { right: 13px; }.wish-status button { font-size: 10px; } }
@media (prefers-reduced-motion: reduce) { .wish-card--loading { animation: none; } }
</style>
