<template>
	<view class="community-container">
		<!-- 顶部标题栏 -->
		<view class="header">
			<text class="title">社区动态</text>
			<view class="create-post-btn" @click="navToCreate">
				<text class="create-icon">+</text>
				<text class="create-text">发布</text>
			</view>
		</view>
		
		<!-- Tab切换 -->
		<view class="tabs">
			<view 
				class="tab-item" 
				v-for="(tab, index) in tabs" 
				:key="index"
				:class="{ active: currentTab === index }"
				@click="switchTab(index)"
			>
				<text>{{ tab }}</text>
			</view>
		</view>
		
		<!-- 帖子列表 -->
		<view class="list-container">
			<scroll-view 
				class="post-list" 
				scroll-y="true"
				@scrolltolower="loadMore"
			>
				<view class="no-posts" v-if="posts && posts.length === 0 && !isLoading">
					<text v-if="currentTab === 0">暂时没有动态，快去发布一条吧！</text>
					<text v-else>暂时没有动态，快去关注更多狗友吧！</text>
				</view>
				
				<!-- 帖子项 -->
				<view 
					class="post-item" 
					v-for="(post, index) in posts" 
					:key="post.id || post._id" 
					@tap="viewPostDetail(post)"
				>
					<view class="post-header">
						<view class="user-info">
							<image class="user-avatar" 
								:src="formatAvatarUrl(post.user?.avatar || post.userAvatar)" 
								mode="aspectFill"
								@tap.stop="showUserProfile(post.user || { _id: post.userId, username: post.username, avatar: post.userAvatar })"
								@error="handleAvatarError($event, index)"></image>
							<text class="username">{{ post.user?.username || post.username || '用户' }}</text>
						</view>
						<text class="post-time">{{ formatDate(post.createdAt || post.time) }}</text>
					</view>
					
					<view class="post-content">
						<text class="post-text">{{ truncateText(post.content, 40) }}</text>
						
						<!-- 遛狗记录卡片 -->
						<walk-record-card v-if="post.walkRecord" :record="post.walkRecord"></walk-record-card>
						
						<!-- 帖子图片 -->
						<view class="post-images" v-if="post.images && post.images.length > 0">
							<image 
								v-for="(img, imgIndex) in post.images.slice(0, 3)" 
								:key="imgIndex" 
								:src="formatImageUrl(img)" 
								mode="aspectFill" 
								class="post-image"
								:class="{'single-image': post.images.length === 1}"
								@tap.stop="previewImage(post, imgIndex)"
							></image>
							<view class="more-images" v-if="post.images.length > 3">
								<text>+{{ post.images.length - 3 }}</text>
							</view>
						</view>
					</view>
					
					<view class="post-footer">
						<view class="action-item" @tap.stop="likePost(post, index)">
							<view class="action-icon like-icon" :class="{'active': post.isLiked}"></view>
							<text class="action-text">点赞 {{ getNumberValue(post.likes) }}</text>
						</view>
						<view class="action-item" @tap.stop="viewComments(post)">
							<view class="action-icon comment-icon"></view>
							<text class="action-text">评论 {{ getNumberValue(post.comments) }}</text>
						</view>
					</view>
				</view>
			</scroll-view>
			
			<view class="loading-more" v-if="isLoading">
				<text>加载中...</text>
			</view>
		</view>
		
		<!-- 悬浮创建按钮 -->
		<view class="float-btn" @tap="navToCreate">
			<text class="float-icon">+</text>
		</view>
		
		<!-- 图片查看器 -->
		<image-viewer 
			:show="showImageViewer" 
			:images="currentPost?.images || []" 
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
import { ref, onMounted, getCurrentInstance } from 'vue';
import WalkRecordCard from '@/components/WalkRecordCard.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import UserInfoPopup from '@/components/map/UserInfoPopup.vue';
import { useUserStore } from '@/store/user.js';
import api from '@/utils/api.js'; // 正确导入API

