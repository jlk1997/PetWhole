<template>
	<view class="area-marker">
		<!-- 区域蒙版 -->
		<view class="area-overlay" :style="overlayStyle" @click="handleAreaClick">
			<view class="marker-count" v-if="markers.length > 0">
				{{ markers.length }}
			</view>
		</view>
		
		<!-- 标记详情弹窗（新设计，支持UGC内容和图文画册） -->
		<uni-popup ref="markerPopup" type="center">
			<view class="marker-popup">
				<!-- 弹窗头部 -->
				<view class="popup-header">
					<text class="popup-title">{{ getMarkerTitle(currentType) }}</text>
					<view class="close-btn" @click="closePopup">×</view>
				</view>
				
				<!-- 标记轮播 -->
				<swiper class="marker-swiper" :current="currentIndex" @change="handleSwiperChange">
					<swiper-item v-for="(marker, index) in markers" :key="marker._id">
						<scroll-view class="marker-scroll" scroll-y>
							<!-- 用户信息栏 -->
							<view class="user-info-bar">
								<image class="user-avatar" :src="marker.userAvatar || '/static/default-avatar.png'" mode="aspectFill"></image>
								<view class="user-details">
									<text class="user-name">{{ marker.userName || '匿名用户' }}</text>
									<text class="marker-time">{{ formatTime(marker.createdAt) }}</text>
								</view>
								<view class="marker-type-tag" :class="[`marker-type-${marker.markerType}`]">
									{{ getMarkerTypeText(marker.markerType) }}
								</view>
							</view>
							
							<!-- 标记标题 -->
							<view class="marker-info">
								<text class="marker-title">{{ marker.title }}</text>
							</view>
							
							<!-- 图片轮播 - 支持全幅显示 -->
							<swiper v-if="marker.images && marker.images.length > 0" 
								class="content-image-swiper" 
								:indicator-dots="marker.images.length > 1"
								:autoplay="false" 
								:duration="500">
								<swiper-item v-for="(img, imgIndex) in marker.images" :key="imgIndex">
									<view class="image-container">
										<image 
										:src="img.url" 
										mode="aspectFill" 
											class="content-image"
										@click="previewImage(marker.images, imgIndex)">
									</image>
										<view class="image-caption" v-if="img.caption">{{ img.caption }}</view>
									</view>
								</swiper-item>
							</swiper>
							
							<!-- 描述内容 - 支持富文本显示 -->
							<view class="content-section">
								<rich-text class="rich-content" :nodes="marker.formattedDescription || marker.description"></rich-text>
							</view>
							
							<!-- 标签栏 -->
							<view class="tag-section" v-if="marker.tags && marker.tags.length > 0">
								<view v-for="(tag, tagIndex) in marker.tags" :key="tagIndex" class="tag-item">
									#{{ tag }}
								</view>
							</view>
							
							<!-- 位置信息 -->
							<view class="location-section">
								<uni-icons type="location" size="16" color="#666"></uni-icons>
								<text class="location-text">{{ marker.address || '未知位置' }}</text>
							</view>
							
							<!-- 联系信息卡片 -->
							<view class="contact-card" v-if="hasContactInfo(marker)">
								<view class="card-header">
									<text class="card-title">联系信息</text>
								</view>
								<view class="contact-list">
								<view class="contact-item" v-if="marker.contactInfo.name">
										<view class="contact-icon">👤</view>
									<text class="contact-value">{{ marker.contactInfo.name }}</text>
								</view>
								<view class="contact-item" v-if="marker.contactInfo.phone">
										<view class="contact-icon">📱</view>
									<text class="contact-value">{{ marker.contactInfo.phone }}</text>
								</view>
								<view class="contact-item" v-if="marker.contactInfo.wechat">
										<view class="contact-icon">💬</view>
									<text class="contact-value">{{ marker.contactInfo.wechat }}</text>
									</view>
								</view>
							</view>
							
							<!-- 互动统计 -->
							<view class="stats-section">
								<view class="stat-item">
									<uni-icons type="eye" size="16" color="#666"></uni-icons>
									<text>{{ marker.viewCount || 0 }}</text>
								</view>
								<view class="stat-item">
									<uni-icons type="hand-up" size="16" color="#666"></uni-icons>
									<text>{{ marker.likeCount || 0 }}</text>
								</view>
								<view class="stat-item">
									<uni-icons type="chat" size="16" color="#666"></uni-icons>
									<text>{{ marker.commentCount || 0 }}</text>
								</view>
							</view>
							
							<!-- 操作按钮栏 -->
							<view class="action-buttons">
								<button class="action-btn like-btn" :class="{active: marker.isLiked}" @click="handleLike(marker)">
									<uni-icons :type="marker.isLiked ? 'heart-filled' : 'heart'" size="16" :color="marker.isLiked ? '#ff4757' : '#666'"></uni-icons>
									<text>喜欢</text>
								</button>
								<button class="action-btn comment-btn" @click="handleComment(marker)">
									<uni-icons type="chat" size="16" color="#666"></uni-icons>
									<text>评论</text>
								</button>
								<button class="action-btn share-btn" @click="handleShare(marker)">
									<uni-icons type="share" size="16" color="#666"></uni-icons>
									<text>分享</text>
								</button>
								<button class="action-btn more-btn" @click="showMoreActions(marker)">
									<uni-icons type="more-filled" size="16" color="#666"></uni-icons>
									<text>更多</text>
								</button>
							</view>
						</scroll-view>
					</swiper-item>
				</swiper>
				
				<!-- 导航指示器 -->
				<view class="popup-footer" v-if="markers.length > 1">
					<view class="swiper-dots">
						<view v-for="(_, index) in markers" 
							:key="index" 
							:class="['dot', { active: index === currentIndex }]">
						</view>
					</view>
				</view>
			</view>
		</uni-popup>
		
		<!-- 更多操作菜单 -->
		<uni-popup ref="actionsPopup" type="bottom">
			<view class="actions-menu">
				<view class="action-menu-title">更多操作</view>
				<view class="action-menu-list">
					<view class="action-menu-item" @click="handleEditMarker(selectedMarker)" v-if="canEdit(selectedMarker)">
						<uni-icons type="compose" size="20" color="#333"></uni-icons>
						<text>编辑</text>
					</view>
					<view class="action-menu-item" @click="handleResolve(selectedMarker)" v-if="canResolve(selectedMarker)">
						<uni-icons type="checkmarkempty" size="20" color="#333"></uni-icons>
						<text>标记解决</text>
					</view>
					<view class="action-menu-item" @click="handleReport(selectedMarker)">
						<uni-icons type="flag" size="20" color="#333"></uni-icons>
						<text>举报</text>
					</view>
				</view>
				<view class="action-menu-cancel" @click="closeActionsPopup">取消</view>
			</view>
		</uni-popup>
		
		<!-- 举报弹窗 -->
		<uni-popup ref="reportPopup" type="center">
			<view class="report-popup">
				<view class="popup-header">
					<text class="popup-title">举报信息</text>
					<view class="close-btn" @click="closeReportPopup">×</view>
				</view>
				
				<view class="report-content">
					<textarea v-model="reportReason" 
						placeholder="请输入举报原因" 
						class="report-input">
					</textarea>
					
					<button class="submit-btn" @click="submitReport">提交举报</button>
				</view>
			</view>
		</uni-popup>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useUserStore } from '@/store/user.js';
