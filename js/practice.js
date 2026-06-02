/**
 * 学习中心 UI 控制模块
 * 版本：20260602-10
 * 功能：Tab 切换、课程选择、无滚动扁平化 UI
 */

// 全局状态
window.currentCourse = null;
window.allCourses = [];
window.currentPage = 1;
window.totalPages = 1;

/**
 * Tab 切换
 */
window.switchTab = function(tabName) {
  // 更新 Tab 按钮状态
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.toggle('active', item.dataset.tab === tabName);
  });
  
  // 更新 Tab 面板显示
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-${tabName}`);
  });
  
  // 控制底部翻页器显示
  const pager = document.getElementById('bottomPager');
  if (tabName === 'practice') {
    // 专项练习需要翻页
    totalPages = 2;
    currentPage = 1;
    pager.style.display = 'flex';
    updatePagerDisplay();
  } else {
    pager.style.display = 'none';
  }
  
  // 切换到课程详情 Tab 时渲染单元列表
  if (tabName === 'course') {
    renderUnitGrid();
  }
  
  // 保存到 localStorage
  localStorage.setItem('practice_active_tab', tabName);
};

/**
 * 底部翻页器
 */
window.prevPage = function() {
  if (currentPage > 1) {
    currentPage--;
    updatePagerDisplay();
  }
};

window.nextPage = function() {
  if (currentPage < totalPages) {
    currentPage++;
    updatePagerDisplay();
  }
};

function updatePagerDisplay() {
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages;
}

/**
 * 课程选择弹窗
 */
window.openCourseSelectDialog = async function() {
  const dialog = document.getElementById('courseSelectDialog');
  const grid = document.getElementById('courseGrid');
  
  // 加载课程数据
  await CourseManager.ensureInit();
  const books = CourseManager.getAllBooks();
  
  // 生成课程网格
  grid.innerHTML = books.map(book => {
    const units = CourseManager.getUnitsByBook(book.key);
    const unitsHtml = units.map((unit, idx) => {
      const progress = CourseManager.getUnitProgress(book.key, unit.key);
      const isActive = window.currentCourse && 
                       window.currentCourse.bookKey === book.key && 
                       window.currentCourse.unitKey === unit.key;
      
      return `
        <div class="course-item ${isActive ? 'active' : ''}" 
             onclick="selectCourse('${book.key}', '${unit.key}', '${book.title}', '${unit.title}')">
          <h4>${book.title} · ${unit.title}</h4>
          <p>${unit.description || ''}</p>
          <div class="course-item-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress.progress}%"></div>
            </div>
            <span>${progress.learnedCount}/${progress.totalSentences}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return unitsHtml;
  }).join('');
  
  dialog.style.display = 'flex';
};

window.closeCourseSelectDialog = function() {
  document.getElementById('courseSelectDialog').style.display = 'none';
};

window.selectCourse = function(bookKey, unitKey, bookTitle, unitTitle) {
  // 更新当前课程
  window.currentCourse = {
    bookKey,
    unitKey,
    title: `${bookTitle} · ${unitTitle}`
  };
  
  // 保存到 localStorage
  localStorage.setItem('current_course', JSON.stringify(window.currentCourse));
  
  // 更新 URL 参数
  const url = new URL(window.location);
  url.searchParams.set('book', bookKey);
  url.searchParams.set('unit', unitKey);
  window.history.pushState({}, '', url);
  
  // 更新 UI
  updateCurrentCourseUI();
  renderUnitGrid(); // 更新课程详情 Tab
  
  // 关闭弹窗
  closeCourseSelectDialog();
  
  // 提示
  showToast('已切换到' + window.currentCourse.title, 'success');
};

/**
 * 课程导航（上一课程/下一课程）
 */
window.navigateCourse = async function(direction) {
  if (!window.currentCourse) {
    // 打开课程选择
    openCourseSelectDialog();
    return;
  }
  
  await CourseManager.ensureInit();
  const books = CourseManager.getAllBooks();
  
  // 展平所有课程
  const allCourses = [];
  books.forEach(book => {
    const units = CourseManager.getUnitsByBook(book.key);
    units.forEach(unit => {
      allCourses.push({
        bookKey: book.key,
        unitKey: unit.key,
        bookTitle: book.title,
        unitTitle: unit.title
      });
    });
  });
  
  // 找到当前索引
  const currentIndex = allCourses.findIndex(c => 
    c.bookKey === window.currentCourse.bookKey && 
    c.unitKey === window.currentCourse.unitKey
  );
  
  if (currentIndex === -1) {
    openCourseSelectDialog();
    return;
  }
  
  // 计算新索引
  const newIndex = currentIndex + direction;
  if (newIndex < 0 || newIndex >= allCourses.length) {
    showToast('已是第一个/最后一个课程', 'info');
    return;
  }
  
  // 切换课程
  const newCourse = allCourses[newIndex];
  selectCourse(newCourse.bookKey, newCourse.unitKey, newCourse.bookTitle, newCourse.unitTitle);
};

