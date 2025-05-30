/**
 * 地图服务
 * 整合地图实例管理、标记管理和事件处理，提供统一的地图服务接口
 */
import MapInstanceManager from './mapInstanceManager';
import MarkerManager from './markerManager';
import MapEventHandler from './mapEventHandler';

/**
 * 地图服务
 */
const MapService = {
  // 内部状态
  _state: {
    isInitialized: false,
    isReady: false,
    userLocation: null,
    isUserLocationShared: true,
    userMarker: null,
    walkingState: {
      isWalking: false,
      path: [],
      distance: 0,
      duration: 0,
      startTime: null
    }
  },
  
  /**
   * 初始化地图服务
   * @param {Object} options 初始化选项
   * @returns {Promise<boolean>} 是否初始化成功
   */
  async init(options = {}) {
    try {
      if (this._state.isInitialized) {
        console.log('地图服务已初始化，无需重复初始化');
        return true;
      }
      
      console.log('初始化地图服务');
      
      // 确保有起始位置
      if (!options.initialLocation) {
        try {
          options.initialLocation = await this.getCurrentLocation();
        } catch (err) {
          console.warn('无法获取当前位置，使用默认位置');
          options.initialLocation = { latitude: 39.9087, longitude: 116.3975 };
        }
      }
      
      this._state.userLocation = options.initialLocation;
      
      // 初始化地图实例
      const mapInstance = MapInstanceManager.getMapInstance({
        containerId: options.containerId || 'map-container',
        config: {
          zoom: options.zoom || 15,
          center: [options.initialLocation.longitude, options.initialLocation.latitude],
          resizeEnable: true,
          doubleClickZoom: false
        },
        forceRecreate: options.forceRecreate
      });
      
      // 初始化标记管理器
      await MarkerManager.init({
        useCluster: options.useCluster !== false,
        clusterOptions: options.clusterOptions || {}
      });
      
      // 初始化事件处理器
      MapEventHandler.init({
        DRAG_CLICK_DELAY: options.dragClickDelay || 150,
        DEBUG: options.debug || false
      });
      
      // 注册基本事件处理
      this._registerDefaultEventHandlers(options);
      
      // 设置地图中心点
      MapInstanceManager.setCenter(options.initialLocation, options.zoom || 15);
      
      // 标记服务初始化完成
      this._state.isInitialized = true;
      this._state.isReady = true;
      
      console.log('地图服务初始化完成');
      
      return true;
    } catch (err) {
      console.error('初始化地图服务失败:', err);
      return false;
    }
  },
  
  /**
   * 获取地图实例
   * @returns {Object} 地图实例
   */
  getMapInstance() {
    return MapInstanceManager.getMapInstance();
  },
  
  /**
   * 获取当前位置
   * @returns {Promise<Object>} 当前位置对象 {latitude, longitude}
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      uni.getLocation({
        type: 'gcj02',
        success: (res) => {
          const location = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          
          this._state.userLocation = location;
          resolve(location);
        },
        fail: (err) => {
          console.error('获取位置失败:', err);
          reject(err);
        }
      });
    });
  },
  
  /**
   * 设置当前位置
   * @param {Object} location 位置对象 {latitude, longitude}
   */
  setCurrentLocation(location) {
    if (!location || typeof location.latitude === 'undefined') {
      console.error('无效的位置数据');
      return;
    }
    
    this._state.userLocation = location;
    
    // 如果已共享位置，更新用户位置标记
    if (this._state.isUserLocationShared) {
      this.updateUserLocationMarker(location);
    }
  },
  
  /**
   * 添加用户位置标记
   * @param {Object} userData 用户数据
   * @param {Function} onClick 点击回调
   * @returns {Object} 标记对象
   */
  addUserLocationMarker(userData, onClick) {
    if (!this._state.isInitialized) {
      console.warn('地图服务未初始化，无法添加用户标记');
      return null;
    }
    
    if (!userData.position && this._state.userLocation) {
      userData.position = this._state.userLocation;
    }
    
    const marker = MarkerManager.addUserMarker(userData, onClick);
    this._state.userMarker = marker;
    
    return marker;
  },
  
  /**
   * 更新用户位置标记
   * @param {Object} location 位置对象 {latitude, longitude}
   * @param {Boolean} animate 是否使用动画
   */
  updateUserLocationMarker(location, animate = true) {
    if (!this._state.isUserLocationShared || !location) return;
    
    const position = {
      longitude: location.longitude,
      latitude: location.latitude
    };
    
    // 更新用户标记位置
    try {
      if (this._state.userMarker) {
        // 用户标记已存在，更新位置
        MarkerManager.updateMarker(this._state.userMarker.getExtData().id, {
          position
        }, animate);
      }
    } catch (err) {
      console.error('更新用户位置标记失败:', err);
    }
  },
  
  /**
   * 移动地图到指定位置
   * @param {Object} location 位置对象 {latitude, longitude}
   * @param {Number} zoom 缩放级别
   */
  moveTo(location, zoom) {
    MapInstanceManager.setCenter(location, zoom);
  },
  
  /**
   * 移动到用户位置
   * @param {Number} zoom 缩放级别
   */
  moveToUserLocation(zoom) {
    if (this._state.userLocation) {
      this.moveTo(this._state.userLocation, zoom || 16);
    }
  },
  
  /**
   * 设置位置共享状态
   * @param {Boolean} shared 是否共享位置
   */
  setLocationSharing(shared) {
    this._state.isUserLocationShared = !!shared;
    
    // 更新标记显示状态
    if (this._state.userMarker) {
      if (shared) {
        MarkerManager.showMarker(this._state.userMarker.getExtData().id);
      } else {
        MarkerManager.hideMarker(this._state.userMarker.getExtData().id);
      }
    }
  },
  
  /**
   * 加载区域内的标记
   * @param {Function} fetchMarkersInBoundsFn 获取区域内标记的函数
   * @param {Object} options 选项
   * @returns {Promise<Array>} 标记数组
   */
  async loadMarkersInView(fetchMarkersInBoundsFn, options = {}) {
    if (!this._state.isInitialized || !fetchMarkersInBoundsFn) {
      return [];
    }
    
    try {
      const map = this.getMapInstance();
      const bounds = map.getBounds();
      const northeast = bounds.getNorthEast();
      const southwest = bounds.getSouthWest();
      
      // 构建查询参数
      const params = {
        northeastLat: northeast.getLat(),
        northeastLng: northeast.getLng(),
        southwestLat: southwest.getLat(),
        southwestLng: southwest.getLng()
      };
      
      // 获取区域内的标记
      const markersData = await fetchMarkersInBoundsFn(params);
      
      // 清除现有标记（可选）
      if (options.clearExisting !== false) {
        MarkerManager.clearAllMarkers(options.keepUserMarkers !== false);
      }
      
      // 添加新标记
      if (Array.isArray(markersData) && markersData.length > 0) {
        // 转换标记数据格式
        const markers = markersData.map(item => ({
          id: item.id,
          position: {
            longitude: item.longitude,
            latitude: item.latitude
          },
          title: item.title || '',
          type: item.type || 'default',
          data: item // 保存原始数据
        }));
        
        // 批量添加标记
        MarkerManager.addMarkers(markers, {
          // 根据标记类型设置图标
          icon: (markerData) => {
            // 根据markerData.type返回不同的图标路径
            return `/static/images/markers/${markerData.type || 'default'}.png`;
          },
          // 标记点击处理
          onClick: options.onMarkerClick || ((markerData) => {
            console.log('点击标记:', markerData);
          })
        });
        
        // 根据显示设置控制标记可见性
        if (options.showMarkers === false) {
          MarkerManager.hideAllMarkers(true);
        }
        
        return markersData;
      }
      
      return [];
    } catch (err) {
      console.error('加载区域标记失败:', err);
      return [];
    }
  },
  
  /**
   * 切换标记可见性
   * @param {Boolean} visible 是否可见
   * @param {Boolean} excludeUserMarkers 是否排除用户标记
   */
  toggleMarkersVisibility(visible, excludeUserMarkers = true) {
    if (visible) {
      MarkerManager.showAllMarkers(excludeUserMarkers);
    } else {
      MarkerManager.hideAllMarkers(excludeUserMarkers);
    }
    
    // 确保用户标记始终在最上层
    MarkerManager.ensureUserMarkersOnTop();
  },
  
  /**
   * 开始遛狗记录
   */
  startWalking() {
    if (this._state.walkingState.isWalking) {
      return false;
    }
    
    this._state.walkingState = {
      isWalking: true,
      path: [],
      distance: 0,
      duration: 0,
      startTime: Date.now()
    };
    
    // 如果有当前位置，添加为第一个路径点
    if (this._state.userLocation) {
      this._state.walkingState.path.push(this._state.userLocation);
    }
    
    return true;
  },
  
  /**
   * 结束遛狗记录
   * @returns {Object} 遛狗记录数据
   */
  stopWalking() {
    if (!this._state.walkingState.isWalking) {
      return null;
    }
    
    const walkData = {
      ...this._state.walkingState,
      endTime: Date.now()
    };
    
    // 重置遛狗状态
    this._state.walkingState = {
      isWalking: false,
      path: [],
      distance: 0,
      duration: 0,
      startTime: null
    };
    
    return walkData;
  },
  
  /**
   * 记录遛狗路径点
   * @param {Object} location 位置对象 {latitude, longitude}
   */
  recordWalkingPoint(location) {
    if (!this._state.walkingState.isWalking || !location) {
      return;
    }
    
    // 获取上一个点
    const lastPoint = this._state.walkingState.path[this._state.walkingState.path.length - 1];
    
    // 添加新点
    this._state.walkingState.path.push(location);
    
    // 计算新增距离
    if (lastPoint) {
      const distance = this._calculateDistance(
        lastPoint.latitude,
        lastPoint.longitude,
        location.latitude,
        location.longitude
      );
      
      // 更新总距离
      this._state.walkingState.distance += distance;
    }
    
    // 更新持续时间
    this._state.walkingState.duration = 
      Math.floor((Date.now() - this._state.walkingState.startTime) / 1000);
  },
  
  /**
   * 获取遛狗状态
   * @returns {Object} 遛狗状态
   */
  getWalkingState() {
    return { ...this._state.walkingState };
  },
  
  /**
   * 计算两点间距离
   * @private
   */
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径，单位米
    const dLat = this._deg2rad(lat2 - lat1);
    const dLon = this._deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this._deg2rad(lat1)) * Math.cos(this._deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // 返回距离，单位米
  },
  
  /**
   * 角度转弧度
   * @private
   */
  _deg2rad(deg) {
    return deg * (Math.PI/180);
  },
  
  /**
   * 注册默认事件处理
   * @param {Object} options 选项
   * @private
   */
  _registerDefaultEventHandlers(options) {
    // 地图点击事件
    if (options.onMapClick) {
      MapEventHandler.onMapClick(options.onMapClick);
    }
    
    // 地图拖动事件
    MapEventHandler.onMapDrag(
      options.onDragStart,
      options.onDragEnd || (() => {
        if (options.loadMarkersOnDragEnd !== false) {
          // 如果设置了加载标记的回调，则调用
          if (typeof options.loadMarkers === 'function') {
            options.loadMarkers();
          }
        }
      })
    );
    
    // 地图区域变化事件
    if (options.onRegionChange || options.loadMarkersOnRegionChange !== false) {
      MapEventHandler.onRegionChange(options.onRegionChange || ((region) => {
        if (typeof options.loadMarkers === 'function') {
          options.loadMarkers();
        }
      }));
    }
    
    // 地图缩放事件
    if (options.onZoomChange) {
      MapEventHandler.onMapZoom(options.onZoomChange);
    }
  }
};

export default MapService; 