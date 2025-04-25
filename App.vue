<script>
import { useUserStore } from './store/user'
import { usePetStore } from './store/pet'
import api from './utils/api'

export default {
	onLaunch: function() {
		console.log('App Launch')
		
		// 初始化全局store
		const userStore = useUserStore()
		const petStore = usePetStore()
		
		// 初始化并检查API
		this.initApi();
		
		// 恢复用户状态
		if (uni.getStorageSync('token')) {
			// 尝试先从本地存储加载用户信息，保证界面快速显示
			try {
				const userInfoStr = uni.getStorageSync('userInfo')
				if (userInfoStr) {
					const userInfo = JSON.parse(userInfoStr)
					if (userInfo && userInfo._id) {
						// 直接设置到 store 中，立即可用
						userStore.user = userInfo
						console.log('从本地存储初始化用户信息:', userInfo.nickname, '头像:', userInfo.avatar)
					}
				}
			} catch (err) {
				console.error('从本地存储恢复用户信息失败:', err)
			}
			
			// 然后再从服务器获取最新的数据
			userStore.init().then(() => {
				console.log('用户状态初始化成功', '用户信息:', userStore.user)
				// 主动获取一次用户统计信息
				return userStore.fetchUserStats()
			}).catch(err => {
				console.error('初始化用户状态失败:', err)
			})
		}
		
		// 恢复宠物状态 - 确保方法存在
		if (petStore.restorePetState) {
			petStore.restorePetState()
		} else {
			console.warn('宠物状态恢复方法不存在')
		}

		// 处理请求异常
		uni.addInterceptor('request', {
			fail: (err) => {
				console.error('请求拦截到错误:', err)
				
				// 如果是404错误，提示用户
				if (err.statusCode === 404 || (err.errMsg && err.errMsg.includes('404'))) {
					console.warn('API请求404错误:', err.errMsg)
					uni.showToast({
						title: '网络请求失败，请稍后再试',
						icon: 'none',
						duration: 2000
					})
				}
			}
		})
	},
	onShow: function() {
		console.log('App Show')
		
		// 应用每次显示时，检查用户信息是否正确加载
		const userStore = useUserStore()
		if (uni.getStorageSync('token') && !userStore.user) {
			console.log('App Show: 检测到token但用户信息不存在，尝试重新初始化')
			userStore.init().catch(err => {
				console.error('重新初始化用户状态失败:', err)
			})
		}
		
		// 检查API是否已经初始化
		if (!uni.$api) {
			console.warn('API尚未初始化，尝试重新初始化');
			this.initApi();
		}
	},
	onHide: function() {
		console.log('App Hide')
	},
	methods: {
		// 初始化API
		initApi() {
			try {
				// 确保只初始化一次
				if (!uni.$api) {
					console.log('正在初始化API...');
					uni.$api = api;
					this.globalData.apiReady = true;
					console.log('API初始化成功，当前API对象:', Object.keys(uni.$api));
					
					// 检查关键API部分是否存在
					if (!uni.$api.community) {
						console.warn('社区API不存在，创建空对象');
						uni.$api.community = {
							getPosts: () => Promise.resolve([]),
							getMyPosts: () => Promise.resolve([]),
							createPost: () => Promise.resolve({ success: true }),
							getPostById: () => Promise.resolve(null)
						};
					}
					
					if (!uni.$api.pet) {
						console.warn('宠物API不存在，创建空对象');
						uni.$api.pet = {
							getPets: () => Promise.resolve([]),
							getPetById: () => Promise.resolve(null),
							createPet: () => Promise.resolve({ success: true })
						};
					}
				} else {
					console.log('API已初始化，无需再次初始化');
				}
			} catch (error) {
				console.error('API初始化失败:', error);
				this.globalData.apiReady = false;
				
				// 创建一个空API对象，避免应用崩溃
				uni.$api = {
					community: {
						getPosts: () => Promise.resolve([]),
						getMyPosts: () => Promise.resolve([]),
						createPost: () => Promise.resolve({ success: true }),
						getPostById: () => Promise.resolve(null)
					},
					pet: {
						getPets: () => Promise.resolve([]),
						getPetById: () => Promise.resolve(null),
						createPet: () => Promise.resolve({ success: true })
					},
					auth: {
						login: () => Promise.resolve({ token: 'mock-token' }),
						register: () => Promise.resolve({ success: true }),
						resetPassword: () => Promise.resolve({ success: true })
					}
				};
				
				// 尝试在短时间后重新初始化
				setTimeout(() => {
					this.initApi();
				}, 5000);
			}
		}
	},
	globalData: {
		apiReady: false
	}
}
</script>

<style>
	/*每个页面公共css */
	@import './common/uni.css';
	/* 引入自定义图标库 */
	@import './common/iconfont.css';
	@import 'animate.css'
</style>
