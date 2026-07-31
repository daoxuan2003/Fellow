<template>
  <section class="mood-flow mood-composer">
    <header class="mood-flow__header">
      <button type="button" class="mood-flow__back" aria-label="返回" @click="goBack">‹</button>
      <div><h1>告诉{{ partnerPronoun }}</h1></div>
    </header>

    <main class="mood-composer__content">
      <MoodCharacter class="mood-composer__sprite" :mood="selectedMood" size="composer" />
      <strong>我现在有点{{ mood.label }}</strong>
      <label class="mood-composer__label" for="mood-note">想说什么</label>
      <div class="mood-composer__textarea-wrap">
        <textarea id="mood-note" v-model="note" maxlength="300" placeholder="把此刻想说的话写下来…"></textarea>
        <span>{{ note.length }}/300</span>
      </div>
      <label class="mood-composer__time-row">
        <span class="mood-composer__clock" aria-hidden="true">◷</span>
        <span>记录时间</span>
        <input v-model="recordTime" type="time" aria-label="记录时间">
        <i aria-hidden="true">›</i>
      </label>
      <p v-if="error" class="mood-composer__error" role="alert">{{ error }}</p>
    </main>

    <footer class="mood-flow__footer">
      <button class="mood-flow__primary mood-composer__save" type="button" :disabled="submitting" @click="saveMood">
        {{ submitting ? '保存中…' : '保存这次心情' }}
        <svg viewBox="0 0 52 24" aria-hidden="true">
          <path class="mood-composer__save-red" d="M1 15c7 0 9-9 15-7 4 1 4 9 10 8" />
          <path class="mood-composer__save-blue" d="M26 16c5-1 3-13 12-13 7 0 7 9 13 9" />
        </svg>
      </button>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { getMoodDefinition } from '../utils/mood-catalog.js'
import { getPartnerPronoun } from '../utils/partner-pronoun.js'
import MoodCharacter from '../components/MoodCharacter.vue'
import { useUserStore } from '../stores/user.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const selectedMood = typeof route.query.mood === 'string' ? route.query.mood : 'calm'
const recordDate = typeof route.query.date === 'string' ? route.query.date : localDateKey()
const mood = computed(() => getMoodDefinition(selectedMood))
const note = ref('')
const recordTime = ref(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
const submitting = ref(false)
const error = ref('')
const partnerPronoun = computed(() => getPartnerPronoun((userStore.currentPartner || userStore.partner || userStore.currentUser?.partner)?.gender))

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function goBack() { router.back() }

async function saveMood() {
  submitting.value = true
  error.value = ''
  try {
    const response = await fetch(`${CONFIG.API_URL}/mood`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token') || ''}`
      },
      body: JSON.stringify({ mood: selectedMood, note: note.value, recordDate, recordTime: recordTime.value })
    })
    const body = await response.json()
    if (!response.ok || !body.success) throw new Error(body.message || '保存失败，请稍后重试。')
    router.replace({ path: `/mood/day/${recordDate}` })
  } catch (requestError) {
    error.value = requestError.message || '保存失败，请稍后重试。'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.mood-flow { --ink: var(--fellow-ink, #25242d); min-height: 100dvh; width: min(100%, 460px); margin: 0 auto; padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(88px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box; color: var(--ink); background: var(--fellow-paper, #fffaf5); }
.mood-flow__header { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; min-height: 56px; text-align: center; }.mood-flow__header > div { grid-column: 2; }.mood-flow__header h1 { margin: 0; font-size: 21px; font-weight: 950; letter-spacing: -.03em; }.mood-flow__back { grid-column: 1; grid-row: 1; display: grid; width: 44px; height: 44px; place-items: center; padding: 0 0 3px; color: var(--ink); background: #fff; border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); font: 900 30px/1 system-ui; cursor: pointer; }.mood-flow__footer { position: fixed; bottom: 0; left: 50%; z-index: 4; width: min(100%, 460px); padding: 9px 16px max(13px, env(safe-area-inset-bottom, 0px)); box-sizing: border-box; background: var(--fellow-paper, #fffaf5); border-top: 3px solid var(--ink); transform: translateX(-50%); }.mood-flow__primary { width: 100%; min-height: 48px; color: var(--ink); background: var(--fellow-yellow, #fff1a8); border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 4px 0 var(--ink); font: inherit; font-size: 14px; font-weight: 950; cursor: pointer; }.mood-flow__primary:disabled { opacity: .62; box-shadow: none; cursor: not-allowed; }
.mood-composer__content { display: flex; flex-direction: column; align-items: center; margin-top: 12px; padding: 18px 16px; background: #fff; border: 3px solid var(--ink); border-radius: 14px; box-shadow: 4px 5px 0 var(--ink); }.mood-composer__sprite { width: 94px; height: 94px; }.mood-composer__content > strong { margin-top: 5px; font-size: 16px; font-weight: 950; }.mood-composer__label { align-self: stretch; margin-top: 22px; font-size: 12px; font-weight: 950; }.mood-composer__textarea-wrap { position: relative; align-self: stretch; height: min(30vh, 210px); margin-top: 7px; border: 2px solid var(--ink); border-radius: 10px; background: #fffaf5; }.mood-composer__textarea-wrap:focus-within { box-shadow: 0 0 0 3px var(--fellow-blue, #58c8f5); }.mood-composer__textarea-wrap textarea { width: 100%; height: 100%; padding: 12px 12px 28px; border: 0; resize: none; box-sizing: border-box; background: transparent; color: var(--ink); font: inherit; font-size: 16px; line-height: 1.55; }.mood-composer__textarea-wrap textarea::placeholder { color: #6d6b73; }.mood-composer__textarea-wrap span { position: absolute; right: 10px; bottom: 8px; color: #686772; font-size: 11px; font-weight: 800; }.mood-composer__time-row { display: flex; align-items: center; width: 100%; min-height: 52px; margin-top: 12px; padding: 0 10px; box-sizing: border-box; color: var(--ink); background: var(--fellow-mint, #c8f6e8); border: 2px solid var(--ink); border-radius: 10px; font-size: 12px; font-weight: 900; }.mood-composer__time-row:focus-within { box-shadow: 0 0 0 3px var(--fellow-blue, #58c8f5); }.mood-composer__clock { margin-right: 8px; font-size: 18px; }.mood-composer__time-row input { width: 94px; margin-left: auto; padding: 0 8px; border: 0; background: #fff; color: var(--ink); font: inherit; font-size: 16px; }.mood-composer__time-row i { display: none; }.mood-composer__error { align-self: stretch; margin: 12px 0 0; padding: 9px; color: #7c2630; background: #ffe2e8; border: 2px solid var(--ink); border-radius: 8px; font-size: 12px; font-weight: 800; text-align: center; }.mood-composer__save { position: relative; }.mood-composer__save svg { position: absolute; right: 14px; top: 10px; width: 43px; height: 22px; overflow: visible; }.mood-composer__save path { fill: none; stroke-width: 2; stroke-linecap: round; }.mood-composer__save-red { stroke: #ff6657; }.mood-composer__save-blue { stroke: #5f8bef; }
@media (max-width: 340px) { .mood-flow { padding-right: 12px; padding-left: 12px; } }
</style>
