<template>
    <div class="plans-page">
        <!-- 背景 -->
        <div class="bg-container">
            <div class="gradient-orb orb-1"></div>
            <div class="gradient-orb orb-2"></div>
        </div>
        
        <!-- 加载画面 -->
        <div v-if="loading" class="loading-screen">
            <svg class="loading-heart" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <div class="loading-text">加载中...</div>
        </div>
        
        <!-- 主应用 -->
        <div v-else class="app">
            <!-- 顶部导航 -->
            <header class="header">
                <div class="header-content">
                    <button class="icon-btn" @click="goBack">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <span class="header-title">坚持计划</span>
                    <button class="icon-btn" @click="showAddPlan = true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
            </header>
            
            <!-- 主内容 -->
            <main class="main">
                <!-- 统计概览 -->
                <div class="stats-section" v-if="stats">
                    <div class="stats-card">
                        <div class="stats-item">
                            <div class="stats-value">{{ stats.myStats?.totalPlans || 0 }}</div>
                            <div class="stats-label">我的计划</div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-value">{{ stats.myStats?.totalCheckIns || 0 }}</div>
                            <div class="stats-label">总打卡</div>
                        </div>
                        <div class="stats-item">
                            <div class="stats-value">{{ stats.myStats?.currentStreak || 0 }}</div>
                            <div class="stats-label">连续天数</div>
                        </div>
                        <div class="stats-item" v-if="stats.partnerStats?.totalCheckIns > 0">
                            <div class="stats-value">{{ stats.partnerStats?.totalCheckIns || 0 }}</div>
                            <div class="stats-label">TA的打卡</div>
                        </div>
                    </div>
                </div>
                
                <!-- 今日打卡状态 -->
                <div class="today-section" v-if="todayStatus && (todayStatus.checkedInPlans?.length > 0 || todayStatus.pendingPlans?.length > 0)">
                    <div class="section-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        今日打卡
                    </div>
                    <div class="today-grid">
                        <div 
                            v-for="plan in todayStatus.pendingPlans" 
                            :key="plan.id"
                            class="today-item pending"
                            @click="openCheckIn(plan)"
                        >
                            <div class="today-icon" :style="{ background: plan.color }">
                                <svg v-if="plan.type === 'kaoyan'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                </svg>
                                <svg v-else-if="plan.type === 'weight'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <circle cx="12" cy="12" r="10"/>
                                    <path d="M8 12h8M12 8v8"/>
                                </svg>
                                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                    <path d="M6.5 6.5h11M6.5 17.5h11M7 20h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                </svg>
                            </div>
                            <span class="today-name">{{ plan.title }}</span>
                            <span class="today-action">去打卡</span>
                        </div>
                        <div 
                            v-for="plan in todayStatus.checkedInPlans" 
                            :key="plan.id"
                            class="today-item completed"
                        >
                            <div class="today-icon" :style="{ background: plan.color }">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                            <span class="today-name">{{ plan.title }}</span>
                            <span class="today-action">已完成</span>
                        </div>
                    </div>
                </div>
                
                <!-- 计划分类标签 -->
                <div class="tabs-section">
                    <div class="tabs">
                        <button 
                            v-for="tab in tabs" 
                            :key="tab.key"
                            class="tab"
                            :class="{ active: currentTab === tab.key }"
                            @click="currentTab = tab.key"
                        >
                            <span class="tab-icon">{{ tab.icon }}</span>
                            {{ tab.label }}
                        </button>
                    </div>
                </div>
                
                <!-- 计划列表 -->
                <div class="plans-section">
                    <div v-if="filteredPlans.length === 0" class="empty-state">
                        <div class="empty-icon">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <div class="empty-text">暂无{{ currentTabLabel }}计划</div>
                        <div class="empty-sub">点击下方按钮创建新计划</div>
                    </div>
                    
                    <div v-else class="plans-list">
                        <div 
                            v-for="plan in filteredPlans" 
                            :key="plan._id"
                            class="plan-card"
                            :class="{ completed: plan.status === 'completed', paused: plan.status === 'paused' }"
                            @click="openPlanDetail(plan)"
                        >
                            <div class="plan-header">
                                <div class="plan-icon" :style="{ background: plan.color }">
                                    <svg v-if="plan.type === 'kaoyan'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                                    </svg>
                                    <svg v-else-if="plan.type === 'weight'" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M8 12h8M12 8v8"/>
                                    </svg>
                                    <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                        <path d="M6.5 6.5h11M6.5 17.5h11M7 20h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"/>
                                    </svg>
                                </div>
                                <div class="plan-info">
                                    <div class="plan-title">{{ plan.title }}</div>
                                    <div class="plan-desc" v-if="plan.description">{{ plan.description }}</div>
                                    <div class="plan-target" v-if="plan.target">
                                        <span class="target-label">目标：</span>
                                        <span class="target-value">{{ plan.target }}</span>
                                    </div>
                                </div>
                                <div class="plan-status" :class="plan.status">
                                    {{ planStatusText(plan.status) }}
                                </div>
                            </div>
                            
                            <div class="plan-stats" v-if="plan.stats">
                                <div class="stat-item">
                                    <span class="stat-value">{{ plan.stats.myCheckIns }}</span>
                                    <span class="stat-label">打卡</span>
                                </div>
                                <div class="stat-item" v-if="plan.stats.myStreak > 0">
                                    <span class="stat-value">{{ plan.stats.myStreak }}</span>
                                    <span class="stat-label">连续</span>
                                </div>
                                <div class="stat-item" v-if="plan.type === 'weight' && plan.stats.latestWeight">
                                    <span class="stat-value">{{ plan.stats.latestWeight }}kg</span>
                                    <span class="stat-label">最新</span>
                                </div>
                                <div class="stat-item" v-if="plan.initialValue && plan.targetValue">
                                    <span class="stat-value">{{ plan.targetValue - plan.stats.latestWeight }}kg</span>
                                    <span class="stat-label">剩余</span>
                                </div>
                            </div>
                            
                            <div class="plan-progress" v-if="plan.startDate">
                                <div class="progress-bar">
                                    <div class="progress-fill" :style="{ width: planProgress(plan) + '%', background: plan.color }"></div>
                                </div>
                                <div class="progress-text">已坚持 {{ planDays(plan) }} 天</div>
                            </div>
                            
                            <div class="plan-actions">
                                <button 
                                    class="action-btn checkin"
                                    :disabled="plan.status !== 'active' || isCheckedInToday(plan._id)"
                                    @click.stop="openCheckIn(plan)"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    {{ isCheckedInToday(plan._id) ? '已打卡' : '打卡' }}
                                </button>
                                <button class="action-btn" @click.stop="openPlanDetail(plan)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="1"/>
                                        <circle cx="19" cy="12" r="1"/>
                                        <circle cx="5" cy="12" r="1"/>
                                    </svg>
                                    详情
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <!-- 底部导航 -->
        <BottomNav @toast="showToast" />
        
        <!-- 添加计划弹窗 -->
        <div class="modal-overlay" :class="{ show: showAddPlan }" @click.self="closeAddPlan">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>创建新计划</h3>
                    <button class="close-btn" @click="closeAddPlan">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>计划类型</label>
                        <div class="type-selector">
                            <button 
                                v-for="type in planTypes" 
                                :key="type.key"
                                class="type-option"
                                :class="{ active: newPlan.type === type.key }"
                                @click="newPlan.type = type.key"
                            >
                                <span class="type-icon">{{ type.icon }}</span>
                                <span class="type-name">{{ type.label }}</span>
                            </button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>计划标题</label>
                        <input 
                            type="text" 
                            v-model="newPlan.title"
                            :placeholder="planTypePlaceholder"
                            class="form-input"
                        >
                    </div>
                    
                    <div class="form-group">
                        <label>描述（可选）</label>
                        <textarea 
                            v-model="newPlan.description"
                            placeholder="描述一下你的计划..."
                            class="form-textarea"
                            rows="2"
                        ></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>目标</label>
                        <input 
                            type="text" 
                            v-model="newPlan.target"
                            :placeholder="targetPlaceholder"
                            class="form-input"
                        >
                    </div>
                    
                    <div class="form-row" v-if="newPlan.type === 'weight'">
                        <div class="form-group half">
                            <label>起始体重 (kg)</label>
                            <input type="number" step="0.1" v-model="newPlan.initialValue" class="form-input">
                        </div>
                        <div class="form-group half">
                            <label>目标体重 (kg)</label>
                            <input type="number" step="0.1" v-model="newPlan.targetValue" class="form-input">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group half">
                            <label>开始日期</label>
                            <input type="date" v-model="newPlan.startDate" class="form-input">
                        </div>
                        <div class="form-group half">
                            <label>结束日期（可选）</label>
                            <input type="date" v-model="newPlan.endDate" class="form-input">
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closeAddPlan">取消</button>
                    <button 
                        class="btn-primary" 
                        @click="createPlan"
                        :disabled="!canCreatePlan || creating"
                    >
                        {{ creating ? '创建中...' : '创建计划' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 打卡弹窗 -->
        <div class="modal-overlay" :class="{ show: showCheckIn }" @click.self="closeCheckIn">
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3>{{ checkInPlan?.title }} - 打卡</h3>
                    <button class="close-btn" @click="closeCheckIn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="checkin-date">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                            <line x1="16" y1="2" x2="16" y2="6"/>
                            <line x1="8" y1="2" x2="8" y2="6"/>
                            <line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {{ formatDate(new Date()) }}
                    </div>
                    
                    <!-- 考研打卡 -->
                    <template v-if="checkInPlan?.type === 'kaoyan'">
                        <div class="form-group">
                            <label>学习时长（分钟）</label>
                            <div class="duration-selector">
                                <button 
                                    v-for="d in [30, 60, 90, 120, 180, 240]" 
                                    :key="d"
                                    class="duration-btn"
                                    :class="{ active: checkInData.duration === d }"
                                    @click="checkInData.duration = d"
                                >
                                    {{ d }}分
                                </button>
                                <input 
                                    type="number" 
                                    v-model.number="checkInData.duration"
                                    placeholder="自定义"
                                    class="duration-input"
                                >
                            </div>
                        </div>
                        <div class="form-group">
                            <label>学习内容</label>
                            <input 
                                type="text" 
                                v-model="checkInData.activity"
                                placeholder="例如：数学、英语、专业课..."
                                class="form-input"
                            >
                        </div>
                    </template>
                    
                    <!-- 减肥打卡 -->
                    <template v-if="checkInPlan?.type === 'weight'">
                        <div class="form-group">
                            <label>今日体重 (kg)</label>
                            <input 
                                type="number" 
                                step="0.1"
                                v-model.number="checkInData.weight"
                                placeholder="输入今日体重"
                                class="form-input"
                            >
                        </div>
                        <div class="form-group">
                            <label>今日饮食/运动记录</label>
                            <textarea 
                                v-model="checkInData.activity"
                                placeholder="记录今天的饮食或运动情况..."
                                class="form-textarea"
                                rows="2"
                            ></textarea>
                        </div>
                    </template>
                    
                    <!-- 健身打卡 -->
                    <template v-if="checkInPlan?.type === 'fitness'">
                        <div class="form-group">
                            <label>运动类型</label>
                            <div class="activity-tags">
                                <button 
                                    v-for="tag in fitnessTags" 
                                    :key="tag"
                                    class="activity-tag"
                                    :class="{ active: checkInData.activity === tag }"
                                    @click="checkInData.activity = tag"
                                >
                                    {{ tag }}
                                </button>
                                <input 
                                    type="text" 
                                    v-model="checkInData.activity"
                                    placeholder="自定义"
                                    class="activity-tag-input"
                                >
                            </div>
                        </div>
                        <div class="form-group">
                            <label>运动时长（分钟）</label>
                            <div class="duration-selector">
                                <button 
                                    v-for="d in [15, 30, 45, 60, 90, 120]" 
                                    :key="d"
                                    class="duration-btn"
                                    :class="{ active: checkInData.duration === d }"
                                    @click="checkInData.duration = d"
                                >
                                    {{ d }}分
                                </button>
                                <input 
                                    type="number" 
                                    v-model.number="checkInData.duration"
                                    placeholder="自定义"
                                    class="duration-input"
                                >
                            </div>
                        </div>
                    </template>
                    
                    <div class="form-group">
                        <label>备注（可选）</label>
                        <textarea 
                            v-model="checkInData.content"
                            placeholder="写点什么..."
                            class="form-textarea"
                            rows="2"
                        ></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>今日心情</label>
                        <div class="mood-selector">
                            <button 
                                v-for="mood in moods" 
                                :key="mood.key"
                                class="mood-btn"
                                :class="{ active: checkInData.mood === mood.key }"
                                @click="checkInData.mood = mood.key"
                            >
                                <span class="mood-emoji">{{ mood.emoji }}</span>
                                <span class="mood-name">{{ mood.name }}</span>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" @click="closeCheckIn">取消</button>
                    <button 
                        class="btn-primary" 
                        @click="submitCheckIn"
                        :disabled="!canCheckIn || checkingIn"
                    >
                        {{ checkingIn ? '打卡中...' : '确认打卡' }}
                    </button>
                </div>
            </div>
        </div>
        
        <!-- 计划详情弹窗 -->
        <div class="modal-overlay" :class="{ show: showPlanDetail }" @click.self="closePlanDetail">
            <div class="modal-dialog detail-dialog">
                <div class="modal-header">
                    <h3>{{ selectedPlan?.title }}</h3>
                    <button class="close-btn" @click="closePlanDetail">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="detail-info" v-if="selectedPlan">
                        <div class="detail-item">
                            <span class="detail-label">类型</span>
                            <span class="detail-value">{{ planTypeText(selectedPlan.type) }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">状态</span>
                            <span class="detail-value" :class="selectedPlan.status">{{ planStatusText(selectedPlan.status) }}</span>
                        </div>
                        <div class="detail-item" v-if="selectedPlan.target">
                            <span class="detail-label">目标</span>
                            <span class="detail-value">{{ selectedPlan.target }}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">开始日期</span>
                            <span class="detail-value">{{ formatDate(selectedPlan.startDate) }}</span>
                        </div>
                        <div class="detail-item" v-if="selectedPlan.endDate">
                            <span class="detail-label">结束日期</span>
                            <span class="detail-value">{{ formatDate(selectedPlan.endDate) }}</span>
                        </div>
                    </div>
                    
                    <!-- 打卡记录 -->
                    <div class="checkin-history" v-if="selectedPlanCheckIns.length > 0">
                        <div class="history-title">打卡记录</div>
                        <div class="history-list">
                            <div 
                                v-for="record in selectedPlanCheckIns" 
                                :key="record._id"
                                class="history-item"
                            >
                                <div class="history-date">{{ formatDate(record.date) }}</div>
                                <div class="history-content">
                                    <div v-if="record.data.weight">体重：{{ record.data.weight }}kg</div>
                                    <div v-if="record.data.duration">时长：{{ record.data.duration }}分钟</div>
                                    <div v-if="record.data.activity">{{ record.data.activity }}</div>
                                    <div v-if="record.content" class="history-note">{{ record.content }}</div>
                                </div>
                                <div class="history-mood">{{ moodEmoji(record.mood) }}</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-danger" @click="confirmDeletePlan(selectedPlan)" v-if="selectedPlan?.userId === currentUserId">删除</button>
                    <button 
                        class="btn-secondary" 
                        @click="togglePlanStatus"
                        v-if="selectedPlan?.status !== 'completed'"
                    >
                        {{ selectedPlan?.status === 'active' ? '暂停' : '继续' }}
                    </button>
                    <button class="btn-primary" @click="openCheckIn(selectedPlan); closePlanDetail()">打卡</button>
                </div>
            </div>
        </div>
        
        <!-- Toast -->
        <div class="toast" :class="{ show: toast.show, [toast.type]: true }">
            <svg v-if="toast.type === 'success'" class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <svg v-else-if="toast.type === 'error'" class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
            <span>{{ toast.message }}</span>
        </div>
        
        <!-- 确认对话框 -->
        <div class="confirm-overlay" :class="{ show: confirm.show }" @click.self="cancelConfirm">
            <div class="confirm-dialog">
                <div class="confirm-title">{{ confirm.title }}</div>
                <div class="confirm-message">{{ confirm.message }}</div>
                <div class="confirm-actions">
                    <button class="confirm-btn cancel" @click="cancelConfirm">{{ confirm.cancelText }}</button>
                    <button class="confirm-btn confirm danger" @click="doConfirm">{{ confirm.confirmText }}</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

export default {
    name: 'Plans',
    components: { BottomNav },
    setup() {
        const router = useRouter()
        
        const loading = ref(true)
        const plans = ref([])
        const stats = ref(null)
        const todayStatus = ref(null)
        const currentTab = ref('all')
        const currentUserId = ref('')
        
        const showAddPlan = ref(false)
        const showCheckIn = ref(false)
        const showPlanDetail = ref(false)
        const checkInPlan = ref(null)
        const selectedPlan = ref(null)
        const selectedPlanCheckIns = ref([])
        
        const creating = ref(false)
        const checkingIn = ref(false)
        
        const tabs = [
            { key: 'all', label: '全部', icon: '📋' },
            { key: 'kaoyan', label: '考研', icon: '📚' },
            { key: 'weight', label: '减肥', icon: '⚖️' },
            { key: 'fitness', label: '健身', icon: '💪' }
        ]
        
        const planTypes = [
            { key: 'kaoyan', label: '考研', icon: '📚' },
            { key: 'weight', label: '减肥', icon: '⚖️' },
            { key: 'fitness', label: '健身', icon: '💪' }
        ]
        
        const fitnessTags = ['跑步', '力量训练', '瑜伽', '游泳', '骑行', '球类运动', 'HIIT', '其他']
        
        const moods = [
            { key: 'great', name: '超棒', emoji: '🤩' },
            { key: 'good', name: '不错', emoji: '😊' },
            { key: 'normal', name: '一般', emoji: '😐' },
            { key: 'tired', name: '疲惫', emoji: '😴' },
            { key: 'bad', name: '不好', emoji: '😔' }
        ]
        
        const newPlan = ref({
            type: 'kaoyan',
            title: '',
            description: '',
            target: '',
            initialValue: null,
            targetValue: null,
            startDate: new Date().toISOString().split('T')[0],
            endDate: ''
        })
        
        const checkInData = ref({
            duration: null,
            weight: null,
            activity: '',
            content: '',
            mood: 'good'
        })
        
        const toast = ref({ show: false, message: '', type: 'info' })
        const confirm = ref({ show: false, title: '', message: '', confirmText: '确认', cancelText: '取消', action: null })
        
        const getToken = () => localStorage.getItem('token')
        
        const currentTabLabel = computed(() => {
            const tab = tabs.find(t => t.key === currentTab.value)
            return tab ? tab.label : ''
        })
        
        const filteredPlans = computed(() => {
            if (currentTab.value === 'all') return plans.value
            return plans.value.filter(p => p.type === currentTab.value)
        })
        
        const planTypePlaceholder = computed(() => {
            const placeholders = {
                kaoyan: '例如：2025考研冲刺',
                weight: '例如：健康减重计划',
                fitness: '例如：每周运动打卡'
            }
            return placeholders[newPlan.value.type] || '输入计划标题'
        })
        
        const targetPlaceholder = computed(() => {
            const placeholders = {
                kaoyan: '例如：总分400+，上岸目标院校',
                weight: '例如：3个月减重10kg',
                fitness: '例如：每周运动3次，每次30分钟'
            }
            return placeholders[newPlan.value.type] || '描述你的目标'
        })
        
        const canCreatePlan = computed(() => {
            return newPlan.value.title && newPlan.value.startDate
        })
        
        const canCheckIn = computed(() => {
            if (checkInPlan.value?.type === 'weight') {
                return checkInData.value.weight > 0
            }
            if (checkInPlan.value?.type === 'kaoyan') {
                return checkInData.value.duration > 0
            }
            if (checkInPlan.value?.type === 'fitness') {
                return checkInData.value.activity && checkInData.value.duration > 0
            }
            return true
        })
        
        const showToast = (message, type = 'info') => {
            toast.value = { show: true, message, type }
            setTimeout(() => toast.value.show = false, 2500)
        }
        
        const fetchData = async () => {
            loading.value = true
            try {
                await Promise.all([
                    fetchPlans(),
                    fetchStats(),
                    fetchTodayStatus()
                ])
            } catch (e) {
                console.error('获取数据失败:', e)
            } finally {
                loading.value = false
            }
        }
        
        const fetchPlans = async () => {
            const res = await fetch(CONFIG.API_URL + '/plans', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            })
            const data = await res.json()
            if (data.success) {
                plans.value = data.data
            }
        }
        
        const fetchStats = async () => {
            const res = await fetch(CONFIG.API_URL + '/plans/stats/overview', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            })
            const data = await res.json()
            if (data.success) {
                stats.value = data.data
            }
        }
        
        const fetchTodayStatus = async () => {
            const res = await fetch(CONFIG.API_URL + '/plans/today/status', {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            })
            const data = await res.json()
            if (data.success) {
                todayStatus.value = data.data
            }
        }
        
        const fetchPlanCheckIns = async (planId) => {
            const res = await fetch(`${CONFIG.API_URL}/plans/${planId}/checkins`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            })
            const data = await res.json()
            if (data.success) {
                selectedPlanCheckIns.value = data.data
            }
        }
        
        const createPlan = async () => {
            creating.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/plans', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify(newPlan.value)
                })
                const data = await res.json()
                if (data.success) {
                    showToast('计划创建成功', 'success')
                    closeAddPlan()
                    fetchPlans()
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            creating.value = false
        }
        
        const submitCheckIn = async () => {
            checkingIn.value = true
            try {
                const res = await fetch(`${CONFIG.API_URL}/plans/${checkInPlan.value._id}/checkin`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({
                        date: new Date().toISOString(),
                        content: checkInData.value.content,
                        data: {
                            duration: checkInData.value.duration,
                            weight: checkInData.value.weight,
                            activity: checkInData.value.activity,
                            completion: 100
                        },
                        mood: checkInData.value.mood
                    })
                })
                const data = await res.json()
                if (data.success) {
                    showToast('打卡成功！继续保持', 'success')
                    closeCheckIn()
                    fetchPlans()
                    fetchStats()
                    fetchTodayStatus()
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('网络错误', 'error')
            }
            checkingIn.value = false
        }
        
        const togglePlanStatus = async () => {
            if (!selectedPlan.value) return
            const newStatus = selectedPlan.value.status === 'active' ? 'paused' : 'active'
            try {
                const res = await fetch(`${CONFIG.API_URL}/plans/${selectedPlan.value._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ status: newStatus })
                })
                const data = await res.json()
                if (data.success) {
                    showToast(newStatus === 'active' ? '计划已继续' : '计划已暂停', 'success')
                    selectedPlan.value.status = newStatus
                    fetchPlans()
                }
            } catch (e) {
                showToast('操作失败', 'error')
            }
        }
        
        const deletePlan = async (plan) => {
            try {
                const res = await fetch(`${CONFIG.API_URL}/plans/${plan._id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    showToast('计划已删除', 'success')
                    closePlanDetail()
                    fetchPlans()
                    fetchStats()
                } else {
                    showToast(data.message, 'error')
                }
            } catch (e) {
                showToast('删除失败', 'error')
            }
        }
        
        const closeAddPlan = () => {
            showAddPlan.value = false
            newPlan.value = {
                type: 'kaoyan',
                title: '',
                description: '',
                target: '',
                initialValue: null,
                targetValue: null,
                startDate: new Date().toISOString().split('T')[0],
                endDate: ''
            }
        }
        
        const openCheckIn = (plan) => {
            checkInPlan.value = plan
            checkInData.value = {
                duration: null,
                weight: null,
                activity: '',
                content: '',
                mood: 'good'
            }
            showCheckIn.value = true
        }
        
        const closeCheckIn = () => {
            showCheckIn.value = false
            checkInPlan.value = null
        }
        
        const openPlanDetail = (plan) => {
            selectedPlan.value = plan
            fetchPlanCheckIns(plan._id)
            showPlanDetail.value = true
        }
        
        const closePlanDetail = () => {
            showPlanDetail.value = false
            selectedPlan.value = null
            selectedPlanCheckIns.value = []
        }
        
        const confirmDeletePlan = (plan) => {
            confirm.value = {
                show: true,
                title: '删除计划',
                message: `确定要删除「${plan.title}」吗？此操作不可恢复。`,
                confirmText: '删除',
                cancelText: '取消',
                action: () => deletePlan(plan)
            }
        }
        
        const cancelConfirm = () => {
            confirm.value.show = false
        }
        
        const doConfirm = () => {
            if (confirm.value.action) confirm.value.action()
            confirm.value.show = false
        }
        
        const goBack = () => {
            router.push('/home')
        }
        
        const formatDate = (date) => {
            if (!date) return ''
            const d = new Date(date)
            return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
        }
        
        const planTypeText = (type) => {
            const map = { kaoyan: '考研', weight: '减肥', fitness: '健身' }
            return map[type] || type
        }
        
        const planStatusText = (status) => {
            const map = { active: '进行中', paused: '已暂停', completed: '已完成' }
            return map[status] || status
        }
        
        const moodEmoji = (mood) => {
            const map = { great: '🤩', good: '😊', normal: '😐', tired: '😴', bad: '😔' }
            return map[mood] || '😊'
        }
        
        const planProgress = (plan) => {
            if (!plan.startDate) return 0
            const start = new Date(plan.startDate).getTime()
            const now = Date.now()
            const total = plan.endDate 
                ? new Date(plan.endDate).getTime() - start
                : 30 * 24 * 60 * 60 * 1000 // 默认30天
            const passed = now - start
            return Math.min(100, Math.max(0, Math.round((passed / total) * 100)))
        }
        
        const planDays = (plan) => {
            if (!plan.startDate) return 0
            const start = new Date(plan.startDate)
            start.setHours(0, 0, 0, 0)
            const now = new Date()
            now.setHours(0, 0, 0, 0)
            return Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1)
        }
        
        const isCheckedInToday = (planId) => {
            if (!todayStatus.value?.checkedInPlans) return false
            return todayStatus.value.checkedInPlans.some(p => p.id === planId)
        }
        
        onMounted(() => {
            // 获取当前用户ID
            const token = getToken()
            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]))
                    currentUserId.value = payload.userId
                } catch (e) {}
            }
            fetchData()
        })
        
        return {
            loading,
            plans,
            stats,
            todayStatus,
            currentTab,
            currentUserId,
            tabs,
            planTypes,
            fitnessTags,
            moods,
            showAddPlan,
            showCheckIn,
            showPlanDetail,
            checkInPlan,
            selectedPlan,
            selectedPlanCheckIns,
            newPlan,
            checkInData,
            creating,
            checkingIn,
            filteredPlans,
            currentTabLabel,
            planTypePlaceholder,
            targetPlaceholder,
            canCreatePlan,
            canCheckIn,
            toast,
            confirm,
            createPlan,
            submitCheckIn,
            togglePlanStatus,
            deletePlan,
            closeAddPlan,
            openCheckIn,
            closeCheckIn,
            openPlanDetail,
            closePlanDetail,
            confirmDeletePlan,
            cancelConfirm,
            doConfirm,
            goBack,
            showToast,
            formatDate,
            planTypeText,
            planStatusText,
            moodEmoji,
            planProgress,
            planDays,
            isCheckedInToday
        }
    }
}
</script>

