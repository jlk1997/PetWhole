const express = require('express');
const router = express.Router();
const axios = require('axios');

// 其他已有路由...

/**
 * 宠物识别API - 代理到Hugging Face
 */
router.post('/pet-recognition', async (req, res) => {
  try {
    const imageData = req.body.imageData; // 从前端接收的图像数据
    
    if (!imageData) {
      return res.status(400).json({ error: '缺少图像数据' });
    }
    
    // 调用Hugging Face API
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/jhoppanne/Dogs-Breed-Image-Classification-V2',
      { inputs: imageData },
      {
        headers: {
          'Authorization': 'Bearer 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', // 存储在环境变量中更安全
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30秒超时
      }
    );
    
    // 将结果返回给前端
    res.json(response.data);
  } catch (error) {
    console.error('宠物识别API错误:', error.response?.data || error.message);
    res.status(500).json({
      error: '宠物识别分析失败',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router; 