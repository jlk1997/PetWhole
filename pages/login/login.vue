<template>
	<view class="login-container">
		<view class="logo-container">
			<image class="logo" src="/static/images/app-logo.png" mode="aspectFit"></image>
			<text class="app-name">DogRun</text>
		</view>
		
		<view class="form-container">
			<view class="input-group">
				<text class="label">用户名</text>
				<input class="input" type="text" v-model="form.username" placeholder="请输入用户名" />
			</view>
			
			<view class="input-group">
				<text class="label">密码</text>
				<input class="input" type="password" v-model="form.password" placeholder="请输入密码" />
			</view>
			
			<button class="login-btn" 
				:disabled="!isValid || isLoading" 
				:class="{ loading: isLoading }"
				@click="handleLogin">
				{{ isLoading ? '登录中...' : '登 录' }}
			</button>
			
			<view class="footer">
				<text class="register-link" @click="goToRegister">没有账号？去注册</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast, showLoading, hideLoading, navigateTo } from '@/utils/ui.js';
import api from '@/utils/api.js'; // 导入api模块
import { useUserStore } from '@/store/user.js'; // 修正导入路径

// 定义表单数据对象
const form = ref({
	username: '',
	password: ''
});
const isLoading = ref(false);

// 表单验证
const isValid = computed(() => form.value.username.trim() && form.value.password.trim());

/**
 * Handle login form submission
 */
async function handleLogin() {
	if (!isValid.value) return;
	
	isLoading.value = true;
	showLoading('登录中...');
	
	try {
		// 导入userStore
		const userStore = useUserStore();
		
		// 调用登录API - 注意这里使用api.auth.login而不是uni.$api.user.login
		const loginResult = await api.auth.login({
			username: form.value.username,
			password: form.value.password
		});
		
		console.log('登录响应:', loginResult);
		
		// 处理各种可能的响应结构
		let data = loginResult;
		
		// 如果响应是嵌套在data字段中
		if (loginResult && loginResult.data) {
			data = loginResult.data;
		}
		
		// 检查token是否存在
		if (!data || (!data.token && !data.accessToken)) {
			console.error('无效的响应数据:', data);
			throw new Error('登录失败：服务器响应格式不正确');
		}
		
		// 保存token（兼容token或accessToken字段）
		const token = data.token || data.accessToken;
		uni.setStorageSync('token', token);
		userStore.token = token;
		
		// 先保存基本用户信息，以便后续API调用有权限
		let userInfo = data.user;
		if (data.user) {
			userStore.user = data.user;
			uni.setStorageSync('userInfo', JSON.stringify(data.user));
		} else if (data._id || data.id) {
			// 构建简单的用户信息对象
			userInfo = {
				username: form.value.username,
				nickname: data.nickname || form.value.username,
				_id: data._id || data.id || Date.now().toString(),
				avatar: data.avatar || '/static/images/default-avatar.png'
			};
			userStore.user = userInfo;
			uni.setStorageSync('userInfo', JSON.stringify(userInfo));
		} else {
			// 尝试从响应中提取信息，用最宽松的方式
			userInfo = {
				username: form.value.username,
				...data
			};
			userStore.user = userInfo;
			uni.setStorageSync('userInfo', JSON.stringify(userInfo));
		}
		
		// 重新从后端获取最新的完整用户信息
		try {
			console.log('登录成功后获取完整用户信息');
			const fullUserInfo = await userStore.fetchUserInfo();
			
			if (fullUserInfo) {
				// 更新为最新的用户信息
				userInfo = fullUserInfo;
				uni.setStorageSync('userInfo', JSON.stringify(fullUserInfo));
				console.log('已获取并保存最新用户信息:', fullUserInfo);
			}
		} catch (fetchError) {
			console.error('获取完整用户信息失败:', fetchError);
			// 继续使用之前的基本信息
		}
		
		// 检查用户资料是否完善
		console.log('检查用户资料完整性:', userInfo);
		const isProfileComplete = checkProfileCompleteness(userInfo);
		console.log('用户资料是否完整:', isProfileComplete);
		
		if (!isProfileComplete) {
			// 资料不完整时跳转到资料完善页面
			showToast({
				title: '请完善个人资料',
				icon: 'none',
				duration: 2000
			});
			
			setTimeout(() => {
				uni.redirectTo({
					url: '/pages/profile/profile?firstLogin=true'
				});
			}, 1000);
		} else {
			// 资料完整直接跳转到主页，不经过编辑页面
			showToast({
				title: '登录成功',
				icon: 'success'
			});
			
			// 在本地存储中记录用户已完成首次登录
			try {
				uni.setStorageSync('hasCompletedFirstLogin', 'true');
			} catch (err) {
				console.error('保存登录状态失败:', err);
			}
			
			// 直接导航到主页
			setTimeout(() => {
				uni.switchTab({
					url: '/pages/index/index'
				});
			}, 1500);
		}
	} catch (error) {
		console.error('登录失败:', error);
		
		// 判断错误类型，针对性提示
		if (error.type === 'LOGIN_FAILED') {
			showToast({
				title: '账号未注册，请先注册',
				icon: 'none',
				duration: 2000
			});
			
			// 显示注册按钮或自动跳转
			setTimeout(() => {
				try {
					navigateTo('/pages/login/register');
				} catch (e) {
					console.error('跳转到注册页面失败:', e);
				}
			}, 1500);
		} else if (error.statusCode === 401) {
			showToast({
				title: '用户名或密码错误',
				icon: 'none'
			});
		} else {
			showToast({
				title: error.message || '登录失败，请稍后再试',
				icon: 'none'
			});
		}
	} finally {
		isLoading.value = false;
		hideLoading();
	}
}

