<template>
  <view class="container">
    <!-- 头部导航 -->
    <view class="header">
      <view class="back" @tap="backToList">
        <text class="back-icon">←</text>
      </view>
      <view class="user-info">
        <text class="username">{{ chatUser.nickname || chatUser.username || '用户' }}</text>
        <text class="status" v-if="isOnline">在线</text>
      </view>
      <view class="action">
        <text class="more-icon">⋮</text>
      </view>
    </view>
    
    <!-- 消息列表 -->
    <scroll-view 
      class="message-list" 
      scroll-y="true" 
      :scroll-top="scrollTop" 
      :scroll-with-animation="true"
      :refresher-triggered="isRefreshing"
      refresher-enabled
      @refresherrefresh="loadMoreMessages"
      @scrolltoupper="onScrollToUpper"
      ref="messageList"
    >
      <view class="refresh-tip" v-if="isLoading && messages.length > 0">
        <text>加载更多消息...</text>
      </view>
      
      <view class="messages-container">
        <!-- 没有更多消息提示 -->
        <view class="no-more" v-if="noMoreMessages && messages.length > 0">
          <text>没有更多消息了</text>
        </view>
        
        <!-- 消息项 -->
        <view 
          v-for="(message, index) in messages" 
          :key="message.id || index"
          class="message-item" 
          :class="{ 'own-message': message.senderId === userId }"
        >
          <!-- 日期分隔线 -->
          <view class="date-divider" v-if="shouldShowDate(message, index)">
            <text>{{ formatDate(message.createTime) }}</text>
          </view>
          
          <view class="message-content">
            <!-- 对方头像 -->
            <image 
              v-if="message.senderId !== userId" 
              class="avatar" 
              :src="formatAvatarUrl(chatUser.avatar)" 
              mode="aspectFill"
            ></image>
            
            <!-- 空白占位，让自己的消息靠右 -->
            <view v-else class="avatar-placeholder"></view>
            
            <!-- 消息气泡 -->
            <view class="bubble" :class="{ 'own-bubble': message.senderId === userId }">
              <text class="message-text">{{ message.content }}</text>
            </view>
            
            <!-- 自己的头像 -->
            <image 
              v-if="message.senderId === userId" 
              class="avatar" 
              :src="formatAvatarUrl(userInfo.avatar)" 
              mode="aspectFill"
            ></image>
            
            <!-- 空白占位，让对方消息靠左 -->
            <view v-else class="avatar-placeholder"></view>
          </view>
        </view>
      </view>
      
      <!-- 空消息状态 -->
      <view class="empty-state" v-if="messages.length === 0 && !isLoading">
        <image class="empty-icon" src="/static/images/empty-message.png" mode="aspectFit"></image>
        <text class="empty-text">暂无消息</text>
        <text class="empty-tip">发送消息开始聊天吧</text>
      </view>
    </scroll-view>
    
    <!-- 输入区域 -->
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
import { ref, reactive, onMounted, onUnmounted, nextTick, computed, watch } from 'vue';
import { onLoad, onUnload, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js';
import chatService from '@/utils/chatService.js';
import networkManager from '@/utils/networkManager.js';
import chatStorage from '@/utils/chatStorage.js';

// 聊天消息缓存键前缀
const PRIVATE_CHAT_CACHE_PREFIX = 'private_chat_';

export default {
  setup() {
    const userStore = useUserStore();
    const userInfo = computed(() => userStore.user || {});
    const userId = computed(() => userInfo.value.id || userInfo.value._id || '');
    
    // 聊天对象信息
    const chatUser = ref({});
    const targetUserId = ref('');
    const isOnline = ref(false);
    
    // 消息列表相关
    const messages = ref([]);
    const isLoading = ref(false);
    const isRefreshing = ref(false);
    const noMoreMessages = ref(false);
    const scrollTop = ref(0);
    const messageList = ref(null);
    const lastLoadedMsgId = ref(null);
    const hasNewMessages = ref(false);
    
    // 消息输入相关
    const newMessage = ref('');
    const inputFocus = ref(false);
    
    // 网络状态
    const networkStatus = ref({
      isConnected: true,
      networkType: 'unknown'
    });
    
    // 页面状态
    const isVisible = ref(true);
    const messagesPage = ref(1);
    
    // 定时检查在线状态
    let onlineCheckTimer = null;
    
    // 自动刷新控制
    let autoRefreshTimer = null;
    
    // 网络状态监听
    const setupNetworkListener = () => {
      // 添加网络状态监听
      networkManager.addListener((status) => {
        networkStatus.value = status;
        console.log('网络状态更新:', status);
        
        // 网络恢复在线后自动刷新消息
        if (status.isConnected && isVisible.value) {
          console.log('网络恢复，刷新消息');
          loadMessages(true);
        }
      });
    };
    
    // 从URL参数获取目标用户ID
    const getTargetUserId = () => {
      const query = uni.getLaunchOptionsSync().query || {};
      return query.userId || '';
    };
    
    // 缓存键生成函数
    const getCacheKey = () => {
      if (!userId.value || !targetUserId.value) return null;
      // 确保相同的用户对之间有相同的缓存键，与顺序无关
      const userIds = [userId.value, targetUserId.value].sort().join('_');
      return `${PRIVATE_CHAT_CACHE_PREFIX}${userIds}`;
    };
    
    // 加载聊天对象信息
    const loadChatUserInfo = async () => {
      if (!targetUserId.value) return;
      
      try {
        // 调用API获取用户信息
        const response = await api.user.getUserInfo(targetUserId.value);
        
        if (response && (response.id || response._id)) {
          chatUser.value = response;
        } else {
          console.warn('获取用户信息失败，使用临时数据');
        // 临时使用模拟数据
        chatUser.value = {
          id: targetUserId.value,
          username: '聊天用户',
          avatar: '/static/images/default-avatar.png'
        };
        }
        
        // 检查用户在线状态
        checkUserOnline();
      } catch (error) {
        console.error('加载用户信息失败:', error);
        
        // 使用本地缓存的用户信息
        try {
          const cacheKey = getCacheKey();
          if (cacheKey) {
            const cachedData = uni.getStorageSync(`${cacheKey}_user`);
            if (cachedData) {
              const userData = JSON.parse(cachedData);
              chatUser.value = userData;
              console.log('使用缓存的用户信息:', userData);
            }
          }
        } catch (cacheError) {
          console.error('读取缓存用户信息失败:', cacheError);
        }
        
        uni.showToast({
          title: '加载用户信息失败',
          icon: 'none'
        });
      }
    };
    
    // 加载消息列表
    const loadMessages = async (refresh = false) => {
      if (!targetUserId.value || !userId.value) return;
      
      if (isLoading.value && !refresh) {
        console.log('已有加载请求进行中，跳过');
        return;
      }
      
      try {
        isLoading.value = true;
        
        // 刷新时重置页码
        if (refresh) {
          messagesPage.value = 1;
          noMoreMessages.value = false;
          lastLoadedMsgId.value = null;
        }
        
        // 准备请求参数
        const params = {
          targetUserId: targetUserId.value,
          page: messagesPage.value,
          limit: 20
        };
        
        if (lastLoadedMsgId.value && !refresh) {
          params.beforeMessageId = lastLoadedMsgId.value;
        }
        
        console.log('加载消息, 参数:', params);
        
        // 尝试调用获取私聊消息的API
        let receivedMessages = [];
        
        try {
          // 实际API调用 - 如果API存在
          if (api.chat.getPrivateMessages) {
            const response = await api.chat.getPrivateMessages(params);
            receivedMessages = response?.data || response || [];
          } else {
            // 没有可用的API，使用模拟数据
            console.warn('没有找到私聊消息API，使用模拟数据');
            
            // 模拟数据 - 在实际开发中应替换为真实API
            if (refresh) {
              receivedMessages = Array(5).fill().map((_, i) => ({
                id: `msg-${Date.now()}-${i}`,
                content: `这是一条模拟消息 ${i + 1}`,
                senderId: i % 2 === 0 ? userId.value : targetUserId.value,
                receiverId: i % 2 === 0 ? targetUserId.value : userId.value,
                createTime: new Date(Date.now() - (i * 60000)).getTime(),
                status: 'sent'
              }));
            } else {
              // 加载更多时返回更旧的消息
              receivedMessages = Array(3).fill().map((_, i) => ({
                id: `msg-old-${Date.now()}-${i}`,
                content: `这是更早的模拟消息 ${i + 1}`,
                senderId: i % 2 === 0 ? userId.value : targetUserId.value,
                receiverId: i % 2 === 0 ? targetUserId.value : userId.value,
                createTime: new Date(Date.now() - ((i + 10) * 60000)).getTime(),
                status: 'sent'
              }));
            }
          }
        } catch (apiError) {
          console.error('API调用失败:', apiError);
          
          // 网络错误时尝试从缓存加载
          if (networkManager.isNetworkError(apiError)) {
            const cacheKey = getCacheKey();
            if (cacheKey) {
              const cachedMessages = chatStorage.getPrivateMessages(cacheKey);
              if (cachedMessages && cachedMessages.length > 0) {
                receivedMessages = cachedMessages;
                console.log('从缓存加载私聊消息', receivedMessages.length);
              }
            }
          }
          
          // 如果没有缓存数据且是首次加载，使用临时数据避免界面空白
          if (receivedMessages.length === 0 && refresh) {
            receivedMessages = [{
              id: `temp-${Date.now()}`,
              content: '网络连接不佳，无法加载消息历史',
              senderId: 'system',
              createTime: Date.now(),
              status: 'info',
              isSystemMessage: true
            }];
          }
        }
        
        // 处理消息数据
        if (receivedMessages && receivedMessages.length > 0) {
        // 更新消息列表
          if (refresh) {
            messages.value = receivedMessages;
          } else {
            // 追加旧消息，避免重复
            const existingIds = messages.value.map(msg => msg.id);
            const newMessages = receivedMessages.filter(msg => !existingIds.includes(msg.id));
        
            if (newMessages.length > 0) {
              // 插入到列表开头，因为这些是历史消息
              messages.value = [...newMessages, ...messages.value];
              messagesPage.value++;
              
              // 更新最后加载的消息ID
              if (newMessages.length > 0) {
                const oldestMsg = [...newMessages].sort((a, b) => 
                  new Date(a.createTime) - new Date(b.createTime)
                )[0];
                
                if (oldestMsg) {
                  lastLoadedMsgId.value = oldestMsg.id;
                  console.log('更新最后加载的消息ID:', lastLoadedMsgId.value);
                }
              }
            } else {
              noMoreMessages.value = true;
              console.log('没有更多历史消息了');
            }
          }
          
          // 保存到本地缓存
          const cacheKey = getCacheKey();
          if (cacheKey) {
            chatStorage.savePrivateMessages(messages.value, cacheKey);
            
            // 同时缓存聊天对象信息
            if (chatUser.value && (chatUser.value.id || chatUser.value._id)) {
              uni.setStorageSync(`${cacheKey}_user`, JSON.stringify(chatUser.value));
            }
        }
        
          // 刷新成功后，滚动到底部
          if (refresh) {
        await nextTick();
        scrollToBottom();
          }
        } else {
          // 没有消息或返回为空
          if (!refresh) {
            noMoreMessages.value = true;
          }
        }
        
        // 标记消息为已读
        markMessagesAsRead();
      } catch (error) {
        console.error('加载消息失败:', error);
        
        uni.showToast({
          title: '加载消息失败，请检查网络连接',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
        isRefreshing.value = false;
      }
    };
    
    // 加载更多消息（下拉刷新）
    const loadMoreMessages = async () => {
      if (!targetUserId.value || !userId.value || isLoading.value || noMoreMessages.value) {
        isRefreshing.value = false;
        return;
      }
      
        isRefreshing.value = true;
      await loadMessages();
          isRefreshing.value = false;
    };
    
    // 发送消息
    const sendMessage = async () => {
      if (!newMessage.value.trim() || !targetUserId.value || !userId.value) return;
      
      if (!networkStatus.value.isConnected) {
        uni.showToast({
          title: '网络不可用，请检查网络连接',
          icon: 'none'
        });
        return;
      }
      
      const messageContent = newMessage.value.trim();
      newMessage.value = '';
      
      // 创建临时消息对象（用于乐观UI更新）
      const tempId = 'temp-' + Date.now();
      const tempMessage = {
        id: tempId,
        content: messageContent,
        createTime: new Date().getTime(),
        senderId: userId.value,
        receiverId: targetUserId.value,
        status: 'sending'
      };
      
      // 添加到消息列表并滚动到底部
      messages.value.push(tempMessage);
      
      // 保存到本地缓存
      const cacheKey = getCacheKey();
      if (cacheKey) {
        chatStorage.savePrivateMessages(messages.value, cacheKey);
      }
      
      await nextTick();
      scrollToBottom();
      
      try {
        // 调用发送消息API
        let response;
        
        try {
          // 实际API调用 - 如果API存在
          if (api.chat.sendPrivateMessage) {
            response = await api.chat.sendPrivateMessage({
              receiverId: targetUserId.value,
              content: messageContent
            });
          } else {
            // 没有可用的API，模拟延迟
            console.warn('没有找到发送私聊消息API，模拟发送成功');
        await new Promise(resolve => setTimeout(resolve, 500));
            response = {
              id: 'msg-' + Date.now(),
              status: 'sent'
            };
          }
        
          // 更新消息状态为发送成功
          const sentMessageIndex = messages.value.findIndex(msg => msg.id === tempId);
        if (sentMessageIndex !== -1) {
          messages.value[sentMessageIndex].status = 'sent';
            
            // 更新消息ID
            if (response && (response.id || response._id)) {
              messages.value[sentMessageIndex].id = response.id || response._id || tempId;
            }
            
            // 更新本地缓存
            if (cacheKey) {
              chatStorage.savePrivateMessages(messages.value, cacheKey);
            }
          }
        } catch (apiError) {
          throw apiError; // 传递给外层错误处理
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        
        // 更新消息状态为失败
        const failedMessageIndex = messages.value.findIndex(msg => msg.id === tempId);
        if (failedMessageIndex !== -1) {
          messages.value[failedMessageIndex].status = 'failed';
          
          // 更新本地缓存
          if (cacheKey) {
            chatStorage.savePrivateMessages(messages.value, cacheKey);
          }
        }
        
        // 保存待重试消息
        chatStorage.savePendingMessage({
          ...tempMessage,
          type: 'private',
          data: {
            receiverId: targetUserId.value,
            content: messageContent
          }
        });
        
        uni.showToast({
          title: '发送消息失败，请检查网络',
          icon: 'none'
        });
      }
    };
    
    // 重试发送失败的消息
    const retryMessage = async (messageId) => {
      const messageIndex = messages.value.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;
      
      const message = messages.value[messageIndex];
      
      // 更新状态为发送中
      messages.value[messageIndex].status = 'sending';
      
      // 重新发送
      try {
        // 调用发送消息API
        let response;
        
        try {
          if (api.chat.sendPrivateMessage) {
            response = await api.chat.sendPrivateMessage({
              receiverId: targetUserId.value,
              content: message.content
            });
          } else {
            // 没有可用的API，模拟延迟
            console.warn('没有找到发送私聊消息API，模拟发送成功');
            await new Promise(resolve => setTimeout(resolve, 500));
            response = {
              id: 'msg-' + Date.now(),
              status: 'sent'
            };
          }
          
          // 更新消息状态为发送成功
          messages.value[messageIndex].status = 'sent';
          
          // 更新消息ID
          if (response && (response.id || response._id)) {
            messages.value[messageIndex].id = response.id || response._id;
          }
          
          // 更新本地缓存
          const cacheKey = getCacheKey();
          if (cacheKey) {
            chatStorage.savePrivateMessages(messages.value, cacheKey);
          }
          
          // 移除待重试消息
          chatStorage.removePendingMessage(messageId);
        } catch (apiError) {
          throw apiError; // 传递给外层错误处理
        }
      } catch (error) {
        console.error('重试发送消息失败:', error);
        
        // 更新消息状态为失败
        messages.value[messageIndex].status = 'failed';
        
        // 更新本地缓存
        const cacheKey = getCacheKey();
        if (cacheKey) {
          chatStorage.savePrivateMessages(messages.value, cacheKey);
        }
        
        uni.showToast({
          title: '发送消息失败，请检查网络',
          icon: 'none'
        });
      }
    };
    
    // 标记消息为已读
    const markMessagesAsRead = async () => {
      if (!targetUserId.value || !userId.value) return;
      
      // 如果有针对消息已读的API，在这里调用
      if (api.chat.markMessagesAsRead) {
      try {
          await api.chat.markMessagesAsRead(targetUserId.value);
          console.log('标记消息已读成功');
      } catch (error) {
        console.error('标记消息已读失败:', error);
        }
      } else {
        console.log('没有找到标记消息已读API');
      }
    };
    
    // 检查用户在线状态
    const checkUserOnline = async () => {
      if (!targetUserId.value) return;
      
      try {
        // 调用检查用户在线状态的API
        if (api.user.checkUserOnline) {
          const status = await api.user.checkUserOnline(targetUserId.value);
          isOnline.value = status?.isOnline || false;
        } else {
        // 临时使用模拟数据
        isOnline.value = Math.random() > 0.5;
        }
      } catch (error) {
        console.error('检查用户在线状态失败:', error);
        isOnline.value = false;
      }
    };
    
    // 返回聊天列表
    const backToList = () => {
      uni.navigateBack();
    };
    
    // 滚动到底部
    const scrollToBottom = () => {
      scrollTop.value = Math.random(); // 触发更新
      
      nextTick(() => {
        const query = uni.createSelectorQuery().in(this);
        query.select('.message-list').boundingClientRect(data => {
          if (data) {
            scrollTop.value = 99999; // 一个足够大的数字确保滚动到底部
          }
        }).exec();
      });
    };
    
    // 滚动到顶部时触发
    const onScrollToUpper = () => {
      if (!isLoading.value && !noMoreMessages.value) {
        loadMoreMessages();
      }
    };
    
    // 设置自动刷新
    const setupAutoRefresh = () => {
      // 清除现有的定时器
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
      
      // 设置新的定时器，每15秒自动刷新
      autoRefreshTimer = setInterval(() => {
        if (isVisible.value && networkStatus.value.isConnected) {
          console.log('自动刷新消息');
          loadMessages(true);
        }
      }, 15000);
    };
    
    // 恢复待处理的消息
    const restorePendingMessages = () => {
      const pendingMessages = chatStorage.getPendingMessages();
      if (pendingMessages && pendingMessages.length > 0) {
        console.log('恢复待处理私聊消息');
        
        pendingMessages.forEach(message => {
          if (message.type === 'private' && 
              message.data.receiverId === targetUserId.value) {
            // 检查是否已存在于消息列表
            const existingIndex = messages.value.findIndex(m => m.id === message.id);
            if (existingIndex === -1) {
              messages.value.push({
                id: message.id,
                content: message.content,
                createTime: message.createTime,
                senderId: userId.value,
                receiverId: targetUserId.value,
                status: message.status
              });
            }
            
            // 尝试重新发送
            if (message.status === 'sending' || message.status === 'failed') {
              retryMessage(message.id);
            }
          }
        });
      }
    };
    
    // 判断是否显示日期分隔线
    const shouldShowDate = (message, index) => {
      if (index === 0) return true;
      
      const prevMsg = messages.value[index - 1];
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
    
    onLoad((options) => {
      targetUserId.value = options.userId || getTargetUserId();
      
      if (targetUserId.value) {
        // 设置网络监听
        setupNetworkListener();
        
        // 加载用户信息
        loadChatUserInfo();
        
        // 恢复待处理消息
        restorePendingMessages();
        
        // 加载消息
        loadMessages(true);
        
        // 设置自动刷新
        setupAutoRefresh();
        
        // 启动定时检查在线状态
        onlineCheckTimer = setInterval(checkUserOnline, 30000);
      } else {
        uni.showToast({
          title: '用户ID不能为空',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
    });
    
    onShow(() => {
      isVisible.value = true;
      
      // 重新检查在线状态
      checkUserOnline();
      
      // 标记消息为已读
      markMessagesAsRead();
      
      // 如果有新消息指示，刷新消息
      if (hasNewMessages.value && networkStatus.value.isConnected) {
        loadMessages(true);
        hasNewMessages.value = false;
      }
      
      // 重新设置自动刷新
      setupAutoRefresh();
    });
    
    onHide(() => {
      isVisible.value = false;
      
      // 清除自动刷新
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    });
    
    onUnload(() => {
      // 清除定时器
      if (onlineCheckTimer) {
        clearInterval(onlineCheckTimer);
        onlineCheckTimer = null;
      }
      
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
        autoRefreshTimer = null;
      }
    });
    
    return {
      chatUser,
      isOnline,
      messages,
      isLoading,
      isRefreshing,
      noMoreMessages,
      scrollTop,
      messageList,
      newMessage,
      inputFocus,
      userInfo,
      userId,
      loadMoreMessages,
      sendMessage,
      retryMessage,
      backToList,
      shouldShowDate,
      formatDate,
      formatAvatarUrl,
      onScrollToUpper
    };
  }
};
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

/* 头部样式 */
.header {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: relative;
  z-index: 10;
}

.back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-icon {
  font-size: 40rpx;
  color: #333;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.username {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.status {
  font-size: 22rpx;
  color: #3B9E82;
  margin-top: 4rpx;
}

.action {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.more-icon {
  font-size: 36rpx;
  color: #333;
}

/* 消息列表样式 */
.message-list {
  flex: 1;
  padding: 20rpx;
  box-sizing: border-box;
}

.messages-container {
  padding-bottom: 20rpx;
}

.refresh-tip {
  text-align: center;
  padding: 20rpx 0;
}

.refresh-tip text {
  font-size: 24rpx;
  color: #999;
}

.no-more {
  text-align: center;
  padding: 20rpx 0;
}

.no-more text {
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
  margin: 0 20rpx;
}

.avatar-placeholder {
  width: 80rpx;
  margin: 0 20rpx;
}

.bubble {
  max-width: 60%;
  padding: 20rpx 30rpx;
  border-radius: 20rpx;
  background-color: #fff;
  position: relative;
}

.bubble:before {
  content: '';
  position: absolute;
  top: 20rpx;
  left: -16rpx;
  border-width: 8rpx;
  border-style: solid;
  border-color: transparent #fff transparent transparent;
}

.own-bubble {
  background-color: #3B9E82;
}

.own-bubble:before {
  left: auto;
  right: -16rpx;
  border-color: transparent transparent transparent #3B9E82;
}

.own-bubble .message-text {
  color: #fff;
}

.message-text {
  font-size: 30rpx;
  line-height: 1.4;
  word-break: break-word;
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

/* 输入区域样式 */
.input-area {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background-color: #fff;
  border-top: 1px solid #eee;
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
</style> 