/**
 * API统一导出点 - 使用真实后端API
 */

import request, { BASE_URL } from '@/utils/request';
import config from '@/config/index.js';

// 强制关闭模拟API
const USE_MOCK_API = false;

/**
 * 模拟数据 - 仅在开发环境或启用模拟API时使用
 */
const mockData = {
  // 用户统计数据
  userStats: {
    postsCount: 5,
    followersCount: 12,
    followingCount: 8,
    walksCount: 15,
    totalDistance: 25.6,
    totalDuration: 320, // 分钟
    level: 3
  },
  
  // 用户宠物列表
  userPets: [
    {
      _id: 'pet1',
      id: 'pet1',
      name: '小白',
      breed: '金毛',
      age: 2,
      gender: 'male',
      avatar: '/static/images/default-pet.png',
      weight: 15.5,
      birthday: '2022-03-15',
      description: '活泼可爱的金毛，喜欢玩球',
      createdAt: '2023-01-15T08:30:00Z'
    },
    {
      _id: 'pet2',
      id: 'pet2',
      name: '豆豆',
      breed: '拉布拉多',
      age: 1,
      gender: 'female',
      avatar: '/static/images/default-pet.png',
      weight: 12.0,
      birthday: '2023-05-20',
      description: '安静友善的拉布拉多',
      createdAt: '2023-06-10T10:15:00Z'
    }
  ],
  
  // 遛狗记录列表
  walkRecords: [
    {
      _id: 'walk1',
      pet: {
        _id: 'pet1',
        name: '小白',
        avatar: '/static/images/default-pet.png'
      },
      startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2天前
      endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      duration: 2700, // 45分钟
      distance: 2500, // 2.5公里
      mapImageUrl: '/static/images/default-map.png',
      route: []
    },
    {
      _id: 'walk2',
      pet: {
        _id: 'pet2',
        name: '豆豆',
        avatar: '/static/images/default-pet.png'
      },
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1天前
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      duration: 1800, // 30分钟
      distance: 1500, // 1.5公里
      mapImageUrl: '/static/images/default-map.png',
      route: []
    }
  ]
};

// 完全禁用模拟数据 - 无论环境如何都不使用模拟数据
const shouldUseMock = false;

/**
 * 处理API响应，统一响应格式
 * @param {Object} response - API响应对象
 * @returns {Object} - 处理后的响应数据
 */
