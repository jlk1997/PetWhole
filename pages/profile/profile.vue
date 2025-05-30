<template>
  <view class="profile-container">
    <view class="header">
      <view class="header-title">{{ isFirstLogin ? '完善个人资料' : '编辑个人资料' }}</view>
      <view v-if="isFirstLogin" class="first-login-tip">首次登录，请完善个人信息</view>
    </view>
    
    <view class="avatar-section">
      <view class="avatar-wrapper">
        <image class="avatar" :src="displayAvatar" mode="aspectFill"></image>
        <view v-if="avatarLoading" class="avatar-loading">
          <text class="loading-text">上传中...</text>
        </view>
      </view>
      <view class="change-avatar-btn" @click="changeAvatar">更换头像</view>
    </view>
    
    <view class="form-section">
      <view class="form-item">
        <text class="form-label required">昵称</text>
        <input class="form-input" type="text" v-model="form.nickname" placeholder="请输入昵称" />
      </view>
      
      <view class="form-item">
        <text class="form-label required">邮箱</text>
        <input class="form-input" type="text" v-model="form.email" placeholder="请输入邮箱" />
      </view>
      
      <view class="form-item">
        <text class="form-label required">手机号码</text>
        <input class="form-input" type="text" v-model="form.phone" placeholder="请输入手机号码" />
      </view>
      
      <view class="form-item">
        <text class="form-label">性别</text>
        <picker class="form-picker" mode="selector" :range="genderOptions" range-key="label" 
                :value="genderIndex" @change="onGenderChange">
          <view class="picker-text">{{ genderOptions[genderIndex].label }}</view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="form-label">个人签名</text>
        <textarea class="form-textarea" v-model="form.bio" placeholder="请输入个人签名"></textarea>
      </view>
    </view>
    
    <view class="button-section">
      <button class="save-btn" :disabled="!isFormValid || isSubmitting" @click="saveProfile">
        {{ isSubmitting ? '保存中...' : '保存' }}
      </button>
      <button v-if="!isFirstLogin" class="cancel-btn" @click="goBack">取消</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/user.js';
import { showToast, showLoading, hideLoading } from '@/utils/ui.js';

// 获取路由参数
const isFirstLogin = ref(false);
const userStore = useUserStore();
const avatarLoading = ref(false);
const apiBaseUrl = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';

// 处理头像显示URL
const displayAvatar = computed(() => {
  const avatar = form.value.avatar;
  console.log('个人资料页面头像路径:', avatar);
  
  if (!avatar) {
    return '/static/images/default-avatar.png';
  }
  
  // 如果是服务器相对路径，添加基础URL
  if (avatar.startsWith('/uploads/')) {
    const fullUrl = apiBaseUrl + avatar;
    console.log('个人资料页面完整头像URL:', fullUrl);
    return fullUrl;
  }
  
  return avatar;
});

// 表单数据
const form = ref({
  nickname: '',
  email: '',
  phone: '',
  avatar: '',
  gender: 'unknown',
  bio: ''
});

// 性别选项
const genderOptions = [
  { value: 'unknown', label: '请选择性别' },
  { value: 'male', label: '男' },
  { value: 'female', label: '女' },
  { value: 'other', label: '其他' }
];

// 性别选择器索引
const genderIndex = computed(() => {
  const index = genderOptions.findIndex(option => option.value === form.value.gender);
  console.log('计算性别索引:', form.value.gender, '索引为:', index >= 0 ? index : 0);
  return index >= 0 ? index : 0;
});

// 表单验证
const isFormValid = computed(() => {
  return form.value.nickname && 
         form.value.email && 
         form.value.phone;
});

// 页面加载状态
const isLoading = ref(false);
const isSubmitting = ref(false);

// 性别变更处理
function onGenderChange(e) {
  const index = e.detail.value;
  form.value.gender = genderOptions[index].value;
  console.log('性别变更为:', form.value.gender);
}

