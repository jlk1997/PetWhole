import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: '',
    userInfo: null,
    isLoggedIn: false,
    userId: '',
    nickname: '游客',
    avatar: '/static/images/default-avatar.png',
  }),
  
  actions: {
    updateLocation(location) {
      console.log('更新位置', location);
      // 实际实现会发送位置到后端
    }
  }
}); 