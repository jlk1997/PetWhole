/**
 * 区域管理服务
 */

// 区域大小配置（米）
const AREA_SIZE = {
    width: 250,  // 区域宽度
    height: 250  // 区域高度
};

// 地球半径（米）
const EARTH_RADIUS = 6378137;

/**
 * 计算两点之间的距离（米）
 * @param {Array} point1 [longitude, latitude]
 * @param {Array} point2 [longitude, latitude]
 * @returns {number} 距离（米）
 */
function calculateDistance(point1, point2) {
    const [lon1, lat1] = point1;
    const [lon2, lat2] = point2;
    
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const radLon1 = (lon1 * Math.PI) / 180;
    const radLon2 = (lon2 * Math.PI) / 180;
    
    const a = radLat1 - radLat2;
    const b = radLon1 - radLon2;
    const s = 2 * Math.asin(Math.sqrt(Math.pow(Math.sin(a / 2), 2) + Math.cos(radLat1) * Math.cos(radLat2) * Math.pow(Math.sin(b / 2), 2)));
    
    return s * EARTH_RADIUS;
}

/**
 * 计算给定坐标点所在的区域ID
 * @param {number} longitude 经度
 * @param {number} latitude 纬度
 * @returns {string} 区域ID
 */
function calculateAreaId(longitude, latitude) {
    // 将经纬度转换为网格坐标
    const latGrid = Math.floor(latitude * EARTH_RADIUS / AREA_SIZE.height);
    const lonGrid = Math.floor(longitude * EARTH_RADIUS * Math.cos(latitude * Math.PI / 180) / AREA_SIZE.width);
    
    return `${latGrid}_${lonGrid}`;
}

/**
 * 计算区域的边界坐标
 * @param {string} areaId 区域ID
 * @returns {Object} 区域边界坐标
 */
function calculateAreaBounds(areaId) {
    const [latGrid, lonGrid] = areaId.split('_').map(Number);
    
    const centerLat = (latGrid * AREA_SIZE.height) / EARTH_RADIUS;
    const centerLon = (lonGrid * AREA_SIZE.width) / (EARTH_RADIUS * Math.cos(centerLat * Math.PI / 180));
    
    const latDelta = (AREA_SIZE.height / 2) / EARTH_RADIUS * 180 / Math.PI;
    const lonDelta = (AREA_SIZE.width / 2) / (EARTH_RADIUS * Math.cos(centerLat * Math.PI / 180)) * 180 / Math.PI;
    
    return {
        north: centerLat + latDelta,
        south: centerLat - latDelta,
        east: centerLon + lonDelta,
        west: centerLon - lonDelta,
        center: [centerLon, centerLat]
    };
}

/**
 * 获取指定坐标周围的区域ID列表
 * @param {number} longitude 经度
 * @param {number} latitude 纬度
 * @param {number} radius 半径（米）
 * @returns {Array} 区域ID列表
 */
function getNearbyAreaIds(longitude, latitude, radius) {
    const gridCount = Math.ceil(radius / AREA_SIZE.width);
    const areaIds = new Set();
    
    const centerAreaId = calculateAreaId(longitude, latitude);
    areaIds.add(centerAreaId);
    
    // 计算周围的网格
    for (let i = -gridCount; i <= gridCount; i++) {
        for (let j = -gridCount; j <= gridCount; j++) {
            const [latGrid, lonGrid] = centerAreaId.split('_').map(Number);
            const nearbyAreaId = `${latGrid + i}_${lonGrid + j}`;
            
            const bounds = calculateAreaBounds(nearbyAreaId);
            const distance = calculateDistance([longitude, latitude], bounds.center);
            
            if (distance <= radius) {
                areaIds.add(nearbyAreaId);
            }
        }
    }
    
    return Array.from(areaIds);
}

/**
 * 生成区域的多边形坐标
 * @param {string} areaId 区域ID
 * @returns {Array} 多边形坐标数组
 */
function generateAreaPolygon(areaId) {
    const bounds = calculateAreaBounds(areaId);
    
    return [[
        [bounds.west, bounds.north],
        [bounds.east, bounds.north],
        [bounds.east, bounds.south],
        [bounds.west, bounds.south],
        [bounds.west, bounds.north]
    ]];
}

/**
 * 检查坐标点是否在指定区域内
 * @param {number} longitude 经度
 * @param {number} latitude 纬度
 * @param {string} areaId 区域ID
 * @returns {boolean} 是否在区域内
 */
function isPointInArea(longitude, latitude, areaId) {
    const bounds = calculateAreaBounds(areaId);
    return latitude >= bounds.south &&
           latitude <= bounds.north &&
           longitude >= bounds.west &&
           longitude <= bounds.east;
}

module.exports = {
    AREA_SIZE,
    calculateDistance,
    calculateAreaId,
    calculateAreaBounds,
    getNearbyAreaIds,
    generateAreaPolygon,
    isPointInArea
}; 