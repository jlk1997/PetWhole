<template>
	<view class="marker-form-container">
		<view class="form-header">
			<text class="form-title">添加地图标记/故事</text>
		</view>
		
		<view class="form-content">
			<view class="form-item">
				<text class="form-label">标记标题<text class="required">*</text></text>
				<input class="form-input" type="text" v-model="markerData.title" placeholder="请输入标记标题" maxlength="50" />
			</view>
			
			<view class="form-item">
				<text class="form-label">标记描述</text>
				<textarea class="form-textarea" v-model="markerData.description" placeholder="请输入标记描述" maxlength="200" />
			</view>
			
			<!-- 图片上传区域 -->
			<view class="form-item">
				<text class="form-label">上传图片</text>
				<view class="image-upload-area">
					<!-- 显示明确的上传按钮 -->
					<view class="upload-button" @click="openFilePicker" v-if="markerData.images.length === 0">
						<uni-icons type="camera-filled" size="24" color="#007AFF"></uni-icons>
						<text class="upload-text">点击上传图片</text>
					</view>
					
					<uni-file-picker
						ref="filePicker"
						v-model="imageFiles"
						fileMediatype="image"
						mode="grid"
						:limit="9"
						@select="handleImageSelect"
						@delete="handleImageDelete">
					</uni-file-picker>
					
					<!-- 已上传图片预览和描述 -->
					<view class="uploaded-images" v-if="markerData.images && markerData.images.length > 0">
						<view class="image-item" v-for="(img, index) in markerData.images" :key="index">
							<image 
								:src="img.url" 
								mode="aspectFill" 
								class="preview-image"
								@click="previewImage(index)">
							</image>
							<input 
								type="text" 
								v-model="img.caption" 
								placeholder="请输入图片描述(可选)" 
								class="image-caption-input" />
							<view class="image-actions">
								<view class="delete-btn" @click="removeImage(index)">
									<uni-icons type="trash" size="18"></uni-icons>
								</view>
							</view>
						</view>
						
						<!-- 添加更多图片的按钮 -->
						<view class="add-more-btn" @click="openFilePicker" v-if="markerData.images.length < 9">
							<uni-icons type="plus" size="20" color="#007AFF"></uni-icons>
							<text>添加更多图片</text>
						</view>
					</view>
				</view>
			</view>
			
			<view class="form-item">
				<text class="form-label">标记类型</text>
				<view class="marker-type-selector">
					<view 
						v-for="(type, index) in markerTypes" 
						:key="index" 
						class="marker-type-item" 
						:class="{ active: markerData.type === type.value }"
						@tap="selectMarkerType(type.value)"
					>
						<view class="marker-type-icon" :style="{ backgroundColor: type.color || '#007AFF' }">
							<image v-if="!type.icon.startsWith('data:')" :src="type.icon" class="type-icon" mode="aspectFit"></image>
							<image v-else :src="type.icon" class="type-icon svg-icon" mode="aspectFit"></image>
					</view>
						<text class="marker-type-label">{{ type.label }}</text>
					</view>
				</view>
			</view>
			
			<!-- 自定义类型名称输入 -->
			<view class="form-item" v-if="markerData.type === 'custom'">
				<text class="form-label">自定义类型名称</text>
				<input class="form-input" type="text" v-model="markerData.customTypeName" placeholder="请输入自定义类型名称" maxlength="20" />
			</view>
			
			<view class="form-item">
				<text class="form-label">标记颜色</text>
				<view class="color-selector">
					<view 
						v-for="(color, index) in colorOptions" 
						:key="index" 
						class="color-item" 
						:style="{ backgroundColor: color }"
						:class="{ active: markerData.color === color }"
						@tap="selectColor(color)"
					></view>
				</view>
			</view>
			
			<!-- 添加标记半径字段 -->
			<view class="form-item">
				<text class="form-label">覆盖半径 (千米)</text>
				<slider 
					class="radius-slider" 
					:min="0.1" 
					:max="10" 
					:step="0.1" 
					:value="markerData.radius" 
					:show-value="true" 
					@change="handleRadiusChange"
				/>
				<text class="radius-value">{{ markerData.radius }}km</text>
			</view>
			
			<view class="form-item checkbox-item">
				<checkbox :checked="markerData.isPublic" @tap="togglePublic" />
				<text class="checkbox-label">公开此标记（允许其他用户看到）</text>
			</view>
			
			<view class="form-item" v-if="myPets.length > 0">
				<text class="form-label">关联宠物</text>
				<picker class="form-picker" :range="myPets" range-key="name" @change="handlePetChange">
					<view class="picker-value">
						{{ getSelectedPetName() }}
					</view>
				</picker>
			</view>
			
			<view class="form-location">
				<text class="location-label">位置信息</text>
				<view class="location-info">
					<text class="location-coordinates">经度: {{ markerData.longitude.toFixed(6) }}, 纬度: {{ markerData.latitude.toFixed(6) }}</text>
					<text class="location-hint">点击下方地图可直接标记位置，或拖动标记点调整位置</text>
				</view>
				
				<view class="location-map">
					<!-- 地图区域 -->
					<map 
						id="marker-preview-map"
						class="mini-map"
						:latitude="markerData.latitude"
						:longitude="markerData.longitude"
						:markers="markers"
						:circles="[mapCircle]"
						scale="16"
						@tap="handleMapTap"
						@markerdrag="handleMarkerDrag"
						show-location
					></map>
					
					<!-- 位置说明 -->
					<view class="map-overlay-tips">
						<text>点击地图任意位置 或 长按标记进行拖动</text>
					</view>
					
					<!-- 定位按钮 -->
					<view class="map-controls">
						<view class="map-control-btn" @tap="moveToMarker">
							<text class="map-control-text">定位到标记</text>
						</view>
					</view>
				</view>
			</view>
		</view>
		
		<view class="form-actions">
			<button class="btn btn-cancel" @tap="cancel">取消</button>
			<button class="btn btn-submit" @tap="submitMarker">保存</button>
		</view>
	</view>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useUserStore } from '@/store/user.js';
