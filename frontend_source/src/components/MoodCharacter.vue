<template>
  <svg
    class="mood-character"
    :class="`mood-character--${size}`"
    viewBox="0 0 88 88"
    role="img"
    :aria-label="definition.label"
    :data-mood-art="definition.art"
    :style="{ '--mood-color': definition.color }"
  >
    <path class="mood-character__face" :d="facePath" />

    <g v-if="mood === 'happy'" class="mood-character__features mood-art--sunshine">
      <path d="M24 38c3-6 9-6 12 0M52 38c3-6 9-6 12 0" />
      <path d="M29 51c7 10 24 10 31-1" />
      <path class="mood-character__accent-fill" d="M68 18l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" />
    </g>

    <g v-else-if="mood === 'calm'" class="mood-character__features mood-art--still-water">
      <path d="M24 39c4 3 9 3 13 0M51 39c4 3 9 3 13 0" />
      <path d="M35 54c4 2 14 2 18 0" />
      <path class="mood-character__accent-line" d="M21 61c8 3 14 3 22 0 8-3 15-3 24 0" />
    </g>

    <g v-else-if="mood === 'missing'" class="mood-character__features mood-art--heart-call">
      <circle class="mood-character__ink" cx="30" cy="40" r="3" />
      <circle class="mood-character__ink" cx="55" cy="40" r="3" />
      <path d="M36 55c4 3 12 3 16 0" />
      <path class="mood-character__accent-fill" d="M65 18c4-6 13-2 10 5-2 5-10 10-10 10s-8-5-10-10c-3-7 6-11 10-5Z" />
      <path class="mood-character__accent-line" d="M60 35c-3 3-5 5-6 8" />
    </g>

    <g v-else-if="mood === 'expectant'" class="mood-character__features mood-art--star-gaze">
      <path class="mood-character__ink" d="m30 32 2 5 5 .5-4 3 1 5-4-2.5-4 2.5 1-5-4-3 5-.5Z" />
      <path class="mood-character__ink" d="m58 32 2 5 5 .5-4 3 1 5-4-2.5-4 2.5 1-5-4-3 5-.5Z" />
      <ellipse cx="44" cy="57" rx="7" ry="6" />
      <path class="mood-character__accent-line" d="M18 22l5 1m-2-6 2 6M68 58l5 3m-2-8 2 8" />
    </g>

    <g v-else-if="mood === 'shy'" class="mood-character__features mood-art--blush-hide">
      <path d="M24 40c4 4 9 4 13 0M51 40c4 4 9 4 13 0" />
      <path d="M40 55c2-1 6-1 8 0" />
      <ellipse class="mood-character__cheek" cx="23" cy="51" rx="7" ry="5" />
      <ellipse class="mood-character__cheek" cx="65" cy="51" rx="7" ry="5" />
      <path class="mood-character__accent-line" d="M17 49l6-2m-5 7 6-2m40-5 7 2m-7 3 6 2" />
    </g>

    <g v-else-if="mood === 'bored'" class="mood-character__features mood-art--slow-cloud">
      <path d="M23 39h14M51 39h14" />
      <path d="M35 56h18" />
      <circle class="mood-character__accent-fill" cx="69" cy="25" r="2" />
      <circle class="mood-character__accent-fill" cx="75" cy="19" r="3" />
      <path class="mood-character__accent-line" d="M18 28c4-3 8-3 12 0" />
    </g>

    <g v-else-if="mood === 'tired'" class="mood-character__features mood-art--sleepy-yawn">
      <path d="M23 39c4 2 10 2 14 0M50 39c4 2 10 2 14 0" />
      <ellipse cx="44" cy="56" rx="6" ry="8" />
      <path class="mood-character__accent-line" d="M63 22h9l-9 8h9M70 10h7l-7 6h7" />
    </g>

    <g v-else-if="mood === 'wronged'" class="mood-character__features mood-art--held-tear">
      <path d="M23 37c4-4 10-3 14 1M51 38c4-4 10-5 14-1" />
      <circle class="mood-character__ink" cx="31" cy="42" r="2.5" />
      <circle class="mood-character__ink" cx="58" cy="42" r="2.5" />
      <path d="M34 59c5-6 15-6 20 0" />
      <path class="mood-character__tear" d="M65 45c5 7 5 11 0 14-5-3-5-7 0-14Z" />
      <path class="mood-character__accent-line" d="M20 52l7-2" />
    </g>

    <g v-else-if="mood === 'sad'" class="mood-character__features mood-art--rainy-face">
      <path d="M23 38c4-4 10-4 14 0M51 38c4-4 10-4 14 0" />
      <path d="M32 60c6-9 18-9 24 0" />
      <path class="mood-character__tear" d="M27 45c4 6 4 10 0 13-4-3-4-7 0-13Zm34 2c4 6 4 10 0 13-4-3-4-7 0-13Z" />
      <path class="mood-character__accent-line" d="M18 21v6m8-11v7m39-3v7" />
    </g>

    <g v-else-if="mood === 'anxious'" class="mood-character__features mood-art--nervous-sweat">
      <circle class="mood-character__ink" cx="30" cy="40" r="2.5" />
      <circle class="mood-character__ink" cx="58" cy="40" r="2.5" />
      <path d="M26 33l9-3m18 0 9 3M31 57l6-4 7 5 7-5 6 4" />
      <path class="mood-character__tear" d="M68 20c5 7 5 11 0 14-5-3-5-7 0-14Z" />
      <path class="mood-character__accent-line" d="M17 23l5 5m-5 0 5-5" />
    </g>

    <g v-else-if="mood === 'angry'" class="mood-character__features mood-art--hot-temper">
      <path d="M22 32l15 6m29-6-15 6" />
      <circle class="mood-character__ink" cx="31" cy="42" r="2.5" />
      <circle class="mood-character__ink" cx="57" cy="42" r="2.5" />
      <path d="M32 58h24m-20-5v8m7-8v8m7-8v8" />
      <path class="mood-character__accent-line" d="M17 22c-5-6 2-9 4-4 1-6 8-5 7 1m43 7c6-4 8 3 4 5 6 1 4 8-1 7" />
    </g>

    <g v-else class="mood-character__features mood-art--spiral-burst">
      <path d="M24 39c0-7 11-8 12-1 1 7-9 9-11 3-2-6 7-8 9-3M52 39c0-7 11-8 12-1 1 7-9 9-11 3-2-6 7-8 9-3" />
      <path d="M29 58l6-5 6 5 6-5 6 5 6-5" />
      <path class="mood-character__accent-line" d="M17 14l5 8m-9 4 9 2m48-14-5 8m10 4-10 2M43 8v10" />
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
import { getMoodDefinition } from '../utils/mood-catalog.js'

