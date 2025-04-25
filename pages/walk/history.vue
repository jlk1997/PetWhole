<template>
  <view class="history-container">
    <view class="header">
      <view class="back-btn" @click="navBack">
        <text class="back-icon">←</text>
      </view>
      <text class="title">遛狗记录</text>
    </view>
    
    <scroll-view 
      class="record-list" 
      scroll-y="true" 
      @scrolltolower="loadMore"
    >
      <view class="no-records" v-if="records.length === 0 && !isLoading">
        <image class="empty-image" src="/static/images/empty-records.png" mode="aspectFit"></image>
        <text class="empty-text">{{ errorMessage || '暂无遛狗记录' }}</text>
        <button class="start-btn" @click="navToMap">开始遛狗</button>
      </view>
      
      <view class="record-item" v-for="record in records" :key="record._id" @click="viewDetail(record)">
        <view class="record-date">
          <text class="date">{{ formatDate(record.startTime) }}</text>
          <text class="time">{{ formatTime(record.startTime) }}</text>
        </view>
        
        <view class="record-content">
          <view class="record-map">
            <image class="map-image" :src="record.mapImageUrl || '/static/images/default-map.png'" mode="aspectFill"></image>
            <view class="pet-avatar-container">
              <image class="pet-avatar" :src="record.pet?.avatar || '/static/images/default-pet.png'" mode="aspectFill"></image>
            </view>
          </view>
          
          <view class="record-info">
            <view class="record-title">
              <text>{{ record.pet?.name || '未知宠物' }}的遛狗记录</text>
            </view>
            
            <view class="record-stats">
              <view class="stat-item">
                <text class="stat-value">{{ (record.distance / 1000).toFixed(2) }}</text>
                <text class="stat-unit">公里</text>
              </view>
              <view class="stat-divider"></view>
              <view class="stat-item">
                <text class="stat-value">{{ formatDuration(record.duration) }}</text>
                <text class="stat-unit">时长</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="record-footer">
          <view class="action-item" @click.stop="shareRecord(record)">
            <view class="action-icon share-icon"></view>
            <text class="action-text">分享</text>
          </view>
          <view class="action-item" @click.stop="deleteRecord(record)">
            <view class="action-icon delete-icon"></view>
            <text class="action-text">删除</text>
          </view>
        </view>
      </view>
      
      <view class="loading" v-if="isLoading">
        <text>加载中...</text>
      </view>
      
      <view class="end-line" v-if="records.length > 0 && !hasMore && !isLoading">
        <text>- 没有更多记录 -</text>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js';
import { onPullDownRefresh as onPullDownRefreshHook } from '@dcloudio/uni-app';

// 添加日志用于确认增强版代码正在运行
console.log('已加载增强版遛狗记录页面 v2.1 - 修复返回导航逻辑');

