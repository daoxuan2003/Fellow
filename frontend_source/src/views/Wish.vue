<template>
    <div class="wish-page">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
        <!-- 顶部导航 -->
        <header class="header">
            <div class="header-content">
                <button class="icon-btn back" @click="$router.back()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <span class="header-title">心愿墙</span>
                <button class="icon-btn" @click="showAddModal = true">
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
                <div class="empty-icon">💝</div>
                <div class="empty-title">请先绑定伴侣</div>
                <div class="empty-desc">绑定后一起记录美好的心愿吧~</div>
                <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
            </div>
            
            <!-- 正常内容 -->
            <template v-else>
                <!-- 统计面板 -->
                <div class="stats-panel">
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.total }}</div>
                        <div class="stat-label">全部心愿</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.pending }}</div>
                        <div class="stat-label">待完成</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.completed }}</div>
                        <div class="stat-label">已完成</div>
                    </div>
                </div>
                
                <!-- 类型筛选 -->
                <div class="type-filter">
                    <button 
                        v-for="t in typeOptions" 
                        :key="t.value"
                        class="filter-btn"
                        :class="{ active: filterType === t.value }"
                        @click="filterType = t.value"
                    >
                        <span class="filter-icon">{{ t.icon }}</span>
                        {{ t.label }}
                    </button>
                </div>
                
                <!-- 状态标签 -->
                <div class="tabs">
                    <div 
                        class="tab" 
                        :class="{ active: activeTab === 'pending' }"
                        @click="activeTab = 'pending'"
                    >
                        待完成
                        <span v-if="stats.pending > 0" class="badge">{{ stats.pending }}</span>
                    </div>
                    <div 
                        class="tab" 
                        :class="{ active: activeTab === 'completed' }"
                        @click="activeTab = 'completed'"
                    >
                        已完成
                    </div>
                </div>
                
                <!-- 心愿列表 -->
                <div class="wish-list">
                    <div v-if="filteredWishes.length === 0" class="empty-list">
                        <div class="empty-icon">🌟</div>
                        <div class="empty-text">
                            {{ activeTab === 'pending' ? '还没有心愿，添加一个吧~' : '还没有完成的心愿' }}
                        </div>
                    </div>
                    
                    <div 
                        v-for="wish in filteredWishes" 
                        :key="wish._id" 
                        class="wish-card"
                        :class="[wish.status, wish.priority]"
                        @click="handleCardClick(wish)"
                    >
                        <div class="wish-header">
                            <span class="wish-type">{{ getTypeIcon(wish.type) }} {{ getTypeLabel(wish.type) }}</span>
                            <span class="wish-priority" :class="wish.priority">
                                {{ getPriorityLabel(wish.priority) }}
                            </span>
                        </div>
                        
                        <div class="wish-content">
                            <h3 class="wish-title">{{ wish.title }}</h3>
                            <p v-if="wish.description" class="wish-desc">{{ wish.description }}</p>
                        </div>
                        
                        <div class="wish-footer">
                            <div class="wish-meta">
                                <span class="wish-creator">
                                    {{ wish.createdBy === currentUserId ? '我' : partner.nickname }} 添加
                                </span>
                                <span v-if="wish.targetDate" class="wish-target">
                                    目标: {{ formatDate(wish.targetDate) }}
                                </span>
                            </div>
                            <div class="wish-actions">
                                <button 
                                    v-if="wish.status === 'pending'"
                                    class="action-btn complete"
                                    @click.stop="handleComplete(wish)"
                                >
                                    ✓
                                </button>
                                <button 
                                    class="action-btn delete"
                                    @click.stop="handleDelete(wish)"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        
                        <!-- 完成标记 -->
                        <div v-if="wish.status === 'completed'" class="completed-badge">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            <span v-if="wish.completedBy">{{ wish.completedBy === currentUserId ? '我' : partner.nickname }}完成</span>
                        </div>
                    </div>
                </div>
            </template>
        </main>
        
        <!-- 底部导航 -->
        <BottomNav @toast="showToast" />
        
        <!-- 添加心愿弹窗 -->
        <div class="modal-overlay" :class="{ show: showAddModal }" @click.self="closeAddModal">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>添加心愿</h3>
                    <button class="modal-close" @click="closeAddModal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>心愿内容 <span class="required">*</span></label>
                        <input 
                            v-model="newWish.title" 
                            type="text" 
                            placeholder="想要/想做/想去..."
                            maxlength="50"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>详细描述</label>
                        <textarea 
                            v-model="newWish.description" 
                            placeholder="补充一些细节..."
                            rows="3"
                            maxlength="200"
                        ></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>类型</label>
                            <select v-model="newWish.type">
                                <option v-for="t in typeOptions.slice(1)" :key="t.value" :value="t.value">
                                    {{ t.icon }} {{ t.label }}
                                </option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>优先级</label>
                            <select v-model="newWish.priority">
                                <option value="low">🟢 低</option>
                                <option value="normal">🟡 中</option>
                                <option value="high">🔴 高</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>目标日期（可选）</label>
                        <input v-model="newWish.targetDate" type="date">
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closeAddModal">取消</button>
                    <button class="btn-primary" :disabled="!newWish.title.trim() || submitting" @click="handleAdd">
                        {{ submitting ? '添加中...' : '添加' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 完成心愿弹窗 -->
        <div class="modal-overlay" :class="{ show: showCompleteModal }" @click.self="closeCompleteModal">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>完成心愿</h3>
                    <button class="modal-close" @click="closeCompleteModal">✕</button>
                </div>
                <div class="modal-body">
                    <div class="complete-preview">
                        <div class="preview-icon">🎉</div>
                        <div class="preview-title">{{ completingWish?.title }}</div>
                    </div>
                    <div class="form-group">
                        <label>完成备注（可选）</label>
                        <textarea 
                            v-model="completionNote" 
                            placeholder="记录下完成时的心情..."
                            rows="3"
                            maxlength="200"
                        ></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closeCompleteModal">取消</button>
                    <button class="btn-primary" :disabled="completing" @click="confirmComplete">
                        {{ completing ? '处理中...' : '确认完成' }}
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    name: 'Wish',
    components: { BottomNav },
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
        
        const toast = ref({ show: false, message: '', timer: null })
        
        const typeOptions = [
            { value: 'all', label: '全部', icon: '✨' },
            { value: 'want', label: '想要', icon: '🎁' },
            { value: 'do', label: '想做', icon: '🎯' },
            { value: 'go', label: '想去', icon: '✈️' },
            { value: 'eat', label: '想吃', icon: '🍽️' },
            { value: 'other', label: '其他', icon: '📝' }
        ]
        
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
                    // 如果返回错误信息但不是网络错误，不显示toast（比如未绑定伴侣的情况已在界面上显示）
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
        
        const getPriorityLabel = (priority) => {
            const map = { high: '高', normal: '中', low: '低' }
            return map[priority] || '中'
        }
        
        const formatDate = (date) => {
            if (!date) return ''
            const d = new Date(date)
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
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
                    showToast('心愿添加成功')
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
                    showToast('🎉 恭喜完成心愿！')
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
        
        const handleDelete = async (wish) => {
            if (!confirm('确定要删除这个心愿吗？')) return
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/wishes/${wish._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    wishes.value = wishes.value.filter(w => w._id !== wish._id)
                    showToast('已删除')
                } else {
                    showToast(data.message || '删除失败')
                }
            } catch (e) {
                showToast('网络错误')
            }
        }
        
        const handleCardClick = (wish) => {
            // 可以扩展为查看详情
            console.log('点击心愿:', wish)
        }
        
        onMounted(async () => {
            await fetchUser()
            // 如果已绑定伴侣，再获取心愿列表
            if (partner.value) {
                await fetchWishes()
            }
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
            toast,
            getTypeIcon,
            getTypeLabel,
            getPriorityLabel,
            formatDate,
            closeAddModal,
            handleAdd,
            handleComplete,
            closeCompleteModal,
            confirmComplete,
            handleDelete,
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
    font-weight: 600;
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

.icon-placeholder {
    width: 40px;
}

/* 主内容 */
.main {
    max-width: 480px;
    margin: 0 auto;
    padding: 20px 16px 100px;
}

/* 空状态 */
.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.empty-desc {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
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
}

.primary-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(233, 30, 99, 0.3);
}

/* 统计面板 */
.stats-panel {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 20px;
}

.stat-item {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 16px 12px;
    text-align: center;
}

.stat-value {
    font-size: 28px;
    font-weight: 700;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary);
}

/* 类型筛选 */
.type-filter {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 16px;
    -webkit-overflow-scrolling: touch;
}

.type-filter::-webkit-scrollbar {
    display: none;
}

.filter-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
    flex-shrink: 0;
}

.filter-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
}

