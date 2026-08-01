<template>
  <section class="mood-home">
    <main class="mood-home__scroll">
      <FeatureHeader title="心情日记" eyebrow="MOOD DIARY" chapter="01" kind="mood" />

      <section v-if="loading" class="mood-home__skeleton" aria-label="正在加载心情" aria-live="polite">
        <div class="mood-skeleton__line mood-skeleton__line--partner" aria-hidden="true"><i></i><span></span></div>
        <div class="mood-skeleton__line mood-skeleton__line--mine" aria-hidden="true"><span></span><i></i></div>
        <div class="mood-skeleton__composer" aria-hidden="true"></div>
      </section>

      <template v-else>
        <section class="mood-preview" aria-labelledby="mood-preview-title">
          <header class="mood-preview__heading">
            <div>
              <h2 id="mood-preview-title">最近一段对话</h2>
              <p>{{ latestConversationDateLabel }}</p>
            </div>
            <button
              v-if="latestConversationDate"
              type="button"
              aria-label="打开完整心情对话"
              @click="openTimeline(latestConversationDate)"
            >打开对话 <span aria-hidden="true">→</span></button>
          </header>

          <ol v-if="latestConversationPreview.length" class="mood-preview__dialog" aria-label="最近心情对话预览">
            <li
              v-for="entry in latestConversationPreview"
              :key="entry.id"
              class="mood-preview__item"
              :class="{ 'is-mine': entry.isMine }"
            >
              <MoodCharacter class="mood-preview__character" :mood="entry.mood" size="medium" />
              <div class="mood-preview__stack">
                <span class="mood-preview__sender">
                  <strong>{{ entry.isMine ? myName : partnerName }}</strong>
                  <time>{{ formatTime(entry) }}</time>
                </span>
                <article class="mood-preview__bubble">
                  <span>{{ getMoodLabel(entry.mood) }}</span>
                  <p v-if="entry.note">{{ entry.note }}</p>
                  <p v-else class="is-quiet">只留下了此刻的心情</p>
                </article>
                <p v-if="latestReply(entry)" class="mood-preview__reply">
                  <strong>{{ latestReply(entry).isMine ? myName : partnerName }}</strong>
                  <span v-if="latestReply(entry).kind">{{ responseLabel(latestReply(entry).kind) }}</span>
                  {{ latestReply(entry).message }}
                </p>
              </div>
            </li>
          </ol>

          <div v-else class="mood-preview__empty">
            <span class="mood-preview__pair" aria-hidden="true"><i></i><b></b></span>
            <strong>还没有心情对话</strong>
            <p>从一句真实的感受开始，之后的回应都会留在这里。</p>
          </div>

          <button class="mood-primary" type="button" @click="startRecording(today)">
            <span aria-hidden="true">＋</span>
            说说我现在的心情
          </button>
        </section>

        <section class="mood-calendar" aria-labelledby="mood-calendar-title">
          <div class="mood-calendar__title-row">
            <div>
              <span>HISTORY</span>
              <button class="mood-month-picker" type="button" aria-label="切换月份" @click="toggleMonth">
                <h2 id="mood-calendar-title">{{ monthLabel }}</h2>
                <span aria-hidden="true">⌄</span>
              </button>
            </div>
            <div v-if="showMonthControls" class="mood-month-controls">
              <button type="button" aria-label="上一个月" @click="changeMonth(-1)">‹</button>
              <button type="button" aria-label="下一个月" @click="changeMonth(1)">›</button>
            </div>
          </div>
          <p class="mood-calendar__hint">点开某一天，继续看那天的完整对话。</p>
          <div class="mood-calendar__weekdays" aria-hidden="true">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="mood-calendar__days">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="mood-calendar-day"
              :class="{ 'is-outside': !day.inMonth, 'is-selected': day.key === today, 'has-dialog': day.records.length }"
              :aria-label="`${day.month}月${day.day}日${day.records.length ? `，${day.records.length} 条心情` : '，没有心情'}`"
              @click="openTimeline(day.key)"
            >
              <span>{{ day.day }}</span>
              <div v-if="day.records.length" class="mood-calendar-day__sprites">
                <MoodCharacter
                  v-for="record in day.records.slice(0, 2)"
                  :key="record.id"
                  :mood="record.mood"
                  size="calendar"
                />
                <em v-if="day.records.length > 2">+{{ day.records.length - 2 }}</em>
              </div>
            </button>
          </div>

          <div class="mood-month-summary">
            <strong>这个月一起说了 {{ pairedDays }} 天</strong>
            <div v-if="monthHighlights.length" class="mood-month-summary__highlights">
              <article v-for="entry in monthHighlights" :key="entry.mood">
                <MoodCharacter :mood="entry.mood" size="summary" />
                <span>{{ getMoodLabel(entry.mood) }}</span>
                <small>{{ entry.count }} 次</small>
              </article>
            </div>
            <p v-else>这个月还没有共同留下心情。</p>
          </div>
        </section>
      </template>

      <p v-if="error" class="mood-load-error" role="alert">
        {{ error }}<button type="button" @click="loadRecords">重试</button>
      </p>
    </main>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import { getMoodLabel } from '../utils/mood-catalog.js'
