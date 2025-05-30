import { defineStore } from 'pinia';
import api from '@/utils/api.js';
import request from '@/utils/request.js';

export const useMarkerStore = defineStore('marker', {
  state: () => ({
    markers: [],
    userMarkers: [],
    loading: false,
    error: null,
    currentMarker: null,
    selectedMarker: null,
    markerCache: {
      data: [],
      timestamp: null,
      location: null
    },
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0
    }
  }),

  getters: {
    allMarkers: (state) => state.markers,
    isLoading: (state) => state.loading,
    getError: (state) => state.error,
  },

  actions: {
    // 获取附近的标记
    async fetchNearbyMarkers({ longitude, latitude, radius = 5000 }) {
      try {
        this.loading = true;
        console.log('正在获取附近标记...');
        
        // 检查缓存是否有效（30分钟内的数据且距离不超过2公里）
        const cacheIsValid = this.checkCacheValidity({ longitude, latitude });
        
        // 如果有有效缓存且不是强制刷新，使用缓存数据
        if (cacheIsValid) {
          console.log('使用缓存的标记数据');
          
          // 根据当前位置过滤并排序缓存的标记
          const filteredMarkers = this.filterMarkersByDistance(
            this.markerCache.data,
            { latitude, longitude, radius }
          );
          
          this.markers = filteredMarkers;
          this.loading = false;
          return filteredMarkers;
        }
        
        // 尝试多种查询策略
        let retries = 2;
        let lastError = null;
        let queryStrategy = 0;
        
        while (retries >= 0) {
          try {
            let url = '/api/markers';
            let params = {};
            
            // 根据不同策略构建不同的请求
            switch (queryStrategy) {
              case 0: // 标准地理空间查询
                params = { 
                  longitude, 
                  latitude, 
                  radius 
                };
                console.log('尝试标准地理空间查询');
                break;
                
              case 1: // 使用geoWithin参数
                params = { 
                  longitude, 
                  latitude, 
                  radius, 
                  queryMode: 'geoWithin' 
                };
                console.log('尝试使用geoWithin查询模式');
                break;
                
              case 2: // 简化查询 - 使用坐标范围
                // 计算经纬度范围（粗略估算，1度约111km）
                const latDelta = radius / 111000;
                const lngDelta = radius / (111000 * Math.cos(latitude * Math.PI / 180));
                
                params = {
                  minLat: latitude - latDelta,
                  maxLat: latitude + latDelta,
                  minLng: longitude - lngDelta,
                  maxLng: longitude + lngDelta,
                  useRectQuery: true
                };
                console.log('尝试使用矩形区域查询');
                break;
                
              case 3: // 获取所有标记，前端筛选
                // 使用不同的API端点尝试获取所有标记
                url = '/api/markers/all';
                console.log('尝试获取所有标记');
                break;
                
              case 4: // 完全不使用空间查询参数
                // 不添加任何查询参数
                console.log('尝试无参数请求获取标记');
                break;
                
              case 5: // 使用POST请求发送查询条件
                url = '/api/markers/search';
                return await this.fetchMarkersByPost({
                  longitude, latitude, radius
                });
            }
            
            // 发送请求
            const response = await request({
              url: url,
              method: 'GET',
              params: params,
              timeout: 10000
            });
            
            console.log('获取标记响应:', response);
            
            let markers = [];
            let pagination = this.pagination;
            
            if (response.data) {
              markers = response.data.data || response.data;
              pagination = response.data.pagination || this.pagination;
            } else {
              markers = response || [];
            }
            
            // 如果使用策略3或4（获取所有标记），需要在前端进行距离过滤
            if (queryStrategy >= 3 && markers.length > 0) {
              console.log('在前端筛选附近标记');
              markers = this.filterMarkersByDistance(markers, {
                latitude,
                longitude,
                radius
              });
            }
            
            // 更新缓存
            this.updateMarkerCache(markers, { longitude, latitude });
            
            this.markers = markers;
            this.pagination = pagination;
            this.loading = false;
            
            console.log(`成功使用策略${queryStrategy}获取到${markers.length}个标记`);
            return markers;
          } catch (error) {
            lastError = error;
            console.warn(`获取标记失败，使用策略${queryStrategy}失败，剩余重试次数: ${retries}`, error);
            
            // 尝试下一个查询策略
            queryStrategy++;
            
            // 如果已尝试所有策略，则减少重试次数
            if (queryStrategy > 5) {
              queryStrategy = 0; // 重置策略
              retries--; // 减少重试次数
            }
            
            // 等待短暂时间后重试
            if (retries >= 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // 所有远程获取策略都失败，尝试使用缓存（即使缓存可能已过期）
        if (this.markerCache.data && this.markerCache.data.length > 0) {
          console.log('所有API策略失败，使用过期缓存数据');
          
          // 使用距离过滤，即使缓存位置可能较远
          const filteredMarkers = this.filterMarkersByDistance(
            this.markerCache.data,
            { latitude, longitude, radius: radius * 2 } // 扩大半径范围
          );
          
          if (filteredMarkers.length > 0) {
            this.markers = filteredMarkers;
        this.loading = false;
            
            // 显示提示
            uni.showToast({
              title: '使用缓存数据，可能不是最新',
              icon: 'none',
              duration: 2000
            });
            
            return filteredMarkers;
          }
        }
        
        // 所有重试都失败了
        throw lastError;
      } catch (error) {
        console.error('获取附近标记失败:', error);
        this.error = error.response?.data?.message || '获取标记失败';
        this.loading = false;
        
        // 使用空标记数组
        this.markers = [];
        
        // 显示更友好的错误消息
        uni.showToast({
          title: '服务器暂时不可用，请稍后再试',
          icon: 'none',
          duration: 3000
        });
        
        return [];
      }
    },
    
    // 获取用户标记
    async fetchUserMarkers(userId) {
      try {
        this.loading = true;
        const response = await request({
          url: `/api/markers/user/${userId}`,
          method: 'GET'
        });
        
        let markers = [];
        if (response.data) {
          markers = response.data.data || response.data;
        } else {
          markers = response || [];
        }
        
        this.userMarkers = markers;
        this.loading = false;
        return markers;
      } catch (error) {
        console.error('获取用户标记失败:', error);
        this.error = error.response?.data?.message || '获取用户标记失败';
        this.loading = false;
        uni.showToast({
          title: '获取用户标记失败，请检查网络',
          icon: 'none',
          duration: 2000
        });
        return [];
      }
    },
    
    // 创建新标记
    async createMarker(markerData) {
      try {
        this.loading = true;
        
        console.log('正在创建新标记，数据:', markerData);
        
        // 确保图片数据格式正确
        let processedData = { ...markerData };
        
        // 如果有图片数据，确保格式正确
        if (markerData.images && markerData.images.length > 0) {
          console.log('标记包含图片数据:', markerData.images.length, '张图片');
          processedData.images = markerData.images.map(img => ({
            url: img.url,
            caption: img.caption || ''
          }));
        }
        
        // 确保包含经纬度
        if (!processedData.latitude || !processedData.longitude) {
          console.error('标记缺少位置信息');
          throw new Error('标记位置信息不完整');
        }
        
        // 发送API请求创建标记
            const response = await request({
              url: '/api/markers',
              method: 'POST',
          data: processedData
        });
        
        console.log('新标记创建响应:', response);
            
        let result = response.data || response;
        
        // 将新标记添加到状态中
        if (result && (result.data || result._id)) {
          const newMarker = result.data || result;
          
          // 确保标记有完整的数据
          if (newMarker && !newMarker._id) {
            newMarker._id = 'marker_' + Date.now(); // 临时ID
          }
          
          if (newMarker && !newMarker.createdAt) {
            newMarker.createdAt = new Date();
            }
            
          // 确保有位置信息
          if (newMarker && (!newMarker.latitude || !newMarker.longitude)) {
            newMarker.latitude = processedData.latitude;
            newMarker.longitude = processedData.longitude;
            }
            
          // 如果是数组中有新标记，则将其添加到现有标记列表
          if (this.markers && Array.isArray(this.markers)) {
        this.markers.unshift(newMarker);
          } else {
            this.markers = [newMarker];
          }
          
          // 保存到用户的标记中
          if (this.userMarkers && Array.isArray(this.userMarkers)) {
            this.userMarkers.unshift(newMarker);
          }
          
          // 更新标记缓存
          this.updateMarkerCache(this.markers, {
            latitude: newMarker.latitude, 
            longitude: newMarker.longitude
        });
            
          // 通知标记已更新
            this.notifyMarkersUpdated();
        
          // 设置当前标记为新创建的标记
          this.setCurrentMarker(newMarker);
        }
        
        this.loading = false;
        return result;
      } catch (error) {
        console.error('创建标记失败:', error);
        this.error = error.response?.data?.message || error.message || '创建标记失败';
        this.loading = false;
        throw error;
      }
    },
    
    // 更新标记
    async updateMarker({ id, data }) {
      try {
        this.loading = true;
        const response = await request({
          url: `/api/markers/${id}`,
          method: 'PUT',
          data: data
        });
        
        let updatedMarker = {};
        if (response.data) {
          updatedMarker = response.data.data || response.data;
        } else {
          updatedMarker = response || {};
        }
        
        const index = this.markers.findIndex(m => m._id === updatedMarker._id);
        if (index !== -1) {
          this.markers[index] = updatedMarker;
        }
        
        const userIndex = this.userMarkers.findIndex(m => m._id === updatedMarker._id);
        if (userIndex !== -1) {
          this.userMarkers[userIndex] = updatedMarker;
        }
        
        if (this.selectedMarker && this.selectedMarker._id === updatedMarker._id) {
          this.selectedMarker = updatedMarker;
        }
        
        if (this.currentMarker && this.currentMarker._id === updatedMarker._id) {
          this.currentMarker = updatedMarker;
        }
        
        // 清除所有缓存确保获取最新数据
        this.clearAllMarkerCache();
        
        // 发出标记更新通知
        this.notifyMarkersUpdated();
        
        this.loading = false;
        
        uni.showToast({
          title: '标记更新成功',
          icon: 'success'
        });
        
        return updatedMarker;
      } catch (error) {
        console.error('更新标记失败:', error);
        this.error = error.response?.data?.message || '更新标记失败';
        this.loading = false;
        
        uni.showToast({
          title: error.response?.data?.message || '更新标记失败，请检查网络',
          icon: 'none'
        });
        
        return null;
      }
    },
    
    // 删除标记
    async deleteMarker(id) {
      try {
        this.loading = true;
        console.log('正在删除标记:', id);
        
        // 添加请求重试和错误处理逻辑
        let retries = 2; // 最多重试2次
        let lastError = null;
        
        while (retries >= 0) {
          try {
            const response = await request({
              url: `/api/markers/${id}`,
              method: 'DELETE',
              timeout: 15000 // 增加超时时间
            });
            
            console.log('删除标记响应:', response);
        
            // 更新本地数据
        this.markers = this.markers.filter(marker => marker._id !== id);
        this.userMarkers = this.userMarkers.filter(marker => marker._id !== id);
        
        if (this.selectedMarker && this.selectedMarker._id === id) {
          this.selectedMarker = null;
        }
        
        if (this.currentMarker && this.currentMarker._id === id) {
          this.currentMarker = null;
        }
            
            // 清除所有缓存
            this.clearAllMarkerCache();
        
        this.loading = false;
        
            // 发出标记更新通知
            this.notifyMarkersUpdated();
            
        uni.showToast({
          title: '标记已删除',
          icon: 'success'
        });
        
        return true;
          } catch (error) {
            lastError = error;
            console.warn(`删除标记失败，剩余重试次数: ${retries}`, error);
            retries--;
            
            // 等待短暂时间后重试
            if (retries >= 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        // 所有重试都失败了
        throw lastError;
      } catch (error) {
        console.error('删除标记失败:', error);
        this.error = error.response?.data?.message || '删除标记失败';
        this.loading = false;
        
        // 显示错误消息
        uni.showToast({
          title: error.response?.data?.message || '删除标记失败，请检查网络',
          icon: 'none'
        });
        
        return false;
      }
    },
    
    // 获取单个标记详情
    async fetchMarkerById(id) {
      try {
        this.loading = true;
        const response = await request({
          url: `/api/markers/${id}`,
          method: 'GET'
        });
        
        let marker = {};
        if (response.data) {
          marker = response.data.data || response.data;
        } else {
          marker = response || {};
        }
        
        this.selectedMarker = marker;
        this.loading = false;
        return marker;
      } catch (error) {
        console.error('获取标记详情失败:', error);
        this.error = error.response?.data?.message || '获取标记详情失败';
        this.loading = false;
        return null;
      }
    },
    
    // 点赞标记
    async likeMarker(id) {
      try {
        const response = await request({
          url: `/api/markers/${id}/like`,
          method: 'POST'
        });
        
        let likes = [];
        if (response.data) {
          likes = response.data.likes || response.likes || [];
        } else if (response.likes) {
          likes = response.likes;
        }
        
        const index = this.markers.findIndex(m => m._id === id);
        if (index !== -1) {
          const marker = { ...this.markers[index] };
          marker.likes = likes;
          this.markers[index] = marker;
        }
        
        const userIndex = this.userMarkers.findIndex(m => m._id === id);
        if (userIndex !== -1) {
          const marker = { ...this.userMarkers[userIndex] };
          marker.likes = likes;
          this.userMarkers[userIndex] = marker;
        }
        
        if (this.selectedMarker && this.selectedMarker._id === id) {
          this.selectedMarker = { ...this.selectedMarker, likes };
        }
        
        return response;
      } catch (error) {
        console.error('点赞标记失败:', error);
        uni.showToast({
          title: error.response?.data?.message || '点赞失败',
          icon: 'none'
        });
        return null;
      }
    },
    
    // 取消点赞标记
    async unlikeMarker(id) {
      try {
        const response = await request({
          url: `/api/markers/${id}/unlike`,
          method: 'POST'
        });
        
        let likes = [];
        if (response.data) {
          likes = response.data.likes || response.likes || [];
        } else if (response.likes) {
          likes = response.likes;
        }
        
        const index = this.markers.findIndex(m => m._id === id);
        if (index !== -1) {
          const marker = { ...this.markers[index] };
          marker.likes = likes;
          this.markers[index] = marker;
        }
        
        const userIndex = this.userMarkers.findIndex(m => m._id === id);
        if (userIndex !== -1) {
          const marker = { ...this.userMarkers[userIndex] };
          marker.likes = likes;
          this.userMarkers[userIndex] = marker;
        }
        
        if (this.selectedMarker && this.selectedMarker._id === id) {
          this.selectedMarker = { ...this.selectedMarker, likes };
        }
        
        return response;
      } catch (error) {
        console.error('取消点赞标记失败:', error);
        uni.showToast({
          title: error.response?.data?.message || '取消点赞失败',
          icon: 'none'
        });
        return null;
      }
    },
    
    // 设置当前标记
    setCurrentMarker(marker) {
      this.currentMarker = marker;
    },
    
    // 设置选中的标记
    setSelectedMarker(marker) {
      this.selectedMarker = marker;
    },
    
    // 清除错误
    clearError() {
      this.error = null;
    },

    // 添加新方法：在前端按距离过滤标记
    filterMarkersByDistance(markers, center) {
      if (!markers || !markers.length) return [];
      if (!center || typeof center.latitude === 'undefined') return markers;
      
      const { latitude, longitude, radius } = center;
      const filtered = markers.filter(marker => {
        // 确保标记有经纬度
        if (!marker.latitude || !marker.longitude) {
          // 尝试从location属性获取
          if (marker.location && marker.location.coordinates) {
            marker.longitude = marker.location.coordinates[0];
            marker.latitude = marker.location.coordinates[1];
          } else {
            return false; // 没有位置信息，过滤掉
          }
        }
        
        // 计算标记到中心点的距离（单位：米）
        const distance = this.calculateDistance(
          latitude, longitude,
          marker.latitude, marker.longitude
        );
        
        // 保存距离信息到标记
        marker.distance = distance;
        
        // 如果距离小于半径，保留该标记
        return distance <= radius;
      });
      
      // 按距离排序
      filtered.sort((a, b) => a.distance - b.distance);
      
      return filtered;
    },

    // 计算两点之间的距离（哈弗辛公式）
    calculateDistance(lat1, lng1, lat2, lng2) {
      const R = 6371000; // 地球半径（米）
      const dLat = this.toRadians(lat2 - lat1);
      const dLng = this.toRadians(lng2 - lng1);
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    },

    // 将角度转换为弧度
    toRadians(degrees) {
      return degrees * Math.PI / 180;
    },

    // 使用POST请求获取标记，可以传递更复杂的查询条件
    async fetchMarkersByPost(searchParams) {
      try {
        console.log('使用POST请求获取标记');
        
        const response = await request({
          url: '/api/markers/search',
          method: 'POST',
          data: searchParams,
          timeout: 15000
        });
        
        let markers = [];
        
        if (response.data) {
          markers = response.data.data || response.data;
        } else {
          markers = response || [];
        }
        
        // 更新缓存
        if (markers.length > 0) {
          this.updateMarkerCache(markers, {
            longitude: searchParams.longitude,
            latitude: searchParams.latitude
          });
        }
        
        return markers;
      } catch (error) {
        console.error('POST请求获取标记失败:', error);
        throw error;
      }
    },

    // 检查缓存是否有效
    checkCacheValidity({ longitude, latitude }) {
      // 如果没有缓存数据，则缓存无效
      if (!this.markerCache.data || this.markerCache.data.length === 0) {
        return false;
      }
      
      // 检查缓存时间戳，是否在30分钟内
      const cacheAge = Date.now() - (this.markerCache.timestamp || 0);
      const cacheTimeValid = cacheAge < 30 * 60 * 1000; // 30分钟
      
      // 检查缓存位置，是否在2公里范围内
      let cacheLocationValid = false;
      if (this.markerCache.location) {
        const distance = this.calculateDistance(
          latitude,
          longitude,
          this.markerCache.location.latitude,
          this.markerCache.location.longitude
        );
        cacheLocationValid = distance < 2000; // 2公里
      }
      
      return cacheTimeValid && cacheLocationValid;
    },

    // 更新标记缓存
    updateMarkerCache(markers, location) {
      if (!markers || !markers.length) return;
      
      this.markerCache = {
        data: [...markers],
        timestamp: Date.now(),
        location: { ...location }
      };
      
      console.log('更新了标记缓存，共', markers.length, '个标记');
      
      // 本地持久化缓存（可选）
      try {
        uni.setStorageSync('markerCache', JSON.stringify(this.markerCache));
      } catch (e) {
        console.error('保存标记缓存失败:', e);
      }
    },

    // 恢复标记缓存（在初始化时调用）
    restoreMarkerCache() {
      try {
        const cachedData = uni.getStorageSync('markerCache');
        if (cachedData) {
          this.markerCache = JSON.parse(cachedData);
          console.log('已恢复标记缓存，时间:', new Date(this.markerCache.timestamp));
        }
      } catch (e) {
        console.error('恢复标记缓存失败:', e);
      }
    },

    // 添加清除所有缓存的方法
    clearAllMarkerCache() {
      console.log('清除所有标记缓存');
      
      // 清除内存缓存
      this.markerCache = {
        data: [],
        timestamp: null,
        location: null
      };
      
      // 清除本地存储缓存
      try {
        uni.removeStorageSync('markerCache');
      } catch (e) {
        console.error('清除本地存储缓存失败:', e);
      }
    },

    // 添加标记更新通知事件
    notifyMarkersUpdated() {
      // 使用uni.$emit发出全局事件
      uni.$emit('markers-updated', {
        timestamp: Date.now()
      });
      console.log('已发出标记更新通知');
    }
  }
}); 