/**
 * 请求封装工具
 */
import walkStorage from '@/utils/walkStorage.js'
import config from '@/config/index.js'

// 请求超时时间（毫秒）
const TIMEOUT = 30000
const BASE_URL = config.BASE_API_URL || 'http://localhost:5000'

// 遛狗相关API路径
const WALK_API_PATHS = [
  '/api/walks',
  '/api/users/me/walks'
]

// 社区相关API路径
const COMMUNITY_API_PATHS = [
  '/api/community/posts'
]

/**
 * 处理API响应，统一响应格式
 * @param {Object} response - API响应对象
 * @returns {Object} - 处理后的响应数据
 */
export const handleResponse = (response) => {
  console.log('原始API响应:', response);
  
  // 如果响应为空，直接返回
  if (!response) {
    return null;
  }
  
  // 处理各种可能的响应结构
  
  // 如果响应有data字段，且data不是嵌套结构
  if (response.data && !response.data.data) {
    console.log('返回data字段:', response.data);
    return response.data;
  }
  
  // 如果响应是嵌套的data.data结构
  if (response.data && response.data.data) {
    console.log('返回嵌套data.data字段:', response.data.data);
    return response.data.data;
  }
  
  // 如果响应有code和data字段（标准API格式）
  if (response.code !== undefined && response.data) {
    console.log('返回标准API格式:', response.data);
    return response.data;
  }
  
  // 其他情况直接返回原始响应
  console.log('返回原始响应');
  return response;
};

/**
 * 请求封装函数
 */
