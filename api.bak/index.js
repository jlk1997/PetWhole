/**
 * API模块入口 - 包含所有API的Mock实现
 */

// 直接在这里提供Mock实现，不再导入外部模块
// 用户相关API模拟
const user = {
  login: (credentials) => Promise.resolve({ 
    data: { 
      token: 'test-token', 
      _id: '123', 
      username: credentials?.username || 'test-user',
      nickname: '测试用户',
      avatar: '/static/images/default-user-avatar.png'
    }
  }),
  register: () => Promise.resolve({ 
    data: { 
      token: 'test-token', 
      _id: '123', 
      username: 'test-user',
      email: 'test@example.com',
      nickname: '测试用户',
      avatar: '/static/images/default-user-avatar.png'
    }
  }),
  getUserInfo: () => Promise.resolve({ 
    data: { 
      _id: '123', 
      username: 'test-user', 
      email: 'test@example.com',
      nickname: '测试用户',
      avatar: '/static/images/default-user-avatar.png',
      following: [],
      followers: []
    }
  }),
  updateUserInfo: (data) => Promise.resolve({ data }),
  logout: () => Promise.resolve({}),
  getUserStats: () => Promise.resolve({ 
    data: { 
      walkCount: 12, 
      totalDistance: 25.5, 
      following: 8, 
      followers: 12,
      petsCount: 1,
      postsCount: 3
    }
  })
};

// 宠物相关API模拟
const pet = {
  getPets: () => Promise.resolve({ 
    data: [
      { 
        _id: '1', 
        name: '旺财', 
        breed: '拉布拉多', 
        age: 3,
        avatar: '/static/images/default-pet-avatar.png'
      }
    ] 
  }),
  getMyPets: () => Promise.resolve({ 
    data: [
      { 
        _id: '1', 
        name: '旺财', 
        breed: '拉布拉多', 
        age: 3,
        avatar: '/static/images/default-pet-avatar.png'
      }
    ] 
  }),
  createPet: (petData) => Promise.resolve({ 
    data: { 
      _id: '1', 
      ...petData,
      avatar: '/static/images/default-pet-avatar.png'
    } 
  })
};

// 社区帖子相关API模拟
const post = {
  getPosts: () => Promise.resolve({ 
    data: [
      {
        id: 1,
        username: '狗狗爱好者',
        userAvatar: '/static/images/default-user-avatar.png',
        time: '1小时前',
        content: '今天和汪汪出去玩，好开心！',
        likes: 12,
        comments: 3
      },
      {
        id: 2,
        username: '宠物达人',
        userAvatar: '/static/images/default-user-avatar.png',
        time: '2小时前',
        content: '分享一下我家狗狗的日常~',
        likes: 24,
        comments: 8
      }
    ]
  })
};

// 遛狗记录相关API模拟
const walk = {
  getWalkRecords: () => Promise.resolve({ data: [] }),
  createWalkRecord: (data) => Promise.resolve({ data: { _id: Date.now(), ...data } }),
  getUserWalkStats: () => Promise.resolve({ 
    data: { 
      totalDistance: 0, 
      totalDuration: 0, 
      weeklyDistance: 0, 
      monthlyDistance: 0 
    } 
  })
};

// 位置相关API模拟
const location = {
  updateLocation: () => Promise.resolve({}),
  getNearbyUsers: () => Promise.resolve({ 
    data: [], 
    success: true 
  })
};

// 认证相关API模拟
const auth = {
  login: user.login,
  register: user.register
};

// 导出API模块
const api = {
  user,
  pet,
  post,
  walk,
  location,
  auth
};

export {
  user as userApi,
  pet as petApi,
  walk as walkApi,
  post as postApi,
  location as locationApi,
  auth as authApi
};

export default api; 