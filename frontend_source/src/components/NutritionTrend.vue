<template>
  <section class="nutrition-chart">
    <header><h3>{{ label }}</h3><span>{{ fmt(points.min) }}–{{ fmt(points.max) }} {{ unit }}</span></header>
    <p v-if="!points.segments.length">记录后，这里会出现你的变化。</p>
    <svg v-else viewBox="0 0 300 110" role="img" :aria-label="`${label}，最低 ${fmt(points.min)}，最高 ${fmt(points.max)} ${unit}；完整数值见下方记录明细`">
      <path d="M8 98H292" class="chart-axis" />
      <g v-for="(segment, i) in points.segments" :key="i">
        <polyline :points="segment.map(p => `${p.x},${p.y}`).join(' ')" />
        <circle v-for="point in segment" :key="point.date" :cx="point.x" :cy="point.y" r="2.5"><title>{{ point.date }} · {{ fmt(point.value) }} {{ unit }}</title></circle>
      </g>
    </svg>
    <footer><span>{{ rows[0]?.date.slice(5) }}</span><span>近 28 天 · 空缺不按零计算</span><span>{{ rows.at(-1)?.date.slice(5) }}</span></footer>
  </section>
</template>
<script setup>
import { computed } from 'vue'
import { fmt, trendPoints } from '../utils/nutrition.js'
const props = defineProps({ rows: { type: Array, required: true }, metric: { type: String, required: true }, label: { type: String, required: true }, unit: { type: String, default: '' } })
const points = computed(() => trendPoints(props.rows, props.metric))
</script>
