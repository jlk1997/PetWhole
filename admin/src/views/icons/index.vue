<template>
  <div class="icons-container">
    <div class="page-header">
      <h2>图标管理</h2>
      <div class="page-header-actions">
        <el-button type="warning" icon="Refresh" @click="refreshAllIconPreviews" :loading="refreshingPreviews">
          强制刷新图标预览
        </el-button>
        <el-button type="primary" @click="showUploadDialog">上传新图标</el-button>
      </div>
    </div>
    
    <!-- 筛选条件 -->
    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="图标名称">
          <el-input v-model="filterForm.name" placeholder="搜索图标名称" clearable></el-input>
        </el-form-item>
        
        <el-form-item label="图标类型">
          <el-select v-model="filterForm.type" placeholder="选择图标类型" clearable>
            <el-option v-for="type in iconTypes" :key="type.value" :label="type.label" :value="type.value"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="使用状态">
          <el-select v-model="filterForm.status" placeholder="选择使用状态" clearable>
            <el-option label="已使用" value="used"></el-option>
            <el-option label="未使用" value="unused"></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" @click="fetchIcons">搜索</el-button>
          <el-button @click="resetFilter">重置</el-button>
          <el-button type="success" @click="showUploadDialog">上传图标</el-button>
        </el-form-item>
      </el-form>
    </el-card>
    
    <!-- 切换视图 -->
    <div style="margin-bottom: 15px;">
      <el-radio-group v-model="activeView" size="large">
        <el-radio-button value="icons">图标库</el-radio-button>
        <el-radio-button value="usage">应用图标位置</el-radio-button>
        <el-radio-button value="monitor">图标监控</el-radio-button>
      </el-radio-group>
    </div>
    
    <!-- 图标库视图 -->
    <el-card v-if="activeView === 'icons'" shadow="hover" class="icons-card" v-loading="loading">
      <el-table :data="filteredIcons" style="width: 100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="图标预览" width="120">
          <template #default="scope">
            <div class="icon-preview icon-preview-wrapper">
              <img 
                :src="formatIconUrl(scope.row.url)" 
                :alt="scope.row.name" 
                :data-path="scope.row.url" 
                class="icon-image"
              />
              <el-tooltip v-if="!scope.row.url" content="图标不存在" placement="top">
                <el-icon class="icon-warning"><Warning /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="图标名称" />
        <el-table-column prop="typeName" label="图标类型" />
        <el-table-column prop="size" label="文件大小" width="100" />
        <el-table-column prop="createTime" label="上传时间" width="180" />
        <el-table-column label="使用状态" width="100">
          <template #default="scope">
            <el-tag :type="scope.row.used ? 'success' : 'info'">
              {{ scope.row.used ? '已使用' : '未使用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template #default="scope">
            <el-button size="small" type="primary" @click="handlePreview(scope.row)">预览</el-button>
            <el-button size="small" type="success" @click="handleReplace(scope.row)">替换</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDelete(scope.row)"
              :disabled="scope.row.used"
            >删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :page-size="pageSize"
          :current-page="currentPage"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 应用图标位置视图 -->
    <div v-else-if="activeView === 'usage'">
      <!-- 应用图标类型筛选 -->
      <div style="margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
        <el-radio-group v-model="activeIconType" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="tab">标签栏图标</el-radio-button>
          <el-radio-button value="marker">标记图标</el-radio-button>
          <el-radio-button value="ui">界面图标</el-radio-button>
        </el-radio-group>
        
        <el-button type="primary" @click="refreshAllIconPreviews" :loading="refreshingPreviews">
          <i class="el-icon-refresh"></i> 强制刷新预览
        </el-button>
      </div>
      
      <!-- 应用图标位置列表 -->
      <div class="icon-usage-list">
        <el-empty v-if="filteredUsageLocations.length === 0" description="该类型下没有使用的图标" />
        <el-card 
          v-for="(item, index) in filteredUsageLocations" 
          :key="index"
          class="usage-icon-card"
          shadow="hover"
        >
          <div class="usage-icon-content">
            <div class="usage-icon-preview icon-preview-wrapper">
              <img 
                :src="formatIconUrl(item.path)" 
                :alt="item.location" 
                :data-path="item.path"
                class="icon-image" 
              />
              <div class="loading-indicator" v-if="!item.path"></div>
            </div>
            <div class="usage-icon-info">
              <h4>{{ item.location }}</h4>
              <p class="usage-icon-path">{{ item.path }}</p>
              <div class="usage-icon-actions">
                <el-button size="small" type="primary" @click="replaceAppIcon(item)">替换此图标</el-button>
                <el-button size="small" type="warning" @click="refreshSingleIcon(item.path)">刷新预览</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 图标监控视图 -->
    <div v-else-if="activeView === 'monitor'">
      <IconStatusMonitor />
    </div>
    
    <!-- 上传图标对话框 -->
    <el-dialog
      title="上传图标"
      v-model="dialogVisible"
      width="500px"
    >
      <el-form 
        ref="uploadFormRef"
        :model="uploadForm"
        :rules="uploadRules"
        label-width="80px"
      >
        <el-form-item label="图标名称" prop="name">
          <el-input v-model="uploadForm.name" placeholder="请输入图标名称"></el-input>
        </el-form-item>
        
        <el-form-item label="图标类型" prop="type">
          <el-select v-model="uploadForm.type" placeholder="请选择图标类型">
            <el-option 
              v-for="type in iconTypes" 
              :key="type.value" 
              :label="type.label" 
              :value="type.value"
            ></el-option>
          </el-select>
        </el-form-item>
        
        <el-form-item label="图标描述">
          <el-input 
            v-model="uploadForm.description" 
            type="textarea" 
            placeholder="请输入图标描述"
          ></el-input>
        </el-form-item>
        
        <el-form-item label="上传图标" prop="file">
          <el-upload
            ref="upload"
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :limit="1"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                请上传PNG、JPG、SVG格式的图片文件，大小不超过2MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="uploadIcon">上传</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 替换图标对话框 -->
    <el-dialog
      title="替换图标"
      v-model="replaceDialogVisible"
      width="500px"
      class="replace-dialog"
    >
      <template v-if="selectedIcon">
        <div class="current-icon icon-preview-wrapper">
          <h4>当前图标</h4>
          <img :src="formatIconUrl(selectedIcon.url)" :alt="selectedIcon.name" :data-path="selectedIcon.url" />
          <p>{{ selectedIcon.name }}</p>
        </div>
        
        <el-divider></el-divider>
        
        <div class="new-icon">
          <h4>上传新图标</h4>
          <el-upload
            ref="replaceUpload"
            action="#"
            :auto-upload="false"
            :on-change="handleReplaceFileChange"
            :on-remove="handleReplaceFileRemove"
            :limit="1"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                请上传PNG、JPG、SVG格式的图片文件，大小不超过2MB
              </div>
            </template>
          </el-upload>
        </div>
      </template>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="replaceDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="replaceIcon" :disabled="!replaceFile">替换</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 图标预览对话框 -->
    <el-dialog
      title="图标详情"
      v-model="previewDialogVisible"
      width="400px"
      class="icon-preview-dialog"
    >
      <template v-if="selectedIcon">
        <div class="icon-preview-wrapper">
          <img :src="formatIconUrl(selectedIcon.url)" :alt="selectedIcon.name" :data-path="selectedIcon.url" />
        </div>
        
        <div class="icon-info">
          <p><strong>名称:</strong> {{ selectedIcon.name }}</p>
          <p><strong>类型:</strong> {{ selectedIcon.typeName }}</p>
          <p><strong>描述:</strong> {{ selectedIcon.description || '无' }}</p>
          <p><strong>大小:</strong> {{ selectedIcon.size }}</p>
          <p><strong>上传时间:</strong> {{ selectedIcon.createTime }}</p>
          <p><strong>使用状态:</strong> {{ selectedIcon.used ? '已使用' : '未使用' }}</p>
          <p v-if="selectedIcon.used"><strong>使用位置:</strong> {{ selectedIcon.usedLocation || '未指定' }}</p>
        </div>
      </template>
    </el-dialog>
    
    <!-- 应用图标替换对话框 -->
    <el-dialog
      title="替换应用图标"
      v-model="appIconReplaceVisible"
      width="500px"
    >
      <template v-if="selectedAppIcon">
        <div class="current-icon icon-preview-wrapper">
          <h4>当前图标 - {{ selectedAppIcon.location }}</h4>
          <img :src="formatIconUrl(selectedAppIcon.path)" :alt="selectedAppIcon.location" :data-path="selectedAppIcon.path" />
          <p>{{ selectedAppIcon.path }}</p>
        </div>
        
        <el-divider></el-divider>
        
        <div class="new-icon">
          <h4>上传新图标</h4>
          <el-upload
            ref="appIconUpload"
            action="#"
            :auto-upload="false"
            :on-change="handleAppIconFileChange"
            :on-remove="handleAppIconFileRemove"
            :limit="1"
          >
            <el-button type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">
                请上传PNG、JPG、SVG格式的图片文件，大小不超过2MB。建议保持与原图标尺寸一致。
              </div>
            </template>
          </el-upload>
        </div>
      </template>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="appIconReplaceVisible = false">取消</el-button>
          <el-button type="primary" @click="replaceAppIconSubmit" :disabled="!appIconFile">替换</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getIcons, getIconDetail, uploadIcon as uploadIconApi, replaceIcon as replaceIconApi, updateIcon, deleteIcon, getIconTypes, replaceAppIcon as replaceAppIconApi, formatIconUrl } from '@/api/modules/icon'
import { refreshImages, getUncachedImageUrl, purgeServerCache, forceRefreshImage, checkImageExists } from '@/utils/cacheUtils'
import IconStatusMonitor from '@/components/IconStatusMonitor.vue'
import { Warning } from '@element-plus/icons-vue'

// 图标类型列表
const iconTypes = [
  { value: 'app', label: '应用图标' },
  { value: 'tab', label: '标签栏图标' },
  { value: 'marker', label: '地图标记' },
  { value: 'pet', label: '宠物图标' },
  { value: 'user', label: '用户相关' },
  { value: 'common', label: '通用图标' },
  { value: 'ui', label: '界面元素' },
  { value: 'action', label: '操作按钮' },
  { value: 'status', label: '状态图标' },
  { value: 'social', label: '社交图标' }
]

// 应用中所有使用的图标位置
const iconUsageLocations = [
  // 应用图标
  { type: 'app', location: '应用启动图标', path: '/static/images/logo.png' },
  { type: 'app', location: '主界面图标', path: '/static/images/logo-text.png' },
  
  // 标签栏图标
  { type: 'tab', location: '标签栏-地图(未选中)', path: '/static/images/map-icon.png' },
  { type: 'tab', location: '标签栏-地图(选中)', path: '/static/images/map-icon-active.png' },
  { type: 'tab', location: '标签栏-社区(未选中)', path: '/static/images/community-icon.png' },
  { type: 'tab', location: '标签栏-社区(选中)', path: '/static/images/community-icon-active.png' },
  { type: 'tab', location: '标签栏-聊天(未选中)', path: '/static/images/chat-icon.png' },
  { type: 'tab', location: '标签栏-聊天(选中)', path: '/static/images/chat-icon-active.png' },
  { type: 'tab', location: '标签栏-我的(未选中)', path: '/static/images/profile-icon.png' },
  { type: 'tab', location: '标签栏-我的(选中)', path: '/static/images/profile-icon-active.png' },
  
  // 地图标记
  { type: 'marker', location: '普通标记', path: '/static/images/marker.png' },
  { type: 'marker', location: '宠物友好标记', path: '/static/images/pet-marker.png' },
  { type: 'marker', location: '危险区域标记', path: '/static/images/danger-marker.png' },
  { type: 'marker', location: '公园/风景标记', path: '/static/images/park-marker.png' },
  { type: 'marker', location: '商店/服务标记', path: '/static/images/shop-marker.png' },
  { type: 'marker', location: '食品标记', path: '/static/images/food-marker.png' },
  { type: 'marker', location: '当前位置标记', path: '/static/images/current-location.png' },
  
  // 用户相关图标
  { type: 'user', location: '默认用户头像', path: '/static/images/default-avatar.png' },
  { type: 'user', location: '用户标记图标', path: '/static/images/user-marker.png' },
  
  // 宠物图标
  { type: 'pet', location: '默认宠物头像', path: '/static/images/default-pet.png' },
  { type: 'pet', location: '宠物标记图标', path: '/static/images/pet-marker.png' },
  
  // 通用界面图标
  { type: 'ui', location: '默认地图', path: '/static/images/default-map.png' },
  { type: 'ui', location: '默认图片', path: '/static/images/default-image.png' },
  
  // 操作图标
  { type: 'action', location: '点赞图标', path: '/static/images/like-icon.png' },
  { type: 'action', location: '评论图标', path: '/static/images/comment-icon.png' },
  { type: 'action', location: '分享图标', path: '/static/images/share-icon.png' },
  { type: 'action', location: '删除图标', path: '/static/images/delete-icon.png' }
]

// 筛选表单
const filterForm = reactive({
  name: '',
  type: '',
  status: ''
})

// 上传表单
const uploadFormRef = ref(null)
const uploadForm = reactive({
  name: '',
  type: '',
  description: '',
  file: null
})

// 上传表单验证规则
const uploadRules = {
  name: [
    { required: true, message: '请输入图标名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择图标类型', trigger: 'change' }
  ],
  file: [
    { required: true, message: '请上传图标文件', trigger: 'change' }
  ]
}

// 视图切换控制
const activeView = ref('icons')
const activeIconType = ref('app')

// 分页参数
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 加载状态
const loading = ref(false)

// 对话框显示状态
const dialogVisible = ref(false)
const replaceDialogVisible = ref(false)
const previewDialogVisible = ref(false)
const appIconReplaceVisible = ref(false)

// 选中的图标
const selectedIcon = ref(null)
const selectedAppIcon = ref(null)

// 替换文件
const replaceFile = ref(null)
const appIconFile = ref(null)

// 图标数据
const icons = ref([])

// 获取筛选后的图标
const filteredIcons = computed(() => {
  let result = [...icons.value]
  
  if (filterForm.name) {
    result = result.filter(icon => icon.name.toLowerCase().includes(filterForm.name.toLowerCase()))
  }
  
  if (filterForm.type) {
    result = result.filter(icon => icon.type === filterForm.type)
  }
  
  if (filterForm.status) {
    result = result.filter(icon => 
      (filterForm.status === 'used' && icon.used) || 
      (filterForm.status === 'unused' && !icon.used)
    )
  }
  
  return result
})

// 筛选后的APP图标使用位置
const filteredUsageLocations = computed(() => {
  return iconUsageLocations.filter(item => item.type === activeIconType.value)
})

// 获取图标URL（添加时间戳防止缓存）
const getIconURL = (path) => {
  if (!path) return '';
  
  // 格式化路径，确保正确处理路径格式
  const formattedPath = path.startsWith('/') ? path.substring(1) : path;
  
  // 始终使用当前窗口的域名和端口
  const baseURL = window.location.origin + '/';
  
  // 添加唯一时间戳和随机字符串以彻底避免缓存问题
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fullUrl = `${baseURL}${formattedPath}`;
  
  console.log(`构建图标预览URL: ${fullUrl}`);
  
  // 添加版本号参数强制刷新缓存
  return `${fullUrl}?v=${timestamp}&r=${randomStr}`;
}

// 强制刷新所有图标
const forceRefreshAllIcons = async () => {
  // 显示正在刷新提示
  ElMessage.info({
    message: '正在刷新图标，请稍候...',
    duration: 3000
  });
  
  // 定义错误收集器
  const errors = [];
  
  try {
    // 使用缓存工具刷新所有图标
    const count = refreshImages('img[src*="/static/"]', true);
    console.log(`已强制刷新 ${count} 个图标图像`);
    
    // 特别处理当前正在替换的图标
    if (selectedAppIcon.value && selectedAppIcon.value.path) {
      try {
        // 获取实际路径
        const iconPath = selectedAppIcon.value.path;
        console.log(`准备刷新当前图标: ${iconPath}`);
        
        // 不使用checkImageExists作为前置判断，直接尝试刷新
        const success = await forceRefreshImage(iconPath);
        console.log(`强制刷新当前图标${success ? '成功' : '可能需要进一步处理'}: ${iconPath}`);
        
        // 查看是否有匹配的DOM元素需要更新
        const iconSelector = `img[src*="${iconPath.split('?')[0]}"]`;
        const imageElements = document.querySelectorAll(iconSelector);
        console.log(`找到 ${imageElements.length} 个匹配图标元素`);
        
        if (imageElements.length > 0) {
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          
          // 更新各个图片元素
          imageElements.forEach((img, index) => {
            try {
              const originalSrc = img.src.split('?')[0];
              const newSrc = `${originalSrc}?t=${timestamp}&r=${randomStr}`;
              img.src = newSrc;
              console.log(`更新图标元素 ${index + 1} 的src: ${newSrc}`);
            } catch (elemError) {
              console.warn(`无法更新元素 ${index + 1}:`, elemError);
            }
          });
        }
        
        // 直接发起请求加载图片，而不检查是否存在
        try {
          const imgUrl = iconPath + '?t=' + Date.now();
          const response = await fetch(imgUrl, { 
            method: 'GET',
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          console.log(`图标文件HTTP状态: ${response.status} ${response.statusText}`);
          
          if (!response.ok) {
            // 记录警告但不中断流程
            console.warn(`无法加载图标文件(${response.status}): ${imgUrl}`);
            errors.push(`图标文件请求返回非成功状态(${response.status}): ${iconPath}`);
          }
        } catch (fetchError) {
          console.warn('请求图标失败，但这可能是暂时的:', fetchError);
          errors.push(`请求图标文件异常: ${fetchError.message}`);
        }
      } catch (refreshError) {
        console.warn('刷新当前图标过程中出现问题:', refreshError);
        errors.push(`刷新当前图标过程出错: ${refreshError.message}`);
        // 继续执行，不要中断
      }
    }
    
    // 刷新应用图标位置的图标
    if (activeView.value === 'usage') {
      // 切换视图以触发重新渲染
      const currentView = activeView.value;
      const currentType = activeIconType.value;
      
      // 先切换到另一个视图，然后切回
      activeView.value = 'icons';
      setTimeout(() => {
        activeView.value = currentView;
        activeIconType.value = currentType;
      }, 100);
    }
    
    // 尝试清除服务器缓存
    try {
      console.log('请求服务器清除静态文件缓存');
      await purgeServerCache('/static/');
    } catch (error) {
      console.warn('清除服务器缓存失败，但不影响主要功能:', error);
      errors.push(`清除服务器缓存失败: ${error.message}`);
    }
    
    // 如果有错误，显示警告但不中断流程
    if (errors.length > 0) {
      console.warn('图标刷新过程中有一些问题:', errors);
      // 只在控制台显示，不向用户显示警告，减少干扰
    } else {
      ElMessage.success('图标刷新成功');
    }
  } catch (error) {
    console.error('刷新图标过程中出现异常:', error);
    ElMessage.warning({
      message: `刷新图标过程中出现问题，但图标可能已替换成功`,
      duration: 3000
    });
  }
  
  // 强制触发DOM重新渲染
  setTimeout(() => {
    // 获取所有图标元素
    const iconElements = document.querySelectorAll('img[src*="/static/"]');
    console.log(`找到 ${iconElements.length} 个图标元素，尝试强制刷新`);
    
    if (iconElements.length > 0) {
      // 为每个图标添加随机参数强制刷新
      const timestamp = Date.now();
      iconElements.forEach((img, index) => {
        try {
          const originalSrc = img.src.split('?')[0];
          const randomStr = Math.random().toString(36).substring(2, 8);
          img.src = `${originalSrc}?t=${timestamp}&r=${randomStr}`;
          console.log(`已刷新图标元素 ${index + 1}`);
        } catch (elemError) {
          console.warn(`刷新元素 ${index + 1} 失败:`, elemError);
        }
      });
    }
  }, 500);
}

// 初始化
onMounted(async () => {
  // 先获取图标列表
  await fetchIcons()
  
  // 初始化完成后刷新预览
  console.log('初始化完成，刷新图标预览...')
  try {
    // 使用异步但不等待，避免阻塞UI
    refreshAllIconPreviews().catch(err => {
      console.warn('初始化时刷新图标预览失败:', err)
    })
  } catch (error) {
    console.warn('初始化刷新预览失败:', error)
  }
})

// 获取图标列表
const fetchIcons = async () => {
  loading.value = true
  try {
    const response = await getIcons({
      page: currentPage.value,
      limit: pageSize.value,
      type: filterForm.type,
      search: filterForm.name,
      used: filterForm.status === 'used' ? true : filterForm.status === 'unused' ? false : undefined
    })
    
    if (response && response.success && response.data) {
      icons.value = response.data.items
      total.value = response.data.total
    } else {
      ElMessage.warning('获取图标列表失败')
    }
  } catch (error) {
    console.error('获取图标列表错误:', error)
    ElMessage.error('获取图标列表失败')
  } finally {
    loading.value = false
  }
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.name = ''
  filterForm.type = ''
  filterForm.status = ''
  fetchIcons()
}

// 显示上传对话框
const showUploadDialog = () => {
  uploadForm.name = ''
  uploadForm.type = ''
  uploadForm.description = ''
  uploadForm.file = null
  dialogVisible.value = true
}

// 文件变更事件处理
const handleFileChange = (file) => {
  uploadForm.file = file.raw
}

// 文件移除事件处理
const handleFileRemove = () => {
  uploadForm.file = null
}

// 预览图标
const handlePreview = (icon) => {
  selectedIcon.value = icon
  previewDialogVisible.value = true
}

// 替换图标
const handleReplace = (icon) => {
  selectedIcon.value = icon
  replaceFile.value = null
  replaceDialogVisible.value = true
}

// 替换文件变更事件处理
const handleReplaceFileChange = (file) => {
  replaceFile.value = file.raw
}

// 替换文件移除事件处理
const handleReplaceFileRemove = () => {
  replaceFile.value = null
}

// 打开应用图标替换对话框
const replaceAppIcon = (icon) => {
  selectedAppIcon.value = icon
  appIconFile.value = null
  appIconReplaceVisible.value = true
}

// 应用图标文件变更事件处理
const handleAppIconFileChange = (file) => {
  appIconFile.value = file.raw
}

// 应用图标文件移除事件处理
const handleAppIconFileRemove = () => {
  appIconFile.value = null
}

// 替换应用图标提交
const replaceAppIconSubmit = async () => {
  if (!appIconFile.value) {
    ElMessage.warning('请先选择替换文件')
    return
  }
  
  // 显示加载提示
  const loadingInstance = ElMessage({
    message: '正在替换图标，请稍候...',
    type: 'info',
    duration: 0
  });
  
  try {
    // 1. 检查选择的图标路径
    const iconPath = selectedAppIcon.value.path;
    console.log('开始替换应用图标:', {
      fileName: appIconFile.value.name,
      fileType: appIconFile.value.type,
      fileSize: appIconFile.value.size,
      targetPath: iconPath,
      location: selectedAppIcon.value.location
    });
    
    // 2. 先验证图片是否有效
    const validImageTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp'];
    if (!validImageTypes.includes(appIconFile.value.type)) {
      loadingInstance.close();
      ElMessage.error(`不支持的文件类型: ${appIconFile.value.type}，请使用PNG、JPG、GIF、SVG或WEBP格式`);
      return;
    }
    
    // 3. 验证文件大小
    const maxSizeMB = 5;
    if (appIconFile.value.size > maxSizeMB * 1024 * 1024) {
      loadingInstance.close();
      ElMessage.error(`文件大小超过${maxSizeMB}MB限制`);
      return;
    }
    
    // 4. 检查文件是否存在
    try {
      // 先尝试加载图标，看它是否存在
      const imageUrl = `${window.location.origin}${iconPath}`;
      console.log(`检查目标图标是否存在: ${imageUrl}`);
      
      const testImg = new Image();
      testImg.onerror = () => console.log(`目标图标不存在，将创建新文件: ${imageUrl}`);
      testImg.onload = () => console.log(`目标图标已存在: ${imageUrl}`);
      testImg.src = imageUrl;
    } catch (error) {
      console.warn('检查图标存在性失败:', error);
    }
    
    // 5. 发送替换请求
    const response = await replaceAppIconApi(appIconFile.value, {
      path: iconPath,
      location: selectedAppIcon.value.location
    })
    
    // 关闭加载提示
    loadingInstance.close();
    
    if (response && response.success) {
      ElMessage.success('图标替换成功')
      appIconReplaceVisible.value = false
      
      // 延时执行刷新操作，确保文件已经完全写入服务器
      setTimeout(async () => {
        // 清除浏览器缓存
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_IMAGES_CACHE' });
        }
        
        // 等待1秒让服务器处理文件
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // 尝试强制刷新被替换的图标
          const refreshSuccess = await forceRefreshIconPreview(iconPath);
          
          if (refreshSuccess) {
            console.log(`成功刷新替换后的图标预览: ${iconPath}`);
          } else {
            console.warn(`单个图标刷新失败，尝试刷新所有图标...`);
            // 如果单个刷新失败，尝试刷新所有图标
            await refreshAllIconPreviews();
          }
          
          // 刷新图标列表
          fetchIcons();
        } catch (refreshError) {
          console.error('刷新图标过程中出错:', refreshError);
          // 如果新方法失败，尝试使用旧方法
          forceRefreshAllIcons();
        }
      }, 1000);
    } else {
      ElMessage.error(response?.message || '替换应用图标失败')
      console.error('替换失败响应:', response);
    }
  } catch (error) {
    // 关闭加载提示
    loadingInstance.close();
    
    console.error('替换应用图标失败:', error)
    
    let errorMsg = '替换应用图标失败';
    if (error.response) {
      errorMsg += `: ${error.response.data?.message || error.message || '未知错误'}`;
    } else if (error.message) {
      errorMsg += `: ${error.message}`;
    }
    
    ElMessage.error(errorMsg)
  }
}

// 上传图标
const uploadIcon = async () => {
  if (!uploadForm.file) {
    ElMessage.warning('请先选择图标文件')
    return
  }
  
  // 表单验证
  try {
    await uploadFormRef.value.validate()
  } catch (error) {
    return
  }
  
  try {
    const formData = new FormData()
    formData.append('name', uploadForm.name)
    formData.append('type', uploadForm.type)
    formData.append('description', uploadForm.description)
    formData.append('file', uploadForm.file)
    
    const response = await uploadIconApi(uploadForm.file, {
      name: uploadForm.name,
      type: uploadForm.type,
      description: uploadForm.description
    })
    
    if (response && response.success) {
      ElMessage.success('上传成功')
      dialogVisible.value = false
      fetchIcons()
    } else {
      ElMessage.error(response?.message || '上传失败')
    }
  } catch (error) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  }
}

