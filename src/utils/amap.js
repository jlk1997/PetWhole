/**
 * 高德地图相关配置和工具函数
 */

// 高德地图 API Key，请替换为你自己申请的 Key
export const AMAP_KEY = '9ea84b4333b114c188a67cb42564a48f';

// 高德地图 Web API 服务地址
export const AMAP_WEB_API = 'https://restapi.amap.com/v3';

// 常用样式配置
export const MAP_STYLES = {
  walkingPath: {
    color: '#3B9E82',
    width: 6
  },
  currentLocation: {
    url: '/static/images/current-location.png',
    width: 40,
    height: 40
  },
  userMarker: {
    url: '/static/images/user-marker.png',
    width: 30,
    height: 30
  },
  petMarker: {
    url: '/static/images/pet-marker.png',
    width: 30,
    height: 30
  }
};

/**
 * 计算两点之间的距离（米）
 * @param {Number} lat1 起点纬度
 * @param {Number} lon1 起点经度
 * @param {Number} lat2 终点纬度
 * @param {Number} lon2 终点经度
 * @returns {Number} 距离，单位米
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径，单位米
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

/**
 * 角度转弧度
 * @param {Number} deg 角度
 * @returns {Number} 弧度
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * 格式化距离显示
 * @param {Number} distance 距离，单位米
 * @returns {String} 格式化后的距离
 */
export function formatDistance(distance) {
  if (distance < 1000) {
    return `${Math.round(distance)}米`;
  }
  return `${(distance / 1000).toFixed(2)}公里`;
}

/**
 * 格式化持续时间
 * @param {Number} seconds 秒数
 * @returns {String} 格式化后的时间
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`;
  }
  if (minutes > 0) {
    return `${minutes}分钟${secs}秒`;
  }
  return `${secs}秒`;
}

/**
 * 计算配速（分钟/公里）
 * @param {Number} distanceKm 距离，单位公里
 * @param {Number} durationSeconds 时间，单位秒
 * @returns {String} 配速，格式为 "x'xx""
 */
export function calculatePace(distanceKm, durationSeconds) {
  if (!distanceKm || !durationSeconds || distanceKm < 0.1 || durationSeconds < 60) {
    return '--\'--"';
  }
  
  const paceSeconds = durationSeconds / distanceKm;
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceRemainder = Math.floor(paceSeconds % 60);
  
  return `${paceMinutes}'${paceRemainder.toString().padStart(2, '0')}"`;
}

/**
 * 获取高德地图静态图URL
 * @param {Array} points 路径点数组，每个元素包含 latitude 和 longitude
 * @param {Object} options 可选参数
 * @returns {String} 静态图URL
 */
export function getStaticMapUrl(points, options = {}) {
  const defaultOptions = {
    width: 750,
    height: 350,
    zoom: 14,
    scale: 2
  };
  
  const config = { ...defaultOptions, ...options };
  
  if (!points || points.length < 2) {
    return '';
  }
  
  // 构建路径
  const path = points.map(p => `${p.longitude},${p.latitude}`).join(';');
  
  // 计算中心点
  const centerLat = points.reduce((sum, p) => sum + p.latitude, 0) / points.length;
  const centerLng = points.reduce((sum, p) => sum + p.longitude, 0) / points.length;
  
  return `${AMAP_WEB_API}/staticmap?location=${centerLng},${centerLat}&zoom=${config.zoom}&size=${config.width}*${config.height}&paths=10,0x3B9E82,1,,:${path}&key=${AMAP_KEY}&scale=${config.scale}`;
} 