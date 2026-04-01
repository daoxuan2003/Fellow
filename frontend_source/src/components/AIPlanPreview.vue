<template>
  <div v-if="plan" class="plan-preview">
    <div class="preview-header">
      <span class="preview-icon">📋</span>
      <span class="preview-title">{{ plan.planName || 'AI 方案' }}</span>
    </div>
    
    <div class="preview-content">
      <!-- 基本信息 -->
      <div class="info-section">
        <div class="info-item">
          <span class="label">频率：</span>
          <span class="value">{{ frequencyLabel }}</span>
        </div>
        <div v-if="plan.weekdays?.length" class="info-item">
          <span class="label">每周：</span>
          <span class="value">{{ weekdaysLabel }}</span>
        </div>
        <div v-if="plan.type" class="info-item">
          <span class="label">类型：</span>
          <span class="value">{{ typeLabel }}</span>
        </div>
      </div>
      
      <!-- 子任务预览 -->
      <div v-if="plan.subTasks?.length" class="tasks-section">
        <div class="section-title">任务安排（{{ plan.subTasks.length }} 项）</div>
        <div class="tasks-list">
          <div 
            v-for="(task, index) in displayedTasks" 
            :key="index"
            class="task-item"
          >
            <span class="task-num">{{ index + 1 }}</span>
            <span class="task-title">
              {{ typeof task === 'string' ? task : (task.title || task.task || task.taskName || task.name || '未命名任务') }}
            </span>
            <span v-if="task.weekday !== undefined && task.weekday >= 0" class="task-weekday">
              {{ weekdayNames[task.weekday] || '' }}
            </span>
          </div>
          <div v-if="plan.subTasks.length > 5" class="more-tasks">
            还有 {{ plan.subTasks.length - 5 }} 项...
          </div>
        </div>
      </div>
      
      <!-- 数值追踪 -->
      <div v-if="plan.numericConfig" class="numeric-section">
        <div class="section-title">数值追踪</div>
        <div class="numeric-info">
          {{ plan.numericConfig.targetValue }}{{ plan.numericConfig.unit }}
        </div>
      </div>
      
      <!-- 建议提示 -->
      <div v-if="plan.tips?.length" class="tips-section">
        <div class="section-title">💡 AI 建议</div>
        <ul class="tips-list">
          <li v-for="(tip, index) in plan.tips.slice(0, 3)" :key="index">
            {{ tip }}
          </li>
        </ul>
      </div>
    </div>
    
    <!-- 操作按钮 -->
    <div class="preview-actions">
      <button 
        v-if="targetHabitId"
        class="btn-update"
        @click="$emit('apply', 'update')"
        :disabled="applying"
      >
        {{ applying ? '应用中...' : '更新现有计划' }}
      </button>
      <button 
        v-if="targetHabitId"
        class="btn-replace"
        @click="$emit('apply', 'replace')"
        :disabled="applying"
      >
        {{ applying ? '应用中...' : '替换为新计划' }}
      </button>
      <button 
        v-else
        class="btn-create"
        @click="$emit('apply', 'new')"
        :disabled="applying"
      >
        {{ applying ? '创建中...' : '创建新计划' }}
      </button>
      <button 
        class="btn-cancel"
        @click="$emit('cancel')"
        :disabled="applying"
      >
        取消
      </button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'

export default {
  name: 'AIPlanPreview',
  props: {
    plan: {
      type: Object,
      required: true
    },
    targetHabitId: {
      type: String,
      default: null
    },
    applying: {
      type: Boolean,
      default: false
    }
  },
  emits: ['apply', 'cancel'],
  setup(props) {
    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    
    const frequencyLabel = computed(() => {
      const map = {
        'daily': '每天',
        'weekly': '每周特定几天'
      }
      return map[props.plan.frequency] || props.plan.frequency
    })
    
    const weekdaysLabel = computed(() => {
      if (!props.plan.weekdays?.length) return ''
      return props.plan.weekdays.map(d => weekdayNames[d]).join('、')
    })
    
    const typeLabel = computed(() => {
      const map = {
        'simple': '简单打卡',
        'subtasks': '子任务',
        'numeric': '数值追踪'
      }
      return map[props.plan.type] || props.plan.type
    })
    
    const displayedTasks = computed(() => {
      return (props.plan.subTasks || []).slice(0, 5)
    })
    
    return {
      weekdayNames,
      frequencyLabel,
      weekdaysLabel,
      typeLabel,
      displayedTasks
    }
  }
}
</script>

<style scoped>
.plan-preview {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
}

.preview-icon {
  font-size: 20px;
}

.preview-title {
  font-weight: 600;
  font-size: 16px;
  color: #212529;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.info-item {
  font-size: 13px;
}

.info-item .label {
  color: #6c757d;
}

.info-item .value {
  color: #212529;
  font-weight: 500;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tasks-section,
.numeric-section,
.tips-section {
  background: white;
  border-radius: 8px;
  padding: 12px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.task-num {
  width: 18px;
  height: 18px;
  background: #e9ecef;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #495057;
  flex-shrink: 0;
}

.task-title {
  flex: 1;
  color: #212529;
}

.task-weekday {
  font-size: 11px;
  color: #6c757d;
  background: #f1f3f5;
  padding: 2px 6px;
  border-radius: 4px;
}

.more-tasks {
  font-size: 12px;
  color: #6c757d;
  text-align: center;
  padding: 4px;
}

.tips-list {
  margin: 0;
  padding-left: 16px;
  font-size: 13px;
  color: #495057;
}

.tips-list li {
  margin-bottom: 4px;
}

.tips-list li:last-child {
  margin-bottom: 0;
}

.preview-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.preview-actions button {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-create {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-update {
  background: #28a745;
  color: white;
}

.btn-replace {
  background: #fd7e14;
  color: white;
}

.btn-cancel {
  background: #e9ecef;
  color: #495057;
}

.preview-actions button:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
</style>
