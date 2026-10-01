<template>
  <section class="na-entry">
    <span class="n-kicker">AI 饮食助手</span><h2>拍一下，接着记。</h2><p>餐食、包装都能拍。吃了多少，随时补充修改。</p>
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
        <section class="na-summary" aria-live="polite"><span>{{ selected.status === 'needs_review' ? '已匹配部分 · 还有食物待核对' : '本餐已记录 · 估计值' }}</span><strong>{{ fmt(selected.totals.calories) }} <small>kcal</small></strong><p>蛋白质 {{ fmt(selected.totals.protein) }} g · 脂肪 {{ fmt(selected.totals.fat) }} g · 碳水 {{ fmt(selected.totals.carbs) }} g</p><p v-if="selected.foods.length">份量估计对应约 {{ fmt(selected.calorieRange[0]) }}–{{ fmt(selected.calorieRange[1]) }} kcal；可食部分合计约 {{ fmt(selected.servedGrams) }} g<span v-if="selected.servedMl">，液体 {{ fmt(selected.servedMl) }} ml</span></p><p v-if="selected.target === 'self'">当天累计 {{ fmt(dayTotals.calories) }} kcal · 蛋白质 {{ fmt(dayTotals.protein) }} g</p></section>
        <p v-if="!selected.foods.length" class="n-muted">还没有食物。拍一张照片，或描述你实际吃了什么。</p>
        <p v-if="selected.status === 'needs_review'" class="n-error">待核对项目还未计入热量，请匹配食物库或核对包装标签后再确认全天记录。</p>
        <article v-for="food in selected.foods" :key="food.id" class="na-food">
          <div class="na-food-heading"><strong>{{ food.name }}</strong><span>{{ food.totals ? fmt(food.totals.calories) + ' kcal' : food.consumed === 0 ? '未摄入' : '待匹配' }}</span></div>
          <p>上桌约 {{ fmt(food.served) }} {{ food.unit }} → 吃了 {{ fmt(food.consumed) }} {{ food.unit }}<br>{{ basisLabels[food.basis] }} · 范围 {{ food.range.map(fmt).join('–') }} {{ food.unit }}</p>
          <p class="n-muted">食材识别：{{ confidenceLabels[food.foodConfidence] }} · 份量估计：{{ confidenceLabels[food.portionConfidence] }}{{ food.cooking ? ' · ' + food.cooking : '' }}</p>
          <p v-if="food.candidates.length">可能是：{{ food.candidates.join(' / ') }}</p><p v-if="food.note">{{ food.note }}</p>
          <p v-if="food.matchedName" class="n-muted">参考：{{ food.matchedName }} · {{ food.source }}</p>
          <div class="na-quick"><button :disabled="busy" @click="portion(.5, food.id)">吃了 1/2</button><button :disabled="busy" @click="portion(0, food.id)">没吃</button><button :disabled="busy" @click="edit(food)">{{ food.label && !food.labelConfirmed ? '核对标签与食用量' : '核对 / 修改' }}</button></div>
          <form v-if="editing?.id === food.id" class="na-edit" @submit.prevent="saveFood">
            <label v-if="!editing.label">对应食物库<select v-model="editing.catalogId"><option value="">未匹配</option><option v-for="f in foods" :key="f.id" :value="f.id">{{ f.name }} · {{ f.unit }}</option></select></label>
            <p v-if="!editing.label" class="n-muted">没有适合的条目时，可先到饮食页添加自定义食品，再回来匹配。</p>
            <template v-if="editing.label">
              <p>请对照包装核对下列识别值。只有核对保存后才计入摄入。</p>
              <div class="n-fields"><label>营养表每份数量<input v-model.number="editing.label.basisAmount" type="number" step="0.1" min="0.1" required></label><label>单位<select v-model="editing.label.unit"><option value="g">克</option><option value="ml">毫升</option></select></label><label>能量<input v-model.number="editing.label.energy" type="number" min="0" step="0.1" required></label><label>能量单位<select v-model="editing.label.energyUnit"><option>kJ</option><option>kcal</option></select></label><label v-for="(label, key) in labelNutrients" :key="key">{{ label }}<input v-model.number="editing.label[key]" type="number" min="0" step="0.1" :required="['protein','carbs','fat'].includes(key)"></label></div>
              <p>包装净含量 {{ fmt(editing.label.netAmount) }} {{ editing.label.unit }} · 每小份 {{ fmt(editing.label.servingAmount) }} {{ editing.label.unit }}。填写实际食用量，不默认整包吃完。</p>
            </template>
            <div class="n-fields"><label>上桌可食份量<input v-model.number="editing.served" type="number" step="0.1" min="0.1" max="3000" required></label><label>实际摄入 / {{ editing.label?.unit || food.unit }}<input v-model.number="editing.consumed" type="number" step="0.1" min="0" :max="editing.served" required></label></div>
            <div class="na-quick"><button class="n-primary" :disabled="busy">{{ busy ? '保存中…' : '核对并保存' }}</button><button type="button" :disabled="busy" @click="editing = null">取消</button></div>
          </form>
        </article>
        <section v-if="selected.foods.length" class="na-portions"><h3>整餐实际吃了多少</h3><div class="na-quick"><button v-for="p in quickPortions" :key="p.value" :disabled="busy" @click="portion(p.value)">{{ p.label }}</button></div><form class="na-custom" @submit.prevent="portion(customPercent / 100)"><label>自定义 / %<input v-model.number="customPercent" type="number" min="0" max="100" required></label><button :disabled="busy">应用比例</button></form></section>
        <p v-if="selected.weightCheck" class="n-muted">整体核对：{{ selected.weightCheck }}</p>
        <section v-if="selected.question" class="na-question"><h3>{{ selected.question.text }}</h3><div class="na-quick"><button v-for="option in selected.question.options" :key="option" :disabled="busy || !configured" @click="send(option)">{{ option }}</button><button :disabled="busy" @click="patch({ action: 'skip-question' })">先保留估计</button></div></section>
        <p v-if="answer || selected.answer" class="n-notice" role="status">{{ answer || selected.answer }}</p>
        <button v-if="switchTarget" :disabled="busy" @click="switchPerson">切换到{{ switchTarget === 'partner' ? 'TA' : '我' }}的餐次</button>
        <form class="na-composer" @submit.prevent="send()">
          <label>补充或修改这一餐<textarea v-model="message" maxlength="2000" rows="3" :disabled="busy" placeholder="如：米饭只吃了一半，鸡腿没吃皮"></textarea></label>
          <div class="n-fields"><label>照片用途<select v-model="mode" :disabled="busy"><option value="before">餐食 / 吃前</option><option value="after" :disabled="!selected.hasBeforeImage">吃后对比</option><option value="package">包装 / 营养表</option></select></label><label>添加照片<input type="file" accept="image/*" :disabled="busy" @change="pickPhoto"></label></div>
          <div v-if="photoUrl" class="na-photo"><img :src="photoUrl" alt="本次待识别餐食"><button type="button" :disabled="busy" @click="clearPhoto">移除照片</button></div>
          <p class="n-muted">发送时，照片和当前餐次会交给豆包处理。吃前照片私密保存用于吃后对比，撤销餐次时一并清除。</p>
          <button class="n-primary" :disabled="busy || !configured || conflict || (!message.trim() && !photo)">{{ busy ? '正在识别和整理，请稍候…' : !configured ? '等待 AI 服务配置' : '发送并更新这一餐' }}</button>
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
import { nutritionAiApi as api, mealPhoto, confidenceLabels, basisLabels } from '../utils/nutritionAi.js'
import '../styles/nutrition-ai.css'
const props = defineProps({ date: String, foods: Array, partnerAllowed: Boolean, dayTotals: Object })
const { onMessage } = useWebSocket()
const emit = defineEmits(['changed', 'busy'])
const dialog = ref(null), selected = ref(null), saved = ref([]), configured = ref(false), loading = ref(true), loadError = ref(''), busy = ref(false), error = ref(''), conflict = ref(false)
const target = ref('self'), mealType = ref('lunch'), message = ref(''), mode = ref('before'), photo = ref(null), photoUrl = ref(''), editing = ref(null), answer = ref(''), switchTarget = ref(''), customPercent = ref(50)
const labelNutrients = { protein: '蛋白质 / g', fat: '脂肪 / g', carbs: '碳水 / g', fiber: '纤维 / g · 选填', sugar: '糖 / g · 选填', sodium: '钠 / mg · 选填' }
const quickPortions = [{ label: '全部', value: 1 }, { label: '3/4', value: .75 }, { label: '1/2', value: .5 }, { label: '1/4', value: .25 }]
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
    const signature = JSON.stringify([selected.value.id, selected.value.revision, content, mode.value, photoUrl.value])
    if (signature !== lastSignature) { lastSignature = signature; lastRequest = crypto.randomUUID() }
    const body = new FormData(); body.append('text', content); body.append('mode', photo.value ? mode.value : 'text'); body.append('requestId', lastRequest); body.append('revision', selected.value.revision)
    if (photo.value) body.append('image', photo.value, 'meal.jpg')
    const result = await api(`/ai/meals/${selected.value.id}/interpret`, { method: 'POST', body })
    if (result.readOnly) { answer.value = result.answer || '本次没有修改记录。'; switchTarget.value = result.intent === 'SWITCH_PERSON' ? result.target : ''; return }
    accept(result); answer.value = ''; switchTarget.value = ''; message.value = ''; clearPhoto(); editing.value = null
  })
}
async function patch(body) { await run(async () => { accept(await api(`/ai/meals/${selected.value.id}`, { method: 'PATCH', body: { ...body, revision: selected.value.revision } })); answer.value = ''; editing.value = null }) }
const portion = (ratio, foodId) => patch({ action: 'portion', ratio, foodId })
function edit(food) { editing.value = { id: food.id, catalogId: food.foodId || '', served: food.served, consumed: food.consumed, label: food.label ? JSON.parse(JSON.stringify(food.label)) : null } }
async function saveFood() {
  const item = editing.value
  const label = item.label ? Object.fromEntries(Object.entries(item.label).map(([k, v]) => [k, v === '' ? null : v])) : undefined
  await patch({ action: 'food', foodId: item.id, catalogId: item.catalogId, served: item.served, consumed: item.consumed, label, confirmLabel: Boolean(label) })
}
async function pickPhoto(event) {
  const file = event.target.files?.[0]; event.target.value = ''; if (!file) return
  await run(async () => { const value = await mealPhoto(file); clearPhoto(); photo.value = value; photoUrl.value = URL.createObjectURL(value) })
}
function clearPhoto() { if (photoUrl.value) URL.revokeObjectURL(photoUrl.value); photoUrl.value = ''; photo.value = null }
async function reloadMeal() { const id = selected.value.id; selected.value = null; await load(); selected.value = saved.value.find(m => m.id === id) || null; conflict.value = false; error.value = loadError.value; editing.value = null }
function switchPerson() { target.value = switchTarget.value; if (target.value === 'partner' && !props.partnerAllowed) { error.value = 'TA 需要先在饮食档案中允许代记 AI 餐次。'; return } selected.value = null; switchTarget.value = ''; answer.value = ''; clearPhoto() }
async function deleteMeal() { await run(async () => { const id = selected.value.id; await api(`/entries/${id}`, { method: 'PATCH', body: { revision: selected.value.revision, deleted: true } }); saved.value = saved.value.filter(m => m.id !== id); selected.value = null; clearPhoto(); emit('changed') }) }
function cancel(e) { if (busy.value) e.preventDefault() }
function closed() { document.body.style.overflow = ''; invoker?.focus(); clearPhoto() }
onMounted(() => { load(); unsubscribe = onMessage(event => { if (event.type === 'nutritionSync') load() }); window.addEventListener('focus', load) })
onUnmounted(() => { disposed = true; generation++; unsubscribe?.(); window.removeEventListener('focus', load); clearPhoto(); if (dialog.value?.open) document.body.style.overflow = '' })
</script>
