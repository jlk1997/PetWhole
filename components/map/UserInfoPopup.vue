<template>
  <view class="user-info-popup" :class="{ 'active': visible }">
    <view class="popup-content">
      <view class="close-btn" @click="handleClose">×</view>
      
      <!-- 用户信息 -->
      <view class="user-info">
        <image class="user-avatar" :src="formatImageUrl(user?.avatar)" mode="aspectFill" @error="handleImageError"></image>
        <view class="user-details">
          <text class="username">{{user?.nickname || user?.username || '用户'}}</text>
          <text class="status" v-if="user && user.isWalking">正在遛狗</text>
          <text class="status" v-else>在线</text>
        </view>
      </view>
      
      <!-- 宠物信息 - 当前宠物 -->
      <view class="pet-info" v-if="user && user.currentPet">
        <text class="section-title">当前宠物</text>
        <view class="pet-card">
          <image class="pet-avatar" :src="formatImageUrl(user.currentPet?.avatar)" mode="aspectFill" @error="handleImageError"></image>
          <view class="pet-details">
            <text class="pet-name">{{user.currentPet?.name || '宠物'}}</text>
            <text class="pet-breed">{{user.currentPet?.breed || '未知品种'}}</text>
            <text class="pet-age">{{formatPetAge(user.currentPet?.birthdate)}}</text>
          </view>
        </view>
      </view>
      
      <!-- 宠物列表 -->
      <view class="pet-list" v-if="effectivePets.length > 0">
        <text class="section-title">{{isCurrentUser ? '我的宠物' : '所有宠物'}}</text>
        
        <!-- 宠物卡片列表 -->
        <scroll-view class="pet-scroll" scroll-x>
          <view class="pet-cards">
            <view 
              v-for="(pet, index) in effectivePets" 
              :key="index" 
              class="pet-card-small"
              :class="{'active': isActivePet(pet)}"
              @click="selectPet(pet)"
            >
              <image class="pet-avatar-small" :src="formatImageUrl(pet?.avatar)" mode="aspectFill"></image>
              <text class="pet-name-small">{{pet?.name || '宠物'}}</text>
            </view>
          </view>
        </scroll-view>
        
        <!-- 选中宠物的详细信息 -->
        <view class="pet-detail-card" v-if="selectedPet">
          <view class="pet-detail-header">
            <image class="pet-detail-avatar" :src="formatImageUrl(selectedPet?.avatar)" mode="aspectFill"></image>
            <view class="pet-detail-info">
              <text class="pet-detail-name">{{selectedPet?.name || '宠物'}}</text>
              <text class="pet-detail-breed">{{selectedPet?.breed || '未知品种'}}</text>
            </view>
          </view>
          
          <view class="pet-attributes">
            <view class="pet-attribute">
              <text class="attribute-label">年龄</text>
              <text class="attribute-value">{{formatPetAge(selectedPet?.birthdate) || '未知'}}</text>
            </view>
            <view class="pet-attribute" v-if="selectedPet?.weight">
              <text class="attribute-label">体重</text>
              <text class="attribute-value">{{selectedPet?.weight}}kg</text>
            </view>
            <view class="pet-attribute" v-if="selectedPet?.gender">
              <text class="attribute-label">性别</text>
              <text class="attribute-value">{{formatPetGender(selectedPet?.gender)}}</text>
            </view>
            <view class="pet-attribute" v-if="selectedPet?.socialIntention">
              <text class="attribute-label">社交意向</text>
              <text class="attribute-value">{{formatSocialIntention(selectedPet?.socialIntention)}}</text>
            </view>
            <view class="pet-attribute" v-if="selectedPet?.matingStatus">
              <text class="attribute-label">求偶状态</text>
              <text class="attribute-value">{{formatMatingStatus(selectedPet?.matingStatus)}}</text>
            </view>
          </view>
          
          <!-- 日常照片展示 -->
          <view class="pet-daily-photos" v-if="selectedPet?.dailyPhotos && selectedPet.dailyPhotos.length > 0">
            <text class="daily-photos-title">日常照片</text>
            <scroll-view class="photos-scroll" scroll-x>
              <view class="photos-container">
                <view 
                  v-for="(photo, index) in selectedPet.dailyPhotos" 
                  :key="index" 
                  class="daily-photo-item"
                  @click="previewPhoto(photo.url)"
                >
                  <image 
                    class="daily-photo" 
                    :src="formatImageUrl(photo.url)" 
                    mode="aspectFill"
                  ></image>
                </view>
              </view>
            </scroll-view>
          </view>
          
          <view class="pet-description" v-if="selectedPet?.description">
            <text class="description-title">个性介绍</text>
            <text class="description-text">{{selectedPet?.description}}</text>
          </view>
        </view>
      </view>
      
      <!-- 没有宠物时的提示 -->
      <view class="no-pets-container" v-else-if="shouldShowNoPets">
        <image class="no-pets-image" src="/static/images/no-pets.png" mode="aspectFit"></image>
        <text class="no-pets-text">{{isCurrentUser ? '您还没有添加宠物信息' : '该用户还没有添加宠物信息'}}</text>
        <button 
          v-if="isCurrentUser" 
          class="add-pet-btn" 
          @click="navigateToAddPet"
        >
          添加宠物信息
        </button>
      </view>
      
      <!-- 步行统计 -->
      <view class="walk-stats" v-if="user && user.isWalking && user.walkStats">
        <text class="section-title">遛狗数据</text>
        <view class="stats-row">
          <view class="stat-item">
            <text class="stat-value">{{user.walkStats?.distance || 0}}km</text>
            <text class="stat-label">距离</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{user.walkStats?.duration || '00:00'}}</text>
            <text class="stat-label">时长</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{user.walkStats?.speed || 0}}km/h</text>
            <text class="stat-label">配速</text>
          </view>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="action-buttons" v-if="!isCurrentUser">
        <button class="action-btn follow-btn" :class="{'follow-active': userIsFollowed}" @click="handleFollow">
          {{userIsFollowed ? '已关注' : '关注'}}
        </button>
        <button class="action-btn message-btn" @click="handleMessage">
          发信息
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'UserInfoPopup',
  props: {
    // 用户信息
    user: {
      type: Object,
      default: () => ({})
    },
    // 宠物列表
    pets: {
      type: Array,
      default: () => []
    },
    // 是否已关注
    isFollowing: {
      type: Boolean,
      default: false
    },
    // 是否可见
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      selectedPet: null,
      combinedPets: [], // 用于合并user.pets和传入的pets
      userIsFollowed: false
    }
  },
  computed: {
    // 计算合并后的宠物列表，优先使用user.pets，如果不存在则使用props.pets
    effectivePets() {
      console.log('计算有效宠物列表:', { 
        userPets: this.user?.pets || [], 
        propsPets: this.pets || [] 
      });
      
      // 如果user.pets存在且有数据，优先使用它
      if (this.user && this.user.pets && this.user.pets.length > 0) {
        return this.user.pets;
      }
      
      // 否则使用从props传入的pets
      return this.pets || [];
    },
    // 计算是否显示"没有宠物"提示
    shouldShowNoPets() {
      const hasPets = this.effectivePets.length > 0;
      console.log('是否应该显示没有宠物提示:', !hasPets);
      return !hasPets;
    },
    // 用户是否是当前登录用户
    isCurrentUser() {
      return this.user && (this.user.isCurrentUser === true);
    }
  },
  watch: {
    // 当用户数据变化时，重置选中的宠物
    user: {
      handler(newUser) {
        console.log('用户数据变化:', newUser);
        this.updateSelectedPet();
        
        // 在用户数据变化时，不要直接覆盖关注状态
        // 而是通过syncFollowStatus方法统一处理，保持优先级一致
        if (newUser) {
          this.syncFollowStatus();
        }
      },
      immediate: true,
      deep: true
    },
    // 当宠物列表变化时，更新选中的宠物
    pets: {
      handler(newPets) {
        console.log('传入的宠物列表变化:', newPets);
        this.updateSelectedPet();
      },
      immediate: true
    },
    // 监听合并后的有效宠物列表
    effectivePets: {
      handler(newPets) {
        console.log('有效宠物列表变化:', newPets);
        if (newPets && newPets.length > 0 && !this.selectedPet) {
          this.selectedPet = newPets[0];
        }
      }
    },
    // 当弹窗显示时，强制更新关注状态
    visible(newVisible) {
      if (newVisible) {
        console.log('弹窗显示，检查宠物选择状态和关注状态');
        this.updateSelectedPet();
        // 确保关注状态与props和用户对象同步
        this.syncFollowStatus();
      }
    },
    // 监听是否关注状态变化
    isFollowing: {
      handler(newValue) {
        console.log('props中的关注状态变化:', newValue);
        // 优先使用传入的isFollowing，其次检查用户对象的isFollowing属性
        this.userIsFollowed = newValue;
      },
      immediate: true
    }
  },
  mounted() {
    console.log('UserInfoPopup mounted:', {
      user: this.user,
      pets: this.pets,
      visible: this.visible,
      isFollowing: this.isFollowing
    });
    // 确保初始化时关注状态正确
    this.syncFollowStatus();
  },
  methods: {
    // 同步关注状态，综合考虑props和用户对象中的状态
    syncFollowStatus() {
      console.log('同步关注状态');
      
      // 优先使用props中传入的isFollowing值
      // 这样可以确保从不同入口（如社区、关注列表）打开时关注状态的一致性
      if (this.isFollowing !== undefined) {
        console.log('使用props中传入的关注状态:', this.isFollowing);
        this.userIsFollowed = this.isFollowing;
        return;
      }
      
      // 其次才使用用户对象中的isFollowing属性
      if (this.user && this.user.isFollowing !== undefined) {
        console.log('从用户对象中获取关注状态:', this.user.isFollowing);
        this.userIsFollowed = this.user.isFollowing;
        return;
      }
      
      // 都没有时，默认为未关注
      console.log('没有找到关注状态信息，默认为未关注');
      this.userIsFollowed = false;
    },
    
    // 统一更新选中的宠物
    updateSelectedPet() {
      const pets = this.effectivePets;
      console.log('更新选中宠物, 宠物列表:', pets);
      
      if (pets && pets.length > 0) {
        // 优先使用currentPet，如果没有则选择第一个宠物
        this.selectedPet = (this.user && this.user.currentPet) || pets[0];
        console.log('设置选中宠物:', this.selectedPet);
      } else {
        console.log('没有找到宠物数据');
        this.selectedPet = null;
      }
    },
    // 关闭弹窗
    handleClose() {
      this.$emit('close')
    },
    
    // 关注用户
    handleFollow() {
      // 立即更新UI状态，提供即时反馈
      this.userIsFollowed = !this.userIsFollowed;
      
      // 触发关注事件，传递用户对象
      this.$emit('follow', this.user);
    },
    
    // 处理发送消息按钮点击
    handleMessage() {
      this.$emit('message', this.user);
    },
    
    // 选择宠物
    selectPet(pet) {
      this.selectedPet = pet;
    },
    
    // 检查是否是当前选中的宠物
    isActivePet(pet) {
      return this.selectedPet && pet && this.selectedPet.name === pet.name;
    },
    
    // 格式化宠物性别
    formatPetGender(gender) {
      if (!gender) return '未知';
      
      const genderMap = {
        male: '公',
        female: '母',
        unknown: '未知'
      };
      
      return genderMap[gender] || gender;
    },
    
    // 格式化宠物年龄
    formatPetAge(birthdate) {
      // 首先检查传入参数是否是直接的年龄值
      if (typeof birthdate === 'number') {
        // 如果直接是年龄数字
        return `${birthdate}岁`;
      }
      
      // 如果是字符串年龄（例如'2岁'）
      if (typeof birthdate === 'string' && (birthdate.includes('岁') || /^\d+$/.test(birthdate))) {
        if (/^\d+$/.test(birthdate)) {
          return `${birthdate}岁`;
        }
        return birthdate;
      }
      
      // 获取宠物对象中的age字段
      if (this.selectedPet && this.selectedPet.age !== undefined) {
        if (typeof this.selectedPet.age === 'number') {
          return `${this.selectedPet.age}岁`;
        } else if (typeof this.selectedPet.age === 'string') {
          return this.selectedPet.age.includes('岁') ? this.selectedPet.age : `${this.selectedPet.age}岁`;
        }
      }
      
      // 如果没有有效的生日日期，返回未知年龄
      if (!birthdate) return '未知年龄';
      
      try {
        const birth = new Date(birthdate);
        const now = new Date();
        
        // 检查日期是否有效
        if (isNaN(birth.getTime())) {
          return '未知年龄';
        }
      
      // 计算年龄（月）
        const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
      
      if (months < 12) {
          return `${months}个月`;
      } else {
          const years = Math.floor(months / 12);
          const remainingMonths = months % 12;
          return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`;
        }
      } catch (e) {
        console.error('格式化宠物年龄出错:', e);
        return '未知年龄';
      }
    },
    
    // 导航到添加宠物页面
    navigateToAddPet() {
      uni.switchTab({
        url: '/pages/index/index'
      });
      this.handleClose();
    },
    
    // 处理图片加载错误
    handleImageError(e) {
      console.warn('图片加载失败:', e.target);
      e.target.src = '/static/images/default-avatar.png';
    },
    
    // 格式化图片URL
    formatImageUrl(url) {
      if (!url) {
        return '/static/images/default-avatar.png';
      }
      
      // 如果已经是完整URL，直接返回
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/static/')) {
        return url;
      }
      
      // 如果是相对路径，补充基础URL
      if (url.startsWith('/uploads')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
        return BASE_URL + url;
      }
      
      // 如果是uploads路径但没有前导斜杠
      if (url.startsWith('uploads/')) {
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
        return BASE_URL + '/' + url;
      }
      
      // 其他情况，使用默认头像
      return '/static/images/default-avatar.png';
    },
    
    // 格式化社交意向
    formatSocialIntention(intention) {
      const intentionMap = {
        'strong': '强烈',
        'medium': '较强',
        'mild': '平淡'
      };
      return intentionMap[intention] || '未知';
    },
    
    // 格式化求偶状态
    formatMatingStatus(status) {
      const statusMap = {
        'single': '单身待求偶',
        'paired': '有配偶',
        'notLooking': '暂不找配偶'
      };
      return statusMap[status] || '未知';
    },
    
    // 预览照片
    previewPhoto(url) {
      const formattedUrl = this.formatImageUrl(url);
      uni.previewImage({
        urls: [formattedUrl],
        current: formattedUrl
      });
    }
  }
}
</script>

<style>
.user-info-popup {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease-in-out;
}

.user-info-popup.active {
  opacity: 1;
  pointer-events: auto;
}

.popup-content {
  width: 85%;
  max-width: 600rpx;
  max-height: 85vh;
  background-color: #fff;
  border-radius: 30rpx;
  padding: 40rpx 30rpx;
  position: relative;
  transform: scale(0.9);
  transition: transform 0.3s ease-in-out;
  overflow-y: auto;
}

.user-info-popup.active .popup-content {
  transform: scale(1);
}

.close-btn {
  position: absolute;
  top: 20rpx;
  right: 30rpx;
  font-size: 48rpx;
  color: #999;
  z-index: 10;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 20rpx;
  border: 4rpx solid #f0f0f0;
}

.user-details {
  flex: 1;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
  display: block;
}

.status {
  font-size: 24rpx;
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.1);
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  display: inline-block;
}

.section-title {
  font-size: 28rpx;
  color: #666;
  margin: 20rpx 0 10rpx;
  display: block;
}

.pet-card {
  display: flex;
  align-items: center;
  background-color: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.pet-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  margin-right: 20rpx;
  border: 4rpx solid #fff;
}

.pet-details {
  flex: 1;
}

.pet-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.pet-breed, .pet-age {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 5rpx;
}

/* 宠物列表样式 */
.pet-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 20rpx;
}

.pet-cards {
  display: inline-flex;
  padding: 10rpx 0;
}

.pet-card-small {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20rpx;
  padding: 10rpx;
  border-radius: 12rpx;
  background-color: #f8f8f8;
  width: 120rpx;
}

.pet-card-small.active {
  background-color: #e0f0e9;
  border: 2rpx solid #3B9E82;
}

.pet-avatar-small {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin-bottom: 10rpx;
}

.pet-name-small {
  font-size: 22rpx;
  color: #333;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

/* 宠物详情卡片 */
.pet-detail-card {
  background-color: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.pet-detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 15rpx;
}

.pet-detail-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  margin-right: 20rpx;
  border: 4rpx solid #fff;
}

.pet-detail-info {
  flex: 1;
}

.pet-detail-name {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.pet-detail-breed {
  font-size: 26rpx;
  color: #666;
  display: block;
}

.pet-attributes {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 15rpx;
}

.pet-attribute {
  flex: 1;
  min-width: 33%;
  padding: 10rpx;
}

.attribute-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 5rpx;
}

.attribute-value {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.pet-description {
  margin-top: 20rpx;
  padding: 16rpx;
  background-color: #f9f9f9;
  border-radius: 12rpx;
}

.description-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
  font-weight: bold;
}

.description-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}

.walk-stats {
  margin-bottom: 30rpx;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  background-color: #f8f8f8;
  border-radius: 16rpx;
  padding: 20rpx;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 5rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #666;
}

.action-buttons {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
}

.action-btn {
  width: 80%;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  text-align: center;
}

.follow-btn {
  background-color: #3B9E82;
  color: #fff;
}

.follow-btn.follow-active {
  background-color: #f0f0f0;
  color: #3B9E82;
  border: 1px solid #3B9E82;
}

.message-btn {
  background-color: #007AFF;
  color: #fff;
  margin-left: 20rpx;
}

.no-pets-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 40rpx;
}

.no-pets-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 20rpx;
}

.no-pets-text {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.add-pet-btn {
  background-color: #007AFF;
  color: #fff;
  padding: 10rpx 20rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
}

/* 日常照片样式 */
.pet-daily-photos {
  margin-top: 20rpx;
}

.daily-photos-title {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.photos-scroll {
  width: 100%;
  white-space: nowrap;
}

.photos-container {
  display: inline-flex;
  padding: 10rpx 0;
}

.daily-photo-item {
  margin-right: 16rpx;
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  overflow: hidden;
}

.daily-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style> 