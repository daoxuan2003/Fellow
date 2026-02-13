<template>
    <div class="home-page">
        <header class="header">
            <div class="header-content">
                <span class="logo-small">共赴</span>
                <div class="header-actions">
                    <button class="icon-btn" @click="logout">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                            <polyline points="16 17 21 12 16 7"/>
                            <line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                    </button>
                </div>
            </div>
        </header>
        
        <main class="main" v-if="user.id">
            <!-- ========== 已绑定状态 ========== -->
            <div v-if="user.inviteStatus === 'bound'" class="couple-section">
                <div class="couple-card">
                    <div class="couple-avatars">
                        <div class="avatar">
                            <img v-if="user.avatarUrl" :src="user.avatarUrl">
                            <span v-else>{{ user.nickname?.[0] }}</span>
                        </div>
                        <div class="avatar-connection">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </div>
                        <div class="avatar">
                            <img v-if="partner?.avatarUrl" :src="partner.avatarUrl">
                            <span v-else>{{ partner?.nickname?.[0] || '?' }}</span>
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
                        <div class="days-date" v-if="user.boundAt">{{ formatDate(user.boundAt) }} 开始</div>
                    </div>
                </div>
                
                <!-- 功能入口 -->
                <div class="quick-actions">
                    <div class="action-card" v-for="item in features" :key="item.name" @click="$emit('toast', item.name + '功能开发中')">
                        <div class="action-icon" v-html="item.icon"></div>
                        <div class="action-title">{{ item.name }}</div>
                        <div class="action-desc">{{ item.desc }}</div>
                    </div>
                </div>
            </div>
            
            <!-- ========== 空闲状态 - 可以发送邀请 ========== -->
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
            
            <!-- ========== 邀请中状态 - 等待对方接受 ========== -->
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
                            <img v-if="invitingTarget.avatarUrl" :src="invitingTarget.avatarUrl">
                            <span v-else>{{ invitingTarget.nickname?.[0] }}</span>
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
            
            <!-- ========== 被邀请状态 - 需要接受或拒绝 ========== -->
            <div v-else-if="user.inviteStatus === 'invited'" class="binding-card">
                <div class="invite-received">
                    <div class="invite-received-header">
                        <h3>收到邀请</h3>
                        <p>有人想和你绑定情侣关系</p>
                    </div>
                    
                    <div class="invite-from-card" v-if="invitingFrom">
                        <div class="invite-from-avatar">
                            <img v-if="invitingFrom.avatarUrl" :src="invitingFrom.avatarUrl">
                            <span v-else>{{ invitingFrom.nickname?.[0] }}</span>
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
        
        <div v-else class="loading-screen">
            <div class="loading-spinner"></div>
        </div>
        
        <BottomNav @toast="showToast" />
    </div>
</template>

