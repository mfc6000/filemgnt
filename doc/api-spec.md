# 后端 REST API 设计

## 1. 接口总览

| 模块          | 方法   | 路径                   | 参数                                                                      | 权限                                                  | 说明                               |
| ------------- | ------ | ---------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- |
| Auth          | POST   | `/api/auth/login`      | Body：`{ username: string, password: string }`                            | 公共入口（无需 token），仅启用账号可成功              | 模拟登录，返回访问令牌与用户信息   |
| Admin · Users | GET    | `/api/admin/users`     | Query：`page`, `pageSize`, `keyword?`                                     | `admin`                                               | 分页查询用户列表                   |
| Admin · Users | POST   | `/api/admin/users`     | Body：`{ username, displayName, role, email?, password }`                 | `admin`                                               | 创建用户，默认启用                 |
| Admin · Users | PUT    | `/api/admin/users/:id` | Path：`id`; Body：`{ displayName?, role?, email?, isActive?, password? }` | `admin`                                               | 更新用户信息或状态                 |
| Admin · Users | DELETE | `/api/admin/users/:id` | Path：`id`                                                                | `admin`                                               | 软删除用户（标记禁用）             |
| Repos         | GET    | `/api/repos`           | Query：`page`, `pageSize`                                                 | 登录用户（`admin` 可查看全部，`user` 仅自己）         | 获取当前用户（或管理员）可见仓库   |
| Repos         | POST   | `/api/repos`           | Body：`{ name, description?, visibility? }`（管理员可额外传 `ownerId`）   | 登录用户                                              | 创建仓库并设置可见性               |
| Files         | GET    | `/api/repos/:id/files` | Path：`id`; Query：`page`, `pageSize`, `share?`                           | 仓库拥有者或管理员；`share=true` 文件对管理员全部可见 | 列出仓库文件                       |
| Files         | POST   | `/api/repos/:id/files` | Path：`id`; Body (multipart)：`file`, `share`, `tags?`                    | 仓库拥有者或管理员                                    | 上传文件至仓库并同步 Dify          |
| Admin · Files | GET    | `/api/admin/files`     | Query：`page`, `pageSize`, `ownerId?`, `repoId?`, `share?`, `status?`     | `admin`                                               | 跨仓库查看所有文件                 |
| Search        | GET    | `/api/search`          | Query：`q`, `repoId?`, `share?`, `page?`, `pageSize?`                     | 登录用户                                              | 调用 Dify 返回授权范围内的搜索结果 |

> **分页约定**：`page` 从 1 开始，`pageSize` 默认 20，最大 100。所有返回列表结构统一为 `{ items: T[], page, pageSize, total }`。

## 2. 请求-响应示例

### 2.1 POST /api/auth/login

**请求**

```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "alice",
  "password": "secret"
}
```

**成功响应** (`200 OK`)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "u_123",
    "username": "alice",
    "displayName": "Alice",
    "role": "user",
    "isActive": true
  },
  "expiresIn": 3600
}
```

**失败响应** (`401 Unauthorized`)

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "用户名或密码错误"
  },
  "requestId": "req-8f9c"
}
```

### 2.2 GET /api/admin/users

**请求**

```http
GET /api/admin/users?page=1&pageSize=20 HTTP/1.1
Authorization: Bearer <admin-token>
```

**成功响应** (`200 OK`)

```json
{
  "items": [
    {
      "id": "u_123",
      "username": "alice",
      "displayName": "Alice",
      "role": "user",
      "email": "alice@example.com",
      "isActive": true,
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

**失败响应** (`403 Forbidden`)

```json
{
  "error": {
    "code": "AUTH_INSUFFICIENT_PERMISSION",
    "message": "仅管理员可访问"
  },
  "requestId": "req-a12b"
}
```

### 2.3 POST /api/admin/users

**请求**

```http
POST /api/admin/users HTTP/1.1
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "username": "bob",
  "displayName": "Bob",
  "role": "user",
  "email": "bob@example.com",
  "password": "TempPass!123"
}
```

**成功响应** (`201 Created`)

```json
{
  "id": "u_456",
  "username": "bob",
  "displayName": "Bob",
  "role": "user",
  "email": "bob@example.com",
  "isActive": true,
  "createdAt": "2024-03-02T08:30:00Z"
}
```

**失败响应** (`409 Conflict`)

```json
{
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "用户名已存在"
  },
  "requestId": "req-77cd"
}
```

### 2.4 PUT /api/admin/users/:id

**请求**

```http
PUT /api/admin/users/u_456 HTTP/1.1
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "displayName": "Bob Chen",
  "role": "admin",
  "isActive": true
}
```

**成功响应** (`200 OK`)

```json
{
  "id": "u_456",
  "username": "bob",
  "displayName": "Bob Chen",
  "role": "admin",
  "email": "bob@example.com",
  "isActive": true,
  "updatedAt": "2024-03-05T11:12:00Z"
}
```

**失败响应** (`404 Not Found`)

```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "用户不存在或已禁用"
  },
  "requestId": "req-991e"
}
```

### 2.5 DELETE /api/admin/users/:id

**请求**

```http
DELETE /api/admin/users/u_456 HTTP/1.1
Authorization: Bearer <admin-token>
```

**成功响应** (`204 No Content`)

**失败响应** (`409 Conflict`)

```json
{
  "error": {
    "code": "USER_HAS_ACTIVE_REPOS",
    "message": "该用户仍有仓库或文件未转移"
  },
  "requestId": "req-55de"
}
```

### 2.6 GET /api/repos

**请求**

```http
GET /api/repos?page=1&pageSize=10 HTTP/1.1
Authorization: Bearer <user-token>
```

**成功响应** (`200 OK`)

```json
{
  "items": [
    {
      "id": "r_1001",
      "ownerId": "u_123",
      "name": "Project Docs",
      "description": "项目文档",
      "visibility": "private",
      "createdAt": "2024-03-01T10:00:00Z"
    }
  ],
  "page": 1,
  "pageSize": 10,
  "total": 3
}
```

**失败响应** (`401 Unauthorized`)

```json
{
  "error": {
    "code": "AUTH_TOKEN_EXPIRED",
    "message": "登录状态已失效"
  },
  "requestId": "req-203f"
}
```

### 2.7 POST /api/repos

**请求**

```http
POST /api/repos HTTP/1.1
Authorization: Bearer <user-token>
Content-Type: application/json

