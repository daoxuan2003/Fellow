<template>
    <div class="login-page">
        <main class="login-paper-app">
            <div class="login-paper-photos" aria-hidden="true">
                <i></i><i></i><i></i>
            </div>

            <section class="login-paper-content" aria-labelledby="login-title">
                <div class="login-couple-mark" aria-hidden="true">
                    <CoupleThread />
                </div>

                <div class="login-paper-brand">
                    <h1 id="login-title">共赴</h1>
                    <p>两个人的私密生活</p>
                </div>

                <p class="login-welcome">{{ isRegister ? '从今天起，把日子写成我们' : '欢迎回来，今天也一起' }}</p>

                <form class="login-paper-card" @submit.prevent="handleSubmit">
                    <label v-if="isRegister" class="paper-field">
                        <span>昵称</span>
                        <span class="paper-input-row">
                            <i aria-hidden="true">人</i>
                            <input
                                v-model="form.nickname"
                                type="text"
                                placeholder="怎么称呼你"
                                required
                                maxlength="20"
                                autocomplete="nickname"
                            >
                        </span>
                    </label>

                    <label class="paper-field">
                        <span>账号</span>
                        <span class="paper-input-row">
                            <i aria-hidden="true">@</i>
                            <input
                                v-model="form.account"
                                type="text"
                                placeholder="邮箱或手机号"
                                required
                                autocomplete="username"
                            >
                        </span>
                    </label>

                    <label class="paper-field">
                        <span>密码</span>
                        <span class="paper-input-row">
                            <i aria-hidden="true">⌑</i>
                            <input
                                v-model="form.password"
                                type="password"
                                :placeholder="isRegister ? '至少6位密码' : '输入密码'"
                                required
                                minlength="6"
                                :autocomplete="isRegister ? 'new-password' : 'current-password'"
                            >
                        </span>
                    </label>

                    <button type="submit" class="login-paper-submit" :disabled="loading">
                        <span v-if="loading" class="spinner"></span>
                        {{ loading ? (isRegister ? '注册中' : '登录中') : (isRegister ? '开始我们的故事' : '进入我们的空间') }}
                    </button>
                </form>

                <button type="button" class="login-mode-switch" @click="isRegister = !isRegister">
                    {{ isRegister ? '已经有账号？返回登录' : '还没有账号？创建我们的空间' }}
                </button>
            </section>

            <footer class="login-paper-footer">
                <p>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <rect x="4" y="10" width="16" height="11" rx="3"></rect>
                        <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
                    </svg>
                    你们的故事，只属于你们
                </p>
                <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">吉ICP备2026000987号-1</a>
            </footer>
        </main>

        <div
            class="toast login-paper-toast"
            :class="{ show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <span>{{ toast.message }}</span>
        </div>

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
import CoupleThread from '../components/CoupleThread.vue'


