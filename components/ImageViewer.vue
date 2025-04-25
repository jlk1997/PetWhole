<template>
  <view class="image-viewer" v-if="show" @click="close">
    <swiper
      class="image-swiper"
      :current="currentIndex"
      @change="handleSwiperChange"
      circular
      @click.stop
    >
      <swiper-item v-for="(image, index) in images" :key="index" class="swiper-item">
        <view class="image-container" @click="close">
          <image
            class="viewer-image"
            :src="formatImageUrl(image)"
            mode="aspectFit"
            @click="close"
          ></image>
        </view>
      </swiper-item>
    </swiper>
    <view class="controls">
      <text class="indicator">{{ currentIndex + 1 }}/{{ images.length }}</text>
      <view class="close-button" @click.stop="close">×</view>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    show: {
      type: Boolean,
      default: false
    },
    images: {
      type: Array,
      default: () => []
    },
    initialIndex: {
      type: Number,
      default: 0
    }
  },
  
  data() {
    return {
      currentIndex: 0
    }
  },
  
  watch: {
    initialIndex(val) {
      this.currentIndex = val;
    },
    show(val) {
      if (val) {
        this.currentIndex = this.initialIndex;
      }
    }
  },
  
  methods: {
    handleSwiperChange(e) {
      this.currentIndex = e.detail.current;
    },
    
    close() {
      this.$emit('close');
    },
    
    formatImageUrl(url) {
      if (!url) return '/static/images/default-image.png';
      
      console.log('图片查看器处理URL:', url);
      
      // 检查URL是否已经是完整URL或静态资源路径
      if (url.startsWith('http') || url.startsWith('/static') || url.startsWith('blob:')) {
        return url;
      }
      
      // 如果是相对路径，补充基础URL
      if (url.startsWith('/uploads')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
        const fullUrl = BASE_URL + url;
        console.log('处理相对路径图片URL:', url, '补充基础URL:', BASE_URL, '完整URL:', fullUrl);
        return fullUrl;
      }
      
      // 如果是其他情况，使用默认图片
      console.warn('未能识别的图片URL格式:', url);
      return '/static/images/default-image.png';
    }
  }
}
</script>

<style scoped>
.image-viewer {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.image-swiper {
  width: 100%;
  height: 100%;
}

.swiper-item {
  display: flex;
  justify-content: center;
  align-items: center;
}

.image-container {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.viewer-image {
  max-width: 100%;
  max-height: 100%;
}

.controls {
  position: absolute;
  bottom: 40rpx;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.indicator {
  color: #fff;
  font-size: 28rpx;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 10rpx 20rpx;
  border-radius: 30rpx;
}

.close-button {
  position: absolute;
  top: -500rpx;
  right: 30rpx;
  width: 70rpx;
  height: 70rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 50rpx;
}
</style> 