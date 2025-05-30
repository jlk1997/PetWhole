<template>
  <view class="my-markers-container">
    <view class="header">
      <text class="page-title">我的标记</text>
    </view>
    
    <view class="markers-list">
      <!-- 加载状态显示 -->
      <view v-if="loading" class="loading-container">
        <text class="loading-text">加载中...</text>
      </view>
      
      <!-- 无标记时显示 -->
      <view v-else-if="markers.length === 0" class="empty-state">
        <image class="empty-icon" src="/static/images/empty-markers.png" mode="aspectFit"></image>
        <text class="empty-text">您还没有添加任何标记</text>
        <button class="add-btn" @tap="navigateToAddMarker">添加标记</button>
      </view>
      
      <!-- 标记列表 -->
      <template v-else>
        <view class="marker-item" v-for="(marker, index) in markers" :key="marker._id" @tap="editMarker(marker)">
          <view class="marker-icon" :style="{ backgroundColor: marker.color || '#FF5733' }">
            <image class="icon" :src="marker.icon || '/static/images/marker.png'" mode="aspectFit"></image>
          </view>
          <view class="marker-info">
            <text class="marker-title">{{ marker.title }}</text>
            <text class="marker-desc">{{ marker.description || '无描述' }}</text>
            <text class="marker-type">类型: {{ getMarkerTypeLabel(marker) }}</text>
            <text class="marker-date">创建时间: {{ formatDate(marker.createdAt) }}</text>
          </view>
          <view class="marker-actions">
            <button class="action-btn delete-btn" @tap.stop="confirmDeleteMarker(marker._id)">删除</button>
          </view>
        </view>
      </template>
    </view>
    
    <!-- 删除确认弹窗 -->
    <view v-if="showDeleteConfirm" class="confirm-dialog">
      <view class="dialog-content">
        <text class="dialog-title">确认删除</text>
        <text class="dialog-text">确定要删除此标记吗？此操作不可撤销。</text>
        <view class="dialog-buttons">
          <button class="dialog-btn cancel-btn" @tap="showDeleteConfirm = false">取消</button>
          <button class="dialog-btn confirm-btn" @tap="deleteMarker">确认删除</button>
        </view>
      </view>
    </view>

    <!-- 添加编辑标记弹窗 -->
    <view v-if="showEditDialog" class="edit-dialog">
      <view class="edit-dialog-content">
        <view class="edit-dialog-header">
          <text class="edit-dialog-title">编辑标记</text>
          <text class="edit-close-btn" @tap="closeEditDialog">×</text>
        </view>
        
        <view class="edit-form">
          <!-- 标记标题 -->
          <view class="edit-form-item">
            <text class="edit-form-label">标记标题<text class="required">*</text></text>
            <input class="edit-form-input" type="text" v-model="editingMarker.title" placeholder="请输入标记标题" maxlength="50" />
          </view>
          
          <!-- 标记描述 -->
          <view class="edit-form-item">
            <text class="edit-form-label">标记描述</text>
            <textarea class="edit-form-textarea" v-model="editingMarker.description" placeholder="请输入标记描述" maxlength="200" />
          </view>
          
          <!-- 标记类型 -->
          <view class="edit-form-item">
            <text class="edit-form-label">标记类型</text>
            <picker class="edit-form-picker" :range="markerTypes" range-key="label" @change="handleTypeChange">
              <view class="edit-picker-value">
                {{ getEditingTypeLabel() }}
              </view>
            </picker>
          </view>
          
          <!-- 自定义类型名称 -->
          <view class="edit-form-item" v-if="editingMarker.type === 'custom'">
            <text class="edit-form-label">自定义类型名称</text>
            <input class="edit-form-input" type="text" v-model="editingMarker.customTypeName" placeholder="请输入自定义类型名称" maxlength="20" />
          </view>
          
          <!-- 标记颜色 -->
          <view class="edit-form-item">
            <text class="edit-form-label">标记颜色</text>
            <view class="edit-color-selector">
              <view 
                v-for="(color, index) in colorOptions" 
                :key="index" 
                class="edit-color-item" 
                :style="{ backgroundColor: color }"
                :class="{ active: editingMarker.color === color }"
                @tap="selectColor(color)"
              ></view>
            </view>
          </view>
          
          <!-- 覆盖半径 -->
          <view class="edit-form-item">
            <text class="edit-form-label">覆盖半径 (千米)</text>
            <slider 
              class="edit-radius-slider" 
              :min="0.1" 
              :max="10" 
              :step="0.1" 
              :value="editingMarker.radius || 1" 
              :show-value="true" 
              @change="handleRadiusChange"
            />
            <text class="edit-radius-value">{{ editingMarker.radius || 1 }}km</text>
          </view>
          
          <!-- 公开设置 -->
          <view class="edit-form-item checkbox-item">
            <checkbox :checked="editingMarker.isPublic" @tap="togglePublic" />
            <text class="checkbox-label">公开此标记（允许其他用户看到）</text>
          </view>
          
          <!-- 按钮操作 -->
          <view class="edit-form-actions">
            <button class="edit-btn cancel-btn" @tap="closeEditDialog">取消</button>
            <button class="edit-btn save-btn" @tap="saveMarker">保存</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { useMarkerStore } from '@/stores/markerStore.js';
