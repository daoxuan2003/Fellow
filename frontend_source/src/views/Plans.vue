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
                
                <!-- 新建计划按钮 -->
                <div class="create-plan-section">
                    <button class="create-plan-btn" @click="openTemplateSelector">
                        <div class="create-plan-icon">+</div>
                        <div class="create-plan-text">
                            <div class="create-plan-title">新建坚持计划</div>
                            <div class="create-plan-sub">考研、减肥、健身、存钱...</div>
                        </div>
                        <svg class="create-plan-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 18l6-6-6-6"/>
                        </svg>
                    </button>
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
                            <div class="today-icon completed" :style="{ background: plan.color }">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                            </div>
                            <span class="today-name">{{ plan.title }}</span>
                            <span class="today-action completed">✓ 已完成</span>
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
                                    <div class="plan-title">
                                        {{ plan.title }}
                                        <span class="plan-owner-badge" :class="plan.planType">
                                            {{ plan.stats?.ownerLabel || (plan.planType === 'shared' ? '共同' : '我的') }}
                                        </span>
                                    </div>
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
                                <!-- 个人计划：只显示创建者的打卡 -->
                                <template v-if="plan.planType === 'personal'">
                                    <div class="stat-item">
                                        <span class="stat-value">{{ plan.stats.checkIns }}</span>
                                        <span class="stat-label">{{ plan.stats.isMyPlan ? '我的打卡' : 'TA的打卡' }}</span>
                                    </div>
                                    <div class="stat-item" v-if="plan.stats.streak > 0">
                                        <span class="stat-value">{{ plan.stats.streak }}🔥</span>
                                        <span class="stat-label">连续</span>
                                    </div>
                                </template>
                                <!-- 共同计划：显示双方的打卡 -->
                                <template v-else>
                                    <div class="stat-item">
                                        <span class="stat-value">{{ plan.stats.myCheckIns }}</span>
                                        <span class="stat-label">我的打卡</span>
                                    </div>
                                    <div class="stat-item">
                                        <span class="stat-value">{{ plan.stats.partnerCheckIns }}</span>
                                        <span class="stat-label">TA的打卡</span>
                                    </div>
                                    <div class="stat-item" v-if="plan.stats.myStreak > 0 || plan.stats.partnerStreak > 0">
                                        <span class="stat-value">{{ plan.stats.myStreak + plan.stats.partnerStreak }}🔥</span>
                                        <span class="stat-label">合计连续</span>
                                    </div>
                                </template>
                                <div class="stat-item" v-if="plan.hasValue && plan.stats.latestValue">
                                    <span class="stat-value">{{ plan.stats.latestValue }}{{ plan.unit }}</span>
                                    <span class="stat-label">最新</span>
                                </div>
                            </div>
                            
                            <!-- AI 调整建议 -->
                            <div class="ai-suggestion" v-if="plan.aiAdjustment" @click="toggleAIExpand(plan._id)">
                                <div class="ai-suggestion-header">
                                    <span class="ai-icon">🤖</span>
                                    <span class="ai-title">智能建议</span>
                                    <svg class="ai-expand-icon" :class="{ expanded: expandedAI[plan._id] }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="6 9 12 15 18 9"/>
                                    </svg>
                                </div>
                                <div class="ai-suggestion-content" :class="{ expanded: expandedAI[plan._id] }">{{ plan.aiAdjustment }}</div>
                            </div>
                            
                            <div class="plan-actions">
                                <button 
                                    class="action-btn checkin"
                                    :disabled="plan.status !== 'active' || isCheckedInToday(plan._id) || !canCheckIn(plan)"
                                    @click.stop="openCheckIn(plan)"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="20 6 9 17 4 12"/>
                                    </svg>
                                    {{ getCheckInButtonText(plan) }}
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
                        <div class="template-subtitle">选择一种计划类型开始创建</div>
                        <div class="template-list">
                            <div 
                                v-for="template in templates" 
                                :key="template.key"
                                class="template-item"
                                @click="selectTemplate(template)"
                            >
                                <div class="template-item-icon" :style="{ background: template.color }">
                                    {{ template.icon }}
                                </div>
                                <div class="template-item-info">
                                    <div class="template-item-name">{{ template.name }}</div>
                                    <div class="template-item-desc">{{ template.examples.slice(0, 2).join('、') }}</div>
                                </div>
                                <svg class="template-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"/>
                                </svg>
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
                            <div class="ai-section-label">
                                <span>🤖</span> AI 智能生成
                            </div>
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
                                    <span v-else>生成</span>
                                </button>
                            </div>
                        </div>
                        
                        <!-- AI 生成结果 -->
                        <div class="ai-result-card" v-else>
                            <div class="ai-result-header">
                                <span class="ai-result-icon">🤖</span>
                                <span class="ai-result-title">AI 已为你生成计划</span>
                                <button class="ai-reset-btn" @click="aiSuggestion = null; aiGoal = ''">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                    </svg>
                                </button>
                            </div>
                            <div class="ai-result-content">
                                <div class="ai-result-item">
                                    <span class="ai-result-label">标题：</span>
                                    <span class="ai-result-value">{{ aiSuggestion.title }}</span>
                                </div>
                                <div class="ai-result-item" v-if="aiSuggestion.target">
                                    <span class="ai-result-label">目标：</span>
                                    <span class="ai-result-value">{{ aiSuggestion.target }}</span>
                                </div>
                                <div class="ai-result-item" v-if="aiSuggestion.targetValue !== undefined && aiSuggestion.targetValue !== null">
                                    <span class="ai-result-label">目标值：</span>
                                    <span class="ai-result-value">{{ aiSuggestion.targetValue }}{{ aiSuggestion.unit }}</span>
                                </div>
                                <div class="ai-result-tags">
                                    <span class="ai-tag" v-if="aiSuggestion.hasValue">📊 记录数值</span>
                                    <span class="ai-tag" v-if="aiSuggestion.hasDuration">⏱️ 记录时长</span>
                                    <span class="ai-tag" v-if="aiSuggestion.unit">📏 单位：{{ aiSuggestion.unit }}</span>
                                </div>
                            </div>
                            <div class="ai-result-hint">
                                ✓ 表单已自动填充，可直接修改后创建
                            </div>
                        </div>
                        
                        <!-- 基本信息 -->
                        <div class="form-section">
                            <div class="form-section-title">基本信息</div>
                            
                            <!-- 计划类型选择 -->
                            <div class="form-group">
                                <label class="form-label">计划类型</label>
                                <div class="plan-type-selector">
                                    <button 
                                        class="plan-type-btn"
                                        :class="{ active: newPlan.planType === 'personal' }"
                                        @click="newPlan.planType = 'personal'"
                                    >
                                        <span class="plan-type-icon">👤</span>
                                        <span class="plan-type-name">个人计划</span>
                                        <span class="plan-type-desc">只有我能打卡</span>
                                    </button>
                                    <button 
                                        class="plan-type-btn"
                                        :class="{ active: newPlan.planType === 'shared' }"
                                        @click="newPlan.planType = 'shared'"
                                    >
                                        <span class="plan-type-icon">👥</span>
                                        <span class="plan-type-name">共同计划</span>
                                        <span class="plan-type-desc">双方都能打卡</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">计划标题 <span class="required">*</span></label>
                                <div class="input-wrapper">
                                    <input type="text" v-model="newPlan.title" placeholder="例如：每天阅读30分钟" class="form-input">
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label">目标描述</label>
                                <div class="input-wrapper">
                                    <input type="text" v-model="newPlan.target" placeholder="你想达成什么目标？" class="form-input">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 记录设置 -->
                        <div class="form-section">
                            <div class="form-section-title">记录设置</div>
                            
                            <!-- 数值记录开关 -->
                            <div class="toggle-row" @click="newPlan.hasValue = !newPlan.hasValue">
                                <div class="toggle-info">
                                    <div class="toggle-label">记录数值</div>
                                    <div class="toggle-desc">如体重、金额、页数等</div>
                                </div>
                                <div class="toggle-switch" :class="{ active: newPlan.hasValue }">
                                    <div class="toggle-knob"></div>
                                </div>
                            </div>
                            
                            <!-- 数值设置 -->
                            <div v-if="newPlan.hasValue" class="value-settings">
                                <div class="form-group">
                                    <label class="form-label">
                                        计量单位
                                        <span v-if="selectedTemplate?.unitOptions" class="unit-hint">
                                            推荐：{{ selectedTemplate.unitOptions.join('、') }}
                                        </span>
                                    </label>
                                    <div class="unit-options">
                                        <button 
                                            v-for="unit in (selectedTemplate?.unitOptions || ['次', '个', '分钟'])"
                                            :key="unit"
                                            class="unit-btn"
                                            :class="{ active: newPlan.unit === unit && !isCustomUnit }"
                                            @click="selectUnit(unit)"
                                        >
                                            {{ unit }}
                                        </button>
                                    </div>
                                    <div class="custom-unit-row">
                                        <button 
                                            class="unit-btn custom-toggle"
                                            :class="{ active: isCustomUnit }"
                                            @click="toggleCustomUnit"
                                        >
                                            ✏️ 自定义
                                        </button>
                                        <input 
                                            v-if="isCustomUnit"
                                            type="text" 
                                            v-model="newPlan.unit" 
                                            placeholder="输入单位，如：毫升、公里" 
                                            class="unit-input"
                                            ref="customUnitInput"
                                        >
                                    </div>
                                </div>
                                
                                <div class="form-row">
                                    <div class="form-group half">
                                        <label class="form-label">起始值</label>
                                        <input type="number" step="0.1" v-model="newPlan.initialValue" placeholder="0" class="form-input">
                                    </div>
                                    <div class="form-group half">
                                        <label class="form-label">目标值</label>
                                        <input type="number" step="0.1" v-model="newPlan.targetValue" placeholder="目标" class="form-input">
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 时长记录开关 -->
                            <div class="toggle-row" @click="newPlan.hasDuration = !newPlan.hasDuration">
                                <div class="toggle-info">
                                    <div class="toggle-label">记录时长</div>
                                    <div class="toggle-desc">打卡时记录持续的时间</div>
                                </div>
                                <div class="toggle-switch" :class="{ active: newPlan.hasDuration }">
                                    <div class="toggle-knob"></div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 时间设置 -->
                        <div class="form-section">
                            <div class="form-section-title">时间设置</div>
                            
                            <div class="form-row">
                                <div class="form-group half">
                                    <label class="form-label">开始日期 <span class="required">*</span></label>
                                    <input type="date" v-model="newPlan.startDate" class="form-input">
                                </div>
                                <div class="form-group half">
                                    <label class="form-label">结束日期</label>
                                    <input type="date" v-model="newPlan.endDate" class="form-input">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 外观 -->
                        <div class="form-section">
                            <div class="form-section-title">外观</div>
                            
                            <div class="form-group">
                                <label class="form-label">卡片颜色</label>
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
                            <label class="form-label">
                                今日数值
                                <span v-if="checkInPlan?.unit" style="color: var(--text-secondary); font-weight: normal;">({{ checkInPlan.unit }})</span>
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
                            <label class="form-label">时长（分钟）</label>
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
                            <label class="form-label">活动内容 <span style="color: var(--text-tertiary); font-weight: normal;">(可选)</span></label>
                            <input 
                                type="text" 
                                v-model="checkInData.activity"
                                placeholder="今天做了什么？"
                                class="form-input"
                            >
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">备注 <span style="color: var(--text-tertiary); font-weight: normal;">(可选)</span></label>
                            <textarea 
                                v-model="checkInData.content"
                                placeholder="写点什么..."
                                class="form-textarea"
                                rows="2"
                            ></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">今日心情</label>
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
        const expandedAI = ref({})  // 存储展开的AI建议状态
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
            planType: 'personal',  // personal: 个人计划, shared: 共同计划
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
        
        const isCustomUnit = ref(false)
        const customUnitInput = ref(null)
        
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
            isCustomUnit.value = false
            aiGoal.value = ''
            aiSuggestion.value = null
            showTemplateSelector.value = false
            showAddPlan.value = true
        }
        
        const selectUnit = (unit) => {
            newPlan.value.unit = unit
            isCustomUnit.value = false
        }
        
        const toggleCustomUnit = () => {
            isCustomUnit.value = !isCustomUnit.value
            if (isCustomUnit.value) {
                newPlan.value.unit = ''
                setTimeout(() => {
                    customUnitInput.value?.focus()
                }, 100)
            }
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
                    // 填充表单数据
                    newPlan.value.title = data.data.title || ''
                    newPlan.value.target = data.data.target || ''
                    newPlan.value.unit = data.data.unit || ''
                    newPlan.value.hasValue = data.data.hasValue || false
                    newPlan.value.hasDuration = data.data.hasDuration || false
                    newPlan.value.color = data.data.color || '#4CAF50'
                    newPlan.value.icon = data.data.icon || '📝'
                    // AI提取的数值
                    if (data.data.targetValue !== undefined && data.data.targetValue !== null) {
                        newPlan.value.targetValue = data.data.targetValue
                    }
                    if (data.data.initialValue !== undefined && data.data.initialValue !== null) {
                        newPlan.value.initialValue = data.data.initialValue
                    } else {
                        newPlan.value.initialValue = null
                    }
                    showToast('AI已生成计划建议，请查看上方结果', 'success')
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
        
        const askAICustomQuestion = async () => {
            const question = prompt('请输入你想问AI的问题：')
            if (!question) return
            
            loadingAI.value = true
            try {
                const plan = adjustingPlan.value || selectedPlan.value
                const res = await fetch(`${CONFIG.API_URL}/plans/${plan._id}/ai-analysis`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + getToken()
                    },
                    body: JSON.stringify({ question })
                })
                const data = await res.json()
                if (data.success) {
                    aiAdjustmentResult.value = {
                        analysis: data.data.analysis,
                        suggestion: '以上是AI对你问题的回答。',
                        adjustments: []
                    }
                }
            } catch (e) {
                showToast('AI回答失败', 'error')
            }
            loadingAI.value = false
        }
        
        const toggleAIExpand = (planId) => {
            expandedAI.value[planId] = !expandedAI.value[planId]
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
            isCustomUnit.value = false
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
        
        // 判断是否可以打卡
        const canCheckIn = (plan) => {
            // 共同计划：双方都可以打卡
            if (plan.planType === 'shared') return true
            // 个人计划：只有创建者可以打卡
            return plan.stats?.isMyPlan
        }
        
        // 获取打卡按钮文字
        const getCheckInButtonText = (plan) => {
            if (!canCheckIn(plan)) {
                // 使用后端返回的代词，如"他的"、"她的"
                const ownerLabel = plan.stats?.ownerLabel || 'TA的'
                return `仅${ownerLabel.replace('的', '')}可打卡`
            }
            if (isCheckedInToday(plan._id)) return '已打卡'
            return '打卡'
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
            expandedAI,
            toggleAIExpand,
            presetColors,
            moods,
            canCreatePlan,
            isCustomUnit,
            customUnitInput,
            toast,
            confirm,
            openTemplateSelector,
            selectTemplate,
            selectUnit,
            toggleCustomUnit,
            generateAIPlan,
            createPlan,
            submitCheckIn,
            openAIAdjustment,
            closeAIAdjustment,
            applyAIAdjustment,
            applyAllAdjustments,
            analyzePlanWithAI,
            askAICustomQuestion,
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
            isCheckedInToday,
            canCheckIn,
            getCheckInButtonText
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
    padding: 20px 16px;
}

/* 统计区域 */
.stats-section {
    margin-bottom: 20px;
}

.stats-card {
    display: flex;
    justify-content: space-around;
    background: linear-gradient(135deg, rgba(254, 208, 214, 0.6) 0%, rgba(219, 237, 156, 0.4) 100%);
    border: 1px solid rgba(255, 107, 107, 0.15);
    border-radius: 20px;
    padding: 20px 16px;
    box-shadow: 0 4px 16px rgba(233, 30, 99, 0.08);
}

.stats-item {
    text-align: center;
}

.stats-value {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-primary);
    line-height: 1.1;
}

