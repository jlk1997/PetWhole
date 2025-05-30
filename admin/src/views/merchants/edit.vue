<template>
  <div class="merchant-edit-container">
    <div class="page-header">
      <h2>{{ isEdit ? '编辑商家' : '添加商家' }}</h2>
      <div class="page-header-actions">
        <el-button @click="$router.back()">返回</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">保存</el-button>
      </div>
    </div>
    
    <el-card shadow="hover" class="edit-card">
      <el-form 
        ref="formRef" 
        :model="form" 
        :rules="rules" 
        label-width="120px" 
        label-position="right"
        v-loading="loading"
      >
        <el-divider content-position="left">基本信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="商家名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商家名称" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="商家类型" prop="type">
              <el-select v-model="form.type" placeholder="请选择商家类型" style="width: 100%">
                <el-option 
                  v-for="item in merchantTypes" 
                  :key="item.value" 
                  :label="item.label" 
                  :value="item.value" 
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="联系人" prop="contactPerson">
              <el-input v-model="form.contactPerson" placeholder="请输入联系人姓名" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="联系电话" prop="contactPhone">
              <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="电子邮箱" prop="email">
              <el-input v-model="form.email" placeholder="请输入电子邮箱" />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="营业时间" prop="businessHours">
              <el-input v-model="form.businessHours" placeholder="例如: 9:00-21:00" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">位置信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所在区域" prop="area">
              <el-cascader
                v-model="form.area"
                :options="areaOptions"
                placeholder="请选择所在区域"
                style="width: 100%"
                clearable
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="12">
            <el-form-item label="详细地址" prop="address">
              <el-input v-model="form.address" placeholder="请输入详细地址" />
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="地图位置">
              <div class="map-container">
                <div class="map-placeholder">
                  <el-empty description="地图加载中..." />
                </div>
              </div>
              <div class="map-coordinates">
                <el-input v-model="form.latitude" placeholder="纬度" class="coordinate-input">
                  <template #prepend>纬度</template>
                </el-input>
                <el-input v-model="form.longitude" placeholder="经度" class="coordinate-input">
                  <template #prepend>经度</template>
                </el-input>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">商家信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="商家简介" prop="description">
              <el-input 
                v-model="form.description" 
                type="textarea" 
                rows="4" 
                placeholder="请输入商家简介" 
              />
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="提供服务" prop="services">
              <el-select
                v-model="form.services"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="请选择提供的服务"
                style="width: 100%"
              >
                <el-option
                  v-for="item in serviceOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="状态" prop="status">
              <el-radio-group v-model="form.status">
                <el-radio value="active">正常</el-radio>
                <el-radio value="pending">待审核</el-radio>
                <el-radio value="disabled">禁用</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="认证状态">
              <el-switch
                v-model="form.verified"
                active-text="已认证"
                inactive-text="未认证"
              />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-divider content-position="left">图片信息</el-divider>
        
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item label="Logo上传">
              <el-upload
                class="avatar-uploader"
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                :on-change="handleLogoChange"
              >
                <img v-if="logoUrl" :src="logoUrl" class="avatar" />
                <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">建议上传正方形图片，大小不超过2MB</div>
            </el-form-item>
          </el-col>
          
          <el-col :span="24">
            <el-form-item label="商家图片">
              <el-upload
                class="image-uploader"
                action="#"
                :auto-upload="false"
                list-type="picture-card"
                :on-change="handleImageChange"
                :on-remove="handleImageRemove"
                :on-preview="handleImagePreview"
              >
                <el-icon><Plus /></el-icon>
              </el-upload>
              <div class="upload-tip">
                可上传多张图片展示商家环境，每张大小不超过5MB
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
    
    <!-- 图片预览对话框 -->
    <el-dialog v-model="previewVisible" title="图片预览">
      <img :src="previewUrl" alt="商家图片预览" style="width: 100%;" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const formRef = ref(null)

const loading = ref(false)
const submitting = ref(false)
const previewVisible = ref(false)
const previewUrl = ref('')
const logoUrl = ref('')
const fileList = ref([])

// 判断是新增还是编辑
const isEdit = computed(() => {
  return route.params.id !== undefined
})

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
      { value: '朝阳区', label: '朝阳区' },
      { value: '海淀区', label: '海淀区' },
      { value: '东城区', label: '东城区' },
      { value: '西城区', label: '西城区' },
      { value: '丰台区', label: '丰台区' }
    ]
  },
  {
    value: '上海市',
    label: '上海市',
    children: [
      { value: '浦东新区', label: '浦东新区' },
      { value: '静安区', label: '静安区' },
      { value: '黄浦区', label: '黄浦区' },
      { value: '徐汇区', label: '徐汇区' }
    ]
  }
]

