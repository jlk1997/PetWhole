import { createPinia } from 'pinia'

/**
 * 创建并导出pinia实例
 * 这个文件用于集中初始化pinia，避免循环引用问题
 */
export const usePinia = () => {
  // 如果已经存在pinia实例，直接返回
  if (window.__pinia) {
    return window.__pinia
  }
  
  // 创建一个新的pinia实例
  const pinia = createPinia()
  
  // 保存实例，以便后续重用
  window.__pinia = pinia
  
  return pinia
} 