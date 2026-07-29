<template>
  <section class="mood-home">
    <main class="mood-home__scroll">
      <FeatureHeader title="心情日记" eyebrow="MOOD DIARY" chapter="01" kind="mood" />

      <section v-if="loading" class="mood-home__skeleton" aria-label="正在加载心情" aria-live="polite">
        <div class="mood-skeleton__people" aria-hidden="true">
          <span></span>
          <i></i>
          <span></span>
        </div>
        <div class="mood-skeleton__copy" aria-hidden="true"><span></span><span></span></div>
        <div class="mood-skeleton__action" aria-hidden="true"></div>
        <div class="mood-skeleton__calendar" aria-hidden="true">
          <span v-for="index in 7" :key="index"></span>
        </div>
      </section>
      <div v-else>
        <section class="mood-now" aria-labelledby="mood-now-title">
          <h2 id="mood-now-title">现在的我们</h2>
          <div v-if="hasTodayRecords" class="mood-now__people">
            <article v-if="myLatestMood" class="mood-person mood-person--mine">
              <div class="mood-person__sprite">
                <MoodCharacter :mood="myLatestMood.mood" size="hero" />
              </div>
              <strong>我 · {{ getMoodLabel(myLatestMood.mood) }}</strong>
              <span>{{ formatTime(myLatestMood) }}</span>
              <small>我今天记录 {{ myTodayRecords.length }} 次</small>
            </article>
            <article v-else class="mood-person mood-person--empty">
              <p>我今天还没有记录</p>
            </article>
            <svg v-if="myLatestMood && partnerLatestMood" class="mood-now__thread" viewBox="0 0 260 54" preserveAspectRatio="none" aria-hidden="true">
              <path d="M2 36 C40 36 51 14 88 27 C111 35 117 42 130 32" />
              <path d="M130 32 C145 22 156 36 177 31 C208 23 220 35 258 30" />
            </svg>
            <article v-if="partnerLatestMood" class="mood-person mood-person--partner">
              <div class="mood-person__sprite">
                <MoodCharacter :mood="partnerLatestMood.mood" size="hero" />
              </div>
              <strong>{{ partnerPronoun }} · {{ getMoodLabel(partnerLatestMood.mood) }}</strong>
              <span>{{ formatTime(partnerLatestMood) }}</span>
              <small>{{ partnerPronoun }}今天记录 {{ partnerTodayRecords.length }} 次</small>
            </article>
            <article v-else class="mood-person mood-person--empty">
              <p>{{ partnerPronoun }}今天还没有记录</p>
            </article>
          </div>
          <div v-else class="mood-now__empty">
            <strong>今天还没有心情记录</strong>
            <p>先留下一刻真实的感受吧。</p>
          </div>

          <div v-if="hasTodayRecords" class="mood-partner-status">
            <img v-if="partnerAvatar" :src="partnerAvatar" :alt="`${partnerPronoun}的头像`">
            <span v-else class="mood-partner-status__avatar" aria-hidden="true">{{ partnerPronoun }}</span>
            <strong>{{ partnerStatus }}</strong>
          </div>

          <form v-if="partnerLatestMood" class="mood-response" @submit.prevent="sendResponse">
            <div class="mood-response__heading">
              <strong>轻轻回应{{ partnerPronoun }}</strong>
              <span v-if="partnerLatestMood.partnerResponse">已送达，可重新选择</span>
            </div>
            <div class="mood-response__kinds" aria-label="回应方式">
              <button
                v-for="option in responseKinds"
                :key="option.kind"
                type="button"
                :class="{ active: responseKind === option.kind }"
                @click="responseKind = option.kind"
              >{{ option.label }}</button>
            </div>
            <label class="mood-response__message">
              <span>一条短留言</span>
              <input v-model="responseMessage" maxlength="60" placeholder="想对伴侣说的话" autocomplete="off">
            </label>
            <button class="mood-response__submit" type="submit" :disabled="responding || !responseKind">
              {{ responding ? '正在送达' : '送出回应' }}
            </button>
          </form>

          <button class="mood-primary" type="button" @click="startRecording(today)">
            记录现在的心情
          </button>
        </section>

        <section class="mood-changes" aria-labelledby="mood-changes-title">
          <h2 id="mood-changes-title">今天的心情变化</h2>
          <div v-if="todayChanges.length" class="mood-changes__rows">
            <article v-for="(entry, index) in todayChanges" :key="entry.id" class="mood-change-row">
              <strong :class="entry.isMine ? 'is-mine' : 'is-partner'">{{ entry.isMine ? '我' : partnerPronoun }}</strong>
              <MoodCharacter class="mood-change-row__sprite" :mood="entry.mood" size="mini" />
              <div class="mood-change-row__copy">
                <span>{{ getMoodLabel(entry.mood) }}</span>
                <p v-if="entry.note">{{ entry.note }}</p>
                <small v-if="entry.partnerResponse" class="mood-change-row__response">
                  {{ responseLabel(entry.partnerResponse.kind) }}<template v-if="entry.partnerResponse.message"> · {{ entry.partnerResponse.message }}</template>
                </small>
              </div>
              <time>{{ formatTime(entry) }}</time>
              <i v-if="index < todayChanges.length - 1" aria-hidden="true">→</i>
            </article>
          </div>
          <p v-else class="mood-empty">今天还没有记录，先留下此刻的感受吧。</p>
        </section>

        <section class="mood-calendar" aria-labelledby="mood-calendar-title">
          <div class="mood-calendar__title-row">
            <button class="mood-month-picker" type="button" aria-label="切换月份" @click="toggleMonth">
              <h2 id="mood-calendar-title">{{ monthLabel }}</h2>
              <span aria-hidden="true">⌄</span>
            </button>
            <div v-if="showMonthControls" class="mood-month-controls">
              <button type="button" aria-label="上一个月" @click="changeMonth(-1)">‹</button>
              <button type="button" aria-label="下一个月" @click="changeMonth(1)">›</button>
            </div>
          </div>
          <div class="mood-calendar__weekdays" aria-hidden="true">
            <span v-for="day in weekdays" :key="day">{{ day }}</span>
          </div>
          <div class="mood-calendar__days">
            <button
              v-for="day in calendarDays"
              :key="day.key"
              type="button"
              class="mood-calendar-day"
              :class="{ 'is-outside': !day.inMonth, 'is-selected': day.key === today }"
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
            <strong>本月共同记录 {{ pairedDays }} 天</strong>
            <div v-if="monthHighlights.length" class="mood-month-summary__highlights">
              <article v-for="entry in monthHighlights" :key="entry.mood">
                <MoodCharacter :mood="entry.mood" size="summary" />
                <span>{{ getMoodLabel(entry.mood) }}</span>
                <small>{{ entry.count }} 次</small>
              </article>
            </div>
            <p v-else>这个月还没有共同的心情痕迹。</p>
          </div>
        </section>
      </div>
      <p v-if="error" class="mood-load-error" role="alert">{{ error }}<button type="button" @click="loadRecords">重试</button></p>
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
const currentMonth = ref(new Date())
const showMonthControls = ref(false)
const responseKind = ref('stay')
const responseMessage = ref('')
const responding = ref(false)
let unsubscribe = null

