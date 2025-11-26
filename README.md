# Node Ollama 服务

这是一个 Node.js 服务项目，用于连接本地部署的 Ollama 大模型服务。

## 功能特性

- ✅ 使用 LangChain.js 连接本地 Ollama 服务（端口 11434）
- ✅ 支持多种模型（qwen3:0.6b、llama3 等）
- ✅ GET 接口返回 "hello，ollama"
- ✅ 测试 Ollama 连接接口
- ✅ 与 Ollama 模型对话接口
- ✅ **上下文记忆功能**：支持多会话对话，模型可以记住对话历史
- ✅ 会话管理：支持清除和查询会话历史

## 前置要求

1. Node.js (推荐 v16 或更高版本)
2. 本地已部署 Ollama 服务，运行在 `http://localhost:11434`
3. 已下载 `qwen3:0.6b` 模型

## 安装步骤

1. 安装依赖：

```bash
npm install
```

2. 确保 Ollama 服务正在运行：

```bash
# 检查 Ollama 是否运行
curl http://localhost:11434/api/tags
```

3. 确保已下载 qwen3:0.6b 模型：

```bash
# 如果未下载，执行以下命令
ollama pull qwen3:0.6b
```

## 运行项目

### 生产环境运行

```bash
npm start
```

### 开发环境运行（热更新）

```bash
npm run dev
```

使用 `npm run dev` 启动后，nodemon 会监听文件变化，自动重启服务器，无需手动重启。

服务器将在 `http://localhost:3000` 启动。

## API 接口

### 1. GET / - 返回 "hello，ollama"

**请求示例：**

```bash
curl http://localhost:3000/
```

**响应示例：**

```json
{
  "message": "hello，ollama",
  "status": "success"
}
```

### 2. GET /test-ollama - 测试 Ollama 连接

**请求示例：**

```bash
curl http://localhost:3000/test-ollama
```

**响应示例：**

```json
{
  "message": "Ollama 连接成功",
  "model": "qwen3:0.6b",
  "response": "你好！有什么我可以帮助你的吗？"
}
```

### 3. POST /chat - 与 Ollama 模型对话（支持上下文记忆）

**请求示例：**

```bash
# 基本对话（使用默认会话）
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "你好，介绍一下你自己"}'

# 使用指定会话ID（支持多用户/多会话）
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我的名字是张三", "sessionId": "user123"}'

# 继续对话（模型会记住之前的对话）
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "我刚才说我的名字是什么？", "sessionId": "user123"}'
```

**响应示例：**

```json
{
  "message": "success",
  "model": "llama3",
  "sessionId": "user123",
  "prompt": "我的名字是张三",
  "response": "你好张三！很高兴认识你。"
}
```

### 4. POST /chat/clear - 清除会话历史

**请求示例：**

```bash
curl -X POST http://localhost:3000/chat/clear \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "user123"}'
```

**响应示例：**

```json
{
  "message": "会话历史已清除",
  "sessionId": "user123"
}
```

### 5. GET /chat/history/:sessionId - 获取会话历史

**请求示例：**

```bash
curl http://localhost:3000/chat/history/user123
```

**响应示例：**

```json
{
  "message": "success",
  "sessionId": "user123",
  "history": [
    {
      "role": "user",
      "content": "我的名字是张三"
    },
    {
      "role": "assistant",
      "content": "你好张三！很高兴认识你。"
    }
  ],
  "count": 2
}
```

## 项目结构

```
node-ollama/
├── server.js          # 主服务文件
├── package.json       # 项目配置和依赖
├── nodemon.json       # nodemon 配置文件（热更新）
├── README.md          # 项目说明文档
└── .gitignore         # Git 忽略文件
```

## 注意事项

- 确保 Ollama 服务在运行，否则 `/test-ollama` 和 `/chat` 接口会失败
- 如果模型名称不同，请在 `server.js` 中修改 `MODEL_NAME` 常量
- 如果 Ollama 运行在不同端口，请修改 `server.js` 中的 `baseUrl` 配置
- 本项目使用 LangChain.js (`@langchain/ollama`) 来调用本地 Ollama 模型
- **上下文记忆**：每个会话（sessionId）独立维护对话历史，最多保留最近 20 轮对话（40 条消息）
- **会话管理**：如果不指定 `sessionId`，默认使用 `"default"` 会话
- **内存存储**：会话历史存储在内存中，服务器重启后会丢失。如需持久化，可以考虑使用数据库

## 故障排查

1. **连接失败**：检查 Ollama 是否运行在 `http://localhost:11434`
2. **模型不存在**：使用 `ollama pull qwen3:0.6b` 下载模型
3. **端口冲突**：修改 `server.js` 中的 `PORT` 变量

## 许可证

MIT
