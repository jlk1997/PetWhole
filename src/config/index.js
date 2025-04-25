/**
 * 全局配置文件
 */

// 环境变量处理
const apiUrl = import.meta?.env?.VITE_API_URL || 'http://localhost:5000';

// 开发环境
const dev = {
  BASE_API_URL: apiUrl, // 使用完整URL地址而不是相对路径
  TIMEOUT: 30000,
  DEBUG: true
};

// 生产环境
const prod = {
  BASE_API_URL: '/api', // 生产环境使用相对路径
  TIMEOUT: 30000,
  DEBUG: false
};

// 根据环境变量选择配置
const isProduction = process.env.NODE_ENV === 'production';
const config = isProduction ? prod : dev;

// 添加公共配置项
config.VERSION = '1.0.0';
config.APP_NAME = 'DogRun';

// 导出配置
export default config; 