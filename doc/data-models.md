# 数据模型与规则说明

## 1. 数据模型（TypeScript 接口）

```ts
export interface User {
  id: string; // 唯一用户标识，UUID 或数据库自增 ID
  username: string; // 登录名，管理员维护，系统内唯一
  displayName: string; // 展示名称，前端界面显示
  role: 'admin' | 'user'; // 角色枚举，决定权限矩阵行为
  email?: string; // 可选邮箱，用于通知或找回（后续扩展）
  isActive: boolean; // 启用状态，false 时禁止登录
  createdAt: string; // ISO 时间字符串，记录创建时间
  updatedAt: string; // ISO 时间字符串，记录最后修改时间
}

export interface Repo {
  id: string; // 仓库唯一标识
  ownerId: string; // 归属用户 ID，指向 User.id
  name: string; // 仓库名称，用户级唯一
  description?: string; // 可选说明
  visibility: 'private' | 'shared'; // 仓库级别分享范围，暂时与 share 标签对齐
  createdAt: string; // 创建时间
  updatedAt: string; // 最后更新时间
}

export interface FileItem {
  id: string; // 文件唯一标识
  repoId: string; // 所属仓库 ID，指向 Repo.id
  ownerId: string; // 上传者 ID，指向 User.id
  name: string; // 文件名，包含扩展名
  size: number; // 文件大小，单位字节
  mimeType: string; // MIME 类型，用于下载与预览
  share: boolean; // 标签：true 表示可被分享/被管理员查看
  storagePath: string; // 对象存储或文件系统路径
  difyDocumentId?: string; // Dify 入库后的文档 ID，便于追踪同步状态
  checksum: string; // 文件内容哈希（如 SHA-256），用于重复检测
  status: 'processing' | 'ready' | 'failed'; // 上传状态
  createdAt: string; // 上传时间
  updatedAt: string; // 元数据更新时间
}
```

## 2. 权限矩阵

| 功能                         | Admin              | User                                 |
| ---------------------------- | ------------------ | ------------------------------------ |
| 登录与鉴权                   | ✅ 可登录          | ✅ 可登录                            |
| 管理用户（增删改）           | ✅                 | ❌                                   |
| 查看所有用户列表             | ✅                 | ❌                                   |
| 创建/删除任意仓库            | ✅（可代用户操作） | ❌（仅创建自己的仓库）               |
| 创建/删除自己的仓库          | ✅                 | ✅                                   |
| 查看任意仓库文件             | ✅                 | ❌（仅限自己仓库 + share=true 文件） |
| 上传文件到任意仓库           | ✅                 | ❌（仅限自己仓库）                   |
| 上传文件到自己的仓库         | ✅                 | ✅                                   |
| 更新文件元数据（标签、名称） | ✅（任意文件）     | ✅（仅限自己文件）                   |
| 删除文件                     | ✅（任意文件）     | ✅（仅限自己文件）                   |
| 搜索（通过 Dify）            | ✅（全量搜索）     | ✅（仅限可访问范围）                 |
| 查看系统审计日志             | ✅                 | ❌                                   |

## 3. 数据一致性与约束

- **唯一性约束**
  - `User.username`：系统全局唯一。
  - `Repo.ownerId + Repo.name`：同一用户下仓库名称唯一。
  - `FileItem.repoId + FileItem.name`：同一仓库内文件名唯一（可扩展版本号）。
  - `FileItem.checksum`：可选唯一约束，用于标识同一内容文件，避免重复入库。
- **文件大小限制**
  - 单文件最大 200 MB（可根据部署环境调整，超过则拒绝上传）。
  - 后端需在流式上传时提前校验 Content-Length，并在存储层二次校验实际大小。
- **类型白名单**
  - 允许上传：`application/pdf`、`image/jpeg`、`image/png`、`image/gif`、`text/plain`、`text/markdown`、`application/msword`、`application/vnd.openxmlformats-officedocument.wordprocessingml.document`、`application/vnd.ms-excel`、`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`、`application/vnd.ms-powerpoint`、`application/vnd.openxmlformats-officedocument.presentationml.presentation`。
  - 需对扩展名与 MIME 类型双重校验，并拒绝可执行文件或脚本类型。
- **一致性策略**
  - 上传流程需确保文件写入对象存储成功后再记录元数据与 Dify 入库；若任一步失败需回滚或标记 `status=failed` 供后续补偿。
  - Dify 同步应采用异步队列或重试机制，避免因外部 API 不可用影响主流程。

## 4. 演进点：迁移到正式数据库的注意事项

1. **模型规范化**：在关系型数据库中，将用户、仓库、文件拆分为独立表，建立外键约束，确保 referential integrity。
2. **索引设计**：为 `username`、`ownerId`、`repoId`、`checksum` 等高频查询字段建立索引，提升搜索与过滤性能。
3. **并发控制**：采用事务与行级锁处理上传与元数据更新，避免同名文件或重命名冲突。
4. **审计与历史记录**：考虑引入审计表或事件溯源，用于追踪文件操作历史，满足合规要求。
5. **分片与扩展**：大规模场景下，准备水平分库分表或对象存储 CDN 加速策略，并确保 Dify 文档 ID 与主库保持可追踪。
6. **安全与合规**：在正式数据库中启用加密、备份与灾备策略，同时明确 Dify API 密钥管理与访问控制。
