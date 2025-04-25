<template>
  <view class="user-marker" @click="showUserInfo">
    <view class="avatar-container" :class="{ 'is-current': isCurrent }">
      <image class="avatar" :src="avatarSrc" mode="aspectFill"></image>
      <view class="pet-indicator" v-if="hasPet">
        <image class="pet-icon" :src="petIconSrc" mode="aspectFill"></image>
      </view>
    </view>
    <view class="label" v-if="showLabel">{{userName}}</view>
  </view>
</template>

<script>
export default {
  name: 'UserMarker',
  props: {
    // 用户信息
    user: {
      type: Object,
      required: true
    },
    // 是否是当前用户
    isCurrent: {
      type: Boolean,
      default: false
    },
    // 是否显示用户名
    showLabel: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    // 用户头像
    avatarSrc() {
      if (!this.user.avatar) {
        return '/static/images/default-avatar.png';
      }
      
      // 如果是相对路径，添加基础URL
      if (this.user.avatar.startsWith('/uploads/')) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const fullUrl = apiUrl + this.user.avatar;
        console.log('地图用户标记完整头像URL:', fullUrl);
        return fullUrl;
      }
      
      return this.user.avatar;
    },
    // 用户名
    userName() {
      return this.user.nickname || this.user.username || '用户'
    },
    // 是否有宠物在遛
    hasPet() {
      return this.user.currentPet && this.user.isWalking
    },
    // 宠物图标
    petIconSrc() {
      if (this.user.currentPet && this.user.currentPet.avatar) {
        return this.user.currentPet.avatar
      }
      return '/static/images/default-pet-avatar.png'
    }
  },
  methods: {
    // 显示用户信息
    showUserInfo() {
      this.$emit('click', this.user)
    }
  }
}
</script>

<style>
.user-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.avatar-container {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.2);
  background-color: #fff;
  position: relative;
}

.avatar-container.is-current {
  border-color: #007AFF;
  box-shadow: 0 2rpx 15rpx rgba(0, 122, 255, 0.4);
}

.avatar {
  width: 100%;
  height: 100%;
}

.pet-indicator {
  position: absolute;
  right: -10rpx;
  bottom: -10rpx;
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background-color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.1);
}

.pet-icon {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
}

.label {
  font-size: 24rpx;
  color: #333;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  margin-top: 5rpx;
  box-shadow: 0 2rpx 5rpx rgba(0, 0, 0, 0.1);
  max-width: 120rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
</style> 