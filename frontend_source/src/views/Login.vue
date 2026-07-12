<template>
    <div class="login-page">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="login-backdrop-grid"></div>
        </div>
        
        <!-- 主应用 -->
        <div class="app">
            <!-- Logo区域 -->
            <div class="brand">
                <div class="logo">
                    <svg viewBox="0 0 100 100" fill="none">
                        <path d="M50 88C50 88 10 60 10 35C10 20 22 10 35 10C42 10 50 15 50 15C50 15 58 10 65 10C78 10 90 20 90 35C90 60 50 88 50 88Z" fill="url(#logoGradient)"/>
                        <defs>
                            <linearGradient id="logoGradient" x1="10" y1="10" x2="90" y2="90">
                                <stop offset="0%" stop-color="#E91E63"/>
                                <stop offset="50%" stop-color="#F06292"/>
                                <stop offset="100%" stop-color="#FDD3D5"/>
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <h1 class="brand-title">共赴</h1>
                <p class="brand-subtitle">两个人的私密空间</p>
            </div>
            
            <!-- 卡片容器 -->
            <div class="card">
                <!-- 标签切换 -->
                <div class="tabs">
                    <div class="tab-indicator" :style="{ left: isRegister ? '50%' : '4px', width: 'calc(50% - 8px)' }"></div>
                    <button class="tab" :class="{ active: !isRegister }" @click="isRegister = false">登录</button>
                    <button class="tab" :class="{ active: isRegister }" @click="isRegister = true">注册</button>
                </div>
                
                <!-- 登录表单 -->
                <transition name="form" mode="out-in">
                    <form v-if="!isRegister" key="login" class="form" @submit.prevent="handleSubmit">
                        <div class="input-group">
                            <label>账号</label>
                            <div class="input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="邮箱或手机号"
                                    v-model="form.account"
                                    required
                                >
                                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label>密码</label>
                            <div class="input-wrapper">
                                <input 
                                    type="password" 
                                    placeholder="输入密码"
                                    v-model="form.password"
                                    required
                                    minlength="6"
                                >
                                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-submit" :disabled="loading">
                            <span v-if="loading" class="spinner"></span>
                            {{ loading ? '登录中' : '开启我们的故事' }}
                        </button>
                    </form>
                    
                    <!-- 注册表单 -->
                    <form v-else key="register" class="form" @submit.prevent="handleSubmit">
                        <div class="input-group">
                            <label>昵称</label>
                            <div class="input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="怎么称呼你"
                                    v-model="form.nickname"
                                    required
                                    maxlength="20"
                                >
                                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label>账号</label>
                            <div class="input-wrapper">
                                <input 
                                    type="text" 
                                    placeholder="邮箱或手机号"
                                    v-model="form.account"
                                    required
                                >
                                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="input-group">
                            <label>密码</label>
                            <div class="input-wrapper">
                                <input 
                                    type="password" 
                                    placeholder="至少6位密码"
                                    v-model="form.password"
                                    required
                                    minlength="6"
                                >
                                <svg class="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            </div>
                        </div>
                        
                        <button type="submit" class="btn-submit" :disabled="loading">
                            <span v-if="loading" class="spinner"></span>
                            {{ loading ? '注册中' : '开始我们的故事' }}
                        </button>
                    </form>
                </transition>
            </div>
            
            <!-- 底部提示 -->
            <div class="hint">
                <div class="hint-line">专属配对</div>
                <p>注册后获得配对码，与TA绑定专属空间</p>
            </div>
            
            <!-- ICP备案 -->
            <div class="icp-footer">
                <a href="https://beian.miit.gov.cn/" target="_blank">吉ICP备2026000987号-1</a>
            </div>
        </div>
        
        <!-- Toast -->
        <div
            class="toast"
            :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <svg v-if="toast.type === 'success'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ toast.message }}</span>
        </div>
    </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'


export default {
    name: 'Login',
    setup() {
        const router = useRouter()
        const userStore = useUserStore()
        
        const isRegister = ref(false)
        const loading = ref(false)
        const form = reactive({
            nickname: '',
            account: '',
            password: ''
        })
        
        const toast = ref({ show: false, message: '', type: 'info', timer: null })
        
        onMounted(() => {
            // 简单检查：有 token 就跳转，让 Home 页面自己验证
            const token = localStorage.getItem('token')
            if (token) {
                router.push('/home')
            }
        })
        
        const showToast = (message, type = 'info') => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message, type }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }
        
        const handleSubmit = async () => {
            loading.value = true
            try {
                const endpoint = isRegister.value ? '/register' : '/login'
                const body = isRegister.value 
                    ? { nickname: form.nickname, account: form.account, password: form.password }
                    : { account: form.account, password: form.password }
                
                const res = await fetch(CONFIG.API_URL + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                })
                
                const data = await res.json()
                
                if (data.success) {
                    // 先设置新 token，再清除其他数据（避免 clearUser 清掉 token）
                    const newToken = data.data.token
                    
                    localStorage.setItem('token', newToken)
                    localStorage.removeItem('currentUserId')  // 强制 Home 页面重新获取数据
                    
                    // 清除 store 中的旧用户数据，但保留新 token
                    userStore.$patch({
                        user: null,
                        partner: null,
                        userId: null,
                        lastFetchTime: 0
                    })
                    userStore.setToken(newToken)
                    
                    showToast(isRegister.value ? '注册成功' : '登录成功', 'success')
                    setTimeout(() => router.push('/home'), 300)
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                loading.value = false
            }
        }
        
        return { isRegister, loading, form, handleSubmit, toast }
    }
}
</script>

