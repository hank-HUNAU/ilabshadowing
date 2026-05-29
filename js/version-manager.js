/**
 * 版本管理模块
 * - 自动获取应用版本号
 * - 检查更新并显示更新日志
 * - 管理版本相关本地存储
 */

const VERSION = {
  // 当前版本号（由构建脚本或 Git 自动注入）
  current: '20260128',
  
  // 获取完整版本号（带 Git commit hash）
  getFullVersion() {
    return this.current;
  },
  
  // 获取语义化版本号
  getSemanticVersion() {
    const changelog = window.appChangelog;
    if (changelog && changelog.versions && changelog.versions[this.current]) {
      return changelog.versions[this.current].version;
    }
    return '1.0.0';
  },
  
  // 获取版本信息（标题 + 日期）
  getVersionInfo() {
    const changelog = window.appChangelog;
    if (changelog && changelog.versions && changelog.versions[this.current]) {
      const ver = changelog.versions[this.current];
      return {
        version: ver.version,
        title: ver.title,
        date: ver.date
      };
    }
    return {
      version: '1.0.0',
      title: '正式版',
      date: '2026-01-28'
    };
  }
};

/**
 * 更新日志管理
 */
const CHANGELOG = {
  url: './changelog.json',
  data: null,
  
  /**
   * 加载更新日志
   */
  async load() {
    try {
      const res = await fetch(this.url + '?t=' + Date.now());
      this.data = await res.json();
      window.appChangelog = this.data;
      return this.data;
    } catch (err) {
      console.error('[Changelog] 加载失败:', err);
      return null;
    }
  },
  
  /**
   * 获取最新版本号
   */
  getLatestVersion() {
    return this.data?.latest || VERSION.current;
  },
  
  /**
   * 检查是否有更新
   */
  hasUpdate() {
    if (!this.data) return false;
    const latest = this.data.latest;
    const current = VERSION.current;
    return latest !== current && this.compareVersions(latest, current) > 0;
  },
  
  /**
   * 版本比较（返回 1: v1>v2, 0: v1=v2, -1: v1<v2）
   */
  compareVersions(v1, v2) {
    // 日期格式版本：20260128
    if (/^\d{8}$/.test(v1) && /^\d{8}$/.test(v2)) {
      return v1 > v2 ? 1 : (v1 < v2 ? -1 : 0);
    }
    // 语义化版本：2.1.0
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  },
  
  /**
   * 获取版本更新内容
   */
  getVersionContent(ver) {
    if (!this.data?.versions?.[ver]) return null;
    return this.data.versions[ver];
  },
  
  /**
   * 获取更新日志列表（用于"关于"页面）
   */
  getHistory(limit = 10) {
    if (!this.data?.versions) return [];
    const versions = Object.keys(this.data.versions).sort((a, b) => b.localeCompare(a));
    return versions.slice(0, limit).map(ver => this.data.versions[ver]);
  }
};

/**
 * 更新提示管理
 */
const UPDATE_NOTIFY = {
  storageKey: 'nce_last_update_viewed',
  
  /**
   * 检查是否需要显示更新提示
   */
  shouldShow() {
    const lastViewed = localStorage.getItem(this.storageKey);
    const currentVersion = VERSION.current;
    
    // 从未显示过，或当前版本已更新
    if (!lastViewed || lastViewed !== currentVersion) {
      return true;
    }
    return false;
  },
  
  /**
   * 标记更新提示已查看
   */
  markAsViewed() {
    localStorage.setItem(this.storageKey, VERSION.current);
  },
  
  /**
   * 显示更新 Toast 通知
   */
  showUpdateToast() {
    const content = CHANGELOG.getVersionContent(VERSION.current);
    if (!content) return;
    
    const version = content.version;
    const title = content.title;
    
    // 显示 Toast 通知
    if (window.toast?.info) {
      window.toast.info(`v${version} 版本更新：${title}`);
      
      // 5 秒后显示详细更新日志链接
      setTimeout(() => {
        if (window.toast?.info) {
          window.toast.info('用户中心 → 关于，查看更新日志');
        }
      }, 2000);
    }
    
    // 标记为已查看
    this.markAsViewed();
  },
  
  /**
   * 显示更新弹窗（已废弃，保留兼容）
   */
  showDialog() {
    this.showUpdateToast();
  }
};

/**
 * 网络状态管理
 */
const NETWORK_STATUS = {
  online: navigator.onLine,
  listeners: [],
  
  /**
   * 初始化网络状态监听
   */
  init() {
    this.online = navigator.onLine;
    
    window.addEventListener('online', () => {
      this.online = true;
      this.notify(true);
      this.showOnlineToast();
    });
    
    window.addEventListener('offline', () => {
      this.online = false;
      this.notify(false);
      this.showOfflineToast();
    });
  },
  
  /**
   * 通知状态变化
   */
  notify(online) {
    this.listeners.forEach(cb => cb(online));
  },
  
  /**
   * 添加状态监听器
   */
  onStatusChange(callback) {
    this.listeners.push(callback);
  },
  
  /**
   * 显示离线提示
   */
  showOfflineToast() {
    if (window.toast?.info) {
      window.toast.info('当前为离线模式，已缓存的内容仍可使用');
    }
  },
  
  /**
   * 显示在线提示
   */
  showOnlineToast() {
    if (window.toast?.success) {
      window.toast.success('网络已恢复');
    }
  },
  
  /**
   * 检查网络状态
   */
  isOnline() {
    return this.online;
  },
  
  /**
   * 获取网络状态文本
   */
  getStatusText() {
    return this.online ? '在线' : '离线模式';
  }
};

