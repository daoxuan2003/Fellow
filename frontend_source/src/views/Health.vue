<template>
  <div class="health-page">
    <!-- 头部 -->
    <header class="page-header">
      <button class="back-btn" @click="$router.back()">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </button>
      <h1 class="page-title">健康档案</h1>
      <div class="header-spacer"></div>
    </header>

    <!-- Tab 切换 -->
    <div class="tab-bar">
      <div class="tab-item" :class="{ active: activeTab === 'mine' }" @click="activeTab = 'mine'">
        <span class="tab-avatar">{{ mineAvatar }}</span>
        <span class="tab-name">我</span>
      </div>
      <div class="tab-item" :class="{ active: activeTab === 'partner' }" @click="activeTab = 'partner'">
        <span class="tab-avatar">{{ partnerAvatar }}</span>
        <span class="tab-name">{{ partnerPronoun }}</span>
      </div>
    </div>

    <main class="page-body" v-if="currentUser">
      <div v-if="loading" class="health-sync-banner">
        <span>正在同步健康档案</span>
      </div>
      <div v-else-if="recordsError" class="health-sync-banner error">
        <span>{{ recordsError }}</span>
        <button type="button" @click="fetchRecords">重试</button>
      </div>

      <section class="health-cover" :class="'mode-' + healthProfileBoard.mode">
        <div class="health-cover-top">
          <div class="health-cover-copy">
            <span class="health-kicker">{{ displayActorLabel }} · 身体档案</span>
            <h2>{{ healthProfileBoard.headline }}</h2>
            <p>{{ healthProfileBoard.detail }}</p>
          </div>
          <button v-if="activeTab === 'mine'" type="button" class="health-cover-action" @click="openFullForm">
            {{ healthProfileBoard.primaryAction }}
          </button>
          <span v-else class="health-cover-readonly">只读</span>
        </div>
        <div class="health-cover-metrics" aria-label="身体档案可信状态">
          <div v-for="metric in healthProfileBoard.metrics" :key="metric.key" class="health-cover-metric">
            <span>{{ metric.label }}</span>
            <strong>{{ metric.value }}</strong>
            <em>{{ metric.detail }}</em>
          </div>
        </div>
        <div v-if="healthMissingPreview" class="health-cover-missing">
          <span>待补全</span>
          <b>{{ healthMissingPreview }}</b>
        </div>
      </section>

      <!-- 人体图 -->
      <div class="body-map-section">
        <div class="body-map-card">
          <div class="body-map-title">点击部位快速记录</div>
          <div class="body-map-wrapper">
            <svg class="body-svg" viewBox="320 0 400 720" preserveAspectRatio="xMidYMid meet">
              <path
                class="body-silhouette"
                d="M520 48 C552 48 570 73 565 103 C562 121 552 134 544 143 C546 160 558 171 585 177 C624 185 636 222 633 271 L628 338 C627 365 644 395 654 423 C662 446 653 460 638 448 C626 439 618 419 610 391 L602 345 C596 389 594 426 589 464 L579 551 C575 586 588 622 586 657 C584 684 570 704 550 704 C537 704 531 691 530 670 L524 536 C523 523 517 523 516 536 L510 670 C509 691 503 704 490 704 C470 704 456 684 454 657 C452 622 465 586 461 551 L451 464 C446 426 443 389 438 345 L430 391 C422 419 414 439 402 448 C387 460 378 446 386 423 C396 395 413 365 412 338 L407 271 C404 222 416 185 455 177 C482 171 494 160 496 143 C488 134 478 121 475 103 C470 73 488 48 520 48 Z"
              />

              <!-- 标记点与连线 -->
              <g v-for="(pt, key) in currentBodyPoints" :key="key" class="body-point-group" @click="openQuickEdit(key)">
                <line :x1="pt.x" :y1="pt.y" :x2="pt.lx" :y2="pt.ly" stroke="#7E3A55" stroke-width="1" stroke-dasharray="3,2" opacity="0.95"/>
                <circle :cx="pt.x" :cy="pt.y" r="5" fill="#7E3A55" class="point-circle"/>
                <text :x="pt.tx" :y="pt.ty" text-anchor="start" dominant-baseline="middle" font-size="20" fill="#4B2432" font-weight="700">{{ pt.label }} {{ formatBodyValue(key) }}</text>
              </g>
            </svg>
          </div>

          <!-- 基础信息卡片 -->
          <div class="base-stats">
            <div class="base-stat" @click="openQuickEdit('height')">
              <span class="base-label">身高</span>
              <span class="base-value">{{ formatMetricValue(displayLatest.height, 'cm') }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('weight')">
              <span class="base-label">体重</span>
              <span class="base-value">{{ formatMetricValue(displayLatest.weight, 'kg') }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('bodyFat')">
              <span class="base-label">体脂</span>
              <span class="base-value">{{ formatMetricValue(displayLatest.bodyFat, '%') }}</span>
            </div>
            <div class="base-stat bmi-stat" v-if="displayBMI !== null">
              <span class="base-label">BMI</span>
              <span class="base-value" :style="{ color: getBMIStatus(displayBMI).color }">
                {{ displayBMI }}
                <small class="bmi-tag">{{ getBMIStatus(displayBMI).label }}</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 月经周期 -->
      <!-- 1. 女性用户看自己时显示自己的月经周期 -->
      <div class="menstrual-section" v-if="activeTab === 'mine' && currentUser?.gender === 'female'">
        <div class="section-header">
          <span class="section-icon blood-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
            </svg>
          </span>
          <span class="section-title">我的月经周期</span>
          <button v-if="latestMenstrual && !latestMenstrual.cycleEnd" class="menstrual-action-btn end" @click.stop="openEndModal">结束月经</button>
          <button v-else class="menstrual-action-btn start" @click.stop="openStartModal">记录月经</button>
        </div>
        <CycleForecastBoard v-if="myCycleBoard" :board="myCycleBoard" />
        <!-- 进行中：显示每日打卡流 -->
        <div v-if="latestMenstrual && !latestMenstrual.cycleEnd" class="menstrual-card ongoing" @click="openCheckinModal(latestMenstrual)">
          <div class="period-header">
            <span>开始 {{ formatDate(latestMenstrual.cycleStart) }}</span>
            <span class="ongoing-badge">进行中 · 第{{ menstrualDays }}天</span>
          </div>
          <div class="flow-days">
            <div v-for="day in getPeriodFlowDays(latestMenstrual)" :key="day.date" class="flow-day" :class="{ 'recorded': day.flowLevel, 'today': day.date === getLocalDateStr() }" @click.stop="day.flowLevel ? openDayDetail(latestMenstrual, day) : openCheckinModal(latestMenstrual, day.date)">
              <div class="day-num">第{{ day.dayNum }}天</div>
              <div class="day-date">{{ formatDate(day.date) }}</div>
              <div class="day-flow" :class="day.flowLevel ? 'level-' + day.flowLevel : ''">{{ day.flowLevel ? day.flowLevel + '级' : day.flowLabel }}</div>
              <div v-if="day.symptoms.length" class="day-symptoms">{{ day.symptoms.join('·') }}</div>
            </div>
          </div>
          <div class="card-hint">点击卡片记录今日情况</div>
        </div>
        <!-- 无周期或已结束：显示最新周期摘要 -->
        <div v-else-if="latestMenstrual" class="menstrual-card" @click="openDetailModal(latestMenstrual)">
          <div class="menstrual-info">
            <div class="menstrual-dates">
              <div class="menstrual-date">
                <span class="date-label">开始</span>
                <span class="date-value">{{ formatDate(latestMenstrual.cycleStart) }}</span>
              </div>
              <div class="menstrual-arrow">→</div>
              <div class="menstrual-date">
                <span class="date-label">结束</span>
                <span class="date-value">{{ formatDate(latestMenstrual.cycleEnd) }}</span>
              </div>
              <div class="menstrual-days">
                <span class="days-num">{{ menstrualDays }}</span>
                <span class="days-label">天</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="menstrual-empty">暂无月经记录，点击上方按钮开始记录</div>

        <!-- 历史周期 -->
        <div v-if="allMenstrualRecords.filter(r => r.cycleEnd).length > 0" class="menstrual-history">
          <div class="history-title">历史周期</div>
          <div class="menstrual-list">
            <div v-for="record in allMenstrualRecords.filter(r => r.cycleEnd)" :key="record._id" class="menstrual-item" @click="openDetailModal(record)">
              <div class="item-dates">
                <span class="item-start">{{ formatDate(record.cycleStart) }}</span>
                <span class="item-arrow">→</span>
                <span class="item-end">{{ formatDate(record.cycleEnd) }}</span>
              </div>
              <div class="item-days">{{ calculateDays(record.cycleStart, record.cycleEnd) }}天</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 2. 女性用户看伴侣时：如果伴侣是女性则显示他的月经周期（只读） -->
      <div class="menstrual-section" v-if="activeTab === 'partner' && currentUser?.gender === 'female' && partner?.gender === 'female'">
        <div class="section-header">
          <span class="section-icon blood-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
            </svg>
          </span>
          <span class="section-title">{{ partnerPronoun }}的月经周期</span>
        </div>
        <CycleForecastBoard v-if="partnerCycleBoard" :board="partnerCycleBoard" />
        <!-- 进行中：显示每日流（只读） -->
        <div v-if="partnerLatestMenstrual && !partnerLatestMenstrual.cycleEnd" class="menstrual-card ongoing">
          <div class="period-header">
            <span>开始 {{ formatDate(partnerLatestMenstrual.cycleStart) }}</span>
            <span class="ongoing-badge">进行中 · 第{{ partnerMenstrualDays }}天</span>
          </div>
          <div class="flow-days readonly">
            <div v-for="day in getPeriodFlowDays(partnerLatestMenstrual)" :key="day.date" class="flow-day" :class="{ 'recorded': day.flowLevel }">
              <div class="day-num">第{{ day.dayNum }}天</div>
              <div class="day-date">{{ formatDate(day.date) }}</div>
              <div class="day-flow" :class="day.flowLevel ? 'level-' + day.flowLevel : ''">{{ day.flowLabel }}</div>
            </div>
          </div>
        </div>
        <!-- 已结束：显示摘要 -->
        <div v-else-if="partnerLatestMenstrual" class="menstrual-card" @click="openDetailModal(partnerLatestMenstrual)">
          <div class="menstrual-info">
            <div class="menstrual-dates">
              <div class="menstrual-date">
                <span class="date-label">开始</span>
                <span class="date-value">{{ formatDate(partnerLatestMenstrual.cycleStart) }}</span>
              </div>
              <div class="menstrual-arrow">→</div>
              <div class="menstrual-date">
                <span class="date-label">结束</span>
                <span class="date-value">{{ formatDate(partnerLatestMenstrual.cycleEnd) }}</span>
              </div>
              <div class="menstrual-days">
                <span class="days-num">{{ partnerMenstrualDays }}</span>
                <span class="days-label">天</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="menstrual-empty">暂无月经记录</div>

        <!-- 历史周期 -->
        <div v-if="partnerMenstrualRecords.filter(r => r.cycleEnd).length > 0" class="menstrual-history">
          <div class="history-title">历史周期</div>
          <div class="menstrual-list">
            <div v-for="record in partnerMenstrualRecords.filter(r => r.cycleEnd)" :key="record._id" class="menstrual-item" @click="openDetailModal(record)">
              <div class="item-dates">
                <span class="item-start">{{ formatDate(record.cycleStart) }}</span>
                <span class="item-arrow">→</span>
                <span class="item-end">{{ formatDate(record.cycleEnd) }}</span>
              </div>
              <div class="item-days">{{ calculateDays(record.cycleStart, record.cycleEnd) }}天</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 3. 男性用户视角：无论哪个tab都能看到伴侣的月经周期 -->
      <div class="menstrual-section" v-if="currentUser?.gender === 'male' && partner?.gender === 'female'">
        <div class="section-header">
          <span class="section-icon blood-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" />
            </svg>
          </span>
          <span class="section-title">她的月经周期</span>
          <button v-if="partnerLatestMenstrual && !partnerLatestMenstrual.cycleEnd" class="menstrual-action-btn end" @click.stop="openEndModal">结束月经</button>
          <button v-else class="menstrual-action-btn start" @click.stop="openStartModal">记录月经</button>
        </div>
        <CycleForecastBoard v-if="partnerCycleBoard" :board="partnerCycleBoard" />
        <!-- 进行中：显示每日打卡流 -->
        <div v-if="partnerLatestMenstrual && !partnerLatestMenstrual.cycleEnd" class="menstrual-card ongoing" @click="openCheckinModal(partnerLatestMenstrual)">
          <div class="period-header">
            <span>开始 {{ formatDate(partnerLatestMenstrual.cycleStart) }}</span>
            <span class="ongoing-badge">进行中 · 第{{ partnerMenstrualDays }}天</span>
          </div>
          <div class="flow-days">
            <div v-for="day in getPeriodFlowDays(partnerLatestMenstrual)" :key="day.date" class="flow-day" :class="{ 'recorded': day.flowLevel, 'today': day.date === getLocalDateStr() }" @click.stop="day.flowLevel ? openDayDetail(partnerLatestMenstrual, day) : openCheckinModal(partnerLatestMenstrual, day.date)">
              <div class="day-num">第{{ day.dayNum }}天</div>
              <div class="day-date">{{ formatDate(day.date) }}</div>
              <div class="day-flow" :class="day.flowLevel ? 'level-' + day.flowLevel : ''">{{ day.flowLevel ? day.flowLevel + '级' : day.flowLabel }}</div>
              <div v-if="day.symptoms.length" class="day-symptoms">{{ day.symptoms.join('·') }}</div>
            </div>
          </div>
          <div class="card-hint">点击卡片记录今日情况</div>
        </div>
        <!-- 无周期或已结束 -->
        <div v-else-if="partnerLatestMenstrual" class="menstrual-card" @click="openDetailModal(partnerLatestMenstrual)">
          <div class="menstrual-info">
            <div class="menstrual-dates">
              <div class="menstrual-date">
                <span class="date-label">开始</span>
                <span class="date-value">{{ formatDate(partnerLatestMenstrual.cycleStart) }}</span>
              </div>
              <div class="menstrual-arrow">→</div>
              <div class="menstrual-date">
                <span class="date-label">结束</span>
                <span class="date-value">{{ formatDate(partnerLatestMenstrual.cycleEnd) }}</span>
              </div>
              <div class="menstrual-days">
                <span class="days-num">{{ partnerMenstrualDays }}</span>
                <span class="days-label">天</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="menstrual-empty">暂无月经记录，点击上方按钮开始记录</div>

        <!-- 历史周期 -->
        <div v-if="partnerMenstrualRecords.filter(r => r.cycleEnd).length > 0" class="menstrual-history">
          <div class="history-title">历史周期</div>
          <div class="menstrual-list">
            <div v-for="record in partnerMenstrualRecords.filter(r => r.cycleEnd)" :key="record._id" class="menstrual-item" @click="openDetailModal(record)">
              <div class="item-dates">
                <span class="item-start">{{ formatDate(record.cycleStart) }}</span>
                <span class="item-arrow">→</span>
                <span class="item-end">{{ formatDate(record.cycleEnd) }}</span>
              </div>
              <div class="item-days">{{ calculateDays(record.cycleStart, record.cycleEnd) }}天</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 身体档案归档 -->
      <div class="history-section">
        <div class="section-header">
          <span class="section-icon history-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 5h6" />
              <path d="M9 3h6v4H9z" />
              <path d="M6 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1" />
              <path d="M8 12h8" />
              <path d="M8 16h5" />
            </svg>
          </span>
          <span class="section-title">身体档案归档</span>
        </div>
        <div class="month-filter">
          <select v-model="selectedMonth" class="month-select" :disabled="monthOptions.length === 0">
            <option value="">全部月份</option>
            <option v-for="option in monthOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
          </select>
          <span class="month-count">{{ filteredHistory.length }} 条记录</span>
        </div>
        <div v-if="filteredHistory.length > 0" class="history-list">
          <div
            v-for="item in filteredHistory"
            :key="item._id || item.recordedAt"
            class="history-item"
            :class="{ editable: activeTab === 'mine' }"
            @click="activeTab === 'mine' ? openEdit(item) : null"
          >
            <div class="history-date">{{ formatFullDate(item.recordedAt) }}</div>
            <div class="history-tags">
              <span v-if="hasNumberValue(item.height)" class="history-tag">身高 {{ formatMetricValue(item.height, 'cm') }}</span>
              <span v-if="hasNumberValue(item.weight)" class="history-tag">体重 {{ formatMetricValue(item.weight, 'kg') }}</span>
              <span v-if="hasNumberValue(item.bodyFat)" class="history-tag">体脂 {{ formatMetricValue(item.bodyFat, '%') }}</span>
              <template v-for="key in measurementKeys" :key="key">
                <span v-if="hasNumberValue(item.measurements?.[key])" class="history-tag">
                  {{ currentBodyPoints[key]?.label || key }} {{ formatMetricValue(item.measurements[key], 'cm') }}
                </span>
              </template>
              <span v-if="item.note" class="history-tag note-tag">{{ item.note }}</span>
              <span v-if="!hasAnyBodyData(item) && !item.note" class="history-tag empty-tag">仅日期记录</span>
            </div>
          </div>
        </div>
        <div v-else class="history-empty">
          {{ selectedMonth ? '这个月还没有身体档案' : (activeTab === 'mine' ? '还没有身体档案，点下方按钮记第一笔' : 'TA 还没有身体档案') }}
        </div>
      </div>

      <!-- 趋势图1：基础指标 -->
      <div class="trends-section">
        <div class="section-header">
          <span class="section-icon trend-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 18h16" />
              <path d="M6 15l4-4 3 3 5-7" />
              <path d="M16 7h2v2" />
            </svg>
          </span>
          <span class="section-title">基础指标趋势</span>
        </div>
        <div class="trend-metric-tabs">
          <button
            v-for="m in basicMetrics"
            :key="m.key"
            type="button"
            class="trend-metric-tab"
            :class="{ active: currentBasicMetric === m.key }"
            @click="switchBasicMetric(m.key)"
          >{{ m.label }}</button>
        </div>
        <div class="trend-chart-card">
          <div v-if="basicTrendSummary" class="trend-summary" :class="basicTrendSummary.direction" :aria-label="basicTrendSummary.ariaLabel">
            <div>
              <span>{{ basicTrendSummary.actorLabel }} · {{ basicTrendSummary.metricLabel }}</span>
              <strong>{{ basicTrendSummary.latestText }}</strong>
            </div>
            <em class="trend-status" :class="basicTrendState.mode">{{ basicTrendState.statusLabel }}</em>
            <p>{{ basicTrendSummary.changeText }} · {{ basicTrendState.coverageLabel }}</p>
            <small>
              {{ basicTrendState.guidance }}
              <span v-if="basicTrendSummary.comparisonText">{{ basicTrendSummary.comparisonText }}</span>
            </small>
          </div>
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="(tick, i) in basicYAxisTicks" :key="'y1'+i" class="y-tick">{{ tick.formatted }}</span>
            </div>
            <div class="chart-main">
              <svg v-if="hasBasicTrendData" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line v-for="i in 5" :key="'grid1'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="rgba(126, 58, 85, 0.12)" stroke-width="0.5" stroke-dasharray="2,2"/>
                <template v-if="basicTrendState.activeKey === 'partner'">
                  <path v-if="basicMinePath && basicMineShowLine" class="trend-path mine background" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="basicMinePath"/>
                  <path v-if="basicPartnerPath && basicPartnerShowLine && showPartnerTrend" class="trend-path partner active" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="basicPartnerPath"/>
                </template>
                <template v-else>
                  <path v-if="basicPartnerPath && basicPartnerShowLine && showPartnerTrend" class="trend-path partner background" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="basicPartnerPath"/>
                  <path v-if="basicMinePath && basicMineShowLine" class="trend-path mine active" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="basicMinePath"/>
                </template>
              </svg>
              <div v-if="!hasBasicTrendData" class="chart-empty">
                <strong>还没有趋势数据</strong>
                <span>记录一次{{ currentBasicMetricLabel }}后展示最近值，满 4 次后显示趋势线。</span>
              </div>
              <div v-if="basicMinePoints.length > 0" class="chart-points" :class="{ background: basicTrendState.activeKey === 'partner' }">
                <button
                  v-for="(p, i) in basicMinePoints"
                  :key="'mp1'+i"
                  type="button"
                  class="chart-point mine"
                  :style="p.style"
                  :aria-label="getTrendPointLabel(p, '我', currentBasicMetricLabel, currentBasicMetricUnit)"
                >
                  <span class="point-tooltip" :class="p.tooltipAlign">{{ p.date }} · {{ formatTrendPointValue(p.value, currentBasicMetricUnit) }}</span>
                </button>
              </div>
              <div v-if="basicPartnerPoints.length > 0 && showPartnerTrend" class="chart-points" :class="{ background: basicTrendState.activeKey === 'mine' }">
                <button
                  v-for="(p, i) in basicPartnerPoints"
                  :key="'pp1'+i"
                  type="button"
                  class="chart-point partner"
                  :style="p.style"
                  :aria-label="getTrendPointLabel(p, partnerPronoun, currentBasicMetricLabel, currentBasicMetricUnit)"
                >
                  <span class="point-tooltip" :class="p.tooltipAlign">{{ p.date }} · {{ formatTrendPointValue(p.value, currentBasicMetricUnit) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="chart-x-axis">
            <span
              v-for="tick in basicXAxisTicks"
              :key="'x1' + tick.label"
              class="x-tick"
              :class="tick.align"
              :style="tick.style"
            >{{ tick.displayLabel }}</span>
          </div>
          <div v-if="hasBasicTrendData" class="trend-readout-list" aria-label="基础指标最近读数">
            <span v-for="row in basicTrendState.latestRows" :key="'basic-row-' + row.key">
              <b>{{ row.actorLabel }}</b>
              <em>{{ row.dateLabel }}</em>
              <strong>{{ row.valueText }}</strong>
            </span>
          </div>
          <div class="trend-legend">
            <span class="legend-item" :class="{ active: basicTrendState.activeKey === 'mine' }"><i class="legend-dot mine"></i>我</span>
            <span class="legend-item" :class="{ active: basicTrendState.activeKey === 'partner' }"><i class="legend-dot partner"></i>{{ partnerPronoun }}</span>
          </div>
        </div>
      </div>

      <!-- 趋势图2：围度指标 -->
      <div class="trends-section">
        <div class="section-header">
          <span class="section-icon trend-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 19V9" />
              <path d="M12 19V5" />
              <path d="M19 19v-7" />
            </svg>
          </span>
          <span class="section-title">围度趋势</span>
        </div>
        <div class="trend-metric-tabs">
          <button
            v-for="m in bodyMetrics"
            :key="m.key"
            type="button"
            class="trend-metric-tab"
            :class="{ active: currentBodyMetric === m.key }"
            @click="switchBodyMetric(m.key)"
          >{{ m.label }}</button>
        </div>
        <div class="trend-chart-card">
          <div v-if="bodyTrendSummary" class="trend-summary" :class="bodyTrendSummary.direction" :aria-label="bodyTrendSummary.ariaLabel">
            <div>
              <span>{{ bodyTrendSummary.actorLabel }} · {{ bodyTrendSummary.metricLabel }}</span>
              <strong>{{ bodyTrendSummary.latestText }}</strong>
            </div>
            <em class="trend-status" :class="bodyTrendState.mode">{{ bodyTrendState.statusLabel }}</em>
            <p>{{ bodyTrendSummary.changeText }} · {{ bodyTrendState.coverageLabel }}</p>
            <small>
              {{ bodyTrendState.guidance }}
              <span v-if="bodyTrendSummary.comparisonText">{{ bodyTrendSummary.comparisonText }}</span>
            </small>
          </div>
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="(tick, i) in bodyYAxisTicks" :key="'y2'+i" class="y-tick">{{ tick.formatted }}</span>
            </div>
            <div class="chart-main">
              <svg v-if="hasBodyTrendData" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line v-for="i in 5" :key="'grid2'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="rgba(126, 58, 85, 0.12)" stroke-width="0.5" stroke-dasharray="2,2"/>
                <template v-if="bodyTrendState.activeKey === 'partner'">
                  <path v-if="bodyMinePath && bodyMineShowLine" class="trend-path mine background" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="bodyMinePath"/>
                  <path v-if="bodyPartnerPath && bodyPartnerShowLine && showPartnerTrend" class="trend-path partner active" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="bodyPartnerPath"/>
                </template>
                <template v-else>
                  <path v-if="bodyPartnerPath && bodyPartnerShowLine && showPartnerTrend" class="trend-path partner background" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="bodyPartnerPath"/>
                  <path v-if="bodyMinePath && bodyMineShowLine" class="trend-path mine active" fill="none" stroke-linecap="round" stroke-linejoin="round" :d="bodyMinePath"/>
                </template>
              </svg>
              <div v-if="!hasBodyTrendData" class="chart-empty">
                <strong>还没有围度趋势</strong>
                <span>记录一次{{ currentBodyMetricLabel }}后展示最近值，满 4 次后显示趋势线。</span>
              </div>
              <div v-if="bodyMinePoints.length > 0" class="chart-points" :class="{ background: bodyTrendState.activeKey === 'partner' }">
                <button
                  v-for="(p, i) in bodyMinePoints"
                  :key="'mp2'+i"
                  type="button"
                  class="chart-point mine"
                  :style="p.style"
                  :aria-label="getTrendPointLabel(p, '我', currentBodyMetricLabel, currentBodyMetricUnit)"
                >
                  <span class="point-tooltip" :class="p.tooltipAlign">{{ p.date }} · {{ formatTrendPointValue(p.value, currentBodyMetricUnit) }}</span>
                </button>
              </div>
              <div v-if="bodyPartnerPoints.length > 0 && showPartnerTrend" class="chart-points" :class="{ background: bodyTrendState.activeKey === 'mine' }">
                <button
                  v-for="(p, i) in bodyPartnerPoints"
                  :key="'pp2'+i"
                  type="button"
                  class="chart-point partner"
                  :style="p.style"
                  :aria-label="getTrendPointLabel(p, partnerPronoun, currentBodyMetricLabel, currentBodyMetricUnit)"
                >
                  <span class="point-tooltip" :class="p.tooltipAlign">{{ p.date }} · {{ formatTrendPointValue(p.value, currentBodyMetricUnit) }}</span>
                </button>
              </div>
            </div>
          </div>
          <div class="chart-x-axis">
            <span
              v-for="tick in bodyXAxisTicks"
              :key="'x2' + tick.label"
              class="x-tick"
              :class="tick.align"
              :style="tick.style"
            >{{ tick.displayLabel }}</span>
          </div>
          <div v-if="hasBodyTrendData" class="trend-readout-list" aria-label="围度指标最近读数">
            <span v-for="row in bodyTrendState.latestRows" :key="'body-row-' + row.key">
              <b>{{ row.actorLabel }}</b>
              <em>{{ row.dateLabel }}</em>
              <strong>{{ row.valueText }}</strong>
            </span>
          </div>
          <div class="trend-legend">
            <span class="legend-item" :class="{ active: bodyTrendState.activeKey === 'mine' }"><i class="legend-dot mine"></i>我</span>
            <span class="legend-item" :class="{ active: bodyTrendState.activeKey === 'partner' }"><i class="legend-dot partner"></i>{{ partnerPronoun }}</span>
          </div>
        </div>
      </div>

      <div class="page-bottom-spacer"></div>
    </main>

    <!-- 悬浮按钮（通用健康记录只允许记录自己） -->
    <button v-if="activeTab === 'mine'" class="fab" aria-label="记录健康" @click="openFullForm">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>记一笔</span>
    </button>

    <!-- 快速编辑 / 完整记录弹窗 -->
    <teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-dialog health-modal">
          <div class="modal-header">
            <h3>{{ modalTitle }}</h3>
            <button class="close-btn" @click="closeModal">×</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">记录日期</label>
              <DatePickerField v-model="form.recordedAt" :max="getLocalDateStr()" display-class="form-input" placeholder="选择记录日期" />
            </div>

            <!-- 快速编辑单项：只显示点击的部位 -->
            <template v-if="quickField">
              <!-- 基础指标 -->
              <div v-if="quickField === 'height'" class="form-group">
                <label class="form-label">身高 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.height" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'weight'" class="form-group">
                <label class="form-label">体重 (kg)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.weight" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'bodyFat'" class="form-group">
                <label class="form-label">体脂 (%)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.bodyFat" placeholder="-" autofocus>
              </div>
              <!-- 围度 -->
              <div v-else-if="quickField === 'chest'" class="form-group">
                <label class="form-label">胸围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chest" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'chestUpper'" class="form-group">
                <label class="form-label">上胸围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestUpper" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'chestLower'" class="form-group">
                <label class="form-label">下胸围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestLower" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'waist'" class="form-group">
                <label class="form-label">腰围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.waist" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'hip'" class="form-group">
                <label class="form-label">臀围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.hip" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'arm'" class="form-group">
                <label class="form-label">臂围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.arm" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'thigh'" class="form-group">
                <label class="form-label">大腿围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.thigh" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'calf'" class="form-group">
                <label class="form-label">小腿围 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.calf" placeholder="-" autofocus>
              </div>
              <div v-else-if="quickField === 'shoulder'" class="form-group">
                <label class="form-label">肩宽 (cm)</label>
                <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.shoulder" placeholder="-" autofocus>
              </div>
            </template>

            <!-- 完整表单 -->
            <template v-else>
              <div class="form-row">
                <div class="form-group small">
                  <label class="form-label">身高 (cm)</label>
                  <input type="number" step="0.1" class="form-input" v-model.number="form.height" placeholder="-">
                </div>
                <div class="form-group small">
                  <label class="form-label">体重 (kg)</label>
                  <input type="number" step="0.1" class="form-input" v-model.number="form.weight" placeholder="-">
                </div>
                <div class="form-group small">
                  <label class="form-label">体脂 (%)</label>
                  <input type="number" step="0.1" class="form-input" v-model.number="form.bodyFat" placeholder="-">
                </div>
              </div>

              <template v-if="activeTab === 'mine'">
                <div class="form-section-title">围度 (cm)</div>
                <div class="form-row">
                  <div v-if="currentUser?.gender === 'male'" class="form-group small">
                    <label class="form-label">胸围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chest" placeholder="-">
                  </div>
                  <template v-else>
                    <div class="form-group small">
                      <label class="form-label">上胸围</label>
                      <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestUpper" placeholder="-">
                    </div>
                    <div class="form-group small">
                      <label class="form-label">下胸围</label>
                      <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.chestLower" placeholder="-">
                    </div>
                  </template>
                  <div class="form-group small">
                    <label class="form-label">腰围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.waist" placeholder="-">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group small">
                    <label class="form-label">臀围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.hip" placeholder="-">
                  </div>
                  <div class="form-group small">
                    <label class="form-label">臂围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.arm" placeholder="-">
                  </div>
                  <div class="form-group small">
                    <label class="form-label">大腿围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.thigh" placeholder="-">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group small">
                    <label class="form-label">小腿围</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.calf" placeholder="-">
                  </div>
                  <div class="form-group small">
                    <label class="form-label">肩宽</label>
                    <input type="number" step="0.1" class="form-input" v-model.number="form.measurements.shoulder" placeholder="-">
                  </div>
                  <div class="form-group small"></div>
                </div>
              </template>

              <div class="form-group">
                <label class="form-label">备注</label>
                <input type="text" class="form-input" v-model="form.note" placeholder="可选">
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <div class="footer-spacer"></div>
            <button class="btn-secondary" @click="closeModal">取消</button>
            <button class="btn-primary" @click="saveRecord" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 月经记录弹窗 -->
    <teleport to="body">
      <div v-if="showMenstrualModal" class="modal-overlay" @click.self="closeMenstrualModal">
        <div class="modal-dialog menstrual-modal">
          <div class="modal-header">
            <h3>{{ getMenstrualModalTitle }}</h3>
            <button class="close-btn" @click="closeMenstrualModal">×</button>
          </div>
          <div class="modal-body">
            <!-- 模式1：开始月经 -->
            <div v-if="menstrualMode === 'start'" class="menstrual-start-section">
              <div class="form-group">
                <label class="form-label">开始日期</label>
                <DatePickerField v-model="menstrualForm.cycleStart" display-class="form-input" placeholder="选择开始日期" />
              </div>
              <div class="form-group">
                <label class="form-label">初始流量 (1-5) <span class="optional">选填</span></label>
                <div class="flow-level-selector">
                  <button v-for="level in 5" :key="level"
                    @click="menstrualForm.flowLevel = level"
                    :class="['flow-btn', { active: menstrualForm.flowLevel === level }]"
                    :title="getFlowLabel(level)">
                    {{ level }}
                  </button>
                </div>
                <span class="flow-label" v-if="menstrualForm.flowLevel">{{ getFlowLabel(menstrualForm.flowLevel) }}</span>
              </div>
              <div class="form-group">
                <label class="form-label">症状 <span class="optional">选填</span></label>
                <div class="symptom-tags">
                  <button v-for="symptom in symptoms" :key="symptom"
                    @click="toggleSymptom(symptom)"
                    :class="['symptom-btn', { active: menstrualForm.symptoms.includes(symptom) }]">
                    {{ symptom }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">备注 <span class="optional">选填</span></label>
                <input type="text" class="form-input" v-model="menstrualForm.note" placeholder="如：痛经程度、特殊情况等">
              </div>
            </div>

            <!-- 模式2：每日打卡 -->
            <div v-else-if="menstrualMode === 'checkin'" class="menstrual-checkin-section">
              <div class="checkin-date">{{ formatFullDate(menstrualForm.checkinDate || getLocalDateStr()) }} · {{ menstrualForm.checkinDate && menstrualForm.checkinDate !== getLocalDateStr() ? '补记' : '今日打卡' }}</div>
              <div class="form-group">
                <label class="form-label">出血量 (1-5)</label>
                <div class="flow-level-selector">
                  <button v-for="level in 5" :key="level"
                    @click="menstrualForm.todayFlow = level"
                    :class="['flow-btn', { active: menstrualForm.todayFlow === level }]"
                    :title="getFlowLabel(level)">
                    {{ level }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">异常情况 <span class="optional">选填</span></label>
                <div class="symptom-tags">
                  <button v-for="symptom in symptoms" :key="symptom"
                    @click="toggleSymptom(symptom)"
                    :class="['symptom-btn', { active: menstrualForm.symptoms.includes(symptom) }]">
                    {{ symptom }}
                  </button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">备注 <span class="optional">选填</span></label>
                <input type="text" class="form-input" v-model="menstrualForm.note" placeholder="如：痛经程度、特殊情况等">
              </div>
            </div>

            <!-- 模式3：结束月经 -->
            <div v-else-if="menstrualMode === 'end'" class="menstrual-end-section">
              <div class="end-hint">确认结束当前月经周期？</div>
              <div class="form-group">
                <label class="form-label">结束日期</label>
                <DatePickerField v-model="menstrualForm.tempCycleEnd" :min="menstrualForm.cycleStart" display-class="form-input" placeholder="选择结束日期" />
              </div>
            </div>

            <!-- 模式4：周期详情（只读） -->
            <div v-else-if="menstrualMode === 'detail'" class="menstrual-detail-section">
              <div class="detail-header">
                <span>{{ formatDate(selectedPeriod?.cycleStart) }} → {{ formatDate(selectedPeriod?.cycleEnd) }}</span>
                <span class="detail-days">共 {{ calculateDays(selectedPeriod?.cycleStart, selectedPeriod?.cycleEnd) }} 天</span>
              </div>
              <div class="detail-flow-list">
                <div v-for="day in getPeriodFlowDays(selectedPeriod)" :key="day.date" class="detail-day" :class="{ 'recorded': day.flowLevel }">
                  <div class="detail-day-info">
                    <span class="detail-day-label">第{{ day.dayNum }}天 · {{ formatDate(day.date) }}</span>
                    <span class="detail-day-flow" :class="day.flowLevel ? 'level-' + day.flowLevel : ''">{{ day.flowLevel ? day.flowLevel + '级 · ' + day.flowLabel : day.flowLabel }}</span>
                  </div>
                  <div v-if="day.symptoms.length" class="detail-day-symptoms">
                    <span class="detail-day-tag" v-for="s in day.symptoms" :key="s">{{ s }}</span>
                  </div>
                  <div v-if="day.note" class="detail-day-note">{{ day.note }}</div>
                </div>
              </div>
            </div>

            <!-- 模式5：单日详情（只读） -->
            <div v-else-if="menstrualMode === 'dayDetail'" class="menstrual-daydetail-section">
              <div class="daydetail-date">第{{ selectedDay?.dayNum }}天 · {{ formatDate(selectedDay?.date) }}</div>
              <div class="daydetail-flow">
                <div class="daydetail-flow-label">出血量</div>
                <div class="daydetail-flow-value" :class="selectedDay?.flowLevel ? 'level-' + selectedDay.flowLevel : ''">
                  {{ selectedDay?.flowLevel ? selectedDay.flowLevel + '级 · ' + selectedDay.flowLabel : '未记录' }}
                </div>
              </div>
              <div v-if="selectedDay?.symptoms?.length" class="daydetail-symptoms">
                <div class="daydetail-label">症状</div>
                <div class="daydetail-tags">
                  <span class="daydetail-tag" v-for="s in selectedDay.symptoms" :key="s">{{ s }}</span>
                </div>
              </div>
              <div v-if="selectedDay?.note" class="daydetail-note">
                <div class="daydetail-label">备注</div>
                <div class="daydetail-note-text">{{ selectedDay.note }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <div class="footer-spacer"></div>
            <button class="btn-secondary" @click="closeMenstrualModal">{{ ['detail', 'dayDetail'].includes(menstrualMode) ? '关闭' : '取消' }}</button>
            <button v-if="menstrualMode === 'dayDetail'" class="btn-primary" @click="editDayRecord">编辑</button>
            <button v-else-if="!['detail', 'dayDetail'].includes(menstrualMode)" class="btn-primary" @click="saveMenstrualRecord" :disabled="menstrualSaving">
              {{ menstrualSaving ? '保存中...' : (menstrualMode === 'start' ? '开始月经' : (menstrualMode === 'end' ? '确认结束' : (menstrualForm.todayFlow ? '保存修改' : '保存打卡'))) }}
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Toast -->
    <div
      class="toast"
      :class="{ show: toast.show, [toast.type]: true }"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { CONFIG } from '../utils/config.js'
import { useWebSocket } from '../composables/useWebSocket.js'
import { createClientLogger } from '../utils/client-logger.js'
import { buildCycleForecastBoard } from '../utils/menstrual-prediction.js'
import {
  buildTrendChartState,
  buildTrendSummary,
  buildTrendPath,
  buildTrendPoints,
  formatTrendValue,
  getTrendChartRange,
  getTrendDateDomain,
  getTrendXAxisTickItems,
  getTrendYAxisTicks,
  hasTrendData,
  normalizeTrendData,
  shouldRenderTrendLine
} from '../utils/health-trends.js'
import {
  HEALTH_MEASUREMENT_KEYS,
  buildHealthProfileBoard,
  buildHealthMonthOptions,
  buildLatestHealthSnapshot,
  calculateHealthBmi,
  filterHealthRecordsByMonth,
  formatHealthDate,
  formatHealthMetricValue,
  getHealthBmiStatus,
  hasAnyHealthMetric,
  hasHealthMetricValue,
  normalizeHealthRecords,
  sanitizeHealthPayload,
  todayHealthDate
} from '../utils/health-profile.js'
import CycleForecastBoard from '../components/CycleForecastBoard.vue'
import DatePickerField from '../components/DatePickerField.vue'

export default {
  name: 'Health',
  components: { CycleForecastBoard, DatePickerField },
  setup() {
    const logger = createClientLogger('Health')
    const activeTab = ref('mine')
    const mineRecords = ref([])
    const partnerRecords = ref([])
    const currentUser = ref(null)
    const partner = ref(null)
    const loading = ref(false)
    const recordsError = ref('')
    const saving = ref(false)

    const showModal = ref(false)
    const editingId = ref(null)
    const quickField = ref(null)

    // 月经记录弹窗
    const showMenstrualModal = ref(false)
    const menstrualSaving = ref(false)
    const menstrualMine = ref({ current: null, history: [] })
    const menstrualPartner = ref({ current: null, history: [] })
    const menstrualMode = ref('start')  // 'start' | 'checkin' | 'end' | 'detail' | 'dayDetail'
    const selectedPeriod = ref(null)  // 当前选中的周期记录
    const selectedDay = ref(null)  // 当前选中的单日记录
    const menstrualForm = ref({
      cycleStart: '',
      cycleEnd: '',
      tempCycleEnd: '',  // 临时结束日期，用于月经进行中时避免界面跳转
      flowLevel: null,
      todayFlow: null,
      symptoms: [],
      note: '',
      isEditing: false,
      recordId: null
    })
    
    // 症状选项
    const symptoms = ['痛经', '腰酸', '乏力', '情绪波动', '头痛', '腹胀', '量大', '血块']
    
    // 流量描述
    const getFlowLabel = (level) => {
      const labels = ['', '很少', '较少', '正常', '较多', '很多']
      return labels[level] || ''
    }

    // 趋势图1：基础指标（体重、体脂）
    const currentBasicMetric = ref('weight')
    const basicTrendData = ref({ mine: [], partner: [] })

    // 趋势图2：围度指标
    const currentBodyMetric = ref('waist')
    const bodyTrendData = ref({ mine: [], partner: [] })

    const toast = ref({ show: false, message: '', type: 'info' })
    const selectedMonth = ref('')

    const basicMetrics = [
      { key: 'weight', label: '体重' },
      { key: 'bodyFat', label: '体脂' }
    ]

    const measurementKeys = HEALTH_MEASUREMENT_KEYS

    const bodyMetrics = computed(() => {
      if (currentGender.value === 'male') {
        return [
          { key: 'chest', label: '胸围' },
          { key: 'waist', label: '腰围' },
          { key: 'hip', label: '臀围' },
          { key: 'arm', label: '臂围' },
          { key: 'thigh', label: '大腿围' },
          { key: 'calf', label: '小腿围' },
          { key: 'shoulder', label: '肩宽' }
        ]
      }
      return [
        { key: 'chestUpper', label: '上胸围' },
        { key: 'chestLower', label: '下胸围' },
        { key: 'waist', label: '腰围' },
        { key: 'hip', label: '臀围' },
        { key: 'arm', label: '臂围' },
        { key: 'thigh', label: '大腿围' },
        { key: 'calf', label: '小腿围' },
        { key: 'shoulder', label: '肩宽' }
      ]
    })

    const getMetricLabel = (metrics, key) => metrics.find(metric => metric.key === key)?.label || '指标'
    const getMetricUnit = (key) => {
      if (key === 'weight') return 'kg'
      if (key === 'bodyFat') return '%'
      return 'cm'
    }
    const currentBasicMetricLabel = computed(() => getMetricLabel(basicMetrics, currentBasicMetric.value))
    const currentBodyMetricLabel = computed(() => getMetricLabel(bodyMetrics.value, currentBodyMetric.value))
    const currentBasicMetricUnit = computed(() => getMetricUnit(currentBasicMetric.value))
    const currentBodyMetricUnit = computed(() => getMetricUnit(currentBodyMetric.value))
    const formatTrendPointValue = (value, unit) => formatTrendValue(value, unit)
    const getTrendPointLabel = (point, actorLabel, metricLabel, unit) => (
      `${actorLabel}${metricLabel} ${point.date || '未记录日期'} ${formatTrendValue(point.value, unit)}`
    )

    const getToken = () => localStorage.getItem('token')

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      setTimeout(() => { toast.value.show = false }, 2500)
    }

    const hasNumberValue = hasHealthMetricValue

    const formatMetricValue = formatHealthMetricValue

    const fetchUser = async () => {
      try {
        const res = await fetch(CONFIG.API_URL + '/me', {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          currentUser.value = data.data
          partner.value = data.data.partner
        }
      } catch (e) {
        console.error('获取用户信息失败:', e)
      }
    }

    const fetchRecords = async () => {
      loading.value = true
      recordsError.value = ''
      try {
        const res = await fetch(CONFIG.API_URL + '/health', {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          mineRecords.value = normalizeHealthRecords(data.data.mine || [])
          partnerRecords.value = normalizeHealthRecords(data.data.partner || [])
        } else {
          recordsError.value = data.message || '健康档案加载失败'
          showToast(recordsError.value, 'error')
        }
      } catch (e) {
        console.error('获取健康档案失败:', e)
        recordsError.value = '健康档案加载失败，请稍后重试'
        showToast(recordsError.value, 'error')
      } finally {
        loading.value = false
      }
    }

    const fetchBasicTrends = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/health/trends?metric=${currentBasicMetric.value}&days=30`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          basicTrendData.value = normalizeTrendData(data.data)
        }
      } catch (e) {
        console.error('获取基础趋势失败:', e)
      }
    }

    const fetchBodyTrends = async () => {
      try {
        const res = await fetch(`${CONFIG.API_URL}/health/trends?metric=${currentBodyMetric.value}&days=30`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          bodyTrendData.value = normalizeTrendData(data.data)
        }
      } catch (e) {
        console.error('获取围度趋势失败:', e)
      }
    }

    const fetchTrends = async () => {
      await Promise.all([fetchBasicTrends(), fetchBodyTrends()])
    }

    const fetchMenstrualData = async () => {
      if (!currentUser.value) return
      try {
        const mineId = currentUser.value.id
        const partnerId = partner.value ? partner.value.id : null

        // 获取自己的月经数据
        const mineRes = await fetch(`${CONFIG.API_URL}/health/menstrual?targetUserId=${mineId}`, {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const mineData = await mineRes.json()
        if (mineData.success) {
          menstrualMine.value = mineData.data || { current: null, history: [], prediction: null }
        }

        // 获取伴侣的月经数据
        if (partnerId) {
          const partnerRes = await fetch(`${CONFIG.API_URL}/health/menstrual?targetUserId=${partnerId}`, {
            headers: { Authorization: 'Bearer ' + getToken() }
          })
          const partnerData = await partnerRes.json()
          if (partnerData.success) {
            menstrualPartner.value = partnerData.data || { current: null, history: [], prediction: null }
          }
        }
      } catch (e) {
        console.error('获取月经记录失败:', e)
      }
    }
    
    // 计算月经已持续天数
    const ongoingDays = computed(() => {
      if (!menstrualForm.value.cycleStart) return 0
      const days = periodSpanDays(menstrualForm.value.cycleStart, getLocalDateStr(), true)
      return days === '-' ? 0 : days
    })
    
    // 月经弹窗标题
    const getMenstrualModalTitle = computed(() => {
      if (menstrualMode.value === 'checkin') {
        const today = getLocalDateStr()
        const target = menstrualForm.value.checkinDate
        if (target && target !== today) {
          return '补记 ' + formatFullDate(target)
        }
        return '今日打卡'
      }
      if (menstrualMode.value === 'dayDetail') {
        return selectedDay.value ? formatFullDate(selectedDay.value.date) + ' 记录' : '打卡详情'
      }
      const map = { start: '开始月经', end: '结束月经', detail: '周期详情' }
      return map[menstrualMode.value] || '月经记录'
    })

    // 获取进行中周期的每日打卡列表
    const getPeriodFlowDays = (period) => {
      if (!period || !period.cycleStart) return []
      const start = parseLocalDate(period.cycleStart)
      const end = period.cycleEnd ? parseLocalDate(period.cycleEnd) : parseLocalDate(getLocalDateStr())
      if (!start || !end) return []
      const days = []
      const flowMap = new Map((period.flowRecords || []).map(f => [f.date, f]))
      let current = new Date(start)
      let dayNum = 1
      while (current <= end) {
        const dateStr = toLocalDateStr(current)
        const flow = flowMap.get(dateStr)
        const note = flow ? (flow.note || '') : ''
        // 从备注中解析症状（格式：症状：xxx、xxx）
        const symptomMatch = note.match(/症状[：:](.+)/)
        const symptoms = symptomMatch ? symptomMatch[1].split(/[、,，]\s*/).filter(Boolean) : []
        const pureNote = note.replace(/症状[：:].+/, '').trim()
        days.push({
          date: dateStr,
          dayNum,
          flowLevel: flow ? flow.flowLevel : null,
          flowLabel: flow ? getFlowLabel(flow.flowLevel) : '未记录',
          note: pureNote,
          symptoms
        })
        current.setDate(current.getDate() + 1)
        dayNum++
      }
      return days
    }
    
    // 判断记录是否有身体数据
    const hasAnyBodyData = (item) => {
      return hasAnyHealthMetric(item)
    }

    // 计算两个日期之间的天数（开始日和结束日都计入）
    const calculateDays = (start, end) => {
      return periodSpanDays(start, end, true)
    }
    
    // 打开"开始月经"弹窗
    const openStartModal = () => {
      menstrualMode.value = 'start'
      selectedPeriod.value = null
      menstrualForm.value = {
        cycleStart: getLocalDateStr(),
        cycleEnd: '',
        tempCycleEnd: '',
        flowLevel: null,
        todayFlow: null,
        symptoms: [],
        note: '',
        isEditing: false,
        recordId: null
      }
      showMenstrualModal.value = true
    }

    // 打开"每日打卡"弹窗
    const openCheckinModal = (period, checkinDate = null) => {
      if (!period) return
      menstrualMode.value = 'checkin'
      selectedPeriod.value = period
      const targetDate = checkinDate || getLocalDateStr()
      // 查找该日期是否已有记录，预填充
      const existing = (period.flowRecords || []).find(f => f.date === targetDate)
      menstrualForm.value = {
        cycleStart: period.cycleStart ? toLocalDateStr(period.cycleStart) : '',
        cycleEnd: '',
        tempCycleEnd: '',
        flowLevel: null,
        todayFlow: existing ? existing.flowLevel : null,
        symptoms: [],
        note: existing ? existing.note : '',
        checkinDate: targetDate,
        isEditing: false,
        recordId: period._id || null
      }
      showMenstrualModal.value = true
    }

    // 打开"结束月经"弹窗
    const openEndModal = () => {
      const isMaleUser = currentUser.value?.gender === 'male'
      const latest = isMaleUser ? partnerLatestMenstrual.value : latestMenstrual.value
      if (!latest) return
      menstrualMode.value = 'end'
      selectedPeriod.value = latest
      menstrualForm.value = {
        cycleStart: latest.cycleStart ? toLocalDateStr(latest.cycleStart) : '',
        cycleEnd: '',
        tempCycleEnd: getLocalDateStr(),
        flowLevel: null,
        todayFlow: null,
        symptoms: [],
        note: '',
        isEditing: false,
        recordId: latest._id || null
      }
      showMenstrualModal.value = true
    }

    // 打开"周期详情"弹窗（只读）
    const openDetailModal = (period) => {
      if (!period) return
      menstrualMode.value = 'detail'
      selectedPeriod.value = period
      showMenstrualModal.value = true
    }

    // 打开"单日详情"弹窗（只读）
    const openDayDetail = (period, day) => {
      if (!day) return
      menstrualMode.value = 'dayDetail'
      selectedPeriod.value = period
      selectedDay.value = day
      showMenstrualModal.value = true
    }

    // 从单日详情进入编辑
    const editDayRecord = () => {
      if (!selectedDay.value || !selectedPeriod.value) return
      menstrualMode.value = 'checkin'
      menstrualForm.value = {
        cycleStart: selectedPeriod.value.cycleStart ? toLocalDateStr(selectedPeriod.value.cycleStart) : '',
        cycleEnd: '',
        tempCycleEnd: '',
        flowLevel: null,
        todayFlow: selectedDay.value.flowLevel || null,
        symptoms: [...selectedDay.value.symptoms],
        note: selectedDay.value.note || '',
        checkinDate: selectedDay.value.date,
        isEditing: false,
        recordId: selectedPeriod.value._id || null
      }
    }

    // 关闭月经弹窗
    const closeMenstrualModal = () => {
      showMenstrualModal.value = false
      menstrualMode.value = 'start'
      selectedPeriod.value = null
      selectedDay.value = null
      menstrualForm.value = {
        cycleStart: '',
        cycleEnd: '',
        tempCycleEnd: '',
        flowLevel: null,
        todayFlow: null,
        symptoms: [],
        note: '',
        checkinDate: null,
        isEditing: false,
        recordId: null
      }
    }
    
    // 切换症状选择
    const toggleSymptom = (symptom) => {
      const idx = menstrualForm.value.symptoms.indexOf(symptom)
      if (idx > -1) {
        menstrualForm.value.symptoms.splice(idx, 1)
      } else {
        menstrualForm.value.symptoms.push(symptom)
      }
    }
    
    // 保存月经记录
    const saveMenstrualRecord = async () => {
      menstrualSaving.value = true
      try {
        const isMaleUser = currentUser.value?.gender === 'male'
        const targetUserId = isMaleUser && partner.value ? partner.value.id : currentUser.value.id
        const today = getLocalDateStr()

        if (menstrualMode.value === 'start') {
          // 开始新周期
          const startRes = await fetch(`${CONFIG.API_URL}/health/menstrual/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + getToken()
            },
            body: JSON.stringify({
              cycleStart: menstrualForm.value.cycleStart,
              targetUserId: isMaleUser ? targetUserId : undefined
            })
          })
          const startData = await startRes.json()
          if (!startData.success) throw new Error(startData.message || '开始月经失败')

          // 如果有初始流量，再记录流量
          if (menstrualForm.value.flowLevel) {
            const noteParts = []
            if (menstrualForm.value.symptoms.length > 0) {
              noteParts.push(`症状：${menstrualForm.value.symptoms.join('、')}`)
            }
            if (menstrualForm.value.note) {
              noteParts.push(menstrualForm.value.note)
            }
            await fetch(`${CONFIG.API_URL}/health/menstrual/flow`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + getToken()
              },
              body: JSON.stringify({
                date: menstrualForm.value.cycleStart || today,
                flowLevel: menstrualForm.value.flowLevel,
                note: noteParts.join('；') || '',
                targetUserId: isMaleUser ? targetUserId : undefined
              })
            })
          }
          showToast('月经开始已记录', 'success')
        } else if (menstrualMode.value === 'checkin') {
          // 每日打卡 - 只记录流量
          if (!menstrualForm.value.todayFlow) {
            throw new Error('请选择流量等级')
          }
          const recordDate = menstrualForm.value.checkinDate || today
          const noteParts = []
          if (menstrualForm.value.symptoms.length > 0) {
            noteParts.push(`症状：${menstrualForm.value.symptoms.join('、')}`)
          }
          if (menstrualForm.value.note) {
            noteParts.push(menstrualForm.value.note)
          }
          const flowRes = await fetch(`${CONFIG.API_URL}/health/menstrual/flow`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + getToken()
            },
            body: JSON.stringify({
              date: recordDate,
              flowLevel: menstrualForm.value.todayFlow,
              note: noteParts.join('；') || '',
              targetUserId: isMaleUser ? targetUserId : undefined
            })
          })
          const flowData = await flowRes.json()
          if (!flowData.success) throw new Error(flowData.message || '打卡失败')
          showToast('今日打卡成功', 'success')
        } else if (menstrualMode.value === 'end') {
          // 结束月经
          if (!menstrualForm.value.tempCycleEnd) {
            throw new Error('请选择结束日期')
          }
          const endRes = await fetch(`${CONFIG.API_URL}/health/menstrual/end`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + getToken()
            },
            body: JSON.stringify({
              cycleEnd: menstrualForm.value.tempCycleEnd,
              targetUserId: isMaleUser ? targetUserId : undefined
            })
          })
          const endData = await endRes.json()
          if (!endData.success) throw new Error(endData.message || '结束月经失败')
          showToast('月经已结束', 'success')
        }

        closeMenstrualModal()
        await fetchMenstrualData()
      } catch (e) {
        showToast(e.message || '保存失败', 'error')
      } finally {
        menstrualSaving.value = false
      }
    }

    const switchBasicMetric = (key) => {
      currentBasicMetric.value = key
      fetchBasicTrends()
    }

    const switchBodyMetric = (key) => {
      currentBodyMetric.value = key
      fetchBodyTrends()
    }

    const ensureCurrentBodyMetric = () => {
      const metrics = bodyMetrics.value
      if (!metrics.some(metric => metric.key === currentBodyMetric.value)) {
        currentBodyMetric.value = metrics[0]?.key || 'waist'
      }
    }

    // WebSocket 消息处理
    const { onMessage } = useWebSocket()
    const handleWSMessage = (data) => {
      if (data.type?.startsWith('health')) {
        logger.debug('收到 WebSocket 消息', { type: data.type })
        fetchRecords()
        fetchTrends()
      }
      if (data.type?.startsWith('menstrual')) {
        logger.debug('收到月经同步消息', { type: data.type })
        fetchMenstrualData()
      }
    }
    let unsubscribeWS = null
    
    onMounted(async () => {
      await fetchUser()
      await fetchRecords()
      await fetchTrends()
      await fetchMenstrualData()
      
      unsubscribeWS = onMessage(handleWSMessage)
    })

    onUnmounted(() => {
      if (unsubscribeWS) {
        unsubscribeWS()
        unsubscribeWS = null
      }
    })

    watch(activeTab, () => {
      selectedMonth.value = ''
      ensureCurrentBodyMetric()
      // 切换 tab 时刷新数据，确保实时更新
      fetchRecords()
      fetchTrends()
      fetchMenstrualData()
    })

    const mineAvatar = computed(() => currentUser.value?.nickname?.[0] || '我')
    const partnerAvatar = computed(() => partner.value?.nickname?.[0] || 'TA')
    
    // 根据伴侣性别返回称呼
    const partnerPronoun = computed(() => {
      if (partner.value?.gender === 'male') return '他'
      if (partner.value?.gender === 'female') return '她'
      return 'TA'
    })

    const currentGender = computed(() => {
      if (activeTab.value === 'mine') return currentUser.value?.gender || 'male'
      return partner.value?.gender || 'female'
    })

    const displayRecords = computed(() => activeTab.value === 'mine' ? mineRecords.value : partnerRecords.value)
    const displayLatest = computed(() => buildLatestHealthSnapshot(displayRecords.value))
    const displayActorLabel = computed(() => activeTab.value === 'mine' ? '我' : partnerPronoun.value)
    const healthProfileBoard = computed(() => buildHealthProfileBoard(displayRecords.value, {
      actorLabel: displayActorLabel.value,
      gender: currentGender.value,
      today: getLocalDateStr()
    }))
    const healthMissingPreview = computed(() => (
      healthProfileBoard.value.missingFields.slice(0, 4).map(field => field.label).join('、')
    ))
    
    // 计算 BMI
    const displayBMI = computed(() => calculateHealthBmi(displayLatest.value))
    
    // 获取 BMI 状态描述
    const getBMIStatus = (bmi) => {
      const status = getHealthBmiStatus(bmi)
      const colors = {
        low: '#4F6F8F',
        steady: '#486856',
        attention: '#8A5B14',
        alert: '#9A332A'
      }
      return {
        label: status?.label || '参考',
        color: colors[status?.tone] || '#5F535B'
      }
    }

    const normalizeMenstrualRecords = (data = {}) => {
      const records = []
      if (data.current) records.push(data.current)
      if (data.history) records.push(...data.history)
      return records.map(r => {
        const latestFlow = r.flowRecords && r.flowRecords.length > 0
          ? r.flowRecords[r.flowRecords.length - 1]
          : null
        return {
          ...r,
          cycleStart: toLocalDateStr(r.cycleStart),
          cycleEnd: r.cycleEnd ? toLocalDateStr(r.cycleEnd) : null,
          flowLevel: latestFlow ? latestFlow.flowLevel : null,
          note: latestFlow ? latestFlow.note : '',
          _id: r._id
        }
      }).sort((a, b) => new Date(b.cycleStart) - new Date(a.cycleStart))
    }

    const mineMenstrualRecords = computed(() => normalizeMenstrualRecords(menstrualMine.value))

    // 当前选中 tab 的月经周期记录
    const allMenstrualRecords = computed(() => (
      activeTab.value === 'mine' ? mineMenstrualRecords.value : partnerMenstrualRecords.value
    ))

    // 伴侣的月经周期记录（用于男性看自己时显示）
    const partnerMenstrualRecords = computed(() => normalizeMenstrualRecords(menstrualPartner.value))

    const latestMenstrual = computed(() => allMenstrualRecords.value[0] || null)
    
    // 伴侣的最新月经周期
    const partnerLatestMenstrual = computed(() => partnerMenstrualRecords.value[0] || null)

    const menstrualDays = computed(() => {
      if (!latestMenstrual.value || !latestMenstrual.value.cycleStart) return '-'
      return periodSpanDays(
        latestMenstrual.value.cycleStart,
        latestMenstrual.value.cycleEnd || getLocalDateStr(),
        true
      )
    })
    
    // 伴侣的月经周期天数
    const partnerMenstrualDays = computed(() => {
      if (!partnerLatestMenstrual.value || !partnerLatestMenstrual.value.cycleStart) return '-'
      return periodSpanDays(
        partnerLatestMenstrual.value.cycleStart,
        partnerLatestMenstrual.value.cycleEnd || getLocalDateStr(),
        true
      )
    })

    // 我的完整预测数据
    const myPrediction = computed(() => menstrualMine.value?.prediction || null)

    // 伴侣的完整预测数据
    const partnerPrediction = computed(() => menstrualPartner.value?.prediction || null)

    const myCycleBoard = computed(() => buildCycleForecastBoard({
      prediction: myPrediction.value,
      records: mineMenstrualRecords.value,
      latestPeriod: mineMenstrualRecords.value[0] || null,
      today: getLocalDateStr(),
      formatDate,
      canEdit: true
    }))

    const partnerCycleBoard = computed(() => buildCycleForecastBoard({
      prediction: partnerPrediction.value,
      records: partnerMenstrualRecords.value,
      latestPeriod: partnerLatestMenstrual.value,
      today: getLocalDateStr(),
      formatDate,
      canEdit: currentUser.value?.gender === 'male'
    }))

    // 月份筛选
    const monthOptions = computed(() => buildHealthMonthOptions(displayRecords.value))

    const filteredHistory = computed(() => {
      return filterHealthRecordsByMonth(displayRecords.value, selectedMonth.value).slice(0, 50)
    })

    // 格式化日期显示
    const formatDate = (d) => {
      if (!d) return '-'
      const value = getDateOnlyString(d)
      if (value) {
        const [year, month, day] = value.split('-')
        return `${parseInt(month)}/${parseInt(day)}`
      }
      return '-'
    }

    const formatFullDate = (d) => {
      if (!d) return '-'
      return getDateOnlyString(d) || '-'
    }

    const maleBodyPoints = {
      shoulder: { x: 460, y: 160, lx: 420, ly: 160, tx: 370, ty: 160, label: '肩宽' },
      chest: { x: 550, y: 220, lx: 590, ly: 220, tx: 595, ty: 220, label: '胸围' },
      waist: { x: 575, y: 320, lx: 615, ly: 320, tx: 620, ty: 320, label: '腰围' },
      hip: { x: 580, y: 370, lx: 620, ly: 370, tx: 625, ty: 370, label: '臀围' },
      arm: { x: 440, y: 240, lx: 400, ly: 240, tx: 350, ty: 240, label: '臂围' },
      thigh: { x: 480, y: 430, lx: 440, ly: 430, tx: 390, ty: 430, label: '大腿围' },
      calf: { x: 480, y: 570, lx: 440, ly: 570, tx: 390, ty: 570, label: '小腿围' }
    }

    const femaleBodyPoints = {
      shoulder: { x: 460, y: 160, lx: 420, ly: 160, tx: 370, ty: 160, label: '肩宽' },
      chestUpper: { x: 550, y: 190, lx: 590, ly: 190, tx: 595, ty: 190, label: '上胸围' },
      chestLower: { x: 550, y: 250, lx: 590, ly: 250, tx: 595, ty: 250, label: '下胸围' },
      waist: { x: 575, y: 320, lx: 615, ly: 320, tx: 620, ty: 320, label: '腰围' },
      hip: { x: 580, y: 370, lx: 620, ly: 370, tx: 625, ty: 370, label: '臀围' },
      arm: { x: 440, y: 240, lx: 400, ly: 240, tx: 350, ty: 240, label: '臂围' },
      thigh: { x: 480, y: 430, lx: 440, ly: 430, tx: 390, ty: 430, label: '大腿围' },
      calf: { x: 480, y: 570, lx: 440, ly: 570, tx: 390, ty: 570, label: '小腿围' }
    }

    const currentBodyPoints = computed(() => {
      return currentGender.value === 'male' ? maleBodyPoints : femaleBodyPoints
    })

    const formatBodyValue = (key) => {
      const val = displayLatest.value.measurements?.[key]
      return formatMetricValue(val, 'cm')
    }

    const showPartnerTrend = computed(() => (
      partnerRecords.value.length > 0 ||
      (basicTrendData.value.partner || []).length > 0 ||
      (bodyTrendData.value.partner || []).length > 0
    ))

    // 趋势图计算
    const hasBasicTrendData = computed(() => hasTrendData(basicTrendData.value))
    const hasBodyTrendData = computed(() => hasTrendData(bodyTrendData.value))
    const basicChartRange = computed(() => getTrendChartRange(basicTrendData.value))
    const bodyChartRange = computed(() => getTrendChartRange(bodyTrendData.value))
    const basicDateDomain = computed(() => getTrendDateDomain(basicTrendData.value))
    const bodyDateDomain = computed(() => getTrendDateDomain(bodyTrendData.value))
    const basicYAxisTicks = computed(() => getTrendYAxisTicks(basicTrendData.value))
    const bodyYAxisTicks = computed(() => getTrendYAxisTicks(bodyTrendData.value))
    
    const getDateOnlyString = formatHealthDate

    const parseLocalDate = (d) => {
      const value = getDateOnlyString(d)
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!match) return null
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    }

    const diffCalendarDays = (later, earlier) => {
      const laterDate = parseLocalDate(later)
      const earlierDate = parseLocalDate(earlier)
      if (!laterDate || !earlierDate) return null
      const laterDay = Date.UTC(laterDate.getFullYear(), laterDate.getMonth(), laterDate.getDate())
      const earlierDay = Date.UTC(earlierDate.getFullYear(), earlierDate.getMonth(), earlierDate.getDate())
      return Math.round((laterDay - earlierDay) / 86400000)
    }

    const periodSpanDays = (start, end, includeEndDay = true) => {
      if (!start || !end) return '-'
      const diff = diffCalendarDays(end, start)
      if (diff === null) return '-'
      return Math.max(1, diff + (includeEndDay ? 1 : 0))
    }

    // 获取本地日期字符串 (YYYY-MM-DD)，避免 UTC 时区问题
    const getLocalDateStr = todayHealthDate

    // 将日期转换为本地日期字符串
    const toLocalDateStr = (d) => getDateOnlyString(d)

    // 基础指标图表
    const basicMinePath = computed(() => buildTrendPath(basicTrendData.value.mine, basicChartRange.value, basicDateDomain.value))
    const basicPartnerPath = computed(() => buildTrendPath(basicTrendData.value.partner, basicChartRange.value, basicDateDomain.value))
    const basicMinePoints = computed(() => buildTrendPoints(basicTrendData.value.mine, basicChartRange.value, basicDateDomain.value))
    const basicPartnerPoints = computed(() => buildTrendPoints(basicTrendData.value.partner, basicChartRange.value, basicDateDomain.value))
    const basicXAxisTicks = computed(() => getTrendXAxisTickItems(basicTrendData.value, activeTab.value))
    const basicTrendSummary = computed(() => buildTrendSummary(basicTrendData.value, activeTab.value, {
      metricLabel: currentBasicMetricLabel.value,
      unit: currentBasicMetricUnit.value,
      partnerLabel: partnerPronoun.value
    }))
    const basicTrendState = computed(() => buildTrendChartState(basicTrendData.value, activeTab.value, {
      metricLabel: currentBasicMetricLabel.value,
      unit: currentBasicMetricUnit.value,
      partnerLabel: partnerPronoun.value
    }))
    const basicMineShowLine = computed(() => shouldRenderTrendLine(basicTrendData.value.mine))
    const basicPartnerShowLine = computed(() => shouldRenderTrendLine(basicTrendData.value.partner))

    // 围度图表
    const bodyMinePath = computed(() => buildTrendPath(bodyTrendData.value.mine, bodyChartRange.value, bodyDateDomain.value))
    const bodyPartnerPath = computed(() => buildTrendPath(bodyTrendData.value.partner, bodyChartRange.value, bodyDateDomain.value))
    const bodyMinePoints = computed(() => buildTrendPoints(bodyTrendData.value.mine, bodyChartRange.value, bodyDateDomain.value))
    const bodyPartnerPoints = computed(() => buildTrendPoints(bodyTrendData.value.partner, bodyChartRange.value, bodyDateDomain.value))
    const bodyXAxisTicks = computed(() => getTrendXAxisTickItems(bodyTrendData.value, activeTab.value))
    const bodyTrendSummary = computed(() => buildTrendSummary(bodyTrendData.value, activeTab.value, {
      metricLabel: currentBodyMetricLabel.value,
      unit: currentBodyMetricUnit.value,
      partnerLabel: partnerPronoun.value
    }))
    const bodyTrendState = computed(() => buildTrendChartState(bodyTrendData.value, activeTab.value, {
      metricLabel: currentBodyMetricLabel.value,
      unit: currentBodyMetricUnit.value,
      partnerLabel: partnerPronoun.value
    }))
    const bodyMineShowLine = computed(() => shouldRenderTrendLine(bodyTrendData.value.mine))
    const bodyPartnerShowLine = computed(() => shouldRenderTrendLine(bodyTrendData.value.partner))

    const emptyForm = () => ({
      recordedAt: getLocalDateStr(),
      height: null,
      weight: null,
      bodyFat: null,
      measurements: {
        chest: null,
        chestUpper: null,
        chestLower: null,
        waist: null,
        hip: null,
        arm: null,
        thigh: null,
        calf: null,
        shoulder: null
      },
      note: ''
    })
    
    // 用最新数据填充表单（用于记一笔时自动填充）
    const fillFormWithLatest = () => {
      const latest = displayLatest.value
      if (!displayRecords.value.length) return emptyForm()
      return {
        recordedAt: getLocalDateStr(),
        height: latest.height ?? null,
        weight: latest.weight ?? null,
        bodyFat: latest.bodyFat ?? null,
        measurements: {
          chest: latest.measurements?.chest ?? null,
          chestUpper: latest.measurements?.chestUpper ?? null,
          chestLower: latest.measurements?.chestLower ?? null,
          waist: latest.measurements?.waist ?? null,
          hip: latest.measurements?.hip ?? null,
          arm: latest.measurements?.arm ?? null,
          thigh: latest.measurements?.thigh ?? null,
          calf: latest.measurements?.calf ?? null,
          shoulder: latest.measurements?.shoulder ?? null
        },
        note: ''
      }
    }

    const form = ref(emptyForm())

    const modalTitle = computed(() => {
      if (editingId.value) return '编辑记录'
      if (quickField.value) {
        const map = {
          height: '更新身高',
          weight: '更新体重',
          bodyFat: '更新体脂率',
          chest: '更新胸围',
          chestUpper: '更新上胸围',
          chestLower: '更新下胸围',
          waist: '更新腰围',
          hip: '更新臀围',
          arm: '更新臂围',
          thigh: '更新大腿围',
          calf: '更新小腿围',
          shoulder: '更新肩宽'
        }
        return map[quickField.value] || '快速记录'
      }
      return '记一笔'
    })

    const canEditMenstrual = computed(() => {
      if (!currentUser.value) return false
      // 女生给自己记，男生给伴侣记
      return (activeTab.value === 'mine' && currentUser.value.gender === 'female') ||
             (activeTab.value === 'partner' && currentUser.value.gender === 'male')
    })

    const openFullForm = () => {
      // 通用健康记录只允许记录自己的身体数据；伴侣月经使用独立入口。
      if (activeTab.value === 'mine') {
        editingId.value = null
        quickField.value = null
        form.value = fillFormWithLatest()  // 自动填充最新数据
        showModal.value = true
        return
      }
      showToast('只能查看伴侣的数据哦', 'info')
    }

    const openQuickEdit = (field) => {
      // 快速编辑身体部位：只能编辑自己的
      if (activeTab.value !== 'mine') {
        showToast('只能编辑自己的数据哦', 'info')
        return
      }
      editingId.value = null
      quickField.value = field
      form.value = fillFormWithLatest()  // 自动填充最新数据
      showModal.value = true
    }

    const openEdit = (item) => {
      // 编辑权限：自己tab可以编辑；伴侣tab只有男生可以编辑（月经）
      if (activeTab.value !== 'mine' && !(activeTab.value === 'partner' && currentUser.value?.gender === 'male')) {
        showToast('只能编辑自己的数据哦', 'info')
        return
      }
      editingId.value = item._id
      quickField.value = null
      form.value = {
        recordedAt: item.recordedAt ? toLocalDateStr(item.recordedAt) : getLocalDateStr(),
        height: item.height ?? null,
        weight: item.weight ?? null,
        bodyFat: item.bodyFat ?? null,
        measurements: {
          chest: item.measurements?.chest ?? null,
          chestUpper: item.measurements?.chestUpper ?? null,
          chestLower: item.measurements?.chestLower ?? null,
          waist: item.measurements?.waist ?? null,
          hip: item.measurements?.hip ?? null,
          arm: item.measurements?.arm ?? null,
          thigh: item.measurements?.thigh ?? null,
          calf: item.measurements?.calf ?? null,
          shoulder: item.measurements?.shoulder ?? null
        },
        note: item.note || ''
      }
      showModal.value = true
    }

    const closeModal = () => {
      showModal.value = false
      editingId.value = null
      quickField.value = null
    }

    const saveRecord = async () => {
      const sanitized = sanitizeHealthPayload(form.value)
      if (sanitized.error) {
        showToast(sanitized.error, 'error')
        return
      }

      saving.value = true
      try {
        const payload = sanitized.payload
        const url = editingId.value ? `${CONFIG.API_URL}/health/${editingId.value}` : `${CONFIG.API_URL}/health`
        const method = editingId.value ? 'PUT' : 'POST'
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + getToken()
          },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
          showToast(editingId.value ? '修改成功' : '记录成功', 'success')
          closeModal()
          await fetchRecords()
          await fetchTrends()
        } else {
          showToast(data.message || '保存失败', 'error')
        }
      } catch (e) {
        showToast('保存失败', 'error')
      } finally {
        saving.value = false
      }
    }

    return {
      activeTab,
      currentUser,
      partner,
      loading,
      recordsError,
      currentGender,
      mineAvatar,
      partnerAvatar,
      partnerPronoun,
      displayActorLabel,
      healthProfileBoard,
      healthMissingPreview,
      displayLatest,
      displayBMI,
      getBMIStatus,
      filteredHistory,
      latestMenstrual,
      partnerLatestMenstrual,
      menstrualDays,
      partnerMenstrualDays,
      myPrediction,
      partnerPrediction,
      myCycleBoard,
      partnerCycleBoard,
      formatDate,
      formatFullDate,
      formatMetricValue,
      hasNumberValue,
      getLocalDateStr,
      currentBodyPoints,
      measurementKeys,
      formatBodyValue,
      hasAnyBodyData,
      openQuickEdit,
      openFullForm,
      openEdit,
      fetchRecords,
      showModal,
      modalTitle,
      form,
      saveRecord,
      closeModal,
      editingId,
      quickField,
      saving,
      toast,
      canEditMenstrual,
      // 月经相关
      showMenstrualModal,
      menstrualSaving,
      menstrualMode,
      selectedPeriod,
      selectedDay,
      menstrualForm,
      symptoms,
      getFlowLabel,
      getPeriodFlowDays,
      ongoingDays,
      getMenstrualModalTitle,
      allMenstrualRecords,
      partnerMenstrualRecords,
      latestMenstrual,
      partnerLatestMenstrual,
      openStartModal,
      openCheckinModal,
      openEndModal,
      openDetailModal,
      openDayDetail,
      editDayRecord,
      calculateDays,
      closeMenstrualModal,
      toggleSymptom,
      saveMenstrualRecord,
      basicMetrics,
      bodyMetrics,
      currentBasicMetric,
      currentBodyMetric,
      currentBasicMetricLabel,
      currentBodyMetricLabel,
      currentBasicMetricUnit,
      currentBodyMetricUnit,
      switchBasicMetric,
      switchBodyMetric,
      formatTrendPointValue,
      getTrendPointLabel,
      basicTrendData,
      bodyTrendData,
      hasBasicTrendData,
      hasBodyTrendData,
      basicTrendSummary,
      bodyTrendSummary,
      basicTrendState,
      bodyTrendState,
      basicMinePath,
      basicPartnerPath,
      basicMineShowLine,
      basicPartnerShowLine,
      basicMinePoints,
      basicPartnerPoints,
      basicYAxisTicks,
      basicXAxisTicks,
      bodyMinePath,
      bodyPartnerPath,
      bodyMineShowLine,
      bodyPartnerShowLine,
      bodyMinePoints,
      bodyPartnerPoints,
      bodyYAxisTicks,
      bodyXAxisTicks,
      showPartnerTrend,
      selectedMonth,
      monthOptions
    }
  }
}
</script>