{
  "name": "Research",
  "description": "资料仓库",
  "visibility": "shared"
}
```

**成功响应** (`201 Created`)

```json
{
  "id": "r_2001",
  "ownerId": "u_123",
  "name": "Research",
  "description": "资料仓库",
  "visibility": "shared",
  "createdAt": "2024-03-05T09:00:00Z"
}
```

**失败响应** (`409 Conflict`)

```json
{
  "error": {
    "code": "REPO_NAME_CONFLICT",
    "message": "同名仓库已存在"
  },
  "requestId": "req-304b"
}
```

### 2.8 GET /api/repos/:id/files

**请求**

```http
GET /api/repos/r_2001/files?page=1&pageSize=20 HTTP/1.1
Authorization: Bearer <user-token>
```

**成功响应** (`200 OK`)

```json
{
  "items": [
    {
      "id": "f_9001",
      "repoId": "r_2001",
      "ownerId": "u_123",
      "name": "meeting-notes.pdf",
      "size": 582394,
      "mimeType": "application/pdf",
      "share": true,
      "status": "ready",
      "createdAt": "2024-03-05T09:05:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 12
}
```

**失败响应** (`403 Forbidden`)

```json
{
  "error": {
    "code": "REPO_ACCESS_DENIED",
    "message": "无权访问该仓库"
  },
  "requestId": "req-411c"
}
```

### 2.9 POST /api/repos/:id/files

**请求**

```http
POST /api/repos/r_2001/files HTTP/1.1
Authorization: Bearer <user-token>
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="report.pdf"
Content-Type: application/pdf

<binary>
------WebKitFormBoundary
Content-Disposition: form-data; name="share"

true
------WebKitFormBoundary--
```

**成功响应** (`201 Created`)

```json
{
  "id": "f_9100",
  "repoId": "r_2001",
  "ownerId": "u_123",
  "name": "report.pdf",
  "size": 1048576,
  "mimeType": "application/pdf",
  "share": true,
  "status": "processing",
  "difyDocumentId": null,
  "createdAt": "2024-03-06T07:20:00Z"
}
```

**失败响应** (`415 Unsupported Media Type`)

```json
{
  "error": {
    "code": "FILE_TYPE_NOT_ALLOWED",
    "message": "上传文件类型不在白名单内"
  },
  "requestId": "req-522d"
}
```

### 2.10 GET /api/admin/files

**请求**

```http
GET /api/admin/files?page=1&pageSize=50&status=failed HTTP/1.1
Authorization: Bearer <admin-token>
```

**成功响应** (`200 OK`)

```json
{
  "items": [
    {
      "id": "f_9100",
      "repoId": "r_2001",
      "ownerId": "u_123",
      "name": "report.pdf",
      "share": true,
      "status": "failed",
      "createdAt": "2024-03-06T07:20:00Z",
      "errorMessage": "Dify sync timeout"
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 4
}
```

**失败响应** (`401 Unauthorized`)

```json
{
  "error": {
    "code": "AUTH_TOKEN_INVALID",
    "message": "令牌无效或已过期"
  },
  "requestId": "req-633e"
}
```

### 2.11 GET /api/search

**请求**

```http
GET /api/search?q=知识库&page=1&pageSize=5 HTTP/1.1
Authorization: Bearer <user-token>
```

**成功响应** (`200 OK`)

```json
{
  "query": "知识库",
  "items": [
    {
      "documentId": "dify-001",
      "fileId": "f_9100",
      "repoId": "r_2001",
      "title": "report.pdf",
      "snippet": "...知识库集成流程...",
      "score": 0.82
    }
  ],
  "page": 1,
  "pageSize": 5,
  "total": 14
}
```

**失败响应** (`400 Bad Request`)

```json
{
  "error": {
    "code": "SEARCH_QUERY_REQUIRED",
    "message": "查询关键词不能为空"
  },
  "requestId": "req-744f"
}
```

## 3. 统一错误响应格式

- 所有非 2xx 响应遵循以下 JSON 结构：

```json
{
  "error": {
    "code": "STRING", // 机器可读错误码
    "message": "STRING", // 面向用户或前端的友好提示
    "details": {
      // 可选，提供字段级错误、外部系统返回等信息
      "field": "username",
      "reason": "REQUIRED"
    }
  },
  "requestId": "STRING", // 可选，用于日志关联追踪
  "timestamp": "ISO-8601" // 可选，发生时间
}
```

- 错误码命名建议 `模块_问题`（如 `AUTH_INVALID_CREDENTIALS`、`REPO_ACCESS_DENIED`）。
- 统一通过中间件捕获异常，记录日志，并在 `requestId` 里写入链路追踪 ID。
- 重复或批量校验失败可在 `details` 内返回数组 `{ field, message }[]`，便于前端逐项提示。
