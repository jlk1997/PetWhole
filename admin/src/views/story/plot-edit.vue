<template>
  <div class="app-container">
    <el-card class="box-card">
      <template #header>
        <div class="card-header">
          <span>{{ isEdit ? '编辑剧情' : '创建剧情' }}</span>
        </div>
      </template>
      
      <el-form 
        ref="plotForm" 
        :model="plotForm" 
        :rules="rules" 
        label-width="120px"
        v-loading="loading"
      >
        <el-form-item label="剧情标题" prop="title">
          <el-input v-model="plotForm.title" placeholder="请输入剧情标题" />
        </el-form-item>
        
        <el-form-item label="剧情描述" prop="description">
          <el-input 
            v-model="plotForm.description" 
            type="textarea" 
            :rows="4"
            placeholder="请输入剧情描述" 
          />
        </el-form-item>
        
        <el-form-item label="封面图片">
          <el-input v-model="plotForm.coverImage" placeholder="请输入封面图片URL" />
        </el-form-item>
        
        <el-form-item label="是否主线剧情">
          <el-switch
            v-model="plotForm.isMainStory"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
        
        <el-form-item label="是否激活">
          <el-switch
            v-model="plotForm.isActive"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
        
        <el-form-item label="排序">
          <el-input-number v-model="plotForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        
        <el-form-item label="剧情要求" title="JSON格式的特殊要求配置">
          <el-input 
            v-model="requirementJson" 
            type="textarea" 
            :rows="3"
            placeholder="{}" 
          />
        </el-form-item>
        
        <el-form-item label="完成奖励" title="JSON格式的奖励配置">
          <el-input 
            v-model="rewardJson" 
            type="textarea" 
            :rows="3"
            placeholder="{}" 
          />
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="submitForm">保存</el-button>
          <el-button @click="goBack">取消</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { getPlotDetail, createPlot, updatePlot } from '@/api/story'
import { ElMessage } from 'element-plus'

export default {
  name: 'PlotEdit',
  data() {
    return {
      isEdit: false,
      plotId: null,
      loading: false,
      requirementJson: '{}',
      rewardJson: '{}',
      plotForm: {
        title: '',
        description: '',
        coverImage: '',
        isMainStory: false,
        isActive: true,
        sortOrder: 0,
        requirement: {},
        reward: {}
      },
      rules: {
        title: [
          { required: true, message: '请输入剧情标题', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        description: [
          { required: true, message: '请输入剧情描述', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    // 判断是否为编辑模式
    const id = this.$route.params.id
    this.isEdit = !!id
    if (this.isEdit) {
      this.plotId = id
      this.fetchPlotData()
    }
  },
  methods: {
    fetchPlotData() {
      this.loading = true
      getPlotDetail(this.plotId).then(response => {
        const plot = response.data.plot
        this.plotForm = {
          title: plot.title,
          description: plot.description,
          coverImage: plot.coverImage || '',
          isMainStory: plot.isMainStory,
          isActive: plot.isActive,
          sortOrder: plot.sortOrder || 0,
          requirement: plot.requirement || {},
          reward: plot.reward || {}
        }
        
        this.requirementJson = JSON.stringify(plot.requirement || {}, null, 2)
        this.rewardJson = JSON.stringify(plot.reward || {}, null, 2)
        
        this.loading = false
      }).catch(() => {
        this.loading = false
        ElMessage.error('获取剧情信息失败')
      })
    },
    submitForm() {
      this.$refs.plotForm.validate(valid => {
        if (valid) {
          // 处理JSON字段
          try {
            this.plotForm.requirement = JSON.parse(this.requirementJson || '{}')
            this.plotForm.reward = JSON.parse(this.rewardJson || '{}')
          } catch (e) {
            return ElMessage.error('JSON格式不正确')
          }
          
          this.loading = true
          
          const request = this.isEdit
            ? updatePlot(this.plotId, this.plotForm)
            : createPlot(this.plotForm)
            
          request.then(() => {
            ElMessage.success(this.isEdit ? '更新成功' : '创建成功')
            this.goBack()
          }).catch(() => {
            ElMessage.error(this.isEdit ? '更新失败' : '创建失败')
          }).finally(() => {
            this.loading = false
          })
        } else {
          return false
        }
      })
    },
    goBack() {
      this.$router.push('/story/plots')
    }
  }
}
</script>

<style scoped>
.box-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style> 