<template>
  <svg
    class="mood-character"
    :class="`mood-character--${size}`"
    viewBox="0 0 88 88"
    role="img"
    :aria-label="definition.label"
    :style="{ '--mood-color': definition.color }"
  >
    <circle class="mood-character__face" cx="44" cy="44" r="36" />
    <g class="mood-character__features">
      <template v-if="face.eyes === 'happy'">
        <path d="M25 38c3-5 8-5 11 0" />
        <path d="M52 38c3-5 8-5 11 0" />
      </template>
      <template v-else-if="face.eyes === 'closed'">
        <path d="M25 39c3 3 8 3 11 0" />
        <path d="M52 39c3 3 8 3 11 0" />
      </template>
      <template v-else-if="face.eyes === 'angry'">
        <path d="M24 34l12 4" />
        <path d="M64 34l-12 4" />
        <circle cx="31" cy="41" r="2" class="mood-character__ink" />
        <circle cx="57" cy="41" r="2" class="mood-character__ink" />
      </template>
      <template v-else-if="face.eyes === 'sad'">
        <path d="M25 38c3-3 8-3 11 0" />
        <path d="M52 38c3-3 8-3 11 0" />
      </template>
      <template v-else>
        <circle cx="31" cy="39" r="2.8" class="mood-character__ink" />
        <circle cx="57" cy="39" r="2.8" class="mood-character__ink" />
      </template>

      <path v-if="face.mouth === 'smile'" d="M30 52c5 9 23 9 28 0" />
      <path v-else-if="face.mouth === 'soft'" d="M35 53c3 3 15 3 18 0" />
      <path v-else-if="face.mouth === 'frown'" d="M31 59c6-8 20-8 26 0" />
      <path v-else-if="face.mouth === 'zigzag'" d="M30 55l7-4 7 5 7-5 7 4" />
      <ellipse v-else-if="face.mouth === 'round'" cx="44" cy="55" rx="5" ry="7" />
      <path v-else d="M35 54h18" />

      <template v-if="mood === 'sad' || mood === 'wronged'">
        <path class="mood-character__accent" d="M61 45c4 6 4 9 0 12-4-3-4-6 0-12Z" />
      </template>
      <template v-if="mood === 'missing'">
        <path class="mood-character__accent" d="M64 23c4-6 12-2 9 4-2 4-9 8-9 8s-7-4-9-8c-3-6 5-10 9-4Z" />
      </template>
      <template v-if="mood === 'shy'">
        <circle class="mood-character__cheek" cx="23" cy="49" r="5" />
        <circle class="mood-character__cheek" cx="65" cy="49" r="5" />
      </template>
      <template v-if="mood === 'anxious' || mood === 'overwhelmed'">
        <path class="mood-character__accent" d="M67 19l4-5M72 25l7-1M64 14l-1-7" />
      </template>
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
const face = computed(() => ({
  happy: { eyes: 'happy', mouth: 'smile' },
  calm: { eyes: 'closed', mouth: 'soft' },
  missing: { eyes: 'round', mouth: 'soft' },
  expectant: { eyes: 'round', mouth: 'smile' },
  shy: { eyes: 'closed', mouth: 'soft' },
  bored: { eyes: 'closed', mouth: 'line' },
  tired: { eyes: 'closed', mouth: 'round' },
  wronged: { eyes: 'sad', mouth: 'frown' },
  sad: { eyes: 'sad', mouth: 'frown' },
  anxious: { eyes: 'sad', mouth: 'zigzag' },
  angry: { eyes: 'angry', mouth: 'frown' },
  overwhelmed: { eyes: 'angry', mouth: 'zigzag' }
}[props.mood] || { eyes: 'closed', mouth: 'soft' }))
</script>

<style scoped>
.mood-character {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.mood-character__face {
  fill: var(--mood-color, #69cfee);
  stroke: var(--fellow-ink, #25242d);
  stroke-width: 4;
}

.mood-character__features {
  fill: none;
  stroke: var(--fellow-ink, #25242d);
  stroke-width: 3.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.mood-character__ink { fill: var(--fellow-ink, #25242d); stroke: none; }
.mood-character__accent { fill: var(--fellow-pink, #f77ea4); stroke: var(--fellow-ink, #25242d); stroke-width: 2.5; }
.mood-character__cheek { fill: color-mix(in srgb, var(--fellow-pink, #f77ea4) 72%, white); stroke: none; }
</style>
