<template>
    <div class="home-page">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
        <!-- 加载画面 -->
        <div v-if="loading" class="loading-screen">
            <svg class="loading-heart" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div class="loading-text">加载中...</div>
        </div>
        
        <!-- 主应用 -->
        <div v-else class="app">
            <!-- 顶部导航 -->
            <header class="header">
                <div class="header-content">
                    <span class="logo-small">共赴</span>
                    <div class="header-actions">
                        <button class="icon-btn" @click="confirmLogout">
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
                <!-- 已绑定状态 -->
                <div v-if="user.inviteStatus === 'bound'" class="couple-section">
                    <div class="couple-card">
                        <div class="couple-avatars">
                            <div class="avatar">
                                <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="我的头像" crossorigin="anonymous">
                                <span v-else>{{ user.nickname?.[0]?.toUpperCase() }}</span>
                            </div>
                            <div class="avatar-connection">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                </svg>
                            </div>
                            <div class="avatar">
                                <img v-if="partner?.avatarUrl" :src="partner.avatarUrl" alt="伴侣头像" crossorigin="anonymous">
                                <span v-else>{{ partner?.nickname?.[0]?.toUpperCase() || '?' }}</span>
                            </div>
                        </div>
                        
                        <div class="couple-names">
                            <span>{{ user.nickname }}</span>
                            <span class="divider">+</span>
                            <span>{{ partner?.nickname || '...' }}</span>
                        </div>
                        <div class="couple-status">已绑定专属空间</div>
                        
                        <div class="days-counter">
                            <div class="days-number">{{ togetherDays }}</div>
                            <div class="days-label">相爱天数</div>
                            <div class="days-date" v-if="user.anniversary">{{ formatDate(user.anniversary) }} 开始</div>
                        </div>
                    </div>
                    
                    <!-- 核心功能区 -->
                    <div class="core-features-section">
                        <div class="feature-grid">
                            <!-- 取件清单 - 大卡片 (左侧) -->
                            <div class="grid-card grid-large" @click="$router.push('/express')">
                                <div class="card-accent blue"></div>
                                <div class="card-inner">
                                    <div class="card-header-row">
                                        <div class="card-title-group">
                                            <div class="card-icon blue-bg">📦</div>
                                            <span class="card-title">取件清单</span>
                                        </div>
                                        <div v-if="homeStats.express.urgent > 0" class="alert-badge">
                                            {{ homeStats.express.urgent }}件急件
                                        </div>
                                    </div>
                                    
                                    <div class="card-stats-row two-col">
                                        <div class="stat-item">
                                            <div class="stat-value" :class="{ alert: homeStats.express.urgent > 0 }">{{ homeStats.express.pending }}</div>
                                            <div class="stat-label">待取</div>
                                        </div>
                                        <div class="stat-divider"></div>
                                        <div class="stat-item">
                                            <div class="stat-value">{{ homeStats.express.urgent || 0 }}</div>
                                            <div class="stat-label">急件</div>
                                        </div>
                                    </div>
                                    
                                    <div class="recent-list" v-if="currentExpressItems.length > 0">
                                        <div class="list-title">
                                            {{ allExpress.some(e => e.urgent) ? '急件待取' : '最近待取' }}
                                            <span class="scroll-hint">○</span>
                                        </div>
                                        <div class="list-items carousel" :key="carouselKey">
                                            <div class="list-item" 
                                                 v-for="(item, index) in currentExpressItems" 
                                                 :key="item.id"
                                                 :class="{ urgent: item.urgent }"
                                                 :style="{ animationDelay: (index * 0.08) + 's' }">
                                                <span class="item-dot" :class="{ urgent: item.urgent }"></span>
                                                <span class="item-text">{{ item.location }} · {{ item.code }}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="card-action" v-else>
                                        <span class="action-text">暂无待取快递 ✨</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 坚持计划 - 小卡片 (右上) -->
                            <div class="grid-card grid-small" @click="$router.push('/plans')">
                                <div class="card-accent green"></div>
                                <div class="card-inner">
                                    <div class="card-top">
                                        <div class="card-icon green-bg">🎯</div>
                                        <div class="card-status" :class="{ done: homeStats.habits.pending === 0 && homeStats.habits.total > 0 }">
                                            {{ homeStats.habits.pending > 0 ? homeStats.habits.pending + ' 待打' : homeStats.habits.total > 0 ? '已完成' : '开始' }}
                                        </div>
                                    </div>
                                    <div class="card-mid compact">
                                        <div class="card-label">坚持计划</div>
                                        <div class="card-progress-wrap">
                                            <div class="card-progress-bar">
                                                <div class="card-progress-fill" :style="{ width: homeStats.habits.total > 0 ? (homeStats.habits.completed / homeStats.habits.total * 100) + '%' : '0%' }"></div>
                                            </div>
                                            <span class="card-progress-text">{{ homeStats.habits.completed }}/{{ homeStats.habits.total }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 心愿墙 - 小卡片 (右下) -->
                            <div class="grid-card grid-small" @click="$router.push('/wish')">
                                <div class="card-accent pink"></div>
                                <div class="card-inner">
                                    <div class="card-top">
                                        <div class="card-icon pink-bg">💝</div>
                                        <div class="card-status" :class="{ done: homeStats.wishes.total > 0 && homeStats.wishes.pending === 0 }">
                                            <span v-if="homeStats.wishes.total === 0">添加</span>
                                            <span v-else-if="homeStats.wishes.pending === 0">完成</span>
                                            <span v-else>{{ homeStats.wishes.pending }}个待实现</span>
                                        </div>
                                    </div>
                                    <div class="card-mid compact">
                                        <div class="card-label">心愿墙</div>
                                        <div class="card-progress-wrap">
                                            <div class="card-progress-bar pink">
                                                <div class="card-progress-fill pink" :style="{ width: homeStats.wishes.total > 0 ? (homeStats.wishes.completed / homeStats.wishes.total * 100) + '%' : '0%' }"></div>
                                            </div>
                                            <span class="card-progress-text" v-if="homeStats.wishes.total > 0">
                                                {{ Math.round(homeStats.wishes.completed / homeStats.wishes.total * 100) }}%
                                            </span>
                                            <span class="card-progress-text" v-else>0%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 第二行功能 -->
                    <div class="feature-grid second-row">
                        <!-- 心情记录 -->
                        <div class="grid-card grid-small" @click="$router.push('/mood')">
                            <div class="card-accent orange"></div>
                            <div class="card-inner mood-simple">
                                <div class="mood-big-emojis">
                                    <span class="big-emoji" :class="{ empty: !homeStats.mood.myMood }">{{ homeStats.mood.myMood ? moodEmojis[homeStats.mood.myMood] : '?' }}</span>
                                    <span class="emoji-connector">💕</span>
                                    <span class="big-emoji" :class="{ empty: !homeStats.mood.partnerMood }">{{ homeStats.mood.partnerMood ? moodEmojis[homeStats.mood.partnerMood] : '?' }}</span>
                                </div>
                                <div class="card-label">心情记录</div>
                            </div>
                        </div>

                        <!-- 化妆品 -->
                        <div class="grid-card grid-small cosmetic-card" @click="$router.push('/cosmetics')">
                            <div class="card-accent pink"></div>
                            <div class="card-inner cosmetic-inner">
                                <div class="cosmetic-top">
                                    <div class="cosmetic-icon">💄</div>
                                    <span v-if="homeStats.cosmetics.expired > 0" class="cosmetic-tag danger">
                                        {{ homeStats.cosmetics.expired }}个过期
                                    </span>
                                    <span v-else-if="homeStats.cosmetics.expiring > 0" class="cosmetic-tag warning">
                                        {{ homeStats.cosmetics.expiring }}个临期
                                    </span>
                                </div>
                                <div class="cosmetic-info">
                                    <div class="cosmetic-name">化妆品台</div>
                                    <div class="cosmetic-count">
                                        <span v-if="homeStats.cosmetics.total > 0" class="count-num">{{ homeStats.cosmetics.total }}</span>
                                        <span v-if="homeStats.cosmetics.total > 0" class="count-total">件</span>
                                        <span v-else class="count-empty">添加第一个</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 提醒事项 -->
                        <div class="grid-card grid-small" @click="$router.push('/reminders')">
                            <div class="card-accent red"></div>
                            <div class="card-inner second-row-card">
                                <div class="second-row-top">
                                    <div class="card-icon red-bg">⏰</div>
                                    <span v-if="homeStats.reminders.highPriority > 0" class="second-row-badge alert">
                                        {{ homeStats.reminders.highPriority }}个紧急
                                    </span>
                                </div>
                                <div class="second-row-label">提醒事项</div>
                                <div class="second-row-hint">
                                    <span :class="{ 'alert-text': homeStats.reminders.highPriority > 0 }">{{ homeStats.reminders.pending }}个待办</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 第三行：特色宽卡片 -->
                    <div class="feature-grid third-row">
                        <!-- 购物清单 -->
                        <div class="grid-card grid-small shopping-card" @click="$router.push('/shopping')">
                            <div class="card-accent purple"></div>
                            <div class="card-inner shopping-inner">
                                <div class="shopping-top">
                                    <div class="shopping-icon">🛒</div>
                                    <span v-if="homeStats.shopping.pending > 0" class="shopping-tag">
                                        {{ homeStats.shopping.pending }}个待购
                                    </span>
                                </div>
                                <div class="shopping-info">
                                    <div class="shopping-name">购物清单</div>
                                    <div class="shopping-hint">
                                        <span v-if="homeStats.shopping.pending > 0" class="shopping-count">{{ homeStats.shopping.pending }} 件待购</span>
                                        <span v-else>清单为空</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 健康档案 -->
                        <div class="grid-card grid-small health-card" @click="$router.push('/health')">
                            <div class="card-accent teal"></div>
                            <div class="card-inner health-inner">
                                <div class="health-top">
                                    <div class="health-icon">💪</div>
                                    <span v-if="homeStats.health.latestWeight" class="health-tag">
                                        {{ homeStats.health.latestWeight }}kg
                                    </span>
                                </div>
                                <div class="health-info">
                                    <div class="health-name">健康档案</div>
                                    <div class="health-hint">
                                        <span v-if="homeStats.health.latestWeight">最新体重 {{ homeStats.health.latestWeight }}kg</span>
                                        <span v-else>记录身体数据</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 相册 -->
                        <div class="grid-card grid-small album-card" @click="$router.push('/album')">
                            <div class="card-accent blue"></div>
                            <div class="card-inner album-inner">
                                <div class="album-top">
                                    <div class="album-icon">🖼️</div>
                                    <span class="album-tag">回忆</span>
                                </div>
                                <div class="album-info">
                                    <div class="album-name">相册</div>
                                    <div class="album-hint">珍藏美好瞬间</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- 空闲状态 -->
                <div v-else-if="user.inviteStatus === 'idle'" class="binding-card">
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
        <BottomNav @toast="showToast" />
        
        <!-- Toast -->
        <div class="toast" :class="{ show: toast.show, [toast.type]: true }">
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
        
        const toast = ref({ show: false, message: '', type: 'info', timer: null })
        const confirm = ref({ show: false, title: '', message: '', confirmText: '确认', cancelText: '取消', action: null })
        
        let hbTimer = null
        
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
            mood: { today: false, partnerToday: false },
            reminders: { pending: 0, highPriority: 0 },
            cosmetics: { expiring: 0, expired: 0 },
            health: { latestWeight: null },
            shopping: { pending: 0 }
        })
        
        // 快递列表和轮播
        const allExpress = ref([])
        const currentExpressIndex = ref(0)
        const currentExpressItems = ref([])
        let expressCarouselTimer = null
        
        // 获取取件清单统计
        const fetchExpressStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
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
                    // 保存所有待取快递用于轮播
                    allExpress.value = pending.map(e => ({
                        id: e.id,
                        location: e.pickupLocation,
                        code: e.trackingNo,
                        urgent: e.priority === 'urgent'
                    }))
                    // 初始化轮播
                    updateExpressCarousel()
                    // 启动轮播定时器
                    startExpressCarousel()
                }
            } catch (e) {
                console.error('获取快递统计失败:', e)
            }
        }
        
        // 更新当前显示的快递（轮播模式）
        const carouselKey = ref(0)
        
        const updateExpressCarousel = () => {
            if (allExpress.value.length === 0) {
                currentExpressItems.value = []
                return
            }
            
            const urgentItems = allExpress.value.filter(e => e.urgent)
            const normalItems = allExpress.value.filter(e => !e.urgent)
            
            // 急件优先，所有快递都参与轮播
            const itemsToShow = [...urgentItems, ...normalItems]
            const totalPages = Math.ceil(itemsToShow.length / 2) || 1
            
            // 计算当前页要显示的快递
            const startIndex = (currentExpressIndex.value % totalPages) * 2
            currentExpressItems.value = itemsToShow.slice(startIndex, startIndex + 2)
            
            // 改变 key 触发动画
            carouselKey.value++
            
            // 下一页
            currentExpressIndex.value = (currentExpressIndex.value + 1) % totalPages
        }
        
        // 启动快递轮播
        const startExpressCarousel = () => {
            // 清除旧定时器
            if (expressCarouselTimer) clearInterval(expressCarouselTimer)
            
            // 每5秒切换一次
            expressCarouselTimer = setInterval(() => {
                updateExpressCarousel()
            }, 5000)
        }
        
        // 停止快递轮播
        const stopExpressCarousel = () => {
            if (expressCarouselTimer) {
                clearInterval(expressCarouselTimer)
                expressCarouselTimer = null
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
                if (!token || !user.value.partnerId) return
                
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
            } catch (e) {
                console.error('获取习惯统计失败:', e)
            }
        }
        
        // 获取心愿墙统计
        const fetchWishesStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
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
                }
            } catch (e) {
                console.error('获取心愿统计失败:', e)
            }
        }
        
        // 获取心情记录统计
        const fetchMoodStats = async (force = false) => {
            try {
                const token = getToken()
                console.log('[Home] fetchMoodStats 开始:', { hasToken: !!token, partnerId: user.value.partnerId })
                if (!token || !user.value.partnerId) {
                    console.log('[Home] 跳过获取心情: 无token或无伴侣')
                    return
                }
                
                const today = getTodayStr()
                console.log('[Home] 请求今天心情:', today)
                const res = await fetch(CONFIG.API_URL + '/mood?date=' + today, {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                console.log('[Home] 心情API响应:', data)
                if (data.success) {
                    const records = data.data || []
                    const myId = String(user.value.id || userStore.currentUser?.id)
                    const partnerId = String(partner.value?.id || userStore.currentPartner?.id)
                    console.log('[Home] 匹配:', { myId, partnerId, records })
                    const myRecord = records.find(r => String(r.user?.id) === myId)
                    const partnerRecord = partnerId ? records.find(r => String(r.user?.id) === partnerId) : null
                    homeStats.value.mood = {
                        today: !!myRecord,
                        myMood: myRecord?.mood,
                        partnerToday: !!partnerRecord,
                        partnerMood: partnerRecord?.mood
                    }
                    console.log('[Home] 心情统计结果:', homeStats.value.mood)
                }
            } catch (e) {
                console.error('获取心情统计失败:', e)
            }
        }
        
        // 心情表情映射
        const moodEmojis = {
            happy: '😊',
            excited: '🤩',
            calm: '😌',
            tired: '😴',
            sad: '😢',
            angry: '😠',
            sick: '🤒',
            loved: '🥰'
        }
        
        // 获取提醒事项统计
        const fetchRemindersStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
                const res = await fetch(CONFIG.API_URL + '/reminders?status=pending', {
                    headers: { 'Authorization': 'Bearer ' + token },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    const reminders = data.data || []
                    homeStats.value.reminders = {
                        pending: reminders.length,
                        highPriority: reminders.filter(r => r.priority === 'high').length
                    }
                }
            } catch (e) {
                console.error('获取提醒统计失败:', e)
            }
        }
        
        // 获取化妆品统计
        const fetchCosmeticsStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
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
            } catch (e) {
                console.error('获取化妆品统计失败:', e)
            }
        }
        
        // 获取健康档案统计
        const fetchHealthStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
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
            } catch (e) {
                console.error('获取健康档案统计失败:', e)
            }
        }
        
        // 获取购物清单统计
        const fetchShoppingStats = async (force = false) => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
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
            } catch (e) {
                console.error('获取购物统计失败:', e)
            }
        }
        
        // 获取首页所有统计数据
        const fetchHomeStats = async (force = false) => {
            if (user.value.inviteStatus !== 'bound' || !user.value.partnerId) return
            await Promise.all([
                fetchExpressStats(force),
                fetchHabitsStats(force),
                fetchWishesStats(force),
                fetchMoodStats(force),
                fetchRemindersStats(force),
                fetchCosmeticsStats(force),
                fetchHealthStats(force),
                fetchShoppingStats(force)
            ])
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
        
        const fetchUser = async (force = false) => {
            const token = getToken()
            if (!token) {
                router.replace('/')
                return
            }
            
            // 如果不是强制刷新，且数据未过期，且数据完整，则跳过
            if (!force && !userStore.isDataStale && isUserDataValid(userStore.currentUser)) {
                console.log('[Home] 使用缓存数据，跳过获取')
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
                    await fetchInviteInfo()
                    // 获取首页统计数据
                    await fetchHomeStats()
                } else if (res.status === 401 || res.status === 403) {
                    // Token 过期或无效，清除并跳转
                    console.log('[Home] Token 无效，重新登录')
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
                    const res = await fetch(`${CONFIG.API_URL}/user/${user.value.invitingTo}`)
                    const data = await res.json()
                    if (data.success) invitingTarget.value = data.data
                } catch (e) {}
            }
            if (user.value.inviteStatus === 'invited' && user.value.invitingTo) {
                try {
                    const res = await fetch(`${CONFIG.API_URL}/user/${user.value.invitingTo}`)
                    const data = await res.json()
                    if (data.success) invitingFrom.value = data.data
                } catch (e) {}
            }
        }
        
        const formatDate = (date) => {
            const d = new Date(date)
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
        }
        
        const copyCode = () => {
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
                console.log('[Home] 页面可见，刷新数据...')
                // 更新日期（检查是否跨天）
                today.value = getLocalDate()
                fetchUser()
            }
        }
        
        // WebSocket 消息处理
        const handleWSMessage = (data) => {
            // 核心功能实时同步 - 刷新首页统计（强制刷新，禁用缓存）
            if (data.type?.startsWith('express')) {
                console.log('[Home] 收到快递通知，强制刷新:', data.type)
                fetchExpressStats(true)
            }
            if (data.type?.startsWith('habit')) {
                console.log('[Home] 收到习惯通知，强制刷新:', data.type)
                fetchHabitsStats(true)
            }
            if (data.type?.startsWith('wish')) {
                console.log('[Home] 收到心愿通知，强制刷新:', data.type)
                fetchWishesStats(true)
            }
            if (data.type?.startsWith('mood')) {
                console.log('[Home] 收到心情通知，强制刷新:', data.type)
                fetchMoodStats(true)
            }
            if (data.type?.startsWith('reminder')) {
                console.log('[Home] 收到提醒通知，强制刷新:', data.type)
                fetchRemindersStats(true)
            }
            if (data.type?.startsWith('cosmetic')) {
                console.log('[Home] 收到化妆品通知，强制刷新:', data.type)
                fetchCosmeticsStats(true)
            }
            if (data.type?.startsWith('health')) {
                console.log('[Home] 收到健康档案通知，强制刷新:', data.type)
                fetchHealthStats(true)
            }
            if (data.type?.startsWith('shopping')) {
                console.log('[Home] 收到购物清单通知，强制刷新:', data.type)
                fetchShoppingStats(true)
            }
            
            switch (data.type) {
                case 'inviteReceived':
                    showToast(`收到来自 ${data.data.from.nickname} 的邀请`, 'success')
                    user.value.inviteStatus = 'invited'
                    invitingFrom.value = data.data.from
                    break
                case 'inviteAccepted':
                    showToast(`${data.data.partner.nickname} 接受了你的邀请！`, 'success')
                    user.value.inviteStatus = 'bound'
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
                    invitingTarget.value = null
                    break
                case 'inviteCancelled':
                    showToast('对方取消了邀请', 'info')
                    user.value.inviteStatus = 'idle'
                    invitingFrom.value = null
                    break
                case 'partnerUpdated':
                    // 直接更新伴侣信息
                    if (data.data) {
                        // 安全提取字段：只提取需要的字段，避免污染数据结构
                        const {
                            nickname, avatar, avatarUrl, gender, bio, 
                            birthday, anniversary, boundAt
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
                    partner.value = null
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
                stopExpressCarousel()
            })
        })
        
        // 页面激活时重新检查（keep-alive 缓存后重新显示）
        onActivated(() => {
            console.log('[Home] 页面激活，检查用户...')
            
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
                console.log('[Home] 用户切换，清空旧数据，强制刷新')
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
                
                // 检查伴侣头像URL是否有效，如果无效则刷新数据
                const partnerHasAvatar = partner.value?.avatar || partner.value?.avatarUrl
                const partnerAvatarInvalid = partner.value && !partner.value.avatarUrl
                if (partnerAvatarInvalid && partnerHasAvatar) {
                    console.log('[Home] 伴侣头像URL无效，刷新数据')
                    fetchUser(true)
                    return
                }
                
                // 刷新首页统计数据（强制刷新，禁用缓存）
                fetchHomeStats(true)
                
                loading.value = false
            } else {
                // store数据不完整或不存在，重新获取
                console.log('[Home] store数据不完整，重新获取')
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
        
        // 监听快递数据变化，重置轮播索引
        watch(allExpress, (newExpress) => {
            if (newExpress.length > 0) {
                currentExpressIndex.value = 0
                updateExpressCarousel()
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
            togetherDays, today, toast, confirm, homeStats, currentExpressItems, allExpress, carouselKey,
            copyCode, sendInvite, cancelInvite, acceptInvite, rejectInvite,
            formatDate, confirmLogout, showToast, cancelConfirm, doConfirm,
            fetchHomeStats, moodEmojis
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
    background: rgba(253, 253, 245, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 480px;
    margin: 0 auto;
}

.logo-small {
    font-size: 24px;
    font-weight: 800;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    letter-spacing: 2px;
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
    transition: all 0.3s ease;
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
    max-width: 480px;
    margin: 0 auto;
    padding: 24px 20px;
}

/* ============================================
   情侣卡片 - Couple Card（已绑定状态）
   ============================================ */

.couple-section {
    margin-bottom: 24px;
}

.couple-card {
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.5) 0%, rgba(219, 237, 156, 0.3) 100%);
    border: 1px solid rgba(255, 107, 107, 0.2);
    border-radius: var(--radius-xl);
    padding: 32px 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
}

.couple-card::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(241, 101, 137, 0.1) 0%, transparent 70%);
    animation: rotate 20s linear infinite;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

.couple-avatars {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
    margin-bottom: 24px;
    position: relative;
    z-index: 1;
}

.avatar {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-input) 100%);
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 600;
    color: var(--text-primary);
    position: relative;
    overflow: hidden;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
}

