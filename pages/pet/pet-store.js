import { defineStore } from 'pinia'

export const usePetStore = defineStore('pet', {
  state: () => ({
    pets: [],
    currentPet: null,
  }),
  
  actions: {
    async fetchPets() {
      console.log('获取宠物列表');
      return [];
    },
    
    restorePetState() {
      console.log('恢复宠物状态');
    }
  }
}); 