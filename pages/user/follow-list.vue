async getFollowList() {
  uni.showLoading({
    title: this.listType === 'following' ? '加载关注列表中' : '加载粉丝列表中'
  });
  
  try {
    const userId = this.userId || 'me';
    
    if (this.listType === 'following') {
      console.log('获取关注列表', userId);
      this.followList = await api.user.getFollowing(userId);
      console.log('关注列表结果', this.followList);
    } else {
      console.log('获取粉丝列表', userId);
      this.followList = await api.user.getFollowers(userId);
      console.log('粉丝列表结果', this.followList);
    }
    
    if (Array.isArray(this.followList) && this.followList.length === 0) {
      this.empty = true;
    } else {
      this.empty = false;
    }
  } catch (error) {
    console.error('获取列表失败', error);
    
    // 处理不同的错误情况
    if (error.statusCode === 401) {
      uni.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 2000
      });
      
      setTimeout(() => {
        uni.redirectTo({
          url: '/pages/login/login'
        });
      }, 2000);
    } else {
      uni.showToast({
        title: '获取列表失败，请稍后再试',
        icon: 'none',
        duration: 2000
      });
      
      // 使用模拟数据
      this.followList = this.listType === 'following' 
        ? [
            {
              _id: 'mock_user_1',
              username: '模拟用户1',
              nickname: '模拟用户1',
              avatar: '/static/images/default-avatar.png',
              bio: '这是一个模拟的关注用户',
              isFollowing: true
            }
          ]
        : [
            {
              _id: 'mock_follower_1',
              username: '模拟粉丝1',
              nickname: '模拟粉丝1',
              avatar: '/static/images/default-avatar.png',
              bio: '这是一个模拟的粉丝用户',
              isFollowing: false
            }
          ];
      
      this.empty = false;
    }
  } finally {
    uni.hideLoading();
  }
}, 