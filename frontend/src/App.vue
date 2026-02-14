<template>
    <div class="app-wrapper">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
        <!-- 路由视图 -->
        <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
                <component :is="Component" />
            </transition>
        </router-view>
        
        <!-- 全局 Toast -->
        <div class="toast-container">
            <div class="toast" :class="{ show: toast.show }">{{ toast.message }}</div>
        </div>
    </div>
</template>

<script>
import { provide, reactive, onMounted } from 'vue'
import { useWebSocket } from './composables/useWebSocket'

export default {
    name: 'App',
    setup() {
        // 全局 Toast 状态
        const toast = reactive({
            show: false,
            message: '',
            timer: null
        })
        
        // 全局 Toast 方法
        const showToast = (message) => {
            if (toast.timer) clearTimeout(toast.timer)
            toast.message = message
            toast.show = true
            toast.timer = setTimeout(() => {
                toast.show = false
            }, 2500)
        }
        
        // 提供给子组件使用
        provide('showToast', showToast)
        
        // 全局 WebSocket 连接（单例）
        const { onMessage } = useWebSocket()
        
        // 处理一些全局通用的 WebSocket 消息
        onMounted(() => {
            onMessage((data) => {
                // 全局通用的消息处理
                switch (data.type) {
                    case 'partnerUpdated':
                        // 可以在这里触发全局事件或刷新状态
                        console.log('[App] 伴侣信息更新:', data.data)
                        break
                }
            })
        })
        
        return { toast }
    }
}
</script>

<style scoped>
.app-wrapper {
    position: relative;
    min-height: 100vh;
}
</style>
