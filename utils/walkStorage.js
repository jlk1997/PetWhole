/**
 * 遛狗记录本地存储工具
 * 当后端API不可用时，使用本地存储来存储和获取遛狗记录
 */

// 本地存储的键名
const WALK_RECORDS_KEY = 'dog_walk_records';
const LAST_WALK_ID_KEY = 'last_walk_id';

// 生成唯一ID
const generateUniqueId = () => {
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `walk_${timestamp}_${random}`;
};

// 获取当前存储的所有遛狗记录
export const getAllWalkRecords = () => {
  try {
    const recordsStr = uni.getStorageSync(WALK_RECORDS_KEY);
    return recordsStr ? JSON.parse(recordsStr) : [];
  } catch (error) {
    console.error('获取本地遛狗记录失败:', error);
    return [];
  }
};

// 保存遛狗记录
export const saveWalkRecord = (walkData) => {
  try {
    // 获取现有记录
    const records = getAllWalkRecords();
    
    // 生成新ID
    const walkId = generateUniqueId();
    
    // 创建新记录
    const newRecord = {
      id: walkId,
      ...walkData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 添加到数组开头（最新的记录在前面）
    records.unshift(newRecord);
    
    // 保存到本地存储
    uni.setStorageSync(WALK_RECORDS_KEY, JSON.stringify(records));
    
    // 保存最后一个walkId，用于后续的endWalk操作
    uni.setStorageSync(LAST_WALK_ID_KEY, walkId);
    
    console.log('遛狗记录已保存到本地存储:', newRecord);
    
    // 返回带有id的记录
    return { 
      code: 0,
      message: '保存成功',
      data: { walkId }
    };
  } catch (error) {
    console.error('保存遛狗记录到本地失败:', error);
    return {
      code: 500,
      message: '保存失败',
      data: null
    };
  }
};

// 更新遛狗记录（用于结束遛狗）
export const updateWalkRecord = (walkId, updateData) => {
  try {
    // 获取现有记录
    const records = getAllWalkRecords();
    
    // 查找要更新的记录
    const recordIndex = records.findIndex(record => record.id === walkId);
    
    if (recordIndex === -1) {
      console.error('未找到要更新的遛狗记录:', walkId);
      return {
        code: 404,
        message: '未找到记录',
        data: null
      };
    }
    
    // 更新记录
    records[recordIndex] = {
      ...records[recordIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // 保存回本地存储
    uni.setStorageSync(WALK_RECORDS_KEY, JSON.stringify(records));
    
    console.log('遛狗记录已更新:', records[recordIndex]);
    
    return {
      code: 0,
      message: '更新成功',
      data: records[recordIndex]
    };
  } catch (error) {
    console.error('更新遛狗记录失败:', error);
    return {
      code: 500,
      message: '更新失败',
      data: null
    };
  }
};

// 获取单个遛狗记录
export const getWalkRecord = (walkId) => {
  try {
    const records = getAllWalkRecords();
    const record = records.find(record => record.id === walkId);
    
    if (!record) {
      return {
        code: 404,
        message: '未找到记录',
        data: null
      };
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: record
    };
  } catch (error) {
    console.error('获取遛狗记录失败:', error);
    return {
      code: 500,
      message: '获取失败',
      data: null
    };
  }
};

// 删除遛狗记录
export const deleteWalkRecord = (walkId) => {
  try {
    // 获取现有记录
    const records = getAllWalkRecords();
    
    // 过滤掉要删除的记录
    const newRecords = records.filter(record => record.id !== walkId);
    
    // 如果长度相同，说明没有找到要删除的记录
    if (records.length === newRecords.length) {
      return {
        code: 404,
        message: '未找到要删除的记录',
        data: null
      };
    }
    
    // 保存回本地存储
    uni.setStorageSync(WALK_RECORDS_KEY, JSON.stringify(newRecords));
    
    console.log('遛狗记录已删除:', walkId);
    
    return {
      code: 0,
      message: '删除成功',
      data: null
    };
  } catch (error) {
    console.error('删除遛狗记录失败:', error);
    return {
      code: 500,
      message: '删除失败',
      data: null
    };
  }
};

// 获取遛狗统计数据
export const getWalkStats = () => {
  const records = getAllWalkRecords();
  
  let totalDistance = 0;
  let totalDuration = 0;
  
  records.forEach(record => {
    totalDistance += record.distance || 0;
    totalDuration += record.duration || 0;
  });
  
  return {
    totalRecords: records.length,
    totalDistance,
    totalDuration
  };
};

export default {
  getAllWalkRecords,
  getWalkRecord,
  saveWalkRecord,
  updateWalkRecord,
  deleteWalkRecord,
  getWalkStats
}; 