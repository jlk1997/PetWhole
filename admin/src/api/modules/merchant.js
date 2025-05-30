import { get, post, put, del, upload } from '@/api'

// 获取商家列表
export function getMerchants(params) {
  return get('/admin/merchants', params)
}

// 获取商家详情
export function getMerchantDetail(id) {
  return get(`/admin/merchants/${id}`)
}

// 创建商家
export function createMerchant(data) {
  return post('/admin/merchants', data)
}

// 更新商家信息
export function updateMerchant(id, data) {
  return put(`/admin/merchants/${id}`, data)
}

// 删除商家
export function deleteMerchant(id) {
  return del(`/admin/merchants/${id}`)
}

// 审核商家
export function verifyMerchant(id, data) {
  return post(`/admin/merchants/${id}/verify`, data)
}

// 启用/禁用商家
export function toggleMerchantStatus(id, enable = true) {
  return put(`/admin/merchants/${id}/status`, { status: enable ? 'active' : 'disabled' })
}

// 上传商家logo
export function uploadLogo(id, file) {
  return upload(`/admin/merchants/${id}/logo`, file)
}

// 上传商家图片
export function uploadImage(id, file) {
  return upload(`/admin/merchants/${id}/images`, file)
}

// 删除商家图片
export function deleteImage(id, imageId) {
  return del(`/admin/merchants/${id}/images/${imageId}`)
}

// 获取商家类型列表
export function getMerchantTypes() {
  return get('/admin/merchant-types')
}

// 获取商家服务列表
export function getMerchantServices() {
  return get('/admin/merchant-services')
}

// 获取商家统计数据
export function getMerchantStats() {
  return get('/admin/merchants/stats')
}

export default {
  getMerchants,
  getMerchantDetail,
  createMerchant,
  updateMerchant,
  deleteMerchant,
  verifyMerchant,
  toggleMerchantStatus,
  uploadLogo,
  uploadImage,
  deleteImage,
  getMerchantTypes,
  getMerchantServices,
  getMerchantStats
} 