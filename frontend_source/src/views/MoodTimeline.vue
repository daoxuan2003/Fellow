<template>
  <section class="mood-timeline">
    <header class="mood-timeline__header">
      <button type="button" class="mood-timeline__back" aria-label="返回" @click="goBack">‹</button>
      <div>
        <h1>{{ displayDate }}的对话</h1>
        <p>{{ conversationSummary }}</p>
      </div>
      <button type="button" class="mood-timeline__record" @click="makeUp">＋ 记录</button>
    </header>

    <main class="mood-timeline__content">
      <div v-if="loading" class="mood-timeline__loading" aria-label="正在加载这一天的心情" aria-live="polite">
        <span></span><span></span><span></span>
      </div>
      <div v-else-if="error" class="mood-timeline__error" role="alert">
        <strong>这段对话暂时没加载好</strong>
        <p>{{ error }}</p>
        <button type="button" @click="loadRecords">重新加载</button>
      </div>
      <ol v-else-if="conversationRecords.length" class="mood-timeline__dialog" aria-label="这一天的心情对话">
        <li
          v-for="record in conversationRecords"
          :key="record.id"
          :class="{ 'is-mine': isMine(record) }"
        >
          <MoodCharacter class="mood-timeline__sprite" :mood="record.mood" size="small" />
          <div class="mood-timeline__stack">
            <span class="mood-timeline__sender">
              <strong>{{ isMine(record) ? myName : partnerName }}</strong>
              <time>{{ formatTime(record) }}</time>
            </span>
            <article class="mood-timeline__bubble">
              <span class="mood-timeline__mood">{{ getMoodLabel(record.mood) }}</span>
              <p v-if="record.note">{{ record.note }}</p>
              <p v-else class="is-quiet">只留下了这一刻的心情</p>
            </article>
            <MoodCommentThread
              :record="record"
              :current-user-id="userId"
              :my-name="myName"
              :partner-name="partnerName"
              :record-is-mine="isMine(record)"
              @sent="handleCommentSent(record.id, $event)"
            />
          </div>
        </li>
      </ol>
      <div v-else class="mood-timeline__empty">
        <span aria-hidden="true"><i></i><b></b></span>
        <strong>这一天还没有说话</strong>
        <p>补记一条心情，让这天留下真实的样子。</p>
      </div>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { getMoodLabel } from '../utils/mood-catalog.js'
import { getPartnerPronoun } from '../utils/partner-pronoun.js'
import MoodCharacter from '../components/MoodCharacter.vue'
import MoodCommentThread from '../components/MoodCommentThread.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { onMessage } = useWebSocket()
const date = typeof route.params.date === 'string' ? route.params.date : ''
const records = ref([])
const loading = ref(true)
const error = ref('')
let unsubscribe = null

const userId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const currentUser = computed(() => userStore.currentUser || userStore.user || {})
const partnerFromRecords = computed(() => records.value
  .map(record => record.user)
  .find(candidate => candidate && String(candidate.id || candidate._id || '') !== userId.value))
const partner = computed(() => userStore.currentPartner || userStore.partner || userStore.currentUser?.partner || partnerFromRecords.value || {})
const partnerPronoun = computed(() => getPartnerPronoun(partner.value?.gender))
const myName = computed(() => currentUser.value?.nickname || '我')
const partnerName = computed(() => partner.value?.nickname || partnerPronoun.value)
const displayDate = computed(() => {
  const [year, month, day] = date.split('-')
  return year && month && day ? `${Number(month)}月${Number(day)}日` : '这一天'
})
const conversationSummary = computed(() => {
  if (loading.value) return '正在翻到这一天…'
  if (!conversationRecords.value.length) return '还没有留下心情'
  const commentCount = conversationRecords.value.reduce((total, record) => (
    total + (record.partnerResponse ? 1 : 0) + (Array.isArray(record.comments) ? record.comments.length : 0)
  ), 0)
  return `${conversationRecords.value.length} 条心情${commentCount ? ` · ${commentCount} 条回应` : ''}`
})

function isMine(record) {
  return String(record.user?.id || record.userId || '') === userId.value
}
function timestamp(record) {
  return new Date(record.recordedAt || record.createdAt || 0).getTime()
}
const conversationRecords = computed(() => records.value
  .slice()
  .sort((a, b) => timestamp(a) - timestamp(b)))
function formatTime(record) {
  const value = record.recordedAt || record.respondedAt || record.createdAt
  return value
    ? new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
    : '刚刚'
}
function handleCommentSent(recordId, comment) {
  records.value = records.value.map(record => {
    if (String(record.id) !== String(recordId)) return record
    const comments = Array.isArray(record.comments) ? record.comments : []
    if (comments.some(item => String(item.id || item._id) === String(comment.id || comment._id))) return record
    return { ...record, comments: [...comments, comment] }
  })
}

