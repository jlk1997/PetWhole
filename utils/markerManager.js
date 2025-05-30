/**
 * 地图标记管理器
 * 负责标记的创建、聚合、显示/隐藏和性能优化
 */
import MapInstanceManager from './mapInstanceManager';

// 存储所有标记的集合，使用标记ID作为键值
const markersCache = new Map();

// 用户标记集合，使用用户ID作为键值
const userMarkersCache = new Map();

// 标记聚合管理器
let clusterManager = null;

// 是否启用标记聚合
let clusterEnabled = true;

// 标记数据预加载队列
const preloadQueue = [];
let isPreloading = false;

/**
 * 标记管理器
 */
const MarkerManager = {
  /**
   * 初始化标记管理器
   * @param {Object} options 配置项
   * @param {Boolean} options.useCluster 是否启用聚合
   * @param {Object} options.clusterOptions 聚合选项
   */
  async init(options = {}) {
    const { useCluster = true, clusterOptions = {} } = options;
    clusterEnabled = useCluster;
    
    try {
      // 确保地图实例已创建
      const map = MapInstanceManager.getMapInstance();
      
      // 清除之前的标记
      this.clearAllMarkers();
      
      // 初始化聚合管理器
      if (clusterEnabled && window.AMap && window.AMap.MarkerCluster) {
        // 默认聚合配置
        const defaultClusterOptions = {
          gridSize: 80, // 聚合计算时网格的像素大小
          maxZoom: 16,  // 最大的聚合级别
          minClusterSize: 2, // 聚合的最小数量
          renderClusterMarker: this._renderClusterMarker
        };
        
        clusterManager = new window.AMap.MarkerCluster(map, [], {
          ...defaultClusterOptions,
          ...clusterOptions
        });
        
        console.log('标记聚合管理器初始化成功');
      } else {
        console.log('标记聚合功能未启用或相关API未加载');
      }
      
      return true;
    } catch (err) {
      console.error('初始化标记管理器失败:', err);
      return false;
    }
  },
  
  /**
   * 添加标记
   * @param {Object} markerData 标记数据
   * @param {String} markerData.id 标记ID
   * @param {Object} markerData.position {longitude, latitude}
   * @param {Object} options 标记选项
   * @returns {Object} 标记对象
   */
  addMarker(markerData, options = {}) {
    try {
      if (!markerData || !markerData.id || !markerData.position) {
        console.error('添加标记失败: 缺少必要数据');
        return null;
      }
      
      // 如果标记已存在，则返回缓存的标记
      if (markersCache.has(markerData.id)) {
        return markersCache.get(markerData.id);
      }
      
      const map = MapInstanceManager.getMapInstance();
      
      // 创建标记
      const marker = new window.AMap.Marker({
        position: [markerData.position.longitude, markerData.position.latitude],
        title: markerData.title || '',
        content: options.content,
        icon: options.icon,
        extData: { 
          ...markerData,
          ...options.extData
        },
        zIndex: options.zIndex || 10,
        offset: options.offset || new window.AMap.Pixel(-16, -32)
      });
      
      // 是否添加点击事件
      if (options.onClick) {
        marker.on('click', (e) => {
          // 避免事件冒泡和多次触发
          e.stopPropagation();
          // 延迟执行点击处理，避免与地图拖动事件冲突
          setTimeout(() => {
            options.onClick(markerData, marker, e);
          }, 10);
        });
      }
      
      // 缓存标记
      markersCache.set(markerData.id, marker);
      
      // 如果是用户标记，额外缓存
      if (markerData.isUserMarker && markerData.userId) {
        userMarkersCache.set(markerData.userId, marker);
      }
      
      // 如果启用了聚合且不是用户标记，添加到聚合管理器
      if (clusterEnabled && clusterManager && !markerData.isUserMarker) {
        // 从聚合中排除用户标记
        clusterManager.addMarker(marker);
      } else {
        // 直接添加到地图
        marker.setMap(map);
      }
      
      return marker;
    } catch (err) {
      console.error('添加标记失败:', err);
      return null;
    }
  },
  
  /**
   * 批量添加标记
   * @param {Array} markersData 标记数据数组
   * @param {Object} options 标记选项
   */
  addMarkers(markersData = [], options = {}) {
    if (!markersData || !Array.isArray(markersData)) {
      console.error('批量添加标记失败: 数据格式不正确');
      return;
    }
    
    try {
      // 分批处理，避免卡顿
      const batchSize = 20;
      const processBatch = (startIndex) => {
        const endIndex = Math.min(startIndex + batchSize, markersData.length);
        const batch = markersData.slice(startIndex, endIndex);
        
        batch.forEach(markerData => {
          this.addMarker(markerData, options);
        });
        
        if (endIndex < markersData.length) {
          // 使用requestAnimationFrame或setTimeout处理下一批
          setTimeout(() => {
            processBatch(endIndex);
          }, 10);
        } else {
          // 所有标记添加完成，刷新聚合
          this.refreshCluster();
        }
      };
      
      // 开始批处理
      processBatch(0);
    } catch (err) {
      console.error('批量添加标记失败:', err);
    }
  },
  
  /**
   * 更新标记
   * @param {String} markerId 标记ID
   * @param {Object} markerData 更新数据
   * @param {Boolean} animate 是否使用动画
   */
  updateMarker(markerId, markerData = {}, animate = false) {
    if (!markerId || !markersCache.has(markerId)) {
      console.warn(`更新标记失败: 未找到标记 ${markerId}`);
      return;
    }
    
    try {
      const marker = markersCache.get(markerId);
      
      // 更新位置
      if (markerData.position) {
        const newPosition = [markerData.position.longitude, markerData.position.latitude];
        
        if (animate) {
          // 使用动画移动标记
          marker.moveTo(newPosition, {
            duration: 500,  // 移动时长
            delay: 0       // 延迟
          });
        } else {
          marker.setPosition(newPosition);
        }
      }
      
      // 更新图标
      if (markerData.icon) {
        marker.setIcon(markerData.icon);
      }
      
      // 更新内容
      if (markerData.content) {
        marker.setContent(markerData.content);
      }
      
      // 更新扩展数据
      if (markerData.extData) {
        const currentExtData = marker.getExtData() || {};
        marker.setExtData({
          ...currentExtData,
          ...markerData.extData
        });
      }
    } catch (err) {
      console.error(`更新标记失败 ${markerId}:`, err);
    }
  },
  
  /**
   * 删除标记
   * @param {String} markerId 标记ID
   */
  removeMarker(markerId) {
    if (!markerId || !markersCache.has(markerId)) {
      return;
    }
    
    try {
      const marker = markersCache.get(markerId);
      
      // 从聚合管理器移除
      if (clusterEnabled && clusterManager) {
        clusterManager.removeMarker(marker);
      }
      
      // 从地图移除
      marker.setMap(null);
      
      // 从缓存中删除
      markersCache.delete(markerId);
      
      // 检查是否是用户标记
      for (const [userId, userMarker] of userMarkersCache.entries()) {
        if (userMarker === marker) {
          userMarkersCache.delete(userId);
          break;
        }
      }
    } catch (err) {
      console.error(`删除标记失败 ${markerId}:`, err);
    }
  },
  
  /**
   * 清除所有标记
   */
  clearAllMarkers() {
    try {
      // 清除聚合管理器
      if (clusterManager) {
        clusterManager.clearMarkers();
      }
      
      // 清除独立标记
      for (const marker of markersCache.values()) {
        marker.setMap(null);
      }
      
      // 清空缓存
      markersCache.clear();
      userMarkersCache.clear();
    } catch (err) {
      console.error('清除所有标记失败:', err);
    }
  },
  
  /**
   * 显示标记
   * @param {String} markerId 标记ID
   */
  showMarker(markerId) {
    if (markersCache.has(markerId)) {
      markersCache.get(markerId).show();
    }
  },
  
  /**
   * 隐藏标记
   * @param {String} markerId 标记ID
   */
  hideMarker(markerId) {
    if (markersCache.has(markerId)) {
      markersCache.get(markerId).hide();
    }
  },
  
  /**
   * 显示所有标记
   * @param {Boolean} excludeUserMarkers 是否排除用户标记
   */
  showAllMarkers(excludeUserMarkers = false) {
    try {
      for (const [id, marker] of markersCache.entries()) {
        // 如果排除用户标记，则检查扩展数据
        if (excludeUserMarkers) {
          const extData = marker.getExtData() || {};
          if (extData.isUserMarker) continue;
        }
        
        marker.show();
      }
    } catch (err) {
      console.error('显示所有标记失败:', err);
    }
  },
  
  /**
   * 隐藏所有标记
   * @param {Boolean} excludeUserMarkers 是否排除用户标记
   */
  hideAllMarkers(excludeUserMarkers = true) {
    try {
      for (const [id, marker] of markersCache.entries()) {
        // 如果排除用户标记，则检查扩展数据
        if (excludeUserMarkers) {
          const extData = marker.getExtData() || {};
          if (extData.isUserMarker) continue;
        }
        
        marker.hide();
      }
    } catch (err) {
      console.error('隐藏所有标记失败:', err);
    }
  },
  
  /**
   * 刷新标记聚合
   */
  refreshCluster() {
    if (clusterEnabled && clusterManager) {
      clusterManager.refresh();
    }
  },
  
  /**
   * 添加用户标记
   * @param {Object} userData 用户数据
   * @param {String} userData.id 用户ID
   * @param {Object} userData.position {longitude, latitude}
   * @param {String} userData.avatar 头像URL
   * @param {Function} onClick 点击事件处理
   * @returns {Object} 标记对象
   */
  addUserMarker(userData, onClick) {
    if (!userData || !userData.id || !userData.position) {
      console.error('添加用户标记失败: 缺少必要数据');
      return null;
    }
    
    try {
      // 如果已存在该用户的标记，则更新位置
      if (userMarkersCache.has(userData.id)) {
        this.updateMarker(`user_${userData.id}`, userData, true);
        return userMarkersCache.get(userData.id);
      }
      
      // 创建自定义标记内容
      const createCustomMarkerContent = () => {
        // 创建一个Div容器
        const div = document.createElement('div');
        div.className = 'custom-user-marker';
        div.style.position = 'relative';
        div.style.width = '40px';
        div.style.height = '40px';
        div.style.borderRadius = '50%';
        div.style.border = '2px solid #fff';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        div.style.backgroundColor = '#f0f0f0';
        div.style.overflow = 'hidden';
        
        // 创建头像
        if (userData.avatar) {
          const img = new Image();
          img.src = userData.avatar;
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          img.onerror = () => {
            // 头像加载失败时显示默认头像
            img.src = '/static/images/default-avatar.png';
          };
          div.appendChild(img);
        } else {
          div.textContent = userData.nickname?.substring(0, 1) || '用';
          div.style.textAlign = 'center';
          div.style.lineHeight = '40px';
          div.style.fontSize = '18px';
          div.style.fontWeight = 'bold';
          div.style.color = '#fff';
          div.style.backgroundColor = '#2196F3';
        }
        
        return div;
      };
      
      // 创建标记
      const marker = this.addMarker({
        id: `user_${userData.id}`,
        position: userData.position,
        isUserMarker: true,
        userId: userData.id
      }, {
        content: createCustomMarkerContent(),
        offset: new window.AMap.Pixel(-20, -20),
        zIndex: 150, // 用户标记优先级高
        extData: {
          isUserMarker: true,
          userId: userData.id,
          userData
        },
        onClick: onClick
      });
      
      // 缓存用户标记
      if (marker) {
        userMarkersCache.set(userData.id, marker);
      }
      
      return marker;
    } catch (err) {
      console.error('添加用户标记失败:', err);
      return null;
    }
  },
  
  /**
   * 确保用户标记位于最上层
   */
  ensureUserMarkersOnTop() {
    for (const marker of userMarkersCache.values()) {
      marker.setzIndex(150);
      marker.show();
    }
  },
  
  /**
   * 预加载区域标记数据，避免一次性加载过多标记导致卡顿
   * @param {Function} fetchDataFn 获取标记数据的函数
   * @param {Array} areaIds 区域ID数组
   */
  async preloadAreaMarkers(fetchDataFn, areaIds) {
    if (!fetchDataFn || !areaIds || !Array.isArray(areaIds)) return;
    
    // 将区域ID加入预加载队列
    areaIds.forEach(areaId => {
      if (!preloadQueue.includes(areaId)) {
        preloadQueue.push(areaId);
      }
    });
    
    // 如果已经在预加载，直接返回
    if (isPreloading) return;
    
    // 开始处理预加载队列
    isPreloading = true;
    
    // 分批处理预加载队列
    const batchSize = 2; // 每批处理的区域数量
    
    try {
      while (preloadQueue.length > 0) {
        const batch = preloadQueue.splice(0, batchSize);
        
        // 并行加载每个区域的数据
        const batchPromises = batch.map(areaId => 
          fetchDataFn(areaId)
            .then(markersData => {
              // 根据返回的标记数量调整添加方式
              if (markersData && markersData.length > 0) {
                console.log(`加载区域 ${areaId} 的标记: ${markersData.length}个`);
                
                if (markersData.length > 50) {
                  // 如果标记数量多，分批添加
                  this.addMarkers(markersData);
                } else {
                  // 标记数量少，直接全部添加
                  markersData.forEach(data => this.addMarker(data));
                }
              }
            })
            .catch(err => console.error(`加载区域 ${areaId} 标记失败:`, err))
        );
        
        // 等待当前批次的加载完成
        await Promise.all(batchPromises);
        
        // 如果队列中还有数据，等待一段时间再处理下一批
        if (preloadQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      isPreloading = false;
    }
  },
  
  /**
   * 自定义聚合点渲染
   * @private
   */
  _renderClusterMarker(context) {
    const { count, marker } = context;
    
    // 根据聚合点数量确定大小和颜色
    let size = 40;
    let bgColor = '#3F51B5';
    
    if (count > 50) {
      size = 50;
      bgColor = '#F44336';
    } else if (count > 20) {
      size = 45;
      bgColor = '#FF9800';
    }
    
    // 创建聚合点的自定义内容
    const div = document.createElement('div');
    div.style.width = `${size}px`;
    div.style.height = `${size}px`;
    div.style.borderRadius = '50%';
    div.style.backgroundColor = bgColor;
    div.style.border = '2px solid #fff';
    div.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
    div.style.color = '#fff';
    div.style.textAlign = 'center';
    div.style.lineHeight = `${size}px`;
    div.style.fontSize = '16px';
    div.style.fontWeight = 'bold';
    div.textContent = count;
    
    marker.setContent(div);
    marker.setOffset(new window.AMap.Pixel(-size/2, -size/2));
  }
};

export default MarkerManager; 