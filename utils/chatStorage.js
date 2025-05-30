/**
 * 聊天消息本地缓存工具
 * 用于在网络不稳定时提供消息缓存和恢复功能
 */

// 常量定义
const NEARBY_MESSAGES_KEY = 'chat_nearby_messages';
const CITY_MESSAGES_KEY = 'chat_city_messages';
const MESSAGE_CACHE_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7天过期
const MAX_CACHE_MESSAGES = 100; // 最多缓存100条消息

/**
 * 获取附近消息缓存
 * @param {String} cacheKey - 可选的缓存键，用于不同区域
 * @returns {Array} - 消息列表
 */
export function getNearbyMessagesCache(cacheKey = '') {
  const key = cacheKey ? `${NEARBY_MESSAGES_KEY}_${cacheKey}` : NEARBY_MESSAGES_KEY;
  try {
    const cachedData = uni.getStorageSync(key);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      
      // 检查缓存是否过期
      if (data.timestamp && (Date.now() - data.timestamp) > MESSAGE_CACHE_EXPIRATION) {
        console.log('附近消息缓存已过期，清除缓存');
        uni.removeStorageSync(key);
        return [];
      }
      
      return data.messages || [];
    }
  } catch (error) {
    console.error('读取附近消息缓存失败:', error);
  }
  return [];
}

/**
 * 保存附近消息缓存
 * @param {Array} messages - 消息列表
 * @param {String} cacheKey - 可选的缓存键，用于不同区域
 */
export function saveNearbyMessagesCache(messages, cacheKey = '') {
  if (!Array.isArray(messages)) {
    console.error('保存的消息必须是数组');
    return;
  }
  
  const key = cacheKey ? `${NEARBY_MESSAGES_KEY}_${cacheKey}` : NEARBY_MESSAGES_KEY;
  try {
    // 限制缓存大小
    const messagesToCache = messages.slice(-MAX_CACHE_MESSAGES);
    
    const cacheData = {
      messages: messagesToCache,
      timestamp: Date.now()
    };
    
    uni.setStorageSync(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('保存附近消息缓存失败:', error);
  }
}

/**
 * 获取城市消息缓存
 * @param {String} cityName - 城市名称
 * @returns {Array} - 消息列表
 */
export function getCityMessagesCache(cityName) {
  if (!cityName) {
    console.error('获取城市消息缓存需要城市名称');
    return [];
  }
  
  const key = `${CITY_MESSAGES_KEY}_${cityName}`;
  try {
    const cachedData = uni.getStorageSync(key);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      
      // 检查缓存是否过期
      if (data.timestamp && (Date.now() - data.timestamp) > MESSAGE_CACHE_EXPIRATION) {
        console.log(`城市【${cityName}】消息缓存已过期，清除缓存`);
        uni.removeStorageSync(key);
        return [];
      }
      
      return data.messages || [];
    }
  } catch (error) {
    console.error(`读取城市【${cityName}】消息缓存失败:`, error);
  }
  return [];
}

/**
 * 保存城市消息缓存
 * @param {Array} messages - 消息列表
 * @param {String} cityName - 城市名称
 */
export function saveCityMessagesCache(messages, cityName) {
  if (!Array.isArray(messages)) {
    console.error('保存的消息必须是数组');
    return;
  }
  
  if (!cityName) {
    console.error('保存城市消息缓存需要城市名称');
    return;
  }
  
  const key = `${CITY_MESSAGES_KEY}_${cityName}`;
  try {
    // 限制缓存大小
    const messagesToCache = messages.slice(-MAX_CACHE_MESSAGES);
    
    const cacheData = {
      messages: messagesToCache,
      timestamp: Date.now()
    };
    
    uni.setStorageSync(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`保存城市【${cityName}】消息缓存失败:`, error);
  }
}

/**
 * 清除过期的消息缓存
 */
