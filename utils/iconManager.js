/**
 * 图标管理工具
 * 用于处理图标的动态加载、缓存控制和版本管理
 */

import { ref, computed, reactive } from 'vue'

// 存储图标版本信息
const iconVersions = reactive({})

// 是否已加载版本信息
const versionsLoaded = ref(false)

/**
 * 加载图标版本信息
 * @returns {Promise<Object>} 图标版本信息
 */
export async function loadIconVersions() {
  try {
    // 构建URL时添加随机参数避免缓存
    const timestamp = Date.now()
    const url = `/static/icon-versions.json?t=${timestamp}`
    
    console.log('尝试加载图标版本信息:', url)
    
    const response = await fetch(url)
    if (!response.ok) {
      console.warn(`图标版本信息加载失败 (${response.status}):`, await response.text())
      
      // 如果获取失败，尝试使用默认的空版本信息
      console.log('使用空图标版本信息')
      versionsLoaded.value = true
      return {}
    }
    
    // 验证响应内容类型
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.warn('图标版本信息响应不是JSON格式:', contentType)
      versionsLoaded.value = true
      return {}
    }
    
    try {
      const versions = await response.json()
      console.log('加载到图标版本信息:', versions)
      
      // 更新本地版本信息
      Object.assign(iconVersions, versions)
      versionsLoaded.value = true
      
      return versions
    } catch (jsonError) {
      console.error('解析图标版本信息JSON失败:', jsonError)
      versionsLoaded.value = true
      return {}
    }
  } catch (error) {
    console.error('加载图标版本信息出错:', error)
    versionsLoaded.value = true
    return {}
  }
}

/**
 * 获取指定图标的最新版本
 * @param {string} iconPath 图标路径
 * @returns {number|null} 图标版本号，如果不存在则返回null
 */
export function getIconVersion(iconPath) {
  if (!iconPath) return null
  
  // 标准化路径
  const normalizedPath = iconPath.startsWith('/') ? iconPath : `/${iconPath}`
  
  // 检查是否有对应版本信息
  if (iconVersions[normalizedPath]) {
    return iconVersions[normalizedPath].version
  }
  
  return null
}

/**
 * 获取带版本号的图标URL
 * @param {string} iconPath 图标路径
 * @param {boolean} forceRefresh 是否强制刷新
 * @returns {string} 带版本号的URL
 */
export function getVersionedIconUrl(iconPath, forceRefresh = false) {
  if (!iconPath) return ''
  
  // 处理已经包含参数的URL
  const baseUrl = iconPath.split('?')[0]
  
  // 获取图标版本
  const version = getIconVersion(baseUrl)
  
  // 使用版本或时间戳
  const timestamp = version || Date.now()
  const randomStr = forceRefresh ? Math.random().toString(36).substring(2, 8) : ''
  
  return `${baseUrl}?v=${timestamp}${randomStr ? `&r=${randomStr}` : ''}`
}

/**
 * 加载图标并返回适合组件使用的计算属性
 * @param {string} iconPath 图标路径
 * @returns {Object} 包含URL和加载状态的对象
 */
export function useIcon(iconPath) {
  const loading = ref(true)
  const error = ref(false)
  const path = ref(iconPath)
  
  // 自动计算版本化的URL
  const url = computed(() => {
    if (!path.value) return ''
    return getVersionedIconUrl(path.value)
  })
  
  // 预加载图标
  const img = new Image()
  
  img.onload = () => {
    loading.value = false
    error.value = false
  }
  
  img.onerror = () => {
    loading.value = false
    error.value = true
    console.error(`图标加载失败: ${url.value}`)
  }
  
  img.src = url.value
  
  // 检查版本更新的方法
  const checkUpdate = async () => {
    // 如果版本信息还未加载，先加载版本信息
    if (!versionsLoaded.value) {
      await loadIconVersions()
    }
    
    // 检查是否有新版本
    const newVersionUrl = getVersionedIconUrl(path.value, true)
    if (newVersionUrl !== url.value) {
      // 重新加载图标
      loading.value = true
      error.value = false
      
      const newImg = new Image()
      newImg.onload = () => {
        // 更新URL
        path.value = newVersionUrl.split('?')[0]
        loading.value = false
      }
      
      newImg.onerror = () => {
        console.error(`新版本图标加载失败: ${newVersionUrl}`)
        loading.value = false
      }
      
      newImg.src = newVersionUrl
    }
  }
  
  // 强制刷新图标
  const refresh = () => {
    loading.value = true
    error.value = false
    
    const refreshedUrl = getVersionedIconUrl(path.value, true)
    const refreshImg = new Image()
    
    refreshImg.onload = () => {
      loading.value = false
    }
    
    refreshImg.onerror = () => {
      loading.value = false
      error.value = true
    }
    
    refreshImg.src = refreshedUrl
  }
  
  return {
    url,
    loading,
    error,
    checkUpdate,
    refresh
  }
}

/**
 * 检查所有图标是否有更新
 * @returns {Promise<boolean>} 如果有更新返回true
 */
export async function checkAllIconsUpdate() {
  // 加载最新版本信息
  const newVersions = await loadIconVersions()
  
  // 检查是否有更新
  let hasUpdates = false
  
  for (const [path, info] of Object.entries(newVersions)) {
    const oldVersion = getIconVersion(path)
    if (!oldVersion || info.version > oldVersion) {
      hasUpdates = true
      console.log(`发现图标更新: ${path}, 新版本: ${info.version}`)
    }
  }
  
  return hasUpdates
}

