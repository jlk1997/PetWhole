<template>
  <view class="pet-avatar" :class="[`size-${size}`, { 'with-border': border }]" @click="handleClick">
    <image 
      class="avatar-image" 
      :src="avatarSrc" 
      mode="aspectFill"
      :style="{ width: `${computedSize}rpx`, height: `${computedSize}rpx` }"
    ></image>
    <view class="status-indicator" v-if="showStatus" :class="status"></view>
    <slot></slot>
  </view>
</template>

<script>
export default {
  name: 'PetAvatar',
  props: {
    // 头像URL
    src: {
      type: String,
      default: ''
    },
    // 大小: small, medium, large
    size: {
      type: String,
      default: 'medium',
      validator: (value) => ['small', 'medium', 'large'].includes(value)
    },
    // 是否显示边框
    border: {
      type: Boolean,
      default: false
    },
    // 是否显示状态指示器
    showStatus: {
      type: Boolean,
      default: false
    },
    // 状态: online, offline, walking
    status: {
      type: String,
      default: 'offline',
      validator: (value) => ['online', 'offline', 'walking'].includes(value)
    },
    // 宠物对象，带ID
    pet: {
      type: Object,
      default: null
    }
  },
  computed: {
    // 计算头像源，如果没有提供则使用默认头像
    avatarSrc() {
      if (this.src) return this.src
      if (this.pet && this.pet.avatar) return this.pet.avatar
      return '/static/images/default-pet-avatar.png'
    },
    // 根据尺寸计算实际像素大小
    computedSize() {
      const sizes = {
        small: 80,
        medium: 120,
        large: 160
      }
      return sizes[this.size] || 120
    }
  },
  methods: {
    handleClick() {
      // 点击头像事件，传递宠物对象
      this.$emit('click', this.pet || {})
    }
  }
}
</script>

<style>
.pet-avatar {
  position: relative;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-image {
  border-radius: 50%;
}

.with-border {
  border: 4rpx solid #fff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.status-indicator {
  position: absolute;
  bottom: 4rpx;
  right: 4rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
}

.size-small .status-indicator {
  width: 16rpx;
  height: 16rpx;
}

.size-large .status-indicator {
  width: 24rpx;
  height: 24rpx;
}

.status-indicator.online {
  background-color: #4CD964;
}

.status-indicator.offline {
  background-color: #8E8E93;
}

.status-indicator.walking {
  background-color: #007AFF;
}
</style> 