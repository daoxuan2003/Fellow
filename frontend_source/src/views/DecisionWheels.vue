<template>
  <div class="wheel-page">
    <FeatureHeader title="大转盘" chapter="04" kind="plan"><template #action><DecisionWheelIcon class="wheel-header-icon" /></template></FeatureHeader>
    <main class="wheel-main">
      <div class="wheel-intro"><div><h1>今天，转一个。</h1><p>把你们的选择放进来，让转盘来决定。</p></div><RouterLink to="/plans/legacy">旧计划</RouterLink></div>
      <nav class="wheel-tabs" aria-label="转盘分类">
        <button v-for="item in WHEEL_CATEGORIES" :key="item.id" type="button" :aria-pressed="category === item.id" :disabled="busy" @click="selectCategory(item.id)">{{ item.label }}</button>
      </nav>
      <div v-if="loading" class="wheel-loading" role="status"><div></div><p>正在同步你们的选项…</p></div>
      <section v-else-if="loadError && !wheels.length" class="wheel-message" role="alert"><h2>暂时没能打开转盘</h2><p>{{ loadError }}</p><button type="button" @click="load()">重新加载</button></section>
      <template v-else>
        <div v-if="loadError" class="wheel-message" role="alert"><p>{{ loadError }}</p><button type="button" @click="load(true)">重新同步</button></div>
        <section class="wheel-stage" :aria-busy="spinning || requesting">
          <div class="wheel-heading"><h2>{{ selectedCategory.label }}</h2><span>{{ activeWheel.entries.length }} 个选项</span></div>
          <p class="wheel-hint">{{ selectedCategory.hint }}</p>
          <div class="wheel-disc-wrap">
            <span class="wheel-pointer" aria-hidden="true"></span>
            <svg class="wheel-disc" viewBox="0 0 300 300" aria-hidden="true" :class="{ spinning }" :style="{ transform: `rotate(${rotation}deg)`, transitionDuration: spinning ? `${spinDuration}ms` : '0ms' }">
              <circle cx="150" cy="150" r="144" class="wheel-empty-disc" />
              <g v-for="(entry, index) in visibleEntries" :key="entry.id" :class="`wheel-color-${index % 4}`">
                <circle v-if="visibleEntries.length === 1" cx="150" cy="150" r="144" />
                <path v-else :d="wheelSlice(index, visibleEntries.length)" />
                <text x="150" y="60" text-anchor="middle" :transform="`rotate(${index * 360 / visibleEntries.length} 150 150)`">{{ wheelLabel(entry.label, visibleEntries.length, index) }}</text>
              </g>
              <circle cx="150" cy="150" r="144" class="wheel-rim" />
            </svg>
            <button class="wheel-start" type="button" :disabled="busy || !activeWheel.entries.length || Boolean(loadError)" @click="spin" :aria-label="spinning ? '正在转动' : '开始转盘'">{{ requesting ? '准备中' : spinning ? '转动中' : '转一转' }}<span aria-hidden="true">↗</span></button>
          </div>
          <div class="wheel-result" role="status" aria-live="polite">
            <template v-if="spinning || requesting"><span>答案就快出现了</span><strong>这次会是哪一个？</strong></template>
            <template v-else-if="result"><span>{{ freshResult ? '这次就选' : result.isMine ? '你上次转到' : 'TA 上次转到' }}</span><strong>{{ result.label }}</strong><small>不合心意？再转一次也没关系。</small></template>
            <template v-else><span>{{ activeWheel.entries.length ? '准备好了' : '还没有选项' }}</span><strong>{{ activeWheel.entries.length ? '看看今天的好主意' : '先放进一个你们的选择' }}</strong></template>
          </div>
          <p v-if="actionError && !editorOpen" class="wheel-error" role="alert">{{ actionError }}</p>
        </section>
        <section class="wheel-entries" aria-labelledby="entries-heading">
          <div class="entries-heading"><div><h2 id="entries-heading">转盘里的选项</h2><p>两个人一起添加，每个选项机会相同。</p></div><button class="wheel-add" type="button" :disabled="busy || activeWheel.entries.length >= 30 || Boolean(loadError)" @click="openEditor()">＋ 添加</button></div>
          <p v-if="!activeWheel.entries.length" class="wheel-empty">{{ selectedCategory.placeholder }}。先添加一个，就能开始转了。</p>
          <ol v-else class="wheel-entry-list">
            <li v-for="(entry, index) in activeWheel.entries" :key="entry.id">
              <span class="entry-number" :class="`entry-color-${index % 4}`">{{ index + 1 }}</span><div class="entry-title"><strong>{{ entry.label }}</strong><small>{{ entry.canManage ? '我添加的' : 'TA 添加的' }}</small></div>
              <div v-if="entry.canManage" class="entry-actions"><button type="button" :disabled="busy" :aria-label="`编辑 ${entry.label}`" @click="openEditor(entry)">编辑</button><button type="button" :disabled="busy" :aria-label="`删除 ${entry.label}`" @click="confirmDelete = entry.id">删除</button></div>
              <div v-if="confirmDelete === entry.id" class="delete-confirm"><span>从转盘移除这个选项？</span><button type="button" :disabled="saving" @click="removeEntry(entry)">{{ saving ? '移除中…' : '确认移除' }}</button><button type="button" :disabled="saving" @click="confirmDelete = ''">取消</button></div>
            </li>
          </ol>
          <p class="wheel-footnote">每类最多 30 个选项。抽中后仍保留在转盘里。</p>
        </section>
      </template>
    </main>
    <dialog ref="editor" class="wheel-editor" @cancel="cancelEditor" @click="closeOnBackdrop">
      <form @submit.prevent="saveEntry">
        <div class="editor-heading"><h2>{{ editingId ? '修改选项' : '添加一个选择' }}</h2><button type="button" aria-label="关闭" :disabled="saving" @click="closeEditor">×</button></div>
        <p>放进「{{ selectedCategory.label }}」</p>
        <label for="wheel-label">选项名称</label><input ref="labelInput" id="wheel-label" v-model="draft" maxlength="40" required :placeholder="selectedCategory.placeholder" :disabled="saving" autocomplete="off" />
        <div class="editor-meta"><span>餐厅、菜名、地点或一件想做的事</span><span>{{ draft.length }}/40</span></div>
        <p v-if="actionError" class="wheel-error" role="alert">{{ actionError }}</p>
        <button class="editor-save" type="submit" :disabled="saving || !draft.trim()">{{ saving ? '正在保存…' : '保存到转盘' }}</button>
      </form>
    </dialog>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import FeatureHeader from '../components/FeatureHeader.vue'
