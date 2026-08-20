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

                <section class="pg-daily-board" aria-labelledby="pg-daily-title">
                    <header class="pg-daily-head">
                        <div>
                            <h2 id="pg-daily-title">今日任务板</h2>
                            <p>你写下任务，对方负责打卡划掉</p>
                        </div>
                        <span class="pg-daily-count" aria-live="polite">
                            {{ activeTaskDay.completed }} / {{ activeTaskDay.total }} 已完成
                        </span>
                    </header>

                    <div class="pg-encouragement" :class="`is-${dailyEncouragement.tone}`">
                        <span class="pg-encouragement-mark" aria-hidden="true">
                            <svg viewBox="0 0 24 24">
                                <path d="M8 3h8M9 3v3m6-3v3M6 6h12v15H6z" />
                                <path d="m9 13 2 2 4-5" />
                            </svg>
                        </span>
                        <div>
                            <strong>{{ dailyEncouragement.title }}</strong>
                            <p>{{ dailyEncouragement.detail }}</p>
                        </div>
                    </div>

                    <div class="pg-day-tabs" role="tablist" aria-label="任务日期">
                        <button
                            id="pg-tab-today"
                            type="button"
                            role="tab"
                            :aria-selected="activeTaskTab === 'today'"
                            aria-controls="pg-task-panel"
                            :tabindex="activeTaskTab === 'today' ? 0 : -1"
                            @click="selectTaskTab('today')"
                            @keydown="handleTaskTabKeydown"
                        >
                            今天
                            <span>{{ taskBoard.today.total }}</span>
                        </button>
                        <button
                            id="pg-tab-yesterday"
                            type="button"
                            role="tab"
                            :aria-selected="activeTaskTab === 'yesterday'"
                            aria-controls="pg-task-panel"
                            :tabindex="activeTaskTab === 'yesterday' ? 0 : -1"
                            @click="selectTaskTab('yesterday')"
                            @keydown="handleTaskTabKeydown"
                        >
                            昨天
                            <span>{{ taskBoard.yesterday.total }}</span>
                        </button>
                    </div>

                    <div
                        id="pg-task-panel"
                        class="pg-task-panel"
                        role="tabpanel"
                        :aria-labelledby="activeTaskTab === 'today' ? 'pg-tab-today' : 'pg-tab-yesterday'"
                    >
                        <div v-if="taskLoading" class="pg-task-loading" role="status" aria-live="polite">
                            <span class="sr-only">正在同步今日任务</span>
                            <i v-for="index in 3" :key="index" aria-hidden="true"></i>
                        </div>

                        <div v-else-if="taskError" class="pg-task-error" role="alert">
                            <div>
                                <strong>任务清单没有同步</strong>
                                <p>{{ taskError }}</p>
                            </div>
                            <button type="button" @click="loadDailyTasks()">重试</button>
                        </div>

                        <template v-else>
                            <div v-if="activeTaskTab === 'today'" class="pg-task-launch">
                                <div>
                                    <strong>安排今天要做的事</strong>
                                    <p>打开后每行写一项，一次可以添加多项。</p>
                                </div>
                                <button
                                    ref="taskComposerTrigger"
                                    type="button"
                                    class="pg-open-composer"
                                    :disabled="Boolean(taskMutationKey)"
                                    aria-haspopup="dialog"
                                    @click="openTaskComposer"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                                    添加今日任务
                                </button>
                            </div>

                            <div v-if="activeTaskTab === 'yesterday'" class="pg-yesterday-summary">
                                <div>
                                    <strong>{{ formatTaskDate(activeTaskDay.date) }}</strong>
                                    <span>{{ activeTaskDay.completed }} / {{ activeTaskDay.total }} 项完成</span>
                                </div>
                                <span class="pg-readonly-badge">只读记录</span>
                            </div>

                            <p v-if="taskMutationError && !taskComposerOpen" class="pg-task-mutation-error" role="alert">
                                {{ taskMutationError }}
                            </p>

                            <ul v-if="activeTaskDay.tasks.length" class="pg-task-list">
                                <li
                                    v-for="task in activeTaskDay.tasks"
                                    :key="task.id"
                                    :class="{ 'is-complete': task.completed }"
                                >
                                    <label
                                        v-if="activeTaskTab === 'today' && task.canToggle"
                                        class="pg-task-checkbox"
                                        :class="{ checked: task.completed }"
                                        :aria-label="task.completed ? `撤销打卡：${task.text}` : `打卡完成：${task.text}`"
                                    >
                                        <input
                                            type="checkbox"
                                            :checked="task.completed"
                                            :disabled="Boolean(taskMutationKey)"
                                            @change="toggleDailyTask(task, $event)"
                                        />
                                        <span aria-hidden="true">
                                            <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                                        </span>
                                    </label>
                                    <span
                                        v-else
                                        class="pg-task-static-mark"
                                        :class="{ checked: task.completed }"
                                        aria-hidden="true"
                                    >
                                        <svg v-if="task.completed" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>
                                        <svg v-else viewBox="0 0 24 24"><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="8" /></svg>
                                    </span>

                                    <div class="pg-task-copy">
                                        <p>{{ task.text }}</p>
                                        <div class="pg-task-meta">
                                            <span :class="task.isMine ? 'is-mine' : 'is-partner'">
                                                {{ task.isMine ? '我写的' : '对方写的' }}
                                            </span>
                                            <small>{{ activeTaskTab === 'yesterday' ? (task.completed ? '已完成' : '未完成') : task.stateLabel }}</small>
                                        </div>
                                    </div>

                                    <button
                                        v-if="activeTaskTab === 'today' && task.canDelete"
                                        type="button"
                                        class="pg-delete-task"
                                        :disabled="Boolean(taskMutationKey)"
                                        :aria-label="`删除任务：${task.text}`"
                                        @click="deleteDailyTask(task)"
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5" />
                                        </svg>
                                    </button>
                                </li>
                            </ul>

                            <div v-else class="pg-task-empty">
                                <span aria-hidden="true">
                                    <svg viewBox="0 0 24 24"><path d="M7 4h10v16H7zM10 9h4m-4 4h4" /></svg>
                                </span>
                                <strong>{{ activeTaskTab === 'today' ? '今天还没有任务' : '昨天没有写任务' }}</strong>
                                <p v-if="activeTaskTab === 'today'">点击“添加今日任务”，从一件真正准备完成的小事开始。</p>
                                <p v-else>昨天没有清单记录，今天可以重新写下新的安排。</p>
                            </div>
                        </template>
                    </div>
                </section>

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

        <Teleport to="body">
            <div
                v-if="taskComposerOpen"
                class="pg-composer-overlay"
                @click.self="closeTaskComposer()"
            >
                <section
                    ref="taskComposerDialog"
                    class="pg-composer-dialog"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="pg-composer-title"
                    aria-describedby="pg-composer-description"
                    @keydown="handleTaskComposerKeydown"
                >
                    <header class="pg-composer-head">
                        <div>
                            <span>今日任务</span>
                            <h2 id="pg-composer-title">一次安排多件事</h2>
                            <p id="pg-composer-description">写完会同步给对方，由对方来打卡划掉。</p>
                        </div>
                        <button
                            type="button"
                            class="pg-close-composer"
                            :disabled="taskMutationKey === 'create'"
                            aria-label="关闭添加今日任务"
                            @click="closeTaskComposer()"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                        </button>
                    </header>

                    <form
                        class="pg-task-composer"
                        :aria-busy="taskMutationKey === 'create'"
                        @submit.prevent="createDailyTasks"
                    >
                        <label for="pg-task-draft">把今天真正要做的事写下来</label>
                        <textarea
                            id="pg-task-draft"
                            :value="taskDraft"
                            rows="4"
                            maxlength="1000"
                            placeholder="例如：看 3 个有机化学视频&#10;整理高数第八讲错题"
                            :aria-describedby="taskDraftTouched && !taskDraftState.valid ? 'pg-task-draft-help pg-task-draft-error' : 'pg-task-draft-help'"
                            @input="updateTaskDraft"
                        ></textarea>
                        <div id="pg-task-draft-help" class="pg-draft-meta">
                            <span>每行一项，一次最多 12 项</span>
                            <strong>{{ taskDraftState.count }} 项待添加</strong>
                        </div>
                        <p
                            v-if="taskDraftTouched && !taskDraftState.valid"
                            id="pg-task-draft-error"
                            class="pg-draft-error"
                            role="alert"
                        >{{ taskDraftState.error }}</p>
                        <p v-if="taskMutationError" class="pg-composer-error" role="alert">
                            {{ taskMutationError }}
                        </p>

                        <div class="pg-composer-actions">
                            <button
                                type="button"
                                class="pg-cancel-task"
                                :disabled="taskMutationKey === 'create'"
                                @click="closeTaskComposer()"
                            >暂不添加</button>
                            <button
                                type="submit"
                                class="pg-add-task"
                                :disabled="!taskDraftState.valid || Boolean(taskMutationKey)"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                                <span v-if="taskMutationKey === 'create'">正在写入...</span>
                                <span v-else-if="taskDraftState.count > 1">一次添加 {{ taskDraftState.count }} 项</span>
                                <span v-else>添加到今日清单</span>
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </Teleport>

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
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import FeatureHeader from '../components/FeatureHeader.vue'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { getPostgraduatePlan } from '../data/postgraduate-plan.js'
import {
    buildDailyEncouragement,
    getCalendarDateString,
    normalizeDailyTaskBoard,
    validateDailyTaskDraft
} from '../utils/postgraduate-daily-board.js'