import { useUserStore } from '@/store/user.js';

const markerStore = useMarkerStore();
const userStore = useUserStore();

// 标记数据
const markers = ref([]);
const loading = ref(true);
const showDeleteConfirm = ref(false);
const markerToDelete = ref(null);

// 添加编辑功能相关变量
const showEditDialog = ref(false);
const editingMarker = reactive({
  _id: '',
  title: '',
  description: '',
  type: 'general',
  customTypeName: '',
  color: '#FF5733',
  isPublic: true,
  latitude: 0,
  longitude: 0,
  radius: 1,
  properties: {}
});

// 颜色选项
const colorOptions = [
  '#FF5733', // 红色
  '#33FF57', // 绿色
  '#3357FF', // 蓝色
  '#FF33F5', // 粉色
  '#F5FF33', // 黄色
  '#33FFF5'  // 青色
];

// 标记类型选项与对应图标
const markerTypes = [
  { value: 'general', label: '一般标记' },
  { value: 'pet_friendly', label: '宠物友好' },
  { value: 'danger', label: '危险区域' },
  { value: 'scenic', label: '风景优美' },
  { value: 'pet_service', label: '宠物服务' },
  { value: 'custom', label: '自定义' }
];

// 加载用户标记
const loadUserMarkers = async () => {
  loading.value = true;
  try {
    // 确保用户信息已加载
    if (!userStore.userInfo || !userStore.user) {
      console.log('用户信息未加载，尝试获取...');
      await userStore.fetchUserInfo();
    }
    
    // 使用安全的方式获取用户ID
    const userId = userStore.userInfo?._id || userStore.user?._id;
    
    if (!userId) {
      console.error('用户ID不可用，可能未登录');
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      });
      
      // 延迟跳转到登录页面
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    console.log('开始获取用户标记，用户ID:', userId);
    
    // 从 markerStore 获取用户的标记
    const userMarkers = await markerStore.fetchUserMarkers(userId);
    markers.value = userMarkers || [];
    
    console.log('获取到用户标记数量:', markers.value.length);
  } catch (error) {
    console.error('获取用户标记失败:', error);
    uni.showToast({
      title: '加载标记失败',
      icon: 'none'
    });
  } finally {
    loading.value = false;
  }
};

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知时间';
  const date = new Date(dateString);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

// 获取标记类型标签
const getMarkerTypeLabel = (marker) => {
  if (marker.type === 'custom' && marker.properties && marker.properties.customTypeName) {
    return `自定义: ${marker.properties.customTypeName}`;
  }
  const type = markerTypes.find(t => t.value === marker.type);
  return type ? type.label : '未知类型';
};

// 获取编辑中标记的类型标签
const getEditingTypeLabel = () => {
  if (editingMarker.type === 'custom' && editingMarker.customTypeName) {
    return `自定义: ${editingMarker.customTypeName}`;
  }
  const type = markerTypes.find(t => t.value === editingMarker.type);
  return type ? type.label : '请选择标记类型';
};

// 添加标记
const navigateToAddMarker = () => {
  uni.navigateTo({
    url: '/pages/map/add-marker'
  });
};

