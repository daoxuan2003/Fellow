<template>
  <teleport to="body">
    <!-- 遮罩层 -->
    <div 
      v-if="show" 
      class="ai-drawer-overlay"
      @click="close"
    ></div>
    
    <!-- 抽屉 -->
    <div 
      v-if="show"
      class="ai-drawer"
      :class="{ expanded: isExpanded || showPlanPreview }"
      :style="drawerStyle"
    >
      <!-- 拖动条 -->
      <div class="drag-handle" @touchstart="startDrag" @mousedown="startDrag">
        <div class="drag-line"></div>
      </div>
      
      <!-- 头部 -->
      <div class="drawer-header">
        <div class="header-title">
          <span class="ai-icon">💡</span>
          <div class="title-text">
            <span class="main-title">AI 助手</span>
            <span class="sub-title">{{ habitTitle }}</span>
          </div>
        </div>
        <button class="close-btn" @click="close">✕</button>
      </div>
      
      <!-- 聊天内容区 -->
      <div class="chat-content" ref="chatContentRef">
        <!-- 欢迎消息 -->
        <div v-if="currentMessages.length === 0" class="welcome-msg">
          <div class="ai-avatar">🤖</div>
          <div class="bubble">
            嗨！我是你的专属习惯教练。
            <br><br>
            关于「{{ habitTitle }}」，我可以帮你：
            <br>• 分析打卡规律和趋势
            <br>• 优化计划安排
            <br>• 生成个性化方案
            <br><br>
            想聊点什么？
          </div>
        </div>
        
        <!-- 消息列表 -->
        <div 
          v-for="(msg, index) in currentMessages" 
          :key="index"
          :class="['message', msg.role]"
        >
          <div class="avatar">{{ msg.role === 'ai' ? '🤖' : '👤' }}</div>
          <div class="bubble" v-html="formatMessage(msg.content)"></div>
        </div>
        
        <!-- 加载中 -->
        <div v-if="loading" class="message ai loading">
          <div class="avatar">🤖</div>
          <div class="bubble">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </div>
        </div>
        
        <!-- 方案预览 -->
        <AIPlanPreview
          v-if="showPlanPreview && generatedPlan"
          :plan="generatedPlan"
          :target-habit-id="habitId"
          :applying="applyingPlan"
          @apply="applyPlan"
          @cancel="cancelPlanPreview"
        />
      </div>
      
      <!-- 快捷操作 -->
      <div v-if="showQuickActions && !loading" class="quick-actions">
        <button 
          v-for="action in quickActions" 
          :key="action.id"
          @click="sendQuickAction(action)"
          class="quick-btn"
        >
          {{ action.label }}
        </button>
      </div>
      
      <!-- 输入区 -->
      <div class="input-area">
        <input
          v-model="userInput"
          @keyup.enter="sendMessage"
          placeholder="问点什么..."
          :disabled="loading"
        />
        <button 
          @click="sendMessage" 
          :disabled="!userInput.trim() || loading"
          class="send-btn"
        >
          发送
        </button>
      </div>
    </div>
  </teleport>
</template>

<script>
import { ref, computed, watch, nextTick } from 'vue'
import CONFIG from '../config'
import AIPlanPreview from './AIPlanPreview.vue'

// 获取 token
const getToken = () => localStorage.getItem('token')