const plan = ref(getPostgraduatePlan())
const loading = ref(true)
const loadError = ref('')
const editorKey = ref('')
const mutationKey = ref('')
const mutationAction = ref('')
const amountDrafts = reactive({})
const taskBoard = ref(normalizeDailyTaskBoard())
const activeTaskTab = ref('today')
const taskLoading = ref(true)
const taskError = ref('')
const taskMutationError = ref('')
const taskMutationKey = ref('')
const taskDraft = ref('')
const taskDraftTouched = ref(false)
const taskDraftRequestId = ref('')
const taskComposerOpen = ref(false)
const taskComposerDialog = ref(null)
const taskComposerTrigger = ref(null)
const toast = reactive({ show: false, title: '', detail: '', type: 'success' })
const { onMessage } = useWebSocket()
let unsubscribeWS = null
let toastTimer = null
let taskDayTimer = null
let taskComposerPreviousBodyOverflow = ''

const getToken = () => localStorage.getItem('token')
const trackKey = (subject, track) => `${subject.id}-${track.id}`
const taskDraftState = computed(() => validateDailyTaskDraft(taskDraft.value))
const activeTaskDay = computed(() => taskBoard.value[activeTaskTab.value])
const dailyEncouragement = computed(() => buildDailyEncouragement(taskBoard.value.yesterday))

