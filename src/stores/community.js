import { defineStore } from 'pinia'

export const useCommunityStore = defineStore('community', {
  state: () => ({
    posts: [],
    userPosts: [],
    likedPosts: [],
    isLoading: false,
    currentPage: 1,
    hasMoreData: true,
  }),
  
  getters: {
    getPosts: (state) => state.posts,
    getUserPosts: (state) => state.userPosts,
    getLikedPosts: (state) => state.likedPosts,
    getLoadingState: (state) => state.isLoading,
  },
  
  actions: {
    // 设置帖子列表
    setPosts(posts) {
      if (this.currentPage === 1) {
        this.posts = posts
      } else {
        this.posts = [...this.posts, ...posts]
      }
      
      // 无更多数据判断
      this.hasMoreData = posts.length > 0
    },
    
    // 设置用户的帖子
    setUserPosts(posts) {
      this.userPosts = posts
    },
    
    // 添加新帖子
    addPost(post) {
      this.posts.unshift(post)
      
      // 如果是自己的帖子，也添加到userPosts
      if (post.isOwn) {
        this.userPosts.unshift(post)
      }
    },
    
    // 删除帖子
    deletePost(postId) {
      this.posts = this.posts.filter(post => post.id !== postId)
      this.userPosts = this.userPosts.filter(post => post.id !== postId)
      this.likedPosts = this.likedPosts.filter(post => post.id !== postId)
    },
    
    // 更新帖子
    updatePost(updatedPost) {
      // 更新posts中的帖子
      const postIndex = this.posts.findIndex(post => post.id === updatedPost.id)
      if (postIndex !== -1) {
        this.posts[postIndex] = { ...this.posts[postIndex], ...updatedPost }
      }
      
      // 更新userPosts中的帖子
      const userPostIndex = this.userPosts.findIndex(post => post.id === updatedPost.id)
      if (userPostIndex !== -1) {
        this.userPosts[userPostIndex] = { ...this.userPosts[userPostIndex], ...updatedPost }
      }
      
      // 更新likedPosts中的帖子
      const likedPostIndex = this.likedPosts.findIndex(post => post.id === updatedPost.id)
      if (likedPostIndex !== -1) {
        this.likedPosts[likedPostIndex] = { ...this.likedPosts[likedPostIndex], ...updatedPost }
      }
    },
    
    // 点赞/取消点赞帖子
    toggleLikePost(postId) {
      // 在posts中更新点赞状态
      const postIndex = this.posts.findIndex(post => post.id === postId)
      if (postIndex !== -1) {
        const post = this.posts[postIndex]
        const isLiked = !post.isLiked
        
        // 更新点赞状态和数量
        this.posts[postIndex] = {
          ...post,
          isLiked,
          likes: isLiked ? post.likes + 1 : post.likes - 1
        }
        
        // 同步更新userPosts
        const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
        if (userPostIndex !== -1) {
          this.userPosts[userPostIndex] = {
            ...this.userPosts[userPostIndex],
            isLiked,
            likes: isLiked ? this.userPosts[userPostIndex].likes + 1 : this.userPosts[userPostIndex].likes - 1
          }
        }
        
        // 更新likedPosts
        if (isLiked) {
          // 如果是新点赞，添加到likedPosts
          if (!this.likedPosts.some(p => p.id === postId)) {
            this.likedPosts.push(this.posts[postIndex])
          }
        } else {
          // 如果取消点赞，从likedPosts中移除
          this.likedPosts = this.likedPosts.filter(p => p.id !== postId)
        }
      }
    },
    
    // 添加评论
    addComment(postId, comment) {
      // 在posts中添加评论
      const postIndex = this.posts.findIndex(post => post.id === postId)
      if (postIndex !== -1) {
        const post = this.posts[postIndex]
        this.posts[postIndex] = {
          ...post,
          comments: [...post.comments, comment],
        }
        
        // 同步更新userPosts
        const userPostIndex = this.userPosts.findIndex(p => p.id === postId)
        if (userPostIndex !== -1) {
          this.userPosts[userPostIndex] = {
            ...this.userPosts[userPostIndex],
            comments: [...this.userPosts[userPostIndex].comments, comment]
          }
        }
        
        // 同步更新likedPosts
        const likedPostIndex = this.likedPosts.findIndex(p => p.id === postId)
        if (likedPostIndex !== -1) {
          this.likedPosts[likedPostIndex] = {
            ...this.likedPosts[likedPostIndex],
            comments: [...this.likedPosts[likedPostIndex].comments, comment]
          }
        }
      }
    },
    
    // 设置加载状态
    setLoading(status) {
      this.isLoading = status
    },
    
    // 加载更多帖子（翻页）
    loadMorePosts() {
      if (!this.isLoading && this.hasMoreData) {
        this.currentPage++
        return this.currentPage
      }
      return null
    },
    
    // 重置翻页
    resetPagination() {
      this.currentPage = 1
      this.hasMoreData = true
    }
  },
}) 