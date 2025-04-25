/**
 * 请求封装工具
 */
import config from '@/config/index.js'

// 请求超时时间（毫秒）
const TIMEOUT = config.TIMEOUT || 30000
const BASE_URL = config.BASE_API_URL || 'http://localhost:5000'

/**
 * 请求封装函数
 */
const request = (options) => {
  // 获取token
  const token = uni.getStorageSync('token')
  
  // 添加调试日志
  console.log('Request options:', {
    url: options.url,
    method: options.method,
    hasToken: !!token
  })
  
  // 设置请求头
  if (!options.header) {
    options.header = {}
  }
  
  // 如果有token，添加到请求头
  if (token) {
    options.header['Authorization'] = `Bearer ${token}`
  }
  
  // 默认添加Content-Type
  if (!options.header['Content-Type']) {
    options.header['Content-Type'] = 'application/json'
  }
  
  // 拼接完整请求路径
  if (options.url.indexOf('http') !== 0) {
    // 如果URL不是以/开头，添加/
    if (options.url.indexOf('/') !== 0) {
      options.url = '/' + options.url;
    }
    
    // 构建完整API URL
    options.url = BASE_URL + options.url;
    console.log('Full Request URL:', options.url)
  }
  
  // 添加超时时间
  options.timeout = TIMEOUT
  
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => {
        console.log(`API响应 (${options.url}):`, res);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          const error = new Error(res.data?.message || '请求失败')
          error.statusCode = res.statusCode
          error.data = res.data
          
          // 401未授权，可能是token过期
          if (res.statusCode === 401) {
            // 清除token
            console.warn('认证失败，清除token')
            uni.removeStorageSync('token')
            uni.removeStorageSync('userInfo')
            
            // 跳转到登录页
            uni.reLaunch({
              url: '/pages/login/login'
            })
          }
          
          reject(error)
        }
      },
      fail: (err) => {
        console.error('请求失败:', err, '请求URL:', options.url)
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

// 导出请求函数
export default request 