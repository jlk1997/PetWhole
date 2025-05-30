<template>
	<view class="map-page">
		<map-view ref="mapView"></map-view>
		
		<!-- 右上角添加标记按钮 -->
		<view class="add-marker-btn" @click="handleAddMarker">
			<uni-icons type="plus" size="24" color="#333"></uni-icons>
		</view>
		
		<!-- 底部导航栏 -->
		<tab-bar :current="1"></tab-bar>
		
		<!-- 在地图页面底部添加事件组件 -->
		<StoryEvent 
			:visible="storyStore.eventVisible" 
			:event="storyStore.currentEvent"
			:plotId="storyStore.currentPlot"
			@complete="handleEventComplete"
			@choice="handleEventChoice"
			@close="handleEventClose"
		></StoryEvent>
		
		<!-- 添加剧情指示器（可选） -->
		<view v-if="showStoryIndicator" class="story-indicator" @click="checkStory">
			<uni-icons type="chat" size="20" color="#fff"></uni-icons>
			<text>新剧情</text>
		</view>
		
		<!-- 调试面板 -->
		<view class="debug-panel">
			<button type="primary" size="mini" @click="debugStory">调试剧情</button>
			<button type="default" size="mini" @click="forceTriggerStory">强制触发</button>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted, onActivated, computed, onUnmounted } from 'vue';
import MapView from '@/components/map/MapView.vue';
import TabBar from '@/components/common/TabBar.vue';
import StoryEvent from '@/pages/components/StoryEvent.vue'
import { useStoryStore } from '@/stores/useStoryStore'
import { useUserStore } from '@/stores/useUserStore' // 添加用户商店，用于检查用户状态
import { getStoryPlots, startStory } from '@/api/storyApi'
import { useMarkerStore } from '@/stores/markerStore.js'; // 添加标记存储

const mapView = ref(null);
const storyStore = useStoryStore();
const userStore = useUserStore();
const markerStore = useMarkerStore(); // 添加marker存储
const storyInitialized = ref(false);
const showStoryIndicator = ref(false);

// 处理添加标记
function handleAddMarker() {
	mapView.value?.showMarkerForm();
}

// 监听页面挂载
onMounted(async () => {
	// 添加事件监听器
	uni.$on('marker-created', handleMarkerCreated);
	uni.$on('refresh-map', handleRefreshMap);
	
	// 延迟初始化剧情系统
	setTimeout(async () => {
		await initStory();
		storyInitialized.value = true;
		
		// 设置定期检查
		setInterval(checkForNewStories, 60 * 1000); // 每分钟检查一次
	}, 1500); // 延迟1.5秒，确保地图已加载完成
});

// 监听页面卸载
onUnmounted(() => {
	// 移除事件监听器
	uni.$off('marker-created', handleMarkerCreated);
	uni.$off('refresh-map', handleRefreshMap);
});

// 处理标记创建事件
const handleMarkerCreated = (event) => {
	console.log('收到标记创建事件:', event);
	if (event.marker && mapView.value) {
		// 通知地图更新
		mapView.value.refreshMarkers();
	}
};

// 处理地图刷新事件
const handleRefreshMap = (event) => {
	console.log('收到地图刷新事件:', event);
	if (mapView.value) {
		mapView.value.refreshMarkers();
	}
};

// 页面激活时检查剧情（Tab页切换时）
onActivated(() => {
	if (storyInitialized.value) {
		checkForNewStories();
	}
});

// 初始化剧情系统（增强版）
const initStory = async () => {
	console.log('正在初始化剧情系统...');
	try {
		// 使用新的初始化方法
		const result = await storyStore.initStorySystem();
		console.log('剧情系统初始化结果:', result);
		return result;
	} catch (err) {
		console.error('初始化剧情系统出错:', err);
		return false;
	}
}

// 定期检查新剧情
const checkForNewStories = async () => {
	if (storyStore.currentEvent) {
		// 已有活跃事件，不执行新检查
		return;
	}
	
	// 检查是否需要刷新剧情
	if (storyStore.shouldCheckStories) {
		const hasNewStory = await storyStore.refreshStorySystem();
		if (!hasNewStory && storyStore.nextMainStory) {
			// 有待执行的剧情但没有显示，可能是用户之前关闭了，显示指示器
			showStoryIndicator.value = true;
		}
	}
}

// 手动检查剧情按钮点击事件
const checkStory = async () => {
	showStoryIndicator.value = false;
	await storyStore.checkNextMainStory();
}

