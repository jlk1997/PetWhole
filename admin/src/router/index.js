import { createRouter, createWebHistory } from 'vue-router'

// 布局组件
const Layout = () => import('@/views/layout/index.vue')

// 路由配置
const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', hidden: true }
  },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '仪表盘', icon: 'Menu' }
      }
    ]
  },
  // 导航首页也指向仪表盘
  {
    path: '/dashboard',
    component: Layout,
    redirect: '/dashboard',
    meta: { hidden: true },
    children: [
      {
        path: '',
        name: 'DashboardAlias',
        component: () => import('@/views/dashboard/index.vue')
      }
    ]
  },
  {
    path: '/icons',
    component: Layout,
    redirect: '/icons/index',
    children: [
      {
        path: 'index',
        name: 'Icons',
        component: () => import('@/views/icons/index.vue'),
        meta: { title: '图标管理', icon: 'el-icon-picture' }
      }
    ]
  },
  {
    path: '/merchants',
    component: Layout,
    redirect: '/merchants/list',
    meta: { title: '商家管理', icon: 'el-icon-s-shop' },
    children: [
      {
        path: 'list',
        name: 'MerchantList',
        component: () => import('@/views/merchants/list.vue'),
        meta: { title: '商家列表' }
      },
      {
        path: 'add',
        name: 'MerchantAdd',
        component: () => import('@/views/merchants/edit.vue'),
        meta: { title: '添加商家' }
      },
      {
        path: 'edit/:id',
        name: 'MerchantEdit',
        component: () => import('@/views/merchants/edit.vue'),
        meta: { title: '编辑商家', hidden: true }
      }
    ]
  },
  {
    path: '/posts',
    component: Layout,
    redirect: '/posts/list',
    meta: { title: '社区管理', icon: 'el-icon-s-comment' },
    children: [
      {
        path: 'list',
        name: 'PostList',
        component: () => import('@/views/posts/list.vue'),
        meta: { title: '帖子列表' }
      },
      {
        path: 'detail/:id',
        name: 'PostDetail',
        component: () => import('@/views/posts/detail.vue'),
        meta: { title: '帖子详情', hidden: true }
      }
    ]
  },
  {
    path: '/markers',
    component: Layout,
    redirect: '/markers/list',
    meta: { title: '标记管理', icon: 'el-icon-location-information' },
    children: [
      {
        path: 'list',
        name: 'MarkerList',
        component: () => import('@/views/markers/list.vue'),
        meta: { title: '标记列表' }
      },
      {
        path: 'map',
        name: 'MarkerMap',
        component: () => import('@/views/markers/map.vue'),
        meta: { title: '地图视图' }
      }
    ]
  },
  {
    path: '/users',
    component: Layout,
    redirect: '/users/list',
    meta: { title: '用户管理', icon: 'el-icon-user' },
    children: [
      {
        path: 'list',
        name: 'UserList',
        component: () => import('@/views/users/list.vue'),
        meta: { title: '用户列表' }
      },
      {
        path: 'detail/:id',
        name: 'UserDetail',
        component: () => import('@/views/users/detail.vue'),
        meta: { title: '用户详情', hidden: true }
      }
    ]
  },
  {
    path: '/pets',
    component: Layout,
    redirect: '/pets/list',
    meta: { title: '宠物管理', icon: 'el-icon-s-goods' },
    children: [
      {
        path: 'list',
        name: 'PetList',
        component: () => import('@/views/pets/list.vue'),
        meta: { title: '宠物列表' }
      }
    ]
  },
  {
    path: '/system',
    component: Layout,
    redirect: '/system/admin',
    meta: { title: '系统管理', icon: 'el-icon-s-tools' },
    children: [
      {
        path: 'admin',
        name: 'AdminList',
        component: () => import('@/views/system/admin.vue'),
        meta: { title: '管理员列表' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/system/settings.vue'),
        meta: { title: '系统设置' }
      }
    ]
  },
  {
    path: '/story',
    component: Layout,
    redirect: '/story/plots',
    meta: { title: '剧情策划', icon: 'el-icon-film' },
    children: [
      {
        path: 'plots',
        name: 'StoryPlots',
        component: () => import('@/views/story/plots.vue'),
        meta: { title: '剧情列表' }
      },
      {
        path: 'plots/create',
        name: 'CreatePlot',
        component: () => import('@/views/story/plot-edit.vue'),
        meta: { title: '创建剧情', hidden: true }
      },
      {
        path: 'plots/:id',
        name: 'PlotDetail',
        component: () => import('@/views/story/plot-detail.vue'),
        meta: { title: '剧情详情', hidden: true }
      },
      {
        path: 'plots/:id/edit',
        name: 'EditPlot',
        component: () => import('@/views/story/plot-edit.vue'),
        meta: { title: '编辑剧情', hidden: true }
      },
      {
        path: 'chapters/:id',
        name: 'ChapterDetail',
        component: () => import('@/views/story/chapter-detail.vue'),
        meta: { title: '章节详情', hidden: true }
      },
      {
        path: 'events/:id',
        name: 'EventDetail',
        component: () => import('@/views/story/event-detail.vue'),
        meta: { title: '事件详情', hidden: true }
      },
      {
        path: 'stats',
        name: 'StoryStats',
        component: () => import('@/views/story/stats.vue'),
        meta: { title: '剧情统计' }
      }
    ]
  },
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/error/404.vue'),
    meta: { hidden: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - DogRun管理系统` : 'DogRun管理系统'
  
  // 判断是否登录
  const isLoggedIn = localStorage.getItem('token')
  
  if (to.path !== '/login' && !isLoggedIn) {
    next('/login')
  } else {
    next()
  }
})

export default router 