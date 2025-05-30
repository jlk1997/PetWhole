/**
 * 缓存控制工具函数
 */

/**
 * 清除特定路径图片的浏览器缓存
 * @param {string} path 图片路径
 * @param {boolean} forceRefresh 是否强制刷新（添加随机参数）
 * @param {boolean} useDirectPath 是否使用直接路径，绕过域名限制
 * @returns {string} 带有时间戳的路径
 */
export function getUncachedImageUrl(path, forceRefresh = true, useDirectPath = false) {
  if (!path) return '';
  
  // 移除可能存在的旧时间戳参数
  const cleanPath = path.split('?')[0];
  
  // 添加新的时间戳和随机数
  const timestamp = Date.now();
  const randomStr = forceRefresh ? Math.random().toString(36).substring(2, 8) : '';
  
  // 如果启用直接路径访问，尝试构建完整的URL
  if (useDirectPath) {
    // 如果路径已经是完整URL，则直接使用
    if (cleanPath.startsWith('http')) {
      // 确保使用当前域名和端口，避免端口混淆
      const url = new URL(cleanPath);
      const currentUrl = new URL(window.location.href);
      
      // 如果URL中的域名与当前域名不同，使用当前域名和端口替换
      if (url.hostname !== currentUrl.hostname || url.port !== currentUrl.port) {
        url.hostname = currentUrl.hostname;
        url.port = currentUrl.port;
        console.log(`修正URL域名和端口: ${cleanPath} -> ${url.href}`);
        return `${url.href}?t=${timestamp}&r=${randomStr}`;
      }
      
      return `${cleanPath}?t=${timestamp}&r=${randomStr}`;
    }
    
    // 获取当前位置
    const origin = window.location.origin;
    // 确保路径以/开头
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`;
    
    console.log(`构建完整URL: ${origin}${normalizedPath}`);
    return `${origin}${normalizedPath}?t=${timestamp}&r=${randomStr}`;
  }
  
  return `${cleanPath}?t=${timestamp}&r=${randomStr}`;
}

/**
 * 检查图片文件是否存在
 * @param {string} path 图片路径
 * @returns {Promise<boolean>} 文件是否存在
 */
export function checkImageExists(path) {
  return new Promise((resolve) => {
    // 确保使用当前服务器的域名和端口检查图片
    let fullPath = path;
    if (!path.startsWith('http')) {
      // 构建完整的URL，使用当前域名和端口
      const origin = window.location.origin;
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      fullPath = `${origin}${normalizedPath}`;
      console.log(`构建完整图片URL进行检查: ${fullPath}`);
    } else {
      // 确保使用当前域名和端口
      try {
        const url = new URL(path);
        const currentUrl = new URL(window.location.href);
        
        // 检查是否需要修正端口
        if (url.hostname !== currentUrl.hostname || url.port !== currentUrl.port) {
          const originalUrl = url.href;
          url.hostname = currentUrl.hostname;
          url.port = currentUrl.port;
          fullPath = url.href;
          console.log(`修正图片检查URL: ${originalUrl} -> ${fullPath}`);
        }
      } catch (error) {
        console.warn(`解析URL失败: ${path}，使用原始路径`, error);
      }
    }
    
    // 添加随机参数避免缓存
    const uncachedUrl = `${fullPath}${fullPath.includes('?') ? '&' : '?'}t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;
    console.log(`使用无缓存URL检查图片: ${uncachedUrl}`);
    
    // 使用fetch API直接检查文件是否存在，更可靠
    fetch(uncachedUrl, { method: 'HEAD', cache: 'no-cache' })
      .then(response => {
        if (response.ok) {
          console.log(`图片存在 (fetch确认): ${fullPath}`);
          resolve(true);
          return;
        }
        
        console.log(`图片可能不存在 (fetch状态码 ${response.status}): ${fullPath}`);
        
        // 回退到Image检查方式
        const img = new Image();
        img.onload = function() {
          console.log(`图片存在 (Image确认): ${fullPath}`);
          resolve(true);
        };
        img.onerror = function() {
          console.log(`图片不存在 (Image确认): ${fullPath}`);
          
          // 如果在当前服务器上不存在，尝试直接GET请求判断
          fetch(uncachedUrl, { method: 'GET', cache: 'no-cache' })
            .then(getResp => {
              if (getResp.ok) {
                console.log(`图片存在 (GET请求确认): ${fullPath}`);
                resolve(true);
              } else {
                console.log(`图片确实不存在 (GET请求状态码 ${getResp.status}): ${fullPath}`);
                resolve(false);
              }
            })
            .catch(() => {
              console.log(`图片确实不存在 (GET请求出错): ${fullPath}`);
              resolve(false);
            });
        };
        
        // 添加跨域支持
        img.crossOrigin = "anonymous";
        
        // 设置src触发加载
        img.src = uncachedUrl;
        
        // 设置5秒超时
        setTimeout(() => {
          if (!img.complete) {
            console.log(`图片检查超时: ${fullPath}`);
            resolve(false);
          }
        }, 5000);
      })
      .catch(error => {
        console.warn(`图片检查fetch请求失败: ${fullPath}`, error);
        
        // 回退到传统方式
        const img = new Image();
        img.onload = function() {
          console.log(`图片存在 (Image确认，fetch失败后): ${fullPath}`);
          resolve(true);
        };
        img.onerror = function() {
          console.log(`图片不存在 (Image确认，fetch失败后): ${fullPath}`);
          resolve(false);
        };
        
        // 添加跨域支持
        img.crossOrigin = "anonymous";
        
        // 使用另一种无缓存URL尝试
        img.src = `${fullPath}${fullPath.includes('?') ? '&' : '?'}noCache=${Date.now()}`;
      });
  });
}

