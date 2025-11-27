/**
 * LangChain.js 结构化输出使用示例
 * 
 * 这个文件展示了如何在你的代码中使用三种不同的方法
 * 来强制 AI 返回结构化的 JSON 数据
 */

const { ChatOllama } = require("@langchain/ollama");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { StructuredOutputParser } = require("@langchain/core/output_parsers");
const { z } = require("zod");

// ============================================================================
// 1. 定义数据结构（Zod Schema）
// ============================================================================

// 定义用户信息的结构
const userInfoSchema = z.object({
  name: z.string().describe("用户姓名"),
  age: z.number().describe("用户年龄"),
  email: z.string().email().describe("用户邮箱"),
  skills: z.array(z.string()).describe("用户技能列表"),
  level: z.enum(["beginner", "intermediate", "advanced"]).describe("技能水平"),
});

// 定义代码审查结果的结构
const codeReviewSchema = z.object({
  score: z.number().min(0).max(100).describe("代码质量评分"),
  issues: z.array(
    z.object({
      line: z.number().describe("问题所在行号"),
      severity: z.enum(["critical", "major", "minor"]).describe("严重程度"),
      description: z.string().describe("问题描述"),
      suggestion: z.string().describe("修复建议"),
    })
  ),
  summary: z.string().describe("总体评价"),
});

// ============================================================================
// 2. 初始化 LLM
// ============================================================================

const llm = new ChatOllama({
  model: "llama3",
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
});

// ============================================================================
// 方法一：withStructuredOutput（最推荐）
// ============================================================================

async function example1_withStructuredOutput() {
  console.log("\n=== 方法一：withStructuredOutput ===\n");

  // 创建支持结构化输出的 LLM 实例
  const structuredLlm = llm.withStructuredOutput(userInfoSchema, {
    name: "extract_user_info",
  });

  // 构建消息
  const messages = [
    new SystemMessage("你是一个信息提取助手，请从用户的描述中提取结构化信息。"),
    new HumanMessage(
      "我叫张三，今年28岁，邮箱是zhangsan@example.com，擅长JavaScript、Python和React，技能水平中级。"
    ),
  ];

  try {
    // 调用 AI - 自动返回结构化对象
    const result = await structuredLlm.invoke(messages);

    console.log("✅ 提取结果（已自动解析为对象）:");
    console.log(JSON.stringify(result, null, 2));
    console.log("\n类型检查:");
    console.log(`  name: ${typeof result.name} = "${result.name}"`);
    console.log(`  age: ${typeof result.age} = ${result.age}`);
    console.log(`  skills: Array = [${result.skills.join(", ")}]`);

    return result;
  } catch (error) {
    console.error("❌ 错误:", error.message);
    throw error;
  }
}

// ============================================================================
// 方法二：StructuredOutputParser（最通用）
// ============================================================================

async function example2_structuredOutputParser() {
  console.log("\n=== 方法二：StructuredOutputParser ===\n");

  // 创建输出解析器
  const parser = StructuredOutputParser.fromZodSchema(codeReviewSchema);

  // 获取格式化指令
  const formatInstructions = parser.getFormatInstructions();

  // 示例代码
  const codeToReview = `
function calculateTotal(items) {
  let total = 0;
  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }
  return total;
}
  `.trim();

  // 构建消息（包含格式化指令）
  const messages = [
    new SystemMessage(
      `你是一个代码审查专家。请分析代码并返回审查结果。
      
${formatInstructions}`
    ),
    new HumanMessage(`请审查以下代码：

\`\`\`javascript
${codeToReview}
\`\`\`
`),
  ];

  try {
    // 调用 AI
    const response = await llm.invoke(messages);

    console.log("📝 AI 原始返回:");
    console.log(response.content.substring(0, 200) + "...\n");

    // 使用 parser 解析响应
    const result = await parser.parse(response.content);

    console.log("✅ 解析结果:");
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("❌ 错误:", error.message);
    throw error;
  }
}

// ============================================================================
// 方法三：JSON Mode（需要模型原生支持）
// ============================================================================