// 处理事件完成
const handleEventComplete = async (eventId) => {
	await storyStore.completeCurrentEvent(eventId);
}

// 处理多选项事件
const handleEventChoice = async (data) => {
	await storyStore.completeCurrentEvent(data.eventId, data.choiceIndex);
}

// 处理事件关闭
const handleEventClose = () => {
	storyStore.hideCurrentEvent();
}

// 调试函数 - 显示剧情状态
const debugStory = async () => {
	try {
		// 直接调用API检查响应
		const plotsResponse = await getStoryPlots();
		console.log('API响应 - 剧情列表:', plotsResponse);
		
		// 输出当前状态
		console.log('===== 剧情系统状态 =====');
		console.log('当前剧情列表:', storyStore.plots);
		console.log('主线剧情:', storyStore.mainStories);
		console.log('下一个剧情:', storyStore.nextMainStory);
		console.log('初始化状态:', storyStore.initialized);
		console.log('当前事件:', storyStore.currentEvent);
		console.log('是否显示事件:', storyStore.eventVisible);
		
		// 尝试刷新剧情系统
		const refreshResult = await storyStore.refreshStorySystem();
		console.log('刷新剧情结果:', refreshResult);
		
		// 显示提示
		uni.showToast({
			title: plotsResponse.success ? '剧情系统正常' : '剧情系统异常',
			icon: plotsResponse.success ? 'success' : 'error'
		});
	} catch (err) {
		console.error('调试剧情出错:', err);
		uni.showToast({
			title: '调试失败:' + (err.message || '未知错误'),
			icon: 'none'
		});
	}
}

// 强制触发第一个主线剧情
const forceTriggerStory = async () => {
	try {
		// 获取剧情列表
		const plotsResponse = await getStoryPlots();
		console.log('获取剧情列表:', plotsResponse);
		
		if (plotsResponse.success && plotsResponse.data && plotsResponse.data.length > 0) {
			// 找到第一个主线剧情
			const mainStory = plotsResponse.data.find(p => p.isMainStory);
			
			if (mainStory) {
				console.log('找到主线剧情，准备强制触发:', mainStory.title);
				
				// 直接调用startStory API
				const startResponse = await startStory(mainStory._id);
				console.log('启动剧情响应:', startResponse);
				
				if (startResponse.success && startResponse.data) {
					// 手动更新剧情状态
					storyStore.currentPlot = mainStory._id;
					storyStore.currentEvent = startResponse.data.currentEvent;
					storyStore.eventVisible = true;
					
					uni.showToast({
						title: '剧情已触发',
						icon: 'success'
					});
				} else {
					uni.showToast({
						title: '触发失败:' + startResponse.message,
						icon: 'none'
					});
				}
			} else {
				uni.showToast({
					title: '未找到主线剧情',
					icon: 'none'
				});
			}
		} else {
			uni.showToast({
				title: '没有可用剧情',
				icon: 'none'
			});
		}
	} catch (err) {
		console.error('强制触发剧情出错:', err);
		uni.showToast({
			title: '触发失败:' + (err.message || '未知错误'),
			icon: 'none'
		});
	}
}
</script>

<style>
.map-page {
	width: 100vw;
	height: 100vh;
	position: relative;
	background-color: #fff;
}

.add-marker-btn {
	position: fixed;
	top: 40rpx;
	right: 40rpx;
	width: 80rpx;
	height: 80rpx;
	background-color: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
	z-index: 100;
}

.story-indicator {
	position: fixed;
	bottom: 120rpx;
	right: 40rpx;
	background-color: #3a86ff;
	border-radius: 40rpx;
	padding: 10rpx 20rpx;
	display: flex;
	align-items: center;
	color: #fff;
	font-size: 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
	z-index: 100;
	animation: pulse 2s infinite;
}

.story-indicator text {
	margin-left: 8rpx;
}

/* 调试面板样式 */
.debug-panel {
	position: fixed;
	top: 40rpx;
	left: 40rpx;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
	z-index: 999;
}

@keyframes pulse {
	0% {
		transform: scale(1);
	}
	50% {
		transform: scale(1.1);
	}
	100% {
		transform: scale(1);
	}
}

/* 适配暗黑模式 */
@media (prefers-color-scheme: dark) {
	.map-page {
		background-color: #1a1a1a;
	}
	
	.add-marker-btn {
		background-color: #333;
	}
	
	.add-marker-btn uni-icons {
		color: #fff;
	}
}
</style> 