<template>
    <div class="wish-page">
        <!--  Corkboard 背景 -->
        <div class="corkboard-bg">
            <div class="cork-texture"></div>
        </div>
        
        <!-- 顶部导航 -->
        <header class="header">
            <div class="header-content">
                <button class="icon-btn back" @click="$router.back()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <span class="header-title">💝 我们的心愿墙</span>
                <button class="icon-btn add" @click="showAddModal = true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                </button>
            </div>
        </header>
        
        <!-- 主内容 -->
        <main class="main">
            <!-- 未绑定提示 -->
            <div v-if="!partner" class="empty-state">
                <div class="empty-pin">📌</div>
                <div class="empty-note">
                    <div class="empty-title">请先绑定伴侣</div>
                    <div class="empty-desc">绑定后一起贴上美好的心愿吧~</div>
                    <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
                </div>
            </div>
            
            <!-- 正常内容 -->
            <template v-else>
                <!-- 简介说明 -->
                <div class="wall-intro">
                    <span class="intro-text">{{ stats.completed }} 个已实现 · {{ stats.pending }} 个进行中</span>
                </div>
                
                <!-- 类型筛选 - 标签式 -->
                <div class="filter-bar">
                    <button 
                        v-for="t in typeOptions" 
                        :key="t.value"
                        class="filter-tab"
                        :class="{ active: filterType === t.value }"
                        @click="filterType = t.value"
                    >
                        {{ t.icon }} {{ t.label }}
                    </button>
                </div>
                
                <!-- 状态切换 -->
                <div class="status-bar">
                    <button 
                        class="status-btn"
                        :class="{ active: activeTab === 'pending' }"
                        @click="activeTab = 'pending'"
                    >
                        📌 进行中 <span v-if="stats.pending > 0" class="count">{{ stats.pending }}</span>
                    </button>
                    <button 
                        class="status-btn"
                        :class="{ active: activeTab === 'completed' }"
                        @click="activeTab = 'completed'"
                    >
                        ✅ 已完成
                    </button>
                </div>
                
                <!-- 心愿墙 - Masonry 布局 -->
                <div v-if="filteredWishes.length === 0" class="empty-wall">
                    <div class="empty-sticker">
                        <div class="sticker-content">
                            <div class="sticker-icon">📝</div>
                            <div class="sticker-text">
                                {{ activeTab === 'pending' ? '还没有心愿哦~' : '还没有完成的心愿' }}
                            </div>
                            <div class="sticker-hint">点击右上角 + 添加第一个心愿</div>
                        </div>
                        <div class="sticker-tape"></div>
                    </div>
                </div>
                
                <div v-else class="wish-wall">
                    <div 
                        v-for="(wish, index) in filteredWishes" 
                        :key="wish._id" 
                        class="wish-sticker"
                        :class="[wish.status, getStickerColor(index), `rotate-${getRotate(index)}` ]"
                        @click="handleCardClick(wish)"
                    >
                        <!-- 胶带效果 -->
                        <div class="tape tape-top"></div>
                        
                        <!-- 图钉（已完成的心愿） -->
                        <div v-if="wish.status === 'completed'" class="pin">
                            <div class="pin-head"></div>
                            <div class="pin-body"></div>
                        </div>
                        
                        <!-- 内容 -->
                        <div class="sticker-inner">
                            <div class="sticker-header">
                                <span class="sticker-type">{{ getTypeIcon(wish.type) }}</span>
                                <span v-if="wish.priority === 'high'" class="sticker-priority">🔥</span>
                            </div>
                            
                            <div class="sticker-body">
                                <h3 class="wish-title">{{ wish.title }}</h3>
                                <p v-if="wish.description" class="wish-desc">{{ wish.description }}</p>
                            </div>
                            
                            <div class="sticker-footer">
                                <div class="sticker-meta">
                                    <span class="meta-item creator">{{ wish.createdBy === currentUserId ? '我' : 'TA' }}</span>
                                    <span v-if="wish.targetDate" class="meta-item deadline">{{ formatDeadline(wish.targetDate) }}</span>
                                </div>
                                
                                <div class="sticker-actions" @click.stop>
                                    <button 
                                        v-if="wish.status === 'pending'"
                                        class="action-dot complete"
                                        @click="handleComplete(wish)"
                                        title="完成"
                                    >✓</button>
                                    <button 
                                        class="action-dot delete"
                                        @click="handleDelete(wish)"
                                        title="删除"
                                    >✕</button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 完成标记 -->
                        <div v-if="wish.status === 'completed'" class="completed-stamp">
                            <div class="stamp-text">DONE</div>
                        </div>
                    </div>
                </div>
            </template>
        </main>
        
        <!-- 底部导航 -->
        <BottomNav @toast="showToast" />
        
        <!-- 添加心愿弹窗 -->
        <div class="modal-overlay" :class="{ show: showAddModal }" @click.self="closeAddModal">
            <div class="modal-dialog sticky-note">
                <div class="modal-tape"></div>
                <div class="modal-header">
                    <h3>📝 写个心愿</h3>
                    <button class="modal-close" @click="closeAddModal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>心愿内容 <span class="required">*</span></label>
                        <textarea 
                            v-model="newWish.title" 
                            placeholder="想要/想做/想去..."
                            rows="2"
                            maxlength="50"
                            class="note-input"
                        ></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>详细描述</label>
                        <textarea 
                            v-model="newWish.description" 
                            placeholder="补充一些细节..."
                            rows="2"
                            maxlength="100"
                            class="note-input"
                        ></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>类型</label>
                            <div class="type-choices">
                                <button 
                                    v-for="t in typeOptions.slice(1, 5)" 
                                    :key="t.value"
                                    class="type-choice"
                                    :class="{ active: newWish.type === t.value }"
                                    @click="newWish.type = t.value"
                                >
                                    {{ t.icon }}
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>优先级</label>
                            <div class="priority-choices">
                                <button 
                                    class="priority-choice"
                                    :class="{ active: newWish.priority === 'low' }"
                                    @click="newWish.priority = 'low'"
                                >🟢</button>
                                <button 
                                    class="priority-choice"
                                    :class="{ active: newWish.priority === 'normal' }"
                                    @click="newWish.priority = 'normal'"
                                >🟡</button>
                                <button 
                                    class="priority-choice"
                                    :class="{ active: newWish.priority === 'high' }"
                                    @click="newWish.priority = 'high'"
                                >🔴</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>目标日期（可选）</label>
                        <DatePickerField v-model="newWish.targetDate" display-class="note-input" placeholder="请选择日期" />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-note btn-secondary" @click="closeAddModal">取消</button>
                    <button class="btn-note btn-primary" :disabled="!newWish.title.trim() || submitting" @click="handleAdd">
                        {{ submitting ? '贴上去...' : '贴上墙' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 完成心愿弹窗 -->
        <div class="modal-overlay" :class="{ show: showCompleteModal }" @click.self="closeCompleteModal">
            <div class="modal-dialog sticky-note complete-note">
                <div class="modal-tape"></div>
                <div class="modal-header">
                    <h3>🎉 完成心愿</h3>
                    <button class="modal-close" @click="closeCompleteModal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="complete-preview">
                        <div class="preview-wish">{{ completingWish?.title }}</div>
                    </div>
                    <div class="form-group">
                        <label>完成备注（可选）</label>
                        <textarea 
                            v-model="completionNote" 
                            placeholder="记录下完成时的心情..."
                            rows="2"
                            maxlength="100"
                            class="note-input"
                        ></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-note btn-secondary" @click="closeCompleteModal">取消</button>
                    <button class="btn-note btn-primary" :disabled="completing" @click="confirmComplete">
                        {{ completing ? '...' : '确认完成 ✓' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 确认框弹窗 -->
        <div class="modal-overlay" :class="{ show: showConfirmModal }" @click.self="cancelConfirm">
            <div class="modal-dialog sticky-note confirm-note">
                <div class="modal-tape"></div>
                <div class="confirm-icon">🗑️</div>
                <div class="confirm-title">撕掉心愿贴？</div>
                <div class="confirm-message">确定要删除 "{{ deletingWish?.title }}" 吗？</div>
                <div class="modal-footer confirm-footer">
                    <button class="btn-note btn-secondary" @click="cancelConfirm">留着</button>
                    <button class="btn-note btn-danger" :disabled="deleting" @click="doDelete">
                        {{ deleting ? '撕掉中...' : '撕掉' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Toast -->
        <div class="toast" :class="{ show: toast.show }">
            {{ toast.message }}
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'
import DatePickerField from '../components/DatePickerField.vue'

export default {
    name: 'Wish',
    components: { BottomNav, DatePickerField },
    setup() {
        const router = useRouter()
        
        const currentUserId = ref('')
        const partner = ref(null)
        const wishes = ref([])
        const loading = ref(false)
        const activeTab = ref('pending')
        const filterType = ref('all')
        
        const showAddModal = ref(false)
        const submitting = ref(false)
        const newWish = ref({
            title: '',
            description: '',
            type: 'want',
            priority: 'normal',
            targetDate: ''
        })
        
        const showCompleteModal = ref(false)
        const completing = ref(false)
        const completingWish = ref(null)
        const completionNote = ref('')
        
        const showConfirmModal = ref(false)
        const deleting = ref(false)
        const deletingWish = ref(null)
        
        const toast = ref({ show: false, message: '', timer: null })
        
        const typeOptions = [
            { value: 'all', label: '全部', icon: '✨' },
            { value: 'want', label: '想要', icon: '🎁' },
            { value: 'do', label: '想做', icon: '🎯' },
            { value: 'go', label: '想去', icon: '✈️' },
            { value: 'eat', label: '想吃', icon: '🍽️' },
            { value: 'other', label: '其他', icon: '📝' }
        ]
        
        // 便利贴颜色
        const stickerColors = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange']
        
        // 随机旋转角度数组
        const rotateAngles = [-3, -2, -1, 0, 1, 2, 3]
        
        const stats = computed(() => {
            const total = wishes.value.length
            const pending = wishes.value.filter(w => w.status === 'pending').length
            const completed = wishes.value.filter(w => w.status === 'completed').length
            return { total, pending, completed }
        })
        
        const filteredWishes = computed(() => {
            let list = wishes.value.filter(w => w.status === activeTab.value)
            if (filterType.value !== 'all') {
                list = list.filter(w => w.type === filterType.value)
            }
            return list.sort((a, b) => {
                // 优先级排序：high > normal > low
                const priorityMap = { high: 3, normal: 2, low: 1 }
                const pDiff = priorityMap[b.priority] - priorityMap[a.priority]
                if (pDiff !== 0) return pDiff
                // 时间倒序
                return new Date(b.createdAt) - new Date(a.createdAt)
            })
        })
        
        const getToken = () => localStorage.getItem('token')
        
        const showToast = (message) => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }
        
        // 根据 index 获取颜色（伪随机但稳定）
        const getStickerColor = (index) => {
            return stickerColors[index % stickerColors.length]
        }
        
        // 根据 index 获取旋转角度
        const getRotate = (index) => {
            return Math.abs(index % rotateAngles.length)
        }
        
        const fetchUser = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    currentUserId.value = data.data.id
                    partner.value = data.data.partner
                }
            } catch (e) {
                console.error('获取用户信息失败:', e)
            }
        }
        
        const fetchWishes = async () => {
            loading.value = true
            try {
                const token = getToken()
                if (!token) {
                    showToast('请先登录')
                    return
                }
                const res = await fetch(CONFIG.API_URL + '/wishes', {
                    headers: { 'Authorization': 'Bearer ' + token }
                })
                const data = await res.json()
                if (data.success) {
                    wishes.value = data.data
                } else {
                    if (res.status !== 400) {
                        showToast(data.message || '获取数据失败')
                    }
                }
            } catch (e) {
                console.error('获取心愿列表失败:', e)
                showToast('获取数据失败，请检查网络')
            } finally {
                loading.value = false
            }
        }
        
        const getTypeIcon = (type) => {
            const found = typeOptions.find(t => t.value === type)
            return found ? found.icon : '✨'
        }
        
        const getTypeLabel = (type) => {
            const found = typeOptions.find(t => t.value === type)
            return found ? found.label : '其他'
        }
        
        const formatDeadline = (date) => {
            if (!date) return ''
            const d = new Date(date)
            const now = new Date()
            const diff = d - now
            const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
            
            if (days < 0) return '已过期'
            if (days === 0) return '今天'
            if (days === 1) return '明天'
            if (days <= 7) return `${days}天后`
            return `${d.getMonth() + 1}/${d.getDate()}`
        }
        
        const closeAddModal = () => {
            showAddModal.value = false
            newWish.value = {
                title: '',
                description: '',
                type: 'want',
                priority: 'normal',
                targetDate: ''
            }
        }
        
        const handleAdd = async () => {
            if (!newWish.value.title.trim()) return
            
            submitting.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/wishes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify(newWish.value)
                })
                const data = await res.json()
                if (data.success) {
                    wishes.value.unshift(data.data)
                    showToast('✨ 心愿贴上墙了！')
                    closeAddModal()
                } else {
                    showToast(data.message || '添加失败')
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                submitting.value = false
            }
        }
        
        const handleComplete = (wish) => {
            completingWish.value = wish
            showCompleteModal.value = true
        }
        
        const closeCompleteModal = () => {
            showCompleteModal.value = false
            completingWish.value = null
            completionNote.value = ''
        }
        
        const confirmComplete = async () => {
            if (!completingWish.value) return
            
            completing.value = true
            try {
                const res = await fetch(`${CONFIG.API_URL}/wishes/${completingWish.value._id}/complete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ completionNote: completionNote.value })
                })
                const data = await res.json()
                if (data.success) {
                    const index = wishes.value.findIndex(w => w._id === completingWish.value._id)
                    if (index !== -1) {
                        wishes.value[index] = data.data
                    }
                    showToast('🎉 太棒了！又实现一个心愿！')
                    closeCompleteModal()
                } else {
                    showToast(data.message || '操作失败')
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                completing.value = false
            }
        }
        
        const handleDelete = (wish) => {
            deletingWish.value = wish
            showConfirmModal.value = true
        }
        
        const cancelConfirm = () => {
            showConfirmModal.value = false
            deletingWish.value = null
        }
        
        const doDelete = async () => {
            if (!deletingWish.value) return
            
            deleting.value = true
            try {
                const res = await fetch(`${CONFIG.API_URL}/wishes/${deletingWish.value._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    wishes.value = wishes.value.filter(w => w._id !== deletingWish.value._id)
                    showToast('已撕掉')
                    cancelConfirm()
                } else {
                    showToast(data.message || '删除失败')
                }
            } catch (e) {
                showToast('网络错误')
            } finally {
                deleting.value = false
            }
        }
        
        const handleCardClick = (wish) => {
            // 可以扩展为查看详情
        }
        
        onMounted(async () => {
            await fetchUser()
            if (partner.value) {
                await fetchWishes()
            }
            
            // 订阅 WebSocket 消息
            const unsubscribe = onMessage(handleWSMessage)
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', handleVisibilityChange)
            
            onUnmounted(() => {
                unsubscribe()
                document.removeEventListener('visibilitychange', handleVisibilityChange)
            })
        })
        
        return {
            currentUserId,
            partner,
            wishes,
            loading,
            activeTab,
            filterType,
            typeOptions,
            stats,
            filteredWishes,
            showAddModal,
            submitting,
            newWish,
            showCompleteModal,
            completing,
            completingWish,
            completionNote,
            showConfirmModal,
            deleting,
            deletingWish,
            toast,
            getStickerColor,
            getRotate,
            getTypeIcon,
            getTypeLabel,
            formatDeadline,
            closeAddModal,
            handleAdd,
            handleComplete,
            closeCompleteModal,
            confirmComplete,
            handleDelete,
            cancelConfirm,
            doDelete,
            handleCardClick,
            showToast
        }
    }
}
</script>

<style scoped>
.wish-page {
    min-height: 100vh;
    position: relative;
    background: #8B4513;
}

/* 软木板背景 */
.corkboard-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    background: 
        linear-gradient(135deg, #A0522D 0%, #8B4513 50%, #654321 100%);
}

.cork-texture {
    position: absolute;
    inset: 0;
    background-image: 
        radial-gradient(circle at 20% 30%, rgba(139, 90, 43, 0.4) 1px, transparent 1px),
        radial-gradient(circle at 60% 70%, rgba(160, 82, 45, 0.3) 1px, transparent 1px),
        radial-gradient(circle at 80% 20%, rgba(101, 67, 33, 0.4) 1px, transparent 1px),
        radial-gradient(circle at 40% 80%, rgba(139, 90, 43, 0.3) 1px, transparent 1px);
    background-size: 60px 60px, 80px 80px, 100px 100px, 70px 70px;
    opacity: 0.6;
}

/* 头部 */
.header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: env(safe-area-inset-top, 0px) 16px 12px;
    background: rgba(253, 253, 245, 0.95);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-color);
}

