<template>
    <div class="home-page">
        <!-- 加载画面 -->
        <div v-if="loading" class="loading-screen">
            <svg class="loading-heart" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div class="loading-text">正在打开你们的今天</div>
        </div>

        <main
            v-if="!loading && user.inviteStatus === 'bound'"
            class="home-pop-shell"
            aria-label="共赴情侣生活首页"
        >
            <div class="pop-home">
                <section class="pop-home-page">
                    <header class="pop-topbar">
                        <div class="pop-brand">
                            <i aria-hidden="true"></i>
                            <span>
                                <b>共赴</b>
                                <small>两个人的生活基地</small>
                            </span>
                        </div>
                        <button type="button" class="pop-profile-pair" aria-label="进入我们的资料" @click="navigateTo('/profile')">
                            <span class="pop-top-avatar pop-top-avatar--mine">
                                <img
                                    v-if="userAvatarUrl && !userAvatarFailed"
                                    :src="userAvatarUrl"
                                    :alt="`${user.nickname || '我'}的头像`"
                                    crossorigin="anonymous"
                                    @error="userAvatarFailed = true"
                                >
                                <b v-else aria-hidden="true">{{ userInitial }}</b>
                            </span>
                            <span class="pop-top-avatar pop-top-avatar--partner">
                                <img
                                    v-if="partnerAvatarUrl && !partnerAvatarFailed"
                                    :src="partnerAvatarUrl"
                                    :alt="`${partner?.nickname || '伴侣'}的头像`"
                                    crossorigin="anonymous"
                                    @error="partnerAvatarFailed = true"
                                >
                                <b v-else aria-hidden="true">{{ partnerInitial }}</b>
                            </span>
                            <i aria-hidden="true"></i>
                        </button>
                    </header>

                    <section class="pop-couple-card" aria-label="情侣关系">
                        <div class="pop-person pop-person--mine">
                            <button type="button" class="pop-avatar-link" :aria-label="`查看${user.nickname || '我的'}资料`" @click="navigateTo('/profile')">
                                <span class="pop-avatar pop-avatar--mine">
                                    <img
                                        v-if="userAvatarUrl && !userAvatarFailed"
                                        :src="userAvatarUrl"
                                        :alt="`${user.nickname || '我'}的头像`"
                                        crossorigin="anonymous"
                                        @error="userAvatarFailed = true"
                                    >
                                    <b v-else aria-hidden="true">{{ userInitial }}</b>
                                </span>
                            </button>
                            <strong>{{ user.nickname || '我' }}</strong>
                            <button type="button" class="pop-avatar-mood" :aria-label="myMoodAriaLabel" @click="navigateTo('/mood')">
                                <span :class="['mood-egg', homeStats.mood.loaded ? (homeStats.mood.today ? moodEggClass(homeStats.mood.myMood) : 'mood-empty') : 'mood-loading']" aria-hidden="true">
                                    <i class="egg-shine"></i>
                                    <i class="egg-eye left"></i>
                                    <i class="egg-eye right"></i>
                                    <i class="egg-mouth"></i>
                                </span>
                                <small>{{ myMoodStatus }}</small>
                            </button>
                        </div>
                        <div class="pop-connection">
                            <i aria-hidden="true"></i>
                            <b>{{ user.anniversary ? `${togetherDays} 天` : '—' }}</b>
                            <span>{{ user.anniversary ? '一起生活' : '纪念日待设置' }}</span>
                            <small v-if="user.anniversary">{{ formatDate(user.anniversary) }}</small>
                        </div>
                        <div class="pop-person pop-person--partner">
                            <button type="button" class="pop-avatar-link" :aria-label="`查看${partner?.nickname || '伴侣'}资料`" @click="navigateTo('/profile')">
                                <span class="pop-avatar pop-avatar--partner">
                                    <img
                                        v-if="partnerAvatarUrl && !partnerAvatarFailed"
                                        :src="partnerAvatarUrl"
                                        :alt="`${partner?.nickname || '伴侣'}的头像`"
                                        crossorigin="anonymous"
                                        @error="partnerAvatarFailed = true"
                                    >
                                    <b v-else aria-hidden="true">{{ partnerInitial }}</b>
                                </span>
                            </button>
                            <strong>{{ partner?.nickname || '伴侣资料同步中' }}</strong>
                            <button type="button" class="pop-avatar-mood" :aria-label="partnerMoodAriaLabel" @click="navigateTo('/mood')">
                                <span :class="['mood-egg', homeStats.mood.loaded ? (homeStats.mood.partnerToday ? moodEggClass(homeStats.mood.partnerMood) : 'mood-empty') : 'mood-loading']" aria-hidden="true">
                                    <i class="egg-shine"></i>
                                    <i class="egg-eye left"></i>
                                    <i class="egg-eye right"></i>
                                    <i class="egg-mouth"></i>
                                </span>
                                <small>{{ partnerMoodStatus }}</small>
                            </button>
                        </div>
                        <p>今天也是一起生活的好日子</p>
                    </section>

                    <div class="pop-section-title">
                        <div>
                            <small>今天想去哪里看看？</small>
                            <h1>我们的小宇宙</h1>
                        </div>
                    </div>

                    <div v-if="homeStatsError" class="pop-sync-state" role="status">
                        <span>部分状态暂未同步</span>
                        <button type="button" @click="fetchHomeStats(true)">重新同步</button>
                    </div>

                    <div class="pop-feature-grid">
                        <button type="button" class="pop-feature pop-feature-1" :aria-label="`心情日记：${moodFeatureStatus}`" @click="navigateTo('/mood')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-mood" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>心情日记</strong>
                            <small>{{ moodFeatureStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-2" :aria-label="`相册：${albumFeatureStatus}`" @click="navigateTo('/album')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-album" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>相册</strong>
                            <small>{{ albumFeatureStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-3" :aria-label="`考研计划：${postgraduateStatus}`" @click="navigateTo('/postgraduate')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-study" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>考研计划</strong>
                            <small>{{ postgraduateStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-4" :aria-label="`计划清单：${planStatus}`" @click="navigateTo('/plans')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-plan" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>计划清单</strong>
                            <small>{{ planStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-5" :aria-label="`健康档案：${healthStatus}`" @click="navigateTo('/health')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-health" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>健康档案</strong>
                            <small>{{ healthStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-6" :aria-label="`快递代取：${expressStatus}`" @click="navigateTo('/express')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-parcel" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>快递代取</strong>
                            <small>{{ expressStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-7" :aria-label="`保质期管理：${cosmeticsFeatureStatus}`" @click="navigateTo('/cosmetics')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-cosmetics" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>保质期管理</strong>
                            <small>{{ cosmeticsFeatureStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-8" :aria-label="`账本 · 记账：${budgetFeatureStatus}`" @click="navigateTo('/budget')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-ledger" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>账本 · 记账</strong>
                            <small>{{ budgetFeatureStatus }}</small>
                        </button>
                        <button type="button" class="pop-feature pop-feature-9" :aria-label="`心愿墙：${wishFeatureStatus}`" @click="navigateTo('/wish')">
                            <span class="pop-feature-art"><span class="brand-glyph glyph-wishes" aria-hidden="true"><i></i><b></b><em></em></span><i class="pop-spark spark-a"></i><i class="pop-spark spark-b"></i></span>
                            <strong>心愿墙</strong>
                            <small>{{ wishFeatureStatus }}</small>
                        </button>
                    </div>

                    <footer class="pop-home-foot">
                        <span><i aria-hidden="true"></i>今天</span>
                        <button type="button" @click="navigateTo('/mood')"><b>＋</b><small>记录</small></button>
                        <span>共赴每一天<i aria-hidden="true"></i></span>
                    </footer>
                </section>
            </div>
        </main>

        <!-- 主应用 -->
        <div v-if="!loading && user.inviteStatus !== 'bound'" class="app">
            <!-- 顶部导航 -->
            <header class="header">
                <div class="header-content">
                    <span class="logo-small">共赴</span>
                    <div class="header-actions">
                        <button type="button" class="icon-btn" aria-label="退出登录" @click="confirmLogout">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                                <polyline points="16 17 21 12 16 7"/>
                                <line x1="21" y1="12" x2="9" y2="12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <!-- 主内容 -->
            <main class="main">
                <!-- 空闲状态 -->
                <div v-if="user.inviteStatus === 'idle'" class="binding-card">
                    <div class="binding-title">
                        <h2>寻找另一半</h2>
                        <p>发送邀请，与TA绑定专属空间</p>
                    </div>

                    <div class="code-display">
                        <div class="code-label">Your Pair Code</div>
                        <div class="code-value">{{ user.pairCode || '------' }}</div>
                        <button class="code-action" @click="copyCode">复制配对码</button>
                    </div>

                    <div class="divider-or"><span>或</span></div>

                    <div class="bind-form">
                        <label>输入对方的配对码发送邀请</label>
                        <div class="code-input-wrapper">
                            <input
                                type="text"
                                class="code-input"
                                placeholder="输入6位码"
                                v-model="inputPairCode"
                                maxlength="6"
                            >
                        </div>
                        <button
                            class="bind-btn"
                            @click="sendInvite"
                            :disabled="inputPairCode.length !== 6 || inviting"
                        >
                            {{ inviting ? '发送中...' : '发送邀请' }}
                        </button>
                    </div>
                </div>

                <!-- 邀请中状态 -->
                <div v-else-if="user.inviteStatus === 'inviting'" class="binding-card">
                    <div class="invite-waiting">
                        <div class="invite-waiting-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFC107" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>
                        </div>
                        <h3>等待回应</h3>
                        <p>已向 {{ invitingTarget?.nickname || '对方' }} 发送邀请</p>

                        <div class="invite-target" v-if="invitingTarget">
                            <div class="invite-target-avatar">
                                <img v-if="invitingTarget.avatarUrl" :src="invitingTarget.avatarUrl" alt="头像" crossorigin="anonymous">
                                <span v-else>{{ invitingTarget.nickname?.[0]?.toUpperCase() }}</span>
                            </div>
                            <div class="invite-target-info">
                                <div class="invite-target-name">{{ invitingTarget.nickname }}</div>
                                <div class="invite-target-status">等待对方接受邀请...</div>
                            </div>
                        </div>

                        <button class="btn-cancel-invite" @click="cancelInvite" :disabled="processing">
                            {{ processing ? '处理中...' : '取消邀请' }}
                        </button>
                    </div>
                </div>

                <!-- 被邀请状态 -->
                <div v-else-if="user.inviteStatus === 'invited'" class="binding-card">
                    <div class="invite-received">
                        <div class="invite-received-header">
                            <h3>收到邀请</h3>
                            <p>有人想和你绑定情侣关系</p>
                        </div>

                        <div class="invite-from-card" v-if="invitingFrom">
                            <div class="invite-from-avatar">
                                <img v-if="invitingFrom.avatarUrl" :src="invitingFrom.avatarUrl" alt="头像" crossorigin="anonymous">
                                <span v-else>{{ invitingFrom.nickname?.[0]?.toUpperCase() }}</span>
                            </div>
                            <div class="invite-from-name">{{ invitingFrom.nickname }}</div>
                            <div class="invite-from-bio">{{ invitingFrom.bio || '这个人很懒，什么都没写' }}</div>
                        </div>

                        <div class="invite-actions">
                            <button class="btn-reject" @click="rejectInvite" :disabled="processing">
                                拒绝
                            </button>
                            <button class="btn-accept" @click="acceptInvite" :disabled="processing">
                                {{ processing ? '处理中...' : '接受邀请' }}
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>

        <!-- 底部导航 -->
        <BottomNav v-if="loading || user.inviteStatus !== 'bound'" @toast="showToast" />

        <!-- Toast -->
        <div
            class="toast"
            :class="{ show: toast.show, [toast.type]: true }"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <svg v-if="toast.type === 'success'" class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ toast.message }}</span>
        </div>

        <!-- 确认对话框 -->
        <div class="confirm-overlay" :class="{ show: confirm.show }" @click.self="cancelConfirm">
            <div class="confirm-dialog">
                <div class="confirm-title">{{ confirm.title }}</div>
                <div class="confirm-message">{{ confirm.message }}</div>
                <div class="confirm-actions">
                    <button class="confirm-btn cancel" @click="cancelConfirm">{{ confirm.cancelText }}</button>
                    <button class="confirm-btn confirm danger" @click="doConfirm">{{ confirm.confirmText }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, onActivated, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { getMoodLabel } from '../utils/mood-catalog.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { useUserStore } from '../stores/user.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    name: 'Home',
    components: { BottomNav },
    setup() {
        const router = useRouter()
        const { onMessage } = useWebSocket()
        const userStore = useUserStore()

        // 使用 store 中的数据，如果没有则初始化
        // 注意：切换账号时 userId 会变化，需要重新获取
        const user = ref({})
        const partner = ref(null)
        const invitingTarget = ref(null)
        const invitingFrom = ref(null)
        const inputPairCode = ref('')
        const inviting = ref(false)
        const processing = ref(false)
        // 默认显示 loading，直到确认数据正确
        const loading = ref(true)
        const userAvatarFailed = ref(false)
        const partnerAvatarFailed = ref(false)
        const toast = ref({ show: false, message: '', type: 'info', timer: null })
        const confirm = ref({ show: false, title: '', message: '', confirmText: '确认', cancelText: '取消', action: null })
        // 动态获取 token（每次使用都重新读取）
        const getToken = () => localStorage.getItem('token')

        // 当前日期（用于天数计算，本地时区）
        const today = ref(getLocalDate())
        let dayUpdateTimer = null

        // 获取本地时区的当前日期（去掉时间部分）
        function getLocalDate() {
            const now = new Date()
            return new Date(now.getFullYear(), now.getMonth(), now.getDate())
        }

        // 计算到下一个本地午夜的时间（毫秒）
        function getMsToNextLocalMidnight() {
            const now = new Date()
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
            return tomorrow.getTime() - now.getTime()
        }

        // 启动日期定时器，精确到本地午夜更新
        function scheduleNextDayUpdate() {
            const msToMidnight = getMsToNextLocalMidnight()
            dayUpdateTimer = setTimeout(() => {
                today.value = getLocalDate()
                scheduleNextDayUpdate() // 继续安排下一天
            }, msToMidnight + 1000) // 加1秒确保过了午夜
        }

        const togetherDays = computed(() => {
            // 使用 anniversary（恋爱纪念日）计算天数，双方共享
            if (!user.value.anniversary) return 0
            // 将纪念日线转换为本地日期（去掉时间）
            const anniDate = new Date(user.value.anniversary)
            const anniLocal = new Date(anniDate.getFullYear(), anniDate.getMonth(), anniDate.getDate())
            const days = Math.floor((today.value - anniLocal) / 86400000)
            return Math.max(1, days)
        })

        // 首页核心功能统计数据
        const homeStats = ref({
            express: { pending: 0, urgent: 0 },
            habits: { total: 0, completed: 0, pending: 0 },
            wishes: { total: 0, completed: 0, pending: 0 },
            mood: { loaded: false, today: false, partnerToday: false },
            budget: { expense: 0, monthlyBudget: 0, remainingBudget: 0 },
            cosmetics: { total: 0, expiring: 0, expired: 0 },
            health: { latestWeight: null },
            shopping: { pending: 0 },
            album: { photos: 0 },
            postgraduate: { loaded: false, todayTasks: 0, checkedIn: false }
        })
        const homePhotos = ref([])
        const latestBudgetTransactions = ref([])
        const pendingWishTitle = ref('')
        const homeStatsReady = ref(false)
        const homeStatsError = ref(false)

        const moodEggClass = mood => {
            if (['happy', 'expectant', 'excited'].includes(mood)) return 'mood-party'
            if (['missing', 'shy', 'loved'].includes(mood)) return 'mood-hug'
            if (['tired', 'wronged', 'sad', 'overwhelmed', 'sick'].includes(mood)) return 'mood-tired'
            if (['calm', 'bored', 'anxious'].includes(mood)) return 'mood-soft'
            return 'mood-sunny'
        }
        const userAvatarUrl = computed(() => user.value.avatarUrl || user.value.avatar || '')
        const partnerAvatarUrl = computed(() => partner.value?.avatarUrl || partner.value?.avatar || '')
        const userInitial = computed(() => Array.from(user.value.nickname || '我')[0] || '我')
        const partnerInitial = computed(() => Array.from(partner.value?.nickname || '…')[0] || '…')
        watch(userAvatarUrl, () => { userAvatarFailed.value = false })
        watch(partnerAvatarUrl, () => { partnerAvatarFailed.value = false })
        const myMoodAriaLabel = computed(() => (
            !homeStats.value.mood.loaded
                ? `${user.value.nickname || '我'}的心情暂未同步`
                : homeStats.value.mood.today
                ? `${user.value.nickname || '我'}今天${getMoodLabel(homeStats.value.mood.myMood)}`
                : `${user.value.nickname || '我'}今天还没有记录心情`
        ))
        const partnerMoodAriaLabel = computed(() => (
            !homeStats.value.mood.loaded
                ? `${partner.value?.nickname || '伴侣'}的心情暂未同步`
                : homeStats.value.mood.partnerToday
                ? `${partner.value?.nickname || '伴侣'}今天${getMoodLabel(homeStats.value.mood.partnerMood)}`
                : `${partner.value?.nickname || '伴侣'}今天还没有记录心情`
        ))
        const myMoodStatus = computed(() => (
            !homeStats.value.mood.loaded
                ? (homeStatsReady.value ? '暂未同步' : '同步中')
                : homeStats.value.mood.today
                ? getMoodLabel(homeStats.value.mood.myMood)
                : '记录心情'
        ))
        const partnerMoodStatus = computed(() => (
            !homeStats.value.mood.loaded
                ? (homeStatsReady.value ? '暂未同步' : '同步中')
                : homeStats.value.mood.partnerToday
                ? getMoodLabel(homeStats.value.mood.partnerMood)
                : '还没记录'
        ))
        const moodFeatureStatus = computed(() => (
            homeStats.value.mood.loaded
                ? `${Number(homeStats.value.mood.today) + Number(homeStats.value.mood.partnerToday)} 条心情`
                : homeStatsReady.value ? '暂未同步' : '正在同步'
        ))
        const albumFeatureStatus = computed(() => (
            homeStatsReady.value ? `${homeStats.value.album.photos || 0} 张回忆` : '正在同步'
        ))
        const planStatus = computed(() => {
            if (!homeStatsReady.value) return '正在同步'
            const { total, completed } = homeStats.value.habits
            return total > 0 ? `今日 ${completed}/${total}` : '今日无计划'
        })
        const postgraduateStatus = computed(() => {
            const value = homeStats.value.postgraduate
            if (!value.loaded) return '正在同步'
            if (value.todayTasks > 0) return value.checkedIn ? '今日已完成' : `今日 ${value.todayTasks} 项`
            return '今日无任务'
        })
        const healthStatus = computed(() => (
            !homeStatsReady.value
                ? '正在同步'
                : homeStats.value.health.latestWeight
                ? `最近 ${homeStats.value.health.latestWeight} kg`
                : '暂无健康记录'
        ))
        const expressStatus = computed(() => (
            !homeStatsReady.value
                ? '正在同步'
                : homeStats.value.express.pending > 0
                    ? `${homeStats.value.express.pending} 件待取`
                    : '暂无待取'
        ))
        const cosmeticsFeatureStatus = computed(() => {
            if (!homeStatsReady.value) return '正在同步'
            if (homeStats.value.cosmetics.expired > 0) return `${homeStats.value.cosmetics.expired} 件过期`
            if (homeStats.value.cosmetics.expiring > 0) return `${homeStats.value.cosmetics.expiring} 件临期`
            return `${homeStats.value.cosmetics.total || 0} 件记录`
        })
        const budgetFeatureStatus = computed(() => (
            !homeStatsReady.value
                ? '正在同步'
                : homeStats.value.budget.expense > 0
                    ? `本月 ¥${formatMoney(homeStats.value.budget.expense)}`
                    : '暂无收支'
        ))
        const wishFeatureStatus = computed(() => (
            homeStatsReady.value ? `${homeStats.value.wishes.pending || 0} 个愿望` : '正在同步'
        ))

        const navigateTo = (route) => {
            if (route) router.push(route)
        }

        // 获取取件清单统计
        const fetchExpressStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const res = await fetch(CONFIG.API_URL + '/express', {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const pending = data.data.pending || []
                    homeStats.value.express = {
                        pending: pending.length,
                        urgent: pending.filter(e => e.priority === 'urgent').length
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取快递统计失败:', e)
                return false
            }
        }

        // 获取今天的日期字符串（使用本地时间，避免 UTC 时差问题）
        const getTodayStr = () => {
            const d = new Date()
            const year = d.getFullYear()
            const month = String(d.getMonth() + 1).padStart(2, '0')
            const day = String(d.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        // 辅助函数：判断某天是否在请假期间
        const isDateInLeaves = (dateStr, leaves = []) => {
            return leaves.some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate)
        }

        // 判断今天是否需要打卡（按星期几过滤、开始日期、请假）
        const isHabitActiveToday = (habit, currentUserId) => {
            const todayStr = getTodayStr()
            // 在开始日期之前，不需要打卡
            if (habit.startDate && todayStr < habit.startDate) return false
            // 请假期间不需要打卡
            if (habit.leaves?.length > 0 && currentUserId) {
                const myLeaves = habit.leaves.filter(l => l.userId === currentUserId)
                if (isDateInLeaves(todayStr, myLeaves)) return false
            }
            // 按星期几过滤
            if (habit.frequency !== 'weekly' || !habit.weekdays || habit.weekdays.length === 0) return true
            const todayWeekday = new Date().getDay()
            // 确保类型一致（转为数字比较）
            return habit.weekdays.map(Number).includes(todayWeekday)
        }

        // 获取坚持计划统计 - 与 Plans.vue 保持一致，只统计当前用户需要打卡的任务
        const fetchHabitsStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const res = await fetch(CONFIG.API_URL + '/habits/today', {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    // 合并所有今日任务
                    const allHabits = [
                        ...(data.data.checkedInHabits || []),
                        ...(data.data.pendingHabits || [])
                    ]

                    // 获取当前用户ID
                    const currentUserId = user.value.id || userStore.currentUser?.id

                    // 只计算今天需要打卡的习惯，且只从当前用户视角统计
                    const todayActiveHabits = allHabits.filter(habit => isHabitActiveToday(habit, currentUserId))

                    // 与 Plans.vue progress 计算逻辑保持一致
                    let total = 0, completed = 0
                    todayActiveHabits.forEach(habit => {
                        const isCreator = habit.createdBy === currentUserId
                        let myTask = false
                        let myCompleted = false

                        if (habit.participation === 'both') {
                            myTask = true
                            myCompleted = habit.myChecked
                        } else if (habit.participation === 'self') {
                            myTask = isCreator
                            myCompleted = habit.myChecked
                        } else if (habit.participation === 'partner') {
                            myTask = !isCreator
                            myCompleted = habit.partnerChecked
                        }

                        if (myTask) {
                            total += 1
                            if (myCompleted) completed += 1
                        }
                    })

                    homeStats.value.habits = {
                        total,
                        completed,
                        pending: total - completed
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取习惯统计失败:', e)
                return false
            }
        }

        // 获取心愿墙统计
        const fetchWishesStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const res = await fetch(CONFIG.API_URL + '/wishes', {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const wishes = data.data || []
                    const completed = wishes.filter(w => w.status === 'completed').length
                    homeStats.value.wishes = {
                        total: wishes.length,
                        completed: completed,
                        pending: wishes.length - completed
                    }
                    pendingWishTitle.value = wishes.find(w => w.status !== 'completed')?.title || ''
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取心愿统计失败:', e)
                return false
            }
        }

        // 获取心情记录统计
        const fetchMoodStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const today = getTodayStr()
                const res = await fetch(CONFIG.API_URL + '/mood?date=' + today, {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const records = data.data || []
                    const myId = String(user.value.id || userStore.currentUser?.id)
                    const partnerId = String(partner.value?.id || userStore.currentPartner?.id)
                    const myRecord = records.find(r => String(r.user?.id) === myId)
                    const partnerRecord = partnerId ? records.find(r => String(r.user?.id) === partnerId) : null
                    homeStats.value.mood = {
                        loaded: true,
                        today: !!myRecord,
                        myMood: myRecord?.mood,
                        partnerToday: !!partnerRecord,
                        partnerMood: partnerRecord?.mood
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取心情统计失败:', e)
                return false
            }
        }

        // 获取情侣账本统计
        const fetchBudgetStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const headers = { 'Authorization': 'Bearer ' + token }
                const [statsRes, transactionsRes] = await Promise.all([
                    fetch(CONFIG.API_URL + '/budget/stats', { headers, cache: force ? 'no-store' : 'default' }),
                    fetch(CONFIG.API_URL + '/budget/transactions', { headers, cache: force ? 'no-store' : 'default' })
                ])
                const [data, transactionsData] = await Promise.all([statsRes.json(), transactionsRes.json()])
                if (data.success && data.data) {
                    homeStats.value.budget = {
                        expense: data.data.expense || 0,
                        monthlyBudget: data.data.monthlyBudget || 0,
                        remainingBudget: data.data.remainingBudget || 0
                    }
                }
                latestBudgetTransactions.value = transactionsData.success && Array.isArray(transactionsData.data)
                    ? transactionsData.data
                    : []
                return Boolean(statsRes.ok && transactionsRes.ok && data.success && transactionsData.success)
            } catch (e) {
                console.error('获取账本统计失败:', e)
                return false
            }
        }

        // 获取化妆品统计
        const fetchCosmeticsStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false

                const res = await fetch(CONFIG.API_URL + '/cosmetics', {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const cosmetics = data.data || []
                    const active = cosmetics.filter(c => c.status === 'active')
                    homeStats.value.cosmetics = {
                        total: cosmetics.length,
                        active: active.length,
                        empty: cosmetics.filter(c => c.status === 'empty').length,
                        expiring: active.filter(c => c.isExpiringSoon && !c.isExpired).length,
                        expired: cosmetics.filter(c => c.isExpired).length,
                        nearestExpire: active.length > 0 ? active.sort((a, b) => a.daysLeft - b.daysLeft)[0] : null
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取化妆品统计失败:', e)
                return false
            }
        }

        // 获取健康档案统计
        const fetchHealthStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false
                const res = await fetch(CONFIG.API_URL + '/health', {
                    headers: { Authorization: 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const mine = data.data.mine || []
                    homeStats.value.health = {
                        latestWeight: mine.length > 0 ? mine[0].weight : null
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取健康档案统计失败:', e)
                return false
            }
        }

        // 获取购物清单统计
        const fetchShoppingStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false
                const res = await fetch(CONFIG.API_URL + '/shopping?status=pending', {
                    headers: { Authorization: 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    homeStats.value.shopping = {
                        pending: (data.data.pending || []).length
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取购物统计失败:', e)
                return false
            }
        }

        // 获取相册统计
        const fetchAlbumStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false
                const res = await fetch(CONFIG.API_URL + '/photos', {
                    headers: { Authorization: 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const photos = Array.isArray(data.data) ? data.data : []
                    homePhotos.value = photos
                    homeStats.value.album = {
                        photos: photos.length
                    }
                }
                return Boolean(res.ok && data.success)
            } catch (e) {
                console.error('获取相册统计失败:', e)
                return false
            }
        }

        const fetchPostgraduateStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return false
                const res = await fetch(CONFIG.API_URL + '/postgraduate', {
                    headers: { Authorization: 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success && data.data) {
                    homeStats.value.postgraduate = {
                        loaded: true,
                        todayTasks: Array.isArray(data.data.todayTasks) ? data.data.todayTasks.length : 0,
                        checkedIn: !!data.data.todayCheckedIn
                    }
                } else {
                    homeStats.value.postgraduate = { loaded: true, todayTasks: 0, checkedIn: false }
                }
                return Boolean(res.ok && data.success)
            } catch (error) {
                console.error('获取考研统计失败:', error)
                homeStats.value.postgraduate = { loaded: true, todayTasks: 0, checkedIn: false }
                return false
            }
        }

        // 获取首页所有统计数据
        const fetchHomeStats = async (force = false) => {
            if (user.value.inviteStatus !== 'bound' || !user.value.partnerId) return
            const results = await Promise.all([
                fetchExpressStats(force),
                fetchHabitsStats(force),
                fetchWishesStats(force),
                fetchMoodStats(force),
                fetchBudgetStats(force),
                fetchCosmeticsStats(force),
                fetchHealthStats(force),
                fetchShoppingStats(force),
                fetchAlbumStats(force),
                fetchPostgraduateStats(force)
            ])
            homeStatsReady.value = true
            homeStatsError.value = results.some(result => result !== true)
        }

        const showToast = (message, type = 'info') => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message, type }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }

        // 检查用户数据是否完整（关键字段是否存在）
        const isUserDataValid = (userData) => {
            return userData &&
                   userData.inviteStatus !== undefined &&
                   userData.nickname !== undefined
        }

        const fetchPairCodeIfNeeded = async () => {
            const token = getToken()
            if (!token || user.value.partnerId || user.value.inviteStatus !== 'idle' || user.value.pairCode) return

            try {
                const res = await fetch(`${CONFIG.API_URL}/user/pair-code`, {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success && data.data?.pairCode) {
                    user.value = {
                        ...user.value,
                        pairCode: data.data.pairCode
                    }
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                }
            } catch (e) {
                console.error('获取配对码失败:', e)
            }
        }

        const fetchUser = async (force = false) => {
            const token = getToken()
            if (!token) {
                router.replace('/')
                return
            }

            // 如果不是强制刷新，且数据未过期，且数据完整，则跳过
            if (!force && !userStore.isDataStale && isUserDataValid(userStore.currentUser)) {
                user.value = userStore.currentUser
                partner.value = userStore.currentPartner
                fetchPairCodeIfNeeded()
                if (user.value.inviteStatus === 'bound') await fetchHomeStats()
                loading.value = false
                return
            }

            // 如果已经在加载中，跳过
            if (userStore.isLoading) return

            userStore.setLoading(true)
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    user.value = data.data
                    partner.value = data.data.partner
                    // 更新 store
                    userStore.updateUserData(data.data, data.data.partner)
                    await fetchPairCodeIfNeeded()
                    await fetchInviteInfo()
                    // 获取首页统计数据
                    await fetchHomeStats()
                } else if (res.status === 401 || res.status === 403) {
                    // Token 过期或无效，清除并跳转
                    userStore.clearUser()
                    router.replace('/')
                }
            } catch (e) {
                console.error('获取用户信息失败:', e)
            } finally {
                loading.value = false
                userStore.setLoading(false)
            }
        }

        const fetchInviteInfo = async () => {
            if (user.value.inviteStatus === 'inviting' && user.value.invitingTo) {
                try {
                    const res = await fetch(`${CONFIG.API_URL}/user/${user.value.invitingTo}`, {
                        headers: { 'Authorization': 'Bearer ' + getToken() }
                    })
                    const data = await res.json()
                    if (data.success) invitingTarget.value = data.data
                } catch (e) {}
            }
            if (user.value.inviteStatus === 'invited' && user.value.invitingTo) {
                try {
                    const res = await fetch(`${CONFIG.API_URL}/user/${user.value.invitingTo}`, {
                        headers: { 'Authorization': 'Bearer ' + getToken() }
                    })
                    const data = await res.json()
                    if (data.success) invitingFrom.value = data.data
                } catch (e) {}
            }
        }

        const formatDate = (date) => {
            const d = new Date(date)
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
        }

        const formatMoney = (n) => {
            if (n === undefined || n === null) return '0.00'
            return Number(n).toFixed(2)
        }

        const copyCode = () => {
            if (!user.value.pairCode) {
                showToast('配对码加载中，请稍后再试', 'info')
                fetchPairCodeIfNeeded()
                return
            }
            navigator.clipboard.writeText(user.value.pairCode)
            showToast('配对码已复制', 'success')
        }

        const sendInvite = async () => {
            inviting.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + getToken() },
                    body: JSON.stringify({ pairCode: inputPairCode.value.toUpperCase() })
                })
                const data = await res.json()
                if (data.success) {
                    showToast('邀请已发送', 'success')
                    user.value.inviteStatus = 'inviting'
                    user.value.pairCode = ''
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    invitingTarget.value = data.data.to
                    inputPairCode.value = ''
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            inviting.value = false
        }

        const cancelInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/cancel', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('已取消邀请', 'success')
                    user.value.inviteStatus = 'idle'
                    user.value.pairCode = ''
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    await fetchPairCodeIfNeeded()
                    invitingTarget.value = null
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            processing.value = false
        }

        const acceptInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/accept', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('恭喜！你们已成为情侣', 'success')
                    user.value.inviteStatus = 'bound'
                    user.value.pairCode = ''
                    user.value.partnerId = data.data.partner.id
                    user.value.boundAt = data.data.boundAt
                    // 保存共享的纪念日
                    if (data.data.anniversary) {
                        user.value.anniversary = data.data.anniversary
                    }
                    // 统一字段名 avatar -> avatarUrl
                    partner.value = {
                        ...data.data.partner,
                        avatarUrl: data.data.partner.avatar || data.data.partner.avatarUrl
                    }
                    invitingFrom.value = null
                    userStore.updateUserData(
                        { ...user.value },
                        { ...partner.value }
                    )
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            processing.value = false
        }

        const rejectInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/reject', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('已拒绝邀请', 'success')
                    user.value.inviteStatus = 'idle'
                    user.value.pairCode = ''
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    await fetchPairCodeIfNeeded()
                    invitingFrom.value = null
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            processing.value = false
        }

        // 页面可见性变化处理（iOS 熄屏/亮屏）
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // 更新日期（检查是否跨天）
                today.value = getLocalDate()
                fetchUser()
            }
        }

        // WebSocket 消息处理
        const handleWSMessage = (data) => {
            // 核心功能实时同步 - 刷新首页统计（强制刷新，禁用缓存）
            if (data.type?.startsWith('express')) {
                fetchExpressStats(true)
            }
            if (data.type?.startsWith('habit')) {
                fetchHabitsStats(true)
            }
            if (data.type?.startsWith('wish')) {
                fetchWishesStats(true)
            }
            if (data.type?.startsWith('mood')) {
                fetchMoodStats(true)
            }
            if (data.type?.startsWith('budget')) {
                fetchBudgetStats(true)
            }
            if (data.type?.startsWith('cosmetic')) {
                fetchCosmeticsStats(true)
            }
            if (data.type?.startsWith('health')) {
                fetchHealthStats(true)
            }
            if (data.type?.startsWith('shopping')) {
                fetchShoppingStats(true)
            }
            if (data.type === 'photoSync') {
                fetchAlbumStats(true)
            }
            if (data.type === 'postgraduateSync') {
                fetchPostgraduateStats(true)
            }

            switch (data.type) {
                case 'inviteReceived':
                    showToast(`收到来自 ${data.data.from.nickname} 的邀请`, 'success')
                    user.value.inviteStatus = 'invited'
                    user.value.pairCode = ''
                    invitingFrom.value = data.data.from
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    break
                case 'inviteAccepted':
                    showToast(`${data.data.partner.nickname} 接受了你的邀请！`, 'success')
                    user.value.inviteStatus = 'bound'
                    user.value.pairCode = ''
                    user.value.partnerId = data.data.partner.id
                    user.value.boundAt = data.data.boundAt
                    // 保存共享的纪念日
                    if (data.data.anniversary) {
                        user.value.anniversary = data.data.anniversary
                    }
                    // 统一字段名 avatar -> avatarUrl
                    partner.value = {
                        ...data.data.partner,
                        avatarUrl: data.data.partner.avatar || data.data.partner.avatarUrl
                    }
                    invitingTarget.value = null
                    // 同步更新 store - 使用解构创建普通对象
                    userStore.updateUserData(
                        { ...user.value },
                        { ...partner.value }
                    )
                    break
                case 'inviteRejected':
                    showToast(`${data.data.by.nickname} 拒绝了你的邀请`, 'error')
                    user.value.inviteStatus = 'idle'
                    user.value.pairCode = ''
                    invitingTarget.value = null
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    fetchPairCodeIfNeeded()
                    break
                case 'inviteCancelled':
                    showToast('对方取消了邀请', 'info')
                    user.value.inviteStatus = 'idle'
                    user.value.pairCode = ''
                    invitingFrom.value = null
                    userStore.updateUserData({ ...user.value }, userStore.currentPartner)
                    fetchPairCodeIfNeeded()
                    break
                case 'partnerUpdated':
                    // 直接更新伴侣信息
                    if (data.data) {
                        // 安全提取字段：只提取需要的字段，避免污染数据结构
                        const {
                            nickname, avatar, avatarUrl, gender, bio,
                            birthday, anniversary, boundAt, homeMessage
                        } = data.data

                        // 判断是否有有效的新头像URL（不为null/undefined/空字符串）
                        const newAvatarUrl = avatar || avatarUrl
                        const hasNewAvatar = newAvatarUrl && typeof newAvatarUrl === 'string' && newAvatarUrl.length > 0

                        partner.value = {
                            ...(partner.value || {}),
                            ...(nickname !== undefined && { nickname }),
                            ...(gender !== undefined && { gender }),
                            ...(bio !== undefined && { bio }),
                            ...(birthday !== undefined && { birthday }),
                            ...(homeMessage !== undefined && { homeMessage }),
                            // 只有收到有效的新头像URL时才更新，否则保留原有头像
                            ...(hasNewAvatar && { avatar: newAvatarUrl, avatarUrl: newAvatarUrl })
                        }

                        // 纪念日是双方共享的，同步更新当前用户的纪念日
                        if (anniversary) {
                            user.value.anniversary = anniversary
                        }

                        // 同步更新 store - 使用解构创建普通对象，避免传递响应式代理
                        userStore.updateUserData(
                            { ...user.value },
                            { ...partner.value }
                        )
                    }
                    break
                case 'unbound':
                    showToast(`对方已解除伴侣关系`, 'error')
                    user.value.inviteStatus = 'idle'
                    user.value.partnerId = null
                    user.value.boundAt = null
                    user.value.anniversary = null
                    user.value.pairCode = ''
                    partner.value = null
                    userStore.updateUserData({ ...user.value }, null)
                    fetchPairCodeIfNeeded()
                    break
            }
        }

        onMounted(() => {
            // 优先使用缓存数据，后台静默刷新
            fetchUser(false)

            // 启动日期定时器（用于跨天更新相爱天数）
            scheduleNextDayUpdate()

            // 订阅全局 WebSocket 消息
            const unsubscribe = onMessage(handleWSMessage)
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', handleVisibilityChange)

            onUnmounted(() => {
                unsubscribe()
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                if (dayUpdateTimer) clearTimeout(dayUpdateTimer)
            })
        })

        // 页面激活时重新检查（keep-alive 缓存后重新显示）
        onActivated(() => {
            // 回到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' })

            // 更新日期（检查是否跨天）
            today.value = getLocalDate()

            const storedUserId = localStorage.getItem('currentUserId')
            const token = localStorage.getItem('token')

            // 如果没有 token，跳转登录
            if (!token) {
                user.value = {}
                partner.value = null
                router.replace('/')
                return
            }

            // 关键修复：如果用户切换了，清空所有数据，显示loading，强制重新获取
            if (storedUserId && userStore.currentUserId && userStore.currentUserId !== storedUserId) {
                user.value = {}
                partner.value = null
                invitingTarget.value = null
                invitingFrom.value = null
                userStore.invalidateCache()
                loading.value = true
                fetchUser(true)  // 强制重新获取
                return
            }

            // 正常情况：如果store有数据且数据完整，同步到本地
            if (isUserDataValid(userStore.currentUser)) {
                user.value = userStore.currentUser
                partner.value = userStore.currentPartner
                fetchPairCodeIfNeeded()

                // 检查伴侣头像URL是否有效，如果无效则刷新数据
                const partnerHasAvatar = partner.value?.avatar || partner.value?.avatarUrl
                const partnerAvatarInvalid = partner.value && !partner.value.avatarUrl
                if (partnerAvatarInvalid && partnerHasAvatar) {
                    fetchUser(true)
                    return
                }

                // 刷新首页统计数据（强制刷新，禁用缓存）
                fetchHomeStats(true)

                loading.value = false
            } else {
                // store数据不完整或不存在，重新获取
                loading.value = true
                fetchUser(false)
            }
        })

        // 监听 store 变化，保持同步
        watch(() => userStore.currentUser, (newUser) => {
            if (newUser) {
                user.value = newUser
            }
        }, { deep: true })

        watch(() => userStore.currentPartner, (newPartner) => {
            if (newPartner) {
                partner.value = newPartner
            }
        }, { deep: true })

        const logout = () => {
            // 断开 WebSocket 连接
            const { disconnect } = useWebSocket()
            disconnect()
            userStore.clearUser()
            router.replace('/')
        }

        const showConfirm = (options) => {
            confirm.value = {
                show: true,
                title: options.title,
                message: options.message,
                confirmText: options.confirmText || '确认',
                cancelText: options.cancelText || '取消',
                action: options.action
            }
        }

        const cancelConfirm = () => {
            confirm.value.show = false
        }

        const doConfirm = () => {
            if (confirm.value.action) confirm.value.action()
            confirm.value.show = false
        }

        const confirmLogout = () => {
            showConfirm({
                title: '退出登录',
                message: '确定要退出登录吗？',
                confirmText: '退出',
                isDanger: true,
                action: logout
            })
        }

        return {
            user, partner, invitingTarget, invitingFrom,
            inputPairCode, inviting, processing, loading,
            togetherDays, today, toast, confirm, homeStats, homeStatsError,
            userAvatarUrl, partnerAvatarUrl, userAvatarFailed, partnerAvatarFailed,
            userInitial, partnerInitial, myMoodAriaLabel, partnerMoodAriaLabel, myMoodStatus, partnerMoodStatus,
            moodFeatureStatus, albumFeatureStatus,
            planStatus, postgraduateStatus, healthStatus, expressStatus,
            cosmeticsFeatureStatus, budgetFeatureStatus, wishFeatureStatus,
            copyCode, sendInvite, cancelInvite, acceptInvite, rejectInvite,
            formatDate, formatMoney, confirmLogout, showToast, cancelConfirm, doConfirm,
            fetchHomeStats, navigateTo, moodEggClass
        }
    }
}
</script>

<style scoped>
/* ============================================
   页面基础
   ============================================ */

.home-page {
    min-height: 100vh;
    position: relative;
    background:
        linear-gradient(180deg, #FFF9FC 0%, #F7FBFF 48%, #F7FBF6 100%);
}

.app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding-bottom: 100px;
}

/* ============================================
   顶部导航 - Glass Header
   ============================================ */

.header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: env(safe-area-inset-top, 0px) 20px 16px;
    background: rgba(255, 251, 253, 0.92);
    backdrop-filter: blur(18px);
    border-bottom: 1px solid var(--border-color);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 560px;
    margin: 0 auto;
}

.logo-small {
    font-size: 24px;
    font-family: var(--font-ui);
    font-weight: 850;
    color: var(--color-primary-deep);
    letter-spacing: 0;
}

.header-actions {
    display: flex;
    gap: 12px;
}

.icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
    color: var(--text-secondary);
}

.icon-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
    color: var(--text-primary);
}

/* ============================================
   主内容区
   ============================================ */

.main {
    max-width: 560px;
    margin: 0 auto;
    padding: 24px 20px;
}

/* ============================================
   首页关系空间
   ============================================ */

.couple-section.relationship-home {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 0;
}

.home-pager {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.home-pager-rail {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    gap: 12px;
    height: clamp(520px, calc(100svh - 206px), 700px);
    min-height: 520px;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 1px;
    scroll-behavior: smooth;
    scrollbar-width: none;
    border-radius: 12px;
    outline: none;
    touch-action: pan-x pan-y;
}

.home-pager-rail::-webkit-scrollbar {
    display: none;
}

.home-pager-rail:focus-visible {
    box-shadow: 0 0 0 3px rgba(126, 58, 85, 0.16);
}

.home-page-slide {
    min-width: 0;
    height: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    border-radius: 12px;
    overflow: hidden;
}

.relationship-slide .home-command-panel {
    height: 100%;
    min-height: 100%;
}

.home-page-slide.is-scrollable {
    display: flex;
    flex-direction: column;
    gap: 16px;
    overflow-y: auto;
    overscroll-behavior-y: contain;
    padding-bottom: 6px;
    scrollbar-width: none;
}

.home-page-slide.is-scrollable::-webkit-scrollbar {
    display: none;
}

.today-slide .home-mission-panel {
    min-height: 100%;
    justify-content: flex-start;
}

.home-page-arrow {
    position: absolute;
    top: calc(50% - 38px);
    z-index: 3;
    width: 44px;
    height: 46px;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    color: #7E3A55;
    box-shadow: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
    -webkit-tap-highlight-color: transparent;
}

.home-page-arrow.prev {
    left: -13px;
}

.home-page-arrow.next {
    right: -13px;
}

.home-page-arrow:hover:not(:disabled) {
    transform: translateY(-1px);
    background: rgba(245, 220, 231, 0.76);
    box-shadow: none;
}

.home-page-arrow:disabled {
    opacity: 0;
    pointer-events: none;
}

.home-pager-tabs {
    display: grid;
    grid-template-columns: repeat(var(--home-page-count), minmax(0, 1fr));
    gap: 4px;
    min-height: 50px;
    padding: 3px;
    border-radius: 10px;
    border: 0;
    background: rgba(255, 255, 255, 0.66);
    box-shadow: none;
}

.home-pager-tabs button {
    min-width: 0;
    min-height: 44px;
    border: 0;
    border-radius: 8px;
    padding: 0 12px;
    background: transparent;
    color: #667085;
    font: inherit;
    font-size: 13px;
    line-height: 1;
    font-weight: 800;
    letter-spacing: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.home-pager-tabs button.active {
    background: #7E3A55;
    color: #FFFFFF;
    box-shadow: none;
}

.home-pager-progress {
    height: 3px;
    border-radius: 999px;
    background: rgba(43, 53, 47, 0.08);
    overflow: hidden;
}

.home-pager-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #7E3A55;
    transition: transform 0.24s ease;
}

.home-command-panel {
    min-height: clamp(360px, calc(100svh - 170px), 620px);
    position: relative;
    background:
        radial-gradient(circle at 50% 0%, rgba(245, 220, 231, 0.78), transparent 36%),
        linear-gradient(180deg, rgba(255, 251, 253, 0.92), rgba(247, 251, 255, 0.76) 58%, rgba(247, 251, 246, 0.72));
    border: 0;
    border-radius: 12px;
    padding: 24px 18px;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.home-command-main {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 28px;
    text-align: center;
}

.home-couple-row {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 16px;
    min-width: 0;
}

.home-avatar-stack {
    display: flex;
    align-items: center;
    flex-shrink: 0;
}

.home-avatar {
    width: 58px;
    height: 58px;
    border-radius: 50%;
    overflow: hidden;
    background: #FFFFFF;
    border: 2px solid rgba(255, 255, 255, 0.88);
    color: var(--color-primary-deep);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 21px;
    font-weight: 700;
}

.home-avatar + .home-avatar {
    margin-left: -10px;
}

.home-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.home-avatar-link {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    margin: 0 -9px;
    background: var(--color-accent);
    color: var(--color-primary);
    border: 2px solid #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1;
}

.home-couple-copy {
    min-width: 0;
}

.home-eyebrow,
.home-mission-head span,
.home-launch-head span,
.home-section-head span,
.focus-kicker,
.feature-copy > span {
    display: block;
    font-size: 11px;
    font-weight: 700;
    color: rgba(75, 36, 50, 0.62);
    letter-spacing: 0;
}

.home-couple-copy h1 {
    margin: 4px 0 5px;
    color: var(--text-primary);
    font-size: 24px;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.home-couple-copy p,
.home-days-block small,
.home-stat-card small,
.feature-copy p,
.feature-footer span,
.feature-mini-list p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.home-days-block {
    flex-shrink: 0;
    text-align: center;
    min-width: 0;
}

.home-days-block > span {
    display: block;
    color: var(--color-primary-deep);
    font-size: 72px;
    line-height: 1;
    font-weight: 850;
    letter-spacing: 0;
}

.home-relationship-note {
    width: min(100%, 430px);
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 12px;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    background:
        linear-gradient(140deg, rgba(255, 241, 247, 0.92), rgba(241, 248, 255, 0.82) 56%, rgba(237, 246, 239, 0.74)),
        #FFFFFF;
    box-shadow: none;
    text-align: left;
}

.note-stamp {
    width: 92px;
    min-height: 86px;
    border-radius: 10px;
    padding: 10px;
    border: 0;
    background: rgba(255, 255, 255, 0.62);
    color: #7E3A55;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 7px;
}

.note-stamp span,
.note-copy > span,
.note-copy p,
.note-keepsake span {
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.35;
    font-weight: 750;
}

.note-stamp span {
    color: #7E3A55;
}

.note-stamp strong {
    color: var(--text-primary);
    font-size: 17px;
    line-height: 1.12;
    font-weight: 850;
    letter-spacing: 0;
}

.note-copy {
    min-width: 0;
    align-self: center;
}

.note-copy h2 {
    margin: 0 0 5px;
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1.15;
    font-weight: 850;
    letter-spacing: 0;
}

.note-copy p {
    margin: 0;
}

.note-primary,
.note-keepsake {
    min-width: 0;
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform 0.18s ease, background 0.18s ease;
}

.note-primary {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 12px;
    background: var(--color-accent);
    color: #7E2147;
    font-size: 13px;
    line-height: 1;
    font-weight: 850;
}

.note-primary:hover,
.note-keepsake:hover {
    transform: translateY(-1px);
    box-shadow: none;
}

.note-primary:active,
.note-keepsake:active {
    transform: translateY(0);
}

.note-primary.mood {
    color: #7E2147;
    background: var(--color-accent);
}

.note-primary.wish {
    color: #7A4215;
    background: #FFF1D6;
}

.note-primary.action {
    color: #075E45;
    background: var(--color-leaf-soft);
}

.note-primary.album {
    color: #254B8F;
    background: var(--color-blue-soft);
}

.note-keepsake-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
}

.note-keepsake {
    padding: 8px 9px;
    background: rgba(255, 255, 255, 0.64);
    color: var(--text-primary);
}

.note-keepsake strong {
    display: block;
    margin-top: 3px;
    color: inherit;
    font-size: 13px;
    line-height: 1.2;
    font-weight: 850;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-keepsake.attention {
    background: rgba(245, 220, 231, 0.72);
}

.note-keepsake.mood {
    background: #F8DDE8;
}

.note-keepsake.album {
    background: var(--color-blue-soft);
}

.note-keepsake.wish {
    background: #FFF1D6;
}

.note-keepsake.steady {
    background: var(--color-leaf-soft);
    color: #067647;
}

.home-swipe-cue {
    position: absolute;
    left: 50%;
    bottom: 18px;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    gap: 7px;
    max-width: calc(100% - 36px);
    min-height: 44px;
    padding: 0 13px;
    border: 0;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.72);
    color: #344054;
    font: inherit;
    box-shadow: none;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.home-swipe-cue span,
.home-swipe-cue strong {
    white-space: nowrap;
}

.home-swipe-cue span {
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 700;
}

.home-swipe-cue strong {
    color: #7E3A55;
    font-size: 13px;
    line-height: 1;
    font-weight: 850;
}

.home-swipe-cue svg {
    flex: 0 0 auto;
    color: #7E3A55;
}

.home-command-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0;
    margin-top: 18px;
    padding-top: 16px;
    border-top: 1px solid rgba(43, 53, 47, 0.1);
}

.home-command-stats.mission-stats {
    margin-top: 2px;
    padding: 12px;
    border: 0;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.62);
}

.mission-stats .home-stat-card {
    border-left: 0;
    padding: 0;
}

.home-stat-card {
    min-width: 0;
    padding: 0 12px;
    border-left: 1px solid rgba(43, 53, 47, 0.08);
}

.home-stat-card:first-child {
    border-left: 0;
    padding-left: 0;
}

.home-stat-card span {
    display: block;
    margin-bottom: 5px;
    color: #667085;
    font-size: 11px;
    font-weight: 650;
}

.home-stat-card strong {
    display: block;
    color: var(--text-primary);
    font-size: 17px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: 0;
}

.home-stat-card.warning strong {
    color: #B45309;
}

.home-stat-card.danger strong {
    color: #B42318;
}

.home-stat-card.steady strong {
    color: #067647;
}

.home-focus-card,
.home-pinned-card,
.home-feature-card,
.home-launch-card,
.section-link {
    font: inherit;
    border: 0;
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
}

.home-feature-card:hover,
.home-launch-card:hover,
.section-link:hover {
    transform: translateY(-1px);
}

.home-feature-card:active,
.home-launch-card:active,
.section-link:active {
    transform: translateY(0);
}

.home-mission-panel {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.home-mission-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
}

.home-mission-head h2 {
    margin: 3px 0 0;
    color: var(--text-primary);
    font-size: 22px;
    line-height: 1.18;
    font-weight: 850;
    letter-spacing: 0;
}

.home-mission-head small {
    flex-shrink: 0;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.4;
}

.home-mission-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    align-items: stretch;
}

.home-focus-card {
    min-width: 0;
    min-height: 156px;
    border-radius: 12px;
    padding: 18px;
    border: 0;
    background: rgba(255, 255, 255, 0.76);
    color: var(--text-primary);
    box-shadow: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 14px;
    overflow: hidden;
    transition: transform 0.18s ease, background 0.18s ease;
}

.home-focus-card strong {
    display: block;
    margin: 0;
    max-width: 15em;
    color: inherit;
    font-size: 24px;
    line-height: 1.12;
    font-weight: 850;
    letter-spacing: 0;
}

.home-focus-card small {
    display: block;
    max-width: 24em;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.5;
}

.focus-cta {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    width: fit-content;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    background: rgba(31, 41, 55, 0.08);
    color: inherit;
    font-size: 13px;
    font-weight: 800;
}

.home-focus-card:hover,
.home-pinned-card:hover {
    transform: translateY(-1px);
    box-shadow: none;
}

.home-focus-card:active,
.home-pinned-card:active {
    transform: translateY(0);
}

.home-focus-card.danger {
    background: #FFF4F2;
    color: #912018;
}

.home-focus-card.action {
    background: var(--color-leaf-soft);
    color: #075E45;
}

.home-focus-card.warning {
    background: #FFF7ED;
    color: #93370D;
}

.home-focus-card.study {
    background: linear-gradient(135deg, #4B2432 0%, #5E725F 100%);
    color: #FFFFFF;
}

.home-focus-card.mood {
    border-color: rgba(190, 91, 8, 0.2);
    background: #FFF6EA;
    color: #93370D;
}

.home-focus-card.study .focus-kicker,
.home-focus-card.study small {
    color: rgba(255, 255, 255, 0.78);
}

.home-focus-card.study .focus-cta {
    background: rgba(255, 255, 255, 0.16);
}

.home-pinned-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.home-pinned-card {
    position: relative;
    min-width: 0;
    min-height: 91px;
    border-radius: 12px;
    padding: 12px;
    border: 0;
    background: rgba(255, 255, 255, 0.76);
    color: var(--text-primary);
    box-shadow: none;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 10px;
    align-items: center;
    overflow: hidden;
    transition: transform 0.18s ease, background 0.18s ease;
}

.home-pinned-card.attention {
    background: rgba(245, 220, 231, 0.78);
}

.pinned-mark {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(31, 41, 55, 0.08);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: inherit;
    font-size: 16px;
    font-weight: 850;
    line-height: 1;
}

.pinned-copy {
    min-width: 0;
}

.pinned-copy strong,
.pinned-copy small {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pinned-copy strong {
    color: inherit;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 850;
}

.pinned-copy small {
    margin-top: 5px;
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 750;
}

.pinned-rank {
    position: absolute;
    right: 8px;
    top: 6px;
    color: rgba(31, 41, 55, 0.14);
    font-size: 20px;
    line-height: 1;
    font-weight: 850;
}

.home-pinned-card.study {
    color: #FFFFFF;
    background: linear-gradient(135deg, #4B2432 0%, #5E725F 100%);
}

.home-pinned-card.study .pinned-mark {
    background: rgba(255, 255, 255, 0.16);
}

.home-pinned-card.study .pinned-copy small,
.home-pinned-card.study .pinned-rank {
    color: rgba(255, 255, 255, 0.72);
}

.home-pinned-card.action,
.home-pinned-card.steady {
    background: var(--color-leaf-soft);
}

.home-pinned-card.mood {
    background: #FFF6EA;
}

.home-pinned-card.album,
.home-pinned-card.logistics {
    background: var(--color-blue-soft);
}

.home-pinned-card.health {
    background: #EFF8F6;
}

.home-pinned-card.danger {
    background: #FFF4F2;
    border-color: rgba(180, 35, 24, 0.24);
}

.home-pinned-card.danger .pinned-mark {
    color: #912018;
    background: rgba(180, 35, 24, 0.1);
}

.home-launch-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.home-launch-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
}

.home-launch-head h2 {
    margin: 0;
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: 0;
}

.home-launch-rail {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(112px, 132px);
    gap: 8px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    padding: 2px 2px 8px;
    margin: 0 -2px;
    scrollbar-width: none;
}

.home-launch-rail::-webkit-scrollbar {
    display: none;
}

.home-launch-card {
    min-width: 0;
    min-height: 94px;
    border-radius: 12px;
    padding: 10px;
    color: var(--text-primary);
    background: rgba(255, 255, 255, 0.76);
    border: 0;
    box-shadow: none;
    display: grid;
    grid-template-rows: auto auto 1fr;
    align-items: start;
    gap: 6px;
    scroll-snap-align: start;
    transition: transform 0.18s ease, background 0.18s ease;
}

.home-launch-card.attention {
    background: rgba(245, 220, 231, 0.78);
}

.launch-mark {
    width: 30px;
    height: 30px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(31, 41, 55, 0.08);
    color: inherit;
    font-size: 14px;
    line-height: 1;
    font-weight: 850;
}

.launch-title {
    color: inherit;
    font-size: 14px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: 0;
}

.home-launch-card strong {
    align-self: end;
    min-width: 0;
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 750;
    overflow-wrap: anywhere;
}

.home-launch-card.study {
    color: #FFFFFF;
    background: linear-gradient(135deg, #4B2432 0%, #5E725F 100%);
}

.home-launch-card.study .launch-mark {
    background: rgba(255, 255, 255, 0.16);
}

.home-launch-card.study strong {
    color: rgba(255, 255, 255, 0.78);
}

.home-launch-card.action,
.home-launch-card.steady,
.home-launch-card.wish {
    background: var(--color-leaf-soft);
}

.home-launch-card.mood {
    background: #FFF6EA;
}

.home-launch-card.album,
.home-launch-card.logistics {
    background: var(--color-blue-soft);
}

.home-launch-card.health {
    background: #EFF8F6;
}

.home-launch-card.beauty {
    background: #FFF3F8;
}

.home-launch-card.budget {
    background: #F8F5EF;
}

.home-launch-card.shopping {
    background: #F3F6FB;
}

.home-launch-card.warning {
    background: #FFF7ED;
    border-color: rgba(181, 71, 8, 0.2);
}

.home-launch-card.danger {
    background: #FFF4F2;
    border-color: rgba(180, 35, 24, 0.24);
}

.home-launch-card.danger .launch-mark {
    color: #912018;
    background: rgba(180, 35, 24, 0.1);
}

.home-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.home-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 14px;
}

.home-section-head h2 {
    margin: 3px 0 0;
    color: var(--text-primary);
    font-size: 19px;
    line-height: 1.25;
    font-weight: 850;
    letter-spacing: 0;
}

.home-section-head.compact {
    align-items: flex-start;
}

.section-link {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 10px;
    color: #1D4ED8;
    background: #EFF6FF;
    border: 1px solid rgba(29, 78, 216, 0.14);
    font-size: 13px;
    font-weight: 750;
}

.home-priority-grid,
.home-life-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.home-feature-card {
    position: relative;
    min-width: 0;
    min-height: 156px;
    padding: 14px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.76);
    color: var(--text-primary);
    border: 0;
    box-shadow: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    transition: transform 0.18s ease, background 0.18s ease;
}

.home-feature-card.attention {
    background: rgba(245, 220, 231, 0.78);
}

.home-feature-card.wide {
    grid-column: span 2;
    min-height: 176px;
}

.feature-topline,
.feature-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.feature-mark {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(31, 41, 55, 0.08);
    color: #1F2937;
    font-size: 17px;
    line-height: 1;
    font-weight: 850;
}

.feature-badge {
    max-width: 112px;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(31, 41, 55, 0.07);
    color: #344054;
    font-size: 11px;
    line-height: 1;
    font-weight: 750;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.feature-copy {
    min-width: 0;
}

.feature-copy h3 {
    margin: 4px 0 6px;
    color: inherit;
    font-size: 18px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: 0;
}

.feature-copy p {
    min-height: 34px;
}

.feature-footer {
    margin-top: auto;
}

.feature-footer strong {
    min-width: 0;
    color: inherit;
    font-size: 15px;
    line-height: 1.2;
    font-weight: 850;
    letter-spacing: 0;
    overflow-wrap: anywhere;
}

.feature-progress {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(31, 41, 55, 0.08);
    overflow: hidden;
}

.feature-progress div {
    height: 100%;
    border-radius: inherit;
    background: currentColor;
    opacity: 0.65;
}

.feature-mini-list {
    padding: 9px 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.6);
    border: 0;
}

.feature-mini-list span {
    display: block;
    margin-bottom: 2px;
    color: var(--text-secondary);
    font-size: 10px;
    font-weight: 800;
}

.feature-mini-list p {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.priority-card.study {
    color: #FFFFFF;
    background: linear-gradient(135deg, #4B2432 0%, #5E725F 100%);
}

.priority-card.study .feature-mark,
.priority-card.study .feature-badge {
    background: rgba(255, 255, 255, 0.16);
    color: #FFFFFF;
}

.priority-card.study .feature-copy > span,
.priority-card.study .feature-copy p,
.priority-card.study .feature-footer span {
    color: rgba(255, 255, 255, 0.78);
}

.priority-card.action,
.home-feature-card.wish {
    background: var(--color-leaf-soft);
}

.priority-card.logistics,
.home-feature-card.album {
    background: var(--color-blue-soft);
}

.priority-card.health {
    background: #EFF8F6;
}

.home-feature-card.mood {
    background: #FFF6EA;
}

.home-feature-card.beauty {
    background: #FFF3F8;
}

.home-feature-card.shopping {
    background: #F3F6FB;
}

.home-feature-card.budget {
    background: #F8F5EF;
}

.home-feature-card.warning {
    background: #FFF7ED;
    border-color: rgba(181, 71, 8, 0.2);
}

.priority-card.danger,
.home-feature-card.danger {
    background: #FFF4F2;
    border-color: rgba(180, 35, 24, 0.24);
}

.priority-card.danger .feature-mark,
.home-feature-card.danger .feature-mark {
    color: #912018;
    background: rgba(180, 35, 24, 0.1);
}

.life-card {
    min-height: 142px;
}

.life-mood-pair {
    display: flex;
    align-items: center;
    gap: 8px;
}

.life-mood-pair span {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.72);
    border: 1px solid rgba(43, 53, 47, 0.1);
    font-size: 18px;
}

.life-mood-pair span.empty {
    color: #98A2B3;
    font-size: 15px;
    font-weight: 800;
}

.life-mood-pair i {
    width: 24px;
    height: 1px;
    background: rgba(43, 53, 47, 0.16);
}

@media (max-width: 430px) {
    .main {
        padding: 18px 14px;
    }

    .home-pager-rail {
        gap: 10px;
        height: clamp(470px, calc(100svh - 254px), 600px);
        min-height: 470px;
    }

    .home-page-arrow {
        display: none;
    }

    .home-command-panel {
        padding: 16px 16px 62px;
    }

    .home-command-main {
        align-items: center;
        gap: 16px;
    }

    .home-couple-row {
        gap: 10px;
    }

    .home-avatar {
        width: 50px;
        height: 50px;
        font-size: 18px;
    }

    .home-avatar-link {
        width: 26px;
        height: 26px;
    }

    .home-days-block {
        width: 100%;
        text-align: center;
    }

    .home-days-block > span {
        font-size: 52px;
    }

    .home-relationship-note {
        width: 100%;
        gap: 8px;
        padding: 10px;
    }

    .note-stamp {
        width: 82px;
        min-height: 74px;
        padding: 9px;
    }

    .note-stamp strong {
        font-size: 16px;
    }

    .note-copy h2 {
        font-size: 16px;
    }

    .note-keepsake-grid {
        gap: 5px;
    }

    .note-keepsake {
        padding: 7px;
    }

    .note-keepsake span {
        font-size: 10px;
    }

    .note-keepsake strong {
        font-size: 12px;
    }

    .home-swipe-cue {
        bottom: 14px;
    }

    .home-command-stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 0;
    }

    .home-stat-card:nth-child(odd) {
        border-left: 0;
        padding-left: 0;
    }

    .home-section-head {
        align-items: flex-start;
    }

    .home-mission-head {
        align-items: flex-start;
        flex-direction: column;
        gap: 4px;
    }

    .home-mission-head h2 {
        font-size: 19px;
    }

    .home-mission-grid {
        grid-template-columns: 1fr;
    }

    .home-focus-card {
        min-height: 148px;
    }

    .home-focus-card strong {
        font-size: 21px;
    }

    .home-pinned-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .home-section-head h2 {
        font-size: 17px;
    }

    .home-launch-rail {
        grid-auto-columns: minmax(108px, 122px);
    }

    .home-launch-card {
        min-height: 86px;
    }

    .home-priority-grid,
    .home-life-grid {
        gap: 8px;
    }

    .life-slide .home-feature-card {
        min-height: 128px;
        padding: 10px;
        gap: 8px;
    }

    .life-slide .feature-mark {
        width: 34px;
        height: 34px;
        font-size: 15px;
    }

    .life-slide .feature-badge {
        max-width: 86px;
        padding: 4px 7px;
    }

    .life-slide .feature-copy h3 {
        margin: 2px 0 4px;
        font-size: 16px;
    }

    .life-slide .feature-copy p {
        min-height: 28px;
        font-size: 11px;
        line-height: 1.35;
    }

    .life-slide .feature-footer strong {
        font-size: 14px;
    }

    .home-feature-card {
        min-height: 148px;
        padding: 12px;
    }

    .home-feature-card.wide {
        min-height: 166px;
    }
}

@media (max-width: 360px) {
    .home-pager-tabs button {
        padding: 0 8px;
        font-size: 12px;
    }

    .home-priority-grid,
    .home-life-grid {
        grid-template-columns: 1fr;
    }

    .home-pinned-card {
        padding: 10px;
    }

    .home-feature-card.wide {
        grid-column: span 1;
    }

    .section-link {
        display: none;
    }
}

/* ============================================
   首页 6.0 关系分页视觉刷新
   ============================================ */

.home-page {
    background:
        linear-gradient(180deg, rgba(255, 253, 249, 0.98) 0%, rgba(252, 245, 247, 0.94) 46%, rgba(244, 248, 241, 0.96) 100%),
        linear-gradient(118deg, rgba(139, 63, 91, 0.06), rgba(104, 121, 95, 0.07));
}

.app {
    padding-bottom: 96px;
}

.header {
    padding: env(safe-area-inset-top, 0px) 18px 10px;
    background: linear-gradient(180deg, rgba(255, 252, 248, 0.94), rgba(255, 252, 248, 0.76));
    backdrop-filter: blur(18px) saturate(1.1);
    border-bottom: 1px solid rgba(59, 30, 43, 0.08);
}

.header-content {
    max-width: 600px;
}

.logo-small {
    font-family: var(--font-display);
    font-size: 27px;
    font-weight: 600;
    color: var(--color-primary-deep);
}

.icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: rgba(255, 252, 248, 0.72);
    border: 1px solid rgba(59, 30, 43, 0.1);
    color: var(--text-secondary);
}

.icon-btn:active {
    transform: scale(0.96);
}

.main {
    max-width: 600px;
    padding: 18px 18px 24px;
}

.home-pager {
    gap: 10px;
}

.home-pager-rail {
    gap: 14px;
    height: clamp(560px, calc(100svh - 194px), 720px);
    min-height: 560px;
    border-radius: 8px;
}

.home-page-slide {
    border-radius: 8px;
}

.home-page-slide.is-scrollable {
    gap: 14px;
    padding-bottom: 8px;
}

.home-command-panel {
    min-height: 100%;
    padding: 30px 20px 72px;
    border: 1px solid rgba(59, 30, 43, 0.1);
    border-radius: 8px;
    background:
        linear-gradient(180deg, rgba(255, 252, 248, 0.96), rgba(251, 243, 246, 0.88) 54%, rgba(239, 247, 235, 0.82));
}

.home-command-main {
    gap: 24px;
}

.home-couple-row {
    gap: 14px;
}

.home-avatar {
    width: 62px;
    height: 62px;
    background: #FFFDF9;
    border: 1px solid rgba(59, 30, 43, 0.12);
    box-shadow: 0 4px 8px rgba(59, 30, 43, 0.08);
}

.home-avatar-link {
    background: var(--color-primary-soft);
    color: var(--color-primary);
    border: 2px solid #FFFDF9;
}

.home-eyebrow,
.home-mission-head span,
.home-launch-head span,
.home-section-head span,
.focus-kicker,
.feature-copy > span {
    font-size: 12px;
    font-weight: 700;
    color: rgba(59, 30, 43, 0.58);
}

.home-couple-copy h1 {
    font-family: var(--font-display);
    font-size: 29px;
    font-weight: 600;
    line-height: 1.18;
    white-space: normal;
}

.home-couple-copy p,
.home-days-block small,
.home-stat-card small,
.feature-copy p,
.feature-footer span,
.feature-mini-list p {
    color: var(--text-secondary);
    font-size: 12px;
}

.home-days-block > span {
    font-family: var(--font-display);
    color: var(--color-primary-deep);
    font-size: 78px;
    font-weight: 600;
}

.home-relationship-note {
    width: min(100%, 440px);
    gap: 12px;
    padding: 14px;
    border-radius: 8px;
    border: 1px solid rgba(59, 30, 43, 0.1);
    background: rgba(255, 252, 248, 0.72);
    box-shadow: 0 4px 8px rgba(59, 30, 43, 0.06);
}

.note-stamp {
    width: 94px;
    min-height: 88px;
    border-radius: 8px;
    background: rgba(245, 225, 234, 0.72);
    color: var(--color-primary-deep);
}

.note-stamp span,
.note-copy > span,
.note-copy p,
.note-keepsake span {
    color: var(--text-secondary);
}

.note-stamp span,
.home-swipe-cue strong,
.home-pager-tabs button.active {
    color: var(--color-primary-deep);
}

.note-copy h2 {
    color: var(--text-primary);
    font-size: 19px;
    line-height: 1.2;
}

.note-primary,
.note-keepsake,
.home-swipe-cue,
.home-page-arrow,
.home-pager-tabs button,
.home-focus-card,
.home-pinned-card,
.home-feature-card,
.home-launch-card,
.section-link {
    border-radius: 8px;
    transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.note-primary {
    background: var(--color-primary-soft);
    color: var(--color-primary-deep);
    min-height: 44px;
}

.note-primary.mood,
.note-primary.wish,
.note-primary.action,
.note-primary.album {
    color: var(--color-primary-deep);
    background: var(--color-primary-soft);
}

.note-keepsake {
    background: rgba(255, 252, 248, 0.76);
    border: 1px solid rgba(59, 30, 43, 0.08);
    min-height: 44px;
}

.note-keepsake.attention,
.note-keepsake.mood {
    background: rgba(245, 225, 234, 0.72);
}

.note-keepsake.album {
    background: var(--color-blue-soft);
}

.note-keepsake.wish {
    background: var(--color-cream);
}

.note-keepsake.steady {
    background: var(--color-leaf-soft);
    color: var(--color-success);
}

.home-swipe-cue {
    bottom: 18px;
    border: 1px solid rgba(59, 30, 43, 0.1);
    background: rgba(255, 252, 248, 0.78);
}

.home-page-arrow {
    background: rgba(255, 252, 248, 0.84);
    color: var(--color-primary-deep);
    border: 1px solid rgba(59, 30, 43, 0.1);
}

.home-page-arrow:hover:not(:disabled) {
    background: rgba(245, 225, 234, 0.86);
}

.home-pager-tabs {
    min-height: 48px;
    padding: 0;
    gap: 0;
    background: transparent;
    border-radius: 0;
    border-bottom: 1px solid rgba(59, 30, 43, 0.08);
}

.home-pager-tabs button {
    min-height: 46px;
    color: var(--text-tertiary);
    font-size: 13px;
    font-weight: 750;
}

.home-pager-tabs button.active {
    background: transparent;
    box-shadow: inset 0 -2px 0 var(--color-primary);
}

.home-pager-progress {
    height: 2px;
    background: rgba(59, 30, 43, 0.07);
}

.home-pager-progress span {
    background: var(--color-primary);
}

.home-mission-panel,
.home-launch-section,
.home-section {
    padding: 2px;
}

.home-mission-head h2,
.home-section-head h2,
.home-launch-head h2 {
    color: var(--text-primary);
    font-family: var(--font-display);
    font-weight: 600;
}

.home-mission-head h2 {
    font-size: 26px;
}

.home-focus-card,
.home-pinned-card,
.home-launch-card,
.home-feature-card {
    border: 1px solid rgba(59, 30, 43, 0.09);
    background: rgba(255, 252, 248, 0.76);
    box-shadow: 0 4px 8px rgba(59, 30, 43, 0.045);
}

.home-focus-card:hover,
.home-pinned-card:hover,
.home-feature-card:hover,
.home-launch-card:hover,
.section-link:hover {
    box-shadow: 0 5px 8px rgba(59, 30, 43, 0.07);
}

.home-focus-card strong {
    font-family: var(--font-display);
    font-size: 27px;
    font-weight: 600;
}

.focus-cta,
.pinned-mark,
.launch-mark,
.feature-mark {
    border-radius: 8px;
    background: rgba(59, 30, 43, 0.075);
}

.home-command-stats.mission-stats {
    padding: 14px;
    background: rgba(255, 252, 248, 0.68);
    border: 1px solid rgba(59, 30, 43, 0.08);
}

.home-stat-card span {
    color: var(--text-tertiary);
}

.home-stat-card.warning strong {
    color: var(--color-warning);
}

.home-stat-card.danger strong {
    color: var(--color-danger);
}

.home-stat-card.steady strong {
    color: var(--color-success);
}

.home-focus-card.study,
.home-pinned-card.study,
.home-launch-card.study,
.priority-card.study {
    background: linear-gradient(135deg, var(--color-primary-deep) 0%, var(--color-secondary-deep) 100%);
}

.home-focus-card.action,
.home-pinned-card.action,
.home-pinned-card.steady,
.home-launch-card.action,
.home-launch-card.steady,
.home-launch-card.wish,
.priority-card.action,
.home-feature-card.wish {
    background: var(--color-leaf-soft);
}

.home-focus-card.mood,
.home-pinned-card.mood,
.home-launch-card.mood,
.home-feature-card.mood {
    background: #FFF4E8;
}

.home-focus-card.warning,
.home-launch-card.warning,
.home-feature-card.warning {
    background: #FFF5E8;
    color: #8A4B16;
}

.home-focus-card.danger,
.home-pinned-card.danger,
.home-launch-card.danger,
.priority-card.danger,
.home-feature-card.danger {
    background: #FFF1EF;
    color: var(--color-danger);
}

.home-pinned-card.album,
.home-pinned-card.logistics,
.home-launch-card.album,
.home-launch-card.logistics,
.priority-card.logistics,
.home-feature-card.album {
    background: var(--color-blue-soft);
}

.home-pinned-card.health,
.home-launch-card.health,
.priority-card.health {
    background: #EDF5F0;
}

.home-launch-card.beauty,
.home-feature-card.beauty {
    background: #FFF1F6;
}

.home-launch-card.budget,
.home-feature-card.budget {
    background: #FBF2E8;
}

.home-launch-card.shopping,
.home-feature-card.shopping {
    background: #EEF3F8;
}

.section-link {
    color: var(--color-primary-deep);
    background: rgba(245, 225, 234, 0.68);
    border: 1px solid rgba(139, 63, 91, 0.12);
    min-height: 44px;
}

.feature-badge {
    background: rgba(59, 30, 43, 0.07);
    color: var(--text-secondary);
}

.feature-copy h3,
.feature-footer strong,
.launch-title,
.pinned-copy strong {
    font-weight: 800;
}

@media (max-width: 900px) {
    .home-page-arrow {
        display: none;
    }
}

@media (max-width: 430px) {
    .app {
        padding-bottom: 88px;
    }

    .header {
        padding: env(safe-area-inset-top, 0px) 14px 8px;
    }

    .logo-small {
        font-size: 25px;
    }

    .main {
        padding: 14px 12px 20px;
    }

    .home-pager-rail {
        height: clamp(506px, calc(100svh - 214px), 650px);
        min-height: 506px;
        gap: 10px;
    }

    .home-command-panel {
        padding: 18px 14px 64px;
    }

    .home-command-main {
        gap: 15px;
    }

    .home-avatar {
        width: 52px;
        height: 52px;
    }

    .home-couple-copy h1 {
        font-size: 24px;
    }

    .home-days-block > span {
        font-size: 58px;
    }

    .home-relationship-note {
        gap: 8px;
        padding: 10px;
    }

    .note-stamp {
        width: 80px;
        min-height: 72px;
    }

    .note-copy h2 {
        font-size: 16px;
    }

    .note-primary {
        min-height: 44px;
    }

    .note-keepsake-grid {
        grid-template-columns: 1fr;
    }

    .note-keepsake {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        min-height: 44px;
    }

    .note-keepsake strong {
        margin-top: 0;
    }

    .home-pager-tabs button {
        min-height: 44px;
    }

    .home-mission-head h2 {
        font-size: 22px;
    }

    .home-focus-card strong {
        font-size: 23px;
    }
}

@media (max-width: 360px) {
    .home-pager-rail {
        height: clamp(500px, calc(100svh - 206px), 620px);
        min-height: 500px;
    }

    .home-couple-copy h1 {
        font-size: 22px;
    }
}

/* ============================================
   首页 6.1 关系封面与全局视觉校准
   ============================================ */

.home-page {
    background:
        linear-gradient(180deg, #F9F5F8 0%, #F3F6F2 52%, #EFF5F6 100%),
        linear-gradient(128deg, rgba(162, 67, 99, 0.08), rgba(82, 111, 92, 0.08));
}

.header {
    background: rgba(249, 245, 248, 0.9);
    border-bottom-color: rgba(50, 27, 38, 0.09);
}

.logo-small {
    font-family: var(--font-display);
    font-size: 25px;
    font-weight: 820;
    color: #321B26;
}

.home-pager-rail {
    height: clamp(590px, calc(100svh - 188px), 744px);
    min-height: 590px;
}

.home-command-panel {
    padding: 34px 22px 76px;
    background:
        linear-gradient(160deg, rgba(249, 245, 248, 0.96) 0%, rgba(246, 236, 242, 0.9) 42%, rgba(231, 240, 228, 0.86) 100%);
    border-color: rgba(50, 27, 38, 0.11);
}

.home-command-main {
    gap: 22px;
}

.home-couple-row {
    gap: 16px;
}

.home-avatar {
    width: 66px;
    height: 66px;
    background: #FFFFFF;
    border-color: rgba(50, 27, 38, 0.1);
    box-shadow: 0 4px 8px rgba(50, 27, 38, 0.08);
    color: #321B26;
    font-family: var(--font-ui);
    font-size: 22px;
    font-weight: 760;
}

.home-avatar-link {
    background: #F7DDE8;
    color: #A24363;
}

.home-eyebrow,
.home-mission-head span,
.home-launch-head span,
.home-section-head span,
.focus-kicker,
.feature-copy > span {
    color: rgba(50, 27, 38, 0.58);
    font-size: 12px;
    font-weight: 760;
}

.home-couple-copy h1 {
    color: #261F24;
    font-family: var(--font-display);
    font-size: 30px;
    font-weight: 820;
    line-height: 1.15;
    text-wrap: balance;
}

.home-couple-copy p {
    color: rgba(38, 31, 36, 0.64);
    font-size: 13px;
}

.home-days-block {
    width: min(100%, 430px);
}

.home-days-block > span {
    font-family: var(--font-number);
    color: #321B26;
    font-size: 84px;
    font-weight: 760;
}

.home-days-block small {
    color: rgba(38, 31, 36, 0.62);
    font-size: 13px;
    font-weight: 760;
}

.home-days-thread {
    display: grid;
    grid-template-columns: auto minmax(28px, 1fr) auto;
    align-items: center;
    gap: 10px;
    width: min(100%, 320px);
    margin: 12px auto 0;
    color: rgba(38, 31, 36, 0.58);
}

.home-days-thread span {
    min-width: 0;
    color: inherit;
    font-family: var(--font-ui);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 760;
    white-space: nowrap;
}

.home-days-thread i {
    height: 1px;
    background: rgba(50, 27, 38, 0.16);
}

.home-relationship-note {
    width: min(100%, 448px);
    padding: 15px;
    background: rgba(255, 255, 255, 0.72);
    border-color: rgba(50, 27, 38, 0.1);
    box-shadow: 0 4px 8px rgba(50, 27, 38, 0.055);
}

.note-stamp {
    background: #F7DDE8;
    color: #321B26;
}

.note-stamp span,
.note-copy > span,
.note-copy p,
.note-keepsake span {
    color: rgba(38, 31, 36, 0.64);
}

.note-stamp strong {
    color: #261F24;
}

.note-copy h2 {
    color: #261F24;
    font-family: var(--font-display);
    font-size: 20px;
    font-weight: 820;
    text-wrap: balance;
}

.note-primary {
    background: #321B26;
    color: #FFFFFF;
}

.note-primary.mood,
.note-primary.wish,
.note-primary.action,
.note-primary.album {
    background: #321B26;
    color: #FFFFFF;
}

.note-keepsake {
    background: rgba(249, 245, 248, 0.82);
    border-color: rgba(50, 27, 38, 0.08);
}

.note-keepsake.attention,
.note-keepsake.mood {
    background: #F7DDE8;
}

.note-keepsake.album {
    background: #E6F0F7;
}

.note-keepsake.wish {
    background: #F6ECE2;
}

.note-keepsake.steady {
    background: #E7F0E4;
}

.home-swipe-cue {
    background: rgba(255, 255, 255, 0.76);
    border-color: rgba(50, 27, 38, 0.1);
    color: #261F24;
}

.home-swipe-cue strong,
.home-swipe-cue svg {
    color: #A24363;
}

.home-pager-tabs {
    background: rgba(255, 255, 255, 0.54);
    border: 1px solid rgba(50, 27, 38, 0.08);
    border-radius: 8px;
    padding: 3px;
}

.home-pager-tabs button.active {
    background: #321B26;
    color: #FFFFFF;
    box-shadow: none;
}

.home-pager-progress span {
    background: #A24363;
}

.home-focus-card,
.home-pinned-card,
.home-launch-card,
.home-feature-card {
    background: rgba(255, 255, 255, 0.76);
    border-color: rgba(50, 27, 38, 0.09);
}

.home-focus-card.study,
.home-pinned-card.study,
.home-launch-card.study,
.priority-card.study {
    background: linear-gradient(135deg, #321B26 0%, #526F5C 100%);
}

.home-focus-card strong,
.home-mission-head h2,
.home-section-head h2,
.home-launch-head h2 {
    font-family: var(--font-display);
    font-weight: 820;
}

@media (max-width: 430px) {
    .home-pager-rail {
        height: clamp(534px, calc(100svh - 204px), 666px);
        min-height: 534px;
    }

    .home-command-panel {
        padding: 22px 14px 68px;
    }

    .home-command-main {
        gap: 16px;
    }

    .home-couple-copy h1 {
        font-size: 24px;
    }

    .home-days-block > span {
        font-size: 62px;
    }

    .home-days-thread {
        margin-top: 8px;
        gap: 8px;
    }

    .home-relationship-note {
        padding: 11px;
    }

    .note-copy h2 {
        font-size: 17px;
    }

    .home-pager-tabs {
        padding: 2px;
    }
}

@media (max-width: 360px) {
    .home-days-thread span {
        font-size: 10px;
    }

    .home-relationship-note {
        grid-template-columns: 1fr;
    }

    .note-stamp {
        width: 100%;
        min-height: 54px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }
}

/* ============================================
   绑定卡片 - Binding Card
   ============================================ */

.binding-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 28px;
    backdrop-filter: blur(10px);
}

.binding-title {
    text-align: center;
    margin-bottom: 24px;
}

.binding-title h2 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 6px;
}

.binding-title p {
    font-size: 13px;
    color: var(--text-tertiary);
}

.code-display {
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.4) 0%, rgba(255, 151, 175, 0.2) 100%);
    border: 1px dashed rgba(255, 107, 107, 0.3);
    border-radius: var(--radius-lg);
    padding: 24px;
    text-align: center;
    margin-bottom: 24px;
}

.code-label {
    font-size: 12px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 2px;
    margin-bottom: 12px;
}

.code-value {
    font-size: 36px;
    font-weight: 700;
    font-family: 'SF Mono', monospace;
    letter-spacing: 6px;
    color: var(--color-primary);
    text-shadow: 0 0 20px rgba(255, 107, 107, 0.3);
}

.code-action {
    margin-top: 16px;
    padding: 10px 20px;
    background: rgba(254, 208, 214, 0.5);
    border: 1px solid rgba(255, 107, 107, 0.2);
    border-radius: var(--radius-sm);
    color: var(--color-primary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.code-action:hover {
    background: rgba(254, 208, 214, 0.7);
}

.divider-or {
    display: flex;
    align-items: center;
    margin: 24px 0;
    color: var(--text-tertiary);
    font-size: 13px;
}

.divider-or::before,
.divider-or::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-color);
}

.divider-or span {
    padding: 0 16px;
}

.bind-form {
    text-align: center;
}

.bind-form label {
    display: block;
    font-size: 13px;
    color: var(--text-secondary);
    margin-bottom: 12px;
}

.code-input-wrapper {
    position: relative;
    margin-bottom: 16px;
}

.code-input {
    width: 100%;
    padding: 18px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 24px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 8px;
    color: var(--text-primary);
    outline: none;
    transition: all 0.3s ease;
    text-transform: uppercase;
    font-family: 'SF Mono', monospace;
}

.code-input:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(162, 67, 99, 0.12);
}

.code-input::placeholder {
    color: var(--text-tertiary);
    letter-spacing: 4px;
    font-size: 16px;
}

.bind-btn {
    width: 100%;
    padding: 16px;
    border: none;
    border-radius: var(--radius-md);
    background: var(--color-primary-deep);
    color: white;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.bind-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
}

.bind-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ============================================
   邀请状态相关样式
   ============================================ */

.invite-waiting {
    text-align: center;
    padding: 32px 24px;
}

.invite-waiting-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, rgba(219, 237, 156, 0.3) 0%, rgba(254, 208, 214, 0.2) 100%);
    border: 2px dashed rgba(255, 193, 7, 0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: pulse 2s ease-in-out infinite;
}

.invite-waiting h3 {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.invite-waiting p {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
}

.invite-target {
    background: var(--bg-input);
    border-radius: var(--radius-md);
    padding: 16px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 12px;
}

.invite-target-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    overflow: hidden;
    flex-shrink: 0;
}

.invite-target-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.invite-target-info {
    flex: 1;
    text-align: left;
}

.invite-target-name {
    font-size: 16px;
    font-weight: 600;
}

.invite-target-status {
    font-size: 12px;
    color: var(--text-tertiary);
}

.btn-cancel-invite {
    width: 100%;
    padding: 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--text-secondary);
    font-size: 15px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-cancel-invite:hover:not(:disabled) {
    background: rgba(254, 208, 214, 0.5);
    border-color: rgba(239, 68, 68, 0.3);
    color: #EF4444;
}

.invite-received {
    text-align: center;
    padding: 24px;
}

.invite-received-header {
    margin-bottom: 24px;
}

.invite-received-header h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
}

.invite-received-header p {
    font-size: 14px;
    color: var(--text-secondary);
}

.invite-from-card {
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.4) 0%, rgba(255, 151, 175, 0.2) 100%);
    border: 1px solid rgba(255, 107, 107, 0.2);
    border-radius: var(--radius-lg);
    padding: 24px;
    margin-bottom: 24px;
}

