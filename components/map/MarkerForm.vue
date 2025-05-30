<template>
	<view class="marker-form">
		<uni-forms ref="form" :model="formData" :rules="rules">
			<view class="form-header">
				<text class="form-title">{{ isEdit ? '编辑标记' : '添加标记' }}</text>
				<view class="close-btn" @click="handleClose">×</view>
			</view>
			
			<view class="form-body">
				<!-- 标记类型 -->
				<uni-forms-item name="markerType" label="标记类型">
					<uni-segmented-control 
						:current="typeIndex" 
						:values="typeOptions" 
						@clickItem="handleTypeChange"
						styleType="button"
						activeColor="#2196F3">
					</uni-segmented-control>
				</uni-forms-item>
				
				<!-- 标题 -->
				<uni-forms-item name="title" label="标题">
					<uni-easyinput
						v-model="formData.title"
						placeholder="请输入标题"
						trim="both">
					</uni-easyinput>
				</uni-forms-item>
				
				<!-- 描述 -->
				<uni-forms-item name="description" label="描述">
					<uni-easyinput
						v-model="formData.description"
						type="textarea"
						placeholder="请输入详细描述"
						trim="both">
					</uni-easyinput>
				</uni-forms-item>
				
				<!-- 图片上传 -->
				<uni-forms-item name="images" label="图片">
					<view class="image-upload-area">
					<uni-file-picker
							v-model="imageFiles"
						fileMediatype="image"
						mode="grid"
						:limit="9"
						@select="handleImageSelect"
						@delete="handleImageDelete">
					</uni-file-picker>
						
						<!-- 已上传图片预览和描述 -->
						<view class="uploaded-images" v-if="formData.images && formData.images.length > 0">
							<view class="image-item" v-for="(img, index) in formData.images" :key="index">
								<image 
									:src="img.url" 
									mode="aspectFill" 
									class="preview-image"
									@click="previewImage(index)">
								</image>
								<input 
									type="text" 
									v-model="img.caption" 
									placeholder="请输入图片描述(可选)" 
									class="image-caption-input" />
								<view class="image-actions">
									<view class="delete-btn" @click="removeImage(index)">
										<uni-icons type="trash" size="18"></uni-icons>
									</view>
								</view>
							</view>
						</view>
					</view>
				</uni-forms-item>
				
				<!-- 联系信息 -->
				<view class="contact-section">
					<text class="section-title">联系方式</text>
					
					<uni-forms-item name="contactInfo.name" label="联系人">
						<uni-easyinput
							v-model="formData.contactInfo.name"
							placeholder="请输入联系人姓名"
							trim="both">
						</uni-easyinput>
					</uni-forms-item>
					
					<uni-forms-item name="contactInfo.phone" label="电话">
						<uni-easyinput
							v-model="formData.contactInfo.phone"
							placeholder="请输入联系电话"
							trim="both">
						</uni-easyinput>
					</uni-forms-item>
					
					<uni-forms-item name="contactInfo.wechat" label="微信">
						<uni-easyinput
							v-model="formData.contactInfo.wechat"
							placeholder="请输入微信号"
							trim="both">
						</uni-easyinput>
					</uni-forms-item>
				</view>
				
				<!-- 位置信息 -->
				<view class="location-section">
					<text class="section-title">位置信息</text>
					<view class="location-detail">
						<text class="location-text">{{ locationName || '正在获取位置...' }}</text>
						<button class="refresh-btn" @click="refreshLocation">
							<uni-icons type="refresh" size="16"></uni-icons>
						</button>
					</view>
				</view>
			</view>
			
			<view class="form-footer">
				<button class="submit-btn" @click="handleSubmit">
					{{ isEdit ? '保存修改' : '提交标记' }}
				</button>
			</view>
		</uni-forms>
	</view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useUserStore } from '@/store/user.js';