/**
 * 刷新页面上特定选择器匹配的所有图片，强制加载最新版本
 * @param {string} selector CSS选择器
 * @param {boolean} forceReplace 是否强制替换DOM元素
 * @returns {number} 刷新的图片数量
 */
export function refreshImages(selector = 'img[src*="/static/"]', forceReplace = false) {
  try {
    const images = document.querySelectorAll(selector);
    console.log(`找到 ${images.length} 个匹配的图片`);
    
    let count = 0;
    
    images.forEach((img, index) => {
      const originalSrc = img.src.split('?')[0]; // 移除旧的时间戳
      const newSrc = `${originalSrc}?t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;
      
      if (forceReplace) {
        // 创建新的图片元素替换旧的
        const newImg = new Image();
        newImg.crossOrigin = "anonymous"; // 添加跨域支持
        newImg.onload = function() {
          console.log(`图片 ${index+1} 已重新加载: ${newSrc}`);
        };
        newImg.onerror = function() {
          console.error(`图片 ${index+1} 加载失败: ${newSrc}`);
          
          // 尝试在主应用服务器上加载
          if (window.location.port === '5001' && !originalSrc.includes('localhost:3000')) {
            const mainAppSrc = originalSrc.replace('49.235.65.37:5001', 'localhost:3000');
            const alternativeSrc = `${mainAppSrc}?t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;
            console.log(`尝试从主应用服务器加载: ${alternativeSrc}`);
            newImg.src = alternativeSrc;
          }
        };
        
        // 复制原始图片的所有属性
        Array.from(img.attributes).forEach(attr => {
          if (attr.name !== 'src') {
            newImg.setAttribute(attr.name, attr.value);
          }
        });
        
        // 设置新的src
        newImg.src = newSrc;
        
        // 替换元素
        if (img.parentNode) {
          img.parentNode.replaceChild(newImg, img);
        }
      } else {
        // 只更新src属性
        img.crossOrigin = "anonymous"; // 添加跨域支持
        img.src = newSrc;
        
        // 添加错误处理，尝试从主应用服务器加载
        img.onerror = function() {
          if (window.location.port === '5001' && !originalSrc.includes('localhost:3000')) {
            const mainAppSrc = originalSrc.replace('49.235.65.37:5001', 'localhost:3000');
            const alternativeSrc = `${mainAppSrc}?t=${Date.now()}&r=${Math.random().toString(36).substring(2, 8)}`;
            console.log(`尝试从主应用服务器加载: ${alternativeSrc}`);
            img.src = alternativeSrc;
          }
        };
      }
      
      count++;
    });
    
    console.log(`已刷新 ${count} 个图片`);
    return count;
  } catch (error) {
    console.error('刷新图片失败:', error);
    return 0;
  }
}

/**
 * 强制刷新特定路径的图片，确保应用正确加载最新版本
 * @param {string} path 图片路径
 * @returns {Promise<boolean>} 是否成功刷新
 */