export default {
	components: {
		WalkRecordCard,
		ImageViewer,
		UserInfoPopup
	},
	data() {
		return {
			scrollHeight: 0,
			navHeight: 110 // 导航和标签栏的默认高度
		}
	},
	setup() {
		// 使用导入的API对象
		const communityApi = api.community;
		const userStore = useUserStore();
		
		const tabs = ['推荐', '关注'];
		const currentTab = ref(0);
		const isLoading = ref(false);
		const isRefreshing = ref(false); // 添加下拉刷新状态
		const lastPublishTime = ref(0); // 记录最后发帖时间，用于判断是否需要刷新
		const showImageViewer = ref(false);
		const currentImageIndex = ref(0);
		const currentPost = ref(null);
		
		// 帖子数据，初始化为空数组
		const posts = ref([]);
		
		// 用户信息弹窗相关状态
		const showUserPopup = ref(false);
		const selectedUser = ref(null);
		const selectedUserPets = ref([]);
		const isFollowing = ref(false);
		
		// 解析帖子内容中的遛狗记录
		const parseWalkRecordFromContent = (post) => {
			// 如果已经有walkRecord对象，直接返回原帖子
			if (post.walkRecord) return post;
			
			// 匹配常见的遛狗记录文本模式
			// 例如: "我和xxx一起遛了0.00公里，用时5秒" 或 "遛了x.xx公里，用时xx分钟" 等
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
		};
		
		// 处理帖子列表，为每个帖子解析遛狗记录信息
		const processPostsData = (postsData) => {
			if (!postsData || !Array.isArray(postsData)) return [];
			
			return postsData.map(post => parseWalkRecordFromContent(post));
		};
		
		// 获取数字值
		const getNumberValue = (value) => {
			if (Array.isArray(value)) {
				return value.length;
			} else if (typeof value === 'number') {
				return value;
			} else if (value && typeof value === 'object') {
				return Object.keys(value).length;
			} else {
				return 0;
			}
		};
		
		// 格式化时长显示
		const formatDuration = (seconds) => {
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
		};
		
		// 下拉刷新处理
		const onRefresh = () => {
			console.log('触发下拉刷新');
			isRefreshing.value = true;
			loadPosts(true).finally(() => {
				setTimeout(() => {
					isRefreshing.value = false;
				}, 300);
			});
		};
		
		// 切换分类Tab
		const switchTab = (index) => {
			if (currentTab.value === index) {
				// 如果点击当前已选择的标签，则刷新内容
				loadPosts(true);
				return;
			}
			
			currentTab.value = index;
			loadPosts(true); // 添加true参数表示这是一个新的加载，应该清空现有数据
		};
		
		// 加载帖子
		const loadPosts = async (isFresh = false) => {
			if (isLoading.value) return;
			
			isLoading.value = true;
			
			// 如果是刷新加载，则清空现有数据
			if (isFresh) {
				posts.value = [];
			}
			
			try {
				// 检查API是否存在
				if (!communityApi) {
					console.error('社区API未找到，显示默认数据');
					showDefaultPosts();
					return;
				}
				
				console.log('加载帖子类型:', currentTab.value === 0 ? 'recommended' : 'following');
				
				// 从API获取帖子
				const response = await communityApi.getPosts({
					type: currentTab.value === 0 ? 'recommended' : 'following',
					limit: 20
				});
				
				if (response && (response.data || Array.isArray(response))) {
					// 处理不同的返回数据格式
					const postsData = response.data || response;
					
					// 如果后端还未准备就绪，添加一些模拟数据
					if (!postsData || postsData.length === 0) {
						if (currentTab.value === 0) {
							// 推荐标签使用默认帖子
							showDefaultPosts();
						} else {
							// 关注标签可能真的没有数据
							posts.value = [];
						}
					} else {
						// 更新发布时间，便于下次检测是否需要刷新
						lastPublishTime.value = Date.now();
						
						// 处理帖子数据，解析遛狗记录信息
						posts.value = processPostsData(postsData);
					}
				} else {
					// 使用默认空数组
					if (currentTab.value === 0) {
						showDefaultPosts();
					} else {
						posts.value = [];
					}
				}
			} catch (error) {
				console.error('加载帖子失败', error);
				// 出错时使用默认数据
				if (currentTab.value === 0) {
					showDefaultPosts();
				} else {
					posts.value = [];
					// 显示错误提示
					uni.showToast({
						title: '没有关注的内容',
						icon: 'none'
					});
				}
			} finally {
				isLoading.value = false;
				
				// 停止下拉刷新动画（如果存在）
				uni.stopPullDownRefresh();
			}
		};
		
		// 显示默认帖子数据
		const showDefaultPosts = () => {
			const defaultPosts = [
				{
					id: 1,
					username: '狗狗爱好者',
					userAvatar: '/static/images/default-avatar.png',
					time: '1小时前',
					content: '今天和汪汪出去玩，好开心！',
					likes: 12,
					comments: 3,
					images: ['/static/images/default-pet.png']
				},
				{
					id: 2,
					username: '宠物达人',
					userAvatar: '/static/images/default-avatar.png',
					time: '2小时前',
					content: '分享一下我家狗狗的日常~',
					likes: 24,
					comments: 8,
					images: [
						'/static/images/default-pet.png',
						'/static/images/default-pet.png',
						'/static/images/default-pet.png'
					],
					walkRecord: {
						_id: 'default_walk_record_1',
						distance: 3500, // 米
						duration: 1800, // 秒
						pet: {
							name: '小白'
						},
						startTime: new Date().toISOString()
					}
				},
				{
					id: 3,
					username: 'jlk1997',
					userAvatar: '/static/images/default-avatar.png',
					time: '5分钟前',
					content: '我和dwqdw一起遛了0.00公里，用时5秒！ caca',
					likes: 0,
					comments: 0
				}
			];
			
			// 处理帖子数据，解析遛狗记录信息
			posts.value = processPostsData(defaultPosts);
		};
		
		// 格式化头像URL
		const formatAvatarUrl = (url) => {
			if (!url) return '/static/images/default-avatar.png';
			
			// 检查URL是否已经是完整URL或静态资源路径
			if (url.startsWith('http') || url.startsWith('/static')) {
				return url;
			}
			
			// 如果是相对路径（如/uploads/avatars/xxx），补充基础URL
			if (url.startsWith('/uploads')) {
				// 在实际环境中获取BASE_URL
				const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
				return BASE_URL + url;
			}
			
			// 从用户对象中获取头像
			if (typeof url === 'object' && url.avatar) {
				return formatAvatarUrl(url.avatar);
			}
			
			// 如果是其他情况，使用默认头像
			return '/static/images/default-avatar.png';
		};
		
		// 处理头像加载错误
		const handleAvatarError = (event, index) => {
			console.warn('头像加载失败:', event, '索引:', index);
			event.target.src = '/static/images/default-avatar.png';
		};
		
		// 点赞帖子
		const likePost = async (post, index) => {
			console.log('Like post:', post, 'Index:', index);
			
			if (!post || (!post.id && !post._id)) {
				console.error('Invalid post ID for like action');
				uni.showToast({
					title: '无法点赞',
					icon: 'none'
				});
				return;
			}
			
			const postId = post.id || post._id;
			
			// 确保帖子有isLiked和likes属性
			if (post.isLiked === undefined) {
				post.isLiked = false;
			}
			if (post.likes === undefined) {
				post.likes = 0;
			}
			
			// 存储原来的状态
			const wasLiked = post.isLiked;
			
			// 立即更新UI提供反馈
			post.isLiked = !wasLiked;
			post.likes = wasLiked 
				? Math.max((post.likes || 1) - 1, 0)
				: (post.likes || 0) + 1;
			
			try {
				if (!communityApi) {
					throw new Error('社区API未初始化');
				}
				
				// 调用API更新点赞状态
				const res = await communityApi.likePost(postId, !wasLiked);
				console.log('Like/unlike success:', res);
				
				// 如果API返回了确切的点赞数，使用API返回的值
				if (res && res.data && typeof res.data.likes !== 'undefined') {
					post.likes = res.data.likes;
					post.isLiked = res.data.isLiked;
				}
			} catch (err) {
				console.error('Like/unlike error:', err);
				// 恢复原来的UI状态
				post.isLiked = wasLiked;
				post.likes = wasLiked 
					? (post.likes || 0) + 1 
					: Math.max((post.likes || 1) - 1, 0);
				
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		};
		
		// 查看评论
		const viewComments = (post) => {
			console.log('Viewing comments for post:', post);
			
			if (!post || (!post.id && !post._id)) {
				console.error('Invalid post ID for comments view');
				uni.showToast({
					title: '无法查看评论',
					icon: 'none'
				});
				return;
			}
			
			const postId = post.id || post._id;
			
			// 将完整的帖子数据保存到缓存中，确保详情页可以直接使用
			try {
				const postCacheKey = `post_cache_${postId}_${Date.now()}`;
				uni.setStorageSync(postCacheKey, JSON.stringify(post));
				
				// 导航到帖子详情页，传递帖子ID和缓存Key
				uni.navigateTo({
					url: `/pages/community/post-detail?id=${postId}&postKey=${postCacheKey}&showComments=true`
				});
			} catch (e) {
				console.error('保存帖子数据到缓存失败:', e);
				// 失败时仍然导航，但只传递ID
				uni.navigateTo({
					url: `/pages/community/post-detail?id=${postId}&showComments=true`
				});
			}
		};
		
		// 加载更多
		const loadMore = async () => {
			if (isLoading.value) return;
			
			isLoading.value = true;
			try {
				// 检查API是否可用
				if (!communityApi) {
					isLoading.value = false;
					return;
				}
				
				const lastPostId = posts.value.length > 0 ? posts.value[posts.value.length - 1].id : null;
				
				console.log('加载更多，类型:', currentTab.value === 0 ? 'recommended' : 'following', '最后ID:', lastPostId);
				
				const response = await communityApi.getPosts({
					type: currentTab.value === 0 ? 'recommended' : 'following',
					limit: 10,
					lastId: lastPostId
				});
				
				if (response && response.data && response.data.length > 0) {
					// 追加新数据
					posts.value = [...posts.value, ...response.data];
				} else {
					// 没有更多数据时提示
					uni.showToast({
						title: '没有更多内容了',
						icon: 'none'
					});
				}
			} catch (error) {
				console.error('加载更多帖子失败', error);
				uni.showToast({
					title: '加载更多失败',
					icon: 'none'
				});
			} finally {
				isLoading.value = false;
			}
		};
		
		// 跳转到发布页面
		const navToCreate = () => {
			// 记录当前时间，用于检测发帖后返回
			lastPublishTime.value = Date.now();
			
			uni.navigateTo({
				url: '/pages/community/create'
			});
		};
		
		// 截断文本
		const truncateText = (text, length) => {
			if (!text) return '';
			if (text.length <= length) return text;
			return text.substring(0, length) + '...';
		};
		
		// 预览图片
		const previewImage = (post, index) => {
			currentPost.value = post;
			currentImageIndex.value = index;
			showImageViewer.value = true;
		};
		
		// 关闭图片查看器
		const closeImageViewer = () => {
			showImageViewer.value = false;
		};
		
		// 查看帖子详情
		const viewPostDetail = (post) => {
			console.log('查看帖子详情:', post);
			if (!post || (!post.id && !post._id)) {
				uni.showToast({
					title: '帖子数据无效',
					icon: 'none'
				});
				return;
			}
			
			// 获取帖子ID，优先使用id，其次使用_id
			const postId = post.id || post._id;
			
			// 将完整的帖子数据保存到缓存中
			try {
				const postCacheKey = `post_cache_${postId}_${Date.now()}`;
				uni.setStorageSync(postCacheKey, JSON.stringify(post));
				
				// 导航到帖子详情页，传递帖子ID和缓存Key
				uni.navigateTo({
					url: `/pages/community/post-detail?id=${postId}&postKey=${postCacheKey}`
				});
			} catch (e) {
				console.error('保存帖子数据到缓存失败:', e);
				// 失败时仍然导航，但只传递ID
				uni.navigateTo({
					url: `/pages/community/post-detail?id=${postId}`
				});
			}
		};
		
		// 查看遛狗记录
		const viewWalkRecord = (post) => {
			if (!post.walkRecord || !post.walkRecord._id) {
				uni.showToast({
					title: '遛狗记录不存在',
					icon: 'none'
				});
				return;
			}
			
			console.log('查看遛狗记录详情:', post.walkRecord);
			
			// 检查是否是生成的记录ID
			const recordId = post.walkRecord._id;
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
				url: `/pages/walk/detail?id=${post.walkRecord._id}`,
				fail: (err) => {
					console.error('打开遛狗记录详情失败:', err);
					uni.showToast({
						title: '无法查看遛狗记录',
						icon: 'none'
					});
				}
			});
		};
		
		// 格式化日期
		const formatDate = (dateStr, isShort = false) => {
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
		};
		
		// 格式化图片URL
		const formatImageUrl = (url) => {
			if (!url) return '/static/images/default-pet.png';
			
			console.log('社区页面处理图片URL:', url);
			
			// 检查URL是否已经是完整URL或静态资源路径
			if (url.startsWith('http') || url.startsWith('/static') || url.startsWith('blob:')) {
				return url;
			}
			
			// 如果是相对路径，补充基础URL
			if (url.startsWith('/uploads')) {
				const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
				const fullUrl = BASE_URL + url;
				console.log('处理相对路径图片URL:', url, '补充基础URL:', BASE_URL, '完整URL:', fullUrl);
				return fullUrl;
			}
			
			// 如果是其他情况，使用默认图片
			console.warn('未能识别的图片URL格式:', url);
			return '/static/images/default-pet.png';
		};
		
		// 显示用户信息弹窗
		const showUserProfile = async (user) => {
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
			// 检查是否是自己
			const isSelf = userStore.isAuthenticated && userStore.userId === user._id;
			
			// 设置初始状态
			selectedUser.value = {
				...user,
				isCurrentUser: isSelf
			};
			
			// 初始化关注状态为false
			isFollowing.value = false;
			
			// 如果是已登录状态且不是自己，直接使用API检查关注状态
			if (userStore.isAuthenticated && !isSelf) {
				try {
					console.log('直接调用checkFollowStatus检查关注状态，用户ID:', user._id);
					const followStatus = await api.user.checkFollowStatus(user._id);
					
					if (followStatus && followStatus.isFollowing !== undefined) {
						isFollowing.value = followStatus.isFollowing;
						console.log('API返回的关注状态:', isFollowing.value);
					}
				} catch (error) {
					console.error('检查关注状态失败:', error);
					
					// 检查失败时，尝试从用户对象获取关注状态
					if (user.isFollowing !== undefined) {
						isFollowing.value = user.isFollowing;
						console.log('从用户对象获取关注状态:', isFollowing.value);
					}
				}
			}
			
			console.log('初始关注状态设置为:', isFollowing.value);
			
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
							isFollowing.value = isFollowing.value || userDetails.isFollowing;
							console.log('综合考虑后的关注状态:', isFollowing.value);
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
							isFollowing.value = false;
						}
						
						// 确保在更新完isFollowing后再更新selectedUser
						selectedUser.value = {
							...userDetails,
							isCurrentUser: isSelf,
							// 确保用户对象中有isFollowing属性
							isFollowing: isFollowing.value
						};
						
						console.log('更新后的selectedUser和isFollowing:', selectedUser.value, isFollowing.value);
						
						// 获取该用户的宠物列表
						try {
							console.log('尝试获取用户宠物列表，用户ID:', user._id);
							const pets = await api.user.getPetsByUser(user._id);
							console.log('获取到的宠物列表:', pets);
							selectedUserPets.value = pets || [];
						} catch (petError) {
							console.error('获取宠物列表失败:', petError);
							selectedUserPets.value = [];
						}
					}
				} catch (error) {
					console.error('获取用户详情过程中出错:', error);
					
					// 使用基本用户信息
					selectedUser.value = {
						...user,
						isCurrentUser: isSelf,
						isFollowing: isFollowing.value,
						nickname: user.nickname || user.username || '用户',
						bio: user.bio || '这位用户还没有个人简介'
					};
				}
			}
			
			console.log('最终用户信息和关注状态:', {
				user: selectedUser.value,
				isFollowing: isFollowing.value,
				pets: selectedUserPets.value
			});
			
			showUserPopup.value = true;
		};
		
		// 关闭用户信息弹窗
		const closeUserPopup = () => {
			showUserPopup.value = false;
			selectedUser.value = null;
			selectedUserPets.value = [];
		};
		
		// 向用户发送消息
		const messageUser = (user) => {
			// 消息功能实现
			console.log('向用户发送消息:', user);
		};
		
		// 关注/取消关注用户
		const followUser = async (user) => {
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
					isFollowing.value = result.isFollowing;
					
					// 显示提示
					uni.showToast({
						title: isFollowing.value ? '关注成功' : '取消关注成功',
						icon: 'success'
					});
					
					// 更新用户对象以保持一致性
					if (selectedUser.value) {
						selectedUser.value.isFollowing = isFollowing.value;
					}
					
					// 获取最新的用户统计信息
					await userStore.fetchUserStats();
					
					// 如果在"关注"标签页，且取消关注，则可能需要刷新列表
					if (currentTab.value === 1 && !isFollowing.value) {
						loadPosts();
					}
				}
			} catch (error) {
				console.error('关注用户操作失败:', error);
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				});
			}
		};
		
		return {
			tabs,
			currentTab,
			posts,
			isLoading,
			isRefreshing,
			lastPublishTime,
			formatDuration,
			truncateText,
			previewImage,
			viewPostDetail,
			formatDate,
			switchTab,
			loadMore,
			navToCreate,
			likePost,
			viewComments,
			loadPosts,
			onRefresh,
			formatAvatarUrl,
			handleAvatarError,
			formatImageUrl,
			viewWalkRecord,
			getNumberValue,
			showImageViewer,
			currentImageIndex,
			currentPost,
			closeImageViewer,
			showUserPopup,
			selectedUser,
			selectedUserPets,
			isFollowing,
			showUserProfile,
			closeUserPopup,
			messageUser,
			followUser
		};
	},
	
	onLoad() {
		// 计算滚动区域高度
		const sysInfo = uni.getSystemInfoSync();
		// 获取可用窗口高度
		const windowHeight = sysInfo.windowHeight;
		
		// 获取状态栏高度
		const statusBarHeight = sysInfo.statusBarHeight || 20;
		
		// 计算顶部区域高度 (标题栏 + 标签栏)
		const headerHeight = uni.upx2px(170);
		
		// 估算tabBar高度 (一般为50px)
		const tabBarHeight = uni.upx2px(100);
		
		// 计算滚动区域高度(减去头部和底部tabBar)
		this.scrollHeight = windowHeight - headerHeight - tabBarHeight;
		console.log('设置滚动区域高度:', this.scrollHeight, 'px (已减去tabBar高度)');
		
		// 立即检查API加载
		this.$nextTick(() => {
			if (uni.$api && uni.$api.community) {
				this.loadPosts();
			} else {
				// API尚未准备好，使用默认数据
				if (typeof this.showDefaultPosts === 'function') {
					this.showDefaultPosts();
				}
			}
		});
	},
	
	mounted() {
		// 确保API已经准备好
		if (uni.$api && uni.$api.community) {
			this.loadPosts();
		} else {
			// API尚未准备好，显示默认数据
			console.warn('API尚未准备好，使用默认数据');
			this.showDefaultPosts();
			
			// 监听API就绪事件
			const checkApiInterval = setInterval(() => {
				if (uni.$api && uni.$api.community) {
					clearInterval(checkApiInterval);
					this.loadPosts();
				}
			}, 1000);
			
			// 5秒后如果还没有准备好，就停止尝试
			setTimeout(() => {
				clearInterval(checkApiInterval);
			}, 5000);
		}
	},
	
	// 下拉刷新
	onPullDownRefresh() {
		console.log('页面下拉刷新触发');
		this.isRefreshing = true;
		this.loadPosts(true).finally(() => {
			uni.stopPullDownRefresh();
			setTimeout(() => {
				this.isRefreshing = false;
			}, 300);
		});
	},
	
	// 使用uni-app生命周期钩子正确方式
	onShow() {
		// 如果从发帖页面返回（时间间隔小于15秒），则刷新内容
		const currentTime = Date.now();
		if (this.lastPublishTime && (currentTime - this.lastPublishTime < 15000)) {
			// 刷新帖子列表
			console.log('检测到可能发布新帖子，刷新内容');
			if (this.loadPosts) {
				this.loadPosts(true);
			}
		}
	}
}
</script>