.stats-label {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 6px;
    font-weight: 500;
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

.create-plan-section {
    margin-bottom: 16px;
}

.create-plan-btn {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, var(--color-primary) 0%, #F06292 100%);
    border: none;
    border-radius: 16px;
    color: white;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
    transition: all 0.3s ease;
}

.create-plan-btn:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.2);
}

.create-plan-icon {
    width: 40px;
    height: 40px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: 300;
}

.create-plan-text {
    flex: 1;
    text-align: left;
}

.create-plan-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
}

.create-plan-sub {
    font-size: 13px;
    opacity: 0.9;
}

.create-plan-arrow {
    opacity: 0.8;
}

.today-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.today-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.today-item:active {
    transform: scale(0.98);
}

.today-item.pending {
    border-color: var(--color-primary);
    background: linear-gradient(135deg, rgba(233, 30, 99, 0.08) 0%, rgba(240, 98, 146, 0.05) 100%);
}

.today-item.completed {
    background: #f5f5f5;
    border-color: #e0e0e0;
}

.today-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.today-icon.completed {
    background: #4CAF50 !important;
}

.today-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    flex: 1;
}

.today-action {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.1);
    padding: 4px 10px;
    border-radius: 20px;
}

.today-action.completed {
    color: #4CAF50;
    background: rgba(76, 175, 80, 0.12);
}

