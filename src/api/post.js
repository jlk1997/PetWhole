/**
 * 社区帖子相关API
 */
import request from '@/utils/request.js'

const BASE_URL = '/api/community'

export default {
  /**
   * 获取帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getPosts(params) {
    return request({
      url: BASE_URL,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取当前用户的帖子
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getMyPosts(params) {
    return request({
      url: `${BASE_URL}/me`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取某用户的帖子
   * @param {String} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getUserPosts(userId, params) {
    return request({
      url: `/api/users/${userId}/posts`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取帖子详情
   * @param {String} id - 帖子ID
   * @returns {Promise} - 返回帖子详情
   */
  getPostById(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'GET'
    })
  },
  
  /**
   * 创建帖子
   * @param {Object} data - 帖子数据
   * @returns {Promise} - 返回创建结果
   */
  createPost(data) {
    return request({
      url: BASE_URL,
      method: 'POST',
      data
    })
  },
  
  /**
   * 更新帖子
   * @param {String} id - 帖子ID
   * @param {Object} data - 帖子数据
   * @returns {Promise} - 返回更新结果
   */
  updatePost(id, data) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 删除帖子
   * @param {String} id - 帖子ID
   * @returns {Promise} - 返回删除结果
   */
  deletePost(id) {
    return request({
      url: `${BASE_URL}/${id}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 上传帖子图片
   * @param {String} postId - 帖子ID
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadPostImage(postId, filePath) {
    return request({
      url: `${BASE_URL}/${postId}/images`,
      method: 'POST',
      data: {
        name: 'image',
        filePath
      }
    })
  },
  
  /**
   * 给帖子点赞
   * @param {String} id - 帖子ID
   * @returns {Promise} - 返回点赞结果
   */
  likePost(id) {
    return request({
      url: `${BASE_URL}/${id}/like`,
      method: 'POST'
    })
  },
  
  /**
   * 取消帖子点赞
   * @param {String} id - 帖子ID
   * @returns {Promise} - 返回取消结果
   */
  unlikePost(id) {
    return request({
      url: `${BASE_URL}/${id}/unlike`,
      method: 'POST'
    })
  },
  
  /**
   * 获取帖子评论
   * @param {String} postId - 帖子ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回评论列表
   */
  getComments(postId, params) {
    return request({
      url: `${BASE_URL}/${postId}/comments`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 添加评论
   * @param {String} postId - 帖子ID
   * @param {Object} data - 评论内容
   * @returns {Promise} - 返回添加结果
   */
  createComment(postId, data) {
    return request({
      url: `${BASE_URL}/${postId}/comments`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 删除评论
   * @param {String} postId - 帖子ID
   * @param {String} commentId - 评论ID
   * @returns {Promise} - 返回删除结果
   */
  deleteComment(postId, commentId) {
    return request({
      url: `${BASE_URL}/${postId}/comments/${commentId}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 获取热门话题
   * @returns {Promise} - 返回话题列表
   */
  getTopics() {
    return request({
      url: `${BASE_URL}/topics`,
      method: 'GET'
    })
  },
  
  /**
   * 获取某话题下的帖子
   * @param {String} topicId - 话题ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getPostsByTopic(topicId, params) {
    return request({
      url: `${BASE_URL}/topics/${topicId}`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取帖子类别
   * @returns {Promise} - 返回类别列表
   */
  getCategories() {
    return request({
      url: `${BASE_URL}/categories`,
      method: 'GET'
    })
  },
  
  /**
   * 举报帖子
   * @param {String} postId - 帖子ID
   * @param {Object} data - 举报数据
   * @returns {Promise} - 返回举报结果
   */
  reportPost(postId, data) {
    return request({
      url: `${BASE_URL}/${postId}/report`,
      method: 'POST',
      data
    })
  }
} 