// 更换头像
async function changeAvatar() {
  try {
    console.log('开始选择图片');
    const res = await new Promise((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'], // 默认已经使用压缩类型
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject
      });
    });
    
    if (!res || !res.tempFilePaths || !res.tempFilePaths.length) {
      console.error('未选择图片或返回的图片路径为空');
      return;
    }
    
    const tempFilePath = res.tempFilePaths[0];
    console.log('选择的图片路径:', tempFilePath);
    
    if (!tempFilePath) {
      console.error('无效的图片路径');
      showToast('选择图片失败');
      return;
    }
    
    // 显示加载状态
    avatarLoading.value = true;
    
    // 获取文件信息
    try {
      const fileInfo = await new Promise((resolve, reject) => {
        uni.getFileInfo({
          filePath: tempFilePath,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('原始图片大小:', (fileInfo.size / 1024 / 1024).toFixed(2) + 'MB');
      console.log('图片类型:', fileInfo.type);
      
      // 如果文件大于4MB，进行压缩
      if (fileInfo.size > 4 * 1024 * 1024) {
        showToast('图片较大，正在压缩...');
        
        try {
          // 使用压缩方法
          const compressedFilePath = await compressImage(tempFilePath);
          console.log('压缩后的图片路径:', compressedFilePath);
          
          // 再次获取压缩后的文件大小
          const compressedFileInfo = await new Promise((resolve, reject) => {
            uni.getFileInfo({
              filePath: compressedFilePath,
              success: resolve,
              fail: reject
            });
          });
          
          console.log('压缩后图片大小:', (compressedFileInfo.size / 1024 / 1024).toFixed(2) + 'MB');
          
          // 使用压缩后的文件路径
          await uploadAvatar(compressedFilePath);
        } catch (compressError) {
          console.error('压缩图片失败:', compressError);
          showToast('图片压缩失败，尝试直接上传');
          await uploadAvatar(tempFilePath);
        }
      } else {
        // 文件大小合适，直接上传
        await uploadAvatar(tempFilePath);
      }
    } catch (error) {
      console.error('获取文件信息失败:', error);
      // 出错时尝试直接上传
      await uploadAvatar(tempFilePath);
    }
  } catch (error) {
    console.error('选择图片失败:', error);
    showToast('选择图片失败');
    avatarLoading.value = false;
  }
}

// 压缩图片的方法
async function compressImage(filePath) {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src: filePath,
      quality: 70, // 压缩质量，0-100，越小文件越小
      width: '60%', // 缩小宽度比例
      height: '60%', // 缩小高度比例
      success: (res) => {
        resolve(res.tempFilePath);
      },
      fail: (err) => {
        console.error('压缩图片失败:', err);
        // 压缩失败时返回原图
        resolve(filePath);
      }
    });
  });
}

// 上传头像逻辑独立出来，方便复用
async function uploadAvatar(filePath) {
  try {
    console.log('开始上传头像，文件路径:', filePath);
    
    // avatarLoading的状态由调用方管理
    
    // 再次验证文件路径
    if (!filePath) {
      console.error('无效的头像文件路径');
      showToast('头像文件无效');
      return false;
    }
    
    // 调用上传API
    const uploadResult = await userStore.uploadAvatar(filePath);
    
    console.log('头像上传结果:', uploadResult);
    
    // 更灵活地处理各种返回结构
    let avatarPath = null;
    
    if (uploadResult) {
      avatarPath = 
        (uploadResult.avatar) ||
        (uploadResult.data && uploadResult.data.avatar) ||
        null;
      
      console.log('提取的头像路径:', avatarPath);
    }
    
    // 验证后端是否成功保存了头像
    if (avatarPath) {
      form.value.avatar = avatarPath;
      showToast('头像上传成功');
      
      // 从后端获取最新的用户信息，确保头像已保存
      const updatedUserInfo = await userStore.fetchUserInfo();
      
      if (updatedUserInfo && updatedUserInfo.avatar === avatarPath) {
        console.log('头像已确认成功保存到后端:', avatarPath);
        return true;
      } else {
        console.warn('头像保存可能不完整，后端返回的头像与上传的不一致');
        // 仍然返回true，因为上传已成功，只是验证不完整
        return true;
      }
    } else {
      console.error('头像上传失败：未获取到有效的头像URL', uploadResult);
      showToast('头像上传失败，请重试');
      return false;
    }
  } catch (error) {
    console.error('头像上传失败:', error);
    
    // 根据错误类型显示不同的错误信息
    if (error.message && error.message.includes('网络请求失败')) {
      showToast('网络连接失败，请检查网络');
    } else if (error.message && error.message.includes('文件读取失败')) {
      showToast('文件读取失败，请重新选择图片');
    } else if (error.message && error.message.includes('上传失败: 400')) {
      showToast('文件格式不支持或已损坏');
    } else {
      showToast('头像上传失败，请重试');
    }
    
    return false;
  } finally {
    avatarLoading.value = false;
  }
}