import { getPartnerPronoun } from '../utils/partner-pronoun.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import MoodCharacter from '../components/MoodCharacter.vue'
import FeatureHeader from '../components/FeatureHeader.vue'

const router = useRouter()
const userStore = useUserStore()
const { onMessage } = useWebSocket()
const loading = ref(true)
const error = ref('')
const records = ref([])
const latestRecords = ref([])
const currentMonth = ref(new Date())
const showMonthControls = ref(false)
let unsubscribe = null

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const userId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const currentUser = computed(() => userStore.currentUser || userStore.user || {})
const partnerFromRecords = computed(() => [...records.value, ...latestRecords.value]
  .map(record => record.user)
  .find(candidate => candidate && String(candidate.id || candidate._id || '') !== userId.value) || {})
const partner = computed(() => {
  const storedPartner = userStore.currentPartner || userStore.partner || userStore.currentUser?.partner
  return storedPartner?.id || storedPartner?._id ? storedPartner : partnerFromRecords.value
})
const partnerId = computed(() => String(partner.value?.id || partner.value?._id || ''))
const partnerPronoun = computed(() => getPartnerPronoun(partner.value?.gender))
const myName = computed(() => currentUser.value?.nickname || '我')
const partnerName = computed(() => partner.value?.nickname || partnerPronoun.value)

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = dateKey()

function recordTimestamp(record) {
  return new Date(record.recordedAt || record.respondedAt || record.createdAt || 0).getTime()
}

const responseKinds = {
  hug: '抱抱你',
  stay: '陪着你',
  listen: '听你说',
  cheer: '为你加油'
}
const latestConversationDate = computed(() => latestRecords.value[0]?.recordDate || '')
const latestConversationDateLabel = computed(() => {
  if (!latestConversationDate.value) return '等你们留下第一句话'
  if (latestConversationDate.value === today) return '今天'
  const [year, month, day] = latestConversationDate.value.split('-').map(Number)
  const currentYear = new Date().getFullYear()
  return year === currentYear ? `${month}月${day}日` : `${year}年${month}月${day}日`
})
const latestConversationPreview = computed(() => latestRecords.value
  .filter(record => record.recordDate === latestConversationDate.value)
  .slice()
  .sort((a, b) => recordTimestamp(a) - recordTimestamp(b))
  .slice(-2)
  .map(record => ({ ...record, isMine: String(record.user?.id || record.userId || '') === userId.value })))
const monthLabel = computed(() => `${currentMonth.value.getFullYear()}年${currentMonth.value.getMonth() + 1}月`)

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - firstDay + 1)
    const key = dateKey(date)
    const dayRecords = records.value
      .filter(record => record.recordDate === key)
      .slice()
      .sort((a, b) => recordTimestamp(a) - recordTimestamp(b))
    return { key, day: date.getDate(), month: date.getMonth() + 1, inMonth: date.getMonth() === month, records: dayRecords }
  })
})

const pairedDays = computed(() => {
  const prefix = `${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`
  const matching = records.value.filter(record => record.recordDate?.startsWith(prefix))
  return new Set(matching.map(record => record.recordDate).filter(day => {
    const members = matching.filter(record => record.recordDate === day).map(record => String(record.user?.id || record.userId || ''))
    return members.includes(userId.value) && members.includes(partnerId.value)
  })).size
})

