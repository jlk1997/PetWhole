<template>
	<view class="recognition-container">
		<view class="header">
			<view class="back-btn" @click="navigateBack">
				<text class="back-arrow">←</text>
			</view>
			<text class="title">宠物识别</text>
		</view>
		
		<view class="content">
			<view class="upload-section">
				<view class="upload-box" @click="chooseImage">
					<image v-if="imageUrl" :src="imageUrl" mode="aspectFill" class="preview-image"></image>
					<view v-else class="upload-placeholder">
						<view class="upload-icon">+</view>
						<text class="upload-text">点击上传宠物照片</text>
					</view>
				</view>
			</view>
			
			<view class="hint-text" v-if="!analyzing && !result">
				<text>上传一张清晰的宠物照片，我们将为您识别宠物品种</text>
			</view>
			
			<view class="loading" v-if="analyzing">
				<view class="loading-spinner"></view>
				<text class="loading-text">正在分析...</text>
			</view>
			
			<view class="result-section" v-if="result">
				<view class="result-card">
					<view class="result-header">
						<text class="result-title">识别结果</text>
					</view>
					<view class="result-content">
						<text class="breed-name">{{ result.breed }}</text>
						<text v-if="result.englishName" class="breed-english">{{ result.englishName }}</text>
						<text class="confidence">可信度: {{ result.breedConfidence }}%</text>
						<text class="pet-type">类型: {{ result.petType === 'dog' ? '狗' : result.petType === 'cat' ? '猫' : '未知' }}</text>
						<text class="purity" v-if="result.purity">纯种可能性: {{ result.purity }}</text>
					</view>
					<view class="breed-info" v-if="result.features || result.note">
						<text class="info-title">品种介绍:</text>
						<text class="info-text">{{ result.features }}</text>
						<text class="care-title" v-if="result.note">护理建议:</text>
						<text class="care-text" v-if="result.note">{{ result.note }}</text>
					</view>
					<view class="breed-chars" v-if="result.characteristics">
						<text class="chars-title">性格特点:</text>
						<view class="chars-item">
							<text class="chars-label">友好度</text>
							<view class="progress-bar">
								<view class="progress-fill" :style="{width: result.characteristics.friendliness + '%'}"></view>
							</view>
						</view>
						<view class="chars-item">
							<text class="chars-label">活跃度</text>
							<view class="progress-bar">
								<view class="progress-fill" :style="{width: result.characteristics.activity + '%'}"></view>
							</view>
						</view>
						<view class="chars-item">
							<text class="chars-label">训练难度</text>
							<view class="progress-bar">
								<view class="progress-fill" :style="{width: result.characteristics.trainability + '%'}"></view>
							</view>
						</view>
						<view class="chars-item">
							<text class="chars-label">护理需求</text>
							<view class="progress-bar">
								<view class="progress-fill" :style="{width: result.characteristics.grooming + '%'}"></view>
							</view>
						</view>
					</view>
				</view>
				
				<view class="action-buttons">
					<button class="action-btn retry-btn" @click="reset">重新识别</button>
					<button class="action-btn save-btn" @click="saveToPet">保存为我的宠物</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { showToast, showLoading, hideLoading, navigateBack } from '@/utils/ui.js';
import { analyzePetImages } from '@/utils/petAnalysisService.js';
import { useUserStore } from '@/store/user.js';
import { usePetStore } from '@/store/pet.js';

const userStore = useUserStore();
const petStore = usePetStore();

const imageUrl = ref('');
const analyzing = ref(false);
const result = ref(null);

// 选择图片
async function chooseImage() {
	try {
		const res = await new Promise((resolve, reject) => {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: resolve,
				fail: reject
			});
		});
		
		imageUrl.value = res.tempFilePaths[0];
		
		// 自动开始分析
		analyzeImage();
	} catch (error) {
		console.error('选择图片失败:', error);
	}
}

// 分析图片
async function analyzeImage() {
	if (!imageUrl.value) {
		return showToast('请先选择图片');
	}
	
	analyzing.value = true;
	showLoading('识别中...');
	
	try {
		// 调用宠物识别服务
		const analysisResult = await analyzePetImages([imageUrl.value]);
		console.log('识别服务返回结果:', analysisResult);
		
		if (analysisResult.identified) {
			// 服务返回的是一个复杂对象，直接使用
			result.value = analysisResult;
			console.log('识别成功:', result.value);
		} else {
			showToast(analysisResult.message || '识别失败，请重试');
		}
	} catch (error) {
		console.error('分析图片失败:', error);
		showToast('识别失败，请重试');
	} finally {
		analyzing.value = false;
		hideLoading();
	}
}

