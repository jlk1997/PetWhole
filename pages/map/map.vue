<template>
	<view class="content map-container">
		<!-- 调试信息面板 -->
		<view v-if="showDebug" class="debug-info">
			<text>标记数: {{debugInfo.markerCount}}</text>
			<text v-if="debugInfo.markerIds.length > 0">ID: {{debugInfo.markerIds.join(', ')}}</text>
			<text v-if="debugInfo.coords.length > 0">坐标: {{debugInfo.coords.join(' | ')}}</text>
			<text>当前位置: {{currentLocation.latitude}}, {{currentLocation.longitude}}</text>
			<text>头像路径: {{userStore.userInfo?.avatar || '无'}}</text>
			<text>完整头像URL: {{userAvatar || '无'}}</text>
			<text>使用的标记: 用户在资料中上传的头像</text>
			<text>总标记数: {{allMarkers.length}}</text>
			<text>用户标记: {{userMarker ? '已创建' : '未创建'}}</text>
			<button @click="forceRefreshMarker(false)">常规刷新</button>
			<button @click="forceRefreshMarker(true)">强制使用上传头像</button>
			<button @click="reloadUserInfo">重新加载用户信息</button>
			<button @click="clearAvatarCache">清除头像缓存</button>
			<button @click="showDebug = false">关闭</button>
		</view>
		
		<!-- 地图组件 - 完善事件处理 -->
		<view class="map-wrapper" @click="onMapContainerClick">
			<div id="map-container" class="map-container"></div>
		</view>
		
		<!-- 位置共享提示 -->
		<view v-if="showLocationSharingTip" class="location-share-tip">
			<view class="tip-content">
				<text class="tip-text">您是否想在地图上与其他宠友分享您的位置？</text>
				<view class="tip-buttons">
					<view class="tip-btn cancel-btn" @tap="cancelLocationSharing">暂不分享</view>
					<view class="tip-btn confirm-btn" @tap="confirmLocationSharing">开始分享</view>
				</view>
			</view>
		</view>
		
		<!-- 位置共享状态指示器 -->
		<view v-if="locationSharingStatusVisible" class="location-sharing-status">
			<view class="status-icon" :class="{ 'active': isLocationShared }"></view>
			<text class="status-text">{{ locationSharingStatus }}</text>
		</view>
		
		<!-- 地图工具栏 -->
		<view class="toolbar">
			<view class="toolbar-item" @tap="centerOnUser">
				<text class="icon">📍</text>
				<text class="toolbar-text">定位</text>
			</view>
			<view class="toolbar-item" @tap="zoomIn">
				<text class="icon">➕</text>
				<text class="toolbar-text">放大</text>
			</view>
			<view class="toolbar-item" @tap="zoomOut">
				<text class="icon">➖</text>
				<text class="toolbar-text">缩小</text>
			</view>
			<view class="toolbar-item pet-identify" @tap="navigateToPetIdentify">
				<text class="icon">🔍</text>
				<text class="toolbar-text">识别</text>
			</view>
		</view>
		
		<!-- 开始/停止遛狗按钮 -->
		<view class="start-button" @tap="toggleWalkingMode">
			<view class="start-button-inner" :class="{'active': isWalking}">
				<text class="start-icon">{{ isWalking ? '⏹️' : '▶️' }}</text>
				<text class="start-text">{{ isWalking ? '停止' : '开始' }}</text>
			</view>
		</view>
		
		<!-- 遛狗状态信息 -->
		<view class="walking-info" v-if="isWalking">
			<view class="info-item">
				<text class="label">距离</text>
				<text class="value">{{ (walkingDistance / 1000).toFixed(2) }}km</text>
			</view>
			<view class="info-item">
				<text class="label">时间</text>
				<text class="value">{{ formatDuration(walkingDuration) }}</text>
			</view>
			<view class="info-item">
				<text class="label">配速</text>
				<text class="value">{{ calculatePace(walkingDistance, walkingDuration) }}</text>
			</view>
		</view>
		
		<!-- 用户信息弹窗 -->
		<UserInfoPopup
			v-if="showUserPopup"
			:user="selectedUser"
			:pets="selectedUserPets"
			:is-following="isFollowing"
			:visible="showUserPopup"
			@close="closeUserPopup"
			@message="messageUser"
			@follow="followUser"
		/>
		
		<!-- 遛狗结束统计弹窗 -->
		<WalkSummaryPopup
			v-if="showWalkSummary"
			:duration="walkingDuration"
			:distance="walkingDistance"
			:pets="myPets"
			:selected-pet-index="selectedPetIndex"
			:share-content="walkShareContent"
			@close="closeWalkSummary"
			@share="shareWalkRecord"
		/>
		
		<!-- 临时按钮 - 切换显示用户头像/默认标记 -->
		<!--
		<view 
			@click="toggleMarker" 
			style="position: absolute; bottom: 220px; right: 20px; background: rgba(0,122,255,0.9); color: white; padding: 10px; border-radius: 5px; z-index: 999;"
		>
			切换标记
				</view>
		-->
		
		<!-- 隐藏的Canvas用于生成本地图片 -->
		<canvas canvas-id="debug-canvas" style="width: 40px; height: 40px; position: absolute; left: -100px;"></canvas>
	</view>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useUserStore } from '@/store/user.js';
import { usePetStore } from '@/store/pet.js';
import { useLocationStore } from '@/store/location.js';
import { formatDuration, calculatePace, calculateDistance } from '@/utils/amap.js';
import api from '@/utils/api.js'; // 添加API导入

// 修正组件导入路径
import UserInfoPopup from '@/components/map/UserInfoPopup.vue';
import WalkSummaryPopup from '@/components/map/WalkSummaryPopup.vue';

