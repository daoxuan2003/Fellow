<template>
  <section class="na-entry">
    <span class="n-kicker">AI 饮食助手</span><h2>一餐多张，轻松记。</h2><p>上传餐食、包装照片或直接描述，AI 帮你粗估热量。</p>
    <button class="n-primary" :disabled="busy || loading" @click="open()">拍照 / 文字记一餐</button>
    <p v-if="loading" role="status">正在读取餐次…</p>
    <p v-if="loadError" class="n-error" role="alert">{{ loadError }} <button @click="load">重试</button></p>
    <p v-if="!configured && !loading && !loadError" class="n-muted">AI 识别等待服务配置。已有餐次仍可手动调整，食物库记录照常使用。</p>
    <div v-for="item in specialMeals" :key="item.id" class="na-saved"><span>{{ item.target === 'partner' ? '替 TA 记录' : '待继续' }} · {{ mealLabel(item.meal) }} · {{ item.name }}</span><button @click="open(item.id)">继续记录</button></div>
    <dialog ref="dialog" class="nutrition-dialog na-dialog" aria-labelledby="na-title" @cancel="cancel" @close="closed">
      <header><div><span class="n-kicker">{{ date }} · {{ selected?.target === 'partner' ? '替 TA 记录' : '我的饮食' }}</span><h2 id="na-title">{{ selected ? mealLabel(selected.meal) + ' · 持续记录' : '开始记录这一餐' }}</h2></div><button type="button" :disabled="busy" aria-label="关闭 AI 餐次" @click="dialog.close()">✕</button></header>
      <p v-if="error" class="n-error" role="alert">{{ error }} <button v-if="conflict" :disabled="busy" @click="reloadMeal">重新加载餐次</button></p>
      <template v-if="!selected">
        <div class="n-fields"><label>记录对象<select v-model="target"><option value="self">我自己</option><option value="partner" :disabled="!partnerAllowed">TA{{ partnerAllowed ? '' : '（未授权）' }}</option></select></label><label>餐次<select v-model="mealType"><option v-for="m in meals" :key="m.key" :value="m.key">{{ m.label }}</option></select></label></div>
        <p class="n-muted">已有这一餐会接着修改。一次聚餐或第二次加餐，可以单独新建。</p>
        <div class="n-stack"><button class="n-primary" :disabled="busy" @click="start(false)">{{ busy ? '正在打开…' : '继续 / 开始这一餐' }}</button><button :disabled="busy" @click="start(true)">单独新建一餐</button></div>
      </template>
      <template v-else>
        <section class="na-summary" aria-live="polite"><span>{{ selected.foods.length ? '本餐已记录 · AI 粗估' : '本餐待记录' }}</span><strong>{{ selected.foods.length ? fmt(selected.totals.calories) : '—' }} <small>kcal</small></strong><p v-if="selected.foods.length"><span v-for="(label, key) in macroLabels" :key="key"><template v-if="selected.totals[key + 'Known'] !== false">{{ label }} {{ fmt(selected.totals[key]) }} g　</template></span></p><p v-if="selected.target === 'self'">当天累计约 {{ fmt(dayTotals.calories) }} kcal</p></section>
        <p v-if="!selected.foods.length" class="n-muted">还没有记录。可以一次上传多道菜的照片，或描述这一餐。</p>
        <article v-for="food in selected.foods" :key="food.id" class="na-food">
          <div class="na-food-heading"><strong>{{ food.name }}</strong><span>{{ food.consumed === 0 ? '未食用' : '约 ' + fmt(food.totals.calories) + ' kcal' }}</span></div>
          <p>已吃 {{ fmt(food.consumed / food.served * 100) }}%{{ food.estimate ? ' · AI 粗估' : ' · 历史记录' }}</p>
          <p v-if="food.note" class="n-muted">{{ food.note }}</p>
          <div class="na-quick"><button v-for="p in quickPortions" :key="p.value" :disabled="busy" :aria-pressed="Math.abs(food.consumed / food.served - p.value) < .001" @click="portion(p.value, food.id)">{{ p.label }}</button><button :disabled="busy" @click="portion(0, food.id)">没吃</button><button :disabled="busy" @click="edit(food)">自定义比例</button></div>
          <form v-if="editing?.id === food.id" class="na-custom" @submit.prevent="saveFood"><label>这道菜吃了 / %<input v-model.number="editing.percent" type="number" min="0" max="100" step="1" inputmode="decimal" required></label><button class="n-primary" :disabled="busy">保存比例</button><button type="button" :disabled="busy" @click="editing = null">取消</button></form>
        </article>
        <section v-if="selected.foods.length" class="na-portions"><h3>整餐实际吃了多少</h3><div class="na-quick"><button v-for="p in quickPortions" :key="p.value" :disabled="busy" @click="portion(p.value)">{{ p.label }}</button></div><form class="na-custom" @submit.prevent="portion(customPercent / 100)"><label>自定义 / %<input v-model.number="customPercent" type="number" min="0" max="100" required></label><button :disabled="busy">应用比例</button></form></section>

        <p v-if="answer || selected.answer" class="n-notice" role="status">{{ answer || selected.answer }}</p>
        <button v-if="switchTarget" :disabled="busy" @click="switchPerson">切换到{{ switchTarget === 'partner' ? 'TA' : '我' }}的餐次</button>
        <form class="na-composer" @submit.prevent="send()">
          <label>补充或修改这一餐<textarea v-model="message" maxlength="2000" rows="3" :disabled="busy" placeholder="如：番茄炒蛋吃了一半，米饭吃完了"></textarea></label>
          <div class="n-fields"><label>照片用途<select v-model="mode" :disabled="busy"><option value="before">餐食 / 吃前</option><option value="after" :disabled="!selected.hasBeforeImage">吃后对比</option><option value="package">包装 / 营养表</option></select></label><label>添加照片（最多 4 张）<input type="file" accept="image/*" multiple :disabled="busy" @change="pickPhoto"></label></div>
          <div v-if="photos.length" class="na-photos"><div v-for="(photo, index) in photos" :key="photo.url" class="na-photo"><img :src="photo.url" :alt="`待识别照片 ${index + 1}`"><button type="button" :disabled="busy" :aria-label="`移除照片 ${index + 1}`" @click="removePhoto(index)">移除第 {{ index + 1 }} 张</button></div></div>
          <p class="n-muted">{{ photos.length }}/4 张 · 可继续添加。整道菜粗估热量，看不清的内容略过。</p>
          <p class="n-muted">发送时，照片和当前餐次会交给豆包处理。吃前照片私密保存用于吃后对比，撤销餐次时一并清除。</p>
          <button class="n-primary" :disabled="busy || !configured || conflict || (!message.trim() && !photos.length)">{{ busy ? '正在识别和整理，请稍候…' : !configured ? '等待 AI 服务配置' : '发送并更新这一餐' }}</button>
        </form>
        <div class="na-quick na-footer"><button :disabled="busy" @click="selected = null; editing = null; answer = ''; clearPhoto()">其他餐次 / 对象</button><button :disabled="busy" @click="deleteMeal">撤销这一餐</button></div>
      </template>
    </dialog>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useWebSocket } from '../composables/useWebSocket.js'