<script>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    components: { BottomNav },
    setup() {
        const router = useRouter()
        const showToast = inject('showToast')
        
        const user = ref({})
        const partner = ref(null)
        const invitingTarget = ref(null)
        const invitingFrom = ref(null)
        const inputPairCode = ref('')
        const inviting = ref(false)
        const processing = ref(false)
        
        const ws = ref(null)
        let wsTimer = null, hbTimer = null
        
        const token = localStorage.getItem('token')
        
        const togetherDays = computed(() => {
            if (!user.value.boundAt) return 0
            const days = Math.floor((new Date() - new Date(user.value.boundAt)) / 86400000)
            return Math.max(1, days)
        })
        
        const features = [
            { name: '相册', desc: '珍藏美好瞬间', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
            { name: '心愿墙', desc: '想要/想做的事', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
            { name: '心情记录', desc: '记录每日心情', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
            { name: '坚持计划', desc: '减肥存钱考研', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
            { name: '代取快递', desc: '帮TA拿快递', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
            { name: '提醒事项', desc: '不再错过重要事', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
            { name: '化妆品保质期', desc: '记录过期时间', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' }
        ]
        
        const fetchUser = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    user.value = data.data
                    partner.value = data.data.partner
                    // 获取邀请相关信息
                    await fetchInviteInfo()
                }
            } catch (e) {
                console.error('获取用户信息失败:', e)
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
        
        const copyCode = () => {
            navigator.clipboard.writeText(user.value.pairCode)
            showToast('配对码已复制')
        }
        
        const sendInvite = async () => {
            inviting.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/send', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ pairCode: inputPairCode.value.toUpperCase() })
                })
                const data = await res.json()
                if (data.success) {
                    showToast('邀请已发送，等待对方接受')
                    user.value.inviteStatus = 'inviting'
                    invitingTarget.value = data.data.to
                    inputPairCode.value = ''
                } else {
                    showToast(data.message)
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                inviting.value = false
            }
        }
        
        const cancelInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/cancel', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('已取消邀请')
                    user.value.inviteStatus = 'idle'
                    invitingTarget.value = null
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                processing.value = false
            }
        }
        
        const acceptInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/accept', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('恭喜！你们已成为情侣')
                    user.value.inviteStatus = 'bound'
                    user.value.partnerId = data.data.partner.id
                    user.value.boundAt = data.data.boundAt
                    partner.value = data.data.partner
                    invitingFrom.value = null
                } else {
                    showToast(data.message)
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                processing.value = false
            }
        }
        
        const rejectInvite = async () => {
            processing.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/invite/reject', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('已拒绝邀请')
                    user.value.inviteStatus = 'idle'
                    invitingFrom.value = null
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                processing.value = false
            }
        }
        
        const formatDate = (date) => {
            const d = new Date(date)
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
        }
        
        // WebSocket
        const connectWS = () => {
            if (!token) return
            ws.value = new WebSocket(CONFIG.WS_URL)
            
            ws.value.onopen = () => {
                ws.value.send(JSON.stringify({ type: 'auth', token }))
            }
            
            ws.value.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    handleWSMessage(data)
                } catch (e) {}
            }
            
            ws.value.onclose = (e) => {
                if (e.code === 1008) {
                    localStorage.removeItem('token')
                    router.push('/')
                    showToast('登录已过期，请重新登录')
                    return
                }
                wsTimer = setTimeout(connectWS, 3000)
            }
        }
        
        const handleWSMessage = (data) => {
            switch (data.type) {
                case 'inviteReceived':
                    showToast(`收到来自 ${data.data.from.nickname} 的邀请`)
                    user.value.inviteStatus = 'invited'
                    invitingFrom.value = data.data.from
                    break
                case 'inviteAccepted':
                    showToast(`${data.data.partner.nickname} 接受了你的邀请！`)
                    user.value.inviteStatus = 'bound'
                    user.value.partnerId = data.data.partner.id
                    user.value.boundAt = data.data.boundAt
                    partner.value = data.data.partner
                    invitingTarget.value = null
                    break
                case 'inviteRejected':
                    showToast(`${data.data.by.nickname} 拒绝了你的邀请`)
                    user.value.inviteStatus = 'idle'
                    invitingTarget.value = null
                    break
                case 'inviteCancelled':
                    showToast('对方取消了邀请')
                    user.value.inviteStatus = 'idle'
                    invitingFrom.value = null
                    break
                case 'partnerUpdated':
                    fetchUser()
                    break
            }
        }
        
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && (!ws.value || ws.value.readyState !== 1)) {
                connectWS()
            }
        }
        
        onMounted(() => {
            fetchUser()
            connectWS()
            hbTimer = setInterval(() => {
                if (ws.value?.readyState === 1) ws.value.send('{"type":"ping"}')
            }, 30000)
            document.addEventListener('visibilitychange', handleVisibility)
        })
        
        onUnmounted(() => {
            clearTimeout(wsTimer)
            clearInterval(hbTimer)
            ws.value?.close()
            document.removeEventListener('visibilitychange', handleVisibility)
        })
        
        const logout = () => {
            localStorage.removeItem('token')
            router.push('/')
        }
        
        return {
            user, partner, invitingTarget, invitingFrom,
            inputPairCode, inviting, processing,
            togetherDays, features,
            copyCode, sendInvite, cancelInvite, acceptInvite, rejectInvite,
            formatDate, logout
        }
    }
}
</script>

<style scoped>
.home-page { padding-bottom: 100px; }

.header { position: sticky; top: 0; z-index: 100; padding: 16px 20px; background: rgba(10,10,15,0.8); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); }
.header-content { display: flex; justify-content: space-between; align-items: center; max-width: 480px; margin: 0 auto; }
.logo-small { font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.icon-btn { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-secondary); cursor: pointer; }

.main { padding: 20px; max-width: 480px; margin: 0 auto; }

