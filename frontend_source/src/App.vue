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

        <BottomNav v-if="showBottomNav" />
        
        <!-- 全局 Toast -->
        <div class="toast-container">
            <div
                class="toast"
                :class="{ show: toast.show }"
                role="status"
                aria-live="polite"
                aria-atomic="true"
            >
                {{ toast.message }}
            </div>
        </div>
    </div>
</template>

<script>
import { computed, provide, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useWebSocket } from './composables/useWebSocket'
import { createClientLogger } from './utils/client-logger.js'
import BottomNav from './components/BottomNav.vue'

export default {
    name: 'App',
    components: { BottomNav },
    setup() {
        const logger = createClientLogger('App')
        const route = useRoute()
        const showBottomNav = computed(() => !route.meta.public && !route.meta.hideBottomNav)
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
                        logger.debug('伴侣信息更新', data.data)
                        break
                    case 'habitSubTaskComplete': {
                        // 子任务完成通知 - 温馨文案
                        const { userName, habitTitle, completedSubTasks, userGender } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        const name = userName || pronoun
                        
                        if (completedSubTasks && completedSubTasks.length > 0) {
                            // 显示具体完成了什么任务
                            const taskStr = completedSubTasks.join('、')
                            if (completedSubTasks.length === 1) {
                                showToast(`✨ ${name}完成了「${taskStr}」，真棒！`)
                            } else {
                                showToast(`💪 ${name}完成了${completedSubTasks.length}个任务，好厉害！`)
                            }
                        } else {
                            showToast(`✅ ${name}完成了「${habitTitle}」的一个任务~`)
                        }
                        break
                    }
                    case 'habitCheckIn': {
                        // 坚持计划打卡通知
                        const { userName, habitTitle, isBothComplete, userGender, participation } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        if (isBothComplete) {
                            showToast(`🎉 「${habitTitle}」完成！默契值+1 ✨`)
                        } else if (participation === 'both') {
                            showToast(`💕 ${userName || pronoun}完成「${habitTitle}」了，该你啦！`)
                        } else {
                            showToast(`👍 ${userName || pronoun}刚打卡了「${habitTitle}」`)
                        }
                        break
                    }
                    case 'habitPerfectCheckIn': {
                        // 完美打卡通知（全部子任务完成）
                        const { userName, habitTitle, userGender } = data.data
                        const pronoun = userGender === 'male' ? '他' : userGender === 'female' ? '她' : 'TA'
                        showToast(`🌟 ${userName || pronoun}在「${habitTitle}」完美打卡！这也太棒了吧！✨`)
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
                    case 'wishCreated': {
                        // 新增心愿通知
                        const { wishTitle, userName } = data.data
                        showToast(`💝 ${userName || 'TA'}添加了心愿：${wishTitle}`)
                        break
                    }
                    case 'wishCompleted': {
                        // 心愿完成通知
                        const { wishTitle, userName, completionNote } = data.data
                        const noteStr = completionNote ? ` (${completionNote})` : ''
                        showToast(`✨ ${userName || 'TA'}实现了「${wishTitle}」${noteStr} 🎉`)
                        break
                    }
                    case 'wishDeleted': {
                        // 心愿删除通知
                        const { wishTitle, userName } = data.data
                        showToast(`🗑️ 「${wishTitle}」${userName ? userName + '已' : '已'}删除`)
                        break
                    }
                    case 'cosmeticAdded': {
                        // 新增化妆品通知
                        const { name, userName } = data.data
                        showToast(`💄 ${userName || 'TA'}添加了化妆品：${name}`)
                        break
                    }
                    case 'cosmeticStatusChanged': {
                        // 化妆品状态更新通知
                        const { name, status, userName } = data.data
                        const statusText = status === 'empty' ? '已用完' : '恢复使用中'
                        showToast(`💄 「${name}」${userName ? userName + '标记为' : '标记为'}${statusText}`)
                        break
                    }
                    case 'cosmeticDeleted': {
                        // 化妆品删除通知
                        const { name, userName } = data.data
                        showToast(`🗑️ 化妆品「${name}」${userName ? userName + '已' : '已'}删除`)
                        break
                    }
                }
            })
        })
        
        return { toast, cachedViews, showBottomNav }
    }
}
</script>

<style scoped>
.app-wrapper {
    position: relative;
    min-height: 100vh;
    min-height: 100dvh;
    min-height: max(100vh, 100dvh);
    background: var(--fellow-paper, #fffaf5);
    isolation: isolate;
}
</style>
