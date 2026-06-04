// 收藏页面 JavaScript
(function() {
  'use strict';

  // LocalStorage 键
  const LS = {
    FAVORITES: 'nce_favorites',
    PROGRESS: 'nce_progress',
    USER_INFO: 'nce_user_info'
  };

  // 当前排序方式
  let currentSort = 'date'; // date, lesson, sentence

  // 加载收藏列表
  function loadFavorites() {
    return JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');
  }

  // 保存收藏列表
  function saveFavorites(favorites) {
    localStorage.setItem(LS.FAVORITES, JSON.stringify(favorites));
  }

  // 渲染收藏列表
  function renderFavorites(filter = '') {
    const favorites = loadFavorites();
    const favoriteList = document.getElementById('favoriteList');
    const emptyState = document.getElementById('emptyState');

    // 过滤收藏
    let filteredFavorites = favorites;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filteredFavorites = favorites.filter(fav =>
        fav.sentence.toLowerCase().includes(lowerFilter) ||
        fav.lessonTitle.toLowerCase().includes(lowerFilter)
      );
    }

    // 排序收藏
    if (currentSort === 'date') {
      filteredFavorites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (currentSort === 'lesson') {
      filteredFavorites.sort((a, b) => a.lessonTitle.localeCompare(b.lessonTitle));
    } else if (currentSort === 'sentence') {
      filteredFavorites.sort((a, b) => a.sentence.localeCompare(b.sentence));
    }

    // 更新统计信息
    updateStats(favorites, filteredFavorites);

    if (filteredFavorites.length === 0) {
      favoriteList.style.display = 'none';
      emptyState.style.display = 'block';
      return;
    }

    favoriteList.style.display = 'grid';
    emptyState.style.display = 'none';

    // 获取涉及的课程
    const lessons = [...new Set(filteredFavorites.map(fav => fav.lessonTitle))];
    const totalLessons = lessons.length;

    // 计算今日新增
    const today = new Date().toDateString();
    const todayCount = favorites.filter(fav =>
      new Date(fav.timestamp).toDateString() === today
    ).length;

    document.getElementById('favoriteCount').textContent = favorites.length;
    document.getElementById('favoriteLessons').textContent = totalLessons;
    document.getElementById('favoriteToday').textContent = todayCount;

    // 渲染收藏卡片
    favoriteList.innerHTML = filteredFavorites.map((fav, index) => {
      const date = new Date(fav.timestamp);
      const dateStr = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="favorite-card" data-fav-idx="${favorites.indexOf(fav)}">
          <div class="favorite-lesson">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            ${fav.lessonTitle}
          </div>
          <div class="favorite-sentence">${fav.sentence}</div>
          <div class="favorite-footer">
            <div class="favorite-date">${dateStr}</div>
            <div class="favorite-actions">
              <button class="favorite-action-btn play" onclick="playFavorite(${favorites.indexOf(fav)})" aria-label="播放">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </button>
              <button class="favorite-action-btn delete" onclick="deleteFavorite(${favorites.indexOf(fav)})" aria-label="删除">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 更新统计信息
  function updateStats(allFavorites, filteredFavorites) {
    document.getElementById('favoriteCount').textContent = allFavorites.length;

    const lessons = [...new Set(allFavorites.map(fav => fav.lessonTitle))];
    document.getElementById('favoriteLessons').textContent = lessons.length;

    const today = new Date().toDateString();
    const todayCount = allFavorites.filter(fav =>
      new Date(fav.timestamp).toDateString() === today
    ).length;
    document.getElementById('favoriteToday').textContent = todayCount;
  }

  // 过滤收藏
  function filterFavorites() {
    const searchInput = document.getElementById('searchInput');
    const filter = searchInput.value.trim();
    renderFavorites(filter);
  }

  // 排序收藏
  function sortFavorites() {
    const sortOptions = ['date', 'lesson', 'sentence'];
    const currentIndex = sortOptions.indexOf(currentSort);
    currentSort = sortOptions[(currentIndex + 1) % sortOptions.length];

    const sortNames = {
      'date': '按日期',
      'lesson': '按课程',
      'sentence': '按句子'
    };

    showToast(`已切换为${sortNames[currentSort]}排序`);
    renderFavorites(document.getElementById('searchInput').value.trim());

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 播放收藏
  function playFavorite(index) {
    const favorites = loadFavorites();
    const fav = favorites[index];

    if (!fav) return;

    // 保存当前要播放的收藏到 localStorage
    localStorage.setItem('currentFavorite', JSON.stringify(fav));

    // 跳转到主页面并播放
    window.location.href = `index.html?playFavorite=${index}`;

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // 删除收藏
  function deleteFavorite(index) {
    const favorites = loadFavorites();
    favorites.splice(index, 1);
    saveFavorites(favorites);

    // 重新渲染
    renderFavorites(document.getElementById('searchInput').value.trim());

    showToast('收藏已删除');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
  }

  // 导出收藏
  function exportFavorites() {
    const favorites = loadFavorites();

    if (favorites.length === 0) {
      showToast('暂无收藏可导出');
      return;
    }

    // 格式化为易读文本
    let exportText = '=== 我的英语收藏 ===\n\n';
    exportText += `导出时间：${new Date().toLocaleString('zh-CN')}\n`;
    exportText += `总计：${favorites.length}句\n\n`;

    // 按课程分组
    const groupedFavorites = {};
    favorites.forEach(fav => {
      if (!groupedFavorites[fav.lessonTitle]) {
        groupedFavorites[fav.lessonTitle] = [];
      }
      groupedFavorites[fav.lessonTitle].push(fav);
    });

    Object.keys(groupedFavorites).sort().forEach(lessonTitle => {
      exportText += `--- ${lessonTitle} ---\n`;
      groupedFavorites[lessonTitle].forEach((fav, idx) => {
        exportText += `${idx + 1}. ${fav.sentence}\n`;
      });
      exportText += '\n';
    });

    // 创建文件并下载
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `favorites-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('收藏已导出');

    // 触觉反馈
    if (navigator.vibrate) {
      navigator.vibrate(30);
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

  // 导出函数到全局
  window.filterFavorites = filterFavorites;
  window.sortFavorites = sortFavorites;
  window.playFavorite = playFavorite;
  window.deleteFavorite = deleteFavorite;
  window.exportFavorites = exportFavorites;

  // 初始化
  function init() {
    renderFavorites();

    // 更新底部导航状态
    const bottomNav = document.getElementById('bottomNav');
    if (bottomNav) {
      const navItems = bottomNav.querySelectorAll('.nav-item');
      navItems.forEach(item => {
        item.classList.remove('active');
        if (item.href.includes('favorite.html')) {
          item.classList.add('active');
        }
      });
    }

    // 检查是否有播放收藏的请求
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('playFavorite')) {
      // 移除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);

      // 显示提示
      showToast('请先返回学习页面播放');
    }
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