<style scoped>
.plans-page {
    min-height: 100vh;
    position: relative;
}

.app {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    padding-bottom: 100px;
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
    color: var(--text-primary);
}

/* 主内容 */
.main {
    max-width: 480px;
    margin: 0 auto;
    padding: 20px;
}

/* 统计区域 */
.stats-section {
    margin-bottom: 20px;
}

.stats-card {
    display: flex;
    justify-content: space-around;
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.5) 0%, rgba(219, 237, 156, 0.3) 100%);
    border: 1px solid rgba(255, 107, 107, 0.2);
    border-radius: var(--radius-xl);
    padding: 20px;
}

.stats-item {
    text-align: center;
}

.stats-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1.2;
}

.stats-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}

/* 今日打卡区域 */
.today-section {
    margin-bottom: 20px;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
}

.today-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.today-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.3s ease;
}

.today-item.pending {
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.05);
}

.today-item.completed {
    opacity: 0.7;
}

.today-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
}

.today-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.today-name {
    font-size: 13px;
    font-weight: 500;
}

.today-action {
    font-size: 11px;
    color: var(--color-primary);
    margin-left: 4px;
}

/* 标签页 */
.tabs-section {
    margin-bottom: 16px;
}

.tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;
}

.tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-lg);
    font-size: 14px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.tab.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

