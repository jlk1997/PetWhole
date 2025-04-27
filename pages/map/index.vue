<!-- 在顶部工具栏添加识别按钮 -->
<view class="map-tools">
  <!-- ... 现有工具按钮 ... -->
  <view class="tool-button pet-identify" @tap="navigateToPetIdentify">
    <text class="tool-icon">🔍</text>
    <text class="tool-text">识别</text>
  </view>
</view>

<script>
// ... existing code ...

export default {
  // ... existing code ...
  
  methods: {
    // ... existing code ...
    
    // 导航到宠物识别页面
    navigateToPetIdentify() {
      uni.navigateTo({
        url: '/pages/petIdentify/index'
      });
    },
    
    // ... existing code ...
  }
}
</script>

<style>
// ... existing code ...

/* 宠物识别按钮样式 */
.pet-identify {
  background-color: #FF7F50;
}

// ... existing code ...
</style> 