.header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    max-width: 480px;
    margin: 0 auto;
}

.header-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
}

.icon-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    color: var(--text-secondary);
}

.icon-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
    color: var(--color-primary);
}

.icon-btn.add {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    border: none;
    color: white;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.icon-btn.add:hover {
    transform: scale(1.1) rotate(90deg);
}

/* 主内容 */
.main {
    position: relative;
    z-index: 1;
    max-width: 480px;
    margin: 0 auto;
    padding: 16px 12px 100px;
}

/* 简介 */
.wall-intro {
    text-align: center;
    margin-bottom: 16px;
}

.intro-text {
    font-size: 13px;
    color: rgba(255, 248, 231, 0.8);
    background: rgba(0, 0, 0, 0.2);
    padding: 6px 16px;
    border-radius: 20px;
}

/* 筛选栏 */
.filter-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 12px;
    -webkit-overflow-scrolling: touch;
}

.filter-bar::-webkit-scrollbar {
    display: none;
}

.filter-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 13px;
    color: rgba(255, 248, 231, 0.9);
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
}

.filter-tab:hover {
    background: rgba(255, 255, 255, 0.2);
}

.filter-tab.active {
    background: linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%);
    color: #3E2723;
    border-color: transparent;
    font-weight: 600;
}

/* 状态栏 */
.status-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    justify-content: center;
}

