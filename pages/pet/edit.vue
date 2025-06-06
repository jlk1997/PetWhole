<template>
	<view class="pet-edit-container">
		<view class="form-header">
			<text class="form-title">{{ pageMode === 'add' ? '添加宠物' : '编辑宠物' }}</text>
		</view>
		
		<view class="pet-form">
			<view class="avatar-section">
				<image 
					class="pet-avatar" 
					:src="form.avatar || '/static/images/default-pet.png'" 
					mode="aspectFill"
					@click="chooseAvatar"
				></image>
				<text class="avatar-tip">点击更换头像</text>
			</view>
			
			<view class="form-item">
				<text class="form-label">宠物名称</text>
				<input class="form-input" v-model="form.name" placeholder="请输入宠物名称" />
			</view>
			
			<view class="form-item">
				<text class="form-label">品种</text>
				<input class="form-input" v-model="form.breed" placeholder="请输入宠物品种" />
			</view>
			
			<view class="form-item">
				<text class="form-label">性别</text>
				<view class="gender-selector">
					<view 
						class="gender-option" 
						:class="{ active: form.gender === 'male' }"
						@click="form.gender = 'male'"
					>
						<text>公</text>
					</view>
					<view 
						class="gender-option" 
						:class="{ active: form.gender === 'female' }"
						@click="form.gender = 'female'"
					>
						<text>母</text>
					</view>
				</view>
			</view>
			
			<view class="form-item">
				<text class="form-label">年龄</text>
				<input class="form-input" v-model="form.age" type="number" placeholder="请输入宠物年龄" />
			</view>
			
			<view class="form-item">
				<text class="form-label">体重 (kg)</text>
				<input class="form-input" v-model="form.weight" type="digit" placeholder="请输入宠物体重" />
			</view>
			
			<view class="form-item">
				<text class="form-label">社交意向</text>
				<view class="selector-row">
					<view 
						class="selector-option" 
						:class="{ active: form.socialIntention === 'strong' }"
						@click="form.socialIntention = 'strong'"
					>
						<text>强烈</text>
					</view>
					<view 
						class="selector-option" 
						:class="{ active: form.socialIntention === 'medium' }"
						@click="form.socialIntention = 'medium'"
					>
						<text>较强</text>
					</view>
					<view 
						class="selector-option" 
						:class="{ active: form.socialIntention === 'mild' }"
						@click="form.socialIntention = 'mild'"
					>
						<text>平淡</text>
					</view>
				</view>
			</view>
			
			<view class="form-item">
				<text class="form-label">求偶状态</text>
				<view class="selector-row">
					<view 
						class="selector-option" 
						:class="{ active: form.matingStatus === 'single' }"
						@click="form.matingStatus = 'single'"
					>
						<text>单身待求偶</text>
					</view>
					<view 
						class="selector-option" 
						:class="{ active: form.matingStatus === 'paired' }"
						@click="form.matingStatus = 'paired'"
					>
						<text>有配偶</text>
					</view>
					<view 
						class="selector-option" 
						:class="{ active: form.matingStatus === 'notLooking' }"
						@click="form.matingStatus = 'notLooking'"
					>
						<text>暂不找配偶</text>
					</view>
				</view>
			</view>
			
			<view class="form-item">
				<text class="form-label">日常照片 (最多3张)</text>
				<view class="daily-photos">
					<view 
						v-for="(photo, index) in form.dailyPhotos" 
						:key="index" 
						class="photo-item"
					>
						<image 
							class="photo-preview" 
							:src="photo.url" 
							mode="aspectFill"
							@error="handlePhotoError"
						></image>
						<view class="photo-delete" @click="removePhoto(index)">×</view>
					</view>
					
					<view 
						v-if="form.dailyPhotos.length < 3" 
						class="photo-add"
						@click="addDailyPhoto"
					>
						<text class="add-icon">+</text>
					</view>
				</view>
			</view>
			
			<view class="form-item">
				<text class="form-label">个性介绍</text>
				<textarea class="form-textarea" v-model="form.description" placeholder="添加个性信息（选填）" />
			</view>
			
			<button 
				class="submit-btn" 
				:disabled="!isFormValid || isLoading" 
				:class="{ loading: isLoading }"
				@click="handleSubmit"
			>
				{{ isLoading ? '处理中...' : '保 存' }}
			</button>
			
			<button 
				v-if="pageMode === 'edit'" 
				class="delete-btn" 
				:disabled="isLoading"
				@click="handleDelete"
			>
				删除宠物
			</button>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue';
import { usePetStore } from '@/store/pet.js';
import { showToast, showLoading, hideLoading, navigateBack, showModal } from '@/utils/ui.js';

const petStore = usePetStore();
const isLoading = ref(false);

