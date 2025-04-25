/**
 * 浏览器兼容性修复
 */

// 默认导出一个空对象以确保import语句不会报错
export default {};

// 添加全局Promise polyfill
if (typeof Promise === 'undefined') {
  console.warn('Promise is not supported in this browser. Please use a polyfill.');
}

// 修复可能的ModuleNamespace对象问题
if (typeof window !== 'undefined') {
  // 确保全局对象上有一些必要的API
  window.global = window.global || window;
  window.process = window.process || { env: { NODE_ENV: 'production' } };
  
  // 为调试目的，添加一个全局变量
  window.__VUE_DEVTOOLS_GLOBAL_HOOK__ = window.__VUE_DEVTOOLS_GLOBAL_HOOK__ || {};
}

// 解决可能的循环引用问题
export const ensureModuleLoaded = (modulePath) => {
  try {
    // 使用动态导入确保模块被加载
    return import(/* @vite-ignore */ modulePath).catch(err => {
      console.warn(`Failed to load module ${modulePath}:`, err);
      return {};
    });
  } catch (error) {
    console.warn(`Error importing ${modulePath}:`, error);
    return Promise.resolve({});
  }
}; 