<template>
	<view class="marker-album-container">
		<!-- 顶部安全区域 -->
		<view class="safe-area-top"></view>
		
		<!-- 顶部返回按钮 - 更加突出 -->
		<view class="back-button" @click="goBack">
			<!-- 使用文本代替图标避免组件问题 -->
			<text class="back-icon">←</text>
			<!-- <text class="back-text">返回</text> -->
		</view>
		
		<!-- 主内容区域 - 画册风格 -->
		<swiper class="main-swiper" 
			:current="currentPage" 
			@change="onPageChange"
			:indicator-dots="false"
			:duration="400">
			
			<!-- 合并的封面和详情页 -->
			<swiper-item>
				<scroll-view class="album-combined" scroll-y>
					<!-- 封面图片 -->
					<view class="combined-cover">
						<image 
							class="cover-image" 
							:src="marker.images && marker.images.length > 0 ? getImageUrl(marker.images[0].url) : '/static/images/default-cover.jpg'" 
							mode="aspectFill">
						</image>
						<view class="cover-overlay"></view>
						<view class="cover-content">
							<text class="cover-title">{{ marker.title || '未命名标记' }}</text>
							<view class="cover-creator">
								<!-- 添加加载状态显示 -->
								<view v-if="isLoadingUser" class="loading-user">
									<text>加载用户信息...</text>
								</view>
								<block v-else>
									<image class="creator-avatar" :src="getUserAvatar(marker.user)" mode="aspectFill"></image>
									<text class="creator-name">{{ getUserName(marker.user) }}</text>
								</block>
							</view>
							<text class="cover-time">{{ formatTime(marker.createdAt) }}</text>
							<view class="cover-type-tag">
								<text>{{ getMarkerTypeName(marker.type) }}</text>
							</view>
						</view>
					</view>
					
					<!-- 详情描述部分 -->
					<view class="combined-detail">
						<view class="detail-header">
							<text class="detail-title">详情描述</text>
						</view>
						
						<view class="detail-content">
							<text class="detail-text">{{ marker.description || '暂无描述内容' }}</text>
						</view>
						
						<view class="detail-info">
							<view class="info-row">
								<text class="info-label">标记类型</text>
								<text class="info-value">{{ getMarkerTypeName(marker.type) }}</text>
							</view>
							<view class="info-row" v-if="marker.radius">
								<text class="info-label">覆盖半径</text>
								<text class="info-value">{{ marker.radius }}米</text>
							</view>
							<view class="info-row">
								<text class="info-label">创建时间</text>
								<text class="info-value">{{ formatTime(marker.createdAt) }}</text>
							</view>
							
							<!-- 添加创建者信息 -->
							<view class="info-row" v-if="!isLoadingUser">
								<text class="info-label">创建者</text>
								<text class="info-value">{{ getUserName(marker.user) }}</text>
							</view>
						</view>
						
						<view class="navigation-hint" v-if="marker.images && marker.images.length > 0">
							<text>向左滑动查看照片</text>
							<text class="arrow-icon">→</text>
						</view>
					</view>
				</scroll-view>
			</swiper-item>
			
			<!-- 图片浏览页 -->
			<swiper-item v-if="marker.images && marker.images.length > 0">
				<view class="album-photos">
					<swiper class="photos-swiper" 
						:indicator-dots="true" 
						:autoplay="false" 
						:duration="300"
						:current="currentPhotoIndex"
						@change="onPhotoChange">
						<swiper-item v-for="(image, index) in marker.images" :key="index" @click="previewImage(index)">
							<view class="photo-container">
								<image class="photo-image" :src="getImageUrl(image.url)" mode="aspectFit"></image>
								<view class="photo-caption-container">
									<text class="photo-caption">{{ image.caption || '无描述' }}</text>
									<text class="photo-index">{{ index + 1 }}/{{ marker.images.length }}</text>
								</view>
							</view>
						</swiper-item>
					</swiper>
				</view>
			</swiper-item>
			
			<!-- 无图片提示 -->
			<swiper-item v-else>
				<view class="no-photos">
					<text class="no-photos-icon">🖼️</text>
					<text class="no-photos-text">暂无照片</text>
				</view>
			</swiper-item>
		</swiper>
		
		<!-- 底部导航条 -->
		<view class="album-footer">
			<view class="footer-dots">
				<view 
					v-for="(dot, index) in totalPages" 
					:key="index" 
					class="footer-dot"
					:class="{ active: currentPage === index }"
					@click="goToPage(index)">
				</view>
			</view>
			
			<button class="navigate-btn" @click="navigateToMarker">
				<text class="location-icon">📍</text>
				<text>导航到此处</text>
			</button>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue';
import { useMarkerStore } from '@/stores/markerStore.js';
import { useUserStore } from '@/store/user.js';

