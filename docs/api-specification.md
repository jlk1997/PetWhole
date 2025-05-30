# 遛宠派 API 接口规范

[[toc]]

::: warning 注意
本文档定义了项目API接口的统一规范，所有接口开发必须遵循。
:::

## 基础信息

::: info 服务地址
- **基础URL**:
  - 应用API: `http://49.235.65.37:5000/api`
  - 管理API: `http://49.235.65.37:5001/api`

- **API版本**:
  - 当前版本: v1
  - 版本在URL中不体现，通过响应头`Api-Version`标识
:::

## 身份认证

:::: code-group
::: code-group-item 认证头
```
Authorization: Bearer <token>
```
:::
::::

## 响应格式

:::: code-group
::: code-group-item 成功响应
```json
{
  "success": true,          // 布尔值，表示请求是否成功
  "code": 0,                // 数字，0表示成功，其他值表示错误码
  "message": "操作成功",     // 字符串，请求结果描述
  "data": {                 // 对象或数组，响应数据
    // 实际数据
  }
}
```
:::

::: code-group-item 错误响应
```json
{
  "success": false,
  "code": 1001,
  "message": "参数验证失败",
  "errors": [              // 错误详情（仅在需要时出现）
    {
      "field": "email",
      "message": "邮箱格式不正确"
    }
  ]
}
```
:::
::::

## 错误码规范

::: table
| 错误码范围 | 类型 | 描述 |
|----------|------|------|
| 0 | 成功 | 操作成功 |
| 1000-1999 | 通用错误 | 参数错误、请求格式错误等 |
| 2000-2999 | 用户错误 | 登录失败、权限不足等 |
| 3000-3999 | 资源错误 | 资源不存在、资源已存在等 |
| 4000-4999 | 业务错误 | 业务逻辑错误 |
| 5000-5999 | 系统错误 | 服务器内部错误、数据库错误等 |
:::

## 分页参数

::: details 分页查询示例
```
GET /api/resources?page=1&limit=10&sort=createdAt:desc
```

分页响应格式:

```json
{
  "success": true,
  "code": 0,
  "message": "操作成功",
  "data": {
    "items": [],          // 当前页数据
    "total": 100,         // 总记录数
    "page": 1,            // 当前页码
    "limit": 10,          // 每页条数
    "pages": 10           // 总页数
  }
}
```
:::

## 常用HTTP方法

::: table
| 方法 | 描述 | 示例 |
|------|------|------|
| GET | 获取资源 | GET /api/users/123 |
| POST | 创建资源 | POST /api/users |
| PUT | 全量更新资源 | PUT /api/users/123 |
| PATCH | 部分更新资源 | PATCH /api/users/123 |
| DELETE | 删除资源 | DELETE /api/users/123 |
:::

## 接口文档

:::: tabs

@tab 用户相关接口

::: details 注册用户
**请求**
```
POST /api/users/register
```

