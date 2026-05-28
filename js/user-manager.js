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
  
  saveUserProfile(enName, cnName, ageRange, avatar = null) {
    this.userProfile = {
      enName: enName.trim(),
      cnName: cnName.trim(),
      ageRange: ageRange,
      avatar: avatar || this.userProfile?.avatar || '👤',
      createdAt: this.userProfile?.createdAt || new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(LS.USER_PROFILE, JSON.stringify(this.userProfile));
    this.updateDisplay();
  }
  
  // 保存头像
  saveAvatar(emoji) {
    if (!this.userProfile) {
      this.userProfile = { avatar: emoji, createdAt: new Date().toISOString().split('T')[0] };
    } else {
      this.userProfile.avatar = emoji;
      this.userProfile.updatedAt = new Date().toISOString();
    }
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
  exportData() {
    // 导出完整备份（JSON 格式）
    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      data: {}
    };
    
    // 导出所有 localStorage 数据
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('nce_')) {
        try {
          const value = localStorage.getItem(key);
          JSON.parse(value); // 验证是否为 JSON
          backup.data[key] = value;
        } catch (e) {
          backup.data[key] = localStorage.getItem(key);
        }
      }
    });
    
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `学习备份_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('数据已导出到备份文件');
  }
  
  // 导入数据
  importData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        
        if (!backup.version || !backup.data) {
          throw new Error('无效的备份文件格式');
        }
        
        // 导入数据
        Object.keys(backup.data).forEach(key => {
          localStorage.setItem(key, backup.data[key]);
        });
        
        toast.success('数据导入成功，页面将刷新');
        setTimeout(() => {
          location.reload();
        }, 1500);
      } catch (err) {
        console.error('Import error:', err);
        toast.error(`导入失败：${err.message}`);
      }
    };
    reader.onerror = () => {
      toast.error('文件读取失败');
    };
    reader.readAsText(file);
  }
  
  // 触发文件选择
  triggerImport() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.importData(file);
      }
    };
    input.click();
  }
  
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
    toast.warning('PDF 导出功能开发中，目前请使用 Excel (CSV) 导出');
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
    
    document.getElementById('avatarSelector')?.addEventListener('click', () => {
      document.getElementById('avatarPickerDialog').showModal();
    });
    
    document.getElementById('closeAvatarPicker')?.addEventListener('click', () => {
      document.getElementById('avatarPickerDialog').close();
    });
    
    document.getElementById('exportData')?.addEventListener('click', () => {
      this.exportData();
    });
    
    document.getElementById('importData')?.addEventListener('click', () => {
      this.triggerImport();
    });
    
    document.getElementById('privacyPolicy')?.addEventListener('click', () => {
      document.getElementById('privacyDialog').showModal();
    });
    
    document.getElementById('closePrivacy')?.addEventListener('click', () => {
      document.getElementById('privacyDialog').close();
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
  
  // ========== 显示更新 ==========
  updateDisplay() {
    const displayNameEl = document.getElementById('userDisplayName');
    if (displayNameEl) {
      if (this.userProfile) {
        const avatar = this.userProfile.avatar || '👤';
        const name = this.userProfile.enName || this.userProfile.cnName || '用户';
        displayNameEl.innerHTML = `<span style="margin-right:4px">${avatar}</span>${name}`;
        displayNameEl.style.display = '';
      } else {
        displayNameEl.textContent = '';
        displayNameEl.style.display = 'none';
      }
    }
    
    this.updateFavCount();
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
    const ageRange = document.getElementById('userAgeRange').value;
    const avatar = this.userProfile?.avatar || '👤';
    
    if (!enName || enName.length < 2) {
      toast.error('请输入有效的昵称（至少 2 个字符）');
      document.getElementById('userEnName').focus();
      return;
    }
    
    this.saveUserProfile(enName, cnName, ageRange, avatar);
    toast.success('用户信息保存成功！');
  }
  
  // 初始化头像选择器
  initAvatarPicker() {
    const emojis = [
      '👤', '👦', '👧', '👨', '👩', '👴', '👵',
      '🧑', '🧒', '👶', '🦊', '🐼', '🐨', '🐯',
      '🦁', '🐸', '🐵', '🐔', '🦄', '🐝',
      '🤖', '👽', '🎃', '🌟', '🌈', '🔮'
    ];
    
    const grid = document.getElementById('emojiGrid');
    if (!grid) return;
    
    grid.innerHTML = emojis.map(emoji => `
      <div class="emoji-item" data-emoji="${emoji}">${emoji}</div>
    `).join('');
    
    // 点击选择
    grid.addEventListener('click', (e) => {
      const item = e.target.closest('.emoji-item');
      if (!item) return;
      
      const emoji = item.dataset.emoji;
      this.saveAvatar(emoji);
      document.getElementById('avatarPreview').textContent = emoji;
      document.getElementById('avatarPickerDialog').close();
      toast.success(`头像已设置为 ${emoji}`);
    });
    
    // 当前选中状态
    const currentAvatar = this.userProfile?.avatar || '👤';
    grid.querySelectorAll('.emoji-item').forEach(item => {
      if (item.dataset.emoji === currentAvatar) {
        item.classList.add('selected');
      }
    });
  }
  
  showUserCenter() {
    const dialog = document.getElementById('userCenterDialog');
    
    if (this.userProfile) {
      document.getElementById('userEnName').value = this.userProfile.enName || '';
      document.getElementById('userCnName').value = this.userProfile.cnName || '';
      document.getElementById('userAgeRange').value = this.userProfile.ageRange || '';
      document.getElementById('avatarPreview').textContent = this.userProfile.avatar || '👤';
    }
    
    this.updateStatsDisplay();
    this.updateCourseSelect();
    this.updateProgressDisplay();
    this.updateLearningCalendar();
    this.updateAchievements();
    this.initAvatarPicker();
    
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
