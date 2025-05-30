<template>
	<view class="profile-container">
		<!-- 用户信息卡片 -->
		<view class="user-card">
			<view class="avatar-wrapper">
				<image class="avatar" :src="displayAvatar" mode="aspectFill" @click="changeAvatar"></image>
			</view>
			<view class="user-info">
				<view class="nickname">{{ userStore.nickname }}</view>
				<view class="user-id">ID: {{ userStore.userId }}</view>
			</view>
			<view class="edit-btn" @click="editProfile">
				<text>编辑资料</text>
			</view>
		</view>
		
		<!-- 用户统计 -->
		<view class="stats-card">
			<view class="stat-item" @click="navTo('/pages/walk/history')">
				<text class="stat-value">{{ stats.walkCount || 0 }}</text>
				<text class="stat-label">遛狗次数</text>
			</view>
			<view class="stat-item" @click="navTo('/pages/walk/history')">
				<text class="stat-value">{{ stats.totalDistance || 0 }}</text>
				<text class="stat-label">总距离(KM)</text>
			</view>
			<view class="stat-item" @click="showFollowList('following')">
				<text class="stat-value">{{ stats.following || 0 }}</text>
				<text class="stat-label">关注</text>
			</view>
			<view class="stat-item" @click="showFollowList('followers')">
				<text class="stat-value">{{ stats.followers || 0 }}</text>
				<text class="stat-label">粉丝</text>
			</view>
		</view>
		
		<!-- 宠物列表 -->
		<view class="section">
			<view class="section-header">
				<text class="section-title">我的宠物</text>
				<view class="add-btn" @click="addPet">
					<text>添加宠物</text>
				</view>
			</view>
			
			<view class="pet-list" v-if="petStore.pets.length > 0">
				<view class="pet-item" v-for="pet in petStore.pets" :key="pet.id || pet._id" @click="editPet(pet._id || pet.id)">
					<image class="pet-avatar" :src="formatImageUrl(pet.avatar)" mode="aspectFill"></image>
					<view class="pet-info">
						<text class="pet-name">{{ pet.name }}</text>
						<text class="pet-breed">{{ pet.breed }}</text>
					</view>
					<view class="edit-indicator">
						<text class="edit-arrow">></text>
					</view>
				</view>
			</view>
			
			<view class="empty-list" v-else>
				<text>还没有添加宠物，点击"添加宠物"开始吧！</text>
			</view>
		</view>
		
		<!-- 功能菜单 -->
		<view class="menu-section">
			<view class="menu-item" @click="navTo('/pages/walk/history')">
				<view class="menu-icon walk-icon"></view>
				<text class="menu-text">遛狗记录</text>
				<view class="arrow-icon"></view>
			</view>
			
			<view class="menu-item" @click="navTo('/pages/community/my-posts')">
				<view class="menu-icon post-icon"></view>
				<text class="menu-text">我的动态</text>
				<view class="arrow-icon"></view>
			</view>
			
			<view class="menu-item" @click="navTo('/pages/profile/my-markers')">
				<view class="menu-icon map-icon"></view>
				<text class="menu-text">我的标记</text>
				<view class="arrow-icon"></view>
			</view>
			
			<view class="menu-item" @click="openPetRecognition">
				<view class="menu-icon pet-icon"></view>
				<text class="menu-text">宠物识别</text>
				<view class="arrow-icon"></view>
			</view>
			
			<view class="menu-item" @click="navTo('/pages/profile/settings')">
				<view class="menu-icon settings-icon"></view>
				<text class="menu-text">设置</text>
				<view class="arrow-icon"></view>
			</view>
		</view>
		
		<!-- 登录按钮 -->
		<view class="login-section">
			<button class="login-btn" @click="toggleLogin">
				{{ userStore.isAuthenticated ? '退出登录' : '登录/注册' }}
			</button>
		</view>
	</view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '@/store/user.js';
import { usePetStore } from '@/store/pet.js';
import { showToast, showModal, navigateTo } from '@/utils/ui.js';

const userStore = useUserStore();
const petStore = usePetStore();

const isLoggedIn = ref(false);
const userInfo = ref(null);
const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://49.235.65.37:5000';

// Display avatar with proper URL handling
const displayAvatar = computed(() => {
	const avatar = userStore.userAvatar;
	console.log('当前用户头像路径:', avatar);
	
	// If it's a server-relative URL, add the base URL
	if (avatar && avatar.startsWith('/uploads/')) {
		const fullUrl = apiBaseUrl + avatar;
		console.log('完整头像URL:', fullUrl);
		return fullUrl;
	}
	
	return avatar || '/static/images/default-avatar.png';
});