import { showToast, showModal } from '@/utils/ui.js';
import MarkerService from '@/utils/markerService.js';

const props = defineProps({
	markers: {
		type: Array,
		default: () => []
	},
	areaId: {
		type: String,
		required: true
	}
});

const userStore = useUserStore();
const markerPopup = ref(null);
const reportPopup = ref(null);
const actionsPopup = ref(null);
const currentIndex = ref(0);
const reportReason = ref('');
const markerToReport = ref(null);
const selectedMarker = ref(null);

// 计算蒙版样式
const overlayStyle = computed(() => {
	const type = props.markers[0]?.markerType;
	const color = type === 'stray_dog' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(244, 67, 54, 0.3)';
	return {
		backgroundColor: color
	};
});

// 获取当前标记类型
const currentType = computed(() => {
	return props.markers[currentIndex.value]?.markerType || 'stray_dog';
});

// 格式化时间
function formatTime(timestamp) {
	const date = new Date(timestamp);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// 处理区域点击
function handleAreaClick() {
	if (props.markers.length > 0) {
		currentIndex.value = 0;
		markerPopup.value.open();
	}
}

// 处理轮播切换
function handleSwiperChange(e) {
	currentIndex.value = e.detail.current;
}

// 预览图片 - 增强版
const previewImage = (images, index) => {
	console.log('预览图片数组:', images);
	
	// 确保图片数据格式正确
	const urls = images.map(img => {
		// 处理不同的图片数据结构
		if (typeof img === 'string') return img;
		return img.url || img.src || img.path || '';
	}).filter(url => url); // 过滤掉空URL
	
	if (urls.length > 0) {
		uni.previewImage({
			urls: urls,
			current: urls[index] || urls[0],
			success: () => {
				console.log('图片预览成功');
			},
			fail: (err) => {
				console.error('图片预览失败:', err);
				// 显示第一张图片的预览作为降级方案
				if (urls.length > 0 && index !== 0) {
	uni.previewImage({
						urls: [urls[0]],
						current: 0
					});
				}
			}
		});
	} else {
		console.error('无有效图片URL可预览');
		uni.showToast({
			title: '无法预览图片',
			icon: 'none'
	});
}
};

// 分享标记
function handleShare(marker) {
	// 实现分享逻辑
	uni.share({
		provider: 'weixin',
		scene: 'WXSceneSession',
		type: 0,
		title: marker.title,
		summary: marker.description,
		imageUrl: marker.images[0]?.url,
		success: function (res) {
			console.log('分享成功：', res);
		},
		fail: function (err) {
			console.error('分享失败：', err);
		}
	});
}

// 举报标记
function handleReport(marker) {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	markerToReport.value = marker;
	reportReason.value = '';
	markerPopup.value.close();
	reportPopup.value.open();
}

// 提交举报
async function submitReport() {
	if (!reportReason.value.trim()) {
		showToast('请输入举报原因');
		return;
	}
	
	try {
		await MarkerService.reportMarker(
			markerToReport.value._id,
			userStore.userId,
			reportReason.value.trim()
		);
		
		showToast('举报成功');
		closeReportPopup();
	} catch (error) {
		showToast(error.message);
	}
}

// 检查是否可以标记解决
function canResolve(marker) {
	return marker.userId === userStore.userId;
}

// 标记解决
async function handleResolve(marker) {
	try {
		await showModal({
			title: '确认操作',
			content: '确定要将此标记设置为已解决吗？'
		});
		
		await MarkerService.updateMarkerStatus(
			marker._id,
			'resolved',
			userStore.userId
		);
		
		showToast('操作成功');
		closePopup();
		
		// 触发刷新
		emit('refresh');
	} catch (error) {
		if (error.message !== 'cancel') {
			showToast(error.message);
		}
	}
}

// 关闭弹窗
function closePopup() {
	markerPopup.value.close();
}

function closeReportPopup() {
	reportPopup.value.close();
	markerPopup.value.open();
}

// 定义事件
const emit = defineEmits(['refresh']);

// 获取标记标题
function getMarkerTitle(type) {
	const typeMap = {
		'stray_dog': '流浪狗',
		'lost_dog': '寻狗启示',
		'location': '地点标记',
		'event': '活动',
		'story': '故事',
		'memory': '回忆',
		'other': '其他'
	};
	
	return typeMap[type] || '标记详情';
}

// 获取标记类型文本
function getMarkerTypeText(type) {
	return getMarkerTitle(type);
}

// 检查是否有联系信息
function hasContactInfo(marker) {
	if (!marker || !marker.contactInfo) return false;
	
	return !!(marker.contactInfo.name || marker.contactInfo.phone || marker.contactInfo.wechat);
}

// 点赞功能
async function handleLike(marker) {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	try {
		const result = await MarkerService.toggleLike(marker._id, userStore.userId);
		
		// 更新点赞状态和数量
		marker.isLiked = result.isLiked;
		marker.likeCount = result.likeCount;
		
		showToast(result.isLiked ? '已点赞' : '已取消点赞');
	} catch (error) {
		showToast(error.message);
	}
}

// 评论功能
function handleComment(marker) {
	if (!userStore.isAuthenticated) {
		showToast('请先登录');
		return;
	}
	
	// 暂时实现为跳转到评论页
	uni.navigateTo({
		url: `/pages/comments/comments?id=${marker._id}&type=marker`
	});
}

// 显示更多操作菜单
function showMoreActions(marker) {
	selectedMarker.value = marker;
	markerPopup.value.close();
	
	// 延迟打开，确保前一个弹窗已关闭
	setTimeout(() => {
		actionsPopup.value.open();
	}, 300);
}

// 关闭操作菜单
function closeActionsPopup() {
	actionsPopup.value.close();
	
	// 延迟重新打开标记弹窗
	setTimeout(() => {
		markerPopup.value.open();
	}, 300);
}

// 检查是否可以编辑
function canEdit(marker) {
	if (!marker || !userStore.userId) return false;
	return marker.userId === userStore.userId;
}

// 编辑标记
function handleEditMarker(marker) {
	if (!marker) return;
	
	closeActionsPopup();
	
	// 跳转到编辑页面
	uni.navigateTo({
		url: `/pages/marker/edit?id=${marker._id}`
	});
}
</script>

<style>
.area-marker {
	position: relative;
}

.area-overlay {
	position: absolute;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4rpx;
}

.marker-count {
	background-color: #fff;
	border-radius: 50%;
	width: 40rpx;
	height: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	color: #333;
	box-shadow: 0 2rpx 6rpx rgba(0,0,0,0.1);
}

.marker-popup {
	background-color: #fff;
	border-radius: 20rpx;
	width: 680rpx;
	max-height: 80vh;
	overflow: hidden;
}

.popup-header {
	padding: 30rpx;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-bottom: 1px solid #f0f0f0;
}

.popup-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.close-btn {
	font-size: 40rpx;
	color: #999;
	padding: 0 20rpx;
}

.marker-swiper {
	height: 800rpx;
}

.marker-detail {
	padding: 30rpx;
}

.marker-info {
	margin-bottom: 20rpx;
}

.marker-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
	display: block;
}