export default {
  setup() {
    const userStore = useUserStore();
    
    const records = ref([]);
    const isLoading = ref(false);
    const hasMore = ref(true);
    const pageSize = 10;
    const currentPage = ref(1);
    const isRefreshing = ref(false);
    const errorMessage = ref('');
    
    // 加载遛狗记录
    const loadRecords = async () => {
      if (!hasMore.value || isLoading.value) return;
      
      isLoading.value = true;
      errorMessage.value = '';
      
      try {
        console.log('开始加载遛狗记录, 页码:', currentPage.value, '每页数量:', pageSize);
        console.log('API路径: /api/walks');
        
        const response = await api.walk.getMyWalks({
          page: currentPage.value,
          limit: pageSize
        });
        
        console.log('API响应成功, 返回数据类型:', typeof response, response ? '有数据' : '无数据');
        console.log('API响应数据:', JSON.stringify(response));
        
        // 处理不同的数据格式
        let newRecords = [];
        let noMoreData = false;
        
        // 处理标准API返回格式
        if (response && response.code === 0 && response.data) {
          if (response.data.list && Array.isArray(response.data.list)) {
            console.log('标准API返回格式, 记录数量:', response.data.list.length);
            newRecords = response.data.list;
            noMoreData = newRecords.length < pageSize || (response.data.total && currentPage.value * pageSize >= response.data.total);
          }
        } 
        // 处理直接返回数组的情况
        else if (Array.isArray(response)) {
          console.log('直接返回数组格式, 记录数量:', response.length);
          newRecords = response;
          noMoreData = newRecords.length < pageSize;
        } 
        // 处理嵌套数据结构
        else if (response && typeof response === 'object' && response.data) {
          if (Array.isArray(response.data)) {
            console.log('嵌套数组格式, 记录数量:', response.data.length);
            newRecords = response.data;
            noMoreData = newRecords.length < pageSize;
          } else if (response.data.list && Array.isArray(response.data.list)) {
            console.log('嵌套对象格式, 记录数量:', response.data.list.length);
            newRecords = response.data.list;
            noMoreData = newRecords.length < pageSize || (response.data.total && currentPage.value * pageSize >= response.data.total);
          }
        }
        
        if (newRecords.length === 0 && currentPage.value === 1) {
          console.log('没有找到任何遛狗记录');
          errorMessage.value = '您还没有遛狗记录，快去遛狗吧！';
          hasMore.value = false;
        } else {
          console.log('成功加载遛狗记录, 数量:', newRecords.length);
          records.value = currentPage.value === 1 ? [...newRecords] : [...records.value, ...newRecords];
          currentPage.value++;
          hasMore.value = !noMoreData;
          console.log('当前已加载记录总数:', records.value.length, '是否有更多:', hasMore.value);
        }
      } catch (error) {
        console.error('加载遛狗记录失败:', error);
        console.error('错误详情:', error.message || '未知错误');
        if (error.statusCode) {
          console.error('HTTP状态码:', error.statusCode);
        }
        
        // 显示更详细的错误信息
        let errMsg = '加载失败，请重试';
        if (error && error.message) {
          if (error.statusCode === 404) {
            errMsg = 'API接口不存在，后端可能尚未实现此功能';
            errorMessage.value = '无法加载遛狗记录，后端API未找到';
          } else if (error.statusCode === 401) {
            errMsg = '登录已过期，请重新登录';
            // 跳转到登录页面
            setTimeout(() => {
              uni.navigateTo({
                url: '/pages/login/login'
              });
            }, 1500);
          } else {
            errMsg = `加载失败: ${error.message}`;
            errorMessage.value = '加载遛狗记录失败，请稍后再试';
          }
        }
        
        uni.showToast({
          title: errMsg,
          icon: 'none',
          duration: 3000
        });
      } finally {
        isLoading.value = false;
        if (isRefreshing.value) {
          isRefreshing.value = false;
        }
      }
    };
    
    // 重置列表
    const resetList = () => {
      records.value = [];
      currentPage.value = 1;
      hasMore.value = true;
    };
    
    // 加载更多
    const loadMore = () => {
      if (hasMore.value && !isLoading.value) {
        loadRecords();
      }
    };
    
    // 下拉刷新
    const onRefresh = () => {
      isRefreshing.value = true;
      resetList();
      loadRecords();
    };
    
    // 查看详情
    const viewDetail = (record) => {
      uni.navigateTo({
        url: `/pages/walk/detail?id=${record._id}`
      });
    };
    
    // 分享记录
    const shareRecord = (record) => {
      // 生成分享内容
      const pet = record.pet?.name || '我的宠物';
      const distance = (record.distance / 1000).toFixed(2);
      const duration = formatDuration(record.duration);
      const content = `我和${pet}一起遛了${distance}公里，用时${duration}！`;
      
      // 导航到发帖页面
      uni.navigateTo({
        url: '/pages/community/create',
        success: (page) => {
          // 通过事件通道传递预填内容
          uni.$emit('createPost', {
            content: content,
            walkRecord: {
              _id: record._id,
              distance: record.distance,
              duration: record.duration,
              pet: record.pet?._id,
              startTime: record.startTime,
              endTime: record.endTime
            }
          });
        },
        fail: (err) => {
          console.error('导航到社区发帖页面失败:', err);
          uni.showToast({
            title: '打开社区页面失败',
            icon: 'none'
          });
        }
      });
    };
    
    // 删除记录
    const deleteRecord = (record) => {
      uni.showModal({
        title: '删除记录',
        content: '确定要删除这条遛狗记录吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              isLoading.value = true;
              console.log('正在删除记录ID:', record._id || record.id);
              
              // 尝试通过API删除
              const response = await api.walk.deleteWalk(record._id || record.id);
              console.log('删除记录API响应:', response);
              
              // 从列表中移除，无论API成功与否
              records.value = records.value.filter(r => (r._id || r.id) !== (record._id || record.id));
              
              // 如果是本地存储记录，手动从本地存储中删除
              if (record.id && record.id.startsWith('walk_')) {
                try {
                  console.log('从本地存储中删除记录');
                  const walkStorage = require('@/utils/walkStorage.js').default;
                  walkStorage.deleteWalkRecord(record.id);
                } catch (storageError) {
                  console.error('本地存储删除失败:', storageError);
                }
              }
              
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 重新加载记录列表以确保同步
              setTimeout(() => {
                resetList();
                loadRecords();
              }, 1000);
              
            } catch (error) {
              console.error('删除记录失败:', error);
              console.error('错误详情:', error.message || '未知错误');
              if (error.statusCode) {
                console.error('HTTP状态码:', error.statusCode);
              }
              
              uni.showToast({
                title: error.message || '删除失败，请重试',
                icon: 'none',
                duration: 3000
              });
            } finally {
              isLoading.value = false;
            }
          }
        }
      });
    };
    
    // 导航到地图页面
    const navToMap = () => {
      uni.switchTab({
        url: '/pages/map/map'
      });
    };
    
    // 添加返回上一页的导航函数
    const navBack = () => {
      // 优先使用小程序原生的返回
      const pages = getCurrentPages();
      if (pages.length > 1) {
        uni.navigateBack();
      } else {
        // 如果没有历史页面，导航到"我的"页面
        uni.switchTab({
          url: '/pages/my/index'
        });
      }
    };
    
    // 格式化日期
    const formatDate = (timestamp) => {
      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      
      return `${year}年${month}月${day}日`;
    };
    
    // 格式化时间
    const formatTime = (timestamp) => {
      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      
      return `${hours}:${minutes}`;
    };
    
    // 格式化时长
    const formatDuration = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) {
        return `${hours}小时${minutes}分`;
      } else if (minutes > 0) {
        return `${minutes}分${secs}秒`;
      } else {
        return `${secs}秒`;
      }
    };
    
    onMounted(() => {
      if (userStore.token) {
        loadRecords();
      } else {
        // 修改重定向逻辑，避免从登录页回来后再次跳转到登录页
        uni.showToast({
          title: '请先登录',
          icon: 'none',
          success: () => {
            setTimeout(() => {
              uni.navigateTo({ url: '/pages/login/login' });
            }, 1500);
          }
        });
      }
    });
    
    // Add the onPullDownRefresh inside setup
    onPullDownRefreshHook(() => {
      console.log('页面下拉刷新');
      resetList();
      loadRecords().finally(() => {
        uni.stopPullDownRefresh();
      });
    });
    
    return {
      records,
      isLoading,
      hasMore,
      isRefreshing,
      errorMessage,
      loadMore,
      onRefresh,
      viewDetail,
      shareRecord,
      deleteRecord,
      navToMap,
      formatDate,
      formatTime,
      formatDuration,
      navBack,
      loadRecords,
      resetList
    };
  }
};
</script>

