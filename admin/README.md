# DogRun 后台管理系统

这是 DogRun 应用的后台管理系统，用于管理图标、地图标记、商家入驻、社区帖子等内容。

## 功能特性

- 完整的管理员权限系统
- 仪表盘数据统计与可视化
- 图标管理（支持上传、替换、删除）
- 地图标记管理（地图展示、标记审核）
- 商家入驻管理（商家审核、信息维护）
- 社区帖子管理（内容审核、评论管理）
- 用户管理（账号管理、封禁处理）
- 系统设置（全局配置项）

## 技术栈

- 前端：Vue 3 + Vite + Element Plus
- 状态管理：Pinia
- 路由：Vue Router
- HTTP客户端：Axios
- 图表：ECharts
- CSS预处理器：SCSS

## 项目结构

```
admin/
│
├── public/                # 静态资源
├── src/
│   ├── api/               # API请求模块
│   │   ├── index.js           # API基础配置
│   │   └── modules/           # 不同模块的API
│   │
│   ├── assets/            # 资源文件（图片、样式等）
│   │   └── styles/            # 全局样式
│   │
│   ├── components/        # 全局组件
│   ├── router/            # 路由配置
│   ├── store/             # Pinia状态管理
│   ├── utils/             # 工具函数
│   ├── views/             # 页面组件
│   │   ├── dashboard/         # 仪表盘
│   │   ├── icons/             # 图标管理
│   │   ├── login/             # 登录页面
│   │   ├── markers/           # 标记管理
│   │   ├── merchants/         # 商家管理
│   │   ├── posts/             # 帖子管理
│   │   ├── users/             # 用户管理
│   │   └── system/            # 系统设置
│   │
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
│
├── index.html             # HTML模板
├── package.json           # 依赖配置
└── vite.config.js         # Vite配置
```

## 开发指南

### 环境要求

- Node.js 16+
- npm 7+ 或 yarn 1.22+

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 构建生产版本

```bash
npm run build
# 或
yarn build
```

### 预览生产构建

```bash
npm run preview
# 或
yarn preview
```

## 部署指南

1. 构建项目
```bash
npm run build
```

2. 将 `dist` 目录下的文件部署到 Web 服务器
3. 配置 Web 服务器（如 Nginx）的反向代理，将 `/api` 路径指向后端服务

## 接口文档

管理系统的 API 接口文档请参考：[管理系统API文档](../backend/docs/admin-api.md)

## 管理员账号

初始管理员账号信息：
- 用户名：admin
- 密码：admin123

**请在首次登录后立即修改默认密码！**

## 许可证

该项目遵循 [MIT 许可证](LICENSE)。 