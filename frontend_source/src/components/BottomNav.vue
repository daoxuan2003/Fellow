<template>
    <nav class="bottom-nav" :style="{ '--nav-accent': accent }" aria-label="主导航">
        <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }" aria-label="今天">
            <svg class="nav-icon sun" viewBox="0 0 36 36" aria-hidden="true">
                <path d="M18 2.5v4M18 29.5v4M2.5 18h4M29.5 18h4M7.1 7.1l2.9 2.9M26 26l2.9 2.9M28.9 7.1 26 10M10 26l-2.9 2.9" />
                <circle cx="18" cy="18" r="7" />
            </svg>
            <span class="nav-label">今天</span>
        </router-link>
        <router-link to="/album" class="nav-item" :class="{ active: $route.path === '/album' }" aria-label="一起">
            <svg class="nav-icon together" viewBox="0 0 42 32" aria-hidden="true">
                <circle cx="15" cy="16" r="10.5" />
                <circle cx="27" cy="16" r="10.5" />
            </svg>
            <span class="nav-label">一起</span>
        </router-link>
        <router-link to="/mood" class="nav-item" :class="{ active: $route.path === '/mood' }" aria-label="记录">
            <svg class="nav-icon record" viewBox="0 0 36 36" aria-hidden="true">
                <path d="M24.5 6.5H7.5v23h23v-17" />
                <path d="m20 16 10.2-10.2 2.9 2.9L22.9 18.9 18 20z" />
            </svg>
            <span class="nav-label">记录</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: $route.path === '/profile' }" aria-label="我们">
            <svg class="nav-icon us" viewBox="0 0 36 36" aria-hidden="true">
                <circle cx="18" cy="18" r="13" />
                <circle cx="13.5" cy="15" r="1" />
                <circle cx="22.5" cy="15" r="1" />
                <path d="M12 21c1.4 3 3.4 4.5 6 4.5s4.6-1.5 6-4.5" />
            </svg>
            <span class="nav-label">我们</span>
        </router-link>
    </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const $route = useRoute()

defineProps({
    accent: { type: String, default: '#ff6475' }
})
</script>

<style scoped>
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    height: var(--bottom-nav-height, 81px);
    min-height: var(--bottom-nav-height, 81px);
    max-height: var(--bottom-nav-height, 81px);
    padding: 1px 22px max(10px, env(safe-area-inset-bottom, 0px));
    background: rgba(250, 252, 255, 0.96);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(103, 119, 146, 0.18);
    box-shadow: 0 -5px 16px rgba(74, 89, 115, 0.045);
    display: flex;
    justify-content: space-around;
    z-index: 100;
    box-sizing: border-box;
}

.nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 56px;
    min-height: 0;
    padding: 0 11px;
    color: oklch(37% 0.03 265);
    text-decoration: none;
    transition: color 0.18s ease, transform 0.18s ease;
}

.nav-item:active {
    transform: scale(0.96);
}

.nav-item.active {
    color: var(--nav-accent, #ff6475);
    background: transparent;
}

.nav-item::before {
    content: '';
    position: absolute;
    top: -8px;
    width: 18px;
    height: 3px;
    border-radius: 999px;
    background: transparent;
}

.nav-item.active::before { background: var(--nav-accent, #ff6475); }

.nav-label {
    font-size: 11px;
    font-weight: 500;
}

.nav-icon {
    width: 34px;
    height: 31px;
    display: block;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.65;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.nav-icon circle { fill: none; }
.nav-icon.sun { width: 31px; height: 31px; }
.nav-icon.sun circle { fill: currentColor; stroke: currentColor; }
.nav-icon.together { width: 39px; height: 30px; }
.nav-icon.record { width: 33px; height: 31px; }
.nav-icon.us { width: 32px; height: 31px; }
.nav-icon.us circle:not(:first-child) { fill: currentColor; stroke: none; }

.nav-item:focus-visible {
    outline: 3px solid color-mix(in oklch, #5d8cff 28%, transparent);
    outline-offset: 3px;
}
</style>