import { meals, fmt } from '../utils/nutrition.js'
import { nutritionAiApi as api, mealPhoto } from '../utils/nutritionAi.js'
import '../styles/nutrition-ai.css'
const props = defineProps({ date: String, partnerAllowed: Boolean, dayTotals: Object })
const { onMessage } = useWebSocket()
const emit = defineEmits(['changed', 'busy'])
const dialog = ref(null), selected = ref(null), saved = ref([]), configured = ref(false), loading = ref(true), loadError = ref(''), busy = ref(false), error = ref(''), conflict = ref(false)
const target = ref('self'), mealType = ref('lunch'), message = ref(''), mode = ref('before'), photos = ref([]), editing = ref(null), answer = ref(''), switchTarget = ref(''), customPercent = ref(50)
const macroLabels = { protein: '蛋白质', fat: '脂肪', carbs: '碳水' }
const quickPortions = [{ label: '全部吃完', value: 1 }, { label: '3/4', value: .75 }, { label: '1/2', value: .5 }, { label: '1/4', value: .25 }]
const specialMeals = computed(() => saved.value.filter(m => !m.foods.length || m.target === 'partner'))
const mealLabel = key => meals.find(m => m.key === key)?.label || ''
let invoker, unsubscribe, generation = 0, disposed = false, pendingRefresh = false, lastSignature = '', lastRequest = '', createKey = '', createSignature = ''
watch(busy, value => emit('busy', value))
async function load() {
  if (busy.value) { pendingRefresh = true; return }
  const current = ++generation
  try {
    const result = await api(`/ai/meals?date=${encodeURIComponent(props.date)}`)
    if (disposed || current !== generation) return
    saved.value = result.meals; configured.value = result.configured; loadError.value = ''
    if (selected.value) {
      const updated = saved.value.find(m => m.id === selected.value.id)
      if (!updated || updated.revision !== selected.value.revision) { conflict.value = true; error.value = '餐次已在其他窗口更新，输入已保留。请重新加载后再发送。' }
    }
  } catch (e) { if (current === generation) loadError.value = e.message } finally { if (current === generation) loading.value = false }
}
async function open(id, meal) {
  selected.value = id ? saved.value.find(m => m.id === id) || null : null
  if (id && !selected.value) { await load(); selected.value = saved.value.find(m => m.id === id) || null }
  if (meal) mealType.value = meal
  error.value = ''; conflict.value = false; answer.value = ''; editing.value = null; message.value = ''; switchTarget.value = ''; clearPhoto()
  invoker = document.activeElement; await nextTick(); dialog.value.showModal(); document.body.style.overflow = 'hidden'
  if (id && !selected.value) await run(async () => accept(await api(`/ai/import/${id}`, { method: 'POST', body: {} })))
}
defineExpose({ open })
async function run(action) {
  if (busy.value) return
  busy.value = true; error.value = ''
  try { await action() } catch (e) { error.value = e.message; if (e.status === 409) conflict.value = true }
  finally { busy.value = false; if (pendingRefresh) { pendingRefresh = false; load() } }
}
function accept(result) { selected.value = result.meal; saved.value = [...saved.value.filter(m => m.id !== result.meal.id), result.meal]; conflict.value = false; emit('changed') }
async function start(force) {
  const existing = saved.value.filter(m => m.target === target.value && m.meal === mealType.value).at(-1)
  if (existing && !force) { selected.value = existing; return }
  await run(async () => {
    const signature = JSON.stringify([props.date, mealType.value, target.value])
    if (createSignature !== signature || !createKey) { createSignature = signature; createKey = crypto.randomUUID() }
    accept(await api('/ai/meals', { method: 'POST', body: { date: props.date, meal: mealType.value, target: target.value, requestId: createKey } })); createKey = ''
  })
}
async function send(text) {
  await run(async () => {
    const content = typeof text === 'string' ? text : message.value
    const signature = JSON.stringify([selected.value.id, selected.value.revision, content, mode.value, photos.value.map(p => p.url)])
    if (signature !== lastSignature) { lastSignature = signature; lastRequest = crypto.randomUUID() }
    const body = new FormData(); body.append('text', content); body.append('mode', photos.value.length ? mode.value : 'text'); body.append('requestId', lastRequest); body.append('revision', selected.value.revision)
    photos.value.forEach((photo, i) => body.append('image', photo.blob, `meal-${i + 1}.jpg`))
    const result = await api(`/ai/meals/${selected.value.id}/interpret`, { method: 'POST', body })
    if (result.readOnly) { answer.value = result.answer || '本次没有修改记录。'; switchTarget.value = result.intent === 'SWITCH_PERSON' ? result.target : ''; return }
    accept(result); answer.value = ''; switchTarget.value = ''; message.value = ''; clearPhoto(); editing.value = null
  })
}
async function patch(body) { await run(async () => { accept(await api(`/ai/meals/${selected.value.id}`, { method: 'PATCH', body: { ...body, revision: selected.value.revision } })); answer.value = ''; editing.value = null }) }
const portion = (ratio, foodId) => patch({ action: 'portion', ratio, foodId })
function edit(food) { editing.value = { id: food.id, percent: Math.round(food.consumed / food.served * 100) } }
async function saveFood() { await portion(editing.value.percent / 100, editing.value.id) }
async function pickPhoto(event) {
  const files = Array.from(event.target.files || []); event.target.value = ''; if (!files.length) return
  await run(async () => {
    if (photos.value.length + files.length > 4) throw new Error('一次最多 4 张照片，请移除不需要的照片后再添加')
    // Commit the selection only after all files decode; a failed addition preserves existing photos.
    const blobs = []
    for (const file of files) blobs.push(await mealPhoto(file))
    photos.value.push(...blobs.map(blob => ({ blob, url: URL.createObjectURL(blob) })))
  })
}
function removePhoto(index) { const [photo] = photos.value.splice(index, 1); if (photo) URL.revokeObjectURL(photo.url) }
function clearPhoto() { photos.value.forEach(photo => URL.revokeObjectURL(photo.url)); photos.value = [] }

