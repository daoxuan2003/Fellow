/**
 * 前端全局配置文件
 * 
 * 根据当前访问的域名自动切换环境：
 * - 本地开发：localhost / 127.0.0.1
 * - 生产环境：你的域名
 * 
 * 注意：生产环境WebSocket也走Nginx代理（统一使用443端口），
 * 这样不需要为3001端口单独配置SSL证书
 */

(function() {
    'use strict';
    
    // 获取当前协议、域名和端口
    const protocol = window.location.protocol;  // 'http:' 或 'https:'
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // 判断是否为生产环境（非本地地址）
    const isProduction = hostname !== 'localhost' 
        && hostname !== '127.0.0.1'
        && !hostname.startsWith('192.168.')
        && !hostname.startsWith('10.');
    
    // 构建基础URL
    const baseUrl = protocol + '//' + hostname + (port ? ':' + port : '');
    
    // 配置对象
    const CONFIG = {
        // 是否为生产环境
        isProduction: isProduction,
        
        // API 基础地址
        API_URL: isProduction 
            ? baseUrl + '/api'           // 生产环境：使用当前域名/api
            : 'http://localhost:3000/api', // 开发环境
        
        // WebSocket 地址
        // 生产环境也走Nginx代理（wss://域名/ws/），不需要单独开放3001端口
        WS_URL: isProduction
            ? 'wss://' + hostname + '/ws/'  // 生产：Nginx代理WebSocket
            : 'ws://localhost:3001',         // 开发：直接连后端
        
        // 当前域名
        DOMAIN: baseUrl
    };
    
    // 暴露到全局
    window.CONFIG = CONFIG;
    
    // 控制台提示当前环境
    console.log('当前环境:', isProduction ? '生产环境' : '开发环境');
    console.log('API地址:', CONFIG.API_URL);
    console.log('WebSocket:', CONFIG.WS_URL);
})();
