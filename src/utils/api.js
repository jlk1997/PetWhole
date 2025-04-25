/**
 * API工具文件 - 提供API的统一导出点
 */

// 直接从src/api目录导入模块
import user from '@/api/user.js'
import pet from '@/api/pet.js'
import post from '@/api/post.js'
import walk from '@/api/walk.js'
import location from '@/api/location.js'
import auth from '@/api/auth.js'

// 特殊处理：用户模块使用auth模块的登录方法
const userWithAuthLogin = {
  ...user,
  login: auth.login
};

// 导出API模块
export const userApi = userWithAuthLogin;
export const petApi = pet;
export const walkApi = walk;
export const postApi = post;
export const locationApi = location;
export const authApi = auth;

// 构建统一API对象
const api = {
  user: userWithAuthLogin,
  pet,
  post,
  walk,
  location,
  auth
};

/**
 * 模式切换 - 通过环境变量或配置控制使用模拟API还是真实API
 * 你可以在配置文件中设置USE_MOCK_API=true来启用模拟API
 */
import config from '@/config/index.js';
import mockApi from '@/api/index.js';

// 如果配置了使用模拟API，则返回模拟API
const apiToUse = config.USE_MOCK_API ? mockApi : api;

// 默认导出所有API
export default apiToUse; 