/**
 * 聊天服务工具类
 * 封装聊天相关的所有功能和状态管理
 */
import api from '@/utils/api.js';
import { ref, reactive } from 'vue';
import config from '@/config/index.js';

// 全局消息重试配置
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 重试间隔2秒

// 消息缓存配置
const MESSAGE_CACHE_SIZE = 50; // 本地缓存最近50条消息

class ChatService {
  constructor() {
    // 消息缓存
    this.messageCaches = {
      nearby: [],
      city: []
    };
    
    // 消息发送队列
    this.messageQueue = [];
    this.isProcessingQueue = false;
    
    // 消息加载状态
    this.loadingStates = {
      nearby: false,
      city: false
    };
    
    // 分页信息
    this.pagination = {
      nearby: { page: 1, limit: 20, total: 0 },
      city: { page: 1, limit: 20, total: 0 }
    };
    
    // 网络状态
    this.networkStatus = {
      isOnline: true,
      lastChecked: Date.now()
    };
    
    // 初始化时检查网络
    this.checkNetworkStatus();
    
    // 监听网络状态变化
    uni.onNetworkStatusChange(res => {
      this.handleNetworkChange(res.isConnected);
    });
  }
  
  /**
   * 获取附近消息
   * @param {Object} params - 位置参数: { latitude, longitude, radius, page, limit }
   * @returns {Promise<Array>} - 消息列表
   */
  async getNearbyMessages(params = {}) {
    try {
      this.loadingStates.nearby = true;
      console.log('chatService开始获取附近消息, 参数:', params);
      
      // 合并分页参数
      const queryParams = {
        ...params,
        page: params.page || this.pagination.nearby.page,
        limit: params.limit || this.pagination.nearby.limit
      };
      
      // 调用API获取消息
      const response = await api.chat.getNearbyMessages(queryParams);
      console.log('chatService获取到附近消息raw响应:', response);
      
      // 更新分页信息
      if (response && response.pagination) {
        this.pagination.nearby = response.pagination;
      }
      
      // 处理响应数据 - 支持多种响应格式
      let messages = [];
      if (response && response.data) {
        // 如果response有data字段，使用它
        messages = response.data;
      } else if (Array.isArray(response)) {
        // 如果response本身是数组，直接使用
        messages = response;
      }
      
      console.log('chatService处理后的消息数据:', messages);
      
      // 更新本地缓存
      if (queryParams.page === 1) {
        this.messageCaches.nearby = [...messages];
      } else {
        // 追加新消息，避免重复
        const existingIds = this.messageCaches.nearby.map(msg => msg.id);
        const newMessages = messages.filter(msg => !existingIds.includes(msg.id));
        this.messageCaches.nearby = [...this.messageCaches.nearby, ...newMessages];
      }
      
      // 限制缓存大小
      if (this.messageCaches.nearby.length > MESSAGE_CACHE_SIZE) {
        this.messageCaches.nearby = this.messageCaches.nearby.slice(-MESSAGE_CACHE_SIZE);
      }
      
      return messages;
    } catch (error) {
      console.error('获取附近消息失败:', error);
      
      // 如果网络错误，使用缓存数据
      if (this.isNetworkError(error) && this.messageCaches.nearby.length > 0) {
        console.log('使用缓存的附近消息');
        return this.messageCaches.nearby;
      }
      
      throw error;
    } finally {
      this.loadingStates.nearby = false;
    }
  }
  
  /**
   * 获取城市消息
   * @param {Object} params - 城市参数: { cityName, page, limit }
   * @returns {Promise<Array>} - 消息列表
   */
  async getCityMessages(params = {}) {
    try {
      this.loadingStates.city = true;
      console.log('chatService开始获取城市消息, 参数:', params);
      
      if (!params.cityName) {
        console.error('城市名称不能为空');
        return [];
      }
      
      // 合并分页参数
      const queryParams = {
        ...params,
        page: params.page || this.pagination.city.page,
        limit: params.limit || this.pagination.city.limit
      };
      
      // 调用API获取消息
      const response = await api.chat.getCityMessages(queryParams);
      console.log('chatService获取到城市消息raw响应:', response);
      
      // 更新分页信息
      if (response && response.pagination) {
        this.pagination.city = response.pagination;
      }
      
      // 处理响应数据 - 支持多种响应格式
      let messages = [];
      if (response && response.data) {
        // 如果response有data字段，使用它
        messages = response.data;
      } else if (Array.isArray(response)) {
        // 如果response本身是数组，直接使用
        messages = response;
      }
      
      console.log('chatService处理后的城市消息数据:', messages);
      
      // 更新本地缓存
      if (queryParams.page === 1) {
        this.messageCaches.city = [...messages];
      } else {
        // 追加新消息，避免重复
        const existingIds = this.messageCaches.city.map(msg => msg.id);
        const newMessages = messages.filter(msg => !existingIds.includes(msg.id));
        this.messageCaches.city = [...this.messageCaches.city, ...newMessages];
      }
      
      // 限制缓存大小
      if (this.messageCaches.city.length > MESSAGE_CACHE_SIZE) {
        this.messageCaches.city = this.messageCaches.city.slice(-MESSAGE_CACHE_SIZE);
      }
      
      return messages;
    } catch (error) {
      console.error('获取城市消息失败:', error);
      
      // 如果网络错误，使用缓存数据
      if (this.isNetworkError(error) && this.messageCaches.city.length > 0) {
        console.log('使用缓存的城市消息');
        return this.messageCaches.city;
      }
      
      throw error;
    } finally {
      this.loadingStates.city = false;
    }
  }
  
