import { defineStore } from 'pinia'
import { petApi } from '@/api'

export const usePetStore = defineStore('pet', {
  state: () => ({
    pets: [],
    currentPet: null,
    loading: false,
    error: null
  }),
  
  getters: {
    getPets: (state) => state.pets,
    getCurrentPet: (state) => state.currentPet,
  },
  
  actions: {
    // 获取宠物列表
    async fetchPets() {
      this.loading = true;
      this.error = null;
      try {
        const response = await petApi.getPets();
        // 检查response格式，确保能正确获取data
        const petData = response.data || response || [];
        this.setPets(petData);
        return petData;
      } catch (error) {
        console.error('获取宠物列表失败:', error);
        this.error = error.message || '获取宠物列表失败';
        // 在错误情况下也设置空数组，避免未定义错误
        this.setPets([]);
        uni.showToast({
          title: '获取宠物列表失败',
          icon: 'none'
        });
        return [];
      } finally {
        this.loading = false;
      }
    },
    
    // 设置宠物列表
    setPets(pets) {
      if (!pets) {
        this.pets = [];
        uni.setStorageSync('pets', JSON.stringify([]));
        return;
      }
      
      this.pets = Array.isArray(pets) ? pets : [];
      uni.setStorageSync('pets', JSON.stringify(this.pets));
      
      // 如果没有当前选中的宠物，则默认选择第一个
      if (!this.currentPet && this.pets.length > 0) {
        this.setCurrentPet(this.pets[0]);
      }
    },
    
    // 添加宠物
    async addPet(petData) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await petApi.createPet(petData);
        this.pets.push(data);
        uni.setStorageSync('pets', JSON.stringify(this.pets));
        
        // 如果这是第一个宠物，设为当前宠物
        if (this.pets.length === 1) {
          this.setCurrentPet(data);
        }
        return data;
      } catch (error) {
        console.error('添加宠物失败:', error);
        this.error = error.message || '添加宠物失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 更新宠物信息
    async updatePet(petId, petData) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await petApi.updatePet(petId, petData);
        const index = this.pets.findIndex(pet => pet._id === petId);
        if (index !== -1) {
          this.pets[index] = data;
          uni.setStorageSync('pets', JSON.stringify(this.pets));
          
          // 如果更新的是当前宠物，也更新currentPet
          if (this.currentPet && this.currentPet._id === petId) {
            this.currentPet = data;
            uni.setStorageSync('currentPet', JSON.stringify(data));
          }
        }
        return data;
      } catch (error) {
        console.error('更新宠物信息失败:', error);
        this.error = error.message || '更新宠物信息失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 删除宠物
    async deletePet(petId) {
      this.loading = true;
      this.error = null;
      try {
        await petApi.deletePet();
        this.pets = this.pets.filter(pet => pet._id !== petId);
        uni.setStorageSync('pets', JSON.stringify(this.pets));
        
        // 如果删除的是当前宠物，重置当前宠物
        if (this.currentPet && this.currentPet._id === petId) {
          this.currentPet = this.pets.length > 0 ? this.pets[0] : null;
          uni.setStorageSync('currentPet', this.currentPet ? JSON.stringify(this.currentPet) : '');
        }
        return true;
      } catch (error) {
        console.error('删除宠物失败:', error);
        this.error = error.message || '删除宠物失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 获取宠物详情
    async getPetById(petId) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await petApi.getPetById(petId);
        return data;
      } catch (error) {
        console.error('获取宠物详情失败:', error);
        this.error = error.message || '获取宠物详情失败';
        throw error;
      } finally {
        this.loading = false;
      }
    },
    
    // 设置当前选中的宠物
    setCurrentPet(pet) {
      this.currentPet = pet;
      uni.setStorageSync('currentPet', JSON.stringify(pet));
    },
    
    // 从本地存储恢复宠物数据
    restorePetState() {
      try {
        const petsData = uni.getStorageSync('pets');
        const currentPetData = uni.getStorageSync('currentPet');
        
        if (petsData) {
          this.pets = JSON.parse(petsData);
        }
        
        if (currentPetData) {
          this.currentPet = JSON.parse(currentPetData);
        } else if (this.pets.length > 0) {
          this.currentPet = this.pets[0];
        }
      } catch (error) {
        console.error('恢复宠物状态失败:', error);
      }
    },
  },
}) 