/* 计划列表 */
.plans-section {
    min-height: 300px;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
    background: var(--bg-card);
    border: 2px dashed var(--border-color);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
}

.empty-text {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-secondary);
    margin-bottom: 4px;
}

.empty-sub {
    font-size: 13px;
    color: var(--text-tertiary);
}

.plans-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.plan-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 16px;
    transition: all 0.3s ease;
}

.plan-card:hover {
    box-shadow: var(--shadow-sm);
}

.plan-card.completed {
    opacity: 0.7;
}

.plan-card.paused {
    opacity: 0.8;
    background: var(--bg-input);
}

.plan-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
}

.plan-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.plan-info {
    flex: 1;
    min-width: 0;
}

.plan-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
}

.plan-desc {
    font-size: 12px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.plan-target {
    font-size: 12px;
    margin-top: 4px;
}

.target-label {
    color: var(--text-tertiary);
}

.target-value {
    color: var(--color-primary);
}

.plan-status {
    font-size: 11px;
    padding: 4px 8px;
    border-radius: 20px;
    background: var(--bg-input);
}

.plan-status.active {
    background: rgba(76, 175, 80, 0.15);
    color: #4CAF50;
}

.plan-status.paused {
    background: rgba(255, 152, 0, 0.15);
    color: #FF9800;
}

.plan-status.completed {
    background: rgba(156, 156, 156, 0.15);
    color: #9E9E9E;
}

.plan-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 12px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
}