import { usePetStore } from '@/store/pet.js';
import { useMarkerStore } from '@/stores/markerStore.js';
import request from '@/utils/request.js';
import MarkerService from '@/utils/markerService.js';
import { markerIconsBase64, markerColors } from '@/static/images/marker-icons.js';

export default {
	setup() {
		const userStore = useUserStore();
		const petStore = usePetStore();
		const markerStore = useMarkerStore();
		
		// 从页面参数或当前位置获取初始位置
		const getInitialLocation = () => {
			const pages = getCurrentPages();
			const currentPage = pages[pages.length - 1];
			const params = currentPage.options || {};
			
			// 默认位置
			let defaultLocation = {
				latitude: 39.9087,
				longitude: 116.3975
			};
			
			// 尝试使用传入的参数
			if (params.latitude && params.longitude) {
				return {
					latitude: parseFloat(params.latitude),
					longitude: parseFloat(params.longitude)
				};
			} 
			
			// 如果没有传入参数，尝试获取当前位置
			return new Promise((resolve) => {
				uni.getLocation({
					type: 'gcj02',
					success: (res) => {
						console.log('获取当前位置成功:', res);
						resolve({
							latitude: res.latitude,
							longitude: res.longitude
						});
					},
					fail: (err) => {
						console.error('获取当前位置失败:', err);
						resolve(defaultLocation);
					}
				});
			});
		};
		
		// 标记数据
		const markerData = reactive({
			title: '',
			description: '',
			type: 'general',
			customTypeName: '',
			color: '#FF5733',
			isPublic: true,
			latitude: 39.9087,
			longitude: 116.3975,
			radius: 1.0, // 默认半径1公里
			pet: null,
			images: [] // 添加图片数组
		});
		
		// 用于文件选择器的临时文件数组
		const imageFiles = ref([]);
		
		// 初始化位置并添加标记
		onMounted(async () => {
			try {
				const location = await getInitialLocation();
				markerData.latitude = location.latitude;
				markerData.longitude = location.longitude;
				
				// 获取宠物列表
				fetchMyPets();
				
				// 确保地图加载完成后标记可见
				setTimeout(() => {
					const mapContext = uni.createMapContext('marker-preview-map');
					if (mapContext) {
						mapContext.moveToLocation({
							latitude: markerData.latitude,
							longitude: markerData.longitude
						});
					}
				}, 500);
			} catch (error) {
				console.error('初始化位置失败:', error);
			}
		});
		
		// 标记类型选项与对应图标
		const markerTypes = [
			{ value: 'general', label: '一般标记', icon: markerIconsBase64.general || '/static/images/marker.png', color: markerColors.general || '#FF5733' },
			{ value: 'pet_friendly', label: '宠物友好', icon: markerIconsBase64.pet_friendly || '/static/images/pet-marker.png', color: markerColors.pet_friendly || '#34A853' },
			{ value: 'danger', label: '危险区域', icon: markerIconsBase64.danger || '/static/images/danger-marker.png', color: markerColors.danger || '#EA4335' },
			{ value: 'scenic', label: '风景优美', icon: markerIconsBase64.scenic || '/static/images/park-marker.png', color: markerColors.scenic || '#4285F4' },
			{ value: 'pet_service', label: '宠物服务', icon: markerIconsBase64.pet_service || '/static/images/shop-marker.png', color: markerColors.pet_service || '#FF7F50' },
			{ value: 'custom', label: '自定义', icon: markerIconsBase64.custom || '/static/images/marker.png', color: markerColors.custom || '#9370DB' }
		];
		
		// 获取当前选中的标记类型标签
		const getSelectedTypeLabel = () => {
			if (markerData.type === 'custom' && markerData.customTypeName) {
				return `自定义: ${markerData.customTypeName}`;
			}
			const selectedType = markerTypes.find(type => type.value === markerData.type);
			return selectedType ? selectedType.label : '请选择标记类型';
		};
		
		// 获取当前选中的标记类型图标
		const getSelectedTypeIcon = () => {
			const selectedType = markerTypes.find(type => type.value === markerData.type);
			return selectedType ? selectedType.icon : '/static/images/marker.png';
		};
		
		// 颜色选项
		const colorOptions = [
			'#FF5733', // 红色
			'#33FF57', // 绿色
			'#3357FF', // 蓝色
			'#FF33F5', // 粉色
			'#F5FF33', // 黄色
			'#33FFF5'  // 青色
		];
		
		// 处理半径变更
		const handleRadiusChange = (e) => {
			markerData.radius = parseFloat(parseFloat(e.detail.value).toFixed(2));
		};
		
		// 地图标记数组，使用数组形式便于直接绑定
		const markers = computed(() => [
			{
			id: 1,
				latitude: markerData.latitude,
				longitude: markerData.longitude,
				iconPath: getSelectedTypeIcon() || '/static/images/marker.png',
				width: 40,
				height: 40,
				anchor: {
					x: 0.5,
					y: 1.0
				},
				callout: {
					content: '长按可拖动',
					color: '#000000',
					fontSize: 12,
					borderRadius: 4,
					padding: 5,
					display: 'ALWAYS'
				},
				// 确保标记可拖动
				draggable: true
			}
		]);
		
		// 地图上的圆形覆盖区域
		const mapCircle = computed(() => ({
			latitude: markerData.latitude,
			longitude: markerData.longitude,
			color: markerData.color + '33', // 添加透明度
			fillColor: markerData.color + '33', // 添加透明度
			radius: markerData.radius * 1000, // 转换为米
			strokeWidth: 2,
			strokeColor: markerData.color
		}));
		
		// 获取用户的宠物列表
		const myPets = ref([]);
		const fetchMyPets = async () => {
			const pets = await petStore.fetchPets();
			myPets.value = pets;
		};
		
		// 获取选中的宠物名称
		const getSelectedPetName = () => {
			if (!markerData.pet) return '请选择关联宠物';
			const selectedPet = myPets.value.find(pet => pet._id === markerData.pet);
			return selectedPet ? selectedPet.name : '请选择关联宠物';
		};
		
		// 选择标记类型
		const selectMarkerType = (typeValue) => {
			markerData.type = typeValue;
			// 如果不是自定义类型，清空自定义类型名称
			if (markerData.type !== 'custom') {
				markerData.customTypeName = '';
			}
		};
		
		// 处理宠物选择变更
		const handlePetChange = (e) => {
			const index = e.detail.value;
			markerData.pet = myPets.value[index]._id;
		};
		
		// 选择颜色
		const selectColor = (colorValue) => {
			markerData.color = colorValue;
		};
		
		// 切换公开状态
		const togglePublic = () => {
			markerData.isPublic = !markerData.isPublic;
		};
		
		// 处理地图点击
		const handleMapTap = (e) => {
			console.log('地图点击原始事件:', e);
			
			// 在uni-app中，地图点击事件的坐标在e.detail中
			if (e && e.detail) {
				console.log('点击详情:', e.detail);
				
				// 有些平台可能在detail下有x, y而非latitude, longitude
				if (typeof e.detail.x === 'number' && typeof e.detail.y === 'number') {
					// 将屏幕坐标转换为地理坐标
					const mapContext = uni.createMapContext('marker-preview-map');
					// 注意：有些平台上mapContext可能没有screenToMap方法
					if (mapContext && typeof mapContext.fromScreenLocation === 'function') {
						mapContext.fromScreenLocation({
							x: e.detail.x,
							y: e.detail.y,
							success: (res) => {
								updateMarkerPosition(res.latitude, res.longitude);
							},
							fail: (err) => {
								console.error('坐标转换失败:', err);
								showPositioningError();
							}
						});
						return;
					}
				}
			}
			
			// 降级方案：直接尝试不同的属性路径获取坐标
			let latitude, longitude;
			
			// 尝试方案1: e.detail直接包含经纬度
			if (e.detail && typeof e.detail.latitude === 'number' && typeof e.detail.longitude === 'number') {
				latitude = e.detail.latitude;
				longitude = e.detail.longitude;
			} 
			// 尝试方案2: 在e本身上
			else if (typeof e.latitude === 'number' && typeof e.longitude === 'number') {
				latitude = e.latitude;
				longitude = e.longitude;
			}
			// 尝试方案3: 可能在target上
			else if (e.target && typeof e.target.latitude === 'number' && typeof e.target.longitude === 'number') {
				latitude = e.target.latitude;
				longitude = e.target.longitude;
			}
			// 尝试方案4: 嵌套在更深层的位置
			else if (e.detail && e.detail.target && typeof e.detail.target.latitude === 'number' && typeof e.detail.target.longitude === 'number') {
				latitude = e.detail.target.latitude;
				longitude = e.detail.target.longitude;
			}
			
			if (latitude && longitude) {
				updateMarkerPosition(latitude, longitude);
			} else {
				// 使用备用方法：获取地图中心位置
				setTimeout(() => {
					const mapContext = uni.createMapContext('marker-preview-map');
					if (mapContext && typeof mapContext.getCenterLocation === 'function') {
						mapContext.getCenterLocation({
							success: (res) => {
								if (res.latitude && res.longitude) {
									updateMarkerPosition(res.latitude, res.longitude);
									uni.showToast({
										title: '已使用地图中心位置',
										icon: 'none',
										duration: 1500
									});
								}
							}
						});
					} else {
						showPositioningError();
					}
				}, 100);
			}
		};
		
		// 处理标记拖动事件 
		const handleMarkerDrag = (e) => {
			console.log('标记拖动事件:', e);
			
			// 标准路径
			if (e.detail && typeof e.detail.latitude === 'number' && typeof e.detail.longitude === 'number') {
				updateMarkerPosition(e.detail.latitude, e.detail.longitude);
				return;
			}
			
			// 备用路径：某些平台可能有不同的结构
			if (e.markerId === 1) {
				let latitude, longitude;
				
				// 尝试多种可能的路径
				if (e.latitude && e.longitude) {
					latitude = e.latitude;
					longitude = e.longitude;
				} else if (e.target && e.target.latitude && e.target.longitude) {
					latitude = e.target.latitude;
					longitude = e.target.longitude;
				}
				
				if (latitude && longitude) {
					updateMarkerPosition(latitude, longitude);
				}
			}
		};
		
		// 更新标记位置的通用方法
		const updateMarkerPosition = (latitude, longitude) => {
			console.log('更新标记位置:', latitude, longitude);
			
			// 设置标记位置
			markerData.latitude = latitude;
				markerData.longitude = longitude;
			
			// 更新地图视图以聚焦标记
			setTimeout(() => {
				const mapContext = uni.createMapContext('marker-preview-map');
				if (mapContext) {
					mapContext.moveToLocation({
						latitude,
						longitude
					});
				}
			}, 100);
			
			// 显示提示
			uni.showToast({
				title: '位置已更新',
				icon: 'success',
				duration: 1500
			});
		};
		
		// 显示定位错误
		const showPositioningError = () => {
			uni.showToast({
				title: '无法确定位置，请尝试拖动标记',
				icon: 'none',
				duration: 2000
			});
		};
		
		// 移动到标记位置
		const moveToMarker = () => {
			const mapContext = uni.createMapContext('marker-preview-map');
			mapContext.moveToLocation({
				latitude: markerData.latitude,
				longitude: markerData.longitude,
				success: () => {
					uni.showToast({
						title: '已定位到标记',
						icon: 'success',
						duration: 1500
					});
				}
			});
		};
		
		// 计算两点之间的距离（单位：公里）
		const calculateDistance = (lat1, lon1, lat2, lon2) => {
			if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
			
			const R = 6371; // 地球半径，单位公里
			const dLat = deg2rad(lat2 - lat1);
			const dLon = deg2rad(lon2 - lon1);
			
			const a = 
				Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
				Math.sin(dLon/2) * Math.sin(dLon/2);
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
			return R * c;
		};
		
		// 将角度转换为弧度
		const deg2rad = (deg) => {
			return deg * (Math.PI/180);
		};
		
		// 处理图片选择
		function handleImageSelect(e) {
			console.log('选择图片：', e);
			
			// 将新选择的图片添加到markerData.images
			const newImages = e.tempFilePaths.map((path, index) => ({
				url: path,
				file: path,
				caption: '',
				name: e.tempFiles[index].name || `图片${markerData.images.length + index + 1}`
			}));
			
			markerData.images.push(...newImages);
		}

		// 处理图片删除
		function handleImageDelete(e) {
			console.log('删除图片：', e);
			// 由于这是文件选择器的删除事件，我们不直接处理
			// 图片的真正删除在removeImage方法中处理
		}

		// 移除图片
		function removeImage(index) {
			markerData.images.splice(index, 1);
		}

		// 预览图片
		function previewImage(index) {
			const urls = markerData.images.map(img => img.url);
			uni.previewImage({
				urls,
				current: index
			});
		}
		
		// 打开文件选择器
		function openFilePicker() {
			// 直接使用系统原生选择器，这是在uni-app中最可靠的方式
			uni.chooseImage({
				count: 9 - markerData.images.length, // 最多9张
				sizeType: ['original', 'compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					// 手动调用处理函数
					handleImageSelect({
						tempFilePaths: res.tempFilePaths,
						tempFiles: res.tempFiles
					});
				},
				fail: (err) => {
					console.error('选择图片失败:', err);
					uni.showToast({
						title: '选择图片失败',
						icon: 'none'
					});
				}
			});
		}
		
		// 提交表单
		const submitMarker = async () => {
			if (!markerData.title) {
				uni.showToast({
					title: '请输入标记标题',
					icon: 'none'
				});
				return;
			}
			
			// 如果是自定义类型，需要验证输入自定义类型名称
			if (markerData.type === 'custom' && !markerData.customTypeName.trim()) {
				uni.showToast({
					title: '请输入自定义类型名称',
					icon: 'none'
				});
				return;
			}
			
			// 检查网络状态
			try {
				const networkType = await new Promise((resolve, reject) => {
					uni.getNetworkType({
						success: (res) => resolve(res.networkType),
						fail: (err) => reject(err)
					});
				});
				
				if (networkType === 'none') {
					uni.showModal({
						title: '网络错误',
						content: '您当前无网络连接，无法保存标记。请检查网络设置后重试。',
						showCancel: false
					});
					return;
				}
			} catch (error) {
				console.error('获取网络状态失败:', error);
				// 继续执行，由API调用处理可能的错误
			}
			
			// 处理图片上传
			let uploadedImages = [];
			if (markerData.images && markerData.images.length > 0) {
				try {
					// 显示上传进度
					uni.showLoading({
						title: '正在上传图片...',
						mask: true
					});
					
					// 逐个上传图片以避免并发问题
					for (let i = 0; i < markerData.images.length; i++) {
						const img = markerData.images[i];
						
						// 如果已经是服务器URL，不需要重新上传
						if (img.url && !img.file) {
							uploadedImages.push({
								url: img.url,
								caption: img.caption || ''
							});
							continue;
						}
						
						// 更新进度提示
						uni.showLoading({
							title: `上传图片 ${i+1}/${markerData.images.length}`,
							mask: true
						});
						
						// 检查文件是否存在
						if (!img.file) {
							console.error(`图片 ${i+1} 文件路径不存在`);
							throw new Error(`图片 ${i+1} 文件路径不存在`);
						}
						
						// 打印更多文件信息以便调试
						console.log(`准备上传图片 ${i+1}:`, img.file);
						
						// 使用简化的方式直接提交表单数据
						try {
							let uploadResult = null;
							
							// 直接使用备用上传方式
							uploadResult = await new Promise((resolve, reject) => {
								const uploadTask = uni.uploadFile({
									url: '/api/markers/upload-fallback',
									filePath: img.file,
									name: 'image',
									formData: {
										type: markerData.type || 'default'
									},
									success: (res) => {
										if (res.statusCode === 200) {
											try {
												const data = JSON.parse(res.data);
												resolve(data);
											} catch (e) {
												reject(new Error('解析响应数据失败'));
											}
										} else {
											reject(new Error(`上传失败，状态码: ${res.statusCode}`));
										}
									},
									fail: (err) => {
										reject(new Error(`备用上传失败: ${err.errMsg || '未知错误'}`));
									}
								});
								
								// 监控上传进度
								uploadTask.onProgressUpdate((res) => {
									console.log(`上传进度 ${i+1}/${markerData.images.length}: ${res.progress}%`);
								});
							});
							
							if (uploadResult && uploadResult.success) {
								uploadedImages.push({
									url: uploadResult.url,
									caption: img.caption || ''
								});
								console.log(`图片 ${i+1} 上传成功:`, uploadResult);
							} else {
								throw new Error(uploadResult?.message || '上传失败');
							}
						} catch (err) {
							console.error(`图片 ${i+1} 上传失败:`, err);
							throw new Error(`图片 ${i+1} 上传失败: ${err.message}`);
						}
					}
					
					console.log('所有图片上传完成:', uploadedImages);
				} catch (error) {
					console.error('图片上传失败:', error);
					uni.hideLoading();
					uni.showModal({
						title: '图片上传失败',
						content: error.message || '上传图片时出错，请重试',
						showCancel: false
					});
					return;
				}
			}
			
			// 准备提交的数据
			const markerForSubmit = {
				title: markerData.title,
				description: markerData.description,
				type: markerData.type,
				icon: getSelectedTypeIcon(), // 确保图标信息被保存
				color: markerData.color,
				longitude: markerData.longitude,
				latitude: markerData.latitude,
				radius: parseFloat(parseFloat(markerData.radius).toFixed(2)), // 确保半径保留2位小数
				isPublic: markerData.isPublic,
				properties: {}, // 添加属性对象
				images: uploadedImages // 添加上传好的图片
			};
			
			// 记录完整的标记数据，特别是半径值
			console.log('准备保存标记数据:', markerForSubmit);
			console.log('覆盖半径值 (km):', markerForSubmit.radius);
			
			// 如果是自定义类型，添加自定义类型名称到属性中
			if (markerData.type === 'custom') {
				markerForSubmit.properties.customTypeName = markerData.customTypeName.trim();
			}
			
			// 如果选择了宠物，添加宠物ID
			if (markerData.pet) {
				markerForSubmit.pet = markerData.pet;
			}
			
			console.log('准备保存标记数据:', markerForSubmit);
			
			try {
				uni.showLoading({
					title: '正在保存...',
					mask: true
				});
				
				// 使用store保存标记
				const result = await markerStore.createMarker(markerForSubmit);
				
				uni.hideLoading();
				
				if (result) {
					console.log('标记保存成功，数据:', result);
					
					// 确保标记被添加到store并更新地图
					if (result.data && result.data._id) {
						// 触发地图刷新 - 通过特定事件
						uni.$emit('marker-created', {
							marker: result.data,
							timestamp: Date.now()
						});
						
						// 延迟返回，让用户看到成功提示
						setTimeout(() => {
							// 返回到地图页面并传递刷新标志
							uni.navigateBack({
								delta: 1,
								success: () => {
									// 确保返回后刷新地图
									uni.$emit('refresh-map', {
										timestamp: Date.now()
									});
								}
							});
						}, 1500);
					} else {
					uni.showToast({
						title: '标记保存成功',
						icon: 'success'
					});
					
					// 延迟返回，让用户看到成功提示
					setTimeout(() => {
						// 返回到地图页面
						uni.navigateBack({
							delta: 1
						});
					}, 1500);
					}
				} else {
					uni.showModal({
						title: '保存失败',
						content: '标记数据保存失败，请重试。如果问题持续，请联系客服。',
						showCancel: false
					});
				}
			} catch (error) {
				uni.hideLoading();
				console.error('保存标记时出错:', error);
				
				const errorMessage = error.response?.data?.message || 
					error.message || 
					'保存失败，请检查网络连接后重试';
				
				uni.showModal({
					title: '保存失败',
					content: errorMessage,
					showCancel: false
				});
			}
		};
		
		// 取消操作
		const cancel = () => {
			uni.navigateBack();
		};
		
		return {
			markerData,
			markerTypes,
			colorOptions,
			markers,
			mapCircle,
			myPets,
			imageFiles,
			getSelectedTypeLabel,
			getSelectedTypeIcon,
			getSelectedPetName,
			selectMarkerType,
			handlePetChange,
			handleRadiusChange,
			handleImageSelect,
			handleImageDelete,
			removeImage,
			previewImage,
			selectColor,
			togglePublic,
			handleMapTap,
			handleMarkerDrag,
			moveToMarker,
			submitMarker,
			calculateDistance,
			deg2rad,
			cancel,
			openFilePicker
		};
	}
};
</script>

