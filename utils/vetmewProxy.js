import { generateSignature, generateBasicSignature } from './vetmew.js';

/**
 * 调用汪喵灵灵API (通过Vite代理服务器)
 * 
 * @param {Object} requestData - 请求数据
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} - 返回响应数据
 */
export async function callVetmewAPI(requestData, options = {}) {
  const apiKey = options.apiKey || 'vmb1c7f72adc9473f7';
  const apiSecret = options.apiSecret || '44yth8axrytm8ux23f53c78bjw3kg20h';
  const apiPath = options.apiPath || '/open/v1/chat';
  
  // 使用本地代理URL而不是直接访问远程API
  // 注意：这里使用的是相对路径，会通过Vite代理转发
  const proxyUrl = '/vetmew-api' + apiPath;
  
  try {
    console.log('准备调用API，请求数据:', requestData);
    
    // 生成签名
    let signatureInfo;
    try {
      signatureInfo = await generateSignature(apiPath, requestData, apiSecret);
    } catch (signError) {
      console.error('签名生成失败:', signError);
      throw signError;
    }
    
    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'X-ApiKey': apiKey,
      'X-Timestamp': signatureInfo.timestamp,
      'X-Nonce': signatureInfo.nonce,
      'X-Signature': signatureInfo.signature
    };
    
    console.log('发送API请求', {
      url: proxyUrl,
      headers: headers
    });
    
    // 使用fetch API
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestData)
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    // 获取原始文本响应
    const rawText = await response.text();
    console.log('接收到原始响应');
    
    // 处理SSE流式响应
    if (rawText.includes('data:')) {
      console.log('检测到SSE流式响应');
      
      // 分割多行响应
      const lines = rawText.split('\n\n');
      console.log(`识别到${lines.length}个响应片段`);
      
      // 收集所有消息内容
      let fullMessage = '';
      let conversationId = '';
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;
        
        try {
          // 处理[DONE]标记
          if (trimmedLine === 'data: [DONE]') {
            console.log('流式响应完成');
            break;
          }
          
          // 提取JSON部分
          const jsonStr = trimmedLine.substring(5).trim();
          const data = JSON.parse(jsonStr);
          
          // 收集消息内容
          if (data.msg) {
            fullMessage += data.msg;
          }
          
          // 保存会话ID
          if (data.conversation_id && !conversationId) {
            conversationId = data.conversation_id;
          }
        } catch (err) {
          console.warn('解析SSE片段失败:', err, trimmedLine);
        }
      }
      
      console.log('完整响应消息:', fullMessage);
      
      // 返回组合后的响应
      return {
        code: 0,
        message: '成功',
        data: fullMessage,
        conversation_id: conversationId,
        streaming: true
      };
    } else {
      // 尝试解析为标准JSON响应
      try {
        const responseData = JSON.parse(rawText);
        console.log('解析为标准JSON响应:', responseData);
        return responseData;
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        return {
          code: 9999,
          message: '服务器返回了无效的数据格式',
          data: null,
          rawResponse: rawText
        };
      }
    }
  } catch (error) {
    console.error('汪喵灵灵API调用出错:', error);
    
    return {
      code: 9999,
      message: `API调用失败: ${error.message}`,
      data: null
    };
  }
}

export default {
  callVetmewAPI
}; 