.status-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 24px;
    font-size: 14px;
    color: rgba(255, 248, 231, 0.8);
    cursor: pointer;
    transition: all 0.3s ease;
}

.status-btn:hover {
    background: rgba(255, 255, 255, 0.2);
}

.status-btn.active {
    background: linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%);
    color: white;
    border-color: transparent;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: rgba(255, 255, 255, 0.9);
    color: #3E2723;
    font-size: 11px;
    font-weight: 700;
    border-radius: 10px;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 60px 20px;
}

.empty-pin {
    font-size: 48px;
    margin-bottom: -20px;
    z-index: 2;
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
}

.empty-note {
    background: linear-gradient(135deg, #FFFAF0 0%, #FFF8E7 100%);
    padding: 40px 30px 30px;
    border-radius: 4px;
    text-align: center;
    box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.2),
        0 1px 3px rgba(0, 0, 0, 0.1);
    transform: rotate(-1deg);
    max-width: 280px;
}

.empty-title {
    font-size: 18px;
    font-weight: 700;
    color: #3E2723;
    margin-bottom: 8px;
}

.empty-desc {
    font-size: 14px;
    color: #666;
    margin-bottom: 20px;
}

.primary-btn {
    padding: 12px 32px;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 24px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(233, 30, 99, 0.4);
}

