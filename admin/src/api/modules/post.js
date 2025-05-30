import { get, post, put, del } from '@/api'

// 获取帖子列表
export function getPosts(params) {
  return get('/admin/posts', params)
}

// 获取帖子详情
export function getPostDetail(id) {
  return get(`/admin/posts/${id}`)
}

// 更新帖子
export function updatePost(id, data) {
  return put(`/admin/posts/${id}`, data)
}

// 删除帖子
export function deletePost(id) {
  return del(`/admin/posts/${id}`)
}

// 置顶帖子
export function pinPost(id, isPinned) {
  return put(`/admin/posts/${id}/pin`, { isPinned })
}

// 设置精华帖子
export function setFeatured(id, isFeatured) {
  return put(`/admin/posts/${id}/featured`, { isFeatured })
}

// 审核帖子
export function reviewPost(id, data) {
  return post(`/admin/posts/${id}/review`, data)
}

// 获取帖子评论
export function getPostComments(postId, params) {
  return get(`/admin/posts/${postId}/comments`, params)
}

// 删除评论
export function deleteComment(postId, commentId) {
  return del(`/admin/posts/${postId}/comments/${commentId}`)
}

// 回复评论
export function replyToComment(postId, commentId, data) {
  return post(`/admin/posts/${postId}/comments/${commentId}/reply`, data)
}

export default {
  getPosts,
  getPostDetail,
  updatePost,
  deletePost,
  pinPost,
  setFeatured,
  reviewPost,
  getPostComments,
  deleteComment,
  replyToComment
} 