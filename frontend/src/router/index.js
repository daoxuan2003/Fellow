import { createRouter, createWebHistory } from 'vue-router'

const routes = [
    {
        path: '/',
        name: 'Login',
        component: () => import('../views/Login.vue'),
        meta: { public: true }
    },
    {
        path: '/home',
        name: 'Home',
        component: () => import('../views/Home.vue')
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue')
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
    const token = localStorage.getItem('token')
    
    if (to.meta.public) {
        // 公开页面，已登录则跳首页
        if (token && to.path === '/') {
            next('/home')
        } else {
            next()
        }
    } else {
        // 需要登录
        if (!token) {
            next('/')
        } else {
            next()
        }
    }
})

export default router