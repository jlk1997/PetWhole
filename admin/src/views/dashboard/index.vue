<template>
  <div class="dashboard-container">
    <div class="page-header">
      <h2>系统概览</h2>
    </div>
    
    <!-- 数据卡片 -->
    <el-row :gutter="20">
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon user-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">用户总数</div>
            <div class="stat-value">{{ stats.userCount }}</div>
            <div class="stat-footer">今日新增: +{{ stats.newUserCount }}</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon pet-icon">
            <el-icon><ShoppingBag /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">宠物总数</div>
            <div class="stat-value">{{ stats.petCount }}</div>
            <div class="stat-footer">今日新增: +{{ stats.newPetCount }}</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon post-icon">
            <el-icon><ChatLineRound /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">帖子总数</div>
            <div class="stat-value">{{ stats.postCount }}</div>
            <div class="stat-footer">今日新增: +{{ stats.newPostCount }}</div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon marker-icon">
            <el-icon><Location /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-title">标记总数</div>
            <div class="stat-value">{{ stats.markerCount }}</div>
            <div class="stat-footer">今日新增: +{{ stats.newMarkerCount }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 统计图表 -->
    <el-row :gutter="20" class="dashboard-charts">
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>用户增长趋势</span>
              <el-radio-group v-model="userChartPeriod" size="small">
                <el-radio-button value="week">近7天</el-radio-button>
                <el-radio-button value="month">近30天</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" ref="userChartRef"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :md="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="chart-header">
              <span>内容分布</span>
            </div>
          </template>
          <div class="chart-container" ref="pieChartRef"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 最新活动 -->
    <el-card shadow="hover" class="dashboard-recent">
      <template #header>
        <div class="recent-header">
          <span>最新活动</span>
          <el-button type="primary" size="small" plain>查看更多</el-button>
        </div>
      </template>
      
      <el-table :data="recentActivities" style="width: 100%" v-loading="loading">
        <el-table-column prop="time" label="时间" width="180" />
        <el-table-column prop="user" label="用户" width="120" />
        <el-table-column prop="action" label="操作" />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column label="操作" width="100">
          <template #default="scope">
            <el-button size="small" @click="viewActivityDetail(scope.row)">查看</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, watch, onBeforeUnmount } from 'vue'
import { User, ShoppingBag, ChatLineRound, Location } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart, PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, GridComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { ElMessage } from 'element-plus'
import { get } from '@/api'

// 注册ECharts组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  BarChart,
  LineChart,
  PieChart,
  CanvasRenderer
])

// 图表引用
const userChartRef = ref(null)
const pieChartRef = ref(null)
let userChart = null
let pieChart = null

// 加载状态
const loading = ref(false)

// 用户图表周期
const userChartPeriod = ref('week')

// 统计数据
const stats = reactive({
  userCount: 0,
  newUserCount: 0,
  petCount: 0,
  newPetCount: 0,
  postCount: 0,
  newPostCount: 0,
  markerCount: 0,
  newMarkerCount: 0
})

// 存储API响应
const dashboardData = ref(null)

// 最近活动数据
const recentActivities = ref([])

// 获取仪表盘数据
const fetchDashboardData = async () => {
  loading.value = true
  try {
    const response = await get('/admin/dashboard/stats')
    
    if (!response || !response.data) {
      throw new Error('无效的数据响应')
    }
    
    // 存储API响应数据
    dashboardData.value = response.data
    
    // 更新统计数据 - 确保数据存在，否则使用默认值
    const userData = response.data.users || {}
    const petsData = response.data.pets || {}
    const postsData = response.data.posts || {}
    const markersData = response.data.markers || {}
    
    stats.userCount = userData.total || 0
    stats.newUserCount = userData.new || 0
    stats.petCount = petsData.total || 0
    stats.newPetCount = petsData.new || 0
    stats.postCount = postsData.total || 0
    stats.newPostCount = postsData.new || 0
    stats.markerCount = markersData.total || 0
    stats.newMarkerCount = markersData.new || 0
    
    // 更新图表数据
    updateUserChart(userChartPeriod.value)
    updatePieChart(response.data)
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
    ElMessage.error('获取仪表盘数据失败，显示模拟数据')
    
    // 使用模拟数据
    loadMockData()
    
    // 更新图表数据
    updateUserChart(userChartPeriod.value)
    updatePieChart(null)
  } finally {
    loading.value = false
  }
}

