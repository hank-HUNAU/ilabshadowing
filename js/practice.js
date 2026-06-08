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
window.learningStartTime = null;
window.timerInterval = null;
window.learningTips = [
  "完成今日学习目标可获得双倍积分奖励",
  "建议每天学习30分钟，效果最佳",
  "连续学习7天可获得特殊徽章",
  "词汇学习建议使用间隔重复法",
  "影子跟读能有效提升发音和听力",
  "定期测试可以检验学习效果"
];
window.currentTipIndex = 0;

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

  // 处理篇章学习Tab的特殊逻辑
  if (tabName === 'listening') {
    handleListeningTab();
  }

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

  // 切换到篇章预听 Tab 时加载预听数据
  if (tabName === 'prelistening' && window.prelisteningManager) {
    window.prelisteningManager.init().catch(error => {
      console.error('[PracticePage] 初始化PrelisteningManager失败:', error);
    });
  }

  // 切换到影子跟读 Tab 时加载跟读数据
  if (tabName === 'shadowing' && window.shadowingManager) {
    window.shadowingManager.init().catch(error => {
      console.error('[PracticePage] 初始化ShadowingManager失败:', error);
    });
  }

  // 切换到篇章测试 Tab 时加载测试数据
  if (tabName === 'practice' && window.practiceTestManager) {
    window.practiceTestManager.init().catch(error => {
      console.error('[PracticePage] 初始化PracticeTestManager失败:', error);
    });
  }

  // 保存当前 Tab 状态
  localStorage.setItem('practice_active_tab', tabName);
};

/**
 * 处理篇章学习Tab切换
 */
function handleListeningTab() {
  if (!window.currentCourse) return;
  
  const courseId = window.currentCourse.id;
  const progressKey = `learning_progress_${courseId}`;
  const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
  
  const prelisteningData = progressData.prelistening || {};
  const shadowingData = progressData.shadowing || {};
  
  // 根据进度决定显示预听还是跟读
  let targetTab = 'prelistening';
  
  if (prelisteningData.completed || prelisteningData.progress >= 80) {
    // 预听已完成，显示跟读
    targetTab = 'shadowing';
  }
  
  // 更新实际的Tab面板显示
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
    if (panel.id === `tab-${targetTab}`) {
      panel.classList.add('active');
    }
  });
  
  // 初始化对应的管理器
  if (targetTab === 'prelistening' && window.prelisteningManager) {
    window.prelisteningManager.init().catch(error => {
      console.error('[PracticePage] 初始化PrelisteningManager失败:', error);
    });
  } else if (targetTab === 'shadowing' && window.shadowingManager) {
    window.shadowingManager.init().catch(error => {
      console.error('[PracticePage] 初始化ShadowingManager失败:', error);
    });
  }
}

  // 切换到影子跟读 Tab 时加载跟读数据
  if (tabName === 'shadowing' && window.shadowingManager) {
    // 确保ShadowingManager已初始化
    window.shadowingManager.init().catch(error => {
      console.error('[PracticePage] 初始化ShadowingManager失败:', error);
    });
  }

  // 切换到篇章测试 Tab 时加载测试数据
  if (tabName === 'practice' && window.practiceTestManager) {
    // 确保PracticeTestManager已初始化
    window.practiceTestManager.init().catch(error => {
      console.error('[PracticePage] 初始化PracticeTestManager失败:', error);
    });
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

  // 初始化篇章预听管理器
  if (window.PrelisteningManager) {
    window.prelisteningManager = new PrelisteningManager();
  }

  // 初始化影子跟读管理器
  if (window.ShadowingManager) {
    window.shadowingManager = new ShadowingManager();
  }

  // 初始化篇章测试管理器
  if (window.PracticeTestManager) {
    window.practiceTestManager = new PracticeTestManager();
  }

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

  // 初始化进度显示
  initProgressDisplay();
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

/**
 * 初始化学习计时器
 */
window.startLearningTimer = function() {
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
  }
  
  window.learningStartTime = Date.now();
  
  window.timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - window.learningStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    const timerValue = document.getElementById('timerValue');
    if (timerValue) {
      timerValue.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // 每分钟记录一次学习时间
    if (elapsed % 60 === 0 && elapsed > 0) {
      recordLearningActivity('time', 1);
    }
  }, 1000);
};

/**
 * 停止学习计时器
 */
window.stopLearningTimer = function() {
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
    window.timerInterval = null;
  }
};

/**
 * 更新推荐步骤
 */
