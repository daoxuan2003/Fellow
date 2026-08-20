<template>
    <div class="pg-page">
        <FeatureHeader title="考研计划" eyebrow="STUDY COMPANION" chapter="03" kind="study" />

        <main class="pg-main">
            <section v-if="loading" class="pg-loading" role="status" aria-live="polite">
                <span class="sr-only">正在同步考研进度</span>
                <div class="pg-loading-hero" aria-hidden="true">
                    <i></i><strong></strong><span></span>
                </div>
                <div v-for="index in 4" :key="index" class="pg-loading-subject" aria-hidden="true">
                    <i></i><span></span><b></b>
                </div>
            </section>

            <template v-else>
                <div v-if="loadError" class="pg-inline-error" role="alert">
                    <div>
                        <strong>暂时无法同步：</strong>
                        <span>{{ loadError }}，当前先展示固定初始进度。</span>
                    </div>
                    <button type="button" @click="loadProgress()">重试</button>
                </div>

                <section class="pg-intro" aria-labelledby="pg-phase-title">
                    <div class="pg-intro-meta">
                        <span class="pg-phase-chip">{{ plan.phase }}</span>
                        <span class="pg-source-chip">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                            </svg>
                            {{ plan.sourceLabel }}
                        </span>
                    </div>
                    <h1 id="pg-phase-title">一轮复习，正在稳稳推进</h1>
                    <p>四门科目按真实单位记录。每次学完多少就登记多少，完成感会留在每一条进度里。</p>
                    <div class="pg-intro-line" aria-label="计划范围">
                        <span>{{ plan.subjectCount }} 门科目</span>
                        <i aria-hidden="true"></i>
                        <span>{{ plan.trackCount }} 条进度</span>
                        <i aria-hidden="true"></i>
                        <span>{{ plan.pendingCount }} 项待定</span>
                    </div>
                </section>

                <section class="pg-progress-board" aria-labelledby="pg-progress-title">
                    <header class="pg-board-head">
                        <div>
                            <h2 id="pg-progress-title">当前学习进度</h2>
                            <p>一次可以登记多个，也可以随时修正</p>
                        </div>
                        <span>自动保存</span>
                    </header>

                    <article
                        v-for="subject in plan.subjects"
                        :key="subject.id"
                        class="pg-subject"
                        :class="[`pg-subject--${subject.tone}`, { 'is-complete': subject.complete }]"
                    >
                        <header class="pg-subject-head">
                            <div class="pg-subject-title">
                                <span class="pg-subject-mark" aria-hidden="true">{{ subject.name.slice(0, 1) }}</span>
                                <div>
                                    <h3>{{ subject.name }}</h3>
                                    <p>{{ subject.scope }}</p>
                                </div>
                            </div>
                            <span class="pg-subject-status">
                                <svg v-if="subject.complete" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="m5 12 4 4L19 6" />
                                </svg>
                                {{ subject.statusLabel }}
                            </span>
                        </header>

                        <p class="pg-current-summary">{{ subject.currentSummary }}</p>

                        <div class="pg-track-list">
                            <div v-for="track in subject.tracks" :key="track.id" class="pg-track">
                                <div class="pg-track-head">
                                    <span>{{ track.label }}</span>
                                    <strong>{{ track.current }} / {{ track.total }}</strong>
                                </div>
                                <div
                                    class="pg-track-rail"
                                    :class="{ 'is-complete': track.complete }"
                                    role="progressbar"
                                    :aria-label="`${subject.name}${track.label}`"
                                    :aria-valuenow="track.current"
                                    aria-valuemin="0"
                                    :aria-valuemax="track.total"
                                    :aria-valuetext="track.ariaText"
                                >
                                    <span class="pg-track-fill" :style="{ width: `${track.percent}%` }"></span>
                                </div>
                                <div class="pg-track-feedback">
                                    <span>{{ track.feedback }}</span>
                                    <output>{{ track.percent }}%</output>
                                </div>

                                <button
                                    type="button"
                                    class="pg-editor-toggle"
                                    :aria-expanded="editorKey === trackKey(subject, track)"
                                    :aria-controls="`editor-${trackKey(subject, track)}`"
                                    @click="toggleEditor(subject, track)"
                                >
                                    {{ editorKey === trackKey(subject, track) ? '收起登记' : '登记进度' }}
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 5v14M5 12h14" />
                                    </svg>
                                </button>

                                <div
                                    v-if="editorKey === trackKey(subject, track)"
                                    :id="`editor-${trackKey(subject, track)}`"
                                    class="pg-track-editor"
                                    :aria-busy="mutationKey === trackKey(subject, track)"
                                >
                                    <div class="pg-editor-title">
                                        <strong>这次推进了多少？</strong>
                                        <span>当前 {{ track.current }} / {{ track.total }}</span>
                                    </div>

                                    <div class="pg-quick-amounts" aria-label="常用数量">
                                        <button
                                            v-for="amount in track.quickAmounts"
                                            :key="amount"
                                            type="button"
                                            :class="{ active: currentAmount(subject, track) === amount }"
                                            @click="setAmount(subject, track, amount)"
                                        >{{ amount }}</button>
                                    </div>

                                    <label class="pg-custom-amount">
                                        <span>自定义数量</span>
                                        <input
                                            type="number"
                                            inputmode="numeric"
                                            min="1"
                                            :max="track.total"
                                            :value="currentAmount(subject, track)"
                                            @input="setAmount(subject, track, $event.target.value)"
                                        />
                                        <em>{{ track.unit }}</em>
                                    </label>

                                    <p class="pg-editor-limit">
                                        还能登记 {{ track.remaining }} {{ track.unit }}，当前最多可修正 {{ track.current }} {{ track.unit }}
                                    </p>

                                    <div class="pg-editor-actions">
                                        <button
                                            type="button"
                                            class="pg-correct-btn"
                                            :disabled="!canAdjust(subject, track, 'decrement')"
                                            @click="adjustProgress(subject, track, 'decrement')"
                                        >
                                            <span v-if="mutationKey === trackKey(subject, track) && mutationAction === 'decrement'">保存中...</span>
                                            <span v-else>修正减少 {{ currentAmount(subject, track) }} {{ track.unit }}</span>
                                        </button>
                                        <button
                                            type="button"
                                            class="pg-complete-btn"
                                            :disabled="!canAdjust(subject, track, 'increment')"
                                            @click="adjustProgress(subject, track, 'increment')"
                                        >
                                            <span v-if="mutationKey === trackKey(subject, track) && mutationAction === 'increment'">保存中...</span>
                                            <span v-else>登记完成 {{ currentAmount(subject, track) }} {{ track.unit }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="subject.pending" class="pg-pending-row">
                            <span>{{ subject.pending.label }}</span>
                            <strong>{{ subject.pending.value }}</strong>
                            <small>{{ subject.pending.note }}</small>
                        </div>
                        <p v-if="subject.note" class="pg-subject-note">{{ subject.note }}</p>
                    </article>
                </section>

                <aside class="pg-sync-note" aria-label="进度保存说明">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m5 12 4 4L19 6" />
                    </svg>
                    <div>
                        <strong>学完就从这里登记</strong>
                        <p>数量会自动保存并同步给伴侣，日常更新不再需要修改程序。</p>
                    </div>
                </aside>
            </template>
        </main>

        <div
            class="pg-toast"
            :class="['pg-achievement', { show: toast.show }, toast.type]"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <span class="pg-achievement-mark" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
            </span>
            <div>
                <strong>{{ toast.title }}</strong>
                <p>{{ toast.detail }}</p>
            </div>
        </div>
    </div>
</template>

<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import FeatureHeader from '../components/FeatureHeader.vue'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { getPostgraduatePlan } from '../data/postgraduate-plan.js'

const plan = ref(getPostgraduatePlan())
const loading = ref(true)
const loadError = ref('')
const editorKey = ref('')
const mutationKey = ref('')
const mutationAction = ref('')
const amountDrafts = reactive({})
const toast = reactive({ show: false, title: '', detail: '', type: 'success' })
const { onMessage } = useWebSocket()
let unsubscribeWS = null
let toastTimer = null

const getToken = () => localStorage.getItem('token')
const trackKey = (subject, track) => `${subject.id}-${track.id}`

const loadProgress = async ({ silent = false } = {}) => {
    if (!silent) loading.value = true
    const token = getToken()
    if (!token) {
        loadError.value = '登录状态已失效'
        loading.value = false
        return
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '同步失败')
        plan.value = getPostgraduatePlan(json.data)
        loadError.value = ''
    } catch (error) {
        loadError.value = error?.message === 'Failed to fetch'
            ? '网络连接异常'
            : (error?.message || '网络错误')
    } finally {
        loading.value = false
    }
}

