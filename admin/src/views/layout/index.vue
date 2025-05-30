<template>
  <div class="app-container">
    <!-- 侧边栏 -->
    <div class="sidebar-container" :class="{ 'collapse': isCollapse }">
      <div class="logo-container">
        <img src="@/assets/logo.svg" class="logo" alt="Logo" />
        <span v-if="!isCollapse" class="title">DogRun管理后台</span>
      </div>
      
      <!-- 菜单 -->
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        :collapse="isCollapse"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        router
      >
        <template v-for="route in routes" :key="route.path">
          <!-- 如果当前路由不应该被隐藏 -->
          <template v-if="!route.meta || !route.meta.hidden">
            <!-- 如果该路由有子路由 -->
            <template v-if="route.children && route.children.length > 1">
              <el-sub-menu :index="route.path">
                <template #title>
                  <el-icon><component :is="route.meta?.icon || 'Menu'" /></el-icon>
                  <span>{{ route.meta?.title }}</span>
                </template>
                
                <template v-for="child in route.children" :key="child.path">
                  <el-menu-item v-if="!child.meta?.hidden" :index="route.path + '/' + child.path">
                    <span>{{ child.meta?.title }}</span>
                  </el-menu-item>
                </template>
              </el-sub-menu>
            </template>
            
            <!-- 如果该路由没有子路由或只有一个子路由 -->
            <template v-else>
              <el-menu-item :index="route.path === '/' && route.children?.[0]?.path === 'dashboard' 
                ? '/dashboard' 
                : route.path + '/' + (route.children?.[0]?.path || '')">
                <el-icon><component :is="route.children?.[0]?.meta?.icon || route.meta?.icon || 'Menu'" /></el-icon>
                <span>{{ route.children?.[0]?.meta?.title || route.meta?.title }}</span>
              </el-menu-item>
            </template>
          </template>
        </template>
      </el-menu>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="main-container" :class="{ 'collapse': isCollapse }">
      <!-- 顶部导航 -->
      <div class="navbar">
        <div class="hamburger" @click="toggleSidebar">
          <el-icon><Fold v-if="isCollapse" /><Expand v-else /></el-icon>
        </div>
        
        <div class="breadcrumb">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta?.title">{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="right-menu">
          <el-dropdown trigger="click">
            <div class="avatar-wrapper">
              <el-avatar :size="30" src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" />
              <span class="user-name">管理员</span>
              <el-icon class="el-icon-arrow-down"><arrow-down /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人信息</el-dropdown-item>
                <el-dropdown-item divided @click="handleLogout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <!-- 内容区域 -->
      <div class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="fade-transform" mode="out-in">
            <keep-alive>
              <component :is="Component" />
            </keep-alive>
          </transition>
        </router-view>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Fold, Expand, ArrowDown } from '@element-plus/icons-vue'
import { ElMessageBox, ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()

// 侧边栏折叠状态
const isCollapse = ref(false)

// 切换侧边栏展开/折叠
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

// 获取路由
const routes = computed(() => {
  return router.options.routes.filter(route => !route.meta?.hidden)
})

// 获取当前激活菜单
const activeMenu = computed(() => {
  const { path } = route;
  // 处理路径匹配，例如当在 /dashboard 路径时应该激活 /dashboard 菜单
  if (path === '/') return '/dashboard';
  if (path.startsWith('/dashboard')) return '/dashboard';
  
  // 处理子路由，例如当在 /users/detail/123 时应该激活 /users 菜单
  const mainPath = '/' + path.split('/')[1];
  return mainPath;
})

// 处理退出登录
const handleLogout = () => {
  ElMessageBox.confirm('确定要退出登录吗?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 清除本地存储的token
    localStorage.removeItem('token')
    
    // 重定向到登录页
    router.push('/login')
    
    ElMessage({
      type: 'success',
      message: '退出登录成功'
    })
  }).catch(() => {
    // 取消操作
  })
}
</script>

<style lang="scss" scoped>
.app-container {
  display: flex;
  height: 100%;
  width: 100%;
}

/* 侧边栏 */
.sidebar-container {
  width: 210px;
  height: 100%;
  background-color: #304156;
  color: #fff;
  transition: width 0.28s;
  overflow-y: auto;
  
  &.collapse {
    width: 64px;
  }
  
  .logo-container {
    display: flex;
    align-items: center;
    height: 60px;
    padding: 10px;
    background-color: #2b3a4a;
    
    .logo {
      width: 30px;
      height: 30px;
      margin-right: 10px;
    }
    
    .title {
      color: #fff;
      font-size: 16px;
      font-weight: bold;
      white-space: nowrap;
      overflow: hidden;
    }
  }
  
  .sidebar-menu {
    border-right: none;
    
    .el-menu-item, .el-sub-menu__title {
      height: 56px;
      line-height: 56px;
    }
    
    .el-icon {
      margin-right: 10px;
    }
  }
}

/* 主要内容区域 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.28s;
  margin-left: 210px;
  
  &.collapse {
    margin-left: 64px;
  }
  
  .navbar {
    height: 60px;
    display: flex;
    align-items: center;
    background-color: #fff;
    box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
    padding: 0 15px;
    
    .hamburger {
      cursor: pointer;
      font-size: 20px;
      margin-right: 15px;
    }
    
    .breadcrumb {
      flex: 1;
    }
    
    .right-menu {
      display: flex;
      align-items: center;
      
      .avatar-wrapper {
        display: flex;
        align-items: center;
        cursor: pointer;
        
        .user-name {
          margin: 0 5px;
        }
      }
    }
  }
  
  .app-main {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    background-color: #f5f7fa;
  }
}

/* 路由切换动画 */
.fade-transform-enter-active,
.fade-transform-leave-active {
  transition: all 0.3s;
}

.fade-transform-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.fade-transform-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style> 