<template>
  <view class="container">
    <view class="header">
      <view class="back-btn" @tap="goBack">
        <text class="icon">←</text>
      </view>
      <text class="title">宠物识别分析</text>
    </view>
    
    <view class="content">
      <!-- 提示信息 -->
      <view class="tips-section">
        <text class="tips-title">请上传您宠物的多角度照片</text>
        <text class="tips-desc">为了更准确分析，建议上传正面、侧面及特写照片</text>
      </view>
      
      <!-- 图片上传区域 -->
      <view class="upload-section">
        <view class="image-list">
          <view 
            v-for="(item, index) in imageList" 
            :key="index" 
            class="image-item"
          >
            <image 
              :src="item.path" 
              mode="aspectFill" 
              class="pet-image"
            ></image>
            <view class="delete-btn" @tap="deleteImage(index)">
              <text class="delete-icon">×</text>
            </view>
          </view>
          
          <!-- 添加图片按钮 -->
          <view 
            class="add-image-btn" 
            @tap="chooseImage"
            v-if="imageList.length < maxImageCount"
          >
            <text class="add-icon">+</text>
            <text class="add-text">添加照片</text>
          </view>
        </view>
      </view>
      
      <!-- 识别按钮 -->
      <view 
        class="analyze-btn"
        :class="{ 'active': imageList.length > 0 }"
        @tap="analyzeImages"
      >
        <text>{{ isAnalyzing ? '分析中...' : '开始识别' }}</text>
      </view>
      
      <!-- 分析结果展示 -->
      <view class="result-section" v-if="showResult">
        <view class="result-header">
          <text class="result-title">识别结果</text>
        </view>
        
        <view class="result-content">
          <!-- 宠物品种 -->
          <view class="result-item">
            <text class="item-label">品种:</text>
            <text class="item-value">{{ result.breed }}</text>
            <text class="confidence">(置信度: {{ result.breedConfidence }}%)</text>
          </view>
          
          <!-- 血统评估 -->
          <view class="result-item">
            <text class="item-label">血统纯度评估:</text>
            <text class="item-value">{{ result.purity }}</text>
          </view>
          
          <!-- 特征描述 -->
          <view class="result-item features">
            <text class="item-label">特征描述:</text>
            <text class="item-value">{{ result.features }}</text>
          </view>
          
          <!-- 其他特性 -->
          <view class="characteristics">
            <view 
              v-for="(value, key) in result.characteristics" 
              :key="key"
              class="char-item"
            >
              <text class="char-label">{{ formatCharName(key) }}:</text>
              <view class="char-value-bar">
                <view 
                  class="char-value-fill"
                  :style="{ width: value + '%' }"
                ></view>
              </view>
              <text class="char-percent">{{ value }}%</text>
            </view>
          </view>
          
          <!-- 附加说明 -->
          <view class="result-note" v-if="result.note">
            <text class="note-title">附加说明:</text>
            <text class="note-content">{{ result.note }}</text>
          </view>
        </view>
        
        <!-- 分享和保存按钮 -->
        <view class="action-buttons">
          <view class="action-btn share" @tap="shareResult">
            <text>分享结果</text>
          </view>
          <view class="action-btn save" @tap="saveResult">
            <text>保存至相册</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue';
import { useUserStore } from '@/store/user.js';
import { analyzePetImages } from '@/utils/petAnalysisService.js';

