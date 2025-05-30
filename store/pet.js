import { defineStore } from 'pinia'
import { useUserStore } from './user.js'
import { ref, computed } from 'vue'
import { showToast } from '@/utils/ui.js'
import api from '../utils/api.js'

export const usePetStore = defineStore('pet', {
  state: () => ({
    pets: [],
    currentPet: null,
    loading: false,
    error: null,
  }),

  getters: {
    hasPets: (state) => state.pets.length > 0
  },

  actions: {
    // 从本地存储恢复宠物状态
    restorePetState() {
      try {
        const petsData = uni.getStorageSync('pets')
        const currentPetData = uni.getStorageSync('currentPet')
        
        if (petsData) {
          this.pets = JSON.parse(petsData)
        }
        
        if (currentPetData) {
          this.currentPet = JSON.parse(currentPetData)
        }
      } catch (error) {
        console.error('恢复宠物状态失败:', error)
      }
    },
    
    // 保存宠物状态到本地存储
    savePetState() {
      try {
        uni.setStorageSync('pets', JSON.stringify(this.pets))
        if (this.currentPet) {
          uni.setStorageSync('currentPet', JSON.stringify(this.currentPet))
        }
      } catch (error) {
        console.error('保存宠物状态失败:', error)
      }
    },

    // 获取用户的宠物列表
    async fetchPets() {
      try {
        this.loading = true
        this.error = null
        
        const userStore = useUserStore()
        
        // 检查用户是否登录
        if (!userStore.isAuthenticated) {
          this.pets = []
          return []
        }
        
        const response = await api.pet.getMyPets()
        
        if (response) {
          this.pets = Array.isArray(response) ? response : []
        } else {
          this.pets = []
        }
        
        // 如果有宠物但没有当前选中宠物，设置第一个为当前宠物
        if (this.pets.length > 0 && !this.currentPet) {
          this.currentPet = this.pets[0]
        }
        
        // 保存到本地存储
        this.savePetState()
        
        return this.pets
      } catch (error) {
        console.error('获取宠物列表失败:', error)
        this.error = '获取宠物列表失败'
        // 不要将pets设置为空数组，以免清除掉缓存的宠物数据
        if (!this.pets || !this.pets.length) {
          this.restorePetState()
          if (!this.pets) this.pets = []
        }
        return this.pets || []
      } finally {
        this.loading = false
      }
    },

    // 获取宠物详情
    async getPetById(id) {
      // 先从本地列表查找
      const localPet = this.pets.find(pet => pet.id === id || pet._id === id)
      if (localPet) {
        // 修复：确保localPet.dailyPhotos中的URL格式正确
        if (localPet.dailyPhotos && Array.isArray(localPet.dailyPhotos)) {
          console.log('从本地获取宠物信息，处理照片URL');
        }
        return localPet
      }
      
      // 如果本地没有，从API获取
      try {
        this.loading = true
        this.error = null
        const response = await api.pet.getPetById(id)
        
        if (response) {
          // 修复：确保response.dailyPhotos中的URL格式正确
          if (response.dailyPhotos && Array.isArray(response.dailyPhotos)) {
            console.log('从API获取宠物信息，处理照片URL:', response.dailyPhotos.length);
          }
          return response
        }
        return null
      } catch (error) {
        console.error('获取宠物详情失败:', error)
        this.error = '获取宠物详情失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 创建宠物
    async createPet(petData) {
      try {
        this.loading = true
        this.error = null
        
        const response = await api.pet.addPet(petData)
        // 更新宠物列表
        await this.fetchPets()
        return response
      } catch (error) {
        console.error('创建宠物失败:', error)
        this.error = '创建宠物失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 更新宠物信息
    async updatePet(petId, petData) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log('更新宠物信息，ID:', petId, '数据:', petData);
        
        // 调用更新宠物的API
        const response = await api.pet.updatePet(petId, petData);
        console.log('更新宠物API响应:', response);
        
        // 刷新宠物列表以确保数据最新
        await this.fetchPets();
        
        // 获取更新后的宠物
        const updatedPet = this.pets.find(pet => pet._id === petId || pet.id === petId);
        
        // 如果更新的是当前宠物，更新currentPet
        if (this.currentPet && (this.currentPet._id === petId || this.currentPet.id === petId) && updatedPet) {
          this.currentPet = updatedPet;
        }
        
        // 保存到本地存储
        this.savePetState();
        
        return updatedPet || response;
      } catch (error) {
        console.error('更新宠物信息失败:', error);
        this.error = '更新宠物信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 删除宠物
    async deletePet(petId) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log('删除宠物，ID:', petId);
        
        // 调用删除宠物的API
        const response = await api.pet.deletePet(petId);
        console.log('删除宠物API响应:', response);
        
        // 从列表中移除宠物
        this.pets = this.pets.filter(pet => {
          return pet._id !== petId && pet.id !== petId;
        });
        
        // 如果删除的是当前选中的宠物，更新currentPet
        if (this.currentPet && (this.currentPet._id === petId || this.currentPet.id === petId)) {
          this.currentPet = this.pets.length > 0 ? this.pets[0] : null;
        }
        
        // 保存到本地存储
        this.savePetState();
        
        return { success: true };
      } catch (error) {
        console.error('删除宠物失败:', error);
        this.error = '删除宠物失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 上传宠物头像
    async uploadPetAvatar(petId, filePath) {
      try {
        this.loading = true
        this.error = null
        
        console.log('开始上传宠物头像:', petId, filePath);
        
        // 确保API调用正确
        const response = await api.pet.uploadPetAvatar(petId, filePath);
        console.log('头像上传结果:', response);
        
        // 如果返回有效的响应
        if (response) {
          // 获取更新后的宠物信息
          await this.fetchPets();
          
          // 查找更新后的宠物以确保头像已更新
          const updatedPet = this.pets.find(p => p._id === petId || p.id === petId);
          
          if (updatedPet) {
            console.log('头像更新后的宠物:', updatedPet);
            
            // 如果是当前宠物，更新currentPet
            if (this.currentPet && (this.currentPet._id === petId || this.currentPet.id === petId)) {
              this.currentPet = updatedPet;
            }
          }
          
          // 保存到本地存储
          this.savePetState();
        }
        
        return response;
      } catch (error) {
        console.error('上传宠物头像失败:', error);
        this.error = '上传宠物头像失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 设置当前选中的宠物
    setCurrentPet(pet) {
      this.currentPet = pet
      this.savePetState()
    },

    // 清空宠物数据（用于登出时清空）
    clearPets() {
      this.pets = []
      this.currentPet = null
      this.error = null
      
      // 清除本地存储
      try {
        uni.removeStorageSync('pets')
        uni.removeStorageSync('currentPet')
      } catch (error) {
        console.error('清除宠物数据失败:', error)
      }
    },
    
    // 添加宠物
    async addPet(petData) {
      try {
        this.loading = true;
        this.error = null;
        
        console.log('添加宠物，数据:', petData);
        
        // 调用创建宠物的API
        const response = await api.pet.addPet(petData);
        console.log('添加宠物API响应:', response);
        
        // 刷新宠物列表
        await this.fetchPets();
        
        // 如果没有当前宠物，设置新创建的宠物为当前宠物
        if (!this.currentPet && this.pets && this.pets.length > 0) {
          // 查找新添加的宠物（通常是最后一个）
          const newPet = this.pets[this.pets.length - 1];
          this.setCurrentPet(newPet);
        }
        
        // 保存到本地存储
        this.savePetState();
        
        return response;
      } catch (error) {
        console.error('添加宠物失败:', error);
        this.error = '添加宠物失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },

    // 添加宠物的日常照片
    async uploadPetDailyPhoto(petId, photoPath) {
      this.loading = true;
      this.error = null;
      
      try {
        console.log('上传宠物日常照片:', petId, photoPath);
        
        // 获取基础URL
        const BASE_URL = uni.getStorageSync('BASE_URL') || 'http://49.235.65.37:5000';
        const uploadUrl = `${BASE_URL}/api/pets/${petId}/daily-photo`;
        const token = uni.getStorageSync('token');
        
        // 处理blob URL - 使用canvas转换为base64，然后以JSON格式发送
        if (photoPath.startsWith('blob:')) {
          return new Promise((resolve, reject) => {
            try {
              console.log('处理blob URL:', photoPath);
              
              // 通过Canvas转换
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => {
                try {
                  const canvas = document.createElement('canvas');
                  canvas.width = img.width;
                  canvas.height = img.height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(img, 0, 0);
                  
                  // 转为base64编码字符串
                  const base64Data = canvas.toDataURL('image/jpeg', 0.9);
                  console.log('转换完成，准备发送base64数据');
                  
                  // 使用普通JSON格式发送，避开multipart/form-data的问题
                  fetch(uploadUrl, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      imageData: base64Data,
                      description: ''
                    })
                  })
                  .then(response => {
                    if (!response.ok) {
                      throw new Error(`上传失败: ${response.status}`);
                    }
                    return response.json();
                  })
                  .then(data => {
                    console.log('上传成功:', data);
                    resolve(data);
                  })
                  .catch(error => {
                    console.error('上传错误:', error);
                    reject(error);
                  });
                } catch (e) {
                  console.error('Canvas处理失败:', e);
                  reject(e);
                }
              };
              
              img.onerror = (e) => {
                console.error('图片加载失败:', e);
                reject(new Error('图片加载失败'));
              };
              
              img.src = photoPath;
            } catch (e) {
              console.error('处理blob URL失败:', e);
              reject(e);
            }
          });
        } else {
          // 对于本地文件路径，保持使用uni.uploadFile
          return new Promise((resolve, reject) => {
            console.log('处理本地文件路径:', photoPath);
            
            uni.uploadFile({
              url: uploadUrl,
              filePath: photoPath,
              name: 'photo',
              header: {
                'Authorization': `Bearer ${token}`
              },
              success: (uploadRes) => {
                console.log('照片上传成功:', uploadRes);
                
                let result;
                try {
                  if (typeof uploadRes.data === 'string') {
                    result = JSON.parse(uploadRes.data);
                  } else {
                    result = uploadRes.data;
                  }
                  
                  resolve(result);
                } catch (parseError) {
                  console.error('解析上传响应失败:', parseError);
                  reject(parseError);
                }
              },
              fail: (error) => {
                console.error('照片上传失败:', error);
                reject(error);
              },
              complete: () => {
                this.loading = false;
              }
            });
          });
        }
      } catch (error) {
        console.error('上传宠物日常照片失败:', error);
        this.error = error.message || '上传宠物日常照片失败';
        throw error;
      } finally {
        this.loading = false;
      }
    }
  },
}) 