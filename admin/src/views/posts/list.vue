<template>
  <div class="posts-container">
    <div class="page-header">
      <h2>社区帖子管理</h2>
      <div class="page-header-actions">
        <el-button type="primary" @click="handleRefresh">刷新数据</el-button>
      </div>
    </div>
    
    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="内容关键词">
          <el-input v-model="filterForm.content" placeholder="搜索帖子内容" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="filterForm.author" placeholder="输入作者昵称" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable @change="handleFilter">
            <el-option label="已发布" value="published" />
            <el-option label="待审核" value="pending" />
            <el-option label="已禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 帖子列表 -->
    <el-card shadow="hover" class="posts-card">
      <el-table :data="postList" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="标题" min-width="150" show-overflow-tooltip />
        <el-table-column prop="author" label="作者" width="120" />
        <el-table-column prop="createTime" label="发布时间" width="180" />
        <el-table-column prop="viewCount" label="浏览量" width="100" />
        <el-table-column prop="likeCount" label="点赞数" width="100" />
        <el-table-column prop="commentCount" label="评论数" width="100" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleView(scope.row)">查看</el-button>
            <el-button size="small" type="success" @click="handleChangeStatus(scope.row, 'published')" v-if="scope.row.status !== 'published'">发布</el-button>
            <el-button size="small" type="danger" @click="handleChangeStatus(scope.row, 'disabled')" v-if="scope.row.status !== 'disabled'">禁用</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="totalPosts"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalPosts = ref(0)

// 筛选表单
const filterForm = reactive({
  content: '',
  author: '',
  status: ''
})

// 模拟数据
const postList = ref([
  {
    id: 1,
    title: '我家狗狗今天好可爱',
    content: '今天带我家金毛出去玩，它特别开心，还交到了新朋友...',
    author: '狗狗爱好者',
    createTime: '2023-10-15 09:30:45',
    viewCount: 235,
    likeCount: 42,
    commentCount: 15,
    status: 'published'
  },
  {
    id: 2,
    title: '求推荐宠物医院',
    content: '我家猫咪最近食欲不太好，有没有推荐的宠物医院？最好是在朝阳区附近...',
    author: '猫咪妈妈',
    createTime: '2023-10-16 14:22:30',
    viewCount: 187,
    likeCount: 28,
    commentCount: 23,
    status: 'published'
  },
  {
    id: 3,
    title: '新发现的宠物公园太棒了',
    content: '今天带狗狗去了新开的宠物公园，环境非常好，设施很完善...',
    author: '遛狗达人',
    createTime: '2023-10-17 16:45:12',
    viewCount: 145,
    likeCount: 36,
    commentCount: 8,
    status: 'pending'
  }
])

// 加载数据
onMounted(() => {
  loadPosts()
})

// 加载帖子数据
const loadPosts = () => {
  loading.value = true
  
  // 模拟异步请求
  setTimeout(() => {
    totalPosts.value = postList.value.length
    loading.value = false
  }, 500)
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

// 处理筛选
const handleFilter = () => {
  currentPage.value = 1
  loadPosts()
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.content = ''
  filterForm.author = ''
  filterForm.status = ''
  currentPage.value = 1
  loadPosts()
}

// 查看帖子详情
const handleView = (row) => {
  router.push(`/posts/detail/${row.id}`)
}

// 刷新数据
const handleRefresh = () => {
  loadPosts()
}

// 修改帖子状态
const handleChangeStatus = (row, status) => {
  const actionText = status === 'published' ? '发布' : '禁用'
  
  ElMessageBox.confirm(`确定要${actionText}该帖子吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: status === 'published' ? 'success' : 'warning'
  }).then(() => {
    // 更新帖子状态
    const index = postList.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      postList.value[index].status = status
    }
    
    ElMessage.success(`帖子已${actionText}`)
  }).catch(() => {})
}

// 删除帖子
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该帖子吗？删除后无法恢复', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 从列表中删除
    const index = postList.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      postList.value.splice(index, 1)
      totalPosts.value--
    }
    
    ElMessage.success('帖子已删除')
  }).catch(() => {})
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  loadPosts()
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
  loadPosts()
}
</script>

<style lang="scss" scoped>
.posts-container {
  .filter-card {
    margin-bottom: 20px;
  }
  
  .posts-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style> 