/* 计划列表 */
.plans-section {
    min-height: 300px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.add-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 18px;
    background: linear-gradient(135deg, var(--color-primary) 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 3px 10px rgba(233, 30, 99, 0.25);
}

.add-btn:active {
    transform: scale(0.95);
    box-shadow: 0 2px 6px rgba(233, 30, 99, 0.15);
}

.empty-state {
    text-align: center;
    padding: 60px 20px;
}

.empty-icon {
    font-size: 72px;
    margin-bottom: 20px;
    opacity: 0.9;
}

.empty-text {
    font-size: 16px;
    color: var(--text-secondary);
    margin-bottom: 8px;
}

.empty-sub {
    font-size: 13px;
    color: var(--text-tertiary);
}

.empty-btn {
    padding: 14px 36px;
    background: linear-gradient(135deg, var(--color-primary) 0%, #F06292 100%);
    color: white;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    margin-top: 24px;
    box-shadow: 0 4px 14px rgba(233, 30, 99, 0.3);
    transition: all 0.2s ease;
}

.empty-btn:active {
    transform: scale(0.96);
    box-shadow: 0 2px 10px rgba(233, 30, 99, 0.2);
}

.plans-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.plan-card {
    background: var(--bg-card);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 18px;
    transition: all 0.25s ease;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.plan-card:active {
    transform: scale(0.98);
}

.plan-card.completed {
    opacity: 0.85;
    background: #f9f9f9;
}

.plan-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
    cursor: pointer;
}

.plan-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
}

.plan-info {
    flex: 1;
    min-width: 0;
}

.plan-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 2px;
    display: flex;
    align-items: center;
    gap: 8px;
}

