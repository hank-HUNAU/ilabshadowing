/* 用户中心管理 */
class UserManager {
  constructor() {
    this.userProfile = null;
    this.learningStats = null;
    this.progress = {};
    this.studyStartTime = null;
    this.init();
  }
  
  init() {
    this.loadUserProfile();
    this.loadLearningStats();
    this.loadProgress();
    this.bindEvents();
    this.updateDisplay();
  }
  
  // ========== 用户信息 ==========
  loadUserProfile() {
    const data = localStorage.getItem(LS.USER_PROFILE);
    if (data) {
      this.userProfile = JSON.parse(data);
    }
  }
  
  saveUserProfile(enName, cnName, age) {
    this.userProfile = {
      enName: enName.trim(),
      cnName: cnName.trim(),
      age: parseInt(age),
      createdAt: this.userProfile?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LS.USER_PROFILE, JSON.stringify(this.userProfile));
    this.updateDisplay();
  }
  
  // ========== 学习统计 ==========
  loadLearningStats() {
    const data = localStorage.getItem(LS.LEARNING_STATS);
    if (data) {
      this.learningStats = JSON.parse(data);
    } else {
      this.learningStats = {
        totalMinutes: 0,
        streak: 0,
        lastStudyDate: null,
        calendar: {}
      };
    }
  }
  
  saveLearningStats() {
    localStorage.setItem(LS.LEARNING_STATS, JSON.stringify(this.learningStats));
  }
  