// 获取路由参数
const props = defineProps({
  petId: {
    type: String,
    default: ''
  },
  mode: {
    type: String,
    default: 'add' // 'add' 或 'edit'
  }
});

// 表单数据
const form = ref({
  name: '',
  breed: '',
  gender: 'male',
  age: '',
  weight: '',
  description: '',
  avatar: '',
  socialIntention: 'medium',
  matingStatus: 'notLooking',
  dailyPhotos: []
});

// 当前编辑的宠物ID
const currentPetId = ref('');

// 页面模式
const pageMode = ref('add');

// 表单验证
const isFormValid = computed(() => {
  return form.value.name && form.value.breed;
});

// 加载组件时初始化
onMounted(async () => {
  console.log('组件加载，参数:', props);
  
  // 获取路由参数
  const pages = getCurrentPages();
  const page = pages[pages.length - 1];
  const query = page.options || {};
  
  console.log('页面参数:', query);
  
  // 优先使用props，但也接受页面参数
  const petId = props.petId || query.petId || query.id;
  
  // 确保mode参数有效，如果没有提供，默认为'add'
  pageMode.value = props.mode || query.mode || 'add';
  
  // 确保模式值有效
  if (pageMode.value !== 'add' && pageMode.value !== 'edit') {
    console.warn('无效的模式参数:', pageMode.value, '重置为默认值"add"');
    pageMode.value = 'add';
  }
  
  console.log('解析参数:', { petId, mode: pageMode.value });
  currentPetId.value = petId;
  
  // 手动设置表单标题，确保UI正确显示
  document.title = pageMode.value === 'add' ? '添加宠物' : '编辑宠物';
  
  // 如果是编辑模式，加载宠物数据
  if (pageMode.value === 'edit' && petId) {
    await loadPetData(petId);
  } else {
    console.log('添加模式，使用默认表单数据');
    // 设置默认表单数据
    form.value = {
      name: '',
      breed: '',
      gender: 'male',
      age: '',
      weight: '',
      description: '',
      avatar: '/static/images/default-pet.png',
      socialIntention: 'medium',
      matingStatus: 'notLooking',
      dailyPhotos: []
    };
  }
});

// 加载宠物信息
async function loadPetData(petId) {
  if (!petId) return;
  
  isLoading.value = true;
  showLoading('加载宠物信息...');
  
  try {
    console.log('获取宠物数据:', petId);
    const pet = await petStore.getPetById(petId);
    
    if (pet) {
      console.log('获取到宠物数据:', pet);
      form.value = {
        name: pet.name || '',
        breed: pet.breed || '',
        gender: pet.gender || 'male',
        age: pet.age || '',
        weight: pet.weight || '',
        description: pet.description || '',
        avatar: formatImageUrl(pet.avatar) || '/static/images/default-pet.png',
        socialIntention: pet.socialIntention || 'medium',
        matingStatus: pet.matingStatus || 'notLooking',
        dailyPhotos: Array.isArray(pet.dailyPhotos) ? pet.dailyPhotos.map(photo => ({
          ...photo,
          url: formatImageUrl(photo.url)
        })) : []
      };
    } else {
      console.error('未找到宠物:', petId);
      showToast({
        title: '未找到宠物信息',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('获取宠物信息失败:', error);
    showToast({
      title: '获取宠物信息失败',
      icon: 'none'
    });
  } finally {
    isLoading.value = false;
    hideLoading();
  }
}

// 选择头像
function chooseAvatar() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      // 显示头像加载中状态
      uni.showLoading({
        title: '处理图片中...'
      });
      
      try {
        // 先临时显示本地图片
        form.value.avatar = res.tempFilePaths[0];
        
        // 如果是编辑模式并且有宠物ID，直接上传头像
        if (props.mode === 'edit' && currentPetId.value) {
          console.log('上传宠物头像:', currentPetId.value, res.tempFilePaths[0]);
          
          try {
            // 调用API上传头像
            const result = await petStore.uploadPetAvatar(currentPetId.value, res.tempFilePaths[0]);
            console.log('头像上传结果:', result);
            
            if (result && result.success && result.data && result.data.pet) {
              // 更新表单中的头像为服务器返回的URL
              const petAvatar = result.data.pet.avatar;
              if (petAvatar) {
                form.value.avatar = formatImageUrl(petAvatar);
                uni.showToast({
                  title: '头像上传成功',
                  icon: 'success'
                });
              } else {
                throw new Error('返回的头像URL为空');
              }
            } else {
              throw new Error('头像上传响应格式不正确');
            }
          } catch (uploadError) {
            console.error('头像上传处理失败:', uploadError);
            // 保留本地头像，稍后提交表单时一起处理
            uni.showToast({
              title: '头像上传失败，将在保存时再次尝试',
              icon: 'none'
            });
          }
        }
        // 如果是添加模式，只保存本地路径，等提交表单时再上传
      } catch (error) {
        console.error('头像上传失败:', error);
        uni.showToast({
          title: '头像上传失败',
          icon: 'none'
        });
      } finally {
        uni.hideLoading();
      }
    },
    fail: (err) => {
      console.error('选择图片失败:', err);
      uni.showToast({
        title: '选择图片失败',
        icon: 'none'
      });
    }
  });
}

