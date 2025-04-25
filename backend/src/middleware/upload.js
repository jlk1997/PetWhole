const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const createUploadDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// 用户头像上传存储配置
const userStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/users');
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    // 使用时间戳和原始文件名创建唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + fileExt);
  }
});

// 宠物头像上传存储配置
const petStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const dir = path.join(__dirname, '../../uploads/pets');
    createUploadDir(dir);
    cb(null, dir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExt = path.extname(file.originalname);
    cb(null, 'pet-' + uniqueSuffix + fileExt);
  }
});

// 只允许上传图片文件的过滤器
const imageFilter = (req, file, cb) => {
  console.log('处理上传文件:', file.originalname);
  // 接受的图片类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('文件类型不允许:', file.mimetype);
    cb(new Error('只允许上传JPG、PNG、GIF和WEBP格式的图片!'), false);
  }
};

// 用户头像上传配置 - 简化版本
const userUpload = multer({
  storage: userStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB最大限制
  }
});

// 宠物头像上传配置 - 简化版本
const petUpload = multer({
  storage: petStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB最大限制
  }
});

// 单个文件上传中间件
const uploadAvatar = userUpload.single('avatar');
const uploadPetAvatar = petUpload.single('avatar');

module.exports = {
  userUpload,
  petUpload,
  uploadAvatar,
  uploadPetAvatar
}; 