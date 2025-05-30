<template>
  <view class="container">
    <view class="tab-container">
      <view class="tab" :class="{ active: activeTab === 'nearby' }" @tap="activeTab = 'nearby'">
        <text>附近 5公里</text>
      </view>
      <view class="tab" :class="{ active: activeTab === 'city' }" @tap="activeTab = 'city'">
        <text>城市频道</text>
      </view>
    </view>
    
    <!-- 附近5公里聊天内容 -->
    <view class="content" v-if="activeTab === 'nearby'">
      <view class="location-info">
        <text class="location-text">{{ currentLocation.address || '正在获取位置...' }}</text>
        <view class="refresh-btn" @tap="refreshLocation">
          <text class="refresh-icon">🔄</text>
        </view>
      </view>
      
      <scroll-view 
        class="message-list nearby-message-list" 
        scroll-y="true" 
        :scroll-top="scrollTop" 
        :scroll-with-animation="true"
        :scroll-animation-duration="100"
        :enhanced="true"
        :bounces="false"
        :show-scrollbar="false"
        @scrolltolower="loadMoreNearbyMessages"
        @scroll="onScroll"
        ref="nearbyMessageList"
      >
        <view class="messages-container">
          <!-- 没有更多消息提示 -->
          <view class="no-more" v-if="noMoreNearbyMessages && nearbyMessages.length > 0">
            <text>没有更多消息了</text>
          </view>
          
          <!-- 消息项 -->
          <view 
            v-for="(message, index) in nearbyMessages" 
            :key="message.id || index"
            class="message-item"
            :id="'nearby-msg-' + (message.id || index)"
          >
            <!-- 日期分隔线 -->
            <view class="date-divider" v-if="shouldShowDate(message, index, nearbyMessages)">
              <text>{{ formatDate(message.createTime) }}</text>
            </view>
            
            <view class="message-content">
              <!-- 用户头像 -->
              <image 
                class="avatar" 
                :src="formatAvatarUrl(message.userAvatar)" 
                mode="aspectFill"
              ></image>
              
              <view class="message-bubble">
                <view class="message-header">
                  <text class="username">{{ message.userName }}</text>
                  <text class="time">{{ formatTime(message.createTime) }}</text>
                </view>
                <text class="message-text">{{ message.content }}</text>
                <view class="message-footer" v-if="message.distance">
                  <text class="distance">距离: {{ formatDistance(message.distance) }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 空消息状态 -->
        <view class="empty-state" v-if="nearbyMessages.length === 0 && !isLoading">
          <image class="empty-icon" src="/static/images/empty-message.png" mode="aspectFit"></image>
          <text class="empty-text">附近暂无消息</text>
          <text class="empty-tip">发送一条消息，成为第一个发言的人吧</text>
        </view>
        
        <!-- 加载中提示 -->
        <view class="loading-state" v-if="isLoading">
          <text>加载中...</text>
        </view>
      </scroll-view>
      
      <!-- 在scroll-view下方添加回到底部按钮 -->
      <view class="back-to-bottom-btn" v-if="showBackToBottom" @tap="scrollToBottom">
        <text class="icon">↓</text>
      </view>
    </view>
    
    <!-- 城市频道内容 -->
    <view class="content" v-if="activeTab === 'city'">
      <view class="location-info">
        <text class="location-text">{{ currentLocation.city || '正在获取城市...' }}</text>
        <view class="refresh-btn" @tap="refreshLocation">
          <text class="refresh-icon">🔄</text>
        </view>
      </view>
      
      <scroll-view 
        class="message-list city-message-list" 
        scroll-y="true" 
        :scroll-top="cityScrollTop" 
        :scroll-with-animation="true"
        :scroll-animation-duration="100"
        :enhanced="true"
        :bounces="false"
        :show-scrollbar="false"
        @scrolltolower="loadMoreCityMessages"
        @scroll="onScroll"
        ref="cityMessageList"
      >
        <view class="messages-container">
          <!-- 没有更多消息提示 -->
          <view class="no-more" v-if="noMoreCityMessages && cityMessages.length > 0">
            <text>没有更多消息了</text>
          </view>
          
          <!-- 消息项 -->
          <view 
            v-for="(message, index) in cityMessages" 
            :key="message.id || index"
            class="message-item"
            :id="'city-msg-' + (message.id || index)"
          >
            <!-- 日期分隔线 -->
            <view class="date-divider" v-if="shouldShowDate(message, index, cityMessages)">
              <text>{{ formatDate(message.createTime) }}</text>
            </view>
            
            <view class="message-content">
              <!-- 用户头像 -->
              <image 
                class="avatar" 
                :src="formatAvatarUrl(message.userAvatar)" 
                mode="aspectFill"
              ></image>
              
              <view class="message-bubble">
                <view class="message-header">
                  <text class="username">{{ message.userName }}</text>
                  <text class="time">{{ formatTime(message.createTime) }}</text>
                </view>
                <text class="message-text">{{ message.content }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 空消息状态 -->
        <view class="empty-state" v-if="cityMessages.length === 0 && !isLoading">
          <image class="empty-icon" src="/static/images/empty-message.png" mode="aspectFit"></image>
          <text class="empty-text">城市频道暂无消息</text>
          <text class="empty-tip">发送一条消息，成为第一个发言的人吧</text>
        </view>
        
        <!-- 加载中提示 -->
        <view class="loading-state" v-if="isLoading">
          <text>加载中...</text>
        </view>
      </scroll-view>
      
      <!-- 在scroll-view下方添加回到底部按钮 -->
      <view class="back-to-bottom-btn" v-if="showBackToBottom" @tap="scrollToBottom">
        <text class="icon">↓</text>
      </view>
    </view>
    
    <!-- 输入区域 - 修改为固定在底部 -->
    <view class="input-area">
      <input 
        type="text" 
        class="message-input" 
        v-model="newMessage" 
        placeholder="输入消息..."
        :focus="inputFocus"
        confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="send-btn" :class="{ active: newMessage.trim() }" @tap="sendMessage">
        <text>发送</text>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, reactive, onMounted, computed, watch, nextTick, onUnmounted } from 'vue';
import { onLoad, onUnload, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user.js';
import { useLocationStore } from '@/store/location.js';
import { getCurrentLocation } from '@/utils/amap.js';
import api from '@/utils/api.js';
import chatService from '@/utils/chatService.js';
import networkManager from '@/utils/networkManager.js';
import chatStorage from '@/utils/chatStorage.js';
import config from '@/config/index.js';

export default {
  setup() {
    const userStore = useUserStore();
    const locationStore = useLocationStore();
    const userInfo = computed(() => userStore.user || {});
    const userId = computed(() => userInfo.value.id || userInfo.value._id || '');
    const activeTab = ref('nearby');
    
    // 网络状态
    const networkStatus = ref({
      isConnected: true,
      networkType: 'unknown'
    });
    
    // 位置相关
    const currentLocation = reactive({
      latitude: null,
      longitude: null,
      address: '',
      city: '',
      district: '',
      lastUpdated: null
    });
    
    // 消息列表
    const nearbyMessages = ref([]);
    const cityMessages = ref([]);
    
    // 滚动控制
    const scrollTop = ref(0);
    const cityScrollTop = ref(0);
    const showBackToBottom = ref(false);
    
    // 加载状态
    const isLoading = ref(false);
    const noMoreNearbyMessages = ref(false);
    const noMoreCityMessages = ref(false);
    
    // 输入相关
    const newMessage = ref('');
    const inputFocus = ref(false);
    
    // 页面状态
    const isVisible = ref(true);
    const nearbyMessagesPage = ref(1);
    const cityMessagesPage = ref(1);
    
    // 自动刷新控制
    let autoRefreshInterval = null;
    
    // 自动检测滚动位置的功能，用于判断是否需要自动滚动到新消息
    const isScrolledToBottom = ref(true);
    
    // 跟踪滚动位置
    const nearbyScrollPosition = ref({ atBottom: true });
    const cityScrollPosition = ref({ atBottom: true });
    
    // 监听网络状态变化
    const setupNetworkListener = () => {
      // 添加网络状态监听
      networkManager.addListener((status) => {
        networkStatus.value = status;
        console.log('网络状态更新:', status);
        
        // 网络恢复在线后自动刷新消息
        if (status.isConnected && isVisible.value) {
          console.log('网络恢复，刷新消息');
          refreshMessages();
        }
      });
      
      // 全局网络恢复事件监听
      uni.$on('network:reconnected', () => {
        if (isVisible.value) {
          console.log('网络恢复事件，刷新消息');
          refreshMessages();
        }
      });
    };
    
    // 消息状态更新监听
    const setupMessageStatusListener = () => {
      uni.$on('chat:message-status-update', ({ messageId, status, serverData }) => {
        console.log('收到消息状态更新:', messageId, status);
        
        // 更新本地消息状态
        const updateMessageInList = (list) => {
          const index = list.findIndex(msg => msg.id === messageId);
          if (index !== -1) {
            // 更新状态
            list[index].status = status;
            
            // 如果有服务器返回的数据，更新ID等信息
            if (serverData) {
              list[index].id = serverData.id || serverData._id || list[index].id;
              list[index].serverTime = serverData.createdAt || serverData.createTime;
            }
            
            return true;
          }
          return false;
        };
        
        // 尝试在两个列表中查找并更新消息
        const updatedInNearby = updateMessageInList(nearbyMessages.value);
        const updatedInCity = updateMessageInList(cityMessages.value);
        
        if (updatedInNearby || updatedInCity) {
          console.log('已更新消息状态');
        }
      });
    };
    
    // 初始化位置信息
    const initLocation = async () => {
      try {
        console.log('开始初始化位置信息');
        // 先从store获取位置
        const storeLocation = locationStore.location;
        if (storeLocation && storeLocation.latitude && storeLocation.longitude) {
          console.log('从store获取到位置信息:', storeLocation);
          currentLocation.latitude = storeLocation.latitude;
          currentLocation.longitude = storeLocation.longitude;
          currentLocation.address = storeLocation.address || '';
          currentLocation.city = storeLocation.city || '';
          currentLocation.district = storeLocation.district || '';
          currentLocation.lastUpdated = storeLocation.lastUpdated || Date.now();
          
          console.log('成功设置位置信息到currentLocation:', currentLocation);
        }
        
        // 如果没有位置信息或位置信息超过10分钟，重新获取
        const TEN_MINUTES = 10 * 60 * 1000;
        if (!currentLocation.latitude || !currentLocation.longitude || 
            !currentLocation.lastUpdated || 
            (Date.now() - currentLocation.lastUpdated > TEN_MINUTES)) {
          console.log('位置信息不存在或已过期，重新获取');
          await refreshLocation();
        } else {
          // 即使有位置信息，也强制刷新一次消息以确保显示最新内容
          console.log('使用现有位置信息加载消息');
          await refreshMessages();
          
          // 确保滚动到底部
          forceScrollToBottom();
          
          // 延迟再次滚动确保生效
          setTimeout(() => {
            forceScrollToBottom();
          }, 500);
          }
      } catch (error) {
        console.error('初始化位置信息失败:', error);
        uni.showToast({
          title: '获取位置信息失败，请检查定位权限',
          icon: 'none'
        });
      }
    };
    
    // 刷新位置信息
    const refreshLocation = async () => {
      try {
        uni.showLoading({
          title: '获取位置中...',
          mask: false
        });
        
        console.log('开始获取位置');
        const location = await getCurrentLocation();
        console.log('获取到位置:', location);
        
        if (location && location.latitude && location.longitude) {
          currentLocation.latitude = location.latitude;
          currentLocation.longitude = location.longitude;
          currentLocation.address = location.address || '';
          currentLocation.city = location.city || '';
          currentLocation.district = location.district || '';
          currentLocation.lastUpdated = Date.now();
          
          // 更新store - 确保包含所有必要字段
          locationStore.updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            city: location.city,
            district: location.district,
            lastUpdated: Date.now(),
            timestamp: new Date().toISOString()
          });
          
          // 强制刷新消息
          console.log('位置获取成功，刷新消息，当前位置:', currentLocation);
          uni.hideLoading();
          await nextTick();
          refreshMessages();
        } else {
          console.error('获取到的位置数据不完整:', location);
          uni.hideLoading();
          uni.showToast({
            title: '获取位置信息不完整，请检查定位权限',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (error) {
        console.error('刷新位置信息失败:', error);
        uni.hideLoading();
        uni.showToast({
          title: '获取位置信息失败，请检查定位权限',
          icon: 'none'
        });
      }
    };
    
    // 刷新消息
    const refreshMessages = async () => {
      console.log('refreshMessages被调用，当前标签:', activeTab.value);
      console.log('当前位置信息:', currentLocation);
    
      // 检查位置信息是否存在
      if (!currentLocation.latitude || !currentLocation.longitude) {
        console.warn('刷新消息失败：位置信息不存在');
        uni.showToast({
          title: '无法获取位置信息，请点击刷新按钮',
          icon: 'none'
        });
        return;
      }
      
      try {
        // 显示加载提示
        uni.showLoading({
          title: '加载中...',
          mask: false
        });
        
      if (activeTab.value === 'nearby') {
          console.log('开始刷新附近消息');
          await loadNearbyMessages(true);
      } else {
          console.log('开始刷新城市消息');
          await loadCityMessages(true);
        }
        
        // 隐藏加载提示
        uni.hideLoading();
        
        console.log('消息刷新完成');
        
        // 直接滚动到底部
        setTimeout(() => {
          if (activeTab.value === 'nearby') {
            scrollTop.value = 999999;
          } else {
            cityScrollTop.value = 999999;
          }
        }, 100);
        
        // 再次尝试滚动，确保成功
        setTimeout(() => {
          if (activeTab.value === 'nearby') {
            scrollTop.value = 999999;
          } else {
            cityScrollTop.value = 999999;
          }
        }, 300);
      } catch (error) {
        uni.hideLoading();
        console.error('刷新消息时发生错误:', error);
        uni.showToast({
          title: '加载消息失败，请稍后再试',
          icon: 'none'
        });
      }
    };
    
    // 加载附近消息
    const loadNearbyMessages = async (refresh = false) => {
      if (!currentLocation.latitude || !currentLocation.longitude) {
        console.log('位置信息不存在，尝试从store获取');
        // 尝试从store获取位置
        const storeLocation = locationStore.location;
        if (storeLocation && storeLocation.latitude && storeLocation.longitude) {
          currentLocation.latitude = storeLocation.latitude;
          currentLocation.longitude = storeLocation.longitude;
          currentLocation.address = storeLocation.address || '';
          currentLocation.city = storeLocation.city || '';
          currentLocation.district = storeLocation.district || '';
          currentLocation.lastUpdated = storeLocation.lastUpdated || Date.now();
          console.log('成功从store获取位置信息:', currentLocation);
        } else {
          console.log('无法获取位置信息，显示提示');
          uni.showToast({
            title: '无法获取位置信息，请检查定位权限',
            icon: 'none'
          });
          return;
        }
      }
      
      if (isLoading.value && !refresh) {
        console.log('已有加载请求进行中，跳过');
        return;
      }
      
      try {
        isLoading.value = true;
        
        // 刷新时重置页码
        if (refresh) {
          nearbyMessagesPage.value = 1;
        noMoreNearbyMessages.value = false;
        }
        
        // 准备参数
        const params = {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          radius: 5000, // 5公里范围
          page: 1, // 始终获取第一页最新消息
          limit: 30, // 每页展示30条消息
          sort: 'desc' // 按时间倒序，最新的消息在结果的前面
        };
        
        // 如果是加载更多，设置页码
        if (!refresh) {
          params.page = nearbyMessagesPage.value;
        }
        
        console.log('加载附近消息, 参数:', params);
        
        // 直接使用API调用获取数据，避免chatService中间层可能的问题
        const response = await api.chat.getNearbyMessages(params);
        console.log('API直接返回的附近消息:', response);
          
        // 处理响应数据 - 确保我们获取到正确的消息数组
        let messages = [];
        if (response && response.data) {
          // 如果response有data字段，使用它
          messages = response.data;
        } else if (Array.isArray(response)) {
          // 如果response本身是数组，直接使用
          messages = response;
        }
        
        // 对消息按时间正序排序，确保旧消息在上，新消息在下
        messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        
        console.log('处理后的消息数据:', messages);
        
        // 处理响应数据
        if (messages && messages.length > 0) {
          if (refresh) {
            // 刷新时，替换全部消息
            nearbyMessages.value = [...messages];
            console.log('刷新消息列表，当前消息数:', nearbyMessages.value.length);
            
            // 刷新时总是滚动到底部
            await nextTick();
            scrollToBottom(true);
          } else {
            // 加载更多时，将更早的消息添加到列表前面
            nearbyMessages.value = [...messages, ...nearbyMessages.value];
            console.log('追加历史消息，当前消息数:', nearbyMessages.value.length);
            }
          
          // 保存到本地缓存
          chatStorage.saveNearbyMessagesCache(nearbyMessages.value);
          
          // 增加页码
          nearbyMessagesPage.value++;
          } else {
          // 没有更多消息
          if (!refresh) {
            noMoreNearbyMessages.value = true;
            console.log('没有更多消息');
          }
          
          // 如果是刷新且没有消息，尝试从缓存加载
          if (refresh && (!messages || messages.length === 0)) {
            const cachedMessages = chatStorage.getNearbyMessagesCache();
            if (cachedMessages && cachedMessages.length > 0) {
              console.log('从缓存加载附近消息');
              // 确保缓存的消息也是按时间排序的
              cachedMessages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
              nearbyMessages.value = cachedMessages;
          }
        }
        }
      } catch (error) {
        console.error('加载附近消息失败:', error);
        
        // 网络错误时尝试从缓存加载
        if (networkManager.isNetworkError && networkManager.isNetworkError(error)) {
          const cachedMessages = chatStorage.getNearbyMessagesCache();
          if (cachedMessages && cachedMessages.length > 0) {
            console.log('网络错误，从缓存加载附近消息');
            
            if (refresh) {
              nearbyMessages.value = cachedMessages;
            } else if (nearbyMessages.value.length === 0) {
              nearbyMessages.value = cachedMessages;
            }
          }
        }
        
        uni.showToast({
          title: '加载消息失败，请检查网络连接',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载城市消息
    const loadCityMessages = async (refresh = false) => {
      if (!currentLocation.city) {
        console.log('城市信息不存在，尝试从地址中提取');
        
        // 尝试从地址中提取城市信息
        if (currentLocation.address) {
          // 尝试从地址中提取城市信息
          const addressParts = currentLocation.address.split('市');
          if (addressParts.length > 0) {
            const cityMatch = addressParts[0].match(/([^省]+?)市/);
            if (cityMatch && cityMatch[1]) {
              currentLocation.city = cityMatch[1];
              console.log('从地址中提取的城市:', currentLocation.city);
            } else {
              // 如果没有匹配到"xx市"格式，尝试直接获取第一部分作为城市
              const parts = currentLocation.address.split(/[省市区县]/);
              if (parts.length > 1) {
                currentLocation.city = parts[1].trim();
                console.log('从地址分割中提取的城市:', currentLocation.city);
              }
            }
          }
        }
        
        // 如果还是无法获取城市，使用默认城市或从经纬度反查
        if (!currentLocation.city && currentLocation.latitude && currentLocation.longitude) {
          console.log('从经纬度反查城市信息');
          try {
            // 尝试使用getCurrentLocation返回的城市信息
            const location = await getCurrentLocation();
            if (location && location.city) {
              currentLocation.city = location.city;
              console.log('从getCurrentLocation获取到城市:', currentLocation.city);
            } else {
              // 如果还是无法获取，使用默认城市
              currentLocation.city = '上海市';
              console.log('无法获取城市信息，使用默认城市');
            }
          } catch (error) {
            console.error('反查城市出错:', error);
            currentLocation.city = '上海市'; // 出错时使用默认城市
          }
        }
        
        // 如果仍然无法获取城市，使用默认城市
        if (!currentLocation.city) {
          console.log('无法获取城市信息，使用默认城市');
          currentLocation.city = '上海市';
        }
        
        // 更新store - 需确保传递完整的位置信息
        if (currentLocation.latitude && currentLocation.longitude) {
          locationStore.updateLocation({
            ...locationStore.location,
            city: currentLocation.city,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            timestamp: new Date().toISOString()
          });
        } else {
          console.log('无法更新位置store：缺少经纬度信息');
        }
      }
      
      if (isLoading.value && !refresh) {
        console.log('已有加载请求进行中，跳过');
        return;
      }
      
      try {
        isLoading.value = true;
        
        // 刷新时重置页码
        if (refresh) {
          cityMessagesPage.value = 1;
          noMoreCityMessages.value = false;
        }
        
        // 准备参数
        const params = {
          cityName: currentLocation.city,
          page: 1, // 始终获取第一页最新消息
          limit: 30, // 每页展示30条消息
          sort: 'desc' // 按时间倒序，最新的消息在结果的前面
        };
        
        // 如果是加载更多，设置页码
        if (!refresh) {
          params.page = cityMessagesPage.value;
        }
        
        console.log('加载城市消息, 参数:', params);
          
        // 直接使用API调用获取数据，避免chatService中间层可能的问题
        const response = await api.chat.getCityMessages(params);
        console.log('API直接返回的城市消息:', response);
        
        // 处理响应数据 - 确保我们获取到正确的消息数组
        let messages = [];
        if (response && response.data) {
          // 如果response有data字段，使用它
          messages = response.data;
        } else if (Array.isArray(response)) {
          // 如果response本身是数组，直接使用
          messages = response;
        }
        
        // 对消息按时间正序排序，确保旧消息在上，新消息在下
        messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        
        console.log('处理后的城市消息数据:', messages);
        
        // 处理响应数据
        if (messages && messages.length > 0) {
          if (refresh) {
            // 刷新时，替换全部消息
            cityMessages.value = [...messages];
            console.log('刷新城市消息列表，当前消息数:', cityMessages.value.length);
            
            // 刷新时总是滚动到底部
            await nextTick();
            scrollToBottom(true);
          } else {
            // 加载更多时，将更早的消息添加到列表前面
            cityMessages.value = [...messages, ...cityMessages.value];
            console.log('追加历史城市消息，当前消息数:', cityMessages.value.length);
          }
          
          // 保存到本地缓存
          chatStorage.saveCityMessagesCache(cityMessages.value, currentLocation.city);
          
          // 增加页码
          cityMessagesPage.value++;
        } else {
          // 没有更多消息
          if (!refresh) {
            noMoreCityMessages.value = true;
            console.log('没有更多城市消息');
          }
          
          // 如果是刷新且没有消息，尝试从缓存加载
          if (refresh && (!messages || messages.length === 0)) {
            const cachedMessages = chatStorage.getCityMessagesCache(currentLocation.city);
            if (cachedMessages && cachedMessages.length > 0) {
              console.log('从缓存加载城市消息');
              cityMessages.value = cachedMessages;
            }
          }
        }
      } catch (error) {
        console.error('加载城市消息失败:', error);
        
        // 网络错误时尝试从缓存加载
        if (networkManager.isNetworkError && networkManager.isNetworkError(error)) {
          const cachedMessages = chatStorage.getCityMessagesCache(currentLocation.city);
          if (cachedMessages && cachedMessages.length > 0) {
            console.log('网络错误，从缓存加载城市消息');
            
            if (refresh) {
              cityMessages.value = cachedMessages;
            } else if (cityMessages.value.length === 0) {
              cityMessages.value = cachedMessages;
            }
          }
        }
        
        uni.showToast({
          title: '加载消息失败，请检查网络连接',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载更多附近消息 - 上拉加载更早的消息
    const loadMoreNearbyMessages = () => {
      if (noMoreNearbyMessages.value || isLoading.value) {
        return;
      }
      
      // 记录加载前的消息条数，用于后续计算
      const beforeCount = nearbyMessages.value.length;
      
      // 加载更多历史消息
      loadNearbyMessages().then(() => {
        // 加载完成后，由于我们在前面添加了历史消息，需要保持当前查看的位置
        // 计算新增了多少条消息
        const newMessagesCount = nearbyMessages.value.length - beforeCount;
        if (newMessagesCount > 0) {
          // 延迟执行，确保DOM已更新
          setTimeout(() => {
            // 使用uni-app的API查询消息列表的高度
            const query = uni.createSelectorQuery();
            query.selectAll('.message-item').boundingClientRect(data => {
              if (data && data.length > 0) {
                // 计算新增消息的总高度
                let heightToScroll = 0;
                for (let i = 0; i < Math.min(newMessagesCount, data.length); i++) {
                  heightToScroll += data[i].height;
                }
                
                // 增加滚动位置，保持在原来查看的消息位置
                if (activeTab.value === 'nearby') {
                  scrollTop.value += heightToScroll;
                }
              }
            }).exec();
          }, 100);
        }
      });
    };
    
    // 加载更多城市消息 - 上拉加载更早的消息
    const loadMoreCityMessages = () => {
      if (noMoreCityMessages.value || isLoading.value) {
        return;
      }
      
      // 记录加载前的消息条数，用于后续计算
      const beforeCount = cityMessages.value.length;
      
      // 加载更多历史消息
      loadCityMessages().then(() => {
        // 加载完成后，由于我们在前面添加了历史消息，需要保持当前查看的位置
        // 计算新增了多少条消息
        const newMessagesCount = cityMessages.value.length - beforeCount;
        if (newMessagesCount > 0) {
          // 延迟执行，确保DOM已更新
          setTimeout(() => {
            // 使用uni-app的API查询消息列表的高度
            const query = uni.createSelectorQuery();
            query.selectAll('.message-item').boundingClientRect(data => {
              if (data && data.length > 0) {
                // 计算新增消息的总高度
                let heightToScroll = 0;
                for (let i = 0; i < Math.min(newMessagesCount, data.length); i++) {
                  heightToScroll += data[i].height;
            }
                
                // 增加滚动位置，保持在原来查看的消息位置
                if (activeTab.value === 'city') {
                  cityScrollTop.value += heightToScroll;
          }
              }
            }).exec();
          }, 100);
        }
      });
    };
    
    // 滚动到底部
    const scrollToBottom = (forceScroll = false) => {
      console.log('执行滚动到底部, 强制滚动:', forceScroll);
          
      // 延迟确保DOM已经完全更新
      setTimeout(() => {
        try {
          // 不再使用scroll-into-view，恢复使用scrollTop直接控制
          if (activeTab.value === 'nearby') {
            // 直接设置一个很大的值确保滚动到底部
            scrollTop.value = 999999;
          } else {
            // 同样为城市消息设置
            cityScrollTop.value = 999999;
          }
          
          // 更新滚动位置状态为底部
          if (activeTab.value === 'nearby') {
            nearbyScrollPosition.value.atBottom = true;
          } else {
            cityScrollPosition.value.atBottom = true;
          }
          
          console.log('设置scrollTop以滚动到底部');
      } catch (error) {
          console.error('滚动到底部出错:', error);
        }
      }, 50); // 短延迟确保DOM更新
    };
    
    // 滚动处理
    const onScroll = (e) => {
      // 显示回到底部按钮的条件：滚动高度超过100px
      const scrollTop = e.detail.scrollTop;
      const scrollHeight = e.detail.scrollHeight;
      const clientHeight = e.detail.scrollHeight - e.detail.scrollTop;
      
      // 判断是否已滚动到底部(考虑30px的容差)
      const atBottom = (scrollHeight - scrollTop - clientHeight) < 50;
      isScrolledToBottom.value = atBottom;
      
      // 控制回到底部按钮显示
      showBackToBottom.value = !atBottom;
        
      // 记录当前滚动位置，用于决定收到新消息时是否自动滚动
      if (activeTab.value === 'nearby') {
        nearbyScrollPosition.value = {
          scrollTop,
          scrollHeight,
          clientHeight,
          atBottom
        };
      } else {
        cityScrollPosition.value = {
          scrollTop,
          scrollHeight,
          clientHeight,
          atBottom
        };
      }
    };
          
    // 设置自动刷新
    const setupAutoRefresh = () => {
      // 清除现有的定时器
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
          }
          
      // 设置新的定时器，每60秒刷新一次（增加间隔减少干扰）
      autoRefreshInterval = setInterval(() => {
        if (isVisible.value && networkStatus.value.isConnected) {
          console.log('自动刷新消息');
          
          // 获取当前滚动状态，只有在底部时才自动刷新
          const isAtBottom = activeTab.value === 'nearby' 
            ? nearbyScrollPosition.value.atBottom 
            : cityScrollPosition.value.atBottom;
          
          if (isAtBottom) {
            // 静默刷新，只在用户已经在底部时才刷新
            silentRefreshMessages();
          } else {
            // 用户不在底部，不执行刷新以免打断阅读
            console.log('用户正在查看历史消息，跳过自动刷新');
          }
        }
      }, 60000); // 延长到60秒刷新一次
    };
    
    // 静默刷新消息，不影响滚动位置
    const silentRefreshMessages = async () => {
      console.log('静默刷新消息');
      
      // 检查位置信息是否存在
      if (!currentLocation.latitude || !currentLocation.longitude) {
        console.warn('刷新消息失败：位置信息不存在');
        return;
      }
      
      try {
        // 暂存当前消息数量
        const beforeCount = activeTab.value === 'nearby' 
          ? nearbyMessages.value.length 
          : cityMessages.value.length;
        
        if (activeTab.value === 'nearby') {
          // 使用loadNearbyMessages但不强制刷新UI
          await silentLoadNearbyMessages();
        } else {
          // 使用loadCityMessages但不强制刷新UI
          await silentLoadCityMessages();
        }
        
        // 检查是否有新消息
        const afterCount = activeTab.value === 'nearby' 
          ? nearbyMessages.value.length 
          : cityMessages.value.length;
        
        // 如果有新消息且用户在底部，才滚动
        if (afterCount > beforeCount) {
          const isAtBottom = activeTab.value === 'nearby' 
            ? nearbyScrollPosition.value.atBottom 
            : cityScrollPosition.value.atBottom;
          
          if (isAtBottom) {
            console.log('检测到新消息且用户在底部，滚动到最新消息');
            await nextTick();
            scrollToBottom(true);
          } else {
            console.log('有新消息但用户不在底部，不自动滚动');
          }
        }
      } catch (error) {
        console.error('静默刷新消息失败:', error);
      }
      };
      
    // 静默加载附近消息
    const silentLoadNearbyMessages = async () => {
      try {
        // 准备参数
        const params = {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          radius: 5000, // 5公里范围
          page: 1, // 总是获取第一页最新的消息
          limit: 30, // 每页展示30条消息
          sort: 'desc' // 按时间倒序，最新的消息在结果的前面
        };
      
        console.log('静默加载附近消息, 参数:', params);
        
        // 调用API获取数据
        const response = await api.chat.getNearbyMessages(params);
        
        // 处理响应数据
        let messages = [];
        if (response && response.data) {
          messages = response.data;
        } else if (Array.isArray(response)) {
          messages = response;
        }
        
        // 对消息按时间正序排序
        messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
          
        // 如果有新消息，更新列表
        if (messages && messages.length > 0) {
          const existingIds = nearbyMessages.value.map(msg => msg.id);
          const newMessages = messages.filter(msg => !existingIds.includes(msg.id));
          
          if (newMessages.length > 0) {
            // 添加新消息
            nearbyMessages.value = [...nearbyMessages.value, ...newMessages];
            
            // 如果消息超过50条，删除最旧的消息
            if (nearbyMessages.value.length > 50) {
              nearbyMessages.value = nearbyMessages.value.slice(-50);
            }
            
            // 保存到本地缓存
            chatStorage.saveNearbyMessagesCache(nearbyMessages.value);
            
            return true; // 指示有新消息
          }
        }
        
        return false; // 指示没有新消息
      } catch (error) {
        console.error('静默加载附近消息失败:', error);
        return false;
      }
    };
              
    // 静默加载城市消息
    const silentLoadCityMessages = async () => {
      try {
        // 准备参数
        const params = {
          cityName: currentLocation.city,
          page: 1, // 总是获取第一页最新的消息
          limit: 30, // 每页展示30条消息
          sort: 'desc' // 按时间倒序，最新的消息在结果的前面
        };
        
        console.log('静默加载城市消息, 参数:', params);
        
        // 调用API获取数据
        const response = await api.chat.getCityMessages(params);
        
        // 处理响应数据
        let messages = [];
        if (response && response.data) {
          messages = response.data;
        } else if (Array.isArray(response)) {
          messages = response;
        }
        
        // 对消息按时间正序排序
        messages.sort((a, b) => new Date(a.createTime) - new Date(b.createTime));
        
        // 如果有新消息，更新列表
        if (messages && messages.length > 0) {
          const existingIds = cityMessages.value.map(msg => msg.id);
          const newMessages = messages.filter(msg => !existingIds.includes(msg.id));
          
          if (newMessages.length > 0) {
            // 添加新消息
            cityMessages.value = [...cityMessages.value, ...newMessages];
            
            // 如果消息超过50条，删除最旧的消息
            if (cityMessages.value.length > 50) {
              cityMessages.value = cityMessages.value.slice(-50);
            }
            
            // 保存到本地缓存
            chatStorage.saveCityMessagesCache(cityMessages.value, currentLocation.city);
            
            return true; // 指示有新消息
          }
        }
        
        return false; // 指示没有新消息
      } catch (error) {
        console.error('静默加载城市消息失败:', error);
        return false;
      }
    };
    
    // 监听标签切换，使用改进的加载逻辑
    watch(activeTab, (newTab) => {
      console.log('标签切换到:', newTab);
      
      if (newTab === 'nearby') {
        if (nearbyMessages.value.length === 0) {
          loadNearbyMessages(true);
        } else {
          // 无论如何，切换标签时都滚动到底部
          setTimeout(() => {
            scrollToBottom(true);
          }, 100);
        }
      } else if (newTab === 'city') {
        if (cityMessages.value.length === 0) {
          loadCityMessages(true);
        } else {
          // 无论如何，切换标签时都滚动到底部
          setTimeout(() => {
            scrollToBottom(true);
          }, 100);
            }
      }
    });
    
    // 恢复待处理的消息
    const restorePendingMessages = () => {
      const pendingMessages = chatStorage.getPendingMessages();
      if (pendingMessages && pendingMessages.length > 0) {
        console.log('恢复待处理消息:', pendingMessages.length);
        
        pendingMessages.forEach(message => {
          if (message.type === 'nearby') {
            // 添加到附近消息列表
            const existingIndex = nearbyMessages.value.findIndex(m => m.id === message.id);
            if (existingIndex === -1) {
              nearbyMessages.value.push({
                id: message.id,
                content: message.content,
                userId: message.userId,
                userName: message.userName,
                userAvatar: message.userAvatar,
                createTime: message.createTime,
                status: message.status,
                distance: 0,
                isOwnMessage: true
              });
            }
            
            // 尝试重新发送
            if (message.status === 'sending' || message.status === 'failed') {
              chatService.sendNearbyMessage(message.data);
            }
          } else if (message.type === 'city') {
            // 添加到城市消息列表
            const existingIndex = cityMessages.value.findIndex(m => m.id === message.id);
            if (existingIndex === -1) {
              cityMessages.value.push({
                id: message.id,
                content: message.content,
                userId: message.userId,
                userName: message.userName,
                userAvatar: message.userAvatar,
                createTime: message.createTime,
                status: message.status,
                isOwnMessage: true
              });
            }
            
            // 尝试重新发送
            if (message.status === 'sending' || message.status === 'failed') {
              chatService.sendCityMessage(message.data);
            }
          }
        });
      }
    };
    
    // 发送消息
    const sendMessage = async () => {
      if (!newMessage.value.trim()) {
        return;
      }
      
      if (!networkStatus.value.isConnected) {
            uni.showToast({
          title: '网络不可用，请检查网络连接',
              icon: 'none'
            });
        return;
      }
      
      if (!currentLocation.latitude || !currentLocation.longitude) {
        uni.showToast({
          title: '位置信息不存在，无法发送消息',
          icon: 'none'
        });
        return;
      }
      
      const messageContent = newMessage.value.trim();
      newMessage.value = '';
          
      // 创建临时消息对象
      const tempMessage = {
        id: 'temp-' + Date.now(),
              content: messageContent,
        userId: userId.value,
        userName: userInfo.value.nickname || userInfo.value.username || '游客',
        userAvatar: userInfo.value.avatar || '/static/images/default-avatar.png',
        createTime: new Date().getTime(),
        status: 'sending',
        isOwnMessage: true
      };
      
      // 根据不同标签页添加到不同消息列表
      if (activeTab.value === 'nearby') {
        // 添加距离信息
        tempMessage.distance = 0;
        
        // 添加到列表末尾（最新消息在底部）
        nearbyMessages.value.push(tempMessage);
        
        // 保存临时消息到缓存
        chatStorage.savePendingMessage({
          ...tempMessage,
          type: 'nearby',
          data: {
            content: messageContent,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
                }
        });
        
        // 使用聊天服务发送消息
        try {
          await chatService.sendNearbyMessage({
            content: messageContent,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          });
        } catch (error) {
          console.error('发送附近消息失败:', error);
        }
      } else {
        // 城市消息
        // 添加到列表末尾（最新消息在底部）
        cityMessages.value.push(tempMessage);
        
        // 保存临时消息到缓存
        chatStorage.savePendingMessage({
          ...tempMessage,
          type: 'city',
          data: {
            content: messageContent,
            cityName: currentLocation.city,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          }
        });
        
        // 使用聊天服务发送消息
        try {
          await chatService.sendCityMessage({
            content: messageContent,
            cityName: currentLocation.city,
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude
          });
        } catch (error) {
          console.error('发送城市消息失败:', error);
            }
      }
      
      // 发送消息后始终强制滚动到底部，无论当前位置
      console.log('发送消息后，强制滚动到底部显示新消息');
      
      // 确保DOM更新后滚动
      await nextTick();
      
      // 无论用户当前在哪个位置，强制滚动到底部
      if (activeTab.value === 'nearby') {
        // 先重置scrollTop值再设置，以确保触发滚动事件
        scrollTop.value = 0;
        
        // 延迟设置，确保先前的值已被应用
        setTimeout(() => {
          scrollTop.value = 999999;
          nearbyScrollPosition.value.atBottom = true;
        }, 10);
      } else {
        // 同样处理城市消息
        cityScrollTop.value = 0;
        
        setTimeout(() => {
          cityScrollTop.value = 999999;
          cityScrollPosition.value.atBottom = true;
        }, 10);
      }
      
      // 额外的滚动尝试，确保新消息显示在视图中
      setTimeout(() => {
        if (activeTab.value === 'nearby') {
          scrollTop.value = 999999;
        } else {
          cityScrollTop.value = 999999;
        }
        console.log('发送消息后，设置scrollTop完成');
      }, 150);
    };
    
    // 判断是否显示日期分隔线
    const shouldShowDate = (message, index, messageList) => {
      if (index === 0) return true;
      
      const prevMsg = messageList[index - 1];
      const prevTime = new Date(prevMsg.createTime);
      const currTime = new Date(message.createTime);
      
      // 如果两条消息相隔超过30分钟或跨天，显示日期分隔线
      return (currTime - prevTime) > 30 * 60 * 1000 || 
             prevTime.toDateString() !== currTime.toDateString();
    };
    
    // 格式化日期
    const formatDate = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      
      // 今天的消息显示时间
      if (date.toDateString() === now.toDateString()) {
        return '今天 ' + date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
      }
      
      // 昨天的消息显示"昨天 时:分"
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return '昨天 ' + date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
      }
      
      // 一周内的消息显示"星期几 时:分"
      const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
      const diffDays = Math.floor((now - date) / (24 * 60 * 60 * 1000));
      if (diffDays < 7) {
        return '星期' + weekDays[date.getDay()] + ' ' + 
               date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
      }
      
      // 跨年显示完整日期，否则只显示月日
      if (date.getFullYear() !== now.getFullYear()) {
        return date.getFullYear() + '年' + (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + 
               date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
      } else {
        return (date.getMonth() + 1) + '月' + date.getDate() + '日 ' + 
               date.getHours().toString().padStart(2, '0') + ':' + 
               date.getMinutes().toString().padStart(2, '0');
      }
    };
    
    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      return date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    };
    
    // 格式化距离
    const formatDistance = (distance) => {
      if (distance === undefined || distance === null) return '';
      
      if (distance < 1000) {
        return distance + '米';
      } else {
        return (distance / 1000).toFixed(1) + '公里';
      }
    };
    
    // 格式化头像URL
    const formatAvatarUrl = (url) => {
      if (!url) return '/static/images/default-avatar.png';
      
      // 检查URL是否已经是完整URL或静态资源路径
      if (url.startsWith('http') || url.startsWith('/static')) {
        return url;
      }
      
      // 如果是相对路径，补充基础URL
      if (url.startsWith('/uploads')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
        return BASE_URL + url;
      }
      
      // 其他情况，使用默认头像
      return '/static/images/default-avatar.png';
    };
    
    // 完全直接强制滚动到底部，不依赖响应式变量
    const forceScrollToBottom = () => {
      console.log('强制执行滚动到底部');
      
      // 使用简化的方法直接滚动到底部，不再先设置为0再滚动
      setTimeout(() => {
        try {
          // 直接滚动到底部，不再先置0
          if (activeTab.value === 'nearby') {
            scrollTop.value = 99999999;
            console.log('强制设置附近消息scrollTop:', scrollTop.value);
            nearbyScrollPosition.value.atBottom = true;
          } else {
            cityScrollTop.value = 99999999;
            console.log('强制设置城市消息scrollTop:', cityScrollTop.value);
            cityScrollPosition.value.atBottom = true;
          }
        } catch (error) {
          console.error('forceScrollToBottom出错:', error);
          
          // 出错时再次尝试
          if (activeTab.value === 'nearby') {
            scrollTop.value = 99999999;
      } else {
            cityScrollTop.value = 99999999;
        }
      }
      }, 50);
    };
    
    onLoad(async () => {
      console.log('聊天页面加载');
      
      // 设置网络监听
      setupNetworkListener();
      
      // 设置消息状态监听
      setupMessageStatusListener();
      
      // 清理过期缓存
      chatStorage.clearExpiredMessageCaches();
      
      // 恢复待处理的消息
      restorePendingMessages();
      
      // 设置自动刷新
      setupAutoRefresh();
      
      // 初始化位置信息
      console.log('开始初始化位置和加载消息');
      try {
        await initLocation();
        // initLocation中已包含了加载消息的逻辑，不需要重复调用
        console.log('初始化位置和加载消息完成');
      
        // 使用多个定时器确保滚动到底部
        setTimeout(() => {
        if (activeTab.value === 'nearby') {
            scrollTop.value = 999999;
                } else {
            cityScrollTop.value = 999999;
          }
        }, 300);
        
        setTimeout(() => {
          if (activeTab.value === 'nearby') {
            scrollTop.value = 999999;
          } else {
            cityScrollTop.value = 999999;
          }
        }, 800);
      } catch (error) {
        console.error('初始化位置和加载消息失败:', error);
        // 如果初始化失败，尝试直接加载消息
        refreshMessages();
        
        // 仍然尝试滚动到底部
        setTimeout(() => {
          forceScrollToBottom();
        }, 800);
      }
    });
    
    onShow(() => {
      isVisible.value = true;
      
      // 检查并更新位置信息
      initLocation();
      
      // 如果网络状态恢复，刷新消息
      if (networkStatus.value.isConnected) {
        refreshMessages();
        }
        
      // 重新设置自动刷新
      setupAutoRefresh();
      
      // 确保显示时滚动到底部
        setTimeout(() => {
        if (activeTab.value === 'nearby') {
          scrollTop.value = 999999;
          nearbyScrollPosition.value.atBottom = true;
        } else {
          cityScrollTop.value = 999999;
          cityScrollPosition.value.atBottom = true;
        }
        }, 300);
    
      // 再次尝试，确保滚动生效
      setTimeout(() => {
        if (activeTab.value === 'nearby') {
          scrollTop.value = 999999;
        } else {
          cityScrollTop.value = 999999;
        }
      }, 600);
    });
    
    onHide(() => {
      isVisible.value = false;
      
      // 清除自动刷新
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
    });
    
    onUnload(() => {
      // 页面卸载，清除所有定时器和事件监听
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
      }
      
      // 移除事件监听
      uni.$off('chat:message-status-update');
      uni.$off('network:reconnected');
    });
    
    return {
      activeTab,
      currentLocation,
      networkStatus,
      nearbyMessages,
      cityMessages,
      scrollTop,
      cityScrollTop,
      showBackToBottom,
      isLoading,
      noMoreNearbyMessages,
      noMoreCityMessages,
      newMessage,
      inputFocus,
      userInfo,
      userId,
      refreshLocation,
      loadMoreNearbyMessages,
      loadMoreCityMessages,
      sendMessage,
      shouldShowDate,
      formatDate,
      formatTime,
      formatDistance,
      formatAvatarUrl,
      onScroll,
      scrollToBottom
    };
  }
};
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f8f8;
  position: relative; /* 添加定位上下文 */
}

.tab-container {
  display: flex;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
}

.tab {
  flex: 1;
  padding: 30rpx 0;
  text-align: center;
  font-size: 32rpx;
  color: #666;
  position: relative;
}

.tab.active {
  color: #3B9E82;
  font-weight: bold;
}

.tab.active:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 6rpx;
  background-color: #3B9E82;
  border-radius: 3rpx;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 130rpx - var(--window-bottom));
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 24rpx;
  box-sizing: border-box;
  position: relative;
}

.location-info {
  padding: 20rpx;
  background-color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 5;
}

.location-text {
  font-size: 28rpx;
  color: #666;
}

.refresh-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.refresh-icon {
  font-size: 28rpx;
  color: #666;
}

.message-list {
  flex: 1;
  padding: 20rpx;
  padding-bottom: 130rpx; /* 增加底部内边距，确保最后一条消息不被输入框遮挡 */
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
}

.messages-container {
  padding-bottom: 30rpx; /* 增加底部内边距，确保最后一条消息有足够间距 */
}

.no-more {
  text-align: center;
  padding: 20rpx 0;
}

.no-more text {
  font-size: 24rpx;
  color: #999;
}

.loading-state {
  text-align: center;
  padding: 20rpx 0;
}

.loading-state text {
  font-size: 24rpx;
  color: #999;
}

.date-divider {
  text-align: center;
  margin: 30rpx 0;
}

.date-divider text {
  background-color: #ddd;
  color: #666;
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: 20rpx;
}

.message-item {
  margin-bottom: 30rpx;
}

.message-content {
  display: flex;
  align-items: flex-start;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin-right: 20rpx;
}

.message-bubble {
  flex: 1;
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.message-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}

.username {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.message-text {
  font-size: 30rpx;
  line-height: 1.5;
  color: #333;
  word-break: break-word;
}

.message-footer {
  margin-top: 10rpx;
  display: flex;
  justify-content: flex-end;
}

.distance {
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 60vh;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  margin-bottom: 20rpx;
}

.empty-tip {
  font-size: 28rpx;
  color: #999;
}

.input-area {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  border-top: 1px solid #eee;
  position: fixed;
  bottom: calc(var(--window-bottom) - 1rpx); /* 修改为考虑系统安全区域高度+tabbar高度 */
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.message-input {
  flex: 1;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
}

.send-btn {
  margin-left: 20rpx;
  width: 120rpx;
  height: 80rpx;
  background-color: #ddd;
  border-radius: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.send-btn text {
  font-size: 30rpx;
  color: #fff;
}

.send-btn.active {
  background-color: #3B9E82;
}

/* 添加回到底部按钮样式 */
.back-to-bottom-btn {
  position: fixed;
  right: 30rpx;
  bottom: 180rpx; /* 位于输入框上方更高一些 */
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background-color: #3B9E82;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.2);
  z-index: 99;
}

.back-to-bottom-btn .icon {
  color: #fff;
  font-size: 40rpx;
}

/* 添加底部安全间距 */
.safe-area-inset-bottom {
  height: 30rpx;
  width: 100%;
}
</style> 