export default {
	setup() {
		const marker = ref({});
		const markerStore = useMarkerStore();
		const userStore = useUserStore();
		const isLoadingUser = ref(false);
		const userError = ref(null);
		
		// 页面控制
		const currentPage = ref(0);
		const currentPhotoIndex = ref(0);
		
		// 计算总页数 - 现在只有两页：合并页 + 图片页(只有有图片时才有)
		const totalPages = computed(() => {
			// 合并页 + 图片页(只有有图片时才有)
			return marker.value.images && marker.value.images.length > 0 ? 2 : 1;
		});
		
		// 页面切换处理
		const onPageChange = (e) => {
			currentPage.value = e.detail.current;
		};
		
		// 图片切换处理
		const onPhotoChange = (e) => {
			currentPhotoIndex.value = e.detail.current;
		};
		
		// 跳转到指定页
		const goToPage = (index) => {
			currentPage.value = index;
		};
		
		// 获取标记详情
		onMounted(async () => {
			try {
				console.log('页面加载，准备获取标记详情');
				const pages = getCurrentPages();
				const currentPage = pages[pages.length - 1];
				const markerId = currentPage?.options?.id;
				
				if (!markerId) {
					throw new Error('没有指定标记ID');
				}
				
				console.log('开始获取标记详情，标记ID:', markerId);
				
				// 优先从store中获取
				const selectedMarker = markerStore.selectedMarker;
				if (selectedMarker && selectedMarker._id === markerId) {
					console.log('从store获取标记数据');
					marker.value = selectedMarker;
					console.log('标记数据:', JSON.stringify(marker.value, null, 2));
					
					// 检查用户信息是否需要获取
					if (marker.value.user) {
						if (typeof marker.value.user === 'string') {
							console.log('用户信息只有ID，需要获取详情:', marker.value.user);
							await fetchUserInfo(marker.value.user);
						} else {
							console.log('已有完整用户信息:', marker.value.user);
						}
					} else {
						console.log('标记没有用户信息');
					}
				} else {
					// 从API直接获取标记数据
					console.log('从API获取标记详情');
					await getMarkerFromApi(markerId);
				}
			} catch (error) {
				console.error('标记详情页面初始化失败:', error);
				uni.showToast({
					title: '获取标记信息失败',
					icon: 'none'
				});
			}
		});
		
		// 从API获取标记
		const getMarkerFromApi = (markerId) => {
			return new Promise((resolve, reject) => {
				console.log('从API获取标记，ID:', markerId);
				uni.request({
					url: `/api/markers/${markerId}`,
					method: 'GET',
					header: {
						'Authorization': `Bearer ${userStore.token}`
					},
					success: async (response) => {
						try {
							// 检查响应状态码和数据
							if (response.statusCode === 200 && response.data) {
								// 根据API的实际返回格式处理
								if (response.data.success && response.data.data) {
									// 如果API返回格式包含success和data字段
									marker.value = response.data.data;
								} else {
									// 如果API直接返回标记数据
									marker.value = response.data;
								}
								console.log('标记数据获取成功:', marker.value);
								
								// 如果只有用户ID，获取用户详情
								if (marker.value.user && typeof marker.value.user === 'string') {
									console.log('需要获取用户详情，用户ID:', marker.value.user);
									await fetchUserInfo(marker.value.user);
								} else if (marker.value.user) {
									console.log('标记包含完整用户信息:', marker.value.user);
								} else {
									console.log('标记没有用户信息');
								}
								
								resolve(marker.value);
							} else {
								const errMsg = response.data?.message || '获取标记失败';
								console.error('API响应错误:', errMsg);
								reject(new Error(errMsg));
							}
						} catch (err) {
							console.error('处理API响应时出错:', err);
							reject(err);
						}
					},
					fail: (error) => {
						console.error('API请求失败:', error);
						reject(error);
					}
				});
			});
		};
		
		// 获取用户详细信息
		const fetchUserInfo = async (userId) => {
			isLoadingUser.value = true;
			userError.value = null;
			
			try {
				console.log('开始获取用户信息，ID:', userId);
				
				return new Promise((resolve, reject) => {
					uni.request({
						url: `/api/users/${userId}`,
						method: 'GET',
						header: {
							'Authorization': `Bearer ${userStore.token}`
						},
						success: (response) => {
							// 正确处理用户API的响应格式 - 直接使用响应数据，不需要检查success和data字段
							if (response.statusCode === 200 && response.data) {
								// 更新标记中的用户信息为完整对象
								marker.value.user = response.data;
								console.log('用户信息获取成功:', marker.value.user);
								resolve(marker.value.user);
							} else {
								const errorMsg = response.data?.message || '获取用户信息失败';
								console.error('获取用户信息API响应错误:', errorMsg);
								userError.value = new Error(errorMsg);
								// 使用备用信息
								marker.value.user = { 
									username: '用户' + userId.substr(-4),
									nickname: '未知用户'
								};
								resolve(null);
							}
						},
						fail: (error) => {
							console.error('获取用户信息请求失败:', error);
							userError.value = error;
							// 使用备用信息
							marker.value.user = { 
								username: '用户' + userId.substr(-4),
								nickname: '未知用户'
							};
							resolve(null);
						},
						complete: () => {
							isLoadingUser.value = false;
						}
					});
				});
			} catch (error) {
				console.error('获取用户信息处理失败:', error);
				userError.value = error;
				isLoadingUser.value = false;
				// 提供备用用户数据
				marker.value.user = { 
					username: userId ? ('用户' + userId.substr(-4)) : '未知用户',
					nickname: '未知用户'
				};
				return null;
			}
		};
		
		// 获取用户头像
		const getUserAvatar = (user) => {
			if (!user) return '/static/images/default-avatar.png';
			
			if (typeof user === 'string') {
				return '/static/images/default-avatar.png';
			}
			
			// 使用user对象中的avatar字段
			const avatarUrl = user.avatar || '/static/images/default-avatar.png';
			return getFullUrl(avatarUrl);
		};
		
		// 获取用户名称
		const getUserName = (user) => {
			if (!user) return '未知用户';
			
			if (typeof user === 'string') {
				return '用户' + user.substr(-4);
			}
			
			// 优先使用昵称，其次使用用户名
			return user.nickname || user.username || '未知用户';
		};
		
		// 获取标记类型名称
		const getMarkerTypeName = (type) => {
			const typeMap = {
				'general': '普通标记',
				'pet_friendly': '宠物友好',
				'danger': '危险区域',
				'scenic': '风景区',
				'pet_service': '宠物服务',
				'custom': '自定义'
			};
			return typeMap[type] || '未知类型';
		};
		
		// 格式化时间
		const formatTime = (timestamp) => {
			if (!timestamp) return '未知时间';
			
			const date = new Date(timestamp);
			return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
		};
		
		// 获取完整URL
		const getFullUrl = (url) => {
			if (!url) return '/static/images/default-avatar.png';
			
			// 如果已经是完整URL，直接返回
			if (url.startsWith('http://') || url.startsWith('https://')) {
				return url;
			}
			
			try {
				// 获取基础API URL - 使用localStorage中存储的BASE_URL
				let baseUrl = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
				
				// 处理相对路径
				if (url.startsWith('/')) {
					return baseUrl + url;
				} else if (url.startsWith('static/')) {
					// 处理静态资源路径
					return '/' + url;
				} else {
					return baseUrl + '/' + url;
				}
			} catch (error) {
				console.error('URL处理错误:', error, url);
				// 如果处理出错，返回相对路径
				return url.startsWith('/') ? url : '/' + url;
			}
		};
		
		// 获取图片完整URL
		const getImageUrl = (url) => {
			if (!url) return '/static/images/default-cover.jpg';
			
			try {
				// 如果已经是完整URL，直接返回
				if (url.startsWith('http://') || url.startsWith('https://')) {
					return url;
				}
				
				// 处理相对路径
				return getFullUrl(url);
			} catch (error) {
				console.error('图片URL处理错误:', error, url);
				return '/static/images/default-cover.jpg';
			}
		};
		
		// 预览图片
		const previewImage = (index) => {
			if (!marker.value.images || marker.value.images.length === 0) return;
			
			const urls = marker.value.images.map(img => getImageUrl(img.url));
			uni.previewImage({
				urls,
				current: index
			});
		};
		
		// 返回上一页
		const goBack = () => {
			uni.navigateBack();
		};
		
		// 导航到标记位置
		const navigateToMarker = () => {
			// 向上一页发送导航事件
			const pages = getCurrentPages();
			const prevPage = pages[pages.length - 2];
			
			if (prevPage && prevPage.$vm && prevPage.$vm.navigateToLocation) {
				// 如果上一页有导航方法，直接调用
				prevPage.$vm.navigateToLocation(marker.value);
				setTimeout(() => {
					uni.navigateBack();
				}, 500);
			} else {
				// 直接返回，让地图页处理
				uni.setStorageSync('navigate_to_marker', marker.value);
				uni.navigateBack();
			}
		};
		
		return {
			marker,
			isLoadingUser,
			userError,
			currentPage,
			currentPhotoIndex,
			totalPages,
			getMarkerTypeName,
			formatTime,
			getImageUrl,
			getUserAvatar,
			getUserName,
			previewImage,
			goBack,
			navigateToMarker,
			onPageChange,
			onPhotoChange,
			goToPage
		};
	}
}
</script>

