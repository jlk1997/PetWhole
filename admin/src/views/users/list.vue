<template>
  <div class="users-container">
    <div class="page-header">
      <h2>用户管理</h2>
      <div class="page-header-actions">
        <el-button type="primary" @click="handleRefresh">刷新数据</el-button>
      </div>
    </div>
    
    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="用户昵称">
          <el-input v-model="filterForm.nickname" placeholder="输入用户昵称" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="手机号码">
          <el-input v-model="filterForm.phone" placeholder="输入手机号码" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="账号状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable @change="handleFilter">
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item label="注册时间">
          <el-date-picker
            v-model="filterForm.registerTime"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 用户列表 -->
    <el-card shadow="hover" class="users-card">
      <el-table :data="filteredUsers" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="100">
          <template #default="scope">
            <el-avatar :src="scope.row.avatar" :size="40">
              {{ scope.row.nickname.substring(0, 1) }}
            </el-avatar>
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="用户昵称" min-width="120" />
        <el-table-column prop="phone" label="手机号码" width="150" />
        <el-table-column prop="email" label="电子邮箱" width="180" show-overflow-tooltip />
        <el-table-column label="性别" width="80">
          <template #default="scope">
            <el-tag type="info" v-if="scope.row.gender === 'unknown'">未知</el-tag>
            <el-tag type="success" v-else-if="scope.row.gender === 'male'">男</el-tag>
            <el-tag type="danger" v-else-if="scope.row.gender === 'female'">女</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="注册时间" width="180" />
        <el-table-column prop="lastLoginTime" label="最后登录" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleView(scope.row)">查看</el-button>
            <el-button 
              v-if="scope.row.status === 'active'" 
              size="small" 
              type="danger" 
              @click="handleDisable(scope.row)"
            >禁用</el-button>
            <el-button 
              v-else 
              size="small" 
              type="success" 
              @click="handleEnable(scope.row)"
            >启用</el-button>
            <el-button size="small" type="warning" @click="handleReset(scope.row)">重置密码</el-button>
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
          :total="totalUsers"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 重置密码对话框 -->
    <el-dialog
      v-model="resetDialogVisible"
      title="重置密码"
      width="400px"
    >
      <div class="reset-form">
        <p>确定要重置用户 <strong>{{ currentUser.nickname }}</strong> 的密码吗？</p>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const resetDialogVisible = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(0)

// 筛选表单
const filterForm = reactive({
  nickname: '',
  phone: '',
  status: '',
  registerTime: []
})

// 当前操作的用户
const currentUser = ref({})

// 用户数据
const users = ref([
  {
    id: 1,
    nickname: '小狗爱好者',
    avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    phone: '13800138000',
    email: 'dog_lover@example.com',
    gender: 'male',
    registerTime: '2023-10-15 09:30:15',
    lastLoginTime: '2023-11-18 14:25:30',
    status: 'active',
    postCount: 15,
    petCount: 2,
    followCount: 28,
    followerCount: 36,
    bio: '热爱宠物，尤其是狗狗。拥有两只可爱的金毛，喜欢分享它们的日常。'
  },
  {
    id: 2,
    nickname: '猫咪公主',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    phone: '13900139000',
    email: 'cat_princess@example.com',
    gender: 'female',
    registerTime: '2023-10-18 11:20:45',
    lastLoginTime: '2023-11-17 19:40:12',
    status: 'active',
    postCount: 23,
    petCount: 3,
    followCount: 45,
    followerCount: 102,
    bio: '三只猫咪的铲屎官，喜欢拍摄猫咪的各种萌态。专业猫咪护理师，提供猫咪养护建议。'
  },
  {
    id: 3,
    nickname: '宠物医生王',
    avatar: 'https://cube.elemecdn.com/9/c2/f0ee8a3c7c9638a54940382568c9cpng.png',
    phone: '13700137000',
    email: 'pet_doctor@example.com',
    gender: 'male',
    registerTime: '2023-10-20 08:15:30',
    lastLoginTime: '2023-11-19 08:10:45',
    status: 'active',
    postCount: 42,
    petCount: 1,
    followCount: 146,
    followerCount: 520,
    bio: '宠物医院医生，专业兽医。热爱分享宠物健康知识，为宠物主人提供专业建议。'
  },
  {
    id: 4,
    nickname: '汪汪训练师',
    avatar: 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png',
    phone: '13600136000',
    email: 'dog_trainer@example.com',
    gender: 'unknown',
    registerTime: '2023-10-25 14:40:20',
    lastLoginTime: '2023-11-15 16:20:30',
    status: 'active',
    postCount: 31,
    petCount: 4,
    followCount: 89,
    followerCount: 215,
    bio: '专业狗狗训练师，擅长行为矫正和技能培训。欢迎咨询各类犬类训练问题。'
  },
  {
    id: 5,
    nickname: '宠物摄影师',
    avatar: 'https://cube.elemecdn.com/0/88/03b0d39583f48206768a7534e55bcpng.png',
    phone: '13500135000',
    email: 'pet_photo@example.com',
    gender: 'female',
    registerTime: '2023-11-01 10:30:45',
    lastLoginTime: '2023-11-18 11:15:22',
    status: 'disabled',
    postCount: 18,
    petCount: 0,
    followCount: 67,
    followerCount: 124,
    bio: '专业宠物摄影师，提供宠物写真服务。喜欢捕捉宠物最自然、最可爱的瞬间。'
  }
])

