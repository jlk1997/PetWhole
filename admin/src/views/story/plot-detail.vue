<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button class="filter-item" type="primary" @click="goBack">
        返回
      </el-button>
      <el-button class="filter-item" type="success" @click="handleEdit">
        编辑剧情
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAddChapter">
        添加章节
      </el-button>
    </div>

    <!-- 剧情信息 -->
    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ plot.title || '剧情详情' }}</span>
          <el-tag v-if="plot.isMainStory" type="danger">主线剧情</el-tag>
          <el-tag v-else>支线剧情</el-tag>
        </div>
      </template>
      <div class="plot-info">
        <div class="plot-cover" v-if="plot.coverImage">
          <img :src="plot.coverImage" alt="剧情封面" />
        </div>
        <div class="plot-details">
          <p><strong>描述：</strong> {{ plot.description }}</p>
          <p><strong>状态：</strong> 
            <el-tag v-if="plot.isActive" type="success">已激活</el-tag>
            <el-tag v-else type="info">未激活</el-tag>
          </p>
          <p><strong>排序：</strong> {{ plot.sortOrder }}</p>
          <p><strong>创建时间：</strong> {{ formatDate(plot.createdAt) }}</p>
          <p><strong>更新时间：</strong> {{ formatDate(plot.updatedAt) }}</p>
        </div>
      </div>
    </el-card>

    <!-- 章节列表 -->
    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>章节列表</span>
        </div>
      </template>

      <el-table
        :data="chapters"
        border
        fit
        highlight-current-row
      >
        <el-table-column align="center" label="序号" width="80">
          <template #default="scope">
            <span>{{ scope.row.sortOrder }}</span>
          </template>
        </el-table-column>

        <el-table-column align="center" label="章节标题" prop="title" />

        <el-table-column align="center" label="状态" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.isActive" type="success">已激活</el-tag>
            <el-tag v-else type="info">未激活</el-tag>
          </template>
        </el-table-column>

        <el-table-column align="center" label="操作" width="250">
          <template #default="scope">
            <el-button
              size="small"
              type="primary"
              @click="handleViewChapter(scope.row)"
            >
              管理事件
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="handleEditChapter(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDeleteChapter(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 章节编辑对话框 -->
    <el-dialog
      :title="isEditChapter ? '编辑章节' : '添加章节'"
      v-model="chapterDialogVisible"
      width="60%"
    >
      <el-form
        ref="chapterForm"
        :model="chapterForm"
        :rules="chapterRules"
        label-width="120px"
      >
        <el-form-item label="章节标题" prop="title">
          <el-input v-model="chapterForm.title" placeholder="请输入章节标题" />
        </el-form-item>
        
        <el-form-item label="章节描述" prop="description">
          <el-input 
            v-model="chapterForm.description" 
            type="textarea" 
            :rows="4"
            placeholder="请输入章节描述" 
          />
        </el-form-item>
        
        <el-form-item label="是否激活">
          <el-switch
            v-model="chapterForm.isActive"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
        
        <el-form-item label="排序">
          <el-input-number v-model="chapterForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
        
        <el-form-item label="前置章节">
          <el-select 
            v-model="chapterForm.requirement.previousChapter"
            clearable
            placeholder="选择前置章节"
          >
            <el-option
              v-for="chapter in chapters"
              :key="chapter._id"
              :label="chapter.title"
              :value="chapter._id"
            >
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="用户等级要求">
          <el-input-number 
            v-model="chapterForm.requirement.userLevel" 
            :min="0" 
            :max="100" 
          />
        </el-form-item>
        
        <el-form-item label="其他要求" title="JSON格式的特殊要求配置">
          <el-input 
            v-model="requirementCustomJson" 
            type="textarea" 
            :rows="3"
            placeholder="{}" 
          />
        </el-form-item>
        
        <el-form-item label="经验奖励">
          <el-input-number 
            v-model="chapterForm.reward.experience" 
            :min="0" 
            :max="10000" 
          />
        </el-form-item>
        
        <el-form-item label="物品奖励" title="JSON格式的物品奖励配置">
          <el-input 
            v-model="rewardItemsJson" 
            type="textarea" 
            :rows="3"
            placeholder="[]" 
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="chapterDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitChapterForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getPlotDetail } from '@/api/story'
import { createChapter, updateChapter, deleteChapter } from '@/api/story'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'PlotDetail',
  data() {
    return {
      loading: false,
      plotId: null,
      plot: {},
      chapters: [],
      
      // 章节表单相关
      chapterDialogVisible: false,
      isEditChapter: false,
      editingChapterId: null,
      requirementCustomJson: '{}',
      rewardItemsJson: '[]',
      chapterForm: {
        plotId: '',
        title: '',
        description: '',
        sortOrder: 0,
        isActive: true,
        requirement: {
          userLevel: 0,
          previousChapter: null,
          customCondition: {}
        },
        reward: {
          experience: 0,
          items: []
        }
      },
      chapterRules: {
        title: [
          { required: true, message: '请输入章节标题', trigger: 'blur' },
          { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
        ],
        description: [
          { required: true, message: '请输入章节描述', trigger: 'blur' }
        ]
      }
    }
  },
  created() {
    this.plotId = this.$route.params.id
    if (this.plotId) {
      this.fetchData()
    }
  },
  methods: {
    fetchData() {
      this.loading = true
      getPlotDetail(this.plotId).then(response => {
        this.plot = response.data.plot
        this.chapters = response.data.chapters
        this.loading = false
      }).catch(() => {
        this.loading = false
        ElMessage.error('获取剧情信息失败')
      })
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleString()
    },
    goBack() {
      this.$router.push('/story/plots')
    },
    handleEdit() {
      this.$router.push(`/story/plots/${this.plotId}/edit`)
    },
    handleAddChapter() {
      this.isEditChapter = false
      this.editingChapterId = null
      this.chapterForm = {
        plotId: this.plotId,
        title: '',
        description: '',
        sortOrder: this.chapters.length > 0 ? Math.max(...this.chapters.map(c => c.sortOrder)) + 1 : 0,
        isActive: true,
        requirement: {
          userLevel: 0,
          previousChapter: null,
          customCondition: {}
        },
        reward: {
          experience: 0,
          items: []
        }
      }
      this.requirementCustomJson = '{}'
      this.rewardItemsJson = '[]'
      this.chapterDialogVisible = true
    },
    handleViewChapter(row) {
      this.$router.push(`/story/chapters/${row._id}`)
    },
    handleEditChapter(row) {
      this.isEditChapter = true
      this.editingChapterId = row._id
      
      this.chapterForm = {
        plotId: this.plotId,
        title: row.title,
        description: row.description,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
        requirement: {
          userLevel: row.requirement?.userLevel || 0,
          previousChapter: row.requirement?.previousChapter || null,
          customCondition: row.requirement?.customCondition || {}
        },
        reward: {
          experience: row.reward?.experience || 0,
          items: row.reward?.items || []
        }
      }
      
      this.requirementCustomJson = JSON.stringify(row.requirement?.customCondition || {}, null, 2)
      this.rewardItemsJson = JSON.stringify(row.reward?.items || [], null, 2)
      this.chapterDialogVisible = true
    },
    handleDeleteChapter(row) {
      ElMessageBox.confirm(
        '此操作将永久删除该章节及其所有事件，是否继续？',
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        deleteChapter(row._id).then(() => {
          ElMessage({
            type: 'success',
            message: '删除成功!'
          })
          this.fetchData()
        })
      }).catch(() => {
        ElMessage({
          type: 'info',
          message: '已取消删除'
        })
      })
    },
    submitChapterForm() {
      this.$refs.chapterForm.validate(valid => {
        if (valid) {
          // 处理JSON字段
          try {
            this.chapterForm.requirement.customCondition = JSON.parse(this.requirementCustomJson || '{}')
            this.chapterForm.reward.items = JSON.parse(this.rewardItemsJson || '[]')
          } catch (e) {
            return ElMessage.error('JSON格式不正确')
          }
          
          const request = this.isEditChapter
            ? updateChapter(this.editingChapterId, this.chapterForm)
            : createChapter(this.chapterForm)
            
          request.then(() => {
            ElMessage.success(this.isEditChapter ? '更新成功' : '创建成功')
            this.chapterDialogVisible = false
            this.fetchData()
          }).catch(() => {
            ElMessage.error(this.isEditChapter ? '更新失败' : '创建失败')
          })
        } else {
          return false
        }
      })
    }
  }
}
</script>

<style scoped>
.filter-container {
  padding-bottom: 10px;
}
.filter-item {
  margin-right: 10px;
}
.box-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.plot-info {
  display: flex;
  margin-bottom: 20px;
}
.plot-cover {
  width: 200px;
  margin-right: 20px;
}
.plot-cover img {
  width: 100%;
  height: auto;
  border-radius: 4px;
}
.plot-details {
  flex: 1;
}
</style> 