// 使用computed连接到userStore的stats数据，并提供默认值
const stats = computed(() => {
	return userStore.stats || {
		walkCount: 0,
		totalDistance: 0,
		following: 0,
		followers: 0
	};
});

const pets = ref([]);

/**
 * Load user information from storage
 */
function loadUserInfo() {
	try {
		const token = uni.getStorageSync('token');
		const storedInfo = uni.getStorageSync('userInfo');
		
		if (token && storedInfo) {
			// 更新本地状态
			userInfo.value = JSON.parse(storedInfo);
			isLoggedIn.value = true;
			
			// 确保userStore状态与本地存储同步
			if (!userStore.isAuthenticated) {
				userStore.token = token;
				userStore.user = userInfo.value;
			}
			
			// 如果用户信息中有头像，确保更新
			if (userInfo.value && userInfo.value.avatar && userStore.user) {
				userStore.user.avatar = userInfo.value.avatar;
			}
			
			// 加载用户统计数据
			loadUserStats();
		} else {
			resetUserInfo();
		}
	} catch (e) {
		console.error('加载用户信息失败:', e);
		resetUserInfo();
	}
}

/**
 * Reset user information when not logged in
 */
function resetUserInfo() {
	userInfo.value = null;
	isLoggedIn.value = false;
	
	// 确保userStore也清除状态
	if (userStore.isAuthenticated) {
		userStore.user = null;
		userStore.token = null;
		userStore.stats = null;
	}
}

/**
 * Load user statistics
 */
async function loadUserStats() {
	if (!userStore.isAuthenticated) return;
	
	try {
		// 使用userStore的fetchUserStats方法获取数据
		const statsData = await userStore.fetchUserStats();
		console.log('Loaded user stats:', statsData);
		
		// stats现在是computed属性，自动从userStore获取数据
	} catch (error) {
		console.error('获取用户统计数据失败:', error);
	}
}

/**
 * Load pet data
 */
async function loadPets() {
	if (!userStore.isAuthenticated) return;
	
	try {
		// 使用petStore的fetchPets方法
		await petStore.fetchPets();
	} catch (error) {
		console.error('获取宠物数据失败:', error);
	}
}

/**
 * Toggle login state - login if not logged in, logout if logged in
 */
function toggleLogin() {
	if (userStore.isAuthenticated) {
		showModal({
			title: '退出登录',
			content: '确定要退出登录吗？',
			showCancel: true
		}).then(confirm => {
			if (confirm) {
				// 使用userStore的logout方法
				userStore.logout().then(() => {
					// 确保本地状态也更新
					resetUserInfo();
					showToast('已成功退出登录');
				}).catch(error => {
					console.error('退出登录失败:', error);
					showToast('退出登录失败，请重试');
				});
			}
		});
	} else {
		navigateTo('/pages/login/login');
	}
}

/**
 * Change user avatar
 */
async function changeAvatar() {
	if (!userStore.isAuthenticated) {
		return showToast('请先登录');
	}
	
	try {
		const res = await new Promise((resolve, reject) => {
			uni.chooseImage({
				count: 6,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: resolve,
				fail: reject
			});
		});
		
		const tempFilePaths = res.tempFilePaths;
		
		showToast('上传中...');
		
		// 上传头像
		try {
			// 调用上传API
			const uploadResult = await userStore.uploadAvatar(tempFilePaths);
			
			if (uploadResult && (uploadResult.avatar || (uploadResult.data && uploadResult.data.avatar))) {
				showToast('头像上传成功');
				
				// 刷新用户信息
				await userStore.fetchUserInfo();
			} else {
				showToast('头像上传失败，请重试');
			}
		} catch (error) {
			console.error('头像上传失败:', error);
			showToast('头像上传失败，请重试');
		}
	} catch (error) {
		console.error('选择图片失败:', error);
	}
}

/**
 * Navigate to edit profile page
 */
function editProfile() {
	if (!userStore.isAuthenticated) {
		return showToast('请先登录');
	}
	
	navigateTo('/pages/profile/profile');
}

/**
 * Add a new pet
 */