// 保存个人资料
async function saveProfile() {
  // 表单验证
  if (!form.value.nickname) {
    return showToast('请输入昵称');
  }
  
  if (!form.value.email) {
    return showToast('请输入邮箱');
  }
  
  if (!form.value.phone) {
    return showToast('请输入手机号码');
  }
  
  isSubmitting.value = true;
  showLoading('保存中...');
  
  try {
    // 构建更新数据，包含所有字段，确保phone和gender被正确发送
    const updateData = {
      nickname: form.value.nickname,
      email: form.value.email,
      bio: form.value.bio || '',
      phone: form.value.phone || '',
      gender: form.value.gender || 'unknown'
    };
    
    // 如果有头像，也包含头像
    if (form.value.avatar) {
      updateData.avatar = form.value.avatar;
    }
    
    console.log('准备更新个人资料，包含性别信息:', updateData);
    
    // 确保所有字段都有值
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        updateData[key] = '';
      }
    });
    
    // 调用更新用户信息API
    const result = await userStore.updateUserInfo(updateData);
    
    console.log('个人资料更新结果:', result);
    
    // 验证关键字段是否存在于响应中
    if (result) {
      // 验证后端是否成功保存了所有字段
      const isSaveComplete = validateServerResponse(result, updateData);
      
      if (!isSaveComplete) {
        console.error('后端未成功保存所有字段，中止操作');
        showToast({
          title: '资料保存不完整，请重试',
          icon: 'none'
        });
        return;
      }
      
      console.log('所有字段已成功保存到后端');
      
      // 更新本地存储，但仅作为缓存用途
      if (userStore.user) {
        // 使用后端返回的数据更新用户信息，而不是表单数据
        userStore.user = result;
        
        // 保存到本地存储，仅用于缓存
        uni.setStorageSync('userInfo', JSON.stringify(result));
        console.log('后端数据已缓存到本地存储');
      }
      
      // 设置首次登录完成标记
      try {
        uni.setStorageSync('hasCompletedFirstLogin', 'true');
        console.log('已标记用户完成首次登录');
      } catch (err) {
        console.error('保存登录状态失败:', err);
      }
      
      showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 延迟返回或跳转
      setTimeout(() => {
        // 不论是否首次登录，保存完成后应该直接返回首页
        uni.switchTab({
          url: '/pages/index/index'
        });
        
        // 如果是从URL参数来的首次登录，清除此标记
        if (isFirstLogin.value) {
          console.log('首次登录资料完善完成，跳转回首页');
        } else {
          console.log('资料更新完成，跳转回首页');
        }
      }, 1500);
    } else {
      showToast('后端保存失败，请重试');
    }
  } catch (error) {
    console.error('保存个人资料失败:', error);
    showToast('保存失败，请重试');
  } finally {
    isSubmitting.value = false;
    hideLoading();
  }
}

// 验证服务器响应是否包含所有提交的字段
function validateServerResponse(serverResponse, submittedData) {
  if (!serverResponse) return false;
  
  // 检查重要字段是否在响应中
  const criticalFields = ['nickname', 'email', 'phone', 'gender'];
  
  for (const field of criticalFields) {
    if (!serverResponse[field]) {
      console.error(`关键字段 ${field} 没有在服务器响应中返回`);
      return false;
    }
    
    // 检查值是否与提交的一致
    if (serverResponse[field] !== submittedData[field]) {
      console.warn(`字段 ${field} 值不一致: 提交=${submittedData[field]}, 返回=${serverResponse[field]}`);
    }
  }
  
  return true;
}

// 返回上一页
function goBack() {
  uni.navigateBack();
}

