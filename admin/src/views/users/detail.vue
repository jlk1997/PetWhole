<template>
  <div class="user-detail-container">
    <div class="page-header">
      <h2>用户详情</h2>
      <div class="page-header-actions">
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" @click="handleRefresh">刷新</el-button>
      </div>
    </div>
    
    <div class="detail-content" v-loading="loading">
      <!-- 基本信息卡片 -->
      <el-card shadow="hover" class="basic-info-card">
        <div class="user-profile">
          <div class="user-avatar">
            <el-avatar :src="user.avatar" :size="100">
              {{ user.nickname ? user.nickname.substring(0, 1) : 'U' }}
            </el-avatar>
          </div>
          <div class="user-info">
            <h3 class="user-name">{{ user.nickname }}</h3>
            <div class="user-tags">
              <el-tag :type="user.status === 'active' ? 'success' : 'danger'">
                {{ user.status === 'active' ? '正常' : '禁用' }}
              </el-tag>
              <el-tag type="info" v-if="user.gender === 'unknown'">未知</el-tag>
              <el-tag type="success" v-else-if="user.gender === 'male'">男</el-tag>
              <el-tag type="danger" v-else-if="user.gender === 'female'">女</el-tag>
            </div>
            <p class="user-bio">{{ user.bio || '该用户暂未设置个人简介' }}</p>
          </div>
          <div class="user-actions">
            <el-button 
              v-if="user.status === 'active'" 
              type="danger" 
              @click="handleDisable"
            >禁用账号</el-button>
            <el-button 
              v-else 
              type="success" 
              @click="handleEnable"
            >启用账号</el-button>
            <el-button type="warning" @click="handleReset">重置密码</el-button>
          </div>
        </div>
        
        <el-divider />
        
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ user.id }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ user.registerTime }}</el-descriptions-item>
          <el-descriptions-item label="手机号码">{{ user.phone }}</el-descriptions-item>
          <el-descriptions-item label="电子邮箱">{{ user.email }}</el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ user.lastLoginTime }}</el-descriptions-item>
          <el-descriptions-item label="登录IP">{{ user.lastLoginIp || '未知' }}</el-descriptions-item>
        </el-descriptions>
      </el-card>
      
      <!-- 统计数据卡片 -->
      <el-card shadow="hover" class="stats-card">
        <template #header>
          <div class="card-header">
            <span>活动统计</span>
          </div>
        </template>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">{{ user.postCount || 0 }}</div>
            <div class="stat-label">发布帖子</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ user.petCount || 0 }}</div>
            <div class="stat-label">宠物数量</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ user.followCount || 0 }}</div>
            <div class="stat-label">关注数</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">{{ user.followerCount || 0 }}</div>
            <div class="stat-label">粉丝数</div>
          </div>
        </div>
      </el-card>
      
      <!-- 宠物列表卡片 -->
      <el-card shadow="hover" class="pets-card" v-if="user.pets && user.pets.length">
        <template #header>
          <div class="card-header">
            <span>宠物列表</span>
          </div>
        </template>
        <div class="pet-list">
          <div v-for="pet in user.pets" :key="pet.id" class="pet-item">
            <div class="pet-avatar">
              <el-avatar :src="pet.avatar" :size="60">
                {{ pet.name ? pet.name.substring(0, 1) : 'P' }}
              </el-avatar>
            </div>
            <div class="pet-info">
              <div class="pet-name">{{ pet.name }}</div>
              <div class="pet-breed">{{ pet.breed }}</div>
              <div class="pet-age">{{ pet.age }}岁</div>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 最近发布卡片 -->
      <el-card shadow="hover" class="posts-card" v-if="user.recentPosts && user.recentPosts.length">
        <template #header>
          <div class="card-header">
            <span>最近发布</span>
            <el-button type="text" @click="viewAllPosts">查看全部</el-button>
          </div>
        </template>
        <div class="post-list">
          <div v-for="post in user.recentPosts" :key="post.id" class="post-item">
            <div class="post-time">{{ post.createTime }}</div>
            <div class="post-title">{{ post.title }}</div>
            <div class="post-stats">
              <span><i class="el-icon-view"></i> {{ post.viewCount }}</span>
              <span><i class="el-icon-star-on"></i> {{ post.likeCount }}</span>
              <span><i class="el-icon-chat-dot-round"></i> {{ post.commentCount }}</span>
            </div>
          </div>
        </div>
      </el-card>
      
      <!-- 操作日志卡片 -->
      <el-card shadow="hover" class="logs-card">
        <template #header>
          <div class="card-header">
            <span>操作日志</span>
          </div>
        </template>
        <el-table :data="logs" style="width: 100%">
          <el-table-column prop="time" label="时间" width="180" />
          <el-table-column prop="action" label="操作" width="150" />
          <el-table-column prop="ip" label="IP地址" width="150" />
          <el-table-column prop="detail" label="详情" min-width="200" />
        </el-table>
      </el-card>
    </div>
    
    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="400px"
    >
      <div class="reset-form">
        <p>确定要重置用户 <strong>{{ user.nickname }}</strong> 的密码吗？</p>
        <p>重置后将生成随机密码并通过短信发送给用户。</p>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmReset">确定重置</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const resetDialogVisible = ref(false)

