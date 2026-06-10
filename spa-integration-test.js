/**
 * SPA集成测试脚本
 * 
 * 使用方法：
 * 1. 打开主应用 (index.html)
 * 2. 在浏览器控制台中粘贴并运行以下代码：
 * 
 * const script = document.createElement('script');
 * script.src = 'spa-integration-test.js';
 * document.head.appendChild(script);
 * script.onload = function() {
 *   runAllTests();
 * };
 */

// 测试状态
const tests = {};

// 添加日志
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// 更新测试状态
function updateTestStatus(testId, status) {
  tests[testId] = status;
}

// 测试：SPA路由器初始化
async function testSPARouter() {
  log('开始测试: SPA路由器初始化');
  
  // 检查window.spaRouter是否存在
  if (!window.spaRouter) {
    log('错误: window.spaRouter 不存在', 'error');
    updateTestStatus('spa-router', false);
    return false;
  }
  
  log('✓ SPA路由器已初始化');
  
  // 检查SPA路由器的方法
  const methods = ['navigateTo', 'goBack', 'getCurrentPage', 'init'];
  for (const method of methods) {
    if (typeof window.spaRouter[method] !== 'function') {
      log(`错误: SPA路由器缺少方法 ${method}`, 'error');
      updateTestStatus('spa-router', false);
      return false;
    }
  }
  
  log(`✓ SPA路由器方法检查通过 (${methods.length} 个方法)`, 'success');
  updateTestStatus('spa-router', true);
  return true;
}

// 测试：课本选择页面
async function testBookPage() {
  log('开始测试: 课本选择页面');
  
  // 检查bookSelectPage元素是否存在
  const bookPage = document.getElementById('bookSelectPage');
  if (!bookPage) {
    log('错误: bookSelectPage 元素不存在', 'error');
    updateTestStatus('book-page', false);
    return false;
  }
  
  log('✓ 课本选择页面元素存在');
  
  // 检查bookGrid元素是否存在
  const bookGrid = document.getElementById('bookGrid');
  if (!bookGrid) {
    log('错误: bookGrid 元素不存在', 'error');
    updateTestStatus('book-page', false);
    return false;
  }
  
  log('✓ 课本网格元素存在');
  
  // 检查是否有课本卡片
  const bookCards = bookGrid.querySelectorAll('.book-card');
  if (bookCards.length === 0) {
    log('警告: 没有找到课本卡片', 'error');
    updateTestStatus('book-page', false);
    return false;
  }
  
  log(`✓ 找到 ${bookCards.length} 个课本卡片`, 'success');
  updateTestStatus('book-page', true);
  return true;
}

// 测试：导航功能
async function testNavigation() {
  log('开始测试: 导航功能');
  
  // 检查底部导航
  const bottomNav = document.getElementById('bottomNav');
  if (!bottomNav) {
    log('错误: bottomNav 元素不存在', 'error');
    updateTestStatus('navigation', false);
    return false;
  }
  
  const navItems = bottomNav.querySelectorAll('.nav-item');
  if (navItems.length === 0) {
    log('错误: 没有找到导航项', 'error');
    updateTestStatus('navigation', false);
    return false;
  }
  
  log(`✓ 找到 ${navItems.length} 个导航项`, 'success');
  updateTestStatus('navigation', true);
  return true;
}

// 测试：页面切换
async function testPageSwitch() {
  log('开始测试: 页面切换');
  
  if (!window.spaRouter) {
    log('错误: SPA路由器未初始化', 'error');
    updateTestStatus('page-switch', false);
    return false;
  }
  
  // 保存当前页面
  const initialPage = window.spaRouter.getCurrentPage();
  log(`初始页面: ${initialPage}`);
  
  // 测试导航到收藏页面
  log('尝试导航到收藏页面...');
  await window.spaRouter.navigateTo('favorite');
  
  // 等待页面切换
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 检查当前页面
  const currentPage = window.spaRouter.getCurrentPage();
  if (currentPage !== 'favorite') {
    log(`错误: 当前页面不是 favorite，而是 ${currentPage}`, 'error');
    updateTestStatus('page-switch', false);
    return false;
  }
  
  log('✓ 成功导航到收藏页面');
  
  // 返回book页面
  log('尝试返回book页面...');
  await window.spaRouter.navigateTo('book');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const newCurrentPage = window.spaRouter.getCurrentPage();
  if (newCurrentPage !== 'book') {
    log(`错误: 当前页面不是 book，而是 ${newCurrentPage}`, 'error');
    updateTestStatus('page-switch', false);
    return false;
  }
  
  log('✓ 成功返回book页面', 'success');
  updateTestStatus('page-switch', true);
  return true;
}

// 测试：浏览器历史
async function testBrowserHistory() {
  log('开始测试: 浏览器历史');
  
  if (!window.spaRouter) {
    log('错误: SPA路由器未初始化', 'error');
    updateTestStatus('browser-history', false);
    return false;
  }
  
  // 保存当前页面
  const initialPage = window.spaRouter.getCurrentPage();
  log(`初始页面: ${initialPage}`);
  
  // 导航到多个页面
  log('导航到收藏页面...');
  await window.spaRouter.navigateTo('favorite');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  log('导航到统计页面...');
  await window.spaRouter.navigateTo('stats');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  log('导航到设置页面...');
  await window.spaRouter.navigateTo('settings');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  log('✓ 页面导航完成');
  
  // 测试返回功能
  log('测试返回功能...');
  window.spaRouter.goBack();
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const backPage = window.spaRouter.getCurrentPage();
  if (backPage !== 'stats') {
    log(`错误: 返回后页面应该是 stats，但实际是 ${backPage}`, 'error');
    updateTestStatus('browser-history', false);
    return false;
  }
  
  log('✓ 返回功能正常');
  
  // 返回初始页面
  await window.spaRouter.navigateTo(initialPage);
  log('✓ 浏览器历史测试通过', 'success');
  updateTestStatus('browser-history', true);
  return true;
}