.marker-time {
	font-size: 24rpx;
	color: #999;
}

.image-scroll {
	width: 100%;
	white-space: nowrap;
	margin: 20rpx 0;
}

.image-list {
	display: inline-block;
}

.marker-image {
	width: 200rpx;
	height: 200rpx;
	margin-right: 20rpx;
	border-radius: 10rpx;
	display: inline-block;
}

.description-box {
	margin: 20rpx 0;
	padding: 20rpx;
	background-color: #f8f8f8;
	border-radius: 10rpx;
}

.description-text {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
}

.contact-info {
	margin: 20rpx 0;
	padding: 20rpx;
	background-color: #f8f8f8;
	border-radius: 10rpx;
}

.contact-item {
	margin-bottom: 10rpx;
}

.contact-label {
	font-size: 26rpx;
	color: #999;
}

.contact-value {
	font-size: 26rpx;
	color: #333;
}

.action-buttons {
	display: flex;
	justify-content: space-around;
	margin-top: 30rpx;
}

.action-btn {
	flex: 1;
	height: 70rpx;
	line-height: 70rpx;
	text-align: center;
	border-radius: 35rpx;
	font-size: 26rpx;
	margin: 0 10rpx;
}

.share-btn {
	background-color: #4CAF50;
	color: #fff;
}

