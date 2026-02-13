<template>
    <div class="home-page" v-if="user.id">
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
        
        <main class="main">
            <!-- 情侣信息卡片 -->
            <div class="couple-card" v-if="user.inviteStatus === 'bound'">
                <div class="couple-avatars">
                    <div class="avatar">
                        <img v-if="user.avatarUrl" :src="user.avatarUrl">
                        <span v-else>{{ user.nickname?.[0] }}</span>
                    </div>
                    <div class="heart">❤️</div>
                    <div class="avatar">
                        <img v-if="partner?.avatarUrl" :src="partner.avatarUrl">
                        <span v-else>{{ partner?.nickname?.[0] || '?' }}</span>
                    </div>
                </div>
                <div class="days-counter">
                    <div class="days-number">{{ togetherDays }}</div>
                    <div class="days-label">相爱天数</div>
                </div>
            </div>
            
            <!-- 功能入口 -->
            <div class="quick-actions">
                <div class="action-card" v-for="item in features" :key="item.name" @click="showToast(item.name + '功能开发中')">
                    <div class="action-icon" v-html="item.icon"></div>
                    <div class="action-title">{{ item.name }}</div>
                </div>
            </div>
        </main>
        
        <BottomNav @toast="showToast" />
    </div>
    <div v-else class="loading-screen">
        <div class="loading-spinner"></div>
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
        const ws = ref(null)
        let wsTimer = null, hbTimer = null
        
        const togetherDays = computed(() => {
            if (!user.value.boundAt) return 0
            const days = Math.floor((new Date() - new Date(user.value.boundAt)) / 86400000)
            return Math.max(1, days)
        })
        
        const features = [
            { name: '相册', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
            { name: '心愿墙', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' },
            { name: '心情记录', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>' },
            { name: '坚持计划', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' },
            { name: '代取快递', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>' },
            { name: '提醒事项', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
            { name: '化妆品保质期', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>' }
        ]
        
        const fetchUser = async () => {
            const token = localStorage.getItem('token')
            const res = await fetch(CONFIG.API_URL + '/me', {
                headers: { 'Authorization': 'Bearer ' + token }
            })
            const data = await res.json()
            if (data.success) {
                user.value = data.data
                partner.value = data.data.partner
            }
        }
        
        const connectWS = () => {
            const token = localStorage.getItem('token')
            ws.value = new WebSocket(CONFIG.WS_URL)
            ws.value.onopen = () => ws.value.send(JSON.stringify({ type: 'auth', token }))
            ws.value.onclose = () => { wsTimer = setTimeout(connectWS, 3000) }
        }
        
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && (!ws.value || ws.value.readyState !== 1)) {
                connectWS()
            }
        }
        
        onMounted(() => {
            fetchUser()
            connectWS()
            hbTimer = setInterval(() => ws.value?.readyState === 1 && ws.value.send('{"type":"ping"}'), 30000)
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
        
        return { user, partner, togetherDays, features, showToast, logout }
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

.couple-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 32px 24px; text-align: center; margin-bottom: 24px; }
.couple-avatars { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 24px; }
.avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 28px; overflow: hidden; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.heart { font-size: 24px; }
.days-number { font-size: 48px; font-weight: 800; background: linear-gradient(135deg, #FF6B6B, #FF8E8E); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.days-label { color: var(--text-secondary); font-size: 14px; }

.quick-actions { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.action-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 20px; text-align: center; cursor: pointer; transition: all 0.3s; }
.action-card:active { transform: scale(0.98); }
.action-icon { color: var(--color-primary); margin-bottom: 12px; }
.action-title { font-size: 14px; font-weight: 600; }

.loading-screen { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; }
.loading-spinner { width: 48px; height: 48px; border: 3px solid var(--border-color); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
