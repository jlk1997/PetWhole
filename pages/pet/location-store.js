import { defineStore } from 'pinia'

export const useLocationStore = defineStore('location', {
  state: () => ({
    currentLocation: { latitude: 39.9087, longitude: 116.3975 },
    isLocationShared: true
  }),
  
  actions: {
    updateLocation(location) {
      this.currentLocation = location;
    },
    
    setLocationShared(shared) {
      this.isLocationShared = shared;
    }
  }
}); 