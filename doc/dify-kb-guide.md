# Dify 知识库配置与创建指南

本文档说明如何在 Dify 中创建知识库（Knowledge Base），并将其与本项目的文件管理系统对接。按照以下步骤完成配置后，后端即可在文件上传时自动同步文档，并通过搜索接口检索内容。

## 1. 前置条件

- 拥有可访问 [Dify](https://dify.ai/) 控制台的账号，并具备创建知识库与 API Key 的权限。
- 已部署或本地运行本项目的后端服务（Node.js + Express）。
- 已准备好 `.env` 文件或环境变量管理方案，用于配置 Dify 相关参数。

## 2. 在 Dify 中创建知识库

1. 登录 Dify 控制台后，进入 **Knowledge Base** 模块。
2. 点击 **Create Knowledge Base**，填写名称、描述等基础信息。
3. 选择 **Data Source** 类型（建议选择 File / Document 类型，以便上传文件）。
4. 创建完成后，在知识库详情页记录以下信息：
   - **Knowledge Base ID**：在浏览器地址栏或知识库详情页的 `kbID` 字段中可见。
   - **Base URL**：Dify 服务对外提供的接口域名，例如 `https://api.dify.ai` 或自建实例域名。

## 3. 创建 API Key

1. 在 Dify 控制台中找到 **API Keys** 菜单。
2. 点击 **Create API Key**，建议为该项目单独生成密钥以便审计与权限管理。
3. 记录生成的 **API Key**，该密钥仅在创建时展示一次。
4. 建议为该 Key 设置只读/只写权限：
   - 同步文档需要写权限（`documents:write`）。
   - 搜索文档需要读权限（`documents:read`）。

## 4. 配置环境变量

在项目根目录复制 `.env.example` 为 `.env`，并设置下列参数：

```ini
# Dify 知识库配置
DIFY_BASE_URL=https://api.dify.ai          # Dify 服务地址
DIFY_API_KEY=your_api_key_here             # 第 3 步创建的 API Key
DIFY_KB_ID=your_knowledge_base_id          # 第 2 步获取的 Knowledge Base ID
```

> 生产环境部署时，请通过 CI/CD、容器平台或密钥管理服务安全地注入上述变量，避免明文写入代码库。

## 5. 后端如何使用这些配置

- **文件上传同步**：`src/services/difyService.js` 中的 `uploadToDify` 会读取 `DIFY_BASE_URL`、`DIFY_API_KEY` 与 `DIFY_KB_ID`，将本地保存的文件流式上传到 Dify 知识库，并在成功后调用 `refreshDifyDocument` 主动刷新索引。
- **搜索功能**：`searchService` 在处理 `/api/search` 请求时会判断 Dify 配置是否齐全；若配置完整，则调用 Dify 的搜索 API，返回统一的搜索结果。

确保上述环境变量在 Node.js 进程中可用（例如通过 `dotenv` 加载 `.env` 文件，或在 Docker Compose 中设置 `environment` 字段），即可完成 Dify 集成。

## 6. 常见问题与排查

| 问题 | 可能原因 | 解决方案 |
| --- | --- | --- |
| 上传返回 `DIFY_CONFIG_MISSING` | 未配置或缺少任一 Dify 环境变量 | 核对 `.env` 或部署环境变量，确保三项都存在 |
| 返回 `401 Unauthorized` | API Key 无效或权限不足 | 在 Dify 控制台重新生成具有文档读写权限的 Key |
| 上传成功但搜索不到 | Dify 处理同步需要时间 / 索引未完成 | 稍候再试，或登录 Dify 控制台确认索引任务状态（系统会自动调用刷新接口） |
| Docker 环境无法访问 Dify | 网络策略或代理限制 | 在部署环境检查出口网络、代理配置或 TLS 设置 |

## 7. 下一步建议

- 在 Dify 中为不同环境（开发、测试、生产）创建独立的知识库与 API Key，避免数据污染。
- 若上传文件较大，可在项目中配置异步重试机制，或使用消息队列保障可靠性。
- 定期审计 Dify 的同步状态与索引情况，确保搜索结果的完整性与及时性。

完成上述步骤后，即可在文件管理系统中享受 Dify 提供的全文搜索能力。