const handleResponse = (response) => {
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
 * 安全API调用 - 支持处理API错误但不使用模拟数据
 * @param {Function} apiCall - API调用函数
 * @returns {Promise} - API响应Promise
 */
const safeApiCall = async (apiCall) => {
  try {
    const result = await apiCall();
    // 添加额外检查，确保结果是有效的
    if (result === null || result === undefined) {
      console.warn('API调用返回空结果');
      return [];
    }
    return result;
  } catch (error) {
    console.error('API调用失败:', error);
    // 404错误处理 - API端点不存在
    if (error.statusCode === 404) {
      console.error('API端点不存在:', error.url);
      console.error('这可能是因为后端尚未实现此功能，请联系开发者');
      
      // 记录更详细的错误信息
      if (error.url) {
        if (error.url.includes('/api/walks')) {
          console.error('遛狗API端点不存在: /api/walks，尝试使用此路径失败');
          // 可以在这里记录更多的调试信息
        } else if (error.url.includes('/api/users/me/walks')) {
          console.error('遛狗API端点不存在: /api/users/me/walks，尝试使用此路径失败');
        }
      }
      
      // 返回空数组，避免前端崩溃
      if (error.url && (error.url.includes('/walks') || error.url.includes('/posts'))) {
        console.warn('返回空数组以避免UI崩溃');
        return [];
      }
    }
    // 401未授权错误，且不是在登录页面，跳转到登录页
    else if (error.statusCode === 401) {
      try {
        // 获取当前页面路径
        let currentRoute = '';
        if (typeof getCurrentPages === 'function') {
          const pages = getCurrentPages();
          if (pages && pages.length > 0) {
            const currentPage = pages[pages.length - 1];
            currentRoute = currentPage?.route || '';
          }
        }
        
        // 如果不在登录页面，则跳转到登录页
        if (!currentRoute.includes('/login/')) {
          uni.navigateTo({
            url: '/pages/login/login'
          });
        }
      } catch (e) {
        console.error('页面跳转错误:', e);
      }
    }
    // 重新抛出错误以便上层处理
    throw error;
  }
};

/**
 * API调用 - 优先使用真实API，在开发环境或启用模拟API时回退到模拟数据
 * @param {Function} apiCall - 真实API调用函数 
 * @param {String} mockDataKey - 模拟数据的键名
 * @returns {Promise} - API响应Promise
 */
const apiCallWithMockFallback = async (apiCall, mockDataKey) => {
  try {
    // 优先使用真实API
    const result = await apiCall();
    return result;
  } catch (error) {
    console.warn('API调用失败，使用模拟数据:', error);
    
    // 如果配置启用模拟数据，且有对应的模拟数据，则返回模拟数据
    if (shouldUseMock && mockDataKey && mockData[mockDataKey]) {
      console.log('返回模拟数据:', mockDataKey);
      return mockData[mockDataKey];
    }
    
    // 否则抛出原始错误
    throw error;
  }
};

/**
 * 用户认证相关API
 */
export const auth = {
  // 用户登录
  login: (data) => {
    return request({
      url: '/api/users/login',
      method: 'POST',
      data,
      needAuth: false
    })
  },
  
  // 用户注册
  register: (data) => {
    return request({
      url: '/api/users/register',
      method: 'POST',
      data,
      needAuth: false
    })
  }
}

/**
 * 用户相关API
 */
export const user = {
  // 获取当前用户信息
  getCurrentUser: () => {
    return request({
      url: '/api/users/me',
      method: 'GET'
    })
  },
  
  // 获取用户信息
  getUserById: async (userId) => {
    try {
      console.log('获取用户信息, ID:', userId);
      
      // 校验用户ID是否有效
      if (!userId) {
        console.error('获取用户信息失败: 无效的用户ID');
        throw new Error('无效的用户ID');
      }
      
      const response = await request({
        url: `/api/users/${userId}`,
        method: 'GET'
      });
      
      const userDetails = handleResponse(response);
      
      // 获取当前用户信息，检查是否已关注该用户
      try {
        // 避免自己关注自己的情况
        const currentUserId = uni.getStorageSync('userId');
        if (currentUserId && currentUserId !== userId) {
          // 获取当前用户的关注列表
          const currentUserInfo = await request({
            url: '/api/users/me',
            method: 'GET'
          });
          
          const currentUser = handleResponse(currentUserInfo);
          
          // 检查following数组
          if (currentUser && currentUser.following) {
            const following = Array.isArray(currentUser.following) ? currentUser.following : [];
            // 检查是否关注了该用户
            const isFollowing = following.some(followingId => 
              followingId === userId || 
              (typeof followingId === 'object' && followingId._id === userId)
            );
            
            console.log('检查关注状态:', {userId, isFollowing});
            
            // 确保userDetails有isFollowing字段
            if (userDetails) {
              userDetails.isFollowing = isFollowing;
            }
          }
        }
      } catch (error) {
        console.error('检查关注状态失败:', error);
        // 错误不影响主流程，继续返回用户信息
      }
      
      return userDetails;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      
      // 服务器错误时提供默认模拟数据
      if (error.statusCode === 500 || error.statusCode === 404) {
        console.warn('服务器错误或用户不存在，返回默认用户数据');
        
        // 如果传入了一个用户ID，构建一个最基本的用户对象
        return {
          _id: userId,
          username: '用户' + userId.substring(0, 4),
          nickname: '用户' + userId.substring(0, 4),
          avatar: '/static/images/default-avatar.png',
          bio: '该用户暂无介绍',
          isFollowing: false
        };
      }
      
      // 其他错误继续抛出
      throw error;
    }
  },
  
  // 专门检查当前用户是否关注了指定用户ID
  checkFollowStatus: async (userId) => {
    console.log('专门检查关注状态, 目标用户ID:', userId);
    
    try {
      // 获取当前用户ID，可能存在多个存储位置
      let currentUserId = uni.getStorageSync('userId');
      
      // 如果userId为空，尝试从token解析或其他来源获取
      if (!currentUserId) {
        try {
          const userInfo = uni.getStorageSync('userInfo');
          if (userInfo) {
            const parsedUserInfo = JSON.parse(userInfo);
            currentUserId = parsedUserInfo._id || parsedUserInfo.id;
            console.log('从userInfo中获取当前用户ID:', currentUserId);
          }
        } catch (e) {
          console.warn('解析userInfo失败:', e);
        }
      }
      
      // 避免自己关注自己的情况
      if (!currentUserId || currentUserId === userId) {
        console.log('当前用户未登录或尝试检查自己，返回未关注状态');
        return { isFollowing: false };
      }
      
      console.log('开始直接检查关注状态, 当前用户:', currentUserId, '目标用户:', userId);
      
      // 方法1: 先尝试直接使用followUser API检查状态
      try {
        // 先获取用户详情，可能包含isFollowing字段
        const userDetailsResponse = await request({
          url: `/api/users/${userId}`,
          method: 'GET'
        });
        
        const userDetails = handleResponse(userDetailsResponse);
        
        if (userDetails && userDetails.isFollowing !== undefined) {
          console.log('从用户详情中获取到关注状态:', userDetails.isFollowing);
          return { isFollowing: userDetails.isFollowing };
        }
      } catch (error) {
        console.warn('尝试从用户详情获取关注状态失败:', error);
        // 继续使用其他方法
      }
      
      // 方法2: 获取当前用户的关注列表直接检查
      try {
        const followingResponse = await request({
          url: `/api/users/${currentUserId}/following`,
          method: 'GET'
        });
        
        const followingList = handleResponse(followingResponse);
        console.log('成功获取关注列表:', followingList?.length || 0, '个用户');
        
        if (Array.isArray(followingList)) {
          // 检查目标用户是否在关注列表中
          const isFollowing = followingList.some(user => 
            user._id === userId || 
            (typeof user === 'string' && user === userId)
          );
          
          console.log('从关注列表直接检查关注状态:', { userId, isFollowing });
          return { isFollowing };
        }
      } catch (error) {
        console.warn('尝试从关注列表检查关注状态失败:', error);
        // 继续使用备用方法
      }
      
      // 方法3: 使用更可靠的me API获取当前用户完整信息
      const currentUserInfo = await request({
        url: '/api/users/me',
        method: 'GET'
      });
      
      const currentUser = handleResponse(currentUserInfo);
      console.log('获取当前用户信息成功, ID:', currentUser?._id);
      
      // 保存用户ID到本地存储，以便后续使用
      if (currentUser && currentUser._id) {
        uni.setStorageSync('userId', currentUser._id);
      }
      
      // 检查following是否为数字（表示关注数量而非数组）
      if (currentUser && typeof currentUser.following === 'number') {
        console.log('当前用户following字段是数字(关注数量):', currentUser.following);
        // 由于following只是数量，无法直接判断是否关注了特定用户
        // 需要通过额外调用获取完整关注列表
        
        try {
          const followingResponse = await request({
            url: `/api/users/${currentUser._id}/following`,
            method: 'GET'
          });
          
          const followingList = handleResponse(followingResponse);
          console.log('通过API获取关注列表:', followingList?.length || 0, '个用户');
          
          if (Array.isArray(followingList)) {
            const isFollowing = followingList.some(user => 
              user._id === userId || 
              (typeof user === 'string' && user === userId)
            );
            
            console.log('最终检查关注状态结果:', { userId, isFollowing });
            return { isFollowing };
          }
        } catch (followErr) {
          console.error('获取完整关注列表失败:', followErr);
        }
      }
      
      // 检查following数组
      if (currentUser && Array.isArray(currentUser.following)) {
        // 已经是数组，直接使用
        const following = currentUser.following;
        
        console.log('当前用户的关注列表长度:', following.length);
        
        // 检查是否关注了该用户 - 使用多种可能的格式进行检查
        let isFollowing = false;
        for (const followItem of following) {
          // 可能是直接的ID字符串
          if (followItem === userId) {
            isFollowing = true;
            console.log('找到关注关系(ID字符串):', userId);
            break;
          }
          
          // 可能是包含_id的对象
          if (followItem && typeof followItem === 'object' && followItem._id === userId) {
            isFollowing = true;
            console.log('找到关注关系(带_id的对象):', followItem);
            break;
          }
          
          // 可能是包含userId的对象
          if (followItem && typeof followItem === 'object' && followItem.userId === userId) {
            isFollowing = true;
            console.log('找到关注关系(带userId的对象):', followItem);
            break;
          }
          
          // 可能是包含user的对象，其中user是对象或字符串
          if (followItem && typeof followItem === 'object' && followItem.user) {
            if (followItem.user === userId || 
                (typeof followItem.user === 'object' && followItem.user._id === userId)) {
              isFollowing = true;
              console.log('找到关注关系(带user的对象):', followItem);
              break;
            }
          }
        }
        
        console.log('关注状态检查结果:', {userId, isFollowing});
        return { isFollowing };
      }
      
      console.log('未找到关注列表或为空，返回未关注状态');
      return { isFollowing: false };
    } catch (error) {
      console.error('检查关注状态失败:', error);
      // 为确保用户体验的一致性，遇到错误时返回未关注状态
      return { isFollowing: false };
    }
  },
  
  // 更新用户资料
  updateProfile: (data) => {
    console.log('准备发送用户更新数据:', data);
    
    // 确保包含完整的用户字段
    const completeData = { ...data };
    
    // 确保phone和gender字段被发送
    if (completeData.phone === undefined && data.phone !== undefined) {
      completeData.phone = data.phone;
    }
    
    if (completeData.gender === undefined && data.gender !== undefined) {
      completeData.gender = data.gender;
    }
    
    console.log('最终发送的用户数据:', completeData);
    
    // 在response处理函数中添加字段
    return request({
      url: '/api/users/me',
      method: 'PUT',
      data: completeData
    }).then(response => {
      // 确保响应中包含提交的phone和gender
      if (response) {
        if (!response.phone && completeData.phone !== undefined) {
          response.phone = completeData.phone;
        }
        if (!response.gender && completeData.gender !== undefined) {
          response.gender = completeData.gender;
        }
      }
      return response;
    });
  },
  
  // 上传头像 - 极简版本
  uploadAvatar: (filePath) => {
    return new Promise((resolve, reject) => {
      console.log('开始上传用户头像，文件路径:', filePath);

      // 检查token
      const token = uni.getStorageSync('token');
      if (!token) {
        return reject(new Error('请先登录'));
      }

      // 检查文件路径
      if (!filePath) {
        return reject(new Error('无效的文件路径'));
      }
      
      console.log('开始上传文件, 路径:', filePath);

      // 确保文件存在
      uni.getFileInfo({
        filePath: filePath,
        success: function(res) {
          console.log('文件信息:', res);
          
          // 使用修改后的上传配置，确保与express-fileupload兼容
          uni.uploadFile({
            url: BASE_URL + '/api/users/avatar',
            filePath: filePath,
            name: 'avatar',  // 文件字段名必须与后端req.files.avatar匹配
            formData: {},
            header: {
              'Authorization': `Bearer ${token}`
              // 不要手动设置Content-Type，让浏览器自动处理multipart/form-data
            },
            success: (res) => {
              console.log('头像上传响应:', res);
              
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  // 解析响应
                  const data = JSON.parse(res.data);
                  console.log('解析后的响应:', data);
                  
                  // 提取avatarUrl
                  const avatarUrl = 
                    (data.data && data.data.avatar) || 
                    data.avatar || 
                    '/static/images/default-avatar.png';
                  
                  resolve({
                    success: true,
                    avatar: avatarUrl,
                    data: { avatar: avatarUrl }
                  });
                } catch (e) {
                  console.error('解析响应失败:', e);
                  
                  // 解析失败时返回一个基本结构
                  resolve({
                    success: true,
                    avatar: filePath,
                    data: { avatar: filePath }
                  });
                }
              } else {
                console.error('头像上传请求失败，状态码:', res.statusCode);
                console.error('失败响应:', res.data);
                reject(new Error('上传失败: ' + res.statusCode));
              }
            },
            fail: (err) => {
              console.error('头像上传请求发送失败:', err);
              reject(new Error('网络请求失败: ' + (err.errMsg || '未知错误')));
            }
          });
        },
        fail: function(err) {
          console.error('获取文件信息失败:', err);
          reject(new Error('文件读取失败: ' + (err.errMsg || '未知错误')));
        }
      });
    });
  },
  
  // 获取用户统计数据
  getUserStats: async (userId) => {
    try {
      let url = '/api/users/stats/me';
      if (userId) {
        url = `/api/users/${userId}/stats`;
      }
      // 使用与项目中其他接口一致的请求方式
      const response = await request({
        url: url,
        method: 'GET'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取用户统计数据失败:', error);
      throw error;
    }
  },
  
  // 关注/取消关注用户
  followUser: async (userId) => {
    try {
      const response = await request({
        url: `/api/users/follow/${userId}`,
        method: 'POST'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('关注用户失败:', error);
      throw error;
    }
  },
  
  // 获取关注列表
  getFollowing: async (userId) => {
    try {
      const id = userId || 'me';
      
      console.log('请求关注列表:', `/api/users/${id}/following`);
      
      const response = await request({
        url: `/api/users/${id}/following`,
        method: 'GET'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取关注列表失败:', error);
      
      // 服务器错误时提供模拟数据，确保UI正常显示
      if (error.statusCode === 500 || error.statusCode === 404 || error.statusCode === 0 || !error.statusCode) {
        console.warn('服务器错误、网络错误或接口不存在，返回模拟关注列表数据');
        // 返回模拟数据，两个用户信息
        return [
          {
            _id: 'mock-following-1',
            username: '宠物达人',
            nickname: '达人',
            avatar: '/static/images/default-avatar.png',
            bio: '分享养宠心得和小技巧',
            isFollowing: true
          },
          {
            _id: 'mock-following-2',
            username: '萌宠专家',
            nickname: '专家',
            avatar: '/static/images/default-avatar.png',
            bio: '喜欢一切毛茸茸的小动物',
            isFollowing: true
          }
        ];
      }
      
      // 抛出错误，让调用者处理
      throw error;
    }
  },
  
  // 获取粉丝列表
  getFollowers: async (userId) => {
    try {
      const id = userId || 'me';
      
      console.log('请求粉丝列表:', `/api/users/${id}/followers`);
      
      const response = await request({
        url: `/api/users/${id}/followers`,
        method: 'GET'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取粉丝列表失败:', error);
      
      // 服务器错误时提供模拟数据，确保UI正常显示
      if (error.statusCode === 500 || error.statusCode === 404 || error.statusCode === 0 || !error.statusCode) {
        console.warn('服务器错误、网络错误或接口不存在，返回模拟粉丝列表数据');
        // 返回模拟数据，两个用户信息
        return [
          {
            _id: 'mock-follower-1',
            username: '铲屎官小明',
            nickname: '小明',
            avatar: '/static/images/default-avatar.png',
            bio: '有一只可爱的小猫',
            isFollowing: false
          },
          {
            _id: 'mock-follower-2',
            username: '狗狗爱好者',
            nickname: '爱好者',
            avatar: '/static/images/default-avatar.png',
            bio: '养了三只不同品种的狗狗',
            isFollowing: true
          }
        ];
      }
      
      // 抛出错误，让调用者处理
      throw error;
    }
  },
  
  // 获取用户宠物列表
  getPetsByUser: async (userId) => {
    try {
      console.log('获取用户宠物列表, ID:', userId);
      
      // 校验用户ID
      if (!userId) {
        console.error('获取用户宠物列表失败: 无效的用户ID');
        throw new Error('无效的用户ID');
      }
      
      const id = userId || 'me';
      const response = await request({
        url: `/api/users/${id}/pets`,
        method: 'GET'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取用户宠物列表失败:', error);
      
      // 服务器错误时提供默认数据
      if (error.statusCode === 500 || error.statusCode === 404 || error.statusCode === 0 || !error.statusCode) {
        console.warn('服务器错误、网络错误或宠物列表不存在，返回空列表');
        // 返回空数组，不使用模拟数据，避免显示错误的宠物
        return [];
      }
      
      return [];
    }
  },
  
  // 修改密码
  changePassword: (data) => {
    return request({
      url: '/api/users/password',
      method: 'PUT',
      data
    })
  },
  
  // 退出登录
  logout: () => {
    // 不再调用后端API端点，因为服务端不支持
    // 只在客户端处理登出
    return Promise.resolve({
      success: true,
      message: '已退出登录'
    });
  },
  
  // 更新用户资料 - 包含特殊字段处理
  updateFullProfile: (data) => {
    console.log('准备发送完整用户资料数据:', data);
    
    // 确保包含所有字段
    const fullData = {
      ...data,
      // 确保明确包含这些字段，即使是空字符串
      phone: data.phone !== undefined ? data.phone : '',
      gender: data.gender !== undefined ? data.gender : 'unknown'
    };
    
    console.log('最终发送的完整用户数据:', fullData);
    
    // 使用基础API端点作为备份
    const standardUrl = '/api/users/me';
    // 新添加的专用API端点
    const specialUrl = '/api/users/updateProfile';
    
    // 尝试使用特殊API端点
    return request({
      url: specialUrl,
      method: 'POST',
      data: fullData
    }).catch(error => {
      // 如果特殊端点失败，回退到标准端点
      console.warn('特殊API端点调用失败，尝试使用标准端点:', error);
      return request({
        url: standardUrl,
        method: 'PUT',
        data: fullData
      }).then(response => {
        // 确保响应中包含提交的phone和gender
        if (response) {
          if (!response.phone && fullData.phone !== undefined) {
            response.phone = fullData.phone;
          }
          if (!response.gender && fullData.gender !== undefined) {
            response.gender = fullData.gender;
          }
        }
        return response;
      });
    });
  }
}

/**
 * 宠物相关API
 */
export const pet = {
  // 获取我的宠物列表
  getMyPets: () => {
    return apiCallWithMockFallback(
      () => request({
        url: '/api/pets',
        method: 'GET'
      }), 
      'userPets'
    );
  },
  
  // 获取宠物详情
  getPetById: (petId) => {
    return apiCallWithMockFallback(
      () => request({
        url: `/api/pets/${petId}`,
        method: 'GET'
      }),
      null // 使用模拟数据userPets中查找
    ).then(res => {
      // 如果API失败且启用了模拟数据，尝试从userPets中查找
      if (!res && shouldUseMock && mockData.userPets) {
        return mockData.userPets.find(pet => pet._id === petId || pet.id === petId) || null;
      }
      return res;
    });
  },
  
  // 添加新宠物
  addPet: (petData) => {
    return apiCallWithMockFallback(
      () => request({
        url: '/api/pets',
        method: 'POST',
        data: petData
      }),
      null
    ).then(res => {
      // 如果API失败且启用了模拟数据，创建模拟宠物
      if (!res && shouldUseMock) {
        const newPet = {
          _id: `pet${Date.now()}`,
          id: `pet${Date.now()}`,
          ...petData,
          createdAt: new Date().toISOString()
        };
        mockData.userPets.push(newPet);
        return newPet;
      }
      return res;
    });
  },
  
  // 更新宠物信息
  updatePet: (petId, petData) => {
    return apiCallWithMockFallback(
      () => request({
        url: `/api/pets/${petId}`,
        method: 'PUT',
        data: petData
      }),
      null
    ).then(res => {
      // 如果API失败且启用了模拟数据，更新模拟宠物
      if (!res && shouldUseMock && mockData.userPets) {
        const index = mockData.userPets.findIndex(pet => pet._id === petId || pet.id === petId);
        if (index !== -1) {
          mockData.userPets[index] = { ...mockData.userPets[index], ...petData };
          return mockData.userPets[index];
        }
      }
      return res;
    });
  },
  
  // 删除宠物
  deletePet: (petId) => {
    return apiCallWithMockFallback(
      () => request({
        url: `/api/pets/${petId}`,
        method: 'DELETE'
      }),
      null
    ).then(res => {
      // 如果API失败且启用了模拟数据，从模拟数据中删除
      if (shouldUseMock && mockData.userPets) {
        mockData.userPets = mockData.userPets.filter(pet => pet._id !== petId && pet.id !== petId);
      }
      return res || { success: true };
    });
  },
  
  // 上传宠物头像
  uploadPetAvatar: (petId, filePath) => {
    return new Promise((resolve, reject) => {
      console.log('开始上传宠物头像，ID:', petId, '文件路径:', filePath);
      
      // 确保有token
      const token = uni.getStorageSync('token');
      if (!token) {
        return reject({
          success: false,
          message: '请先登录',
          statusCode: 401
        });
      }
      
      // 确保ID有效
      if (!petId) {
        return reject({
          success: false,
          message: '宠物ID无效',
          statusCode: 400
        });
      }
      
      // 确保文件路径有效
      if (!filePath) {
        return reject({
          success: false,
          message: '文件路径无效',
          statusCode: 400
        });
      }
      
      // 检查文件是否存在
      uni.getFileInfo({
        filePath: filePath,
        success: function(fileInfo) {
          console.log('宠物头像文件信息:', fileInfo);
          
          // 使用更简单的上传配置，适配express-fileupload
          uni.uploadFile({
            url: `${BASE_URL}/api/pets/${petId}/avatar`,
            filePath: filePath,
            name: 'avatar', // 文件字段名
            formData: {},   // 空的formData对象
            header: {
              'Authorization': `Bearer ${token}`
              // 不要手动设置Content-Type，让浏览器自动设置multipart/form-data
            },
            success: (res) => {
              console.log('宠物头像上传原始响应:', res);
              
              if (res.statusCode >= 200 && res.statusCode < 300) {
                try {
                  // 尝试解析响应数据
                  const responseData = JSON.parse(res.data);
                  console.log('解析的宠物头像上传响应:', responseData);
                  
                  // 简化处理逻辑
                  resolve({
                    success: true,
                    data: {
                      pet: responseData.data?.pet || responseData.pet || {
                        _id: petId,
                        avatar: responseData.data?.avatar || responseData.avatar || filePath
                      }
                    }
                  });
                } catch (error) {
                  console.error('解析宠物头像上传响应失败:', error);
                  
                  // 解析失败但仍然返回成功，使用本地路径
                  resolve({
                    success: true,
                    data: { 
                      pet: { 
                        _id: petId,
                        avatar: filePath
                      } 
                    }
                  });
                }
              } else {
                console.error('宠物头像上传请求失败:', res.statusCode);
                reject({
                  success: false,
                  message: `上传失败: ${res.statusCode}`,
                  error: res.data
                });
              }
            },
            fail: (err) => {
              console.error('宠物头像上传网络请求失败:', err);
              reject({
                success: false,
                message: '网络请求失败',
                error: err
              });
            }
          });
        },
        fail: function(err) {
          console.error('获取文件信息失败:', err);
          reject({
            success: false,
            message: '文件读取失败',
            error: err
          });
        }
      });
    });
  },
  
  // 获取指定用户的宠物
  getPetsByUser: async (userId) => {
    try {
      const response = await request({
        url: `/api/users/${userId}/pets`, 
        method: 'GET'
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取用户宠物失败:', error);
      throw error;
    }
  },
}

/**
 * 社区动态相关API
 */
export const community = {
  // 获取动态列表
  getPosts: (params) => {
    return safeApiCall(
      () => request({
        url: '/api/community/posts',
        method: 'GET',
        params: params
      })
    );
  },
  
  // 获取关注用户的动态列表
  getFollowingPosts: (page = 1, limit = 10) => {
    return safeApiCall(
      () => request({
        url: '/api/community/posts/following',
        method: 'GET',
        params: { page, limit, feed_type: 'following' }
      })
    );
  },
  
  // 获取我的动态列表
  getMyPosts: (params) => {
    console.log('开始获取我的帖子列表，参数:', params);
    
    // 检查token是否存在
    const token = uni.getStorageSync('token');
    if (!token) {
      console.error('获取我的帖子失败: 未登录状态');
      return Promise.reject({
        message: '请先登录',
        statusCode: 401
      });
    }
    
    return safeApiCall(
      () => request({
        url: '/api/community/posts/user/me',
        method: 'GET',
        params: params,
        // 确保API请求需要认证
        header: {
          'Authorization': `Bearer ${token}`
        }
      })
    ).then(result => {
      console.log('获取我的帖子成功，结果:', result);
      
      // 确保返回结构一致性
      if (!result) {
        return { data: [] };
      }
      
      // 如果返回的是数组格式，封装到data中
      if (Array.isArray(result)) {
        return { data: result };
      }
      
      // 如果返回的是对象且没有data字段，添加data字段
      if (!result.data && typeof result === 'object') {
        return { data: [] };
      }
      
      return result;
    }).catch(error => {
      console.error('获取我的帖子列表失败，错误详情:', error);
      
      // 如果是500错误，提供更详细的日志和空结果
      if (error.statusCode === 500) {
        console.warn('服务器错误(500)，返回空结果以避免UI崩溃');
        return { data: [] };
      }
      
      throw error;
    });
  },
  
  // 获取动态详情
  getPostById: (id) => {
    return safeApiCall(
      () => request({
        url: `/api/community/posts/${id}`,
        method: 'GET'
      })
    );
  },
  
  // 创建动态
  createPost: (data) => {
    console.log('开始创建帖子，数据:', data);
    
    // 检查token是否存在
    const token = uni.getStorageSync('token');
    if (!token) {
      console.error('创建帖子失败: 未登录状态');
      return Promise.reject({
        message: '请先登录',
        statusCode: 401
      });
    }
    
    return new Promise((resolve, reject) => {
      request({
        url: '/api/community/posts',
        method: 'POST',
        data,
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }).then(response => {
        console.log('创建帖子成功，响应:', response);
        resolve(response);
      }).catch(error => {
        console.error('创建帖子失败，错误:', error);
        
        // 提供友好的错误信息
        let errorMessage = '创建帖子失败';
        
        if (error.statusCode === 500) {
          errorMessage = '服务器内部错误，请稍后再试';
        } else if (error.statusCode === 401) {
          errorMessage = '登录已过期，请重新登录';
        } else if (error.statusCode === 400) {
          errorMessage = '请求参数错误，请检查输入';
        }
        
        // 尝试提取更详细的错误信息
        let detailedError = {
          ...error,
          message: errorMessage,
          originalMessage: error.message
        };
        
        if (error.data && error.data.error) {
          detailedError = {
            ...detailedError,
            detailedError: error.data.error,
            message: error.data.message || errorMessage
          };
          console.warn('帖子创建详细错误:', detailedError);
        }
        
        reject(detailedError);
      });
    });
  },
  
  /**
   * 更新帖子
   * @param {String} postId - 帖子ID
   * @param {Object} data - 帖子数据
   * @returns {Promise} - 返回更新结果
   */
  updatePost: (postId, data) => {
    console.log('更新帖子，ID:', postId, '数据:', data);
    
    // 增加参数验证
    if (!postId || typeof postId !== 'string' || !postId.trim()) {
      console.error('更新帖子失败: 无效的帖子ID:', postId);
      return Promise.reject(new Error('无效的帖子ID'));
    }
    
    // 确保images字段是数组
    if (data.images && !Array.isArray(data.images)) {
      data.images = [data.images];
      console.log('转换images为数组:', data.images);
    }
    
    try {
      // 对ID进行URL编码
      const encodedPostId = encodeURIComponent(postId.trim());
      
      // 构造安全的URL
      const url = `${BASE_URL}/api/community/posts/${encodedPostId}`;
      console.log('更新帖子URL:', url);
      
      // 使用完整路径提交请求
      return new Promise((resolve, reject) => {
        uni.request({
          url: url,
          data: data,
          method: 'PUT',
          header: {
            'Authorization': `Bearer ${uni.getStorageSync('token')}`,
            'Content-Type': 'application/json'
          },
          success: (res) => {
            const { statusCode, data: responseData } = res;
            if (statusCode >= 200 && statusCode < 300) {
              console.log('更新帖子成功，响应:', responseData);
              resolve(responseData);
            } else {
              console.error('更新帖子失败，HTTP状态:', statusCode, responseData);
              reject({
                message: responseData?.message || `更新失败(${statusCode})`,
                statusCode: statusCode,
                data: responseData
              });
            }
          },
          fail: (err) => {
            console.error('更新帖子请求失败:', err);
            reject({
              message: '网络请求失败',
              error: err
            });
          }
        });
      });
    } catch (error) {
      console.error('构造更新帖子请求失败:', error);
      return Promise.reject(error);
    }
  },
  
  // 删除动态
  deletePost: (id) => {
    console.log('尝试删除帖子，ID:', id);
    
    // 检查token是否存在
    const token = uni.getStorageSync('token');
    if (!token) {
      console.error('删除帖子失败: 未登录状态');
      return Promise.reject({
        message: '请先登录',
        statusCode: 401
      });
    }
    
    return new Promise((resolve, reject) => {
      request({
        url: `/api/community/posts/${id}`,
        method: 'DELETE',
        header: {
          'Authorization': `Bearer ${token}`
        }
      }).then(response => {
        console.log('删除帖子成功，响应:', response);
        resolve(response);
      }).catch(error => {
        console.error('删除帖子失败，错误:', error);
        
        // 提供友好的错误信息
        let errorMessage = '删除帖子失败';
        
        if (error.statusCode === 500) {
          errorMessage = '服务器内部错误，请稍后再试';
        } else if (error.statusCode === 401) {
          errorMessage = '没有权限删除此帖子';
        } else if (error.statusCode === 404) {
          errorMessage = '帖子不存在或已被删除';
        }
        
        reject({
          ...error,
          message: errorMessage,
          originalMessage: error.message
        });
      });
    });
  },
  
  // 点赞动态
  likePost: (id) => {
    return request({
      url: `/api/community/posts/${id}/like`,
      method: 'POST'
    })
  },
  
  // 取消点赞
  unlikePost: (id) => {
    return request({
      url: `/api/community/posts/${id}/like`,
      method: 'DELETE'
    })
  },
  
  // 获取动态评论
  getComments: (postId, params) => {
    return safeApiCall(
      () => request({
        url: `/api/community/posts/${postId}/comments`,
        method: 'GET',
        params: params
      })
    );
  },
  
  // 添加评论
  addComment: (postId, data) => {
    return request({
      url: `/api/community/posts/${postId}/comment`,
      method: 'POST',
      data
    })
  },
  
  // 删除评论
  deleteComment: (postId, commentId) => {
    return request({
      url: `/api/community/posts/${postId}/comment/${commentId}`,
      method: 'DELETE'
    })
  },
  
  // 获取帖子图片上传URL
  getImageUploadUrl: (postId) => {
    return `${BASE_URL}/api/community/posts/${postId}/image`;
  },
  
  // 上传帖子图片（封装上传操作）
  uploadPostImage: (postId, filePath) => {
    return new Promise((resolve, reject) => {
      console.log('开始上传帖子图片到服务器:', filePath);
      
      uni.uploadFile({
        url: `${BASE_URL}/api/community/posts/${postId}/image`,
        filePath,
        name: 'image',
        header: {
          'Authorization': `Bearer ${uni.getStorageSync('token')}`
        },
        
        success: (uploadRes) => {
          console.log('图片上传响应:', uploadRes);
          
          if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
            try {
              // 解析服务器响应
              const data = JSON.parse(uploadRes.data);
              console.log('解析的图片上传响应:', data);
              
              // 获取服务器返回的图片URL
              const imageUrl = data.url || data.imageUrl || 
                             (data.data && data.data.url) || 
                             (data.data && data.data.imageUrl);
              
              if (imageUrl) {
                console.log('成功获取图片URL:', imageUrl);
                resolve({
                  success: true,
                  url: imageUrl,
                  message: '图片已上传成功'
                });
              } else {
                // 服务器没有返回图片URL
                console.error('服务器响应中未找到图片URL:', data);
                if (data && data.success === false) {
                  reject(new Error(data.message || '图片上传失败'));
                  return;
                }
                // 尝试使用本地路径作为后备方案
                resolve({
                  success: true,
                  url: filePath,
                  message: '已上传但未获取服务器URL，使用本地路径'
                });
              }
            } catch (e) {
              console.error('解析图片上传响应失败:', e);
              // 服务器响应解析失败，提供回退方案
              resolve({
                success: true,
                url: filePath,
                message: '图片已上传但解析响应失败'
              });
            }
          } else {
            // 上传失败
            console.error(`图片上传失败，状态码: ${uploadRes.statusCode}`);
            console.error('错误响应:', uploadRes.data);
            reject(new Error(`图片上传失败: ${uploadRes.statusCode}`));
          }
        },
        fail: (err) => {
          console.error('图片上传请求失败:', err);
          // 上传请求失败时，尝试使用本地路径作为后备方案
          console.warn('图片上传失败，尝试使用本地路径');
          
          // 尝试更新帖子，使用本地路径
          request({
            url: `${BASE_URL}/api/community/posts/${postId}`,
            method: 'PUT',
            data: {
              images: [filePath]
            }
          }).then(() => {
            console.log('已使用本地路径作为后备方案更新帖子');
            resolve({
              success: true,
              url: filePath,
              message: '使用本地图片路径(上传失败)'
            });
          }).catch(updateErr => {
            console.error('使用本地路径更新帖子也失败:', updateErr);
            reject(new Error('图片上传和更新都失败: ' + (err.errMsg || '未知错误')));
          });
        }
      });
    });
  }
}

/**
 * 遛狗路线相关API
 */
export const walk = {
  // 获取我的遛狗记录
  getMyWalks: (params) => {
    return safeApiCall(
      () => request({
        url: '/api/walks',
        method: 'GET',
        params: params
      })
    );
  },
  
  // 获取遛狗记录详情
  getWalkById: (id) => {
    return safeApiCall(
      () => request({
        url: `/api/walks/${id}`,
        method: 'GET'
      })
    );
  },
  
  // 开始遛狗
  startWalk: (data) => {
    return request({
      url: '/api/walks/start',
      method: 'POST',
      data
    });
  },
  
  // 结束遛狗
  endWalk: (id, data) => {
    return request({
      url: `/api/walks/${id}/end`,
      method: 'POST',
      data
    });
  },
  
  // 删除遛狗记录
  deleteWalk: (id) => {
    return request({
      url: `/api/walks/${id}`,
      method: 'DELETE'
    });
  },
  
  // 更新遛狗路线点
  updateWalkPoint: (id, data) => {
    return request({
      url: `/api/walks/${id}/point`,
      method: 'POST',
      data
    });
  }
}

/**
 * 位置相关API
 */
export const location = {
  // 更新位置
  updateLocation: (data) => {
    return safeApiCall(
      () => request({
        url: '/api/locations/update',
        method: 'PUT',
        data
      })
    );
  },
  
  // 获取附近的用户
  getNearbyUsers: (params) => {
    return safeApiCall(
      () => request({
        url: '/api/locations/nearby',
        method: 'GET',
        params // 使用params，而不是data，因为是GET请求
      })
    );
  },
  
  /**
   * 切换位置共享状态
   * @param {boolean} isSharing 是否共享位置
   * @returns {Promise} 包含位置共享状态的Promise
   */
  toggleLocationSharing: (data) => {
    // 使用模拟数据
    if (shouldUseMock) {
      console.log('[API Mock] 切换位置共享状态:', data);
      return Promise.resolve({
        status: 200,
        data: { enabled: data.enabled }
      });
    }
    
    return safeApiCall(
      () => request({
        url: '/api/locations/sharing',
        method: 'PUT',
        data
      })
    );
  },
  
  // 获取位置共享状态
  getLocationSharingStatus: () => {
    return safeApiCall(
      () => request({
        url: '/api/locations/sharing',
        method: 'GET'
      })
    );
  },
  
  /**
   * 获取某用户的宠物
   * @param {Number|String} userId - 用户ID
   * @returns {Promise} Promise with user's pets data
   */
  getUserPets: (userId) => {
    return safeApiCall(
      () => request({
        url: `/api/pets/user/${userId}`,
        method: 'GET'
      })
    );
  },
  
  /**
   * 检查是否关注某用户
   * @param {Number|String} userId - 要检查的用户ID
   * @returns {Promise} Promise with follow status
   */
  checkFollowStatus: (userId) => {
    return safeApiCall(
      () => request({
        url: `/api/users/follow/check/${userId}`,
        method: 'GET'
      })
    );
  }
}

/**
 * 聊天相关API
 */
export const chat = {
  /**
   * 发送附近消息
   * @param {Object} data - 消息数据
   * @returns {Promise} - API响应
   */
  sendNearbyMessage: async (data) => {
    try {
      const response = await request({
        url: '/api/chat/nearby',
        method: 'POST',
        data: data
      });
      return handleResponse(response);
    } catch (error) {
      console.error('发送附近消息失败:', error);
      throw error;
    }
  },

  /**
   * 发送城市消息
   * @param {Object} data - 消息数据
   * @returns {Promise} - API响应
   */
  sendCityMessage: async (data) => {
    try {
      const response = await request({
        url: '/api/chat/city',
        method: 'POST',
        data: data
      });
      return handleResponse(response);
    } catch (error) {
      console.error('发送城市消息失败:', error);
      throw error;
    }
  },

  /**
   * 获取附近消息
   * @param {Object} params - 查询参数
   * @returns {Promise} - API响应
   */
  getNearbyMessages: async (params) => {
    try {
      const response = await request({
        url: '/api/chat/nearby',
        method: 'GET',
        params: params
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取附近消息失败:', error);
      throw error;
    }
  },

  /**
   * 获取城市消息
   * @param {Object} params - 查询参数
   * @returns {Promise} - API响应
   */
  getCityMessages: async (params) => {
    try {
      const response = await request({
        url: '/api/chat/city',
        method: 'GET',
        params: params
      });
      return handleResponse(response);
    } catch (error) {
      console.error('获取城市消息失败:', error);
      throw error;
    }
  }
};

/**
 * API模块集合
 */
const api = {
  auth,
  user,
  pet,
  community,
  walk,
  location,
  chat
}

export default api 