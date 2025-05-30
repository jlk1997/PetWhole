<template>
  <div class="markers-container">
    <div class="page-header">
      <h2>标记点列表</h2>
      <div class="page-header-actions">
        <el-button @click="$router.push('/markers/map')">地图视图</el-button>
        <el-button type="primary" @click="dialogVisible = true">添加标记</el-button>
      </div>
    </div>
    
    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="标记名称">
          <el-input v-model="filterForm.name" placeholder="输入标记名称" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="标记类型">
          <el-select v-model="filterForm.type" placeholder="选择标记类型" clearable @change="handleFilter">
            <el-option
              v-for="item in markerTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable @change="handleFilter">
            <el-option label="已审核" value="approved" />
            <el-option label="待审核" value="pending" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建者">
          <el-input v-model="filterForm.creator" placeholder="输入创建者" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 标记列表 -->
    <el-card shadow="hover" class="markers-card">
      <el-table :data="filteredMarkers" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标记名称" min-width="150" />
        <el-table-column prop="typeName" label="类型" width="120">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)">{{ scope.row.typeName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="address" label="地址" min-width="200" show-overflow-tooltip />
        <el-table-column label="坐标" width="180">
          <template #default="scope">
            {{ scope.row.latitude }}, {{ scope.row.longitude }}
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建者" width="120" />
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleEdit(scope.row)">编辑</el-button>
            <el-button 
              v-if="scope.row.status === 'pending'"
              size="small" 
              type="success" 
              @click="handleApprove(scope.row)"
            >审核通过</el-button>
            <el-button 
              v-if="scope.row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="handleReject(scope.row)"
            >拒绝</el-button>
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
          :total="totalMarkers"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 添加/编辑标记对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="currentMarker.id ? '编辑标记' : '添加标记'"
      width="600px"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="currentMarker"
        :rules="markerRules"
        label-width="100px"
      >
        <el-form-item label="标记名称" prop="name">
          <el-input v-model="currentMarker.name" placeholder="请输入标记名称" />
        </el-form-item>
        
        <el-form-item label="标记类型" prop="type">
          <el-select v-model="currentMarker.type" placeholder="请选择标记类型" style="width: 100%">
            <el-option
              v-for="item in markerTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="地址" prop="address">
          <el-input v-model="currentMarker.address" placeholder="请输入地址" />
        </el-form-item>
        
        <el-form-item label="坐标">
          <div class="coordinate-inputs">
            <el-input v-model="currentMarker.latitude" placeholder="纬度" class="coordinate-input">
              <template #prepend>纬度</template>
            </el-input>
            <el-input v-model="currentMarker.longitude" placeholder="经度" class="coordinate-input">
              <template #prepend>经度</template>
            </el-input>
          </div>
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="currentMarker.description"
            type="textarea"
            :rows="3"
            placeholder="请输入标记描述"
          />
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="currentMarker.status">
            <el-radio value="approved">已审核</el-radio>
            <el-radio value="pending">待审核</el-radio>
            <el-radio value="rejected">已拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitMarker">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 加载状态
const loading = ref(false)
const dialogVisible = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalMarkers = ref(0)

// 表单引用
const formRef = ref(null)

