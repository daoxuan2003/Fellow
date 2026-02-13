// ============================================
// 底部导航栏组件
// 除了登录注册页，其他页面都引入这个文件
// ============================================

// 简单的 toast 提示函数
function showNavToast(message) {
    // 优先使用 Vue 实例的 showToast（如果存在）
    const vueApp = document.querySelector('#app')?.__vue_app__;
    if (vueApp && vueApp.config.globalProperties.showToast) {
        vueApp.config.globalProperties.showToast(message);
        return;
    }
    
    // 尝试调用全局 showToast
    if (typeof showToast === 'function') {
        showToast(message);
        return;
    }
    
    // 尝试通过 Vue 组件实例调用
    const appDiv = document.getElementById('app');
    if (appDiv && appDiv._vue_vm) {
        appDiv._vue_vm.showToast(message);
        return;
    }
    
    // 降级方案：创建简单的 toast
    let toast = document.getElementById('nav-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'nav-toast';
        toast.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            transition: opacity 0.3s;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 2000);
}

// 导航配置
const NAV_CONFIG = [
    {
        id: 'home',
        label: '首页',
        href: './home.html',
        icon: `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`
    },
    {
        id: 'album',
        label: '相册',
        href: '#',
        icon: `<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>`,
        onClick: () => showNavToast('相册功能开发中')
    },
    {
        id: 'wish',
        label: '心愿',
        href: '#',
        icon: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>`,
        onClick: () => showNavToast('心愿墙功能开发中')
    },
    {
        id: 'profile',
        label: '我的',
        href: './profile.html',
        icon: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`
    }
];

// 插入导航栏
function insertBottomNav() {
    // 获取当前页面文件名
    const currentPage = window.location.pathname.split('/').pop() || 'home.html';
    
    // 创建导航元素
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    
    // 生成导航项
    nav.innerHTML = NAV_CONFIG.map(item => {
        const isActive = currentPage === item.href || 
                        (item.id === 'home' && (currentPage === 'home.html' || currentPage === '')) ||
                        (item.id === 'profile' && currentPage === 'profile.html');
        
        const activeClass = isActive ? 'active' : '';
        const clickHandler = item.onClick ? `onclick="event.preventDefault(); (${item.onClick})()"` : '';
        
        return `
            <a href="${item.href}" class="nav-item ${activeClass}" ${clickHandler} data-nav-id="${item.id}">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${item.icon}
                </svg>
                <span class="nav-label">${item.label}</span>
            </a>
        `;
    }).join('');
    
    // 插入到 body 末尾
    document.body.appendChild(nav);
    
    // 调整 main 的 padding-bottom，避免被导航栏遮挡
    const main = document.querySelector('.main');
    if (main) {
        main.style.paddingBottom = '100px';
    }
}

// 页面加载完成后插入导航
document.addEventListener('DOMContentLoaded', insertBottomNav);