<style scoped>
.health-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFFCFA 0%, #F8F4F6 54%, #F1F6F2 100%);
  color: var(--text-primary, #261F24);
  font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif);
  padding-bottom: 100px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 12px;
  padding-top: max(16px, env(safe-area-inset-top, 0px));
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(126, 58, 85, 0.1);
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4B2432;
  box-shadow: 0 8px 20px rgba(75, 36, 50, 0.07);
}
.page-title {
  font-size: 20px;
  font-weight: 900;
  color: #2B2430;
}
.header-spacer {
  width: 36px;
}

/* Tab */
.tab-bar {
  display: flex;
  gap: 12px;
  padding: 0 16px 12px;
}
.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 54px;
  padding: 10px 0;
  border-radius: 12px;
  background: #fff;
  border: 1px solid rgba(126, 58, 85, 0.12);
  color: #725E69;
  font-weight: 800;
  box-shadow: 0 8px 24px rgba(75, 36, 50, 0.04);
}
.tab-item.active {
  background: #F4DCE5;
  border-color: rgba(126, 58, 85, 0.22);
  color: #4B2432;
  box-shadow: none;
}
.tab-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #F5DCE7;
  color: #7E3A55;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 人体图 */
.page-body {
  padding: 0 16px;
}

.health-sync-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0 -16px 12px;
  padding: 10px 16px;
  border-top: 1px solid rgba(38, 31, 36, 0.06);
  border-bottom: 1px solid rgba(38, 31, 36, 0.06);
  background: rgba(255, 252, 250, 0.78);
  color: #5F535B;
  font-size: 12px;
  font-weight: 750;
}

