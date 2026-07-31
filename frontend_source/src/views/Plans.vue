<template>
  <div class="plans-page">
    <FeatureHeader title="计划清单" eyebrow="SHARED PLANS" chapter="04" kind="plan" />
    <div v-if="loading" class="loading-screen" aria-label="正在加载计划清单" aria-live="polite">
      <div class="plan-loading-head" aria-hidden="true"><strong></strong><span></span></div>
      <div v-for="index in 3" :key="index" class="plan-loading-row" aria-hidden="true">
        <i></i><span></span><b></b>
      </div>
    </div>
    <div v-else class="app">
      <main class="main">
        <div class="plan-list-heading">
          <h2>今天的计划</h2>
          <span>{{ progress.completed }}/{{ progress.total }} 完成</span>
        </div>
        <div class="filter-tabs">
          <button v-for="tab in filterTabs" :key="tab.id" @click="filterType = tab.id" :class="['filter-tab', { active: filterType === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="plans-list">
            <div v-for="habit in sortedHabits" :key="habit.id || habit._id" 
                 :class="['habit-item', { 
                   complete: getHabitStatus(habit).isTodayComplete,
                   'makeup-complete': getHabitStatus(habit).isMakeUpComplete && !getHabitStatus(habit).isTodayComplete,
                   'inactive-today': !isHabitActiveToday(habit)
                 }]" 
                 @click="openDetail(habit)">
              <!-- 左侧状态指示 -->
              <div class="item-status">
                <div v-if="!isHabitActiveToday(habit)" class="status-icon inactive" title="今天不需要打卡">-</div>
                <div v-else-if="getHabitStatus(habit).isTodayComplete" class="status-icon completed" title="今天已完成" aria-label="今天已完成" @click.stop="openCheckIn(habit)"></div>
                <div v-else-if="getHabitStatus(habit).isMakeUpComplete" class="status-icon makeup" title="今天已补卡" aria-label="今天已补卡" @click.stop="openCheckIn(habit)"></div>
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
                    <span v-if="d.alreadyChecked" class="checked-badge" aria-hidden="true"></span>
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
                <div class="subtask-group-list">
                  <div
                    v-for="group in selectedDateSubTaskGroups"
                    :key="group.id"
                    class="subtask-group-card"
                    :class="{ complete: group.complete }"
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
                <p v-if="selectedDateCompletedTaskCount === 0" class="form-hint muted">请至少完成一项任务</p>
                <p v-else-if="isPerfectCheckIn" class="form-hint success">全部完成</p>
                <p v-else class="form-hint warning">已完成 {{ selectedDateCompletedGroups }}/{{ selectedDateSubTaskGroups.length }} 组</p>
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
                <label class="form-label">打卡笔记（可选）</label>
                <textarea v-model="checkInNote" placeholder="补充本次完成情况" class="form-textarea" rows="3" />
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
                <span class="plan-type-badge">{{ selectedHabitTypeLabel }}</span>
                <h2 class="drawer-title">{{ selectedHabit?.title }}</h2>
                <p v-if="selectedHabit?.description" class="drawer-desc">{{ selectedHabit.description }}</p>
              </div>
              <button class="btn-close" @click="showDetailDialog = false">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <!-- 双人状态 -->
            <div v-if="selectedHabit?.participation === 'both'" class="duo-status-large">
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).selfChecked, 'inactive-today': !isHabitActiveToday(selectedHabit, currentUser.id) && !getHabitStatus(selectedHabit).selfChecked }">
                <img v-if="currentUser.avatar" :src="currentUser.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ currentUser.name?.[0] || '我' }}</div>
                <span class="person-label">{{ 
                  getHabitStatus(selectedHabit).selfChecked ? '已完成' :
                  (!isHabitActiveToday(selectedHabit, currentUser.id) ? '无需打卡' : '待打卡')
                }}</span>
              </div>
              <div class="connection-line">
                <!-- 自己的进度：从左往右 -->
                <div class="line-progress self" :class="{ active: getHabitStatus(selectedHabit).selfChecked }"></div>
                <!-- 对方的进度：从右往左 -->
                <div class="line-progress partner" :class="{ active: getHabitStatus(selectedHabit).partnerChecked }"></div>
                <span v-if="getHabitStatus(selectedHabit).isComplete" class="complete-heart">双</span>
              </div>
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).partnerChecked, 'inactive-today': !isHabitActiveToday(selectedHabit, partner.id) && !getHabitStatus(selectedHabit).partnerChecked }">
                <img v-if="partner.avatar" :src="partner.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ partner.name?.[0] || 'TA' }}</div>
                <span class="person-label">{{ 
                  getHabitStatus(selectedHabit).partnerChecked ? '已完成' :
                  (!isHabitActiveToday(selectedHabit, partner.id) ? '无需打卡' : '待打卡')
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
                  <h4 class="section-title">最近记录</h4>
                  <div class="record-list">
                    <div v-for="record in [...selectedHabit.numericRecords].reverse().slice(0, 5)" :key="record.date" class="record-item">
                      <span class="record-date">{{ formatDisplayDate(record.date) }}</span>
                      <span class="record-value">{{ record.value }} {{ selectedHabit.numericConfig?.unit }}</span>
                    </div>
                  </div>
                </div>
              </template>

              <!-- 子任务类型 -->
              <template v-if="selectedHabit?.type === 'subtasks' && selectedHabit.subTasks">
                <div class="section">
                  <div class="section-header">
                    <h4 class="section-title">任务清单</h4>
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

              <!-- 打卡历史记录 -->
              <div class="section">
                <h4 class="section-title">打卡日记</h4>
                <div class="checkin-history">
                  <div v-for="record in habitCheckInHistory" :key="record.id" class="checkin-record">
                    <div class="checkin-header">
                      <div class="checkin-user">
                        <img v-if="record.user?.avatar" :src="record.user.avatar" class="checkin-avatar" />
                        <div v-else class="checkin-avatar-default">{{ record.displayName?.[0] || '?' }}</div>
                        <span class="checkin-name">{{ record.displayName }}</span>
                      </div>
                      <span class="checkin-date">
                        {{ formatDisplayDate(record.date) }}<template v-if="record.completedAt"> · 完成于 {{ formatDisplayTime(record.completedAt) }}</template>
                      </span>
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
                      <span class="note-label">备注</span>
                      <span class="note-text">{{ record.note }}</span>
                    </div>
                    
                    <!-- 完美打卡标记 -->
                    <div class="checkin-perfect" v-if="record.isPerfect">
                      <span>完美打卡</span>
                    </div>
                  </div>
                  
                  <div v-if="habitCheckInHistory.length === 0" class="checkin-empty">
                    还没有打卡记录，快去打卡吧！
                  </div>
                </div>
              </div>

              <!-- 计划信息 -->
              <div class="section">
                <h4 class="section-title">计划信息</h4>
                <div class="stats-simple">
                  <div class="stat-row">
                    <span>开始日期</span>
                    <span class="stat-highlight">{{ formatDisplayDate(selectedHabit?.startDate, '未设置') }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- 底部操作 -->
            <div class="drawer-footer">
              <!-- 第一行：主要操作 -->
              <div class="footer-row main-actions">
                <button v-if="canCheckIn(selectedHabit)" @click="showDetailDialog = false; openCheckIn(selectedHabit)" class="btn-action primary">{{ getHabitStatus(selectedHabit).selfChecked ? '更新打卡' : '立即打卡' }}</button>
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
      
      <div
        class="toast"
        :class="{ show: toast.show, [toast.type]: true }"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      ><span>{{ toast.message }}</span></div>
      <!-- 添加计划按钮 -->
      <button class="fab" @click="showAddDialog = true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
    
    
  </div>
</template>
<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { formatLocalDate } from '../utils/date.js'
import FeatureHeader from '../components/FeatureHeader.vue'
import DatePickerField from '../components/DatePickerField.vue'

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
  components: { FeatureHeader, DatePickerField },
  setup() {
    const router = useRouter()
    
    // 获取今天的日期字符串（使用本地时间，避免 UTC 时差问题）
    const getToday = () => {
      return formatLocalDate()
    }
    const formatDisplayDate = (value, fallback = '未记录') => {
      if (!value) return fallback
      const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (dateOnly) return `${dateOnly[1]}年${Number(dateOnly[2])}月${Number(dateOnly[3])}日`
      const date = new Date(value)
      return Number.isNaN(date.getTime())
        ? fallback
        : new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(date)
    }
    const formatDisplayTime = (value) => {
      const date = new Date(value)
      return Number.isNaN(date.getTime())
        ? '未记录'
        : new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    }
    const today = computed(() => getToday())
    
    const loading = ref(true)
    const habits = ref([])
    const checkIns = ref([])
    const currentUser = ref({ id: '', name: '我', avatar: null })
    const partner = ref({ id: '', name: 'TA', avatar: null, gender: null })

    const filterType = ref('all')
    const showCheckInDialog = ref(false)
    const showAddDialog = ref(false)
    const showDetailDialog = ref(false)
    const selectedHabit = ref(null)
    
    // 打卡日期选择（支持补打卡）
    const checkInDate = ref('')
    
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

    const selectedHabitTypeLabel = computed(() => (
      habitTypes.find(type => type.value === selectedHabit.value?.type)?.label || '计划'
    ))

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
    const formatDateIso = (date) => formatLocalDate(date)

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
        checkInNote.value = existingCheckIn.note || ''
      } else {
        // 默认不勾选任何子任务（用户主动选择）
        completedSubTasks.value = []
        numericValue.value = ''
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
        checkInNote.value = existingCheckIn.note || ''
      } else {
        completedSubTasks.value = []
        numericValue.value = ''
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

    const goBack = () => router.push('/home')

    // WebSocket 消息处理 - 实时同步
    const { onMessage } = useWebSocket()
    
    const handleWSMessage = (data) => {
      // 打卡相关消息
      if (data.type?.startsWith('habit')) {
        // 刷新习惯列表和打卡记录（强制刷新，禁用缓存）
        fetchHabits()
        fetchCheckIns()
      }
    }
    
    let unsubscribeWS = null
    
    onMounted(async () => {
      const token = getToken()
      if (token) { try { currentUser.value.id = JSON.parse(atob(token.split('.')[1])).userId } catch (e) {} }
      await fetchUserInfo()
      await fetchHabits()
      await fetchCheckIns()
      loading.value = false
      
      // 监听页面可见性变化，切回前台时刷新数据
      document.addEventListener('visibilitychange', handleVisibilityChange)
      
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
      loading, habits, checkIns, currentUser, partner, filterType,
      showCheckInDialog, showAddDialog, showDetailDialog, selectedHabit, selectedHabitTypeLabel,
      checkInNote, numericValue, completedSubTasks, selectedDateSubTasks, selectedDateCompletedTaskIds, selectedDateCompletedTaskCount, selectedDateSubTaskGroups, selectedDateCompletedGroups, selectedDateCompletionRate,
      checkInDate, availableCheckInDates, isPerfectCheckIn, checkInButtonStatus, hasCheckedInOnDate,
      detailViewWeekday, detailViewSubTasks, isSubTaskCompleted, getSubTaskTitle, hasSubTasksForWeekday, availableDetailWeekdays, habitCheckInHistory,
      newHabitTitle, newHabitDesc, newHabitType,
      newHabitParticipation, newHabitFrequency, newHabitWeekdays, newHabitStartDate, newSubTasks, newNumericUnit, newNumericTarget, activeWeekday,
      newReminderEnabled, newReminderTime,
      toast, today, progress, filteredHabits, sortedHabits,
      filterTabs,
      PARTICIPATION_OPTIONS, CREATE_PARTICIPATION_OPTIONS, FREQUENCY_OPTIONS, WEEKDAYS, habitTypes,
      participationLabel, getHabitStatus, getHabitColor, getStreak, canCheckIn, canCompleteHabit, isHabitActiveToday, isOnLeaveToday,
      getToday, formatDateIso, formatDisplayDate, formatDisplayTime, openCheckIn, openDetail, toggleSubTask, toggleSubTaskGroup, completeAllSubTasks, clearCompletedSubTasks, getTodaySubTaskCount, getTodaySubPlanCount, formatSubTaskTarget,
      handleCheckIn, handleAddHabit, goBack,
      toggleWeekday, currentSubTasks, addSubTask, removeSubTask, hasValidSubTasks, applySubTaskTemplate,
      completeHabit,
      // 编辑相关
      showEditDialog, editingHabit, editHabitTitle, editHabitDesc, editHabitType, editHabitParticipation, editHabitFrequency, editHabitWeekdays, editHabitStartDate, editSubTasks, editNumericUnit, editNumericTarget, editActiveWeekday,
      editReminderEnabled, editReminderTime,
      currentEditSubTasks, toggleEditWeekday, addEditSubTask, removeEditSubTask, hasValidEditSubTasks,
      openEditHabit, handleEditHabit, deleteHabit,
      myLeaves, partnerLeaves,
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
.main { max-width: 560px; margin: 0 auto; padding: 16px; }



.filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
.filter-tabs::-webkit-scrollbar { display: none; }
.filter-tab { flex-shrink: 0; padding: 8px 14px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.filter-tab.active { background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; border-color: transparent; }



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
.status-icon.completed::after,
.status-icon.makeup::after,
.checked-badge::after {
  width: 9px;
  height: 5px;
  content: '';
  border: solid currentColor;
  border-width: 0 0 2px 2px;
  transform: translateY(-1px) rotate(-45deg);
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
.person-label {
  font-size: 13px;
  color: #6b7280;
}
.person-status.done .person-label {
  color: #16a34a;
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
.checkin-tasks { margin-bottom: 8px; }
.checkin-tasks-title { font-size: 12px; color: #9ca3af; margin-bottom: 6px; }
.checkin-task-list { display: flex; flex-wrap: wrap; gap: 6px; }
.checkin-task-tag { background: #dbeafe; color: #1d4ed8; font-size: 12px; padding: 4px 10px; border-radius: 12px; }
.checkin-summary { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 8px; }
.checkin-summary span { padding: 4px 8px; border-radius: 8px; background: #ecfdf5; color: #047857; font-size: 12px; font-weight: 700; }
.checkin-numeric { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; padding: 6px 10px; background: #f0fdf4; border-radius: 8px; width: fit-content; }
.numeric-label { font-size: 12px; color: #6b7280; }
.numeric-value { font-size: 14px; font-weight: 600; color: #15803d; }
.checkin-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; background: white; border-radius: 8px; margin-bottom: 8px; }
.note-label {
  flex: 0 0 auto;
  min-height: 22px;
  padding: 4px 7px;
  border-radius: 8px;
  background: rgba(246, 241, 244, 0.92);
  color: #8F3D5A;
  font-size: 10px;
  line-height: 1;
  font-weight: 850;
}
.note-text { font-size: 13px; color: #4b5563; line-height: 1.5; flex: 1; }
.checkin-perfect { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #8A4B16; font-weight: 850; padding: 5px 10px; background: #FFF7E8; border-radius: 8px; width: fit-content; }
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



.modal-overlay { position: fixed; inset: 0; background: rgba(42,32,37,0.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-dialog { width: 100%; max-width: 480px; max-height: 85vh; background: #FFFDF9; border-radius: 16px; overflow: hidden; display: flex; flex-direction: column; animation: modalFadeIn 0.2s ease; box-shadow: 0 4px 8px rgba(42,32,37,0.2); }
.modal-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid rgba(42,32,37,0.08); background: #FFFDF9; }
.modal-header h3 { min-width: 0; font-size: 16px; line-height: 1.25; font-weight: 700; display: flex; align-items: center; gap: 8px; }
.close-btn { flex: 0 0 44px; width: 44px; min-width: 44px; height: 44px; min-height: 44px; border-radius: 12px; border: 1px solid rgba(42,32,37,0.08); background: #f3f4f6; color: #6b7280; font-size: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 16px 20px 24px; overflow-y: auto; background: #FFFDF9; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s; }
.form-input:focus { border-color: var(--border-focus); background: white; }
.reminder-row { display: flex; align-items: center; gap: 12px; }
.switch-label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px; color: var(--text-secondary); }
.switch-label input[type="checkbox"] { width: 18px; height: 18px; accent-color: var(--color-primary); cursor: pointer; }
.time-input { width: auto; min-width: 100px; padding: 8px 12px; }
.form-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; resize: none; transition: border-color 0.2s, background-color 0.2s, box-shadow 0.2s; }
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


.type-desc { font-size: 11px; color: #9ca3af; margin-top: 2px; }




.btn-primary { padding: 14px; border-radius: 14px; border: none; background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%); color: white; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 15px rgba(162, 67, 99, 0.3); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(162, 67, 99, 0.4); }
.btn-primary:disabled { background: #e5e7eb; color: #9ca3af; box-shadow: none; cursor: not-allowed; }
.w-full { width: 100%; }


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


@media (max-width: 360px) {
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


/* Commercial polish: relationship-first plan execution surfaces */
.plans-page {
  background:
    linear-gradient(180deg, rgba(247, 221, 232, 0.42) 0%, rgba(250, 247, 250, 0.86) 32%, #FFFDFC 100%);
  color: var(--text-primary);
}

.modal-header,
.modal-body {
  background: rgba(255, 253, 252, 0.96);
}

.drawer-title,
.modal-header h3 {
  letter-spacing: 0;
}


.filter-tab,
.option-pill,
.weekday-tab,
.weekday-btn,
.date-btn {
  min-height: var(--fellow-touch-target-min);
  border-radius: 12px;
  border-color: rgba(162, 67, 99, 0.12);
  background: rgba(255, 253, 252, 0.84);
  color: var(--text-secondary);
  transition: border-color 0.2s ease, background-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.filter-tab.active,
.option-pill.active,
.weekday-tab.active,
.weekday-btn.active,
.date-btn.active,
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
.habit-item.makeup-complete {
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
.drawer-content {
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


.type-card,
.subtask-check-item {
  border-radius: 12px;
}

.type-card {
  border-width: 1px;
}

.type-card.active .type-radio {
  border-color: #FFFFFF;
  background: #FFFFFF;
}

/* Approved home-brand finish */
.plans-page {
  background: #FFFAF5;
  color: #20202A;
}

.plan-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--fellow-space-3);
  margin-bottom: var(--fellow-space-3);
  padding: 0 var(--fellow-space-1);
}

.plan-list-heading h2 {
  margin: 0;
  color: #20202A;
  font-size: 18px;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.plan-list-heading span {
  color: #6F6C74;
  font-size: 12px;
  font-weight: 850;
}

.filter-tab,
.btn-checkin,
.subtask-group-head button,
.btn-primary {
  border: 2px solid #20202A;
  border-radius: 10px;
  background: #FFFFFF !important;
  color: #20202A;
  box-shadow: 3px 3px 0 #20202A;
}

.filter-tab.active,
.btn-checkin,
.subtask-group-head button,
.btn-primary {
  border-color: #20202A;
  background: #FFD94A !important;
  color: #20202A;
  box-shadow: 3px 3px 0 #20202A;
}

.empty-state {
  margin: 12px 0;
  padding: 32px 20px;
  border: 3px solid #20202A;
  border-radius: 16px;
  background: #FFFFFF;
  box-shadow: 6px 6px 0 #20202A;
}

.empty-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 14px;
  border: 3px solid #20202A;
  border-radius: 50%;
  background: #75DFC1;
  color: transparent;
  font-size: 0;
  transform: rotate(-5deg);
}

.empty-icon::before,
.empty-icon::after {
  content: '';
  display: inline-block;
  width: 5px;
  height: 7px;
  margin: 20px 4px 0;
  border-radius: 50%;
  background: #20202A;
}

.empty-text {
  color: #6F6C74;
  font-weight: 800;
}

.type-card.active .type-radio::after {
  background: var(--color-primary);
}

.fab {
  border: 3px solid #20202A;
  border-radius: 12px;
  background: #FFD94A;
  color: #20202A;
  box-shadow: 5px 5px 0 #20202A;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.toast {
  border-radius: 12px;
}

@media (max-width: 420px) {
  .subtask-group-head {
    flex-direction: column;
  }

  .subtask-group-head button {
    width: 100%;
  }
}

.loading-screen {
  display: grid;
  gap: 12px;
  margin: 16px;
  padding: 16px;
  box-sizing: border-box;
  color: #20202A;
  background: #FFFFFF;
  border: 3px solid #20202A;
  border-radius: 14px;
  box-shadow: 3px 4px 0 #20202A;
}

.plan-loading-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.plan-loading-head strong { width: 124px; height: 18px; border-radius: 5px; background: #FF8B4A; }
.plan-loading-head span { width: 52px; height: 18px; border-radius: 999px; background: #FFD94A; }
.plan-loading-row { display: grid; grid-template-columns: 34px 1fr 42px; align-items: center; gap: 10px; min-height: 58px; padding: 10px; border: 2px solid #20202A; border-radius: 10px; }
.plan-loading-row i { width: 30px; height: 30px; border: 2px solid #20202A; border-radius: 8px; background: #75DFC1; }
.plan-loading-row span,.plan-loading-row b { height: 12px; border-radius: 4px; background: linear-gradient(100deg,#ECE8E2 25%,#FFFFFF 45%,#ECE8E2 65%); background-size: 220% 100%; animation: plan-loading-sweep 1.3s linear infinite; }
@keyframes plan-loading-sweep { to { background-position: -220% 0; } }

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
