/**
 * 宠物相关API
 */
import request from '@/utils/request.js'

const BASE_URL = '/pets'

export default {
  /**
   * 获取宠物列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回宠物列表
   */
  getPets(params) {
    return request({
      url: BASE_URL,
      method: 'GET',
      params
    }).then(response => {
      // 确保返回的数据结构是一致的，始终有data字段
      if (!response.data && Array.isArray(response)) {
        return { data: response };
      }
      return response;
    });
  },
  
  /**
   * 获取我的宠物列表
   * @returns {Promise} - 返回宠物列表
   */
  getMyPets() {
    return request({
      url: `${BASE_URL}/me`,
      method: 'GET'
    })
  },
  
  /**
   * 获取某用户的宠物列表
   * @param {String} userId - 用户ID
   * @returns {Promise} - 返回宠物列表
   */
  getUserPets(userId) {
    return request({
      url: `/users/${userId}/pets`,
      method: 'GET'
    })
  },
  
  /**
   * 获取宠物详情
   * @param {String} id - 宠物ID
   * @returns {Promise} - 返回宠物详情
   */
  getPetById(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'GET'
    })
  },
  
  /**
   * 创建宠物
   * @param {Object} data - 宠物数据
   * @returns {Promise} - 返回创建结果
   */
  createPet(data) {
    return request({
      url: BASE_URL,
      method: 'POST',
      data
    })
  },
  
  /**
   * 更新宠物
   * @param {String} id - 宠物ID
   * @param {Object} data - 宠物数据
   * @returns {Promise} - 返回更新结果
   */
  updatePet(id, data) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 删除宠物
   * @param {String} id - 宠物ID
   * @returns {Promise} - 返回删除结果
   */
  deletePet(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 上传宠物头像
   * @param {String} petId - 宠物ID
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadPetAvatar(petId, filePath) {
    return request({
      url: `${BASE_URL}/${petId}/avatar`,
      method: 'POST',
      data: {
        name: 'avatar',
        filePath
      }
    })
  },
  
  /**
   * 获取宠物品种列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回品种列表
   */
  getBreeds(params) {
    return request({
      url: `${BASE_URL}/breeds`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取宠物健康记录
   * @param {String} petId - 宠物ID
   * @returns {Promise} - 返回健康记录
   */
  getHealthRecords(petId) {
    return request({
      url: `${BASE_URL}/${petId}/health-records`,
      method: 'GET'
    })
  },
  
  /**
   * 添加健康记录
   * @param {String} petId - 宠物ID
   * @param {Object} data - 健康记录数据
   * @returns {Promise} - 返回添加结果
   */
  addHealthRecord(petId, data) {
    return request({
      url: `${BASE_URL}/${petId}/health-records`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 获取宠物运动数据
   * @param {String} petId - 宠物ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回运动数据
   */
  getActivityData(petId, params) {
    return request({
      url: `${BASE_URL}/${petId}/activities`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取附近宠物
   * @param {Object} params - 位置参数
   * @returns {Promise} - 返回附近宠物列表
   */
  getNearbyPets(params) {
    return request({
      url: `${BASE_URL}/nearby`,
      method: 'GET',
      params
    })
  }
} 