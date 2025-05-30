import request from '@/utils/request'

const baseUrl = '/api/admin/story'

// 剧情相关API
export function getPlots() {
  return request({
    url: `${baseUrl}/plots`,
    method: 'get'
  })
}

export function getPlotDetail(id) {
  return request({
    url: `${baseUrl}/plots/${id}`,
    method: 'get'
  })
}

export function createPlot(data) {
  return request({
    url: `${baseUrl}/plots`,
    method: 'post',
    data
  })
}

export function updatePlot(id, data) {
  return request({
    url: `${baseUrl}/plots/${id}`,
    method: 'put',
    data
  })
}

export function deletePlot(id) {
  return request({
    url: `${baseUrl}/plots/${id}`,
    method: 'delete'
  })
}

// 章节相关API
export function getChapterDetail(id) {
  return request({
    url: `${baseUrl}/chapters/${id}`,
    method: 'get'
  })
}

export function createChapter(data) {
  return request({
    url: `${baseUrl}/chapters`,
    method: 'post',
    data
  })
}

export function updateChapter(id, data) {
  return request({
    url: `${baseUrl}/chapters/${id}`,
    method: 'put',
    data
  })
}

export function deleteChapter(id) {
  return request({
    url: `${baseUrl}/chapters/${id}`,
    method: 'delete'
  })
}

// 事件相关API
export function getEventDetail(id) {
  return request({
    url: `${baseUrl}/events/${id}`,
    method: 'get'
  })
}

export function createEvent(data) {
  return request({
    url: `${baseUrl}/events`,
    method: 'post',
    data
  })
}

export function updateEvent(id, data) {
  return request({
    url: `${baseUrl}/events/${id}`,
    method: 'put',
    data
  })
}

export function deleteEvent(id) {
  return request({
    url: `${baseUrl}/events/${id}`,
    method: 'delete'
  })
}

// 统计数据
export function getStoryProgressStats() {
  return request({
    url: `${baseUrl}/progress-stats`,
    method: 'get'
  })
}

// 导入导出
export function exportStoryConfig(id) {
  return request({
    url: `${baseUrl}/export/${id}`,
    method: 'get'
  })
}

export function importStoryConfig(data) {
  return request({
    url: `${baseUrl}/import`,
    method: 'post',
    data
  })
} 