export function clearExpiredMessageCaches() {
  try {
    // 获取所有缓存键
    const keys = uni.getStorageInfoSync().keys;
    
    // 过滤出聊天缓存键
    const chatCacheKeys = keys.filter(key => 
      key.startsWith(NEARBY_MESSAGES_KEY) || 
      key.startsWith(CITY_MESSAGES_KEY)
    );
    
    // 检查每个缓存是否过期
    chatCacheKeys.forEach(key => {
      try {
        const cachedData = uni.getStorageSync(key);
        if (cachedData) {
          const data = JSON.parse(cachedData);
          
          // 检查缓存是否过期
          if (data.timestamp && (Date.now() - data.timestamp) > MESSAGE_CACHE_EXPIRATION) {
            console.log(`缓存【${key}】已过期，清除缓存`);
            uni.removeStorageSync(key);
          }
        }
      } catch (e) {
        // 如果解析失败，也清除这个缓存
        console.warn(`缓存【${key}】数据无效，清除缓存`);
        uni.removeStorageSync(key);
      }
    });
    
    console.log('清理过期缓存完成');
  } catch (error) {
    console.error('清理过期缓存失败:', error);
  }
}

/**
 * 保存发送中或失败的消息
 * @param {Object} message - 消息对象
 */
export function savePendingMessage(message) {
  if (!message || !message.id) {
    console.error('保存的消息对象无效');
    return;
  }
  
  try {
    // 获取当前待处理消息
    const pendingMessages = getPendingMessages();
    
    // 更新或添加消息
    const existingIndex = pendingMessages.findIndex(m => m.id === message.id);
    if (existingIndex !== -1) {
      pendingMessages[existingIndex] = message;
    } else {
      pendingMessages.push(message);
    }
    
    // 保存回存储
    uni.setStorageSync('chat_pending_messages', JSON.stringify({
      messages: pendingMessages,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('保存待处理消息失败:', error);
  }
}

/**
 * 获取所有待处理的消息
 * @returns {Array} - 待处理消息列表
 */
export function getPendingMessages() {
  try {
    const cachedData = uni.getStorageSync('chat_pending_messages');
    if (cachedData) {
      const data = JSON.parse(cachedData);
      return data.messages || [];
    }
  } catch (error) {
    console.error('读取待处理消息失败:', error);
  }
  return [];
}

/**
 * 移除待处理消息
 * @param {String} messageId - 消息ID
 */
export function removePendingMessage(messageId) {
  if (!messageId) return;
  
  try {
    const pendingMessages = getPendingMessages();
    const updatedMessages = pendingMessages.filter(m => m.id !== messageId);
    
    uni.setStorageSync('chat_pending_messages', JSON.stringify({
      messages: updatedMessages,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('移除待处理消息失败:', error);
  }
}

/**
 * 获取私聊消息缓存
 * @param {String} cacheKey - 缓存键，通常是两个用户ID的组合
 * @returns {Array} - 消息列表
 */
export function getPrivateMessages(cacheKey) {
  if (!cacheKey) {
    console.error('获取私聊消息缓存需要缓存键');
    return [];
  }
  
  try {
    const cachedData = uni.getStorageSync(cacheKey);
    if (cachedData) {
      const data = JSON.parse(cachedData);
      
      // 检查缓存是否过期
      if (data.timestamp && (Date.now() - data.timestamp) > MESSAGE_CACHE_EXPIRATION) {
        console.log(`私聊消息缓存【${cacheKey}】已过期，清除缓存`);
        uni.removeStorageSync(cacheKey);
        return [];
      }
      
      return data.messages || [];
    }
  } catch (error) {
    console.error(`读取私聊消息缓存【${cacheKey}】失败:`, error);
  }
  return [];
}

/**
 * 保存私聊消息缓存
 * @param {Array} messages - 消息列表
 * @param {String} cacheKey - 缓存键，通常是两个用户ID的组合
 */
export function savePrivateMessages(messages, cacheKey) {
  if (!Array.isArray(messages)) {
    console.error('保存的消息必须是数组');
    return;
  }
  
  if (!cacheKey) {
    console.error('保存私聊消息缓存需要缓存键');
    return;
  }
  
  try {
    // 限制缓存大小
    const messagesToCache = messages.slice(-MAX_CACHE_MESSAGES);
    
    const cacheData = {
      messages: messagesToCache,
      timestamp: Date.now()
    };
    
    uni.setStorageSync(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error(`保存私聊消息缓存【${cacheKey}】失败:`, error);
  }
}

// 默认导出所有方法
export default {
  getNearbyMessagesCache,
  saveNearbyMessagesCache,
  getCityMessagesCache,
  saveCityMessagesCache,
  clearExpiredMessageCaches,
  savePendingMessage,
  getPendingMessages,
  removePendingMessage,
  getPrivateMessages,
  savePrivateMessages
}; 