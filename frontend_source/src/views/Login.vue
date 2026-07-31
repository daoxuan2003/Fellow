<template>
  <div class="login-page">
    <span class="login-shape login-shape--blue" aria-hidden="true"></span>
    <span class="login-shape login-shape--yellow" aria-hidden="true"></span>
    <span class="login-shape login-shape--pink" aria-hidden="true"></span>

    <main class="login-shell">
      <header class="login-topbar">
        <div class="login-mini-brand" aria-label="共赴">
          <span class="login-mini-brand__mark" aria-hidden="true"><i></i><b></b></span>
          <span><strong>共赴</strong><small>FELLOW</small></span>
        </div>
        <span class="login-private-badge"><i aria-hidden="true"></i>两个人的空间</span>
      </header>

      <section class="login-hero" aria-labelledby="login-title">
        <CoupleThread class="login-thread" />
        <p class="login-eyebrow">OUR LITTLE WORLD</p>
        <h1 id="login-title">把日子，过成我们</h1>
        <p>记录心情、照片和每一件一起完成的小事。</p>
      </section>

      <section class="login-card" aria-labelledby="login-form-title">
        <div class="login-tabs" role="tablist" aria-label="账号入口">
          <button
            type="button"
            role="tab"
            :aria-selected="!isRegister"
            :class="{ active: !isRegister }"
            @click="isRegister = false"
          >登录</button>
          <button
            type="button"
            role="tab"
            :aria-selected="isRegister"
            :class="{ active: isRegister }"
            @click="isRegister = true"
          >注册</button>
        </div>

        <div class="login-card__heading">
          <span aria-hidden="true">{{ isRegister ? '02' : '01' }}</span>
          <div>
            <h2 id="login-form-title">{{ isRegister ? '创建你们的空间' : '欢迎回到共赴' }}</h2>
            <p>{{ isRegister ? '先认识你，再邀请喜欢的人加入。' : '今天也来看看彼此留下了什么。' }}</p>
          </div>
        </div>

        <form class="login-form" @submit.prevent="handleSubmit">
          <label v-if="isRegister" class="login-field">
            <span>昵称</span>
            <span class="login-control">
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

          <label class="login-field">
            <span>账号</span>
            <span class="login-control">
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

          <label class="login-field">
            <span>密码</span>
            <span class="login-control">
              <i aria-hidden="true">密</i>
              <input
                v-model="form.password"
                type="password"
                :placeholder="isRegister ? '至少 6 位密码' : '输入密码'"
                required
                minlength="6"
                :autocomplete="isRegister ? 'new-password' : 'current-password'"
              >
            </span>
          </label>

          <button type="submit" class="login-submit" :disabled="loading">
            <span v-if="loading" class="login-spinner" aria-hidden="true"></span>
            {{ loading ? (isRegister ? '正在创建' : '正在进入') : (isRegister ? '开始我们的故事' : '进入我们的空间') }}
            <span v-if="!loading" aria-hidden="true">→</span>
          </button>
        </form>

        <p class="login-card__note">
          <span aria-hidden="true"></span>
          {{ isRegister ? '注册后会生成专属配对码' : '只同步给与你配对的那个人' }}
        </p>
      </section>

      <footer class="login-footer">
        <span>PRIVATE BY DEFAULT</span>
        <a href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">吉ICP备2026000987号-1</a>
      </footer>
    </main>

    <div
      class="toast"
      :class="{ 'login-toast': true, show: toast.show, success: toast.type === 'success', error: toast.type === 'error' }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >{{ toast.message }}</div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import CoupleThread from '../components/CoupleThread.vue'

const router = useRouter()
const userStore = useUserStore()
const isRegister = ref(false)
const loading = ref(false)
const form = reactive({ nickname: '', account: '', password: '' })
const toast = ref({ show: false, message: '', type: 'info', timer: null })

onMounted(() => {
  if (localStorage.getItem('token')) router.push('/home')
})

function showToast(message, type = 'info') {
  if (toast.value.timer) clearTimeout(toast.value.timer)
  toast.value = { show: true, message, type, timer: null }
  toast.value.timer = setTimeout(() => { toast.value.show = false }, 2500)
}