.plan-owner-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 500;
}

.plan-owner-badge.personal {
    background: rgba(33, 150, 243, 0.1);
    color: #2196F3;
}

.plan-owner-badge.shared {
    background: rgba(233, 30, 99, 0.1);
    color: var(--color-primary);
}

.plan-desc, .plan-meta {
    font-size: 12px;
    color: var(--text-secondary);
}

.plan-status {
    font-size: 11px;
    padding: 5px 10px;
    border-radius: 20px;
    background: var(--bg-input);
    font-weight: 500;
}

.plan-status.active {
    background: rgba(76, 175, 80, 0.12);
    color: #4CAF50;
}

.plan-status.paused {
    background: rgba(255, 152, 0, 0.12);
    color: #FF9800;
}

.plan-status.completed {
    background: rgba(96, 125, 139, 0.12);
    color: #607D8B;
}

.plan-stats {
    display: flex;
    gap: 20px;
    margin-bottom: 14px;
    padding: 12px 16px;
    background: var(--bg-input);
    border-radius: 14px;
    cursor: pointer;
}

.plan-stats:active {
    background: var(--bg-card-hover);
}

.stat-value {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-primary);
}

.stat-label {
    font-size: 11px;
    color: var(--text-tertiary);
    margin-top: 2px;
}

