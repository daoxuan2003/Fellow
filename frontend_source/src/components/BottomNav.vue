<template>
    <nav class="bottom-nav" aria-label="主导航">
        <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }" aria-label="今天">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"></path>
            </svg>
            <span class="nav-label">今天</span>
        </router-link>
        <router-link to="/album" class="nav-item" :class="{ active: $route.path === '/album' }" aria-label="一起">
            <svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="currentColor" stroke-width="1.7">
                <circle cx="10" cy="12" r="7"></circle>
                <circle cx="18" cy="12" r="7"></circle>
            </svg>
            <span class="nav-label">一起</span>
        </router-link>
        <router-link to="/mood" class="nav-item" :class="{ active: $route.path === '/mood' }" aria-label="记录">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h10v16H4z"></path>
                <path d="m13 15 7-7 2 2-7 7-3 1z"></path>
            </svg>
            <span class="nav-label">记录</span>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: $route.path === '/profile' }" aria-label="我们">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="9"></circle>
                <path d="M8 14s1.4 2 4 2 4-2 4-2"></path>
                <path d="M9 9h.01M15 9h.01"></path>
            </svg>
            <span class="nav-label">我们</span>
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
    max-width: 430px;
    min-height: var(--bottom-nav-height, calc(74px + env(safe-area-inset-bottom, 0px)));
    padding: 8px 18px calc(8px + env(safe-area-inset-bottom, 0px));
    background: oklch(99% 0.006 255 / 0.97);
    backdrop-filter: blur(12px);
    border-top: 1px solid oklch(72% 0.04 250 / 0.2);
    display: flex;
    justify-content: space-around;
    z-index: 100;
    box-sizing: border-box;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    min-width: 56px;
    min-height: 46px;
    padding: 7px 11px;
    color: oklch(37% 0.03 265);
    text-decoration: none;
    transition: color 0.18s ease, transform 0.18s ease;
}

.nav-item:active {
    transform: scale(0.96);
}

.nav-item.active {
    color: #ff6475;
    background: transparent;
}

.nav-label {
    font-size: 11px;
    font-weight: 500;
}

.nav-item svg {
    width: 21px;
    height: 21px;
    stroke-width: 1.85;
}

.nav-item:focus-visible {
    outline: 3px solid color-mix(in oklch, #5d8cff 28%, transparent);
    outline-offset: 3px;
}
</style>