export default {
  setup() {
    const userStore = useUserStore();
    const userId = ref(userStore.userInfo?.id || '');
    
    // 图片列表
    const imageList = ref([]);
    const maxImageCount = 4;
    const isAnalyzing = ref(false);
    const showResult = ref(false);
    
    // 识别结果
    const result = ref({
      breed: '',
      englishName: '',
      breedConfidence: 0,
      purity: '',
      features: '',
      characteristics: {
        friendliness: 0,
        activity: 0,
        trainability: 0,
        grooming: 0
      },
      note: '',
      petType: '',
      identified: true,
      message: ''
    });
    
    // 选择图片
    const chooseImage = () => {
      // 直接调用选择图片API，不使用setTimeout
      uni.chooseImage({
        count: maxImageCount - imageList.value.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          // 处理选择的图片
          const tempFiles = res.tempFiles.map(file => ({
            path: file.path,
            size: file.size,
            uploaded: false
          }));
          
          imageList.value = [...imageList.value, ...tempFiles];
        },
        fail: (err) => {
          // 用户取消选择不显示错误
          if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
            console.log('用户取消选择图片');
            return;
          }
          
          console.error('选择图片失败:', err);
          uni.showToast({
            title: '选择图片失败',
            icon: 'none'
          });
        }
      });
    };
    
    // 删除图片
    const deleteImage = (index) => {
      imageList.value.splice(index, 1);
      // 如果删除所有图片，隐藏结果
      if (imageList.value.length === 0) {
        showResult.value = false;
      }
    };
    
    // 分析图片
    const analyzeImages = async () => {
      if (imageList.value.length === 0) {
        uni.showToast({
          title: '请先上传宠物照片',
          icon: 'none'
        });
        return;
      }
      
      isAnalyzing.value = true;
      showResult.value = false;
      
      try {
        // 显示加载提示
        uni.showLoading({
          title: '正在分析图片...',
          mask: true
        });
        
        // 获取图片路径
        const imagePaths = imageList.value.map(img => img.path);
        
        // 使用前端服务分析图片
        const analysisResult = await analyzePetImages(imagePaths);
        
        // 关闭加载提示
        uni.hideLoading();
        
        // 如果识别失败，显示提示
        if (analysisResult.identified === false) {
          uni.showToast({
            title: analysisResult.message || '无法识别，请尝试清晰的宠物照片',
            icon: 'none',
            duration: 3000
          });
          
          // 更新结果对象，但不显示结果区域
          result.value = {
            ...analysisResult,
            breed: '未能识别',
            breedConfidence: 0,
            purity: '未知',
            characteristics: {
              friendliness: 0,
              activity: 0,
              trainability: 0,
              grooming: 0
            }
          };
        } else {
          // 处理识别结果并显示
          processResult(analysisResult);
          showResult.value = true;
        }
      } catch (error) {
        console.error('分析失败:', error);
        uni.hideLoading();
        uni.showToast({
          title: error.message || '分析失败，请重试',
          icon: 'none',
          duration: 3000
        });
      } finally {
        isAnalyzing.value = false;
      }
    };
    
    // 处理分析结果
    const processResult = (apiResult) => {
      // 格式化并保存分析结果
      result.value = {
        identified: apiResult.identified !== false,
        message: apiResult.message || '',
        breed: apiResult.breed || '未识别',
        englishName: apiResult.englishName || '',
        breedConfidence: apiResult.breedConfidence || 0,
        purity: apiResult.purity || '未识别',
        features: apiResult.features || '无法获取特征描述',
        characteristics: apiResult.characteristics || {
          friendliness: 0,
          activity: 0,
          trainability: 0,
          grooming: 0
        },
        note: apiResult.note || '',
        petType: apiResult.petType || 'unknown'
      };
      
      // 保存分析历史
      if (result.value.identified) {
        saveAnalysisHistory(result.value);
      }
    };
    
    // 保存分析历史到本地
    const saveAnalysisHistory = (analysisResult) => {
      try {
        // 从本地存储获取历史记录
        const historyJson = uni.getStorageSync('petAnalysisHistory') || '[]';
        const history = JSON.parse(historyJson);
        
        // 添加新记录
        history.unshift({
          id: 'history-' + Date.now(),
          timestamp: Date.now(),
          result: analysisResult,
          images: imageList.value.map(img => img.path)
        });
        
        // 限制历史记录数量
        const MAX_HISTORY = 10;
        if (history.length > MAX_HISTORY) {
          history.splice(MAX_HISTORY);
        }
        
        // 保存回本地存储
        uni.setStorageSync('petAnalysisHistory', JSON.stringify(history));
      } catch (error) {
        console.error('保存分析历史失败:', error);
      }
    };
    
    // 格式化特性名称
    const formatCharName = (key) => {
      const nameMap = {
        friendliness: '友善度',
        activity: '活跃度',
        trainability: '可训练性',
        grooming: '毛发护理需求'
      };
      
      return nameMap[key] || key;
    };
    
    // 分享结果
    const shareResult = () => {
      if (!showResult.value) {
        uni.showToast({
          title: '暂无结果可分享',
          icon: 'none'
        });
        return;
      }
      
      try {
        // 获取分享文本
        const shareText = `我的宠物是${result.value.breed}(${result.value.englishName})，${result.value.purity}，${result.value.features}`;
        
        // 根据平台选择不同的分享方式
        // #ifdef APP-PLUS
        // App环境下使用uni.share
        uni.share({
          provider: 'weixin',
          scene: 'WXSceneSession',
          type: 0,
          title: `宠物识别结果：${result.value.breed}`,
          summary: shareText.substring(0, 80) + '...',
          imageUrl: imageList.value.length > 0 ? imageList.value[0].path : '',
          success: (res) => {
            console.log('分享成功:', res);
          },
          fail: (err) => {
            console.error('分享失败:', err);
            // 分享失败时复制到剪贴板
            copyToClipboard(shareText);
          }
        });
        // #endif
        
        // #ifdef H5 || MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO
        // H5和小程序环境
        copyToClipboard(shareText);
        // #endif
      } catch (error) {
        console.error('分享处理异常:', error);
        // 出现异常时也复制到剪贴板
        copyToClipboard(`我的宠物是${result.value.breed}，${result.value.purity}`);
      }
    };
    
    // 复制到剪贴板的方法
    const copyToClipboard = (text) => {
      uni.setClipboardData({
        data: text,
        success: () => {
          uni.showToast({
            title: '分享内容已复制到剪贴板',
            icon: 'none',
            duration: 2000
          });
        }
      });
    };
    
    // 保存结果
    const saveResult = () => {
      // 实际项目中应导出结果图片并保存
      uni.showToast({
        title: '正在生成图片...',
        icon: 'none'
      });
      
      // 这里应该实现生成结果图片并保存功能
      setTimeout(() => {
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        });
      }, 2000);
    };
    
    // 返回上一页
    const goBack = () => {
      uni.navigateBack();
    };
    
    return {
      imageList,
      maxImageCount,
      isAnalyzing,
      showResult,
      result,
      chooseImage,
      deleteImage,
      analyzeImages,
      formatCharName,
      shareResult,
      saveResult,
      goBack
    };
  }
};
</script>

