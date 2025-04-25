<template>
  <view class="settings-container">
    <view class="header">
      <view class="header-title">设置</view>
    </view>
    
    <view class="settings-list">
      <view class="settings-item" @click="editProfile">
        <text class="item-text">编辑个人资料</text>
        <view class="arrow-icon"></view>
      </view>
      
      <view class="settings-item" @click="changePassword">
        <text class="item-text">修改密码</text>
        <view class="arrow-icon"></view>
      </view>
      
      <view class="settings-item" @click="manageNotifications">
        <text class="item-text">通知设置</text>
        <view class="arrow-icon"></view>
      </view>
      
      <view class="settings-item" @click="privacySettings">
        <text class="item-text">隐私设置</text>
        <view class="arrow-icon"></view>
      </view>
      
      <view class="settings-item" @click="aboutApp">
        <text class="item-text">关于应用</text>
        <view class="arrow-icon"></view>
      </view>
    </view>
    
    <view class="footer">
      <button class="logout-btn" @click="handleLogout">退出登录</button>
    </view>
  </view>
</template>

<script setup>
import { useUserStore } from '@/store/user.js';
import { showToast, showModal, navigateTo, navigateBack } from '@/utils/ui.js';

const userStore = useUserStore();

// 编辑个人资料
function editProfile() {
  navigateTo('/pages/profile/profile');
}

// 修改密码
function changePassword() {
  showToast('修改密码功能即将推出');
}

// 通知设置
function manageNotifications() {
  showToast('通知设置功能即将推出');
}

// 隐私设置
function privacySettings() {
  showToast('隐私设置功能即将推出');
}

// 关于应用
function aboutApp() {
  showToast('关于应用功能即将推出');
}

// 退出登录
async function handleLogout() {
  const confirmed = await showModal({
    title: '退出登录',
    content: '确定要退出登录吗？',
    showCancel: true
  });
  
  if (confirmed) {
    try {
      await userStore.logout();
      showToast({
        title: '已退出登录',
        icon: 'success'
      });
      
      // 跳转到登录页
      setTimeout(() => {
        uni.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
    } catch (error) {
      console.error('退出登录失败:', error);
      showToast('退出登录失败，请重试');
    }
  }
}
</script>

<style>
.settings-container {
  padding: 30rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.settings-list {
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  margin-bottom: 60rpx;
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx 20rpx;
  border-bottom: 1rpx solid #f5f5f5;
}

.settings-item:last-child {
  border-bottom: none;
}

.item-text {
  font-size: 30rpx;
  color: #333;
}

.arrow-icon {
  width: 16rpx;
  height: 16rpx;
  border-top: 3rpx solid #999;
  border-right: 3rpx solid #999;
  transform: rotate(45deg);
}

.footer {
  margin-top: 60rpx;
}

.logout-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #ff6b6b;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
}

.profile-container {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding-bottom: 150rpx; /* 增加底部间距 */
}
</style> 