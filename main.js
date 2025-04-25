import App from './App'
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import * as Pinia from 'pinia';

// 从统一入口导入API
import api from './utils/api'

// 将API挂载到全局uni对象上
uni.$api = api;

export function createApp() {
  const app = createSSRApp(App)
  
  // 添加Pinia状态管理
  const pinia = createPinia()
  app.use(pinia)
  
  // 全局注册API
  uni.$api = api
  
  // 全局错误处理
  app.config.errorHandler = (err, vm, info) => {
    console.error('Vue Error:', err)
    
    // 动态导入模块失败
    if (err.message && err.message.includes('Failed to fetch dynamically imported module')) {
      console.warn('动态导入模块失败，模块路径可能有误:', err.message);
      const errorPage = err.message.match(/http:\/\/localhost:5173\/(.*?)(\?|$)/);
      if (errorPage && errorPage[1]) {
        console.warn('无法加载页面:', errorPage[1]);
        
        // 可以考虑在这里跳转到错误页面
        uni.showToast({
          title: '页面加载失败',
          icon: 'none',
          duration: 2000
        });
        
        // 返回上一页或首页
        setTimeout(() => {
          uni.navigateBack({
            fail: () => {
              uni.switchTab({
                url: '/pages/index/index'
              });
            }
          });
        }, 1500);
      }
    }
    
    // API请求404错误
    else if (err.status === 404 || (err.message && err.message.includes('404'))) {
      console.warn('API请求404错误:', err.message)
      uni.showToast({
        title: '网络请求失败，请稍后再试',
        icon: 'none'
      })
    }
  }
  
  return {
    app
  }
}