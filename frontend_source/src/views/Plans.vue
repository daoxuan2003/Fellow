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
                    <button class="icon-btn ai-btn" @click="showAIAdvisor = true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
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
                        <span class="today-count" v-if="todayStatus.checkedInPlans?.length > 0">
                            {{ todayStatus.checkedInPlans.length }}/{{ (todayStatus.checkedInPlans.length + todayStatus.pendingPlans.length) }}
                        </span>
                    </div>
                    <div class="today-grid">
                        <div 
                            v-for="plan in todayStatus.pendingPlans" 
                            :key="plan.id"
                            class="today-item pending"
                            @click="openCheckIn(plans.find(p => p._id === plan.id))"
                        >
                            <div class="today-icon" :style="{ background: plan.color }">
                                <span>{{ plan.icon }}</span>
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
                
                <!-- 计划列表 -->
                <div class="plans-section">
                    <div class="section-header">
                        <div class="section-title">我的计划</div>
                        <button class="add-btn" @click="openTemplateSelector">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            新建
                        </button>
                    </div>
                    
                    <div v-if="plans.length === 0" class="empty-state">
                        <div class="empty-icon">📝</div>
                        <div class="empty-text">还没有坚持计划</div>
                        <div class="empty-sub">点击下方按钮创建你的第一个计划</div>
                        <button class="empty-btn" @click="openTemplateSelector">创建计划</button>
                    </div>
                    
                    <div v-else class="plans-list">
                        <div 
                            v-for="plan in plans" 
                            :key="plan._id"
                            class="plan-card"
                            :class="{ completed: plan.status === 'completed', paused: plan.status === 'paused' }"
                        >
                            <div class="plan-header" @click="openPlanDetail(plan)">
                                <div class="plan-icon" :style="{ background: plan.color }">
                                    <span>{{ plan.icon }}</span>
                                </div>
                                <div class="plan-info">
                                    <div class="plan-title">{{ plan.title }}</div>
                                    <div class="plan-desc" v-if="plan.target">{{ plan.target }}</div>
                                    <div class="plan-meta" v-else>
                                        已坚持 {{ planDays(plan) }} 天
                                    </div>
                                </div>
                                <div class="plan-status" :class="plan.status">
                                    {{ planStatusText(plan.status) }}
                                </div>
                            </div>
                            
                            <div class="plan-stats" v-if="plan.stats" @click="openPlanDetail(plan)">
                                <div class="stat-item">
                                    <span class="stat-value">{{ plan.stats.myCheckIns }}</span>
                                    <span class="stat-label">打卡</span>
                                </div>
                                <div class="stat-item" v-if="plan.stats.myStreak > 0">
                                    <span class="stat-value">{{ plan.stats.myStreak }}🔥</span>
                                    <span class="stat-label">连续</span>
                                </div>
                                <div class="stat-item" v-if="plan.hasValue && plan.stats.latestValue">
                                    <span class="stat-value">{{ plan.stats.latestValue }}{{ plan.unit }}</span>
                                    <span class="stat-label">最新</span>
                                </div>
                            </div>
                            
                            <!-- AI 调整建议 -->
                            <div class="ai-suggestion" v-if="plan.aiAdjustment" @click="openPlanDetail(plan)">
                                <div class="ai-suggestion-header">
                                    <span class="ai-icon">🤖</span>
                                    <span class="ai-title">智能建议</span>
                                </div>
                                <div class="ai-suggestion-content">{{ plan.aiAdjustment }}</div>
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
                                <button class="action-btn adjust" @click.stop="openAIAdjustment(plan)">
                                    <span>🤖</span>
                                    AI调整
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
        
        <!-- 底部导航 -->
        <BottomNav @toast="showToast" />
        
        <!-- 模板选择弹窗 -->
        <teleport to="body">
            <div class="modal-overlay" :class="{ show: showTemplateSelector }" @click.self="closeTemplateSelector">
                <div class="modal-dialog template-dialog">
                    <div class="modal-header">
                        <h3>选择计划类型</h3>
                        <button class="close-btn" @click="closeTemplateSelector">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="template-grid">
                            <div 
                                v-for="template in templates" 
                                :key="template.key"
                                class="template-card"
                                @click="selectTemplate(template)"
                            >
                                <div class="template-icon" :style="{ background: template.color }">
                                    {{ template.icon }}
                                </div>
                                <div class="template-name">{{ template.name }}</div>
                                <div class="template-examples">{{ template.examples.slice(0, 2).join('、') }}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
        
        <!-- 创建计划弹窗 -->
        <teleport to="body">
            <div class="modal-overlay" :class="{ show: showAddPlan }" @click.self="closeAddPlan">
                <div class="modal-dialog">
                    <div class="modal-header">
                        <h3>{{ selectedTemplate?.name ? selectedTemplate.name + '计划' : '创建计划' }}</h3>
                        <button class="close-btn" @click="closeAddPlan">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <!-- AI 智能生成 -->
                        <div class="ai-generate-section" v-if="!aiSuggestion">
                            <div class="ai-input-group">
                                <input 
                                    type="text" 
                                    v-model="aiGoal"
                                    placeholder="描述你的目标，AI帮你生成计划..."
                                    class="ai-input"
                                    @keyup.enter="generateAIPlan"
                                >
                                <button 
                                    class="ai-generate-btn" 
                                    @click="generateAIPlan"
                                    :disabled="!aiGoal || generatingAI"
                                >
                                    <span v-if="generatingAI">思考中...</span>
                                    <span v-else>🤖 AI生成</span>
                                </button>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>计划标题 *</label>
                            <input type="text" v-model="newPlan.title" placeholder="给你的计划起个名字" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label>目标描述</label>
                            <input type="text" v-model="newPlan.target" placeholder="你想达成什么目标？" class="form-input">
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group checkbox-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" v-model="newPlan.hasValue"> 
                                    <span>记录数值</span>
                                </label>
                            </div>
                            <div class="form-group" v-if="newPlan.hasValue" style="flex: 1;">
                                <label>单位（如：kg、元、页）</label>
                                <input type="text" v-model="newPlan.unit" placeholder="kg" class="form-input">
                            </div>
                        </div>
                        
                        <div class="form-row" v-if="newPlan.hasValue">
                            <div class="form-group half">
                                <label>起始值</label>
                                <input type="number" step="0.1" v-model="newPlan.initialValue" class="form-input">
                            </div>
                            <div class="form-group half">
                                <label>目标值</label>
                                <input type="number" step="0.1" v-model="newPlan.targetValue" class="form-input">
                            </div>
                        </div>
                        
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" v-model="newPlan.hasDuration"> 
                                <span>记录时长（分钟）</span>
                            </label>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group half">
                                <label>开始日期 *</label>
                                <input type="date" v-model="newPlan.startDate" class="form-input">
                            </div>
                            <div class="form-group half">
                                <label>结束日期（可选）</label>
                                <input type="date" v-model="newPlan.endDate" class="form-input">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label>选择颜色</label>
                            <div class="color-picker">
                                <button 
                                    v-for="color in presetColors" 
                                    :key="color"
                                    class="color-option"
                                    :style="{ background: color }"
                                    :class="{ active: newPlan.color === color }"
                                    @click="newPlan.color = color"
                                ></button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" @click="closeAddPlan">取消</button>
                        <button class="btn-primary" @click="createPlan" :disabled="!canCreatePlan || creating">
                            {{ creating ? '创建中...' : '创建计划' }}
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
        
        <!-- 打卡弹窗 -->
        <teleport to="body">
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
                        
                        <!-- 数值记录 -->
                        <div class="form-group" v-if="checkInPlan?.hasValue">
                            <label>
                                今日数值
                                <span v-if="checkInPlan?.unit">({{ checkInPlan.unit }})</span>
                            </label>
                            <input 
                                type="number" 
                                step="0.1"
                                v-model.number="checkInData.value"
                                :placeholder="'输入今日' + (checkInPlan?.unit || '数值')"
                                class="form-input"
                            >
                        </div>
                        
                        <!-- 时长记录 -->
                        <div class="form-group" v-if="checkInPlan?.hasDuration">
                            <label>时长（分钟）</label>
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
                        
                        <div class="form-group">
                            <label>活动内容（可选）</label>
                            <input 
                                type="text" 
                                v-model="checkInData.activity"
                                placeholder="今天做了什么？"
                                class="form-input"
                            >
                        </div>
                        
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
                        <button class="btn-primary" @click="submitCheckIn" :disabled="checkingIn">
                            {{ checkingIn ? '打卡中...' : '确认打卡' }}
                        </button>
                    </div>
                </div>
            </div>
        </teleport>
        
        <!-- 计划详情弹窗 -->
        <teleport to="body">
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
                        <!-- AI 智能调整建议 -->
                        <div class="ai-adjustment-section" v-if="selectedPlanAIAdjustment || loadingAI">
                            <div class="ai-adjustment-header">
                                <span class="ai-icon">🤖</span>
                                <span>AI 智能调整建议</span>
                            </div>
                            <div class="ai-adjustment-content" v-if="loadingAI">
                                <div class="ai-loading">分析中...</div>
                            </div>
                            <div class="ai-adjustment-content" v-else>
                                <div class="ai-suggestion-text">{{ selectedPlanAIAdjustment?.suggestion }}</div>
                                <div class="ai-adjust-actions" v-if="selectedPlanAIAdjustment?.adjustments?.length > 0">
                                    <div class="ai-adjust-title">建议调整：</div>
                                    <div 
                                        v-for="(adj, idx) in selectedPlanAIAdjustment.adjustments" 
                                        :key="idx"
                                        class="ai-adjust-item"
                                    >
                                        <span class="ai-adjust-field">{{ adj.field }}</span>
                                        <span class="ai-adjust-arrow">→</span>
                                        <span class="ai-adjust-value">{{ adj.value }}</span>
                                        <button class="ai-apply-btn" @click="applyAIAdjustment(adj)">应用</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="detail-info" v-if="selectedPlan">
                            <div class="detail-item">
                                <span class="detail-label">状态</span>
                                <span class="detail-value" :class="selectedPlan.status">{{ planStatusText(selectedPlan.status) }}</span>
                            </div>
                            <div class="detail-item" v-if="selectedPlan.target">
                                <span class="detail-label">目标</span>
                                <span class="detail-value">{{ selectedPlan.target }}</span>
                            </div>
                            <div class="detail-item" v-if="selectedPlan.unit">
                                <span class="detail-label">单位</span>
                                <span class="detail-value">{{ selectedPlan.unit }}</span>
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
                                        <div v-if="record.value !== null && record.value !== undefined">
                                            <span class="history-badge">{{ record.value }}{{ selectedPlan?.unit }}</span>
                                        </div>
                                        <div v-if="record.duration">
                                            <span class="history-badge">{{ record.duration }}分钟</span>
                                        </div>
                                        <div v-if="record.activity">{{ record.activity }}</div>
                                        <div v-if="record.content" class="history-note">{{ record.content }}</div>
                                    </div>
                                    <div class="history-mood">{{ moodEmoji(record.mood) }}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-danger" @click="confirmDeletePlan(selectedPlan)" v-if="selectedPlan?.userId === currentUserId">删除</button>
                        <button class="btn-secondary" @click="togglePlanStatus" v-if="selectedPlan?.status !== 'completed'">
                            {{ selectedPlan?.status === 'active' ? '暂停' : '继续' }}
                        </button>
                        <button class="btn-primary" @click="openCheckIn(selectedPlan); closePlanDetail()">打卡</button>
                    </div>
                </div>
            </div>
        </teleport>
        
        <!-- AI 智能调整助手弹窗 -->
        <teleport to="body">
            <div class="modal-overlay" :class="{ show: showAIAdvisor }" @click.self="showAIAdvisor = false">
                <div class="modal-dialog ai-advisor-dialog">
                    <div class="modal-header">
                        <h3>🤖 AI 计划调整助手</h3>
                        <button class="close-btn" @click="showAIAdvisor = false">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body ai-advisor-body">
                        <div class="ai-advisor-intro">
                            <p>AI 助手会根据你的打卡数据，智能分析并给出调整建议：</p>
                            <ul>
                                <li>📊 进度落后时调整目标</li>
                                <li>⚡ 根据精力推荐强度</li>
                                <li>🎯 优化计划达成率</li>
                                <li>💡 个性化改进建议</li>
                            </ul>
                        </div>
                        
                        <div class="ai-plans-list" v-if="plans.length > 0">
                            <div class="ai-plans-title">选择要分析的计划：</div>
                            <div 
                                v-for="plan in plans" 
                                :key="plan._id"
                                class="ai-plan-item"
                                @click="analyzePlanWithAI(plan)"
                            >
                                <div class="ai-plan-icon" :style="{ background: plan.color }">{{ plan.icon }}</div>
                                <div class="ai-plan-info">
                                    <div class="ai-plan-title">{{ plan.title }}</div>
                                    <div class="ai-plan-meta">{{ plan.stats?.myCheckIns || 0 }} 次打卡</div>
                                </div>
                                <button class="ai-analyze-btn">分析</button>
                            </div>
                        </div>
                        
                        <div v-else class="ai-empty">
                            还没有计划，先创建一个吧！
                        </div>
                    </div>
                </div>
            </div>
        </teleport>
        
        <!-- AI 调整计划弹窗 -->
        <teleport to="body">
            <div class="modal-overlay" :class="{ show: showAIAdjustment }" @click.self="closeAIAdjustment">
                <div class="modal-dialog ai-adjustment-dialog">
                    <div class="modal-header">
                        <h3>🤖 AI 调整建议 - {{ adjustingPlan?.title }}</h3>
                        <button class="close-btn" @click="closeAIAdjustment">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div v-if="loadingAI" class="ai-loading-section">
                            <div class="ai-loading-spinner">🤖</div>
                            <div class="ai-loading-text">AI正在分析你的打卡数据...</div>
                            <div class="ai-loading-sub">可能需要几秒钟</div>
                        </div>
                        
                        <div v-else-if="aiAdjustmentResult" class="ai-result-section">
                            <div class="ai-analysis-card">
                                <div class="ai-analysis-title">📊 数据分析</div>
                                <div class="ai-analysis-content">{{ aiAdjustmentResult.analysis }}</div>
                            </div>
                            
                            <div class="ai-suggestion-card">
                                <div class="ai-suggestion-title">💡 调整建议</div>
                                <div class="ai-suggestion-content">{{ aiAdjustmentResult.suggestion }}</div>
                            </div>
                            
                            <div class="ai-adjustments-list" v-if="aiAdjustmentResult.adjustments?.length > 0">
                                <div class="ai-adjustments-title">🎯 一键调整</div>
                                <div 
                                    v-for="(adj, idx) in aiAdjustmentResult.adjustments" 
                                    :key="idx"
                                    class="ai-adjustment-item"
                                >
                                    <div class="ai-adjustment-info">
                                        <span class="ai-field">{{ adj.field }}</span>
                                        <span class="ai-arrow">→</span>
                                        <span class="ai-new-value" :style="{ color: adj.urgent ? '#F44336' : '#4CAF50' }">{{ adj.value }}</span>
                                    </div>
                                    <button class="ai-apply-single-btn" @click="applyAIAdjustment(adj)">应用</button>
                                </div>
                                <button class="ai-apply-all-btn" @click="applyAllAdjustments">应用所有调整</button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn-secondary" @click="closeAIAdjustment">关闭</button>
                        <button class="btn-primary" @click="askAICustomQuestion">向AI提问</button>
                    </div>
                </div>
            </div>
        </teleport>
        
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
        <teleport to="body">
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
        </teleport>
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
        const templates = ref([])
        const stats = ref(null)
        const todayStatus = ref(null)
        const currentUserId = ref('')
        
        const showTemplateSelector = ref(false)
        const showAddPlan = ref(false)
        const showCheckIn = ref(false)
        const showPlanDetail = ref(false)
        const showAIAdvisor = ref(false)
        const showAIAdjustment = ref(false)
        
        const selectedTemplate = ref(null)
        const checkInPlan = ref(null)
        const selectedPlan = ref(null)
        const adjustingPlan = ref(null)
        const selectedPlanCheckIns = ref([])
        const selectedPlanAIAdjustment = ref(null)
        const aiAdjustmentResult = ref(null)
        
        const creating = ref(false)
        const checkingIn = ref(false)
        const generatingAI = ref(false)
        const loadingAI = ref(false)
        
        const aiGoal = ref('')
        const aiSuggestion = ref(null)
        
        const presetColors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#FF5722', '#607D8B', '#E91E63', '#3F51B5']
        
        const moods = [
            { key: 'great', name: '超棒', emoji: '🤩' },
            { key: 'good', name: '不错', emoji: '😊' },
            { key: 'normal', name: '一般', emoji: '😐' },
            { key: 'tired', name: '疲惫', emoji: '😴' },
            { key: 'bad', name: '不好', emoji: '😔' }
        ]
        
        const newPlan = ref({
            type: 'custom',
            title: '',
            target: '',
            unit: '',
            initialValue: null,
            targetValue: null,
            hasValue: false,
            hasDuration: false,
            startDate: new Date().toISOString().split('T')[0],
            endDate: '',
            color: '#4CAF50',
            icon: '📝'
        })
        
        const checkInData = ref({
            value: null,
            duration: null,
            activity: '',
            content: '',
            mood: 'good'
        })
        
        const toast = ref({ show: false, message: '', type: 'info' })
        const confirm = ref({ show: false, title: '', message: '', confirmText: '确认', cancelText: '取消', action: null })
        
        const getToken = () => localStorage.getItem('token')
        
        const canCreatePlan = computed(() => newPlan.value.title && newPlan.value.startDate)
        
        const showToast = (message, type = 'info') => {
            toast.value = { show: true, message, type }
            setTimeout(() => toast.value.show = false, 2500)
        }
        
        const fetchTemplates = async () => {
            try {
                const res = await fetch(CONFIG.API_URL + '/plans/templates', {
                    headers: { 'Authorization': 'Bearer ' + getToken() }
                })
                const data = await res.json()
                if (data.success) {
                    templates.value = data.data
                }
            } catch (e) {
                console.error('获取模板失败:', e)
                // 使用默认模板
                templates.value = [
                    { key: 'study', name: '学习提升', icon: '📚', color: '#2196F3', examples: ['考研复习', '英语单词'], hasValue: true, hasDuration: true, unit: '分钟' },
                    { key: 'health', name: '健康管理', icon: '❤️', color: '#FF5722', examples: ['减重计划', '早起打卡'], hasValue: true, hasDuration: false, unit: 'kg' },
                    { key: 'fitness', name: '运动健身', icon: '💪', color: '#4CAF50', examples: ['跑步', '力量训练'], hasValue: false, hasDuration: true, unit: '分钟' },
                    { key: 'hobby', name: '兴趣养成', icon: '🎨', color: '#9C27B0', examples: ['练琴', '绘画'], hasValue: false, hasDuration: true, unit: '分钟' },
                    { key: 'save', name: '存钱理财', icon: '💰', color: '#FF9800', examples: ['365天存钱', '月度预算'], hasValue: true, hasDuration: false, unit: '元' },
                    { key: 'custom', name: '自定义', icon: '📝', color: '#607D8B', examples: ['任何你想坚持的事'], hasValue: true, hasDuration: true, unit: '' }
                ]
            }
        }
        
        const fetchData = async () => {
            loading.value = true
            try {
                await Promise.all([
                    fetchTemplates(),
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
        
        const openTemplateSelector = () => {
            showTemplateSelector.value = true
        }
        
        const selectTemplate = (template) => {
            selectedTemplate.value = template
            newPlan.value = {
                type: template.key,
                title: '',
                target: '',
                unit: template.unit || '',
                initialValue: null,
                targetValue: null,
                hasValue: template.hasValue,
                hasDuration: template.hasDuration,
                startDate: new Date().toISOString().split('T')[0],
                endDate: '',
                color: template.color,
                icon: template.icon
            }
            aiGoal.value = ''
            aiSuggestion.value = null
            showTemplateSelector.value = false
            showAddPlan.value = true
        }
        
        const generateAIPlan = async () => {
            if (!aiGoal.value) return
            generatingAI.value = true
            try {
                const res = await fetch(CONFIG.API_URL + '/plans/ai-suggest', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ 
                        goal: aiGoal.value, 
                        category: selectedTemplate.value?.name 
                    })
                })
                const data = await res.json()
                if (data.success) {
                    aiSuggestion.value = data.data
                    newPlan.value.title = data.data.title
                    newPlan.value.target = data.data.target
                    newPlan.value.unit = data.data.unit
                    newPlan.value.hasValue = data.data.hasValue
                    newPlan.value.hasDuration = data.data.hasDuration
                    newPlan.value.color = data.data.color
                    newPlan.value.icon = data.data.icon
                    showToast('AI已生成计划建议', 'success')
                }
            } catch (e) {
                showToast('AI生成失败，请手动填写', 'error')
            }
            generatingAI.value = false
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
                            value: checkInData.value.value,
                            duration: checkInData.value.duration,
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
        
        const openAIAdjustment = async (plan) => {
            adjustingPlan.value = plan
            showAIAdjustment.value = true
            loadingAI.value = true
            aiAdjustmentResult.value = null
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/plans/${plan._id}/ai-adjustment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    }
                })
                const data = await res.json()
                if (data.success) {
                    aiAdjustmentResult.value = data.data
                    // 更新计划上的AI建议
                    plan.aiAdjustment = data.data.suggestion
                }
            } catch (e) {
                showToast('AI分析失败', 'error')
            }
            loadingAI.value = false
        }
        
        const closeAIAdjustment = () => {
            showAIAdjustment.value = false
            adjustingPlan.value = null
            aiAdjustmentResult.value = null
        }
        
        const applyAIAdjustment = async (adjustment) => {
            const plan = adjustingPlan.value || selectedPlan.value
            if (!plan) return
            
            const updateData = {}
            if (adjustment.field === '目标值') updateData.targetValue = parseFloat(adjustment.value)
            if (adjustment.field === '每日时长') updateData.duration = parseInt(adjustment.value)
            if (adjustment.field === '计划状态') updateData.status = adjustment.value
            if (adjustment.field === '提醒时间') updateData.reminderTime = adjustment.value
            
            try {
                const res = await fetch(`${CONFIG.API_URL}/plans/${plan._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify(updateData)
                })
                const data = await res.json()
                if (data.success) {
                    showToast('已应用AI调整', 'success')
                    Object.assign(plan, updateData)
                    fetchPlans()
                }
            } catch (e) {
                showToast('应用失败', 'error')
            }
        }
        
        const applyAllAdjustments = async () => {
            if (!aiAdjustmentResult.value?.adjustments) return
            for (const adj of aiAdjustmentResult.value.adjustments) {
                await applyAIAdjustment(adj)
            }
            showToast('已应用所有调整', 'success')
        }
        
        const analyzePlanWithAI = async (plan) => {
            await openAIAdjustment(plan)
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
        
        const closeTemplateSelector = () => {
            showTemplateSelector.value = false
        }
        
        const closeAddPlan = () => {
            showAddPlan.value = false
            selectedTemplate.value = null
            aiGoal.value = ''
            aiSuggestion.value = null
        }
        
        const openCheckIn = (plan) => {
            if (!plan) return
            checkInPlan.value = plan
            checkInData.value = {
                value: null,
                duration: null,
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
            selectedPlanAIAdjustment.value = null
            fetchPlanCheckIns(plan._id)
            showPlanDetail.value = true
        }
        
        const closePlanDetail = () => {
            showPlanDetail.value = false
            selectedPlan.value = null
            selectedPlanCheckIns.value = []
            selectedPlanAIAdjustment.value = null
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
        
        const planStatusText = (status) => {
            const map = { active: '进行中', paused: '已暂停', completed: '已完成' }
            return map[status] || status
        }
        
        const moodEmoji = (mood) => {
            const map = { great: '🤩', good: '😊', normal: '😐', tired: '😴', bad: '😔' }
            return map[mood] || '😊'
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
            templates,
            stats,
            todayStatus,
            currentUserId,
            showTemplateSelector,
            showAddPlan,
            showCheckIn,
            showPlanDetail,
            showAIAdvisor,
            showAIAdjustment,
            selectedTemplate,
            checkInPlan,
            selectedPlan,
            adjustingPlan,
            selectedPlanCheckIns,
            selectedPlanAIAdjustment,
            aiAdjustmentResult,
            newPlan,
            checkInData,
            creating,
            checkingIn,
            generatingAI,
            loadingAI,
            aiGoal,
            aiSuggestion,
            presetColors,
            moods,
            canCreatePlan,
            toast,
            confirm,
            openTemplateSelector,
            selectTemplate,
            generateAIPlan,
            createPlan,
            submitCheckIn,
            openAIAdjustment,
            closeAIAdjustment,
            applyAIAdjustment,
            applyAllAdjustments,
            analyzePlanWithAI,
            togglePlanStatus,
            deletePlan,
            closeTemplateSelector,
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
            planStatusText,
            moodEmoji,
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
    background: var(--bg-primary);
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
    color: var(--text-primary);
}

.ai-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
}

.ai-btn:hover {
    opacity: 0.9;
    color: white;
}

/* 主内容 */
.main {
    max-width: 480px;
    margin: 0 auto;
    padding: 16px;
}

/* 统计区域 */
.stats-section {
    margin-bottom: 16px;
}

.stats-card {
    display: flex;
    justify-content: space-around;
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.5) 0%, rgba(219, 237, 156, 0.3) 100%);
    border: 1px solid rgba(255, 107, 107, 0.2);
    border-radius: var(--radius-xl);
    padding: 16px;
}

.stats-item {
    text-align: center;
}

.stats-value {
    font-size: 24px;
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

.today-count {
    margin-left: auto;
    font-size: 13px;
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.1);
    padding: 2px 8px;
    border-radius: 12px;
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

.today-icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
}

/* 计划列表 */
.plans-section {
    min-height: 300px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.add-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 14px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
}

.empty-btn {
    padding: 12px 32px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 16px;
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

.plan-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    cursor: pointer;
}

.plan-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
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

.plan-desc, .plan-meta {
    font-size: 12px;
    color: var(--text-secondary);
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

.plan-stats {
    display: flex;
    gap: 16px;
    margin-bottom: 12px;
    padding: 10px 12px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
    cursor: pointer;
}

.stat-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-primary);
}

.stat-label {
    font-size: 11px;
    color: var(--text-tertiary);
}

/* AI 建议卡片 */
.ai-suggestion {
    padding: 12px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    cursor: pointer;
}

.ai-suggestion-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 4px;
}

.ai-suggestion-content {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

.action-btn.checkin {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.action-btn.adjust {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    border-color: rgba(102, 126, 234, 0.3);
    color: #667eea;
}

/* ========== 模态框 - 居中显示 ========== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    padding: 20px;
}

.modal-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.modal-dialog {
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    width: 100%;
    max-width: 420px;
    max-height: 85vh;
    overflow-y: auto;
    transform: scale(0.9);
    opacity: 0;
    transition: all 0.3s ease;
}

.modal-overlay.show .modal-dialog {
    transform: scale(1);
    opacity: 1;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
    font-size: 17px;
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
    padding: 16px 20px;
}

.modal-footer {
    display: flex;
    gap: 12px;
    padding: 12px 20px 20px;
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

.btn-secondary {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.btn-danger {
    background: #EF4444;
    color: white;
}

/* 模板选择 */
.template-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.template-card {
    padding: 20px 12px;
    background: var(--bg-input);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    text-align: center;
    cursor: pointer;
    transition: all 0.3s ease;
}

.template-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
}

.template-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    margin: 0 auto 10px;
}

.template-name {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 4px;
}

.template-examples {
    font-size: 11px;
    color: var(--text-tertiary);
}

/* AI 生成区域 */
.ai-generate-section {
    margin-bottom: 16px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-radius: var(--radius-lg);
}

.ai-input-group {
    display: flex;
    gap: 8px;
}

.ai-input {
    flex: 1;
    padding: 12px 14px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 14px;
    background: white;
}

.ai-generate-btn {
    padding: 12px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
}

/* 表单 */
.form-group {
    margin-bottom: 14px;
}

.form-group label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 6px;
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
    padding: 12px 14px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    font-size: 15px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
}

.checkbox-group {
    display: flex;
    align-items: center;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.color-option {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
}

.color-option.active {
    border-color: var(--text-primary);
    transform: scale(1.1);
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

.mood-selector {
    display: flex;
    gap: 6px;
}

.mood-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 10px 4px;
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
    font-size: 18px;
}

.mood-name {
    font-size: 10px;
    color: var(--text-secondary);
}

/* 详情弹窗 AI 调整 */
.ai-adjustment-section {
    margin-bottom: 16px;
    padding: 16px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border-radius: var(--radius-lg);
}

.ai-adjustment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 10px;
}

.ai-adjustment-content {
    font-size: 13px;
    line-height: 1.6;
    color: var(--text-secondary);
}

.ai-adjust-actions {
    margin-top: 12px;
}

.ai-adjust-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.ai-adjust-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border-radius: var(--radius-md);
    margin-bottom: 8px;
}

.ai-adjust-field {
    font-weight: 500;
}

.ai-adjust-arrow {
    color: var(--text-tertiary);
}

.ai-adjust-value {
    flex: 1;
    font-weight: 600;
}

.ai-apply-btn {
    padding: 6px 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 12px;
    cursor: pointer;
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

/* 历史记录 */
.checkin-history {
    margin-top: 20px;
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
    max-height: 250px;
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

.history-badge {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(233, 30, 99, 0.1);
    color: var(--color-primary);
    border-radius: 12px;
    font-size: 12px;
    margin-right: 6px;
}

/* AI 助手弹窗 */
.ai-advisor-dialog, .ai-adjustment-dialog {
    max-width: 440px;
}

.ai-advisor-body {
    max-height: 60vh;
    overflow-y: auto;
}

.ai-advisor-intro {
    padding: 12px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.6;
}

.ai-advisor-intro ul {
    margin-top: 8px;
    padding-left: 20px;
}

.ai-advisor-intro li {
    margin-bottom: 4px;
}

.ai-plans-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ai-plans-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.ai-plan-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--bg-input);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
}

.ai-plan-item:hover {
    background: var(--bg-card-hover);
}

.ai-plan-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
}

.ai-plan-info {
    flex: 1;
}

.ai-plan-title {
    font-size: 14px;
    font-weight: 600;
}

.ai-plan-meta {
    font-size: 12px;
    color: var(--text-secondary);
}

.ai-analyze-btn {
    padding: 6px 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 12px;
    cursor: pointer;
}

/* AI 调整弹窗 */
.ai-loading-section {
    text-align: center;
    padding: 40px 20px;
}

.ai-loading-spinner {
    font-size: 48px;
    animation: bounce 1s infinite;
    margin-bottom: 16px;
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.ai-loading-text {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
}

.ai-loading-sub {
    font-size: 13px;
    color: var(--text-tertiary);
}

.ai-result-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.ai-analysis-card, .ai-suggestion-card {
    padding: 16px;
    border-radius: var(--radius-lg);
}

.ai-analysis-card {
    background: var(--bg-input);
}

.ai-suggestion-card {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
    border: 1px solid rgba(102, 126, 234, 0.2);
}

.ai-analysis-title, .ai-suggestion-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 8px;
}

.ai-analysis-content, .ai-suggestion-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
}

.ai-adjustments-list {
    padding: 16px;
    background: white;
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-color);
}

.ai-adjustments-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
}

.ai-adjustment-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid var(--border-color);
}

.ai-adjustment-item:last-child {
    border-bottom: none;
}

.ai-field {
    font-size: 13px;
    color: var(--text-secondary);
}

.ai-arrow {
    color: var(--text-tertiary);
}

.ai-new-value {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
}

.ai-apply-single-btn {
    padding: 6px 12px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 12px;
    cursor: pointer;
}

.ai-apply-all-btn {
    width: 100%;
    margin-top: 12px;
    padding: 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
}

/* Toast */
.toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(-30px);
    background: rgba(255, 255, 255, 0.98);
    border: 1px solid var(--border-color);
    padding: 14px 24px;
    border-radius: var(--radius-lg);
    font-size: 14px;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.3s ease, transform 0.3s ease;
    z-index: 9999;
}

.toast.show {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
}

.toast.success {
    border-color: rgba(76, 175, 80, 0.3);
    background: rgba(76, 175, 80, 0.1);
}

.toast.error {
    border-color: rgba(244, 67, 54, 0.3);
    background: rgba(244, 67, 54, 0.1);
}

/* 确认对话框 */
.confirm-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 500;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s ease;
    padding: 20px;
}

.confirm-overlay.show {
    opacity: 1;
    pointer-events: auto;
}

.confirm-dialog {
    background: var(--bg-card);
    border-radius: var(--radius-xl);
    padding: 24px;
    width: 300px;
    text-align: center;
    transform: scale(0.9);
    transition: transform 0.3s ease;
}

.confirm-overlay.show .confirm-dialog {
    transform: scale(1);
}

.confirm-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
}

.confirm-message {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 20px;
}

.confirm-actions {
    display: flex;
    gap: 12px;
}

.confirm-btn {
    flex: 1;
    padding: 12px;
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
    background: #EF4444;
    color: white;
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
}

.orb-2 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #DBED9C 0%, #FDD3D5 100%);
    bottom: -50px;
    left: -50px;
}
</style>
