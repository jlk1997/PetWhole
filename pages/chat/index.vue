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
        class="message-list" 
        scroll-y="true" 
        :scroll-top="scrollTop" 
        :scroll-with-animation="true"
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
        class="message-list" 
        scroll-y="true" 
        :scroll-top="cityScrollTop" 
        :scroll-with-animation="true"
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
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue';
import { onLoad, onUnload, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user.js';
import { useLocationStore } from '@/store/location.js';
import { getCurrentLocation } from '@/utils/amap.js';
import api from '@/utils/api.js';

export default {
  setup() {
    const userStore = useUserStore();
    const locationStore = useLocationStore();
    const userInfo = computed(() => userStore.userInfo || {});
    const userId = computed(() => userInfo.value.id);
    const activeTab = ref('nearby');
    
    // 位置相关
    const currentLocation = reactive({
      latitude: null,
      longitude: null,
      address: '',
      city: '',
      isLoading: true
    });
    
    // 消息列表相关
    const nearbyMessages = ref([]);
    const cityMessages = ref([]);
    const isLoading = ref(false);
    const noMoreNearbyMessages = ref(false);
    const noMoreCityMessages = ref(false);
    const scrollTop = ref(0);
    const cityScrollTop = ref(0);
    const nearbyMessageList = ref(null);
    const cityMessageList = ref(null);
    const nearbyPage = ref(1);
    const cityPage = ref(1);
    
    // 消息输入相关
    const newMessage = ref('');
    const inputFocus = ref(false);
    
    // 新增变量
    const showBackToBottom = ref(false);
    const isAutoScrolling = ref(false);
    const scrollDistance = ref(0);
    
    // 获取位置
    const getLocation = async () => {
      currentLocation.isLoading = true;
      
      try {
        // 首先使用getCurrentLocation获取基本位置信息
        let location;
        try {
          location = await getCurrentLocation();
          currentLocation.latitude = location.latitude;
          currentLocation.longitude = location.longitude;
        } catch (locErr) {
          console.error('getCurrentLocation失败，尝试使用uni.getLocation:', locErr);
          // 回退到uni.getLocation
          const res = await new Promise((resolve, reject) => {
            uni.getLocation({
              type: 'gcj02',
              success: resolve,
              fail: reject
            });
          });
          
          location = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          currentLocation.latitude = res.latitude;
          currentLocation.longitude = res.longitude;
        }
        
        // 尝试使用纯uni-app方法获取位置地址
        try {
          // 使用uni-app的chooseLocation API可能会返回详细地址
          const locationInfo = await new Promise((resolve, reject) => {
            uni.getLocation({
              type: 'gcj02',
              geocode: true, // 尝试开启逆地理编码
              success: resolve,
              fail: reject
            });
          });
          
          if (locationInfo.address) {
            // 如果返回了地址信息
            currentLocation.address = locationInfo.address;
            currentLocation.city = locationInfo.address.city || '当前城市';
            console.log('使用uni-app逆地理编码成功:', currentLocation.address, currentLocation.city);
          } else {
            // 没有详细地址，使用坐标
            currentLocation.address = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
            currentLocation.city = '当前城市';
            
            // 从位置存储尝试获取更多信息
            if (locationStore.currentLocation) {
              const nearbyResult = await locationStore.getNearbyUsers();
              if (nearbyResult && nearbyResult.success && nearbyResult.cityInfo) {
                currentLocation.city = nearbyResult.cityInfo.city || '当前城市';
              }
            }
          }
        } catch (geoErr) {
          console.error('获取详细地址失败:', geoErr);
          // 使用直接坐标显示
          currentLocation.address = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
          currentLocation.city = '当前城市';
          
          // 尝试从位置存储获取城市
          if (locationStore.currentLocation) {
            try {
              const nearbyResult = await locationStore.getNearbyUsers();
              if (nearbyResult && nearbyResult.success && nearbyResult.cityInfo) {
                currentLocation.city = nearbyResult.cityInfo.city || '当前城市';
              }
            } catch (e) {
              console.error('获取附近用户失败:', e);
            }
          }
        }
        
        // 更新位置信息到位置存储
        try {
          await locationStore.updateLocation({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            timestamp: new Date().toISOString()
          });
        } catch (updateErr) {
          console.warn('更新位置存储失败:', updateErr);
        }
      } catch (err) {
        console.error('获取位置失败:', err);
        currentLocation.address = '位置获取失败';
        currentLocation.city = '未知城市';
        uni.showToast({
          title: '位置获取失败',
          icon: 'none'
        });
      } finally {
        currentLocation.isLoading = false;
        loadMessages();
      }
    };
    
    // 刷新位置
    const refreshLocation = () => {
      getLocation();
    };
    
    // 加载消息
    const loadMessages = async () => {
      if (activeTab.value === 'nearby') {
        loadNearbyMessages();
      } else {
        loadCityMessages();
      }
    };
    
    // 加载附近消息
    const loadNearbyMessages = async () => {
      if (!currentLocation.latitude || !currentLocation.longitude || isLoading.value) return;
      
      try {
        isLoading.value = true;
        nearbyPage.value = 1;
        noMoreNearbyMessages.value = false;
        
        // 调用API获取附近消息
        try {
          // 调用后端API获取真实数据
          const response = await api.chat.getNearbyMessages({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            radius: 5000, // 5公里
            page: nearbyPage.value,
            limit: 20
          });
          
          console.log('加载附近消息响应:', response);
          
          // 改进响应处理逻辑 - 兼容多种数据结构
          if (response) {
            // 如果response本身就是数组
            if (Array.isArray(response)) {
              nearbyMessages.value = response;
              console.log('加载成功 - 数组格式:', nearbyMessages.value.length);
            } 
            // 如果response有data字段并且是数组
            else if (response.data && Array.isArray(response.data)) {
              nearbyMessages.value = response.data;
              console.log('加载成功 - data字段数组:', nearbyMessages.value.length);
            }
            // 如果没有识别到有效数据结构
            else {
              console.warn('未识别的响应格式:', response);
              nearbyMessages.value = [];
            }
          } else {
            console.warn('获取附近消息失败 - 空响应');
            nearbyMessages.value = [];
          }
        } catch (error) {
          console.error('获取附近消息失败:', error);
          
          // 如果API调用失败，尝试从本地存储加载
          try {
            const savedMessages = uni.getStorageSync('nearbyMessages') || [];
            nearbyMessages.value = savedMessages;
            console.log('从本地加载消息:', savedMessages.length);
          } catch (storageError) {
            console.error('从本地加载消息失败:', storageError);
            nearbyMessages.value = [];
          }
        }
        
        // 滚动到顶部
        scrollTop.value = 0;
      } catch (error) {
        console.error('加载附近消息失败:', error);
        uni.showToast({
          title: '加载消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载更多附近消息
    const loadMoreNearbyMessages = async () => {
      if (!currentLocation.latitude || !currentLocation.longitude || isLoading.value || noMoreNearbyMessages.value) return;
      
      try {
        isLoading.value = true;
        nearbyPage.value += 1;
        
        // 调用API获取更多附近消息
        try {
          const response = await api.chat.getNearbyMessages({
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
            radius: 5000,
            page: nearbyPage.value,
            limit: 20
          });
          
          console.log('加载更多附近消息响应:', response);
          
          // 处理不同响应格式
          let moreMessages = [];
          
          if (Array.isArray(response)) {
            moreMessages = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            moreMessages = response.data;
          }
          
          if (moreMessages && moreMessages.length > 0) {
            nearbyMessages.value = [...nearbyMessages.value, ...moreMessages];
            console.log('加载更多成功, 现有消息:', nearbyMessages.value.length);
          } else {
            noMoreNearbyMessages.value = true;
            console.log('没有更多消息了');
          }
        } catch (error) {
          console.error('获取更多附近消息失败:', error);
          noMoreNearbyMessages.value = true;
        }
      } catch (error) {
        console.error('加载更多附近消息失败:', error);
        uni.showToast({
          title: '加载更多消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载城市消息
    const loadCityMessages = async () => {
      if (!currentLocation.city || isLoading.value) return;
      
      try {
        isLoading.value = true;
        cityPage.value = 1;
        noMoreCityMessages.value = false;
        
        // 调用API获取城市消息
        try {
          const response = await api.chat.getCityMessages({
            cityName: currentLocation.city,
            page: cityPage.value,
            limit: 20
          });
          
          console.log('加载城市消息响应:', response);
          
          // 改进响应处理逻辑
          if (response) {
            // 如果response本身就是数组
            if (Array.isArray(response)) {
              cityMessages.value = response;
              console.log('加载成功 - 数组格式:', cityMessages.value.length);
            } 
            // 如果response有data字段并且是数组
            else if (response.data && Array.isArray(response.data)) {
              cityMessages.value = response.data;
              console.log('加载成功 - data字段数组:', cityMessages.value.length);
            }
            // 如果没有识别到有效数据结构
            else {
              console.warn('未识别的响应格式:', response);
              cityMessages.value = [];
            }
          } else {
            console.warn('获取城市消息失败 - 空响应');
            cityMessages.value = [];
          }
        } catch (error) {
          console.error('获取城市消息失败:', error);
          
          // 如果API调用失败，尝试从本地存储加载
          try {
            const savedMessages = uni.getStorageSync('cityMessages') || [];
            cityMessages.value = savedMessages;
            console.log('从本地加载城市消息:', savedMessages.length);
          } catch (storageError) {
            console.error('从本地加载消息失败:', storageError);
            cityMessages.value = [];
          }
        }
        
        // 滚动到顶部
        cityScrollTop.value = 0;
      } catch (error) {
        console.error('加载城市消息失败:', error);
        uni.showToast({
          title: '加载消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载更多城市消息
    const loadMoreCityMessages = async () => {
      if (!currentLocation.city || isLoading.value || noMoreCityMessages.value) return;
      
      try {
        isLoading.value = true;
        cityPage.value += 1;
        
        // 调用API获取更多城市消息
        try {
          const response = await api.chat.getCityMessages({
            cityName: currentLocation.city,
            page: cityPage.value,
            limit: 20
          });
          
          console.log('加载更多城市消息响应:', response);
          
          // 处理不同响应格式
          let moreMessages = [];
          
          if (Array.isArray(response)) {
            moreMessages = response;
          } else if (response && response.data && Array.isArray(response.data)) {
            moreMessages = response.data;
          }
          
          if (moreMessages && moreMessages.length > 0) {
            cityMessages.value = [...cityMessages.value, ...moreMessages];
            console.log('加载更多成功, 现有城市消息:', cityMessages.value.length);
          } else {
            noMoreCityMessages.value = true;
            console.log('没有更多城市消息了');
          }
        } catch (error) {
          console.error('获取更多城市消息失败:', error);
          noMoreCityMessages.value = true;
        }
      } catch (error) {
        console.error('加载更多城市消息失败:', error);
        uni.showToast({
          title: '加载更多消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 发送消息
    const sendMessage = async () => {
      if (!newMessage.value.trim()) return;
      
      // 检查位置信息是否存在
      if (!currentLocation.latitude || !currentLocation.longitude) {
        uni.showToast({
          title: '无法获取位置信息，请刷新或检查位置授权',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      const messageContent = newMessage.value;
      newMessage.value = '';
      
      // 创建临时消息对象
      const tempMessage = {
        id: 'temp-' + Date.now(),
        content: messageContent,
        createTime: new Date().getTime(),
        userName: userInfo.value.nickname || userInfo.value.username || '我',
        userAvatar: userInfo.value.avatar || '/static/images/default-avatar.png',
        userId: userId.value || 'temp-user',
        status: 'sending',
        distance: activeTab.value === 'nearby' ? 0 : null, // 实际距离会由服务器计算返回
        isOwnMessage: true // 标记是自己发送的消息
      };
      
      // 确保位置数据是数字类型
      const lat = parseFloat(currentLocation.latitude);
      const lng = parseFloat(currentLocation.longitude);
      
      console.log('发送消息位置信息:', {
        latitude: lat,
        longitude: lng,
        city: currentLocation.city
      });
      
      try {
        // 根据当前标签页确定发送到哪个频道
        if (activeTab.value === 'nearby') {
          // 添加到附近消息列表
          nearbyMessages.value.push(tempMessage);
          
          // 立即滚动到底部（确保消息显示）
          nextTick(() => {
            scrollToBottom();
          });
          
          // 调用API发送消息
          try {
            const response = await api.chat.sendNearbyMessage({
              content: messageContent,
              latitude: lat,
              longitude: lng
            });
            
            console.log('原始消息响应:', response);
            
            // 更新消息状态
            const sentMessageIndex = nearbyMessages.value.findIndex(msg => msg.id === tempMessage.id);
            if (sentMessageIndex !== -1) {
              nearbyMessages.value[sentMessageIndex].status = 'sent';
              
              // 确保有ID，使用多种可能的格式
              let messageId = null;
              if (response && typeof response === 'object') {
                if (response._id) {
                  messageId = response._id;
                } else if (response.id) {
                  messageId = response.id;
                } else if (response.data && response.data._id) {
                  messageId = response.data._id;
                } else if (response.data && response.data.id) {
                  messageId = response.data.id;
                }
              }
              
              nearbyMessages.value[sentMessageIndex].id = messageId || 'msg-' + Date.now();
              console.log('消息发送成功，更新ID为:', nearbyMessages.value[sentMessageIndex].id);
              
              // 触发成功通知
              uni.showToast({
                title: '消息发送成功',
                icon: 'success',
                duration: 1500
              });
              
              // 再次滚动到底部以确保显示完整消息
              nextTick(() => {
                scrollToBottom();
              });
            }
          } catch (apiError) {
            // API调用异常处理
            console.error('附近消息发送API调用失败:', apiError);
            
            // 更新消息状态为发送失败
            const sentMessageIndex = nearbyMessages.value.findIndex(msg => msg.id === tempMessage.id);
            if (sentMessageIndex !== -1) {
              nearbyMessages.value[sentMessageIndex].status = 'failed';
            }
            
            // 保存到本地存储（作为备份）
            try {
              const savedNearbyMessages = uni.getStorageSync('nearbyMessages') || [];
              savedNearbyMessages.push({
                ...tempMessage,
                status: 'failed'
              });
              uni.setStorageSync('nearbyMessages', savedNearbyMessages);
            } catch (storageError) {
              console.error('保存消息到本地失败:', storageError);
            }
            
            uni.showToast({
              title: '消息发送失败',
              icon: 'none'
            });
          }
        } else {
          // 添加到城市消息列表
          cityMessages.value.push(tempMessage);
          
          // 立即滚动到底部（确保消息显示）
          nextTick(() => {
            scrollToBottom();
          });
          
          try {
            const response = await api.chat.sendCityMessage({
              content: messageContent,
              cityName: currentLocation.city,
              latitude: lat,
              longitude: lng
            });
            
            console.log('原始城市消息响应:', response);
            
            const sentMessageIndex = cityMessages.value.findIndex(msg => msg.id === tempMessage.id);
            if (sentMessageIndex !== -1) {
              cityMessages.value[sentMessageIndex].status = 'sent';
              
              let messageId = null;
              if (response && typeof response === 'object') {
                if (response._id) {
                  messageId = response._id;
                } else if (response.id) {
                  messageId = response.id;
                } else if (response.data && response.data._id) {
                  messageId = response.data._id;
                } else if (response.data && response.data.id) {
                  messageId = response.data.id;
                }
              }
              
              cityMessages.value[sentMessageIndex].id = messageId || 'msg-' + Date.now();
              console.log('城市消息发送成功，更新ID为:', cityMessages.value[sentMessageIndex].id);
              
              uni.showToast({
                title: '消息发送成功',
                icon: 'success',
                duration: 1500
              });
              
              // 再次滚动到底部以确保显示完整消息
              nextTick(() => {
                scrollToBottom();
              });
            }
          } catch (apiError) {
            // API调用异常处理
            console.error('城市消息发送API调用失败:', apiError);
            
            // 更新消息状态为发送失败
            const sentMessageIndex = cityMessages.value.findIndex(msg => msg.id === tempMessage.id);
            if (sentMessageIndex !== -1) {
              cityMessages.value[sentMessageIndex].status = 'failed';
            }
            
            // 保存到本地存储（作为备份）
            try {
              const savedCityMessages = uni.getStorageSync('cityMessages') || [];
              savedCityMessages.push({
                ...tempMessage,
                status: 'failed'
              });
              uni.setStorageSync('cityMessages', savedCityMessages);
            } catch (storageError) {
              console.error('保存消息到本地失败:', storageError);
            }
            
            uni.showToast({
              title: '消息发送失败',
              icon: 'none'
            });
          }
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        uni.showToast({
          title: '发送消息失败',
          icon: 'none'
        });
      }
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
      if (distance < 1000) {
        return distance.toFixed(0) + 'm';
      } else {
        return (distance / 1000).toFixed(1) + 'km';
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
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
        return BASE_URL + url;
      }
      
      // 其他情况，使用默认头像
      return '/static/images/default-avatar.png';
    };
    
    // 监听标签切换
    watch(activeTab, (newVal) => {
      if (newVal === 'nearby') {
        if (nearbyMessages.value.length === 0) {
          loadNearbyMessages();
        }
      } else {
        if (cityMessages.value.length === 0) {
          loadCityMessages();
        }
      }
    });
    
    onMounted(() => {
      getLocation();
      // 初始化完成后，设置一个定时器滚动到底部
      setTimeout(() => {
        scrollToBottom();
      }, 500);
    });
    
    onShow(() => {
      // 检查是否需要刷新消息
      if (activeTab.value === 'nearby' && nearbyMessages.value.length === 0) {
        loadNearbyMessages();
      } else if (activeTab.value === 'city' && cityMessages.value.length === 0) {
        loadCityMessages();
      }
    });
    
    // 修改滚动到底部方法
    const scrollToBottom = () => {
      isAutoScrolling.value = true;
      // 隐藏回到底部按钮
      showBackToBottom.value = false;
      
      // 等待DOM更新后再获取实际滚动高度
      nextTick(() => {
        // 根据当前活动的标签页选择对应的消息列表
        if (activeTab.value === 'nearby') {
          // 获取附近消息列表组件
          const messageList = nearbyMessageList.value;
          if (messageList) {
            // 获取可滚动的高度
            uni.createSelectorQuery()
              .in(messageList)
              .select('.messages-container')
              .boundingClientRect(data => {
                if (data) {
                  scrollTop.value = data.height * 2; // 确保滚动到底部
                } else {
                  scrollTop.value = 99999; // 备用方案
                }
              })
              .exec();
          } else {
            scrollTop.value = 99999; // 备用方案
          }
        } else {
          // 城市消息列表
          const messageList = cityMessageList.value;
          if (messageList) {
            uni.createSelectorQuery()
              .in(messageList)
              .select('.messages-container')
              .boundingClientRect(data => {
                if (data) {
                  cityScrollTop.value = data.height * 2; // 确保滚动到底部
                } else {
                  cityScrollTop.value = 99999; // 备用方案
                }
              })
              .exec();
          } else {
            cityScrollTop.value = 99999; // 备用方案
          }
        }
        
        // 重置标志位
        setTimeout(() => {
          isAutoScrolling.value = false;
        }, 300);
      });
    };
    
    // 添加滚动事件处理
    const onScroll = (e) => {
      if (isAutoScrolling.value) return;
      
      const { scrollTop: currentScrollTop, scrollHeight } = e.detail;
      scrollDistance.value = currentScrollTop;
      
      // 当用户向上滚动超过300px时显示回到底部按钮
      const distanceFromBottom = scrollHeight - currentScrollTop - 300;
      showBackToBottom.value = distanceFromBottom > 300;
    };
    
    return {
      activeTab,
      currentLocation,
      nearbyMessages,
      cityMessages,
      isLoading,
      noMoreNearbyMessages,
      noMoreCityMessages,
      scrollTop,
      cityScrollTop,
      nearbyMessageList,
      cityMessageList,
      newMessage,
      inputFocus,
      userInfo,
      userId,
      getLocation,
      refreshLocation,
      loadNearbyMessages,
      loadMoreNearbyMessages,
      loadCityMessages,
      loadMoreCityMessages,
      sendMessage,
      shouldShowDate,
      formatDate,
      formatTime,
      formatDistance,
      formatAvatarUrl,
      showBackToBottom,
      isAutoScrolling,
      scrollDistance,
      scrollToBottom,
      onScroll
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
  padding-bottom: 10rpx; /* 减少底部内边距 */
  box-sizing: border-box;
  height: 100%;
  overflow-y: auto;
}

.messages-container {
  padding-bottom: 20rpx;
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
  bottom: 160rpx; /* 位于输入框上方 */
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
</style> 