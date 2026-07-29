<template>
    <div class="pg-page">
        <FeatureHeader title="考研计划" eyebrow="STUDY COMPANION" chapter="03" kind="study" />

        <div v-if="loading" class="pg-loading" aria-label="正在加载今日学习清单" aria-live="polite">
            <div class="pg-loading-head" aria-hidden="true"><strong></strong><span></span></div>
            <div v-for="index in 3" :key="index" class="pg-loading-task" aria-hidden="true">
                <i></i><span></span><b></b>
            </div>
        </div>

        <div v-else class="pg-main">
            <div v-if="loadError" class="pg-inline-error">
                <span>{{ loadError }}</span>
                <button type="button" @click="fetchData()">重试</button>
            </div>

            <section class="pg-panel pg-today-panel">
                <div class="pg-section-title compact">
                    <div>
                        <span>今日执行清单</span>
                        <small>{{ todayStr }} · {{ weekdayText }}</small>
                    </div>
                    <strong>{{ dashboard.doneTasks }}/{{ dashboard.totalTasks }} 完成</strong>
                </div>
                <div v-if="dashboard.taskRows.length > 0" class="pg-task-list">
                    <article
                        v-for="task in dashboard.taskRows"
                        :key="task.id"
                        class="pg-task-item"
                        :class="task.status"
                    >
                        <div class="pg-task-main">
                            <strong>{{ task.subjectName }} · {{ task.label }}</strong>
                            <span>目标 {{ task.targetText }} · {{ task.cadenceLabel }}</span>
                        </div>
                        <div class="pg-task-result">
                            <strong>{{ task.completedText }}</strong>
                            <span>{{ task.statusLabel }}</span>
                        </div>
                        <div class="pg-task-progress" aria-hidden="true">
                            <div :style="{ width: task.progressPercent + '%' }"></div>
                        </div>
                    </article>
                </div>
                <div v-else class="pg-rest-state">
                    <strong>今天没有安排任务</strong>
                    <span>可以在科目设置里配置今天的学习内容。</span>
                </div>
                <div class="pg-list-actions">
                    <button
                        v-if="dashboard.totalTasks > 0"
                        type="button"
                        class="pg-primary-btn"
                        :disabled="checkInSubmitting"
                        @click="openCheckIn"
                    >{{ data.todayCheckedIn ? '更新打卡' : '今日打卡' }}</button>
                    <button v-else type="button" class="pg-primary-btn" @click="openConfig">配置今日任务</button>
                    <button type="button" class="pg-secondary-btn" @click="openConfig">管理科目</button>
                </div>
            </section>

            <!-- 科目列表 -->
            <div class="pg-subjects-head">
                <span>科目进度</span>
                <strong>总进度 {{ overallProgress }}%</strong>
            </div>
            <div class="pg-subjects-grid" v-if="subjectCards.length > 0">
                <button
                    v-for="card in subjectCards"
                    :key="card.name"
                    type="button"
                    class="pg-subject-card"
                    :class="{ active: card.todayDue, inactive: !card.todayDue }"
                    :aria-label="`查看${card.name}进度`"
                    @click="openEdit(card.raw)"
                >
                    <div class="pg-card-inner">
                        <div class="pg-card-top">
                            <span class="pg-card-name">{{ card.name }}</span>
                            <span class="pg-card-round">{{ card.currentRound?.roundName || '一轮' }}</span>
                        </div>
                        <div class="pg-card-progress-wrap">
                            <div class="pg-card-progress-bar">
                                <div class="pg-card-progress-fill" :style="{ width: card.progress + '%' }"></div>
                            </div>
                            <span class="pg-card-progress-text">{{ card.progress }}%</span>
                        </div>
                        <div class="pg-card-unit">
                            <span class="pg-card-current">{{ card.currentRound?.currentUnit || card.taskSummary }}</span>
                            <span class="pg-card-total" v-if="card.currentRound?.totalUnit">/{{ card.currentRound.totalUnit }}</span>
                        </div>
                        <div class="pg-card-status">
                            <span v-if="card.todayDue" class="pg-card-tag today">今日 {{ card.todayDoneCount }}/{{ card.todayTaskCount }}</span>
                            <span v-else class="pg-card-tag rest">近况 {{ card.averageCompletion }}%</span>
                        </div>
                    </div>
                </button>
            </div>
            <div class="pg-empty-subjects" v-else>
                <div class="pg-empty-text">还没有添加科目</div>
                <div class="pg-empty-hint">点击配置计划按钮添加科目</div>
            </div>

            <button class="pg-config-btn" type="button" @click="openConfig">
                管理科目与每日任务
            </button>

            <section v-if="false" class="pg-archive-section">
                <div class="pg-section-title compact">
                    <span>{{ archiveView.name }}</span>
                    <strong>{{ archiveView.count }} 份</strong>
                </div>
                <div class="pg-archive-desc">
                    考研结束后，将每日任务、报到、完成率和计划变更固化到专属仓库。
                </div>
                <div v-if="archiveView.latest" class="pg-archive-latest">
                    <div>
                        <span>最近归档</span>
                        <strong>{{ archiveView.latest.repositoryName }}</strong>
                    </div>
                    <div>
                        <span>学习天数</span>
                        <strong>{{ archiveView.latest.summary?.totalDays || 0 }} 天</strong>
                    </div>
                    <div>
                        <span>平均完成</span>
                        <strong>{{ archiveView.latest.summary?.averageCompletionRate || 0 }}%</strong>
                    </div>
                </div>
                <div v-if="archiveView.entries.length > 0" class="pg-archive-list">
                    <article v-for="entry in archiveView.entries.slice(0, 3)" :key="entry.id" class="pg-archive-entry">
                        <div>
                            <strong>{{ entry.repositoryName }}</strong>
                            <span>{{ formatArchiveDate(entry.archivedDate || entry.targetDate) }}</span>
                        </div>
                        <small>{{ entry.summary?.doneTasks || 0 }} 完成 / {{ entry.summary?.missedTasks || 0 }} 未完成</small>
                    </article>
                </div>
                <button type="button" class="pg-archive-btn" :disabled="archiving || !data.archiveReady" @click="archiveProgress">
                    <span v-if="archiving">归档中...</span>
                    <span v-else-if="data.archiveReady">生成归档快照</span>
                    <span v-else>目标日期后可归档</span>
                </button>
            </section>

            <!-- 通知区 -->
            <section v-if="false" class="pg-notify-section">
                <div class="pg-section-title">
                    <span>发送提醒</span>
                </div>
                <div class="pg-template-rail" v-if="notifyTemplates.length > 0">
                    <button
                        v-for="template in notifyTemplates"
                        :key="template.title + template.body"
                        type="button"
                        class="pg-template-chip"
                        @click="applyNotifyTemplate(template)"
                    >
                        {{ template.title }}
                    </button>
                </div>
                <div class="pg-notify-inputs">
                    <label class="pg-field-label" for="pgNotifyTitle">提醒标题</label>
                    <input id="pgNotifyTitle" v-model="notifyTitle" class="pg-input pg-input-title" placeholder="例如：先把英语阅读收口" maxlength="30"/>
                    <label class="pg-field-label" for="pgNotifyBody">提醒内容</label>
                    <textarea id="pgNotifyBody" v-model="notifyBody" class="pg-input pg-input-body" placeholder="写清楚下一项要做什么，别泛泛催促。" rows="3" maxlength="200"></textarea>
                </div>
                <button type="button" class="pg-send-btn" :disabled="sending || !notifyTitle.trim() || !notifyBody.trim()" @click="sendNotification">
                    <span v-if="sending">发送中...</span>
                    <span v-else>发送到伴侣的手机</span>
                </button>
            </section>

            <div class="pg-bottom-space"></div>
        </div>

        <div
            class="pg-toast"
            :class="{ show: toast.show, [toast.type]: true }"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            {{ toast.message }}
        </div>

        <!-- 编辑科目弹窗 -->
        <div class="pg-modal-overlay" :class="{ show: editModal.show }" @click.self="closeEdit">
            <div class="pg-modal">
                <div class="pg-modal-title">{{ editModal.subject?.name }}</div>
                <div class="pg-modal-body">
                    <!-- 轮次切换 -->
                    <div class="pg-modal-field">
                        <label>复习轮次</label>
                        <div class="pg-round-tabs">
                            <button
                                v-for="(round, idx) in editModal.rounds"
                                :key="idx"
                                type="button"
                                class="pg-round-tab"
                                :class="{ active: editModal.currentRound === idx }"
                                @click="editModal.currentRound = idx"
                            >
                                {{ round.roundName }}
                            </button>
                            <button type="button" class="pg-round-tab add" @click="addRound">+</button>
                        </div>
                    </div>

                    <div class="pg-modal-field" v-if="editModal.rounds[editModal.currentRound]">
                        <label>当前进度 (%)</label>
                        <input v-model.number="editModal.rounds[editModal.currentRound].progress" type="number" min="0" max="100" inputmode="numeric" class="pg-modal-input"/>
                    </div>
                    <div class="pg-modal-field" v-if="editModal.rounds[editModal.currentRound]">
                        <label>当前章节/内容</label>
                        <input v-model="editModal.rounds[editModal.currentRound].currentUnit" class="pg-modal-input" placeholder="例如：马原-第三章"/>
                    </div>
                    <div class="pg-modal-field" v-if="editModal.rounds[editModal.currentRound]">
                        <label>总内容说明</label>
                        <input v-model="editModal.rounds[editModal.currentRound].totalUnit" class="pg-modal-input" placeholder="例如：38章"/>
                    </div>
                </div>
                <div class="pg-modal-actions">
                    <button type="button" class="pg-modal-btn cancel" :disabled="editSaving" @click="closeEdit">取消</button>
                    <button type="button" class="pg-modal-btn confirm" :disabled="editSaving" @click="saveEdit">
                        {{ editSaving ? '保存中...' : '保存' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 报到弹窗 -->
        <div class="pg-modal-overlay" :class="{ show: checkInModal.show }" @click.self="closeCheckIn">
            <div class="pg-modal">
                <div class="pg-modal-title">今日学习报到</div>
                <div class="pg-modal-body">
                    <div class="pg-modal-field" v-if="data.todayTasks && data.todayTasks.length > 0">
                        <label>今日任务完成量</label>
                        <div class="pg-checkin-tasks">
                            <div v-for="task in checkInModal.taskRecords" :key="task.subjectName + task.taskKey" class="pg-checkin-task-row">
                                <div class="pg-checkin-task-main">
                                    <span>{{ task.subjectName }} · {{ task.label }}</span>
                                    <small>目标 {{ task.targetAmount }}{{ task.unit }} · {{ task.cadenceLabel }}</small>
                                </div>
                                <div class="pg-task-amount-box">
                                    <input v-model.number="task.completedAmount" type="number" min="0" inputmode="numeric" class="pg-task-amount-input"/>
                                    <span class="pg-task-unit">{{ task.unit }}</span>
                                </div>
                                <div class="pg-task-quick-actions">
                                    <button type="button" @click="setTaskCompletion(task, 0)">0</button>
                                    <button type="button" @click="setTaskCompletion(task, task.targetAmount)">达标</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="pg-modal-field" v-else>
                        <label>今天学了哪些科目</label>
                        <div class="pg-checkin-subjects">
                            <button
                                v-for="sub in data.subjects"
                                :key="sub.name"
                                type="button"
                                class="pg-checkin-subject-tag"
                                :class="{ active: checkInModal.subjects.includes(sub.name) }"
                                @click="toggleCheckInSubject(sub.name)"
                            >
                                {{ sub.name }}
                            </button>
                        </div>
                    </div>
                    <div class="pg-modal-field">
                        <label>备注（可选）</label>
                        <input v-model="checkInModal.note" class="pg-modal-input" placeholder="例如：今天状态不错"/>
                    </div>
                </div>
                <div class="pg-modal-actions">
                    <button type="button" class="pg-modal-btn cancel" :disabled="checkInSubmitting" @click="closeCheckIn">取消</button>
                    <button type="button" class="pg-modal-btn confirm" :disabled="checkInSubmitting" @click="submitCheckIn">
                        {{ checkInSubmitting ? '报到中...' : '报到' }}
                    </button>
                </div>
            </div>
        </div>

        <!-- 配置计划弹窗 -->
        <div class="pg-modal-overlay" :class="{ show: configModal.show }" @click.self="closeConfig">
            <div class="pg-modal pg-modal-wide">
                <div class="pg-modal-title">配置考研计划</div>
                <div class="pg-modal-body">
                    <!-- 目标日期 -->
                    <div class="pg-modal-field">
                        <label>目标日期</label>
                        <input v-model="configModal.targetDate" type="date" class="pg-modal-input"/>
                    </div>

                    <!-- 科目列表 -->
                    <div class="pg-modal-field">
                        <label>科目列表</label>
                        <div class="pg-subject-list">
                            <div v-for="(sub, idx) in configModal.subjects" :key="idx" class="pg-subject-form">
                                <div class="pg-subject-form-row">
                                    <input v-model.trim="sub.name" class="pg-modal-input pg-subject-name-input" placeholder="科目名"/>
                                    <button type="button" class="pg-subject-del" aria-label="删除科目" @click="removeSubject(idx)">×</button>
                                </div>
                                <!-- 轮次配置 -->
                                <div class="pg-round-config">
                                    <div v-for="(round, rIdx) in sub.rounds" :key="rIdx" class="pg-round-config-row">
                                        <input v-model.trim="round.roundName" class="pg-modal-input pg-round-name-input" placeholder="轮次名"/>
                                        <input v-model.number="round.progress" type="number" min="0" max="100" inputmode="numeric" class="pg-modal-input pg-round-progress-input" placeholder="进度%"/>
                                        <input v-model.trim="round.currentUnit" class="pg-modal-input pg-round-unit-input" placeholder="当前章节"/>
                                        <input v-model.trim="round.totalUnit" class="pg-modal-input pg-round-total-input" placeholder="总内容"/>
                                        <button v-if="sub.rounds.length > 1" type="button" class="pg-subject-del" aria-label="删除轮次" @click="removeRound(sub, rIdx)">×</button>
                                    </div>
                                    <button type="button" class="pg-add-round-btn" @click="addRoundInConfig(sub)">
                                        <span>+</span> 添加轮次
                                    </button>
                                </div>
                                <!-- 每日执行任务 -->
                                <div class="pg-task-config">
                                    <div class="pg-task-config-head">
                                        <span>督促任务</span>
                                        <button type="button" class="pg-add-task-btn" @click="addTaskInConfig(sub)">添加</button>
                                    </div>
                                    <div v-for="(task, tIdx) in sub.tasks" :key="task.key || tIdx" class="pg-task-config-row">
                                        <input v-model.trim="task.label" class="pg-modal-input" placeholder="任务，如刷题"/>
                                        <input v-model.number="task.targetAmount" type="number" min="0" inputmode="numeric" class="pg-modal-input amount" placeholder="数量"/>
                                        <input v-model.trim="task.unit" class="pg-modal-input unit" placeholder="单位"/>
                                        <input v-model.number="task.cadenceDays" type="number" min="1" max="14" inputmode="numeric" class="pg-modal-input cadence" placeholder="周期" title="每几天一次"/>
                                        <button type="button" class="pg-subject-del" aria-label="删除任务" @click="removeTask(sub, tIdx)">×</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button type="button" class="pg-add-subject-btn" @click="addSubject">
                            <span>+</span> 添加科目
                        </button>
                    </div>

                    <!-- 每周计划 -->
                    <div class="pg-modal-field">
                        <label>每周计划</label>
                        <div class="pg-schedule-list">
                            <div v-for="day in weekdayNames" :key="day.key" class="pg-schedule-row">
                                <div class="pg-schedule-label">{{ day.label }}</div>
                                <div class="pg-schedule-tags">
                                    <button
                                        v-for="sub in configModal.subjects.filter(s => s.name)"
                                        :key="sub.name"
                                        type="button"
                                        class="pg-schedule-tag"
                                        :class="{ active: isSubjectInDay(day.key, sub.name) }"
                                        @click="toggleDaySubject(day.key, sub.name)"
                                    >
                                        {{ sub.name }}
                                    </button>
                                    <button
                                        type="button"
                                        class="pg-schedule-tag rest-tag"
                                        :class="{ active: isSubjectInDay(day.key, '休息') }"
                                        @click="toggleDaySubject(day.key, '休息')"
                                    >
                                        休息
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pg-modal-actions">
                    <button type="button" class="pg-modal-btn cancel" :disabled="configSaving" @click="closeConfig">取消</button>
                    <button type="button" class="pg-modal-btn confirm" :disabled="configSaving" @click="saveConfig">
                        {{ configSaving ? '保存中...' : '保存' }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import {
    buildArchiveRepositoryView,
    buildPostgraduateDashboard,
    buildPostgraduateNotifyTemplates,
    buildSubjectExecutionCards
} from '../utils/postgraduate-insights.js'

export default {
    name: 'Postgraduate',
    components: { FeatureHeader },
    setup() {
        const loading = ref(true)
        const loadError = ref('')
        const data = ref({})
        const todayStr = ref('')
        const weekdayText = ref('')
        const sending = ref(false)
        const archiving = ref(false)
        const editSaving = ref(false)
        const configSaving = ref(false)
        const checkInSubmitting = ref(false)
        const cancelSubmitting = ref(false)
        const notifyTitle = ref('')
        const notifyBody = ref('')
        let unsubscribeWS = null

        const toast = reactive({ show: false, message: '', type: 'info', timer: null })

        const editModal = reactive({
            show: false,
            subject: null,
            currentRound: 0,
            rounds: []
        })

        const configModal = reactive({
            show: false,
            targetDate: '',
            subjects: [],
            schedule: {}
        })

        const checkInModal = reactive({
            show: false,
            subjects: [],
            taskRecords: [],
            note: ''
        })

        const weekdayNames = [
            { key: '1', label: '周一' },
            { key: '2', label: '周二' },
            { key: '3', label: '周三' },
            { key: '4', label: '周四' },
            { key: '5', label: '周五' },
            { key: '6', label: '周六' },
            { key: '0', label: '周日' }
        ]

        const dashboard = computed(() => buildPostgraduateDashboard(data.value))
        const subjectCards = computed(() => buildSubjectExecutionCards(data.value))
        const overallProgress = computed(() => {
            if (subjectCards.value.length === 0) return 0
            const total = subjectCards.value.reduce((sum, subject) => sum + Number(subject.progress || 0), 0)
            return Math.round(total / subjectCards.value.length)
        })
        const archiveView = computed(() => buildArchiveRepositoryView(data.value.archiveRepository))
        const notifyTemplates = computed(() => buildPostgraduateNotifyTemplates(data.value, dashboard.value))

        const getToken = () => localStorage.getItem('token')

        const getTodayStr = () => {
            const d = new Date()
            return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
        }

        const getWeekdayText = () => {
            return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()]
        }

        const formatArchiveDate = (value) => {
            if (!value) return '已归档'
            const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
            if (dateOnly) return `${dateOnly[1]}年${Number(dateOnly[2])}月${Number(dateOnly[3])}日`
            const date = new Date(value)
            return Number.isNaN(date.getTime())
                ? '已归档'
                : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
        }

        const showToast = (message, type = 'info') => {
            if (toast.timer) clearTimeout(toast.timer)
            toast.show = true
            toast.message = message
            toast.type = type
            toast.timer = setTimeout(() => { toast.show = false }, 2500)
        }

        const fetchData = async (options = {}) => {
            const silent = options.silent === true
            if (!silent) loading.value = true
            try {
                const token = getToken()
                if (!token) {
                    loadError.value = '登录状态已失效，请重新登录'
                    return
                }
                const res = await fetch(CONFIG.API_URL + '/postgraduate', {
                    headers: { Authorization: 'Bearer ' + token }
                })
                const json = await res.json()
                if (json.success) {
                    data.value = json.data
                    loadError.value = ''
                } else {
                    loadError.value = json.message || '获取考研进度失败'
                }
            } catch (e) {
                console.error('获取考研进度失败:', e)
                loadError.value = '网络错误，暂时无法同步考研进度'
            } finally {
                loading.value = false
            }
        }

        const defaultTaskForSubject = (subjectName = '') => {
            const presets = {
                '数学': [{ key: 'math_lecture', label: '完成课程', targetAmount: 1, unit: '讲', cadenceDays: 1 }],
                '英语': [{ key: 'english_questions', label: '刷题', targetAmount: 40, unit: '题', cadenceDays: 1 }],
                '化学': [
                    { key: 'chemistry_lessons', label: '看课', targetAmount: 1, unit: '节', cadenceDays: 1 },
                    { key: 'chemistry_questions', label: '做题', targetAmount: 30, unit: '题', cadenceDays: 1 }
                ],
                '政治': [
                    { key: 'politics_recite', label: '背诵', targetAmount: 5, unit: '页', cadenceDays: 1 },
                    { key: 'politics_questions', label: '做题', targetAmount: 30, unit: '题', cadenceDays: 1 }
                ]
            }
            return (presets[subjectName] || [{ label: '学习任务', targetAmount: 1, unit: '项', cadenceDays: 1 }])
                .map((task, index) => ({
                    key: task.key || `task_${Date.now()}_${index}`,
                    label: task.label,
                    targetAmount: task.targetAmount,
                    unit: task.unit,
                    cadenceDays: task.cadenceDays,
                    enabled: true
                }))
        }

        const normalizeConfigTasks = (tasks, subjectName) => {
            const source = Array.isArray(tasks) && tasks.length > 0 ? tasks : defaultTaskForSubject(subjectName)
            return source.map((task, index) => ({
                key: task.key || `${subjectName || 'subject'}_${index + 1}`,
                label: task.label || '学习任务',
                targetAmount: Math.max(0, Number(task.targetAmount) || 0),
                unit: task.unit || '',
                cadenceDays: Math.max(1, Math.min(14, Math.round(Number(task.cadenceDays) || 1))),
                enabled: task.enabled !== false,
                order: index
            }))
        }

        const sendNotification = async () => {
            if (!notifyTitle.value.trim() || !notifyBody.value.trim()) return
            sending.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate/notify', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        title: notifyTitle.value.trim(),
                        body: notifyBody.value.trim()
                    })
                })
                const json = await res.json()
                if (json.success) {
                    showToast('提醒已发送到伴侣手机', 'success')
                    notifyTitle.value = ''
                    notifyBody.value = ''
                } else {
                    showToast(json.message || '发送失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                sending.value = false
            }
        }

        const applyNotifyTemplate = (template) => {
            notifyTitle.value = template.title || ''
            notifyBody.value = template.body || ''
        }

        const archiveProgress = async () => {
            if (!data.value.archiveReady || archiving.value) return
            archiving.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate/archive', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        repositoryName: data.value.archiveRepository?.name || '考研全过程档案'
                    })
                })
                const json = await res.json()
                if (json.success) {
                    showToast('全过程已归档', 'success')
                    await fetchData()
                } else {
                    showToast(json.message || '归档失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                archiving.value = false
            }
        }

        const openEdit = (subject) => {
            editModal.subject = subject
            editModal.currentRound = subject.currentRound || 0
            editModal.rounds = (subject.rounds || []).map(r => ({ ...r }))
            if (editModal.rounds.length === 0) {
                editModal.rounds.push({ roundName: '一轮', progress: 0, currentUnit: '', totalUnit: '' })
            }
            editModal.show = true
        }

        const closeEdit = () => {
            editModal.show = false
        }

        const addRound = () => {
            const names = ['一轮', '二轮', '三轮', '四轮', '五轮', '六轮', '七轮', '八轮']
            const nextIdx = editModal.rounds.length
            editModal.rounds.push({
                roundName: names[nextIdx] || `第${nextIdx + 1}轮`,
                progress: 0,
                currentUnit: '',
                totalUnit: ''
            })
            editModal.currentRound = nextIdx
        }

        const saveEdit = async () => {
            const subject = editModal.subject
            if (!subject) return
            if (editSaving.value) return
            const newSubjects = data.value.subjects.map(s => {
                if (s.name === subject.name) {
                    return {
                        ...s,
                        currentRound: editModal.currentRound,
                        rounds: editModal.rounds.map(r => ({
                            roundName: r.roundName || '一轮',
                            progress: Math.min(100, Math.max(0, Number(r.progress) || 0)),
                            currentUnit: r.currentUnit || '',
                            totalUnit: r.totalUnit || ''
                        }))
                    }
                }
                return s
            })
            editSaving.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({ subjects: newSubjects })
                })
                const json = await res.json()
                if (json.success) {
                    showToast('进度已更新', 'success')
                    closeEdit()
                    await fetchData({ silent: true })
                } else {
                    showToast(json.message || '更新失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                editSaving.value = false
            }
        }

        const openConfig = () => {
            configModal.targetDate = data.value.targetDate || ''
            configModal.subjects = (data.value.subjects || []).map(s => {
                // 兼容旧数据：没有 rounds 的自动转成一轮
                let rounds = (s.rounds || []).map(r => ({ ...r }))
                if (rounds.length === 0) {
                    rounds = [{
                        roundName: '一轮',
                        progress: s.progress || 0,
                        currentUnit: s.currentUnit || '',
                        totalUnit: s.totalUnit || ''
                    }]
                }
                return {
                    ...s,
                    currentRound: s.currentRound || 0,
                    rounds,
                    tasks: normalizeConfigTasks(s.tasks, s.name)
                }
            })
            if (configModal.subjects.length === 0) {
                configModal.subjects.push({
                    name: '',
                    currentRound: 0,
                    rounds: [{ roundName: '一轮', progress: 0, currentUnit: '', totalUnit: '' }],
                    tasks: defaultTaskForSubject()
                })
            }
            const schedule = {}
            if (data.value.weeklySchedule) {
                const ws = data.value.weeklySchedule
                const entries = ws instanceof Map ? [...ws] : Object.entries(ws)
                for (const [key, value] of entries) {
                    schedule[key] = Array.isArray(value) ? [...value] : []
                }
            }
            configModal.schedule = schedule
            configModal.show = true
        }

        const closeConfig = () => {
            configModal.show = false
        }

        const addSubject = () => {
            configModal.subjects.push({
                name: '',
                currentRound: 0,
                rounds: [{ roundName: '一轮', progress: 0, currentUnit: '', totalUnit: '' }],
                tasks: defaultTaskForSubject()
            })
        }

        const removeSubject = (idx) => {
            const removedName = configModal.subjects[idx]?.name
            configModal.subjects.splice(idx, 1)
            if (removedName) {
                for (const key in configModal.schedule) {
                    configModal.schedule[key] = configModal.schedule[key].filter(n => n !== removedName)
                }
            }
        }

        const addRoundInConfig = (sub) => {
            const names = ['一轮', '二轮', '三轮', '四轮', '五轮', '六轮', '七轮', '八轮']
            const nextIdx = sub.rounds.length
            sub.rounds.push({
                roundName: names[nextIdx] || `第${nextIdx + 1}轮`,
                progress: 0,
                currentUnit: '',
                totalUnit: ''
            })
        }

        const removeRound = (sub, rIdx) => {
            sub.rounds.splice(rIdx, 1)
            if (sub.currentRound >= sub.rounds.length) {
                sub.currentRound = Math.max(0, sub.rounds.length - 1)
            }
        }

        const addTaskInConfig = (sub) => {
            if (!Array.isArray(sub.tasks)) {
                sub.tasks = []
            }
            sub.tasks.push({
                key: `task_${Date.now()}_${sub.tasks.length}`,
                label: '学习任务',
                targetAmount: 1,
                unit: '项',
                cadenceDays: 1,
                enabled: true
            })
        }

        const removeTask = (sub, tIdx) => {
            sub.tasks.splice(tIdx, 1)
            if (sub.tasks.length === 0) {
                sub.tasks = defaultTaskForSubject(sub.name)
            }
        }

        const isSubjectInDay = (dayKey, subjectName) => {
            return (configModal.schedule[dayKey] || []).includes(subjectName)
        }

        const toggleDaySubject = (dayKey, subjectName) => {
            if (!configModal.schedule[dayKey]) {
                configModal.schedule[dayKey] = []
            }
            const arr = configModal.schedule[dayKey]
            const pos = arr.indexOf(subjectName)
            if (pos > -1) {
                arr.splice(pos, 1)
            } else {
                arr.push(subjectName)
            }
        }

        const saveConfig = async () => {
            if (configSaving.value) return
            const subjects = configModal.subjects
                .filter(s => s.name.trim())
                .map(s => ({
                    name: s.name.trim(),
                    currentRound: Math.max(0, Math.min((s.rounds?.length || 1) - 1, s.currentRound || 0)),
                    rounds: (s.rounds || []).map(r => ({
                        roundName: r.roundName || '一轮',
                        progress: Math.min(100, Math.max(0, Number(r.progress) || 0)),
                        currentUnit: r.currentUnit || '',
                        totalUnit: r.totalUnit || ''
                    })).filter(r => r.roundName.trim()),
                    tasks: normalizeConfigTasks(s.tasks, s.name)
                        .filter(task => task.label.trim())
                        .map((task, index) => ({ ...task, order: index })),
                    color: s.color || '#A24363',
                    icon: s.icon || ''
                }))

            const weeklySchedule = {}
            for (const key in configModal.schedule) {
                const arr = configModal.schedule[key].filter(n => subjects.some(s => s.name === n) || n === '休息')
                if (arr.length > 0) {
                    weeklySchedule[key] = arr
                }
            }

            configSaving.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        targetDate: configModal.targetDate || undefined,
                        subjects: subjects.length > 0 ? subjects : undefined,
                        weeklySchedule: Object.keys(weeklySchedule).length > 0 ? weeklySchedule : undefined
                    })
                })
                const json = await res.json()
                if (json.success) {
                    showToast('配置已保存', 'success')
                    closeConfig()
                    await fetchData({ silent: true })
                } else {
                    showToast(json.message || '保存失败', 'error')
                }
            } catch (e) {
                showToast('保存出错', 'error')
            } finally {
                configSaving.value = false
            }
        }

        const openCheckIn = () => {
            checkInModal.subjects = []
            const existingRecords = data.value.todayCheckIn?.taskRecords || []
            checkInModal.taskRecords = (data.value.todayTasks || []).map(task => {
                const existing = existingRecords.find(record =>
                    record.subjectName === task.subjectName && record.taskKey === task.taskKey
                )
                return {
                    subjectName: task.subjectName,
                    taskKey: task.taskKey,
                    label: task.label,
                    unit: task.unit,
                    targetAmount: task.targetAmount,
                    cadenceDays: task.cadenceDays,
                    cadenceLabel: task.cadenceLabel,
                    completedAmount: existing?.completedAmount ?? 0
                }
            })
            checkInModal.note = ''
            checkInModal.show = true
        }

        const closeCheckIn = () => {
            checkInModal.show = false
        }

        const setTaskCompletion = (task, amount) => {
            task.completedAmount = Math.max(0, Number(amount) || 0)
        }

        const toggleCheckInSubject = (name) => {
            const pos = checkInModal.subjects.indexOf(name)
            if (pos > -1) {
                checkInModal.subjects.splice(pos, 1)
            } else {
                checkInModal.subjects.push(name)
            }
        }

        const submitCheckIn = async () => {
            if (checkInSubmitting.value) return
            checkInSubmitting.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate/checkin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: 'Bearer ' + token
                    },
                    body: JSON.stringify({
                        subjects: checkInModal.subjects,
                        taskRecords: checkInModal.taskRecords.map(task => ({
                            subjectName: task.subjectName,
                            taskKey: task.taskKey,
                            completedAmount: Number(task.completedAmount) || 0
                        })),
                        note: checkInModal.note
                    })
                })
                const json = await res.json()
                if (json.success) {
                    showToast('报到成功！', 'success')
                    closeCheckIn()
                    await fetchData({ silent: true })
                } else {
                    showToast(json.message || '报到失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                checkInSubmitting.value = false
            }
        }

        const cancelCheckIn = async () => {
            if (cancelSubmitting.value) return
            cancelSubmitting.value = true
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate/checkin', {
                    method: 'DELETE',
                    headers: { Authorization: 'Bearer ' + token }
                })
                const json = await res.json()
                if (json.success) {
                    showToast('已取消报到', 'info')
                    await fetchData({ silent: true })
                } else {
                    showToast(json.message || '取消失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                cancelSubmitting.value = false
            }
        }

        const { onMessage } = useWebSocket()

        const handleWSMessage = (message) => {
            if (message.type === 'postgraduateSync') {
                fetchData({ silent: true })
            }
        }

        onMounted(() => {
            todayStr.value = getTodayStr()
            weekdayText.value = getWeekdayText()
            fetchData()
            unsubscribeWS = onMessage(handleWSMessage)
        })

        onUnmounted(() => {
            if (unsubscribeWS) unsubscribeWS()
            if (toast.timer) clearTimeout(toast.timer)
        })

        return {
            loading, loadError, data, todayStr, weekdayText,
            sending, archiving, editSaving, configSaving, checkInSubmitting, cancelSubmitting,
            notifyTitle, notifyBody,
            toast, editModal, configModal, checkInModal,
            weekdayNames,
            dashboard, subjectCards, overallProgress, archiveView, notifyTemplates,
            fetchData, formatArchiveDate, sendNotification, applyNotifyTemplate, archiveProgress, openEdit, closeEdit, saveEdit, addRound,
            openConfig, closeConfig, saveConfig,
            addSubject, removeSubject, addRoundInConfig, removeRound,
            addTaskInConfig, removeTask,
            isSubjectInDay, toggleDaySubject,
            openCheckIn, closeCheckIn, setTaskCompletion, toggleCheckInSubject, submitCheckIn, cancelCheckIn
        }
    }
}
</script>

