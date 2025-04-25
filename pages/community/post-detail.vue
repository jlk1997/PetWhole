<template>
	<view class="post-detail-container">
		<!-- 顶部标题栏 -->
		<view class="header">
			<view class="back-btn" @click="navBack">
				<text>返回</text>
			</view>
			<text class="title">帖子详情</text>
			<view class="placeholder"></view>
		</view>
		
		<!-- 帖子内容 -->
		<scroll-view class="post-content-scrollview" scroll-y>
			<!-- 加载中提示 -->
			<view class="loading" v-if="isLoading">
				<text>加载中...</text>
			</view>
			
			<!-- 帖子不存在提示 -->
			<view class="not-found" v-if="!isLoading && !post">
				<text>该帖子不存在或已被删除</text>
			</view>
			
			<!-- 帖子详情 -->
			<view class="post-detail" v-if="post">
				<!-- 帖子头部 -->
				<view class="post-header">
					<view class="user-info">
						<image class="user-avatar" 
							:src="formatAvatarUrl(post.user?.avatar || post.userAvatar)" 
							mode="aspectFill"
							@tap="showUserProfile(post.user || { _id: post.userId, username: post.username, avatar: post.userAvatar })"></image>
						<text class="username">{{ post.username || post.user?.username || '用户' }}</text>
					</view>
					<text class="post-time">{{ formatDate(post.time || post.createdAt) }}</text>
				</view>
				
				<!-- 帖子内容 -->
				<view class="post-content">
					<text class="post-text">{{ post.content }}</text>
					
					<!-- 遛狗记录卡片 -->
					<walk-record-card v-if="post.walkRecord" :record="post.walkRecord"></walk-record-card>
					
					<!-- 帖子图片 -->
					<view class="post-images" v-if="post.images && post.images.length > 0">
						<view class="image-container">
							<image 
								v-for="(img, index) in post.images" 
								:key="index" 
								:src="formatImageUrl(img)" 
								mode="aspectFill" 
								class="post-image"
								@click="previewImage(index)"
							></image>
						</view>
					</view>
				</view>
				
				<!-- 帖子互动区 -->
				<view class="post-actions">
					<view class="action-item" @click="likePost">
						<view class="action-icon like-icon" :class="{'active': post.isLiked}" 
							style="background-image: url('/static/images/like-icon.png'); background-size: contain; background-repeat: no-repeat;"></view>
						<text class="action-text">点赞 <text class="count">{{ getNumberValue(post.likes) }}</text></text>
					</view>
					<view class="action-item">
						<view class="action-icon comment-icon" 
							style="background-image: url('/static/images/comment-icon.png'); background-size: contain; background-repeat: no-repeat;"></view>
						<text class="action-text">评论 <text class="count">{{ getNumberValue(post.comments) }}</text></text>
					</view>
				</view>
				
				<!-- 评论区分割线 -->
				<view class="comment-divider">
					<text>评论区</text>
				</view>
				
				<!-- 评论列表 -->
				<view class="comment-list">
					<view class="no-comments" v-if="!comments || comments.length === 0">
						<text>暂无评论，快来发表第一条评论吧</text>
					</view>
					
					<view class="comment-item" v-for="(comment, index) in comments" :key="comment.id || index">
						<view class="comment-header">
							<view class="comment-user-info">
								<image class="comment-avatar" 
									:src="formatAvatarUrl(comment.user?.avatar || comment.userAvatar)" 
									mode="aspectFill"
									@tap="showUserProfile(comment.user || { _id: comment.userId, username: comment.username, avatar: comment.userAvatar })"></image>
								<text class="comment-username">{{ comment.username || comment.user?.username || '用户' }}</text>
							</view>
							<text class="comment-time">{{ formatDate(comment.time || comment.createdAt) }}</text>
						</view>
						<view class="comment-content">
							<text>{{ comment.content }}</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
		
		<!-- 底部评论输入区 -->
		<view class="comment-input-area">
			<input 
				class="comment-input" 
				v-model="commentContent" 
				placeholder="写评论..." 
				confirm-type="send"
				@confirm="submitComment"
			/>
			<view class="send-btn" @click="submitComment" :class="{ 'active': commentContent.trim() }">
				<text>发送</text>
			</view>
		</view>
		
		<!-- 图片查看器 -->
		<image-viewer 
			:show="showImageViewer" 
			:images="post?.images || []" 
			:initialIndex="currentImageIndex"
			@close="closeImageViewer"
		/>
		
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
	</view>
