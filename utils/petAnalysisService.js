/**
 * 宠物识别服务 - 使用Hugging Face API实现
 * 基于预训练视觉模型进行宠物品种识别
 */

// 禁用预设的品种数据库 - 使用API返回的实时数据
const DOG_BREEDS = [];
const CAT_BREEDS = [];

/**
 * API配置对象
 * @type {Object}
 */
const API_CONFIG = {
  // 使用相对路径，通过Vite代理转发到后端
  apiUrl: '/api/pet-recognition',
  
  // 识别置信度阈值
  confidenceThreshold: 0.3 // 降低阈值以接受更多API返回的结果
};

/**
 * 将图片转换为Base64格式
 * @param {string} imagePath - 图片路径
 * @returns {Promise<string>} Base64编码的图片数据
 */
const imageToBase64 = (imagePath) => {
  return new Promise((resolve, reject) => {
    // 如果是blob URL，直接获取blob对象
    if (imagePath.startsWith('blob:')) {
      try {
        fetch(imagePath)
          .then(response => response.blob())
          .then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(blob);
          })
          .catch(error => reject(new Error(`Blob URL处理失败: ${error.message || error}`)));
      } catch (error) {
        reject(new Error(`Blob处理失败: ${error.message || error}`));
      }
      return;
    }

    // 检测环境并相应处理
    if (typeof uni !== 'undefined' && typeof uni.getFileSystemManager === 'function') {
      try {
        const fileManager = uni.getFileSystemManager();
        fileManager.readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: (res) => {
            resolve(res.data);
          },
          fail: (err) => {
            reject(new Error(`读取文件失败: ${err.errMsg || JSON.stringify(err)}`));
          }
        });
      } catch (error) {
        reject(new Error(`文件操作错误: ${error.message || error}`));
      }
    } else {
      // H5环境下，处理本地或HTTP图片URL
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', imagePath, true);
        xhr.responseType = 'blob';
        xhr.onload = function() {
          if (this.status === 200) {
            const reader = new FileReader();
            reader.onloadend = function() {
              // 格式为 data:image/jpeg;base64,/9j/4AAQ... 需要提取base64部分
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.readAsDataURL(this.response);
          } else {
            reject(new Error(`加载图片失败，状态码: ${this.status}`));
          }
        };
        xhr.onerror = function() {
          reject(new Error('网络请求图片失败'));
        };
        xhr.send();
      } catch (error) {
        reject(new Error(`H5环境处理图片失败: ${error.message || error}`));
      }
    }
  });
};

/**
 * 使用Hugging Face API识别图像
 * @param {string} base64Image - Base64编码的图像
 * @returns {Promise<Array>} 识别结果数组
 */
async function recognizeWithHuggingFace(base64Image) {
  try {
    console.log('正在调用后端API进行图像识别...');
    
    // 确保图像数据有正确的前缀
    const formattedBase64 = base64Image.startsWith('data:image')
      ? base64Image
      : `data:image/jpeg;base64,${base64Image}`;
    
    // 尝试压缩图像数据以减小请求大小
    let optimizedImageData = await optimizeImageForAPI(formattedBase64);
    
    // 构建API请求 - 请求发送到我们的后端代理
    const response = await fetch(API_CONFIG.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageData: optimizedImageData
      })
    });
    
    // 检查HTTP状态
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // 处理特定错误情况
      if (response.status === 503 && errorData.error?.includes('加载中')) {
        throw new Error('AI模型正在加载中，请稍后再试');
      }
      
      throw new Error(`后端API返回错误: ${response.status} ${response.statusText} - ${errorData.error || ''}`);
    }
    
    // 解析响应内容
    const predictions = await response.json();
    
    // 打印原始返回数据便于调试
    console.log('API原始返回数据:', JSON.stringify(predictions).substring(0, 200));
    
    // 检查返回的数据格式
    if (Array.isArray(predictions)) {
      console.log('API返回了有效的预测结果数组:', predictions.length);
      return predictions;
    } else if (predictions && typeof predictions === 'object') {
      // 某些模型可能返回不同格式的数据
      console.log('API返回了非数组格式的结果:', predictions);
      
      // 尝试解析不同的响应格式
      if (predictions.hasOwnProperty('label') && predictions.hasOwnProperty('score')) {
        // 单一预测结果
        return [predictions];
      } else if (predictions.hasOwnProperty('labels') && predictions.hasOwnProperty('scores')) {
        // 多个预测结果，但是数组格式
        const { labels, scores } = predictions;
        return labels.map((label, index) => ({
          label,
          score: scores[index]
        }));
      }
    }
    
    console.warn('API返回的数据格式不符合预期:', predictions);
    throw new Error('API返回的数据格式不符合预期');
  } catch (error) {
    console.error('后端API调用失败:', error);
    throw error;
  }
}

