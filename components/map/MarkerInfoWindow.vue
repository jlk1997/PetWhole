<template>
  <view class="marker-info-container">
    <view class="marker-title">{{marker.title || '未命名标记'}}</view>
    <view v-if="marker.description" class="marker-description">{{marker.description}}</view>
    <view class="marker-type">类型: {{getTypeName(marker.type)}}</view>
    <view v-if="marker.radius" class="marker-radius">覆盖半径: {{marker.radius < 100 ? marker.radius + '公里 (' + (marker.radius * 1000).toFixed(0) + '米)' : marker.radius + '米'}}</view>
    <view class="marker-actions">
      <button class="marker-button close" @tap="onClose">关闭</button>
      <button class="marker-button navigate" @tap="onNavigate">导航</button>
    </view>
  </view>
</template>

<script>
export default {
  props: {
    marker: {
      type: Object,
      required: true
    }
  },
  methods: {
    getTypeName(type) {
      const typeMap = {
        'general': '普通标记',
        'pet_friendly': '宠物友好',
        'danger': '危险区域',
        'scenic': '风景区',
        'pet_service': '宠物服务',
        'custom': '自定义'
      };
      return typeMap[type] || '未知类型';
    },
    onClose() {
      this.$emit('close');
    },
    onNavigate() {
      this.$emit('navigate');
    }
  }
}
</script>

<style scoped>
.marker-info-container {
  padding: 10px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 300px;
}

.marker-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 5px;
}

.marker-description {
  font-size: 14px;
  color: #333;
  margin-bottom: 5px;
}

.marker-type, .marker-radius {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.marker-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.marker-button {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 14px;
}

.close {
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  color: #333;
}

.navigate {
  background-color: #007AFF;
  color: white;
  border: none;
}
</style> 