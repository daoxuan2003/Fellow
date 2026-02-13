/**
 * 前端全局配置文件
 * 
 * 根据当前访问的域名自动切换环境：
 * - 本地开发：localhost / 127.0.0.1
 * - 生产环境：你的域名
 */

(function() {
    'use strict';
    
    // 获取当前域名
    const hostname = window.location.hostname;
    
    // 判断是否为生产环境（非本地地址）
    const isProduction = hostname !== 'localhost' 
        && hostname !== '127.0.0.1'
        && !hostname.startsWith('192.168.')  // 局域网IP也视为开发环境
        && !hostname.startsWith('10.');
    
    // 配置对象
    const CONFIG = {
        // 是否为生产环境
        isProduction: isProduction,
        
        // API 基础地址
        API_URL: isProduction 
            ? 'https://phd-jdx2023.top/api'      // 生产环境
            : 'http://localhost:3000/api',       // 开发环境
        
        // WebSocket 地址
        WS_URL: isProduction
            ? 'wss://phd-jdx2023.top:3001'       // 生产环境（注意是wss）
            : 'ws://localhost:3001',             // 开发环境
        
        // 当前域名
        DOMAIN: isProduction 
            ? 'https://phd-jdx2023.top' 
            : 'http://localhost'
    };
    
    // 暴露到全局
    window.CONFIG = CONFIG;
    
    // 控制台提示当前环境
    console.log('当前环境:', isProduction ? '生产环境' : '开发环境');
    console.log('API地址:', CONFIG.API_URL);
    console.log('WebSocket:', CONFIG.WS_URL);
})();