.invite-from-avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%);
    border: 3px solid rgba(255, 107, 107, 0.3);
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    font-weight: 600;
    overflow: hidden;
}

.invite-from-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.invite-from-name {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 4px;
}

.invite-from-bio {
    font-size: 13px;
    color: var(--text-tertiary);
}

.invite-actions {
    display: flex;
    gap: 12px;
}

.invite-actions button {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-reject {
    background: var(--bg-input);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.btn-reject:hover:not(:disabled) {
    background: rgba(254, 208, 214, 0.5);
    color: #EF4444;
}

.btn-accept {
    background: var(--color-primary-deep);
    color: white;
}

.btn-accept:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(34, 197, 94, 0.2);
}

/* ============================================
   Toast 提示
   ============================================ */

.toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(-30px);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    padding: 14px 24px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 8px rgba(59, 30, 43, 0.1);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
    z-index: 9999;
    max-width: 90%;
    width: max-content;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}

.toast.success {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(219, 237, 156, 0.3);
}

.toast.error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(241, 101, 137, 0.15);
}

.toast-icon {
    flex-shrink: 0;
}

/* 确认对话框 */
.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(51, 51, 51, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.confirm-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.confirm-dialog {
    background: linear-gradient(135deg, rgba(253, 253, 245, 0.98) 0%, rgba(254, 208, 214, 0.95) 100%);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 28px;
    width: 320px;
    max-width: 90%;
    text-align: center;
    transform: scale(0.9) translateY(20px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.28);
}

.confirm-overlay.show .confirm-dialog {
    transform: scale(1) translateY(0);
}

.confirm-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.confirm-message {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.5;
}

.confirm-actions {
    display: flex;
    gap: 12px;
}

.confirm-btn {
    flex: 1;
    min-height: 44px;
    padding: 12px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.confirm-btn.cancel {
    background: var(--bg-input);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.confirm-btn.confirm {
    background: var(--color-primary-deep);
    color: white;
}

.confirm-btn.danger {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}

/* ============================================
   首页 6.2 关系封面与品牌字体终稿
   ============================================ */

.home-page {
    min-height: 100dvh;
    font-family: var(--font-ui);
    background:
        linear-gradient(180deg, #FAF7FA 0%, #F2F6F3 52%, #EAF3F6 100%),
        linear-gradient(126deg, rgba(150, 54, 83, 0.08), rgba(86, 109, 94, 0.08));
}

.app {
    padding-bottom: 94px;
}

.header {
    padding: env(safe-area-inset-top, 0px) 18px 10px;
    background: rgba(250, 247, 250, 0.96);
    backdrop-filter: none;
    border-bottom: 1px solid rgba(43, 23, 32, 0.08);
}

.header-content {
    max-width: 620px;
}

.logo-small {
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 1;
    font-weight: 700;
    color: var(--color-primary-deep);
}

.icon-btn {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.68);
    border: 1px solid rgba(43, 23, 32, 0.1);
    color: var(--text-secondary);
}

.main {
    max-width: 620px;
    padding: 16px 18px 24px;
}

.relationship-home .home-pager-rail {
    height: clamp(550px, calc(100dvh - 238px), 720px);
    min-height: 550px;
    border-radius: 10px;
}

.home-page-slide {
    border-radius: 10px;
}

.relationship-slide .home-command-panel {
    overflow: hidden;
}

.home-command-panel {
    min-height: 100%;
    padding: 40px 24px 78px;
    border-radius: 10px;
    border: 0;
    background:
        linear-gradient(180deg, rgba(253, 251, 253, 0.98) 0%, rgba(248, 241, 245, 0.94) 52%, rgba(231, 240, 228, 0.88) 100%),
        linear-gradient(135deg, rgba(150, 54, 83, 0.1), rgba(86, 109, 94, 0.1));
    box-shadow: none;
}

.home-command-panel::before {
    content: '';
    position: absolute;
    inset: 14px;
    border: 1px solid rgba(43, 23, 32, 0.055);
    border-radius: 8px;
    pointer-events: none;
}

.home-command-panel::after {
    content: '';
    position: absolute;
    left: 28px;
    right: 28px;
    bottom: 54px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(150, 54, 83, 0.34), transparent);
    pointer-events: none;
}

.home-command-main {
    position: relative;
    z-index: 1;
    min-height: 100%;
    justify-content: center;
    gap: 24px;
}

.home-couple-row {
    gap: 18px;
}

.home-avatar {
    width: 68px;
    height: 68px;
    background: #FFFFFF;
    border: 1px solid rgba(43, 23, 32, 0.1);
    box-shadow: none;
    color: var(--color-primary-deep);
    font-family: var(--font-ui);
    font-size: 22px;
    font-weight: 700;
}

.home-avatar-link {
    width: 31px;
    height: 31px;
    background: var(--color-primary-deep);
    color: #FFFFFF;
    border-color: #FFFFFF;
}

.home-eyebrow {
    color: var(--color-primary);
}

.home-eyebrow,
.home-mission-head span,
.home-launch-head span,
.home-section-head span,
.focus-kicker,
.feature-copy > span {
    font-size: 12px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: 0;
}

.home-couple-copy h1 {
    margin: 6px 0 6px;
    color: var(--color-primary-deep);
    font-family: var(--font-display);
    font-size: 36px;
    line-height: 1.12;
    font-weight: 700;
    text-wrap: balance;
}

.home-couple-copy p {
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.45;
}

.home-days-block {
    width: min(100%, 440px);
}

.home-days-block > span {
    color: var(--color-primary-deep);
    font-family: var(--font-number);
    font-size: 92px;
    line-height: 0.96;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
}

.home-days-block small {
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
}

.home-days-thread {
    width: min(100%, 340px);
    margin-top: 14px;
    color: var(--text-tertiary);
}

.home-days-thread i {
    background: rgba(43, 23, 32, 0.18);
}

.home-relationship-note {
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    width: min(100%, 470px);
    padding: 15px;
    gap: 13px;
    border-radius: 10px;
    border: 0;
    background: rgba(255, 255, 255, 0.64);
    box-shadow: inset 0 0 0 1px rgba(43, 23, 32, 0.08);
}

.note-keepsake-grid {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0;
    padding-top: 8px;
    border-top: 1px solid rgba(43, 23, 32, 0.08);
}

.note-keepsake {
    min-width: 0;
    min-height: 52px;
    padding: 7px 9px;
    border: 0;
    border-left: 1px solid rgba(43, 23, 32, 0.08);
    border-radius: 0;
    background: transparent;
    color: var(--text-primary);
    box-shadow: none;
}

.note-keepsake:first-child {
    border-left: 0;
}

.note-keepsake.attention,
.note-keepsake.mood,
.note-keepsake.album,
.note-keepsake.wish,
.note-keepsake.steady {
    background: transparent;
}

.note-keepsake span {
    display: block;
    color: var(--text-tertiary);
    font-size: 11px;
    line-height: 1.2;
    font-weight: 700;
}

.note-keepsake strong {
    display: block;
    margin-top: 5px;
    color: var(--color-primary-deep);
    font-size: 13px;
    line-height: 1.2;
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-stamp {
    width: 96px;
    min-height: 88px;
    border-radius: 8px;
    background: var(--color-primary-soft);
    color: var(--color-primary-deep);
}

.note-stamp span,
.note-copy > span,
.note-copy p {
    color: var(--text-secondary);
}

.note-stamp strong {
    color: var(--color-primary-deep);
    font-family: var(--font-display);
    font-weight: 700;
}

.note-copy h2 {
    color: var(--text-primary);
    font-family: var(--font-display);
    font-size: 21px;
    line-height: 1.18;
    font-weight: 700;
    text-wrap: balance;
}

.note-primary {
    grid-column: auto;
    align-self: center;
    min-width: 136px;
    min-height: 46px;
    padding: 0 14px;
    border-radius: 10px;
    background: var(--color-primary-deep);
    color: #FFFFFF;
}

.note-primary.mood,
.note-primary.wish,
.note-primary.action,
.note-primary.album {
    background: var(--color-primary-deep);
    color: #FFFFFF;
}

.home-swipe-cue {
    z-index: 1;
    bottom: 18px;
    min-height: 46px;
    border-radius: 10px;
    border: 1px solid rgba(43, 23, 32, 0.1);
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-primary);
}

.home-swipe-cue strong,
.home-swipe-cue svg {
    color: var(--color-primary);
}

.home-pager-tabs {
    min-height: 50px;
    padding: 3px;
    border: 1px solid rgba(43, 23, 32, 0.08);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.58);
}

.home-pager-tabs button {
    min-height: 44px;
    border-radius: 8px;
    color: var(--text-tertiary);
    font-size: 13px;
    font-weight: 700;
}

.home-pager-tabs button.active {
    background: var(--color-primary-deep);
    color: #FFFFFF;
    box-shadow: none;
}

.home-pager-progress {
    height: 2px;
    background: rgba(43, 23, 32, 0.08);
}

.home-pager-progress span {
    background: var(--color-primary);
}

.home-page-arrow {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.82);
    color: var(--color-primary-deep);
    border: 1px solid rgba(43, 23, 32, 0.1);
}

