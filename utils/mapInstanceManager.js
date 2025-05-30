/**
 * 地图实例管理器
 * 采用单例模式确保整个应用中只有一个地图实例
 */

// 全局唯一的地图实例
let mapInstance = null;

// 上次获取地图实例的时间
let lastMapAccessTime = 0;

// 私有的初始化方法
const initializeMap = (containerId, config) => {
  console.log('初始化地图实例');
  
  // 确保AMap已加载
  if (typeof window === 'undefined' || !window.AMap) {
    throw new Error('地图API未加载');
  }
  
  try {
    // 默认配置
    const defaultConfig = {
      zoom: 15,
      resizeEnable: true,
      doubleClickZoom: false // 禁用双击缩放以避免与标记点击冲突
    };
    
    // 合并配置
    const mergedConfig = { ...defaultConfig, ...config };
    
    // 创建地图实例
    const instance = new window.AMap.Map(containerId, mergedConfig);
    
    // 设置全局引用，便于调试和应急访问
    if (typeof window !== 'undefined') {
      window.__dogRunMapInstance = instance;
    }
    
    console.log('地图实例创建成功');
    return instance;
  } catch (err) {
    console.error('创建地图实例失败:', err);
    throw err;
  }
};

/**
 * 地图实例管理
 */
const MapInstanceManager = {
  /**
   * 获取地图实例
   * @param {Object} options 配置项
   * @param {String} options.containerId 地图容器ID
   * @param {Object} options.config 地图配置
   * @param {Boolean} options.forceRecreate 是否强制重新创建
   * @returns {Object} 地图实例
   */
  getMapInstance(options = {}) {
    const { containerId = 'map-container', config = {}, forceRecreate = false } = options;
    
    // 更新访问时间
    lastMapAccessTime = Date.now();
    
    // 如果已有实例且不强制重建，则直接返回
    if (mapInstance && !forceRecreate) {
      return mapInstance;
    }
    
    // 尝试从DOM元素获取
    if (typeof window !== 'undefined' && window.AMap) {
      const mapContainer = document.getElementById(containerId);
      if (mapContainer && mapContainer.__amap_instance__ && !forceRecreate) {
        console.log('从DOM元素获取地图实例');
        mapInstance = mapContainer.__amap_instance__;
        return mapInstance;
      }
    }
    
    // 从全局变量获取
    if (typeof window !== 'undefined' && window.__dogRunMapInstance && !forceRecreate) {
      console.log('从全局变量获取地图实例');
      mapInstance = window.__dogRunMapInstance;
      return mapInstance;
    }
    
    // 所有获取方式都失败，创建新实例
    console.log('创建新的地图实例');
    mapInstance = initializeMap(containerId, config);
    return mapInstance;
  },
  
  /**
   * 设置地图中心点
   * @param {Object} location {longitude, latitude}
   * @param {Number} zoom 缩放级别
   */
  setCenter(location, zoom) {
    const instance = this.getMapInstance();
    if (instance && location && typeof location.longitude !== 'undefined') {
      instance.setCenter([location.longitude, location.latitude]);
      if (zoom) {
        instance.setZoom(zoom);
      }
    }
  },
  
  /**
   * 销毁地图实例
   */
  destroyMapInstance() {
    if (mapInstance) {
      console.log('销毁地图实例');
      mapInstance.destroy();
      mapInstance = null;
      
      // 清理全局引用
      if (typeof window !== 'undefined') {
        window.__dogRunMapInstance = null;
      }
    }
  },
  
  /**
   * 检查地图健康状态
   * @returns {Boolean} 地图是否健康
   */
  isMapHealthy() {
    if (!mapInstance) return false;
    
    // 检查地图元素是否存在
    if (typeof window !== 'undefined') {
      const mapContainer = document.getElementById('map-container');
      if (!mapContainer) return false;
    }
    
    // 检查最后访问时间，如果超过30分钟未使用，可能处于休眠状态
    const idleTime = Date.now() - lastMapAccessTime;
    if (idleTime > 30 * 60 * 1000) {
      console.warn('地图长时间未使用，可能需要重新初始化');
      return false;
    }
    
    return true;
  }
};

export default MapInstanceManager; 