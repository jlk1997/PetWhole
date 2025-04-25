/**
 * 用户相关API
 */
import request from '@/utils/request.js'
import { handleResponse } from '@/utils/request.js'
import config from '@/config/index.js'

// 使用配置中的API路径前缀
const BASE_URL = config.API_PREFIX.USERS

export default {
  /**
   * 用户登录
   * @param {Object} data - 登录数据
   * @returns {Promise} - 返回登录结果
   */
  async login(data) {
    const response = await request({
      url: `${BASE_URL}/login`,
      method: 'POST',
      data
    })
    return handleResponse(response)
  },
  
  /**
   * 用户注册
   * @param {Object} data - 注册数据
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
  getUserInfo() {
    return request({
      url: `${BASE_URL}/me`,
      method: 'GET'
    })
  },
  
  /**
   * 更新用户信息
   * @param {Object} data - 用户信息数据
   * @returns {Promise} - 返回更新结果
   */
  updateUserInfo(data) {
    return request({
      url: `${BASE_URL}/me`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 获取用户详情
   * @param {String} id - 用户ID
   * @returns {Promise} - 返回用户信息
   */
  getUserById(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'GET'
    })
  },
  
  /**
   * 获取用户统计信息
   * @param {String} userId - 用户ID，不传则获取当前用户
   * @returns {Promise} - 返回用户统计信息
   */
  getUserStats(userId) {
    const url = userId 
      ? `${BASE_URL}/${userId}/stats` 
      : `${BASE_URL}/stats/me`;
    return request({
      url,
      method: 'GET'
    })
  },
  
  /**
   * 上传用户头像
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadAvatar(filePath) {
    return request({
      url: `${BASE_URL}/me/avatar`,
      method: 'POST',
      data: {
        name: 'avatar',
        filePath
      }
    })
  },
  
  /**
   * 关注用户
   * @param {String} id - 要关注的用户ID
   * @returns {Promise} - 返回关注结果
   */
  followUser(id) {
    return request({
      url: `${BASE_URL}/follow/${id}`,
      method: 'POST'
    })
  },
  
  /**
   * 取消关注用户
   * @param {String} id - 要取消关注的用户ID
   * @returns {Promise} - 返回取消关注结果
   */
  unfollowUser(id) {
    return request({
      url: `${BASE_URL}/follow/${id}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 获取用户的关注列表
   * @param {String} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回关注列表
   */
  getFollowings(userId, params) {
    return request({
      url: `${BASE_URL}/${userId}/following`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取用户的粉丝列表
   * @param {String} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回粉丝列表
   */
  getFollowers(userId, params) {
    return request({
      url: `${BASE_URL}/${userId}/followers`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 修改密码
   * @param {Object} data - 密码数据
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
   * 忘记密码
   * @param {Object} data - 忘记密码数据
   * @returns {Promise} - 返回结果
   */
  forgotPassword(data) {
    return request({
      url: `${BASE_URL}/forgot-password`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 重置密码
   * @param {Object} data - 重置密码数据
   * @returns {Promise} - 返回结果
   */
  resetPassword(data) {
    return request({
      url: `${BASE_URL}/reset-password`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 退出登录
   * @returns {Promise} - 返回结果
   */
  logout() {
    return request({
      url: `${BASE_URL}/logout`,
      method: 'POST'
    })
  },
  
  /**
   * 搜索用户
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回搜索结果
   */
  searchUsers(params) {
    return request({
      url: `${BASE_URL}/search`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取附近的用户
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回附近用户列表
   */
  getNearbyUsers(params) {
    return request({
      url: `${BASE_URL}/nearby`,
      method: 'GET',
      params
    })
  }
} 