.stat-item {
    text-align: center;
}

.stat-value {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: var(--color-primary);
}

.stat-label {
    font-size: 11px;
    color: var(--text-tertiary);
}

.plan-progress {
    margin-bottom: 12px;
}

.progress-bar {
    height: 6px;
    background: var(--bg-input);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 6px;
}

.progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 11px;
    color: var(--text-tertiary);
}

.plan-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
}

.action-btn:hover {
    background: var(--bg-card-hover);
    border-color: var(--border-focus);
}

.action-btn.checkin {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.action-btn.checkin:disabled {
    background: var(--bg-input);
    border-color: var(--border-color);
    color: var(--text-tertiary);
    cursor: not-allowed;
}

/* 弹窗 */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(51, 51, 51, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.modal-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.modal-dialog {
    background: var(--bg-card);
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    width: 100%;
    max-width: 480px;
    max-height: 90vh;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform 0.3s ease;
}

.modal-overlay.show .modal-dialog {
    transform: translateY(0);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 600;
}

.close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--bg-input);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
}

.modal-body {
    padding: 20px;
}

.modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 20px 20px;
    border-top: 1px solid var(--border-color);
}

.btn-primary, .btn-secondary, .btn-danger {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.btn-primary {
    background: var(--color-primary);
    color: white;
}

.btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-glow);
}

.btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.btn-secondary {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.btn-danger {
    background: #EF4444;
    color: white;
}

/* 表单 */
.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.form-row {
    display: flex;
    gap: 12px;
}

.form-group.half {
    flex: 1;
}

.form-input, .form-textarea {
    width: 100%;
    padding: 12px 16px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--text-primary);
    outline: none;
    transition: all 0.3s ease;
    box-sizing: border-box;
}

.form-input:focus, .form-textarea:focus {
    border-color: var(--border-focus);
    box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.1);
}

.form-textarea {
    resize: vertical;
}

/* 类型选择器 */
.type-selector {
    display: flex;
    gap: 8px;
}

.type-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px;
    background: var(--bg-input);
    border: 2px solid var(--border-color);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all 0.3s ease;
}

.type-option.active {
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.05);
}

.type-icon {
    font-size: 24px;
}

.type-name {
    font-size: 13px;
    font-weight: 500;
}

/* 打卡弹窗 */
.checkin-date {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 16px;
}

.duration-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.duration-btn {
    padding: 8px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.duration-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.duration-input {
    width: 80px;
    padding: 8px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    text-align: center;
}

.activity-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.activity-tag {
    padding: 8px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.activity-tag.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.activity-tag-input {
    width: 80px;
    padding: 8px 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 13px;
}

.mood-selector {
    display: flex;
    gap: 8px;
}

.mood-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;
}

.mood-btn.active {
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.05);
}

