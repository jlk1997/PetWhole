import { defineStore } from 'pinia'
import { userApi } from '@/utils/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || null,
    userInfo: JSON.parse(uni.getStorageSync('userInfo') || 'null'),
    loading: false,
    userStats: null,
    followingUsers: [],
    followerUsers: [],
    error: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token && !!state.userInfo,
    userId: (state) => state.userInfo?._id || null,
    username: (state) => state.userInfo?.username || '',
    nickname: (state) => state.userInfo?.nickname || state.userInfo?.username || '',
    avatar: (state) => state.userInfo?.avatar || '/static/images/default-avatar.png'
  },
  
  actions: {
    // 注册新用户
    async register(userData) {
      try {
        this.loading = true
        this.error = null
        const response = await userApi.register(userData)
        
        // 检查响应格式
        if (!response || !response.token) {
          throw new Error('注册失败：响应中没有包含token')
        }
        
        // 保存token和用户信息
        this.token = response.token
        this.userInfo = {
          _id: response._id,
          username: response.username,
          email: response.email,
          nickname: response.nickname,
          avatar: response.avatar
        }
        
        // 保存到本地存储
        uni.setStorageSync('token', this.token)
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
        
        return this.userInfo
      } catch (error) {
        this.error = error.message || '注册失败'
        console.error('注册失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 用户登录
    async login(credentials) {
      try {
        this.loading = true
        this.error = null
        
        // 发出登录请求
        const response = await userApi.login(credentials)
        
        console.log('登录响应:', response)
        
        // 检查响应格式
        if (!response || !response.token) {
          throw new Error('登录失败：响应中没有包含token')
        }
        
        // 保存token和用户信息
        this.token = response.token
        this.userInfo = {
          _id: response._id,
          username: response.username,
          email: response.email,
          nickname: response.nickname,
          avatar: response.avatar
        }
        
        // 保存到本地存储
        uni.setStorageSync('token', this.token)
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
        
        return this.userInfo
      } catch (error) {
        this.error = error.message || '登录失败'
        console.error('登录失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 获取当前用户信息
    async getUserInfo() {
      // 如果已经有用户信息且不是强制刷新，则直接返回
      if (this.userInfo) {
        return this.userInfo
      }
      
      try {
        this.loading = true
        this.error = null
        
        const response = await userApi.getUserInfo()
        
        // 检查响应格式
        if (!response) {
          throw new Error('获取用户信息失败：无效的响应')
        }
        
        this.userInfo = response
        
        // 更新本地存储
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
        
        return this.userInfo
      } catch (error) {
        this.error = error.message || '获取用户信息失败'
        console.error('获取用户信息失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
    
    // 退出登录
    logout() {
      // 清除状态
      this.token = null
      this.userInfo = null
      this.userStats = null
      
      // 清除本地存储
      uni.removeStorageSync('token')
      uni.removeStorageSync('userInfo')
      
      // 跳转到登录页
      uni.reLaunch({
        url: '/pages/login/login'
      })
    },
    
    // 获取用户统计信息
    async fetchUserStats() {
      if (!this.isLoggedIn) return null
      
      try {
        this.loading = true
        const response = await userApi.getUserStats()
        this.userStats = response
        return response
      } catch (error) {
        console.error('获取用户统计信息失败:', error)
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 获取用户关注列表
    async fetchFollowing() {
      if (!this.isLoggedIn) return []
      
      try {
        this.loading = true
        const response = await userApi.getFollowing()
        this.followingUsers = response
        return response
      } catch (error) {
        console.error('获取关注列表失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 获取用户粉丝列表
    async fetchFollowers() {
      if (!this.isLoggedIn) return []
      
      try {
        this.loading = true
        const response = await userApi.getFollowers()
        this.followerUsers = response
        return response
      } catch (error) {
        console.error('获取粉丝列表失败:', error)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 上传用户头像
    async uploadAvatar(filePath) {
      try {
        this.loading = true
        const response = await userApi.uploadAvatar(filePath)
        
        // 更新用户信息中的头像
        if (this.userInfo) {
          this.userInfo.avatar = response.avatar
          uni.setStorageSync('userInfo', JSON.stringify(this.userInfo))
        }
        
        return response
      } catch (error) {
        console.error('上传头像失败:', error)
        throw error
      } finally {
        this.loading = false
      }
    }
  }
}) 