window.updateRecommendedStep = function() {
  if (!window.currentCourse) return;

  const courseId = window.currentCourse.id;
  const progressKey = `learning_progress_${courseId}`;
  const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');

  const steps = [
    { id: 'vocabulary', elementId: 'vocabularyStepStatus' },
    { id: 'prelistening', elementId: 'prelisteningStepStatus' },
    { id: 'shadowing', elementId: 'shadowingStepStatus' },
    { id: 'practice', elementId: 'practiceStepStatus' }
  ];

  let recommendedStep = null;
  
  // 找到第一个未完成的步骤作为推荐步骤
  for (const step of steps) {
    const stepData = progressData[step.id] || {};
    if (!stepData.completed) {
      recommendedStep = step.id;
      break;
    }
  }

  // 更新UI显示推荐步骤
  document.querySelectorAll('.flow-step').forEach(step => {
    step.classList.remove('recommended');
    if (step.dataset.step === recommendedStep) {
      step.classList.add('recommended');
    }
  });
};

/**
 * 更新每日目标徽章
 */
window.updateGoalBadges = function() {
  const today = new Date().toISOString().split('T')[0];
  const goalsKey = `daily_goals_${today}`;
  const goalsData = JSON.parse(localStorage.getItem(goalsKey) || '{}');

  // 词汇学习目标
  const vocabularyGoal = 20;
  const vocabularyLearned = goalsData.vocabularyLearned || 0;
  const vocabularyBadge = document.getElementById('vocabularyGoalBadge');
  if (vocabularyBadge) {
    if (vocabularyLearned >= vocabularyGoal) {
      vocabularyBadge.textContent = '已完成';
      vocabularyBadge.className = 'goal-badge completed';
    } else if (vocabularyLearned > 0) {
      vocabularyBadge.textContent = '进行中';
      vocabularyBadge.className = 'goal-badge in-progress';
    } else {
      vocabularyBadge.textContent = '待完成';
      vocabularyBadge.className = 'goal-badge';
    }
  }

  // 学习时长目标
  const timeGoal = 30;
  const timeSpent = goalsData.timeSpent || 0;
  const timeBadge = document.getElementById('timeGoalBadge');
  if (timeBadge) {
    if (timeSpent >= timeGoal) {
      timeBadge.textContent = '已完成';
      timeBadge.className = 'goal-badge completed';
    } else if (timeSpent > 0) {
      timeBadge.textContent = '进行中';
      timeBadge.className = 'goal-badge in-progress';
    } else {
      timeBadge.textContent = '待完成';
      timeBadge.className = 'goal-badge';
    }
  }

  // 测试完成目标
  const testGoal = 1;
  const testsCompleted = goalsData.testsCompleted || 0;
  const testBadge = document.getElementById('testGoalBadge');
  if (testBadge) {
    if (testsCompleted >= testGoal) {
      testBadge.textContent = '已完成';
      testBadge.className = 'goal-badge completed';
    } else if (testsCompleted > 0) {
      testBadge.textContent = '进行中';
      testBadge.className = 'goal-badge in-progress';
    } else {
      testBadge.textContent = '待完成';
      testBadge.className = 'goal-badge';
    }
  }

  // 更新目标完成概览
  const completedGoals = [
    vocabularyLearned >= vocabularyGoal,
    timeSpent >= timeGoal,
    testsCompleted >= testGoal
  ].filter(Boolean).length;

  const goalsCompleted = document.getElementById('goalsCompleted');
  if (goalsCompleted) {
    goalsCompleted.textContent = `${completedGoals}/3`;
  }

  const goalsOverviewProgress = document.getElementById('goalsOverviewProgress');
  if (goalsOverviewProgress) {
    const percentage = Math.round((completedGoals / 3) * 100);
    goalsOverviewProgress.textContent = `${percentage}%`;
  }

  // 更新快捷操作徽章
  const vocabularyActionBadge = document.getElementById('vocabularyActionBadge');
  if (vocabularyActionBadge) {
    if (vocabularyLearned === 0) {
      vocabularyActionBadge.style.display = 'block';
      vocabularyActionBadge.textContent = 'NEW';
    } else if (vocabularyLearned < vocabularyGoal) {
      vocabularyActionBadge.style.display = 'block';
      vocabularyActionBadge.textContent = 'CONTINUE';
    } else {
      vocabularyActionBadge.style.display = 'none';
    }
  }

  const testActionBadge = document.getElementById('testActionBadge');
  if (testActionBadge) {
    const allStepsCompleted = steps.every(step => {
      const stepData = progressData[step.id] || {};
      return stepData.completed;
    });
    
    if (allStepsCompleted && testsCompleted === 0) {
      testActionBadge.style.display = 'block';
      testActionBadge.textContent = 'READY';
      testActionBadge.className = 'action-badge ready';
    } else {
      testActionBadge.style.display = 'none';
    }
  }
};

