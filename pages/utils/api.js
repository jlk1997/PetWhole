// 简单API实现
const api = {
  user: {
    follow: async (userId) => {
      console.log('关注用户', userId);
      return { success: true };
    },
    unfollow: async (userId) => {
      console.log('取消关注用户', userId);
      return { success: true };
    }
  },
  location: {
    getNearbyUsers: async (params) => {
      console.log('获取附近用户', params);
      return { success: true, data: [] };
    },
    saveWalkRecord: async (data) => {
      console.log('保存遛狗记录', data);
      return { success: true, data: { _id: 'test123' } };
    }
  }
};

export default api; 