export default {
	components: {
		UserInfoPopup,
		WalkSummaryPopup
	},
	setup() {
		const userStore = useUserStore();
		const petStore = usePetStore();
		const locationStore = useLocationStore();
		
		// 高德地图对象
		const map = ref(null);
		// 用户标记对象 - 定义userMarkers为空对象
		const userMarkers = {};
		
		// 获取或创建地图实例的通用方法
		const getMapInstance = () => {
			if (map.value) {
				return map.value;
			}
			
			console.error('地图未初始化，尝试获取地图实例');
			
			// First try to get from global window object
			if (typeof window !== 'undefined' && window.__dogRunMapInstance) {
				console.log('从全局变量获取地图实例');
				map.value = window.__dogRunMapInstance;
				return map.value;
			}
			
			// Then try to get from DOM element
			if (typeof window !== 'undefined' && window.AMap) {
				const mapContainer = document.getElementById('map-container');
				if (mapContainer && mapContainer.__amap_instance__) {
					map.value = mapContainer.__amap_instance__;
					console.log('已从DOM元素获取地图实例');
					return map.value;
				}
				
				// Try to recreate the map if all else fails
				console.log('尝试重新创建地图实例');
				if (mapContainer) {
					try {
						map.value = new window.AMap.Map('map-container', {
							zoom: 15,
							center: [currentLocation.value.longitude, currentLocation.value.latitude],
							resizeEnable: true
						});
						window.__dogRunMapInstance = map.value;
						mapContainer.__amap_instance__ = map.value;
						console.log('地图实例已重新创建');
						return map.value;
					} catch (err) {
						console.error('无法创建地图实例:', err);
						throw new Error('无法创建地图实例: ' + err.message);
					}
				} else {
					throw new Error('无法获取地图容器');
				}
			}
			
			throw new Error('地图API未加载');
		};
		
		// 获取完整头像URL的工具函数
		function getFullAvatarUrl(avatarPath, debug = false) {
			if (debug) {
				console.log('getFullAvatarUrl处理:', avatarPath);
			}
			
			// 如果没有提供头像，返回默认头像
			if (!avatarPath) {
				if (debug) console.log('没有提供avatarPath，返回默认头像');
				return defaultAvatarBase64;
			}
			
			// 检查是否是base64图片
			if (avatarPath.startsWith('data:image/')) {
				if (debug) console.log('是base64图片，直接返回');
				return avatarPath;
			}
			
			// 检查是否已经是http或https开头的URL
			if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
				if (debug) console.log('已经是完整URL，直接返回:', avatarPath);
				// 确保URL有效，可以尝试移除URL中的特殊字符
				const cleanUrl = avatarPath.replace(/["']/g, '');
				return cleanUrl;
			}
			
			// 获取基础API URL
			const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
			
			// 如果是相对路径，添加基础URL
			if (avatarPath.startsWith('/uploads/')) {
				const fullUrl = baseUrl + avatarPath;
				if (debug) console.log('是上传路径，添加基础URL:', fullUrl);
				return fullUrl;
			}
			
			// 如果是不带前缀的uploads目录路径，添加前导斜杠和基础URL
			if (avatarPath.startsWith('uploads/')) {
				const fullUrl = baseUrl + '/' + avatarPath;
				if (debug) console.log('是不带前导斜杠的上传路径，添加基础URL:', fullUrl);
				return fullUrl;
			}
			
			// 其他情况，作为相对路径处理
			if (debug) console.log('未识别的路径类型，尝试添加基础URL:', avatarPath);
			// 确保路径不以斜杠开头
			const path = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath;
			return baseUrl + '/' + path;
		}
		
		const mapScale = ref(16);
		const currentLocation = ref({ latitude: 39.9087, longitude: 116.3975 });
		const markers = ref([]);
		const locationUpdateInterval = ref(null);
		const nearbyUsersUpdateInterval = ref(null);
		
		const nearbyUsers = ref([]);
		
		const isWalking = ref(false);
		const walkingPath = ref([]);
		const walkingDistance = ref(0);
		const walkingDuration = ref(0);
		const walkingStartTime = ref(null);
		const walkingTimer = ref(null);
		const walkingLocations = ref([]);
		
		const showUserPopup = ref(false);
		const selectedUser = ref(null);
		const selectedUserPets = ref([]);
		const selectedUserFollowStatus = ref(false); // 添加缺失的变量
		const isFollowing = ref(false);
		
		const showWalkSummary = ref(false);
		const walkShareContent = ref('');
		const myPets = ref([]);
		const myPetsNames = computed(() => myPets.value.map(p => p.name));
		const selectedPetIndex = ref(0);
		
		// 添加缺失的showDebug ref
		const showDebug = ref(true); // 临时打开调试视图，帮助排查问题
		const debugInfo = ref({
			markerCount: 0,
			markerIds: [],
			coords: []
		});
		
		// 新增位置共享提示控制
		const showLocationSharingTip = ref(false);
		const isLocationShared = ref(true); // 默认共享位置

		// 用户朝向角度
		const userHeading = ref(0);

		// 用于默认头像 - 使用内联base64确保可用
		const defaultAvatarBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAAAXNSR0IArs4c6QAAAQNJREFUeF7t1LENACAMBDFYm+WDxAhc6/TXWK/sdWaW+xbYAL/tXgiw+QGMfgABVoHY+4EAo0DMLRBgFIi5BQKMAjG3QIBRIOYWCDAKxNwCAUaBmFsgwCgQcwsEGAViboEAo0DMLRBgFIi5BQKMAjG3QIBRIOYWCDAKxNwCAUaBmFsgwCgQcwsEGAViboEAo0DMLRBgFIi5BQKMAjG3QIBRIOYWCDAKxNwCAUaBmFsgwCgQcwsEGAViboEAo0DMLRBgFIi5BQKMAjG3QIBRIOYWCDAKxPwCxDvF0aa/hxYAAAAASUVORK5CYII=';
		
		// 用户头像计算属性
		const userAvatar = computed(() => {
			// 使用userStore中的userInfo或user，根据存在与否
			const userInfo = userStore.userInfo || userStore.user || {};
			
			// 调试用户状态
			console.log('用户信息状态:', {
				'userStore.userAvatar存在': !!userStore.userAvatar,
				'userStore.userInfo存在': !!userStore.userInfo,
				'userStore.user存在': !!userStore.user,
				'头像路径': userInfo.avatar || userStore.userAvatar
			});
			
			// 先尝试从userStore的计算属性获取
			if (userStore.userAvatar) {
				return getFullAvatarUrl(userStore.userAvatar, true);
			}
			
			// 再尝试从userInfo或user对象获取avatar
			if (userInfo.avatar) {
				// 调试用户头像相关信息
				console.log('头像计算细节:', {
					原始路径: userInfo.avatar,
					是否以上传路径开头: userInfo.avatar.startsWith('/uploads/'),
					环境变量: import.meta.env.VITE_API_URL || 'http://localhost:5000'
				});
				
				return getFullAvatarUrl(userInfo.avatar, true);
			}
			
			// 返回默认头像
			console.log('未找到用户头像，使用默认蓝色头像');
			return defaultAvatarBase64;
		});
		
		// 用户位置标记
		const userMarker = computed(() => {
			if (!currentLocation.value || !currentLocation.value.latitude) {
				return null;
			}
			
			// 直接使用userAvatar计算属性获取完整头像URL
			let iconPath = userAvatar.value;
			
			console.log('创建用户标记，头像路径:', iconPath);
			
			return {
				id: 'user-location',
				latitude: currentLocation.value.latitude,
				longitude: currentLocation.value.longitude,
				iconPath: iconPath,
				width: 40,
				height: 40,
				rotate: userHeading.value,
				anchor: {
					x: 0.5,
					y: 0.5
				}
			};
		});
		
		// 合并所有标记点
		const allMarkers = computed(() => {
			let result = [...markers.value];
			
			// 添加用户位置标记
			if (userMarker.value) {
				// 确保用户标记总是在最顶层，先移除相同ID的旧标记
				result = result.filter(marker => marker.id !== 'user-location');
				// 添加用户标记
				result.push(userMarker.value);
				console.log('添加用户位置标记:', userMarker.value);
			} else {
				// 如果没有用户标记但有位置，创建一个临时标记
				if (currentLocation.value && currentLocation.value.latitude) {
					const tempMarker = {
						id: 'user-location',
						latitude: currentLocation.value.latitude,
						longitude: currentLocation.value.longitude,
						iconPath: userAvatar.value, // 使用userAvatar计算属性
						width: 40,
						height: 40,
						rotate: userHeading.value,
						anchor: {
							x: 0.5,
							y: 0.5
						}
					};
					result.push(tempMarker);
					console.log('添加临时用户标记:', tempMarker);
				} else {
					console.warn('用户位置标记未创建，且没有位置信息');
				}
			}
			
			return result;
		});
		
		// 更新调试信息
		function updateDebugInfo() {
			debugInfo.value = {
				markerCount: markers.value.length + allMarkers.value.length,
				markerIds: markers.value.map(m => m.id).concat(allMarkers.value.map(m => m.id)),
				coords: currentLocation.value ? [currentLocation.value.latitude.toFixed(6), currentLocation.value.longitude.toFixed(6)] : []
			};
		}
		
		// 开始位置共享
		function startLocationSharing() {
			if (!isLocationShared.value) return;
			
			try {
				// 记录位置共享信息
				console.log('更新位置共享:', {
					latitude: currentLocation.value.latitude,
					longitude: currentLocation.value.longitude
				});
				
				// 仅在本地记录位置，不调用API
				console.log('位置共享已在本地更新（不调用API）');
				
				// 可选：如果位置API存在，尝试调用但忽略错误
				try {
					if (locationStore && typeof locationStore.updateLocation === 'function') {
						locationStore.updateLocation({
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							timestamp: new Date().toISOString()
						}).catch(error => {
							// 忽略API错误，仅记录日志
							console.warn('更新位置API调用失败（已忽略）:', error);
						});
					}
				} catch (apiError) {
					// 忽略API错误
					console.warn('位置API调用尝试失败（已忽略）:', apiError);
				}
			} catch (error) {
				console.error('更新位置共享状态失败:', error);
			}
		}
		
		// 开始获取位置的函数
		function startGettingLocation() {
			console.log('开始获取位置...');
			
			// 开始监听位置
			startLocationWatch();
			
			// 获取我的宠物
			fetchMyPets();
			
			// 初始化地图标记
			setTimeout(() => {
				if (currentLocation.value && typeof currentLocation.value.latitude !== 'undefined') {
					console.log('位置已获取，初始化用户标记');
					toggleMarker();
				}
			}, 2000);
		}
		
		// 获取用户附近的其他用户
		async function getNearbyUsers() {
			try {
				if (!isLocationShared.value) {
					console.log('位置共享未开启，不获取附近用户');
					return Promise.resolve({ success: false, message: '位置共享未开启' });
				}
				
				if (!currentLocation.value || !currentLocation.value.latitude || !currentLocation.value.longitude) {
					console.error('当前位置不可用，无法获取附近用户');
					return Promise.reject(new Error('当前位置不可用'));
				}
				
				console.log('获取附近用户...');
				
				// 在开发环境中，确保添加当前用户到nearbyUsers
				if (process.env.NODE_ENV === 'development') {
					console.log('开发环境: 添加当前用户到附近用户列表');
					
					// 确保至少有当前用户的信息
					if (userStore.userInfo && currentLocation.value) {
						// 创建包含位置信息的当前用户数据
						const currentUser = {
							...userStore.userInfo,
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							lastUpdated: new Date().toISOString()
						};
						
						// 确保只有一条记录
						nearbyUsers.value = [currentUser];
						console.log('已添加当前用户到附近用户列表:', currentUser);
						
						// 更新标记
						updateMarkers();
						
						return Promise.resolve({ 
							success: true, 
							message: '开发环境只返回当前用户',
							data: [currentUser] 
						});
					}
				}
				
				// 调用API获取附近用户
				const response = await locationStore.getNearbyUsers({
					latitude: currentLocation.value.latitude,
					longitude: currentLocation.value.longitude,
					maxDistance: 5000 // 搜索5公里范围内的用户
				});
				
				if (response && response.success && Array.isArray(response.data)) {
					// 过滤掉自己的记录，因为我们会手动添加当前用户位置
					let otherUsers = [];
					if (userStore.userInfo && userStore.userInfo.id) {
						otherUsers = response.data.filter(user => 
							user.id !== userStore.userInfo.id
						);
						console.log('过滤后的其他用户数量:', otherUsers.length);
					} else {
						otherUsers = response.data;
						console.log('未过滤的用户数量:', otherUsers.length);
					}
					
					// 确保当前用户位置信息存在
					if (userStore.userInfo && currentLocation.value) {
						// 创建包含位置信息的当前用户数据
						const currentUser = {
							...userStore.userInfo,
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							lastUpdated: new Date().toISOString()
						};
						
						// 合并其他用户和当前用户
						if (otherUsers.length > 0) {
							nearbyUsers.value = [currentUser, ...otherUsers];
							console.log('合并后的用户列表:', nearbyUsers.value.length, '个用户 (当前用户 + 其他用户)');
						} else {
							nearbyUsers.value = [currentUser];
							console.log('用户列表只包含当前用户');
						}
					} else {
						nearbyUsers.value = otherUsers;
						console.log('用户列表不包含当前用户(未登录或无位置)');
					}
					
					updateMarkers();
					console.log('获取到附近用户:', nearbyUsers.value.length);
					
					// 记录所有用户ID，方便调试
					console.log('用户ID列表:', nearbyUsers.value.map(u => u?.id || '未知ID'));
					
					return Promise.resolve(response);
				} else {
					console.log('未获取到附近用户或格式错误:', response);
					
					// 确保即使API返回错误，也要添加当前用户
					if (userStore.userInfo && currentLocation.value) {
						const currentUser = {
							...userStore.userInfo,
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							lastUpdated: new Date().toISOString()
						};
						
						nearbyUsers.value = [currentUser];
						console.log('API失败，只显示当前用户');
						updateMarkers();
					} else {
						nearbyUsers.value = [];
						console.log('API失败，且无当前用户信息，nearbyUsers为空');
					}
					
					return Promise.resolve({ success: false, message: '无附近用户', response });
				}
			} catch (error) {
				console.error('获取附近用户失败', error);
				
				// 即使出错也添加当前用户
				if (userStore.userInfo && currentLocation.value) {
					const currentUser = {
						...userStore.userInfo,
						latitude: currentLocation.value.latitude,
						longitude: currentLocation.value.longitude,
						lastUpdated: new Date().toISOString()
					};
					
					nearbyUsers.value = [currentUser];
					console.log('异常情况下，只显示当前用户');
					updateMarkers();
				} else {
					nearbyUsers.value = [];
					console.log('异常情况下，且无当前用户信息，nearbyUsers为空');
				}
				
				return Promise.reject(error);
			}
		}
		
		// 更新地图标记点
		function updateMarkers() {
			try {
				if (!nearbyUsers.value || !nearbyUsers.value.length) {
					console.log('没有附近用户，清除非自身标记');
					
					// 开发模式下，移除所有非自己的标记
					if (map.value && allMarkers.value) {
						allMarkers.value.forEach(marker => {
							// 保留自己的标记，移除其他标记
							const markerUserId = marker?.extData?.userId;
							const currentUserId = userStore.userInfo?.id;
							
							console.log('标记ID:', markerUserId, '当前用户ID:', currentUserId);
							
							// 如果不是当前用户的标记，则移除
							if (markerUserId && currentUserId && markerUserId !== currentUserId) {
								console.log('移除非本人标记:', markerUserId);
								map.value.remove(marker);
							}
						});
						
						// 过滤allMarkers数组，只保留自己的标记
						allMarkers.value = allMarkers.value.filter(marker => {
							return !marker.extData || !marker.extData.userId || 
								marker.extData.userId === userStore.userInfo?.id;
						});
					}
					return;
				}
				
				console.log('更新附近用户标记，用户数量:', nearbyUsers.value.length);
				
				// 在开发环境中，跳过创建其他用户标记的逻辑
				if (process.env.NODE_ENV === 'development') {
					console.log('开发环境，仅显示自己的标记');
					return;
				}
				
				// 移除所有之前的用户标记（除了自己的）
				if (allMarkers.value && allMarkers.value.length > 0) {
					allMarkers.value.forEach(marker => {
						if (marker && marker.extData && marker.extData.userId !== userStore.userInfo.id) {
							marker.setMap(null);
						}
					});
				}
				
				// 处理每个用户，创建新标记
				nearbyUsers.value.forEach(user => {
					// 跳过自己的标记
					if (!user || !user.id || (userStore.userInfo && user.id === userStore.userInfo.id)) {
						return;
					}
					
					// 确保有经纬度
					if (!user.latitude || !user.longitude) {
						console.log('用户缺少位置信息:', user.nickname || user.username);
						return;
					}
					
					// 明确记录正在处理的用户ID，方便调试
					const userId = String(user.id);
					const position = [user.longitude, user.latitude];
					
					console.log(`创建用户[${userId}]的标记:`, user.nickname || user.username);
					
					// 处理头像路径
					let avatarUrl = user.userAvatar || user.avatar;
					avatarUrl = getFullAvatarUrl(avatarUrl, true);
					
					console.log('处理用户标记:', userId, user.nickname, '头像:', avatarUrl ? '有' : '无');
					
					// 如果是base64图像，直接使用
					if (avatarUrl && avatarUrl.startsWith('data:image/')) {
						createUserMarkerWithImage(userId, position, avatarUrl);
						return;
					}
					
					// 使用Image对象加载头像
					const img = new Image();
					img.crossOrigin = 'anonymous';
					img.onload = () => {
						// 图片加载成功，创建用户标记
						createUserMarkerWithImage(userId, position, avatarUrl);
					};
					img.onerror = () => {
						// 图片加载失败，使用默认标记
						console.error('获取头像失败，用户ID:', userId);
						createDefaultMarker(position, userId);
					};
					img.src = avatarUrl;
					
					// 为防止图片加载超时，设置3秒后使用默认标记
					setTimeout(() => {
						if (!img.complete || img.naturalWidth === 0) {
							console.error('头像加载超时，用户ID:', userId);
							createDefaultMarker(position, userId);
						}
					}, 3000);
				});
				
				console.log('地图标记更新完成');
			} catch (error) {
				console.error('更新地图标记时出错:', error);
			}
		}
		
		// 获取用户宠物信息
		async function fetchUserPets(userId) {
			try {
				console.log('开始获取用户宠物信息，用户ID:', userId);
				
				// 使用正确的API路径
				const response = await locationStore.getUserPets(userId);
				
				console.log('获取宠物信息响应:', response);
				
				if (response && response.data && Array.isArray(response.data)) {
					selectedUserPets.value = response.data;
					console.log('成功加载宠物数量:', selectedUserPets.value.length);
					return response.data;
				} else if (response && Array.isArray(response)) {
					// 兼容直接返回数组的情况
					selectedUserPets.value = response;
					console.log('成功加载宠物数量(直接数组):', selectedUserPets.value.length);
					return response;
				} else {
					console.warn('宠物数据格式不正确:', response);
					selectedUserPets.value = [];
					return [];
				}
			} catch (error) {
				console.error('获取用户宠物失败', error);
				selectedUserPets.value = [];
				throw error; // 让调用者处理错误
			}
		}

		// 检查是否关注该用户
		async function checkFollowStatus(userId) {
			try {
				console.log('开始检查关注状态，用户ID:', userId);
				
				// 使用正确的API路径
				const response = await locationStore.checkFollowStatus(userId);
				
				console.log('检查关注状态响应:', response);
				
				if (response && (response.data === true || response.following === true)) {
					isFollowing.value = true;
				} else {
					isFollowing.value = false;
				}
				
				console.log('关注状态:', isFollowing.value ? '已关注' : '未关注');
				return isFollowing.value;
			} catch (error) {
				console.error('检查关注状态失败', error);
				isFollowing.value = false; // 出错时默认为未关注
				return false;
			}
		}
		
		// 获取我的宠物列表
		async function fetchMyPets() {
			try {
				// 使用正确的API路径
				const response = await petStore.fetchPets();
				
				if (response && Array.isArray(response)) {
					myPets.value = response;
				} else {
					myPets.value = [];
				}
			} catch (error) {
				console.error('获取我的宠物失败', error);
				myPets.value = [];
			}
		}
		
		// 准备遛狗记录统计信息
		function prepareWalkSummary() {
			const distance = (walkingDistance.value / 1000).toFixed(2);
			const duration = formatDuration(walkingDuration.value);
			const pace = calculatePace(walkingDistance.value, walkingDuration.value);
			const pets = myPetsNames.value.length ? myPetsNames.value.join('、') : '我的宠物';
			
			walkShareContent.value = `我带${pets}遛了${distance}公里，用时${duration}，配速${pace}！`;
		}
		
		// 更新位置并计算行走距离
		function updateLocation(newLocation, heading) {
			// 计算与上一位置的变化来获取朝向
			if (currentLocation.value && currentLocation.value.latitude !== 0) {
				const dLat = newLocation.latitude - currentLocation.value.latitude;
				const dLng = newLocation.longitude - currentLocation.value.longitude;
				
				// 只有当位置变化足够明显时才更新朝向
				if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
					// 计算方向角度 (0表示北方，顺时针增加)
					const calculatedHeading = Math.atan2(dLng, dLat) * 180 / Math.PI;
					console.log('方位计算：', { dLat, dLng, calculatedHeading });
					userHeading.value = calculatedHeading;
				}
			}
			
			// 更新当前位置
			currentLocation.value = newLocation;
			console.log('位置已更新:', currentLocation.value);
			
			// 如果提供了罗盘朝向，优先使用
			if (heading !== undefined) {
				userHeading.value = heading;
				console.log('使用罗盘朝向:', heading);
			}
			
			// 检查是否需要更新用户标记
			// 每30秒才更新标记以减轻性能负担
			if (!window._lastMarkerUpdateTime || (Date.now() - window._lastMarkerUpdateTime > 30000)) {
				window._lastMarkerUpdateTime = Date.now();
				console.log('触发定期标记更新');
				
				// 使用toggleMarker更新标记，确保只有一个标记
				if (userStore.isAuthenticated && userStore.userInfo && userStore.userInfo.id) {
					console.log('使用实际用户ID更新标记:', userStore.userInfo.id);
					toggleMarker();
				}
			}
			
			// 如果正在遛狗，更新路径和距离
			if (isWalking.value && walkingLocations.value.length > 0) {
				const lastPoint = walkingLocations.value[walkingLocations.value.length - 1];
				const distance = calculateDistance(
					lastPoint.latitude, lastPoint.longitude, 
					newLocation.latitude, newLocation.longitude
				);
				
				// 如果距离变化大于5米，记录新的点（减少路径点数量）
				if (distance > 5) {
					walkingLocations.value.push({
						latitude: newLocation.latitude,
						longitude: newLocation.longitude
					});
					
					// 更新路径
					walkingPath.value = [{
						points: walkingLocations.value.map(loc => ({
							latitude: loc.latitude,
							longitude: loc.longitude
						})),
						color: '#007AFF',
						width: 4
					}];
					
					// 更新总距离
					walkingDistance.value += distance;
				}
			}
		}
		
		// 监听地理位置变化
		function startLocationWatch() {
			// 先获取一次当前位置
			uni.getLocation({
				type: 'gcj02',
				success: (res) => {
					updateLocation({
						latitude: res.latitude,
						longitude: res.longitude
					});
					
					// 第一次获取位置成功后，如果未决定是否共享位置，显示提示
					if (!userStore.hasDecidedLocationSharing) {
						showLocationSharingTip.value = true;
					}
					
					// 初始化高德地图定位对象，获取更丰富的定位信息
					if (window.AMap) {
						try {
							const AMap = window.AMap;
							// 使用高德地图的定位功能
							AMap.plugin(['AMap.Geolocation'], function() {
								const geolocation = new AMap.Geolocation({
									enableHighAccuracy: true, // 高精度模式
									timeout: 10000, // 超时时间
									convert: true, // 自动偏移坐标
									showButton: false, // 不显示按钮
									showMarker: false, // 不显示定位点
									showCircle: false, // 不显示精度圈
								});
								
								// 监听定位变化
								geolocation.getCurrentPosition(function(status, result) {
									if (status === 'complete') {
										// 高德地图返回的方向信息
										console.log('高德定位结果:', result);
										if (result.heading !== undefined && result.heading !== null) {
											userHeading.value = result.heading;
											console.log('高德地图方向:', result.heading);
										}
										
										// 更新位置
										if (result.position) {
											currentLocation.value = {
												latitude: result.position.lat,
												longitude: result.position.lng
											};
										}
									} else {
										console.log('高德地图定位失败', result);
									}
								});
								
								// 监听方向变化（如果设备支持）
								if (navigator.geolocation && navigator.geolocation.watchPosition) {
									navigator.geolocation.watchPosition(
										function(pos) {
											if (pos.coords.heading !== null && pos.coords.heading !== undefined) {
												userHeading.value = pos.coords.heading;
												console.log('设备方向:', pos.coords.heading);
											}
										},
										function(err) {
											console.log('获取设备方向失败:', err);
										},
										{
											enableHighAccuracy: true,
											maximumAge: 0
										}
									);
								}
							});
						} catch (error) {
							console.error('高德地图初始化失败:', error);
						}
					}
					
					// 启动设备方向监听
					if (typeof uni.onDeviceMotionChange === 'function') {
						uni.startDeviceMotionListening({
							interval: 'game',
							success: () => {
								console.log('设备方向监听启动成功');
							},
							fail: (err) => {
								console.error('设备方向监听启动失败', err);
							}
						});
						
						uni.onDeviceMotionChange((res) => {
							// alpha对应设备绕z轴的旋转角度，在地图上相当于朝向
							if (res.alpha !== undefined) {
								userHeading.value = res.alpha;
								console.log('设备方向更新:', res.alpha);
							}
						});
					}
				},
				fail: (err) => {
					console.error('获取位置失败', err);
					uni.showToast({
						title: '获取位置信息失败，请检查定位权限',
						icon: 'none'
					});
				}
			});
			
			// 持续监听位置变化
			locationUpdateInterval.value = setInterval(() => {
				uni.getLocation({
					type: 'gcj02',
					success: (res) => {
						// 获取方向信息（如果设备支持）
						if (typeof uni.onCompassChange === 'function') {
							uni.onCompassChange((compass) => {
								// compass.direction 0-360度，正北为0
								updateLocation({
									latitude: res.latitude,
									longitude: res.longitude
								}, compass.direction);
							});
						} else {
							updateLocation({
								latitude: res.latitude,
								longitude: res.longitude
							});
						}
						
						// 如果允许位置共享，更新服务器
						if (isLocationShared.value) {
							startLocationSharing();
						}
					}
				});
			}, 10000); // 每10秒更新一次位置
			
			// 获取附近用户位置
			nearbyUsersUpdateInterval.value = setInterval(() => {
				getNearbyUsers();
			}, 30000); // 每30秒更新一次附近用户
		}
		
		// 创建默认标记 - 移到上方，确保在调用前已定义
		function createDefaultMarker(position, userId) {
			console.log('创建默认标记，用户ID:', userId);
			
			// 如果未提供position或userId，使用默认值
			if (!position && currentLocation.value) {
				position = [currentLocation.value.longitude, currentLocation.value.latitude];
			}
			
			// 如果连currentLocation也没有，则使用默认位置
			if (!position) {
				console.warn('createDefaultMarker: 无法获取位置信息，使用默认位置');
				position = [116.3, 39.9]; // 默认北京天安门位置
			}
			
			// 如果未提供userId，尝试从userStore获取
			if (!userId && userStore.userInfo) {
				userId = userStore.userInfo.id;
				console.log('从用户存储获取ID:', userId);
			}
			
			// 如果userId仍然为空，使用标准化标识符
			if (!userId) {
				userId = 'current-user-marker';
				console.warn('userId未提供且无法获取，使用固定标识符:', userId);
			}
			
			// 确保map对象已初始化
			if (!map.value) {
				console.error('createDefaultMarker: 地图对象未初始化，无法创建标记');
				return null;
			}
			
			// 创建闭包，保存当前上下文中的变量
			const mapRef = map;
			const positionRef = position;
			const userIdRef = userId;
			
			// 在创建新标记前，移除可能存在的同ID标记
			if (userMarkers[userIdRef]) {
				console.log('移除已存在的同ID标记:', userIdRef);
				mapRef.value.remove(userMarkers[userIdRef]);
				delete userMarkers[userIdRef];
			}
			
			try {
				console.log('使用ID创建默认标记:', userIdRef);
				const marker = new AMap.Marker({
					map: mapRef.value,
					position: positionRef,
					icon: new AMap.Icon({
						size: new AMap.Size(30, 30),
						image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`
							<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 30 30">
								<circle cx="15" cy="15" r="14" fill="#007aff" stroke="white" stroke-width="2"/>
							</svg>
						`),
						imageSize: new AMap.Size(30, 30)
					}),
					offset: new AMap.Pixel(-15, -15),
					zIndex: 100,
					extData: { userId: userIdRef, type: 'default-user' }
				});
				
				// 将标记保存到全局对象
				userMarkers[userIdRef] = marker;
				
				// 设置标记DOM元素的属性
				setTimeout(() => {
					try {
						const dom = marker.getContentDom();
						if (dom) {
							console.log('设置默认标记DOM属性，用户ID:', userIdRef);
							
							dom.setAttribute('data-user-id', userIdRef);
							dom.setAttribute('data-id', `user-marker-${userIdRef}`);
							dom.id = `marker-${userIdRef}`;
							dom.classList.add('user-marker');
							dom.classList.add(`user-marker-${userIdRef}`);
							dom.setAttribute('data-marker-type', 'default-user');
							dom.setAttribute('data-timestamp', new Date().getTime());
							
							// 添加点击事件处理
							dom.addEventListener('click', (e) => {
								e.stopPropagation();
								console.log('默认标记DOM点击, 用户ID:', userIdRef);
								onMarkerTap({detail: {markerId: userIdRef}});
							});
							
							// 确保可点击性
							dom.style.cursor = 'pointer';
							dom.style.pointerEvents = 'auto';
						} else {
							console.warn('无法获取默认标记DOM');
						}
					} catch (e) {
						console.error('设置默认标记DOM属性时出错:', e);
					}
				}, 100);
				
				// 添加到全局标记列表
				if (allMarkers.value) {
					allMarkers.value.push(marker);
				}
				
				return marker;
			} catch (e) {
				console.error('创建默认标记时出错:', e);
				return null;
			}
		}

		// 创建用户标记（使用图片）
		const createUserMarkerWithImage = (userId, position, imageUrl) => {
			// 确保map.value已初始化
			if (!map.value) {
				console.error('地图未初始化，无法创建标记');
				// 尝试延迟创建标记
				setTimeout(() => {
					if (map.value) {
						console.log('地图现在已初始化，重试创建标记');
						createUserMarkerWithImage(userId, position, imageUrl);
					} else {
						console.error('重试后地图仍未初始化，标记创建失败');
					}
				}, 2000);
				return;
			}
			
			// 确保userId不为空，如果为空则使用一个明确的标识符
			if (!userId) {
				console.warn('标记的userId为空，使用固定标识符');
				userId = 'current-user-location';
			}
			
			try {
				console.log('开始创建用户标记，用户ID:', userId);
				
				// 画布大小和图像大小
				const canvasSize = 60;
				const imageSize = 56; // 略微增大图像尺寸，减少白边
				
				// 创建画布
				const canvas = document.createElement('canvas');
				canvas.width = canvasSize;
				canvas.height = canvasSize;
				// 添加willReadFrequently属性以优化性能
				const ctx = canvas.getContext('2d', { willReadFrequently: true });
				
				if (!ctx) {
					console.error('无法获取canvas上下文');
					return createDefaultMarker(position, userId);
				}
				
				// 清空画布
				ctx.clearRect(0, 0, canvasSize, canvasSize);
				
				// 创建图像对象
				const img = new Image();
				img.crossOrigin = 'Anonymous'; // 尝试处理跨域问题
				
				// 图像加载完成后绘制
				img.onload = function() {
					try {
						// 创建圆形裁剪区域
						ctx.save();
						ctx.beginPath();
						ctx.arc(canvasSize/2, canvasSize/2, imageSize/2, 0, Math.PI * 2);
						ctx.closePath();
						ctx.clip();
						
						// 计算绘制坐标以居中显示图像
						const x = (canvasSize - imageSize) / 2;
						const y = (canvasSize - imageSize) / 2;
						
						// 在圆形裁剪区域内绘制图像
						ctx.drawImage(img, x, y, imageSize, imageSize);
						
						// 恢复上下文
						ctx.restore();
						
						// 画蓝色边框
						ctx.beginPath();
						ctx.arc(canvasSize/2, canvasSize/2, imageSize/2, 0, Math.PI * 2);
						ctx.lineWidth = 2;
						ctx.strokeStyle = '#2196F3'; // 蓝色边框
						ctx.stroke();
						
						// 将画布转换为base64图像
						const markerImage = canvas.toDataURL('image/png');
						
						// 确保userMarkers对象已初始化
						if (typeof userMarkers !== 'object') {
							console.warn('userMarkers未定义，初始化为空对象');
							window.userMarkers = {};
						}
						
						// 创建标记
						const marker = new AMap.Marker({
							position: position,
							icon: new AMap.Icon({
								size: new AMap.Size(canvasSize, canvasSize),
								image: markerImage,
								imageSize: new AMap.Size(canvasSize, canvasSize)
							}),
							offset: new AMap.Pixel(-canvasSize/2, -canvasSize/2),
							zIndex: 100,
							extData: { userId: userId, type: 'user' }
						});
						
						// 将标记添加到地图
						map.value.add(marker);
						
						// 保存标记引用以便后续操作
						userMarkers[userId] = marker;
						
						// 设置DOM属性和事件处理
						setTimeout(() => {
							try {
								const dom = marker.getContentDom();
								if (dom) {
									console.log(`为标记DOM设置用户ID: ${userId}`);
									
									// 设置数据属性用于事件处理 - 确保设置正确的ID
									dom.setAttribute('data-user-id', userId);
									dom.setAttribute('data-id', `user-marker-${userId}`);
									dom.id = `marker-${userId}`;
									dom.classList.add('user-marker');
									dom.classList.add(`user-marker-${userId}`);
									
									// 设置自定义属性，方便调试
									dom.setAttribute('data-marker-type', 'user');
									dom.setAttribute('data-timestamp', new Date().getTime());
									
									// 添加点击事件
									dom.addEventListener('click', (e) => {
										e.stopPropagation();
										console.log('用户标记DOM点击, 用户ID:', userId);
										processUserMarkerTap(userId);
									});
									
									// 确保可点击性
									dom.style.cursor = 'pointer';
									dom.style.pointerEvents = 'auto';
									
									// 确保图像元素也有正确的ID
									const imgElem = dom.querySelector('img');
									if (imgElem) {
										imgElem.setAttribute('data-user-id', userId);
										imgElem.setAttribute('data-id', `user-image-${userId}`);
									}
								} else {
									console.warn('无法获取标记DOM元素');
								}
							} catch (e) {
								console.error('设置标记DOM属性时出错:', e);
							}
						}, 100);
						
						// 为标记添加点击事件
						marker.on('click', function(e) {
							console.log('标记被点击，用户ID:', userId);
							processUserMarkerTap(userId);
						});
						
						// 确保元素已添加后设置触发器
						setTimeout(() => setupMarkerClickHandlers(), 500);
						
						console.log('成功创建用户标记，用户ID:', userId);
						return marker;
					} catch (innerError) {
						console.error('绘制标记图像时出错:', innerError);
						return createDefaultMarker(position, userId);
					}
				};
				
				// 图像加载失败时创建默认标记
				img.onerror = function(e) {
					console.error('加载头像图像失败:', e);
					return createDefaultMarker(position, userId);
				};
				
				// 设置图像源
				img.src = imageUrl;
			} catch (error) {
				console.error('创建用户标记出错:', error);
				return createDefaultMarker(position, userId);
			}
		}

		// 强制初始化用户认证状态
		const initUserAuth = async () => {
		  // 如果已经有token但没有用户信息，尝试获取
		  if (userStore.token && !userStore.user) {
			try {
			  console.log('发现token但没有用户数据，尝试获取用户信息');
			  await userStore.fetchUserInfo();
			  console.log('成功获取用户数据:', userStore.user);
			} catch (err) {
			  console.error('获取用户信息失败，可能需要重新登录:', err);
			}
		  }
		  
		  // 检查认证状态
		  if (userStore.token) {
			console.log('已有token，假定用户已登录 - isAuthenticated:', userStore.isAuthenticated);
			
			// 如果isAuthenticated为false但有token，可能是user对象缺失
			// 我们不能直接修改isAuthenticated，但可以确保user对象存在
			if (!userStore.isAuthenticated && !userStore.user) {
			  // 尝试从localStorage获取用户信息
			  try {
				const storedUserInfo = uni.getStorageSync('userInfo');
				if (storedUserInfo) {
				  const userInfo = JSON.parse(storedUserInfo);
				  // 确保userStore.user有值
				  userStore.$patch({ user: userInfo });
				  console.log('从本地存储恢复用户信息:', userInfo);
				} else {
				  console.log('本地存储中没有用户信息');
				}
			  } catch (e) {
				console.error('从本地存储恢复用户信息失败:', e);
			  }
			}
		  }
				
		  // 记录当前认证状态
		  console.log('当前认证状态:', {
			token存在: !!userStore.token,
			user存在: !!userStore.user,
			isAuthenticated: userStore.isAuthenticated
		  });
		};

		// 替换toggleMarker函数，避免CORS错误
		function toggleMarker() {
		  try {
			// 确保有位置信息
			if (!currentLocation.value || typeof currentLocation.value.latitude === 'undefined') {
			  console.error('当前位置信息不可用，无法添加标记');
			  uni.showToast({
				title: '无法获取位置信息',
				icon: 'none'
			  });
			  return;
			}
			
			// 获取用户ID - 从store中获取或使用固定标识符
			let userId = userStore.userInfo?.id || userStore.user?._id || 'current-user-location';
			console.log('使用用户ID创建标记:', userId);
			
			// 如果已经存在此ID的标记，先移除它以避免重复
			if (map.value) {
			  // 检查是否已存在用户标记
			  const existingMarkers = map.value.getAllOverlays('marker');
			  let hasUserMarker = false;
			  
			  existingMarkers.forEach(marker => {
				try {
				  const markerUserId = marker?.getExtData?.()?.userId;
				  // 如果找到了相同ID或是current-user-location标记
				  if (markerUserId === userId || markerUserId === 'current-user-location') {
					console.log(`发现已存在标记(${markerUserId})，移除以避免重复`);
					map.value.remove(marker);
					hasUserMarker = true;
				  }
				} catch (err) {
				  console.warn('检查标记时出错:', err);
				}
			  });
			  
			  if (hasUserMarker) {
				console.log('已移除旧标记，创建新标记');
			  }
			}
			
			const position = [currentLocation.value.longitude, currentLocation.value.latitude];
			
			// 使用用户头像或默认头像
			const avatarUrl = userAvatar.value;
			console.log('创建用户标记，使用头像URL:', avatarUrl);

			// 只创建一个标记，优先使用用户ID而非通用ID
			createUserMarkerWithImage(userId, position, avatarUrl);
			
			// 清除旧的位置标记引用
			if (userMarkers['current-user-location'] && userId !== 'current-user-location') {
			  delete userMarkers['current-user-location'];
			}
			
			console.log('已完成创建用户标记');
		  } catch (error) {
			console.error('创建标记时出错:', error);
			uni.showToast({
			  title: '创建位置标记失败',
			  icon: 'none'
			});
		  }
		}

		// 辅助函数：根据ID查找用户
		function findUserById(userId) {
			if (!nearbyUsers.value || !nearbyUsers.value.length) return null;
			
			// 尝试不同的方式匹配用户ID
			const user = nearbyUsers.value.find(u => {
				if (!u || !u.id) return false;
				
				// 直接比较ID
				if (String(u.id) === String(userId)) return true;
				
				// 比较ID前缀形式
				if (String(u.id) === String(userId).replace(/^user-/, '')) return true;
				
				// 比较ID后缀形式
				if (String(u.id) === String(userId).replace(/-.*$/, '')) return true;
				
				return false;
			});
			
			return user;
		}

		// 组件挂载时
		onMounted(async () => {
			console.log('组件挂载开始...');
			
			// 清理可能存在的多余标记
			setTimeout(() => {
				cleanupExtraMarkers();
			}, 1000);
			
			// 在组件挂载后启动定期检查标记
			markerScanInterval = setInterval(() => {
				setupMarkerClickHandlers();
				
				// 每10秒执行一次标记清理
				if (new Date().getSeconds() % 10 === 0) {
					cleanupExtraMarkers();
				}
			}, 2000); // 每2秒检查一次
			
			// 确保获取用户宠物数据
			if (userStore.isAuthenticated) {
				// 加载宠物数据
				console.log('加载用户宠物数据');
				petStore.fetchPets().then(pets => {
					console.log('成功获取宠物数据:', pets);
					// 更新myPets变量以供其他组件使用
					myPets.value = pets;
				}).catch(err => {
					console.error('获取宠物数据失败:', err);
				});
			}
			
			// 首先初始化用户认证状态
			await initUserAuth();
			
			// 获取地图上下文
			const mapContext = uni.createMapContext('map');
			
			// 显示用户头像调试信息
			console.log('初始用户信息:', userStore.userInfo || userStore.user);
			console.log('初始头像路径:', (userStore.userInfo || userStore.user)?.avatar);
			console.log('用户认证状态:', userStore.isAuthenticated);
			
			// 如果用户信息不完整，先尝试获取
			if (!userStore.user && !userStore.userInfo) {
				console.log('用户信息不完整，尝试重新获取...');
				try {
					await userStore.fetchUserInfo();
					console.log('已重新获取用户信息:', userStore.user);
				} catch (err) {
					console.error('获取用户信息失败:', err);
				}
			}
			
			// 开始监听位置
			startLocationWatch();
			
			// 获取附近用户
			getNearbyUsers();
			
			// 获取我的宠物
			fetchMyPets();
			
			// 等待DOM渲染完成
			await nextTick();
			
			// 初始化高德地图
			const initAMap = () => {
				setTimeout(() => {
					const mapContainer = document.getElementById('map-container');
					if (!mapContainer) {
						console.error('地图容器元素未找到!');
						return;
					}
					
					console.log('地图容器已加载，初始化高德地图');
					
					try {
						// 检查AMap是否已加载
						if (typeof window.AMap === 'undefined') {
							console.log('AMap未定义，动态加载脚本');
							
							// 动态加载高德地图脚本
							const script = document.createElement('script');
							// 使用环境变量中的高德地图API密钥或设置一个默认的开发密钥
							const amapKey = import.meta.env.VITE_AMAP_KEY || '36b5c28cb6ddb8426b802b4d88068afa';
							script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}`;
							script.async = true;
							
							script.onload = () => {
								console.log('高德地图脚本已加载');
								// 检查AMap是否成功加载
								if (typeof window.AMap !== 'undefined') {
									console.log('AMap加载成功，版本:', window.AMap.version);
									// 初始化地图
									initMap();
								} else {
									console.error('脚本加载完成，但AMap对象仍然未定义');
									uni.showToast({
										title: '地图初始化失败',
										icon: 'none'
									});
								}
							};
							
							script.onerror = (error) => {
								console.error('加载高德地图脚本失败:', error);
								uni.showToast({
									title: '地图服务加载失败',
									icon: 'none'
								});
							};
							
							document.head.appendChild(script);
						} else {
							// AMap已存在，直接初始化地图
							console.log('AMap已加载，直接初始化地图');
							initMap();
						}
					} catch (e) {
						console.error('初始化高德地图过程中出错:', e);
					}
				}, 1000);
			};
			
			// 添加初始化地图的函数
			const initMap = () => {
				try {
					// 检查AMap是否可用
					if (typeof window.AMap === 'undefined') {
						console.error('AMap对象仍然未定义，无法初始化地图');
						uni.showToast({
							title: '地图加载失败，请刷新页面',
							icon: 'none',
							duration: 3000
						});
						return;
					}
					
					console.log('准备初始化地图，AMap版本:', window.AMap.version);
					
					if (!map.value) {
						// 初始化地图对象
						const mapOptions = {
							zoom: 15,
							center: [currentLocation.value.longitude, currentLocation.value.latitude],
							resizeEnable: true
						};
						
						console.log('地图初始化参数:', mapOptions);
						
						// 确保DOM元素存在
						const mapContainer = document.getElementById('map-container');
						if (!mapContainer) {
							console.error('找不到地图容器元素(#map-container)');
							return;
						}
						
						try {
							map.value = new window.AMap.Map('map-container', mapOptions);
							// 保存到全局对象以便在其他函数中访问
							if (typeof window !== 'undefined') {
								window.__dogRunMapInstance = map.value;
							}
							console.log('高德地图初始化完成');
						} catch (mapError) {
							console.error('创建地图实例时发生错误:', mapError);
							uni.showToast({
								title: '创建地图失败: ' + mapError.message,
								icon: 'none',
								duration: 3000
							});
							return;
						}
								
						// 地图加载完成后再创建用户标记
						map.value.on('complete', () => {
							console.log('地图加载完成，创建用户标记');
							
							// 将地图实例存储在DOM元素中
							if (mapContainer) {
								mapContainer.__amap_instance__ = map.value;
							}
							
							// 简化地图标记创建条件，只需要位置信息
							setTimeout(() => {
								if (currentLocation.value && typeof currentLocation.value.latitude !== 'undefined') {
									console.log('开始创建初始用户标记');
									// 使用toggleMarker创建用户标记
									toggleMarker();
									console.log('初始用户标记已创建');
								} else {
									console.warn('无法创建用户标记：位置不可用');
								}
							}, 1000);
						});

						// 添加点击事件
						map.value.on('click', (e) => {
							console.log('高德地图点击事件:', e);
							
							// 模拟标准点击事件格式
							onMapTap({
								detail: {
									x: e.pixel.x,
									y: e.pixel.y
								}
							});
						});
								
						// 设置标记点击处理器
						setTimeout(setupMarkerClickHandlers, 2000);
					} else {
						console.log('地图已经初始化，不需要重复创建');
					}
				} catch (e) {
					console.error('创建地图实例失败:', e);
					// 显示错误提示
					uni.showToast({
						title: '地图初始化失败，请重试',
						icon: 'none',
						duration: 3000
					});
				}
			};
			
			// 执行初始化
			initAMap();
			
			console.log('组件挂载完成');
		});
		
		// 预加载图片
		const preloadImage = (src, callback) => {
			if (!src) {
				console.warn('preloadImage: 无效的图片源');
				if (callback) callback(defaultAvatarBase64);
				return;
			}
			
			console.log('预加载图片:', src);
			const img = new Image();
			const maxRetries = 3;
			let retryCount = 0;
			
			img.onload = () => {
				console.log('图片加载成功:', src);
				if (callback) callback(src);
			};
			
			img.onerror = () => {
				console.error('图片加载失败:', src);
				
				// 如果是相对路径 /uploads/，尝试不同的基础URL
				if (src.startsWith('/uploads/') && retryCount < maxRetries) {
					retryCount++;
					console.log(`尝试重新加载 (${retryCount}/${maxRetries})...`);
					
					// 尝试不同的基础URL
					let newSrc = src;
					if (retryCount === 1) {
						newSrc = 'http://localhost:5000' + src;
					} else if (retryCount === 2) {
						newSrc = 'http://localhost:3000' + src;
					} else if (retryCount === 3) {
						newSrc = window.location.origin + src;
					}
					
					console.log('尝试新URL:', newSrc);
					img.src = newSrc;
					return;
				}
				
				// 所有重试失败，使用默认头像
				console.warn('所有重试失败，使用默认头像');
				if (callback) callback(defaultAvatarBase64);
			};
			
			img.src = src;
		};
		
		// 组件卸载前
		onBeforeUnmount(() => {
			// 清理定时器
			if (locationUpdateInterval.value) {
				clearInterval(locationUpdateInterval.value);
			}
			
			if (nearbyUsersUpdateInterval.value) {
				clearInterval(nearbyUsersUpdateInterval.value);
			}
			
			if (walkingTimer.value) {
				clearInterval(walkingTimer.value);
			}
			
			// 停止设备方向监听
			if (typeof uni.stopDeviceMotionListening === 'function') {
				uni.stopDeviceMotionListening({
					success: () => {
						console.log('设备方向监听已停止');
					}
				});
			}
			
			// 取消罗盘监听
			if (typeof uni.offCompassChange === 'function') {
				uni.offCompassChange();
			}
		});
		
		// 强制刷新用户标记
		function forceRefreshMarker(forceUseUploaded = false) {
			// 确保有位置信息
			if (!currentLocation.value || typeof currentLocation.value.latitude === 'undefined') {
				console.error('当前位置信息不可用，无法添加标记');
				uni.showToast({
					title: '无法获取位置信息',
					icon: 'none'
				});
				return;
			}
			
			// 检查userStore状态
			console.log('==== 用户信息调试 ====');
			console.log('userStore.userInfo:', userStore.userInfo);
			console.log('userStore.token:', userStore.token);
			console.log('userStore.isAuthenticated:', userStore.isAuthenticated);
			console.log('==== 头像信息调试 ====');
			console.log('原始头像路径:', userStore.userInfo?.avatar);
			
			// 先清理所有当前用户的标记
			if (map.value) {
				const allMapMarkers = map.value.getAllOverlays('marker');
				console.log(`清理前地图上有 ${allMapMarkers.length} 个标记`);
				
				// 移除所有与当前用户相关的标记，包括"current-user-location"标记
				allMapMarkers.forEach(marker => {
					try {
						const markerId = marker?.getExtData?.()?.userId;
						if (markerId === 'current-user-location' || 
							(userStore.userInfo && markerId === userStore.userInfo.id)) {
							console.log(`移除用户标记: ${markerId}`);
							map.value.remove(marker);
							// 同时从userMarkers对象中移除
							if (userMarkers[markerId]) {
								delete userMarkers[markerId];
							}
						}
					} catch (err) {
						console.error('处理标记时出错:', err);
					}
				});
				
				// 短暂延迟后再创建新标记，确保旧标记被完全清理
				setTimeout(() => {
					// 创建新标记，现在只会创建一个
					console.log('创建新的用户标记');
					toggleMarker();
				}, 100);
			}
		}

		// 创建默认用户标记
		function createDefaultUserMarker() {
			// 绘制默认蓝色圆形标记
			const ctx = uni.createCanvasContext('debug-canvas');
			
			// 设置更大的尺寸
			const canvasSize = 100;
			const centerPoint = canvasSize / 2;
			const borderWidth = 6;
			
			// 清空画布
			ctx.clearRect(0, 0, canvasSize, canvasSize);
			
			// 添加阴影效果
			ctx.setShadow(0, 4, 8, 'rgba(0, 0, 0, 0.4)');
			
			// 绘制白色背景
			ctx.beginPath();
			ctx.arc(centerPoint, centerPoint, centerPoint - borderWidth, 0, 2 * Math.PI);
			ctx.setFillStyle('white');
			ctx.fill();
			
			// 关闭阴影
			ctx.setShadow(0, 0, 0, 'rgba(0, 0, 0, 0)');
			
			// 画蓝色圆形
			ctx.beginPath();
			ctx.arc(centerPoint, centerPoint, centerPoint - (borderWidth * 2), 0, 2 * Math.PI);
			ctx.setFillStyle('#007AFF');
			ctx.fill();
			
			// 添加用户首字母或图标
			if (userStore.userInfo && userStore.userInfo.nickname) {
				ctx.setFillStyle('white');
				ctx.setFontSize(32); // 增大字体
				ctx.setTextAlign('center');
				ctx.setTextBaseline('middle');
				const initial = userStore.userInfo.nickname.charAt(0).toUpperCase();
				ctx.fillText(initial, centerPoint, centerPoint);
			} else {
				// 绘制简单的宠物图标
				ctx.beginPath();
				ctx.moveTo(centerPoint - 15, centerPoint - 15);
				ctx.arc(centerPoint - 15, centerPoint - 15, 6, 0, 2 * Math.PI); // 左眼
				ctx.moveTo(centerPoint + 15, centerPoint - 15);
				ctx.arc(centerPoint + 15, centerPoint - 15, 6, 0, 2 * Math.PI); // 右眼
				ctx.moveTo(centerPoint, centerPoint + 10);
				ctx.arc(centerPoint, centerPoint + 10, 12, 0, Math.PI); // 笑脸
				ctx.setStrokeStyle('white');
				ctx.setLineWidth(3);
				ctx.stroke();
			}
			
			// 绘制到Canvas
			ctx.draw(false, () => {
				uni.canvasToTempFilePath({
					canvasId: 'debug-canvas',
					success: (res) => {
						// 使用默认标记
						const mapCtx = uni.createMapContext('map');
						const marker = {
							id: 'user-location',
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							iconPath: res.tempFilePath,
							width: 60,
							height: 60,
							anchor: {
								x: 0.5,
								y: 0.5
							},
							callout: {
								content: userStore.userInfo?.nickname || '我的位置',
								color: '#333333',
								fontSize: 14,
								borderRadius: 4,
								bgColor: '#ffffff',
								padding: 8,
								display: 'BYCLICK'
							},
							class: 'custom-marker-class',
							clickable: true,
							zIndex: 999
						};
						
						mapCtx.addMarkers({
							markers: [marker],
							success: () => {
								console.log('成功添加默认标记');
							},
							fail: (err) => {
								console.error('添加默认标记失败:', err);
								// 备选方法：直接添加到markers数组
								markers.value = markers.value.filter(m => m.id !== 'user-location');
								markers.value.push(marker);
							}
						});
					},
					fail: (err) => {
						console.error('默认标记Canvas转换失败:', err);
						// 最后的备选方案，创建一个非常简单的标记
						const simpleMarker = {
							id: 'user-location',
							latitude: currentLocation.value.latitude,
							longitude: currentLocation.value.longitude,
							iconPath: defaultAvatarBase64,
							width: 60,
							height: 60,
							anchor: {
								x: 0.5,
								y: 0.5
							},
							class: 'custom-marker-class',
							clickable: true,
							zIndex: 999
						};
						markers.value = markers.value.filter(m => m.id !== 'user-location');
						markers.value.push(simpleMarker);
					}
				});
			});
		}

		// 重新加载用户信息
		async function reloadUserInfo() {
			try {
				console.log('开始重新加载用户信息...');
				
				// 先输出当前用户信息和头像路径
				console.log('当前用户信息:', JSON.stringify(userStore.userInfo));
				console.log('当前头像路径:', userStore.userInfo?.avatar);
				console.log('当前计算的头像URL:', userAvatar.value);
				
				// 重新从服务器获取用户信息
				await userStore.fetchUserInfo();
				
				// 输出更新后的用户信息和头像路径
				console.log('更新后的用户信息:', JSON.stringify(userStore.userInfo));
				console.log('更新后的头像路径:', userStore.userInfo?.avatar);
				console.log('更新后的计算头像URL:', userAvatar.value);
				
				// 检查环境变量
				console.log('环境变量VITE_API_URL:', import.meta.env.VITE_API_URL);
				
				// 强制刷新标记 - 使用强制上传头像模式
				uni.showToast({
					title: '用户信息已更新',
					icon: 'none'
				});
				
				// 延迟一下再刷新标记，确保数据已更新
				setTimeout(() => {
					forceRefreshMarker(true); // 使用强制上传头像模式
				}, 500);
			} catch (error) {
				console.error('重新加载用户信息失败:', error);
				uni.showToast({
					title: '更新用户信息失败',
					icon: 'none'
				});
			}
		}

		// 清除头像缓存
		async function clearAvatarCache() {
			try {
				console.log('开始清除头像缓存...');
				
				// 1. 尝试清除本地存储中的用户信息
				uni.removeStorageSync('userInfo');
				console.log('已清除本地用户信息缓存');
				
				// 2. 重新获取最新用户信息
				await userStore.fetchUserInfo();
				console.log('已重新获取用户信息:', userStore.userInfo);
				
				// 3. 清除uni的文件缓存(如果有头像)
				if (userStore.userInfo?.avatar) {
					const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
					const avatarUrl = userStore.userInfo.avatar.startsWith('/uploads/') 
						? baseUrl + userStore.userInfo.avatar
						: userStore.userInfo.avatar;
					
					console.log('清除头像URL缓存:', avatarUrl);
					
					// 强制重新下载头像
					uni.downloadFile({
						url: avatarUrl,
						success: (res) => {
							console.log('头像重新下载成功:', res.tempFilePath);
							
							// 使用新下载的头像强制刷新标记
							createUserMarkerWithImage(res.tempFilePath);
							
							uni.showToast({
								title: '头像缓存已清除',
								icon: 'success'
							});
						},
						fail: (err) => {
							console.error('头像重新下载失败:', err);
							uni.showToast({
								title: '头像缓存清除失败',
								icon: 'none'
							});
						}
					});
				} else {
					console.log('用户没有头像，无需清除缓存');
					uni.showToast({
						title: '用户没有头像',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('清除头像缓存失败:', error);
				uni.showToast({
					title: '缓存清除失败',
					icon: 'none'
				});
			}
		}

		// 添加位置共享状态指示
		const locationSharingStatusVisible = ref(false);
		const locationSharingStatus = ref('未共享');
        
        // 保存遛狗记录到后端 - 定义在toggleWalkingMode之前
        async function saveWalkRecord() {
            try {
                console.log('开始保存遛狗记录...');
                
                // 选择第一个宠物（如果有）
                const petId = myPets.value.length > 0 ? (myPets.value[0]._id || myPets.value[0].id) : null;
                const petInfo = myPets.value.length > 0 ? myPets.value[0] : null;
                
                if (!petId) {
                    console.warn('没有宠物信息，无法保存遛狗记录');
                    uni.showToast({
                        title: '请先添加宠物',
                        icon: 'none'
                    });
                    return Promise.reject(new Error('没有宠物信息'));
                }
                
                // 准备遛狗记录数据
                const walkData = {
                    pet: {
                        _id: petId,
                        name: petInfo?.name || '未命名宠物',
                        avatar: petInfo?.avatar || '/static/images/default-pet.png'
                    },
                    distance: walkingDistance.value, // 以米为单位
                    duration: walkingDuration.value, // 以秒为单位
                    startTime: new Date(walkingStartTime.value).toISOString(),
                    endTime: new Date().toISOString(),
                    route: walkingLocations.value,
                    mapImageUrl: '/static/images/default-map.png' // 默认地图图片
                };
                
                console.log('发送遛狗记录数据:', {
                    宠物ID: walkData.pet._id,
                    宠物名称: walkData.pet.name,
                    距离: `${walkData.distance}米 (${(walkData.distance/1000).toFixed(2)}公里)`,
                    时长: `${walkData.duration}秒 (${Math.floor(walkData.duration/60)}分${walkData.duration%60}秒)`,
                    开始时间: new Date(walkData.startTime).toLocaleString(),
                    结束时间: new Date(walkData.endTime).toLocaleString(),
                    路线点数: walkData.route.length
                });
                
                // 调用API保存记录
                console.log('调用API: api.walk.startWalk, URL: /api/walks/start');
                const result = await api.walk.startWalk(walkData);
                console.log('遛狗记录保存结果:', result);
                
                // 从结果中获取walkId（兼容多种返回格式）
                let walkId = null;
                
                if (result && result.code === 0 && result.data) {
                    // 标准格式: { code: 0, message: '成功', data: { walkId: 'xxx' } }
                    walkId = result.data.walkId;
                    console.log('从标准格式获取walkId:', walkId);
                } else if (result && (result._id || result.id)) {
                    // 对象格式: { _id: 'xxx', ...}
                    walkId = result._id || result.id;
                    console.log('从对象属性获取walkId:', walkId);
                } else if (result && result.data && (result.data._id || result.data.id || result.data.walkId)) {
                    // 嵌套格式: { data: { _id: 'xxx', ...} }
                    walkId = result.data._id || result.data.id || result.data.walkId;
                    console.log('从嵌套对象获取walkId:', walkId);
                }
                
                if (!walkId) {
                    console.error('无法从API响应获取walkId:', result);
                    return Promise.reject(new Error('无法获取遛狗记录ID'));
                }
                
                console.log('遛狗记录创建成功，ID:', walkId);
                
                // 延迟一下再结束遛狗记录，确保开始记录已被处理
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 结束遛狗记录
                try {
                    console.log(`调用API: api.walk.endWalk, URL: /api/walks/${walkId}/end`);
                    const endResult = await api.walk.endWalk(walkId, {
                        distance: walkingDistance.value,
                        duration: walkingDuration.value,
                        endTime: new Date().toISOString()
                    });
                    
                    console.log('遛狗记录结束结果:', endResult);
                } catch (endError) {
                    // 结束遛狗出错，但仍然返回walkId，因为记录已创建
                    console.error('结束遛狗记录失败，但初始记录已保存:', endError);
                }
                
                // 显示成功提示
                uni.showToast({
                    title: '记录已保存',
                    icon: 'success'
                });
                
                // 延迟3秒后导航到记录页面
                setTimeout(() => {
                    console.log('准备跳转到遛狗记录页面...');
                    uni.navigateTo({
                        url: '/pages/walk/history',
                        success: () => {
                            console.log('成功跳转到遛狗记录页面');
                        },
                        fail: (err) => {
                            console.error('跳转到遛狗记录页面失败:', err);
                        }
                    });
                }, 3000);
                
                return Promise.resolve(walkId);
            } catch (error) {
                console.error('保存遛狗记录出错:', error);
                console.error('错误详情:', error.message || '未知错误');
                if (error.statusCode) {
                    console.error('HTTP状态码:', error.statusCode);
                    
                    if (error.statusCode === 404) {
                        console.error('API端点不存在，使用本地存储');
                        
                        // 如果API端点不存在，尝试直接使用walkStorage
                        try {
                            const walkStorage = uni.requireNativePlugin('walkStorage') || require('@/utils/walkStorage.js').default;
                            
                            // 准备遛狗记录数据
                            const walkData = {
                                pet: {
                                    _id: myPets.value.length > 0 ? (myPets.value[0]._id || myPets.value[0].id) : 'default-pet',
                                    name: myPets.value.length > 0 ? myPets.value[0].name : '未命名宠物',
                                    avatar: myPets.value.length > 0 ? myPets.value[0].avatar : '/static/images/default-pet.png'
                                },
                                distance: walkingDistance.value,
                                duration: walkingDuration.value,
                                startTime: new Date(walkingStartTime.value).toISOString(),
                                endTime: new Date().toISOString(),
                                route: walkingLocations.value
                            };
                            
                            console.log('尝试使用本地存储保存遛狗记录');
                            const result = walkStorage.saveWalkRecord(walkData);
                            console.log('本地存储保存结果:', result);
                            
                            if (result && result.code === 0 && result.data && result.data.walkId) {
                                return Promise.resolve(result.data.walkId);
                            } else {
                                throw new Error('本地存储保存失败');
                            }
                        } catch (localError) {
                            console.error('使用本地存储保存失败:', localError);
                        }
                    }
                }
                
                uni.showToast({
                    title: '保存记录失败: ' + (error.message || '未知错误'),
                    icon: 'none',
                    duration: 3000
                });
                throw error;
            }
        }

		// 切换遛狗模式
		function toggleWalkingMode() {
			console.log('切换遛狗模式，当前状态:', isWalking.value);
			
			// 如果已经在行走状态，停止行走
			if (isWalking.value) {
				// 停止遛狗
				isWalking.value = false;
				clearInterval(walkingTimer.value);
				walkingTimer.value = null;
				
				// 停止位置共享
				isLocationShared.value = false;
				locationSharingStatusVisible.value = false;
				
				// 显示当前遛狗时间以便调试
				console.log('遛狗结束，时长:', walkingDuration.value, '秒');
				console.log('遛狗距离:', walkingDistance.value, '米');
				
				// 检查遛狗时间（测试时设置为5秒，正式环境应该是30秒或更长）
				const minWalkTime = 5; // 在测试环境中设置较短的最小遛狗时间
				
				if (walkingDuration.value >= minWalkTime) {
					// 先准备摘要内容
					prepareWalkSummary();
					
					// 尝试保存遛狗记录
					saveWalkRecord().then(walkId => {
						// 保存成功后显示摘要
						console.log('遛狗记录保存成功，ID:', walkId);
						showWalkSummary.value = true;
						
						// 提示用户保存成功
						uni.showToast({
							title: '记录已保存',
							icon: 'success',
							duration: 2000
						});
					}).catch(error => {
						console.error('保存遛狗记录失败:', error);
						// 即使保存失败也显示摘要
						showWalkSummary.value = true;
						// 提示用户保存失败
						uni.showToast({
							title: '记录保存失败，使用本地存储',
							icon: 'none',
							duration: 2000
						});
					});
				} else {
					// 时间太短，不保存记录
					console.log('遛狗时间太短，不保存记录');
					uni.showToast({
						title: `遛狗时间太短（少于${minWalkTime}秒），未保存记录`,
						icon: 'none',
						duration: 2000
					});
				}
			} else {
				// 如果不在行走状态，显示位置共享提示
				showLocationSharingTip.value = true;
			}
		}

		// 取消位置共享 - 修复API错误
		function cancelLocationSharing() {
		  try {
			// 直接在本地禁用位置共享，不调用API
			isLocationShared.value = false;
			showLocationSharingTip.value = false;
			
			// 更新本地状态而非服务器状态
			console.log('已禁用位置共享（本地）');
			
			// 显示状态变更通知
			uni.showToast({
			  title: '已停止位置共享',
			  icon: 'none'
			});
		  } catch (error) {
			console.error('停止位置共享出错:', error);
		  }
		}

		// 确认位置共享 - 修复API错误
		function confirmLocationSharing() {
		  try {
			// 直接在本地启用位置共享，不调用API
			isLocationShared.value = true;
			showLocationSharingTip.value = false;
			
			// 更新本地状态
			console.log('已启用位置共享（本地）');
			
			// 显示状态变更通知
			uni.showToast({
			  title: '已开始位置共享',
			  icon: 'success'
			});
			
			// 立即更新位置
			startLocationSharing();
			
			// 开始遛狗模式
			startWalkingMode();
		  } catch (error) {
			console.error('开始位置共享出错:', error);
		  }
		}

		// 开始遛狗模式
		function startWalkingMode() {
			// 开始遛狗
			isWalking.value = true;
			walkingStartTime.value = Date.now();
			walkingDistance.value = 0;
			walkingDuration.value = 0;
			walkingLocations.value = [
				{ latitude: currentLocation.value.latitude, longitude: currentLocation.value.longitude }
			];
			walkingPath.value = [{
				points: [
					{ latitude: currentLocation.value.latitude, longitude: currentLocation.value.longitude }
				],
				color: '#007AFF',
				width: 4
			}];
			
			// 清除可能存在的旧计时器
			if (walkingTimer.value) {
				clearInterval(walkingTimer.value);
			}
			
			// 启动计时器
			console.log('开始遛狗，设置计时器');
			walkingTimer.value = setInterval(() => {
				const currentTime = Date.now();
				const elapsedSeconds = Math.floor((currentTime - walkingStartTime.value) / 1000);
				walkingDuration.value = elapsedSeconds;
				
				// 每30秒输出一次当前遛狗时长，方便调试
				if (elapsedSeconds % 30 === 0 && elapsedSeconds > 0) {
					console.log('遛狗进行中，已经', elapsedSeconds, '秒');
				}
			}, 1000);
			
			// 记录遛狗开始的信息
			console.log('遛狗模式已开始:', {
				开始时间: new Date(walkingStartTime.value).toLocaleTimeString(),
				初始位置: walkingLocations.value[0]
			});
		}

		// 添加地图拖动状态跟踪
		const mapIsDragging = ref(false);

		// 添加地图开始拖动事件处理
		function onMapDragStart() {
			console.log('地图开始拖动');
			mapIsDragging.value = true;
		}

		// 添加地图结束拖动事件处理
		function onMapDragEnd() {
			console.log('地图结束拖动');
			setTimeout(() => {
				mapIsDragging.value = false;
			}, 50); // 短暂延迟，避免与点击事件冲突
		}

		// 增强型地图点击事件，处理标记点击
		function onMapTap(e) {
			console.log('地图点击事件:', e);
			
			// 如果正在拖动地图，不处理点击
			if (mapIsDragging.value) {
				console.log('地图正在拖动，忽略点击');
				return;
			}
			
			// 获取点击坐标
			const { x, y } = e.detail;
			
			// 如果没有坐标，无法处理
			if (x === undefined || y === undefined) {
				console.log('点击事件没有坐标信息');
				return;
			}
			
			// 获取页面上所有可见的标记元素
			try {
				// 1. 先尝试直接获取高德地图标记
				const amapMarkers = document.querySelectorAll('.amap-marker');
				if (amapMarkers.length > 0) {
					console.log('找到高德地图标记:', amapMarkers.length, '个');
					
					// 检查点击是否在标记元素上
					for (const marker of amapMarkers) {
						const rect = marker.getBoundingClientRect();
						
						// 检查点击点是否在标记元素的矩形区域内
						if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
							console.log('点击命中标记元素:', marker);
							
							// 尝试从元素获取标记ID
							const markerId = marker.getAttribute('data-id') || 
											marker.id || 
											marker.getAttribute('id');
							
							if (markerId) {
								// 有ID，触发标记点击事件
								console.log('触发标记点击:', markerId);
								onMarkerTap({detail: {markerId}});
								return; // 处理完成，退出函数
							}
							
							// 没有ID，但确实点击了标记，从附近用户中找出最接近的
							const closestUser = findClosestUserToClick(x, y);
							if (closestUser) {
								console.log('找到最接近的用户:', closestUser.nickname || closestUser.username);
								onMarkerTap({detail: {markerId: closestUser.id}});
								return;
							}
						}
					}
				}
				
				// 2. 尝试查找附近用户中最接近点击位置的
				const closestUser = findClosestUserToClick(x, y);
				if (closestUser) {
					console.log('找到最接近的用户:', closestUser.nickname || closestUser.username);
					onMarkerTap({detail: {markerId: closestUser.id}});
					return;
				}
			} catch (error) {
				console.error('处理地图点击事件出错:', error);
			}
			
			// 如果点击事件没有被处理为标记点击，则关闭用户弹窗
			if (showUserPopup.value) {
				showUserPopup.value = false;
			}
		}

		// 查找最接近点击位置的用户
		function findClosestUserToClick(clickX, clickY) {
			if (!nearbyUsers.value || !nearbyUsers.value.length) return null;
			
			// 获取地图元素
			const mapElement = document.getElementById('map');
			if (!mapElement) return null;
			
			const mapRect = mapElement.getBoundingClientRect();
			const mapWidth = mapRect.width;
			const mapHeight = mapRect.height;
			
			// 获取地图中心点像素坐标
			const centerX = mapRect.left + mapWidth / 2;
			const centerY = mapRect.top + mapHeight / 2;
			
			// 计算点击点相对于地图中心的偏移量（像素）
			const offsetX = clickX - centerX;
			const offsetY = clickY - centerY;
			
			// 根据当前地图比例尺，估算偏移量对应的经纬度变化
			// 注意：这是一个简化的估算，实际计算会更复杂
			const scale = mapScale.value;
			const latPerPixel = 0.000005 * (20 / scale); // 粗略估计每像素纬度变化
			const lngPerPixel = 0.000005 * (20 / scale) / Math.cos(currentLocation.value.latitude * Math.PI / 180); // 考虑纬度对经度的影响
			
			// 计算点击位置的估计经纬度
			const clickLat = currentLocation.value.latitude - offsetY * latPerPixel;
			const clickLng = currentLocation.value.longitude + offsetX * lngPerPixel;
			
			console.log('点击经纬度估计:', {lat: clickLat, lng: clickLng});
			
			// 找出最接近点击位置的用户
			let closestUser = null;
			let minDistance = Infinity;
			
			nearbyUsers.value.forEach(user => {
				if (!user.latitude || !user.longitude) return;
				
				// 计算用户与点击位置的距离
				const distance = Math.sqrt(
					Math.pow((user.latitude - clickLat) / latPerPixel, 2) + 
					Math.pow((user.longitude - clickLng) / lngPerPixel, 2)
				);
				
				// 设置一个合理的阈值（约30像素）
				if (distance < 30 && distance < minDistance) {
					minDistance = distance;
					closestUser = user;
				}
			});
			
			return closestUser;
		}

		// 地图区域变更事件
		function onMapRegionChange(e) {
			console.log('地图区域变更:', e);
			// 处理拖动开始和结束
			if (e.type === 'begin' && e.causedBy === 'drag') {
				onMapDragStart();
			} else if (e.type === 'end' && e.causedBy === 'drag') {
				onMapDragEnd();
			}
		}

		// 地图容器点击处理
		function onMapContainerClick(e) {
			console.log('地图容器点击事件:', e);
			
			// 获取点击坐标
			const { clientX, clientY } = e;
			
			// 检查是否点击了标记
			const markers = document.querySelectorAll('.amap-marker');
			for (const marker of markers) {
				const rect = marker.getBoundingClientRect();
				
				// 检查点击是否在标记区域内
				if (clientX >= rect.left && clientX <= rect.right && 
					clientY >= rect.top && clientY <= rect.bottom) {
					console.log('点击了标记元素:', marker);
					
					// 获取用户ID
					const userId = marker.getAttribute('data-user-id');
					if (userId) {
						console.log('触发标记点击, 用户ID:', userId);
						e.stopPropagation();
						onMarkerTap({detail: {markerId: userId}});
						return;
					}
				}
			}
			
			// 如果没有点击标记，关闭用户弹窗
			if (showUserPopup.value) {
				showUserPopup.value = false;
			}
		}

		// 地图更新事件处理函数
		function onMapUpdated(e) {
			// 地图更新时的回调
			console.log('地图更新事件触发');
			
			// 安全更新调试信息
			if (showDebug.value) {
				try {
					updateDebugInfo();
				} catch (e) {
					console.error('更新调试信息错误:', e);
				}
			}
			
			// 检查位置共享状态
			const sharingEnabled = locationStore.sharingEnabled;
			isLocationShared.value = sharingEnabled;
			console.log('位置共享状态:', isLocationShared.value ? '已开启' : '已关闭');
			
			// 即使位置共享关闭，也允许创建标记和查看用户
			
			// 检查是否需要添加用户标记 - 避免频繁添加
			if (!window._lastMarkerCheck || (Date.now() - window._lastMarkerCheck > 30000)) {
				window._lastMarkerCheck = Date.now();
				
				try {
					// 检查是否有用户标记
					const hasUserMarker = allMarkers.value.some(m => m.id === 'user-location');
					
					if (currentLocation.value && 
						typeof currentLocation.value.latitude !== 'undefined' && 
						currentLocation.value.latitude !== null &&
						!hasUserMarker) {
						console.log('添加用户标记...');
						// 获取用户头像URL
						const avatarUrl = userAvatar.value;
						
						// 标记用户自身的ID
						const userId = userStore.userInfo ? userStore.userInfo.id : 'user-location';
						
						// 获取用户当前位置
						const userPosition = [currentLocation.value.longitude, currentLocation.value.latitude];
						
						// 检查是否已经是Base64格式
						if (avatarUrl.startsWith('data:image/')) {
							// 直接使用Base64创建标记
							createUserMarkerWithImage(userId, userPosition, avatarUrl);
						} else {
							// 尝试加载图片
							const img = new Image();
							img.crossOrigin = 'anonymous';
							img.onload = () => {
								// 图片加载成功，创建用户标记
								createUserMarkerWithImage(userId, userPosition, avatarUrl);
							};
							img.onerror = () => {
								// 图片加载失败，使用默认头像
								console.error('加载用户头像失败，使用默认头像');
								createUserMarkerWithImage(userId, userPosition, defaultAvatarBase64);
							};
							img.src = avatarUrl;
							
							// 为防止图片加载超时，设置3秒后使用默认头像
							setTimeout(() => {
								if (!img.complete || img.naturalWidth === 0) {
									createUserMarkerWithImage(userId, userPosition, defaultAvatarBase64);
								}
							}, 3000);
						}
					}
				} catch (e) {
					console.error('添加标记错误:', e);
				}
			}
		}

		// 添加onMarkerTap函数的定义
		async function onMarkerTap(e) {
			try {
				// 尝试从事件对象获取标记ID
				let markerId = e.markerId || e.detail?.markerId;
				
				// 如果事件对象没有markerId，尝试从detail.marker获取
				if (!markerId && e.detail?.marker) {
					markerId = e.detail.marker.id;
				}
				
				// 如果还没有找到markerId，尝试从nativeEvent获取
				if (!markerId && e.detail?.nativeEvent) {
					const target = e.detail.nativeEvent.target;
					if (target && target.dataset) {
						markerId = target.dataset.userId || target.dataset.id;
					}
				}
				
				// 处理获取到的标记ID
				if (markerId) {
					console.log('获取到标记ID:', markerId);
					await processUserMarkerTap(markerId);
				} else {
					console.error('无法获取标记ID');
					// 尝试从nearbyUsers中选择第一个用户作为备选
					if (Array.isArray(nearbyUsers.value) && nearbyUsers.value.length > 0) {
						console.log('使用第一个附近用户作为备选');
						await processUserMarkerTap(nearbyUsers.value[0].id);
					} else {
						// 无法确定用户，显示提示
						uni.showToast({
							title: '无法获取用户信息',
							icon: 'none'
						});
					}
				}
			} catch (err) {
				console.error('标记点击处理出错:', err);
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		}

		/**
		 * 处理用户标记点击事件
		 * @param {String} markerId 标记ID
		 */
		async function processUserMarkerTap(userId) {
			console.log('处理用户标记点击事件, 用户ID:', userId);
			
			try {
				// 使用selectUserMarker方法显示用户信息弹窗，包含关注功能
				await selectUserMarker(userId);
						} catch (error) {
				console.error('处理用户标记点击失败:', error);
			}
		}

		// 添加一个函数来定期扫描和处理标记元素
		function setupMarkerClickHandlers() {
			try {
				// 找到所有AMap标记元素
				const markers = document.querySelectorAll('.amap-marker');
				if (markers.length > 0) {
					console.log('发现地图标记元素:', markers.length, '个');
					
					// 调试信息：显示所有标记元素的data-user-id属性
					let userIDs = [];
					markers.forEach(marker => {
						const userId = marker.getAttribute('data-user-id') || 
							(marker.id ? marker.id.match(/marker-([^"\s]+)/)?.[1] : null);
						if (userId) userIDs.push(userId);
					});
					console.log('地图上的用户ID:', userIDs);
					
					// 使用setTimeout确保DOM操作在渲染完成后进行
					setTimeout(() => {
						// 遍历所有标记元素
						markers.forEach((marker) => {
							// 如果标记没有clickHandler属性，添加事件监听器
							if (!marker.hasAttribute('data-click-handler')) {
								// 添加点击事件
								marker.addEventListener('click', (e) => {
									e.stopPropagation(); // 阻止事件冒泡
									console.log('标记点击事件 (直接):', marker);
									
									// 尝试各种方法获取用户ID
									let userId = marker.getAttribute('data-user-id');
									
									// 尝试从类名中提取
									if (!userId && marker.className) {
										const match = marker.className.match(/user-marker-([^"\s]+)/);
										if (match && match[1]) {
											userId = match[1];
										}
									}
									
									// 尝试从marker id中提取
									if (!userId && marker.id) {
										const match = marker.id.match(/marker-([^"\s]+)/);
										if (match && match[1]) {
											userId = match[1];
										}
									}
									
									// 从图像元素尝试获取userId
									if (!userId) {
										const img = marker.querySelector('img');
										if (img) {
											userId = img.getAttribute('data-user-id');
										}
									}
									
									console.log('尝试提取的用户ID:', userId);
									
									if (userId) {
										console.log('找到用户ID，触发标记点击事件:', userId);
										// 使用processUserMarkerTap处理标记点击
										processUserMarkerTap(userId);
									} else if (nearbyUsers.value && nearbyUsers.value.length > 0) {
										// 如果无法识别，尝试使用第一个附近用户
										console.log('无法识别用户ID，使用第一个附近用户');
										processUserMarkerTap(nearbyUsers.value[0].id);
									}
								});
								
								// 标记此元素已添加事件处理器
								marker.setAttribute('data-click-handler', 'true');
								
								// 设置样式确保元素可点击
								marker.style.cursor = 'pointer';
								marker.style.pointerEvents = 'auto';
								marker.style.zIndex = '999';
								
								// 找到内部图像元素并应用样式
								const iconElem = marker.querySelector('.amap-icon');
								if (iconElem) {
									iconElem.style.borderRadius = '50%';
									iconElem.style.overflow = 'hidden';
									
									// 处理图像元素
									const imgElem = iconElem.querySelector('img');
									if (imgElem) {
										// 为图像设置data-user-id属性
										const markerId = marker.getAttribute('data-user-id');
										if (markerId) {
											imgElem.setAttribute('data-user-id', markerId);
											// 调试信息
											console.log('设置图像元素data-user-id属性:', markerId);
										}
										
										// 设置样式
										imgElem.style.borderRadius = '50%';
										imgElem.style.width = '100%';
										imgElem.style.height = '100%';
										imgElem.style.objectFit = 'cover';
										
										// 也为图像添加点击事件
										imgElem.addEventListener('click', (e) => {
											e.stopPropagation();
											console.log('图像点击事件');
											
											// 获取用户ID从自身或父元素
											const imgUserId = imgElem.getAttribute('data-user-id') || 
												marker.getAttribute('data-user-id');
											
											console.log('图像点击 - 提取的用户ID:', imgUserId);
											
											if (imgUserId) {
												console.log('找到图像用户ID，处理标记点击:', imgUserId);
												processUserMarkerTap(imgUserId);
											}
										});
									}
								}
							}
						});
					}, 100); // 添加100ms延迟确保DOM完全渲染
				}
			} catch (e) {
				console.error('处理地图标记出错:', e);
			}
		}

		// 创建计时器，定期执行setupMarkerClickHandlers
		let markerScanInterval;

		// 监听登录状态变化
		watch(() => userStore.isAuthenticated, (isAuthenticated) => {
			console.log('用户登录状态变更:', isAuthenticated);
			if (isAuthenticated) {
				// 用户登录，获取宠物数据
				console.log('用户已登录，获取宠物数据');
				petStore.fetchPets().then(pets => {
					console.log('登录后获取宠物数据成功:', pets);
					myPets.value = pets;
				}).catch(err => {
					console.error('登录后获取宠物数据失败:', err);
				});
			} else {
				// 用户登出，清空宠物数据
				console.log('用户已登出，清空宠物数据');
				myPets.value = [];
			}
		});

		onBeforeUnmount(() => {
			// 在组件卸载时清理计时器
			if (markerScanInterval) {
				clearInterval(markerScanInterval);
			}
		});

		/**
		 * 清理额外的标记
		 * 在开发环境中，我们只需要保留当前用户的标记
		 */
		function cleanupExtraMarkers() {
			console.log('执行标记清理...');
			if (!map.value) return;
			
			// 获取当前地图上的所有标记
			const allMapMarkers = map.value.getAllOverlays('marker');
			if (!allMapMarkers || allMapMarkers.length === 0) {
				console.log('地图上没有标记，无需清理');
				return;
			}
			
			console.log(`地图上共有 ${allMapMarkers.length} 个标记`);
			
			// 获取当前用户ID
			const currentUserId = userStore.userInfo?.id || userStore.user?._id;
			if (!currentUserId) {
				console.log('未找到当前用户ID，跳过标记清理');
				return;
			}
			
			console.log('当前用户ID:', currentUserId);
			
			// 获取需要保留的所有标记ID（用户ID和当前位置标记）
			const validMarkerIds = [currentUserId, 'current-user-location'];
			
			// 记录所有标记ID用于调试
			const markerIds = [];
			allMapMarkers.forEach(marker => {
				try {
					const markerUserId = marker?.getExtData?.()?.userId || '未知';
					markerIds.push(markerUserId);
				} catch (err) {
					console.error('获取标记ID出错:', err);
				}
			});
			console.log('地图上的标记ID:', markerIds);
			
			// 遍历标记，移除非当前用户的标记
			const keptMarkers = [];
			allMapMarkers.forEach(marker => {
				try {
					const markerId = marker?.getExtData?.()?.userId;
					if (!markerId) {
						console.log('找到无ID标记，移除');
						map.value.remove(marker);
						return;
					}
					
					// 检查是否是有效的标记ID
					if (validMarkerIds.includes(markerId)) {
						console.log(`保留标记ID: ${markerId}`);
						keptMarkers.push(markerId);
					} else {
						console.log(`移除标记ID: ${markerId}`);
						map.value.remove(marker);
						
						// 同时从userMarkers对象中移除
						if (userMarkers[markerId]) {
							delete userMarkers[markerId];
						}
					}
				} catch (err) {
					console.error('清理标记时出错:', err);
				}
			});
			
			console.log(`清理完成，保留标记: ${keptMarkers.join(', ')}`);
		}

		/**
		 * 显示用户宠物模态框
		 * @param {Object} user 用户对象
		 */
		const showUserPetModal = async (user) => {
		  console.log('显示用户宠物模态框:', user);
		  
		  // 先关闭已打开的弹窗
		  showUserPopup.value = false;
		  
		  // 处理可能的通用标识符（修正为实际用户ID）
		  let userId = user?._id || user?.id;
		  
		  // 如果ID是'current-user-location'且用户已登录，则使用真实的用户ID
		  if (userId === 'current-user-location' && userStore.isAuthenticated) {
			console.log('将通用标识符转换为实际用户ID');
			userId = userStore.userInfo?.id || userStore.user?._id;
			// 同时更新user对象以保持一致性
			user = {...user, id: userId, _id: userId};
		  }
		  
		  // 检查用户对象是否有效
		  if (!userId) {
			console.error('无效的用户数据:', user);
			
			// 显示错误提示
			uni.showToast({
			  title: '无法获取用户信息',
			  icon: 'none'
			});
			return;
		  }
		  
		  try {
			// 显示加载状态
			uni.showLoading({
			  title: '加载中...'
			});
			
			// 如果是当前用户，直接从store获取宠物数据
			const currentUserId = userStore.user?._id || userStore.userInfo?.id;
			if (userId === currentUserId) {
			  console.log('当前用户，从store获取宠物数据');
			  
			  // 确保petStore中的宠物数据已更新
			  if (!petStore.pets || petStore.pets.length === 0) {
			    console.log('尝试从服务器获取最新宠物数据');
			    await petStore.fetchPets();
			  }
			  
			  // 创建带有宠物数据的用户对象
			  const currentUserWithPets = {
			    ...(userStore.user || userStore.userInfo || {}),
			    pets: petStore.pets || [],
			    isCurrentUser: true // 添加标记，表示这是当前用户
			  };
			  
			  console.log('用户宠物数据:', petStore.pets);
			  
			  selectedUser.value = currentUserWithPets;
			  selectedUserPets.value = petStore.pets || [];
			  selectedUserFollowStatus.value = false; // 自己不需要关注状态
					
			  // 设置isFollowing供模板使用
			  isFollowing.value = false;
			  
			  // 隐藏加载状态
			  uni.hideLoading();
			  
			  // 显示用户弹窗
			  showUserPopup.value = true;
			  return;
			}
			
			// 本地模拟宠物数据和关注状态
			let petsData = [];
			let followStatus = { following: false };
			
			// 如果我们没有完整的用户信息，尝试获取它
			if (!user.nickname || !user.avatar) {
			  try {
				const userResponse = await getUserInfo(userId);
				if (userResponse && userResponse.data && userResponse.data.user) {
				  user = userResponse.data.user;
				  console.log('成功获取用户详细信息:', user);
				}
			  } catch (userInfoError) {
				console.warn('获取用户详细信息失败，使用现有数据:', userInfoError);
			  }
			}
			
			// 尝试通过API获取数据（但处理可能的错误）
			try {
			  // 并行获取宠物信息和关注状态
			  await Promise.all([
				// 获取宠物信息
				(async () => {
				  if (locationStore && typeof locationStore.getUserPets === 'function') {
					try {
					  const petsResponse = await locationStore.getUserPets(userId);
					  if (petsResponse && (Array.isArray(petsResponse) || Array.isArray(petsResponse.data))) {
						petsData = Array.isArray(petsResponse) ? petsResponse : petsResponse.data || [];
					  }
					} catch (petError) {
					  console.warn('获取用户宠物数据失败:', petError);
					}
				  }
				})(),
				
				// 获取关注状态
				(async () => {
				  if (locationStore && typeof locationStore.checkFollowStatus === 'function') {
					try {
					  const followResponse = await locationStore.checkFollowStatus(userId);
					  if (followResponse && typeof followResponse.following === 'boolean') {
						followStatus = followResponse;
					  }
					} catch (followError) {
					  console.warn('获取关注状态失败:', followError);
					}
				  }
				})()
			  ]);
			} catch (apiError) {
			  console.warn('API调用失败，使用本地数据:', apiError);
			}
			
			// 更新选中的用户和宠物
			// 创建包含宠物数据的用户对象
			const userWithPets = {
			  ...user,
			  pets: petsData,
			  isCurrentUser: false
			};
			
			selectedUser.value = userWithPets;
			selectedUserPets.value = petsData;
			selectedUserFollowStatus.value = followStatus.following;
			
			// 设置isFollowing供模板使用
			isFollowing.value = selectedUserFollowStatus.value;
			
			// 隐藏加载状态
			uni.hideLoading();
			
			// 显示用户弹窗
			showUserPopup.value = true;
			
			// 添加调试信息
			console.log('显示弹窗信息:', {
			  用户: selectedUser.value,
			  宠物列表: selectedUserPets.value,
			  用户宠物属性: selectedUser.value.pets
			});
		  } catch (error) {
			console.error('获取用户宠物数据失败:', error);
			
			// 隐藏加载状态
			uni.hideLoading();
			
			// 显示错误提示
			uni.showToast({
			  title: '获取用户信息失败',
			  icon: 'none'
			});
		  }
		};

		/**
		 * 关闭用户弹窗
		 */
		function closeUserPopup() {
			console.log('关闭用户弹窗');
			showUserPopup.value = false;
			selectedUser.value = null;
			selectedUserPets.value = [];
		}

		/**
		 * 隐藏用户弹窗的函数
		 */
		function hideUserPopup() {
			console.log('隐藏用户弹窗');
			showUserPopup.value = false;
		}

		/**
		 * 获取用户信息
		 * @param {String|Number} userId 用户ID
		 * @returns {Promise} 包含用户信息的Promise
		 */
		const getUserInfo = async (userId) => {
			// 获取基础API URL
			const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
			
			try {
				const res = await new Promise((resolve, reject) => {
					uni.request({
						url: `${baseUrl}/api/users/${userId}`,
						method: 'GET',
						header: {
							'Authorization': `Bearer ${userStore.token}`
						},
						success: (res) => {
							console.log('获取用户信息响应:', res);
							resolve(res);
						},
						fail: (err) => {
							console.error('请求用户信息失败:', err);
							reject(err);
						}
					});
				});
				
				if (res.statusCode === 200 && res.data) {
					return res;
				} else if (res.statusCode === 401) {
					console.error('未认证，可能需要登录');
					uni.showToast({
						title: '请先登录',
						icon: 'none'
					});
					throw new Error('未认证: 请先登录');
				} else {
					console.error('获取用户信息失败:', res);
					throw new Error('获取用户信息失败: ' + (res.data?.message || '未知错误'));
				}
			} catch (err) {
				console.error('获取用户信息过程中发生错误:', err);
				throw err;
			}
		}

		// 选中用户标记时显示弹窗
		const selectUserMarker = async (userId) => {
		  console.log('选中用户标记:', userId);
		  
		  try {
			let user;
			let pets = [];
			
			// 判断是否是自己的ID
			if (userId === userStore.userId) {
			  user = {
				...userStore.user,
				isCurrentUser: true
			  };
			  
			  // 获取自己的宠物
			  pets = petStore.pets || [];
			} else {
			  // 获取其他用户信息
			  user = await api.user.getUserById(userId);
			  if (user) {
				user = {
				  ...user,
				  isCurrentUser: false
				};
				
				// 获取该用户的宠物
				try {
				  pets = await api.pet.getPetsByUser(userId);
				} catch (error) {
				  console.error('获取用户宠物失败:', error);
				  pets = [];
				}
				
				// 检查是否已关注该用户
				try {
				  if (userStore.isAuthenticated) {
					const currentUserInfo = await userStore.fetchUserInfo();
					isFollowing.value = currentUserInfo.following && 
					  currentUserInfo.following.some(followingId => 
						followingId === userId || (followingId._id && followingId._id === userId)
					  );
				  }
				} catch (error) {
				  console.error('检查关注状态失败:', error);
				  isFollowing.value = false;
				}
			  } else {
				console.error('未找到用户信息');
				return;
			  }
			}
			
			// 更新状态
			selectedUser.value = user;
			selectedUserPets.value = pets;
			
			// 显示弹窗
			showUserPopup.value = true;
		  } catch (error) {
			console.error('获取用户信息失败:', error);
		  }
		};

		// 返回各个变量和函数供模板使用
		return {
			userStore,
			petStore,
			mapScale,
			currentLocation,
			markers,
			allMarkers,
			nearbyUsers,
			isWalking,
			walkingPath,
			walkingDistance,
			walkingDuration,
			showUserPopup,
			selectedUser,
			selectedUserPets,
			selectedUserFollowStatus,
			isFollowing,
			showWalkSummary,
			walkShareContent,
			myPets,
			myPetsNames,
			selectedPetIndex,
			showDebug,
			debugInfo,
			showLocationSharingTip,
			isLocationShared,
			userAvatar,
			userHeading,
			defaultAvatarBase64,
			userMarker,
			locationSharingStatusVisible,
			locationSharingStatus,
			
			// 函数
			formatDuration,
			calculatePace,
			forceRefreshMarker,
			toggleMarker,
			toggleWalkingMode,
			confirmLocationSharing,
			cancelLocationSharing,
			saveWalkRecord, // 添加保存遛狗记录函数
			
			// 添加缺失的事件处理函数
			onMarkerTap,
			onMapTap,
			onMapRegionChange,
			onMapUpdated,
			hideUserPopup, // 暴露新函数给模板
			
			// 其他已有函数
			centerOnUser() {
				console.log('定位到用户位置');
				try {
					// 获取地图实例
					map.value = getMapInstance();
					
					// 检查位置信息是否有效
					if (!currentLocation.value || typeof currentLocation.value.latitude === 'undefined') {
						console.warn('当前位置信息不可用，无法定位');
						uni.showToast({
							title: '无法获取位置信息',
							icon: 'none'
						});
						return;
					}
					
					// 设置地图中心点到用户位置
					const pos = [currentLocation.value.longitude, currentLocation.value.latitude];
					console.log('设置地图中心到:', pos);
					map.value.setCenter(pos);
					map.value.setZoom(16); // 同时设置适当的缩放级别
					
					// 显示成功提示
					uni.showToast({
						title: '已定位到当前位置',
						icon: 'none',
						duration: 1000
					});
				} catch (e) {
					console.error('设置地图中心点出错:', e);
					uni.showToast({
						title: '定位失败，请重试',
						icon: 'none'
					});
				}
			},
			zoomIn() {
				console.log('放大地图');
				try {
					// 获取地图实例
					map.value = getMapInstance();
					
					// 获取当前缩放级别
					const currentZoom = map.value.getZoom();
					console.log('当前缩放级别:', currentZoom);
					
					// 增加缩放级别，确保不超过最大值(通常是18或19)
					const newZoom = Math.min(currentZoom + 1, 19);
					console.log('新缩放级别:', newZoom);
					
					// 设置新的缩放级别
					map.value.setZoom(newZoom);
					
					// 显示成功提示
					uni.showToast({
						title: '已放大地图',
						icon: 'none',
						duration: 500
					});
				} catch (e) {
					console.error('地图放大出错:', e);
					uni.showToast({
						title: '操作失败，请重试',
						icon: 'none'
					});
				}
			},
			zoomOut() {
				console.log('缩小地图');
				try {
					// 获取地图实例
					map.value = getMapInstance();
					
					// 获取当前缩放级别
					const currentZoom = map.value.getZoom();
					console.log('当前缩放级别:', currentZoom);
					
					// 减少缩放级别，确保不低于最小值(通常是3或4)
					const newZoom = Math.max(currentZoom - 1, 3);
					console.log('新缩放级别:', newZoom);
					
					// 设置新的缩放级别
					map.value.setZoom(newZoom);
					
					// 显示成功提示
					uni.showToast({
						title: '已缩小地图',
						icon: 'none',
						duration: 500
					});
				} catch (e) {
					console.error('地图缩小出错:', e);
					uni.showToast({
						title: '操作失败，请重试',
						icon: 'none'
					});
				}
			},
			closeUserPopup,
			messageUser(userId) {
				// 实现发送消息功能
				uni.navigateTo({
					url: `/pages/profile/message?userId=${userId}`
				});
			},
			followUser(userId) {
				// 实现关注用户功能
				isFollowing.value = !isFollowing.value;
				// 这里应该调用API更新关注状态
			},
			closeWalkSummary() {
				console.log('关闭步行摘要');
				showWalkSummary.value = false;
			},
			shareWalkRecord(shareData) {
				console.log('分享遛狗记录到社区', shareData);
				
				// 获取选中的宠物
				const selectedPet = shareData && shareData.selectedPetIndex >= 0 && myPets.value.length > shareData.selectedPetIndex
					? myPets.value[shareData.selectedPetIndex]
					: null;
				
				// 准备分享内容
				const petName = selectedPet ? selectedPet.name : '我的宠物';
				const distance = (walkingDistance.value / 1000).toFixed(2);
				const duration = formatDuration(walkingDuration.value);
				
				// 默认分享内容
				let content = `我和${petName}一起遛了${distance}公里，用时${duration}！`;
				
				// 如果用户输入了分享内容，则附加上用户的内容
				if (shareData && shareData.content) {
					content += '\n\n' + shareData.content;
				}
				
				// 关闭摘要弹窗
				showWalkSummary.value = false;
				
				// 首先保存遛狗记录
				saveWalkRecord().then(walkId => {
					console.log('已保存遛狗记录，准备分享到社区，记录ID:', walkId);
					
					// 获取完整的遛狗记录数据
					const walkRecordData = {
						_id: walkId,
						distance: walkingDistance.value,
						duration: walkingDuration.value,
						startTime: walkStartTime.value,
						routeSnapshot: currentRouteSnapshot.value, // 添加路线快照
						pet: selectedPet 
							? { 
								_id: selectedPet._id, 
								name: selectedPet.name, 
								avatar: selectedPet.avatar 
							} 
							: null
					};
					
					// 延迟后跳转到社区发帖页面
					setTimeout(() => {
						// 导航到发帖页面
						uni.navigateTo({
							url: '/pages/community/create',
							success: (page) => {
								// 通过事件通道传递预填内容
								uni.$emit('createPost', {
									content: content,
									walkRecord: walkRecordData
								});
								
								// 显示提示
								uni.showToast({
									title: '正在前往社区',
									icon: 'none',
									duration: 1500
								});
							},
							fail: (err) => {
								console.error('导航到社区发帖页面失败:', err);
								uni.showToast({
									title: '打开社区页面失败',
									icon: 'none'
								});
							}
						});
					}, 300);
				}).catch(error => {
					console.error('保存遛狗记录失败，无法分享到社区:', error);
					uni.showToast({
						title: '分享失败，请重试',
						icon: 'none'
					});
				});
			},
			reloadUserInfo,
			clearAvatarCache,
			onMapContainerClick,
			selectUserMarker,
			// 在methods对象中添加导航方法
			navigateToPetIdentify() {
				uni.navigateTo({
					url: '/pages/petIdentify/index'
				});
			},
		};
	}
}
</script>

<style lang="scss">
.map-container {
	position: relative;
	width: 100%;
	height: 100vh;
	overflow: hidden;
}

.map {
	width: 100%;
	height: 100%;
}

.debug-info {
	position: absolute;
	top: 10px;
	left: 10px;
	background: rgba(0, 0, 0, 0.7);
	color: white;
	padding: 10px;
	border-radius: 5px;
	font-size: 12px;
	z-index: 999;
	max-width: 80%;
	max-height: 80%;
	overflow-y: auto;
	
	text {
		display: block;
		margin-bottom: 5px;
		word-break: break-all;
	}
	
	button {
		margin-top: 10px;
		padding: 5px;
		background: #007AFF;
		color: white;
		border: none;
		border-radius: 3px;
	}
}

.toolbar {
	position: absolute;
	top: 20px;
	right: 20px;
	display: flex;
	flex-direction: column;
	gap: 10px;
	z-index: 10;
}

.toolbar-item {
	width: 40px;
	height: 40px;
	background-color: white;
	border-radius: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	
	.icon {
		font-size: 14px;
	}
	
	.toolbar-text {
		font-size: 10px;
		margin-top: 0px;
	}
}

.start-button {
	position: absolute;
	bottom: 150px; /* Increased from 90px to 150px to move it higher */
	left: 50%;
	transform: translateX(-50%);
	z-index: 10;
	
	.start-button-inner {
		width: 120px;
		height: 50px;
		background-color: #007AFF;
		border-radius: 25px;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
		
		&.active {
			background-color: #FF3B30;
		}
		
		.start-icon {
			font-size: 20px;
			margin-right: 5px;
			color: white;
		}
		
		.start-text {
			color: white;
			font-size: 16px;
			font-weight: bold;
		}
	}
}

.walking-info {
	position: absolute;
	top: 20px;
	left: 50%;
	transform: translateX(-50%);
	background-color: rgba(255, 255, 255, 0.9);
	border-radius: 10px;
	padding: 10px 20px;
	display: flex;
	gap: 20px;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	z-index: 10;
	
	.info-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		
		.label {
			font-size: 12px;
			color: #666;
		}
		
		.value {
			font-size: 16px;
			font-weight: bold;
			color: #333;
		}
	}
}

.location-share-tip {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	background-color: white;
	border-radius: 15px;
	padding: 20px;
	box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
	z-index: 100;
	width: 80%;
	max-width: 300px;
	
	.tip-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		
		.tip-text {
			font-size: 16px;
			text-align: center;
			margin-bottom: 20px;
			color: #333;
		}
		
		.tip-buttons {
			display: flex;
			width: 100%;
			gap: 10px;
			
			.tip-btn {
				flex: 1;
				padding: 10px;
				border-radius: 8px;
				text-align: center;
				font-size: 14px;
				font-weight: bold;
				
				&.cancel-btn {
					background-color: #F1F1F1;
					color: #666;
				}
				
				&.confirm-btn {
					background-color: #007AFF;
					color: white;
				}
			}
		}
	}
}

/* 自定义地图标记样式 */
:deep(.map) {
	::v-deep .amap-marker-content img {
		border-radius: 50%;
		border: 3px solid #007AFF;
		box-shadow: 0 0 10px rgba(0, 122, 255, 0.6);
	}
    
    .uni-map-marker, .uni-map-marker-content {
        border-radius: 50% !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    }
    
    .uni-map-marker img, .uni-map-marker-content img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        overflow: hidden !important;
    }
    
    /* 点击效果 */
    .uni-map-marker:active, .uni-map-marker.active {
        transform: scale(1.1) !important;
        transition: transform 0.2s !important;
    }
}

/* 设置用户标记样式 */
.user-marker {
	width: 44px;
	height: 44px;
	border-radius: 50%;
	border: 3px solid #007AFF;
	background-color: white;
	box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4);
	overflow: hidden;
	
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
}

/* 位置共享状态指示器 */
.location-sharing-status {
	position: absolute;
	top: 20px;
	left: 50%;
	transform: translateX(-50%);
	background-color: rgba(255, 255, 255, 0.9);
	border-radius: 10px;
	padding: 10px;
	display: flex;
	gap: 10px;
	box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	z-index: 10;
	
	.status-icon {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background-color: #007AFF;
		
		&.active {
			background-color: #FF3B30;
		}
	}
	
	.status-text {
		font-size: 16px;
		font-weight: bold;
		color: #333;
	}
}

/* 优化地图标记样式 - 增强圆形效果 */
:deep(.map) {
    /* 同时选择多种可能的标记元素以确保样式生效 */
    .amap-marker-content img, 
    .uni-map-marker img, 
    .uni-map-marker-content img,
    .uni-map .uni-map-cover-image {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        border: 3px solid #007AFF !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* 确保标记容器也是圆形 */
    .amap-marker-content, 
    .uni-map-marker, 
    .uni-map-marker-content,
    .uni-map .uni-map-cover-image {
        border-radius: 50% !important;
        overflow: hidden !important;
        background-color: white !important;
    }
    
    /* 点击效果 */
    .amap-marker-content:active,
    .uni-map-marker:active, 
    .uni-map-marker-content:active,
    .uni-map-cover-image:active,
    .amap-marker-content.active,
    .uni-map-marker.active, 
    .uni-map-marker-content.active,
    .uni-map-cover-image.active {
        transform: scale(1.1) !important;
        transition: transform 0.2s !important;
    }
}

/* 添加额外的全局样式以确保覆盖原始样式 */
.user-marker-circle {
    width: 100% !important;
    height: 100% !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    background-color: white !important;
    border: 3px solid #007AFF !important;
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.4) !important;
}

/* 优化地图标记样式 - 统一所有可能的选择器 */
:deep(.map) {
    .amap-marker-content img, 
    .uni-map-marker img, 
    .uni-map-marker-content img,
    .uni-map-cover-image,
    .uni-map-cover-view img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 50% !important;
        border: 3px solid #007AFF !important;
        overflow: hidden !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    }
    
    /* 确保标记容器也是圆形 */
    .amap-marker-content, 
    .uni-map-marker, 
    .uni-map-marker-content,
    .uni-map-cover-image,
    .uni-map-cover-view {
        border-radius: 50% !important;
        overflow: hidden !important;
        background-color: white !important;
    }
}

/* 添加强制样式，确保圆形显示 */
.custom-marker-class {
    border-radius: 50% !important;
    overflow: hidden !important;
    border: 3px solid #007AFF !important;
    background-color: white !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

/* 直接修改图片元素样式 */
img.marker-image {
    border-radius: 50% !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}

.map-wrapper {
	position: relative;
	width: 100%;
	height: 100vh;
}

.map-container {
	width: 100%;
	height: 100%;
}

.map-overlay {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none; /* 允许点击穿透到下层元素 */
	z-index: 5;
}
</style>

<style>
/* 直接修复amap标记元素样式 */
.amap-marker .amap-icon,
.amap-marker .amap-icon img {
    border-radius: 50% !important;
    overflow: hidden !important;
    background-color: white !important;
    border: 3px solid #007AFF !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
}

.amap-marker .amap-icon img {
    position: absolute !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
}

/* 确保点击事件能够正常传递 */
.amap-marker {
    cursor: pointer !important;
    pointer-events: auto !important;
}

.map-wrapper {
    position: relative;
    width: 100%;
    height: 100vh;
}

.map-container {
    width: 100%;
    height: 100%;
}

/* 使标记可点击 */
.amap-markers .amap-marker {
    cursor: pointer !important;
    pointer-events: auto !important;
}

/* 宠物识别按钮样式 */
.pet-identify {
	background-color: rgba(255, 127, 80, 0.8);
}
</style>

/**
 * 测试用户弹窗 - 在找不到用户信息时显示基本的测试信息
 * @param {String} userId 用户ID
 */
function testUserPopup(userId) {
	console.log('测试用户弹窗');
	
	if (!userId) {
		console.log(' 未找到用户ID，无法测试弹窗');
		return;
	}
	
	// 创建临时用户信息
	const tempUser = {
		id: userId,
		_id: userId,
		nickname: `用户${userId.substr(0, 6)}...`,
		username: `用户${userId.substr(0, 6)}...`,
		avatar: '/static/images/default-avatar.png',
	};
	
	// 设置临时宠物信息
	const tempPets = [{
		id: 'temp-pet',
		name: '临时宠物',
		breed: '未知品种',
		gender: 'unknown',
		age: 0,
		avatar: '/static/images/default-pet.png'
	}];
	
	// 设置弹窗数据
	selectedUser.value = tempUser;
	selectedUserPets.value = tempPets;
	isFollowing.value = false;
	
	// 显示弹窗
	showUserPopup.value = true;
	
	console.log('已显示测试用户弹窗，用户ID:', userId);
}