import request from '@/utils/request'

const API_PREFIX = '/api/story'

// 获取可用的剧情列表
export function getStoryPlots() {
  return request({
    url: `${API_PREFIX}/plots`,
    method: 'GET'
  })
}

// 获取剧情章节列表
export function getStoryChapters(plotId) {
  return request({
    url: `${API_PREFIX}/plots/${plotId}/chapters`,
    method: 'GET'
  })
}

// 开始或继续剧情
export function startStory(plotId) {
  return request({
    url: `${API_PREFIX}/plots/${plotId}/start`,
    method: 'GET'
  })
}

// 获取当前事件
export function getCurrentEvent(plotId) {
  return request({
    url: `${API_PREFIX}/plots/${plotId}/current-event`,
    method: 'GET'
  })
}

// 完成当前事件
export function completeEvent(data) {
  return request({
    url: `${API_PREFIX}/complete-event`,
    method: 'POST',
    data
  })
} 