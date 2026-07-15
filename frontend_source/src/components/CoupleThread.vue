<template>
  <svg
    class="couple-thread"
    viewBox="0 0 248 42"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="var(--thread-warm, #ff6475)" />
        <stop offset="49.5%" stop-color="var(--thread-warm, #ff6475)" />
        <stop offset="50.5%" stop-color="var(--thread-cool, #5d8cff)" />
        <stop offset="100%" stop-color="var(--thread-cool, #5d8cff)" />
      </linearGradient>
    </defs>
    <path
      class="couple-thread-path"
      d="M3 28.6 C26 28.6 49 28.1 74 30.6 C94 32.6 109 37.6 123 37 C116.8 30.3 108.5 23.7 108.7 15.1 C108.8 8.8 112.3 5.1 116.7 5.3 C120.3 5.5 122.3 8.8 123.2 11.4 C124.3 8.5 126.5 5.1 130.2 5.4 C134.5 5.8 136.8 10.2 136.1 15.3 C135.2 22.3 130.6 29.5 123 37 C142 37.5 158 32 181 30 C202 28.3 224 29.3 245 28.6"
      :stroke="`url(#${gradientId})`"
    />
    <circle class="couple-thread-dot warm" cx="3" cy="28.6" r="3.4" />
    <circle class="couple-thread-dot cool" cx="245" cy="28.6" r="3.4" />
  </svg>
</template>

<script setup>
import { useId } from 'vue'

const gradientId = `couple-thread-${useId().replace(/:/g, '')}`
</script>

<style scoped>
.couple-thread {
  display: block;
  overflow: visible;
}

.couple-thread-path {
  fill: none;
  stroke-width: 2.35;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.couple-thread-dot.warm { fill: var(--thread-warm, #ff6475); }
.couple-thread-dot.cool { fill: var(--thread-cool, #5d8cff); }

.couple-thread-path,
.couple-thread-dot {
  filter: drop-shadow(0 1px 1px oklch(36% 0.04 265 / 0.08));
}
</style>
