/**
 * 路由相关钩子函数
 */

/**
 * 获取路由实例
 * @returns {Object} 路由实例
 */
export function useRouter() {
  return {
    /**
     * 页面跳转
     * @param {String} url - 页面路径
     * @param {Object} params - 参数
     */
    push(url, params = {}) {
      const query = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
      const targetUrl = query ? `${url}?${query}` : url;
      uni.navigateTo({
        url: targetUrl
      });
    },
    
    /**
     * 页面重定向
     * @param {String} url - 页面路径
     * @param {Object} params - 参数
     */
    replace(url, params = {}) {
      const query = Object.keys(params).map(key => `${key}=${encodeURIComponent(params[key])}`).join('&');
      const targetUrl = query ? `${url}?${query}` : url;
      uni.redirectTo({
        url: targetUrl
      });
    },
    
    /**
     * 页面返回
     * @param {Number} delta - 返回的页面数
     */
    back(delta = 1) {
      uni.navigateBack({
        delta
      });
    },
    
    /**
     * 切换到Tab页面
     * @param {String} url - 页面路径
     */
    switchTab(url) {
      uni.switchTab({
        url
      });
    },
    
    /**
     * 重启应用
     * @param {String} url - 页面路径
     */
    reLaunch(url) {
      uni.reLaunch({
        url
      });
    }
  };
}

/**
 * 获取当前页面路由信息
 * @returns {Object} 当前页面路由信息
 */
export function useRoute() {
  const pages = getCurrentPages();
  const currentPage = pages[pages.length - 1];
  
  return {
    path: `/${currentPage.route}`,
    fullPath: `/${currentPage.route}${currentPage.$page?.fullPath || ''}`,
    query: currentPage.$page?.query || {},
    params: currentPage.$page?.params || {}
  };
} 