/**
 * 刷新DOM中的所有图标元素
 * @param {string} selector CSS选择器
 * @returns {number} 刷新的图标数量
 */
export function refreshDOMIcons(selector = 'img[src*="/static/"]') {
  try {
    const images = document.querySelectorAll(selector)
    console.log(`找到 ${images.length} 个匹配的图标`);
    
    let count = 0
    
    images.forEach((img, index) => {
      // 获取原始路径
      const originalSrc = img.src.split('?')[0]
      // 创建带版本的新URL
      const newSrc = getVersionedIconUrl(originalSrc, true)
      
      // 完全替换图片元素
      const newImg = new Image()
      newImg.onload = function() {
        console.log(`图标 ${index+1} 已重新加载: ${newSrc}`)
      }
      
      // 复制原始属性
      Array.from(img.attributes).forEach(attr => {
        if (attr.name !== 'src') {
          newImg.setAttribute(attr.name, attr.value)
        }
      })
      
      // 设置新URL
      newImg.src = newSrc
      
      // 替换元素
      if (img.parentNode) {
        img.parentNode.replaceChild(newImg, img)
        count++
      }
    })
    
    console.log(`已刷新 ${count} 个图标`)
    return count
  } catch (error) {
    console.error('刷新DOM图标失败:', error)
    return 0
  }
}

/**
 * 清除图标的浏览器缓存
 * @param {string} iconPath 图标路径
 * @returns {Promise<boolean>} 是否成功
 */
export async function clearIconCache(iconPath) {
  if (!iconPath) return false
  
  try {
    // 如果浏览器支持Cache API
    if ('caches' in window) {
      const cacheKeys = await caches.keys()
      for (const key of cacheKeys) {
        const cache = await caches.open(key)
        const normalizedPath = iconPath.startsWith('/') ? iconPath : `/${iconPath}`
        await cache.delete(normalizedPath, { ignoreSearch: true })
      }
    }
    
    return true
  } catch (error) {
    console.error('清除图标缓存失败:', error)
    return false
  }
}

/**
 * 预加载图标资源，确保图标可用
 * @param {string[]} iconPaths 需要预加载的图标路径列表
 * @returns {Promise<Object>} 预加载结果
 */
export async function preloadIcons(iconPaths = []) {
  if (!iconPaths || !iconPaths.length) {
    return { success: 0, failed: 0 };
  }
  
  console.log(`开始预加载 ${iconPaths.length} 个图标`);
  
  const results = {
    success: 0,
    failed: 0,
    details: []
  };
  
  // 通过Image对象预加载
  const preloadPromises = iconPaths.map(iconPath => {
    return new Promise(resolve => {
      const img = new Image();
      
      img.onload = () => {
        results.success++;
        results.details.push({ path: iconPath, success: true });
        resolve(true);
      };
      
      img.onerror = () => {
        results.failed++;
        results.details.push({ path: iconPath, success: false });
        resolve(false);
      };
      
      // 使用带版本号的URL
      img.src = getVersionedIconUrl(iconPath, true);
    });
  });
  
  // 等待所有预加载完成
  await Promise.all(preloadPromises);
  
  console.log(`图标预加载完成: 成功=${results.success}, 失败=${results.failed}`);
  return results;
}

/**
 * 检查图标在各环境中的同步状态
 * @param {string} iconPath 图标路径
 * @returns {Promise<Object>} 同步状态
 */
export async function checkIconSyncStatus(iconPath) {
  if (!iconPath) return null;
  
  try {
    // 获取各环境中的图标URL
    const devUrl = getVersionedIconUrl(iconPath);
    const h5Url = devUrl.replace('/static/', '/unpackage/dist/build/h5/static/');
    const wxUrl = devUrl.replace('/static/', '/unpackage/dist/build/mp-weixin/static/');
    const appUrl = devUrl.replace('/static/', '/unpackage/dist/build/app-plus/static/');
    
    // 检查各环境文件
    const checkResults = {};
    
    // 开发环境检查
    checkResults.dev = await checkImageExists(devUrl);
    
    // H5环境检查
    checkResults.h5 = await checkImageExists(h5Url);
    
    // 微信小程序环境检查
    checkResults.wx = await checkImageExists(wxUrl);
    
    // App环境检查
    checkResults.app = await checkImageExists(appUrl);
    
    // 判断是否一致
    checkResults.isConsistent = 
      checkResults.dev && 
      checkResults.h5 && 
      checkResults.wx && 
      checkResults.app;
    
    // 是否有缺失
    checkResults.hasMissing = 
      !checkResults.dev || 
      !checkResults.h5 || 
      !checkResults.wx || 
      !checkResults.app;
    
    return checkResults;
  } catch (error) {
    console.error('检查图标同步状态失败:', error);
    return null;
  }
}

/**
 * 检查图片是否存在
 * @param {string} imageUrl 图片URL
 * @returns {Promise<boolean>} 是否存在
 */
export async function checkImageExists(imageUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUrl;
  });
}

// 自动初始化
setTimeout(() => {
  loadIconVersions().catch(err => console.error('初始化图标版本信息失败:', err))
}, 1000)

export default {
  loadIconVersions,
  getIconVersion,
  getVersionedIconUrl,
  useIcon,
  checkAllIconsUpdate,
  refreshDOMIcons,
  clearIconCache,
  preloadIcons,
  checkIconSyncStatus,
  checkImageExists
} 