import { defineStore } from 'pinia'
import { usePetStore } from './pet.js'
// 导入API
import api from '../utils/api.js'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: uni.getStorageSync('token') || null,
    loading: false,
    error: null,
    stats: null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    userAvatar: (state) => {
      if (!state.user) return ''
      return state.user.avatar || '/static/images/default-avatar.png'
    },
    userId: (state) => state.user?._id || state.user?.id || '',
    nickname: (state) => state.user?.nickname || state.user?.username || '游客'
  },

  actions: {
    // 登录
    async login(username, password) {
      try {
        this.loading = true
        this.error = null
        
        const response = await api.user.login(username, password)
        console.log('登录响应:', response)
        
        if (response && response.token) {
          // 保存token到本地
          uni.setStorageSync('token', response.token)
          
          // 如果响应中包含用户信息，保存用户信息
          if (response.user) {
            // 确保用户信息中包含gender字段
            const userInfo = { ...response.user };
            if (!userInfo.gender) {
              console.warn('登录响应中用户信息没有gender字段，设置为默认值unknown');
              userInfo.gender = 'unknown';
            }
            
            this.user = userInfo;
            uni.setStorageSync('userInfo', JSON.stringify(userInfo))
            console.log('登录成功，用户信息已保存:', {
              user: this.user,
              gender: this.user.gender
            })
          } else {
            // 如果登录响应中没有用户信息，调用获取用户信息接口
            console.log('登录响应中无用户信息，获取用户信息');
            await this.fetchUserInfo()
          }
          
          return true
        }
        
        this.error = '登录失败，请检查用户名和密码'
        return false
      } catch (error) {
        console.error('登录失败:', error)
        this.error = '登录失败，请检查网络连接'
        return false
      } finally {
        this.loading = false
      }
    },

    // 注册
    async register(userData) {
      try {
        this.loading = true
        this.error = null
        const response = await api.auth.register(userData)
        return response
      } catch (error) {
        console.error('注册失败:', error)
        this.error = error.message || '注册失败，请稍后再试'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 获取用户信息
    async fetchUserInfo() {
      try {
        console.log('开始获取用户信息');
        this.loading = true
        this.error = null
        
        // 获取本地存储中的可能存在的用户信息作为备份
        let localUserInfo = null;
        try {
          const storedUserInfo = uni.getStorageSync('userInfo');
          if (storedUserInfo) {
            localUserInfo = JSON.parse(storedUserInfo);
            console.log('已获取本地存储的用户信息用于备份:', localUserInfo);
          }
        } catch (err) {
          console.warn('读取本地用户信息失败:', err);
        }
        
        // 从API获取用户信息
        const response = await api.user.getCurrentUser()
        console.log('从API获取到的用户信息:', response);
        
        if (response) {
          // 确保关键字段存在
          const userInfo = { ...response };
          
          // 如果API响应中缺少gender字段，但本地存储中有，则使用本地存储的值
          if (!userInfo.gender && localUserInfo && localUserInfo.gender) {
            console.warn('API响应中缺少gender字段，使用本地存储的值:', localUserInfo.gender);
            userInfo.gender = localUserInfo.gender;
          } else if (!userInfo.gender) {
            // 如果没有gender字段，设置为默认值
            console.warn('没有找到gender字段，设置为默认值unknown');
            userInfo.gender = 'unknown';
          }
          
          // 更新state和本地存储
          this.user = userInfo;
          uni.setStorageSync('userInfo', JSON.stringify(userInfo));
          
          console.log('最终更新后的用户信息，确认性别字段存在:', {
            user: this.user,
            gender: this.user.gender
          });
          
          return userInfo;
        } else {
          // 如果API返回为空但有本地信息，使用本地信息
          if (localUserInfo) {
            console.warn('API返回为空，使用本地用户信息:', localUserInfo);
            this.user = localUserInfo;
            return localUserInfo;
          }
          
          throw new Error('获取用户信息失败，返回为空');
        }
      } catch (error) {
        console.error('获取用户信息失败:', error)
        this.error = '获取用户信息失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 更新用户信息
    async updateUserInfo(userData) {
      try {
        this.loading = true
        this.error = null
        
        // 确保userData包含所有必要字段
        const completeUserData = {
          ...userData,
          // 确保明确包含这些字段，即使是空字符串
          phone: userData.phone !== undefined ? userData.phone : '',
          gender: userData.gender || 'unknown' // 确保gender字段总是存在
        };
        
        console.log('发送到服务器的完整用户数据，特别关注性别字段:', completeUserData);
        
        // 先尝试使用updateFullProfile方法
        let response = null
        try {
          // 添加请求拦截器，在发送请求前检查数据
          console.log('使用特殊API更新用户前的数据检查:', {
            gender: completeUserData.gender,
            phone: completeUserData.phone
          });
          
          response = await api.user.updateFullProfile(completeUserData)
          console.log('使用特殊API更新用户成功:', response);
          
          // 确保响应包含gender字段
          if (response && !response.gender && completeUserData.gender) {
            console.warn('响应中缺少gender字段，手动添加');
            response.gender = completeUserData.gender;
          }
        } catch (specialError) {
          console.warn('特殊API调用失败，使用标准API:', specialError)
          // 如果特殊方法失败，使用标准updateProfile方法
          response = await api.user.updateProfile(completeUserData)
          console.log('使用标准API更新用户成功:', response);
          
          // 确保响应包含gender字段
          if (response && !response.gender && completeUserData.gender) {
            console.warn('响应中缺少gender字段，手动添加');
            response.gender = completeUserData.gender;
          }
        }
        
        // 确保响应中包含所有字段
        if (response) {
          // 保持原有用户数据字段
          const updatedUser = { ...this.user };
          
          // 更新响应中包含的字段
          Object.keys(response).forEach(key => {
            updatedUser[key] = response[key];
          });
          
          // 确保关键字段存在，即使后端没有返回
          if (!updatedUser.gender && completeUserData.gender) {
            updatedUser.gender = completeUserData.gender;
          }
          
          if (!updatedUser.phone && completeUserData.phone) {
            updatedUser.phone = completeUserData.phone;
          }
          
          // 更新到state
          this.user = updatedUser;
          
          // 本地存储用作缓存
          uni.setStorageSync('userInfo', JSON.stringify(updatedUser));
          
          console.log('最终更新后的用户数据，确认性别字段存在:', {
            user: this.user,
            gender: this.user.gender
          });
          
          return updatedUser;
        }
        
        return response;
      } catch (error) {
        console.error('更新用户信息失败:', error)
        this.error = '更新用户信息失败'
        return null;
      } finally {
        this.loading = false
      }
    },

    // 上传用户头像
    async uploadAvatar(filePath) {
      try {
        this.loading = true
        this.error = null
        
        console.log('开始上传头像:', filePath)
        
        // 直接使用API返回的数据，不需要再处理statusCode和解析JSON
        const response = await api.user.uploadAvatar(filePath)
        
        console.log('头像上传响应:', response)
        
        // 更新用户头像
        if (response && response.data && response.data.avatar) {
          if (this.user) {
            this.user.avatar = response.data.avatar
            // 保存到本地存储
            uni.setStorageSync('userInfo', JSON.stringify(this.user))
            console.log('用户头像已更新:', this.user.avatar)
          }
        } else if (response && response.avatar) {
          // 处理直接返回avatar字段的情况
          if (this.user) {
            this.user.avatar = response.avatar
            // 保存到本地存储
            uni.setStorageSync('userInfo', JSON.stringify(this.user))
            console.log('用户头像已更新(直接返回):', this.user.avatar)
          }
        }
        
        // 返回规范化的数据
        return response.data || response
      } catch (error) {
        console.error('上传头像失败:', error)
        this.error = '上传头像失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 获取用户统计信息
    async fetchUserStats(userId) {
      try {
        this.loading = true
        this.error = null
        const id = userId || (this.user ? this.user._id : null)
        if (!id) {
          return null
        }
        
        // 修正API路径为 /api/users/stats/me 或 /api/users/:id
        const response = userId 
          ? await api.user.getUserStats(userId)
          : await api.user.getUserStats();
        
        // 如果是当前用户，更新stats
        if (!userId || (this.user && this.user._id === userId)) {
          this.stats = response
        }
        
        return response
      } catch (error) {
        console.error('获取用户统计信息失败:', error)
        this.error = '获取用户统计信息失败'
        return null
      } finally {
        this.loading = false
      }
    },

    // 关注用户
    async followUser(userId) {
      try {
        this.loading = true
        this.error = null
        const response = await api.user.followUser(userId)
        // 更新统计信息
        if (this.stats) {
          this.stats.followingCount += 1
        }
        return response
      } catch (error) {
        console.error('关注用户失败:', error)
        this.error = '关注用户失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 取消关注用户
    async unfollowUser(userId) {
      try {
        this.loading = true
        this.error = null
        const response = await api.user.unfollowUser(userId)
        // 更新统计信息
        if (this.stats && this.stats.followingCount > 0) {
          this.stats.followingCount -= 1
        }
        return response
      } catch (error) {
        console.error('取消关注用户失败:', error)
        this.error = '取消关注用户失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 修改密码
    async changePassword(passwordData) {
      try {
        this.loading = true
        this.error = null
        const response = await api.user.changePassword(passwordData)
        return response
      } catch (error) {
        console.error('修改密码失败:', error)
        this.error = '修改密码失败'
        throw error
      } finally {
        this.loading = false
      }
    },

    // 退出登录
    async logout() {
      try {
        this.loading = true
        // 不再调用API端点，因为服务端不支持
        return true;
      } catch (error) {
        console.error('退出登录失败:', error)
        throw error;
      } finally {
        // 清除用户信息和token
        this.user = null
        this.token = null
        this.stats = null
        this.error = null
        
        // 清除本地存储
        uni.removeStorageSync('token')
        uni.removeStorageSync('userInfo')
        
        // 清除宠物数据
        const petStore = usePetStore()
        petStore.clearPets()
        
        this.loading = false
      }
    },

    // 初始化用户状态
    async init() {
      try {
        // 如果有token，获取用户信息
        if (this.token) {
          // 先尝试从本地存储获取用户信息
          const storedUserInfo = uni.getStorageSync('userInfo');
          if (storedUserInfo) {
            try {
              const parsedUserInfo = JSON.parse(storedUserInfo);
              // 先加载缓存的用户信息，确保UI立即有数据显示
              if (parsedUserInfo && parsedUserInfo._id) {
                this.user = parsedUserInfo;
                console.log('已从本地存储加载用户信息:', this.user);
              }
            } catch (e) {
              console.error('解析存储的用户信息失败:', e);
            }
          }
          
          // 然后从服务器获取最新的用户信息
          const userInfo = await this.fetchUserInfo();
          
          // 如果成功获取用户信息，获取用户统计数据
          if (this.user) {
            try {
              await this.fetchUserStats();
            } catch (error) {
              console.warn('获取用户统计数据失败，继续初始化流程:', error);
            }
            
            // 获取用户的宠物
            try {
              const petStore = usePetStore();
              await petStore.fetchPets();
            } catch (error) {
              console.warn('获取宠物列表失败，继续初始化流程:', error);
            }
          }
        }
      } catch (error) {
        console.error('用户初始化失败:', error);
        // 清除可能无效的token
        this.token = null;
        uni.removeStorageSync('token');
      }
    },
    
    // 更新用户当前位置
    async updateLocation(location) {
      try {
        this.currentLocation = location;
        // 调用位置API更新位置
        if (this.token) {
          await api.location.updateLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: new Date().toISOString()
          });
        }
        return location;
      } catch (error) {
        console.error('更新位置失败:', error);
        return null;
      }
    }
  }
}) 