// 编辑标记
const editMarker = (marker) => {
  console.log('编辑标记:', marker);
  
  // 在地图上查看标记 (保留此功能便于在地图上查看标记位置)
  const viewOnMap = (e) => {
    e.stopPropagation();
    uni.navigateTo({
      url: `/pages/map/map?markerId=${marker._id}&latitude=${marker.latitude}&longitude=${marker.longitude}`
    });
  };
  
  // 复制标记数据到编辑对象
  Object.assign(editingMarker, {
    _id: marker._id,
    title: marker.title || '',
    description: marker.description || '',
    type: marker.type || 'general',
    color: marker.color || '#FF5733',
    isPublic: marker.isPublic !== false, // 默认为true
    latitude: marker.latitude || 0,
    longitude: marker.longitude || 0,
    radius: marker.radius || 1,
    properties: marker.properties || {}
  });
  
  // 处理自定义类型名称
  if (marker.type === 'custom' && marker.properties && marker.properties.customTypeName) {
    editingMarker.customTypeName = marker.properties.customTypeName;
  } else {
    editingMarker.customTypeName = '';
  }
  
  // 显示编辑弹窗
  showEditDialog.value = true;
};

// 关闭编辑弹窗
const closeEditDialog = () => {
  showEditDialog.value = false;
};

// 处理标记类型变更
const handleTypeChange = (e) => {
  const index = e.detail.value;
  editingMarker.type = markerTypes[index].value;
  // 如果不是自定义类型，清空自定义类型名称
  if (editingMarker.type !== 'custom') {
    editingMarker.customTypeName = '';
  }
};

// 处理半径变更
const handleRadiusChange = (e) => {
  editingMarker.radius = parseFloat(e.detail.value);
};

// 选择颜色
const selectColor = (colorValue) => {
  editingMarker.color = colorValue;
};

// 切换公开状态
const togglePublic = () => {
  editingMarker.isPublic = !editingMarker.isPublic;
};

// 保存编辑后的标记
const saveMarker = async () => {
  // 验证必填字段
  if (!editingMarker.title) {
    uni.showToast({
      title: '请输入标记标题',
      icon: 'none'
    });
    return;
  }
  
  // 如果是自定义类型，需要验证自定义类型名称
  if (editingMarker.type === 'custom' && !editingMarker.customTypeName.trim()) {
    uni.showToast({
      title: '请输入自定义类型名称',
      icon: 'none'
    });
    return;
  }
  
  // 准备提交的数据
  const updateData = {
    title: editingMarker.title,
    description: editingMarker.description,
    type: editingMarker.type,
    color: editingMarker.color,
    radius: editingMarker.radius,
    isPublic: editingMarker.isPublic,
    properties: { ...editingMarker.properties }
  };
  
  // 如果是自定义类型，添加自定义类型名称
  if (editingMarker.type === 'custom') {
    updateData.properties.customTypeName = editingMarker.customTypeName.trim();
  }
  
  try {
    // 显示加载提示
    uni.showLoading({
      title: '保存中...',
      mask: true
    });
    
    // 调用API更新标记
    const result = await markerStore.updateMarker({
      id: editingMarker._id,
      data: updateData
    });
    
    uni.hideLoading();
    
    if (result) {
      // 更新成功，关闭弹窗
      showEditDialog.value = false;
      
      // 更新本地数据
      const index = markers.value.findIndex(m => m._id === editingMarker._id);
      if (index !== -1) {
        // 更新列表中的标记
        markers.value[index] = { ...result };
      }
      
      // 显示成功提示
      uni.showToast({
        title: '标记已更新',
        icon: 'success'
      });
    } else {
      uni.showModal({
        title: '更新失败',
        content: '服务器处理请求失败，请稍后再试',
        showCancel: false
      });
    }
  } catch (error) {
    uni.hideLoading();
    console.error('更新标记失败:', error);
    
    // 显示详细错误信息
    const errorMsg = error.response?.data?.message || 
                    error.message || 
                    '服务器连接失败，请检查网络';
    
    uni.showModal({
      title: '更新失败',
      content: errorMsg,
      showCancel: false
    });
  }
};

// 确认删除标记
const confirmDeleteMarker = (markerId) => {
  markerToDelete.value = markerId;
  showDeleteConfirm.value = true;
};