<style>
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f8f8;
}

.header {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background-color: #fff;
  position: relative;
}

.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.back-btn .icon {
  font-size: 40rpx;
  color: #333;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-right: 60rpx; /* 平衡左侧返回按钮 */
}

.content {
  flex: 1;
  padding: 30rpx;
}

.tips-section {
  margin-bottom: 40rpx;
}

.tips-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
  display: block;
}

.tips-desc {
  font-size: 28rpx;
  color: #666;
  display: block;
}

.upload-section {
  margin-bottom: 40rpx;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}

.image-item {
  width: 160rpx;
  height: 160rpx;
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
}

.pet-image {
  width: 100%;
  height: 100%;
}

.delete-btn {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  background-color: rgba(0, 0, 0, 0.5);
  border-radius: 20rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

.delete-icon {
  color: #fff;
  font-size: 28rpx;
}

.add-image-btn {
  width: 160rpx;
  height: 160rpx;
  background-color: #f2f2f2;
  border: 1px dashed #ccc;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.add-icon {
  font-size: 40rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.add-text {
  font-size: 24rpx;
  color: #999;
}

.analyze-btn {
  background-color: #cccccc;
  height: 90rpx;
  border-radius: 45rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 40rpx;
}

.analyze-btn.active {
  background-color: #3B9E82;
}

.analyze-btn text {
  font-size: 32rpx;
  color: #fff;
  font-weight: bold;
}

.result-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.result-header {
  margin-bottom: 30rpx;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 20rpx;
}

.result-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
}

.result-content {
  margin-bottom: a0rpx;
}

.result-item {
  margin-bottom: 30rpx;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
}

.item-label {
  font-size: 28rpx;
  color: #666;
  margin-right: 20rpx;
  min-width: 120rpx;
}

.item-value {
  font-size: 30rpx;
  color: #333;
  font-weight: bold;
}

.confidence {
  font-size: 24rpx;
  color: #999;
  margin-left: 10rpx;
}

.features {
  display: block;
}

.features .item-label {
  margin-bottom: 10rpx;
  display: block;
}

.features .item-value {
  font-weight: normal;
  line-height: 1.5;
  display: block;
}

.characteristics {
  margin-top: 20rpx;
  margin-bottom: 30rpx;
}

.char-item {
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}

.char-label {
  font-size: 28rpx;
  color: #666;
  width: 200rpx;
}

.char-value-bar {
  flex: 1;
  height: 20rpx;
  background-color: #f0f0f0;
  border-radius: 10rpx;
  overflow: hidden;
  margin-right: 20rpx;
}

.char-value-fill {
  height: 100%;
  background-color: #3B9E82;
  border-radius: 10rpx;
}

.char-percent {
  font-size: 24rpx;
  color: #999;
  width: 60rpx;
  text-align: right;
}

.result-note {
  background-color: #f9f9f9;
  padding: 20rpx;
  border-radius: 12rpx;
  margin-top: 30rpx;
}

.note-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
  display: block;
}

.note-content {
  font-size: 28rpx;
  color: #333;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  margin-top: 40rpx;
}

.action-btn {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 10rpx;
}

.action-btn text {
  font-size: 28rpx;
  color: #fff;
}

.share {
  background-color: #FF7F50;
}

.save {
  background-color: #3B9E82;
}
</style> 