<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button class="filter-item" type="primary" @click="goBack">
        返回剧情
      </el-button>
      <el-button class="filter-item" type="primary" @click="handleAddEvent">
        添加事件
      </el-button>
    </div>

    <!-- 章节信息 -->
    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ chapter.title || '章节详情' }}</span>
          <div>
            <el-tag v-if="chapter.isActive" type="success">已激活</el-tag>
            <el-tag v-else type="info">未激活</el-tag>
          </div>
        </div>
      </template>
      <div class="chapter-info">
        <p><strong>描述：</strong> {{ chapter.description }}</p>
        <p><strong>排序：</strong> {{ chapter.sortOrder }}</p>
        <p v-if="chapter.requirement && chapter.requirement.userLevel">
          <strong>用户等级要求：</strong> {{ chapter.requirement.userLevel }}
        </p>
        <p v-if="chapter.requirement && chapter.requirement.previousChapter">
          <strong>前置章节：</strong> {{ getPreviousChapterName(chapter.requirement.previousChapter) }}
        </p>
        <div v-if="chapter.reward">
          <p v-if="chapter.reward.experience">
            <strong>经验奖励：</strong> {{ chapter.reward.experience }}
          </p>
          <div v-if="chapter.reward.items && chapter.reward.items.length > 0">
            <p><strong>物品奖励：</strong></p>
            <ul>
              <li v-for="(item, index) in chapter.reward.items" :key="index">
                {{ item.itemType }} - {{ item.itemId }} (x{{ item.quantity }})
              </li>
            </ul>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 事件列表 -->
    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>事件列表</span>
        </div>
      </template>

      <el-table
        :data="events"
        border
        fit
        highlight-current-row
      >
        <el-table-column align="center" label="序号" width="80">
          <template #default="scope">
            <span>{{ scope.row.sortOrder }}</span>
          </template>
        </el-table-column>

        <el-table-column align="center" label="事件标题" prop="title" />

        <el-table-column align="center" label="事件类型" width="120">
          <template #default="scope">
            <el-tag :type="getEventTypeTag(scope.row.eventType)">
              {{ getEventTypeName(scope.row.eventType) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column align="center" label="触发条件" width="120">
          <template #default="scope">
            <el-tooltip :content="getTriggerTypeDesc(scope.row.triggerCondition.type)" placement="top">
              <el-tag>{{ getTriggerTypeName(scope.row.triggerCondition.type) }}</el-tag>
            </el-tooltip>
          </template>
        </el-table-column>

        <el-table-column align="center" label="状态" width="100">
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
              @click="handleViewEvent(scope.row)"
            >
              查看
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="handleEditEvent(scope.row)"
            >
              编辑
            </el-button>
            <el-button
              size="small"
              type="danger"
              @click="handleDeleteEvent(scope.row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 事件编辑对话框 -->
    <el-dialog
      :title="isEditEvent ? '编辑事件' : '添加事件'"
      v-model="eventDialogVisible"
      width="70%"
    >
      <el-form
        ref="eventForm"
        :model="eventForm"
        :rules="eventRules"
        label-width="120px"
      >
        <el-form-item label="事件标题" prop="title">
          <el-input v-model="eventForm.title" placeholder="请输入事件标题" />
        </el-form-item>
        
        <el-form-item label="事件类型" prop="eventType">
          <el-select v-model="eventForm.eventType" placeholder="选择事件类型" @change="handleEventTypeChange">
            <el-option label="对话" value="DIALOG" />
            <el-option label="任务" value="TASK" />
            <el-option label="引导" value="GUIDE" />
            <el-option label="奖励" value="REWARD" />
            <el-option label="多选项" value="MULTI_CHOICE" />
          </el-select>
        </el-form-item>
        
        <!-- 事件内容 - 根据类型动态展示 -->
        <template v-if="eventForm.eventType === 'DIALOG'">
          <el-divider content-position="left">对话内容</el-divider>
          
          <div v-for="(dialog, index) in eventForm.content.dialogues" :key="index" class="dialog-item">
            <el-form-item :label="'对话 ' + (index + 1)">
              <el-row :gutter="10">
                <el-col :span="6">
                  <el-input v-model="dialog.speaker" placeholder="说话者" />
                </el-col>
                <el-col :span="14">
                  <el-input v-model="dialog.content" placeholder="对话内容" />
                </el-col>
                <el-col :span="4">
                  <el-button type="danger" icon="el-icon-delete" circle @click="removeDialog(index)" />
                </el-col>
              </el-row>
            </el-form-item>
          </div>
          
          <el-form-item>
            <el-button type="primary" @click="addDialog">添加对话</el-button>
          </el-form-item>
        </template>
        
        <template v-if="eventForm.eventType === 'TASK'">
          <el-divider content-position="left">任务内容</el-divider>
          
          <el-form-item label="任务目标">
            <el-input 
              v-model="eventForm.content.taskObjective" 
              type="textarea" 
              :rows="2"
              placeholder="请输入任务目标描述" 
            />
          </el-form-item>
        </template>
        
        <template v-if="eventForm.eventType === 'GUIDE'">
          <el-divider content-position="left">引导内容</el-divider>
          
          <el-form-item label="目标页面">
            <el-input v-model="eventForm.content.guideInfo.targetPage" placeholder="要引导的页面ID" />
          </el-form-item>
          
          <el-form-item label="目标元素">
            <el-input v-model="eventForm.content.guideInfo.targetElement" placeholder="要引导的元素ID" />
          </el-form-item>
          
          <el-form-item label="引导文本">
            <el-input 
              v-model="eventForm.content.guideInfo.guideText" 
              type="textarea" 
              :rows="2"
              placeholder="引导提示文本" 
            />
          </el-form-item>
        </template>
        
        <template v-if="eventForm.eventType === 'MULTI_CHOICE'">
          <el-divider content-position="left">选项内容</el-divider>
          
          <div v-for="(choice, index) in eventForm.content.choices" :key="index" class="choice-item">
            <el-form-item :label="'选项 ' + (index + 1)">
              <el-row :gutter="10">
                <el-col :span="16">
                  <el-input v-model="choice.text" placeholder="选项文本" />
                </el-col>
                <el-col :span="4">
                  <el-select v-model="choice.nextEventId" placeholder="下一个事件">
                    <el-option
                      v-for="event in events"
                      :key="event._id"
                      :label="event.title"
                      :value="event._id"
                    >
                    </el-option>
                  </el-select>
                </el-col>
                <el-col :span="4">
                  <el-button type="danger" icon="el-icon-delete" circle @click="removeChoice(index)" />
                </el-col>
              </el-row>
            </el-form-item>
          </div>
          
          <el-form-item>
            <el-button type="primary" @click="addChoice">添加选项</el-button>
          </el-form-item>
        </template>
        
        <el-divider content-position="left">触发条件</el-divider>
        
        <el-form-item label="触发类型">
          <el-select v-model="eventForm.triggerCondition.type" placeholder="选择触发类型">
            <el-option label="自动触发" value="AUTO" />
            <el-option label="进入页面触发" value="ENTER_PAGE" />
            <el-option label="点击元素触发" value="CLICK_ELEMENT" />
            <el-option label="完成任务触发" value="COMPLETE_TASK" />
            <el-option label="手动触发" value="MANUAL" />
          </el-select>
        </el-form-item>
        
        <template v-if="eventForm.triggerCondition.type === 'ENTER_PAGE'">
          <el-form-item label="目标页面ID">
            <el-input v-model="eventForm.triggerCondition.pageId" placeholder="页面ID" />
          </el-form-item>
        </template>
        
        <template v-if="eventForm.triggerCondition.type === 'CLICK_ELEMENT'">
          <el-form-item label="目标元素ID">
            <el-input v-model="eventForm.triggerCondition.elementId" placeholder="元素ID" />
          </el-form-item>
        </template>
        
        <template v-if="eventForm.triggerCondition.type !== 'MANUAL'">
          <el-form-item label="延迟时间(毫秒)">
            <el-input-number v-model="eventForm.triggerCondition.delay" :min="0" :max="60000" :step="100" />
          </el-form-item>
        </template>
        
        <el-divider content-position="left">其他设置</el-divider>
        
        <el-form-item label="下一个事件">
          <el-select 
            v-model="eventForm.nextEventId"
            filterable
            clearable
            placeholder="选择下一个事件"
          >
            <el-option
              v-for="event in events"
              :key="event._id"
              :label="event.title"
              :value="event._id"
            >
            </el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="是否激活">
          <el-switch
            v-model="eventForm.isActive"
            :active-value="true"
            :inactive-value="false"
          />
        </el-form-item>
        
        <el-form-item label="排序">
          <el-input-number v-model="eventForm.sortOrder" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="eventDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitEventForm">确认</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { getChapterDetail } from '@/api/story'
import { getEventDetail, createEvent, updateEvent, deleteEvent } from '@/api/story'
import { ElMessage, ElMessageBox } from 'element-plus'

export default {
  name: 'ChapterDetail',
  data() {
    return {
      loading: false,
      chapterId: null,
      plotId: null,
      chapter: {},
      events: [],
      
      // 事件表单相关
      eventDialogVisible: false,
      isEditEvent: false,
      editingEventId: null,
      eventForm: {
        chapterId: '',
        title: '',
        eventType: 'DIALOG',
        content: {
          dialogues: [],
          taskObjective: '',
          guideInfo: {
            targetPage: '',
            targetElement: '',
            guideText: ''
          },
          choices: []
        },
        triggerCondition: {
          type: 'AUTO',
          pageId: '',
          elementId: '',
          delay: 0
        },
        nextEventId: null,
        isActive: true,
        sortOrder: 0
      },
      eventRules: {
        title: [
          { required: true, message: '请输入事件标题', trigger: 'blur' }
        ],
        eventType: [
          { required: true, message: '请选择事件类型', trigger: 'change' }
        ]
      }
    }
  },
  created() {
    this.chapterId = this.$route.params.id
    if (this.chapterId) {
      this.fetchData()
    }
  },
  methods: {
    fetchData() {
      this.loading = true
      getChapterDetail(this.chapterId).then(response => {
        this.chapter = response.data.chapter
        this.events = response.data.events
        this.plotId = this.chapter.plotId
        this.loading = false
      }).catch(() => {
        this.loading = false
        ElMessage.error('获取章节信息失败')
      })
    },
    goBack() {
      this.$router.push(`/story/plots/${this.plotId}`)
    },
    getPreviousChapterName(chapterId) {
      // 这里实际上需要从后端获取章节名称，简化处理
      return chapterId
    },
    getEventTypeTag(type) {
      const tags = {
        'DIALOG': 'primary',
        'TASK': 'success',
        'GUIDE': 'warning',
        'REWARD': 'danger',
        'MULTI_CHOICE': 'info'
      }
      return tags[type] || 'info'
    },
    getEventTypeName(type) {
      const names = {
        'DIALOG': '对话',
        'TASK': '任务',
        'GUIDE': '引导',
        'REWARD': '奖励',
        'MULTI_CHOICE': '多选'
      }
      return names[type] || type
    },
    getTriggerTypeName(type) {
      const names = {
        'AUTO': '自动',
        'ENTER_PAGE': '进入页面',
        'CLICK_ELEMENT': '点击元素',
        'COMPLETE_TASK': '完成任务',
        'MANUAL': '手动'
      }
      return names[type] || type
    },
    getTriggerTypeDesc(type) {
      const descs = {
        'AUTO': '自动触发事件',
        'ENTER_PAGE': '进入指定页面时触发',
        'CLICK_ELEMENT': '点击指定元素时触发',
        'COMPLETE_TASK': '完成特定任务时触发',
        'MANUAL': '由用户手动触发'
      }
      return descs[type] || '未知触发条件'
    },
    handleEventTypeChange(type) {
      // 根据事件类型初始化内容
      if (type === 'DIALOG' && this.eventForm.content.dialogues.length === 0) {
        this.addDialog()
      } else if (type === 'MULTI_CHOICE' && this.eventForm.content.choices.length === 0) {
        this.addChoice()
      }
    },
    addDialog() {
      this.eventForm.content.dialogues.push({
        speaker: '',
        content: '',
        avatar: ''
      })
    },
    removeDialog(index) {
      this.eventForm.content.dialogues.splice(index, 1)
    },
    addChoice() {
      this.eventForm.content.choices.push({
        text: '',
        nextEventId: null
      })
    },
    removeChoice(index) {
      this.eventForm.content.choices.splice(index, 1)
    },
    handleAddEvent() {
      this.isEditEvent = false
      this.editingEventId = null
      this.eventForm = {
        chapterId: this.chapterId,
        title: '',
        eventType: 'DIALOG',
        content: {
          dialogues: [{
            speaker: '',
            content: '',
            avatar: ''
          }],
          taskObjective: '',
          guideInfo: {
            targetPage: '',
            targetElement: '',
            guideText: ''
          },
          choices: []
        },
        triggerCondition: {
          type: 'AUTO',
          pageId: '',
          elementId: '',
          delay: 0
        },
        nextEventId: null,
        isActive: true,
        sortOrder: this.events.length > 0 ? Math.max(...this.events.map(e => e.sortOrder)) + 1 : 0
      }
      this.eventDialogVisible = true
    },
    handleViewEvent(row) {
      this.$router.push(`/story/events/${row._id}`)
    },
    handleEditEvent(row) {
      this.isEditEvent = true
      this.editingEventId = row._id
      this.eventForm = {
        chapterId: this.chapterId,
        title: row.title,
        eventType: row.eventType,
        content: {
          dialogues: Array.isArray(row.content.dialogues) ? [...row.content.dialogues] : [],
          taskObjective: row.content.taskObjective || '',
          guideInfo: {
            targetPage: row.content.guideInfo?.targetPage || '',
            targetElement: row.content.guideInfo?.targetElement || '',
            guideText: row.content.guideInfo?.guideText || ''
          },
          choices: Array.isArray(row.content.choices) ? [...row.content.choices] : []
        },
        triggerCondition: {
          type: row.triggerCondition?.type || 'AUTO',
          pageId: row.triggerCondition?.pageId || '',
          elementId: row.triggerCondition?.elementId || '',
          delay: row.triggerCondition?.delay || 0
        },
        nextEventId: row.nextEventId,
        isActive: row.isActive,
        sortOrder: row.sortOrder
      }
      
      // 确保对话和选项数组存在
      if (!this.eventForm.content.dialogues) {
        this.eventForm.content.dialogues = []
      }
      if (!this.eventForm.content.choices) {
        this.eventForm.content.choices = []
      }
      
      this.eventDialogVisible = true
    },
    handleDeleteEvent(row) {
      ElMessageBox.confirm(
        '此操作将永久删除该事件，是否继续？',
        '确认删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        deleteEvent(row._id).then(() => {
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
    submitEventForm() {
      this.$refs.eventForm.validate(valid => {
        if (valid) {
          const request = this.isEditEvent
            ? updateEvent(this.editingEventId, this.eventForm)
            : createEvent(this.eventForm)
            
          request.then(() => {
            ElMessage.success(this.isEditEvent ? '更新成功' : '创建成功')
            this.eventDialogVisible = false
            this.fetchData()
          }).catch(() => {
            ElMessage.error(this.isEditEvent ? '更新失败' : '创建失败')
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
.chapter-info {
  margin-bottom: 20px;
}
.dialog-item, .choice-item {
  border: 1px dashed #ccc;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 10px;
}
</style> 