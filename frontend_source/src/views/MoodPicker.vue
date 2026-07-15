<template>
  <section class="mood-flow mood-picker">
    <header class="mood-flow__header">
      <button type="button" class="mood-flow__back" aria-label="返回" @click="goBack">‹</button>
      <div>
        <h1>现在是什么感觉？</h1>
        <p>选一个最接近此刻的你</p>
      </div>
    </header>

    <main class="mood-picker__content">
      <button
        v-for="item in MOOD_CATALOG"
        :key="item.id"
        type="button"
        class="mood-picker__option"
        :class="{ 'is-selected': selectedMood === item.id }"
        :aria-pressed="selectedMood === item.id"
        @click="selectedMood = item.id"
      >
        <span class="mood-picker__selection" aria-hidden="true"></span>
        <MoodCharacter :mood="item.id" size="picker" />
        <strong>{{ item.label }}</strong>
        <span v-if="selectedMood === item.id" class="mood-picker__check" aria-hidden="true">✓</span>
      </button>
    </main>

    <footer class="mood-flow__footer">
      <button class="mood-flow__primary" type="button" :disabled="!selectedMood" @click="nextStep">下一步</button>
    </footer>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MOOD_CATALOG } from '../utils/mood-catalog.js'
import MoodCharacter from '../components/MoodCharacter.vue'

const route = useRoute()
const router = useRouter()
const selectedMood = ref(typeof route.query.mood === 'string' ? route.query.mood : '')
const recordDate = computed(() => typeof route.query.date === 'string' ? route.query.date : '')

function goBack() {
  router.back()
}

function nextStep() {
  if (!selectedMood.value) return
  router.push({ path: '/mood/write', query: { date: recordDate.value, mood: selectedMood.value } })
}
</script>

<style scoped>
.mood-flow {
  --ink: #121820;
  --muted: #7f8999;
  min-height: 100dvh;
  width: min(100%, 430px);
  margin: 0 auto;
  padding: max(12px, env(safe-area-inset-top)) 20px calc(82px + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: #fbfcff;
  color: var(--ink);
}

.mood-flow__header { display: grid; grid-template-columns: 34px 1fr 34px; align-items: start; text-align: center; }
.mood-flow__header > div { grid-column: 2; }
.mood-flow__header h1, .mood-flow__header p { margin: 0; }
.mood-flow__header h1 { font-size: 16px; font-weight: 750; line-height: 1.45; }
.mood-flow__header p { margin-top: 2px; color: var(--muted); font-size: 11px; }
.mood-flow__back { grid-column: 1; grid-row: 1; width: 34px; height: 34px; margin-top: -7px; border: 0; background: transparent; color: #1d2530; font-size: 32px; font-weight: 300; line-height: 27px; cursor: pointer; }
.mood-flow__footer { position: fixed; bottom: 0; left: 50%; z-index: 4; width: min(100%, 430px); padding: 9px 20px max(14px, env(safe-area-inset-bottom)); box-sizing: border-box; background: #fbfcff; }
.mood-flow__primary { width: 100%; height: 42px; border: 0; border-radius: 999px; background: #101820; color: #fff; font: inherit; font-size: 14px; font-weight: 680; cursor: pointer; }
.mood-flow__primary:disabled { background: #c6cdd7; cursor: not-allowed; }
.mood-flow__primary:active:not(:disabled) { transform: scale(.985); }

.mood-picker__content { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); column-gap: 19px; row-gap: 10px; margin-top: 15px; padding: 0 7px; }
.mood-picker__option { position: relative; display: grid; justify-items: center; min-height: 123px; padding: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: pointer; }
.mood-picker__option :deep(.mood-character) { position: relative; z-index: 1; width: 75px; height: 89px; }
.mood-picker__option strong { position: relative; z-index: 1; margin-top: -1px; font-size: 13px; font-weight: 650; }
.mood-picker__selection { display: none; position: absolute; z-index: 0; top: 4px; width: 82px; height: 94px; border: 1.5px solid #ff5c49; border-radius: 48% 52% 50% 49%; transform: rotate(-4deg); }
.mood-picker__option.is-selected .mood-picker__selection { display: block; }
.mood-picker__check { position: absolute; z-index: 2; top: 75px; right: calc(50% - 39px); display: grid; width: 18px; height: 18px; place-items: center; border-radius: 50%; background: #ff5b43; color: #fff; font-size: 12px; font-weight: 800; }

@media (max-height: 700px) { .mood-picker__content { row-gap: 1px; margin-top: 7px; } .mood-picker__option { min-height: 110px; } .mood-picker__option :deep(.mood-character) { height: 78px; } .mood-picker__check { top: 65px; } }
</style>