// 替换图标
const replaceIcon = async () => {
  if (!replaceFile.value) {
    ElMessage.warning('请先选择替换文件')
    return
  }
  
  try {
    const response = await replaceIconApi(selectedIcon.value.id, replaceFile.value)
    
    if (response && response.success) {
      ElMessage.success('替换成功')
      replaceDialogVisible.value = false
      fetchIcons()
    } else {
      ElMessage.error(response?.message || '替换失败')
    }
  } catch (error) {
    console.error('替换失败:', error)
    ElMessage.error('替换失败: ' + (error.message || '未知错误'))
  }
}

// 删除图标
const handleDelete = (icon) => {
  if (icon.used) {
    ElMessage.warning('该图标正在使用中，无法删除')
    return
  }
  
  ElMessageBox.confirm('确定要删除该图标吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      const response = await deleteIcon(icon.id)
      
      if (response && response.success) {
        ElMessage.success('删除成功')
        fetchIcons()
      } else {
        ElMessage.error(response?.message || '删除失败')
      }
    } catch (error) {
      console.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }).catch(() => {})
}

// 处理页面大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  fetchIcons()
}

// 处理页码变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  fetchIcons()
}

// 添加刷新预览的逻辑
const refreshingPreviews = ref(false)

// 修改强制刷新图标预览的函数
const forceRefreshIconPreview = async (iconPath, imgElement) => {
  try {
    // 确保路径正确
    let path = iconPath;
    if (path.startsWith('http')) {
      try {
        const urlObj = new URL(path);
        path = urlObj.pathname;
      } catch (e) {
        console.warn('解析URL失败:', e);
      }
    }
    
    // 确保路径以/开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    // 防止路径重复添加前缀
    if (path.includes('/api/admin/icons/view')) {
      // 已经包含前缀，先提取原始路径
      const pathParts = path.split('/api/admin/icons/view');
      path = pathParts[pathParts.length - 1];
    }
    
    // 1. 首先尝试使用formatIconUrl来获取Blob URL
    // 这是一个同步返回的URL，但后台会异步加载并更新DOM
    const tempUrl = formatIconUrl(path);
    
    // 2. 如果有传入图片元素，直接更新它
    if (imgElement) {
      // 将原始路径保存在data属性中
      imgElement.dataset.originalSrc = path;
      
      // 使用新的URL，这样即使formatIconUrl失败，也会尝试直接加载
      imgElement.src = tempUrl;
    }
    
    // 3. 返回成功
    return true;
  } catch (error) {
    console.error('强制刷新图标预览失败:', error);
    return false;
  }
};