<style scoped>
/* ============================================
   页面基础
   ============================================ */

.login-page {
    min-height: 100vh;
    position: relative;
}

/* ============================================
   背景动画
   ============================================ */

.bg-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    overflow: hidden;
    background:
        linear-gradient(145deg, rgba(255, 255, 255, 0.78), rgba(231, 241, 238, 0.82)),
        linear-gradient(90deg, rgba(23, 107, 104, 0.09), rgba(194, 65, 95, 0.07));
}

.login-backdrop-grid {
    position: absolute;
    inset: 0;
    background:
        repeating-linear-gradient(
            0deg,
            rgba(31, 42, 49, 0.028) 0,
            rgba(31, 42, 49, 0.028) 1px,
            transparent 1px,
            transparent 72px
        ),
        repeating-linear-gradient(
            90deg,
            rgba(31, 42, 49, 0.025) 0,
            rgba(31, 42, 49, 0.025) 1px,
            transparent 1px,
            transparent 72px
        );
}

/* ============================================
   主容器
   ============================================ */

.app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 48px 24px;
}

/* ============================================
   Logo区域
   ============================================ */

.brand {
    text-align: center;
    margin-bottom: 48px;
    margin-top: 24px;
}

.logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 24px;
    position: relative;
}

.logo svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 20px rgba(255, 107, 107, 0.4));
    animation: heartbeat 2s ease-in-out infinite;
}

@keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.08); }
    28% { transform: scale(1); }
    42% { transform: scale(1.05); }
    70% { transform: scale(1); }
}

.brand-title {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: 0;
    color: var(--color-primary);
}

.brand-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-top: 8px;
    letter-spacing: 0;
}

/* ============================================
   卡片容器 - Glass Card
   ============================================ */

.card {
    background: var(--bg-card);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 32px;
    box-shadow: 
        0 22px 70px rgba(31, 42, 49, 0.12),
        inset 0 1px 0 rgba(255, 255, 255, 0.45);
}

/* ============================================
   标签切换 - Animated Tabs
   ============================================ */

.tabs {
    display: flex;
    gap: 8px;
    padding: 4px;
    background: var(--bg-input);
    border-radius: var(--radius-lg);
    margin-bottom: 32px;
    position: relative;
}

.tab {
    flex: 1;
    padding: 14px 24px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border-radius: var(--radius-md);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 1;
}

.tab.active {
    color: var(--text-primary);
}

.tab-indicator {
    position: absolute;
    height: calc(100% - 8px);
    background: linear-gradient(135deg, rgba(241, 101, 137, 0.2) 0%, rgba(255, 151, 175, 0.15) 100%);
    border-radius: var(--radius-md);
    border: 1px solid rgba(241, 101, 137, 0.2);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    top: 4px;
}

/* ============================================
   表单样式
   ============================================ */

.form {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.input-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 8px;
    padding-left: 4px;
}

.input-wrapper {
    position: relative;
}

.input-wrapper input {
    width: 100%;
    padding: 16px 16px 16px 48px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--text-primary);
    outline: none;
    transition: all 0.3s ease;
}

.input-wrapper input:focus {
    border-color: var(--border-focus);
    background: rgba(255, 255, 255, 0.3);
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.input-wrapper input::placeholder {
    color: var(--text-tertiary);
}

.input-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-tertiary);
    transition: color 0.3s ease;
    pointer-events: none;
}

.input-wrapper input:focus ~ .input-icon {
    color: var(--color-primary);
}

/* ============================================
   提交按钮
   ============================================ */

.btn-submit {
    width: 100%;
    padding: 18px;
    margin-top: 12px;
    border: none;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
}

.btn-submit::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent
    );
    transition: left 0.5s ease;
}

.btn-submit:hover::before {
    left: 100%;
}

.btn-submit:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
}

.btn-submit:active {
    transform: translateY(0);
}

.btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
}

.spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 8px;
    vertical-align: middle;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* ============================================
   底部提示
   ============================================ */

.hint {
    text-align: center;
    margin-top: 32px;
    padding: 0 24px;
}

.hint-line {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-primary);
    letter-spacing: 0;
    margin-bottom: 8px;
}

.hint p {
    font-size: 13px;
    color: var(--text-tertiary);
}

/* ============================================
   表单切换动画
   ============================================ */

.form-enter-active,
.form-leave-active {
    transition: all 0.3s ease;
}

.form-enter-from {
    opacity: 0;
    transform: translateX(-20px);
}

.form-leave-to {
    opacity: 0;
    transform: translateX(20px);
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
    transition: all 0.3s ease;
    z-index: 9999;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}

.toast.success {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(34, 197, 94, 0.15);
}

.toast.error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.15);
}

/* ICP备案 */
.icp-footer {
    margin-top: 32px;
    padding: 20px 0;
    text-align: center;
    font-size: 12px;
    color: var(--text-tertiary);
}

.icp-footer a {
    color: var(--text-tertiary);
    text-decoration: none;
    transition: color 0.3s ease;
}

.icp-footer a:hover {
    color: var(--text-secondary);
}
</style>
