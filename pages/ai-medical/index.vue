<template>
	<view class="ai-medical-container">
		<!-- 顶部导航栏 -->
		<view class="nav-bar">
			<view class="back-btn" @tap="goBack">
				<text class="icon">←</text>
			</view>
			<text class="title">AI宠物医疗助手</text>
		</view>
		
		<!-- 服务类型选择器 -->
		<view class="service-selector" v-if="!chatStarted">
			<view class="selector-title">选择服务类型</view>
			<scroll-view class="service-list" scroll-x="true">
				<view 
					v-for="(service, index) in serviceTypes" 
					:key="index"
					class="service-item"
					:class="{ active: selectedServiceIndex === index }"
					@tap="selectService(index)"
				>
					<text>{{ service.name }}</text>
				</view>
			</scroll-view>
		</view>
		
		<!-- 宠物信息配置表单 -->
		<view class="pet-info-form" v-if="!chatStarted">
			<view class="form-title">填写{{ serviceTypes[selectedServiceIndex].name }}所需信息</view>
			
			<!-- 宠物基本信息，问诊和部分分析服务需要 -->
			<block v-if="currentService.requiresPetInfo">
				<view class="form-item">
					<text class="form-label">宠物昵称</text>
					<input type="text" v-model="petInfo.nick_name" placeholder="请输入宠物昵称" />
				</view>
				
				<view class="form-item">
					<text class="form-label">宠物类型</text>
					<picker @change="onPetTypeChange" :value="petTypeIndex" :range="petTypes">
						<view class="picker-value">{{ petTypes[petTypeIndex] }}</view>
					</picker>
				</view>
				
				<view class="form-item">
					<text class="form-label">出生日期</text>
					<picker mode="date" :value="petInfo.birth" @change="onBirthChange">
						<view class="picker-value">{{ petInfo.birth || '请选择出生日期' }}</view>
					</picker>
				</view>
				
				<view class="form-item">
					<text class="form-label">性别</text>
					<picker @change="onGenderChange" :value="genderIndex" :range="genders">
						<view class="picker-value">{{ genders[genderIndex] }}</view>
					</picker>
				</view>
				
				<view class="form-item">
					<text class="form-label">生育状态</text>
					<picker @change="onFertilityChange" :value="fertilityIndex" :range="fertilityOptions">
						<view class="picker-value">{{ fertilityOptions[fertilityIndex] }}</view>
					</picker>
				</view>
			</block>
			
			<!-- 图片上传区域，非问诊服务需要 -->
			<block v-if="currentService.requiresImage">
				<view class="form-item">
					<text class="form-label">上传图片</text>
					<view class="image-upload-area" @tap="chooseImage">
						<image v-if="imageUrl" :src="imageUrl" mode="aspectFit" class="preview-image"></image>
						<view v-else class="upload-placeholder">
							<text class="upload-icon">+</text>
							<text class="upload-text">点击上传图片</text>
						</view>
					</view>
				</view>
				
				<!-- H5环境下添加图片URL输入选项 -->
				<view class="form-item" v-if="isH5Platform">
					<text class="form-label">或输入图片URL</text>
					<input type="text" v-model="imageUrlInput" placeholder="https://example.com/image.jpg" />
					<view class="url-preview-btn" @tap="previewUrlImage" v-if="imageUrlInput">预览</view>
				</view>
			</block>
			
			<view class="start-chat-btn" @tap="startChat">
				<text>开始{{ currentService.name }}</text>
			</view>
		</view>
		
		<!-- 聊天界面 -->
		<view v-if="chatStarted" class="chat-interface">
			<scroll-view class="chat-container" scroll-y="true" :scroll-top="scrollTop" @scrolltoupper="loadMoreHistory">
				<view class="chat-messages">
					<view v-for="(message, index) in messages" :key="index" class="message-item" :class="message.type">
						<image v-if="message.imageUrl" :src="message.imageUrl" mode="widthFix" class="message-image"></image>
						<view class="message-content">
							<text>{{ message.content }}</text>
						</view>
					</view>
				</view>
			</scroll-view>
			
			<!-- 输入区域 -->
			<view class="input-area">
				<view class="input-box">
					<input 
						type="text" 
						v-model="inputMessage" 
						placeholder="请输入您的问题..." 
						@confirm="sendMessage"
						:disabled="isLoading || !isConsultationService"
					/>
					<view class="send-btn" @tap="sendMessage" :class="{ 'disabled': isLoading || !isConsultationService }">
						<text class="icon">{{ isLoading ? '⌛' : '➤' }}</text>
					</view>
					
					<!-- 图片上传按钮 -->
					<view v-if="isConsultationService" class="upload-btn" @tap="chooseAdditionalImage">
						<text class="icon">📷</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 隐藏的canvas用于图片处理 -->
		<canvas canvas-id="imageCanvas" style="position: absolute; left: -1000px; top: -1000px; width: 100px; height: 100px;"></canvas>
	</view>