/**
 * Check if user profile is complete
 */
function checkProfileCompleteness(user) {
	// 定义必填字段 - 只检查服务器返回的关键字段
	const requiredFields = [
		'nickname', 
		'email'
	];
	
	// 确保用户对象存在
	if (!user) {
		console.log('用户信息不存在');
		return false;
	}
	
	// 检查是否所有必填字段都有值且不为空字符串
	for (const field of requiredFields) {
		if (!user[field] || (typeof user[field] === 'string' && user[field].trim() === '')) {
			console.log(`用户信息不完整: 缺少 ${field} 或为空值`);
			return false;
		}
	}
	
	// 单独检查头像，不接受默认头像作为有效头像
	if (!user.avatar || 
		user.avatar === '/static/images/default-avatar.png' || 
		user.avatar === 'static/images/default-avatar.png') {
		console.log('用户信息不完整: 未上传头像');
		return false;
	}
	
	console.log('用户信息完整性检查通过:', user);
	return true;
}

/**
 * Navigate to register page
 */
function goToRegister() {
	try {
		navigateTo('/pages/login/register');
	} catch (error) {
		console.error('跳转到注册页面失败:', error);
		// 如果注册页面不存在，显示提示
		showToast('注册功能即将推出!');
	}
}
</script>

<style>
.login-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
	height: 100vh;
	background-color: #f9f9f9;
}

.logo-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 60rpx;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	margin-bottom: 20rpx;
}

.app-name {
	font-size: 48rpx;
	font-weight: bold;
	color: #3B9E82;
}

.form-container {
	width: 100%;
	max-width: 600rpx;
}

.input-group {
	margin-bottom: 30rpx;
}

.label {
	display: block;
	font-size: 28rpx;
	margin-bottom: 10rpx;
	color: #666;
}

.input {
	width: 100%;
	height: 80rpx;
	border: 1px solid #ddd;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	background-color: #fff;
}

.login-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background-color: #3B9E82;
	color: #fff;
	font-size: 32rpx;
	border-radius: 44rpx;
	margin: 40rpx 0;
}

.login-btn.loading {
	background-color: #86c9b3;
}

.login-btn:disabled {
	background-color: #cccccc;
	color: #999999;
}

.footer {
	text-align: center;
	margin-top: 40rpx;
}

.register-link {
	font-size: 28rpx;
	color: #3B9E82;
}
</style> 