// 页面加载
onMounted(async () => {
  isLoading.value = true;
  
  try {
    // 直接获取最新用户信息
    console.log('开始从服务器获取用户信息');
    await userStore.fetchUserInfo();
    
    // 获取当前用户信息
    let userInfo = userStore.user;
    
    console.log('服务器返回的用户信息:', userInfo);
    
    // 获取URL参数
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    
    // 检查是否是首次登录参数
    let urlParamFirstLogin = false;
    if (currentPage && currentPage.options) {
      urlParamFirstLogin = currentPage.options.firstLogin === 'true';
    }

    // 检查本地存储中是否有完成首次登录的标记
    let hasCompletedFirstLogin = false;
    try {
      hasCompletedFirstLogin = uni.getStorageSync('hasCompletedFirstLogin') === 'true';
      console.log('用户是否已完成首次登录:', hasCompletedFirstLogin);
    } catch (err) {
      console.error('读取登录状态失败:', err);
    }

    // 检查用户资料是否完整 - 与登录页的逻辑保持一致
    const isProfileComplete = checkProfileCompleteness(userInfo);

    // 如果用户已完成首次登录且资料完整，则不再视为首次登录
    // 注意：只有当用户明确以firstLogin=true参数进入，且未完善资料时才视为首次登录
    isFirstLogin.value = !hasCompletedFirstLogin && (!isProfileComplete && urlParamFirstLogin);

    console.log('URL参数firstLogin:', urlParamFirstLogin);
    console.log('用户资料是否完整:', isProfileComplete);
    console.log('最终判断是否首次登录:', isFirstLogin.value);
    
    // 如果资料已完整且URL参数为首次登录，直接跳转到主页
    if (isProfileComplete && urlParamFirstLogin) {
      console.log('用户资料已完整，跳转到主页');
      setTimeout(() => {
        uni.switchTab({
          url: '/pages/index/index'
        });
      }, 500);
      return;
    }
    
    if (userInfo) {
      // 填充表单数据，确保所有字段都有值
      const originalGender = userInfo.gender || 'unknown';
      
      form.value = {
        nickname: userInfo.nickname || '',
        email: userInfo.email || '',
        phone: userInfo.phone || '',
        avatar: userInfo.avatar || '',
        gender: originalGender,
        bio: userInfo.bio || ''
      };
      
      console.log('表单初始化数据:', form.value);
      console.log('特别关注 - 性别信息:', {
        原始用户性别: originalGender,
        表单性别: form.value.gender,
        性别选项索引: genderIndex.value
      });
    } else {
      showToast('获取用户信息失败');
    }
    
    // 如果是首次登录，显示提示信息
    if (isFirstLogin.value) {
      showToast({
        title: '请完善您的个人信息',
        duration: 3000
      });
    }
  } catch (error) {
    console.error('加载用户信息失败:', error);
    showToast('获取用户信息失败');
  } finally {
    isLoading.value = false;
  }
});

// 添加与登录页一致的资料完整性检查函数
function checkProfileCompleteness(user) {
  // 确保用户对象存在
  if (!user) {
    console.log('用户信息不存在');
    return false;
  }
  
  // 检查关键字段
  if (!user.nickname || !user.email) {
    console.log('用户信息不完整: 缺少基本信息');
    return false;
  }
  
  // 单独检查头像，不接受默认头像作为有效头像
  if (!user.avatar || 
      user.avatar === '/static/images/default-avatar.png' || 
      user.avatar === 'static/images/default-avatar.png') {
    console.log('用户信息不完整: 未上传头像');
    return false;
  }
  
  return true;
}
</script>

<style>
.profile-container {
  padding: 30rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.header-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.first-login-tip {
  font-size: 24rpx;
  color: #ff6b6b;
  margin-top: 10rpx;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30rpx 0;
}

.avatar-wrapper {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: 100rpx;
  overflow: hidden;
  margin-bottom: 20rpx;
}

.avatar {
  width: 100%;
  height: 100%;
  border-radius: 100rpx;
  background-color: #f0f0f0;
}

.avatar-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 100rpx;
}

.loading-text {
  color: #fff;
  font-size: 28rpx;
}

.change-avatar-btn {
  background-color: #007AFF;
  color: #fff;
  padding: 10rpx 30rpx;
  border-radius: 30rpx;
  font-size: 28rpx;
}

.form-section {
  background-color: #fff;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 40rpx;
}

.form-item {
  padding: 20rpx 0;
  border-bottom: 2rpx solid #f5f5f5;
}

.form-item:last-child {
  border-bottom: none;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

.required::after {
  content: '*';
  color: #ff6b6b;
  margin-left: 6rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  font-size: 28rpx;
  color: #333;
  padding: 0 20rpx;
  box-sizing: border-box;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.form-picker {
  width: 100%;
  height: 80rpx;
  background-color: #f5f5f5;
  border-radius: 8rpx;
  padding: 0 20rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.picker-text {
  font-size: 28rpx;
  color: #333;
}

.form-textarea {
  width: 100%;
  height: 180rpx;
  font-size: 28rpx;
  color: #333;
  padding: 20rpx;
  box-sizing: border-box;
  background-color: #f5f5f5;
  border-radius: 8rpx;
}

.button-section {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.save-btn {
  height: 88rpx;
  line-height: 88rpx;
  background-color: #2979ff;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
}

.save-btn:disabled {
  background-color: #a0cfff;
}

.cancel-btn {
  height: 88rpx;
  line-height: 88rpx;
  background-color: #f5f5f5;
  color: #666;
  font-size: 32rpx;
  border-radius: 44rpx;
}
</style>