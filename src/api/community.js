/**
 * 社区相关API
 */
import request from '@/utils/request.js'

const BASE_URL = '/community'

export default {
  /**
   * 获取社区帖子列表
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getPosts(params) {
    return request({
      url: `${BASE_URL}/posts`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取帖子详情
   * @param {String} postId - 帖子ID
   * @returns {Promise} - 返回帖子详情
   */
  getPostDetail(postId) {
    return request({
      url: `${BASE_URL}/posts/${postId}`,
      method: 'GET'
    })
  },
  
  /**
   * 创建帖子
   * @param {Object} data - 帖子数据
   * @returns {Promise} - 返回创建结果
   */
  createPost(data) {
    console.log('发送创建帖子请求:', data);
    return request({
      url: `${BASE_URL}/posts`,
      method: 'POST',
      data
    })
  },
  
  /**
   * 上传帖子图片
   * @param {String} postId - 帖子ID
   * @param {String} filePath - 文件路径
   * @returns {Promise} - 返回上传结果
   */
  uploadPostImage(postId, filePath) {
    console.log('上传图片到帖子:', postId, filePath);
    return uni.uploadFile({
      url: `${BASE_URL}/posts/${postId}/image`,
      filePath: filePath,
      name: 'image',
      header: {
        'Authorization': `Bearer ${uni.getStorageSync('token')}`
      }
    });
  },
  
  /**
   * 删除帖子
   * @param {String} postId - 帖子ID
   * @returns {Promise} - 返回删除结果
   */
  deletePost(postId) {
    return request({
      url: `${BASE_URL}/posts/${postId}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 更新帖子
   * @param {String} postId - 帖子ID
   * @param {Object} data - 帖子数据
   * @returns {Promise} - 返回更新结果
   */
  updatePost(postId, data) {
    return request({
      url: `${BASE_URL}/posts/${postId}`,
      method: 'PUT',
      data
    })
  },
  
  /**
   * 点赞/取消点赞帖子
   * @param {String} postId - 帖子ID
   * @param {Boolean} isLike - 是否点赞
   * @returns {Promise} - 返回操作结果
   */
  likePost(postId, isLike) {
    return request({
      url: `${BASE_URL}/posts/${postId}/like`,
      method: 'POST',
      data: { isLike }
    })
  },
  
  /**
   * 添加评论
   * @param {String} postId - 帖子ID
   * @param {Object} data - 评论数据
   * @returns {Promise} - 返回添加结果
   */
  addComment(postId, data) {
    return request({
      url: `${BASE_URL}/posts/${postId}/comment`,
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
      url: `${BASE_URL}/posts/${postId}/comment/${commentId}`,
      method: 'DELETE'
    })
  },
  
  /**
   * 获取热门话题
   * @returns {Promise} - 返回热门话题列表
   */
  getHotTopics() {
    return request({
      url: `${BASE_URL}/topics/hot`,
      method: 'GET'
    })
  },
  
  /**
   * 获取话题下的帖子
   * @param {String} topicId - 话题ID
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getTopicPosts(topicId, params) {
    return request({
      url: `${BASE_URL}/topics/${topicId}/posts`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取用户发布的帖子
   * @param {String} userId - 用户ID，不传则获取当前用户
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getUserPosts(userId, params) {
    const url = userId ? `${BASE_URL}/posts/user/${userId}` : `${BASE_URL}/posts/user/me`
    return request({
      url,
      method: 'GET',
      params
    })
  },
  
  /**
   * 获取用户点赞的帖子
   * @param {Object} params - 查询参数
   * @returns {Promise} - 返回帖子列表
   */
  getLikedPosts(params) {
    return request({
      url: `${BASE_URL}/posts/liked`,
      method: 'GET',
      params
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
      url: `${BASE_URL}/posts/${postId}/report`,
      method: 'POST',
      data
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
      url: `${BASE_URL}/posts/${postId}/comments`,
      method: 'GET',
      params
    })
  },
  
  /**
   * 取消点赞帖子
   * @param {String} postId - 帖子ID
   * @returns {Promise} - 返回操作结果
   */
  unlikePost(postId) {
    return request({
      url: `${BASE_URL}/posts/${postId}/like`,
      method: 'POST',
      data: { isLike: false }
    })
  }
} 