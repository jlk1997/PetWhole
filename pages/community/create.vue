<template>
	<view class="create-post">
		<view class="header">
			<view class="back-btn" @click="navBack">
				<text>取消</text>
			</view>
			<text class="title">{{ isEditMode ? '编辑动态' : '发布动态' }}</text>
			<view class="submit-btn" @click="submitPost">
				<text>{{ isEditMode ? '更新' : '发布' }}</text>
			</view>
		</view>
		
		<view class="content-area">
			<textarea 
				class="post-textarea" 
				v-model="content" 
				placeholder="分享您的遛狗心得..." 
				maxlength="500"
				auto-height
			></textarea>
			
			<!-- 图片上传区域 -->
			<view class="image-upload">
				<view class="image-list">
					<view 
						class="image-item" 
						v-for="(image, index) in images" 
						:key="index"
					>
						<image 
							class="preview" 
							:src="image" 
							mode="aspectFill"
							@click="previewImage(image, index)"
						></image>
						<text 
							class="delete-btn" 
							@click="removeImage(index)"
						>×</text>
					</view>
					
					<view 
						class="add-image" 
						v-if="images.length < 6" 
						@click="chooseImage"
					>
						<text class="add-icon">+</text>
					</view>
				</view>
				
				<!-- 多图测试按钮 -->
				<view class="test-btn" @click="testMultipleImages" v-if="images.length === 0">
					<text>选择多张图片测试</text>
				</view>
			</view>
			
			<view class="char-counter">
				<text>{{ content.length }}/500</text>
			</view>
			
			<!-- 遛狗记录卡片 -->
			<view class="walk-record-card" v-if="walkRecord">
				<view class="card-header">
					<text class="card-icon">🐾</text>
					<text class="card-title">遛狗记录</text>
				</view>
				<view class="card-content">
					<view class="card-item">
						<text class="item-label">距离</text>
						<text class="item-value">{{ (walkRecord.distance / 1000).toFixed(2) }}公里</text>
					</view>
					<view class="card-item">
						<text class="item-label">时长</text>
						<text class="item-value">{{ formatDuration(walkRecord.duration) }}</text>
					</view>
					<view class="card-item" v-if="walkRecord.pet">
						<text class="item-label">宠物</text>
						<view class="pet-info">
							<image v-if="walkRecord.pet.avatar" class="pet-avatar" :src="walkRecord.pet.avatar" mode="aspectFill"></image>
							<text class="pet-name">{{ walkRecord.pet.name || '未命名宠物' }}</text>
						</view>
					</view>
				</view>
				<view class="share-motivation">
					<text class="motivation-text">分享遛狗记录可以激励其他铲屎官也加入运动!</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, onMounted } from 'vue';