const weekdays = ['日', '一', '二', '三', '四', '五', '六']
const responseKinds = [
  { kind: 'hug', label: '抱抱你' },
  { kind: 'stay', label: '陪着你' },
  { kind: 'listen', label: '听你说' },
  { kind: 'cheer', label: '为你加油' }
]
const userId = computed(() => String(resolveCurrentUserId(userStore) || ''))
const partnerFromRecords = computed(() => records.value
  .map(record => record.user)
  .find(candidate => candidate && String(candidate.id || candidate._id || '') !== userId.value) || {})
const partner = computed(() => {
  const storedPartner = userStore.currentPartner || userStore.partner || userStore.currentUser?.partner
  return storedPartner?.id || storedPartner?._id ? storedPartner : partnerFromRecords.value
})
const partnerId = computed(() => String(partner.value?.id || partner.value?._id || ''))
const partnerAvatar = computed(() => partner.value?.avatarUrl || partner.value?.avatar || '')
const partnerPronoun = computed(() => getPartnerPronoun(partner.value?.gender))

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const today = dateKey()

function recordTimestamp(record) {
  return new Date(record.recordedAt || record.createdAt || 0).getTime()
}

function newestRecord(list) { return list.slice().sort((a, b) => recordTimestamp(b) - recordTimestamp(a))[0] || null }