// 重置
function reset() {
	imageUrl.value = '';
	result.value = null;
}

// 保存为我的宠物
function saveToPet() {
	if (!result.value) {
		return showToast('没有识别结果');
	}
	
	if (!userStore.isAuthenticated) {
		return showToast('请先登录');
	}
	
	// 导航到宠物编辑页面，并传递品种信息
	uni.navigateTo({
		url: `/pages/pet/edit?mode=add&breed=${encodeURIComponent(result.value.breed)}&petType=${encodeURIComponent(result.value.petType || 'dog')}`,
		success: () => {
			showToast('请完善宠物信息');
		},
		fail: (err) => {
			console.error('导航到宠物编辑页面失败:', err);
			showToast('操作失败，请重试');
		}
	});
}

onMounted(() => {
	// 检查用户是否登录
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		
		// 延迟返回，给用户时间看到提示
		setTimeout(() => {
			navigateBack();
		}, 1500);
	}
});
</script>

<style>
.recognition-container {
	background-color: #f5f5f5;
	min-height: 100vh;
	padding-bottom: 30rpx;
}

.header {
	position: relative;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #ffffff;
	border-bottom: 1px solid #f0f0f0;
	padding: 0 30rpx;
}

.title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.back-btn {
	position: absolute;
	left: 30rpx;
	top: 0;
	height: 88rpx;
	display: flex;
	align-items: center;
}

.back-arrow {
	font-size: 38rpx;
	color: #333;
}

.content {
	padding: 30rpx;
}

.upload-section {
	margin-top: 20rpx;
	margin-bottom: 40rpx;
}

.upload-box {
	width: 500rpx;
	height: 500rpx;
	margin: 0 auto;
	background-color: #ffffff;
	border: 2rpx dashed #ddd;
	border-radius: 20rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.upload-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.upload-icon {
	font-size: 80rpx;
	color: #ddd;
	line-height: 1;
	margin-bottom: 20rpx;
}

.upload-text {
	font-size: 28rpx;
	color: #999;
}

.hint-text {
	text-align: center;
	font-size: 26rpx;
	color: #999;
	margin-bottom: 40rpx;
}

.loading {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin: 60rpx 0;
}

.loading-spinner {
	width: 80rpx;
	height: 80rpx;
	border: 6rpx solid #f3f3f3;
	border-top: 6rpx solid #3B9E82;
	border-radius: 50%;
	animation: spin 1s linear infinite;
	margin-bottom: 20rpx;
}

@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

.loading-text {
	font-size: 28rpx;
	color: #666;
}

.result-section {
	margin-top: 30rpx;
}

.result-card {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 30rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.05);
}

.result-header {
	border-bottom: 1px solid #f0f0f0;
	padding-bottom: 20rpx;
	margin-bottom: 20rpx;
}

.result-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.result-content {
	padding: 20rpx 0;
}

.breed-name {
	font-size: 40rpx;
	font-weight: bold;
	color: #3B9E82;
	margin-bottom: 10rpx;
	display: block;
}

.breed-english {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 20rpx;
	display: block;
	font-style: italic;
}

.confidence, .pet-type, .purity {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 10rpx;
	display: block;
}

.breed-info {
	margin-top: 30rpx;
	padding-top: 20rpx;
	border-top: 1px solid #f0f0f0;
}

.info-title, .care-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
	display: block;
}

.care-title {
	margin-top: 20rpx;
}

.info-text, .care-text {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
	display: block;
	margin-bottom: 10rpx;
}

.breed-chars {
	margin-top: 30rpx;
	padding-top: 20rpx;
	border-top: 1px solid #f0f0f0;
}

.chars-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
	display: block;
}

.chars-item {
	margin-bottom: 15rpx;
	display: flex;
	align-items: center;
}

.chars-label {
	width: 150rpx;
	font-size: 26rpx;
	color: #666;
}

.progress-bar {
	flex: 1;
	height: 16rpx;
	background-color: #f0f0f0;
	border-radius: 8rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	background-color: #3B9E82;
	border-radius: 8rpx;
}

.action-buttons {
	display: flex;
	justify-content: space-between;
}

.action-btn {
	flex: 1;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	border-radius: 40rpx;
	font-size: 28rpx;
	margin: 0 15rpx;
}

.retry-btn {
	background-color: #f5f5f5;
	color: #666;
}

.save-btn {
	background-color: #3B9E82;
	color: #fff;
}
</style> 