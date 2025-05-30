<template>
  <div class="post-detail-container">
    <div class="page-header">
      <h2>帖子详情</h2>
      <div class="page-header-actions">
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" @click="handleRefresh">刷新</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="post-card" v-loading="loading">
      <div class="post-header">
        <h3 class="post-title">{{ post.title }}</h3>
        <div class="post-meta">
          <span class="post-author">作者: {{ post.author }}</span>
          <span class="post-time">发布时间: {{ post.createTime }}</span>
          <el-tag :type="getStatusType(post.status)" class="post-status">
            {{ getStatusText(post.status) }}
          </el-tag>
        </div>
      </div>
      
      <el-divider />
      
      <div class="post-content">
        <p>{{ post.content }}</p>
      </div>
      
      <div class="post-images" v-if="post.images && post.images.length">
        <h4>附图</h4>
        <div class="image-list">
          <el-image
            v-for="(image, index) in post.images"
            :key="index"
            :src="image"
            :preview-src-list="post.images"
            fit="cover"
            class="post-image"
          />
        </div>
      </div>
      
      <div class="post-stats">
        <el-tag type="info">浏览 {{ post.viewCount }}</el-tag>
        <el-tag type="success">点赞 {{ post.likeCount }}</el-tag>
        <el-tag type="warning">评论 {{ post.commentCount }}</el-tag>
      </div>
      
      <el-divider />
      
      <div class="post-actions">
        <el-button type="success" @click="handleChangeStatus(post, 'published')" v-if="post.status !== 'published'">发布</el-button>
        <el-button type="danger" @click="handleChangeStatus(post, 'disabled')" v-if="post.status !== 'disabled'">禁用</el-button>
        <el-button type="warning" @click="handleDelete">删除</el-button>
      </div>
    </el-card>
    
    <!-- 评论列表 -->
    <el-card shadow="hover" class="comments-card">
      <template #header>
        <div class="comments-header">
          <h3>评论列表 ({{ comments.length }})</h3>
        </div>
      </template>
      
      <div v-if="comments.length === 0" class="no-comments">
        暂无评论
      </div>
      
      <div v-else class="comment-list">
        <div v-for="comment in comments" :key="comment.id" class="comment-item">
          <div class="comment-user">
            <img :src="comment.avatar" class="comment-avatar" />
            <div class="comment-info">
              <div class="comment-author">{{ comment.author }}</div>
              <div class="comment-time">{{ comment.createTime }}</div>
            </div>
          </div>
          <div class="comment-content">{{ comment.content }}</div>
          <div class="comment-actions">
            <el-button type="text" @click="handleReplyComment(comment)">回复</el-button>
            <el-button type="text" @click="handleDeleteComment(comment)">删除</el-button>
          </div>
          
          <!-- 回复列表 -->
          <div v-if="comment.replies && comment.replies.length" class="reply-list">
            <div v-for="reply in comment.replies" :key="reply.id" class="reply-item">
              <div class="comment-user">
                <img :src="reply.avatar" class="comment-avatar" />
                <div class="comment-info">
                  <div class="comment-author">{{ reply.author }}</div>
                  <div class="comment-time">{{ reply.createTime }}</div>
                </div>
              </div>
              <div class="comment-content">{{ reply.content }}</div>
              <div class="comment-actions">
                <el-button type="text" @click="handleDeleteComment(reply)">删除</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 回复对话框 -->
    <el-dialog v-model="replyDialogVisible" title="回复评论" width="500px">
      <el-form>
        <el-form-item label="回复内容">
          <el-input
            v-model="replyContent"
            type="textarea"
            rows="4"
            placeholder="请输入回复内容"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="replyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitReply">回复</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const replyDialogVisible = ref(false)
const replyContent = ref('')
const currentComment = ref(null)

// 帖子数据
const post = reactive({
  id: 0,
  title: '',
  content: '',
  author: '',
  createTime: '',
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  status: '',
  images: []
})

// 评论列表
const comments = ref([])

// 获取帖子ID
const getPostId = () => {
  return route.params.id
}

// 加载帖子数据
const loadPostDetail = () => {
  loading.value = true
  const id = getPostId()
  
  // 模拟异步请求
  setTimeout(() => {
    // 模拟帖子数据
    Object.assign(post, {
      id: id,
      title: '我家狗狗今天好可爱',
      content: '今天带我家金毛出去玩，它特别开心，还交到了新朋友。我们去了新开的宠物公园，那里的设施很完善，有专门的狗狗游乐区和休息区。\n\n我家金毛一到那里就兴奋得不得了，到处跑来跑去，还和其他几只狗狗一起玩耍。看到它这么开心，我也特别高兴。\n\n希望以后能有更多这样的宠物友好场所，让我们的毛孩子有更好的社交和玩耍环境。',
      author: '狗狗爱好者',
      createTime: '2023-10-15 09:30:45',
      viewCount: 235,
      likeCount: 42,
      commentCount: 3,
      status: 'published',
      images: [
        'https://images.unsplash.com/photo-1546527868-ccb7ee7dfa6a',
        'https://images.unsplash.com/photo-1551717743-49959800b1f6'
      ]
    })
    
    // 模拟评论数据
    comments.value = [
      {
        id: 1,
        author: '猫咪控',
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
        content: '好可爱的狗狗，我家猫看到肯定会躲起来哈哈',
        createTime: '2023-10-15 10:15:22',
        replies: []
      },
      {
        id: 2,
        author: '宠物医生',
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
        content: '金毛是很活泼的品种，需要多运动，带出去玩是很好的选择',
        createTime: '2023-10-15 11:30:45',
        replies: [
          {
            id: 4,
            author: '狗狗爱好者',
            avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
            content: '谢谢医生的建议，我每天都会带它出去散步',
            createTime: '2023-10-15 12:05:18'
          }
        ]
      },
      {
        id: 3,
        author: '遛狗达人',
        avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
        content: '这个公园在哪里啊？也想带我家狗狗去',
        createTime: '2023-10-15 14:22:37',
        replies: []
      }
    ]
    
    loading.value = false
  }, 500)
}