/**
 * 更新学习提示
 */
window.updateLearningTip = function() {
  const learningTip = document.getElementById('learningTip');
  if (learningTip) {
    learningTip.textContent = window.learningTips[window.currentTipIndex];
  }
};

/**
 * 轮播学习提示
 */
window.rotateLearningTips = function() {
  window.currentTipIndex = (window.currentTipIndex + 1) % window.learningTips.length;
  updateLearningTip();
};

/**
 * 继续学习（快捷操作）
 */
window.continueLearning = function(type) {
  // 根据类型切换到对应的Tab
  let tabName = type;
  
  // 对于篇章学习，根据进度选择预听或跟读
  if (type === 'prelistening' || type === 'shadowing') {
    const courseId = window.currentCourse ? window.currentCourse.id : 'default';
    const progressKey = `learning_progress_${courseId}`;
    const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');
    
    const prelisteningData = progressData.prelistening || {};
    const shadowingData = progressData.shadowing || {};
    
    // 如果预听未完成或进度较低，先去预听
    if (!prelisteningData.completed || prelisteningData.progress < 50) {
      tabName = 'prelistening';
    } else {
      tabName = 'shadowing';
    }
  }
  
  switchTab(tabName);
};
/**
 * 更新学习流程进度
 */
window.updateLearningFlowProgress = function() {
  if (!window.currentCourse) return;

  const courseId = window.currentCourse.id;
  const progressKey = `learning_progress_${courseId}`;
  const progressData = JSON.parse(localStorage.getItem(progressKey) || '{}');

  const steps = [
    { id: 'vocabulary', label: '词汇学习' },
    { id: 'prelistening', label: '篇章预听' },
    { id: 'shadowing', label: '影子跟读' },
    { id: 'practice', label: '篇章测试' }
  ];

  steps.forEach(step => {
    const stepStatusEl = document.getElementById(`${step.id}StepStatus`);
    const stepProgressEl = document.getElementById(`${step.id}StepProgress`);
    
    if (stepStatusEl && stepProgressEl) {
      const stepData = progressData[step.id] || {};
      const completed = stepData.completed || false;
      const progress = stepData.progress || 0;

      // 更新状态指示器
      stepStatusEl.className = 'step-status';
      if (completed) {
        stepStatusEl.classList.add('completed');
      } else if (progress > 0) {
        stepStatusEl.classList.add('in-progress');
      } else {
        stepStatusEl.classList.add('pending');
      }

      // 更新进度文字
      stepProgressEl.textContent = `${Math.round(progress)}%`;
    }
  });

  // 更新推荐步骤
  updateRecommendedStep();
};

/**
 * 更新环形进度图
 */
window.updateCircularProgress = function(percentage) {
  const progressRing = document.getElementById('overallProgressRing');
  const progressValue = document.getElementById('overallProgressValue');
  
  if (progressRing && progressValue) {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    
    progressRing.style.strokeDasharray = circumference;
    progressRing.style.strokeDashoffset = offset;
    progressValue.textContent = `${Math.round(percentage)}%`;
  }
};

/**
 * 更新每日学习目标
 */
/**
 * 更新每日学习目标
 */
window.updateDailyGoals = function() {
  const today = new Date().toISOString().split('T')[0];
  const goalsKey = `daily_goals_${today}`;
  const goalsData = JSON.parse(localStorage.getItem(goalsKey) || '{}');

  // 词汇学习目标
  const vocabularyGoal = 20;
  const vocabularyLearned = goalsData.vocabularyLearned || 0;
  const vocabularyProgress = Math.min((vocabularyLearned / vocabularyGoal) * 100, 100);
  
  const vocabularyProgressFill = document.getElementById('vocabularyGoalProgress');
  const vocabularyGoalText = document.getElementById('vocabularyGoalText');
  
  if (vocabularyProgressFill && vocabularyGoalText) {
    vocabularyProgressFill.style.width = `${vocabularyProgress}%`;
    vocabularyGoalText.textContent = `${vocabularyLearned}/${vocabularyGoal} 词`;
    
    // 添加完成样式
    if (vocabularyLearned >= vocabularyGoal) {
      vocabularyProgressFill.classList.add('completed');
    }
  }

  // 学习时长目标
  const timeGoal = 30; // 分钟
  const timeSpent = goalsData.timeSpent || 0;
  const timeProgress = Math.min((timeSpent / timeGoal) * 100, 100);
  
  const timeProgressFill = document.getElementById('timeGoalProgress');
  const timeGoalText = document.getElementById('timeGoalText');
  
  if (timeProgressFill && timeGoalText) {
    timeProgressFill.style.width = `${timeProgress}%`;
    timeGoalText.textContent = `${timeSpent}/${timeGoal} 分钟`;
    
    if (timeSpent >= timeGoal) {
      timeProgressFill.classList.add('completed');
    }
  }

  // 测试完成目标
  const testGoal = 1;
  const testsCompleted = goalsData.testsCompleted || 0;
  const testProgress = Math.min((testsCompleted / testGoal) * 100, 100);
  
  const testProgressFill = document.getElementById('testGoalProgress');
  const testGoalText = document.getElementById('testGoalText');
  
  if (testProgressFill && testGoalText) {
    testProgressFill.style.width = `${testProgress}%`;
    testGoalText.textContent = `${testsCompleted}/${testGoal} 测试`;
    
    if (testsCompleted >= testGoal) {
      testProgressFill.classList.add('completed');
    }
  }

  // 更新目标徽章
  updateGoalBadges();
};

