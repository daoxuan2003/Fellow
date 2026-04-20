<template>
    <div class="shopping-page">
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
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
        
        <main class="main">
            <!-- 未绑定 -->
            <div v-if="!partner" class="empty-state">
                <div class="empty-icon">🛒</div>
                <div class="empty-title">请先绑定伴侣</div>
                <div class="empty-desc">绑定后才能使用购物清单哦~</div>
                <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
            </div>
            
            <!-- 首次引导：还没有任何清单 -->
            <div v-else-if="showOnboarding" class="onboarding">
                <div class="onboarding-emoji">🛍️</div>
                <h2>创建你的第一个清单</h2>
                <p>把想买的东西分门别类，购物更高效</p>
                <button class="primary-btn large" @click="showListModal = true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    创建清单
                </button>
            </div>
            
            <!-- 正常看板 -->
            <template v-else>
                <div class="ownership-tabs">
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'self' }"
                        @click="switchTab('self')"
                    >
                        <span class="tab-dot self"></span>
                        我的
                        <span v-if="selfCount > 0" class="tab-badge">{{ selfCount }}</span>
                    </div>
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'partner' }"
                        @click="switchTab('partner')"
                    >
                        <span class="tab-dot partner"></span>
                        {{ partnerPronoun }}的
                        <span v-if="partnerCount > 0" class="tab-badge">{{ partnerCount }}</span>
                    </div>
                    <div 
                        class="ownership-tab" 
                        :class="{ active: activeTab === 'both' }"
                        @click="switchTab('both')"
                    >
                        <span class="tab-dot both"></span>
                        共同
                        <span v-if="bothCount > 0" class="tab-badge">{{ bothCount }}</span>
                    </div>
                </div>
                
                <!-- 清单导航 -->
                <div class="board-nav" ref="boardNav">
                    <div 
                        v-for="col in boardColumns" 
                        :key="col.name"
                        class="board-nav-pill"
                        :class="{ active: activeColumnName === col.name }"
                        @click="scrollToColumn(col.name)"
                    >
                        <span class="nav-emoji">{{ col.emoji }}</span>
                        {{ col.name }}
                        <span v-if="col.pendingCount > 0" class="nav-count">{{ col.pendingCount }}</span>
                    </div>
                    <button class="board-nav-pill add" @click="showListModal = true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                        新建
                    </button>
                </div>
                
                <!-- 看板 -->
                <div class="board-container" ref="boardContainer" @scroll="onBoardScroll">
                    <div 
                        v-for="col in boardColumns" 
                        :key="col.name"
                        class="board-column"
                        :data-name="col.name"
                    >
                        <div class="board-header">
                            <div class="board-title">
                                <span class="board-emoji">{{ col.emoji }}</span>
                                <span class="board-name">{{ col.name }}</span>
                                <span v-if="col.pendingCount > 0" class="board-pending">{{ col.pendingCount }}</span>
                            </div>
                            <div class="board-actions">
                                <button 
                                    v-if="col.pendingCount > 0" 
                                    class="board-action-btn complete"
                                    @click="completeColumn(col)"
                                    title="全部完成"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                </button>
                                <button 
                                    class="board-action-btn delete"
                                    @click="deleteColumn(col)"
                                    title="删除清单"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <div class="board-body">
                            <div v-if="col.displayItems.length === 0" class="board-empty">
                                <span class="board-empty-emoji">📝</span>
                                <span>清单是空的</span>
                                <span class="board-empty-hint">点击下方添加第一个物品</span>
                            </div>
                            
                            <div 
                                v-for="item in col.displayItems" 
                                :key="item.id"
                                class="board-item"
                                :class="{ completed: item.status === 'completed', celebrating: celebratingId === item.id }"
                            >
                                <div class="item-check" @click="toggleComplete(item)">
                                    <div class="check-circle">
                                        <svg v-if="item.status === 'completed'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
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
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3 6 5 6 21 6"/>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        
                        <button class="board-add" @click="openAddToColumn(col.name)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            添加物品
                        </button>
                    </div>
                </div>
            </template>
        </main>
        
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
                        <label>所属清单</label>
                        <div class="list-name-readonly">
                            <span class="list-emoji">{{ currentFormListEmoji }}</span>
                            <span class="list-name-text">{{ form.listName || '未选择' }}</span>
                        </div>
                        <div class="list-name-hint">物品将归属到当前所在的清单</div>
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
        
        <!-- 新建清单弹窗 -->
        <div class="modal-overlay" :class="{ show: showListModal }" @click.self="showListModal = false">
            <div class="modal small">
                <div class="modal-header">
                    <h3>新建清单</h3>
                    <button class="close-btn" @click="showListModal = false">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>清单名称 <span class="required">*</span></label>
                        <input 
                            v-model="newListName" 
                            type="text" 
                            placeholder="例如：周末超市"
                            maxlength="20"
                            @keyup.enter="createList"
                        >
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-cancel" @click="showListModal = false">取消</button>
                    <button 
                        class="btn-confirm" 
                        :disabled="!newListName.trim()"
                        @click="createList"
                    >
                        创建
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
        
        <BottomNav @toast="showToast" />
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import BottomNav from '../components/BottomNav.vue'