function addPet() {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	console.log('开始导航到添加宠物页面');
	
	// 导航到宠物编辑页面，指定mode=add
	uni.navigateTo({
		url: '/pages/pet/edit?mode=add',
		success: (res) => {
			console.log('导航到添加宠物页面成功', res);
		},
		fail: (err) => {
			console.error('导航到添加宠物页面失败:', err);
			
			// 尝试使用alternative路径
			uni.navigateTo({
				url: '/pages/pet/edit',
				success: () => {
					console.log('使用简化路径导航成功');
					// 在成功后，尝试设置页面参数
					const pages = getCurrentPages();
					const currentPage = pages[pages.length - 1];
					if (currentPage && currentPage.$vm) {
						currentPage.$vm.mode = 'add';
						console.log('手动设置页面mode=add');
					}
				},
				fail: (e) => {
					console.error('使用简化路径仍然失败:', e);
					
					// 最后尝试一种方法 - 使用宠物管理页面
					uni.navigateTo({
						url: '/pages/pet/management',
						success: () => {
							console.log('导航到宠物管理页面成功');
							showToast('请点击添加宠物按钮');
						},
						fail: () => {
							showToast('页面跳转失败，请稍后再试');
						}
					});
				}
			});
		}
	});
}

/**
 * Navigate to specified page
 */
function navTo(url) {
	if (!isLoggedIn.value && url !== '/pages/login/login') {
		showToast('Please login first');
		return;
	}
	navigateTo(url);
}

/**
 * Edit a pet
 */
function editPet(petId) {
	if (!isLoggedIn.value) {
		showToast('请先登录');
		return;
	}
	navigateTo(`/pages/pet/edit?petId=${petId}&mode=edit`);
}

// 格式化图片URL
function formatImageUrl(url) {
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
}

/**
 * Show following/followers list
 * @param {string} type - 'following' or 'followers'
 */
function showFollowList(type) {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		setTimeout(() => {
			navTo('/pages/login/login');
		}, 1500);
		return;
	}
	
	if (type === 'following') {
		navTo('/pages/profile/following');
	} else if (type === 'followers') {
		navTo('/pages/profile/followers');
	}
}

// Lifecycle hooks
onMounted(() => {
	// 检查用户是否登录
	const token = uni.getStorageSync('token');
	const userInfoStr = uni.getStorageSync('userInfo');
	
	if (!token || !userInfoStr) {
		// 如果未登录，立即跳转到登录页面
		uni.navigateTo({
			url: '/pages/login/login',
			success: () => {
				showToast('请先登录');
			}
		});
		return;
	}
	
	// 初始加载数据
	loadUserInfo();
	
	// 用户已登录，加载宠物数据
	petStore.fetchPets();
	
	// 强制刷新用户信息，确保页面显示最新数据
	if (userStore.token) {
		// 预先显示本地缓存数据
		const storedInfo = uni.getStorageSync('userInfo');
		if (storedInfo) {
			try {
				const parsedInfo = JSON.parse(storedInfo);
				if (parsedInfo && parsedInfo._id) {
					userStore.user = parsedInfo;
					console.log('已从缓存加载用户信息:', parsedInfo);
				}
			} catch (e) {
				console.error('解析存储的用户信息失败:', e);
			}
		}
		
		// 然后从服务器获取最新数据
		setTimeout(() => {
			userStore.fetchUserInfo().then(() => {
				console.log('已从服务器更新用户信息');
			}).catch(err => {
				console.error('从服务器更新用户信息失败:', err);
			});
		}, 500);
	}
});

// uni-app的页面生命周期钩子
function onShow() {
	// 检查用户是否登录
	if (!userStore.isAuthenticated && !uni.getStorageSync('token')) {
		// 如果未登录，跳转到登录页面
		uni.navigateTo({
			url: '/pages/login/login',
			success: () => {
				showToast('请先登录');
			}
		});
		return;
	}
	
	// 每次显示页面时刷新数据
	if (userStore.isAuthenticated) {
		userStore.fetchUserStats();
		petStore.fetchPets();
	} else {
		// 如果未登录但有token，尝试初始化
		const token = uni.getStorageSync('token');
		if (token && !userStore.token) {
			userStore.token = token;
			userStore.init().then(() => {
				// 初始化后如果用户不存在，跳转到登录页面
				if (!userStore.user) {
					uni.navigateTo({
						url: '/pages/login/login'
					});
				}
			});
		}
	}
}

// Add watch to refresh data when userStore changes
watch(() => userStore.user, (newUser) => {
	console.log('User store changed, refresh data');
	if (newUser) {
		// Refresh stats and pets when user changes
		userStore.fetchUserStats();
		petStore.fetchPets();
	}
}, { deep: true });

// 监听宠物列表变化
watch(() => petStore.pets, (newPets) => {
	console.log('Pet list updated, total pets:', newPets.length);
}, { deep: true });

/**
 * Open pet recognition
 */
function openPetRecognition() {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	navigateTo('/pages/pet/recognition');
}

// 处理添加标记
function handleAddMarker() {
	// 检查登录状态
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	// 导航到标记页面
	uni.navigateTo({
		url: '/pages/map/index'
	});
}

