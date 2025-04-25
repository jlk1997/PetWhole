/**
 * 用户认证相关API
 */
import request from '@/utils/request.js'
import config from '@/config/index.js'

// 使用配置中的API路径前缀
const BASE_URL = config.API_PREFIX.AUTH

export default {
  /**
   * 用户登录
   * @param {Object} data - 登录信息
   * @returns {Promise} - 返回登录结果
   */
  login(data) {
    return request({
      url: `${BASE_URL}/login`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 用户注册
   * @param {Object} data - 注册信息
   * @returns {Promise} - 返回注册结果
   */
  register(data) {
    return request({
      url: `${BASE_URL}/register`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 获取当前登录用户信息
   * @returns {Promise} - 返回用户信息
   */
  getCurrentUser() {
    return request({
      url: `${BASE_URL}/me`,
      method: 'GET'
    })
  },
  
  /**
   * 更新用户信息
   * @param {Object} data - 用户信息
   * @returns {Promise} - 返回更新结果
   */
  updateUserProfile(data) {
    return request({
      url: '/users/me',
      method: 'PUT',
      data
    })
  },
  
  /**
   * 上传用户头像
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadAvatar(filePath) {
    return request({
      url: '/uploads/avatars',
      method: 'POST',
      data: {
        name: 'avatar',
        filePath
      }
    })
  },
  
  /**
   * 修改密码
   * @param {Object} data - 包含旧密码和新密码
   * @returns {Promise} - 返回修改结果
   */
  changePassword(data) {
    return request({
      url: `${BASE_URL}/change-password`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 请求重置密码
   * @param {Object} data - 包含邮箱信息
   * @returns {Promise} - 返回发送结果
   */
  requestPasswordReset(data) {
    return request({
      url: `${BASE_URL}/forgot-password`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 验证邮箱
   * @param {String} token - 验证令牌
   * @returns {Promise} - 返回验证结果
   */
  verifyEmail(token) {
    return request({
      url: `${BASE_URL}/verify-email/${token}`,
      method: 'POST'
    })
  },
  
  /**
   * 刷新令牌
   * @param {String} refreshToken - 刷新令牌
   * @returns {Promise} - 返回新令牌
   */
  refreshToken(refreshToken) {
    return request({
      url: `${BASE_URL}/refresh-token`,
      method: 'POST',
      data: { refreshToken }
    })
  },
  
  /**
   * 用户登出
   * @returns {Promise} - 返回登出结果
   */
  logout() {
    return request({
      url: `${BASE_URL}/logout`,
      method: 'POST'
    })
  },
  
  /**
   * 发送验证码
   * @param {Object} data - 包含联系方式
   * @returns {Promise} - 返回发送结果
   */
  sendVerificationCode(data) {
    return request({
      url: `${BASE_URL}/send-code`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 验证手机号码
   * @param {Object} data - 包含手机和验证码
   * @returns {Promise} - 返回验证结果
   */
  verifyPhone(data) {
    return request({
      url: `${BASE_URL}/verify-phone`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 第三方登录
   * @param {String} provider - 提供商(weixin,qq等)
   * @param {Object} data - 授权数据
   * @returns {Promise} - 返回登录结果
   */
  socialLogin(provider, data) {
    return request({
      url: `${BASE_URL}/${provider}`,
      method: 'POST',
      data
    })
  }
} 