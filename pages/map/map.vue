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
			<view class="toolbar-item" @tap="showAddMarkerForm">
				<text class="icon">📍</text>
				<text class="toolbar-text">标记</text>
			</view>
			<view class="toolbar-item pet-identify" @tap="navigateToPetIdentify">
				<text class="icon">🔍</text>
				<text class="toolbar-text">识别</text>
			</view>
			<view class="toolbar-item" @tap="toggleMarkersVisibility">
				<text class="icon">👁️</text>
				<text class="toolbar-text">{{ showMarkers ? '隐藏标记' : '显示标记' }}</text>
			</view>
			<view class="toolbar-item ai-medical" @tap="navigateToAIMedical">
				<text class="icon">🏥</text>
				<text class="toolbar-text">AI医疗</text>
			</view>
		</view>

		<!-- 添加标记按钮 -->
		<!-- <view class="add-marker-btn" @click="showAddMarkerForm">
			<uni-icons type="plusempty" size="24" color="#FFFFFF"></uni-icons>
			<text class="btn-text">添加标记</text>
		</view> -->
		
		<!-- 开始/停止遛狗按钮 -->
		<view class="start-button" @tap="toggleWalkingMode">
			<view class="start-button-inner" :class="{'active': isWalking}">
				<text class="start-icon">{{ isWalking ? '⏹️' : '▶️' }}</text>
				<text class="start-text">{{ isWalking ? '停止' : '开始' }}</text>
			</view>
		</view>
		
		<!-- 添加地图刷新按钮 -->
		<view class="refresh-map-btn" @tap="refreshMap">
			<view class="refresh-btn-inner">
				<text class="refresh-icon">🔄</text>
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
		
		<!-- 自定义标记弹窗 -->
		<view v-if="showCustomMarkerPopup" class="custom-marker-popup">
			<view class="popup-backdrop" @click="showCustomMarkerPopup = false"></view>
			<view class="popup-content">
				<view class="popup-header">
					<text class="popup-title">{{ selectedMarker?.title || '未命名标记' }}</text>
					<view class="close-btn" @click="showCustomMarkerPopup = false">×</view>
				</view>
				
				<view class="popup-body">
					<view class="marker-type">
						<view class="marker-type-icon" :style="{ backgroundColor: getMarkerColor(selectedMarker?.type) }">
							<text class="type-icon">{{ getMarkerTypeIcon(selectedMarker?.type) }}</text>
						</view>
						<text class="marker-type-name">{{ getMarkerTypeName(selectedMarker?.type) }}</text>
					</view>
					
					<view class="marker-description">
						<text class="description-text">{{ selectedMarker?.description || '暂无描述内容' }}</text>
					</view>
					
					<view class="marker-info">
						<view class="info-item" v-if="selectedMarker?.radius">
							<text class="info-icon">⭕</text>
							<text class="info-text">覆盖半径: {{ selectedMarker.radius < 100 ? selectedMarker.radius + '公里 (' + (selectedMarker.radius * 1000).toFixed(0) + '米)' : selectedMarker.radius + '米' }}</text>
						</view>
						<view class="info-item" v-if="selectedMarker?.createdAt">
							<text class="info-icon">🕒</text>
							<text class="info-text">创建时间: {{ formatTime(selectedMarker.createdAt) }}</text>
						</view>
						<view class="info-item" v-if="selectedMarker?.user && typeof selectedMarker.user !== 'string'">
							<text class="info-icon">👤</text>
							<text class="info-text">创建者: {{ getUserName(selectedMarker.user) }}</text>
						</view>
					</view>
				</view>
				
				<view class="popup-footer">
					<view class="popup-btn cancel-btn" @click="showCustomMarkerPopup = false">关闭</view>
					<view class="popup-btn confirm-btn" @click="navigateToMarker(selectedMarker)">导航</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useUserStore } from '@/store/user.js';