export default {
  name: 'AIDrawer',
  components: { AIPlanPreview },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    habitId: {
      type: String,
      default: null
    },
    habitTitle: {
      type: String,
      default: '计划'
    }
  },
  emits: ['close', 'update:show', 'planApplied'],
  setup(props, { emit }) {
    // 为每个计划维护独立的聊天历史
    // key: habitId, value: messages array
    const chatHistories = ref(new Map())
    
    const userInput = ref('')
    const loading = ref(false)
    const isExpanded = ref(false)
    const chatContentRef = ref(null)
    
    // 抽屉高度
    const drawerHeight = ref(50) // vh
    const drawerStyle = computed(() => ({
      height: `${drawerHeight.value}vh`
    }))
    
    // 获取当前计划的聊天记录
    const currentMessages = computed(() => {
      if (!props.habitId) return []
      return chatHistories.value.get(props.habitId) || []
    })
    
    // 是否显示快捷操作
    const showQuickActions = computed(() => currentMessages.value.length < 2)
    
    // 快捷操作按钮
    const quickActions = [
      { id: 'analyze', label: '🔍 分析打卡' },
      { id: 'optimize', label: '✨ 优化计划' },
      { id: 'generate', label: '📝 生成方案' }
    ]
    
    // 方案预览相关
    const showPlanPreview = ref(false)
    const generatedPlan = ref(null)
    const applyingPlan = ref(false)
    
    // 监听显示状态
    watch(() => props.show, (newVal) => {
      if (newVal) {
        nextTick(() => {
          scrollToBottom()
        })
      }
    })
    
    // 监听当前消息变化
    watch(currentMessages, () => {
      nextTick(() => {
        scrollToBottom()
      })
    }, { deep: true })
    
    // 关闭抽屉
    const close = () => {
      emit('update:show', false)
      emit('close')
    }
    
    // 拖动调整高度
    let startY = 0
    let startHeight = 50
    
    const startDrag = (e) => {
      startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
      startHeight = drawerHeight.value
      
      document.addEventListener('mousemove', onDrag)
      document.addEventListener('mouseup', stopDrag)
      document.addEventListener('touchmove', onDrag)
      document.addEventListener('touchend', stopDrag)
    }
    
    const onDrag = (e) => {
      const y = e.type.includes('touch') ? e.touches[0].clientY : e.clientY
      const delta = startY - y
      const newHeight = Math.max(30, Math.min(85, startHeight + (delta / window.innerHeight * 100)))
      drawerHeight.value = newHeight
      isExpanded.value = newHeight > 60
    }
    
    const stopDrag = () => {
      document.removeEventListener('mousemove', onDrag)
      document.removeEventListener('mouseup', stopDrag)
      document.removeEventListener('touchmove', onDrag)
      document.removeEventListener('touchend', stopDrag)
      
      // 吸附效果
      if (drawerHeight.value < 40) {
        close()
      } else if (drawerHeight.value > 70) {
        drawerHeight.value = 85
        isExpanded.value = true
      } else {
        drawerHeight.value = 50
        isExpanded.value = false
      }
    }
    
    // 发送快捷操作
    const sendQuickAction = async (action) => {
      let message = ''
      switch (action.id) {
        case 'analyze':
          message = '帮我分析一下这个计划的打卡情况'
          break
        case 'optimize':
          message = '我觉得这个计划可以优化一下，有什么建议吗？'
          break
        case 'generate':
          message = '我想基于这个计划生成更详细的方案'
          break
      }
      userInput.value = message
      await sendMessage()
    }
    
    // 添加消息到当前计划的聊天记录
    const addMessage = (role, content) => {
      if (!props.habitId) return
      
      const history = chatHistories.value.get(props.habitId) || []
      history.push({ role, content, timestamp: Date.now() })
      
      // 只保留最近 20 条消息，避免过长
      if (history.length > 20) {
        history.shift()
      }
      
      chatHistories.value.set(props.habitId, history)
    }
    
    // 发送消息
    const sendMessage = async () => {
      const content = userInput.value.trim()
      if (!content || loading.value || !props.habitId) return
      
      // 添加用户消息
      addMessage('user', content)
      userInput.value = ''
      loading.value = true
      
      try {
        // 获取当前计划的历史记录（最近 6 条用于上下文）
        const currentHistory = chatHistories.value.get(props.habitId) || []
        const historyForAPI = currentHistory
          .slice(-6)
          .map(m => ({ role: m.role, content: m.content }))
        
        const res = await fetch(`${CONFIG.API_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({
            habitId: props.habitId,
            message: content,
            history: historyForAPI
          })
        })
        
        // 检查响应状态
        if (!res.ok) {
          if (res.status === 404) {
            addMessage('ai', '🚨 AI 服务暂时不可用，请检查后端服务是否已启动。')
          } else if (res.status === 401) {
            addMessage('ai', '🔒 登录已过期，请重新登录。')
          } else {
            addMessage('ai', `❌ 服务暂时不可用 (${res.status})，请稍后重试。`)
          }
          return
        }
        
        // 检查响应内容类型
        const contentType = res.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('响应不是 JSON:', await res.text())
          addMessage('ai', '🚨 服务响应异常，请检查网络或联系管理员。')
          return
        }
        
        const data = await res.json()
        
        if (data.success) {
          addMessage('ai', data.reply)
          
          // 检测如果是方案生成类消息，显示预览
          if (detectPlanInMessage(data.reply)) {
            // 延迟一下显示预览，让用户先看到消息
            setTimeout(() => {
              showPlanPreviewFromMessage(data.reply)
            }, 500)
          }
        } else {
          addMessage('ai', data.message || '抱歉，我暂时无法回答，请稍后再试。')
        }
      } catch (e) {
        console.error('AI 请求失败:', e)
        addMessage('ai', '🚨 网络连接失败，请检查：1) 后端服务是否启动 2) 网络连接是否正常')
      } finally {
        loading.value = false
      }
    }
    
    // 格式化消息（简单的换行处理）
    const formatMessage = (content) => {
      return content.replace(/\n/g, '<br>')
    }
    
    // 检测 AI 回复中是否包含方案（简单版）
    const detectPlanInMessage = (content) => {
      // 如果消息包含特定关键词，认为是方案
      const planKeywords = ['周计划', '每天', '每周', '任务', '安排', '打卡时间']
      const hasKeywords = planKeywords.some(kw => content.includes(kw))
      
      // 检测是否有列表格式（数字+点/顿号开头）
      const hasListFormat = /\d+[\.\、\.]/.test(content)
      
      return hasKeywords && hasListFormat
    }
    
    // 解析 AI 回复中的方案（简化版）
    const parsePlanFromMessage = (content) => {
      // 尝试提取计划名称
      const titleMatch = content.match(/["《]([^"》]+)["》]|「([^」]+)」|([一-龥]{2,10})计划/)
      const planName = titleMatch ? (titleMatch[1] || titleMatch[2] || titleMatch[3]) : '定制计划'
      
      // 尝试提取周频
      let frequency = 'daily'
      let weekdays = [1, 2, 3, 4, 5]
      
      if (content.includes('每周') || content.includes('周一') || content.includes('周二')) {
        frequency = 'weekly'
        // 提取周几
        const weekdayMap = {
          '周日': 0, '周一': 1, '周二': 2, '周三': 3, '周四': 4, '周五': 5, '周六': 6
        }
        weekdays = Object.entries(weekdayMap)
          .filter(([name]) => content.includes(name))
          .map(([, num]) => num)
        if (weekdays.length === 0) weekdays = [1, 3, 5]
      }
      
      // 尝试提取子任务
      const tasks = []
      const lines = content.split('\n')
      for (const line of lines) {
        // 匹配列表项：1. 任务名 或 一、任务名
        const taskMatch = line.match(/^\s*(?:\d+[\.\、\.]|[一-二三四五六七八九十][、\.])\s*(.+)$/)
        if (taskMatch) {
          const taskTitle = taskMatch[1].trim()
          if (taskTitle && taskTitle.length < 50) {
            tasks.push(taskTitle)
          }
        }
      }
      
      return {
        planName,
        description: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        type: tasks.length > 0 ? 'subtasks' : 'simple',
        frequency,
        weekdays,
        subTasks: tasks.slice(0, 10), // 最多 10 个任务
        tips: ['由 AI 助手根据你的情况生成']
      }
    }
    
    // 显示方案预览
    const showPlanPreviewFromMessage = (content) => {
      const plan = parsePlanFromMessage(content)
      generatedPlan.value = plan
      showPlanPreview.value = true
      // 自动展开抽屉以显示完整预览
      drawerHeight.value = 70
      isExpanded.value = true
    }
    
    // 应用方案
    const applyPlan = async (targetType) => {
      if (!generatedPlan.value) return
      
      applyingPlan.value = true
      
      try {
        const res = await fetch(`${CONFIG.API_URL}/ai/apply-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({
            targetType,
            targetHabitId: props.habitId,
            plan: generatedPlan.value
          })
        })
        
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        
        const data = await res.json()
        
        if (data.success) {
          addMessage('ai', `✅ ${data.message}已应用成功！你可以在计划列表中查看。`)
          showPlanPreview.value = false
          generatedPlan.value = null
          
          // 通知父组件刷新计划列表
          emit('planApplied')
        } else {
          addMessage('ai', `❌ 应用失败：${data.message}`)
        }
      } catch (e) {
        console.error('应用方案失败:', e)
        addMessage('ai', '🚨 应用方案失败，请检查网络后重试。')
      } finally {
        applyingPlan.value = false
      }
    }
    
    // 取消方案预览
    const cancelPlanPreview = () => {
      showPlanPreview.value = false
      generatedPlan.value = null
      // 还原抽屉高度
      drawerHeight.value = 50
      isExpanded.value = false
    }
    
    // 滚动到底部
    const scrollToBottom = () => {
      if (chatContentRef.value) {
        chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight
      }
    }
    
    return {
      currentMessages,
      userInput,
      loading,
      isExpanded,
      drawerStyle,
      chatContentRef,
      showQuickActions,
      quickActions,
      showPlanPreview,
      generatedPlan,
      applyingPlan,
      close,
      startDrag,
      sendQuickAction,
      sendMessage,
      formatMessage,
      applyPlan,
      cancelPlanPreview
    }
  }
}
</script>