const props = defineProps({
  mood: { type: String, default: 'calm' },
  size: { type: String, default: 'medium' }
})

const definition = computed(() => getMoodDefinition(props.mood))
const facePaths = Object.freeze({
  sunshine: 'M44 7C66 7 80 21 80 43c0 23-14 38-36 38S8 66 8 43C8 21 22 7 44 7Z',
  'still-water': 'M44 9c23 0 36 13 36 35S67 79 44 79 8 66 8 44 21 9 44 9Z',
  'heart-call': 'M44 7c22 0 37 15 36 37-1 23-15 37-36 37S8 67 8 44C8 22 22 7 44 7Z',
  'star-gaze': 'M24 10h40c9 0 15 6 15 15v38c0 10-7 17-17 17H26C16 80 9 73 9 63V26c0-10 6-16 15-16Z',
  'blush-hide': 'M44 7c19 0 34 13 36 34 2 24-12 40-36 40S6 65 8 41C10 20 25 7 44 7Z',
  'slow-cloud': 'M22 12h44c8 0 14 7 14 15v35c0 11-7 18-18 18H26C15 80 8 73 8 62V29c0-10 5-17 14-17Z',
  'sleepy-yawn': 'M44 11c22 0 36 11 36 32 0 24-13 38-36 38S8 67 8 43c0-21 14-32 36-32Z',
  'held-tear': 'M41 8c22-2 38 12 40 34 2 22-12 38-34 40C24 84 8 69 7 47 6 25 19 10 41 8Z',
  'rainy-face': 'M44 7c20 0 34 17 36 37 2 21-13 37-36 37S6 65 8 44C10 24 24 7 44 7Z',
  'nervous-sweat': 'M43 8c21-1 37 14 38 35 1 23-14 38-36 38C22 82 8 67 7 45 6 23 21 9 43 8Z',
  'hot-temper': 'M24 12h40c10 0 16 7 16 17v34c0 11-8 18-19 18H27C16 81 8 74 8 63V29c0-10 6-17 16-17Z',
  'spiral-burst': 'M44 7c12 0 18 5 25 13 8 8 12 15 11 26-1 12-6 18-15 26-8 7-15 10-25 9-12-1-18-6-25-14C9 59 6 52 8 41c2-12 7-18 16-25C31 10 35 7 44 7Z'
})
const facePath = computed(() => facePaths[definition.value.art] || facePaths['still-water'])
</script>

<style scoped>
.mood-character { display: block; width: 100%; height: 100%; overflow: visible; }
.mood-character__face { fill: var(--mood-color, #69cfee); stroke: var(--fellow-ink, #25242d); stroke-width: 4; stroke-linejoin: round; }
.mood-character__features { fill: none; stroke: var(--fellow-ink, #25242d); stroke-width: 3.3; stroke-linecap: round; stroke-linejoin: round; }
.mood-character__ink { fill: var(--fellow-ink, #25242d); stroke: none; }
.mood-character__accent-fill { fill: var(--fellow-pink, #ff7fa5); stroke: var(--fellow-ink, #25242d); stroke-width: 2.2; }
.mood-character__accent-line { fill: none; stroke: color-mix(in srgb, var(--fellow-ink, #25242d) 86%, var(--mood-color)); stroke-width: 2.5; }
.mood-character__cheek { fill: color-mix(in srgb, var(--fellow-pink, #ff7fa5) 72%, white); stroke: none; }
.mood-character__tear { fill: var(--fellow-blue, #58c8f5); stroke: var(--fellow-ink, #25242d); stroke-width: 2.2; }
</style>
