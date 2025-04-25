import { defineStore } from 'pinia'
import { userApi, locationApi } from '@/api'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync('token') || '',
    userInfo: JSON.parse(uni.getStorageSync('userInfo') || 'null'),
    loading: false,
    userStats: null,
    followingUsers: [],
    followerUsers: [],
    error: null,
    isWalking: false,
    currentLocation: null
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    userId: (state) => state.userInfo?._id || '',
    username: (state) => state.userInfo?.username || '',
    nickname: (state) => state.userInfo?.nickname || state.userInfo?.username || '游客',
    avatar: (state) => state.userInfo?.avatar || '/static/images/default-avatar.png'
  },
  
  actions: {
    // 恢复用户状态
    restoreUserState() {
      this.token = uni.getStorageSync('token') || '';
      this.userInfo = JSON.parse(uni.getStorageSync('userInfo') || 'null');
      console.log("Restored user state:", this.token, this.userInfo);
    },
    
    // 注册新用户
    async register(userData) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await userApi.register(userData);
        this.setUserData(data);
        return data;
      } catch (error) {
        console.error('注册失败:', error);
        this.error = error.message || '注册失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 用户登录
    async login(credentials) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await userApi.login(credentials);
        this.setUserData(data);
        return data;
      } catch (error) {
        console.error('登录失败:', error);
        this.error = error.message || '登录失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取用户信息
    async getUserInfo() {
      if (!this.token) return null;
      this.loading = true;
      try {
        const { data } = await userApi.getUserInfo();
        this.setUserData({ ...data, token: this.token });
        return data;
      } catch (error) {
        console.error('获取用户信息失败:', error);
        this.error = error.message || '获取用户信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 更新用户信息
    async updateUserInfo(userData) {
      if (!this.token) throw new Error('用户未登录');
      this.loading = true;
      try {
        const { data } = await userApi.updateUserInfo(userData);
        this.userInfo = { ...this.userInfo, ...data };
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
        return data;
      } catch (error) {
        console.error('更新用户信息失败:', error);
        this.error = error.message || '更新用户信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 用户登出
    async logout() {
      try {
        await userApi.logout();
      } catch (error) {
        console.error('登出请求失败:', error);
      } finally {
        this.token = '';
        this.userInfo = null;
        this.userStats = null;
        this.followingUsers = [];
        this.followerUsers = [];
        uni.removeStorageSync('token');
        uni.removeStorageSync('userInfo');
        // 使用uni-app内置导航方法
        uni.switchTab({
          url: '/pages/index/index'
        });
      }
    },
    
    // 获取用户统计信息
    async fetchUserStats() {
      if (!this.token) return null;
      this.loading = true;
      try {
        const { data } = await userApi.getUserStats();
        this.userStats = data;
        return data;
      } catch (error) {
        console.error('获取用户统计信息失败:', error);
        this.error = error.message || '获取用户统计信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取关注列表
    async fetchFollowing() {
      if (!this.token) return [];
      this.loading = true;
      try {
        const { data } = await userApi.getFollowing();
        this.followingUsers = data;
        return data;
      } catch (error) {
        console.error('获取关注列表失败:', error);
        this.error = error.message || '获取关注列表失败';
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // 获取粉丝列表
    async fetchFollowers() {
      if (!this.token) return [];
      this.loading = true;
      try {
        const { data } = await userApi.getFollowers();
        this.followerUsers = data;
        return data;
      } catch (error) {
        console.error('获取粉丝列表失败:', error);
        this.error = error.message || '获取粉丝列表失败';
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // 关注用户
    async followUser(userId) {
      if (!this.token) throw new Error('用户未登录');
      this.loading = true;
      try {
        await userApi.followUser(userId);
        this.updateFollowingStatus(userId, true);
        return true;
      } catch (error) {
        console.error('关注用户失败:', error);
        this.error = error.message || '关注用户失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 取消关注用户
    async unfollowUser(userId) {
      if (!this.token) throw new Error('用户未登录');
      this.loading = true;
      try {
        await userApi.unfollowUser(userId);
        this.updateFollowingStatus(userId, false);
        return true;
      } catch (error) {
        console.error('取消关注用户失败:', error);
        this.error = error.message || '取消关注用户失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 上传头像
    async uploadAvatar(filePath) {
      if (!this.token) throw new Error('用户未登录');
      this.loading = true;
      try {
        const result = await userApi.uploadAvatar(filePath);
        console.log('Avatar upload API result:', result);

        // 规范化处理不同的返回结构
        const avatarUrl = 
          (result && result.data && result.data.avatar) ||
          (result && result.avatar) ||
          null;
        
        if (avatarUrl) {
          // 更新用户头像
          if (this.userInfo) {
            this.userInfo.avatar = avatarUrl;
            uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
          }
          return { avatar: avatarUrl, data: { avatar: avatarUrl } };
        } else {
          console.warn('上传成功但未收到有效的头像URL:', result);
          throw new Error('上传成功，但未收到有效的头像URL');
        }
      } catch (error) {
        console.error('头像上传失败:', error);
        this.error = error.message || '头像上传失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 统一设置用户数据的方法
    setUserData(data) {
      console.log("Setting user data:", data);
      if (data && data.token) {
        this.token = data.token;
        this.userInfo = {
          _id: data._id, 
          username: data.username,
          email: data.email,
          nickname: data.nickname,
          avatar: data.avatar,
          following: data.following || [],
          followers: data.followers || []
        };
        uni.setStorageSync('token', data.token);
        uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
        console.log("User data set. Token:", this.token, "UserInfo:", this.userInfo);
      } else {
        console.error("Invalid data received in setUserData (missing token):", data);
      }
    },
    
    // 更新用户当前位置
    async updateLocation(location) {
      try {
        this.currentLocation = location;
        // 只有登录用户且启用了位置共享时才发送到服务器
        if (this.token) {
          await locationApi.updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          });
        }
        return location;
      } catch (error) {
        console.error('更新位置失败:', error);
        return null;
      }
    },
    
    // 切换遛狗状态
    toggleWalking(status) {
      this.isWalking = status;
    },
    
    // 检查是否关注了指定用户
    isFollowing(targetUserId) {
      return this.userInfo?.following?.includes(targetUserId) || false;
    },
    
    // 本地更新关注状态
    updateFollowingStatus(targetUserId, isNowFollowing) {
      if (!this.userInfo) return;
      if (!this.userInfo.following) this.userInfo.following = [];
      
      if (isNowFollowing) {
        if (!this.userInfo.following.includes(targetUserId)) {
          this.userInfo.following.push(targetUserId);
        }
      } else {
        this.userInfo.following = this.userInfo.following.filter(id => id !== targetUserId);
      }
      uni.setStorageSync('userInfo', JSON.stringify(this.userInfo));
    }
  }
})