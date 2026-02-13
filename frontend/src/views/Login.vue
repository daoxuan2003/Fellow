<template>
    <div class="login-page">
        <div class="login-container">
            <div class="logo-section">
                <svg class="heart-logo" viewBox="0 0 100 100" fill="none">
                    <path d="M50 88C50 88 10 60 10 35C10 20 22 10 35 10C42 10 50 15 50 15C50 15 58 10 65 10C78 10 90 20 90 35C90 60 50 88 50 88Z" fill="url(#gradient)"/>
                    <defs>
                        <linearGradient id="gradient" x1="10" y1="10" x2="90" y2="90">
                            <stop offset="0%" stop-color="#FF6B6B"/>
                            <stop offset="100%" stop-color="#FF8E8E"/>
                        </linearGradient>
                    </defs>
                </svg>
                <h1 class="title">共赴</h1>
                <p class="subtitle">两个人的私密空间</p>
            </div>
            
            <div class="form-section">
                <div class="tabs">
                    <div class="tab" :class="{ active: !isRegister }" @click="isRegister = false">登录</div>
                    <div class="tab" :class="{ active: isRegister }" @click="isRegister = true">注册</div>
                </div>
                
                <form @submit.prevent="handleSubmit">
                    <div class="form-group" v-if="isRegister">
                        <input v-model="form.nickname" type="text" placeholder="昵称" required maxlength="20">
                    </div>
                    <div class="form-group">
                        <input v-model="form.account" type="text" placeholder="账号" required maxlength="20">
                    </div>
                    <div class="form-group">
                        <input v-model="form.password" type="password" placeholder="密码" required minlength="6">
                    </div>
                    <button type="submit" class="submit-btn" :disabled="loading">
                        {{ loading ? '请稍候...' : (isRegister ? '注册' : '登录') }}
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, reactive, inject } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'

export default {
    name: 'Login',
    setup() {
        const router = useRouter()
        const showToast = inject('showToast')
        
        const isRegister = ref(false)
        const loading = ref(false)
        const form = reactive({
            nickname: '',
            account: '',
            password: ''
        })
        
        const handleSubmit = async () => {
            loading.value = true
            try {
                const endpoint = isRegister.value ? '/register' : '/login'
                const res = await fetch(CONFIG.API_URL + endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(form)
                })
                const data = await res.json()
                
                if (data.success) {
                    localStorage.setItem('token', data.data.token)
                    showToast(isRegister.value ? '注册成功' : '登录成功')
                    router.push('/home')
                } else {
                    showToast(data.message)
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                loading.value = false
            }
        }
        
        return { isRegister, loading, form, handleSubmit }
    }
}
</script>

<style scoped>
.login-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.login-container {
    width: 100%;
    max-width: 360px;
}

.logo-section {
    text-align: center;
    margin-bottom: 48px;
}

.heart-logo {
    width: 80px;
    height: 80px;
    margin-bottom: 16px;
    filter: drop-shadow(0 0 20px rgba(255, 107, 107, 0.4));
}

.title {
    font-size: 32px;
    font-weight: 800;
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 8px;
}

.subtitle {
    color: var(--text-tertiary);
    font-size: 14px;
}

.form-section {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 32px 24px;
}

.tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    background: var(--bg-input);
    border-radius: var(--radius-sm);
    padding: 4px;
}

.tab {
    flex: 1;
    text-align: center;
    padding: 12px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s;
}

.tab.active {
    background: var(--color-primary);
    color: white;
}

.form-group {
    margin-bottom: 16px;
}

input {
    width: 100%;
    padding: 16px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    color: var(--text-primary);
    font-size: 15px;
    outline: none;
    transition: all 0.3s;
}

input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.submit-btn {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
    border: none;
    border-radius: var(--radius-md);
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s;
}

.submit-btn:disabled {
    opacity: 0.6;
    cursor: wait;
}
</style>