const todayRecords = computed(() => records.value.filter(record => record.recordDate === today))
const hasTodayRecords = computed(() => todayRecords.value.length > 0)
const myTodayRecords = computed(() => todayRecords.value.filter(record => String(record.user?.id || record.userId || '') === userId.value))
const partnerTodayRecords = computed(() => todayRecords.value.filter(record => String(record.user?.id || record.userId || '') === partnerId.value))
const myLatestMood = computed(() => newestRecord(myTodayRecords.value))
const partnerLatestMood = computed(() => newestRecord(partnerTodayRecords.value))
const todayChanges = computed(() => todayRecords.value
  .slice()
  .sort((a, b) => recordTimestamp(a) - recordTimestamp(b))
  .map(record => ({ ...record, isMine: String(record.user?.id || record.userId || '') === userId.value })))
const partnerStatus = computed(() => partnerTodayRecords.value.length
  ? `${partnerPronoun.value}现在很${getMoodLabel(partnerLatestMood.value.mood)}`
  : `${partnerPronoun.value}今天还没有记录`)
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
  const matching = records.value.filter(record => record.recordDate?.startsWith(`${currentMonth.value.getFullYear()}-${String(currentMonth.value.getMonth() + 1).padStart(2, '0')}`))
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
  const value = record?.recordedAt || record?.createdAt
  if (!value) return '尚未记录'
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}

function responseLabel(kind) {
  return responseKinds.find(option => option.kind === kind)?.label || '伴侣已回应'
}

async function sendResponse() {
  if (!partnerLatestMood.value || !responseKind.value || responding.value) return
  responding.value = true
  error.value = ''
  try {
    const response = await fetch(`${CONFIG.API_URL}/mood/${partnerLatestMood.value.id}/response`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ kind: responseKind.value, message: responseMessage.value.trim() })
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '回应发送失败')
    responseMessage.value = ''
    await loadRecords()
  } catch (requestError) {
    error.value = requestError.message || '回应发送失败，请稍后重试。'
  } finally {
    responding.value = false
  }
}

async function loadRecords() {
  loading.value = true
  error.value = ''
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  const startDate = dateKey(new Date(year, month, 1))
  const endDate = dateKey(new Date(year, month + 1, 0))
  try {
    const response = await fetch(`${CONFIG.API_URL}/mood?startDate=${startDate}&endDate=${endDate}&limit=500`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '心情数据加载失败')
    records.value = Array.isArray(body.data) ? body.data : []
  } catch (requestError) {
    error.value = requestError.message || '心情数据加载失败，请稍后重试。'
  } finally {
    loading.value = false
  }
}

function startRecording(date) { router.push({ path: '/mood/select', query: { date } }) }

function openTimeline(date) { router.push(`/mood/day/${date}`) }

function changeMonth(offset) {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + offset, 1)
  loadRecords()
}

function toggleMonth() {
  showMonthControls.value = !showMonthControls.value
}

onMounted(() => {
  loadRecords()
  unsubscribe = onMessage(message => {
    if (message.type === 'moodSync') loadRecords()
  })
})

onUnmounted(() => unsubscribe?.())
</script>

<style scoped>
.mood-home {
  --ink: #121820;
  --muted: #7e8796;
  --line: #e6ebf1;
  min-height: 100vh;
  background: #fbfcff;
  color: var(--ink);
}