import { usePetStore } from '@/store/pet.js';
import { useLocationStore } from '@/store/location.js';
import { useMarkerStore } from '@/stores/markerStore.js'; // 修正路径
import { formatDuration, calculatePace, calculateDistance } from '@/utils/amap.js';
import api from '@/utils/api.js'; // 添加API导入
import request from '@/utils/request.js'; // 导入request函数
import { markerIconsBase64, markerColors } from '@/static/images/marker-icons.js'; // 导入标记图标

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
		const markerStore = useMarkerStore(); // 确保引入markerStore
		
		// 后端可用状态响应式变量
		const isBackendAvailable = ref(true);
		
		// 高德地图对象
		const map = ref(null);
		// 用户标记对象 - 定义userMarkers为空对象
		const userMarkers = {};
		
		// 刷新地图函数 - 使用最简单的浏览器原生刷新方式
		function refreshMap() {
			console.log('刷新地图 - 使用浏览器刷新');
			uni.showLoading({
				title: '刷新地图中...',
				mask: true
			});
			
			try {
				// 最简单但有效的方式：强制刷新整个页面
				// 在H5环境中，我们可以使用window.location.reload()
				if (typeof window !== 'undefined') {
					// 使用短暂延迟，让用户看到加载提示
					setTimeout(() => {
						console.log('执行页面刷新');
						window.location.reload();
						// 注意：reload后下面的代码不会执行
					}, 500);
				} else {
					// 在非H5环境下使用uni-app方式重新加载页面
					console.log('非H5环境，使用uni-app方式刷新');
					
					// 先切换到不同的tab页，然后再切回来
					const currentPage = '/pages/map/map';
					
					// 切换到其他页面，然后立即返回
					uni.switchTab({
						url: '/pages/index/index',
						success: () => {
							setTimeout(() => {
								// 切换回地图页
								uni.switchTab({
									url: '/pages/map/index',
									complete: () => {
										uni.hideLoading();
									}
								});
							}, 300);
						},
						fail: () => {
							uni.hideLoading();
							uni.showToast({
								title: '刷新失败，请手动切换页面',
								icon: 'none',
								duration: 2000
							});
						}
					});
				}
			} catch (error) {
				console.error('执行刷新操作时出错:', error);
				uni.hideLoading();
				uni.showToast({
					title: '刷新失败，请手动切换页面',
					icon: 'none',
					duration: 2000
				});
			}
		}
		
		// 这里已删除safelyResetMap函数，由新的refreshMap函数替代
		
		// 添加用户头像缓存
		const avatarCache = {
			// 存储头像URL与生成的图像的映射关系
			cache: {},
			
			// 获取缓存的头像图片，如果不存在则返回null
			get(imageUrl) {
				// 规范化URL，确保相同资源的不同URL格式能命中同一缓存
				const normalizedUrl = this.normalizeUrl(imageUrl);
				return this.cache[normalizedUrl] || null;
			},
			
			// 将图像添加到缓存
			put(imageUrl, dataUrl) {
				// 规范化URL作为缓存键
				const normalizedUrl = this.normalizeUrl(imageUrl);
				this.cache[normalizedUrl] = dataUrl;
				// 输出缓存状态（生产环境应删除）
				console.log('头像缓存更新，当前缓存数:', Object.keys(this.cache).length);
				return dataUrl;
			},
			
			// 清除单个URL的缓存
			remove(imageUrl) {
				const normalizedUrl = this.normalizeUrl(imageUrl);
				if (this.cache[normalizedUrl]) {
					delete this.cache[normalizedUrl];
					return true;
				}
				return false;
			},
			
			// 清除所有缓存
			clear() {
				this.cache = {};
				console.log('头像缓存已清空');
				return true;
			},
			
			// 规范化URL以提高缓存命中率
			normalizeUrl(url) {
				if (!url) return '';
				
				// 去除URL参数（如时间戳）
				let normalized = url.split('?')[0];
				
				// 处理相对路径
				if (normalized.startsWith('/uploads/')) {
					const baseUrl = import.meta.env.VITE_API_URL || 'http://49.235.65.37:5000';
					normalized = baseUrl + normalized;
				}
				
				return normalized;
			}
		};
		
		// 设备方向处理函数
		function handleDeviceOrientation() {
			// 方向获取方法的可用性标记
			const orientationSupport = {
				motionEvent: false,
				deviceOrientation: false,
				geolocation: false,
				compass: false,
				manualSet: true // 手动设置总是可用
			};
			
			// 方向数据来源优先级
			let orientationSource = null;
			
			// 初始化方向传感器
			function initOrientationSensors() {
				// 1. 使用设备方向事件（最精确）
				try {
					if (typeof DeviceOrientationEvent !== 'undefined') {
						orientationSupport.motionEvent = true;
						window.addEventListener('deviceorientation', (event) => {
							// alpha: 设备绕Z轴旋转角度，即平面内的罗盘方向(0-360)
							if (event.alpha !== null && event.alpha !== undefined) {
								const heading = event.alpha;
								updateUserHeading(heading, 'deviceorientationevent');
							}
						});
						console.log('已注册设备方向事件监听器');
					}
				} catch (e) {
					console.warn('设备方向事件不可用:', e);
				}
				
				// 2. 使用uni-app设备方向API
				try {
					if (typeof uni.onDeviceMotionChange === 'function') {
						uni.startDeviceMotionListening({
							interval: 'game',
							success: () => {
								orientationSupport.deviceOrientation = true;
								console.log('uni-app设备方向监听启动成功');
							},
							fail: (err) => {
								console.warn('uni-app设备方向监听启动失败', err);
							}
						});
						
						uni.onDeviceMotionChange((res) => {
							if (res.alpha !== undefined) {
								const heading = res.alpha;
								updateUserHeading(heading, 'uniapp-motion');
							}
						});
					}
				} catch (e) {
					console.warn('uni-app设备方向API不可用:', e);
				}
				
				// 3. 使用地理位置API的方向信息
				try {
					if (navigator.geolocation && navigator.geolocation.watchPosition) {
						navigator.geolocation.watchPosition(
							(pos) => {
								if (pos.coords.heading !== null && pos.coords.heading !== undefined) {
									orientationSupport.geolocation = true;
									const heading = pos.coords.heading;
									updateUserHeading(heading, 'geolocation');
								}
							},
							(err) => {
								console.warn('地理位置方向跟踪错误:', err);
							},
							{
								enableHighAccuracy: true,
								maximumAge: 0
							}
						);
						console.log('已启动地理位置方向跟踪');
					}
				} catch (e) {
					console.warn('地理位置方向API不可用:', e);
				}
				
				// 4. 使用uni-app指南针API
				try {
					if (typeof uni.onCompassChange === 'function') {
						uni.onCompassChange((res) => {
							if (res.direction !== undefined) {
								orientationSupport.compass = true;
								const heading = res.direction;
								updateUserHeading(heading, 'compass');
							}
						});
						console.log('已启动指南针方向跟踪');
					}
				} catch (e) {
					console.warn('指南针API不可用:', e);
				}
				
				// 5. 监测移动方向（基于位置变化计算）
				setupMovementDirectionTracking();
				
				// 检查并报告可用的方向传感器
				setTimeout(() => {
					console.log('方向传感器可用性:', orientationSupport);
					
					// 如果没有可用的方向传感器，提示用户
					if (!orientationSupport.motionEvent && 
						!orientationSupport.deviceOrientation && 
						!orientationSupport.geolocation && 
						!orientationSupport.compass) {
						console.warn('没有可用的方向传感器，用户头像将不会旋转');
						
						// 可以在这里添加UI提示，告知用户方向功能受限
						if (showDebug.value) {
							uni.showToast({
								title: '设备不支持方向传感器',
								icon: 'none',
								duration: 2000
							});
						}
					}
				}, 3000); // 给传感器初始化一些时间
			}
			
			// 根据来源优先级更新用户方向
			function updateUserHeading(heading, source) {
				// 特定来源的处理逻辑
				if (source === 'compass') {
					// 罗盘角度不需要特殊处理
				} else if (source === 'geolocation') {
					// 地理位置API的heading是相对于地理北极的，顺时针方向(0-360)
					// 不需要特殊处理
				} else if (source === 'deviceorientationevent' || source === 'uniapp-motion') {
					// DeviceOrientationEvent的alpha是相对于初始方向，逆时针方向(0-360)
					// 需要转换为顺时针方向
					heading = (360 - heading) % 360;
				}
				
				// 来源优先级判断
				const priority = {
					'movement': 5,
					'geolocation': 4,
					'deviceorientationevent': 3,
					'uniapp-motion': 2,
					'compass': 1,
					'manual': 0
				};
				
				// 如果当前没有来源，或新来源优先级更高，则更新
				if (!orientationSource || priority[source] > priority[orientationSource]) {
					orientationSource = source;
				}
				
				// 只有当前来源匹配接收到的来源时才更新方向
				if (source === orientationSource) {
					userHeading.value = heading;
					
					// 更新用户标记旋转角度
					updateUserMarkerRotation(heading);
				}
			}
			
			// 根据位置变化跟踪移动方向
			function setupMovementDirectionTracking() {
				// 存储最近几个位置记录
				const recentLocations = [];
				const maxLocationHistory = 5;
				
				// 监听位置更新
				watch(currentLocation, (newLocation, oldLocation) => {
					if (newLocation && oldLocation) {
						// 计算位移大小
						const distance = calculateDistance(
							oldLocation.latitude, oldLocation.longitude,
							newLocation.latitude, newLocation.longitude
						);
						
						// 只在移动距离足够时才计算方向（避免GPS误差）
						if (distance > 5) { // 5米以上才认为是有效移动
							// 计算移动方向（方位角）
							const bearing = calculateBearing(
								oldLocation.latitude, oldLocation.longitude,
								newLocation.latitude, newLocation.longitude
							);
							
							// 添加到最近位置记录
							recentLocations.push({
								location: newLocation,
								timestamp: Date.now(),
								bearing: bearing,
								distance: distance
							});
							
							// 保持记录数量限制
							if (recentLocations.length > maxLocationHistory) {
								recentLocations.shift();
							}
							
							// 用最近几次有效移动的平均方向更新用户方向
							if (recentLocations.length >= 2) {
								// 计算加权平均方向（较新和距离较大的移动有更高权重）
								let weightedBearingSum = 0;
								let weightSum = 0;
								
								recentLocations.forEach((record, index) => {
									// 较新的记录和距离较大的记录有更高权重
									const recency = (index + 1) / recentLocations.length; // 0.2-1.0
									const distanceFactor = Math.min(record.distance / 10, 1); // 最大为1
									const weight = recency * distanceFactor;
									
									weightedBearingSum += record.bearing * weight;
									weightSum += weight;
								});
								
								if (weightSum > 0) {
									const avgBearing = weightedBearingSum / weightSum;
									updateUserHeading(avgBearing, 'movement');
								}
							}
						}
					}
				}, { deep: true });
			}
			
			// 更新用户标记旋转角度
			function updateUserMarkerRotation(heading) {
				// 对于当前用户标记
				const userId = userStore.userInfo?.id || 'current-user-location';
				
				// 如果标记存在于userMarkers中
				if (userMarkers[userId] && userMarkers[userId].setRotation) {
					userMarkers[userId].setRotation(heading);
				}
				
				// 也可以发出一个事件通知其他组件方向已更新
				// 如果你有事件总线或者状态管理机制
			}
			
			// 计算两点间的方位角（0-360度，北方为0度，顺时针）
			function calculateBearing(lat1, lon1, lat2, lon2) {
				// 转换为弧度
				lat1 = lat1 * Math.PI / 180;
				lon1 = lon1 * Math.PI / 180;
				lat2 = lat2 * Math.PI / 180;
				lon2 = lon2 * Math.PI / 180;
				
				// 计算方位角
				const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
				const x = Math.cos(lat1) * Math.sin(lat2) -
						Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
				let bearing = Math.atan2(y, x) * 180 / Math.PI;
				
				// 将结果规范化到0-360度
				bearing = (bearing + 360) % 360;
				
				return bearing;
			}
			
			// 初始化方向传感器
			initOrientationSensors();
			
			// 返回可能需要的公共方法
			return {
				// 允许手动设置方向（例如通过UI控件）
				setManualHeading: (heading) => {
					updateUserHeading(heading, 'manual');
				},
				
				// 获取当前方向信息
				getOrientationInfo: () => {
					return {
						currentHeading: userHeading.value,
						currentSource: orientationSource,
						supportInfo: {...orientationSupport}
					};
				}
			};
		}
  
		// 添加标记显示控制
		const showMarkers = ref(true);
		
		// 自定义标记弹窗控制
		const showCustomMarkerPopup = ref(false);
		// 当前选中的标记
		const selectedMarker = ref(null);
		
		// 用于跟踪圆形覆盖区域
		const markerCircles = {};
		
		// 控制标记的显示和隐藏
		const toggleMarkersVisibility = () => {
			showMarkers.value = !showMarkers.value;
			
			if (map.value) {
				// 获取所有圆形覆盖区域和标记，但排除用户头像标记
				const circles = map.value.getAllOverlays('circle');
				const allMapMarkers = map.value.getAllOverlays('marker');
				
				// 筛选出非用户头像的标记
				const markerOverlays = allMapMarkers.filter(marker => {
					// 通过extData或其他属性判断是否是用户头像
					const extData = marker.getExtData();
					return !(extData && extData.isUserMarker); // isUserMarker是我们为用户头像标记添加的标识
				});
				
				if (showMarkers.value) {
					// 显示所有标记（非用户头像）
					markerOverlays.forEach(marker => {
						marker.show();
					});
					
					// 显示所有圆形覆盖区域
					circles.forEach(circle => {
						circle.show();
					});
					
					console.log('显示所有标记和覆盖区域');
				} else {
					// 隐藏所有标记（非用户头像）
					markerOverlays.forEach(marker => {
						marker.hide();
					});
					
					// 隐藏所有圆形覆盖区域
					circles.forEach(circle => {
						circle.hide();
					});
					
					console.log('隐藏所有标记和覆盖区域，用户头像保持显示');
				}
				
				// 确保用户头像始终显示在最上层
				ensureUserMarkersOnTop();
			}
		};
		
		// 确保用户头像标记位于最上层
		const ensureUserMarkersOnTop = () => {
			if (!map.value) return;
			
			const allMarkers = map.value.getAllOverlays('marker');
			
			// 筛选出用户头像标记
			const userMarkers = allMarkers.filter(marker => {
				const extData = marker.getExtData();
				return extData && extData.isUserMarker;
			});
			
			// 将用户头像提升到最上层
			userMarkers.forEach(marker => {
				marker.setzIndex(1000); // 设置高z-index确保显示在最上层
				marker.show(); // 确保显示
			});
		};
		
		// 添加加载标记数据的方法
		const loadMarkers = async () => {
			try {
				console.log('加载标记数据...');
				if (!currentLocation.value) {
					console.warn('当前位置不可用，无法加载附近标记');
					return;
				}
				
				console.log('正在从服务器获取附近标记...');
				console.log('当前位置:', currentLocation.value);
				
				// 添加加载状态提示
				const loadingToast = {
					show: () => {
						uni.showLoading({
							title: '加载标记中...',
							mask: false
						});
					},
					hide: () => {
						uni.hideLoading();
					}
				};
				
				// 显示加载中
				loadingToast.show();
				
				try {
					// 使用markerStore加载附近标记
					const nearbyMarkers = await markerStore.fetchNearbyMarkers({
						longitude: currentLocation.value.longitude,
						latitude: currentLocation.value.latitude,
						radius: 5000 // 5公里范围内的标记
					});
					
					// 隐藏加载中
					loadingToast.hide();
					
					console.log('获取到附近标记:', nearbyMarkers.length);
					
					// 规范化标记数据格式，确保location和coordinates的一致性
					const normalizedMarkers = nearbyMarkers.map(marker => {
						// 创建标记的深拷贝，避免修改原始数据
						const normalizedMarker = {...marker};
						
						// 确保marker有latitude和longitude属性
						if (!normalizedMarker.latitude || !normalizedMarker.longitude) {
							if (normalizedMarker.location && normalizedMarker.location.coordinates) {
								// 从MongoDB GeoJSON格式提取坐标
								normalizedMarker.longitude = normalizedMarker.location.coordinates[0];
								normalizedMarker.latitude = normalizedMarker.location.coordinates[1];
							}
						}
						
						// 确保有半径属性，不设置默认值，使用标记自己的半径
						if (normalizedMarker.radius === undefined || normalizedMarker.radius === null) {
							normalizedMarker.radius = 0.5; // 默认0.5公里（500米）
							console.log(`标记 ${normalizedMarker.title || '未命名'} 没有半径，设置默认值0.5公里`);
						} else {
							console.log(`标记 ${normalizedMarker.title || '未命名'} 半径: ${normalizedMarker.radius}`);
						}
						
						// 确保有颜色属性
						if (!normalizedMarker.color) {
							normalizedMarker.color = normalizedMarker.color || '#007AFF';
						}
						
						return normalizedMarker;
					});
					
					// 显示标记及其覆盖范围
					displayMarkers(normalizedMarkers);
					
					// 如果没有标记，显示提示
					if (normalizedMarkers.length === 0) {
						uni.showToast({
							title: '附近没有标记',
							icon: 'none',
							duration: 2000
						});
					}
				} catch (apiError) {
					// 隐藏加载中
					loadingToast.hide();
					
					console.error('API获取标记失败:', apiError);
					
					// 显示友好的错误消息
					uni.showToast({
						title: '加载标记失败，请重试',
						icon: 'none',
						duration: 2000
					});
					
					// 显示任何可能的缓存数据
					if (markerStore.markerCache && markerStore.markerCache.data && markerStore.markerCache.data.length > 0) {
						console.log('尝试使用缓存的标记数据');
						
						// 使用缓存数据
						const cachedMarkers = markerStore.filterMarkersByDistance(
							markerStore.markerCache.data,
							{
								latitude: currentLocation.value.latitude,
								longitude: currentLocation.value.longitude,
								radius: 5000
							}
						);
						
						if (cachedMarkers.length > 0) {
							// 规范化缓存标记数据
							const normalizedCachedMarkers = cachedMarkers.map(marker => {
								if (!marker.latitude || !marker.longitude) {
									if (marker.location && marker.location.coordinates) {
										marker.longitude = marker.location.coordinates[0];
										marker.latitude = marker.location.coordinates[1];
									}
								}
								
								marker.radius = marker.radius || 500;
								marker.color = marker.color || '#007AFF';
								
								return marker;
							});
							
							// 显示缓存标记
							displayMarkers(normalizedCachedMarkers);
							
							uni.showToast({
								title: '显示缓存的标记数据',
								icon: 'none',
								duration: 2000
							});
						} else {
							// 清空标记列表
							displayMarkers([]);
						}
					} else {
						// 清空标记列表
						displayMarkers([]);
					}
				}
			} catch (error) {
				console.error('加载标记数据失败:', error);
				
				// 隐藏可能的loading状态
				uni.hideLoading();
				
				// 显示友好的错误消息
				uni.showToast({
					title: '加载标记失败，请重试',
					icon: 'none',
					duration: 2000
				});
			}
		};
		
		// 显示标记
		const displayMarkers = (markers) => {
			try {
				console.log('显示标记数据:', markers);
				if (!markers || !markers.length) {
					console.log('没有标记可显示');
					return;
				}
				
				// 清除之前的标记，但不清除用户头像标记
				if (map.value) {
					// 获取所有标记
					const allMarkers = map.value.getAllOverlays('marker');
					
					// 筛选出非用户头像标记进行删除
					const nonUserMarkers = allMarkers.filter(marker => {
						const extData = marker.getExtData();
						return !(extData && extData.isUserMarker);
					});
					
					// 删除非用户头像标记
					if (nonUserMarkers.length > 0) {
						map.value.remove(nonUserMarkers);
					}
					
					// 删除所有圆形覆盖区域
					map.value.remove(map.value.getAllOverlays('circle'));
				}
				
				// 添加新标记和覆盖圆
				markers.forEach(marker => {
					try {
						console.log('添加标记:', marker);
						// 创建标记
						const markerPosition = [marker.longitude || marker.location?.coordinates?.[0], 
											  marker.latitude || marker.location?.coordinates?.[1]];
						
						if (!markerPosition[0] || !markerPosition[1]) {
							console.warn('标记位置无效:', markerPosition);
							return;
						}
						
						// 确保标记数据完整
						if (!marker.title) {
							marker.title = marker.title || '未命名标记';
						}
						if (!marker.type) {
							marker.type = marker.type || 'general';
						}
						
						// 创建标记
						const mapMarker = new AMap.Marker({
							position: markerPosition,
							title: marker.title,
							icon: marker.icon || getIconForType(marker.type),
							anchor: 'bottom-center',
							offset: new AMap.Pixel(0, 0),
							extData: { 
								marker: marker,
								id: marker._id,
								type: 'marker'
							},
							clickable: true
						});
						
						// 添加标记到地图
						map.value.add(mapMarker);
						
						// 添加标记点击事件
						mapMarker.on('click', (e) => {
							console.log('标记被点击:', marker);
							markerStore.setSelectedMarker(marker);
							
							// 始终使用原始的完整marker数据，避免extData可能不全的问题
							// 这确保了无论点击标记图标还是圆形区域，都使用相同的数据
							showMarkerPopup(marker);
						});
						
						// 如果标记有半径，创建一个圆形覆盖
						if (marker.radius) {
							// 确保半径值正确（处理可能的km和m单位转换）
							let radiusInMeters;
							
							// 如果是数字，检查大小范围判断可能的单位
							if (typeof marker.radius === 'number') {
								// 如果值较小（< 100），认为是以公里为单位，需要转换为米
								if (marker.radius < 100) {
									radiusInMeters = marker.radius * 1000;
									console.log(`标记 "${marker.title || '未命名'}" [${marker._id}] - 转换半径从 ${marker.radius}km 到 ${radiusInMeters}m`);
								} else {
									// 值较大，可能已经是米为单位
									radiusInMeters = marker.radius;
									console.log(`标记 "${marker.title || '未命名'}" [${marker._id}] - 使用原始半径 ${radiusInMeters}m`);
								}
							} else {
								// 处理字符串情况，尝试解析
								const parsedRadius = parseFloat(marker.radius) || 0.5;
								radiusInMeters = parsedRadius < 100 ? parsedRadius * 1000 : parsedRadius;
								console.log(`标记 "${marker.title || '未命名'}" [${marker._id}] - 从字符串转换半径: ${marker.radius} -> ${radiusInMeters}m`);
							}
							
							// 记录最终使用的半径值，便于调试
							console.log(`最终使用的覆盖半径: ${radiusInMeters}米 (原始值: ${marker.radius})`);
							
							// 创建圆形
							const circle = new AMap.Circle({
								center: markerPosition,
								radius: radiusInMeters, // 半径，单位：米
								strokeColor: marker.color || '#1E90FF',
								strokeWeight: 2,
								strokeOpacity: 0.8,
								fillColor: marker.color || '#1E90FF',
								fillOpacity: 0.15,
								extData: { marker }
							});
							
							// 添加圆形到地图
							map.value.add(circle);
							
							// 添加圆形点击事件
							circle.on('click', (e) => {
								console.log('标记区域被点击:', marker);
								markerStore.setSelectedMarker(marker);
								
								// 使用e.target来获取圆形对象
								const clickedCircle = e.target;
								
								// 添加视觉反馈 - 暂时改变圆形的颜色
								const originalStrokeColor = clickedCircle.getOptions().strokeColor;
								const originalFillColor = clickedCircle.getOptions().fillColor;
								const originalFillOpacity = clickedCircle.getOptions().fillOpacity;
								
								// 高亮显示
								clickedCircle.setOptions({
									strokeColor: '#FF3B30', // 红色边框
									fillColor: '#FF3B30',   // 红色填充
									fillOpacity: 0.3        // 增加透明度
								});
								
								// 1秒后恢复原样
								setTimeout(() => {
									clickedCircle.setOptions({
										strokeColor: originalStrokeColor,
										fillColor: originalFillColor,
										fillOpacity: originalFillOpacity
									});
								}, 1000);
								
								// 始终使用原始的完整marker数据，与标记点击保持一致的处理逻辑
								showMarkerPopup(marker);
							});
						}
					} catch (markerError) {
						console.error('添加单个标记时出错:', markerError);
					}
				});
				
				console.log('标记显示完成');
				
				// 确保用户头像标记显示在最上层
				ensureUserMarkersOnTop();
				
				// 根据showMarkers状态决定是否显示标记
				if (!showMarkers.value) {
					toggleMarkersVisibility();
					toggleMarkersVisibility();
				}
			} catch (displayError) {
				console.error('显示标记时出错:', displayError);
			}
		};
		
		// 根据标记类型获取图标
		const getIconForType = (type) => {
			// 使用已导入的SVG图标
			if (markerIconsBase64 && markerIconsBase64[type]) {
				return markerIconsBase64[type];
			}
			
			// 备用图标路径
			const iconMap = {
				'general': '/static/images/marker.png',
				'pet_friendly': '/static/images/pet-marker.png',
				'danger': '/static/images/danger-marker.png',
				'scenic': '/static/images/park-marker.png',
				'pet_service': '/static/images/shop-marker.png',
				'custom': '/static/images/marker.png'
			};
			
			return iconMap[type] || iconMap.general;
		};
		
		// 标记类型的中文名称
		const getMarkerTypeName = (type) => {
			// 处理空值或未定义的情况
			if (!type) return '普通标记';
			
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
		
		// 获取标记类型图标
		const getMarkerTypeIcon = (type) => {
			// 处理空值或未定义的情况
			if (!type) return '📍';
			
			const iconMap = {
				'general': '📍',
				'pet_friendly': '🐾',
				'danger': '⚠️',
				'scenic': '🏞️',
				'pet_service': '🏥',
				'custom': '✨'
			};
			return iconMap[type] || '📍';
		};
		
		// 获取标记类型颜色
		const getMarkerColor = (type) => {
			// 处理空值或未定义的情况
			if (!type) return '#4285F4';
			
			const colorMap = {
				'general': '#4285F4',
				'pet_friendly': '#34A853',
				'danger': '#EA4335',
				'scenic': '#FBBC05',
				'pet_service': '#FF7F50',
				'custom': '#9370DB'
			};
			return colorMap[type] || '#4285F4';
		};
		
		// 导航到标记位置
		const navigateToMarker = (marker) => {
			if (!marker) return;
			
			try {
				const longitude = marker.longitude || marker.location?.coordinates?.[0];
				const latitude = marker.latitude || marker.location?.coordinates?.[1];
				
				if (longitude && latitude && map.value) {
					map.value.setCenter([longitude, latitude]);
					map.value.setZoom(17); // 放大地图
					showCustomMarkerPopup.value = false; // 关闭弹窗
					
					// 显示导航成功提示
					uni.showToast({
						title: '正在导航到标记位置',
						icon: 'none',
						duration: 1500
					});
				}
			} catch (error) {
				console.error('导航到标记位置失败:', error);
			}
		};
		
			// 显示标记详情弹窗
	const showMarkerPopup = (marker) => {
		if (!marker) return;
		
		try {
			console.log('显示标记详情弹窗, 原始数据:', marker);
			
			// 确保marker数据完整
			let actualMarker = marker;
			
			// 如果传入的是AMap.Marker对象，从其extData中获取标记数据
			if (marker instanceof AMap.Marker) {
				const extData = marker.getExtData();
				if (extData && extData.marker) {
					actualMarker = extData.marker;
					console.log('从标记extData中获取到标记数据:', actualMarker);
				} else if (extData && extData.id) {
					// 尝试通过ID从store中获取完整的标记数据
					const storeMarker = markerStore.markers.find(m => m._id === extData.id);
					if (storeMarker) {
						actualMarker = storeMarker;
						console.log('从store中获取到标记数据:', actualMarker);
					}
				} else {
					console.warn('标记不包含有效的extData数据');
				}
			}
			
			// 确保标记数据有标题和类型
			if (!actualMarker.title) {
				actualMarker.title = '未命名标记';
			}
				if (!actualMarker.type) {
					actualMarker.type = 'general';
				}
				
				console.log('处理后的标记数据:', actualMarker);
				
				// 保存当前选中的标记
				markerStore.setSelectedMarker(actualMarker);
				
				// 处理可能的不同坐标格式
				const longitude = actualMarker.longitude || actualMarker.location?.coordinates?.[0];
				const latitude = actualMarker.latitude || actualMarker.location?.coordinates?.[1];
				
				// 添加视觉反馈效果 - 高亮显示选中的标记
				if (marker instanceof AMap.Marker && typeof marker.setAnimation === 'function') {
					try {
						// 创建一个临时动画效果
						marker.setAnimation('AMAP_ANIMATION_BOUNCE');
						// 2秒后停止动画
						setTimeout(() => {
							if (marker && typeof marker.setAnimation === 'function') {
								marker.setAnimation(null);
							}
						}, 2000);
					} catch (animError) {
						console.warn('设置标记动画效果失败:', animError);
						// 使用备用方案：改变标记的zIndex使其显示在顶层
						if (typeof marker.setzIndex === 'function') {
							marker.setzIndex(999);
						}
					}
				}
				
				// 检查标记是否有图片
				if (actualMarker.images && actualMarker.images.length > 0) {
					// 确保标记数据已存储到store中
					console.log('标记包含图片，跳转到详情页面');
					
					// 确保用户信息是对象而非ID
					if (actualMarker.user && typeof actualMarker.user === 'string') {
						// 如果只有用户ID，先进行简单的初始化以避免页面报错
						console.log('标记只包含用户ID，初始化基本用户对象');
						
						// 在详情页会重新获取完整用户信息
						// 这里只是为了避免页面显示错误
						if (!actualMarker._processedUserInfo) {
							actualMarker._processedUserInfo = true; // 标记已处理
							actualMarker._originalUserId = actualMarker.user; // 保存原始ID
						}
					}
					
					// 优先使用标记ID跳转，确保详情页可以获取完整数据
					const markerId = actualMarker._id;
					if (markerId) {
						uni.navigateTo({
							url: `/pages/map/marker-detail?id=${markerId}`
						});
					} else {
						// 备用方案：如果没有ID，使用其他信息
						uni.showToast({
							title: '无法获取标记详情',
							icon: 'none'
						});
					}
				} else {
					// 如果没有图片，使用自定义弹窗
					// 确保selectedMarker已定义
					if (typeof selectedMarker !== 'undefined' && selectedMarker !== null) {
						selectedMarker.value = actualMarker;
						showCustomMarkerPopup.value = true;
					} else {
						console.error('selectedMarker未定义');
						// 降级为简单的模态框
						uni.showModal({
							title: actualMarker.title || '未命名标记',
							content: actualMarker.description || '无描述信息',
							showCancel: true,
							cancelText: '关闭',
							confirmText: '导航',
							success: (res) => {
								if (res.confirm && longitude && latitude && map.value) {
									map.value.setCenter([longitude, latitude]);
									map.value.setZoom(17);
								}
							}
						});
					}
				}
			} catch (error) {
				console.error('显示标记信息失败:', error);
				uni.showToast({
					title: '显示标记信息失败',
					icon: 'none'
				});
			}
		};
		
		// 显示标记详情
		const showMarkerInfo = (markerData) => {
			if (!markerData) return;
			
			// 设置当前选中的标记
			markerStore.setCurrentMarker(markerData);
			
			// 显示标记详情对话框
			uni.showModal({
				title: markerData.title,
				content: markerData.description || '暂无描述',
				showCancel: true,
				cancelText: '关闭',
				confirmText: '导航',
				success: (res) => {
					if (res.confirm) {
						// 导航到标记位置
						map.value.setCenter([markerData.longitude, markerData.latitude]);
						map.value.setZoom(16);
					}
				}
			});
		};
		
		// 添加标记方法
		const showAddMarkerForm = () => {
			uni.navigateTo({
				url: `/pages/map/add-marker?latitude=${currentLocation.value.latitude}&longitude=${currentLocation.value.longitude}`
			});
		};
		
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
			const baseUrl = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
			
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
		
		// 调试模式控制
		const showDebug = ref(false); // 默认关闭调试视图，需要时手动开启
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
					环境变量: uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000'
				});
				
				return getFullAvatarUrl(userInfo.avatar, true);
			}
			
			// 返回默认头像
			console.log('未找到用户头像，使用默认蓝色头像');
			return defaultAvatarBase64;
		});
		
		// 用户位置标记
		const userMarker = ref(null);
		
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
		async function getNearbyUsers(retryCount = 0) {
			try {
				// 检查依赖条件是否满足
				if (!map.value) {
					console.log('地图未准备好，延迟获取附近用户');
					if (retryCount < 5) {
						setTimeout(() => getNearbyUsers(retryCount + 1), 1500); // 1.5秒后重试
					}
					return Promise.resolve({ success: false, message: '地图未准备好' });
				}
				
				// 检查后端API连接状态
				if (!isBackendAvailable.value) {
					console.log('后端API不可用，不获取附近用户');
					nearbyUsers.value = [];
					return Promise.resolve({ success: false, message: '后端API不可用' });
				}
				
				// 检查位置共享状态
				if (!isLocationShared.value) {
					console.log('位置共享未开启，不获取附近用户');
					return Promise.resolve({ success: false, message: '位置共享未开启' });
				}
				
				// 检查位置信息
				if (!currentLocation.value || !currentLocation.value.latitude || !currentLocation.value.longitude) {
					console.error('当前位置不可用，稍后重试获取附近用户');
					if (retryCount < 5) {
						setTimeout(() => getNearbyUsers(retryCount + 1), 1500); // 1.5秒后重试
					}
					return Promise.resolve({ success: false, message: '当前位置不可用' });
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
				}).catch(err => {
					console.error('位置API错误:', err);
					// 在API错误时重试
					if (retryCount < 3) {
						console.log(`获取附近用户失败，${retryCount + 1}/3次重试`);
						setTimeout(() => getNearbyUsers(retryCount + 1), 2000);
					}
					return { success: false, message: '位置API错误' };
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
					
					// 如果是第一次尝试，并且需要用户信息但返回错误，尝试再次获取
					if (retryCount < 3 && (!userStore.userInfo || !currentLocation.value)) {
						console.log(`API失败，${retryCount + 1}/3次重试`);
						setTimeout(() => getNearbyUsers(retryCount + 1), 2000);
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
				
				// 在发生异常情况下也重试几次
				if (retryCount < 3) {
					console.log(`异常情况，${retryCount + 1}/3次重试`);
					setTimeout(() => getNearbyUsers(retryCount + 1), 2000);
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
					console.log('获取当前位置成功:', res);
					updateLocation({
						latitude: res.latitude,
						longitude: res.longitude
					});
					
					// 成功获取位置后，立即尝试将地图中心设置到当前位置
					if (map.value) {
						console.log('位置获取成功，立即将地图中心设置到当前位置');
						map.value.setCenter([res.longitude, res.latitude]);
						map.value.setZoom(16);
					} else {
						console.log('地图尚未初始化，无法设置中心点');
					}
					
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
										// 更新位置
										if (result.position) {
											currentLocation.value = {
												latitude: result.position.lat,
												longitude: result.position.lng
											};
											
											// 更新地图中心
											if (map.value) {
												map.value.setCenter([result.position.lng, result.position.lat]);
											}
										}
									} else {
										console.log('高德地图定位失败', result);
									}
								});
							});
						} catch (error) {
							console.error('高德地图初始化失败:', error);
						}
					}
					
					// 如果已定义了方向处理函数，则使用它
					if (typeof handleDeviceOrientation === 'function') {
						const orientationHandler = handleDeviceOrientation();
					} else {
						console.warn('方向处理函数未定义，将使用基本方向检测');
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
			
			// 持续监听位置变化 - 使用智能更新策略
			locationUpdateInterval.value = setInterval(() => {
				// 检查应用是否处于前台
				const isAppActive = true; // uni-app暂不支持直接检测前台状态，默认为true
				
				// 根据应用状态和行走状态决定更新频率
				const updateFrequency = isWalking.value ? 5 : (isAppActive ? 15 : 30);
				
				// 判断是否需要本次更新（基于上次更新时间）
				const now = Date.now();
				const lastUpdateTime = locationLastUpdateTime.value || 0;
				const timeDiff = now - lastUpdateTime;
				
				// 时间间隔不足，跳过本次更新
				if (timeDiff < updateFrequency * 1000) {
					console.log(`距上次位置更新仅${Math.floor(timeDiff/1000)}秒，未达到${updateFrequency}秒更新间隔`);
					return;
				}
				
				// 记录本次更新时间
				locationLastUpdateTime.value = now;
				
				uni.getLocation({
					type: 'gcj02',
					success: (res) => {
						// 记录上一次有效位置，用于计算移动距离
						const prevLat = currentLocation.value?.latitude;
						const prevLng = currentLocation.value?.longitude;
						
						// 如果存在上一次位置，计算移动距离
						if (prevLat && prevLng) {
							const moveDistance = calculateDistance(
								prevLat, prevLng, 
								res.latitude, res.longitude
							);
							
							// 移动距离过小且不在行走模式，可能是GPS漂移，忽略更新
							if (moveDistance < 5 && !isWalking.value) {
								console.log(`位置变化太小(${moveDistance.toFixed(2)}米)，忽略更新`);
								return;
							}
						}
						
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
			}, 5000); // 每5秒检查一次是否需要更新位置
			
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

		// 创建用户标记（使用图片，优化版）
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
				
				// 使用头像URL（优先使用传入的URL，其次是用户头像）
				const finalImageUrl = imageUrl || userAvatar.value;
				
				// 检查缓存中是否已有处理过的头像图片
				const cachedImage = avatarCache.get(finalImageUrl);
				if (cachedImage) {
					console.log('使用缓存的头像图像:', finalImageUrl.substring(0, 50) + '...');
					
					// 直接使用缓存的图像创建标记
					createMarkerWithProcessedImage(userId, position, cachedImage);
					return;
				}
				
				// 如果是base64编码的图像，直接处理
				if (finalImageUrl.startsWith('data:image')) {
					processImageAndCreateMarker(userId, position, finalImageUrl);
					return;
				}
				
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
						
						// 保存到缓存
						avatarCache.put(finalImageUrl, markerImage);
						
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
							zIndex: 100, // 高z-index确保显示在最上层
							extData: { 
								userId: userId, 
								type: 'user',
								isUserMarker: true // 添加标识，表明这是用户头像标记
							}
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
			
			// 恢复标记缓存
			markerStore.restoreMarkerCache();
			
			// 首先初始化用户认证状态
			await initUserAuth();
			
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
			
			// 添加后端API连接检查函数
			const checkBackendConnection = async () => {
				try {
					console.log('检查后端API连接状态...');
					// 使用一个基本的API端点，如根路径或已知存在的端点
					const resp = await request({
						url: '/api', // 或者任何确定存在的API端点
						method: 'GET',
						timeout: 5000
					}).catch(error => {
						// 尝试备用端点
						return request({
							url: '/api/users/ping', // 尝试用户API的ping端点
							method: 'GET',
							timeout: 5000
						});
					});
					
					console.log('后端API连接正常:', resp);
					isBackendAvailable.value = true;
				} catch (error) {
					console.error('后端API连接失败:', error);
					isBackendAvailable.value = false;
					
					// 显示友好的错误信息
					uni.showModal({
						title: '连接问题',
						content: '无法连接到服务器，部分功能可能不可用。请检查网络连接或稍后重试。',
						showCancel: false
					});
				}
			};

			// 带超时的位置获取函数
			const getLocationWithTimeout = (timeout = 8000) => {
				return new Promise((resolve, reject) => {
					const timer = setTimeout(() => {
						console.log('获取位置超时');
						reject(new Error('获取位置超时'));
					}, timeout);
					
					uni.getLocation({
						type: 'gcj02',
						success: (res) => {
							clearTimeout(timer);
							resolve({
								latitude: res.latitude,
								longitude: res.longitude
							});
						},
						fail: (err) => {
							clearTimeout(timer);
							console.error('获取位置失败:', err);
							reject(err);
						}
					});
				});
			};

			// 使用确定的位置初始化地图
			const initAMapWithLocation = (location) => {
				if (!location || typeof location.latitude === 'undefined') {
					console.error('初始化地图需要有效的位置信息');
					return;
				}
				
				try {
					console.log('使用确定位置初始化地图:', location);
					
					if (typeof window.AMap === 'undefined') {
						console.error('AMap未加载');
						
						// 尝试加载高德地图SDK
						window.onAMapLoaded = () => initAMapWithLocation(location);
						const script = document.createElement('script');
						script.type = 'text/javascript';
						script.async = true;
						script.src = 'https://webapi.amap.com/maps?v=2.0&key=9ea84b4333b114c188a67cb42564a48f&callback=onAMapLoaded';
						document.head.appendChild(script);
						return;
					}
					
					// 检查DOM元素存在
					const mapContainer = document.getElementById('map-container');
					if (!mapContainer) {
						console.error('找不到地图容器元素(#map-container)');
						return;
					}
					
					// 创建地图实例
					map.value = new window.AMap.Map('map-container', {
						zoom: 16,
						center: [location.longitude, location.latitude],
						resizeEnable: true,
						animateEnable: true
					});
					
					// 保存到全局
					if (typeof window !== 'undefined') {
						window.__dogRunMapInstance = map.value;
					}
					
					console.log('高德地图初始化完成');
					
					// 地图加载完成后执行后续操作
					map.value.on('complete', () => {
						console.log('地图加载完成，创建用户标记和加载标记数据');
						
						// 确保地图中心点正确
						map.value.setCenter([location.longitude, location.latitude]);
						
						// 创建用户标记
						setTimeout(() => {
							toggleMarker();
							// 加载标记数据
							loadMarkers();
							// 位置数据就绪后再获取附近用户
							getNearbyUsers();
						}, 800);
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
				} catch (e) {
					console.error('初始化地图出错:', e);
					uni.showToast({
						title: '地图初始化失败，请重试',
						icon: 'none'
					});
				}
			};

			// 优化的地图初始化流程
			const initMapFlow = async () => {
				// 显示加载提示
				uni.showLoading({
					title: '正在定位...',
					mask: true
				});
				
				try {
					// 尝试从缓存获取上次位置作为临时位置
					const cachedLocationStr = uni.getStorageSync('last_known_location');
					let tempLocation = null;
					
					if (cachedLocationStr) {
						try {
							const cached = JSON.parse(cachedLocationStr);
							// 确保缓存位置不超过24小时
							if (cached && cached.timestamp && (Date.now() - cached.timestamp) < 86400000) {
								tempLocation = {
									latitude: cached.latitude,
									longitude: cached.longitude
								};
								console.log('使用缓存位置作为临时位置', tempLocation);
								
								// 提前更新currentLocation但不初始化地图
								currentLocation.value = tempLocation;
							}
						} catch (e) {
							console.warn('解析缓存位置失败', e);
						}
					}
					
					// 获取实际位置（设置超时保证不会无限等待）
					const actualLocation = await getLocationWithTimeout(10000).catch(err => {
						console.warn('获取实际位置失败，使用备选方案', err);
						return null;
					});
					
					// 隐藏加载提示
					uni.hideLoading();
					
					// 更新currentLocation
					if (actualLocation) {
						currentLocation.value = actualLocation;
						console.log('获取到实际位置:', actualLocation);
						
						// 保存位置到缓存
						uni.setStorageSync('last_known_location', JSON.stringify({
							...actualLocation,
							timestamp: Date.now()
						}));
					} else if (!currentLocation.value) {
						// 如果没有实际位置也没有缓存位置，才使用默认位置
						currentLocation.value = { latitude: 31.31, longitude: 121.52 }; // 上海位置替代北京
						console.warn('无法获取位置，使用默认上海位置');
					}
					
					// 启动位置监听
					startLocationWatch();
					
					// 仅在位置就绪后初始化地图
					initAMapWithLocation(currentLocation.value);
					
					// 获取用户宠物数据
					fetchMyPets();
					
					// 检查后端API连接
					checkBackendConnection();
					
				} catch (error) {
					uni.hideLoading();
					console.error('初始化地图流程出错:', error);
					uni.showToast({
						title: '定位失败，使用默认位置',
						icon: 'none'
					});
					
					// 出错时使用默认位置
					if (!currentLocation.value) {
						currentLocation.value = { latitude: 31.31, longitude: 121.52 }; // 上海位置
					}
					
					// 启动位置监听
					startLocationWatch();
					
					// 仍然初始化地图
					initAMapWithLocation(currentLocation.value);
				}
			};
			
			// 执行地图初始化流程
			initMapFlow();
			
			console.log('组件挂载完成');
		});
		
		// 监听页面显示
		onShow(() => {
			console.log('地图页面显示');
			// 如果地图已经初始化，刷新标记数据
			if (map.value) {
				console.log('刷新地图标记数据');
				loadMarkers();
			}
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
						newSrc = (uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000') + src;
					} else if (retryCount === 2) {
						newSrc = (uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000') + src;
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
		
		// 强制刷新用户标记（优化版）
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
			
			// 如果需要强制清除头像缓存
			if (forceUseUploaded) {
				console.log('强制清除头像缓存，使用最新上传的头像');
				avatarCache.clear();
			}
			
			// 获取用户ID和位置
			const userId = userStore.userInfo?.id || 'current-user-location';
			const position = [currentLocation.value.longitude, currentLocation.value.latitude];
			
			// 先清理所有当前用户的标记
			if (map.value) {
				const allMapMarkers = map.value.getAllOverlays('marker');
				const markersToRemove = [];
				
				// 找出所有与当前用户相关的标记
				allMapMarkers.forEach(marker => {
					try {
						const markerId = marker?.getExtData?.()?.userId;
						if (markerId === 'current-user-location' || 
							(userStore.userInfo && markerId === userStore.userInfo.id)) {
							markersToRemove.push(marker);
						}
					} catch (err) {
						console.error('处理标记时出错:', err);
					}
				});
				
				// 批量移除标记（性能更好）
				if (markersToRemove.length > 0) {
					console.log(`移除 ${markersToRemove.length} 个用户标记`);
					map.value.remove(markersToRemove);
					
					// 同时从userMarkers对象中移除
					markersToRemove.forEach(marker => {
						const markerId = marker?.getExtData?.()?.userId;
						if (markerId && userMarkers[markerId]) {
							delete userMarkers[markerId];
						}
					});
				}
				
				// 创建新标记 - 使用新的高效函数
				console.log('创建新的用户标记，用户ID:', userId);
				
				// 使用当前用户头像
				const avatarUrl = userAvatar.value;
				createUserMarkerWithImage(userId, position, avatarUrl);
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

		// 清除头像缓存（优化版）
		async function clearAvatarCache() {
			try {
				console.log('开始清除头像缓存...');
				
				// 1. 清除我们的内存缓存
				avatarCache.clear();
				
				// 2. 尝试清除本地存储中的用户信息
				uni.removeStorageSync('userInfo');
				console.log('已清除本地用户信息缓存');
				
				// 3. 重新获取最新用户信息
				await userStore.fetchUserInfo();
				console.log('已重新获取用户信息');
				
				// 4. 清除系统下载缓存(如果有头像URL)
				if (userStore.userInfo?.avatar) {
					// 获取完整头像URL
					const avatarUrl = getFullAvatarUrl(userStore.userInfo.avatar, true);
					console.log('清除头像URL缓存:', avatarUrl);
					
					// 使用uni-app API尝试清除缓存（不同平台支持程度不同）
					if (uni.removeSavedFile) {
						try {
							// 尝试获取本地文件系统中可能存在的缓存文件
							const fileList = await new Promise((resolve, reject) => {
								uni.getSavedFileList({
									success: (res) => resolve(res.fileList || []),
									fail: () => resolve([])
								});
							});
							
							// 查找可能的头像缓存文件并删除（基于模糊匹配）
							const avatarFiles = fileList.filter(file => 
								file.filePath && file.filePath.includes('avatar'));
							
							if (avatarFiles.length > 0) {
								console.log('找到', avatarFiles.length, '个可能的头像缓存文件');
								for (const file of avatarFiles) {
									await new Promise(resolve => {
										uni.removeSavedFile({
											filePath: file.filePath,
											success: () => console.log('已删除缓存文件:', file.filePath),
											complete: resolve
										});
									});
								}
							}
						} catch (fsError) {
							console.warn('清除文件系统缓存时出错:', fsError);
						}
					}
					
					// 强制重新获取头像，使用网络请求而不是缓存
					try {
						const timestamp = new Date().getTime();
						const urlWithTimestamp = avatarUrl.includes('?') 
							? `${avatarUrl}&t=${timestamp}` 
							: `${avatarUrl}?t=${timestamp}`;
						
						uni.downloadFile({
							url: urlWithTimestamp,
							success: (res) => {
								console.log('头像重新下载成功');
								// 使用新下载的头像强制刷新标记
								if (userStore.userInfo?.id) {
									const userId = userStore.userInfo.id;
									const position = currentLocation.value ? 
										[currentLocation.value.longitude, currentLocation.value.latitude] : 
										null;
									
									if (position) {
										createUserMarkerWithImage(userId, position, res.tempFilePath);
									}
								}
							},
							fail: (err) => {
								console.error('头像重新下载失败:', err);
							},
							complete: () => {
								// 无论成功失败都提示用户
								uni.showToast({
									title: '头像缓存已清除',
									icon: 'success'
								});
							}
						});
					} catch (dlError) {
						console.error('下载头像时出错:', dlError);
						uni.showToast({
							title: '头像已清除，但重新获取失败',
							icon: 'none'
						});
					}
				} else {
					console.log('用户没有头像，无需清除缓存');
					uni.showToast({
						title: '无头像，已清除用户信息',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('清除头像缓存失败:', error);
				uni.showToast({
					title: '清除头像缓存出错',
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
		
		// 位置更新时间跟踪
		const locationLastUpdateTime = ref(0);

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
			
			try {
				// 使用高德地图的方法获取点击位置的标记
				if (map.value) {
					const pixel = new AMap.Pixel(x, y);
					const overlays = map.value.getOverlaysByPixel(pixel);
					
					if (overlays && overlays.length > 0) {
						// 找到最上层的标记
						const topOverlay = overlays[0];
						const extData = topOverlay.getExtData();
						
						if (extData && extData.userId) {
							console.log('点击了用户标记:', extData.userId);
							processUserMarkerTap(extData.userId);
							return;
						}
					}
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
			const baseUrl = import.meta.env.VITE_API_URL || 'http://49.235.65.37:5000';
			
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
			
			// 添加showMarkerPopup函数到返回对象
			showMarkerPopup,
			showCustomMarkerPopup,
			selectedMarker,
			getMarkerTypeName,
			getMarkerTypeIcon,
			getMarkerColor,
			navigateToMarker,
			formatTime: (timestamp) => {
				if (!timestamp) return '未知时间';
				const date = new Date(timestamp);
				return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
			},
			getUserName: (user) => {
				if (!user) return '未知用户';
				if (typeof user === 'string') {
					return '用户' + user.substr(-4);
				}
				return user.nickname || user.username || '未知用户';
			},
			
			// 其他已有函数
			centerOnUser() {
				console.log('定位到用户位置');
				try {
					// 获取地图实例
					map.value = getMapInstance();
					
					// 检查位置信息是否有效
					if (!currentLocation.value || typeof currentLocation.value.latitude === 'undefined') {
						console.warn('当前位置信息不可用，尝试重新获取位置');
						
						// 尝试重新获取位置
						uni.getLocation({
							type: 'gcj02',
							success: (res) => {
								console.log('重新获取位置成功:', res);
								// 更新当前位置
								currentLocation.value = {
									latitude: res.latitude,
									longitude: res.longitude
								};
								
								// 设置地图中心点到用户位置
								const pos = [res.longitude, res.latitude];
								console.log('设置地图中心到:', pos);
								map.value.setCenter(pos);
								map.value.setZoom(16);
								
								// 显示成功提示
						uni.showToast({
									title: '已定位到当前位置',
									icon: 'none',
									duration: 1000
								});
							},
							fail: (err) => {
								console.error('重新获取位置失败:', err);
								uni.showToast({
									title: '获取位置失败，请检查定位权限',
							icon: 'none'
								});
							}
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
			showAddMarkerForm,
			loadMarkers,
			displayMarkers,
			showMarkerInfo,
			toggleMarkersVisibility,
			// 在script部分添加处理函数
			navigateToAIMedical() {
				uni.navigateTo({
					url: '/pages/ai-medical/index'
				});
			},
			refreshMap,
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
	position: fixed;
	top: 40rpx;
	right: 20rpx;
	background-color: #FFFFFF;
	border-radius: 20rpx;
	padding: 2rpx;
	margin-top: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
	z-index: 100;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.toolbar-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 16rpx;
	border-radius: 12rpx;
	background-color: #FFFFFF;
	cursor: pointer;
	transition: all 0.2s ease;
}

.toolbar-item:active {
	background-color: #F5F5F5;
}

.toolbar-item .icon {
	font-size: 20rpx;
	margin-bottom: 4rpx;
}

.toolbar-item .toolbar-text {
	font-size: 16rpx;
	color: #333333;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
	.toolbar {
		background-color: #1C1C1E;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.3);
	}

	.toolbar-item {
		background-color: #1C1C1E;
	}

	.toolbar-item:active {
		background-color: #2C2C2E;
	}

	.toolbar-item .toolbar-text {
		color: #FFFFFF;
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

/* 刷新地图按钮样式 */
.refresh-map-btn {
	position: fixed;
	right: 20rpx;
	bottom: 200rpx;
	z-index: 990;
	width: 80rpx;
	height: 80rpx;
	display: flex;
	justify-content: center;
	align-items: center;
}

.refresh-btn-inner {
	width: 80rpx;
	height: 80rpx;
	background-color: #FFFFFF;
	border-radius: 50%;
	display: flex;
	justify-content: center;
	align-items: center;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.refresh-icon {
	font-size: 32rpx;
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
	background-color: rgba(246, 187, 91, 0.8);
}

.ai-medical {
	background-color: rgba(121, 255, 141, 0.8);
}

/* 自定义标记弹窗样式 */
.custom-marker-popup {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
}

.popup-backdrop {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	backdrop-filter: blur(4px);
}

.popup-content {
	position: relative;
	width: 85%;
	max-width: 600px;
	background-color: #FFFFFF;
	border-radius: 16px;
	box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
	overflow: hidden;
	z-index: 1001;
	animation: popup-fade-in 0.3s ease;
}

@keyframes popup-fade-in {
	from { opacity: 0; transform: translateY(20px); }
	to { opacity: 1; transform: translateY(0); }
}

.popup-header {
	padding: 16px 20px;
	background-color: #F8F8F8;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid #EEEEEE;
}

.popup-title {
	font-size: 18px;
	font-weight: bold;
	color: #333333;
}

.close-btn {
	font-size: 24px;
	color: #999999;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 18px;
	cursor: pointer;
}

.close-btn:active {
	background-color: #EEEEEE;
}

.popup-body {
	padding: 20px;
}

.marker-type {
	display: flex;
	align-items: center;
	margin-bottom: 16px;
}

.marker-type-icon {
	width: 50px;
	height: 50px;
	border-radius: 25px;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 15px;
}

.type-icon {
	font-size: 24px;
	color: #FFFFFF;
}

.marker-type-name {
	font-size: 16px;
	color: #333333;
	font-weight: 500;
}

.marker-description {
	margin: 16px 0;
	padding: 15px;
	background-color: #F8F8F8;
	border-radius: 10px;
	min-height: 80px;
}

.description-text {
	font-size: 15px;
	line-height: 1.5;
	color: #333333;
}

.marker-info {
	margin-top: 20px;
}

.info-item {
	display: flex;
	align-items: center;
	padding: 8px 0;
	border-bottom: 1px solid #EEEEEE;
}

.info-item:last-child {
	border-bottom: none;
}

.info-icon {
	margin-right: 10px;
	font-size: 16px;
}

.info-text {
	font-size: 14px;
	color: #666666;
}

.popup-footer {
	display: flex;
	border-top: 1px solid #EEEEEE;
}

.popup-btn {
	flex: 1;
	height: 50px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 16px;
}

.cancel-btn {
	color: #666666;
	border-right: 1px solid #EEEEEE;
}

.confirm-btn {
	color: #007AFF;
	font-weight: bold;
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

.add-marker-btn {
	position: fixed;
	top: 120rpx;
	right: 20rpx;
	background-color: #007AFF;
	padding: 16rpx 32rpx;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	gap: 12rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.3);
	z-index: 999;
}

.add-marker-btn .btn-text {
	color: #FFFFFF;
	font-size: 28rpx;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
	.add-marker-btn {
		background-color: #0A84FF;
	}
}

// 在 setup() 函数中添加
function showAddMarkerForm() {
	// 显示添加标记表单，传递当前位置信息
	uni.navigateTo({
		url: `/pages/map/add-marker?latitude=${currentLocation.value.latitude}&longitude=${currentLocation.value.longitude}`
	});
}

// 修改获取位置的方法，确保在加载地图前获取到位置信息
// 在初始化位置获取函数之前添加位置准备状态
const locationReady = ref(false);
const locationError = ref(null);

async function getInitialLocation() {
  return new Promise((resolve, reject) => {
    console.log('获取初始位置...');
    
    // 检查缓存中是否有上次的位置信息
    const cachedLocation = uni.getStorageSync('last_known_location');
    if (cachedLocation) {
      try {
        const parsedLocation = JSON.parse(cachedLocation);
        const timestamp = parsedLocation.timestamp || 0;
        const now = Date.now();
        const ageInMinutes = (now - timestamp) / (60 * 1000);
        
        // 如果缓存的位置不超过24小时，先使用它
        if (ageInMinutes < 1440 && 
            parsedLocation.latitude && 
            parsedLocation.longitude) {
          console.log('使用缓存的位置信息（临时）:', parsedLocation);
          
          // 临时更新位置，但仍然尝试获取新位置
          currentLocation.value = {
            latitude: parsedLocation.latitude,
            longitude: parsedLocation.longitude
          };
          // 不设置locationReady，因为我们还将尝试获取真实位置
        }
      } catch (parseError) {
        console.warn('解析缓存位置失败:', parseError);
      }
    }

    // 使用一个合理的默认位置（中国地图中心位置附近）
    // 相比北京更接近中心位置
    const defaultLocation = { 
      latitude: 34.7642, 
      longitude: 113.6501 // 郑州（大致位于中国中心）
    };
    
    let attemptHighAccuracy = true;
    let showedInitialMessage = false;
    
    // 设置较长的超时时间
    const timeout = setTimeout(() => {
      console.warn('位置获取超时，使用默认或缓存位置');
      
      // 如果还没有设置位置，使用默认位置
      if (!locationReady.value) {
        // 优先使用缓存位置，其次使用默认位置
        if (!currentLocation.value || !currentLocation.value.latitude) {
          currentLocation.value = defaultLocation;
        }
        
        locationReady.value = true;
        // 显示提示
        uni.showToast({
          title: '定位超时，将在获取位置后自动更新',
          icon: 'none',
          duration: 3000
        });
        
        resolve(currentLocation.value);
      }
    }, 8000);
    
    // 显示定位中提示
    if (!showedInitialMessage) {
      uni.showLoading({
        title: '正在定位...',
        mask: false
      });
      showedInitialMessage = true;
      
      // 3秒后自动隐藏
      setTimeout(() => {
        uni.hideLoading();
      }, 3000);
    }
    
    // 函数：尝试获取位置
    const tryGetLocation = (useHighAccuracy = true) => {
      uni.getLocation({
        type: 'gcj02',
        isHighAccuracy: useHighAccuracy, // 高精度定位
        highAccuracyExpireTime: 4000, // 高精度定位超时时间，单位毫秒
        success: (res) => {
          clearTimeout(timeout);
          console.log('成功获取初始位置:', res);
          
          // 隐藏加载提示
          uni.hideLoading();
          
          // 检查定位结果是否有效
          if (!res.latitude || !res.longitude || 
              isNaN(res.latitude) || isNaN(res.longitude)) {
            console.error('获取到无效位置数据:', res);
            
            // 如果高精度获取失败，降级到普通精度
            if (useHighAccuracy) {
              console.log('高精度定位返回无效数据，降级到普通精度定位');
              attemptHighAccuracy = false;
              tryGetLocation(false);
              return;
            }
            
            // 使用默认位置
            if (!locationReady.value) {
              // 优先使用缓存位置，其次使用默认位置
              if (!currentLocation.value || !currentLocation.value.latitude) {
                currentLocation.value = defaultLocation;
              }
              locationReady.value = true;
              resolve(currentLocation.value);
            }
            return;
          }
          
          // 更新当前位置
          currentLocation.value = {
            latitude: res.latitude,
            longitude: res.longitude
          };
          
          // 保存到缓存，包含时间戳
          try {
            const locationWithTimestamp = {
              ...currentLocation.value,
              timestamp: Date.now()
            };
            uni.setStorageSync('last_known_location', JSON.stringify(locationWithTimestamp));
          } catch (saveError) {
            console.warn('保存位置到缓存失败:', saveError);
          }
          
          locationReady.value = true;
          resolve(currentLocation.value);
        },
        fail: (err) => {
          console.error('获取初始位置失败', err);
          locationError.value = err;
          
          // 如果高精度获取失败，降级到普通精度
          if (useHighAccuracy) {
            console.log('高精度定位失败，降级到普通精度定位');
            attemptHighAccuracy = false;
            tryGetLocation(false);
            return;
          }
          
          // 隐藏加载提示
          uni.hideLoading();
          
          // 如果仍没有设置位置，使用默认或缓存位置
          if (!locationReady.value) {
            // 优先使用缓存位置，其次使用默认位置
            if (!currentLocation.value || !currentLocation.value.latitude) {
              currentLocation.value = defaultLocation;
              // 显示错误提示
              uni.showToast({
                title: '位置获取失败，使用默认位置',
                icon: 'none',
                duration: 2000
              });
            } else {
              // 已有缓存位置
              uni.showToast({
                title: '使用缓存的位置信息',
                icon: 'none',
                duration: 2000
              });
            }
            
            locationReady.value = true;
            resolve(currentLocation.value);
          }
        }
      });
    };
    
    // 开始获取位置 - 先尝试高精度
    try {
      tryGetLocation(attemptHighAccuracy);
    } catch (e) {
      clearTimeout(timeout);
      console.error('获取位置过程出错:', e);
      uni.hideLoading();
      
      // 使用默认位置
      if (!locationReady.value) {
        // 优先使用缓存位置，其次使用默认位置
        if (!currentLocation.value || !currentLocation.value.latitude) {
          currentLocation.value = defaultLocation;
        }
        locationReady.value = true;
        resolve(currentLocation.value);
      }
    }
  });
}

// 修改initMap函数，确保正确设置地图中心点
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
      // 确保我们有位置信息
      if (!locationReady.value) {
        console.log('位置尚未就绪，获取位置后再初始化地图');
        getInitialLocation().then(initMapWithLocation);
        return;
      }
      
      initMapWithLocation(currentLocation.value);
    } else {
      console.log('地图已经初始化，不需要重复创建');
      
      // 如果地图已初始化，确保将中心设置到当前位置
      if (currentLocation.value && 
        typeof currentLocation.value.latitude !== 'undefined') {
        console.log('更新已有地图到当前位置:', currentLocation.value);
        map.value.setCenter([
          currentLocation.value.longitude, 
          currentLocation.value.latitude
        ]);
        map.value.setZoom(16);
      }
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

// 添加辅助函数：使用指定位置初始化地图
function initMapWithLocation(location) {
  // 显示地图加载动画
  const mapLoadingStatus = uni.showLoading({
    title: '地图加载中...',
    mask: true
  });
  
  // 5秒后自动隐藏加载动画
  setTimeout(() => uni.hideLoading(), 5000);
  
  // 获取当前定位作为地图中心
  const center = location && 
    typeof location.longitude !== 'undefined' ? 
    [location.longitude, location.latitude] : 
    [113.6501, 34.7642]; // 默认位置（中国中心位置附近）
  
  // 初始化地图对象，添加动画效果
  const mapOptions = {
    zoom: 15,
    center: center,
    resizeEnable: true,
    animateEnable: true, // 启用动画效果
    dragEnable: true,    // 允许拖动
    zoomEnable: true,    // 允许缩放
    jogEnable: true      // 允许平滑缩放
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
    console.log('地图加载完成，创建用户标记和加载标记数据');
    
    // 隐藏加载动画
    uni.hideLoading();
    
    // 显示成功提示
    uni.showToast({
      title: '地图加载完成',
      icon: 'success',
      duration: 1000
    });
    
    // 将地图实例存储在DOM元素中
    if (mapContainer) {
      mapContainer.__amap_instance__ = map.value;
    }
    
    // 确保设置地图中心到当前位置
    if (currentLocation.value && 
      typeof currentLocation.value.latitude !== 'undefined') {
      console.log('设置地图中心到当前位置:', currentLocation.value);
      map.value.setCenter([
        currentLocation.value.longitude, 
        currentLocation.value.latitude
      ]);
      map.value.setZoom(16);
    }
    
    // 简化地图标记创建条件，只需要位置信息
    setTimeout(() => {
      if (currentLocation.value && typeof currentLocation.value.latitude !== 'undefined') {
        console.log('开始创建初始用户标记');
        // 使用toggleMarker创建用户标记
        toggleMarker();
        console.log('初始用户标记已创建');
        
        // 加载标记数据并显示在地图上
        setTimeout(() => {
          console.log('开始加载地图标记数据');
          loadMarkers();
        }, 1000);
      } else {
        console.warn('无法创建用户标记：位置不可用');
        
        // 重新尝试获取位置
        getInitialLocation().then(location => {
          console.log('重新获取位置成功，创建用户标记');
          toggleMarker();
          
          // 加载标记数据
          loadMarkers();
        });
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
}

// 修改initAMap函数，先获取位置再初始化地图
const initAMap = async () => {
  try {
    console.log('初始化高德地图...');
    
    // 先获取初始位置
    await getInitialLocation();
    
    // 检查后端API连接
    checkBackendConnection();
    
    // 加载高德地图SDK
    window.onAMapLoaded = initMap;
    
    // 异步加载高德地图
    if (typeof AMap === 'undefined') {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=9ea84b4333b114c188a67cb42564a48f&callback=onAMapLoaded';
      document.head.appendChild(script);
    } else {
      initMap();
    }
  } catch (error) {
    console.error('初始化地图失败:', error);
    uni.showToast({
      title: '初始化地图失败',
      icon: 'none'
    });
  }
};

// 获取用户信息
const userInfo = computed(() => userStore.userInfo);

// 添加标记显示控制
const showMarkers = ref(true);

// 控制标记的显示和隐藏
const toggleMarkersVisibility = () => {
	showMarkers.value = !showMarkers.value;
	
	if (map.value) {
		// 获取所有圆形覆盖区域和标记，但排除用户头像标记
		const circles = map.value.getAllOverlays('circle');
		const allMapMarkers = map.value.getAllOverlays('marker');
		
		// 筛选出非用户头像的标记
		const markerOverlays = allMapMarkers.filter(marker => {
			// 通过extData或其他属性判断是否是用户头像
			const extData = marker.getExtData();
			return !(extData && extData.isUserMarker); // isUserMarker是我们为用户头像标记添加的标识
		});
		
		if (showMarkers.value) {
			// 显示所有标记（非用户头像）
			markerOverlays.forEach(marker => {
				marker.show();
			});
			
			// 显示所有圆形覆盖区域
			circles.forEach(circle => {
				circle.show();
			});
			
			console.log('显示所有标记和覆盖区域');
		} else {
			// 隐藏所有标记（非用户头像）
			markerOverlays.forEach(marker => {
				marker.hide();
			});
			
			// 隐藏所有圆形覆盖区域
			circles.forEach(circle => {
				circle.hide();
			});
			
			console.log('隐藏所有标记和覆盖区域，用户头像保持显示');
		}
		
		// 确保用户头像始终显示在最上层
		ensureUserMarkersOnTop();
	}
};

// 确保用户头像标记位于最上层
const ensureUserMarkersOnTop = () => {
	if (!map.value) return;
	
	const allMarkers = map.value.getAllOverlays('marker');
	
	// 筛选出用户头像标记
	const userMarkers = allMarkers.filter(marker => {
		const extData = marker.getExtData();
		return extData && extData.isUserMarker;
	});
	
	// 将用户头像提升到最上层
	userMarkers.forEach(marker => {
		marker.setzIndex(1000); // 设置高z-index确保显示在最上层
		marker.show(); // 确保显示
	});
};

// 用户位置标记
const userMarker = ref(null);

// 添加标记更新事件监听
onMounted(() => {
  // 监听标记更新事件
  uni.$on('markers-updated', (event) => {
    console.log('接收到标记更新通知:', event);
    // 如果地图已初始化，重新加载标记
    if (map.value) {
      console.log('由于标记更新事件，重新加载地图标记');
      // 清除地图上现有的标记和圆形覆盖物
      clearMapOverlays();
      // 重新加载标记
      loadMarkers();
    }
  });
});

// 组件卸载前取消事件监听和清理资源
onBeforeUnmount(() => {
  console.log('地图页面卸载，清理资源');
  
  // 清理定时器和事件监听
  uni.$off('markers-updated');

  // 清理其他定时器
  if (locationUpdateInterval.value) {
    clearInterval(locationUpdateInterval.value);
    locationUpdateInterval.value = null;
  }
  
  if (nearbyUsersUpdateInterval.value) {
    clearInterval(nearbyUsersUpdateInterval.value);
    nearbyUsersUpdateInterval.value = null;
  }
  
  if (walkingTimer.value) {
    clearInterval(walkingTimer.value);
    walkingTimer.value = null;
  }
  
  // 清除DOM事件监听器
  try {
    // 清除设备方向监听器
    window.removeEventListener('deviceorientation', null);
    
    // 停止设备方向监听
    if (typeof uni.stopDeviceMotionListening === 'function') {
      uni.stopDeviceMotionListening({
        success: () => console.log('设备方向监听已停止'),
        fail: (err) => console.log('停止设备方向监听出错:', err)
      });
    }
    
    // 取消罗盘监听
    if (typeof uni.offCompassChange === 'function') {
      uni.offCompassChange();
    }
    
    // 清除自定义事件监听器
    const mapDom = document.getElementById('map-container');
    if (mapDom) {
      mapDom.removeEventListener('click', onMapContainerClick);
    }
  } catch (e) {
    console.warn('停止传感器监听时出错:', e);
  }
  
  // 清除标记引用和缓存
  Object.keys(userMarkers).forEach(key => {
    delete userMarkers[key];
  });
  
  // 清除头像缓存
  if (avatarCache && typeof avatarCache.clear === 'function') {
    avatarCache.clear();
  }
  
  // 通知定位存储退出地图页面
  if (locationStore) {
    try {
      // 如果有stopLocationUpdates方法，调用它
      if (typeof locationStore.stopLocationUpdates === 'function') {
        locationStore.stopLocationUpdates();
      }
    } catch (storeError) {
      console.warn('停止位置更新存储时出错:', storeError);
    }
  }
  
  // 清理地图资源
  if (map.value) {
    try {
      // 移除地图上的所有覆盖物
      map.value.clearMap();
      // 销毁地图实例
      map.value.destroy();
      map.value = null;
      console.log('地图实例已销毁');
    } catch (e) {
      console.error('销毁地图时出错:', e);
    }
  }
});

// 添加清除地图覆盖物的方法
function clearMapOverlays() {
  if (!map.value) return;
  
  try {
    console.log('清除地图上的所有标记和覆盖物');
    
    // 获取所有标记和圆形覆盖物
    const allMarkers = map.value.getAllOverlays('marker');
    const allCircles = map.value.getAllOverlays('circle');
    
    // 保存用户位置标记，以便后续还原
    const userMarkers = allMarkers.filter(marker => {
      const extData = marker.getExtData();
      return extData && extData.isUserMarker;
    });
    
    // 移除非用户标记
    const normalMarkers = allMarkers.filter(marker => {
      const extData = marker.getExtData();
      return !(extData && extData.isUserMarker);
    });
    
    // 移除标记
    if (normalMarkers.length > 0) {
      map.value.remove(normalMarkers);
      console.log(`已移除 ${normalMarkers.length} 个普通标记`);
    }
    
    // 移除圆形覆盖物
    if (allCircles.length > 0) {
      map.value.remove(allCircles);
      console.log(`已移除 ${allCircles.length} 个圆形覆盖物`);
    }
    
    // 确保用户标记仍在最顶层
    userMarkers.forEach(marker => {
      marker.setzIndex(1000);
    });
  } catch (error) {
    console.error('清除地图覆盖物时出错:', error);
  }
}

// 处理从marker-detail页面返回后的导航
const checkNavigationRequest = () => {
	const navigateToMarker = uni.getStorageSync('navigate_to_marker');
	if (navigateToMarker) {
		// 清除缓存
		uni.removeStorageSync('navigate_to_marker');
		
		// 获取位置信息
		const longitude = navigateToMarker.longitude || navigateToMarker.location?.coordinates?.[0];
		const latitude = navigateToMarker.latitude || navigateToMarker.location?.coordinates?.[1];
		
		// 导航到位置
		if (longitude && latitude && map.value) {
			map.value.setCenter([longitude, latitude]);
			map.value.setZoom(17);
			
			// 显示提示
			uni.showToast({
				title: '正在导航到标记位置',
				icon: 'none',
				duration: 1500
			});
		}
	}
};

// 导航到指定位置（供其他页面调用）
const navigateToLocation = (markerData) => {
	if (!markerData) return;
	
	const longitude = markerData.longitude || markerData.location?.coordinates?.[0];
	const latitude = markerData.latitude || markerData.location?.coordinates?.[1];
	
	if (longitude && latitude && map.value) {
		map.value.setCenter([longitude, latitude]);
		map.value.setZoom(17);
		
		// 显示提示
		uni.showToast({
			title: '正在导航到标记位置',
			icon: 'none',
			duration: 1500
		});
	}
};

// 在页面恢复时检查是否有导航请求
uni.onShow(() => {
	checkNavigationRequest();
});

// 直接使用处理好的图像创建标记
function createMarkerWithProcessedImage(userId, position, imageDataUrl) {
	try {
		// 画布大小
		const canvasSize = 60;
		
		// 确保userMarkers对象已初始化
		if (typeof userMarkers !== 'object') {
			console.warn('userMarkers未定义，初始化为空对象');
			window.userMarkers = {};
		}
		
		// 移除可能存在的同ID标记
		if (userMarkers[userId]) {
			console.log('移除已存在的同ID标记:', userId);
			map.value.remove(userMarkers[userId]);
			delete userMarkers[userId];
		}
		
		// 创建标记
		const marker = new AMap.Marker({
			position: position,
			icon: new AMap.Icon({
				size: new AMap.Size(canvasSize, canvasSize),
				image: imageDataUrl,
				imageSize: new AMap.Size(canvasSize, canvasSize)
			}),
			offset: new AMap.Pixel(-canvasSize/2, -canvasSize/2),
			zIndex: 100, // 高z-index确保显示在最上层
			extData: { 
				userId: userId, 
				type: 'user',
				isUserMarker: true // 添加标识，表明这是用户头像标记
			}
		});
		
		// 将标记添加到地图
		map.value.add(marker);
		
		// 保存标记引用以便后续操作
		userMarkers[userId] = marker;
		
		// 设置DOM属性和事件处理
		setTimeout(() => setupMarkerDOM(marker, userId), 100);
		
		// 为标记添加点击事件
		marker.on('click', function(e) {
			console.log('标记被点击，用户ID:', userId);
			processUserMarkerTap(userId);
		});
		
		// 确保元素已添加后设置触发器
		setTimeout(() => setupMarkerClickHandlers(), 500);
		
		console.log('成功创建用户标记，用户ID:', userId);
		return marker;
	} catch (error) {
		console.error('使用处理好的图像创建标记失败:', error);
		return createDefaultMarker(position, userId);
	}
}

// 处理图像并创建标记
function processImageAndCreateMarker(userId, position, imageUrl) {
	try {
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
				
				// 保存到缓存
				avatarCache.put(imageUrl, markerImage);
				
				// 创建标记
				createMarkerWithProcessedImage(userId, position, markerImage);
			} catch (error) {
				console.error('处理图像时出错:', error);
				createDefaultMarker(position, userId);
			}
		};
		
		// 图像加载失败时创建默认标记
		img.onerror = function(e) {
			console.error('加载头像图像失败:', e);
			createDefaultMarker(position, userId);
		};
		
		// 设置图像源
		img.src = imageUrl;
	} catch (error) {
		console.error('处理图像并创建标记失败:', error);
		return createDefaultMarker(position, userId);
	}
}

// 辅助函数：设置标记DOM属性和事件
function setupMarkerDOM(marker, userId) {
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
}

// 添加地图开始拖动事件处理