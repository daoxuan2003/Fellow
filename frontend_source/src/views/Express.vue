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
                <span class="header-title">取件清单</span>
                <div class="icon-placeholder"></div>
            </div>
        </header>
        
        <!-- 主内容 -->
        <main class="main">
            <!-- 未绑定提示 -->
            <div v-if="!partner" class="empty-state">
                <div class="empty-icon">📦</div>
                <div class="empty-title">请先绑定伴侣</div>
                <div class="empty-desc">绑定后才能使用取件清单哦~</div>
                <button class="primary-btn" @click="$router.push('/home')">去绑定</button>
            </div>
            
            <!-- 正常内容 -->
            <template v-else>
                <!-- 统计面板 -->
                <div class="stats-panel">
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.thisMonth }}</div>
                        <div class="stat-label">本月收到</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.lastMonth }}</div>
                        <div class="stat-label">上月收到</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.thisYear }}</div>
                        <div class="stat-label">今年共收</div>
                    </div>
                </div>
                
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
                    <!-- 地点筛选按钮 -->
                    <div v-if="pendingList.length > 0 && pendingLocationFilters.length > 1" class="pending-filter">
                        <button 
                            v-for="filter in pendingLocationFilters" 
                            :key="filter.value"
                            class="filter-btn"
                            :class="{ active: pendingLocationFilter === filter.value }"
                            @click="pendingLocationFilter = filter.value"
                        >
                            {{ filter.label }}
                        </button>
                    </div>
                    
                    <div v-if="filteredPendingList.length === 0" class="empty-list">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">{{ pendingLocationFilter === 'all' ? '暂时没有待取快递' : '该地点没有待取快递' }}</div>
                        <div v-if="pendingLocationFilter === 'all'" class="empty-hint">点击下方按钮添加一个吧~</div>
                    </div>
                    
                    <ExpressCard
                        v-for="item in filteredPendingList"
                        :key="item.id"
                        :data="item"
                        :current-user-id="currentUserId"
                        :current-user-gender="currentUserGender"
                        :partner-gender="partner?.gender"
                        @pick="handlePick"
                        @delete="handleDelete"
                        @edit="handleEdit"
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
                                                <div 
                                                    class="month-header"
                                                    :class="{ collapsed: collapsedSections[monthGroup.key] }"
                                                    @click="toggleSection(monthGroup.key)"
                                                >
                                                    <svg class="timeline-arrow month-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                        <polyline points="6 9 12 15 18 9"/>
                                                    </svg>
                                                    <span class="month-label">{{ monthGroup.label }}</span>
                                                    <span class="month-count">{{ monthGroup.items.length }}个</span>
                                                </div>
                                                <div v-show="!collapsedSections[monthGroup.key]" class="month-items">
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
                        <label>🧠 自动识别取件码</label>
                        <textarea 
                            v-model="autoExtractText" 
                            placeholder="整段短信粘贴到这里，自动提取取件码"
                            rows="2"
                            class="extract-textarea"
                        ></textarea>
                        <button 
                            class="btn-extract" 
                            @click="autoExtractCode"
                            :disabled="!autoExtractText.trim()"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                            </svg>
                            自动识别
                        </button>
                    </div>
                    
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
                    
                    <div class="form-group">
                        <label>优先级</label>
                        <div class="priority-options">
                            <label class="priority-option" :class="{ active: form.priority === 'normal' }">
                                <input v-model="form.priority" type="radio" value="normal">
                                <span class="priority-dot normal"></span>
                                <span>普通</span>
                            </label>
                            <label class="priority-option" :class="{ active: form.priority === 'urgent' }">
                                <input v-model="form.priority" type="radio" value="urgent">
                                <span class="priority-dot urgent"></span>
                                <span>紧急</span>
                            </label>
                        </div>
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
        
        <!-- 编辑弹窗 -->
        <div class="modal-overlay" :class="{ show: showEditModal }" @click.self="showEditModal = false">
            <div class="modal">
                <div class="modal-header">
                    <h3>编辑快递</h3>
                    <button class="close-btn" @click="showEditModal = false">
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
                            v-model="editForm.trackingNo" 
                            type="text" 
                            placeholder="如：1234 或 1-2-3456"
                            maxlength="20"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>取件地点 <span class="required">*</span></label>
                        <select v-model="editForm.pickupLocation" class="location-dropdown">
                            <option v-for="loc in locations" :key="loc.id" :value="loc.name">
                                {{ loc.name }}
                            </option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>物品描述 <span class="optional">（可选）</span></label>
                        <input 
                            v-model="editForm.description" 
                            type="text" 
                            placeholder="如：衣服、书、零食"
                            maxlength="20"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>优先级</label>
                        <div class="priority-options">
                            <label class="priority-option" :class="{ active: editForm.priority === 'normal' }">
                                <input v-model="editForm.priority" type="radio" value="normal">
                                <span class="priority-dot normal"></span>
                                <span>普通</span>
                            </label>
                            <label class="priority-option" :class="{ active: editForm.priority === 'urgent' }">
                                <input v-model="editForm.priority" type="radio" value="urgent">
                                <span class="priority-dot urgent"></span>
                                <span>紧急</span>
                            </label>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="btn-cancel" @click="showEditModal = false">取消</button>
                    <button 
                        class="btn-confirm" 
                        :disabled="!editForm.trackingNo.trim() || !editForm.pickupLocation.trim() || editing"
                        @click="handleSaveEdit"
                    >
                        {{ editing ? '保存中...' : '保存' }}
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
        const currentUserGender = ref(null)
        const partner = ref(null)
        const pendingList = ref([])
        const pickedList = ref([])
        const activeTab = ref('pending')
        const loading = ref(false)
        
        // 待取件地点筛选
        const pendingLocationFilter = ref('all')
        const pendingLocationFilters = computed(() => {
            // 提取所有待取件中的地点
            const locations = [...new Set(pendingList.value.map(item => item.pickupLocation))]
            
            // 如果当前选中了某个地点，但该地点已经没有快递了，仍然保留该标签
            if (pendingLocationFilter.value !== 'all' && !locations.includes(pendingLocationFilter.value)) {
                locations.push(pendingLocationFilter.value)
            }
            
            // 按快递数量排序（当前选中的地点排在最前面）
            const sortedLocations = locations.sort((a, b) => {
                const countA = pendingList.value.filter(item => item.pickupLocation === a).length
                const countB = pendingList.value.filter(item => item.pickupLocation === b).length
                // 当前选中的地点优先显示
                if (a === pendingLocationFilter.value) return -1
                if (b === pendingLocationFilter.value) return 1
                return countB - countA
            })
            
            // 生成筛选标签
            const filters = [{ label: '全部', value: 'all' }]
            sortedLocations.forEach(location => {
                const count = pendingList.value.filter(item => item.pickupLocation === location).length
                filters.push({ label: `${location}(${count})`, value: location })
            })
            return filters
        })
        
        // 过滤后的待取件列表（按地点筛选）
        const filteredPendingList = computed(() => {
            if (pendingLocationFilter.value === 'all') return pendingList.value
            return pendingList.value.filter(item => item.pickupLocation === pendingLocationFilter.value)
        })
        
        // 已取件筛选（按创建者分类）
        const pickedFilter = ref('all')
        const pickedFilters = computed(() => {
            const pronoun = partner.value?.gender === 'male' ? '他' : 
                           partner.value?.gender === 'female' ? '她' : 'TA'
            return [
                { label: '全部', value: 'all' },
                { label: '我的快递', value: 'me' },
                { label: `${pronoun}的快递`, value: 'partner' }
            ]
        })
        
        // 统计面板数据（统计收到的快递总数，不区分你我）
        const stats = computed(() => {
            const now = new Date()
            const currentYear = now.getFullYear()
            const currentMonth = now.getMonth()
            
            // 本月
            const thisMonthStart = new Date(currentYear, currentMonth, 1)
            // 上月
            const lastMonthStart = new Date(currentYear, currentMonth - 1, 1)
            const lastMonthEnd = new Date(currentYear, currentMonth, 1)
            // 今年
            const thisYearStart = new Date(currentYear, 0, 1)
            
            // 合并待取和已取（都是收到的）
            const allExpress = [...pendingList.value, ...pickedList.value]
            
            return {
                thisMonth: allExpress.filter(item => new Date(item.createdAt) >= thisMonthStart).length,
                lastMonth: allExpress.filter(item => {
                    const d = new Date(item.createdAt)
                    return d >= lastMonthStart && d < thisMonthStart
                }).length,
                thisYear: allExpress.filter(item => new Date(item.createdAt) >= thisYearStart).length
            }
        })
        
        // 过滤后的已取件列表（按创建者筛选）
        const filteredPickedList = computed(() => {
            if (pickedFilter.value === 'all') return pickedList.value
            if (pickedFilter.value === 'me') {
                return pickedList.value.filter(item => item.requesterId === currentUserId.value)
            }
            if (pickedFilter.value === 'partner') {
                return pickedList.value.filter(item => item.requesterId !== currentUserId.value)
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
                    .map(m => ({
                        ...m,
                        key: `month-${currentYear}-${m.month}`,
                        type: 'month'
                    }))
                
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
                        .map(m => ({
                            ...m,
                            key: `month-${yearGroup.year}-${m.month}`,
                            type: 'month'
                        }))
                    
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
            
            // 折叠年份和月份
            result.forEach(group => {
                // 折叠年份
                if (group.key && !(group.key in newCollapsed)) {
                    newCollapsed[group.key] = true  // true = 折叠
                    hasNew = true
                }
                // 折叠月份
                if (group.monthGroups) {
                    group.monthGroups.forEach(monthGroup => {
                        if (monthGroup.key && !(monthGroup.key in newCollapsed)) {
                            newCollapsed[monthGroup.key] = true
                            hasNew = true
                        }
                    })
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
            description: '',
            priority: 'normal'
        })
        
        // 自动识别取件码
        const autoExtractText = ref('')
        
        const autoExtractCode = () => {
            const text = autoExtractText.value.trim()
            if (!text) return
            
            // 取件码匹配规则（按优先级）
            const patterns = [
                // 字母+数字-数字-数字（如 W11-1-4432）
                /\b[A-Za-z]+\d+-\d+-\d+\b/,
                // 数字-数字-数字（如 12-3-4567, 123-4-5678）
                /\b\d{2,3}-\d{1,2}-\d{4,6}\b/,
                // 字母+数字-数字（如 D3-2343, A12-3456）
                /\b[A-Za-z]+\d*-\d+\b/,
                // x号柜xxxx（如 5号柜123456）
                /\b\d+号柜[A-Za-z0-9]+\b/
            ]
            
            for (const pattern of patterns) {
                const match = text.match(pattern)
                if (match) {
                    form.value.trackingNo = match[0]
                    showToast(`已识别取件码：${match[0]}`, 'success')
                    autoExtractText.value = ''
                    return
                }
            }
            
            showToast('未识别到取件码，请手动输入', 'error')
        }
        
        // 编辑相关
        const showEditModal = ref(false)
        const editingId = ref('')
        const editForm = ref({
            trackingNo: '',
            pickupLocation: '',
            description: '',
            priority: 'normal'
        })
        const editing = ref(false)
        
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
        const pendingConfirmation = ref('')
        let confirmationTimer = null
        
        const canSubmit = computed(() => {
            return form.value.trackingNo.trim() && form.value.pickupLocation.trim()
        })
        
        const showToast = (message, type = 'info') => {
            if (toast.value.timer) clearTimeout(toast.value.timer)
            toast.value = { show: true, message, type }
            toast.value.timer = setTimeout(() => toast.value.show = false, 2500)
        }

        const requireSecondAction = (actionKey, message) => {
            if (pendingConfirmation.value === actionKey) {
                pendingConfirmation.value = ''
                if (confirmationTimer) clearTimeout(confirmationTimer)
                confirmationTimer = null
                return true
            }

            pendingConfirmation.value = actionKey
            showToast(message, 'warning')
            if (confirmationTimer) clearTimeout(confirmationTimer)
            confirmationTimer = setTimeout(() => {
                pendingConfirmation.value = ''
                confirmationTimer = null
            }, 4200)
            return false
        }
        
        const getToken = () => localStorage.getItem('token')
        
        // 获取快递列表
        const fetchList = async (force = false) => {
            try {
                const res = await fetch(CONFIG.API_URL + '/express', {
                    headers: { 'Authorization': 'Bearer ' + getToken() },
                    cache: force ? 'no-store' : 'default'
                })
                const data = await res.json()
                if (data.success) {
                    // 紧急快递置顶
                    pendingList.value = (data.data.pending || []).sort((a, b) => {
                        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1
                        if (a.priority !== 'urgent' && b.priority === 'urgent') return 1
                        return new Date(b.createdAt) - new Date(a.createdAt)
                    })
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
            if (!requireSecondAction(`location:${loc.id}`, `再次点击删除地点「${loc.name}」`)) return
            
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
                        description: form.value.description.trim(),
                        priority: form.value.priority
                    })
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('添加成功', 'success')
                    showAddModal.value = false
                    form.value = { trackingNo: '', pickupLocation: '', description: '', priority: 'normal' }
                    await fetchList()
                } else {
                    showToast(data.message || '添加失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            submitting.value = false
        }
        
        // 打开编辑弹窗
        const handleEdit = (id) => {
            const item = pendingList.value.find(i => i.id === id)
            if (!item) return
            
            editingId.value = id
            editForm.value = {
                trackingNo: item.trackingNo,
                pickupLocation: item.pickupLocation,
                description: item.description || '',
                priority: item.priority || 'normal'
            }
            showEditModal.value = true
        }
        
        // 保存编辑
        const handleSaveEdit = async () => {
            if (!editingId.value || editing.value) return
            
            editing.value = true
            try {
                const res = await fetch(`${CONFIG.API_URL}/express/${editingId.value}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({
                        trackingNo: editForm.value.trackingNo.trim(),
                        pickupLocation: editForm.value.pickupLocation.trim(),
                        description: editForm.value.description.trim(),
                        priority: editForm.value.priority
                    })
                })
                
                const data = await res.json()
                if (data.success) {
                    showToast('修改成功', 'success')
                    showEditModal.value = false
                    editingId.value = ''
                    await fetchList()
                } else {
                    showToast(data.message || '修改失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            editing.value = false
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
                } else {
                    showToast(data.message || '操作失败', 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
        }
        
        // 删除
        const handleDelete = async (id) => {
            if (!requireSecondAction(`express:${id}`, '再次点击删除这个快递')) return
            
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
            console.log('[Express] 收到 WebSocket 消息:', data.type, data)
            
            if (data.type?.startsWith('express')) {
                // 收到快递相关通知，强制刷新列表（禁用缓存）
                console.log('[Express] 处理快递通知，当前 pendingList 长度:', pendingList.value.length)
                fetchList(true).then(() => {
                    console.log('[Express] 刷新完成，新 pendingList 长度:', pendingList.value.length)
                })
                
                // 如果页面不在前台，标记需要刷新
                if (document.visibilityState !== 'visible') {
                    needsRefresh.value = true
                }
            }
        }
        
        // 页面可见性变化处理
        const needsRefresh = ref(false)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && needsRefresh.value) {
                console.log('[Express] 页面可见，刷新数据...')
                fetchList(true)
                needsRefresh.value = false
            }
        }
        
        // 监听弹窗打开，获取地点列表
        watch(showAddModal, (isOpen) => {
            if (isOpen && partner.value) {
                fetchLocations()
            }
        })
        
        // 监听编辑弹窗打开，获取地点列表
        watch(showEditModal, (isOpen) => {
            if (isOpen && partner.value) {
                fetchLocations()
            }
        })
        
        onMounted(() => {
            console.log('[Express] 页面挂载，开始订阅 WebSocket')
            
            // 先订阅 WebSocket（在获取数据之前）
            const unsubscribe = onMessage(handleWSMessage)
            
            fetchUser()
            fetchList(true)  // 强制刷新，禁用缓存
            fetchLocations()  // 页面加载时获取地点列表
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', handleVisibilityChange)
            
            onUnmounted(() => {
                console.log('[Express] 页面卸载，取消 WebSocket 订阅')
                unsubscribe()
                document.removeEventListener('visibilitychange', handleVisibilityChange)
                if (toast.value.timer) clearTimeout(toast.value.timer)
                if (confirmationTimer) clearTimeout(confirmationTimer)
            })
        })
        
        return {
            currentUserId,
            currentUserGender,
            partner,
            pendingList,
            pickedList,
            stats,
            activeTab,
            // 待取件地点筛选
            pendingLocationFilter,
            pendingLocationFilters,
            filteredPendingList,
            pickedFilter,
            pickedFilters,
            groupedPickedList,
            collapsedSections,
            toggleSection,
            showAddModal,
            form,
            autoExtractText,
            autoExtractCode,
            submitting,
            canSubmit,
            toast,
            locations,
            isAddingLocation,
            newLocationName,
            locationInput,
            showLocationManager,
            editingLocation,
            // 编辑相关
            showEditModal,
            editForm,
            editing,
            handleAdd,
            handlePick,
            handleUnpick,
            handleDelete,
            handleEdit,
            handleSaveEdit,
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

/* 统计面板 */
.stats-panel {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
}

.stat-item {
    flex: 1;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    padding: 16px 8px;
    text-align: center;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.stat-label {
    font-size: 12px;
    color: var(--text-secondary);
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

/* 自动识别取件码 */
.extract-textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px dashed var(--border-color);
    border-radius: var(--radius-lg);
    background: var(--bg-card);
    font-size: 13px;
    color: var(--text-primary);
    resize: vertical;
    min-height: 56px;
    margin-bottom: 8px;
    font-family: inherit;
}

.extract-textarea:focus {
    outline: none;
    border-color: #3B82F6;
    border-style: solid;
    background: #fff;
}

.extract-textarea::placeholder {
    color: var(--text-tertiary);
}

.btn-extract {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%);
    color: white;
    border: none;
    border-radius: var(--radius-lg);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-extract:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-extract:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* 优先级选项 */
.priority-options {
    display: flex;
    gap: 12px;
}

.priority-option {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--bg-card);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.3s ease;
}

.priority-option input {
    display: none;
}

.priority-option.active {
    border-color: #E91E63;
    background: rgba(233, 30, 99, 0.05);
}

.priority-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
}

.priority-dot.normal {
    background: #81C784;
}

.priority-dot.urgent {
    background: #F44336;
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

.toast.warning {
    background: rgba(245, 158, 11, 0.92);
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

/* 待取件筛选按钮 */
.pending-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
    padding: 0 4px;
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
    align-items: center;
    margin-bottom: 10px;
    padding-left: 4px;
    cursor: pointer;
}

.month-header .month-arrow {
    color: #F06292;
    margin-right: 6px;
    transform: rotate(0deg);
    transition: transform 0.2s ease;
}

.month-header.collapsed .month-arrow {
    transform: rotate(-90deg);
}

.month-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    flex: 1;
}

.month-count {
    font-size: 12px;
    color: var(--text-tertiary);
}
</style>