import { showToast, showLoading, hideLoading } from '@/utils/ui.js';
import MarkerService from '@/utils/markerService.js';

const props = defineProps({
	areaId: {
		type: String,
		required: true
	},
	marker: {
		type: Object,
		default: null
	}
});

const emit = defineEmits(['close', 'submit']);
const userStore = useUserStore();
const form = ref(null);

// 表单数据
const formData = reactive({
	markerType: props.marker?.markerType || 'stray_dog',
	title: props.marker?.title || '',
	description: props.marker?.description || '',
	images: props.marker?.images || [],
	contactInfo: {
		name: props.marker?.contactInfo?.name || '',
		phone: props.marker?.contactInfo?.phone || '',
		wechat: props.marker?.contactInfo?.wechat || ''
	},
	locationDetail: props.marker?.locationDetail || ''
});

// 用于文件选择器的临时文件数组
const imageFiles = ref([]);

// 标记类型选项
const typeOptions = ['流浪狗', '寻狗启示'];
const typeIndex = computed(() => {
	return formData.markerType === 'stray_dog' ? 0 : 1;
});

// 表单验证规则
const rules = {
	title: {
		rules: [{
			required: true,
			errorMessage: '请输入标题'
		}]
	},
	description: {
		rules: [{
			required: true,
			errorMessage: '请输入描述'
		}]
	},
	'contactInfo.name': {
		rules: [{
			required: true,
			errorMessage: '请输入联系人姓名'
		}]
	},
	'contactInfo.phone': {
		rules: [{
			pattern: /^1[3-9]\d{9}$/,
			errorMessage: '请输入正确的手机号'
		}]
	}
};

// 计算是否为编辑模式
const isEdit = computed(() => {
	return !!props.marker;
});

// 位置信息
const locationName = ref('');

// 获取位置信息
async function refreshLocation() {
	try {
		const location = await uni.getLocation({
			type: 'gcj02'
		});
		
		const result = await uni.chooseLocation({
			latitude: location.latitude,
			longitude: location.longitude
		});
		
		locationName.value = result.name;
		formData.locationDetail = result;
	} catch (error) {
		showToast('获取位置失败，请检查定位权限');
	}
}

// 处理标记类型切换
function handleTypeChange(e) {
	formData.markerType = e.currentIndex === 0 ? 'stray_dog' : 'lost_dog';
}

// 处理图片选择
function handleImageSelect(e) {
	console.log('选择图片：', e);
	
	// 将新选择的图片添加到formData.images
	const newImages = e.tempFilePaths.map((path, index) => ({
		url: path,
		file: path,
		caption: '',
		name: e.tempFiles[index].name || `图片${formData.images.length + index + 1}`
	}));
	
	formData.images.push(...newImages);
}

// 处理图片删除
function handleImageDelete(e) {
	console.log('删除图片：', e);
	
	// 由于这是文件选择器的删除事件，我们不直接处理
	// 图片的真正删除在removeImage方法中处理
}

// 移除图片
function removeImage(index) {
	formData.images.splice(index, 1);
}

// 预览图片
function previewImage(index) {
	const urls = formData.images.map(img => img.url);
	uni.previewImage({
		urls,
		current: index
	});
}

// 处理关闭
function handleClose() {
	emit('close');
}