// 删除标记
const deleteMarker = async () => {
  if (!markerToDelete.value) return;
  
  // 添加删除中的加载状态
  const deletingId = markerToDelete.value;
  const deletingIndex = markers.value.findIndex(m => m._id === deletingId);
  
  if (deletingIndex >= 0) {
    // 标记为删除中状态
    markers.value[deletingIndex].isDeleting = true;
  }
  
  // 显示加载提示
  uni.showLoading({
    title: '删除中...',
    mask: true
  });
  
  try {
    const result = await markerStore.deleteMarker(deletingId);
    
    uni.hideLoading();
    
    if (result) {
      uni.showToast({
        title: '标记已删除',
        icon: 'success',
        duration: 2000
      });
      
      // 从列表中移除已删除的标记
      markers.value = markers.value.filter(marker => marker._id !== deletingId);
    } else {
      // 恢复标记状态
      if (deletingIndex >= 0) {
        markers.value[deletingIndex].isDeleting = false;
      }
      
      uni.showModal({
        title: '删除失败',
        content: '服务器处理请求失败，请稍后再试',
        showCancel: false
      });
    }
  } catch (error) {
    uni.hideLoading();
    
    // 恢复标记状态
    if (deletingIndex >= 0) {
      markers.value[deletingIndex].isDeleting = false;
    }
    
    console.error('删除标记失败:', error);
    
    // 显示详细错误信息
    const errorMsg = error.response?.data?.message || 
                    error.message || 
                    '服务器连接失败，请检查网络';
    
    uni.showModal({
      title: '删除失败',
      content: errorMsg,
      showCancel: false
    });
  } finally {
    showDeleteConfirm.value = false;
    markerToDelete.value = null;
  }
};

onMounted(() => {
  loadUserMarkers();
});
</script>

<style>
.my-markers-container {
  padding: 20px;
  min-height: 100vh;
  background-color: #f8f8f8;
}

.header {
  padding: 10px 0;
  margin-bottom: 20px;
}

.page-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.loading-text {
  font-size: 16px;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 50px 0;
}

.empty-icon {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin-bottom: 20px;
}

.add-btn {
  padding: 10px 20px;
  background-color: #007AFF;
  color: white;
  border-radius: 5px;
  font-size: 16px;
}

.markers-list {
  margin-bottom: 20px;
}

.marker-item {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
  position: relative;
}

/* 添加点击状态效果 */
.marker-item:active {
  background-color: #f0f0f0;
  transform: scale(0.99);
}

.marker-icon {
  width: 50px;
  height: 50px;
  border-radius: 25px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
}

.icon {
  width: 30px;
  height: 30px;
}

.marker-info {
  flex: 1;
}

.marker-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.marker-desc {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.marker-type, .marker-date {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.marker-actions {
  display: flex;
  flex-direction: column;
}

.action-btn {
  padding: 8px 15px;
  border-radius: 5px;
  font-size: 14px;
  margin-bottom: 5px;
}

.delete-btn {
  background-color: #FF3B30;
  color: white;
}

.confirm-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.dialog-content {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  width: 80%;
  max-width: 300px;
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
}

.dialog-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.dialog-buttons {
  display: flex;
  justify-content: space-between;
}

.dialog-btn {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 16px;
}

.cancel-btn {
  background-color: #E0E0E0;
  color: #333;
}

.confirm-btn {
  background-color: #FF3B30;
  color: white;
}

/* 编辑弹窗样式 */
.edit-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.edit-dialog-content {
  background-color: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.edit-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.edit-dialog-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.edit-close-btn {
  font-size: 24px;
  color: #666;
  padding: 0 10px;
}

.edit-form {
  padding: 20px;
}

.edit-form-item {
  margin-bottom: 20px;
}

.edit-form-label {
  display: block;
  font-size: 16px;
  color: #333;
  margin-bottom: 8px;
}

.required {
  color: #ff3b30;
  margin-left: 3px;
}

.edit-form-input, .edit-form-textarea, .edit-form-picker {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  color: #333;
  background-color: #f9f9f9;
}

.edit-form-textarea {
  height: 100px;
}

.edit-picker-value {
  padding: 12px;
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  color: #333;
}

.edit-color-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
}

.edit-color-item {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: 2px solid transparent;
}

.edit-color-item.active {
  border-color: #007AFF;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-label {
  font-size: 16px;
  color: #333;
}

.edit-radius-slider {
  margin: 10px 0;
}

.edit-radius-value {
  display: block;
  font-size: 14px;
  color: #666;
  text-align: right;
}

.edit-form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 30px;
}

.edit-btn {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 16px;
}

.cancel-btn {
  background-color: #E0E0E0;
  color: #333;
}

.save-btn {
  background-color: #007AFF;
  color: white;
}
</style> 