const createRequestId = () => globalThis.crypto?.randomUUID?.()
    || `daily_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`

const formatTaskDate = date => {
    const [, month, day] = String(date || '').split('-').map(Number)
    return month && day ? `${month}月${day}日` : '昨天'
}

const selectTaskTab = tab => {
    activeTaskTab.value = tab === 'yesterday' ? 'yesterday' : 'today'
    taskMutationError.value = ''
}

const handleTaskTabKeydown = event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const tab = event.key === 'ArrowLeft' || event.key === 'Home' ? 'today' : 'yesterday'
    selectTaskTab(tab)
    window.requestAnimationFrame(() => document.getElementById(`pg-tab-${tab}`)?.focus())
}

const openTaskComposer = () => {
    taskMutationError.value = ''
    taskDraftTouched.value = false
    taskComposerPreviousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    taskComposerOpen.value = true
    window.requestAnimationFrame(() => document.getElementById('pg-task-draft')?.focus())
}

const closeTaskComposer = ({ force = false, restoreFocus = true } = {}) => {
    if (!taskComposerOpen.value || (!force && taskMutationKey.value === 'create')) return
    taskComposerOpen.value = false
    taskMutationError.value = ''
    taskDraftTouched.value = false
    document.body.style.overflow = taskComposerPreviousBodyOverflow
    if (restoreFocus) window.requestAnimationFrame(() => taskComposerTrigger.value?.focus())
}

const handleTaskComposerKeydown = event => {
    if (event.key === 'Escape') {
        event.preventDefault()
        closeTaskComposer()
        return
    }
    if (event.key !== 'Tab') return

    const controls = [...(taskComposerDialog.value?.querySelectorAll(
        'button:not(:disabled), textarea:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])'
    ) || [])]
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
    }
}

const updateTaskDraft = event => {
    taskDraft.value = event.target.value
    taskDraftTouched.value = true
    taskDraftRequestId.value = ''
    taskMutationError.value = ''
}

const replaceDailyTask = nextTask => {
    const today = taskBoard.value.today
    const tasks = today.tasks.map(task => task.id === nextTask.id ? nextTask : task)
    taskBoard.value = normalizeDailyTaskBoard({
        today: { ...today, tasks },
        yesterday: taskBoard.value.yesterday
    })
}

