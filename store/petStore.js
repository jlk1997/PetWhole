import { defineStore } from 'pinia'
import { petApi } from '@/utils/api'

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
        console.log('获取宠物列表响应:', response);
        this.setPets(response);
        return response;
      } catch (error) {
        console.error('获取宠物列表失败:', error);
        this.error = error.message || '获取宠物列表失败';
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
      this.pets = pets;
      uni.setStorageSync('pets', JSON.stringify(pets));
      
      // 如果没有当前选中的宠物，则默认选择第一个
      if (!this.currentPet && pets.length > 0) {
        this.setCurrentPet(pets[0]);
      }
    },
    
    // 添加宠物
    async addPet(petData) {
      this.loading = true;
      this.error = null;
      try {
        const response = await petApi.createPet(petData);
        console.log('添加宠物响应:', response);
        this.pets.push(response);
        uni.setStorageSync('pets', JSON.stringify(this.pets));
        
        // 如果这是第一个宠物，设为当前宠物
        if (this.pets.length === 1) {
          this.setCurrentPet(response);
        }
        return response;
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
        const response = await petApi.updatePet(petId, petData);
        console.log('更新宠物响应:', response);
        const index = this.pets.findIndex(pet => pet._id === petId);
        if (index !== -1) {
          this.pets[index] = response;
          uni.setStorageSync('pets', JSON.stringify(this.pets));
          
          // 如果更新的是当前宠物，也更新currentPet
          if (this.currentPet && this.currentPet._id === petId) {
            this.currentPet = response;
            uni.setStorageSync('currentPet', JSON.stringify(response));
          }
        }
        return response;
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
        await petApi.deletePet(petId);
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