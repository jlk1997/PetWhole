/**
 * UI辅助函数
 */

/**
 * 显示消息提示框
 * @param {String|Object} options - 提示内容或配置对象
 */
export const showToast = (options) => {
  if (typeof options === 'string') {
    uni.showToast({
      title: options,
      icon: 'none',
      duration: 2000
    });
  } else {
    uni.showToast({
      title: options.title || '',
      icon: options.icon || 'none',
      duration: options.duration || 2000,
      ...options
    });
  }
};

/**
 * 显示加载提示框
 * @param {String} title - 提示内容
 */
export const showLoading = (title = '加载中...') => {
  uni.showLoading({
    title,
    mask: true
  });
};

/**
 * 隐藏加载提示框
 */
export const hideLoading = () => {
  uni.hideLoading();
};

/**
 * 显示模态弹窗
 * @param {Object} options - 配置对象
 * @returns {Promise} 返回Promise
 */
export const showModal = (options) => {
  return new Promise((resolve) => {
    uni.showModal({
      title: options.title || '提示',
      content: options.content || '',
      showCancel: options.showCancel !== false,
      cancelText: options.cancelText || '取消',
      confirmText: options.confirmText || '确定',
      confirmColor: options.confirmColor || '#3B9E82',
      cancelColor: options.cancelColor || '#999999',
      success: (res) => {
        if (res.confirm) {
          resolve(true);
        } else {
          resolve(false);
        }
      },
      fail: () => {
        resolve(false);
      }
    });
  });
};

/**
 * 导航到指定页面
 * @param {String} url - 页面路径
 * @param {Object} params - URL参数
 * @returns {Promise} 返回Promise
 */
export const navigateTo = (url, params = {}) => {
  // 确保URL以/开头
  if (url && !url.startsWith('/')) {
    url = '/' + url;
  }
  
  // 添加参数到URL
  if (Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }
  
  return new Promise((resolve, reject) => {
    uni.navigateTo({
      url,
      success: resolve,
      fail: (err) => {
        console.error('导航失败:', err);
        
        // 尝试使用switchTab导航（如果是tabBar页面）
        if (err.errMsg && err.errMsg.includes('tabbar')) {
          uni.switchTab({
            url,
            success: resolve,
            fail: reject
          });
        } else {
          reject(err);
        }
      }
    });
  });
};

/**
 * 返回上一页
 * @param {Number} delta - 返回的页面数，默认1
 * @returns {Promise} 返回Promise
 */
export const navigateBack = (delta = 1) => {
  return new Promise((resolve, reject) => {
    uni.navigateBack({
      delta,
      success: resolve,
      fail: (err) => {
        console.error('返回失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 重定向到指定页面
 * @param {String} url - 页面路径
 * @param {Object} params - URL参数
 * @returns {Promise} 返回Promise
 */
export const redirectTo = (url, params = {}) => {
  // 确保URL以/开头
  if (url && !url.startsWith('/')) {
    url = '/' + url;
  }
  
  // 添加参数到URL
  if (Object.keys(params).length > 0) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    
    url = url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
  }
  
  return new Promise((resolve, reject) => {
    uni.redirectTo({
      url,
      success: resolve,
      fail: (err) => {
        console.error('重定向失败:', err);
        reject(err);
      }
    });
  });
};

/**
 * 切换到tabBar页面
 * @param {String} url - tabBar页面路径
 * @returns {Promise} 返回Promise
 */
export const switchTab = (url) => {
  // 确保URL以/开头
  if (url && !url.startsWith('/')) {
    url = '/' + url;
  }
  
  return new Promise((resolve, reject) => {
    uni.switchTab({
      url,
      success: resolve,
      fail: (err) => {
        console.error('切换Tab失败:', err);
        reject(err);
      }
    });
  });
};

export default {
  showToast,
  showLoading,
  hideLoading,
  showModal,
  navigateTo,
  navigateBack,
  redirectTo,
  switchTab
}; 