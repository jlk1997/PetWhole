<template>
  <div class="admin-list-container">
    <div class="page-header">
      <h2>管理员列表</h2>
      <el-button type="primary" @click="handleAdd">添加管理员</el-button>
    </div>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="adminList"
        style="width: 100%"
        border
      >
        <el-table-column type="index" width="50" align="center" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="name" label="姓名" width="150" />
        <el-table-column prop="email" label="邮箱" width="220" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.role === 'admin'" type="success">管理员</el-tag>
            <el-tag v-else-if="scope.row.role === 'superadmin'" type="danger">超级管理员</el-tag>
            <el-tag v-else-if="scope.row.role === 'editor'" type="warning">编辑</el-tag>
            <el-tag v-else-if="scope.row.role === 'viewer'" type="info">访客</el-tag>
            <el-tag v-else>{{ scope.row.role }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.status === 'active'" type="success">正常</el-tag>
            <el-tag v-else-if="scope.row.status === 'inactive'" type="info">未激活</el-tag>
            <el-tag v-else-if="scope.row.status === 'locked'" type="danger">已锁定</el-tag>
            <el-tag v-else>{{ scope.row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLogin" label="最后登录时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.lastLogin) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              @click="handleEdit(scope.row)"
              :disabled="scope.row.role === 'superadmin' && !isSuperAdmin"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              :type="scope.row.status === 'active' ? 'warning' : 'success'"
              @click="handleToggleStatus(scope.row)"
              :disabled="scope.row.role === 'superadmin' && !isSuperAdmin"
            >
              {{ scope.row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(scope.row)"
              :disabled="scope.row.role === 'superadmin'"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:currentPage="queryParams.page"
          v-model:page-size="queryParams.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '添加管理员' : '编辑管理员'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="dialogType === 'edit'" />
        </el-form-item>
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="编辑" value="editor" />
            <el-option label="访客" value="viewer" />
            <el-option
              v-if="isSuperAdmin"
              label="超级管理员"
              value="superadmin"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="dialogType === 'add'" label="密码" prop="password">
          <el-input v-model="form.password" type="password" />
        </el-form-item>
        <el-form-item v-if="dialogType === 'add'" label="确认密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, post, put, del } from '@/api'

// 当前用户信息
const currentUser = computed(() => {
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : {}
})

// 是否为超级管理员
const isSuperAdmin = computed(() => currentUser.value.role === 'superadmin')

// 数据加载状态
const loading = ref(false)

// 管理员列表数据
const adminList = ref([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  limit: 10
})

// 对话框状态
const dialogVisible = ref(false)
const dialogType = ref('add') // add 或 edit
const formRef = ref(null)

// 表单数据
const form = reactive({
  username: '',
  name: '',
  email: '',
  role: 'editor',
  password: '',
  confirmPassword: ''
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能小于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

// 获取管理员列表
const getAdminList = async () => {
  loading.value = true
  try {
    const res = await get('/api/admin/admins', queryParams)
    adminList.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch (error) {
    console.error('获取管理员列表失败:', error)
    ElMessage.error('获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

// 添加管理员
const handleAdd = () => {
  dialogType.value = 'add'
  form.username = ''
  form.name = ''
  form.email = ''
  form.role = 'editor'
  form.password = ''
  form.confirmPassword = ''
  dialogVisible.value = true
}

// 编辑管理员
const handleEdit = (row) => {
  dialogType.value = 'edit'
  form.id = row._id
  form.username = row.username
  form.name = row.name
  form.email = row.email
  form.role = row.role
  form.password = ''
  form.confirmPassword = ''
  dialogVisible.value = true
}

// 切换管理员状态
const handleToggleStatus = async (row) => {
  const action = row.status === 'active' ? '禁用' : '启用'
  
  ElMessageBox.confirm(
    `确定要${action}管理员 ${row.username} 吗？`,
    '提示',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        const newStatus = row.status === 'active' ? 'inactive' : 'active'
        await put(`/api/admin/admins/${row._id}/status`, { status: newStatus })
        ElMessage.success(`${action}成功`)
        getAdminList()
      } catch (error) {
        console.error(`${action}管理员失败:`, error)
        ElMessage.error(`${action}失败`)
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 删除管理员
const handleDelete = (row) => {
  if (row._id === currentUser.value.id) {
    ElMessage.warning('不能删除自己的账号')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除管理员 ${row.username} 吗？此操作不可逆`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        await del(`/api/admin/admins/${row._id}`)
        ElMessage.success('删除成功')
        getAdminList()
      } catch (error) {
        console.error('删除管理员失败:', error)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 提交表单
const submitForm = async () => {
  if (!formRef.value) return
  
  formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (dialogType.value === 'add') {
          // 添加管理员
          const adminData = {
            username: form.username,
            name: form.name,
            email: form.email,
            role: form.role,
            password: form.password
          }
          await post('/api/admin/admins', adminData)
          ElMessage.success('添加管理员成功')
        } else {
          // 编辑管理员
          const adminData = {
            name: form.name,
            email: form.email,
            role: form.role
          }
          await put(`/api/admin/admins/${form.id}`, adminData)
          ElMessage.success('更新管理员信息成功')
        }
        
        dialogVisible.value = false
        getAdminList()
      } catch (error) {
        console.error('提交管理员信息失败:', error)
        ElMessage.error('操作失败: ' + (error.response?.data?.message || error.message))
      }
    }
  })
}

// 分页大小变化
const handleSizeChange = (val) => {
  queryParams.limit = val
  getAdminList()
}

// 页码变化
const handleCurrentChange = (val) => {
  queryParams.page = val
  getAdminList()
}

// 页面加载时获取数据
onMounted(() => {
  getAdminList()
})
</script>

<style scoped>
.admin-list-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style> 