const showToast = (title, detail, type = 'success') => {
    if (toastTimer) clearTimeout(toastTimer)
    toast.title = title
    toast.detail = detail
    toast.type = type
    toast.show = true
    toastTimer = setTimeout(() => { toast.show = false }, 2800)
}

const currentAmount = (subject, track) => {
    const value = Number(amountDrafts[trackKey(subject, track)])
    return Number.isInteger(value) && value > 0 ? value : 1
}

const setAmount = (subject, track, value) => {
    const normalized = Math.min(track.total, Math.max(1, Math.floor(Number(value) || 1)))
    amountDrafts[trackKey(subject, track)] = normalized
}

const toggleEditor = (subject, track) => {
    const key = trackKey(subject, track)
    editorKey.value = editorKey.value === key ? '' : key
    if (!amountDrafts[key]) amountDrafts[key] = track.quickAmounts?.[0] || 1
}

const canAdjust = (subject, track, action) => {
    const key = trackKey(subject, track)
    const amount = currentAmount(subject, track)
    if (loadError.value || mutationKey.value) return false
    if (action === 'increment') return amount <= track.remaining
    return amount <= track.current
}

const adjustProgress = async (subject, track, action) => {
    if (!canAdjust(subject, track, action)) return
    const key = trackKey(subject, track)
    const amount = currentAmount(subject, track)
    mutationKey.value = key
    mutationAction.value = action

    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate/progress`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                subjectKey: subject.id,
                trackKey: track.id,
                action,
                amount
            })
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '保存失败')

        plan.value = getPostgraduatePlan({ subjects: json.data.subjects })
        const updatedSubject = plan.value.subjects.find(item => item.id === subject.id)
        const updatedTrack = updatedSubject?.tracks.find(item => item.id === track.id)
        editorKey.value = ''

        if (!json.data.changed) {
            showToast('没有改动', json.message, 'info')
        } else if (action === 'decrement') {
            showToast('进度已修正', `${subject.name} · ${track.label} 现在是 ${updatedTrack.current}/${updatedTrack.total}`, 'info')
        } else if (updatedTrack.complete) {
            showToast('这一条全部完成！', `${subject.name} · ${track.label} 已经到达 100%`, 'success')
        } else {
            showToast(`本次完成 ${amount} ${track.unit}`, `${subject.name} · ${track.label} 来到 ${updatedTrack.current}/${updatedTrack.total} · ${updatedTrack.percent}%`, 'success')
        }
    } catch (error) {
        showToast('进度没有保存', error?.message || '请稍后重试', 'error')
    } finally {
        mutationKey.value = ''
        mutationAction.value = ''
    }
}

onMounted(() => {
    loadProgress()
    unsubscribeWS = onMessage(message => {
        if (message.type === 'postgraduateSync' && !mutationKey.value) loadProgress({ silent: true })
    })
})

onUnmounted(() => {
    if (unsubscribeWS) unsubscribeWS()
    if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.pg-page {
    min-height: 100dvh;
    color: var(--fellow-ink);
    background: var(--fellow-paper);
}

.pg-main {
    width: 100%;
    max-width: 460px;
    margin: 0 auto;
    padding: var(--fellow-space-4) var(--fellow-space-4) calc(96px + env(safe-area-inset-bottom, 0px));
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
}

.pg-loading {
    display: grid;
    gap: var(--fellow-space-3);
}

.pg-loading-hero,
.pg-loading-subject {
    display: grid;
    align-items: center;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-4);
    background: var(--fellow-white);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
}

.pg-loading-hero {
    grid-template-columns: 64px 1fr;
    min-height: 150px;
    background: var(--fellow-blue);
}

.pg-loading-hero i,
.pg-loading-subject i {
    display: block;
    width: 44px;
    height: 32px;
    background: var(--fellow-yellow);
    border: 2px solid var(--fellow-ink);
    border-radius: 8px;
}

.pg-loading-hero strong,
.pg-loading-hero span,
.pg-loading-subject span,
.pg-loading-subject b {
    display: block;
    height: 14px;
    background: color-mix(in srgb, var(--fellow-ink) 16%, var(--fellow-white));
    border-radius: 5px;
    animation: pg-loading-pulse 1.1s ease-in-out infinite alternate;
}

.pg-loading-hero span { grid-column: 1 / -1; width: 70%; }
.pg-loading-subject { grid-template-columns: 44px 1fr 48px; min-height: 72px; }
.pg-loading-subject b { height: 24px; }

@keyframes pg-loading-pulse {
    to { opacity: 0.42; }
}

.pg-inline-error,
.pg-intro-meta,
.pg-intro-line,
.pg-board-head,
.pg-subject-head,
.pg-subject-title,
.pg-track-head,
.pg-track-feedback,
.pg-editor-title,
.pg-quick-amounts,
.pg-pending-row,
.pg-sync-note,
.pg-achievement {
    display: flex;
    align-items: center;
}

.pg-inline-error {
    justify-content: space-between;
    gap: var(--fellow-space-3);
    margin-bottom: var(--fellow-space-4);
    padding: var(--fellow-space-3);
    color: var(--fellow-ink);
    background: var(--fellow-yellow);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
}

.pg-inline-error strong,
.pg-inline-error span {
    display: block;
}

.pg-inline-error strong { font-size: 13px; font-weight: 950; }
.pg-inline-error span { margin-top: 2px; font-size: 11px; font-weight: 650; line-height: 1.45; }

.pg-inline-error button,
.pg-editor-toggle,
.pg-quick-amounts button,
.pg-editor-actions button {
    color: var(--fellow-ink);
    border: 2px solid var(--fellow-ink);
    font-weight: 900;
}

.pg-inline-error button {
    flex: 0 0 auto;
    min-height: var(--fellow-touch-target-min);
    padding: 8px 12px;
    background: var(--fellow-white);
    border-radius: var(--fellow-radius-control);
}

.pg-intro {
    padding: var(--fellow-space-5);
    color: var(--fellow-ink);
    background: var(--fellow-blue);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
    box-shadow: var(--fellow-shadow-raised);
}

.pg-intro-meta,
.pg-board-head,
.pg-subject-head,
.pg-track-head,
.pg-track-feedback,
.pg-editor-title {
    justify-content: space-between;
    gap: var(--fellow-space-3);
}

.pg-phase-chip,
.pg-source-chip,
.pg-subject-status {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 5px 10px;
    border: 2px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-pill);
    font-size: 12px;
    font-weight: 900;
    line-height: 1;
    white-space: nowrap;
}

.pg-phase-chip { background: var(--fellow-yellow); }
.pg-source-chip { gap: 5px; background: var(--fellow-white); }

.pg-source-chip svg,
.pg-sync-note > svg {
    width: 16px;
    height: 16px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.pg-intro h1 {
    margin: var(--fellow-space-5) 0 var(--fellow-space-2);
    font: 950 25px/1.28 var(--fellow-font-ui);
    letter-spacing: -0.035em;
    text-wrap: balance;
}

.pg-intro > p {
    max-width: 32em;
    margin: 0;
    font-size: 14px;
    font-weight: 650;
    line-height: 1.65;
    text-wrap: pretty;
}

.pg-intro-line {
    flex-wrap: wrap;
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-4);
    font-size: 12px;
    font-weight: 850;
}

.pg-intro-line i {
    width: 5px;
    height: 5px;
    background: var(--fellow-ink);
    border-radius: 50%;
}

.pg-progress-board {
    margin-top: var(--fellow-space-5);
    overflow: hidden;
    background: var(--fellow-white);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
    box-shadow: var(--fellow-shadow-soft);
}

.pg-board-head {
    padding: var(--fellow-space-4) var(--fellow-space-4) var(--fellow-space-3);
    border-bottom: 3px solid var(--fellow-ink);
}

.pg-board-head h2,
.pg-board-head p,
.pg-subject h3,
.pg-subject p,
.pg-track span,
.pg-sync-note p,
.pg-achievement p {
    margin: 0;
}

.pg-board-head h2 { font-size: 18px; font-weight: 950; letter-spacing: -0.025em; }
.pg-board-head p { margin-top: 3px; font-size: 12px; font-weight: 650; }

.pg-board-head > span {
    flex: 0 0 auto;
    padding: 5px 8px;
    background: var(--fellow-yellow);
    border: 2px solid var(--fellow-ink);
    border-radius: 8px;
    font-size: 11px;
    font-weight: 900;
}

.pg-subject {
    --subject-accent: var(--fellow-blue);
    padding: var(--fellow-space-5) var(--fellow-space-4);
    background: color-mix(in srgb, var(--subject-accent) 10%, var(--fellow-white));
}

.pg-subject + .pg-subject { border-top: 3px solid var(--fellow-ink); }
.pg-subject--orange { --subject-accent: var(--fellow-orange); }
.pg-subject--mint { --subject-accent: var(--fellow-mint); }
.pg-subject--pink { --subject-accent: var(--fellow-pink); }

.pg-subject-title { min-width: 0; gap: var(--fellow-space-3); }

.pg-subject-mark {
    display: grid;
    flex: 0 0 42px;
    width: 42px;
    height: 42px;
    place-items: center;
    background: var(--subject-accent);
    border: 3px solid var(--fellow-ink);
    border-radius: 10px;
    box-shadow: 2px 3px 0 var(--fellow-ink);
    font-size: 18px;
    font-weight: 950;
}

.pg-subject h3 { font-size: 18px; font-weight: 950; letter-spacing: -0.02em; }
.pg-subject-title p { margin-top: 2px; font-size: 12px; font-weight: 700; }
.pg-subject-status { flex: 0 0 auto; background: var(--fellow-white); }

.pg-subject-status svg {
    width: 14px;
    height: 14px;
    margin-right: 4px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.pg-subject.is-complete .pg-subject-status { background: var(--fellow-mint); }

.pg-subject .pg-current-summary {
    margin-top: var(--fellow-space-4);
    font-size: 13px;
    font-weight: 850;
    line-height: 1.5;
}

.pg-track-list { display: grid; gap: var(--fellow-space-5); margin-top: var(--fellow-space-4); }
.pg-track-head { margin-bottom: 7px; font-size: 13px; }
.pg-track-head span { font-weight: 750; }

.pg-track-head strong,
.pg-track-feedback output {
    font-variant-numeric: tabular-nums;
    font-weight: 950;
}

.pg-track-rail {
    position: relative;
    height: 18px;
    overflow: hidden;
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-pill);
}

.pg-track-fill {
    display: block;
    width: 0;
    height: 100%;
    min-width: 4px;
    background: var(--subject-accent);
    border-right: 2px solid var(--fellow-ink);
    transition: width var(--fellow-motion-standard) var(--fellow-ease-emphasized);
}

.pg-track-rail.is-complete .pg-track-fill {
    min-width: 100%;
    background: var(--fellow-mint);
    border-right: 0;
}

.pg-track-feedback {
    align-items: flex-start;
    margin-top: 7px;
    font-size: 11px;
    font-weight: 650;
    line-height: 1.45;
}

.pg-track-feedback span { min-width: 0; }
.pg-track-feedback output { flex: 0 0 auto; font-size: 12px; }

.pg-editor-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-height: var(--fellow-touch-target-min);
    margin-top: var(--fellow-space-2);
    padding: 8px 11px;
    background: var(--fellow-white);
    border-radius: var(--fellow-radius-control);
}

.pg-editor-toggle svg {
    width: 15px;
    height: 15px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2.5;
    stroke-linecap: round;
    transition: transform var(--fellow-motion-fast) var(--fellow-ease-standard);
}

.pg-editor-toggle[aria-expanded="true"] svg { transform: rotate(45deg); }

.pg-track-editor {
    margin-top: var(--fellow-space-2);
    padding: var(--fellow-space-3);
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-control);
}

.pg-editor-title strong { font-size: 13px; font-weight: 950; }
.pg-editor-title span { font-size: 11px; font-weight: 750; }

.pg-quick-amounts {
    flex-wrap: wrap;
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-3);
}

.pg-quick-amounts button {
    min-width: 44px;
    min-height: 40px;
    padding: 6px 12px;
    background: var(--fellow-white);
    border-radius: 9px;
}

.pg-quick-amounts button.active { background: var(--subject-accent); }

.pg-custom-amount {
    display: grid;
    grid-template-columns: auto minmax(64px, 1fr) auto;
    align-items: center;
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-3);
    font-size: 12px;
    font-weight: 800;
}

.pg-custom-amount input {
    width: 100%;
    min-height: var(--fellow-touch-target-min);
    padding: 8px 10px;
    color: var(--fellow-ink);
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: 9px;
    font: 900 16px/1 var(--fellow-font-number);
}

.pg-custom-amount em { font-style: normal; white-space: nowrap; }

.pg-subject .pg-editor-limit {
    margin-top: var(--fellow-space-2);
    font-size: 11px;
    font-weight: 650;
    line-height: 1.45;
}

.pg-editor-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr);
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-3);
}

.pg-editor-actions button {
    min-height: var(--fellow-touch-target-min);
    padding: 8px;
    border-radius: var(--fellow-radius-control);
    font-size: 12px;
}

.pg-correct-btn { background: var(--fellow-white); }
.pg-complete-btn { background: var(--fellow-mint); }

.pg-editor-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.42;
}

.pg-pending-row {
    display: grid;
    grid-template-columns: auto auto minmax(0, 1fr);
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-4);
    padding-top: var(--fellow-space-3);
    border-top: 2px dashed var(--fellow-ink);
    font-size: 12px;
}

.pg-pending-row span,
.pg-pending-row strong { white-space: nowrap; }
.pg-pending-row strong { padding: 2px 6px; background: var(--fellow-yellow); border-radius: 5px; }
.pg-pending-row small { align-self: center; line-height: 1.45; text-align: right; }

.pg-subject .pg-subject-note {
    margin-top: var(--fellow-space-3);
    padding-top: var(--fellow-space-3);
    border-top: 2px dashed var(--fellow-ink);
    font-size: 12px;
    font-weight: 650;
    line-height: 1.5;
}

.pg-sync-note {
    align-items: flex-start;
    gap: var(--fellow-space-3);
    margin-top: var(--fellow-space-5);
    padding: var(--fellow-space-4);
    background: var(--fellow-yellow);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
}

.pg-sync-note > svg { flex: 0 0 22px; width: 22px; height: 22px; stroke-width: 3; }
.pg-sync-note strong { display: block; font-size: 14px; font-weight: 950; }
.pg-sync-note p { margin-top: 4px; font-size: 12px; font-weight: 650; line-height: 1.55; }

.pg-achievement {
    position: fixed;
    right: max(var(--fellow-space-4), calc((100vw - 460px) / 2 + var(--fellow-space-4)));
    bottom: calc(88px + env(safe-area-inset-bottom, 0px));
    left: max(var(--fellow-space-4), calc((100vw - 460px) / 2 + var(--fellow-space-4)));
    z-index: var(--fellow-z-toast);
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-3);
    pointer-events: none;
    opacity: 0;
    transform: translateY(12px);
    background: var(--fellow-mint);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
    box-shadow: var(--fellow-shadow-raised);
    transition: opacity var(--fellow-motion-standard) var(--fellow-ease-standard), transform var(--fellow-motion-standard) var(--fellow-ease-emphasized);
}

.pg-achievement.show { opacity: 1; transform: translateY(0); }
.pg-achievement.info { background: var(--fellow-yellow); }
.pg-achievement.error { background: var(--fellow-pink); }

.pg-achievement-mark {
    display: grid;
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    place-items: center;
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: 50%;
}

.pg-achievement-mark svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.pg-achievement strong { display: block; font-size: 14px; font-weight: 950; }
.pg-achievement p { margin-top: 2px; font-size: 11px; font-weight: 700; line-height: 1.45; }

.pg-inline-error button:focus-visible,
.pg-editor-toggle:focus-visible,
.pg-quick-amounts button:focus-visible,
.pg-custom-amount input:focus-visible,
.pg-editor-actions button:focus-visible {
    outline: 3px solid var(--fellow-blue);
    outline-offset: 2px;
}

@media (max-width: 340px) {
    .pg-main { padding-right: var(--fellow-space-3); padding-left: var(--fellow-space-3); }
    .pg-intro,
    .pg-subject { padding-right: var(--fellow-space-3); padding-left: var(--fellow-space-3); }
    .pg-board-head,
    .pg-subject-head { align-items: flex-start; }
    .pg-subject-mark { flex-basis: 38px; width: 38px; height: 38px; }
    .pg-pending-row { grid-template-columns: auto 1fr; }
    .pg-pending-row small { grid-column: 1 / -1; text-align: left; }
    .pg-editor-actions { grid-template-columns: 1fr; }
    .pg-custom-amount { grid-template-columns: 1fr auto; }
    .pg-custom-amount > span { grid-column: 1 / -1; }
}

@media (prefers-reduced-motion: reduce) {
    .pg-loading-hero strong,
    .pg-loading-hero span,
    .pg-loading-subject span,
    .pg-loading-subject b { animation: none; }
    .pg-track-fill,
    .pg-editor-toggle svg,
    .pg-achievement { transition: none; }
}
</style>
