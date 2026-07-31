<template>
  <section class="mood-timeline">
    <header class="mood-timeline__header">
      <button type="button" class="mood-timeline__back" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ displayDate }}的心情</h1>
    </header>
    <div class="mood-timeline__tabs" role="tablist" aria-label="心情成员筛选">
      <button type="button" :class="{ active: tab === 'mine' }" role="tab" :aria-selected="tab === 'mine'" @click="tab = 'mine'">我</button>
      <button type="button" :class="{ active: tab === 'partner' }" role="tab" :aria-selected="tab === 'partner'" @click="tab = 'partner'">{{ partnerPronoun }}</button>
      <button type="button" :class="{ active: tab === 'all' }" role="tab" :aria-selected="tab === 'all'" @click="tab = 'all'">一起</button>
    </div>
    <main class="mood-timeline__content">
      <div v-if="loading" class="mood-timeline__loading">正在读取这一天的心情…</div>
      <p v-else-if="error" class="mood-timeline__error" role="alert">{{ error }}</p>
      <p v-else-if="!filteredRecords.length" class="mood-timeline__empty">这一天还没有心情记录。</p>
      <ol v-else class="mood-timeline__list">
        <li v-for="record in filteredRecords" :key="record.id" :class="{ 'is-mine': isMine(record) }">
          <span class="mood-timeline__dot" aria-hidden="true"></span>
          <MoodCharacter class="mood-timeline__sprite" :mood="record.mood" size="timeline" />
          <div class="mood-timeline__detail">
            <time>{{ formatTime(record) }}</time>
            <strong>{{ isMine(record) ? '我' : partnerPronoun }} · {{ getMoodLabel(record.mood) }}</strong>
            <p v-if="record.note">{{ record.note }}</p>
          </div>
        </li>
      </ol>
    </main>
    <button class="mood-timeline__makeup" type="button" @click="makeUp">＋ 补记心情</button>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { getMoodLabel } from '../utils/mood-catalog.js'
import { getPartnerPronoun } from '../utils/partner-pronoun.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import MoodCharacter from '../components/MoodCharacter.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { onMessage } = useWebSocket()
const date = typeof route.params.date === 'string' ? route.params.date : ''
const tab = ref('all')
const records = ref([])
const loading = ref(true)
const error = ref('')
let unsubscribe = null
const userId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const partnerFromRecords = computed(() => records.value
  .map(record => record.user)
  .find(candidate => candidate && String(candidate.id || candidate._id || '') !== userId.value))
const partnerPronoun = computed(() => getPartnerPronoun((userStore.currentPartner || userStore.partner || userStore.currentUser?.partner || partnerFromRecords.value)?.gender))
const displayDate = computed(() => {
  const [year, month, day] = date.split('-')
  return year && month && day ? `${Number(month)}月${Number(day)}日` : '这一天'
})
function isMine(record) { return String(record.user?.id || record.userId || '') === userId.value }
function timestamp(record) { return new Date(record.recordedAt || record.createdAt || 0).getTime() }
const filteredRecords = computed(() => records.value.filter(record => tab.value === 'all' || (tab.value === 'mine' ? isMine(record) : !isMine(record))).slice().sort((a, b) => timestamp(a) - timestamp(b)))
function formatTime(record) { return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(record.recordedAt || record.createdAt)) }
async function loadRecords() { loading.value = true; error.value = ''; try { const response = await fetch(`${CONFIG.API_URL}/mood?date=${date}&limit=200`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } }); const body = await response.json(); if (!response.ok || !body.success) throw new Error(body.message || '心情数据加载失败'); records.value = Array.isArray(body.data) ? body.data : [] } catch (requestError) { error.value = requestError.message || '心情数据加载失败，请稍后重试。' } finally { loading.value = false } }
function goBack() { router.back() }
function makeUp() { router.push({ path: '/mood/select', query: { date } }) }
onMounted(() => { loadRecords(); unsubscribe = onMessage(message => { if (message.type === 'moodSync') loadRecords() }) })
onUnmounted(() => unsubscribe?.())
</script>

<style scoped>
.mood-timeline { --ink: var(--fellow-ink, #25242d); min-height: 100dvh; width: min(100%, 460px); margin: 0 auto; padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(82px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; color: var(--ink); background: var(--fellow-paper, #fffaf5); }.mood-timeline__header { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; min-height: 56px; text-align: center; }.mood-timeline__header h1 { grid-column: 2; margin: 0; font-size: 21px; font-weight: 950; letter-spacing: -.03em; }.mood-timeline__back { grid-column: 1; grid-row: 1; display: grid; width: 44px; height: 44px; place-items: center; padding: 0 0 3px; color: var(--ink); background: #fff; border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); font: 900 30px/1 system-ui; cursor: pointer; }.mood-timeline__tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 12px; padding: 5px; background: #fff; border: 3px solid var(--ink); border-radius: 12px; box-shadow: 3px 4px 0 var(--ink); }.mood-timeline__tabs button { min-height: 44px; color: var(--ink); background: transparent; border: 0; border-radius: 8px; font: inherit; font-size: 12px; font-weight: 950; cursor: pointer; }.mood-timeline__tabs button.active { background: var(--fellow-yellow, #fff1a8); box-shadow: inset 0 0 0 2px var(--ink); }.mood-timeline__content { min-height: 500px; margin-top: 16px; }.mood-timeline__list { display: grid; gap: 10px; margin: 0; padding: 0 0 8px; list-style: none; }.mood-timeline__list::before { display: none; }.mood-timeline__list li { position: relative; display: grid; grid-template-columns: 54px 1fr; gap: 10px; min-height: 76px; padding: 12px; background: #fff; border: 3px solid var(--ink); border-radius: 12px; box-shadow: 3px 4px 0 var(--ink); }.mood-timeline__dot { position: absolute; top: 8px; right: 8px; width: 10px; height: 10px; background: var(--fellow-blue, #69cfee); border: 2px solid var(--ink); transform: rotate(12deg); }.mood-timeline__list li.is-mine .mood-timeline__dot { background: var(--fellow-pink, #f77ea4); }.mood-timeline__sprite { grid-column: 1; width: 54px; height: 54px; }.mood-timeline__detail { display: grid; align-content: center; }.mood-timeline__detail time { color: #506b9a; font-size: 11px; font-weight: 900; }.mood-timeline__list li.is-mine time { color: #a9435e; }.mood-timeline__detail strong { margin-top: 2px; font-size: 13px; font-weight: 950; }.mood-timeline__detail p { margin: 4px 0 0; color: #686772; font-size: 12px; line-height: 1.45; }.mood-timeline__empty, .mood-timeline__loading, .mood-timeline__error { padding: 42px 18px; color: #686772; background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 3px 4px 0 var(--ink); font-size: 13px; font-weight: 800; text-align: center; }.mood-timeline__error { color: #7c2630; background: #ffe2e8; }.mood-timeline__makeup { position: fixed; right: max(16px, calc((100vw - 460px) / 2 + 16px)); bottom: max(18px, env(safe-area-inset-bottom, 0px)); min-height: 50px; padding: 0 16px; color: var(--ink); background: var(--fellow-yellow, #fff1a8); border: 3px solid var(--ink); border-radius: 10px; box-shadow: 4px 5px 0 var(--ink); font: inherit; font-size: 13px; font-weight: 950; cursor: pointer; }
@media (max-width: 340px) { .mood-timeline { padding-right: 12px; padding-left: 12px; } }
</style>
