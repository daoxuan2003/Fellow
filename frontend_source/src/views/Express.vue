<template>
    <div class="express-page">
        <!-- 背景 -->
        <div class="bg-container"></div>
        
        <FeatureHeader title="快递代取" eyebrow="PICKUP LIST" chapter="06" kind="parcel" />
        
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
                
                <!-- 已取归档 -->
                <div v-else class="express-list archive-list">
                    <section v-if="pickedArchive.total > 0" class="archive-command" aria-label="取件归档总览">
                        <div class="archive-command-header">
                            <div class="archive-title-block">
                                <div class="archive-kicker">取件归档</div>
                                <h2>{{ archiveHeadline }}</h2>
                            </div>
                            <div class="archive-total">
                                <span>{{ pickedArchive.total }}</span>
                                <small>件</small>
                            </div>
                        </div>

                        <div class="archive-metrics">
                            <div class="archive-metric">
                                <span>本月</span>
                                <strong>{{ pickedArchive.thisMonth }}</strong>
                            </div>
                            <div class="archive-metric">
                                <span>近30天</span>
                                <strong>{{ pickedArchive.recent30Days }}</strong>
                            </div>
                            <div class="archive-metric">
                                <span>我发起</span>
                                <strong>{{ pickedArchive.mine }}</strong>
                            </div>
                            <div class="archive-metric">
                                <span>{{ partnerPronoun }}发起</span>
                                <strong>{{ pickedArchive.partner }}</strong>
                            </div>
                            <div class="archive-metric wide">
                                <span>我帮{{ partnerPronoun }}取</span>
                                <strong>{{ pickedArchive.helpedPartner }}</strong>
                            </div>
                            <div class="archive-metric wide urgent" v-if="pickedArchive.urgent > 0">
                                <span>紧急件</span>
                                <strong>{{ pickedArchive.urgent }}</strong>
                            </div>
                        </div>

                        <div v-if="pickedArchive.latest" class="archive-latest">
                            <span>最近归档</span>
                            <strong>{{ pickedArchive.latest.trackingNo }}</strong>
                            <em>{{ pickedArchive.latest.pickupLocation }} · {{ formatArchiveItemDate(pickedArchive.latest) }}</em>
                        </div>

                        <div v-if="pickedArchive.topLocations.length > 0" class="archive-locations">
                            <span class="archive-location-label">高频地点</span>
                            <div class="archive-location-tags">
                                <span v-for="location in pickedArchive.topLocations" :key="location.name" class="archive-location-chip">
                                    {{ location.name }} {{ location.count }}
                                </span>
                            </div>
                        </div>
                    </section>

                    <section v-if="pickedArchive.total > 0" class="archive-review" aria-label="取件归档复盘">
                        <div class="archive-review-head">
                            <div>
                                <span>归档复盘</span>
                                <strong>{{ archiveReview.title }}</strong>
                                <p>{{ archiveReview.subtitle }}</p>
                            </div>
                        </div>

                        <div v-if="archiveReview.route.length > 0" class="archive-route-list">
                            <div
                                v-for="route in archiveReview.route"
                                :key="route.name"
                                class="archive-route-item"
                            >
                                <div class="archive-route-top">
                                    <span>{{ route.rank }}</span>
                                    <strong>{{ route.name }}</strong>
                                    <em>{{ route.count }}件</em>
                                </div>
                                <div class="archive-route-bar" aria-hidden="true">
                                    <i :style="{ width: route.share + '%' }"></i>
                                </div>
                            </div>
                        </div>

                        <div class="archive-rhythm-grid">
                            <article v-for="item in archiveReview.rhythm" :key="item.id" class="archive-rhythm-item">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                                <small>{{ item.detail }}</small>
                            </article>
                        </div>

                        <div class="archive-next-step">
                            <span>下一步</span>
                            <strong>{{ archiveReview.nextStep.title }}</strong>
                            <p>{{ archiveReview.nextStep.detail }}</p>
                        </div>
                    </section>

                    <section v-if="pickedArchive.total > 0 && archiveStoryCards.length > 0" class="archive-story-grid" aria-label="取件归档洞察">
                        <article
                            v-for="card in archiveStoryCards"
                            :key="card.id"
                            class="archive-story-card"
                            :class="card.tone"
                        >
                            <span>{{ card.title }}</span>
                            <strong>{{ card.value }}</strong>
                            <small>{{ card.detail }}</small>
                        </article>
                    </section>

                    <section v-if="archiveTimeline.length > 0" class="archive-timeline" aria-label="最近归档时间线">
                        <div class="archive-section-title">
                            <span>最近完成</span>
                            <strong>取件时间线</strong>
                        </div>

                        <div class="archive-timeline-list">
                            <article
                                v-for="item in archiveTimeline"
                                :key="item.id"
                                class="archive-timeline-item"
                                :class="{ urgent: item.priority === 'urgent' }"
                            >
                                <div class="archive-timeline-dot"></div>
                                <div class="archive-timeline-main">
                                    <div class="archive-timeline-top">
                                        <strong>{{ item.trackingNo }}</strong>
                                        <span>{{ item.timeLabel }}</span>
                                    </div>
                                    <p>
                                        {{ item.location }}
                                        <template v-if="item.description"> · {{ item.description }}</template>
                                    </p>
                                    <small>{{ formatTimelineRole(item) }} · {{ item.actor }}</small>
                                </div>
                            </article>
                        </div>
                    </section>

                    <div v-if="pickedArchive.total > 0" class="picked-filter archive-filter">
                        <button 
                            v-for="filter in pickedFilters" 
                            :key="filter.value"
                            class="filter-btn"
                            :class="{ active: pickedFilter === filter.value }"
                            @click="pickedFilter = filter.value"
                        >
                            <span>{{ filter.label }}</span>
                            <span class="filter-count">{{ filter.count }}</span>
                        </button>
                    </div>
                    
                    <div v-if="archiveMonthGroups.length === 0" class="empty-list">
                        <div class="empty-icon">📭</div>
                        <div class="empty-text">{{ pickedEmptyText }}</div>
                    </div>
                    
                    <div v-else class="archive-month-list">
                        <section
                            v-for="(group, index) in archiveMonthGroups"
                            :key="group.key"
                            class="archive-month-section"
                        >
                            <button
                                class="archive-month-head"
                                :class="{ collapsed: collapsedSections[group.key] }"
                                @click="toggleSection(group.key)"
                            >
                                <span class="archive-month-rank">{{ index + 1 }}</span>
                                <span class="archive-month-title">{{ group.label }}</span>
                                <span class="archive-month-count">{{ group.count }}件</span>
                                <svg class="archive-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="6 9 12 15 18 9"/>
                                </svg>
                            </button>

                            <div v-show="!collapsedSections[group.key]" class="archive-month-body">
                                <div class="archive-month-summary">
                                    <span>我 {{ group.mine }}</span>
                                    <span>{{ partnerPronoun }} {{ group.partner }}</span>
                                    <span v-if="group.urgent > 0">紧急 {{ group.urgent }}</span>
                                    <span v-for="location in group.locations" :key="location.name">
                                        {{ location.name }} {{ location.count }}
                                    </span>
                                </div>

                                <div
                                    v-for="item in group.items"
                                    :key="item.id"
                                    class="archive-card-shell"
                                >
                                    <div class="archive-card-meta">
                                        <span>{{ getArchiveOwnerLabel(item) }}</span>
                                        <span>{{ getArchivePickerLabel(item) }}</span>
                                        <span>{{ formatArchiveItemDate(item) }}</span>
                                    </div>
                                    <ExpressCard
                                        :data="item"
                                        :current-user-id="currentUserId"
                                        :current-user-gender="currentUserGender"
                                        :partner-gender="partner?.gender"
                                        @unpick="handleUnpick"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
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
                        <label>短信提取取件码</label>
                        <textarea 
                            v-model="autoExtractText" 
                            placeholder="整段短信粘贴到这里，按规则提取取件码"
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
                            提取取件码
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
                                    <button v-if="canManageLocation(loc)" class="btn-icon edit" @click="startEditLocation(loc)" title="编辑">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                        </svg>
                                    </button>
                                    <button v-if="canManageLocation(loc)" class="btn-icon delete" @click="deleteLocation(loc)" title="删除">
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
        <div
            class="toast"
            :class="{ show: toast.show, [toast.type]: true }"
            role="status"
            aria-live="polite"
            aria-atomic="true"
        >
            <span>{{ toast.message }}</span>
        </div>
        
        <!-- 底部导航 -->
    </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { CONFIG } from '../utils/config.js'
