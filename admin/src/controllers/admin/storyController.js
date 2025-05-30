// 创建新剧情
exports.createPlot = async (req, res) => {
  try {
    const { title, description, coverImage, isMainStory, isActive, sortOrder, requirement, reward } = req.body;
    
    // 设置默认排序
    let finalSortOrder = sortOrder;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      // 如果未指定排序，则自动设置为当前最大排序值+10
      const maxSortOrder = await StoryPlot.findOne({})
        .sort({ sortOrder: -1 })
        .select('sortOrder');
      
      finalSortOrder = maxSortOrder ? maxSortOrder.sortOrder + 10 : 0;
    }
    
    // 创建新剧情
    const newPlot = new StoryPlot({
      title,
      description,
      coverImage,
      isMainStory: isMainStory || false,
      isActive: isActive !== false, // 默认激活
      sortOrder: finalSortOrder,
      requirement: requirement || {},
      reward: reward || {}
    });
    
    await newPlot.save();
    
    return res.status(201).json({
      success: true,
      message: '剧情创建成功',
      data: {
        plot: newPlot
      }
    });
  } catch (error) {
    return handleError(res, error);
  }
}; 