// 表单校验规则
const markerRules = {
  name: [
    { required: true, message: '请输入标记名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择标记类型', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入地址', trigger: 'blur' }
  ]
}

// 筛选表单
const filterForm = reactive({
  name: '',
  type: '',
  status: '',
  creator: ''
})

// 当前编辑的标记
const currentMarker = reactive({
  id: '',
  name: '',
  type: '',
  typeName: '',
  address: '',
  latitude: '',
  longitude: '',
  description: '',
  status: 'pending',
  creator: '',
  createTime: ''
})

// 标记类型
const markerTypes = [
  { value: 'park', label: '公园', color: 'success' },
  { value: 'hospital', label: '宠物医院', color: 'danger' },
  { value: 'shop', label: '宠物商店', color: 'warning' },
  { value: 'restaurant', label: '宠物友好餐厅', color: 'info' },
  { value: 'hotel', label: '宠物酒店', color: 'primary' },
  { value: 'toilet', label: '宠物厕所', color: '' },
  { value: 'training', label: '训练中心', color: 'success' },
  { value: 'beauty', label: '美容中心', color: 'warning' }
]

// 标记数据
const markers = ref([
  {
    id: 1,
    name: '中央公园宠物区',
    type: 'park',
    typeName: '公园',
    address: '北京市朝阳区中央公园5号门',
    latitude: '39.9219',
    longitude: '116.4551',
    description: '宠物专属游乐区，设有专门的休息区和饮水设施。周末有宠物社交活动。',
    status: 'approved',
    creator: '张三',
    createTime: '2023-10-15 09:30:22'
  },
  {
    id: 2,
    name: '爱心宠物医院',
    type: 'hospital',
    typeName: '宠物医院',
    address: '北京市海淀区学院路28号',
    latitude: '39.9631',
    longitude: '116.3586',
    description: '24小时营业的宠物医院，配有先进的医疗设备和经验丰富的兽医团队。',
    status: 'approved',
    creator: '李四',
    createTime: '2023-10-16 14:25:18'
  },
  {
    id: 3,
    name: '萌宠用品商城',
    type: 'shop',
    typeName: '宠物商店',
    address: '北京市西城区西单北大街103号',
    latitude: '39.9127',
    longitude: '116.3675',
    description: '提供各类高质量的宠物用品，包括食品、玩具、服装等。',
    status: 'pending',
    creator: '王五',
    createTime: '2023-10-17 11:12:36'
  },
  {
    id: 4,
    name: '汪汪咖啡屋',
    type: 'restaurant',
    typeName: '宠物友好餐厅',
    address: '北京市朝阳区三里屯太古里北区NLG-47',
    latitude: '39.9382',
    longitude: '116.4546',
    description: '宠物友好咖啡馆，有专门的宠物菜单和宠物活动区域。',
    status: 'approved',
    creator: '赵六',
    createTime: '2023-10-18 16:45:10'
  },
  {
    id: 5,
    name: '宠悦精品酒店',
    type: 'hotel',
    typeName: '宠物酒店',
    address: '北京市东城区东直门外大街42号',
    latitude: '39.9406',
    longitude: '116.4373',
    description: '高档宠物寄养酒店，提供24小时监控和专业护理服务。',
    status: 'rejected',
    creator: '钱七',
    createTime: '2023-10-19 10:30:55'
  },
  {
    id: 6,
    name: '森林公园宠物厕所',
    type: 'toilet',
    typeName: '宠物厕所',
    address: '北京市海淀区颐和园路5号',
    latitude: '40.0046',
    longitude: '116.3077',
    description: '宠物专用厕所，配有冲洗设施和废物处理设备。',
    status: 'pending',
    creator: '孙八',
    createTime: '2023-10-20 09:15:48'
  }
])

// 筛选后的标记
const filteredMarkers = computed(() => {
  let result = markers.value
  
  if (filterForm.name) {
    result = result.filter(marker => marker.name.includes(filterForm.name))
  }
  
  if (filterForm.type) {
    result = result.filter(marker => marker.type === filterForm.type)
  }
  
  if (filterForm.status) {
    result = result.filter(marker => marker.status === filterForm.status)
  }
  
  if (filterForm.creator) {
    result = result.filter(marker => marker.creator.includes(filterForm.creator))
  }
  
  totalMarkers.value = result.length
  
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  
  return result.slice(start, end)
})

// 组件挂载时加载数据
onMounted(() => {
  loadMarkers()
})

// 加载标记数据
const loadMarkers = () => {
  loading.value = true
  
  // 这里应该是从API获取数据
  // 模拟异步请求
  setTimeout(() => {
    totalMarkers.value = markers.value.length
    loading.value = false
  }, 500)
}

// 获取类型颜色
const getTypeColor = (type) => {
  const item = markerTypes.find(item => item.value === type)
  return item ? item.color : ''
}

// 获取状态标签类型
const getStatusType = (status) => {
  switch (status) {
    case 'approved': return 'success'
    case 'pending': return 'warning'
    case 'rejected': return 'danger'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'approved': return '已审核'
    case 'pending': return '待审核'
    case 'rejected': return '已拒绝'
    default: return '未知'
  }
}

// 处理筛选
const handleFilter = () => {
  currentPage.value = 1
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.name = ''
  filterForm.type = ''
  filterForm.status = ''
  filterForm.creator = ''
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

// 编辑标记
const handleEdit = (row) => {
  // 复制标记数据
  Object.assign(currentMarker, row)
  dialogVisible.value = true
}

// 审核通过标记
const handleApprove = (row) => {
  ElMessageBox.confirm('确定要审核通过该标记点吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success'
  }).then(() => {
    // 更新标记状态
    const index = markers.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      markers.value[index].status = 'approved'
    }
    
    ElMessage.success('标记点已审核通过')
  }).catch(() => {
    // 取消操作
  })
}