// 服务选项
const serviceOptions = [
  { value: '宠物医疗', label: '宠物医疗' },
  { value: '宠物美容', label: '宠物美容' },
  { value: '宠物训练', label: '宠物训练' },
  { value: '宠物寄养', label: '宠物寄养' },
  { value: '宠物用品', label: '宠物用品' },
  { value: '宠物食品', label: '宠物食品' },
  { value: '宠物摄影', label: '宠物摄影' },
  { value: '宠物配种', label: '宠物配种' },
  { value: '宠物活动', label: '宠物活动' },
  { value: '其他服务', label: '其他服务' }
]

// 表单数据
const form = reactive({
  name: '',
  type: '',
  contactPerson: '',
  contactPhone: '',
  email: '',
  businessHours: '',
  area: [],
  address: '',
  latitude: '',
  longitude: '',
  description: '',
  services: [],
  status: 'pending',
  verified: false,
  logo: null,
  images: []
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入商家名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择商家类型', trigger: 'change' }
  ],
  contactPerson: [
    { required: true, message: '请输入联系人姓名', trigger: 'blur' }
  ],
  contactPhone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入电子邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  area: [
    { required: true, message: '请选择所在区域', trigger: 'change' }
  ],
  address: [
    { required: true, message: '请输入详细地址', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入商家简介', trigger: 'blur' }
  ]
}

// 组件挂载时执行
onMounted(() => {
  if (isEdit.value) {
    loadMerchantData()
  }
})

// 加载商家数据
const loadMerchantData = () => {
  const id = route.params.id
  loading.value = true
  
  // 模拟异步请求
  setTimeout(() => {
    // 模拟数据
    Object.assign(form, {
      name: '爱心宠物诊所',
      type: 'pet_hospital',
      contactPerson: '张医生',
      contactPhone: '13800138000',
      email: 'aixin@example.com',
      businessHours: '9:00-21:00',
      area: ['北京市', '朝阳区'],
      address: '朝阳区建国路88号',
      latitude: '39.9219',
      longitude: '116.4551',
      description: '专业宠物医院，提供全方位的宠物医疗和保健服务。拥有先进的医疗设备和经验丰富的兽医团队。',
      services: ['宠物医疗', '宠物美容', '宠物寄养'],
      status: 'active',
      verified: true
    })
    
    // 设置Logo
    logoUrl.value = 'https://img.icons8.com/color/96/000000/veterinarian.png'
    
    // 设置图片列表
    fileList.value = [
      {
        name: 'image1.jpg',
        url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7'
      },
      {
        name: 'image2.jpg',
        url: 'https://images.unsplash.com/photo-1582486225544-ac37bc196434'
      }
    ]
    
    loading.value = false
  }, 500)
}

// 处理Logo变更
const handleLogoChange = (file) => {
  // 验证文件大小
  if (file.raw.size / 1024 / 1024 > 2) {
    ElMessage.error('Logo图片大小不能超过2MB')
    return
  }
  
  logoUrl.value = URL.createObjectURL(file.raw)
  form.logo = file.raw
}

// 处理图片变更
const handleImageChange = (file) => {
  // 验证文件大小
  if (file.raw.size / 1024 / 1024 > 5) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }
  
  // 将文件添加到表单
  form.images.push(file.raw)
}

// 处理图片删除
const handleImageRemove = (file) => {
  // 从表单中移除文件
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index !== -1) {
    fileList.value.splice(index, 1)
    form.images = form.images.filter((_, i) => i !== index)
  }
}

// 处理图片预览
const handleImagePreview = (file) => {
  previewUrl.value = file.url
  previewVisible.value = true
}

// 提交表单
const submitForm = () => {
  formRef.value.validate(async (valid) => {
    if (!valid) {
      return ElMessage.error('请填写完整表单信息')
    }
    
    submitting.value = true
    
    // 模拟异步请求
    setTimeout(() => {
      ElMessage.success(isEdit.value ? '商家信息更新成功' : '商家添加成功')
      submitting.value = false
      
      // 返回列表页
      router.push('/merchants/list')
    }, 1000)
  })
}
</script>

<style lang="scss" scoped>
.merchant-edit-container {
  .edit-card {
    margin-bottom: 20px;
  }
  
  .coordinate-input {
    width: 180px;
    margin-right: 15px;
  }
  
  .avatar-uploader {
    .avatar {
      width: 120px;
      height: 120px;
      display: block;
      object-fit: cover;
    }
    
    .avatar-uploader-icon {
      font-size: 28px;
      color: #8c939d;
      width: 120px;
      height: 120px;
      text-align: center;
      line-height: 120px;
      border: 1px dashed #d9d9d9;
      border-radius: 6px;
      cursor: pointer;
    }
  }
  
  .image-uploader {
    :deep(.el-upload--picture-card) {
      width: 120px;
      height: 120px;
      line-height: 120px;
    }
  }
  
  .upload-tip {
    color: #909399;
    font-size: 12px;
    margin-top: 5px;
  }
  
  .map-container {
    height: 300px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    margin-bottom: 10px;
    
    .map-placeholder {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  
  .map-coordinates {
    display: flex;
    margin-top: 10px;
  }
}
</style> 