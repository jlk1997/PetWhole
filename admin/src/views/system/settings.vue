<template>
  <div class="settings-container">
    <div class="page-header">
      <h2>系统设置</h2>
    </div>

    <el-card class="settings-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="基础设置" name="basic">
          <el-form
            ref="basicFormRef"
            :model="basicForm"
            :rules="basicRules"
            label-width="120px"
            status-icon
          >
            <el-form-item label="系统名称" prop="siteName">
              <el-input v-model="basicForm.siteName" />
            </el-form-item>
            <el-form-item label="系统描述" prop="siteDescription">
              <el-input
                v-model="basicForm.siteDescription"
                type="textarea"
                :rows="3"
              />
            </el-form-item>
            <el-form-item label="备案信息" prop="icpInfo">
              <el-input v-model="basicForm.icpInfo" />
            </el-form-item>
            <el-form-item label="系统公告" prop="announcement">
              <el-input
                v-model="basicForm.announcement"
                type="textarea"
                :rows="4"
              />
            </el-form-item>
            <el-form-item label="联系邮箱" prop="contactEmail">
              <el-input v-model="basicForm.contactEmail" />
            </el-form-item>
            <el-form-item label="Logo">
              <el-upload
                class="avatar-uploader"
                action="/api/admin/uploads"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleLogoSuccess"
                :before-upload="beforeLogoUpload"
              >
                <img v-if="basicForm.logo" :src="basicForm.logo" class="avatar" />
                <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveBasicSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="用户设置" name="user">
          <el-form
            ref="userFormRef"
            :model="userForm"
            :rules="userRules"
            label-width="200px"
            status-icon
          >
            <el-form-item label="开放注册" prop="allowRegister">
              <el-switch v-model="userForm.allowRegister" />
            </el-form-item>
            <el-form-item label="需要邮箱验证" prop="requireEmailVerification">
              <el-switch v-model="userForm.requireEmailVerification" />
            </el-form-item>
            <el-form-item label="新用户默认积分" prop="defaultCredits">
              <el-input-number
                v-model="userForm.defaultCredits"
                :min="0"
                :precision="0"
              />
            </el-form-item>
            <el-form-item label="日发帖上限" prop="postLimitPerDay">
              <el-input-number
                v-model="userForm.postLimitPerDay"
                :min="0"
                :precision="0"
              />
              <span class="form-help-text">设置为0表示不限制</span>
            </el-form-item>
            <el-form-item label="最大宠物注册数量" prop="maxPetsPerUser">
              <el-input-number
                v-model="userForm.maxPetsPerUser"
                :min="0"
                :precision="0"
              />
              <span class="form-help-text">设置为0表示不限制</span>
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveUserSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="高级设置" name="advanced">
          <el-form
            ref="advancedFormRef"
            :model="advancedForm"
            :rules="advancedRules"
            label-width="200px"
            status-icon
          >
            <el-form-item label="每页显示记录数" prop="itemsPerPage">
              <el-input-number
                v-model="advancedForm.itemsPerPage"
                :min="5"
                :max="100"
                :precision="0"
              />
            </el-form-item>
            <el-form-item label="系统缓存时间(分钟)" prop="cacheTime">
              <el-input-number
                v-model="advancedForm.cacheTime"
                :min="0"
                :precision="0"
              />
              <span class="form-help-text">设置为0表示不缓存</span>
            </el-form-item>
            <el-form-item label="敏感词过滤" prop="enableSensitiveWordFilter">
              <el-switch v-model="advancedForm.enableSensitiveWordFilter" />
            </el-form-item>
            <el-form-item
              label="敏感词列表"
              prop="sensitiveWords"
              v-if="advancedForm.enableSensitiveWordFilter"
            >
              <el-input
                v-model="advancedForm.sensitiveWords"
                type="textarea"
                :rows="5"
                placeholder="敏感词之间用逗号分隔"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="saveAdvancedSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { get, post } from '@/api'

// 当前激活的选项卡
const activeTab = ref('basic')

// 上传文件的请求头
const uploadHeaders = {
  Authorization: `Bearer ${localStorage.getItem('token')}`
}

// ----- 基础设置表单 -----
const basicFormRef = ref(null)
const basicForm = reactive({
  siteName: '',
  siteDescription: '',
  icpInfo: '',
  announcement: '',
  contactEmail: '',
  logo: ''
})
const basicRules = {
  siteName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' }
  ],
  contactEmail: [
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ]
}