  // 开始学习计时
  startStudySession() {
    this.studyStartTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    // 检查连续学习
    if (this.learningStats.lastStudyDate) {
      const lastDate = new Date(this.learningStats.lastStudyDate);
      const todayDate = new Date(today);
      const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        this.learningStats.streak = 0;
      }
    }
  }
  
  // 结束学习计时
  endStudySession() {
    if (!this.studyStartTime) return;
    
    const duration = Math.floor((Date.now() - this.studyStartTime) / (1000 * 60));
    if (duration < 1) return;
    
    const today = new Date().toISOString().split('T')[0];
    
    this.learningStats.totalMinutes += duration;
    this.learningStats.calendar[today] = (this.learningStats.calendar[today] || 0) + duration;
    
    if (this.learningStats.lastStudyDate !== today) {
      this.learningStats.streak++;
      this.learningStats.lastStudyDate = today;
    }
    
    this.saveLearningStats();
    this.studyStartTime = null;
  }
  
  // ========== 课程进度 ==========
  loadProgress() {
    const data = localStorage.getItem(LS.PROGRESS);
    if (data) {
      this.progress = JSON.parse(data);
    }
  }
  
  saveProgress() {
    localStorage.setItem(LS.PROGRESS, JSON.stringify(this.progress));
  }
  
  // 更新课程进度（单句重复达标）
  updateProgress(key, unitIdx, targetRepeat) {
    if (!this.progress[key]) {
      this.progress[key] = {
        completedUnits: [],
        unitProgress: {}
      };
    }
    
    const unitKey = `${key}_unit_${unitIdx}`;
    const current = this.progress[key].unitProgress[unitKey] || 0;
    const newProgress = Math.min(100, current + (100 / targetRepeat));
    
    this.progress[key].unitProgress[unitKey] = newProgress;
    
    if (newProgress >= 100 && !this.progress[key].completedUnits.includes(unitIdx)) {
      this.progress[key].completedUnits.push(unitIdx);
    }
    
    this.saveProgress();
  }
  
  // ========== 显示更新 ==========
  updateDisplay() {
    const displayNameEl = document.getElementById('userDisplayName');
    if (displayNameEl) {
      if (this.userProfile) {
        displayNameEl.textContent = this.userProfile.enName || this.userProfile.cnName || '用户';
        displayNameEl.style.display = '';
      } else {
        displayNameEl.textContent = '';
        displayNameEl.style.display = 'none';
      }
    }
    
    this.updateFavCount();
  }
  
  updateFavCount() {
    const favCount = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]').length;
    const badge = document.getElementById('favCountBadge');
    if (badge) {
      badge.textContent = favCount;
      badge.style.display = favCount > 0 ? '' : 'none';
    }
  }
  
  // ========== 数据导出 ==========
  exportToExcel() {
    const rows = [
      ['Hankilab 学习中心 - 学习记录导出'],
      ['导出时间', new Date().toLocaleString('zh-CN')],
      [],
      ['用户信息'],
      ['英文名', this.userProfile?.enName || '未填写'],
      ['中文名', this.userProfile?.cnName || '未填写'],
      ['年龄', this.userProfile?.age || '未填写'],
      ['注册日期', this.userProfile?.createdAt || '未知'],
      [],
      ['学习统计'],
      ['累计学习（分钟）', this.learningStats.totalMinutes],
      ['累计学习（小时）', (this.learningStats.totalMinutes / 60).toFixed(1)],
      ['连续学习天数', this.learningStats.streak],
      [],
      ['收藏句子']
    ];
    
    const favorites = JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]');
    favorites.forEach(fav => {
      rows.push([
        fav.bookTitle + ' - ' + fav.lessonTitle,
        fav.sentence,
        fav.translation,
        new Date(fav.createdAt).toLocaleString('zh-CN')
      ]);
    });
    
    const csv = rows.map(row => row.map(cell => `"${cell || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `学习记录_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  exportToPDF() {
    alert('PDF 导出功能开发中，目前请使用 Excel (CSV) 导出');
  }
  
  // ========== 清除数据 ==========
  clearAllData() {
    Object.values(LS).forEach(key => {
      if (typeof key === 'string') {
        localStorage.removeItem(key);
      }
    });
    this.userProfile = null;
    this.learningStats = null;
    this.progress = {};
    location.reload();
  }
  
  // ========== 事件绑定 ==========
  bindEvents() {
    document.getElementById('userCenterBtn')?.addEventListener('click', () => {
      this.showUserCenter();
    });
    
    document.getElementById('closeUserCenter')?.addEventListener('click', () => {
      document.getElementById('userCenterDialog').close();
    });
    
    document.getElementById('saveUserInfo')?.addEventListener('click', () => {
      this.saveUserInfoFromForm();
    });
    
    document.getElementById('exportData')?.addEventListener('click', () => {
      this.showConfirm(
        '导出数据',
        '请选择导出格式：',
        [
          { label: 'Excel (CSV)', action: () => this.exportToExcel() },
          { label: 'PDF（开发中）', action: () => this.exportToPDF() }
        ]
      );
    });
    
    document.getElementById('clearData')?.addEventListener('click', () => {
      this.showConfirm(
        '清除所有数据',
        '确定要清除所有学习记录、用户信息和收藏吗？此操作不可恢复！',
        [
          { label: '确认清除', action: () => this.clearAllData(), danger: true },
          { label: '取消', action: () => {} }
        ]
      );
    });
  }
  
  showConfirm(title, message, buttons) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    
    const dialog = document.getElementById('confirmDialog');
    const cancelBtn = document.getElementById('confirmCancel');
    const okBtn = document.getElementById('confirmOk');
    
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    okBtn.replaceWith(okBtn.cloneNode(true));
    
    buttons.forEach((btn, index) => {
      const target = index === 0 ? okBtn : cancelBtn;
      target.textContent = btn.label;
      target.style.background = btn.danger ? '#ff3b30' : '';
      target.style.color = btn.danger ? '#fff' : '';
      target.onclick = () => {
        dialog.close();
        btn.action();
      };
    });
    
    dialog.showModal();
  }
  
  saveUserInfoFromForm() {
    const enName = document.getElementById('userEnName').value.trim();
    const cnName = document.getElementById('userCnName').value.trim();
    const age = document.getElementById('userAge').value.trim();
    
    if (!enName || enName.length < 2) {
      alert('请输入有效的英文名（至少 2 个字符）');
      document.getElementById('userEnName').focus();
      return;
    }
    
    if (!cnName || cnName.length < 2) {
      alert('请输入有效的中文名（至少 2 个字符）');
      document.getElementById('userCnName').focus();
      return;
    }
    
    if (!age || parseInt(age) < 5 || parseInt(age) > 99) {
      alert('请输入有效的年龄（5-99 岁）');
      document.getElementById('userAge').focus();
      return;
    }
    
    this.saveUserProfile(enName, cnName, age);
    alert('用户信息保存成功！');
  }
  
  showUserCenter() {
    const dialog = document.getElementById('userCenterDialog');
    
    if (this.userProfile) {
      document.getElementById('userEnName').value = this.userProfile.enName || '';
      document.getElementById('userCnName').value = this.userProfile.cnName || '';
      document.getElementById('userAge').value = this.userProfile.age || '';
    }
    
    this.updateStatsDisplay();
    this.updateCourseSelect();
    this.updateProgressDisplay();
    
    dialog.showModal();
  }
  
  // ========== 课程选择 ==========
  getSelectedCourses() {
    const data = localStorage.getItem('nce_selected_courses');
    if (data) {
      return JSON.parse(data);
    }
    // 默认全选
    return null;
  }
  
  saveSelectedCourses(selected) {
    localStorage.setItem('nce_selected_courses', JSON.stringify(selected));
  }
  
  updateCourseSelect() {
    const container = document.getElementById('courseSelectList');
    if (!container) return;
    
    container.innerHTML = '';
    
    const selected = this.getSelectedCourses();
    
    fetch('data.json')
      .then(r => r.json())
      .then(data => {
        const books = data.books || [];
        books.forEach(book => {
          const isSelected = selected === null || selected.includes(book.key);
          
          const item = document.createElement('div');
          item.className = `course-select-item${isSelected ? ' selected' : ''}`;
          item.dataset.key = book.key;
          item.innerHTML = `
            <div class="course-select-checkbox"></div>
            <span class="course-select-label">${book.name || book.title}</span>
          `;
          
          item.addEventListener('click', () => {
            this.toggleCourseSelect(book.key);
          });
          
          container.appendChild(item);
        });
      });
  }
  
  toggleCourseSelect(key) {
    let selected = this.getSelectedCourses();
    
    if (selected === null) {
      fetch('data.json')
        .then(r => r.json())
        .then(data => {
          const books = data.books || [];
          selected = books.map(b => b.key).filter(k => k !== key);
          this.saveSelectedCourses(selected);
          this.updateCourseSelect();
        });
    } else {
      const idx = selected.indexOf(key);
      if (idx >= 0) {
        selected.splice(idx, 1);
        if (selected.length === 0) {
          selected = null;
        }
      } else {
        selected.push(key);
      }
      this.saveSelectedCourses(selected);
      this.updateCourseSelect();
    }
  }
  
  updateStatsDisplay() {
    document.getElementById('statTotalTime').textContent = 
      `${(this.learningStats.totalMinutes / 60).toFixed(1)}h`;
    document.getElementById('statStreak').textContent = 
      `${this.learningStats.streak}天`;
    document.getElementById('statFavorites').textContent = 
      `${JSON.parse(localStorage.getItem(LS.FAVORITES) || '[]').length}句`;
    
    const totalProgress = this.calculateTotalProgress();
    document.getElementById('statProgress').textContent = `${totalProgress}%`;
  }
  
  calculateTotalProgress() {
    let total = 0;
    let count = 0;
    Object.keys(this.progress).forEach(key => {
      const bookProgress = this.progress[key];
      Object.values(bookProgress.unitProgress || {}).forEach(p => {
        total += p;
        count++;
      });
    });
    return count > 0 ? Math.round(total / count) : 0;
  }
  
  updateProgressDisplay() {
    const container = document.getElementById('courseProgressList');
    container.innerHTML = '';
    
    fetch('data.json')
      .then(r => r.json())
      .then(books => {
        let hasContent = false;
        books.forEach(book => {
          const key = book.key;
          const progress = this.progress[key];
          if (!progress) return;
          
          hasContent = true;
          const percent = this.calculateBookProgress(key, book);
          
          const item = document.createElement('div');
          item.className = 'progress-item';
          item.innerHTML = `
            <div class="progress-info">
              <div class="progress-name">${book.title}</div>
              <div class="progress-bar-container">
                <div class="progress-bar-fill" style="width:${percent}%"></div>
              </div>
            </div>
            <div class="progress-percent">${percent}%</div>
          `;
          container.appendChild(item);
        });
        
        if (!hasContent) {
          container.innerHTML = '<p style="color:var(--text-tertiary);text-align:center;padding:20px">暂无学习记录</p>';
        }
      });
  }
  
  calculateBookProgress(key, book) {
    const progress = this.progress[key];
    if (!progress || !progress.unitProgress) return 0;
    
    const total = book.units?.length || 0;
    const completed = progress.completedUnits?.length || 0;
    
    if (total === 0) return 0;
    
    return Math.round((completed / total) * 100);
  }
}

/* 全局实例 */
let userManager = null;