/**
 * 更新当前课程 UI
 */
function updateCurrentCourseUI() {
  if (!window.currentCourse) {
    document.getElementById('currentCourseTitle').textContent = '选择课程开始学习';
    document.getElementById('courseProgressBarContainer').style.display = 'none';
    document.getElementById('courseStatsContainer').style.display = 'none';
    return;
  }
  
  document.getElementById('currentCourseTitle').textContent = window.currentCourse.title;
  
  const progress = CourseManager.getUnitProgress(
    window.currentCourse.bookKey, 
    window.currentCourse.unitKey
  );
  
  document.getElementById('courseProgressBarContainer').style.display = 'block';
  document.getElementById('currentCourseProgressFill').style.width = progress.progress + '%';
  document.getElementById('courseStatsContainer').style.display = 'block';
  document.getElementById('currentCourseLearned').textContent = progress.learnedCount;
  document.getElementById('currentCourseTotal').textContent = progress.totalSentences;
  
  // 更新课程索引显示
  const allCourses = getAllCoursesFlat();
  const currentIndex = allCourses.findIndex(c => 
    c.bookKey === window.currentCourse.bookKey && 
    c.unitKey === window.currentCourse.unitKey
  );
  
  if (currentIndex !== -1) {
    document.getElementById('currentCourseIndex').textContent = currentIndex + 1;
    document.getElementById('totalCourses').textContent = allCourses.length;
  }
}

function getAllCoursesFlat() {
  const books = CourseManager.getAllBooks();
  const allCourses = [];
  books.forEach(book => {
    const units = CourseManager.getUnitsByBook(book.key);
    units.forEach(unit => {
      allCourses.push({
        bookKey: book.key,
        unitKey: unit.key,
        bookTitle: book.title,
        unitTitle: unit.title
      });
    });
  });
  return allCourses;
}

/**
 * 渲染课程详情 Tab 的单元网格
 */
function renderUnitGrid() {
  const unitGrid = document.getElementById('unitGrid');
  
  if (!window.currentCourse) {
    unitGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-secondary);">请先选择课程</div>';
    return;
  }
  
  const units = CourseManager.getUnitsByBook(window.currentCourse.bookKey);
  
  unitGrid.innerHTML = units.map(unit => {
    const progress = CourseManager.getUnitProgress(window.currentCourse.bookKey, unit.key);
    const isActive = unit.key === window.currentCourse.unitKey;
    
    return `
      <div class="unit-card ${isActive ? 'active' : ''}" 
           onclick="selectCourse('${window.currentCourse.bookKey}', '${unit.key}', '${window.currentCourse.title.split(' · ')[0]}', '${unit.title}')">
        <svg class="unit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
        </svg>
        <div class="unit-title">${unit.title}</div>
        <div class="unit-progress">${progress.learnedCount}/${progress.totalSentences} · ${progress.progress}%</div>
      </div>
    `;
  }).join('');
}

/**
 * 开始练习
 */
window.startPractice = async function(practiceType) {
  if (!window.currentCourse) {
    showToast('请先选择课程', 'warning');
    openCourseSelectDialog();
    return;
  }
  
  // 保存当前练习类型
  sessionStorage.setItem('current_practice_type', practiceType);
  sessionStorage.setItem('current_book_key', window.currentCourse.bookKey);
  sessionStorage.setItem('current_unit_key', window.currentCourse.unitKey);
  
  // 初始化练习引擎
  if (window.PracticeEngine) {
    const engine = new window.PracticeEngine();
    await engine.init(practiceType);
    window.currentPracticeEngine = engine;
  } else {
    showToast('练习引擎加载失败', 'error');
  }
};

/**
 * 退出练习
 */
