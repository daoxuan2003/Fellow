<template>
  <div class="date-picker-field" @click="openPicker">
    <div
      :class="['date-picker-display', displayClass, { empty: !modelValue }]"
    >
      {{ displayText }}
    </div>
    <van-popup
      v-model:show="showPicker"
      position="bottom"
      round
      :safe-area-inset-bottom="true"
      teleport="body"
    >
      <van-date-picker
        v-model="pickerValue"
        :min-date="minDateObj"
        :max-date="maxDateObj"
        :title="title || '选择日期'"
        @confirm="onConfirm"
        @cancel="showPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Popup as VanPopup, DatePicker as VanDatePicker } from 'vant'
import 'vant/es/popup/style'
import 'vant/es/date-picker/style'

const props = defineProps({
  modelValue: { type: String, default: '' },
  min: { type: String, default: '' },
  max: { type: String, default: '' },
  placeholder: { type: String, default: '请选择日期' },
  title: { type: String, default: '选择日期' },
  displayClass: { type: String, default: 'form-input' },
})

const emit = defineEmits(['update:modelValue'])

const showPicker = ref(false)

// 将 YYYY-MM-DD 转为 ['2025', '04', '03']
const toPickerValue = (dateStr) => {
  if (!dateStr) {
    const today = new Date()
    return [
      String(today.getFullYear()),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ]
  }
  const [y, m, d] = dateStr.split('-')
  return [y, m.padStart(2, '0'), d.padStart(2, '0')]
}

// 将 ['2025', '04', '03'] 转为 YYYY-MM-DD
const toDateStr = (arr) => {
  if (!arr || arr.length !== 3) return ''
  const [y, m, d] = arr
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

const pickerValue = ref(toPickerValue(props.modelValue))

watch(
  () => props.modelValue,
  (val) => {
    pickerValue.value = toPickerValue(val)
  }
)

const displayText = computed(() => {
  return props.modelValue || props.placeholder
})

const parseDate = (dateStr) => {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const minDateObj = computed(() => {
  if (props.min) return parseDate(props.min)
  return new Date(2000, 0, 1)
})

const maxDateObj = computed(() => {
  if (props.max) return parseDate(props.max)
  return new Date(2100, 11, 31)
})

const openPicker = () => {
  showPicker.value = true
}

const onConfirm = ({ selectedValues }) => {
  const dateStr = toDateStr(selectedValues)
  emit('update:modelValue', dateStr)
  showPicker.value = false
}
</script>

<style scoped>
.date-picker-field {
  width: 100%;
}
.date-picker-display {
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  user-select: none;
}
.date-picker-display.empty {
  color: #9ca3af;
}
</style>