.mood-home__scroll {
  width: min(100%, 430px);
  min-height: 100vh;
  margin: 0 auto;
  padding: max(24px, env(safe-area-inset-top)) 20px calc(var(--bottom-nav-height, 81px) + 24px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.mood-home__header { text-align: center; padding: 5px 0 19px; }
.mood-home__header h1, h2, p { margin: 0; }
.mood-home__header h1 { font-size: 16px; font-weight: 750; letter-spacing: .02em; }
.mood-now h2, .mood-changes h2, .mood-calendar h2 { font-size: 20px; font-weight: 750; line-height: 1.25; }

.mood-now__people { position: relative; display: grid; grid-template-columns: 1fr 1fr; margin-top: 8px; min-height: 204px; }
.mood-person { z-index: 1; display: flex; flex-direction: column; align-items: center; padding-top: 4px; text-align: center; }
.mood-person__sprite { width: 120px; height: 132px; }
.mood-person strong { margin-top: 0; font-size: 13px; font-weight: 720; }
.mood-person span, .mood-person small { color: var(--muted); font-size: 11px; line-height: 1.45; }
.mood-person small { margin-top: 4px; }
.mood-person--empty { justify-content: center; padding: 0 16px; }
.mood-person--empty p { color: #7f8999; font-size: 13px; line-height: 1.55; }
.mood-now__thread { position: absolute; z-index: 0; top: 84px; left: calc(50% - 130px); width: 260px; height: 54px; overflow: visible; pointer-events: none; }
.mood-now__thread path { fill: none; stroke-width: 1.7; stroke-linecap: round; }
.mood-now__thread path:first-child { stroke: #ff5e62; }
.mood-now__thread path:last-child { stroke: #5f96ff; }
.mood-now__empty { display: grid; min-height: 112px; place-content: center; gap: 5px; margin-top: 10px; border: 1px solid #e4e9f0; border-radius: 12px; background: #fff; color: #202936; text-align: center; }
.mood-now__empty strong { font-size: 15px; font-weight: 700; }
.mood-now__empty p { color: #758195; font-size: 13px; }

.mood-partner-status { display: flex; align-items: center; gap: 10px; height: 54px; padding: 0 13px; border: 1px solid var(--line); border-radius: 10px; background: #fff; box-sizing: border-box; }
.mood-partner-status img, .mood-partner-status__avatar { width: 34px; height: 34px; border: 1px solid #fff; border-radius: 50%; object-fit: cover; box-shadow: 0 2px 5px rgba(31, 44, 63, .13); }
.mood-partner-status__avatar { display: grid; place-items: center; background: #e5ecf6; color: #65748c; font-size: 10px; font-weight: 700; }
.mood-partner-status strong { font-size: 13px; font-weight: 650; }

.mood-response { display: grid; gap: 10px; margin-top: 12px; padding: 13px; background: #fffaf5; border: 3px solid #20202a; border-radius: 12px; box-shadow: 3px 4px 0 #20202a; }
.mood-response__heading { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.mood-response__heading strong { font-size: 15px; font-weight: 900; }
.mood-response__heading span { color: #55545e; font-size: 10px; }
.mood-response__kinds { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
.mood-response__kinds button { min-height: 44px; padding: 5px 3px; color: #20202a; background: #fff; border: 2px solid #20202a; border-radius: 8px; font: inherit; font-size: 11px; font-weight: 850; }
.mood-response__kinds button.active { background: #ffd94a; box-shadow: 2px 2px 0 #20202a; transform: translate(-1px, -1px); }
.mood-response__message { display: grid; gap: 5px; }
.mood-response__message span { font-size: 11px; font-weight: 850; }
.mood-response__message input { width: 100%; min-height: 44px; padding: 0 10px; box-sizing: border-box; }
.mood-response__submit { min-height: 44px; color: #20202a; background: #ff7fa5; border: 3px solid #20202a; border-radius: 9px; box-shadow: 3px 3px 0 #20202a; font: inherit; font-weight: 900; }
.mood-response__submit:disabled { opacity: .55; }

.mood-primary { width: 100%; height: 42px; margin-top: 11px; border: 0; border-radius: 999px; background: #101820; color: #fff; font: inherit; font-size: 14px; font-weight: 680; cursor: pointer; }
.mood-primary:active { transform: scale(.985); }

.mood-changes { padding: 18px 0 12px; }
.mood-changes__rows { display: grid; gap: 8px; margin-top: 10px; }
.mood-change-row { display: flex; align-items: center; min-height: 44px; gap: 8px; }
.mood-change-row strong { min-width: 26px; font-size: 15px; }
.mood-change-row strong.is-mine { color: #ff625e; }
.mood-change-row strong.is-partner { color: #477ff7; }
.mood-change-row__sprite { flex: 0 0 auto; width: 34px; height: 38px; }
.mood-change-row__copy { display: grid; flex: 1 1 auto; min-width: 0; gap: 1px; }
.mood-change-row__copy > span { font-size: 15px; font-weight: 650; }
.mood-change-row__copy p { color: #69778b; font-size: 14px; line-height: 1.42; overflow-wrap: anywhere; }
.mood-change-row__response { display: block; margin-top: 4px; color: #20202a; font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }
.mood-change-row time { align-self: start; margin-left: auto; padding-top: 2px; color: var(--muted); font-size: 14px; }
.mood-change-row i { margin: 0 3px; color: #a3aebd; font-style: normal; }
.mood-empty { margin-top: 8px; color: var(--muted); font-size: 13px; }

.mood-calendar { padding: 22px 0 3px; scroll-margin-top: 8px; }
.mood-calendar__title-row { display: flex; align-items: center; justify-content: space-between; }
.mood-month-picker { display: flex; align-items: center; gap: 5px; padding: 0; border: 0; background: transparent; color: inherit; cursor: pointer; }
.mood-month-picker span { margin-top: -2px; font-size: 16px; }
.mood-month-controls { display: flex; gap: 7px; }
.mood-month-controls button { width: 44px; height: 44px; border: 2px solid #20202a; border-radius: 8px; background: #fff; color: #20202a; font-size: 18px; line-height: 18px; cursor: pointer; }
.mood-calendar__weekdays, .mood-calendar__days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.mood-calendar__weekdays { margin-top: 15px; color: #778295; font-size: 11px; text-align: center; }
.mood-calendar__days { margin-top: 4px; row-gap: 2px; }
.mood-calendar-day { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; min-height: 47px; padding: 3px 0 0; border: 1px solid transparent; border-radius: 50%; background: transparent; color: var(--ink); font: inherit; font-size: 12px; cursor: pointer; }
.mood-calendar-day.is-outside { color: #c6cdd7; }
.mood-calendar-day.is-selected { border-color: #ff625d; }
.mood-calendar-day__sprites { display: flex; align-items: center; justify-content: center; min-height: 26px; margin-top: -1px; }
.mood-calendar-day__sprites :deep(.mood-character) { width: 18px; height: 25px; margin-left: -3px; }
.mood-calendar-day__sprites :deep(.mood-character:first-child) { margin-left: 0; }
.mood-calendar-day__sprites em { padding-left: 1px; color: #454e5d; font-size: 9px; font-style: normal; }

.mood-month-summary { margin-top: 15px; padding-top: 12px; border-top: 1px solid var(--line); }
.mood-month-summary > strong { font-size: 13px; }
.mood-month-summary > p { margin-top: 10px; color: var(--muted); font-size: 12px; }
.mood-month-summary__highlights { display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 8px; }
.mood-month-summary__highlights article { display: grid; justify-items: center; }
.mood-month-summary__highlights :deep(.mood-character) { width: 64px; height: 76px; }
.mood-month-summary__highlights span { margin-top: -4px; font-size: 12px; font-weight: 650; }
.mood-month-summary__highlights small { margin-top: 1px; color: var(--muted); font-size: 11px; }
.mood-home__skeleton { display: grid; gap: 14px; min-height: 246px; margin-top: 14px; padding: 18px 16px; box-sizing: border-box; border: 3px solid #20202a; border-radius: 14px; background: #fff; box-shadow: 3px 4px 0 #20202a; }
.mood-skeleton__people { display: grid; grid-template-columns: 70px 1fr 70px; align-items: center; gap: 12px; }
.mood-skeleton__people span { width: 68px; height: 76px; border: 3px solid #20202a; border-radius: 50% 46% 48% 52%; background: linear-gradient(100deg, #ffd1df 25%, #fff 45%, #ffd1df 65%); background-size: 220% 100%; animation: mood-loading 1.35s infinite linear; }
.mood-skeleton__people span:last-child { background-image: linear-gradient(100deg, #c9f4e7 25%, #fff 45%, #c9f4e7 65%); }
.mood-skeleton__people i { height: 3px; background: #20202a; opacity: .35; }
.mood-skeleton__copy { display: grid; gap: 8px; }
.mood-skeleton__copy span { height: 12px; border-radius: 4px; background: #ece8e2; }
.mood-skeleton__copy span:last-child { width: 62%; }
.mood-skeleton__action { height: 44px; border: 3px solid #20202a; border-radius: 9px; background: #ffd94a; }
.mood-skeleton__calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.mood-skeleton__calendar span { aspect-ratio: 1; border: 2px solid #20202a; border-radius: 50%; background: #fffaf5; opacity: .5; }
.mood-load-error { margin: 16px 0 0; color: #ba3c3c; font-size: 12px; text-align: center; }
.mood-load-error button { margin-left: 8px; border: 0; background: transparent; color: inherit; font: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; }

@keyframes mood-loading { to { background-position: -220% 0; } }
@media (prefers-reduced-motion: reduce) { .mood-home__skeleton { animation: none; } }
@media (max-width: 340px) {
  .mood-response__kinds { grid-template-columns: repeat(2, 1fr); }
  .mood-calendar { margin-right: -12px; margin-left: -12px; }
  .mood-skeleton__people { grid-template-columns: 64px 1fr 64px; gap: 8px; }
  .mood-skeleton__people span { width: 62px; height: 70px; }
}
</style>
