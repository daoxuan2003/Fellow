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
      :class="{ expanded: isExpanded }"
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
          <span>关于"{{ habitTitle }}"</span>
        </div>
        <button class="close-btn" @click="close">✕</button>
      </div>
      
      <!-- 聊天内容区 -->
      <div class="chat-content" ref="chatContentRef">
        <!-- 欢迎消息 -->
        <div v-if="messages.length === 0" class="welcome-msg">
          <div class="ai-avatar">🤖</div>
          <div class="bubble">
            嗨！我是你们的习惯养成助手。
            <br><br>
            我可以帮你：
            <br>• 分析打卡规律
            <br>• 优化计划安排
            <br>• 生成专属方案
            <br><br>
            想聊点什么？
          </div>
        </div>
        
        <!-- 消息列表 -->
        <div 
          v-for="(msg, index) in messages" 
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
import { CONFIG } from '../config'

// 获取 token
const getToken = () => localStorage.getItem('token')

export default {
  name: 'AIDrawer',
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
  emits: ['close', 'update:show'],
  setup(props, { emit }) {
    const messages = ref([])
    const userInput = ref('')
    const loading = ref(false)
    const isExpanded = ref(false)
    const chatContentRef = ref(null)
    
    // 抽屉高度
    const drawerHeight = ref(50) // vh
    const drawerStyle = computed(() => ({
      height: `${drawerHeight.value}vh`
    }))
    
    // 是否显示快捷操作
    const showQuickActions = computed(() => messages.value.length < 2)
    
    // 快捷操作按钮
    const quickActions = [
      { id: 'analyze', label: '🔍 分析我的打卡' },
      { id: 'optimize', label: '✨ 优化计划' },
      { id: 'generate', label: '📝 生成新方案' }
    ]
    
    // 监听显示状态，打开时滚动到底部
    watch(() => props.show, (newVal) => {
      if (newVal) {
        nextTick(() => {
          scrollToBottom()
        })
      }
    })
    
    // 监听消息变化，自动滚动
    watch(messages, () => {
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
          message = '我想制定一个新的计划，能帮我生成一个方案吗？'
          break
      }
      userInput.value = message
      await sendMessage()
    }
    
    // 发送消息
    const sendMessage = async () => {
      const content = userInput.value.trim()
      if (!content || loading.value) return
      
      // 添加用户消息
      messages.value.push({ role: 'user', content })
      userInput.value = ''
      loading.value = true
      
      try {
        const history = messages.value.slice(-6).map(m => ({
          role: m.role,
          content: m.content
        }))
        
        const res = await fetch(`${CONFIG.API_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + getToken()
          },
          body: JSON.stringify({
            habitId: props.habitId,
            message: content,
            history
          })
        })
        
        const data = await res.json()
        
        if (data.success) {
          messages.value.push({ role: 'ai', content: data.reply })
        } else {
          messages.value.push({ 
            role: 'ai', 
            content: '抱歉，我暂时无法回答，请稍后再试。' 
          })
        }
      } catch (e) {
        messages.value.push({ 
          role: 'ai', 
          content: '网络出错了，请检查连接后重试。' 
        })
      } finally {
        loading.value = false
      }
    }
    
    // 格式化消息（简单的换行处理）
    const formatMessage = (content) => {
      return content.replace(/\n/g, '<br>')
    }
    
    // 滚动到底部
    const scrollToBottom = () => {
      if (chatContentRef.value) {
        chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight
      }
    }
    
    return {
      messages,
      userInput,
      loading,
      isExpanded,
      drawerStyle,
      chatContentRef,
      showQuickActions,
      quickActions,
      close,
      startDrag,
      sendQuickAction,
      sendMessage,
      formatMessage
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
  font-weight: 600;
  font-size: 16px;
}

.ai-icon {
  font-size: 20px;
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
