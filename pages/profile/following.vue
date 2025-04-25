<template>
  <view class="following-container">
    <uni-nav-bar left-icon="back" @clickLeft="goBack" title="我的关注" />
    
    <!-- Loading state -->
    <view v-if="isLoading" class="loading-container">
      <uni-icons type="spinner-cycle" size="24" color="#ff5f15" class="loading-icon"></uni-icons>
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- Retry state -->
    <view v-else-if="isRetryVisible" class="retry-container">
      <text class="error-text">加载失败，请重试</text>
      <button class="retry-button" @click="loadFollowingList">重试</button>
    </view>
    
    <!-- Empty state -->
    <view v-else-if="followingList.length === 0" class="empty-container">
      <image src="/static/images/empty-list.png" class="empty-image"></image>
      <text class="empty-text">还没有关注任何用户</text>
      <button class="explore-btn" @click="goExplore">去探索</button>
    </view>
    
    <!-- Following list -->
    <view v-else class="following-list">
      <view class="user-list" v-if="!isLoading && followingList.length > 0">
        <view class="user-item" v-for="(user, index) in followingList" :key="index" @click="viewUserProfile(user)">
          <image class="user-avatar" :src="formatAvatarUrl(user.avatar)" mode="aspectFill"></image>
          <view class="user-info">
            <text class="user-name">{{ user.username || user.nickname || '用户' }}</text>
            <text class="user-desc" v-if="user.bio">{{ user.bio }}</text>
          </view>
          <button class="follow-btn" :class="{'following': user.isFollowing}" 
                  @click.stop="toggleFollow(user)">
            {{ user.isFollowing ? '已关注' : '关注' }}
          </button>
        </view>
      </view>
    </view>
    
    <!-- 用户详情弹窗 -->
    <UserInfoPopup
      v-if="showUserPopup"
      :user="selectedUser"
      :pets="selectedUserPets"
      :is-following="isUserFollowing"
      :visible="showUserPopup"
      @close="closeUserPopup"
      @message="messageUser"
      @follow="followUser"
    />
  </view>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js';
import UserInfoPopup from '@/components/map/UserInfoPopup.vue';

