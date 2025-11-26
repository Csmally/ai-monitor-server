const express = require("express");
const { ChatOllama } = require("@langchain/ollama");
const {
  HumanMessage,
  SystemMessage,
  AIMessage,
} = require("@langchain/core/messages");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// 存储每个会话的对话历史
// key: sessionId, value: Array of messages
const conversationHistory = new Map();

// 模型名称
// const MODEL_NAME = "qwen3:0.6b";
const MODEL_NAME = "llama3";

// 初始化 LangChain Ollama 客户端，连接到本地部署的 Ollama（端口 11434）
const llm = new ChatOllama({
  model: MODEL_NAME,
  baseUrl: "http://localhost:11434",
  temperature: 0.7,
  topP: 0.9,
  // 设置 stop tokens 来阻止思考过程的输出
  // stop: ["<think>", "</think>", "思考：", "推理过程："],
});

// 中间件：配置跨域支持
app.use(cors());

// 中间件：解析 JSON 请求体
app.use(express.json());

// GET 接口：返回 "hello，ollama"
app.get("/apitest", (req, res) => {
  try {
    res.json({
      message: "hello，ollama",
      status: "success",
    });
  } catch (error) {
    console.error("GET 接口错误:", error);
    res.status(500).json({
      message: "服务器错误",
      error: error.message,
    });
  }
});

// GET 接口：测试 Ollama 连接
app.get("/test-ollama", async (req, res) => {
  try {
    // 使用系统消息明确要求只返回最终答案
    const messages = [
      // new SystemMessage(
      //   "你是一个助手。请直接回答问题，不要包含任何思考过程、推理步骤或中间过程。只返回最终答案。"
      // ),
      new HumanMessage("你好"),
    ];

    // 使用 LangChain 调用模型
    const response = await llm.invoke(messages);

    res.json({
      message: "Ollama 连接成功",
      model: MODEL_NAME,
      response: response.content,
    });
  } catch (error) {
    console.error("Ollama 连接错误:", error);
    res.status(500).json({
      message: "Ollama 连接失败",
      error: error.message,
      hint: `请确保 Ollama 服务运行在 http://localhost:11434，并且模型 ${MODEL_NAME} 已下载`,
    });
  }
});

// POST 接口：与 Ollama 模型对话（支持上下文记忆）
app.post("/chat", async (req, res) => {
  try {
    const { prompt, sessionId = "default" } = req.body;

    if (!prompt) {
      return res.status(400).json({
        message: "请提供 prompt 参数",
      });
    }

    // 获取或创建会话历史
    if (!conversationHistory.has(sessionId)) {
      conversationHistory.set(sessionId, []);
    }

    const history = conversationHistory.get(sessionId);

    // 构建消息列表：系统消息 + 历史消息 + 当前用户消息
    const messages = [
      // new SystemMessage(
      //   "你是一个助手。请直接回答问题，不要包含任何思考过程、推理步骤或中间过程。只返回最终答案。"
      // ),
      ...history, // 添加历史对话
      new HumanMessage(prompt), // 添加当前用户消息
    ];

    // 使用 LangChain 调用模型
    const response = await llm.invoke(messages);

    // 将用户消息和AI回复保存到历史记录
    history.push(new HumanMessage(prompt));
    history.push(new AIMessage(response.content));

    // 限制历史记录长度，避免上下文过长（保留最近20轮对话）
    const MAX_HISTORY_LENGTH = 40; // 20轮对话 = 40条消息（用户+AI）
    if (history.length > MAX_HISTORY_LENGTH) {
      // 保留最近的N条消息
      const recentHistory = history.slice(-MAX_HISTORY_LENGTH);
      conversationHistory.set(sessionId, recentHistory);
    }

    res.json({
      message: "success",
      model: MODEL_NAME,
      sessionId: sessionId,
      prompt: prompt,
      response: response.content,
    });
  } catch (error) {
    console.error("聊天接口错误:", error);
    res.status(500).json({
      message: "处理请求失败",
      error: error.message,
    });
  }
});

// POST 接口：errorAi - 错误接收接口，使用 AI 分析错误信息
app.post("/errorAi", async (req, res) => {
  try {
    const { errors, timestamp } = req.body;

    if (!errors) {
      return res.status(400).json({
        message: "请提供 errors 参数",
      });
    }

    // 将 errors 转换为 JSON 字符串，方便 AI 理解
    const errorsJsonString = JSON.stringify(errors, null, 2);

    // 构造系统消息，明确要求 AI 返回固定格式的 JSON
    const systemPrompt = `你是一个专业的代码错误分析助手。你的任务是分析接收到的错误信息（JSON 格式），并返回固定格式的 JSON 数据。

请严格按照以下 JSON 格式返回分析结果，不要添加任何额外的文字说明：

{
  "errorCount": 错误总数（数字）,
  "errorLevel": "error|warning|info"（最高错误级别）,
  "summary": "错误的简要总结（一句话，使用中文）",
  "errors": [
    {
      "type": "错误类型（如：SyntaxError、TypeError、ReferenceError等）",
      "message": "错误消息",
      "location": "错误位置（文件路径和行号，如果有，使用中文）",
      "severity": "high|medium|low"（严重程度）,
      "suggestions": ["修改建议1（使用中文）", "修改建议2（使用中文）", "修改建议3（使用中文）"]
    }
  ]
}

要求：
1. 只返回 JSON 格式数据，不要包含任何 markdown 代码块标记（如 \`\`\`json）
2. 确保返回的是有效的 JSON 格式
3. 如果 errors 是数组，分析每个错误；如果是对象，分析整个错误对象
4. 根据错误的严重程度和类型，提供具体可行的修改建议
5. 所有文本内容（summary、suggestions）必须使用中文回答`;

    // 构造用户消息，包含实际的错误信息
    const userPrompt = `请分析以下错误信息：

${errorsJsonString}

请返回固定格式的 JSON 分析结果。注意：所有文本内容（summary、suggestions）必须使用中文回答。`;

    // 构建消息列表
    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ];

    // 调用 AI 分析错误
    const aiResponse = await llm.invoke(messages);
    let analysisResult;

    // 尝试解析 AI 返回的 JSON
    try {
      // 移除可能的 markdown 代码块标记
      let responseContent = aiResponse.content.trim();

      // 解析 JSON
      analysisResult = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("AI 返回的 JSON 解析失败:", parseError);
      console.error("AI 原始返回:", aiResponse.content);
      // 如果解析失败，返回一个默认的分析结果
      analysisResult = {
        errorCount: Array.isArray(errors) ? errors.length : 1,
        errorLevel: "error",
        summary: "无法解析错误信息，请检查错误格式",
        errors: [
          {
            type: "ParseError",
            message: "AI 返回的 JSON 格式不正确",
            location: "未知",
            severity: "medium",
            suggestions: ["检查 AI 返回的原始内容", "确保错误信息格式正确"],
          },
        ],
      };
    }

    // 返回固定格式的响应
    res.json({
      message: "success",
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("errorAi 接口错误:", error);
    res.status(500).json({
      message: "请求失败",
      error: error.message,
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`Ollama 模型: ${MODEL_NAME}`);
  console.log(`Ollama 服务地址: http://localhost:11434`);
});