.mood-emoji {
    font-size: 20px;
}

.mood-name {
    font-size: 11px;
    color: var(--text-secondary);
}

/* 详情弹窗 */
.detail-dialog {
    max-height: 80vh;
}

.detail-info {
    margin-bottom: 20px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
}

.detail-label {
    font-size: 14px;
    color: var(--text-secondary);
}

.detail-value {
    font-size: 14px;
    font-weight: 500;
}

.detail-value.active {
    color: #4CAF50;
}

.detail-value.paused {
    color: #FF9800;
}

.detail-value.completed {
    color: #9E9E9E;
}

.history-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
}

.history-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
}

.history-date {
    font-size: 12px;
    color: var(--text-tertiary);
    white-space: nowrap;
}

.history-content {
    flex: 1;
    font-size: 13px;
}

.history-content > div {
    margin-bottom: 2px;
}

.history-note {
    color: var(--text-secondary);
    font-style: italic;
}

.history-mood {
    font-size: 16px;
}

/* Toast */
.toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(-30px);
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid var(--border-color);
    padding: 14px 24px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(241, 101, 137, 0.15);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease, visibility 0.3s;
    z-index: 9999;
    max-width: 90%;
    width: max-content;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
}

.toast.success {
    border-color: rgba(34, 197, 94, 0.3);
    background: rgba(219, 237, 156, 0.3);
}

