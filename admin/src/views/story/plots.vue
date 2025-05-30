<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button
        class="filter-item"
        type="primary"
        icon="el-icon-plus"
        @click="handleCreatePlot"
      >
        创建剧情
      </el-button>
      <el-button
        class="filter-item"
        type="primary"
        icon="el-icon-upload2"
        @click="handleImportPlot"
      >
        导入剧情
      </el-button>
    </div>

    <el-table
      v-loading="listLoading"
      :data="plots"
      element-loading-text="加载中..."
      border
      fit
      highlight-current-row
    >
      <el-table-column align="center" label="ID" width="80">
        <template #default="scope">
          <span>{{ scope.$index + 1 }}</span>
        </template>
      </el-table-column>

      <el-table-column width="120" align="center" label="封面">
        <template #default="scope">
          <img 
            v-if="scope.row.coverImage" 
            :src="scope.row.coverImage" 
            class="cover-image"
          />
          <el-icon v-else class="el-icon-picture-outline"></el-icon>
        </template>
      </el-table-column>

      <el-table-column align="center" label="标题" prop="title" />

      <el-table-column align="center" label="类型" width="120">
        <template #default="scope">
          <el-tag v-if="scope.row.isMainStory" type="danger">主线剧情</el-tag>
          <el-tag v-else>支线剧情</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="状态" width="120">
        <template #default="scope">
          <el-tag v-if="scope.row.isActive" type="success">已激活</el-tag>
          <el-tag v-else type="info">未激活</el-tag>
        </template>
      </el-table-column>

      <el-table-column align="center" label="排序" width="80" prop="sortOrder" />

      <el-table-column align="center" label="创建时间" width="180">
        <template #default="scope">
          <span>{{ formatDate(scope.row.createdAt) }}</span>
        </template>
      </el-table-column>

      <el-table-column align="center" label="操作" width="300">
        <template #default="scope">
          <el-button
            size="small"
            type="primary"
            @click="handleViewPlot(scope.row)"
          >
            查看
          </el-button>
          <el-button
            size="small"
            type="success"
            @click="handleEditPlot(scope.row)"
          >
            编辑
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click="handleExportPlot(scope.row)"
          >
            导出
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="handleDeletePlot(scope.row)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 导入对话框 -->
    <el-dialog
      title="导入剧情配置"
      v-model="importDialogVisible"
      width="50%"
    >
      <el-form>
        <el-form-item label="配置文件">
          <el-input
            type="textarea"
            v-model="importConfig"
            :rows="10"
            placeholder="请粘贴剧情配置JSON数据"
          ></el-input>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="importDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitImport">确认导入</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getPlots, deletePlot, exportStoryConfig, importStoryConfig } from '@/api/story'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'StoryPlots',
  data() {
    return {
      plots: [],
      listLoading: true,
      importDialogVisible: false,
      importConfig: ''
    }
  },
  created() {
    this.fetchData()
  },
  methods: {
    fetchData() {
      this.listLoading = true
      getPlots().then(response => {
        this.plots = response.data
        this.listLoading = false
      }).catch(() => {
        this.listLoading = false
      })
    },
    formatDate(date) {
      if (!date) return ''
      const d = new Date(date)
      return d.toLocaleString()
    },
    handleCreatePlot() {
      this.$router.push('/story/plots/create')
    },
    handleViewPlot(row) {
      this.$router.push(`/story/plots/${row._id}`)
    },
    handleEditPlot(row) {
      this.$router.push(`/story/plots/${row._id}/edit`)
    },
    handleDeletePlot(row) {
      ElMessageBox.confirm(
        '此操作将永久删除该剧情及其所有章节和事件，是否继续？',
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        deletePlot(row._id).then(() => {
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
    handleExportPlot(row) {
      exportStoryConfig(row._id).then(response => {
        const data = response.data
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `剧情配置_${row.title}_${new Date().toISOString().split('T')[0]}.json`
        link.click()
        URL.revokeObjectURL(link.href)
        
        ElMessage({
          type: 'success',
          message: '导出成功!'
        })
      })
    },
    handleImportPlot() {
      this.importDialogVisible = true
      this.importConfig = ''
    },
    submitImport() {
      try {
        const configData = JSON.parse(this.importConfig)
        importStoryConfig({ storyConfig: configData }).then(() => {
          ElMessage({
            type: 'success',
            message: '导入成功!'
          })
          this.importDialogVisible = false
          this.fetchData()
        }).catch(error => {
          ElMessage({
            type: 'error',
            message: `导入失败: ${error.message}`
          })
        })
      } catch (e) {
        ElMessage({
          type: 'error',
          message: '无效的JSON格式'
        })
      }
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
.cover-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
}
</style> 