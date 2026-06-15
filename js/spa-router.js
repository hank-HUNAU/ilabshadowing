/**
 * SPA Router - 重构版单页应用路由系统
 * 
 * 重构原则：
 * 1. SPA路由器由App控制初始化，避免独立初始化冲突
 * 2. SPA路由器只负责页面切换和导航，不负责数据加载
 * 3. 数据加载完全由App负责
 * 4. 保持SPA性能优势，同时确保功能稳定
 */

class SPARouter {
  constructor() {
    this.routes = {};
    this.currentPage = 'book';
    this.pageHistory = ['book'];
    this.pageContents = {}; // 缓存页面内容
    this.app = null; // 引用App实例
    
    // 不在构造函数中调用init()，由App显式调用
  }

  /**
   * 设置App实例引用
   */
  setApp(appInstance) {
    this.app = appInstance;
  }

  /**
   * 初始化路由器（由App调用）
   */
  init() {
    this.setupRoutes();
    this.setupHistoryListener();
    this.handleInitialRoute();
    this.preloadPages();
  }

  setupRoutes() {
    // 定义路由配置（仅保留核心学习页）
    this.routes = {
      'book': {
        title: '学习',
        elementId: 'bookSelectPage',
        handler: null // book页面由App直接处理
      }
    };
  }

  setupHistoryListener() {
    // 监听浏览器历史变化
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.navigateTo(e.state.page, false);
      }
    });
  }

  handleInitialRoute() {
    // 从URL hash获取初始页面
    const hash = window.location.hash.slice(1);
    if (hash && this.routes[hash]) {
      this.navigateTo(hash, false);
    }
  }

  /**
   * 导航到指定页面
   */
  async navigateTo(page, addToHistory = true) {
    if (!this.routes[page]) {
      console.error(`[SPA Router] Route not found: ${page}`);
      return;
    }

    const route = this.routes[page];

    // 如果已经在当前页面，不执行切换
    if (this.currentPage === page && addToHistory) {
      console.log(`[SPA Router] Already on page: ${page}`);
      return;
    }

    console.log(`[SPA Router] Navigating to: ${page}`);

    // 执行页面处理
    if (route.handler) {
      try {
        await route.handler();
      } catch (error) {
        console.error(`[SPA Router] Error loading page ${page}:`, error);
        this.showLoadError(page);
        return;
      }
    } else {
      // book页面由App直接处理
      console.log(`[SPA Router] Book page handled by App`);
      if (this.app && this.app.showBookPage) {
        this.app.showBookPage();
      }
    }

    // 切换页面显示
    this.showPage(page);

    // 更新当前页面
    const previousPage = this.currentPage;
    this.currentPage = page;

    // 更新浏览器历史
    if (addToHistory) {
      window.history.pushState({ page }, '', `#${page}`);
      this.pageHistory.push(page);
    }

    // 更新导航状态
    this.updateNavigationState(page);
    
    // 更新页面标题
    document.title = `${route.title} - HANKILAB 学习中心`;
    
    // 触发页面切换事件
    this.dispatchEvent('pageChange', { page, previousPage });
  }

  /**
   * 显示页面
   */
  showPage(page) {
    const route = this.routes[page];
    if (!route || !route.elementId) {
      console.error(`[SPA Router] Invalid route configuration for: ${page}`);
      return;
    }

    // 隐藏所有页面
    Object.values(this.routes).forEach(r => {
      if (r.elementId) {
        const element = document.getElementById(r.elementId);
        if (element) {
          element.style.display = 'none';
          element.classList.remove('active');
        }
      }
    });

    // 显示目标页面
    const targetElement = document.getElementById(route.elementId);
    if (targetElement) {
      targetElement.style.display = 'block';
      targetElement.classList.add('active');
      
      // 添加页面切换动画
      targetElement.classList.add('page-enter');
      setTimeout(() => {
        targetElement.classList.remove('page-enter');
      }, 300);
    } else {
      console.error(`[SPA Router] Page element not found: ${route.elementId}`);
    }
  }

  /**
   * 更新导航状态
   */
  updateNavigationState(page) {
    // 更新侧边导航（电脑端）
    const sideNav = document.getElementById('sideNav');
    if (sideNav) {
      sideNav.querySelectorAll('.side-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
          item.classList.add('active');
        }
      });
    }
  }

  /**
   * 获取页面内容
   */
  async fetchPageContent(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error(`[SPA Router] Failed to fetch ${url}:`, error);
      throw error;
    }
  }

  /**
   * 显示加载错误
   */
  showLoadError(page) {
    console.error(`[SPA Router] Failed to load page: ${page}`);
    
    // 如果有App实例，使用App的错误显示
    if (this.app && this.app.showError) {
      this.app.showError(`无法加载 ${this.routes[page]?.title || page} 页面`);
      return;
    }
    
    // 否则显示简单错误
    const errorContent = `
      <div class="error-page">
        <div class="error-icon">⚠️</div>
        <h2>页面加载失败</h2>
        <p>无法加载 ${this.routes[page]?.title || page} 页面</p>
        <button onclick="window.spaRouter.navigateTo('book')" class="btn-primary">返回首页</button>
      </div>
    `;
    
    let errorElement = document.getElementById(`${page}Page`);
    if (!errorElement) {
      errorElement = document.createElement('div');
      errorElement.id = `${page}Page`;
      errorElement.className = 'spa-page';
      errorElement.style.display = 'none';
      document.getElementById('app').appendChild(errorElement);
    }
    
    errorElement.innerHTML = errorContent;
    this.pageContents[page] = true;
  }

  /**
   * 预加载页面内容
   */
  async preloadPages() {
    // 核心应用仅保留学习页，无需预加载其他页面
  }

  /**
   * 返回上一页
   */
  goBack() {
    if (this.pageHistory.length > 1) {
      this.pageHistory.pop();
      const previousPage = this.pageHistory.pop();
      this.navigateTo(previousPage, false);
    } else {
      // 如果历史记录只有当前页面，返回书架
      this.navigateTo('book', false);
    }
  }

  /**
   * 获取当前页面
   */
  getCurrentPage() {
    return this.currentPage;
  }

  /**
   * 派发自定义事件
   */
  dispatchEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }

  /**
   * 销毁路由器
   */
  destroy() {
    // 清理事件监听器
    window.removeEventListener('popstate', this.handlePopState);
    
    // 清理缓存
    this.pageContents = {};
    this.pageHistory = [];
    
    console.log(`[SPA Router] Destroyed`);
  }
}

// 导出供App使用
window.SPARouter = SPARouter;