// 根据筛选条件过滤用户
const filteredUsers = computed(() => {
  let result = users.value
  
  if (filterForm.nickname) {
    result = result.filter(user => user.nickname.includes(filterForm.nickname))
  }
  
  if (filterForm.phone) {
    result = result.filter(user => user.phone.includes(filterForm.phone))
  }
  
  if (filterForm.status) {
    result = result.filter(user => user.status === filterForm.status)
  }
  
  if (filterForm.registerTime && filterForm.registerTime.length === 2) {
    const startDate = new Date(filterForm.registerTime[0])
    const endDate = new Date(filterForm.registerTime[1])
    endDate.setHours(23, 59, 59, 999)  // 设置为当天结束时间
    
    result = result.filter(user => {
      const registerDate = new Date(user.registerTime)
      return registerDate >= startDate && registerDate <= endDate
    })
  }
  
  totalUsers.value = result.length
  
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  
  return result.slice(start, end)
})

// 组件挂载时加载数据
onMounted(() => {
  loadUsers()
})

// 加载用户数据
const loadUsers = () => {
  loading.value = true
  
  // 这里应该是从API获取数据
  // 模拟异步请求
  setTimeout(() => {
    totalUsers.value = users.value.length
    loading.value = false
  }, 500)
}

// 刷新数据
const handleRefresh = () => {
  loadUsers()
}

// 处理筛选
const handleFilter = () => {
  currentPage.value = 1
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.nickname = ''
  filterForm.phone = ''
  filterForm.status = ''
  filterForm.registerTime = []
  currentPage.value = 1
}

// 处理分页大小变化
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

// 处理页码变化
const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 查看用户详情
const handleView = (row) => {
  router.push(`/users/detail/${row.id}`)
}

// 禁用用户
const handleDisable = (row) => {
  ElMessageBox.confirm(`确定要禁用用户 "${row.nickname}" 吗？禁用后该用户将无法登录。`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 更新用户状态
    const index = users.value.findIndex(user => user.id === row.id)
    if (index !== -1) {
      users.value[index].status = 'disabled'
    }
    
    ElMessage.success('用户已禁用')
  }).catch(() => {
    // 取消操作
  })
}

// 启用用户
const handleEnable = (row) => {
  ElMessageBox.confirm(`确定要启用用户 "${row.nickname}" 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success'
  }).then(() => {
    // 更新用户状态
    const index = users.value.findIndex(user => user.id === row.id)
    if (index !== -1) {
      users.value[index].status = 'active'
    }
    
    ElMessage.success('用户已启用')
  }).catch(() => {
    // 取消操作
  })
}

// 重置密码
const handleReset = (row) => {
  currentUser.value = row
  resetDialogVisible.value = true
}

// 确认重置密码
const confirmReset = () => {
  // 这里应该调用API进行密码重置
  // 模拟异步请求
  setTimeout(() => {
    resetDialogVisible.value = false
    ElMessage.success(`用户 ${currentUser.value.nickname} 的密码已重置，新密码已通过短信发送`)
  }, 500)
}
</script>

<style lang="scss" scoped>
.users-container {
  .filter-card {
    margin-bottom: 20px;
  }
  
  .users-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
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
</style> 