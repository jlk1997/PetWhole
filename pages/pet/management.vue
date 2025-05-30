<template>
  <view class="management-container">
    <view class="header">
      <text class="title">宠物管理</text>
      <view class="add-btn" @click="navToAdd">
        <text class="add-icon">+</text>
        <text class="add-text">添加宠物</text>
      </view>
    </view>
    
    <view class="empty-pets" v-if="pets.length === 0">
      <image class="empty-image" src="/static/images/empty-pets.png" mode="aspectFit"></image>
      <text class="empty-text">您还没有添加宠物</text>
      <button class="add-pet-btn" @click="navToAdd">添加宠物</button>
    </view>
    
    <view class="pet-list" v-else>
      <view class="pet-item" v-for="pet in pets" :key="pet._id" @click="navToEdit(pet._id || pet.id)">
        <view class="pet-content">
          <image class="pet-avatar" :src="formatImageUrl(pet.avatar)" mode="aspectFill"></image>
          <view class="pet-info">
            <view class="pet-name-row">
              <text class="pet-name">{{ pet.name }}</text>
              <text class="pet-gender" :class="pet.gender">{{ pet.gender === 'male' ? '♂' : '♀' }}</text>
            </view>
            <text class="pet-breed">{{ pet.breed }}</text>
            <text class="pet-age">{{ calculatePetAge(pet.birthdate) }}</text>
          </view>
          <view class="default-tag" v-if="pet.isDefault">默认</view>
          <view class="edit-indicator">
            <text class="edit-text">编辑</text>
            <text class="edit-arrow">></text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref, onMounted } from 'vue';
import { usePetStore } from '@/store/petStore';
import { useUserStore } from '@/store/userStore';
import api from '@/utils/api';

