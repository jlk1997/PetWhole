import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    currentLocation: null,
    nearbyUsers: [],
    isTracking: false,
    pathHistory: [],
    recordingStart: null,
    currentDistance: 0,
    currentDuration: '00:00',
    currentSpeed: 0,
  }),
  
  getters: {
    getCurrentLocation: (state) => state.currentLocation,
    getNearbyUsers: (state) => state.nearbyUsers,
    isRecording: (state) => state.isTracking,
    getPathHistory: (state) => state.pathHistory,
    getRecordingStats: (state) => ({
      distance: state.currentDistance,
      duration: state.currentDuration,
      speed: state.currentSpeed
    })
  },
  
  actions: {
    // 设置当前位置
    setCurrentLocation(location) {
      this.currentLocation = location
      
      // 如果正在记录轨迹，添加到轨迹历史
      if (this.isTracking && location) {
        this.addLocationToPath(location)
      }
    },
    
    // 设置附近用户
    setNearbyUsers(users) {
      this.nearbyUsers = users
    },
    
    // 开始记录轨迹
    startTracking() {
      this.isTracking = true
      this.pathHistory = []
      this.recordingStart = Date.now()
      this.currentDistance = 0
      this.currentDuration = '00:00'
      this.currentSpeed = 0
      
      // 如果已有当前位置，添加为起点
      if (this.currentLocation) {
        this.addLocationToPath(this.currentLocation)
      }
    },
    
    // 结束记录轨迹
    stopTracking() {
      this.isTracking = false
      const recordData = {
        path: this.pathHistory,
        startTime: this.recordingStart,
        endTime: Date.now(),
        distance: this.currentDistance,
        duration: this.currentDuration
      }
      
      // 返回记录数据，用于保存
      return recordData
    },
    
    // 添加位置点到轨迹
    addLocationToPath(location) {
      // 添加新位置点
      this.pathHistory.push(location)
      
      // 计算与上一个点的距离
      if (this.pathHistory.length > 1) {
        const prevLocation = this.pathHistory[this.pathHistory.length - 2]
        const distance = this.calculateDistance(
          prevLocation.latitude,
          prevLocation.longitude,
          location.latitude,
          location.longitude
        )
        
        this.currentDistance += distance
        
        // 计算持续时间
        const duration = Date.now() - this.recordingStart
        const minutes = Math.floor(duration / 60000)
        const seconds = Math.floor((duration % 60000) / 1000)
        this.currentDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        
        // 计算速度 (km/h)
        const durationHours = duration / 1000 / 3600
        this.currentSpeed = durationHours > 0 ? (this.currentDistance / durationHours).toFixed(1) : 0
      }
    },
    
    // 计算两个坐标点之间的距离（公里）
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371 // 地球半径（公里）
      const dLat = this.deg2rad(lat2 - lat1)
      const dLon = this.deg2rad(lon2 - lon1)
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
        Math.sin(dLon/2) * Math.sin(dLon/2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
      return R * c
    },
    
    // 角度转弧度
    deg2rad(deg) {
      return deg * (Math.PI/180)
    },
    
    // 清空记录数据
    clearTrackingData() {
      this.pathHistory = []
      this.recordingStart = null
      this.currentDistance = 0
      this.currentDuration = '00:00'
      this.currentSpeed = 0
    }
  },
}) 