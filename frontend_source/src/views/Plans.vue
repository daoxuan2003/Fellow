<template>
  <div class="plans-page">
    <div class="bg-container"><div class="gradient-orb orb-1"></div><div class="gradient-orb orb-2"></div></div>
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
        <div class="progress-card">
          <div class="progress-header">
            <div>
              <p class="progress-label">今日完成度</p>
              <p class="progress-value">{{ progress.completed }}/{{ progress.total }}</p>
            </div>
            <div class="progress-heart">
              <svg viewBox="0 0 24 24" fill="currentColor" class="heart-icon"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            </div>
          </div>
          <div class="progress-bar-bg"><div class="progress-bar-fill" :style="{ width: progress.percent + '%' }"/></div>
          <div class="progress-footer">
            <div class="avatar-group">
              <div class="avatar" :style="{ backgroundColor: currentUser.avatar ? 'transparent' : '#EC4899' }">
                <img v-if="currentUser.avatar" :src="currentUser.avatar" class="avatar-img" />
                <span v-else class="avatar-text">{{ currentUser.name?.[0] || '我' }}</span>
              </div>
              <div class="avatar avatar-second" :style="{ backgroundColor: partner.avatar ? 'transparent' : '#8B5CF6' }">
                <img v-if="partner.avatar" :src="partner.avatar" class="avatar-img" />
                <span v-else class="avatar-text">{{ partner.name?.[0] || 'TA' }}</span>
              </div>
            </div>
            <p class="progress-text">{{ progress.completed === progress.total ? '太棒了！全部完成 🎉' : '一起加油 💪' }}</p>
          </div>
        </div>
        <div class="filter-tabs">
          <button v-for="tab in filterTabs" :key="tab.id" @click="filterType = tab.id" :class="['filter-tab', { active: filterType === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="main-tabs">
          <button v-for="tab in mainTabs" :key="tab.id" @click="activeTab = tab.id" :class="['main-tab', { active: activeTab === tab.id }]">{{ tab.label }}</button>
        </div>
        <div class="tab-content">
          <div v-if="activeTab === 'plans'" class="plans-list">
            <div v-for="habit in sortedHabits" :key="habit.id || habit._id" 
                 :class="['habit-item', { complete: getHabitStatus(habit).isComplete }]" 
                 :style="{ borderLeftColor: getHabitColor(habit) }"
                 @click="openDetail(habit)">
              <!-- 左侧状态指示 -->
              <div class="item-status">
                <div v-if="getHabitStatus(habit).isComplete" class="status-icon completed">✓</div>
                <div v-else-if="canCheckIn(habit) && !getHabitStatus(habit).selfChecked" class="status-icon pending" @click.stop="openCheckIn(habit)"></div>
                <div v-else class="status-icon waiting"></div>
              </div>
              
              <!-- 中间内容 -->
              <div class="item-body">
                <div class="item-header">
                  <h3 class="item-title">{{ habit.title }}</h3>
                  <span class="item-type">{{ participationLabel(habit) }}</span>
                </div>
                
                <div class="item-meta">
                  <span v-if="habit.type === 'subtasks' && habit.subTasks" class="meta-text">{{ habit.subTasks.length }} 个子任务</span>
                  <span v-if="habit.type === 'numeric'" class="meta-text">数值记录</span>
                  <span v-if="getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id) > 0" class="meta-text streak">🔥 {{ getStreak(habit.id || habit._id, habit.participation === 'partner' ? partner.id : currentUser.id) }}天</span>
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
              <div class="empty-icon">📝</div>
              <div class="empty-text">暂无此类计划</div>
            </div>
          </div>
          <div v-else-if="activeTab === 'calendar'" class="calendar-card">
            <div class="calendar-header"><h3>近30天打卡</h3><div class="calendar-legend"><span class="legend-item"><span class="legend-dot me"/>我</span><span class="legend-item"><span class="legend-dot partner"/>TA</span></div></div>
            <div class="calendar-grid">
              <div v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="calendar-weekday">{{ d }}</div>
              <div v-for="(date, i) in calendarDays" :key="i" :class="['calendar-day', { today: formatDateIso(date) === today }]">
                <span :class="['day-number', { today: formatDateIso(date) === today }]">{{ date.getDate() }}</span>
                <div class="day-dots">
                  <span v-if="getDayCheckIns(date, currentUser.id) > 0" class="day-dot me"/>
                  <span v-if="getDayCheckIns(date, partner.id) > 0" class="day-dot partner"/>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="achievements">
            <div class="achievement-summary">
              <div><p class="summary-label">已解锁成就</p><p class="summary-value">{{ unlockedCount }}/{{ achievements.length }}</p></div>
              <span class="trophy-icon">🏆</span>
            </div>
            <div class="achievement-grid">
              <div v-for="ach in achievements" :key="ach.id" :class="['achievement-card', { unlocked: !!ach.unlockedAt }]">
                <div :class="['achievement-icon', { unlocked: !!ach.unlockedAt }]"><span v-if="ach.unlockedAt">{{ ach.icon }}</span><span v-else>🔒</span></div>
                <h4 :class="['achievement-title', { unlocked: !!ach.unlockedAt }]">{{ ach.title }}</h4>
                <p class="achievement-desc">{{ ach.description }}</p>
                <p v-if="ach.unlockedAt" class="achievement-date">⭐ {{ new Date(ach.unlockedAt).toLocaleDateString() }}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <teleport to="body">
        <div v-if="showCheckInDialog" class="modal-overlay" @click.self="showCheckInDialog = false">
          <div class="modal-dialog">
            <div class="modal-header">
              <h3><span class="modal-icon">{{ selectedHabit?.icon }}</span> 打卡 - {{ selectedHabit?.title }}</h3>
              <button class="close-btn" @click="showCheckInDialog = false">×</button>
            </div>
            <div class="modal-body">
              <!-- 日期选择（支持补打卡） -->
              <div v-if="availableCheckInDates.length > 1" class="form-group">
                <label class="form-label">选择日期</label>
                <div class="date-selector">
                  <button 
                    v-for="d in availableCheckInDates" 
                    :key="d.value" 
                    @click="checkInDate = d.value" 
                    :class="['date-btn', { active: checkInDate === d.value, today: d.isToday }]"
                  >
                    {{ d.label }}
                  </button>
                </div>
              </div>
              
              <div v-if="selectedHabit?.type === 'subtasks' && selectedDateSubTasks.length > 0" class="form-group">
                <label class="form-label">
                  完成的任务 
                  <span :class="['completion-badge', { perfect: isPerfectCheckIn }]">
                    {{ completedSubTasks.length }}/{{ selectedDateSubTasks.length }}
                  </span>
                </label>
                <div class="subtask-checklist">
                  <label v-for="task in selectedDateSubTasks" :key="task.id" class="subtask-check-item">
                    <input type="checkbox" :checked="completedSubTasks.includes(task.id)" @change="toggleSubTask(task.id)" class="subtask-checkbox" />
                    <span class="subtask-check-text">{{ task.title }}</span>
                  </label>
                </div>
                <p v-if="completedSubTasks.length === 0" class="form-hint" style="color: #9ca3af;">请至少完成一项任务</p>
                <p v-else-if="isPerfectCheckIn" class="form-hint" style="color: #22c55e;">🎉 全部完成，太棒了！</p>
                <p v-else class="form-hint">已完成 {{ completedSubTasks.length }} 项，继续加油！</p>
              </div>
              <div v-else-if="selectedHabit?.type === 'subtasks'" class="form-group">
                <p class="form-hint">该日期没有需要完成的子任务</p>
              </div>
              <div v-if="selectedHabit?.type === 'numeric'" class="form-group">
                <label class="form-label">记录数值 ({{ selectedHabit.numericConfig?.unit }})</label>
                <div class="numeric-input-wrap">
                  <input type="number" step="0.1" v-model="numericValue" :placeholder="'输入' + selectedHabit.numericConfig?.unit" class="form-input numeric-large" />
                  <span class="numeric-unit-label">{{ selectedHabit.numericConfig?.unit }}</span>
                </div>
                <p class="form-hint">目标: {{ selectedHabit.numericConfig?.targetValue }}{{ selectedHabit.numericConfig?.unit }}</p>
              </div>
              <div class="form-group">
                <label class="form-label">今天的心情</label>
                <div class="mood-selector">
                  <button v-for="mood in MOODS" :key="mood.value" @click="selectedMood = mood.value" :class="['mood-btn', { active: selectedMood === mood.value }]"><span>{{ mood.emoji }}</span><span>{{ mood.label }}</span></button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">打卡笔记（可选）</label>
                <textarea v-model="checkInNote" placeholder="记录下今天的心情..." class="form-textarea" rows="3" />
              </div>
              <button 
                @click="handleCheckIn" 
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
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).selfChecked }">
                <img v-if="currentUser.avatar" :src="currentUser.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ currentUser.name?.[0] || '我' }}</div>
                <span class="person-label">{{ getHabitStatus(selectedHabit).selfChecked ? '已完成' : '待打卡' }}</span>
              </div>
              <div class="connection-line">
                <div class="line-progress" :style="{ width: ((Number(getHabitStatus(selectedHabit).selfChecked) + Number(getHabitStatus(selectedHabit).partnerChecked)) / 2 * 100) + '%' }"></div>
                <span v-if="getHabitStatus(selectedHabit).isComplete" class="complete-heart">💕</span>
              </div>
              <div class="person-status" :class="{ done: getHabitStatus(selectedHabit).partnerChecked }">
                <img v-if="partner.avatar" :src="partner.avatar" class="person-avatar" />
                <div v-else class="person-avatar">{{ partner.name?.[0] || 'TA' }}</div>
                <span class="person-label">{{ getHabitStatus(selectedHabit).partnerChecked ? '已完成' : '待打卡' }}</span>
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
                        <path v-if="svgPath" fill="none" stroke="#FF6B8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="svgPath"/>
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
                  <h4 class="section-title">📋 任务清单 ({{ selectedHabit.subTasks.length }}项)</h4>
                  <div class="subtask-list">
                    <div v-for="(task, i) in selectedHabit.subTasks" :key="task.id" class="subtask-item">
                      <span class="subtask-index">{{ String(i + 1).padStart(2, '0') }}</span>
                      <span class="subtask-name">{{ task.title }}</span>
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
                    <span class="stat-highlight">{{ getStreak(selectedHabit?.id, currentUser.id) }} 天</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 底部操作 -->
            <div class="drawer-footer">
              <button v-if="canCheckIn(selectedHabit) && !getHabitStatus(selectedHabit).selfChecked" @click="showDetailDialog = false; openCheckIn(selectedHabit)" class="btn-action primary">立即打卡</button>
              <button @click="completeHabit(selectedHabit); showDetailDialog = false" class="btn-action secondary">🎉 完成计划</button>
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
      
      <teleport to="body">
        <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
          <div class="modal-dialog add-dialog">
            <div class="modal-header"><h3>✨ 添加新计划</h3><button class="close-btn" @click="showAddDialog = false">×</button></div>
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
                  <button v-for="opt in CREATE_PARTICIPATION_OPTIONS" :key="opt.value" @click="newHabitParticipation = opt.value" :class="['option-pill', { active: newHabitParticipation === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
                <p class="form-hint">{{ CREATE_PARTICIPATION_OPTIONS.find(o => o.value === newHabitParticipation)?.desc }}</p>
              </div>
              
              <!-- 打卡频率 -->
              <div class="form-group">
                <label class="form-label">打卡频率</label>
                <div class="option-pills">
                  <button v-for="opt in FREQUENCY_OPTIONS" :key="opt.value" @click="newHabitFrequency = opt.value" :class="['option-pill', { active: newHabitFrequency === opt.value }]">
                    {{ opt.label }}
                  </button>
                </div>
                <!-- 每周几天选择 -->
                <div v-if="newHabitFrequency === 'weekly'" class="weekday-selector">
                  <button v-for="day in WEEKDAYS" :key="day.value" @click="toggleWeekday(day.value)" :class="['weekday-btn', { active: newHabitWeekdays.includes(day.value) }]">
                    {{ day.label }}
                  </button>
                </div>
              </div>
              
              <!-- 计划类型 -->
              <div class="form-group">
                <label class="form-label">打卡方式</label>
                <div class="type-cards">
                  <button v-for="t in habitTypes" :key="t.value" @click="newHabitType = t.value" :class="['type-card', { active: newHabitType === t.value }]">
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
                <!-- 每周不同的子任务 -->
                <div v-if="newHabitFrequency === 'weekly'" class="weekday-tabs">
                  <button v-for="day in WEEKDAYS.filter(d => newHabitWeekdays.includes(d.value))" :key="day.value" @click="activeWeekday = day.value.toString()" :class="['weekday-tab', { active: activeWeekday === day.value.toString() }]">
                    周{{ day.label }}
                  </button>
                </div>
                <!-- 提示：每周类型但未选星期几 -->
                <div v-if="newHabitFrequency === 'weekly' && newHabitWeekdays.length === 0" class="form-hint" style="color: #9ca3af; text-align: center; padding: 20px;">
                  请先选择每周哪几天需要打卡
                </div>
                <!-- 子任务输入 -->
                <div v-else class="subtask-list">
                  <div v-for="(task, i) in currentSubTasks" :key="i" class="subtask-item">
                    <span class="subtask-num">{{ i + 1 }}</span>
                    <input v-model="currentSubTasks[i]" :placeholder="'子任务 ' + (i + 1)" class="form-input subtask-input" />
                    <button v-if="currentSubTasks.length > 1" @click="removeSubTask(i)" class="btn-icon-delete">×</button>
                  </div>
                  <button @click="addSubTask" class="btn-add-subtask">+ 添加子任务</button>
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
                    <input v-model="newNumericTarget" type="number" placeholder="0" class="form-input" />
                  </div>
                </div>
              </div>
              
              <!-- 描述 -->
              <div class="form-group">
                <label class="form-label">计划描述 <span class="optional">选填</span></label>
                <textarea v-model="newHabitDesc" placeholder="添加一些说明，激励自己和TA..." class="form-textarea" rows="2" />
              </div>
              

              <button @click="handleAddHabit" class="btn-primary w-full btn-submit" :disabled="!newHabitTitle.trim() || (newHabitType === 'numeric' && !newNumericUnit) || (newHabitType === 'subtasks' && !hasValidSubTasks)">✨ 创建计划</button>
            </div>
          </div>
        </div>
      </teleport>
      <div class="toast" :class="{ show: toast.show, [toast.type]: true }"><span>{{ toast.message }}</span></div>
      <!-- 右下角浮动按钮 -->
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CONFIG } from '../utils/config.js'
import BottomNav from '../components/BottomNav.vue'

