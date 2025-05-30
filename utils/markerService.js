import request from './request';
import { showToast } from './ui';

/**
 * 标记管理服务
 */
class MarkerService {
	/**
	 * 上传标记图片
	 * @param {string} filePath 图片路径
	 * @param {string} type 标记类型
	 * @returns {Promise<Object>} 上传结果
	 */
	static async uploadMarkerImage(filePath, type = 'default') {
		return new Promise(async (resolve, reject) => {
			// 检查文件路径是否存在
			if (!filePath) {
				console.error('无效的文件路径');
				return reject(new Error('无效的文件路径'));
			}

			try {
				// 直接使用备用上传方式，跳过失败的主上传
				const result = await this._tryUploadImage(filePath, type, '/api/markers/upload-fallback');
				resolve(result);
			} catch (error) {
				console.error('图片上传失败:', error);
				reject(error);
			}
		});
	}
	
	/**
	 * 尝试上传图片到指定端点
	 * @private
	 * @param {string} filePath 文件路径
	 * @param {string} type 标记类型
	 * @param {string} url 上传URL
	 * @returns {Promise<Object>} 上传结果
	 */
	static _tryUploadImage(filePath, type, url) {
		return new Promise((resolve, reject) => {
			// 创建上传任务
			const uploadTask = uni.uploadFile({
				url: url,
				filePath: filePath,
				name: 'image', // 文件对应的 key，需要与后端一致
				formData: {
					type: type || 'default'
				},
				success: (res) => {
					try {
						// 检查HTTP状态码
						if (res.statusCode !== 200) {
							console.error('上传失败，HTTP状态码:', res.statusCode, '响应:', res.data);
							return reject(new Error(`上传失败，状态码: ${res.statusCode} ${res.data}`));
						}
						
						// 尝试解析响应数据
						const result = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
						
						if (result.success) {
							console.log('图片上传成功:', result);
							resolve(result);
						} else {
							console.error('上传失败，服务器返回错误:', result.message || '未知错误');
							reject(new Error(result.message || '上传失败'));
						}
					} catch (error) {
						console.error('解析上传结果失败:', error, res.data);
						reject(new Error('解析上传结果失败'));
					}
				},
				fail: (err) => {
					console.error('图片上传请求失败:', err);
					reject(new Error('图片上传请求失败: ' + (err.errMsg || '')));
				}
			});
			
			// 监听上传进度
			uploadTask.onProgressUpdate((res) => {
				console.log('上传进度:', res.progress);
			});
		});
	}
	
	/**
	 * 批量上传标记图片
	 * @param {Array<string>} filePaths 图片路径数组
	 * @param {Array<string>} captions 图片描述数组
	 * @param {string} type 标记类型
	 * @returns {Promise<Array>} 上传结果数组
	 */
	static async uploadMarkerImages(filePaths, captions = [], type = 'default') {
		try {
			const uploadPromises = filePaths.map((path, index) => 
				this.uploadMarkerImage(path, type)
					.then(result => ({
						...result,
						caption: captions[index] || ''
					}))
			);
			
			return await Promise.all(uploadPromises);
		} catch (error) {
			showToast('批量上传图片失败');
			throw error;
		}
	}
	
	/**
	 * 创建新标记
	 * @param {Object} data 标记数据
	 * @returns {Promise<Object>} 创建的标记
	 */
	static async createMarker(data) {
		try {
			// 处理数据中的图片，确保格式正确
			const processedData = {
				...data,
				images: data.images.map(img => ({
					url: img.url,
					caption: img.caption || ''
				}))
			};
			
			const response = await request({
				url: '/api/markers',
				method: 'POST',
				data: processedData
			});
			return response.data;
		} catch (error) {
			showToast('创建标记失败');
			throw error;
		}
	}
	
	/**
	 * 更新标记
	 * @param {string} id 标记ID
	 * @param {Object} data 更新后的标记数据
	 * @returns {Promise<Object>} 更新后的标记
	 */
	static async updateMarker(id, data) {
		try {
			// 处理数据中的图片，确保格式正确
			const processedData = {
				...data,
				images: data.images.map(img => ({
					url: img.url,
					caption: img.caption || ''
				}))
			};
			
			const response = await request({
				url: `/api/markers/${id}`,
				method: 'PUT',
				data: processedData
			});
			return response.data;
		} catch (error) {
			showToast('更新标记失败');
			throw error;
		}
	}
	
