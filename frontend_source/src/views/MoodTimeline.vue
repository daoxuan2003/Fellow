<template>
  <section class="mood-timeline">
    <header class="mood-timeline__header">
      <button type="button" class="mood-timeline__back" aria-label="返回" @click="goBack">‹</button>
      <div>
        <span>OUR CONVERSATION</span>
        <h1>{{ displayDate }}的心情</h1>
      </div>
    </header>

    <main class="mood-timeline__content">
      <p v-if="loading" class="mood-timeline__loading">正在翻到这一天…</p>
      <p v-else-if="error" class="mood-timeline__error" role="alert">{{ error }}</p>
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
              <strong>{{ getMoodLabel(record.mood) }}</strong>
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

    <button type="button" class="mood-timeline__makeup" @click="makeUp">＋ 补记这一天</button>
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
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(88px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  color: var(--ink);
  background: linear-gradient(165deg, var(--fellow-blue, #58c8f5) 0 17%, #c8f6e8 17% 44%, #fff2a9 44% 100%);
}
.mood-timeline__header { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; min-height: 58px; text-align: center; }
.mood-timeline__header > div { grid-column: 2; }
.mood-timeline__header span { color: #8e2848; font-size: 8px; font-weight: 950; letter-spacing: .14em; }
.mood-timeline__header h1 { margin: 2px 0 0; font-size: 20px; font-weight: 950; letter-spacing: -.04em; }
.mood-timeline__back { grid-column: 1; grid-row: 1; display: grid; width: 44px; height: 44px; place-items: center; padding: 0 0 3px; border: 3px solid var(--ink); border-radius: 10px; color: var(--ink); background: #fff; box-shadow: 3px 3px 0 var(--ink); font: 900 30px/1 system-ui; cursor: pointer; }
.mood-timeline__content { min-height: 390px; margin-top: 16px; padding: 14px 12px; border: 3px solid var(--ink); border-radius: 16px; background: var(--fellow-paper, #fffaf5); box-shadow: 5px 6px 0 var(--ink); }
.mood-timeline__dialog { display: grid; gap: 15px; margin: 0; padding: 0; list-style: none; }
.mood-timeline__dialog li { display: flex; align-items: flex-end; gap: 8px; }
.mood-timeline__dialog li.is-mine { flex-direction: row-reverse; }
.mood-timeline__sprite { width: 46px; height: 46px; flex: 0 0 46px; }
.mood-timeline__stack { display: flex; flex: 0 1 79%; flex-direction: column; min-width: 0; }
.mood-timeline__sender { display: flex; align-items: center; gap: 6px; margin: 0 3px 4px; color: #686772; font-size: 9px; }
.mood-timeline__sender strong { color: var(--ink); font-size: 11px; font-weight: 950; }
.mood-timeline__dialog li.is-mine .mood-timeline__sender { justify-content: flex-end; }
.mood-timeline__bubble { padding: 10px 11px; border: 2.5px solid var(--ink); border-radius: 5px 13px 13px 13px; background: #fff; box-shadow: 3px 3px 0 var(--ink); }
.mood-timeline__dialog li.is-mine .mood-timeline__bubble { border-radius: 13px 5px 13px 13px; background: color-mix(in srgb, var(--fellow-yellow, #ffd94a) 72%, white); }
.mood-timeline__bubble strong { font-size: 14px; font-weight: 950; }
.mood-timeline__bubble p { margin: 4px 0 0; font-size: 13px; font-weight: 700; line-height: 1.48; overflow-wrap: anywhere; }
.mood-timeline__bubble p.is-quiet { color: #85818a; font-size: 11px; }
.mood-timeline__loading,
.mood-timeline__error { display: grid; min-height: 330px; place-items: center; margin: 0; color: #686772; font-size: 12px; font-weight: 850; text-align: center; }
.mood-timeline__error { color: #7c2630; }
.mood-timeline__empty { display: grid; min-height: 330px; place-items: center; place-content: center; gap: 7px; text-align: center; }
.mood-timeline__empty > span { position: relative; width: 74px; height: 46px; }
.mood-timeline__empty i,
.mood-timeline__empty b { position: absolute; top: 2px; width: 40px; height: 40px; border: 3px solid var(--ink); border-radius: 50%; }
.mood-timeline__empty i { left: 2px; background: var(--fellow-blue, #58c8f5); }
.mood-timeline__empty b { right: 2px; background: var(--fellow-pink, #ff7fa5); }
.mood-timeline__empty strong { font-size: 15px; font-weight: 950; }
.mood-timeline__empty p { max-width: 250px; margin: 0; color: #686772; font-size: 11px; line-height: 1.5; }
.mood-timeline__makeup { position: fixed; right: max(16px, calc((100vw - 460px) / 2 + 16px)); bottom: max(16px, env(safe-area-inset-bottom, 0px)); min-height: 50px; padding: 0 16px; border: 3px solid var(--ink); border-radius: 10px; color: var(--ink); background: var(--fellow-pink, #ff7fa5); box-shadow: 4px 5px 0 var(--ink); font: inherit; font-size: 12px; font-weight: 950; cursor: pointer; }
@media (max-width: 340px) {
  .mood-timeline { padding-right: 12px; padding-left: 12px; }
  .mood-timeline__content { padding-right: 9px; padding-left: 9px; }
  .mood-timeline__stack { flex-basis: 77%; }
}
</style>
