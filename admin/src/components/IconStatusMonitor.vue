<!-- 
  IconStatusMonitor.vue - 图标状态监控组件
  用于监控和显示不同环境中图标的状态
-->
<template>
  <div class="icon-status-monitor">
    <div class="monitor-header">
      <h3>图标环境监控</h3>
      <el-tooltip content="刷新图标状态信息" placement="top">
        <el-button 
          type="primary" 
          :icon="Refresh" 
          circle 
          size="small" 
          @click="refreshStatus"
          :loading="loading"
        />
      </el-tooltip>
    </div>
    
    <!-- 服务器错误提示 -->
    <el-alert
      v-if="serverError"
      type="error"
      :closable="false"
      show-icon
      style="margin-bottom: 15px;"
    >
      <template #title>
        <span>服务器错误: {{ serverErrorMessage }}</span>
      </template>
      <template #default>
        <div style="margin-top: 10px;">
          <el-button type="primary" size="small" @click="refreshStatus">重试</el-button>
          <el-button size="small" @click="showErrorDetails = !showErrorDetails">
            {{ showErrorDetails ? '隐藏详情' : '显示详情' }}
          </el-button>
        </div>
        <div v-if="showErrorDetails" class="error-details">
          <pre>{{ serverErrorDetails }}</pre>
        </div>
      </template>
    </el-alert>
    
    <el-alert
      v-if="hasInconsistencies && !serverError"
      type="warning"
      :closable="false"
      show-icon
    >
      <b>检测到环境不一致</b>: 部分图标在不同环境中存在差异，请注意处理
    </el-alert>
    
    <div class="status-filters">
      <el-select 
        v-model="statusFilter" 
        placeholder="状态筛选" 
        size="small"
        clearable
      >
        <el-option label="全部" value="" />
        <el-option label="一致" value="consistent" />
        <el-option label="不一致" value="inconsistent" />
        <el-option label="缺失" value="missing" />
      </el-select>
      
      <el-input
        v-model="pathFilter"
        placeholder="搜索路径"
        size="small"
        clearable
        :prefix-icon="Search"
      />
    </div>
    
    <el-table
      :data="filteredIconsStatus"
      stripe
      border
      size="small"
      v-loading="loading"
    >
      <el-table-column label="图标" width="80">
        <template #default="{ row }">
          <el-image
            :src="getIconUrl(row.path)"
            fit="contain"
            style="width: 30px; height: 30px"
            :preview-src-list="[getIconUrl(row.path)]"
            :initial-index="0"
          >
            <template #error>
              <div class="image-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </template>
      </el-table-column>
      
      <el-table-column prop="path" label="路径" min-width="200" show-overflow-tooltip />
      
      <el-table-column label="开发环境" width="100">
        <template #default="{ row }">
          <div class="status-cell">
            <el-tag 
              :type="row.devExists ? 'success' : 'danger'"
              size="small"
            >
              {{ row.devExists ? '存在' : '缺失' }}
            </el-tag>
            <el-tooltip v-if="row.devExists" content="在浏览器中查看" placement="top">
              <el-link 
                type="primary" 
                :href="getIconUrl(row.path)" 
                target="_blank"
                :underline="false"
              >
                <el-icon><View /></el-icon>
              </el-link>
            </el-tooltip>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="H5生产" width="100">
        <template #default="{ row }">
          <div class="status-cell">
            <el-tag 
              :type="row.h5Exists ? 'success' : 'danger'"
              size="small"
            >
              {{ row.h5Exists ? '存在' : '缺失' }}
            </el-tag>
            <el-icon 
              v-if="row.devExists && row.h5Exists && row.devMd5 !== row.h5Md5" 
              color="#E6A23C"
            >
              <WarningFilled />
            </el-icon>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="小程序" width="100">
        <template #default="{ row }">
          <div class="status-cell">
            <el-tag 
              :type="row.wxExists ? 'success' : 'danger'"
              size="small"
            >
              {{ row.wxExists ? '存在' : '缺失' }}
            </el-tag>
            <el-icon 
              v-if="row.devExists && row.wxExists && row.devMd5 !== row.wxMd5" 
              color="#E6A23C"
            >
              <WarningFilled />
            </el-icon>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="APP" width="100">
        <template #default="{ row }">
          <div class="status-cell">
            <el-tag 
              :type="row.appExists ? 'success' : 'danger'"
              size="small"
            >
              {{ row.appExists ? '存在' : '缺失' }}
            </el-tag>
            <el-icon 
              v-if="row.devExists && row.appExists && row.devMd5 !== row.appMd5" 
              color="#E6A23C"
            >
              <WarningFilled />
            </el-icon>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="状态" width="120">
        <template #default="{ row }">
          <el-tag 
            :type="row.isConsistent ? 'success' : row.hasMissing ? 'danger' : 'warning'"
            size="small"
          >
            {{ row.isConsistent ? '一致' : row.hasMissing ? '部分缺失' : '内容不一致' }}
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-tooltip content="同步到所有环境" placement="top">
            <el-button 
              type="primary" 
              size="small" 
              :icon="RefreshRight"
              :disabled="!row.devExists" 
              @click="syncIcon(row)"
              :loading="syncLoading[row.path]"
            />
          </el-tooltip>
          
          <el-tooltip content="替换图标" placement="top">
            <el-button 
              type="success" 
              size="small" 
              :icon="Upload"
              @click="openUploadDialog(row)"
            />
          </el-tooltip>
          
          <el-tooltip content="详细信息" placement="top">
            <el-button 
              type="info" 
              size="small" 
              :icon="InfoFilled"
              @click="showIconDetails(row)"
            />
          </el-tooltip>
        </template>
      </el-table-column>
    </el-table>
    
    <!-- 同步结果对话框 -->
    <el-dialog
      v-model="syncResultVisible"
      title="同步结果"
      width="500px"
    >
      <el-result
        :icon="syncSuccess ? 'success' : 'error'"
        :title="syncSuccess ? '同步成功' : '同步失败'"
        :sub-title="syncMessage"
      >
        <template #extra>
          <el-button type="primary" @click="syncResultVisible = false">确定</el-button>
        </template>
      </el-result>
      
      <div v-if="syncDetails.length" class="sync-details">
        <h4>同步详情:</h4>
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in syncDetails"
            :key="index"
            :type="item.success ? 'success' : 'danger'"
            :timestamp="item.timestamp"
          >
            {{ item.message }}
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
    
    <!-- 图标详情对话框 -->
    <el-dialog
      v-model="detailsVisible"
      title="图标详细信息"
      width="600px"
    >
      <div v-if="selectedIcon" class="icon-details">
        <div class="icon-preview">
          <el-image
            :src="getIconUrl(selectedIcon.path)"
            fit="contain"
            style="width: 100px; height: 100px"
          >
            <template #error>
              <div class="image-error large">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>
        
        <el-descriptions :column="1" border>
          <el-descriptions-item label="路径">{{ selectedIcon.path }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ getFileName(selectedIcon.path) }}</el-descriptions-item>
          <el-descriptions-item label="开发环境">
            <div class="detail-item">
              <span>{{ selectedIcon.devExists ? '存在' : '缺失' }}</span>
              <span v-if="selectedIcon.devExists">
                <el-tag size="small">MD5: {{ selectedIcon.devMd5.substring(0, 8) }}</el-tag>
                <el-tag size="small">大小: {{ formatSize(selectedIcon.devSize) }}</el-tag>
              </span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="H5生产环境">
            <div class="detail-item">
              <span>{{ selectedIcon.h5Exists ? '存在' : '缺失' }}</span>
              <span v-if="selectedIcon.h5Exists">
                <el-tag size="small">MD5: {{ selectedIcon.h5Md5.substring(0, 8) }}</el-tag>
                <el-tag size="small">大小: {{ formatSize(selectedIcon.h5Size) }}</el-tag>
              </span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="微信小程序">
            <div class="detail-item">
              <span>{{ selectedIcon.wxExists ? '存在' : '缺失' }}</span>
              <span v-if="selectedIcon.wxExists">
                <el-tag size="small">MD5: {{ selectedIcon.wxMd5.substring(0, 8) }}</el-tag>
                <el-tag size="small">大小: {{ formatSize(selectedIcon.wxSize) }}</el-tag>
              </span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="APP环境">
            <div class="detail-item">
              <span>{{ selectedIcon.appExists ? '存在' : '缺失' }}</span>
              <span v-if="selectedIcon.appExists">
                <el-tag size="small">MD5: {{ selectedIcon.appMd5.substring(0, 8) }}</el-tag>
                <el-tag size="small">大小: {{ formatSize(selectedIcon.appSize) }}</el-tag>
              </span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ selectedIcon.lastUpdated ? formatDate(selectedIcon.lastUpdated) : '未知' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
    
    <!-- 图标上传对话框 -->
    <el-dialog
      v-model="uploadVisible"
      title="上传替换图标"
      width="500px"
    >
      <el-form v-if="selectedIcon" label-position="top">
        <el-form-item label="图标路径">
          <el-input v-model="selectedIcon.path" disabled />
        </el-form-item>
        
        <el-form-item label="当前图标">
          <div class="current-icon-preview">
            <el-image
              :src="getIconUrl(selectedIcon.path)"
              fit="contain"
              style="width: 80px; height: 80px"
            >
              <template #error>
                <div class="image-error">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </div>
        </el-form-item>
        
        <el-form-item label="上传新图标">
          <el-upload
            class="icon-uploader"
            :show-file-list="true"
            :limit="1"
            accept="image/*"
            :auto-upload="false"
            :on-change="handleFileChange"
          >
            <template #trigger>
              <el-button type="primary">选择文件</el-button>
            </template>
            
            <template #tip>
              <div class="el-upload__tip">
                只能上传 JPG/PNG/SVG/WebP 文件，且大小不超过 2MB
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="uploadVisible = false">取消</el-button>
          <el-button type="primary" @click="uploadIcon" :loading="uploadLoading">
            上传并同步到所有环境
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { 
  Refresh, Search, View, Picture, 
  RefreshRight, Upload, InfoFilled, WarningFilled 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { replaceAppIcon } from '@/api/modules/icon'

// 基础URL
const baseUrl = window.location.origin

// 状态和筛选
const loading = ref(false)
const iconsStatus = ref([])
const statusFilter = ref('')
const pathFilter = ref('')

// 同步状态
const syncLoading = reactive({})
const syncResultVisible = ref(false)
const syncSuccess = ref(false)
const syncMessage = ref('')
const syncDetails = ref([])

// 详情对话框
const detailsVisible = ref(false)
const selectedIcon = ref(null)

// 上传对话框
const uploadVisible = ref(false)
const uploadFile = ref(null)
const uploadLoading = ref(false)

// 错误状态
const serverError = ref(false);
const serverErrorMessage = ref('');
const serverErrorDetails = ref('');
const showErrorDetails = ref(false);

// 计算属性：筛选后的图标状态
const filteredIconsStatus = computed(() => {
  return iconsStatus.value.filter(icon => {
    // 路径筛选
    const pathMatch = !pathFilter.value || 
      icon.path.toLowerCase().includes(pathFilter.value.toLowerCase())
    
    // 状态筛选
    let statusMatch = true
    if (statusFilter.value === 'consistent') {
      statusMatch = icon.isConsistent
    } else if (statusFilter.value === 'inconsistent') {
      statusMatch = !icon.isConsistent && !icon.hasMissing
    } else if (statusFilter.value === 'missing') {
      statusMatch = icon.hasMissing
    }
    
    return pathMatch && statusMatch
  })
})

// 计算属性：是否存在不一致的图标
const hasInconsistencies = computed(() => {
  return iconsStatus.value.some(icon => !icon.isConsistent)
})

// 方法：刷新图标状态
async function refreshStatus() {
  loading.value = true;
  let retryCount = 0;
  const maxRetries = 3;
  
  // 重置错误状态
  serverError.value = false;
  serverErrorMessage.value = '';
  serverErrorDetails.value = '';
  
  const fetchWithRetry = async () => {
    try {
      console.log('请求图标状态信息，尝试次数:', retryCount + 1);
      // 通过API获取所有图标状态
      const response = await fetch('/api/admin/icons/status', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        // 增加超时设置
        signal: AbortSignal.timeout(10000) // 10秒超时
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`服务器错误 (${response.status}):`, errorText);
        
        // 设置错误状态用于显示
        if (response.status === 500) {
          serverError.value = true;
          serverErrorMessage.value = `服务器内部错误 (${response.status})`;
          try {
            // 尝试解析JSON错误
            const errorJson = JSON.parse(errorText);
            serverErrorDetails.value = errorJson.message || errorText;
          } catch (e) {
            // 如果不是JSON格式，使用原始文本
            serverErrorDetails.value = errorText;
          }
        }
        
        throw new Error(`服务器错误: ${response.status}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('响应不是JSON格式:', contentType);
        serverError.value = true;
        serverErrorMessage.value = '响应格式错误，不是JSON';
        serverErrorDetails.value = `Content-Type: ${contentType}`;
        throw new Error('响应格式错误，不是JSON');
      }
      
      const data = await response.json();
      
      if (data.success) {
        // 清除错误状态
        serverError.value = false;
        
        iconsStatus.value = (data.data || []).map(icon => ({
          ...icon,
          // 计算一致性
          isConsistent: 
            icon.devExists && icon.h5Exists && icon.wxExists && icon.appExists &&
            icon.devMd5 === icon.h5Md5 && icon.devMd5 === icon.wxMd5 && icon.devMd5 === icon.appMd5,
          // 计算是否有缺失
          hasMissing: 
            !icon.devExists || !icon.h5Exists || !icon.wxExists || !icon.appExists
        }));
        
        ElMessage.success('图标状态刷新成功');
        return true;
      } else {
        serverError.value = true;
        serverErrorMessage.value = data.message || '获取图标状态失败';
        ElMessage.error(data.message || '获取图标状态失败');
        return false;
      }
    } catch (error) {
      console.error('刷新图标状态失败:', error);
      
      if (retryCount < maxRetries) {
        retryCount++;
        ElMessage.warning(`请求失败，正在重试 (${retryCount}/${maxRetries})...`);
        
        // 等待一段时间再重试
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchWithRetry();
      }
      
      // 如果没有设置过错误状态，设置一个通用错误
      if (!serverError.value) {
        serverError.value = true;
        serverErrorMessage.value = error.message || '未知错误';
        serverErrorDetails.value = error.stack || '';
      }
      
      ElMessage.error('刷新图标状态失败: ' + error.message);
      return false;
    }
  };
  
  try {
    await fetchWithRetry();
  } finally {
    loading.value = false;
  }
}

// 方法：同步图标到所有环境
async function syncIcon(icon) {
  if (!icon.devExists) {
    ElMessage.warning('开发环境文件不存在，无法同步');
    return;
  }
  
  try {
    syncLoading[icon.path] = true;
    
    // 确认同步
    await ElMessageBox.confirm(
      `确定要将图标 "${getFileName(icon.path)}" 同步到所有环境吗？`,
      '同步确认',
      {
        confirmButtonText: '确定同步',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    // 清空之前的同步详情
    syncDetails.value = [];
    
    // 添加同步开始记录
    addSyncDetail(true, `开始同步图标: ${icon.path}`);
    
    // 发送同步请求
    let retryCount = 0;
    const maxRetries = 2;
    
    const sendSyncRequest = async () => {
      try {
        console.log(`发送同步请求，尝试次数: ${retryCount + 1}`);
        const response = await fetch('/api/admin/icons/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ path: icon.path }),
          // 增加超时设置
          signal: AbortSignal.timeout(15000) // 15秒超时
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`同步请求错误 (${response.status}):`, errorText);
          addSyncDetail(false, `服务器响应错误: ${response.status}`);
          throw new Error(`同步失败: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('响应不是JSON格式:', contentType);
          addSyncDetail(false, '服务器响应格式错误');
          throw new Error('响应格式错误，不是JSON');
        }
        
        return await response.json();
      } catch (error) {
        console.error('同步请求失败:', error);
        
        if (retryCount < maxRetries) {
          retryCount++;
          addSyncDetail(false, `请求失败，正在重试 (${retryCount}/${maxRetries})...`);
          
          // 等待一段时间再重试
          await new Promise(resolve => setTimeout(resolve, 1000));
          return sendSyncRequest();
        }
        
        throw error;
      }
    };
    
    // 发送同步请求
    const data = await sendSyncRequest();
    
    if (data.success) {
      // 同步成功
      syncSuccess.value = true;
      syncMessage.value = data.message || '图标同步成功';
      
      // 添加同步结果详情
      if (data.details && Array.isArray(data.details)) {
        data.details.forEach(detail => {
          addSyncDetail(detail.success, detail.message);
        });
      }
      
      // 刷新状态
      await refreshStatus();
    } else {
      // 同步失败
      syncSuccess.value = false;
      syncMessage.value = data.message || '图标同步失败';
      
      // 添加错误详情
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach(error => {
          addSyncDetail(false, error.message || '未知错误');
        });
      }
    }
    
    // 显示结果对话框
    syncResultVisible.value = true;
  } catch (error) {
    // 捕获取消确认的情况
    if (error === 'cancel' || error.message === 'cancel') {
      return;
    }
    
    console.error('同步图标失败:', error);
    ElMessage.error('同步图标失败: ' + error.message);
    
    // 添加失败详情
    addSyncDetail(false, `同步过程出错: ${error.message}`);
    
    // 显示结果对话框，但标记为失败
    syncSuccess.value = false;
    syncMessage.value = '同步过程出错';
    syncResultVisible.value = true;
  } finally {
    syncLoading[icon.path] = false;
  }
}