.health-sync-banner.error {
  background: rgba(255, 244, 241, 0.9);
  color: #9A332A;
}

.health-sync-banner button {
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid rgba(154, 51, 42, 0.18);
  border-radius: 8px;
  background: #FFFFFF;
  color: #9A332A;
  font: inherit;
}

.health-cover {
  margin: 2px -16px 16px;
  padding: 18px 16px 16px;
  background: #FFFCFA;
  border-top: 1px solid rgba(38, 31, 36, 0.08);
  border-bottom: 1px solid rgba(38, 31, 36, 0.08);
}

.health-cover.mode-empty,
.health-cover.mode-note-only {
  background: #FFF8F5;
}

.health-cover.mode-stale {
  background: #FFF9EF;
}

.health-cover.mode-ready {
  background: #FBFCF8;
}

.health-cover-top {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: start;
}

.health-cover-copy {
  min-width: 0;
}

.health-kicker {
  display: block;
  margin-bottom: 8px;
  color: #8F3D5A;
  font-size: 12px;
  line-height: 1.2;
  font-weight: 850;
}

.health-cover h2 {
  margin: 0;
  color: #261F24;
  font-family: var(--font-display, var(--font-ui, sans-serif));
  font-size: 27px;
  line-height: 1.12;
  font-weight: 800;
  letter-spacing: 0;
}

