/**
 * 测试结构化输出的三种方法
 * 
 * 运行方式：node test-structured-output.js
 * 
 * 确保服务器已启动：npm run dev
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// 测试数据
const testErrors = {
  errors: {
    type: "TypeError",
    message: "Cannot read property 'map' of undefined",
    stack: "at UserList.jsx:15:8\nat renderWithHooks (react-dom.js:1234)\nat updateFunctionComponent (react-dom.js:5678)",
    componentStack: "UserList (UserList.jsx:15)\nApp (App.jsx:42)"
  },
  timestamp: new Date().toISOString()
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function separator(title) {
  console.log('\n' + '='.repeat(80));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(80) + '\n');
}

// 测试方法一：withStructuredOutput
async function testWithStructuredOutput() {
  separator('测试方法一：withStructuredOutput（推荐）');
  
  try {
    log('🚀 发送请求到 /errorAi...', 'blue');
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/errorAi`, testErrors, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000, // 60秒超时
    });
    
    const duration = Date.now() - startTime;
    
    log(`✅ 请求成功！耗时: ${duration}ms`, 'green');
    log(`📊 使用方法: ${response.data.method}`, 'yellow');
    log('\n📝 分析结果:', 'blue');
    console.log(JSON.stringify(response.data.analysis, null, 2));
    
    return { success: true, duration, method: '方法一' };
  } catch (error) {
    log(`❌ 请求失败: ${error.message}`, 'red');
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return { success: false, method: '方法一', error: error.message };
  }
}

// 测试方法二：StructuredOutputParser
async function testStructuredOutputParser() {
  separator('测试方法二：StructuredOutputParser（通用）');
  
  try {
    log('🚀 发送请求到 /errorAi-parser...', 'blue');
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/errorAi-parser`, testErrors, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });
    
    const duration = Date.now() - startTime;
    
    log(`✅ 请求成功！耗时: ${duration}ms`, 'green');
    log(`📊 使用方法: ${response.data.method}`, 'yellow');
    log('\n📝 分析结果:', 'blue');
    console.log(JSON.stringify(response.data.analysis, null, 2));
    
    return { success: true, duration, method: '方法二' };
  } catch (error) {
    log(`❌ 请求失败: ${error.message}`, 'red');
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return { success: false, method: '方法二', error: error.message };
  }
}

// 测试方法三：JSON Mode
async function testJSONMode() {
  separator('测试方法三：JSON Mode（原生支持）');
  
  try {
    log('🚀 发送请求到 /errorAi-json...', 'blue');
    const startTime = Date.now();
    
    const response = await axios.post(`${BASE_URL}/errorAi-json`, testErrors, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 60000,
    });
    
    const duration = Date.now() - startTime;
    
    log(`✅ 请求成功！耗时: ${duration}ms`, 'green');
    log(`📊 使用方法: ${response.data.method}`, 'yellow');
    log('\n📝 分析结果:', 'blue');
    console.log(JSON.stringify(response.data.analysis, null, 2));
    
    return { success: true, duration, method: '方法三' };
  } catch (error) {
    log(`❌ 请求失败: ${error.message}`, 'red');
    if (error.response) {
      log(`错误详情: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    }
    return { success: false, method: '方法三', error: error.message };
  }
}

// 测试服务器连接
async function testConnection() {
  try {
    log('🔍 检查服务器连接...', 'blue');
    const response = await axios.get(`${BASE_URL}/apitest`, { timeout: 5000 });
    
    if (response.data.status === 'success') {
      log('✅ 服务器连接正常', 'green');
      return true;
    }
  } catch (error) {
    log(`❌ 服务器连接失败: ${error.message}`, 'red');
    log('请确保服务器已启动（npm run dev）', 'yellow');
    return false;
  }
}

// 主测试函数
async function runAllTests() {
  log('\n🎯 开始测试 LangChain.js 结构化输出方法', 'cyan');
  log(`📅 测试时间: ${new Date().toLocaleString('zh-CN')}`, 'cyan');
  
  // 检查服务器连接
  const isConnected = await testConnection();
  if (!isConnected) {
    log('\n❌ 无法连接到服务器，测试终止', 'red');
    process.exit(1);
  }
  
  console.log('\n');
  
  // 测试三种方法
  const results = [];
  
  results.push(await testWithStructuredOutput());
  await sleep(2000); // 等待2秒
  
  results.push(await testStructuredOutputParser());
  await sleep(2000);
  
  results.push(await testJSONMode());
  
  // 输出测试总结
  separator('测试总结');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  log(`总测试数: ${results.length}`, 'blue');
  log(`成功: ${successCount}`, successCount > 0 ? 'green' : 'reset');
  log(`失败: ${failCount}`, failCount > 0 ? 'red' : 'reset');
  
  console.log('\n📊 详细结果:\n');
  results.forEach(result => {
    if (result.success) {
      log(`  ✅ ${result.method}: 成功 (${result.duration}ms)`, 'green');
    } else {
      log(`  ❌ ${result.method}: 失败 - ${result.error}`, 'red');
    }
  });
  
  console.log('\n');
  
  // 给出建议
  if (successCount === 3) {
    log('🎉 所有方法都测试成功！建议在生产环境使用方法一（withStructuredOutput）', 'green');
  } else if (successCount > 0) {
    log('⚠️  部分方法测试失败，这是正常的（取决于你的模型版本）', 'yellow');
    log('💡 建议使用测试成功的方法', 'yellow');
    
    const successfulMethods = results.filter(r => r.success).map(r => r.method);
    if (successfulMethods.length > 0) {
      log(`\n可用方法: ${successfulMethods.join(', ')}`, 'green');
    }
  } else {
    log('❌ 所有方法都失败了，请检查：', 'red');
    log('  1. Ollama 服务是否运行正常', 'yellow');
    log('  2. 模型是否已下载（ollama pull llama3）', 'yellow');
    log('  3. 服务器日志中的错误信息', 'yellow');
  }
  
  separator('测试完成');
}

// 辅助函数：等待
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行测试
runAllTests().catch(error => {
  log(`\n❌ 测试过程中发生错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

