<template>
  <view class="user-popup" v-if="visible">
    <view class="popup-content">
      <view class="user-info">
        <image class="avatar" :src="user.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
        <view class="user-details">
          <text class="nickname">{{ user.nickname || user.username || '用户' }}</text>
          <view class="stats">
            <text>遛狗次数: {{ user.walkCount || 0 }}</text>
            <text>总距离: {{ user.totalDistance || 0 }}km</text>
          </view>
        </view>
      </view>
      <view class="action-buttons">
        <button class="action-btn" @click="handleFollow">{{ user.isFollowed ? '取消关注' : '关注' }}</button>
        <button class="action-btn message-btn" @click="handleMessage">发送消息</button>
      </view>
      <view class="close-btn" @click="handleClose">×</view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    user: {
      type: Object,
      default: () => ({})
    }
  },
  methods: {
    handleClose() {
      this.$emit('close');
    },
    handleMessage() {
      this.$emit('message', this.user);
    },
    handleFollow() {
      this.$emit('follow', this.user);
    }
  }
}
</script>

<style>
.user-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.popup-content {
  width: 80%;
  background-color: #fff;
  border-radius: 15rpx;
  padding: 30rpx;
  position: relative;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 20rpx;
}

.nickname {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 10rpx;
}

.stats {
  display: flex;
  flex-direction: column;
}

.stats text {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 5rpx;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
}

.action-btn {
  flex: 1;
  margin: 0 10rpx;
  padding: 15rpx 0;
  border-radius: 30rpx;
  font-size: 28rpx;
  background-color: #f0f0f0;
}

.message-btn {
  background-color: #3B9E82;
  color: #fff;
}

.close-btn {
  position: absolute;
  top: 15rpx;
  right: 15rpx;
  width: 50rpx;
  height: 50rpx;
  text-align: center;
  line-height: 45rpx;
  font-size: 40rpx;
  color: #999;
}
</style> 