// 用户数据
const user = ref({})

// 操作日志
const logs = ref([
  {
    time: '2023-11-19 14:30:22',
    action: '登录',
    ip: '112.45.67.89',
    detail: '通过手机APP登录'
  },
  {
    time: '2023-11-18 18:15:10',
    action: '登录',
    ip: '112.45.67.89',
    detail: '通过手机APP登录'
  },
  {
    time: '2023-11-17 09:22:45',
    action: '发布帖子',
    ip: '112.45.67.89',
    detail: '发布帖子《我家狗狗好可爱》'
  },
  {
    time: '2023-11-16 16:40:12',
    action: '修改信息',
    ip: '112.45.67.89',
    detail: '修改了个人简介'
  },
  {
    time: '2023-11-15 11:05:38',
    action: '登录',
    ip: '118.76.23.54',
    detail: '通过网页端登录'
  }
])

// 获取用户ID
const getUserId = () => {
  return route.params.id
}

// 组件挂载时加载数据
onMounted(() => {
  loadUserData()
})

// 加载用户数据
const loadUserData = () => {
  loading.value = true
  const id = getUserId()
  
  // 这里应该是从API获取数据
  // 模拟异步请求
  setTimeout(() => {
    // 模拟数据
    user.value = {
      id: id,
      nickname: '小狗爱好者',
      avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
      phone: '13800138000',
      email: 'dog_lover@example.com',
      gender: 'male',
      registerTime: '2023-10-15 09:30:15',
      lastLoginTime: '2023-11-19 14:30:22',
      lastLoginIp: '112.45.67.89',
      status: 'active',
      postCount: 15,
      petCount: 2,
      followCount: 28,
      followerCount: 36,
      bio: '热爱宠物，尤其是狗狗。拥有两只可爱的金毛，喜欢分享它们的日常。',
      pets: [
        {
          id: 1,
          name: '旺财',
          avatar: 'https://images.unsplash.com/photo-1552053831-71594a27632d',
          breed: '金毛',
          age: 3
        },
        {
          id: 2,
          name: '豆豆',
          avatar: 'https://images.unsplash.com/photo-1576201836106-db1758fd1c97',
          breed: '金毛',
          age: 1
        }
      ],
      recentPosts: [
        {
          id: 1,
          title: '我家狗狗好可爱',
          createTime: '2023-11-17 09:22:45',
          viewCount: 156,
          likeCount: 32,
          commentCount: 8
        },
        {
          id: 2,
          title: '推荐一家靠谱的宠物医院',
          createTime: '2023-11-10 15:40:12',
          viewCount: 204,
          likeCount: 45,
          commentCount: 12
        },
        {
          id: 3,
          title: '给新手铲屎官的建议',
          createTime: '2023-11-05 11:20:30',
          viewCount: 312,
          likeCount: 87,
          commentCount: 23
        }
      ]
    }
    
    loading.value = false
  }, 500)
}

// 刷新数据
const handleRefresh = () => {
  loadUserData()
}

// 查看全部帖子
const viewAllPosts = () => {
  ElMessage.info('功能开发中')
}

