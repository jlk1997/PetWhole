import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 创建axios实例
const service = axios.create({
  // baseURL: import.meta.env.VITE_APP_API_BASE_URL || '/api', // 暂时注释掉环境变量，以确保直接使用下面的地址
  baseURL: 'http://49.235.65.37:5001/api', // 直接硬编码API地址，并包含 /api 前缀
  timeout: 30000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  config => {
    // 从本地存储获取令牌
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  response => {
    const res = response.data
    
    // 如果响应成功但业务状态码不是0，则判断为业务错误
    if (res.code !== undefined && res.code !== 0) {
      ElMessage({
        message: res.message || '接口请求失败',
        type: 'error',
        duration: 5 * 1000
      })
      
      // 401: 未登录或token过期
      if (res.code === 401) {
        logout()
      }
      
      return Promise.reject(new Error(res.message || '接口请求失败'))
    } else {
      return res
    }
  },
  error => {
    console.error('响应错误:', error)
    
    if (error.response) {
      // 服务器返回了错误状态码
      const status = error.response.status
      const data = error.response.data
      
      let message = data.message || '服务器错误'
      
      if (status === 401) {
        message = '未授权，请重新登录'
      } else if (status === 403) {
        message = '拒绝访问'
      } else if (status === 404) {
        message = '请求的资源不存在'
      } else if (status === 500) {
        message = '服务器错误'
      }
      
      ElMessage({
        message: message,
        type: 'error',
        duration: 5 * 1000
      })
    } else if (error.message.includes('timeout')) {
      ElMessage({
        message: '请求超时，请稍后重试',
        type: 'error',
        duration: 5 * 1000
      })
    } else {
      ElMessage({
        message: '网络错误，请检查您的网络连接',
        type: 'error',
        duration: 5 * 1000
      })
    }
    
    return Promise.reject(error)
  }
)

// 登出并跳转到登录页
function logout() {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  
  if (router.currentRoute.value.path !== '/login') {
    router.push(`/login?redirect=${router.currentRoute.value.fullPath}`)
  }
}

// 封装GET请求
export function get(url, params) {
  return service.get(url, { params })
}

// 封装POST请求
export function post(url, data) {
  return service.post(url, data)
}

// 封装PUT请求
export function put(url, data) {
  return service.put(url, data)
}

// 封装DELETE请求
export function del(url) {
  return service.delete(url)
}

// 封装上传文件请求
export function upload(url, file, data = {}) {
  const formData = new FormData()
  formData.append('file', file)
  
  // 添加其他数据
  for (const key in data) {
    formData.append(key, data[key])
  }
  
  return service.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 导出请求函数和实例
export default service 