.stat-item {
    display: flex;
    flex-direction: column;
}

/* AI 建议卡片 */
.ai-suggestion {
    padding: 14px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
    border: 1px solid rgba(102, 126, 234, 0.15);
    border-radius: 14px;
    margin-bottom: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ai-suggestion:active {
    transform: scale(0.98);
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
}

.ai-suggestion-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 6px;
}

.ai-expand-icon {
    margin-left: auto;
    transition: transform 0.3s ease;
}

.ai-expand-icon.expanded {
    transform: rotate(180deg);
}

.ai-suggestion-content {
    font-size: 13px;
    color: var(--text-secondary);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    transition: all 0.3s ease;
}

.ai-suggestion-content.expanded {
    display: block;
    -webkit-line-clamp: unset;
}

.plan-actions {
    display: flex;
    gap: 10px;
}

.action-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.action-btn:active {
    transform: scale(0.96);
}

.action-btn.checkin {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
    border-color: #4CAF50;
    color: white;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    font-weight: 600;
    gap: 6px;
}

.action-btn.adjust {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%);
    border-color: rgba(102, 126, 234, 0.25);
    color: #667eea;
    font-weight: 500;
    gap: 6px;
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
    border-radius: 24px;
    width: 100%;
    max-width: 420px;
    max-height: 90vh;
    overflow-y: auto;
    transform: scale(0.9);
    opacity: 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-overlay.show .modal-dialog {
    transform: scale(1);
    opacity: 1;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid var(--border-color);
    position: sticky;
    top: 0;
    background: var(--bg-card);
    z-index: 10;
}