</template>

<script>
import { ref, reactive, onMounted, nextTick, computed } from 'vue';
import { generateSignature } from '@/utils/vetmew.js';
import { callVetmewAPI } from '@/utils/vetmewProxy.js';

export default {
	setup() {
		const messages = ref([]);
		const inputMessage = ref('');
		const isLoading = ref(false);
		const scrollTop = ref(0);
		const chatStarted = ref(false);
		const currentConversationId = ref('');
		const imageUrl = ref('');
		const imageBase64 = ref('');
		const imageUrlInput = ref('');
		const selectedServiceIndex = ref(0);
		
		// 检测是否为H5平台
		const isH5Platform = computed(() => {
			// 更可靠的H5环境检测
			const isRealH5 = typeof window !== 'undefined' && typeof document !== 'undefined';
			// 检查uni-app的H5专有属性
			const isUniH5 = typeof uni !== 'undefined' && typeof uni.requireNativePlugin === 'undefined';
			
			try {
				const sysInfo = uni.getSystemInfoSync();
				const platform = sysInfo.platform;
				const uniPlatform = sysInfo.uniPlatform;
				console.log('环境检测 - 平台:', platform, '设备:', sysInfo.model, 'uni平台:', uniPlatform);
				console.log('是否H5环境:', isRealH5, '是否UniApp H5:', isUniH5);
				
				// 如果检测到是在浏览器环境中，即使platform不是web，也认为是H5平台
				return isRealH5 || platform === 'web' || uniPlatform === 'web';
			} catch (e) {
				console.error('获取系统信息失败:', e);
				return isRealH5; // 如果获取失败，根据window和document判断
			}
		});
		
		// 服务类型定义
		const serviceTypes = [
			{ 
				name: '问诊服务', 
				path: '/open/v1/chat', 
				requiresPetInfo: true,
				requiresImage: false,
				isConsultation: true
			},
			{ 
				name: '品种识别', 
				path: '/open/v1/breed-recognition', 
				requiresPetInfo: false,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '情绪分析', 
				path: '/open/v1/emotion-recognition', 
				requiresPetInfo: false,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '粪便分析', 
				path: '/open/v1/feces-recognition', 
				requiresPetInfo: true,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '皮肤分析', 
				path: '/open/v1/skin-recognition', 
				requiresPetInfo: true,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '尿液分析', 
				path: '/open/v1/urine-recognition', 
				requiresPetInfo: true,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '呕吐物分析', 
				path: '/open/v1/vomitus-recognition', 
				requiresPetInfo: true,
				requiresImage: true,
				isConsultation: false
			},
			{ 
				name: '耳道分析', 
				path: '/open/v1/ear-canal-recognition', 
				requiresPetInfo: true,
				requiresImage: true,
				isConsultation: false
			}
		];
		
		// 当前选中的服务信息
		const currentService = computed(() => {
			return serviceTypes[selectedServiceIndex.value];
		});
		
		// 是否为问诊服务（可以持续对话）
		const isConsultationService = computed(() => {
			return currentService.value.isConsultation;
		});
		
		// 宠物类型选择
		const petTypes = ['狗', '猫'];
		const petTypeIndex = ref(0);
		const petBreeds = {
			'狗': 1,
			'猫': 2
		};
		
		// 性别选择
		const genders = ['公', '母'];
		const genderIndex = ref(0);
		const genderValues = {
			'公': 1,
			'母': 2
		};
		
		// 生育状态
		const fertilityOptions = ['未绝育', '已绝育'];
		const fertilityIndex = ref(0);
		const fertilityValues = {
			'未绝育': 1,
			'已绝育': 2
		};
		
		// 宠物信息
		const petInfo = reactive({
			nick_name: '',
			breed: 1, // 默认狗
			birth: '2023-01-01',
			gender: 1, // 默认公
			fertility: 1 // 默认未绝育
		});
		
		// API配置
		const API_KEY = 'vmb1c7f72adc9473f7';
		const API_SECRET = '44yth8axrytm8ux23f53c78bjw3kg20h';
		
		// 返回上一页
		const goBack = () => {
			uni.navigateBack();
		};
		
		// 选择服务
		const selectService = (index) => {
			selectedServiceIndex.value = index;
		};
		
		// 选择图片
		const chooseImage = async () => {
			try {
				const res = await uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera']
				});
				
				if (res.tempFilePaths && res.tempFilePaths.length > 0) {
					imageUrl.value = res.tempFilePaths[0];
					
					// 清空URL输入
					imageUrlInput.value = '';
					
					// H5环境下特殊处理
					if (isH5Platform.value) {
						// 在H5环境下，我们可以直接使用FileReader读取File对象
						try {
							// 获取文件对象
							const fileRes = await uni.chooseFile({
								count: 1,
								extension: ['.png', '.jpg', '.jpeg'],
								type: 'image'
							});
							
							if (fileRes.tempFiles && fileRes.tempFiles.length > 0) {
								const file = fileRes.tempFiles[0];
								
								// 使用FileReader读取为base64
								const reader = new FileReader();
								reader.onload = (e) => {
									const base64 = e.target.result.split(',')[1]; // 去除前缀
									imageBase64.value = base64;
								};
								reader.onerror = () => {
									console.error('读取文件失败');
									uni.showToast({
										title: '图片读取失败，请尝试输入URL',
										icon: 'none'
									});
								};
								reader.readAsDataURL(file);
							}
						} catch (fileError) {
							console.error('H5环境下获取文件失败:', fileError);
							// 如果chooseFile API不可用，使用替代方案
							uni.showToast({
								title: 'H5环境下请使用图片URL或使用App版本',
								icon: 'none'
							});
						}
					} else {
						// 非H5环境转为base64
						const base64 = await imageToBase64(res.tempFilePaths[0]);
						imageBase64.value = base64;
					}
				}
			} catch (error) {
				console.error('选择图片失败:', error);
				uni.showToast({
					title: '选择图片失败，请尝试其他方式',
					icon: 'none'
				});
			}
		};
		
		// 预览URL图片
		const previewUrlImage = () => {
			if (!imageUrlInput.value) return;
			
			// 验证URL格式
			if (!imageUrlInput.value.startsWith('http')) {
				uni.showToast({
					title: '请输入有效的图片URL',
					icon: 'none'
				});
				return;
			}
			
			// 设置图片URL并清空base64数据
			imageUrl.value = imageUrlInput.value;
			imageBase64.value = '';
			
			uni.showToast({
				title: '图片URL已设置',
				icon: 'success'
			});
		};
		
		// 选择额外图片（聊天过程中）
		const chooseAdditionalImage = async () => {
			if (isLoading.value) return;
			
			try {
				const res = await uni.chooseImage({
					count: 1,
					sizeType: ['compressed'],
					sourceType: ['album', 'camera']
				});
				
				if (res.tempFilePaths && res.tempFilePaths.length > 0) {
					const imagePath = res.tempFilePaths[0];
					let base64 = '';
					
					// H5环境下特殊处理
					if (isH5Platform.value) {
						try {
							// 获取文件对象
							const fileRes = await uni.chooseFile({
								count: 1,
								extension: ['.png', '.jpg', '.jpeg'],
								type: 'image'
							});
							
							if (fileRes.tempFiles && fileRes.tempFiles.length > 0) {
								const file = fileRes.tempFiles[0];
								
								// 使用FileReader读取为base64
								const reader = new FileReader();
								reader.onload = (e) => {
									base64 = e.target.result.split(',')[1];
									// 添加图片消息并发送
									addImageMessageAndSend(imagePath, base64);
								};
								reader.onerror = () => {
									console.error('读取文件失败');
									// 失败时也发送，但使用URL方式
									addImageMessageAndSend(imagePath, '');
								};
								reader.readAsDataURL(file);
								return; // 异步处理，提前返回
							}
						} catch (fileError) {
							console.error('H5环境下获取文件失败:', fileError);
							// 使用URL方式
							addImageMessageAndSend(imagePath, '');
							return;
						}
					} else {
						// 非H5环境
						base64 = await imageToBase64(imagePath);
					}
					
					// 添加图片消息并发送
					addImageMessageAndSend(imagePath, base64);
				}
			} catch (error) {
				console.error('选择图片失败:', error);
				uni.showToast({
					title: '选择图片失败',
					icon: 'none',
					duration: 2000
				});
			}
		};
		
		// 添加图片消息并发送请求
		const addImageMessageAndSend = (imagePath, base64) => {
			// 添加图片消息
			messages.value.push({
				type: 'user',
				content: '图片消息',
				imageUrl: imagePath
			});
			
			scrollToBottom();
			
			// 构建带图片的请求
			sendImageMessage(base64, imagePath);
		};
		
		// 将图片转为base64
		const imageToBase64 = (filePath) => {
			return new Promise((resolve, reject) => {
				// 使用计算属性检查是否为H5环境
				if (isH5Platform.value) {
					console.log('检测到H5环境，不转换base64，使用URL方式');
					resolve('');
					return;
				}
				
				// 非H5环境，尝试使用系统API
				try {
					// 检查getFileSystemManager是否可用
					if (typeof uni.getFileSystemManager !== 'function') {
						console.warn('getFileSystemManager不可用，使用URL方式');
						resolve('');
						return;
					}
					
					// 使用uni-app的API读取文件
					uni.getFileSystemManager().readFile({
						filePath: filePath,
						encoding: 'base64',
						success: (res) => {
							console.log('base64转换成功');
							resolve(res.data);
						},
						fail: (err) => {
							console.error('读取图片失败:', err);
							// 读取失败则使用URL方式
							resolve('');
						}
					});
				} catch (error) {
					console.error('转换base64发生错误:', error);
					// 解决方法：如果readFile不可用，使用图片URL
					resolve('');
				}
			});
		};
		
		// 宠物类型变更
		const onPetTypeChange = (e) => {
			petTypeIndex.value = e.detail.value;
			petInfo.breed = petBreeds[petTypes[petTypeIndex.value]];
		};
		
		// 出生日期变更
		const onBirthChange = (e) => {
			petInfo.birth = e.detail.value;
		};
		
		// 性别变更
		const onGenderChange = (e) => {
			genderIndex.value = e.detail.value;
			petInfo.gender = genderValues[genders[genderIndex.value]];
		};
		
		// 生育状态变更
		const onFertilityChange = (e) => {
			fertilityIndex.value = e.detail.value;
			petInfo.fertility = fertilityValues[fertilityOptions[fertilityIndex.value]];
		};
		
		// 开始聊天/分析
		const startChat = () => {
			// 验证必填信息
			if (currentService.value.requiresPetInfo && !petInfo.nick_name) {
				uni.showToast({
					title: '请输入宠物昵称',
					icon: 'none'
				});
				return;
			}
			
			if (currentService.value.requiresImage && !imageBase64.value) {
				uni.showToast({
					title: '请上传图片',
					icon: 'none'
				});
				return;
			}
			
			chatStarted.value = true;
			
			// 如果是图像分析服务，直接发送分析请求
			if (!isConsultationService.value) {
				sendImageAnalysis();
				return;
			}
			
			// 问诊服务添加欢迎消息
			messages.value.push({
				type: 'ai',
				content: `您好！我是您的AI宠物医生助手。请问${petInfo.nick_name}有什么健康问题呢？我会尽力帮助您。`
			});
		};
		
		// 发送图像分析请求
		const sendImageAnalysis = async () => {
			isLoading.value = true;
			
			// 添加用户图片消息
			if (imageUrl.value) {
				messages.value.push({
					type: 'user',
					content: '图片分析请求',
					imageUrl: imageUrl.value
				});
				
				scrollToBottom();
			}
			
			try {
				// 准备请求数据
				const requestBody = {};
				
				// 添加图片数据（优先使用base64）
				if (imageBase64.value) {
					requestBody.image = imageBase64.value;
				} else if (imageUrl.value) {
					// 如果没有base64，使用URL
					// 验证URL格式
					if (imageUrl.value.startsWith('http')) {
						requestBody.url = imageUrl.value;
					} else {
						uni.showToast({
							title: '图片格式不支持，请提供有效URL',
							icon: 'none'
						});
						isLoading.value = false;
						return;
					}
				}
				
				// 添加宠物信息（如果需要）
				if (currentService.value.requiresPetInfo) {
					Object.assign(requestBody, {
						breed: petInfo.breed,
						birth: petInfo.birth,
						gender: petInfo.gender,
						fertility: petInfo.fertility
					});
					
					// 品种识别和情绪分析不需要昵称
					if (currentService.value.name !== '品种识别' && currentService.value.name !== '情绪分析') {
						requestBody.nick_name = petInfo.nick_name;
					}
				}
				
				console.log('准备发送分析请求:', requestBody);
				
				// 调用API
				const apiResponse = await callVetmewAPI(requestBody, {
					apiKey: API_KEY,
					apiSecret: API_SECRET,
					apiPath: currentService.value.path
				});
				
				console.log('API响应:', apiResponse);
				
				// 处理响应
				if (apiResponse && apiResponse.code === 0) {
					// API请求成功
					
					// 格式化响应消息
					let responseMessage = '';
					
					// 判断是否为JSON格式，如果是则进行解析和格式化
					if (typeof apiResponse.data === 'string') {
						try {
							// 尝试解析JSON
							const jsonData = JSON.parse(apiResponse.data);
							// 根据不同服务类型格式化消息
							responseMessage = formatResponseMessage(jsonData, currentService.value.name);
						} catch (e) {
							// 如果不是JSON或解析失败，直接使用原文本
							responseMessage = apiResponse.data || '分析完成';
						}
					} else {
						// 如果已经是对象，直接格式化
						responseMessage = formatResponseMessage(apiResponse.data, currentService.value.name);
					}
					
					// 添加AI回复
					messages.value.push({
						type: 'ai',
						content: responseMessage
					});
				} else {
					// 处理错误
					handleApiError(apiResponse);
				}
			} catch (error) {
				console.error('API调用异常:', error);
				
				messages.value.push({
					type: 'ai',
					content: '网络连接失败，请检查您的网络后重试。'
				});
			} finally {
				isLoading.value = false;
				scrollToBottom();
			}
		};
		
		// 格式化响应消息
		const formatResponseMessage = (data, serviceType) => {
			if (!data) return '分析完成';
			
			// 如果是字符串直接返回
			if (typeof data === 'string') return data;
			
			// 检查是否有text字段(API常见返回格式)
			if (data.text) {
				return data.text;
			}
			
			// 检查是否是嵌套的JSON格式返回
			try {
				// 有些返回可能是字符串形式的数组或对象
				if (Array.isArray(data) && data.length > 0) {
					// 如果是数组，尝试提取第一个元素中的text
					if (data[0].text) {
						return data[0].text;
					}
				}
				
				// 尝试解析contents字段
				if (data.contents) {
					if (typeof data.contents === 'string') {
						return data.contents;
					} else if (Array.isArray(data.contents) && data.contents.length > 0) {
						return data.contents.map(item => item.text || item.content || JSON.stringify(item)).join('\n');
					}
				}
				
				// 尝试解析content字段
				if (data.content) {
					return data.content;
				}
			} catch (e) {
				console.error('解析嵌套JSON出错:', e);
			}
			
			// 根据不同服务类型格式化
			switch (serviceType) {
				case '品种识别':
					if (data.breed) {
						return `识别结果：${data.breed}\n可信度：${(data.confidence * 100).toFixed(2)}%`;
					}
					break;
				case '情绪分析':
					if (data.emotion) {
						return `情绪分析结果：${data.emotion}\n可信度：${(data.confidence * 100).toFixed(2)}%`;
					}
					break;
				case '粪便分析':
				case '皮肤分析':
				case '尿液分析':
				case '呕吐物分析':
				case '耳道分析':
					// 针对这些分析服务，格式化关键信息
					let result = '';
					if (data.conclusion) {
						result += `诊断结论：${data.conclusion}\n\n`;
					}
					if (data.analysis) {
						result += `详细分析：${data.analysis}\n\n`;
					}
					if (data.suggestion) {
						result += `建议：${data.suggestion}`;
					}
					return result || cleanJsonString(data);
			}
			
			// 默认情况下，尝试清理和美化JSON显示
			return cleanJsonString(data);
		};
		
		// 清理并美化JSON字符串，移除多余的引号和格式符号
		const cleanJsonString = (data) => {
			try {
				// 如果是对象，先转为字符串
				let jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
				
				// 尝试解析为对象以便提取关键内容
				let jsonObj;
				try {
					jsonObj = typeof data === 'object' ? data : JSON.parse(jsonStr);
				} catch (e) {
					// 如果解析失败，使用原始字符串
					return jsonStr;
				}
				
				// 尝试提取常见的内容字段
				if (jsonObj.text) return jsonObj.text;
				if (jsonObj.message) return jsonObj.message;
				if (jsonObj.content) return jsonObj.content;
				if (jsonObj.data) return cleanJsonString(jsonObj.data);
				
				// 递归处理深层嵌套的JSON
				if (jsonObj.choices && Array.isArray(jsonObj.choices) && jsonObj.choices.length > 0) {
					const choice = jsonObj.choices[0];
					if (choice.text) return choice.text;
					if (choice.message && choice.message.content) return choice.message.content;
				}
				
				// 如果是简单对象，移除JSON格式符号
				jsonStr = JSON.stringify(jsonObj, null, 2);
				// 移除外层的大括号和引号
				jsonStr = jsonStr.replace(/^{|}$/g, '');
				// 移除每行开头的引号和冒号
				jsonStr = jsonStr.replace(/^\s*"([^"]+)":\s*/gm, '$1: ');
				// 移除多余的逗号
				jsonStr = jsonStr.replace(/,$/gm, '');
				// 移除msg_id等无用信息
				jsonStr = jsonStr.replace(/"msg_id":[^,}]+,?/g, '');
				
				return jsonStr;
			} catch (e) {
				console.error('清理JSON出错:', e);
				// 如果处理出错，返回简单消息
				return '分析完成，请查看结果';
			}
		};
		
		// 发送普通消息
		const sendMessage = async () => {
			if (!inputMessage.value.trim() || isLoading.value || !isConsultationService.value) return;
			
			const userMessage = inputMessage.value.trim();
			inputMessage.value = '';
			
			// 添加用户消息到聊天记录
			messages.value.push({
				type: 'user',
				content: userMessage
			});
			
			// 滚动到底部
			scrollToBottom();
			
			// 显示加载状态
			isLoading.value = true;
			
			try {
				// 准备请求数据
				const requestBody = {
					msg: userMessage,
					breed: petInfo.breed,
					birth: petInfo.birth,
					gender: petInfo.gender,
					nick_name: petInfo.nick_name,
					fertility: petInfo.fertility
				};
				
				// 如果有会话ID，添加到请求中继续对话
				if (currentConversationId.value) {
					requestBody.conversation_id = currentConversationId.value;
					console.log('使用现有会话ID继续对话:', currentConversationId.value);
				}
				
				console.log('准备发送请求:', requestBody);
				
				// 调用API
				const apiResponse = await callVetmewAPI(requestBody, {
					apiKey: API_KEY,
					apiSecret: API_SECRET,
					apiPath: currentService.value.path
				});
				
				console.log('API响应:', apiResponse);
				
				// 处理响应
				if (apiResponse && apiResponse.code === 0) {
					// API请求成功
					
					// 保存会话ID，用于后续对话
					if (apiResponse.conversation_id) {
						currentConversationId.value = apiResponse.conversation_id;
						console.log('保存会话ID:', currentConversationId.value);
					}
					
					// 格式化响应消息
					let responseMessage = '';
					
					// 尝试解析可能的JSON回复
					if (typeof apiResponse.data === 'string') {
						try {
							// 尝试解析JSON
							const jsonData = JSON.parse(apiResponse.data);
							responseMessage = formatResponseMessage(jsonData, currentService.value.name);
						} catch (e) {
							// 如果不是JSON或解析失败，直接使用原文本
							responseMessage = apiResponse.data || '我正在分析您的问题...';
						}
					} else {
						// 如果已经是对象，直接格式化
						responseMessage = formatResponseMessage(apiResponse.data, currentService.value.name);
					}
					
					// 添加AI回复
					messages.value.push({
						type: 'ai',
						content: responseMessage
					});
				} else {
					// 处理错误
					handleApiError(apiResponse);
				}
			} catch (error) {
				console.error('API调用异常:', error);
				
				messages.value.push({
					type: 'ai',
					content: '网络连接失败，请检查您的网络后重试。'
				});
			} finally {
				isLoading.value = false;
				scrollToBottom();
			}
		};
		
		// 发送带图片的消息
		const sendImageMessage = async (base64, imagePathUrl = '') => {
			if (isLoading.value) return;
			
			// 显示加载状态
			isLoading.value = true;
			
			try {
				// 准备请求数据
				const requestBody = {
					breed: petInfo.breed,
					birth: petInfo.birth,
					gender: petInfo.gender,
					nick_name: petInfo.nick_name,
					fertility: petInfo.fertility
				};
				
				// 添加图片数据
				if (base64 && base64.length > 0) {
					requestBody.image = base64;
				} else if (imagePathUrl && imagePathUrl.startsWith('http')) {
					// 使用传入的图片URL
					requestBody.url = imagePathUrl;
				} else if (imageUrl.value && imageUrl.value.startsWith('http')) {
					// 使用已有的图片URL
					requestBody.url = imageUrl.value;
				} else {
					// 如果没有可用的图片数据
					uni.showToast({
						title: '无法处理图片，请尝试输入URL',
						icon: 'none'
					});
					isLoading.value = false;
					return;
				}
				
				// 如果有会话ID，添加到请求中继续对话
				if (currentConversationId.value) {
					requestBody.conversation_id = currentConversationId.value;
				}
				
				console.log('准备发送图片请求');
				
				// 调用API
				const apiResponse = await callVetmewAPI(requestBody, {
					apiKey: API_KEY,
					apiSecret: API_SECRET,
					apiPath: currentService.value.path
				});
				
				console.log('API响应:', apiResponse);
				
				// 处理响应
				if (apiResponse && apiResponse.code === 0) {
					// API请求成功
					
					// 保存会话ID，用于后续对话
					if (apiResponse.conversation_id) {
						currentConversationId.value = apiResponse.conversation_id;
					}
					
					// 格式化响应消息
					let responseMessage = '';
					
					// 尝试解析可能的JSON回复
					if (typeof apiResponse.data === 'string') {
						try {
							// 尝试解析JSON
							const jsonData = JSON.parse(apiResponse.data);
							responseMessage = formatResponseMessage(jsonData, currentService.value.name);
						} catch (e) {
							// 如果不是JSON或解析失败，直接使用原文本
							responseMessage = apiResponse.data || '我已分析您上传的图片...';
						}
					} else {
						// 如果已经是对象，直接格式化
						responseMessage = formatResponseMessage(apiResponse.data, currentService.value.name);
					}
					
					// 添加AI回复
					messages.value.push({
						type: 'ai',
						content: responseMessage
					});
				} else {
					// 处理错误
					handleApiError(apiResponse);
				}
			} catch (error) {
				console.error('图片API调用异常:', error);
				
				messages.value.push({
					type: 'ai',
					content: '图片处理失败，请稍后重试。'
				});
			} finally {
				isLoading.value = false;
				scrollToBottom();
			}
		};
		
		// 处理API错误
		const handleApiError = (apiResponse) => {
			let errorMsg = '抱歉，我遇到了一些问题，请稍后再试。';
			
			if (apiResponse && apiResponse.code) {
				switch (apiResponse.code) {
					case 6001:
						errorMsg = '无效的API密钥，请联系管理员。';
						break;
					case 6002:
						errorMsg = '调用过于频繁，请稍后再试。';
						break;
					case 6003:
						errorMsg = '调用次数不足，请联系管理员。';
						break;
					case 6004:
					case 6005:
						errorMsg = '签名验证失败，请联系管理员。';
						break;
					case 6006:
						errorMsg = '请求参数无效，请检查输入。';
						break;
					case 6007:
						errorMsg = '会话已结束，请重新开始对话。';
						break;
					case 6008:
						errorMsg = '系统正忙，请稍后再试。';
						break;
					case 6009:
						errorMsg = '您的输入包含敏感词汇，请调整后重试。';
						break;
					case 9999:
						// 如果有原始响应，尝试解析它以获取更多信息
						if (apiResponse.rawResponse) {
							console.log('原始错误响应:', apiResponse.rawResponse);
							// 尝试提取有用信息
							if (apiResponse.rawResponse.includes('<!DOCTYPE html>')) {
								errorMsg = '服务器返回了HTML页面而不是API响应，可能是代理配置错误或服务器异常。';
							} else {
								errorMsg = '服务器返回格式错误，请联系管理员。';
							}
						} else {
							errorMsg = `服务器连接失败: ${apiResponse.message}`;
						}
						break;
					default:
						errorMsg = `服务器返回错误: ${apiResponse.code || '未知错误'}`;
				}
			}
			
			messages.value.push({
				type: 'ai',
				content: errorMsg
			});
			
			console.error('API请求错误:', apiResponse);
		};
		
		// 滚动到底部
		const scrollToBottom = () => {
			nextTick(() => {
				scrollTop.value = 999999;
			});
		};
		
		// 加载更多历史记录
		const loadMoreHistory = () => {
			// TODO: 实现历史记录加载
		};
		
		return {
			messages,
			inputMessage,
			isLoading,
			scrollTop,
			chatStarted,
			petInfo,
			petTypes,
			petTypeIndex,
			genders,
			genderIndex,
			fertilityOptions,
			fertilityIndex,
			imageUrl,
			imageUrlInput,
			isH5Platform,
			serviceTypes,
			selectedServiceIndex,
			currentService,
			isConsultationService,
			goBack,
			sendMessage,
			loadMoreHistory,
			onPetTypeChange,
			onBirthChange,
			onGenderChange,
			onFertilityChange,
			startChat,
			selectService,
			chooseImage,
			chooseAdditionalImage,
			previewUrlImage
		};
	}
};
</script>

