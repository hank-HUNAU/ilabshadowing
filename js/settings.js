// 设置页面 JavaScript
(function() {
  'use strict';

  // LocalStorage 键
  const LS = {
    USER_INFO: 'nce_user_info',
    SETTINGS: 'nce_settings',
    FAVORITES: 'nce_favorites',
    PROGRESS: 'nce_progress',
    LEARNING_STATS: 'nce_learning_stats'
  };

  // 默认设置
  const DEFAULT_SETTINGS = {
    autoPlay: true,
    repeatMode: true,
    darkMode: false,
    showTrans: true,
    hapticFeedback: true,
    playbackSpeed: 1.0
  };

  // 头像选项
  const AVATARS = ['👤', '🧑', '👶', '🧒', '👦', '👧', '👨', '👩', '🧑', '👴', '👵', '👲', '👳', '🧕', '🤴', '👸', '👼', '🤶', '🎅', '🧙'];

  // 加载设置
  function loadSettings() {
    const settings = JSON.parse(localStorage.getItem(LS.SETTINGS) || '{}');
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  // 保存设置
  function saveSettings(settings) {
    localStorage.setItem(LS.SETTINGS, JSON.stringify(settings));
  }

  // 加载用户信息
  function loadUserInfo() {
    const info = JSON.parse(localStorage.getItem(LS.USER_INFO) || '{}');
    return {
      avatar: info.avatar || '👤',
      enName: info.enName || '',
      cnName: info.cnName || '',
      ageRange: info.ageRange || ''
    };
  }

  // 保存用户信息
  function saveUserInfo() {
    const avatar = document.getElementById('avatarPreview').textContent;
    const enName = document.getElementById('userEnName').value.trim();
    const cnName = document.getElementById('userCnName').value.trim();
    const ageRange = document.getElementById('userAgeRange').value;

    if (!enName) {
      showToast('请输入昵称/英文名');
      return;
    }

    const userInfo = {
      avatar,
      enName,
      cnName,
      ageRange
    };

    localStorage.setItem(LS.USER_INFO, JSON.stringify(userInfo));
    showToast('个人信息已保存');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 初始化用户信息
  function initUserInfo() {
    const info = loadUserInfo();

    document.getElementById('avatarPreview').textContent = info.avatar;
    document.getElementById('userEnName').value = info.enName;
    document.getElementById('userCnName').value = info.cnName;
    document.getElementById('userAgeRange').value = info.ageRange;

    updateAvatarName(info.enName);
  }

  // 更新头像名称显示
  function updateAvatarName(enName) {
    const avatarName = document.getElementById('avatarName');
    if (enName) {
      avatarName.textContent = enName;
    } else {
      avatarName.textContent = '点击设置头像';
    }
  }

  // 打开头像选择器
  function openAvatarPicker() {
    const pickerHtml = `
      <div id="avatarPickerDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">选择头像</h3>
          <div id="emojiGrid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;">
            ${AVATARS.map(emoji => `
              <button onclick="selectAvatar('${emoji}')" style="width:50px;height:50px;font-size:1.8rem;border:none;background:var(--bg-secondary);border-radius:10px;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                ${emoji}
              </button>
            `).join('')}
          </div>
          <button onclick="closeAvatarPicker()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', pickerHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 选择头像
  function selectAvatar(emoji) {
    document.getElementById('avatarPreview').textContent = emoji;
    const enName = document.getElementById('userEnName').value.trim();
    updateAvatarName(enName);
    closeAvatarPicker();

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 关闭头像选择器
  function closeAvatarPicker() {
    const dialog = document.getElementById('avatarPickerDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 导出函数到全局
  window.selectAvatar = selectAvatar;
  window.closeAvatarPicker = closeAvatarPicker;

  // 切换设置
  function toggleSetting(settingKey) {
    const settings = loadSettings();
    settings[settingKey] = !settings[settingKey];
    saveSettings(settings);

    // 更新开关状态
    const switchEl = document.getElementById(`${settingKey}Switch`);
    if (switchEl) {
      switchEl.classList.toggle('active', settings[settingKey]);
    }

    // 特殊处理暗黑模式
    if (settingKey === 'darkMode') {
      applyDarkMode(settings.darkMode);
    }

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    showToast(settings[settingKey] ? '已开启' : '已关闭');
  }

  // 初始化设置开关
  function initSettings() {
    const settings = loadSettings();

    // 初始化所有开关
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      const switchEl = document.getElementById(`${key}Switch`);
      if (switchEl) {
        switchEl.classList.toggle('active', settings[key]);
      }
    });

    // 应用暗黑模式
    applyDarkMode(settings.darkMode);
  }

  // 应用暗黑模式
  function applyDarkMode(enabled) {
    if (enabled) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  // 显示速度设置
  function showSpeedSetting() {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    const settings = loadSettings();
    const currentSpeed = settings.playbackSpeed || 1.0;

    const speedHtml = `
      <div id="speedDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">播放速度</h3>
          <div style="display:flex;flex-wrap:wrap;gap:8px;">
            ${speeds.map(speed => `
              <button onclick="selectSpeed(${speed})" style="flex:1;min-width:70px;padding:12px;border:none;background:${speed === currentSpeed ? 'var(--primary)' : 'var(--bg-secondary)'};color:${speed === currentSpeed ? 'white' : 'var(--text)'};border-radius:10px;cursor:pointer;transition:all 0.2s;">
                ${speed}x
              </button>
            `).join('')}
          </div>
          <button onclick="closeSpeedDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', speedHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 选择速度
  function selectSpeed(speed) {
    const settings = loadSettings();
    settings.playbackSpeed = speed;
    saveSettings(settings);
    closeSpeedDialog();

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }

    showToast(`播放速度已设置为 ${speed}x`);
  }

  // 关闭速度对话框
  function closeSpeedDialog() {
    const dialog = document.getElementById('speedDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 导出函数到全局
  window.selectSpeed = selectSpeed;
  window.closeSpeedDialog = closeSpeedDialog;

  // 导出数据
  function exportData() {
    const data = {
      userInfo: loadUserInfo(),
      settings: loadSettings(),
      favorites: JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]'),
      progress: JSON.parse(localStorage.getItem(LS.PROGRESS) || '{}'),
      learningStats: JSON.parse(localStorage.getItem(LS.LEARNING_STATS) || '{}'),
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shadowing-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('数据已导出');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 导入数据
  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);

          // 验证数据格式
          if (!data.userInfo || !data.settings) {
            throw new Error('无效的备份文件');
          }

          // 导入数据
          if (data.userInfo) localStorage.setItem(LS.USER_INFO, JSON.stringify(data.userInfo));
          if (data.settings) localStorage.setItem(LS.SETTINGS, JSON.stringify(data.settings));
          if (data.favorites) localStorage.setItem(LS.FAVORITES, JSON.stringify(data.favorites));
          if (data.progress) localStorage.setItem(LS.PROGRESS, JSON.stringify(data.progress));
          if (data.learningStats) localStorage.setItem(LS.LEARNING_STATS, JSON.stringify(data.learningStats));

          // 重新初始化页面
          initUserInfo();
          initSettings();

          showToast('数据导入成功，页面将刷新');

          // 触觉反馈
          if (navigator.vibrate) {
            navigator.vibrate([20, 50, 20]);
          }

          setTimeout(() => {
            location.reload();
          }, 1500);
        } catch (error) {
          showToast('导入失败：' + error.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // 显示清除数据确认对话框
  function showClearDataDialog() {
    const dialog = document.getElementById('confirmDialog');
    const title = document.getElementById('confirmTitle');
    const message = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOkBtn');

    title.textContent = '清除所有数据';
    message.textContent = '确定要删除所有学习记录、收藏和设置吗？此操作不可撤销！';
    okBtn.textContent = '确认清除';
    okBtn.className = 'dialog-btn dialog-btn-danger';
    okBtn.onclick = () => {
      clearAllData();
      closeConfirmDialog();
    };

    dialog.classList.add('active');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 清除所有数据
  function clearAllData() {
    localStorage.removeItem(LS.USER_INFO);
    localStorage.removeItem(LS.SETTINGS);
    localStorage.removeItem(LS.FAVORITES);
    localStorage.removeItem(LS.PROGRESS);
    localStorage.removeItem(LS.LEARNING_STATS);

    showToast('所有数据已清除');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([50, 50, 50]);
    }

    setTimeout(() => {
      location.reload();
    }, 1000);
  }

  // 关闭确认对话框
  function closeConfirmDialog() {
    const dialog = document.getElementById('confirmDialog');
    if (dialog) {
      dialog.classList.remove('active');
    }
  }

  // 显示关于
  function showAbout() {
    const aboutHtml = `
      <div id="aboutDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto;">
          <h3 style="margin:0 0 16px;">关于 Shadowing App</h3>
          <div style="font-size:0.95rem;line-height:1.6;color:var(--text-secondary);">
            <p><strong>版本：</strong>v20260604-3</p>
            <p><strong>更新日期：</strong>2026年6月4日</p>
            <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">
            <h4 style="margin:0 0 8px;font-size:1rem;color:var(--text);">更新日志：</h4>
            <ul style="margin:0;padding-left:20px;">
              <li>新增独立统计页面</li>
              <li>新增独立设置页面</li>
              <li>新增独立收藏页面</li>
              <li>优化学习数据可视化</li>
              <li>改进移动端用户体验</li>
            </ul>
            <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">
            <p style="margin:0;">Shadowing App 是一款专注于英语跟读练习的学习应用，帮助用户通过反复听读来提升英语口语和听力水平。</p>
          </div>
          <button onclick="closeAboutDialog()" style="width:100%;margin-top:20px;padding:12px;background:var(--primary);color:white;border:none;border-radius:10px;cursor:pointer;">
            关闭
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', aboutHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 关闭关于对话框
  function closeAboutDialog() {
    const dialog = document.getElementById('aboutDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 导出函数到全局
  window.closeAboutDialog = closeAboutDialog;

  // 显示隐私政策
  function showPrivacyPolicy() {
    const privacyHtml = `
      <div id="privacyDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto;">
          <h3 style="margin:0 0 16px;">隐私政策</h3>
          <div style="font-size:0.9rem;line-height:1.6;color:var(--text-secondary);">
            <p><strong>数据存储：</strong></p>
            <p>您的所有学习数据都存储在本地设备上，不会上传到任何服务器。</p>
            <p><strong>数据收集：</strong></p>
            <p>本应用不收集任何个人隐私信息，不进行用户行为追踪。</p>
            <p><strong>数据导出：</strong></p>
            <p>您可以随时导出自己的学习数据备份，并在其他设备上导入使用。</p>
            <p><strong>数据删除：</strong></p>
            <p>您可以随时清除所有本地存储的学习数据。</p>
            <hr style="border:none;border-top:1px solid var(--border);margin:16px 0;">
            <p style="margin:0;font-size:0.85rem;">最后更新：2026年6月4日</p>
          </div>
          <button onclick="closePrivacyDialog()" style="width:100%;margin-top:20px;padding:12px;background:var(--primary);color:white;border:none;border-radius:10px;cursor:pointer;">
            关闭
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', privacyHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 关闭隐私政策对话框
  function closePrivacyDialog() {
    const dialog = document.getElementById('privacyDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 导出函数到全局
  window.closePrivacyDialog = closePrivacyDialog;

  // 显示意见反馈
  function showFeedback() {
    const feedbackHtml = `
      <div id="feedbackDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">意见反馈</h3>
          <textarea id="feedbackText" placeholder="请告诉我们您的想法或建议..." style="width:100%;height:120px;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-secondary);color:var(--text);resize:none;font-size:1rem;outline:none;"></textarea>
          <button onclick="submitFeedback()" style="width:100%;margin-top:16px;padding:12px;background:var(--primary);color:white;border:none;border-radius:10px;cursor:pointer;">
            提交反馈
          </button>
          <button onclick="closeFeedbackDialog()" style="width:100%;margin-top:8px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', feedbackHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 提交反馈
  function submitFeedback() {
    const feedbackText = document.getElementById('feedbackText').value.trim();
    if (!feedbackText) {
      showToast('请输入反馈内容');
      return;
    }

    // 这里可以发送到服务器或保存到本地
    console.log('用户反馈:', feedbackText);

    showToast('感谢您的反馈！');
    closeFeedbackDialog();

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 关闭反馈对话框
  function closeFeedbackDialog() {
    const dialog = document.getElementById('feedbackDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 导出函数到全局
  window.closeFeedbackDialog = closeFeedbackDialog;

  // 显示提示
  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 0.9rem;
      z-index: 3000;
      animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 导出函数到全局
  window.toggleSetting = toggleSetting;
  window.showSpeedSetting = showSpeedSetting;
  window.exportData = exportData;
  window.importData = importData;
  window.showClearDataDialog = showClearDataDialog;
  window.closeConfirmDialog = closeConfirmDialog;
  window.showAbout = showAbout;
  window.showPrivacyPolicy = showPrivacyPolicy;
  window.showFeedback = showFeedback;

  // 初始化
  function init() {
    initUserInfo();
    initSettings();

    // 更新底部导航状态
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
      const navItems = bottomNav.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.href.includes('settings.html')) {
          item.classList.add('active');
        }
      });
    }

    // 监听用户名变化
    document.getElementById('userEnName').addEventListener('input', function() {
      updateAvatarName(this.value.trim());
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 添加 CSS 动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);

})();