/**
 * 优化图像大小以适应API请求
 * @param {string} imageData - 原始图像数据 (data URL格式)
 * @returns {Promise<string>} 压缩后的图像数据
 */
async function optimizeImageForAPI(imageData) {
  return new Promise((resolve, reject) => {
    try {
      // 创建图像对象
      const img = new Image();
      img.onload = function() {
        try {
          // 创建canvas并调整大小
          const canvas = document.createElement('canvas');
          // 最大尺寸为800px（可以根据需要调整）
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;
          
          // 计算缩放比例
          if (width > height && width > MAX_SIZE) {
            height = Math.round(height * (MAX_SIZE / width));
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round(width * (MAX_SIZE / height));
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // 在canvas上绘制调整后的图像
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // 以较低质量导出为JPEG
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
          
          // 输出压缩比
          const originalSize = imageData.length;
          const optimizedSize = optimizedDataUrl.length;
          console.log(`图像优化: 原始大小 ${Math.round(originalSize/1024)}KB, 压缩后 ${Math.round(optimizedSize/1024)}KB, 压缩率 ${Math.round((1 - optimizedSize/originalSize) * 100)}%`);
          
          resolve(optimizedDataUrl);
        } catch (err) {
          console.error('压缩图像失败:', err);
          // 失败时返回原始图像
          resolve(imageData);
        }
      };
      
      img.onerror = function() {
        console.error('加载图像到Image对象失败');
        // 失败时返回原始图像
        resolve(imageData);
      };
      
      // 设置图像源
      img.src = imageData;
    } catch (err) {
      console.error('图像优化过程出错:', err);
      // 任何错误发生时，返回原始图像
      resolve(imageData);
    }
  });
}

/**
 * 确定识别结果中的宠物类型 - 已弃用，仅保留接口兼容性
 * @param {Array} predictions - API返回的预测结果
 * @returns {Object} 宠物类型判断
 */
const determinePetType = (predictions) => {
  console.warn('determinePetType已弃用，直接使用API返回的品种信息');
  
  // 始终返回狗，实际类型将由API结果决定
  return {
    isPet: true,
    petType: 'dog',
    confidence: 0.99,
    source: 'API预测'
  };
};

// 可能的动物相关标签
const animalLikeLabels = [
  'mammal', 'vertebrate', 'carnivore', 'domestic', 'fur', 'pet', 
  'animal', 'canine', 'feline', 'breed'
];

/**
 * 匹配品种与我们的数据库
 * @param {Array} predictions - API预测结果
 * @param {string} petType - 宠物类型 ('cat'或'dog')
 * @returns {Object} 匹配的品种信息
 */
const matchBreedToDatabase = (predictions, petType) => {
  // 禁止使用预设的品种数据库，直接使用API返回的数据
  console.log('直接使用API返回的品种数据，不使用本地品种库');
  
  // 如果没有预测结果，直接返回null
  if (!predictions || predictions.length === 0) {
    console.log('没有接收到有效的预测结果');
    return null;
  }
  
  // 按置信度排序所有预测结果
  const sortedPredictions = [...predictions].sort((a, b) => {
    const scoreA = parseFloat(a.score || a.confidence || 0);
    const scoreB = parseFloat(b.score || b.confidence || 0);
    return scoreB - scoreA;
  });
  
  console.log('排序后的预测结果:', sortedPredictions);
  
  // 获取置信度最高的结果(忽略通用标签如"dog"/"cat")
  const validPredictions = sortedPredictions.filter(p => 
    p.label !== 'dog' && p.label !== 'cat' && 
    p.label !== 'canine' && p.label !== 'pet' &&
    parseFloat(p.score || p.confidence || 0) > API_CONFIG.confidenceThreshold
  );
  
  if (validPredictions.length === 0) {
    console.log('没有有效的品种预测结果');
    return null;
  }
  
  // 使用最高置信度的品种
  const topPrediction = validPredictions[0];
  console.log('使用最高置信度的品种:', topPrediction.label, '置信度:', topPrediction.score);
  
  // 提取百科信息(如果有)
  let description = '';
  let baikeUrl = '';
  
  if (topPrediction.additional_info) {
    description = topPrediction.additional_info.description || '';
    baikeUrl = topPrediction.additional_info.baike_url || '';
    console.log('包含百科信息', baikeUrl ? '有链接' : '无链接');
  }
  
  // 针对不同预测结果设置默认特征
  let features = description;
  if (!features) {
    features = `${topPrediction.label}的外观特征`;
  } else if (features.length > 100) {
    // 截取一部分作为特征描述
    features = features.substring(0, 100) + '...';
  }
  
  // 从描述中提取护理信息(如果描述足够长)
  let careNote = '';
  if (description && description.length > 150) {
    careNote = description.substring(100, 250) + '...';
  } else {
    careNote = '具体护理方法请参考专业养宠指南';
  }
  
  // 从描述中提取英文名(如果有)
  let englishName = '';
  if (description && description.includes('英文名')) {
    const match = description.match(/英文名[：:]\s*([^，。,]+)/);
    if (match && match[1]) {
      englishName = match[1].trim();
    }
  }
  
  // 创建基于API返回结果的动态品种
  const dynamicBreed = {
    name: topPrediction.label,
    englishName: englishName || topPrediction.label, // 默认使用中文名
    characteristics: {
      // 根据描述内容生成默认特性值
      friendliness: description.includes('友好') || description.includes('友善') ? 85 : 75,
      activity: description.includes('活泼') || description.includes('运动') ? 80 : 70,
      trainability: description.includes('聪明') || description.includes('智能') ? 85 : 75,
      grooming: description.includes('毛发') || description.includes('护理') ? 80 : 60
    },
    features: features,
    careNote: careNote,
    baikeUrl: baikeUrl,
    originalScore: parseFloat(topPrediction.score || topPrediction.confidence || 0),
    apiData: topPrediction  // 保存原始API数据
  };
  
  console.log('创建动态品种:', dynamicBreed.name);
  
  return {
    breed: dynamicBreed,
    confidence: parseFloat(topPrediction.score || topPrediction.confidence || 0),
    matchScore: parseFloat(topPrediction.score || topPrediction.confidence || 0),
    source: '百度AI识别',
    isDynamicBreed: true,
    originalLabel: topPrediction.label,
    apiData: topPrediction  // 保存原始API数据便于调试
  };
};

/**
 * 分析宠物图片
 * @param {Array<String>} imagePaths - 图片路径数组
 * @returns {Promise<Object>} 分析结果
 */
export const analyzePetImages = async (imagePaths) => {
  if (!imagePaths || imagePaths.length === 0) {
    throw new Error('需要提供至少一张图片');
  }
  
  try {
    console.log('开始分析宠物图片:', imagePaths);
    
    // 处理所有上传的图片
    const analysisResults = [];
    
    for (const imagePath of imagePaths) {
      try {
        // 转换图片为Base64
        console.log(`处理图片: ${imagePath}`);
        const base64Image = await imageToBase64(imagePath);
        console.log(`图片转换为Base64完成，长度: ${base64Image.length}`);
        
        // 调用API进行识别
        console.log('准备调用API识别...');
        const apiResponse = await recognizeWithHuggingFace(base64Image);
        console.log('API识别完成，原始响应:', JSON.stringify(apiResponse).substring(0, 200));
        
        // 如果API返回有效的预测结果
        if (Array.isArray(apiResponse) && apiResponse.length > 0) {
          console.log(`收到${apiResponse.length}个预测结果`);
          
          // 直接使用API的结果，创建动态品种
          const breedResult = matchBreedToDatabase(apiResponse, 'dog'); // 默认dog，函数内部会判断
          
          if (breedResult) {
            console.log('成功创建品种信息:', breedResult.breed.name);
            analysisResults.push({
              imagePath,
              petType: 'dog', // 默认dog，可根据API结果调整
              breed: breedResult.breed,
              confidence: breedResult.confidence,
              source: breedResult.source,
              originalResponse: apiResponse // 保存原始API响应
            });
          } else {
            console.log('无法从API结果创建品种信息');
            analysisResults.push({
              imagePath,
              identified: false,
              message: '无法识别宠物品种，请提供更清晰的照片',
              originalResponse: apiResponse // 保存原始API响应
            });
          }
        } else {
          console.warn('API未返回有效结果结构:', apiResponse);
          analysisResults.push({
            imagePath,
            identified: false,
            message: '分析结果不明确，请提供更清晰的照片',
            apiError: typeof apiResponse === 'object' ? JSON.stringify(apiResponse) : String(apiResponse)
          });
        }
      } catch (imageError) {
        console.error(`分析图片 ${imagePath} 失败:`, imageError);
        analysisResults.push({
          imagePath,
          identified: false,
          message: `图片处理失败: ${imageError.message}`,
          error: imageError.message
        });
      }
    }
    
    // 找出最佳分析结果
    console.log('所有分析结果:', JSON.stringify(analysisResults, null, 2));
    
    // 优先选择有效的识别结果
    const validResults = analysisResults.filter(result => result.breed);
    console.log(`有${validResults.length}个有效识别结果`);
    
    if (validResults.length > 0) {
      // 从有效结果中选择置信度最高的
      const bestResult = validResults.reduce((best, current) => 
        parseFloat(current.confidence) > parseFloat(best.confidence) ? current : best, validResults[0]);
      console.log('选择置信度最高的结果:', bestResult.breed.name);
      
      // 构建最终结果
      const { breed } = bestResult;
      const result = {
        identified: true,
        breed: breed.name, // 品种中文名
        breedConfidence: Math.round(parseFloat(bestResult.confidence) * 100),
        features: breed.features || '暂无特征描述',
        characteristics: breed.characteristics || {
          friendliness: 75,
          activity: 70,
          trainability: 70, 
          grooming: 60
        },
        note: breed.careNote || '暂无护理建议',
        recognitionSource: bestResult.source || 'API识别',
        petType: bestResult.petType || 'dog'
      };
      
      // 如果有英文名，添加到结果中
      if (breed.englishName) {
        result.englishName = breed.englishName;
      }
      
      // 如果有百科链接，添加到结果中
      if (breed.baikeUrl) {
        result.baikeUrl = breed.baikeUrl;
      }
      
      // 添加纯种评估
      result.purity = parseFloat(bestResult.confidence) > 0.75 ? '纯种' : '混合';
      
      // 添加原始API响应用于调试
      result._debug = {
        originalResponse: bestResult.originalResponse
      };
      
      console.log('返回最终结果:', JSON.stringify(result, null, 2));
      return result;
    } else {
      // 未能识别出有效结果
      const errorResult = {
        identified: false,
        message: '无法识别宠物品种，请提供更清晰的照片'
      };
      
      // 如果有原始响应，添加到调试信息中
      if (analysisResults.length > 0 && analysisResults[0].originalResponse) {
        errorResult._debug = {
          originalResponse: analysisResults[0].originalResponse
        };
      }
      
      console.log('返回错误结果:', JSON.stringify(errorResult, null, 2));
      return errorResult;
    }
  } catch (error) {
    console.error('分析宠物图片失败:', error);
    throw new Error(`图像分析失败: ${error.message}`);
  }
};

export default {
  analyzePetImages
}; 