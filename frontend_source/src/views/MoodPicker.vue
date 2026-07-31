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
        :style="{ '--mood-swatch': item.color }"
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
  --ink: var(--fellow-ink, #25242d);
  --muted: #686772;
  min-height: 100dvh;
  width: min(100%, 460px);
  margin: 0 auto;
  padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(86px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: var(--fellow-paper, #fffaf5);
  color: var(--ink);
}

.mood-flow__header { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; gap: 8px; min-height: 56px; text-align: center; }
.mood-flow__header > div { grid-column: 2; }
.mood-flow__header h1, .mood-flow__header p { margin: 0; }
.mood-flow__header h1 { font-size: 21px; font-weight: 950; line-height: 1.2; letter-spacing: -.03em; }
.mood-flow__header p { margin-top: 3px; color: var(--muted); font-size: 11px; font-weight: 700; }
.mood-flow__back { grid-column: 1; grid-row: 1; display: grid; width: 44px; height: 44px; place-items: center; padding: 0 0 3px; color: var(--ink); background: #fff; border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 3px 0 var(--ink); font: 900 30px/1 system-ui; cursor: pointer; }
.mood-flow__footer { position: fixed; bottom: 0; left: 50%; z-index: 4; width: min(100%, 460px); padding: 9px 16px max(13px, env(safe-area-inset-bottom, 0px)); box-sizing: border-box; background: var(--fellow-paper, #fffaf5); border-top: 3px solid var(--ink); transform: translateX(-50%); }
.mood-flow__primary { width: 100%; min-height: 48px; color: var(--ink); background: var(--fellow-yellow, #fff1a8); border: 3px solid var(--ink); border-radius: 10px; box-shadow: 3px 4px 0 var(--ink); font: inherit; font-size: 14px; font-weight: 950; cursor: pointer; }
.mood-flow__primary:disabled { color: #777681; background: #ece8e2; box-shadow: none; cursor: not-allowed; }
.mood-flow__primary:active:not(:disabled) { transform: translate(2px, 2px); box-shadow: 1px 2px 0 var(--ink); }

.mood-picker__content { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; margin-top: 16px; }
.mood-picker__option { position: relative; display: grid; justify-items: center; align-content: center; gap: 3px; min-height: 103px; padding: 8px 4px 7px; color: inherit; background: color-mix(in srgb, var(--mood-swatch) 12%, white); border: 2px solid var(--ink); border-radius: 12px; font: inherit; cursor: pointer; }
.mood-picker__option:focus-visible { outline: 3px solid color-mix(in srgb, var(--fellow-blue, #69cfee) 55%, transparent); outline-offset: 2px; }
.mood-picker__option :deep(.mood-character) { position: relative; z-index: 1; width: 61px; height: 61px; }
.mood-picker__option strong { position: relative; z-index: 1; font-size: 12px; font-weight: 950; }
.mood-picker__selection { display: none; }
.mood-picker__option.is-selected { background: var(--fellow-yellow, #fff1a8); box-shadow: 3px 4px 0 var(--ink); transform: translate(-1px, -1px); }
.mood-picker__check { position: absolute; z-index: 2; top: 6px; right: 6px; display: grid; width: 20px; height: 20px; place-items: center; color: var(--ink); background: var(--fellow-pink, #f77ea4); border: 2px solid var(--ink); border-radius: 50%; font-size: 11px; font-weight: 950; }

@media (max-height: 700px) { .mood-picker__content { gap: 7px; margin-top: 8px; } .mood-picker__option { min-height: 91px; } .mood-picker__option :deep(.mood-character) { width: 52px; height: 52px; } }
@media (max-width: 340px) { .mood-flow { padding-right: 12px; padding-left: 12px; } .mood-picker__content { gap: 6px; } }
</style>
