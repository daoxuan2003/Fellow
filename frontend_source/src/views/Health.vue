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
        <span class="tab-name">TA</span>
      </div>
    </div>

    <main class="page-body" v-if="currentUser">
      <!-- 人体图 -->
      <div class="body-map-section">
        <div class="body-map-card">
          <div class="body-map-title">点击部位快速记录</div>
          <div class="body-map-wrapper">
            <svg class="body-svg" viewBox="320 0 400 720" preserveAspectRatio="xMidYMid meet">
              <g transform="matrix(3.13 0 0 3.13 520.81 368.64)" id="Capa_1">
                <path style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: round; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: #cbd5e1; fill-rule: nonzero; opacity: 1;" transform=" translate(-103.16, -103.16)" d="M 104.265 117.959 C 103.961 121.539 106.391 140.488 107.645 147.918 C 108.24199999999999 151.43800000000002 109.87899999999999 157.173 109.28999999999999 160.21800000000002 C 108.449 164.46200000000002 108.20599999999999 169.954 108.669 173.15200000000002 C 108.961 175.09400000000002 109.88 184.05100000000002 108.565 187.32700000000003 C 107.877 189.04500000000002 106.616 197.84900000000002 106.616 197.84900000000002 C 103.331 206.14300000000003 105.185 205.735 105.185 205.735 C 106.202 206.983 107.944 205.83300000000003 107.944 205.83300000000003 C 109.271 206.67900000000003 110.19 205.63200000000003 110.19 205.63200000000003 C 111.329 206.57500000000005 112.657 205.51600000000002 112.657 205.51600000000002 C 114.088 206.25900000000001 115.41499999999999 204.889 115.41499999999999 204.889 C 116.237 205.303 116.43799999999999 204.78 116.43799999999999 204.78 C 118.90399999999998 204.622 115.06199999999998 196.73 115.06199999999998 196.73 C 114.14199999999998 189.642 115.97499999999998 185.697 115.97499999999998 185.697 C 121.97899999999998 167.892 122.28399999999998 163.167 119.88399999999999 156.457 C 119.20799999999998 154.51999999999998 119.03699999999999 153.753 119.34799999999998 152.912 C 120.06699999999998 150.971 119.54299999999998 143.16400000000002 120.41999999999999 140.064 C 122.11199999999998 134.08499999999998 123.78099999999999 118.922 124.65099999999998 111.847 C 125.81999999999998 102.317 120.50999999999998 89.53899999999999 120.50999999999998 89.53899999999999 C 119.34699999999998 84.33899999999998 121.05199999999998 65.81199999999998 121.05199999999998 65.81199999999998 C 123.43299999999998 69.51699999999998 123.34199999999998 76.05699999999999 123.34199999999998 76.05699999999999 C 122.96399999999998 82.91599999999998 128.88299999999998 93.39899999999999 128.88299999999998 93.39899999999999 C 131.72699999999998 97.73099999999998 132.80399999999997 101.84099999999998 132.80399999999997 102.14599999999999 C 132.80399999999997 103.39399999999999 132.53099999999998 106.41499999999999 132.53099999999998 106.41499999999999 L 132.64 109.04599999999999 C 132.689 109.716 133.06599999999997 112.023 133.005 113.13799999999999 C 132.561 119.99999999999999 133.65099999999998 118.70899999999999 133.65099999999998 118.70899999999999 C 134.57099999999997 118.70899999999999 135.582 113.18699999999998 135.582 113.18699999999998 C 135.582 114.61099999999999 135.23399999999998 118.87399999999998 136.00199999999998 120.48199999999999 C 136.921 122.39999999999999 137.59699999999998 120.15299999999999 137.60899999999998 119.70199999999998 C 137.85199999999998 110.96499999999999 138.37699999999998 113.25399999999999 138.37699999999998 113.25399999999999 C 138.88799999999998 120.34199999999998 139.516 121.94299999999998 140.64199999999997 121.389 C 141.49499999999998 120.982 140.71499999999997 112.883 140.71499999999997 112.883 C 142.176 117.69399999999999 143.28399999999996 118.46 143.28399999999996 118.46 C 145.69499999999996 120.15299999999999 144.20399999999995 115.47699999999999 143.86899999999997 114.55099999999999 C 142.08499999999998 109.63099999999999 142.02999999999997 107.92599999999999 142.02999999999997 107.92599999999999 C 144.259 112.347 145.93899999999996 112.18299999999999 145.93899999999996 112.18299999999999 C 148.11299999999997 111.48899999999999 144.03899999999996 105.229 141.65199999999996 102.22999999999999 C 140.43399999999997 100.70199999999998 138.86299999999997 98.65599999999999 138.40699999999995 97.44099999999999 C 137.66399999999996 95.38299999999998 137.10299999999995 88.767 137.10299999999995 88.767 C 136.87799999999996 80.96 134.94799999999995 77.56899999999999 134.94799999999995 77.56899999999999 C 131.64799999999994 72.28699999999999 131.02699999999996 62.43399999999999 131.02699999999996 62.43399999999999 L 130.88099999999997 45.79899999999999 C 129.72399999999996 34.45199999999999 121.36299999999997 34.36999999999999 121.36299999999997 34.36999999999999 C 112.91199999999998 33.11199999999999 111.73599999999998 30.38199999999999 111.73599999999998 30.38199999999999 C 109.94599999999997 27.80599999999999 110.96899999999998 22.86799999999999 110.96899999999998 22.86799999999999 C 112.45399999999998 21.659999999999993 113.02699999999999 18.452999999999992 113.02699999999999 18.452999999999992 C 115.49299999999998 16.56199999999999 115.37199999999999 13.794999999999991 114.23299999999999 13.824999999999992 C 113.31899999999999 13.848999999999991 113.526 13.091999999999992 113.526 13.091999999999992 C 115.068 0.636 104.01 0 104.01 0 L 102.322 0 C 102.322 0 91.259 0.636 92.799 13.089 C 92.799 13.089 93.006 13.847000000000001 92.084 13.822000000000001 C 90.94800000000001 13.792000000000002 90.842 16.559 93.299 18.450000000000003 C 93.299 18.450000000000003 93.87100000000001 21.656000000000002 95.357 22.865000000000002 C 95.357 22.865000000000002 96.38 27.803 94.59 30.379 C 94.59 30.379 93.418 33.109 84.96300000000001 34.367000000000004 C 84.96300000000001 34.367000000000004 76.58800000000001 34.449000000000005 75.44900000000001 45.79600000000001 L 75.29100000000001 62.43100000000001 C 75.29100000000001 62.43100000000001 74.68200000000002 72.284 71.36900000000001 77.56600000000002 C 71.36900000000001 77.56600000000002 69.44800000000001 80.95800000000001 69.22600000000001 88.76400000000001 C 69.22600000000001 88.76400000000001 68.66300000000001 95.38000000000001 67.92300000000002 97.43800000000002 C 67.47200000000002 98.64700000000002 65.90200000000002 100.69300000000001 64.67400000000002 102.22700000000002 C 62.26600000000002 105.22000000000001 58.21900000000002 111.46700000000001 60.38400000000002 112.18000000000002 C 60.38400000000002 112.18000000000002 62.07300000000002 112.34400000000002 64.29300000000002 107.92300000000002 C 64.29300000000002 107.92300000000002 64.24700000000001 109.61600000000001 62.46600000000002 114.54800000000002 C 62.11600000000002 115.46200000000002 60.627000000000024 120.13800000000002 63.03900000000002 118.45700000000002 C 63.03900000000002 118.45700000000002 64.15600000000002 117.69000000000003 65.60800000000002 112.88000000000002 C 65.60800000000002 112.88000000000002 64.82900000000002 120.97900000000003 65.69600000000001 121.38600000000002 C 66.82900000000001 121.94100000000003 67.44700000000002 120.33900000000003 67.95800000000001 113.25100000000002 C 67.95800000000001 113.25100000000002 68.48200000000001 110.96200000000002 68.72500000000001 119.69900000000001 C 68.73700000000001 120.15 69.39800000000001 122.397 70.32100000000001 120.47900000000001 C 71.10000000000001 118.87100000000001 70.75000000000001 114.61500000000001 70.75000000000001 113.18400000000001 C 70.75000000000001 113.18400000000001 71.74900000000001 118.70600000000002 72.68300000000002 118.70600000000002 C 72.68300000000002 118.70600000000002 73.78200000000002 119.99700000000001 73.33100000000002 113.13500000000002 C 73.25800000000002 112.01400000000002 73.65100000000001 109.71300000000002 73.70000000000002 109.04300000000002 L 73.80600000000001 106.41200000000002 C 73.80600000000001 106.41200000000002 73.53200000000001 103.39800000000002 73.53200000000001 102.14300000000001 C 73.53200000000001 101.83200000000001 74.61000000000001 97.72800000000001 77.45300000000002 93.39600000000002 C 77.45300000000002 93.39600000000002 83.36600000000001 82.90800000000002 82.98500000000001 76.05400000000002 C 82.98500000000001 76.05400000000002 82.90300000000002 69.51400000000001 85.28400000000002 65.80900000000001 C 85.28400000000002 65.80900000000001 86.97400000000002 84.33500000000001 85.82900000000002 89.53600000000002 C 85.82900000000002 89.53600000000002 80.51000000000002 102.31400000000002 81.68300000000002 111.84400000000002 C 82.54700000000003 118.93800000000002 84.21300000000002 134.08100000000002 85.90900000000002 140.06100000000004 C 86.79500000000002 143.15500000000003 86.27100000000002 150.96000000000004 86.98100000000002 152.90900000000005 C 87.30100000000002 153.75600000000006 87.13300000000002 154.53600000000006 86.44500000000002 156.45400000000004 C 84.05800000000002 163.16400000000004 84.36200000000002 167.89000000000004 90.36600000000003 185.69400000000005 C 90.36600000000003 185.69400000000005 92.21400000000003 189.63900000000004 91.28000000000003 196.72700000000003 C 91.28000000000003 196.72700000000003 87.44400000000003 204.61900000000003 89.90100000000002 204.77700000000004 C 89.90100000000002 204.77700000000004 90.09300000000002 205.30000000000004 90.92400000000002 204.88600000000005 C 90.92400000000002 204.88600000000005 92.25100000000002 206.25600000000006 93.68500000000002 205.51300000000006 C 93.68500000000002 205.51300000000006 95.01300000000002 206.57300000000006 96.14800000000001 205.62900000000008 C 96.14800000000001 205.62900000000008 97.058 206.67600000000007 98.385 205.83000000000007 C 98.385 205.83000000000007 100.12700000000001 207.00500000000008 101.162 205.73200000000006 C 101.162 205.73200000000006 103.001 206.14000000000004 99.727 197.84600000000006 C 99.727 197.84600000000006 98.473 189.05300000000005 97.78200000000001 187.32400000000007 C 96.46400000000001 184.04900000000006 97.39500000000001 175.07300000000006 97.67600000000002 173.14900000000006 C 98.12900000000002 169.93300000000005 97.88600000000001 164.45400000000006 97.05800000000002 160.21500000000006 C 96.45200000000003 157.17700000000005 98.09300000000002 151.44100000000006 98.69900000000003 147.91500000000005 C 99.94400000000003 140.49200000000005 102.38400000000003 121.54200000000004 102.07900000000002 117.95600000000005 L 103.08700000000002 118.31000000000004 C 103.809 118.312 104.265 117.959 104.265 117.959 z" stroke-linecap="round" />
              </g>

              <!-- 标记点与连线 -->
              <g v-for="(pt, key) in currentBodyPoints" :key="key" class="body-point-group" @click="openQuickEdit(key)">
                <line :x1="pt.x" :y1="pt.y" :x2="pt.lx" :y2="pt.ly" stroke="#FF6B8A" stroke-width="1" stroke-dasharray="3,2" opacity="0.8"/>
                <circle :cx="pt.x" :cy="pt.y" r="5" fill="#FF6B8A" class="point-circle"/>
                <text :x="pt.tx" :y="pt.ty" text-anchor="start" dominant-baseline="middle" font-size="11" fill="#475569" font-weight="500">{{ pt.label }} {{ formatBodyValue(key) }}</text>
              </g>
            </svg>
          </div>

          <!-- 基础信息卡片 -->
          <div class="base-stats">
            <div class="base-stat" @click="openQuickEdit('height')">
              <span class="base-label">身高</span>
              <span class="base-value">{{ displayLatest.height ? displayLatest.height + ' cm' : '-' }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('weight')">
              <span class="base-label">体重</span>
              <span class="base-value">{{ displayLatest.weight ? displayLatest.weight + ' kg' : '-' }}</span>
            </div>
            <div class="base-stat" @click="openQuickEdit('bodyFat')">
              <span class="base-label">体脂</span>
              <span class="base-value">{{ displayLatest.bodyFat ? displayLatest.bodyFat + ' %' : '-' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 月经周期（男性看自己时不显示） -->
      <div class="menstrual-section" v-if="!(activeTab === 'mine' && currentUser?.gender === 'male')">
        <div class="section-header">
          <span class="section-icon">🩸</span>
          <span class="section-title">{{ activeTab === 'mine' ? '我的' : '她的' }}月经周期</span>
        </div>
        <div class="menstrual-card">
          <div v-if="latestMenstrual" class="menstrual-info">
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
            <div class="menstrual-note" v-if="latestMenstrual.note">{{ latestMenstrual.note }}</div>
            <!-- 下次预计 -->
            <div class="menstrual-prediction" v-if="nextPeriodPrediction">
              <div class="prediction-label">预计下次</div>
              <div class="prediction-value">{{ nextPeriodPrediction.date }}</div>
              <div class="prediction-days" :class="nextPeriodPrediction.status">{{ nextPeriodPrediction.text }}</div>
            </div>
          </div>
          <div v-else class="menstrual-empty">暂无月经记录</div>
        </div>
      </div>

      <!-- 趋势图1：基础指标 -->
      <div class="trends-section">
        <div class="section-header">
          <span class="section-icon">📈</span>
          <span class="section-title">基础指标趋势</span>
        </div>
        <div class="trend-metric-tabs">
          <div
            v-for="m in basicMetrics"
            :key="m.key"
            class="trend-metric-tab"
            :class="{ active: currentBasicMetric === m.key }"
            @click="switchBasicMetric(m.key)"
          >{{ m.label }}</div>
        </div>
        <div class="trend-chart-card">
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="(tick, i) in basicYAxisTicks" :key="'y1'+i" class="y-tick">{{ tick.formatted }}</span>
            </div>
            <div class="chart-main">
              <svg v-if="basicTrendData.length > 0" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line v-for="i in 5" :key="'grid1'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <path v-if="basicMinePath" fill="none" stroke="#FF6B8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="basicMinePath"/>
                <path v-if="basicPartnerPath && showPartnerTrend" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="basicPartnerPath"/>
              </svg>
              <div v-if="basicTrendData.length === 0" class="chart-empty">暂无数据</div>
              <div v-if="basicMinePoints.length > 0" class="chart-points">
                <div v-for="(p, i) in basicMinePoints" :key="'mp1'+i" class="chart-point mine" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
              <div v-if="basicPartnerPoints.length > 0 && showPartnerTrend" class="chart-points">
                <div v-for="(p, i) in basicPartnerPoints" :key="'pp1'+i" class="chart-point partner" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-x-axis">
            <span v-for="(tick, i) in basicXAxisTicks" :key="'x1'+i" class="x-tick">{{ tick }}</span>
          </div>
          <div class="trend-legend">
            <span class="legend-item"><i class="legend-dot mine"></i>我</span>
            <span class="legend-item"><i class="legend-dot partner"></i>TA</span>
          </div>
        </div>
      </div>

      <!-- 趋势图2：围度指标 -->
      <div class="trends-section">
        <div class="section-header">
          <span class="section-icon">📊</span>
          <span class="section-title">围度趋势</span>
        </div>
        <div class="trend-metric-tabs">
          <div
            v-for="m in bodyMetrics"
            :key="m.key"
            class="trend-metric-tab"
            :class="{ active: currentBodyMetric === m.key }"
            @click="switchBodyMetric(m.key)"
          >{{ m.label }}</div>
        </div>
        <div class="trend-chart-card">
          <div class="chart-container">
            <div class="chart-y-axis">
              <span v-for="(tick, i) in bodyYAxisTicks" :key="'y2'+i" class="y-tick">{{ tick.formatted }}</span>
            </div>
            <div class="chart-main">
              <svg v-if="bodyTrendData.length > 0" class="chart-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <line v-for="i in 5" :key="'grid2'+i" x1="0" :y1="(i-1)*25" x2="100" :y2="(i-1)*25" stroke="#e2e8f0" stroke-width="0.5" stroke-dasharray="2,2"/>
                <path v-if="bodyMinePath" fill="none" stroke="#FF6B8A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="bodyMinePath"/>
                <path v-if="bodyPartnerPath && showPartnerTrend" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :d="bodyPartnerPath"/>
              </svg>
              <div v-if="bodyTrendData.length === 0" class="chart-empty">暂无数据</div>
              <div v-if="bodyMinePoints.length > 0" class="chart-points">
                <div v-for="(p, i) in bodyMinePoints" :key="'mp2'+i" class="chart-point mine" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
              <div v-if="bodyPartnerPoints.length > 0 && showPartnerTrend" class="chart-points">
                <div v-for="(p, i) in bodyPartnerPoints" :key="'pp2'+i" class="chart-point partner" :style="p.style">
                  <div class="point-tooltip">{{ p.value }}</div>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-x-axis">
            <span v-for="(tick, i) in bodyXAxisTicks" :key="'x2'+i" class="x-tick">{{ tick }}</span>
          </div>
          <div class="trend-legend">
            <span class="legend-item"><i class="legend-dot mine"></i>我</span>
            <span class="legend-item"><i class="legend-dot partner"></i>TA</span>
          </div>
        </div>
      </div>

      <!-- 历史记录 -->
      <div class="history-section">
        <div class="section-header">
          <span class="section-icon">📋</span>
          <span class="section-title">历史记录</span>
        </div>
        <!-- 月份筛选 -->
        <div class="month-filter">
          <select v-model="selectedMonth" class="month-select">
            <option value="">全部记录</option>
            <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="month-count">共 {{ filteredHistory.length }} 条</span>
        </div>
        <div class="history-list">
          <div v-for="item in filteredHistory" :key="item._id" class="history-item" @click="openEdit(item)">
            <div class="history-date">{{ formatFullDate(item.recordedAt) }}</div>
            <div class="history-tags">
              <span v-if="item.weight" class="history-tag">体重 {{ item.weight }}kg</span>
              <span v-if="item.bodyFat" class="history-tag">体脂 {{ item.bodyFat }}%</span>
              <span v-if="item.measurements?.chest" class="history-tag">胸围 {{ item.measurements.chest }}cm</span>
              <span v-if="item.measurements?.chestUpper" class="history-tag">上胸围 {{ item.measurements.chestUpper }}cm</span>
              <span v-if="item.measurements?.chestLower" class="history-tag">下胸围 {{ item.measurements.chestLower }}cm</span>
              <span v-if="item.measurements?.waist" class="history-tag">腰围 {{ item.measurements.waist }}cm</span>
              <span v-if="item.measurements?.hip" class="history-tag">臀围 {{ item.measurements.hip }}cm</span>
              <span v-if="item.menstrual?.cycleStart" class="history-tag menstrual-tag">月经</span>
            </div>
          </div>
          <div v-if="filteredHistory.length === 0" class="history-empty">暂无记录</div>
        </div>
      </div>

      <div class="page-bottom-spacer"></div>
    </main>

    <!-- 悬浮按钮（只看自己时显示） -->
    <button v-if="activeTab === 'mine'" class="fab" @click="openFullForm">
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
            <!-- 快速编辑单项：只显示点击的部位 -->
            <template v-if="quickField">
              <div class="form-group">
                <label class="form-label">记录日期</label>
                <input type="date" class="form-input" v-model="form.recordedAt">
              </div>
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
              <div class="form-group">
                <label class="form-label">记录日期</label>
                <input type="date" class="form-input" v-model="form.recordedAt">
              </div>

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

              <template v-if="canEditMenstrual">
                <div class="form-section-title">月经周期</div>
                <div class="form-row">
                  <div class="form-group small">
                    <label class="form-label">开始日期</label>
                    <input type="date" class="form-input" v-model="form.menstrual.cycleStart">
                  </div>
                  <div class="form-group small">
                    <label class="form-label">结束日期</label>
                    <input type="date" class="form-input" v-model="form.menstrual.cycleEnd">
                  </div>
                  <div class="form-group small">
                    <label class="form-label">流量 (1-5)</label>
                    <input type="number" min="1" max="5" class="form-input" v-model.number="form.menstrual.flowLevel" placeholder="-">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">月经备注</label>
                  <input type="text" class="form-input" v-model="form.menstrual.note" placeholder="可选">
                </div>
              </template>

              <div class="form-group">
                <label class="form-label">备注</label>
                <input type="text" class="form-input" v-model="form.note" placeholder="可选">
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button v-if="editingId" class="btn-danger" @click="deleteRecord">删除</button>
            <div class="footer-spacer"></div>
            <button class="btn-secondary" @click="closeModal">取消</button>
            <button class="btn-primary" @click="saveRecord" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Toast -->
    <div class="toast" :class="{ show: toast.show, [toast.type]: true }">
      {{ toast.message }}
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { CONFIG } from '../utils/config.js'

export default {
  name: 'Health',
  setup() {
    const activeTab = ref('mine')
    const mineRecords = ref([])
    const partnerRecords = ref([])
    const currentUser = ref(null)
    const partner = ref(null)
    const loading = ref(false)
    const saving = ref(false)

    const showModal = ref(false)
    const editingId = ref(null)
    const quickField = ref(null)

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

    const getToken = () => localStorage.getItem('token')

    const showToast = (message, type = 'info') => {
      toast.value = { show: true, message, type }
      setTimeout(() => { toast.value.show = false }, 2500)
    }

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
      try {
        const res = await fetch(CONFIG.API_URL + '/health', {
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          mineRecords.value = data.data.mine || []
          partnerRecords.value = data.data.partner || []
        }
      } catch (e) {
        console.error('获取健康档案失败:', e)
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
          basicTrendData.value = data.data
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
          bodyTrendData.value = data.data
        }
      } catch (e) {
        console.error('获取围度趋势失败:', e)
      }
    }

    const fetchTrends = async () => {
      await Promise.all([fetchBasicTrends(), fetchBodyTrends()])
    }

    const switchBasicMetric = (key) => {
      currentBasicMetric.value = key
      fetchBasicTrends()
    }

    const switchBodyMetric = (key) => {
      currentBodyMetric.value = key
      fetchBodyTrends()
    }

    onMounted(async () => {
      await fetchUser()
      await fetchRecords()
      await fetchTrends()
    })

    watch(activeTab, () => {
      selectedMonth.value = ''
    })

    const mineAvatar = computed(() => currentUser.value?.nickname?.[0] || '我')
    const partnerAvatar = computed(() => partner.value?.nickname?.[0] || 'TA')

    const currentGender = computed(() => {
      if (activeTab.value === 'mine') return currentUser.value?.gender || 'male'
      return partner.value?.gender || 'female'
    })

    const displayRecords = computed(() => activeTab.value === 'mine' ? mineRecords.value : partnerRecords.value)
    const displayLatest = computed(() => {
      const rec = displayRecords.value[0]
      if (!rec) return {}
      return {
        height: rec.height,
        weight: rec.weight,
        bodyFat: rec.bodyFat,
        measurements: rec.measurements || {}
      }
    })

    const allMenstrualRecords = computed(() => {
      const list = activeTab.value === 'mine' ? mineRecords.value : partnerRecords.value
      return list
        .filter(r => r.menstrual && r.menstrual.cycleStart)
        .map(r => r.menstrual)
        .sort((a, b) => new Date(b.cycleStart) - new Date(a.cycleStart))
    })

    const latestMenstrual = computed(() => allMenstrualRecords.value[0] || null)

    const menstrualDays = computed(() => {
      if (!latestMenstrual.value || !latestMenstrual.value.cycleEnd || !latestMenstrual.value.cycleStart) return '-'
      const s = new Date(latestMenstrual.value.cycleStart)
      const e = new Date(latestMenstrual.value.cycleEnd)
      return Math.max(1, Math.round((e - s) / 86400000) + 1)
    })

    // 预测下次月经日期
    const nextPeriodPrediction = computed(() => {
      const records = allMenstrualRecords.value
      if (!records || records.length === 0 || !records[0].cycleStart) return null
      const lastStart = new Date(records[0].cycleStart)
      let avgCycle = 28
      if (records.length >= 2) {
        let totalDays = 0
        let count = 0
        for (let i = 0; i < records.length - 1; i++) {
          const curr = new Date(records[i].cycleStart)
          const next = new Date(records[i + 1].cycleStart)
          const diff = Math.round((curr - next) / 86400000)
          if (diff > 14 && diff < 50) {
            totalDays += diff
            count++
          }
        }
        if (count > 0) avgCycle = Math.round(totalDays / count)
      }
      const nextDate = new Date(lastStart)
      nextDate.setDate(nextDate.getDate() + avgCycle)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      nextDate.setHours(0, 0, 0, 0)
      const diffDays = Math.round((nextDate - today) / 86400000)
      let text = ''
      let status = ''
      if (diffDays < 0) {
        text = `已逾期 ${Math.abs(diffDays)} 天`
        status = 'overdue'
      } else if (diffDays === 0) {
        text = '就在今天'
        status = 'today'
      } else {
        text = `还有 ${diffDays} 天`
        status = 'future'
      }
      return {
        date: `${nextDate.getMonth() + 1}/${nextDate.getDate()}`,
        text,
        status
      }
    })

    // 月份筛选
    const monthOptions = computed(() => {
      const list = displayRecords.value
      const map = new Map()
      list.forEach(r => {
        const d = new Date(r.recordedAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = `${d.getFullYear()}年${d.getMonth() + 1}月`
        if (!map.has(key)) map.set(key, { value: key, label })
      })
      return Array.from(map.values())
    })

    const filteredHistory = computed(() => {
      let list = displayRecords.value
      if (selectedMonth.value) {
        list = list.filter(r => {
          const d = new Date(r.recordedAt)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          return key === selectedMonth.value
        })
      }
      return list.slice(0, 50)
    })

    const formatDate = (d) => {
      if (!d) return '-'
      const date = new Date(d)
      return `${date.getMonth() + 1}/${date.getDate()}`
    }

    const formatFullDate = (d) => {
      if (!d) return '-'
      const date = new Date(d)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
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
      return val ? val + 'cm' : '-'
    }

    const showPartnerTrend = computed(() => partnerRecords.value.length > 0)

    // 基础指标趋势图计算
    const basicAllTrendValues = computed(() => {
      const arr = [...(basicTrendData.value.mine || []), ...(basicTrendData.value.partner || [])]
      return arr.map(d => d.value)
    })

    const basicChartRange = computed(() => {
      if (basicAllTrendValues.value.length === 0) return { min: 0, max: 100, range: 100 }
      const values = basicAllTrendValues.value
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const padding = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 1
      const min = Math.max(0, minVal - padding)
      const max = maxVal + padding
      return { min, max, range: max - min || 1 }
    })

    const basicYAxisTicks = computed(() => {
      const { min, max } = basicChartRange.value
      const ticks = []
      for (let i = 4; i >= 0; i--) {
        const value = min + (max - min) * (i / 4)
        let formatted
        if (value >= 10000) formatted = (value / 1000).toFixed(0) + 'k'
        else if (value >= 1000) formatted = (value / 1000).toFixed(1) + 'k'
        else if (value >= 100) formatted = Math.round(value).toString()
        else if (value >= 10) formatted = value.toFixed(1)
        else formatted = value.toFixed(2)
        ticks.push({ value, formatted })
      }
      return ticks
    })

    // 围度趋势图计算
    const bodyAllTrendValues = computed(() => {
      const arr = [...(bodyTrendData.value.mine || []), ...(bodyTrendData.value.partner || [])]
      return arr.map(d => d.value)
    })

    const bodyChartRange = computed(() => {
      if (bodyAllTrendValues.value.length === 0) return { min: 0, max: 100, range: 100 }
      const values = bodyAllTrendValues.value
      const minVal = Math.min(...values)
      const maxVal = Math.max(...values)
      const padding = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 1
      const min = Math.max(0, minVal - padding)
      const max = maxVal + padding
      return { min, max, range: max - min || 1 }
    })

    const bodyYAxisTicks = computed(() => {
      const { min, max } = bodyChartRange.value
      const ticks = []
      for (let i = 4; i >= 0; i--) {
        const value = min + (max - min) * (i / 4)
        let formatted
        if (value >= 10000) formatted = (value / 1000).toFixed(0) + 'k'
        else if (value >= 1000) formatted = (value / 1000).toFixed(1) + 'k'
        else if (value >= 100) formatted = Math.round(value).toString()
        else if (value >= 10) formatted = value.toFixed(1)
        else formatted = value.toFixed(2)
        ticks.push({ value, formatted })
      }
      return ticks
    })

    const buildPath = (list, rangeObj) => {
      if (!list || list.length < 2) return ''
      const { min, max } = rangeObj
      const range = max - min || 1
      const points = list.map((d, i) => {
        const x = list.length === 1 ? 50 : 5 + (i / (list.length - 1)) * 90
        const ratio = (d.value - min) / range
        const y = 95 - ratio * 90
        return { x, y: Math.max(5, Math.min(95, y)) }
      })
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
    }

    const buildPoints = (list, rangeObj) => {
      if (!list || list.length === 0) return []
      const { min, max } = rangeObj
      const range = max - min || 1
      return list.map((d, i) => {
        const x = list.length === 1 ? 50 : 5 + (i / (list.length - 1)) * 90
        const ratio = (d.value - min) / range
        const y = 95 - ratio * 90
        return { value: d.value, style: { left: x + '%', top: Math.max(5, Math.min(95, y)) + '%' } }
      })
    }

    // 基础指标图表
    const basicMinePath = computed(() => buildPath(basicTrendData.value.mine, basicChartRange.value))
    const basicPartnerPath = computed(() => buildPath(basicTrendData.value.partner, basicChartRange.value))
    const basicMinePoints = computed(() => buildPoints(basicTrendData.value.mine, basicChartRange.value))
    const basicPartnerPoints = computed(() => buildPoints(basicTrendData.value.partner, basicChartRange.value))

    const basicXAxisTicks = computed(() => {
      const list = basicTrendData.value.mine && basicTrendData.value.mine.length > 0 ? basicTrendData.value.mine : basicTrendData.value.partner
      if (!list || list.length === 0) return []
      const total = list.length
      const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
      const ticks = []
      for (let i = 0; i < maxTicks; i++) {
        const index = Math.round((i / (maxTicks - 1)) * (total - 1))
        ticks.push(list[index]?.date || '')
      }
      return ticks
    })

    // 围度图表
    const bodyMinePath = computed(() => buildPath(bodyTrendData.value.mine, bodyChartRange.value))
    const bodyPartnerPath = computed(() => buildPath(bodyTrendData.value.partner, bodyChartRange.value))
    const bodyMinePoints = computed(() => buildPoints(bodyTrendData.value.mine, bodyChartRange.value))
    const bodyPartnerPoints = computed(() => buildPoints(bodyTrendData.value.partner, bodyChartRange.value))

    const bodyXAxisTicks = computed(() => {
      const list = bodyTrendData.value.mine && bodyTrendData.value.mine.length > 0 ? bodyTrendData.value.mine : bodyTrendData.value.partner
      if (!list || list.length === 0) return []
      const total = list.length
      const maxTicks = total <= 7 ? total : (total <= 14 ? 4 : 5)
      const ticks = []
      for (let i = 0; i < maxTicks; i++) {
        const index = Math.round((i / (maxTicks - 1)) * (total - 1))
        ticks.push(list[index]?.date || '')
      }
      return ticks
    })

    const emptyForm = () => ({
      recordedAt: new Date().toISOString().split('T')[0],
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
      menstrual: {
        cycleStart: '',
        cycleEnd: '',
        flowLevel: null,
        note: ''
      },
      note: ''
    })

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
      // 女生给自己记，男生给伴侣记月经
      if (activeTab.value === 'mine') {
        // 自己：可以记身体数据+月经（如果有月经权限）
        editingId.value = null
        quickField.value = null
        form.value = emptyForm()
        showModal.value = true
        return
      }
      // 在伴侣tab
      if (currentUser.value?.gender === 'male') {
        // 男生帮伴侣记月经
        editingId.value = null
        quickField.value = null
        form.value = emptyForm()
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
      form.value = emptyForm()
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
        recordedAt: item.recordedAt ? new Date(item.recordedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
        menstrual: {
          cycleStart: item.menstrual?.cycleStart ? new Date(item.menstrual.cycleStart).toISOString().split('T')[0] : '',
          cycleEnd: item.menstrual?.cycleEnd ? new Date(item.menstrual.cycleEnd).toISOString().split('T')[0] : '',
          flowLevel: item.menstrual?.flowLevel ?? null,
          note: item.menstrual?.note || ''
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
      saving.value = true
      try {
        const payload = {
          recordedAt: form.value.recordedAt,
          height: form.value.height,
          weight: form.value.weight,
          bodyFat: form.value.bodyFat,
          measurements: { ...form.value.measurements },
          note: form.value.note
        }
        // 月经权限：女生给自己，男生给伴侣
        if (canEditMenstrual.value) {
          payload.menstrual = {
            cycleStart: form.value.menstrual.cycleStart || null,
            cycleEnd: form.value.menstrual.cycleEnd || null,
            flowLevel: form.value.menstrual.flowLevel,
            note: form.value.menstrual.note
          }
        }
        // 男生帮伴侣记录时，传入 targetUserId
        if (activeTab.value === 'partner' && currentUser.value?.gender === 'male' && partner.value) {
          payload.targetUserId = partner.value.id
        }
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

    const deleteRecord = async () => {
      if (!editingId.value) return
      if (!confirm('确定删除这条记录吗？')) return
      try {
        const res = await fetch(`${CONFIG.API_URL}/health/${editingId.value}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer ' + getToken() }
        })
        const data = await res.json()
        if (data.success) {
          showToast('删除成功', 'success')
          closeModal()
          await fetchRecords()
          await fetchTrends()
        } else {
          showToast(data.message || '删除失败', 'error')
        }
      } catch (e) {
        showToast('删除失败', 'error')
      }
    }

    return {
      activeTab,
      currentUser,
      currentGender,
      mineAvatar,
      partnerAvatar,
      displayLatest,
      filteredHistory,
      latestMenstrual,
      menstrualDays,
      nextPeriodPrediction,
      formatDate,
      formatFullDate,
      currentBodyPoints,
      formatBodyValue,
      openQuickEdit,
      openFullForm,
      openEdit,
      showModal,
      modalTitle,
      form,
      saveRecord,
      deleteRecord,
      closeModal,
      editingId,
      quickField,
      saving,
      toast,
      canEditMenstrual,
      basicMetrics,
      bodyMetrics,
      currentBasicMetric,
      currentBodyMetric,
      switchBasicMetric,
      switchBodyMetric,
      basicTrendData,
      bodyTrendData,
      basicMinePath,
      basicPartnerPath,
      basicMinePoints,
      basicPartnerPoints,
      basicYAxisTicks,
      basicXAxisTicks,
      bodyMinePath,
      bodyPartnerPath,
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
  background: linear-gradient(180deg, #fff5f7 0%, #ffffff 120px);
  padding-bottom: 100px;
}
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  padding-top: max(16px, env(safe-area-inset-top, 0px));
}
.back-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #334155;
}
.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
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
  padding: 10px 0;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.8);
  color: #64748b;
  font-weight: 500;
}
.tab-item.active {
  background: #ffffff;
  border-color: #FF6B8A;
  color: #FF6B8A;
  box-shadow: 0 2px 8px rgba(255, 107, 138, 0.12);
}
.tab-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
  color: #fff;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 人体图 */
.page-body {
  padding: 0 16px;
}
.body-map-section {
  margin-bottom: 16px;
}
.body-map-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.body-map-title {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  margin-bottom: 8px;
}
.body-map-wrapper {
  display: flex;
  justify-content: center;
}
.body-svg {
  width: 260px;
  height: 420px;
}
.body-point-group {
  cursor: pointer;
}
.body-point-group:hover .point-circle {
  r: 7;
}
.body-point-group:hover text {
  fill: #FF6B8A;
}

.base-stats {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}
.base-stat {
  flex: 1;
  background: #f8fafc;
  border-radius: 12px;
  padding: 10px 6px;
  text-align: center;
  cursor: pointer;
}
.base-label {
  display: block;
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 2px;
}
.base-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #334155;
}

/* Section */
.section-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 20px 0 10px;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}

/* 月经 */
.menstrual-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
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
  color: #94a3b8;
}
.date-value {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #334155;
}
.menstrual-arrow {
  color: #cbd5e1;
  font-size: 14px;
}
.menstrual-days {
  margin-left: auto;
  text-align: center;
}
.days-num {
  font-size: 18px;
  font-weight: 700;
  color: #FF6B8A;
}
.days-label {
  font-size: 12px;
  color: #94a3b8;
}
.menstrual-note {
  font-size: 13px;
  color: #64748b;
  background: #fef2f4;
  padding: 8px 10px;
  border-radius: 10px;
}
.menstrual-empty {
  font-size: 13px;
  color: #94a3b8;
  text-align: center;
  padding: 10px 0;
}
.menstrual-prediction {
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #fdf2f8, #fce7f3);
  padding: 10px 12px;
  border-radius: 12px;
  margin-top: 4px;
}
.prediction-label {
  font-size: 12px;
  color: #be185d;
  font-weight: 500;
}
.prediction-value {
  font-size: 16px;
  font-weight: 700;
  color: #be185d;
}
.prediction-days {
  margin-left: auto;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 10px;
  font-weight: 500;
}
.prediction-days.future {
  background: #dbeafe;
  color: #2563eb;
}
.prediction-days.today {
  background: #fef3c7;
  color: #d97706;
}
.prediction-days.overdue {
  background: #fee2e2;
  color: #dc2626;
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
  padding: 6px 12px;
  border-radius: 20px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
}
.trend-metric-tab.active {
  background: #FF6B8A;
  color: #fff;
  border-color: #FF6B8A;
}
.trend-chart-card {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
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
  color: #94a3b8;
  text-align: right;
  width: 28px;
}
.chart-main {
  flex: 1;
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
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #94a3b8;
}
.chart-points {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.chart-point {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.chart-point.mine {
  background: #FF6B8A;
}
.chart-point.partner {
  background: #60a5fa;
}
.point-tooltip {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(30, 41, 59, 0.9);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}
.chart-point:hover .point-tooltip {
  opacity: 1;
}
.chart-x-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  padding-left: 36px;
  font-size: 10px;
  color: #94a3b8;
}
.trend-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 10px;
  font-size: 12px;
  color: #64748b;
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
  background: #FF6B8A;
}
.legend-dot.partner {
  background: #60a5fa;
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
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}
.history-date {
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  margin-bottom: 6px;
}
.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.history-tag {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 4px 8px;
  border-radius: 8px;
}
.history-tag.menstrual-tag {
  background: #fef2f4;
  color: #FF6B8A;
}
.history-empty {
  text-align: center;
  font-size: 13px;
  color: #94a3b8;
  padding: 20px 0;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 20px;
  border-radius: 30px;
  border: none;
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  box-shadow: 0 6px 20px rgba(255, 107, 138, 0.35);
  z-index: 50;
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
  border-color: #FF6B8A;
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
  background: linear-gradient(135deg, #FF6B8A, #ff8fa8);
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
</style>