.avatar::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    padding: 2px;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
}

.avatar-connection {
    position: relative;
    width: 50px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.avatar-connection::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #D5EAE3, #FFFFFF);
    transform: translateY(-50%);
}

.avatar-connection svg {
    position: relative;
    z-index: 1;
    color: #FDD3D5;
}

.couple-names {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 8px;
    position: relative;
    z-index: 1;
}

.couple-names .divider {
    color: var(--color-primary);
    margin: 0 12px;
}

.couple-status {
    font-size: 13px;
    color: var(--text-tertiary);
    position: relative;
    z-index: 1;
}

.days-counter {
    margin-top: 28px;
    padding-top: 28px;
    border-top: 1px solid var(--border-color);
    position: relative;
    z-index: 1;
}

.days-number {
    font-size: 56px;
    font-weight: 800;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    line-height: 1;
    margin-bottom: 4px;
}

.days-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.days-date {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* ============================================
   Bento Grid 布局 - Apple 风格
   ============================================ */

.core-features-section {
    margin-top: 16px;
}

/* Grid 容器 - 左侧大卡片，右侧自适应 */
.feature-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr;
    gap: 10px;
    align-items: start;
}

/* 大卡片 */
.grid-large {
    grid-row: span 2;
    height: 220px;
    min-height: 220px;
}

