# 遛宠派项目开发规则文档

[[toc]]

::: tip 文档说明
本文档定义了遛宠派项目的开发规范和流程，所有开发人员必须遵循。
:::

## 项目架构概述

### 整体结构
::: info 系统架构
- **前端应用端**：基于uni-app开发的移动应用
- **后台管理系统**：基于Vue 3 + Element Plus的Web管理系统
- **后端服务**：
  - 5000端口：服务于前端应用端的API服务
  - 5001端口：服务于后台管理系统的API服务
:::

## 技术栈

:::: tabs

@tab 前端应用
- **框架**: uni-app
- **状态管理**: Pinia
- **UI库**: uni-ui
- **网络请求**: uni.request封装

@tab 后台管理系统  
- **框架**: Vue 3
- **状态管理**: Pinia
- **UI库**: Element Plus
- **路由**: Vue Router
- **网络请求**: Axios

@tab 后端服务
- **框架**: Express.js
- **数据库**: MongoDB
- **认证**: JWT
- **文件存储**: 本地文件系统
- **中间件**: CORS, Morgan, Body-parser
::::

## 前端应用端 (uni-app)

### 目录结构
```
根目录
├── pages/               # 页面目录
│   ├── index/           # 首页相关
│   ├── map/             # 地图功能
│   ├── community/       # 社区功能
│   ├── profile/         # 用户资料
│   ├── pet/             # 宠物管理
│   ├── walk/            # 遛狗记录
│   └── ...
├── components/          # 通用组件
├── utils/               # 工具函数
│   ├── request.js       # 网络请求封装
│   ├── auth.js          # 认证相关
│   └── ...
├── api/                 # API接口封装
├── stores/              # Pinia状态管理
├── config/              # 全局配置
│   └── index.js         # 配置中心
├── static/              # 静态资源
├── pages.json           # 页面配置
└── App.vue              # 应用入口
```

### 编码规范

::: details 命名规范
- 文件名：使用kebab-case (如：`user-profile.vue`)
- 组件名：使用PascalCase (如：`UserProfile`)
- 变量/方法：使用camelCase (如：`getUserInfo`)
:::

::: details 样式规范
- 使用SCSS预处理器
- 组件样式使用scoped属性避免全局污染
- 通用样式放在`uni.scss`中集中管理
:::

::: details API调用规范
- 所有API调用必须通过`/api`模块集中管理
- 使用`utils/request.js`中的封装方法进行网络请求
:::

## 后台管理系统 (Vue 3 + Element Plus)

### 目录结构
```
admin/
├── src/
│   ├── api/             # API接口
│   ├── assets/          # 静态资源
│   ├── components/      # 通用组件
│   ├── router/          # 路由配置
│   ├── utils/           # 工具函数
│   ├── views/           # 页面视图
│   ├── App.vue          # 应用入口
│   └── main.js          # 主入口
└── package.json         # 依赖配置
```

### 编码规范

::: card 命名规范
- 文件名：使用kebab-case (如：`user-management.vue`)
- 组件名：使用PascalCase (如：`UserManagement`)
- 变量/方法：使用camelCase
:::

::: card 组件开发
- 使用组合式API (Composition API)
- 使用`<script setup>`简化组件结构
- 页面级组件放在`views`目录，通用组件放在`components`目录
:::

::: card 状态管理
- 使用Pinia进行状态管理
- 按功能模块拆分store
:::

## 后端服务 (Express + MongoDB)

### 目录结构
```
backend/
├── src/
│   ├── config/          # 配置文件
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── middleware/      # 中间件
│   ├── routes/          # 路由定义
│   ├── utils/           # 工具函数
│   └── server.js        # 服务入口
├── uploads/             # 上传文件存储
└── package.json         # 依赖配置
```

### 编码规范

:::: details 命名与设计规范

@tab 命名规范
- 文件名：使用camelCase (如：`userController.js`)
- 变量/方法：使用camelCase
- 类名：使用PascalCase (如：`UserModel`)
- 路由路径：使用kebab-case (如：`/api/user-profiles`)

@tab API设计
- RESTful风格API设计
- URL路径使用复数名词 (如：`/api/users`)
- 使用HTTP方法表示操作 (GET, POST, PUT, DELETE)
- 统一的响应格式

