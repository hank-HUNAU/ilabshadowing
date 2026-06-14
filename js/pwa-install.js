// PWA 完整逻辑：Service Worker 注册 + 安装提示弹窗控制

// Service Worker 注册
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(reg => console.log("[PWA] Service Worker 注册成功:", reg.scope))
      .catch(err => console.error("[PWA] Service Worker 注册失败:", err));
  });
}

// 安装提示弹窗逻辑
(function() {
  const installDialog = document.getElementById('pwaInstallDialog');
  const installBtn = document.getElementById('pwaInstallConfirm');
  const cancelBtn = document.getElementById('pwaInstallCancel');
  const successDialog = document.getElementById('installSuccessDialog');

  // 安装按钮
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      // 记录尝试安装
      const pwaStats = JSON.parse(localStorage.getItem('pwa_install_stats') || '{"shown":0,"accepted":0,"dismissed":0}');
      pwaStats.accepted++;
      localStorage.setItem('pwa_install_stats', JSON.stringify(pwaStats));
      
      const evt = window.__pwaDeferredPrompt;
      if (evt) {
        evt.prompt();
        try {
          const { outcome } = await evt.userChoice;
          console.log('[PWA] 安装结果:', outcome);
          if (outcome === 'accepted') {
            pwaStats.installed = true;
            pwaStats.installDate = Date.now();
            localStorage.setItem('pwa_install_stats', JSON.stringify(pwaStats));
          }
        } catch(e) {}
        window.__pwaDeferredPrompt = null;
      } else {
        if (window.toast) {
          window.toast.info("请点击浏览器菜单中的'添加到主屏幕'");
        } else {
          alert("请使用浏览器菜单中的'添加到主屏幕'功能");
        }
      }
      if (installDialog) installDialog.close();
    });
  }

  // 取消按钮
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      // 记录拒绝安装
      const pwaStats = JSON.parse(localStorage.getItem('pwa_install_stats') || '{"shown":0,"accepted":0,"dismissed":0}');
      pwaStats.dismissed++;
      localStorage.setItem('pwa_install_stats', JSON.stringify(pwaStats));
      
      localStorage.setItem('pwa_install_dismissed', Date.now());
      if (installDialog) installDialog.close();
    });
  }

  // 背景遮罩点击关闭
  if (installDialog) {
    installDialog.addEventListener('click', (event) => {
      if (event.target === installDialog) {
        installDialog.close();
      }
    });
  }

  // 安装成功弹窗自动关闭
  if (successDialog) {
    setTimeout(() => {
      if (successDialog.open) successDialog.close();
    }, 3000);
  }

  // 自动显示安装提示
  const showPrompt = () => {
    // 检测已安装
    if (window.matchMedia('(display-mode: standalone)').matches || 
        window.navigator.standalone === true) return;
    
    // 检测已拒绝 (7天内)
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    if (dismissed) {
      const days = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (days < 7) return;
    }

    // 记录展示次数
    const pwaStats = JSON.parse(localStorage.getItem('pwa_install_stats') || '{"shown":0,"accepted":0,"dismissed":0}');
    pwaStats.shown++;
    localStorage.setItem('pwa_install_stats', JSON.stringify(pwaStats));

    // 延迟 3 秒显示，使用 requestAnimationFrame 确保动画流畅
    setTimeout(() => {
      requestAnimationFrame(() => {
        if (installDialog) installDialog.showModal();
      });
    }, 3000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showPrompt);
  } else {
    showPrompt();
  }
})();
