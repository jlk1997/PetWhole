import api from '@/utils/api.js';

// 初始状态
const state = {
  markers: [],
  userMarkers: [],
  loading: false,
  error: null,
  currentMarker: null,
  selectedMarker: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  }
};

// Getters
const getters = {
  allMarkers: state => state.markers,
  userMarkers: state => state.userMarkers,
  isLoading: state => state.loading,
  getError: state => state.error,
  currentMarker: state => state.currentMarker,
  selectedMarker: state => state.selectedMarker,
  getPagination: state => state.pagination
};

// 处理异步操作的action
const actions = {
  // 获取附近的标记
  async fetchNearbyMarkers({ commit }, { longitude, latitude, radius = 5000 }) {
    try {
      commit('SET_LOADING', true);
      const response = await api.get(`/api/markers`, {
        params: { longitude, latitude, radius }
      });
      
      commit('SET_MARKERS', response.data.data);
      commit('SET_PAGINATION', response.data.pagination);
      commit('SET_LOADING', false);
      return response.data.data;
    } catch (error) {
      console.error('获取附近标记失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '获取标记失败');
      commit('SET_LOADING', false);
      return [];
    }
  },
  
  // 获取用户标记
  async fetchUserMarkers({ commit }, userId) {
    try {
      commit('SET_LOADING', true);
      const response = await api.get(`/api/markers/user/${userId}`);
      
      commit('SET_USER_MARKERS', response.data.data);
      commit('SET_LOADING', false);
      return response.data.data;
    } catch (error) {
      console.error('获取用户标记失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '获取用户标记失败');
      commit('SET_LOADING', false);
      return [];
    }
  },
  
  // 创建新标记
  async createMarker({ commit }, markerData) {
    try {
      commit('SET_LOADING', true);
      const response = await api.post('/api/markers', markerData);
      
      const newMarker = response.data.data;
      commit('ADD_MARKER', newMarker);
      commit('SET_CURRENT_MARKER', newMarker);
      commit('SET_LOADING', false);
      
      // 显示成功消息
      uni.showToast({
        title: '标记创建成功',
        icon: 'success'
      });
      
      return newMarker;
    } catch (error) {
      console.error('创建标记失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '创建标记失败');
      commit('SET_LOADING', false);
      
      // 显示错误消息
      uni.showToast({
        title: error.response?.data?.message || '创建标记失败',
        icon: 'none'
      });
      
      return null;
    }
  },
  
  // 更新标记
  async updateMarker({ commit }, { id, data }) {
    try {
      commit('SET_LOADING', true);
      const response = await api.put(`/api/markers/${id}`, data);
      
      const updatedMarker = response.data.data;
      commit('UPDATE_MARKER', updatedMarker);
      commit('SET_LOADING', false);
      
      // 显示成功消息
      uni.showToast({
        title: '标记更新成功',
        icon: 'success'
      });
      
      return updatedMarker;
    } catch (error) {
      console.error('更新标记失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '更新标记失败');
      commit('SET_LOADING', false);
      
      // 显示错误消息
      uni.showToast({
        title: error.response?.data?.message || '更新标记失败',
        icon: 'none'
      });
      
      return null;
    }
  },
  
  // 删除标记
  async deleteMarker({ commit }, id) {
    try {
      commit('SET_LOADING', true);
      await api.delete(`/api/markers/${id}`);
      
      commit('REMOVE_MARKER', id);
      commit('SET_LOADING', false);
      
      // 显示成功消息
      uni.showToast({
        title: '标记已删除',
        icon: 'success'
      });
      
      return true;
    } catch (error) {
      console.error('删除标记失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '删除标记失败');
      commit('SET_LOADING', false);
      
      // 显示错误消息
      uni.showToast({
        title: error.response?.data?.message || '删除标记失败',
        icon: 'none'
      });
      
      return false;
    }
  },
  
  // 获取单个标记详情
  async fetchMarkerById({ commit }, id) {
    try {
      commit('SET_LOADING', true);
      const response = await api.get(`/api/markers/${id}`);
      
      const marker = response.data.data;
      commit('SET_SELECTED_MARKER', marker);
      commit('SET_LOADING', false);
      return marker;
    } catch (error) {
      console.error('获取标记详情失败:', error);
      commit('SET_ERROR', error.response?.data?.message || '获取标记详情失败');
      commit('SET_LOADING', false);
      return null;
    }
  },
  
  // 点赞标记
  async likeMarker({ commit }, id) {
    try {
      const response = await api.post(`/api/markers/${id}/like`);
      commit('UPDATE_MARKER_LIKES', { id, likes: response.data.likes });
      return response.data;
    } catch (error) {
      console.error('点赞标记失败:', error);
      uni.showToast({
        title: error.response?.data?.message || '点赞失败',
        icon: 'none'
      });
      return null;
    }
  },
  
  // 取消点赞标记
  async unlikeMarker({ commit }, id) {
    try {
      const response = await api.post(`/api/markers/${id}/unlike`);
      commit('UPDATE_MARKER_LIKES', { id, likes: response.data.likes });
      return response.data;
    } catch (error) {
      console.error('取消点赞标记失败:', error);
      uni.showToast({
        title: error.response?.data?.message || '取消点赞失败',
        icon: 'none'
      });
      return null;
    }
  },
  
  // 设置当前标记
  setCurrentMarker({ commit }, marker) {
    commit('SET_CURRENT_MARKER', marker);
  },
  
  // 设置选中的标记
  setSelectedMarker({ commit }, marker) {
    commit('SET_SELECTED_MARKER', marker);
  },
  
  // 清除错误
  clearError({ commit }) {
    commit('SET_ERROR', null);
  }
};

// Mutations
const mutations = {
  SET_MARKERS(state, markers) {
    state.markers = markers;
  },
  SET_USER_MARKERS(state, markers) {
    state.userMarkers = markers;
  },
  ADD_MARKER(state, marker) {
    state.markers.unshift(marker);
    
    // 如果是当前用户的标记，也添加到userMarkers
    const userStore = uni.$store?.state?.user;
    if (marker.user && userStore && marker.user._id === userStore.user?._id) {
      state.userMarkers.unshift(marker);
    }
  },
  UPDATE_MARKER(state, updatedMarker) {
    // 更新markers数组中的标记
    const index = state.markers.findIndex(m => m._id === updatedMarker._id);
    if (index !== -1) {
      // 使用数组替换方式更新
      state.markers = [
        ...state.markers.slice(0, index),
        updatedMarker,
        ...state.markers.slice(index + 1)
      ];
    }
    
    // 更新userMarkers数组中的标记
    const userIndex = state.userMarkers.findIndex(m => m._id === updatedMarker._id);
    if (userIndex !== -1) {
      // 使用数组替换方式更新
      state.userMarkers = [
        ...state.userMarkers.slice(0, userIndex),
        updatedMarker,
        ...state.userMarkers.slice(userIndex + 1)
      ];
    }
    
    // 如果当前选中的标记是被更新的标记，也更新它
    if (state.selectedMarker && state.selectedMarker._id === updatedMarker._id) {
      state.selectedMarker = updatedMarker;
    }
    
    // 如果当前标记是被更新的标记，也更新它
    if (state.currentMarker && state.currentMarker._id === updatedMarker._id) {
      state.currentMarker = updatedMarker;
    }
  },
  REMOVE_MARKER(state, id) {
    // 从markers数组中移除标记
    state.markers = state.markers.filter(marker => marker._id !== id);
    
    // 从userMarkers数组中移除标记
    state.userMarkers = state.userMarkers.filter(marker => marker._id !== id);
    
    // 如果当前选中的标记是被删除的标记，清除它
    if (state.selectedMarker && state.selectedMarker._id === id) {
      state.selectedMarker = null;
    }
    
    // 如果当前标记是被删除的标记，清除它
    if (state.currentMarker && state.currentMarker._id === id) {
      state.currentMarker = null;
    }
  },
  SET_CURRENT_MARKER(state, marker) {
    state.currentMarker = marker;
  },
  SET_SELECTED_MARKER(state, marker) {
    state.selectedMarker = marker;
  },
  SET_LOADING(state, status) {
    state.loading = status;
  },
  SET_ERROR(state, error) {
    state.error = error;
  },
  SET_PAGINATION(state, pagination) {
    state.pagination = pagination;
  },
  UPDATE_MARKER_LIKES(state, { id, likes }) {
    // 更新markers数组中的标记点赞数
    const index = state.markers.findIndex(m => m._id === id);
    if (index !== -1) {
      const marker = { ...state.markers[index] };
      marker.likes = likes;
      state.markers = [
        ...state.markers.slice(0, index),
        marker,
        ...state.markers.slice(index + 1)
      ];
    }
    
    // 更新userMarkers数组中的标记点赞数
    const userIndex = state.userMarkers.findIndex(m => m._id === id);
    if (userIndex !== -1) {
      const marker = { ...state.userMarkers[userIndex] };
      marker.likes = likes;
      state.userMarkers = [
        ...state.userMarkers.slice(0, userIndex),
        marker,
        ...state.userMarkers.slice(userIndex + 1)
      ];
    }
    
    // 如果当前选中的标记是被更新的标记，也更新它的点赞数
    if (state.selectedMarker && state.selectedMarker._id === id) {
      state.selectedMarker = { ...state.selectedMarker, likes };
    }
  }
};

export default {
  state,
  getters,
  actions,
  mutations
}; 