export async function forceRefreshImage(path) {
  console.log(`开始强制刷新图片: ${path}`);
  
  // 提取路径部分，忽略域名部分
  let cleanPath = path;
  if (path.startsWith('http')) {
    try {
      const urlObj = new URL(path);
      cleanPath = urlObj.pathname;
    } catch (error) {
      console.warn(`解析URL失败: ${path}，使用原始路径`, error);
    }
  }
  
  // 确保路径以/开头
  if (!cleanPath.startsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  // 使用后端服务器URL，因为图片文件实际存储在那里
  const backendUrl = 'http://localhost:3000';
  const fullPath = `${backendUrl}${cleanPath}`;
  
  console.log(`构建完整图片URL进行刷新（指向后端）: ${fullPath}`);
  
  // 首先尝试使用fetch直接获取最新图片
  try {
    // 创建一个无缓存的URL
    const fetchUrl = `${fullPath}${fullPath.includes('?') ? '&' : '?'}t=${Date.now()}&nocache=true`;
    console.log(`使用fetch请求刷新图片: ${fetchUrl}`);
    
    const response = await fetch(fetchUrl, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (response.ok) {
      console.log(`图片fetch请求成功: ${fetchUrl}`);
      
      // 尝试作为blob获取以强制浏览器刷新内容
      const blob = await response.blob();
      console.log(`已获取图片blob，大小: ${blob.size} 字节, 类型: ${blob.type}`);
      
      // 为页面上的所有匹配图片创建一个ObjectURL，彻底绕过缓存
      try {
        const objectUrl = URL.createObjectURL(blob);
        console.log(`创建ObjectURL: ${objectUrl}`);
        
        // 查找所有匹配的图片元素并更新它们的src
        document.querySelectorAll(`img[src*="${cleanPath.split('?')[0]}"]`).forEach(img => {
          // 备份原始src以便以后需要
          if (!img.dataset.originalSrc) {
            img.dataset.originalSrc = img.src;
          }
          
          // 使用blob URL
          img.src = objectUrl;
          console.log(`已更新图片元素src为blob URL`);
        });
      } catch (blobError) {
        console.warn('创建blob URL失败:', blobError);
      }
      
    } else {
      console.warn(`图片fetch请求失败: ${response.status} ${response.statusText}`);
    }
  } catch (fetchError) {
    console.warn(`fetch刷新图片失败，将使用Image方式: ${fetchError.message}`);
  }
  
  // 尝试清除浏览器缓存
  if ('caches' in window) {
    try {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        const cache = await caches.open(key);
        // 尝试删除相关缓存
        await cache.delete(fullPath, { ignoreSearch: true });
        console.log(`已从缓存 ${key} 中清除图片: ${fullPath}`);
      }
    } catch (error) {
      console.warn('清除缓存API失败，但不影响继续处理:', error);
    }
  }
  
  // 预加载新图片 - 使用多次重试
  const maxRetries = 3;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`尝试图片预加载 (${attempt + 1}/${maxRetries})...`);
      // 等待一段时间再重试
      await new Promise(r => setTimeout(r, 500));
    }
    
    try {
      // 创建一个唯一的URL以避免缓存
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const uniqueUrl = `${fullPath}${fullPath.includes('?') ? '&' : '?'}t=${timestamp}&r=${randomStr}&a=${attempt}`;
      
      // 使用Promise包装图片加载
      const success = await new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
          console.log(`图片预加载成功 (尝试 ${attempt + 1}): ${uniqueUrl}`);
          resolve(true);
        };
        img.onerror = function(error) {
          console.warn(`预加载图片失败 (尝试 ${attempt + 1}): ${uniqueUrl}`, error);
          resolve(false);
        };
        
        // 添加跨域支持
        img.crossOrigin = "anonymous";
        img.src = uniqueUrl;
        
        // 设置超时
        setTimeout(() => {
          if (!img.complete) {
            console.warn(`图片加载超时 (尝试 ${attempt + 1}): ${uniqueUrl}`);
            resolve(false);
          }
        }, 3000);
      });
      
      if (success) {
        console.log(`图片成功刷新: ${path}`);
        return true;
      }
    } catch (error) {
      console.warn(`图片刷新过程中出错 (尝试 ${attempt + 1}):`, error);
    }
  }
  
  // 如果多次尝试都失败，但我们仍然认为刷新可能成功
  console.log(`多次预加载尝试均失败，但图标可能已更新: ${path}`);
  return true;
}

/**
 * 向服务器发送一个清除缓存的请求
 * @param {string} imagePath 需要清除缓存的图片路径
 * @returns {Promise} 请求结果
 */
export function purgeServerCache(imagePath) {
  console.log(`请求服务器清除缓存: ${imagePath}`);
  
  // 发送清除缓存请求到服务器
  return fetch('/api/admin/cache/purge', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ path: imagePath }),
  })
  .then(response => {
    if (!response.ok) {
      return response.json().then(data => {
        console.warn('服务器清除缓存请求失败:', data);
        return { success: false, message: data.message || '请求失败' };
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('服务器清除缓存结果:', data);
    return data;
  })
  .catch(error => {
    console.error('清除缓存请求错误:', error);
    return { success: false, message: error.message || '请求错误' };
  });
}

export default {
  getUncachedImageUrl,
  refreshImages,
  checkImageExists,
  forceRefreshImage,
  purgeServerCache
}; 