.report-btn {
	background-color: #f5f5f5;
	color: #666;
}

.resolve-btn {
	background-color: #2196F3;
	color: #fff;
}

.popup-footer {
	padding: 20rpx;
	display: flex;
	justify-content: center;
}

.swiper-dots {
	display: flex;
	align-items: center;
}

.dot {
	width: 12rpx;
	height: 12rpx;
	border-radius: 50%;
	background-color: #ddd;
	margin: 0 6rpx;
}

.dot.active {
	background-color: #333;
}

.report-popup {
	background-color: #fff;
	border-radius: 20rpx;
	width: 600rpx;
	padding: 30rpx;
}

.report-content {
	padding: 20rpx 0;
}

.report-input {
	width: 100%;
	height: 200rpx;
	background-color: #f8f8f8;
	border-radius: 10rpx;
	padding: 20rpx;
	font-size: 28rpx;
	margin-bottom: 30rpx;
}

.submit-btn {
	width: 100%;
	height: 80rpx;
	line-height: 80rpx;
	background-color: #ff4444;
	color: #fff;
	border-radius: 40rpx;
	font-size: 28rpx;
}

.actions-menu {
	background-color: #fff;
	border-radius: 20rpx;
	padding: 20rpx;
}

.action-menu-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.action-menu-list {
	display: flex;
	flex-wrap: wrap;
}