const EMOJIS = ['🛒', '🧴', '🍿', '🥬', '🧃', '📦', '🎁', '🧸', '📱', '👕', '🧦', '🍫', '🧼', '🥛', '🍞']

export default {
    name: 'Shopping',
    components: { BottomNav },
    setup() {
        const router = useRouter()
        const { onMessage } = useWebSocket()
        
        const currentUserId = ref(localStorage.getItem('userId') || '')
        const partner = ref(null)
        const allItems = ref([])
        const listNames = ref([])
        const activeTab = ref('self')
        const activeColumnName = ref('')
        const boardContainer = ref(null)
        
        const partnerPronoun = computed(() => {
            if (partner.value?.gender === 'male') return '他'
            if (partner.value?.gender === 'female') return '她'
            return 'TA'
        })
        
        const selfCount = computed(() => allItems.value.filter(i => i.ownership === 'self' && i.status === 'pending').length)
        const partnerCount = computed(() => allItems.value.filter(i => i.ownership === 'partner' && i.status === 'pending').length)
        const bothCount = computed(() => allItems.value.filter(i => i.ownership === 'both' && i.status === 'pending').length)
        
        // 当前归属下是否有任何清单
        const hasAnyList = computed(() => {
            const items = allItems.value.filter(i => i.ownership === activeTab.value)
            const names = new Set()
            items.forEach(i => { if (i.listName) names.add(i.listName) })
            return names.size > 0
        })
        
        const showOnboarding = computed(() => {
            return listNames.value.length === 0 && allItems.value.length === 0
        })
        
        // 看板列：只显示有名字的清单
        const boardColumns = computed(() => {
            const columns = []
            const items = allItems.value.filter(i => i.ownership === activeTab.value)
            
            // 只遍历有 listName 的清单
            const names = new Set()
            items.forEach(i => { if (i.listName) names.add(i.listName) })
            listNames.value.forEach(n => names.add(n))
            
            Array.from(names).forEach((name, idx) => {
                const colItems = items.filter(i => i.listName === name)
                columns.push(makeColumn(name, colItems, idx))
            })
            
            return columns
        })
        
        function makeColumn(name, items, emojiIdx) {
            const pending = items.filter(i => i.status === 'pending')
            const completed = items.filter(i => i.status === 'completed')
            return {
                name,
                emoji: EMOJIS[emojiIdx % EMOJIS.length],
                items,
                displayItems: [...pending, ...completed],
                pendingCount: pending.length
            }
        }
        
        const currentFormListEmoji = computed(() => {
            const idx = listNames.value.indexOf(form.value.listName)
            return EMOJIS[(idx >= 0 ? idx : 0) % EMOJIS.length]
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
        
        const switchTab = (tab) => {
            activeTab.value = tab
            activeColumnName.value = ''
            nextTick(() => {
                if (boardContainer.value) {
                    boardContainer.value.scrollLeft = 0
                    updateActiveColumnFromScroll()
                }
            })
        }
        
        const scrollToColumn = (name) => {
            const el = boardContainer.value?.querySelector(`[data-name="${name}"]`)
            if (el && boardContainer.value) {
                boardContainer.value.scrollTo({
                    left: el.offsetLeft - 16,
                    behavior: 'smooth'
                })
            }
        }
        
        const onBoardScroll = () => {
            updateActiveColumnFromScroll()
        }
        
        const updateActiveColumnFromScroll = () => {
            if (!boardContainer.value) return
            const container = boardContainer.value
            const cols = container.querySelectorAll('.board-column')
            const center = container.scrollLeft + container.clientWidth / 2
            let closest = null
            let closestDist = Infinity
            cols.forEach(col => {
                const colCenter = col.offsetLeft + col.clientWidth / 2
                const dist = Math.abs(center - colCenter)
                if (dist < closestDist) {
                    closestDist = dist
                    closest = col
                }
            })
            if (closest) {
                activeColumnName.value = closest.getAttribute('data-name')
            }
        }
        
        // 弹窗
        const showAddModal = ref(false)
        const showEditModal = ref(false)
        const showListModal = ref(false)
        const submitting = ref(false)
        const editingId = ref('')
        const form = ref({
            name: '',
            quantity: '1',
            note: '',
            image: null,
            ownership: 'self',
            listName: ''
        })
        const formPreview = ref('')
        const photoFile = ref(null)
        const fileInput = ref(null)
        const previewUrl = ref(null)
        const celebratingId = ref(null)
        const newListName = ref('')
        
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
                    listNames.value = data.data.listNames || []
                    nextTick(() => {
                        updateActiveColumnFromScroll()
                    })
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
            form.value = { name: '', quantity: '1', note: '', image: null, ownership: 'self', listName: activeColumnName.value || listNames.value[0] || '' }
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
                ownership: item.ownership,
                listName: item.listName || ''
            }
            formPreview.value = item.imageUrl || ''
            showEditModal.value = true
        }
        
        const openAddToColumn = (colName) => {
            form.value.listName = colName
            showAddModal.value = true
        }
        
        const handleSubmit = async () => {
            if (!form.value.name.trim() || submitting.value) return
            
            const finalListName = form.value.listName || activeColumnName.value || listNames.value[0]
            if (!finalListName) {
                showToast('请先创建一个清单', 'error')
                return
            }
            
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
                    ownership: form.value.ownership,
                    listName: finalListName
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
        
        const createList = () => {
            const name = newListName.value.trim()
            if (!name) return
            if (listNames.value.includes(name)) {
                showToast('清单名称已存在', 'error')
                return
            }
            listNames.value.push(name)
            activeColumnName.value = name
            newListName.value = ''
            showListModal.value = false
            showToast('清单创建成功', 'success')
            nextTick(() => {
                scrollToColumn(name)
            })
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
        
        const completeColumn = async (col) => {
            const pendingItems = col.items.filter(i => i.status === 'pending')
            if (pendingItems.length === 0) return
            if (!confirm(`确定将「${col.name}」中 ${pendingItems.length} 个物品全部标记为已购吗？`)) return
            
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
                showToast(`「${col.name}」已完成 ${successCount} 个`, 'success')
                await fetchList(true)
            } else {
                showToast('操作失败', 'error')
            }
        }
        
        const deleteColumn = async (col) => {
            if (!confirm(`确定删除清单「${col.name}」吗？\n\n该清单下 ${col.items.length} 个物品将一并删除，此操作不可恢复。`)) return
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/shopping/list/${encodeURIComponent(col.name)}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast(`「${col.name}」已删除`, 'success')
                    await fetchList(true)
                } else {
                    showToast(data.message || '删除失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        const previewImage = (url) => {
            previewUrl.value = url
        }
        
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
            activeColumnName,
            boardColumns,
            boardContainer,
            showOnboarding,
            selfCount,
            partnerCount,
            bothCount,
            partnerPronoun,
            ownershipOptions,
            ownershipText,
            currentFormListEmoji,
            switchTab,
            scrollToColumn,
            onBoardScroll,
            showAddModal,
            showEditModal,
            showListModal,
            submitting,
            form,
            formPreview,
            fileInput,
            previewUrl,
            celebratingId,
            newListName,
            toast,
            triggerFileInput,
            handleFileChange,
            removePhoto,
            closeModal,
            openEdit,
            openAddToColumn,
            handleSubmit,
            createList,
            toggleComplete,
            handleDelete,
            completeColumn,
            deleteColumn,
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
    padding-bottom: 20px;
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
    margin-bottom: 12px;
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

/* 首次引导 */
.onboarding {
    text-align: center;
    padding: 80px 20px;
}

.onboarding-emoji {
    font-size: 72px;
    margin-bottom: 20px;
}

.onboarding h2 {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
}

.onboarding p {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: 32px;
}

.primary-btn {
    padding: 14px 36px;
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 28px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 6px 20px rgba(233, 30, 99, 0.3);
}

.primary-btn.large {
    padding: 16px 40px;
    font-size: 17px;
}

/* 空状态 */
.empty-state {
    text-align: center;
    padding: 80px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 20px;
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
    margin-bottom: 8px;
}

/* 清单导航 */
.board-nav {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
    overflow-x: auto;
    padding-bottom: 4px;
    flex-wrap: nowrap;
}

.board-nav-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    flex-shrink: 0;
}

.board-nav-pill.active {
    background: linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

.nav-emoji {
    font-size: 15px;
}

.nav-count {
    font-size: 10px;
    padding: 1px 6px;
    background: rgba(255,255,255,0.25);
    border-radius: 8px;
}

.board-nav-pill.add {
    background: transparent;
    border-style: dashed;
    color: var(--text-tertiary);
}

.board-nav-pill.add:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
}

/* 看板容器 */
.board-container {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding-bottom: 12px;
    margin: 0 -20px;
    padding-left: 20px;
    padding-right: 20px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.board-container::-webkit-scrollbar {
    display: none;
}

/* 看板列 */
.board-column {
    flex: 0 0 auto;
    width: calc(100vw - 64px);
    max-width: 416px;
    background: #ffffff;
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 16px;
    scroll-snap-align: center;
    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 300px);
}

/* 框头 */
.board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-color);
}

.board-title {
    display: flex;
    align-items: center;
    gap: 8px;
}

.board-emoji {
    font-size: 22px;
}

.board-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
}

