<template>
    <div class="pg-page">
        <div class="pg-bg">
            <div class="pg-orb orb-1"></div>
            <div class="pg-orb orb-2"></div>
        </div>

        <header class="pg-header">
            <button class="pg-back" @click="$router.push('/home')">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <polyline points="15 18 9 12 15 6"/>
                </svg>
            </button>
            <div class="pg-header-title">
                <span>考研进度板</span>
            </div>
            <div class="pg-header-spacer"></div>
        </header>

        <div v-if="loading" class="pg-loading">
            <div class="pg-loading-heart">💕</div>
            <div class="pg-loading-text">加载中...</div>
        </div>

        <div v-else class="pg-main">
            <!-- 倒计时卡片 -->
            <div class="pg-countdown-card" v-if="data.targetDate">
                <div class="pg-countdown-label">距离考研还有</div>
                <div class="pg-countdown-num">{{ data.daysLeft !== null ? data.daysLeft : '—' }}</div>
                <div class="pg-countdown-unit">天</div>
                <div class="pg-countdown-date">目标日期：{{ data.targetDate }}</div>
                <div class="pg-countdown-today">今天是 {{ todayStr }}，{{ weekdayText }}</div>
            </div>
            <div class="pg-empty-card" v-else>
                <div class="pg-empty-text">尚未设置目标日期</div>
                <div class="pg-empty-hint">点击下方按钮配置考研计划</div>
            </div>

            <!-- 今日任务 -->
            <div class="pg-today-banner" v-if="data.todaySubjects && data.todaySubjects.length > 0" :class="{ rest: data.todaySubjects?.includes('休息') }">
                <div class="pg-today-text">
                    <span v-if="data.todaySubjects?.includes('休息')">今天休息</span>
                    <span v-else>今日学习任务：{{ data.todaySubjects?.join('、') }}</span>
                </div>
            </div>

            <div class="pg-task-panel" v-if="data.todayTaskGroups && data.todayTaskGroups.length > 0">
                <div class="pg-section-title compact">
                    <span>今日执行清单</span>
                    <strong>{{ data.todayCompletionRate || 0 }}%</strong>
                </div>
                <div class="pg-task-groups">
                    <div v-for="group in data.todayTaskGroups" :key="group.subjectName" class="pg-task-group">
                        <div class="pg-task-subject">
                            <span class="pg-task-dot" :style="{ background: group.color || '#8b5cf6' }"></span>
                            <span>{{ group.subjectName }}</span>
                        </div>
                        <div class="pg-task-items">
                            <div v-for="task in group.tasks" :key="task.subjectName + task.taskKey" class="pg-task-item">
                                <span>{{ task.label }}</span>
                                <strong>{{ task.targetAmount }}{{ task.unit }}</strong>
                                <em>{{ task.cadenceLabel }}</em>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 学习报到 -->
            <div class="pg-checkin-card" :class="{ checked: data.todayCheckedIn }">
                <div class="pg-checkin-left">
                    <div class="pg-checkin-status">
                        <span v-if="data.todayCheckedIn">今日已报到</span>
                        <span v-else>今日未报到</span>
                    </div>
                    <div class="pg-checkin-streak">
                        <span v-if="data.streak > 0">连续 {{ data.streak }} 天</span>
                        <span v-else>开始你的第一天</span>
                    </div>
                    <div class="pg-checkin-detail" v-if="data.todayCheckedIn && data.todayCheckIn">
                        <span v-if="data.todayCheckIn.subjects?.length > 0">学了：{{ data.todayCheckIn.subjects.join('、') }}</span>
                        <span v-if="data.todayCheckIn.taskRecords?.length">完成率：{{ data.todayCheckIn.completionRate || 0 }}%</span>
                        <span v-if="data.todayCheckIn.note">{{ data.todayCheckIn.note }}</span>
                    </div>
                </div>
                <div class="pg-checkin-right">
                    <button v-if="!data.todayCheckedIn" class="pg-checkin-btn" @click="openCheckIn">
                        报到
                    </button>
                    <button v-else class="pg-checkin-btn checked" @click="cancelCheckIn">
                        取消
                    </button>
                </div>
            </div>

            <!-- 科目列表 -->
            <div class="pg-subjects-grid" v-if="data.subjects && data.subjects.length > 0">
                <div
                    v-for="subject in data.subjects"
                    :key="subject.name"
                    class="pg-subject-card"
                    :class="{ active: isTodaySubject(subject.name), inactive: !isTodaySubject(subject.name) }"
                    :style="getCardStyle(subject)"
                    @click="openEdit(subject)"
                >
                    <div class="pg-card-glow" v-if="isTodaySubject(subject.name)"></div>
                    <div class="pg-card-inner">
                        <div class="pg-card-top">
                            <span class="pg-card-name">{{ subject.name }}</span>
                            <span class="pg-card-round">{{ getCurrentRound(subject)?.roundName || '一轮' }}</span>
                        </div>
                        <div class="pg-card-progress-wrap">
                            <div class="pg-card-progress-bar">
                                <div class="pg-card-progress-fill" :style="{ width: (getCurrentRound(subject)?.progress || 0) + '%' }"></div>
                            </div>
                            <span class="pg-card-progress-text">{{ getCurrentRound(subject)?.progress || 0 }}%</span>
                        </div>
                        <div class="pg-card-unit">
                            <span class="pg-card-current">{{ getCurrentRound(subject)?.currentUnit || '—' }}</span>
                            <span class="pg-card-total" v-if="getCurrentRound(subject)?.totalUnit">/{{ getCurrentRound(subject)?.totalUnit }}</span>
                        </div>
                        <div class="pg-card-status">
                            <span v-if="isTodaySubject(subject.name)" class="pg-card-tag today">今日必学</span>
                            <span v-else class="pg-card-tag rest">今日休息</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="pg-empty-subjects" v-else>
                <div class="pg-empty-text">还没有添加科目</div>
                <div class="pg-empty-hint">点击配置计划按钮添加科目</div>
            </div>

            <button class="pg-config-btn" @click="openConfig">
                配置计划
            </button>

            <div class="pg-archive-section">
                <div class="pg-section-title compact">
                    <span>考研全过程档案</span>
                    <strong>{{ data.archiveRepository?.entries?.length || 0 }} 份</strong>
                </div>
                <div class="pg-archive-desc">
                    考研结束后，将每日任务、报到、完成率和计划变更固化为专属档案。
                </div>
                <button class="pg-archive-btn" :disabled="archiving || !data.archiveReady" @click="archiveProgress">
                    <span v-if="archiving">归档中...</span>
                    <span v-else-if="data.archiveReady">生成归档快照</span>
                    <span v-else>目标日期后可归档</span>
                </button>
            </div>

            <!-- 通知区 -->
            <div class="pg-notify-section">
                <div class="pg-section-title">
                    <span>发送提醒</span>
                </div>
                <div class="pg-notify-inputs">
                    <input v-model="notifyTitle" class="pg-input pg-input-title" placeholder="通知标题" maxlength="30"/>
                    <textarea v-model="notifyBody" class="pg-input pg-input-body" placeholder="输入要发送的提醒内容..." rows="3" maxlength="200"></textarea>
                </div>
                <button class="pg-send-btn" :disabled="sending || !notifyTitle.trim() || !notifyBody.trim()" @click="sendNotification">
                    <span v-if="sending">发送中...</span>
                    <span v-else>发送到伴侣的手机</span>
                </button>
            </div>

            <div class="pg-bottom-space"></div>
        </div>

        <div class="pg-toast" :class="{ show: toast.show, [toast.type]: true }">
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
                                class="pg-round-tab"
                                :class="{ active: editModal.currentRound === idx }"
                                @click="editModal.currentRound = idx"
                            >
                                {{ round.roundName }}
                            </button>
                            <button class="pg-round-tab add" @click="addRound">+</button>
                        </div>
                    </div>

                    <div class="pg-modal-field" v-if="editModal.rounds[editModal.currentRound]">
                        <label>当前进度 (%)</label>
                        <input v-model.number="editModal.rounds[editModal.currentRound].progress" type="number" min="0" max="100" class="pg-modal-input"/>
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
                    <button class="pg-modal-btn cancel" @click="closeEdit">取消</button>
                    <button class="pg-modal-btn confirm" @click="saveEdit">保存</button>
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
                                <input v-model.number="task.completedAmount" type="number" min="0" class="pg-task-amount-input"/>
                                <span class="pg-task-unit">{{ task.unit }}</span>
                            </div>
                        </div>
                    </div>
                    <div class="pg-modal-field" v-else>
                        <label>今天学了哪些科目</label>
                        <div class="pg-checkin-subjects">
                            <button
                                v-for="sub in data.subjects"
                                :key="sub.name"
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
                    <button class="pg-modal-btn cancel" @click="closeCheckIn">取消</button>
                    <button class="pg-modal-btn confirm" @click="submitCheckIn">报到</button>
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
                                    <input v-model="sub.name" class="pg-modal-input" placeholder="科目名" style="flex:1"/>
                                    <button class="pg-subject-del" @click="removeSubject(idx)">✕</button>
                                </div>
                                <!-- 轮次配置 -->
                                <div class="pg-round-config">
                                    <div v-for="(round, rIdx) in sub.rounds" :key="rIdx" class="pg-round-config-row">
                                        <input v-model="round.roundName" class="pg-modal-input" placeholder="轮次名" style="width:70px"/>
                                        <input v-model.number="round.progress" type="number" min="0" max="100" class="pg-modal-input" placeholder="进度%" style="width:70px"/>
                                        <input v-model="round.currentUnit" class="pg-modal-input" placeholder="当前章节" style="flex:1"/>
                                        <input v-model="round.totalUnit" class="pg-modal-input" placeholder="总内容" style="flex:1"/>
                                        <button v-if="sub.rounds.length > 1" class="pg-subject-del" @click="removeRound(sub, rIdx)">✕</button>
                                    </div>
                                    <button class="pg-add-round-btn" @click="addRoundInConfig(sub)">
                                        <span>+</span> 添加轮次
                                    </button>
                                </div>
                                <!-- 每日执行任务 -->
                                <div class="pg-task-config">
                                    <div class="pg-task-config-head">
                                        <span>督促任务</span>
                                        <button class="pg-add-task-btn" @click="addTaskInConfig(sub)">添加</button>
                                    </div>
                                    <div v-for="(task, tIdx) in sub.tasks" :key="task.key || tIdx" class="pg-task-config-row">
                                        <input v-model="task.label" class="pg-modal-input" placeholder="任务，如刷题"/>
                                        <input v-model.number="task.targetAmount" type="number" min="0" class="pg-modal-input amount" placeholder="数量"/>
                                        <input v-model="task.unit" class="pg-modal-input unit" placeholder="单位"/>
                                        <input v-model.number="task.cadenceDays" type="number" min="1" max="14" class="pg-modal-input cadence" placeholder="周期" title="每几天一次"/>
                                        <button class="pg-subject-del" @click="removeTask(sub, tIdx)">✕</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="pg-add-subject-btn" @click="addSubject">
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
                                        class="pg-schedule-tag"
                                        :class="{ active: isSubjectInDay(day.key, sub.name) }"
                                        @click="toggleDaySubject(day.key, sub.name)"
                                    >
                                        {{ sub.name }}
                                    </button>
                                    <button
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
                    <button class="pg-modal-btn cancel" @click="closeConfig">取消</button>
                    <button class="pg-modal-btn confirm" @click="saveConfig">保存</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { CONFIG } from '../utils/config.js'

