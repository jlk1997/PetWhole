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
        return localPet
      }
      
      // 如果本地没有，从API获取
      try {
        this.loading = true
        this.error = null
        const response = await api.pet.getPetById(id)
        
        if (response) {
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
    }
  },
}) 