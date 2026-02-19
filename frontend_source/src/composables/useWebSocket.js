import { ref, onMounted, onUnmounted } from 'vue'
import { CONFIG } from '../utils/config.js'

let ws = null
let wsTimer = null
let hbTimer = null
let messageHandlers = []
let currentToken = null  // 记录当前连接的 token

export function useWebSocket() {
    const isConnected = ref(false)
    
    const connect = (force = false) => {
        const token = localStorage.getItem('token')
        if (!token) return
        
        // 如果 token 变了，强制重连
        if (currentToken && currentToken !== token) {
            console.log('[WebSocket] Token 变更，强制重连')
            force = true
        }
        
        if (!force && ws?.readyState === WebSocket.CONNECTING) return
        if (!force && ws?.readyState === WebSocket.OPEN) return
        
        // 清理旧连接
        if (ws) {
            ws.onclose = null
            ws.close()
        }
        
        currentToken = token
        
        try {
            ws = new WebSocket(CONFIG.WS_URL)
            
            ws.onopen = () => {
                console.log('[WebSocket] 已连接')
                isConnected.value = true
                ws.send(JSON.stringify({ type: 'auth', token }))
            }
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data)
                    console.log('[WebSocket] 收到消息:', data.type)
                    // 分发消息给所有处理器
                    messageHandlers.forEach(handler => {
                        try {
                            handler(data)
                        } catch (e) {
                            console.error('[WebSocket] 处理器错误:', e)
                        }
                    })
                } catch (e) {
                    console.log('[WebSocket] 消息解析失败:', event.data)
                }
            }
            
            ws.onclose = (e) => {
                console.log('[WebSocket] 断开:', e.code)
                isConnected.value = false
                if (e.code === 1008) {
                    // 认证失败
                    localStorage.removeItem('token')
                    window.location.href = '/'
                    return
                }
                // 延迟重连（使用当前最新的 token）
                if (!wsTimer) {
                    wsTimer = setTimeout(() => {
                        wsTimer = null
                        const latestToken = localStorage.getItem('token')
                        if (latestToken && latestToken !== currentToken) {
                            currentToken = latestToken  // 更新 token
                        }
                        connect()
                    }, 3000)
                }
            }
            
            ws.onerror = (e) => {
                console.log('[WebSocket] 错误:', e)
            }
        } catch (e) {
            console.error('[WebSocket] 连接失败:', e)
        }
    }
    
    const disconnect = () => {
        clearTimeout(wsTimer)
        clearInterval(hbTimer)
        if (ws) {
            ws.onclose = null
            ws.close()
            ws = null
        }
        isConnected.value = false
        currentToken = null
        messageHandlers = []  // 清除所有处理器
    }
    
    const send = (data) => {
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(data))
            return true
        }
        return false
    }
    
    const onMessage = (handler) => {
        messageHandlers.push(handler)
        // 返回取消订阅函数
        return () => {
            const index = messageHandlers.indexOf(handler)
            if (index > -1) {
                messageHandlers.splice(index, 1)
            }
        }
    }
    
    // 页面可见性变化处理
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            console.log('[WebSocket] 页面可见，检查连接...')
            if (!ws || ws.readyState !== WebSocket.OPEN) {
                connect()
            }
        }
    }
    
    onMounted(() => {
        connect()
        // 心跳
        hbTimer = setInterval(() => {
            send({ type: 'ping' })
        }, 30000)
        // 监听页面可见性
        document.addEventListener('visibilitychange', handleVisibilityChange)
    })
    
    onUnmounted(() => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        // 注意：不要在这里 disconnect，因为是全局单例
    })
    
    return {
        isConnected,
        connect,
        disconnect,
        send,
        onMessage
    }
}
