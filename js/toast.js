/* Toast 提示工具 */
class ToastManager {
  constructor() {
    this.container = document.getElementById('toastContainer');
    if (!this.container) {
      console.error('Toast container not found');
    }
  }
  
  show(message, type = 'info', duration = 3000) {
    if (!this.container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = this.getIcon(type);
    toast.innerHTML = `
      <span style="margin-right:8px">${icon}</span>
      <span>${this.escapeHtml(message)}</span>
    `;
    
    this.container.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
      this.remove(toast);
    }, duration);
    
    return toast;
  }
  
  remove(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.parentNode?.removeChild(toast);
    }, 300);
  }
  
  success(message, duration) {
    return this.show(message, 'success', duration);
  }
  
  error(message, duration) {
    return this.show(message, 'error', duration);
  }
  
  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }
  
  info(message, duration) {
    return this.show(message, 'info', duration);
  }
  
  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || 'ℹ';
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/* Loading 管理器 */
class LoadingManager {
  constructor() {
    this.overlay = document.getElementById('loadingOverlay');
    this.textEl = this.overlay?.querySelector('.loading-text');
    this.hideTimeout = null;
  }
  
  show(text = '加载中...') {
    if (!this.overlay) return;
    
    if (this.textEl) {
      this.textEl.textContent = text;
    }
    
    this.overlay.style.display = 'flex';
    
    // 防止闪烁，至少显示 500ms
    clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      this.overlay.dataset.canHide = 'true';
    }, 500);
  }
  
  hide() {
    if (!this.overlay) return;
    
    const canHide = this.overlay.dataset.canHide === 'true';
    
    if (canHide) {
      this.overlay.style.display = 'none';
      delete this.overlay.dataset.canHide;
    } else {
      // 还未到最小显示时间，延迟隐藏
      this.hideTimeout = setTimeout(() => {
        this.hide();
      }, 100);
    }
  }
}

/* 全局实例 */
const toast = new ToastManager();
const loading = new LoadingManager();

/* 按钮波纹效果 */
function initButtonRipple() {
  document.querySelectorAll('.ctrl-btn, .pwa-btn-primary, .pwa-btn-secondary, .setting-btn, .empty-state-action').forEach(btn => {
    btn.classList.add('btn-ripple');
  });
}

/* 页面加载动画 */
function initPageAnimations() {
  document.querySelectorAll('.book-card, .unit-card, .stat-card, .course-select-item, .progress-item').forEach(card => {
    card.classList.add('card-hover');
  });
}

/* 增强键盘导航 */
function initKeyboardNav() {
  // ESC 关闭所有弹窗
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('dialog[open]').forEach(dlg => {
        dlg.close();
      });
    }
  });
  
  // Tab 键导航优化
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-nav');
    }
  });
  
  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-nav');
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initButtonRipple();
  initPageAnimations();
  initKeyboardNav();
});

// 全局暴露
window.toast = toast;
window.loading = loading;
window.initButtonRipple = initButtonRipple;
