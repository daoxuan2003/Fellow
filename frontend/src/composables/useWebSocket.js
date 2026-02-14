import { ref, onMounted, onUnmounted } from 'vue'
import CONFIG from '../config'

let ws = null
let wsTimer = null
let hbTimer = null
let messageHandlers = []

export function useWebSocket() {
    const isConnected = ref(false)
    
    const connect = () => {
        const token = localStorage.getItem('token')
        if (!token) return
        if (ws?.readyState === WebSocket.CONNECTING) return
        
        // 清理旧连接
        if (ws) {
            ws.onclose = null
            ws.close()
        }
        
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
                // 延迟重连
                if (!wsTimer) {
                    wsTimer = setTimeout(() => {
                        wsTimer = null
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
