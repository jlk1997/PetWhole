/**
 * 全局配置文件
 */

// 环境变量处理
// const apiUrl = import.meta?.env?.VITE_API_URL || 'http://49.235.65.37:5000';
const apiUrl =  'http://49.235.65.37:5000';

// 开发环境
const dev = {
  BASE_API_URL: apiUrl, // 使用完整URL地址而不是相对路径
  TIMEOUT: 30000,
  DEBUG: true,
  // 添加模拟API开关，开发环境默认关闭
  USE_MOCK_API: false,
  // API路径前缀配置 - 修改为匹配后端结构
  API_PREFIX: {
    AUTH: '/api/users',
    USERS: '/api/users',
    PETS: '/api/pets',
    POSTS: '/api/community',
    WALKS: '/api/users/me/walks',
    LOCATIONS: '/api/locations'
  }
};

// 生产环境
const prod = {
  BASE_API_URL: '/api', // 生产环境使用相对路径
  TIMEOUT: 30000,
  DEBUG: false,
  // 生产环境默认关闭模拟API
  USE_MOCK_API: false,
  // API路径前缀配置 - 修改为匹配后端结构
  API_PREFIX: {
    AUTH: '/api/users',
    USERS: '/api/users',
    PETS: '/api/pets',
    POSTS: '/api/community',
    WALKS: '/api/users/me/walks',
    LOCATIONS: '/api/locations'
  }
};

// 根据环境变量选择配置
const isProduction = process.env.NODE_ENV === 'production';
const config = isProduction ? prod : dev;

// 添加公共配置项
config.VERSION = '1.0.0';
config.APP_NAME = 'DogRun';

// 导出配置
export default config; 