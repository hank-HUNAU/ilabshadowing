// PWA 事件捕获（需在 head 中尽早执行）
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__pwaDeferredPrompt = e;
});
