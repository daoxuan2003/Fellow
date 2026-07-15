<template>
  <img
    class="mood-character"
    :class="`mood-character--${size}`"
    :src="definition.src"
    :alt="definition.label"
    draggable="false"
  >
</template>

<script setup>
import { computed } from 'vue'
import { getMoodDefinition } from '../utils/mood-catalog.js'

const props = defineProps({
  mood: { type: String, default: 'calm' },
  size: { type: String, default: 'medium' }
})

const definition = computed(() => getMoodDefinition(props.mood))
</script>

<style scoped>
.mood-character {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}
</style>
