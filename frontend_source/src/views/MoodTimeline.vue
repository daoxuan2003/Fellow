<template>
  <section class="mood-timeline">
    <header class="mood-timeline__header">
      <button type="button" class="mood-timeline__back" aria-label="返回" @click="goBack">‹</button>
      <h1>{{ displayDate }}的心情</h1>
    </header>
    <div class="mood-timeline__tabs" role="tablist" aria-label="心情成员筛选">
      <button type="button" :class="{ active: tab === 'mine' }" role="tab" :aria-selected="tab === 'mine'" @click="tab = 'mine'">我</button>
      <button type="button" :class="{ active: tab === 'partner' }" role="tab" :aria-selected="tab === 'partner'" @click="tab = 'partner'">TA</button>
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
            <strong>{{ isMine(record) ? '我' : 'TA' }} · {{ getMoodLabel(record.mood) }}</strong>
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
.mood-timeline { --ink: #121820; min-height: 100dvh; width: min(100%, 430px); margin: 0 auto; padding: max(12px, env(safe-area-inset-top)) 20px max(28px, env(safe-area-inset-bottom)); box-sizing: border-box; background: #fbfcff; color: var(--ink); }.mood-timeline__header { display: grid; grid-template-columns: 34px 1fr 34px; align-items: center; text-align: center; }.mood-timeline__header h1 { grid-column: 2; margin: 0; font-size: 16px; font-weight: 750; }.mood-timeline__back { grid-column: 1; grid-row: 1; width: 34px; height: 34px; margin-top: -4px; padding: 0; border: 0; background: transparent; color: #1d2530; font-size: 32px; font-weight: 300; line-height: 27px; cursor: pointer; }.mood-timeline__tabs { display: grid; grid-template-columns: repeat(3, 1fr); height: 31px; margin-top: 17px; border: 1px solid #e2e7ee; border-radius: 9px; overflow: hidden; }.mood-timeline__tabs button { border: 0; border-left: 1px solid #e2e7ee; background: #fff; color: #202936; font: inherit; font-size: 12px; font-weight: 650; cursor: pointer; }.mood-timeline__tabs button:first-child { border-left: 0; }.mood-timeline__tabs button.active { background: #101820; color: #fff; }.mood-timeline__content { min-height: 500px; margin-top: 17px; }.mood-timeline__list { position: relative; margin: 0; padding: 0 0 8px; list-style: none; }.mood-timeline__list::before { position: absolute; top: 6px; bottom: 7px; left: 6px; width: 1px; background: linear-gradient(#ff6e60, #78a3ff); content: ''; }.mood-timeline__list li { position: relative; display: grid; grid-template-columns: 21px 57px 1fr; gap: 6px; min-height: 83px; }.mood-timeline__dot { position: relative; z-index: 1; width: 9px; height: 9px; margin: 3px 0 0 2px; border: 2px solid #fff; border-radius: 50%; background: #5b91ff; box-sizing: content-box; }.mood-timeline__list li.is-mine .mood-timeline__dot { background: #ff665b; }.mood-timeline__sprite { width: 53px; height: 62px; margin-top: -8px; }.mood-timeline__detail { display: grid; align-content: start; padding-bottom: 12px; }.mood-timeline__detail time { color: #3e83ff; font-size: 12px; font-weight: 700; }.mood-timeline__list li.is-mine time { color: #ff5f4b; }.mood-timeline__detail strong { margin-top: 3px; font-size: 13px; font-weight: 700; }.mood-timeline__detail p { margin: 4px 0 0; color: #798496; font-size: 12px; line-height: 1.45; }.mood-timeline__empty, .mood-timeline__loading, .mood-timeline__error { padding: 46px 0; color: #8190a1; font-size: 13px; text-align: center; }.mood-timeline__error { color: #bd3f3f; }.mood-timeline__makeup { position: fixed; right: max(20px, calc((100vw - 430px) / 2 + 20px)); bottom: max(24px, env(safe-area-inset-bottom)); height: 38px; padding: 0 18px; border: 0; border-radius: 999px; background: #101820; color: #fff; font: inherit; font-size: 13px; font-weight: 650; cursor: pointer; }
</style>