<style lang="scss" scoped>
.history-container {
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
}

.back-btn {
  padding: 10rpx;
  margin-right: 20rpx;
}

.back-icon {
  font-size: 40rpx;
  font-weight: bold;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.no-records {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.start-btn {
  background-color: #3B9E82;
  color: #fff;
  font-size: 28rpx;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  border: none;
}

.record-item {
  margin: 20rpx;
  background-color: #fff;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.record-date {
  padding: 20rpx 30rpx;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
}

.date {
  font-size: 28rpx;
  color: #333;
  font-weight: bold;
}

.time {
  font-size: 24rpx;
  color: #666;
}

.record-content {
  display: flex;
  padding: 30rpx;
}

.record-map {
  position: relative;
  width: 200rpx;
  height: 150rpx;
  margin-right: 20rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.map-image {
  width: 100%;
  height: 100%;
}

.pet-avatar-container {
  position: absolute;
  right: 10rpx;
  bottom: 10rpx;
  background-color: #fff;
  border-radius: 50%;
  padding: 4rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.2);
}

.pet-avatar {
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
}

.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.record-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.record-stats {
  display: flex;
  align-items: center;
}

.stat-item {
  display: flex;
  align-items: baseline;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #3B9E82;
}

.stat-unit {
  font-size: 24rpx;
  color: #666;
  margin-left: 6rpx;
}

.stat-divider {
  width: 2rpx;
  height: 30rpx;
  background-color: #eee;
  margin: 0 30rpx;
}

.record-footer {
  display: flex;
  padding: 20rpx 30rpx;
  border-top: 1px solid #f0f0f0;
}

.action-item {
  display: flex;
  align-items: center;
  margin-right: 40rpx;
}

.action-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 10rpx;
  background-size: contain;
  background-repeat: no-repeat;
}

.share-icon {
  background-image: url('/static/images/share-icon.png');
}

.delete-icon {
  background-image: url('/static/images/delete-icon.png');
}

.action-text {
  font-size: 26rpx;
  color: #666;
}

.loading, .end-line {
  text-align: center;
  padding: 30rpx;
  color: #999;
  font-size: 24rpx;
}

.record-list {
  height: calc(100vh - 90rpx) !important;
  width: 100%;
}
</style> 