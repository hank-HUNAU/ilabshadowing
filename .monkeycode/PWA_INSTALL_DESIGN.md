# PWA 安装提示设计方案

---

## 📋 设计原则

1. **严格参照现有风格**：使用项目已有的 `.pwa-dialog-content` 组件
2. **简洁**：去除冗余装饰，保留核心信息
3. **大小适中**：宽度 480px，移动端 90% 宽度
4. **非侵入式**：延迟 3 秒后自动触发，不打断用户操作
5. **平台差异化**：iOS/Android/桌面端显示不同提示内容

---

## 🎨 UI 设计规范

### 尺寸与布局

| 属性 | 桌面端 | 平板端 | 移动端 |
|------|--------|--------|--------|
| **最大宽度** | 480px | 480px | 90% |
| **内边距** | 28px | 28px | 20px |
| **圆角** | 20px | 20px | 20px |
| **图标尺寸** | 64x64px | 56x56px | 48x48px |
| **标题字号** | 1.2rem | 1.2rem | 1.1rem |
| **描述字号** | 0.9rem | 0.9rem | 0.85rem |

### 设计语言

```css
// 使用项目现有 CSS 变量
--card: rgba(255, 255, 255, 0.95)
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12)
--radius-xl: 20px
--primary: #007aff
--text: #1d1d1f
--text-secondary: #6e6e73
--text-tertiary: #86868b
```

---

## 📐 弹窗结构

```
┌────────────────────────────────────────────┐
│                                            │
│              🎯 [应用图标 64px]             │
│                                            │
│          安装到桌面，体验更佳                │
│      快速启动，离线可用                      │
│                                            │
│  ┌──────────────────────────────────────┐  │
│  │  📦 离线使用（无网络也能学习）         │  │
│  │  🚀 快速启动（桌面图标）              │  │
│  │  💾 节省流量（资源本地缓存）          │  │
│  │  ✨ 完整功能（与网页版一致）          │  │
│  └──────────────────────────────────────┘  │
│                                            │
│  ┌────────────┐  ┌────────────────────┐    │
│  │  稍后提醒   │  │    立即安装        │    │
│  └────────────┘  └────────────────────┘    │
│                                            │
└────────────────────────────────────────────┘
```

---

## 🎯 触发策略

### 触发条件

| 条件 | 说明 |
|------|------|
| **延迟时间** | 页面加载后 3 秒 |
| **触发频率** | 每个会话仅触发一次 |
| **平台检测** | 自动识别 iOS/Android/桌面端 |
| **beforeinstallprompt** | Chrome/Edge 自动监听 |
| **已安装检测** | 已安装则不显示 |

### 触发流程

```
页面加载
  ↓
等待 3 秒
  ↓
检测是否已安装？──是──→ 结束
  ↓ 否
检测 beforeinstallprompt？──有──→ 显示安装弹窗
  ↓ 无
显示手动引导弹窗（iOS/部分桌面）
  ↓
用户点击「立即安装」/「稍后提醒」
  ↓
记录用户选择（localStorage）
```

---

## 💻 平台差异化内容

### 桌面端 (Chrome/Edge)

| 元素 | 内容 |
|------|------|
| **标题** | 安装桌面应用 |
| **描述** | 将应用安装到电脑，快速启动 |
| **按钮** | 「稍后提醒」/「立即安装」 |
| **安装方式** | 自动触发浏览器安装弹窗 |

### iOS 设备

| 元素 | 内容 |
|------|------|
| **标题** | 在 Safari 中添加应用 |
| **描述** | iOS 设备需要手动安装到主屏幕 |
| **指南** | 1. 点击分享按钮 2. 选择「添加到主屏幕」3. 点击「添加」 |
| **按钮** | 「我知道了」 |

### Android 设备

| 元素 | 内容 |
|------|------|
| **标题** | 安装应用，体验更佳 |
| **描述** | 一键安装到主屏幕，享受原生体验 |
| **指南** | 1. 点击「立即安装」2. 确认安装 |
| **按钮** | 「稍后提醒」/「立即安装」 |