.home-mission-head h2,
.home-section-head h2,
.home-launch-head h2,
.home-focus-card strong {
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-weight: 800;
}

.home-focus-card,
.home-pinned-card,
.home-launch-card,
.home-feature-card {
    border: 1px solid rgba(43, 23, 32, 0.07);
    background: rgba(255, 255, 255, 0.68);
    box-shadow: none;
}

.home-focus-card:hover,
.home-pinned-card:hover,
.home-feature-card:hover,
.home-launch-card:hover,
.section-link:hover {
    box-shadow: none;
}

.focus-cta,
.pinned-mark,
.launch-mark,
.feature-mark,
.feature-badge {
    background: rgba(43, 23, 32, 0.075);
}

.home-focus-card.study,
.home-pinned-card.study,
.home-launch-card.study,
.priority-card.study {
    background: linear-gradient(135deg, var(--color-primary-deep) 0%, var(--color-secondary-deep) 100%);
}

.home-focus-card.action,
.home-pinned-card.action,
.home-pinned-card.steady,
.home-launch-card.action,
.home-launch-card.steady,
.home-launch-card.wish,
.priority-card.action,
.home-feature-card.wish {
    background: var(--color-leaf-soft);
}

.home-focus-card.mood,
.home-pinned-card.mood,
.home-launch-card.mood,
.home-feature-card.mood {
    background: #FFF3E8;
}

