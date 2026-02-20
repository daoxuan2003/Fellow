<template>
    <div class="express-page">
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
                <span class="header-title">代取快递</span>
                <div class="icon-placeholder"></div>
            </div>
        </header>
        
        <!-- 主内容 -->
        <main class="main">
            <!-- 未绑定提示 -->
            <div v-if="!partner" class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-title">请先绑定伴侣</div>
                <div class="empty-desc">绑定后才能互相帮取快递哦~</div>
                <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
            </div>
            
            <!-- 正常内容 -->
            <template v-else>
                <!-- 标签切换 -->
                <div class="tabs">
                    <div 
                        class="tab" 
                        :class="{ active: activeTab === 'pending' }"
                        @click="activeTab = 'pending'"
                    >
                        待取件
                        <span v-if="pendingList.length > 0" class="badge">{{ pendingList.length }}</span>
                    </div>
                    <div 
                        class="tab" 
                        :class="{ active: activeTab === 'picked' }"
                        @click="activeTab = 'picked'"
                    >
                        已取件
                    </div>
                </div>
                
                <!-- 待取列表 -->
                <div v-if="activeTab === 'pending'" class="express-list">
                    <div v-if="pendingList.length === 0" class="empty-list">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">暂时没有待取快递</div>
                        <div class="empty-hint">点击下方按钮添加一个吧~</div>
                    </div>
                    
                    <ExpressCard
                        v-for="item in pendingList"
                        :key="item.id"
                        :data="item"
                        :current-user-id="currentUserId"
                        :partner-gender="partner?.gender"
                        @pick="handlePick"
                        @delete="handleDelete"
                    />
                </div>
                
                <!-- 已取列表 -->
                <div v-else class="express-list">
                    <div v-if="pickedList.length === 0" class="empty-list">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">暂时没有已取快递</div>
                    </div>
                    
                    <ExpressCard
                        v-for="item in pickedList"
                        :key="item.id"
                        :data="item"
                        :current-user-id="currentUserId"
                        :partner-gender="partner?.gender"
                        @unpick="handleUnpick"
                    />
                </div>
            </template>
        </main>
        
        <!-- 添加按钮 -->
        <button v-if="partner" class="fab" @click="showAddModal = true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </button>
        
        <!-- 添加弹窗 -->
        <div class="modal-overlay" :class="{ show: showAddModal }" @click.self="showAddModal = false">
            <div class="modal">
                <div class="modal-header">
                    <h3>添加快递</h3>
                    <button class="close-btn" @click="showAddModal = false">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>取件码 <span class="required">*</span></label>
                        <input 
                            v-model="form.trackingNo" 
                            type="text" 
                            placeholder="如：1234 或 1-2-3456"
                            maxlength="20"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>取件地点 <span class="required">*</span></label>
                        <div class="location-select">
                            <select 
                                v-if="!isAddingLocation" 
                                v-model="form.pickupLocation"
                                class="location-dropdown"
                                @change="handleLocationChange"
                            >
                                <option value="">请选择</option>
                                <option v-for="loc in locations" :key="loc.id" :value="loc.name">
                                    {{ loc.name }}
                                </option>
                                <option value="__add_new__">+ 新增地点</option>
                            </select>
                            <div v-else class="location-input-wrapper">
                                <input 
                                    ref="locationInput"
                                    v-model="newLocationName" 
                                    type="text" 
                                    placeholder="输入新地点名称"
                                    maxlength="50"
                                    @keyup.enter="handleAddLocation"
                                >
                                <button class="btn-save-location" @click="handleAddLocation" :disabled="!newLocationName.trim()">
                                    保存
                                </button>
                                <button class="btn-cancel-location" @click="cancelAddLocation">
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>物品描述 <span class="optional">（可选）</span></label>
                        <input 
                            v-model="form.description" 
                            type="text" 
                            placeholder="如：衣服、书、零食"
                            maxlength="20"
                        >
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-cancel" @click="showAddModal = false">取消</button>
                    <button 
                        class="btn-confirm" 
                        :disabled="!canSubmit || submitting"
                        @click="handleAdd"
                    >
                        {{ submitting ? '添加中...' : '添加' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- Toast -->
        <div class="toast" :class="{ show: toast.show, [toast.type]: true }">
            <span>{{ toast.message }}</span>
        </div>
        
        <!-- 底部导航 -->
        <BottomNav @toast="showToast" />
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'
import ExpressCard from '../components/ExpressCard.vue'

export default {
    name: 'Express',
    components: { BottomNav, ExpressCard },
    setup() {
        const router = useRouter()
        const { onMessage } = useWebSocket()
        
        const currentUserId = ref(localStorage.getItem('userId') || '')
        const partner = ref(null)
        const pendingList = ref([])
        const pickedList = ref([])
        const activeTab = ref('pending')
        const loading = ref(false)
        
        // 弹窗相关
        const showAddModal = ref(false)
        const submitting = ref(false)
        const form = ref({
            trackingNo: '',
            pickupLocation: '',
            description: ''
        })
        
        // 取件地点相关
        const locations = ref([])
        const isAddingLocation = ref(false)
        const newLocationName = ref('')
        const locationInput = ref(null)
        
        // Toast
        const toast = ref({ show: false, message: '', type: 'info', timer: null })
        
        const canSubmit = computed(() => {
            return form.value.trackingNo.trim() && form.value.pickupLocation.trim()
        })
        
        const showToast = (message, type = 'info') => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message, type }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }
        
        const getToken = () => localStorage.getItem('token')
        
        // 获取快递列表
        const fetchList = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/express', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    pendingList.value = data.data.pending || []
                    pickedList.value = data.data.picked || []
                }
            } catch (e) {
                console.error('获取快递列表失败:', e)
            }
        }
        
        // 获取取件地点列表
        const fetchLocations = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/pickup-locations', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    locations.value = data.data || []
                }
            } catch (e) {
                console.error('获取取件地点失败:', e)
            }
        }
        
        // 处理地点选择变化
        const handleLocationChange = (e) => {
            const value = e.target.value
            if (value === '__add_new__') {
                form.value.pickupLocation = ''
                isAddingLocation.value = true
                // 下一个 tick 聚焦输入框
                setTimeout(() => {
                    locationInput.value?.focus()
                }, 100)
            }
        }
        
        // 添加新地点
        const handleAddLocation = async () => {
            const name = newLocationName.value.trim()
            if (!name) return
            
            try {
                const res = await fetch(CONFIG.API_URL + '/pickup-locations', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ name })
                })
                
                const data = await res.json()
                if (data.success) {
                    locations.value.push(data.data)
                    form.value.pickupLocation = name
                    isAddingLocation.value = false
                    newLocationName.value = ''
                    showToast('地点添加成功', 'success')
                } else {
                    showToast(data.message || '添加失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        // 取消添加地点
        const cancelAddLocation = () => {
            isAddingLocation.value = false
            newLocationName.value = ''
            if (!form.value.pickupLocation) {
                form.value.pickupLocation = locations.value[0]?.name || ''
            }
        }
        
        // 获取用户信息
        const fetchUser = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    currentUserId.value = data.data.id
                    localStorage.setItem('userId', data.data.id)
                    partner.value = data.data.partner
                }
            } catch (e) {
                console.error('获取用户信息失败:', e)
            }
        }
        
        // 添加快递
        const handleAdd = async () => {
            if (!canSubmit.value || submitting.value) return
            
            submitting.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/express', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({
                        trackingNo: form.value.trackingNo.trim(),
                        pickupLocation: form.value.pickupLocation.trim(),
                        description: form.value.description.trim()
                    })
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('添加成功', 'success')
                    showAddModal.value = false
                    form.value = { trackingNo: '', pickupLocation: '', description: '' }
                    await fetchList()
                } else {
                    showToast(data.message || '添加失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            submitting.value = false
        }
        
        // 取件
        const handlePick = async (id) => {
            try {
                const res = await fetch(`${CONFIG.API_URL}/express/${id}/pick`, {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('取件成功', 'success')
                    await fetchList()
                    activeTab.value = 'picked'
                } else {
                    showToast(data.message || '操作失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        // 撤销取件
        const handleUnpick = async (id) => {
            try {
                const res = await fetch(`${CONFIG.API_URL}/express/${id}/unpick`, {
                    method: 'PUT',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('撤销成功', 'success')
                    await fetchList()
                    activeTab.value = 'pending'
                } else {
                    showToast(data.message || '操作失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        // 删除
        const handleDelete = async (id) => {
            if (!confirm('确定要删除这个快递吗？')) return
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/express/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('删除成功', 'success')
                    await fetchList()
                } else {
                    showToast(data.message || '删除失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        // WebSocket 消息处理
        const handleWSMessage = (data) => {
            if (data.type?.startsWith('express')) {
                // 收到快递相关通知，刷新列表
                fetchList()
            }
        }
        
        // 监听弹窗打开，获取地点列表
        watch(showAddModal, (isOpen) => {
            if (isOpen && partner.value) {
                fetchLocations()
            }
        })
        
        onMounted(() => {
            fetchUser()
            fetchList()
            
            // 订阅 WebSocket 消息
            const unsubscribe = onMessage(handleWSMessage)
            
            onUnmounted(() => {
                unsubscribe()
            })
        })
        
        return {
            currentUserId,
            partner,
            pendingList,
            pickedList,
            activeTab,
            showAddModal,
            form,
            submitting,
            canSubmit,
            toast,
            locations,
            isAddingLocation,
            newLocationName,
            locationInput,
            handleAdd,
            handlePick,
            handleUnpick,
            handleDelete,
            handleLocationChange,
            handleAddLocation,
            cancelAddLocation,
            showToast
        }
    }
}
</script>

<style scoped>
.express-page {
    min-height: 100vh;
    position: relative;
    padding-bottom: 100px;
}

/* 背景 */
.bg-container {
    position: fixed;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
}

.gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
}

.orb-1 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
    top: -100px;
    right: -100px;
}

.orb-2 {
    width: 250px;
    height: 250px;
    background: linear-gradient(135deg, #DBED9C 0%, #B8D96A 100%);
    bottom: 10%;
    left: -80px;
}

/* 顶部导航 */
.header {
    position: sticky;
    top: 0;
    z-index: 100;
    padding: env(safe-area-inset-top, 0px) 20px 16px;
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
    color: var(--text-secondary);
}

.icon-placeholder {
    width: 40px;
}

/* 主内容 */
.main {
    max-width: 480px;
    margin: 0 auto;
    padding: 20px;
    position: relative;
    z-index: 1;
}

/* 标签切换 */
.tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
}

.tab {
    flex: 1;
    padding: 12px;
    text-align: center;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
}

.tab.active {
    background: linear-gradient(135deg, #FED0D6 0%, #FF97AF 100%);
    border-color: transparent;
    color: white;
}

.badge {
    position: absolute;
    top: -6px;
    right: -6px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: #E91E63;
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 快递列表 */
.express-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 空状态 */
.empty-state, .empty-list {
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
    margin-bottom: 8px;
}

.empty-desc, .empty-hint {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
}

.empty-text {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
}

.primary-btn {
    padding: 12px 32px;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
}

/* 悬浮按钮 */
.fab {
    position: fixed;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
    z-index: 50;
}

/* 弹窗 - 屏幕居中 */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    padding: 20px;
}

.modal-overlay.show {
    opacity: 1;
    visibility: visible;
}

.modal {
    width: 100%;
    max-width: 400px;
    background: var(--bg-primary);
    border-radius: var(--radius-xl);
    padding: 24px;
    transform: scale(0.9);
    transition: transform 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-overlay.show .modal {
    transform: scale(1);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 600;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
}

.required {
    color: #E91E63;
}

.optional {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: normal;
}

.form-group input {
    width: 100%;
    padding: 14px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    font-size: 15px;
    transition: all 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: #E91E63;
}

/* 地点选择 */
.location-select {
    position: relative;
}

.location-dropdown {
    width: 100%;
    padding: 14px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    font-size: 15px;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    cursor: pointer;
}

.location-dropdown:focus {
    outline: none;
    border-color: #E91E63;
}

.location-input-wrapper {
    display: flex;
    gap: 8px;
}

.location-input-wrapper input {
    flex: 1;
}

.btn-save-location, .btn-cancel-location {
    padding: 12px 16px;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    white-space: nowrap;
}

.btn-save-location {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
}

.btn-save-location:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-cancel-location {
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.modal-footer {
    display: flex;
    gap: 12px;
    margin-top: 24px;
}

.btn-cancel, .btn-confirm {
    flex: 1;
    padding: 14px;
    border-radius: var(--radius-lg);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    border: none;
}

.btn-cancel {
    background: var(--bg-card);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.btn-confirm {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
}

.btn-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* Toast */
.toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    padding: 12px 24px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: var(--radius-lg);
    font-size: 14px;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 300;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}

.toast.success {
    background: rgba(76, 175, 80, 0.9);
}

.toast.error {
    background: rgba(244, 67, 54, 0.9);
}
</style>