export default {
    name: 'Postgraduate',
    setup() {
        const loading = ref(true)
        const data = ref({})
        const todayStr = ref('')
        const weekdayText = ref('')
        const sending = ref(false)
        const archiving = ref(false)
        const notifyTitle = ref('')
        const notifyBody = ref('')

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

        const getToken = () => localStorage.getItem('token')

        const getTodayStr = () => {
            const d = new Date()
            return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`
        }

        const getWeekdayText = () => {
            return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date().getDay()]
        }

        const showToast = (message, type = 'info') => {
            if (toast.timer) clearTimeout(toast.timer)
            toast.show = true
            toast.message = message
            toast.type = type
            toast.timer = setTimeout(() => { toast.show = false }, 2500)
        }

        const fetchData = async () => {
            try {
                const token = getToken()
                if (!token) return
                const res = await fetch(CONFIG.API_URL + '/postgraduate', {
                    headers: { Authorization: 'Bearer ' + token }
                })
                const json = await res.json()
                if (json.success) {
                    data.value = json.data
                }
            } catch (e) {
                console.error('获取考研进度失败:', e)
            } finally {
                loading.value = false
            }
        }

        const isTodaySubject = (name) => {
            return data.value.todaySubjects?.includes(name) || false
        }

        const getCurrentRound = (subject) => {
            // 兼容旧数据：没有 rounds 但有 progress 的，自动转成一轮
            if (!subject.rounds || subject.rounds.length === 0) {
                return {
                    roundName: '一轮',
                    progress: subject.progress || 0,
                    currentUnit: subject.currentUnit || '',
                    totalUnit: subject.totalUnit || ''
                }
            }
            const idx = subject.currentRound || 0
            return subject.rounds[idx] || subject.rounds[0]
        }

        const getCardStyle = (subject) => {
            if (isTodaySubject(subject.name)) {
                return {
                    borderColor: '#8b5cf6',
                    boxShadow: '0 0 20px rgba(139,92,246,0.15), 0 4px 12px rgba(0,0,0,0.08)'
                }
            }
            return {
                borderColor: 'transparent',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
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
                    showToast('通知已发送到小小公主的手机！', 'success')
                } else {
                    showToast(json.message || '发送失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                sending.value = false
            }
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
                    data.value.subjects = newSubjects
                    showToast('进度已更新', 'success')
                    closeEdit()
                } else {
                    showToast(json.message || '更新失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
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
                    color: s.color || '#8b5cf6',
                    icon: s.icon || ''
                }))

            const weeklySchedule = {}
            for (const key in configModal.schedule) {
                const arr = configModal.schedule[key].filter(n => subjects.some(s => s.name === n) || n === '休息')
                if (arr.length > 0) {
                    weeklySchedule[key] = arr
                }
            }

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
                    await fetchData()
                } else {
                    showToast(json.message || '保存失败', 'error')
                }
            } catch (e) {
                showToast('保存出错', 'error')
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

        const toggleCheckInSubject = (name) => {
            const pos = checkInModal.subjects.indexOf(name)
            if (pos > -1) {
                checkInModal.subjects.splice(pos, 1)
            } else {
                checkInModal.subjects.push(name)
            }
        }

        const submitCheckIn = async () => {
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
                    await fetchData()
                } else {
                    showToast(json.message || '报到失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }

        const cancelCheckIn = async () => {
            try {
                const token = getToken()
                const res = await fetch(CONFIG.API_URL + '/postgraduate/checkin', {
                    method: 'DELETE',
                    headers: { Authorization: 'Bearer ' + token }
                })
                const json = await res.json()
                if (json.success) {
                    data.value.todayCheckedIn = false
                    data.value.todayCheckIn = null
                    data.value.streak = json.data.streak
                    showToast('已取消报到', 'info')
                } else {
                    showToast(json.message || '取消失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }

        onMounted(() => {
            todayStr.value = getTodayStr()
            weekdayText.value = getWeekdayText()
            fetchData()
        })

        return {
            loading, data, todayStr, weekdayText,
            sending, archiving, notifyTitle, notifyBody,
            toast, editModal, configModal, checkInModal,
            weekdayNames,
            isTodaySubject, getCurrentRound, getCardStyle,
            sendNotification, archiveProgress, openEdit, closeEdit, saveEdit, addRound,
            openConfig, closeConfig, saveConfig,
            addSubject, removeSubject, addRoundInConfig, removeRound,
            addTaskInConfig, removeTask,
            isSubjectInDay, toggleDaySubject,
            openCheckIn, closeCheckIn, toggleCheckInSubject, submitCheckIn, cancelCheckIn
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

.pg-bg {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 0;
    overflow: hidden;
}

.pg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.35;
}

.orb-1 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
    top: -100px;
    right: -80px;
}

.orb-2 {
    width: 250px;
    height: 250px;
    background: linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%);
    bottom: 10%;
    left: -60px;
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
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 100px 20px;
    position: relative;
    z-index: 1;
}

.pg-loading-heart {
    font-size: 48px;
    animation: pg-pulse 1.5s ease-in-out infinite;
}

.pg-loading-text {
    margin-top: 16px;
    color: #999;
    font-size: 14px;
}

.pg-main {
    position: relative;
    z-index: 1;
    padding: 20px;
    max-width: 480px;
    margin: 0 auto;
}

.pg-countdown-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 20px;
    padding: 24px 20px;
    text-align: center;
    color: white;
    margin-bottom: 16px;
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    position: relative;
    overflow: hidden;
}

.pg-countdown-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%);
    pointer-events: none;
}

.pg-countdown-label { font-size: 13px; opacity: 0.85; margin-bottom: 4px; letter-spacing: 2px; }
.pg-countdown-num { font-size: 56px; font-weight: 800; line-height: 1.1; text-shadow: 0 2px 10px rgba(0,0,0,0.15); }
.pg-countdown-unit { font-size: 14px; opacity: 0.8; margin-bottom: 8px; }
.pg-countdown-date { font-size: 12px; opacity: 0.7; margin-bottom: 2px; }
.pg-countdown-today { font-size: 12px; opacity: 0.6; }

.pg-empty-card {
    background: white;
    border-radius: 20px;
    padding: 40px 20px;
    text-align: center;
    margin-bottom: 16px;
    border: 2px dashed #e2e8f0;
}

.pg-empty-text { font-size: 16px; font-weight: 600; color: #555; margin-bottom: 6px; }
.pg-empty-hint { font-size: 13px; color: #999; }

.pg-empty-subjects {
    background: white;
    border-radius: 20px;
    padding: 50px 20px;
    text-align: center;
    margin-bottom: 24px;
    border: 2px dashed #e2e8f0;
}

.pg-today-banner {
    background: linear-gradient(90deg, #fff5f5 0%, #fff 100%);
    border: 1px solid #ffe0e0;
    border-radius: 14px;
    padding: 14px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 20px;
    position: relative;
    overflow: hidden;
}

.pg-today-banner::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #ff6b6b, #ee5a5a);
}

.pg-today-banner.rest {
    background: linear-gradient(90deg, #f0fff4 0%, #fff 100%);
    border-color: #c6f6d5;
}

.pg-today-banner.rest::before { background: linear-gradient(180deg, #48bb78, #38a169); }

.pg-today-text {
    font-size: 14px;
    color: #444;
    font-weight: 500;
    flex: 1;
}

.pg-task-panel {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 16px;
}

.pg-section-title.compact {
    justify-content: space-between;
    margin-bottom: 12px;
}

.pg-section-title.compact strong {
    font-size: 13px;
    color: #2563eb;
}

.pg-task-groups {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.pg-task-subject {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #334155;
    margin-bottom: 8px;
}

.pg-task-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex: 0 0 auto;
}

.pg-task-items {
    display: grid;
    gap: 8px;
}

.pg-task-item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 8px;
    align-items: center;
    padding: 9px 10px;
    border-radius: 8px;
    background: #f8fafc;
    font-size: 12px;
    color: #475569;
}

.pg-task-item strong {
    color: #111827;
}

.pg-task-item em {
    font-style: normal;
    color: #7c3aed;
    font-weight: 600;
}

/* 学习报到卡片 */
.pg-checkin-card {
    background: white;
    border-radius: 18px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
    border: 2px solid #e2e8f0;
    transition: all 0.3s;
}

.pg-checkin-card.checked {
    border-color: #86efac;
    background: linear-gradient(90deg, #f0fff4 0%, #ffffff 100%);
}

.pg-checkin-left {
    flex: 1;
}

.pg-checkin-status {
    font-size: 16px;
    font-weight: 700;
    color: #333;
    margin-bottom: 4px;
}

.pg-checkin-streak {
    font-size: 13px;
    color: #8b5cf6;
    font-weight: 600;
    margin-bottom: 4px;
}

.pg-checkin-detail {
    font-size: 12px;
    color: #888;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.pg-checkin-btn {
    padding: 10px 24px;
    border-radius: 12px;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.pg-checkin-btn:active {
    transform: scale(0.95);
}

.pg-checkin-btn.checked {
    background: #f1f5f9;
    color: #64748b;
    font-weight: 600;
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    border-radius: 18px;
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

.pg-card-glow {
    position: absolute;
    top: -30px;
    right: -30px;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    filter: blur(30px);
    opacity: 0.4;
    animation: pg-glow-pulse 2s ease-in-out infinite;
}

.pg-subject-card.active .pg-card-glow { background: currentColor; }

@keyframes pg-glow-pulse {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.2); }
}

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
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
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
    background: linear-gradient(90deg, #667eea, #764ba2);
    transition: width 0.6s ease;
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
    border: 1.5px dashed #c4b5fd;
    background: rgba(139, 92, 246, 0.04);
    color: #7c3aed;
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
    background: rgba(139, 92, 246, 0.08);
    border-color: #8b5cf6;
}

.pg-config-btn:active { transform: scale(0.98); }

.pg-archive-section {
    background: #0f172a;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 16px;
    color: white;
}

.pg-archive-section .pg-section-title {
    color: white;
}

.pg-archive-section .pg-section-title strong {
    color: #93c5fd;
}

.pg-archive-desc {
    font-size: 12px;
    line-height: 1.6;
    color: #cbd5e1;
    margin-bottom: 12px;
}

.pg-archive-btn {
    width: 100%;
    padding: 11px 12px;
    border: 1px solid rgba(147, 197, 253, 0.42);
    border-radius: 8px;
    background: rgba(37, 99, 235, 0.22);
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
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.05);
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
    border-color: #a3bffa;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.pg-input::placeholder { color: #a0aec0; }

.pg-input-body { resize: none; line-height: 1.5; }

.pg-send-btn {
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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
    border-radius: 20px;
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
    border-color: #a3bffa;
    background: white;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
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
.pg-modal-btn.confirm { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-color: transparent;
}

.pg-round-tab.add {
    background: rgba(139, 92, 246, 0.06);
    color: #7c3aed;
    border: 1.5px dashed #c4b5fd;
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
    border: 1.5px dashed #c4b5fd;
    background: rgba(139, 92, 246, 0.04);
    color: #7c3aed;
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

.pg-add-subject-btn:hover { background: rgba(139, 92, 246, 0.08); border-color: #8b5cf6; }
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

.pg-add-round-btn:hover { border-color: #8b5cf6; color: #7c3aed; }

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
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
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

@keyframes pg-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.15); }
}
</style>
