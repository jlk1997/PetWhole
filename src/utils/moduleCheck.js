/**
 * 模块检查工具
 * 用于检测各种模块是否正确加载
 */

// 标记模块已加载
console.log('模块检查工具已加载');

// 检查模块加载
export function checkModuleLoaded(moduleName, module) {
  console.log(`检查模块 [${moduleName}] 加载状态:`, !!module);
  
  if (!module) {
    console.error(`模块 [${moduleName}] 加载失败!`);
    return false;
  }
  
  console.log(`模块 [${moduleName}] 加载成功`);
  return true;
}

// 公开导出检查函数
export default {
  checkModuleLoaded
}; 