.health-cover p {
  margin: 10px 0 0;
  max-width: 28em;
  color: #5F535B;
  font-size: 13px;
  line-height: 1.55;
  font-weight: 650;
}

.health-cover-action,
.health-cover-readonly {
  min-height: 38px;
  white-space: nowrap;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 850;
}

.health-cover-action {
  padding: 8px 13px;
  border: 0;
  background: #261F24;
  color: #FFFFFF;
  box-shadow: 0 8px 18px rgba(38, 31, 36, 0.14);
}

.health-cover-readonly {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid rgba(38, 31, 36, 0.1);
  background: rgba(255, 255, 255, 0.62);
  color: #756872;
}

.health-cover-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 18px;
  border-top: 1px solid rgba(38, 31, 36, 0.08);
  border-bottom: 1px solid rgba(38, 31, 36, 0.08);
}

.health-cover-metric {
  min-width: 0;
  padding: 12px 10px;
}

.health-cover-metric + .health-cover-metric {
  border-left: 1px solid rgba(38, 31, 36, 0.08);
}

.health-cover-metric span,
.health-cover-metric strong,
.health-cover-metric em {
  display: block;
  min-width: 0;
}

.health-cover-metric span {
  color: #756872;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 750;
}

.health-cover-metric strong {
  margin-top: 5px;
  color: #261F24;
  font-family: var(--font-number, var(--font-ui, sans-serif));
  font-size: 20px;
  line-height: 1.1;
  font-weight: 850;
}