const request = options => {
  // 检查是否需要处理特殊API
  if (options.url.includes('/api/walks')) {
    console.log('检测到遛狗API请求:', options.url);
    return handleWalkApiRequest(options);
  }
  
  // 检查是否是社区相关API
  if (options.url.includes('/api/community/posts')) {
    console.log('检测到社区API请求:', options.url);
    // 不再使用模拟数据，让所有请求都发送到真实后端
    console.log('使用真实后端处理社区API请求');
  }

  // 添加通用headers
  if (!options.header) {
    options.header = {}
  }
  
  // 超时时间 (默认10秒)
  const timeout = options.timeout || 10000
  
  // 构建完整URL
  const url = (options.baseURL || BASE_URL) + options.url

  // 处理GET请求参数
  if (options.method === 'GET' && options.params) {
    const queryString = Object.keys(options.params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(options.params[key])}`)
      .join('&')
    
    options.url = queryString ? `${url}?${queryString}` : url
  } else {
    options.url = url
  }
  
  return new Promise((resolve, reject) => {
    // 简化的认证检查
    const token = uni.getStorageSync('token')
    const isAuthenticated = !!token
    
    // 如果需要认证但没有token
    if (!isAuthenticated && options.needAuth !== false) {
      console.log('请求需要认证但没有token')
      return reject({ 
        message: '登录已过期，请重新登录', 
        statusCode: 401 
      })
    }
    
    // 设置请求头
    if (token) {
      options.header.Authorization = `Bearer ${token}`
    }
    
    // 发送请求
    uni.request({
      url: options.url,
      data: options.method === 'GET' ? undefined : options.data,
      method: options.method || 'GET',
      header: options.header,
      timeout: timeout,
      success: res => {
        const { statusCode, data } = res
        
        // 根据不同状态码处理响应
        if (statusCode >= 200 && statusCode < 300) {
          // 请求成功
          resolve(data)
        } else if (statusCode === 401) {
          // 未授权
          uni.showToast({
            title: '登录已过期，请重新登录',
            icon: 'none',
            duration: 2000
          })
          reject({ 
            message: '登录已过期，请重新登录',
            statusCode: 401,
            data: data 
          })
        } else if (statusCode === 404) {
          // 资源不存在
          reject({ 
            message: '请求的资源不存在',
            statusCode: 404,
            data: data,
            url: options.url
          })
        } else if (statusCode === 500) {
          // 服务器错误
          reject({ 
            message: '服务器错误，请稍后再试',
            statusCode: 500,
            data: data 
          })
        } else {
          // 其他错误
          reject({ 
            message: data?.message || `请求失败(${statusCode})`,
            statusCode: statusCode,
            data: data 
          })
        }
      },
      fail: err => {
        console.error('请求失败:', err)
        
        // 网络错误处理
        const message = err.errMsg.includes('timeout')
          ? '请求超时，请检查网络'
          : '网络错误，请检查网络连接'
        
        reject({ 
          message: message,
          statusCode: 0,
          error: err,
          url: options.url
        })
      }
    })
  })
}

/**
 * 处理遛狗相关API请求，使用本地存储
 * @param {Object} options - 请求选项
 * @returns {Promise} - API响应Promise
 */
const handleWalkApiRequest = (options) => {
  return new Promise((resolve) => {
    // 延迟一下，模拟网络请求
    setTimeout(() => {
      // 提取URL中的ID - 更智能处理ID提取
      const urlParts = options.url.split('/');
      let id = null;
      
      // 首先尝试查找以walk_开头的ID (本地存储格式)
      id = urlParts.find(part => part.startsWith('walk_'));
      
      // 如果找不到，使用最后一个路径部分作为ID
      if (!id && urlParts.length > 0) {
        id = urlParts[urlParts.length - 1];
        
        // 排除不是ID的情况
        if (id === 'walks' || id === 'walk' || id === '') {
          id = null;
        }
      }
      
      console.log('遛狗API处理 - 提取的ID:', id, '请求URL:', options.url);
      
      // 处理GET请求
      if (options.method === 'GET') {
        // 获取单个遛狗记录
        if (id) {
          const record = walkStorage.getWalkRecord(id);
          console.log('获取遛狗记录详情:', record);
          resolve(record?.data || null);
        } 
        // 获取遛狗记录列表
        else {
          const allRecords = walkStorage.getAllWalkRecords();
          const page = options.params?.page || 1;
          const limit = options.params?.limit || 10;
          const startIndex = (page - 1) * limit;
          const records = allRecords.slice(startIndex, startIndex + limit);
          console.log('获取遛狗记录列表, 页码:', page, '每页数量:', limit, '记录数:', records.length);
          resolve({
            code: 0,
            message: '获取成功',
            data: {
              list: records,
              total: allRecords.length,
              page: page,
              limit: limit
            }
          });
        }
      }
      // 处理POST请求 - 开始遛狗
      else if (options.method === 'POST' && options.url.includes('/walks/start')) {
        const result = walkStorage.saveWalkRecord(options.data);
        console.log('创建遛狗记录:', result);
        resolve(result);
      }
      // 处理POST请求 - 结束遛狗
      else if (options.method === 'POST' && options.url.includes('/end')) {
        const result = walkStorage.updateWalkRecord(id, options.data);
        console.log('更新遛狗记录:', result);
        resolve(result);
      }
      // 处理DELETE请求 - 删除遛狗记录
      else if (options.method === 'DELETE') {
        if (!id) {
          console.error('删除遛狗记录失败: 无法从URL中提取记录ID', options.url);
          resolve({
            code: 400,
            message: '无效的记录ID',
            data: null
          });
          return;
        }
        
        console.log('尝试删除遛狗记录, ID:', id);
        const result = walkStorage.deleteWalkRecord(id);
        console.log('删除遛狗记录结果:', result);
        
        // 即使本地存储中没找到记录，也返回成功
        if (result.code === 404) {
          console.log('本地存储中未找到记录,可能已经被删除,返回成功状态');
          resolve({
            code: 0,
            message: '记录已删除',
            data: null
          });
        } else {
          resolve(result);
        }
      }
      // 其他请求
      else {
        console.warn('未处理的遛狗API请求类型:', options.method, options.url);
        resolve({});
      }
    }, 300); // 延迟300ms，模拟网络请求
  });
};

/**
 * 处理社区相关API请求
 * @param {Object} options - 请求选项
 * @returns {Promise} - API响应Promise
 */
const handleCommunityApiRequest = (options) => {
  // 直接让请求通过到真实后端，不再使用模拟数据
  console.log('社区API请求将发送到真实后端:', options.url);
  
  // 构建完整URL
  const url = (options.baseURL || BASE_URL) + options.url;
  options.url = url;
  
  return new Promise((resolve, reject) => {
    // 简化的认证检查
    const token = uni.getStorageSync('token');
    const isAuthenticated = !!token;
    
    // 如果需要认证但没有token
    if (!isAuthenticated && options.needAuth !== false) {
      console.log('请求需要认证但没有token');
      return reject({ 
        message: '登录已过期，请重新登录', 
        statusCode: 401 
      });
    }
    
    // 设置请求头
    if (!options.header) {
      options.header = {};
    }
    
    if (token) {
      options.header.Authorization = `Bearer ${token}`;
    }
    
    // 发送请求
    uni.request({
      url: options.url,
      data: options.method === 'GET' ? undefined : options.data,
      method: options.method || 'GET',
      header: options.header,
      timeout: options.timeout || TIMEOUT,
      success: res => {
        const { statusCode, data } = res;
        
        // 根据不同状态码处理响应
        if (statusCode >= 200 && statusCode < 300) {
          // 请求成功
          resolve(data);
        } else {
          // 请求失败
          reject({ 
            message: data?.message || `请求失败(${statusCode})`,
            statusCode: statusCode,
            data: data 
          });
        }
      },
      fail: err => {
        console.error('请求失败:', err);
        reject({ 
          message: '网络错误，请检查网络连接',
          statusCode: 0,
          error: err
        });
      }
    });
  });
};

// 导出请求函数
export default request 

// 导出BASE_URL常量供其他模块使用
export { BASE_URL } 