<style scoped>
.ai-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.ai-drawer {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  border-radius: 20px 20px 0 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transition: height 0.1s ease;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
}

.drag-handle {
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-line {
  width: 40px;
  height: 4px;
  background: #ddd;
  border-radius: 2px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-icon {
  font-size: 20px;
}

.title-text {
  display: flex;
  flex-direction: column;
}

.main-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.sub-title {
  font-size: 12px;
  color: #999;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.welcome-msg,
.message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.message.user {
  flex-direction: row-reverse;
}

.ai-avatar,
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.message.user .avatar {
  background: #10b981;
}

.bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.welcome-msg .bubble,
.message.ai .bubble {
  background: #f5f5f5;
  color: #333;
  border-bottom-left-radius: 4px;
}

.message.user .bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.loading .bubble {
  display: flex;
  gap: 4px;
  padding: 16px 20px;
}

.dot {
  width: 8px;
  height: 8px;
  background: #999;
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.quick-actions {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
  border-top: 1px solid #f0f0f0;
}

.quick-btn {
  white-space: nowrap;
  padding: 8px 14px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-btn:hover {
  background: #f5f5f5;
  border-color: #667eea;
}

.input-area {
  display: flex;
  gap: 8px;
  padding: 12px 16px 20px;
  border-top: 1px solid #f0f0f0;
}

.input-area input {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.input-area input:focus {
  border-color: #667eea;
}

.send-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 响应式 */
@media (min-width: 768px) {
  .ai-drawer {
    max-width: 600px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 20px;
    margin-bottom: 20px;
    max-height: 70vh;
  }
  
  .ai-drawer-overlay {
    display: none;
  }
}
</style>