.health-cover-metric em {
  margin-top: 4px;
  color: #486856;
  font-size: 10px;
  line-height: 1.3;
  font-style: normal;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.health-cover-missing {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(242, 234, 228, 0.64);
}

.health-cover-missing span {
  flex: 0 0 auto;
  color: #8F3D5A;
  font-size: 11px;
  line-height: 1.4;
  font-weight: 850;
}

.health-cover-missing b {
  min-width: 0;
  color: #5F535B;
  font-size: 12px;
  line-height: 1.45;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.body-map-section {
  margin-bottom: 16px;
}
.body-map-card {
  background: rgba(255, 252, 250, 0.92);
  border: 1px solid rgba(38, 31, 36, 0.08);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 8px 18px rgba(50, 27, 38, 0.06);
}
.body-map-title {
  font-size: 14px;
  color: #5F535B;
  font-weight: 800;
  text-align: center;
  margin-bottom: 6px;
}
.body-map-wrapper {
  display: flex;
  justify-content: center;
}
.body-svg {
  width: 235px;
  height: 330px;
}
.body-silhouette {
  fill: #D7D7D0;
  opacity: 0.98;
}
.body-point-group {
  cursor: pointer;
}
.body-point-group:hover .point-circle {
  r: 7;
}
.body-point-group:hover text {
  fill: #7E3A55;
}

.base-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin-top: 10px;
  padding: 8px 0;
  border-radius: 12px;
  background: rgba(246, 241, 244, 0.84);
}
.base-stat {
  min-width: 0;
  background: transparent;
  border-radius: 0;
  padding: 8px 4px;
  text-align: center;
  cursor: pointer;
}
.base-stat + .base-stat {
  border-left: 1px solid rgba(126, 58, 85, 0.1);
}
.base-label {
  display: block;
  font-size: 12px;
  color: #725E69;
  font-weight: 750;
  margin-bottom: 2px;
}
.base-value {
  display: block;
  font-size: 16px;
  font-weight: 850;
  color: #2B2430;
}

.bmi-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
  margin-left: 4px;
}

