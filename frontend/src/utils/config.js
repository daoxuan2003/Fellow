// API 配置
const hostname = window.location.hostname
const port = window.location.port
const protocol = window.location.protocol

const isProduction = hostname !== 'localhost' 
    && hostname !== '127.0.0.1'
    && !hostname.startsWith('192.168.')
    && !hostname.startsWith('10.')

const baseUrl = protocol + '//' + hostname + (port ? ':' + port : '')

export const CONFIG = {
    isProduction,
    API_URL: isProduction ? baseUrl + '/api' : 'http://localhost:3000/api',
    WS_URL: isProduction ? 'wss://' + hostname + '/ws/' : 'ws://localhost:3001',
    DOMAIN: baseUrl
}