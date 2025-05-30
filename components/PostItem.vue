<template>
	<view class="post-item">
		<view class="post-header">
			<image class="user-avatar" :src="post.creator?.avatar || '/static/images/default-avatar.png'" @click="navigateToUser(post.creator?._id)" mode="aspectFill"></image>
			<view class="user-info">
				<view class="username" @click="navigateToUser(post.creator?._id)">{{ post.creator?.nickname || '用户' }}</view>
				<view class="post-time">{{ formatTime(post.createdAt) }}</view>
			</view>
			<view class="post-actions">
				<uni-icons v-if="isCurrentUser" type="more-filled" size="24" color="#666" @click="showActions"></uni-icons>
			</view>
		</view>
		
		<view class="post-content" @click="navigateToDetail">
			<text class="content-text">{{ post.content }}</text>
		</view>
		
		<!-- 遛狗记录卡片 -->
		<walk-record-card v-if="post.walkRecord" :record="post.walkRecord" @click.stop="viewWalkRecord"></walk-record-card>
		
		<view class="post-images" v-if="post.images && post.images.length > 0" @click="previewImages">
			<view class="image-container" 
				:class="{'single-image': post.images.length === 1, 'multiple-images': post.images.length > 1}">
				<image 
					v-for="(img, index) in post.images" 
					:key="index" 
					:src="formatImageUrl(img)" 
					mode="aspectFill" 
					class="post-image"
					:class="{'single': post.images.length === 1}"
					@click.stop="previewImages(index)">
				</image>
			</view>
		</view>
		
		<view class="post-footer">
			<view class="post-action like" @click="toggleLike">
				<uni-icons :type="post.isLiked ? 'heart-filled' : 'heart'" size="20" :color="post.isLiked ? '#FF6B6B' : '#666'"></uni-icons>
				<text :class="{'liked': post.isLiked}">{{ post.likes || 0 }}</text>
			</view>
			<view class="post-action comment" @click="navigateToDetail">
				<uni-icons type="chatbubble" size="20" color="#666"></uni-icons>
				<text>{{ post.comments || 0 }}</text>
			</view>
			<view class="post-action share" @click="sharePost">
				<uni-icons type="redo" size="20" color="#666"></uni-icons>
				<text>分享</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { formatDistanceToNow } from 'date-fns';
	import { zhCN } from 'date-fns/locale';
	import WalkRecordCard from './WalkRecordCard.vue';
	
	export default {
		name: 'PostItem',
		components: {
			WalkRecordCard
		},
		props: {
			post: {
				type: Object,
				required: true
			},
			isCurrentUser: {
				type: Boolean,
				default: false
			}
		},
		methods: {
			formatTime(timestamp) {
				if (!timestamp) return '刚刚';
				try {
					const date = new Date(timestamp);
					return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
				} catch (e) {
					console.error('格式化时间错误:', e);
					return '刚刚';
				}
			},
			formatDuration(seconds) {
				if (!seconds) return '0分钟';
				const hours = Math.floor(seconds / 3600);
				const minutes = Math.floor((seconds % 3600) / 60);
				
				if (hours > 0) {
					return `${hours}小时${minutes > 0 ? minutes + '分钟' : ''}`;
				} else {
					return `${minutes}分钟`;
				}
			},
			formatImageUrl(url) {
				if (!url) return '/static/images/default-pet.png';
				
				// 检查URL是否已经是完整URL或静态资源路径
				if (url.startsWith('http') || url.startsWith('/static') || url.startsWith('blob:')) {
					return url;
				}
				
				// 如果是相对路径，补充基础URL
				if (url.startsWith('/uploads')) {
					const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
					return BASE_URL + url;
				}
				
				// 如果是其他情况，使用默认图片
				return '/static/images/default-pet.png';
			},
			navigateToDetail() {
				uni.navigateTo({
					url: `/pages/community/post-detail?id=${this.post._id}`
				});
			},
			navigateToUser(userId) {
				if (!userId) return;
				uni.navigateTo({
					url: `/pages/user/profile?id=${userId}`
				});
			},
			toggleLike() {
				this.$emit('like', this.post._id, !this.post.isLiked);
			},
			previewImages(index = 0) {
				if (!this.post.images || this.post.images.length === 0) return;
				
				// 格式化所有图片URL
				const formattedUrls = this.post.images.map(img => this.formatImageUrl(img));
				
				uni.previewImage({
					current: formattedUrls[index],
					urls: formattedUrls,
					indicator: 'number',
					loop: true,
					fail: (err) => {
						console.error('预览图片失败:', err);
						uni.showToast({
							title: '预览图片失败',
							icon: 'none'
						});
					}
				});
			},
			showActions() {
				uni.showActionSheet({
					itemList: ['删除'],
					success: (res) => {
						if (res.tapIndex === 0) {
							// 删除操作
							this.$emit('delete', this.post._id);
						}
					}
				});
			},
			sharePost() {
				uni.showToast({
					title: '分享功能开发中',
					icon: 'none'
				});
			},
			viewWalkRecord() {
				if (!this.post.walkRecord || !this.post.walkRecord._id) {
					uni.showToast({
						title: '遛狗记录不存在',
						icon: 'none'
					});
					return;
				}
				
				// 导航到遛狗记录详情页
				uni.navigateTo({
					url: `/pages/walk/detail?id=${this.post.walkRecord._id}`,
					fail: (err) => {
						console.error('打开遛狗记录详情失败:', err);
						uni.showToast({
							title: '无法查看遛狗记录',
							icon: 'none'
						});
					}
				});
			}
		}
	}
</script>

<style lang="scss" scoped>
	.post-item {
		background-color: #fff;
		padding: 16rpx;
		margin-bottom: 16rpx;
		border-radius: 12rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
	}
	
	.post-header {
		display: flex;
		align-items: center;
		margin-bottom: 16rpx;
	}
	
	.user-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		margin-right: 16rpx;
	}
	
	.user-info {
		flex: 1;
	}
	
	.username {
		font-size: 30rpx;
		font-weight: bold;
		color: #333;
	}
	
	.post-time {
		font-size: 24rpx;
		color: #999;
		margin-top: 4rpx;
	}
	
	.post-actions {
		padding: 0 10rpx;
	}
	
	.post-content {
		margin-bottom: 16rpx;
	}
	
	.content-text {
		font-size: 28rpx;
		color: #333;
		line-height: 1.5;
		word-break: break-all;
	}
	
	.post-images {
		margin-top: 16rpx;
		margin-bottom: 16rpx;
	}
	
	.image-container {
		display: flex;
		flex-wrap: wrap;
	}
	
	.post-image {
		width: 220rpx;
		height: 220rpx;
		margin-right: 10rpx;
		margin-bottom: 10rpx;
		border-radius: 8rpx;
		background-color: #f5f5f5;
		
		&.single {
			width: 400rpx;
			height: 400rpx;
			margin-right: 0;
		}
	}
	
	.post-footer {
		display: flex;
		margin-top: 20rpx;
		padding-top: 16rpx;
		border-top: 1rpx solid #f5f5f5;
	}
	
	.post-action {
		display: flex;
		align-items: center;
		margin-right: 40rpx;
		
		text {
			font-size: 24rpx;
			color: #666;
			margin-left: 8rpx;
			
			&.liked {
				color: #FF6B6B;
			}
		}
	}
</style> 