  /**
   * 发送附近消息
   * @param {Object} messageData - 消息数据: { content, latitude, longitude }
   * @returns {Promise<Object>} - 发送结果
   */
  async sendNearbyMessage(messageData) {
    return this.sendMessage('nearby', messageData);
  }
  
  /**
   * 发送城市消息
   * @param {Object} messageData - 消息数据: { content, cityName, latitude, longitude }
   * @returns {Promise<Object>} - 发送结果
   */
  async sendCityMessage(messageData) {
    return this.sendMessage('city', messageData);
  }
  
  /**
   * 发送消息通用方法
   * @param {String} type - 消息类型: nearby或city
   * @param {Object} messageData - 消息数据
   * @returns {Promise<Object>} - 发送结果
   */
  async sendMessage(type, messageData) {
    // 生成临时消息ID
    const tempId = 'temp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // 创建消息对象
    const message = {
      id: tempId,
      content: messageData.content,
      createTime: new Date().getTime(),
      status: 'sending',
      type,
      data: messageData,
      retryCount: 0
    };
    
    // 添加到发送队列
    this.messageQueue.push(message);
    
    // 开始处理队列
    if (!this.isProcessingQueue) {
      this.processMessageQueue();
    }
    
    // 返回临时消息对象
    return message;
  }
  
  /**
   * 处理消息发送队列
   */
  async processMessageQueue() {
    if (this.messageQueue.length === 0 || this.isProcessingQueue) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    // 检查网络状态
    if (!this.networkStatus.isOnline) {
      console.log('网络离线，暂停处理消息队列');
      this.isProcessingQueue = false;
      return;
    }
    
    try {
      // 获取队列中的第一条消息
      const message = this.messageQueue[0];
      
      // 发送消息
      let response;
      if (message.type === 'nearby') {
        response = await api.chat.sendNearbyMessage(message.data);
      } else if (message.type === 'city') {
        response = await api.chat.sendCityMessage(message.data);
      }
      
      // 发送成功
      if (response) {
        console.log('消息发送成功:', response);
        
        // 从队列中移除该消息
        this.messageQueue.shift();
        
        // 更新临时消息为成功状态
        this.updateMessageStatus(message.id, 'sent', response);
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 获取队列中的第一条消息
      const message = this.messageQueue[0];
      
      // 增加重试次数
      message.retryCount++;
      
      // 如果超过最大重试次数，标记为失败并移出队列
      if (message.retryCount >= RETRY_MAX_ATTEMPTS) {
        console.log(`消息 ${message.id} 重试失败 ${message.retryCount} 次，放弃重试`);
        this.messageQueue.shift();
        this.updateMessageStatus(message.id, 'failed');
      } else {
        // 否则保留在队列中等待下次重试
        console.log(`消息 ${message.id} 发送失败，将在 ${RETRY_DELAY}ms 后重试 (${message.retryCount}/${RETRY_MAX_ATTEMPTS})`);
      }
    } finally {
      this.isProcessingQueue = false;
      
      // 延迟一段时间后继续处理队列
      if (this.messageQueue.length > 0) {
        setTimeout(() => {
          this.processMessageQueue();
        }, RETRY_DELAY);
      }
    }
  }
  
  /**
   * 更新消息状态
   * @param {String} messageId - 消息ID
   * @param {String} status - 消息状态: sending, sent, failed
   * @param {Object} serverData - 服务器返回的消息数据
   */
  updateMessageStatus(messageId, status, serverData = null) {
    // 这里只是定义接口，实际实现需要在使用此服务的组件中
    // 通过事件机制通知组件更新消息状态
    console.log('消息状态更新:', messageId, status, serverData);
    
    // 触发自定义事件
    uni.$emit('chat:message-status-update', {
      messageId,
      status,
      serverData
    });
  }
  
  /**
   * 判断是否为网络错误
   * @param {Error} error - 错误对象
   * @returns {Boolean} - 是否为网络错误
   */
  isNetworkError(error) {
    return (
      error.message?.includes('网络') ||
      error.message?.includes('Network') ||
      error.message?.includes('timeout') ||
      error.statusCode === 0 ||
      !this.networkStatus.isOnline
    );
  }
  
  /**
   * 检查网络状态
   */
  checkNetworkStatus() {
    uni.getNetworkType({
      success: res => {
        const isOnline = res.networkType !== 'none';
        this.handleNetworkChange(isOnline);
      }
    });
  }
  
  /**
   * 处理网络状态变化
   * @param {Boolean} isOnline - 是否在线
   */
  handleNetworkChange(isOnline) {
    const previousState = this.networkStatus.isOnline;
    this.networkStatus.isOnline = isOnline;
    this.networkStatus.lastChecked = Date.now();
    
    console.log('网络状态更新:', isOnline ? '在线' : '离线');
    
    // 状态从离线变为在线
    if (!previousState && isOnline) {
      console.log('网络已恢复，重新处理消息队列');
      
      // 继续处理消息队列
      setTimeout(() => {
        this.processMessageQueue();
      }, 1000);
    }
    
    // 触发网络状态变化事件
    uni.$emit('chat:network-status-change', { isOnline });
  }
}

// 创建单例实例
const chatService = new ChatService();

export default chatService; 