// 添加同步详情记录
function addSyncDetail(success, message) {
  syncDetails.value.push({
    success,
    message,
    timestamp: new Date().toLocaleTimeString()
  })
}

// 查看图标详情
function showIconDetails(icon) {
  selectedIcon.value = icon
  detailsVisible.value = true
}

// 打开上传对话框
function openUploadDialog(icon) {
  selectedIcon.value = icon
  uploadFile.value = null
  uploadVisible.value = true
}

// 文件选择改变
function handleFileChange(file) {
  if (file) {
    // 验证文件类型
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!acceptedTypes.includes(file.raw.type)) {
      ElMessage.error('只能上传JPG/PNG/SVG/WebP格式的图片')
      return false
    }
    
    // 验证文件大小 (2MB限制)
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      ElMessage.error('图片大小不能超过2MB')
      return false
    }
    
    uploadFile.value = file.raw
    return true
  }
  return false
}

// 上传图标
async function uploadIcon() {
  if (!uploadFile.value) {
    ElMessage.warning('请先选择图标文件')
    return
  }
  
  if (!selectedIcon.value || !selectedIcon.value.path) {
    ElMessage.error('没有选择要替换的图标')
    return
  }
  
  uploadLoading.value = true
  
  try {
    // 调用API上传图标
    const response = await replaceAppIcon(uploadFile.value, {
      path: selectedIcon.value.path,
      location: getFileName(selectedIcon.value.path)
    })
    
    if (response && response.success) {
      ElMessage.success('图标替换成功')
      uploadVisible.value = false
      
      // 延迟刷新，确保服务器已处理
      setTimeout(() => refreshStatus(), 1000)
    } else {
      ElMessage.error(response?.message || '替换图标失败')
    }
  } catch (error) {
    console.error('上传图标失败:', error)
    ElMessage.error('上传图标失败: ' + (error.message || '未知错误'))
  } finally {
    uploadLoading.value = false
  }
}