---

## 📝 实现代码

### 1. HTML 弹窗结构（已存在）

```html
<dialog id="pwaInstallDialog" class="pwa-dialog">
  <div class="pwa-dialog-content">
    <div class="pwa-icon">
      <img src="/icons/icon-192.png" alt="HANKILAB" class="app-install-icon">
    </div>
    <h3 class="install-title">安装桌面应用</h3>
    <p class="pwa-desc">将应用安装到电脑，快速启动</p>
    <ul class="install-benefits"></ul>
    <div class="install-actions">
      <button id="pwaInstallCancel" class="btn-secondary">稍后提醒</button>
      <button id="pwaInstallConfirm" class="btn-primary">立即安装</button>
    </div>
  </div>
</dialog>
```

### 2. 触发逻辑（待添加到 index.html）

```javascript
// 在 DOMContentLoaded 中添加
document.addEventListener('DOMContentLoaded', () => {
  // PWA 安装提示自动触发
  const showInstallPrompt = () => {
    // 检测是否已安装
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (window.navigator.standalone === true) return;
    
    // 检测是否已拒绝
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const daysSince = (Date.now() - parseInt(dismissed)) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return; // 7 天内不再显示
    }
    
    // 显示安装提示
    if (window.PWA_INSTALL) {
      setTimeout(() => {
        window.PWA_INSTALL.showInstallPrompt();
      }, 3000);
    }
  };
  
  showInstallPrompt();
});
```

### 3. 安装成功提示（已存在）

```html
<dialog id="installSuccessDialog" class="pwa-dialog">
  <div class="pwa-dialog-content" style="text-align:center">
    <div class="pwa-icon">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" style="color:#34c759">
        <path d="M20 6L9 17l-5-5"/>
      </svg>
    </div>
    <h3>安装成功！</h3>
    <p>应用已添加到主屏幕</p>
    <p style="color:var(--text-tertiary);font-size:0.9rem;margin-top:8px">下次可直接从桌面图标启动</p>
  </div>
</dialog>
```

---

## ✅ 功能验证

| 验证项 | 方法 | 预期结果 |
|--------|------|----------|
| **首次访问** | 打开页面等待 3 秒 | 显示安装提示弹窗 |
| **点击「稍后提醒」** | 点击关闭按钮 | 弹窗关闭，7 天内不再显示 |
| **点击「立即安装」** | 点击安装按钮 | 触发浏览器安装流程 |
| **安装成功** | 完成安装 | 显示成功提示，3 秒后自动关闭 |
| **iOS 设备** | 使用 iOS 打开 | 显示手动安装指南 |
| **已安装设备** | 已安装 PWA | 不显示安装提示 |
| **课本选择页面** | 查看 DOM | 不受影响 |
| **课程卡片页面** | 查看 DOM | 不受影响 |
| **播放器弹窗** | 查看 DOM | 不受影响 |

---

## 🎯 设计特点

1. **非侵入式**：延迟 3 秒触发，不打断用户首屏体验
2. **频率控制**：7 天内仅提示一次，避免骚扰
3. **平台适配**：自动识别平台显示合适内容
4. **简洁设计**：480px 宽度，信息紧凑
5. **风格一致**：使用项目现有组件和 CSS 变量
6. **功能隔离**：独立模块，不影响核心页面

---

## 📌 与现有代码的集成

| 文件 | 变更 | 说明 |
|------|------|------|
| `index.html` | 添加触发代码 | 页面加载 3 秒后自动检测 |
| `js/version-manager.js` | 无需修改 | PWA_INSTALL 已完整实现 |
| `css/style.css` | 无需修改 | pwa-dialog-content 样式已存在 |
| `manifest.json` | 无需修改 | 配置完整 |
| `sw.js` | 无需修改 | Service Worker 正常 |

---

**设计完成，待确认后实施。**
