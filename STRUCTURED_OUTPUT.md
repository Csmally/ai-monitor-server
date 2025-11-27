# LangChain.js 结构化输出方法说明

## 概述

本文档介绍了三种使用 LangChain.js 强制 AI 返回结构化 JSON 数据的方法，无需手动解析字符串。

## 三种方法对比

| 方法 | 接口 | 优点 | 缺点 | 模型要求 |
|------|------|------|------|---------|
| **方法一：withStructuredOutput** | `/errorAi` | ✅ 最现代、类型安全<br>✅ 自动处理解析<br>✅ 支持 Zod 验证 | ❌ 需要模型支持函数调用 | llama3.1+ 或支持工具调用的模型 |
| **方法二：StructuredOutputParser** | `/errorAi-parser` | ✅ 兼容更多模型<br>✅ 自动生成格式指令 | ⚠️ 仍依赖 AI 遵循指令<br>⚠️ 可能解析失败 | 任何模型 |
| **方法三：JSON Mode** | `/errorAi-json` | ✅ 模型原生 JSON 支持<br>✅ 性能较好 | ❌ 需要模型支持 JSON 模式 | llama3.1+、qwen2.5+ 等 |

---

## 方法一：withStructuredOutput（推荐）

### 技术原理
- 使用 Zod Schema 定义数据结构
- LangChain 自动将 Schema 转换为函数调用（Function Calling）
- AI 模型通过工具调用返回结构化数据
- **无需手动解析 JSON 字符串**

### 代码示例

```javascript
const { z } = require("zod");

// 1. 定义 Zod Schema
const errorAnalysisSchema = z.object({
  errorCount: z.number().describe("错误总数"),
  errorLevel: z.enum(["error", "warning", "info"]),
  summary: z.string().describe("错误的简要总结"),
  errors: z.array(
    z.object({
      type: z.string(),
      message: z.string(),
      location: z.string(),
      severity: z.enum(["high", "medium", "low"]),
      suggestions: z.array(z.string()),
    })
  ),
});

// 2. 创建支持结构化输出的 LLM 实例
const structuredLlm = llm.withStructuredOutput(errorAnalysisSchema, {
  name: "error_analysis",
});

// 3. 调用 AI - 自动返回结构化对象
const analysisResult = await structuredLlm.invoke(messages);
// analysisResult 已经是解析好的 JavaScript 对象，无需 JSON.parse()
```

### 测试命令

```bash
curl -X POST http://localhost:3000/errorAi \
  -H "Content-Type: application/json" \
  -d '{
    "errors": {
      "type": "TypeError",
      "message": "Cannot read property of undefined",
      "stack": "at App.jsx:45:12"
    }
  }'
```

### 适用场景
- 生产环境（最推荐）
- 需要类型安全和数据验证
- 使用支持函数调用的现代模型

---

## 方法二：StructuredOutputParser（通用）

### 技术原理
- 使用 Zod Schema 定义数据结构
- 自动生成格式化指令（Format Instructions）
- 将格式化指令添加到提示词中，引导 AI 返回特定格式
- 使用 Parser 解析 AI 返回的文本

### 代码示例

```javascript
const { StructuredOutputParser } = require("@langchain/core/output_parsers");

// 1. 创建输出解析器
const parser = StructuredOutputParser.fromZodSchema(errorAnalysisSchema);

// 2. 获取格式化指令
const formatInstructions = parser.getFormatInstructions();
// 输出类似：
// "You must format your output as a JSON value that adheres to a given \"JSON Schema\" instance..."

// 3. 将格式化指令添加到提示词中
const systemPrompt = `你是一个专业的代码错误分析助手。
${formatInstructions}`;

// 4. 调用 AI
const response = await llm.invoke(messages);

// 5. 使用 parser 解析响应
const analysisResult = await parser.parse(response.content);
```

### 测试命令

```bash
curl -X POST http://localhost:3000/errorAi-parser \
  -H "Content-Type: application/json" \
  -d '{
    "errors": {
      "type": "ReferenceError",
      "message": "myFunction is not defined",
      "stack": "at Component.jsx:22:5"
    }
  }'
```

### 适用场景
- 模型不支持函数调用
- 需要兼容旧版本或小型模型
- 开发测试环境

---

## 方法三：JSON Mode（原生支持）

### 技术原理
- 在模型配置中启用 `format: "json"`
- 模型原生强制返回有效的 JSON 格式
- 仍需要在提示词中说明 JSON 结构
- 手动解析返回的 JSON 字符串

### 代码示例

```javascript
// 1. 创建启用 JSON 模式的 LLM 实例
const jsonLlm = new ChatOllama({
  model: "llama3",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
  format: "json", // 启用 JSON 模式
});

// 2. 在提示词中说明 JSON 结构
const systemPrompt = `你必须返回有效的 JSON 格式数据。
返回格式：
{
  "errorCount": 数字,
  "errorLevel": "error|warning|info",
  ...
}`;

// 3. 调用 AI
const response = await jsonLlm.invoke(messages);

// 4. 手动解析 JSON
const analysisResult = JSON.parse(response.content);
```

### 测试命令

```bash
curl -X POST http://localhost:3000/errorAi-json \
  -H "Content-Type: application/json" \
  -d '{
    "errors": {
      "type": "SyntaxError",
      "message": "Unexpected token",
      "stack": "at parse.js:102:15"
    }
  }'
```

### 适用场景
- 使用支持 JSON 模式的模型（llama3.1+, qwen2.5+）
- 简单的 JSON 结构
- 不需要复杂的数据验证

---

## 推荐方案

### 生产环境
```
方法一（withStructuredOutput）> 方法三（JSON Mode）> 方法二（StructuredOutputParser）
```

### 开发/测试环境
```
方法二（StructuredOutputParser）- 最通用，适合快速测试
```

### 模型选择建议
- **llama3**：支持方法二和方法三（部分）
- **llama3.1+**：支持所有三种方法（推荐）
- **qwen2.5+**：支持所有三种方法
- **小型模型（qwen3:0.6b）**：建议使用方法二

---

## 常见问题

### Q1: 为什么方法一调用失败？
**A:** 你的模型可能不支持函数调用（Function Calling）。请尝试：
1. 升级到 llama3.1 或更高版本
2. 使用方法二或方法三

### Q2: 如何验证模型是否支持函数调用？
**A:** 运行测试命令，如果返回错误提示模型不支持，说明需要升级模型。

### Q3: 哪种方法最可靠？
**A:** 
- **可靠性**：方法一 > 方法三 > 方法二
- **兼容性**：方法二 > 方法三 > 方法一

### Q4: 可以混合使用多种方法吗？
**A:** 可以！建议实现降级策略：
```javascript
try {
  // 优先尝试方法一
  return await structuredLlm.invoke(messages);
} catch (error) {
  // 降级到方法二
  return await parser.parse((await llm.invoke(messages)).content);
}
```

---

## 性能对比

| 方法 | 响应速度 | 准确性 | 资源消耗 |
|------|---------|--------|---------|
| 方法一 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| 方法二 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 方法三 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

---

## 总结

1. **优先使用方法一（withStructuredOutput）**：最现代、最可靠
2. **兼容性首选方法二（StructuredOutputParser）**：支持所有模型
3. **性能优化使用方法三（JSON Mode）**：需要模型原生支持
4. **不要使用手动字符串解析**：容易出错，难以维护

---

## 更多资源

- [LangChain.js 官方文档](https://js.langchain.com/docs/)
- [Zod Schema 文档](https://zod.dev/)
- [Ollama 模型列表](https://ollama.com/library)

