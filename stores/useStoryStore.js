import { defineStore } from 'pinia'
import { getStoryPlots, getStoryChapters, startStory, getCurrentEvent, completeEvent } from '@/api/storyApi'

export const useStoryStore = defineStore('story', {
  state: () => ({
    plots: [],
    currentPlot: null,
    currentChapter: null,
    currentEvent: null,
    eventVisible: false,
    loading: false,
    initialized: false,
    lastCheck: null, // 上次检查剧情的时间
    checkInterval: 1000 * 60 * 30, // 默认30分钟检查一次新剧情
  }),
  
  getters: {
    hasMainStory: (state) => state.plots.some(p => p.isMainStory),
    mainStories: (state) => state.plots.filter(p => p.isMainStory).sort((a, b) => a.sortOrder - b.sortOrder),
    hasActiveEvent: (state) => !!state.currentEvent,
    getProgressByPlotId: (state) => (plotId) => {
      const plot = state.plots.find(p => p._id === plotId)
      return plot ? plot.progress : null
    },
    // 获取下一个待执行的主线剧情
    nextMainStory: (state) => {
      // 按sortOrder排序
      const mainStories = state.plots
        .filter(p => p.isMainStory)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      
      // 查找第一个未完成的主线剧情
      return mainStories.find(p => 
        p.status !== 'COMPLETED' && 
        p.isActive !== false // 确保剧情已激活
      );
    },
    // 获取是否需要检查剧情
    shouldCheckStories: (state) => {
      // 如果从未检查过，或者超过检查间隔，就需要检查
      return !state.lastCheck || (Date.now() - state.lastCheck > state.checkInterval);
    }
  },
  
  actions: {
    // 获取剧情列表
    async fetchPlots() {
      try {
        this.loading = true
        const res = await getStoryPlots()
        if (res.success) {
          this.plots = res.data
          this.initialized = true
          this.lastCheck = Date.now()
          return res.data
        }
        return []
      } catch (err) {
        console.error('获取剧情列表失败:', err)
        return []
      } finally {
        this.loading = false
      }
    },
    
    // 获取剧情章节
    async fetchChapters(plotId) {
      try {
        this.loading = true
        const res = await getStoryChapters(plotId)
        if (res.success) {
          // 更新当前剧情
          const plotIndex = this.plots.findIndex(p => p._id === plotId)
          if (plotIndex !== -1) {
            // 更新剧情和进度
            this.plots[plotIndex] = {
              ...this.plots[plotIndex],
              chapters: res.data.chapters,
              progress: res.data.progress
            }
          }
          return res.data
        }
      } catch (err) {
        console.error('获取剧情章节失败:', err)
      } finally {
        this.loading = false
      }
    },
    
    // 开始剧情
    async startPlot(plotId) {
      try {
        this.loading = true
        const res = await startStory(plotId)
        if (res.success) {
          this.currentPlot = plotId
          this.currentEvent = res.data.currentEvent
          this.eventVisible = true
          
          // 更新剧情状态
          this.updatePlotStatus(plotId, 'IN_PROGRESS')
          
          console.log(`开始剧情: ${plotId}`, res.data)
          return res.data
        }
      } catch (err) {
        console.error('开始剧情失败:', err)
      } finally {
        this.loading = false
      }
    },
    
    // 获取当前事件
    async fetchCurrentEvent(plotId) {
      try {
        this.loading = true
        const res = await getCurrentEvent(plotId)
        if (res.success) {
          this.currentPlot = plotId
          this.currentChapter = res.data.chapterId
          this.currentEvent = res.data.currentEvent
          
          console.log(`获取当前事件: ${plotId}`, res.data)
          return res.data
        }
      } catch (err) {
        console.error('获取当前事件失败:', err)
      } finally {
        this.loading = false
      }
    },
    
    // 完成事件
    async completeCurrentEvent(eventId, choiceIndex) {
      try {
        this.loading = true
        const data = {
          plotId: this.currentPlot,
          eventId
        }
        
        if (choiceIndex !== undefined) {
          data.choiceIndex = choiceIndex
        }
        
        const res = await completeEvent(data)
        if (res.success) {
          // 检查是否有下一个事件
          if (res.data.nextEvent) {
            this.currentEvent = res.data.nextEvent
            // 如果进入了新章节
            if (res.data.chapterId && res.data.chapterId !== this.currentChapter) {
              this.currentChapter = res.data.chapterId
            }
          } else if (res.data.status === 'COMPLETED') {
            // 剧情已完成
            this.currentEvent = null
            this.eventVisible = false
            
            // 更新剧情进度
            this.updatePlotProgress(this.currentPlot, 'COMPLETED')
            
            // 检查是否有下一个主线剧情需要执行
            this.checkNextMainStory()
          } else {
            // 事件已完成，但没有下一个事件
            this.currentEvent = null
            this.eventVisible = false
          }
          
          return res.data
        }
      } catch (err) {
        console.error('完成事件失败:', err)
      } finally {
        this.loading = false
      }
    },
    
    // 显示当前事件
    showCurrentEvent() {
      if (this.currentEvent) {
        this.eventVisible = true
        return true
      }
      return false
    },
    
    // 隐藏当前事件
    hideCurrentEvent() {
      this.eventVisible = false
    },
    
    // 更新剧情进度
    updatePlotProgress(plotId, status) {
      const plotIndex = this.plots.findIndex(p => p._id === plotId)
      if (plotIndex !== -1) {
        this.plots[plotIndex].status = status
        
        // 如果完成了剧情，更新进度
        if (status === 'COMPLETED') {
          this.plots[plotIndex].progress = {
            ...this.plots[plotIndex].progress,
            status: 'COMPLETED',
            completedAt: new Date().toISOString()
          }
        }
      }
    },
    
    // 更新剧情状态
    updatePlotStatus(plotId, status) {
      const plotIndex = this.plots.findIndex(p => p._id === plotId)
      if (plotIndex !== -1) {
        this.plots[plotIndex].status = status
      }
    },
    
    // 重置剧情状态
    resetCurrentStory() {
      this.currentPlot = null
      this.currentChapter = null
      this.currentEvent = null
      this.eventVisible = false
    },
    
    // 初始化剧情系统，检查是否有主线剧情需要执行
    async initStorySystem() {
      console.log('初始化剧情系统...')
      try {
        if (!this.initialized || this.shouldCheckStories) {
          const plots = await this.fetchPlots()
          console.log('获取到剧情列表:', plots)
        }
        
        // 查找是否有正在进行中的剧情
        const inProgressPlot = this.plots.find(p => p.status === 'IN_PROGRESS')
        if (inProgressPlot) {
          console.log('发现进行中的剧情:', inProgressPlot.title)
          // 获取当前进行中的事件
          const eventData = await this.fetchCurrentEvent(inProgressPlot._id)
          if (eventData && this.currentEvent) {
            this.showCurrentEvent()
            return true
          }
        }
        
        // 如果没有进行中的剧情，检查是否有主线剧情需要开始
        return await this.checkNextMainStory()
      } catch (err) {
        console.error('初始化剧情系统失败:', err)
        return false
      }
    },
    
    // 检查并执行下一个主线剧情
    async checkNextMainStory() {
      // 获取下一个待执行的主线剧情
      const nextStory = this.nextMainStory
      
      if (nextStory) {
        console.log('发现待执行的主线剧情:', nextStory.title)
        
        // 如果是进行中的剧情，获取当前事件
        if (nextStory.status === 'IN_PROGRESS') {
          const eventData = await this.fetchCurrentEvent(nextStory._id)
          if (eventData && this.currentEvent) {
            this.showCurrentEvent()
            return true
          }
        } else {
          // 开始新剧情
          const startData = await this.startPlot(nextStory._id)
          return !!startData
        }
      }
      
      return false
    },
    
    // 主动更新剧情系统
    async refreshStorySystem() {
      this.lastCheck = Date.now()
      return await this.initStorySystem()
    }
  }
}) 