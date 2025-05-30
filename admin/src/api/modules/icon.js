import { get, post, put, del, upload } from '@/api'
import axios from 'axios'

// 获取图标列表
export function getIcons(params) {
  return get('/admin/icons', params)
}

// 获取图标详情
export function getIconDetail(id) {
  return get(`/admin/icons/${id}`)
}

// 上传新图标
export function uploadIcon(data) {
  const formData = new FormData()
  
  // 添加文件
  formData.append('file', data.file)
  
  // 添加其他数据
  formData.append('name', data.name)
  formData.append('type', data.type)
  
  if (data.description) {
    formData.append('description', data.description)
  }
  
  return upload('/admin/icons/upload', formData)
}

// 替换图标
export function replaceIcon(id, file) {
  const formData = new FormData()
  formData.append('file', file)
  
  return upload(`/admin/icons/${id}/replace`, formData)
}

// 更新图标信息
export function updateIcon(id, data) {
  return put(`/admin/icons/${id}`, data)
}

// 删除图标
export function deleteIcon(id) {
  return del(`/admin/icons/${id}`)
}

// 获取图标类型列表
export function getIconTypes() {
  return get('/admin/icon-types')
}

// 替换应用图标
export function replaceAppIcon(file, data) {
  console.log('准备替换应用图标:', { 
    fileName: file.name, 
    fileSize: file.size, 
    fileType: file.type,
    path: data.path, 
    location: data.location 
  });
  
  // 确保路径格式正确
  let path = data.path;
  if (!path.startsWith('/')) {
    path = '/' + path;
    console.log(`修正路径格式: ${data.path} -> ${path}`);
    data.path = path;
  }
  
  // 创建一个新的FormData实例
  const formData = new FormData();
  
  // 添加文件，特别注意字段名必须是'file'
  formData.append('file', file, file.name);
  
  // 添加其他数据
  if (data && typeof data === 'object') {
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
      console.log(`添加表单字段: ${key} = ${data[key]}`);
    });
  }
  
  // 获取认证token
  const token = localStorage.getItem('token');
  if (!token) {
    console.error('认证失败: 未找到token');
    return Promise.reject(new Error('未找到认证令牌'));
  }
  
  // 检查FormData内容
  console.log('FormData内容检查:');
  for (const pair of formData.entries()) {
    console.log(`${pair[0]}: ${pair[1] instanceof File ? '文件对象' : pair[1]}`);
  }
  
  // 发送请求前先尝试访问目标图片，记录其状态
  const imageUrl = window.location.origin + data.path;
  console.log(`测试图片URL访问: ${imageUrl}`);
  
  // 添加错误处理
  const handleErrors = async (response) => {
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        console.error('请求失败:', response.status, errorData);
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      } else {
        const errorText = await response.text();
        console.error('请求失败 (非JSON响应):', response.status, errorText);
        throw new Error(`请求失败 (${response.status}): ${errorText.substring(0, 100)}...`);
      }
    }
    return response;
  };
  
  // 检查文件是否存在的辅助函数
  const checkFileExists = async (url) => {
    try {
      // 首先尝试标准fetch请求
      const response = await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // 如果返回404，记录日志但进行第二种尝试
      if (response.status === 404) {
        console.warn(`文件不存在(404): ${url}，尝试直接GET请求验证...`);
        
        // 有时HEAD请求可能被服务器拒绝，尝试GET请求
        const getResponse = await fetch(url, { 
          method: 'GET',
          cache: 'no-cache',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (getResponse.ok) {
          console.log(`使用GET请求验证文件存在: ${url}`);
          return true;
        }
        
        console.error(`文件确实不存在: ${url}，HTTP状态: ${getResponse.status}`);
        return false;
      }
      
      return response.ok;
    } catch (error) {
      console.error(`检查文件存在性出错: ${url}`, error);
      return false;
    }
  };
  
  // 使用重试机制发送请求
  const sendRequestWithRetry = async (retries = 2, delay = 1000) => {
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`重试替换请求 (${attempt}/${retries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        const response = await fetch('/api/admin/icons/replace-app-icon', {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
            // 重要: 不要手动设置Content-Type，让浏览器自动设置
          }
        });
        
        await handleErrors(response);
        return await response.json();
      } catch (error) {
        console.error(`请求尝试 ${attempt + 1} 失败:`, error);
        lastError = error;
      }
    }
    
    throw lastError || new Error('替换应用图标失败，已达到最大重试次数');
  };
  
  // 发送请求
  return sendRequestWithRetry()
    .then(async data => {
      console.log('图标替换响应:', data);
      
      // 清除浏览器缓存
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          for (const cacheName of cacheNames) {
            await caches.delete(cacheName);
            console.log(`已清除缓存: ${cacheName}`);
          }
        } catch (cacheError) {
          console.error('清除缓存失败:', cacheError);
        }
      }
      
      // 成功后，添加文件检查和重试机制
      const verifyFile = async () => {
        const fileUrl = `${imageUrl}?t=${Date.now()}`;
        
        // 等待文件系统/CDN同步
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 检查文件是否存在
        const exists = await checkFileExists(fileUrl);
        
        if (!exists) {
          console.error('上传后文件不存在，尝试同步操作');
          
          // 尝试请求服务器同步图标
          try {
            const syncResponse = await fetch('/api/admin/icons/sync', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ path: data.path })
            });
            
            if (syncResponse.ok) {
              console.log('同步请求发送成功，等待处理...');
              // 再次等待
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // 再次检查
              const syncedExists = await checkFileExists(`${imageUrl}?t=${Date.now()}`);
              if (syncedExists) {
                console.log('同步后文件已存在');
              } else {
                console.error('同步后文件仍然不存在');
              }
            }
          } catch (syncError) {
            console.error('同步操作失败:', syncError);
          }
        } else {
          console.log('文件验证成功，可以正常访问');
        }
      };
      
      // 执行文件验证
      verifyFile().catch(err => console.error('文件验证过程出错:', err));
      
      // 强制清除预览图标的缓存
      const forceClearIconCache = async () => {
        try {
          // 等待文件写入完成
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // 清除指定路径图标的缓存
          const originalPath = path.split('?')[0]; // 移除可能的查询参数
          console.log(`尝试强制刷新图标: ${originalPath}`);
          
          // 删除sessionStorage中已缓存的blob URL
          const cacheKey = `blob_url_${originalPath}`;
          if (sessionStorage.getItem(cacheKey)) {
            const oldBlobUrl = sessionStorage.getItem(cacheKey);
            sessionStorage.removeItem(cacheKey);
            console.log(`已从sessionStorage中移除缓存的blob URL: ${cacheKey} -> ${oldBlobUrl}`);
            
            // 释放旧的blob URL
            try {
              if (oldBlobUrl && oldBlobUrl.startsWith('blob:')) {
                URL.revokeObjectURL(oldBlobUrl);
                console.log(`已释放旧的blob URL: ${oldBlobUrl}`);
              }
            } catch (revokeError) {
              console.warn('释放旧的blob URL失败，但不影响继续:', revokeError);
            }
          }
          
          // 尝试预加载新图片生成新的blob URL
          console.log(`尝试预加载并创建新的blob URL: ${originalPath}`);
          try {
            // 使用后端服务器URL确保获取最新版本
            const backendUrl = 'http://localhost:3000';
            const fetchUrl = `${backendUrl}${originalPath}?t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;
            
            const response = await fetch(fetchUrl, {
              method: 'GET',
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            });
            
            if (!response.ok) {
              throw new Error(`获取图标失败: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            
            // 验证是否为图像类型
            if (!blob.type.startsWith('image/')) {
              throw new Error(`返回的数据不是图像: ${blob.type}`);
            }
            
            // 创建新的blob URL
            const newBlobUrl = URL.createObjectURL(blob);
            console.log(`成功创建新的blob URL: ${newBlobUrl}`);
            
            // 缓存到sessionStorage
            sessionStorage.setItem(cacheKey, newBlobUrl);
            
            // 更新所有匹配的图片元素
            const selector = `img[src*="${originalPath.split('/').pop()}"], img[data-path*="${originalPath}"]`;
            const images = document.querySelectorAll(selector);
            console.log(`找到 ${images.length} 个匹配的图片元素需要更新`);
            
            images.forEach((img, index) => {
              const oldSrc = img.src;
              img.src = newBlobUrl;
              console.log(`已更新图片元素 ${index+1}: ${oldSrc} -> ${newBlobUrl}`);
            });
            
            console.log('图标预览刷新成功');
            return true;
          } catch (loadError) {
            console.error('预加载新图标失败:', loadError);
            return false;
          }
        } catch (error) {
          console.error('清除图标缓存过程出错:', error);
          return false;
        }
      };
      
      // 执行图标缓存清除
      forceClearIconCache().catch(err => console.error('清除图标缓存出错:', err));
      
      // 尝试预加载新图片
      const imgElement = new Image();
      const timestamp = Date.now();
      imgElement.src = `${imageUrl}?t=${timestamp}`;
      imgElement.onload = () => console.log('图标加载成功:', imgElement.src);
      imgElement.onerror = (err) => console.error('图标加载失败:', imgElement.src, err);
      
      return data;
    })
    .catch(error => {
      console.error('替换应用图标请求错误:', error);
      throw error;
    });
}

// 获取所有图标状态信息
export function getIconsStatus() {
  return get('/admin/icons/status')
}

// 同步图标到所有环境
export function syncIcon(path) {
  return post('/admin/icons/sync', { path })
}

// 强制刷新图标，添加随机参数
export function forceRefreshImage(url) {
  if (!url) return url;
  
  // 移除之前可能存在的时间戳和随机参数
  let cleanUrl = url;
  if (url.includes('?')) {
    cleanUrl = url.split('?')[0];
  }
  
  // 添加时间戳和随机字符
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  return `${cleanUrl}?t=${timestamp}&r=${randomString}`;
}

// 为所有图标添加版本信息
export function addVersionToIcons(icons) {
  if (!icons || !Array.isArray(icons)) return icons;
  
  return icons.map(icon => {
    if (icon.url) {
      icon.versionedUrl = forceRefreshImage(icon.url);
    }
    return icon;
  });
}

/**
 * 格式化图标URL以避免缓存问题
 * @param {string} url 原始URL
 * @returns {string} 格式化后的无缓存URL
 */
export function formatIconUrl(url) {
  if (!url) return '';
  
  // 提取路径部分
  let path = url;
  
  // 如果已经包含完整URL，则不做处理
  if (path.startsWith('http')) {
    return path;
  }
  
  // 防止重复添加API前缀
  if (path.includes('/api/admin/icons/view')) {
    // 已经包含前缀，先提取原始路径
    const pathParts = path.split('/api/admin/icons/view');
    path = pathParts[pathParts.length - 1];
  }
  
  // 确保路径以/开头
  if (!path.startsWith('/')) {
    path = '/' + path;
  }
  
  // 获取当前环境的API基础URL
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  
  // 区分是否为静态资源
  if (path.includes('/static/')) {
    // 对于静态资源，我们直接访问本地服务器
    // 注意: 如果使用了代理设置，静态资源请求可能会被重定向到代理目标
    return `${path}?t=${Date.now()}`;
  } else {
    // 对于数据库中的图标，使用admin图标管理API
    return `${apiBase}/api/admin/icons/view${path}?t=${Date.now()}`;
  }
}

export default {
  getIcons,
  getIconDetail,
  uploadIcon,
  replaceIcon,
  updateIcon,
  deleteIcon,
  getIconTypes,
  replaceAppIcon,
  getIconsStatus,
  syncIcon,
  forceRefreshImage,
  addVersionToIcons,
  formatIconUrl
} 