.home-pinned-card.album,
.home-pinned-card.logistics,
.home-launch-card.album,
.home-launch-card.logistics,
.priority-card.logistics,
.home-feature-card.album {
    background: var(--color-blue-soft);
}

.home-pinned-card.health,
.home-launch-card.health,
.priority-card.health {
    background: #EAF4EF;
}

.home-launch-card.beauty,
.home-feature-card.beauty {
    background: #FBE8F1;
}

.home-launch-card.budget,
.home-feature-card.budget {
    background: var(--color-cream);
}

.home-launch-card.shopping,
.home-feature-card.shopping {
    background: #EEF3F8;
}

.home-focus-card.warning,
.home-launch-card.warning,
.home-feature-card.warning {
    background: #FFF3E5;
    color: var(--color-warning);
}

.home-focus-card.danger,
.home-pinned-card.danger,
.home-launch-card.danger,
.priority-card.danger,
.home-feature-card.danger {
    background: #FFF0ED;
    color: var(--color-danger);
}

.section-link {
    min-height: 44px;
    border-radius: 10px;
    background: var(--color-primary-soft);
    border-color: rgba(150, 54, 83, 0.12);
    color: var(--color-primary-deep);
}

@media (max-width: 430px) {
    .app {
        padding-bottom: 88px;
    }

    .header {
        padding: env(safe-area-inset-top, 0px) 14px 8px;
    }

    .main {
        padding: 14px 12px 20px;
    }

    .relationship-home .home-pager-rail {
        height: clamp(520px, calc(100dvh - 246px), 632px);
        min-height: 520px;
    }

    .home-command-panel {
        padding: 18px 14px 16px;
        justify-content: flex-start;
    }

    .home-command-panel::before {
        inset: 10px;
    }

    .home-command-main {
        min-height: auto;
        justify-content: flex-start;
        gap: 12px;
    }

    .home-avatar {
        width: 50px;
        height: 50px;
    }

    .home-avatar-stack {
        margin-top: 10px;
    }

    .home-avatar-link {
        width: 28px;
        height: 28px;
    }

    .home-couple-copy h1 {
        font-size: 26px;
    }

    .home-days-block > span {
        font-size: 60px;
    }

    .home-days-thread {
        margin-top: 6px;
    }

    .home-relationship-note {
        grid-template-columns: 1fr;
        padding: 12px;
    }

    .note-keepsake-grid {
        padding-top: 6px;
    }

    .home-swipe-cue,
    .home-command-stats.mission-stats {
        display: none;
    }

    .note-primary {
        width: 100%;
        min-height: 42px;
    }

    .note-stamp {
        width: 100%;
        min-height: 50px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    .note-copy h2 {
        font-size: 17px;
    }

    .note-keepsake {
        min-height: 44px;
        padding: 5px 6px;
    }

    .note-keepsake strong {
        font-size: 12px;
    }
}

@media (max-width: 360px) {
    .relationship-home .home-pager-rail {
        height: clamp(520px, calc(100dvh - 198px), 640px);
        min-height: 520px;
    }

    .home-couple-copy h1 {
        font-size: 24px;
    }

    .home-days-block > span {
        font-size: 58px;
    }

    .note-keepsake-grid {
        grid-template-columns: 1fr;
        gap: 0;
    }

    .note-keepsake {
        min-height: 42px;
        border-left: 0;
        border-top: 1px solid rgba(43, 23, 32, 0.08);
        text-align: center;
    }

    .note-keepsake:first-child {
        border-top: 0;
    }
}

/* ============================================
   Fellow 横向首页 v2 - 关系封面 + 今日照顾 + 全部入口
   ============================================ */

.home-page {
    background:
        linear-gradient(180deg, #F9F7FA 0%, #F3F7F5 52%, #EEF5F7 100%);
}

.header {
    background: rgba(249, 247, 250, 0.96);
    backdrop-filter: none;
}

.main {
    max-width: 640px;
    padding: 16px 18px 24px;
}

.relationship-home .home-pager-rail {
    gap: 14px;
    height: clamp(590px, calc(100dvh - 228px), 740px);
    min-height: 590px;
    border-radius: 12px;
}

.home-page-slide {
    border-radius: 12px;
}

.home-page-slide.is-scrollable {
    gap: 18px;
    padding: 2px 2px 12px;
}

.home-command-panel {
    padding: 42px 26px 82px;
    background:
        linear-gradient(180deg, rgba(255, 252, 254, 0.98) 0%, rgba(246, 239, 244, 0.96) 54%, rgba(229, 240, 234, 0.9) 100%);
}

.home-command-panel::before {
    inset: 16px;
    border-color: rgba(47, 23, 36, 0.07);
}

.home-command-panel::after {
    left: 34px;
    right: 34px;
    bottom: 58px;
    background: linear-gradient(90deg, transparent, rgba(143, 61, 90, 0.28), transparent);
}

.home-command-main {
    gap: 26px;
}

.home-couple-copy h1 {
    color: var(--color-primary-deep);
    font-size: 38px;
    line-height: 1.1;
    white-space: normal;
}

.home-couple-copy p {
    color: #5B4E56;
}

.home-days-block > span {
    color: var(--color-primary-deep);
    font-size: 96px;
}

.home-days-thread {
    margin-inline: auto;
}

.home-relationship-note {
    width: min(100%, 488px);
    padding: 16px;
    background: rgba(255, 255, 255, 0.68);
    box-shadow: inset 0 0 0 1px rgba(47, 23, 36, 0.08);
}

.note-stamp {
    background: var(--color-primary-soft);
}

.note-copy h2 {
    color: var(--color-primary-deep);
}

.note-primary,
.note-primary.mood,
.note-primary.wish,
.note-primary.action,
.note-primary.album {
    min-height: 48px;
    background: var(--color-primary-deep);
    color: #FFFFFF;
}

.note-keepsake-grid {
    gap: 0;
}

.note-keepsake strong {
    color: var(--color-primary-deep);
}

.home-swipe-cue {
    bottom: 18px;
    background: rgba(255, 255, 255, 0.82);
    border-color: rgba(47, 23, 36, 0.1);
    touch-action: manipulation;
}

.home-swipe-cue strong,
.home-swipe-cue svg {
    color: var(--color-primary);
}

.home-pager-tabs {
    gap: 8px;
    padding: 4px;
    border-color: rgba(47, 23, 36, 0.08);
    background: rgba(255, 255, 255, 0.62);
}

.home-pager-tabs button {
    min-height: 46px;
    border-radius: 8px;
    color: #665862;
    touch-action: manipulation;
}

.home-pager-tabs button.active {
    background: var(--color-primary-deep);
    color: #FFFFFF;
}

.home-pager-progress {
    background: rgba(47, 23, 36, 0.08);
}

.home-pager-progress span {
    background: var(--color-primary);
}

.home-page-arrow {
    border-color: rgba(47, 23, 36, 0.1);
    background: rgba(255, 255, 255, 0.86);
    color: var(--color-primary-deep);
    touch-action: manipulation;
}

.home-mission-panel,
.home-launch-section,
.home-section {
    padding: 2px 0;
}

.home-mission-head h2,
.home-launch-head h2,
.home-section-head h2 {
    color: var(--color-primary-deep);
}

.home-focus-card,
.home-pinned-card,
.home-launch-card,
.home-feature-card {
    border-color: rgba(47, 23, 36, 0.08);
    background: rgba(255, 255, 255, 0.72);
    touch-action: manipulation;
}

.home-focus-card.study,
.home-pinned-card.study,
.home-launch-card.study,
.priority-card.study {
    background: linear-gradient(135deg, var(--color-primary-deep) 0%, var(--color-secondary-deep) 100%);
}

.home-pinned-grid {
    gap: 10px;
}

.home-command-stats.mission-stats {
    background: rgba(255, 255, 255, 0.64);
}

@media (max-width: 760px) {
    .home-page-arrow {
        display: none;
    }
}

/* ============================================
   首页 6.0.1 - 两屏首页、减字与底栏避让
   ============================================ */

.home-page {
    background:
        linear-gradient(180deg, #FBF7FA 0%, #F6F0F5 42%, #EEF5F0 100%),
        linear-gradient(128deg, rgba(181, 72, 104, 0.09), rgba(95, 120, 104, 0.08));
}

.app {
    padding-bottom: var(--page-bottom-inset);
}

.header {
    background: rgba(251, 247, 250, 0.96);
    border-bottom-color: rgba(51, 23, 36, 0.08);
}

.main {
    padding: 14px 18px var(--page-bottom-inset);
}

.relationship-home .home-pager-rail {
    height: clamp(560px, calc(100dvh - var(--bottom-nav-height) - 132px), 720px);
    min-height: 560px;
}

.home-command-panel {
    background:
        linear-gradient(180deg, rgba(255, 250, 253, 0.98) 0%, rgba(249, 238, 244, 0.94) 50%, rgba(229, 240, 232, 0.88) 100%);
}

.home-command-panel::after {
    bottom: 62px;
}

.home-swipe-cue {
    bottom: 28px;
}

.home-pager-tabs {
    position: relative;
    z-index: 2;
}

.care-slide {
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.64), rgba(255, 246, 250, 0.52) 46%, rgba(237, 245, 239, 0.58));
}

.care-slide .home-mission-panel {
    gap: 14px;
    padding: 4px;
}

.care-slide .home-mission-head {
    align-items: center;
}

.care-slide .home-mission-head h2,
.care-slide .home-launch-head h2 {
    font-family: var(--font-ui);
    font-size: 20px;
    line-height: 1.2;
    font-weight: 850;
}

.care-slide .home-mission-grid {
    display: grid;
    grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
    gap: 10px;
}

.care-slide .home-focus-card {
    min-height: 136px;
    padding: 16px;
    border: 0;
    background: var(--color-primary-deep);
    color: #FFFFFF;
}

.care-slide .home-focus-card small,
.care-slide .home-focus-card .focus-kicker {
    color: rgba(255, 255, 255, 0.72);
}

.care-slide .home-focus-card strong {
    max-width: 10em;
    color: #FFFFFF;
    font-size: 24px;
    line-height: 1.08;
}

.care-slide .focus-cta {
    background: rgba(255, 255, 255, 0.16);
    color: #FFFFFF;
}

.home-launch-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
}

