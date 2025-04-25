/**
 * API服务模块 - 同步方式定义所有API服务
 */
import request from '@/utils/request.js';

// 用户认证相关API
export const authAPI = {
  register: (userData) => request({
    url: '/users/register',
    method: 'POST',
    data: userData
  }),
  login: (credentials) => request({
    url: '/users/login',
    method: 'POST',
    data: credentials
  }),
  getUserProfile: () => request({
    url: '/users/me',
    method: 'GET'
  }),
  updateProfile: (userData) => request({
    url: '/users/me',
    method: 'PUT',
    data: userData
  }),
  getUserById: (userId) => request({
    url: `/users/${userId}`,
    method: 'GET'
  }),
  uploadAvatar: (filePath) => request({
    url: '/users/avatar',
    method: 'POST',
    header: {
      'Content-Type': 'multipart/form-data'
    },
    data: {
      name: 'avatar',
      filePath
    }
  })
};

// 宠物相关API
export const petAPI = {
  // 获取用户的宠物列表
  getPets: () => request({
    url: '/pets',
    method: 'GET'
  }),
  
  // 获取单个宠物详情
  getPetDetail: (petId) => request({
    url: `/pets/${petId}`,
    method: 'GET'
  }),
  
  // 添加宠物
  addPet: (data) => request({
    url: '/pets',
    method: 'POST',
    data
  }),
  
  // 更新宠物信息
  updatePet: (petId, data) => request({
    url: `/pets/${petId}`,
    method: 'PUT',
    data
  }),
  
  // 删除宠物
  deletePet: (petId) => request({
    url: `/pets/${petId}`,
    method: 'DELETE'
  }),
  
  // 上传宠物头像
  uploadPetAvatar: (petId, filePath) => request({
    url: `/pets/${petId}/avatar`,
    method: 'POST',
    header: {
      'Content-Type': 'multipart/form-data'
    },
    data: {
      name: 'avatar',
      filePath
    }
  }),
  
  // 获取宠物健康记录
  getPetHealthRecords: (petId, params) => request({
    url: `/pets/${petId}/health-records`,
    method: 'GET',
    params
  }),
  
  // 添加宠物健康记录
  addPetHealthRecord: (petId, data) => request({
    url: `/pets/${petId}/health-records`,
    method: 'POST',
    data
  }),
  
  // 获取宠物遛狗记录
  getPetWalkRecords: (petId, params) => request({
    url: `/pets/${petId}/walk-records`,
    method: 'GET',
    params
  }),
  
  // 根据用户ID获取宠物列表
  getPetsByUserId: (userId) => request({
    url: `/pets/user/${userId}`,
    method: 'GET'
  })
};

// 位置相关API
export const locationAPI = {
  // 获取附近的用户位置
  getNearbyUsers: (params) => request({
    url: '/locations/nearby',
    method: 'GET',
    params
  }),
  
  // 更新当前用户位置
  updateLocation: (data) => request({
    url: '/locations/update',
    method: 'PUT',
    data
  }),
  
  // 开启/关闭位置共享
  toggleLocationSharing: (data) => request({
    url: '/locations/sharing',
    method: 'PUT',
    data
  }),
  
  // 获取用户的位置共享状态
  getLocationSharingStatus: () => request({
    url: '/locations/sharing',
    method: 'GET'
  }),
  
  // 保存遛狗轨迹记录
  saveWalkRecord: (data) => request({
    url: '/locations/walks',
    method: 'POST',
    data
  }),
  
  // 获取遛狗轨迹历史
  getWalkHistory: (params) => request({
    url: '/locations/walks',
    method: 'GET',
    params
  }),
  
  // 获取单次遛狗记录详情
  getWalkRecordDetail: (recordId) => request({
    url: `/locations/walks/${recordId}`,
    method: 'GET'
  }),
  
  // 删除遛狗记录
  deleteWalkRecord: (recordId) => request({
    url: `/locations/walks/${recordId}`,
    method: 'DELETE'
  }),
  
  // 获取常去的遛狗地点
  getFrequentLocations: () => request({
    url: '/locations/frequent',
    method: 'GET'
  }),
  
  // 添加常去的遛狗地点
  addFrequentLocation: (data) => request({
    url: '/locations/frequent',
    method: 'POST',
    data
  }),
  
  // 删除常去的遛狗地点
  deleteFrequentLocation: (locationId) => request({
    url: `/locations/frequent/${locationId}`,
    method: 'DELETE'
  }),
  
  // 开始遛狗
  startWalking: (data) => request({
    url: '/locations/start-walking',
    method: 'PUT',
    data
  }),
  
  // 结束遛狗
  stopWalking: (data) => request({
    url: '/locations/stop-walking',
    method: 'PUT',
    data
  })
};

// 社区相关API
export const communityAPI = {
  getPosts: (params) => request({
    url: '/community/posts',
    method: 'GET',
    params
  }),
  getPostById: (id) => request({
    url: `/community/posts/${id}`,
    method: 'GET'
  }),
  createPost: (postData) => request({
    url: '/community/posts',
    method: 'POST',
    data: postData
  }),
  likePost: (id) => request({
    url: `/community/posts/${id}/like`,
    method: 'POST'
  }),
  commentOnPost: (id, comment) => request({
    url: `/community/posts/${id}/comment`,
    method: 'POST',
    data: { content: comment }
  }),
  getNearbyPosts: (params) => request({
    url: '/community/posts/nearby',
    method: 'GET',
    params
  })
}; 