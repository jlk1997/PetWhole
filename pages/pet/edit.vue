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
				<text class="form-label">备注</text>
				<textarea class="form-textarea" v-model="form.notes" placeholder="添加备注信息（选填）" />
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
  notes: '',
  avatar: ''
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
      notes: '',
      avatar: '/static/images/default-pet.png'
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
        notes: pet.notes || '',
        avatar: formatImageUrl(pet.avatar) || '/static/images/default-pet.png'
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
      notes: form.value.notes
    };

    // 保存临时头像路径，不直接发送Blob URL
    const tempAvatarPath = form.value.avatar;
    let isBlobUrl = tempAvatarPath && tempAvatarPath.startsWith('blob:');
    
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
      
      showToast({
        title: '宠物信息已更新',
        icon: 'success'
      });
    } else {
      console.log('添加新宠物:', petData);
      // 先添加宠物信息，不包含头像
      result = await petStore.addPet(petData);
      
      // 如果添加成功且有头像，上传头像
      if (result && result._id && isBlobUrl) {
        console.log('添加模式: 单独上传头像到新创建的宠物', result._id, tempAvatarPath);
        try {
          await petStore.uploadPetAvatar(result._id, tempAvatarPath);
        } catch (avatarError) {
          console.error('新宠物头像上传失败:', avatarError);
        }
      }
      
      showToast({
        title: '宠物添加成功',
        icon: 'success'
      });
    }
    
    console.log('保存宠物结果:', result);
    
    // 刷新宠物列表数据
    await petStore.fetchPets();
    
    // 返回上一页
    setTimeout(() => {
      navigateBack();
    }, 1500);
  } catch (error) {
    console.error('保存宠物信息失败:', error);
    showToast({
      title: error.message || '保存失败，请重试',
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
    const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
    return BASE_URL + url;
  }
  
  // 如果是uploads路径但没有前导斜杠
  if (url.startsWith('uploads/')) {
    const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
    return BASE_URL + '/' + url;
  }
  
  // 其他情况，使用默认头像
  return '/static/images/default-pet.png';
}
</script>

<style>
.pet-edit-container {
  padding: 40rpx;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.form-header {
  text-align: center;
  margin-bottom: 40rpx;
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

.gender-selector {
  display: flex;
  width: 100%;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  overflow: hidden;
}

.gender-option {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f9f9f9;
}

.gender-option.active {
  background-color: #3B9E82;
  color: #fff;
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