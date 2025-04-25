const Pet = require('../models/Pet');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Create a new pet
 * @route   POST /api/pets
 * @access  Private
 */
exports.createPet = async (req, res) => {
  try {
    const { name, type, breed, age, gender, description, weight, color, traits } = req.body;
    
    const pet = new Pet({
      name,
      owner: req.user.id,
      type: type || 'dog',
      breed,
      age,
      gender,
      description,
      weight,
      color,
      traits: traits ? traits.split(',').map(tag => tag.trim()) : []
    });
    
    const savedPet = await pet.save();
    
    res.status(201).json(savedPet);
  } catch (error) {
    console.error('Create pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get all pets for current user
 * @route   GET /api/pets
 * @access  Private
 */
exports.getUserPets = async (req, res) => {
  try {
    const pets = await Pet.find({ owner: req.user.id });
    res.json(pets);
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get pet by ID
 * @route   GET /api/pets/:id
 * @access  Public
 */
exports.getPetById = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id).populate('owner', 'username nickname avatar');
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    res.json(pet);
  } catch (error) {
    console.error('Get pet by ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update pet
 * @route   PUT /api/pets/:id
 * @access  Private
 */
exports.updatePet = async (req, res) => {
  try {
    const { name, type, breed, age, gender, description, weight, color, traits, isActive } = req.body;
    
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to update this pet' });
    }
    
    // Update fields
    pet.name = name || pet.name;
    pet.type = type || pet.type;
    pet.breed = breed || pet.breed;
    pet.age = age !== undefined ? age : pet.age;
    pet.gender = gender || pet.gender;
    pet.description = description || pet.description;
    pet.weight = weight !== undefined ? weight : pet.weight;
    pet.color = color || pet.color;
    pet.isActive = isActive !== undefined ? isActive : pet.isActive;
    
    if (traits) {
      pet.traits = traits.split(',').map(tag => tag.trim());
    }
    
    const updatedPet = await pet.save();
    
    res.json(updatedPet);
  } catch (error) {
    console.error('Update pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Delete pet
 * @route   DELETE /api/pets/:id
 * @access  Private
 */
exports.deletePet = async (req, res) => {
  try {
    const pet = await Pet.findById(req.params.id);
    
    if (!pet) {
      return res.status(404).json({ message: 'Pet not found' });
    }
    
    // Check if pet belongs to user
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this pet' });
    }
    
    await Pet.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Pet removed', success: true });
  } catch (error) {
    console.error('Delete pet error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Upload pet avatar
 * @route   POST /api/pets/:id/avatar
 * @access  Private
 */
exports.uploadPetAvatar = async (req, res) => {
  try {
    // 记录请求信息用于调试
    console.log('宠物头像上传请求已收到');
    console.log('宠物ID:', req.params.id);
    console.log('请求文件:', req.files);
    console.log('请求头:', req.headers);
    
    // 检查是否有文件被上传 - 适配express-fileupload
    if (!req.files) {
      console.error('没有找到上传的文件对象(req.files)');
      return res.status(400).json({ 
        success: false, 
        message: '没有上传文件' 
      });
    }
    
    // 检查avatar字段是否存在
    if (!req.files.avatar) {
      console.error('没有找到avatar字段');
      console.error('可用的文件字段:', Object.keys(req.files));
      return res.status(400).json({ 
        success: false, 
        message: '没有找到头像文件' 
      });
    }

    const avatarFile = req.files.avatar;
    console.log('上传的文件信息:', avatarFile);
    
    // 检查文件类型
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(avatarFile.mimetype)) {
      console.error('不支持的文件类型:', avatarFile.mimetype);
      return res.status(400).json({
        success: false,
        message: '只支持JPG、PNG、GIF和WEBP格式的图片'
      });
    }

    const petId = req.params.id;
    const pet = await Pet.findById(petId);
    
    if (!pet) {
      return res.status(404).json({ 
        success: false, 
        message: '宠物不存在' 
      });
    }
    
    // 检查是否是宠物所有者
    if (pet.owner.toString() !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        message: '无权更新此宠物' 
      });
    }
    
    // 确保上传目录存在
    const uploadDir = path.join(__dirname, '../../uploads/pets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // 创建唯一的文件名
    const fileExt = path.extname(avatarFile.name || 'image.jpg').toLowerCase();
    const filename = `pet-${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
    const filePath = path.join(uploadDir, filename);
    
    console.log('准备保存文件到:', filePath);
    
    try {
      // 移动上传的文件到目标位置
      await avatarFile.mv(filePath);
      console.log('文件已保存到:', filePath);
      
      // 生成相对URL路径
      const avatarUrl = `/uploads/pets/${filename}`;
      
      // 更新宠物的avatar字段
      pet.avatar = avatarUrl;
      await pet.save();
      
      // 返回成功响应
      res.status(200).json({
        success: true,
        message: '宠物头像上传成功',
        data: {
          pet: {
            _id: pet._id,
            name: pet.name,
            breed: pet.breed,
            avatar: pet.avatar
          }
        }
      });
    } catch (mvError) {
      console.error('移动上传文件失败:', mvError);
      return res.status(500).json({
        success: false,
        message: '保存宠物头像文件失败: ' + mvError.message
      });
    }
  } catch (error) {
    console.error('上传宠物头像错误:', error);
    res.status(500).json({ 
      success: false,
      message: '服务器错误', 
      error: error.message 
    });
  }
};

/**
 * @desc    Get pets by user ID
 * @route   GET /api/pets/user/:userId
 * @access  Public
 */
exports.getPetsByUserId = async (req, res) => {
  try {
    const pets = await Pet.find({ 
      owner: req.params.userId,
      isActive: true 
    });
    
    res.json(pets);
  } catch (error) {
    console.error('Get pets by user ID error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 

/**
 * @desc    Get pets by user ID
 * @route   GET /api/users/:id/pets
 * @access  Public
 */
exports.getPetsByUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const pets = await Pet.find({ owner: userId });

    res.json(pets);
  } catch (error) {
    console.error('Get user pets error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 