window.exitPractice = function() {
  const container = document.getElementById('practiceContainer');
  container.style.display = 'none';
  container.innerHTML = '';
  window.currentPracticeEngine = null;
};

/**
 * 初始化页面
 */
async function initPracticePage() {
  // 恢复 Tab 状态
  const activeTab = localStorage.getItem('practice_active_tab') || 'overview';
  switchTab(activeTab);
  
  // 加载当前课程
  const courseData = localStorage.getItem('current_course');
  if (courseData) {
    window.currentCourse = JSON.parse(courseData);
    updateCurrentCourseUI();
    renderUnitGrid(); // 预渲染单元网格
  } else {
    // 尝试从 URL 参数加载
    const params = new URLSearchParams(window.location.search);
    const bookKey = params.get('book');
    const unitKey = params.get('unit');
    
    if (bookKey && unitKey) {
      await CourseManager.ensureInit();
      const books = CourseManager.getAllBooks();
      const book = books.find(b => b.key === bookKey);
      const units = CourseManager.getUnitsByBook(bookKey);
      const unit = units.find(u => u.key === unitKey);
      
      if (book && unit) {
        window.currentCourse = {
          bookKey,
          unitKey,
          title: `${book.title} · ${unit.title}`
        };
        localStorage.setItem('current_course', JSON.stringify(window.currentCourse));
        updateCurrentCourseUI();
        renderUnitGrid();
      }
    }
  }
  
  // 加载统计数据
  loadStatistics();
}

/**
 * 加载统计数据
 */
function loadStatistics() {
  const userData = JSON.parse(localStorage.getItem('nce_user_data') || '{}');
  const reviewData = JSON.parse(localStorage.getItem('nce_unit_review') || '{}');
  
  // 计算累计学习时间（模拟）
  const totalSessions = Object.keys(reviewData).length;
  const estimatedHours = Math.round(totalSessions * 0.5); // 假设每次 30 分钟
  document.getElementById('totalLearningTime').textContent = estimatedHours + 'h';
  
  // 连续学习天数（简单实现）
  const streakDays = userData.streakDays || 0;
  document.getElementById('streakDays').textContent = streakDays + '天';
  
  // 已掌握课程数（进度 100% 的单元）
  let masteredCount = 0;
  Object.values(reviewData).forEach(record => {
    if (record.accuracyHistory && record.accuracyHistory.length > 0) {
      const avgAccuracy = record.accuracyHistory.reduce((a, b) => a + b, 0) / record.accuracyHistory.length;
      if (avgAccuracy >= 0.9) {
        masteredCount++;
      }
    }
  });
  document.getElementById('masteredCourses').textContent = masteredCount + '课';
  
  // 题型统计
  const typeStats = {
    listening: { correct: 0, total: 0 },
    speaking: { correct: 0, total: 0 },
    fillBlank: { correct: 0, total: 0 },
    ordering: { correct: 0, total: 0 },
    translation: { correct: 0, total: 0 }
  };
  
  Object.values(reviewData).forEach(record => {
    if (record.questionTypeStats) {
      Object.entries(record.questionTypeStats).forEach(([type, stat]) => {
        if (typeStats[type]) {
          typeStats[type].correct += stat.correct || 0;
          typeStats[type].total += stat.total || 0;
        }
      });
    }
  });
  
  // 更新题型统计 UI
  Object.entries(typeStats).forEach(([type, stat]) => {
    const accuracy = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
    const accuracyEl = document.getElementById(`${type}Accuracy`);
    const countEl = document.getElementById(`${type}Count`);
    
    if (accuracyEl) accuracyEl.textContent = accuracy + '%';
    if (countEl) countEl.textContent = `${stat.correct}/${stat.total}`;
    
    // 更新练习卡片上的剩余数量
    const remainingEl = document.getElementById(`${type}Remaining`);
    if (remainingEl) {
      const remaining = Math.max(0, stat.total - stat.correct); // 待强化数量
      remainingEl.textContent = `待强化 ${remaining}句`;
    }
  });
}

/**
 * Toast 提示（简化版）
 */
function showToast(message, type = 'info') {
  const colors = {
    success: '#34c759',
    warning: '#ff9500',
    error: '#ff3b30',
    info: '#007aff'
  };
  
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: ${colors[type]};
    color: #fff;
    padding: 12px 24px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    z-index: 2000;
    animation: slideDown 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPracticePage);
} else {
  initPracticePage();
}
