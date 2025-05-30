<template>
  <div class="merchants-container">
    <div class="page-header">
      <h2>商家管理</h2>
      <div class="page-header-actions">
        <el-button type="primary" @click="$router.push('/merchants/add')">添加商家</el-button>
        <el-button type="primary" @click="handleRefresh">刷新</el-button>
      </div>
    </div>
    
    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="商家名称">
          <el-input v-model="filterForm.name" placeholder="输入商家名称" clearable @clear="handleFilter" />
        </el-form-item>
        <el-form-item label="商家类型">
          <el-select v-model="filterForm.type" placeholder="选择商家类型" clearable @change="handleFilter">
            <el-option v-for="item in merchantTypes" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="所在区域">
          <el-cascader
            v-model="filterForm.area"
            :options="areaOptions"
            clearable
            filterable
            placeholder="选择区域"
            @change="handleFilter"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable @change="handleFilter">
            <el-option label="正常" value="active" />
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
    
    <!-- 商家列表 -->
    <el-card shadow="hover" class="merchants-card">
      <el-table :data="filteredMerchants" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="Logo" width="100">
          <template #default="scope">
            <el-image
              style="width: 50px; height: 50px; border-radius: 4px"
              :src="scope.row.logo"
              :preview-src-list="[scope.row.logo]"
              fit="cover"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="商家名称" min-width="150" />
        <el-table-column prop="typeName" label="商家类型" width="120" />
        <el-table-column prop="area" label="所在区域" width="150" />
        <el-table-column prop="contactPerson" label="联系人" width="100" />
        <el-table-column prop="contactPhone" label="联系电话" width="150" />
        <el-table-column label="认证状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.verified ? 'success' : 'info'">
              {{ scope.row.verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handleView(scope.row)">查看</el-button>
            <el-button size="small" type="success" @click="$router.push(`/merchants/edit/${scope.row.id}`)">编辑</el-button>
            <el-button 
              v-if="scope.row.status === 'pending'"
              size="small" 
              type="warning" 
              @click="handleVerify(scope.row)"
            >审核</el-button>
            <el-button 
              v-if="scope.row.status === 'active'"
              size="small" 
              type="danger" 
              @click="handleDisable(scope.row)"
            >禁用</el-button>
            <el-button 
              v-if="scope.row.status === 'disabled'"
              size="small" 
              type="success" 
              @click="handleEnable(scope.row)"
            >启用</el-button>
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
          :total="totalMerchants"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 商家详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="商家详情"
      width="800px"
    >
      <div class="merchant-detail">
        <div class="merchant-header">
          <div class="merchant-logo">
            <el-image
              style="width: 100px; height: 100px; border-radius: 4px"
              :src="currentMerchant.logo"
              :preview-src-list="[currentMerchant.logo]"
              fit="cover"
            />
          </div>
          <div class="merchant-title">
            <h3>{{ currentMerchant.name }}</h3>
            <div class="merchant-tags">
              <el-tag type="success" v-if="currentMerchant.verified">已认证</el-tag>
              <el-tag :type="getStatusType(currentMerchant.status)">
                {{ getStatusText(currentMerchant.status) }}
              </el-tag>
              <el-tag type="info">{{ currentMerchant.typeName }}</el-tag>
            </div>
          </div>
        </div>
        
        <el-divider />
        
        <div class="merchant-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="商家ID">{{ currentMerchant.id }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ currentMerchant.createTime }}</el-descriptions-item>
            <el-descriptions-item label="联系人">{{ currentMerchant.contactPerson }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ currentMerchant.contactPhone }}</el-descriptions-item>
            <el-descriptions-item label="Email">{{ currentMerchant.email }}</el-descriptions-item>
            <el-descriptions-item label="营业时间">{{ currentMerchant.businessHours }}</el-descriptions-item>
            <el-descriptions-item label="所在区域">{{ currentMerchant.area }}</el-descriptions-item>
            <el-descriptions-item label="详细地址">{{ currentMerchant.address }}</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <el-divider />
        
        <div class="merchant-description">
          <h4>商家介绍</h4>
          <p>{{ currentMerchant.description || '暂无介绍' }}</p>
        </div>
        
        <div class="merchant-services" v-if="currentMerchant.services && currentMerchant.services.length">
          <h4>提供服务</h4>
          <div class="service-tags">
            <el-tag 
              v-for="service in currentMerchant.services" 
              :key="service" 
              class="service-tag"
            >
              {{ service }}
            </el-tag>
          </div>
        </div>
        
        <div class="merchant-images" v-if="currentMerchant.images && currentMerchant.images.length">
          <h4>商家图片</h4>
          <div class="images-container">
            <el-image
              v-for="(image, index) in currentMerchant.images"
              :key="index"
              style="width: 120px; height: 120px; margin: 5px; border-radius: 4px"
              :src="image"
              :preview-src-list="currentMerchant.images"
              :initial-index="index"
              fit="cover"
            />
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="$router.push(`/merchants/edit/${currentMerchant.id}`)">编辑</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 商家审核对话框 -->
    <el-dialog
      v-model="verifyDialogVisible"
      title="商家审核"
      width="500px"
    >
      <el-form ref="verifyFormRef" :model="verifyForm" label-width="80px">
        <el-form-item label="审核结果" prop="status">
          <el-radio-group v-model="verifyForm.status">
            <el-radio value="active">通过</el-radio>
            <el-radio value="disabled">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否认证" prop="verified">
          <el-switch
            v-model="verifyForm.verified"
            active-text="认证"
            inactive-text="不认证"
          />
        </el-form-item>
        <el-form-item label="审核意见" prop="comment">
          <el-input
            v-model="verifyForm.comment"
            type="textarea"
            placeholder="请输入审核意见"
            :rows="4"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="verifyDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitVerify">提交</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 加载状态
const loading = ref(false)

// 对话框状态
const detailDialogVisible = ref(false)
const verifyDialogVisible = ref(false)

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalMerchants = ref(0)

// 商家类型选项
const merchantTypes = [
  { value: 'pet_hospital', label: '宠物医院' },
  { value: 'pet_shop', label: '宠物商店' },
  { value: 'pet_service', label: '宠物服务' },
  { value: 'pet_beauty', label: '宠物美容' },
  { value: 'pet_training', label: '宠物训练' },
  { value: 'pet_hotel', label: '宠物酒店' },
  { value: 'pet_park', label: '宠物公园' },
  { value: 'cafe', label: '宠物友好咖啡厅' },
  { value: 'restaurant', label: '宠物友好餐厅' },
  { value: 'others', label: '其他' }
]

// 区域选项
const areaOptions = [
  {
    value: '北京市',
    label: '北京市',
    children: [
      {
        value: '朝阳区',
        label: '朝阳区'
      },
      {
        value: '海淀区',
        label: '海淀区'
      },
      {
        value: '东城区',
        label: '东城区'
      },
      {
        value: '西城区',
        label: '西城区'
      },
      {
        value: '丰台区',
        label: '丰台区'
      }
    ]
  },
  {
    value: '上海市',
    label: '上海市',
    children: [
      {
        value: '浦东新区',
        label: '浦东新区'
      },
      {
        value: '静安区',
        label: '静安区'
      },
      {
        value: '黄浦区',
        label: '黄浦区'
      },
      {
        value: '徐汇区',
        label: '徐汇区'
      }
    ]
  }
]

// 筛选表单
const filterForm = reactive({
  name: '',
  type: '',
  area: [],
  status: ''
})

// 审核表单
const verifyFormRef = ref(null)
const verifyForm = reactive({
  id: '',
  status: 'active',
  verified: false,
  comment: ''
})

// 当前操作的商家
const currentMerchant = ref({})

// 商家数据
const merchants = ref([
  { 
    id: 1, 
    name: '爱心宠物诊所', 
    logo: 'https://img.icons8.com/color/96/000000/veterinarian.png', 
    type: 'pet_hospital', 
    typeName: '宠物医院', 
    area: '北京市朝阳区', 
    address: '朝阳区建国路88号', 
    contactPerson: '张医生', 
    contactPhone: '13800138000', 
    email: 'aixin@example.com',
    businessHours: '9:00-21:00',
    verified: true, 
    status: 'active', 
    createTime: '2023-10-15 10:00:00',
    description: '专业宠物医院，提供全方位的宠物医疗和保健服务。拥有先进的医疗设备和经验丰富的兽医团队。',
    services: ['健康检查', '疫苗接种', '手术治疗', '宠物美容', '宠物寄养'],
    images: [
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7',
      'https://images.unsplash.com/photo-1582486225544-ac37bc196434',
      'https://images.unsplash.com/photo-1564760055775-d63b17a55c44'
    ]
  },
  { 
    id: 2, 
    name: '萌宠用品商城', 
    logo: 'https://img.icons8.com/color/96/000000/pet-shop.png', 
    type: 'pet_shop', 
    typeName: '宠物商店', 
    area: '北京市海淀区', 
    address: '海淀区中关村南大街5号', 
    contactPerson: '李经理', 
    contactPhone: '13900139000', 
    email: 'mengchong@example.com',
    businessHours: '10:00-22:00',
    verified: true, 
    status: 'active', 
    createTime: '2023-10-20 14:30:00',
    description: '提供各类高质量的宠物用品，包括食品、玩具、服装等。我们注重产品质量和宠物健康。',
    services: ['宠物用品', '宠物食品', '宠物玩具', '宠物服装', '宠物饰品'],
    images: [
      'https://images.unsplash.com/photo-1602612142771-04b0adfca95d',
      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee'
    ]
  },
  { 
    id: 3, 
    name: '汪汪训练中心', 
    logo: 'https://img.icons8.com/color/96/000000/dog-training.png', 
    type: 'pet_training', 
    typeName: '宠物训练', 
    area: '北京市丰台区', 
    address: '丰台区丰台南路18号', 
    contactPerson: '王教练', 
    contactPhone: '13700137000', 
    email: 'training@example.com',
    businessHours: '9:00-18:00',
    verified: false, 
    status: 'pending', 
    createTime: '2023-11-05 09:15:00',
    description: '专业的狗狗训练中心，提供基础训练、行为矫正、特殊技能训练等服务。我们的训练师都拥有多年经验。',
    services: ['基础训练', '行为矫正', '社交训练', '特殊技能训练', '一对一指导'],
    images: [
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7'
    ]
  },
  { 
    id: 4, 
    name: '宠悦美容会所', 
    logo: 'https://img.icons8.com/color/96/000000/scissors.png', 
    type: 'pet_beauty', 
    typeName: '宠物美容', 
    area: '上海市静安区', 
    address: '静安区南京西路88号', 
    contactPerson: '赵美容师', 
    contactPhone: '13600136000', 
    email: 'beauty@example.com',
    businessHours: '10:00-20:00',
    verified: true, 
    status: 'disabled', 
    createTime: '2023-09-25 11:30:00',
    description: '高端宠物美容会所，提供专业的宠物美容和SPA服务。我们使用天然环保的美容产品，呵护每一位宠物的健康。',
    services: ['洗澡', '美容', 'SPA', '按摩', '造型设计'],
    images: [
      'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7',
      'https://images.unsplash.com/photo-1518832553624-3f5c31a15802'
    ]
  },
  { 
    id: 5, 
    name: '喵喵咖啡馆', 
    logo: 'https://img.icons8.com/color/96/000000/cafe.png', 
    type: 'cafe', 
    typeName: '宠物友好咖啡厅', 
    area: '上海市徐汇区', 
    address: '徐汇区衡山路120号', 
    contactPerson: '钱店长', 
    contactPhone: '13500135000', 
    email: 'miaocafe@example.com',
    businessHours: '11:00-23:00',
    verified: false, 
    status: 'pending', 
    createTime: '2023-11-10 16:00:00',
    description: '宠物友好的咖啡馆，欢迎主人带着爱宠一起来享用美食和咖啡。我们有专门的宠物区域和宠物专属菜单。',
    services: ['咖啡', '简餐', '宠物专属菜单', '宠物活动', '宠物社交'],
    images: [
      'https://images.unsplash.com/photo-1511920170033-f8396924c348',
      'https://images.unsplash.com/photo-1510972527921-ce03766a1cf1'
    ]
  }
])

// 根据筛选条件过滤商家
const filteredMerchants = computed(() => {
  let result = merchants.value
  
  if (filterForm.name) {
    result = result.filter(merchant => merchant.name.includes(filterForm.name))
  }
  
  if (filterForm.type) {
    result = result.filter(merchant => merchant.type === filterForm.type)
  }
  
  if (filterForm.area && filterForm.area.length > 0) {
    // 如果选择了完整的省市区
    if (filterForm.area.length >= 2) {
      const areaString = filterForm.area.join('')
      result = result.filter(merchant => merchant.area.includes(areaString))
    } 
    // 如果只选择了省份
    else {
      result = result.filter(merchant => merchant.area.includes(filterForm.area[0]))
    }
  }
  
  if (filterForm.status) {
    result = result.filter(merchant => merchant.status === filterForm.status)
  }
  
  totalMerchants.value = result.length
  
  // 分页处理
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  
  return result.slice(start, end)
})

// 组件挂载时加载数据
onMounted(() => {
  // 从API获取商家数据
  loadMerchants()
})

// 加载商家数据
const loadMerchants = () => {
  loading.value = true
  
  // 这里应该是从API获取数据
  // 模拟异步请求
  setTimeout(() => {
    totalMerchants.value = merchants.value.length
    loading.value = false
  }, 500)
}

// 刷新数据
const handleRefresh = () => {
  loadMerchants()
}

// 获取状态标签类型
const getStatusType = (status) => {
  switch (status) {
    case 'active': return 'success'
    case 'pending': return 'warning'
    case 'disabled': return 'danger'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status) => {
  switch (status) {
    case 'active': return '正常'
    case 'pending': return '待审核'
    case 'disabled': return '已禁用'
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
  filterForm.area = []
  filterForm.status = ''
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

// 查看商家详情
const handleView = (row) => {
  currentMerchant.value = row
  detailDialogVisible.value = true
}

// 审核商家
const handleVerify = (row) => {
  verifyForm.id = row.id
  verifyForm.status = 'active'
  verifyForm.verified = false
  verifyForm.comment = ''
  verifyDialogVisible.value = true
}

// 禁用商家
const handleDisable = (row) => {
  ElMessageBox.confirm('确定要禁用该商家吗？禁用后商家将无法正常运营', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 更新商家状态
    const index = merchants.value.findIndex(merchant => merchant.id === row.id)
    if (index !== -1) {
      merchants.value[index].status = 'disabled'
    }
    
    ElMessage.success('商家已禁用')
  }).catch(() => {
    // 取消操作
  })
}

// 启用商家
const handleEnable = (row) => {
  ElMessageBox.confirm('确定要启用该商家吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'success'
  }).then(() => {
    // 更新商家状态
    const index = merchants.value.findIndex(merchant => merchant.id === row.id)
    if (index !== -1) {
      merchants.value[index].status = 'active'
    }
    
    ElMessage.success('商家已启用')
  }).catch(() => {
    // 取消操作
  })
}

// 提交审核
const submitVerify = () => {
  // 更新商家状态
  const index = merchants.value.findIndex(merchant => merchant.id === verifyForm.id)
  if (index !== -1) {
    merchants.value[index].status = verifyForm.status
    merchants.value[index].verified = verifyForm.verified
  }
  
  // 关闭对话框
  verifyDialogVisible.value = false
  
  // 显示成功消息
  ElMessage.success('商家审核完成')
}
</script>

<style lang="scss" scoped>
.merchants-container {
  .filter-card {
    margin-bottom: 20px;
  }
  
  .merchants-card {
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .merchant-detail {
    .merchant-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
      
      .merchant-logo {
        margin-right: 20px;
      }
      
      .merchant-title {
        h3 {
          margin: 0 0 10px 0;
          font-size: 22px;
        }
        
        .merchant-tags {
          .el-tag {
            margin-right: 8px;
          }
        }
      }
    }
    
    .merchant-description {
      margin-bottom: 20px;
      
      h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      p {
        margin: 0;
        line-height: 1.6;
      }
    }
    
    .merchant-services {
      margin-bottom: 20px;
      
      h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .service-tags {
        .service-tag {
          margin-right: 8px;
          margin-bottom: 8px;
        }
      }
    }
    
    .merchant-images {
      h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 16px;
      }
      
      .images-container {
        display: flex;
        flex-wrap: wrap;
      }
    }
  }
}
</style> 