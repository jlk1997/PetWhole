import { defineStore } from 'pinia'
import { community } from '@/utils/api'

export const usePostStore = defineStore('post', {
  state: () => ({
    posts: [],
    currentPost: null,
    loading: false,
    error: null,
    totalPosts: 0,
    page: 1,
    limit: 10,
    hasMore: true
  }),

  actions: {
    // 获取帖子列表
    async fetchPosts(params = {}) {
      try {
        this.loading = true
        this.error = null
        
        const queryParams = {
          page: params.page || this.page,
          limit: params.limit || this.limit,
          ...params
        }
        
        const response = await community.getPosts(queryParams)
        
        // 如果是第一页或者是刷新，直接替换列表
        if (queryParams.page === 1 || params.refresh) {
          this.posts = response.data.posts
        } else {
          // 追加到列表
          this.posts = [...this.posts, ...response.data.posts]
        }
        
        this.totalPosts = response.data.total
        this.page = queryParams.page
        this.hasMore = this.posts.length < this.totalPosts
        
        return response.data
      } catch (error) {
        console.error('获取帖子列表失败:', error)
        this.error = '获取帖子列表失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 加载更多帖子
    async loadMorePosts(params = {}) {
      if (!this.hasMore || this.loading) return
      
      const nextPage = this.page + 1
      return this.fetchPosts({ ...params, page: nextPage })
    },

    // 刷新帖子列表
    async refreshPosts(params = {}) {
      return this.fetchPosts({ ...params, page: 1, refresh: true })
    },

    // 获取帖子详情
    async fetchPostById(id) {
      try {
        this.loading = true
        this.error = null
        
        const response = await community.getPostById(id)
        this.currentPost = response.data
        
        return response.data
      } catch (error) {
        console.error('获取帖子详情失败:', error)
        this.error = '获取帖子详情失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 创建帖子
    async createPost(postData) {
      try {
        this.loading = true
        this.error = null
        
        const response = await community.createPost(postData)
        
        // 添加到列表开头
        this.posts.unshift(response.data)
        
        return response.data
      } catch (error) {
        console.error('创建帖子失败:', error)
        this.error = '创建帖子失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新帖子
    async updatePost(id, postData) {
      try {
        this.loading = true
        this.error = null
        
        const response = await community.updatePost(id, postData)
        
        // 更新列表中的帖子
        const index = this.posts.findIndex(post => post._id === id)
        if (index !== -1) {
          this.posts[index] = response.data
        }
        
        // 如果是当前查看的帖子，更新currentPost
        if (this.currentPost && this.currentPost._id === id) {
          this.currentPost = response.data
        }
        
        return response.data
      } catch (error) {
        console.error('更新帖子失败:', error)
        this.error = '更新帖子失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 删除帖子
    async deletePost(id) {
      try {
        this.loading = true
        this.error = null
        
        await community.deletePost(id)
        
        // 从列表中移除帖子
        this.posts = this.posts.filter(post => post._id !== id)
        
        // 如果是当前查看的帖子，清除currentPost
        if (this.currentPost && this.currentPost._id === id) {
          this.currentPost = null
        }
        
        return true
      } catch (error) {
        console.error('删除帖子失败:', error)
        this.error = '删除帖子失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 点赞帖子
    async likePost(id) {
      try {
        this.error = null
        const response = await community.likePost(id)
        
        // 更新帖子点赞状态
        this.updatePostLikeStatus(id, true)
        
        return response.data
      } catch (error) {
        console.error('点赞帖子失败:', error)
        this.error = '点赞帖子失败'
        throw error
      }
    },

    // 取消点赞
    async unlikePost(id) {
      try {
        this.error = null
        const response = await community.unlikePost(id)
        
        // 更新帖子点赞状态
        this.updatePostLikeStatus(id, false)
        
        return response.data
      } catch (error) {
        console.error('取消点赞失败:', error)
        this.error = '取消点赞失败'
        throw error
      }
    },

    // 更新帖子点赞状态
    updatePostLikeStatus(id, isLiked) {
      // 更新列表中的帖子
      const index = this.posts.findIndex(post => post._id === id)
      if (index !== -1) {
        const post = this.posts[index]
        post.isLiked = isLiked
        post.likeCount = isLiked ? (post.likeCount || 0) + 1 : Math.max((post.likeCount || 0) - 1, 0)
        this.posts[index] = { ...post }
      }
      
      // 如果是当前查看的帖子，也更新currentPost
      if (this.currentPost && this.currentPost._id === id) {
        this.currentPost.isLiked = isLiked
        this.currentPost.likeCount = isLiked 
          ? (this.currentPost.likeCount || 0) + 1 
          : Math.max((this.currentPost.likeCount || 0) - 1, 0)
        this.currentPost = { ...this.currentPost }
      }
    },

    // 添加评论
    async createComment(postId, commentData) {
      try {
        this.error = null
        const response = await community.createComment(postId, commentData)
        
        // 更新评论数量
        this.updatePostCommentCount(postId, 1)
        
        return response.data
      } catch (error) {
        console.error('添加评论失败:', error)
        this.error = '添加评论失败'
        throw error
      }
    },

    // 删除评论
    async deleteComment(postId, commentId) {
      try {
        this.error = null
        await community.deleteComment(postId, commentId)
        
        // 更新评论数量
        this.updatePostCommentCount(postId, -1)
        
        return true
      } catch (error) {
        console.error('删除评论失败:', error)
        this.error = '删除评论失败'
        throw error
      }
    },

    // 更新帖子评论数量
    updatePostCommentCount(postId, delta) {
      // 更新列表中的帖子
      const index = this.posts.findIndex(post => post._id === postId)
      if (index !== -1) {
        const post = this.posts[index]
        post.commentCount = Math.max((post.commentCount || 0) + delta, 0)
        this.posts[index] = { ...post }
      }
      
      // 如果是当前查看的帖子，也更新currentPost
      if (this.currentPost && this.currentPost._id === postId) {
        this.currentPost.commentCount = Math.max((this.currentPost.commentCount || 0) + delta, 0)
        this.currentPost = { ...this.currentPost }
      }
    },

    // 上传帖子图片
    async uploadPostImage(postId, filePath) {
      try {
        this.loading = true
        this.error = null
        
        const response = await community.uploadPostImage(postId, filePath)
        return response.data
      } catch (error) {
        console.error('上传帖子图片失败:', error)
        this.error = '上传帖子图片失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取用户的帖子
    async fetchUserPosts(userId, params = {}) {
      try {
        this.loading = true
        this.error = null
        
        const queryParams = {
          page: params.page || 1,
          limit: params.limit || 10,
          ...params
        }
        
        const response = await community.getUserPosts(userId, queryParams)
        
        if (queryParams.page === 1 || params.refresh) {
          this.posts = response.data.posts
        } else {
          this.posts = [...this.posts, ...response.data.posts]
        }
        
        this.totalPosts = response.data.total
        this.page = queryParams.page
        this.hasMore = this.posts.length < this.totalPosts
        
        return response.data
      } catch (error) {
        console.error('获取用户帖子失败:', error)
        this.error = '获取用户帖子失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 获取自己的帖子
    async fetchMyPosts(params = {}) {
      try {
        this.loading = true
        this.error = null
        
        const queryParams = {
          page: params.page || 1,
          limit: params.limit || 10,
          ...params
        }
        
        const response = await community.getMyPosts(queryParams)
        
        if (queryParams.page === 1 || params.refresh) {
          this.posts = response.data.posts
        } else {
          this.posts = [...this.posts, ...response.data.posts]
        }
        
        this.totalPosts = response.data.total
        this.page = queryParams.page
        this.hasMore = this.posts.length < this.totalPosts
        
        return response.data
      } catch (error) {
        console.error('获取我的帖子失败:', error)
        this.error = '获取我的帖子失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 清空帖子数据
    clearPosts() {
      this.posts = []
      this.currentPost = null
      this.totalPosts = 0
      this.page = 1
      this.hasMore = true
      this.error = null
    }
  }
}) 