import DecisionWheelIcon from '../components/DecisionWheelIcon.vue'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { WHEEL_CATEGORIES, wheelLabel, wheelRotation, wheelSlice } from '../utils/decision-wheel.js'
const { onMessage, isConnected } = useWebSocket()
const category = ref('special'), wheels = ref([]), loading = ref(true), loadError = ref('')
const saving = ref(false), requesting = ref(false), spinning = ref(false), rotation = ref(0), spinEntries = ref([])
const actionError = ref(''), freshResult = ref(false), confirmDelete = ref(''), editorOpen = ref(false)
const editor = ref(null), labelInput = ref(null), draft = ref(''), editingId = ref(''), addId = ref('')
const selectedCategory = computed(() => WHEEL_CATEGORIES.find(item => item.id === category.value))
const activeWheel = computed(() => wheels.value.find(item => item.category === category.value) || { category: category.value, revision: 0, entries: [], lastDraw: null })
const visibleEntries = computed(() => spinning.value ? spinEntries.value : activeWheel.value.entries)
const result = computed(() => activeWheel.value.lastDraw)
const busy = computed(() => saving.value || requesting.value || spinning.value || editorOpen.value)
let spinTimer, unsubscribe, disposed = false, loadSequence = 0, queuedRefresh = false
const spinDuration = ref(3600)
let trigger, previousOverflow = '', editorRevision = 0
function alignResult() { const w = activeWheel.value; const i = w.entries.findIndex(e => e.id === w.lastDraw?.entryId); rotation.value = i < 0 ? 0 : (360 - i * 360 / w.entries.length) % 360 }
async function api(path = '', options = {}) {
  const response = await fetch(`${CONFIG.API_URL}/decision-wheels${path}`, { ...options, cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' } }).catch(() => { throw new Error('网络连接失败，请检查后重试。') })
  const body = await response.json().catch(() => ({}))
  if (!response.ok || !body.success) { const error = new Error(body.message || '网络暂时不可用，请重试。'); error.status = response.status; throw error }
  return body.data
}
function replaceWheel(wheel) { wheels.value = wheels.value.map(item => item.category === wheel.category ? wheel : item) }
async function load(silent = false) {
  if (spinning.value || requesting.value) { queuedRefresh = true; return }
  const sequence = ++loadSequence
  if (!silent) loading.value = true
  try {
    const data = await api()
    if (disposed || sequence !== loadSequence) return
    wheels.value = data.wheels.map(incoming => { const existing = wheels.value.find(w => w.category === incoming.category); return existing && existing.revision > incoming.revision ? existing : incoming })
    alignResult()
    loadError.value = ''
  } catch (error) {
    if (!disposed && sequence === loadSequence) loadError.value = error.message || '同步失败，请重试。'
  } finally { if (!disposed && sequence === loadSequence) loading.value = false }
}
function selectCategory(id) { category.value = id; alignResult(); freshResult.value = false; actionError.value = ''; confirmDelete.value = '' }
async function openEditor(entry) {
  editorRevision = activeWheel.value.revision; editingId.value = entry?.id || ''; addId.value = crypto.randomUUID(); draft.value = entry?.label || ''; actionError.value = ''; confirmDelete.value = ''
  trigger = document.activeElement; previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'
  editorOpen.value = true; editor.value.showModal(); await nextTick(); labelInput.value.focus()
}
function closeEditor() {
  if (saving.value) return
  editor.value.close(); editorOpen.value = false; document.body.style.overflow = previousOverflow; trigger?.focus()
}
function cancelEditor(event) { event.preventDefault(); closeEditor() }
function closeOnBackdrop(event) { if (event.target === editor.value) { const r = editor.value.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeEditor() } }
async function mutate(body) {
  saving.value = true; actionError.value = ''; ++loadSequence
  try { const saved = await api(`/${category.value}`, { method: 'PATCH', body: JSON.stringify({ ...body, revision: editorOpen.value ? editorRevision : activeWheel.value.revision }) }); replaceWheel(saved); alignResult(); freshResult.value = false; return true }
  catch (error) { actionError.value = error.message || '保存失败，输入已保留。'; if (error.status === 409) { await load(true); editorRevision = activeWheel.value.revision } return false }
  finally { saving.value = false }
}
async function saveEntry() { if (await mutate({ action: editingId.value ? 'edit' : 'add', id: editingId.value || addId.value, label: draft.value })) closeEditor() }
async function removeEntry(entry) { if (await mutate({ action: 'remove', id: entry.id })) confirmDelete.value = '' }
async function spin() {
  if (busy.value || !activeWheel.value.entries.length) return
  requesting.value = true; actionError.value = ''; freshResult.value = false; confirmDelete.value = ''; ++loadSequence
  try {
    const saved = await api(`/${category.value}/spin`, { method: 'POST', body: JSON.stringify({ requestId: crypto.randomUUID(), revision: activeWheel.value.revision }) })
    if (disposed) return
    spinEntries.value = saved.entries; replaceWheel(saved)
    const index = saved.entries.findIndex(item => item.id === saved.lastDraw.entryId)
    spinDuration.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 3600
    spinning.value = true; await nextTick()
    rotation.value = wheelRotation(rotation.value, index, saved.entries.length)
    spinTimer = setTimeout(() => {
      spinning.value = false; freshResult.value = true
      if (queuedRefresh) { queuedRefresh = false; load(true) }
    }, spinDuration.value + 30)
  } catch (error) { actionError.value = error.message || '这次没能转动，请再试一次。' }
  finally { requesting.value = false; if (!spinning.value && !disposed) { queuedRefresh = false; await load(true) } }
}
function refreshOnReturn() { if (document.visibilityState === 'visible') load(true) }
watch(isConnected, (connected, previous) => { if (connected && !previous) load(true) })
onMounted(() => { load(); unsubscribe = onMessage(message => { if (message.type === 'wheelSync' || message.type === 'connected') load(true) }); document.addEventListener('visibilitychange', refreshOnReturn); window.addEventListener('focus', refreshOnReturn) })
onUnmounted(() => { disposed = true; ++loadSequence; clearTimeout(spinTimer); unsubscribe?.(); document.removeEventListener('visibilitychange', refreshOnReturn); window.removeEventListener('focus', refreshOnReturn); if (editorOpen.value) document.body.style.overflow = previousOverflow })
</script>

<style scoped>
.wheel-header-icon { width: 44px; height: 44px; }
.wheel-page { min-height: 100dvh; color: var(--fellow-ink); background: var(--fellow-paper); font: 16px/1.5 var(--fellow-font-ui); padding-bottom: calc(var(--fellow-page-bottom-inset) + env(safe-area-inset-bottom, 0px)); }
.wheel-main { max-width: var(--fellow-content-max-width); margin: auto; padding: var(--fellow-space-4); }
.wheel-intro, .wheel-heading, .entries-heading, .editor-heading { display: flex; align-items: center; justify-content: space-between; gap: var(--fellow-space-3); }
h1, h2, p { margin: 0; } h1 { font-size: 24px; line-height: 1.3; } h2 { font-size: 18px; } p { line-height: 1.6; }
.wheel-intro p, .entries-heading p, .wheel-hint, .wheel-footnote, .wheel-empty { color: var(--fellow-text-secondary); font-size: 13px; }
.wheel-intro a { flex-shrink: 0; display: grid; place-items: center; min-height: var(--fellow-touch-target-min); color: var(--fellow-ink); font-size: 13px; text-underline-offset: 4px; }
button, input { font: inherit; color: inherit; } button { cursor: pointer; min-height: var(--fellow-touch-target-min); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); font-weight: 750; }
button:disabled { opacity: .5; cursor: not-allowed; } button:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid var(--fellow-ink); outline-offset: 3px; }
.wheel-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: var(--fellow-space-2); margin: var(--fellow-space-5) 0; }
.wheel-tabs button { padding: var(--fellow-space-2); font-size: 14px; } .wheel-tabs button:last-child { grid-column: 1 / -1; } .wheel-tabs button[aria-pressed="true"] { background: var(--fellow-yellow); box-shadow: var(--fellow-shadow-soft); }
.wheel-stage { padding: var(--fellow-space-4) var(--fellow-space-3); border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-card); background: var(--fellow-white); }
.wheel-heading span { flex-shrink: 0; font-size: 12px; } .wheel-hint { margin-top: var(--fellow-space-1); }
.wheel-disc-wrap { position: relative; margin: var(--fellow-space-5) auto var(--fellow-space-3); width: 100%; max-width: 340px; aspect-ratio: 1; overflow: hidden; }
.wheel-disc { width: 100%; height: 100%; display: block; transition-property: transform; transition-timing-function: cubic-bezier(.12,.72,.12,1); }
.wheel-empty-disc { fill: var(--fellow-paper); } .wheel-disc path, .wheel-disc g circle { stroke: var(--fellow-ink); stroke-width: 1.5; }
.wheel-color-0 { fill: var(--fellow-yellow); } .wheel-color-1 { fill: var(--fellow-mint); } .wheel-color-2 { fill: var(--fellow-pink); } .wheel-color-3 { fill: var(--fellow-blue); }
.wheel-disc text { fill: var(--fellow-ink); font-size: 13px; font-weight: 800; } .wheel-rim { fill: none; stroke: var(--fellow-ink); stroke-width: 4; }
.wheel-pointer { position: absolute; top: -4px; left: 50%; transform: translateX(-50%); z-index: var(--fellow-z-raised); width: 24px; height: 30px; background: var(--fellow-ink); clip-path: polygon(0 0, 100% 0, 50% 100%); }
.wheel-start { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 78px; height: 78px; border-radius: var(--fellow-radius-pill); border-width: 3px; box-shadow: var(--fellow-shadow-soft); font-size: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.wheel-start span { font-size: 22px; line-height: 1; } .wheel-result { text-align: center; display: grid; gap: var(--fellow-space-2); min-height: 100px; align-content: center; padding: var(--fellow-space-3); background: var(--fellow-paper); border-radius: var(--fellow-radius-control); }
.wheel-result > span { font-size: 12px; } .wheel-result strong { font-size: 21px; overflow-wrap: anywhere; line-height: 1.4; } .wheel-result small { color: var(--fellow-text-secondary); font-size: 12px; }
.wheel-entries { margin-top: var(--fellow-space-6); } .wheel-add { padding: 0 var(--fellow-space-3); background: var(--fellow-mint); flex-shrink: 0; } .entries-heading p { margin-top: var(--fellow-space-1); }
.wheel-entry-list { list-style: none; margin: var(--fellow-space-3) 0; padding: 0; } .wheel-entry-list li { display: flex; flex-wrap: wrap; align-items: center; gap: var(--fellow-space-2); border-bottom: 1px solid var(--fellow-ink); padding: var(--fellow-space-3) 0; }
.entry-number { display: grid; place-items: center; width: 28px; height: 28px; border: 1px solid var(--fellow-ink); border-radius: var(--fellow-radius-pill); font-weight: 800; font-size: 12px; }
.entry-color-0 { background: var(--fellow-yellow); } .entry-color-1 { background: var(--fellow-mint); } .entry-color-2 { background: var(--fellow-pink); } .entry-color-3 { background: var(--fellow-blue); }
.entry-title { flex: 1; min-width: 0; display: grid; gap: var(--fellow-space-1); } .entry-title strong { overflow-wrap: anywhere; font-size: 14px; } .entry-title small { color: var(--fellow-text-secondary); font-size: 11px; }
.entry-actions { display: flex; } .entry-actions button { border: 0; background: transparent; font-size: 12px; min-width: 44px; padding: var(--fellow-space-1); }
.delete-confirm { flex-basis: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: var(--fellow-space-2); font-size: 13px; } .delete-confirm button { padding: 0 var(--fellow-space-2); }
.wheel-footnote, .wheel-empty { padding: var(--fellow-space-3) 0; } .wheel-error { color: var(--fellow-color-danger); font-size: 14px; padding-top: var(--fellow-space-3); overflow-wrap: anywhere; }
.wheel-message { padding: var(--fellow-space-5) 0; display: grid; gap: var(--fellow-space-3); } .wheel-message button { justify-self: start; padding: 0 var(--fellow-space-4); }
.wheel-loading { text-align: center; padding: var(--fellow-space-6) 0; } .wheel-loading div { width: 100%; aspect-ratio: 1; border-radius: var(--fellow-radius-pill); background: var(--fellow-white); border: 2px dashed var(--fellow-ink); margin-bottom: var(--fellow-space-4); }
.wheel-editor { box-sizing: border-box; width: calc(100% - 32px); max-width: 398px; max-height: calc(100dvh - 32px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)); margin: auto; padding: var(--fellow-space-5); color: var(--fellow-ink); background: var(--fellow-paper); border: 3px solid var(--fellow-ink); border-radius: var(--fellow-radius-sheet); overflow-y: auto; }
.wheel-editor::backdrop { background: var(--fellow-ink); opacity: .55; } .editor-heading button { width: 44px; font-size: 24px; } .wheel-editor form > p { margin: var(--fellow-space-2) 0 var(--fellow-space-4); font-size: 13px; }
.wheel-editor label { display: block; font-weight: 700; margin-bottom: var(--fellow-space-2); } .wheel-editor input { box-sizing: border-box; width: 100%; min-height: 48px; border: 2px solid var(--fellow-ink); border-radius: var(--fellow-radius-control); background: var(--fellow-white); padding: var(--fellow-space-3); font-size: 16px; } .wheel-editor input::placeholder { color: var(--fellow-text-secondary); opacity: 1; }
.editor-meta { display: flex; justify-content: space-between; gap: var(--fellow-space-2); color: var(--fellow-text-secondary); font-size: 12px; margin: var(--fellow-space-2) 0 var(--fellow-space-5); } .editor-save { width: 100%; background: var(--fellow-mint); }
@media (prefers-reduced-motion: reduce) { .wheel-disc { transition: none; } }
</style>
