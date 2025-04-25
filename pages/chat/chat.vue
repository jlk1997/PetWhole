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
import { ref, reactive, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { onLoad, onUnload, onShow, onHide } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js';

export default {
  setup() {
    const userStore = useUserStore();
    const userInfo = computed(() => userStore.userInfo || {});
    const userId = computed(() => userInfo.value.id);
    
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
    
    // 消息输入相关
    const newMessage = ref('');
    const inputFocus = ref(false);
    
    // 定时检查在线状态
    let onlineCheckTimer = null;
    
    // 从URL参数获取目标用户ID
    const getTargetUserId = () => {
      const query = uni.getLaunchOptionsSync().query || {};
      return query.userId || '';
    };
    
    // 加载聊天对象信息
    const loadChatUserInfo = async () => {
      if (!targetUserId.value) return;
      
      try {
        // 应该调用获取用户信息的API
        // 临时使用模拟数据
        chatUser.value = {
          id: targetUserId.value,
          username: '聊天用户',
          avatar: '/static/images/default-avatar.png'
        };
        
        // 检查用户在线状态
        checkUserOnline();
      } catch (error) {
        console.error('加载用户信息失败:', error);
        uni.showToast({
          title: '加载用户信息失败',
          icon: 'none'
        });
      }
    };
    
    // 加载消息列表
    const loadMessages = async () => {
      if (!targetUserId.value || !userId.value) return;
      
      try {
        isLoading.value = true;
        
        // 应该调用获取消息记录的API
        // 临时使用模拟数据
        const mockMessages = [];
        
        // 更新消息列表
        messages.value = mockMessages;
        
        if (messages.value.length > 0) {
          lastLoadedMsgId.value = messages.value[0].id;
        }
        
        // 滚动到底部
        await nextTick();
        scrollToBottom();
        
        // 标记消息为已读
        markMessagesAsRead();
      } catch (error) {
        console.error('加载消息失败:', error);
        uni.showToast({
          title: '加载消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
      }
    };
    
    // 加载更多消息（下拉刷新）
    const loadMoreMessages = async () => {
      if (!targetUserId.value || !userId.value || isLoading.value || noMoreMessages.value) {
        isRefreshing.value = false;
        return;
      }
      
      try {
        isLoading.value = true;
        isRefreshing.value = true;
        
        // 记录当前第一条消息，用于后续定位
        const firstMsg = messages.value.length > 0 ? messages.value[0] : null;
        
        // 应该调用获取历史消息的API，传入lastLoadedMsgId
        // 临时使用模拟数据
        const oldMessages = [];
        
        if (oldMessages.length === 0) {
          noMoreMessages.value = true;
          isRefreshing.value = false;
          return;
        }
        
        // 将旧消息添加到列表前面
        messages.value = [...oldMessages, ...messages.value];
        
        // 更新最后加载的消息ID
        if (oldMessages.length > 0) {
          lastLoadedMsgId.value = oldMessages[0].id;
        }
      } catch (error) {
        console.error('加载更多消息失败:', error);
        uni.showToast({
          title: '加载更多消息失败',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
        isRefreshing.value = false;
      }
    };
    
    // 发送消息
    const sendMessage = async () => {
      if (!newMessage.value.trim() || !targetUserId.value || !userId.value) return;
      
      const messageContent = newMessage.value;
      newMessage.value = '';
      
      // 创建临时消息对象（用于乐观UI更新）
      const tempMessage = {
        id: 'temp-' + Date.now(),
        content: messageContent,
        createTime: new Date().getTime(),
        senderId: userId.value,
        receiverId: targetUserId.value,
        status: 'sending'
      };
      
      // 添加到消息列表并滚动到底部
      messages.value.push(tempMessage);
      await nextTick();
      scrollToBottom();
      
      try {
        // 应该调用发送消息的API
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 模拟发送成功
        const sentMessageIndex = messages.value.findIndex(msg => msg.id === tempMessage.id);
        if (sentMessageIndex !== -1) {
          messages.value[sentMessageIndex].status = 'sent';
          messages.value[sentMessageIndex].id = 'msg-' + Date.now(); // 服务器返回的实际ID
        }
      } catch (error) {
        console.error('发送消息失败:', error);
        
        // 更新消息状态为失败
        const failedMessageIndex = messages.value.findIndex(msg => msg.id === tempMessage.id);
        if (failedMessageIndex !== -1) {
          messages.value[failedMessageIndex].status = 'failed';
        }
        
        uni.showToast({
          title: '发送消息失败',
          icon: 'none'
        });
      }
    };
    
    // 标记消息为已读
    const markMessagesAsRead = async () => {
      if (!targetUserId.value || !userId.value) return;
      
      try {
        // 应该调用标记消息已读的API
        console.log('标记消息已读');
      } catch (error) {
        console.error('标记消息已读失败:', error);
      }
    };
    
    // 检查用户在线状态
    const checkUserOnline = async () => {
      if (!targetUserId.value) return;
      
      try {
        // 应该调用检查用户在线状态的API
        // 临时使用模拟数据
        isOnline.value = Math.random() > 0.5;
      } catch (error) {
        console.error('检查用户在线状态失败:', error);
      }
    };
    
    // 返回聊天列表
    const backToList = () => {
      uni.navigateBack();
    };
    
    // 滚动到底部
    const scrollToBottom = () => {
      nextTick(() => {
        const query = uni.createSelectorQuery().in(this);
        query.select('.message-list').boundingClientRect(data => {
          if (data) {
            scrollTop.value = data.height * 100; // 一个足够大的数字确保滚动到底部
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
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
        return BASE_URL + url;
      }
      
      // 其他情况，使用默认头像
      return '/static/images/default-avatar.png';
    };
    
    // 页面加载
    onLoad((options) => {
      targetUserId.value = options.userId || getTargetUserId();
      if (targetUserId.value) {
        loadChatUserInfo();
        loadMessages();
      } else {
        uni.showToast({
          title: '用户ID不能为空',
          icon: 'none'
        });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
      
      // 启动定时检查在线状态
      onlineCheckTimer = setInterval(checkUserOnline, 30000);
    });
    
    // 页面显示
    onShow(() => {
      // 重新检查在线状态
      checkUserOnline();
      
      // 标记消息为已读
      markMessagesAsRead();
    });
    
    // 页面卸载
    onUnload(() => {
      // 清除定时器
      if (onlineCheckTimer) {
        clearInterval(onlineCheckTimer);
        onlineCheckTimer = null;
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