export default {
    name: 'Login',
    components: { CoupleThread },
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

/* 7.0.1 登录页：按参考图重排现有登录/注册能力 */
.login-page {
    min-height: 100dvh;
    overflow: hidden;
    background: #f8f4ed;
}

.login-page > .bg-container,
.login-page > .app,
.login-page > .toast:not(.login-paper-toast) {
    display: none;
}

.login-paper-app {
    position: relative;
    width: min(100%, 430px);
    min-height: 100dvh;
    margin: 0 auto;
    overflow: hidden;
    color: #292620;
    background:
        radial-gradient(circle at 13% 6%, rgba(225, 187, 142, 0.16), transparent 26%),
        radial-gradient(circle at 87% 82%, rgba(134, 170, 190, 0.12), transparent 29%),
        linear-gradient(165deg, #fbf8f2 0%, #f5efe6 62%, #faf7f1 100%);
    font-family: "SF Pro Text", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
    box-shadow: 0 0 42px rgba(91, 69, 45, 0.12);
}

.login-paper-app::after {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.2;
    background-image:
        repeating-linear-gradient(0deg, rgba(97, 75, 51, 0.025) 0 1px, transparent 1px 4px),
        repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0 1px, transparent 1px 5px);
    mix-blend-mode: multiply;
}

.login-paper-photos {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.29;
}

.login-paper-photos i {
    position: absolute;
    width: 132px;
    height: 104px;
    border: 8px solid rgba(255, 253, 248, 0.72);
    border-bottom-width: 21px;
    background:
        linear-gradient(155deg, rgba(208, 190, 169, 0.6), rgba(151, 166, 162, 0.35));
    box-shadow: 0 8px 18px rgba(89, 69, 48, 0.07);
}

.login-paper-photos i::before,
.login-paper-photos i::after {
    content: '';
    position: absolute;
    bottom: 0;
    width: 58px;
    height: 62px;
    border-radius: 50% 50% 18% 18%;
    background: rgba(105, 114, 109, 0.18);
}

.login-paper-photos i::before { left: 16px; }
.login-paper-photos i::after { right: 9px; background: rgba(185, 137, 104, 0.16); }
.login-paper-photos i:nth-child(1) { top: 7%; left: -72px; transform: rotate(-12deg); }
.login-paper-photos i:nth-child(2) { top: 10%; right: -78px; transform: rotate(13deg); }
.login-paper-photos i:nth-child(3) { right: -70px; bottom: 5%; transform: rotate(-9deg); opacity: 0.6; }

.login-paper-content {
    position: relative;
    z-index: 2;
    width: min(350px, calc(100% - 48px));
    margin: 0 auto;
    padding-top: clamp(112px, 21.5vh, 202px);
    text-align: center;
}

.login-couple-mark {
    position: relative;
    width: 254px;
    height: 48px;
    margin: 0 auto 13px;
}

.login-couple-mark .line {
    position: absolute;
    top: 25px;
    width: 126px;
    border-top: 2px solid #df8062;
}

.login-couple-mark .line.warm {
    left: 0;
    border-radius: 0 90% 0 0;
    transform: rotate(1.4deg);
}

.login-couple-mark .line.cool {
    right: 0;
    border-color: #86a9c3;
    border-radius: 90% 0 0 0;
    transform: rotate(-1.4deg);
}

.login-couple-mark .heart {
    position: absolute;
    top: 0;
    color: #df8062;
    font: 39px/1 Georgia, serif;
    font-style: normal;
}

.login-couple-mark .heart.warm { left: 105px; transform: rotate(-16deg) scaleX(0.86); }
.login-couple-mark .heart.cool { left: 124px; color: #86a9c3; transform: rotate(16deg) scaleX(0.86); }

.login-paper-brand h1 {
    margin: 0;
    font-family: "Songti SC", "STSong", "Noto Serif CJK SC", serif;
    font-size: 42px;
    line-height: 1.1;
    font-weight: 600;
    letter-spacing: 0.16em;
    text-indent: 0.16em;
}

.login-paper-brand p {
    margin: 9px 0 0;
    color: #7c7871;
    font-family: "Songti SC", "STSong", serif;
    font-size: 15px;
    letter-spacing: 0.08em;
}

.login-welcome {
    margin: 29px 0 14px;
    color: #d8744f;
    font-size: 14px;
    letter-spacing: 0.04em;
}

.login-paper-card {
    padding: 11px 18px 18px;
    border: 1px solid rgba(113, 91, 65, 0.09);
    border-radius: 14px;
    background:
        repeating-linear-gradient(0deg, rgba(90, 71, 50, 0.015) 0 1px, transparent 1px 4px),
        rgba(248, 243, 235, 0.96);
    box-shadow:
        0 8px 20px rgba(84, 62, 40, 0.08),
        inset 0 1px 0 rgba(255, 255, 255, 0.82);
    text-align: left;
}

.paper-field {
    display: block;
    padding: 11px 0 9px;
    border-bottom: 1px solid rgba(117, 99, 78, 0.12);
}

.paper-field > span:first-child {
    display: block;
    margin: 0 0 6px 4px;
    color: #686159;
    font-size: 11px;
    font-weight: 600;
}

.paper-input-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.paper-input-row i {
    width: 20px;
    color: #77716a;
    font-family: Georgia, serif;
    font-size: 16px;
    font-style: normal;
    text-align: center;
}

.paper-input-row input {
    min-width: 0;
    flex: 1;
    padding: 4px 0;
    border: 0;
    outline: 0;
    color: #2e2a25;
    background: transparent;
    font: 14px/1.4 inherit;
}

.paper-input-row input::placeholder { color: #aaa39a; }

.login-paper-submit {
    width: 100%;
    min-height: 50px;
    margin-top: 18px;
    border: 0;
    border-radius: 11px;
    color: #fffaf5;
    background: linear-gradient(135deg, #e28661, #d96f4d);
    box-shadow: 0 7px 14px rgba(174, 90, 56, 0.22);
    font: 600 15px/1 inherit;
    letter-spacing: 0.06em;
    cursor: pointer;
}

.login-paper-submit:disabled { opacity: 0.62; cursor: wait; }
.login-paper-submit:focus-visible,
.login-mode-switch:focus-visible,
.paper-input-row input:focus-visible { outline: 3px solid rgba(223, 128, 98, 0.3); outline-offset: 2px; }

.login-mode-switch {
    margin-top: 21px;
    padding: 7px;
    border: 0;
    color: #8d867e;
    background: transparent;
    font: 12px/1.3 inherit;
    cursor: pointer;
}

.login-paper-footer {
    position: absolute;
    z-index: 2;
    right: 0;
    bottom: clamp(21px, 4.8vh, 45px);
    left: 0;
    text-align: center;
}

.login-paper-footer p {
    margin: 0 0 8px;
    color: #8a847c;
    font-family: "Songti SC", "STSong", serif;
    font-size: 12px;
}

.login-paper-footer p svg { margin-right: 4px; color: #d77d59; vertical-align: -2px; }
.login-paper-footer a { color: #aaa39a; font-size: 9px; text-decoration: none; }

.login-paper-toast {
    top: max(28px, env(safe-area-inset-top));
    border-color: rgba(128, 101, 73, 0.12);
    border-radius: 12px;
    background: rgba(255, 251, 245, 0.96);
    box-shadow: 0 8px 24px rgba(78, 58, 38, 0.14);
}

/* 青春主题：与首页统一珊瑚红、晴空蓝、薄荷绿和冷白底色 */
.login-page {
    background: oklch(95% 0.018 252);
}

.login-paper-app {
    color: oklch(29% 0.03 265);
    background:
        radial-gradient(circle at 8% 7%, oklch(94% 0.06 12), transparent 29%),
        radial-gradient(circle at 92% 80%, oklch(93% 0.06 250), transparent 31%),
        radial-gradient(circle at 16% 91%, oklch(95% 0.055 166), transparent 24%),
        linear-gradient(165deg, oklch(99% 0.006 255), oklch(97% 0.018 252));
    box-shadow: 0 0 36px oklch(38% 0.04 265 / 0.1);
}

.login-paper-app::after,
.login-paper-photos { display: none; }

.login-couple-mark {
    --thread-warm: #ff6475;
    --thread-cool: #5d8cff;
    height: 42px;
}

.login-couple-mark .couple-thread {
    width: 100%;
    height: 42px;
}

.login-paper-brand h1 { color: oklch(28% 0.035 265); }
.login-paper-brand p { color: oklch(47% 0.035 265); }
.login-welcome { color: #f14f66; }

.login-paper-card {
    border: 0;
    background: oklch(99% 0.006 255 / 0.9);
    box-shadow: 0 4px 8px oklch(38% 0.04 265 / 0.1);
}

.paper-field { border-color: oklch(72% 0.04 250 / 0.2); }
.paper-field > span:first-child { color: oklch(43% 0.035 265); }
.paper-input-row i { color: #5d8cff; }
.paper-input-row input { color: oklch(27% 0.03 265); }
.paper-input-row input::placeholder { color: oklch(51% 0.03 265); }

.login-paper-submit {
    color: #fff;
    background: #ff6475;
    box-shadow: 0 4px 8px oklch(56% 0.18 15 / 0.24);
}

.login-paper-submit:focus-visible,
.login-mode-switch:focus-visible,
.paper-input-row input:focus-visible {
    outline-color: color-mix(in oklch, #5d8cff 30%, transparent);
}

.login-mode-switch { color: oklch(43% 0.035 265); }
.login-paper-footer p { color: oklch(46% 0.03 265); }
.login-paper-footer p svg { color: #ff6475; }
.login-paper-footer a { color: oklch(51% 0.025 265); }

.login-paper-toast {
    border-color: oklch(71% 0.04 250 / 0.2);
    background: oklch(99% 0.006 255 / 0.96);
    box-shadow: 0 6px 18px oklch(37% 0.04 265 / 0.14);
}

@media (max-height: 760px) {
    .login-paper-content { padding-top: 76px; }
    .login-couple-mark { margin-bottom: 7px; }
    .login-paper-brand h1 { font-size: 36px; }
    .login-welcome { margin-top: 18px; }
    .login-paper-card { padding-top: 6px; padding-bottom: 13px; }
    .paper-field { padding-top: 7px; padding-bottom: 7px; }
    .login-paper-submit { min-height: 45px; margin-top: 13px; }
    .login-mode-switch { margin-top: 10px; }
    .login-paper-footer { bottom: 12px; }
}
</style>
