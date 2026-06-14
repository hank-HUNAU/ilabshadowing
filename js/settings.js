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
    playbackSpeed: 1.0,
    studyReminder: false,
    reminderTime: '20:00',
    reminderFrequency: 'daily',
    fontSize: 'medium',
    colorTheme: 'blue',
    showProgress: true
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

    // 特殊处理学习提醒
    if (settingKey === 'studyReminder') {
      if (settings[settingKey]) {
        // 启用提醒
        testReminder(); // 先测试权限
        scheduleReminder();
        showToast('学习提醒已开启');
      } else {
        // 禁用提醒
        if (window.reminderTimeout) {
          clearTimeout(window.reminderTimeout);
        }
        showToast('学习提醒已关闭');
      }
    } else {
      showToast(settings[settingKey] ? '已开启' : '已关闭');
    }

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
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

    // 应用字体大小
    if (settings.fontSize) {
      applyFontSize(settings.fontSize);
      const sizeLabels = {
        'small': '小',
        'medium': '中等',
        'large': '大',
        'xlarge': '特大'
      };
      const fontSizeDesc = document.getElementById('fontSizeDesc');
      if (fontSizeDesc) {
        fontSizeDesc.textContent = `当前：${sizeLabels[settings.fontSize]}`;
      }
    }

    // 应用颜色主题
    if (settings.colorTheme) {
      applyColorTheme(settings.colorTheme);
      const themeLabels = {
        'blue': '蓝色',
        'green': '绿色',
        'orange': '橙色',
        'purple': '紫色',
        'pink': '粉色'
      };
      const colorThemeDesc = document.getElementById('colorThemeDesc');
      if (colorThemeDesc) {
        colorThemeDesc.textContent = `当前：${themeLabels[settings.colorTheme]}`;
      }
    }

    // 更新提醒设置显示
    if (settings.reminderTime) {
      const reminderTimeDesc = document.getElementById('reminderTimeDesc');
      if (reminderTimeDesc) {
        reminderTimeDesc.textContent = `当前：每天 ${settings.reminderTime}`;
      }
    }

    if (settings.reminderFrequency) {
      const freqLabels = {
        'daily': '每天',
        'weekdays': '工作日',
        'weekends': '周末',
        'weekly': '每周'
      };
      const reminderFreqDesc = document.getElementById('reminderFreqDesc');
      if (reminderFreqDesc) {
        reminderFreqDesc.textContent = `当前：${freqLabels[settings.reminderFrequency]}`;
      }
    }

    // 如果启用了学习提醒，启动提醒调度
    if (settings.studyReminder) {
      scheduleReminder();
    }

    // 请求通知权限
    if ('Notification' in window && Notification.permission === 'default') {
      // 不要自动请求，让用户主动触发
    }
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
    // 重定向到新的导出选项对话框
    showExportOptions();
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
            <p><strong>版本：</strong>v20260604-4</p>
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

  // ========== 学习提醒功能 ==========

  // 显示提醒时间设置
  function showReminderTime() {
    const settings = loadSettings();
    const currentTime = settings.reminderTime || '20:00';

    const timeHtml = `
      <div id="reminderTimeDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">设置提醒时间</h3>
          <input type="time" id="reminderTimeInput" value="${currentTime}" style="width:100%;padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--bg-secondary);color:var(--text);font-size:1.5rem;text-align:center;outline:none;margin-bottom:16px;">
          <button onclick="saveReminderTime()" style="width:100%;padding:12px;background:var(--primary);color:white;border:none;border-radius:10px;cursor:pointer;">
            保存时间
          </button>
          <button onclick="closeReminderTimeDialog()" style="width:100%;margin-top:8px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', timeHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 保存提醒时间
  function saveReminderTime() {
    const timeInput = document.getElementById('reminderTimeInput').value;
    if (!timeInput) {
      showToast('请选择时间');
      return;
    }

    const settings = loadSettings();
    settings.reminderTime = timeInput;
    saveSettings(settings);

    document.getElementById('reminderTimeDesc').textContent = `当前：每天 ${timeInput}`;
    closeReminderTimeDialog();
    scheduleReminder();

    showToast(`提醒时间已设置为 ${timeInput}`);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 关闭提醒时间对话框
  function closeReminderTimeDialog() {
    const dialog = document.getElementById('reminderTimeDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 显示提醒频率设置
  function showReminderFrequency() {
    const settings = loadSettings();
    const currentFreq = settings.reminderFrequency || 'daily';

    const frequencies = [
      { value: 'daily', label: '每天' },
      { value: 'weekdays', label: '工作日' },
      { value: 'weekends', label: '周末' },
      { value: 'weekly', label: '每周' }
    ];

    const freqHtml = `
      <div id="reminderFreqDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">设置提醒频率</h3>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${frequencies.map(freq => `
              <button onclick="selectReminderFrequency('${freq.value}')" style="padding:12px;border:none;background:${freq.value === currentFreq ? 'var(--primary)' : 'var(--bg-secondary)'};color:${freq.value === currentFreq ? 'white' : 'var(--text)'};border-radius:10px;cursor:pointer;text-align:left;">
                ${freq.label}
              </button>
            `).join('')}
          </div>
          <button onclick="closeReminderFreqDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', freqHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 选择提醒频率
  function selectReminderFrequency(frequency) {
    const settings = loadSettings();
    settings.reminderFrequency = frequency;
    saveSettings(settings);

    const freqLabels = {
      'daily': '每天',
      'weekdays': '工作日',
      'weekends': '周末',
      'weekly': '每周'
    };

    document.getElementById('reminderFreqDesc').textContent = `当前：${freqLabels[frequency]}`;
    closeReminderFreqDialog();
    scheduleReminder();

    showToast(`提醒频率已设置为${freqLabels[frequency]}`);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 关闭提醒频率对话框
  function closeReminderFreqDialog() {
    const dialog = document.getElementById('reminderFreqDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 测试提醒
  function testReminder() {
    if (!('Notification' in window)) {
      showToast('浏览器不支持通知');
      return;
    }

    if (Notification.permission === 'granted') {
      showNotification('测试提醒', '这是学习提醒测试通知');
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification('测试提醒', '这是学习提醒测试通知');
        } else {
          showToast('通知权限被拒绝');
        }
      });
    } else {
      showToast('请启用浏览器通知权限');
    }

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 显示通知
  function showNotification(title, body) {
    const options = {
      body: body,
      icon: '/icons/icon-192.webp',
      badge: '/icons/icon-96.webp',
      tag: 'study-reminder',
      requireInteraction: false
    };

    try {
      const notification = new Notification(title, options);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.error('通知发送失败:', e);
    }
  }

  // 调度提醒
  function scheduleReminder() {
    const settings = loadSettings();
    if (!settings.studyReminder) {
      return;
    }

    // 清除之前的提醒
    if (window.reminderTimeout) {
      clearTimeout(window.reminderTimeout);
    }

    const [hours, minutes] = settings.reminderTime.split(':').map(Number);
    const now = new Date();
    const reminderTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);

    // 如果今天的提醒时间已过，设置明天的提醒
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    const delay = reminderTime - now;

    window.reminderTimeout = setTimeout(() => {
      if (shouldSendReminder()) {
        showNotification('学习提醒', '该开始学习了！保持学习习惯，每天进步一点！');
      }
      scheduleReminder(); // 调度下一次提醒
    }, delay);
  }

  // 判断是否应该发送提醒
  function shouldSendReminder() {
    const settings = loadSettings();
    const now = new Date();
    const day = now.getDay(); // 0 = 周日, 6 = 周六

    switch (settings.reminderFrequency) {
      case 'daily':
        return true;
      case 'weekdays':
        return day >= 1 && day <= 5;
      case 'weekends':
        return day === 0 || day === 6;
      case 'weekly':
        return day === 1; // 周一
      default:
        return true;
    }
  }

  // ========== 界面设置功能 ==========

  // 显示字体大小设置
  function showFontSizeSetting() {
    const settings = loadSettings();
    const currentSize = settings.fontSize || 'medium';

    const sizes = [
      { value: 'small', label: '小', size: '0.9rem' },
      { value: 'medium', label: '中等', size: '1rem' },
      { value: 'large', label: '大', size: '1.1rem' },
      { value: 'xlarge', label: '特大', size: '1.2rem' }
    ];

    const sizeHtml = `
      <div id="fontSizeDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">字体大小</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${sizes.map(size => `
              <button onclick="selectFontSize('${size.value}')" style="padding:16px;border:none;background:${size.value === currentSize ? 'var(--primary)' : 'var(--bg-secondary)'};color:${size.value === currentSize ? 'white' : 'var(--text)'};border-radius:10px;cursor:pointer;text-align:left;font-size:${size.size};">
                ${size.label}
                <div style="font-size:0.8rem;opacity:0.7;margin-top:4px;">示例文本</div>
              </button>
            `).join('')}
          </div>
          <button onclick="closeFontSizeDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', sizeHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 选择字体大小
  function selectFontSize(size) {
    const settings = loadSettings();
    settings.fontSize = size;
    saveSettings(settings);

    const sizeLabels = {
      'small': '小',
      'medium': '中等',
      'large': '大',
      'xlarge': '特大'
    };

    document.getElementById('fontSizeDesc').textContent = `当前：${sizeLabels[size]}`;
    closeFontSizeDialog();
    applyFontSize(size);

    showToast(`字体大小已设置为${sizeLabels[size]}`);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 应用字体大小
  function applyFontSize(size) {
    const sizeMap = {
      'small': '0.9rem',
      'medium': '1rem',
      'large': '1.1rem',
      'xlarge': '1.2rem'
    };

    document.documentElement.style.setProperty('--base-font-size', sizeMap[size]);
  }

  // 关闭字体大小对话框
  function closeFontSizeDialog() {
    const dialog = document.getElementById('fontSizeDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 显示颜色主题设置
  function showColorTheme() {
    const settings = loadSettings();
    const currentTheme = settings.colorTheme || 'blue';

    const themes = [
      { value: 'blue', label: '蓝色', color: '#007aff' },
      { value: 'green', label: '绿色', color: '#34c759' },
      { value: 'orange', label: '橙色', color: '#ff9500' },
      { value: 'purple', label: '紫色', color: '#af52de' },
      { value: 'pink', label: '粉色', color: '#ff2d55' }
    ];

    const themeHtml = `
      <div id="colorThemeDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">颜色主题</h3>
          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
            ${themes.map(theme => `
              <button onclick="selectColorTheme('${theme.value}')" style="padding:16px;border:none;background:${theme.value === currentTheme ? 'var(--primary)' : 'var(--bg-secondary)'};color:${theme.value === currentTheme ? 'white' : 'var(--text)'};border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:8px;">
                <div style="width:24px;height:24px;border-radius:50%;background:${theme.color};"></div>
                ${theme.label}
              </button>
            `).join('')}
          </div>
          <button onclick="closeColorThemeDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', themeHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 选择颜色主题
  function selectColorTheme(theme) {
    const settings = loadSettings();
    settings.colorTheme = theme;
    saveSettings(settings);

    const themeLabels = {
      'blue': '蓝色',
      'green': '绿色',
      'orange': '橙色',
      'purple': '紫色',
      'pink': '粉色'
    };

    document.getElementById('colorThemeDesc').textContent = `当前：${themeLabels[theme]}`;
    closeColorThemeDialog();
    applyColorTheme(theme);

    showToast(`颜色主题已设置为${themeLabels[theme]}`);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 应用颜色主题
  function applyColorTheme(theme) {
    const colorMap = {
      'blue': '#007aff',
      'green': '#34c759',
      'orange': '#ff9500',
      'purple': '#af52de',
      'pink': '#ff2d55'
    };

    document.documentElement.style.setProperty('--primary', colorMap[theme]);
  }

  // 关闭颜色主题对话框
  function closeColorThemeDialog() {
    const dialog = document.getElementById('colorThemeDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // ========== 数据管理优化功能 ==========

  // 显示导出选项
  function showExportOptions() {
    const exportHtml = `
      <div id="exportOptionsDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;">
          <h3 style="margin:0 0 16px;">导出格式</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <button onclick="exportDataJSON()" style="padding:16px;border:none;background:var(--primary);color:white;border-radius:10px;cursor:pointer;text-align:left;">
              <strong>JSON 格式</strong>
              <div style="font-size:0.85rem;opacity:0.9;margin-top:4px;">完整数据备份，可导入恢复</div>
            </button>
            <button onclick="exportDataCSV()" style="padding:16px;border:none;background:var(--bg-secondary);color:var(--text);border-radius:10px;cursor:pointer;text-align:left;">
              <strong>CSV 格式</strong>
              <div style="font-size:0.85rem;opacity:0.7;margin-top:4px;">表格格式，可用Excel打开</div>
            </button>
            <button onclick="exportDataTXT()" style="padding:16px;border:none;background:var(--bg-secondary);color:var(--text);border-radius:10px;cursor:pointer;text-align:left;">
              <strong>TXT 格式</strong>
              <div style="font-size:0.85rem;opacity:0.7;margin-top:4px;">纯文本格式，易于分享</div>
            </button>
          </div>
          <button onclick="closeExportOptionsDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            取消
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', exportHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 导出为JSON格式
  function exportDataJSON() {
    const data = getAllData();

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadFile(blob, `shadowing-backup-${new Date().toISOString().split('T')[0]}.json`);

    // 保存数据历史
    saveDataHistory('JSON格式完整备份');

    closeExportOptionsDialog();
    showToast('数据已导出为JSON格式');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 导出为CSV格式
  function exportDataCSV() {
    const favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');

    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF'; // BOM for Excel
    csvContent += '日期,课程标题,句子\n';

    favorites.forEach(fav => {
      const date = new Date(fav.timestamp).toLocaleDateString('zh-CN');
      const lessonTitle = fav.lessonTitle.replace(/,/g, '，');
      const sentence = fav.sentence.replace(/,/g, '，');
      csvContent += `${date},${lessonTitle},${sentence}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, `favorites-${new Date().toISOString().split('T')[0]}.csv`);

    // 保存数据历史
    saveDataHistory('CSV格式收藏数据');

    closeExportOptionsDialog();
    showToast('数据已导出为CSV格式');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 导出为TXT格式
  function exportDataTXT() {
    const favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');

    let txtContent = '=== 我的英语收藏 ===\n\n';
    txtContent += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    txtContent += `总计：${favorites.length}句\n\n`;

    favorites.forEach((fav, index) => {
      const date = new Date(fav.timestamp).toLocaleString('zh-CN');
      txtContent += `${index + 1}. ${fav.sentence}\n`;
      txtContent += `   课程：${fav.lessonTitle}\n`;
      txtContent += `   时间：${date}\n\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
    downloadFile(blob, `favorites-${new Date().toISOString().split('T')[0]}.txt`);

    // 保存数据历史
    saveDataHistory('TXT格式收藏文本');

    closeExportOptionsDialog();
    showToast('数据已导出为TXT格式');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 获取所有数据
  function getAllData() {
    return {
      userInfo: loadUserInfo(),
      settings: loadSettings(),
      favorites: JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]'),
      progress: JSON.parse(localStorage.getItem(LS.PROGRESS) || '{}'),
      learningStats: JSON.parse(localStorage.getItem(LS.LEARNING_STATS) || '{}'),
      exportDate: new Date().toISOString()
    };
  }

  // 下载文件
  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // 关闭导出选项对话框
  function closeExportOptionsDialog() {
    const dialog = document.getElementById('exportOptionsDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 显示数据历史
  function showDataHistory() {
    const dataHistory = getDataHistory();

    if (dataHistory.length === 0) {
      showToast('暂无数据历史记录');
      return;
    }

    const historyHtml = `
      <div id="dataHistoryDialog" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:2000;">
        <div style="background:var(--card-solid);border-radius:20px;padding:24px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto;">
          <h3 style="margin:0 0 16px;">数据历史</h3>
          <div style="display:flex;flex-direction:column;gap:12px;">
            ${dataHistory.map((item, index) => `
              <div style="padding:12px;background:var(--bg-secondary);border-radius:10px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                  <div style="font-weight:600;color:var(--text);">${item.date}</div>
                  <div style="font-size:0.85rem;color:var(--text-tertiary);">${item.description}</div>
                </div>
                <button onclick="restoreDataHistory(${index})" style="padding:8px 12px;background:var(--primary);color:white;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;">
                  恢复
                </button>
              </div>
            `).join('')}
          </div>
          <button onclick="closeDataHistoryDialog()" style="width:100%;margin-top:16px;padding:12px;background:var(--bg-secondary);border:none;border-radius:10px;cursor:pointer;">
            关闭
          </button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', historyHtml);

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 获取数据历史
  function getDataHistory() {
    const history = JSON.parse(localStorage.getItem('dataHistory') || '[]');
    return history.slice(0, 10); // 最多显示10条
  }

  // 恢复数据历史
  function restoreDataHistory(index) {
    const history = JSON.parse(localStorage.getItem('dataHistory') || '[]');
    const item = history[index];

    if (!item || !item.data) {
      showToast('数据已失效');
      return;
    }

    // 恢复数据
    localStorage.setItem(LS.USER_INFO, JSON.stringify(item.data.userInfo));
    localStorage.setItem(LS.SETTINGS, JSON.stringify(item.data.settings));
    localStorage.setItem(LS.FAVORITES, JSON.stringify(item.data.favorites));
    localStorage.setItem(LS.PROGRESS, JSON.stringify(item.data.progress));
    localStorage.setItem(LS.LEARNING_STATS, JSON.stringify(item.data.learningStats));

    closeDataHistoryDialog();
    showToast('数据已恢复，页面将刷新');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    setTimeout(() => {
      location.reload();
    }, 1500);
  }

  // 关闭数据历史对话框
  function closeDataHistoryDialog() {
    const dialog = document.getElementById('dataHistoryDialog');
    if (dialog) {
      dialog.remove();
    }
  }

  // 保存数据历史（在导出时调用）
  function saveDataHistory(description) {
    const history = JSON.parse(localStorage.getItem('dataHistory') || '[]');
    const newData = {
      date: new Date().toLocaleString('zh-CN'),
      description: description,
      data: getAllData(),
      timestamp: Date.now()
    };

    history.unshift(newData);
    // 最多保存10条历史记录
    if (history.length > 10) {
      history.pop();
    }

    localStorage.setItem('dataHistory', JSON.stringify(history));
  }

  // 导出函数到全局
  window.showReminderTime = showReminderTime;
  window.saveReminderTime = saveReminderTime;
  window.closeReminderTimeDialog = closeReminderTimeDialog;
  window.showReminderFrequency = showReminderFrequency;
  window.selectReminderFrequency = selectReminderFrequency;
  window.closeReminderFreqDialog = closeReminderFreqDialog;
  window.testReminder = testReminder;
  window.showFontSizeSetting = showFontSizeSetting;
  window.selectFontSize = selectFontSize;
  window.closeFontSizeDialog = closeFontSizeDialog;
  window.showColorTheme = showColorTheme;
  window.selectColorTheme = selectColorTheme;
  window.closeColorThemeDialog = closeColorThemeDialog;
  window.showExportOptions = showExportOptions;
  window.exportDataJSON = exportDataJSON;
  window.exportDataCSV = exportDataCSV;
  window.exportDataTXT = exportDataTXT;
  window.closeExportOptionsDialog = closeExportOptionsDialog;
  window.showDataHistory = showDataHistory;
  window.restoreDataHistory = restoreDataHistory;
  window.closeDataHistoryDialog = closeDataHistoryDialog;

  // 原有导出函数
  window.exportData = showExportOptions;

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