.care-slide .home-launch-section {
    gap: 9px;
    padding: 10px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.54);
    border: 1px solid rgba(51, 23, 36, 0.06);
}

.care-slide .home-launch-head {
    align-items: center;
}

.care-slide .home-launch-card {
    min-height: 74px;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    text-align: center;
}

.care-slide .launch-mark {
    width: 30px;
    height: 30px;
    border-radius: 9px;
}

.care-slide .launch-title {
    width: 100%;
    font-size: 12px;
    line-height: 1.15;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.care-slide .home-launch-card strong {
    width: 100%;
    font-size: 10px;
    line-height: 1.1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (max-width: 430px) {
    .app {
        padding-bottom: var(--page-bottom-inset);
    }

    .main {
        padding: 12px 12px var(--page-bottom-inset);
    }

    .relationship-home .home-pager-rail {
        height: clamp(468px, calc(100dvh - var(--bottom-nav-height) - 124px), 560px);
        min-height: 468px;
    }

    .home-command-panel {
        padding: 16px 12px 14px;
    }

    .home-command-panel::after {
        display: none;
    }

    .home-command-main {
        gap: 10px;
    }

    .home-avatar-stack {
        margin-top: 0;
    }

    .home-couple-copy h1 {
        margin: 4px 0 0;
        font-size: 24px;
    }

    .home-couple-copy p,
    .note-copy > span,
    .note-copy p {
        display: none;
    }

    .home-days-block > span {
        font-size: 56px;
    }

    .home-days-thread {
        margin-top: 5px;
    }

    .home-relationship-note {
        gap: 8px;
        padding: 10px;
    }

    .note-copy h2 {
        margin: 0;
        font-size: 16px;
    }

    .note-primary {
        min-height: 40px;
    }

    .note-keepsake-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
        padding-top: 5px;
    }

    .note-keepsake {
        min-height: 38px;
        padding: 4px 5px;
        border-top: 0;
        border-left: 1px solid rgba(43, 23, 32, 0.08);
    }

    .note-keepsake:first-child {
        border-left: 0;
    }

    .note-keepsake span {
        font-size: 10px;
    }

    .note-keepsake strong {
        margin-top: 2px;
        font-size: 11px;
    }

    .home-swipe-cue {
        display: none;
    }

    .home-pager-tabs {
        min-height: 46px;
    }

    .home-pager-tabs button {
        min-height: 40px;
        font-size: 12px;
    }

    .care-slide .home-mission-panel {
        gap: 10px;
        padding: 2px;
    }

    .care-slide .home-mission-head h2,
    .care-slide .home-launch-head h2 {
        font-size: 18px;
    }

    .care-slide .home-mission-grid {
        grid-template-columns: 1fr;
        gap: 8px;
    }

    .care-slide .home-focus-card {
        min-height: 102px;
        padding: 13px;
    }

    .care-slide .home-focus-card strong {
        font-size: 20px;
    }

    .care-slide .home-focus-card small {
        display: none;
    }

    .home-launch-grid {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
    }

    .care-slide .home-launch-section {
        padding: 8px;
    }

    .care-slide .home-launch-card {
        min-height: 58px;
        padding: 6px 3px;
        gap: 3px;
    }

    .care-slide .launch-mark {
        width: 26px;
        height: 26px;
        font-size: 12px;
    }

    .care-slide .launch-title {
        font-size: 11px;
    }

    .care-slide .home-launch-card strong {
        display: none;
    }

}

@media (max-width: 360px) {
    .relationship-home .home-pager-rail {
        min-height: 456px;
    }

    .home-launch-grid {
        gap: 5px;
    }

    .care-slide .home-launch-card {
        min-height: 54px;
    }
}

/* ============================================
   7.0 单屏首页：430 × 932 设计画布整体缩放
   ============================================ */
.home-v7-shell {
    position: fixed;
    inset: 0;
    z-index: 20;
    display: grid;
    place-items: start center;
    overflow: hidden;
    background:
        radial-gradient(circle at 10% 4%, oklch(94% 0.055 12), transparent 31%),
        radial-gradient(circle at 92% 88%, oklch(91% 0.055 250), transparent 32%),
        oklch(95% 0.018 252);
}

.home-v7-stage-viewport {
    position: relative;
    flex: none;
}

.home-v7-stage {
    --v7-ink: oklch(30% 0.025 265);
    --v7-muted: oklch(54% 0.025 265);
    --v7-warm: #ff6475;
    --v7-cool: #5d8cff;
    --v7-blush: oklch(95% 0.045 12);
    --v7-sky: oklch(95% 0.045 250);
    --v7-mint: oklch(95% 0.055 166);
    --v7-lemon: oklch(96% 0.075 96);
    --v7-surface: oklch(99% 0.006 255);
    position: absolute;
    top: var(--home-stage-top, 44px);
    left: 0;
    width: 430px;
    height: 932px;
    overflow: hidden;
    color: var(--v7-ink);
    background:
        radial-gradient(circle at 9% 8%, oklch(96% 0.045 12), transparent 27%),
        radial-gradient(circle at 91% 34%, oklch(95% 0.04 250), transparent 30%),
        linear-gradient(165deg, oklch(99% 0.006 255), oklch(97% 0.018 252));
    transform: scale(var(--home-scale));
    transform-origin: top left;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    -webkit-font-smoothing: antialiased;
}

.home-v7-stage::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.72;
    background:
        radial-gradient(circle at 18% 60%, oklch(96% 0.035 340), transparent 24%),
        radial-gradient(circle at 86% 72%, oklch(96% 0.035 220), transparent 26%);
}

