/**
 * 使用原生JavaScript实现HMAC-SHA256算法
 * 不依赖外部库，解决构建问题
 */

/**
 * 将字符串转换为UTF-8编码的字节数组
 * @param {string} str - 要转换的字符串
 * @returns {Uint8Array} - UTF-8编码的字节数组
 */
function stringToBytes(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * 将字节数组转换为十六进制字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} - 十六进制字符串
 */
function bytesToHex(bytes) {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 将字节数组转换为Base64字符串
 * @param {Uint8Array} bytes - 字节数组
 * @returns {string} - Base64编码的字符串
 */
function bytesToBase64(bytes) {
  // 使用浏览器内置的btoa函数和Uint8Array
  const binary = Array.from(bytes)
    .map(b => String.fromCharCode(b))
    .join('');
  return btoa(binary);
}

/**
 * 生成指定长度的随机字符串
 * @param {number} length - 字符串长度
 * @returns {string} - 随机字符串
 */
function generateRandomString(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 使用Web Crypto API进行HMAC-SHA256计算
 * @param {string} message - 消息内容
 * @param {string} key - 密钥
 * @returns {Promise<string>} - 十六进制编码的HMAC值
 */
async function hmacSha256(message, key) {
  try {
    // 使用Web Crypto API (适用于现代浏览器环境)
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);
    
    // 导入密钥
    const cryptoKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    // 计算签名
    const signature = await window.crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    // 转换为十六进制
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('HMAC计算失败 (Web Crypto API)', error);
    
    // 可以在这里添加降级处理方案...
    throw error;
  }
}

/**
 * 生成汪喵灵灵API签名
 * @param {string} path - API路径
 * @param {Object} body - 请求体对象
 * @param {string} apiSecret - API密钥
 * @returns {Promise<Object>} - 返回签名信息
 */
export async function generateSignature(path, body, apiSecret) {
  // 生成随机字符串(nonce)
  const nonce = generateRandomString(8);
  
  // 获取当前时间戳（秒级）
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // 将body转为JSON字符串
  const bodyStr = JSON.stringify(body);
  
  // 拼接签名字符串: path + body + nonce + timestamp
  const signStr = path + bodyStr + nonce + timestamp;
  
  try {
    // 使用HMAC-SHA256算法计算签名
    const signatureHex = await hmacSha256(signStr, apiSecret);
    
    // 转为Base64格式
    const signatureBytes = new Uint8Array(signatureHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const signature = bytesToBase64(signatureBytes);
    
    console.log('签名计算成功', {
      nonce,
      timestamp,
      signature,
      signStr
    });
    
    return {
      signature,
      timestamp,
      nonce
    };
  } catch (error) {
    console.error('签名生成失败:', error);
    throw error;
  }
}

/**
 * 简化版签名生成（纯前端实现，不使用任何依赖）
 * 在完整版签名不可用时使用
 * @param {string} path - API路径
 * @param {Object} body - 请求体对象
 * @returns {Object} - 返回签名信息
 */
export function generateBasicSignature(path, body) {
  const nonce = generateRandomString(8);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  
  // 简单的签名方法 - 非标准HMAC，仅用于备用
  const signature = btoa(`${nonce}-${timestamp}-${path}`);
  
  return {
    signature,
    timestamp,
    nonce
  };
}

export default {
  generateSignature,
  generateBasicSignature
}; 