.board-pending {
    font-size: 11px;
    font-weight: 600;
    color: #8B5CF6;
    background: rgba(139, 92, 246, 0.1);
    padding: 2px 8px;
    border-radius: 10px;
}

.board-actions {
    display: flex;
    gap: 6px;
}

.board-action-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    background: transparent;
    color: var(--text-tertiary);
}

.board-action-btn.complete {
    background: rgba(16, 185, 129, 0.1);
    color: #10B981;
}

.board-action-btn.complete:hover {
    background: rgba(16, 185, 129, 0.18);
}

.board-action-btn.delete {
    color: var(--text-tertiary);
}

.board-action-btn.delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
}

/* 框内容 */
.board-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 80px;
}

.board-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 36px 0;
    color: var(--text-tertiary);
    font-size: 14px;
    gap: 6px;
}

.board-empty-emoji {
    font-size: 40px;
}

.board-empty-hint {
    font-size: 12px;
    color: var(--text-tertiary);
}

/* 看板内物品 */
.board-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    transition: all 0.3s ease;
}

.board-item.completed {
    opacity: 0.6;
    background: rgba(16, 185, 129, 0.04);
    border-color: rgba(16, 185, 129, 0.2);
}

.board-item.celebrating {
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
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    transition: all 0.2s;
}