/* 小卡片 - 统一高度 105px */
.grid-small {
    height: 105px;
    min-height: 105px;
}

.grid-small .card-inner {
    padding: 12px;
    height: 100%;
    min-height: 105px;
    justify-content: center;
}

/* 第二行小卡片紧凑布局 */
.second-row {
    grid-template-columns: repeat(3, 1fr);
    margin-top: 16px;
    margin-bottom: 16px;
}

/* 第三行小卡片 */
.third-row {
    grid-template-columns: repeat(3, 1fr);
    margin-top: 6px;
}

.second-row .grid-small {
    height: 105px;
    min-height: 105px;
}

.second-row .grid-small .card-inner {
    padding: 10px 6px;
    height: 100%;
    min-height: 105px;
}

/* 第二行统一布局 */
.second-row-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.second-row-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 4px;
}

.second-row-top .card-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
}

/* 化妆品首页卡片 - 精致设计 */
/* 化妆品卡片 - 简\u6d01\u8bbe\u8ba1 */
.cosmetic-card {
    background: linear-gradient(145deg, #ffffff 0%, #fafbfc 100%);
}

.cosmetic-inner {
    padding: 14px 12px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    justify-content: center;
    gap: 8px;
}

.cosmetic-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
}

.cosmetic-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #FFE4EC 0%, #FFD4E5 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.cosmetic-tag {
    font-size: 9px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
}