// 处理刷新定位
function handleRefreshLocation() {
	// 获取当前位置
	uni.getLocation({
		type: 'gcj02',
		success: (res) => {
			const { latitude, longitude } = res;
			// 更新地图位置
			mapContext.value?.moveToLocation({
				latitude,
				longitude
			});
		},
		fail: () => {
			showToast('获取位置失败');
		}
	});
}
</script>

<style>
.profile-container {
	background-color: #f5f5f5;
	min-height: 100vh;
	padding-bottom: 30rpx;
}

.user-card {
	display: flex;
	align-items: center;
	padding: 40rpx 30rpx;
	background-color: #fff;
	margin-bottom: 20rpx;
}

.avatar-wrapper {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	margin-right: 30rpx;
	overflow: hidden;
	background-color: #f0f0f0;
}

.avatar {
	width: 100%;
	height: 100%;
}

.user-info {
	flex: 1;
}

.nickname {
	font-size: 36rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
}

.user-id {
	font-size: 24rpx;
	color: #999;
}

.edit-btn {
	padding: 10rpx 20rpx;
	background-color: #f0f0f0;
	border-radius: 30rpx;
	font-size: 24rpx;
	color: #666;
}

.stats-card {
	display: flex;
	justify-content: space-around;
	padding: 30rpx 0;
	background-color: #fff;
	margin-bottom: 20rpx;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.stat-value {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
}

.stat-label {
	font-size: 24rpx;
	color: #999;
}

.section {
	background-color: #fff;
	margin-bottom: 20rpx;
	padding: 20rpx 30rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.add-btn {
	font-size: 24rpx;
	color: #3B9E82;
}

.pet-list {
	display: flex;
	flex-direction: column;
}

.pet-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1px solid #f0f0f0;
	transition: background-color 0.2s;
	position: relative;
}

.pet-item:active {
	background-color: #f5f5f5;
}

.pet-item:last-child {
	border-bottom: none;
}

.pet-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 40rpx;
	margin-right: 20rpx;
	border: 2rpx solid #f0f0f0;
}

.pet-info {
	flex: 1;
}

.pet-name {
	font-size: 28rpx;
	font-weight: bold;
	margin-bottom: 6rpx;
	color: #333;
}

.pet-breed {
	font-size: 24rpx;
	color: #999;
}

.empty-list {
	padding: 40rpx 0;
	text-align: center;
	color: #999;
	font-size: 28rpx;
}

.menu-section {
	background-color: #fff;
	margin-bottom: 20rpx;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 30rpx;
	border-bottom: 1px solid #f0f0f0;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 20rpx;
	background-color: #ccc;
}

.walk-icon {
	background-color: transparent;
	background-image: url('../../static/images/walk-icon.png');
	background-size: contain;
	background-repeat: no-repeat;
}

.post-icon {
	background-color: transparent;
	background-image: url('../../static/images/post-icon.png');
	background-size: contain;
	background-repeat: no-repeat;
}

.map-icon {
	background-color: transparent;
	background-image: url('../../static/images/marker.png');
	background-size: contain;
	background-repeat: no-repeat;
}

.pet-icon {
	background-color: transparent;
	background-image: url('../../static/images/pet-icon.png');
	background-size: contain;
	background-repeat: no-repeat;
}

.settings-icon {
	background-color: transparent;
	background-image: url('../../static/images/settings-icon.png');
	background-size: contain;
	background-repeat: no-repeat;
}

.menu-text {
	flex: 1;
	font-size: 28rpx;
	color: #333;
}

.arrow-icon {
	width: 30rpx;
	height: 30rpx;
	border-top: 2rpx solid #ccc;
	border-right: 2rpx solid #ccc;
	transform: rotate(45deg);
}

.login-section {
	padding: 40rpx 30rpx;
}

.login-btn {
	width: 100%;
	height: 80rpx;
	line-height: 80rpx;
	background-color: #3B9E82;
	color: #fff;
	font-size: 28rpx;
	border-radius: 40rpx;
}

.edit-indicator {
	margin-left: auto;
	display: flex;
	align-items: center;
}

.edit-arrow {
	font-size: 28rpx;
	color: #999;
}

/* 添加工具栏样式 */
.map-tools {
	position: absolute;
	top: 20rpx;
	left: 20rpx;
	right: 20rpx;
	display: flex;
	gap: 20rpx;
	z-index: 100;
}

.tool-button {
	background-color: #fff;
	padding: 16rpx 32rpx;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	gap: 8rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.tool-text {
	font-size: 28rpx;
	color: #333;
}

/* 适配暗黑模式 */
@media (prefers-color-scheme: dark) {
	.tool-button {
		background-color: #333;
	}
	
	.tool-text {
		color: #fff;
	}
}
</style> 