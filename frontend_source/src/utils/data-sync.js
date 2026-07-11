/**
 * 数据同步管理器
 * 解决 PWA 实时更新问题
 */

import { ref, readonly } from 'vue'
import { createClientLogger } from './client-logger.js'

const logger = createClientLogger('DataSync')

// 全局状态缓存（内存级，比 HTTP 缓存更快更可控）
const cache = new Map()
const subscribers = new Map()

// 最后更新时间
const lastUpdateTime = ref(Date.now())

/**
 * 生成缓存键
 */
function getCacheKey(endpoint, params = {}) {
    const paramsStr = Object.keys(params).length > 0 
        ? '?' + new URLSearchParams(params).toString() 
        : ''
    return endpoint + paramsStr
}

/**
 * 获取数据（带内存缓存）
 * @param {string} endpoint - API 端点
 * @param {Object} options - 配置选项
 * @param {boolean} options.forceRefresh - 强制刷新
 * @param {number} options.maxAge - 缓存最大年龄（毫秒）
 */
export async function fetchWithSync(endpoint, options = {}) {
    const { forceRefresh = false, maxAge = 5000, ...fetchOptions } = options
    const cacheKey = getCacheKey(endpoint, options.params)
    const now = Date.now()
    
    // 检查内存缓存
    const cached = cache.get(cacheKey)
    if (!forceRefresh && cached && (now - cached.timestamp < maxAge)) {
        logger.debug('使用内存缓存', { endpoint })
        return cached.data
    }
    
    // 发起请求（禁用 HTTP 缓存）
    try {
        const res = await fetch(endpoint, {
            ...fetchOptions,
            cache: 'no-store',
            headers: {
                ...fetchOptions.headers,
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        })
        
        if (!res.ok) {
            // 网络失败时回退缓存
            if (cached) {
                logger.debug('网络失败，使用旧缓存', { endpoint })
                return cached.data
            }
            throw new Error(`HTTP ${res.status}`)
        }
        
        const data = await res.json()
        
        // 更新内存缓存
        cache.set(cacheKey, {
            data,
            timestamp: now
        })
        
        lastUpdateTime.value = now
        
        // 通知订阅者
        notifySubscribers(endpoint, data)
        
        return data
    } catch (error) {
        logger.error('获取失败', { endpoint, error })
        throw error
    }
}

/**
 * 订阅数据更新
 */
export function subscribeToData(endpoint, callback) {
    if (!subscribers.has(endpoint)) {
        subscribers.set(endpoint, new Set())
    }
    subscribers.get(endpoint).add(callback)
    
    // 返回取消订阅函数
    return () => {
        subscribers.get(endpoint)?.delete(callback)
    }
}

/**
 * 通知订阅者数据更新
 */
function notifySubscribers(endpoint, data) {
    const callbacks = subscribers.get(endpoint)
    if (callbacks) {
        callbacks.forEach(cb => {
            try {
                cb(data)
            } catch (e) {
                logger.error('订阅者错误', e)
            }
        })
    }
}

/**
 * 清除特定端点的缓存
 */
export function invalidateCache(endpoint) {
    if (endpoint) {
        // 清除匹配该端点的所有缓存
        for (const key of cache.keys()) {
            if (key.startsWith(endpoint)) {
                cache.delete(key)
                logger.debug('清除缓存', { key })
            }
        }
    } else {
        // 清除所有缓存
        cache.clear()
        logger.debug('清除所有缓存')
    }
}

/**
 * 页面可见性变化时刷新数据
 */
export function setupVisibilityRefresh(refreshCallbacks) {
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
            logger.debug('页面可见，刷新数据')
            // 清除缓存，强制刷新
            invalidateCache()
            // 执行所有刷新回调
            refreshCallbacks.forEach(cb => {
                try {
                    cb()
                } catch (e) {
                    logger.error('刷新回调错误', e)
                }
            })
        }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    // 返回清理函数
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
}

/**
 * 创建响应式数据引用
 */
export function createSyncedRef(endpoint, fetcher) {
    const data = ref(null)
    const loading = ref(false)
    const error = ref(null)
    
    const refresh = async (force = false) => {
        loading.value = true
        error.value = null
        
        try {
            const result = await fetchWithSync(endpoint, { forceRefresh: force })
            data.value = result
        } catch (e) {
            error.value = e
        } finally {
            loading.value = false
        }
    }
    
    // 订阅数据更新
    subscribeToData(endpoint, (newData) => {
        data.value = newData
    })
    
    return {
        data: readonly(data),
        loading: readonly(loading),
        error: readonly(error),
        refresh
    }
}

export { lastUpdateTime }