const monthHighlights = computed(() => {
  const prefix = `${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`
  const countByMood = records.value
    .filter(record => record.recordDate?.startsWith(prefix))
    .reduce((result, record) => ({ ...result, [record.mood]: (result[record.mood] || 0) + 1 }), {})
  return Object.entries(countByMood)
    .map(([mood, count]) => ({ mood, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
})

function formatTime(record) {
  const value = record?.recordedAt || record?.respondedAt || record?.createdAt
  if (!value) return '刚刚'
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

function responseLabel(kind) { return responseKinds[kind] || '回应了' }
function latestReply(record) {
  const comments = Array.isArray(record?.comments) ? record.comments : []
  const latestComment = comments.slice().sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)).at(-1)
  const reply = latestComment || (record?.partnerResponse ? {
    ...record.partnerResponse,
    commenterId: record.partnerResponse.responderId,
    createdAt: record.partnerResponse.respondedAt
  } : null)
  if (!reply) return null
  return {
    ...reply,
    isMine: String(reply.commenterId || '') === userId.value,
    message: String(reply.message || '').trim()
  }
}

async function loadRecords({ silent = false } = {}) {
  if (!silent) loading.value = true
  error.value = ''
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const startDate = dateKey(new Date(year, month, 1))
  const endDate = dateKey(new Date(year, month + 1, 0))
  try {
    const headers = { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    const [monthResponse, latestResponse] = await Promise.all([
      fetch(`${CONFIG.API_URL}/mood?startDate=${startDate}&endDate=${endDate}&limit=500`, { headers }),
      fetch(`${CONFIG.API_URL}/mood?limit=20`, { headers })
    ])
    const [monthBody, latestBody] = await Promise.all([monthResponse.json(), latestResponse.json()])
    if (!monthResponse.ok || !monthBody.success) throw new Error(monthBody.message || '心情数据加载失败')
    if (!latestResponse.ok || !latestBody.success) throw new Error(latestBody.message || '最近对话加载失败')
    records.value = Array.isArray(monthBody.data) ? monthBody.data : []
    latestRecords.value = Array.isArray(latestBody.data) ? latestBody.data : []
  } catch (requestError) {
    error.value = requestError.message || '心情数据加载失败，请稍后重试。'
  } finally {
    if (!silent) loading.value = false
  }
}

function startRecording(date) { router.push({ path: '/mood/select', query: { date } }) }
function openTimeline(date) { router.push(`/mood/day/${date}`) }
function changeMonth(offset) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  loadRecords()
}
function toggleMonth() { showMonthControls.value = !showMonthControls.value }

onMounted(() => {
  loadRecords()
  unsubscribe = onMessage(message => {
    if (message.type === 'moodSync') loadRecords({ silent: true })
  })
})
onUnmounted(() => unsubscribe?.())
</script>

<style scoped>
.mood-home {
  --ink: var(--fellow-ink, #20202a);
  --muted: var(--fellow-text-secondary);
  min-height: 100dvh;
  color: var(--ink);
  background: linear-gradient(165deg, var(--fellow-blue, #58c8f5) 0 19%, #c8f6e8 19% 43%, #fff2a9 43% 100%);
}
.mood-home__scroll { width: min(100%, 430px); min-height: 100dvh; margin: 0 auto; padding: max(18px, env(safe-area-inset-top, 0px)) 16px calc(var(--bottom-nav-height, 81px) + 22px); box-sizing: border-box; }
.mood-preview { margin-top: 14px; padding: 15px 13px 14px; border: 3px solid var(--ink); border-radius: var(--fellow-radius-sheet); background: var(--fellow-paper); box-shadow: var(--fellow-shadow-raised); }
.mood-preview__heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 2px 11px; border-bottom: 2px solid var(--ink); }
.mood-preview__heading h2,
.mood-calendar h2 { margin: 3px 0 0; font-size: 20px; font-weight: 950; line-height: 1.2; letter-spacing: -.05em; }
.mood-preview__heading p { margin: 3px 0 0; color: var(--muted); font-size: 10px; font-weight: 800; }
.mood-preview__heading button { min-height: 44px; padding: 0 3px; border: 0; color: var(--ink); background: transparent; font: inherit; font-size: 11px; font-weight: 950; cursor: pointer; }
.mood-preview__heading button span { margin-left: 3px; font-size: 15px; }
.mood-preview__dialog { display: grid; gap: 13px; margin: 0; padding: 15px 0 2px; list-style: none; }
.mood-preview__item { display: flex; align-items: flex-end; gap: 8px; }
.mood-preview__item.is-mine { flex-direction: row-reverse; }
.mood-preview__character { width: 44px; height: 44px; flex: 0 0 44px; }
.mood-preview__stack { display: flex; flex: 0 1 78%; flex-direction: column; min-width: 0; }
.mood-preview__sender { display: flex; align-items: center; gap: 6px; margin: 0 3px 4px; color: var(--muted); font-size: 9px; }
.mood-preview__sender strong { color: var(--ink); font-size: 11px; font-weight: 950; }
.mood-preview__item.is-mine .mood-preview__sender { justify-content: flex-end; }
.mood-preview__bubble { padding: 9px 11px; border: 2.5px solid var(--ink); border-radius: 5px 13px 13px; background: var(--fellow-white); box-shadow: 3px 3px 0 var(--ink); }
.mood-preview__item.is-mine .mood-preview__bubble { border-radius: 13px 5px 13px 13px; background: color-mix(in srgb, var(--fellow-yellow) 72%, var(--fellow-white)); }
.mood-preview__bubble > span { font-size: 13px; font-weight: 950; }
.mood-preview__bubble p { display: -webkit-box; overflow: hidden; margin: 3px 0 0; font-size: 12px; font-weight: 700; line-height: 1.45; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.mood-preview__bubble p.is-quiet { color: var(--fellow-text-secondary); font-size: 10px; }
.mood-preview__reply { align-self: flex-start; max-width: 94%; margin: 7px 2px 0; color: var(--fellow-text-secondary); font-size: 10px; font-weight: 700; line-height: 1.4; overflow-wrap: anywhere; }
.mood-preview__item.is-mine .mood-preview__reply { align-self: flex-end; text-align: right; }
.mood-preview__reply strong { color: var(--ink); }
.mood-preview__reply span { display: inline-block; margin: 0 3px; padding: 1px 5px; border-radius: var(--fellow-radius-pill); background: color-mix(in srgb, var(--fellow-mint) 48%, var(--fellow-white)); color: var(--ink); font-size: 9px; font-weight: 900; }
.mood-preview__empty { display: grid; min-height: 154px; place-items: center; place-content: center; gap: 6px; text-align: center; }
.mood-preview__pair { position: relative; width: 74px; height: 46px; }
.mood-preview__pair i,
.mood-preview__pair b { position: absolute; top: 2px; width: 40px; height: 40px; border: 3px solid var(--ink); border-radius: 50%; }
.mood-preview__pair i { left: 2px; background: var(--fellow-blue); }
.mood-preview__pair b { right: 2px; background: var(--fellow-pink); }
.mood-preview__empty strong { font-size: 15px; font-weight: 950; }
.mood-preview__empty p { max-width: 260px; margin: 0; color: var(--muted); font-size: 11px; font-weight: 700; line-height: 1.5; }
.mood-primary { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; min-height: 48px; margin-top: 12px; border: 3px solid var(--ink); border-radius: 10px; color: var(--ink); background: var(--fellow-pink, #ff7fa5); box-shadow: 3px 4px 0 var(--ink); font: inherit; font-size: 13px; font-weight: 950; cursor: pointer; }
.mood-primary span { font-size: 19px; line-height: 1; }
.mood-primary:active { box-shadow: 1px 1px 0 var(--ink); transform: translate(2px, 3px); }
.mood-calendar { margin-top: 18px; padding: 15px 12px 13px; border: 3px solid var(--ink); border-radius: 16px; background: var(--fellow-paper, #fffaf5); box-shadow: 5px 6px 0 var(--ink); }
.mood-calendar__title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.mood-month-picker { display: flex; align-items: center; gap: 5px; min-height: 44px; padding: 0; border: 0; color: inherit; background: transparent; font: inherit; cursor: pointer; }
.mood-month-picker > span { margin-top: -2px; font-size: 16px; }
.mood-month-controls { display: flex; gap: 7px; padding-bottom: 5px; }
.mood-month-controls button { width: 44px; height: 44px; border: 2px solid var(--ink); border-radius: 8px; color: var(--ink); background: #fff; box-shadow: 2px 2px 0 var(--ink); font-size: 18px; cursor: pointer; }
.mood-calendar__hint { margin: -2px 0 10px; color: var(--muted); font-size: 10px; font-weight: 750; }
.mood-calendar__weekdays,
.mood-calendar__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.mood-calendar__weekdays { color: #77737d; font-size: 10px; font-weight: 850; text-align: center; }
.mood-calendar__days { margin-top: 4px; gap: 3px 1px; }
.mood-calendar-day { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-width: 0; min-height: 48px; padding: 3px 0 0; border: 2px solid transparent; border-radius: 10px; color: var(--ink); background: transparent; font: inherit; font-size: 10px; cursor: pointer; }
.mood-calendar-day.has-dialog { background: #fff; }
.mood-calendar-day.is-outside { color: #aaa7af; opacity: .55; }
.mood-calendar-day.is-selected { border-color: var(--ink); background: color-mix(in srgb, var(--fellow-yellow, #ffd94a) 55%, white); }
.mood-calendar-day__sprites { display: flex; align-items: center; justify-content: center; min-height: 27px; margin-top: -1px; }
.mood-calendar-day__sprites :deep(.mood-character) { width: 20px; height: 25px; margin-left: -4px; }
.mood-calendar-day__sprites :deep(.mood-character:first-child) { margin-left: 0; }
.mood-calendar-day__sprites em { color: #45424b; font-size: 8px; font-style: normal; font-weight: 900; }
.mood-month-summary { margin-top: 12px; padding-top: 11px; border-top: 2px solid var(--ink); }
.mood-month-summary > strong { font-size: 11px; font-weight: 950; }
.mood-month-summary > p { margin: 9px 0 0; color: var(--muted); font-size: 10px; }
.mood-month-summary__highlights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; margin-top: 8px; }
.mood-month-summary__highlights article { display: grid; justify-items: center; padding: 6px 2px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; }
.mood-month-summary__highlights :deep(.mood-character) { width: 48px; height: 48px; }
.mood-month-summary__highlights span { font-size: 10px; font-weight: 950; }
.mood-month-summary__highlights small { margin-top: 1px; color: var(--muted); font-size: 9px; }
.mood-home__skeleton { display: grid; gap: 15px; margin-top: 14px; padding: 18px 13px; border: 3px solid var(--ink); border-radius: 16px; background: var(--fellow-paper, #fffaf5); box-shadow: 5px 6px 0 var(--ink); }
.mood-skeleton__line { display: flex; align-items: flex-end; gap: 8px; }
.mood-skeleton__line--mine { justify-content: flex-end; }
.mood-skeleton__line i { width: 44px; height: 44px; flex: none; border: 2px solid var(--ink); border-radius: 50%; background: #d7f6e7; }
.mood-skeleton__line span { width: 67%; height: 68px; border: 2px solid var(--ink); border-radius: 6px 12px 12px 12px; background: linear-gradient(100deg, #ece8e2 25%, #fff 45%, #ece8e2 65%); background-size: 220% 100%; animation: mood-loading 1.35s infinite linear; }
.mood-skeleton__line--mine span { border-radius: 12px 6px 12px 12px; }
.mood-skeleton__composer { height: 96px; border: 2px solid var(--ink); border-radius: 12px; background: #dff7ff; }
.mood-load-error { margin: 15px 0 0; padding: 10px; border: 2px solid var(--ink); border-radius: 9px; color: #7c2630; background: #ffd8df; font-size: 11px; font-weight: 800; text-align: center; }
.mood-load-error button { min-height: 44px; margin-left: 8px; border: 0; color: inherit; background: transparent; font: inherit; font-weight: 950; text-decoration: underline; }
@keyframes mood-loading { to { background-position: -220% 0; } }
@media (max-width: 340px) {
  .mood-home__scroll { padding-right: 12px; padding-left: 12px; }
  .mood-preview { padding-right: 10px; padding-left: 10px; }
  .mood-preview__stack { flex-basis: 76%; }
  .mood-calendar { padding-right: 8px; padding-left: 8px; }
}
@media (prefers-reduced-motion: reduce) { .mood-skeleton__line span { animation: none; } }
</style>
