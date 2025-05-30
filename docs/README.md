# 遛宠派 (DogRun) 项目

::: hero
遛宠派是一个基于位置服务的宠物社交平台，帮助宠物主人记录遛宠活动、分享宠物故事，并在同一区域与其他宠物主人互动。
:::

## 项目架构

::: card
- **前端应用端**：基于uni-app开发，支持多端部署
- **后台管理系统**：基于Vue 3和Element Plus开发
- **后端服务**：
  - 应用API服务 (5000端口)
  - 管理系统API服务 (5001端口)
:::

## 快速入门

:::: tabs

@tab 前端应用开发
```bash
# 安装依赖
npm install

# 开发模式运行
npm run dev

# H5模式运行
npm run dev:h5

# 构建
npm run build:h5
```

@tab 后台管理系统开发
```bash
# 进入admin目录
cd admin

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建
npm run build
```

@tab 后端服务开发
```bash
# 进入backend目录
cd backend

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 生产模式运行
npm run start
```
::::

## 环境要求

::: info 基础环境
- Node.js v14.0+
- MongoDB v4.4+
- npm v6.0+
:::

## 项目结构

::: details 目录结构
```
根目录
├── admin/              # 后台管理系统
├── backend/            # 后端服务
├── pages/              # 前端应用页面
├── components/         # 前端通用组件
├── utils/              # 工具函数
├── api/                # API接口封装
├── config/             # 全局配置
└── docs/               # 项目文档
    ├── development-rules.md  # 开发规则
    └── README.md             # 项目说明
```
:::

## 开发规范

::: tip
详细的开发规范请参考 [开发规则文档](./development-rules.md)。
:::

## 主要功能

:::: grid 3
::: grid-item
#### 用户系统
- 用户注册/登录
- 个人资料管理
- 消息通知
:::

::: grid-item
#### 宠物管理
- 宠物信息维护
- 宠物档案
- 宠物社交卡片
:::

::: grid-item
#### 遛宠记录
- 轨迹记录
- 统计分析
- 记录分享
:::

::: grid-item
#### 社区互动
- 动态发布
- 评论互动
- 话题讨论
:::

::: grid-item
#### 地图服务
- 附近宠物
- 宠物设施标记
- 路线规划
:::

::: grid-item
#### 管理功能
- 用户管理
- 内容审核
- 数据统计
- 系统配置
:::
::::

## 联系方式

::: note 联系信息
如有任何问题或建议，请通过以下方式联系：

- 项目维护人员：[联系邮箱]
- 项目仓库：[仓库地址] 