.cosmetic-tag.warning {
    color: #FF9800;
    background: rgba(255, 152, 0, 0.12);
}

.cosmetic-tag.danger {
    color: #F44336;
    background: rgba(244, 67, 54, 0.12);
}

.cosmetic-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.cosmetic-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.cosmetic-count {
    display: flex;
    align-items: baseline;
    gap: 2px;
}

.count-num {
    font-size: 20px;
    font-weight: 800;
    color: var(--color-primary);
    line-height: 1;
}

.count-total {
    font-size: 12px;
    color: var(--text-secondary);
}

.count-empty {
    font-size: 11px;
    color: var(--text-tertiary);
}

.second-row-badge {
    font-size: 10px;
    font-weight: 500;
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.1);
    padding: 2px 6px;
    border-radius: 10px;
}

.second-row-badge.alert {
    color: #DC2626;
    background: rgba(220, 38, 38, 0.1);
}

.second-row-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
}

.second-row-hint {
    font-size: 11px;
    color: var(--text-secondary);
}

/* 卡片基础 */
.grid-card {
    position: relative;
    border-radius: 18px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    background: var(--bg-card);
    border: 0.5px solid var(--border-color);
}

.grid-card:hover {
    transform: scale(1.01);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.grid-card:active {
    transform: scale(0.98);
}

/* 彩色边条 */
.card-accent {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
}

.card-accent.green { background: linear-gradient(90deg, #10B981, #34D399); }
.card-accent.blue { background: linear-gradient(90deg, #3B82F6, #60A5FA); }
.card-accent.pink { background: linear-gradient(90deg, #EC4899, #F472B6); }
.card-accent.orange { background: linear-gradient(90deg, #F59E0B, #FBBF24); }
.card-accent.red { background: linear-gradient(90deg, #EF4444, #F87171); }
.card-accent.cyan { background: linear-gradient(90deg, #06B6D4, #22D3EE); }

/* 卡片内容 */
.card-inner {
    height: 100%;
    padding: 16px;
    display: flex;
    flex-direction: column;
}

/* 顶部区域 */
.card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
}

/* 大卡片头部 */
.card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.card-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.card-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.alert-badge {
    font-size: 12px;
    font-weight: 600;
    color: #DC2626;
    padding: 4px 10px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 12px;
}

/* 统计行 */
.card-stats-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding: 12px;
    background: rgba(0,0,0,0.02);
    border-radius: 12px;
}

.card-stats-row.two-col {
    gap: 16px;
}

.stat-item {
    flex: 1;
    text-align: center;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1;
    margin-bottom: 4px;
}

.stat-value.alert {
    color: #DC2626;
}

.stat-label {
    font-size: 12px;
    color: var(--text-tertiary);
}

.stat-divider {
    width: 1px;
    height: 24px;
    background: var(--border-color);
}

/* 最近列表 */
.recent-list {
    flex: 1;
}

.list-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.scroll-hint {
    font-size: 8px;
    color: var(--text-tertiary);
    animation: pulse-opacity 1.5s infinite;
}

@keyframes pulse-opacity {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
}

.list-items.carousel {
    animation: fadeInUp 0.4s ease;
}

.list-item {
    animation: slideInRight 0.35s ease backwards;
}

@keyframes fadeInUp {
    from { 
        opacity: 0.6;
        transform: translateY(6px);
    }
    to { 
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes slideInRight {
    from { 
        opacity: 0;
        transform: translateX(-10px);
    }
    to { 
        opacity: 1;
        transform: translateX(0);
    }
}

.list-item.urgent {
    background: rgba(239, 68, 68, 0.06);
    border-radius: 8px;
}

.list-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.list-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: rgba(0,0,0,0.02);
    border-radius: 8px;
}

.item-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #3B82F6;
}

.item-dot.urgent {
    background: #DC2626;
    animation: pulse 1.5s infinite;
}

.item-text {
    font-size: 13px;
    color: var(--text-secondary);
}

.card-action {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-text {
    font-size: 14px;
    color: var(--text-tertiary);
}

.card-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
}

.green-bg { background: rgba(16, 185, 129, 0.12); }
.blue-bg { background: rgba(59, 130, 246, 0.12); }
.pink-bg { background: rgba(236, 72, 153, 0.12); }
.orange-bg { background: rgba(245, 158, 11, 0.12); }
.red-bg { background: rgba(239, 68, 68, 0.12); }
.cyan-bg { background: rgba(6, 182, 212, 0.12); }

/* 心情卡片简洁样式 - 高度与其他小卡片一致 */
.mood-simple {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 8px 4px;
}

.mood-simple .card-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-top: 4px;
}

/* 健康档案卡片 - 与化妆品卡片风格统一 */
.health-card {
    background: linear-gradient(145deg, #ffffff 0%, #f0fdfa 100%);
}

.health-inner {
    padding: 14px 12px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    justify-content: center;
    gap: 8px;
}

.health-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
}

.health-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #ccfbf1 0%, #99f6e4 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.health-tag {
    font-size: 9px;
    font-weight: 600;
    color: #0d9488;
    background: rgba(20, 184, 166, 0.12);
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
}

.health-tag.empty {
    color: #94a3b8;
    background: rgba(148, 163, 184, 0.12);
}

.health-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.health-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.health-hint {
    font-size: 11px;
    color: var(--text-secondary);
}

/* 购物清单卡片 */
.shopping-card {
    background: linear-gradient(145deg, #ffffff 0%, #faf5ff 100%);
}

.shopping-inner {
    padding: 14px 12px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    justify-content: center;
    gap: 8px;
}

.shopping-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
}

.shopping-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: linear-gradient(135deg, #EDE9FE 0%, #DDD6FE 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.shopping-tag {
    font-size: 9px;
    font-weight: 600;
    color: #8B5CF6;
    background: rgba(139, 92, 246, 0.12);
    padding: 2px 6px;
    border-radius: 8px;
    white-space: nowrap;
}

.shopping-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.shopping-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
}

.shopping-hint {
    font-size: 12px;
    color: var(--text-secondary);
}

.shopping-count {
    font-weight: 600;
    color: #8B5CF6;
}

/* 健康档案卡片 - 特色渐变 */
.health-card {
    background: linear-gradient(145deg, #f0fdfa 0%, #ccfbf1 100%);
    border: 1px solid rgba(20, 184, 166, 0.15);
}

.health-card .card-accent.teal {
    background: linear-gradient(90deg, #14b8a6, #5eead4);
    width: 4px;
}

.health-inner {
    padding: 12px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    justify-content: center;
    gap: 6px;
}

.health-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
}

.health-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #14b8a6 0%, #2dd4bf 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(20, 184, 166, 0.25);
}

.health-tag {
    font-size: 10px;
    font-weight: 700;
    color: #0f766e;
    background: rgba(255, 255, 255, 0.7);
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
}

.health-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.health-name {
    font-size: 13px;
    font-weight: 600;
    color: #134e4a;
}

.health-hint {
    font-size: 11px;
    color: #0d9488;
    font-weight: 500;
}

/* 相册卡片 - 特色渐变 */
.album-card {
    background: linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%);
    border: 1px solid rgba(59, 130, 246, 0.15);
}

.album-card .card-accent.blue {
    background: linear-gradient(90deg, #3b82f6, #60a5fa);
    width: 4px;
}

.album-inner {
    padding: 12px !important;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    height: 100%;
    justify-content: center;
    gap: 6px;
}

.album-top {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    width: 100%;
}

.album-icon {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.album-tag {
    font-size: 10px;
    font-weight: 700;
    color: #1d4ed8;
    background: rgba(255, 255, 255, 0.7);
    padding: 2px 8px;
    border-radius: 10px;
    white-space: nowrap;
    backdrop-filter: blur(4px);
}

.album-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
}

.album-name {
    font-size: 13px;
    font-weight: 600;
    color: #1e3a8a;
}

.album-hint {
    font-size: 11px;
    color: #3b82f6;
    font-weight: 500;
}

.teal-bg {
    background: linear-gradient(135deg, #14b8a6, #2dd4bf) !important;
}

.card-accent.teal {
    background: linear-gradient(90deg, #14b8a6, #2dd4bf);
}
.card-accent.purple {
    background: linear-gradient(90deg, #8B5CF6, #A78BFA);
}

.alert-text {
    color: #DC2626;
}

.mood-big-emojis {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-bottom: 4px;
}

.big-emoji {
    font-size: 28px;
    line-height: 1;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.5);
    flex-shrink: 0;
}

.big-emoji.empty {
    font-size: 20px;
    color: var(--text-tertiary);
    font-weight: 400;
    background: rgba(0, 0, 0, 0.04);
}

.emoji-connector {
    font-size: 12px;
    opacity: 0.7;
    flex-shrink: 0;
}

.card-status {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-tertiary);
    padding: 4px 8px;
    background: rgba(0,0,0,0.04);
    border-radius: 12px;
}

.card-status.done {
    color: #059669;
    background: rgba(16, 185, 129, 0.1);
}

.alert-pill {
    font-size: 11px;
    font-weight: 600;
    color: #DC2626;
    padding: 3px 8px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 10px;
}

/* 中部区域 */
.card-mid {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.card-mid.compact {
    justify-content: center;
}

.card-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-bottom: 6px;
    letter-spacing: -0.2px;
}

.card-data {
    display: flex;
    align-items: baseline;
    gap: 4px;
}

.card-data.small {
    gap: 2px;
}

.data-main {
    font-size: 36px;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -1px;
    line-height: 1;
}

.card-data.small .data-main {
    font-size: 28px;
}

.data-main.alert {
    color: #DC2626;
}

.data-sep {
    font-size: 20px;
    font-weight: 400;
    color: var(--text-tertiary);
    margin: 0 2px;
}

.data-sub {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-tertiary);
}

.data-unit {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-tertiary);
    margin-left: 2px;
}

/* 卡片进度条 - 整合版 */
.card-progress-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
}

.card-progress-bar {
    flex: 1;
    height: 6px;
    background: rgba(0, 0, 0, 0.06);
    border-radius: 3px;
    overflow: hidden;
}

.card-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #10B981, #34D399);
    border-radius: 3px;
    transition: width 0.4s ease;
}

.card-progress-fill.pink {
    background: linear-gradient(90deg, #EC4899, #F472B6);
}

.card-progress-text {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
    min-width: 36px;
    text-align: right;
}

.card-sub-hint {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

/* 底部进度条 */
.card-bot {
    margin-top: auto;
    padding-top: 12px;
}

.progress-line {
    height: 3px;
    background: rgba(0,0,0,0.06);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;
}

.progress-fill.green { background: #10B981; }
.progress-fill.blue { background: #3B82F6; }
.progress-fill.pink { background: #EC4899; }

/* 响应式 */
@media (max-width: 380px) {
    .feature-grid {
        grid-template-columns: 1fr;
        gap: 10px;
    }
    
    .grid-large {
        min-height: auto;
    }
    
    .grid-small {
        min-height: 80px;
    }
    
    .card-stats-row {
        padding: 10px;
        gap: 8px;
    }
    
    .stat-value {
        font-size: 20px;
    }
}

/* ============================================
   更多功能 - More Features
   ============================================ */

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
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
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
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
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
    background: linear-gradient(135deg, #F06292 0%, #E91E63 100%);
    color: white;
}

.btn-accept:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3);
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
    box-shadow: 0 8px 32px rgba(241, 101, 137, 0.15);
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
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
}

.confirm-btn.danger {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}
</style>