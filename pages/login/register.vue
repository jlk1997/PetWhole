<template>
	<view class="register-container">
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
				<text class="label">邮箱</text>
				<input class="input" type="text" v-model="form.email" placeholder="请输入邮箱" />
			</view>
			
			<view class="input-group">
				<text class="label">密码</text>
				<input class="input" type="password" v-model="form.password" placeholder="请输入密码（至少6个字符）" />
				<text class="input-tip" v-if="form.password && form.password.length < 6">密码长度不能少于6个字符</text>
			</view>
			
			<view class="input-group">
				<text class="label">确认密码</text>
				<input class="input" type="password" v-model="form.confirmPassword" placeholder="请再次输入密码" />
				<text class="input-tip" v-if="form.password !== form.confirmPassword && form.confirmPassword">两次输入的密码不一致</text>
			</view>
			
			<view class="input-group">
				<text class="label">昵称</text>
				<input class="input" type="text" v-model="form.nickname" placeholder="请输入昵称（选填）" />
			</view>
			
			<button class="register-btn" 
				:disabled="!isValid || isLoading" 
				:class="{ loading: isLoading }"
				@click="handleRegister">
				{{ isLoading ? '注册中...' : '注 册' }}
			</button>
			
			<view class="footer">
				<text class="login-link" @click="goToLogin">已有账号？去登录</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, computed } from 'vue';
import { showToast, showLoading, hideLoading, navigateTo } from '@/utils/ui.js';

// 定义表单数据对象
const form = ref({
	username: '',
	password: '',
	confirmPassword: '',
	email: '',
	nickname: ''
});
const isLoading = ref(false);

// 表单验证
const isValid = computed(() => {
	const { username, password, confirmPassword, email } = form.value;
	return username.trim() && 
		   password.trim() && 
		   password.length >= 6 &&
		   confirmPassword.trim() && 
		   email.trim() &&
		   password === confirmPassword;
});

// 简单的邮箱验证
const isValidEmail = (email) => {
	return /\S+@\S+\.\S+/.test(email);
};

// 密码验证
const isValidPassword = (password) => {
	return password && password.length >= 6;
};

/**
 * Handle register form submission
 */
async function handleRegister() {
	// 在提交前检查密码长度
	if (form.value.password.length < 6) {
		showToast({
			title: '密码长度不能少于6个字符',
			icon: 'none',
		});
		return;
	}
	
	if (form.value.password !== form.value.confirmPassword) {
		showToast({
			title: '两次输入的密码不一致',
			icon: 'none',
		});
		return;
	}
	
	if (!isValidEmail(form.value.email)) {
		showToast({
			title: '请输入有效的邮箱地址',
			icon: 'none',
		});
		return;
	}
	
	isLoading.value = true;
	showLoading('注册中...');
	
	try {
		// 使用API调用
		const response = await uni.$api.auth.register({
			username: form.value.username,
			password: form.value.password,
			email: form.value.email,
			nickname: form.value.nickname || form.value.username
		});
		
		console.log('注册响应:', response);
		
		// 处理响应
		let data = response;
		if (response && response.data) {
			data = response.data;
		}
		
		// 检查token是否存在
		if (!data || (!data.token && !data.accessToken)) {
			console.error('无效的响应数据:', data);
			throw new Error('注册失败：服务器响应格式不正确');
		}
		
		// 保存token
		const token = data.token || data.accessToken;
		uni.setStorageSync('token', token);
		
		// 保存用户信息
		if (data.user) {
			uni.setStorageSync('userInfo', JSON.stringify(data.user));
		} else {
			const userInfo = {
				username: form.value.username,
				nickname: form.value.nickname || form.value.username,
				_id: data._id || data.id || Date.now().toString(),
				avatar: '/static/images/default-avatar.png'
			};
			uni.setStorageSync('userInfo', JSON.stringify(userInfo));
		}
		
		showToast({
			title: '注册成功，请完善信息',
			icon: 'success'
		});
		
		// 导航到资料完善页面，明确设置firstLogin为true
		setTimeout(() => {
			uni.redirectTo({
				url: '/pages/profile/profile?firstLogin=true'
			});
		}, 1500);
	} catch (error) {
		console.error('注册失败:', error);
		
		if (error.statusCode === 500) {
			// 添加更多日志信息帮助调试
			console.error('服务器响应详情:', error.data);
			
			// 检查是否是密码长度问题
			if (error.data?.error && error.data.error.includes('password') && error.data.error.includes('shorter than the minimum')) {
				showToast({
					title: '密码长度不能少于6个字符',
					icon: 'none',
					duration: 3000
				});
			} 
			// 检查是否是邮箱格式问题
			else if (error.data?.error && error.data.error.includes('email') && error.data.error.includes('invalid')) {
				showToast({
					title: '请输入有效的邮箱地址',
					icon: 'none',
					duration: 3000
				});
			}
			// 检查是否是字段必需问题
			else if (error.data?.error && error.data.error.includes('required')) {
				showToast({
					title: '请填写所有必填字段',
					icon: 'none',
					duration: 3000
				});
			}
			// 其他服务器错误
			else {
				showToast({
					title: '注册失败：' + (error.message || '系统错误'),
					icon: 'none',
					duration: 3000
				});
			}
		} else if (error.message && error.message.includes('already exists')) {
			showToast({
				title: '用户名已存在，请更换用户名',
				icon: 'none'
			});
		} else {
			showToast({
				title: error.message || '注册失败，请稍后再试',
				icon: 'none'
			});
		}
	} finally {
		isLoading.value = false;
		hideLoading();
	}
}

/**
 * Navigate to login page
 */
function goToLogin() {
	try {
		navigateTo('/pages/login/login');
	} catch (error) {
		console.error('跳转到登录页面失败:', error);
		uni.navigateBack();
	}
}
</script>

<style>
.register-container {
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
	margin-bottom: 40rpx;
}

.logo {
	width: 140rpx;
	height: 140rpx;
	margin-bottom: 20rpx;
}

.app-name {
	font-size: 42rpx;
	font-weight: bold;
	color: #3B9E82;
}

.form-container {
	width: 100%;
	max-width: 600rpx;
}

.input-group {
	margin-bottom: 20rpx;
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

.register-btn {
	width: 100%;
	height: 88rpx;
	line-height: 88rpx;
	background-color: #3B9E82;
	color: #fff;
	font-size: 32rpx;
	border-radius: 44rpx;
	margin: 40rpx 0;
}

.register-btn.loading {
	background-color: #86c9b3;
}

.register-btn:disabled {
	background-color: #cccccc;
	color: #999999;
}

.footer {
	text-align: center;
	margin-top: 30rpx;
}

.login-link {
	font-size: 28rpx;
	color: #3B9E82;
}
</style> 