// 测试：页面切换性能
async function testPageSwitchPerformance() {
  log('开始测试: 页面切换性能');
  
  if (!window.spaRouter) {
    log('错误: SPA路由器未初始化', 'error');
    updateTestStatus('page-switch-performance', false);
    return false;
  }
  
  const iterations = 10;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    await window.spaRouter.navigateTo('favorite');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    await window.spaRouter.navigateTo('book');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const end = performance.now();
    times.push(end - start);
  }
  
  const avgTime = times.reduce((a, b) => a + b) / times.length;
  const maxTime = Math.max(...times);
  const minTime = Math.min(...times);
  
  log(`页面切换性能统计 (${iterations} 次迭代):`);
  log(`  平均时间: ${avgTime.toFixed(2)}ms`);
  log(`  最大时间: ${maxTime.toFixed(2)}ms`);
  log(`  最小时间: ${minTime.toFixed(2)}ms`);
  
  // 性能目标：平均时间 < 200ms
  if (avgTime > 200) {
    log('警告: 页面切换性能未达标（目标: < 200ms）', 'error');
    updateTestStatus('page-switch-performance', false);
    return false;
  }
  
  log('✓ 页面切换性能测试通过', 'success');
  updateTestStatus('page-switch-performance', true);
  return true;
}

// 测试：内存使用
async function testMemoryUsage() {
  log('开始测试: 内存使用');
  
  if (!window.performance || !window.performance.memory) {
    log('警告: 浏览器不支持性能内存API');
    updateTestStatus('memory-usage', true);
    return true;
  }
  
  const memory = window.performance.memory;
  log(`内存使用情况:`);
  log(`  已用内存: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`);
  log(`  内存限制: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`);
  log(`  内存使用率: ${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(2)}%`);
  
  // 检查内存泄漏
  const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
  if (usage > 0.8) {
    log('警告: 内存使用率过高 (> 80%)', 'error');
    updateTestStatus('memory-usage', false);
    return false;
  }
  
  log('✓ 内存使用测试通过', 'success');
  updateTestStatus('memory-usage', true);
  return true;
}

// 测试：控制台错误
async function testConsoleErrors() {
  log('开始测试: 控制台错误检查');
  
  // 拦截console.error
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // 执行一些操作
  if (window.spaRouter) {
    await window.spaRouter.navigateTo('favorite');
    await window.spaRouter.navigateTo('book');
  }
  
  // 恢复console.error
  console.error = originalError;
  
  if (errors.length > 0) {
    log(`发现 ${errors.length} 个错误:`, 'error');
    errors.forEach(error => log(`  - ${error}`, 'error'));
    updateTestStatus('console-errors', false);
    return false;
  }
  
  log('✓ 没有发现控制台错误', 'success');
  updateTestStatus('console-errors', true);
  return true;
}

// 运行所有测试
async function runAllTests() {
  log('========================================');
  log('开始运行SPA集成测试');
  log('========================================');
  
  const testFunctions = [
    { id: 'spa-router', fn: testSPARouter },
    { id: 'book-page', fn: testBookPage },
    { id: 'navigation', fn: testNavigation },
    { id: 'page-switch', fn: testPageSwitch },
    { id: 'browser-history', fn: testBrowserHistory },
    { id: 'page-switch-performance', fn: testPageSwitchPerformance },
    { id: 'memory-usage', fn: testMemoryUsage },
    { id: 'console-errors', fn: testConsoleErrors }
  ];
  
  for (const { id, fn } of testFunctions) {
    try {
      await fn();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      log(`✗ 测试异常: ${id} - ${error.message}`, 'error');
      updateTestStatus(id, false);
    }
  }
  
  // 汇总结果
  const total = Object.keys(tests).length;
  const passed = Object.values(tests).filter(v => v === true).length;
  const failed = Object.values(tests).filter(v => v === false).length;
  
  log('========================================');
  log('测试结果汇总:');
  log(`  总测试数: ${total}`);
  log(`  通过: ${passed} (${(passed/total*100).toFixed(1)}%)`, passed > 0 ? 'success' : 'error');
  log(`  失败: ${failed} ${failed > 0 ? '❌' : ''}`);
  log('========================================');
  
  if (failed === 0) {
    log('🎉 所有测试通过！', 'success');
  } else {
    log('⚠️ 部分测试失败，请检查错误信息', 'error');
  }
}

// 导出函数
window.testSPARouter = testSPARouter;
window.testBookPage = testBookPage;
window.testNavigation = testNavigation;
window.testPageSwitch = testPageSwitch;
window.testBrowserHistory = testBrowserHistory;
window.testPageSwitchPerformance = testPageSwitchPerformance;
window.testMemoryUsage = testMemoryUsage;
window.testConsoleErrors = testConsoleErrors;
window.runAllTests = runAllTests;

console.log('✅ SPA集成测试脚本已加载');
console.log('运行 runAllTests() 开始测试');
console.log('或运行单个测试，例如：testSPARouter()');