</template>

<script>
import WalkRecordCard from '@/components/WalkRecordCard.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import UserInfoPopup from '@/components/map/UserInfoPopup.vue';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js';

export default {
	components: {
		WalkRecordCard,
		ImageViewer,
		UserInfoPopup
	},
	data() {
		return {
			postId: '',
			post: null,
			comments: [],
			commentContent: '',
			isLoading: true,
			isSubmitting: false,
			shouldScrollToComments: false,
			showImageViewer: false,
			currentImageIndex: 0,
			// 用户信息弹窗相关状态
			showUserPopup: false,
			selectedUser: null,
			selectedUserPets: [],
			isFollowing: false
		}
	},
	
	onLoad(options) {
		// 获取帖子ID
		if (options && options.id) {
			this.postId = options.id;
			
			// 检查是否有从列表页传递来的帖子数据缓存Key
			if (options.postKey) {
				try {
					const postDataStr = uni.getStorageSync(options.postKey);
					if (postDataStr) {
						// 尝试解析保存的帖子数据
						const postData = JSON.parse(postDataStr);
						if (postData) {
							console.log('从缓存获取帖子数据:', postData);
							// 直接使用缓存中的数据
							this.post = postData;
							
							// 确保帖子有必要的字段
							if (this.post.isLiked === undefined) this.post.isLiked = false;
							if (this.post.likes === undefined) this.post.likes = 0;
							if (this.post.comments === undefined) this.post.comments = 0;
							
							// 标记加载完成
							this.isLoading = false;
							
							// 只加载评论，不再重新加载帖子详情
							this.loadComments();
							return;
						}
					}
				} catch (e) {
					console.error('解析缓存的帖子数据失败:', e);
				}
			}
			
			// 检查是否需要自动滚动到评论区
			if (options.showComments === 'true') {
				this.shouldScrollToComments = true;
			}
			
			// 如果没有缓存数据或解析失败，则通过API加载
			this.loadPostDetail();
			// 加载评论
			this.loadComments();
		} else {
			uni.showToast({
				title: '未找到帖子',
				icon: 'none'
			});
			
			setTimeout(() => {
				uni.navigateBack();
			}, 1500);
		}
	},
	
	onReady() {
		// 如果需要滚动到评论区，等待页面渲染完成后执行
		if (this.shouldScrollToComments) {
			setTimeout(() => {
				const commentSelector = uni.createSelectorQuery().in(this);
				commentSelector.select('.comment-divider').boundingClientRect(data => {
					if (data) {
						uni.pageScrollTo({
							scrollTop: data.top,
							duration: 300
						});
					}
				}).exec();
			}, 500);
		}
	},
	
	methods: {
		// 获取数字值
		getNumberValue(value) {
			if (Array.isArray(value)) {
				return value.length;
			} else if (typeof value === 'number') {
				return value;
			} else if (value && typeof value === 'object') {
				return Object.keys(value).length;
			} else {
				return 0;
			}
		},
		
		// 格式化时长
		formatDuration(seconds) {
			if (!seconds) return '0分钟';
			
			const hours = Math.floor(seconds / 3600);
			const minutes = Math.floor((seconds % 3600) / 60);
			
			let result = '';
			if (hours > 0) {
				result += `${hours}小时`;
				if (minutes > 0) {
					result += `${minutes}分钟`;
				}
			} else {
				result += `${minutes}分钟`;
			}
			
			return result;
		},
		
		// 返回上一页
		navBack() {
			uni.navigateBack();
		},
		
		// 格式化日期
		formatDate(dateStr) {
			if (!dateStr) return '';
			
			// 如果已经是格式化的日期字符串（如"1小时前"）
			if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes('-')) {
				return dateStr;
			}
			
			try {
				const date = new Date(dateStr);
				const now = new Date();
				const diff = Math.floor((now - date) / 1000); // 差异秒数
				
				if (diff < 60) {
					return '刚刚';
				} else if (diff < 3600) {
					return Math.floor(diff / 60) + '分钟前';
				} else if (diff < 86400) {
					return Math.floor(diff / 3600) + '小时前';
				} else if (diff < 2592000) {
					return Math.floor(diff / 86400) + '天前';
				} else {
					// 格式化为年月日
					return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
				}
			} catch (e) {
				console.error('日期格式化错误:', e);
				return dateStr;
			}
		},
		
		// 预览图片
		previewImage(index) {
			this.currentImageIndex = index;
			this.showImageViewer = true;
		},
		
		// 关闭图片查看器
		closeImageViewer() {
			this.showImageViewer = false;
		},
		
		// 显示用户信息弹窗
		async showUserProfile(user) {
			console.log('显示用户信息:', user);
			if (!user || !user._id) {
				console.error('无效的用户信息');
				uni.showToast({
					title: '无法获取用户信息',
					icon: 'none'
				});
				return;
			}
			
			// 获取用户store
			const userStore = useUserStore();
			
			// 检查是否是自己
			const isSelf = userStore.isAuthenticated && userStore.userId === user._id;
			
			// 设置初始状态
			this.selectedUser = {
				...user,
				isCurrentUser: isSelf
			};
			
			// 初始化关注状态为false
			this.isFollowing = false;
			
			// 如果是已登录状态且不是自己，直接使用API检查关注状态
			if (userStore.isAuthenticated && !isSelf) {
				try {
					console.log('直接调用checkFollowStatus检查关注状态，用户ID:', user._id);
					const followStatus = await api.user.checkFollowStatus(user._id);
					
					if (followStatus && followStatus.isFollowing !== undefined) {
						this.isFollowing = followStatus.isFollowing;
						console.log('API返回的关注状态:', this.isFollowing);
					}
				} catch (error) {
					console.error('检查关注状态失败:', error);
					
					// 检查失败时，尝试从用户对象获取关注状态
					if (user.isFollowing !== undefined) {
						this.isFollowing = user.isFollowing;
						console.log('从用户对象获取关注状态:', this.isFollowing);
					}
				}
			}
			
			console.log('初始关注状态设置为:', this.isFollowing);
			
			// 获取宠物和关注状态
			if (userStore.isAuthenticated) {
				try {
					// 获取用户完整信息
					let userDetails = null;
					
					try {
						console.log('尝试获取用户详情，ID:', user._id);
						// 尝试获取用户信息
						userDetails = await api.user.getUserById(user._id);
						console.log('获取用户详情成功:', userDetails);
						
						// 如果API返回了关注状态，但与我们之前检测到的不同
						if (userDetails && userDetails.isFollowing !== undefined) {
							// 如果任一一个来源显示已关注，就认为是已关注
							this.isFollowing = this.isFollowing || userDetails.isFollowing;
							console.log('综合考虑后的关注状态:', this.isFollowing);
						}
					} catch (userError) {
						console.error('获取用户详情失败, 使用基本信息:', userError);
						// 使用传入的基本用户信息
						userDetails = {
							...user,
							nickname: user.nickname || user.username || '用户',
							bio: user.bio || '这位用户还没有个人简介'
						};
						
						// 显示错误提示
						uni.showToast({
							title: '获取用户详情失败',
							icon: 'none',
							duration: 1500
						});
					}
					
					if (userDetails) {
						// 自己不能关注自己
						if (isSelf) {
							this.isFollowing = false;
						}
						
						// 确保在更新完isFollowing后再更新selectedUser
						this.selectedUser = {
							...userDetails,
							isCurrentUser: isSelf,
							// 确保用户对象中有isFollowing属性
							isFollowing: this.isFollowing
						};
						
						console.log('更新后的selectedUser和isFollowing:', this.selectedUser, this.isFollowing);
						
						// 获取该用户的宠物列表
						try {
							console.log('尝试获取用户宠物列表，用户ID:', user._id);
							const pets = await api.user.getPetsByUser(user._id);
							console.log('获取到的宠物列表:', pets);
							this.selectedUserPets = pets || [];
						} catch (petError) {
							console.error('获取宠物列表失败:', petError);
							this.selectedUserPets = [];
						}
					}
				} catch (error) {
					console.error('获取用户信息处理过程出错:', error);
					
					// 使用基本用户数据
					this.selectedUser = {
						...user,
						isCurrentUser: isSelf,
						isFollowing: this.isFollowing
					};
					
					// 显示错误提示
					uni.showToast({
						title: '获取用户详情失败',
						icon: 'none'
					});
				}
			}
			
			console.log('最终显示的用户信息和关注状态:', {
				user: this.selectedUser,
				isFollowing: this.isFollowing,
				pets: this.selectedUserPets
			});
			
			this.showUserPopup = true;
		},
		
		// 关闭用户信息弹窗
		closeUserPopup() {
			this.showUserPopup = false;
			this.selectedUser = null;
			this.selectedUserPets = [];
		},
		
		// 向用户发送消息
		messageUser(user) {
			// 消息功能实现
			console.log('向用户发送消息:', user);
		},
		
		// 关注/取消关注用户
		async followUser(user) {
			const userStore = useUserStore();
			
			if (!userStore.isAuthenticated) {
				uni.navigateTo({
					url: '/pages/login/login'
				});
				return;
			}
			
			if (!user || !user._id) {
				console.error('无效的用户信息');
				return;
			}
			
			try {
				const result = await api.user.followUser(user._id);
				
				if (result && result.isFollowing !== undefined) {
					this.isFollowing = result.isFollowing;
					
					// 更新用户对象以保持一致性
					if (this.selectedUser) {
						this.selectedUser.isFollowing = this.isFollowing;
					}
					
					// 显示提示
					uni.showToast({
						title: this.isFollowing ? '关注成功' : '取消关注成功',
						icon: 'success'
					});
					
					// 获取最新的用户统计信息
					await userStore.fetchUserStats();
				}
			} catch (error) {
				console.error('关注用户操作失败:', error);
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		},
		
		// 格式化头像URL
		formatAvatarUrl(url) {
			if (!url) return '/static/images/default-avatar.png';
			
			// 检查URL是否已经是完整URL或静态资源路径
			if (url.startsWith('http') || url.startsWith('/static')) {
				return url;
			}
			
			// 如果是相对路径（如/uploads/avatars/xxx），补充基础URL
			if (url.startsWith('/uploads')) {
				// 在实际环境中获取BASE_URL
				const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
				console.log('处理相对路径头像URL:', url, '补充基础URL:', BASE_URL);
				return BASE_URL + url;
			}
			
			// 从用户对象中获取头像
			if (typeof url === 'object' && url.avatar) {
				return this.formatAvatarUrl(url.avatar);
			}
			
			// 如果是其他情况，使用默认头像
			console.warn('未能识别的头像URL格式:', url);
			return '/static/images/default-avatar.png';
		},
		
		// 格式化图片URL
		formatImageUrl(url) {
			if (!url) return '/static/images/default-pet.png';
			
			console.log('帖子详情页处理图片URL:', url);
			
			// 检查URL是否已经是完整URL或静态资源路径
			if (url.startsWith('http') || url.startsWith('/static') || url.startsWith('blob:')) {
				console.log('返回原始URL:', url);
				return url;
			}
			
			// 如果是相对路径，补充基础URL
			if (url.startsWith('/uploads')) {
				const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://localhost:5000';
				const fullUrl = BASE_URL + url;
				console.log('处理相对路径图片URL:', url, '补充基础URL:', BASE_URL, '完整URL:', fullUrl);
				return fullUrl;
			}
			
			// 如果是其他情况，使用默认图片
			console.warn('未能识别的图片URL格式:', url);
			return '/static/images/default-pet.png';
		},
		
		// 加载帖子详情
		async loadPostDetail() {
			this.isLoading = true;
			
			try {
				// 使用正确的API引用
				const communityApi = uni.$api.community;
				
				// 检查API是否可用
				if (!communityApi) {
					throw new Error('社区API未初始化');
				}
				
				try {
					// 请求帖子详情
					console.log('尝试加载帖子详情, ID:', this.postId);
					const response = await communityApi.getPostDetail(this.postId);
					
					if (response) {
						console.log('获取到帖子详情:', response);
						
						// 确保帖子有isLiked属性
						if (response.isLiked === undefined) {
							response.isLiked = false;
						}
						
						// 确保帖子有likes和comments属性
						if (response.likes === undefined) response.likes = 0;
						if (response.comments === undefined) response.comments = 0;
						
						// 解析帖子内容中的遛狗记录
						this.post = this.parseWalkRecordFromContent(response);
						console.log('处理后的帖子详情:', this.post);
					} else {
						throw new Error('获取帖子详情失败：空响应');
					}
				} catch (error) {
					console.error('获取帖子详情失败:', error);
					
					uni.showToast({
						title: '加载失败，请稍后再试',
						icon: 'none',
						duration: 2000
					});
					
					// 允许用户返回
					setTimeout(() => {
						uni.navigateBack();
					}, 2000);
				}
			} catch (error) {
				console.error('加载帖子详情过程中发生错误:', error);
				
				uni.showToast({
					title: '加载失败，请稍后再试',
					icon: 'none',
					duration: 2000
				});
				
				// 允许用户返回
				setTimeout(() => {
					uni.navigateBack();
				}, 2000);
			} finally {
				this.isLoading = false;
			}
		},
		
		// 解析帖子内容中的遛狗记录
		parseWalkRecordFromContent(post) {
			// 如果已经有walkRecord对象，直接返回原帖子
			if (post.walkRecord) return post;
			
			// 匹配常见的遛狗记录文本模式
			const distanceRegex = /遛了\s*(\d+\.?\d*)\s*公里/;
			const durationRegex = /用时\s*(\d+)\s*(秒|分钟|小时)/;
			const petNameRegex = /和\s*([^\s,，。！]+)\s*一起遛/;
			
			const content = post.content || '';
			let walkRecord = null;
			
			// 提取距离
			const distanceMatch = content.match(distanceRegex);
			const distance = distanceMatch ? parseFloat(distanceMatch[1]) * 1000 : null; // 转换为米
			
			// 提取时长
			const durationMatch = content.match(durationRegex);
			let duration = null;
			if (durationMatch) {
				const value = parseInt(durationMatch[1]);
				const unit = durationMatch[2];
				
				if (unit === '秒') {
					duration = value;
				} else if (unit === '分钟') {
					duration = value * 60;
				} else if (unit === '小时') {
					duration = value * 3600;
				}
			}
			
			// 提取宠物名称
			const petNameMatch = content.match(petNameRegex);
			const petName = petNameMatch ? petNameMatch[1] : '我的宠物';
			
			// 如果有足够信息，创建walkRecord对象
			if (distance !== null || duration !== null) {
				walkRecord = {
					_id: `generated_${post._id || post.id || Date.now()}`,
					distance: distance || 0,
					duration: duration || 0,
					pet: {
						name: petName
					},
					// 添加当前时间作为开始时间
					startTime: post.createdAt || post.time || new Date().toISOString()
				};
				
				// 创建一个新的帖子对象，包含walkRecord
				return {
					...post,
					walkRecord
				};
			}
			
			return post;
		},
		
		// 加载评论
		async loadComments() {
			try {
				// 检查API是否可用
				if (!uni.$api || !uni.$api.community) {
					console.error('社区API未初始化');
					this.comments = [];
					return;
				}
				
				// 显示加载中状态
				uni.showLoading({
					title: '加载评论...'
				});
				
				try {
					// 请求评论列表
					console.log('尝试加载评论, 帖子ID:', this.postId);
					const response = await uni.$api.community.getComments(this.postId, {
						limit: 50 // 获取50条评论
					});
					
					if (response && (response.data || Array.isArray(response))) {
						// 确保评论列表是数组
						const commentsList = Array.isArray(response) ? response : 
										  Array.isArray(response.data) ? response.data : [];
						
						console.log('评论列表:', commentsList);
						this.comments = commentsList;
					} else {
						// 没有评论或返回为空
						console.log('没有找到评论或返回为空');
						this.comments = [];
					}
				} catch (error) {
					console.error('获取评论失败:', error);
					this.comments = [];
				} finally {
					// 隐藏加载中状态
					uni.hideLoading();
				}
			} catch (error) {
				console.error('加载评论过程中发生错误:', error);
				uni.hideLoading();
				this.comments = [];
			}
		},
		
		// 点赞帖子
		async likePost() {
			if (!this.post) return;
			
			try {
				// 乐观更新UI
				this.post.isLiked = !this.post.isLiked;
				this.post.likes = this.post.isLiked
					? (this.post.likes || 0) + 1
					: Math.max((this.post.likes || 1) - 1, 0);
				
				// 使用正确的API引用
				const communityApi = uni.$api.community;
				
				// 检查API是否可用
				if (!communityApi) {
					throw new Error('社区API未初始化');
				}
				
				// 统一使用likePost方法，传递isLike参数
				await communityApi.likePost(this.postId, this.post.isLiked);
				
				uni.showToast({
					title: this.post.isLiked ? '点赞成功' : '已取消点赞',
					icon: 'none'
				});
				return; // 显式返回空值
			} catch (error) {
				console.error('点赞操作失败:', error);
				
				// 失败时回滚UI
				this.post.isLiked = !this.post.isLiked;
				this.post.likes = this.post.isLiked
					? (this.post.likes || 0) + 1
					: Math.max((this.post.likes || 1) - 1, 0);
				
				uni.showToast({
					title: '操作失败',
					icon: 'none'
				});
				return; // 显式返回空值
			}
		},
		
		// 提交评论
		async submitComment() {
			if (!this.commentContent.trim() || this.isSubmitting) return;
			
			this.isSubmitting = true;
			
			try {
				// 检查API是否可用
				if (!uni.$api || !uni.$api.community) {
					throw new Error('社区API未初始化');
				}
				
				// 调用API提交评论
				await uni.$api.community.addComment(this.postId, {
					content: this.commentContent
				});
				
				// 清空输入
				this.commentContent = '';
				
				// 刷新评论列表
				this.loadComments();
				
				// 更新评论数
				if (this.post) {
					this.post.comments = (this.post.comments || 0) + 1;
				}
				
				uni.showToast({
					title: '评论成功',
					icon: 'success'
				});
			} catch (error) {
				console.error('提交评论失败:', error);
				
				uni.showToast({
					title: '评论失败，请稍后再试',
					icon: 'none'
				});
			} finally {
				this.isSubmitting = false;
			}
		},
		
		// 查看遛狗记录详情
		viewWalkRecord() {
			if (!this.post || !this.post.walkRecord || !this.post.walkRecord._id) {
				uni.showToast({
					title: '遛狗记录不存在',
					icon: 'none'
				});
				return;
			}
			
			console.log('查看遛狗记录详情:', this.post.walkRecord);
			
			// 检查是否是生成的记录ID
			const recordId = this.post.walkRecord._id;
			if (recordId.startsWith('generated_')) {
				// 对于从帖子内容解析出的遛狗记录，显示提示
				uni.showToast({
					title: '这是从动态内容解析的遛狗记录，无法查看详情',
					icon: 'none',
					duration: 2500
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

<style>
.post-detail-container {
	height: 100vh;
	background-color: #f5f5f5;
	display: flex;
	flex-direction: column;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: #fff;
	border-bottom: 1px solid #eee;
}

.back-btn {
	font-size: 28rpx;
	color: #333;
}

.placeholder {
	width: 60rpx;
}

.title {
	font-size: 32rpx;
	font-weight: bold;
}

.post-content-scrollview {
	flex: 1;
	background-color: #f5f5f5;
}

.loading, .not-found {
	padding: 60rpx;
	text-align: center;
	color: #999;
}

.post-detail {
	background-color: #fff;
	padding: 30rpx;
}

.post-header, .comment-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.user-info, .comment-user-info {
	display: flex;
	align-items: center;
}

.user-avatar, .comment-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	margin-right: 20rpx;
	background-color: #eee;
}

.comment-avatar {
	width: 60rpx;
	height: 60rpx;
}

.username, .comment-username {
	font-size: 28rpx;
	color: #333;
}

.post-time, .comment-time {
	font-size: 24rpx;
	color: #999;
}

.post-content {
	margin-bottom: 30rpx;
}

.post-text {
	font-size: 30rpx;
	line-height: 1.6;
	margin-bottom: 20rpx;
	word-break: break-all;
}

/* 遛狗记录卡片样式 */
.walk-record {
	margin: 20rpx 0 30rpx;
	padding: 20rpx;
	border-radius: 16rpx;
	background-color: #f8fdfa;
	border: 1px solid #e0f5e9;
	box-shadow: 0 2rpx 8rpx rgba(76, 217, 100, 0.1);
	position: relative;
	overflow: hidden;
	transition: all 0.3s ease;
}

.walk-record::after {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0, 0, 0, 0.03);
	opacity: 0;
	transition: opacity 0.2s;
}

.walk-record:active::after {
	opacity: 1;
}

.walk-header {
	display: flex;
	align-items: center;
	margin-bottom: 16rpx;
	border-bottom: 1px dashed #e0f5e9;
	padding-bottom: 16rpx;
}

.walk-icon {
	font-size: 36rpx;
	margin-right: 15rpx;
	color: #4CD964;
}

.walk-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #4CD964;
}

.walk-stats {
	display: flex;
	align-items: center;
	margin-bottom: 12rpx;
	background-color: #f0f9f2;
	padding: 8rpx 12rpx;
	border-radius: 8rpx;
	display: inline-flex;
	width: fit-content;
}

.walk-stat {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
}

.walk-divider {
	margin: 0 10rpx;
	color: #ccc;
}

.walk-date {
	font-size: 24rpx;
	color: #666;
	margin-top: 8rpx;
}

.walk-pet {
	margin-top: 12rpx;
}

.pet-info {
	display: flex;
	align-items: center;
	background-color: #f9f9f9;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
	width: fit-content;
}

.pet-avatar {
	width: 50rpx;
	height: 50rpx;
	border-radius: 50%;
	margin-right: 10rpx;
	background-color: #f0f0f0;
	border: 1px solid #eee;
}

.walk-trace {
	margin-top: 12rpx;
}

.route-snapshot {
	width: 100%;
	height: 160rpx;
	border-radius: 8rpx;
	border: 1px solid #eee;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

/* 图片样式优化 */
.post-images {
	margin-top: 20rpx;
}

.image-container {
	display: flex;
	flex-wrap: wrap;
	gap: 10rpx;
}

.post-image {
	width: 220rpx;
	height: 220rpx;
	border-radius: 10rpx;
	background-color: #f0f0f0;
	object-fit: cover;
}

/* 图片点击状态 */
.post-image:active {
	opacity: 0.8;
	transform: scale(0.98);
}

/* 当只有一张图片时，显示更大 */
.image-container:has(.post-image:only-child) .post-image {
	width: 100%;
	height: 400rpx;
}

.post-actions {
	display: flex;
	border-top: 1px solid #f0f0f0;
	padding-top: 20rpx;
}

.action-item {
	display: flex;
	align-items: center;
	margin-right: 40rpx;
}

.action-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 10rpx;
	opacity: 0.7;
}

.action-icon.active {
	opacity: 1;
}

.action-text {
	font-size: 26rpx;
	color: #666;
}

.count {
	color: #333;
}

.comment-divider {
	padding: 20rpx 0;
	font-size: 28rpx;
	color: #333;
	font-weight: bold;
	border-bottom: 1px solid #f0f0f0;
	margin-bottom: 20rpx;
}

.comment-list {
	margin-bottom: 40rpx;
}

.no-comments {
	padding: 30rpx 0;
	text-align: center;
	color: #999;
	font-size: 26rpx;
}

.comment-item {
	padding: 20rpx 0;
	border-bottom: 1px solid #f5f5f5;
}

.comment-content {
	font-size: 28rpx;
	line-height: 1.5;
	color: #333;
	padding: 0 0 0 80rpx;
	word-break: break-all;
}

.comment-input-area {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #fff;
	border-top: 1px solid #eee;
}

.comment-input {
	flex: 1;
	height: 70rpx;
	background-color: #f5f5f5;
	border-radius: 35rpx;
	padding: 0 30rpx;
	font-size: 28rpx;
}

.send-btn {
	width: 100rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	margin-left: 20rpx;
	border-radius: 30rpx;
	background-color: #eee;
	color: #999;
}

.send-btn.active {
	background-color: #07c160;
	color: #fff;
}

.walk-view-details {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	margin-top: 12rpx;
	padding-top: 8rpx;
	border-top: 1px dashed #e0f5e9;
	font-size: 24rpx;
	color: #3B9E82;
	font-weight: bold;
}

.walk-view-details .arrow {
	margin-left: 6rpx;
}
</style> 