// ----- 用户设置表单 -----
const userFormRef = ref(null)
const userForm = reactive({
  allowRegister: true,
  requireEmailVerification: false,
  defaultCredits: 0,
  postLimitPerDay: 0,
  maxPetsPerUser: 0
})
const userRules = {
  defaultCredits: [
    { type: 'number', message: '积分必须为数字', trigger: 'change' }
  ],
  postLimitPerDay: [
    { type: 'number', message: '发帖上限必须为数字', trigger: 'change' }
  ],
  maxPetsPerUser: [
    { type: 'number', message: '宠物数量必须为数字', trigger: 'change' }
  ]
}

// ----- 高级设置表单 -----
const advancedFormRef = ref(null)
const advancedForm = reactive({
  itemsPerPage: 20,
  cacheTime: 10,
  enableSensitiveWordFilter: false,
  sensitiveWords: ''
})
const advancedRules = {
  itemsPerPage: [
    { required: true, message: '请输入每页显示记录数', trigger: 'blur' },
    { type: 'number', message: '记录数必须为数字', trigger: 'change' }
  ],
  cacheTime: [
    { type: 'number', message: '缓存时间必须为数字', trigger: 'change' }
  ]
}

// 加载系统设置数据
const loadSettings = async () => {
  try {
    const res = await get('/api/admin/system/settings')
    
    // 填充基础设置
    basicForm.siteName = res.data.basic?.siteName || ''
    basicForm.siteDescription = res.data.basic?.siteDescription || ''
    basicForm.icpInfo = res.data.basic?.icpInfo || ''
    basicForm.announcement = res.data.basic?.announcement || ''
    basicForm.contactEmail = res.data.basic?.contactEmail || ''
    basicForm.logo = res.data.basic?.logo || ''
    
    // 填充用户设置
    userForm.allowRegister = res.data.user?.allowRegister !== false
    userForm.requireEmailVerification = !!res.data.user?.requireEmailVerification
    userForm.defaultCredits = res.data.user?.defaultCredits || 0
    userForm.postLimitPerDay = res.data.user?.postLimitPerDay || 0
    userForm.maxPetsPerUser = res.data.user?.maxPetsPerUser || 0
    
    // 填充高级设置
    advancedForm.itemsPerPage = res.data.advanced?.itemsPerPage || 20
    advancedForm.cacheTime = res.data.advanced?.cacheTime || 10
    advancedForm.enableSensitiveWordFilter = !!res.data.advanced?.enableSensitiveWordFilter
    advancedForm.sensitiveWords = res.data.advanced?.sensitiveWords?.join(', ') || ''
    
  } catch (error) {
    console.error('加载系统设置失败:', error)
    ElMessage.error('加载系统设置失败')
  }
}

// Logo上传相关方法
const handleLogoSuccess = (res) => {
  basicForm.logo = res.data.url
  ElMessage.success('Logo上传成功')
}
const beforeLogoUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2
  
  if (!isImage) {
    ElMessage.error('Logo只能是图片格式!')
  }
  if (!isLt2M) {
    ElMessage.error('Logo大小不能超过2MB!')
  }
  
  return isImage && isLt2M
}

// 保存基础设置
const saveBasicSettings = async () => {
  if (!basicFormRef.value) return
  
  basicFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await post('/api/admin/system/settings/basic', basicForm)
        ElMessage.success('基础设置保存成功')
      } catch (error) {
        console.error('保存基础设置失败:', error)
        ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
      }
    }
  })
}

// 保存用户设置
const saveUserSettings = async () => {
  if (!userFormRef.value) return
  
  userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        await post('/api/admin/system/settings/user', userForm)
        ElMessage.success('用户设置保存成功')
      } catch (error) {
        console.error('保存用户设置失败:', error)
        ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
      }
    }
  })
}

// 保存高级设置
const saveAdvancedSettings = async () => {
  if (!advancedFormRef.value) return
  
  advancedFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        // 处理敏感词
        const sensitiveWords = advancedForm.sensitiveWords
          .split(',')
          .map(word => word.trim())
          .filter(word => word)
        
        await post('/api/admin/system/settings/advanced', {
          ...advancedForm,
          sensitiveWords
        })
        ElMessage.success('高级设置保存成功')
      } catch (error) {
        console.error('保存高级设置失败:', error)
        ElMessage.error('保存失败: ' + (error.response?.data?.message || error.message))
      }
    }
  })
}

// 页面加载时获取数据
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.form-help-text {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.avatar-uploader {
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.avatar-uploader .el-upload:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 120px;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.avatar {
  width: 120px;
  height: 120px;
  display: block;
  object-fit: contain;
}
</style> 