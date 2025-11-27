# 快速开始：LangChain.js 结构化输出

## 🚀 5分钟上手

### 1. 安装依赖

```bash
npm install zod @langchain/core @langchain/ollama
```

### 2. 基础使用（最简单）

```javascript
const { ChatOllama } = require("@langchain/ollama");
const { HumanMessage } = require("@langchain/core/messages");
const { z } = require("zod");

// 1️⃣ 定义数据结构
const schema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string(),
});

// 2️⃣ 创建 LLM
const llm = new ChatOllama({
  model: "llama3",
  baseUrl: "http://localhost:11434",
});

// 3️⃣ 使用结构化输出
const structuredLlm = llm.withStructuredOutput(schema);

// 4️⃣ 调用 - 自动返回对象！
const result = await structuredLlm.invoke([
  new HumanMessage("我叫张三，28岁，邮箱zhangsan@example.com")
]);

console.log(result);
// 输出：{ name: "张三", age: 28, email: "zhangsan@example.com" }
```

**就这么简单！无需手动 JSON.parse()！**

---

## 📊 三种方法选择指南

### 你的模型是什么？

#### ✅ llama3.1 或更高版本
**推荐：方法一（withStructuredOutput）**

```javascript
const structuredLlm = llm.withStructuredOutput(schema);
const result = await structuredLlm.invoke(messages);
```

#### ✅ llama3
**推荐：方法二（StructuredOutputParser）**

```javascript
const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();
// 将 formatInstructions 添加到提示词中
const response = await llm.invoke(messages);
const result = await parser.parse(response.content);
```

#### ✅ 小型模型（如 qwen3:0.6b）
**推荐：方法二（StructuredOutputParser）**

---

## 🧪 快速测试

### 1. 启动服务器

```bash
npm run dev
```

### 2. 测试接口

```bash
# 方法一（推荐，需要模型支持）
curl -X POST http://localhost:3000/errorAi \
  -H "Content-Type: application/json" \
  -d '{"errors":{"type":"TypeError","message":"undefined"}}'

# 方法二（兼容所有模型）
curl -X POST http://localhost:3000/errorAi-parser \
  -H "Content-Type: application/json" \
  -d '{"errors":{"type":"TypeError","message":"undefined"}}'

# 方法三（需要模型支持 JSON 模式）
curl -X POST http://localhost:3000/errorAi-json \
  -H "Content-Type: application/json" \
  -d '{"errors":{"type":"TypeError","message":"undefined"}}'
```

### 3. 运行自动化测试

```bash
node test-structured-output.js
```

这个脚本会自动测试所有三种方法，并显示哪些方法在你的环境中可用。

---

## 📝 常见使用场景

### 场景1: 提取用户信息

```javascript
const userSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
});

const structuredLlm = llm.withStructuredOutput(userSchema);
const result = await structuredLlm.invoke([
  new HumanMessage("我是李四，邮箱lisi@test.com，手机13800138000")
]);
```

### 场景2: 分析代码错误

```javascript
const errorSchema = z.object({
  type: z.string(),
  severity: z.enum(["high", "medium", "low"]),
  suggestions: z.array(z.string()),
});

const structuredLlm = llm.withStructuredOutput(errorSchema);
const result = await structuredLlm.invoke([
  new HumanMessage("TypeError: Cannot read property 'map' of undefined")
]);
```

### 场景3: 商品信息提取

```javascript
const productSchema = z.object({
  name: z.string(),
  price: z.number(),
  category: z.string(),
  inStock: z.boolean(),
});

const structuredLlm = llm.withStructuredOutput(productSchema);
const result = await structuredLlm.invoke([
  new HumanMessage("iPhone 15 Pro，售价7999元，手机类别，有货")
]);
```

---

## 🛠️ 故障排查

### Q: 调用 withStructuredOutput 报错？

**A:** 你的模型可能不支持函数调用。解决方案：
1. 升级到 llama3.1 或更高版本：`ollama pull llama3.1`
2. 或者使用方法二（StructuredOutputParser）

### Q: 返回的不是 JSON 格式？

**A:** 使用方法二，并检查 AI 是否遵循了格式指令：

```javascript
const parser = StructuredOutputParser.fromZodSchema(schema);
const formatInstructions = parser.getFormatInstructions();

// 在提示词中明确要求
const systemMessage = new SystemMessage(
  `你必须严格按照以下格式返回数据：\n${formatInstructions}`
);
```

### Q: 解析 JSON 失败？

**A:** 添加错误处理：

```javascript
try {
  const result = await parser.parse(response.content);
} catch (error) {
  console.error("解析失败，AI 原始返回:", response.content);
  // 尝试清理内容后再解析
  const cleaned = response.content
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const result = JSON.parse(cleaned);
}
```

---

## 🎯 最佳实践

### ✅ DO（推荐）

```javascript
// 1. 使用 describe() 添加字段说明
const schema = z.object({
  name: z.string().describe("用户的完整姓名"),
  age: z.number().describe("用户的年龄（整数）"),
});

// 2. 使用 enum 限制值的范围
const schema = z.object({
  level: z.enum(["low", "medium", "high"]),
});

// 3. 添加验证规则
const schema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
  score: z.number().min(0).max(100),
});
```

### ❌ DON'T（不推荐）

```javascript
// 1. 不要定义过于复杂的嵌套结构（超过3层）
const badSchema = z.object({
  user: z.object({
    profile: z.object({
      details: z.object({
        info: z.object({ ... }) // 太深了！
      })
    })
  })
});

// 2. 不要在生产环境手动解析字符串
const result = JSON.parse(response.content); // ❌ 容易出错

// 3. 不要忽略错误处理
const result = await structuredLlm.invoke(messages); // ❌ 没有 try-catch
```

---

## 📚 进阶阅读

- [详细方法对比](./STRUCTURED_OUTPUT.md)
- [完整代码示例](./examples/structured-output-usage.js)
- [测试脚本](./test-structured-output.js)
- [LangChain.js 官方文档](https://js.langchain.com/docs/)

---

## 💡 提示

1. **开始简单**：先使用方法一，如果不支持再降级到方法二
2. **添加描述**：在 Schema 中使用 `.describe()` 帮助 AI 理解字段含义
3. **测试优先**：使用 `test-structured-output.js` 测试你的环境
4. **错误处理**：始终添加 try-catch 捕获异常
5. **逐步调试**：先测试简单结构，再增加复杂度

---

## 🤝 需要帮助？

- 查看服务器日志：`npm run dev`
- 运行测试脚本：`node test-structured-output.js`
- 查看示例代码：`node examples/structured-output-usage.js`

祝你使用愉快！ 🎉