/* 已绑定状态 */
.couple-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px 24px; text-align: center; margin-bottom: 24px; }
.couple-avatars { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 24px; }
.avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 28px; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-connection { color: var(--color-primary); }
.couple-names { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
.couple-names .divider { margin: 0 8px; color: var(--color-primary); }
.couple-status { font-size: 13px; color: var(--text-tertiary); margin-bottom: 24px; }
.days-number { font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.days-label { color: var(--text-secondary); font-size: 14px; margin-top: 4px; }
.days-date { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }

.quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.action-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; }
.action-card:active { transform: scale(0.98); }
.action-icon { color: var(--color-primary); margin-bottom: 12px; }
.action-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.action-desc { font-size: 12px; color: var(--text-tertiary); }

/* 绑定卡片 */
.binding-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px 24px; }
.binding-title { text-align: center; margin-bottom: 32px; }
.binding-title h2 { font-size: 24px; margin-bottom: 8px; }
.binding-title p { color: var(--text-secondary); font-size: 14px; }

.code-display { text-align: center; margin-bottom: 32px; }
.code-label { font-size: 12px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }
.code-value { font-size: 48px; font-weight: 700; letter-spacing: 8px; margin-bottom: 16px; }
.code-action { padding: 10px 24px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-secondary); font-size: 14px; cursor: pointer; }

.divider-or { text-align: center; margin: 24px 0; position: relative; }
.divider-or::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--border-color); }
.divider-or span { position: relative; background: var(--bg-card); padding: 0 16px; color: var(--text-tertiary); font-size: 13px; }

.bind-form label { display: block; font-size: 14px; margin-bottom: 12px; }
.code-input-wrapper { margin-bottom: 16px; }
.code-input { width: 100%; padding: 16px; background: var(--bg-input); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-size: 24px; text-align: center; letter-spacing: 4px; text-transform: uppercase; }
.code-input:focus { outline: none; border-color: var(--color-primary); }
.bind-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); border: none; border-radius: var(--radius-md); color: white; font-size: 16px; font-weight: 600; cursor: pointer; }
.bind-btn:disabled { opacity: 0.6; cursor: not-allowed; }

/* 邀请中状态 */
.invite-waiting { text-align: center; padding: 24px 0; }
.invite-waiting-icon { margin-bottom: 16px; }
.invite-waiting h3 { font-size: 20px; margin-bottom: 8px; }
.invite-waiting p { color: var(--text-secondary); font-size: 14px; margin-bottom: 24px; }

.invite-target { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); padding: 16px; margin-bottom: 24px; }
.invite-target-avatar { width: 56px; height: 56px; border-radius: 50%; background: var(--bg-input); overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.invite-target-avatar img { width: 100%; height: 100%; object-fit: cover; }
.invite-target-info { flex: 1; text-align: left; }
.invite-target-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
.invite-target-status { font-size: 13px; color: var(--text-tertiary); }

.btn-cancel-invite { width: 100%; padding: 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: transparent; color: var(--text-secondary); font-size: 15px; cursor: pointer; }
.btn-cancel-invite:disabled { opacity: 0.6; }

/* 被邀请状态 */
.invite-received { text-align: center; padding: 24px 0; }
.invite-received-header { margin-bottom: 24px; }
.invite-received-header h3 { font-size: 20px; margin-bottom: 8px; }
.invite-received-header p { color: var(--text-secondary); font-size: 14px; }

.invite-from-card { background: linear-gradient(135deg, rgba(255,107,107,0.1), rgba(255,142,142,0.05)); border: 1px solid rgba(255,107,107,0.2); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 24px; }
.invite-from-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--bg-input); margin: 0 auto 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 32px; border: 3px solid rgba(255,107,107,0.3); }
.invite-from-avatar img { width: 100%; height: 100%; object-fit: cover; }
.invite-from-name { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
.invite-from-bio { font-size: 13px; color: var(--text-tertiary); }

.invite-actions { display: flex; gap: 12px; }
.invite-actions button { flex: 1; padding: 14px; border: none; border-radius: var(--radius-md); font-size: 15px; font-weight: 600; cursor: pointer; }
.btn-reject { background: var(--bg-input); color: var(--text-secondary); }
.btn-accept { background: linear-gradient(135deg, #FF6B6B, #FF8E8E); color: white; }

.loading-screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 48px; height: 48px; border: 3px solid var(--border-color); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>