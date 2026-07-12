<template>
    <nav class="bottom-nav" aria-label="主导航">
        <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }" aria-label="首页">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="nav-label">首页</span>
        </router-link>
        <router-link to="/express" class="nav-item" :class="{ active: $route.path === '/express' }" aria-label="快递">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span class="nav-label">快递</span>
        </router-link>
        <router-link to="/mood" class="nav-item" :class="{ active: $route.path === '/mood' }" aria-label="心情">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            <span class="nav-label">心情</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: $route.path === '/profile' }" aria-label="我的">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-label">我的</span>
        </router-link>
    </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

const $route = useRoute()
</script>

<style scoped>
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    padding: 9px 18px calc(9px + env(safe-area-inset-bottom, 0px));
    background: rgba(251, 248, 250, 0.97);
    backdrop-filter: none;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-around;
    z-index: 100;
    box-sizing: border-box;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    min-width: 58px;
    min-height: 48px;
    padding: 8px 12px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
    border-radius: 10px;
}

.nav-item:active {
    transform: scale(0.96);
}

.nav-item.active {
    color: #FFFFFF;
    background: var(--color-primary-deep);
}

.nav-label {
    font-size: 11px;
    font-weight: 700;
}

.nav-item svg {
    width: 22px;
    height: 22px;
    stroke-width: 1.9;
}

.nav-item:focus-visible {
    outline: 3px solid rgba(150, 54, 83, 0.28);
    outline-offset: 3px;
}
</style>