export default {
	setup() {
		const content = ref('');
		const images = ref([]);
		const isSubmitting = ref(false);
		const walkRecord = ref(null); // 存储关联的遛狗记录数据
		const userLocation = ref(null); // 存储用户位置
		const isEditMode = ref(false); // 是否是编辑模式
		const editPostId = ref(''); // 编辑的帖子ID
		
		// 获取用户位置
		const getUserLocation = () => {
			uni.getLocation({
				type: 'gcj02',
				success: (res) => {
					console.log('获取位置成功:', res);
					userLocation.value = {
						type: "Point",
						coordinates: [res.longitude, res.latitude]
					};
				},
				fail: (err) => {
					console.error('获取位置失败:', err);
					// 设置默认位置
					userLocation.value = {
						type: "Point",
						coordinates: [116.3, 39.9] // 默认北京坐标
					};
				}
			});
		};
		
		// 初始化时获取位置
		getUserLocation();
		
		// 返回上一页
		const navBack = () => {
			uni.navigateBack();
		};
		
		// 选择图片
		const chooseImage = () => {
			uni.chooseImage({
				count: 6 - images.value.length,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					images.value = [...images.value, ...res.tempFilePaths];
				}
			});
		};
		
		// 移除图片
		const removeImage = (index) => {
			images.value.splice(index, 1);
		};
		
		// 预览图片
		const previewImage = (image, index) => {
			uni.previewImage({
				urls: images.value,
				current: index,
				indicator: 'number',
				loop: true,
				longPressActions: {
					itemList: ['保存图片', '取消'],
					success: function(data) {
						if (data.tapIndex === 0) {
							// 保存图片
							uni.saveImageToPhotosAlbum({
								filePath: images.value[index],
								success: function() {
									uni.showToast({
										title: '图片已保存',
										icon: 'success'
									});
								},
								fail: function() {
									uni.showToast({
										title: '保存失败',
										icon: 'none'
									});
								}
							});
						}
					}
				}
			});
		};
		
		// 接收来自遛狗页面的预填数据
		uni.$on('createPost', (data) => {
			console.log('收到预填内容:', data);
			if (data && data.content) {
				content.value = data.content;
			}
			
			if (data && data.walkRecord) {
				walkRecord.value = data.walkRecord;
				console.log('设置遛狗记录:', walkRecord.value);
			}
		});
		
		// 格式化时长显示
		const formatDuration = (seconds) => {
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			const secs = seconds % 60;
			
			let result = '';
			if (hours > 0) {
				result += `${hours}小时`;
			}
			if (minutes > 0 || hours > 0) {
				result += `${minutes}分钟`;
			}
			result += `${secs}秒`;
			
			return result;
		};
		
		// 提交帖子
		const submitPost = async () => {
			if (!content.value.trim()) {
				uni.showToast({
					title: '请输入内容',
					icon: 'none'
				});
				return;
			}
			
			if (isSubmitting.value) return;
			isSubmitting.value = true;
			
			// 显示加载提示
			uni.showLoading({
				title: isEditMode.value ? '更新中...' : '发布中...'
			});
			
			// 如果没有位置信息，再尝试获取一次
			if (!userLocation.value) {
				try {
					await new Promise((resolve) => {
						uni.getLocation({
							type: 'gcj02',
							success: (res) => {
								userLocation.value = {
									type: "Point",
									coordinates: [res.longitude, res.latitude]
								};
								console.log('发帖前获取位置成功:', userLocation.value);
								resolve();
							},
							fail: (err) => {
								console.error('发帖前获取位置失败:', err);
								// 使用默认位置
								userLocation.value = {
									type: "Point",
									coordinates: [116.3, 39.9]
								};
								resolve();
							}
						});
					});
				} catch (e) {
					console.error('获取位置过程中出错:', e);
					// 确保有默认位置
					userLocation.value = {
						type: "Point",
						coordinates: [116.3, 39.9]
					};
				}
			}
			
			// 创建帖子数据，确保符合后端期望的格式
			const postData = {
				content: content.value,
				// 不包含walkData字段，可能是此字段导致验证问题
				// 如果有遛狗数据，使用其关联ID
				walkRecord: walkRecord.value ? {
					_id: walkRecord.value._id,
					distance: walkRecord.value.distance,
					duration: walkRecord.value.duration,
					pet: walkRecord.value.pet
				} : null,
				// GeoJSON格式的位置
				location: {
					type: "Point", 
					coordinates: userLocation.value ? 
						userLocation.value.coordinates : [116.3, 39.9]
				}
			};
			
			console.log(`准备${isEditMode.value ? '更新' : '发送'}的帖子数据:`, postData);
			
			try {
				// 检查API是否可用
				if (!uni.$api || !uni.$api.community) {
					throw new Error('社区API未初始化');
				}
				
				let result;
				
				// 根据模式决定是更新还是创建帖子
				if (isEditMode.value && editPostId.value) {
					// 更新帖子
					result = await uni.$api.community.updatePost(editPostId.value, postData);
					console.log('更新帖子成功，结果:', result);
				} else {
					// 创建新帖子
					result = await uni.$api.community.createPost(postData);
					console.log('发布帖子成功，结果:', result);
				}
				
				// 获取帖子ID（无论是编辑还是新建）
				const postId = editPostId.value || (result && result._id) || (result && result.id) || (result && result.data && result.data._id);
				
				// 验证帖子ID是否有效
				if (!postId) {
					console.error('无法获取有效的帖子ID:', result);
					throw new Error('创建帖子成功但无法获取帖子ID');
				}
				
				console.log('获取到的帖子ID:', postId);
				
				// 如果有图片要上传
				if (images.value && images.value.length > 0 && postId) {
					console.log('准备上传帖子图片, 帖子ID:', postId);
					
					try {
						// 跟踪所有上传的图片URL
						const uploadedImageUrls = [];
						
						// 上传所有图片
						for (let i = 0; i < images.value.length; i++) {
							// 只上传新添加的本地图片（以blob:或file:开头）
							if (images.value[i].startsWith('blob:') || 
								images.value[i].startsWith('file:') || 
								!images.value[i].startsWith('http')) {
								uni.showLoading({
									title: `上传图片 ${i+1}/${images.value.length}...`
								});
								
								try {
									// 上传图片
									const result = await uni.$api.community.uploadPostImage(postId, images.value[i]);
									console.log(`图片 ${i+1} 上传成功:`, result);
									
									// 收集上传成功的图片URL
									if (result && result.url) {
										uploadedImageUrls.push(result.url);
									}
								} catch (uploadErr) {
									console.error(`图片 ${i+1} 上传失败:`, uploadErr);
									// 在上传失败时显示提示
									uni.showToast({
										title: `图片 ${i+1} 上传失败，将继续上传其他图片`,
										icon: 'none',
										duration: 2000
									});
									
									// 如果是网络错误，尝试保存本地路径，以便后续上传
									try {
										if (typeof images.value[i] === 'string' && 
											(images.value[i].startsWith('file://') || 
											 images.value[i].startsWith('/storage/'))) {
											console.log(`尝试保存本地图片路径: ${images.value[i]}`);
											uploadedImageUrls.push(images.value[i]);
										}
									} catch (e) {
										console.error('保存本地图片路径失败:', e);
									}
								}
							} else if (images.value[i].startsWith('http') || images.value[i].startsWith('/uploads')) {
								// 保留已有的图片URL
								uploadedImageUrls.push(images.value[i]);
							}
						}
						
						// 所有图片上传完成后，一次性更新帖子的图片字段
						if (uploadedImageUrls.length > 0) {
							console.log('所有图片上传完成，更新帖子图片字段:', uploadedImageUrls);
							try {
								// 确保上传的图片URLs是数组形式
								const imageData = Array.isArray(uploadedImageUrls) ? 
									{ images: uploadedImageUrls } : 
									{ images: [uploadedImageUrls] };
								
								console.log('发送更新帖子请求，数据:', imageData);
								
								// 再次验证postId的有效性
								if (typeof postId !== 'string' || !postId.trim()) {
									console.error('更新图片时发现帖子ID无效:', postId);
									throw new Error('帖子ID无效，无法更新图片');
								}
								
								// 检查是否是编辑模式
								if (isEditMode.value) {
									// 编辑模式下才需要更新帖子图片
									await uni.$api.community.updatePost(postId, imageData);
									console.log('更新帖子图片成功');
								} else {
									// 发布新帖时，不需要额外更新帖子，因为创建成功后图片已经处理好了
									console.log('发布新帖模式，跳过更新帖子图片步骤');
								}
							} catch (updateErr) {
								console.error('更新帖子图片字段失败:', updateErr);
								// 由于图片已经上传成功，这里的错误不影响整体流程，只记录日志
							}
						}
					} catch (uploadError) {
						console.error('上传图片过程中出错:', uploadError);
						// 图片上传失败不影响帖子发布成功
					}
				}
				
				// 隐藏加载提示
				uni.hideLoading();
				
				// 显示成功提示
				uni.showToast({
					title: isEditMode.value ? '更新成功' : '发布成功',
					icon: 'success'
				});
				
				// 延迟返回
				setTimeout(() => {
					uni.navigateBack();
				}, 1500);
			} catch (error) {
				// 隐藏加载提示
				uni.hideLoading();
				
				// 显示错误提示
				uni.showToast({
					title: '发布失败: ' + (error.message || '未知错误'),
					icon: 'none',
					duration: 2000
				});
				
				console.error('发布帖子失败', error);
			} finally {
				isSubmitting.value = false;
			}
		};
		
		// 在组件卸载时取消事件监听
		uni.$once('hook:beforeDestroy', () => {
			uni.$off('createPost');
		});
		
		// 加载原帖子数据
		const loadPostData = async (postId) => {
			try {
				uni.showLoading({ title: '加载帖子数据...' });
				
				// 首先检查是否有缓存的帖子数据
				const cacheKey = `post_cache_${postId}_`;
				let postData = null;
				
				// 查找所有以post_cache_开头的缓存项
				const storage = uni.getStorageInfoSync();
				const keys = storage.keys || [];
				
				for (const key of keys) {
					if (key.startsWith(cacheKey)) {
						try {
							const cachedData = uni.getStorageSync(key);
							if (cachedData) {
								postData = JSON.parse(cachedData);
								console.log('找到缓存的帖子数据:', postData);
								break;
							}
						} catch (e) {
							console.error('解析缓存数据失败:', e);
						}
					}
				}
				
				// 如果没有缓存数据，尝试从API获取
				if (!postData) {
					try {
						// 检查API是否有getPostDetail方法
						if (uni.$api && uni.$api.community && typeof uni.$api.community.getPostDetail === 'function') {
							postData = await uni.$api.community.getPostDetail(postId);
							console.log('API获取帖子数据成功:', postData);
						} else {
							console.warn('API中没有getPostDetail方法，尝试从页面参数获取');
							
							// 尝试从当前页面参数中获取帖子数据
							const pages = getCurrentPages();
							const currentPage = pages[pages.length - 1];
							const options = currentPage.options || {};
							
							if (options.postKey) {
								try {
									const cachedPost = uni.getStorageSync(options.postKey);
									if (cachedPost) {
										postData = JSON.parse(cachedPost);
										console.log('从页面参数缓存获取帖子数据:', postData);
									}
								} catch (e) {
									console.error('解析页面参数缓存数据失败:', e);
								}
							}
						}
					} catch (error) {
						console.error('从API获取帖子数据失败:', error);
						
						// 尝试从当前页面参数中获取帖子数据
						const pages = getCurrentPages();
						const currentPage = pages[pages.length - 1];
						const options = currentPage.options || {};
						
						if (options.postKey) {
							try {
								const cachedPost = uni.getStorageSync(options.postKey);
								if (cachedPost) {
									postData = JSON.parse(cachedPost);
									console.log('从页面参数缓存获取帖子数据:', postData);
								}
							} catch (e) {
								console.error('解析页面参数缓存数据失败:', e);
							}
						}
					}
				}
				
				if (postData) {
					// 填充帖子内容
					content.value = postData.content || '';
					
					// 填充图片
					if (postData.images && postData.images.length > 0) {
						images.value = [...postData.images];
					}
					
					// 填充遛狗记录
					if (postData.walkRecord) {
						walkRecord.value = postData.walkRecord;
					}
					
					// 填充位置信息
					if (postData.location) {
						userLocation.value = postData.location;
					}
				} else {
					uni.showToast({
						title: '获取帖子失败',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('加载帖子数据失败:', error);
				uni.showToast({
					title: '加载帖子数据失败',
					icon: 'none'
				});
			} finally {
				uni.hideLoading();
			}
		};
		
		// 页面加载时处理
		onMounted(() => {
			const pages = getCurrentPages();
			const currentPage = pages[pages.length - 1];
			const options = currentPage.options || {};
			
			console.log('页面参数:', options);
			
			// 检查是否是编辑模式
			if (options.mode === 'edit' && options.id) {
				isEditMode.value = true;
				editPostId.value = options.id;
				
				// 如果有postKey，直接从缓存中加载帖子数据
				if (options.postKey) {
					try {
						const cachedPost = uni.getStorageSync(options.postKey);
						if (cachedPost) {
							const postData = JSON.parse(cachedPost);
							console.log('从传入的缓存键加载帖子数据:', postData);
							
							// 填充帖子内容
							content.value = postData.content || '';
							
							// 填充图片
							if (postData.images && postData.images.length > 0) {
								images.value = [...postData.images];
							}
							
							// 填充遛狗记录
							if (postData.walkRecord) {
								walkRecord.value = postData.walkRecord;
							}
							
							// 填充位置信息
							if (postData.location) {
								userLocation.value = postData.location;
							}
						} else {
							// 如果缓存为空，回退到常规加载
							loadPostData(options.id);
						}
					} catch (e) {
						console.error('解析缓存数据失败:', e);
						// 解析失败时回退到常规加载
						loadPostData(options.id);
					}
				} else {
					// 没有缓存键时使用常规加载
					loadPostData(options.id);
				}
			}
		});
		
		// 测试多张图片上传
		const testMultipleImages = () => {
			// 一次性选择多张图片
			uni.chooseImage({
				count: 6, // 一次最多6张
				sizeType: ['original', 'compressed'],
				sourceType: ['album'],
				success: (res) => {
					console.log('选择了多张图片:', res.tempFilePaths);
					images.value = [...res.tempFilePaths];
					// 添加默认文本
					if (!content.value) {
						content.value = "测试多图上传功能，这是一个包含多张图片的帖子";
					}
					uni.showToast({
						title: `已选择${res.tempFilePaths.length}张图片`,
						icon: 'none'
					});
				}
			});
		};
		
		return {
			content,
			images,
			isSubmitting,
			walkRecord,
			userLocation,
			isEditMode,
			editPostId,
			formatDuration,
			navBack,
			chooseImage,
			removeImage,
			previewImage,
			submitPost,
			loadPostData,
			testMultipleImages
		};
	}
}
</script>

<style>
.create-post {
	height: 100vh;
	background-color: #fff;
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	border-bottom: 1px solid #eee;
}

.back-btn, .submit-btn {
	font-size: 28rpx;
	padding: 10rpx 20rpx;
}

.back-btn {
	color: #666;
}

.submit-btn {
	color: #3B9E82;
	font-weight: bold;
}

.title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.content-area {
	flex: 1;
	padding: 30rpx;
	position: relative;
}

.post-textarea {
	width: 100%;
	min-height: 300rpx;
	font-size: 28rpx;
	line-height: 1.6;
}

/* 图片上传区域 */
.image-upload {
	margin-top: 20rpx;
}

.image-list {
	display: flex;
	flex-wrap: wrap;
}

.image-item, .add-image {
	width: 220rpx;
	height: 220rpx;
	margin-right: 20rpx;
	margin-bottom: 20rpx;
	border-radius: 10rpx;
	overflow: hidden;
	position: relative;
}

.preview {
	width: 100%;
	height: 100%;
}

.delete-btn {
	position: absolute;
	top: 5rpx;
	right: 5rpx;
	width: 40rpx;
	height: 40rpx;
	border-radius: 20rpx;
	background-color: rgba(0,0,0,0.5);
	color: #fff;
	display: flex;
	justify-content: center;
	align-items: center;
	font-size: 32rpx;
	line-height: 1;
}

.add-image {
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: #f5f5f5;
	border: 1px dashed #ddd;
}

.add-icon {
	font-size: 60rpx;
	color: #999;
}

.char-counter {
	position: absolute;
	bottom: 30rpx;
	right: 30rpx;
	color: #999;
	font-size: 24rpx;
}

/* 遛狗记录卡片样式 */
.walk-record-card {
	margin-top: 30rpx;
	border-radius: 10rpx;
	background-color: #f8f8f8;
	border: 1px solid #eee;
	padding: 20rpx;
}

.card-header {
	border-bottom: 1px solid #eee;
	padding-bottom: 15rpx;
	margin-bottom: 15rpx;
}

.card-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #3B9E82;
}

.card-content {
	display: flex;
	justify-content: space-between;
}

.card-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.item-label {
	font-size: 24rpx;
	color: #666;
	margin-bottom: 5rpx;
}

.item-value {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.card-icon {
	font-size: 32rpx;
	color: #3B9E82;
	margin-right: 10rpx;
}

.pet-info {
	display: flex;
	align-items: center;
}

.pet-avatar {
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	margin-right: 10rpx;
}

.pet-name {
	font-size: 24rpx;
	color: #666;
}

.share-motivation {
	margin-top: 20rpx;
	padding: 20rpx;
	border-radius: 10rpx;
	background-color: #f8f8f8;
	border: 1px solid #eee;
}

.motivation-text {
	font-size: 28rpx;
	color: #666;
}

.test-btn {
	margin: 20rpx 0;
	padding: 20rpx;
	background-color: #f0f9f2;
	border: 1px dashed #3B9E82;
	border-radius: 10rpx;
	display: flex;
	justify-content: center;
	text-align: center;
}

.test-btn text {
	color: #3B9E82;
	font-size: 28rpx;
}

.test-btn:active {
	background-color: #e0f5e9;
}
</style> 