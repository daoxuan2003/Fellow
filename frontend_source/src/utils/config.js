// API 配置
import { getVersionSync } from './version.js'

const hostname = window.location.hostname
const port = window.location.port
const protocol = window.location.protocol

// 是否为本地开发（localhost 或 127.0.0.1）
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1'

// 是否为局域网开发（192.168.x.x 或 10.x.x.x）
const isLanDev = hostname.startsWith('192.168.') || hostname.startsWith('10.')

// 是否为生产环境（非本地、非局域网）
const isProduction = !isLocalhost && !isLanDev

const baseUrl = protocol + '//' + hostname + (port ? ':' + port : '')

// API 和 WebSocket 地址配置
let apiUrl, wsUrl

if (isProduction) {
    // 生产环境：走 Nginx 代理
    apiUrl = baseUrl + '/api'
    wsUrl = 'wss://' + hostname + '/ws/'
} else if (isLanDev) {
    // 局域网开发：使用当前 IP + 后端端口
    apiUrl = 'http://' + hostname + ':3000/api'
    wsUrl = 'ws://' + hostname + ':3001'
} else {
    // 本地开发：使用 localhost
    apiUrl = 'http://localhost:3000/api'
    wsUrl = 'ws://localhost:3001'
}

export const CONFIG = {
    isProduction,
    API_URL: apiUrl,
    WS_URL: wsUrl,
    DOMAIN: baseUrl,
    // 版本号从 version.json 统一管理
    get VERSION() {
        return getVersionSync()
    }
}