// 修改刷新所有预览的方法
const refreshAllIconPreviews = async () => {
  refreshingPreviews.value = true;
  
  try {
    console.log('开始刷新所有图标预览...');
    
    // 获取所有可见的图标路径
    const iconPaths = new Set();
    
    // 收集使用位置的图标路径
    iconUsageLocations.forEach(item => iconPaths.add(item.path));
    
    // 如果有选中的应用图标，也添加到集合中
    if (selectedAppIcon.value && selectedAppIcon.value.path) {
      iconPaths.add(selectedAppIcon.value.path);
    }
    
    // 查找所有图标元素的src
    const visibleImages = document.querySelectorAll('img[src*="/static/"]');
    console.log(`找到 ${visibleImages.length} 个可见图标元素`);
    
    visibleImages.forEach(img => {
      try {
        const src = img.src.split('?')[0];
        // 尝试提取路径部分
        if (src && src.includes('/static/')) {
          // 如果是完整URL，提取路径部分
          if (src.includes('http')) {
            try {
              const urlObj = new URL(src);
              iconPaths.add(urlObj.pathname);
            } catch (e) {
              // 如果解析失败，直接添加
              iconPaths.add(src);
            }
          } else {
            // 否则直接添加
            iconPaths.add(src);
          }
        }
      } catch (e) {
        console.warn('处理图片src时出错:', e);
      }
    });
    
    console.log(`需要刷新 ${iconPaths.size} 个不同图标`);
    
    // 并行刷新所有图标，但限制并发数
    const concurrentLimit = 5;
    const iconPathsArray = Array.from(iconPaths);
    const results = [];
    
    for (let i = 0; i < iconPathsArray.length; i += concurrentLimit) {
      const batch = iconPathsArray.slice(i, i + concurrentLimit);
      console.log(`刷新批次 ${Math.floor(i/concurrentLimit) + 1}: ${batch.length} 个图标`);
      
      // 为每个图标路径找到对应的图片元素
      const batchTasks = batch.map(path => {
        // 查找匹配此路径的图片元素
        const normalizedPath = path.split('?')[0];
        const matchSelector = `img[src*="${normalizedPath}"]`;
        const matchedElements = document.querySelectorAll(matchSelector);
        
        if (matchedElements.length > 0) {
          // 如果找到多个，只使用第一个
          return forceRefreshIconPreview(path, matchedElements[0]);
        } else {
          // 如果没找到，也刷新图标，可能会在后续加载
          return forceRefreshIconPreview(path);
        }
      });
      
      // 等待批次完成
      const batchResults = await Promise.all(batchTasks);
      results.push(...batchResults);
      
      // 稍等一下再处理下一批
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    const successCount = results.filter(Boolean).length;
    console.log(`刷新完成: ${successCount}/${iconPaths.size} 个图标成功刷新`);
    
    if (successCount > 0) {
      ElMessage.success(`成功刷新 ${successCount} 个图标预览`);
      return true;
    } else {
      ElMessage.warning('没有成功刷新任何图标，请尝试手动刷新页面');
      return false;
    }
  } catch (error) {
    console.error('刷新所有图标预览失败:', error);
    ElMessage.error('刷新图标预览失败: ' + (error.message || '未知错误'));
    return false;
  } finally {
    refreshingPreviews.value = false;
  }
};

// 修改原有的刷新预览函数，使用新的强化方法
const refreshIconPreviews = async () => {
  refreshingPreviews.value = true;
  try {
    const success = await refreshAllIconPreviews();
    if (!success) {
      // 如果强化版方法失败，尝试原来的方法
      await forceRefreshAllIcons();
    }
  } catch (error) {
    console.error('刷新图标预览失败:', error);
    ElMessage.error('刷新图标预览失败: ' + (error.message || '未知错误'));
  } finally {
    refreshingPreviews.value = false;
  }
};

// 刷新单个图标
const refreshSingleIcon = async (iconPath) => {
  try {
    ElMessage.info(`正在刷新图标: ${iconPath}`);
    
    // 清除这个图标的缓存
    const cacheKey = `blob_url_${iconPath}`;
    if (sessionStorage.getItem(cacheKey)) {
      console.log(`清除图标缓存: ${cacheKey}`);
      sessionStorage.removeItem(cacheKey);
    }
    
    // 使用importIconFromBackend加载图标
    const imported = await importIconFromBackend(iconPath);
    
    if (imported) {
      ElMessage.success('图标刷新成功');
    } else {
      ElMessage.warning('图标刷新失败，请检查图标是否存在');
    }
  } catch (error) {
    console.error('刷新图标失败:', error);
    ElMessage.error('刷新图标失败: ' + error.message);
  }
};

/**
 * 从后端导入图标
 * @param {string} path - 图标路径
 * @returns {Promise<boolean>} - 是否成功
 */
const importIconFromBackend = async (path) => {
  try {
    // 确保路径格式正确
    let iconPath = path;
    if (!iconPath.startsWith('/')) {
      iconPath = '/' + iconPath;
    }
    
    // 构建URL
    const backendUrl = 'http://localhost:3000';
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const url = `${backendUrl}${iconPath}?t=${timestamp}&r=${randomStr}`;
    
    console.log(`尝试从${backendUrl}导入图标: ${iconPath}`);
    
    // 发起请求
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    if (!response.ok) {
      console.warn(`从${backendUrl}获取图标失败: ${response.status} ${response.statusText}`);
      return false;
    }
    
    // 获取blob数据
    const blob = await response.blob();
    
    // 验证是否为图像
    if (!blob.type.startsWith('image/')) {
      console.warn(`从${backendUrl}获取的数据不是图像: ${blob.type}`);
      return false;
    }
    
    // 创建blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // 缓存到sessionStorage
    const cacheKey = `blob_url_${iconPath}`;
    sessionStorage.setItem(cacheKey, blobUrl);
    
    // 更新DOM中的所有匹配图像
    const selector = `img[src*="${iconPath.split('?')[0]}"], img[data-path="${iconPath}"]`;
    const images = document.querySelectorAll(selector);
    
    console.log(`找到 ${images.length} 个匹配的图像元素`);
    
    images.forEach((img, index) => {
      img.src = blobUrl;
      console.log(`更新图像 ${index + 1}/${images.length}`);
    });
    
    return true;
  } catch (error) {
    console.error(`导入图标失败: ${path}`, error);
    return false;
  }
};
</script>

<style lang="scss" scoped>
.icons-container {
  .filter-card {
    margin-bottom: 20px;
  }
  
  .icons-card {
    .icon-preview {
      display: flex;
      justify-content: center;
      align-items: center;
      
      img {
        max-width: 50px;
        max-height: 50px;
      }
    }
    
    .pagination-container {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }
  }
  
  .icon-preview-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    
    img {
      width: 100px;
      height: 100px;
      margin-bottom: 20px;
      object-fit: contain;
    }
    
    .icon-info {
      width: 100%;
      
      p {
        margin: 8px 0;
      }
    }
  }
  
  .replace-dialog {
    .current-icon, .new-icon {
      margin: 10px 0;
      
      h4 {
        margin-bottom: 10px;
      }
      
      img {
        max-width: 100px;
        max-height: 100px;
        object-fit: contain;
      }
    }
    
    .current-icon {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
  }
  
  .icon-usage-list {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    
    .usage-icon-card {
      width: 300px;
      margin-bottom: 15px;
      
      .usage-icon-content {
        display: flex;
        align-items: center;
        
        .usage-icon-preview {
          margin-right: 15px;
          
          img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
        }
        
        .usage-icon-info {
          flex: 1;
          
          h4 {
            margin: 0 0 5px 0;
            font-size: 16px;
          }
          
          .usage-icon-path {
            color: #999;
            font-size: 12px;
            margin-bottom: 8px;
            word-break: break-all;
          }
        }
      }
    }
  }
  
  // 图标预览通用样式
  .icon-preview-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50px;
    min-width: 50px;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.02);
      border-radius: 4px;
      pointer-events: none;
    }
    
    img.icon-image {
      display: block;
      object-fit: contain;
      opacity: 0.9;
      transition: opacity 0.3s ease;
      max-width: 100%;
      max-height: 100%;
      background-image: linear-gradient(45deg, #f5f5f5 25%, transparent 25%),
                      linear-gradient(-45deg, #f5f5f5 25%, transparent 25%),
                      linear-gradient(45deg, transparent 75%, #f5f5f5 75%),
                      linear-gradient(-45deg, transparent 75%, #f5f5f5 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
      
      &:hover {
        opacity: 1;
      }
    }
    
    .icon-warning {
      position: absolute;
      right: -5px;
      top: -5px;
      color: #E6A23C;
      font-size: 16px;
    }
    
    .loading-indicator {
      position: absolute;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-top-color: #409EFF;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  }
}

// 添加页面标题栏样式
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }
  
  .page-header-actions {
    display: flex;
    gap: 10px;
  }
}
</style> 