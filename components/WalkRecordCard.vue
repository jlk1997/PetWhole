<template>
  <view class="walk-record-container" @click="viewDetail">
    <view class="walk-record-title">
      <text class="paw-icon">🐾</text>
      <text>遛狗记录</text>
      <text class="arrow-icon">👉</text>
    </view>
    
    <view class="walk-record-content">
      <view class="walk-stats">
        <view class="stat-item">
          <view class="stat-value">{{ (record.distance / 1000).toFixed(2) }}</view>
          <view class="stat-label">公里</view>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <view class="stat-value">{{ formatDurationShort(record.duration) }}</view>
          <view class="stat-label">时长</view>
        </view>
      </view>
      
      <view class="walk-pet-info" v-if="record.pet">
        <image 
          class="pet-avatar" 
          :src="formatPetAvatar(record.pet.avatar)" 
          mode="aspectFill"
        ></image>
        <text class="pet-name">{{ record.pet ? record.pet.name : '未命名宠物' }}</text>
        <text class="walk-date">{{ formatDate(record.startTime) }}</text>
      </view>
      
      <view class="map-preview" v-if="record.route && record.route.length > 0">
        <image class="map-image" :src="getRouteImage()" mode="aspectFill"></image>
      </view>
    </view>
    
    <view class="walk-record-footer">
      <text>分享遛狗记录可以激励其他铲屎官也加入运动！</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'WalkRecordCard',
  props: {
    record: {
      type: Object,
      required: true
    }
  },
  methods: {
    formatDuration(seconds) {
      if (!seconds) return '0秒';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
      } else if (minutes > 0) {
        return `${minutes}分钟`;
      } else {
        return `${secs}秒`;
      }
    },
    
    formatDurationShort(seconds) {
      if (!seconds) return '0秒';
      
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      
      if (hours > 0) {
        return `${hours}时${minutes}分`;
      } else if (minutes > 0) {
        return `${minutes}分钟`;
      } else {
        return `${seconds}秒`;
      }
    },
    
    formatDate(dateString) {
      if (!dateString) return '';
      
      try {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        
        return `${month}月${day}日`;
      } catch (e) {
        console.error('日期格式化错误:', e);
        return '';
      }
    },
    
    formatPetAvatar(url) {
      if (!url) return '/static/images/default-pet.png';
      
      // 检查URL是否已经是完整URL或静态资源路径
      if (url.startsWith('http') || url.startsWith('/static')) {
        return url;
      }
      
      // 如果是相对路径，补充基础URL
      if (url.startsWith('/uploads')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
        return BASE_URL + url;
      }
      
      return '/static/images/default-pet.png';
    },
    
    getRouteImage() {
      // 如果有缓存的路线图像，返回它
      if (this.record.routeImage) {
        return this.record.routeImage;
      }
      
      // 否则返回一个默认的地图图像
      return '/static/images/default-map.png';
    },
    
    viewDetail() {
      if (!this.record || !this.record._id) {
        uni.showToast({
          title: '遛狗记录不存在',
          icon: 'none'
        });
        return;
      }
      
      // 检查是否是生成的记录ID
      const recordId = this.record._id;
      if (recordId.startsWith('generated_')) {
        // 对于从帖子内容解析出的遛狗记录，显示提示
        uni.showToast({
          title: '这是从动态内容解析的遛狗记录，无法查看详情',
          icon: 'none',
          duration: 2500
        });
        return;
      }
      
      // 导航到遛狗记录详情页
      uni.navigateTo({
        url: `/pages/walk/detail?id=${this.record._id}`,
        fail: (err) => {
          console.error('打开遛狗记录详情失败:', err);
          uni.showToast({
            title: '无法查看遛狗记录',
            icon: 'none'
          });
        }
      });
    }
  }
}
</script>

<style lang="scss" scoped>
.walk-record-container {
  margin: 16rpx 0;
  padding: 24rpx;
  border-radius: 16rpx;
  background: linear-gradient(to bottom, #f9fffc, #f0fff7);
  border: 1px solid #dff5e3;
  box-shadow: 0 4rpx 16rpx rgba(76, 217, 100, 0.15);
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 2rpx 8rpx rgba(76, 217, 100, 0.1);
  }
}

.walk-record-title {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid #e0f5e9;
  position: relative;
  
  .paw-icon {
    font-size: 32rpx;
    margin-right: 8rpx;
  }
  
  text {
    font-size: 30rpx;
    font-weight: bold;
    color: #4CD964;
  }
  
  .arrow-icon {
    position: absolute;
    right: 0;
    font-size: 24rpx;
    color: #4CD964;
    opacity: 0.7;
  }
}

.walk-record-content {
  padding: 8rpx 0;
}

.walk-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  padding: 16rpx 0;
  background-color: rgba(76, 217, 100, 0.08);
  border-radius: 12rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
  margin-top: 4rpx;
}

.stat-divider {
  width: 2rpx;
  height: 40rpx;
  background-color: #dff5e3;
}

.walk-pet-info {
  display: flex;
  align-items: center;
  margin: 16rpx 0;
  padding: 12rpx 16rpx;
  background-color: #f5f5f5;
  border-radius: 12rpx;
}

.pet-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  border: 2rpx solid #fff;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.1);
}

.pet-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  flex: 1;
}

.walk-date {
  font-size: 24rpx;
  color: #999;
}

.map-preview {
  margin-top: 16rpx;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.map-image {
  width: 100%;
  height: 160rpx;
  background-color: #f0f0f0;
}

.walk-record-footer {
  margin-top: 16rpx;
  padding-top: 16rpx;
  border-top: 1px solid #e0f5e9;
  
  text {
    font-size: 24rpx;
    color: #999;
    line-height: 1.4;
  }
}
</style> 