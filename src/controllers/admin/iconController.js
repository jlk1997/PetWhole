/**
 * @desc    替换应用图标位置的图标
 * @route   POST /api/admin/icons/replace-app-icon
 * @access  Private
 */
exports.replaceAppIcon = async (req, res) => {
  try {
    // 检查是否有文件上传
    if (!req.files || !req.files.file) {
      return res.status(400).json({
        success: false,
        message: '请上传图标文件',
        code: 400
      });
    }
    
    const uploadedFile = req.files.file;
    const { path: iconPath } = req.body;
    
    if (!iconPath) {
      return res.status(400).json({
        success: false,
        message: '请提供应用图标路径',
        code: 400
      });
    }
    
    // 获取文件信息
    const fileName = uploadedFile.name;
    const fileSize = uploadedFile.size;
    const fileExtension = path.extname(fileName).replace('.', '').toLowerCase();
    
    // 检查文件格式
    const allowedFormats = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    
    if (!allowedFormats.includes(fileExtension)) {
      return res.status(400).json({
        success: false,
        message: '不支持的文件格式，仅支持: ' + allowedFormats.join(', '),
        code: 400
      });
    }
    
    // 确定目标路径
    // 获取静态文件的相对路径，移除开头的斜杠
    const relativePath = iconPath.startsWith('/') ? iconPath.substring(1) : iconPath;
    const targetPath = path.join(__dirname, '../../../../', relativePath);
    
    console.log('Target path for app icon replacement:', targetPath);
    
    // 确保目标目录存在
    const targetDir = path.dirname(targetPath);
    fs.mkdirSync(targetDir, { recursive: true });
    
    // 备份原始文件（如果存在）
    if (fs.existsSync(targetPath)) {
      const backupPath = `${targetPath}.bak`;
      try {
        fs.copyFileSync(targetPath, backupPath);
        console.log(`原始文件已备份至 ${backupPath}`);
      } catch (backupError) {
        console.error('备份原始文件失败:', backupError);
        // 继续执行，不阻止替换
      }
    } else {
      console.log(`目标文件不存在，将创建新文件: ${targetPath}`);
    }
    
    try {
      // 移动文件到目标位置
      await uploadedFile.mv(targetPath);
      console.log(`文件已成功移动到: ${targetPath}`);
    } catch (moveError) {
      console.error('移动文件失败:', moveError);
      return res.status(500).json({
        success: false,
        message: `图标替换失败: ${moveError.message}`,
        code: 500
      });
    }
    
    // 创建或更新Icon数据库记录
    let icon = await Icon.findOne({ usedLocation: iconPath });
    
    if (icon) {
      // 更新现有记录
      icon.filename = path.basename(targetPath);
      icon.size = fileSize;
      icon.format = fileExtension;
      icon.used = true;
      icon.updatedAt = Date.now();
      await icon.save();
    } else {
      // 创建新记录
      icon = new Icon({
        name: path.basename(iconPath, path.extname(iconPath)),
        type: determineIconType(iconPath),
        description: `应用图标: ${iconPath}`,
        url: iconPath,
        filename: path.basename(targetPath),
        size: fileSize,
        format: fileExtension,
        used: true,
        usedLocation: iconPath,
        uploadedBy: req.admin.id
      });
      await icon.save();
    }
    
    res.status(200).json({
      success: true,
      message: '应用图标替换成功',
      data: {
        id: icon._id,
        name: icon.name,
        type: icon.type,
        url: iconPath + '?t=' + Date.now(), // 添加时间戳防止缓存
        path: iconPath,
        size: formatFileSize(icon.size),
        format: icon.format,
        updateTime: icon.updatedAt
      },
      code: 0
    });
  } catch (error) {
    console.error('替换应用图标错误:', error);
    
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
      code: 500
    });
  }
}; 