.filter-btn.active {
    background: rgba(233, 30, 99, 0.1);
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.filter-icon {
    font-size: 14px;
}

/* 标签切换 */
.tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-color);
}

.tab {
    position: relative;
    padding: 12px 8px;
    font-size: 15px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    gap: 6px;
}

.tab.active {
    color: var(--color-primary);
    font-weight: 600;
}

.tab.active::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-primary);
    border-radius: 2px 2px 0 0;
}

.badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: var(--color-primary);
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 9px;
}

/* 心愿列表 */
.wish-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.empty-list {
    text-align: center;
    padding: 60px 20px;
}

.empty-list .empty-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.empty-list .empty-text {
    font-size: 14px;
    color: var(--text-secondary);
}

/* 心愿卡片 */
.wish-card {
    position: relative;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;
    overflow: hidden;
}

.wish-card:hover {
    background: var(--bg-card-hover);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.wish-card.completed {
    opacity: 0.7;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.05) 0%, rgba(139, 195, 74, 0.05) 100%);
    border-color: rgba(76, 175, 80, 0.3);
}

.wish-card.high {
    border-left: 3px solid #f44336;
}

.wish-card.normal {
    border-left: 3px solid #ff9800;
}

.wish-card.low {
    border-left: 3px solid #4caf50;
}

