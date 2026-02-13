<template>
    <nav class="bottom-nav">
        <router-link to="/home" class="nav-item" :class="{ active: $route.path === '/home' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <span class="nav-label">首页</span>
        </router-link>
        <a href="#" class="nav-item" @click.prevent="$emit('toast', '相册功能开发中')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span class="nav-label">相册</span>
        </a>
        <a href="#" class="nav-item" @click.prevent="$emit('toast', '心愿墙功能开发中')">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <span class="nav-label">心愿</span>
        </a>
        <router-link to="/profile" class="nav-item" :class="{ active: $route.path === '/profile' }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
            </svg>
            <span class="nav-label">我的</span>
        </router-link>
    </nav>
</template>

<style scoped>
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 480px;
    padding: 12px 24px calc(12px + env(safe-area-inset-bottom));
    background: rgba(10, 10, 15, 0.9);
    backdrop-filter: blur(20px);
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: space-around;
    z-index: 100;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 16px;
    color: var(--text-tertiary);
    text-decoration: none;
    transition: all 0.3s;
    border-radius: 12px;
}

.nav-item.active {
    color: var(--color-primary);
    background: rgba(255, 107, 107, 0.1);
}

.nav-label {
    font-size: 11px;
    font-weight: 500;
}
</style>
