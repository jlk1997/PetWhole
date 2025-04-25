/**
 * 位置相关API
 */
import request from '@/utils/request.js'

const BASE_URL = '/locations'

export default {
  /**
   * 获取附近的用户位置
   * @param {Object} params - 位置参数，包含经纬度和范围
   * @returns {Promise} - 返回附近用户列表
   */
  getNearbyUsers(params) {
    return request({
      url: `${BASE_URL}/nearby`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 更新当前用户位置
   * @param {Object} data - 位置数据
   * @returns {Promise} - 返回更新结果
   */
  updateLocation(data) {
    return request({
      url: `${BASE_URL}/update`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 开启/关闭位置共享
   * @param {Object} data - 共享状态数据
   * @returns {Promise} - 返回更新结果
   */
  toggleLocationSharing(data) {
    return request({
      url: `${BASE_URL}/sharing`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 获取用户的位置共享状态
   * @returns {Promise} - 返回位置共享状态
   */
  getLocationSharingStatus() {
    return request({
      url: `${BASE_URL}/sharing`,
      method: 'GET'
    })
  },
  
  /**
   * 保存遛狗轨迹记录
   * @param {Object} data - 轨迹数据
   * @returns {Promise} - 返回保存结果
   */
  saveWalkRecord(data) {
    return request({
      url: `${BASE_URL}/walks`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 获取遛狗轨迹历史
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回轨迹历史
   */
  getWalkHistory(params) {
    return request({
      url: `${BASE_URL}/walks`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取单次遛狗记录详情
   * @param {String} recordId - 记录ID
   * @returns {Promise} - 返回记录详情
   */
  getWalkRecordDetail(recordId) {
    return request({
      url: `${BASE_URL}/walks/${recordId}`,
      method: 'GET'
    })
  },
  
  /**
   * 删除遛狗记录
   * @param {String} recordId - 记录ID
   * @returns {Promise} - 返回删除结果
   */
  deleteWalkRecord(recordId) {
    return request({
      url: `${BASE_URL}/walks/${recordId}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 获取常去的遛狗地点
   * @returns {Promise} - 返回常去地点列表
   */
  getFrequentLocations() {
    return request({
      url: `${BASE_URL}/frequent`,
      method: 'GET'
    })
  },
  
  /**
   * 添加常去的遛狗地点
   * @param {Object} data - 地点数据
   * @returns {Promise} - 返回添加结果
   */
  addFrequentLocation(data) {
    return request({
      url: `${BASE_URL}/frequent`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 删除常去的遛狗地点
   * @param {String} locationId - 地点ID
   * @returns {Promise} - 返回删除结果
   */
  deleteFrequentLocation(locationId) {
    return request({
      url: `${BASE_URL}/frequent/${locationId}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 开始遛狗
   * @param {Object} data - 遛狗数据，可能包含宠物ID等
   * @returns {Promise} - 返回开始结果
   */
  startWalking(data) {
    return request({
      url: `${BASE_URL}/start-walking`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 结束遛狗
   * @param {Object} data - 遛狗数据，可能包含距离、时长等
   * @returns {Promise} - 返回结束结果
   */
  stopWalking(data) {
    return request({
      url: `${BASE_URL}/stop-walking`,
      method: 'PUT',
      data
    })
  }
} 