// 获取最近活动数据
const fetchRecentActivities = async () => {
  try {
    const response = await get('/admin/system/logs', {
      limit: 5
    })
    
    // 确保有返回数据
    if (response && response.data && Array.isArray(response.data)) {
      if (response.data.length > 0) {
        // 格式化日志数据
        recentActivities.value = response.data.map(log => ({
          time: log.createdAt ? new Date(log.createdAt).toLocaleString() : '未知时间',
          user: log.user?.nickname || log.user?.name || log.user?.username || '系统',
          action: log.description || getActionDescription(log.action) || '未知操作',
          ip: log.ip || '-',
          id: log._id || Date.now() + Math.random().toString(36).substring(2, 10)
        }))
      } else {
        console.warn('系统日志为空')
        useDefaultLogs()
      }
    } else {
      console.warn('获取系统日志返回数据格式不正确', response)
      // 使用模拟数据
      useDefaultLogs()
    }
  } catch (error) {
    console.error('获取最近活动失败:', error)
    // 使用模拟数据
    useDefaultLogs()
  }
}

// 根据操作类型获取描述
const getActionDescription = (action) => {
  if (!action) return '未知操作'
  
  const actionMap = {
    'LOGIN': '登录系统',
    'LOGOUT': '退出系统',
    'CREATE': '创建内容',
    'UPDATE': '更新内容',
    'DELETE': '删除内容',
    'REVIEW': '审核内容',
    'UPLOAD': '上传文件',
    'DOWNLOAD': '下载文件',
    'EXPORT': '导出数据',
    'IMPORT': '导入数据',
    'UPDATE_SETTINGS': '更新设置',
    'SYSTEM_ERROR': '系统错误',
    'API_ERROR': 'API错误',
    'OTHER': '其他操作'
  }
  return actionMap[action] || action
}

// 使用默认日志数据
const useDefaultLogs = () => {
  recentActivities.value = [
    { time: '2023-11-20 15:32:18', user: '张三', action: '发布了一篇新帖子', ip: '192.168.1.1' },
    { time: '2023-11-20 14:18:05', user: '李四', action: '添加了一个新标记', ip: '192.168.1.2' },
    { time: '2023-11-20 12:45:30', user: '王五', action: '评论了一篇帖子', ip: '192.168.1.3' },
    { time: '2023-11-20 11:22:47', user: '赵六', action: '上传了宠物照片', ip: '192.168.1.4' },
    { time: '2023-11-20 10:05:16', user: '孙七', action: '更新了个人信息', ip: '192.168.1.5' }
  ]
}

// 加载模拟数据
const loadMockData = () => {
  stats.userCount = 1286
  stats.newUserCount = 32
  stats.petCount = 968
  stats.newPetCount = 15
  stats.postCount = 2345
  stats.newPostCount = 78
  stats.markerCount = 532
  stats.newMarkerCount = 23
}

// 初始化图表
onMounted(() => {
  // 获取数据
  fetchDashboardData()
  fetchRecentActivities()
  
  // 初始化用户增长趋势图
  initUserChart()
  
  // 初始化内容分布饼图
  initPieChart()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
})

// 组件卸载前清理
onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  
  // 销毁图表实例
  if (userChart) {
    userChart.dispose()
    userChart = null
  }
  
  if (pieChart) {
    pieChart.dispose()
    pieChart = null
  }
})

// 监听用户图表周期变化
watch(userChartPeriod, (newValue) => {
  updateUserChart(newValue)
})

// 初始化用户增长趋势图
const initUserChart = () => {
  if (!userChartRef.value) return
  
  userChart = echarts.init(userChartRef.value)
  
  // 更新图表数据
  updateUserChart(userChartPeriod.value)
}