.home-v7-stage button {
    margin: 0;
    padding: 0;
    border: 0;
    color: inherit;
    font: inherit;
    background: none;
    -webkit-tap-highlight-color: transparent;
}

.home-v7-stage button:active {
    filter: brightness(0.97);
}

.home-v7-stage button:focus-visible {
    outline: 3px solid color-mix(in oklch, var(--v7-warm) 42%, transparent);
    outline-offset: 2px;
}

.v7-today-header {
    position: absolute;
    top: 29px;
    left: 24px;
    width: 382px;
    height: 39px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.v7-today-header h1 {
    margin: 0;
    font-size: 22px;
    line-height: 1;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.v7-mini-pair {
    position: relative;
    width: 54px;
    height: 38px;
    cursor: pointer;
}

.v7-mini-avatar {
    position: absolute;
    top: 3px;
    left: 2px;
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1.5px solid #fff;
    border-radius: 50%;
    color: oklch(42% 0.04 350);
    background: var(--v7-blush);
    box-shadow: 0 2px 6px oklch(42% 0.06 265 / 0.14);
    font-size: 12px;
}

.v7-mini-avatar.partner {
    left: 23px;
    background: var(--v7-sky);
}

.v7-mini-avatar img,
.v7-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.v7-mini-pair > i {
    position: absolute;
    top: 0;
    right: 0;
    width: 10px;
    height: 10px;
    border: 1.5px solid var(--v7-surface);
    border-radius: 50%;
    background: var(--v7-warm);
}

.v7-relationship {
    position: absolute;
    top: 80px;
    left: 24px;
    width: 382px;
    height: 90px;
}

.v7-person {
    position: absolute;
    top: 3px;
    z-index: 2;
}

.v7-person.user-person { left: 12px; }
.v7-person.partner-person { right: 12px; }

.v7-avatar {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 2.5px solid var(--v7-user-color);
    border-radius: 50%;
    color: #fff;
    background: linear-gradient(145deg, oklch(86% 0.075 12), oklch(70% 0.14 10));
    box-shadow: 0 4px 12px oklch(39% 0.06 265 / 0.15);
    font-size: 19px;
    font-weight: 700;
}

.partner-person .v7-avatar {
    border-color: var(--v7-partner-color);
    background: linear-gradient(145deg, oklch(86% 0.07 250), oklch(68% 0.13 252));
}

.v7-thread {
    --thread-warm: var(--v7-warm);
    --thread-cool: var(--v7-cool);
    position: absolute;
    top: 2px;
    left: 67px;
    width: 248px;
    height: 42px;
    z-index: 1;
    overflow: visible;
}

.v7-couple-copy {
    position: absolute;
    top: 57px;
    left: 70px;
    width: 242px;
    text-align: center;
}

.v7-couple-copy strong {
    display: block;
    font-size: 17px;
    line-height: 1.2;
    font-weight: 600;
    letter-spacing: 0.02em;
}

.v7-couple-copy em {
    margin: 0 5px;
    font-style: normal;
    font-weight: 400;
}

.v7-couple-copy span {
    display: block;
    margin-top: 6px;
    color: var(--v7-muted);
    font-size: 11px;
    line-height: 1;
    letter-spacing: 0.025em;
}

.v7-couple-copy .v7-days {
    display: inline;
    margin: 0 2px;
    color: var(--v7-warm);
    font-family: inherit;
    font-size: 17px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0;
}

.v7-hero {
    position: absolute;
    top: 181px;
    left: 22px;
    width: 386px;
    height: 242px;
    overflow: hidden;
    border-radius: 13px;
    background: oklch(86% 0.045 245);
    box-shadow: 0 7px 18px oklch(38% 0.045 260 / 0.13);
}

.v7-hero-photo,
.v7-hero-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.v7-hero-photo {
    object-fit: cover;
    object-position: center 42%;
}

.v7-hero-fallback {
    overflow: hidden;
    background:
        linear-gradient(145deg, var(--v7-blush), var(--v7-sky) 62%, var(--v7-mint));
}

.v7-empty-window {
    position: absolute;
    inset: 20px 20px 22px;
    overflow: hidden;
    border: 1px solid oklch(60% 0.045 250 / 0.2);
    border-radius: 7px;
    background:
        linear-gradient(90deg, transparent 49.5%, oklch(64% 0.035 250 / 0.14) 49.5% 50.5%, transparent 50.5%),
        linear-gradient(180deg, transparent 49.5%, oklch(64% 0.035 250 / 0.14) 49.5% 50.5%, transparent 50.5%),
        oklch(99% 0.006 255 / 0.62);
}

.v7-empty-window i {
    position: absolute;
    left: 54px;
    bottom: -18px;
    width: 150px;
    height: 92px;
    border-radius: 50% 50% 0 0;
    background: oklch(83% 0.075 166 / 0.5);
    transform: rotate(9deg);
}

.v7-empty-window i + i {
    right: 34px;
    left: auto;
    width: 125px;
    height: 112px;
    background: oklch(84% 0.075 16 / 0.48);
    transform: rotate(-13deg);
}

.v7-empty-photo-copy {
    position: absolute;
    inset: 0;
    display: grid;
    place-content: center;
    gap: 5px;
    color: oklch(42% 0.04 265);
    text-align: center;
}

.v7-empty-photo-copy span {
    font-family: "STKaiti", "KaiTi", serif;
    font-size: 18px;
}

.v7-empty-photo-copy small {
    color: var(--v7-muted);
    font-size: 11px;
}

.v7-hero-shade {
    position: absolute;
    inset: 0;
    background:
        linear-gradient(90deg, rgba(35, 27, 23, 0.12), transparent 44%),
        linear-gradient(0deg, rgba(35, 27, 23, 0.42), transparent 53%);
    pointer-events: none;
}

.v7-chat-stack {
    position: absolute;
    top: 70px;
    right: 10px;
    display: flex;
    flex-direction: column;
    width: 148px;
    align-items: stretch;
    gap: 7px;
}

.v7-message {
    position: relative;
    display: -webkit-box;
    max-width: 138px;
    align-self: flex-end;
    padding: 8px 12px;
    border-radius: 15px 15px 4px 15px;
    color: oklch(38% 0.06 12);
    background: oklch(96% 0.045 12 / 0.94);
    box-shadow: 0 2px 8px oklch(37% 0.05 265 / 0.1);
    font-size: 11px;
    line-height: 1;
    text-align: center;
    -webkit-box-orient: vertical;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    overflow-wrap: anywhere;
    overflow: hidden;
}

.v7-message::after {
    content: '';
    position: absolute;
    right: -5px;
    bottom: 1px;
    width: 10px;
    height: 10px;
    background: inherit;
    clip-path: polygon(0 0, 100% 100%, 0 72%);
}

.v7-message.partner-message {
    align-self: flex-end;
    border-radius: 15px 15px 15px 4px;
    color: oklch(38% 0.07 250);
    background: oklch(96% 0.045 250 / 0.94);
}

.v7-message.partner-message::after {
    right: -5px;
    left: auto;
    transform: none;
}

.v7-chat-stack button.v7-message {
    border: 0;
    cursor: pointer;
}

.v7-hero-quote {
    position: absolute;
    left: 24px;
    bottom: 24px;
    margin: 0;
    color: #fff;
    font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
    font-size: 18px;
    font-weight: 400;
    font-synthesis: none;
    line-height: 1.45;
    letter-spacing: 0.035em;
    text-shadow: 0 2px 7px oklch(22% 0.025 265 / 0.58);
    transform: rotate(-0.8deg);
}

.v7-replies {
    position: absolute;
    right: 9px;
    bottom: 9px;
    display: flex;
    gap: 7px;
}

.v7-replies button {
    width: 54px;
    height: 55px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: 1px solid rgba(255, 255, 255, 0.28);
    border-radius: 13px;
    color: #fff;
    background: rgba(37, 39, 39, 0.48);
    box-shadow: 0 4px 10px rgba(18, 17, 16, 0.16);
    backdrop-filter: blur(8px);
}

.v7-mood-egg {
    width: 24px;
    height: 24px;
    display: block;
    flex: 0 0 auto;
}

.v7-mood-egg--empty {
    width: 18px;
    height: 23px;
    border: 1.5px solid rgba(255, 255, 255, 0.92);
    border-radius: 50% 50% 46% 46% / 56% 56% 44% 44%;
    background: rgba(255, 255, 255, 0.16);
}

.v7-replies small {
    font-size: 8px;
    line-height: 1;
    white-space: nowrap;
}

.v7-life-title {
    position: absolute;
    top: 503px;
    left: 24px;
    margin: 0;
    font-size: 19px;
    line-height: 1;
    font-weight: 700;
}

.v7-life-grid {
    position: absolute;
    top: 535px;
    left: 22px;
    width: 386px;
    height: 309px;
}

.v7-life-card {
    position: absolute !important;
    overflow: hidden;
    border: 1px solid oklch(71% 0.04 255 / 0.14) !important;
    border-radius: 13px !important;
    text-align: left;
    box-shadow: 0 3px 7px oklch(40% 0.04 260 / 0.1);
    cursor: pointer;
}

.v7-life-card > strong {
    position: absolute;
    z-index: 3;
    top: 13px;
    left: 13px;
    font-size: 14px;
    line-height: 1;
    font-weight: 600;
    letter-spacing: 0.01em;
}

.v7-card-arrow {
    position: absolute;
    z-index: 3;
    right: 8px;
    bottom: 7px;
    color: oklch(38% 0.035 265);
}

.v7-card-icon {
    position: absolute;
    z-index: 2;
    color: oklch(54% 0.13 252);
}

.v7-life-card > small {
    position: absolute;
    z-index: 3;
    left: 13px;
    bottom: 12px;
    max-width: calc(100% - 34px);
    overflow: hidden;
    color: oklch(43% 0.025 265);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.mood-card {
    top: 0;
    left: 0;
    width: 150px;
    height: 94px;
    background:
        radial-gradient(circle at 12% 10%, #fff, transparent 34%),
        linear-gradient(135deg, var(--v7-blush), var(--v7-sky)) !important;
}

.v7-mood-orbits {
    position: absolute;
    top: 31px;
    left: 60px;
    width: 58px;
    height: 43px;
}

.v7-mood-orbits i {
    position: absolute;
    width: 38px;
    height: 38px;
    border: 1px solid color-mix(in oklch, var(--v7-warm) 60%, white);
    border-radius: 50%;
    background: color-mix(in oklch, var(--v7-warm) 46%, white);
}

.v7-mood-orbits i + i {
    left: 23px;
    border-color: color-mix(in oklch, var(--v7-cool) 58%, white);
    background: color-mix(in oklch, var(--v7-cool) 44%, white);
}

.album-card {
    top: 0;
    left: 160px;
    width: 112px;
    height: 102px;
    background: oklch(84% 0.075 245) !important;
    transform: rotate(-2deg);
}

.album-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(29,39,42,0.18));
}

.album-card img,
.v7-card-photo-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.v7-card-photo-fallback {
    display: grid;
    place-items: center;
    color: rgba(255,255,255,0.72);
    background: linear-gradient(150deg, oklch(86% 0.075 245), oklch(67% 0.1 250));
    padding: 12px;
    box-sizing: border-box;
    font: 400 15px/1.45 "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
    text-align: center;
}

.album-card > strong,
.album-card > b {
    color: #1b201f;
    text-shadow: 0 1px 3px rgba(255,255,255,0.7);
}

.study-card {
    top: 0;
    right: 0;
    width: 104px;
    height: 112px;
    background:
        linear-gradient(145deg, rgba(255,255,255,0.65), transparent 49%),
        var(--v7-lemon) !important;
    transform: rotate(1.5deg);
}

.study-card .v7-card-icon {
    top: 40px;
    right: 14px;
    color: oklch(55% 0.12 250);
}

.plan-card {
    top: 104px;
    left: 1px;
    width: 108px;
    height: 119px;
    overflow: visible;
    background: oklch(98% 0.02 250) !important;
    transform: rotate(-2.2deg);
}

.plan-card::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 8px;
    width: 90px;
    height: 116px;
    z-index: -1;
    border-radius: 9px;
    background: oklch(91% 0.04 250);
    box-shadow: 0 4px 8px oklch(40% 0.04 260 / 0.12);
    transform: rotate(4deg);
}

.v7-paperclip {
    position: absolute;
    top: -10px;
    left: 8px;
    width: 12px;
    height: 24px;
    z-index: 4;
    border: 2px solid oklch(61% 0.04 250);
    border-bottom: 0;
    border-radius: 8px 8px 0 0;
    transform: rotate(9deg);
}

.plan-card > strong {
    left: 28px;
}

.v7-calendar {
    position: absolute;
    top: 41px;
    left: 14px;
    width: 79px;
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px 2px;
}

.v7-calendar i {
    display: grid;
    place-items: center;
    color: oklch(59% 0.035 260);
    font-size: 5px;
    font-style: normal;
    line-height: 1;
}

.v7-calendar i.today {
    width: 10px;
    height: 10px;
    margin: -2px;
    border-radius: 50%;
    color: #fff;
    background: var(--v7-warm);
}

.v7-calendar i.blank {
    opacity: 0.32;
}

.plan-card > small {
    left: 14px;
    bottom: 10px;
}

.health-card {
    top: 112px;
    left: 119px;
    width: 164px;
    height: 79px;
    background:
        linear-gradient(110deg, rgba(255,255,255,.68), transparent 55%),
        var(--v7-mint) !important;
}

.v7-heartline {
    position: absolute;
    left: 12px;
    bottom: 16px;
    width: 140px;
    height: 34px;
    overflow: visible;
}

.v7-heartline path {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 2.3;
}

.v7-heartline .warm-line { stroke: var(--v7-warm); }
.v7-heartline .cool-line { stroke: var(--v7-cool); }

.health-card > small {
    left: 13px;
    bottom: 8px;
    max-width: 125px;
    font-size: 8px;
}

.express-card {
    top: 122px;
    right: 0;
    width: 94px;
    height: 72px;
    background:
        radial-gradient(circle at 100% 0, rgba(255,255,255,.62), transparent 42%),
        oklch(91% 0.09 55) !important;
    transform: rotate(2.2deg);
}

.express-card > strong { font-size: 13px; }

.express-card > small {
    left: 10px;
    bottom: 8px;
    max-width: 52px;
    font-size: 8px;
}

.v7-count {
    position: absolute;
    top: 9px;
    right: 8px;
    width: 20px;
    height: 20px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    color: #fff;
    background: var(--v7-warm);
    box-shadow: 0 2px 6px oklch(45% 0.13 15 / 0.24);
    font-size: 10px;
    font-style: normal;
}

.express-card .v7-card-icon {
    top: 33px;
    right: 9px;
    color: oklch(56% 0.13 55);
}

.express-card .v7-card-arrow { right: 5px; bottom: 5px; }

.cosmetics-card {
    top: 231px;
    left: 0;
    width: 116px;
    height: 78px;
    background:
        linear-gradient(145deg, rgba(255,255,255,.66), transparent 46%),
        var(--v7-blush) !important;
}

.cosmetics-card > strong {
    top: 10px;
    left: 10px;
    font-size: 11px;
}

.v7-cosmetic-days {
    position: absolute;
    left: 10px;
    bottom: 9px;
    color: oklch(42% 0.025 265);
    font-size: 10px;
}

.v7-cosmetic-days b {
    margin-right: 3px;
    color: var(--v7-warm);
    font-family: inherit;
    font-size: 24px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
}

.cosmetics-card .v7-card-icon {
    right: 12px;
    bottom: 14px;
    color: oklch(61% 0.16 15);
}

.cosmetics-card .v7-card-arrow { right: 6px; bottom: 5px; }

.budget-card {
    top: 201px;
    left: 122px;
    width: 118px;
    height: 108px;
    border-radius: 2px 2px 7px 7px !important;
    background: oklch(97% 0.025 250) !important;
    transform: rotate(-1deg);
}

.budget-card::before {
    content: '';
    position: absolute;
    top: -3px;
    left: 0;
    width: 100%;
    height: 6px;
    background: linear-gradient(135deg, transparent 3px, oklch(97% 0.025 250) 0) 0 0 / 8px 8px repeat-x;
}

.budget-card > strong { font-size: 13px; }

.v7-receipt-lines {
    position: absolute;
    top: 39px;
    left: 13px;
    right: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.v7-receipt-lines i {
    display: flex;
    justify-content: space-between;
    color: oklch(58% 0.025 265);
    font-size: 7px;
    font-style: normal;
}

.v7-receipt-lines em { font-style: normal; }
.v7-receipt-lines b { font-weight: 400; }

.v7-card-empty {
    position: absolute;
    top: 45px;
    left: 13px;
    color: oklch(58% 0.025 265);
    font-size: 8px;
}

.v7-barcode {
    position: absolute;
    left: 13px;
    bottom: 9px;
    width: 48px;
    height: 10px;
    opacity: 0.52;
    background: repeating-linear-gradient(90deg, #333 0 1px, transparent 1px 3px, #333 3px 5px, transparent 5px 6px);
}

.wish-card {
    top: 201px;
    right: 0;
    width: 136px;
    height: 108px;
    overflow: visible;
    background:
        linear-gradient(135deg, rgba(255,255,255,.52), transparent 46%),
        var(--v7-lemon) !important;
    transform: rotate(1.2deg);
}

.v7-pin {
    position: absolute;
    top: -9px;
    left: 70px;
    z-index: 5;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 28%, #fff, oklch(69% 0.19 17) 68%, oklch(53% 0.17 12));
    box-shadow: 1px 3px 5px oklch(38% 0.06 265 / 0.24);
}

.v7-wish-copy {
    position: absolute;
    top: 41px;
    left: 18px;
    color: oklch(38% 0.045 265);
    font-family: "Ma Shan Zheng", "STKaiti", "KaiTi", serif;
    font-size: 14px;
    font-weight: 400;
    font-synthesis: none;
    line-height: 1.38;
    letter-spacing: 0.035em;
    transform: rotate(-1.2deg);
    white-space: pre-line;
}

.v7-wish-heart {
    position: absolute;
    right: 23px;
    bottom: 10px;
    font-family: Georgia, serif;
    font-size: 20px;
}

.v7-message-overlay {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: grid;
    place-items: end center;
    padding: 24px 18px calc(24px + env(safe-area-inset-bottom, 0px));
    box-sizing: border-box;
    background: oklch(22% 0.035 265 / 0.42);
    backdrop-filter: blur(5px);
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
}

.v7-message-dialog {
    width: min(100%, 396px);
    padding: 20px;
    border-radius: 16px;
    color: oklch(29% 0.03 265);
    background:
        radial-gradient(circle at 100% 0, oklch(95% 0.055 250), transparent 38%),
        radial-gradient(circle at 0 100%, oklch(95% 0.055 12), transparent 42%),
        oklch(99% 0.006 255);
    box-shadow: 0 12px 32px oklch(20% 0.035 265 / 0.28);
    box-sizing: border-box;
}

.v7-message-dialog header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.v7-message-dialog h2 {
    margin: 0;
    font-size: 19px;
    line-height: 1.25;
    font-weight: 700;
}

.v7-message-dialog header p {
    margin: 6px 0 0;
    color: oklch(49% 0.035 265);
    font-size: 12px;
}

.v7-message-dialog header > button {
    width: 34px;
    height: 34px;
    display: grid;
    flex: none;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: oklch(43% 0.035 265);
    background: oklch(94% 0.02 250);
}

.v7-message-dialog textarea {
    width: 100%;
    min-height: 104px;
    margin-top: 18px;
    padding: 13px 14px;
    resize: none;
    border: 1px solid oklch(70% 0.05 250 / 0.28);
    border-radius: 12px;
    outline: 0;
    color: oklch(29% 0.03 265);
    background: oklch(99% 0.004 255 / 0.92);
    box-sizing: border-box;
    font: 15px/1.6 "Ma Shan Zheng", "PingFang SC", sans-serif;
}

.v7-message-dialog textarea::placeholder { color: oklch(54% 0.035 265); }

.v7-message-dialog textarea:focus {
    border-color: #5d8cff;
    outline: 3px solid color-mix(in oklch, #5d8cff 20%, transparent);
}

.v7-message-count {
    margin-top: 5px;
    color: oklch(51% 0.03 265);
    font-size: 11px;
    text-align: right;
}

.v7-message-dialog footer {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 10px;
    margin-top: 15px;
}

.v7-message-dialog footer button {
    min-height: 46px;
    border: 0;
    border-radius: 12px;
    font: 600 14px/1 inherit;
}

.v7-message-dialog footer .secondary {
    color: oklch(42% 0.035 265);
    background: oklch(93% 0.025 250);
}

.v7-message-dialog footer .primary {
    color: #fff;
    background: #ff6475;
}

.v7-message-dialog footer .primary:disabled { opacity: 0.58; }

.v7-dialog-enter-active,
.v7-dialog-leave-active {
    transition: opacity 180ms ease-out;
}

.v7-dialog-enter-active .v7-message-dialog,
.v7-dialog-leave-active .v7-message-dialog {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 180ms ease-out;
}

.v7-dialog-enter-from,
.v7-dialog-leave-to { opacity: 0; }

.v7-dialog-enter-from .v7-message-dialog,
.v7-dialog-leave-to .v7-message-dialog {
    opacity: 0;
    transform: translateY(18px);
}

/* 7.0.4 首页：参考稿固定画布与材质层。全部坐标以 430 × 932 为唯一构图基准。 */
.home-v7-shell {
    background:
        radial-gradient(circle at 5% 2%, rgba(255, 219, 227, 0.78), transparent 33%),
        radial-gradient(circle at 97% 92%, rgba(217, 232, 255, 0.86), transparent 36%),
        #f7f9fc;
}

.home-v7-stage {
    --v7-ink: #24272e;
    --v7-muted: #777d89;
    --v7-warm: #ff6a72;
    --v7-cool: #648fff;
    --v7-blush: #fff0f2;
    --v7-sky: #eef5ff;
    --v7-mint: #e8fbf3;
    --v7-lemon: #fff8c7;
    --v7-surface: #fbfcfe;
    top: 0;
    background:
        radial-gradient(ellipse 70% 42% at -7% 6%, rgba(255, 218, 227, 0.77), transparent 72%),
        radial-gradient(ellipse 72% 48% at 106% 85%, rgba(214, 231, 255, 0.88), transparent 73%),
        linear-gradient(155deg, #fffafb 0%, #fbfcff 45%, #f4f9ff 100%);
}

.home-v7-stage::before {
    opacity: 0.72;
    background:
        radial-gradient(circle at 86% 31%, rgba(222, 236, 255, 0.44), transparent 25%),
        radial-gradient(circle at 15% 67%, rgba(255, 226, 237, 0.38), transparent 27%);
}

.v7-today-header {
    top: 61px;
    left: 25px;
    width: 380px;
    height: 36px;
}

.v7-today-header h1 {
    font-size: 22px;
    font-weight: 650;
    letter-spacing: 0;
}

.v7-mini-pair {
    position: relative;
    width: 52px;
    height: 36px;
}

.v7-mini-pair::before {
    content: '';
    position: absolute;
    inset: -4px 0;
}

.v7-mini-avatar {
    width: 30px;
    height: 30px;
    border-width: 1.5px;
}

.v7-mini-avatar.partner { left: 22px; }
.v7-mini-pair > i { right: 1px; }

.v7-relationship {
    top: 107px;
    left: 25px;
    width: 380px;
    height: 82px;
}

.v7-person { top: 0; }
.v7-person.user-person { left: 7px; }
.v7-person.partner-person { right: 7px; }

.v7-avatar {
    width: 61px;
    height: 61px;
    border-width: 2px;
    box-shadow: 0 5px 14px rgba(46, 56, 74, 0.13);
}

.v7-thread {
    top: 9px;
    left: 65px;
    width: 250px;
    height: 42px;
}

.v7-couple-copy {
    top: 49px;
    left: 60px;
    width: 260px;
}

.v7-couple-copy strong {
    font-size: 17px;
    font-weight: 620;
}

.v7-couple-copy > span {
    margin-top: 6px;
    font-size: 10px;
    letter-spacing: 0.01em;
}

.v7-days {
    color: var(--v7-cool);
    font-size: 14px;
}

.v7-hero {
    top: 203px;
    left: 24px;
    width: 382px;
    height: 236px;
    border: 1px solid rgba(89, 102, 126, 0.12);
    border-radius: 13px;
    background: rgba(248, 250, 253, 0.76);
    box-shadow: 0 7px 20px rgba(67, 78, 99, 0.10);
}

.v7-hero-photo,
.v7-hero-fallback { border-radius: inherit; }

.v7-hero-fallback {
    background:
        linear-gradient(rgba(107, 124, 151, 0.12) 1px, transparent 1px) 50% 50% / 100% 50%,
        linear-gradient(90deg, rgba(107, 124, 151, 0.12) 1px, transparent 1px) 50% 50% / 50% 100%,
        rgba(249, 251, 254, 0.86);
}

.v7-empty-window { opacity: 0.82; }

.v7-chat-stack {
    top: 58px;
    right: 10px;
    width: 132px;
    gap: 6px;
}

.v7-message {
    min-height: 30px;
    max-width: 124px;
    padding: 8px 12px;
    border-radius: 16px 16px 5px 16px;
    background: rgba(255, 239, 242, 0.94);
    font: 400 10.5px/1.25 var(--font-ui, "PingFang SC", "Microsoft YaHei", sans-serif);
    letter-spacing: 0;
}

.v7-chat-stack button.v7-message {
    color: color-mix(in srgb, var(--v7-user-color) 72%, #262a31);
    background: rgba(255, 239, 242, 0.94);
    font: 400 10.5px/1.25 var(--font-ui, "PingFang SC", "Microsoft YaHei", sans-serif);
    letter-spacing: 0;
}

.v7-chat-stack button.v7-message::before {
    content: '';
    position: absolute;
    inset: -7px -3px;
}

.v7-message.partner-message {
    border-radius: 16px 16px 16px 5px;
    background: rgba(237, 246, 255, 0.94);
}

.v7-hero-quote {
    left: 23px;
    bottom: 19px;
    font-size: 18px;
    line-height: 1.52;
    letter-spacing: 0.04em;
    transform: rotate(-0.45deg);
}

.v7-replies {
    right: 9px;
    bottom: 9px;
    gap: 6px;
}

.v7-replies button {
    width: 53px;
    height: 52px;
    gap: 3px;
    border-radius: 12px;
    background: rgba(44, 48, 55, 0.48);
    box-shadow: 0 5px 12px rgba(27, 31, 39, 0.18);
}

.v7-mood-egg {
    width: 23px;
    height: 23px;
}

.v7-mood-egg--empty {
    width: 17px;
    height: 22px;
    border-color: rgba(255, 255, 255, 0.92);
    background: rgba(255, 255, 255, 0.16);
}

.v7-replies small { font-size: 7.5px; }

.v7-life-title {
    top: 459px;
    left: 25px;
    font-size: 19px;
    font-weight: 720;
}

.v7-life-grid {
    top: 490px;
    left: 24px;
    width: 382px;
    height: 361px;
}

.v7-life-card {
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow:
        0 3px 7px rgba(62, 75, 96, 0.08),
        0 10px 20px rgba(62, 75, 96, 0.045);
    isolation: isolate;
}

.v7-life-card::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.31;
    background-image:
        repeating-linear-gradient(7deg, rgba(72, 82, 99, 0.035) 0 1px, transparent 1px 5px),
        radial-gradient(circle at 18% 20%, rgba(255, 255, 255, 0.76), transparent 36%);
    mix-blend-mode: multiply;
}

.v7-life-card > strong {
    top: 12px;
    left: 12px;
    font-size: 14px;
    font-weight: 650;
}

.v7-life-card > small {
    left: 12px;
    bottom: 10px;
    font-size: 9px;
}

.v7-card-arrow {
    right: 7px;
    bottom: 7px;
    width: 15px;
    height: 15px;
}

.v7-object {
    position: absolute;
    z-index: 2;
    display: block;
    object-fit: contain;
    pointer-events: none;
    user-select: none;
}

.mood-card {
    top: 0;
    left: 0;
    width: 153px;
    height: 96px;
    border: 1px solid rgba(255, 143, 153, 0.18) !important;
    border-radius: 15px !important;
    background:
        radial-gradient(circle at 11% 8%, rgba(255,255,255,0.82), transparent 38%),
        linear-gradient(132deg, #fff1f3, #edf4ff) !important;
}

.v7-mood-orbits {
    top: 30px;
    left: 59px;
    width: 61px;
    height: 43px;
}

.v7-mood-orbits i {
    width: 40px;
    height: 40px;
    border-color: rgba(255, 106, 114, 0.56);
    background: rgba(255, 171, 177, 0.60);
}

.v7-mood-orbits i + i {
    left: 24px;
    border-color: rgba(100, 143, 255, 0.56);
    background: rgba(157, 190, 255, 0.58);
}

.album-card {
    top: -3px;
    left: 164px;
    width: 108px;
    height: 112px;
    border: 0 !important;
    border-radius: 14px 14px 12px 12px !important;
    transform: rotate(-1.8deg);
}

.album-card::after {
    z-index: 1;
    opacity: 1;
    background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(22,31,43,0.16));
    mix-blend-mode: normal;
}

.study-card {
    top: 0;
    right: 0;
    width: 101px;
    height: 120px;
    border: 1px solid rgba(117, 125, 137, 0.12) !important;
    border-radius: 13px 27px 13px 7px !important;
    background:
        linear-gradient(143deg, rgba(255,255,255,0.96), rgba(250, 248, 244, 0.90)) !important;
    transform: rotate(1.3deg);
}

.study-card > small {
    max-width: 66px;
    bottom: 8px;
}

.v7-study-books {
    right: 8px;
    bottom: 18px;
    width: 78px;
    height: 69px;
}

.plan-card {
    top: 107px;
    left: 2px;
    width: 108px;
    height: 132px;
    border: 0 !important;
    overflow: visible;
    border-radius: 2px 2px 5px 5px !important;
    background: #fffefd !important;
    transform: rotate(-1.7deg);
}

.plan-card::before {
    top: -5px;
    left: 7px;
    width: 94px;
    height: 130px;
    border: 1px solid rgba(107, 125, 151, 0.12);
    border-radius: 2px;
    background: #e9f1fc;
    box-shadow: 0 4px 9px rgba(69, 83, 104, 0.11);
    transform: rotate(3.6deg);
}

.plan-card::after {
    inset: 0;
    border-radius: inherit;
    opacity: 0.30;
}

.v7-paperclip {
    top: -11px;
    left: 7px;
    width: 24px;
    height: 37px;
    z-index: 5;
    border: 0;
    border-radius: 0;
    transform: rotate(-3deg);
}

.plan-card > strong { left: 27px; }

.v7-calendar {
    top: 43px;
    left: 13px;
    width: 79px;
    gap: 4px 2px;
}

.plan-card > small { bottom: 8px; }

.health-card {
    top: 118px;
    left: 119px;
    width: 166px;
    height: 90px;
    border: 1px solid rgba(100, 142, 129, 0.10) !important;
    border-radius: 11px !important;
    background:
        linear-gradient(110deg, rgba(255,255,255,0.72), transparent 58%),
        #e8faf2 !important;
}

.v7-heartline {
    left: 12px;
    bottom: 18px;
    width: 143px;
}

.health-card > small { bottom: 6px; }

.express-card {
    top: 130px;
    right: 0;
    width: 92px;
    height: 84px;
    border: 1px solid rgba(84, 160, 132, 0.12) !important;
    border-radius: 13px 13px 17px 12px !important;
    background:
        radial-gradient(circle at 100% 0, rgba(255,255,255,0.74), transparent 46%),
        #e5f8ef !important;
    transform: rotate(1.5deg);
}

.express-card > strong {
    top: 11px;
    left: 10px;
    font-size: 12px;
}

.v7-count {
    top: 7px;
    right: 7px;
    width: 19px;
    height: 19px;
}

.v7-parcel-box {
    right: 6px;
    bottom: 8px;
    width: 49px;
    height: 46px;
}

.express-card > small {
    left: 9px;
    bottom: 8px;
    max-width: 43px;
    font-size: 7.5px;
}

.cosmetics-card {
    top: 248px;
    left: 0;
    width: 112px;
    height: 112px;
    border: 1px solid rgba(217, 139, 148, 0.11) !important;
    border-radius: 11px 11px 5px 5px !important;
    background:
        linear-gradient(145deg, rgba(255,255,255,0.72), transparent 47%),
        #fff0f2 !important;
}

.cosmetics-card > strong {
    top: 10px;
    left: 10px;
    font-size: 10.5px;
}

.v7-cosmetic-days {
    top: 31px;
    bottom: auto;
    left: 10px;
    z-index: 3;
    font-size: 10px;
}

.v7-cosmetic-days b {
    margin-right: 3px;
    font-size: 23px;
}

.v7-cosmetics-set {
    right: 4px;
    bottom: 0;
    width: 89px;
    height: 80px;
}

.budget-card {
    top: 222px;
    left: 120px;
    width: 119px;
    height: 134px;
    border: 0 !important;
    border-radius: 2px 2px 6px 6px !important;
    background: #f9fafc !important;
    transform: rotate(-0.65deg);
}

.budget-card::after { opacity: 0.24; }

.budget-card > strong {
    top: 13px;
    font-size: 13px;
}

.v7-receipt-lines {
    top: 42px;
    gap: 8px;
}

.v7-barcode {
    bottom: 10px;
    width: 51px;
}

.wish-card {
    top: 228px;
    right: 0;
    width: 134px;
    height: 126px;
    border: 1px solid rgba(137, 125, 194, 0.11) !important;
    border-radius: 4px 5px 3px 4px !important;
    background:
        linear-gradient(142deg, rgba(255,255,255,0.62), transparent 48%),
        #f1edff !important;
    transform: rotate(1deg);
}

.v7-pin {
    top: -14px;
    left: 68px;
    z-index: 5;
    width: 30px;
    height: 30px;
    border-radius: 0;
    background: none;
    box-shadow: none;
}

.v7-wish-copy {
    top: 44px;
    left: 16px;
    color: #5b80e7;
    font-size: 14px;
    line-height: 1.42;
    transform: rotate(-1deg);
}

.v7-wish-heart {
    right: 23px;
    bottom: 8px;
    color: #668df3;
}

@media (prefers-reduced-motion: reduce) {
    .home-v7-stage *,
    .home-v7-stage *::before,
    .home-v7-stage *::after {
        scroll-behavior: auto !important;
        transition: none !important;
        animation: none !important;
    }

    .v7-dialog-enter-active,
    .v7-dialog-leave-active,
    .v7-dialog-enter-active .v7-message-dialog,
    .v7-dialog-leave-active .v7-message-dialog {
        transition: opacity 1ms linear !important;
    }
}
/* ============================================
   8.0 目标站首页：唯一视觉合同
   ============================================ */
.home-pop-shell {
    --gf-ink: #20202a;
    --gf-yellow: #ffd94a;
    --gf-orange: #ff8b4a;
    --gf-pink: #ff7fa5;
    --gf-blue: #58c8f5;
    --gf-mint: #75dfc1;
    --gf-cream: #fff8df;
    position: relative;
    z-index: var(--fellow-z-raised);
    width: min(100%, 460px);
    height: 100dvh;
    min-height: 640px;
    margin: 0 auto;
    overflow: hidden;
    color: var(--gf-ink);
    background:
        radial-gradient(circle at 12% 15%, rgba(255, 255, 255, 0.58) 0 42px, transparent 43px),
        linear-gradient(165deg, #6ed7f7 0 19%, #c8f6e8 19% 43%, #fff2a9 43% 100%);
}

.home-page:has(.home-pop-shell) {
    padding-bottom: 0 !important;
}

:global(html:has(.home-pop-shell)),
:global(body:has(.home-pop-shell)) {
    scrollbar-width: none;
}

.pop-home {
    width: 100%;
    height: 100%;
    overflow: auto;
    color: var(--gf-ink);
    scrollbar-width: none;
    overscroll-behavior: contain;
}

.pop-home::-webkit-scrollbar {
    display: none;
}

.pop-home-page {
    position: relative;
    min-height: 100%;
    padding: max(18px, env(safe-area-inset-top)) 15px max(14px, env(safe-area-inset-bottom));
    overflow: hidden;
}

.pop-home-page::before,
.pop-home-page::after {
    content: '';
    position: absolute;
    z-index: 0;
    border: 3px solid var(--gf-ink);
    border-radius: 50%;
    pointer-events: none;
}

.pop-home-page::before {
    top: 74px;
    left: -48px;
    width: 86px;
    height: 86px;
    background: rgba(255, 255, 255, 0.22);
}

.pop-home-page::after {
    top: 110px;
    right: -23px;
    width: 52px;
    height: 52px;
    background: var(--gf-yellow);
}

.pop-home-page > * {
    position: relative;
    z-index: 1;
}

.pop-home button {
    margin: 0;
    border: 0;
    color: inherit;
    background: none;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.pop-home button:focus-visible {
    outline: 3px solid #215f8f;
    outline-offset: 3px;
}

.pop-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 42px;
    margin-bottom: 11px;
}

.pop-brand {
    display: flex;
    align-items: center;
    gap: 9px;
}

.pop-brand > i {
    position: relative;
    width: 38px;
    height: 35px;
    border: 2.5px solid var(--gf-ink);
    border-radius: 49% 51% 44% 56%;
    background: var(--gf-yellow);
    box-shadow: 3px 3px 0 var(--gf-ink);
    transform: rotate(-7deg);
}

.pop-brand > i::before,
.pop-brand > i::after {
    content: '';
    position: absolute;
    top: 10px;
    width: 6px;
    height: 8px;
    border-radius: 50%;
    background: var(--gf-ink);
}

.pop-brand > i::before { left: 9px; }
.pop-brand > i::after { right: 8px; }

.pop-brand span {
    display: flex;
    flex-direction: column;
    line-height: 1;
}

.pop-brand b {
    font-size: 20px;
    font-weight: 950;
    letter-spacing: -0.05em;
}

.pop-brand small {
    margin-top: 5px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.12em;
}

.pop-profile-pair {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 72px;
    min-height: var(--fellow-touch-target-min);
    padding: var(--fellow-space-1);
    border: 2.5px solid var(--gf-ink);
    border-radius: var(--fellow-radius-pill);
    background: #fff;
    box-shadow: var(--fellow-shadow-soft);
}

.pop-profile-pair::after {
    content: '';
    position: absolute;
    inset: -4px;
}

.pop-top-avatar {
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    overflow: hidden;
    border: 2px solid var(--gf-ink);
    border-radius: 50%;
    background: var(--gf-blue);
    font-size: 12px;
    font-weight: 900;
}

.pop-top-avatar + .pop-top-avatar {
    margin-left: -8px;
    background: var(--gf-pink);
}

.pop-top-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pop-top-avatar b {
    font-size: 12px;
    line-height: 1;
}

.pop-profile-pair > i {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 8px;
    border: 2px solid var(--gf-ink);
    border-radius: 50%;
    background: #ff4b5f;
}

.pop-couple-card {
    position: relative;
    display: grid;
    grid-template-columns: minmax(84px, 1fr) minmax(68px, 0.72fr) minmax(84px, 1fr);
    align-items: center;
    gap: var(--fellow-space-1);
    min-height: 204px;
    padding: var(--fellow-space-4) var(--fellow-space-3) var(--fellow-space-8);
    border: 3px solid var(--gf-ink);
    border-radius: var(--fellow-radius-sheet);
    background:
        radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.75) 0 5px, transparent 6px),
        linear-gradient(135deg, #fff 0 58%, #fff6be 58% 100%);
    box-shadow: var(--fellow-shadow-raised);
}

.pop-couple-card::after {
    content: '';
    position: absolute;
    bottom: -14px;
    left: 48%;
    width: 22px;
    height: 22px;
    border: 0 solid var(--gf-ink);
    border-width: 0 3px 3px 0;
    background: #fff6be;
    transform: rotate(45deg);
}

.pop-person {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--fellow-space-1);
    min-width: 0;
}

.pop-avatar-link {
    display: grid;
    width: 80px;
    height: 80px;
    place-items: center;
}

.pop-avatar {
    display: grid;
    width: 72px;
    height: 72px;
    place-items: center;
    overflow: hidden;
    border: 3px solid var(--gf-ink);
    border-radius: 47% 53% 45% 55%;
    background: var(--gf-blue);
    box-shadow: 3px 4px 0 var(--gf-ink);
    transform: rotate(-3deg);
}

.pop-avatar--partner {
    background: var(--gf-pink);
    transform: rotate(3deg);
}

.pop-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.pop-avatar > b {
    font-size: 24px;
    font-weight: 950;
    line-height: 1;
}

.pop-person > strong {
    max-width: 100%;
    overflow: hidden;
    font-size: 11px;
    font-weight: 950;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pop-avatar-mood {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--fellow-space-1);
    min-width: 84px;
    min-height: var(--fellow-touch-target-min);
    padding: var(--fellow-space-1) var(--fellow-space-2);
    border: 2px solid var(--gf-ink);
    border-radius: var(--fellow-radius-pill);
    background: #fff;
    box-shadow: 2px 2px 0 var(--gf-ink);
}

.pop-avatar-mood small {
    max-width: 48px;
    overflow: hidden;
    font-size: 10px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pop-avatar-mood .mood-egg {
    width: 30px;
    height: 28px;
    border-width: 2px;
    box-shadow: inset -3px -3px rgba(255, 255, 255, 0.22);
}

.pop-avatar-mood .mood-egg.mood-empty,
.pop-avatar-mood .mood-egg.mood-loading {
    box-shadow: none;
}

.pop-avatar-mood .egg-shine {
    top: 4px;
    left: 5px;
    width: 7px;
    height: 4px;
}

.pop-avatar-mood .egg-eye {
    top: 11px;
    width: 3px;
    height: 4px;
}

.pop-avatar-mood .egg-eye.left { left: 9px; }
.pop-avatar-mood .egg-eye.right { right: 8px; }

.pop-avatar-mood .egg-mouth {
    top: 18px;
    width: 8px;
    height: 4px;
    border-width: 1.5px;
    border-top: 0;
}

.pop-connection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
}

.pop-connection > i {
    position: relative;
    width: 44px;
    height: 24px;
}

.pop-connection > i::before,
.pop-connection > i::after {
    content: '';
    position: absolute;
    top: 1px;
    width: 22px;
    height: 22px;
    box-sizing: border-box;
    border: 2px solid var(--gf-ink);
    border-radius: 50%;
}

.pop-connection > i::before {
    left: 2px;
    background: var(--gf-blue);
}

.pop-connection > i::after {
    right: 2px;
    background: var(--gf-pink);
}

.pop-connection b {
    max-width: 100%;
    margin-top: var(--fellow-space-2);
    overflow: hidden;
    font-size: 18px;
    font-weight: 950;
    line-height: 1;
    letter-spacing: -0.03em;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pop-connection span {
    margin-top: var(--fellow-space-1);
    font-size: 10px;
    font-weight: 950;
    white-space: nowrap;
}

.pop-connection small {
    margin-top: var(--fellow-space-2);
    color: #6c6973;
    font-size: 10px;
    font-weight: 800;
    white-space: nowrap;
}

.pop-couple-card > p {
    position: absolute;
    right: 17px;
    bottom: 8px;
    margin: 0;
    font-size: 11px;
    font-weight: 900;
}

.mood-egg {
    --egg: #ff91ad;
    position: relative;
    display: inline-block;
    flex: none;
    width: 76px;
    height: 68px;
    border: 3px solid var(--gf-ink);
    border-radius: 52% 48% 46% 54% / 58% 58% 42% 42%;
    background: var(--egg);
    box-shadow: inset -8px -7px rgba(255, 255, 255, 0.22), 3px 4px rgba(32, 32, 42, 0.17);
    transform: rotate(-3deg);
}

.mood-egg.mood-soft { --egg: #75dfc1; transform: rotate(2deg); }
.mood-egg.mood-party { --egg: #ffd94a; transform: rotate(-7deg); }
.mood-egg.mood-tired { --egg: #90b9ed; transform: rotate(5deg) scaleY(0.9); }
.mood-egg.mood-hug { --egg: #cba8ff; transform: rotate(-2deg); }
.mood-egg.mood-empty { --egg: #fff; border-style: dashed; box-shadow: 3px 4px rgba(32, 32, 42, 0.12); }
.mood-egg.mood-loading { --egg: #ece8e2; box-shadow: none; }
.mood-egg.mood-empty :is(.egg-shine, .egg-eye, .egg-mouth) { display: none; }
.mood-egg.mood-loading :is(.egg-shine, .egg-eye, .egg-mouth) { display: none; }

.egg-shine {
    position: absolute;
    top: 10px;
    left: 13px;
    width: 14px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
    transform: rotate(-25deg);
}

.egg-eye {
    position: absolute;
    top: 29px;
    width: 6px;
    height: 8px;
    border-radius: 50%;
    background: var(--gf-ink);
}

.egg-eye.left { left: 23px; }
.egg-eye.right { right: 22px; }

.egg-mouth {
    position: absolute;
    top: 43px;
    left: 50%;
    width: 13px;
    height: 7px;
    border: 2px solid var(--gf-ink);
    border-top: 0;
    border-radius: 0 0 12px 12px;
    transform: translateX(-50%);
}

.pop-section-title {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin: 21px 2px 9px;
}

.pop-section-title div {
    display: flex;
    flex-direction: column;
}

.pop-section-title small {
    color: #ee5d75;
    font-size: 10px;
    font-weight: 950;
    letter-spacing: 0.14em;
}

.pop-section-title h1 {
    margin: 2px 0 0;
    font-size: 22px;
    font-weight: 950;
    letter-spacing: -0.05em;
}

.pop-sync-state {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin: 0 0 9px;
    padding: 7px 9px;
    border: 2px solid var(--gf-ink);
    border-radius: 12px;
    background: #fff;
    box-shadow: 2px 3px 0 var(--gf-ink);
    font-size: 11px;
    font-weight: 900;
}

.pop-sync-state button {
    min-height: var(--fellow-touch-target-min);
    padding: 4px 9px;
    border: 2px solid var(--gf-ink);
    border-radius: 16px;
    background: var(--gf-yellow);
    font-size: 10px;
    font-weight: 950;
}

.pop-feature-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.pop-feature {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
    min-height: 104px;
    padding: 9px 8px 8px;
    overflow: hidden;
    border: 2.5px solid var(--gf-ink) !important;
    border-radius: 14px;
    background: #fff;
    box-shadow: 3px 4px 0 var(--gf-ink) !important;
    color: var(--gf-ink);
    text-align: left;
    transition: transform 140ms ease, box-shadow 140ms ease;
}

.pop-feature:active {
    box-shadow: none !important;
    transform: translate(3px, 4px);
}

.pop-feature-1 { background: #ffd9e3; }
.pop-feature-2 { background: #dff7ff; }
.pop-feature-3 { background: #fff1a9; }
.pop-feature-4 { background: #e5dcff; }
.pop-feature-5 { background: #d7f6e7; }
.pop-feature-6 { background: #ffe4bf; }
.pop-feature-7 { background: #ffdce8; }
.pop-feature-8 { background: #dbe6ff; }
.pop-feature-9 { background: #fff0b9; }

.pop-feature-art {
    position: relative;
    display: block;
    width: 100%;
    height: 44px;
}

.brand-glyph {
    position: relative;
    display: inline-block;
    flex: none;
    width: 39px;
    height: 39px;
}

.brand-glyph i,
.brand-glyph b,
.brand-glyph em {
    position: absolute;
    display: block;
    box-sizing: border-box;
    border: 2.5px solid var(--gf-ink);
}

.pop-feature-art .brand-glyph {
    transform: scale(0.92);
    transform-origin: 0 0;
}

.glyph-mood i { inset: 4px; border-radius: 55% 45% 52% 48%; background: var(--gf-pink); transform: rotate(-8deg); }
.glyph-mood b { top: 15px; left: 13px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink); }
.glyph-mood em { top: 15px; right: 12px; width: 5px; height: 7px; border-radius: 50%; background: var(--gf-ink); }
.glyph-album i { inset: 5px 2px 6px 5px; border-radius: 7px; background: var(--gf-blue); transform: rotate(-5deg); }
.glyph-album b { right: 3px; bottom: 4px; width: 19px; height: 15px; border-radius: 5px; background: var(--gf-yellow); transform: rotate(7deg); }
.glyph-album em { top: 11px; left: 11px; width: 7px; height: 7px; border-radius: 50%; background: #fff; }
.glyph-study i { inset: 4px 5px; border-radius: 4px 11px 4px 8px; background: #fff; }
.glyph-study b { top: 5px; right: 6px; width: 8px; height: 28px; background: var(--gf-orange); transform: rotate(14deg); }
.glyph-study em { bottom: 9px; left: 8px; width: 22px; height: 5px; background: var(--gf-blue); }
.glyph-plan i { top: 7px; left: 3px; width: 32px; height: 28px; border-radius: 7px; background: #fff; }
.glyph-plan b { top: 2px; left: 10px; width: 7px; height: 11px; border-radius: 4px; background: var(--gf-pink); }
.glyph-plan em { right: 7px; bottom: 10px; width: 15px; height: 8px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }
.glyph-health i { top: 3px; left: 7px; width: 24px; height: 32px; border-radius: 14px 14px 7px 7px; background: var(--gf-mint); }
.glyph-health b { top: 10px; left: 16px; width: 6px; height: 19px; border: 0; background: #fff; }
.glyph-health em { top: 16px; left: 10px; width: 19px; height: 6px; border: 0; background: #fff; }
.glyph-parcel i { inset: 7px 3px 3px; background: var(--gf-yellow); transform: rotate(-3deg); }
.glyph-parcel b { top: 4px; left: 15px; width: 8px; height: 30px; background: var(--gf-orange); }
.glyph-parcel em { top: 13px; left: 8px; width: 23px; height: 3px; border: 0; background: var(--gf-ink); }
.glyph-cosmetics i { top: 7px; left: 9px; width: 20px; height: 29px; border-radius: 8px 8px 5px 5px; background: var(--gf-pink); }
.glyph-cosmetics b { top: 1px; left: 12px; width: 14px; height: 8px; border-radius: 4px; background: var(--gf-yellow); }
.glyph-cosmetics em { top: 4px; right: 1px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-blue); }
.glyph-ledger i { top: 6px; left: 4px; width: 31px; height: 27px; border-radius: 6px; background: var(--gf-blue); }
.glyph-ledger b { top: 12px; right: 1px; width: 20px; height: 16px; border-radius: 5px; background: var(--gf-yellow); }
.glyph-ledger em { top: 17px; right: 7px; width: 5px; height: 5px; border-radius: 50%; background: var(--gf-ink); }
.glyph-wishes i { top: 4px; left: 5px; width: 29px; height: 30px; border-radius: 4px; background: var(--gf-yellow); transform: rotate(-4deg); }
.glyph-wishes b { top: 0; left: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--gf-pink); }
.glyph-wishes em { top: 14px; left: 12px; width: 15px; height: 9px; border-width: 0 0 3px 3px; transform: rotate(-45deg); }

.pop-spark {
    position: absolute;
    display: block;
    border: 2px solid var(--gf-ink);
    background: #fff;
}

.spark-a { top: 5px; right: 5px; width: 8px; height: 8px; transform: rotate(18deg); }
.spark-b { top: 20px; right: 18px; width: 6px; height: 6px; border-radius: 50%; background: var(--gf-yellow); }

.pop-feature strong {
    width: 100%;
    overflow: hidden;
    font-size: 13px;
    font-weight: 950;
    letter-spacing: -0.04em;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pop-feature small {
    width: 100%;
    margin-top: 3px;
    overflow: hidden;
    color: #676570;
    font-size: 10px;
    font-weight: 750;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.pop-home-foot {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 22px;
    margin-top: 12px;
    color: #5e5c66;
    font-size: 9px;
    font-weight: 900;
}

.pop-home-foot > span {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
}

.pop-home-foot > span i {
    width: 6px;
    height: 6px;
    border: 1.5px solid var(--gf-ink);
    border-radius: 50%;
    background: var(--gf-pink);
}

.pop-home-foot > button {
    position: relative;
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: 2px solid var(--gf-ink);
    border-radius: 22px;
    background: var(--gf-yellow);
    box-shadow: 2px 2px 0 var(--gf-ink);
}

.pop-home-foot > button::after {
    content: '';
    position: absolute;
    inset: -7px;
}

.pop-home-foot b { font-size: 16px; line-height: 1; }
.pop-home-foot small { font-size: 10px; font-weight: 950; }

/* Target-language states that are absent from the reference SSR. */
.loading-screen {
    color: #20202a;
    background: linear-gradient(165deg, #6ed7f7 0 24%, #c8f6e8 24% 53%, #fff2a9 53% 100%);
}

.loading-heart {
    width: 68px;
    height: 68px;
    padding: 12px;
    border: 3px solid #20202a;
    border-radius: 48% 52% 45% 55%;
    background: #ff7fa5;
    color: #20202a;
    box-shadow: 5px 6px 0 #20202a;
}

.loading-text {
    color: #20202a;
    font-size: 14px;
    font-weight: 900;
}

.home-page > .app {
    --gf-ink: #20202a;
    --gf-yellow: #ffd94a;
    --gf-pink: #ff7fa5;
    --gf-blue: #58c8f5;
    width: min(100%, 460px);
    min-height: 100dvh;
    margin: 0 auto;
    padding-bottom: var(--page-bottom-inset);
    color: var(--gf-ink);
    background: linear-gradient(165deg, #6ed7f7 0 19%, #c8f6e8 19% 43%, #fff2a9 43% 100%);
}

.home-page > .app .header {
    border: 0;
    background: transparent;
    backdrop-filter: none;
}

.home-page > .app .logo-small {
    color: var(--gf-ink);
    font-size: 24px;
    font-weight: 950;
}

.home-page > .app .icon-btn,
.home-page > .app .binding-card {
    border: 3px solid var(--gf-ink);
    background: #fff;
    box-shadow: 5px 6px 0 var(--gf-ink);
}

.home-page > .app .binding-card {
    border-radius: 25px;
}

@media (min-width: 700px) {
    .home-pop-shell,
    .home-page > .app {
        border: 3px solid #20202a;
        border-radius: 26px;
        box-shadow: 10px 12px rgba(32, 32, 42, 0.18);
    }
}

@media (max-height: 720px) {
    .pop-couple-card {
        min-height: 184px;
        padding-top: var(--fellow-space-3);
        padding-bottom: var(--fellow-space-6);
    }

    .pop-avatar-link { width: 72px; height: 72px; }
    .pop-avatar { width: 64px; height: 64px; }
    .pop-feature { min-height: 91px; }
    .pop-feature-art { height: 38px; }
    .pop-section-title { margin-top: 15px; }
}

@media (prefers-reduced-motion: reduce) {
    .pop-feature { transition: none; }
}

</style>
