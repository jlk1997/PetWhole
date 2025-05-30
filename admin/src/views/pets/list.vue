<template>
  <div class="pet-list-container">
    <div class="page-header">
      <h2>宠物列表</h2>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="filter-card">
      <el-form :inline="true" :model="queryParams" class="filter-form">
        <el-form-item label="搜索">
          <el-input
            v-model="queryParams.search"
            placeholder="宠物名称/品种/主人"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="品种">
          <el-select v-model="queryParams.breed" placeholder="选择品种" clearable>
            <el-option label="全部" value="" />
            <el-option label="拉布拉多" value="拉布拉多" />
            <el-option label="金毛" value="金毛" />
            <el-option label="哈士奇" value="哈士奇" />
            <el-option label="边牧" value="边牧" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <el-table
        v-loading="loading"
        :data="petList"
        style="width: 100%"
        border
      >
        <el-table-column type="index" width="50" align="center" />
        <el-table-column prop="name" label="宠物名称" width="150" />
        <el-table-column prop="breed" label="品种" width="150" />
        <el-table-column prop="gender" label="性别" width="80">
          <template #default="scope">
            {{ scope.row.gender === 'male' ? '公' : scope.row.gender === 'female' ? '母' : '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="age" label="年龄" width="80">
          <template #default="scope">
            {{ scope.row.age ? `${scope.row.age}岁` : '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="owner.nickname" label="主人" width="120" />
        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              @click="viewPetDetail(scope.row)"
            >
              查看
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDelete(scope.row)"
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
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { get, del } from '@/api'

// 数据加载状态
const loading = ref(false)

// 宠物列表数据
const petList = ref([])
const total = ref(0)

// 查询参数
const queryParams = reactive({
  page: 1,
  limit: 10,
  search: '',
  breed: ''
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString()
}

// 获取宠物列表
const getPetList = async () => {
  loading.value = true
  try {
    const res = await get('/api/pets', queryParams)
    petList.value = res.data || []
    total.value = res.pagination?.total || 0
  } catch (error) {
    console.error('获取宠物列表失败:', error)
    ElMessage.error('获取宠物列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索处理
const handleSearch = () => {
  queryParams.page = 1
  getPetList()
}

// 重置查询参数
const resetQuery = () => {
  queryParams.search = ''
  queryParams.breed = ''
  queryParams.page = 1
  getPetList()
}

// 分页大小变化
const handleSizeChange = (val) => {
  queryParams.limit = val
  getPetList()
}

// 页码变化
const handleCurrentChange = (val) => {
  queryParams.page = val
  getPetList()
}

// 查看宠物详情
const viewPetDetail = (pet) => {
  ElMessage.info(`查看宠物详情: ${pet.name}`)
  // TODO: 实现详情页跳转
}

// 删除宠物
const handleDelete = (pet) => {
  ElMessageBox.confirm(
    `确定要删除宠物 ${pet.name} 吗？此操作不可逆`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      try {
        await del(`/api/pets/${pet._id}`)
        ElMessage.success('删除成功')
        getPetList()
      } catch (error) {
        console.error('删除宠物失败:', error)
        ElMessage.error('删除失败')
      }
    })
    .catch(() => {
      ElMessage.info('已取消删除')
    })
}

// 页面加载时获取数据
onMounted(() => {
  getPetList()
})
</script>

<style scoped>
.pet-list-container {
  padding: 20px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  justify-content: flex-start;
  flex-wrap: wrap;
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