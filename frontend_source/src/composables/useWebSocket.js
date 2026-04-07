import { ref, onMounted, onUnmounted } from 'vue'
import { CONFIG } from '../utils/config.js'

// WebSocket 全局状态
let ws = null
let reconnectTimer = null
let heartbeatTimer = null
let currentToken = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10
const RECONNECT_INTERVAL = 3000
const HEARTBEAT_INTERVAL = 25000

// 消息处理器集合（使用 Set 避免重复）
const messageHandlers = new Set()

// 连接状态（响应式）
const isConnected = ref(false)
const lastPingTime = ref(Date.now())

/**
 * 连接 WebSocket
 */
function connect() {
    const token = localStorage.getItem('token')
    if (!token) {
        console.log('[WS] 无 token，跳过连接')
        return
    }
    
    // 避免重复连接
    if (ws?.readyState === WebSocket.CONNECTING) {
        console.log('[WS] 正在连接中...')
        return
    }
    if (ws?.readyState === WebSocket.OPEN) {
        console.log('[WS] 已连接')
        return
    }
    
    console.log('[WS] 开始连接...')
    currentToken = token
    
    try {
        ws = new WebSocket(CONFIG.WS_URL)
        
        ws.onopen = () => {
            console.log('[WS] 连接成功')
            isConnected.value = true
            reconnectAttempts = 0
            lastPingTime.value = Date.now()
            
            // 发送认证消息
            send({ type: 'auth', token: currentToken })
            
            // 启动心跳
            startHeartbeat()
        }
        
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                
                // 处理心跳响应
                if (data.type === 'pong') {
                    lastPingTime.value = Date.now()
                    return
                }
                
                console.log('[WS] 收到消息:', data.type, data)
                
                // 分发消息给所有处理器
                messageHandlers.forEach(handler => {
                    try {
                        handler(data)
                    } catch (e) {
                        console.error('[WS] 处理器错误:', e)
                    }
                })
            } catch (e) {
                console.log('[WS] 消息解析失败:', event.data)
            }
        }
        
        ws.onclose = (e) => {
            console.log('[WS] 连接关闭:', e.code, e.reason)
            isConnected.value = false
            stopHeartbeat()
            
            // 认证失败，不重连
            if (e.code === 1008) {
                console.log('[WS] 认证失败，清除 token')
                localStorage.removeItem('token')
                window.location.href = '/'
                return
            }
            
            // 其他情况自动重连
            scheduleReconnect()
        }
        
        ws.onerror = (e) => {
            console.error('[WS] 连接错误:', e)
        }
        
    } catch (e) {
        console.error('[WS] 创建连接失败:', e)
        scheduleReconnect()
    }
}

/**
 * 计划重连
 */
function scheduleReconnect() {
    if (reconnectTimer) return
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log('[WS] 重连次数过多，停止重连')
        return
    }
    
    reconnectAttempts++
    console.log(`[WS] ${RECONNECT_INTERVAL}ms 后重连 (第 ${reconnectAttempts} 次)`)
    
    reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connect()
    }, RECONNECT_INTERVAL)
}

/**
 * 启动心跳
 */
function startHeartbeat() {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
        if (ws?.readyState === WebSocket.OPEN) {
            // 检查上次 pong 时间，如果超过 60 秒没有响应，认为连接已死
            if (Date.now() - lastPingTime.value > 60000) {
                console.log('[WS] 心跳超时，关闭连接')
                ws.close()
                return
            }
            send({ type: 'ping' })
        }
    }, HEARTBEAT_INTERVAL)
}

/**
 * 停止心跳
 */
function stopHeartbeat() {
    if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
    }
}

/**
 * 发送消息
 */
function send(data) {
    if (ws?.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify(data))
            return true
        } catch (e) {
            console.error('[WS] 发送失败:', e)
        }
    }
    return false
}

/**
 * 断开连接（仅用于退出登录等场景）
 */
function disconnect() {
    console.log('[WS] 主动断开连接')
    stopHeartbeat()
    
    if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
    }
    
    if (ws) {
        ws.onclose = null  // 移除监听，避免触发重连
        ws.close()
        ws = null
    }
    
    isConnected.value = false
    currentToken = null
    reconnectAttempts = 0
    // 注意：不要清除 messageHandlers，因为其他组件可能还在使用
}

/**
 * Vue composable
 */
export function useWebSocket() {
    // 订阅消息
    const onMessage = (handler) => {
        messageHandlers.add(handler)
        console.log('[WS] 添加消息处理器，当前数量:', messageHandlers.size)
        
        // 返回取消订阅函数
        return () => {
            messageHandlers.delete(handler)
            console.log('[WS] 移除消息处理器，当前数量:', messageHandlers.size)
        }
    }
    
    // 页面可见性变化处理
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            console.log('[WS] 页面可见，检查连接状态:', ws?.readyState)
            // 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
            if (!ws || ws.readyState === WebSocket.CLOSED) {
                console.log('[WS] 连接已关闭，重新连接')
                connect()
            } else if (ws.readyState === WebSocket.CLOSING) {
                console.log('[WS] 连接正在关闭，等待重连')
            }
        }
    }
    
    onMounted(() => {
        console.log('[WS] 组件挂载，确保连接')
        connect()
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })
    
    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        // 不要在这里调用 disconnect，因为是全局单例
    })
    
    return {
        isConnected,
        connect,
        disconnect,
        send,
        onMessage
    }
}
