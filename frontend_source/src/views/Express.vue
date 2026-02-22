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
                        :current-user-gender="currentUserGender"
                        :partner-gender="partner?.gender"
                        @pick="handlePick"
                        @delete="handleDelete"
                    />
                </div>
                
                <!-- 已取列表 -->
                <div v-else class="express-list">
                    <!-- 筛选按钮 -->
                    <div v-if="pickedList.length > 0" class="picked-filter">
                        <button 
                            v-for="filter in pickedFilters" 
                            :key="filter.value"
                            class="filter-btn"
                            :class="{ active: pickedFilter === filter.value }"
                            @click="pickedFilter = filter.value"
                        >
                            {{ filter.label }}
                        </button>
                    </div>
                    
                    <div v-if="groupedPickedList.length === 0" class="empty-list">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">{{ pickedFilter === 'all' ? '暂时没有已取快递' : '该筛选条件下没有快递' }}</div>
                    </div>
                    
                    <!-- 按时间分组显示 - 时间线风格 -->
                    <template v-else>
                        <div class="timeline">
                            <!-- 时间轴线 -->
                            <div class="timeline-track"></div>
                            <template v-for="group in groupedPickedList" :key="group.label">
                                <!-- 本月（始终展开） -->
                                <div v-if="!group.type" class="timeline-group">
                                    <div class="timeline-dot"></div>
                                    <div class="timeline-content">
                                        <div class="timeline-header">
                                            <span class="timeline-label">{{ group.label }}</span>
                                            <span class="timeline-count">{{ group.items.length }}个</span>
                                        </div>
                                        <div class="timeline-items">
                                            <ExpressCard
                                                v-for="item in group.items"
                                                :key="item.id"
                                                :data="item"
                                                :current-user-id="currentUserId"
                                                :current-user-gender="currentUserGender"
                                                :partner-gender="partner?.gender"
                                                @unpick="handleUnpick"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 上个月（可折叠） -->
                                <div v-else-if="group.type === 'collapsible'" class="timeline-group">
                                    <div class="timeline-dot" style="background: #F06292; box-shadow: 0 0 0 2px #F06292;"></div>
                                    <div class="timeline-content">
                                        <div 
                                            class="timeline-header"
                                            :class="{ collapsed: collapsedSections[group.key] }"
                                            @click="toggleSection(group.key)"
                                        >
                                            <svg class="timeline-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="6 9 12 15 18 9"/>
                                            </svg>
                                            <span class="timeline-label">{{ group.label }}</span>
                                            <span class="timeline-count">{{ group.items.length }}个</span>
                                        </div>
                                        <div v-show="!collapsedSections[group.key]" class="timeline-items">
                                            <ExpressCard
                                                v-for="item in group.items"
                                                :key="item.id"
                                                :data="item"
                                                :current-user-id="currentUserId"
                                                :current-user-gender="currentUserGender"
                                                :partner-gender="partner?.gender"
                                                @unpick="handleUnpick"
                                            />
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 年份分组（可折叠） -->
                                <div v-else class="timeline-year-group">
                                    <div class="timeline-dot year-dot"></div>
                                    <div class="timeline-content">
                                        <div 
                                            class="timeline-header year-header"
                                            :class="{ collapsed: collapsedSections[group.key] }"
                                            @click="toggleSection(group.key)"
                                        >
                                            <svg class="timeline-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="6 9 12 15 18 9"/>
                                            </svg>
                                            <span class="timeline-label">{{ group.label }}</span>
                                            <span class="timeline-count">{{ group.monthGroups.reduce((sum, m) => sum + m.items.length, 0) }}个</span>
                                        </div>
                                        
                                        <div v-show="!collapsedSections[group.key]" class="timeline-months">
                                            <div v-for="monthGroup in group.monthGroups" :key="monthGroup.month" class="timeline-month">
                                                <div class="month-header">
                                                    <span class="month-label">{{ monthGroup.label }}</span>
                                                    <span class="month-count">{{ monthGroup.items.length }}个</span>
                                                </div>
                                                <ExpressCard
                                                    v-for="item in monthGroup.items"
                                                    :key="item.id"
                                                    :data="item"
                                                    :current-user-id="currentUserId"
                                                    :current-user-gender="currentUserGender"
                                                    :partner-gender="partner?.gender"
                                                    @unpick="handleUnpick"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </template>
        </main>
        
        <!-- 底部按钮组 -->
        <div v-if="partner" class="fab-group">
            <button class="fab-secondary" @click="showLocationManager = true" title="管理地点">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
            </button>
            <button class="fab" @click="showAddModal = true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>
        </div>
        
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
        
        <!-- 地点管理弹窗 -->
        <div class="modal-overlay" :class="{ show: showLocationManager }" @click.self="showLocationManager = false">
            <div class="modal" style="max-height: 70vh; display: flex; flex-direction: column;">
                <div class="modal-header" style="flex-shrink: 0;">
                    <h3>管理取件地点</h3>
                    <button class="close-btn" @click="showLocationManager = false">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body" style="overflow-y: auto; flex: 1; padding: 0 24px 24px;">
                    <!-- 地点列表 -->
                    <div v-if="locations.length === 0" class="empty-list" style="padding: 40px 0;">
                        <div class="empty-icon">📍</div>
                        <div class="empty-text">还没有取件地点</div>
                    </div>
                    <div v-else class="location-list">
                        <div 
                            v-for="loc in locations" 
                            :key="loc.id" 
                            class="location-item"
                        >
                            <template v-if="editingLocation?.id === loc.id">
                                <input 
                                    v-model="editingLocation.name"
                                    class="location-edit-input"
                                    placeholder="地点名称"
                                    @keyup.enter="saveEditLocation"
                                />
                                <div class="location-actions">
                                    <button class="btn-icon save" @click="saveEditLocation" title="保存">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="20 6 9 17 4 12"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon cancel" @click="cancelEditLocation" title="取消">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <line x1="18" y1="6" x2="6" y2="18"/>
                                            <line x1="6" y1="6" x2="18" y2="18"/>
                                        </svg>
                                    </button>
                                </div>
                            </template>
                            <template v-else>
                                <span class="location-name">{{ loc.name }}</span>
                                <div class="location-actions">
                                    <button class="btn-icon edit" @click="startEditLocation(loc)" title="编辑">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button class="btn-icon delete" @click="deleteLocation(loc)" title="删除">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polyline points="3 6 5 6 21 6"/>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                        </svg>
                                    </button>
                                </div>
                            </template>
                        </div>
                    </div>
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
        const currentUserGender = ref(null)
        const partner = ref(null)
        const pendingList = ref([])
        const pickedList = ref([])
        const activeTab = ref('pending')
        const loading = ref(false)
        
        // 已取件筛选
        const pickedFilter = ref('all')
        const pickedFilters = [
            { label: '全部', value: 'all' },
            { label: '我取的', value: 'me' },
            { label: 'TA取的', value: 'partner' }
        ]
        
        // 过滤后的已取件列表
        const filteredPickedList = computed(() => {
            if (pickedFilter.value === 'all') return pickedList.value
            if (pickedFilter.value === 'me') {
                return pickedList.value.filter(item => item.pickerId === currentUserId.value)
            }
            if (pickedFilter.value === 'partner') {
                return pickedList.value.filter(item => item.pickerId !== currentUserId.value)
            }
            return pickedList.value
        })
        
        // 折叠状态（除本月外都默认折叠）- 使用普通对象
        const collapsedSections = ref({})
        const toggleSection = (key) => {
            collapsedSections.value = {
                ...collapsedSections.value,
                [key]: !collapsedSections.value[key]
            }
        }
        
        // 按年+月分组的已取件列表
        const groupedPickedList = computed(() => {
            const list = filteredPickedList.value
            if (list.length === 0) return []
            
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth()
            
            // 按年份和月份分组
            const yearGroups = {}
            
            list.forEach(item => {
                const date = new Date(item.pickedAt)
                const year = date.getFullYear()
                const month = date.getMonth()
                
                if (!yearGroups[year]) {
                    yearGroups[year] = {
                        label: year === currentYear ? '今年' : `${year}年`,
                        year,
                        isCurrentYear: year === currentYear,
                        months: {}
                    }
                }
                
                if (!yearGroups[year].months[month]) {
                    const monthLabels = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
                    yearGroups[year].months[month] = {
                        label: monthLabels[month],
                        month,
                        items: []
                    }
                }
                
                yearGroups[year].months[month].items.push(item)
            })
            
            // 处理本年本月和上个月单独显示
            const result = []
            const thisYear = yearGroups[currentYear]
            
            if (thisYear) {
                // 本月（默认展开，无key）
                if (thisYear.months[currentMonth]) {
                    result.push({
                        label: '本月',
                        items: thisYear.months[currentMonth].items
                    })
                    delete thisYear.months[currentMonth]
                }
                
                // 上个月（默认折叠）
                const lastMonth = currentMonth - 1
                if (lastMonth >= 0 && thisYear.months[lastMonth]) {
                    result.push({
                        type: 'collapsible',
                        key: 'lastMonth',
                        label: '上个月',
                        items: thisYear.months[lastMonth].items
                    })
                    delete thisYear.months[lastMonth]
                }
                
                // 本年其他月份（默认折叠）
                const otherMonths = Object.values(thisYear.months)
                    .sort((a, b) => b.month - a.month)
                
                if (otherMonths.length > 0) {
                    result.push({
                        type: 'year',
                        key: `year-${currentYear}`,
                        label: '今年',
                        year: currentYear,
                        monthGroups: otherMonths
                    })
                }
                
                delete yearGroups[currentYear]
            }
            
            // 其他年份（默认折叠）
            Object.values(yearGroups)
                .sort((a, b) => b.year - a.year)
                .forEach(yearGroup => {
                    const monthGroups = Object.values(yearGroup.months)
                        .sort((a, b) => b.month - a.month)
                    
                    result.push({
                        type: 'year',
                        key: `year-${yearGroup.year}`,
                        label: yearGroup.label,
                        year: yearGroup.year,
                        monthGroups
                    })
                })
            
            // 初始化折叠状态（除了本月都折叠）
            const newCollapsed = { ...collapsedSections.value }
            let hasNew = false
            result.forEach(group => {
                if (group.key && !(group.key in newCollapsed)) {
                    newCollapsed[group.key] = true  // true = 折叠
                    hasNew = true
                }
            })
            if (hasNew) {
                collapsedSections.value = newCollapsed
            }
            
            return result
        })
        
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
        
        // 地点管理相关
        const showLocationManager = ref(false)
        const editingLocation = ref(null)
        
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
        
        // 地点管理方法
        const startEditLocation = (loc) => {
            editingLocation.value = { ...loc }
        }
        
        const cancelEditLocation = () => {
            editingLocation.value = null
        }
        
        const saveEditLocation = async () => {
            if (!editingLocation.value?.name?.trim()) {
                showToast('地点名称不能为空', 'error')
                return
            }
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/pickup-locations/${editingLocation.value.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ name: editingLocation.value.name.trim() })
                })
                
                const data = await res.json()
                if (data.success) {
                    // 更新本地列表
                    const index = locations.value.findIndex(l => l.id === editingLocation.value.id)
                    if (index !== -1) {
                        locations.value[index] = data.data
                    }
                    // 如果当前表单选中了这个地点，更新表单
                    if (form.value.pickupLocation === editingLocation.value.name) {
                        form.value.pickupLocation = data.data.name
                    }
                    editingLocation.value = null
                    showToast('修改成功', 'success')
                } else {
                    showToast(data.message || '修改失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        const deleteLocation = async (loc) => {
            if (!confirm(`确定要删除地点"${loc.name}"吗？`)) return
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/pickup-locations/${loc.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                
                const data = await res.json()
                if (data.success) {
                    // 从本地列表移除
                    locations.value = locations.value.filter(l => l.id !== loc.id)
                    // 如果当前表单选中了这个地点，清空选择
                    if (form.value.pickupLocation === loc.name) {
                        form.value.pickupLocation = locations.value[0]?.name || ''
                    }
                    showToast('删除成功', 'success')
                } else {
                    showToast(data.message || '删除失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
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
                    currentUserGender.value = data.data.gender
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
            fetchLocations()  // 页面加载时获取地点列表
            
            // 订阅 WebSocket 消息
            const unsubscribe = onMessage(handleWSMessage)
            
            onUnmounted(() => {
                unsubscribe()
            })
        })
        
        return {
            currentUserId,
            currentUserGender,
            partner,
            pendingList,
            pickedList,
            activeTab,
            pickedFilter,
            pickedFilters,
            groupedPickedList,
            collapsedSections,
            toggleSection,
            showAddModal,
            form,
            submitting,
            canSubmit,
            toast,
            locations,
            isAddingLocation,
            newLocationName,
            locationInput,
            showLocationManager,
            editingLocation,
            handleAdd,
            handlePick,
            handleUnpick,
            handleDelete,
            handleLocationChange,
            handleAddLocation,
            cancelAddLocation,
            startEditLocation,
            cancelEditLocation,
            saveEditLocation,
            deleteLocation,
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
/* 底部按钮组 */
.fab-group {
    position: fixed;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
    right: 20px;
    display: flex;
    flex-direction: row;
    gap: 12px;
    z-index: 50;
}

.fab {
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
}

.fab-secondary {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    margin-top: 4px;
}

.fab-secondary:hover {
    background: var(--bg-card-hover);
    color: var(--text-primary);
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
    background: #FDFDF5;
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

/* 地点管理列表 */
.location-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.location-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    gap: 12px;
}

.location-name {
    font-size: 15px;
    color: var(--text-primary);
}

.location-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
}

.btn-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-icon.edit {
    background: var(--bg-input);
    color: var(--text-secondary);
}

.btn-icon.edit:hover {
    background: #E3F2FD;
    color: #2196F3;
}

.btn-icon.delete {
    background: var(--bg-input);
    color: var(--text-secondary);
}

.btn-icon.delete:hover {
    background: #FFEBEE;
    color: #F44336;
}

.btn-icon.save {
    background: #E8F5E9;
    color: #4CAF50;
}

.btn-icon.cancel {
    background: var(--bg-input);
    color: var(--text-secondary);
}

.location-edit-input {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    background: var(--bg-card);
    border: 1px solid #E91E63;
    border-radius: var(--radius-md);
    font-size: 15px;
}

.location-edit-input:focus {
    outline: none;
}

/* 已取件筛选按钮 */
.picked-filter {
    display: flex;
    gap: 8px;
    margin-bottom: 20px;
    padding: 0 4px;
}

.filter-btn {
    padding: 8px 16px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.filter-btn.active {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    border-color: transparent;
    color: white;
}

/* 时间线样式 */
.timeline {
    position: relative;
    padding-left: 28px;
}

/* 连续的时间轴线 */
.timeline-track {
    position: absolute;
    left: 7px;
    top: 8px;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, #E91E63 0%, #F06292 30%, #F8BBD0 100%);
}

.timeline-group,
.timeline-year-group {
    position: relative;
    margin-bottom: 20px;
}

.timeline-dot {
    position: absolute;
    left: -28px;
    top: 0;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #E91E63;
    border: 3px solid #FDFDF5;
    box-shadow: 0 0 0 2px #E91E63;
    z-index: 1;
}

.timeline-dot.year-dot {
    width: 12px;
    height: 12px;
    left: -26px;
    background: #F06292;
    box-shadow: 0 0 0 2px #F06292;
}

.timeline-content {
    padding-bottom: 8px;
}

.timeline-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.timeline-header.year-header {
    cursor: pointer;
    padding: 6px 0;
}

.timeline-arrow {
    color: #E91E63;
    transition: transform 0.2s ease;
}

.timeline-arrow {
    transform: rotate(0deg);
}

.timeline-header.collapsed .timeline-arrow,
.timeline-header.year-header.collapsed .timeline-arrow {
    transform: rotate(-90deg);
}

.timeline-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
}

.timeline-count {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-left: auto;
}

.timeline-items {
    margin-left: -4px;
}

.timeline-months {
    margin-top: 12px;
}

.timeline-month {
    margin-bottom: 16px;
}

.month-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-left: 4px;
}

.month-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
}

.month-count {
    font-size: 12px;
    color: var(--text-tertiary);
}
</style>