async function reloadMeal() { const id = selected.value.id; selected.value = null; await load(); selected.value = saved.value.find(m => m.id === id) || null; conflict.value = false; error.value = loadError.value; editing.value = null }
function switchPerson() { target.value = switchTarget.value; if (target.value === 'partner' && !props.partnerAllowed) { error.value = 'TA 需要先在饮食档案中允许代记 AI 餐次。'; return } selected.value = null; switchTarget.value = ''; answer.value = ''; clearPhoto() }
async function deleteMeal() { await run(async () => { const id = selected.value.id; await api(`/entries/${id}`, { method: 'PATCH', body: { revision: selected.value.revision, deleted: true } }); saved.value = saved.value.filter(m => m.id !== id); selected.value = null; clearPhoto(); emit('changed') }) }
function cancel(e) { if (busy.value) e.preventDefault() }
function closed() { document.body.style.overflow = ''; invoker?.focus(); clearPhoto() }
onMounted(() => { load(); unsubscribe = onMessage(event => { if (event.type === 'nutritionSync') load() }); window.addEventListener('focus', load) })
onUnmounted(() => { disposed = true; generation++; unsubscribe?.(); window.removeEventListener('focus', load); clearPhoto(); if (dialog.value?.open) document.body.style.overflow = '' })
</script>