const mergeCreatedTasks = createdTasks => {
    const today = taskBoard.value.today
    const createdDate = String(createdTasks[0]?.date || today.date)
    const sameDay = !today.date || today.date === createdDate
    const knownIds = new Set(sameDay ? today.tasks.map(task => task.id) : [])
    const tasks = [
        ...(sameDay ? today.tasks : []),
        ...createdTasks.filter(task => !knownIds.has(task.id))
    ]
    taskBoard.value = normalizeDailyTaskBoard({
        today: { ...today, date: createdDate, tasks },
        yesterday: sameDay
            ? taskBoard.value.yesterday
            : { ...today, readOnly: true }
    })
}

const removeDailyTask = taskId => {
    const today = taskBoard.value.today
    taskBoard.value = normalizeDailyTaskBoard({
        today: { ...today, tasks: today.tasks.filter(task => task.id !== taskId) },
        yesterday: taskBoard.value.yesterday
    })
}

const loadDailyTasks = async ({ silent = false } = {}) => {
    if (!silent) taskLoading.value = true
    const token = getToken()
    if (!token) {
        taskError.value = '登录状态已失效'
        taskLoading.value = false
        return
    }

    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate/daily-tasks`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store'
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '同步失败')
        taskBoard.value = normalizeDailyTaskBoard(json.data)
        taskError.value = ''
    } catch (error) {
        taskError.value = error?.message === 'Failed to fetch'
            ? '网络连接异常，请检查后重试'
            : (error?.message || '网络错误')
    } finally {
        taskLoading.value = false
    }
}

const taskDayHasChanged = () => Boolean(taskBoard.value.today.date)
    && taskBoard.value.today.date !== getCalendarDateString()

const refreshTaskDayBoundary = () => {
    if (!taskDayHasChanged() || taskLoading.value || taskMutationKey.value) return
    activeTaskTab.value = 'today'
    taskMutationError.value = ''
    loadDailyTasks()
}

const handleTaskVisibilityChange = () => {
    if (document.visibilityState === 'visible') refreshTaskDayBoundary()
}

const createDailyTasks = async () => {
    taskDraftTouched.value = true
    if (!taskDraftState.value.valid || taskMutationKey.value) return
    if (taskDayHasChanged()) {
        activeTaskTab.value = 'today'
        await loadDailyTasks()
        showToast('新的一天开始了', '昨天的任务已经转为只读，请再次添加到今天', 'info')
        return
    }

    taskMutationKey.value = 'create'
    taskMutationError.value = ''
    if (!taskDraftRequestId.value) taskDraftRequestId.value = createRequestId()

    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate/daily-tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                items: taskDraftState.value.items,
                requestId: taskDraftRequestId.value
            })
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '写入失败')

        mergeCreatedTasks(json.data.tasks || [])
        const addedCount = json.data.tasks?.length || taskDraftState.value.count
        taskDraft.value = ''
        taskDraftTouched.value = false
        taskDraftRequestId.value = ''
        closeTaskComposer({ force: true })
        showToast('今日清单写好了', `${addedCount} 项任务已经同步，对方可以来打卡`, 'success')
    } catch (error) {
        taskMutationError.value = error?.message || '任务没有写入，请稍后重试'
        showToast('任务没有写入', taskMutationError.value, 'error')
    } finally {
        taskMutationKey.value = ''
    }
}

const toggleDailyTask = async (task, event) => {
    if (!task.canToggle || taskMutationKey.value) return
    const control = event.target
    const completed = control.checked
    if (taskDayHasChanged()) {
        control.checked = task.completed
        activeTaskTab.value = 'today'
        await loadDailyTasks()
        showToast('这项任务已转入昨天', '昨天的清单只能查看，不能再打卡', 'info')
        return
    }
    taskMutationKey.value = `toggle-${task.id}`
    taskMutationError.value = ''

    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate/daily-tasks/${task.id}/complete`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${getToken()}`
            },
            body: JSON.stringify({ completed })
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '打卡失败')

        replaceDailyTask(json.data.task)
        showToast(
            completed ? '替对方完成打卡' : '已撤销误打卡',
            completed ? `“${task.text}”已经划掉` : `“${task.text}”恢复为待完成`,
            completed ? 'success' : 'info'
        )
    } catch (error) {
        control.checked = task.completed
        taskMutationError.value = error?.message || '打卡没有保存，请稍后重试'
        showToast('打卡没有保存', taskMutationError.value, 'error')
    } finally {
        taskMutationKey.value = ''
    }
}

const deleteDailyTask = async task => {
    if (!task.canDelete || taskMutationKey.value) return
    if (taskDayHasChanged()) {
        activeTaskTab.value = 'today'
        await loadDailyTasks()
        showToast('这项任务已转入昨天', '昨天的清单只能查看，不能再删除', 'info')
        return
    }
    if (!window.confirm(`删除“${task.text}”？`)) return

    taskMutationKey.value = `delete-${task.id}`
    taskMutationError.value = ''
    try {
        const response = await fetch(`${CONFIG.API_URL}/postgraduate/daily-tasks/${task.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${getToken()}` }
        })
        const json = await response.json()
        if (!response.ok || !json.success) throw new Error(json.message || '删除失败')

        removeDailyTask(task.id)
        showToast('任务已删除', '今日清单已经同步更新', 'info')
    } catch (error) {
        taskMutationError.value = error?.message || '任务没有删除，请稍后重试'
        showToast('任务没有删除', taskMutationError.value, 'error')
    } finally {
        taskMutationKey.value = ''
    }
}

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
    loadDailyTasks()
    unsubscribeWS = onMessage(message => {
        if (message.type !== 'postgraduateSync') return
        const action = String(message.data?.action || '')
        if (action.startsWith('dailyTask')) {
            if (!taskMutationKey.value) loadDailyTasks({ silent: true })
            return
        }
        if (!mutationKey.value) loadProgress({ silent: true })
    })
    taskDayTimer = window.setInterval(refreshTaskDayBoundary, 30000)
    document.addEventListener('visibilitychange', handleTaskVisibilityChange)
})

onUnmounted(() => {
    if (unsubscribeWS) unsubscribeWS()
    if (toastTimer) clearTimeout(toastTimer)
    if (taskDayTimer) clearInterval(taskDayTimer)
    document.removeEventListener('visibilitychange', handleTaskVisibilityChange)
    if (taskComposerOpen.value) document.body.style.overflow = taskComposerPreviousBodyOverflow
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

.pg-daily-board {
    overflow: hidden;
    background: var(--fellow-white);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-card);
    box-shadow: var(--fellow-shadow-raised);
}

.pg-daily-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-4);
    background: var(--fellow-yellow);
    border-bottom: 3px solid var(--fellow-ink);
}

.pg-daily-head h2,
.pg-daily-head p,
.pg-encouragement p,
.pg-task-error p,
.pg-task-copy p,
.pg-task-empty p,
.pg-yesterday-summary span {
    margin: 0;
}

.pg-daily-head h2 {
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.025em;
}

.pg-daily-head p {
    margin-top: 3px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.45;
}

.pg-daily-count,
.pg-readonly-badge {
    flex: 0 0 auto;
    padding: 6px 9px;
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-pill);
    font-size: 11px;
    font-weight: 950;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
}

.pg-encouragement {
    display: flex;
    align-items: flex-start;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-3) var(--fellow-space-4);
    background: var(--fellow-blue);
    border-bottom: 3px solid var(--fellow-ink);
}

.pg-encouragement.is-restart { background: var(--fellow-yellow); }
.pg-encouragement.is-progress { background: color-mix(in srgb, var(--fellow-mint) 58%, var(--fellow-white)); }
.pg-encouragement.is-complete { background: var(--fellow-mint); }
.pg-encouragement.is-strong { background: color-mix(in srgb, var(--fellow-orange) 50%, var(--fellow-white)); }

.pg-encouragement-mark {
    display: grid;
    flex: 0 0 38px;
    width: 38px;
    height: 38px;
    place-items: center;
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: 10px;
}

.pg-encouragement-mark svg,
.pg-add-task svg,
.pg-delete-task svg,
.pg-task-checkbox svg,
.pg-task-static-mark svg,
.pg-task-empty svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.pg-encouragement-mark svg { width: 23px; height: 23px; }
.pg-encouragement strong { display: block; font-size: 14px; font-weight: 950; }
.pg-encouragement p { margin-top: 3px; font-size: 12px; font-weight: 680; line-height: 1.5; }

.pg-day-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 3px solid var(--fellow-ink);
}

.pg-day-tabs button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fellow-space-2);
    min-height: 48px;
    padding: 8px 12px;
    color: var(--fellow-ink);
    background: var(--fellow-white);
    border: 0;
    font: 900 13px/1 var(--fellow-font-ui);
}

.pg-day-tabs button + button { border-left: 3px solid var(--fellow-ink); }
.pg-day-tabs button[aria-selected="true"] { background: var(--fellow-ink); color: var(--fellow-white); }

.pg-day-tabs button span {
    display: grid;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    place-items: center;
    color: var(--fellow-ink);
    background: var(--fellow-yellow);
    border: 2px solid currentColor;
    border-radius: var(--fellow-radius-pill);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
}

.pg-task-panel { min-height: 170px; }

.pg-task-loading {
    display: grid;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-4);
}

.pg-task-loading i {
    display: block;
    height: 54px;
    background: color-mix(in srgb, var(--fellow-ink) 10%, var(--fellow-white));
    border-radius: 8px;
    animation: pg-loading-pulse 1.1s ease-in-out infinite alternate;
}

.pg-task-error {
    display: flex;
    min-height: 170px;
    align-items: center;
    justify-content: space-between;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-4);
    background: color-mix(in srgb, var(--fellow-pink) 42%, var(--fellow-white));
}

.pg-task-error strong { display: block; font-size: 14px; font-weight: 950; }
.pg-task-error p { margin-top: 3px; font-size: 12px; font-weight: 680; line-height: 1.45; }

.pg-task-error button,
.pg-open-composer,
.pg-add-task,
.pg-cancel-task,
.pg-close-composer,
.pg-delete-task {
    color: var(--fellow-ink);
    border: 2px solid var(--fellow-ink);
    font-weight: 900;
}

.pg-task-error button {
    flex: 0 0 auto;
    min-height: var(--fellow-touch-target-min);
    padding: 8px 12px;
    background: var(--fellow-white);
    border-radius: var(--fellow-radius-control);
}

.pg-task-launch {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-3) var(--fellow-space-4);
    background: color-mix(in srgb, var(--fellow-blue) 11%, var(--fellow-white));
    border-bottom: 2px solid var(--fellow-ink);
}

.pg-task-launch > div { min-width: 0; }
.pg-task-launch strong { display: block; font-size: 13px; font-weight: 950; }
.pg-task-launch p { margin-top: 3px; font-size: 11px; font-weight: 680; line-height: 1.45; }

.pg-open-composer {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: var(--fellow-touch-target-min);
    padding: 8px 12px;
    background: var(--fellow-mint);
    border-radius: var(--fellow-radius-control);
    font-size: 12px;
}

.pg-open-composer svg { width: 17px; height: 17px; }
.pg-open-composer svg,
.pg-close-composer svg,
.pg-add-task svg {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
}
.pg-open-composer:disabled { cursor: not-allowed; opacity: 0.5; }

.pg-composer-overlay {
    position: fixed;
    inset: 0;
    z-index: var(--fellow-z-modal);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: var(--fellow-space-3) var(--fellow-space-3) max(var(--fellow-space-3), env(safe-area-inset-bottom, 0px));
    background: color-mix(in srgb, var(--fellow-ink) 58%, transparent);
    animation: pg-composer-fade var(--fellow-motion-fast) var(--fellow-ease-standard);
}

.pg-composer-dialog {
    width: min(100%, 430px);
    max-height: calc(100dvh - var(--fellow-space-5));
    overflow: auto;
    overscroll-behavior: contain;
    color: var(--fellow-ink);
    background: var(--fellow-white);
    border: 3px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-sheet);
    box-shadow: var(--fellow-shadow-overlay);
    animation: pg-composer-rise var(--fellow-motion-standard) var(--fellow-ease-emphasized);
}

.pg-composer-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--fellow-space-3);
    padding: var(--fellow-space-4);
    background: var(--fellow-yellow);
    border-bottom: 3px solid var(--fellow-ink);
}

.pg-composer-head > div { min-width: 0; }
.pg-composer-head span { font-size: 10px; font-weight: 950; letter-spacing: 0.1em; }
.pg-composer-head h2 { margin-top: 3px; font: 950 20px/1.15 var(--fellow-font-ui); text-wrap: balance; }
.pg-composer-head p { max-width: 34ch; margin-top: 6px; font-size: 12px; font-weight: 680; line-height: 1.5; }

.pg-close-composer {
    display: grid;
    flex: 0 0 var(--fellow-touch-target-min);
    width: var(--fellow-touch-target-min);
    height: var(--fellow-touch-target-min);
    padding: 0;
    place-items: center;
    background: var(--fellow-white);
    border-radius: 50%;
}

.pg-close-composer svg { width: 21px; height: 21px; }
.pg-close-composer:disabled { cursor: not-allowed; opacity: 0.48; }

.pg-task-composer {
    padding: var(--fellow-space-4);
    background: color-mix(in srgb, var(--fellow-blue) 11%, var(--fellow-white));
}

.pg-task-composer > label {
    display: block;
    margin-bottom: var(--fellow-space-2);
    font-size: 13px;
    font-weight: 950;
}

.pg-task-composer textarea {
    display: block;
    width: 100%;
    min-height: 94px;
    resize: vertical;
    padding: 11px 12px;
    color: var(--fellow-ink);
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: 10px;
    font: 750 14px/1.55 var(--fellow-font-ui);
    scroll-margin-bottom: calc(var(--fellow-bottom-nav-height) + 160px);
}

.pg-task-composer textarea::placeholder {
    color: color-mix(in srgb, var(--fellow-ink) 72%, var(--fellow-white));
    opacity: 1;
}

.pg-draft-meta,
.pg-yesterday-summary,
.pg-task-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--fellow-space-2);
}

.pg-draft-meta {
    margin-top: 7px;
    font-size: 11px;
    font-weight: 700;
}

.pg-draft-meta strong { font-variant-numeric: tabular-nums; }

.pg-draft-error,
.pg-task-mutation-error {
    margin: var(--fellow-space-2) 0 0;
    font-size: 12px;
    font-weight: 850;
    line-height: 1.45;
}

.pg-draft-error { color: color-mix(in srgb, var(--fellow-ink) 76%, var(--fellow-pink)); }

.pg-composer-error {
    margin: var(--fellow-space-3) 0 0;
    padding: 9px 11px;
    color: var(--fellow-ink);
    background: color-mix(in srgb, var(--fellow-pink) 38%, var(--fellow-white));
    border: 2px solid var(--fellow-ink);
    border-radius: var(--fellow-radius-control);
    font-size: 12px;
    font-weight: 850;
    line-height: 1.45;
}

.pg-composer-actions {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
    gap: var(--fellow-space-2);
    margin-top: var(--fellow-space-4);
}

.pg-cancel-task {
    min-height: var(--fellow-touch-target-min);
    padding: 8px 12px;
    background: var(--fellow-white);
    border-radius: var(--fellow-radius-control);
    font-size: 12px;
    white-space: nowrap;
}

.pg-cancel-task:disabled { cursor: not-allowed; opacity: 0.48; }

.pg-add-task {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: var(--fellow-touch-target-min);
    width: 100%;
    padding: 8px 14px;
    background: var(--fellow-mint);
    border-radius: var(--fellow-radius-control);
    font-size: 12px;
    white-space: nowrap;
    scroll-margin-bottom: calc(var(--fellow-bottom-nav-height) + 120px);
}

.pg-add-task svg { width: 18px; height: 18px; }
.pg-add-task:disabled { cursor: not-allowed; opacity: 0.46; }

@keyframes pg-composer-fade {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes pg-composer-rise {
    from { opacity: 0; transform: translateY(18px); }
    to { opacity: 1; transform: translateY(0); }
}

.pg-yesterday-summary {
    padding: var(--fellow-space-3) var(--fellow-space-4);
    background: color-mix(in srgb, var(--fellow-yellow) 20%, var(--fellow-white));
    border-bottom: 2px solid var(--fellow-ink);
}

.pg-yesterday-summary strong { display: block; font-size: 13px; font-weight: 950; }
.pg-yesterday-summary div > span { display: block; margin-top: 2px; font-size: 11px; font-weight: 700; }

.pg-task-mutation-error {
    padding: var(--fellow-space-2) var(--fellow-space-4);
    background: color-mix(in srgb, var(--fellow-pink) 36%, var(--fellow-white));
    border-bottom: 2px solid var(--fellow-ink);
}

.pg-task-list {
    margin: 0;
    padding: 0;
    list-style: none;
}

.pg-task-list li {
    display: grid;
    grid-template-columns: 44px minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--fellow-space-2);
    min-height: 72px;
    padding: var(--fellow-space-3) var(--fellow-space-4);
    background: var(--fellow-white);
}

.pg-task-list li + li { border-top: 2px solid var(--fellow-ink); }
.pg-task-list li.is-complete { background: color-mix(in srgb, var(--fellow-mint) 16%, var(--fellow-white)); }

.pg-task-checkbox,
.pg-task-static-mark {
    display: grid;
    width: 44px;
    height: 44px;
    place-items: center;
}

.pg-task-checkbox { position: relative; cursor: pointer; }

.pg-task-checkbox input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
}

.pg-task-checkbox > span,
.pg-task-static-mark::before {
    display: block;
    width: 30px;
    height: 30px;
    background: var(--fellow-white);
    border: 2px solid var(--fellow-ink);
    border-radius: 8px;
}

.pg-task-checkbox > span {
    display: grid;
    place-items: center;
    transition: background-color var(--fellow-motion-fast) var(--fellow-ease-standard), transform var(--fellow-motion-fast) var(--fellow-ease-emphasized);
}

.pg-task-checkbox svg,
.pg-task-static-mark svg {
    width: 21px;
    height: 21px;
}

.pg-task-checkbox svg { opacity: 0; }
.pg-task-checkbox.checked > span { background: var(--fellow-mint); transform: scale(1.05); }
.pg-task-checkbox.checked svg { opacity: 1; }
.pg-task-checkbox input:disabled + span { cursor: not-allowed; opacity: 0.5; }

.pg-task-static-mark {
    position: relative;
}

.pg-task-static-mark::before {
    content: '';
    position: absolute;
}

.pg-task-static-mark svg { position: relative; z-index: 1; }
.pg-task-static-mark.checked::before { background: var(--fellow-mint); }

.pg-task-copy { min-width: 0; }

.pg-task-copy > p {
    overflow-wrap: anywhere;
    font-size: 14px;
    font-weight: 850;
    line-height: 1.5;
    text-decoration-thickness: 2px;
    text-decoration-color: currentColor;
}

.pg-task-list li.is-complete .pg-task-copy > p {
    opacity: 0.64;
    text-decoration-line: line-through;
}

.pg-task-meta {
    justify-content: flex-start;
    flex-wrap: wrap;
    margin-top: 5px;
}

.pg-task-meta span {
    padding: 3px 6px;
    border: 1px solid var(--fellow-ink);
    border-radius: 6px;
    font-size: 10px;
    font-weight: 900;
}

.pg-task-meta span.is-mine { background: var(--fellow-blue); }
.pg-task-meta span.is-partner { background: var(--fellow-pink); }
.pg-task-meta small { font-size: 11px; font-weight: 700; }

.pg-delete-task {
    display: grid;
    width: 44px;
    height: 44px;
    padding: 0;
    place-items: center;
    background: var(--fellow-white);
    border-radius: var(--fellow-radius-control);
}

.pg-delete-task svg { width: 20px; height: 20px; }
.pg-delete-task:disabled { cursor: not-allowed; opacity: 0.46; }

.pg-task-empty {
    display: grid;
    min-height: 180px;
    padding: var(--fellow-space-5);
    place-items: center;
    align-content: center;
    text-align: center;
}

.pg-task-empty > span {
    display: grid;
    width: 48px;
    height: 48px;
    margin-bottom: var(--fellow-space-2);
    place-items: center;
    background: var(--fellow-yellow);
    border: 2px solid var(--fellow-ink);
    border-radius: 12px;
}

.pg-task-empty svg { width: 25px; height: 25px; }
.pg-task-empty strong { font-size: 14px; font-weight: 950; }
.pg-task-empty p { max-width: 28em; margin-top: 5px; font-size: 12px; font-weight: 680; line-height: 1.55; }

.pg-intro {
    margin-top: var(--fellow-space-5);
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
.pg-day-tabs button:focus-visible,
.pg-task-error button:focus-visible,
.pg-open-composer:focus-visible,
.pg-close-composer:focus-visible,
.pg-task-composer textarea:focus-visible,
.pg-add-task:focus-visible,
.pg-cancel-task:focus-visible,
.pg-task-checkbox:focus-within,
.pg-delete-task:focus-visible,
.pg-editor-toggle:focus-visible,
.pg-quick-amounts button:focus-visible,
.pg-custom-amount input:focus-visible,
.pg-editor-actions button:focus-visible {
    outline: 3px solid var(--fellow-blue);
    outline-offset: 2px;
}

@media (max-width: 340px) {
    .pg-main { padding-right: var(--fellow-space-3); padding-left: var(--fellow-space-3); }
    .pg-daily-head,
    .pg-task-error { align-items: flex-start; flex-direction: column; }
    .pg-encouragement,
    .pg-task-launch,
    .pg-task-list li,
    .pg-yesterday-summary { padding-right: var(--fellow-space-3); padding-left: var(--fellow-space-3); }
    .pg-task-launch { align-items: stretch; flex-direction: column; }
    .pg-open-composer { width: 100%; }
    .pg-task-list li { grid-template-columns: 42px minmax(0, 1fr) auto; }
    .pg-daily-count { align-self: flex-start; }
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
    .pg-loading-subject b,
    .pg-task-loading i { animation: none; }
    .pg-track-fill,
    .pg-task-checkbox > span,
    .pg-editor-toggle svg,
    .pg-achievement { transition: none; }
    .pg-composer-overlay,
    .pg-composer-dialog { animation: none; }
}
</style>
