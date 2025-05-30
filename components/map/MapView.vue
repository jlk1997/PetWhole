<template>
	<view class="map-container">
		<!-- 地图组件 -->
		<map
			id="map"
			class="map"
			:latitude="mapState.latitude"
			:longitude="mapState.longitude"
			:scale="mapState.scale"
			:markers="mapMarkers"
			:polygons="areaPolygons"
			@regionchange="handleRegionChange"
			@tap="handleMapTap"
			show-location>
			
			<!-- 地图控件 -->
			<view class="map-controls">
				<view class="control-btn location-btn" @click="moveToLocation">
					<uni-icons type="location-filled" size="24" color="#2196F3"></uni-icons>
				</view>
				<view class="control-btn add-btn" @click="showMarkerForm">
					<uni-icons type="plus" size="24" color="#2196F3"></uni-icons>
				</view>
			</view>
		</map>
		
		<!-- 区域标记组件 -->
		<area-marker
			v-for="area in visibleAreas"
			:key="area.areaId"
			:markers="area.markers"
			:area-id="area.areaId"
			@refresh="refreshMarkers">
		</area-marker>
		
		<!-- 标记表单弹窗 -->
		<uni-popup ref="formPopup" type="center">
			<marker-form
				v-if="showForm"
				:area-id="selectedAreaId"
				:marker="selectedMarker"
				@close="closeMarkerForm"
				@submit="handleMarkerSubmit">
			</marker-form>
		</uni-popup>
	</view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '@/store/user.js';
import { showToast, showLoading, hideLoading } from '@/utils/ui.js';
import MarkerService from '@/utils/markerService.js';
import { calculateAreaId, calculateAreaBounds, generateAreaPolygon } from '@/utils/areaService.js';

// 组件引入
import AreaMarker from './AreaMarker.vue';
import MarkerForm from './MarkerForm.vue';

const userStore = useUserStore();
const formPopup = ref(null);

// 地图状态
const mapState = reactive({
	latitude: 39.9087,  // 默认纬度
	longitude: 116.3975, // 默认经度
	scale: 16
});

// 可见区域数据
const visibleAreas = ref([]);
const areaPolygons = ref([]);
const mapMarkers = ref([]);

// 表单相关状态
const showForm = ref(false);
const selectedAreaId = ref('');
const selectedMarker = ref(null);
const selectedLocation = ref(null);

// 初始化地图
onMounted(async () => {
	await initializeMap();
});

// 初始化地图位置
async function initializeMap() {
	try {
		const location = await uni.getLocation({
			type: 'gcj02'
		});
		
		mapState.latitude = location.latitude;
		mapState.longitude = location.longitude;
		
		await refreshMarkers();
	} catch (error) {
		showToast('获取位置失败，使用默认位置');
	}
}

// 移动到当前位置
async function moveToLocation() {
	try {
		const location = await uni.getLocation({
			type: 'gcj02'
		});
		
		mapState.latitude = location.latitude;
		mapState.longitude = location.longitude;
		mapState.scale = 16;
	} catch (error) {
		showToast('获取位置失败');
	}
}

// 处理地图区域变化
async function handleRegionChange(e) {
	if (e.type === 'end' && e.causedBy === 'drag') {
		const mapContext = uni.createMapContext('map');
		const region = await mapContext.getRegion();
		
		// 更新可见区域的标记
		await refreshMarkers(region);
	}
}

// 处理地图点击
function handleMapTap(e) {
	selectedLocation.value = {
		latitude: e.detail.latitude,
		longitude: e.detail.longitude
	};
	
	// 计算点击位置所在的区域ID
	selectedAreaId.value = calculateAreaId(e.detail.longitude, e.detail.latitude);
	showMarkerForm();
}

// 显示标记表单
function showMarkerForm() {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	showForm.value = true;
	formPopup.value.open();
}

// 关闭标记表单
function closeMarkerForm() {
	formPopup.value.close();
	setTimeout(() => {
		showForm.value = false;
		selectedMarker.value = null;
		selectedLocation.value = null;
	}, 200);
}

// 处理标记提交
async function handleMarkerSubmit() {
	closeMarkerForm();
	await refreshMarkers();
}

// 刷新区域标记
async function refreshMarkers(region) {
	try {
		console.log('刷新地图标记...');
		showLoading('加载中...');
		
		// 获取可见区域的标记
		const mapContext = uni.createMapContext('map');
		const currentRegion = region || await mapContext.getRegion();
		
		// 计算可见区域内的所有区域ID
		const visibleAreaIds = getVisibleAreaIds(currentRegion);
		console.log('可见区域IDs:', visibleAreaIds);
		
		// 获取区域标记数据
		const areaData = await Promise.all(
			visibleAreaIds.map(async (areaId) => {
				try {
					// 强制从服务器获取最新数据，设置刷新标志
					const markers = await MarkerService.getAreaMarkers(areaId, true);
					return {
						areaId,
						markers
					};
				} catch (error) {
					console.error(`获取区域 ${areaId} 标记失败:`, error);
					return {
						areaId,
						markers: []
					};
				}
			})
		);
		
		// 更新区域数据
		visibleAreas.value = areaData.filter(area => area.markers && area.markers.length > 0);
		console.log('更新后的可见区域数:', visibleAreas.value.length);
		
		// 更新区域多边形
		areaPolygons.value = visibleAreaIds.map(areaId => ({
			points: generateAreaPolygon(areaId)[0],
			strokeWidth: 1,
			strokeColor: '#2196F3',
			fillColor: 'transparent'
		}));
		
		// 显示成功提示
		hideLoading();
		return true;
	} catch (error) {
		console.error('刷新标记失败:', error);
		hideLoading();
		showToast('刷新标记失败');
		return false;
	}
}

// 获取可见区域内的所有区域ID
function getVisibleAreaIds(region) {
	const { southwest, northeast } = region;
	const areaIds = new Set();
	
	// 计算区域范围内的所有区域ID
	for (let lat = southwest.latitude; lat <= northeast.latitude; lat += 0.002) {
		for (let lng = southwest.longitude; lng <= northeast.longitude; lng += 0.002) {
			areaIds.add(calculateAreaId(lng, lat));
		}
	}
	
	return Array.from(areaIds);
}

// 更新地图标记
function updateMapMarkers() {
	mapMarkers.value = visibleAreas.value.flatMap(area => 
		area.markers.map(marker => ({
			id: marker._id,
			latitude: marker.locationDetail.latitude,
			longitude: marker.locationDetail.longitude,
			iconPath: marker.markerType === 'stray_dog' ? '/static/stray-dog.png' : '/static/lost-dog.png',
			width: 32,
			height: 32
		}))
	);
}
</script>

<style>
.map-container {
	width: 100%;
	height: 100%;
	position: relative;
}

.map {
	width: 100%;
	height: 100%;
}

.map-controls {
	position: absolute;
	right: 30rpx;
	bottom: 100rpx;
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.control-btn {
	width: 80rpx;
	height: 80rpx;
	background-color: #fff;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2rpx 10rpx rgba(0,0,0,0.1);
}

/* 适配暗黑模式 */
@media (prefers-color-scheme: dark) {
	.control-btn {
		background-color: #333;
	}
}
</style> 