// 添加日常照片
function addDailyPhoto() {
  if (form.value.dailyPhotos.length >= 3) {
    showToast({
      title: '最多只能上传3张照片',
      icon: 'none'
    });
    return;
  }
  
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      // 显示加载状态
      uni.showLoading({
        title: '处理图片中...'
      });
      
      try {
        // 添加到照片数组
        const newPhoto = {
          url: res.tempFilePaths[0],  // 本地临时路径
          uploadDate: new Date(),
          description: ''
        };
        
        form.value.dailyPhotos.push(newPhoto);
        
        // 如果已经在编辑模式并且有ID，可以考虑直接上传
        // 这里简化处理，统一在保存时上传
        
        uni.hideLoading();
        showToast({
          title: '已添加照片',
          icon: 'success'
        });
        
        // 在控制台打印添加的照片信息，用于调试
        console.log('已添加临时照片:', newPhoto);
      } catch (error) {
        console.error('添加照片失败:', error);
        uni.hideLoading();
        showToast({
          title: '添加照片失败',
          icon: 'none'
        });
      }
    }
  });
}

// 删除照片
function removePhoto(index) {
  if (index >= 0 && index < form.value.dailyPhotos.length) {
    form.value.dailyPhotos.splice(index, 1);
    showToast({
      title: '已删除照片',
      icon: 'success'
    });
  }
}

// 处理照片加载错误
function handlePhotoError(e) {
  console.error('照片加载失败:', e.target);
  // 可以在这里设置一个默认图片
  e.target.src = '/static/images/default-pet.png';
}

// 提交表单
async function handleSubmit() {
  if (!isFormValid.value) {
    showToast('请填写必填项');
    return;
  }
  
  isLoading.value = true;
  showLoading('保存中...');
  
  try {
    const petData = {
      name: form.value.name,
      breed: form.value.breed,
      gender: form.value.gender,
      age: form.value.age ? parseInt(form.value.age) : null,
      weight: form.value.weight ? parseFloat(form.value.weight) : null,
      description: form.value.description,
      socialIntention: form.value.socialIntention,
      matingStatus: form.value.matingStatus
    };

    // 保存临时头像路径，不直接发送Blob URL
    const tempAvatarPath = form.value.avatar;
    let isBlobUrl = tempAvatarPath && tempAvatarPath.startsWith('blob:');
    
    // 处理日常照片的上传
    let dailyPhotosToUpload = [];
    
    if (form.value.dailyPhotos && form.value.dailyPhotos.length > 0) {
      dailyPhotosToUpload = form.value.dailyPhotos.filter(photo => 
        photo.url && (photo.url.startsWith('blob:') || photo.url.startsWith('file:'))
      );
      
      // 过滤掉本地路径，只保留已上传到服务器的照片
      const serverPhotos = form.value.dailyPhotos.filter(photo => 
        photo.url && !photo.url.startsWith('blob:') && !photo.url.startsWith('file:')
      );
      
      petData.dailyPhotos = serverPhotos;
    }
    
    let result;
    
    // 根据模式决定是添加还是更新宠物
    if (pageMode.value === 'edit' && currentPetId.value) {
      console.log('更新宠物信息:', currentPetId.value, petData);
      result = await petStore.updatePet(currentPetId.value, petData);
      
      // 如果有新头像需要上传
      if (isBlobUrl) {
        console.log('更新模式: 单独上传头像', tempAvatarPath);
        try {
          await petStore.uploadPetAvatar(currentPetId.value, tempAvatarPath);
        } catch (avatarError) {
          console.error('头像上传失败:', avatarError);
        }
      }
      
      // 处理新增的日常照片上传
      if (dailyPhotosToUpload.length > 0) {
        try {
          for (const photo of dailyPhotosToUpload) {
            const uploadResult = await petStore.uploadPetDailyPhoto(currentPetId.value, photo.url);
            console.log('日常照片上传结果:', uploadResult);
            
            // 更新照片URL为服务器返回的URL（如果有）
            if (uploadResult && uploadResult.data && uploadResult.data.photo && uploadResult.data.photo.url) {
              console.log('服务器返回的照片URL:', uploadResult.data.photo.url);
            }
          }
        } catch (photoError) {
          console.error('日常照片上传失败:', photoError);
        }
      }
      
      showToast({
        title: '宠物信息已更新',
        icon: 'success'
      });
    } else {
      // 新增宠物
      console.log('添加新宠物:', petData);
      result = await petStore.addPet(petData);
      
      if (result && result._id) {
        const newPetId = result._id;
        
        // 上传头像
        if (isBlobUrl) {
          console.log('添加模式: 上传头像', tempAvatarPath);
          try {
            await petStore.uploadPetAvatar(newPetId, tempAvatarPath);
          } catch (avatarError) {
            console.error('头像上传失败:', avatarError);
          }
        }
        
        // 处理日常照片上传
        if (dailyPhotosToUpload.length > 0) {
          try {
            for (const photo of dailyPhotosToUpload) {
              const uploadResult = await petStore.uploadPetDailyPhoto(newPetId, photo.url);
              console.log('新增模式 - 日常照片上传结果:', uploadResult);
              
              // 更新照片URL为服务器返回的URL（如果有）
              if (uploadResult && uploadResult.data && uploadResult.data.photo && uploadResult.data.photo.url) {
                console.log('服务器返回的照片URL:', uploadResult.data.photo.url);
              }
            }
          } catch (photoError) {
            console.error('日常照片上传失败:', photoError);
          }
        }
        
        showToast({
          title: '宠物添加成功',
          icon: 'success'
        });
      } else {
        throw new Error('添加宠物失败，未返回宠物ID');
      }
    }
    
    // 通知store刷新宠物列表
    await petStore.fetchPets();
    
    // 返回上一页
    setTimeout(() => {
      navigateBack();
    }, 1500);
  } catch (error) {
    console.error('保存宠物信息失败:', error);
    showToast({
      title: '保存失败: ' + (error.message || '未知错误'),
      icon: 'none'
    });
  } finally {
    isLoading.value = false;
    hideLoading();
  }
}