	/**
	 * 获取指定区域的所有活跃标记
	 * @param {string} areaId 区域ID
	 * @param {boolean} forceRefresh 是否强制刷新数据
	 * @returns {Promise<Array>} 标记列表
	 */
	static async getAreaMarkers(areaId, forceRefresh = false) {
		try {
			const response = await request({
				url: '/api/markers',
				method: 'GET',
				params: { 
					areaId,
					t: forceRefresh ? Date.now() : undefined // 添加时间戳以防止缓存
				}
			});
			return response.data;
		} catch (error) {
			showToast('获取标记失败');
			throw error;
		}
	}
	
	/**
	 * 获取单个标记详情
	 * @param {string} id 标记ID
	 * @returns {Promise<Object>} 标记详情
	 */
	static async getMarkerDetail(id) {
		try {
			const response = await request({
				url: `/api/markers/${id}`,
				method: 'GET'
			});
			return response.data;
		} catch (error) {
			showToast('获取标记详情失败');
			throw error;
		}
	}
	
	/**
	 * 删除标记
	 * @param {string} id 标记ID
	 * @returns {Promise<boolean>} 是否成功
	 */
	static async deleteMarker(id) {
		try {
			const response = await request({
				url: `/api/markers/${id}`,
				method: 'DELETE'
			});
			return response.data;
		} catch (error) {
			showToast('删除标记失败');
			throw error;
		}
	}
	
	/**
	 * 举报标记
	 * @param {string} id 标记ID
	 * @param {string} reason 举报原因
	 * @returns {Promise<Object>} 举报记录
	 */
	static async reportMarker(id, reason) {
		try {
			const response = await request({
				url: `/api/markers/${id}/report`,
				method: 'POST',
				data: { reason }
			});
			return response.data;
		} catch (error) {
			showToast('举报失败');
			throw error;
		}
	}
	
	/**
	 * 解决标记
	 * @param {string} id 标记ID
	 * @returns {Promise<Object>} 解决后的标记
	 */
	static async resolveMarker(id) {
		try {
			const response = await request({
				url: `/api/markers/${id}/resolve`,
				method: 'PUT'
			});
			return response.data;
		} catch (error) {
			showToast('标记解决失败');
			throw error;
		}
	}
	
	/**
	 * 分享标记
	 * @param {string} id 标记ID
	 * @returns {Promise<Object>} 分享信息
	 */
	static async shareMarker(id) {
		try {
			const response = await request({
				url: `/api/markers/${id}/share`,
				method: 'GET'
			});
			return response.data;
		} catch (error) {
			showToast('获取分享信息失败');
			throw error;
		}
	}
	
	/**
	 * 获取用户发布的标记
	 * @param {string} userId 用户ID
	 * @returns {Promise<Array>} 标记列表
	 */
	static async getUserMarkers(userId) {
		try {
			const response = await request({
				url: '/api/markers/user',
				method: 'GET',
				params: { userId }
			});
			return response.data;
		} catch (error) {
			showToast('获取用户标记失败');
			throw error;
		}
	}
	
	/**
	 * 获取指定坐标周围的标记
	 * @param {number} latitude 纬度
	 * @param {number} longitude 经度
	 * @param {number} radius 半径（米）
	 * @returns {Promise<Array>} 标记列表
	 */
	static async getNearbyMarkers(latitude, longitude, radius = 5000) {
		try {
			const response = await request({
				url: '/api/markers/nearby',
				method: 'GET',
				params: { latitude, longitude, radius }
			});
			return response.data;
		} catch (error) {
			showToast('获取附近标记失败');
			throw error;
		}
	}
	
	/**
	 * 搜索标记
	 * @param {string} keyword 关键词
	 * @param {string} type 类型
	 * @returns {Promise<Array>} 匹配的标记列表
	 */
	static async searchMarkers(keyword, type) {
		try {
			const response = await request({
				url: '/api/markers/search',
				method: 'GET',
				params: { keyword, type }
			});
			return response.data;
		} catch (error) {
			showToast('搜索标记失败');
			throw error;
		}
	}
}

export default MarkerService; 