<style scoped>
.marker-album-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #000000;
	position: relative;
}

.safe-area-top {
	height: var(--status-bar-height, 20px);
	width: 100%;
	background-color: #000000;
}

.back-button {
	position: fixed;
	top: calc(var(--status-bar-height, 20px) + 10px);
	left: 15px;
	z-index: 999;
	width: 90px;
	height: 44px;
	border-radius: 22px;
	background-color: rgba(0, 0, 0, 0.7);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.back-icon {
	font-size: 26px;
	color: #FFFFFF;
	margin-right: 4px;
}

.back-text {
	color: #FFFFFF;
	font-size: 14px;
}

.main-swiper {
	flex: 1;
	height: calc(100vh - 60px - var(--status-bar-height, 20px));
}

/* 合并页样式 */
.album-combined {
	width: 100%;
	height: 100%;
	background-color: #FFFFFF;
}

.combined-cover {
	width: 100%;
	height: 50vh;
	position: relative;
}

.cover-image {
	width: 100%;
	height: 100%;
}

.cover-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%);
}

.cover-content {
	position: absolute;
	bottom: 20px;
	left: 20px;
	right: 20px;
	color: #FFFFFF;
}

.cover-title {
	font-size: 28px;
	font-weight: bold;
	margin-bottom: 20px;
	text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.cover-creator {
	display: flex;
	align-items: center;
	margin-bottom: 10px;
	background-color: rgba(0, 0, 0, 0.3);
	padding: 8px 12px;
	border-radius: 18px;
}

.loading-user {
	background-color: rgba(255,255,255,0.2);
	padding: 5px 10px;
	border-radius: 15px;
}

.creator-avatar {
	width: 36px;
	height: 36px;
	border-radius: 18px;
	border: 2px solid #FFFFFF;
	margin-right: 10px;
}

.creator-name {
	font-size: 16px;
	color: #FFFFFF;
	text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.cover-time {
	font-size: 14px;
	color: rgba(255,255,255,0.8);
	margin-bottom: 15px;
}

.cover-type-tag {
	display: inline-block;
	padding: 4px 12px;
	background-color: rgba(255,255,255,0.2);
	border-radius: 16px;
	font-size: 14px;
	margin-top: 10px;
}

/* 合并详情部分样式 */
.combined-detail {
	padding: 20px;
	background-color: #FFFFFF;
}

.detail-header {
	margin-bottom: 20px;
	padding-bottom: 10px;
	border-bottom: 1px solid #EEEEEE;
}

.detail-title {
	font-size: 20px;
	font-weight: bold;
	color: #333333;
}

.detail-content {
	margin-bottom: 30px;
}

.detail-text {
	font-size: 16px;
	line-height: 1.6;
	color: #333333;
}

.detail-info {
	background-color: #F8F8F8;
	border-radius: 12px;
	padding: 15px;
	margin-bottom: 20px;
}

.info-row {
	display: flex;
	margin-bottom: 12px;
}

.info-row:last-child {
	margin-bottom: 0;
}

.info-label {
	width: 80px;
	font-size: 14px;
	color: #666666;
}

.info-value {
	flex: 1;
	font-size: 14px;
	color: #333333;
}

.navigation-hint {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	margin-top: 20px;
	color: #666666;
}

.navigation-hint text {
	margin-right: 8px;
	font-size: 14px;
}

/* 图片浏览页样式 */
.album-photos {
	height: 100%;
	background-color: #000000;
}

.photos-swiper {
	height: 100%;
}

.photo-container {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.photo-image {
	width: 100%;
	height: 80%;
	margin-top: 40px;
}

.photo-caption-container {
	padding: 20px;
	background-color: rgba(0,0,0,0.7);
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
}

.photo-caption {
	font-size: 16px;
	color: #FFFFFF;
	display: block;
	margin-bottom: 10px;
}

.photo-index {
	font-size: 12px;
	color: rgba(255,255,255,0.7);
}

/* 无图片提示样式 */
.no-photos {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	height: 100%;
	background-color: #FFFFFF;
}

.no-photos-icon {
	font-size: 50px;
	margin-bottom: 10px;
}

.no-photos-text {
	margin-top: 10px;
	font-size: 16px;
	color: #999999;
}

/* 底部导航样式 */
.album-footer {
	height: 60px;
	background-color: #FFFFFF;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 20px;
	border-top: 1px solid #EEEEEE;
}

.footer-dots {
	display: flex;
	align-items: center;
}

.footer-dot {
	width: 8px;
	height: 8px;
	border-radius: 4px;
	background-color: #DDDDDD;
	margin-right: 8px;
	transition: all 0.3s ease;
}

.footer-dot.active {
	width: 16px;
	background-color: #007AFF;
}

.navigate-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #007AFF;
	color: #FFFFFF;
	height: 36px;
	border-radius: 18px;
	padding: 0 15px;
}

.location-icon {
	margin-right: 4px;
}

.navigate-btn text {
	margin-left: 5px;
}
</style> 