/**
 * 认证相关工具函数
 */

/**
 * 获取存储的token
 * @returns {String} token
 */
export const getToken = () => {
  return uni.getStorageSync('token');
};

/**
 * 设置token
 * @param {String} token 
 */
export const setToken = (token) => {
  uni.setStorageSync('token', token);
};

/**
 * 清除认证数据
 */
export const clearAuthData = () => {
  uni.removeStorageSync('token');
  uni.removeStorageSync('userInfo');
};

/**
 * 检查是否已登录
 * @returns {Boolean} 是否已登录
 */
export const isLoggedIn = () => {
  return !!getToken();
};

/**
 * 保存用户信息
 * @param {Object} userInfo 用户信息
 */
export const saveUserInfo = (userInfo) => {
  if (userInfo) {
    uni.setStorageSync('userInfo', JSON.stringify(userInfo));
  }
};

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
export const getUserInfo = () => {
  try {
    const userInfoStr = uni.getStorageSync('userInfo');
    return userInfoStr ? JSON.parse(userInfoStr) : null;
  } catch (e) {
    console.error('获取用户信息失败', e);
    return null;
  }
};

export default {
  getToken,
  setToken,
  clearAuthData,
  isLoggedIn,
  saveUserInfo,
  getUserInfo
}; 