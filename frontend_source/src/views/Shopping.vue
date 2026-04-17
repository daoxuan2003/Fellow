<template>
    <div class="shopping-page">
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
                <span class="header-title">购物清单</span>
                <div class="icon-placeholder"></div>
            </div>
        </header>
        
        <!-- 主内容 -->
        <main class="main">
            <!-- 未绑定提示 -->
            <div v-if="!partner" class="empty-state">
                <div class="empty-icon">🛒</div>
                <div class="empty-title">请先绑定伴侣</div>
                <div class="empty-desc">绑定后才能使用购物清单哦~</div>
                <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
            </div>
            
            <!-- 正常内容 -->
            <template v-else>
                <!-- 标签切换 -->
                <div class="ownership-tabs">
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'self' }"
                        @click="activeTab = 'self'"
                    >
                        <span class="tab-dot self"></span>
                        我的
                        <span v-if="selfCount > 0" class="tab-badge">{{ selfCount }}</span>
                    </div>
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'partner' }"
                        @click="activeTab = 'partner'"
                    >
                        <span class="tab-dot partner"></span>
                        {{ partnerPronoun }}的
                        <span v-if="partnerCount > 0" class="tab-badge">{{ partnerCount }}</span>
                    </div>
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'both' }"
                        @click="activeTab = 'both'"
                    >
                        <span class="tab-dot both"></span>
                        共同
                        <span v-if="bothCount > 0" class="tab-badge">{{ bothCount }}</span>
                    </div>
                </div>
                
                <!-- 子标签：待购 / 已购 -->
                <div class="status-tabs">
                    <div 
                        class="status-tab" 
                        :class="{ active: activeStatus === 'pending' }"
                        @click="activeStatus = 'pending'"
                    >
                        待购 {{ currentList.filter(i => i.status === 'pending').length }}
                    </div>
                    <div 
                        class="status-tab" 
                        :class="{ active: activeStatus === 'completed' }"
                        @click="activeStatus = 'completed'"
                    >
                        已购 {{ currentList.filter(i => i.status === 'completed').length }}
                    </div>
                </div>
                
                <!-- 批量操作 -->
                <div v-if="activeStatus === 'pending' && currentList.filter(i => i.status === 'pending').length > 0" class="batch-bar">
                    <span class="batch-count">{{ currentList.filter(i => i.status === 'pending').length }} 个待购</span>
                    <button class="btn-complete-all" @click="handleCompleteAll">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        全部完成
                    </button>
                </div>
                
                <!-- 购物列表 -->
                <div class="shopping-list">
                    <div v-if="displayList.length === 0" class="empty-list">
                        <div class="empty-icon">🛍️</div>
                        <div class="empty-text">
                            {{ activeStatus === 'pending' ? '清单是空的' : '还没有已购物品' }}
                        </div>
                        <div v-if="activeStatus === 'pending'" class="empty-hint">点击下方按钮添加一个吧~</div>
                    </div>
                    
                    <div 
                        v-for="item in displayList" 
                        :key="item.id"
                        class="shopping-item"
                        :class="{ completed: item.status === 'completed', celebrating: celebratingId === item.id }"
                    >
                        <div class="item-check" @click="toggleComplete(item)">
                            <div class="check-circle">
                                <svg v-if="item.status === 'completed'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="item-image" v-if="item.imageUrl" @click="previewImage(item.imageUrl)">
                            <img :src="item.imageUrl" alt="商品图片" />
                        </div>
                        <div class="item-image placeholder" v-else>
                            <span>🛒</span>
                        </div>
                        
                        <div class="item-info" @click="openEdit(item)">
                            <div class="item-name-row">
                                <span class="item-name" :class="{ strike: item.status === 'completed' }">{{ item.name }}</span>
                                <span class="item-quantity">x{{ item.quantity }}</span>
                            </div>
                            <div v-if="item.note" class="item-note">{{ item.note }}</div>
                            <div class="item-meta">
                                <span class="meta-badge" :class="item.ownership">
                                    {{ ownershipText(item.ownership) }}
                                </span>
                                <span v-if="item.status === 'completed' && item.completer" class="completer">
                                    {{ item.completer.nickname }} 已购
                                </span>
                            </div>
                        </div>
                        
                        <button class="item-delete" @click.stop="handleDelete(item)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </template>
        </main>
        
        <!-- 底部按钮 -->
        <div v-if="partner" class="fab" @click="showAddModal = true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
        </div>
        
        <!-- 添加/编辑弹窗 -->
        <div class="modal-overlay" :class="{ show: showAddModal || showEditModal }" @click.self="closeModal">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ showEditModal ? '编辑物品' : '添加物品' }}</h3>
                    <button class="close-btn" @click="closeModal">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label>照片</label>
                        <div class="photo-upload" @click="triggerFileInput">
                            <img v-if="formPreview" :src="formPreview" class="photo-preview" />
                            <div v-else class="upload-placeholder">
                                <span class="upload-icon">📷</span>
                                <span>点击添加照片</span>
                            </div>
                            <input 
                                ref="fileInput"
                                type="file" 
                                accept="image/*" 
                                style="display: none"
                                @change="handleFileChange"
                            />
                            <button v-if="formPreview" class="photo-remove" @click.stop="removePhoto">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>物品名称 <span class="required">*</span></label>
                        <input 
                            v-model="form.name" 
                            type="text" 
                            placeholder="例如：牛奶、纸巾"
                            maxlength="50"
                        >
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group flex-1">
                            <label>数量</label>
                            <input 
                                v-model="form.quantity" 
                                type="text" 
                                placeholder="例如：2箱"
                                maxlength="20"
                            >
                        </div>
                        <div class="form-group flex-1">
                            <label>归属</label>
                            <div class="ownership-options">
                                <button 
                                    v-for="opt in ownershipOptions" 
                                    :key="opt.value"
                                    class="ownership-option"
                                    :class="{ active: form.ownership === opt.value }"
                                    @click="form.ownership = opt.value"
                                >
                                    <span class="opt-dot" :class="opt.value"></span>
                                    {{ opt.label }}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>备注</label>
                        <input 
                            v-model="form.note" 
                            type="text" 
                            placeholder="例如：买全脂的、大包装"
                            maxlength="100"
                        >
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-cancel" @click="closeModal">取消</button>
                    <button 
                        class="btn-confirm" 
                        :disabled="!form.name.trim() || submitting"
                        @click="handleSubmit"
                    >
                        {{ submitting ? '保存中...' : '保存' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 图片预览 -->
        <div class="image-preview-overlay" :class="{ show: previewUrl }" @click.self="previewUrl = null">
            <img v-if="previewUrl" :src="previewUrl" class="preview-image" />
        </div>
        
        <!-- 庆祝动画 -->
        <div v-if="celebratingId" class="celebration-overlay">
            <div class="celebration-content">
                <div class="celebration-emoji">🎉</div>
                <div class="celebration-text">买到啦！</div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    name: 'Shopping',
    components: { BottomNav },
    setup() {
        const router = useRouter()
        const { onMessage } = useWebSocket()
        
        const currentUserId = ref(localStorage.getItem('userId') || '')
        const partner = ref(null)
        const allItems = ref([])
        const activeTab = ref('self')
        const activeStatus = ref('pending')
        const loading = ref(false)
        
        const partnerPronoun = computed(() => {
            if (partner.value?.gender === 'male') return '他'
            if (partner.value?.gender === 'female') return '她'
            return 'TA'
        })
        
        const selfCount = computed(() => allItems.value.filter(i => i.ownership === 'self' && i.status === 'pending').length)
        const partnerCount = computed(() => allItems.value.filter(i => i.ownership === 'partner' && i.status === 'pending').length)
        const bothCount = computed(() => allItems.value.filter(i => i.ownership === 'both' && i.status === 'pending').length)
        
        const currentList = computed(() => {
            return allItems.value.filter(i => i.ownership === activeTab.value)
        })
        
        const displayList = computed(() => {
            return currentList.value.filter(i => i.status === activeStatus.value)
        })
        
        const ownershipOptions = computed(() => [
            { label: '我的', value: 'self' },
            { label: partnerPronoun.value + '的', value: 'partner' },
            { label: '共同', value: 'both' }
        ])
        
        const ownershipText = (val) => {
            const map = { self: '我的', partner: partnerPronoun.value + '的', both: '共同' }
            return map[val] || val
        }
        
        // 弹窗相关
        const showAddModal = ref(false)
        const showEditModal = ref(false)
        const submitting = ref(false)
        const editingId = ref('')
        const form = ref({
            name: '',
            quantity: '1',
            note: '',
            image: null,
            ownership: 'self'
        })
        const formPreview = ref('')
        const photoFile = ref(null)
        const fileInput = ref(null)
        const previewUrl = ref(null)
        const celebratingId = ref(null)
        
        const toast = ref({ show: false, message: '', type: 'info', timer: null })
        
        const showToast = (message, type = 'info') => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message, type }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }
        
        const getToken = () => localStorage.getItem('token')
        
        const fetchUser = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/me', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    currentUserId.value = data.data.id
                    partner.value = data.data.partner
                    localStorage.setItem('userId', data.data.id)
                }
            } catch (e) {
                console.error('获取用户信息失败:', e)
            }
        }
        
        const fetchList = async (force = false) => {
            try {
                const res = await fetch(CONFIG.API_URL + '/shopping', {
                    headers: { 'Authorization': 'Bearer ' + getToken() },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    allItems.value = data.data.list || []
                }
            } catch (e) {
                console.error('获取购物清单失败:', e)
            }
        }
        
        const triggerFileInput = () => {
            fileInput.value?.click()
        }
        
        const handleFileChange = (e) => {
            const file = e.target.files[0]
            if (!file) return
            photoFile.value = file
            formPreview.value = URL.createObjectURL(file)
        }
        
        const removePhoto = () => {
            form.value.image = null
            formPreview.value = ''
            photoFile.value = null
            if (fileInput.value) fileInput.value.value = ''
        }
        
        const uploadPhoto = async (file) => {
            const formData = new FormData()
            formData.append('file', file)
            
            const res = await fetch(CONFIG.API_URL + '/upload', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + getToken() },
                body: formData
            })
            const data = await res.json()
            if (!data.success) throw new Error(data.message || '上传失败')
            return data.data.path
        }
        
        const closeModal = () => {
            showAddModal.value = false
            showEditModal.value = false
            editingId.value = ''
            form.value = { name: '', quantity: '1', note: '', image: null, ownership: 'self' }
            formPreview.value = ''
            photoFile.value = null
            if (fileInput.value) fileInput.value.value = ''
        }
        
        const openEdit = (item) => {
            if (item.createdBy !== currentUserId.value) return
            editingId.value = item.id
            form.value = {
                name: item.name,
                quantity: item.quantity,
                note: item.note,
                image: item.image,
                ownership: item.ownership
            }
            formPreview.value = item.imageUrl || ''
            showEditModal.value = true
        }
        
        const handleSubmit = async () => {
            if (!form.value.name.trim() || submitting.value) return
            
            submitting.value = true
            try {
                let imagePath = form.value.image
                if (photoFile.value) {
                    imagePath = await uploadPhoto(photoFile.value)
                }
                
                const payload = {
                    name: form.value.name.trim(),
                    quantity: form.value.quantity.trim() || '1',
                    note: form.value.note.trim(),
                    image: imagePath,
                    ownership: form.value.ownership
                }
                
                const url = editingId.value 
                    ? `${CONFIG.API_URL}/shopping/${editingId.value}`
                    : `${CONFIG.API_URL}/shopping`
                const method = editingId.value ? 'PUT' : 'POST'
                
                const res = await fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify(payload)
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast(editingId.value ? '修改成功' : '添加成功', 'success')
                    closeModal()
                    await fetchList(true)
                } else {
                    showToast(data.message || '保存失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            } finally {
                submitting.value = false
            }
        }
        
        const toggleComplete = async (item) => {
            const newStatus = item.status === 'completed' ? false : true
            try {
                const res = await fetch(`${CONFIG.API_URL}/shopping/${item.id}/complete`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ completed: newStatus })
                })
                const data = await res.json()
                if (data.success) {
                    if (newStatus) {
                        celebratingId.value = item.id
                        setTimeout(() => {
                            celebratingId.value = null
                        }, 1200)
                    }
                    await fetchList(true)
                } else {
                    showToast(data.message || '操作失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        const handleDelete = async (item) => {
            if (!confirm(`确定要删除「${item.name}」吗？`)) return
            try {
                const res = await fetch(`${CONFIG.API_URL}/shopping/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('删除成功', 'success')
                    await fetchList(true)
                } else {
                    showToast(data.message || '删除失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        const handleCompleteAll = async () => {
            const pendingItems = currentList.value.filter(i => i.status === 'pending')
            if (pendingItems.length === 0) return
            if (!confirm(`确定将 ${pendingItems.length} 个待购物品全部标记为已购吗？`)) return
            
            let successCount = 0
            for (const item of pendingItems) {
                try {
                    const res = await fetch(`${CONFIG.API_URL}/shopping/${item.id}/complete`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + getToken()
                        },
                        body: JSON.stringify({ completed: true })
                    })
                    const data = await res.json()
                    if (data.success) successCount++
                } catch (e) {}
            }
            
            if (successCount > 0) {
                showToast(`已完成 ${successCount} 个购物项`, 'success')
                await fetchList(true)
            } else {
                showToast('操作失败', 'error')
            }
        }
        
        const previewImage = (url) => {
            previewUrl.value = url
        }
        
        // WebSocket 消息处理
        const handleWSMessage = (data) => {
            if (data.type?.startsWith('shopping')) {
                fetchList(true)
            }
        }
        
        onMounted(() => {
            fetchUser()
            fetchList()
            const unsubscribe = onMessage(handleWSMessage)
            onUnmounted(() => {
                unsubscribe()
            })
        })
        
        return {
            partner,
            activeTab,
            activeStatus,
            currentList,
            displayList,
            selfCount,
            partnerCount,
            bothCount,
            partnerPronoun,
            ownershipOptions,
            ownershipText,
            showAddModal,
            showEditModal,
            submitting,
            form,
            formPreview,
            fileInput,
            previewUrl,
            celebratingId,
            toast,
            triggerFileInput,
            handleFileChange,
            removePhoto,
            closeModal,
            openEdit,
            handleSubmit,
            toggleComplete,
            handleDelete,
            handleCompleteAll,
            previewImage,
            showToast
        }
    }
}
</script>

<style scoped>
.shopping-page {
    min-height: 100vh;
    position: relative;
    padding-bottom: 100px;
}

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
    background: linear-gradient(135deg, #FBCFE8 0%, #FDE68A 100%);
    top: -100px;
    right: -100px;
}

.orb-2 {
    width: 250px;
    height: 250px;
    background: linear-gradient(135deg, #BAE6FD 0%, #C7D2FE 100%);
    bottom: 100px;
    left: -80px;
}

/* 顶部导航 */
.header {
    position: sticky;
    top: 0;
    z-index: 10;
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

/* 归属标签 */
.ownership-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
    padding-bottom: 4px;
}

.ownership-tab {
    flex: 1;
    min-width: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.ownership-tab.active {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 14px rgba(233, 30, 99, 0.25);
}

.tab-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

.tab-dot.self { background: #3B82F6; }
.tab-dot.partner { background: #EC4899; }
.tab-dot.both { background: #10B981; }

.ownership-tab.active .tab-dot { background: rgba(255,255,255,0.9) !important; }

.tab-badge {
    font-size: 11px;
    padding: 1px 6px;
    background: rgba(233, 30, 99, 0.12);
    border-radius: 10px;
    color: var(--color-primary);
}

.ownership-tab.active .tab-badge {
    background: rgba(255,255,255,0.25);
    color: white;
}

/* 状态标签 */
.status-tabs {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    padding: 0 4px;
}

.status-tab {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-tertiary);
    cursor: pointer;
    padding-bottom: 6px;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
}

.status-tab.active {
    color: var(--text-primary);
    border-bottom-color: var(--color-primary);
}

/* 空状态 */
.empty-state,
.empty-list {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 56px;
    margin-bottom: 16px;
}

.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.empty-desc,
.empty-text {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.empty-hint {
    font-size: 13px;
    color: var(--text-tertiary);
}

.primary-btn {
    margin-top: 20px;
    padding: 12px 32px;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 24px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
}

/* 购物列表 */
.shopping-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.shopping-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    transition: all 0.3s ease;
}

.shopping-item.completed {
    opacity: 0.75;
    background: rgba(16, 185, 129, 0.04);
    border-color: rgba(16, 185, 129, 0.2);
}

.shopping-item.celebrating {
    animation: itemCelebrate 0.6s ease;
    background: rgba(16, 185, 129, 0.1);
    border-color: #10B981;
}

@keyframes itemCelebrate {
    0% { transform: scale(1); }
    30% { transform: scale(1.03); }
    60% { transform: scale(0.98); }
    100% { transform: scale(1); }
}

.item-check {
    flex-shrink: 0;
    cursor: pointer;
}

.check-circle {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 0.2s;
}

.shopping-item.completed .check-circle {
    background: #10B981;
    border-color: #10B981;
}

.item-image {
    width: 52px;
    height: 52px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
    cursor: pointer;
    background: var(--bg-input);
}

.item-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.item-image.placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: default;
}

.item-info {
    flex: 1;
    min-width: 0;
    cursor: pointer;
}

.item-name-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
}

.item-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.item-name.strike {
    text-decoration: line-through;
    color: var(--text-tertiary);
}

.item-quantity {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.item-note {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 8px;
}

.meta-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 10px;
}

.meta-badge.self { color: #3B82F6; background: rgba(59, 130, 246, 0.1); }
.meta-badge.partner { color: #EC4899; background: rgba(236, 72, 153, 0.1); }
.meta-badge.both { color: #10B981; background: rgba(16, 185, 129, 0.1); }

.completer {
    font-size: 11px;
    color: var(--text-tertiary);
}

.item-delete {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.item-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
}

/* 底部按钮 */
.fab {
    position: fixed;
    bottom: calc(84px + env(safe-area-inset-bottom, 0px));
    right: 20px;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(233, 30, 99, 0.35);
    z-index: 50;
    transition: transform 0.2s;
}

.fab:active {
    transform: scale(0.92);
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 100;
    opacity: 0;
    visibility: hidden;
    transition: all 0.25s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-overlay.show {
    opacity: 1;
    visibility: visible;
}

.modal {
    width: 100%;
    max-width: 480px;
    max-height: 85vh;
    background: #ffffff;
    border-radius: 24px;
    padding: 20px 0 28px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    overflow-y: auto;
}

.modal-overlay.show .modal {
    transform: translateY(0);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px 16px;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 16px;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: var(--bg-card);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.modal-body {
    padding: 0 24px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 6px;
}

.form-group input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: var(--bg-input);
    font-size: 15px;
    color: var(--text-primary);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
}

.form-group input:focus {
    border-color: var(--color-primary);
}

.form-row {
    display: flex;
    gap: 12px;
}

.flex-1 {
    flex: 1;
}

.required {
    color: #EF4444;
}

/* 照片上传 */
.photo-upload {
    width: 100%;
    aspect-ratio: 16/10;
    max-height: 180px;
    border-radius: 16px;
    background: var(--bg-input);
    border: 2px dashed var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: border-color 0.2s;
}

.photo-upload:hover {
    border-color: var(--color-primary);
}

.photo-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.upload-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--text-tertiary);
    font-size: 14px;
}

.upload-icon {
    font-size: 36px;
    margin-bottom: 4px;
}

.photo-remove {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: white;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

/* 归属选项 */
.ownership-options {
    display: flex;
    gap: 8px;
}

.ownership-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 8px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-input);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
}

.ownership-option.active {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.06);
}

.opt-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
}

.opt-dot.self { background: #3B82F6; }
.opt-dot.partner { background: #EC4899; }
.opt-dot.both { background: #10B981; }

/* 批量操作栏 */
.batch-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 0 4px;
}

.batch-count {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.btn-complete-all {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    background: rgba(16, 185, 129, 0.1);
    color: #10B981;
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-complete-all:hover {
    background: rgba(16, 185, 129, 0.18);
}

.btn-complete-all svg {
    stroke-width: 2.5;
}

/* 弹窗底部 */
.modal-footer {
    display: flex;
    gap: 12px;
    padding: 8px 24px 0;
}

.btn-cancel,
.btn-confirm {
    flex: 1;
    padding: 12px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 0.2s;
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

/* 图片预览 */
.image-preview-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.9);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: all 0.25s;
}

.image-preview-overlay.show {
    opacity: 1;
    visibility: visible;
}

.preview-image {
    max-width: 90%;
    max-height: 80vh;
    border-radius: 12px;
}

/* 庆祝动画 */
.celebration-overlay {
    position: fixed;
    inset: 0;
    z-index: 150;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    animation: celebrationIn 0.4s ease forwards;
}

@keyframes celebrationIn {
    0% { opacity: 0; transform: scale(0.8); }
    50% { opacity: 1; transform: scale(1.1); }
    100% { opacity: 1; transform: scale(1); }
}

.celebration-content {
    background: rgba(255,255,255,0.98);
    padding: 28px 48px;
    border-radius: 24px;
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    animation: celebrationOut 0.3s ease 0.9s forwards;
}

@keyframes celebrationOut {
    to { opacity: 0; transform: scale(0.9); }
}

.celebration-emoji {
    font-size: 56px;
    margin-bottom: 8px;
}

.celebration-text {
    font-size: 20px;
    font-weight: 700;
    color: #10B981;
}

/* Toast */
.toast {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 60px);
    left: 50%;
    transform: translateX(-50%) translateY(-20px);
    padding: 12px 24px;
    background: rgba(0,0,0,0.8);
    color: white;
    border-radius: 24px;
    font-size: 14px;
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s;
    z-index: 120;
    white-space: nowrap;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}

.toast.success { background: rgba(16, 185, 129, 0.9); }
.toast.error { background: rgba(239, 68, 68, 0.9); }
</style>