import { createClientLogger } from '../utils/client-logger.js'
import { resolveCurrentUserId } from '../utils/user-id.js'
import {
    buildExpressArchive,
    buildExpressArchiveReview,
    buildExpressArchiveStory,
    buildExpressArchiveTimeline,
    buildExpressMonthGroups,
    filterPickedDeliveries,
    formatExpressArchiveDate
} from '../utils/express-archive.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import ExpressCard from '../components/ExpressCard.vue'

export default {
    name: 'Express',
    components: { FeatureHeader, ExpressCard },
    setup() {
        const router = useRouter()
        const userStore = useUserStore()
        const { onMessage } = useWebSocket()
        const logger = createClientLogger('Express')
        
        const currentUserId = ref(resolveCurrentUserId(userStore))
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
        
        const partnerPronoun = computed(() => {
            if (partner.value?.gender === 'male') return '他'
            if (partner.value?.gender === 'female') return '她'
            return 'TA'
        })

        const pickedArchive = computed(() => buildExpressArchive(pickedList.value, currentUserId.value))
        const archiveReview = computed(() => buildExpressArchiveReview(pickedList.value, currentUserId.value))
        const archiveStoryCards = computed(() => buildExpressArchiveStory(pickedList.value, currentUserId.value))
        const archiveTimeline = computed(() => buildExpressArchiveTimeline(pickedList.value, currentUserId.value, 5))
        const archiveHeadline = computed(() => {
            if (!pickedArchive.value.latest) return '还没有归档'
            return `${pickedArchive.value.monthGroups.length}个月份已沉淀`
        })

        // 已取件筛选（按创建者和紧急状态分类）
        const pickedFilter = ref('all')
        const pickedFilters = computed(() => {
            const filters = [
                { label: '全部', value: 'all', count: pickedArchive.value.total },
                { label: '我的快递', value: 'me', count: pickedArchive.value.mine },
                { label: `${partnerPronoun.value}的快递`, value: 'partner', count: pickedArchive.value.partner },
                { label: '紧急', value: 'urgent', count: pickedArchive.value.urgent }
            ]
            return filters
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
        
        // 过滤后的已取件列表（按创建者/紧急筛选）
        const filteredPickedList = computed(() => {
            return filterPickedDeliveries(pickedList.value, pickedFilter.value, currentUserId.value)
        })

        const archiveMonthGroups = computed(() => buildExpressMonthGroups(filteredPickedList.value, currentUserId.value))
        const pickedEmptyText = computed(() => {
            if (pickedFilter.value === 'all') return '暂时没有已取快递'
            if (pickedFilter.value === 'urgent') return '还没有紧急件归档'
            return '该筛选条件下没有快递'
        })

        const formatArchiveItemDate = (item) => formatExpressArchiveDate(item?.pickedAt || item?.createdAt)
        const getArchiveOwnerLabel = (item) => {
            return String(item?.requesterId || '') === String(currentUserId.value || '') ? '我的快递' : `${partnerPronoun.value}的快递`
        }
        const getArchivePickerLabel = (item) => {
            if (String(item?.pickerId || '') === String(currentUserId.value || '')) return '我取件'
            return `${item?.picker?.nickname || partnerPronoun.value}取件`
        }
        const formatTimelineRole = (item) => {
            return item?.requesterRole === 'me' ? '我的快递' : `${partnerPronoun.value}的快递`
        }

        // 折叠状态：最新月份默认展开，其余月份默认折叠
        const collapsedSections = ref({})
        const toggleSection = (key) => {
            collapsedSections.value = {
                ...collapsedSections.value,
                [key]: !collapsedSections.value[key]
            }
        }

        watch(archiveMonthGroups, (groups) => {
            const newCollapsed = { ...collapsedSections.value }
            let hasNew = false

            groups.forEach((group, index) => {
                if (group.key && !(group.key in newCollapsed)) {
                    newCollapsed[group.key] = index !== 0
                    hasNew = true
                }
            })

            if (hasNew) {
                collapsedSections.value = newCollapsed
            }
        }, { immediate: true })
        
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
        const canManageLocation = (loc) => loc?.createdBy && currentUserId.value && String(loc.createdBy) === String(currentUserId.value)

        const startEditLocation = (loc) => {
            if (!canManageLocation(loc)) {
                showToast('只能修改自己创建的地点', 'warning')
                return
            }

            editingLocation.value = { ...loc }
        }
        
        const cancelEditLocation = () => {
            editingLocation.value = null
        }
        
        const saveEditLocation = async () => {
            if (!canManageLocation(editingLocation.value)) {
                showToast('只能修改自己创建的地点', 'warning')
                return
            }

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
            if (!canManageLocation(loc)) {
                showToast('只能删除自己创建的地点', 'warning')
                return
            }

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
                    userStore.updateUserData(data.data, data.data.partner)
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
            logger.debug('收到 WebSocket 消息', { type: data.type, data })
            
            if (data.type?.startsWith('express')) {
                // 收到快递相关通知，强制刷新列表（禁用缓存）
                logger.debug('处理快递通知', { pendingCount: pendingList.value.length })
                fetchList(true).then(() => {
                    logger.debug('刷新完成', { pendingCount: pendingList.value.length })
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
                logger.debug('页面可见，刷新数据')
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
            logger.debug('页面挂载，开始订阅 WebSocket')
            
            // 先订阅 WebSocket（在获取数据之前）
            const unsubscribe = onMessage(handleWSMessage)
            
            fetchUser()
            fetchList(true)  // 强制刷新，禁用缓存
            fetchLocations()  // 页面加载时获取地点列表
            
            // 监听页面可见性变化
            document.addEventListener('visibilitychange', handleVisibilityChange)
            
            onUnmounted(() => {
                logger.debug('页面卸载，取消 WebSocket 订阅')
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
            partnerPronoun,
            pickedArchive,
            archiveReview,
            archiveStoryCards,
            archiveTimeline,
            archiveHeadline,
            archiveMonthGroups,
            pickedEmptyText,
            formatArchiveItemDate,
            getArchiveOwnerLabel,
            getArchivePickerLabel,
            formatTimelineRole,
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
            canManageLocation,
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
    background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.78), rgba(231, 241, 238, 0.68)),
        repeating-linear-gradient(
            90deg,
            rgba(31, 42, 49, 0.025) 0,
            rgba(31, 42, 49, 0.025) 1px,
            transparent 1px,
            transparent 72px
        );
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

/* 短信提取取件码 */
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

/* 已取件归档 */
.archive-list {
    gap: 16px;
}

.archive-command {
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(31, 42, 49, 0.1);
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 12px 28px rgba(31, 42, 49, 0.08);
}

.archive-command-header {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 14px;
}

.archive-title-block {
    min-width: 0;
}

.archive-kicker {
    font-size: 12px;
    font-weight: 700;
    color: var(--color-secondary);
    margin-bottom: 4px;
}

.archive-title-block h2 {
    font-size: 20px;
    line-height: 1.25;
    font-weight: 700;
    color: var(--text-primary);
}

.archive-total {
    width: 72px;
    min-height: 58px;
    border-radius: 8px;
    background: #1F2A31;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.archive-total span {
    font-size: 24px;
    line-height: 1;
    font-weight: 800;
}

.archive-total small {
    font-size: 12px;
    margin-top: 4px;
    color: rgba(255, 255, 255, 0.72);
}

.archive-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
}

.archive-metric {
    min-width: 0;
    border: 1px solid rgba(31, 42, 49, 0.08);
    background: rgba(247, 250, 249, 0.9);
    border-radius: 8px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.archive-metric.wide {
    grid-column: span 1;
}

.archive-metric.urgent {
    background: rgba(244, 67, 54, 0.08);
    border-color: rgba(244, 67, 54, 0.18);
}

.archive-metric span {
    min-width: 0;
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-metric strong {
    font-size: 18px;
    color: var(--text-primary);
}

.archive-latest {
    margin-top: 12px;
    padding: 12px;
    border-radius: 8px;
    background: rgba(23, 107, 104, 0.08);
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 10px;
    align-items: baseline;
}

.archive-latest span {
    font-size: 12px;
    color: var(--color-secondary);
    font-weight: 700;
}

.archive-latest strong {
    min-width: 0;
    font-family: 'SF Mono', monospace;
    font-size: 16px;
    color: var(--text-primary);
    overflow-wrap: anywhere;
}

.archive-latest em {
    grid-column: 1 / -1;
    font-style: normal;
    font-size: 12px;
    color: var(--text-secondary);
}

.archive-locations {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.archive-location-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
}

.archive-location-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.archive-location-chip {
    max-width: 100%;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(31, 42, 49, 0.06);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-review {
    border: 1px solid rgba(31, 42, 49, 0.1);
    border-radius: 8px;
    padding: 15px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.94), rgba(244, 248, 247, 0.9));
    box-shadow: 0 12px 28px rgba(31, 42, 49, 0.07);
}

.archive-review-head {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
}

.archive-review-head span,
.archive-next-step span,
.archive-rhythm-item span {
    display: block;
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 800;
}

.archive-review-head strong {
    display: block;
    margin-top: 4px;
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1.25;
    font-weight: 800;
}

.archive-review-head p,
.archive-next-step p {
    margin-top: 5px;
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
}

.archive-route-list {
    display: flex;
    flex-direction: column;
    gap: 9px;
}

.archive-route-item {
    min-width: 0;
}

.archive-route-top {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 5px;
}

.archive-route-top span {
    width: 24px;
    height: 24px;
    border-radius: 8px;
    background: #1F2A31;
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
}

.archive-route-top strong {
    min-width: 0;
    color: var(--text-primary);
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-route-top em {
    color: var(--text-secondary);
    font-size: 12px;
    font-style: normal;
    font-weight: 700;
}

.archive-route-bar {
    height: 6px;
    overflow: hidden;
    border-radius: 999px;
    background: rgba(31, 42, 49, 0.08);
}

.archive-route-bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #176B68, #D99A5E);
}

.archive-rhythm-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-top: 13px;
}

.archive-rhythm-item {
    min-width: 0;
    min-height: 86px;
    border: 1px solid rgba(31, 42, 49, 0.08);
    border-radius: 8px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.78);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 6px;
}

.archive-rhythm-item strong {
    min-width: 0;
    color: var(--text-primary);
    font-size: 17px;
    line-height: 1.1;
    overflow-wrap: anywhere;
}

.archive-rhythm-item small {
    min-width: 0;
    color: var(--text-secondary);
    font-size: 11px;
    line-height: 1.35;
}

.archive-next-step {
    margin-top: 12px;
    padding: 10px 11px;
    border: 1px solid rgba(217, 154, 94, 0.28);
    border-radius: 8px;
    background: rgba(217, 154, 94, 0.1);
}

.archive-next-step strong {
    display: block;
    margin-top: 3px;
    color: var(--text-primary);
    font-size: 13px;
    line-height: 1.25;
}

.archive-story-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.archive-story-card {
    min-width: 0;
    min-height: 112px;
    border: 1px solid rgba(31, 42, 49, 0.08);
    border-radius: 8px;
    padding: 13px;
    background: rgba(255, 255, 255, 0.84);
    box-shadow: 0 10px 22px rgba(31, 42, 49, 0.06);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 8px;
}

.archive-story-card span,
.archive-section-title span {
    font-size: 12px;
    font-weight: 700;
    color: var(--text-secondary);
}

.archive-story-card strong {
    min-width: 0;
    font-size: 19px;
    line-height: 1.2;
    color: var(--text-primary);
    overflow-wrap: anywhere;
}

.archive-story-card small {
    min-width: 0;
    font-size: 12px;
    line-height: 1.45;
    color: var(--text-secondary);
}

.archive-story-card.logistics {
    background: linear-gradient(145deg, rgba(226, 246, 242, 0.92), rgba(255, 255, 255, 0.9));
}

.archive-story-card.support {
    background: linear-gradient(145deg, rgba(255, 243, 224, 0.92), rgba(255, 255, 255, 0.9));
}

.archive-story-card.month {
    background: linear-gradient(145deg, rgba(235, 241, 255, 0.92), rgba(255, 255, 255, 0.9));
}

.archive-story-card.neutral {
    background: rgba(247, 250, 249, 0.9);
}

.archive-timeline {
    border: 1px solid rgba(31, 42, 49, 0.1);
    border-radius: 8px;
    padding: 14px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 12px 28px rgba(31, 42, 49, 0.07);
}

.archive-section-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 12px;
}

.archive-section-title strong {
    font-size: 16px;
    color: var(--text-primary);
}

.archive-timeline-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.archive-timeline-item {
    display: grid;
    grid-template-columns: 14px minmax(0, 1fr);
    gap: 10px;
}

.archive-timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 7px;
    background: #176B68;
    box-shadow: 0 0 0 5px rgba(23, 107, 104, 0.1);
}

.archive-timeline-item.urgent .archive-timeline-dot {
    background: #D94841;
    box-shadow: 0 0 0 5px rgba(217, 72, 65, 0.12);
}

.archive-timeline-main {
    min-width: 0;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(31, 42, 49, 0.08);
}

.archive-timeline-item:last-child .archive-timeline-main {
    padding-bottom: 0;
    border-bottom: none;
}

.archive-timeline-top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
}

.archive-timeline-top strong {
    min-width: 0;
    font-family: 'SF Mono', monospace;
    font-size: 15px;
    color: var(--text-primary);
    overflow-wrap: anywhere;
}

.archive-timeline-top span,
.archive-timeline-main small {
    font-size: 12px;
    color: var(--text-tertiary);
}

.archive-timeline-main p {
    margin: 4px 0;
    font-size: 13px;
    line-height: 1.45;
    color: var(--text-secondary);
    overflow-wrap: anywhere;
}

.picked-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 4px;
}

.archive-filter {
    margin: 0;
}

.filter-btn {
    min-height: 38px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--bg-card);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.filter-count {
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    border-radius: 10px;
    background: rgba(31, 42, 49, 0.08);
    color: var(--text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
}

.filter-btn.active {
    background: #1F2A31;
    border-color: transparent;
    color: white;
}

.filter-btn.active .filter-count {
    background: rgba(255, 255, 255, 0.18);
    color: white;
}

.archive-month-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.archive-month-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.archive-month-head {
    width: 100%;
    min-height: 48px;
    padding: 8px 0;
    border: none;
    border-bottom: 1px solid rgba(31, 42, 49, 0.12);
    background: transparent;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    color: var(--text-primary);
}

.archive-month-rank {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(31, 42, 49, 0.08);
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.archive-month-title {
    flex: 1;
    min-width: 0;
    text-align: left;
    font-size: 16px;
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-month-count {
    flex-shrink: 0;
    font-size: 13px;
    color: var(--text-secondary);
}

.archive-chevron {
    flex-shrink: 0;
    color: var(--text-tertiary);
    transform: rotate(0deg);
    transition: transform 0.2s ease;
}

.archive-month-head.collapsed .archive-chevron {
    transform: rotate(-90deg);
}

.archive-month-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.archive-month-summary,
.archive-card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.archive-month-summary span,
.archive-card-meta span {
    max-width: 100%;
    padding: 5px 8px;
    border-radius: 8px;
    background: rgba(31, 42, 49, 0.06);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.archive-card-shell {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

@media (max-width: 380px) {
    .archive-command {
        padding: 14px;
    }

    .archive-command-header {
        align-items: stretch;
    }

    .archive-total {
        width: 62px;
    }

    .archive-title-block h2 {
        font-size: 18px;
    }

    .filter-btn {
        flex: 1 1 calc(50% - 8px);
        justify-content: center;
    }

    .archive-story-grid {
        grid-template-columns: 1fr;
    }

    .archive-rhythm-grid {
        grid-template-columns: 1fr;
    }

    .archive-timeline-top {
        flex-direction: column;
        gap: 2px;
    }
}
</style>