.board-item.completed .check-circle {
    background: #10B981;
    border-color: #10B981;
}

.item-image {
    width: 44px;
    height: 44px;
    border-radius: 10px;
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
    font-size: 20px;
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
    gap: 6px;
    margin-bottom: 2px;
}

.item-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.item-name.strike {
    text-decoration: line-through;
    color: var(--text-tertiary);
}

.item-quantity {
    font-size: 12px;
    color: var(--text-secondary);
    font-weight: 500;
}

.item-note {
    font-size: 11px;
    color: var(--text-secondary);
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.item-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.meta-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 8px;
}

.meta-badge.self { color: #3B82F6; background: rgba(59, 130, 246, 0.1); }
.meta-badge.partner { color: #EC4899; background: rgba(236, 72, 153, 0.1); }
.meta-badge.both { color: #10B981; background: rgba(16, 185, 129, 0.1); }

.completer {
    font-size: 10px;
    color: var(--text-tertiary);
}

.item-delete {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
}

.item-delete:hover {
    background: rgba(239, 68, 68, 0.1);
    color: #EF4444;
}

/* 框底添加 */
.board-add {
    margin-top: 12px;
    padding: 10px;
    background: var(--bg-input);
    border: 1.5px dashed var(--border-color);
    border-radius: 12px;
    color: var(--text-secondary);
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
}

.board-add:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.04);
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
    max-width: 400px;
    max-height: 85vh;
    background: #ffffff;
    border-radius: 24px;
    padding: 20px 0 24px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.15);
    transform: scale(0.95);
    opacity: 0;
    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    overflow-y: auto;
    margin: 20px;
}

.modal.small {
    max-width: 340px;
}

.modal-overlay.show .modal {
    transform: scale(1);
    opacity: 1;
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
    margin-bottom: 14px;
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
    padding: 11px 14px;
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

/* 清单只读展示 */
.list-name-readonly {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 11px 14px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background: #f5f5f5;
    color: var(--text-tertiary);
    font-size: 15px;
}

.list-emoji {
    font-size: 18px;
}

.list-name-text {
    color: var(--text-secondary);
    font-weight: 500;
}

.list-name-hint {
    font-size: 12px;
    color: var(--text-tertiary);
    margin-top: 4px;
}

/* 照片上传 */
.photo-upload {
    width: 100%;
    aspect-ratio: 16/10;
    max-height: 160px;
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
    gap: 6px;
}

.ownership-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 10px 4px;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--bg-input);
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
    border: none;
}

.ownership-option.active {
    border: 1px solid var(--color-primary);
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
