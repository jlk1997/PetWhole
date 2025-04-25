const express = require('express');
const router = express.Router();

// 导入各个模块的路由
const locationRoutes = require('./locationRoutes');
const chatRoutes = require('./chatRoutes');
// const userRoutes = require('./userRoutes');
// const petRoutes = require('./petRoutes');

// 注册路由
router.use('/locations', locationRoutes);
router.use('/chat', chatRoutes);
// router.use('/users', userRoutes);
// router.use('/pets', petRoutes);

// API 根路径响应
router.get('/', (req, res) => {
  res.json({
    message: '宠物遛狗 API',
    version: '1.0.0',
    status: 'online'
  });
});

module.exports = router; 