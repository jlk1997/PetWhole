<template>
  <view class="walk-summary" v-if="visible">
    <view class="summary-content">
      <view class="summary-header">
        <text class="title">遛狗结束</text>
      </view>
      <view class="summary-stats">
        <view class="stat-item">
          <text class="stat-label">总距离</text>
          <text class="stat-value">{{ (distance / 1000).toFixed(2) }} 公里</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">总时长</text>
          <text class="stat-value">{{ formatDuration(duration) }}</text>
        </view>
        <view class="stat-item">
          <text class="stat-label">遛的宠物</text>
          <view class="pet-list">
            <text v-if="pets.length === 0">无</text>
            <text v-for="(pet, index) in pets" :key="pet._id">{{ pet.name }}</text>
          </view>
        </view>
      </view>
      <view class="summary-actions">
        <button class="action-btn share-btn" @click="handleShare">分享记录</button>
        <button class="action-btn close-btn" @click="handleClose">完成</button>
      </view>
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
    distance: {
      type: Number,
      default: 0
    },
    duration: {
      type: Number,
      default: 0
    },
    pets: {
      type: Array,
      default: () => []
    }
  },
  methods: {
    formatDuration(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      let result = '';
      if (hours > 0) {
        result += `${hours}小时`;
      }
      if (minutes > 0 || hours > 0) {
        result += `${minutes}分钟`;
      }
      result += `${secs}秒`;
      
      return result;
    },
    handleClose() {
      this.$emit('close');
    },
    handleShare() {
      this.$emit('share');
    }
  }
}
</script>

<style>
.walk-summary {
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

.summary-content {
  width: 85%;
  background-color: #fff;
  border-radius: 15rpx;
  padding: 40rpx 30rpx;
}

.summary-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #3B9E82;
}

.summary-stats {
  margin-bottom: 40rpx;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding-bottom: 20rpx;
  border-bottom: 1px solid #f0f0f0;
}

.stat-label {
  font-size: 28rpx;
  color: #666;
}

.stat-value {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.pet-list {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.summary-actions {
  display: flex;
  justify-content: space-between;
}

.action-btn {
  flex: 1;
  margin: 0 10rpx;
  padding: 20rpx 0;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.share-btn {
  background-color: #3B9E82;
  color: #fff;
}

.close-btn {
  background-color: #f0f0f0;
  color: #666;
}
</style> 