// 处理提交
async function handleSubmit() {
	try {
		// 表单验证
		const valid = await form.value.validate();
		if (!valid) return;
		
		// 检查登录状态
		if (!userStore.isAuthenticated) {
			showToast('请先登录');
			return;
		}
		
		// 检查位置信息
		if (!formData.locationDetail) {
			showToast('请选择位置');
			return;
		}
		
		// 检查是否有图片
		if (formData.images.length === 0) {
			showToast('请至少上传一张图片');
			return;
		}
		
		showLoading('提交中...');
		
		// 处理图片上传
		const uploadedImages = await Promise.all(
			formData.images.map(async (img) => {
				// 如果已经是服务器URL，不需要重新上传
				if (img.url && !img.file) return img;
				
				// 使用新的图片上传API端点
				const uploadTask = await uni.uploadFile({
					url: '/api/markers/upload',
					filePath: img.file,
					name: 'image',
					formData: {
						type: formData.markerType
					}
				});
				
				// 解析上传结果
				const result = JSON.parse(uploadTask.data);
				
				if (!result.success) {
					throw new Error('图片上传失败');
				}
				
				// 返回上传后的图片信息，包含描述
				return {
					url: result.url,
					caption: img.caption
				};
			})
		);
		
		console.log('所有图片上传完成:', uploadedImages);
		
		// 构建提交数据
		const submitData = {
			...formData,
			images: uploadedImages,
			areaId: props.areaId,
			userId: userStore.userId
		};
		
		// 提交数据
		if (isEdit.value) {
			await MarkerService.updateMarker(props.marker._id, submitData);
		} else {
			await MarkerService.createMarker(submitData);
		}
		
		showToast(isEdit.value ? '修改成功' : '添加成功');
		emit('submit');
	} catch (error) {
		showToast(error.message);
	} finally {
		hideLoading();
	}
}

// 初始化位置信息
if (props.marker?.locationDetail) {
	locationName.value = props.marker.locationDetail.name;
} else {
	refreshLocation();
}
</script>

<style>
.marker-form {
	background-color: #fff;
	border-radius: 20rpx;
	width: 680rpx;
	max-height: 90vh;
	overflow-y: auto;
}

.form-header {
	padding: 30rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid #f0f0f0;
}

.form-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.close-btn {
	font-size: 40rpx;
	color: #999;
	padding: 0 20rpx;
}

.form-body {
	padding: 30rpx;
}

.section-title {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 20rpx;
	display: block;
}

.contact-section,
.location-section {
	margin-top: 40rpx;
}

.location-detail {
	background-color: #f8f8f8;
	padding: 20rpx;
	border-radius: 10rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.location-text {
	font-size: 26rpx;
	color: #666;
	flex: 1;
	margin-right: 20rpx;
}

.refresh-btn {
	background: none;
	border: none;
	padding: 10rpx;
}

.form-footer {
	padding: 30rpx;
	border-top: 1px solid #f0f0f0;
}

.submit-btn {
	width: 100%;
	height: 80rpx;
	line-height: 80rpx;
	background-color: #2196F3;
	color: #fff;
	border-radius: 40rpx;
	font-size: 28rpx;
}

/* 图片上传区域样式 */
.image-upload-area {
	width: 100%;
}

.uploaded-images {
	margin-top: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.image-item {
	position: relative;
	display: flex;
	flex-direction: column;
	border: 1px solid #eee;
	border-radius: 12rpx;
	overflow: hidden;
	background-color: #fff;
	box-shadow: 0 2rpx 8rpx rgba(0,0,0,0.05);
}

.preview-image {
	width: 100%;
	height: 200rpx;
	background-color: #f5f5f5;
}

.image-caption-input {
	width: 100%;
	padding: 16rpx;
	font-size: 26rpx;
	border: none;
	border-top: 1px solid #f0f0f0;
}

.image-actions {
	position: absolute;
	top: 10rpx;
	right: 10rpx;
	display: flex;
	gap: 10rpx;
}

.delete-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	color: #fff;
}

/* 适配暗黑模式 */
@media (prefers-color-scheme: dark) {
	.marker-form {
		background-color: #1a1a1a;
	}
	
	.form-header {
		border-bottom-color: #333;
	}
	
	.form-title {
		color: #fff;
	}
	
	.close-btn {
		color: #666;
	}
	
	.section-title {
		color: #999;
	}
	
	.location-detail {
		background-color: #333;
	}
	
	.location-text {
		color: #999;
	}
	
	.form-footer {
		border-top-color: #333;
	}
}
</style> 