.action-menu-item {
	width: 33.33%;
	text-align: center;
	padding: 10rpx;
}

.action-menu-cancel {
	width: 100%;
	text-align: center;
	padding: 10rpx;
	background-color: #f5f5f5;
	border-radius: 10rpx;
	margin-top: 20rpx;
}

/* 新增UI组件样式 */
.marker-scroll {
	height: 800rpx;
	padding: 20rpx;
}

.user-info-bar {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
}

.user-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	margin-right: 20rpx;
}

.user-details {
	flex: 1;
}

.user-name {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	display: block;
}

.marker-type-tag {
	padding: 4rpx 16rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
	color: #fff;
}

.marker-type-stray_dog {
	background-color: #ff9800;
}

.marker-type-lost_dog {
	background-color: #e91e63;
}

.marker-type-location {
	background-color: #4caf50;
}

.marker-type-event {
	background-color: #2196f3;
}

.marker-type-story {
	background-color: #9c27b0;
}

.marker-type-memory {
	background-color: #795548;
}

.marker-type-other {
	background-color: #607d8b;
}

.content-image-swiper {
	width: 100%;
	height: 400rpx;
	margin: 20rpx 0;
	border-radius: 12rpx;
	overflow: hidden;
}

.content-image {
	width: 100%;
	height: 250px;
	display: block;
}

.image-container {
	position: relative;
	width: 100%;
	overflow: hidden;
}

.image-caption {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	background-color: rgba(0, 0, 0, 0.5);
	color: #fff;
	padding: 8px 12px;
	font-size: 14px;
}

.content-section {
	margin: 20rpx 0;
}

.rich-content {
	font-size: 28rpx;
	line-height: 1.6;
	color: #333;
}

.tag-section {
	display: flex;
	flex-wrap: wrap;
	margin: 20rpx 0;
}

.tag-item {
	margin-right: 20rpx;
	margin-bottom: 10rpx;
	padding: 6rpx 20rpx;
	background-color: #f0f0f0;
	border-radius: 30rpx;
	font-size: 24rpx;
	color: #666;
}

.location-section {
	display: flex;
	align-items: center;
	margin: 20rpx 0;
	padding: 10rpx;
	background-color: #f8f8f8;
	border-radius: 8rpx;
}

.location-text {
	font-size: 24rpx;
	color: #666;
	margin-left: 10rpx;
}

.contact-card {
	background-color: #f8f8f8;
	border-radius: 12rpx;
	padding: 20rpx;
	margin: 20rpx 0;
}

.card-header {
	border-bottom: 1px solid #eee;
	padding-bottom: 10rpx;
	margin-bottom: 10rpx;
}

.card-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.contact-list {
	display: flex;
	flex-direction: column;
}

.contact-item {
	display: flex;
	align-items: center;
	margin: 10rpx 0;
}

.contact-icon {
	margin-right: 10rpx;
	font-size: 28rpx;
}

.contact-value {
	font-size: 26rpx;
	color: #333;
}

.stats-section {
	display: flex;
	justify-content: space-around;
	padding: 20rpx 0;
	border-top: 1px solid #f0f0f0;
	border-bottom: 1px solid #f0f0f0;
	margin: 20rpx 0;
}

.stat-item {
	display: flex;
	align-items: center;
}

.stat-item text {
	font-size: 24rpx;
	color: #666;
	margin-left: 6rpx;
}

.action-buttons {
	display: flex;
	justify-content: space-between;
	margin-top: 20rpx;
}

.action-btn {
	display: flex;
	flex-direction: column;
	align-items: center;
	background-color: transparent;
	padding: 10rpx 0;
	width: 25%;
}

.action-btn::after {
	border: none;
}

.action-btn text {
	font-size: 24rpx;
	color: #666;
	margin-top: 6rpx;
}

.like-btn.active text {
	color: #ff4757;
}

.action-menu-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx 0;
}

.action-menu-item text {
	font-size: 26rpx;
	color: #333;
	margin-top: 10rpx;
}

.action-menu-cancel {
	text-align: center;
	padding: 20rpx 0;
	font-size: 28rpx;
	color: #333;
	background-color: #f5f5f5;
	border-radius: 12rpx;
	margin-top: 20rpx;
}
</style> 