// 工具方法：获取文件名
function getFileName(path) {
  if (!path) return ''
  return path.split('/').pop()
}

// 工具方法：格式化文件大小
function formatSize(bytes) {
  if (bytes === 0 || !bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

// 工具方法：格式化日期
function formatDate(timestamp) {
  if (!timestamp) return '未知'
  
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 获取带时间戳的图标URL，防止缓存
function getIconUrl(path) {
  if (!path) return '';
  
  // 添加时间戳
  const timestamp = Date.now();
  return `${baseUrl}${path}?t=${timestamp}`;
}

// 生命周期钩子：组件挂载后加载数据
onMounted(() => {
  refreshStatus()
})
</script>

<style scoped>
.icon-status-monitor {
  margin: 20px 0;
}

.monitor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.status-filters {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

.status-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.image-error {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 30px;
  height: 30px;
  background-color: #f5f7fa;
  border: 1px dashed #d9d9d9;
}

.image-error.large {
  width: 100px;
  height: 100px;
}

.sync-details {
  margin-top: 20px;
  max-height: 200px;
  overflow-y: auto;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}

.icon-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.icon-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 10px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-icon-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.icon-uploader {
  width: 100%;
}

.error-details {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border: 1px dashed #d9d9d9;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.error-details pre {
  margin: 0;
  font-family: monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style> 