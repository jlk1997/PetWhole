/**
 * 网络状态管理工具
 * 负责检测网络状态变化并通知应用
 */
import { ref, reactive } from 'vue';

class NetworkManager {
  constructor() {
    // 网络状态
    this.status = reactive({
      isConnected: true,
      networkType: 'unknown',
      lastChecked: Date.now()
    });
    
    // 监听器列表
    this.listeners = [];
    
    // 初始化时检查网络
    this.checkNetworkStatus();
    
    // 设置监听器
    this.setupListeners();
  }
  
  /**
   * 设置网络状态监听器
   */
  setupListeners() {
    // 监听网络状态变化
    uni.onNetworkStatusChange(res => {
      this.handleNetworkChange(res);
    });
    
    // 定期检查网络状态（每30秒）
    setInterval(() => {
      this.checkNetworkStatus();
    }, 30000);
  }
  
  /**
   * 主动检查网络状态
   * @returns {Promise<Object>} 网络状态对象
   */
  checkNetworkStatus() {
    return new Promise((resolve) => {
      uni.getNetworkType({
        success: (res) => {
          this.handleNetworkChange(res);
          resolve(this.status);
        },
        fail: () => {
          // 检查失败假定网络断开
          this.handleNetworkChange({ isConnected: false, networkType: 'none' });
          resolve(this.status);
        }
      });
    });
  }
  
  /**
   * 处理网络状态变化
   * @param {Object} res - 网络状态对象
   */
  handleNetworkChange(res) {
    const previousState = this.status.isConnected;
    
    // 更新状态
    this.status.isConnected = res.isConnected !== undefined ? res.isConnected : (res.networkType !== 'none');
    this.status.networkType = res.networkType || 'unknown';
    this.status.lastChecked = Date.now();
    
    console.log(`网络状态变化: ${this.status.isConnected ? '在线' : '离线'}, 类型: ${this.status.networkType}`);
    
    // 触发全局事件
    uni.$emit('network:status-change', { ...this.status });
    
    // 通知所有监听器
    this.notifyListeners();
    
    // 网络恢复时执行的操作
    if (!previousState && this.status.isConnected) {
      console.log('网络已恢复连接');
      uni.$emit('network:reconnected', { ...this.status });
    }
    
    // 网络断开时执行的操作
    if (previousState && !this.status.isConnected) {
      console.log('网络已断开连接');
      uni.$emit('network:disconnected', { ...this.status });
      
      // 网络断开时显示提示
      uni.showToast({
        title: '网络已断开，请检查网络连接',
        icon: 'none',
        duration: 2000
      });
    }
  }
  
  /**
   * 添加状态变化监听器
   * @param {Function} callback - 回调函数，接收网络状态对象
   * @returns {Function} - 用于移除监听器的函数
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      console.error('网络状态监听器必须是函数');
      return () => {};
    }
    
    this.listeners.push(callback);
    
    // 立即通知当前状态
    callback({ ...this.status });
    
    // 返回移除监听器的函数
    return () => {
      this.removeListener(callback);
    };
  }
  
  /**
   * 移除状态变化监听器
   * @param {Function} callback - 要移除的回调函数
   */
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }
  
  /**
   * 通知所有监听器
   */
  notifyListeners() {
    const statusCopy = { ...this.status };
    this.listeners.forEach(callback => {
      try {
        callback(statusCopy);
      } catch (error) {
        console.error('网络状态监听器回调错误:', error);
      }
    });
  }
  
  /**
   * 获取当前网络状态
   * @returns {Object} - 网络状态对象
   */
  getStatus() {
    return { ...this.status };
  }
  
  /**
   * 判断是否有网络连接
   * @returns {Boolean} - 是否有网络连接
   */
  isOnline() {
    return this.status.isConnected;
  }
  
  /**
   * 网络状态是否良好（WIFI或4G/5G）
   * @returns {Boolean} - 网络状态是否良好
   */
  isGoodConnection() {
    if (!this.status.isConnected) return false;
    
    return (
      this.status.networkType === 'wifi' || 
      this.status.networkType === '4g' || 
      this.status.networkType === '5g'
    );
  }
}

// 创建单例实例
const networkManager = new NetworkManager();

export default networkManager; 