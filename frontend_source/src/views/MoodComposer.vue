<template>
  <section class="mood-flow mood-composer">
    <header class="mood-flow__header">
      <button type="button" class="mood-flow__back" aria-label="返回" @click="goBack">‹</button>
      <div><h1>告诉 TA</h1></div>
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
import MoodCharacter from '../components/MoodCharacter.vue'

const route = useRoute()
const router = useRouter()
const selectedMood = typeof route.query.mood === 'string' ? route.query.mood : 'calm'
const recordDate = typeof route.query.date === 'string' ? route.query.date : localDateKey()
const mood = computed(() => getMoodDefinition(selectedMood))
const note = ref('')
const recordTime = ref(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()))
const submitting = ref(false)
const error = ref('')

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
.mood-flow { --ink: #121820; --muted: #7f8999; min-height: 100dvh; width: min(100%, 430px); margin: 0 auto; padding: max(12px, env(safe-area-inset-top)) 20px calc(82px + env(safe-area-inset-bottom)); box-sizing: border-box; background: #fbfcff; color: var(--ink); }
.mood-flow__header { display: grid; grid-template-columns: 34px 1fr 34px; align-items: start; text-align: center; }.mood-flow__header > div { grid-column: 2; }.mood-flow__header h1 { margin: 0; font-size: 16px; font-weight: 750; line-height: 1.45; }.mood-flow__back { grid-column: 1; grid-row: 1; width: 34px; height: 34px; margin-top: -7px; padding: 0; border: 0; background: transparent; color: #1d2530; font-size: 32px; font-weight: 300; line-height: 27px; cursor: pointer; }.mood-flow__footer { position: fixed; bottom: 0; left: 50%; z-index: 4; width: min(100%, 430px); padding: 9px 20px max(14px, env(safe-area-inset-bottom)); box-sizing: border-box; background: #fbfcff; }.mood-flow__primary { width: 100%; height: 42px; border: 0; border-radius: 999px; background: #101820; color: #fff; font: inherit; font-size: 14px; font-weight: 680; cursor: pointer; }.mood-flow__primary:disabled { background: #c6cdd7; cursor: not-allowed; }
.mood-composer__content { display: flex; flex-direction: column; align-items: center; padding-top: 18px; }.mood-composer__sprite { width: 142px; height: 150px; }.mood-composer__content > strong { margin-top: -6px; font-size: 14px; font-weight: 700; }.mood-composer__label { align-self: stretch; margin-top: 31px; font-size: 13px; font-weight: 700; }.mood-composer__textarea-wrap { position: relative; align-self: stretch; height: min(30vh, 222px); margin-top: 9px; border: 1px solid #e1e7ef; border-radius: 10px; background: #fff; }.mood-composer__textarea-wrap textarea { width: 100%; height: 100%; padding: 13px 14px 28px; border: 0; outline: 0; resize: none; box-sizing: border-box; background: transparent; color: var(--ink); font: inherit; font-size: 13px; line-height: 1.6; }.mood-composer__textarea-wrap textarea::placeholder { color: #9ba5b4; }.mood-composer__textarea-wrap span { position: absolute; right: 12px; bottom: 9px; color: #8e99a9; font-size: 11px; }.mood-composer__time-row { display: flex; align-items: center; width: 100%; height: 49px; margin-top: 13px; border-top: 1px solid #edf0f4; border-bottom: 1px solid #edf0f4; color: #2d3745; font-size: 13px; }.mood-composer__clock { margin-right: 9px; font-size: 18px; }.mood-composer__time-row input { width: 53px; margin-left: auto; border: 0; outline: 0; background: transparent; color: #2b3440; font: inherit; font-size: 13px; }.mood-composer__time-row i { margin-left: 10px; font-size: 22px; font-style: normal; }.mood-composer__error { align-self: stretch; margin: 10px 0 0; color: #ba3c3c; font-size: 12px; text-align: center; }.mood-composer__save { position: relative; }.mood-composer__save svg { position: absolute; right: 17px; top: 10px; width: 43px; height: 22px; overflow: visible; }.mood-composer__save path { fill: none; stroke-width: 1.4; stroke-linecap: round; }.mood-composer__save-red { stroke: #ff6657; }.mood-composer__save-blue { stroke: #6fa3ff; }
</style>
