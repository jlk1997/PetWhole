/**
 * Map utility functions for formatting duration, calculating pace and distance
 */

/**
 * Format seconds into a human-readable duration string
 * @param {Number} seconds - Duration in seconds
 * @returns {String} Formatted duration (e.g. "1小时30分" or "5分钟")
 */
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}小时${minutes}分`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

/**
 * Calculate pace (time per kilometer) based on distance and duration
 * @param {Number} distance - Distance in meters
 * @param {Number} duration - Duration in seconds
 * @returns {String} Formatted pace (e.g. "5'30"/km")
 */
export const calculatePace = (distance, duration) => {
  if (!distance || distance === 0) return '--\'--"/km';
  
  // Calculate pace in seconds per kilometer
  const paceSeconds = (duration / (distance / 1000));
  
  // Format pace as MM'SS"/km
  const paceMinutes = Math.floor(paceSeconds / 60);
  const paceSecondsRemainder = Math.floor(paceSeconds % 60);
  
  return `${paceMinutes}'${paceSecondsRemainder.toString().padStart(2, '0')}"/km`;
};

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {Number} lat1 - Latitude of point 1
 * @param {Number} lon1 - Longitude of point 1
 * @param {Number} lat2 - Latitude of point 2
 * @param {Number} lon2 - Longitude of point 2
 * @returns {Number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  
  return distance;
};

/**
 * Convert degrees to radians
 * @param {Number} deg - Degrees
 * @returns {Number} Radians
 */
const deg2rad = (deg) => {
  return deg * (Math.PI/180);
};

/**
 * Get the current location using UniApp's API
 * @returns {Promise} Promise that resolves to a location object {latitude, longitude}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    uni.getLocation({
      type: 'gcj02', // GCJ-02 coordinate system (required for China)
      success: (res) => {
        resolve({
          latitude: res.latitude,
          longitude: res.longitude
        });
      },
      fail: (err) => {
        console.error('获取位置失败', err);
        reject(err);
      }
    });
  });
}; 