import { defineStore } from 'pinia'

/**
 * 用户状态管理
 * 
 * 优化策略：
 * 1. 缓存用户数据，避免每次切换页面都重新获取
 * 2. 头像 URL 缓存，避免重复加载
 * 3. 支持强制刷新和后台刷新
 * 4. 按用户ID区分缓存，避免切换账号时数据混乱
 */

// 从 localStorage 安全获取数据
const getStoredUserId = () => {
  try {
    return localStorage.getItem('currentUserId')
  } catch {
    return null
  }
}

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    partner: null,
    userId: getStoredUserId(),  // 当前用户ID
    token: localStorage.getItem('token'),
    lastFetchTime: 0,  // 上次获取数据的时间
    isLoading: false,  // 是否正在加载
  }),

  getters: {
    isLoggedIn: (state) => !!state.token,
    currentUser: (state) => state.user,
    currentPartner: (state) => state.partner,
    currentUserId: (state) => state.userId,
    
    // 判断数据是否需要刷新（超过5分钟视为过期，或用户ID不匹配）
    isDataStale: (state) => {
      if (!state.lastFetchTime) return true
      if (!state.user) return true
      // 检查缓存是否属于当前用户
      const storedUserId = getStoredUserId()
      if (storedUserId && state.userId !== storedUserId) return true
      const fiveMinutes = 5 * 60 * 1000
      return Date.now() - state.lastFetchTime > fiveMinutes
    },
    
    // 判断缓存是否属于指定用户
    isCacheForUser: (state) => (userId) => {
      return state.userId === userId && state.user?.id === userId
    },
    
    // 获取用户头像（优先使用缓存）
    userAvatarUrl: (state) => {
      return state.user?.avatarUrl || state.user?.avatar || null
    },
    
    // 获取伴侣头像
    partnerAvatarUrl: (state) => {
      return state.partner?.avatarUrl || state.partner?.avatar || null
    }
  },

  actions: {
    setUser(user) {
      this.user = user
      if (user?.id) {
        this.userId = user.id
        localStorage.setItem('currentUserId', user.id)
      }
    },
    
    setPartner(partner) {
      this.partner = partner
    },

    setToken(token) {
      this.token = token
      localStorage.setItem('token', token)
    },

    clearUser() {
      this.user = null
      this.partner = null
      this.userId = null
      this.token = null
      this.lastFetchTime = 0
      localStorage.removeItem('token')
      localStorage.removeItem('currentUserId')
    },
    
    /**
     * 更新用户数据（同时更新时间戳和用户ID）
     */
    updateUserData(user, partner = null) {
      this.user = user
      if (user?.id) {
        this.userId = user.id
        localStorage.setItem('currentUserId', user.id)
      }
      if (partner !== undefined) {
        this.partner = partner
      }
      this.lastFetchTime = Date.now()
    },
    
    /**
     * 更新头像 URL（不触发整体刷新）
     */
    updateAvatar(url, isPartner = false) {
      if (isPartner) {
        if (this.partner) {
          this.partner.avatarUrl = url
          this.partner.avatar = url
        }
      } else {
        if (this.user) {
          this.user.avatarUrl = url
          this.user.avatar = url
        }
      }
    },
    
    /**
     * 设置加载状态
     */
    setLoading(loading) {
      this.isLoading = loading
    },
    
    /**
     * 强制数据过期（下次进入页面会刷新）
     */
    invalidateCache() {
      this.lastFetchTime = 0
    }
  }
})
