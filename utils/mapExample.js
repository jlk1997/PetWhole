/**
 * 地图模块使用示例
 * 本文件展示如何在项目中集成和使用优化后的地图服务
 */
import MapService from './mapService';
import api from './api';

// ============ 在组件的setup函数中使用 ============
export async function useMapInComponent() {
  // 引入必要的状态
  const map = ref(null);
  const isMapReady = ref(false);
  const showMarkers = ref(true);
  const currentLocation = ref(null);
  
  /**
   * 初始化地图
   */
  const initMap = async () => {
    try {
      console.log('初始化地图');
      
      // 获取当前位置
      const location = await MapService.getCurrentLocation();
      currentLocation.value = location;
      
      // 初始化地图服务
      const result = await MapService.init({
        initialLocation: location,
        containerId: 'map-container',
        zoom: 15,
        // 注册事件处理
        onMapClick: handleMapClick,
        onDragEnd: () => console.log('地图拖动结束'),
        onZoomChange: (zoom) => console.log('地图缩放级别:', zoom),
        // 设置加载标记的回调
        loadMarkers: loadMarkersInView
      });
      
      if (result) {
        // 获取地图实例（如果需要直接操作）
        map.value = MapService.getMapInstance();
        isMapReady.value = true;
        
        console.log('地图初始化成功');
        
        // 加载初始标记
        await loadMarkersInView();
        
        // 添加用户位置标记
        if (userStore.isAuthenticated) {
          addUserMarker();
        }
      }
    } catch (err) {
      console.error('初始化地图失败:', err);
      uni.showToast({
        title: '地图初始化失败，请重试',
        icon: 'none'
      });
    }
  };
  
  /**
   * 加载可视区域内的标记
   */
  const loadMarkersInView = async () => {
    if (!isMapReady.value) return;
    
    try {
      // 使用API获取区域内的标记
      const markers = await MapService.loadMarkersInView(
        // 获取标记的函数
        async (params) => {
          try {
            const response = await api.markers.getMarkersInBounds(params);
            return response.success ? response.data : [];
          } catch (err) {
            console.error('获取标记失败:', err);
            return [];
          }
        },
        // 选项
        {
          clearExisting: true,
          keepUserMarkers: true,
          showMarkers: showMarkers.value,
          onMarkerClick: (markerData) => {
            console.log('点击了标记:', markerData);
            showMarkerDetail(markerData.id);
          }
        }
      );
      
      console.log(`加载了 ${markers.length} 个标记`);
    } catch (err) {
      console.error('加载标记失败:', err);
    }
  };
  
  /**
   * 添加用户位置标记
   */
  const addUserMarker = () => {
    if (!userStore.isAuthenticated || !isMapReady.value) return;
    
    try {
      // 准备用户数据
      const userData = {
        id: userStore.userInfo?.id || 'temp_user',
        position: currentLocation.value,
        avatar: userAvatar.value,
        nickname: userStore.userInfo?.nickname || userStore.userInfo?.username || '我'
      };
      
      // 添加用户标记
      MapService.addUserLocationMarker(userData, () => {
        console.log('点击了自己的位置标记');
      });
    } catch (err) {
      console.error('添加用户标记失败:', err);
    }
  };
  
  /**
   * 处理地图点击
   */
  const handleMapClick = (e) => {
    console.log('地图点击:', e);
    // 实现点击地图的逻辑
  };
  
  /**
   * 显示标记详情
   */
  const showMarkerDetail = (markerId) => {
    console.log('显示标记详情:', markerId);
    // 实现显示标记详情的逻辑
  };
  
  /**
   * 切换标记显示/隐藏
   */
  const toggleMarkersVisibility = () => {
    showMarkers.value = !showMarkers.value;
    MapService.toggleMarkersVisibility(showMarkers.value);
  };
  
  /**
   * 移动到当前位置
   */
  const moveToCurrentLocation = () => {
    MapService.moveToUserLocation(16);
  };
  
  /**
   * 开始遛狗记录
   */
  const startWalking = () => {
    if (MapService.startWalking()) {
      console.log('开始记录遛狗轨迹');
      // 启动计时器等
    }
  };
  
  /**
   * 结束遛狗记录
   */
  const stopWalking = () => {
    const walkData = MapService.stopWalking();
    if (walkData) {
      console.log('遛狗记录:', walkData);
      // 显示遛狗总结、保存记录等
    }
  };
  
  /**
   * 更新位置信息（定时调用）
   */
  const updateLocation = async () => {
    try {
      // 获取新位置
      const location = await MapService.getCurrentLocation();
      currentLocation.value = location;
      
      // 更新用户标记位置
      MapService.updateUserLocationMarker(location);
      
      // 如果正在遛狗，记录路径点
      if (MapService.getWalkingState().isWalking) {
        MapService.recordWalkingPoint(location);
      }
    } catch (err) {
      console.error('更新位置失败:', err);
    }
  };
  
  // 组件挂载时初始化地图
  onMounted(async () => {
    await initMap();
    
    // 设置定时更新位置
    locationUpdateInterval.value = setInterval(updateLocation, 5000);
  });
  
  // 组件卸载时清理资源
  onBeforeUnmount(() => {
    // 清除定时器
    if (locationUpdateInterval.value) {
      clearInterval(locationUpdateInterval.value);
    }
    
    // 确保遛狗模式已停止
    stopWalking();
  });
  
  // 返回需要的函数和状态
  return {
    initMap,
    loadMarkersInView,
    toggleMarkersVisibility,
    moveToCurrentLocation,
    startWalking,
    stopWalking,
    isMapReady,
    showMarkers,
    currentLocation,
    // ... 其他可能需要的状态和函数
  };
}

// ============ 如何在页面中使用地图服务 ============

/*
<template>
  <view class="container">
    <!-- 地图容器 -->
    <view class="map-wrapper">
      <div id="map-container" class="map-container"></div>
    </view>
    
    <!-- 工具栏 -->
    <view class="toolbar">
      <view class="toolbar-item" @tap="moveToCurrentLocation">
        <text class="icon">📍</text>
        <text>定位</text>
      </view>
      <view class="toolbar-item" @tap="toggleMarkersVisibility">
        <text class="icon">👁️</text>
        <text>{{ showMarkers ? '隐藏标记' : '显示标记' }}</text>
      </view>
      <view class="toolbar-item" @tap="isWalking ? stopWalking() : startWalking()">
        <text class="icon">{{ isWalking ? '⏹️' : '▶️' }}</text>
        <text>{{ isWalking ? '停止' : '开始' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useMapInComponent } from '@/utils/mapExample';

// 使用地图功能
const {
  initMap,
  loadMarkersInView,
  toggleMarkersVisibility,
  moveToCurrentLocation,
  startWalking,
  stopWalking,
  isMapReady,
  showMarkers,
  currentLocation
} = useMapInComponent();

// 遛狗状态
const isWalking = ref(false);
const locationUpdateInterval = ref(null);

// 开始遛狗
const startWalkingHandler = () => {
  startWalking();
  isWalking.value = true;
};

// 停止遛狗
const stopWalkingHandler = () => {
  stopWalking();
  isWalking.value = false;
};

// 组件挂载时初始化
onMounted(async () => {
  await initMap();
});

// 返回需要在模板中使用的状态和方法
</script>
*/ 