.modal-header h3 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
}

.close-btn {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--bg-input);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s ease;
}

.close-btn:active {
    background: var(--bg-card-hover);
    transform: scale(0.9);
}

.modal-body {
    padding: 20px 24px;
}

.modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 24px 24px;
    border-top: 1px solid var(--border-color);
    position: sticky;
    bottom: 0;
    background: var(--bg-card);
}

.btn-primary, .btn-secondary, .btn-danger {
    flex: 1;
    padding: 14px;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.btn-primary {
    background: linear-gradient(135deg, var(--color-primary) 0%, #F06292 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.3);
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.btn-primary:active:not(:disabled) {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(233, 30, 99, 0.2);
}

.btn-secondary {
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.btn-secondary:active {
    transform: scale(0.96);
    background: var(--bg-card-hover);
}

.btn-danger {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.btn-danger:active {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

/* 模板选择 */
/* 模板选择弹窗 */
.template-dialog .modal-body {
    padding: 16px 20px 24px;
}

.template-subtitle {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 16px;
    text-align: center;
}

/* 模板选择 - 列表样式 */
.template-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.template-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 16px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.template-item:active {
    transform: scale(0.98);
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.02);
}

.template-item-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);
}

.template-item-info {
    flex: 1;
    min-width: 0;
}

.template-item-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
}

.template-item-desc {
    font-size: 13px;
    color: var(--text-secondary);
}

.template-arrow {
    color: var(--text-tertiary);
    flex-shrink: 0;
}

/* AI 生成区域 */
.ai-generate-section {
    margin-bottom: 24px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.06) 0%, rgba(118, 75, 162, 0.06) 100%);
    border-radius: 18px;
    border: 1.5px solid rgba(102, 126, 234, 0.15);
}

.ai-section-label {
    font-size: 13px;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
}

.ai-input-group {
    display: flex;
    gap: 10px;
}

.ai-input {
    flex: 1;
    padding: 14px 16px;
    border: 1.5px solid var(--border-color);
    border-radius: 12px;
    font-size: 15px;
    background: white;
    outline: none;
    transition: all 0.2s ease;
}

.ai-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}

.ai-generate-btn {
    padding: 14px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.ai-generate-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.ai-generate-btn:active:not(:disabled) {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

/* AI 生成结果卡片 */
.ai-result-card {
    margin-bottom: 24px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(139, 195, 74, 0.08) 100%);
    border-radius: 18px;
    border: 1.5px solid rgba(76, 175, 80, 0.2);
    animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

.ai-result-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
}

.ai-result-icon {
    font-size: 20px;
}

.ai-result-title {
    flex: 1;
    font-size: 15px;
    font-weight: 600;
    color: #4CAF50;
}

.ai-reset-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(76, 175, 80, 0.1);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #4CAF50;
    transition: all 0.2s ease;
}

.ai-reset-btn:active {
    background: rgba(76, 175, 80, 0.2);
    transform: scale(0.9);
}

.ai-result-content {
    background: white;
    border-radius: 12px;
    padding: 14px;
    margin-bottom: 12px;
}

.ai-result-item {
    margin-bottom: 8px;
    font-size: 14px;
}

.ai-result-item:last-child {
    margin-bottom: 0;
}

.ai-result-label {
    color: var(--text-secondary);
}

.ai-result-value {
    font-weight: 600;
    color: var(--text-primary);
}

.ai-result-tags {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--border-color);
}

.ai-tag {
    padding: 4px 10px;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 10px;
    font-size: 12px;
    color: #667eea;
}

.ai-result-hint {
    font-size: 12px;
    color: #4CAF50;
    text-align: center;
    font-weight: 500;
}

/* 表单 */
.form-section {
    margin-bottom: 24px;
}

.form-section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 14px;
    padding-left: 4px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group:last-child {
    margin-bottom: 0;
}

.form-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 8px;
    color: var(--text-primary);
}

.form-label .required {
    color: var(--color-primary);
}

.input-wrapper {
    position: relative;
}

/* 计划类型选择器 */
.plan-type-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.plan-type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 12px;
    background: white;
    border: 2px solid var(--border-color);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.plan-type-btn.active {
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.05);
}

