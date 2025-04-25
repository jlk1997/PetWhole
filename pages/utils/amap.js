// 地图工具函数

// 格式化时长
export const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  let result = '';
  if (hours > 0) {
    result += `${hours}小时`;
  }
  if (minutes > 0 || hours > 0) {
    result += `${minutes}分钟`;
  }
  result += `${secs}秒`;
  
  return result;
};

// 计算配速
export const calculatePace = (distanceInMeters, durationInSeconds) => {
  if (!distanceInMeters || !durationInSeconds || distanceInMeters === 0) {
    return '0:00';
  }
  
  // 配速 = 分钟/公里
  const paceInSeconds = (durationInSeconds / (distanceInMeters / 1000));
  const paceMinutes = Math.floor(paceInSeconds / 60);
  const paceSeconds = Math.floor(paceInSeconds % 60);
  
  return `${paceMinutes}:${paceSeconds < 10 ? '0' : ''}${paceSeconds}`;
};

// 计算两点之间的距离
export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // 地球半径，单位米
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d;
}; 