import { defineStore } from 'pinia'
import api from '@/utils/api'

export const useLocationStore = defineStore('location', {
  state: () => ({
    currentLocation: null,
    nearbyUsers: [],
    loading: false,
    error: null,
    sharingEnabled: true,
    locationUpdateInterval: null
  }),
  
  getters: {
    hasLocation: (state) => !!state.currentLocation,
    getNearbyUsersList: (state) => state.nearbyUsers
  },
  
  actions: {
    // 更新当前位置
    async updateLocation(location) {
      try {
        this.loading = true;
        this.currentLocation = location;
        
        // 只有启用共享时才发送到服务器
        if (this.sharingEnabled) {
          await api.location.updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          });
        }
        
        return location;
      } catch (error) {
        console.error('更新位置失败:', error);
        this.error = '更新位置失败';
        throw error; // 将错误传递出去，让调用者可以处理
      } finally {
        this.loading = false;
      }
    },
    
    // 获取附近用户
    async getNearbyUsers(params = {}) {
      try {
        this.loading = true;
        
        // 即使位置共享关闭也允许获取附近用户
        // 如果当前没有位置信息，无法获取附近用户
        if (!this.currentLocation) {
          return { success: false, message: '没有位置信息' };
        }
        
        // 构建查询参数
        const queryParams = {
          latitude: this.currentLocation.latitude,
          longitude: this.currentLocation.longitude,
          maxDistance: params.maxDistance || 5000, // 默认5公里
          ...params
        };
        
        // 如果传入了params.latitude和params.longitude，优先使用传入的坐标
        const finalParams = {
          ...queryParams,
          latitude: params.latitude || queryParams.latitude,
          longitude: params.longitude || queryParams.longitude
        };
        
        console.log('获取附近用户，使用参数:', finalParams);
        
        const response = await api.location.getNearbyUsers(finalParams);
        
        if (response && response.success) {
          this.nearbyUsers = response.data || [];
          return response;
        } else {
          return { success: false, data: [], message: '获取附近用户失败' };
        }
      } catch (error) {
        console.error('获取附近用户失败:', error);
        this.error = '获取附近用户失败';
        return { success: false, data: [], message: error.message };
      } finally {
        this.loading = false;
      }
    },
    
    // 切换位置共享状态
    async toggleLocationSharing(enabled) {
      try {
        this.loading = true
        this.sharingEnabled = enabled
        
        // 尝试更新服务器的共享状态
        try {
          await api.location.toggleLocationSharing({
            enabled: this.sharingEnabled
          })
        } catch (apiError) {
          console.warn('更新服务器位置共享状态失败，仅在本地更新:', apiError)
          // 即使API调用失败，仍然在本地更新状态
        }
        
        return this.sharingEnabled
      } catch (error) {
        console.error('切换位置共享状态失败:', error)
        this.error = '切换位置共享状态失败'
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 获取位置共享状态
    async getLocationSharingStatus() {
      try {
        this.loading = true
        
        const response = await api.location.getLocationSharingStatus()
        this.sharingEnabled = response.data.enabled
        
        return this.sharingEnabled
      } catch (error) {
        console.error('获取位置共享状态失败:', error)
        this.error = '获取位置共享状态失败'
        return null
      } finally {
        this.loading = false
      }
    },
    
    // 启动位置更新
    startLocationUpdates(interval = 10000) {
      // 清除现有的计时器
      if (this.locationUpdateInterval) {
        clearInterval(this.locationUpdateInterval)
      }
      
      // 立即获取一次位置
      this.getUserLocation()
      
      // 设置计时器，定期更新位置
      this.locationUpdateInterval = setInterval(() => {
        this.getUserLocation()
      }, interval)
    },
    
    // 停止位置更新
    stopLocationUpdates() {
      if (this.locationUpdateInterval) {
        clearInterval(this.locationUpdateInterval)
        this.locationUpdateInterval = null
      }
    },
    
    // 获取用户位置
    getUserLocation() {
      return new Promise((resolve, reject) => {
        uni.getLocation({
          type: 'gcj02',
          success: (res) => {
            const location = {
              latitude: res.latitude,
              longitude: res.longitude,
              accuracy: res.accuracy,
              altitude: res.altitude,
              timestamp: new Date().toISOString()
            }
            
            this.updateLocation(location)
            resolve(location)
          },
          fail: (err) => {
            console.error('获取位置失败:', err)
            this.error = '获取位置失败'
            reject(err)
          }
        })
      })
    },
    
    // 清空位置数据
    clearLocationData() {
      this.stopLocationUpdates()
      this.currentLocation = null
      this.nearbyUsers = []
      this.error = null
    },
    
    // 获取用户宠物信息
    async getUserPets(userId) {
      try {
        this.loading = true;
        
        // 调用API获取用户宠物信息
        const response = await uni.request({
          url: `${uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000'}/api/pets/user/${userId}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${uni.getStorageSync('token')}`
          }
        });
        
        if (response.statusCode === 200 && response.data) {
          return response.data;
        } else {
          console.error('获取用户宠物失败:', response);
          return [];
        }
      } catch (error) {
        console.error('获取用户宠物出错:', error);
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // 检查是否关注某用户
    async checkFollowStatus(userId) {
      try {
        this.loading = true;
        
        // 调用API检查关注状态
        const response = await uni.request({
          url: `${uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000'}/api/users/follow/check/${userId}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${uni.getStorageSync('token')}`
          }
        });
        
        if (response.statusCode === 200 && response.data) {
          return response.data;
        } else {
          console.error('检查关注状态失败:', response);
          return { following: false };
        }
      } catch (error) {
        console.error('检查关注状态出错:', error);
        return { following: false };
      } finally {
        this.loading = false;
      }
    }
  }
}) 