<style>
.marker-form-container {
	padding: 20px;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.form-header {
	margin-bottom: 20px;
}

.form-title {
	font-size: 20px;
	font-weight: bold;
	color: #333;
}

.form-content {
	background-color: #ffffff;
	border-radius: 12px;
	padding: 20px;
	margin-bottom: 20px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-item {
	margin-bottom: 20px;
}

.form-label {
	display: block;
	font-size: 16px;
	color: #333;
	margin-bottom: 8px;
}

.required {
	color: #ff3b30;
	margin-left: 3px;
}

.form-input, .form-textarea, .form-picker {
	width: 100%;
	padding: 12px;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	font-size: 16px;
	color: #333;
	background-color: #f9f9f9;
}

.form-textarea {
	height: 100px;
}

.picker-value {
	padding: 12px;
	background-color: #f9f9f9;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	color: #333;
	display: flex;
	align-items: center;
}

.type-icon {
	width: 24px;
	height: 24px;
	margin-right: 8px;
}

/* 标记类型选择器样式 */
.marker-type-selector {
	display: flex;
	flex-wrap: wrap;
	gap: 12px;
	margin-top: 10px;
}

.marker-type-item {
	width: calc(33.33% - 8px);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10px;
	border-radius: 8px;
	border: 1px solid #e0e0e0;
	transition: all 0.3s ease;
}

.marker-type-item.active {
	border-color: #007AFF;
	background-color: rgba(0, 122, 255, 0.1);
	transform: scale(1.05);
}

.marker-type-icon {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 8px;
}

.marker-type-label {
	font-size: 12px;
	color: #333;
	text-align: center;
}

.svg-icon {
	width: 32px;
	height: 32px;
}

.color-selector {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 8px;
}

.color-item {
	width: 50px;
	height: 50px;
	border-radius: 8px;
	border: 2px solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #f9f9f9;
	overflow: hidden;
}

.color-item.active {
	border-color: #007AFF;
}

.checkbox-item {
	display: flex;
	align-items: center;
	gap: 10px;
}

.checkbox-label {
	font-size: 16px;
	color: #333;
}

.radius-slider {
	margin: 10px 0;
}

.radius-value {
	display: block;
	font-size: 14px;
	color: #666;
	text-align: right;
}

.form-location {
	margin-top: 20px;
	position: relative;
}

.location-label {
	font-size: 16px;
	font-weight: bold;
	color: #333;
	margin-bottom: 8px;
	display: block;
}

.location-info {
	margin-bottom: 10px;
}

.location-coordinates {
	font-size: 14px;
	color: #666;
	display: block;
	margin-bottom: 5px;
}

.location-hint {
	font-size: 12px;
	color: #999;
	display: block;
}

.location-map {
	width: 100%;
	height: 200px;
	border-radius: 12px;
	overflow: hidden;
	margin-top: 10px;
	position: relative;
}

.mini-map {
	width: 100%;
	height: 100%;
}

.map-overlay-tips {
	position: absolute;
	top: 10px;
	left: 0;
	right: 0;
	display: flex;
	justify-content: center;
	z-index: 100;
}

.map-overlay-tips text {
	background-color: rgba(0, 0, 0, 0.6);
	color: white;
	padding: 6px 12px;
	border-radius: 15px;
	font-size: 12px;
}

.map-controls {
	position: absolute;
	bottom: 10px;
	right: 10px;
	z-index: 100;
}

.map-control-btn {
	background-color: #FFFFFF;
	border-radius: 4px;
	padding: 8px 12px;
	box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.map-control-text {
	font-size: 14px;
	color: #333;
}

.form-actions {
	display: flex;
	gap: 10px;
}

.btn {
	flex: 1;
	height: 48px;
	line-height: 48px;
	text-align: center;
	border-radius: 24px;
	font-size: 16px;
	font-weight: bold;
}

.btn-cancel {
	background-color: #f5f5f5;
	color: #333;
	border: 1px solid #ccc;
}

.btn-submit {
	background-color: #007AFF;
	color: #ffffff;
}

/* 图片上传区域样式 */
.image-upload-area {
	width: 100%;
}

.uploaded-images {
	margin-top: 20px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

.image-item {
	position: relative;
	display: flex;
	flex-direction: column;
	border: 1px solid #eee;
	border-radius: 12px;
	overflow: hidden;
	background-color: #fff;
	box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.preview-image {
	width: 100%;
	height: 200px;
	background-color: #f5f5f5;
}

.image-caption-input {
	width: 100%;
	padding: 16px;
	font-size: 14px;
	border: none;
	border-top: 1px solid #f0f0f0;
}

.image-actions {
	position: absolute;
	top: 10px;
	right: 10px;
	display: flex;
	gap: 10px;
}

.delete-btn {
	width: 32px;
	height: 32px;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgba(0, 0, 0, 0.5);
	border-radius: 50%;
	color: #fff;
}

/* 添加更多图片的按钮样式 */
.add-more-btn {
	margin-top: 20px;
	background-color: #FFFFFF;
	border-radius: 4px;
	padding: 8px 12px;
	box-shadow: 0 2px 4px rgba(0,0,0,0.2);
	display: flex;
	align-items: center;
	gap: 8px;
}

.add-more-btn text {
	font-size: 14px;
	color: #333;
}

/* 上传按钮样式 */
.upload-button {
	background-color: #f5f5f5;
	border: 2px dashed #cccccc;
	border-radius: 8px;
	padding: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	height: 150px;
	width: 100%;
	cursor: pointer;
}

.upload-button text {
	font-size: 16px;
	color: #666;
}
</style> 