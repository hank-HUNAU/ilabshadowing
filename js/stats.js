// 统计页面 JavaScript
(function() {
  'use strict';

  // 学习统计数据
  const LS = {
    LEARNING_STATS: 'nce_learning_stats',
    FAVORITES: 'nce_favorites',
    PROGRESS: 'nce_progress',
    USER_INFO: 'nce_user_info'
  };

  // 当前趋势周期
  let currentTrendPeriod = 'week';

  // 加载学习统计
  function loadLearningStats() {
    const stats = JSON.parse(localStorage.getItem(LS.LEARNING_STATS) || '{}');
    return {
      totalTime: stats.totalTime || 0,
      streak: stats.streak || 0,
      lastStudyDate: stats.lastStudyDate || null,
      dailyStats: stats.dailyStats || {},
      weeklyStats: stats.weeklyStats || {},
      monthlyStats: stats.monthlyStats || {}
    };
  }

  // 格式化学习时间
  function formatLearningTime(minutes) {
    if (minutes < 60) {
      return `${minutes}分钟`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}小时${mins}分钟` : `${hours}小时`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return hours > 0 ? `${days}天${hours}小时` : `${days}天`;
    }
  }

  // 更新学习总览
  function updateDashboard() {
    const stats = loadLearningStats();
    const favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');
    const progress = JSON.parse(localStorage.getItem(LS.PROGRESS) || '{}');

    // 累计学习时间
    document.getElementById('dashTotalTime').textContent = formatLearningTime(stats.totalTime);

    // 连续学习天数
    document.getElementById('dashStreak').textContent = `${stats.streak}天`;

    // 收藏句子数
    document.getElementById('dashFavorites').textContent = `${favorites.length}句`;

    // 完成课程数
    let completedCourses = 0;
    Object.values(progress).forEach(bookProgress => {
      if (bookProgress.completedUnits) {
        completedCourses += bookProgress.completedUnits.length;
      }
    });
    document.getElementById('dashCourses').textContent = `${completedCourses}课`;

    // 更新学习提醒状态
    updateReminderStatus();
  }

  // 更新学习提醒状态
  function updateReminderStatus() {
    const settings = JSON.parse(localStorage.getItem('nce_settings') || '{}');
    const reminderStatus = document.getElementById('reminderStatus');

    if (settings.studyReminder) {
      reminderStatus.style.display = 'flex';

      const freqLabels = {
        'daily': '每天',
        'weekdays': '工作日',
        'weekends': '周末',
        'weekly': '每周'
      };

      const time = settings.reminderTime || '20:00';
      const freq = freqLabels[settings.reminderFrequency] || '每天';
      document.getElementById('reminderStatusDesc').textContent = `${freq} ${time} 提醒`;
    } else {
      reminderStatus.style.display = 'none';
    }
  }

  // 跳转到设置页面
  function goToSettings() {
    window.location.href = 'settings.html';
  }

  // 渲染学习趋势图表
  function renderTrendChart(period) {
    const stats = loadLearningStats();
    let chartData = [];
    let labels = [];

    if (period === 'week') {
      // 最近7天
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDateKey(date);
        const minutes = stats.dailyStats[dateStr] || 0;
        chartData.push(minutes);
        labels.push(date.toLocaleDateString('zh-CN', { weekday: 'short' }));
      }
    } else if (period === 'month') {
      // 最近30天
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = formatDateKey(date);
        const minutes = stats.dailyStats[dateStr] || 0;
        chartData.push(minutes);
        if (i % 5 === 0) {
          labels.push(date.getDate() + '日');
        } else {
          labels.push('');
        }
      }
    } else if (period === 'year') {
      // 最近12个月
      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const minutes = stats.monthlyStats[monthKey] || 0;
        chartData.push(minutes);
        labels.push(`${date.getMonth() + 1}月`);
      }
    }

    const maxValue = Math.max(...chartData, 1);
    const chartHtml = chartData.map((value, index) => {
      const height = (value / maxValue) * 100;
      return `
        <div class="trend-bar" style="height: ${height}%" data-value="${value}分钟">
          <span class="trend-label">${labels[index]}</span>
        </div>
      `;
    }).join('');

    document.getElementById('trendChart').innerHTML = chartHtml;
  }

  // 渲染课程进度列表
  function renderCourseProgress() {
    const progress = JSON.parse(localStorage.getItem(LS.PROGRESS) || '{}');
    const progressList = document.getElementById('courseProgressList');

    if (Object.keys(progress).length === 0) {
      progressList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: var(--text-tertiary);">
          <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 16px;">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <p>还没有学习记录</p>
          <button onclick="window.location.href='index.html'" style="margin-top: 16px; padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
            开始学习
          </button>
        </div>
      `;
      return;
    }

    const bookNames = {
      'NCE1': '新概念英语第一册',
      'THINK_0': 'Think Level 0',
      'THINK_F': 'Think Foundation'
    };

    let html = '';
    for (const [bookKey, bookProgress] of Object.entries(progress)) {
      const totalUnits = bookProgress.totalUnits || 0;
      const completedUnits = bookProgress.completedUnits?.length || 0;
      const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

      html += `
        <div class="progress-item" onclick="continueBook('${bookKey}')">
          <div class="progress-icon">${completedUnits}</div>
          <div class="progress-info">
            <div class="progress-name">${bookNames[bookKey] || bookKey}</div>
            <div class="progress-meta">
              <span>已完成 ${completedUnits}/${totalUnits} 课</span>
              <span>进度 ${progressPercent}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
            </div>
          </div>
          <div class="progress-percent">${progressPercent}%</div>
        </div>
      `;
    }

    progressList.innerHTML = html;
  }

  // 渲染学习日历
  function renderCalendarHeatmap() {
    const stats = loadLearningStats();
    const heatmap = document.getElementById('calendarHeatmap');

    // 最近30天
    let html = '';
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = formatDateKey(date);
      const minutes = stats.dailyStats[dateStr] || 0;

      // 计算活跃度级别
      let level = 0;
      if (minutes > 0) level = 1;
      if (minutes > 15) level = 2;
      if (minutes > 30) level = 3;
      if (minutes > 60) level = 4;

      const dayOfMonth = date.getDate();
      const dayOfWeek = date.getDay();

      html += `
        <div class="calendar-day level-${level}" title="${date.toLocaleDateString('zh-CN')} - ${minutes}分钟">
          <span>${dayOfMonth}</span>
          <span class="calendar-label">周${['日', '一', '二', '三', '四', '五', '六'][dayOfWeek]}</span>
        </div>
      `;
    }

    heatmap.innerHTML = html;
  }

  // 格式化日期键
  function formatDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  // 切换趋势标签
  function switchTrendTab(period) {
    currentTrendPeriod = period;

    // 更新标签样式
    document.querySelectorAll('.trend-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    event.target.classList.add('active');

    // 重新渲染图表
    renderTrendChart(period);
  }

  // 继续学习课程
  function continueBook(bookKey) {
    // 保存当前选择到 localStorage
    localStorage.setItem('currentBook', bookKey);
    window.location.href = 'index.html';
  }

  // 显示详情
  function showDetail(type) {
    console.log('Show detail:', type);
    // 可以实现弹出详情对话框或跳转到详情页面
  }

  // 刷新统计
  function refreshStats() {
    updateDashboard();
    renderTrendChart(currentTrendPeriod);
    renderCourseProgress();
    renderCalendarHeatmap();

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    // 显示提示
    showToast('统计已刷新');
  }

  // 分享统计
  function showShareStats() {
    const stats = loadLearningStats();
    const favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');

    const shareText = `📊 我的学习统计\n⏱️ 累计学习：${formatLearningTime(stats.totalTime)}\n🔥 连续学习：${stats.streak}天\n⭐ 收藏句子：${favorites.length}句\n\n一起来学习吧！`;

    if (navigator.share) {
      navigator.share({
        title: '我的学习统计',
        text: shareText
      }).catch(err => {
        console.log('分享失败:', err);
      });
    } else {
      // 复制到剪贴板
      navigator.clipboard.writeText(shareText).then(() => {
        showToast('统计已复制到剪贴板');
      }).catch(() => {
        showToast('分享失败，请手动复制');
      });
    }
  }

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
      z-index: 2000;
      animation: fadeIn 0.3s ease;
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }

  // 初始化
  function init() {
    updateDashboard();
    renderTrendChart('week');
    renderCourseProgress();
    renderCalendarHeatmap();

    // 更新底部导航状态
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
      const navItems = bottomNav.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.href.includes('stats.html')) {
          item.classList.add('active');
        }
      });
    }
  }

  // 导出函数到全局
  window.switchTrendTab = switchTrendTab;
  window.continueBook = continueBook;
  window.showDetail = showDetail;
  window.refreshStats = refreshStats;
  window.showShareStats = showShareStats;
  window.goToSettings = goToSettings;

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