// 刷新数据
const handleRefresh = () => {
  loadPostDetail()
}

// 获取状态标签类型
const getStatusType = (status) => {
  switch (status) {
    case 'published': return 'success'
    case 'pending': return 'warning'
    case 'disabled': return 'danger'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'published': return '已发布'
    case 'pending': return '待审核'
    case 'disabled': return '已禁用'
    default: return '未知'
  }
}

// 修改帖子状态
const handleChangeStatus = (post, status) => {
  const actionText = status === 'published' ? '发布' : '禁用'
  
  ElMessageBox.confirm(`确定要${actionText}该帖子吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: status === 'published' ? 'success' : 'warning'
  }).then(() => {
    // 更新帖子状态
    post.status = status
    
    ElMessage.success(`帖子已${actionText}`)
  }).catch(() => {})
}

// 删除帖子
const handleDelete = () => {
  ElMessageBox.confirm('确定要删除该帖子吗？删除后无法恢复', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('帖子已删除')
    router.push('/posts/list')
  }).catch(() => {})
}

// 回复评论
const handleReplyComment = (comment) => {
  currentComment.value = comment
  replyContent.value = ''
  replyDialogVisible.value = true
}

// 提交回复
const submitReply = () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容')
    return
  }
  
  // 添加回复
  if (currentComment.value) {
    if (!currentComment.value.replies) {
      currentComment.value.replies = []
    }
    
    currentComment.value.replies.push({
      id: Date.now(),
      author: '管理员',
      avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      content: replyContent.value,
      createTime: new Date().toLocaleString()
    })
    
    ElMessage.success('回复成功')
    replyDialogVisible.value = false
  }
}

// 删除评论
const handleDeleteComment = (comment) => {
  ElMessageBox.confirm('确定要删除该评论吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 查找评论是否是回复
    let isReply = false
    let parentComment = null
    
    for (const c of comments.value) {
      if (c.id === comment.id) {
        break
      }
      
      if (c.replies) {
        const replyIndex = c.replies.findIndex(r => r.id === comment.id)
        if (replyIndex !== -1) {
          isReply = true
          parentComment = c
          break
        }
      }
    }
    
    if (isReply && parentComment) {
      // 删除回复
      const replyIndex = parentComment.replies.findIndex(r => r.id === comment.id)
      parentComment.replies.splice(replyIndex, 1)
    } else {
      // 删除主评论
      const commentIndex = comments.value.findIndex(c => c.id === comment.id)
      if (commentIndex !== -1) {
        comments.value.splice(commentIndex, 1)
      }
    }
    
    ElMessage.success('评论已删除')
  }).catch(() => {})
}

// 组件挂载时加载数据
onMounted(() => {
  loadPostDetail()
})
</script>

<style lang="scss" scoped>
.post-detail-container {
  .post-card {
    margin-bottom: 20px;
    
    .post-header {
      margin-bottom: 20px;
      
      .post-title {
        margin: 0 0 10px 0;
        font-size: 22px;
      }
      
      .post-meta {
        display: flex;
        align-items: center;
        color: #909399;
        
        .post-author, .post-time {
          margin-right: 15px;
        }
      }
    }
    
    .post-content {
      margin-bottom: 20px;
      line-height: 1.6;
      white-space: pre-line;
    }
    
    .post-images {
      margin-bottom: 20px;
      
      h4 {
        margin-top: 0;
        margin-bottom: 10px;
      }
      
      .image-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        
        .post-image {
          width: 150px;
          height: 150px;
          border-radius: 4px;
        }
      }
    }
    
    .post-stats {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    
    .post-actions {
      display: flex;
      gap: 10px;
    }
  }
  
  .comments-card {
    .comments-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      h3 {
        margin: 0;
      }
    }
    
    .no-comments {
      text-align: center;
      color: #909399;
      padding: 20px 0;
    }
    
    .comment-list {
      .comment-item {
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #ebeef5;
        
        &:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .comment-user {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          
          .comment-avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            margin-right: 10px;
          }
          
          .comment-info {
            .comment-author {
              font-weight: bold;
            }
            
            .comment-time {
              font-size: 12px;
              color: #909399;
            }
          }
        }
        
        .comment-content {
          margin-bottom: 10px;
          line-height: 1.5;
        }
        
        .comment-actions {
          margin-bottom: 10px;
        }
        
        .reply-list {
          margin-left: 50px;
          
          .reply-item {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px dashed #ebeef5;
          }
        }
      }
    }
  }
}
</style> 