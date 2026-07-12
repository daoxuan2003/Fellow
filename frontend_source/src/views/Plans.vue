<template>
  <div class="plans-page">
    <div v-if="loading" class="loading-screen">
      <svg class="loading-heart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
      <div class="loading-text">加载中...</div>
    </div>
    <div v-else class="app">
      <header class="header">
        <div class="header-content">
          <button class="icon-btn" @click="goBack">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          </button>
          <span class="header-title">坚持计划</span>
          <div style="width:40px"></div>
        </div>
      </header>
      <main class="main">
        <section class="plan-command-card" :class="planDashboard.focus?.tone || 'rest'">
          <div class="plan-command-main">
            <div>
              <span class="plan-eyebrow">今天的执行节奏</span>
              <h1>{{ planDashboard.headline }}</h1>
              <p>{{ planDashboard.subline }}</p>
              <div v-if="planDashboard.nextAction" class="plan-command-next" :class="planDashboard.nextAction.tone">
                <span>{{ planDashboard.nextAction.title }}</span>
                <strong>{{ planDashboard.nextAction.detail }}</strong>
              </div>
              <div v-if="planDashboard.nextAction?.path?.length" class="plan-closure-path compact" aria-label="今日计划闭环路径">
                <span
                  v-for="step in planDashboard.nextAction.path.slice(0, 4)"
                  :key="step.key"
                  :class="['closure-step', step.status]"
                >
                  <i></i>
                  <b>{{ step.label }}</b>
                  <em>{{ step.detail }}</em>
                </span>
              </div>
            </div>
            <button
              v-if="planDashboard.focus"
              type="button"
              class="plan-command-action"
              @click="openPlanDashboardFocus"
            >
              {{ planDashboard.focus.actionLabel }}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>
          <div class="plan-command-meter">
            <div class="meter-track">
              <div class="meter-fill" :style="{ width: planDashboard.completionRate + '%' }"></div>
            </div>
            <span>{{ planDashboard.completionRate }}%</span>
          </div>
          <div class="plan-command-stats">
            <div>
              <strong>{{ planDashboard.done }}/{{ planDashboard.total }}</strong>
              <span>今日计划</span>
            </div>
            <div>
              <strong>{{ planDashboard.completedUnits }}/{{ planDashboard.totalUnits }}</strong>
              <span>今日完成项</span>
            </div>
            <div>
              <strong>{{ planDashboard.completedGroups }}/{{ planDashboard.totalGroups }}</strong>
              <span>子计划闭环</span>
            </div>
            <div>
              <strong>{{ myMaxStreak }}</strong>
              <span>最长连续</span>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'plans' && planDashboard.activeCards.length > 0" class="today-execution-strip">
          <div class="execution-strip-head">
            <span>今日执行清单</span>
            <strong>{{ planDashboard.pending > 0 ? planDashboard.pending + ' 个未闭环' : '全部闭环' }}</strong>
          </div>
          <div class="execution-card-list">
            <button
              v-for="card in planDashboard.activeCards.slice(0, 4)"
              :key="card.id"
              type="button"
              class="execution-card"
              :class="card.tone"
              @click="openPlanExecutionCard(card)"
            >
              <div class="execution-card-top">
                <span>{{ card.title }}</span>
                <strong>{{ card.completionRate }}%</strong>
              </div>
              <p>{{ card.coachPrompt }}</p>
              <div class="execution-next-step">
                <span>{{ card.feedbackLabel }}</span>
                <strong>{{ card.nextActionDetail }}</strong>
              </div>
              <div v-if="card.closurePath?.length" class="execution-path">
                <span
                  v-for="step in card.closurePath.slice(0, 3)"
                  :key="step.key"
                  :class="['execution-path-step', step.status]"
                >
                  <i></i>
                  <span>
                    <b>{{ step.label }}</b>
                    <small>{{ step.detail }}</small>
                  </span>
                </span>
              </div>
              <div class="execution-progress">
                <div :style="{ width: card.completionRate + '%' }"></div>
              </div>
            </button>
          </div>
        </section>
        <div class="filter-tabs">
          <button v-for="tab in filterTabs" :key="tab.id" @click="filterType = tab.id" :class="['filter-tab', { active: filterType === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="main-tabs">
          <button v-for="tab in mainTabs" :key="tab.id" @click="activeTab = tab.id" :class="['main-tab', { active: activeTab === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="tab-content">
          <div v-if="activeTab === 'plans'" class="plans-list">
            <div v-for="habit in sortedHabits" :key="habit.id || habit._id" 
                 :class="['habit-item', { 
                   complete: getHabitStatus(habit).isTodayComplete,
                   'makeup-complete': getHabitStatus(habit).isMakeUpComplete && !getHabitStatus(habit).isTodayComplete,
                   'on-leave': isOnLeaveToday(habit),
                   'inactive-today': !isHabitActiveToday(habit) && !isOnLeaveToday(habit)
                 }]" 
                 @click="openDetail(habit)">
              <!-- 左侧状态指示 -->
              <div class="item-status">
                <div v-if="isOnLeaveToday(habit)" class="status-icon on-leave" title="今天请假中">休</div>
                <div v-else-if="!isHabitActiveToday(habit)" class="status-icon inactive" title="今天不需要打卡">-</div>
                <div v-else-if="getHabitStatus(habit).isTodayComplete" class="status-icon completed" title="今天已完成" @click.stop="openCheckIn(habit)">✓</div>
                <div v-else-if="getHabitStatus(habit).isMakeUpComplete" class="status-icon makeup" title="今天已补卡" @click.stop="openCheckIn(habit)">✓</div>
                <div v-else-if="canCheckIn(habit)" class="status-icon pending" @click.stop="openCheckIn(habit)"></div>
                <div v-else class="status-icon waiting"></div>
              </div>
              
              <!-- 中间内容 -->
              <div class="item-body">
                <div class="item-header">
                  <h3 class="item-title">{{ habit.title }}</h3>
                  <div class="header-actions">
                    <span class="item-type">{{ participationLabel(habit) }}</span>
                  </div>
                </div>
                
                <div class="item-meta">
                  <span v-if="habit.type === 'subtasks' && habit.subTasks" class="meta-text">{{ getTodaySubPlanCount(habit) }} 组 / {{ getTodaySubTaskCount(habit) }} 项</span>
                  <span v-if="habit.type === 'numeric'" class="meta-text">数值记录</span>
                  <span v-if="getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id, habit) > 0" class="meta-text streak">连续 {{ getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id, habit) }} 天</span>
                </div>

                <!-- 双人进度 -->
                <div v-if="habit.participation === 'both'" class="item-duo-status">
                  <img v-if="currentUser.avatar" :src="currentUser.avatar" class="avatar-mini" :class="{ done: getHabitStatus(habit).selfChecked }" />
                  <div v-else class="avatar-mini" :class="{ done: getHabitStatus(habit).selfChecked }">{{ currentUser.name?.[0] || '我' }}</div>
                  <div class="duo-line" :class="{ complete: getHabitStatus(habit).isComplete }"></div>
                  <img v-if="partner.avatar" :src="partner.avatar" class="avatar-mini" :class="{ done: getHabitStatus(habit).partnerChecked }" />
                  <div v-else class="avatar-mini" :class="{ done: getHabitStatus(habit).partnerChecked }">{{ partner.name?.[0] || 'TA' }}</div>
                </div>
              </div>

              <!-- 右侧箭头 -->
              <div class="item-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
            <div v-if="filteredHabits.length === 0" class="empty-state">
              <div class="empty-icon">空</div>
              <div class="empty-text">暂无此类计划</div>
            </div>
          </div>
          <div v-else-if="activeTab === 'stats'" class="stats-page">
            <div class="stats-overview">
              <div class="stat-card">
                <div class="stat-icon stat-calendar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <div class="stat-number">{{ monthlyCheckInDays }}</div>
                <div class="stat-label">本月打卡天数</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-fire">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-2.072-2.143-3.072-4.286.5 3-1.928 4.286-3.5 6.286C2 13 3.5 18 8.5 18c5.5 0 7.5-3.5 7.5-6.5 0-2-1-3-2-4.5.5 2 0 3.5-1 4.5h-1c-.5 0-1-.5-1-1.5 0-1.5 1-2 2-3.5 0 0-1.5 1-2.5 2z"/></svg>
                </div>
                <div class="stat-number">{{ myMaxStreak }}</div>
                <div class="stat-label">最长连续</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-heart">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </div>
                <div class="stat-number">{{ bothCompletedTotal }}</div>
                <div class="stat-label">双人默契次数</div>
              </div>
              <div class="stat-card">
                <div class="stat-icon stat-target">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                </div>
                <div class="stat-number">{{ totalMyCheckIns }}</div>
                <div class="stat-label">总打卡次数</div>
              </div>
            </div>

            <div class="stats-section">
              <h4 class="section-title-bar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg> 近7天趋势</h4>
              <div class="trend-chart">
                <div v-for="(day, i) in weeklyTrend" :key="day.date" class="trend-bar-wrap">
                  <div class="trend-bar" :style="{ height: Math.max(8, (day.count / Math.max(...weeklyTrend.map(d => d.count), 1)) * 80) + 'px' }" :class="{ zero: day.count === 0 }"></div>
                  <span class="trend-label">{{ day.label }}</span>
                </div>
              </div>
            </div>

            <div class="stats-section">
              <h4 class="section-title-bar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg> 计划排行榜</h4>
              <div class="habit-rank-list">
                <div v-for="(h, i) in habitRankList" :key="h.id" class="habit-rank-item">
                  <span class="rank-num">{{ i + 1 }}</span>
                  <div class="rank-info">
                    <span class="rank-title">{{ h.title }}</span>
                    <span class="rank-streak">连续 {{ h.streak }} 天</span>
                  </div>
                  <div class="rank-progress">
                    <div class="rank-progress-bar" :style="{ width: Math.min(100, (h.total / Math.max(habitRankList[0]?.total || 1, 1)) * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="achievements">
            <div class="achievement-summary">
              <div>
                <p class="summary-label">已解锁成就</p>
                <p class="summary-value">{{ unlockedCount }}/{{ achievements.length }}</p>
                <p class="summary-points">✨ {{ achievementPoints }} 积分</p>
              </div>
              <span class="trophy-icon">🏆</span>
            </div>
            <div class="achievement-grid">
              <div v-for="ach in achievements" :key="ach.id" :class="['achievement-card', ach.rarity, { unlocked: !!ach.unlockedAt }]">
                <div :class="['achievement-icon', ach.rarity, { unlocked: !!ach.unlockedAt }]">
                  <span v-if="ach.unlockedAt">{{ ach.icon }}</span>
                  <span v-else>🔒</span>
                </div>
                <h4 :class="['achievement-title', { unlocked: !!ach.unlockedAt }]">{{ ach.title }}</h4>
                <p class="achievement-desc">{{ ach.description }}</p>
                <div v-if="!ach.unlockedAt && ach.maxProgress > 1" class="achievement-progress">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: Math.min(100, (ach.progress / ach.maxProgress) * 100) + '%' }"/>
                  </div>
                  <span class="progress-text">{{ ach.progress }}/{{ ach.maxProgress }}</span>
                </div>
                <p v-else-if="ach.unlockedAt" class="achievement-date">⭐ {{ new Date(ach.unlockedAt).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <teleport to="body">
        <div v-if="showCheckInDialog" class="modal-overlay" @click.self="showCheckInDialog = false">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3>打卡 - {{ selectedHabit?.title }}</h3>
              <button type="button" class="close-btn" @click="showCheckInDialog = false">×</button>
            </div>
            <div class="modal-body">
              <!-- 日期选择（支持补打卡） -->
              <div v-if="availableCheckInDates.length > 0" class="form-group">
                <label class="form-label">选择日期</label>
                <div class="date-selector">
                  <button 
                    v-for="d in availableCheckInDates" 
                    :key="d.value" 
                    type="button"
                    @click="checkInDate = d.value" 
                    :class="['date-btn', { active: checkInDate === d.value, today: d.isToday, future: d.isFuture, checked: d.alreadyChecked }]"
                    :title="d.alreadyChecked ? '已打卡，点击更新' : (d.isFuture ? '提前打卡' : (d.isToday ? '今天' : '补卡'))"
                  >
                    {{ d.label }}
                    <span v-if="d.alreadyChecked" class="checked-badge">✓</span>
                    <span v-else-if="d.isFuture" class="future-badge">预</span>
                  </button>
                </div>
              </div>
              
              <div v-if="selectedHabit?.type === 'subtasks' && selectedDateSubTasks.length > 0" class="form-group">
                <label class="form-label">
                  完成的任务 
                  <span :class="['completion-badge', { perfect: isPerfectCheckIn }]">
                    {{ selectedDateCompletedTaskCount }}/{{ selectedDateSubTasks.length }}
                  </span>
                </label>
                <div class="subtask-quick-actions">
                  <button type="button" @click="completeAllSubTasks">全部完成</button>
                  <button type="button" @click="clearCompletedSubTasks">清空</button>
                </div>
                <div class="checkin-coach-panel" :class="selectedDateCoach.tone">
                  <div>
                    <span>{{ selectedDateCoach.label }}</span>
                    <strong>{{ selectedDateCoach.title }}</strong>
                    <p>{{ selectedDateCoach.detail }}</p>
                  </div>
                  <em>{{ selectedDateCompletionRate }}%</em>
                </div>
                <div class="subtask-group-list">
                  <div
                    v-for="group in selectedDateSubTaskGroups"
                    :key="group.id"
                    class="subtask-group-card"
                    :class="{ complete: group.complete, current: selectedDateNextGroup?.id === group.id }"
                  >
                    <div class="subtask-group-head">
                      <div>
                        <strong>{{ group.title }}</strong>
                        <span>{{ group.statusText }}{{ group.targetText ? ' · ' + group.targetText : '' }}</span>
                      </div>
                      <button type="button" @click="toggleSubTaskGroup(group)">
                        {{ group.complete ? '取消本组' : '完成本组' }}
                      </button>
                    </div>
                    <div class="subtask-checklist">
                      <label v-for="task in group.tasks" :key="task.id" class="subtask-check-item">
                        <input type="checkbox" :checked="selectedDateCompletedTaskIds.includes(task.id)" @change="toggleSubTask(task.id)" class="subtask-checkbox" />
                        <span class="subtask-check-content">
                          <span class="subtask-check-text">{{ task.title }}</span>
                          <span class="subtask-check-meta">
                            <span v-if="formatSubTaskTarget(task)">{{ formatSubTaskTarget(task) }}</span>
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
                <div class="checkin-feedback">
                  <div class="checkin-feedback-bar">
                    <div class="checkin-feedback-fill" :style="{ width: selectedDateCompletionRate + '%' }"></div>
                  </div>
                  <span>{{ selectedDateCompletionRate }}%</span>
                </div>
                <div class="checkin-receipt">
                  <span>今日回执</span>
                  <strong>{{ selectedDateCompletedGroups }}/{{ selectedDateSubTaskGroups.length }} 组闭环</strong>
                  <p>{{ selectedDateRemainingTaskCount > 0 ? `还差 ${selectedDateRemainingTaskCount} 项，下一步按提示收尾。` : '所有子计划都已完成，建议补一句复盘。' }}</p>
                </div>
                <p v-if="selectedDateCompletedTaskCount === 0" class="form-hint muted">请至少完成一项任务</p>
                <p v-else-if="isPerfectCheckIn" class="form-hint success">全部完成，今天训练闭环。</p>
                <p v-else class="form-hint warning">已完成 {{ selectedDateCompletedGroups }}/{{ selectedDateSubTaskGroups.length }} 组，继续把剩余组收尾。</p>
              </div>
              <div v-else-if="selectedHabit?.type === 'subtasks'" class="form-group">
                <p class="form-hint">该日期没有需要完成的子任务</p>
              </div>
              <div v-if="selectedHabit?.type === 'numeric'" class="form-group">
                <label class="form-label">记录数值 ({{ selectedHabit.numericConfig?.unit }})</label>
                <div class="numeric-input-wrap">
                  <input type="number" inputmode="decimal" step="0.1" v-model="numericValue" :placeholder="'输入' + selectedHabit.numericConfig?.unit" class="form-input numeric-large" />
                  <span class="numeric-unit-label">{{ selectedHabit.numericConfig?.unit }}</span>
                </div>
                <p class="form-hint">目标: {{ selectedHabit.numericConfig?.targetValue }}{{ selectedHabit.numericConfig?.unit }}</p>
              </div>
              <div class="form-group">
                <label class="form-label">今天的心情</label>
                <div class="mood-selector">
                  <button v-for="mood in MOODS" :key="mood.value" type="button" @click="selectedMood = mood.value" :class="['mood-btn', { active: selectedMood === mood.value }]"><span>{{ mood.label }}</span></button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">打卡笔记（可选）</label>
                <textarea v-model="checkInNote" placeholder="记录下今天的心情..." class="form-textarea" rows="3" />
              </div>
              <button 
                @click="handleCheckIn" 
                type="button"
                class="btn-primary w-full btn-checkin" 
                :class="checkInButtonStatus.type"
                :disabled="checkInButtonStatus.disabled || (selectedHabit?.type === 'numeric' && !numericValue)"
              >
                {{ checkInButtonStatus.text }}
              </button>
            </div>
          </div>
        </div>
      </teleport>
      <teleport to="body">
        <div v-if="showDetailDialog" class="detail-drawer" @click.self="showDetailDialog = false">
          <div class="drawer-content">
            <!-- 头部 -->
            <div class="drawer-header">
              <div class="header-main">
                <span class="plan-type-badge">{{ selectedHabit?.type === 'numeric' ? '📊 数值' : selectedHabit?.type === 'subtasks' ? '📝 子任务' : '✓ 打卡' }}</span>
                <h2 class="drawer-title">{{ selectedHabit?.title }}</h2>
                <p v-if="selectedHabit?.description" class="drawer-desc">{{ selectedHabit.description }}</p>
              </div>
              <button class="btn-close" @click="showDetailDialog = false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- 双人状态 -->
            <div v-if="selectedHabit?.participation === 'both'" class="duo-status-large">
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).selfChecked, 'on-leave': isOnLeaveToday(selectedHabit, currentUser.id), 'inactive-today': !isHabitActiveToday(selectedHabit, currentUser.id) && !isOnLeaveToday(selectedHabit, currentUser.id) && !getHabitStatus(selectedHabit).selfChecked }">
                <img v-if="currentUser.avatar" :src="currentUser.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ currentUser.name?.[0] || '我' }}</div>
                <span class="person-label">{{ 
                  isOnLeaveToday(selectedHabit, currentUser.id) ? '已请假' : 
                  (getHabitStatus(selectedHabit).selfChecked ? '已完成' : 
                  (!isHabitActiveToday(selectedHabit, currentUser.id) ? '无需打卡' : '待打卡')) 
                }}</span>
              </div>
              <div class="connection-line">
                <!-- 自己的进度：从左往右 -->
                <div class="line-progress self" :class="{ active: getHabitStatus(selectedHabit).selfChecked }"></div>
                <!-- 对方的进度：从右往左 -->
                <div class="line-progress partner" :class="{ active: getHabitStatus(selectedHabit).partnerChecked }"></div>
                <span v-if="getHabitStatus(selectedHabit).isComplete" class="complete-heart">双</span>
              </div>
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).partnerChecked, 'on-leave': isOnLeaveToday(selectedHabit, partner.id), 'inactive-today': !isHabitActiveToday(selectedHabit, partner.id) && !isOnLeaveToday(selectedHabit, partner.id) && !getHabitStatus(selectedHabit).partnerChecked }">
                <img v-if="partner.avatar" :src="partner.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ partner.name?.[0] || 'TA' }}</div>
                <span class="person-label">{{ 
                  isOnLeaveToday(selectedHabit, partner.id) ? '已请假' : 
                  (getHabitStatus(selectedHabit).partnerChecked ? '已完成' : 
                  (!isHabitActiveToday(selectedHabit, partner.id) ? '无需打卡' : '待打卡')) 
                }}</span>
              </div>
            </div>

            <!-- 内容区 -->
            <div class="drawer-body">
              <!-- 数值类型 -->
              <template v-if="selectedHabit?.type === 'numeric' && selectedHabit.numericRecords?.length">
                <div class="stat-cards">
                  <div class="stat-card">
                    <span class="stat-num">{{ selectedHabit.numericRecords[selectedHabit.numericRecords.length - 1].value }}</span>
                    <span class="stat-label">最新 {{ selectedHabit.numericConfig?.unit }}</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-num">{{ Math.max(...selectedHabit.numericRecords.map(r => r.value)) }}</span>
                    <span class="stat-label">最高</span>
                  </div>
                  <div class="stat-card">
                    <span class="stat-num">{{ Math.min(...selectedHabit.numericRecords.map(r => r.value)) }}</span>
                    <span class="stat-label">最低</span>
                  </div>
                </div>
                
                <div class="section">
                  <h4 class="section-title">📈 趋势</h4>
                  <div class="chart-container">
                    <div class="chart-y-axis">
                      <span v-for="(tick, i) in yAxisTicks" :key="'y'+i" class="y-tick">{{ tick.formatted }}</span>
                    </div>
                    <div class="chart-main">
                      <!-- SVG 只画线和网格 -->
                      <svg v-if="chartData.length > 0" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <!-- 网格线 -->
                        <line v-for="i in 5" :key="'grid'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="#e5e7eb" stroke-width="0.5" stroke-dasharray="2,2"/>
                        <!-- 平滑曲线 -->
                        <path v-if="svgPath" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="svgPath"/>
                      </svg>
                      <!-- CSS 画点 -->
                      <div v-if="chartPointsCSS.length > 0" class="chart-points">
                        <div v-for="(p, i) in chartPointsCSS" :key="'point'+i" class="chart-point" :style="p.style">
                          <div class="point-tooltip">{{ p.value }} {{ selectedHabit?.numericConfig?.unit }}</div>
                        </div>
                      </div>
                      <div v-if="chartData.length === 0" class="chart-empty">数据不足</div>
                    </div>
                  </div>
                  <div class="chart-x-axis">
                    <span v-for="(tick, i) in xAxisTicks" :key="'x'+i" class="x-tick">{{ tick }}</span>
                  </div>
                </div>

                <div class="section">
                  <h4 class="section-title">🕐 最近记录</h4>
                  <div class="record-list">
                    <div v-for="record in [...selectedHabit.numericRecords].reverse().slice(0, 5)" :key="record.date" class="record-item">
                      <span class="record-date">{{ new Date(record.date).toLocaleDateString() }}</span>
                      <span class="record-value">{{ record.value }} {{ selectedHabit.numericConfig?.unit }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 子任务类型 -->
              <template v-if="selectedHabit?.type === 'subtasks' && selectedHabit.subTasks">
                <div class="section">
                  <div class="section-header">
                    <h4 class="section-title">📋 任务清单</h4>
                    <!-- 如果有按周几分组的子任务，显示选择器 -->
                    <div v-if="selectedHabit.subTasks.some(s => s.weekday !== undefined && s.weekday !== null)" class="weekday-selector-mini">
                      <button 
                        v-for="day in availableDetailWeekdays" 
                        :key="day.value"
                        @click="detailViewWeekday = day.value"
                        :class="['weekday-dot', { active: detailViewWeekday === day.value }]"
                        :title="'周' + day.label"
                      >
                        {{ day.label }}
                      </button>
                    </div>
                  </div>
                  <div class="subtask-list">
                    <div v-for="(task, i) in detailViewSubTasks" :key="task.id || i" 
                      :class="['subtask-item', { completed: isSubTaskCompleted(task.id, task.title) }]">
                      <span class="subtask-check">
                        <svg v-if="isSubTaskCompleted(task.id, task.title)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span v-else class="subtask-unchecked">○</span>
                      </span>
                      <span class="subtask-index">{{ String(i + 1).padStart(2, '0') }}</span>
                      <span class="subtask-name-wrap">
                        <span class="subtask-name">{{ task.title }}</span>
                        <span v-if="task.groupTitle || formatSubTaskTarget(task)" class="subtask-meta-line">
                          {{ [task.groupTitle, formatSubTaskTarget(task)].filter(Boolean).join(' · ') }}
                        </span>
                      </span>
                      <span v-if="task.weekday !== undefined && task.weekday !== null" class="subtask-weekday">周{{ WEEKDAYS.find(d => d.value === Number(task.weekday))?.label }}</span>
                    </div>
                    <div v-if="detailViewSubTasks.length === 0" class="subtask-empty">
                      该日没有设置子任务
                    </div>
                  </div>
                </div>
              </template>

              <!-- 打卡统计 -->
              <div class="section">
                <h4 class="section-title">📊 打卡统计</h4>
                <div class="stats-simple">
                  <div class="stat-row">
                    <span>总打卡</span>
                    <span class="stat-highlight">{{ checkIns.filter(c => c.habitId === selectedHabit?.id && c.userId === currentUser.id).length }} 次</span>
                  </div>
                  <div class="stat-row">
                    <span>连续</span>
                    <span class="stat-highlight">{{ getStreak(selectedHabit?.id, currentUser.id, selectedHabit) }} 天</span>
                  </div>
                </div>
              </div>

              <!-- 打卡历史记录 -->
              <div class="section">
                <h4 class="section-title">📝 打卡日记</h4>
                <div class="checkin-history">
                  <div v-for="record in habitCheckInHistory" :key="record.id" class="checkin-record">
                    <div class="checkin-header">
                      <div class="checkin-user">
                        <img v-if="record.user?.avatar" :src="record.user.avatar" class="checkin-avatar" />
                        <div v-else class="checkin-avatar-default">{{ record.displayName?.[0] || '?' }}</div>
                        <span class="checkin-name">{{ record.displayName }}</span>
                      </div>
                      <span class="checkin-date">{{ record.date }}</span>
                    </div>
                    
                    <!-- 心情 -->
                    <div class="checkin-mood" v-if="record.mood">
                      <span class="mood-emoji">{{ MOODS.find(m => m.value === record.mood)?.emoji || '😊' }}</span>
                      <span class="mood-label">{{ MOODS.find(m => m.value === record.mood)?.label || '开心' }}</span>
                    </div>
                    
                    <!-- 完成的子任务 -->
                    <div class="checkin-tasks" v-if="record.completedSubTasks?.length > 0">
                      <div class="checkin-tasks-title">完成的任务：</div>
                      <div class="checkin-task-list">
                        <span v-for="(taskId, idx) in record.completedSubTasks" :key="taskId" class="checkin-task-tag">
                          {{ getSubTaskTitle(taskId) }}
                        </span>
                      </div>
                    </div>

                    <div class="checkin-summary" v-if="record.completionSummary?.totalSubTasks">
                      <span>完成率 {{ record.completionSummary.completionRate }}%</span>
                      <span>{{ record.completionSummary.completedGroups }}/{{ record.completionSummary.totalGroups }} 组闭环</span>
                    </div>
                    
                    <!-- 数值记录 -->
                    <div class="checkin-numeric" v-if="record.numericValue !== null && record.numericValue !== undefined">
                      <span class="numeric-label">记录值：</span>
                      <span class="numeric-value">{{ record.numericValue }} {{ selectedHabit?.numericConfig?.unit || '' }}</span>
                    </div>
                    
                    <!-- 心情笔记 -->
                    <div class="checkin-note" v-if="record.note">
                      <span class="note-label">💭</span>
                      <span class="note-text">{{ record.note }}</span>
                    </div>
                    
                    <!-- 完美打卡标记 -->
                    <div class="checkin-perfect" v-if="record.isPerfect">
                      <span>🌟 完美打卡</span>
                    </div>
                  </div>
                  
                  <div v-if="habitCheckInHistory.length === 0" class="checkin-empty">
                    还没有打卡记录，快去打卡吧！
                  </div>
                </div>
              </div>

              <!-- 近30天打卡日历 -->
              <div class="section">
                <h4 class="section-title">🗓️ 近30天打卡日历</h4>
                <div class="detail-calendar">
                  <div class="detail-calendar-header">
                    <span class="calendar-legend-item"><span class="legend-dot me"/>我</span>
                    <span class="calendar-legend-item"><span class="legend-dot partner"/>TA</span>
                  </div>
                  <div class="detail-calendar-grid">
                    <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="detail-calendar-weekday">{{ d }}</div>
                    <div
                      v-for="(date, i) in calendarDays"
                      :key="i"
                      :class="['detail-calendar-day', { today: formatDateIso(date) === today, 'has-me': hasCheckInOnDay(selectedHabit?.id, formatDateIso(date), currentUser.id), 'has-partner': hasCheckInOnDay(selectedHabit?.id, formatDateIso(date), partner.id) }]"
                    >
                      <span class="day-number">{{ date.getDate() }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 计划信息 -->
              <div class="section">
                <h4 class="section-title">📅 计划信息</h4>
                <div class="stats-simple">
                  <div class="stat-row">
                    <span>开始日期</span>
                    <span class="stat-highlight">{{ selectedHabit?.startDate ? new Date(selectedHabit.startDate).toLocaleDateString() : '未设置' }}</span>
                  </div>
                </div>
              </div>

              <!-- 请假记录 -->
              <div v-if="selectedHabit?.leaves?.length" class="section">
                <h4 class="section-title">请假记录</h4>
                <div class="leave-list">
                  <!-- 我的请假 -->
                  <div v-for="leave in selectedHabit.leaves.filter(l => l.userId === currentUser.id)" :key="leave.id || leave._id || leave.startDate" class="leave-item">
                    <div class="leave-info">
                      <span class="leave-date">{{ new Date(leave.startDate).toLocaleDateString() }} - {{ new Date(leave.endDate).toLocaleDateString() }}</span>
                      <span v-if="leave.reason" class="leave-reason">{{ leave.reason }}</span>
                    </div>
                    <button @click="deleteLeave(leave.id || leave._id)" class="btn-icon-delete" title="删除">×</button>
                  </div>
                  <!-- 伴侣的请假 -->
                  <div v-for="leave in selectedHabit.leaves.filter(l => l.userId === partner.id)" :key="leave.id || leave._id || leave.startDate" class="leave-item partner">
                    <div class="leave-info">
                      <span class="leave-date">{{ new Date(leave.startDate).toLocaleDateString() }} - {{ new Date(leave.endDate).toLocaleDateString() }}</span>
                      <span v-if="leave.reason" class="leave-reason">{{ leave.reason }}</span>
                    </div>
                    <span class="leave-badge">{{ partner.gender === 'male' ? '他' : partner.gender === 'female' ? '她' : 'TA' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="drawer-footer">
              <!-- 第一行：主要操作 -->
              <div class="footer-row main-actions">
                <button v-if="canCheckIn(selectedHabit)" @click="showDetailDialog = false; openCheckIn(selectedHabit)" class="btn-action primary">{{ getHabitStatus(selectedHabit).selfChecked ? '更新打卡' : '立即打卡' }}</button>
                <button v-if="canTakeLeave(selectedHabit) && !isOnLeaveToday(selectedHabit, currentUser.id)" type="button" @click="openLeaveDialog" class="btn-action secondary leave-action">请假</button>
                <button v-else-if="isOnLeaveToday(selectedHabit, currentUser.id)" type="button" disabled class="btn-action secondary leave-action disabled">已请假</button>
                <button v-if="canCompleteHabit(selectedHabit)" type="button" @click="completeHabit(selectedHabit); showDetailDialog = false" class="btn-action secondary">完成计划</button>
              </div>
              <!-- 第二行：管理操作（仅创建者可见） -->
              <div v-if="selectedHabit?.createdBy === currentUser.id" class="footer-row manage-actions">
                <button type="button" @click="openEditHabit" class="btn-action edit">编辑</button>
                <button type="button" @click="deleteHabit(selectedHabit)" class="btn-action delete">删除</button>
              </div>
            </div>
          </div>
        </div>
      </teleport>
      <!-- 成就解锁庆祝弹窗 -->
      <teleport to="body">
        <div v-if="achievementUnlock.show" class="achievement-celebration" @click="achievementUnlock.show = false">
          <div class="celebration-content">
            <div class="celebration-stars">✨ 🌟 ✨</div>
            <div class="achievement-big-icon">{{ achievementUnlock.achievement?.icon }}</div>
            <h2 class="celebration-title">成就解锁！</h2>
            <h3 class="celebration-name">{{ achievementUnlock.achievement?.title }}</h3>
            <p class="celebration-desc">{{ achievementUnlock.achievement?.description }}</p>
            <div class="celebration-fireworks">
              <span v-for="i in 8" :key="i" class="firework" :style="{ '--i': i }">🎆</span>
            </div>
          </div>
        </div>
      </teleport>
      
      <!-- 周报弹窗 -->
      <teleport to="body">
        <div v-if="showWeeklyReport" class="weekly-report-modal" @click.self="closeWeeklyReport">
          <div class="weekly-report-content">
            <div class="report-header">
              <h2>本周打卡报告</h2>
              <button type="button" class="close-btn" @click="closeWeeklyReport">×</button>
            </div>
            <div class="report-body">
              <!-- 加载中 -->
              <div v-if="!weeklyReportData" class="report-loading">
                <p>加载中...</p>
              </div>
              
              <!-- 有数据状态 -->
              <div v-else-if="hasWeeklyData" class="report-stats">
                <!-- 总览卡片 -->
                <div class="report-summary">
                  <div class="summary-item">
                    <span class="summary-value">{{ weeklyReportData.summary.myTotal }}</span>
                    <span class="summary-label">我完成</span>
                  </div>
                  <div class="summary-item vs">
                    <span class="vs-text">VS</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-value">{{ weeklyReportData.summary.partnerTotal }}</span>
                    <span class="summary-label">TA完成</span>
                  </div>
                </div>
                
                <!-- 默契天数 -->
                <div v-if="weeklyReportData.summary.bothCompleted > 0" class="both-completed-badge">
                  一起完成 {{ weeklyReportData.summary.bothCompleted }} 天
                </div>
                
                <!-- 每日详情 -->
                <div class="daily-chart">
                  <div v-for="day in weeklyReportData.dailyStats" :key="day.date" class="day-bar">
                    <div class="day-label">{{ ['日','一','二','三','四','五','六'][day.dayOfWeek] }}</div>
                    <div class="day-progress">
                      <div class="progress-segment me" :style="{ height: day.myCompleted > 0 ? '100%' : '0%' }"></div>
                      <div class="progress-segment partner" :style="{ height: day.partnerCompleted > 0 ? '100%' : '0%' }"></div>
                    </div>
                    <div class="day-status">
                      <span v-if="day.myCompleted && day.partnerCompleted">双</span>
                      <span v-else-if="day.myCompleted">✓</span>
                      <span v-else-if="day.partnerCompleted">○</span>
                      <span v-else>-</span>
                    </div>
                  </div>
                </div>
                
                <!-- 鼓励语 -->
                <div class="encouragement">
                  <p v-if="weeklyReportData.summary.myTotal > weeklyReportData.summary.partnerTotal">
                    本周你比TA多打卡 {{ weeklyReportData.summary.myTotal - weeklyReportData.summary.partnerTotal }} 天，继续保持。
                  </p>
                  <p v-else-if="weeklyReportData.summary.myTotal < weeklyReportData.summary.partnerTotal">
                    TA 本周比你多打卡 {{ weeklyReportData.summary.partnerTotal - weeklyReportData.summary.myTotal }} 天，可以约定一个更稳的时间。
                  </p>
                  <p v-else-if="weeklyReportData.summary.myTotal === weeklyReportData.summary.totalDays && weeklyReportData.summary.myTotal > 0">
                    本周你们每天都完成了计划。
                  </p>
                  <p v-else>
                    本周你们完成度相同，节奏很稳。
                  </p>
                </div>
              </div>
              
              <!-- 空状态：本周无打卡数据 -->
              <div v-else class="report-empty">
                <!-- 本周进度 -->
                <div class="week-progress">
                  <div class="week-day-badge">本周第 {{ currentWeekDay }} 天</div>
                  <div class="week-progress-bar">
                    <div class="progress-fill" :style="{ width: (currentWeekDay / 7 * 100) + '%' }"></div>
                  </div>
                </div>
                
                <!-- 空状态插图/图标 -->
                <div class="empty-illustration">
                  <div class="empty-icon-large">🌱</div>
                  <h3>新的一周，新的开始</h3>
                  <p>本周还没有打卡记录，创建你们的第一个计划吧！</p>
                </div>
                
                <!-- 快速创建按钮 -->
                <button class="btn-create-first" @click="closeWeeklyReport(); showAddDialog = true">
                  + 创建第一个计划
                </button>
                
                <!-- 本周空白日历预览 -->
                <div class="empty-calendar-preview">
                  <div class="preview-label">本周打卡日历</div>
                  <div class="preview-days">
                    <div v-for="n in 7" :key="n" class="preview-day" :class="{ today: n === currentWeekDay }">
                      {{ ['一','二','三','四','五','六','日'][n-1] }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 底部按钮 -->
            <div v-if="hasWeeklyData" class="report-footer">
              <button class="btn-close-report" @click="closeWeeklyReport">知道了</button>
            </div>
            <div v-else class="report-footer">
              <button class="btn-close-report" @click="closeWeeklyReport">稍后再说</button>
            </div>
          </div>
        </div>
      </teleport>
      
      <teleport to="body">
        <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
          <div class="modal-dialog add-dialog">
            <div class="modal-header"><h3>添加新计划</h3><button type="button" class="close-btn" @click="showAddDialog = false">×</button></div>
            <div class="modal-body">
              <!-- 计划名称 -->
              <div class="form-group">
                <label class="form-label">计划名称 *</label>
                <input v-model="newHabitTitle" placeholder="例如：早起晨跑" class="form-input input-title" />
              </div>
              
              <!-- 参与方式 -->
              <div class="form-group">
                <label class="form-label">参与方式</label>
                <div class="option-pills">
                  <button v-for="opt in CREATE_PARTICIPATION_OPTIONS" :key="opt.value" type="button" @click="newHabitParticipation = opt.value" :class="['option-pill', { active: newHabitParticipation === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
                <p class="form-hint">{{ CREATE_PARTICIPATION_OPTIONS.find(o => o.value === newHabitParticipation)?.desc }}</p>
              </div>
              
              <!-- 计划开始日期 -->
              <div class="form-group">
                <label class="form-label">计划开始日期</label>
                <DatePickerField v-model="newHabitStartDate" display-class="form-input" placeholder="请选择开始日期" />
                <p class="form-hint">开始日期之前无需打卡</p>
              </div>
              
              <!-- 打卡频率 -->
              <div class="form-group">
                <label class="form-label">打卡频率</label>
                <div class="option-pills">
                  <button v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" type="button" @click="newHabitFrequency = opt.value" :class="['option-pill', { active: newHabitFrequency === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
                <!-- 每周几天选择 -->
                <div v-if="newHabitFrequency === 'weekly'" class="weekday-selector">
                  <button v-for="day in WEEKDAYS" :key="day.value" type="button" @click="toggleWeekday(day.value)" :class="['weekday-btn', { active: newHabitWeekdays.includes(day.value) }]">
                    {{ day.label }}
                  </button>
                </div>
              </div>
              
              <!-- 计划类型 -->
              <div class="form-group">
                <label class="form-label">打卡方式</label>
                <div class="type-cards">
                  <button v-for="t in habitTypes" :key="t.value" type="button" @click="newHabitType = t.value" :class="['type-card', { active: newHabitType === t.value }]">
                    <span class="type-radio"></span>
                    <div class="type-info">
                      <p class="type-name">{{ t.label }}</p>
                      <p class="type-desc">{{ t.desc }}</p>
                    </div>
                  </button>
                </div>
              </div>
              
              <!-- 子任务设置 -->
              <div v-if="newHabitType === 'subtasks'" class="form-group subtasks-section">
                <label class="form-label">子任务设置</label>
                <div class="template-strip">
                  <button type="button" class="template-chip" @click="applySubTaskTemplate('new', 'fitness')">健身训练模板</button>
                  <span>自动拆成热身、力量、核心、恢复</span>
                </div>
                <!-- 每周不同的子任务 -->
                <div v-if="newHabitFrequency === 'weekly'" class="weekday-tabs">
                  <button v-for="day in WEEKDAYS.filter(d => newHabitWeekdays.includes(d.value))" :key="day.value" type="button" @click="activeWeekday = day.value.toString()" :class="['weekday-tab', { active: activeWeekday === day.value.toString() }]">
                    周{{ day.label }}
                  </button>
                </div>
                <!-- 提示：每周类型但未选星期几 -->
                <div v-if="newHabitFrequency === 'weekly' && newHabitWeekdays.length === 0" class="form-hint empty-form-hint">
                  请先选择每周哪几天需要打卡
                </div>
                <!-- 子任务输入 -->
                <div v-else class="subtask-list">
                  <div v-for="(task, i) in currentSubTasks" :key="i" class="subtask-item">
                    <span class="subtask-num">{{ i + 1 }}</span>
                    <input v-model="currentSubTasks[i]" :placeholder="'子任务 ' + (i + 1)" class="form-input subtask-input" />
                    <button v-if="currentSubTasks.length > 1" type="button" @click="removeSubTask(i)" class="btn-icon-delete">×</button>
                  </div>
                  <button type="button" @click="addSubTask" class="btn-add-subtask">+ 添加子任务</button>
                </div>
              </div>
              
              <!-- 数值记录 -->
              <div v-if="newHabitType === 'numeric'" class="form-group">
                <label class="form-label">数值设置</label>
                <div class="numeric-config">
                  <div class="numeric-field">
                    <label>单位</label>
                    <input v-model="newNumericUnit" placeholder="如：km、分钟" class="form-input" />
                  </div>
                  <div class="numeric-field">
                    <label>目标值</label>
                    <input v-model="newNumericTarget" type="number" inputmode="decimal" placeholder="0" class="form-input" />
                  </div>
                </div>
              </div>
              
              <!-- 描述 -->
              <div class="form-group">
                <label class="form-label">计划描述 <span class="optional">选填</span></label>
                <textarea v-model="newHabitDesc" placeholder="添加一些说明，激励自己和TA..." class="form-textarea" rows="2" />
              </div>

              <!-- 提醒设置 -->
              <div class="form-group">
                <label class="form-label">每日提醒</label>
                <div class="reminder-row">
                  <label class="switch-label">
                    <input type="checkbox" v-model="newReminderEnabled" />
                    <span class="switch-text">{{ newReminderEnabled ? '已开启' : '关闭' }}</span>
                  </label>
                  <input v-if="newReminderEnabled" type="time" v-model="newReminderTime" class="form-input time-input" />
                </div>
              </div>

              <button type="button" @click="handleAddHabit" class="btn-primary w-full btn-submit" :disabled="!newHabitTitle.trim() || (newHabitType === 'numeric' && !newNumericUnit) || (newHabitType === 'subtasks' && !hasValidSubTasks)">创建计划</button>
            </div>
          </div>
        </div>
      </teleport>
      
      <!-- 编辑计划弹窗 -->
      <teleport to="body">
        <div v-if="showEditDialog" class="modal-overlay" @click.self="showEditDialog = false">
          <div class="modal-dialog add-dialog">
            <div class="modal-header"><h3>编辑计划</h3><button type="button" class="close-btn" @click="showEditDialog = false">×</button></div>
            <div class="modal-body">
              <!-- 计划名称 -->
              <div class="form-group">
                <label class="form-label">计划名称 *</label>
                <input v-model="editHabitTitle" placeholder="例如：早起晨跑" class="form-input input-title" />
              </div>
              
              <!-- 参与方式 -->
              <div class="form-group">
                <label class="form-label">参与方式</label>
                <div class="option-pills">
                  <button v-for="opt in CREATE_PARTICIPATION_OPTIONS" :key="opt.value" type="button" @click="editHabitParticipation = opt.value" :class="['option-pill', { active: editHabitParticipation === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
              </div>
              
              <!-- 计划开始日期 -->
              <div class="form-group">
                <label class="form-label">计划开始日期</label>
                <DatePickerField v-model="editHabitStartDate" display-class="form-input" placeholder="请选择开始日期" />
                <p class="form-hint">开始日期之前无需打卡</p>
              </div>
              
              <!-- 打卡频率 -->
              <div class="form-group">
                <label class="form-label">打卡频率</label>
                <div class="option-pills">
                  <button v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" type="button" @click="editHabitFrequency = opt.value" :class="['option-pill', { active: editHabitFrequency === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
                <!-- 每周几天选择 -->
                <div v-if="editHabitFrequency === 'weekly'" class="weekday-selector">
                  <button v-for="day in WEEKDAYS" :key="day.value" type="button" @click="toggleEditWeekday(day.value)" :class="['weekday-btn', { active: editHabitWeekdays.includes(day.value) }]">
                    {{ day.label }}
                  </button>
                </div>
              </div>
              
              <!-- 计划类型 -->
              <div class="form-group">
                <label class="form-label">打卡方式</label>
                <div class="type-cards">
                  <button v-for="t in habitTypes" :key="t.value" type="button" @click="editHabitType = t.value" :class="['type-card', { active: editHabitType === t.value }]">
                    <span class="type-radio"></span>
                    <div class="type-info">
                      <p class="type-name">{{ t.label }}</p>
                      <p class="type-desc">{{ t.desc }}</p>
                    </div>
                  </button>
                </div>
              </div>
              
              <!-- 子任务设置 -->
              <div v-if="editHabitType === 'subtasks'" class="form-group subtasks-section">
                <label class="form-label">子任务设置</label>
                <div class="template-strip">
                  <button type="button" class="template-chip" @click="applySubTaskTemplate('edit', 'fitness')">套用健身模板</button>
                  <span>保留旧记录，重排训练结构</span>
                </div>
                <!-- 每周不同的子任务 -->
                <div v-if="editHabitFrequency === 'weekly'" class="weekday-tabs">
                  <button v-for="day in WEEKDAYS.filter(d => editHabitWeekdays.includes(d.value))" :key="day.value" type="button" @click="editActiveWeekday = day.value.toString()" :class="['weekday-tab', { active: editActiveWeekday === day.value.toString() }]">
                    周{{ day.label }}
                  </button>
                </div>
                <!-- 提示：每周类型但未选星期几 -->
                <div v-if="editHabitFrequency === 'weekly' && editHabitWeekdays.length === 0" class="form-hint empty-form-hint">
                  请先选择每周哪几天需要打卡
                </div>
                <!-- 子任务输入 -->
                <div v-else class="subtask-list">
                  <div v-for="(task, i) in currentEditSubTasks" :key="i" class="subtask-item">
                    <span class="subtask-num">{{ i + 1 }}</span>
                    <input v-model="currentEditSubTasks[i]" :placeholder="'子任务 ' + (i + 1)" class="form-input subtask-input" />
                    <button v-if="currentEditSubTasks.length > 1" type="button" @click="removeEditSubTask(i)" class="btn-icon-delete">×</button>
                  </div>
                  <button type="button" @click="addEditSubTask" class="btn-add-subtask">+ 添加子任务</button>
                </div>
              </div>
              
              <!-- 数值记录 -->
              <div v-if="editHabitType === 'numeric'" class="form-group">
                <label class="form-label">数值设置</label>
                <div class="numeric-config">
                  <div class="numeric-field">
                    <label>单位</label>
                    <input v-model="editNumericUnit" placeholder="如：km、分钟" class="form-input" />
                  </div>
                  <div class="numeric-field">
                    <label>目标值</label>
                    <input v-model="editNumericTarget" type="number" inputmode="decimal" placeholder="0" class="form-input" />
                  </div>
                </div>
              </div>
              
              <!-- 描述 -->
              <div class="form-group">
                <label class="form-label">计划描述 <span class="optional">选填</span></label>
                <textarea v-model="editHabitDesc" placeholder="添加一些说明，激励自己和TA..." class="form-textarea" rows="2" />
              </div>

              <!-- 提醒设置 -->
              <div class="form-group">
                <label class="form-label">每日提醒</label>
                <div class="reminder-row">
                  <label class="switch-label">
                    <input type="checkbox" v-model="editReminderEnabled" />
                    <span class="switch-text">{{ editReminderEnabled ? '已开启' : '关闭' }}</span>
                  </label>
                  <input v-if="editReminderEnabled" type="time" v-model="editReminderTime" class="form-input time-input" />
                </div>
              </div>

              <button type="button" @click="handleEditHabit" class="btn-primary w-full btn-submit" :disabled="!editHabitTitle.trim() || (editHabitType === 'numeric' && !editNumericUnit) || (editHabitType === 'subtasks' && !hasValidEditSubTasks)">保存修改</button>
            </div>
          </div>
        </div>
      </teleport>
      
      <!-- 请假弹窗 -->
      <teleport to="body">
        <div v-if="showLeaveDialog" class="modal-overlay" @click.self="showLeaveDialog = false">
          <div class="modal-dialog add-dialog">
            <div class="modal-header"><h3>申请请假</h3><button type="button" class="close-btn" @click="showLeaveDialog = false">×</button></div>
            <div class="modal-body">
              <div class="form-hint leave-rules">
                请假规则：不能请过去的假 · 单次最多2天 · 每月最多2次
                <span>本月剩余 {{ Math.max(0, 2 - monthlyLeaveCount) }} 次</span>
              </div>
              <div class="form-group">
                <label class="form-label">开始日期</label>
                <DatePickerField v-model="leaveStartDate" :min="getToday()" display-class="form-input" placeholder="请选择开始日期" />
              </div>
              <div class="form-group">
                <label class="form-label">结束日期</label>
                <DatePickerField v-model="leaveEndDate" :min="leaveStartDate || getToday()" display-class="form-input" placeholder="请选择结束日期" />
                <p v-if="leaveDays > 0" class="form-hint">共请假 {{ leaveDays }} 天</p>
                <p v-if="leaveDays > 2" class="form-hint error">单次请假不能超过2天</p>
              </div>
              <div class="form-group">
                <label class="form-label">请假原因 <span class="optional">选填</span></label>
                <input v-model="leaveReason" placeholder="例如：出差、度假..." class="form-input" />
              </div>
              <button @click="handleAddLeave" class="btn-primary w-full btn-submit" :disabled="!leaveStartDate || !leaveEndDate || leaveStartDate > leaveEndDate || leaveDays > 2 || monthlyLeaveCount >= 2">提交请假</button>
            </div>
          </div>
        </div>
      </teleport>
      
      <div class="toast" :class="{ show: toast.show, [toast.type]: true }"><span>{{ toast.message }}</span></div>
      <!-- 右下角浮动按钮 -->
      <!-- 周报悬浮按钮 -->
      <button class="fab fab-report" @click="fetchWeeklyReport(); showWeeklyReport = true" title="本周报告">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
          <path d="M8 14h.01"/>
          <path d="M12 14h.01"/>
          <path d="M16 14h.01"/>
          <path d="M8 18h.01"/>
          <path d="M12 18h.01"/>
          <path d="M16 18h.01"/>
        </svg>
      </button>
      
      <!-- 添加计划按钮 -->
      <button class="fab" @click="showAddDialog = true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
    
    <BottomNav />
    
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { formatLocalDate } from '../utils/date.js'
import { buildPlansExecutionDashboard } from '../utils/plan-execution.js'
import BottomNav from '../components/BottomNav.vue'
import DatePickerField from '../components/DatePickerField.vue'

const MOODS = [
  { value: 'happy', label: '开心', color: '#D8A94E' },
  { value: 'love', label: '甜蜜', color: '#A24363' },
  { value: 'excited', label: '兴奋', color: '#B65F4A' },
  { value: 'peaceful', label: '平静', color: '#526F5C' },
  { value: 'tired', label: '疲惫', color: '#7C7480' },
]

const COLORS = ['#A24363', '#526F5C', '#B65F4A', '#D8A94E', '#7C7480', '#8B5E69', '#476A73', '#9B6A4A']

const PARTICIPATION_OPTIONS = [
  { value: 'both', label: '两人一起', desc: '需要两人都完成' },
  { value: 'self', label: '仅自己', desc: '只有你能打卡' },
  { value: 'partner', label: '仅对方', desc: '只有TA能打卡' },
]

// 创建计划时的参与方式选项（不包含"仅对方"）
const CREATE_PARTICIPATION_OPTIONS = [
  { value: 'both', label: '两人一起', desc: '需要两人都完成' },
  { value: 'self', label: '仅自己', desc: '只有你能打卡' },
]

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: '每天', desc: '每日打卡' },
  { value: 'weekly', label: '每周', desc: '选择每周哪几天' },
]

const WEEKDAYS = [
  { value: 1, label: '一' },
  { value: 2, label: '二' },
  { value: 3, label: '三' },
  { value: 4, label: '四' },
  { value: 5, label: '五' },
  { value: 6, label: '六' },
  { value: 0, label: '日' },
]

const habitTypes = [
  { value: 'simple', label: '简单打卡', desc: '每日一键打卡' },
  { value: 'subtasks', label: '子任务', desc: '含多个小任务' },
  { value: 'numeric', label: '数值记录', desc: '记录数据趋势' },
]

const FITNESS_TEMPLATE = {
  monday: [
    { id: 'fit-mon-warmup', title: '动态热身', groupTitle: '热身', targetValue: 8, unit: '分钟' },
    { id: 'fit-mon-squat', title: '深蹲', groupTitle: '下肢力量', targetValue: 4, unit: '组' },
    { id: 'fit-mon-lunge', title: '箭步蹲', groupTitle: '下肢力量', targetValue: 3, unit: '组' },
    { id: 'fit-mon-stretch', title: '拉伸放松', groupTitle: '恢复', targetValue: 6, unit: '分钟' }
  ],
  wednesday: [
    { id: 'fit-wed-warmup', title: '肩背激活', groupTitle: '热身', targetValue: 6, unit: '分钟' },
    { id: 'fit-wed-pushup', title: '俯卧撑', groupTitle: '上肢力量', targetValue: 4, unit: '组' },
    { id: 'fit-wed-row', title: '划船训练', groupTitle: '上肢力量', targetValue: 4, unit: '组' },
    { id: 'fit-wed-core', title: '平板支撑', groupTitle: '核心', targetValue: 3, unit: '组' }
  ],
  friday: [
    { id: 'fit-fri-warmup', title: '全身热身', groupTitle: '热身', targetValue: 8, unit: '分钟' },
    { id: 'fit-fri-cardio', title: '有氧训练', groupTitle: '心肺', targetValue: 20, unit: '分钟' },
    { id: 'fit-fri-core', title: '核心循环', groupTitle: '核心', targetValue: 3, unit: '轮' },
    { id: 'fit-fri-stretch', title: '深度拉伸', groupTitle: '恢复', targetValue: 8, unit: '分钟' }
  ]
}

export default {
  name: 'Plans',
  components: { BottomNav, DatePickerField },
  setup() {
    const router = useRouter()
    
    // 获取今天的日期字符串（使用本地时间，避免 UTC 时差问题）
    const getToday = () => {
      return formatLocalDate()
    }
    const today = computed(() => getToday())
    
    const loading = ref(true)
    const habits = ref([])
    const checkIns = ref([])
    const currentUser = ref({ id: '', name: '我', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf' })
    const partner = ref({ id: '', name: 'TA', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede', gender: null })

    const activeTab = ref('plans')
    const filterType = ref('all')
    const showCheckInDialog = ref(false)
    const showAddDialog = ref(false)
    const showDetailDialog = ref(false)
    const selectedHabit = ref(null)
    
    // 周报相关
    const showWeeklyReport = ref(false)
    const weeklyReportData = ref(null)
    const hasSeenWeeklyReport = ref(false)
    
    // 打卡日期选择（支持补打卡）
    const checkInDate = ref('')
    
    // 请假相关
    const showLeaveDialog = ref(false)
    const leaveStartDate = ref('')
    const leaveEndDate = ref('')
    const leaveReason = ref('')
    
    // 请假天数
    const leaveDays = computed(() => {
      if (!leaveStartDate.value || !leaveEndDate.value) return 0
      if (leaveStartDate.value > leaveEndDate.value) return 0
      const start = new Date(leaveStartDate.value)
      const end = new Date(leaveEndDate.value)
      return Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1
    })
    
    // 当前 habit 中我的请假记录
    const myLeaves = computed(() => {
      if (!selectedHabit.value?.leaves?.length) return []
      return selectedHabit.value.leaves.filter(leave => leave.userId === currentUser.value.id)
    })
    
    // 当前 habit 中伴侣的请假记录
    const partnerLeaves = computed(() => {
      if (!selectedHabit.value?.leaves?.length) return []
      return selectedHabit.value.leaves.filter(leave => leave.userId === partner.value.id)
    })
    
    // 本月请假次数（仅自己）
    const monthlyLeaveCount = computed(() => {
      const currentMonth = getToday().slice(0, 7)
      return myLeaves.value.filter(leave => leave.startDate.startsWith(currentMonth)).length
    })
    
    // 获取指定日期的子任务（根据星期几过滤）
    const getSubTasksForDate = (dateStr) => {
      if (!selectedHabit.value?.subTasks) return []
      const subTasks = selectedHabit.value.subTasks
      if (subTasks.some(s => s.weekday !== undefined && s.weekday !== null)) {
        const [year, month, day] = String(dateStr).split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const weekday = date.getDay()
        return subTasks.filter(s => Number(s.weekday) === weekday)
      }
      return subTasks
    }

    const formatSubTaskTarget = (task) => {
      if (!task || !Number(task.targetValue)) return ''
      return `${Number(task.targetValue)}${task.unit || ''}`
    }
    
    // 获取 habit 当天需要完成的子任务数量
    const getTodaySubTaskCount = (habit) => {
      if (!habit?.subTasks) return 0
      const subTasks = habit.subTasks
      // 如果有按星期几分组的子任务
      if (subTasks.some(s => s.weekday !== undefined && s.weekday !== null)) {
        const today = new Date()
        const weekday = today.getDay()
        return subTasks.filter(s => Number(s.weekday) === weekday).length
      }
      // 否则返回所有子任务数量
      return subTasks.length
    }

    const getTodaySubPlanCount = (habit) => {
      if (!habit?.subTasks) return 0
      const todayTasks = (() => {
        if (habit.subTasks.some(s => s.weekday !== undefined && s.weekday !== null)) {
          const weekday = new Date().getDay()
          return habit.subTasks.filter(s => Number(s.weekday) === weekday)
        }
        return habit.subTasks
      })()
      return new Set(todayTasks.map(task => task.groupTitle || task.groupId || '默认')).size
    }
    
    // 当前选中日期对应的子任务
    const selectedDateSubTasks = computed(() => {
      return getSubTasksForDate(checkInDate.value || getToday()).map((task, index) => ({
        ...task,
        id: String(task.id || task._id || `${selectedHabit.value?.id || 'habit'}-${index}-${task.title}`)
      }))
    })
    
    // 本周日期选择器列表（包含已打卡和未打卡，严格周一到周日）
    const availableCheckInDates = computed(() => {
      if (!selectedHabit.value) return []
      const dates = []
      const today = new Date()
      const todayStr = getToday()
      const habit = selectedHabit.value
      const myLeaves = habit.leaves?.filter(l => l.userId === currentUser.value.id) || []
      
      const isAlreadyChecked = (dateStr) => checkIns.value.some(
        c => c.habitId === habit.id && c.userId === currentUser.value.id && c.date === dateStr
      )
      
      const needCheckInOnDate = (date, dateStr) => {
        if (habit.startDate && dateStr < habit.startDate) return false
        if (isDateInLeaves(dateStr, myLeaves)) return false
        if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
          return habit.weekdays.map(Number).includes(date.getDay())
        }
        return true
      }
      
      // 获取本周一（周一为起始）
      const currentDay = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
      
      // 遍历本周一到周日：只显示今天（不管是否已打卡，支持更新）和未打卡的其他日期
      for (let i = 0; i <= 6; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = formatDateIso(d)
        
        if (needCheckInOnDate(d, dateStr)) {
          const alreadyChecked = isAlreadyChecked(dateStr)
          const isToday = dateStr === todayStr
          // 只有今天（已打卡也显示，方便更新）和未打卡的日期才显示
          if (isToday || !alreadyChecked) {
            dates.push({
              value: dateStr,
              label: isToday ? '今天' : `周${['日','一','二','三','四','五','六'][d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
              isToday,
              isFuture: dateStr > todayStr,
              alreadyChecked
            })
          }
        }
      }
      
      return dates
    })
    
    // 详情页子任务查看的星期几（默认今天）
    const detailViewWeekday = ref(new Date().getDay())
    
    // 详情页显示的任务清单（按星期几过滤）
    const detailViewSubTasks = computed(() => {
      if (!selectedHabit.value?.subTasks) return []
      const subTasks = selectedHabit.value.subTasks
      let tasks
      // 如果有 weekday 字段，按选择的星期几过滤
      if (subTasks.some(s => s.weekday !== undefined && s.weekday !== null)) {
        tasks = subTasks.filter(s => Number(s.weekday) === detailViewWeekday.value)
      } else {
        tasks = subTasks
      }
      // 为没有 id 的旧数据生成稳定 id
      return tasks.map((task, index) => ({
        ...task,
        id: task.id || task._id || `legacy-${index}-${task.title}`
      }))
    })
    
    // 获取子任务标题
    const getSubTaskTitle = (taskId) => {
      if (!selectedHabit.value?.subTasks) return taskId
      const task = selectedHabit.value.subTasks.find(st => 
        st._id === taskId || st.id === taskId || st._id?.toString() === taskId || st.id?.toString() === taskId
      )
      return task?.title || taskId
    }
    
    // 计划的打卡历史记录
    const habitCheckInHistory = computed(() => {
      if (!selectedHabit.value) return []
      
      const habitId = selectedHabit.value.id || selectedHabit.value._id
      const records = checkIns.value
        .filter(c => c.habitId === habitId)
        .sort((a, b) => b.date.localeCompare(a.date)) // 按日期倒序
        .slice(0, 20) // 最多显示最近20条
      
      // 补充用户信息
      return records.map(record => {
        const isSelf = record.userId === currentUser.value.id
        // 计算显示名称
        let displayName
        if (isSelf) {
          displayName = '我'
        } else {
          // 对方：备注名 > 昵称 > TA
          displayName = currentUser.value.partnerNote || partner.value.nickname || partner.value.name || 'TA'
        }
        return {
          ...record,
          user: isSelf ? currentUser.value : partner.value,
          displayName
        }
      })
    })
    
    // 检查子任务在选定日期是否已完成（详情页使用 detailViewWeekday）
    const isSubTaskCompleted = (taskId, taskTitle) => {
      if (!selectedHabit.value || !taskId) return false
      
      // 根据 detailViewWeekday 计算对应的日期
      const today = new Date()
      const todayWeekday = today.getDay()
      const diff = detailViewWeekday.value - todayWeekday
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + diff)
      const targetDateStr = formatDateIso(targetDate)
      
      const habitId = selectedHabit.value.id || selectedHabit.value._id
      const checkIn = checkIns.value.find(
        c => c.habitId === habitId && 
             c.userId === currentUser.value.id && 
             c.date === targetDateStr
      )
      if (!checkIn || !checkIn.completedSubTasks || checkIn.completedSubTasks.length === 0) return false
      const completedIds = checkIn.completedSubTasks.map(String)
      
      // 优先用 taskId 匹配
      if (completedIds.includes(String(taskId))) return true
      
      // 兼容：如果编辑 habit 后 id 变了，尝试用 taskTitle 匹配历史记录
      if (taskTitle) {
        const allTasks = selectedHabit.value.subTasks || []
        const matchedByTitle = allTasks.find(t => t.title === taskTitle)
        if (matchedByTitle && matchedByTitle.id && completedIds.includes(String(matchedByTitle.id))) {
          return true
        }
      }
      
      return false
    }
    
    // 检查某天是否有子任务
    const hasSubTasksForWeekday = (weekday) => {
      if (!selectedHabit.value?.subTasks) return false
      return selectedHabit.value.subTasks.some(s => s.weekday !== undefined && s.weekday !== null && Number(s.weekday) === weekday)
    }
    
    // 有子任务的星期几列表（用于详情页选择器）
    const availableDetailWeekdays = computed(() => {
      return WEEKDAYS.filter(day => hasSubTasksForWeekday(day.value))
    })
    
    // 是否显示周报按钮（本周有打卡记录才显示）
    // 本周第几天（1-7，周一开始）
    const currentWeekDay = computed(() => {
      const day = new Date().getDay()
      return day === 0 ? 7 : day
    })
    
    // 是否有本周打卡数据
    const hasWeeklyData = computed(() => {
      if (!weeklyReportData.value) return false
      return weeklyReportData.value.summary.myTotal > 0 || weeklyReportData.value.summary.partnerTotal > 0
    })
    
    // 是否完美打卡（全部子任务完成）
    const isPerfectCheckIn = computed(() => {
      const tasks = selectedDateSubTasks.value
      if (tasks.length === 0) return false // 无子任务不视为完美打卡
      return selectedDateCompletedTaskCount.value === tasks.length
    })

    const selectedDateCompletionRate = computed(() => {
      const total = selectedDateSubTasks.value.length
      if (!total) return 0
      return Math.round(selectedDateCompletedTaskCount.value / total * 100)
    })

    const selectedDateCompletedTaskIds = computed(() => {
      const validIds = new Set(selectedDateSubTasks.value.map(task => String(task.id)))
      return [...new Set(completedSubTasks.value.map(String))].filter(id => validIds.has(id))
    })

    const selectedDateCompletedTaskCount = computed(() => {
      return selectedDateCompletedTaskIds.value.length
    })

    const selectedDateSubTaskGroups = computed(() => {
      const completedSet = new Set(selectedDateCompletedTaskIds.value)
      const groups = []
      const indexByGroup = new Map()
      selectedDateSubTasks.value.forEach((task) => {
        const groupId = task.groupId || task.groupTitle || 'default'
        if (!indexByGroup.has(groupId)) {
          indexByGroup.set(groupId, groups.length)
          groups.push({
            id: groupId,
            title: task.groupTitle || '默认组',
            total: 0,
            completed: 0,
            targetText: '',
            tasks: []
          })
        }
        const group = groups[indexByGroup.get(groupId)]
        const done = completedSet.has(String(task.id))
        group.total += 1
        if (done) group.completed += 1
        if (!group.targetText && formatSubTaskTarget(task)) group.targetText = formatSubTaskTarget(task)
        group.tasks.push({ ...task, done })
      })
      return groups.map(group => ({
        ...group,
        remaining: Math.max(0, group.total - group.completed),
        nextTask: group.tasks.find(task => !task.done) || null,
        percent: group.total > 0 ? Math.round(group.completed / group.total * 100) : 0,
        complete: group.total > 0 && group.completed === group.total,
        statusText: group.total > 0 && group.completed === group.total
          ? '已闭环'
          : `${group.total - group.completed} 项待完成`
      }))
    })

    const selectedDateCompletedGroups = computed(() => {
      return selectedDateSubTaskGroups.value.filter(group => group.complete).length
    })

    const selectedDateNextGroup = computed(() => {
      return selectedDateSubTaskGroups.value.find(group => !group.complete) || null
    })

    const selectedDateNextTask = computed(() => {
      return selectedDateNextGroup.value?.nextTask || null
    })

    const selectedDateRemainingTaskCount = computed(() => {
      return Math.max(0, selectedDateSubTasks.value.length - selectedDateCompletedTaskCount.value)
    })

    const selectedDateRemainingGroupCount = computed(() => {
      return selectedDateSubTaskGroups.value.filter(group => !group.complete).length
    })

    const selectedDateCoach = computed(() => {
      const total = selectedDateSubTasks.value.length
      if (!total) {
        return {
          tone: 'rest',
          label: '无安排',
          title: '这一天没有子任务',
          detail: '如果这是健身计划，回到计划详情检查每周安排。'
        }
      }
      if (selectedDateCompletedTaskCount.value === 0) {
        const nextTask = selectedDateNextTask.value
        const target = formatSubTaskTarget(nextTask)
        return {
          tone: 'pending',
          label: '从这里开始',
          title: selectedDateNextGroup.value ? `先完成 ${selectedDateNextGroup.value.title}` : '先完成第一项',
          detail: nextTask ? `${nextTask.title}${target ? ` · ${target}` : ''}` : '先勾选今天完成的第一项。'
        }
      }
      if (isPerfectCheckIn.value) {
        return {
          tone: 'done',
          label: '已闭环',
          title: '今天的子计划全部完成',
          detail: '可以补一句训练感受，后面复盘会更有用。'
        }
      }
      const nextTask = selectedDateNextTask.value
      const target = formatSubTaskTarget(nextTask)
      return {
        tone: 'partial',
        label: `${selectedDateRemainingGroupCount.value} 组待收尾`,
        title: `还差 ${selectedDateRemainingTaskCount.value} 项`,
        detail: nextTask ? `下一项：${nextTask.title}${target ? ` · ${target}` : ''}` : '继续把剩余组收尾。'
      }
    })
    
    // 检查是否已有当天打卡记录
    const hasCheckedInOnDate = computed(() => {
      if (!selectedHabit.value || !checkInDate.value) return false
      return checkIns.value.some(ci => 
        ci.habitId === (selectedHabit.value.id || selectedHabit.value._id) && 
        ci.userId === currentUser.value.id && 
        ci.date === checkInDate.value
      )
    })
    
    // 打卡按钮状态
    const checkInButtonStatus = computed(() => {
      const tasks = selectedDateSubTasks.value
      const completed = selectedDateCompletedTaskCount.value
      const isUpdate = hasCheckedInOnDate.value
      const isFuture = checkInDate.value > getToday()
      
      // 检查是否已经完美打卡过了
      const existingCheckIn = checkIns.value.find(
        c => c.habitId === selectedHabit.value?.id && 
             c.userId === currentUser.value.id && 
             c.date === checkInDate.value
      )
      const alreadyPerfect = existingCheckIn?.isPerfect
      
      // 如果已经完美打卡过了，显示已完成状态
      if (alreadyPerfect) {
        return { disabled: true, text: '今日已完美打卡', type: 'completed' }
      }
      
      // 没有子任务的情况：按简单打卡处理
      if (tasks.length === 0) {
        const text = isUpdate 
          ? '更新打卡' 
          : (isFuture ? '提前打卡' : '确认打卡')
        return { disabled: false, text, type: 'normal' }
      }
      
      // 有子任务的情况
      if (completed === 0) {
        return { disabled: true, text: '请至少完成一项任务', type: 'disabled' }
      }
      if (completed === tasks.length) {
        const text = isUpdate
          ? '更新完美打卡'
          : (isFuture ? '提前完美打卡' : '完美打卡')
        return { disabled: false, text, type: 'perfect' }
      }
      const text = isUpdate 
        ? '更新打卡' 
        : (isFuture ? '提前打卡' : '确认打卡')
      return { disabled: false, text, type: 'normal' }
    })
    
    const selectedMood = ref('happy')
    const checkInNote = ref('')
    const numericValue = ref('')
    const completedSubTasks = ref([])

    const newHabitTitle = ref('')
    const newHabitDesc = ref('')
    const newHabitType = ref('simple')
    const newHabitParticipation = ref('both')
    const newHabitFrequency = ref('daily')
    const newHabitWeekdays = ref([1, 2, 3, 4, 5])
    const newHabitTarget = ref(21)
    const newHabitStartDate = ref(getToday())
    const newSubTasks = ref({
      default: ['', ''],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    })
    const newNumericUnit = ref('')
    const newNumericTarget = ref('')
    const activeWeekday = ref('default')
    const newSubTaskTemplate = ref('')
    const newReminderEnabled = ref(false)
    const newReminderTime = ref('21:00')

    // 编辑计划相关
    const showEditDialog = ref(false)
    const editingHabit = ref(null)
    const editHabitTitle = ref('')
    const editHabitDesc = ref('')
    const editHabitType = ref('simple')
    const editHabitParticipation = ref('both')
    const editHabitFrequency = ref('daily')
    const editHabitWeekdays = ref([1, 2, 3, 4, 5])
    const editSubTasks = ref({
      default: ['', ''],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    })
    const editNumericUnit = ref('')
    const editNumericTarget = ref('')
    const editHabitStartDate = ref(getToday())
    const editActiveWeekday = ref('default')
    const editSubTaskTemplate = ref('')
    const editReminderEnabled = ref(false)
    const editReminderTime = ref('21:00')

    // 编辑计划的计算属性
    const currentEditSubTasks = computed({
      get() {
        if (editHabitFrequency.value === 'weekly') {
          const dayMap = { '0': 'sunday', '1': 'monday', '2': 'tuesday', '3': 'wednesday', '4': 'thursday', '5': 'friday', '6': 'saturday' }
          const selectedDays = editHabitWeekdays.value.map(String)
          if (selectedDays.length > 0 && !selectedDays.includes(editActiveWeekday.value)) {
            editActiveWeekday.value = selectedDays[0]
          }
          const key = dayMap[editActiveWeekday.value] || 'monday'
          if (!editSubTasks.value[key] || editSubTasks.value[key].length === 0) {
            editSubTasks.value[key] = ['', '']
          }
          return editSubTasks.value[key]
        }
        return editSubTasks.value.default
      },
      set(val) {
        if (editHabitFrequency.value === 'weekly') {
          const dayMap = { '0': 'sunday', '1': 'monday', '2': 'tuesday', '3': 'wednesday', '4': 'thursday', '5': 'friday', '6': 'saturday' }
          const key = dayMap[editActiveWeekday.value] || 'monday'
          editSubTasks.value[key] = val
        } else {
          editSubTasks.value.default = val
        }
      }
    })

    // 切换编辑模式的星期几
    const toggleEditWeekday = (day) => {
      const idx = editHabitWeekdays.value.indexOf(day)
      if (idx > -1) {
        if (editHabitWeekdays.value.length > 1) editHabitWeekdays.value.splice(idx, 1)
      } else {
        editHabitWeekdays.value.push(day)
        editHabitWeekdays.value.sort()
      }
    }

    // 添加子任务
    const addEditSubTask = () => {
      currentEditSubTasks.value.push('')
    }

    // 删除子任务
    const removeEditSubTask = (i) => {
      if (currentEditSubTasks.value.length > 1) {
        currentEditSubTasks.value.splice(i, 1)
      }
    }

    // 是否有有效的子任务
    const hasValidEditSubTasks = computed(() => {
      if (editHabitFrequency.value === 'weekly') {
        return editHabitWeekdays.value.some(day => {
          const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
          const tasks = editSubTasks.value[dayMap[day]]
          return tasks && tasks.some(t => t.trim())
        })
      }
      return editSubTasks.value.default.some(t => t.trim())
    })

    const weekdayKeyMap = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 }
    const weekdayNameMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }

    const getTemplateTask = (templateName, weekday, index) => {
      if (templateName !== 'fitness') return null
      const key = weekday === undefined || weekday === null ? 'monday' : weekdayNameMap[weekday]
      return FITNESS_TEMPLATE[key]?.[index] || null
    }

    const buildSubTaskPayload = (titleValue, index, { weekday, key, templateName = '', oldSubTasks = [] } = {}) => {
      const title = String(titleValue || '').trim()
      if (!title) return null
      const oldTask = oldSubTasks.find(task => task.title === title && (weekday === undefined || Number(task.weekday) === weekday))
      const preset = getTemplateTask(templateName, weekday, index)
      return {
        id: oldTask?.id || preset?.id || `st-${key || 'default'}-${index}`,
        title,
        completed: false,
        ...(weekday !== undefined && weekday !== null ? { weekday } : {}),
        groupId: oldTask?.groupId || preset?.groupId || '',
        groupTitle: oldTask?.groupTitle || preset?.groupTitle || '',
        targetValue: oldTask?.targetValue ?? preset?.targetValue ?? 0,
        unit: oldTask?.unit || preset?.unit || '',
        intensity: oldTask?.intensity || preset?.intensity || '',
        order: index
      }
    }

    const applySubTaskTemplate = (mode, templateName) => {
      if (templateName !== 'fitness') return
      const targetSubTasks = mode === 'edit' ? editSubTasks : newSubTasks
      const targetFrequency = mode === 'edit' ? editHabitFrequency : newHabitFrequency
      const targetWeekdays = mode === 'edit' ? editHabitWeekdays : newHabitWeekdays
      const targetType = mode === 'edit' ? editHabitType : newHabitType
      const targetActiveWeekday = mode === 'edit' ? editActiveWeekday : activeWeekday
      const targetTemplate = mode === 'edit' ? editSubTaskTemplate : newSubTaskTemplate

      targetType.value = 'subtasks'
      targetFrequency.value = 'weekly'
      targetWeekdays.value = [1, 3, 5]
      targetActiveWeekday.value = '1'
      targetTemplate.value = 'fitness'
      targetSubTasks.value = {
        default: FITNESS_TEMPLATE.monday.map(task => task.title),
        monday: FITNESS_TEMPLATE.monday.map(task => task.title),
        tuesday: [],
        wednesday: FITNESS_TEMPLATE.wednesday.map(task => task.title),
        thursday: [],
        friday: FITNESS_TEMPLATE.friday.map(task => task.title),
        saturday: [],
        sunday: []
      }
    }

    const toast = ref({ show: false, message: '', type: 'info' })
    const pendingConfirmation = ref('')
    let toastTimer = null
    let confirmationTimer = null

    // 成就系统
    const achievements = ref([])
    const achievementPoints = ref(0)
    const achievementUnlock = ref({ show: false, achievement: null })
    const shownAchievements = ref(new Set())

    const showToast = (message, type = 'info') => {
      if (toastTimer) clearTimeout(toastTimer)
      toast.value = { show: true, message, type }
      toastTimer = setTimeout(() => {
        toast.value.show = false
        toastTimer = null
      }, 2500)
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
    
    // 页面可见性变化处理 - 切回前台时刷新数据
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchHabits()
        fetchCheckIns()
      }
    }

    const fetchUserInfo = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/user/profile', { headers: { Authorization: 'Bearer ' + getToken() } })
        const data = await res.json()
        if (data.success) {
          currentUser.value.id = data.user.id
          currentUser.value.name = data.user.nickname
          // 更新头像（使用用户首字母作为回退）
          currentUser.value.avatar = data.user.avatar || null
          
          // 获取伴侣信息
          if (data.user.partner) {
            partner.value.id = data.user.partner.id
            partner.value.nickname = data.user.partner.nickname || 'TA'
            partner.value.name = data.user.partnerNote || data.user.partner.nickname || 'TA'
            partner.value.avatar = data.user.partner.avatar || null
            partner.value.gender = data.user.partner.gender || null
          }
          
          // 存储我对对方的备注（用于后续更新）
          currentUser.value.partnerNote = data.user.partnerNote || ''
        }
      } catch (e) { console.error(e) }
    }

    const fetchHabits = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/habits', { headers: { Authorization: 'Bearer ' + getToken() } })
        const data = await res.json()
        if (data.success) habits.value = data.data.map(h => ({ ...h, id: h._id || h.id }))
      } catch (e) { console.error(e) }
    }

    const fetchCheckIns = async () => {
      try {
        const all = []
        for (const h of habits.value) {
          const res = await fetch(`${CONFIG.API_URL}/habits/${h.id}/checkins`, { headers: { Authorization: 'Bearer ' + getToken() } })
          const data = await res.json()
          if (data.success) all.push(...data.data.map(c => ({ ...c, habitId: h.id })))
        }
        checkIns.value = all
      } catch (e) { console.error(e) }
    }

    // 获取周报数据
    const fetchWeeklyReport = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/habits/weekly-report`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          weeklyReportData.value = data.data
        }
      } catch (e) { console.error('获取周报失败:', e) }
    }

    // 检查是否需要显示周报（周日首次打开）
    const checkAndShowWeeklyReport = () => {
      const today = new Date()
      const isSunday = today.getDay() === 0
      const reportKey = `weekly_report_seen_${getToday()}`
      const hasSeen = localStorage.getItem(reportKey)
      
      if (isSunday && !hasSeen && !hasSeenWeeklyReport.value) {
        fetchWeeklyReport().then(() => {
          if (weeklyReportData.value) {
            showWeeklyReport.value = true
            hasSeenWeeklyReport.value = true
            localStorage.setItem(reportKey, 'true')
          }
        })
      }
    }

    // 关闭周报
    const closeWeeklyReport = () => {
      showWeeklyReport.value = false
    }

    // 显示成就解锁弹窗
    const showAchievementUnlock = (achievement) => {
      achievementUnlock.value = { show: true, achievement }
      setTimeout(() => {
        achievementUnlock.value.show = false
      }, 4000)
    }
    
    // 从后端获取成就列表
    const fetchAchievements = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/achievements`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          achievements.value = data.data.achievements
          achievementPoints.value = data.data.points
        }
      } catch (e) { console.error('获取成就失败:', e) }
    }
    
    // 打卡/完成计划后触发后端成就检查
    const checkAchievements = async (showNotification = false) => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/achievements/check`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          // 刷新成就列表
          await fetchAchievements()
          // 显示新解锁弹窗
          if (showNotification && data.data.newUnlocks?.length > 0) {
            data.data.newUnlocks.forEach((ach, index) => {
              if (!shownAchievements.value.has(ach.id)) {
                shownAchievements.value.add(ach.id)
                setTimeout(() => showAchievementUnlock(ach), index * 500)
              }
            })
          }
        }
      } catch (e) { console.error('检查成就失败:', e) }
    }

    const getMaxStreak = (userId) => {
      let max = 0
      habits.value.forEach(h => { const s = getStreak(h.id, userId, h); if (s > max) max = s })
      return max
    }

    const unlockedCount = computed(() => achievements.value.filter(a => a.unlockedAt).length)

    const hasCheckedInToday = (habitId, userId) => checkIns.value.some(ci => ci.habitId === habitId && ci.userId === userId && ci.date === getToday())

    const getStreak = (habitId, userId, habit = null) => {
      const dates = [...new Set(checkIns.value.filter(ci => ci.habitId === habitId && ci.userId === userId).map(ci => ci.date))].sort((a, b) => b.localeCompare(a))
      if (dates.length === 0) return 0
      
      const habitConfig = habit ? { frequency: habit.frequency, weekdays: habit.weekdays } : null
      const startDate = habit?.startDate
      const leaves = habit?.leaves?.filter(l => l.userId === userId) || []
      
      // 辅助函数：获取本地日期字符串
      const getLocalDateStr = formatLocalDate
      
      // 如果没有配置或每天打卡，按原来的逻辑
      if (!habitConfig || habitConfig.frequency === 'daily' || !habitConfig.weekdays?.length) {
        let streak = 0
        const checkDate = new Date()
        for (let i = 0; i < 365; i++) {
          const dateStr = getLocalDateStr(checkDate)
          
          // 在开始日期之前，停止
          if (startDate && dateStr < startDate) break
          
          // 请假期间跳过（不断签但不加连续天数）
          if (isDateInLeaves(dateStr, leaves)) {
            checkDate.setDate(checkDate.getDate() - 1)
            continue
          }
          
          if (dates.includes(dateStr)) streak++
          else if (i > 0) break
          checkDate.setDate(checkDate.getDate() - 1)
        }
        return streak
      }
      
      // 按任务频率计算连续
      const weekdays = [...habitConfig.weekdays].sort((a, b) => b - a)
      const today = new Date()
      const todayWeekday = today.getDay()
      let streak = 0
      let checkDate = new Date(today)
      let dateIndex = 0
      
      // 检查今天
      let checkedToday = false
      if (weekdays.includes(todayWeekday)) {
        const todayStr = getToday()
        if (isDateInLeaves(todayStr, leaves)) {
          checkedToday = true
        } else if (dateIndex < dates.length && dates[dateIndex] === todayStr) {
          streak++
          dateIndex++
          checkedToday = true
        }
      } else {
        checkedToday = true
      }
      
      // 从昨天开始往前检查
      let daysBack = 0
      while (daysBack < 365) {
        checkDate.setDate(checkDate.getDate() - 1)
        daysBack++
        const checkWeekday = checkDate.getDay()
        const dateStr = getLocalDateStr(checkDate)
        
        // 在开始日期之前，停止
        if (startDate && dateStr < startDate) break
        
        // 这一天不需要打卡，跳过
        if (!weekdays.includes(checkWeekday)) continue
        
        // 请假期间跳过（不断签但不加连续天数）
        if (isDateInLeaves(dateStr, leaves)) {
          continue
        }
        
        // 这一天需要打卡
        if (dateIndex < dates.length && dates[dateIndex] === dateStr) {
          streak++
          dateIndex++
        } else {
          break
        }
      }
      
      return streak
    }

    const canCheckIn = (habit) => {
      if (!habit) return false
      const isCreator = habit.createdBy === currentUser.value.id
      if (habit.participation === 'self') return isCreator
      if (habit.participation === 'both') return true
      if (habit.participation === 'partner') return !isCreator
      return false
    }

    const canTakeLeave = (habit) => {
      if (!habit) return false
      const isCreator = habit.createdBy === currentUser.value.id
      if (habit.participation === 'both') return true
      if (habit.participation === 'self') return isCreator
      if (habit.participation === 'partner') return !isCreator
      return false
    }

    const canCompleteHabit = (habit) => {
      return !!habit?.createdBy && !!currentUser.value.id && String(habit.createdBy) === String(currentUser.value.id)
    }

    // 检查今天是否是补卡（用于补卡状态显示）
    // 补卡定义：今天的打卡记录是在今天之后创建的（实际上不会发生）
    // 或者今天的打卡记录是通过补卡界面创建的
    // 简化逻辑：只要今天有打卡，检查其创建时间即可
    const isTodayMakeUp = (habitId, userId) => {
      const todayStr = getToday()
      const todayCheckIn = checkIns.value.find(
        c => c.habitId === habitId && c.userId === userId && c.date === todayStr
      )
      if (!todayCheckIn) return false
      
      // 如果有 isMakeUp 标记，或者是今天创建的
      if (todayCheckIn.isMakeUp) return true
      
      // 检查创建时间是否是今天（通过比较日期字符串）
      if (todayCheckIn.createdAt) {
        const createdDate = formatLocalDate(todayCheckIn.createdAt)
        return createdDate !== todayStr
      }
      
      return false
    }

    const getHabitStatus = (habit) => {
      const selfChecked = hasCheckedInToday(habit.id, currentUser.value.id)
      const partnerChecked = hasCheckedInToday(habit.id, partner.value.id)
      // 今天是否是补卡（今天打卡且创建时间不是今天）
      const selfMakeUp = selfChecked && isTodayMakeUp(habit.id, currentUser.value.id)
      const partnerMakeUp = partnerChecked && isTodayMakeUp(habit.id, partner.value.id)
      
      switch (habit.participation) {
        case 'both': return { 
          canCheckIn: !selfChecked, 
          isComplete: selfChecked && partnerChecked, 
          isTodayComplete: selfChecked,
          isMakeUpComplete: selfMakeUp,
          selfChecked, 
          partnerChecked, 
          showBoth: true 
        }
        case 'self': return { 
          canCheckIn: !selfChecked, 
          isComplete: selfChecked,
          isTodayComplete: selfChecked,
          isMakeUpComplete: selfMakeUp,
          selfChecked, 
          partnerChecked: false, 
          showBoth: false 
        }
        case 'partner': return { 
          canCheckIn: false, 
          isComplete: partnerChecked,
          isTodayComplete: partnerChecked,
          isMakeUpComplete: partnerMakeUp,
          selfChecked: false, 
          partnerChecked, 
          showBoth: false 
        }
      }
      return { canCheckIn: false, isComplete: false, isTodayComplete: false, isMakeUpComplete: false, selfChecked: false, partnerChecked: false, showBoth: false }
    }

    const progress = computed(() => {
      let total = 0, completed = 0
      // 只计算今天需要打卡的任务，且只从当前用户视角统计
      const todayActiveHabits = habits.value.filter(habit => isHabitActiveToday(habit))
      
      todayActiveHabits.forEach(habit => {
        const status = getHabitStatus(habit)
        const isCreator = habit.createdBy === currentUser.value.id
        let myTask = false
        let myCompleted = false
        
        if (habit.participation === 'both') {
          myTask = true
          myCompleted = status.selfChecked
        } else if (habit.participation === 'self') {
          myTask = isCreator
          myCompleted = status.selfChecked
        } else if (habit.participation === 'partner') {
          myTask = !isCreator
          myCompleted = status.partnerChecked
        }
        
        if (myTask) {
          total += 1
          if (myCompleted) completed += 1
        }
      })
      return { completed, total, percent: total > 0 ? (completed / total) * 100 : 0 }
    })

    const planDashboard = computed(() => buildPlansExecutionDashboard(
      habits.value,
      checkIns.value,
      currentUser.value.id,
      partner.value.id,
      getToday()
    ))

    // 辅助函数：判断某天是否在请假期间
    const isDateInLeaves = (dateStr, leaves = []) => {
      return leaves.some(leave => dateStr >= leave.startDate && dateStr <= leave.endDate)
    }
    
    // 判断今天是否处于请假期间
    const isOnLeaveToday = (habit, userId = currentUser.value.id) => {
      const todayStr = getToday()
      const userLeaves = habit.leaves?.filter(l => l.userId === userId) || []
      return userLeaves.some(leave => todayStr >= leave.startDate && todayStr <= leave.endDate)
    }
    
    // 判断今天是否需要打卡（按星期几过滤、开始日期、请假）
    const isHabitActiveToday = (habit, userId = currentUser.value.id) => {
      const todayStr = getToday()
      // 在开始日期之前，不需要打卡
      if (habit.startDate && todayStr < habit.startDate) return false
      // 请假期间不需要打卡（仅判断指定用户的请假）
      if (isOnLeaveToday(habit, userId)) return false
      // 按星期几过滤
      if (habit.frequency !== 'weekly' || !habit.weekdays || habit.weekdays.length === 0) return true
      const todayWeekday = new Date().getDay()
      // 确保类型一致（转为数字比较）
      return habit.weekdays.map(Number).includes(todayWeekday)
    }
    
    const filteredHabits = computed(() => {
      if (filterType.value === 'all') return habits.value
      
      // 根据当前用户视角过滤
      return habits.value.filter(h => {
        const isCreator = h.createdBy === currentUser.value.id
        
        if (filterType.value === 'both') {
          // 两人一起：participation 为 both
          return h.participation === 'both'
        } else if (filterType.value === 'self') {
          // 仅自己：创建者是当前用户且 participation 为 self，
          // 或者创建者是对方且 participation 为 partner
          return (isCreator && h.participation === 'self') || (!isCreator && h.participation === 'partner')
        } else if (filterType.value === 'partner') {
          // 仅对方：创建者是对方且 participation 为 self，
          // 或者创建者是当前用户且 participation 为 partner
          return (!isCreator && h.participation === 'self') || (isCreator && h.participation === 'partner')
        }
        return true
      })
    })
    
    // 排序：
    // 1. 今天需要打卡且未完成的在前
    // 2. 今天需要打卡且已完成的次之
    // 3. 今天不需要打卡的排在最后（低调显示）
    const sortedHabits = computed(() => {
      return [...filteredHabits.value].sort((a, b) => {
        const aActiveToday = isHabitActiveToday(a)
        const bActiveToday = isHabitActiveToday(b)
        const aStatus = getHabitStatus(a)
        const bStatus = getHabitStatus(b)
        
        // 今天不需要打卡的任务排到最后
        if (!aActiveToday && bActiveToday) return 1
        if (aActiveToday && !bActiveToday) return -1
        
        // 今天都需要打卡或都不需要打卡时，按完成状态排序
        if (aActiveToday && bActiveToday) {
          if (aStatus.isComplete === bStatus.isComplete) return 0
          return aStatus.isComplete ? 1 : -1
        }
        
        // 都不需要打卡时，按标题排序
        return a.title.localeCompare(b.title)
      })
    })
    const filterTabs = [{ id: 'all', label: '全部' }, { id: 'both', label: '两人一起' }, { id: 'self', label: '仅自己' }, { id: 'partner', label: '仅对方' }]
    const mainTabs = [{ id: 'plans', label: '今日打卡' }, { id: 'stats', label: '数据统计' }, { id: 'achievements', label: '成就徽章' }]

    const participationLabel = (habit) => {
      const p = habit.participation
      if (p === 'both') return '两人一起'
      // 根据当前用户是否是创建者来显示
      const isCreator = habit.createdBy === currentUser.value.id
      if (p === 'self') return isCreator ? '仅自己' : '仅对方'
      if (p === 'partner') return isCreator ? '仅对方' : '仅自己'
      return ''
    }
    
    // 生成伪随机颜色（基于id，保证同一计划颜色固定）
    const getHabitColor = (habit) => {
      if (habit.color) return habit.color
      // 基于id生成固定的伪随机颜色
      const id = habit.id || habit._id || ''
      let hash = 0
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
      }
      // 从预设的柔和颜色中选取
      const colors = ['#A24363', '#526F5C', '#B65F4A', '#D8A94E', '#7C7480', '#8B5E69', '#476A73', '#9B6A4A']
      const index = Math.abs(hash) % colors.length
      return colors[index]
    }
    const getTrend = (habit) => {
      const targetUserId = currentUser.value.id
      const records = habit.numericRecords?.filter(r => r.userId === targetUserId) || []
      if (records.length < 2) return null
      const recent = records.slice(-7)
      const first = recent[0].value
      const last = recent[recent.length - 1].value
      const change = last - first
      const isGood = habit.numericConfig?.lowerIsBetter ? change < 0 : change > 0
      return { change: Math.abs(change).toFixed(1), percent: Math.abs(first !== 0 ? (change / first) * 100 : 0).toFixed(1), isGood, direction: change > 0 ? 'up' : 'down' }
    }

    // ========== 数据统计页计算属性 ==========
    const monthlyCheckInDays = computed(() => {
      const currentMonth = getToday().slice(0, 7)
      const dates = new Set(checkIns.value.filter(c => c.userId === currentUser.value.id && c.date.startsWith(currentMonth)).map(c => c.date))
      return dates.size
    })
    const myMaxStreak = computed(() => {
      let max = 0
      habits.value.forEach(h => { const s = getStreak(h.id, currentUser.value.id, h); if (s > max) max = s })
      return max
    })
    const bothCompletedTotal = computed(() => {
      const bothHabits = habits.value.filter(h => h.participation === 'both')
      let count = 0
      bothHabits.forEach(h => {
        const myDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === currentUser.value.id).map(c => c.date))
        const partnerDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === partner.value.id).map(c => c.date))
        myDates.forEach(d => { if (partnerDates.has(d)) count++ })
      })
      return count
    })
    const totalMyCheckIns = computed(() => checkIns.value.filter(c => c.userId === currentUser.value.id).length)
    const weeklyTrend = computed(() => {
      const days = []
      const today = new Date()
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        const dateStr = formatLocalDate(d)
        const count = checkIns.value.filter(c => c.userId === currentUser.value.id && c.date === dateStr).length
        days.push({ date: dateStr, label: ['日','一','二','三','四','五','六'][d.getDay()], count })
      }
      return days
    })
    const habitRankList = computed(() => {
      return habits.value.map(h => ({
        id: h.id || h._id,
        title: h.title,
        streak: getStreak(h.id, currentUser.value.id, h),
        total: checkIns.value.filter(c => c.habitId === h.id && c.userId === currentUser.value.id).length
      })).sort((a, b) => b.streak - a.streak || b.total - a.total).slice(0, 5)
    })

    const calendarDays = computed(() => {
      const days = []
      const t = new Date()
      for (let i = 29; i >= 0; i--) { const d = new Date(t); d.setDate(d.getDate() - i); days.push(d) }
      return days
    })

    const formatDateIso = (date) => formatLocalDate(date)
    const getDayCheckIns = (date, userId) => checkIns.value.filter(ci => ci.date === formatDateIso(date) && ci.userId === userId).length
    const hasCheckInOnDay = (habitId, dateStr, userId) => checkIns.value.some(ci => ci.habitId === habitId && ci.date === dateStr && ci.userId === userId)

    const findHabitByExecutionCard = (card) => {
      return habits.value.find(habit => (habit.id || habit._id) === card?.id) || null
    }

    const openPlanExecutionCard = (card) => {
      const habit = findHabitByExecutionCard(card)
      if (!habit) return
      if (card.state === 'pending' || card.state === 'partial' || card.state === 'done') {
        openCheckIn(habit)
      } else {
        openDetail(habit)
      }
    }

    const openPlanDashboardFocus = () => {
      if (planDashboard.value.focus) openPlanExecutionCard(planDashboard.value.focus)
    }

    const openCheckIn = (habit, date = null) => {
      selectedHabit.value = habit
      
      // 设置默认打卡日期为今天（或指定日期）
      let targetDate = date || getToday()
      
      // 如果今天不在本周可选列表里（比如非打卡日），自动选中第一个未打卡日期
      const availableDates = availableCheckInDates.value
      const todayInList = availableDates.some(d => d.value === targetDate)
      if (availableDates.length > 0 && !todayInList) {
        const firstUnchecked = availableDates.find(d => !d.alreadyChecked)
        targetDate = firstUnchecked ? firstUnchecked.value : availableDates[0].value
      }
      
      checkInDate.value = targetDate
      
      // 检查是否已有打卡记录（支持追加打卡模式）
      const existingCheckIn = checkIns.value.find(ci => 
        ci.habitId === (habit.id || habit._id) && 
        ci.userId === currentUser.value.id && 
        ci.date === targetDate
      )
      
      if (existingCheckIn) {
        // 加载已有打卡记录
        completedSubTasks.value = existingCheckIn.completedSubTasks || []
        numericValue.value = existingCheckIn.numericValue !== undefined && existingCheckIn.numericValue !== null 
          ? existingCheckIn.numericValue.toString() 
          : ''
        selectedMood.value = existingCheckIn.mood || 'happy'
        checkInNote.value = existingCheckIn.note || ''
      } else {
        // 默认不勾选任何子任务（用户主动选择）
        completedSubTasks.value = []
        numericValue.value = ''
        selectedMood.value = 'happy'
        checkInNote.value = ''
      }
      
      showCheckInDialog.value = true
    }

    const openDetail = (habit) => { 
      selectedHabit.value = habit
      detailViewWeekday.value = new Date().getDay()
      showDetailDialog.value = true 
    }

    // 打开编辑计划弹窗
    const openEditHabit = () => {
      if (!selectedHabit.value) return
      const habit = selectedHabit.value
      editingHabit.value = habit
      editHabitTitle.value = habit.title
      editHabitDesc.value = habit.description || ''
      editHabitType.value = habit.type || 'simple'
      editHabitParticipation.value = habit.participation || 'both'
      editHabitFrequency.value = habit.frequency || 'daily'
      editHabitWeekdays.value = habit.weekdays || [1, 2, 3, 4, 5]
      editHabitStartDate.value = habit.startDate || getToday()
      editReminderEnabled.value = habit.reminderEnabled || false
      editReminderTime.value = habit.reminderTime || '21:00'
      editSubTaskTemplate.value = ''
      
      // 初始化子任务
      editSubTasks.value = {
        default: ['', ''],
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: [],
      }
      if (habit.subTasks) {
        const hasWeekday = habit.subTasks.some(s => s.weekday !== undefined && s.weekday !== null)
        if (hasWeekday) {
          // 按周几分组
          const weekdayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
          habit.subTasks.forEach(task => {
            const key = weekdayMap[task.weekday]
            if (key) {
              editSubTasks.value[key].push(task.title)
            }
          })
          // 确保每项至少有两个空位
          Object.keys(editSubTasks.value).forEach(key => {
            if (editSubTasks.value[key].length === 0) {
              editSubTasks.value[key] = ['', '']
            }
          })
        } else {
          editSubTasks.value.default = habit.subTasks.map(s => s.title)
          if (editSubTasks.value.default.length < 2) {
            editSubTasks.value.default.push('')
          }
        }
      }
      
      // 初始化数值配置
      if (habit.numericConfig) {
        editNumericUnit.value = habit.numericConfig.unit || ''
        editNumericTarget.value = habit.numericConfig.targetValue?.toString() || ''
      } else {
        editNumericUnit.value = ''
        editNumericTarget.value = ''
      }
      
      editActiveWeekday.value = 'default'
      showDetailDialog.value = false
      showEditDialog.value = true
    }
    
    // 编辑计划提交
    const handleEditHabit = async () => {
      if (!editingHabit.value || !editHabitTitle.value.trim()) return
      try {
        // 处理子任务
        let subTasks = undefined
        if (editHabitType.value === 'subtasks') {
          const oldSubTasks = editingHabit.value?.subTasks || []
          if (editHabitFrequency.value === 'weekly') {
            subTasks = []
            Object.entries(weekdayKeyMap).forEach(([key, weekday]) => {
              const tasks = editSubTasks.value[key] || []
              tasks.filter(s => s.trim()).forEach((s, i) => {
                const task = buildSubTaskPayload(s, i, { weekday, key, templateName: editSubTaskTemplate.value, oldSubTasks })
                if (task) subTasks.push(task)
              })
            })
          } else {
            subTasks = editSubTasks.value.default
              .map((s, i) => buildSubTaskPayload(s, i, { key: 'default', templateName: editSubTaskTemplate.value, oldSubTasks }))
              .filter(Boolean)
          }
        }
        
        const body = {
          title: editHabitTitle.value,
          description: editHabitDesc.value,
          type: editHabitType.value,
          participation: editHabitParticipation.value,
          frequency: editHabitFrequency.value,
          weekdays: editHabitFrequency.value === 'weekly' ? editHabitWeekdays.value : undefined,
          startDate: editHabitStartDate.value,
          subTasks,
          numericConfig: editHabitType.value === 'numeric' && editNumericUnit.value ? 
            { unit: editNumericUnit.value, targetValue: parseFloat(editNumericTarget.value) || 0, lowerIsBetter: false } : 
            undefined,
          reminderEnabled: editReminderEnabled.value,
          reminderTime: editReminderTime.value,
        }
        
        const res = await fetch(`${CONFIG.API_URL}/habits/${editingHabit.value.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.success) {
          // 更新本地数据
          const idx = habits.value.findIndex(h => h.id === editingHabit.value.id)
          if (idx > -1) {
            habits.value[idx] = { ...habits.value[idx], ...data.data }
          }
          showEditDialog.value = false
          editingHabit.value = null
          showToast('计划更新成功！', 'success')
          // 刷新详情
          await fetchHabits()
        } else {
          showToast(data.message, 'error')
        }
      } catch (e) { 
        showToast('网络错误', 'error') 
      }
    }
    
    // 删除计划
    const deleteHabit = async (habit) => {
      if (!requireSecondAction(`delete:${habit.id}`, `再次点击删除「${habit.title}」`)) return
      try {
        const res = await fetch(`${CONFIG.API_URL}/habits/${habit.id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          const idx = habits.value.findIndex(h => h.id === habit.id)
          if (idx > -1) habits.value.splice(idx, 1)
          showDetailDialog.value = false
          showToast('计划已删除', 'success')
        } else {
          showToast(data.message, 'error')
        }
      } catch (e) { 
        showToast('网络错误', 'error') 
      }
    }

    // 监听打卡日期变化，自动加载对应日期的打卡记录
    watch(checkInDate, (newDate) => {
      if (!showCheckInDialog.value || !selectedHabit.value || !newDate) return
      const existingCheckIn = checkIns.value.find(ci =>
        ci.habitId === (selectedHabit.value.id || selectedHabit.value._id) &&
        ci.userId === currentUser.value.id &&
        ci.date === newDate
      )
      if (existingCheckIn) {
        completedSubTasks.value = existingCheckIn.completedSubTasks || []
        numericValue.value = existingCheckIn.numericValue !== undefined && existingCheckIn.numericValue !== null
          ? existingCheckIn.numericValue.toString()
          : ''
        selectedMood.value = existingCheckIn.mood || 'happy'
        checkInNote.value = existingCheckIn.note || ''
      } else {
        completedSubTasks.value = []
        numericValue.value = ''
        selectedMood.value = 'happy'
        checkInNote.value = ''
      }
    })

    const toggleSubTask = (taskId) => {
      if (completedSubTasks.value.includes(taskId)) completedSubTasks.value = completedSubTasks.value.filter(id => id !== taskId)
      else completedSubTasks.value.push(taskId)
    }

    const completeAllSubTasks = () => {
      completedSubTasks.value = selectedDateSubTasks.value.map(task => task.id)
    }

    const clearCompletedSubTasks = () => {
      completedSubTasks.value = []
    }

    const toggleSubTaskGroup = (group) => {
      const groupIds = group.tasks.map(task => task.id)
      if (group.complete) {
        completedSubTasks.value = completedSubTasks.value.filter(id => !groupIds.includes(id))
        return
      }
      completedSubTasks.value = [...new Set([...completedSubTasks.value, ...groupIds])]
    }

    // 完成计划（归档）
    const completeHabit = async (habit) => {
      if (!canCompleteHabit(habit)) {
        showToast('只有创建者可以完成计划', 'error')
        return
      }
      if (!requireSecondAction(`complete:${habit.id}`, '再次点击完成这个计划')) return
      try {
        const res = await fetch(`${CONFIG.API_URL}/habits/${habit.id}/complete`, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          // 从列表中移除或标记为已完成
          const idx = habits.value.findIndex(h => h.id === habit.id)
          if (idx > -1) habits.value.splice(idx, 1)
          showToast('计划已完成', 'success')
          checkAchievements(true)
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const handleCheckIn = async () => {
      if (!selectedHabit.value) return
      // 检查是否至少完成了一项（仅当有子任务时）
      const hasSubTasks = selectedDateSubTasks.value.length > 0
      const cleanCompletedSubTasks = selectedHabit.value.type === 'subtasks' ? selectedDateCompletedTaskIds.value : undefined
      if (selectedHabit.value.type === 'subtasks' && hasSubTasks && cleanCompletedSubTasks.length === 0) {
        showToast('请至少完成一项子任务', 'error')
        return
      }
      try {
        const body = {
          date: checkInDate.value,
          mood: selectedMood.value,
          note: checkInNote.value,
          completedSubTasks: cleanCompletedSubTasks,
          numericValue: selectedHabit.value.type === 'numeric' ? parseFloat(numericValue.value) : undefined,
          isPerfect: isPerfectCheckIn.value
        }
        const res = await fetch(`${CONFIG.API_URL}/habits/${selectedHabit.value.id}/checkin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.success) {
          // 支持追加打卡模式：更新或添加打卡记录
          const habitId = selectedHabit.value.id || selectedHabit.value._id
          const existingIndex = checkIns.value.findIndex(ci => 
            ci.habitId === habitId && 
            ci.userId === currentUser.value.id && 
            ci.date === checkInDate.value
          )
          if (existingIndex > -1) {
            // 更新已有记录
            checkIns.value[existingIndex] = { ...data.data, habitId }
          } else {
            // 添加新记录
            checkIns.value.push({ ...data.data, habitId })
          }
          
          if (selectedHabit.value.type === 'numeric' && numericValue.value) {
            const h = habits.value.find(h => h.id === selectedHabit.value.id)
            if (h) { 
              h.numericRecords = h.numericRecords || []
              const existingRecordIndex = h.numericRecords.findIndex(r => r.date === checkInDate.value && r.userId === currentUser.value.id)
              if (existingRecordIndex > -1) {
                h.numericRecords[existingRecordIndex] = { date: checkInDate.value, value: parseFloat(numericValue.value), userId: currentUser.value.id, note: checkInNote.value }
              } else {
                h.numericRecords.push({ date: checkInDate.value, value: parseFloat(numericValue.value), userId: currentUser.value.id, note: checkInNote.value })
              }
            }
          }
          showCheckInDialog.value = false
          
          // 根据打卡类型显示不同提示
          const isToday = checkInDate.value === getToday()
          const isFuture = checkInDate.value > getToday()
          const isUpdate = data.isUpdate
          if (isPerfectCheckIn.value) {
            if (isFuture) {
              showToast(isUpdate ? '提前完美打卡已更新' : '提前完美打卡成功', 'success')
            } else if (isToday) {
              showToast(isUpdate ? '完美打卡已更新' : '完美打卡完成', 'success')
            } else {
              showToast('完美补卡成功', 'success')
            }
          } else {
            if (isFuture) {
              showToast(isUpdate ? '提前打卡已更新' : '提前打卡成功，继续保持', 'success')
            } else if (isToday) {
              showToast(isUpdate ? '打卡已更新，继续保持' : '打卡成功，继续保持', 'success')
            } else {
              showToast('补卡成功', 'success')
            }
          }
          
          // 检查成就并显示解锁提示（如果是新解锁的）
          setTimeout(() => checkAchievements(true), 500)
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const handleAddHabit = async () => {
      if (!newHabitTitle.value.trim()) return
      try {
        // 处理子任务：统一使用数组格式，weekly 类型添加 weekday 字段
        let subTasks = undefined
        if (newHabitType.value === 'subtasks') {
          if (newHabitFrequency.value === 'weekly') {
            // 按星期设置的不同子任务，统一转换成数组格式
            subTasks = []
            Object.entries(weekdayKeyMap).forEach(([key, weekday]) => {
              const tasks = newSubTasks.value[key] || []
              tasks.filter(s => s.trim()).forEach((s, i) => {
                const task = buildSubTaskPayload(s, i, { weekday, key, templateName: newSubTaskTemplate.value })
                if (task) subTasks.push(task)
              })
            })
          } else {
            // 默认子任务
            subTasks = newSubTasks.value.default
              .map((s, i) => buildSubTaskPayload(s, i, { key: 'default', templateName: newSubTaskTemplate.value }))
              .filter(Boolean)
          }
        }
        const body = {
          title: newHabitTitle.value,
          description: newHabitDesc.value,
          type: newHabitType.value,
          participation: newHabitParticipation.value,
          frequency: newHabitFrequency.value,
          weekdays: newHabitFrequency.value === 'weekly' ? newHabitWeekdays.value : undefined,
          startDate: newHabitStartDate.value,
          subTasks,
          numericConfig: newHabitType.value === 'numeric' && newNumericUnit.value ? { unit: newNumericUnit.value, targetValue: parseFloat(newNumericTarget.value) || 0, lowerIsBetter: false } : undefined,
          reminderEnabled: newReminderEnabled.value,
          reminderTime: newReminderTime.value,
        }
        const res = await fetch(CONFIG.API_URL + '/habits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify(body)
        })
        const data = await res.json()
        if (data.success) {
          habits.value.unshift({ ...data.data, id: data.data._id || data.data.id })
          showAddDialog.value = false
          resetNewHabitForm()
          showToast('计划添加成功！', 'success')
          fetchAchievements()
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const resetNewHabitForm = () => {
      newHabitTitle.value = ''; newHabitDesc.value = ''
      newHabitType.value = 'simple'; newHabitParticipation.value = 'both'; newHabitFrequency.value = 'daily'
      newHabitWeekdays.value = [1, 2, 3, 4, 5]; newHabitStartDate.value = getToday(); activeWeekday.value = 'default'
      newSubTasks.value = { default: ['', ''], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }
      newSubTaskTemplate.value = ''
      newNumericUnit.value = ''; newNumericTarget.value = ''
      newReminderEnabled.value = false; newReminderTime.value = '21:00'
    }

    // 切换星期几
    const toggleWeekday = (day) => {
      const idx = newHabitWeekdays.value.indexOf(day)
      if (idx > -1) {
        if (newHabitWeekdays.value.length > 1) newHabitWeekdays.value.splice(idx, 1)
      } else {
        newHabitWeekdays.value.push(day)
        newHabitWeekdays.value.sort()
      }
    }

    // 当前显示的子任务列表
    const currentSubTasks = computed({
      get() {
        if (newHabitFrequency.value === 'weekly') {
          const dayMap = { '0': 'sunday', '1': 'monday', '2': 'tuesday', '3': 'wednesday', '4': 'thursday', '5': 'friday', '6': 'saturday' }
          // 如果 activeWeekday 不是选中的工作日，自动切换到第一个选中的
          const selectedDays = newHabitWeekdays.value.map(String)
          if (selectedDays.length > 0 && !selectedDays.includes(activeWeekday.value)) {
            activeWeekday.value = selectedDays[0]
          }
          const key = dayMap[activeWeekday.value] || 'monday'
          if (!newSubTasks.value[key] || newSubTasks.value[key].length === 0) {
            newSubTasks.value[key] = ['', '']
          }
          return newSubTasks.value[key]
        }
        return newSubTasks.value.default
      },
      set(val) {
        if (newHabitFrequency.value === 'weekly') {
          const dayMap = { '0': 'sunday', '1': 'monday', '2': 'tuesday', '3': 'wednesday', '4': 'thursday', '5': 'friday', '6': 'saturday' }
          const key = dayMap[activeWeekday.value] || 'monday'
          newSubTasks.value[key] = val
        } else {
          newSubTasks.value.default = val
        }
      }
    })

    // 添加子任务
    const addSubTask = () => {
      currentSubTasks.value.push('')
    }

    // 删除子任务
    const removeSubTask = (i) => {
      if (currentSubTasks.value.length > 1) {
        currentSubTasks.value.splice(i, 1)
      }
    }

    // 是否有有效的子任务
    const hasValidSubTasks = computed(() => {
      if (newHabitFrequency.value === 'weekly') {
        return newHabitWeekdays.value.some(day => {
          const dayMap = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' }
          const tasks = newSubTasks.value[dayMap[day]]
          return tasks && tasks.some(t => t.trim())
        })
      }
      return newSubTasks.value.default.some(t => t.trim())
    })

    const chartData = computed(() => {
      if (!selectedHabit.value?.numericRecords) return []
      return selectedHabit.value.numericRecords.filter(r => r.userId === currentUser.value.id).slice(-14).map(r => {
        const d = new Date(r.date)
        return { date: `${d.getMonth() + 1}/${d.getDate()}`, value: r.value }
      })
    })

    // CSS 折线图计算
    // 图表数据范围
    const chartRange = computed(() => {
      if (chartData.value.length === 0) return { min: 0, max: 100, range: 100 }
      const values = chartData.value.map(d => d.value)
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      // 添加10%边距
      const padding = (maxVal - minVal) * 0.1 || maxVal * 0.1 || 1
      const min = Math.max(0, minVal - padding)
      const max = maxVal + padding
      return { min, max, range: max - min || 1 }
    })
    
    // Y轴刻度（5个刻度，从上到下：max, 75%, 50%, 25%, min）
    const yAxisTicks = computed(() => {
      const { min, max } = chartRange.value
      const ticks = []
      for (let i = 4; i >= 0; i--) {
        const value = min + (max - min) * (i / 4)
        // 根据数值大小决定显示格式
        let formatted
        if (value >= 10000) formatted = (value / 1000).toFixed(0) + 'k'
        else if (value >= 1000) formatted = (value / 1000).toFixed(1) + 'k'
        else if (value >= 100) formatted = Math.round(value).toString()
        else if (value >= 10) formatted = value.toFixed(1)
        else formatted = value.toFixed(2)
        ticks.push({ value, formatted, index: i })
      }
      return ticks
    })
    
    // X轴刻度 - 均匀分布显示
    const xAxisTicks = computed(() => {
      if (chartData.value.length === 0) return []
      const total = chartData.value.length
      // 根据数据量决定显示几个刻度
      const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
      const ticks = []
      for (let i = 0; i < maxTicks; i++) {
        const index = Math.round((i / (maxTicks - 1)) * (total - 1))
        ticks.push(chartData.value[index]?.date || '')
      }
      return ticks
    })
    
    // SVG 图表数据 - viewBox="0 0 100 100"
    const svgPointsData = computed(() => {
      if (chartData.value.length === 0) return []
      const { min, max } = chartRange.value
      const range = max - min || 1
      
      return chartData.value.map((d, i) => {
        // X坐标：均匀分布在 5 - 95 之间
        const x = chartData.value.length === 1 
          ? 50 
          : 5 + (i / (chartData.value.length - 1)) * 90
        // Y坐标：值越大越靠上(y越小)，范围 5 - 95
        const ratio = (d.value - min) / range
        const y = 95 - ratio * 90
        
        return { x, y: Math.max(5, Math.min(95, y)), value: d.value, date: d.date }
      })
    })
    
    const svgPoints = computed(() => {
      return svgPointsData.value.map(p => `${p.x},${p.y}`).join(' ')
    })
    
    // 生成平滑曲线路径
    const svgPath = computed(() => {
      if (svgPointsData.value.length < 2) return ''
      const points = svgPointsData.value
      if (points.length === 2) {
        return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
      }
      // 使用 Catmull-Rom 样条转换为三次贝塞尔曲线
      let d = `M ${points[0].x} ${points[0].y}`
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[Math.min(points.length - 1, i + 2)]
        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
      }
      return d
    })
    
    // CSS 点定位数据
    const chartPointsCSS = computed(() => {
      return svgPointsData.value.map(p => ({
        value: p.value,
        date: p.date,
        style: {
          left: p.x + '%',
          top: p.y + '%'
        }
      }))
    })

    // 打开请假弹窗
    const openLeaveDialog = () => {
      if (!selectedHabit.value) return
      leaveStartDate.value = getToday()
      leaveEndDate.value = getToday()
      leaveReason.value = ''
      showDetailDialog.value = false
      showLeaveDialog.value = true
    }
    
    // 提交请假
    const handleAddLeave = async () => {
      if (!selectedHabit.value || !leaveStartDate.value || !leaveEndDate.value) return
      if (leaveStartDate.value > leaveEndDate.value) {
        showToast('开始日期不能晚于结束日期', 'error')
        return
      }
      try {
        const res = await fetch(`${CONFIG.API_URL}/habits/${selectedHabit.value.id}/leave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
          body: JSON.stringify({
            startDate: leaveStartDate.value,
            endDate: leaveEndDate.value,
            reason: leaveReason.value
          })
        })
        const data = await res.json()
        if (data.success) {
          // 更新本地数据
          const idx = habits.value.findIndex(h => h.id === selectedHabit.value.id)
          if (idx > -1) {
            habits.value[idx] = { ...habits.value[idx], ...data.data }
          }
          showLeaveDialog.value = false
          selectedHabit.value = { ...selectedHabit.value, ...data.data }
          showToast('请假申请已提交', 'success')
        } else {
          showToast(data.message, 'error')
        }
      } catch (e) { showToast('网络错误', 'error') }
    }
    
    // 删除请假
    const deleteLeave = async (leaveId) => {
      if (!selectedHabit.value || !leaveId) return
      if (!requireSecondAction(`leave:${selectedHabit.value.id}:${leaveId}`, '再次点击删除这条请假记录')) return
      try {
        const res = await fetch(`${CONFIG.API_URL}/habits/${selectedHabit.value.id}/leave/${leaveId}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          const idx = habits.value.findIndex(h => h.id === selectedHabit.value.id)
          if (idx > -1) {
            habits.value[idx] = { ...habits.value[idx], ...data.data }
          }
          selectedHabit.value = { ...selectedHabit.value, ...data.data }
          showToast('请假记录已删除', 'success')
        } else {
          showToast(data.message, 'error')
        }
      } catch (e) { showToast('网络错误', 'error') }
    }

    const goBack = () => router.push('/home')

    // WebSocket 消息处理 - 实时同步
    const { onMessage } = useWebSocket()
    
    const handleWSMessage = (data) => {
      // 打卡相关消息
      if (data.type?.startsWith('habit') || data.type?.startsWith('achievement')) {
        // 刷新习惯列表和打卡记录（强制刷新，禁用缓存）
        fetchHabits()
        fetchCheckIns()
        // 如果有成就解锁，也刷新成就
        if (data.type === 'achievementSync') {
          fetchAchievements()
        }
      }
    }
    
    let unsubscribeWS = null
    
    onMounted(async () => {
      const token = getToken()
      if (token) { try { currentUser.value.id = JSON.parse(atob(token.split('.')[1])).userId } catch (e) {} }
      await fetchUserInfo()
      await fetchHabits()
      await fetchCheckIns()
      fetchAchievements()
      loading.value = false
      
      // 监听页面可见性变化，切回前台时刷新数据
      document.addEventListener('visibilitychange', handleVisibilityChange)
      // 周日检查是否显示周报
      setTimeout(checkAndShowWeeklyReport, 500)
      
      // 订阅 WebSocket 消息
      unsubscribeWS = onMessage(handleWSMessage)
    })
    
    onUnmounted(() => {
      if (unsubscribeWS) unsubscribeWS()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (toastTimer) clearTimeout(toastTimer)
      if (confirmationTimer) clearTimeout(confirmationTimer)
    })

    return {
      loading, habits, checkIns, currentUser, partner, activeTab, filterType,
      showCheckInDialog, showAddDialog, showDetailDialog, selectedHabit,
      selectedMood, checkInNote, numericValue, completedSubTasks, selectedDateSubTasks, selectedDateCompletedTaskIds, selectedDateCompletedTaskCount, selectedDateSubTaskGroups, selectedDateCompletedGroups, selectedDateCompletionRate,
      selectedDateNextGroup, selectedDateNextTask, selectedDateRemainingTaskCount, selectedDateRemainingGroupCount, selectedDateCoach,
      checkInDate, availableCheckInDates, isPerfectCheckIn, checkInButtonStatus, hasCheckedInOnDate,
      detailViewWeekday, detailViewSubTasks, isSubTaskCompleted, getSubTaskTitle, hasSubTasksForWeekday, availableDetailWeekdays, hasWeeklyData, currentWeekDay, habitCheckInHistory,
      newHabitTitle, newHabitDesc, newHabitType,
      newHabitParticipation, newHabitFrequency, newHabitWeekdays, newHabitStartDate, newSubTasks, newNumericUnit, newNumericTarget, activeWeekday,
      newReminderEnabled, newReminderTime,
      toast, today, achievements, achievementPoints, unlockedCount, progress, planDashboard, filteredHabits, sortedHabits, achievementUnlock, fetchAchievements, checkAchievements,
      filterTabs, mainTabs, calendarDays, chartData, svgPointsData, svgPoints, svgPath, chartPointsCSS, yAxisTicks, xAxisTicks,
      monthlyCheckInDays, myMaxStreak, bothCompletedTotal, totalMyCheckIns, weeklyTrend, habitRankList, hasCheckInOnDay,
      MOODS, COLORS, PARTICIPATION_OPTIONS, CREATE_PARTICIPATION_OPTIONS, FREQUENCY_OPTIONS, WEEKDAYS, habitTypes,
      participationLabel, getHabitStatus, getHabitColor, getStreak, canCheckIn, canTakeLeave, canCompleteHabit, isHabitActiveToday, isOnLeaveToday,
      getToday, getTrend, formatDateIso, getDayCheckIns, openCheckIn, openDetail, openPlanExecutionCard, openPlanDashboardFocus, toggleSubTask, toggleSubTaskGroup, completeAllSubTasks, clearCompletedSubTasks, getTodaySubTaskCount, getTodaySubPlanCount, formatSubTaskTarget,
      handleCheckIn, handleAddHabit, goBack,
      toggleWeekday, currentSubTasks, addSubTask, removeSubTask, hasValidSubTasks, applySubTaskTemplate,
      completeHabit, showAchievementUnlock,
      // 编辑相关
      showEditDialog, editingHabit, editHabitTitle, editHabitDesc, editHabitType, editHabitParticipation, editHabitFrequency, editHabitWeekdays, editHabitStartDate, editSubTasks, editNumericUnit, editNumericTarget, editActiveWeekday,
      editReminderEnabled, editReminderTime,
      currentEditSubTasks, toggleEditWeekday, addEditSubTask, removeEditSubTask, hasValidEditSubTasks,
      openEditHabit, handleEditHabit, deleteHabit,
      // 请假相关
      showLeaveDialog, leaveStartDate, leaveEndDate, leaveReason, leaveDays, monthlyLeaveCount, myLeaves, partnerLeaves, openLeaveDialog, handleAddLeave, deleteLeave,
      // 周报相关
      showWeeklyReport, weeklyReportData, closeWeeklyReport, fetchWeeklyReport,
    }
  }
}
</script>
<style scoped>
.plans-page {
  min-height: 100vh;
  position: relative;
  background: linear-gradient(180deg, #F7F8F3 0%, #EFF5F2 48%, #F8F3F4 100%);
}
.app { position: relative; z-index: 1; min-height: 100vh; padding-bottom: 100px; }
.header { position: sticky; top: 0; z-index: 100; padding: env(safe-area-inset-top, 0px) 16px 12px; background: rgba(247, 248, 243, 0.95); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); }
.header-content { display: flex; justify-content: space-between; align-items: center; max-width: 560px; margin: 0 auto; }
.header-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.icon-btn { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; color: var(--text-secondary); }
.icon-btn:hover { background: var(--bg-card-hover); border-color: var(--border-focus); color: var(--text-primary); }
.main { max-width: 560px; margin: 0 auto; padding: 16px; }

.plan-command-card {
  margin: 0 0 12px;
  padding: 18px;
  border-radius: 8px;
  background: rgba(255, 255, 252, 0.94);
  border: 1px solid rgba(43, 53, 47, 0.12);
  box-shadow: 0 4px 8px rgba(42, 54, 49, 0.08);
  color: #1F2937;
}

.plan-command-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.plan-eyebrow,
.execution-strip-head span {
  display: block;
  color: #667085;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}

.plan-command-card h1 {
  margin: 5px 0 6px;
  color: #1F2937;
  font-size: 22px;
  line-height: 1.18;
  font-weight: 850;
  letter-spacing: 0;
}

.plan-command-card p,
.execution-card p {
  margin: 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}

.plan-command-next {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(32, 61, 53, 0.06);
  border: 1px solid rgba(32, 61, 53, 0.08);
}

.plan-command-next span,
.execution-next-step span,
.checkin-coach-panel span {
  display: block;
  color: #667085;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 800;
}

.plan-command-next strong,
.execution-next-step strong,
.checkin-coach-panel strong {
  display: block;
  margin-top: 4px;
  color: #1F2937;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 850;
}

.plan-command-action {
  min-height: 44px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(32, 61, 53, 0.14);
  background: #203D35;
  color: #FFFFFF;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}

.plan-command-meter {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
}

.meter-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(31, 41, 55, 0.08);
}

.meter-fill {
  height: 100%;
  border-radius: inherit;
  background: #203D35;
}

.plan-command-meter span {
  min-width: 42px;
  text-align: right;
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.plan-command-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: 16px;
  padding-top: 15px;
  border-top: 1px solid rgba(43, 53, 47, 0.1);
}

.plan-command-stats div {
  min-width: 0;
  padding: 0 12px;
  border-left: 1px solid rgba(43, 53, 47, 0.08);
}

.plan-command-stats div:first-child {
  border-left: 0;
  padding-left: 0;
}

.plan-command-stats strong {
  display: block;
  color: #1F2937;
  font-size: 18px;
  line-height: 1.15;
  font-weight: 850;
}

.plan-command-stats span {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 11px;
  font-weight: 650;
}

.today-execution-strip {
  margin-bottom: 12px;
  padding: 14px;
  border-radius: 8px;
  background: rgba(255, 255, 252, 0.78);
  border: 1px solid rgba(43, 53, 47, 0.1);
}

.execution-strip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.execution-strip-head strong {
  color: #344054;
  font-size: 13px;
  font-weight: 800;
}

.execution-card-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.execution-card {
  min-width: 0;
  min-height: 148px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(43, 53, 47, 0.12);
  background: #FFFFFF;
  text-align: left;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.execution-next-step {
  padding: 8px 9px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(43, 53, 47, 0.08);
}

.execution-card.partial {
  background: #FFF7ED;
  border-color: rgba(181, 71, 8, 0.2);
}

.execution-card.pending {
  background: #F3F6FB;
}

.execution-card.done {
  background: #F2FAF4;
  border-color: rgba(8, 116, 67, 0.2);
}

.execution-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.execution-card-top span {
  color: #1F2937;
  font-size: 14px;
  line-height: 1.25;
  font-weight: 850;
}

.execution-card-top strong {
  color: #203D35;
  font-size: 13px;
  font-weight: 850;
}

.execution-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.execution-groups span {
  max-width: 100%;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(31, 41, 55, 0.07);
  color: #475467;
  font-size: 10px;
  line-height: 1;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.execution-groups span.complete {
  color: #067647;
  background: rgba(6, 118, 71, 0.1);
}

.execution-groups span.current {
  color: #7A4215;
  background: #FFF1D6;
}

.execution-progress {
  height: 5px;
  border-radius: 999px;
  background: rgba(31, 41, 55, 0.08);
  overflow: hidden;
  margin-top: auto;
}

.execution-progress div {
  height: 100%;
  border-radius: inherit;
  background: #203D35;
}

@media (max-width: 380px) {
  .plan-command-main {
    flex-direction: column;
  }

  .plan-command-action {
    width: 100%;
    justify-content: center;
  }

  .execution-card-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 420px) {
  .plan-command-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    row-gap: 12px;
  }

  .plan-command-stats div:nth-child(2n + 1) {
    border-left: 0;
    padding-left: 0;
  }
}

.progress-card { margin: 0 0 16px; padding: 20px; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); border-radius: 24px; color: white; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.progress-label { opacity: 0.9; font-size: 13px; }
.progress-value { font-size: 32px; font-weight: 800; margin-top: 4px; }
.progress-heart { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.heart-icon { width: 28px; height: 28px; animation: pulse 1.5s ease-in-out infinite; }
.progress-bar-bg { height: 8px; background: rgba(255,255,255,0.25); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: white; border-radius: 4px; }
.progress-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.avatar-group { display: flex; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text { color: white; font-size: 14px; font-weight: 600; }
.avatar-second { margin-left: -10px; }
.progress-text { font-size: 13px; color: rgba(255,255,255,0.95); font-weight: 600; text-shadow: 0 1px 2px rgba(0,0,0,0.15); }
.progress-text.completed { color: #fff; font-weight: 700; text-shadow: 0 1px 3px rgba(0,0,0,0.2); }

.filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; }
.filter-tab { flex-shrink: 0; padding: 8px 14px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.filter-tab.active { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; border-color: transparent; }

.main-tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; align-items: center; }
.main-tab { flex-shrink: 0; padding: 10px 18px; border-radius: 24px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.main-tab.active { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(82, 111, 92, 0.25); }
.weekly-report-btn { margin-left: auto; flex-shrink: 0; }

.tab-content { padding-bottom: 20px; }

/* 新卡片设计 - 独立卡片间距风 */
.habit-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  background: #ffffff;
  border-radius: 16px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #f0f0f0;
}
.habit-item:last-child { margin-bottom: 0; }
.habit-item:active { transform: scale(0.995); background: #fafafa; }
.habit-item.complete { 
  background: #f6fef9; 
  border-color: #86efac;
  opacity: 0.85;
}

/* 补卡完成 - 蓝色 */
.habit-item.makeup-complete { 
  background: #eff6ff; 
  border-color: #93c5fd;
  opacity: 0.9;
}

/* 请假中 - 紫色 */
.habit-item.on-leave { 
  background: #faf5ff; 
  border-color: #d8b4fe;
}

/* 今天不需要打卡 - 低调显示 */
.habit-item.inactive-today { 
  background: #f9fafb; 
  border-color: #e5e7eb;
  opacity: 0.6;
}
.habit-item.inactive-today .item-title {
  color: #9ca3af;
}
.habit-item.inactive-today .item-type {
  background: #e5e7eb;
  color: #9ca3af;
}
.status-icon.inactive {
  background: #e5e7eb;
  border: 2px solid #d1d5db;
  color: #9ca3af;
  font-size: 12px;
}

.item-status { flex-shrink: 0; }
.status-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
}
.status-icon.completed {
  background: #22c55e;
  color: white;
}
.status-icon.makeup {
  background: #3b82f6;
  color: white;
}
.status-icon.pending {
  background: #f3f4f6;
  border: 2px solid #d1d5db;
  cursor: pointer;
  position: relative;
}
.status-icon.pending:hover {
  background: #e5e7eb;
  border-color: #9ca3af;
}
.status-icon.pending::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  background: #9ca3af;
  border-radius: 50%;
}
.status-icon.waiting {
  background: #f3f4f6;
  border: 2px solid #e5e7eb;
}
.status-icon.on-leave {
  background: #a855f7;
  color: white;
  font-size: 12px;
}

.item-body { flex: 1; min-width: 0; }
.item-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.item-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-type {
  font-size: 12px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.item-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
}
.meta-text.streak {
  color: #ea580c;
}

.item-duo-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.avatar-mini {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
  flex-shrink: 0;
}
.avatar-mini.done {
  background: #22c55e;
  color: white;
}
.duo-line {
  width: 30px;
  height: 2px;
  background: #e5e7eb;
  border-radius: 1px;
  position: relative;
}
.duo-line.complete {
  background: #22c55e;
}

.item-arrow {
  color: #d1d5db;
  flex-shrink: 0;
}
.habit-item:active .item-arrow {
  transform: translateX(4px);
  transition: transform 0.2s;
}

/* 详情抽屉 - 现代设计 */
.detail-drawer {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.drawer-content {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: white;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.drawer-header {
  padding: 24px 24px 16px;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-main { flex: 1; }
.plan-type-badge {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  display: block;
}
.drawer-title {
  font-size: 22px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 6px;
}
.drawer-desc {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
}

.btn-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 双人状态展示 */
.duo-status-large {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
  background: linear-gradient(180deg, #f9fafb 0%, #ffffff 100%);
}

.person-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.person-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f3f4f6;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  object-fit: cover;
}
.person-status.done .person-avatar {
  background: #22c55e;
  color: white;
}
.person-status.on-leave .person-avatar {
  background: #a855f7;
  color: white;
}
.person-label {
  font-size: 13px;
  color: #6b7280;
}
.person-status.done .person-label {
  color: #16a34a;
  font-weight: 500;
}
.person-status.on-leave .person-label {
  color: #9333ea;
  font-weight: 500;
}
.person-status.inactive-today .person-avatar {
  background: #9ca3af;
  color: white;
}
.person-status.inactive-today .person-label {
  color: #6b7280;
  font-weight: 500;
}

.connection-line {
  width: 80px;
  height: 2px;
  position: relative;
  display: flex;
  justify-content: center;
}
.line-progress {
  position: absolute;
  top: 0;
  height: 100%;
  width: 50%;
  background: #22c55e;
  transform: scaleX(0);
  transition: transform 0.3s ease;
}
.line-progress.self {
  left: 0;
  background: linear-gradient(90deg, #22c55e, #4ade80);
  transform-origin: left center;
}
.line-progress.self.active {
  transform: scaleX(1);
}
.line-progress.partner {
  right: 0;
  background: linear-gradient(90deg, #4ade80, #22c55e);
  transform-origin: right center;
}
.line-progress.partner.active {
  transform: scaleX(1);
}
.complete-heart {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  background: white;
  padding: 0 4px;
}

/* 抽屉内容区 */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.section {
  margin-bottom: 24px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

/* 统计卡片 */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.stat-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
}
.stat-num {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 4px;
}
.stat-card .stat-label {
  font-size: 12px;
  color: #6b7280;
}

/* CSS 趋势图 */
.chart-container {
  display: flex;
  height: 160px;
  background: #f9fafb;
  border-radius: 12px 12px 0 0;
  padding: 8px 0 8px 8px;
}
.chart-y-axis {
  width: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 4px 8px 4px 0;
}
.y-tick {
  font-size: 11px;
  color: #9ca3af;
  text-align: right;
  line-height: 1;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.chart-main {
  flex: 1;
  position: relative;
  margin-right: 8px;
}
.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
  position: absolute;
  inset: 0;
}
.chart-points {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}
.chart-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid var(--color-secondary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s, border-color 0.2s;
}
.chart-point:hover {
  transform: translate(-50%, -50%) scale(1.3);
  border-color: var(--color-primary);
  z-index: 10;
}
.point-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
  padding: 4px 8px;
  background: #1f2937;
  color: white;
  font-size: 11px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.chart-point:hover .point-tooltip {
  opacity: 1;
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #9ca3af;
}
.chart-x-axis {
  display: flex;
  justify-content: space-between;
  padding: 6px 8px 10px 64px;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}
.x-tick {
  font-size: 11px;
  color: #9ca3af;
  text-align: center;
  flex: 1;
}
.x-tick:first-child {
  text-align: left;
}
.x-tick:last-child {
  text-align: right;
}
.grid-line {
  height: 1px;
  background: #e5e7eb;
}
.chart-line-segment {
  position: absolute;
  height: 2px;
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
  transform-origin: left center;
  border-radius: 1px;
}
.chart-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid var(--color-secondary);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  transition: transform 0.2s;
}
.chart-point:hover {
  transform: translate(-50%, -50%) scale(1.2);
}
.chart-point:hover .point-tooltip {
  opacity: 1;
  transform: translateX(-50%) translateY(-4px);
}
.point-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 8px;
  background: #1f2937;
  color: white;
  font-size: 11px;
  border-radius: 6px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.2s;
  white-space: nowrap;
}

/* 记录列表 */
.record-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.record-item {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
}
.record-date {
  font-size: 13px;
  color: #6b7280;
}
.record-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

/* 子任务列表 */
.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.subtask-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
}
.subtask-index {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 500;
  min-width: 24px;
}
.subtask-name {
  font-size: 14px;
  color: #374151;
}
.subtask-name-wrap {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.subtask-meta-line {
  font-size: 11px;
  color: #64748b;
}
.subtask-weekday {
  font-size: 11px;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: auto;
}
.subtask-check {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.subtask-check svg {
  width: 16px;
  height: 16px;
  color: #10b981;
}
.subtask-unchecked {
  width: 16px;
  height: 16px;
  border: 2px solid #d1d5db;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  color: transparent;
}
.subtask-item.completed .subtask-name {
  color: #10b981;
  text-decoration: line-through;
  opacity: 0.8;
}
/* 打卡历史记录 */
.checkin-history { display: flex; flex-direction: column; gap: 12px; }
.checkin-record { background: #f9fafb; border-radius: 12px; padding: 14px 16px; border: 1px solid #e5e7eb; }
.checkin-record:hover { background: #f3f4f6; }
.checkin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.checkin-user { display: flex; align-items: center; gap: 8px; }
.checkin-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.checkin-avatar-default { width: 28px; height: 28px; border-radius: 50%; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: white; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.checkin-name { font-size: 14px; font-weight: 500; color: #374151; }
.checkin-date { font-size: 12px; color: #9ca3af; }
.checkin-mood { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px 10px; background: white; border-radius: 8px; width: fit-content; }
.mood-emoji { font-size: 16px; }
.mood-label { font-size: 13px; color: #6b7280; }
.checkin-tasks { margin-bottom: 8px; }
.checkin-tasks-title { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
.checkin-task-list { display: flex; flex-wrap: wrap; gap: 6px; }
.checkin-task-tag { background: #dbeafe; color: #1d4ed8; font-size: 12px; padding: 4px 10px; border-radius: 12px; }
.checkin-summary { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
.checkin-summary span { padding: 4px 8px; border-radius: 8px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; }
.checkin-numeric { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px 10px; background: #f0fdf4; border-radius: 8px; width: fit-content; }
.numeric-label { font-size: 12px; color: #6b7280; }
.numeric-value { font-size: 14px; font-weight: 600; color: #15803d; }
.checkin-note { display: flex; gap: 8px; padding: 10px 12px; background: white; border-radius: 8px; margin-bottom: 8px; }
.note-label { font-size: 14px; }
.note-text { font-size: 13px; color: #4b5563; line-height: 1.5; flex: 1; }
.checkin-perfect { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #f59e0b; font-weight: 600; padding: 4px 10px; background: #fffbeb; border-radius: 8px; width: fit-content; }
.checkin-empty { padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; }

.subtask-item.completed {
  background: #ecfdf5;
}
.subtask-empty {
  padding: 20px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
}

/* 详情页星期选择器 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.weekday-selector-mini {
  display: flex;
  gap: 4px;
}
.weekday-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.weekday-dot:hover {
  background: #d1d5db;
}
.weekday-dot.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
}

/* 请假列表 */
.leave-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.leave-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #eff6ff;
  border-radius: 10px;
}
.leave-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.leave-date {
  font-size: 13px;
  color: #1e40af;
  font-weight: 500;
}
.leave-reason {
  font-size: 12px;
  color: #3b82f6;
}
.leave-item.partner {
  background: #f3f4f6;
}
.leave-item.partner .leave-date {
  color: #6b7280;
}
.leave-item.partner .leave-reason {
  color: #9ca3af;
}
.leave-badge {
  font-size: 11px;
  color: #9ca3af;
  background: #e5e7eb;
  padding: 2px 8px;
  border-radius: 10px;
}

/* 统计行 */
.stats-simple {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
  font-size: 14px;
  color: #6b7280;
}
.stat-highlight {
  color: #111827;
  font-weight: 600;
}

/* 底部操作 */
.drawer-footer {
  padding: 16px 24px 24px;
  border-top: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.footer-row {
  display: flex;
  gap: 12px;
}
.footer-row .btn-action {
  flex: 1;
}
.btn-action {
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-action.primary {
  background: #111827;
  color: white;
}
.btn-action.secondary {
  background: #f3f4f6;
  color: #374151;
}
.btn-action.edit {
  background: #e0e7ff;
  color: #4f46e5;
}
.btn-action.delete {
  background: #fee2e2;
  color: #dc2626;
}

.empty-state { text-align: center; padding: 40px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { font-size: 14px; color: var(--text-secondary); }


.calendar-card { background: var(--bg-card); border-radius: 20px; padding: 16px; }
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.calendar-header h3 { font-size: 15px; font-weight: 600; }
.calendar-legend { display: flex; gap: 12px; font-size: 12px; color: var(--text-secondary); }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 8px; height: 8px; border-radius: 50%; }
.legend-dot.me { background: #ec4899; }
.legend-dot.partner { background: #8b5cf6; }
.calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.calendar-weekday { text-align: center; font-size: 12px; color: #9ca3af; padding: 8px 0; }
.calendar-day { aspect-ratio: 1; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.calendar-day.today { background: #fce7f3; }
.day-number { font-size: 12px; color: #4b5563; }
.day-number.today { color: #db2777; font-weight: 600; }
.day-dots { display: flex; gap: 2px; }
.day-dot { width: 5px; height: 5px; border-radius: 50%; }
.day-dot.me { background: #ec4899; }
.day-dot.partner { background: #8b5cf6; }

/* ========== 数据统计页 ========== */
.stats-page { padding-bottom: 20px; }
.stats-overview { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card { background: #ffffff; border-radius: 20px; padding: 18px 14px; text-align: center; border: 1px solid #f3f4f6; box-shadow: 0 2px 8px rgba(0,0,0,0.03); transition: all 0.2s; }
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); }
.stat-icon { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 8px; }
.stat-icon svg { width: 24px; height: 24px; }
.stat-calendar { background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%); color: #0369a1; }
.stat-fire { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #d97706; }
.stat-heart { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); color: #db2777; }
.stat-target { background: linear-gradient(135deg, #ecfdf5 0%, #a7f3d0 100%); color: #059669; }
.stat-icon { font-size: 28px; margin-bottom: 6px; }
.stat-number { font-size: 26px; font-weight: 800; color: #111827; line-height: 1; }
.stat-label { font-size: 12px; color: #9ca3af; margin-top: 6px; font-weight: 500; }

.stats-section { background: #ffffff; border-radius: 20px; padding: 18px; margin-bottom: 16px; border: 1px solid #f3f4f6; }
.section-title-bar { font-size: 15px; font-weight: 700; color: #374151; margin-bottom: 14px; }

.trend-chart { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 100px; padding: 10px 0; }
.trend-bar-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.trend-bar { width: 100%; max-width: 24px; background: linear-gradient(180deg, var(--color-primary) 0%, var(--color-secondary) 100%); border-radius: 6px 6px 0 0; min-height: 4px; }
.trend-bar.zero { background: #e5e7eb; }
.trend-label { font-size: 11px; color: #9ca3af; font-weight: 500; }

.habit-rank-list { display: flex; flex-direction: column; gap: 10px; }
.habit-rank-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #f9fafb; border-radius: 14px; }
.rank-num { width: 24px; height: 24px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.habit-rank-item:first-child .rank-num { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; }
.rank-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rank-title { font-size: 14px; font-weight: 600; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-streak { font-size: 12px; color: #9ca3af; }
.rank-progress { width: 60px; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; flex-shrink: 0; }
.rank-progress-bar { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: 3px; }

/* ========== 详情页小日历 ========== */
.detail-calendar { background: #f9fafb; border-radius: 16px; padding: 14px; }
.detail-calendar-header { display: flex; justify-content: flex-end; gap: 12px; margin-bottom: 10px; }
.calendar-legend-item { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6b7280; }
.calendar-legend-item .legend-dot { width: 6px; height: 6px; border-radius: 50%; }
.calendar-legend-item .legend-dot.me { background: #ec4899; }
.calendar-legend-item .legend-dot.partner { background: #8b5cf6; }
.detail-calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.detail-calendar-weekday { text-align: center; font-size: 11px; color: #9ca3af; padding: 6px 0; }
.detail-calendar-day { aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #4b5563; background: #ffffff; position: relative; }
.detail-calendar-day.today { background: #fce7f3; color: #db2777; font-weight: 600; }
.detail-calendar-day.has-me { background: rgba(236, 72, 153, 0.12); color: #be185d; }
.detail-calendar-day.has-partner { background: rgba(139, 92, 246, 0.12); color: #7c3aed; }
.detail-calendar-day.has-me.has-partner { background: linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 100%); color: #111827; font-weight: 600; }

.achievement-summary { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 20px; padding: 18px 24px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(168, 237, 234, 0.3); }
.summary-label { font-size: 14px; color: #5a6c7d; font-weight: 500; }
.summary-value { font-size: 28px; font-weight: 800; color: #2d3748; margin-top: 4px; }
.summary-points { font-size: 13px; color: #718096; margin-top: 4px; font-weight: 500; }
.trophy-icon { font-size: 40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)); animation: trophyShine 2s ease infinite; }

@keyframes trophyShine {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.05); filter: brightness(1.2); }
}

.achievement-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.achievement-card { border-radius: 20px; padding: 18px 16px; border: 2px solid transparent; transition: all 0.3s ease; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-color: #dee2e6; opacity: 0.6; position: relative; overflow: hidden; }
.achievement-card::before { content: '🔒'; position: absolute; top: 10px; right: 10px; font-size: 14px; opacity: 0.3; }
.achievement-card.unlocked { opacity: 1; transform: translateY(-2px); }
.achievement-card.unlocked::before { content: '✨'; opacity: 1; animation: sparkle 1.5s ease infinite; }

/* 稀有度样式 */
.achievement-card.common.unlocked { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); border-color: #9ca3af; box-shadow: 0 4px 12px rgba(156, 163, 175, 0.2); }
.achievement-card.rare.unlocked { background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-color: #3b82f6; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.25); }
.achievement-card.epic.unlocked { background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border-color: #a855f7; box-shadow: 0 4px 16px rgba(168, 85, 247, 0.3); }
.achievement-card.legendary.unlocked { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-color: #f59e0b; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.35); }

.achievement-card.common.unlocked::before { color: #6b7280; }
.achievement-card.rare.unlocked::before { color: #3b82f6; }
.achievement-card.epic.unlocked::before { color: #a855f7; }
.achievement-card.legendary.unlocked::before { color: #f59e0b; }

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
}

.achievement-icon { width: 48px; height: 48px; border-radius: 16px; background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 12px; transition: all 0.3s ease; }
.achievement-card.unlocked .achievement-icon { transform: scale(1.05); }
.achievement-card.common.unlocked .achievement-icon { background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%); box-shadow: 0 3px 10px rgba(156, 163, 175, 0.3); }
.achievement-card.rare.unlocked .achievement-icon { background: linear-gradient(135deg, #bfdbfe 0%, #93c5fd 100%); box-shadow: 0 3px 10px rgba(59, 130, 246, 0.3); }
.achievement-card.epic.unlocked .achievement-icon { background: linear-gradient(135deg, #e9d5ff 0%, #d8b4fe 100%); box-shadow: 0 3px 10px rgba(168, 85, 247, 0.3); }
.achievement-card.legendary.unlocked .achievement-icon { background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }

.achievement-title { font-size: 15px; font-weight: 700; color: #6c757d; margin-bottom: 4px; }
.achievement-card.unlocked .achievement-title { color: #374151; }
.achievement-desc { font-size: 12px; color: #adb5bd; line-height: 1.4; }
.achievement-card.unlocked .achievement-desc { color: #4b5563; }

.achievement-progress { margin-top: 10px; }
.progress-track { height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; margin-bottom: 6px; }
.progress-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: 3px; }
.progress-text { font-size: 11px; color: #6b7280; font-weight: 500; }

.achievement-date { font-size: 11px; color: #d97706; margin-top: 10px; display: flex; align-items: center; gap: 4px; font-weight: 600; background: rgba(255, 193, 7, 0.15); padding: 4px 10px; border-radius: 12px; width: fit-content; }
.achievement-card.rare.unlocked .achievement-date { background: rgba(59, 130, 246, 0.12); color: #2563eb; }
.achievement-card.epic.unlocked .achievement-date { background: rgba(168, 85, 247, 0.12); color: #7c3aed; }
.achievement-card.legendary.unlocked .achievement-date { background: rgba(245, 158, 11, 0.12); color: #b45309; }

/* 成就解锁庆祝弹窗 */
.achievement-celebration {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.3s ease;
}

.celebration-content {
  text-align: center;
  padding: 40px;
  animation: celebrationPop 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.celebration-stars {
  font-size: 32px;
  animation: starsTwinkle 1s ease infinite;
  margin-bottom: 16px;
}

.achievement-big-icon {
  font-size: 80px;
  margin: 20px 0;
  animation: iconFloat 1.8s ease-in-out infinite alternate;
  filter: drop-shadow(0 4px 20px rgba(255, 193, 7, 0.5));
}

.celebration-title {
  font-size: 28px;
  font-weight: 800;
  color: #FFE8A3;
  margin-bottom: 8px;
  text-shadow: 0 2px 10px rgba(255, 193, 7, 0.3);
}

.celebration-name {
  font-size: 22px;
  font-weight: 700;
  color: white;
  margin-bottom: 8px;
}

.celebration-desc {
  font-size: 16px;
  color: rgba(255,255,255,0.8);
  margin-bottom: 30px;
}

.celebration-fireworks {
  position: relative;
  height: 60px;
}

.firework {
  position: absolute;
  font-size: 24px;
  animation: fireworkFly 1.5s ease-out infinite;
  animation-delay: calc(var(--i) * 0.1s);
  opacity: 0;
}

.firework:nth-child(1) { left: 10%; top: 50%; }
.firework:nth-child(2) { left: 25%; top: 20%; }
.firework:nth-child(3) { left: 40%; top: 60%; }
.firework:nth-child(4) { left: 55%; top: 10%; }
.firework:nth-child(5) { left: 70%; top: 50%; }
.firework:nth-child(6) { left: 85%; top: 30%; }
.firework:nth-child(7) { left: 15%; top: 70%; }
.firework:nth-child(8) { left: 90%; top: 60%; }

@keyframes celebrationPop {
  0% { transform: translateY(10px) scale(0.96); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes starsTwinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

@keyframes iconFloat {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(-6px) scale(1.03); }
}

@keyframes fireworkFly {
  0% { transform: translateY(20px) scale(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-60px) scale(1.5); opacity: 0; }
}

.modal-overlay { position: fixed; inset: 0; background: rgba(42,32,37,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-dialog { width: 100%; max-width: 480px; max-height: 85vh; background: #FFFDF9; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease; box-shadow: 0 4px 8px rgba(42,32,37,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(42,32,37,0.08); background: #FFFDF9; }
.modal-header h3 { min-width: 0; font-size: 16px; line-height: 1.25; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.modal-icon { font-size: 22px; }
.close-btn { flex: 0 0 44px; width: 44px; min-width: 44px; height: 44px; min-height: 44px; border-radius: 12px; border: 1px solid rgba(42,32,37,0.08); background: #f3f4f6; color: #6b7280; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 16px 20px 24px; overflow-y: auto; background: #FFFDF9; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; transition: all 0.2s; }
.form-input:focus { border-color: var(--border-focus); background: white; }
.reminder-row { display: flex; align-items: center; gap: 12px; }
.switch-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text-secondary); }
.switch-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--color-primary); cursor: pointer; }
.time-input { width: auto; min-width: 100px; padding: 8px 12px; }
.form-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; resize: none; transition: all 0.2s; font-family: inherit; }
.form-textarea:focus { border-color: var(--border-focus); background: white; }
.form-hint { font-size: 12px; color: #9ca3af; margin-top: 6px; }

.subtask-quick-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.subtask-quick-actions button {
  flex: 1;
  min-height: 44px;
  border: 1px solid rgba(32, 61, 53, 0.12);
  border-radius: 8px;
  background: #F3F6FB;
  color: #344054;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
}
.checkin-coach-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(43, 53, 47, 0.1);
  background: #F8FAFC;
}
.checkin-coach-panel.pending {
  background: #F3F6FB;
}
.checkin-coach-panel.partial {
  background: #FFF7ED;
}
.checkin-coach-panel.done {
  background: #F2FAF4;
  border-color: rgba(8, 116, 67, 0.2);
}
.checkin-coach-panel p {
  margin: 5px 0 0;
  color: #667085;
  font-size: 12px;
  line-height: 1.45;
}
.checkin-coach-panel em {
  flex: 0 0 auto;
  min-width: 48px;
  color: #203D35;
  font-style: normal;
  font-size: 18px;
  line-height: 1;
  font-weight: 850;
  text-align: right;
}
.subtask-group-list { display: flex; flex-direction: column; gap: 10px; }
.subtask-group-card {
  padding: 12px;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  background: #FFFFFF;
}
.subtask-group-card.complete {
  border-color: rgba(6, 118, 71, 0.24);
  background: #F2FAF4;
}
.subtask-group-card.current {
  border-color: rgba(161, 92, 30, 0.24);
  background: #FFF7ED;
}
.subtask-group-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}
.subtask-group-head strong {
  display: block;
  color: #111827;
  font-size: 14px;
  line-height: 1.25;
  font-weight: 850;
}
.subtask-group-head span {
  display: block;
  margin-top: 3px;
  color: #667085;
  font-size: 11px;
  line-height: 1.35;
}
.subtask-group-head button {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid rgba(32, 61, 53, 0.14);
  border-radius: 8px;
  background: #203D35;
  color: #FFFFFF;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
}
.subtask-group-card.complete .subtask-group-head button {
  background: #FFFFFF;
  color: #067647;
}
.subtask-checklist { display: flex; flex-direction: column; gap: 8px; }
.subtask-check-item { display: flex; align-items: center; gap: 10px; min-height: 44px; padding: 12px; background: #f9fafb; border-radius: 8px; cursor: pointer; }
.subtask-checkbox { width: 20px; height: 20px; accent-color: #ec4899; }
.subtask-check-content { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.subtask-check-text { font-size: 14px; color: #111827; }
.subtask-check-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: #64748b; }
.subtask-check-meta span { padding: 2px 6px; border-radius: 8px; background: #eef2ff; color: #475569; }
.checkin-feedback { display: flex; align-items: center; gap: 10px; margin-top: 10px; font-size: 12px; font-weight: 700; color: #16a34a; }
.checkin-feedback-bar { flex: 1; height: 8px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
.checkin-feedback-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22c55e, #14b8a6); }

.numeric-input-wrap { display: flex; align-items: center; gap: 8px; }
.numeric-large { font-size: 22px; font-weight: 700; text-align: center; flex: 1; }
.numeric-unit-label { font-size: 16px; color: #6b7280; }

.mood-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.mood-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid transparent; background: #f3f4f6; font-size: 13px; display: flex; align-items: center; gap: 4px; cursor: pointer; transition: all 0.2s; }
.mood-btn.active { background: #fce7f3; border-color: #f472b6; }

.type-desc { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.subtask-inputs { display: flex; flex-direction: column; gap: 8px; }
.subtask-input-row { display: flex; gap: 8px; align-items: center; }
.btn-icon { width: 36px; height: 36px; border-radius: 10px; border: none; background: #f3f4f6; color: #6b7280; font-size: 18px; cursor: pointer; }
.btn-text { display: flex; align-items: center; gap: 4px; padding: 8px 0; background: transparent; border: none; color: var(--color-primary); font-size: 13px; cursor: pointer; }

.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
.color-btn-select { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; }
.color-btn-select.active { box-shadow: 0 0 0 2px white, 0 0 0 4px #374151; transform: scale(1.1); }

.target-days { display: flex; gap: 8px; flex-wrap: wrap; }
.day-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #f3f4f6; color: #4b5563; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.day-btn.active { background: #ec4899; color: white; border-color: #ec4899; }

.btn-primary { padding: 14px; border-radius: 14px; border: none; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 15px rgba(162, 67, 99, 0.3); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(162, 67, 99, 0.4); }
.btn-primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
.w-full { width: 100%; }

.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.stat-box { background: #f9fafb; border-radius: 14px; padding: 14px; text-align: center; }
.stat-label { font-size: 11px; color: #9ca3af; }
.stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
.stat-unit { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.trend-chart { background: #f9fafb; border-radius: 14px; padding: 10px; }
.trend-svg { width: 100%; height: 150px; }
.trend-labels { display: flex; justify-content: space-between; padding: 0 20px; margin-top: 4px; }
.trend-x-label { font-size: 10px; color: #9ca3af; }

.history-list { display: flex; flex-direction: column; gap: 8px; max-height: 160px; overflow-y: auto; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f9fafb; border-radius: 12px; }
.history-date { font-size: 13px; color: #6b7280; }
.history-value { font-size: 14px; font-weight: 600; }

.task-list { display: flex; flex-direction: column; gap: 8px; }
.task-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f9fafb; border-radius: 12px; }
.task-number { width: 24px; height: 24px; border-radius: 50%; background: #e5e7eb; color: #6b7280; font-size: 11px; display: flex; align-items: center; justify-content: center; }
.task-title { font-size: 14px; }
.tip-box { padding: 14px; background: #fdf2f8; border-radius: 12px; color: #db2777; font-size: 13px; margin-top: 8px; }

.toast { position: fixed; top: 60px; left: 50%; transform: translateX(-50%) translateY(-20px); padding: 12px 20px; background: rgba(0,0,0,0.8); color: white; border-radius: 24px; font-size: 14px; opacity: 0; pointer-events: none; transition: all 0.3s; z-index: 300; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { background: #10b981; }
.toast.warning { background: #f59e0b; }
.toast.error { background: #ef4444; }

/* 日期选择器 */
.date-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.date-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: #f9fafb; color: #6b7280; font-size: 13px; cursor: pointer; transition: all 0.2s; position: relative; }
.date-btn.active { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(162, 67, 99, 0.4); transform: scale(1.05); font-weight: 600; }
.date-btn.today { font-weight: 600; }
.date-btn.future { border-color: #a78bfa; background: #f5f3ff; color: #7c3aed; }
.date-btn.future:hover:not(.active) { background: #ede9fe; }
.date-btn.checked { border-color: #22c55e; background: #f0fdf4; color: #16a34a; }
.date-btn.checked:hover:not(.active) { background: #dcfce7; }
.checked-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #22c55e;
  color: white;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.future-badge { 
  position: absolute; 
  top: -6px; 
  right: -6px; 
  width: 16px; 
  height: 16px; 
  border-radius: 50%; 
  background: #8b5cf6; 
  color: white; 
  font-size: 10px; 
  display: flex; 
  align-items: center; 
  justify-content: center;
}

/* 完成徽章 */
.completion-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 600; margin-left: 8px; transition: all 0.2s; }
.completion-badge.perfect { background: #dcfce7; color: #16a34a; }

/* 打卡按钮样式 */
.btn-checkin.perfect { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); }
.btn-checkin.perfect:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4); }
.btn-checkin.disabled { background: #e5e7eb !important; color: #9ca3af !important; cursor: not-allowed; box-shadow: none; }
.btn-checkin.completed { background: #10b981 !important; color: white; cursor: default; box-shadow: none; opacity: 0.8; }

@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }

/* 右下角浮动按钮 */
.fab {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(162, 67, 99, 0.4);
  z-index: 50;
  transition: all 0.3s ease;
}

.fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(162, 67, 99, 0.5);
}

.fab:active {
  transform: scale(0.95);
}

/* 周报悬浮按钮（在添加按钮左侧） */
.fab-report {
  right: 84px;
  background: linear-gradient(135deg, #FFB347 0%, #FFCC33 100%);
  box-shadow: 0 4px 15px rgba(255, 179, 71, 0.4);
}

.fab-report:hover {
  box-shadow: 0 6px 20px rgba(255, 179, 71, 0.5);
}

@media (max-width: 360px) {
  .fab-report {
    right: 76px;
  }
}

/* ========== 新添加计划弹窗样式 ========== */
.add-dialog .modal-body {
  padding: 20px 24px 24px;
}

.input-title {
  font-size: 16px;
  font-weight: 500;
}

/* 选项 Pill */
.option-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.option-pill {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-pill:hover {
  border-color: var(--border-focus);
}

.option-pill.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border-color: transparent;
}

/* 星期选择器 */
.weekday-selector {
  display: flex;
  gap: 6px;
  margin-top: 12px;
  justify-content: center;
}

.weekday-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.weekday-btn:hover {
  border-color: var(--border-focus);
}

.weekday-btn.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border-color: transparent;
}

/* 类型卡片 */
.type-cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 2px solid var(--border-color);
  background: var(--bg-card);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.type-card:hover {
  border-color: var(--border-focus);
}

.type-card.active {
  border-color: var(--color-primary);
  background: rgba(162, 67, 99, 0.08);
}

.type-radio {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  flex-shrink: 0;
  position: relative;
  transition: all 0.2s;
}

.type-card.active .type-radio {
  border-color: var(--color-primary);
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
}

.type-card.active .type-radio::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 6px;
  height: 6px;
  background: white;
  border-radius: 50%;
}

.type-info {
  flex: 1;
}

.type-info .type-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.type-info .type-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

/* 子任务区域 */
.subtasks-section {
  background: rgba(0,0,0,0.02);
  padding: 16px;
  border-radius: 16px;
  margin-top: 8px;
}
.template-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #f8fafc;
}
.template-strip span {
  min-width: 0;
  color: #64748b;
  font-size: 12px;
}
.template-chip {
  flex: 0 0 auto;
  border: none;
  border-radius: 8px;
  padding: 7px 10px;
  background: #1f2937;
  color: white;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.weekday-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.weekday-tab {
  padding: 6px 12px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.weekday-tab.active {
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  border-color: transparent;
}

.subtask-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.subtask-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.subtask-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.subtask-input {
  flex: 1;
}

.btn-icon-delete {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: #fee2e2;
  color: #ef4444;
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon-delete:hover {
  background: #fecaca;
}

.btn-add-subtask {
  padding: 10px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-subtask:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* 数值配置 */
.numeric-config {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.numeric-field label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

/* 选填标签 */
.optional {
  font-size: 12px;
  color: var(--text-tertiary);
  font-weight: normal;
}

/* 滑块 */
/* 提交按钮 */
.btn-submit {
  margin-top: 8px;
  height: 48px;
  font-size: 16px;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-checkin { background: #1f2937 !important; }

/* 周报弹窗 */
.weekly-report-modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.weekly-report-content {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 24px;
  overflow: hidden;
  animation: slideUp 0.4s ease;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
}

.report-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
}

.report-header .close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.2);
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.report-body {
  padding: 24px;
}

.report-summary {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 24px;
  margin-bottom: 20px;
}

.summary-item {
  text-align: center;
}

.summary-value {
  display: block;
  font-size: 36px;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.summary-label {
  font-size: 13px;
  color: #6b7280;
  margin-top: 4px;
}

.vs {
  font-size: 14px;
  color: #9ca3af;
}

.both-completed-badge {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 12px;
  color: #92400e;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 24px;
}

.daily-chart {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 24px;
}

.day-bar {
  flex: 1;
  text-align: center;
}

.day-label {
  font-size: 12px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.day-progress {
  height: 80px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: hidden;
  gap: 2px;
  padding: 4px;
}

.progress-segment {
  border-radius: 4px;
}

.progress-segment.me {
  background: #ec4899;
}

.progress-segment.partner {
  background: #8b5cf6;
}

.day-status {
  font-size: 14px;
  margin-top: 6px;
}

.encouragement {
  text-align: center;
  padding: 16px;
  background: #f9fafb;
  border-radius: 12px;
}

.encouragement p {
  font-size: 14px;
  color: #374151;
  margin: 0;
  line-height: 1.6;
}

.report-footer {
  display: flex;
  gap: 12px;
  padding: 16px 24px 24px;
  border-top: 1px solid #f3f4f6;
}

.btn-close-report {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.report-loading {
  text-align: center;
  padding: 40px;
  color: #9ca3af;
}

/* 周报入口按钮 */
.weekly-report-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: none;
  border-radius: 12px;
  color: #92400e;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.weekly-report-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(251, 191, 36, 0.3);
}

/* 周报空状态样式 */
.report-empty {
  padding: 20px 0;
}

.week-progress {
  text-align: center;
  margin-bottom: 24px;
}

.week-day-badge {
  display: inline-block;
  padding: 6px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-radius: 20px;
  color: #92400e;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
}

.week-progress-bar {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
  max-width: 200px;
  margin: 0 auto;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFB347 0%, #FFCC33 100%);
  border-radius: 3px;
}

.empty-illustration {
  text-align: center;
  padding: 30px 20px;
}

.empty-icon-large {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-illustration h3 {
  font-size: 18px;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.empty-illustration p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
  line-height: 1.6;
}

.btn-create-first {
  display: block;
  width: calc(100% - 40px);
  margin: 0 20px 24px;
  padding: 14px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-first:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(162, 67, 99, 0.4);
}

.empty-calendar-preview {
  background: #f9fafb;
  border-radius: 12px;
  padding: 16px;
  margin: 0 20px;
}

.preview-label {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin-bottom: 12px;
}

.preview-days {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.preview-day {
  flex: 1;
  text-align: center;
  padding: 8px;
  background: white;
  border-radius: 8px;
  font-size: 12px;
  color: #6b7280;
}

.preview-day.today {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  font-weight: 600;
}

@keyframes slideUp {
  from { transform: translateY(50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Commercial polish: relationship-first plan execution surfaces */
.plans-page {
  background:
    linear-gradient(180deg, rgba(247, 221, 232, 0.42) 0%, rgba(250, 247, 250, 0.86) 32%, #FFFDFC 100%);
  color: var(--text-primary);
  font-family: var(--font-ui);
}

.header,
.modal-header,
.modal-body {
  background: rgba(255, 253, 252, 0.96);
}

.header-title,
.plan-command-card h1,
.drawer-title,
.modal-header h3 {
  font-family: var(--font-display);
  letter-spacing: 0;
}

.plan-command-card {
  border-radius: 12px;
  border: 1px solid rgba(162, 67, 99, 0.12);
  background:
    linear-gradient(135deg, rgba(255, 253, 252, 0.98), rgba(247, 221, 232, 0.58)),
    radial-gradient(circle at 92% 12%, rgba(82, 111, 92, 0.16), transparent 34%);
  box-shadow: 0 18px 40px rgba(50, 27, 38, 0.08);
}

.plan-eyebrow,
.execution-strip-head span {
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0;
}

.plan-command-card h1 {
  color: var(--color-primary-deep);
}

.plan-command-card p,
.execution-card p,
.plan-command-stats span,
.subtask-group-head span,
.checkin-coach-panel p {
  color: var(--text-secondary);
}

.plan-command-next,
.today-execution-strip,
.checkin-coach-panel,
.subtask-group-card,
.checkin-receipt,
.subtasks-section,
.template-strip {
  border-radius: 12px;
  border: 1px solid rgba(162, 67, 99, 0.10);
  background: rgba(255, 253, 252, 0.78);
}

.plan-command-next strong,
.execution-next-step strong,
.checkin-coach-panel strong,
.checkin-receipt strong {
  color: var(--color-primary-deep);
}

.plan-command-action,
.subtask-group-head button,
.template-chip,
.btn-primary,
.btn-checkin,
.btn-close-report,
.btn-create-first {
  border-radius: 12px;
  border: 1px solid rgba(162, 67, 99, 0.14);
  background: var(--color-primary) !important;
  color: #FFFFFF;
  box-shadow: 0 12px 24px rgba(162, 67, 99, 0.18);
}

.meter-fill,
.execution-progress div,
.checkin-feedback-fill,
.rank-progress-bar,
.progress-fill {
  background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
}

.plan-command-meter span,
.plan-command-stats strong,
.execution-card-top strong,
.checkin-coach-panel em {
  color: var(--color-secondary-deep);
}

.plan-command-stats {
  border-top-color: rgba(162, 67, 99, 0.10);
}

.plan-command-stats div {
  border-left-color: rgba(162, 67, 99, 0.08);
}

.plan-closure-path {
  display: grid;
  gap: 8px;
  margin-top: 12px;
}

.plan-closure-path.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.closure-step,
.execution-path-step {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 12px;
  border: 1px solid rgba(162, 67, 99, 0.10);
  background: rgba(255, 253, 252, 0.72);
}

.closure-step {
  padding: 9px 10px;
}

.closure-step i,
.execution-path-step i {
  flex: 0 0 auto;
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--color-primary-soft);
  border: 1px solid rgba(162, 67, 99, 0.24);
}

.closure-step.done i,
.execution-path-step.done i {
  background: var(--color-secondary);
  border-color: var(--color-secondary);
}

.closure-step.current,
.execution-path-step.current {
  border-color: rgba(162, 67, 99, 0.22);
  background: rgba(247, 221, 232, 0.34);
}

.closure-step.current i,
.execution-path-step.current i {
  background: var(--color-primary);
  border-color: var(--color-primary);
}

.closure-step.rest i,
.execution-path-step.rest i {
  background: #D8A94E;
  border-color: #D8A94E;
}

.closure-step b,
.execution-path-step b {
  display: block;
  min-width: 0;
  color: var(--color-primary-deep);
  font-size: 12px;
  line-height: 1.25;
  font-weight: 850;
}

.closure-step em,
.execution-path-step small {
  display: block;
  min-width: 0;
  margin-top: 2px;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.35;
  font-style: normal;
}

.execution-card {
  min-height: 180px;
  border-radius: 12px;
  border-color: rgba(162, 67, 99, 0.12);
  background: rgba(255, 253, 252, 0.94);
  box-shadow: 0 10px 24px rgba(50, 27, 38, 0.06);
}

.execution-card.partial {
  background: rgba(255, 247, 237, 0.82);
  border-color: rgba(182, 95, 74, 0.22);
}

.execution-card.pending {
  background: rgba(247, 221, 232, 0.30);
}

.execution-card.done {
  background: rgba(231, 240, 228, 0.72);
  border-color: rgba(82, 111, 92, 0.22);
}

.execution-card-top span,
.subtask-check-text,
.type-info .type-name,
.item-title {
  color: var(--color-primary-deep);
}

.execution-path {
  display: grid;
  gap: 6px;
}

.execution-path-step {
  padding: 7px 8px;
}

.execution-path-step small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-tab,
.main-tab,
.option-pill,
.weekday-tab,
.weekday-btn,
.date-btn,
.mood-btn {
  min-height: 40px;
  border-radius: 12px;
  border-color: rgba(162, 67, 99, 0.12);
  background: rgba(255, 253, 252, 0.84);
  color: var(--text-secondary);
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.filter-tab.active,
.main-tab.active,
.option-pill.active,
.weekday-tab.active,
.weekday-btn.active,
.date-btn.active,
.mood-btn.active,
.type-card.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #FFFFFF;
  box-shadow: 0 10px 20px rgba(162, 67, 99, 0.14);
  transform: none;
}

.habit-item {
  border-radius: 12px;
  border-color: rgba(162, 67, 99, 0.10);
  background: rgba(255, 253, 252, 0.92);
  box-shadow: 0 8px 18px rgba(50, 27, 38, 0.05);
  transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.habit-item.complete,
.habit-item.makeup-complete,
.habit-item.on-leave {
  border-color: rgba(82, 111, 92, 0.22);
  background: rgba(231, 240, 228, 0.64);
}

.habit-item.inactive-today {
  background: rgba(255, 253, 252, 0.60);
}

.status-icon {
  border-radius: 12px;
}

.status-icon.pending {
  border-color: var(--color-primary);
}

.status-icon.completed,
.status-icon.makeup {
  background: var(--color-secondary);
}

.meta-text.streak {
  color: var(--color-primary);
  background: rgba(247, 221, 232, 0.52);
}

.modal-dialog,
.drawer-content,
.weekly-report-content {
  border-radius: 12px;
  border: 1px solid rgba(162, 67, 99, 0.12);
  background: #FFFDFC;
  box-shadow: 0 24px 60px rgba(50, 27, 38, 0.20);
}

.drawer-content {
  border-radius: 12px 12px 0 0;
}

.form-input,
.form-textarea {
  border-radius: 12px;
  border-color: rgba(162, 67, 99, 0.14);
  background: rgba(255, 253, 252, 0.86);
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus,
.form-textarea:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(162, 67, 99, 0.10);
}

.form-hint.muted,
.empty-form-hint {
  color: var(--text-tertiary);
  text-align: center;
  padding: 18px;
}

.form-hint.success {
  color: var(--color-secondary);
}

.form-hint.warning {
  color: #9B6A4A;
}

.form-hint.error {
  color: #B65F4A;
}

.leave-rules {
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(216, 169, 78, 0.16);
  color: #8A5B14;
}

.leave-rules span {
  display: block;
  margin-top: 4px;
  font-weight: 650;
}

.leave-action {
  background: rgba(82, 111, 92, 0.12) !important;
  color: var(--color-secondary-deep) !important;
}

.leave-action.disabled {
  background: rgba(124, 116, 128, 0.12) !important;
  color: var(--text-tertiary) !important;
  cursor: not-allowed;
}

.checkin-receipt {
  margin-top: 12px;
  padding: 11px 12px;
}

.checkin-receipt span {
  display: block;
  color: var(--color-primary);
  font-size: 11px;
  line-height: 1.2;
  font-weight: 850;
}

.checkin-receipt strong {
  display: block;
  margin-top: 4px;
  font-size: 14px;
}

.checkin-receipt p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.type-card,
.subtask-check-item,
.task-item,
.history-item,
.stat-box,
.trend-chart {
  border-radius: 12px;
}

.type-card {
  border-width: 1px;
}

.type-card.active .type-radio {
  border-color: #FFFFFF;
  background: #FFFFFF;
}

.type-card.active .type-radio::after {
  background: var(--color-primary);
}

.fab {
  background: var(--color-primary);
  box-shadow: 0 16px 30px rgba(162, 67, 99, 0.26);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.toast {
  border-radius: 12px;
}

@media (max-width: 420px) {
  .plan-closure-path.compact {
    grid-template-columns: 1fr;
  }

  .execution-card {
    min-height: 0;
  }

  .subtask-group-head {
    flex-direction: column;
  }

  .subtask-group-head button {
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
