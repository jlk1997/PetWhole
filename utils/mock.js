/**
 * 模拟数据，用于在后端API不可用时进行开发
 */

/**
 * 用户数据
 */
export const users = [
  {
    _id: '1',
    username: 'test',
    email: 'test@example.com',
    nickname: '测试用户',
    avatar: '/static/images/default-avatar.png',
    bio: '这是一个测试用户',
    following: 0,
    followers: 0,
    isWalking: false
  }
];

/**
 * 宠物数据
 */
export const pets = [
  {
    _id: '1',
    name: '小白',
    breed: '金毛',
    gender: 'male',
    age: 3,
    weight: 25.5,
    avatar: '/static/images/default-pet.png',
    userId: '1'
  },
  {
    _id: '2',
    name: '小黑',
    breed: '拉布拉多',
    gender: 'female',
    age: 2,
    weight: 20,
    avatar: '/static/images/default-pet.png',
    userId: '1'
  }
];

/**
 * 社区动态数据
 */
export const posts = [
  {
    _id: '1',
    content: '今天和小白一起去公园玩了，阳光真好！',
    images: ['/static/images/default-post.png'],
    userId: '1',
    user: {
      _id: '1',
      nickname: '测试用户',
      avatar: '/static/images/default-avatar.png'
    },
    likes: 5,
    comments: 2,
    createdAt: '2023-04-15T10:30:00.000Z'
  }
];

/**
 * 评论数据
 */
export const comments = [
  {
    _id: '1',
    content: '真可爱的狗狗！',
    postId: '1',
    userId: '2',
    user: {
      _id: '2',
      nickname: '其他用户',
      avatar: '/static/images/default-avatar.png'
    },
    createdAt: '2023-04-15T11:20:00.000Z'
  }
];

/**
 * 遛狗记录数据
 */
export const walks = [
  {
    _id: '1',
    userId: '1',
    petId: '1',
    pet: {
      _id: '1',
      name: '小白',
      avatar: '/static/images/default-pet.png'
    },
    distance: 2.5,
    duration: 45, // 分钟
    startTime: '2023-04-14T15:00:00.000Z',
    endTime: '2023-04-14T15:45:00.000Z',
    route: [
      {
        latitude: 39.9042,
        longitude: 116.4074,
        timestamp: '2023-04-14T15:00:00.000Z'
      },
      {
        latitude: 39.9043,
        longitude: 116.4080,
        timestamp: '2023-04-14T15:15:00.000Z'
      },
      {
        latitude: 39.9050,
        longitude: 116.4085,
        timestamp: '2023-04-14T15:30:00.000Z'
      },
      {
        latitude: 39.9042,
        longitude: 116.4074,
        timestamp: '2023-04-14T15:45:00.000Z'
      }
    ]
  }
];

/**
 * 用户统计数据
 */
export const userStats = {
  walkCount: 10,
  totalDistance: 25.5,
  following: 5,
  followers: 8
};

/**
 * 模拟认证响应
 */
export const authResponse = {
  token: 'mock-token-12345',
  user: users[0]
};

/**
 * 完整Mock数据集合
 */
const mockData = {
  users,
  pets,
  posts,
  comments,
  walks,
  userStats,
  authResponse
};

export default mockData; 