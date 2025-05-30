import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'

// 创建axios实例
const service = axios.create({
  // 由于在vite.config.js中已经配置了代理，这里不需要设置完整的基础URL
  baseURL: '',
  timeout: 15000 // 请求超时时间
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 从localStorage获取token
    const token = localStorage.getItem('token')
    
    // 如果有token，将其添加到请求头中
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    return config
  },
  error => {
    // 请求错误处理
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果响应码不是0，则认为有错误
    if (res.code !== 0 && res.code !== undefined) {
      // 显示错误消息
      ElMessage({
        message: res.message || '错误',
        type: 'error',
        duration: 5 * 1000
      })
      
      // 处理401错误（未授权）
      if (res.code === 401) {
        // 显示重新登录对话框
        ElMessageBox.confirm(
          '登录状态已过期，请重新登录',
          '确认退出',
          {
            confirmButtonText: '重新登录',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          // 清除本地token
          localStorage.removeItem('token')
          // 重定向到登录页
          location.reload()
        })
      }
      
      return Promise.reject(new Error(res.message || '错误'))
    } else {
      return res
    }
  },
  error => {
    console.error('响应错误:', error)
    
    // 显示错误消息
    ElMessage({
      message: error.response?.data?.message || error.message || '请求失败',
      type: 'error',
      duration: 5 * 1000
    })
    
    return Promise.reject(error)
  }
)

export default service 