export default {
  setup() {
    const petStore = usePetStore();
    const userStore = useUserStore();
    
    const pets = ref([]);
    
    // 加载宠物列表
    const loadPets = async () => {
      try {
        await petStore.fetchPets();
        pets.value = petStore.pets.map(pet => ({
          ...pet,
          isDefault: pet._id === petStore.currentPet?._id
        }));
      } catch (error) {
        console.error('Failed to load pets:', error);
        uni.showToast({
          title: '加载宠物信息失败',
          icon: 'none'
        });
      }
    };
    
    // 导航到添加宠物页面
    const navToAdd = () => {
      console.log('开始导航到添加宠物页面');
      
      // 检查用户是否已登录
      if (!userStore.isAuthenticated) {
        console.error('用户未登录，无法添加宠物');
        uni.showToast({
          title: '请先登录',
          icon: 'none'
        });
        
        setTimeout(() => {
          uni.navigateTo({
            url: '/pages/login/login'
          });
        }, 1500);
        return;
      }
      
      // 执行导航
      uni.navigateTo({
        url: `/pages/pet/edit?mode=add`,
        success: (res) => {
          console.log('导航到添加宠物页面成功', res);
        },
        fail: (err) => {
          console.error('导航到添加宠物页面失败:', err);
          // 尝试使用不带参数的路径
          uni.navigateTo({
            url: '/pages/pet/edit',
            success: () => {
              console.log('使用简化路径导航成功');
            },
            fail: (e) => {
              console.error('使用简化路径仍然失败:', e);
              uni.showToast({
                title: '页面跳转失败',
                icon: 'none'
              });
            }
          });
        }
      });
    };
    
    // 导航到宠物详情页面
    const navToDetail = (petId) => {
      uni.navigateTo({
        url: `/pages/pet/edit?petId=${petId}&mode=edit`
      });
    };
    
    // 导航到编辑宠物页面
    const navToEdit = (petId) => {
      console.log('Navigating to edit pet with ID:', petId);
      uni.navigateTo({
        url: `/pages/pet/edit?petId=${petId}&mode=edit`,
        success: () => {
          console.log('Navigation successful');
        },
        fail: (error) => {
          console.error('Navigation failed:', error);
        }
      });
    };
    
    // 删除宠物
    const deletePet = async (pet) => {
      try {
        uni.showLoading({ title: '删除中...' });
        const response = await api.pet.deletePet(pet._id || pet.id);
        uni.hideLoading();
        
        if (response && response.success) {
          petStore.deletePet(pet._id);
          uni.showToast({ title: '删除成功', icon: 'success' });
        } else {
          throw new Error(response.message || '删除失败');
        }
      } catch (error) {
        uni.hideLoading();
        console.error('Failed to delete pet:', error);
        uni.showToast({ title: error.message || '删除失败', icon: 'none' });
      }
    };
    
    // 设置默认宠物
    const setDefault = async (pet, silent = false) => {
      try {
        uni.showLoading({ title: '设置中...' });
        const response = await api.pet.updatePet(pet._id, { isDefault: true });
        uni.hideLoading();
        
        if (response && response.success) {
          // 更新本地状态
          pets.value = pets.value.map(p => ({
            ...p,
            isDefault: p._id === pet._id
          }));
          
          // 更新store中的当前宠物
          petStore.setCurrentPet(pet);
          
          if (!silent) {
            uni.showToast({
              title: `已将"${pet.name}"设为默认宠物`,
              icon: 'success'
            });
          }
        } else {
          throw new Error(response.message || '设置失败');
        }
      } catch (error) {
        uni.hideLoading();
        console.error('Failed to set default pet:', error);
        if (!silent) {
          uni.showToast({
            title: error.message || '设置失败，请重试',
            icon: 'none'
          });
        }
      }
    };
    
    // 计算宠物年龄
    const calculatePetAge = (birthdate) => {
      if (!birthdate) return '未知年龄';
      
      const birth = new Date(birthdate);
      const now = new Date();
      
      // 计算年龄（月）
      const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                     (now.getMonth() - birth.getMonth());
      
      if (months < 12) {
        return `${months}个月`;
      } else {
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        return remainingMonths > 0 ? `${years}岁${remainingMonths}个月` : `${years}岁`;
      }
    };
    
    // 格式化图片URL
    const formatImageUrl = (url) => {
      if (!url) {
        return '/static/images/default-pet.png';
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
      return '/static/images/default-pet.png';
    };
    
    onMounted(() => {
      if (userStore.isLoggedIn) {
        loadPets();
      } else {
        uni.redirectTo({ url: '/pages/login/login' });
      }
    });
    
    return {
      pets,
      navToAdd,
      navToDetail,
      navToEdit,
      deletePet,
      setDefault,
      calculatePetAge,
      formatImageUrl
    };
  }
}
</script>

<style lang="scss" scoped>
.management-container {
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 30rpx;
}

.header {
  background-color: #fff;
  padding: 20rpx 30rpx;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.add-btn {
  display: flex;
  align-items: center;
  background-color: #3B9E82;
  padding: 10rpx 20rpx;
  border-radius: 30rpx;
  color: #fff;
}

.add-icon {
  font-size: 32rpx;
  margin-right: 10rpx;
}

.add-text {
  font-size: 28rpx;
}

.empty-pets {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-image {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.add-pet-btn {
  background-color: #3B9E82;
  color: #fff;
  font-size: 28rpx;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  border: none;
}

.pet-list {
  padding: 20rpx;
}

.pet-item {
  background-color: #fff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  overflow: hidden;
  position: relative;
  transform: translateZ(0);
  transition: all 0.2s ease;
}

.pet-item:active {
  background-color: #f9f9f9;
  opacity: 0.9;
  transform: scale(0.98);
}

.pet-content {
  display: flex;
  padding: 30rpx;
  position: relative;
  align-items: center;
}

.pet-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50rpx;
  margin-right: 30rpx;
  border: 4rpx solid #f0f0f0;
}

.pet-info {
  flex: 1;
  width: 60%;
  padding-right: 80rpx;
}

.pet-name-row {
  display: flex;
  align-items: center;
  margin-bottom: 10rpx;
}

.pet-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 10rpx;
}

.pet-gender {
  font-size: 28rpx;
  width: 40rpx;
  height: 40rpx;
  line-height: 40rpx;
  text-align: center;
  border-radius: 50%;
}

.pet-gender.male {
  color: #007AFF;
  background-color: rgba(0, 122, 255, 0.1);
}

.pet-gender.female {
  color: #FF2D55;
  background-color: rgba(255, 45, 85, 0.1);
}

.pet-breed {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.pet-age {
  font-size: 24rpx;
  color: #999;
}

.default-tag {
  position: absolute;
  top: 20rpx;
  right: 20rpx;
  font-size: 24rpx;
  color: #fff;
  background-color: #FF9500;
  padding: 6rpx 12rpx;
  border-radius: 20rpx;
}

.edit-indicator {
  position: absolute;
  right: 30rpx;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
}

.edit-text {
  font-size: 26rpx;
  color: #3B9E82;
}

.edit-arrow {
  font-size: 26rpx;
  color: #3B9E82;
  margin-left: 6rpx;
}
</style> 