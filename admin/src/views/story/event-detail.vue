<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button class="filter-item" type="primary" @click="goBack">
        返回章节
      </el-button>
      <el-button class="filter-item" type="success" @click="handleEdit">
        编辑事件
      </el-button>
    </div>

    <!-- 事件信息 -->
    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>{{ event.title || '事件详情' }}</span>
          <div>
            <el-tag :type="getEventTypeTag(event.eventType)">
              {{ getEventTypeName(event.eventType) }}
            </el-tag>
            <el-tag v-if="event.isActive" type="success" class="ml-2">已激活</el-tag>
            <el-tag v-else type="info" class="ml-2">未激活</el-tag>
          </div>
        </div>
      </template>
      
      <div class="event-info">
        <p><strong>排序：</strong> {{ event.sortOrder }}</p>
        
        <el-divider content-position="left">触发条件</el-divider>
        <p>
          <strong>触发类型：</strong> 
          {{ getTriggerTypeName(event.triggerCondition?.type) }}
          <el-tooltip :content="getTriggerTypeDesc(event.triggerCondition?.type)" placement="top">
            <i class="el-icon-question"></i>
          </el-tooltip>
        </p>
        
        <template v-if="event.triggerCondition?.type === 'ENTER_PAGE'">
          <p><strong>目标页面：</strong> {{ event.triggerCondition.pageId }}</p>
        </template>
        
        <template v-if="event.triggerCondition?.type === 'CLICK_ELEMENT'">
          <p><strong>目标元素：</strong> {{ event.triggerCondition.elementId }}</p>
        </template>
        
        <template v-if="event.triggerCondition?.type !== 'MANUAL'">
          <p><strong>延迟时间：</strong> {{ event.triggerCondition?.delay || 0 }}毫秒</p>
        </template>
        
        <el-divider content-position="left">事件内容</el-divider>
        
        <!-- 对话类型 -->
        <template v-if="event.eventType === 'DIALOG'">
          <div v-if="event.content?.dialogues && event.content.dialogues.length > 0">
            <div v-for="(dialog, index) in event.content.dialogues" :key="index" class="dialog-preview">
              <div class="dialog-speaker">{{ dialog.speaker }}</div>
              <div class="dialog-content">{{ dialog.content }}</div>
            </div>
          </div>
          <p v-else class="no-content">没有设置对话内容</p>
        </template>
        
        <!-- 任务类型 -->
        <template v-if="event.eventType === 'TASK'">
          <p><strong>任务目标：</strong> {{ event.content?.taskObjective || '未设置任务目标' }}</p>
        </template>
        
        <!-- 引导类型 -->
        <template v-if="event.eventType === 'GUIDE'">
          <p><strong>目标页面：</strong> {{ event.content?.guideInfo?.targetPage || '未设置' }}</p>
          <p><strong>目标元素：</strong> {{ event.content?.guideInfo?.targetElement || '未设置' }}</p>
          <p><strong>引导文本：</strong> {{ event.content?.guideInfo?.guideText || '未设置引导文本' }}</p>
        </template>
        
        <!-- 多选项类型 -->
        <template v-if="event.eventType === 'MULTI_CHOICE'">
          <div v-if="event.content?.choices && event.content.choices.length > 0">
            <p><strong>选项：</strong></p>
            <div v-for="(choice, index) in event.content.choices" :key="index" class="choice-preview">
              <div class="choice-number">选项 {{ index + 1 }}:</div>
              <div class="choice-text">{{ choice.text }}</div>
              <div class="choice-next">
                下一个事件: {{ getEventTitleById(choice.nextEventId) || '未设置' }}
              </div>
            </div>
          </div>
          <p v-else class="no-content">没有设置选项内容</p>
        </template>
        
        <el-divider content-position="left">流程控制</el-divider>
        
        <p>
          <strong>下一个事件：</strong> 
          {{ getEventTitleById(event.nextEventId) || '未设置下一个事件' }}
        </p>
      </div>
    </el-card>
  </div>
</template>

<script>
import { getEventDetail } from '@/api/story'
import { ElMessage } from 'element-plus'

export default {
  name: 'EventDetail',
  data() {
    return {
      loading: false,
      eventId: null,
      event: {},
      chapterId: null,
      allEvents: []
    }
  },
  created() {
    this.eventId = this.$route.params.id
    if (this.eventId) {
      this.fetchData()
    }
  },
  methods: {
    fetchData() {
      this.loading = true
      getEventDetail(this.eventId).then(response => {
        this.event = response.data
        this.chapterId = this.event.chapterId
        
        // 在实际应用中，这里可能需要再获取所有事件列表用于显示下一个事件的标题
        this.loading = false
      }).catch(() => {
        this.loading = false
        ElMessage.error('获取事件信息失败')
      })
    },
    goBack() {
      this.$router.push(`/story/chapters/${this.chapterId}`)
    },
    handleEdit() {
      this.$router.push(`/story/chapters/${this.chapterId}`)
      // 在实际应用中，这里应该打开编辑对话框
      // 但是由于我们的编辑功能在章节详情页中实现，所以这里先返回章节详情
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
    getEventTitleById(eventId) {
      if (!eventId) return '无'
      
      // 在实际应用中，应该从事件列表中查找对应的事件标题
      // 这里简化处理，直接返回ID
      return `事件ID: ${eventId}`
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
.ml-2 {
  margin-left: 8px;
}
.event-info {
  margin-bottom: 20px;
}
.dialog-preview {
  background-color: #f8f8f8;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}
.dialog-speaker {
  font-weight: bold;
  margin-bottom: 4px;
}
.dialog-content {
  color: #555;
}
.choice-preview {
  background-color: #f0f9eb;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}
.choice-number {
  font-weight: bold;
  margin-bottom: 4px;
}
.choice-text {
  color: #555;
  margin-bottom: 4px;
}
.choice-next {
  color: #999;
  font-size: 0.9em;
}
.no-content {
  color: #999;
  font-style: italic;
}
</style> 