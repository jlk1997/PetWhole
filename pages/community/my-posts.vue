<template>
	<view class="my-posts-container">
		<view class="header">
			<text class="title">我的动态</text>
		</view>
		
		<view class="post-list" v-if="posts.length > 0">
			<view class="post-item" v-for="(post, index) in posts" :key="post.id || post._id" @click="viewPostDetail(post)">
				<view class="post-header">
					<view class="user-info">
						<image class="avatar" :src="post.avatar || '/static/images/default-avatar.png'" mode="aspectFill"></image>
						<view class="name-time">
							<text class="username">{{ post.username || '匿名用户' }}</text>
							<text class="time">{{ formatDate(post.createdAt || post.createTime) }}</text>
						</view>
					</view>
				</view>
				<view class="post-content">
					<text class="post-text">{{ truncateText(post.content, 40) }}</text>
					
					<!-- 遛狗记录卡片 -->
					<walk-record-card v-if="post.walkRecord" :record="post.walkRecord"></walk-record-card>
					
					<view class="image-grid" v-if="post.images && post.images.length > 0">
						<image 
							v-for="(img, imgIndex) in post.images.slice(0, 3)" 
							:key="imgIndex" 
							:src="formatImageUrl(img)" 
							mode="aspectFill" 
							class="post-image"
							@click.stop="previewImage(post, imgIndex)"
						></image>
						<view v-if="post.images.length > 3" class="more-images">+{{ post.images.length - 3 }}</view>
					</view>
				</view>
				<view class="post-footer">
					<view class="action-item" @click.stop="likePost(post, $event)">
						<view class="action-icon like-icon" :class="{'active': post.isLiked}" 
							style="background-image: url('/static/images/like-icon.png'); background-size: contain; background-repeat: no-repeat;"></view>
						<text class="action-text">点赞 {{ getNumberValue(post.likes) }}</text>
					</view>
					<view class="action-item">
						<view class="action-icon comment-icon" 
							style="background-image: url('/static/images/comment-icon.png'); background-size: contain; background-repeat: no-repeat;"></view>
						<text class="action-text">评论 {{ getNumberValue(post.comments) }}</text>
					</view>
					<view class="post-actions">
						<view class="action-btn delete-btn" @click.stop="confirmDelete(post.id || post._id)">删除</view>
					</view>
				</view>
			</view>
		</view>
		
		<view class="empty-list" v-else>
			<image src="/static/images/empty-posts.png" mode="aspectFit" class="empty-icon"></image>
			<text class="empty-text">还没有发布过动态</text>
			<button class="create-btn" @click="createPost">发布动态</button>
		</view>
		
		<view class="loading" v-if="isLoading">
			<view class="loading-spinner"></view>
			<text class="loading-text">加载中...</text>
		</view>
		
		<!-- 图片查看器 -->
		<image-viewer 
			:show="showImageViewer" 
			:images="currentPost?.images || []" 
			:initialIndex="currentImageIndex"
			@close="closeImageViewer"
		/>
	</view>
</template>

<script>
import { ref } from 'vue';
import { showToast, showModal, navigateTo, navigateBack } from '@/utils/ui.js';
import { useUserStore } from '@/store/user.js';
import WalkRecordCard from '@/components/WalkRecordCard.vue';
import ImageViewer from '@/components/ImageViewer.vue';

