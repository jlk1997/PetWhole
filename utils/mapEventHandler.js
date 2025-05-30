/**
 * 地图事件处理器
 * 负责处理地图事件，如点击、拖动、缩放等，并解决事件冲突问题
 */
import MapInstanceManager from './mapInstanceManager';

// 事件状态
const eventState = {
  isDragging: false,         // 是否正在拖动
  lastDragEndTime: 0,        // 最后一次拖动结束时间
  lastClickTime: 0,          // 最后一次点击时间
  lastZoomTime: 0,           // 最后一次缩放时间
  pendingClick: null,        // 等待处理的点击事件
  clickThrottleTimeout: null, // 点击事件节流定时器
};

// 事件配置
const CONFIG = {
  // 拖动结束后多长时间内不响应点击事件（毫秒）
  DRAG_CLICK_DELAY: 150,
  
  // 点击事件节流时间（毫秒）
  CLICK_THROTTLE: 300,
  
  // 缩放事件节流时间（毫秒）
  ZOOM_THROTTLE: 500,
  
  // 是否启用调试日志
  DEBUG: false
};

/**
 * 地图事件处理器
 */
const MapEventHandler = {
  /**
   * 初始化事件处理
   * @param {Object} options 配置选项
   */
  init(options = {}) {
    // 合并配置
    Object.assign(CONFIG, options);
    
    try {
      const map = MapInstanceManager.getMapInstance();
      if (!map) {
        console.error('初始化事件处理器失败: 地图实例不存在');
        return false;
      }
      
      // 注册基础事件
      this._registerBaseEvents(map);
      
      return true;
    } catch (err) {
      console.error('初始化事件处理器失败:', err);
      return false;
    }
  },
  
  /**
   * 注册地图点击事件
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   */
  onMapClick(callback, options = {}) {
    if (!callback || typeof callback !== 'function') return;
    
    try {
      const map = MapInstanceManager.getMapInstance();
      
      map.on('click', (e) => {
        // 如果正在拖动或刚结束拖动，不处理点击
        if (eventState.isDragging || 
            (Date.now() - eventState.lastDragEndTime < CONFIG.DRAG_CLICK_DELAY)) {
          if (CONFIG.DEBUG) console.log('忽略拖动过程中的点击');
          return;
        }
        
        // 记录最后点击时间
        eventState.lastClickTime = Date.now();
        
        // 保存点击事件
        eventState.pendingClick = {
          event: e,
          callback,
          options
        };
        
        // 使用节流处理点击事件
        if (!eventState.clickThrottleTimeout) {
          eventState.clickThrottleTimeout = setTimeout(() => {
            this._handlePendingClick();
            eventState.clickThrottleTimeout = null;
          }, CONFIG.CLICK_THROTTLE);
        }
      });
    } catch (err) {
      console.error('注册地图点击事件失败:', err);
    }
  },
  
  /**
   * 注册地图拖动事件
   * @param {Function} startCallback 开始拖动回调
   * @param {Function} endCallback 结束拖动回调
   */
  onMapDrag(startCallback, endCallback) {
    try {
      const map = MapInstanceManager.getMapInstance();
      
      if (startCallback && typeof startCallback === 'function') {
        map.on('dragstart', () => {
          eventState.isDragging = true;
          startCallback();
        });
      } else {
        map.on('dragstart', () => {
          eventState.isDragging = true;
        });
      }
      
      if (endCallback && typeof endCallback === 'function') {
        map.on('dragend', () => {
          eventState.isDragging = false;
          eventState.lastDragEndTime = Date.now();
          endCallback();
        });
      } else {
        map.on('dragend', () => {
          eventState.isDragging = false;
          eventState.lastDragEndTime = Date.now();
        });
      }
    } catch (err) {
      console.error('注册地图拖动事件失败:', err);
    }
  },
  
  /**
   * 注册地图缩放事件
   * @param {Function} callback 回调函数
   */
  onMapZoom(callback) {
    if (!callback || typeof callback !== 'function') return;
    
    try {
      const map = MapInstanceManager.getMapInstance();
      
      // 使用闭包实现节流
      let throttleTimer = null;
      
      map.on('zoomchange', () => {
        const now = Date.now();
        
        // 如果距离上次缩放时间太短，取消之前的回调并设置新的
        if (now - eventState.lastZoomTime < CONFIG.ZOOM_THROTTLE) {
          if (throttleTimer) {
            clearTimeout(throttleTimer);
            throttleTimer = null;
          }
        }
        
        // 更新最后缩放时间
        eventState.lastZoomTime = now;
        
        // 设置节流定时器
        if (!throttleTimer) {
          throttleTimer = setTimeout(() => {
            callback(map.getZoom());
            throttleTimer = null;
          }, CONFIG.ZOOM_THROTTLE);
        }
      });
    } catch (err) {
      console.error('注册地图缩放事件失败:', err);
    }
  },
  
  /**
   * 注册地图移动事件
   * @param {Function} callback 回调函数
   * @param {Object} options 选项
   * @param {Boolean} options.throttle 是否节流
   * @param {Number} options.throttleTime 节流时间间隔
   */
  onMapMove(callback, options = {}) {
    if (!callback || typeof callback !== 'function') return;
    
    try {
      const map = MapInstanceManager.getMapInstance();
      const { throttle = true, throttleTime = 300 } = options;
      
      if (throttle) {
        let lastCallTime = 0;
        let pending = false;
        
        map.on('mapmove', () => {
          const now = Date.now();
          
          if (!pending && now - lastCallTime > throttleTime) {
            // 直接执行
            callback(map.getCenter());
            lastCallTime = now;
          } else if (!pending) {
            // 设置延迟执行
            pending = true;
            setTimeout(() => {
              callback(map.getCenter());
              lastCallTime = Date.now();
              pending = false;
            }, throttleTime);
          }
        });
      } else {
        map.on('mapmove', () => {
          callback(map.getCenter());
        });
      }
    } catch (err) {
      console.error('注册地图移动事件失败:', err);
    }
  },
  
  /**
   * 注册区域变化事件
   * @param {Function} callback 回调函数
   */
  onRegionChange(callback) {
    if (!callback || typeof callback !== 'function') return;
    
    try {
      const map = MapInstanceManager.getMapInstance();
      
      // 使用节流优化频繁调用
      let throttleTimer = null;
      
      map.on('moveend', () => {
        // 取消之前的回调
        if (throttleTimer) {
          clearTimeout(throttleTimer);
        }
        
        // 设置新的回调
        throttleTimer = setTimeout(async () => {
          try {
            const bounds = map.getBounds();
            const region = {
              southwest: {
                longitude: bounds.getSouthWest().getLng(),
                latitude: bounds.getSouthWest().getLat()
              },
              northeast: {
                longitude: bounds.getNorthEast().getLng(),
                latitude: bounds.getNorthEast().getLat()
              },
              center: {
                longitude: map.getCenter().getLng(),
                latitude: map.getCenter().getLat()
              },
              zoom: map.getZoom()
            };
            
            await callback(region);
          } catch (err) {
            console.error('处理区域变化事件失败:', err);
          }
          
          throttleTimer = null;
        }, 200);
      });
    } catch (err) {
      console.error('注册区域变化事件失败:', err);
    }
  },
  
  /**
   * 处理等待中的点击事件
   * @private
   */
  _handlePendingClick() {
    if (!eventState.pendingClick) return;
    
    const { event, callback, options } = eventState.pendingClick;
    
    try {
      if (CONFIG.DEBUG) console.log('处理点击事件:', event);
      
      // 调用回调函数
      callback(event, options);
    } catch (err) {
      console.error('处理点击事件失败:', err);
    } finally {
      // 清理
      eventState.pendingClick = null;
    }
  },
  
  /**
   * 注册基础事件
   * @param {Object} map 地图实例
   * @private
   */
  _registerBaseEvents(map) {
    // 拖动开始
    map.on('dragstart', () => {
      eventState.isDragging = true;
      if (CONFIG.DEBUG) console.log('地图开始拖动');
    });
    
    // 拖动结束
    map.on('dragend', () => {
      eventState.isDragging = false;
      eventState.lastDragEndTime = Date.now();
      if (CONFIG.DEBUG) console.log('地图结束拖动');
    });
    
    // 缩放变化
    map.on('zoomchange', () => {
      eventState.lastZoomTime = Date.now();
      if (CONFIG.DEBUG) console.log('地图缩放级别变化:', map.getZoom());
    });
    
    // 注册地图加载完成事件
    map.on('complete', () => {
      if (CONFIG.DEBUG) console.log('地图加载完成');
    });
  }
};

export default MapEventHandler; 