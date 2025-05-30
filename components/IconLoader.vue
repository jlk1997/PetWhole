<!-- 
  IconLoader.vue - 图标加载器组件
  用于自动加载、管理和更新应用中的图标
 -->
<template>
  <view v-if="showUpdate" class="icon-update-notification">
    <view class="icon-update-content" @click="applyUpdates">
      <text class="icon-update-text">发现图标更新，点击应用</text>
      <view class="icon-update-badge">{{ pendingUpdates }}</view>
    </view>
  </view>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { getVersionedIconUrl, loadIconVersions, checkAllIconsUpdate, refreshDOMIcons } from '@/utils/iconManager';

export default {
  name: 'IconLoader',
  emits: ['update-applied'],
  
  setup(props, { emit }) {
    // 是否显示更新提示
    const showUpdate = ref(false);
    // 待更新的图标数量
    const pendingUpdates = ref(0);
    // 定时检查的间隔ID
    let checkIntervalId = null;
    // 上次检查时间
    const lastCheckTime = ref(0);
    
    // 加载图标版本信息
    const loadVersions = async () => {
      try {
        await loadIconVersions();
        console.log('图标版本信息加载完成');
      } catch (error) {
        console.error('加载图标版本信息失败:', error);
      }
    };
    
    // 检查图标更新
    const checkUpdates = async () => {
      // 如果10分钟内检查过，则不再检查
      const now = Date.now();
      if (now - lastCheckTime.value < 10 * 60 * 1000) {
        return;
      }
      
      lastCheckTime.value = now;
      
      try {
        const hasUpdates = await checkAllIconsUpdate();
        
        if (hasUpdates) {
          // 检查有多少个图标需要更新
          const updatedElements = document.querySelectorAll('img[src*="/static/"]');
          pendingUpdates.value = updatedElements.length;
          
          // 显示更新提示
          if (pendingUpdates.value > 0) {
            showUpdate.value = true;
          }
        }
      } catch (error) {
        console.error('检查图标更新失败:', error);
      }
    };
    
    // 应用更新
    const applyUpdates = () => {
      try {
        // 刷新所有图标
        const refreshedCount = refreshDOMIcons();
        console.log(`已刷新 ${refreshedCount} 个图标`);
        
        // 隐藏更新提示
        showUpdate.value = false;
        pendingUpdates.value = 0;
        
        // 发出更新完成事件
        emit('update-applied', refreshedCount);
      } catch (error) {
        console.error('应用图标更新失败:', error);
      }
    };
    
    // 组件挂载时初始化
    onMounted(async () => {
      // 加载图标版本信息
      await loadVersions();
      
      // 立即检查更新
      await checkUpdates();
      
      // 设置定时检查
      checkIntervalId = setInterval(checkUpdates, 30 * 60 * 1000); // 每30分钟检查一次
    });
    
    // 组件销毁前清理
    onBeforeUnmount(() => {
      if (checkIntervalId) {
        clearInterval(checkIntervalId);
      }
    });
    
    return {
      showUpdate,
      pendingUpdates,
      applyUpdates
    };
  }
};
</script>

<style lang="scss" scoped>
.icon-update-notification {
  position: fixed;
  right: 20px;
  bottom: 80px;
  z-index: 999;
  
  .icon-update-content {
    background-color: #3cc51f;
    color: #ffffff;
    padding: 8px 15px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    
    .icon-update-text {
      font-size: 14px;
    }
    
    .icon-update-badge {
      margin-left: 8px;
      background-color: #ffffff;
      color: #3cc51f;
      border-radius: 50%;
      min-width: 18px;
      height: 18px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
  }
}
</style> 