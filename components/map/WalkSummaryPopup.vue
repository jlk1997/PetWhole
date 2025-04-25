<template>
  <view class="walk-summary-popup" :class="{ 'active': visible }">
    <view class="popup-content">
      <view class="popup-header">
        <text class="title">遛狗总结</text>
        <text class="close-btn" @click="handleClose">×</text>
      </view>

      <view class="summary-stats">
        <view class="stat-item">
          <text class="stat-value">{{ formattedDuration }}</text>
          <text class="stat-label">总时长</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ formattedDistance }} 公里</text>
          <text class="stat-label">总距离</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ pace }}</text>
          <text class="stat-label">平均配速</text>
        </view>
      </view>

      <view class="summary-achievement" v-if="parseFloat(formattedDistance) > 1.0">
        <text class="achievement-icon">🏆</text>
        <text class="achievement-text">恭喜你今天遛狗超过1公里!</text>
      </view>

      <!-- Optional: Static map image placeholder -->
      <!-- <view class="summary-map-placeholder">地图区域</view> -->

      <view class="share-options">
        <text class="share-label">遛狗完成!</text>
        <view class="share-success">
          <text class="success-emoji">🎉</text>
          <text class="success-text">恭喜完成遛狗，分享一下今天的心情吧!</text>
        </view>
        <view class="pet-select" v-if="pets.length > 0">
          <text>选择宠物:</text>
          <picker mode="selector" :range="petNames" :value="selectedPetIndex" @change="onPetChange">
            <view class="picker-text">{{ petNames[selectedPetIndex] || '请选择' }}</view>
          </picker>
        </view>
        <textarea class="share-content" v-model="shareContent" placeholder="分享你的遛狗心得..."></textarea>
        <view class="button-group">
          <button class="view-btn" @click="viewHistory">查看记录</button>
          <button class="share-btn" @click="handleShare">保存并分享</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { formatDuration, calculatePace } from '@/utils/amap'; // Assuming these exist

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  duration: { // in seconds
    type: Number,
    default: 0
  },
  distance: { // in meters
    type: Number,
    default: 0
  },
  pets: {
    type: Array,
    default: () => []
  },
  selectedPetIndex: {
    type: Number,
    default: 0
  },
  shareContent: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['close', 'share']);

const selectedPetIndex = ref(props.selectedPetIndex || 0);
const shareContent = ref(props.shareContent || '');

// Compute derived values
const formattedDuration = computed(() => formatDuration(props.duration));
const formattedDistance = computed(() => (props.distance / 1000).toFixed(2));
const pace = computed(() => calculatePace(props.distance / 1000, props.duration));
const petNames = computed(() => props.pets.map(p => p.name));

// Reset internal state when visibility changes or pets change
watch(() => props.visible, (newVal) => {
  if (!newVal) {
    // Reset when hiding
    selectedPetIndex.value = 0;
    shareContent.value = '';
  }
});
watch(() => props.pets, () => {
    selectedPetIndex.value = 0; // Reset pet selection if pet list changes
});

const handleClose = () => {
  emit('close');
};

const onPetChange = (e) => {
  selectedPetIndex.value = Number(e.detail.value);
};

const handleShare = () => {
  if (props.pets.length > 0 && selectedPetIndex.value < 0) {
      uni.showToast({ title: '请选择一个宠物', icon: 'none' });
      return;
  }
  emit('share', {
    selectedPetIndex: selectedPetIndex.value,
    content: shareContent.value
  });
};

const viewHistory = () => {
  // 关闭弹窗
  emit('close');
  // 导航到遛狗记录页面
  uni.navigateTo({
    url: '/pages/walk/history'
  });
};

</script>

<style lang="scss" scoped>
.walk-summary-popup {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;

  &.active {
    opacity: 1;
    pointer-events: auto;
  }
}

.popup-content {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  width: 90%;
  max-width: 600rpx;
  box-shadow: 0 5rpx 30rpx rgba(0, 0, 0, 0.15);
  max-height: 85vh; /* Limit height */
  overflow-y: auto; /* Allow scrolling if content exceeds height */
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
  border-bottom: 1rpx solid #eee;
  padding-bottom: 20rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #3B9E82;
}

.close-btn {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
  cursor: pointer;
}

.summary-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40rpx;
  text-align: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

/* Optional placeholder style */
.summary-map-placeholder {
    width: 100%;
    height: 200rpx; /* Adjust as needed */
    background-color: #f0f0f0;
    border-radius: 10rpx;
    margin-bottom: 30rpx;
    display: flex;
    justify-content: center;
    align-items: center;
    color: #aaa;
    font-size: 28rpx;
}

.share-options {
  margin-top: 30rpx;
}

.share-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
  display: block;
}

.share-success {
  margin-bottom: 20rpx;
  text-align: center;
}

.success-emoji {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.success-text {
  font-size: 28rpx;
  color: #666;
}

.pet-select {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  color: #555;
}

.picker-text {
  flex-grow: 1;
  border: 1rpx solid #ddd;
  padding: 15rpx 20rpx;
  border-radius: 10rpx;
  margin-left: 15rpx;
  background-color: #f9f9f9;
  color: #333;
}

.share-content {
  width: 100%;
  box-sizing: border-box;
  height: 150rpx;
  border: 1rpx solid #ddd;
  border-radius: 10rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
  background-color: #f9f9f9;
  font-size: 28rpx;
}

.button-group {
  display: flex;
  justify-content: space-between;
  margin-top: 30rpx;
  gap: 20rpx;
}

.view-btn, .share-btn {
  flex: 1;
  border-radius: 40rpx;
  height: 80rpx;
  line-height: 80rpx;
  text-align: center;
  font-size: 30rpx;
  border: none;
}

.view-btn {
  background-color: #f0f0f0;
  color: #333;
}

.share-btn {
  background-color: #3B9E82;
  color: #fff;
}

.summary-achievement {
  margin-bottom: 30rpx;
  text-align: center;
}

.achievement-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.achievement-text {
  font-size: 28rpx;
  color: #666;
}

</style> 