async function example3_jsonMode() {
  console.log("\n=== 方法三：JSON Mode ===\n");

  // 创建启用 JSON 模式的 LLM 实例
  const jsonLlm = new ChatOllama({
    model: "llama3",
    baseUrl: "http://localhost:11434",
    temperature: 0.7,
    format: "json", // 启用 JSON 模式
  });

  // 构建消息
  const messages = [
    new SystemMessage(
      `你必须返回有效的 JSON 格式数据。

请分析以下产品描述并返回结构化信息：
{
  "productName": "产品名称",
  "category": "产品类别",
  "price": 价格（数字）,
  "features": ["特性1", "特性2", ...],
  "inStock": 是否有货（布尔值）
}`
    ),
    new HumanMessage(
      "这是一款智能手表，属于电子产品类别，售价1999元，具有心率监测、睡眠追踪、运动记录等功能，目前有货。"
    ),
  ];

  try {
    // 调用 AI
    const response = await jsonLlm.invoke(messages);

    console.log("📝 AI 原始返回:");
    console.log(response.content);

    // 手动解析 JSON
    const result = JSON.parse(response.content);

    console.log("\n✅ 解析结果:");
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error("❌ 错误:", error.message);
    throw error;
  }
}

// ============================================================================
// 实用工具：带降级策略的结构化输出
// ============================================================================

async function extractWithFallback(prompt, schema) {
  console.log("\n=== 带降级策略的提取 ===\n");

  // 策略1: 尝试 withStructuredOutput
  try {
    console.log("🔄 尝试方法一: withStructuredOutput...");
    const structuredLlm = llm.withStructuredOutput(schema);
    const result = await structuredLlm.invoke([new HumanMessage(prompt)]);
    console.log("✅ 方法一成功");
    return { result, method: "withStructuredOutput" };
  } catch (error) {
    console.log("⚠️  方法一失败，尝试降级...");
  }

  // 策略2: 降级到 StructuredOutputParser
  try {
    console.log("🔄 尝试方法二: StructuredOutputParser...");
    const parser = StructuredOutputParser.fromZodSchema(schema);
    const formatInstructions = parser.getFormatInstructions();

    const messages = [
      new SystemMessage(formatInstructions),
      new HumanMessage(prompt),
    ];

    const response = await llm.invoke(messages);
    const result = await parser.parse(response.content);
    console.log("✅ 方法二成功");
    return { result, method: "StructuredOutputParser" };
  } catch (error) {
    console.log("⚠️  方法二失败，尝试降级...");
  }

  // 策略3: 降级到 JSON Mode
  try {
    console.log("🔄 尝试方法三: JSON Mode...");
    const jsonLlm = new ChatOllama({
      model: "llama3",
      baseUrl: "http://localhost:11434",
      temperature: 0.7,
      format: "json",
    });

    const response = await jsonLlm.invoke([new HumanMessage(prompt)]);
    const result = JSON.parse(response.content);
    console.log("✅ 方法三成功");
    return { result, method: "JSON Mode" };
  } catch (error) {
    console.log("❌ 所有方法都失败了");
    throw new Error("无法提取结构化数据");
  }
}

// ============================================================================
// 主函数：运行所有示例
// ============================================================================

async function runExamples() {
  console.log("🎯 LangChain.js 结构化输出示例");
  console.log("=".repeat(60));

  try {
    // 示例1: withStructuredOutput
    await example1_withStructuredOutput();
    await sleep(2000);

    // 示例2: StructuredOutputParser
    await example2_structuredOutputParser();
    await sleep(2000);

    // 示例3: JSON Mode
    await example3_jsonMode();
    await sleep(2000);

    // 示例4: 带降级策略
    const testPrompt =
      "我叫李四，35岁，邮箱li_si@test.com，精通Java、Go和Docker，高级水平。";
    await extractWithFallback(testPrompt, userInfoSchema);

    console.log("\n" + "=".repeat(60));
    console.log("✅ 所有示例运行完成！");
  } catch (error) {
    console.error("\n❌ 示例运行失败:", error.message);
  }
}

// 辅助函数
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行示例（如果直接执行此文件）
if (require.main === module) {
  runExamples().catch(console.error);
}

// 导出函数供其他模块使用
module.exports = {
  example1_withStructuredOutput,
  example2_structuredOutputParser,
  example3_jsonMode,
  extractWithFallback,
};