<style>
.community-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f5f5f5;
}

.header {
	padding: 20rpx 30rpx;
	background-color: #fff;
	z-index: 10;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
}

.create-post-btn {
	display: flex;
	align-items: center;
	color: #3B9E82;
}

.create-icon {
	font-size: 36rpx;
	margin-right: 6rpx;
}

.create-text {
	font-size: 28rpx;
}

.tabs {
	display: flex;
	background-color: #fff;
	padding: 0 30rpx;
	border-bottom: 1px solid #eee;
	z-index: 10;
}

.tab-item {
	padding: 20rpx 30rpx;
	margin-right: 20rpx;
	font-size: 28rpx;
	color: #666;
	position: relative;
}

.tab-item.active {
	color: #3B9E82;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background-color: #3B9E82;
}

.list-container {
	flex: 1;
	position: relative;
	display: flex;
	flex-direction: column;
}

.post-list {
	height: calc(100vh - 200rpx) !important; /* 明确指定高度，减去头部和标签栏高度 */
	background-color: #f5f5f5;
}

.no-posts {
	padding: 60rpx;
	text-align: center;
	color: #999;
}

.post-item {
	margin-bottom: 20rpx;
	padding: 30rpx;
	background-color: #fff;
}

.post-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.user-info {
	display: flex;
	align-items: center;
}