// 拒绝标记
const handleReject = (row) => {
  ElMessageBox.confirm('确定要拒绝该标记点吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 更新标记状态
    const index = markers.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      markers.value[index].status = 'rejected'
    }
    
    ElMessage.success('标记点已拒绝')
  }).catch(() => {
    // 取消操作
  })
}

// 删除标记
const handleDelete = (row) => {
  ElMessageBox.confirm('确定要删除该标记点吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 删除标记
    const index = markers.value.findIndex(item => item.id === row.id)
    if (index !== -1) {
      markers.value.splice(index, 1)
      totalMarkers.value--
    }
    
    ElMessage.success('标记点已删除')
  }).catch(() => {
    // 取消操作
  })
}

// 提交标记
const submitMarker = () => {
  formRef.value.validate((valid) => {
    if (!valid) {
      return
    }
    
    // 当前时间
    const now = new Date().toLocaleString()
    
    if (currentMarker.id) {
      // 更新现有标记
      const index = markers.value.findIndex(item => item.id === currentMarker.id)
      if (index !== -1) {
        // 获取类型名称
        const typeObj = markerTypes.find(t => t.value === currentMarker.type)
        currentMarker.typeName = typeObj ? typeObj.label : ''
        
        markers.value[index] = { ...currentMarker }
      }
      
      ElMessage.success('标记点已更新')
    } else {
      // 添加新标记
      const typeObj = markerTypes.find(t => t.value === currentMarker.type)
      
      markers.value.push({
        id: Date.now(), // 模拟ID生成
        name: currentMarker.name,
        type: currentMarker.type,
        typeName: typeObj ? typeObj.label : '',
        address: currentMarker.address,
        latitude: currentMarker.latitude,
        longitude: currentMarker.longitude,
        description: currentMarker.description,
        status: currentMarker.status,
        creator: '管理员', // 固定为当前管理员
        createTime: now
      })
      
      ElMessage.success('标记点已添加')
    }
    
    totalMarkers.value = markers.value.length
    dialogVisible.value = false
    
    // 重置表单
    Object.assign(currentMarker, {
      id: '',
      name: '',
      type: '',
      typeName: '',
      address: '',
      latitude: '',
      longitude: '',
      description: '',
      status: 'pending',
      creator: '',
      createTime: ''
    })
  })
}
</script>

<style lang="scss" scoped>
.markers-container {
  .filter-card {
    margin-bottom: 20px;
  }
  
  .markers-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .coordinate-inputs {
    display: flex;
    gap: 10px;
    
    .coordinate-input {
      flex: 1;
    }
  }
}
</style> 