export default {
  components: {
    UserInfoPopup
  },
  setup() {
    const userStore = useUserStore();
    const isLoading = ref(true);
    const followingList = ref([]);
    const showUserPopup = ref(false);
    const selectedUser = ref(null);
    const selectedUserPets = ref([]);
    const isUserFollowing = ref(false);
    const isRetryVisible = ref(false);
    
    onMounted(async () => {
      await loadFollowingList();
    });
    
    // 加载关注列表
    const loadFollowingList = async () => {
      isLoading.value = true;
      isRetryVisible.value = false;
      try {
        if (!userStore.isAuthenticated) {
          uni.navigateTo({
            url: '/pages/login/login'
          });
          return;
        }
        
        const userId = userStore.userId || uni.getStorageSync('userId');
        if (!userId) {
          uni.showToast({
            title: '无法获取用户信息',
            icon: 'none'
          });
          isLoading.value = false;
          return;
        }
        
        const result = await api.user.getFollowing(userId);
        console.log('关注列表:', result);
        
        if (Array.isArray(result)) {
          // 标记每个用户的关注状态
          followingList.value = result.map(user => ({
            ...user,
            isFollowing: true // 既然在关注列表中，肯定是已关注状态
          }));
        } else {
          followingList.value = [];
        }
      } catch (error) {
        console.error('Failed to load following list:', error);
        isLoading.value = false;
        isRetryVisible.value = true;
        uni.showToast({
          title: '加载失败，请重试',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 切换关注状态
    const toggleFollow = async (user) => {
      if (!userStore.isAuthenticated) {
        uni.navigateTo({
          url: '/pages/login/login'
        });
        return;
      }
      
      try {
        const result = await api.user.followUser(user._id);
        
        if (result && result.isFollowing !== undefined) {
          // 更新用户关注状态
          user.isFollowing = result.isFollowing;
          
          // 如果取消关注，可能需要从列表中移除
          if (!user.isFollowing) {
            followingList.value = followingList.value.filter(item => item._id !== user._id);
          }
          
          // 显示提示
          uni.showToast({
            title: user.isFollowing ? '关注成功' : '取消关注成功',
            icon: 'success'
          });
          
          // 刷新用户统计数据
          await userStore.fetchUserStats();
        }
      } catch (error) {
        console.error('关注操作失败:', error);
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    };
    
    // 查看用户详情
    const viewUserProfile = async (user) => {
      selectedUser.value = {
        ...user,
        isCurrentUser: userStore.userId === user._id
      };
      
      try {
        // 获取用户宠物列表
        const pets = await api.user.getPetsByUser(user._id);
        selectedUserPets.value = pets || [];
        
        // 设置关注状态
        isUserFollowing.value = user.isFollowing || false;
        
        // 显示弹窗
        showUserPopup.value = true;
      } catch (error) {
        console.error('获取用户详情失败:', error);
        // 即使出错也显示弹窗，但没有宠物信息
        selectedUserPets.value = [];
        showUserPopup.value = true;
      }
    };
    
    // 关闭用户弹窗
    const closeUserPopup = () => {
      showUserPopup.value = false;
    };
    
    // 发送消息
    const messageUser = (user) => {
      console.log('发送消息给用户:', user);
      // 跳转到消息页面或执行其他动作
    };
    
    // 在弹窗中关注用户
    const followUser = async (user) => {
      await toggleFollow(user);
      // 更新弹窗中的关注状态
      isUserFollowing.value = user.isFollowing || false;
    };
    
    // 返回上一页
    const goBack = () => {
      uni.navigateBack();
    };
    
    // 前往探索页面
    const goExplore = () => {
      uni.switchTab({
        url: '/pages/community/community'
      });
    };
    
    // 格式化头像URL
    const formatAvatarUrl = (url) => {
      if (!url) return '/static/images/default-avatar.png';
      
      // 检查URL是否已经是完整URL或静态资源路径
      if (url.startsWith('http') || url.startsWith('/static')) {
        return url;
      }
      
      // 如果是相对路径，补充基础URL
      if (url.startsWith('/uploads')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
        return BASE_URL + url;
      }
      
      // 其他情况，使用默认头像
      return '/static/images/default-avatar.png';
    };
    
    return {
      isLoading,
      followingList,
      goBack,
      goExplore,
      toggleFollow,
      viewUserProfile,
      formatAvatarUrl,
      showUserPopup,
      selectedUser,
      selectedUserPets,
      isUserFollowing,
      closeUserPopup,
      messageUser,
      followUser,
      isRetryVisible,
      loadFollowingList
    };
  }
};
</script>

<style>
.following-container {
  padding-bottom: 30rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
}

.back-btn {
  padding: 10rpx;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.page-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.placeholder {
  width: 40rpx;
}

.list-content {
  padding: 20rpx;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.loading-icon {
  animation: rotate 1s linear infinite;
}

.loading-text {
  margin-top: 12px;
  color: #999;
  font-size: 14px;
}

.retry-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
}

.error-text {
  color: #666;
  font-size: 14px;
  margin-bottom: 16px;
}

.retry-button {
  background-color: #ff5f15;
  color: white;
  border: none;
  border-radius: 20px;
  padding: 6px 20px;
  font-size: 14px;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 30rpx;
}

.user-list {
  background-color: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1px solid #f0f0f0;
}

.user-item:last-child {
  border-bottom: none;
}

.user-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.user-desc {
  font-size: 24rpx;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400rpx;
}

.follow-btn {
  min-width: 150rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 26rpx;
  padding: 0 30rpx;
  color: #fff;
  background-color: #3B9E82;
  border-radius: 30rpx;
}

.follow-btn.following {
  background-color: #f1f1f1;
  color: #333;
  border: 1px solid #ddd;
}

.explore-btn {
  background-color: #3B9E82;
  color: #fff;
  font-size: 28rpx;
  padding: 16rpx 60rpx;
  border-radius: 40rpx;
}
</style> 