// 禁用用户
const handleDisable = () => {
  ElMessageBox.confirm(`确定要禁用用户 "${user.value.nickname}" 吗？禁用后该用户将无法登录。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 更新用户状态
    user.value.status = 'disabled'
    ElMessage.success('用户已禁用')
  }).catch(() => {
    // 取消操作
  })
}

// 启用用户
const handleEnable = () => {
  ElMessageBox.confirm(`确定要启用用户 "${user.value.nickname}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success'
  }).then(() => {
    // 更新用户状态
    user.value.status = 'active'
    ElMessage.success('用户已启用')
  }).catch(() => {
    // 取消操作
  })
}

// 重置密码
const handleReset = () => {
  resetDialogVisible.value = true
}

// 确认重置密码
const confirmReset = () => {
  // 这里应该调用API进行密码重置
  // 模拟异步请求
  setTimeout(() => {
    resetDialogVisible.value = false
    ElMessage.success(`用户 ${user.value.nickname} 的密码已重置，新密码已通过短信发送`)
  }, 500)
}
</script>

<style lang="scss" scoped>
.user-detail-container {
  .detail-content {
    display: grid;
    grid-template-columns: 2fr 1fr;
    grid-gap: 20px;
  }
  
  .basic-info-card {
    grid-column: 1 / -1;
    
    .user-profile {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
      
      .user-avatar {
        margin-right: 20px;
      }
      
      .user-info {
        flex: 1;
        
        .user-name {
          margin: 0 0 10px 0;
          font-size: 24px;
        }
        
        .user-tags {
          margin-bottom: 10px;
          
          .el-tag {
            margin-right: 10px;
          }
        }
        
        .user-bio {
          color: #606266;
          line-height: 1.6;
        }
      }
      
      .user-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
    }
  }
  
  .stats-card {
    grid-column: 1;
    grid-row: 2;
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-gap: 20px;
      
      .stat-item {
        text-align: center;
        padding: 20px;
        border-radius: 4px;
        background-color: #f5f7fa;
        
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
          margin-bottom: 8px;
        }
        
        .stat-label {
          color: #606266;
        }
      }
    }
  }
  
  .pets-card {
    grid-column: 1;
    grid-row: 3;
    
    .pet-list {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      
      .pet-item {
        display: flex;
        width: calc(50% - 10px);
        
        .pet-avatar {
          margin-right: 15px;
        }
        
        .pet-info {
          .pet-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .pet-breed, .pet-age {
            color: #606266;
            font-size: 14px;
          }
        }
      }
    }
  }
  
  .posts-card {
    grid-column: 2;
    grid-row: 2 / 4;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .post-list {
      .post-item {
        padding: 15px 0;
        border-bottom: 1px solid #ebeef5;
        
        &:last-child {
          border-bottom: none;
        }
        
        .post-time {
          font-size: 12px;
          color: #909399;
          margin-bottom: 5px;
        }
        
        .post-title {
          font-weight: bold;
          margin-bottom: 8px;
        }
        
        .post-stats {
          font-size: 12px;
          color: #909399;
          
          span {
            margin-right: 15px;
            
            i {
              margin-right: 3px;
            }
          }
        }
      }
    }
  }
  
  .logs-card {
    grid-column: 1 / -1;
    grid-row: 4;
  }
  
  .reset-form {
    p {
      margin: 10px 0;
      line-height: 1.5;
    }
    
    strong {
      font-weight: bold;
    }
  }
}

@media (max-width: 1200px) {
  .user-detail-container {
    .detail-content {
      grid-template-columns: 1fr;
    }
    
    .basic-info-card,
    .stats-card,
    .pets-card,
    .posts-card,
    .logs-card {
      grid-column: 1;
    }
    
    .stats-card {
      grid-row: 2;
    }
    
    .posts-card {
      grid-row: 3;
    }
    
    .pets-card {
      grid-row: 4;
    }
    
    .logs-card {
      grid-row: 5;
    }
  }
}

@media (max-width: 768px) {
  .user-detail-container {
    .user-profile {
      flex-direction: column;
      
      .user-avatar {
        margin-right: 0;
        margin-bottom: 20px;
      }
      
      .user-actions {
        margin-top: 20px;
      }
    }
    
    .pets-card {
      .pet-list {
        .pet-item {
          width: 100%;
        }
      }
    }
  }
}
</style> 