.plan-type-btn:active {
    transform: scale(0.98);
}

.plan-type-icon {
    font-size: 24px;
}

.plan-type-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
}

.plan-type-desc {
    font-size: 11px;
    color: var(--text-secondary);
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
    padding: 14px 16px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 12px;
    font-size: 15px;
    color: var(--text-primary);
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;
    font-family: inherit;
}

.form-textarea {
    resize: vertical;
    min-height: 80px;
}

.form-input:focus, .form-textarea:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px rgba(233, 30, 99, 0.08);
}

.form-input::placeholder, .form-textarea::placeholder {
    color: var(--text-tertiary);
}

/* Toggle 开关 */
.toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 14px;
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.toggle-row:active {
    background: var(--bg-input);
    transform: scale(0.99);
}

.toggle-info {
    flex: 1;
}

.toggle-label {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 3px;
}

.toggle-desc {
    font-size: 12px;
    color: var(--text-secondary);
}

.toggle-switch {
    width: 52px;
    height: 30px;
    background: #e0e0e0;
    border-radius: 15px;
    position: relative;
    transition: all 0.3s ease;
    flex-shrink: 0;
}

.toggle-switch.active {
    background: var(--color-primary);
}

.toggle-knob {
    width: 26px;
    height: 26px;
    background: white;
    border-radius: 50%;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.toggle-switch.active .toggle-knob {
    transform: translateX(22px);
}

/* 数值设置 */
.value-settings {
    padding: 16px;
    background: var(--bg-input);
    border-radius: 14px;
    margin-bottom: 12px;
}

.unit-options {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.unit-btn {
    padding: 8px 16px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 20px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.unit-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.unit-btn:active {
    transform: scale(0.95);
}

.unit-btn.custom-toggle {
    background: linear-gradient(135deg, #f5f5f5 0%, white 100%);
    border-style: dashed;
}

.unit-btn.custom-toggle.active {
    background: var(--color-primary);
    border-style: solid;
    border-color: var(--color-primary);
    color: white;
}

.custom-unit-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
}

.unit-input {
    flex: 1;
    padding: 10px 14px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
}

.unit-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.1);
}

.unit-hint {
    margin-left: 8px;
    font-size: 12px;
    font-weight: normal;
    color: var(--color-primary);
    background: rgba(233, 30, 99, 0.08);
    padding: 2px 8px;
    border-radius: 10px;
}

/* 颜色选择器 */
.color-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.color-option {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.15);
}

.color-option.active {
    border-color: white;
    box-shadow: 0 0 0 3px var(--color-primary), 0 3px 8px rgba(0, 0, 0, 0.2);
    transform: scale(1.15);
}

.color-option:active {
    transform: scale(0.95);
}

/* 打卡弹窗 */
.checkin-date {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 18px;
    background: linear-gradient(135deg, var(--bg-input) 0%, white 100%);
    border: 1.5px solid var(--border-color);
    border-radius: 16px;
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 20px;
    color: var(--color-primary);
}

.duration-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.duration-btn {
    padding: 10px 18px;
    background: var(--bg-input);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
}

.duration-btn:active {
    transform: scale(0.95);
}

.duration-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
    box-shadow: 0 4px 12px rgba(233, 30, 99, 0.25);
}

.duration-input {
    width: 80px;
    padding: 10px 12px;
    background: white;
    border: 1.5px solid var(--border-color);
    border-radius: 12px;
    font-size: 14px;
    text-align: center;
    outline: none;
    transition: all 0.2s ease;
}

.duration-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(233, 30, 99, 0.08);
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
    padding: 12px 6px;
    background: var(--bg-input);
    border: 2px solid transparent;
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.mood-btn:active {
    transform: scale(0.95);
}

.mood-btn.active {
    border-color: var(--color-primary);
    background: rgba(233, 30, 99, 0.06);
}

.mood-emoji {
    font-size: 22px;
}

.mood-name {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 500;
}

/* 详情弹窗 AI 调整 */
.ai-adjustment-section {
    margin-bottom: 18px;
    padding: 18px;
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
    border-radius: 16px;
    border: 1px solid rgba(102, 126, 234, 0.1);
}

.ai-adjustment-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 12px;
}

.ai-adjustment-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
}

.ai-adjust-actions {
    margin-top: 14px;
}

.ai-adjust-title {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--text-primary);
}

.ai-adjust-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    background: white;
    border-radius: 12px;
    margin-bottom: 10px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.ai-adjust-field {
    font-weight: 600;
}