/* 空墙 */
.empty-wall {
    display: flex;
    justify-content: center;
    padding: 40px 20px;
}

.empty-sticker {
    position: relative;
    background: linear-gradient(135deg, #FFFAF0 0%, #FFF8E7 100%);
    padding: 30px 25px;
    border-radius: 2px;
    box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.1);
    transform: rotate(2deg);
    max-width: 260px;
}

.sticker-tape {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 24px;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sticker-content {
    text-align: center;
}

.sticker-icon {
    font-size: 40px;
    margin-bottom: 12px;
}

.sticker-text {
    font-size: 16px;
    font-weight: 600;
    color: #3E2723;
    margin-bottom: 8px;
}

.sticker-hint {
    font-size: 12px;
    color: #888;
}

/* 心愿墙 - Masonry 布局 */
.wish-wall {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    padding: 8px;
}

@media (min-width: 400px) {
    .wish-wall {
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
    }
}

/* 便利贴 */
.wish-sticker {
    position: relative;
    padding: 16px 14px 12px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 
        0 4px 15px rgba(0, 0, 0, 0.15),
        0 1px 3px rgba(0, 0, 0, 0.1);
}

.wish-sticker:hover {
    transform: translateY(-4px) rotate(0deg) scale(1.02) !important;
    box-shadow: 
        0 12px 30px rgba(0, 0, 0, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
}

/* 便利贴颜色 */
.wish-sticker.yellow {
    background: linear-gradient(135deg, #FFF9C4 0%, #FFF59D 100%);
}

.wish-sticker.pink {
    background: linear-gradient(135deg, #F8BBD9 0%, #F48FB1 100%);
}

.wish-sticker.blue {
    background: linear-gradient(135deg, #B3E5FC 0%, #81D4FA 100%);
}

.wish-sticker.green {
    background: linear-gradient(135deg, #C8E6C9 0%, #A5D6A7 100%);
}

.wish-sticker.purple {
    background: linear-gradient(135deg, #E1BEE7 0%, #CE93D8 100%);
}

.wish-sticker.orange {
    background: linear-gradient(135deg, #FFE0B2 0%, #FFCC80 100%);
}

/* 旋转角度 */
.wish-sticker.rotate-0 { transform: rotate(-3deg); }
.wish-sticker.rotate-1 { transform: rotate(-2deg); }
.wish-sticker.rotate-2 { transform: rotate(-1deg); }
.wish-sticker.rotate-3 { transform: rotate(0deg); }
.wish-sticker.rotate-4 { transform: rotate(1deg); }
.wish-sticker.rotate-5 { transform: rotate(2deg); }
.wish-sticker.rotate-6 { transform: rotate(3deg); }

/* 胶带 */
.tape {
    position: absolute;
    top: -10px;
    width: 50px;
    height: 22px;
    background: rgba(255, 255, 255, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tape-top {
    left: 50%;
    transform: translateX(-50%);
}

/* 图钉 */
.pin {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
}

.pin-head {
    width: 14px;
    height: 14px;
    background: radial-gradient(circle at 30% 30%, #FF6B6B, #C62828);
    border-radius: 50%;
    box-shadow: 
        0 2px 4px rgba(0, 0, 0, 0.3),
        inset -2px -2px 4px rgba(0, 0, 0, 0.2);
}

.pin-body {
    width: 2px;
    height: 8px;
    background: linear-gradient(180deg, #90A4AE 0%, #607D8B 100%);
    margin: -2px auto 0;
    border-radius: 0 0 1px 1px;
}

/* 便利贴内部 */
.sticker-inner {
    display: flex;
    flex-direction: column;
    min-height: 140px;
}

.sticker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.sticker-type {
    font-size: 20px;
}

.sticker-priority {
    font-size: 14px;
}

.sticker-body {
    flex: 1;
    margin-bottom: 12px;
}

.wish-title {
    font-size: 15px;
    font-weight: 600;
    color: #3E2723;
    margin: 0 0 6px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.wish-desc {
    font-size: 12px;
    color: #5D4037;
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    opacity: 0.8;
}

.sticker-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 8px;
    border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

.sticker-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.meta-item {
    font-size: 10px;
    color: rgba(62, 39, 35, 0.6);
}

.meta-item.deadline {
    color: #E65100;
    font-weight: 500;
}

.sticker-actions {
    display: flex;
    gap: 6px;
}

.action-dot {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.5);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-dot:hover {
    transform: scale(1.15);
}

.action-dot.complete {
    color: #4CAF50;
}

.action-dot.complete:hover {
    background: #4CAF50;
    color: white;
}

.action-dot.delete {
    color: #f44336;
}

.action-dot.delete:hover {
    background: #f44336;
    color: white;
}

/* 完成印章 */
.completed-stamp {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-15deg);
    border: 3px solid #4CAF50;
    border-radius: 8px;
    padding: 8px 16px;
    opacity: 0.7;
    pointer-events: none;
}

.stamp-text {
    font-size: 20px;
    font-weight: 900;
    color: #4CAF50;
    letter-spacing: 2px;
}

.wish-sticker.completed .sticker-inner {
    opacity: 0.6;
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    padding: 20px;
}

.modal-overlay.show {
    opacity: 1;
    visibility: visible;
}

.modal-dialog {
    width: 100%;
    max-width: 380px;
    max-height: 85vh;
    overflow-y: auto;
    transform: scale(0.9) rotate(-3deg);
    opacity: 0;
    transition: all 0.3s ease;
    box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
}

.modal-overlay.show .modal-dialog {
    transform: scale(1) rotate(0deg);
    opacity: 1;
}

/* 便利贴风格弹窗 */
.sticky-note {
    position: relative;
    background: linear-gradient(135deg, #FFFAF0 0%, #FFF8E7 100%);
    border-radius: 2px;
    padding: 24px 20px 20px;
}

.sticky-note.complete-note {
    background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
}

.modal-tape {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 28px;
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 700;
    color: #3E2723;
    margin: 0;
}

.modal-close {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.1);
    color: #5D4037;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    font-size: 14px;
}

.modal-close:hover {
    background: rgba(0, 0, 0, 0.2);
    transform: rotate(90deg);
}

.modal-body {
    margin-bottom: 20px;
}

.modal-footer {
    display: flex;
    gap: 12px;
}

/* 表单 */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #5D4037;
    margin-bottom: 6px;
}

.required {
    color: #E91E63;
}

.note-input {
    width: 100%;
    padding: 12px 14px;
    background: rgba(255, 255, 255, 0.6);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 8px;
    font-size: 15px;
    color: #3E2723;
    transition: all 0.3s ease;
    box-sizing: border-box;
    font-family: inherit;
    resize: none;
}

.note-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.9);
    border-color: rgba(233, 30, 99, 0.4);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

/* 类型选择 */
.type-choices {
    display: flex;
    gap: 8px;
}

.type-choice {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: rgba(255, 255, 255, 0.5);
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.type-choice:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: scale(1.1);
}

.type-choice.active {
    border-color: #E91E63;
    background: rgba(233, 30, 99, 0.1);
}

/* 优先级选择 */
.priority-choices {
    display: flex;
    gap: 8px;
}

.priority-choice {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: 2px solid transparent;
    background: rgba(255, 255, 255, 0.5);
    font-size: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
}

.priority-choice:hover {
    transform: scale(1.1);
}

.priority-choice.active {
    border-color: #E91E63;
}

/* 完成预览 */
.complete-preview {
    background: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 16px;
    text-align: center;
}

.preview-wish {
    font-size: 16px;
    font-weight: 600;
    color: #3E2723;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 按钮 */
.btn-note {
    flex: 1;
    padding: 14px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
}

.btn-secondary {
    background: rgba(0, 0, 0, 0.1);
    color: #5D4037;
}

.btn-secondary:hover {
    background: rgba(0, 0, 0, 0.2);
}

.btn-primary {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(233, 30, 99, 0.4);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-danger {
    background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
}

.btn-danger:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(244, 67, 54, 0.4);
}

.btn-danger:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 确认框样式 */
.confirm-note {
    background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
    text-align: center;
    padding: 30px 24px 24px;
}

.confirm-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.confirm-title {
    font-size: 20px;
    font-weight: 700;
    color: #3E2723;
    margin-bottom: 8px;
}

.confirm-message {
    font-size: 14px;
    color: #5D4037;
    margin-bottom: 24px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.confirm-footer {
    margin-top: 0;
}

/* Toast */
.toast {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 14px 28px;
    border-radius: 30px;
    font-size: 15px;
    font-weight: 500;
    z-index: 10000;
    pointer-events: none;
    opacity: 0;
    transition: all 0.3s ease;
}

.toast.show {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
}
</style>
