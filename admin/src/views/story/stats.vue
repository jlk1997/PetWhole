<template>
  <div class="app-container">
    <div class="filter-container">
      <el-button class="filter-item" type="primary" icon="el-icon-refresh" @click="fetchData">
        刷新数据
      </el-button>
    </div>

    <el-card class="box-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>剧情参与统计</span>
        </div>
      </template>

      <el-table
        :data="statsData"
        border
        fit
        highlight-current-row
      >
        <el-table-column align="center" label="剧情ID" width="240" prop="plotId" />
        <el-table-column align="center" label="剧情标题" prop="plotTitle" />
        
        <el-table-column align="center" label="参与用户数" width="120">
          <template #default="scope">
            <span>{{ scope.row.totalUsers }}</span>
          </template>
        </el-table-column>
        
        <el-table-column align="center" label="完成用户数" width="120">
          <template #default="scope">
            <span>{{ scope.row.completedUsers }}</span>
          </template>
        </el-table-column>
        
        <el-table-column align="center" label="进行中用户数" width="120">
          <template #default="scope">
            <span>{{ scope.row.inProgressUsers }}</span>
          </template>
        </el-table-column>
        
        <el-table-column align="center" label="未开始用户数" width="120">
          <template #default="scope">
            <span>{{ scope.row.notStartedUsers }}</span>
          </template>
        </el-table-column>
        
        <el-table-column align="center" label="完成率" width="150">
          <template #default="scope">
            <el-progress
              :percentage="Number(scope.row.completionRate)"
              :color="getProgressColor(scope.row.completionRate)"
            ></el-progress>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card class="box-card" v-if="statsData.length > 0">
      <template #header>
        <div class="card-header">
          <span>剧情完成率图表</span>
        </div>
      </template>
      
      <div ref="chartContainer" class="chart-container"></div>
    </el-card>
  </div>
</template>

<script>
import { getStoryProgressStats } from '@/api/story'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'

export default {
  name: 'StoryStats',
  data() {
    return {
      loading: false,
      statsData: [],
      chart: null
    }
  },
  mounted() {
    this.fetchData()
    window.addEventListener('resize', this.resizeChart)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.resizeChart)
    if (this.chart) {
      this.chart.dispose()
    }
  },
  methods: {
    fetchData() {
      this.loading = true
      getStoryProgressStats().then(response => {
        this.statsData = response.data
        this.loading = false
        this.$nextTick(() => {
          this.initChart()
        })
      }).catch(() => {
        this.loading = false
        ElMessage.error('获取统计数据失败')
      })
    },
    getProgressColor(rate) {
      rate = Number(rate)
      if (rate < 30) {
        return '#F56C6C'
      } else if (rate < 70) {
        return '#E6A23C'
      } else {
        return '#67C23A'
      }
    },
    initChart() {
      if (this.statsData.length === 0) return
      
      if (this.chart) {
        this.chart.dispose()
      }
      
      this.chart = echarts.init(this.$refs.chartContainer)
      
      // 准备图表数据
      const titles = this.statsData.map(item => item.plotTitle)
      const completionRates = this.statsData.map(item => Number(item.completionRate))
      const totalUsers = this.statsData.map(item => item.totalUsers)
      const completedUsers = this.statsData.map(item => item.completedUsers)
      const inProgressUsers = this.statsData.map(item => item.inProgressUsers)
      const notStartedUsers = this.statsData.map(item => item.notStartedUsers)
      
      const option = {
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow'
          }
        },
        legend: {
          data: ['完成用户', '进行中用户', '未开始用户', '完成率(%)']
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: [
          {
            type: 'category',
            data: titles,
            axisLabel: {
              interval: 0,
              rotate: 30
            }
          }
        ],
        yAxis: [
          {
            type: 'value',
            name: '用户数',
            min: 0,
            max: Math.max(...totalUsers) * 1.1 || 10
          },
          {
            type: 'value',
            name: '完成率(%)',
            min: 0,
            max: 100
          }
        ],
        series: [
          {
            name: '完成用户',
            type: 'bar',
            stack: 'Total',
            emphasis: {
              focus: 'series'
            },
            data: completedUsers
          },
          {
            name: '进行中用户',
            type: 'bar',
            stack: 'Total',
            emphasis: {
              focus: 'series'
            },
            data: inProgressUsers
          },
          {
            name: '未开始用户',
            type: 'bar',
            stack: 'Total',
            emphasis: {
              focus: 'series'
            },
            data: notStartedUsers
          },
          {
            name: '完成率(%)',
            type: 'line',
            yAxisIndex: 1,
            data: completionRates,
            symbolSize: 8,
            itemStyle: {
              color: '#409EFF'
            }
          }
        ]
      }
      
      this.chart.setOption(option)
    },
    resizeChart() {
      if (this.chart) {
        this.chart.resize()
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
.box-card {
  margin-bottom: 20px;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.chart-container {
  width: 100%;
  height: 400px;
}
</style> 