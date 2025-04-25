/**
 * 遛狗记录相关API
 */
import request from '@/utils/request.js'

const BASE_URL = '/walks'

export default {
  /**
   * 获取遛狗记录列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回遛狗记录列表
   */
  getWalkRecords(params) {
    return request({
      url: BASE_URL,
      method: 'GET',
      params
    }).then(response => {
      // 确保响应格式正确，处理不同的API格式
      if (response && !response.data && Array.isArray(response)) {
        return { data: response };
      }
      return response;
    }).catch(error => {
      console.error('获取遛狗记录失败', error);
      return { data: [] };
    });
  },
  
  /**
   * 获取我的遛狗记录
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回遛狗记录列表
   */
  getMyWalkRecords(params) {
    return request({
      url: `${BASE_URL}/me`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取某用户的遛狗记录
   * @param {String} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回遛狗记录列表
   */
  getUserWalkRecords(userId, params) {
    return request({
      url: `${BASE_URL}/user/${userId}`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取宠物的遛狗记录
   * @param {String} petId - 宠物ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回遛狗记录列表
   */
  getPetWalkRecords(petId, params) {
    return request({
      url: `${BASE_URL}/pet/${petId}`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取遛狗记录详情
   * @param {String} id - 记录ID
   * @returns {Promise} - 返回遛狗记录详情
   */
  getWalkRecordById(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'GET'
    })
  },
  
  /**
   * 创建遛狗记录
   * @param {Object} data - 记录数据
   * @returns {Promise} - 返回创建结果
   */
  createWalkRecord(data) {
    return request({
      url: BASE_URL,
      method: 'POST',
      data
    })
  },
  
  /**
   * 更新遛狗记录
   * @param {String} id - 记录ID
   * @param {Object} data - 记录数据
   * @returns {Promise} - 返回更新结果
   */
  updateWalkRecord(id, data) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 删除遛狗记录
   * @param {String} id - 记录ID
   * @returns {Promise} - 返回删除结果
   */
  deleteWalkRecord(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 获取遛狗统计数据
   * @param {Object} params - 查询参数 (可指定时间范围等)
   * @returns {Promise} - 返回统计数据
   */
  getWalkStats(params) {
    return request({
      url: `${BASE_URL}/stats`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取宠物的遛狗统计数据
   * @param {String} petId - 宠物ID
   * @param {Object} params - 查询参数 (可指定时间范围等)
   * @returns {Promise} - 返回统计数据
   */
  getPetWalkStats(petId, params) {
    return request({
      url: `${BASE_URL}/pet/${petId}/stats`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取用户的遛狗统计数据
   * @param {String} userId - 用户ID
   * @returns {Promise} - 返回统计数据
   */
  getUserWalkStats(userId) {
    return request({
      url: `/users/${userId}/walk-stats`,
      method: 'GET'
    })
  },
  
  /**
   * 获取附近的遛狗记录
   * @param {Object} params - 查询参数 (经纬度、半径等)
   * @returns {Promise} - 返回遛狗记录列表
   */
  getNearbyWalks(params) {
    return request({
      url: `${BASE_URL}/nearby`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 分享遛狗记录
   * @param {String} id - 记录ID
   * @param {Object} data - 分享相关数据
   * @returns {Promise} - 返回分享结果
   */
  shareWalkRecord(id, data) {
    return request({
      url: `${BASE_URL}/${id}/share`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 上传遛狗记录照片
   * @param {String} walkId - 遛狗记录ID
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadWalkPhoto(walkId, filePath) {
    return request({
      url: `${BASE_URL}/${walkId}/photos`,
      method: 'POST',
      data: {
        name: 'photo',
        filePath
      }
    })
  }
} 