<style>
.ai-medical-container {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background-color: #f5f5f5;
}

.nav-bar {
	display: flex;
	align-items: center;
	padding: 20rpx;
	background-color: #ffffff;
	border-bottom: 1rpx solid #e5e5e5;
}

.back-btn {
	padding: 10rpx;
}

.back-btn .icon {
	font-size: 40rpx;
	color: #333;
}

.title {
	flex: 1;
	text-align: center;
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

/* 服务选择器样式 */
.service-selector {
	padding: 20rpx;
	background-color: #ffffff;
	margin: 20rpx 20rpx 0 20rpx;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.selector-title {
	font-size: 30rpx;
	font-weight: bold;
	margin-bottom: 20rpx;
	color: #333;
}

.service-list {
	white-space: nowrap;
}

.service-item {
	display: inline-block;
	padding: 15rpx 30rpx;
	background-color: #f5f5f5;
	margin-right: 15rpx;
	border-radius: 30rpx;
	font-size: 26rpx;
	color: #666;
}

.service-item.active {
	background-color: #007AFF;
	color: #ffffff;
}

/* 宠物信息表单样式 */
.pet-info-form {
	flex: 1;
	padding: 30rpx;
	background-color: #ffffff;
	margin: 20rpx;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
	overflow-y: auto;
}

.form-title {
	font-size: 34rpx;
	font-weight: bold;
	margin-bottom: 30rpx;
	color: #333;
	text-align: center;
}

.form-item {
	margin-bottom: 30rpx;
}

.form-label {
	display: block;
	font-size: 28rpx;
	color: #666;
	margin-bottom: 10rpx;
}

.form-item input {
	width: 100%;
	height: 80rpx;
	background-color: #f5f5f5;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
}

.picker-value {
	width: 100%;
	height: 80rpx;
	background-color: #f5f5f5;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	line-height: 80rpx;
}

/* 图片上传区域 */
.image-upload-area {
	width: 100%;
	height: 400rpx;
	background-color: #f5f5f5;
	border-radius: 8rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.upload-placeholder {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.upload-icon {
	font-size: 80rpx;
	color: #999;
	margin-bottom: 10rpx;
}

.upload-text {
	font-size: 28rpx;
	color: #999;
}

.preview-image {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.start-chat-btn {
	background-color: #007AFF;
	color: #ffffff;
	height: 90rpx;
	border-radius: 45rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: bold;
	margin-top: 40rpx;
}

/* 聊天界面样式 */
.chat-interface {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.chat-container {
	flex: 1;
	padding: 20rpx;
}

.chat-messages {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
	padding-bottom: 20rpx;
}

.message-item {
	max-width: 75%;
	padding: 20rpx;
	border-radius: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.message-item.user {
	align-self: flex-end;
	background-color: #007AFF;
	margin-right: 20rpx;
	border-bottom-right-radius: 4rpx;
}

.message-item.ai {
	align-self: flex-start;
	background-color: #ffffff;
	margin-left: 20rpx;
	border-bottom-left-radius: 4rpx;
}

.message-content {
	font-size: 28rpx;
	line-height: 40rpx;
	word-break: break-word;
	color: #333;
}

.message-image {
	width: 100%;
	max-width: 500rpx;
	border-radius: 10rpx;
	margin-bottom: 10rpx;
}

.user .message-content {
	color: #ffffff;
}

.input-area {
	padding: 20rpx;
	background-color: #ffffff;
	border-top: 1rpx solid #e5e5e5;
}

.input-box {
	display: flex;
	align-items: center;
	background-color: #f5f5f5;
	border-radius: 40rpx;
	padding: 10rpx 20rpx;
}

.input-box input {
	flex: 1;
	height: 60rpx;
	font-size: 28rpx;
}

.send-btn, .upload-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.send-btn .icon, .upload-btn .icon {
	font-size: 40rpx;
	color: #007AFF;
}

.send-btn.disabled .icon {
	color: #999;
}

/* 添加URL预览按钮样式 */
.url-preview-btn {
	margin-top: 10rpx;
	background-color: #f0f0f0;
	padding: 10rpx 20rpx;
	border-radius: 8rpx;
	text-align: center;
	font-size: 28rpx;
	color: #007AFF;
}

/* 暗黑模式适配 */
@media (prefers-color-scheme: dark) {
	.ai-medical-container {
		background-color: #1c1c1e;
	}
	
	.nav-bar {
		background-color: #2c2c2e;
		border-bottom-color: #3c3c3e;
	}
	
	.back-btn .icon {
		color: #ffffff;
	}
	
	.title {
		color: #ffffff;
	}
	
	.service-selector, .pet-info-form {
		background-color: #2c2c2e;
		box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.3);
	}
	
	.selector-title, .form-title {
		color: #ffffff;
	}
	
	.service-item {
		background-color: #3c3c3e;
		color: #dddddd;
	}
	
	.service-item.active {
		background-color: #0A84FF;
	}
	
	.form-label {
		color: #bbbbbb;
	}
	
	.form-item input, .picker-value, .image-upload-area {
		background-color: #3c3c3e;
		color: #ffffff;
	}
	
	.upload-icon, .upload-text {
		color: #bbbbbb;
	}
	
	.message-item.ai {
		background-color: #2c2c2e;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.3);
	}
	
	.message-content {
		color: #ffffff;
	}
	
	.input-area {
		background-color: #2c2c2e;
		border-top-color: #3c3c3e;
	}
	
	.input-box {
		background-color: #3c3c3e;
	}
	
	.input-box input {
		color: #ffffff;
	}
	
	.url-preview-btn {
		background-color: #3c3c3e;
		color: #0A84FF;
	}
}
</style> 