**参数**
```json
{
  "username": "user123",
  "email": "user@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "用户注册成功",
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "username": "user123",
      "email": "user@example.com",
      "createdAt": "2023-11-01T12:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
:::

::: details 用户登录
**请求**
```
POST /api/users/login
```

**参数**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "登录成功",
  "data": {
    "user": {
      "_id": "60d21b4667d0d8992e610c85",
      "username": "user123",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
:::

@tab 宠物相关接口

::: details 获取宠物列表
**请求**
```
GET /api/pets
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取宠物列表成功",
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c86",
      "name": "小白",
      "breed": "拉布拉多",
      "age": 3,
      "gender": "male",
      "avatar": "uploads/pets/avatar1.jpg",
      "user": "60d21b4667d0d8992e610c85",
      "createdAt": "2023-11-01T12:00:00Z"
    }
  ]
}
```
:::

::: details 添加宠物
**请求**
```
POST /api/pets
```

**参数**
```json
{
  "name": "小白",
  "breed": "拉布拉多",
  "age": 3,
  "gender": "male",
  "description": "一只活泼可爱的拉布拉多"
}
```
:::

@tab 遛宠记录接口

::: details 获取遛宠记录
**请求**
```
GET /api/walks
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取遛宠记录成功",
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c87",
      "user": "60d21b4667d0d8992e610c85",
      "pet": "60d21b4667d0d8992e610c86",
      "duration": 30,
      "distance": 1.5,
      "startTime": "2023-11-01T10:00:00Z",
      "endTime": "2023-11-01T10:30:00Z",
      "path": [
        {
          "latitude": 39.9042, 
          "longitude": 116.4074,
          "timestamp": "2023-11-01T10:00:00Z"
        },
        // 更多坐标点...
      ],
      "createdAt": "2023-11-01T10:30:00Z"
    }
  ]
}
```
:::

::: details 添加遛宠记录
**请求**
```
POST /api/walks
```

**参数**
```json
{
  "pet": "60d21b4667d0d8992e610c86",
  "duration": 30,
  "distance": 1.5,
  "startTime": "2023-11-01T10:00:00Z",
  "endTime": "2023-11-01T10:30:00Z",
  "path": [
    {
      "latitude": 39.9042, 
      "longitude": 116.4074,
      "timestamp": "2023-11-01T10:00:00Z"
    },
    // 更多坐标点...
  ]
}
```
:::

@tab 社区相关接口

::: details 获取社区动态
**请求**
```
GET /api/community/posts
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取动态列表成功",
  "data": {
    "items": [
      {
        "_id": "60d21b4667d0d8992e610c88",
        "user": {
          "_id": "60d21b4667d0d8992e610c85",
          "username": "user123",
          "avatar": "uploads/users/avatar1.jpg"
        },
        "content": "今天带小白去公园玩，它很开心！",
        "images": [
          "uploads/community/image1.jpg",
          "uploads/community/image2.jpg"
        ],
        "likes": 10,
        "comments": 5,
        "createdAt": "2023-11-01T12:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```
:::

::: details 发布动态
**请求**
```
POST /api/community/posts
```

**参数**
```json
{
  "content": "今天带小白去公园玩，它很开心！",
  "images": [
    "base64编码的图片1",
    "base64编码的图片2"
  ],
  "location": {
    "name": "中央公园",
    "latitude": 39.9042,
    "longitude": 116.4074
  },
  "pets": ["60d21b4667d0d8992e610c86"]
}
```
:::

@tab 地图相关接口

::: details 获取附近宠物
**请求**
```
GET /api/locations/nearby?latitude=39.9042&longitude=116.4074&radius=1000
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取附近宠物成功",
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c89",
      "user": {
        "_id": "60d21b4667d0d8992e610c85",
        "username": "user123"
      },
      "pet": {
        "_id": "60d21b4667d0d8992e610c86",
        "name": "小白",
        "breed": "拉布拉多",
        "avatar": "uploads/pets/avatar1.jpg"
      },
      "location": {
        "latitude": 39.9045,
        "longitude": 116.4080
      },
      "lastUpdated": "2023-11-01T12:30:00Z"
    }
  ]
}
```
:::

::: details 获取位置标记
**请求**
```
GET /api/markers?latitude=39.9042&longitude=116.4074&radius=1000&types=park,hospital
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取标记成功",
  "data": [
    {
      "_id": "60d21b4667d0d8992e610c90",
      "name": "宠物公园",
      "type": "park",
      "description": "一个适合遛狗的公园",
      "location": {
        "latitude": 39.9055,
        "longitude": 116.4060
      },
      "rating": 4.5,
      "reviews": 20,
      "images": ["uploads/markers/park1.jpg"]
    }
  ]
}
```
:::

@tab 管理后台接口

::: tip 管理接口说明
所有管理后台接口都有`/api/admin`前缀。
:::

::: details 管理员登录
**请求**
```
POST /api/admin/login
```

**参数**
```json
{
  "username": "admin",
  "password": "Admin123!"
}
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "登录成功",
  "data": {
    "admin": {
      "_id": "60d21b4667d0d8992e610c91",
      "username": "admin",
      "role": "superadmin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn..."
  }
}
```
:::

::: details 获取用户列表(管理)
**请求**
```
GET /api/admin/users?page=1&limit=10
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "获取用户列表成功",
  "data": {
    "items": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "username": "user123",
        "email": "user@example.com",
        "status": "active",
        "petsCount": 2,
        "postsCount": 15,
        "createdAt": "2023-11-01T12:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "limit": 10,
    "pages": 10
  }
}
```
:::

::::

## 文件上传

::: card
### 上传用户头像

**请求**
```
POST /api/users/avatar
```

**请求头**
```
Content-Type: multipart/form-data
```

**请求参数**
```
avatar: (文件)
```

**响应**
```json
{
  "success": true,
  "code": 0,
  "message": "头像上传成功",
  "data": {
    "avatarUrl": "uploads/users/avatar123.jpg"
  }
}
```
:::

## Websocket接口

::: tip
WebSocket接口用于实时通信，如聊天、状态更新等。
:::

::: details 实时聊天
**连接**
```
WebSocket: ws://49.235.65.37:5000/ws/chat
```

**连接参数**
```
token: JWT认证令牌
```

**消息格式**
```json
{
  "type": "message",
  "data": {
    "receiver": "60d21b4667d0d8992e610c85",
    "content": "你好，想约个遛狗时间吗？",
    "contentType": "text"
  }
}
```
:::

## API调用最佳实践

:::: grid 2

::: grid-item
### 错误处理
- 始终检查响应中的`success`字段
- 根据`code`和`message`处理不同类型的错误
:::

::: grid-item
### 认证Token
- 将token保存在安全的存储中
- 在每次需要认证的请求中携带token
- 处理token过期情况，重新登录获取新token
:::

::: grid-item
### 数据缓存
- 适当缓存不经常变化的数据
- 列表数据使用分页加载，避免一次加载全部数据
:::

::: grid-item
### 并发请求
- 使用Promise.all处理多个并发请求
- 避免过多并发请求导致性能问题
:::

::: grid-item
### 请求重试
- 对于重要请求，添加重试机制
- 避免在网络不稳定情况下导致操作失败
:::

::: grid-item
### 数据验证
- 在发送请求前对数据进行有效性验证
- 减少无效请求，提高用户体验
:::

::::

## 开发工具

::: card
推荐使用以下工具进行API开发和测试:

- [Postman](https://www.postman.com/) - API测试工具
- [Swagger UI](https://swagger.io/tools/swagger-ui/) - API文档生成和交互测试
- [API Blueprint](https://apiblueprint.org/) - API设计和文档工具
:::

## 更多信息

::: info 相关资源
如需更多API详情，请参考:

- [完整API文档](http://49.235.65.37:5000/api-docs)
- [API状态监控](http://49.235.65.37:5000/status)
- [开发规则文档](./development-rules.md)
::: 