import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

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
        path: '/express',
        name: 'Express',
        component: () => import('../views/Express.vue')
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
        // 公开页面
        if (token && to.path === '/') {
            // 有 token 直接跳转到 home，让页面自己获取数据
            next('/home')
        } else {
            next()
        }
    } else {
        // 需要登录
        if (!token) {
            next('/')
        } else {
            // 有 token 允许访问，页面自己处理数据获取
            next()
        }
    }
})

export default router