async function loadRecords({ silent = false } = {}) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${CONFIG.API_URL}/mood?date=${date}&limit=200`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '心情数据加载失败')
    records.value = Array.isArray(body.data) ? body.data : []
  } catch (requestError) {
    error.value = requestError.message || '心情数据加载失败，请稍后重试。'
  } finally {
    if (!silent) loading.value = false
  }
}
function goBack() { router.back() }
function makeUp() { router.push({ path: '/mood/select', query: { date } }) }
onMounted(() => {
  loadRecords()
  unsubscribe = onMessage(message => {
    if (message.type === 'moodSync') loadRecords({ silent: true })
  })
})
onUnmounted(() => unsubscribe?.())
</script>

<style scoped>
.mood-timeline {
  --ink: var(--fellow-ink, #20202a);
  min-height: 100dvh;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: 0 16px calc(24px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  color: var(--ink);
  background: var(--fellow-paper);
}
.mood-timeline__header { position: sticky; top: 0; z-index: var(--fellow-z-sticky); display: grid; grid-template-columns: 44px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 72px; margin: 0 -16px; padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px; border-bottom: 3px solid var(--ink); background: var(--fellow-paper); }
.mood-timeline__header > div { min-width: 0; }
.mood-timeline__header h1 { overflow: hidden; margin: 0; font-size: 19px; font-weight: 950; letter-spacing: -.035em; text-overflow: ellipsis; white-space: nowrap; }
.mood-timeline__header p { margin: 2px 0 0; color: var(--fellow-text-secondary); font-size: 10px; font-weight: 800; }
.mood-timeline__back { display: grid; width: 44px; height: 44px; place-items: center; padding: 0 0 3px; border: 3px solid var(--ink); border-radius: var(--fellow-radius-control); color: var(--ink); background: var(--fellow-white); box-shadow: 3px 3px 0 var(--ink); font: inherit; font-size: 30px; font-weight: 900; line-height: 1; cursor: pointer; }
.mood-timeline__record { min-height: 44px; padding: 0 11px; border: 2px solid var(--ink); border-radius: var(--fellow-radius-control); color: var(--ink); background: var(--fellow-pink); font: inherit; font-size: 11px; font-weight: 950; cursor: pointer; }
.mood-timeline__content { min-height: calc(100dvh - 96px); padding: 22px 0 8px; }
.mood-timeline__dialog { display: grid; gap: 22px; margin: 0; padding: 0; list-style: none; }
.mood-timeline__dialog li { display: flex; align-items: flex-end; gap: 8px; }
.mood-timeline__dialog li.is-mine { flex-direction: row-reverse; }
.mood-timeline__sprite { width: 44px; height: 44px; flex: 0 0 44px; }
.mood-timeline__stack { display: flex; flex: 0 1 calc(100% - 54px); flex-direction: column; min-width: 0; }
.mood-timeline__sender { display: flex; align-items: center; gap: 6px; margin: 0 3px 4px; color: var(--fellow-text-secondary); font-size: 9px; }
.mood-timeline__sender strong { color: var(--ink); font-size: 11px; font-weight: 950; }
.mood-timeline__dialog li.is-mine .mood-timeline__sender { justify-content: flex-end; }
.mood-timeline__bubble { align-self: flex-start; max-width: min(88%, 320px); padding: 11px 12px; border: 2.5px solid var(--ink); border-radius: 5px 13px 13px; box-sizing: border-box; background: var(--fellow-white); }
.mood-timeline__dialog li.is-mine .mood-timeline__bubble { border-radius: 13px 5px 13px 13px; background: color-mix(in srgb, var(--fellow-yellow) 72%, var(--fellow-white)); }
.mood-timeline__dialog li.is-mine .mood-timeline__bubble { align-self: flex-end; }
.mood-timeline__mood { display: inline-flex; align-items: center; min-height: 22px; padding: 0 7px; border-radius: var(--fellow-radius-pill); background: color-mix(in srgb, var(--fellow-pink) 28%, var(--fellow-white)); font-size: 11px; font-weight: 950; }
.mood-timeline__bubble p { margin: 4px 0 0; font-size: 13px; font-weight: 700; line-height: 1.48; overflow-wrap: anywhere; }
.mood-timeline__bubble p.is-quiet { color: var(--fellow-text-muted); font-size: 11px; }
.mood-timeline__loading { display: grid; gap: 18px; padding-top: 20px; }
.mood-timeline__loading span { width: 68%; height: 72px; border-radius: 5px 13px 13px; background: color-mix(in srgb, var(--fellow-text-muted) 18%, var(--fellow-white)); }
.mood-timeline__loading span:nth-child(2) { justify-self: end; width: 58%; border-radius: 13px 5px 13px 13px; background: color-mix(in srgb, var(--fellow-yellow) 36%, var(--fellow-white)); }
.mood-timeline__loading span:nth-child(3) { width: 76%; }
.mood-timeline__error { display: grid; min-height: 330px; place-items: center; place-content: center; gap: 7px; color: var(--fellow-color-danger); text-align: center; }
.mood-timeline__error strong { font-size: 15px; }
.mood-timeline__error p { max-width: 280px; margin: 0; font-size: 11px; line-height: 1.5; }
.mood-timeline__error button { min-height: 44px; margin-top: 5px; padding: 0 13px; border: 2px solid var(--ink); border-radius: var(--fellow-radius-control); color: var(--ink); background: var(--fellow-yellow); font: inherit; font-size: 11px; font-weight: 950; }
.mood-timeline__empty { display: grid; min-height: 330px; place-items: center; place-content: center; gap: 7px; text-align: center; }
.mood-timeline__empty > span { position: relative; width: 74px; height: 46px; }
.mood-timeline__empty i,
.mood-timeline__empty b { position: absolute; top: 2px; width: 40px; height: 40px; border: 3px solid var(--ink); border-radius: 50%; }
.mood-timeline__empty i { left: 2px; background: var(--fellow-blue); }
.mood-timeline__empty b { right: 2px; background: var(--fellow-pink); }
.mood-timeline__empty strong { font-size: 15px; font-weight: 950; }
.mood-timeline__empty p { max-width: 250px; margin: 0; color: var(--fellow-text-secondary); font-size: 11px; line-height: 1.5; }
@media (max-width: 340px) {
  .mood-timeline { padding-right: 12px; padding-left: 12px; }
  .mood-timeline__header { grid-template-columns: 44px minmax(0, 1fr) auto; margin-right: -12px; margin-left: -12px; padding-right: 12px; padding-left: 12px; }
  .mood-timeline__record { padding-right: 8px; padding-left: 8px; }
  .mood-timeline__stack { flex-basis: calc(100% - 52px); }
}
</style>