// 删除宠物
async function handleDelete() {
  if (!currentPetId.value) {
    showToast('无效的宠物ID');
    return;
  }
  
  showModal({
    title: '删除宠物',
    content: '确定要删除这只宠物吗？此操作不可逆。',
    showCancel: true
  }).then(async (res) => {
    if (res) {
      isLoading.value = true;
      showLoading('删除中...');
      
      try {
        console.log('删除宠物:', currentPetId.value);
        await petStore.deletePet(currentPetId.value);
        
        showToast({
          title: '宠物已删除',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          navigateBack();
        }, 1500);
      } catch (error) {
        console.error('删除宠物失败:', error);
        showToast({
          title: error.message || '删除失败，请重试',
          icon: 'none'
        });
      } finally {
        isLoading.value = false;
        hideLoading();
      }
    }
  });
}

// 格式化图片URL
function formatImageUrl(url) {
  if (!url) {
    return '/static/images/default-pet.png';
  }
  
  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/static/') || url.startsWith('file://')) {
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
}
</script>

<style>
.pet-edit-container {
  padding: 30rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.form-header {
  margin-bottom: 30rpx;
}

.form-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.pet-form {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 30rpx;
}

.pet-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  background-color: #f0f0f0;
  border: 2rpx solid #ddd;
}

.avatar-tip {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.form-input {
  width: 100%;
  height: 80rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  background-color: #fff;
}

.form-textarea {
  width: 100%;
  height: 160rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  padding: 20rpx;
  font-size: 28rpx;
  background-color: #fff;
}

.gender-selector, .selector-row {
  display: flex;
  width: 100%;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  overflow: hidden;
}

.gender-option, .selector-option {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.gender-option.active, .selector-option.active {
  background-color: #3B9E82;
  color: #fff;
}

/* 照片上传区域样式 */
.daily-photos {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  margin-top: 10rpx;
}

.photo-item, .photo-add {
  width: 160rpx;
  height: 160rpx;
  border-radius: 8rpx;
  position: relative;
}

.photo-item {
  border: 1rpx solid #ddd;
  overflow: hidden;
}

.photo-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-delete {
  position: absolute;
  top: 0;
  right: 0;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 24rpx;
  border-bottom-left-radius: 8rpx;
}

.photo-add {
  border: 1rpx dashed #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.add-icon {
  font-size: 60rpx;
  color: #999;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #3B9E82;
  color: #fff;
  font-size: 32rpx;
  border-radius: 44rpx;
  margin: 40rpx 0 20rpx;
}

.submit-btn.loading {
  background-color: #86c9b3;
}

.submit-btn:disabled {
  background-color: #cccccc;
  color: #999999;
}

.delete-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  background-color: #fff;
  color: #ff5252;
  font-size: 32rpx;
  border-radius: 44rpx;
  border: 1rpx solid #ff5252;
  margin-top: 20rpx;
}

.delete-btn:disabled {
  border-color: #ccc;
  color: #999;
}
</style> 