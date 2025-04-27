const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fileUpload = require('express-fileupload');
const fs = require('fs');

// Import routes
const userRoutes = require('./routes/userRoutes');
const petRoutes = require('./routes/petRoutes');
const locationRoutes = require('./routes/locationRoutes');
const communityRoutes = require('./routes/communityRoutes');
const apiRoutes = require('./routes/api');

// 创建简化的中间件来处理walks路由
const walksRouter = express.Router();
const { auth } = require('./middleware/auth');
const WalkRecord = require('./models/WalkRecord');

// 删除遛狗记录
walksRouter.delete('/:id', auth, async (req, res) => {
  try {
    const walkId = req.params.id;
    
    if (!walkId) {
      return res.status(400).json({ success: false, message: '缺少记录ID' });
    }
    
    // 检查ID是否为本地存储ID格式 (以walk_开头)
    if (walkId.startsWith('walk_')) {
      console.log('删除本地存储的遛狗记录:', walkId);
      
      // 返回成功响应，前端将通过本地存储处理实际删除
      return res.status(200).json({
        success: true,
        message: '记录已成功删除',
        code: 0
      });
    }
    
    // 尝试从MongoDB删除记录
    // 确保记录存在且属于当前用户
    const walkRecord = await WalkRecord.findOne({
      _id: walkId,
      user: req.user.id
    });
    
    if (!walkRecord) {
      return res.status(404).json({ success: false, message: '未找到记录或无权删除' });
    }
    
    // 删除记录
    await WalkRecord.findByIdAndDelete(walkId);
    
    res.status(200).json({
      success: true,
      message: '记录已成功删除',
      code: 0
    });
  } catch (error) {
    console.error('删除遛狗记录失败:', error);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));

// 添加文件上传中间件
app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 }, // 限制为10MB
  createParentPath: true, // 自动创建上传目录
  useTempFiles: true,
  tempFileDir: path.join(__dirname, '../tmp/'),
  debug: true, // 启用调试模式
  safeFileNames: true, // 清理文件名
  preserveExtension: true, // 保留扩展名
  uploadTimeout: 60000 // 上传超时时间，60秒
}));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../uploads');
const communityUploadsDir = path.join(uploadsDir, 'community');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(communityUploadsDir)) {
  fs.mkdirSync(communityUploadsDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/walks', walksRouter);
app.use('/api', apiRoutes);

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DogRun API' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: err.message || 'Something went wrong on the server',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dogrun', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }); 