import { defineStore } from 'pinia'
import { walk } from '@/utils/api'
import { useUserStore } from './user'
import { usePetStore } from './pet'

export const useWalkStore = defineStore('walk', {
  state: () => ({
    walkRecords: [],
    currentWalk: null,
    isWalking: false,
    recordingPath: [], // 记录遛狗路径
    recordingDuration: 0, // 记录遛狗时长(秒)
    recordingDistance: 0, // 记录遛狗距离(米)
    startTime: null, // 开始时间
    timer: null, // 计时器
    loading: false,
    error: null,
    stats: null, // 用户的遛狗统计
    totalRecords: 0,
    page: 1,
    limit: 10,
    hasMore: true,
    nearbyWalks: [] // 附近的遛狗记录
  }),

  getters: {
    // 格式化的遛狗时长
    formattedDuration() {
      const seconds = this.recordingDuration
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const remainingSeconds = seconds % 60
      
      const formatNumber = (num) => (num < 10 ? `0${num}` : num)
      
      return `${formatNumber(hours)}:${formatNumber(minutes)}:${formatNumber(remainingSeconds)}`
    },
    
    // 格式化的遛狗距离
    formattedDistance() {
      if (this.recordingDistance < 1000) {
        return `${this.recordingDistance.toFixed(0)}米`
      } else {
        return `${(this.recordingDistance / 1000).toFixed(2)}公里`
      }
    },
    
    // 平均速度(米/秒)
    averageSpeed() {
      if (this.recordingDuration <= 0) return 0
      return this.recordingDistance / this.recordingDuration
    },
    
    // 格式化的平均速度
    formattedSpeed() {
      const speed = this.averageSpeed
      if (speed < 0.01) return '0.00 米/秒'
      return `${speed.toFixed(2)} 米/秒`
    },
    
    // 卡路里消耗(约5.5卡路里/公里)
    caloriesBurned() {
      return (this.recordingDistance / 1000) * 5.5
    },
    
    // 格式化的卡路里消耗
    formattedCalories() {
      return `${this.caloriesBurned.toFixed(1)} 卡路里`
    }
  },

  actions: {
    // 获取遛狗记录列表
    async fetchWalkRecords(params = {}) {
      try {
        this.loading = true
        this.error = null
        
        const queryParams = {
          page: params.page || this.page,
          limit: params.limit || this.limit,
          ...params
        }
        
        const response = await walk.getWalkRecords(queryParams)
        
        // 如果是第一页或者是刷新，直接替换列表
        if (queryParams.page === 1 || params.refresh) {
          this.walkRecords = response.data.records
        } else {
          // 追加到列表
          this.walkRecords = [...this.walkRecords, ...response.data.records]
        }
        
        this.totalRecords = response.data.total
        this.page = queryParams.page
        this.hasMore = this.walkRecords.length < this.totalRecords
        
        return response.data
      } catch (error) {
        console.error('获取遛狗记录失败:', error)
        this.error = '获取遛狗记录失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 加载更多遛狗记录
    async loadMoreWalkRecords(params = {}) {
      if (!this.hasMore || this.loading) return
      
      const nextPage = this.page + 1
      return this.fetchWalkRecords({ ...params, page: nextPage })
    },

    // 刷新遛狗记录列表
    async refreshWalkRecords(params = {}) {
      return this.fetchWalkRecords({ ...params, page: 1, refresh: true })
    },

    // 获取遛狗记录详情
    async fetchWalkRecordById(id) {
      try {
        this.loading = true
        this.error = null
        
        const response = await walk.getWalkRecordById(id)
        this.currentWalk = response.data
        
        return response.data
      } catch (error) {
        console.error('获取遛狗记录详情失败:', error)
        this.error = '获取遛狗记录详情失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 创建遛狗记录
    async createWalkRecord(walkData) {
      try {
        this.loading = true
        this.error = null
        
        const response = await walk.createWalkRecord(walkData)
        
        // 添加到列表开头
        this.walkRecords.unshift(response.data)
        
        // 重置当前记录
        this.resetCurrentRecording()
        
        // 更新用户统计
        await this.fetchUserWalkStats()
        
        return response.data
      } catch (error) {
        console.error('创建遛狗记录失败:', error)
        this.error = '创建遛狗记录失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新遛狗记录
    async updateWalkRecord(id, walkData) {
      try {
        this.loading = true
        this.error = null
        
        const response = await walk.updateWalkRecord(id, walkData)
        
        // 更新列表中的记录
        const index = this.walkRecords.findIndex(record => record._id === id)
        if (index !== -1) {
          this.walkRecords[index] = response.data
        }
        
        // 如果是当前查看的记录，更新currentWalk
        if (this.currentWalk && this.currentWalk._id === id) {
          this.currentWalk = response.data
        }
        
        return response.data
      } catch (error) {
        console.error('更新遛狗记录失败:', error)
        this.error = '更新遛狗记录失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 删除遛狗记录
    async deleteWalkRecord(id) {
      try {
        this.loading = true
        this.error = null
        
        await walk.deleteWalkRecord(id)
        
        // 从列表中移除记录
        this.walkRecords = this.walkRecords.filter(record => record._id !== id)
        
        // 如果是当前查看的记录，清除currentWalk
        if (this.currentWalk && this.currentWalk._id === id) {
          this.currentWalk = null
        }
        
        // 更新用户统计
        await this.fetchUserWalkStats()
        
        return true
      } catch (error) {
        console.error('删除遛狗记录失败:', error)
        this.error = '删除遛狗记录失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 上传遛狗照片
    async uploadWalkPhoto(walkId, filePath) {
      try {
        this.loading = true
        this.error = null
        
        const response = await walk.uploadWalkPhoto(walkId, filePath)
        
        // 更新记录数据
        await this.fetchWalkRecordById(walkId)
        
        return response.data
      } catch (error) {
        console.error('上传遛狗照片失败:', error)
        this.error = '上传遛狗照片失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取用户遛狗统计
    async fetchUserWalkStats(userId) {
      try {
        this.loading = true
        this.error = null
        
        const userStore = useUserStore()
        const id = userId || (userStore.user ? userStore.user._id : null)
        
        if (!id) {
          return null
        }
        
        const response = await walk.getUserWalkStats(id)
        this.stats = response.data
        
        return response.data
      } catch (error) {
        console.error('获取用户遛狗统计失败:', error)
        this.error = '获取用户遛狗统计失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 获取附近的遛狗记录
    async fetchNearbyWalks(params) {
      try {
        this.loading = true
        this.error = null
        
        const response = await walk.getNearbyWalks(params)
        this.nearbyWalks = response.data
        
        return response.data
      } catch (error) {
        console.error('获取附近遛狗记录失败:', error)
        this.error = '获取附近遛狗记录失败'
        return []
      } finally {
        this.loading = false
      }
    },

    // 开始记录遛狗
    startWalking() {
      // 检查是否已经在遛狗中
      if (this.isWalking) return
      
      this.isWalking = true
      this.recordingPath = []
      this.recordingDuration = 0
      this.recordingDistance = 0
      this.startTime = new Date()
      
      // 开始计时
      this.timer = setInterval(() => {
        this.recordingDuration += 1
      }, 1000)
    },

    // 停止记录遛狗
    stopWalking() {
      if (!this.isWalking) return
      
      this.isWalking = false
      
      // 停止计时
      if (this.timer) {
        clearInterval(this.timer)
        this.timer = null
      }
    },

    // 重置当前记录
    resetCurrentRecording() {
      this.stopWalking()
      this.recordingPath = []
      this.recordingDuration = 0
      this.recordingDistance = 0
      this.startTime = null
    },

    // 添加位置点到路径
    addPathPoint(point) {
      if (!this.isWalking) return
      
      // 添加点到路径
      this.recordingPath.push(point)
      
      // 计算距离
      if (this.recordingPath.length > 1) {
        const lastIndex = this.recordingPath.length - 1
        const prevPoint = this.recordingPath[lastIndex - 1]
        const currPoint = this.recordingPath[lastIndex]
        
        // 计算两点之间的距离
        const distance = this.calculateDistance(
          prevPoint.latitude, prevPoint.longitude,
          currPoint.latitude, currPoint.longitude
        )
        
        // 更新总距离
        this.recordingDistance += distance
      }
    },

    // 计算两点之间的距离(米)
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000 // 地球半径(米)
      const dLat = this.deg2rad(lat2 - lat1)
      const dLon = this.deg2rad(lon2 - lon1)
      
      const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const distance = R * c
      
      return distance
    },

    // 角度转弧度
    deg2rad(deg) {
      return deg * (Math.PI / 180)
    },

    // 保存当前遛狗记录
    async saveCurrentWalk() {
      try {
        if (this.recordingPath.length < 2) {
          throw new Error('遛狗路径太短，至少需要两个点')
        }
        
        // 获取当前宠物
        const petStore = usePetStore()
        if (!petStore.currentPet) {
          throw new Error('请先选择一个宠物')
        }
        
        // 准备数据
        const walkData = {
          petId: petStore.currentPet._id,
          path: this.recordingPath,
          distance: this.recordingDistance,
          duration: this.recordingDuration,
          startTime: this.startTime,
          endTime: new Date(),
          calories: this.caloriesBurned,
          averageSpeed: this.averageSpeed
        }
        
        // 创建记录
        return this.createWalkRecord(walkData)
      } catch (error) {
        console.error('保存遛狗记录失败:', error)
        this.error = error.message || '保存遛狗记录失败'
        throw error
      }
    },

    // 清空遛狗数据
    clearWalkData() {
      this.walkRecords = []
      this.currentWalk = null
      this.resetCurrentRecording()
      this.stats = null
      this.totalRecords = 0
      this.page = 1
      this.hasMore = true
      this.error = null
      this.nearbyWalks = []
    }
  }
}) 