<style scoped>
.pg-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #faf8ff 0%, #f0f4ff 100%);
    position: relative;
    overflow-x: hidden;
    padding-bottom: 20px;
}

.pg-header {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.pg-back {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: none;
    background: rgba(0, 0, 0, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #555;
    cursor: pointer;
    transition: all 0.2s;
}

.pg-back:active { transform: scale(0.95); background: rgba(0, 0, 0, 0.08); }

.pg-header-title {
    font-size: 17px;
    font-weight: 700;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pg-header-spacer { width: 36px; }

.pg-loading {
    display: grid;
    gap: 12px;
    margin: 16px;
    padding: 16px;
    position: relative;
    z-index: 1;
    background: #FFFFFF;
    border: 3px solid #20202A;
    border-radius: 14px;
    box-shadow: 3px 4px 0 #20202A;
}
.pg-loading-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.pg-loading-head strong { width: 120px; height: 18px; border-radius: 5px; background: #58C8F5; }
.pg-loading-head span { width: 52px; height: 18px; border-radius: 999px; background: #FFD94A; }
.pg-loading-task { display: grid; grid-template-columns: 34px 1fr 42px; align-items: center; gap: 10px; min-height: 58px; padding: 10px; border: 2px solid #20202A; border-radius: 10px; }
.pg-loading-task i { width: 30px; height: 30px; border: 2px solid #20202A; border-radius: 50%; background: #75DFC1; }
.pg-loading-task span,.pg-loading-task b { height: 12px; border-radius: 4px; background: linear-gradient(100deg,#ECE8E2 25%,#FFFFFF 45%,#ECE8E2 65%); background-size: 220% 100%; animation: pg-loading-sweep 1.3s linear infinite; }
@keyframes pg-loading-sweep { to { background-position: -220% 0; } }

.pg-main {
    position: relative;
    z-index: 1;
    padding: 20px;
    max-width: 480px;
    margin: 0 auto;
}

.pg-empty-text { font-size: 16px; font-weight: 600; color: #555; margin-bottom: 6px; }
.pg-empty-hint { font-size: 13px; color: #999; }

.pg-empty-subjects {
    background: white;
    border-radius: var(--radius-lg, 12px);
    padding: 50px 20px;
    text-align: center;
    margin-bottom: 24px;
    border: 1.5px dashed rgba(50, 27, 38, 0.14);
}

.pg-section-title.compact {
    justify-content: space-between;
    margin-bottom: 12px;
}

.pg-section-title.compact strong {
    font-size: 13px;
    color: #2563eb;
}

/* 报到弹窗科目选择 */
.pg-checkin-subjects {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.pg-checkin-subject-tag {
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 500;
}

.pg-checkin-subject-tag.active {
    background: var(--color-primary-deep, #321B26);
    color: white;
    border-color: transparent;
}

.pg-checkin-subject-tag:not(.active):hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
}

.pg-checkin-tasks {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.pg-checkin-task-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 72px 24px;
    gap: 8px;
    align-items: center;
    padding: 10px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
}

.pg-checkin-task-main {
    min-width: 0;
}

.pg-checkin-task-main span,
.pg-checkin-task-main small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pg-checkin-task-main span {
    font-size: 13px;
    font-weight: 700;
    color: #334155;
}

.pg-checkin-task-main small {
    margin-top: 2px;
    font-size: 11px;
    color: #64748b;
}

.pg-task-amount-input {
    width: 72px;
    padding: 8px;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    background: white;
    font-size: 14px;
    text-align: center;
    outline: none;
}

.pg-task-unit {
    font-size: 12px;
    color: #64748b;
}

.pg-subjects-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 24px;
}

.pg-subject-card {
    border-radius: var(--radius-lg, 12px);
    padding: 16px;
    background: white;
    border: 2px solid transparent;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.3s ease;
    min-height: 140px;
    display: flex;
    flex-direction: column;
}

.pg-subject-card:active { transform: scale(0.97); }

.pg-subject-card.inactive {
    opacity: 0.55;
    background: #f8f9fa;
}

.pg-subject-card.inactive .pg-card-progress-fill { opacity: 0.5; }

.pg-card-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
}

.pg-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.pg-card-name { font-size: 15px; font-weight: 700; color: #333; }

.pg-card-round {
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary-deep, #24382D);
    background: var(--color-secondary-soft, #E7F0E4);
    padding: 2px 8px;
    border-radius: 8px;
}

.pg-card-progress-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.pg-card-progress-bar {
    flex: 1;
    height: 6px;
    background: #f0f0f0;
    border-radius: 3px;
    overflow: hidden;
}

.pg-card-progress-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--color-primary, #A24363);
    transition: opacity 0.2s ease;
}

.pg-card-progress-text { font-size: 12px; font-weight: 700; color: #666; min-width: 34px; text-align: right; }

.pg-card-unit { font-size: 11px; color: #888; margin-bottom: 8px; line-height: 1.4; }
.pg-card-current { color: #555; }
.pg-card-total { color: #aaa; }

.pg-card-status { margin-top: auto; }

.pg-card-tag {
    display: inline-block;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 10px;
    font-weight: 600;
}

.pg-card-tag.today { background: linear-gradient(90deg, #ffecd2 0%, #fcb69f 100%); color: #c44; }
.pg-card-tag.rest { background: #e2e8f0; color: #718096; }

.pg-config-btn {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: 1.5px dashed rgba(162, 67, 99, 0.24);
    background: #FFFAFC;
    color: var(--color-primary, #A24363);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
}

.pg-config-btn:hover {
    background: var(--color-primary-soft, #F7DDE8);
    border-color: rgba(162, 67, 99, 0.38);
}

.pg-config-btn:active { transform: scale(0.98); }

.pg-archive-section {
    background: #ffffff;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    color: var(--text-primary, #261F24);
}

.pg-archive-section .pg-section-title {
    color: var(--color-secondary-deep, #24382D);
}

.pg-archive-section .pg-section-title strong {
    color: var(--color-secondary, #526F5C);
}

.pg-archive-desc {
    font-size: 12px;
    line-height: 1.6;
    color: var(--text-secondary, #5F535B);
    margin-bottom: 12px;
}

.pg-archive-btn {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid rgba(82, 111, 92, 0.22);
    border-radius: 8px;
    background: var(--color-secondary-deep, #24382D);
    color: white;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
}

.pg-archive-btn:disabled {
    cursor: not-allowed;
    opacity: 0.58;
}

.pg-notify-section {
    background: white;
    border-radius: var(--radius-lg, 12px);
    padding: 20px;
    box-shadow: none;
    border: 1px solid rgba(50, 27, 38, 0.1);
}

.pg-section-title {
    font-size: 15px;
    font-weight: 700;
    color: #333;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.pg-notify-inputs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
}

.pg-input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 14px;
    color: #333;
    background: #f8fafc;
    box-sizing: border-box;
    transition: all 0.2s;
    outline: none;
    font-family: inherit;
}

.pg-input:focus {
    border-color: var(--border-focus, rgba(162, 67, 99, 0.32));
    background: white;
    box-shadow: 0 0 0 3px rgba(162, 67, 99, 0.1);
}

.pg-input::placeholder { color: #a0aec0; }

.pg-input-body { resize: none; line-height: 1.5; }

.pg-send-btn {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: none;
    background: var(--color-primary-deep, #321B26);
    color: white;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
}

.pg-send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.pg-send-btn:not(:disabled):active { transform: scale(0.98); }

.pg-bottom-space { height: 40px; }

.pg-toast {
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    padding: 10px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: white;
    background: #333;
    opacity: 0;
    pointer-events: none;
    transition: all 0.3s ease;
    z-index: 200;
    white-space: nowrap;
}

.pg-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.pg-toast.success { background: linear-gradient(135deg, #48bb78, #38a169); }
.pg-toast.error { background: linear-gradient(135deg, #f56565, #e53e3e); }

.pg-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    z-index: 150;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s;
}

.pg-modal-overlay.show { opacity: 1; pointer-events: auto; }

.pg-modal {
    background: white;
    border-radius: var(--radius-lg, 12px);
    padding: 24px;
    width: 100%;
    max-width: 360px;
    max-height: 80vh;
    overflow-y: auto;
    transform: scale(0.95);
    transition: transform 0.2s;
}

.pg-modal-wide { max-width: 420px; }

.pg-modal-overlay.show .pg-modal { transform: scale(1); }

.pg-modal-title {
    font-size: 17px;
    font-weight: 700;
    color: #333;
    margin-bottom: 20px;
    text-align: center;
}

.pg-modal-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 20px;
}

.pg-modal-field label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
    font-weight: 500;
}

.pg-modal-input {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 14px;
    color: #333;
    background: #f8fafc;
    box-sizing: border-box;
    outline: none;
    transition: all 0.2s;
    font-family: inherit;
}

.pg-modal-input:focus {
    border-color: var(--border-focus, rgba(162, 67, 99, 0.32));
    background: white;
    box-shadow: 0 0 0 3px rgba(162, 67, 99, 0.1);
}

.pg-modal-actions {
    display: flex;
    gap: 10px;
}

.pg-modal-btn {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    border: none;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.pg-modal-btn.cancel { background: #f1f5f9; color: #64748b; }
.pg-modal-btn.confirm { background: var(--color-primary-deep, #321B26); color: white; }
.pg-modal-btn:active { transform: scale(0.97); }

/* 轮次标签 */
.pg-round-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.pg-round-tab {
    font-size: 13px;
    padding: 6px 14px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: #f8fafc;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    font-weight: 500;
}

.pg-round-tab.active {
    background: var(--color-primary-deep, #321B26);
    color: white;
    border-color: transparent;
}

.pg-round-tab.add {
    background: #FFFAFC;
    color: var(--color-primary, #A24363);
    border: 1.5px dashed rgba(162, 67, 99, 0.24);
    font-weight: 700;
}

.pg-round-tab.add:active { transform: scale(0.9); }

/* 配置弹窗 - 科目表单 */
.pg-subject-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.pg-subject-form {
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid #e2e8f0;
}

.pg-subject-form-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

.pg-subject-form-row:last-child {
    margin-bottom: 0;
}

.pg-subject-del {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: #fee2e2;
    color: #ef4444;
    font-size: 12px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.pg-subject-del:active { transform: scale(0.9); }

.pg-round-config {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 6px;
}

.pg-round-config-row {
    display: flex;
    align-items: center;
    gap: 6px;
}

.pg-add-subject-btn {
    width: 100%;
    padding: 10px;
    border-radius: 10px;
    border: 1.5px dashed rgba(162, 67, 99, 0.24);
    background: #FFFAFC;
    color: var(--color-primary, #A24363);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 8px;
    transition: all 0.2s;
}

.pg-add-subject-btn:hover { background: var(--color-primary-soft, #F7DDE8); border-color: rgba(162, 67, 99, 0.38); }
.pg-add-subject-btn:active { transform: scale(0.98); }

.pg-add-round-btn {
    width: 100%;
    padding: 6px;
    border-radius: 8px;
    border: 1px dashed #cbd5e1;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-top: 4px;
    transition: all 0.2s;
}

.pg-add-round-btn:hover { border-color: rgba(162, 67, 99, 0.38); color: var(--color-primary, #A24363); }

.pg-task-config {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid #e2e8f0;
}

.pg-task-config-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #475569;
}

.pg-add-task-btn {
    border: none;
    border-radius: 8px;
    padding: 5px 9px;
    background: #e0f2fe;
    color: #0369a1;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
}

.pg-task-config-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px 52px 52px 28px;
    gap: 6px;
    align-items: center;
    margin-bottom: 6px;
}

.pg-task-config-row:last-child {
    margin-bottom: 0;
}

.pg-task-config-row .pg-modal-input {
    min-width: 0;
    padding: 8px 9px;
    border-radius: 8px;
    font-size: 12px;
}

.pg-task-config-row .pg-modal-input.amount,
.pg-task-config-row .pg-modal-input.unit,
.pg-task-config-row .pg-modal-input.cadence {
    text-align: center;
}

/* 配置弹窗 - 每周计划 */
.pg-schedule-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.pg-schedule-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: #f8fafc;
    border-radius: 10px;
    padding: 10px 12px;
}

.pg-schedule-label {
    font-size: 13px;
    font-weight: 600;
    color: #555;
    min-width: 36px;
    padding-top: 4px;
}

.pg-schedule-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    flex: 1;
}

.pg-schedule-tag {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: white;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 500;
    white-space: nowrap;
}

.pg-schedule-tag.active {
    background: var(--color-primary-deep, #321B26);
    color: white;
    border-color: transparent;
}

.pg-schedule-tag.rest-tag.active {
    background: linear-gradient(135deg, #48bb78, #38a169);
    color: white;
    border-color: transparent;
}

.pg-schedule-tag:not(.active):hover {
    border-color: #cbd5e1;
    background: #f1f5f9;
}

/* 考研陪跑商业化视觉覆盖 */
.pg-page {
    min-height: 100vh;
    background:
        linear-gradient(180deg, #FAF7FA 0%, #F2F6F3 54%, #EAF3F6 100%),
        linear-gradient(125deg, rgba(162, 67, 99, 0.08), rgba(82, 111, 92, 0.08));
    color: var(--text-primary, #261F24);
    font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif);
    overflow-x: hidden;
    padding-bottom: 28px;
}

.pg-header {
    position: sticky;
    top: 0;
    z-index: 20;
    padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
    background: rgba(250, 247, 250, 0.94);
    border-bottom: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    backdrop-filter: blur(16px);
}

.pg-back {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    color: var(--color-primary-deep, #321B26);
}

.pg-header-title {
    color: var(--color-primary-deep, #321B26);
    font-size: 16px;
    letter-spacing: 0;
}

.pg-main {
    max-width: 760px;
    padding: 16px;
}

.pg-loading-ring {
    width: 34px;
    height: 34px;
    border: 3px solid rgba(50, 27, 38, 0.14);
    border-top-color: var(--color-primary, #A24363);
    border-radius: 50%;
    animation: pg-spin 0.8s linear infinite;
}

.pg-inline-error {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 8px;
    background: #FFF3E5;
    border: 1px solid rgba(138, 75, 22, 0.2);
    color: var(--color-warning, #8A4B16);
    font-size: 13px;
}

.pg-inline-error button,
.pg-secondary-btn,
.pg-primary-btn,
.pg-template-chip {
    min-height: 44px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
}

.pg-inline-error button {
    border: 1px solid rgba(138, 75, 22, 0.24);
    background: #ffffff;
    color: var(--color-warning, #8A4B16);
    padding: 0 12px;
    white-space: nowrap;
}

.pg-command-card,
.pg-panel,
.pg-archive-section,
.pg-notify-section,
.pg-empty-card,
.pg-empty-subjects {
    border-radius: 8px;
    box-shadow: none;
}

.pg-command-card {
    padding: 20px;
    margin-bottom: 12px;
    background: linear-gradient(180deg, #FFFEFD 0%, rgba(255, 250, 253, 0.96) 100%);
    color: var(--text-primary, #261F24);
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    box-shadow: var(--shadow-soft, 0 4px 8px rgba(50, 27, 38, 0.08));
}

.pg-command-card.pending { border-color: rgba(138, 75, 22, 0.22); }
.pg-command-card.partial { border-color: rgba(82, 111, 92, 0.24); }
.pg-command-card.risk { border-color: rgba(154, 51, 42, 0.28); }
.pg-command-card.done { border-color: rgba(40, 107, 76, 0.28); }
.pg-command-card.rest,
.pg-command-card.setup { border-color: rgba(162, 67, 99, 0.22); }

.pg-command-top {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 88px;
    gap: 14px;
    align-items: start;
}

.pg-kicker {
    display: block;
    margin-bottom: 4px;
    color: var(--color-primary, #A24363);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0;
}

.pg-command-date {
    display: block;
    margin-bottom: 10px;
    color: var(--text-tertiary, #756872);
    font-size: 12px;
    line-height: 1.35;
}

.pg-command-copy h1 {
    margin: 0;
    color: var(--color-primary-deep, #321B26);
    font-family: var(--font-display, var(--font-ui, sans-serif));
    font-size: 24px;
    line-height: 1.18;
    letter-spacing: 0;
}

.pg-command-copy p {
    margin: 9px 0 0;
    color: var(--text-secondary, #5F535B);
    font-size: 13px;
    line-height: 1.55;
}

.pg-command-meter {
    aspect-ratio: 1;
    border-radius: 8px;
    background: var(--color-primary-soft, #F7DDE8);
    border: 1px solid rgba(162, 67, 99, 0.16);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
}

.pg-command-meter strong {
    font-size: 24px;
    line-height: 1;
    color: var(--color-primary-deep, #321B26);
}

.pg-command-meter span {
    margin-top: 6px;
    color: var(--text-secondary, #5F535B);
    font-size: 11px;
}

.pg-command-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-top: 14px;
}

.pg-command-stats div {
    min-width: 0;
    padding: 10px 8px;
    border-radius: 8px;
    background: rgba(246, 236, 226, 0.54);
    border: 1px solid rgba(50, 27, 38, 0.06);
}

.pg-command-stats span,
.pg-command-stats small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pg-command-stats span {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-primary-deep, #321B26);
}

.pg-command-stats small {
    margin-top: 3px;
    color: var(--text-tertiary, #756872);
    font-size: 11px;
}

.pg-command-actions {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 10px;
    margin-top: 14px;
}

.pg-primary-btn,
.pg-secondary-btn {
    border: none;
    padding: 10px 12px;
    font-size: 13px;
}

.pg-primary-btn {
    background: var(--color-primary-deep, #321B26);
    color: #ffffff;
}

.pg-primary-btn:disabled,
.pg-secondary-btn:disabled {
    opacity: 0.62;
    cursor: not-allowed;
}

.pg-secondary-btn {
    background: #ffffff;
    color: var(--color-primary-deep, #321B26);
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
}

.pg-panel {
    background: #ffffff;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    padding: 14px;
    margin-bottom: 12px;
}

.pg-section-title {
    color: var(--color-primary-deep, #321B26);
    font-size: 14px;
}

.pg-section-title.compact {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
}

.pg-section-title.compact strong {
    color: var(--color-secondary, #526F5C);
}

.pg-section-title.compact > div span,
.pg-section-title.compact > div small {
    display: block;
}

.pg-section-title.compact > div small {
    margin-top: 4px;
    color: #6F6C74;
    font-size: 11px;
    font-weight: 600;
}

.pg-list-actions {
    display: flex;
    gap: 10px;
    margin-top: 14px;
}

.pg-list-actions button {
    flex: 1;
}

.pg-subjects-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 18px 2px 10px;
    color: #20202A;
    font-size: 14px;
    font-weight: 900;
}

.pg-subjects-head strong {
    color: #167BA3;
    font-size: 12px;
}

.pg-task-list {
    display: grid;
    gap: 10px;
}

.pg-task-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
    align-items: center;
    padding: 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    color: var(--text-primary, #261F24);
}

.pg-task-item.done { border-color: rgba(40, 107, 76, 0.22); background: #F1F7EF; }
.pg-task-item.partial { border-color: rgba(82, 111, 92, 0.22); background: #F3F7F1; }
.pg-task-item.missed { border-color: rgba(154, 51, 42, 0.2); background: #FFF1EE; }
.pg-task-item.pending { border-color: rgba(138, 75, 22, 0.2); background: #FFF8EC; }

.pg-task-main,
.pg-task-result {
    min-width: 0;
}

.pg-task-main strong,
.pg-task-main span,
.pg-task-result strong,
.pg-task-result span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pg-task-main strong {
    font-size: 13px;
}

.pg-task-main span,
.pg-task-result span {
    margin-top: 3px;
    color: var(--text-tertiary, #756872);
    font-size: 11px;
}

.pg-task-result {
    text-align: right;
}

.pg-task-result strong {
    font-size: 13px;
}

.pg-task-progress {
    grid-column: 1 / -1;
    height: 5px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(50, 27, 38, 0.08);
}

.pg-task-progress div {
    height: 100%;
    border-radius: inherit;
    background: var(--color-secondary, #526F5C);
}

.pg-task-item.partial .pg-task-progress div { background: var(--color-primary, #A24363); }
.pg-task-item.pending .pg-task-progress div { background: var(--color-warning, #8A4B16); }
.pg-task-item.missed .pg-task-progress div { background: var(--color-danger, #9A332A); }

.pg-rest-state {
    display: grid;
    gap: 6px;
    padding: 14px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
    border: 1px dashed rgba(50, 27, 38, 0.16);
}

.pg-rest-state strong {
    font-size: 14px;
}

.pg-rest-state span {
    color: var(--text-secondary, #5F535B);
    font-size: 12px;
    line-height: 1.5;
}

.pg-subjects-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
}

.pg-subject-card {
    min-height: 132px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    padding: 13px;
    background: #ffffff;
    appearance: none;
    width: 100%;
    text-align: left;
    font: inherit;
    color: inherit;
    touch-action: manipulation;
}

.pg-subject-card.active {
    border-color: rgba(162, 67, 99, 0.28);
    background: #FFFBFC;
}

.pg-subject-card.inactive {
    opacity: 1;
    background: #fbfaf8;
}

.pg-card-name {
    color: var(--color-primary-deep, #321B26);
}

.pg-card-round {
    border-radius: 999px;
    color: var(--color-secondary-deep, #24382D);
    background: var(--color-secondary-soft, #E7F0E4);
}

.pg-card-progress-fill {
    background: var(--color-primary, #A24363);
}

.pg-card-tag {
    border-radius: 999px;
}

.pg-card-tag.today {
    background: #FFF3E5;
    color: var(--color-warning, #8A4B16);
}

.pg-card-tag.rest {
    background: #F1EDF0;
    color: var(--text-secondary, #5F535B);
}

.pg-config-btn {
    border-radius: 8px;
    border-color: rgba(162, 67, 99, 0.26);
    background: #ffffff;
    color: var(--color-primary-deep, #321B26);
    margin-bottom: 12px;
}

.pg-archive-section {
    background: linear-gradient(180deg, #FFFFFF 0%, #F7FAF5 100%);
    border: 1px solid rgba(82, 111, 92, 0.16);
    color: var(--text-primary, #261F24);
    padding: 16px;
    margin-bottom: 12px;
}

.pg-archive-section .pg-section-title,
.pg-archive-section .pg-section-title strong {
    color: var(--color-secondary-deep, #24382D);
}

.pg-archive-desc {
    color: var(--text-secondary, #5F535B);
}

.pg-archive-latest {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 10px;
}

.pg-archive-latest div,
.pg-archive-entry {
    min-width: 0;
    border-radius: 8px;
    background: rgba(231, 240, 228, 0.62);
    border: 1px solid rgba(82, 111, 92, 0.12);
    padding: 9px;
}

.pg-archive-latest span,
.pg-archive-latest strong,
.pg-archive-entry strong,
.pg-archive-entry span,
.pg-archive-entry small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pg-archive-latest span,
.pg-archive-entry span,
.pg-archive-entry small {
    color: var(--text-secondary, #5F535B);
    font-size: 11px;
}

.pg-archive-latest strong,
.pg-archive-entry strong {
    margin-top: 4px;
    color: var(--color-secondary-deep, #24382D);
    font-size: 13px;
}

.pg-archive-list {
    display: grid;
    gap: 8px;
    margin-bottom: 10px;
}

.pg-archive-entry {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
}

.pg-archive-btn {
    border-radius: 8px;
    background: var(--color-secondary-deep, #24382D);
    border-color: var(--color-secondary-deep, #24382D);
    color: #ffffff;
}

.pg-notify-section {
    background: #ffffff;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    padding: 16px;
}

.pg-template-rail {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 10px;
}

.pg-template-chip {
    flex: 0 0 auto;
    border: 1px solid rgba(162, 67, 99, 0.18);
    background: #FFFAFC;
    color: var(--color-primary-deep, #321B26);
    padding: 0 12px;
    font-size: 12px;
}

.pg-field-label {
    color: var(--text-secondary, #5F535B);
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
}

.pg-input,
.pg-modal-input {
    border-radius: 8px;
    border-color: var(--border-color, rgba(50, 27, 38, 0.1));
    background: var(--bg-input, rgba(246, 241, 244, 0.92));
    color: var(--text-primary, #261F24);
}

.pg-input:focus,
.pg-modal-input:focus {
    border-color: var(--border-focus, rgba(162, 67, 99, 0.32));
    box-shadow: 0 0 0 3px rgba(162, 67, 99, 0.1);
}

.pg-send-btn,
.pg-modal-btn,
.pg-checkin-btn {
    border-radius: 8px;
}

.pg-send-btn,
.pg-modal-btn.confirm {
    background: var(--color-primary-deep, #321B26);
    color: #ffffff;
}

.pg-modal {
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    box-shadow: 0 12px 32px rgba(50, 27, 38, 0.16);
}

.pg-checkin-task-row {
    grid-template-columns: minmax(0, 1fr) auto;
    border-radius: 8px;
    background: #FFFCFD;
    border-color: var(--border-color, rgba(50, 27, 38, 0.1));
}

.pg-task-amount-box {
    display: flex;
    align-items: center;
    gap: 6px;
}

.pg-task-quick-actions {
    grid-column: 1 / -1;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.pg-task-quick-actions button {
    min-height: 44px;
    padding: 0 10px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(50, 27, 38, 0.1));
    background: #ffffff;
    color: var(--color-primary-deep, #321B26);
    font-size: 12px;
    font-weight: 700;
}

.pg-checkin-subject-tag.active,
.pg-round-tab.active,
.pg-schedule-tag.active {
    background: var(--color-primary-deep, #321B26);
    color: #ffffff;
    border-color: var(--color-primary-deep, #321B26);
}

.pg-round-tab.add,
.pg-add-subject-btn,
.pg-add-round-btn {
    border-color: rgba(162, 67, 99, 0.24);
    background: #FFFAFC;
    color: var(--color-primary, #A24363);
}

.pg-add-subject-btn:hover,
.pg-add-round-btn:hover,
.pg-config-btn:hover {
    background: var(--color-primary-soft, #F7DDE8);
    border-color: rgba(162, 67, 99, 0.38);
    color: var(--color-primary-deep, #321B26);
}

.pg-schedule-row,
.pg-subject-form {
    background: #FFFCFD;
    border-color: var(--border-color, rgba(50, 27, 38, 0.1));
}

.pg-subject-name-input,
.pg-round-name-input,
.pg-round-unit-input,
.pg-round-total-input {
    min-width: 0;
}

.pg-round-config-row {
    display: grid;
    grid-template-columns: 72px 64px minmax(0, 1fr) 72px 28px;
}

.pg-round-progress-input {
    text-align: center;
}

.pg-modal-btn:disabled,
.pg-send-btn:disabled,
.pg-archive-btn:disabled {
    opacity: 0.58;
    cursor: not-allowed;
}

@media (max-width: 560px) {
    .pg-main {
        padding: 12px;
    }

    .pg-modal-overlay {
        padding: 12px;
    }

    .pg-modal,
    .pg-modal-wide {
        max-width: calc(100vw - 24px);
        padding: 18px;
    }

    .pg-command-top,
    .pg-command-actions,
    .pg-archive-latest,
    .pg-archive-entry {
        grid-template-columns: 1fr;
    }

    .pg-command-meter {
        width: 100%;
        min-height: 78px;
        aspect-ratio: auto;
    }

    .pg-command-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .pg-subjects-grid {
        grid-template-columns: 1fr;
    }

    .pg-task-item,
    .pg-checkin-task-row {
        grid-template-columns: 1fr;
    }

    .pg-task-result {
        text-align: left;
    }

    .pg-task-main strong,
    .pg-task-main span,
    .pg-task-result strong,
    .pg-task-result span {
        white-space: normal;
    }

    .pg-round-config-row {
        grid-template-columns: 68px 58px minmax(0, 1fr) 68px 28px;
        gap: 5px;
    }

    .pg-task-config-row {
        grid-template-columns: minmax(0, 1fr) 58px 48px 48px 28px;
        gap: 5px;
    }

    .pg-task-config-row .pg-modal-input,
    .pg-round-config-row .pg-modal-input {
        padding: 8px 7px;
        font-size: 12px;
    }
}

@keyframes pg-spin {
    to { transform: rotate(360deg); }
}
</style>