/* Section */
.section-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0 10px;
  font-size: 17px;
  font-weight: 850;
  color: #2B2430;
}

.section-title {
  min-width: 0;
  flex: 1;
}

.section-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.section-icon svg {
  width: 16px;
  height: 16px;
}

.trend-icon,
.blood-icon {
  background: rgba(248, 221, 232, 0.72);
  color: #7E3A55;
}

.history-icon {
  background: rgba(234, 242, 255, 0.82);
  color: #415F79;
}

/* 月经 */
.menstrual-card {
  background: #fff;
  border: 1px solid rgba(126, 58, 85, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
  box-shadow: 0 12px 26px rgba(75, 36, 50, 0.05);
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}
.menstrual-card:hover {
  background: #fff;
}
.menstrual-card.ongoing {
  background: #fff1f4;
  border: 0;
}
.menstrual-edit-btn {
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 12px;
  border: none;
  background: #7E3A55;
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.days-num.ongoing {
  color: #7E3A55;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.menstrual-ongoing-hint {
  font-size: 12px;
  color: #7E3A55;
  background: rgba(126, 58, 85, 0.08);
  padding: 8px 12px;
  border-radius: 10px;
  text-align: center;
}
.menstrual-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.menstrual-dates {
  display: flex;
  align-items: center;
  gap: 12px;
}
.menstrual-date {
  text-align: center;
}
.date-label {
  display: block;
  font-size: 12px;
  color: #725E69;
  font-weight: 700;
}
.date-value {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: #2B2430;
}
.menstrual-arrow {
  color: rgba(75, 36, 50, 0.32);
  font-size: 14px;
}
.menstrual-days {
  margin-left: auto;
  text-align: center;
}
.days-num {
  font-size: 18px;
  font-weight: 700;
  color: #7E3A55;
}
.days-label {
  font-size: 12px;
  color: #725E69;
}
.menstrual-note {
  font-size: 13px;
  color: #4B3A44;
  background: #fef2f4;
  padding: 8px 10px;
  border-radius: 10px;
}
.menstrual-empty {
  font-size: 13px;
  color: #725E69;
  text-align: center;
  padding: 10px 0;
}
/* 月经弹窗 */
.menstrual-modal .modal-body {
  max-height: 60vh;
}
.menstrual-current-status {
  display: flex;
  gap: 16px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 12px;
  margin-bottom: 16px;
}
.status-item {
  flex: 1;
  text-align: center;
}
.status-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.status-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}
.section-title-small {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 10px;
}
.daily-checkin-section,
.end-period-section {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}
.flow-level-selector {
  display: flex;
  gap: 8px;
}
.flow-btn {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.flow-btn:hover {
  border-color: #7E3A55;
  color: #7E3A55;
}
.flow-btn.active {
  background: linear-gradient(135deg, #7E3A55, #A45670);
  border-color: #7E3A55;
  color: #fff;
}
.flow-label {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}
.symptom-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.symptom-btn {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid #e2e8f0;
  background: #fff;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}
.symptom-btn:hover {
  border-color: #7E3A55;
  color: #7E3A55;
}
.symptom-btn.active {
  background: rgba(126, 58, 85, 0.1);
  border-color: #7E3A55;
  color: #7E3A55;
}

/* 趋势图 */
.trends-section {
  margin-bottom: 16px;
}
.time-range-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.time-range-tab {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
}
.time-range-tab.active {
  background: #334155;
  color: #fff;
  border-color: #334155;
}
.trend-metric-tabs {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  margin-bottom: 10px;
  scrollbar-width: none;
}
.trend-metric-tabs::-webkit-scrollbar {
  display: none;
}
.trend-metric-tab {
  flex-shrink: 0;
  min-height: 44px;
  padding: 8px 13px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(126, 58, 85, 0.16);
  font-size: 13px;
  color: #5E4C56;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
}
.trend-metric-tab.active {
  background: #7E3A55;
  color: #fff;
  border-color: #7E3A55;
}
.trend-metric-tab:focus-visible {
  outline: 2px solid rgba(126, 58, 85, 0.38);
  outline-offset: 2px;
}
.trend-chart-card {
  background: #fff;
  border: 1px solid rgba(126, 58, 85, 0.08);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 8px rgba(75, 36, 50, 0.05);
  --trend-mine: #7E3A55;
  --trend-partner: #5E725F;
}
.trend-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 12px;
  background: #FAEEF3;
  border: 0;
}
.trend-summary div {
  min-width: 0;
}
.trend-summary span,
.trend-summary p,
.trend-summary small {
  display: block;
}
.trend-summary span {
  color: #7E3A55;
  font-size: 11px;
  line-height: 1.2;
  font-weight: 850;
}
.trend-summary strong {
  display: block;
  margin-top: 3px;
  color: #2B2430;
  font-size: 22px;
  line-height: 1.1;
  font-weight: 950;
}
.trend-summary p {
  min-width: 0;
  grid-column: 1 / -1;
  margin: 0;
  color: #5E4C56;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}
.trend-summary small {
  grid-column: 1 / -1;
  min-width: 0;
  color: #5E725F;
  font-size: 11px;
  line-height: 1.3;
  font-weight: 750;
}
.trend-summary small span {
  display: block;
  margin-top: 3px;
  color: #5E4C56;
  font-weight: 650;
}
.trend-status {
  justify-self: end;
  align-self: start;
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  padding: 5px 9px;
  border-radius: 999px;
  background: #FFFFFF;
  color: #7E3A55;
  border: 1px solid rgba(126, 58, 85, 0.14);
  font-style: normal;
  font-size: 11px;
  line-height: 1;
  font-weight: 850;
}
.trend-status.trend {
  color: #3F5F45;
  border-color: rgba(94, 114, 95, 0.22);
  background: rgba(94, 114, 95, 0.10);
}
.trend-status.single,
.trend-status.sparse {
  color: #8A5B14;
  border-color: rgba(216, 169, 78, 0.22);
  background: rgba(216, 169, 78, 0.14);
}
.chart-container {
  display: flex;
  height: 160px;
  gap: 8px;
}
.chart-y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-size: 10px;
  color: #7D8794;
  text-align: right;
  width: 28px;
}
.chart-main {
  flex: 1;
  min-width: 0;
  position: relative;
}
.chart-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 18px;
  text-align: center;
  font-size: 13px;
  color: #7D8794;
}
.chart-empty strong {
  color: #2B2430;
  font-size: 14px;
  line-height: 1.25;
}
.chart-empty span {
  max-width: 220px;
  color: #5E4C56;
  font-size: 12px;
  line-height: 1.45;
}
.chart-points {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.chart-points.background {
  z-index: 1;
}
.chart-points:not(.background) {
  z-index: 2;
}
.chart-points.background .chart-point {
  pointer-events: none;
}
.trend-path.mine {
  stroke: var(--trend-mine);
}
.trend-path.partner {
  stroke: var(--trend-partner);
  stroke-dasharray: 4 3;
}
.trend-path.active {
  stroke-width: 3;
  opacity: 1;
}
.trend-path.background {
  stroke-width: 1.5;
  opacity: 0.46;
}
.chart-point {
  position: absolute;
  width: 44px;
  height: 44px;
  border: none;
  padding: 0;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
}
.chart-point::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: var(--trend-point-color);
  box-shadow: 0 6px 14px rgba(43, 36, 48, 0.16);
}
.chart-point.mine {
  --trend-point-color: var(--trend-mine);
}
.chart-point.partner {
  --trend-point-color: var(--trend-partner);
}
.chart-point.partner::after {
  border-radius: 3px;
  transform: translate(-50%, -50%) rotate(45deg);
}
.chart-point:focus-visible {
  outline: 2px solid rgba(126, 58, 85, 0.4);
  outline-offset: -8px;
}
.point-tooltip {
  position: absolute;
  bottom: 34px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  background: rgba(43, 36, 48, 0.92);
  color: #fff;
  font-size: 10px;
  padding: 4px 7px;
  border-radius: 8px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.point-tooltip.right {
  left: 0;
  transform: none;
}
.point-tooltip.left {
  left: auto;
  right: 0;
  transform: none;
}
.chart-point:hover .point-tooltip,
.chart-point:focus-visible .point-tooltip,
.chart-point:active .point-tooltip {
  opacity: 1;
}
.chart-x-axis {
  position: relative;
  height: 18px;
  margin-top: 8px;
  margin-left: 36px;
  font-size: 10px;
  color: #7D8794;
}
.x-tick {
  position: absolute;
  top: 0;
  max-width: 44px;
  line-height: 1.2;
  white-space: nowrap;
}
.x-tick.center {
  transform: translateX(-50%);
  text-align: center;
}
.x-tick.right {
  transform: none;
  text-align: left;
}
.x-tick.left {
  transform: translateX(-100%);
  text-align: right;
}
.trend-readout-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.trend-readout-list span {
  min-width: 0;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 2px 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(250, 238, 243, 0.72);
  border: 1px solid rgba(126, 58, 85, 0.08);
}
.trend-readout-list b,
.trend-readout-list em,
.trend-readout-list strong {
  min-width: 0;
}
.trend-readout-list b {
  color: #7E3A55;
  font-size: 11px;
  line-height: 1.2;
}
.trend-readout-list em {
  color: #7D8794;
  font-size: 11px;
  line-height: 1.2;
  font-style: normal;
  text-align: right;
}
.trend-readout-list strong {
  grid-column: 1 / -1;
  color: #2B2430;
  font-size: 15px;
  line-height: 1.2;
  font-weight: 850;
}
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #6B7280;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.legend-dot.mine {
  background: var(--trend-mine);
}
.legend-dot.partner {
  background: var(--trend-partner);
}
.legend-item.active {
  font-weight: 600;
  color: #2B2430;
}

/* 背景趋势点变小 */
.chart-points.background .chart-point::after {
  width: 6px;
  height: 6px;
  opacity: 0.7;
}

/* 历史记录 */
.history-section {
  margin-bottom: 16px;
}
.month-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.month-select {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #334155;
  background: #ffffff;
  min-width: 120px;
}
.month-count {
  font-size: 12px;
  color: #94a3b8;
}
.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.history-item {
  background: #ffffff;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(126, 58, 85, 0.08);
  box-shadow: 0 10px 24px rgba(75, 36, 50, 0.04);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
}
.history-item.editable {
  cursor: pointer;
}
.history-item.editable:active {
  transform: scale(0.99);
  border-color: rgba(126, 58, 85, 0.28);
  box-shadow: 0 8px 24px rgba(126, 58, 85, 0.12);
}
.history-date {
  font-size: 13px;
  font-weight: 800;
  color: #2B2430;
  margin-bottom: 6px;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.history-tag {
  font-size: 11px;
  color: #5E4C56;
  background: #F6F1F4;
  padding: 4px 8px;
  border-radius: 8px;
}
.history-tag.menstrual-tag {
  background: #fef2f4;
  color: #7E3A55;
}
.history-tag.note-tag {
  background: #f0f9ff;
  color: #0ea5e9;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.history-tag.empty-tag {
  background: #f1f5f9;
  color: #94a3b8;
}
.history-empty {
  text-align: center;
  font-size: 13px;
  color: #725E69;
  padding: 20px 0;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #7E3A55, #A45670);
  color: #fff;
  box-shadow: 0 14px 34px rgba(126, 58, 85, 0.34);
  z-index: 50;
}
.fab span {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.page-bottom-spacer {
  height: 88px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}
.modal-dialog {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px 24px 0 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}
.modal-header h3 {
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #f1f5f9;
  font-size: 20px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-body {
  padding: 16px 20px;
  overflow-y: auto;
}
.form-group {
  margin-bottom: 14px;
}
.form-label {
  display: block;
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  font-size: 14px;
  color: #334155;
  background: #ffffff;
  box-sizing: border-box;
}
.form-input:focus {
  outline: none;
  border-color: #7E3A55;
}
.form-row {
  display: flex;
  gap: 10px;
}
.form-row .form-group.small {
  flex: 1;
  margin-bottom: 12px;
}
.form-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
  margin: 6px 0 8px;
}
.modal-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 20px 20px;
  border-top: 1px solid #f1f5f9;
}
.footer-spacer {
  flex: 1;
}
.btn-secondary {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
}
.btn-primary {
  padding: 10px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7E3A55, #A45670);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.btn-danger {
  padding: 10px 16px;
  border-radius: 12px;
  border: none;
  background: #fef2f2;
  color: #ef4444;
  font-size: 14px;
  font-weight: 500;
}

/* Toast */
.toast {
  position: fixed;
  top: max(20px, env(safe-area-inset-top, 0px));
  left: 50%;
  transform: translateX(-50%) translateY(-20px);
  background: rgba(30, 41, 59, 0.95);
  color: #fff;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.3s;
  z-index: 300;
}
.toast.show {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.toast.success {
  background: rgba(34, 197, 94, 0.95);
}
.toast.error {
  background: rgba(239, 68, 68, 0.95);
}

/* 月经历史记录 */
.menstrual-history {
  margin-top: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid rgba(126, 58, 85, 0.08);
  border-radius: 12px;
  box-shadow: 0 12px 26px rgba(75, 36, 50, 0.05);
}
.history-title {
  font-size: 14px;
  font-weight: 850;
  color: #4B2432;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(126, 58, 85, 0.1);
}
.menstrual-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.menstrual-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: #FBF4F7;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.menstrual-item:hover {
  background: #F7E9EF;
}
.menstrual-item:active {
  transform: scale(0.98);
}
.item-dates {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #2B2430;
}
.item-arrow {
  color: #9A7B89;
  font-size: 12px;
}
.item-start, .item-end {
  font-weight: 500;
}
.item-end {
  color: #5E4C56;
}
.item-days {
  font-size: 13px;
  font-weight: 600;
  color: #7E3A55;
  background: rgba(126, 58, 85, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
}
.btn-start-period {
  width: 100%;
  padding: 14px;
  margin-top: 8px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #7E3A55, #A45670);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-start-period:disabled {
  background: #e2e8f0;
  color: #94a3b8;
  cursor: not-allowed;
}
.btn-start-period:active:not(:disabled) {
  transform: scale(0.98);
}

/* 月经操作按钮 */
.menstrual-action-btn {
  margin-left: auto;
  min-height: 44px;
  font-size: 12px;
  padding: 9px 14px;
  border-radius: 16px;
  border: none;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  touch-action: manipulation;
}

@media (max-width: 380px) {
  .health-cover-top {
    grid-template-columns: minmax(0, 1fr);
  }

  .health-cover-action,
  .health-cover-readonly {
    justify-self: start;
  }

  .health-cover-metrics {
    grid-template-columns: minmax(0, 1fr);
  }

  .health-cover-metric + .health-cover-metric {
    border-left: 0;
    border-top: 1px solid rgba(38, 31, 36, 0.08);
  }

  .trend-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .trend-status {
    justify-self: start;
  }

  .trend-readout-list {
    grid-template-columns: 1fr;
  }
}
.menstrual-action-btn.start {
  background: linear-gradient(135deg, #7E3A55, #A45670);
  color: white;
}
.menstrual-action-btn.end {
  background: #FBF4F7;
  color: #7E3A55;
  border: 1px solid rgba(126, 58, 85, 0.16);
}
.menstrual-action-btn:active {
  transform: scale(0.95);
}

/* 进行中周期卡片 */
.menstrual-card.ongoing {
  cursor: pointer;
  border: 1px solid rgba(126, 58, 85, 0.2);
}
.menstrual-card.ongoing:active {
  transform: scale(0.98);
}
.period-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  color: #5E4C56;
  font-weight: 700;
}
.ongoing-badge {
  background: linear-gradient(135deg, #7E3A55, #A45670);
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
}

/* 每日打卡流 */
.flow-days {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.flow-days::-webkit-scrollbar {
  height: 4px;
}
.flow-days::-webkit-scrollbar-thumb {
  background: rgba(126, 58, 85, 0.3);
  border-radius: 2px;
}
.flow-day {
  flex-shrink: 0;
  width: 64px;
  padding: 10px 6px;
  border-radius: 12px;
  background: #f8fafc;
  text-align: center;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.flow-day.recorded {
  background: rgba(126, 58, 85, 0.08);
  border-color: rgba(126, 58, 85, 0.2);
}
.flow-day.today {
  background: linear-gradient(135deg, rgba(126, 58, 85, 0.12), rgba(123, 104, 238, 0.08));
  border-color: #7E3A55;
  box-shadow: 0 2px 8px rgba(126, 58, 85, 0.1);
}
.day-num {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 4px;
}
.day-date {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6px;
}
.day-flow {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 8px;
  background: #e2e8f0;
  color: #64748b;
  display: inline-block;
}
.day-flow.level-1 { background: #dbeafe; color: #3b82f6; }
.day-flow.level-2 { background: #bfdbfe; color: #2563eb; }
.day-flow.level-3 { background: #fde2e8; color: #ec4899; }
.day-flow.level-4 { background: #fecdd3; color: #e11d48; }
.day-flow.level-5 { background: #fecaca; color: #dc2626; }

.card-hint {
  text-align: center;
  font-size: 12px;
  color: #7E3A55;
  margin-top: 8px;
}
.day-symptoms {
  font-size: 10px;
  color: #d97706;
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* 打卡弹窗 */
.checkin-date {
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}

/* 结束弹窗 */
.end-hint {
  text-align: center;
  font-size: 14px;
  color: #64748b;
  margin-bottom: 16px;
}

/* 周期详情 */
.menstrual-detail-section {
  max-height: 60vh;
  overflow-y: auto;
}
.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}
.detail-days {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}
.detail-flow-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.detail-day {
  padding: 10px 12px;
  border-radius: 12px;
  background: #f8fafc;
}
.detail-day.recorded {
  background: rgba(126, 58, 85, 0.06);
}
.detail-day-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.detail-day-label {
  font-size: 13px;
  color: #334155;
}
.detail-day-flow {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  background: #e2e8f0;
  color: #64748b;
}
.detail-day-flow.level-1 { background: #dbeafe; color: #3b82f6; }
.detail-day-flow.level-2 { background: #bfdbfe; color: #2563eb; }
.detail-day-flow.level-3 { background: #fde2e8; color: #ec4899; }
.detail-day-flow.level-4 { background: #fecdd3; color: #e11d48; }
.detail-day-flow.level-5 { background: #fecaca; color: #dc2626; }
.detail-day-note {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
.detail-day-symptoms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.detail-day-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #fef3c7;
  color: #d97706;
}

/* 单日详情 */
.menstrual-daydetail-section {
  text-align: center;
  padding: 8px 0;
}
.daydetail-date {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f5f9;
}
.daydetail-flow {
  margin-bottom: 20px;
}
.daydetail-flow-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}
.daydetail-flow-value {
  display: inline-block;
  font-size: 28px;
  font-weight: 700;
  padding: 8px 24px;
  border-radius: 16px;
  background: #f1f5f9;
  color: #64748b;
}
.daydetail-flow-value.level-1 { background: #dbeafe; color: #3b82f6; }
.daydetail-flow-value.level-2 { background: #bfdbfe; color: #2563eb; }
.daydetail-flow-value.level-3 { background: #fde2e8; color: #ec4899; }
.daydetail-flow-value.level-4 { background: #fecdd3; color: #e11d48; }
.daydetail-flow-value.level-5 { background: #fecaca; color: #dc2626; }
.daydetail-label {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}
.daydetail-symptoms {
  margin-bottom: 16px;
}
.daydetail-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.daydetail-tag {
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 12px;
  background: #fef3c7;
  color: #d97706;
}
.daydetail-note {
  margin-top: 8px;
}
.daydetail-note-text {
  font-size: 14px;
  color: #64748b;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 12px;
}
</style>