.ai-adjust-arrow {
    color: var(--text-tertiary);
}

.ai-adjust-value {
    flex: 1;
    font-weight: 600;
}

.ai-apply-btn {
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ai-apply-btn:active {
    transform: scale(0.95);
}

.detail-info {
    margin-bottom: 24px;
    background: var(--bg-input);
    border-radius: 16px;
    padding: 16px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid var(--border-color);
}

.detail-item:first-child {
    padding-top: 0;
}

.detail-item:last-child {
    padding-bottom: 0;
    border-bottom: none;
}

.detail-label {
    color: var(--text-secondary);
    font-size: 14px;
}

.detail-value {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
}

/* 历史记录 */
.checkin-history {
    margin-top: 24px;
}

.history-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 14px;
    color: var(--text-primary);
}

.history-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 280px;
    overflow-y: auto;
}

.history-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 14px;
    background: var(--bg-input);
    border-radius: 14px;
    transition: all 0.2s ease;
}

.history-item:active {
    background: var(--bg-card-hover);
}

.history-badge {
    display: inline-block;
    padding: 4px 10px;
    background: rgba(233, 30, 99, 0.1);
    color: var(--color-primary);
    border-radius: 12px;
    font-size: 12px;
    font-weight: 500;
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
    padding: 16px;
    background: var(--bg-input);
    border-radius: 14px;
    margin-bottom: 18px;
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.6;
}

.ai-advisor-intro ul {
    margin-top: 10px;
    padding-left: 20px;
}

.ai-advisor-intro li {
    margin-bottom: 6px;
}

.ai-plans-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.ai-plans-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
    color: var(--text-primary);
}

.ai-plan-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px;
    background: var(--bg-input);
    border-radius: 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ai-plan-item:active {
    background: var(--bg-card-hover);
    transform: scale(0.98);
}

.ai-plan-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.ai-plan-info {
    flex: 1;
}

.ai-plan-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 2px;
}

.ai-plan-meta {
    font-size: 13px;
    color: var(--text-secondary);
}

.ai-analyze-btn {
    padding: 8px 16px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 3px 10px rgba(102, 126, 234, 0.25);
}

.ai-analyze-btn:active {
    transform: scale(0.95);
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
    padding: 18px;
    border-radius: 16px;
}

.ai-analysis-card {
    background: var(--bg-input);
}

.ai-suggestion-card {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
    border: 1px solid rgba(102, 126, 234, 0.15);
}

.ai-analysis-title, .ai-suggestion-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 10px;
}

.ai-analysis-content, .ai-suggestion-content {
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-secondary);
}

.ai-adjustments-list {
    padding: 18px;
    background: white;
    border-radius: 16px;
    border: 1px solid var(--border-color);
}

.ai-adjustments-title {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 14px;
}

.ai-adjustment-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--border-color);
}

.ai-adjustment-item:last-child {
    border-bottom: none;
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
    border-radius: 20px;
    padding: 28px;
    width: 320px;
    text-align: center;
    transform: scale(0.9);
    transition: transform 0.3s ease;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.confirm-overlay.show .confirm-dialog {
    transform: scale(1);
}

.confirm-title {
    font-size: 19px;
    font-weight: 700;
    margin-bottom: 10px;
    color: var(--text-primary);
}

.confirm-message {
    font-size: 15px;
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
    padding: 14px;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
}

.confirm-btn.cancel {
    background: var(--bg-input);
    color: var(--text-secondary);
    border: 1px solid var(--border-color);
    font-weight: 600;
    transition: all 0.2s ease;
}

.confirm-btn.cancel:active {
    background: var(--bg-card-hover);
    transform: scale(0.96);
}

.confirm-btn.confirm {
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    color: white;
    font-weight: 600;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    transition: all 0.2s ease;
}

.confirm-btn.confirm:active {
    transform: scale(0.96);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.confirm-btn.confirm.danger {
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
    width: 70px;
    height: 70px;
    color: var(--color-primary);
    animation: heartbeat 1.5s ease-in-out infinite;
    filter: drop-shadow(0 4px 12px rgba(233, 30, 99, 0.3));
}

@keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    25% { transform: scale(1.05); }
    50% { transform: scale(1.15); }
    75% { transform: scale(1.05); }
}

.loading-text {
    margin-top: 20px;
    font-size: 15px;
    color: var(--text-secondary);
    font-weight: 500;
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
