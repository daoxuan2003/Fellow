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
                                    <div class="card-top">
                                        <div class="card-icon blue-bg">📦</div>
                                        <div v-if="homeStats.express.urgent > 0" class="alert-pill">
                                            {{ homeStats.express.urgent }} 急件
                                        </div>
                                        <div v-else class="card-status">
                                            {{ homeStats.express.pending > 0 ? '待取' : '已取完' }}
                                        </div>
                                    </div>
                                    <div class="card-mid">
                                        <div class="card-label">取件清单</div>
                                        <div class="card-data">
                                            <span class="data-main" :class="{ alert: homeStats.express.urgent > 0 }">{{ homeStats.express.pending }}</span>
                                            <span class="data-unit">件</span>
                                        </div>
                                    </div>
                                    <div class="card-bot" v-if="homeStats.express.pending > 0">
                                        <div class="progress-line">
                                            <div class="progress-fill blue" style="width: 100%"></div>
                                        </div>
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
                                        <div class="card-data small">
                                            <span class="data-main">{{ homeStats.habits.completed }}</span>
                                            <span class="data-sep">/</span>
                                            <span class="data-sub">{{ homeStats.habits.total }}</span>
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
                                    </div>
                                    <div class="card-mid compact">
                                        <div class="card-label">心愿墙</div>
                                        <div class="card-data small">
                                            <span class="data-main">{{ homeStats.wishes.completed }}</span>
                                            <span class="data-sep">/</span>
                                            <span class="data-sub">{{ homeStats.wishes.total || 0 }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 更多功能 -->
                    <div class="more-features-section">
                        <div class="section-title">
                            <span class="title-icon">🌟</span>
                            <span>更多功能</span>
                        </div>
                        <div class="more-features">
                            <div 
                                class="more-feature-item" 
                                v-for="item in moreFeatures" 
                                :key="item.name" 
                                @click="handleFeatureClick(item)"
                            >
                                <div class="more-feature-icon" :class="item.class">{{ item.emoji }}</div>
                                <div class="more-feature-title">{{ item.name }}</div>
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
        
        // 更多功能列表（排除三个核心功能）
        const moreFeatures = [
            { name: '相册', emoji: '🖼️', class: 'album', desc: '珍藏美好瞬间' },
            { name: '心情记录', emoji: '😊', class: 'mood', desc: '记录每日心情' },
            { name: '提醒事项', emoji: '⏰', class: 'reminder', desc: '不再错过重要事' },
            { name: '化妆品', emoji: '💄', class: 'cosmetic', desc: '记录过期时间' }
        ]
        
        // 首页核心功能统计数据
        const homeStats = ref({
            express: { pending: 0, urgent: 0 },
            habits: { total: 0, completed: 0, pending: 0 },
            wishes: { total: 0, completed: 0, pending: 0 }
        })
        
        // 获取取件清单统计
        const fetchExpressStats = async () => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
                const res = await fetch(CONFIG.API_URL + '/express', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    const pending = data.data.pending || []
                    homeStats.value.express = {
                        pending: pending.length,
                        urgent: pending.filter(e => e.priority === 'urgent').length
                    }
                }
            } catch (e) {
                console.error('获取快递统计失败:', e)
            }
        }
        
        // 获取坚持计划统计
        const fetchHabitsStats = async () => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
                const res = await fetch(CONFIG.API_URL + '/habits/today', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    const checked = data.data.checkedInHabits?.length || 0
                    const pending = data.data.pendingHabits?.length || 0
                    homeStats.value.habits = {
                        total: checked + pending,
                        completed: checked,
                        pending: pending
                    }
                }
            } catch (e) {
                console.error('获取习惯统计失败:', e)
            }
        }
        
        // 获取心愿墙统计
        const fetchWishesStats = async () => {
            try {
                const token = getToken()
                if (!token || !user.value.partnerId) return
                
                const res = await fetch(CONFIG.API_URL + '/wishes', {
                    headers: { 'Authorization': 'Bearer ' + token }
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
        
        // 获取首页所有统计数据
        const fetchHomeStats = async () => {
            if (user.value.inviteStatus !== 'bound' || !user.value.partnerId) return
            await Promise.all([
                fetchExpressStats(),
                fetchHabitsStats(),
                fetchWishesStats()
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
            // 核心功能实时同步 - 刷新首页统计
            if (data.type?.startsWith('express')) {
                fetchExpressStats()
            }
            if (data.type?.startsWith('habit')) {
                fetchHabitsStats()
            }
            if (data.type?.startsWith('wish')) {
                fetchWishesStats()
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
                
                // 刷新首页统计数据
                fetchHomeStats()
                
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
        
        const handleFeatureClick = (item) => {
            showToast(item.name + '功能开发中')
        }
        
        return {
            user, partner, invitingTarget, invitingFrom,
            inputPairCode, inviting, processing, loading,
            togetherDays, today, moreFeatures, toast, confirm, homeStats,
            copyCode, sendInvite, cancelInvite, acceptInvite, rejectInvite,
            formatDate, confirmLogout, showToast, cancelConfirm, doConfirm,
            handleFeatureClick, fetchHomeStats
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

/* Grid 容器 - 2列1.4:1比例 */
.feature-grid {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 10px;
    height: 160px;
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

/* 左侧大卡片 */
.grid-large {
    grid-row: span 2;
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
    justify-content: flex-start;
    margin-top: 2px;
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
        grid-template-rows: auto auto auto;
        height: auto;
    }
    
    .grid-large {
        grid-row: span 1;
        min-height: 120px;
    }
    
    .grid-small {
        min-height: 90px;
    }
}

/* ============================================
   更多功能 - More Features
   ============================================ */

.more-features-section {
    margin-top: 32px;
}

.more-features-section .section-title {
    margin-bottom: 16px;
}

.more-features {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

.more-feature-item {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 16px 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    text-align: center;
}

.more-feature-item:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
    transform: translateY(-2px);
}

.more-feature-icon {
    width: 44px;
    height: 44px;
    margin: 0 auto 8px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    background: linear-gradient(135deg, rgba(241, 101, 137, 0.1) 0%, rgba(219, 237, 156, 0.1) 100%);
    transition: all 0.3s ease;
}

.more-feature-item:hover .more-feature-icon {
    transform: scale(1.05);
}

.more-feature-icon.album {
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(167, 139, 250, 0.08) 100%);
}

.more-feature-icon.mood {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(251, 191, 36, 0.08) 100%);
}

.more-feature-icon.reminder {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(248, 113, 113, 0.08) 100%);
}

.more-feature-icon.cosmetic {
    background: linear-gradient(135deg, rgba(14, 165, 233, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%);
}

.more-feature-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-primary);
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