export default {
  components: {
    WalkRecordCard,
    ImageViewer
  },
  setup() {
    const userStore = useUserStore();
    const posts = ref([]);
    const isLoading = ref(false);
    const page = ref(1);
    const hasMore = ref(true);
    const communityApi = uni.$api?.community;
    const showImageViewer = ref(false);
    const currentImageIndex = ref(0);
    const currentPost = ref(null);
    
    // 获取数字值
    function getNumberValue(value) {
      if (Array.isArray(value)) {
        return value.length;
      } else if (typeof value === 'number') {
        return value;
      } else if (value && typeof value === 'object') {
        return Object.keys(value).length;
      } else {
        return 0;
      }
    }
    
    // 格式化日期
    function formatDate(dateString) {
      if (!dateString) return '';
      
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      
      // 如果是今天
      if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `今天 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // 如果是昨天
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.getDate() === yesterday.getDate() && 
          date.getMonth() === yesterday.getMonth() && 
          date.getFullYear() === yesterday.getFullYear()) {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `昨天 ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      
      // 其他日期
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
    
    // 格式化图片URL
    function formatImageUrl(url) {
      if (!url) return '/static/images/default-pet.png';
      
      console.log('我的帖子页面处理图片URL:', url);
      
      // 检查URL是否已经是完整URL或静态资源路径
      if (url.startsWith('http') || url.startsWith('/static') || url.startsWith('blob:')) {
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
    }
    
    // 加载我的动态列表
    async function loadPosts(refresh = false) {
      if (isLoading.value) return;
      
      if (refresh) {
        page.value = 1;
        hasMore.value = true;
      }
      
      if (!hasMore.value && !refresh) return;
      
      isLoading.value = true;
      
      try {
        console.log('尝试获取我的帖子，页码:', page.value, '每页数量:', 10);
        
        const response = await uni.$api.community.getMyPosts({
          page: page.value,
          limit: 10
        });
        
        // 检查响应格式
        if (!response || !response.data) {
          console.warn('获取我的帖子响应格式不正确:', response);
          
          if (refresh) {
            posts.value = [];
          }
          
          hasMore.value = false;
          
          // 完成下拉刷新
          if (refresh) {
            uni.stopPullDownRefresh();
          }
          
          return;
        }
        
        console.log('获取我的帖子成功，数据:', response.data);
        
        if (refresh) {
          // 处理数据并解析遛狗记录
          posts.value = (response.data || []).map(post => parseWalkRecordFromContent(post));
        } else {
          // 处理数据并解析遛狗记录
          posts.value = [...posts.value, ...(response.data || []).map(post => parseWalkRecordFromContent(post))];
        }
        
        hasMore.value = (response.data?.length === 10);
        page.value++;
        
        // 完成下拉刷新
        if (refresh) {
          uni.stopPullDownRefresh();
        }
      } catch (error) {
        console.error('获取我的动态失败:', error);
        
        // 格式化错误信息，提供更友好的提示
        const errorMsg = error.message || '未知错误';
        const statusCode = error.statusCode || '未知状态码';
        
        showToast({
          title: `获取动态失败 (${statusCode}): ${errorMsg}`,
          icon: 'none'
        });
        
        // 如果是首次加载或刷新，提供一个空列表而不是保持旧数据
        if (refresh || posts.value.length === 0) {
          posts.value = [];
        }
        
        // 标记没有更多数据
        hasMore.value = false;
        
        // 完成下拉刷新
        if (refresh) {
          uni.stopPullDownRefresh();
        }
      } finally {
        isLoading.value = false;
      }
    }
    
    // 查看动态详情
    function viewPostDetail(post) {
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
        navigateTo(`/pages/community/post-detail?id=${postId}&postKey=${postCacheKey}`);
      } catch (e) {
        console.error('保存帖子数据到缓存失败:', e);
        // 失败时仍然导航，但只传递ID
        navigateTo(`/pages/community/post-detail?id=${postId}`);
      }
    }
    
    // 预览图片
    function previewImage(post, index) {
      currentPost.value = post;
      currentImageIndex.value = index;
      showImageViewer.value = true;
    }
    
    // 关闭图片查看器
    function closeImageViewer() {
      showImageViewer.value = false;
    }
    
    // 编辑动态
    function editPost(post) {
      if (!post || (!post.id && !post._id)) {
        uni.showToast({
          title: '无法编辑，帖子数据无效',
          icon: 'none'
        });
        return;
      }
      
      const postId = post.id || post._id;
      
      // 先将帖子数据缓存，以便编辑页面可以使用
      try {
        const postCacheKey = `post_cache_${postId}_${Date.now()}`;
        uni.setStorageSync(postCacheKey, JSON.stringify(post));
        
        // 导航到编辑页面，传递帖子ID、模式和缓存键
        navigateTo(`/pages/community/create?id=${postId}&mode=edit&postKey=${postCacheKey}`);
      } catch (e) {
        console.error('缓存帖子数据失败:', e);
        // 失败时仍然导航，但只传递基本参数
        navigateTo(`/pages/community/create?id=${postId}&mode=edit`);
      }
    }
    
    // 确认删除动态
    function confirmDelete(postId) {
      showModal({
        title: '删除动态',
        content: '确定要删除这条动态吗？此操作不可恢复。',
        showCancel: true
      }).then(async (res) => {
        if (res) {
          await deletePost(postId);
        }
      });
    }
    
    // 删除动态
    async function deletePost(postId) {
      isLoading.value = true;
      
      try {
        console.log('尝试删除帖子，ID:', postId);
        await uni.$api.community.deletePost(postId);
        
        // 从列表中移除
        posts.value = posts.value.filter(post => (post.id !== postId && post._id !== postId));
        
        showToast({
          title: '动态已删除',
          icon: 'success'
        });
      } catch (error) {
        console.error('删除动态失败:', error);
        
        // 格式化错误信息，提供更友好的提示
        const errorMsg = error.message || '未知错误';
        const statusCode = error.statusCode || '未知状态码';
        
        showToast({
          title: `删除失败 (${statusCode}): ${errorMsg}`,
          icon: 'none',
          duration: 3000
        });
        
        // 尝试重新加载列表以获取最新状态
        if (error.statusCode === 404) {
          // 如果是404错误（帖子不存在），尝试刷新列表
          console.log('帖子可能已被删除，尝试刷新列表');
          setTimeout(() => {
            loadPosts(true);
          }, 1500);
        }
      } finally {
        isLoading.value = false;
      }
    }
    
    // 发布新动态
    function createPost() {
      navigateTo('/pages/community/create');
    }
    
    // 页面加载时检查登录状态并加载数据
    function checkLoginAndLoadData() {
      if (!userStore.isAuthenticated) {
        showToast({
          title: '请先登录',
          icon: 'none'
        });
        setTimeout(() => {
          navigateTo('/pages/login/login');
        }, 1500);
        return;
      }
      
      loadPosts();
    }
    
    // 格式化时长显示
    function formatDuration(seconds) {
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
    }
    
    // 查看遛狗记录详情
    function viewWalkRecord(post) {
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
    }
    
    // 解析帖子内容中的遛狗记录
    function parseWalkRecordFromContent(post) {
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
    }
    
    // 添加truncateText函数定义
    function truncateText(text, maxLength) {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    }
    
    // 点赞帖子
    async function likePost(post, event) {
      // 阻止事件冒泡，避免触发点击整个帖子的事件
      event.stopPropagation();
      
      console.log('点赞帖子:', post);
      
      if (!post || (!post.id && !post._id)) {
        console.error('无效的帖子ID');
        showToast({
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
      
      // 立即更新UI提供反馈
      const wasLiked = post.isLiked;
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
        console.log('点赞/取消点赞成功:', res);
        
        // 如果API返回了确切的点赞数，使用API返回的值
        if (res && res.data && typeof res.data.likes !== 'undefined') {
          post.likes = res.data.likes;
          post.isLiked = res.data.isLiked;
        }
      } catch (err) {
        console.error('点赞/取消点赞失败:', err);
        // 恢复原来的UI状态
        post.isLiked = wasLiked;
        post.likes = wasLiked 
          ? (post.likes || 0) + 1 
          : Math.max((post.likes || 1) - 1, 0);
        
        showToast({
          title: '操作失败，请重试',
          icon: 'none'
        });
      }
    }
    
    return {
      posts,
      isLoading,
      hasMore,
      userStore,
      formatDate,
      formatImageUrl,
      loadPosts,
      viewPostDetail,
      previewImage,
      editPost,
      confirmDelete,
      deletePost,
      createPost,
      checkLoginAndLoadData,
      formatDuration,
      viewWalkRecord,
      getNumberValue,
      truncateText,
      likePost,
      closeImageViewer,
      showImageViewer,
      currentImageIndex,
      currentPost
    };
  },
  
  onLoad() {
    this.checkLoginAndLoadData();
  },
  
  onPullDownRefresh() {
    this.loadPosts(true);
  },
  
  onReachBottom() {
    if (this.hasMore && !this.isLoading) {
      this.loadPosts();
    }
  }
}
</script>

<style>
.my-posts-container {
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 30rpx;
}

.header {
  background-color: #ffffff;
  padding: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  margin-bottom: 20rpx;
}

.title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.post-list {
  padding: 0 20rpx;
}

.post-item {
  background-color: #ffffff;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.user-info {
  display: flex;
  align-items: center;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 10rpx;
}

.name-time {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.time {
  font-size: 24rpx;
  color: #999;
}

.post-content {
  margin-bottom: 16rpx;
}

.post-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.image-grid {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16rpx;
  position: relative;
}

.post-image {
  width: 32%;
  aspect-ratio: 1;
  border-radius: 8rpx;
  background-color: #f0f0f0;
}

/* 图片点击状态 */
.post-image:active {
  opacity: 0.8;
  transform: scale(0.98);
}

.more-images {
  position: absolute;
  right: 20rpx;
  bottom: 20rpx;
  width: 60rpx;
  height: 60rpx;
  border-radius: 30rpx;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1rpx solid #f0f0f0;
  padding-top: 16rpx;
}

.action-item {
  display: flex;
  align-items: center;
  margin-right: 30rpx;
  position: relative;
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

.like-icon.active {
  filter: hue-rotate(320deg) saturate(1.5); /* Makes the icon more red when active */
}

.action-text {
  font-size: 24rpx;
  color: #666;
}

.post-actions {
  display: flex;
  margin-left: auto;
}

.action-btn {
  font-size: 24rpx;
  color: #666;
  margin-left: 20rpx;
  padding: 6rpx 12rpx;
  border-radius: 4rpx;
}

.action-btn.edit-btn {
  color: #3B9E82;
}

.action-btn.delete-btn {
  color: #ff5252;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 120rpx;
}

.empty-icon {
  width: 200rpx;
  height: 200rpx;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 40rpx;
}

.create-btn {
  width: 300rpx;
  height: 80rpx;
  line-height: 80rpx;
  background-color: #3B9E82;
  color: #ffffff;
  font-size: 28rpx;
  border-radius: 40rpx;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30rpx 0;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #f3f3f3;
  border-top: 4rpx solid #3B9E82;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20rpx;
}

.loading-text {
  font-size: 26rpx;
  color: #999;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 遛狗记录卡片样式 */
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
</style> 