.wish-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.wish-type {
    font-size: 12px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
}

.wish-priority {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 10px;
    font-weight: 500;
}

.wish-priority.high {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
}

.wish-priority.normal {
    background: rgba(255, 152, 0, 0.1);
    color: #ff9800;
}

.wish-priority.low {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
}

.wish-content {
    margin-bottom: 12px;
}

.wish-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 6px;
    line-height: 1.4;
}

.wish-desc {
    font-size: 13px;
    color: var(--text-secondary);
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.wish-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.wish-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.wish-creator,
.wish-target {
    font-size: 11px;
    color: var(--text-tertiary);
}

.wish-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.action-btn.complete {
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
}

.action-btn.complete:hover {
    background: #4caf50;
    color: white;
}

.action-btn.delete {
    background: rgba(244, 67, 54, 0.1);
    color: #f44336;
}

.action-btn.delete:hover {
    background: #f44336;
    color: white;
}

.completed-badge {
    position: absolute;
    top: 50%;
    right: 16px;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    color: #4caf50;
}

.completed-badge span {
    font-size: 10px;
    color: var(--text-tertiary);
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
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
    background: #ffffff;
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 420px;
    max-height: 85vh;
    overflow-y: auto;
    transform: scale(0.9);
    opacity: 0;
    transition: all 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-overlay.show .modal-dialog {
    transform: scale(1);
    opacity: 1;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 20px 0;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
}

.modal-close {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: var(--bg-card);
    color: var(--text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
}

.modal-close:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    display: flex;
    gap: 12px;
    padding: 0 20px 20px;
}

.modal-footer button {
    flex: 1;
    padding: 14px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    border: none;
}

.btn-secondary {
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.btn-secondary:hover {
    background: var(--bg-card-hover);
}

.btn-primary {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(233, 30, 99, 0.3);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

/* 表单 */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;
}

.required {
    color: var(--color-primary);
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 15px;
    color: var(--text-primary);
    transition: all 0.3s ease;
    box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--color-primary);
    background: var(--bg-card);
}

.form-group textarea {
    resize: none;
    font-family: inherit;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

/* 完成预览 */
.complete-preview {
    text-align: center;
    padding: 20px;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(139, 195, 74, 0.1) 100%);
    border-radius: var(--radius-lg);
    margin-bottom: 20px;
}

.preview-icon {
    font-size: 48px;
    margin-bottom: 12px;
}

.preview-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
}

/* Toast */
.toast {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.9);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
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