async function handleSubmit() {
  if (loading.value) return
  loading.value = true
  try {
    const endpoint = isRegister.value ? '/register' : '/login'
    const body = isRegister.value
      ? { nickname: form.nickname, account: form.account, password: form.password }
      : { account: form.account, password: form.password }
    const response = await fetch(CONFIG.API_URL + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const result = await response.json()
    if (!result.success) throw new Error(result.message || '暂时无法进入，请稍后再试')

    const newToken = result.data.token
    localStorage.setItem('token', newToken)
    localStorage.removeItem('currentUserId')
    userStore.$patch({ user: null, partner: null, userId: null, lastFetchTime: 0 })
    userStore.setToken(newToken)
    showToast(isRegister.value ? '空间创建好了' : '欢迎回来', 'success')
    setTimeout(() => router.push('/home'), 300)
  } catch (requestError) {
    showToast(requestError.message || '网络开小差了，请稍后再试', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  --ink: var(--fellow-ink, #20202a);
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  overflow-x: hidden;
  overflow-y: auto;
  color: var(--ink);
  background:
    linear-gradient(152deg, var(--fellow-blue, #58c8f5) 0 31%, var(--fellow-mint, #75dfc1) 31% 59%, var(--fellow-yellow, #ffd94a) 59% 100%);
}

.login-page::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(160deg, rgba(255, 255, 255, .16), transparent 42%);
}

.login-shape { position: fixed; pointer-events: none; border: 3px solid var(--ink); }
.login-shape--blue { top: 11%; left: -34px; width: 78px; height: 78px; border-radius: 50%; background: #fff; }
.login-shape--yellow { top: 19%; right: -19px; width: 42px; height: 42px; background: var(--fellow-yellow, #ffd94a); transform: rotate(18deg); }
.login-shape--pink { right: 7%; bottom: 4%; width: 28px; height: 28px; border-radius: 50%; background: var(--fellow-pink, #ff7fa5); }

.login-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  width: min(100%, 430px);
  min-height: 100vh;
  min-height: 100svh;
  min-height: 100dvh;
  margin: 0 auto;
  padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(14px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
}

.login-topbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 48px; }
.login-mini-brand { display: flex; align-items: center; gap: 9px; }
.login-mini-brand__mark { position: relative; width: 36px; height: 32px; flex: none; border: 3px solid var(--ink); border-radius: 48% 52% 44% 56%; background: var(--fellow-yellow, #ffd94a); box-shadow: 3px 3px 0 var(--ink); transform: rotate(-7deg); }
.login-mini-brand__mark i,
.login-mini-brand__mark b { position: absolute; top: 10px; width: 5px; height: 7px; border-radius: 50%; background: var(--ink); }
.login-mini-brand__mark i { left: 8px; }
.login-mini-brand__mark b { right: 7px; }
.login-mini-brand > span:last-child { display: grid; line-height: 1; }
.login-mini-brand strong { font-size: 18px; font-weight: 950; letter-spacing: -.05em; }
.login-mini-brand small { margin-top: 4px; font-size: 8px; font-weight: 950; letter-spacing: .14em; }
.login-private-badge { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 10px; border: 2px solid var(--ink); border-radius: 999px; background: #fff; box-shadow: 2px 2px 0 var(--ink); font-size: 10px; font-weight: 900; }
.login-private-badge i { width: 7px; height: 7px; border: 2px solid var(--ink); border-radius: 50%; background: var(--fellow-pink, #ff7fa5); }

.login-hero { padding: clamp(34px, 8vh, 76px) 6px 22px; text-align: center; }
.login-thread { width: min(218px, 68vw); height: auto; margin: 0 auto 8px; --thread-warm: var(--fellow-pink, #ff7fa5); --thread-cool: #2f78d0; }
.login-eyebrow { margin: 0 0 7px; font-size: 9px; font-weight: 950; letter-spacing: .18em; }
.login-hero h1 { margin: 0; font-size: clamp(31px, 8vw, 38px); font-weight: 950; line-height: 1.16; letter-spacing: -.07em; }
.login-hero > p:last-child { max-width: 292px; margin: 10px auto 0; font-size: 13px; font-weight: 750; line-height: 1.55; }

.login-card { padding: 14px; border: 3px solid var(--ink); border-radius: 16px; background: var(--fellow-paper, #fffaf5); box-shadow: 6px 7px 0 var(--ink); }
.login-tabs { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; padding: 5px; border: 2px solid var(--ink); border-radius: 11px; background: #fff; }
.login-tabs button { min-height: 44px; border: 0; border-radius: 7px; color: #66636e; background: transparent; font: inherit; font-size: 13px; font-weight: 950; cursor: pointer; }
.login-tabs button.active { color: var(--ink); background: var(--fellow-yellow, #ffd94a); box-shadow: inset 0 0 0 2px var(--ink); }

.login-card__heading { display: grid; grid-template-columns: 42px 1fr; align-items: center; gap: 10px; margin: 15px 2px 12px; }
.login-card__heading > span { display: grid; width: 38px; height: 38px; place-items: center; border: 2px solid var(--ink); border-radius: 50%; background: var(--fellow-blue, #58c8f5); font-size: 11px; font-weight: 950; }
.login-card__heading h2 { margin: 0; font-size: 18px; font-weight: 950; letter-spacing: -.04em; }
.login-card__heading p { margin: 3px 0 0; color: #66636e; font-size: 11px; font-weight: 750; line-height: 1.4; }

.login-form { display: grid; gap: 10px; }
.login-field { display: grid; gap: 5px; }
.login-field > span:first-child { padding-left: 3px; font-size: 11px; font-weight: 950; }
.login-control { display: grid; grid-template-columns: 40px 1fr; min-height: 50px; overflow: hidden; border: 2.5px solid var(--ink); border-radius: 10px; background: #fff; box-shadow: 2px 3px 0 rgba(32, 32, 42, .18); }
.login-control i { display: grid; place-items: center; border-right: 2px solid var(--ink); background: color-mix(in srgb, var(--fellow-mint, #75dfc1) 54%, white); font-size: 12px; font-style: normal; font-weight: 950; }
.login-field:nth-of-type(2) .login-control i { background: color-mix(in srgb, var(--fellow-blue, #58c8f5) 48%, white); }
.login-field:last-of-type .login-control i { background: color-mix(in srgb, var(--fellow-pink, #ff7fa5) 42%, white); }
.login-control input { min-width: 0; width: 100%; padding: 0 12px; color: var(--ink); background: transparent; font: inherit; font-size: 16px; font-weight: 750; }
.login-control input::placeholder { color: #99969f; font-weight: 650; }
.login-control:focus-within { box-shadow: 3px 4px 0 var(--ink); transform: translate(-1px, -1px); }

.login-submit { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; min-height: 50px; margin-top: 4px; border: 3px solid var(--ink); border-radius: 10px; color: var(--ink); background: var(--fellow-pink, #ff7fa5); box-shadow: 4px 5px 0 var(--ink); font: inherit; font-size: 14px; font-weight: 950; cursor: pointer; }
.login-submit:active:not(:disabled) { box-shadow: 1px 2px 0 var(--ink); transform: translate(3px, 3px); }
.login-submit:disabled { opacity: .62; cursor: wait; }
.login-spinner { width: 16px; height: 16px; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%; animation: login-spin .8s linear infinite; }
.login-card__note { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 12px 0 0; color: #66636e; font-size: 10px; font-weight: 800; }
.login-card__note span { width: 7px; height: 7px; border: 2px solid var(--ink); border-radius: 50%; background: var(--fellow-mint, #75dfc1); }

.login-footer { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; padding: 20px 3px 0; font-size: 8px; font-weight: 900; letter-spacing: .09em; }
.login-footer a { color: inherit; text-decoration: none; }
.login-toast { position: fixed; z-index: var(--fellow-z-toast, 1100); top: max(18px, env(safe-area-inset-top, 0px)); left: 50%; min-width: min(300px, calc(100% - 32px)); padding: 12px 16px; border: 3px solid var(--ink); border-radius: 10px; background: #fff; box-shadow: 4px 5px 0 var(--ink); color: var(--ink); font-size: 13px; font-weight: 900; text-align: center; opacity: 0; pointer-events: none; transform: translate(-50%, -12px); transition: opacity 140ms ease, transform 140ms ease; }
.login-toast.show { opacity: 1; transform: translate(-50%, 0); }
.login-toast.success { background: var(--fellow-mint, #75dfc1); }
.login-toast.error { background: #ffd8df; }

@keyframes login-spin { to { transform: rotate(360deg); } }

@media (max-height: 720px) {
  .login-hero { padding-top: 20px; padding-bottom: 14px; }
  .login-thread { width: 170px; margin-bottom: 2px; }
  .login-hero h1 { font-size: 29px; }
  .login-card { padding: 12px; }
  .login-card__heading { margin-top: 11px; margin-bottom: 9px; }
  .login-footer { padding-top: 14px; }
}

@media (max-width: 340px) {
  .login-shell { padding-right: 12px; padding-left: 12px; }
  .login-private-badge { padding: 0 8px; font-size: 9px; }
  .login-hero { padding-right: 0; padding-left: 0; }
  .login-card { padding: 11px; }
}

@media (prefers-reduced-motion: reduce) {
  .login-spinner { animation: none; }
  .login-toast { transition: none; }
}
</style>