const MOODS = [
  { value: 'happy', label: '开心', emoji: '😊', color: '#FCD34D' },
  { value: 'love', label: '甜蜜', emoji: '🥰', color: '#F472B6' },
  { value: 'excited', label: '兴奋', emoji: '🤩', color: '#FB923C' },
  { value: 'peaceful', label: '平静', emoji: '😌', color: '#6EE7B7' },
  { value: 'tired', label: '疲惫', emoji: '😴', color: '#9CA3AF' },
]

const COLORS = ['#FF6B8A', '#7B68EE', '#00C9A7', '#FFB347', '#40E0D0', '#FF6B6B', '#95E1D3', '#F38181']

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

export default {
  name: 'Plans',
  components: { BottomNav },
  setup() {
    const router = useRouter()
    const loading = ref(true)
    const habits = ref([])
    const checkIns = ref([])
    const currentUser = ref({ id: '', name: '我', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=ffdfbf' })
    const partner = ref({ id: '', name: 'TA', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede' })

    const activeTab = ref('plans')
    const filterType = ref('all')
    const showCheckInDialog = ref(false)
    const showAddDialog = ref(false)
    const showDetailDialog = ref(false)
    const selectedHabit = ref(null)
    
    // 打卡日期选择（支持补打卡）
    const checkInDate = ref('')
    
    // 获取指定日期的子任务（根据星期几过滤）
    const getSubTasksForDate = (dateStr) => {
      if (!selectedHabit.value?.subTasks) return []
      const subTasks = selectedHabit.value.subTasks
      if (subTasks.some(s => s.weekday !== undefined)) {
        const date = new Date(dateStr)
        const weekday = date.getDay()
        return subTasks.filter(s => s.weekday === weekday)
      }
      return subTasks
    }
    
    // 当前选中日期对应的子任务
    const selectedDateSubTasks = computed(() => {
      return getSubTasksForDate(checkInDate.value || getToday())
    })
    
    // 本周未打卡的日期列表（用于补打卡）
    const availableCheckInDates = computed(() => {
      if (!selectedHabit.value) return []
      const dates = []
      const today = new Date()
      const todayStr = getToday()
      
      // 获取本周一（周日是0，周一是1）
      const currentDay = today.getDay()
      const monday = new Date(today)
      monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1))
      
      // 遍历本周一到今天
      for (let i = 0; i <= 6; i++) {
        const d = new Date(monday)
        d.setDate(monday.getDate() + i)
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        
        // 如果超过今天，停止
        if (dateStr > todayStr) break
        
        // 检查该日期是否需要打卡（根据frequency和weekdays）
        const habit = selectedHabit.value
        let needCheckIn = true
        if (habit.frequency === 'weekly' && habit.weekdays?.length > 0) {
          needCheckIn = habit.weekdays.map(Number).includes(d.getDay())
        }
        
        if (needCheckIn) {
          // 检查是否已打卡
          const alreadyChecked = checkIns.value.some(
            c => c.habitId === habit.id && c.userId === currentUser.value.id && c.date === dateStr
          )
          if (!alreadyChecked) {
            dates.push({
              value: dateStr,
              label: dateStr === todayStr ? '今天' : `周${['日','一','二','三','四','五','六'][d.getDay()]} ${d.getMonth() + 1}/${d.getDate()}`,
              isToday: dateStr === todayStr
            })
          }
        }
      }
      return dates
    })
    
    // 是否完美打卡（全部子任务完成）
    const isPerfectCheckIn = computed(() => {
      const tasks = selectedDateSubTasks.value
      if (tasks.length === 0) return true // 无子任务视为完美
      return completedSubTasks.value.length === tasks.length
    })
    
    // 打卡按钮状态
    const checkInButtonStatus = computed(() => {
      const tasks = selectedDateSubTasks.value
      const completed = completedSubTasks.value.length
      
      if (completed === 0) {
        return { disabled: true, text: '请至少完成一项任务', type: 'disabled' }
      }
      if (tasks.length === 0 || completed === tasks.length) {
        return { disabled: false, text: '🎉 完美打卡', type: 'perfect' }
      }
      return { disabled: false, text: '确认打卡', type: 'normal' }
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

    const toast = ref({ show: false, message: '', type: 'info' })
    // 获取今天的日期字符串（使用本地时间，避免 UTC 时差问题）
    const getToday = () => {
      const d = new Date()
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    const today = computed(() => getToday())

    // 成就系统 - 更有意义的成就设计
    const ACHIEVEMENTS_CONFIG = [
      { id: 'first_checkin', title: '初见成效', description: '完成第一次打卡', icon: '🌱', condition: (stats) => stats.totalCheckIns >= 1 },
      { id: 'streak_3', title: '习惯养成', description: '连续打卡3天', icon: '🔥', condition: (stats) => stats.maxStreak >= 3 },
      { id: 'streak_7', title: '坚持不懈', description: '连续打卡7天', icon: '⚡', condition: (stats) => stats.maxStreak >= 7 },
      { id: 'streak_30', title: '习惯大师', description: '连续打卡30天', icon: '👑', condition: (stats) => stats.maxStreak >= 30 },
      { id: 'both_together', title: '默契十足', description: '和TA共同完成同一个计划', icon: '💕', condition: (stats) => stats.bothCompletedCount >= 1 },
      { id: 'perfect_week', title: '完美一周', description: '一周内每天都完成计划', icon: '📅', condition: (stats) => stats.perfectWeek },
      { id: 'habit_master', title: '多面手', description: '同时保持3个计划的打卡', icon: '🎯', condition: (stats) => stats.activeHabits >= 3 },
      { id: 'night_owl', title: '夜猫子', description: '晚上10点后完成打卡', icon: '🌙', condition: (stats) => stats.nightCheckIn },
      { id: 'early_bird', title: '早起鸟', description: '早上7点前完成打卡', icon: '🌅', condition: (stats) => stats.earlyCheckIn },
      { id: 'completer', title: '计划终结者', description: '完成一个计划（手动归档）', icon: '🎉', condition: (stats) => stats.completedHabits >= 1 },
    ]
    
    // 从 localStorage 加载已解锁成就
    const loadUnlockedAchievements = () => {
      try {
        const saved = localStorage.getItem('unlockedAchievements')
        return saved ? JSON.parse(saved) : {}
      } catch (e) {
        return {}
      }
    }
    
    const unlockedAchievementsMap = ref(loadUnlockedAchievements())
    
    const achievements = ref(ACHIEVEMENTS_CONFIG.map(a => ({ 
      ...a, 
      unlockedAt: unlockedAchievementsMap.value[a.id] || null 
    })))
    
    // 成就解锁提示
    const achievementUnlock = ref({ show: false, achievement: null })
    // 记录本次会话已经显示过的成就，避免重复提示
    const shownAchievements = ref(new Set())

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      setTimeout(() => toast.value.show = false, 2500)
    }
    
    // 保存已解锁成就到 localStorage
    const saveUnlockedAchievement = (achievementId) => {
      unlockedAchievementsMap.value[achievementId] = new Date().toISOString()
      try {
        localStorage.setItem('unlockedAchievements', JSON.stringify(unlockedAchievementsMap.value))
      } catch (e) {}
    }

    const getToken = () => localStorage.getItem('token')

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
            partner.value.name = data.user.partner.nickname || 'TA'
            partner.value.avatar = data.user.partner.avatar || null
          }
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

    // 计算成就统计数据
    const calculateAchievementStats = () => {
      const myCheckIns = checkIns.value.filter(c => c.userId === currentUser.value.id)
      const totalCheckIns = myCheckIns.length
      const maxStreak = getMaxStreak(currentUser.value.id)
      
      // 计算双方共同完成的次数
      const bothHabits = habits.value.filter(h => h.participation === 'both')
      let bothCompletedCount = 0
      bothHabits.forEach(h => {
        const myDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === currentUser.value.id).map(c => c.date))
        const partnerDates = new Set(checkIns.value.filter(c => c.habitId === h.id && c.userId === partner.value.id).map(c => c.date))
        myDates.forEach(d => { if (partnerDates.has(d)) bothCompletedCount++ })
      })
      
      // 检查完美一周（最近7天每天都打卡）
      const dates = [...new Set(myCheckIns.map(c => c.date))].sort()
      let perfectWeek = false
      if (dates.length >= 7) {
        const last7Days = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          last7Days.push(d.toISOString().split('T')[0])
        }
        perfectWeek = last7Days.every(day => dates.includes(day))
      }
      
      // 活跃计划数（今天有打卡的）
      const activeHabits = habits.value.filter(h => hasCheckedInToday(h.id, currentUser.value.id)).length
      
      // 夜猫子/早起鸟检查
      const nightCheckIn = myCheckIns.some(c => {
        const hour = new Date(c.createdAt || c.date).getHours()
        return hour >= 22
      })
      const earlyCheckIn = myCheckIns.some(c => {
        const hour = new Date(c.createdAt || c.date).getHours()
        return hour < 7
      })
      
      // 已完成的计划数
      const completedHabits = habits.value.filter(h => h.status === 'completed').length
      
      return {
        totalCheckIns,
        maxStreak,
        bothCompletedCount,
        perfectWeek,
        activeHabits,
        nightCheckIn,
        earlyCheckIn,
        completedHabits
      }
    }
    
    // 检查并解锁成就
    const checkAchievements = (showNotification = false) => {
      const stats = calculateAchievementStats()
      let newUnlock = false
      
      achievements.value.forEach(ach => {
        // 如果之前未解锁，且条件满足
        if (!ach.unlockedAt && ach.condition(stats)) {
          const now = new Date().toISOString()
          ach.unlockedAt = now
          saveUnlockedAchievement(ach.id)
          newUnlock = true
          
          // 只在显式要求显示通知（如打卡后）且本次会话未显示过时才显示
          if (showNotification && !shownAchievements.value.has(ach.id)) {
            shownAchievements.value.add(ach.id)
            showAchievementUnlock(ach)
          }
        }
      })
      
      return newUnlock
    }
    
    // 显示成就解锁弹窗
    const showAchievementUnlock = (achievement) => {
      achievementUnlock.value = { show: true, achievement }
      // 播放庆祝效果
      setTimeout(() => {
        achievementUnlock.value.show = false
      }, 4000)
    }
    
    // 页面加载时检查成就（不显示通知）
    const fetchAchievements = () => {
      checkAchievements(false)
    }

    const getMaxStreak = (userId) => {
      let max = 0
      habits.value.forEach(h => { const s = getStreak(h.id, userId); if (s > max) max = s })
      return max
    }

    const unlockedCount = computed(() => achievements.value.filter(a => a.unlockedAt).length)

    const hasCheckedInToday = (habitId, userId) => checkIns.value.some(ci => ci.habitId === habitId && ci.userId === userId && ci.date === getToday())

    const getStreak = (habitId, userId) => {
      const dates = [...new Set(checkIns.value.filter(ci => ci.habitId === habitId && ci.userId === userId).map(ci => ci.date))].sort((a, b) => b.localeCompare(a))
      if (dates.length === 0) return 0
      let streak = 0
      const checkDate = new Date()
      for (let i = 0; i < 365; i++) {
        const dateStr = checkDate.toISOString().split('T')[0]
        if (dates.includes(dateStr)) streak++
        else if (i > 0) break
        checkDate.setDate(checkDate.getDate() - 1)
      }
      return streak
    }

    const canCheckIn = (habit) => {
      if (habit.participation === 'self') return habit.createdBy === currentUser.value.id
      if (habit.participation === 'both') return true
      if (habit.participation === 'partner') return false
      return false
    }

    const getHabitStatus = (habit) => {
      const selfChecked = hasCheckedInToday(habit.id, currentUser.value.id)
      const partnerChecked = hasCheckedInToday(habit.id, partner.value.id)
      switch (habit.participation) {
        case 'both': return { canCheckIn: !selfChecked, isComplete: selfChecked && partnerChecked, selfChecked, partnerChecked, showBoth: true }
        case 'self': return { canCheckIn: !selfChecked, isComplete: selfChecked, selfChecked, partnerChecked: false, showBoth: false }
        case 'partner': return { canCheckIn: false, isComplete: partnerChecked, selfChecked: false, partnerChecked, showBoth: false }
      }
      return { canCheckIn: false, isComplete: false, selfChecked: false, partnerChecked: false, showBoth: false }
    }

    const progress = computed(() => {
      let total = 0, completed = 0
      habits.value.forEach(habit => {
        const status = getHabitStatus(habit)
        if (habit.participation === 'both') { total += 2; completed += (status.selfChecked ? 1 : 0) + (status.partnerChecked ? 1 : 0) }
        else if (habit.participation === 'self') { total += 1; completed += status.selfChecked ? 1 : 0 }
        else if (habit.participation === 'partner') { total += 1; completed += status.partnerChecked ? 1 : 0 }
      })
      return { completed, total, percent: total > 0 ? (completed / total) * 100 : 0 }
    })

    // 判断今天是否需要打卡（按星期几过滤）
    const isHabitActiveToday = (habit) => {
      if (habit.frequency !== 'weekly' || !habit.weekdays || habit.weekdays.length === 0) return true
      const todayWeekday = new Date().getDay()
      // 确保类型一致（转为数字比较）
      return habit.weekdays.map(Number).includes(todayWeekday)
    }
    
    const filteredHabits = computed(() => {
      const filtered = filterType.value === 'all' ? habits.value : habits.value.filter(h => h.participation === filterType.value)
      // 只显示今天需要打卡的任务
      return filtered.filter(isHabitActiveToday)
    })
    
    // 排序：未完成的在前，已完成的置底
    const sortedHabits = computed(() => {
      return [...filteredHabits.value].sort((a, b) => {
        const aComplete = getHabitStatus(a).isComplete
        const bComplete = getHabitStatus(b).isComplete
        if (aComplete === bComplete) return 0
        return aComplete ? 1 : -1
      })
    })
    const filterTabs = [{ id: 'all', label: '全部' }, { id: 'both', label: '两人一起' }, { id: 'self', label: '仅自己' }, { id: 'partner', label: '仅对方' }]
    const mainTabs = [{ id: 'plans', label: '今日打卡' }, { id: 'calendar', label: '打卡日历' }, { id: 'achievements', label: '成就徽章' }]

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
      const colors = ['#FF6B8A', '#7B68EE', '#00C9A7', '#FFB347', '#40E0D0', '#FF6B6B', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3']
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

    const calendarDays = computed(() => {
      const days = []
      const t = new Date()
      for (let i = 29; i >= 0; i--) { const d = new Date(t); d.setDate(d.getDate() - i); days.push(d) }
      return days
    })

    const formatDateIso = (date) => date.toISOString().split('T')[0]
    const getDayCheckIns = (date, userId) => checkIns.value.filter(ci => ci.date === formatDateIso(date) && ci.userId === userId).length

    const openCheckIn = (habit) => {
      selectedHabit.value = habit
      
      // 设置默认打卡日期为今天
      checkInDate.value = getToday()
      
      // 默认不勾选任何子任务（用户主动选择）
      completedSubTasks.value = []
      
      numericValue.value = ''
      selectedMood.value = 'happy'
      checkInNote.value = ''
      showCheckInDialog.value = true
    }

    const openDetail = (habit) => { selectedHabit.value = habit; showDetailDialog.value = true }

    const toggleSubTask = (taskId) => {
      if (completedSubTasks.value.includes(taskId)) completedSubTasks.value = completedSubTasks.value.filter(id => id !== taskId)
      else completedSubTasks.value.push(taskId)
    }

    // 完成计划（归档）
    const completeHabit = async (habit) => {
      if (!confirm('确定要完成这个计划吗？完成后该计划将不再出现在列表中。')) return
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
          showToast('🎉 计划已完成！', 'success')
          fetchAchievements()
        } else showToast(data.message, 'error')
      } catch (e) { showToast('网络错误', 'error') }
    }

    const handleCheckIn = async () => {
      if (!selectedHabit.value) return
      // 检查是否至少完成了一项
      if (selectedHabit.value.type === 'subtasks' && completedSubTasks.value.length === 0) {
        showToast('请至少完成一项子任务', 'error')
        return
      }
      try {
        const body = {
          date: checkInDate.value,
          mood: selectedMood.value,
          note: checkInNote.value,
          completedSubTasks: selectedHabit.value.type === 'subtasks' ? completedSubTasks.value : undefined,
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
          checkIns.value.push({ ...data.data, habitId: selectedHabit.value.id })
          if (selectedHabit.value.type === 'numeric' && numericValue.value) {
            const h = habits.value.find(h => h.id === selectedHabit.value.id)
            if (h) { h.numericRecords = h.numericRecords || []; h.numericRecords.push({ date: checkInDate.value, value: parseFloat(numericValue.value), userId: currentUser.value.id, note: checkInNote.value }) }
          }
          showCheckInDialog.value = false
          
          // 根据打卡类型显示不同提示
          const isToday = checkInDate.value === getToday()
          if (isPerfectCheckIn.value) {
            showToast(isToday ? '🎉 完美打卡！太棒了！' : '🎉 完美补卡成功！', 'success')
          } else {
            showToast(isToday ? '打卡成功！继续保持哦 💪' : '补卡成功！', 'success')
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
            const weekdayMap = {
              monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
              friday: 5, saturday: 6, sunday: 0
            }
            Object.entries(weekdayMap).forEach(([key, weekday]) => {
              const tasks = newSubTasks.value[key] || []
              tasks.filter(s => s.trim()).forEach((s, i) => {
                subTasks.push({ id: `st-${key}-${i}`, title: s, completed: false, weekday })
              })
            })
          } else {
            // 默认子任务
            subTasks = newSubTasks.value.default.filter(s => s.trim()).map((s, i) => ({ id: 'st-' + i, title: s, completed: false }))
          }
        }
        const body = {
          title: newHabitTitle.value,
          description: newHabitDesc.value,
          type: newHabitType.value,
          participation: newHabitParticipation.value,
          frequency: newHabitFrequency.value,
          weekdays: newHabitFrequency.value === 'weekly' ? newHabitWeekdays.value : undefined,

          subTasks,
          numericConfig: newHabitType.value === 'numeric' && newNumericUnit.value ? { unit: newNumericUnit.value, targetValue: parseFloat(newNumericTarget.value) || 0, lowerIsBetter: false } : undefined,
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
      newHabitWeekdays.value = [1, 2, 3, 4, 5]; ; activeWeekday.value = 'default'
      newSubTasks.value = { default: ['', ''], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [] }
      newNumericUnit.value = ''; newNumericTarget.value = ''
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

    const goBack = () => router.push('/home')

    onMounted(async () => {
      const token = getToken()
      if (token) { try { currentUser.value.id = JSON.parse(atob(token.split('.')[1])).userId } catch (e) {} }
      await fetchUserInfo()
      await fetchHabits()
      await fetchCheckIns()
      fetchAchievements()
      loading.value = false
    })

    return {
      loading, habits, checkIns, currentUser, partner, activeTab, filterType,
      showCheckInDialog, showAddDialog, showDetailDialog, selectedHabit,
      selectedMood, checkInNote, numericValue, completedSubTasks, selectedDateSubTasks,
      checkInDate, availableCheckInDates, isPerfectCheckIn, checkInButtonStatus,
      newHabitTitle, newHabitDesc, newHabitType,
      newHabitParticipation, newHabitFrequency, newHabitWeekdays, newSubTasks, newNumericUnit, newNumericTarget, activeWeekday,
      toast, today, achievements, unlockedCount, progress, filteredHabits, sortedHabits, achievementUnlock,
      filterTabs, mainTabs, calendarDays, chartData, svgPointsData, svgPoints, svgPath, chartPointsCSS, yAxisTicks, xAxisTicks,
      MOODS, COLORS, PARTICIPATION_OPTIONS, CREATE_PARTICIPATION_OPTIONS, FREQUENCY_OPTIONS, WEEKDAYS, habitTypes,
      participationLabel, getHabitStatus, getHabitColor, getStreak, canCheckIn,
      getTrend, formatDateIso, getDayCheckIns, openCheckIn, openDetail, toggleSubTask,
      handleCheckIn, handleAddHabit, goBack,
      toggleWeekday, currentSubTasks, addSubTask, removeSubTask, hasValidSubTasks,
      completeHabit, showAchievementUnlock,
    }
  }
}
</script>
<style scoped>
.plans-page { min-height: 100vh; position: relative; }
.app { position: relative; z-index: 1; min-height: 100vh; padding-bottom: 100px; }
.header { position: sticky; top: 0; z-index: 100; padding: env(safe-area-inset-top, 0px) 16px 12px; background: rgba(253, 253, 245, 0.95); backdrop-filter: blur(20px); border-bottom: 1px solid var(--border-color); }
.header-content { display: flex; justify-content: space-between; align-items: center; max-width: 480px; margin: 0 auto; }
.header-title { font-size: 18px; font-weight: 600; color: var(--text-primary); }
.icon-btn { width: 40px; height: 40px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s ease; color: var(--text-secondary); }
.icon-btn:hover { background: var(--bg-card-hover); border-color: var(--border-focus); color: var(--text-primary); }
.main { max-width: 480px; margin: 0 auto; padding: 16px; }

.progress-card { margin: 0 0 16px; padding: 20px; background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); border-radius: 24px; color: white; }
.progress-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.progress-label { opacity: 0.9; font-size: 13px; }
.progress-value { font-size: 32px; font-weight: 800; margin-top: 4px; }
.progress-heart { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
.heart-icon { width: 28px; height: 28px; animation: pulse 1.5s ease-in-out infinite; }
.progress-bar-bg { height: 8px; background: rgba(255,255,255,0.25); border-radius: 4px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: white; border-radius: 4px; transition: width 0.5s ease; }
.progress-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
.avatar-group { display: flex; }
.avatar { width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-text { color: white; font-size: 14px; font-weight: 600; }
.avatar-second { margin-left: -10px; }
.progress-text { font-size: 13px; opacity: 0.95; }

.filter-tabs { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; padding-bottom: 4px; }
.filter-tab { flex-shrink: 0; padding: 8px 14px; border-radius: 20px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.filter-tab.active { background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); color: white; border-color: transparent; }

.main-tabs { display: flex; gap: 8px; margin-bottom: 16px; overflow-x: auto; padding-bottom: 4px; }
.main-tab { flex-shrink: 0; padding: 10px 18px; border-radius: 24px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-secondary); font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
.main-tab.active { background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); color: white; border-color: transparent; box-shadow: 0 4px 12px rgba(123, 104, 238, 0.25); }

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
  border-left-width: 4px;
  border-left-color: #e5e7eb;
}
.habit-item:last-child { margin-bottom: 0; }
.habit-item:active { transform: scale(0.995); background: #fafafa; }
.habit-item.complete { 
  background: #f6fef9; 
  border-color: #86efac;
  border-left-color: #22c55e !important;
  opacity: 0.85;
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

.connection-line {
  width: 60px;
  height: 2px;
  background: #e5e7eb;
  position: relative;
}
.line-progress {
  height: 100%;
  background: #22c55e;
  transition: width 0.3s ease;
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
  border: 2px solid #7B68EE;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  cursor: pointer;
  pointer-events: auto;
  transition: transform 0.2s, border-color 0.2s;
}
.chart-point:hover {
  transform: translate(-50%, -50%) scale(1.3);
  border-color: #FF6B8A;
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
  background: linear-gradient(90deg, #FF6B8A, #7B68EE);
  transform-origin: left center;
  border-radius: 1px;
}
.chart-point {
  position: absolute;
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid #7B68EE;
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
  gap: 12px;
}
.btn-action {
  flex: 1;
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

.achievement-summary { display: flex; justify-content: space-between; align-items: center; background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); border-radius: 20px; padding: 18px 24px; margin-bottom: 20px; box-shadow: 0 4px 15px rgba(255, 107, 138, 0.25); }
.summary-label { font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500; }
.summary-value { font-size: 28px; font-weight: 800; color: white; margin-top: 4px; }
.trophy-icon { font-size: 40px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); animation: trophyShine 2s ease infinite; }

@keyframes trophyShine {
  0%, 100% { transform: scale(1); filter: brightness(1); }
  50% { transform: scale(1.05); filter: brightness(1.2); }
}

.achievement-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.achievement-card { border-radius: 20px; padding: 18px 16px; border: 2px solid transparent; transition: all 0.3s ease; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-color: #dee2e6; opacity: 0.6; position: relative; overflow: hidden; }
.achievement-card::before { content: '🔒'; position: absolute; top: 10px; right: 10px; font-size: 14px; opacity: 0.3; }
.achievement-card.unlocked { background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border-color: #ffc107; opacity: 1; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 193, 7, 0.25); }
.achievement-card.unlocked::before { content: '✨'; opacity: 1; animation: sparkle 1.5s ease infinite; }

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
}

.achievement-icon { width: 48px; height: 48px; border-radius: 16px; background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%); display: flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 12px; transition: all 0.3s ease; }
.achievement-card.unlocked .achievement-icon { background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%); box-shadow: 0 4px 12px rgba(255, 193, 7, 0.4); transform: scale(1.05); }
.achievement-title { font-size: 15px; font-weight: 700; color: #6c757d; margin-bottom: 4px; }
.achievement-card.unlocked .achievement-title { color: #856404; }
.achievement-desc { font-size: 12px; color: #adb5bd; line-height: 1.4; }
.achievement-card.unlocked .achievement-desc { color: #997404; }
.achievement-date { font-size: 11px; color: #d97706; margin-top: 10px; display: flex; align-items: center; gap: 4px; font-weight: 600; background: rgba(255, 193, 7, 0.15); padding: 4px 10px; border-radius: 12px; width: fit-content; }

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
  animation: celebrationPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.celebration-stars {
  font-size: 32px;
  animation: starsTwinkle 1s ease infinite;
  margin-bottom: 16px;
}

.achievement-big-icon {
  font-size: 80px;
  margin: 20px 0;
  animation: iconBounce 0.6s ease infinite alternate;
  filter: drop-shadow(0 4px 20px rgba(255, 193, 7, 0.5));
}

.celebration-title {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
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
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes starsTwinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.9); }
}

@keyframes iconBounce {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(-10px) scale(1.1); }
}

@keyframes fireworkFly {
  0% { transform: translateY(20px) scale(0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translateY(-60px) scale(1.5); opacity: 0; }
}

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px; }
.modal-dialog { width: 100%; max-width: 480px; max-height: 85vh; background: var(--bg-card); border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; animation: fadeIn 0.2s ease; }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(0,0,0,0.05); }
.modal-header h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.modal-icon { font-size: 22px; }
.close-btn { width: 32px; height: 32px; border-radius: 50%; border: none; background: #f3f4f6; color: #6b7280; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal-body { padding: 16px 20px 24px; overflow-y: auto; }

.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 8px; }
.form-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; transition: all 0.2s; }
.form-input:focus { border-color: var(--border-focus); background: white; }
.form-textarea { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--bg-input); font-size: 14px; outline: none; resize: none; transition: all 0.2s; font-family: inherit; }
.form-textarea:focus { border-color: var(--border-focus); background: white; }
.form-hint { font-size: 12px; color: #9ca3af; margin-top: 6px; }

.subtask-checklist { display: flex; flex-direction: column; gap: 8px; }
.subtask-check-item { display: flex; align-items: center; gap: 10px; padding: 12px; background: #f9fafb; border-radius: 12px; cursor: pointer; }
.subtask-checkbox { width: 20px; height: 20px; accent-color: #ec4899; }
.subtask-check-text { font-size: 14px; }

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
.btn-text { display: flex; align-items: center; gap: 4px; padding: 8px 0; background: transparent; border: none; color: #FF6B8A; font-size: 13px; cursor: pointer; }

.color-row { display: flex; gap: 8px; flex-wrap: wrap; }
.color-btn-select { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; }
.color-btn-select.active { box-shadow: 0 0 0 2px white, 0 0 0 4px #374151; transform: scale(1.1); }

.target-days { display: flex; gap: 8px; flex-wrap: wrap; }
.day-btn { padding: 6px 12px; border-radius: 20px; border: 1px solid #e5e7eb; background: #f3f4f6; color: #4b5563; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.day-btn.active { background: #ec4899; color: white; border-color: #ec4899; }

.btn-primary { padding: 14px; border-radius: 14px; border: none; background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); color: white; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; box-shadow: 0 4px 15px rgba(255, 107, 138, 0.3); }
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(255, 107, 138, 0.4); }
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

.toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-20px); padding: 12px 20px; background: rgba(0,0,0,0.8); color: white; border-radius: 24px; font-size: 14px; opacity: 0; pointer-events: none; transition: all 0.3s; z-index: 300; }
.toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
.toast.success { background: #10b981; }
.toast.error { background: #ef4444; }

/* 日期选择器 */
.date-selector { display: flex; gap: 8px; flex-wrap: wrap; }
.date-btn { padding: 8px 14px; border-radius: 20px; border: 1px solid #e5e7eb; background: #f9fafb; color: #6b7280; font-size: 13px; cursor: pointer; transition: all 0.2s; }
.date-btn.active { background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%); color: white; border-color: transparent; }
.date-btn.today { font-weight: 600; }

/* 完成徽章 */
.completion-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 10px; background: #f3f4f6; color: #6b7280; font-size: 12px; font-weight: 600; margin-left: 8px; transition: all 0.2s; }
.completion-badge.perfect { background: #dcfce7; color: #16a34a; }

/* 打卡按钮样式 */
.btn-checkin.perfect { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); box-shadow: 0 4px 15px rgba(34, 197, 94, 0.3); }
.btn-checkin.perfect:hover:not(:disabled) { box-shadow: 0 6px 20px rgba(34, 197, 94, 0.4); }
.btn-checkin.disabled { background: #e5e7eb !important; color: #9ca3af !important; cursor: not-allowed; box-shadow: none; }

@keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }

/* 右下角浮动按钮 */
.fab {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(255, 107, 138, 0.4);
  z-index: 50;
  transition: all 0.3s ease;
}

.fab:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(255, 107, 138, 0.5);
}

.fab:active {
  transform: scale(0.95);
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
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
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
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
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
  border-color: #FF6B8A;
  background: rgba(255, 107, 138, 0.08);
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
  border-color: #FF6B8A;
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
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
  background: linear-gradient(135deg, #FF6B8A 0%, #7B68EE 100%);
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
  border-color: #FF6B8A;
  color: #FF6B8A;
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
</style>