/**
 * PWA 安装引导优化
 */
const PWA_INSTALL = {
  deferredPrompt: null,
  installButton: null,
  
  /**
   * 初始化 PWA 安装引导
   */
  init() {
    // beforeinstallprompt 事件（Chrome/Edge/Android）
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallPrompt();
    });
    
    // 安装成功事件
    window.addEventListener('appinstalled', () => {
      this.showInstallSuccess();
      this.deferredPrompt = null;
    });
  },
  
  /**
   * 显示安装提示（平台差异化）
   */
  showInstallPrompt() {
    const dialog = document.getElementById('pwaInstallDialog');
    if (!dialog) return;
    
    // 检测平台
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const isDesktop = !isIOS && !isAndroid;
    
    // 获取平台特定内容
    const content = this.getPlatformContent(isIOS, isAndroid, isDesktop);
    
    // 更新弹窗内容
    const title = dialog.querySelector('h3');
    const desc = dialog.querySelector('.pwa-desc');
    const benefits = dialog.querySelector('.install-benefits');
    const guide = dialog.querySelector('.install-guide');
    const btn = dialog.querySelector('.pwa-btn-primary');
    
    if (title) title.textContent = content.title;
    if (desc) desc.textContent = content.desc;
    
    // 更新 benefits
    if (benefits) {
      benefits.innerHTML = content.benefits.map(b => 
        `<li><span class="benefit-icon">✦</span> ${b}</li>`
      ).join('');
    }
    
    // 更新安装指南
    if (guide) {
      guide.innerHTML = content.guide.map(g => `<li>${g}</li>`).join('');
      guide.style.display = 'block';
    }
    
    // 按钮文本
    if (btn) {
      btn.textContent = isIOS ? '我知道了' : '立即安装';
    }
    
    // 存储按钮引用
    this.installButton = btn;
    
    // 显示弹窗
    dialog.showModal();
  },
  
  /**
   * 获取平台特定内容
   */
  getPlatformContent(isIOS, isAndroid, isDesktop) {
    if (isIOS) {
      return {
        title: '📱 在 Safari 中添加应用',
        desc: 'iOS 设备需要手动安装到主屏幕',
        benefits: [
          '离线使用（无网络也能学习）',
          '快速启动（桌面图标）',
          '节省流量（资源本地缓存）',
          '完整功能（与 App 体验一致）'
        ],
        guide: [
          '点击下方「分享」按钮',
          '在弹出菜单中选择「添加到主屏幕」',
          '点击右上角「添加」完成安装'
        ]
      };
    } else if (isAndroid) {
      return {
        title: '📱 安装应用，体验更佳',
        desc: '一键安装到主屏幕，享受原生体验',
        benefits: [
          '离线使用（无网络也能学习）',
          '快速启动（桌面图标）',
          '节省流量（资源本地缓存）',
          '完整功能（与 App 体验一致）'
        ],
        guide: [
          '点击「立即安装」按钮',
          '在系统弹窗中确认安装'
        ]
      };
    } else {
      // 桌面端
      return {
        title: '💻 安装桌面应用',
        desc: '将应用安装到电脑，快速启动',
        benefits: [
          '离线使用（无网络也能学习）',
          '快速启动（程序坞/任务栏图标）',
          '节省流量（资源本地缓存）',
          '完整功能（与网页版一致）'
        ],
        guide: [
          '点击「立即安装」按钮',
          '在浏览器弹窗中确认安装'
        ]
      };
    }
  },
  
  /**
   * 触发安装
   */
  async triggerInstall() {
    if (!this.deferredPrompt) return;
    
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    console.log('[PWA] 安装结果:', outcome);
    this.deferredPrompt = null;
  },
  
  /**
   * 显示安装成功提示
   */
  showInstallSuccess() {
    const dialog = document.getElementById('installSuccessDialog');
    if (dialog) {
      dialog.showModal();
      setTimeout(() => dialog.close(), 3000);
    }
  }
};

/**
 * 缓存管理
 */
const CACHE_MANAGER = {
  /**
   * 获取缓存大小
   */
  async getCacheSize() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { quota: 0, usage: 0 };
    }
    
    const estimate = await navigator.storage.estimate();
    return {
      quota: estimate.quota || 0,
      usage: estimate.usage || 0,
      caches: estimate.caches?.usage || 0
    };
  },
  
  /**
   * 格式化字节
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },
  
  /**
   * 获取缓存详情
   */
  async getCacheDetails() {
    const cacheNames = await caches.keys();
    const details = [];
    
    for (const name of cacheNames) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      details.push({
        name,
        count: keys.length,
        type: name.includes('audio') ? '音频' : '静态资源'
      });
    }
    
    return details;
  },
  
  /**
   * 清理音频缓存
   */
  async clearAudioCache() {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      if (name.includes('audio')) {
        const cache = await caches.open(name);
        const keys = await cache.keys();
        for (const key of keys) {
          await cache.delete(key);
        }
        console.log('[Cache] Audio cache cleared:', name);
      }
    }
  },
  
  /**
   * 清理所有缓存
   */
  async clearAllCaches() {
    const cacheNames = await caches.keys();
    for (const name of cacheNames) {
      await caches.delete(name);
      console.log('[Cache] Cache deleted:', name);
    }
  }
};

// 导出到全局
window.VERSION = VERSION;
window.CHANGELOG = CHANGELOG;
window.UPDATE_NOTIFY = UPDATE_NOTIFY;
window.NETWORK_STATUS = NETWORK_STATUS;
window.PWA_INSTALL = PWA_INSTALL;
window.CACHE_MANAGER = CACHE_MANAGER;
