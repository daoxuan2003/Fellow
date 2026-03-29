<template>
    <div class="app-wrapper">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
        <!-- 路由视图 - 使用 keep-alive 缓存页面 -->
        <!-- 注意：没有使用 transition，避免页面切换动画 -->
        <router-view v-slot="{ Component }">
            <keep-alive :include="cachedViews">
                <component :is="Component" />
            </keep-alive>
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
        
        // 需要缓存的页面名称
        const cachedViews = ['Home', 'Profile']
        
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
                    case 'habitCheckIn': {
                        // 坚持计划打卡通知
                        const { userName, habitTitle, isBothComplete, userGender, participation } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        if (isBothComplete) {
                            showToast(`🎉 「${habitTitle}」完成！默契值+1 ✨`)
                        } else if (participation === 'both') {
                            showToast(`⏰ ${userName || pronoun}完成「${habitTitle}」了，该你啦！`)
                        } else {
                            showToast(`👍 ${userName || pronoun}刚打卡了「${habitTitle}」`)
                        }
                        break
                    }
                    case 'habitCreated': {
                        // 新计划创建通知
                        const { userName, habitTitle, userGender, participation } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        if (participation === 'both') {
                            showToast(`🤝 ${userName || pronoun}邀请你一起完成「${habitTitle}」`)
                        } else {
                            showToast(`👀 ${userName || pronoun}开始了「${habitTitle}」，去围观一下`)
                        }
                        break
                    }
                    case 'habitCompleted': {
                        // 计划完成通知
                        const { habitTitle, userGender, participation } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        if (participation === 'both') {
                            showToast(`💕 我们一起搞定了「${habitTitle}」！`)
                        } else {
                            showToast(`🎉 ${pronoun}的「${habitTitle}」通关啦`)
                        }
                        break
                    }
                    case 'habitDeleted': {
                        // 计划删除通知
                        const { habitTitle, userGender } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        showToast(`📋 「${habitTitle}」${pronoun}已结束`)
                        break
                    }
                }
            })
        })
        
        return { toast, cachedViews }
    }
}
</script>

<style scoped>
.app-wrapper {
    position: relative;
    min-height: 100vh;
}
</style>
