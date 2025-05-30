<template>
  <div class="map-container">
    <div class="page-header">
      <h2>地图标记管理</h2>
      <div class="page-header-actions">
        <el-button type="primary" @click="handleRefresh">刷新数据</el-button>
        <el-button type="success" @click="dialogVisible = true">添加标记</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="map-card">
      <div class="map-controls">
        <div class="map-filter">
          <el-select v-model="filterType" placeholder="标记类型" clearable @change="handleFilter">
            <el-option
              v-for="item in markerTypes"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
          <el-select v-model="filterStatus" placeholder="审核状态" clearable @change="handleFilter">
            <el-option label="已审核" value="approved" />
            <el-option label="待审核" value="pending" />
            <el-option label="已拒绝" value="rejected" />
          </el-select>
        </div>
        <div class="map-actions">
          <el-switch
            v-model="showLegend"
            active-text="显示图例"
            inactive-text=""
          />
          <el-select v-model="mapStyle" placeholder="地图样式">
            <el-option label="标准" value="standard" />
            <el-option label="卫星" value="satellite" />
            <el-option label="黑夜" value="dark" />
          </el-select>
        </div>
      </div>
      
      <div class="map-view">
        <!-- 地图加载中提示 -->
        <div class="map-loading" v-if="loading">
          <el-skeleton style="width: 100%; height: 100%" animated />
        </div>
        
        <!-- 地图加载失败提示 -->
        <div class="map-error" v-else-if="mapError">
          <el-empty description="地图加载失败" :image-size="200">
            <template #description>
              <p>地图加载失败，请检查网络连接</p>
            </template>
            <el-button type="primary" @click="handleRefresh">重试</el-button>
          </el-empty>
        </div>
        
        <!-- 地图容器 -->
        <div class="map-content" v-else>
          <!-- 这里会渲染实际地图组件 -->
          <el-empty description="地图组件占位符" :image-size="200">
            <template #description>
              <p>这里将加载实际地图和标记点数据</p>
              <p>目前使用模拟数据进行展示</p>
            </template>
          </el-empty>
        </div>
        
        <!-- 地图图例 -->
        <div class="map-legend" v-if="showLegend">
          <h4>图例</h4>
          <div class="legend-item" v-for="item in markerTypes" :key="item.value">
            <div class="legend-color" :style="{ backgroundColor: item.color }"></div>
            <div class="legend-label">{{ item.label }}</div>
          </div>
        </div>
      </div>
    </el-card>
    
    <!-- 标记列表 -->
    <el-card shadow="hover" class="markers-list-card">
      <template #header>
        <div class="card-header">
          <span>标记列表</span>
          <span>共 {{ markers.length }} 个标记点</span>
        </div>
      </template>
      
      <el-table :data="filteredMarkers" style="width: 100%" :max-height="400">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="标记名称" min-width="150" />
        <el-table-column prop="typeName" label="类型" width="120" />
        <el-table-column prop="address" label="地址" min-width="150" show-overflow-tooltip />
        <el-table-column label="坐标" width="180">
          <template #default="scope">
            {{ scope.row.latitude }}, {{ scope.row.longitude }}
          </template>
        </el-table-column>
        <el-table-column prop="creator" label="创建者" width="120" />
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
            <el-button size="small" type="success" @click="handleCenter(scope.row)">居中</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
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

// 状态变量
const loading = ref(false)
const mapError = ref(false)
const dialogVisible = ref(false)
const showLegend = ref(true)
const mapStyle = ref('standard')

// 筛选条件
const filterType = ref('')
const filterStatus = ref('')

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

// 表单引用
const formRef = ref(null)

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
  creator: ''
})

// 标记类型
const markerTypes = [
  { value: 'park', label: '公园', color: '#67C23A' },
  { value: 'hospital', label: '宠物医院', color: '#F56C6C' },
  { value: 'shop', label: '宠物商店', color: '#E6A23C' },
  { value: 'restaurant', label: '宠物友好餐厅', color: '#909399' },
  { value: 'hotel', label: '宠物酒店', color: '#409EFF' },
  { value: 'toilet', label: '宠物厕所', color: '#9E6EE8' },
  { value: 'training', label: '训练中心', color: '#FF9900' },
  { value: 'beauty', label: '美容中心', color: '#FF69B4' }
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
    creator: '张三'
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
    creator: '李四'
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
    creator: '王五'
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
    creator: '赵六'
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
    creator: '钱七'
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
    creator: '孙八'
  }
])

// 筛选后的标记
const filteredMarkers = computed(() => {
  let result = markers.value
  
  if (filterType.value) {
    result = result.filter(marker => marker.type === filterType.value)
  }
  
  if (filterStatus.value) {
    result = result.filter(marker => marker.status === filterStatus.value)
  }
  
  return result
})

// 组件挂载时加载数据
onMounted(() => {
  loadMapData()
})

// 加载地图数据
const loadMapData = () => {
  loading.value = true
  mapError.value = false
  
  // 模拟异步加载地图
  setTimeout(() => {
    // 随机生成成功或失败结果
    const success = Math.random() > 0.1
    
    if (success) {
      loading.value = false
    } else {
      loading.value = false
      mapError.value = true
    }
  }, 1000)
}

// 获取状态类型
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
  // 应用筛选
}

// 刷新数据
const handleRefresh = () => {
  loadMapData()
}

// 编辑标记
const handleEdit = (row) => {
  // 复制标记数据
  Object.assign(currentMarker, row)
  dialogVisible.value = true
}

// 地图居中到标记点
const handleCenter = (row) => {
  ElMessage.success(`已将地图居中到标记：${row.name}`)
  // 这里应该调用地图API来居中显示
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
    }
    
    ElMessage.success('标记点已删除')
  }).catch(() => {
    // 取消删除
  })
}

// 提交标记
const submitMarker = () => {
  formRef.value.validate((valid) => {
    if (!valid) {
      return
    }
    
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
        creator: '管理员' // 固定为当前管理员
      })
      
      ElMessage.success('标记点已添加')
    }
    
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
      creator: ''
    })
  })
}
</script>

<style lang="scss" scoped>
.map-container {
  .map-card {
    margin-bottom: 20px;
    
    .map-controls {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      
      .map-filter {
        display: flex;
        gap: 10px;
      }
      
      .map-actions {
        display: flex;
        gap: 10px;
        align-items: center;
      }
    }
    
    .map-view {
      height: 500px;
      position: relative;
      border: 1px solid #e4e7ed;
      border-radius: 4px;
      overflow: hidden;
      
      .map-loading,
      .map-error,
      .map-content {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .map-legend {
        position: absolute;
        bottom: 20px;
        right: 20px;
        background-color: white;
        border-radius: 4px;
        padding: 10px;
        box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
        
        h4 {
          margin-top: 0;
          margin-bottom: 10px;
          font-size: 14px;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          margin-bottom: 5px;
          
          .legend-color {
            width: 15px;
            height: 15px;
            border-radius: 50%;
            margin-right: 8px;
          }
          
          .legend-label {
            font-size: 12px;
          }
        }
      }
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