/**
 * 更新学习统计
 */
window.updateLearningStats = function() {
  const statsKey = 'learning_stats';
  const statsData = JSON.parse(localStorage.getItem(statsKey) || '{}');

  // 累计学习时间
  const totalTime = statsData.totalTime || 0;
  const totalHours = Math.floor(totalTime / 60);
  const totalMinutes = totalTime % 60;
  const timeText = totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;
  
  const totalTimeEl = document.getElementById('totalLearningTime');
  if (totalTimeEl) {
    totalTimeEl.textContent = timeText;
  }

  // 连续学习天数
  const streakDays = statsData.streakDays || 0;
  const streakDaysEl = document.getElementById('streakDays');
  if (streakDaysEl) {
    streakDaysEl.textContent = `${streakDays} 天`;
  }

  // 已掌握课程
  const masteredCourses = statsData.masteredCourses || 0;
  const masteredCoursesEl = document.getElementById('masteredCourses');
  if (masteredCoursesEl) {
    masteredCoursesEl.textContent = `${masteredCourses} 课`;
  }

  // 词汇量
  const totalWords = statsData.totalWords || 0;
  const totalWordsEl = document.getElementById('totalWords');
  if (totalWordsEl) {
    totalWordsEl.textContent = `${totalWords} 词`;
  }

  // 计算总体进度
  const totalProgress = statsData.totalProgress || 0;
  updateCircularProgress(totalProgress);
};

/**
 * 初始化所有进度显示
 */
window.initProgressDisplay = function() {
  updateLearningFlowProgress();
  updateDailyGoals();
  updateLearningStats();
  updateLearningTip();
  
  // 启动学习计时器
  startLearningTimer();
  
  // 启动学习提示轮播（每30秒）
  setInterval(rotateLearningTips, 30000);
  
  // 更新连续学习天数显示
  updateStreakCount();
};

/**
 * 更新连续学习天数
 */
window.updateStreakCount = function() {
  const statsKey = 'learning_stats';
  const statsData = JSON.parse(localStorage.getItem(statsKey) || '{}');
  
  const streakCount = document.getElementById('streakCount');
  if (streakCount) {
    const streakDays = statsData.streakDays || 0;
    streakCount.textContent = `${streakDays}天`;
  }
};

/**
 * 记录学习活动
 */
window.recordLearningActivity = function(type, amount = 1) {
  const today = new Date().toISOString().split('T')[0];
  const goalsKey = `daily_goals_${today}`;
  const goalsData = JSON.parse(localStorage.getItem(goalsKey) || '{}');

  switch (type) {
    case 'vocabulary':
      goalsData.vocabularyLearned = (goalsData.vocabularyLearned || 0) + amount;
      break;
    case 'time':
      goalsData.timeSpent = (goalsData.timeSpent || 0) + amount;
      break;
    case 'test':
      goalsData.testsCompleted = (goalsData.testsCompleted || 0) + amount;
      break;
  }

  localStorage.setItem(goalsKey, JSON.stringify(goalsData));
  updateDailyGoals();
};

/**
 * 记录总体统计
 */
window.recordOverallStats = function(stats) {
  const statsKey = 'learning_stats';
  const statsData = JSON.parse(localStorage.getItem(statsKey) || {});

  Object.assign(statsData, stats);
  localStorage.setItem(statsKey, JSON.stringify(statsData));
  updateLearningStats();
};