// 更新用户增长趋势图
const updateUserChart = (period) => {
  if (!userChart) return
  
  // 使用真实数据
  let xData = []
  let userData = []
  
  if (period === 'week' && dashboardData.value?.users?.growthWeek && Array.isArray(dashboardData.value.users.growthWeek)) {
    // 使用API返回的7天数据
    const growthData = dashboardData.value.users.growthWeek
    xData = growthData.map(item => item.date || '未知')
    userData = growthData.map(item => item.count || 0)
  } else if (period === 'month' && dashboardData.value?.users?.growthMonth && Array.isArray(dashboardData.value.users.growthMonth)) {
    // 使用API返回的30天数据
    const growthData = dashboardData.value.users.growthMonth
    xData = growthData.map(item => item.date || '未知')
    userData = growthData.map(item => item.count || 0)
  } else {
    // 获取最近日期作为备用
    if (period === 'week') {
      // 获取最近7天的日期
      xData = Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - 6 + i)
        return `${date.getMonth() + 1}/${date.getDate()}`
      })
      userData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 5)) // 随机模拟数据
    } else {
      // 获取最近30天的日期
      xData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - 29 + i)
        return `${date.getMonth() + 1}/${date.getDate()}`
      })
      userData = Array.from({ length: 30 }, () => Math.floor(Math.random() * 5)) // 随机模拟数据
    }
  }
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      top: 20,
      left: 50,
      right: 20,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisTick: {
        alignWithLabel: true
      },
      axisLabel: {
        rotate: period === 'month' ? 45 : 0,
        fontSize: 10,
        interval: period === 'month' ? 'auto' : 0
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: {
        lineStyle: {
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '新增用户',
        type: 'line',
        data: userData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: {
          width: 3,
          color: '#409EFF'
        },
        itemStyle: {
          color: '#409EFF'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64,158,255,0.6)' },
            { offset: 1, color: 'rgba(64,158,255,0.1)' }
          ])
        }
      }
    ]
  }
  
  userChart.setOption(option)
}

// 初始化内容分布饼图
const initPieChart = () => {
  if (!pieChartRef.value) return
  
  pieChart = echarts.init(pieChartRef.value)
  
  // 更新饼图数据
  updatePieChart()
}

// 更新饼图数据
const updatePieChart = (data) => {
  if (!pieChart) return
  
  // 使用API数据或统计数据
  const pieData = [
    { name: '用户', value: data?.users?.total || stats.userCount || 0 },
    { name: '宠物', value: data?.pets?.total || stats.petCount || 0 },
    { name: '帖子', value: data?.posts?.total || stats.postCount || 0 },
    { name: '地图标记', value: data?.markers?.total || stats.markerCount || 0 }
  ]

  // 如果所有数据都是0，显示模拟数据
  const hasData = pieData.some(item => item.value > 0)
  if (!hasData) {
    pieData[0].value = 120 // 用户
    pieData[1].value = 80  // 宠物
    pieData[2].value = 150 // 帖子
    pieData[3].value = 40  // 标记
  }
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 10,
      left: 'center',
      itemWidth: 16,
      itemHeight: 10,
      data: pieData.map(item => item.name)
    },
    series: [
      {
        name: '内容分布',
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
          fontSize: 12,
          position: 'outside'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: true,
          length: 15,
          length2: 10
        },
        data: pieData,
        color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C']
      }
    ]
  }
  
  pieChart.setOption(option)
}

// 处理窗口大小变化
const handleResize = () => {
  if (userChart) userChart.resize()
  if (pieChart) pieChart.resize()
}

// 查看活动详情
const viewActivityDetail = (row) => {
  ElMessage.info(`查看活动: ${row.action}`)
}

// 刷新数据
const refreshData = () => {
  fetchDashboardData()
  fetchRecentActivities()
}
</script>

<style lang="scss" scoped>
.dashboard-container {
  padding: 20px;
  
  .stat-card {
    height: 130px;
    margin-bottom: 20px;
    display: flex;
    flex-direction: row;
    
    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 70px;
      height: 70px;
      border-radius: 8px;
      font-size: 30px;
      margin-right: 15px;
      
      &.user-icon {
        background-color: rgba(64, 158, 255, 0.1);
        color: #409EFF;
      }
      
      &.pet-icon {
        background-color: rgba(103, 194, 58, 0.1);
        color: #67C23A;
      }
      
      &.post-icon {
        background-color: rgba(230, 162, 60, 0.1);
        color: #E6A23C;
      }
      
      &.marker-icon {
        background-color: rgba(245, 108, 108, 0.1);
        color: #F56C6C;
      }
    }
    
    .stat-content {
      display: flex;
      flex-direction: row;
      justify-content: center;
      
      .stat-title {
        font-size: 14px;
        color: #909399;
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 24px;
        font-weight: bold;
        margin-top: -8px;
        margin-left: 10px;
      }
      
      .stat-footer {
        font-size: 12px;
        color: #67C23A;
        margin-top: 8px;
      }
    }
  }
  
  .dashboard-charts {
    margin-bottom: 20px;
    
    .chart-card {
      margin-bottom: 20px;
      
      .chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .chart-container {
        height: 350px;
        padding: 10px 0;
      }
    }
  }
  
  .dashboard-recent {
    .recent-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style> 