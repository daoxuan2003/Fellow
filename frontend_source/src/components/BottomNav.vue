<template>
    <div ref="shell" class="bottom-nav-shell" :class="{ 'is-viewport-ready': viewportReady }">
      <nav class="bottom-nav" aria-label="主要导航">
        <router-link to="/home" class="nav-item" :class="{ active: isActive('home') }" aria-label="首页">
            <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                    <path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                </svg>
            </span>
            <small>首页</small>
        </router-link>
        <router-link to="/album" class="nav-item" :class="{ active: isActive('together') }" aria-label="相册">
            <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5" />
                </svg>
            </span>
            <small>相册</small>
        </router-link>
        <router-link to="/mood" class="nav-item" :class="{ active: isActive('record') }" aria-label="心情">
            <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13 21h8" />
                    <path d="m15 5 4 4" />
                    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
                </svg>
            </span>
            <small>心情</small>
        </router-link>
        <router-link to="/profile" class="nav-item" :class="{ active: isActive('profile') }" aria-label="我的">
            <span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M17.925 20.056a6 6 0 0 0-11.851.001" />
                    <circle cx="12" cy="11" r="4" />
                    <circle cx="12" cy="12" r="10" />
                </svg>
            </span>
            <small>我的</small>
        </router-link>
      </nav>
    </div>
</template>

<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

const $route = useRoute()
const shell = ref(null)
const viewportReady = ref(false)
let repaintFrame = 0
const refreshTimers = new Set()

const props = defineProps({
    accent: { type: String, default: '#5f8bef' },
    activeKey: { type: String, default: '' }
})

const routeKey = {
    home: '/home',
    together: '/album',
    record: '/mood',
    profile: '/profile'
}

const isActive = (key) => props.activeKey ? props.activeKey === key : $route.path === routeKey[key]

function syncViewportDock() {
    cancelAnimationFrame(repaintFrame)
    repaintFrame = requestAnimationFrame(async () => {
        await nextTick()
        const viewport = window.visualViewport
        const layoutHeight = Math.max(
            document.documentElement.clientHeight || 0,
            window.innerHeight || 0
        )
        const visibleBottom = viewport
            ? viewport.height + viewport.offsetTop
            : layoutHeight
        const keyboardLikelyOpen = viewport && viewport.height < layoutHeight * 0.72
        const viewportOffset = keyboardLikelyOpen
            ? 0
            : Math.max(0, Math.round(layoutHeight - visibleBottom))

        shell.value?.style.setProperty('--bottom-nav-viewport-offset', `${viewportOffset}px`)
        shell.value?.getBoundingClientRect()
        viewportReady.value = true
    })
}

function clearRefreshTimers() {
    refreshTimers.forEach(timer => window.clearTimeout(timer))
    refreshTimers.clear()
}

function refreshViewportDock() {
    viewportReady.value = false
    clearRefreshTimers()
    syncViewportDock()
    ;[80, 240, 600].forEach(delay => {
        const timer = window.setTimeout(() => {
            refreshTimers.delete(timer)
            syncViewportDock()
        }, delay)
        refreshTimers.add(timer)
    })
}

function refreshWhenVisible() {
    if (document.visibilityState === 'visible') refreshViewportDock()
}

onMounted(() => {
    refreshViewportDock()
    window.addEventListener('pageshow', refreshViewportDock)
    window.addEventListener('resize', refreshViewportDock)
    window.addEventListener('orientationchange', refreshViewportDock)
    window.visualViewport?.addEventListener('resize', refreshViewportDock)
    window.visualViewport?.addEventListener('scroll', refreshViewportDock)
    document.addEventListener('visibilitychange', refreshWhenVisible)
})

onBeforeUnmount(() => {
    cancelAnimationFrame(repaintFrame)
    clearRefreshTimers()
    window.removeEventListener('pageshow', refreshViewportDock)
    window.removeEventListener('resize', refreshViewportDock)
    window.removeEventListener('orientationchange', refreshViewportDock)
    window.visualViewport?.removeEventListener('resize', refreshViewportDock)
    window.visualViewport?.removeEventListener('scroll', refreshViewportDock)
    document.removeEventListener('visibilitychange', refreshWhenVisible)
})
</script>

<style scoped>
.bottom-nav-shell {
    position: fixed;
    right: 0;
    bottom: var(--bottom-nav-viewport-offset, 0px);
    left: 0;
    z-index: var(--fellow-z-navigation, 100);
    box-sizing: border-box;
    min-height: var(--bottom-nav-height, calc(74px + env(safe-area-inset-bottom, 0px)));
    padding-bottom: max(0px, env(safe-area-inset-bottom, 0px));
    border-top: 3px solid var(--fellow-ink, #25242d);
    background: var(--fellow-paper, #fffaf5);
    box-shadow: 0 -4px 0 rgba(37, 36, 45, 0.08);
    transform: translate3d(0, .01px, 0);
    backface-visibility: hidden;
}

.bottom-nav-shell.is-viewport-ready { transform: translate3d(0, 0, 0); }

.bottom-nav-shell::after {
    content: '';
    position: absolute;
    right: 0;
    bottom: calc(-32px - var(--bottom-nav-viewport-offset, 0px));
    left: 0;
    height: calc(var(--bottom-nav-viewport-offset, 0px) + 32px);
    background: var(--fellow-paper, #fffaf5);
    pointer-events: none;
}

.bottom-nav {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    width: min(100%, 460px);
    min-height: 71px;
    margin: 0 auto;
    padding: 7px 10px 6px;
    box-sizing: border-box;
}

.nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    min-width: 0;
    min-height: 58px;
    padding: 3px 2px 1px;
    border-radius: 9px;
    color: #686772;
    text-decoration: none;
}

.nav-item > span {
    display: grid;
    place-items: center;
    width: 40px;
    height: 31px;
    border: 2px solid transparent;
    border-radius: 9px;
}

.nav-item svg {
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
}

.nav-item small {
    font-size: 11px;
    font-weight: 900;
}

.nav-item.active {
    color: var(--fellow-ink, #25242d);
}

.nav-item.active > span {
    background: var(--fellow-yellow, #fff1a8);
    border-color: var(--fellow-ink, #25242d);
    box-shadow: 2px 2px 0 var(--fellow-ink, #25242d);
}

.nav-item.active[aria-label="相册"] svg {
    fill: currentColor;
}

.nav-item:focus-visible {
    outline: 3px solid rgba(33, 95, 143, 0.42);
    outline-offset: -1px;
}

@media (min-width: 700px) {
    .bottom-nav {
        width: 460px;
    }
}
</style>