@tab 错误处理
- 使用统一的错误处理中间件
- 明确的HTTP状态码
- 详细的错误信息（开发环境）或安全的错误信息（生产环境）

@tab 安全规范
- 使用JWT进行身份验证
- 敏感信息加密存储
- 使用CORS保护API
- 实施速率限制
::::

## API接口规范

::: warning 重要提示
所有API接口必须遵循统一的请求和响应格式，便于前端统一处理。
:::

### 请求格式
- URL前缀：`/api`
- 后台管理API前缀：`/api/admin`

### 响应格式
```json
{
  "success": true/false,
  "code": 0,          // 0表示成功，其他值表示错误码
  "message": "操作成功/错误信息",
  "data": {}          // 响应数据
}
```

### 错误码规范
| 错误码范围 | 类型 | 描述 |
|----------|------|------|
| 0 | 成功 | 操作成功 |
| 1000-1999 | 通用错误 | 参数错误、请求格式错误等 |
| 2000-2999 | 用户错误 | 登录失败、权限不足等 |
| 3000-3999 | 权限错误 | 资源不存在、资源已存在等 |
| 4000-4999 | 业务错误 | 业务逻辑错误 |
| 5000-5999 | 系统错误 | 服务器内部错误、数据库错误等 |

## 数据库规范

::: info MongoDB设计规范
### MongoDB集合命名
- 使用复数名词，小写 (如：`users`, `pets`, `posts`)
- 多词使用下划线连接 (如：`walk_records`)

### 字段命名
- 使用camelCase
- 主键统一使用`_id`
- 外键命名为关联集合的单数名词_id (如：`user_id`, `pet_id`)
:::

## 版本控制规范

### 分支管理
::: card 分支策略
- `main`: 主分支，保持稳定可发布状态
- `develop`: 开发分支，用于集成开发中的功能
- `feature/xxx`: 功能分支，用于开发新功能
- `bugfix/xxx`: 错误修复分支
- `release/x.x.x`: 发布分支
:::

### 提交信息规范
::: details Commit Message格式
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码风格修改
- refactor: 代码重构
- perf: 性能优化
- test: 测试相关
- chore: 构建过程或辅助工具变动
:::

## 部署环境

:::: tabs
@tab 环境区分
- 开发环境 (Development)
- 测试环境 (Testing)
- 生产环境 (Production)

@tab 环境变量
- `NODE_ENV`: 环境标识
- `MONGODB_URI`: 数据库连接
- `PORT`: 应用端API端口 (默认5000)
- `ADMIN_PORT`: 管理端API端口 (默认5001)
- `JWT_SECRET`: JWT密钥
::::

## 开发流程

::: timeline 开发流程
1. **需求分析**
   - 明确需求边界和验收标准
   - 设计UI/UX原型

2. **任务分解**
   - 将需求拆分为可执行的开发任务
   - 分配任务和时间估计

3. **开发实现**
   - 按分支规范创建功能分支
   - 实现功能并编写单元测试

4. **代码审查**
   - 提交PR/MR请求
   - 至少一名团队成员进行代码审查

5. **测试验证**
   - 功能测试
   - UI/UX测试
   - 性能测试（如需要）

6. **发布上线**
   - 版本打包
   - 部署流程
   - 监控和回滚机制
:::

## 持续集成/持续部署

:::: tabs
@tab CI流程
- 代码提交触发自动构建
- 运行单元测试和集成测试
- 代码质量检查

@tab CD流程
- 测试通过后自动部署到测试环境
- 手动触发生产环境部署
- 灰度发布策略
::::

## 文档管理

::: note 文档规范
所有项目文档统一放在`/docs`目录下，包括：
- 项目架构文档
- API接口文档
- 数据库设计文档
- 部署文档
- 开发规范文档
:::

## 性能优化指南

:::: tabs
@tab 前端优化
- 资源按需加载
- 图片优化（压缩、懒加载）
- 组件缓存
- 虚拟列表

@tab 后端优化
- 数据库索引设计
- 缓存策略
- 请求合并
- 分页查询

@tab 移动端优化
- 减少网络请求
- 离线数据缓存
- 减少页面重绘
:::: 