.toast.error {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(241, 101, 137, 0.15);
}

/* 确认对话框 */
.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(51, 51, 51, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
}

.confirm-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.confirm-dialog {
    background: linear-gradient(135deg, rgba(253, 253, 245, 0.98) 0%, rgba(254, 208, 214, 0.95) 100%);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-xl);
    padding: 28px;
    width: 320px;
    max-width: 90%;
    text-align: center;
    transform: scale(0.9) translateY(20px);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.confirm-overlay.show .confirm-dialog {
    transform: scale(1) translateY(0);
}

.confirm-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.confirm-message {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 24px;
    line-height: 1.5;
}

.confirm-actions {
    display: flex;
    gap: 12px;
}

.confirm-btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.confirm-btn.cancel {
    background: var(--bg-input);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
}

.confirm-btn.confirm {
    background: linear-gradient(135deg, #E91E63 0%, #F06292 100%);
    color: white;
}

.confirm-btn.danger {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
}

/* 加载动画 */
.loading-screen {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
    z-index: 1000;
}

.loading-heart {
    width: 60px;
    height: 60px;
    color: var(--color-primary);
    animation: heartbeat 1.5s ease-in-out infinite;
}

@keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
}

.loading-text {
    margin-top: 16px;
    font-size: 14px;
    color: var(--text-secondary);
}

/* 背景装饰 */
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
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #FDD3D5 0%, #DBED9C 100%);
    top: -100px;
    right: -100px;
    animation: float 20s ease-in-out infinite;
}

.orb-2 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #DBED9C 0%, #FDD3D5 100%);
    bottom: -50px;
    left: -50px;
    animation: float 15s ease-in-out infinite reverse;
}

@keyframes float {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(30px, -30px); }
}
</style>
