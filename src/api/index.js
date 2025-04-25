/**
 * API模块入口 - 包含所有API的Mock实现
 */

// User API mock implementation
const user = {
  login: (credentials) => Promise.resolve({ 
    data: { 
      token: 'test-token', 
      _id: '123', 
      username: credentials?.username || 'test-user',
      nickname: '测试用户',
      avatar: '/static/images/default-avatar.png'
    }
  }),
  register: (data) => Promise.resolve({ 
    data: { 
      token: 'test-token', 
      _id: '123', 
      username: data?.username || 'test-user',
      email: data?.email || 'test@example.com',
      nickname: data?.nickname || '测试用户',
      avatar: '/static/images/default-avatar.png'
    }
  }),
  getUserInfo: () => Promise.resolve({ 
    data: { 
      _id: '123', 
      username: 'test-user', 
      email: 'test@example.com',
      nickname: '测试用户',
      avatar: '/static/images/default-avatar.png',
      following: [],
      followers: []
    }
  }),
  updateUserInfo: (data) => Promise.resolve({ data }),
  logout: () => Promise.resolve({}),
  getUserStats: () => Promise.resolve({ 
    data: { 
      followingCount: 0, 
      followersCount: 0, 
      petsCount: 1, 
      postsCount: 0 
    }
  }),
  getFollowing: () => Promise.resolve({ data: [] }),
  getFollowers: () => Promise.resolve({ data: [] }),
  followUser: () => Promise.resolve({}),
  unfollowUser: () => Promise.resolve({}),
  uploadAvatar: () => Promise.resolve({ data: { avatarUrl: '/static/images/default-avatar.png' } }),
  changePassword: () => Promise.resolve({})
};

// Pet API mock implementation
const pet = {
  getPets: () => Promise.resolve({ 
    data: [
      { 
        _id: '1', 
        name: '旺财', 
        breed: '拉布拉多', 
        age: 3,
        avatar: '/static/images/default-pet.png'
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
        avatar: '/static/images/default-pet.png'
      }
    ] 
  }),
  createPet: (petData) => Promise.resolve({ 
    data: { 
      _id: '1', 
      ...petData,
      avatar: '/static/images/default-pet.png'
    } 
  }),
  updatePet: (id, petData) => Promise.resolve({ 
    data: { 
      _id: id, 
      ...petData 
    } 
  }),
  deletePet: () => Promise.resolve({}),
  getPetById: (id) => Promise.resolve({ 
    data: { 
      _id: id, 
      name: '旺财', 
      breed: '拉布拉多', 
      age: 3,
      avatar: '/static/images/default-pet.png'
    } 
  }),
  uploadPetAvatar: () => Promise.resolve({ data: { avatar: '/static/images/default-pet.png' } })
};

// Post API mock implementation
const post = {
  getPosts: () => Promise.resolve({ 
    data: [
      {
        id: 1,
        username: '狗狗爱好者',
        userAvatar: '/static/images/default-avatar.png',
        time: '1小时前',
        content: '今天和汪汪出去玩，好开心！',
        likes: 12,
        comments: 3
      },
      {
        id: 2,
        username: '宠物达人',
        userAvatar: '/static/images/default-avatar.png',
        time: '2小时前',
        content: '分享一下我家狗狗的日常~',
        likes: 24,
        comments: 8
      }
    ]
  }),
  createPost: (data) => Promise.resolve({ 
    data: { 
      id: Date.now(), 
      ...data 
    } 
  }),
  getPostById: (id) => Promise.resolve({ 
    data: { 
      id, 
      username: '宠物达人',
      userAvatar: '/static/images/default-avatar.png',
      time: '2小时前',
      content: '分享一下我家狗狗的日常~',
      likes: 24,
      comments: 8
    } 
  }),
  likePost: () => Promise.resolve({}),
  unlikePost: () => Promise.resolve({}),
  commentOnPost: () => Promise.resolve({})
};

// Walk API mock implementation
const walk = {
  createWalkRecord: (data) => Promise.resolve({ data: { _id: Date.now(), ...data } }),
  getWalkRecords: () => Promise.resolve({ data: [] }),
  getWalkRecordById: (id) => Promise.resolve({ data: { _id: id } }),
  updateWalkRecord: (id, data) => Promise.resolve({ data: { _id: id, ...data } }),
  deleteWalkRecord: () => Promise.resolve({}),
  uploadWalkPhoto: () => Promise.resolve({ data: { photoUrl: '/static/images/default-photo.png' } }),
  getUserWalkStats: () => Promise.resolve({ 
    data: { 
      totalDistance: 0, 
      totalDuration: 0, 
      weeklyDistance: 0, 
      monthlyDistance: 0 
    } 
  }),
  getNearbyWalks: () => Promise.resolve({ data: [] })
};

// Location API mock implementation
const location = {
  updateLocation: () => Promise.resolve({}),
  getNearbyUsers: () => Promise.resolve({ 
    data: [], 
    success: true 
  }),
  saveWalkRecord: (data) => Promise.resolve({ 
    data: { _id: Date.now(), ...data },
    success: true
  })
};

// Auth API mock implementation
const auth = {
  login: user.login,
  register: user.register,
  refreshToken: () => Promise.resolve({ 
    data: { 
      token: 'new-test-token' 
    } 
  }),
  forgotPassword: () => Promise.resolve({}),
  resetPassword: () => Promise.resolve({})
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