.user-avatar {
	width: 60rpx; /* 增大头像尺寸 */
	height: 60rpx;
	border-radius: 50%;
	margin-right: 10rpx;
	background-color: #f0f0f0; /* 添加背景色以便在加载前有占位效果 */
	border: 1px solid #eee; /* 添加边框使轮廓更清晰 */
}

.username {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.post-time {
	font-size: 24rpx;
	color: #999;
}

.post-content {
	margin-bottom: 20rpx;
}

.post-text {
	font-size: 28rpx;
	line-height: 1.5;
	margin-bottom: 15rpx;
}

/* 遛狗记录卡片 */
.walk-record {
	margin: 15rpx 0;
	padding: 20rpx;
	border-radius: 12rpx;
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
	margin-bottom: 15rpx;
	border-bottom: 1px dashed #e0f5e9;
	padding-bottom: 10rpx;
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

.walk-info {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.walk-stats {
	display: flex;
	align-items: center;
	margin-bottom: 8rpx;
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
	height: 140rpx;
	border-radius: 8rpx;
	border: 1px solid #eee;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
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

/* 帖子图片 */
.post-images {
	display: flex;
	flex-wrap: wrap;
	margin-top: 10rpx;
	position: relative;
}

.post-image {
	width: 220rpx;
	height: 220rpx;
	margin-right: 10rpx;
	margin-bottom: 10rpx;
	border-radius: 8rpx;
	background-color: #f0f0f0;
}

.post-image.single-image {
	width: 400rpx;
	height: 300rpx;
}

.more-images {
	width: 220rpx;
	height: 220rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
	color: #fff;
	font-size: 30rpx;
	position: absolute;
	right: 20rpx;
	border-radius: 8rpx;
}

.post-footer {
	display: flex;
	border-top: 1px solid #f0f0f0;
	padding-top: 20rpx;
}

.action-item {
	display: flex;
	align-items: center;
	margin-right: 40rpx;
	position: relative;
}

.action-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 10rpx;
	background-size: contain;
	background-repeat: no-repeat;
}

.like-icon {
	background-image: url('../../static/images/pet-marker.png');
}

.comment-icon {
	background-image: url('../../static/images/chat-icon.png');
}

.action-icon.active {
	background-color: #FF6B6B;
}

.loading-more {
	padding: 30rpx;
	text-align: center;
	color: #999;
}

.float-btn {
	position: fixed;
	bottom: 100rpx;
	right: 40rpx;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #3B9E82;
	color: #fff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 2px 10px rgba(0,0,0,0.2);
	z-index: 100;
}

.float-icon {
	font-size: 50rpx;
}

:root {
  --tab-bar-height: 100rpx;
  --status-bar-height: 40rpx;
}
:deep(scroll-view) {
  overflow-anchor: auto;
}

/* 图片点击状态 */
.post-image:active {
	opacity: 0.8;
	transform: scale(0.98);
}
</style> 